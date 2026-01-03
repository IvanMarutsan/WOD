import { test, expect } from '@playwright/test';

test('past events hidden by default and banner on detail', async ({ page }) => {
  await page.goto('/');

  // Ensure there is a toggle to show past events and it is off
  const toggle = page.getByRole('checkbox', { name: /Показати минулі|Show past|Vis tidligere/i });
  await expect(toggle).not.toBeChecked();

  // Memorize first card title
  const firstTitle = await page.locator('.event-card__title a').first().innerText();

  // Enable past events
  await toggle.check();
  await expect(page).toHaveURL(/past=1/);

  // Navigate to a past event detail (assume first after toggle)
  await page.locator('.event-card__title a').first().click();
  await expect(page.getByText(/подія вже минула|has passed|er afholdt/i)).toBeVisible();
  // Ticket CTA replaced
  await expect(page.getByRole('link', { name: /Купити|Buy|Køb/i })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Схожі події|Similar|Lignende/i })).toBeVisible();
});
