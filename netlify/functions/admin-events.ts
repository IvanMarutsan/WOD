import { supabaseFetch } from './supabase';

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

const buildPayload = (event: any, tags: string[], organizer?: any) => ({
  id: event.external_id || event.id,
  title: event.title || '',
  description: event.description || '',
  tags,
  start: event.start_at || '',
  end: event.end_at || '',
  format: event.format || '',
  address: event.address || '',
  venue: event.venue || '',
  city: event.city || '',
  'ticket-type': event.price_type || '',
  'price-min': event.price_min ?? '',
  'price-max': event.price_max ?? '',
  'ticket-url': event.registration_url || '',
  'contact-name': organizer?.name || '',
  'contact-email': organizer?.email || '',
  'contact-phone': organizer?.phone || '',
  'contact-website': organizer?.website || '',
  'contact-instagram': organizer?.instagram || '',
  'contact-facebook': organizer?.facebook || ''
});

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

    const locale = getLocale(event);
    const events = (await supabaseFetch('events', {
      query: { status: 'in.(pending,rejected,archived)' }
    })) as any[];
    const eventIds = events.map((item) => item.id).filter(Boolean);
    const organizerIds = events.map((item) => item.organizer_id).filter(Boolean);
    const tags =
      eventIds.length > 0
        ? ((await supabaseFetch('event_tags', {
            query: { event_id: `in.(${eventIds.join(',')})` }
          })) as any[])
        : [];
    const organizers =
      organizerIds.length > 0
        ? ((await supabaseFetch('organizers', {
            query: { id: `in.(${organizerIds.join(',')})` }
          })) as any[])
        : [];

    const tagsByEvent = new Map<string, string[]>();
    tags.forEach((tag) => {
      const list = tagsByEvent.get(tag.event_id) || [];
      list.push(tag.tag);
      tagsByEvent.set(tag.event_id, list);
    });
    const organizersById = new Map(organizers.map((org) => [org.id, org]));

    const pending = events
      .filter((item) => item.status === 'pending')
      .map((item) => ({
        id: item.external_id || item.id,
        title: item.title || 'Untitled event',
        meta: formatMeta(
          { city: item.city, start: item.start_at },
          locale
        ),
        payload: buildPayload(item, tagsByEvent.get(item.id) || [], organizersById.get(item.organizer_id)),
        history: []
      }));

    const rejected = roles.includes('super_admin')
      ? events
          .filter((item) => item.status === 'rejected')
          .map((item) => ({
            id: item.external_id || item.id,
            title: item.title || 'Untitled event',
            meta: formatMeta(
              { city: item.city, start: item.start_at },
              locale
            ),
            reason: '',
            payload: buildPayload(item, tagsByEvent.get(item.id) || [], organizersById.get(item.organizer_id)),
            history: []
          }))
      : [];

    let auditLog: any[] = [];
    const auditEntries = (await supabaseFetch('admin_audit_log', {
      query: { order: 'created_at.desc', limit: '50' }
    })) as any[];
    const auditEventIds = auditEntries.map((entry) => entry.event_id).filter(Boolean);
    const auditEvents =
      auditEventIds.length > 0
        ? ((await supabaseFetch('events', {
            query: { id: `in.(${auditEventIds.join(',')})` }
          })) as any[])
        : [];
    const externalById = new Map(
      auditEvents.map((item) => [item.id, item.external_id || item.id])
    );
    const titleById = new Map(
      auditEvents.map((item) => [item.id, item.title || ''])
    );
    auditLog = auditEntries.map((entry) => ({
      id: entry.id,
      eventId: externalById.get(entry.event_id) || entry.event_id,
      title: entry.payload?.title || titleById.get(entry.event_id) || '',
      action: entry.action,
      reason: entry.reason || '',
      actorEmail: entry.actor || '',
      actorRole: roles.includes('super_admin') ? 'super_admin' : 'admin',
      ts: entry.created_at
    }));

    const verificationRows = (await supabaseFetch('organizer_verification_requests', {
      query: {
        status: 'eq.pending',
        order: 'created_at.desc',
        select: 'link,name,created_at'
      }
    })) as any[];
    const verifications = (verificationRows || []).map((item) => ({
      link: item.link || '',
      name: item.name || item.link || '',
      createdAt: item.created_at || ''
    }));
    const archive = events
      .filter((item) => item.status === 'archived')
      .map((item) => ({
        id: item.external_id || item.id,
        title: item.title || 'Untitled event',
        meta: formatMeta(
          { city: item.city, start: item.start_at },
          locale
        ),
        payload: buildPayload(item, tagsByEvent.get(item.id) || [], organizersById.get(item.organizer_id))
      }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, pending, rejected, audit: auditLog, verifications, archive })
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
