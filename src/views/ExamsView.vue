<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useExamsStore } from '@/stores/exams'
import { useSubjectsStore } from '@/stores/subjects'
import { apiFetch } from '@/api/http'
import type { BloomLevel, Difficulty, QuestionType } from '@/types/domain'

const { t } = useI18n()
const exams = useExamsStore()
const subjects = useSubjectsStore()

const showForm = ref(false)
const generating = ref(false)
const generateError = ref('')
const totalQuestions = ref(10)
const numVersions = ref(1)
const duration = ref(90)
const title = ref('')

const BLOOM_PRESETS = [
  { key: 'balanced', dist: { remember: 0.2, understand: 0.2, apply: 0.2, analyze: 0.2, evaluate: 0.1, create: 0.1 } },
  { key: 'basic', dist: { remember: 0.4, understand: 0.3, apply: 0.2, analyze: 0.1, evaluate: 0, create: 0 } },
  { key: 'advanced', dist: { remember: 0.1, understand: 0.1, apply: 0.2, analyze: 0.2, evaluate: 0.2, create: 0.2 } },
]
const bloomPreset = ref(0)

const DIFFICULTY_PRESETS = [
  { key: 'balanced', dist: { easy: 0.34, medium: 0.33, hard: 0.33 } },
  { key: 'easy', dist: { easy: 0.6, medium: 0.3, hard: 0.1 } },
  { key: 'hard', dist: { easy: 0.1, medium: 0.3, hard: 0.6 } },
]
const difficultyPreset = ref(0)

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

// Extended blueprint customization (capacidad extendida): custom
// distributions and retrieval config instead of the presets.
const showAdvanced = ref(false)
const customBloom = ref<Record<BloomLevel, number>>({ ...BLOOM_PRESETS[0].dist })
const customDifficulty = ref<Record<Difficulty, number>>({ ...DIFFICULTY_PRESETS[0].dist })
const useRag = ref(true)
const topK = ref(3)
const minScore = ref(0.15)

function toggleType(value: QuestionType) {
  const i = allowedTypes.value.indexOf(value)
  if (i >= 0) allowedTypes.value.splice(i, 1)
  else allowedTypes.value.push(value)
}

function applyCustomBloom() {
  // Normalize the custom distribution so it sums to ~1.0 (backend tolerance).
  const entries = Object.entries(customBloom.value) as [BloomLevel, number][]
  const total = entries.reduce((s, [, v]) => s + (Number(v) || 0), 0)
  if (total <= 0) return
  for (const [k, v] of entries) customBloom.value[k] = Math.round(((Number(v) || 0) / total) * 100) / 100
}

function applyCustomDifficulty() {
  const entries = Object.entries(customDifficulty.value) as [Difficulty, number][]
  const total = entries.reduce((s, [, v]) => s + (Number(v) || 0), 0)
  if (total <= 0) return
  for (const [k, v] of entries) customDifficulty.value[k] = Math.round(((Number(v) || 0) / total) * 100) / 100
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
  generating.value = true
  generateError.value = ''
  try {
    if (showAdvanced.value) {
      applyCustomBloom()
      applyCustomDifficulty()
    }
    const bloom = showAdvanced.value ? { ...customBloom.value } : BLOOM_PRESETS[bloomPreset.value].dist
    const diff = showAdvanced.value ? { ...customDifficulty.value } : DIFFICULTY_PRESETS[difficultyPreset.value].dist
    await apiFetch('/exams/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject_id: subjects.activeSubjectId,
        blueprint: {
          subject_id: subjects.activeSubjectId,
          total_questions: totalQuestions.value,
          bloom_distribution: bloom,
          difficulty_distribution: diff,
          topics_weight: { general: 1.0 },
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
        <div class="field-row">
          <div class="field">
            <label>{{ t('exams.bloom') }}</label>
            <select v-model.number="bloomPreset">
              <option v-for="(p, i) in BLOOM_PRESETS" :key="i" :value="i">
                {{ t(`exams.presets.${p.key}`) }}
              </option>
            </select>
          </div>
          <div class="field">
            <label>{{ t('exams.difficulty') }}</label>
            <select v-model.number="difficultyPreset">
              <option v-for="(p, i) in DIFFICULTY_PRESETS" :key="i" :value="i">
                {{ t(`exams.presets.${p.key}`) }}
              </option>
            </select>
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
            <div class="field-row">
              <div class="field">
                <label>{{ t('exams.bloomCustom') }}</label>
                <div class="dist-grid">
                  <label v-for="b in (Object.keys(customBloom) as BloomLevel[])" :key="b">
                    {{ b }} <input v-model.number="customBloom[b]" type="number" min="0" max="1" step="0.05" />
                  </label>
                </div>
              </div>
              <div class="field">
                <label>{{ t('exams.difficultyCustom') }}</label>
                <div class="dist-grid">
                  <label v-for="d in (Object.keys(customDifficulty) as Difficulty[])" :key="d">
                    {{ d }} <input v-model.number="customDifficulty[d]" type="number" min="0" max="1" step="0.05" />
                  </label>
                </div>
              </div>
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
                <input v-model.number="minScore" type="number" min="0" max="1" step="0.05" :disabled="!useRag" />
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
