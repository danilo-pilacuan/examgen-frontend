<script setup lang="ts">
import { ref, computed } from 'vue'
import { useChatStore } from '@/stores/chat'
import { useChatStream } from '@/composables/useChatStream'
import { useThreadId } from '@/composables/useThreadId'
import MessageList from '@/components/chat/MessageList.vue'
import ToolActivity from '@/components/chat/ToolActivity.vue'
import FileDrop from '@/components/chat/FileDrop.vue'
import MaterialToast from '@/components/widgets/MaterialToast.vue'

const chat = useChatStore()
const { touchThread, createThread } = useThreadId()

const toastShow = ref(false)
const toastMessage = ref('')

const {
  streaming,
  send: streamSend,
  stop,
} = useChatStream({
  onEvent: (event) => {
    if (event.type === 'token') {
      const delta = event.payload.delta ?? ''
      if (assistantId.value) chat.appendToMessage(assistantId.value, delta)
    } else if (event.type === 'material_indexed') {
      toastMessage.value = `📚 ${event.payload.filename}: ${event.payload.chunks} chunks indexed`
      toastShow.value = true
      if (assistantId.value) chat.appendEventToMessage(assistantId.value, event)
    } else if (event.type !== 'done') {
      if (assistantId.value) chat.appendEventToMessage(assistantId.value, event)
    }
  },
  onError: () => {
    if (assistantId.value) chat.finishMessage(assistantId.value)
    chat.setStreaming(false)
  },
})

const input = ref('')
const assistantId = ref<string | null>(null)
const listRef = ref<InstanceType<typeof MessageList> | null>(null)

const canSend = computed(() => input.value.trim().length > 0 && !streaming.value)

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
    touchThread(threadId, message.slice(0, 40))
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
</script>

<template>
  <div class="chat-panel">
    <MessageList ref="listRef" :messages="chat.messages" />
    <ToolActivity :streaming="chat.streaming" />
    <form class="chat-input" @submit.prevent="send">
      <textarea
        v-model="input"
        placeholder="Type your message… (Enter to send)"
        rows="2"
        @keydown.enter.exact.prevent="send"
      />
      <div class="chat-actions">
        <button v-if="streaming" type="button" class="stop" @click="stop">Stop</button>
        <button type="submit" :disabled="!canSend">Send</button>
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
