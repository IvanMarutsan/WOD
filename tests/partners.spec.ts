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

  await form.locator('input[name="has_detail_page"]').check({ force: true });
  await form.locator('input[name="name"]').fill(partnerName);
  await form.locator('input[name="slug"]').fill(partnerSlug);
  await form.locator('input[name="website_url"]').fill('https://example.com/qa');
  await form.locator('input[name="sort_order"]').fill('1');
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

test('admin can save partner with basic fields only', async ({ page }) => {
  const uniq = Date.now();
  const website = `https://basic-${uniq}.example.com`;

  await enableAdminSession(page);
  await page.goto('/admin-page.html');
  await page.locator('a[href="./admin-partners.html"]').click();
  await expect(page).toHaveURL(/admin-partners\.html/);
  const form = page.locator('[data-admin-partner-form]');
  await expect(form).toBeVisible();

  await form.locator('input[name="website_url"]').fill(website);
  await form.locator('input[name="logo_file"]').setInputFiles({
    name: 'partner-basic.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2P4z8DwHwAE/wJ/lYt9NwAAAABJRU5ErkJggg==',
      'base64'
    )
  });
  await form.locator('button[type="submit"]').click();

  const expectedName = `basic-${uniq}.example.com`;
  const card = page.locator('[data-admin-partners-list] .admin-partner-card').first();
  await expect(card).toContainText(expectedName);
  await expect(card).toContainText(website);
});

test('admin partner card keeps action buttons visible with long website url', async ({ page }) => {
  const uniq = Date.now();
  const website = `https://very-long-partner-domain-${uniq}.example.com/very/long/path/that/should/not/push/actions/out/of/view`;

  await enableAdminSession(page);
  await page.goto('/admin-partners.html');
  await expect(page).toHaveURL(/admin-partners\.html/);
  const form = page.locator('[data-admin-partner-form]');
  await expect(form).toBeVisible();

  await form.locator('input[name="website_url"]').fill(website);
  await form.locator('button[type="submit"]').click();

  const card = page.locator('[data-admin-partners-list] .admin-partner-card').first();
  const editButton = card.locator('[data-action="edit-partner"]');
  const toggleButton = card.locator('[data-action="toggle-partner"]');
  const deleteButton = card.locator('[data-action="delete-partner"]');

  await expect(editButton).toBeVisible();
  await expect(toggleButton).toBeVisible();
  await expect(deleteButton).toBeVisible();

  const [cardRect, editRect, toggleRect, deleteRect, viewportWidth] = await Promise.all([
    card.boundingBox(),
    editButton.boundingBox(),
    toggleButton.boundingBox(),
    deleteButton.boundingBox(),
    page.evaluate(() => window.innerWidth)
  ]);

  expect(cardRect).toBeTruthy();
  expect(editRect).toBeTruthy();
  expect(toggleRect).toBeTruthy();
  expect(deleteRect).toBeTruthy();

  const buttonsRight = Math.max(
    (editRect?.x || 0) + (editRect?.width || 0),
    (toggleRect?.x || 0) + (toggleRect?.width || 0),
    (deleteRect?.x || 0) + (deleteRect?.width || 0)
  );
  expect(buttonsRight).toBeLessThanOrEqual(viewportWidth + 1);
});
