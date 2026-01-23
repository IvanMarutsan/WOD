import { supabaseFetch } from './supabase';
import { uploadEventImage } from './storage';

type HandlerEvent = { body?: string; headers?: Record<string, string> };
type HandlerContext = { clientContext?: { user?: { email?: string; app_metadata?: { roles?: string[] } } } };

const getRoles = (context: HandlerContext) => {
  const roles = context.clientContext?.user?.app_metadata?.roles;
  return Array.isArray(roles) ? roles : [];
};

const hasAdminRole = (roles: string[]) => roles.includes('admin') || roles.includes('super_admin');

const parsePriceInput = (value: unknown) => {
  const raw = String(value ?? '').trim().replace(/,/g, '.');
  if (!raw) return { min: null, max: null, hasValue: true };
  const matches = raw.match(/\d+(?:\.\d+)?/g) || [];
  const numbers = matches.map((item) => Number(item)).filter((item) => Number.isFinite(item));
  if (!numbers.length) return { min: null, max: null, hasValue: true };
  if (numbers.length === 1) return { min: numbers[0], max: null, hasValue: true };
  const min = numbers[0];
  const max = numbers[1];
  if (Number.isFinite(min) && Number.isFinite(max) && max < min) {
    return { min: max, max: min, hasValue: true };
  }
  return { min, max, hasValue: true };
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
      query: { or: `(id.eq.${id},external_id.eq.${id})`, limit: '1' }
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
    if (updates.description !== undefined) {
      const description = String(updates.description || '').trim();
      if (!description) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: false, error: 'missing_description' })
        };
      }
      updatePayload.description = description;
    }
    if (updates.language) updatePayload.language = String(updates.language);
    if (updates.format) updatePayload.format = String(updates.format);
    if (updates.start) updatePayload.start_at = String(updates.start);
    if (updates.end) updatePayload.end_at = String(updates.end);
    if (updates.address) updatePayload.address = String(updates.address);
    if (updates.venue) updatePayload.venue = String(updates.venue);
    if (updates.city) updatePayload.city = String(updates.city);
    if (updates['ticket-url']) updatePayload.registration_url = String(updates['ticket-url']);
    if (updates['ticket-type']) updatePayload.price_type = String(updates['ticket-type']);
    const hasMin = updates['price-min'] !== undefined;
    const hasMax = updates['price-max'] !== undefined;
    const parseNumericValue = (value: unknown) => {
      const raw = String(value ?? '').trim();
      if (!raw) return null;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? parsed : null;
    };
    if (hasMin) {
      updatePayload.price_min = parseNumericValue(updates['price-min']);
    }
    if (hasMax) {
      updatePayload.price_max = parseNumericValue(updates['price-max']);
    }
    if (!hasMin && !hasMax) {
      const { min, max, hasValue } = parsePriceInput(updates.price);
      if (hasValue) {
        updatePayload.price_min = Number.isFinite(min) ? min : null;
        updatePayload.price_max = Number.isFinite(max) ? max : null;
      }
    }
    if (updates.imageUrl !== undefined) {
      const rawImage = String(updates.imageUrl || '');
      if (rawImage.startsWith('data:')) {
        const upload = await uploadEventImage(rawImage, `events/${existing.external_id || existing.id}-${Date.now()}`);
        updatePayload.image_url = upload?.url || '';
      } else {
        updatePayload.image_url = rawImage;
      }
    }
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
