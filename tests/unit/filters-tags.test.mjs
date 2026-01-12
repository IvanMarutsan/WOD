import test from 'node:test';
import assert from 'node:assert/strict';
import { getAvailableTags } from '../../modules/filters.mjs';

test('getAvailableTags returns unique tags from provided events', () => {
  const events = [
    { tags: [{ label: 'music' }, { label: 'community' }] },
    { tags: [{ label: 'community' }, { label: 'volunteer' }] }
  ];
  const tags = getAvailableTags(events, {
    getTagList: (tags) => (tags || []).map((tag) => ({ label: tag?.label || tag }))
  });
  const labels = tags.map((tag) => tag.label.toLowerCase());
  assert.deepEqual(labels.sort(), ['community', 'music', 'volunteer']);
});

test('getAvailableTags ignores tags outside filtered events', () => {
  const filteredEvents = [{ tags: [{ label: 'art' }] }];
  const tags = getAvailableTags(filteredEvents, {
    getTagList: (tags) => (tags || []).map((tag) => ({ label: tag?.label || tag }))
  });
  assert.deepEqual(tags.map((tag) => tag.value), ['art']);
});

test('getAvailableTags can localize tag labels', () => {
  const events = [{ tags: [{ label: 'design' }] }];
  const tags = getAvailableTags(events, {
    getTagList: (tags) => (tags || []).map((tag) => ({ label: tag?.label || tag })),
    getLocalizedTag: (value) => `ua-${value}`,
    getLang: () => 'uk'
  });
  assert.deepEqual(tags.map((tag) => tag.label), ['ua-design']);
});
