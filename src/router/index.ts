import { createRouter, createWebHistory } from 'vue-router'
import ChatView from '@/views/ChatView.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'auth',
      component: () => import('@/views/AuthView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      name: 'chat',
      component: ChatView,
    },
    {
      path: '/subjects',
      name: 'subjects',
      component: () => import('@/views/SubjectsView.vue'),
    },
    {
      path: '/bank',
      name: 'bank',
      component: () => import('@/views/BankView.vue'),
    },
    {
      path: '/exams',
      name: 'exams',
      component: () => import('@/views/ExamsView.vue'),
    },
    {
      path: '/material',
      name: 'material',
      component: () => import('@/views/MaterialView.vue'),
    },
  ],
})

// Auth guard: every route except /login requires an authenticated professor.
router.beforeEach((to) => {
  const auth = useAuthStore()
  if (to.meta.public) {
    if (auth.isAuthenticated && to.name === 'auth') return { name: 'chat' }
    return true
  }
  if (!auth.isAuthenticated) {
    return { name: 'auth', query: { redirect: to.fullPath } }
  }
  return true
})

export default router
