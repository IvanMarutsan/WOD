import { test, expect } from '@playwright/test';
import { enableAdminSession } from './helpers';

test('homepage renders partners section and carousel arrows move cards', async ({ page }) => {
  await page.setViewportSize({ width: 960, height: 900 });
  await page.goto('/');
  const section = page.locator('[data-partners-section]');
  await expect(section).toBeVisible();

  const prev = page.locator('[data-partners-prev]');
  const next = page.locator('[data-partners-next]');
  await expect(next).toBeEnabled();
  await expect(prev).toBeDisabled();
  await next.click();
  await expect(prev).toBeEnabled();
});

test('partner without detail page opens external site in new tab', async ({ page }) => {
  await page.goto('/');
  const externalLink = page.locator('.partner-card__logo-link[target="_blank"]').first();
  await expect(externalLink).toBeVisible();
  const [popup] = await Promise.all([page.waitForEvent('popup'), externalLink.click()]);
  await popup.waitForLoadState('domcontentloaded');
  expect(popup.url()).toMatch(/^https?:\/\//);
});

test('partner page opens and renders base content', async ({ page }) => {
  await page.goto('/');
  const detailLink = page.locator('.partner-card__logo-link[href*="partner.html?slug="]').first();
  await expect(detailLink).toBeVisible();
  await detailLink.click();
  await expect(page).toHaveURL(/partner\.html\?slug=/);
  await expect(page.locator('[data-partner-title]')).not.toHaveText('');
  await expect(page.locator('[data-partner-article]')).toBeVisible();
});

test('admin can create active partner with logo and it appears on homepage', async ({ page }) => {
  const uniq = Date.now();
  const partnerName = `Partner QA ${uniq}`;
  const partnerSlug = `partner-qa-${uniq}`;

  await enableAdminSession(page);
  await page.goto('/admin-page.html');
  await page.locator('a[href="./admin-partners.html"]').click();
  await expect(page).toHaveURL(/admin-partners\.html/);
  const form = page.locator('[data-admin-partner-form]');
  await expect(form).toBeVisible();

  await form.locator('input[name="name"]').fill(partnerName);
  await form.locator('input[name="slug"]').fill(partnerSlug);
  await form.locator('input[name="website_url"]').fill('https://example.com/qa');
  await form.locator('input[name="sort_order"]').fill('1');
  await form.locator('input[name="has_detail_page"]').check({ force: true });
  await form.locator('textarea[name="detail_description"]').fill('QA description for partner detail page.');
  await form.locator('textarea[name="detail_for_whom"]').fill('Для тестування');
  await form.locator('input[name="detail_cta_label"]').fill('Відкрити сайт');
  await form.locator('input[name="detail_cta_url"]').fill('https://example.com/qa');
  await form.locator('input[name="logo_file"]').setInputFiles({
    name: 'partner.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2P4z8DwHwAE/wJ/lYt9NwAAAABJRU5ErkJggg==',
      'base64'
    )
  });
  await form.locator('button[type="submit"]').click();

  await expect(page.locator('[data-admin-partners-list] .admin-partner-card')).toContainText(partnerName);

  await page.goto('/');
  await expect(page.locator('[data-partners-section]')).toBeVisible();
  await expect(page.locator(`.partner-card a[href*="partner.html?slug=${partnerSlug}"]`).first()).toBeVisible();
});
