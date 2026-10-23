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
    throw await parseError(response)
  }
  return (await response.json()) as T
}

export { API_URL, SCHEMA_VERSION }
