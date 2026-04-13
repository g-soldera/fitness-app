import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindPlugin from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindPlugin()],
  base: '/',
  root: 'client',
  build: {
    outDir: '../dist/public',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
    },
  },
})
