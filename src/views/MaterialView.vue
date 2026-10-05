<script setup lang="ts">
import { onMounted, ref, watch, computed } from 'vue'
import { useMaterialStore } from '@/stores/material'
import { useSubjectsStore } from '@/stores/subjects'
import { apiFetch } from '@/api/http'

const material = useMaterialStore()
const subjects = useSubjectsStore()

const uploading = ref(false)
const uploadMessage = ref('')
const expandedFile = ref<string | null>(null)

const sources = computed(() => {
  const map = new Map<string, number>()
  for (const chunk of material.chunks) {
    map.set(chunk.source_file, (map.get(chunk.source_file) ?? 0) + 1)
  }
  return Array.from(map.entries()).map(([file, count]) => ({ file, count }))
})

onMounted(() => {
  subjects.fetch().catch(() => {})
})

watch(
  () => subjects.activeSubjectId,
  (id) => {
    if (id) material.fetch(id).catch(() => {})
    else material.chunks = []
  },
  { immediate: true },
)

async function uploadFile(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file || !subjects.activeSubjectId) return
  uploading.value = true
  uploadMessage.value = ''
  try {
    const form = new FormData()
    form.append('file', file)
    form.append('subject_id', subjects.activeSubjectId ?? '')
    form.append('subject_name', subjects.activeSubject?.name ?? '')
    const res = await apiFetch<{ chunks_indexed: number }>('/api/files', {
      method: 'POST',
      body: form,
    })
    uploadMessage.value = `✅ ${file.name}: ${res.chunks_indexed} chunks indexed`
    await material.fetch(subjects.activeSubjectId)
  } catch (e) {
    uploadMessage.value = `⚠️ ${e instanceof Error ? e.message : 'Upload error'}`
  } finally {
    uploading.value = false
    target.value = ''
  }
}

async function deleteMaterial(sourceFile: string | null) {
  if (!subjects.activeSubjectId) return
  const msg = sourceFile
    ? `Delete the material "${sourceFile}"?`
    : 'Delete ALL material for this subject?'
  if (!confirm(msg)) return
  try {
    await apiFetch(`/subjects/${subjects.activeSubjectId}/material`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_file: sourceFile,
        delete_all: sourceFile === null,
      }),
    })
    await material.fetch(subjects.activeSubjectId)
  } catch {
    // no connection: silently ignore
  }
}
</script>

<template>
  <div class="material-view">
    <div class="header">
      <h2>📁 Indexed material</h2>
      <label v-if="subjects.activeSubjectId" class="upload-btn" :class="{ uploading }">
        <input type="file" accept=".pdf,.txt,.md,.tex,.docx,.pptx,.xlsx" hidden @change="uploadFile" />
        {{ uploading ? 'Uploading…' : '⬆️ Upload file' }}
      </label>
    </div>

    <p v-if="uploadMessage" class="message">{{ uploadMessage }}</p>

    <div v-if="!subjects.activeSubjectId" class="empty">
      Activate a subject first (Subjects view).
    </div>
    <template v-else>
      <div v-if="material.loading" class="loading">Loading…</div>
      <div v-else-if="material.chunks.length === 0" class="empty">
        No indexed material. Upload files here or from the Chat.
      </div>
      <ul v-else class="source-list">
        <li v-for="src in sources" :key="src.file">
          <div class="source-header" @click="expandedFile = expandedFile === src.file ? null : src.file">
            <strong>{{ src.file }}</strong>
            <span class="count">{{ src.count }} chunks</span>
          </div>
          <template v-if="expandedFile === src.file">
            <ul class="chunks">
              <li v-for="chunk in material.chunks.filter((c) => c.source_file === src.file)" :key="chunk.id">
                <span class="idx">#{{ chunk.chunk_index }}</span>
                <p>{{ chunk.content }}</p>
              </li>
            </ul>
          </template>
          <div class="source-actions">
            <button type="button" class="danger" @click.stop="deleteMaterial(src.file)">
              🗑 Delete
            </button>
          </div>
        </li>
      </ul>
      <button
        v-if="material.chunks.length > 0"
        type="button"
        class="delete-all"
        @click="deleteMaterial(null)"
      >
        🗑 Delete all material
      </button>
    </template>
  </div>
</template>

<style scoped>
.material-view {
  padding: 1.5rem;
  max-width: 860px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.upload-btn {
  border: 1px solid var(--color-primary);
  background: transparent;
  color: var(--color-primary);
  border-radius: 8px;
  padding: 0.4rem 0.9rem;
  cursor: pointer;
  font-size: 0.9rem;
}

.upload-btn.uploading {
  opacity: 0.5;
  cursor: wait;
}

.message {
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  background: rgba(22, 163, 74, 0.08);
  color: var(--color-success);
  font-size: 0.88rem;
}

.source-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.source-list > li {
  padding: 0.9rem 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.source-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.count {
  font-size: 0.8rem;
  color: var(--color-muted);
}

.chunks {
  list-style: none;
  padding: 0;
  margin: 0.75rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.chunks li {
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
}

.idx {
  font-size: 0.75rem;
  color: var(--color-muted);
}

.chunks p {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  white-space: pre-wrap;
}

.source-actions {
  margin-top: 0.5rem;
  display: flex;
  justify-content: flex-end;
}

.source-actions button,
.delete-all {
  border: 1px solid var(--color-danger);
  background: transparent;
  color: var(--color-danger);
  border-radius: 8px;
  padding: 0.3rem 0.7rem;
  cursor: pointer;
  font-size: 0.85rem;
}

.delete-all {
  margin-top: 1rem;
}

.empty,
.loading {
  color: var(--color-muted);
  padding: 1rem 0;
}
</style>
