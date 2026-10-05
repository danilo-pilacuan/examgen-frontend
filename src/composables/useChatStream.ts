import { ref } from 'vue'
import { chatStream } from '@/api/sse'
import type { ChatEvent } from '@/types/events'

/**
 * Chat composable: consumes the SSE stream and exposes the streaming state.
 * Events are delegated to the chat store via callbacks.
 */
export interface UseChatStreamOptions {
  onEvent: (event: ChatEvent) => void
  onError?: (error: Error) => void
}

export function useChatStream(options: UseChatStreamOptions) {
  const streaming = ref(false)
  const abortController = ref<AbortController | null>(null)

  async function send(sendOptions: {
    message: string
    threadId: string
    subjectId?: string | null
    subjectName?: string | null
  }) {
    streaming.value = true
    abortController.value = new AbortController()
    try {
      for await (const event of chatStream({
        ...sendOptions,
        signal: abortController.value?.signal,
      })) {
        options.onEvent(event)
      }
    } catch (error) {
      options.onError?.(error as Error)
    } finally {
      streaming.value = false
      abortController.value = null
    }
  }

  function stop() {
    abortController.value?.abort()
    abortController.value = null
    streaming.value = false
  }

  return { streaming, send, stop }
}
