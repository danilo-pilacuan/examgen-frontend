<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import { useSubjectsStore } from '@/stores/subjects'
import { onMounted } from 'vue'

const chat = useChatStore()
const subjects = useSubjectsStore()

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
        <h1>🎓 Exam Generator</h1>
      </div>
      <nav class="sidebar-nav">
        <RouterLink to="/" class="nav-item">💬 Chat</RouterLink>
        <RouterLink to="/subjects" class="nav-item">📚 Subjects</RouterLink>
        <RouterLink to="/bank" class="nav-item">📝 Bank</RouterLink>
        <RouterLink to="/exams" class="nav-item">📄 Exams</RouterLink>
        <RouterLink to="/material" class="nav-item">📁 Material</RouterLink>
      </nav>
      <div class="sidebar-footer">
        <span class="active-subject" v-if="chat.activeSubjectName">
          Active subject: <strong>{{ chat.activeSubjectName }}</strong>
        </span>
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
}

.main-view {
  flex: 1;
  overflow: hidden;
  background: var(--color-bg);
  display: flex;
  flex-direction: column;
}
</style>
