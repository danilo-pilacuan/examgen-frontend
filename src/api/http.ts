/** REST client: fetch wrapper with error handling.
 *
 * Single point that knows the backend URL (see api/env.ts).
 */
import { SCHEMA_VERSION } from '@/types/events'
import { API_URL } from '@/api/env'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/** JWT of the current session (injected by the auth store). */
let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

export function getAuthToken(): string | null {
  return authToken
}

/** Re-reads the token persisted in localStorage (auth store `mvp_auth`).
 * Guards against races where a request leaves before the store has
 * restored the token (BUG-016), and feeds the 401 single retry (RFC-12). */
function storedToken(): string | null {
  try {
    const raw = localStorage.getItem('mvp_auth')
    if (!raw) return null
    const parsed = JSON.parse(raw) as { token?: string }
    return typeof parsed?.token === 'string' && parsed.token ? parsed.token : null
  } catch {
    return null
  }
}

/** True when the stored JWT has not expired yet (payload `exp`, seconds). */
export function storedTokenUnexpired(): boolean {
  const token = storedToken() ?? authToken
  if (!token) return false
  try {
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { exp?: number }
    if (typeof payload.exp !== 'number') return true
    return payload.exp * 1000 > Date.now()
  } catch {
    // Undecodable token: assume it may still be valid.
    return true
  }
}

async function parseError(response: Response): Promise<never> {
  let detail = response.statusText
  try {
    const body = await response.json()
    if (body && typeof body.detail === 'string') detail = body.detail
  } catch {
    // response without JSON
  }
  throw new ApiError(response.status, friendlyHttpMessage(response.status, detail))
}

/** Maps raw HTTP statuses to actionable messages (BUG-12/ISS-07). */
export function friendlyHttpMessage(status: number, detail: string): string {
  if (status === 413) {
    return 'El archivo supera el tamaño máximo (100 MB). Divide el material en capítulos o archivos más pequeños.'
  }
  if (status === 401) {
    return 'Tu sesión expiró. Vuelve a iniciar sesión.'
  }
  if (status === 403) {
    return 'No tienes permisos sobre este recurso.'
  }
  return detail
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...((options.headers as Record<string, string>) ?? {}),
  }
  if (authToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${authToken}`
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })
  if (!response.ok) {
    // BUG-016 (RFC-12): the backend may briefly reject requests right after
    // an exam_app restart while the stored JWT is still valid. Retry once
    // with the token freshly re-read from localStorage; if it fails again
    // (or the token is expired) propagate the friendly 401 as before.
    if (response.status === 401 && storedTokenUnexpired()) {
      const retryToken = storedToken()
      if (retryToken && retryToken !== authToken) {
        authToken = retryToken
      }
      const retryHeaders: Record<string, string> = {
        Accept: 'application/json',
        ...((options.headers as Record<string, string>) ?? {}),
      }
      if (authToken && !retryHeaders['Authorization']) {
        retryHeaders['Authorization'] = `Bearer ${authToken}`
      }
      const retry = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: retryHeaders,
      })
      if (retry.ok) {
        return (await retry.json()) as T
      }
      throw await parseError(retry)
    }
    throw await parseError(response)
  }
  return (await response.json()) as T
}

export { API_URL, SCHEMA_VERSION }
