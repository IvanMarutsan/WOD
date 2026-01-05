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
  const heroCta = page.locator('.hero-actions [data-i18n="cta_explore"]');
  const langSelect = page.getByTestId('lang-select');
  await langSelect.selectOption('en');
  await expect(heroCta).toContainText(/Browse events/i);
  await langSelect.selectOption('da');
  await expect(heroCta).toContainText(/Se begivenheder/i);
  await langSelect.selectOption('uk');
  await expect(heroCta).toContainText(/Переглянути події/i);
});
