<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useExamsStore } from '@/stores/exams'
import { useSubjectsStore } from '@/stores/subjects'
import { useBankStore } from '@/stores/bank'
import { apiFetch } from '@/api/http'
import type { BloomLevel, Difficulty, QuestionType } from '@/types/domain'

const { t } = useI18n()
const exams = useExamsStore()
const subjects = useSubjectsStore()
const bank = useBankStore()

const showForm = ref(false)
const generating = ref(false)
const generateError = ref('')
const totalQuestions = ref(10)
const numVersions = ref(1)
const duration = ref(90)
const title = ref('')

// Bloom and difficulty as real-level checkboxes (third review, Felipe):
// uniform distribution over the checked levels, no preset selects.
const BLOOM_LEVELS: BloomLevel[] = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']
const DIFFICULTY_LEVELS: Difficulty[] = ['easy', 'medium', 'hard']
const selectedBloom = ref<BloomLevel[]>([...BLOOM_LEVELS])
const selectedDifficulty = ref<Difficulty[]>([...DIFFICULTY_LEVELS])

function toggleLevel<T>(list: T[], value: T) {
  const i = list.indexOf(value)
  if (i >= 0) list.splice(i, 1)
  else list.push(value)
}
function toggleBloom(value: BloomLevel) {
  toggleLevel(selectedBloom.value, value)
}
function toggleDifficulty(value: Difficulty) {
  toggleLevel(selectedDifficulty.value, value)
}

// Normalize selected levels to a distribution summing ~1.0 (backend
// tolerance 0.98-1.02); empty selection falls back to uniform over all.
function levelsToDist<T extends string>(levels: T[], all: T[]): Record<T, number> {
  const picked = levels.length > 0 ? levels : all
  const share = Math.round((1 / picked.length) * 100) / 100
  const dist = {} as Record<T, number>
  let acc = 0
  for (const k of picked) {
    dist[k] = share
    acc += share
  }
  // Add the rounding remainder to the first key so the sum is exactly 1.0.
  const first = picked[0]
  dist[first] = Math.round((dist[first] + (1 - acc)) * 100) / 100
  return dist
}

const bloomDist = computed<Record<BloomLevel, number>>(() => levelsToDist(selectedBloom.value, BLOOM_LEVELS))
const difficultyDist = computed<Record<Difficulty, number>>(() => levelsToDist(selectedDifficulty.value, DIFFICULTY_LEVELS))

// Question types the professor may include (third review, Felipe).
const QUESTION_TYPES: { value: QuestionType; key: string }[] = [
  { value: 'multiple_choice', key: 'multipleChoice' },
  { value: 'true_false', key: 'trueFalse' },
  { value: 'short_answer', key: 'shortAnswer' },
  { value: 'essay', key: 'essay' },
  { value: 'fill_in_blank', key: 'fillInBlank' },
  { value: 'select_all', key: 'selectAll' },
]
const allowedTypes = ref<QuestionType[]>(QUESTION_TYPES.map((t) => t.value))

// Advanced blueprint: questions per topic with numeric selectors instead of
// abstract weight distributions (third review, Felipe).
const showAdvanced = ref(false)
const topicCounts = ref<Record<string, number>>({})
const topicsError = ref('')
const useRag = ref(true)
const topK = ref(3)
const minScore = ref(0.15)

const bankTopics = computed<string[]>(() => {
  const topics = new Set<string>()
  for (const q of bank.questions) {
    if (q.topic) topics.add(q.topic)
  }
  return [...topics].sort((a, b) => a.localeCompare(b))
})

// Load the bank of the active subject to list its real topics. Resets the
// per-topic counts when the subject changes.
watch(
  () => subjects.activeSubjectId,
  async (id) => {
    topicCounts.value = {}
    topicsError.value = ''
    bank.questions = []
    if (!id) return
    try {
      await bank.fetch(id)
    } catch {
      topicsError.value = t('exams.topicsLoadError')
    }
  },
  { immediate: true },
)

