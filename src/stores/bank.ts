/** Store del banco de preguntas. */
import { defineStore } from 'pinia'
import { apiFetch } from '@/api/http'
import type { Question } from '@/types/domain'

interface BankState {
  questions: Question[]
  loading: boolean
  filters: {
    topic: string | null
    difficulty: string | null
    bloom_level: string | null
    question_type: string | null
    verified: 'all' | 'human' | 'ai' | 'none'
  }
}

export const useBankStore = defineStore('bank', {
  state: (): BankState => ({
    questions: [],
    loading: false,
    filters: {
      topic: null,
      difficulty: null,
      bloom_level: null,
      question_type: null,
      verified: 'all',
    },
  }),
  actions: {
    async fetch(subjectId: string) {
      this.loading = true
      try {
        this.questions = await apiFetch<Question[]>(`/subjects/${subjectId}/questions`)
      } finally {
        this.loading = false
      }
    },
    async setHumanVerification(questionId: string, verified: boolean) {
      await apiFetch(`/questions/${questionId}/verification`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified: verified }),
      })
      const q = this.questions.find((q) => q.id === questionId)
      if (q) q.verified_by_human = verified
    },
  },
})
