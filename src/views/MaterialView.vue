<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useMaterialStore } from '@/stores/material'
import { useSubjectsStore } from '@/stores/subjects'

const material = useMaterialStore()
const subjects = useSubjectsStore()

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
</script>

<template>
  <div class="material-view">
    <h2>📁 Material indexado</h2>

    <div v-if="!subjects.activeSubjectId" class="empty">
      Activa una materia primero (vista Materias).
    </div>
    <div v-else-if="material.loading" class="loading">Cargando…</div>
    <div v-else-if="material.chunks.length === 0" class="empty">
      No hay material indexado. Sube archivos desde el Chat (📎 Adjuntar material).
    </div>
    <ul v-else class="chunk-list">
      <li v-for="chunk in material.chunks" :key="chunk.id">
        <div class="chunk-header">
          <strong>{{ chunk.source_file }}</strong>
          <span class="idx">fragmento #{{ chunk.chunk_index }}</span>
        </div>
        <p class="content">{{ chunk.content }}</p>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.material-view {
  padding: 1.5rem;
  max-width: 860px;
}

.chunk-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.chunk-list li {
  padding: 0.9rem 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.chunk-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.4rem;
}

.idx {
  font-size: 0.8rem;
  color: var(--color-muted);
}

.content {
  margin: 0;
  font-size: 0.88rem;
  color: var(--color-text);
  white-space: pre-wrap;
}

.empty,
.loading {
  color: var(--color-muted);
  padding: 1rem 0;
}
</style>
