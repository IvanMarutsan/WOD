import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { freezeTime } from './setup.freeze-time';

const events = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'events.json'), 'utf-8')
);

const PAGE_SIZE = 15;
const FIXED_NOW = new Date('2026-01-03T12:00:00+01:00');

const normalize = (value: unknown) => String(value || '').toLowerCase();

const isArchivedEvent = (event: any) => event?.archived === true || event?.status === 'archived';

const isPast = (event: any, now: Date) => {
  const endValue = event?.end;
  const startValue = event?.start;
  if (endValue) {
    const endDate = new Date(endValue);
    return !Number.isNaN(endDate.getTime()) && endDate < now;
  }
  if (!startValue) return false;
  const startDate = new Date(startValue);
  return !Number.isNaN(startDate.getTime()) && startDate < now;
};

const getWindowRange = (showPast: boolean, now: Date, windowOffset = 0) => {
  if (showPast) {
    const end = new Date(now);
    end.setMonth(end.getMonth() - windowOffset);
    const start = new Date(end);
    start.setMonth(start.getMonth() - 1);
    return { start, end };
  }
  const start = new Date(now);
  start.setMonth(start.getMonth() + windowOffset);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { start, end };
};

const matchesFilters = (event: any, filters: any, now: Date) => {
  if (isArchivedEvent(event)) return false;
  if (event.status !== 'published') return false;

  if (filters.showPast) {
    if (!isPast(event, now)) return false;
  } else if (isPast(event, now)) {
    return false;
  }

  const startDate = new Date(event.start);
  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom);
    if (startDate < from) return false;
  }
  if (filters.dateTo) {
    const to = new Date(filters.dateTo);
    to.setHours(23, 59, 59, 999);
    if (startDate > to) return false;
  }
  if (filters.quickToday) {
    const today = new Date(now);
    if (
      startDate.getFullYear() !== today.getFullYear() ||
      startDate.getMonth() !== today.getMonth() ||
      startDate.getDate() !== today.getDate()
    ) {
      return false;
    }
  }
  if (filters.quickTomorrow) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (
      startDate.getFullYear() !== tomorrow.getFullYear() ||
      startDate.getMonth() !== tomorrow.getMonth() ||
      startDate.getDate() !== tomorrow.getDate()
    ) {
      return false;
    }
  }
  if (filters.quickWeekend) {
    const day = startDate.getDay();
    if (day !== 0 && day !== 6) return false;
  }
  if (filters.quickOnline && normalize(event.format) !== 'online') return false;
  if (filters.city && normalize(event.city) !== normalize(filters.city)) return false;
  if (filters.price && normalize(event.priceType) !== normalize(filters.price)) return false;
  if (filters.format && normalize(event.format) !== normalize(filters.format)) return false;
  if (filters.tags.length) {
    const eventTags = (event.tags || [])
      .map((tag: any) => (typeof tag === 'string' ? tag : tag?.label || ''))
      .map((tag: string) => normalize(tag));
    for (const tag of filters.tags) {
      if (!eventTags.includes(normalize(tag))) return false;
    }
  }

  return true;
};

