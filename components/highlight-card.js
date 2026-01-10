export const HighlightCard = (event, helpers) => {
  const { formatShortDate, getLocalizedEventTitle, getLocalizedCity } = helpers;
  const title = getLocalizedEventTitle(event);
  const city = getLocalizedCity(event.city);
  const dateLabel = formatShortDate(event.start);
  const detailUrl = `event-card.html?id=${encodeURIComponent(event.id)}`;
  const image = event.images && event.images.length ? event.images[0] : '';
  const imageMarkup = image
    ? `<img class="highlights__image" src="${image}" alt="${title}" loading="lazy" width="360" height="220" />`
    : '<div class="highlights__image highlights__image--placeholder"></div>';
  return `
        <a class="highlights__card" href="${detailUrl}">
          <div class="highlights__media">
            ${imageMarkup}
            <div class="highlights__overlay">
              <span class="highlights__date">${dateLabel}</span>
              <h3>${title}</h3>
              <span class="highlights__city">${city}</span>
            </div>
          </div>
        </a>
      `;
};
