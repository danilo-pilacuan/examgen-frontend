<script setup lang="ts">
import { onMounted } from 'vue'
import { useSubjectsStore } from '@/stores/subjects'
import { useChatStore } from '@/stores/chat'

const subjects = useSubjectsStore()
const chat = useChatStore()

onMounted(() => {
  subjects.fetch().catch(() => {})
})

function activate(id: string | null, name: string | null) {
  subjects.setActive(id)
  chat.setActiveSubject(id, name)
}
</script>

<template>
  <div class="subjects-view">
    <h2>📚 Materias</h2>
    <p class="hint">
      Registra materias conversando con el agente en el Chat (ej.: «Registra la materia Cálculo I»).
      La materia activa se usa para generar preguntas y exámenes.
    </p>

    <div v-if="subjects.loading" class="loading">Cargando…</div>
    <div v-else-if="subjects.subjects.length === 0" class="empty">
      No hay materias registradas todavía.
    </div>
    <ul v-else class="subject-list">
      <li
        v-for="s in subjects.subjects"
        :key="s.id"
        :class="{ active: s.id === subjects.activeSubjectId }"
      >
        <span class="name">{{ s.name }}</span>
        <button
          v-if="s.id !== subjects.activeSubjectId"
          type="button"
          @click="activate(s.id, s.name)"
        >
          Activar
        </button>
        <span v-else class="badge">Activa</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.subjects-view {
  padding: 1.5rem;
  max-width: 720px;
}

.hint {
  color: var(--color-muted);
  font-size: 0.9rem;
}

.subject-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.subject-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.subject-list li.active {
  border-color: var(--color-primary);
}

.badge {
  font-size: 0.8rem;
  color: var(--color-success);
  font-weight: 600;
}

.subject-list button {
  border: 1px solid var(--color-primary);
  background: transparent;
  color: var(--color-primary);
  border-radius: 8px;
  padding: 0.3rem 0.8rem;
  cursor: pointer;
}
</style>
