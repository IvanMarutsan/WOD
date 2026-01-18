import test from 'node:test';
import assert from 'node:assert/strict';
const { HighlightCard } = await import('../../components/highlight-card.js');

const helpers = {
  formatShortDate: () => '18 Jan',
  formatMessage: (key) => (key === 'online' ? 'Онлайн' : key),
  getLocalizedEventTitle: (event) => event.title || '',
  getLocalizedCity: (value) => value || ''
};

test('highlight card shows online label for online events', () => {
  const html = HighlightCard(
    { id: 'evt-1', title: 'Online Event', format: 'online', start: '2026-01-18T10:00:00Z', city: 'Copenhagen' },
    helpers
  );
  assert.match(html, /Онлайн/);
});

test('highlight card shows city for offline events', () => {
  const html = HighlightCard(
    { id: 'evt-2', title: 'Offline Event', format: 'offline', start: '2026-01-18T10:00:00Z', city: 'Aarhus' },
    helpers
  );
  assert.match(html, /Aarhus/);
});
