import test from 'node:test';
import assert from 'node:assert/strict';
import { isArchivedEvent, mergeEventData } from '../../modules/event-status.mjs';

test('isArchivedEvent detects archived status consistently', () => {
  assert.equal(isArchivedEvent({ status: 'archived' }), true);
  assert.equal(isArchivedEvent({ archived: true, status: 'published' }), true);
  assert.equal(isArchivedEvent({ status: 'published' }), false);
  assert.equal(isArchivedEvent({}), false);
});

test('mergeEventData preserves archived fields when incoming data is partial', () => {
  const base = { id: 'evt-1', status: 'archived', archived: true, title: 'Base' };
  const incoming = { id: 'evt-1', title: 'Incoming' };
  const merged = mergeEventData(base, incoming);
  assert.equal(merged.archived, true);
  assert.equal(merged.status, 'archived');
  assert.equal(merged.title, 'Incoming');
});
