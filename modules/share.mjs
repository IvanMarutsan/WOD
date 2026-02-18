const SHARE_UTM_SOURCE = 'share';
const SHARE_UTM_MEDIUM = 'web';
const SHARE_UTM_CAMPAIGN = 'event';
const SOCIAL_CHANNELS = new Set(['facebook', 'linkedin', 'telegram', 'whatsapp', 'instagram']);

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateTime = (value) => {
  const date = parseDate(value);
  if (!date) return '';
  return new Intl.DateTimeFormat('uk-UA', {
    timeZone: 'Europe/Copenhagen',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
};

export const getShareUrl = (event, channel = 'native', baseUrl = '') => {
  const fallbackBase = typeof window !== 'undefined' ? window.location.href : '';
  const source = String(baseUrl || fallbackBase || '').trim();
  if (!source) return '';
  const url = new URL(source);
  if (event?.id && SOCIAL_CHANNELS.has(channel) && typeof window !== 'undefined') {
    url.pathname = '/.netlify/functions/share-event';
    url.search = '';
    url.searchParams.set('id', String(event.id));
  }
  url.searchParams.set('utm_source', SHARE_UTM_SOURCE);
  url.searchParams.set('utm_medium', SHARE_UTM_MEDIUM);
  url.searchParams.set('utm_campaign', SHARE_UTM_CAMPAIGN);
  url.searchParams.set('utm_content', channel);
  return url.toString();
};

export const buildShareText = (event, options = {}) => {
  const opts =
    typeof options === 'string'
      ? { shareUrl: options, includeUrl: true }
      : options && typeof options === 'object'
        ? options
        : {};
  const shareUrl = String(opts.shareUrl || '').trim();
  const includeUrl = Boolean(opts.includeUrl && shareUrl);
  const title = String(event?.title || '').trim();
  const dateLabel = formatDateTime(event?.start);
  const city = String(event?.city || '').trim();
  const meta = [dateLabel, city].filter(Boolean).join(' · ');
  return [title, meta, includeUrl ? shareUrl : ''].filter(Boolean).join('\n');
};

const fetchShareImageFile = async (event) => {
  const imageUrl = event?.images?.[0];
  if (!imageUrl) return null;
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    const blob = await response.blob();
    const mime = blob.type || 'image/jpeg';
    const extension = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
    const baseName = String(event?.id || event?.slug || 'event').replace(/[^a-z0-9-]+/gi, '-');
    return new File([blob], `${baseName || 'event'}.${extension}`, { type: mime });
  } catch (error) {
    return null;
  }
};

export const tryShareWithWebApi = async (event, shareUrl) => {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false;
  const url = shareUrl || '';
  const payload = {
    title: String(event?.title || ''),
    text: buildShareText(event),
    url
  };
  try {
    const file = await fetchShareImageFile(event);
    if (
      file &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({ ...payload, files: [file] });
      return true;
    }
    await navigator.share(payload);
    return true;
  } catch (error) {
    return false;
  }
};

export const getNetworkShareHref = (network, shareUrl, shareText) => {
  const encodedUrl = encodeURIComponent(shareUrl || '');
  const encodedText = encodeURIComponent(shareText || '');
  if (network === 'facebook') {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  }
  if (network === 'linkedin') {
    return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  }
  if (network === 'telegram') {
    const textParam = encodedText ? `&text=${encodedText}` : '';
    return `https://t.me/share/url?url=${encodedUrl}${textParam}`;
  }
  if (network === 'whatsapp') {
    return `https://wa.me/?text=${encodeURIComponent(
      [shareText, shareUrl].filter(Boolean).join('\n')
    )}`;
  }
  if (network === 'instagram') {
    return shareUrl || '#';
  }
  return shareUrl || '#';
};
