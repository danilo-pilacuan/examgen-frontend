/** Cliente REST: fetch wrapper con error handling.
 *
 * Único punto que conoce la URL del backend (VITE_API_URL).
 */
import { SCHEMA_VERSION } from '@/types/events'

const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function parseError(response: Response): Promise<never> {
  let detail = response.statusText
  try {
    const body = await response.json()
    if (body && typeof body.detail === 'string') detail = body.detail
  } catch {
    // respuesta sin JSON
  }
  throw new ApiError(response.status, detail)
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
    },
  })
  if (!response.ok) {
    throw await parseError(response)
  }
  return (await response.json()) as T
}

export { API_URL, SCHEMA_VERSION }
