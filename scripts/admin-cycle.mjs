const baseUrl = process.env.STAGING_BASE_URL;
const token = process.env.ADMIN_JWT;

if (!baseUrl || !token) {
  console.error('Missing STAGING_BASE_URL or ADMIN_JWT.');
  process.exit(1);
}

const request = async (path, options = {}) => {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok || json?.ok === false) {
    throw new Error(`${path} failed: ${res.status} ${text}`);
  }
  return json;
};

const run = async () => {
  const now = new Date();
  const start = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const toIso = (date) => date.toISOString().slice(0, 16);

  const createPayload = {
    title: `Admin Cycle Test ${Date.now()}`,
    description: 'Admin cycle description v1',
    start: toIso(start),
    end: toIso(end),
    format: 'offline',
    address: 'Copenhagen, Test Street 1',
    city: 'Copenhagen',
    'ticket-type': 'free',
    'ticket-url': '',
    'contact-name': 'Admin QA',
    'contact-email': 'admin@test.local',
    tags: 'admin-test'
  };

  console.log('Creating event...');
  const created = await request('/.netlify/functions/submit-event', {
    method: 'POST',
    body: JSON.stringify(createPayload)
  });
  const eventId = created.id;
  console.log('Created:', eventId);

  console.log('Fetch admin-event...');
  const adminEvent1 = await request(`/.netlify/functions/admin-event?id=${encodeURIComponent(eventId)}`, {
    method: 'GET'
  });
  if (adminEvent1.event?.description !== createPayload.description) {
    throw new Error('Description mismatch after create');
  }

  console.log('Editing event...');
  const updatedDescription = 'Admin cycle description v2';
  await request('/.netlify/functions/admin-update', {
    method: 'POST',
    body: JSON.stringify({
      id: eventId,
      action: 'edit',
      payload: { title: 'Admin Cycle Edited', description: updatedDescription }
    })
  });
  const adminEvent2 = await request(`/.netlify/functions/admin-event?id=${encodeURIComponent(eventId)}`, {
    method: 'GET'
  });
  if (adminEvent2.event?.description !== updatedDescription) {
    throw new Error('Description mismatch after edit');
  }

  console.log('Archiving event...');
  await request('/.netlify/functions/admin-update', {
    method: 'POST',
    body: JSON.stringify({ id: eventId, action: 'archive' })
  });
  const adminEvent3 = await request(`/.netlify/functions/admin-event?id=${encodeURIComponent(eventId)}`, {
    method: 'GET'
  });
  if (adminEvent3.event?.status !== 'archived') {
    throw new Error('Status mismatch after archive');
  }

  console.log('Restoring event...');
  await request('/.netlify/functions/admin-update', {
    method: 'POST',
    body: JSON.stringify({ id: eventId, action: 'restore' })
  });
  const adminEvent4 = await request(`/.netlify/functions/admin-event?id=${encodeURIComponent(eventId)}`, {
    method: 'GET'
  });
  if (adminEvent4.event?.status !== 'published') {
    throw new Error('Status mismatch after restore');
  }

  console.log('Deleting event...');
  await request('/.netlify/functions/admin-update', {
    method: 'POST',
    body: JSON.stringify({ id: eventId, action: 'delete' })
  });
  const adminEvent5 = await request(`/.netlify/functions/admin-event?id=${encodeURIComponent(eventId)}`, {
    method: 'GET'
  });
  if (adminEvent5.event?.status !== 'deleted') {
    throw new Error('Status mismatch after delete');
  }

  console.log('Admin cycle OK');
};

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
