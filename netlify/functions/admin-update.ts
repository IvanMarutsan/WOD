import { getStore } from '@netlify/blobs';
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
    const action = String(payload.action || '');
    const id = String(payload.id || '');
    const reason = payload.reason ? String(payload.reason) : '';

    if (!id || !action) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'missing_fields' })
      };
    }

    if (action === 'reject' && !reason) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'missing_reason' })
      };
    }

    const store = getStore('wod-admin');
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

    const user = context.clientContext?.user;
    const actorEmail = user?.email || 'unknown';
    const actorRole = roles.includes('super_admin') ? 'super_admin' : 'admin';
    const ts = new Date().toISOString();
    const historyEntry = { action, reason, actorEmail, actorRole, ts };

    const eventRecord = { ...events[idx] };
    eventRecord.status = action === 'approve' ? 'approved' : 'rejected';
    eventRecord.updatedAt = ts;
    eventRecord.lastReason = reason || '';
    const history = Array.isArray(eventRecord.reasonHistory) ? eventRecord.reasonHistory : [];
    eventRecord.reasonHistory = [historyEntry, ...history];
    events[idx] = eventRecord;

    const auditExisting = (await store.get('audit', { type: 'json' })) as any[] | null;
    const audit = Array.isArray(auditExisting) ? auditExisting : [];
    const auditEntry = {
      id: `audit_${Date.now()}`,
      eventId: id,
      title: eventRecord.title || 'Untitled event',
      action,
      reason,
      actorEmail,
      actorRole,
      ts
    };
    audit.unshift(auditEntry);

    const prunedEvents = pruneEvents(events);
    const prunedAudit = pruneAudit(audit);

    await store.set('events', JSON.stringify(prunedEvents), { contentType: 'application/json' });
    await store.set('audit', JSON.stringify(prunedAudit), { contentType: 'application/json' });

    console.log('admin-update', { id, action, actorEmail });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true })
    };
  } catch (error) {
    console.log('admin-update error', error);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false })
    };
  }
};
