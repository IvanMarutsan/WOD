export const buildGoogleMapsLink = (address) => {
  const text = String(address || '').trim();
  if (!text) return '';
  const query = encodeURIComponent(text);
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
};
