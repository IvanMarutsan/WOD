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

export const handler = async (event: HandlerEvent) => {
  try {
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
    const id = `evt_${Date.now()}`;
    console.log('submit-event', { id, payload });
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
