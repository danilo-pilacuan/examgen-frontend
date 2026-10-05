<script setup lang="ts">
import { onMounted, ref, watch, computed } from 'vue'
import { useBankStore } from '@/stores/bank'
import { useSubjectsStore } from '@/stores/subjects'
import type { Question } from '@/types/domain'

const bank = useBankStore()
const subjects = useSubjectsStore()

const selected = ref<Question | null>(null)
const filterTopic = ref('')
const filterDifficulty = ref('')
const filterBloom = ref('')
const filterType = ref('')
const filterVerified = ref<'all' | 'human' | 'ai' | 'none'>('all')

const BLOOM_LEVELS = ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']
const DIFFICULTIES = ['easy', 'medium', 'hard']
const TYPES = ['multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_in_blank']

onMounted(() => {
  subjects.fetch().catch(() => {})
})

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

async function toggleVerification(q: Question) {
  try {
    await bank.setHumanVerification(q.id, !q.verified_by_human)
  } catch {
    // no connection: silently ignore
  }
}
</script>

<template>
  <div class="bank-view">
    <h2>📝 Question bank</h2>

    <div v-if="!subjects.activeSubjectId" class="empty">
      Activate a subject first (Subjects view).
    </div>
    <template v-else>
      <div class="filters">
        <input v-model="filterTopic" type="search" placeholder="Filter by topic…" />
        <select v-model="filterBloom">
          <option value="">Bloom: all</option>
          <option v-for="b in BLOOM_LEVELS" :key="b" :value="b">{{ b }}</option>
        </select>
        <select v-model="filterDifficulty">
          <option value="">Difficulty: all</option>
          <option v-for="d in DIFFICULTIES" :key="d" :value="d">{{ d }}</option>
        </select>
        <select v-model="filterType">
          <option value="">Type: all</option>
          <option v-for="t in TYPES" :key="t" :value="t">{{ t }}</option>
        </select>
        <select v-model="filterVerified">
          <option value="all">Verification: all</option>
          <option value="human">Verified (human)</option>
          <option value="ai">Verified (AI)</option>
          <option value="none">Unverified</option>
        </select>
      </div>

      <div v-if="bank.loading" class="loading">Loading…</div>
      <div v-else-if="filtered.length === 0" class="empty">
        No questions for this subject. Generate some from the Chat.
      </div>
      <table v-else class="question-table">
        <thead>
          <tr>
            <th>Topic</th>
            <th>Type</th>
            <th>Bloom</th>
            <th>Difficulty</th>
            <th>Verification</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="q in filtered"
            :key="q.id"
            :class="{ selected: selected?.id === q.id }"
            @click="selected = q"
          >
            <td>{{ q.topic }}</td>
            <td>{{ q.question_type ?? '—' }}</td>
            <td>{{ q.bloom_level }}</td>
            <td>{{ q.difficulty }}</td>
            <td>
              <span :class="q.verified_by_human ? 'ok' : 'warn'">
                {{ q.verified_by_human ? '✔ Human' : '⏳ Pending' }}
              </span>
            </td>
            <td>
              <button type="button" @click.stop="toggleVerification(q)">
                {{ q.verified_by_human ? 'Remove' : 'Verify' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="selected" class="detail">
        <div class="detail-header">
          <h3>Detail</h3>
          <button type="button" class="close" @click="selected = null">✕</button>
        </div>
        <p><strong>Statement:</strong> {{ selected.question_text }}</p>
        <ul v-if="selected.options">
          <li v-for="(opt, i) in selected.options" :key="i" :class="{ correct: opt.is_correct }">
            {{ opt.text }} <span v-if="opt.is_correct">✔</span>
          </li>
        </ul>
        <p v-if="selected.expected_answer">
          <strong>Expected answer:</strong> {{ selected.expected_answer }}
        </p>
        <p v-if="selected.solution_explanation">
          <strong>Explanation:</strong> {{ selected.solution_explanation }}
        </p>
        <p v-if="selected.ai_review_notes">
          <strong>AI notes:</strong> {{ selected.ai_review_notes }}
          <span v-if="selected.ai_review_priority" class="priority">
            ({{ selected.ai_review_priority }})
          </span>
        </p>
      </div>
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

.question-table tbody tr {
  cursor: pointer;
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

.detail {
  margin-top: 1.5rem;
  padding: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
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
</style>
