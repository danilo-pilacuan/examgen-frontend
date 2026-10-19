/** Auth store: JWT session, current user, login/register/logout. */
import { defineStore } from 'pinia'
import { apiFetch, setAuthToken } from '@/api/http'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: string
}

interface TokenResponse {
  access_token: string
  token_type: string
  user: AuthUser
}

const STORAGE_KEY = 'mvp_auth'

interface StoredAuth {
  token: string
  user: AuthUser
}

function loadStored(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredAuth
    if (parsed?.token && parsed?.user) return parsed
    return null
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', {
  state: () => {
    const stored = loadStored()
    // Restore the Authorization header synchronously at store creation so
    // components that fetch on setup (before App's onMounted) already
    // include the Bearer token.
    if (stored?.token) setAuthToken(stored.token)
    return {
      token: stored?.token ?? null,
      user: stored?.user ?? null,
      loading: false,
      error: null as string | null,
    }
  },
  getters: {
    isAuthenticated: (state) => state.token !== null,
  },
  actions: {
    _persist() {
      if (this.token && this.user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: this.token, user: this.user }))
        setAuthToken(this.token)
      } else {
        localStorage.removeItem(STORAGE_KEY)
        setAuthToken(null)
      }
    },
    async bootstrap() {
      // Validate the stored session against the backend (expired token → logout).
      if (this.token && this.user) {
        try {
          this.user = await apiFetch<AuthUser>('/auth/me')
          this._persist()
        } catch {
          this.logout()
        }
      }
    },
    async login(email: string, password: string) {
      this.loading = true
      this.error = null
      try {
        const res = await apiFetch<TokenResponse>('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        this.token = res.access_token
        this.user = res.user
        this._persist()
      } catch (e) {
        this.error = e instanceof Error ? e.message : 'Login failed'
        throw e
      } finally {
        this.loading = false
      }
    },
    async register(email: string, name: string, password: string) {
      this.loading = true
      this.error = null
      try {
        const res = await apiFetch<TokenResponse>('/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name, password }),
        })
        this.token = res.access_token
        this.user = res.user
        this._persist()
      } catch (e) {
        this.error = e instanceof Error ? e.message : 'Registration failed'
        throw e
      } finally {
        this.loading = false
      }
    },
    logout() {
      this.token = null
      this.user = null
      this._persist()
    },
  },
})
