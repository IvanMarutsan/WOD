export const HighlightCard = (event, helpers) => {
  const { formatShortDate, getLocalizedEventTitle, getLocalizedCity, formatMessage } = helpers;
  const title = getLocalizedEventTitle(event);
  const isOnline = String(event.format || '').toLowerCase() === 'online';
  const city = isOnline
    ? formatMessage('online', {})
    : getLocalizedCity(event.city, event);
  const dateLabel = formatShortDate(event.start);
  const detailUrl = `event-card.html?id=${encodeURIComponent(event.id)}`;
  const image =
    (event.images && event.images.length ? event.images[0] : '') ||
    event.imageUrl ||
    event.image_url ||
    '';
  const imageMarkup = image
    ? `<img class="highlights__image" src="${image}" alt="${title}" loading="lazy" width="360" height="220" />`
    : '<div class="highlights__image highlights__image--placeholder"></div>';
  return `
        <a class="highlights__card" href="${detailUrl}">
          <div class="highlights__media">
            ${imageMarkup}
            <div class="highlights__overlay">
              <div class="highlights__overlay-content">
                <span class="highlights__date">${dateLabel}</span>
                <div class="highlights__title-wrap">
                  <h3>${title}</h3>
                </div>
                <span class="highlights__city">${city}</span>
              </div>
            </div>
          </div>
        </a>
      `;
};