const filterEvents = (filters: any, now: Date) => {
  const baseList = events.filter((event: any) => matchesFilters(event, filters, now));
  const hasDateFilter = Boolean(filters.dateFrom || filters.dateTo);
  const range = hasDateFilter ? null : getWindowRange(Boolean(filters.showPast), now);
  const filtered = range
    ? baseList.filter((event: any) => {
        const startDate = new Date(event.start);
        return startDate >= range.start && startDate < range.end;
      })
    : baseList.slice();

  if (filters.showPast) {
    filtered.sort((a: any, b: any) => {
      const aDate = new Date(a.end || a.start || 0).getTime();
      const bDate = new Date(b.end || b.start || 0).getTime();
      return bDate - aDate;
    });
  } else {
    filtered.sort((a: any, b: any) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }

  return Math.min(PAGE_SIZE, filtered.length);
};

const mulberry32 = (seed: number) => {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const pickSample = <T,>(list: T[], count: number, rand: () => number) => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
};

test('random filter clicks match rendered data', async ({ page }) => {
  await freezeTime(page);
  await Promise.all([
    page.waitForResponse(/data\/events\.json/),
    page.goto('/main-page.html')
  ]);
  await page.waitForSelector('[data-testid="event-card"]', { state: 'visible' });

  const rand = mulberry32(20260103);
  const resetButton = page.getByTestId('filters-reset');
  const searchInput = page.getByTestId('search-input');
  const advancedToggle = page.locator('[data-action="filters-advanced"]');
  const advancedPanel = page.locator('#filters-advanced');
  const ensureAdvancedOpen = async () => {
    if ((await advancedToggle.getAttribute('aria-expanded')) !== 'true') {
      await advancedToggle.click();
    }
    await expect(advancedPanel).toBeVisible();
  };

  const cityOptions = ['', 'copenhagen', 'aarhus', 'odense', 'aalborg', 'esbjerg'];
  const priceOptions = ['', 'free', 'paid'];
  const formatOptions = ['', 'online', 'offline'];

  const actions = [
    async () => page.locator('[data-quick="today"]').click(),
    async () => page.locator('[data-quick="tomorrow"]').click(),
    async () => page.locator('[data-quick="weekend"]').click(),
    async () => page.locator('[data-quick="online"]').click(),
    async () => {
      const toggle = page.locator('input[name="show-past"]');
      const label = page.locator('label:has(input[name="show-past"])');
      const checked = await toggle.isChecked();
      await label.click();
      await expect(toggle).toBeChecked({ checked: !checked });
    },
    async () => {
      const value = cityOptions[Math.floor(rand() * cityOptions.length)];
      await page.locator('select[name="city"]').selectOption(value);
    },
    async () => {
      await ensureAdvancedOpen();
      const labels = page.locator('[data-filters-tags-list] label');
      const count = await labels.count();
      if (!count) return;
      const index = Math.floor(rand() * count);
      await labels.nth(index).click();
    },
    async () => {
      await ensureAdvancedOpen();
      const select = page.locator('select[name="price"]');
      await expect(select).toBeVisible();
      const value = priceOptions[Math.floor(rand() * priceOptions.length)];
      await select.selectOption(value);
    },
    async () => {
      await ensureAdvancedOpen();
      const select = page.locator('select[name="format"]');
      await expect(select).toBeVisible();
      const value = formatOptions[Math.floor(rand() * formatOptions.length)];
      await select.selectOption(value);
    },
    async () => {
      await ensureAdvancedOpen();
      const labels = page.locator('[data-filters-tags-list] label');
      const count = await labels.count();
      if (!count) return;
      await labels.nth(Math.floor(rand() * count)).click();
    }
  ];

  for (let i = 0; i < 6; i += 1) {
    await resetButton.click();
    await expect(page.locator('input[name="show-past"]')).not.toBeChecked();
    await expect(advancedToggle).toHaveAttribute('aria-expanded', 'false');
    await searchInput.fill('');

    if ((await advancedToggle.getAttribute('aria-expanded')) !== 'true') {
      await advancedToggle.click();
    }

    const sample = pickSample(actions, 4 + Math.floor(rand() * 4), rand);
    for (const action of sample) {
      await action();
    }

    const filters = await page.evaluate(() => {
      const form = document.querySelector('.filters') as HTMLFormElement | null;
      const fd = form ? new FormData(form) : new FormData();
      return {
        dateFrom: fd.get('date-from') || '',
        dateTo: fd.get('date-to') || '',
        city: fd.get('city') || '',
        price: fd.get('price') || '',
        format: fd.get('format') || '',
        quickToday: Boolean(fd.get('quick-today')),
        quickTomorrow: Boolean(fd.get('quick-tomorrow')),
        quickWeekend: Boolean(fd.get('quick-weekend')),
        quickOnline: Boolean(fd.get('quick-online')),
        showPast: Boolean(fd.get('show-past')),
        tags: fd.getAll('tags')
      };
    });

    const expectedVisible = filterEvents(filters, FIXED_NOW);

    await expect
      .poll(async () => page.locator('[data-testid="event-card"]').count(), { timeout: 5000 })
      .toBe(expectedVisible);

    const countText = await page.locator('.filters__count').innerText();
    const count = Number(countText.match(/\d+/)?.[0]);
    expect(count).toBe(expectedVisible);
  }
});
