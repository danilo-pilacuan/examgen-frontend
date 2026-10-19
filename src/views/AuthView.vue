<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'

const { t } = useI18n()
const router = useRouter()
const auth = useAuthStore()

const mode = ref<'login' | 'register'>('login')
const email = ref('')
const name = ref('')
const password = ref('')

const isLogin = computed(() => mode.value === 'login')
const canSubmit = computed(
  () =>
    email.value.trim().length > 3 &&
    password.value.length >= 6 &&
    (isLogin.value || name.value.trim().length > 0) &&
    !auth.loading,
)

async function submit() {
  if (!canSubmit.value) return
  try {
    if (isLogin.value) {
      await auth.login(email.value.trim(), password.value)
    } else {
      await auth.register(email.value.trim(), name.value.trim(), password.value)
    }
    router.push('/')
  } catch {
    // error shown from the store
  }
}
</script>

<template>
  <div class="auth-view">
    <div class="card">
      <h1>🎓 {{ t('app.title') }}</h1>
      <p class="subtitle">{{ t('auth.subtitle') }}</p>

      <div class="mode-switch" role="tablist">
        <button
          type="button"
          role="tab"
          :aria-selected="isLogin"
          :class="{ active: isLogin }"
          @click="mode = 'login'"
        >
          {{ t('auth.login') }}
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="!isLogin"
          :class="{ active: !isLogin }"
          @click="mode = 'register'"
        >
          {{ t('auth.register') }}
        </button>
      </div>

      <form @submit.prevent="submit">
        <label v-if="!isLogin" class="field">
          <span>{{ t('auth.name') }}</span>
          <input v-model="name" type="text" :placeholder="t('auth.namePlaceholder')" required />
        </label>
        <label class="field">
          <span>{{ t('auth.email') }}</span>
          <input v-model="email" type="email" :placeholder="t('auth.emailPlaceholder')" required />
        </label>
        <label class="field">
          <span>{{ t('auth.password') }}</span>
          <input
            v-model="password"
            type="password"
            :placeholder="t('auth.passwordPlaceholder')"
            minlength="6"
            required
          />
        </label>

        <p v-if="auth.error" class="error">⚠️ {{ auth.error }}</p>

        <button type="submit" class="submit" :disabled="!canSubmit">
          {{ auth.loading ? t('auth.working') : isLogin ? t('auth.login') : t('auth.register') }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.auth-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  padding: 1rem;
}

.card {
  width: 100%;
  max-width: 400px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  padding: 2rem;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.06);
}

h1 {
  font-size: 1.3rem;
  margin: 0 0 0.25rem;
}

.subtitle {
  color: var(--color-muted);
  font-size: 0.9rem;
  margin: 0 0 1.25rem;
}

.mode-switch {
  display: flex;
  gap: 0.25rem;
  background: rgba(0, 0, 0, 0.04);
  border-radius: 10px;
  padding: 0.25rem;
  margin-bottom: 1.25rem;
}

.mode-switch button {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0.45rem 0;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--color-muted);
}

.mode-switch button.active {
  background: var(--color-surface);
  color: var(--color-text);
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.field span {
  font-size: 0.82rem;
  color: var(--color-muted);
  font-weight: 500;
}

.field input {
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.95rem;
}

.error {
  color: var(--color-danger);
  font-size: 0.85rem;
  margin: 0;
}

.submit {
  padding: 0.6rem;
  border: none;
  border-radius: 8px;
  background: var(--color-primary);
  color: var(--color-primary-contrast);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
}

.submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
