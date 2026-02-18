const CALENDAR_TIMEZONE = 'Europe/Copenhagen';
const ONLINE_PATTERN = /zoom|google meet|meet\.google|teams\.microsoft|teams|online|webinar/i;

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toCalendarParts = (date, timeZone = CALENDAR_TIMEZONE) => {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
};

const formatLocalCalendarDate = (date, timeZone = CALENDAR_TIMEZONE) => {
  const map = toCalendarParts(date, timeZone);
  return `${map.year}${map.month}${map.day}T${map.hour}${map.minute}${map.second}`;
};

const formatUtcCalendarDate = (date) =>
  `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}${String(
    date.getUTCDate()
  ).padStart(2, '0')}T${String(date.getUTCHours()).padStart(2, '0')}${String(
    date.getUTCMinutes()
  ).padStart(2, '0')}${String(date.getUTCSeconds()).padStart(2, '0')}Z`;

const resolveEndDate = (event, startDate) => {
  const end = parseDate(event?.end);
  if (end) return end;
  return new Date(startDate.getTime() + 60 * 60 * 1000);
};

const isOnlineEvent = (event) => {
  const format = String(event?.format || '').toLowerCase();
  const locationText = [event?.address, event?.venue, event?.city].filter(Boolean).join(' ');
  return format.includes('online') || ONLINE_PATTERN.test(locationText);
};

const getCalendarLocation = (event) => {
  if (isOnlineEvent(event)) return 'Online';
  const address = String(event?.address || '').trim();
  const city = String(event?.city || '').trim();
  if (address && city) {
    if (address.toLowerCase().includes(city.toLowerCase())) return address;
    return `${address}, ${city}`;
  }
  return address || city || 'Online';
};

const buildDetails = (event, eventUrl) => {
  const lines = [];
  const city = String(event?.city || '').trim();
  if (city) lines.push(`City: ${city}`);
  if (eventUrl) lines.push(`Event URL: ${eventUrl}`);
  const ticketUrl = String(event?.ticketUrl || '').trim();
  if (ticketUrl) lines.push(`Registration: ${ticketUrl}`);
  if (isOnlineEvent(event) && ticketUrl) {
    lines.push(`Online link: ${ticketUrl}`);
  }
  return lines.join('\n');
};

const escapeIcsText = (value) =>
  String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');

export const buildGoogleCalendarUrl = (event, options = {}) => {
  const start = parseDate(event?.start);
  if (!start) return '';
  const end = resolveEndDate(event, start);
  const eventUrl = String(options.eventUrl || '').trim();
  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.set('action', 'TEMPLATE');
  url.searchParams.set('text', String(event?.title || 'Event'));
  url.searchParams.set(
    'dates',
    `${formatLocalCalendarDate(start)}/${formatLocalCalendarDate(end)}`
  );
  url.searchParams.set('ctz', CALENDAR_TIMEZONE);
  url.searchParams.set('location', getCalendarLocation(event));
  url.searchParams.set('details', buildDetails(event, eventUrl));
  return url.toString();
};

export const buildIcs = (event, options = {}) => {
  const start = parseDate(event?.start);
  if (!start) return '';
  const end = resolveEndDate(event, start);
  const eventUrl = String(options.eventUrl || '').trim();
  const title = String(event?.title || 'Event');
  const location = getCalendarLocation(event);
  const description = buildDetails(event, eventUrl);
  const uidSource = String(event?.id || `${title}-${start.toISOString()}`);
  const uid = `${uidSource.replace(/\s+/g, '-')}@whatsondk`;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Whats on DK//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeIcsText(uid)}`,
    `DTSTAMP:${formatUtcCalendarDate(new Date())}`,
    `DTSTART;TZID=${CALENDAR_TIMEZONE}:${formatLocalCalendarDate(start)}`,
    `DTEND;TZID=${CALENDAR_TIMEZONE}:${formatLocalCalendarDate(end)}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `LOCATION:${escapeIcsText(location)}`,
    `URL:${escapeIcsText(eventUrl)}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ];
  return `${lines.join('\r\n')}\r\n`;
};
