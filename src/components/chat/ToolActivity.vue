<script setup lang="ts">
import { computed } from 'vue'
import { useChatStore } from '@/stores/chat'

const props = defineProps<{ streaming: boolean }>()

const chat = useChatStore()

const activity = computed(() => {
  if (props.streaming && !chat.lastEventLabel) return 'Pensando…'
  return chat.lastEventLabel
})
</script>

<template>
  <div v-if="activity" class="tool-activity">
    <span class="spinner" />
    <span>{{ activity }}</span>
  </div>
</template>

<style scoped>
.tool-activity {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 1rem;
  font-size: 0.85rem;
  color: var(--color-muted);
}

.spinner {
  width: 12px;
  height: 12px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
