import test from 'node:test';
import assert from 'node:assert/strict';
import { buildShareText, getShareUrl } from '../../modules/share.mjs';

test('getShareUrl appends utm params with channel', () => {
  const base = 'https://whatsondk.netlify.app/event-card.html?id=evt-1';
  const url = new URL(getShareUrl({ id: 'evt-1' }, 'telegram', base));

  assert.equal(url.searchParams.get('utm_source'), 'share');
  assert.equal(url.searchParams.get('utm_medium'), 'web');
  assert.equal(url.searchParams.get('utm_campaign'), 'event');
  assert.equal(url.searchParams.get('utm_content'), 'telegram');
});

test('buildShareText returns compact title/date/city/link', () => {
  const event = {
    title: 'Community Meetup',
    start: '2026-03-10T18:00:00+01:00',
    city: 'Copenhagen'
  };
  const link = 'https://whatsondk.netlify.app/event-card.html?id=evt-1&utm_content=native';
  const text = buildShareText(event, link);

  assert.match(text, /Community Meetup/);
  assert.match(text, /Copenhagen/);
  assert.match(text, /https:\/\/whatsondk\.netlify\.app\/event-card\.html/);
});
