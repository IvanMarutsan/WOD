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
    console.log('send-code', { email: payload.email });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, code: '123456' })
    };
  } catch (error) {
    console.log('send-code error', error);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, code: '123456' })
    };
  }
};
