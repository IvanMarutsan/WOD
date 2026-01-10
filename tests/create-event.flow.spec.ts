import { test, expect } from '@playwright/test';
import { freezeTime } from './setup.freeze-time';
import { createEventToPreview } from './helpers';

test('create event flow reaches preview with expected data', async ({ page }) => {
  await freezeTime(page);
  await createEventToPreview(page);

  // Step 5: preview
  await expect(page.locator('#preview-title')).toContainText('Test meetup');
  await expect(page.locator('#preview-category')).toContainText(/music|музика|musik/i);
  await expect(page.locator('#preview-tags')).toContainText(/Community/i);
  await expect(page.locator('#preview-time')).toContainText(/01\.05\.2030/);
  await expect(page.locator('#preview-time')).toContainText('18:00');
  await expect(page.locator('#preview-time')).toContainText('20:00');
  await expect(page.locator('#preview-location')).toContainText('Copenhagen, Main St 10');
  await expect(page.locator('#preview-tickets')).toContainText(/Платно|Paid|Betalt/i);
  await expect(page.locator('#preview-tickets')).toContainText(/50–120/);
  await expect(page.locator('#preview-format')).toContainText(/Офлайн|Offline/i);
  await expect(page.locator('#preview-image')).toBeVisible();
  await expect(page.locator('#preview-image')).toHaveAttribute('src', /data:image\/png/);
});

test('preview shows all fields after event creation', async ({ page }) => {
  await freezeTime(page);
  await createEventToPreview(page);

  const fields = [
    '#preview-title',
    '#preview-organizer',
    '#preview-description',
    '#preview-category',
    '#preview-tags',
    '#preview-time',
    '#preview-location',
    '#preview-tickets',
    '#preview-format'
  ];

  for (const selector of fields) {
    const field = page.locator(selector);
    await expect(field).toBeVisible();
    await expect(field).not.toHaveText('—');
  }

  await expect(page.locator('#preview-image')).toBeVisible();
});
