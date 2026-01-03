import { test, expect } from './test-setup';

test('submission blocked until organizer is verified', async ({ page }) => {
  await page.goto('/dashboard-new.html');

  // Jump to preview quickly (helper button if exists) else go through steps
  await page.getByRole('button', { name: /Прев’ю|Preview|Forhåndsvisning/i }).click();

  const submit = page.getByRole('button', { name: /Надіслати на модерацію|Submit/i });
  await expect(submit).toBeDisabled();
  await expect(page.getByRole('status')).toContainText(/верифікац/i);

  // Open verification panel
  await page.getByRole('button', { name: /Верифікація|Verification/i }).click();
  await page.getByLabel(/Email/i).fill('verify@example.com');
  await page.getByRole('button', { name: /Надіслати код|Send code/i }).click();
  await page.getByLabel(/код|code/i).fill('123456');
  await page.getByRole('button', { name: /Підтвердити|Verify/i }).click();

  // Back to preview
  await page.getByRole('button', { name: /Прев’ю|Preview/i }).click();
  await expect(submit).toBeEnabled();
});
