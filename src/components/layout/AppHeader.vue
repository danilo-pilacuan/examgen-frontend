<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { RouterLink, RouterView } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useSubjectsStore } from '@/stores/subjects'
import { useChatStore } from '@/stores/chat'
import { useMaterialStore } from '@/stores/material'
import { useBankStore } from '@/stores/bank'
import { useExamsStore } from '@/stores/exams'
import { apiFetch } from '@/api/http'
import { setLocale, type Locale } from '@/i18n'

const { t, locale } = useI18n()
const auth = useAuthStore()
const subjects = useSubjectsStore()
const chat = useChatStore()
const material = useMaterialStore()
const bank = useBankStore()
const exams = useExamsStore()

const locales: { value: Locale; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
]

const showNewSubject = ref(false)
const newSubjectName = ref('')
const creating = ref(false)

const activeSubject = computed(() => subjects.activeSubject)

function switchLocale(value: Locale) {
  setLocale(value)
}

/** Reactive context: changing the subject selector updates the whole app. */
function onSubjectChange(event: Event) {
  const id = (event.target as HTMLSelectElement).value || null
  const subject = subjects.subjects.find((s) => s.id === id) ?? null
  subjects.setActive(id)
  chat.setActiveSubject(id, subject?.name ?? null)
  // Refresh the reactive panels that depend on the subject.
  if (id) {
    bank.fetch(id).catch(() => {})
    material.fetch(id).catch(() => {})
    exams.fetch(id).catch(() => {})
  } else {
    bank.questions = []
    material.chunks = []
    exams.exams = []
  }
}

async function createSubject() {
  const name = newSubjectName.value.trim()
  if (!name || creating.value) return
  creating.value = true
  try {
    const created = await apiFetch<{ id: string; name: string }>('/subjects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
    await subjects.fetch()
    // Activate the freshly created subject (reactive context switch).
    subjects.setActive(created.id)
    chat.setActiveSubject(created.id, created.name)
    newSubjectName.value = ''
    showNewSubject.value = false
  } catch {
    // keep the form open on failure
  } finally {
    creating.value = false
  }
}

function logout() {
  auth.logout()
  chat.reset()
  subjects.setActive(null)
  chat.setActiveSubject(null, null)
  window.location.href = '/login'
}

// Fetch subjects once the session is restored (avoids the 401 race with
// auth.bootstrap(), which validates the stored token asynchronously).
watch(
  () => auth.isAuthenticated,
  (authenticated) => {
    if (authenticated) subjects.fetch().catch(() => {})
  },
  { immediate: true },
)

onMounted(() => {
  if (auth.isAuthenticated) {
    subjects.fetch().catch(() => {})
  }
})
</script>

<template>
  <div class="app-layout">
    <header class="app-header">
      <div class="brand">
        <h1>🎓 {{ t('app.title') }}</h1>
      </div>

      <nav class="main-nav" aria-label="Main">
        <RouterLink to="/" class="nav-item">💬 {{ t('app.nav.chat') }}</RouterLink>
        <RouterLink to="/bank" class="nav-item">📝 {{ t('app.nav.bank') }}</RouterLink>
        <RouterLink to="/exams" class="nav-item">📄 {{ t('app.nav.exams') }}</RouterLink>
        <RouterLink to="/material" class="nav-item">📁 {{ t('app.nav.material') }}</RouterLink>
        <RouterLink to="/subjects" class="nav-item">📚 {{ t('app.nav.subjects') }}</RouterLink>
      </nav>

      <div class="header-right">
        <div class="subject-picker" :title="t('app.activeSubject')">
          <label for="subject-select">📚</label>
          <select
            id="subject-select"
            :value="subjects.activeSubjectId ?? ''"
            @change="onSubjectChange"
          >
            <option value="">— {{ t('app.selectSubject') }} —</option>
            <option v-for="s in subjects.subjects" :key="s.id" :value="s.id">
              {{ s.name }}
            </option>
          </select>
          <button
            type="button"
            class="add-subject"
            :title="t('subjects.new')"
            @click="showNewSubject = !showNewSubject"
          >
            +
          </button>
        </div>

        <div class="locale-switch" role="group" aria-label="Language">
          <button
            v-for="l in locales"
            :key="l.value"
            type="button"
            :class="{ active: locale === l.value }"
            @click="switchLocale(l.value)"
          >
            {{ l.label }}
          </button>
        </div>

        <div class="user-menu">
          <span class="user-name" :title="auth.user?.email">
            👤 {{ auth.user?.name ?? '' }}
          </span>
          <button type="button" class="logout" @click="logout">{{ t('auth.logout') }}</button>
        </div>
      </div>
    </header>

    <div v-if="showNewSubject" class="new-subject-bar">
      <form @submit.prevent="createSubject">
        <input
          v-model="newSubjectName"
          type="text"
          :placeholder="t('subjects.placeholder')"
          required
        />
        <button type="submit" :disabled="creating || !newSubjectName.trim()">
          {{ creating ? t('subjects.creating') : t('subjects.register') }}
        </button>
        <button type="button" class="ghost" @click="showNewSubject = false">
          {{ t('subjects.cancel') }}
        </button>
      </form>
    </div>

    <div v-if="activeSubject" class="context-bar">
      <span class="chip">
        {{ t('app.activeSubject') }}: <strong>{{ activeSubject.name }}</strong>
      </span>
      <span class="chip muted">{{ bank.questions.length }} {{ t('app.questionsChip') }}</span>
      <span class="chip muted">{{ material.chunks.length }} {{ t('app.chunksChip') }}</span>
    </div>

    <main class="main-view">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 0.5rem 1rem;
  background: var(--color-sidebar);
  color: var(--color-sidebar-text);
  flex-wrap: wrap;
}

