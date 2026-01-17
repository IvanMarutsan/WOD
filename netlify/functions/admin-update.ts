import { supabaseFetch } from './supabase';

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

    if (!['approve', 'reject', 'edit', 'archive', 'restore', 'delete'].includes(action)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'invalid_action' })
      };
    }

    if (action === 'reject' && !reason) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'missing_reason' })
      };
    }

    const records = (await supabaseFetch('events', {
      query: { or: `(id.eq.${id},external_id.eq.${id})`, limit: '1' }
    })) as any[];
    const eventRecord = records?.[0];
    if (!eventRecord) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'not_found' })
      };
    }

    const user = context.clientContext?.user;
    const actorEmail = user?.email || 'unknown';
    const actorRole = roles.includes('super_admin') ? 'super_admin' : 'admin';
    if (action === 'edit') {
      const incoming = payload.payload && typeof payload.payload === 'object' ? payload.payload : {};
      const tagList =
        Array.isArray(incoming.tags)
          ? incoming.tags
          : typeof incoming.tags === 'string'
            ? incoming.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
            : [];
      const updatePayload: Record<string, unknown> = {};
      if (incoming.title) updatePayload.title = String(incoming.title);
      if (incoming.description) updatePayload.description = String(incoming.description);
      if (incoming.city) updatePayload.city = String(incoming.city);
      if (incoming.start) updatePayload.start_at = String(incoming.start);
      if (incoming.end) updatePayload.end_at = String(incoming.end);
      if (Object.keys(updatePayload).length) {
        await supabaseFetch('events', {
          method: 'PATCH',
          query: { id: `eq.${eventRecord.id}` },
          body: updatePayload
        });
      }
      if (incoming.tags !== undefined) {
        await supabaseFetch('event_tags', {
          method: 'DELETE',
          query: { event_id: `eq.${eventRecord.id}` }
        });
        if (tagList.length) {
          await supabaseFetch('event_tags', {
            method: 'POST',
            body: tagList.map((tag: string) => ({
              event_id: eventRecord.id,
              tag,
              is_pending: false
            }))
          });
        }
      }
      await supabaseFetch('admin_audit_log', {
        method: 'POST',
        body: [
          {
            event_id: eventRecord.id,
            action: 'edit',
            reason,
            actor: actorEmail,
            payload: { title: updatePayload.title || eventRecord.title }
          }
        ]
      });
      console.log('admin-update edit', { id, actorEmail });
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: true })
      };
    }

    const nextStatus =
      action === 'approve'
        ? 'published'
        : action === 'reject'
          ? 'rejected'
          : action === 'archive'
            ? 'archived'
            : action === 'restore'
              ? 'published'
              : action === 'delete'
                ? 'deleted'
                : eventRecord.status;
    await supabaseFetch('events', {
      method: 'PATCH',
      query: { id: `eq.${eventRecord.id}` },
      body: { status: nextStatus }
    });
    await supabaseFetch('admin_audit_log', {
      method: 'POST',
      body: [
        {
          event_id: eventRecord.id,
          action,
          reason,
          actor: actorEmail,
          payload: { title: eventRecord.title }
        }
      ]
    });

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
