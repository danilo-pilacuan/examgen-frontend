<script setup lang="ts">
import { ref } from 'vue'
import { useChatStore } from '@/stores/chat'

const chat = useChatStore()
const fileInput = ref<HTMLInputElement | null>(null)

async function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  try {
    await chat.uploadFile(file)
  } catch {
    chat.lastUpload = null
  } finally {
    target.value = ''
  }
}
</script>

<template>
  <div class="file-upload">
    <input ref="fileInput" type="file" accept=".pdf,.txt,.md,.tex" hidden @change="onFileChange" />
    <button type="button" @click="fileInput?.click()">📎 Attach material</button>
    <span v-if="chat.uploading" class="status">Indexing…</span>
    <span v-else-if="chat.lastUpload" class="status ok">
      {{ chat.lastUpload.chunks_indexed }} chunks indexed
    </span>
  </div>
</template>

<style scoped>
.file-upload {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
}

.file-upload button {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: 8px;
  padding: 0.35rem 0.7rem;
  cursor: pointer;
}

.status {
  color: var(--color-muted);
}

.status.ok {
  color: var(--color-success);
}
</style>
