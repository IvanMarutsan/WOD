const LOCAL_EVENTS_KEY = 'wodLocalEvents';
const LOCAL_DELETED_KEY = 'wodDeletedEvents';
const LOCAL_AUDIT_KEY = 'wodAuditLog';

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch (error) {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    return;
  }
};

export const getLocalEvents = () => {
  const list = readJson(LOCAL_EVENTS_KEY, []);
  return Array.isArray(list) ? list : [];
};

export const getDeletedEventIds = () => {
  const list = readJson(LOCAL_DELETED_KEY, []);
  return new Set(Array.isArray(list) ? list : []);
};

export const getAuditLog = () => {
  const list = readJson(LOCAL_AUDIT_KEY, []);
  return Array.isArray(list) ? list : [];
};

export const addAuditEntry = (entry) => {
  const log = getAuditLog();
  log.unshift(entry);
  writeJson(LOCAL_AUDIT_KEY, log.slice(0, 200));
};

const writeLocalEvents = (events) => {
  writeJson(LOCAL_EVENTS_KEY, events);
};

const writeDeletedIds = (ids) => {
  writeJson(LOCAL_DELETED_KEY, Array.from(ids));
};

export const mergeWithLocalEvents = (events) => {
  const deleted = getDeletedEventIds();
  const local = getLocalEvents();
  const map = new Map();
  events.forEach((event) => {
    if (event?.id && !deleted.has(event.id)) {
      map.set(event.id, event);
    }
  });
  local.forEach((event) => {
    if (event?.id && !deleted.has(event.id)) {
      map.set(event.id, event);
    }
  });
  return Array.from(map.values());
};

export const upsertLocalEvent = (event, actorEmail) => {
  if (!event?.id) return null;
  const events = getLocalEvents();
  const index = events.findIndex((item) => item.id === event.id);
  const ts = new Date().toISOString();
  const nextEvent = { ...event, updatedAt: ts };
  if (index === -1) {
    events.unshift({ ...nextEvent, createdAt: ts });
    addAuditEntry({ id: event.id, title: event.title || '—', action: 'publish', actorEmail, ts });
  } else {
    events[index] = { ...events[index], ...nextEvent };
    addAuditEntry({ id: event.id, title: event.title || '—', action: 'edit', actorEmail, ts });
  }
  writeLocalEvents(events);
  return nextEvent;
};

export const archiveLocalEvent = (event, actorEmail) => {
  if (!event?.id) return null;
  const events = getLocalEvents();
  const index = events.findIndex((item) => item.id === event.id);
  const ts = new Date().toISOString();
  const updated = {
    ...event,
    archived: true,
    status: 'archived',
    updatedAt: ts
  };
  if (index === -1) {
    events.unshift(updated);
  } else {
    events[index] = { ...events[index], ...updated };
  }
  writeLocalEvents(events);
  addAuditEntry({ id: event.id, title: event.title || '—', action: 'archive', actorEmail, ts });
  return updated;
};

export const restoreLocalEvent = (event, actorEmail) => {
  if (!event?.id) return null;
  const events = getLocalEvents();
  const index = events.findIndex((item) => item.id === event.id);
  const ts = new Date().toISOString();
  const updated = {
    ...event,
    archived: false,
    status: 'published',
    updatedAt: ts
  };
  if (index === -1) {
    events.unshift(updated);
  } else {
    events[index] = { ...events[index], ...updated };
  }
  writeLocalEvents(events);
  addAuditEntry({ id: event.id, title: event.title || '—', action: 'restore', actorEmail, ts });
  return updated;
};

export const deleteLocalEvent = (event, actorEmail) => {
  if (!event?.id) return null;
  const events = getLocalEvents();
  const deletedIds = getDeletedEventIds();
  const ts = new Date().toISOString();
  const nextEvents = events.filter((item) => item.id !== event.id);
  deletedIds.add(event.id);
  writeLocalEvents(nextEvents);
  writeDeletedIds(deletedIds);
  addAuditEntry({ id: event.id, title: event.title || '—', action: 'delete', actorEmail, ts });
  return event;
};

export const fetchBaseEvents = async () => {
  const response = await fetch('./data/events.json');
  if (!response.ok) {
    throw new Error('events');
  }
  return response.json();
};

export const fetchMergedLocalEvents = async () => {
  const base = await fetchBaseEvents();
  if (!Array.isArray(base)) return [];
  return mergeWithLocalEvents(base);
};

export const findMergedEventById = async (id) => {
  if (!id) return null;
  const list = await fetchMergedLocalEvents();
  return list.find((event) => event.id === id) || null;
};

export const buildLocalEventId = () => `evt-local-${Date.now()}`;
