import { test, expect } from '@playwright/test';
import { freezeTime } from './setup.freeze-time';

test('show more loads next batch without reload', async ({ page }) => {
  await freezeTime(page);
  await page.goto('/');
  await page.waitForSelector('[data-testid="event-card"]', { state: 'visible' });
  await page.locator('select[name="city"]').selectOption({ index: 0 });
  const before = await page.getByTestId('event-card').count();

  const btn = page.locator('.load-more__button');
  await expect(btn).toBeVisible();
  await btn.click();

  const after = await page.getByTestId('event-card').count();
  expect(after).toBeGreaterThan(before);
});
