import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const readFile = (relativePath) =>
  fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8');

test('public-events uses published-only select queries', () => {
  const content = readFile('../../netlify/functions/public-events.ts');
  assert.match(content, /const statusQuery = 'eq\.published';/);
  assert.match(content, /const limit = parseLimit/);
  assert.match(content, /const page = parsePage/);
  assert.match(content, /limit:\s*String\(limit\)/);
  assert.match(content, /offset:\s*String\(offset\)/);
  assert.match(
    content,
    /select:\s*'id,external_id,slug,title,description,start_at,end_at,format,venue,address,city,price_type,price_min,price_max,registration_url,organizer_id,image_url,status,language'/
  );
  assert.match(
    content,
    /select:\s*'event_id,tag,is_pending'/
  );
  assert.match(
    content,
    /select:\s*'id,name,email,phone,website,instagram,facebook,meta'/
  );
  assert.doesNotMatch(content, /includeArchived/);
});

test('admin-event fetches by id or external_id and enforces admin access', () => {
  const content = readFile('../../netlify/functions/admin-event.ts');
  assert.match(content, /error:\s*'forbidden'/);
  assert.match(content, /or:\s*`\(id\.eq\.\$\{requestedId\},external_id\.eq\.\$\{requestedId\}\)`/);
  assert.match(
    content,
    /select:\s*'id,external_id,slug,title,description,start_at,end_at,format,venue,address,city,price_type,price_min,price_max,registration_url,organizer_id,image_url,status,language'/
  );
});

test('organizer verification uses supabase requests table', () => {
  const organizerVerify = readFile('../../netlify/functions/organizer-verification.ts');
  const adminVerify = readFile('../../netlify/functions/admin-verify.ts');
  const adminEvents = readFile('../../netlify/functions/admin-events.ts');
  assert.match(organizerVerify, /supabaseFetch\('organizer_verification_requests'/);
  assert.match(organizerVerify, /status:\s*'pending'/);
  assert.match(adminVerify, /supabaseFetch\('organizer_verification_requests'/);
  assert.match(adminVerify, /status:\s*'approved'/);
  assert.match(adminVerify, /status:\s*'rejected'/);
  assert.match(adminEvents, /supabaseFetch\('organizer_verification_requests'/);
  assert.match(adminEvents, /status:\s*'eq\.pending'/);
});

test('auto-archive runs weekly and archives past events', () => {
  const content = readFile('../../netlify/functions/auto-archive.ts');
  assert.match(content, /schedule:\s*'@weekly'/);
  assert.match(content, /end_at:\s*`lt\.\$\{cutoffEnd\}`/);
  assert.match(content, /status:\s*'eq\.published'/);
  assert.match(content, /end_at:\s*'is\.null'/);
  assert.match(content, /start_at:\s*`lt\.\$\{cutoffStart\}`/);
});
