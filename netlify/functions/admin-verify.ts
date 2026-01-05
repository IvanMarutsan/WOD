import { getStore } from '@netlify/blobs';

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
    const email = String(payload.email || '').trim().toLowerCase();
    const action = String(payload.action || '').trim();
    const link = String(payload.link || '').trim();
    const name = String(payload.name || '').trim();
    if (!email || !['approve', 'reject'].includes(action)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'invalid_payload' })
      };
    }

    const store = getStore('wod-admin');
    const existingRequests = (await store.get('verificationRequests', { type: 'json' })) as any[] | null;
    const requests = Array.isArray(existingRequests) ? existingRequests : [];
    const nextRequests = requests.filter((req) => req.email !== email || req.status !== 'pending');
    await store.set('verificationRequests', JSON.stringify(nextRequests), {
      contentType: 'application/json'
    });

    if (action === 'approve') {
      const existingOrganizers = (await store.get('organizers', { type: 'json' })) as any[] | null;
      const organizers = Array.isArray(existingOrganizers) ? existingOrganizers : [];
      const existing = organizers.find((item) => item.email === email);
      const record = {
        email,
        name: name || email,
        link,
        verifiedAt: new Date().toISOString()
      };
      if (existing) {
        Object.assign(existing, record);
      } else {
        organizers.unshift(record);
      }
      await store.set('organizers', JSON.stringify(organizers), {
        contentType: 'application/json'
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
