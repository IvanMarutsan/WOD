import fs from 'node:fs';

const requiredEnv = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.error(`Missing ${key}`);
    process.exit(1);
  }
});

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'event-images';

const parseDataUrl = (value) => {
  const match = value.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mime: match[1], data: match[2] };
};

const mimeToExtension = (mime) => {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'bin';
  }
};

const supabaseFetch = async (path, options = {}) => {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${path}`);
  if (options.query) {
    Object.entries(options.query).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    });
  }
  const response = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase ${path} failed: ${response.status} ${text}`);
  }
  if (response.status === 204) return null;
  return response.json();
};

const uploadImage = async (dataUrl, objectKey) => {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return null;
  const ext = mimeToExtension(parsed.mime);
  const objectPath = `${objectKey}.${ext}`;
  const buffer = Buffer.from(parsed.data, 'base64');
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objectPath}`;
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SERVICE_KEY}`,
      apikey: SERVICE_KEY,
      'Content-Type': parsed.mime,
      'x-upsert': 'true'
    },
    body: buffer
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Storage upload failed: ${response.status} ${text}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`;
};

const loadEvents = async () =>
  supabaseFetch('events', {
    query: {
      select: 'id,external_id,image_url',
      image_url: 'like.data:%'
    }
  });

const migrate = async () => {
  const rows = await loadEvents();
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log('No base64 images found.');
    return;
  }
  let updated = 0;
  for (const row of rows) {
    const imageUrl = row.image_url || '';
    const parsed = parseDataUrl(imageUrl);
    if (!parsed) continue;
    const keyBase = `events/${row.external_id || row.id}-${Date.now()}`;
    try {
      const publicUrl = await uploadImage(imageUrl, keyBase);
      if (!publicUrl) continue;
      await supabaseFetch('events', {
        method: 'PATCH',
        query: { id: `eq.${row.id}` },
        body: { image_url: publicUrl },
        headers: { Prefer: 'return=minimal' }
      });
      updated += 1;
      console.log(`Updated ${row.external_id || row.id}`);
    } catch (error) {
      console.error(`Failed ${row.external_id || row.id}:`, error.message);
    }
  }
  console.log(`Updated ${updated} events.`);
};

migrate().catch((error) => {
  console.error(error);
  process.exit(1);
});
