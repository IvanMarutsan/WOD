import { test, expect } from '@playwright/test';
import { freezeTime } from './setup.freeze-time';

const routes = ['/main-page.html', '/main-page.html#events', '/new-event.html', '/event-card.html?id=evt-006'];

for (const route of routes) {
  test(`visual: ${route}`, async ({ page }) => {
    await freezeTime(page);
    await page.addInitScript(() => {
      Math.random = () => 0.42;
    });
    if (route.includes('new-event')) {
      await page.addInitScript(() => {
        localStorage.setItem('wodAdminSession', '1');
      });
    }
    await page.goto(route);
    await page.waitForLoadState('domcontentloaded');
    const hasCatalog = await page.locator('.catalog-grid').count();
    if (hasCatalog) {
      await page.waitForSelector('[data-testid="event-card"]', { timeout: 10000 });
    }
    expect(await page.screenshot({ fullPage: true })).toMatchSnapshot(
      `${route.replace(/[\/.]/g, '_')}.png`,
      { maxDiffPixels: 200 }
    );
  });
}
