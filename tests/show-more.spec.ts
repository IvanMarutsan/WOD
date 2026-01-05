import { test, expect } from '@playwright/test';
import { freezeTime } from './setup.freeze-time';

test('show more loads next batch without reload', async ({ page }) => {
  await freezeTime(page);
  await page.goto('/');
  await page.waitForSelector('[data-testid="event-card"]', { state: 'visible' });
  await page.locator('select[name="city"]').selectOption({ index: 0 });

  const firstTitle = await page.getByTestId('event-card').first().locator('.event-card__title a').innerText();
  const nextBtn = page.getByRole('button', { name: /Показати наступні події|Show next events|Vis næste/i });
  await expect(nextBtn).toBeEnabled();
  await nextBtn.click();

  const nextFirstTitle = await page.getByTestId('event-card').first().locator('.event-card__title a').innerText();
  expect(nextFirstTitle).not.toEqual(firstTitle);
});
