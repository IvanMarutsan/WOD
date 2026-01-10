import { test, expect } from '@playwright/test';
import { gotoHome, waitForEventsRendered } from './helpers';

test('home loads with logo and hero', async ({ page }) => {
  await gotoHome(page);
  await waitForEventsRendered(page);
  await expect(page.getByTestId('logo')).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Події|Events|Begivenheder/);
});
