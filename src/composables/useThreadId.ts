/** thread_id management: server-backed conversation registry (DEC-004 a).
 *
 * The list now comes from GET /api/chat/threads (chat_threads table, per
 * user) instead of localStorage, so conversations are visible from any
 * browser/device of the same user (BUG-023) and are isolated per user
 * (BUG-022). Badges: pinned title, last subject used, message count.
 */
import { ref } from 'vue'
import { apiFetch } from '@/api/http'

export interface ChatThreadMeta {
  threadId: string
  title: string
  lastSubjectId: string | null
  lastSubjectName: string | null
  messageCount: number
  createdAt: string
  updatedAt: string
}

interface ThreadOutRaw {
  thread_id: string
  title: string
  last_subject_id: string | null
  last_subject_name: string | null
  message_count: number
  created_at: string
  updated_at: string
}

function fromRaw(r: ThreadOutRaw): ChatThreadMeta {
  return {
    threadId: r.thread_id,
    title: r.title,
    lastSubjectId: r.last_subject_id,
    lastSubjectName: r.last_subject_name,
    messageCount: r.message_count,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

// Shared state across all instances of the composable (singleton).
const threads = ref<ChatThreadMeta[]>([])
const currentThreadId = ref<string | null>(null)
const loaded = ref(false)

async function refresh(): Promise<void> {
  try {
    const data = await apiFetch<ThreadOutRaw[]>('/api/chat/threads')
    threads.value = (data ?? []).map(fromRaw)
    loaded.value = true
    // Keep the current selection valid; default to the most recent thread.
    if (
      currentThreadId.value &&
      !threads.value.some((t) => t.threadId === currentThreadId.value)
    ) {
      currentThreadId.value = null
    }
    if (!currentThreadId.value) {
      currentThreadId.value = threads.value[0]?.threadId ?? null
    }
  } catch {
    // Backend unavailable: keep whatever we have (empty on first load).
  }
}

function invalidate(): void {
  // Called on logout/login so one user's list never leaks into another's.
  threads.value = []
  currentThreadId.value = null
  loaded.value = false
}

export function useThreadId() {
  async function ensureLoaded(): Promise<void> {
    if (!loaded.value) await refresh()
  }

  function createThread(title: string): ChatThreadMeta {
    // Optimistic local entry; the server row is created on the first turn
    // (register_or_adopt) with this same thread_id.
    const now = new Date().toISOString()
    const thread: ChatThreadMeta = {
      threadId: crypto.randomUUID(),
      title,
      lastSubjectId: null,
      lastSubjectName: null,
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
    }
    threads.value = [thread, ...threads.value]
    currentThreadId.value = thread.threadId
    return thread
  }

  function selectThread(threadId: string | null) {
    currentThreadId.value = threadId
  }

  async function removeThread(threadId: string): Promise<void> {
    try {
      await apiFetch(`/api/chat/threads/${encodeURIComponent(threadId)}`, {
        method: 'DELETE',
      })
    } catch {
      // 404 (already gone) or offline: drop locally anyway.
    }
    threads.value = threads.value.filter((t) => t.threadId !== threadId)
    if (currentThreadId.value === threadId) {
      currentThreadId.value = threads.value[0]?.threadId ?? null
    }
  }

  /** Pinned rename via PATCH; optimistic local update keeps the UI responsive. */
  async function renameThread(threadId: string, title: string): Promise<void> {
    const thread = threads.value.find((t) => t.threadId === threadId)
    if (thread) thread.title = title
    try {
      await apiFetch(`/api/chat/threads/${encodeURIComponent(threadId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
    } catch {
      // Offline: the optimistic title stays until the next refresh.
    }
  }

  /** Updates badge metadata locally after a turn (server is source of truth). */
  function touchThread(
    threadId: string,
    opts: { title?: string; subjectId?: string | null; subjectName?: string | null; addMessages?: number } = {},
  ) {
    const thread = threads.value.find((t) => t.threadId === threadId)
    if (!thread) return
    if (opts.title && thread.messageCount === 0) {
      // Only the first turn sets the pinned title of a fresh thread.
      thread.title = opts.title
    }
    if (opts.subjectId !== undefined) thread.lastSubjectId = opts.subjectId
    if (opts.subjectName !== undefined) thread.lastSubjectName = opts.subjectName
    thread.messageCount += opts.addMessages ?? 0
    thread.updatedAt = new Date().toISOString()
    // Move to the front (most recent first).
    threads.value = [thread, ...threads.value.filter((t) => t.threadId !== thread.threadId)]
  }

  return {
    threads,
    currentThreadId,
    loaded,
    ensureLoaded,
    refresh,
    invalidate,
    createThread,
    selectThread,
    removeThread,
    renameThread,
    touchThread,
  }
}
