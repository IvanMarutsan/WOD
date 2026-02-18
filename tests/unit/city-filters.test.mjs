import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCityOptions,
  defaultNormalizeCity,
  matchCityFromQuery
} from '../../modules/filters.mjs';

test('defaultNormalizeCity trims and normalizes spacing', () => {
  assert.equal(defaultNormalizeCity('  København   '), 'københavn');
  assert.equal(defaultNormalizeCity('Copenhagen'), 'copenhagen');
  assert.equal(defaultNormalizeCity('Aalborg  DK'), 'aalborg dk');
});

test('buildCityOptions returns unique city values from active events', () => {
  const events = [
    { status: 'published', city: 'Copenhagen', start: '2026-01-01T10:00:00+01:00' },
    { status: 'published', city: ' Copenhagen ', start: '2026-01-02T10:00:00+01:00' },
    { status: 'published', city: 'Aarhus', start: '2026-01-03T10:00:00+01:00' },
    { status: 'published', city: 'Odense', format: 'online', start: '2026-01-03T11:00:00+01:00' },
    { status: 'archived', city: 'Odense', start: '2026-01-04T10:00:00+01:00' },
    { status: 'published', city: '', start: '2026-01-05T10:00:00+01:00' }
  ];
  const options = buildCityOptions(events, {
    normalizeCity: defaultNormalizeCity,
    isArchivedEvent: (event) => event.status === 'archived',
    isPast: () => false,
    getLang: () => 'da'
  });
  const values = options.map((option) => option.value);
  assert.deepEqual(values.sort(), ['aarhus', 'copenhagen']);
});

test('matchCityFromQuery returns a city value from available options', () => {
  const options = [
    { value: 'copenhagen', label: 'Copenhagen' },
    { value: 'aarhus', label: 'Aarhus' }
  ];
  const matched = matchCityFromQuery('Meetup in Aarhus', options, {
    normalizeCity: defaultNormalizeCity
  });
  assert.equal(matched, 'aarhus');
});
