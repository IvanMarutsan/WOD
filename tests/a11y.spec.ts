import { test, expect } from './test-setup';
import AxeBuilder from '@axe-core/playwright';

const pages = ['/', '/events', '/organizer.html', '/dashboard-new.html', '/legal-privacy.html'];

for (const url of pages) {
  test(`a11y: ${url} has no critical violations`, async ({ page }) => {
    await page.goto(url);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    const critical = results.violations.filter(
      (violation) => violation.impact === 'critical' || violation.impact === 'serious'
    );
    expect(critical, JSON.stringify(critical, null, 2)).toHaveLength(0);
  });
}
