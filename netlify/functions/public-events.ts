import { getAdminStore } from './blob-store';

const KNOWN_CITIES = [
  'Copenhagen',
  'Aarhus',
  'Odense',
  'Aalborg',
  'Esbjerg',
  'Roskilde',
  'Fredericia'
];

const isNonEmptyString = (value: unknown) =>
  typeof value === 'string' && value.trim().length > 0;

const parseTags = (value: unknown) => {
  if (!isNonEmptyString(value)) return [];
  return String(value)
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
};

const parseNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const deriveCity = (payload: Record<string, unknown>) => {
  if (isNonEmptyString(payload.city)) return String(payload.city);
  const address = String(payload.address || '');
  if (!address) return '';
  const lower = address.toLowerCase();
  const hit = KNOWN_CITIES.find((city) => lower.includes(city.toLowerCase()));
  if (hit) return hit;
  const first = address.split(',')[0]?.trim();
  return first || '';
};

const mapPayloadToEvent = (record: any) => {
  const payload = record.payload || {};
  const tags = parseTags(payload.tags).map((label) => ({ label, status: 'approved' }));
  const categoryLabel = isNonEmptyString(payload.category) ? String(payload.category) : '';
  const city = deriveCity(payload);
  const ticketType = String(payload['ticket-type'] || 'paid');
  return {
    id: record.id,
    slug: record.id,
    title: String(payload.title || record.title || 'Untitled event'),
    description: String(payload.description || ''),
    category: categoryLabel ? { label: categoryLabel, status: 'approved' } : null,
    tags,
    start: String(payload.start || ''),
    end: payload.end ? String(payload.end) : null,
    format: String(payload.format || 'offline'),
    venue: String(payload.venue || payload.address || ''),
    address: String(payload.address || ''),
    city,
    priceType: ticketType === 'free' ? 'free' : 'paid',
    priceMin: parseNumber(payload['price-min']),
    priceMax: parseNumber(payload['price-max']),
    ticketUrl: String(payload['ticket-url'] || ''),
    organizerId: String(payload['contact-name'] || ''),
    images: [],
    status: 'published',
    language: 'uk',
    forUkrainians: true,
    familyFriendly: false,
    volunteer: false,
    contactPerson: {
      name: String(payload['contact-name'] || ''),
      email: String(payload['contact-email'] || ''),
      phone: String(payload['contact-phone'] || '')
    }
  };
};

export const handler = async () => {
  try {
    const store = getAdminStore();
    const events = (await store.get('events', { type: 'json' })) as any[] | null;
    const list = Array.isArray(events) ? events : [];
    const approved = list.filter((event) => event.status === 'approved');
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(approved.map(mapPayloadToEvent))
    };
  } catch (error) {
    console.log('public-events error', error);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([])
    };
  }
};
