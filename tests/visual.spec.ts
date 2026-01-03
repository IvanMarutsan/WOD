import { test, expect } from '@playwright/test';

const routes = ['/', '/events', '/dashboard.html', '/dashboard-new.html', '/event.html'];

for (const route of routes) {
  test(`visual: ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    expect(await page.screenshot({ fullPage: true })).toMatchSnapshot(
      `${route.replace(/[\/.]/g, '_')}.png`,
      { maxDiffPixels: 200 }
    );
  });
}
