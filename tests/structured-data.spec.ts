import { test, expect } from '@playwright/test';

test('event page exposes valid Event JSON-LD', async ({ page }) => {
  await page.goto('/event.html');
  const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
  const data = JSON.parse(jsonLd || '{}');
  expect(data['@type']).toBe('Event');
  expect(data.location?.address?.addressCountry).toBe('DK');
  expect(data.offers?.priceCurrency).toBe('DKK');
});
