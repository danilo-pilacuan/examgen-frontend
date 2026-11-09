<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useChatStore } from '@/stores/chat'
import { useThreadId } from '@/composables/useThreadId'

const { t } = useI18n()
const chat = useChatStore()
const { threads, currentThreadId, ensureLoaded, createThread, selectThread, removeThread } =
  useThreadId()

onMounted(() => {
  // Load the server-side list (per-user, cross-device; BUG-023 fix).
  void ensureLoaded()
})

function newThread() {
  chat.reset()
  const thread = createThread(t('chat.newConversation'))
  chat.threadId = thread.threadId
}

async function select(threadId: string) {
  selectThread(threadId)
  await chat.loadThread(threadId)
}

async function remove(threadId: string) {
  await removeThread(threadId)
  if (chat.threadId === threadId) chat.reset()
}
</script>

<template>
  <aside class="sidebar">
    <button class="new-chat" @click="newThread">+ {{ t('chat.newConversation') }}</button>
    <ul class="thread-list">
      <li
        v-for="th in threads"
        :key="th.threadId"
        :class="{ active: th.threadId === currentThreadId }"
        @click="select(th.threadId)"
      >
        <div class="thread-body">
          <span class="title">{{ th.title }}</span>
          <span v-if="th.lastSubjectName" class="badge subject" :title="t('chat.lastSubject')">
            {{ th.lastSubjectName }}
          </span>
          <span v-if="th.messageCount > 0" class="badge count" :title="t('chat.messageCount')">
            {{ th.messageCount }}
          </span>
        </div>
        <button class="delete" @click.stop="remove(th.threadId)">✕</button>
      </li>
      <li v-if="threads.length === 0" class="empty">{{ t('chat.noConversations') }}</li>
    </ul>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 240px;
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
}

.new-chat {
  margin: 0.75rem;
  padding: 0.5rem;
  border: 1px dashed var(--color-border);
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
}

.thread-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
}

.thread-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  border-left: 3px solid transparent;
}

.thread-list li.active {
  border-left-color: var(--color-primary);
  background: rgba(0, 0, 0, 0.04);
}

.thread-body {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
  flex: 1;
}

.thread-list .title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge {
  align-self: flex-start;
  font-size: 0.7rem;
  line-height: 1.2;
  padding: 0.05rem 0.4rem;
  border-radius: 999px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge.subject {
  background: var(--color-primary);
  color: #fff;
}

.badge.count {
  background: var(--color-border);
  color: var(--color-text);
}

.thread-list .empty {
  color: var(--color-muted);
  cursor: default;
  font-size: 0.85rem;
}

.delete {
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--color-muted);
}
</style>
