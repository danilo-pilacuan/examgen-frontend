<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ChatMessage } from '@/stores/chat'
import MarkdownRenderer from '@/components/chat/MarkdownRenderer.vue'
import QuestionCard from '@/components/widgets/QuestionCard.vue'
import QuestionsTable from '@/components/widgets/QuestionsTable.vue'
import ArtifactCard from '@/components/widgets/ArtifactCard.vue'

const { t } = useI18n()
const props = defineProps<{ messages: ChatMessage[] }>()

const listRef = ref<HTMLElement | null>(null)

function scrollToBottom() {
  nextTick(() => {
    listRef.value?.scrollTo({ top: listRef.value.scrollHeight, behavior: 'smooth' })
  })
}

watch(
  () => props.messages.length,
  () => scrollToBottom(),
)

// Auto-scroll while the token streaming arrives.
watch(
  () => props.messages.map((m) => m.content.length).join(','),
  () => scrollToBottom(),
)

defineExpose({ scrollToBottom })
</script>

<template>
  <div ref="listRef" class="message-list">
    <div v-if="messages.length === 0" class="empty-state">
      <p>💬 {{ t('chat.empty') }}</p>
    </div>
    <div v-for="msg in messages" :key="msg.id" class="message" :class="msg.role">
      <div class="bubble">
        <template v-for="(event, i) in msg.events" :key="i">
          <!-- Interactive widgets (rendered in order of arrival) -->
          <QuestionCard
            v-if="event.type === 'question_generated'"
            :question="event.payload.question"
          />
          <QuestionsTable
            v-else-if="event.type === 'questions_listed'"
            :questions="event.payload.questions"
            :total="event.payload.total"
          />
          <ArtifactCard
            v-else-if="event.type === 'artifact_ready'"
            :kind="event.payload.kind"
            :url="event.payload.url"
            :filename="event.payload.filename"
            :version="event.payload.version"
          />
        </template>

        <MarkdownRenderer :source="msg.content" />
        <span v-if="msg.streaming" class="cursor">▍</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.empty-state {
  margin: auto;
  color: var(--color-muted);
}

.message {
  display: flex;
}

.message.user {
  justify-content: flex-end;
}

.bubble {
  max-width: 75%;
  padding: 0.6rem 0.9rem;
  border-radius: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
}

.message.user .bubble {
  background: var(--color-user-bubble);
  color: var(--color-user-bubble-text);
}

.cursor {
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}
</style>
