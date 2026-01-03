import { test, expect } from '@playwright/test';

test('filters update URL and back/forward restores state', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('searchbox').fill('music');
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/q=music/);

  // Quick preset: "Вихідні"/"Weekend"
  const weekend = page.getByRole('button', { name: /Вихідні|Weekend|Weekend/i });
  await weekend.click();
  await expect(page).toHaveURL(/weekend=1/);

  // Back restores
  await page.goBack();
  await expect(page).toHaveURL(/q=music/);
});
