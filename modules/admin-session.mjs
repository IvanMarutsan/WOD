import { hasAdminRole } from './auth.js';

export const isAdminSessionUser = (user, hasLocalSession = false) =>
  Boolean(hasLocalSession || (user && hasAdminRole(user)));

export const resolveAdminSession = async ({
  hasLocalSession = false,
  getIdentity = null,
  timeoutMs = 900
} = {}) => {
  if (hasLocalSession) return true;
  if (typeof getIdentity !== 'function') return false;

  let identity = null;
  try {
    identity = await getIdentity();
  } catch (error) {
    return false;
  }
  if (!identity) return false;

  const currentUser =
    typeof identity.currentUser === 'function' ? identity.currentUser() : null;
  if (isAdminSessionUser(currentUser, hasLocalSession)) return true;

  if (typeof identity.on !== 'function' || typeof identity.init !== 'function') {
    return false;
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(Boolean(value));
    };
    const timer = globalThis.setTimeout(() => finish(false), timeoutMs);
    identity.on('init', (user) => {
      globalThis.clearTimeout(timer);
      finish(isAdminSessionUser(user, hasLocalSession));
    });
    try {
      identity.init();
    } catch (error) {
      globalThis.clearTimeout(timer);
      finish(false);
    }
  });
};
