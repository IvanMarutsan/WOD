const buildTagMarkup = (tag, helpers) => {
  const { formatMessage, getLocalizedTag } = helpers;
  const isPending = tag.status === 'pending';
  const pendingClass = isPending ? ' event-card__tag--pending' : '';
  const localizedLabel = getLocalizedTag(tag.label);
  const ariaKey = isPending ? 'tag_pending_aria' : 'tag_aria';
  const ariaLabel = formatMessage(ariaKey, { label: localizedLabel });
  const pendingTooltip = isPending ? formatMessage('pending_tooltip', {}) : '';
  const pendingAttrs = pendingTooltip ? ` title="${pendingTooltip}"` : '';
  return `<span class="event-card__tag${pendingClass}" aria-label="${ariaLabel}" data-tag-label="${localizedLabel}"${pendingAttrs}>${localizedLabel}</span>`;
};

export const EventCard = (event, helpers) => {
  const {
    formatPriceLabel,
    formatMessage,
    getTagList,
    getLocalizedTag,
    getLocalizedEventTitle,
    getLocalizedCity,
    getCitySlug,
    isCityPart,
    formatDateRange,
    isPast,
    isArchived
  } = helpers;
  const normalizePart = (value) => String(value || '').trim().toLowerCase();
  const normalizeLocationPart = (value) =>
    String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const image = event.images && event.images.length ? event.images[0] : '';
  const priceInfo =
    event.priceType === 'free'
      ? {
          label: formatPriceLabel('free'),
          className: 'event-card__price--free'
        }
      : {
          label: formatPriceLabel(event.priceType, event.priceMin, event.priceMax),
          className: 'event-card__price--paid'
        };
  const isFree = event.priceType === 'free';
  const pastEvent = isPast(event);
  const archivedEvent = isArchived ? isArchived(event) : false;
  const title = getLocalizedEventTitle(event);
  const languageLabel = typeof helpers.getLanguageLabel === 'function'
    ? helpers.getLanguageLabel(event.language)
    : event.language || '';
  const imageMarkup = image
    ? `<img class="event-card__image" src="${image}" alt="${title}" loading="lazy" width="800" height="540" />`
    : '<div class="event-card__image event-card__image--placeholder" aria-hidden="true"></div>';
  const cardClass = `event-card ${isFree ? 'event-card--free' : 'event-card--paid'}${
    pastEvent || archivedEvent ? ' event-card--archived' : ''
  }`;
  const archivedLabel = formatMessage('archived_label', {});
  const archivedMarkup = archivedEvent
    ? `<span class="event-card__status" aria-label="${archivedLabel}">${archivedLabel}</span>`
    : '';
  const baseTags = getTagList(event.tags);
  const tags = baseTags.map((tag) => buildTagMarkup(tag, helpers)).join('');
  const ticketKey = event.priceType === 'free' ? 'register_cta' : 'ticket_cta';
  const ticketLabel = formatMessage(ticketKey, {});
  const rawTicketUrl = event.ticketUrl || '';
  const showTicketCta = event.priceType !== 'free' || Boolean(rawTicketUrl);
  const ticketUrl = rawTicketUrl || '#';
  const detailUrl = `event-card.html?id=${encodeURIComponent(event.id)}`;
  const cityLabel = getLocalizedCity(event.city);
  const citySlug = getCitySlug ? getCitySlug(event.city) : '';
  const venue = event.venue || '';
  const address = event.address || '';
  const rawParts = [venue, address].filter((part) => part && String(part).trim());
  const filtered = citySlug && typeof isCityPart === 'function'
    ? rawParts.filter((part) => !isCityPart(part, citySlug))
    : rawParts;
  const uniqueParts = [];
  const seen = [];
  filtered.forEach((part) => {
    const key = normalizeLocationPart(part) || normalizePart(part);
    if (!key) return;
    if (seen.some((prev) => prev === key || prev.includes(key) || key.includes(prev))) return;
    seen.push(key);
    uniqueParts.push(part);
  });
  if (cityLabel) {
    const cityKey = normalizeLocationPart(cityLabel) || normalizePart(cityLabel);
    if (cityKey && !seen.some((prev) => prev === cityKey || prev.includes(cityKey) || cityKey.includes(prev))) {
      uniqueParts.push(cityLabel);
      seen.push(cityKey);
    }
  }
  const location = uniqueParts.filter(Boolean).join(' · ');
  const languageMarkup = languageLabel ? `<p class="event-card__language">${languageLabel}</p>` : '';
  const statusLabel = archivedEvent ? 'archived' : pastEvent ? 'past' : 'active';
  return `
        <article class="${cardClass}" data-event-id="${event.id}" data-status="${statusLabel}" data-testid="event-card">
          ${archivedMarkup}
          ${imageMarkup}
          <div class="event-card__body">
            <div class="event-card__meta">
              <span class="event-card__datetime">${formatDateRange(event.start, event.end)}</span>
              <span class="event-card__price ${priceInfo.className}">${priceInfo.label}</span>
            </div>
            <h3 class="event-card__title">
              <a class="event-card__link" href="${detailUrl}">${title}</a>
            </h3>
            <p class="event-card__location">${location}</p>
            ${languageMarkup}
            <div class="event-card__tags">
              ${tags}
            </div>
            <div class="event-card__actions">
              ${showTicketCta ? `<a class="event-card__cta event-card__cta--ticket" href="${ticketUrl}" rel="noopener" data-testid="ticket-cta" data-i18n="${ticketKey}">${ticketLabel}</a>` : ''}
              <a class="event-card__cta event-card__cta--details" href="${detailUrl}" data-i18n="cta_details">${formatMessage('cta_details', {})}</a>
            </div>
          </div>
        </article>
      `;
};
