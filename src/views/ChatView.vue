<script setup lang="ts">
import ThreadSidebar from '@/components/chat/ThreadSidebar.vue'
import ChatPanel from '@/components/chat/ChatPanel.vue'
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
