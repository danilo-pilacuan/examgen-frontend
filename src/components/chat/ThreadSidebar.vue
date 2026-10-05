<script setup lang="ts">
import { useChatStore } from '@/stores/chat'
import { useThreadId } from '@/composables/useThreadId'

const chat = useChatStore()
const { threads, currentThreadId, createThread, selectThread, removeThread } = useThreadId()

function newThread() {
  chat.reset()
  const thread = createThread('Nueva conversación')
  chat.threadId = thread.threadId
}

function select(threadId: string) {
  selectThread(threadId)
  chat.loadThread(threadId)
}

function remove(threadId: string) {
  removeThread(threadId)
  if (chat.threadId === threadId) chat.reset()
}
</script>

<template>
  <aside class="sidebar">
    <button class="new-chat" @click="newThread">+ Nueva conversación</button>
    <ul class="thread-list">
      <li
        v-for="t in threads"
        :key="t.threadId"
        :class="{ active: t.threadId === currentThreadId }"
        @click="select(t.threadId)"
      >
        <span class="title">{{ t.title }}</span>
        <button class="delete" @click.stop="remove(t.threadId)">✕</button>
      </li>
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
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  border-left: 3px solid transparent;
}

.thread-list li.active {
  border-left-color: var(--color-primary);
  background: rgba(0, 0, 0, 0.04);
}

.thread-list .title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete {
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--color-muted);
}
</style>