function setTopicCount(topic: string, value: number | null) {
  const n = Math.max(0, Math.min(50, Math.trunc(Number(value) || 0)))
  topicCounts.value[topic] = n
}

function topicSum(): number {
  return Object.values(topicCounts.value).reduce((s, v) => s + (Number(v) || 0), 0)
}

function topicTotalExceeds(): boolean {
  return topicSum() > totalQuestions.value
}

function applyTopicCounts() {
  // Convert per-topic counts into weights summing ~1.0 for the blueprint
  // contract (planner converts them back to counts).
  const sum = topicSum()
  if (sum <= 0) {
    topicsError.value = ''
    return { general: 1.0 }
  }
  const weights: Record<string, number> = {}
  let acc = 0
  const topics = Object.keys(topicCounts.value).filter((k) => (Number(topicCounts.value[k]) || 0) > 0)
  for (const k of topics) {
    const w = Math.round(((Number(topicCounts.value[k]) || 0) / sum) * 100) / 100
    weights[k] = w
    acc += w
  }
  if (topics.length > 0) {
    const first = topics[0]
    weights[first] = Math.round((weights[first] + (1 - acc)) * 100) / 100
  }
  return weights
}

function toggleType(value: QuestionType) {
  const i = allowedTypes.value.indexOf(value)
  if (i >= 0) allowedTypes.value.splice(i, 1)
  else allowedTypes.value.push(value)
}

// Reactive: the exam list follows the subject selected in the header.
watch(
  () => subjects.activeSubjectId,
  (id) => {
    if (id) exams.fetch(id).catch(() => {})
    else exams.exams = []
  },
  { immediate: true },
)

function download(url: string) {
  window.open(url, '_blank')
}

async function generate() {
  if (!subjects.activeSubjectId || generating.value) return
  if (allowedTypes.value.length === 0) {
    generateError.value = t('exams.noTypesError')
    return
  }
  if (topicTotalExceeds()) {
    generateError.value = t('exams.perTopicTotalError', { sum: topicSum(), total: totalQuestions.value })
    return
  }
  generating.value = true
  generateError.value = ''
  try {
    const topicsWeight = showAdvanced.value ? applyTopicCounts() : { general: 1.0 }
    await apiFetch('/exams/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject_id: subjects.activeSubjectId,
        blueprint: {
          subject_id: subjects.activeSubjectId,
          total_questions: totalQuestions.value,
          bloom_distribution: bloomDist.value,
          difficulty_distribution: difficultyDist.value,
          topics_weight: topicsWeight,
          allowed_question_types: allowedTypes.value,
          estimated_duration_minutes: duration.value,
          retrieval: {
            use_rag: useRag.value,
            top_k: topK.value,
            min_score: minScore.value,
          },
          metadata: {
            title: title.value || t('exams.defaultTitle'),
            name: title.value || t('exams.defaultTitle'),
            num_versions: numVersions.value,
          },
        },
        template_id: 'base_exam',
        persist: true,
      }),
    })
    await exams.fetch(subjects.activeSubjectId)
    showForm.value = false
  } catch (e) {
    // Show the actionable detail (apiFetch maps 413/401/403); keep the
    // form open so the professor can retry (ISS-07).
    generateError.value = e instanceof Error ? e.message : t('exams.generateError')
  } finally {
    generating.value = false
  }
}
</script>

