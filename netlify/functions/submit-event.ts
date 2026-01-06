import { getStore } from '@netlify/blobs';
import { pruneEvents } from './admin-storage';

type HandlerEvent = { body?: string; headers?: Record<string, string> };

const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const WINDOW_MS = 60_000;

const getClientIp = (headers: Record<string, string> = {}) => {
  return (
    headers['x-nf-client-connection-ip'] ||
    headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    headers['client-ip'] ||
    'unknown'
  );
};

const isRateLimited = (ip: string) => {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || entry.resetAt < now) {
    rateLimits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) {
    return true;
  }
  entry.count += 1;
  return false;
};

const isNonEmptyString = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0;

const isValidEmail = (value: unknown) =>
  typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isValidPhone = (value: unknown) =>
  typeof value === 'string' && /^\+?\d[\d\s()-]{5,}$/.test(value);

const isValidDate = (value: unknown) => {
  if (!isNonEmptyString(value)) return false;
  const date = new Date(String(value));
  return !Number.isNaN(date.valueOf());
};

const parseTags = (value: unknown) => {
  if (!isNonEmptyString(value)) return [];
  return String(value)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
};

export const handler = async (event: HandlerEvent) => {
  try {
    console.log('submit-event env', {
      hasSiteId: Boolean(process.env.NETLIFY_BLOBS_SITE_ID),
      hasToken: Boolean(process.env.NETLIFY_BLOBS_TOKEN)
    });
    const payload = event.body ? JSON.parse(event.body) : {};
    const ip = getClientIp(event.headers || {});
    if (isRateLimited(ip)) {
      return {
        statusCode: 429,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'rate_limited' })
      };
    }
    if (payload.website && String(payload.website).trim()) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'honeypot' })
      };
    }
    const errors: string[] = [];
    if (!isNonEmptyString(payload.title)) errors.push('title');
    if (!isNonEmptyString(payload.category)) errors.push('category');
    if (!isValidDate(payload.start)) errors.push('start');
    if (!['offline', 'online'].includes(String(payload.format || ''))) errors.push('format');
    if (!isNonEmptyString(payload.address)) errors.push('address');
    if (!['free', 'paid'].includes(String(payload['ticket-type'] || ''))) errors.push('ticket-type');
    if (!isNonEmptyString(payload['contact-name'])) errors.push('contact-name');
    if (payload['contact-email'] && !isValidEmail(payload['contact-email'])) {
      errors.push('contact-email');
    }
    if (payload['contact-phone'] && !isValidPhone(payload['contact-phone'])) {
      errors.push('contact-phone');
    }
    const tags = parseTags(payload.tags);
    if (tags.length === 0) errors.push('tags');

    if (errors.length) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'invalid_payload', fields: errors })
      };
    }

    const id = `evt_${Date.now()}`;
    const store = getStore('wod-admin');
    const existing = (await store.get('events', { type: 'json' })) as any[] | null;
    const events = Array.isArray(existing) ? existing : [];
    const title = payload.title || payload.name || payload.eventTitle || 'Untitled event';
    const createdAt = new Date().toISOString();
    const status = payload.status === 'approved' ? 'approved' : 'pending';
    const eventRecord = {
      id,
      title,
      city: payload.city || payload.eventCity || '',
      start: payload.start || payload.eventStart || '',
      end: payload.end || payload.eventEnd || '',
      status,
      createdAt,
      updatedAt: createdAt,
      payload
    };
    const updated = pruneEvents([eventRecord, ...events]);
    await store.set('events', JSON.stringify(updated), {
      contentType: 'application/json'
    });
    console.log('submit-event', { id, title });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, id })
    };
  } catch (error) {
    console.log('submit-event error', error);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false })
    };
  }
};
