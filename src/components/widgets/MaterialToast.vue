<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  show: boolean
  message: string
  kind?: 'success' | 'info' | 'error'
}>()

const emit = defineEmits<{ (e: 'close'): void }>()

const visible = ref(props.show)
let timer: number | null = null

watch(
  () => props.show,
  (val) => {
    visible.value = val
    if (val && timer === null) {
      timer = window.setTimeout(() => {
        visible.value = false
        emit('close')
        timer = null
      }, 4000)
    }
  },
  { immediate: true },
)
</script>

<template>
  <transition name="toast">
    <div v-if="visible" class="toast" :class="kind ?? 'success'">
      <span class="icon">{{ kind === 'error' ? '⚠️' : kind === 'info' ? 'ℹ️' : '✅' }}</span>
      <span class="message">{{ message }}</span>
      <button type="button" class="close" @click="visible = false; emit('close')">✕</button>
    </div>
  </transition>
</template>

<style scoped>
.toast {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 1rem;
  border-radius: 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  max-width: 360px;
}

.toast.success {
  border-left: 4px solid var(--color-success);
}

.toast.info {
  border-left: 4px solid var(--color-primary);
}

.toast.error {
  border-left: 4px solid var(--color-danger);
}

.icon {
  font-size: 1.1rem;
}

.message {
  flex: 1;
  font-size: 0.88rem;
}

.close {
  border: none;
  background: transparent;
  cursor: pointer;
  color: var(--color-muted);
  font-size: 0.9rem;
}

.toast-enter-active,
.toast-leave-active {
  transition:
    transform 0.25s ease,
    opacity 0.25s ease;
}

.toast-enter-from,
.toast-leave-to {
  transform: translateY(1rem);
  opacity: 0;
}
</style>
