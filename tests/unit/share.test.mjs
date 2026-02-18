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
  assert.equal(url.searchParams.get('id'), 'evt-1');
  assert.equal(url.searchParams.get('t'), null);
  assert.equal(url.searchParams.get('d'), null);
  assert.equal(url.searchParams.get('i'), null);
});

test('buildShareText returns compact title/date/city without link by default', () => {
  const event = {
    title: 'Community Meetup',
    start: '2026-03-10T18:00:00+01:00',
    city: 'Copenhagen'
  };
  const text = buildShareText(event);

  assert.match(text, /Community Meetup/);
  assert.match(text, /Copenhagen/);
  assert.doesNotMatch(text, /https?:\/\//);
});

test('buildShareText can include link when explicitly requested', () => {
  const event = {
    title: 'Community Meetup',
    start: '2026-03-10T18:00:00+01:00',
    city: 'Copenhagen'
  };
  const link = 'https://whatsondk.netlify.app/event-card.html?id=evt-1&utm_content=native';
  const text = buildShareText(event, { shareUrl: link, includeUrl: true });

  assert.match(text, /https:\/\/whatsondk\.netlify\.app\/event-card\.html/);
});
