import { test, expect } from '@playwright/test';
import { gotoHome } from './helpers';

test('home loads with logo and hero', async ({ page }) => {
  await gotoHome(page);
  await expect(page.getByRole('img', { name: /логотип/i })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Події|Events|Begivenheder/);
});

test('language switch updates UI', async ({ page }) => {
  await gotoHome(page);
  await page.getByRole('button', { name: /Choose English/i }).click();
  await expect(page.locator('[data-i18n="cta_explore"]')).toContainText(/Browse events/i);
  await page.getByRole('button', { name: /Vælg dansk/i }).click();
  await expect(page.locator('[data-i18n="cta_explore"]')).toContainText(/Se begivenheder/i);
  await page.getByRole('button', { name: /Обрати українську/i }).click();
  await expect(page.locator('[data-i18n="cta_explore"]')).toContainText(/Переглянути події/i);
});
