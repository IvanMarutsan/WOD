import test from 'node:test';
import assert from 'node:assert/strict';
const { EventCard } = await import('../../components/event-card.js');

const helpers = {
  formatPriceLabel: () => 'DKK 100',
  formatMessage: (key) =>
    key === 'register_cta'
      ? 'Реєстрація'
      : key === 'ticket_cta'
        ? 'Квитки'
        : key === 'online'
          ? 'Онлайн'
          : key,
  getTagList: (tags) => tags || [],
  getLocalizedTag: (label) => label,
  getLocalizedEventTitle: (event) => event.title || '',
  getLocalizedCity: (value) => value || '',
  getLanguageLabel: (value) => (value === 'uk' ? 'Українська' : value || ''),
  getCitySlug: () => '',
  isCityPart: () => false,
  formatDateRange: () => '18 Jan',
  isPast: () => false,
  isArchived: () => false
};

test('event card hides ticket CTA for free event without link', () => {
  const html = EventCard(
    { id: 'evt-1', title: 'Free Event', priceType: 'free', ticketUrl: '', tags: [] },
    helpers
  );
  assert.doesNotMatch(html, /event-card__cta--ticket/);
});

test('event card shows paid badge styling', () => {
  const html = EventCard(
    { id: 'evt-2', title: 'Paid Event', priceType: 'paid', priceMin: 100, ticketUrl: 'https://tickets.test' },
    helpers
  );
  assert.match(html, /event-card__price--paid/);
});

test('event card renders language label when available', () => {
  const html = EventCard(
    { id: 'evt-3', title: 'Language Event', language: 'uk', priceType: 'free', tags: [] },
    helpers
  );
  assert.match(html, /Українська/);
});

test('event card renders online label instead of city for online events', () => {
  const html = EventCard(
    {
      id: 'evt-4',
      title: 'Online Event',
      format: 'online',
      city: 'Copenhagen',
      address: 'Zoom',
      priceType: 'free',
      tags: []
    },
    helpers
  );
  assert.match(html, /event-card__location">Онлайн</);
  assert.doesNotMatch(html, /event-card__location">Copenhagen</);
});
