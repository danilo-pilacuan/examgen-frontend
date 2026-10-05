/** Gestión de thread_id: persistencia por conversación en localStorage. */
import { ref, watch } from 'vue'

const STORAGE_KEY = 'mvp_chat_threads'

export interface ChatThreadMeta {
  threadId: string
  title: string
  createdAt: string
  updatedAt: string
}

function loadThreads(): ChatThreadMeta[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ChatThreadMeta[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveThreads(threads: ChatThreadMeta[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(threads))
}

// Estado compartido entre todas las instancias del composable (singleton).
const threads = ref<ChatThreadMeta[]>(loadThreads())
const currentThreadId = ref<string | null>(threads.value[0]?.threadId ?? null)

watch(threads, (value) => saveThreads(value), { deep: true })

export function useThreadId() {
  function createThread(title: string): ChatThreadMeta {
    const now = new Date().toISOString()
    const thread: ChatThreadMeta = {
      threadId: crypto.randomUUID(),
      title,
      createdAt: now,
      updatedAt: now,
    }
    threads.value.unshift(thread)
    currentThreadId.value = thread.threadId
    return thread
  }

  function selectThread(threadId: string | null) {
    currentThreadId.value = threadId
  }

  function removeThread(threadId: string) {
    threads.value = threads.value.filter((t) => t.threadId !== threadId)
    if (currentThreadId.value === threadId) {
      currentThreadId.value = threads.value[0]?.threadId ?? null
    }
  }

  function touchThread(threadId: string, title?: string) {
    const thread = threads.value.find((t) => t.threadId === threadId)
    if (thread) {
      thread.updatedAt = new Date().toISOString()
      if (title) thread.title = title
      // Mover al frente (más reciente primero)
      threads.value = [thread, ...threads.value.filter((t) => t.threadId !== thread.threadId)]
    }
  }

  return {
    threads,
    currentThreadId,
    createThread,
    selectThread,
    removeThread,
    touchThread,
  }
}
