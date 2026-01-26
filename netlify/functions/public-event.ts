import { supabaseFetch } from './supabase';

const mapTag = (tag: { tag: string; is_pending?: boolean }) => ({
  label: tag.tag,
  status: tag.is_pending ? 'pending' : 'approved'
});

const mapOrganizer = (organizer?: {
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  meta?: string;
}) => {
  if (!organizer) return null;
  return {
    name: organizer.name || '',
    email: organizer.email || '',
    phone: organizer.phone || '',
    website: organizer.website || '',
    instagram: organizer.instagram || '',
    facebook: organizer.facebook || '',
    meta: organizer.meta || ''
  };
};

const sanitizeImageUrl = (value?: string) => {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:')) return '';
  if (trimmed.length > 2048) return '';
  return trimmed;
};

type HandlerEvent = { queryStringParameters?: Record<string, string> };

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const buildEventLookupQuery = (value: string) =>
  isUuid(value) ? `(id.eq.${value},external_id.eq.${value})` : `(external_id.eq.${value})`;

export const handler = async (event: HandlerEvent) => {
  try {
    const requestedId = event.queryStringParameters?.id;
    if (!requestedId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'missing_id' })
      };
    }

    const events = (await supabaseFetch('events', {
      query: {
        status: 'eq.published',
        or: buildEventLookupQuery(requestedId),
        limit: '1',
        select:
          'id,external_id,slug,title,description,start_at,end_at,format,venue,address,city,price_type,price_min,price_max,registration_url,organizer_id,image_url,status,language'
      }
    })) as any[];
    const eventItem = Array.isArray(events) ? events[0] : null;
    if (!eventItem) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'not_found' })
      };
    }

    const tags = (await supabaseFetch('event_tags', {
      query: {
        event_id: `eq.${eventItem.id}`,
        select: 'event_id,tag,is_pending'
      }
    })) as any[];

    const organizers =
      eventItem.organizer_id
        ? ((await supabaseFetch('organizers', {
            query: {
              id: `eq.${eventItem.organizer_id}`,
              limit: '1',
              select: 'id,name,email,phone,website,instagram,facebook,meta'
            }
          })) as any[])
        : [];
    const organizer = Array.isArray(organizers) ? organizers[0] : null;
    const imageUrl = sanitizeImageUrl(eventItem.image_url);

    const response = {
      id: eventItem.external_id || eventItem.id,
      slug: eventItem.slug || eventItem.external_id || eventItem.id,
      title: eventItem.title || 'Untitled event',
      description: eventItem.description || '',
      tags: (tags || []).map(mapTag),
      start: eventItem.start_at || '',
      end: eventItem.end_at || null,
      format: eventItem.format || 'offline',
      venue: eventItem.venue || eventItem.address || '',
      address: eventItem.address || '',
      city: eventItem.city || '',
      priceType: eventItem.price_type || 'paid',
      priceMin: eventItem.price_min ?? null,
      priceMax: eventItem.price_max ?? null,
      ticketUrl: eventItem.registration_url || '',
      organizerId: eventItem.organizer_id || '',
      images: imageUrl ? [imageUrl] : [],
      status: eventItem.status || 'published',
      language: eventItem.language || '',
      forUkrainians: true,
      familyFriendly: false,
      volunteer: false,
      contactPerson: mapOrganizer(organizer) || {
        name: '',
        email: '',
        phone: '',
        website: '',
        instagram: '',
        facebook: '',
        meta: ''
      }
    };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, event: response })
    };
  } catch (error) {
    console.log('public-event error', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false })
    };
  }
};
