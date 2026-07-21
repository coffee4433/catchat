import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: '.',
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 3333,
    proxy: {
      '/ws': {
        target: 'ws://127.0.0.1:4444',
        ws: true,
      },
    },
  },
})
