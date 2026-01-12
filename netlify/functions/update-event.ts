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

    const records = (await supabaseFetch('events', {
      query: { external_id: `eq.${id}` }
    })) as any[];
    const existing = records?.[0];
    if (!existing) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'not_found' })
      };
    }

    const updatePayload: Record<string, unknown> = {};
    if (updates.title) updatePayload.title = String(updates.title);
    if (updates.description) updatePayload.description = String(updates.description);
    if (updates.language) updatePayload.language = String(updates.language);
    if (updates.format) updatePayload.format = String(updates.format);
    if (updates.start) updatePayload.start_at = String(updates.start);
    if (updates.end) updatePayload.end_at = String(updates.end);
    if (updates.address) updatePayload.address = String(updates.address);
    if (updates.venue) updatePayload.venue = String(updates.venue);
    if (updates.city) updatePayload.city = String(updates.city);
    if (updates['ticket-url']) updatePayload.registration_url = String(updates['ticket-url']);
    if (updates['ticket-type']) updatePayload.price_type = String(updates['ticket-type']);
    if (updates['price-min'] !== undefined) {
      const value = Number(updates['price-min']);
      updatePayload.price_min = Number.isFinite(value) ? value : null;
    }
    if (updates['price-max'] !== undefined) {
      const value = Number(updates['price-max']);
      updatePayload.price_max = Number.isFinite(value) ? value : null;
    }
    if (updates.imageUrl) updatePayload.image_url = String(updates.imageUrl);
    if (Object.keys(updatePayload).length) {
      await supabaseFetch('events', {
        method: 'PATCH',
        query: { id: `eq.${existing.id}` },
        body: updatePayload
      });
    }

    const tagList =
      Array.isArray(updates.tags)
        ? updates.tags
        : typeof updates.tags === 'string'
          ? updates.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
          : null;
    if (tagList) {
      await supabaseFetch('event_tags', {
        method: 'DELETE',
        query: { event_id: `eq.${existing.id}` }
      });
      if (tagList.length) {
        await supabaseFetch('event_tags', {
          method: 'POST',
          body: tagList.map((tag: string) => ({
            event_id: existing.id,
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
          event_id: existing.id,
          action: 'edit',
          actor: context.clientContext?.user?.email || 'admin',
          payload: { title: updatePayload.title || existing.title }
        }
      ]
    });

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
