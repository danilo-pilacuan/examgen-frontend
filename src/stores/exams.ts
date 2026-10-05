/** Store of generated exams. */
import { defineStore } from 'pinia'
import { apiFetch } from '@/api/http'
import type { Exam } from '@/types/domain'

interface ExamsState {
  exams: Exam[]
  loading: boolean
}

export const useExamsStore = defineStore('exams', {
  state: (): ExamsState => ({
    exams: [],
    loading: false,
  }),
  actions: {
    async fetch(subjectId: string) {
      this.loading = true
      try {
        this.exams = await apiFetch<Exam[]>(`/subjects/${subjectId}/exams`)
      } finally {
        this.loading = false
      }
    },
  },
})
