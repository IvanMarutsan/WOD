import test from 'node:test';
import assert from 'node:assert/strict';
import { filterWeeklyEvents, getWeekRange } from '../../modules/filters.mjs';

const formatInCopenhagen = (value) =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Copenhagen',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(value);

test('getWeekRange returns Monday to Sunday for a midweek date', () => {
  const now = new Date('2026-01-07T12:00:00+01:00'); // Wednesday
  const { start, end } = getWeekRange(now);
  assert.equal(formatInCopenhagen(start), '2026-01-05 00:00:00');
  assert.equal(formatInCopenhagen(end), '2026-01-11 23:59:59');
});

test('filterWeeklyEvents uses now..endOfWeek inclusive in Europe/Copenhagen', () => {
  const now = new Date('2026-01-07T12:00:00+01:00'); // Wednesday
  const events = [
    {
      id: 'evt-before-now',
      status: 'published',
      start: '2026-01-07T10:00:00+01:00'
    },
    {
      id: 'evt-same-day-after-now',
      status: 'published',
      start: '2026-01-07T20:00:00+01:00'
    },
    {
      id: 'evt-sunday-edge',
      status: 'published',
      start: '2026-01-11T23:59:59+01:00'
    },
    {
      id: 'evt-next-mon',
      status: 'published',
      start: '2026-01-12T00:00:00+01:00'
    }
  ];
  const filtered = filterWeeklyEvents(events, now);
  assert.deepEqual(
    filtered.map((event) => event.id),
    ['evt-same-day-after-now', 'evt-sunday-edge']
  );
});

test('filterWeeklyEvents on Sunday includes Sunday only', () => {
  const now = new Date('2026-01-11T09:00:00+01:00'); // Sunday
  const events = [
    { id: 'evt-sunday', status: 'published', start: '2026-01-11T12:00:00+01:00' },
    { id: 'evt-next-week', status: 'published', start: '2026-01-12T09:00:00+01:00' }
  ];
  const filtered = filterWeeklyEvents(events, now);
  assert.deepEqual(filtered.map((event) => event.id), ['evt-sunday']);
});
