import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './scripts',
  testMatch: '**/*-playwright.test.ts',
  fullyParallel: true,
  // Keep the suite cheap: one retry only, no per-test videos.
  retries: 1,
  reporter: [['list'], ['json', { outputFile: 'test-results/playwright.json' }]],
  use: {
    baseURL: process.env.TEST_URL || 'http://localhost:3002',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'mobile',
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 844 }, // iPhone 12 logical size
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
      },
    },
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: 'npx vite preview --port 3002',
    port: 3002,
    timeout: 30000,
    reuseExistingServer: true,
  },
});
