export const LANGUAGE_LABELS = {
  uk: 'Українська',
  en: 'Англійська',
  da: 'Данська',
  'uk/en': 'Українська/Англійська',
  'uk/da': 'Українська/Данська',
  'en/da': 'Англійська/Данська'
};

const LANGUAGE_ALIASES = new Map([
  ['ua', 'uk'],
  ['en-gb', 'en'],
  ['en_gb', 'en'],
  ['uk_ua', 'uk'],
  ['ua_uk', 'uk'],
  ['en_uk', 'uk/en'],
  ['uk_en', 'uk/en'],
  ['da_uk', 'uk/da'],
  ['uk_da', 'uk/da'],
  ['da_en', 'en/da'],
  ['en_da', 'en/da'],
  ['en/uk', 'uk/en'],
  ['da/uk', 'uk/da'],
  ['da/en', 'en/da']
]);

const ALLOWED_LANGUAGES = new Set(Object.keys(LANGUAGE_LABELS));

const normalizeRawLanguage = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

export const normalizeEventLanguage = (value) => {
  const raw = normalizeRawLanguage(value);
  if (!raw) return '';
  if (raw.includes('mix')) return 'uk/en';

  const slashValue = raw.replace(/_/g, '/');
  const alias = LANGUAGE_ALIASES.get(raw) || LANGUAGE_ALIASES.get(slashValue);
  if (alias) return alias;
  if (ALLOWED_LANGUAGES.has(slashValue)) return slashValue;
  return '';
};

export const getLanguageLabel = (value) => {
  const normalized = normalizeEventLanguage(value);
  if (!normalized) return String(value || '').trim();
  return LANGUAGE_LABELS[normalized] || '';
};
