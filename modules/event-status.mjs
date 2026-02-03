export const isArchivedEvent = (event) => {
  const status = String(event?.status || '').toLowerCase();
  return event?.archived === true || status === 'archived';
};

export const mergeEventData = (base = {}, incoming = {}) => {
  const next = { ...base, ...incoming };
  if (incoming?.archived === undefined && base?.archived !== undefined) {
    next.archived = base.archived;
  }
  if (!incoming?.status && base?.status) {
    next.status = base.status;
  }
  return next;
};
