<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useChatStore } from '@/stores/chat'
import { useSubjectsStore } from '@/stores/subjects'
import { useMaterialStore } from '@/stores/material'
import { useBankStore } from '@/stores/bank'
import { useExamsStore } from '@/stores/exams'
import { useChatStream } from '@/composables/useChatStream'
import { useThreadId } from '@/composables/useThreadId'
import MessageList from '@/components/chat/MessageList.vue'
import ToolActivity from '@/components/chat/ToolActivity.vue'
import FileDrop from '@/components/chat/FileDrop.vue'
import MaterialToast from '@/components/widgets/MaterialToast.vue'

const { t } = useI18n()
const chat = useChatStore()
const subjects = useSubjectsStore()
const material = useMaterialStore()
const bank = useBankStore()
const exams = useExamsStore()
const { touchThread, createThread, refresh: refreshThreads } = useThreadId()

const toastShow = ref(false)
const toastMessage = ref('')

/** Applies a subject chosen in the chat to the whole app (reactive selector). */
function applyChatSubject(subjectId: string, subjectName: string) {
  // Register it locally if the agent created a subject the list doesn't have yet.
  if (!subjects.subjects.some((s) => s.id === subjectId)) {
    subjects.subjects.push({ id: subjectId, name: subjectName })
  }
  subjects.setActive(subjectId)
  chat.setActiveSubject(subjectId, subjectName)
  // Refresh the reactive panels that depend on the subject.
  bank.fetch(subjectId).catch(() => {})
  material.fetch(subjectId).catch(() => {})
  exams.fetch(subjectId).catch(() => {})
}

const {
  streaming,
  send: streamSend,
  stop,
  retry: retryStream,
} = useChatStream({
  onEvent: (event) => {
    if (event.type === 'token') {
      const delta = event.payload.delta ?? ''
      if (assistantId.value) chat.appendToMessage(assistantId.value, delta)
    } else if (event.type === 'material_indexed') {
      toastMessage.value = t('chat.toastChunks', {
        filename: event.payload.filename,
        n: event.payload.chunks,
      })
      toastShow.value = true
      if (assistantId.value) chat.appendEventToMessage(assistantId.value, event)
    } else if (event.type === 'subject_selected' || event.type === 'subject_registered') {
      // The agent picked/created a subject in the chat → sync the header
      // selector and every reactive panel.
      applyChatSubject(event.payload.subject_id, event.payload.subject_name)
      if (assistantId.value) chat.appendEventToMessage(assistantId.value, event)
    } else if (event.type !== 'done') {
      if (assistantId.value) chat.appendEventToMessage(assistantId.value, event)
    }
  },
  onError: () => {
    // The stream died mid-turn (timeout, proxy cut, backend restart):
    // the action may have completed server-side, so warn instead of
    // silently leaving an empty bubble.
    if (assistantId.value) chat.failMessage(assistantId.value)
    chat.setStreaming(false)
  },
})

const input = ref('')
const assistantId = ref<string | null>(null)
const listRef = ref<InstanceType<typeof MessageList> | null>(null)

const canSend = computed(() => input.value.trim().length > 0 && !streaming.value)

// Reactive chat context: mirrors the subject selected in the header.
const contextLabel = computed(() =>
  chat.activeSubjectName
    ? t('chat.contextWith', { subject: chat.activeSubjectName })
    : t('chat.contextNone'),
)

async function send() {
  const message = input.value.trim()
  if (!message || streaming.value) return
  input.value = ''

  // Ensure thread_id: reuse the active one or create a new conversation.
  let threadId = chat.threadId
  if (!threadId) {
    threadId = createThread(message.slice(0, 40)).threadId
    chat.threadId = threadId
  }

  chat.pushUserMessage(message)
  assistantId.value = chat.pushAssistantPlaceholder()
  chat.setStreaming(true)
  try {
    await streamSend({
      message,
      threadId,
      subjectId: chat.activeSubjectId,
      subjectName: chat.activeSubjectName,
    })
    touchThread(threadId)
    // Server now has the row with the pinned title + badges; re-sync so a
    // legacy thread adopted this turn shows up in the sidebar.
    void refreshThreads()
  } finally {
    if (assistantId.value) chat.finishMessage(assistantId.value)
    chat.setStreaming(false)
    assistantId.value = null
    scrollToBottom()
  }
}

function scrollToBottom() {
  listRef.value?.scrollToBottom()
}

/** Retries the last dropped turn: clears the failure flag and re-sends.
 * RFC-11/ISS-13: when the retried turn completes, re-hydrate the bubble
 * from the checkpointer history so the retried message shows the turn the
 * backend actually produced (its widgets too), not just the new tokens. */
function retryLastTurn() {
  const failed = [...chat.messages].reverse().find((m) => m.failed)
  if (failed) chat.clearMessageFailure(failed.id)
  if (retryStream() && chat.threadId) {
    const threadId = chat.threadId
    const stopWatching = watch(
      streaming,
      (isStreaming, wasStreaming) => {
        if (wasStreaming && !isStreaming) {
          stopWatching()
          void chat.loadThread(threadId, false)
        }
      },
    )
  }
}
</script>

<template>
  <div class="chat-panel">
    <div class="chat-context" :class="{ active: chat.activeSubjectId }">
      <span class="dot" />
      <span>{{ contextLabel }}</span>
    </div>
    <MessageList ref="listRef" :messages="chat.messages" @retry="retryLastTurn" />
    <ToolActivity :streaming="chat.streaming" />
    <form class="chat-input" @submit.prevent="send">
      <textarea
        v-model="input"
        :placeholder="t('chat.placeholder')"
        rows="2"
        @keydown.enter.exact.prevent="send"
      />
      <div class="chat-actions">
        <button v-if="streaming" type="button" class="stop" @click="stop">
          {{ t('chat.stop') }}
        </button>
        <button type="submit" :disabled="!canSend">{{ t('chat.send') }}</button>
      </div>
    </form>
    <FileDrop />
    <MaterialToast v-model:show="toastShow" :message="toastMessage" />
  </div>
</template>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-context {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 1rem;
  font-size: 0.8rem;
  color: var(--color-muted);
  border-bottom: 1px dashed var(--color-border);
  background: var(--color-surface);
}

.chat-context.active {
  color: var(--color-primary);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-muted);
}

.chat-context.active .dot {
  background: var(--color-success);
}

.chat-input {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
}

.chat-input textarea {
  flex: 1;
  resize: none;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.95rem;
}

.chat-actions {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.chat-actions button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  background: var(--color-primary);
  color: var(--color-primary-contrast);
  cursor: pointer;
}

.chat-actions .stop {
  background: var(--color-danger);
}

.chat-actions button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

