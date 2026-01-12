import { test, expect } from '@playwright/test';

const stubAdminIdentity = async (page) => {
  await page.addInitScript(() => {
    window.netlifyIdentity = {
      _handlers: {},
      on(event, cb) {
        this._handlers[event] = cb;
      },
      init() {
        if (this._handlers.init) this._handlers.init(null);
      },
      currentUser() {
        return null;
      },
      open() {},
      close() {},
      logout() {
        if (this._handlers.logout) this._handlers.logout();
      }
    };
    localStorage.setItem('wodAdminSession', '1');
  });
};

test('admin can archive and restore event from detail page', async ({ page }) => {
  await stubAdminIdentity(page);
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

test('archived events are visible for admin in catalog and detail', async ({ page }) => {
  await page.addInitScript(() => {
    const archivedEvent = {
      id: 'evt-arch-3',
      title: 'Archived Event 3',
      start: '2026-02-01T10:00:00',
      city: 'Copenhagen',
      tags: [{ label: 'архів' }],
      priceType: 'free',
      archived: true,
      status: 'archived'
    };
    localStorage.setItem('wodLocalEvents', JSON.stringify([archivedEvent]));
    localStorage.setItem('wodDeletedEvents', JSON.stringify([]));
    localStorage.setItem('wodAuditLog', JSON.stringify([]));
  });
  await stubAdminIdentity(page);
  await page.goto('/main-page.html#events');
  await page.waitForSelector('[data-event-id="evt-arch-3"]');

  const card = page.locator('[data-event-id="evt-arch-3"]');
  await expect(card.locator('.event-card__status')).toBeVisible();

  await card.locator('.event-card__link').click();
  await expect(page.locator('[data-admin-archived-badge]')).toBeVisible();
});

test('admin can delete event from detail page with confirm', async ({ page }) => {
  await stubAdminIdentity(page);
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
  await stubAdminIdentity(page);
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
  await stubAdminIdentity(page);
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
