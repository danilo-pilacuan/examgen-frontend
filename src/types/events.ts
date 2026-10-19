/**
 * SSE/WS event types — mirror of the backend contract.
 *
 * Backend: projects/exam-app/src/exam_app/schemas/events.py
 * Agent:   projects/agents-backend/src/agents_backend/shared/events.py
 * Versioned schema (v) — see docs/arquitectura-objetivo.md §5.
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
  | 'subject_selected'
  | 'cancelled'
  | 'done'
  | 'error'

/** Standard envelope of an SSE/WS event. */
export interface SSEEvent {
  v: number
  type: EventType
  thread_id: string
  payload: Record<string, unknown>
}

/** Text token event. */
export interface TokenEvent extends SSEEvent {
  type: 'token'
  payload: { delta: string }
}

/** Running tool event. */
export interface ToolStartEvent extends SSEEvent {
  type: 'tool_start'
  payload: { name: string; call_id: string }
}

export interface ToolEndEvent extends SSEEvent {
  type: 'tool_end'
  payload: { name: string; call_id: string; result?: string }
}

/** Generated question (HITL): card with actions. */
export interface QuestionGeneratedEvent extends SSEEvent {
  type: 'question_generated'
  payload: { question: GeneratedItem }
}

/** Interactive questions table. */
export interface QuestionsListedEvent extends SSEEvent {
  type: 'questions_listed'
  payload: { questions: Question[]; total: number }
}

/** Downloadable artifact card. */
export interface ArtifactReadyEvent extends SSEEvent {
  type: 'artifact_ready'
  payload: { kind: 'pdf' | 'csv' | 'xlsx'; url: string; filename: string; version?: number }
}

/** Indexed material toast. */
export interface MaterialIndexedEvent extends SSEEvent {
  type: 'material_indexed'
  payload: { chunks: number; filename: string; subject_name: string }
}

/** Question saved to the bank. */
export interface QuestionSavedEvent extends SSEEvent {
  type: 'question_saved'
  payload: { question_id: string; verified_by_human: boolean }
}

/** Registered subject. */
export interface SubjectRegisteredEvent extends SSEEvent {
  type: 'subject_registered'
  payload: { subject_id: string; subject_name: string }
}

/** Subject selected by the agent in the chat (reactive header selector). */
export interface SubjectSelectedEvent extends SSEEvent {
  type: 'subject_selected'
  payload: { subject_id: string; subject_name: string }
}

/** Cancellation via WS. */
export interface CancelledEvent extends SSEEvent {
  type: 'cancelled'
  payload: { message: string }
}

/** End of the turn. */
export interface DoneEvent extends SSEEvent {
  type: 'done'
}

/** Turn error. */
export interface ErrorEvent extends SSEEvent {
  type: 'error'
  payload: { message: string }
}

/** Union of all possible events. */
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
  | SubjectSelectedEvent
  | CancelledEvent
  | DoneEvent
  | ErrorEvent
