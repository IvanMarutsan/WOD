import { test, expect } from '@playwright/test';

test('submission blocked until organizer is verified', async ({ page }) => {
  await page.goto('/dashboard-new.html');

  const next = page.getByRole('button', { name: /Далі|Next|Næste/i });

  // Step 1: basics
  await page.getByLabel(/Назва|Title|Titel/i).fill('Test meetup');
  await page.getByLabel(/Категорія|Category|Kategori/i).selectOption({ index: 1 });
  const tagsInput = page.getByLabel(/Додати тег|Add tag|Tilføj tag/i);
  await tagsInput.fill('design');
  await page.keyboard.press('Enter');
  await next.click();

  // Step 2: time & location
  await page.getByLabel(/Початок|Start/i).fill('2030-05-01T18:00');
  await page.locator('select[name="format"]').selectOption({ value: 'offline' });
  await page.getByLabel(/Адреса|Address|Adresse/i).fill('Copenhagen, Main St 10');
  await next.click();

  // Step 3: tickets
  await page.getByLabel(/Безкоштовно|Free|Gratis/i).check();
  await next.click();

  // Step 4: contacts (required)
  await page.locator('input[name="contact-name"]').fill('Olena K.');
  await page.locator('input[name="contact-email"]').fill('verify@example.com');
  await next.click();
  await expect(page.getByRole('heading', { name: /Прев’ю|Preview|Forhåndsvisning/i })).toBeVisible();

  const submit = page.getByRole('button', { name: /Надіслати на модерацію|Submit/i });
  await expect(submit).toBeDisabled();
  await expect(page.locator('[data-verification-banner]')).toBeVisible();
});
