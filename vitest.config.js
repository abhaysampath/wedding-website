import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import process from 'node:process'

export default defineConfig({
  // No tailwind plugin in tests — it tries to load a platform-specific
  // native binary (@tailwindcss/oxide) that may not be present when
  // running on a different platform than the one that generated
  // package-lock.json. Tests don't render Tailwind, so this is safe.
  plugins: [react()],
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: ['node_modules/**', 'scripts/test-e2e-playwright.test.ts'],
  },
})
