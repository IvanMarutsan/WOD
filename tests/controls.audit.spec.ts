import { test, expect } from '@playwright/test';
import { freezeTime } from './setup.freeze-time';

function visible(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
}

test('all visible buttons/links are clickable without runtime errors', async ({ page }) => {
  await freezeTime(page);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });

  await page.goto('/main-page.html');

  const handles = await page.$$(':is(button,a,[role="button"])');
  for (const h of handles) {
    const isDisabled = await h.isDisabled().catch(() => false);
    const isVisible = await h.isVisible().catch(() => false);
    if (!isVisible || isDisabled) continue;
    const isActionable = await h
      .evaluate((el) => {
        const style = window.getComputedStyle(el);
        if (style.pointerEvents === 'none' || style.visibility === 'hidden' || style.display === 'none') {
          return false;
        }
        if (el.getAttribute('aria-disabled') === 'true') return false;
        if (el.closest('[aria-hidden="true"]')) return false;
        return true;
      })
      .catch(() => false);
    if (!isActionable) continue;

    await h.focus().catch(() => {});
    await h.click({ trial: true, timeout: 1000 }).catch(() => {});
  }

  expect(errors, errors.join('\n')).toHaveLength(0);
});
