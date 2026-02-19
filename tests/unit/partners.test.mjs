import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPublicPartners,
  normalizePartnersOrder,
  normalizePartnerSlug,
  sortPartners
} from '../../modules/partners.mjs';

test('getPublicPartners returns only active partners sorted by sort_order', () => {
  const list = [
    { id: '3', name: 'C', is_active: true, sort_order: 3 },
    { id: '2', name: 'B', is_active: false, sort_order: 1 },
    { id: '1', name: 'A', is_active: true, sort_order: 2 }
  ];
  const result = getPublicPartners(list);
  assert.deepEqual(
    result.map((item) => item.id),
    ['1', '3']
  );
});

test('sortPartners falls back to name when sort_order is equal', () => {
  const list = [
    { id: '2', name: 'Бета', sort_order: 0 },
    { id: '1', name: 'Альфа', sort_order: 0 }
  ];
  const result = sortPartners(list);
  assert.deepEqual(
    result.map((item) => item.id),
    ['1', '2']
  );
});

test('sortPartners keeps active partners above inactive and supports camelCase sortOrder', () => {
  const list = [
    { id: 'inactive-1', name: 'Zeta', isActive: false, sortOrder: 0 },
    { id: 'active-2', name: 'Beta', isActive: true, sortOrder: 2 },
    { id: 'active-1', name: 'Alpha', is_active: true, sort_order: 1 },
    { id: 'inactive-2', name: 'Alpha', is_active: false, sort_order: 0 }
  ];
  const result = sortPartners(list);
  assert.deepEqual(
    result.map((item) => item.id),
    ['active-1', 'active-2', 'inactive-2', 'inactive-1']
  );
});

test('normalizePartnerSlug handles spaces, symbols and cyrillic', () => {
  assert.equal(normalizePartnerSlug('  Waylight Partner  '), 'waylight-partner');
  assert.equal(normalizePartnerSlug('Партнер Дія'), 'partner-diia');
  assert.equal(normalizePartnerSlug('A&B / C'), 'a-b-c');
});

test('normalizePartnersOrder reassigns unique sequential positions 1..N', () => {
  const list = [
    { id: 'b', name: 'Beta', isActive: true, sortOrder: 1 },
    { id: 'a', name: 'Alpha', isActive: true, sortOrder: 1 },
    { id: 'z', name: 'Zulu', isActive: false, sortOrder: 1 }
  ];
  const normalized = normalizePartnersOrder(list);
  assert.deepEqual(
    normalized.map((item) => item.id),
    ['a', 'b', 'z']
  );
  assert.deepEqual(
    normalized.map((item) => item.sortOrder),
    [1, 2, 3]
  );
});
