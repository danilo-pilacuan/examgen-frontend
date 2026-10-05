/**
 * Tipos de eventos SSE/WS — espejo del contrato del backend.
 *
 * Backend: projects/exam-app/src/exam_app/schemas/events.py
 * Agente:  projects/agents-backend/src/agents_backend/shared/events.py
 * Schema versionado (v) — ver docs/arquitectura-objetivo.md §5.
 */
import type { GeneratedItem, Question } from '@/types/domain'

export const SCHEMA_VERSION = 1

export type EventType =
  | 'token'
  | 'tool_start'
  | 'tool_end'
  | 'question_generated'
  | 'questions_listed'
  | 'artifact_ready'
  | 'material_indexed'
  | 'question_saved'
  | 'subject_registered'
  | 'cancelled'
  | 'done'
  | 'error'

/** Sobre estándar de un evento SSE/WS. */
export interface SSEEvent {
  v: number
  type: EventType
  thread_id: string
  payload: Record<string, unknown>
}

/** Evento de token de texto. */
export interface TokenEvent extends SSEEvent {
  type: 'token'
  payload: { delta: string }
}

/** Evento de tool en ejecución. */
export interface ToolStartEvent extends SSEEvent {
  type: 'tool_start'
  payload: { name: string; call_id: string }
}

export interface ToolEndEvent extends SSEEvent {
  type: 'tool_end'
  payload: { name: string; call_id: string; result?: string }
}

/** Pregunta generada (HITL): tarjeta con acciones. */
export interface QuestionGeneratedEvent extends SSEEvent {
  type: 'question_generated'
  payload: { question: GeneratedItem }
}

/** Tabla interactiva de preguntas. */
export interface QuestionsListedEvent extends SSEEvent {
  type: 'questions_listed'
  payload: { questions: Question[]; total: number }
}

/** Card de artefacto descargable. */
export interface ArtifactReadyEvent extends SSEEvent {
  type: 'artifact_ready'
  payload: { kind: 'pdf' | 'csv' | 'xlsx'; url: string; filename: string; version?: number }
}

/** Toast de material indexado. */
export interface MaterialIndexedEvent extends SSEEvent {
  type: 'material_indexed'
  payload: { chunks: number; filename: string; subject_name: string }
}

/** Pregunta guardada en el banco. */
export interface QuestionSavedEvent extends SSEEvent {
  type: 'question_saved'
  payload: { question_id: string; verified_by_human: boolean }
}

/** Materia registrada. */
export interface SubjectRegisteredEvent extends SSEEvent {
  type: 'subject_registered'
  payload: { subject_id: string; subject_name: string }
}

/** Cancelación vía WS. */
export interface CancelledEvent extends SSEEvent {
  type: 'cancelled'
  payload: { message: string }
}

/** Fin del turno. */
export interface DoneEvent extends SSEEvent {
  type: 'done'
}

/** Error del turno. */
export interface ErrorEvent extends SSEEvent {
  type: 'error'
  payload: { message: string }
}

/** Unión de todos los eventos posibles. */
export type ChatEvent =
  | TokenEvent
  | ToolStartEvent
  | ToolEndEvent
  | QuestionGeneratedEvent
  | QuestionsListedEvent
  | ArtifactReadyEvent
  | MaterialIndexedEvent
  | QuestionSavedEvent
  | SubjectRegisteredEvent
  | CancelledEvent
  | DoneEvent
  | ErrorEvent
