import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import process from 'node:process'

const PORT = parseInt(process.env.PORT || '3000', 10)
const API_PORT = parseInt(process.env.API_PORT || '3001', 10)

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: PORT,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ['@vercel/speed-insights'],
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) return 'vendor-react'
          if (id.includes('node_modules/framer-motion')) return 'vendor-motion'
          if (id.includes('node_modules/firebase')) return 'vendor-firebase'
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
