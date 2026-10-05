/** Tipos de dominio compartidos con el backend. */

export type BloomLevel = 'recordar' | 'comprender' | 'aplicar' | 'analizar' | 'evaluar' | 'crear'

export type Difficulty = 'facil' | 'medio' | 'dificil'

export type QuestionType =
  | 'opcion_multiple'
  | 'verdadero_falso'
  | 'respuesta_corta'
  | 'desarrollo'
  | 'relleno'
  | 'todas_correctas'

export interface AnswerOption {
  text: string
  is_correct: boolean
}

/** Ítem generado por el LLM (contrato estricto con el backend). */
export interface GeneratedItem {
  topic: string
  subtopic?: string | null
  bloom_level: BloomLevel
  difficulty: Difficulty
  question_type: QuestionType
  statement: string
  options: AnswerOption[]
  expected_answer: string
  solution_explanation: string
  points: number
}

/** Pregunta del banco (fila de generated_questions). */
export interface Question {
  id: string
  subject_id: string
  topic: string
  subtopic?: string | null
  bloom_level: string
  difficulty: string
  question_type: string | null
  question_text: string
  options: AnswerOption[] | null
  expected_answer: string | null
  solution_explanation: string | null
  points: number | null
  verified_by_human: boolean
  verified_by_ai: boolean
  ai_review_notes: string | null
  ai_review_priority: 'alta' | 'media' | 'baja' | null
  source: string
  created_at: string
}

/** Materia registrada. */
export interface Subject {
  id: string
  name: string
}

/** Blueprint de examen (plano del examen). */
export interface ExamBlueprint {
  subject_id: string
  total_questions: number
  bloom_distribution: Partial<Record<BloomLevel, number>>
  difficulty_distribution: Partial<Record<Difficulty, number>>
  topics_weight: Record<string, number>
  estimated_duration_minutes: number
  metadata?: {
    title?: string
    instructions?: string
    num_versions?: number
    [key: string]: unknown
  }
}

/** Examen generado. */
export interface Exam {
  id: string
  subject_id: string
  subject_name: string
  blueprint: ExamBlueprint
  items: GeneratedItem[]
  pdf_paths: string[]
  created_at: string
}
