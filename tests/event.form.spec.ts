import { test, expect } from '@playwright/test';

test('create event without end time', async ({ page }) => {
  await page.goto('/dashboard-new.html');
  // Step 1
  await page.getByLabel(/Назва|Title|Titel/i).fill('Test meetup');
  await page.getByLabel(/Категорія|Category|Kategori/i).selectOption({ index: 1 });
  await page.getByRole('button', { name: /Далі|Next|Næste/i }).click();

  // Step 2: set only start, no end
  await page.getByLabel(/Початок|Start/i).fill('2030-05-01T18:00');
  // Ensure timezone selector is absent
  await expect(page.getByText(/Часовий пояс|Timezone|Tidszone/i)).toHaveCount(0);
  await page.getByRole('button', { name: /Далі|Next|Næste/i }).click();

  // Step 3: Free event
  await page.getByLabel(/Безкоштовно|Free|Gratis/i).check();
  await page.getByRole('button', { name: /Далі|Next|Næste/i }).click();

  // Step 4: skip media
  await page.getByRole('button', { name: /Далі|Next|Næste/i }).click();

  // Step 5: Preview shows only start date/time
  await expect(page.locator('.preview')).toContainText(/2030/);
  await expect(page.locator('.preview')).not.toContainText(/—/); // no range if no end
});
