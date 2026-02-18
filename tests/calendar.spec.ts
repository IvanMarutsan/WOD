import { test, expect } from '@playwright/test';
import { enableAdminSession } from './helpers';

test('event detail calendar actions open google popup and download ics', async ({ page }) => {
  const eventId = 'evt-cal-001';
  const payload = {
    ok: true,
    event: {
      id: eventId,
      slug: 'calendar-event',
      title: 'Calendar Event',
      description: 'Calendar event description.',
      tags: [],
      start: '2026-02-12T18:00:00+01:00',
      end: '2026-02-12T20:00:00+01:00',
      format: 'online',
      venue: '',
      address: 'Zoom',
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
  const calendarToggle = page.getByRole('button', { name: /Додати в календар/i });
  await expect(calendarToggle).toBeVisible();
  await calendarToggle.click();

  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Google Calendar' }).click();
  const popup = await popupPromise;
  await expect
    .poll(() => {
      const nextUrl = popup.url();
      if (nextUrl.startsWith('https://calendar.google.com/')) return true;
      if (nextUrl.startsWith('https://accounts.google.com/')) {
        return decodeURIComponent(nextUrl).includes('https://calendar.google.com/calendar/render');
      }
      return false;
    })
    .toBe(true);
  await popup.close();

  await calendarToggle.click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download .ics' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.ics$/);
});
