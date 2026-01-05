import { getStore } from '@netlify/blobs';

type HandlerEvent = { body?: string; queryStringParameters?: Record<string, string> };

const isNonEmptyString = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0;

export const handler = async (event: HandlerEvent) => {
  try {
    const store = getStore('wod-admin');
    if (event.body) {
      const payload = JSON.parse(event.body);
      const email = String(payload.email || '').trim().toLowerCase();
      const link = String(payload.link || '').trim();
      const name = String(payload.name || '').trim();
      if (!isNonEmptyString(email) || !isNonEmptyString(link)) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: false, error: 'invalid_payload' })
        };
      }
      const existing = (await store.get('verificationRequests', { type: 'json' })) as any[] | null;
      const requests = Array.isArray(existing) ? existing : [];
      const hasPending = requests.some((req) => req.email === email && req.status === 'pending');
      if (!hasPending) {
        requests.unshift({
          id: `ver_${Date.now()}`,
          email,
          name: name || email,
          link,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
        await store.set('verificationRequests', JSON.stringify(requests), {
          contentType: 'application/json'
        });
      }
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: true })
      };
    }

    const email = String(event.queryStringParameters?.email || '').trim().toLowerCase();
    if (!isNonEmptyString(email)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'missing_email' })
      };
    }
    const organizers = (await store.get('organizers', { type: 'json' })) as any[] | null;
    const requests = (await store.get('verificationRequests', { type: 'json' })) as any[] | null;
    const verified = Array.isArray(organizers)
      ? organizers.find((item) => item.email === email)
      : null;
    const pending = Array.isArray(requests)
      ? requests.some((item) => item.email === email && item.status === 'pending')
      : false;
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: true,
        verified: Boolean(verified),
        pending
      })
    };
  } catch (error) {
    console.log('organizer-verification error', error);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false })
    };
  }
};
