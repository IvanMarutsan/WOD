import { test, expect } from './test-setup';
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
