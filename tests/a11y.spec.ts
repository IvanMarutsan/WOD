import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { freezeTime } from './setup.freeze-time';

const pages = ['/main-page.html', '/event-card.html'];

for (const url of pages) {
  test(`a11y: ${url} has no serious violations`, async ({ page }) => {
    await freezeTime(page);
    await page.goto(url);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact || ''));
    expect(serious, JSON.stringify(serious, null, 2)).toHaveLength(0);
  });
}
