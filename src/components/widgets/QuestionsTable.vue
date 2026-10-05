<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Question } from '@/types/domain'

const { t } = useI18n()
const props = defineProps<{
  questions: Question[]
  total?: number
}>()

const emit = defineEmits<{
  (e: 'select', question: Question): void
}>()

type SortKey = 'topic' | 'bloom_level' | 'difficulty' | 'question_type' | 'verified_by_human'
const sortKey = ref<SortKey | null>(null)
const sortAsc = ref(true)
const filterText = ref('')

const filtered = computed(() => {
  let list = props.questions
  const q = filterText.value.trim().toLowerCase()
  if (q) {
    list = list.filter(
      (item) =>
        item.question_text.toLowerCase().includes(q) ||
        item.topic.toLowerCase().includes(q),
    )
  }
  return list
})

const sorted = computed(() => {
  if (!sortKey.value) return filtered.value
  const key = sortKey.value
  const dir = sortAsc.value ? 1 : -1
  return [...filtered.value].sort((a, b) => {
    const av = String(a[key] ?? '')
    const bv = String(b[key] ?? '')
    return av.localeCompare(bv) * dir
  })
})

function sortBy(key: SortKey) {
  if (sortKey.value === key) {
    sortAsc.value = !sortAsc.value
  } else {
    sortKey.value = key
    sortAsc.value = true
  }
}

function showDetail(question: Question) {
  emit('select', question)
}
</script>

<template>
  <div class="questions-table">
    <div class="table-header">
      <span class="icon">📋</span>
      <span class="title">{{ t('questionsTable.title', { n: total ?? questions.length }) }}</span>
      <input
        v-model="filterText"
        type="search"
        :placeholder="t('questionsTable.filter')"
        class="filter"
      />
    </div>

    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th @click="sortBy('topic')">{{ t('questionsTable.topic') }}</th>
            <th @click="sortBy('question_type')">{{ t('questionsTable.type') }}</th>
            <th @click="sortBy('bloom_level')">{{ t('questionsTable.bloom') }}</th>
            <th @click="sortBy('difficulty')">{{ t('questionsTable.difficulty') }}</th>
            <th @click="sortBy('verified_by_human')">{{ t('questionsTable.verified') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="q in sorted" :key="q.id" @click="showDetail(q)">
            <td>{{ q.topic }}</td>
            <td>{{ q.question_type ?? '—' }}</td>
            <td>{{ q.bloom_level }}</td>
            <td>{{ q.difficulty }}</td>
            <td>
              <span :class="q.verified_by_human ? 'ok' : 'warn'">
                {{ q.verified_by_human ? `✔ ${t('questionsTable.human')}` : `⏳ ${t('questionsTable.pending')}` }}
              </span>
            </td>
          </tr>
          <tr v-if="sorted.length === 0">
            <td colspan="5" class="empty">{{ t('questionsTable.noResults') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.questions-table {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  margin: 0.5rem 0;
  overflow: hidden;
}

.table-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.9rem;
  border-bottom: 1px solid var(--color-border);
}

.title {
  font-weight: 600;
  flex: 1;
}

.filter {
  padding: 0.25rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.85rem;
}

.table-scroll {
  max-height: 320px;
  overflow-y: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

th,
td {
  padding: 0.45rem 0.7rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

th {
  cursor: pointer;
  user-select: none;
  background: rgba(0, 0, 0, 0.02);
  font-weight: 600;
}

th:hover {
  background: rgba(37, 99, 235, 0.06);
}

tbody tr {
  cursor: pointer;
}

tbody tr:hover {
  background: rgba(37, 99, 235, 0.05);
}

.ok {
  color: var(--color-success);
}

.warn {
  color: var(--color-warning);
}

.empty {
  text-align: center;
  color: var(--color-muted);
  padding: 1rem;
}
</style>
