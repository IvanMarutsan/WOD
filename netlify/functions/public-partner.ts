import { supabaseFetch } from './supabase';

type HandlerEvent = { queryStringParameters?: Record<string, string> };

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

const hasDetailContent = (item: any) => {
  const detail = item?.detail_content || {};
  const description = String(detail?.description || '').trim();
  const forWhom = Array.isArray(detail?.forWhom) ? detail.forWhom.filter(Boolean) : [];
  const bonus = String(detail?.bonus || '').trim();
  const faq = Array.isArray(detail?.faq)
    ? detail.faq.filter((entry) => entry?.question || entry?.answer)
    : [];
  const ctaLabel = String(detail?.ctaLabel || '').trim();
  const ctaUrl = String(detail?.ctaUrl || '').trim();
  return Boolean(description || forWhom.length || bonus || faq.length || ctaLabel || ctaUrl);
};

export const handler = async (event: HandlerEvent) => {
  try {
    const slug = String(event.queryStringParameters?.slug || '').trim().toLowerCase();
    if (!slug) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'missing_slug' })
      };
    }
    const rows = (await supabaseFetch('partners', {
      query: {
        slug: `eq.${slug}`,
        is_active: 'eq.true',
        has_detail_page: 'eq.true',
        limit: '1',
        select:
          'id,name,slug,logo_url,website_url,has_detail_page,is_active,sort_order,detail_content'
      }
    })) as any[];
    const partner = rows?.[0];
    if (!partner || !hasDetailContent(partner)) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ok: false, error: 'not_found' })
      };
    }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, partner: normalizePartner(partner) })
    };
  } catch (error) {
    console.log('public-partner error', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false })
    };
  }
};
