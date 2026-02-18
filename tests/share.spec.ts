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
  const facebookHref = await page
    .locator('[data-share-channel="facebook"]')
    .getAttribute('href');
  const linkedinHref = await page
    .locator('[data-share-channel="linkedin"]')
    .getAttribute('href');
  const telegramHref = await page
    .locator('[data-share-channel="telegram"]')
    .getAttribute('href');
  const whatsappHref = await page
    .locator('[data-share-channel="whatsapp"]')
    .getAttribute('href');
  expect(facebookHref || '').toContain('https://www.facebook.com/sharer/sharer.php?u=');
  expect(facebookHref || '').toContain('utm_content%3Dfacebook');
  expect(linkedinHref || '').toContain('https://www.linkedin.com/sharing/share-offsite/?url=');
  expect(linkedinHref || '').toContain('utm_content%3Dlinkedin');
  expect(telegramHref || '').toContain('https://t.me/share/url');
  expect(telegramHref || '').toContain('utm_content%3Dtelegram');
  expect(whatsappHref || '').toContain('https://wa.me/?text=');
  expect(whatsappHref || '').toContain('utm_content%3Dwhatsapp');
});

test.describe('mobile share behavior', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('instagram stories is visible, falls back to copy, and facebook tries native first', async ({
    page
  }) => {
    const eventId = 'evt-share-002';
    const payload = {
      ok: true,
      event: {
        id: eventId,
        slug: 'share-event-mobile',
        title: 'Share Event Mobile',
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
      // @ts-ignore
      window.__copiedText = '';
      // @ts-ignore
      window.__nativeShareCalls = 0;
      // @ts-ignore
      window.__openedExternal = '';
      Object.defineProperty(window.navigator, 'share', {
        value: async () => {
          // @ts-ignore
          window.__nativeShareCalls += 1;
          throw new Error('share failed');
        },
        configurable: true
      });
      Object.defineProperty(window.navigator, 'canShare', { value: undefined, configurable: true });
      Object.defineProperty(window.navigator, 'clipboard', {
        value: {
          writeText: async (value: string) => {
            // @ts-ignore
            window.__copiedText = value;
          }
        },
        configurable: true
      });
      Object.defineProperty(window, 'open', {
        value: (url: string) => {
          // @ts-ignore
          window.__openedExternal = url;
          return {};
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
    await expect(page.locator('[data-share-instagram]')).toBeVisible();
    await page.getByRole('button', { name: /Instagram Stories/i }).click();
    await expect(page.locator('[data-saved-toast]')).toHaveText(
      'Виникла помилка. Але посилання скопійовано. Вставте у Instagram Stories'
    );
    const copiedInstagram = await page.evaluate(() => {
      // @ts-ignore
      return window.__copiedText || '';
    });
    expect(copiedInstagram).toContain('utm_content=instagram');

    await page.getByRole('button', { name: /Поділитися/i }).click();
    await page.locator('[data-share-channel="facebook"]').click();

    const nativeShareCalls = await page.evaluate(() => {
      // @ts-ignore
      return window.__nativeShareCalls || 0;
    });
    const openedExternal = await page.evaluate(() => {
      // @ts-ignore
      return window.__openedExternal || '';
    });
    expect(nativeShareCalls).toBeGreaterThan(0);
    expect(openedExternal).toContain('https://www.facebook.com/sharer/sharer.php?u=');
    expect(openedExternal).toContain('utm_content%3Dfacebook');
  });
});
