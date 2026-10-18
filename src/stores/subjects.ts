/** Registered subjects store. */
import { defineStore } from 'pinia'
import { apiFetch } from '@/api/http'
import type { Subject } from '@/types/domain'

interface SubjectsState {
  subjects: Subject[]
  loading: boolean
  activeSubjectId: string | null
}

export const useSubjectsStore = defineStore('subjects', {
  state: (): SubjectsState => ({
    subjects: [],
    loading: false,
    activeSubjectId: null,
  }),
  getters: {
    activeSubject(state): Subject | null {
      return state.subjects.find((s) => s.id === state.activeSubjectId) ?? null
    },
  },
  actions: {
    async fetch() {
      this.loading = true
      try {
        this.subjects = await apiFetch<Subject[]>('/subjects')
      } finally {
        this.loading = false
      }
    },
    setActive(id: string | null) {
      this.activeSubjectId = id
    },
  },
})
