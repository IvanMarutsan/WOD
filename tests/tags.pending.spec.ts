import { test, expect } from './test-setup';

test('organizer can propose new tag/category with pending label', async ({ page }) => {
  await page.goto('/dashboard-new.html');
  // Add tag via chips input
  await page.getByLabel(/Теги|Tags|Tags/i).fill('NewCoolTag');
  await page.keyboard.press('Enter');

  // Tag renders with pending style (outline/dashed) and tooltip
  const chip = page.getByRole('button', { name: /NewCoolTag/i });
  await expect(chip).toHaveAttribute('title', /Pending|Очікує|Afventer/i);

  // Add category via modal
  await page.getByRole('button', { name: /Додати категорію|Add category/i }).click();
  await page.getByLabel(/Назва|Name|Navn/i).fill('Community Labs');
  await page.getByRole('button', { name: /Надіслати|Submit|Send/i }).click();

  // In preview chips should show pending state
  await page.getByRole('button', { name: /Прев’ю|Preview/i }).click();
  await expect(page.locator('.chip--pending')).toContainText(/Community Labs/);
});
