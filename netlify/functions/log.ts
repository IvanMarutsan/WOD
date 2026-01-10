export const handler = async (event: { body?: string }) => {
  try {
    const payload = event.body ? JSON.parse(event.body) : {};
    console.info('client log', payload);
  } catch (error) {
    console.info('client log parse error', error);
  }
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true })
  };
};
