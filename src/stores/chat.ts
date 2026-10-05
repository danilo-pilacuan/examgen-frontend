/** Store del chat: mensajes, thread_id, estado de streaming, eventos de tools. */
import { defineStore } from 'pinia'
import { apiFetch } from '@/api/http'
import type { ChatEvent } from '@/types/events'
import type { GeneratedItem } from '@/types/domain'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  events: ChatEvent[]
  streaming?: boolean
}

export interface UploadResult {
  chunks_indexed: number
  filename: string
}

interface ChatState {
  messages: ChatMessage[]
  threadId: string | null
  streaming: boolean
  activeSubjectId: string | null
  activeSubjectName: string | null
  pendingQuestion: GeneratedItem | null
  lastEventLabel: string | null
  uploading: boolean
  lastUpload: UploadResult | null
}

let messageSeq = 0

function nextMessageId(): string {
  messageSeq += 1
  return `msg-${Date.now()}-${messageSeq}`
}

const EVENT_LABELS: Record<string, string> = {
  tool_start: 'Ejecutando herramienta…',
  tool_end: 'Herramienta completada',
  question_generated: 'Pregunta generada',
  questions_listed: 'Preguntas listadas',
  artifact_ready: 'Artefacto listo para descargar',
  material_indexed: 'Material indexado',
  question_saved: 'Pregunta guardada',
  subject_registered: 'Materia registrada',
  cancelled: 'Cancelado',
  error: 'Error',
}

export const useChatStore = defineStore('chat', {
  state: (): ChatState => ({
    messages: [],
    threadId: null,
    streaming: false,
    activeSubjectId: null,
    activeSubjectName: null,
    pendingQuestion: null,
    lastEventLabel: null,
    uploading: false,
    lastUpload: null,
  }),
  getters: {
    activeSubjectName(state): string | null {
      return state.activeSubjectName
    },
  },
  actions: {
    pushUserMessage(content: string) {
      this.messages.push({ id: nextMessageId(), role: 'user', content, events: [] })
    },
    pushAssistantPlaceholder(): string {
      const id = nextMessageId()
      this.messages.push({ id, role: 'assistant', content: '', events: [], streaming: true })
      return id
    },
    appendToMessage(id: string, delta: string) {
      const msg = this.messages.find((m) => m.id === id)
      if (msg) msg.content += delta
    },
    appendEventToMessage(id: string, event: ChatEvent) {
      const msg = this.messages.find((m) => m.id === id)
      if (msg) msg.events.push(event)
      this.lastEventLabel = EVENT_LABELS[event.type] ?? event.type
      if (event.type === 'question_generated') {
        const q = event.payload.question
        if (q) this.pendingQuestion = q
      }
    },
    finishMessage(id: string) {
      const msg = this.messages.find((m) => m.id === id)
      if (msg) msg.streaming = false
    },
    setStreaming(streaming: boolean) {
      this.streaming = streaming
      if (!streaming) this.lastEventLabel = null
    },
    setActiveSubject(id: string | null, name: string | null) {
      this.activeSubjectId = id
      this.activeSubjectName = name
    },
    clearPendingQuestion() {
      this.pendingQuestion = null
    },
    async uploadFile(file: File) {
      this.uploading = true
      this.lastUpload = null
      try {
        const form = new FormData()
        form.append('file', file)
        if (this.activeSubjectId) form.append('subject_id', this.activeSubjectId)
        if (this.activeSubjectName) form.append('subject_name', this.activeSubjectName)
        this.lastUpload = await apiFetch<UploadResult>('/api/files', {
          method: 'POST',
          body: form,
        })
      } finally {
        this.uploading = false
      }
    },
    reset() {
      this.messages = []
      this.threadId = null
      this.streaming = false
      this.pendingQuestion = null
      this.lastEventLabel = null
      this.lastUpload = null
    },
    loadThread(threadId: string) {
      this.threadId = threadId
      this.messages = []
      this.pendingQuestion = null
      this.lastEventLabel = null
    },
  },
})
