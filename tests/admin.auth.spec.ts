import { test, expect } from '@playwright/test';
import { freezeTime } from './setup.freeze-time';

async function stubIdentity(page) {
  await page.route('https://identity.netlify.com/*', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `
        window.netlifyIdentity = {
          _handlers: {},
          on(event, cb) { this._handlers[event] = cb; },
          init() { if (this._handlers.init) this._handlers.init(null); },
          open() {},
          close() {},
          logout() { if (this._handlers.logout) this._handlers.logout(); }
        };
      `
    });
  });
}

test('admin login page renders login action', async ({ page }) => {
  await freezeTime(page);
  await stubIdentity(page);
  await page.goto('/admin-login.html');
  await expect(page.locator('[data-admin-login]')).toBeVisible();
});

test('admin page redirects to login when unauthenticated', async ({ page }) => {
  await freezeTime(page);
  await stubIdentity(page);
  await page.goto('/admin-page.html');
  await expect(page).toHaveURL(/admin-login/);
  await expect(page.locator('[data-admin-status]')).toContainText(/вхід адміністратора|login required/i);
});
