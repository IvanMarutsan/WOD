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

const extractHostName = (value: string) => {
  try {
    const normalized = value.startsWith('http') ? value : `https://${value}`;
    const host = new URL(normalized).hostname.replace(/^www\./, '');
    return host || '';
  } catch (error) {
    return '';
  }
};

const hasDetailContent = (detail: any) => {
  if (!detail || typeof detail !== 'object') return false;
  const description = String(detail.description || '').trim();
  const forWhom = Array.isArray(detail.forWhom) ? detail.forWhom.filter(Boolean) : [];
  const bonus = String(detail.bonus || '').trim();
  const faq = Array.isArray(detail.faq)
    ? detail.faq.filter((entry) => entry?.question || entry?.answer)
    : [];
  const ctaLabel = String(detail.ctaLabel || '').trim();
  const ctaUrl = String(detail.ctaUrl || '').trim();
  return Boolean(description || forWhom.length || bonus || faq.length || ctaLabel || ctaUrl);
};

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
    const nameInput = String(payload.name || '').trim();
    const slugInput = String(payload.slug || '').trim();
    const websiteUrl = String(payload.websiteUrl || '').trim();
    const hostName = extractHostName(websiteUrl);
    const isActive = payload.isActive !== false;
    const sortOrderInput = Number.isFinite(Number(payload.sortOrder)) ? Number(payload.sortOrder) : 0;
    const detailContent =
      payload.detailContent && typeof payload.detailContent === 'object'
        ? payload.detailContent
        : {};
    const hasDetailPageRequested = payload.hasDetailPage === true;
    const hasDetailPage = hasDetailPageRequested && hasDetailContent(detailContent);
    let logoUrlInput = String(payload.logoUrl || '').trim();
    const logoDataUrl = String(payload.logoDataUrl || '').trim();
    let existing: any = null;
    if (method === 'PUT') {
      if (!id) {
        return {
          statusCode: 400,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: false, error: 'missing_id' })
        };
      }
      const rows = (await supabaseFetch('partners', {
        query: {
          id: `eq.${id}`,
          limit: '1',
          select:
            'id,name,slug,logo_url,website_url,has_detail_page,is_active,sort_order,detail_content'
        }
      })) as any[];
      existing = rows?.[0] || null;
      if (!existing) {
        return {
          statusCode: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: false, error: 'not_found' })
        };
      }
    }

    const fallbackName = hostName || (existing?.name ? String(existing.name) : '');
    const name = nameInput || fallbackName || `Partner ${new Date().toISOString().slice(0, 10)}`;
    const slugBase = slugInput || name || hostName || existing?.slug || '';
    const slug = normalizeSlug(slugBase) || normalizeSlug(`partner-${Date.now()}`);
    const sortOrder = Number.isFinite(sortOrderInput) ? sortOrderInput : Number(existing?.sort_order || 0);
    let logoUrl = logoUrlInput || String(existing?.logo_url || '').trim();

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
      website_url: websiteUrl || String(existing?.website_url || '').trim(),
      has_detail_page: hasDetailPage,
      detail_content: hasDetailPage ? detailContent : {},
      is_active: isActive,
      sort_order: sortOrder
    };

    let result: any[] = [];
    if (method === 'POST') {
      result = (await supabaseFetch('partners', { method: 'POST', body: [row] })) as any[];
    } else {
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
    const message = error instanceof Error ? error.message : 'unknown_error';
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: message })
    };
  }
};
