import { test, expect } from '@playwright/test';
import { watchConsole } from './utils/console';
import { freezeTime } from './setup.freeze-time';

const routes = ['/', '/index.html', '/event.html'];

for (const r of routes) {
  test(`smoke: ${r} renders without console errors`, async ({ page }) => {
    await freezeTime(page);
    const errs = watchConsole(page);
    await page.goto(r);
    await expect(page).toHaveTitle(/What's on DK\?|Події|Begivenheder|Design Systems Meetup/i);
    expect(errs, errs.join('\n')).toHaveLength(0);
  });
}
