<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBankStore } from '@/stores/bank'
import { useSubjectsStore } from '@/stores/subjects'
import type { Question } from '@/types/domain'

const { t } = useI18n()
const bank = useBankStore()
const subjects = useSubjectsStore()

const selected = ref<Question | null>(null)
const detailRow = ref<HTMLElement | null>(null)

function setDetailRow(el: unknown) {
  detailRow.value = el instanceof HTMLElement ? el : null
}
const filterTopic = ref('')
const filterDifficulty = ref('')
const filterBloom = ref('')
const filterType = ref('')
const filterVerified = ref<'all' | 'human' | 'ai' | 'none'>('all')

const BLOOM_LEVELS = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']
const DIFFICULTIES = ['easy', 'medium', 'hard']
const TYPES = ['multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_in_blank']

// Reactive: the bank follows the subject selected in the header.
watch(
  () => subjects.activeSubjectId,
  (id) => {
    selected.value = null
    if (id) bank.fetch(id).catch(() => {})
    else bank.questions = []
  },
  { immediate: true },
)

const filtered = computed(() => {
  return bank.questions.filter((q) => {
    if (filterTopic.value && !q.topic.toLowerCase().includes(filterTopic.value.toLowerCase()))
      return false
    if (filterDifficulty.value && q.difficulty !== filterDifficulty.value) return false
    if (filterBloom.value && q.bloom_level !== filterBloom.value) return false
    if (filterType.value && q.question_type !== filterType.value) return false
    if (filterVerified.value === 'human' && !q.verified_by_human) return false
    if (filterVerified.value === 'ai' && !q.verified_by_ai) return false
    if (filterVerified.value === 'none' && q.verified_by_human) return false
    return true
  })
})

function selectQuestion(q: Question) {
  selected.value = selected.value?.id === q.id ? null : q
  requestAnimationFrame(() => {
    detailRow.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })
}

async function toggleVerification(q: Question) {
  try {
    await bank.setHumanVerification(q.id, !q.verified_by_human)
  } catch {
    // no connection: silently ignore
  }
}

const exporting = ref(false)
const exportError = ref('')

function auditFor(q: Question) {
  return bank.auditFor(q.id)
}

async function downloadBank() {
  const subject = subjects.activeSubject
  if (!subject || exporting.value) return
  exporting.value = true
  exportError.value = ''
  try {
    const data = await bank.exportBank(subject.id, subject.name)
    window.alert(
      t('bank.exportDone', { n: data.total_questions }) +
        (data.thinking_capture_enabled ? '' : '\n' + t('bank.exportNoThinking')),
    )
  } catch {
    exportError.value = t('bank.exportError')
  } finally {
    exporting.value = false
  }
}
</script>

<template>
  <div class="bank-view">
    <h2>📝 {{ t('bank.title') }}</h2>

    <div v-if="!subjects.activeSubjectId" class="empty">
      {{ t('bank.needSubject') }}
    </div>
    <template v-else>
      <div class="filters">
        <input v-model="filterTopic" type="search" :placeholder="t('bank.filterTopic')" />
        <select v-model="filterBloom">
          <option value="">{{ t('bank.bloomAll') }}</option>
          <option v-for="b in BLOOM_LEVELS" :key="b" :value="b">{{ b }}</option>
        </select>
        <select v-model="filterDifficulty">
          <option value="">{{ t('bank.difficultyAll') }}</option>
          <option v-for="d in DIFFICULTIES" :key="d" :value="d">{{ d }}</option>
        </select>
        <select v-model="filterType">
          <option value="">{{ t('bank.typeAll') }}</option>
          <option v-for="t2 in TYPES" :key="t2" :value="t2">{{ t2 }}</option>
        </select>
        <select v-model="filterVerified">
          <option value="all">{{ t('bank.verificationAll') }}</option>
          <option value="human">{{ t('bank.verifiedHuman') }}</option>
          <option value="ai">{{ t('bank.verifiedAi') }}</option>
          <option value="none">{{ t('bank.unverified') }}</option>
        </select>
        <button
          type="button"
          class="export-btn"
          :disabled="exporting"
          @click="downloadBank"
        >
          {{ exporting ? t('bank.exporting') : t('bank.download') }}
        </button>
      </div>
      <p v-if="exportError" class="export-error">{{ exportError }}</p>

      <div v-if="bank.loading" class="loading">{{ t('bank.loading') }}</div>
      <div v-else-if="filtered.length === 0" class="empty">
        {{ t('bank.empty') }}
      </div>
      <table v-else class="question-table">
        <thead>
          <tr>
            <th class="col-expand"><span class="sr-only">{{ t('bank.expandHint') }}</span></th>
            <th>{{ t('questionsTable.topic') }}</th>
            <th>{{ t('questionsTable.type') }}</th>
            <th>{{ t('questionsTable.bloom') }}</th>
            <th>{{ t('questionsTable.difficulty') }}</th>
            <th>{{ t('bank.verification') }}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <template v-for="q in filtered" :key="q.id">
            <tr
              :class="{ selected: selected?.id === q.id, expanded: selected?.id === q.id }"
              @click="selectQuestion(q)"
              @keydown.enter.prevent="selectQuestion(q)"
              @keydown.space.prevent="selectQuestion(q)"
              :tabindex="0"
              role="button"
              :aria-expanded="selected?.id === q.id"
              :aria-label="t('bank.expandHint') + ': ' + q.topic"
            >
              <td class="col-expand">
                <span class="chevron" aria-hidden="true">▸</span>
              </td>
              <td>{{ q.topic }}</td>
              <td>{{ q.question_type ?? '—' }}</td>
              <td>{{ q.bloom_level }}</td>
              <td>{{ q.difficulty }}</td>
              <td>
                <span :class="q.verified_by_human ? 'ok' : 'warn'">
                  {{ q.verified_by_human ? `✔ ${t('questionsTable.human')}` : `⏳ ${t('questionsTable.pending')}` }}
                </span>
              </td>
              <td>
                <button type="button" @click.stop="toggleVerification(q)">
                  {{ q.verified_by_human ? t('bank.remove') : t('bank.verify') }}
                </button>
              </td>
            </tr>
            <tr v-if="selected?.id === q.id" class="detail-row">
              <td :colspan="7">
                <div :ref="setDetailRow" class="detail">
                  <div class="detail-header">
                    <h3>{{ t('bank.detail') }}</h3>
                    <button type="button" class="close" :aria-label="t('bank.collapseHint')" @click.stop="selectQuestion(q)">✕</button>
                  </div>
                  <p><strong>{{ t('bank.statement') }}:</strong> {{ selected.question_text }}</p>
                  <ul v-if="selected.options">
                    <li v-for="(opt, i) in selected.options" :key="i" :class="{ correct: opt.is_correct }">
                      {{ opt.text }} <span v-if="opt.is_correct">✔</span>
                    </li>
                  </ul>
                  <p v-if="selected.expected_answer">
                    <strong>{{ t('bank.expectedAnswer') }}:</strong> {{ selected.expected_answer }}
                  </p>
                  <p v-if="selected.solution_explanation">
                    <strong>{{ t('bank.explanation') }}:</strong> {{ selected.solution_explanation }}
                  </p>
                  <p v-if="selected.ai_review_notes">
                    <strong>{{ t('bank.aiNotes') }}:</strong> {{ selected.ai_review_notes }}
                    <span v-if="selected.ai_review_priority" class="priority">
                      ({{ selected.ai_review_priority }})
                    </span>
                  </p>
                  <details v-if="auditFor(selected)?.prompt" class="audit-field">
                    <summary>{{ t('bank.prompt') }}</summary>
                    <pre>{{ auditFor(selected)?.prompt }}</pre>
                  </details>
                  <details v-if="auditFor(selected)?.thinking" class="audit-field">
                    <summary>{{ t('bank.thinking') }}</summary>
                    <pre>{{ auditFor(selected)?.thinking }}</pre>
                  </details>
                  <p v-if="!auditFor(selected)?.prompt" class="audit-missing">
                    {{ t('bank.noPrompt') }}
                  </p>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>

      <p v-if="selected" class="detail-fallback-hint">{{ t('bank.detailInlineHint') }}</p>
    </template>
  </div>