.brand h1 {
  font-size: 1rem;
  margin: 0;
  white-space: nowrap;
}

.main-nav {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.nav-item {
  color: var(--color-sidebar-text);
  text-decoration: none;
  padding: 0.4rem 0.7rem;
  border-radius: 8px;
  font-size: 0.9rem;
  white-space: nowrap;
}

.nav-item.router-link-active {
  background: var(--color-sidebar-active);
  font-weight: 600;
}

.header-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.subject-picker {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: var(--color-sidebar-active);
  border-radius: 8px;
  padding: 0.25rem 0.5rem;
}

.subject-picker select {
  background: transparent;
  color: var(--color-sidebar-text);
  border: none;
  font-size: 0.88rem;
  max-width: 220px;
  cursor: pointer;
}

.subject-picker select option {
  color: var(--color-text);
  background: var(--color-surface);
}

.add-subject {
  border: none;
  background: transparent;
  color: var(--color-sidebar-text);
  font-size: 1rem;
  cursor: pointer;
  padding: 0 0.25rem;
}

.locale-switch {
  display: flex;
  gap: 0.25rem;
}

.locale-switch button {
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-sidebar-text);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.75rem;
}

.locale-switch button.active {
  background: var(--color-sidebar-active);
  font-weight: 600;
}

.user-menu {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.user-name {
  font-size: 0.85rem;
  white-space: nowrap;
}

.logout {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-sidebar-text);
  border-radius: 6px;
  padding: 0.25rem 0.6rem;
  cursor: pointer;
  font-size: 0.8rem;
}

.new-subject-bar {
  padding: 0.5rem 1rem;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.new-subject-bar form {
  display: flex;
  gap: 0.5rem;
  max-width: 560px;
}

.new-subject-bar input {
  flex: 1;
  padding: 0.4rem 0.7rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.new-subject-bar button {
  padding: 0.4rem 0.9rem;
  border: none;
  border-radius: 8px;
  background: var(--color-primary);
  color: var(--color-primary-contrast);
  cursor: pointer;
}

.new-subject-bar button.ghost {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-muted);
}

.context-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 1rem;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  font-size: 0.82rem;
}

.chip {
  padding: 0.15rem 0.6rem;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.08);
  color: var(--color-primary);
}

.chip.muted {
  background: rgba(100, 116, 139, 0.08);
  color: var(--color-muted);
}

.main-view {
  flex: 1;
  overflow-y: auto; /* scroll vertical para vistas que exceden el viewport (BUG-17) */
  background: var(--color-bg);
  display: flex;
  flex-direction: column;
  min-height: 0;
}
</style>
