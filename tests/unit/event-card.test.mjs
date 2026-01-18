import test from 'node:test';
import assert from 'node:assert/strict';
const { EventCard } = await import('../../components/event-card.js');

const helpers = {
  formatPriceLabel: () => 'DKK 100',
  formatMessage: (key) => (key === 'register_cta' ? 'Реєстрація' : key === 'ticket_cta' ? 'Квитки' : key),
  getTagList: (tags) => tags || [],
  getLocalizedTag: (label) => label,
  getLocalizedEventTitle: (event) => event.title || '',
  getLocalizedCity: (value) => value || '',
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
