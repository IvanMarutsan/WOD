import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  timeout: 30_000,
  retries: 1,
  globalSetup: './tests/setup.ts',
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:5173',
    headless: true,
    timezoneId: 'Europe/Copenhagen',
    locale: 'uk-UA',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    reducedMotion: 'reduce',
  },
  reporter: [['html', { open: 'never' }]],
});
