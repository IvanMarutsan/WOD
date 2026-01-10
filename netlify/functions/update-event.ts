import { getAdminStore } from './blob-store';
import { pruneAudit, pruneEvents } from './admin-storage';

type HandlerEvent = { body?: string; headers?: Record<string, string> };
type HandlerContext = { clientContext?: { user?: { email?: string; app_metadata?: { roles?: string[] } } } };

const getRoles = (context: HandlerContext) => {
  const roles = context.clientContext?.user?.app_metadata?.roles;
  return Array.isArray(roles) ? roles : [];
};

const hasAdminRole = (roles: string[]) => roles.includes('admin') || roles.includes('super_admin');

export const handler = async (event: HandlerEvent, context: HandlerContext) => {
  try {
    const roles = getRoles(context);
    if (!hasAdminRole(roles)) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'forbidden' })
      };
    }

    const payload = event.body ? JSON.parse(event.body) : {};
    const id = payload.id ? String(payload.id) : '';
    const updates =
      payload.payload && typeof payload.payload === 'object' ? payload.payload : {};
    const lastModifiedByAdmin = payload.lastModifiedByAdmin
      ? String(payload.lastModifiedByAdmin)
      : new Date().toISOString();

    if (!id) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'missing_id' })
      };
    }

    const store = getAdminStore();
    const existing = (await store.get('events', { type: 'json' })) as any[] | null;
    const events = Array.isArray(existing) ? existing : [];
    const idx = events.findIndex((evt) => evt.id === id);
    if (idx === -1) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'not_found' })
      };
    }

    const eventRecord = { ...events[idx] };
    eventRecord.payload = {
      ...(eventRecord.payload || {}),
      ...(updates || {})
    };
    if (updates.title) {
      eventRecord.title = String(updates.title);
    }
    eventRecord.updatedAt = lastModifiedByAdmin;
    eventRecord.lastModifiedByAdmin = lastModifiedByAdmin;
    events[idx] = eventRecord;

    const prunedEvents = pruneEvents(events);
    await store.set('events', JSON.stringify(prunedEvents), { contentType: 'application/json' });

    const auditExisting = (await store.get('audit', { type: 'json' })) as any[] | null;
    const audit = Array.isArray(auditExisting) ? auditExisting : [];
    const actorEmail = context.clientContext?.user?.email || 'unknown';
    const actorRole = roles.includes('super_admin') ? 'super_admin' : 'admin';
    const auditEntry = {
      id: `audit_${Date.now()}`,
      eventId: id,
      title: eventRecord.title || 'Untitled event',
      action: 'inline_edit',
      reason: 'Updated via inline admin edit',
      actorEmail,
      actorRole,
      ts: lastModifiedByAdmin
    };
    audit.unshift(auditEntry);
    const prunedAudit = pruneAudit(audit);
    await store.set('audit', JSON.stringify(prunedAudit), { contentType: 'application/json' });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true })
    };
  } catch (error) {
    console.log('update-event error', error);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false })
    };
  }
};
