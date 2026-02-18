import { test, expect } from '@playwright/test';
import { enableAdminSession } from './helpers';

test('desktop share fallback menu works and builds network links', async ({ page }) => {
  const eventId = 'evt-share-001';
  const payload = {
    ok: true,
    event: {
      id: eventId,
      slug: 'share-event',
      title: 'Share Event',
      description: 'Share event description.',
      tags: [],
      start: '2026-02-12T18:00:00+01:00',
      end: '2026-02-12T20:00:00+01:00',
      format: 'offline',
      venue: 'Venue',
      address: 'Main St 10',
      city: 'Copenhagen',
      priceType: 'free',
      priceMin: null,
      priceMax: null,
      ticketUrl: 'https://tickets.example.com',
      organizerId: '',
      images: [],
      status: 'published',
      language: 'uk',
      contactPerson: {
        name: '',
        email: '',
        phone: '',
        website: '',
        instagram: '',
        facebook: '',
        meta: ''
      }
    }
  };

  await page.addInitScript(() => {
    Object.defineProperty(window.navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(window.navigator, 'canShare', { value: undefined, configurable: true });
    // @ts-ignore
    window.__copiedText = '';
    Object.defineProperty(window.navigator, 'clipboard', {
      value: {
        writeText: async (value: string) => {
          // @ts-ignore
          window.__copiedText = value;
        }
      },
      configurable: true
    });
  });

  await enableAdminSession(page);
  await page.route('**/.netlify/functions/public-events*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );
  await page.route('**/.netlify/functions/public-event*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) })
  );
  await page.route('**/.netlify/functions/admin-event*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) })
  );

  await page.goto(`/event-card.html?id=${eventId}&serverless=1`);

  await page.getByRole('button', { name: /Поділитися/i }).click();
  const shareMenu = page.locator('[data-share-menu]');
  await expect(shareMenu).toBeVisible();

  await page.getByRole('button', { name: /Copy link/i }).click();
  await expect(page.locator('[data-saved-toast]')).toHaveText('Посилання скопійовано');
  const copied = await page.evaluate(() => {
    // @ts-ignore
    return window.__copiedText || '';
  });
  expect(copied).toContain('utm_content=copy');

  await expect(page.locator('[data-share-instagram]')).toBeHidden();

  await page.getByRole('button', { name: /Поділитися/i }).click();
  const telegramHref = await page
    .locator('[data-share-channel="telegram"]')
    .getAttribute('href');
  const whatsappHref = await page
    .locator('[data-share-channel="whatsapp"]')
    .getAttribute('href');
  expect(telegramHref || '').toContain('https://t.me/share/url');
  expect(telegramHref || '').toContain('utm_content%3Dtelegram');
  expect(whatsappHref || '').toContain('https://wa.me/?text=');
  expect(whatsappHref || '').toContain('utm_content%3Dwhatsapp');
});
