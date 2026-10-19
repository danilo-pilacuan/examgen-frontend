/** Backend URL resolution (API + WS).
 *
 * Priority order:
 *   1. `window.__ENV__` (env.js generated at runtime by the container).
 *   2. `import.meta.env.VITE_*` (build variables / .env.development).
 *   3. Development defaults (localhost:8000).
 *
 * In dev with the Vite proxy active, relative routes are used (same origin),
 * so there is no CORS and nothing needs to be configured.
 */
interface RuntimeEnv {
  VITE_API_URL?: string
  VITE_WS_URL?: string
}

declare global {
  interface Window {
    __ENV__?: RuntimeEnv
  }
}

function resolveApiUrl(): string {
  const runtime = window.__ENV__?.VITE_API_URL
  if (runtime) return runtime
  const build = import.meta.env.VITE_API_URL
  if (build) return build
  // Dev: use the Vite proxy (same origin).
  return ''
}

function resolveWsUrl(): string {
  const runtime = window.__ENV__?.VITE_WS_URL
  if (runtime) return runtime
  const build = import.meta.env.VITE_WS_URL
  if (build) return build
  // Dev: WS through the Vite proxy (same origin, protocol according to page).
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/ws`
}

export const API_URL = resolveApiUrl()
export const WS_URL = resolveWsUrl()

// Re-export so SSE/WS clients can pull the token from a single module.
export { getAuthToken } from '@/api/http'
