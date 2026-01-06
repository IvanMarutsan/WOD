import { getAdminStore } from './blob-store';

type HandlerEvent = { body?: string; queryStringParameters?: Record<string, string> };

const isNonEmptyString = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0;

export const handler = async (event: HandlerEvent) => {
  try {
    const store = getAdminStore();
    if (event.body) {
      const payload = JSON.parse(event.body);
      const link = String(payload.link || '').trim();
      const name = String(payload.name || '').trim();
      if (!isNonEmptyString(link)) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: false, error: 'invalid_payload' })
        };
      }
      const linkKey = link.toLowerCase();
      const existing = (await store.get('verificationRequests', { type: 'json' })) as any[] | null;
      const requests = Array.isArray(existing) ? existing : [];
      const hasPending = requests.some((req) => req.linkKey === linkKey && req.status === 'pending');
      if (!hasPending) {
        requests.unshift({
          id: `ver_${Date.now()}`,
          link,
          linkKey,
          name: name || link,
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

    const link = String(event.queryStringParameters?.link || '').trim();
    if (!isNonEmptyString(link)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'missing_link' })
      };
    }
    const linkKey = link.toLowerCase();
    const organizers = (await store.get('organizers', { type: 'json' })) as any[] | null;
    const requests = (await store.get('verificationRequests', { type: 'json' })) as any[] | null;
    const verified = Array.isArray(organizers)
      ? organizers.find((item) => item.linkKey === linkKey)
      : null;
    const pending = Array.isArray(requests)
      ? requests.some((item) => item.linkKey === linkKey && item.status === 'pending')
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
