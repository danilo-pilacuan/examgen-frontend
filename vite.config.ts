import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy a exam-app en desarrollo: evita CORS en dev.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/output': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // El WS se proxifica con ws: true (upgrade).
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
      '/v1': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
