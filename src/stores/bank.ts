/** Question bank store. */
import { defineStore } from 'pinia'
import { apiFetch } from '@/api/http'
import type { Question, BankExport } from '@/types/domain'

interface BankState {
  questions: Question[]
  loading: boolean
  lastExport: BankExport | null
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
    lastExport: null,
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
    /** Audit fields (prompt/thinking) of the last export, by question id. */
    auditFor(questionId: string): { prompt: string | null; thinking: string | null } | null {
      const q = this.lastExport?.questions.find((q) => q.id === questionId)
      if (!q) return null
      return { prompt: q.prompt, thinking: q.thinking }
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
    /** Downloads the bank with prompt/thinking audit fields as a JSON file. */
    async exportBank(subjectId: string, subjectName: string) {
      const data = await apiFetch<BankExport>(`/subjects/${subjectId}/questions/export`)
      this.lastExport = data
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const stamp = data.exported_at.slice(0, 10)
      a.href = url
      a.download = `question_bank_${subjectName.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')}_${stamp}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      return data
    },
  },
})
