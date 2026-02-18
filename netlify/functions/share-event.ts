import { supabaseFetch } from './supabase';

type HandlerEvent = {
  queryStringParameters?: Record<string, string>;
  headers?: Record<string, string>;
};

const DEFAULT_IMAGE = 'https://whatsondk.netlify.app/static/og-placeholder-white.png';

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const escapeHtml = (value: string) =>
  String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const buildOrigin = (event: HandlerEvent) => {
  const proto = event.headers?.['x-forwarded-proto'] || 'https';
  const host = event.headers?.host || process.env.URL?.replace(/^https?:\/\//, '');
  if (!host) return 'https://whatsondk.netlify.app';
  return `${proto}://${host}`;
};

const fetchPublishedEventFromPublicApi = async (id: string, origin: string) => {
  try {
    const response = await fetch(
      `${origin}/.netlify/functions/public-event?id=${encodeURIComponent(id)}`
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as { ok?: boolean; event?: any };
    if (!payload?.ok || !payload?.event) return null;
    return payload.event;
  } catch (error) {
    return null;
  }
};

const fetchPublishedEvent = async (id: string) => {
  const query: Record<string, string> = {
    status: 'eq.published',
    select: 'id,external_id,title,description,city,image_url,start_at,end_at',
    limit: '1'
  };
  if (isUuid(id)) {
    query.id = `eq.${id}`;
  } else {
    query.external_id = `eq.${id}`;
  }
  const rows = (await supabaseFetch('events', { query })) as any[];
  return Array.isArray(rows) && rows.length ? rows[0] : null;
};

export const handler = async (event: HandlerEvent) => {
  const id = String(event.queryStringParameters?.id || '').trim();
  if (!id) {
    return {
      statusCode: 302,
      headers: { Location: '/404.html', 'Cache-Control': 'no-store' },
      body: ''
    };
  }

  const origin = buildOrigin(event);
  const eventUrl = `${origin}/event-card.html?id=${encodeURIComponent(id)}`;

  try {
    const apiEvent = await fetchPublishedEventFromPublicApi(id, origin);
    const row = apiEvent || (await fetchPublishedEvent(id));
    if (!row) {
      return {
        statusCode: 302,
        headers: { Location: eventUrl, 'Cache-Control': 'no-store' },
        body: ''
      };
    }

    const title = `${String(row.title || 'Подія').trim()} — What's on DK?`;
    const description = String(row.description || '').trim() || 'Деталі події в Данії.';
    const image = String(row.images?.[0] || row.image_url || '').trim() || DEFAULT_IMAGE;

    const html = `<!doctype html>
<html lang="uk">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:url" content="${escapeHtml(eventUrl)}" />
    <meta property="og:locale" content="uk_UA" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    <meta http-equiv="refresh" content="0;url=${escapeHtml(eventUrl)}" />
    <link rel="canonical" href="${escapeHtml(eventUrl)}" />
  </head>
  <body>
    <script>window.location.replace(${JSON.stringify(eventUrl)});</script>
  </body>
</html>`;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store'
      },
      body: html
    };
  } catch (error) {
    return {
      statusCode: 302,
      headers: { Location: eventUrl, 'Cache-Control': 'no-store' },
      body: ''
    };
  }
};
