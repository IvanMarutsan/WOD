import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_SERVICE;

const getSupabaseUrl = () => {
  const directUrl = process.env.SUPABASE_URL || process.env.SUPABASE_PROJECT_URL;
  if (directUrl) return directUrl;
  const databaseUrl = process.env.SUPABASE_DATABASE_URL;
  if (!databaseUrl) return null;
  try {
    const host = new URL(databaseUrl).hostname;
    const match = host.match(/db\.([^.]+)\.supabase\.co/);
    if (!match) return null;
    return `https://${match[1]}.supabase.co`;
  } catch {
    return null;
  }
};

const SUPABASE_URL = getSupabaseUrl();

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL/SUPABASE_DATABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const baseHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation,resolution=merge-duplicates'
};

const readJson = async (path) => JSON.parse(await readFile(path, 'utf-8'));

const repoRoot = resolve(__dirname, '..');
const events = await readJson(resolve(repoRoot, 'data/events.json'));
const organizers = await readJson(resolve(repoRoot, 'data/organizers.json'));

const normalizeLink = (links, pattern) => links.find((link) => pattern.test(link)) || null;

const organizerPayload = organizers.map((org) => ({
  external_id: org.id,
  name: org.name,
  email: org.contactEmail || null,
  phone: org.phone || null,
  website: normalizeLink(org.links || [], /https?:\/\/(www\.)?[^/]+\.[^/]+/i),
  instagram: normalizeLink(org.links || [], /instagram\.com/i),
  facebook: normalizeLink(org.links || [], /facebook\.com/i),
  meta: org.verificationStatus || null
}));

const upsert = async (table, rows, conflict) => {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  if (conflict) url.searchParams.set('on_conflict', conflict);
  const response = await fetch(url, {
    method: 'POST',
    headers: baseHeaders,
    body: JSON.stringify(rows)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase ${table} upsert failed: ${response.status} ${text}`);
  }
  return response.json();
};

const organizerRows = await upsert('organizers', organizerPayload, 'external_id');
const organizerMap = new Map(organizerRows.map((row) => [row.external_id, row.id]));

const eventPayload = events.map((event) => ({
  external_id: event.id,
  slug: event.slug,
  title: event.title,
  description: event.description || null,
  city: event.city || null,
  address: event.address || null,
  venue: event.venue || null,
  start_at: event.start || null,
  end_at: event.end || null,
  language: event.language || null,
  format: event.format || null,
  price_type: event.priceType || null,
  price_min: Number.isFinite(event.priceMin) ? event.priceMin : null,
  price_max: Number.isFinite(event.priceMax) ? event.priceMax : null,
  registration_url: event.ticketUrl || null,
  image_url: Array.isArray(event.images) ? event.images[0] || null : null,
  status: event.status || 'published',
  organizer_id: organizerMap.get(event.organizerId) || null
}));

const eventRows = await upsert('events', eventPayload, 'external_id');
const eventMap = new Map(eventRows.map((row) => [row.external_id, row.id]));

const tagsPayload = events.flatMap((event) => {
  const eventId = eventMap.get(event.id);
  if (!eventId) return [];
  return (event.tags || []).map((tag) => ({
    event_id: eventId,
    tag: tag.label,
    is_pending: tag.status && tag.status !== 'approved'
  }));
});

if (tagsPayload.length) {
  await upsert('event_tags', tagsPayload, 'event_id,tag');
}

console.log(`Seeded organizers: ${organizerRows.length}`);
console.log(`Seeded events: ${eventRows.length}`);
console.log(`Seeded tags: ${tagsPayload.length}`);
