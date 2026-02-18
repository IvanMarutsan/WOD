import { supabaseFetch } from './supabase';

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

export const handler = async () => {
  try {
    const rows = (await supabaseFetch('partners', {
      query: {
        is_active: 'eq.true',
        order: 'sort_order.asc,created_at.asc',
        select:
          'id,name,slug,logo_url,website_url,has_detail_page,is_active,sort_order,detail_content'
      }
    })) as any[];
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify((rows || []).map(normalizePartner))
    };
  } catch (error) {
    console.log('public-partners error', error);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([])
    };
  }
};
