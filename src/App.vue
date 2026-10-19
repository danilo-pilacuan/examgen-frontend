<script setup lang="ts">
import { onMounted } from 'vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()

onMounted(() => {
  // Restore the session (token header + /auth/me validation) on first load.
  auth.bootstrap()
})
</script>

<template>
  <AppHeader v-if="auth.isAuthenticated" />
  <main v-else class="auth-shell">
    <RouterView />
  </main>
</template>

<style scoped>
.auth-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>

