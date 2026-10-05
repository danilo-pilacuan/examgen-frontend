<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useExamsStore } from '@/stores/exams'
import { useSubjectsStore } from '@/stores/subjects'

const exams = useExamsStore()
const subjects = useSubjectsStore()

onMounted(() => {
  subjects.fetch().catch(() => {})
})

watch(
  () => subjects.activeSubjectId,
  (id) => {
    if (id) exams.fetch(id).catch(() => {})
    else exams.exams = []
  },
  { immediate: true },
)

function download(url: string) {
  window.open(url, '_blank')
}
</script>

<template>
  <div class="exams-view">
    <h2>📄 Exámenes</h2>

    <div v-if="!subjects.activeSubjectId" class="empty">
      Activa una materia primero (vista Materias).
    </div>
    <div v-else-if="exams.loading" class="loading">Cargando…</div>
    <div v-else-if="exams.exams.length === 0" class="empty">
      No hay exámenes generados. Pídele al agente: «Genera un examen de 10 preguntas».
    </div>
    <ul v-else class="exam-list">
      <li v-for="exam in exams.exams" :key="exam.id">
        <div class="exam-info">
          <strong>{{ exam.blueprint.metadata?.title ?? 'Examen' }}</strong>
          <span class="meta">
            {{ exam.items.length }} preguntas ·
            {{ new Date(exam.created_at).toLocaleString() }}
          </span>
        </div>
        <div class="pdf-links">
          <button
            v-for="(pdf, i) in exam.pdf_paths"
            :key="pdf"
            type="button"
            @click="download(`/output/${pdf.split(/[\\/]/).pop()}`)"
          >
            ⬇️ PDF v{{ i + 1 }}
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.exams-view {
  padding: 1.5rem;
  max-width: 860px;
}

.exam-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.exam-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.exam-info .meta {
  display: block;
  font-size: 0.8rem;
  color: var(--color-muted);
}

.pdf-links {
  display: flex;
  gap: 0.4rem;
}

.pdf-links button {
  border: 1px solid var(--color-primary);
  background: transparent;
  color: var(--color-primary);
  border-radius: 8px;
  padding: 0.3rem 0.7rem;
  cursor: pointer;
  font-size: 0.85rem;
}

.empty,
.loading {
  color: var(--color-muted);
  padding: 1rem 0;
}
</style>
