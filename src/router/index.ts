import { createRouter, createWebHistory } from 'vue-router'
import ChatView from '@/views/ChatView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'chat',
      component: ChatView,
    },
    {
      path: '/materias',
      name: 'materias',
      component: () => import('@/views/SubjectsView.vue'),
    },
    {
      path: '/banco',
      name: 'banco',
      component: () => import('@/views/BankView.vue'),
    },
    {
      path: '/examenes',
      name: 'examenes',
      component: () => import('@/views/ExamsView.vue'),
    },
    {
      path: '/material',
      name: 'material',
      component: () => import('@/views/MaterialView.vue'),
    },
  ],
})

export default router
