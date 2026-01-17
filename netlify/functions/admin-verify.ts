import { supabaseFetch } from './supabase';

type HandlerEvent = { body?: string };
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
    const action = String(payload.action || '').trim();
    const link = String(payload.link || '').trim();
    const name = String(payload.name || '').trim();
    if (!link || !['approve', 'reject'].includes(action)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'invalid_payload' })
      };
    }
    const linkKey = link.toLowerCase();
    const existing = (await supabaseFetch('organizer_verification_requests', {
      query: { link_key: `eq.${linkKey}`, limit: '1', select: 'id' }
    })) as any[];
    const record = Array.isArray(existing) ? existing[0] : null;
    const now = new Date().toISOString();
    if (!record) {
      if (action === 'approve') {
        await supabaseFetch('organizer_verification_requests', {
          method: 'POST',
          body: [
            {
              link,
              link_key: linkKey,
              name: name || link,
              status: 'approved',
              verified_at: now
            }
          ]
        });
      } else {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: false, error: 'not_found' })
        };
      }
    } else {
      await supabaseFetch('organizer_verification_requests', {
        method: 'PATCH',
        query: { id: `eq.${record.id}` },
        body:
          action === 'approve'
            ? { status: 'approved', verified_at: now, rejected_at: null }
            : { status: 'rejected', rejected_at: now, verified_at: null }
      });
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true })
    };
  } catch (error) {
    console.log('admin-verify error', error);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false })
    };
  }
};
