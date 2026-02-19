export const LOCAL_PARTNERS_KEY = 'wodLocalPartners';

const CYRILLIC_MAP = new Map([
  ['а', 'a'], ['б', 'b'], ['в', 'v'], ['г', 'h'], ['ґ', 'g'], ['д', 'd'],
  ['е', 'e'], ['є', 'ie'], ['ж', 'zh'], ['з', 'z'], ['и', 'y'], ['і', 'i'],
  ['ї', 'i'], ['й', 'i'], ['к', 'k'], ['л', 'l'], ['м', 'm'], ['н', 'n'],
  ['о', 'o'], ['п', 'p'], ['р', 'r'], ['с', 's'], ['т', 't'], ['у', 'u'],
  ['ф', 'f'], ['х', 'kh'], ['ц', 'ts'], ['ч', 'ch'], ['ш', 'sh'], ['щ', 'shch'],
  ['ь', ''], ['ю', 'iu'], ['я', 'ia']
]);

const transliterate = (value = '') =>
  Array.from(String(value || '').toLowerCase())
    .map((char) => CYRILLIC_MAP.get(char) ?? char)
    .join('');

export const normalizePartnerSlug = (value = '') =>
  transliterate(value)
    .trim()
    .toLowerCase()
    .replace(/['’"`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const sortPartners = (partners = []) =>
  [...partners].sort((a, b) => {
    const isActiveA = (a?.isActive ?? a?.is_active) !== false;
    const isActiveB = (b?.isActive ?? b?.is_active) !== false;
    if (isActiveA !== isActiveB) {
      return isActiveA ? -1 : 1;
    }
    const rawOrderA = a?.sortOrder ?? a?.sort_order;
    const rawOrderB = b?.sortOrder ?? b?.sort_order;
    const orderA = Number.isFinite(Number(rawOrderA)) ? Number(rawOrderA) : 0;
    const orderB = Number.isFinite(Number(rawOrderB)) ? Number(rawOrderB) : 0;
    if (orderA !== orderB) return orderA - orderB;
    const nameA = String(a?.name || '');
    const nameB = String(b?.name || '');
    return nameA.localeCompare(nameB, 'uk');
  });

export const normalizePartnersOrder = (partners = []) => {
  const sorted = sortPartners(partners);
  return sorted.map((partner, index) => {
    const nextOrder = index + 1;
    return {
      ...partner,
      sortOrder: nextOrder,
      sort_order: nextOrder
    };
  });
};

export const filterActivePartners = (partners = []) =>
  partners.filter((partner) => partner && partner.is_active !== false);

export const getPublicPartners = (partners = []) => sortPartners(filterActivePartners(partners));

const parseJson = (raw, fallback) => {
  try {
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch (error) {
    return fallback;
  }
};

export const getLocalPartners = () => {
  if (typeof localStorage === 'undefined') return [];
  const raw = localStorage.getItem(LOCAL_PARTNERS_KEY);
  const list = raw ? parseJson(raw, []) : [];
  return Array.isArray(list) ? list : [];
};

const writeLocalPartners = (partners = []) => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LOCAL_PARTNERS_KEY, JSON.stringify(partners));
};

export const upsertLocalPartner = (partner) => {
  if (!partner?.id) return null;
  const current = getLocalPartners();
  const index = current.findIndex((item) => item?.id === partner.id);
  if (index === -1) {
    current.push(partner);
  } else {
    current[index] = { ...current[index], ...partner };
  }
  writeLocalPartners(current);
  return partner;
};

export const deleteLocalPartner = (id) => {
  if (!id) return;
  const current = getLocalPartners();
  const next = current.filter((item) => item?.id !== id);
  writeLocalPartners(next);
};
