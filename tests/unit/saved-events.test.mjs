import test from 'node:test';
import assert from 'node:assert/strict';
import { getSavedEventIds, isSaved, toggleSaved } from '../../modules/saved-events.js';

const createStorage = (initial = {}) => {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    }
  };
};

const originalStorage = globalThis.localStorage;
const originalWindow = globalThis.window;
const originalCustomEvent = globalThis.CustomEvent;

test.afterEach(() => {
  if (originalStorage === undefined) {
    delete globalThis.localStorage;
  } else {
    globalThis.localStorage = originalStorage;
  }
  if (originalWindow === undefined) {
    delete globalThis.window;
  } else {
    globalThis.window = originalWindow;
  }
  if (originalCustomEvent === undefined) {
    delete globalThis.CustomEvent;
  } else {
    globalThis.CustomEvent = originalCustomEvent;
  }
});

test('toggleSaved adds and removes ids with persistence', () => {
  const storage = createStorage();
  globalThis.localStorage = storage;
  globalThis.window = { dispatchEvent() {} };
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  };

  assert.equal(isSaved('evt-1'), false);
  assert.equal(toggleSaved('evt-1'), true);
  assert.equal(isSaved('evt-1'), true);
  assert.deepEqual(Array.from(getSavedEventIds()), ['evt-1']);

  assert.equal(toggleSaved('evt-1'), false);
  assert.equal(isSaved('evt-1'), false);
  assert.deepEqual(Array.from(getSavedEventIds()), []);
});

test('getSavedEventIds ignores corrupted storage json', () => {
  const storage = createStorage({ wod_saved_events: '{bad-json' });
  globalThis.localStorage = storage;
  assert.deepEqual(Array.from(getSavedEventIds()), []);
});

test('getSavedEventIds ignores non-array payloads', () => {
  const storage = createStorage({ wod_saved_events: '{"id":"evt-1"}' });
  globalThis.localStorage = storage;
  assert.deepEqual(Array.from(getSavedEventIds()), []);
});
