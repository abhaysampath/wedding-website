import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './scripts',
  testMatch: '**/*-playwright.test.ts',
  fullyParallel: false,
  retries: 2,
  use: {
    baseURL: process.env.TEST_URL || 'http://localhost:3002',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npx vite preview --port 3002',
    port: 3002,
    timeout: 15000,
    reuseExistingServer: true,
  },
});
