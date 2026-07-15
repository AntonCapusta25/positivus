import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/hyperzod': {
        target: 'https://api.hyperzod.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/hyperzod/, '')
      }
    }
  }
})
