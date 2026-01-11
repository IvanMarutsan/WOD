import { test, expect } from '@playwright/test';
import { freezeTime } from './setup.freeze-time';

const routes = [
  { url: '/main-page.html', key: 'home' },
  { url: '/main-page.html#events', key: 'events' },
  { url: '/new-event.html', key: 'new-event' },
  { url: '/event-card.html?id=evt-006', key: 'event-card' }
];

for (const route of routes) {
  test(`visual: ${route.url}`, async ({ page }) => {
    await freezeTime(page);
    await page.addInitScript(() => {
      Math.random = () => 0.42;
    });
    await page.addInitScript(() => {
      document.documentElement.style.scrollBehavior = 'auto';
    });
    if (route.url.includes('new-event')) {
      await page.addInitScript(() => {
        localStorage.setItem('wodAdminSession', '1');
      });
    }
    await page.goto(route.url);
    await page.waitForLoadState('domcontentloaded');
    if (route.key === 'home') {
      const hero = page.locator('.hero');
      const highlights = page.locator('.highlights');
      await expect(hero).toBeVisible();
      await expect(highlights).toBeVisible();
      expect(await hero.screenshot()).toMatchSnapshot('home-hero.png', { maxDiffPixels: 200 });
      expect(await highlights.screenshot()).toMatchSnapshot('home-highlights.png', { maxDiffPixels: 200 });
    }
    if (route.key === 'events') {
      const catalog = page.locator('#events');
      await catalog.scrollIntoViewIfNeeded();
      await page.waitForSelector('[data-testid="event-card"]', { timeout: 10000 });
      const filters = page.locator('.filters');
      const grid = page.locator('.catalog-grid');
      await expect(filters).toBeVisible();
      await expect(grid).toBeVisible();
      expect(await filters.screenshot()).toMatchSnapshot('events-filters.png', { maxDiffPixels: 200 });
      expect(await grid.screenshot()).toMatchSnapshot('events-grid.png', { maxDiffPixels: 200 });
    }
    if (route.key === 'new-event') {
      const form = page.locator('form.multi-step');
      const steps = page.locator('.stepper');
      await expect(form).toBeVisible();
      await expect(steps).toBeVisible();
      expect(await form.screenshot()).toMatchSnapshot('new-event-form.png', { maxDiffPixels: 200 });
    }
    if (route.key === 'event-card') {
      const detail = page.locator('.event-detail');
      const sidebar = page.locator('.event-sidebar');
      await expect(detail).toBeVisible();
      await expect(sidebar).toBeVisible();
      expect(await detail.screenshot()).toMatchSnapshot('event-detail.png', { maxDiffPixels: 200 });
      expect(await sidebar.screenshot()).toMatchSnapshot('event-sidebar.png', { maxDiffPixels: 200 });
    }
  });
}
