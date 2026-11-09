/** Registered subjects store. */
import { defineStore } from 'pinia'
import { apiFetch } from '@/api/http'
import type { Subject } from '@/types/domain'

interface SubjectsState {
  subjects: Subject[]
  loading: boolean
  activeSubjectId: string | null
}

const ACTIVE_SUBJECT_KEY = 'mvp_active_subject'

/** Restores the persisted active subject (RFC-10/ISS-17: survives F5). */
function loadActiveSubjectId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SUBJECT_KEY)
  } catch {
    return null
  }
}

function saveActiveSubjectId(id: string | null) {
  try {
    if (id) localStorage.setItem(ACTIVE_SUBJECT_KEY, id)
    else localStorage.removeItem(ACTIVE_SUBJECT_KEY)
  } catch {
    // storage unavailable: in-memory only
  }
}

export const useSubjectsStore = defineStore('subjects', {
  state: (): SubjectsState => ({
    subjects: [],
    loading: false,
    activeSubjectId: loadActiveSubjectId(),
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
      saveActiveSubjectId(id)
    },
  },
})
