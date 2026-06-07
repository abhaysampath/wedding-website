import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import process from 'node:process'

const PORT = parseInt(process.env.PORT || '3000', 10)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: PORT,
    allowedHosts: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
