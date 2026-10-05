/** Cliente WS con reconexión automática (backoff exponencial). */
import type { ChatEvent } from '@/types/events'

const WS_URL: string = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000/ws'

export type WSMessage = { type: 'cancel'; thread_id: string } | { type: 'ping'; thread_id?: string }

export interface WSClientOptions {
  onEvent: (event: ChatEvent) => void
}

export class WSClient {
  private ws: WebSocket | null = null
  private retries = 0
  private readonly maxRetries: number
  private readonly baseDelayMs: number
  private reconnectTimer: number | null = null

  constructor(
    private readonly options: WSClientOptions,
    maxRetries = 8,
    baseDelayMs = 500,
  ) {
    this.maxRetries = maxRetries
    this.baseDelayMs = baseDelayMs
  }

  connect(): void {
    if (this.reconnectTimer !== null) return
    this.ws = new WebSocket(WS_URL)
    this.ws.onopen = () => {
      this.retries = 0
    }
    this.ws.onmessage = (ev: MessageEvent) => {
      try {
        const data = JSON.parse(ev.data as string) as ChatEvent
        this.options.onEvent(data)
      } catch {
        // frame inválido: ignorar
      }
    }
    this.ws.onclose = () => {
      this.ws = null
      this.scheduleReconnect()
    }
    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null || this.retries >= this.maxRetries) return
    const delay = this.baseDelayMs * 2 ** this.retries
    this.retries += 1
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  send(message: WSMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  close(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.ws = null
  }
}
