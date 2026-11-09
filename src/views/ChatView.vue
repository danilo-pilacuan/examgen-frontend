<script setup lang="ts">
import { onMounted } from 'vue'
import ThreadSidebar from '@/components/chat/ThreadSidebar.vue'
import ChatPanel from '@/components/chat/ChatPanel.vue'
import { useChatStore } from '@/stores/chat'
import { useThreadId } from '@/composables/useThreadId'

const chat = useChatStore()
const { ensureLoaded, refresh, currentThreadId } = useThreadId()

// Restore the last conversation on mount (page reload / re-login):
// the thread list now comes from the server (BUG-023 fix), the content
// from the backend checkpointer.
onMounted(() => {
  void refresh().then(() => {
    if (currentThreadId.value && chat.messages.length === 0) {
      void chat.loadThread(currentThreadId.value)
    }
  })
  void ensureLoaded()
})
</script>

<template>
  <div class="chat-view">
    <ThreadSidebar />
    <section class="chat-main">
      <ChatPanel />
    </section>
  </div>
</template>

<style scoped>
.chat-view {
  display: flex;
  height: 100%;
  min-height: 0;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}
</style>