<template>
  <div class="exams-view">
    <div class="header">
      <h2>📄 {{ t('exams.title') }}</h2>
      <button
        v-if="subjects.activeSubjectId"
        type="button"
        class="new"
        @click="showForm = !showForm"
      >
        {{ showForm ? t('exams.cancel') : t('exams.generate') }}
      </button>
    </div>

    <div v-if="!subjects.activeSubjectId" class="empty">
      {{ t('exams.needSubject') }}
    </div>
    <template v-else>
      <form v-if="showForm" class="form" @submit.prevent="generate">
        <div class="field">
          <label>{{ t('exams.titleLabel') }}</label>
          <input v-model="title" type="text" :placeholder="t('exams.titlePlaceholder')" />
        </div>
        <div class="field-row">
          <div class="field">
            <label>{{ t('exams.numQuestions') }}</label>
            <input v-model.number="totalQuestions" type="number" min="1" max="50" required />
          </div>
          <div class="field">
            <label>{{ t('exams.versions') }}</label>
            <input v-model.number="numVersions" type="number" min="1" max="10" />
          </div>
          <div class="field">
            <label>{{ t('exams.duration') }}</label>
            <input v-model.number="duration" type="number" min="10" max="300" />
          </div>
        </div>
        <div class="field">
          <label>{{ t('exams.bloom') }}</label>
          <div class="type-checkboxes" role="group" :aria-label="t('exams.bloom')">
            <label v-for="b in BLOOM_LEVELS" :key="b" class="type-checkbox">
              <input
                type="checkbox"
                :checked="selectedBloom.includes(b)"
                @change="toggleBloom(b)"
              />
              {{ t(`exams.bloomLevels.${b}`) }}
            </label>
          </div>
        </div>
        <div class="field">
          <label>{{ t('exams.difficulty') }}</label>
          <div class="type-checkboxes" role="group" :aria-label="t('exams.difficulty')">
            <label v-for="d in DIFFICULTY_LEVELS" :key="d" class="type-checkbox">
              <input
                type="checkbox"
                :checked="selectedDifficulty.includes(d)"
                @change="toggleDifficulty(d)"
              />
              {{ t(`exams.difficultyLevels.${d}`) }}
            </label>
          </div>
        </div>
        <div class="field">
          <label>{{ t('exams.questionTypes') }}</label>
          <div class="type-checkboxes" role="group" :aria-label="t('exams.questionTypes')">
            <label v-for="qt in QUESTION_TYPES" :key="qt.value" class="type-checkbox">
              <input
                type="checkbox"
                :checked="allowedTypes.includes(qt.value)"
                @change="toggleType(qt.value)"
              />
              {{ t(`exams.types.${qt.key}`) }}
            </label>
          </div>
          <p v-if="allowedTypes.length === 0" class="form-error">⚠️ {{ t('exams.noTypesError') }}</p>
        </div>
        <details class="advanced" :open="showAdvanced" @toggle="showAdvanced = ($event.target as HTMLDetailsElement).open">
          <summary>{{ t('exams.advancedTitle') }}</summary>
          <div class="advanced-body">
            <div class="field">
              <label>{{ t('exams.perTopic') }}</label>
              <p v-if="bankTopics.length === 0" class="advanced-hint">
                {{ topicsError || t('exams.topicsEmpty') }}
              </p>
              <div v-else class="dist-grid">
                <label v-for="topic in bankTopics" :key="topic">
                  <span class="topic-name">{{ topic }}</span>
                  <input
                    :value="topicCounts[topic] || 0"
                    type="number"
                    min="0"
                    max="50"
                    step="1"
                    @change="setTopicCount(topic, ($event.target as HTMLInputElement).valueAsNumber)"
                  />
                </label>
              </div>
              <p v-if="topicTotalExceeds()" class="form-error">
                ⚠️ {{ t('exams.perTopicTotalError', { sum: topicSum(), total: totalQuestions }) }}
              </p>
              <p v-else-if="topicSum() > 0" class="advanced-hint">
                {{ t('exams.perTopicSum', { sum: topicSum(), total: totalQuestions }) }}
              </p>
            </div>
            <div class="field-row">
              <div class="field">
                <label class="checkbox-line">
                  <input v-model="useRag" type="checkbox" />
                  {{ t('exams.useRag') }}
                </label>
              </div>
              <div class="field">
                <label>{{ t('exams.topK') }}</label>
                <input v-model.number="topK" type="number" min="1" max="20" :disabled="!useRag" />
              </div>
              <div class="field">
                <label>{{ t('exams.minScore') }}</label>
                <input v-model.number="minScore" type="number" min="0" max="1" step="0.01" :disabled="!useRag" />
              </div>
            </div>
          </div>
        </details>
        <p v-if="generateError" class="form-error">⚠️ {{ generateError }}</p>
        <button type="submit" class="submit" :disabled="generating">
          {{ generating ? t('exams.generating') : t('exams.generateBtn') }}
        </button>
      </form>

      <div v-if="exams.loading" class="loading">{{ t('exams.loading') }}</div>
      <div v-else-if="exams.exams.length === 0" class="empty">
        {{ t('exams.empty') }}
      </div>
      <ul v-else class="exam-list">
        <li v-for="exam in exams.exams" :key="exam.id">
          <div class="exam-info">
            <strong>{{ exam.name || exam.blueprint.metadata?.title || t('exams.defaultTitle') }}</strong>
            <span class="meta">
              {{ exam.items.length }} {{ t('exams.questions') }} ·
              {{ new Date(exam.created_at).toLocaleString() }}
            </span>
          </div>
          <div class="pdf-links">
            <button
              v-if="exam.zip_path"
              type="button"
              class="zip"
              @click="download(`/output/${exam.zip_path.split(/[\\/]/).pop()}`)"
            >
              📦 {{ t('exams.zip') }}
            </button>
            <a
              v-else-if="exam.pdf_paths.length > 0"
              :href="`/output/${exam.pdf_paths[0].split(/[\\/]/).pop()}`"
              target="_blank"
              class="zip"
            >
              ⬇️ {{ t('exams.pdf') }}
            </a>
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.exams-view {
  padding: 1.5rem;
  max-width: 860px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.new {
  border: 1px solid var(--color-primary);
  background: transparent;
  color: var(--color-primary);
  border-radius: 8px;
  padding: 0.4rem 0.9rem;
  cursor: pointer;
}

.form {
  padding: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.field label {
  font-size: 0.8rem;
  color: var(--color-muted);
  font-weight: 500;
}

.field input,
.field select {
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.field-row {
  display: flex;
  gap: 0.75rem;
}

.submit {
  align-self: flex-start;
  padding: 0.5rem 1.2rem;
  border: none;
  border-radius: 8px;
  background: var(--color-primary);
  color: var(--color-primary-contrast);
  cursor: pointer;
}

.submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-error {
  margin: 0;
  color: var(--color-danger);
  font-size: 0.85rem;
}

.type-checkboxes {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
}

.type-checkbox {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.85rem;
  color: var(--color-text, inherit);
  cursor: pointer;
}

.advanced {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
}

.advanced summary {
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-muted);
}

.advanced-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-top: 0.75rem;
}

.dist-grid {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: var(--color-muted);
}

.dist-grid label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.topic-name {
  overflow-wrap: anywhere;
}

.advanced-hint {
  margin: 0;
  font-size: 0.8rem;
  color: var(--color-muted);
}

.dist-grid input {
  width: 5rem;
  padding: 0.3rem 0.4rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
}

.checkbox-line {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  cursor: pointer;
}

.exam-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.exam-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.exam-info .meta {
  display: block;
  font-size: 0.8rem;
  color: var(--color-muted);
}

.pdf-links {
  display: flex;
  gap: 0.4rem;
}

.pdf-links button {
  border: 1px solid var(--color-primary);
  background: transparent;
  color: var(--color-primary);
  border-radius: 8px;
  padding: 0.3rem 0.7rem;
  cursor: pointer;
  font-size: 0.85rem;
}

.pdf-links button.zip {
  background: var(--color-primary);
  color: #fff;
  font-weight: 600;
}

.empty,
.loading {
  color: var(--color-muted);
  padding: 1rem 0;
}
</style>
