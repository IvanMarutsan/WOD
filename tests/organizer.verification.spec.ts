import { test, expect } from '@playwright/test';

test('non-admin is redirected from create-event page', async ({ page }) => {
  await page.goto('/new-event.html');
  await expect(page).toHaveURL(/admin-login/);
});
