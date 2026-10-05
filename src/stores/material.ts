/** Store de material indexado. */
import { defineStore } from 'pinia'
import { apiFetch } from '@/api/http'

export interface MaterialChunkInfo {
  id: string
  source_file: string
  chunk_index: number
  content: string
}

interface MaterialState {
  chunks: MaterialChunkInfo[]
  loading: boolean
}

export const useMaterialStore = defineStore('material', {
  state: (): MaterialState => ({
    chunks: [],
    loading: false,
  }),
  actions: {
    async fetch(subjectId: string) {
      this.loading = true
      try {
        this.chunks = await apiFetch<MaterialChunkInfo[]>(`/subjects/${subjectId}/material`)
      } finally {
        this.loading = false
      }
    },
  },
})
