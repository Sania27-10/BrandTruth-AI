import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In development, any request starting with /api is forwarded to the backend.
// So the frontend calls fetch('/api/...') and never needs the backend URL or CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
