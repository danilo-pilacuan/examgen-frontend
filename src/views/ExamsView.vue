<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useExamsStore } from '@/stores/exams'
import { useSubjectsStore } from '@/stores/subjects'
import { apiFetch } from '@/api/http'

const { t } = useI18n()
const exams = useExamsStore()
const subjects = useSubjectsStore()

const showForm = ref(false)
const generating = ref(false)
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

onMounted(() => {
  subjects.fetch().catch(() => {})
})

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
  generating.value = true
  try {
    const bloom = BLOOM_PRESETS[bloomPreset.value].dist
    const diff = DIFFICULTY_PRESETS[difficultyPreset.value].dist
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
          estimated_duration_minutes: duration.value,
          metadata: {
            title: title.value || t('exams.defaultTitle'),
            num_versions: numVersions.value,
          },
        },
        template_id: 'base_exam',
        persist: true,
      }),
    })
    await exams.fetch(subjects.activeSubjectId)
    showForm.value = false
  } catch {
    // no connection: keep the form open
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
            <strong>{{ exam.blueprint.metadata?.title ?? t('exams.defaultTitle') }}</strong>
            <span class="meta">
              {{ exam.items.length }} {{ t('exams.questions') }} ·
              {{ new Date(exam.created_at).toLocaleString() }}
            </span>
          </div>
          <div class="pdf-links">
            <button
              v-for="(pdf, i) in exam.pdf_paths"
              :key="pdf"
              type="button"
              @click="download(`/output/${pdf.split(/[\\/]/).pop()}`)"
            >
              ⬇️ PDF v{{ i + 1 }}
            </button>
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

.empty,
.loading {
  color: var(--color-muted);
  padding: 1rem 0;
}
</style>
