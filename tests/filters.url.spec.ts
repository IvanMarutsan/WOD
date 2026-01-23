import { test, expect } from '@playwright/test';
import { waitForEventsRendered } from './helpers';

test('filters update URL and back/forward restores state', async ({ page }) => {
  await page.goto('/');
  await waitForEventsRendered(page);
  await page.getByTestId('search-input').fill('music');
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/q=music/);

  // Quick preset: "Вихідні"/"Weekend"
  const weekend = page.getByTestId('filters-weekend');
  await weekend.click();
  await expect(page).toHaveURL(/weekend=1/);

  // Back restores
  await page.goBack();
  await expect(page).toHaveURL(/q=music/);
});

test('page query param opens requested catalog page', async ({ page }) => {
  await page.goto('/');
  await waitForEventsRendered(page);

  const firstTitle = await page.getByTestId('event-card').first().locator('.event-card__title a').innerText();

  await page.goto('/?page=2');
  await waitForEventsRendered(page);

  const secondTitle = await page.getByTestId('event-card').first().locator('.event-card__title a').innerText();
  expect(secondTitle).not.toEqual(firstTitle);

  const current = page.locator('[data-catalog-pages] .catalog-page[aria-current="page"]');
  await expect(current).toHaveText('2');
});

test('quick date presets toggle off clears URL and date inputs', async ({ page }) => {
  await page.goto('/');
  await waitForEventsRendered(page);

  const weekend = page.getByTestId('filters-weekend');
  await weekend.click();
  await expect(page).toHaveURL(/weekend=1/);

  await weekend.click();
  await expect(page).not.toHaveURL(/weekend=1/);

  const dateFrom = page.locator('input[name="date-from"]');
  const dateTo = page.locator('input[name="date-to"]');
  await expect(dateFrom).toHaveValue('');
  await expect(dateTo).toHaveValue('');
});
