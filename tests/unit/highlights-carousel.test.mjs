import test from 'node:test';
import assert from 'node:assert/strict';
import { getMaxScrollLeft, getNextScrollLeft } from '../../modules/highlights-carousel.mjs';

test('carousel navigation can reach last item without off-by-one', () => {
  const totalItems = 16;
  const visibleItems = 3;
  const cardWidth = 260;
  const gap = 12;
  const step = cardWidth + gap;
  const scrollWidth = totalItems * cardWidth + (totalItems - 1) * gap;
  const clientWidth = visibleItems * cardWidth + (visibleItems - 1) * gap;
  const max = getMaxScrollLeft(scrollWidth, clientWidth);

  let left = 0;
  for (let index = 0; index < totalItems; index += 1) {
    left = getNextScrollLeft(left, 1, step, max);
  }

  assert.equal(left, max);
});
