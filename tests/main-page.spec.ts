import { test, expect } from '@playwright/test';
import { freezeTime } from './setup.freeze-time';
import { waitForEventsRendered } from './helpers';

test('main page renders key sections and hides add-event CTA', async ({ page }) => {
  await freezeTime(page);
  await page.goto('/main-page.html');
  await waitForEventsRendered(page);

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('#events')).toBeVisible();

  const addEventLinks = page.getByRole('link', { name: /Додати подію/i });
  await expect(addEventLinks).toHaveCount(0);
});

test('hero CTA navigates to catalog anchor', async ({ page }) => {
  await freezeTime(page);
  await page.goto('/main-page.html');

  const cta = page.getByRole('link', { name: /Переглянути події/i });
  await cta.click();
  await expect(page.locator('#events')).toBeInViewport();
});

test('advanced filters toggle is controlled only by the button', async ({ page }) => {
  await freezeTime(page);
  await page.goto('/main-page.html');

  const advancedToggle = page.locator('[data-action="filters-advanced"]');
  const advancedPanel = page.locator('#filters-advanced');

  await expect(advancedPanel).toBeHidden();
  await expect(advancedToggle).toHaveAttribute('aria-expanded', 'false');

  await advancedToggle.click();
  await expect(advancedPanel).toBeVisible();
  await expect(advancedToggle).toHaveAttribute('aria-expanded', 'true');

  await advancedToggle.click();
  await expect(advancedPanel).toBeHidden();
  await expect(advancedToggle).toHaveAttribute('aria-expanded', 'false');
});

test('quick presets do not auto-open advanced filters', async ({ page }) => {
  await freezeTime(page);
  await page.goto('/main-page.html');

  const advancedPanel = page.locator('#filters-advanced');
  const advancedToggle = page.locator('[data-action="filters-advanced"]');

  await page.getByRole('button', { name: /Онлайн/i }).click();
  await page.locator('input[name="show-past"]').setChecked(true, { force: true });

  await expect(advancedPanel).toBeHidden();
  await expect(advancedToggle).toHaveAttribute('aria-expanded', 'false');
});

test('navigation links go to expected pages/anchors', async ({ page }) => {
  await freezeTime(page);
  await page.goto('/main-page.html');

  const nav = page.getByRole('navigation', { name: /Основна навігація/i });

  await nav.getByRole('link', { name: /^Події$/ }).click();
  await expect(page.locator('#events')).toBeInViewport();

  await nav.getByRole('link', { name: /^Про нас$/ }).click();
  await expect(page).toHaveURL(/about\.html/);

  await page.goBack();
  await nav.getByRole('link', { name: /^Контакти$/ }).click();
  await expect(page).toHaveURL(/contacts\.html/);
});

test('filters update URL and reset clears selections', async ({ page }) => {
  await freezeTime(page);
  await page.goto('/main-page.html');
  await waitForEventsRendered(page);

  await page.getByRole('combobox', { name: /Місто/i }).selectOption({ value: 'aarhus' });
  await expect(page).toHaveURL(/city=aarhus/);

  await page.getByRole('button', { name: /Вихідні/i }).click();
  await expect(page).toHaveURL(/weekend=1/);

  await page.locator('input[name="show-past"]').setChecked(true, { force: true });
  await expect(page).toHaveURL(/past=1/);

  await page.getByTestId('filters-reset').click();
  await expect(page).not.toHaveURL(/city=|weekend=|past=1/);
});

test('show more scrolls back to catalog start', async ({ page }) => {
  await freezeTime(page);
  await page.goto('/main-page.html');
  await waitForEventsRendered(page);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const before = await page.evaluate(() => window.scrollY);

  await page.getByRole('button', { name: /Показати наступні події/i }).click();
  await page.waitForTimeout(300);

  const after = await page.evaluate(() => window.scrollY);
  expect(after).toBeLessThan(before);
});

test('event card actions link to details', async ({ page }) => {
  await freezeTime(page);
  await page.goto('/main-page.html');
  await waitForEventsRendered(page);

  const firstCard = page.getByTestId('event-card').first();
  const details = firstCard.getByRole('link', { name: /Детальніше/i });
  await expect(details).toHaveAttribute('href', /event-card\.html\?id=/);
  await details.click();
  await expect(page).toHaveURL(/event-card\.html\?id=/);
});
