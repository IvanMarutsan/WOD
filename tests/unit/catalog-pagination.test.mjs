import test from 'node:test';
import assert from 'node:assert/strict';
import { clampPage, getPageSlice, getTotalPages } from '../../modules/catalog-pagination.mjs';

test('getTotalPages returns at least 1 and rounds up', () => {
  assert.equal(getTotalPages(0, 16), 1);
  assert.equal(getTotalPages(1, 16), 1);
  assert.equal(getTotalPages(16, 16), 1);
  assert.equal(getTotalPages(17, 16), 2);
});

test('clampPage bounds page within total', () => {
  assert.equal(clampPage(0, 5), 1);
  assert.equal(clampPage(6, 5), 5);
  assert.equal(clampPage(3, 5), 3);
});

test('getPageSlice returns correct items for page', () => {
  const list = Array.from({ length: 40 }, (_, i) => i + 1);
  const page1 = getPageSlice(list, 1, 16);
  assert.deepEqual(page1.items, list.slice(0, 16));
  assert.equal(page1.totalPages, 3);

  const page3 = getPageSlice(list, 3, 16);
  assert.deepEqual(page3.items, list.slice(32, 40));
  assert.equal(page3.currentPage, 3);
});
