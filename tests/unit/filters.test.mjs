import test from 'node:test';
import assert from 'node:assert/strict';
import { eventMatchesFilters } from '../../modules/filters.mjs';

const helpers = {
  normalize: (value) => String(value || '').toLowerCase(),
  isPast: (event) => Boolean(event.past),
  isArchivedEvent: (event) => Boolean(event.archived),
  getCitySlug: (value) => {
    const normalized = String(value || '').toLowerCase();
    if (normalized === 'копенгаген') return 'copenhagen';
    return normalized;
  },
  getTagList: (tags) => (tags || []).map((label) => ({ label })),
  getLocalizedEventTitle: (event) => event.title,
  getLocalizedCity: (value) => value,
  getLocalizedTag: (value) => value,
  getLang: () => 'uk'
};

test('tags filter matches any selected tag', () => {
  const event = { status: 'published', tags: ['music', 'community'] };
  const filters = { tags: ['music', 'art'] };
  assert.equal(eventMatchesFilters(event, filters, helpers), true);

  const miss = { status: 'published', tags: ['sports'] };
  assert.equal(eventMatchesFilters(miss, filters, helpers), false);
});

test('city filter matches slugged city', () => {
  const event = { status: 'published', city: 'Копенгаген' };
  const filters = { city: 'copenhagen' };
  assert.equal(eventMatchesFilters(event, filters, helpers), true);
});

test('past filter hides past events unless showPast is set', () => {
  const event = { status: 'published', past: true };
  assert.equal(eventMatchesFilters(event, { showPast: false }, helpers), false);
  assert.equal(eventMatchesFilters(event, { showPast: true }, helpers), true);
});