</template>

<style scoped>
.bank-view {
  padding: 1.5rem;
}

.filters {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.filters input,
.filters select {
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.85rem;
}

.filters input {
  flex: 1;
  min-width: 160px;
}

.question-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-surface);
  border-radius: 10px;
  overflow: hidden;
}

.question-table th,
.question-table td {
  padding: 0.6rem 0.8rem;
  border-bottom: 1px solid var(--color-border);
  text-align: left;
  font-size: 0.9rem;
}

.question-table tbody tr:not(.detail-row) {
  cursor: pointer;
  transition: background 0.15s ease;
}

.question-table tbody tr:not(.detail-row):hover {
  background: rgba(37, 99, 235, 0.05);
}

.question-table tbody tr:not(.detail-row):focus-visible {
  outline: 2px solid var(--color-primary, #2563eb);
  outline-offset: -2px;
}

.question-table tbody tr.selected {
  background: rgba(37, 99, 235, 0.08);
}

.ok {
  color: var(--color-success);
}

.warn {
  color: var(--color-warning);
}

.question-table tbody tr.expanded td {
  border-bottom-color: transparent;
}

.col-expand {
  width: 2rem;
  text-align: center;
}

.chevron {
  display: inline-block;
  color: var(--color-muted);
  font-size: 0.9rem;
  transition: transform 0.15s ease;
}

tr.expanded .chevron {
  transform: rotate(90deg);
  color: var(--color-primary, #2563eb);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.detail-row td {
  padding: 0;
  background: var(--color-surface);
}

.detail-fallback-hint {
  color: var(--color-muted);
  font-size: 0.85rem;
  margin-top: 0.5rem;
}

.detail {
  margin: 0.5rem;
  padding: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08);
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.close {
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--color-muted);
}

.detail ul {
  padding-left: 1.25rem;
}

.correct {
  color: var(--color-success);
  font-weight: 600;
}

.priority {
  color: var(--color-warning);
  font-size: 0.85rem;
}

.empty,
.loading {
  color: var(--color-muted);
  padding: 1rem 0;
}

.export-btn {
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  cursor: pointer;
  font-size: 0.85rem;
}

.export-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.export-error {
  color: var(--color-danger, #dc2626);
  font-size: 0.85rem;
  margin: 0 0 0.5rem;
}

.audit-field {
  margin: 0.5rem 0;
  font-size: 0.85rem;
}

.audit-field summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--color-muted);
}

.audit-field pre {
  white-space: pre-wrap;
  word-break: break-word;
  background: rgba(15, 23, 42, 0.04);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.5rem;
  margin: 0.4rem 0 0;
  max-height: 16rem;
  overflow-y: auto;
  font-size: 0.78rem;
}

.audit-missing {
  color: var(--color-muted);
  font-size: 0.8rem;
}
</style>
