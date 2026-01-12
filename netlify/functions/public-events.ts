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

type HandlerEvent = { queryStringParameters?: Record<string, string> };
type HandlerContext = { clientContext?: { user?: { app_metadata?: { roles?: string[] } } } };

const getRoles = (context: HandlerContext) => {
  const roles = context.clientContext?.user?.app_metadata?.roles;
  return Array.isArray(roles) ? roles : [];
};

const hasAdminRole = (roles: string[]) => roles.includes('admin') || roles.includes('super_admin');

export const handler = async (event: HandlerEvent, context: HandlerContext) => {
  try {
    const includeArchived =
      event.queryStringParameters?.includeArchived === '1' ||
      event.queryStringParameters?.includeArchived === 'true';
    const statusQuery =
      includeArchived && hasAdminRole(getRoles(context))
        ? 'in.(published,archived)'
        : 'eq.published';
    const events = (await supabaseFetch('events', {
      query: {
        status: statusQuery,
        order: 'start_at.asc'
      }
    })) as any[];
    const eventIds = events.map((event) => event.id).filter(Boolean);
    const organizerIds = events
      .map((event) => event.organizer_id)
      .filter(Boolean);
    const tags =
      eventIds.length > 0
        ? ((await supabaseFetch('event_tags', {
            query: { event_id: `in.(${eventIds.join(',')})` }
          })) as any[])
        : [];
    const organizers =
      organizerIds.length > 0
        ? ((await supabaseFetch('organizers', {
            query: { id: `in.(${organizerIds.join(',')})` }
          })) as any[])
        : [];

    const tagsByEvent = new Map<string, any[]>();
    tags.forEach((tag) => {
      const list = tagsByEvent.get(tag.event_id) || [];
      list.push(tag);
      tagsByEvent.set(tag.event_id, list);
    });
    const organizersById = new Map(
      organizers.map((organizer) => [organizer.id, organizer])
    );

    const response = events.map((event) => {
      const eventTags = tagsByEvent.get(event.id) || [];
      const organizer = organizersById.get(event.organizer_id);
      const contactPerson = mapOrganizer(organizer);
      return {
        id: event.external_id || event.id,
        slug: event.slug || event.external_id || event.id,
        title: event.title || 'Untitled event',
        description: event.description || '',
        tags: eventTags.map(mapTag),
        start: event.start_at || '',
        end: event.end_at || null,
        format: event.format || 'offline',
        venue: event.venue || event.address || '',
        address: event.address || '',
        city: event.city || '',
        priceType: event.price_type || 'paid',
        priceMin: event.price_min ?? null,
        priceMax: event.price_max ?? null,
        ticketUrl: event.registration_url || '',
        organizerId: event.organizer_id || '',
        images: event.image_url ? [event.image_url] : [],
        status: event.status || 'published',
        language: event.language || '',
        forUkrainians: true,
        familyFriendly: false,
        volunteer: false,
        contactPerson: contactPerson || {
          name: '',
          email: '',
          phone: '',
          website: '',
          instagram: '',
          facebook: '',
          meta: ''
        }
      };
    });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response)
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
