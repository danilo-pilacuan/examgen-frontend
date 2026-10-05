<script setup lang="ts">
import { ref } from 'vue'
import { useChatStore } from '@/stores/chat'

const chat = useChatStore()
const fileInput = ref<HTMLInputElement | null>(null)
const dragOver = ref(false)

async function upload(file: File) {
  try {
    await chat.uploadFile(file)
  } catch {
    chat.lastUpload = null
  }
}

function onDrop(event: DragEvent) {
  dragOver.value = false
  const files = event.dataTransfer?.files
  if (files && files.length > 0) {
    upload(files[0])
  }
}

function onDragOver(event: DragEvent) {
  event.preventDefault()
  dragOver.value = true
}

function onDragLeave() {
  dragOver.value = false
}

function onFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) upload(file)
  target.value = ''
}
</script>

<template>
  <div
    class="file-drop"
    :class="{ 'drag-over': dragOver }"
    @drop="onDrop"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
  >
    <input
      ref="fileInput"
      type="file"
      accept=".pdf,.txt,.md,.tex,.docx,.pptx,.xlsx"
      hidden
      @change="onFileChange"
    />
    <button type="button" class="attach" @click="fileInput?.click()">📎 Attach material</button>
    <span v-if="chat.uploading" class="status">Indexing…</span>
    <span v-else-if="chat.lastUpload" class="status ok">
      ✅ {{ chat.lastUpload.chunks_indexed }} chunks indexed
    </span>
    <span v-else class="hint">or drag a file here</span>
  </div>
</template>

<style scoped>
.file-drop {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  border: 1px dashed transparent;
  border-radius: 8px;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}

.file-drop.drag-over {
  border-color: var(--color-primary);
  background: rgba(37, 99, 235, 0.06);
}

.attach {
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

.hint {
  color: var(--color-muted);
  font-size: 0.78rem;
}
</style>
