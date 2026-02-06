import test from 'node:test';
import assert from 'node:assert/strict';
import { filterWeeklyEvents, getWeekRange } from '../../modules/filters.mjs';

test('getWeekRange returns Monday to Sunday for a midweek date', () => {
  const now = new Date('2026-01-07T12:00:00+01:00'); // Wednesday
  const { start, end } = getWeekRange(now);
  assert.equal(start.getDay(), 1);
  assert.equal(start.getHours(), 0);
  assert.equal(start.getMinutes(), 0);
  assert.equal(start.getSeconds(), 0);
  assert.equal(start.getMilliseconds(), 0);
  assert.equal(end.getDay(), 0);
  assert.equal(end.getHours(), 23);
  assert.equal(end.getMinutes(), 59);
  assert.equal(end.getSeconds(), 59);
});

test('filterWeeklyEvents includes Sunday but excludes next Monday', () => {
  const now = new Date('2026-01-03T12:00:00+01:00'); // Saturday
  const events = [
    {
      id: 'evt-sun',
      status: 'published',
      start: '2026-01-04T10:00:00+01:00'
    },
    {
      id: 'evt-next-mon',
      status: 'published',
      start: '2026-01-05T10:00:00+01:00'
    }
  ];
  const filtered = filterWeeklyEvents(events, now);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'evt-sun');
});
