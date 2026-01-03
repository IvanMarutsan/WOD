import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:5173',
    headless: true,
  },
  reporter: [['html', { open: 'never' }]],
});
