export const defaultNormalize = (value) => String(value || '').toLowerCase();

export const buildFilters = (formData, searchQuery, helpers = {}) => {
  const normalize = helpers.normalize || defaultNormalize;
  const getValue = (key) => (formData && typeof formData.get === 'function' ? formData.get(key) : '');
  const getAll = (key) => (formData && typeof formData.getAll === 'function' ? formData.getAll(key) : []);

  return {
    dateFrom: getValue('date-from') || '',
    dateTo: getValue('date-to') || '',
    city: normalize(getValue('city')),
    price: normalize(getValue('price')),
    format: normalize(getValue('format')),
    quickToday: Boolean(getValue('quick-today')),
    quickTomorrow: Boolean(getValue('quick-tomorrow')),
    quickWeekend: Boolean(getValue('quick-weekend')),
    quickOnline: Boolean(getValue('quick-online')),
    showPast: Boolean(getValue('show-past')),
    tags: getAll('tags').map((tag) => normalize(tag)).filter(Boolean),
    searchQuery: normalize(searchQuery || '')
  };
};

export const eventMatchesFilters = (event, filters, helpers = {}, options = {}) => {
  const normalize = helpers.normalize || defaultNormalize;
  const isPast = helpers.isPast || (() => false);
  const isArchivedEvent = helpers.isArchivedEvent || (() => false);
  const getCitySlug = helpers.getCitySlug || ((value) => normalize(value));
  const getTagList = helpers.getTagList || ((tags) => (tags || []).map((label) => ({ label })));
  const getLocalizedEventTitle = helpers.getLocalizedEventTitle || ((data) => data?.title || '');
  const getLocalizedCity = helpers.getLocalizedCity || ((value) => value || '');
  const getLocalizedTag = helpers.getLocalizedTag || ((value) => value || '');
  const getLang = helpers.getLang || (() => 'uk');

  const ignorePastToggle = options.ignorePastToggle;
  const includeArchived = options.includeArchived === true;
  const archivedEvent = isArchivedEvent(event);
  if (archivedEvent && !includeArchived) return false;
  if (!archivedEvent && event.status !== 'published') return false;
  if (!filters) return true;

  if (!ignorePastToggle) {
    if (filters.showPast) {
      if (!isPast(event)) return false;
    } else if (isPast(event)) {
      return false;
    }
  } else if (isPast(event)) {
    return false;
  }

  const startDate = new Date(event.start);
  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom);
    if (startDate < from) return false;
  }
  if (filters.dateTo) {
    const to = new Date(filters.dateTo);
    to.setHours(23, 59, 59, 999);
    if (startDate > to) return false;
  }
  if (filters.quickToday) {
    const today = new Date();
    if (
      startDate.getFullYear() !== today.getFullYear() ||
      startDate.getMonth() !== today.getMonth() ||
      startDate.getDate() !== today.getDate()
    ) {
      return false;
    }
  }
  if (filters.quickTomorrow) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (
      startDate.getFullYear() !== tomorrow.getFullYear() ||
      startDate.getMonth() !== tomorrow.getMonth() ||
      startDate.getDate() !== tomorrow.getDate()
    ) {
      return false;
    }
  }
  if (filters.quickWeekend) {
    const day = startDate.getDay();
    if (day !== 0 && day !== 6) {
      return false;
    }
  }
  if (filters.quickOnline && normalize(event.format) !== 'online') {
    return false;
  }
  if (filters.city && getCitySlug(event.city) !== filters.city) return false;
  if (filters.price && normalize(event.priceType) !== filters.price) return false;
  if (filters.format && normalize(event.format) !== filters.format) return false;
  if (filters.tags && filters.tags.length) {
    const eventTags = getTagList(event.tags).map((tag) => normalize(tag.label));
    const hasAnyTag = filters.tags.some((tag) => tag && eventTags.includes(tag));
    if (!hasAnyTag) return false;
  }
  if (filters.searchQuery) {
    const lang = getLang();
    const localizedTitle = getLocalizedEventTitle(event, lang);
    const localizedCity = getLocalizedCity(event.city, lang);
    const localizedTags = getTagList(event.tags).map((tag) => getLocalizedTag(tag.label, lang));
    const haystack = [
      localizedTitle,
      event.description,
      localizedCity,
      event.venue,
      localizedTags.join(' ')
    ]
      .map(normalize)
      .join(' ');
    if (!haystack.includes(filters.searchQuery)) return false;
  }
  return true;
};

export const filterEvents = (events, filters, helpers = {}, options = {}) =>
  (events || []).filter((event) => eventMatchesFilters(event, filters, helpers, options));

export const getAvailableTags = (events, helpers = {}) => {
  const normalize = helpers.normalize || defaultNormalize;
  const getTagList = helpers.getTagList || ((tags) => (tags || []).map((label) => ({ label })));
  const getLocalizedTag = helpers.getLocalizedTag || ((value) => value || '');
  const getLang = helpers.getLang || (() => 'uk');
  const tagMap = new Map();
  (events || []).forEach((event) => {
    getTagList(event?.tags).forEach((tag) => {
      const label = tag?.label ? String(tag.label).trim() : '';
      if (!label) return;
      const normalized = normalize(label);
      if (!normalized || tagMap.has(normalized)) return;
      tagMap.set(normalized, {
        label: getLocalizedTag(label, getLang()),
        value: label
      });
    });
  });
  const locale = getLang();
  return Array.from(tagMap.values()).sort((a, b) => a.label.localeCompare(b.label, locale));
};
