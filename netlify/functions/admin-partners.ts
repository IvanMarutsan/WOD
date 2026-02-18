import { supabaseFetch } from './supabase';
import { uploadDataUrlImage } from './storage';

type HandlerEvent = {
  httpMethod?: string;
  body?: string;
  queryStringParameters?: Record<string, string>;
};
type HandlerContext = { clientContext?: { user?: { app_metadata?: { roles?: string[] } } } };

const getRoles = (context: HandlerContext) => {
  const roles = context.clientContext?.user?.app_metadata?.roles;
  return Array.isArray(roles) ? roles : [];
};

const hasAdminRole = (roles: string[]) => roles.includes('admin') || roles.includes('super_admin');

const normalizeSlug = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['’"`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const normalizePartner = (item: any) => ({
  id: item.id,
  name: item.name || '',
  slug: item.slug || '',
  logoUrl: item.logo_url || '',
  websiteUrl: item.website_url || '',
  hasDetailPage: item.has_detail_page === true,
  isActive: item.is_active !== false,
  sortOrder: Number(item.sort_order || 0),
  detailContent: item.detail_content || {}
});

const getUploadBucket = () => process.env.SUPABASE_PARTNERS_BUCKET || process.env.SUPABASE_STORAGE_BUCKET || 'event-images';

export const handler = async (event: HandlerEvent, context: HandlerContext) => {
  try {
    if (!hasAdminRole(getRoles(context))) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'forbidden' })
      };
    }

    const method = String(event.httpMethod || 'GET').toUpperCase();
    if (method === 'GET') {
      const rows = (await supabaseFetch('partners', {
        query: {
          order: 'sort_order.asc,created_at.asc',
          select:
            'id,name,slug,logo_url,website_url,has_detail_page,is_active,sort_order,detail_content,created_at'
        }
      })) as any[];
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: true, partners: (rows || []).map(normalizePartner) })
      };
    }

    if (method === 'DELETE') {
      const id = String(event.queryStringParameters?.id || '').trim();
      if (!id) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: false, error: 'missing_id' })
        };
      }
      await supabaseFetch('partners', { method: 'DELETE', query: { id: `eq.${id}` } });
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: true })
      };
    }

    const payload = event.body ? JSON.parse(event.body) : {};
    const id = String(payload.id || '').trim();
    const name = String(payload.name || '').trim();
    const slug = normalizeSlug(payload.slug || name);
    const websiteUrl = String(payload.websiteUrl || '').trim();
    const hasDetailPage = payload.hasDetailPage === true;
    const isActive = payload.isActive !== false;
    const sortOrder = Number.isFinite(Number(payload.sortOrder)) ? Number(payload.sortOrder) : 0;
    const detailContent =
      payload.detailContent && typeof payload.detailContent === 'object'
        ? payload.detailContent
        : {};
    let logoUrl = String(payload.logoUrl || '').trim();
    const logoDataUrl = String(payload.logoDataUrl || '').trim();
    if (!name || !slug) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'missing_required' })
      };
    }

    if (logoDataUrl.startsWith('data:')) {
      const uploaded = await uploadDataUrlImage(
        logoDataUrl,
        `partners/${slug}-${Date.now()}`,
        getUploadBucket()
      );
      logoUrl = uploaded?.url || logoUrl;
    }

    const row = {
      name,
      slug,
      logo_url: logoUrl,
      website_url: websiteUrl,
      has_detail_page: hasDetailPage,
      detail_content: detailContent,
      is_active: isActive,
      sort_order: sortOrder
    };

    let result: any[] = [];
    if (method === 'POST') {
      result = (await supabaseFetch('partners', { method: 'POST', body: [row] })) as any[];
    } else {
      if (!id) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: false, error: 'missing_id' })
        };
      }
      result = (await supabaseFetch('partners', {
        method: 'PATCH',
        query: { id: `eq.${id}` },
        body: row
      })) as any[];
    }
    const partner = result?.[0] || null;
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, partner: partner ? normalizePartner(partner) : null })
    };
  } catch (error) {
    console.log('admin-partners error', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false })
    };
  }
};
