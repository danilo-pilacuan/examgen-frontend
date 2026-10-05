<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useBankStore } from '@/stores/bank'
import { useSubjectsStore } from '@/stores/subjects'
import type { Question } from '@/types/domain'

const bank = useBankStore()
const subjects = useSubjectsStore()

const selected = ref<Question | null>(null)

onMounted(() => {
  subjects.fetch().catch(() => {})
})

watch(
  () => subjects.activeSubjectId,
  (id) => {
    selected.value = null
    if (id) bank.fetch(id).catch(() => {})
    else bank.questions = []
  },
  { immediate: true },
)

async function toggleVerification(q: Question) {
  try {
    await bank.setHumanVerification(q.id, !q.verified_by_human)
  } catch {
    // sin conexión: ignorar silenciosamente
  }
}
</script>

<template>
  <div class="bank-view">
    <h2>📝 Banco de preguntas</h2>

    <div v-if="!subjects.activeSubjectId" class="empty">
      Activa una materia primero (vista Materias).
    </div>
    <div v-else-if="bank.loading" class="loading">Cargando…</div>
    <div v-else-if="bank.questions.length === 0" class="empty">
      No hay preguntas para esta materia. Genera algunas desde el Chat.
    </div>
    <table v-else class="question-table">
      <thead>
        <tr>
          <th>Tema</th>
          <th>Tipo</th>
          <th>Bloom</th>
          <th>Dificultad</th>
          <th>Verificada</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="q in bank.questions"
          :key="q.id"
          :class="{ selected: selected?.id === q.id }"
          @click="selected = q"
        >
          <td>{{ q.topic }}</td>
          <td>{{ q.question_type ?? '—' }}</td>
          <td>{{ q.bloom_level }}</td>
          <td>{{ q.difficulty }}</td>
          <td>
            <span :class="q.verified_by_human ? 'ok' : 'warn'">
              {{ q.verified_by_human ? '✔ Humana' : 'Pendiente' }}
            </span>
          </td>
          <td>
            <button type="button" @click.stop="toggleVerification(q)">
              {{ q.verified_by_human ? 'Quitar' : 'Verificar' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="selected" class="detail">
      <h3>Detalle</h3>
      <p><strong>Enunciado:</strong> {{ selected.question_text }}</p>
      <ul v-if="selected.options">
        <li v-for="(opt, i) in selected.options" :key="i" :class="{ correct: opt.is_correct }">
          {{ opt.text }} <span v-if="opt.is_correct">✔</span>
        </li>
      </ul>
      <p v-if="selected.expected_answer">
        <strong>Respuesta esperada:</strong> {{ selected.expected_answer }}
      </p>
      <p v-if="selected.solution_explanation">
        <strong>Explicación:</strong> {{ selected.solution_explanation }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.bank-view {
  padding: 1.5rem;
}

.question-table {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-surface);
  border-radius: 10px;
  overflow: hidden;
}

.question-table th,
.question-table td {
  padding: 0.6rem 0.8rem;
  border-bottom: 1px solid var(--color-border);
  text-align: left;
  font-size: 0.9rem;
}

.question-table tbody tr {
  cursor: pointer;
}

.question-table tbody tr.selected {
  background: rgba(37, 99, 235, 0.08);
}

.ok {
  color: var(--color-success);
}

.warn {
  color: var(--color-warning);
}

.detail {
  margin-top: 1.5rem;
  padding: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.detail ul {
  padding-left: 1.25rem;
}

.correct {
  color: var(--color-success);
  font-weight: 600;
}

.empty,
.loading {
  color: var(--color-muted);
  padding: 1rem 0;
}
</style>
