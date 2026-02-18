const STORAGE_KEY = 'wod_saved_events';

const canUseStorage = () => typeof globalThis.localStorage !== 'undefined';

const parseSaved = (raw) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((value) => String(value || '').trim())
      .filter(Boolean);
  } catch (error) {
    return [];
  }
};

const writeSaved = (ids) => {
  if (!canUseStorage()) return;
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(new Set(ids))));
  } catch (error) {
    // Ignore storage failures.
  }
};

const emitSavedChange = (id, saved) => {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(
    new CustomEvent('wod:saved-events-changed', {
      detail: { id, saved, ids: Array.from(getSavedEventIds()) }
    })
  );
};

export const getSavedEventIds = () => {
  if (!canUseStorage()) return new Set();
  let raw = '';
  try {
    raw = globalThis.localStorage.getItem(STORAGE_KEY) || '';
  } catch (error) {
    return new Set();
  }
  return new Set(parseSaved(raw));
};

export const isSaved = (id, savedIds = getSavedEventIds()) =>
  Boolean(id) && savedIds.has(String(id));

export const toggleSaved = (id) => {
  const normalizedId = String(id || '').trim();
  if (!normalizedId) return false;
  const ids = getSavedEventIds();
  let saved = false;
  if (ids.has(normalizedId)) {
    ids.delete(normalizedId);
    saved = false;
  } else {
    ids.add(normalizedId);
    saved = true;
  }
  writeSaved(Array.from(ids));
  emitSavedChange(normalizedId, saved);
  return saved;
};

export const filterSavedEvents = (events, savedIds = getSavedEventIds()) =>
  (events || []).filter((event) => isSaved(event?.id, savedIds));

export const renderStarButton = (id, context = 'catalog') => {
  const normalizedId = String(id || '').trim();
  const saved = isSaved(normalizedId);
  const symbol = saved ? '★' : '☆';
  const label = saved ? 'Прибрати з вибраних' : 'Додати у вибрані';
  return `<button class="save-star save-star--${context}${saved ? ' is-saved' : ''}" type="button" data-action="toggle-saved" data-event-id="${normalizedId}" data-context="${context}" data-saved="${saved ? 'true' : 'false'}" aria-label="${label}" title="${label}"><span aria-hidden="true">${symbol}</span></button>`;
};
