import { test, expect } from '@playwright/test';
import { enableAdminSession } from './helpers';

test('organizer can propose new tag with pending label', async ({ page }) => {
  await enableAdminSession(page);
  await page.goto('/new-event.html');
  // Add tag via chips input
  await page.getByLabel(/Додати тег|Add tag|Tilføj tag/i).fill('NewCoolTag');
  await page.keyboard.press('Enter');

  // Tag renders with pending style (outline/dashed) and tooltip
  const chip = page.locator('.tags-input__chip.pending').first();
  await expect(chip).toContainText(/NewCoolTag/i);
  await expect(chip).toHaveAttribute('title', /Pending|Очікує|Afventer/i);
});
