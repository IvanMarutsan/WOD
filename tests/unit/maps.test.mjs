import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGoogleMapsLink } from '../../modules/maps.mjs';

test('buildGoogleMapsLink encodes address for google maps', () => {
  const address = 'Sankt Ansgar Kirke, Bredgade 64, Copenhagen';
  const url = buildGoogleMapsLink(address);
  assert.equal(
    url,
    'https://www.google.com/maps/search/?api=1&query=Sankt%20Ansgar%20Kirke%2C%20Bredgade%2064%2C%20Copenhagen'
  );
});

test('buildGoogleMapsLink encodes address with appended city', () => {
  const address = 'Sankt Ansgar Kirke, Bredgade 64, Copenhagen';
  const url = buildGoogleMapsLink(address);
  assert.ok(url.endsWith(encodeURIComponent(address)));
});
