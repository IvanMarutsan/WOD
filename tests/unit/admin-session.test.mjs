import test from 'node:test';
import assert from 'node:assert/strict';
import { isAdminSessionUser, resolveAdminSession } from '../../modules/admin-session.mjs';

test('isAdminSessionUser resolves admin by role or local session', () => {
  assert.equal(isAdminSessionUser({ app_metadata: { roles: ['admin'] } }), true);
  assert.equal(isAdminSessionUser({ app_metadata: { roles: ['editor'] } }), false);
  assert.equal(isAdminSessionUser(null, true), true);
});

test('resolveAdminSession returns true for local session without identity', async () => {
  const result = await resolveAdminSession({ hasLocalSession: true });
  assert.equal(result, true);
});

test('resolveAdminSession returns true when identity currentUser is admin', async () => {
  const identity = {
    currentUser: () => ({ app_metadata: { roles: ['admin'] } }),
    on() {},
    init() {}
  };
  const result = await resolveAdminSession({
    getIdentity: async () => identity,
    timeoutMs: 20
  });
  assert.equal(result, true);
});

test('resolveAdminSession waits for init callback and resolves admin', async () => {
  let onInit = null;
  const identity = {
    currentUser: () => null,
    on(event, handler) {
      if (event === 'init') onInit = handler;
    },
    init() {
      setTimeout(() => {
        if (onInit) onInit({ app_metadata: { roles: ['admin'] } });
      }, 5);
    }
  };
  const result = await resolveAdminSession({
    getIdentity: async () => identity,
    timeoutMs: 40
  });
  assert.equal(result, true);
});

test('resolveAdminSession returns false on timeout for non-admin init', async () => {
  const identity = {
    currentUser: () => null,
    on() {},
    init() {}
  };
  const result = await resolveAdminSession({
    getIdentity: async () => identity,
    timeoutMs: 10
  });
  assert.equal(result, false);
});
