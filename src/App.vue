<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useChatStore } from '@/stores/chat'
import { useSubjectsStore } from '@/stores/subjects'
import { onMounted } from 'vue'
import { setLocale, type Locale } from '@/i18n'

const { t, locale } = useI18n()
const chat = useChatStore()
const subjects = useSubjectsStore()

const locales: { value: Locale; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
]

function switchLocale(value: Locale) {
  setLocale(value)
}

onMounted(() => {
  subjects.fetch().catch(() => {
    // no backend connection: the view will show the empty state
  })
})
</script>

<template>
  <div class="app-layout">
    <aside class="sidebar">
      <div class="sidebar-brand">
        <h1>🎓 {{ t('app.title') }}</h1>
      </div>
      <nav class="sidebar-nav">
        <RouterLink to="/" class="nav-item">💬 {{ t('app.nav.chat') }}</RouterLink>
        <RouterLink to="/subjects" class="nav-item">📚 {{ t('app.nav.subjects') }}</RouterLink>
        <RouterLink to="/bank" class="nav-item">📝 {{ t('app.nav.bank') }}</RouterLink>
        <RouterLink to="/exams" class="nav-item">📄 {{ t('app.nav.exams') }}</RouterLink>
        <RouterLink to="/material" class="nav-item">📁 {{ t('app.nav.material') }}</RouterLink>
      </nav>
      <div class="sidebar-footer">
        <span class="active-subject" v-if="chat.activeSubjectName">
          {{ t('app.activeSubject') }}: <strong>{{ chat.activeSubjectName }}</strong>
        </span>
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
      </div>
    </aside>
    <main class="main-view">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: 220px;
  background: var(--color-sidebar);
  color: var(--color-sidebar-text);
  display: flex;
  flex-direction: column;
  padding: 1rem 0.75rem;
}

.sidebar-brand h1 {
  font-size: 1.05rem;
  margin: 0 0 1.25rem;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.nav-item {
  color: var(--color-sidebar-text);
  text-decoration: none;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.95rem;
}

.nav-item.router-link-active {
  background: var(--color-sidebar-active);
  font-weight: 600;
}

.sidebar-footer {
  margin-top: auto;
  font-size: 0.8rem;
  opacity: 0.85;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.locale-switch {
  display: flex;
  gap: 0.25rem;
}

.locale-switch button {
  flex: 1;
  padding: 0.25rem 0;
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

.main-view {
  flex: 1;
  overflow: hidden;
  background: var(--color-bg);
  display: flex;
  flex-direction: column;
}
</style>
