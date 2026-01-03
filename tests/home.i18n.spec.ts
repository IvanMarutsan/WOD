import { test, expect } from '@playwright/test';
import { gotoHome, waitForEventsRendered } from './helpers';

test('home loads with logo and hero', async ({ page }) => {
  await gotoHome(page);
  await waitForEventsRendered(page);
  await expect(page.getByTestId('logo')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Події|Events|Begivenheder/);
});

test('language switch updates UI', async ({ page }) => {
  await gotoHome(page);
  await waitForEventsRendered(page);
  await page.getByTestId('lang-en').click();
  await expect(page.locator('[data-i18n="cta_explore"]')).toContainText(/Browse events/i);
  await page.getByTestId('lang-da').click();
  await expect(page.locator('[data-i18n="cta_explore"]')).toContainText(/Se begivenheder/i);
  await page.getByTestId('lang-uk').click();
  await expect(page.locator('[data-i18n="cta_explore"]')).toContainText(/Переглянути події/i);
});
