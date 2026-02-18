import { defineConfig } from '@playwright/test';

const baseURL = process.env.STAGING_BASE_URL || process.env.BASE_URL;
if (!baseURL) {
  throw new Error('Set STAGING_BASE_URL (or BASE_URL) before running staging tests.');
}

export default defineConfig({
  testDir: 'tests',
  testIgnore: ['**/unit/**', '**/visual.spec.ts'],
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    headless: true,
    timezoneId: 'Europe/Copenhagen',
    locale: 'uk-UA',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure'
  }
});
