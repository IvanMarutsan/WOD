import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPriceRangeLabel } from '../../modules/price-detail.js';

const formatMessage = (key) => {
  if (key === 'price_free') return 'Безкоштовно';
  if (key === 'price_tbd') return 'Ціна уточнюється';
  return '';
};

test('price detail shows single paid amount without range', () => {
  const label = formatPriceRangeLabel('paid', 120, null, formatMessage);
  assert.equal(label, 'DKK 120');
});

test('price detail shows paid range for min and max', () => {
  const label = formatPriceRangeLabel('paid', 120, 200, formatMessage);
  assert.equal(label, 'Ціна: 120 - 200 DKK');
});

test('price detail treats equal min and max as single price', () => {
  const label = formatPriceRangeLabel('paid', 120, 120, formatMessage);
  assert.equal(label, 'DKK 120');
});

test('price detail shows tbd when no paid values', () => {
  const label = formatPriceRangeLabel('paid', null, null, formatMessage);
  assert.equal(label, 'Ціна уточнюється');
});

test('price detail shows free label', () => {
  const label = formatPriceRangeLabel('free', null, null, formatMessage);
  assert.equal(label, 'Безкоштовно');
});
