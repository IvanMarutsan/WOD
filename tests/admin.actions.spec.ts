import { test, expect } from '@playwright/test';
import { enableAdminSession } from './helpers';

test('admin can archive and restore event from detail page', async ({ page }) => {
  await enableAdminSession(page);
  await page.goto('/event-card.html?id=evt-006');
  await page.waitForSelector('[data-event-title]');

  const archiveBtn = page.locator('[data-action="admin-archive"]');
  const restoreBtn = page.locator('[data-action="admin-restore"]');
  const badge = page.locator('[data-admin-archived-badge]');

  await expect(archiveBtn).toBeVisible();
  await archiveBtn.click();
  await expect(badge).toBeVisible();
  await expect(restoreBtn).toBeVisible();

  await restoreBtn.click();
  await expect(badge).toBeHidden();
  await expect(archiveBtn).toBeVisible();
});

test('admin can delete event from detail page with confirm', async ({ page }) => {
  await enableAdminSession(page);
  await page.goto('/event-card.html?id=evt-006');
  await page.waitForSelector('[data-event-title]');

  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });

  await page.locator('[data-action="admin-delete"]').click();
  await expect(page).toHaveURL(/admin-page\.html#archive/);
});

test('admin can restore archived event from admin archive', async ({ page }) => {
  await page.addInitScript(() => {
    const archivedEvent = {
      id: 'evt-arch-1',
      title: 'Archived Event',
      start: '2026-01-12T10:00:00',
      city: 'Copenhagen',
      archived: true,
      status: 'archived'
    };
    localStorage.setItem('wodLocalEvents', JSON.stringify([archivedEvent]));
    localStorage.setItem('wodDeletedEvents', JSON.stringify([]));
    localStorage.setItem('wodAuditLog', JSON.stringify([]));
  });
  await enableAdminSession(page);
  await page.goto('/admin-page.html');

  const card = page.locator('[data-admin-archive-card][data-event-id="evt-arch-1"]');
  await expect(page.locator('body')).toHaveAttribute('data-admin-auth', 'granted');
  await expect(card).toBeVisible({ timeout: 10000 });
  await card.locator('[data-action="restore"]').click();
  await expect(card).toHaveCount(0);
});

test('admin can delete archived event from admin archive with confirm', async ({ page }) => {
  await page.addInitScript(() => {
    const archivedEvent = {
      id: 'evt-arch-2',
      title: 'Archived Event 2',
      start: '2026-01-15T12:00:00',
      city: 'Aarhus',
      archived: true,
      status: 'archived'
    };
    localStorage.setItem('wodLocalEvents', JSON.stringify([archivedEvent]));
    localStorage.setItem('wodDeletedEvents', JSON.stringify([]));
    localStorage.setItem('wodAuditLog', JSON.stringify([]));
  });
  await enableAdminSession(page);
  await page.goto('/admin-page.html');

  const card = page.locator('[data-admin-archive-card][data-event-id="evt-arch-2"]');
  await expect(page.locator('body')).toHaveAttribute('data-admin-auth', 'granted');
  await expect(card).toBeVisible({ timeout: 10000 });

  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });

  await card.locator('[data-action="delete"]').click();
  await expect(card).toHaveCount(0);
});

test('admin can open archived event via admin-event when not in public list', async ({ page }) => {
  await enableAdminSession(page);
  let adminEventHits = 0;
  await page.route('**/.netlify/functions/public-events', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
  );
  await page.route('**/.netlify/functions/admin-event*', (route) => {
    adminEventHits += 1;
    const payload = {
      ok: true,
      event: {
        id: 'evt-arch-remote',
        title: 'Remote Archived Event',
        description: 'Archived event loaded for admin.',
        tags: [],
        start: '2026-03-01T10:00:00Z',
        end: null,
        format: 'offline',
        venue: 'Venue',
        address: 'Address',
        city: 'Copenhagen',
        priceType: 'free',
        priceMin: null,
        priceMax: null,
        ticketUrl: '',
        organizerId: '',
        images: [],
        status: 'archived',
        language: 'uk',
        forUkrainians: true,
        familyFriendly: false,
        volunteer: false,
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
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(payload)
    });
  });

  await page.goto('/event-card.html?id=evt-arch-remote&serverless=1');
  await page.waitForSelector('[data-event-title]');
  await expect(page.locator('[data-event-title]')).toHaveText('Remote Archived Event');
  await expect(page.locator('[data-admin-archived-badge]')).toBeVisible();
  await expect.poll(() => adminEventHits).toBeGreaterThan(0);
});
