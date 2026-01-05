import { test, expect } from '@playwright/test';
import { freezeTime } from './setup.freeze-time';
import { createEventToPreview } from './helpers';

test('create event flow reaches preview with expected data', async ({ page }) => {
  await freezeTime(page);
  await createEventToPreview(page);

  // Step 5: preview
  await expect(page.locator('#preview-title')).toContainText('Test meetup');
  await expect(page.locator('#preview-category')).toContainText(/music/i);
  await expect(page.locator('#preview-tags')).toContainText(/Community/i);
  await expect(page.locator('#preview-time')).toContainText('2030-05-01T18:00');
  await expect(page.locator('#preview-time')).toContainText('→');
  await expect(page.locator('#preview-location')).toContainText('Copenhagen, Main St 10');
  await expect(page.locator('#preview-tickets')).toContainText(/paid/i);
  await expect(page.locator('#preview-tickets')).toContainText(/50–120/);
  await expect(page.locator('#preview-format')).toContainText(/offline/i);
});
