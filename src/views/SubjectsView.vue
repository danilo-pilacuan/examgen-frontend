<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useSubjectsStore } from '@/stores/subjects'
import { useChatStore } from '@/stores/chat'
import { useMaterialStore } from '@/stores/material'
import { apiFetch } from '@/api/http'

const subjects = useSubjectsStore()
const chat = useChatStore()
const material = useMaterialStore()

const showForm = ref(false)
const newName = ref('')
const creating = ref(false)
const materialFor = ref<string | null>(null)

onMounted(() => {
  subjects.fetch().catch(() => {})
})

function activate(id: string | null, name: string | null) {
  subjects.setActive(id)
  chat.setActiveSubject(id, name)
}

async function create() {
  const name = newName.value.trim()
  if (!name || creating.value) return
  creating.value = true
  try {
    await apiFetch('/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    await subjects.fetch()
    newName.value = ''
    showForm.value = false
  } catch {
    // no connection: keep the form open
  } finally {
    creating.value = false
  }
}

function toggleMaterial(id: string) {
  materialFor.value = materialFor.value === id ? null : id
  if (materialFor.value === id) material.fetch(id).catch(() => {})
}
</script>

<template>
  <div class="subjects-view">
    <div class="header">
      <h2>📚 Subjects</h2>
      <button type="button" class="new" @click="showForm = !showForm">
        {{ showForm ? 'Cancel' : '+ New subject' }}
      </button>
    </div>
    <p class="hint">
      Register subjects here or by chatting with the agent in the Chat. The active subject is used
      to generate questions and exams.
    </p>

    <form v-if="showForm" class="form" @submit.prevent="create">
      <input
        v-model="newName"
        type="text"
        placeholder="Subject name (e.g. Calculus I)"
        required
      />
      <button type="submit" :disabled="creating || !newName.trim()">
        {{ creating ? 'Creating…' : 'Register' }}
      </button>
    </form>

    <div v-if="subjects.loading" class="loading">Loading…</div>
    <div v-else-if="subjects.subjects.length === 0" class="empty">
      No subjects registered yet.
    </div>
    <ul v-else class="subject-list">
      <li
        v-for="s in subjects.subjects"
        :key="s.id"
        :class="{ active: s.id === subjects.activeSubjectId }"
      >
        <div class="row">
          <span class="name">{{ s.name }}</span>
          <div class="actions">
            <button type="button" class="ghost" @click="toggleMaterial(s.id)">
              {{ materialFor === s.id ? 'Hide material' : 'Material' }}
            </button>
            <button
              v-if="s.id !== subjects.activeSubjectId"
              type="button"
              @click="activate(s.id, s.name)"
            >
              Activate
            </button>
            <span v-else class="badge">Active</span>
          </div>
        </div>
        <div v-if="materialFor === s.id" class="material-panel">
          <div v-if="material.loading" class="loading">Loading material…</div>
          <div v-else-if="material.chunks.length === 0" class="empty">
            No indexed material. Upload files from the Chat.
          </div>
          <ul v-else class="chunk-list">
            <li v-for="chunk in material.chunks.slice(0, 5)" :key="chunk.id">
              <strong>{{ chunk.source_file }}</strong>
              <span class="idx">#{{ chunk.chunk_index }}</span>
              <p>{{ chunk.content.slice(0, 200) }}{{ chunk.content.length > 200 ? '…' : '' }}</p>
            </li>
          </ul>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.subjects-view {
  padding: 1.5rem;
  max-width: 720px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.new {
  border: 1px solid var(--color-primary);
  background: transparent;
  color: var(--color-primary);
  border-radius: 8px;
  padding: 0.4rem 0.9rem;
  cursor: pointer;
}

.hint {
  color: var(--color-muted);
  font-size: 0.9rem;
}

.form {
  display: flex;
  gap: 0.5rem;
  margin: 1rem 0;
}

.form input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.form button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 8px;
  background: var(--color-primary);
  color: var(--color-primary-contrast);
  cursor: pointer;
}

.subject-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.subject-list > li {
  padding: 0.75rem 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.subject-list > li.active {
  border-color: var(--color-primary);
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.name {
  font-weight: 500;
}

.actions {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}

.actions button {
  border: 1px solid var(--color-primary);
  background: transparent;
  color: var(--color-primary);
  border-radius: 8px;
  padding: 0.3rem 0.8rem;
  cursor: pointer;
  font-size: 0.85rem;
}

.actions button.ghost {
  border-color: var(--color-border);
  color: var(--color-muted);
}

.badge {
  font-size: 0.8rem;
  color: var(--color-success);
  font-weight: 600;
}

.material-panel {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--color-border);
}

.chunk-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.chunk-list li {
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  font-size: 0.85rem;
}

.idx {
  color: var(--color-muted);
  font-size: 0.75rem;
  margin-left: 0.4rem;
}

.chunk-list p {
  margin: 0.25rem 0 0;
  color: var(--color-muted);
}

.empty,
.loading {
  color: var(--color-muted);
  padding: 0.5rem 0;
  font-size: 0.88rem;
}
</style>
