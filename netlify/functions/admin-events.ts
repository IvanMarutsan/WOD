import { getStore } from '@netlify/blobs';
import { pruneAudit, pruneEvents } from './admin-storage';

type HandlerEvent = {
  headers?: Record<string, string>;
  queryStringParameters?: Record<string, string>;
};
type HandlerContext = { clientContext?: { user?: { email?: string; app_metadata?: { roles?: string[] } } } };

const getRoles = (context: HandlerContext) => {
  const roles = context.clientContext?.user?.app_metadata?.roles;
  return Array.isArray(roles) ? roles : [];
};

const hasAdminRole = (roles: string[]) => roles.includes('admin') || roles.includes('super_admin');

const getLocale = (event: HandlerEvent) => {
  const lang =
    event.queryStringParameters?.lang ||
    event.headers?.['x-locale'] ||
    event.headers?.['X-Locale'] ||
    'uk';
  const normalized = String(lang).toLowerCase();
  if (normalized.startsWith('da')) return 'da-DK';
  if (normalized.startsWith('en')) return 'en-US';
  return 'uk-UA';
};

const formatMeta = (event: any, locale: string) => {
  const city = event.city ? String(event.city) : '';
  const start = event.start ? new Date(event.start) : null;
  const dateLabel = start && !Number.isNaN(start.valueOf())
    ? start.toLocaleDateString(locale, { day: '2-digit', month: 'short' })
    : '—';
  const timeLabel = start && !Number.isNaN(start.valueOf())
    ? start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
    : '';
  const parts = [city, dateLabel, timeLabel].filter(Boolean);
  return parts.join(' · ') || '—';
};

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

    const store = getStore('wod-admin');
    const events = (await store.get('events', { type: 'json' })) as any[] | null;
    const audit = (await store.get('audit', { type: 'json' })) as any[] | null;
    const list = Array.isArray(events) ? events : [];
    const prunedEvents = pruneEvents(list);
    const prunedAudit = pruneAudit(Array.isArray(audit) ? audit : []);

    if (prunedEvents.length !== list.length) {
      await store.set('events', JSON.stringify(prunedEvents), {
        contentType: 'application/json'
      });
    }
    if (Array.isArray(audit) && prunedAudit.length !== audit.length) {
      await store.set('audit', JSON.stringify(prunedAudit), {
        contentType: 'application/json'
      });
    }
    const locale = getLocale(event);
    const pending = prunedEvents
      .filter((event) => event.status === 'pending')
      .map((event) => ({
        id: event.id,
        title: event.title || 'Untitled event',
        meta: formatMeta(event, locale),
        history: Array.isArray(event.reasonHistory) ? event.reasonHistory : []
      }));
    const rejected = roles.includes('super_admin')
      ? prunedEvents
          .filter((event) => event.status === 'rejected')
          .map((event) => ({
            id: event.id,
            title: event.title || 'Untitled event',
            meta: formatMeta(event, locale),
            reason: event.lastReason || '',
            history: Array.isArray(event.reasonHistory) ? event.reasonHistory : []
          }))
      : [];
    const auditLog = roles.includes('super_admin')
      ? prunedAudit.slice(0, 50)
      : [];

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, pending, rejected, audit: auditLog })
    };
  } catch (error) {
    console.log('admin-events error', error);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false })
    };
  }
};
