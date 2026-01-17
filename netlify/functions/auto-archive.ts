import { supabaseFetch } from './supabase';

export const config = {
  schedule: '@weekly'
};

export const handler = async () => {
  try {
    const cutoffEnd = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const cutoffStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await supabaseFetch('events', {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: { status: 'archived' },
      query: {
        status: 'eq.published',
        end_at: `lt.${cutoffEnd}`
      }
    });
    await supabaseFetch('events', {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: { status: 'archived' },
      query: {
        status: 'eq.published',
        end_at: 'is.null',
        start_at: `lt.${cutoffStart}`
      }
    });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, cutoffEnd, cutoffStart })
    };
  } catch (error) {
    console.log('auto-archive error', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false })
    };
  }
};
