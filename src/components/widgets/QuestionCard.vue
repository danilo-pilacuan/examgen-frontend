<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { GeneratedItem } from '@/types/domain'
import { apiFetch, getAuthToken } from '@/api/http'

const { t } = useI18n()
const props = defineProps<{
  question: GeneratedItem
  subjectId?: string | null
  threadId?: string | null
}>()

const emit = defineEmits<{
  (e: 'saved', questionId: string): void
  (e: 'discarded'): void
  (e: 'verified', questionId: string): void
}>()

const state = ref<'pending' | 'saving' | 'saved' | 'verified' | 'discarded' | 'error'>('pending')
const errorMessage = ref('')

const canAct = computed(() => state.value === 'pending' || state.value === 'error')

async function save(verify: boolean) {
  if (!canAct.value) return
  state.value = 'saving'
  errorMessage.value = ''
  try {
    // The backend HITL flow: save → (optional) verify.
    const res = await apiFetch<{ question_id?: string }>('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: verify
          ? t('questionCard.saveVerifiedPrompt', { statement: props.question.statement })
          : t('questionCard.savePrompt', { statement: props.question.statement }),
        thread_id: props.threadId ?? undefined,
        subject_id: props.subjectId ?? undefined,
        // The chat endpoint resolves the user from the body token (SSE
        // clients cannot always send headers).
        token: getAuthToken() ?? undefined,
      }),
    })
    if (verify) {
      state.value = 'verified'
      emit('verified', res.question_id ?? '')
    } else {
      state.value = 'saved'
      emit('saved', res.question_id ?? '')
    }
  } catch (e) {
    state.value = 'error'
    errorMessage.value = e instanceof Error ? e.message : t('questionCard.errorSaving')
  }
}

function discard() {
  state.value = 'discarded'
  emit('discarded')
}
</script>

<template>
  <div class="question-card" :class="state">
    <div class="card-header">
      <span class="icon">📝</span>
      <span class="title">{{ t('questionCard.title') }}</span>
      <span v-if="state === 'saved'" class="badge ok">{{ t('questionCard.saved') }}</span>
      <span v-else-if="state === 'verified'" class="badge ok">✔ {{ t('questionCard.verified') }}</span>
      <span v-else-if="state === 'discarded'" class="badge muted">{{ t('questionCard.discarded') }}</span>
      <span v-else-if="state === 'saving'" class="badge info">{{ t('questionCard.saving') }}</span>
    </div>

    <p class="statement">{{ question.statement }}</p>

    <ul v-if="question.options?.length" class="options">
      <li
        v-for="(opt, i) in question.options"
        :key="i"
        :class="{ correct: opt.is_correct }"
      >
        <span class="letter">{{ String.fromCharCode(65 + i) }}.</span>
        {{ opt.text }}
        <span v-if="opt.is_correct" class="check">✔</span>
      </li>
    </ul>

    <p v-if="question.expected_answer" class="answer">
      <strong>{{ t('questionCard.answer') }}:</strong> {{ question.expected_answer }}
    </p>
    <p v-if="question.solution_explanation" class="explanation">
      <strong>{{ t('questionCard.explanation') }}:</strong> {{ question.solution_explanation }}
    </p>

    <div class="meta">
      <span class="tag">{{ question.topic }}</span>
      <span class="tag">{{ question.bloom_level }}</span>
      <span class="tag">{{ question.difficulty }}</span>
      <span class="tag">{{ question.question_type }}</span>
      <span v-if="question.points" class="tag">{{ question.points }} pts</span>
    </div>

    <div v-if="canAct" class="actions">
      <button type="button" class="primary" :disabled="state === 'saving'" @click="save(true)">
        ✔ {{ t('questionCard.saveVerify') }}
      </button>
      <button type="button" :disabled="state === 'saving'" @click="save(false)">
        {{ t('questionCard.save') }}
      </button>
      <button type="button" class="danger" :disabled="state === 'saving'" @click="discard">
        {{ t('questionCard.discard') }}
      </button>
    </div>
    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
  </div>
</template>

<style scoped>
.question-card {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 0.9rem;
  background: var(--color-surface);
  margin: 0.5rem 0;
}

.question-card.verified {
  border-color: var(--color-success);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.title {
  font-weight: 600;
  flex: 1;
}

.badge {
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}

.badge.ok {
  background: rgba(22, 163, 74, 0.12);
  color: var(--color-success);
}

.badge.info {
  background: rgba(37, 99, 235, 0.12);
  color: var(--color-primary);
}

.badge.muted {
  background: rgba(100, 116, 139, 0.12);
  color: var(--color-muted);
}

.statement {
  margin: 0 0 0.5rem;
  font-weight: 500;
}

.options {
  list-style: none;
  padding: 0;
  margin: 0 0 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.options li {
  padding: 0.3rem 0.5rem;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.03);
}

.options li.correct {
  background: rgba(22, 163, 74, 0.1);
  color: var(--color-success);
  font-weight: 500;
}

.letter {
  font-weight: 600;
  margin-right: 0.25rem;
}

.answer,
.explanation {
  font-size: 0.88rem;
  margin: 0.35rem 0;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin: 0.5rem 0;
}

.tag {
  font-size: 0.72rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.08);
  color: var(--color-primary);
}

.actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
}

.actions button {
  padding: 0.4rem 0.9rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  cursor: pointer;
  font-size: 0.85rem;
}

.actions button.primary {
  background: var(--color-primary);
  color: var(--color-primary-contrast);
  border-color: var(--color-primary);
}

.actions button.danger {
  color: var(--color-danger);
  border-color: var(--color-danger);
}

.actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error {
  color: var(--color-danger);
  font-size: 0.85rem;
  margin: 0.5rem 0 0;
}
</style>
