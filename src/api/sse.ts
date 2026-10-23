/** SSE client for the chat: consumes POST /api/chat/stream with fetch-stream.
 *
 * Native EventSource doesn't support POST, so we use fetch + ReadableStream
 * and parse the `event:`/`data:` frames manually.
 */
import type { ChatEvent } from '@/types/events'
import { API_URL, getAuthToken } from '@/api/env'

export interface ChatStreamOptions {
  message: string
  threadId: string
  subjectId?: string | null
  subjectName?: string | null
  signal?: AbortSignal
}

interface RawSSEFrame {
  event: string
  data: string
}

function parseSSEBuffer(buffer: string): { frames: RawSSEFrame[]; rest: string } {
  const frames: RawSSEFrame[] = []
  const parts = buffer.split('\n\n')
  const rest = parts.pop() ?? ''
  for (const part of parts) {
    // Heartbeat comment frames (": ping") have no data lines and are
    // dropped here: they only keep the connection warm.
    let event = 'message'
    const dataLines: string[] = []
    for (const line of part.split('\n')) {
      if (line.startsWith('event:')) {
        event = line.slice(6).trim()
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim())
      }
    }
    if (dataLines.length > 0) {
      frames.push({ event, data: dataLines.join('\n') })
    }
  }
  return { frames, rest }
}

export async function* chatStream(options: ChatStreamOptions): AsyncGenerator<ChatEvent> {
  const { message, threadId, subjectId, subjectName, signal } = options
  const response = await fetch(`${API_URL}/api/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      thread_id: threadId,
      subject_id: subjectId ?? null,
      subject_name: subjectName ?? null,
      // SSE POST: the JWT travels in the body (browser fetch cannot always
      // attach an Authorization header to EventSource-style streams).
      token: getAuthToken(),
    }),
    signal,
  })
  if (!response.ok || !response.body) {
    throw new Error(`Stream error: ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const { frames, rest } = parseSSEBuffer(buffer)
    buffer = rest
    for (const frame of frames) {
      try {
        const data = JSON.parse(frame.data) as ChatEvent
        yield data
      } catch {
        // invalid frame: ignore
      }
    }
  }
}
