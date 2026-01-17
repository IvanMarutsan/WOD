import { supabaseFetch } from './supabase';

type HandlerEvent = { body?: string; queryStringParameters?: Record<string, string> };

const isNonEmptyString = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0;

export const handler = async (event: HandlerEvent) => {
  try {
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
      const existing = (await supabaseFetch('organizer_verification_requests', {
        query: { link_key: `eq.${linkKey}`, limit: '1', select: 'id,status' }
      })) as any[];
      const record = Array.isArray(existing) ? existing[0] : null;
      if (!record) {
        await supabaseFetch('organizer_verification_requests', {
          method: 'POST',
          body: [
            {
              link,
              link_key: linkKey,
              name: name || link,
              status: 'pending'
            }
          ]
        });
      } else if (record.status === 'rejected') {
        await supabaseFetch('organizer_verification_requests', {
          method: 'PATCH',
          query: { id: `eq.${record.id}` },
          body: { status: 'pending', rejected_at: null, verified_at: null }
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
    const records = (await supabaseFetch('organizer_verification_requests', {
      query: { link_key: `eq.${linkKey}`, limit: '1', select: 'status' }
    })) as any[];
    const status = Array.isArray(records) ? records[0]?.status : null;
    const verified = status === 'approved';
    const pending = status === 'pending';
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
