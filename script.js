import { state, setEvents, setFilteredEvents, setLoading } from './store.js';
import { EventCard } from './components/event-card.js';
import { HighlightCard } from './components/highlight-card.js';
import { ADMIN_SESSION_KEY } from './modules/auth.js';
import { clampPage, getPageSlice, getTotalPages } from './modules/catalog-pagination.mjs';
import {
  archiveLocalEvent,
  deleteLocalEvent,
  mergeWithLocalEvents,
  restoreLocalEvent
} from './modules/local-events.js';

(async () => {
  const header = document.querySelector('.site-header');
  const menuToggle = document.querySelector('.menu-toggle');
  const primaryNav = document.querySelector('#primary-nav');
  const filterToggles = document.querySelectorAll('.filters__toggle-btn');
  const smallScreenQuery = window.matchMedia('(max-width: 767px)');
  
    const catalogGrid = document.querySelector('.catalog-grid');
  const highlightsTrack = document.querySelector('.highlights__track');
  const ticketCtas = document.querySelectorAll('.event-sidebar__cta--ticket');
  const similarCtas = document.querySelectorAll('.event-sidebar__cta--similar');
  const themeToggle = document.querySelector('.theme-toggle');
  const adminLinks = document.querySelectorAll('[data-admin-link]');
  const heroKicker = document.querySelector('[data-hero-kicker]');
  const heroStatus = document.querySelector('[data-hero-status]');
  const debugEnabled = new URLSearchParams(window.location.search).get('debug') === '1';
  const logBuffer = [];
  let debugPanel = null;
  let debugList = null;
  const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);
  const hasServerlessSupport = !LOCAL_HOSTNAMES.has(window.location.hostname);
  const isAdminSession = () => {
    try {
      return localStorage.getItem(ADMIN_SESSION_KEY) === '1';
    } catch (error) {
      return false;
    }
  };

  if (adminLinks.length) {
    const showAdmin = isAdminSession();
    adminLinks.forEach((link) => {
      if (!(link instanceof HTMLElement)) return;
      link.hidden = !showAdmin;
    });
  }

  const redirectIdentityHashToLogin = () => {
    const hash = window.location.hash || '';
    if (
      !hash.includes('recovery_token') &&
      !hash.includes('invite_token') &&
      !hash.includes('confirmation_token')
    ) {
      return;
    }
    const path = window.location.pathname;
    if (path.includes('admin-login')) return;
    if (!path.endsWith('/') && !path.endsWith('/main-page.html')) return;
    window.location.replace(`./admin-login.html${hash}`);
  };

  redirectIdentityHashToLogin();

  if (document.body.classList.contains('new-event-page') && !isAdminSession()) {
    const redirect = encodeURIComponent('./new-event.html');
    window.location.replace(`./admin-login.html?redirect=${redirect}`);
    return;
  }

  if (document.body.classList.contains('organizer-dashboard-page')) {
    window.location.replace('./main-page.html');
    return;
  }

  const appendLogEntry = (entry) => {
    logBuffer.push(entry);
    if (!debugList) return;
    const item = document.createElement('div');
    item.className = 'debug-panel__item';
    item.textContent = `[${entry.ts}] ${entry.msg}`;
    debugList.prepend(item);
  };

  const emitClientLog = (entry) => {
    try {
      console.log('client-error', entry);
    } catch (error) {
      // Ignore logging errors.
    }
    if (debugEnabled) {
      appendLogEntry(entry);
    }
    try {
      fetch('/.netlify/functions/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
        keepalive: true
      }).catch(() => {});
    } catch (error) {
      // Optional log endpoint; ignore failures.
    }
  };

  if (debugEnabled) {
    debugPanel = document.createElement('section');
    debugPanel.className = 'debug-panel';
    debugPanel.setAttribute('aria-live', 'polite');
    debugPanel.innerHTML = `
      <button class="debug-panel__toggle" type="button" aria-expanded="true">Debug</button>
      <div class="debug-panel__list" role="status"></div>
    `;
    document.body.appendChild(debugPanel);
    debugList = debugPanel.querySelector('.debug-panel__list');
    const toggle = debugPanel.querySelector('.debug-panel__toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const isCollapsed = debugPanel.classList.toggle('is-collapsed');
        toggle.setAttribute('aria-expanded', String(!isCollapsed));
      });
    }
  }

  window.addEventListener('error', (event) => {
    emitClientLog({
      msg: event.message || 'Unknown error',
      stack: event.error?.stack || '',
      url: event.filename || window.location.href,
      ts: new Date().toISOString()
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason || {};
    emitClientLog({
      msg: reason.message || String(reason) || 'Unhandled rejection',
      stack: reason.stack || '',
      url: window.location.href,
      ts: new Date().toISOString()
    });
  });

  const injectEventJsonLd = () => {
    if (!document.body || !document.body.classList.contains('event-page')) return;
    const title = document.querySelector('.event-article h1')?.textContent?.trim() || document.title;
    const metaLine = document.querySelector('[data-event-start]');
    const startDate = metaLine?.dataset.eventStart || '';
    const endDate = metaLine?.dataset.eventEnd || '';
    const locationText = document.querySelector('.event-article__location')?.textContent || '';
    const [city, venue] = locationText.split('·').map((part) => part.trim());
    const organizerEl = document.querySelector('.organizer__name');
    const organizerName =
      organizerEl?.childNodes?.[0]?.textContent?.trim() ||
      organizerEl?.textContent?.trim() ||
      'Organizer';
    const priceEl = document.querySelector('.event-sidebar__price');
    const ticketCta = document.querySelector('[data-testid="ticket-cta"]');
    const priceMin = priceEl?.dataset.priceMin || '';
    const priceMax = priceEl?.dataset.priceMax || '';
    const priceValue = priceMin || priceMax || '0';
    const ticketUrl = ticketCta?.getAttribute('href') || window.location.href;
    const description =
      document.querySelector('[data-i18n="event_description_body"]')?.textContent?.trim() || '';

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: title,
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      eventStatus: 'https://schema.org/EventScheduled',
      location: {
        '@type': 'Place',
        name: venue || city || 'Venue',
        address: {
          '@type': 'PostalAddress',
          addressLocality: city || '',
          addressCountry: 'DK'
        }
      },
      description,
      organizer: {
        '@type': 'Organization',
        name: organizerName
      },
      offers: {
        '@type': 'Offer',
        price: priceValue,
        priceCurrency: 'DKK',
        availability: 'https://schema.org/InStock',
        url: ticketUrl
      }
    };

    if (startDate) jsonLd.startDate = startDate;
    if (endDate) jsonLd.endDate = endDate;

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(script);
  };

  const fetchJson = async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load ${url}`);
    }
    return response.json();
  };

  const fetchMergedEvents = async () => {
    let baseData = null;
    let publicData = null;
    let baseError = null;
    let publicError = null;
    try {
      baseData = await fetchJson('./data/events.json');
    } catch (error) {
      baseError = error;
    }
    if (hasServerlessSupport) {
      try {
        publicData = await fetchJson('/.netlify/functions/public-events');
      } catch (error) {
        publicError = error;
      }
    }
    if (!baseData && !publicData) {
      throw baseError || publicError || new Error('events');
    }
    const map = new Map();
    if (Array.isArray(baseData)) {
      baseData.forEach((event) => {
        if (event?.id) map.set(event.id, event);
      });
    }
    if (Array.isArray(publicData)) {
      publicData.forEach((event) => {
        if (event?.id) map.set(event.id, event);
      });
    }
    return mergeWithLocalEvents(Array.from(map.values()));
  };

  let translations = { uk: {} };

  const loadTranslations = async () => {
    try {
      const data = await fetchJson('./data/translations.json');
      if (data && typeof data === 'object') {
        translations = data;
      }
    } catch (error) {
      translations = { uk: {} };
    }
  };

  const getDictionary = () => translations.uk || {};

  let refreshVerificationUI = () => {};
  const publishState = { update: () => {} };
  let updateStaticTagAria = () => {};
  let updateCatalogI18n = () => {};

  const applyTranslations = () => {
    const dictionary = getDictionary();
    document.documentElement.lang = 'uk';
    document.querySelectorAll('[data-i18n]').forEach((element) => {
      const key = element.dataset.i18n;
      const value = dictionary[key];
      if (!value) return;
      if (typeof value === 'string') {
        element.textContent = value;
        return;
      }
      if (typeof value === 'object') {
        const variant = element.dataset.preset;
        if (variant && value[variant]) {
          element.textContent = value[variant];
        }
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
      const key = element.dataset.i18nPlaceholder;
      if (dictionary[key]) {
        element.setAttribute('placeholder', dictionary[key]);
      }
    });
    document.querySelectorAll('[data-i18n-aria]').forEach((element) => {
      const key = element.dataset.i18nAria;
      if (dictionary[key]) {
        element.setAttribute('aria-label', dictionary[key]);
      }
    });
    document.querySelectorAll('[data-i18n-title]').forEach((element) => {
      const key = element.dataset.i18nTitle;
      if (dictionary[key]) {
        element.setAttribute('title', dictionary[key]);
      }
    });
    document.querySelectorAll('[data-i18n-rich]').forEach((element) => {
      const key = element.dataset.i18nRich;
      const value = dictionary[key];
      if (!value || typeof value !== 'string') return;
      element.innerHTML = renderRichText(value);
    });

    const locale = 'uk_UA';
    const path = window.location.pathname;
    const page = document.body.classList.contains('event-page')
      ? 'event'
      : document.body.classList.contains('organizer-page')
        ? 'organizer'
        : document.body.classList.contains('about-page')
          ? 'about'
          : document.body.classList.contains('contacts-page')
            ? 'contacts'
            : document.body.classList.contains('docs-page')
              ? 'docs'
              : document.body.classList.contains('not-found-page')
                ? 'not_found'
                : document.body.classList.contains('legal-page') && path.includes('legal-privacy')
                  ? 'privacy'
                  : document.body.classList.contains('legal-page')
                    ? 'terms'
                    : path.includes('new-event')
                      ? 'dashboard_new'
                      : path.includes('dashboard')
                        ? 'dashboard'
                        : path.includes('admin-login')
                          ? 'admin_login'
                          : path.includes('admin-page')
                            ? 'admin'
                            : 'index';
    const titleKey = `meta_${page}_title`;
    const descKey = `meta_${page}_desc`;
    const titleText = dictionary[titleKey] || translations.uk[titleKey];
    const descText = dictionary[descKey] || translations.uk[descKey];
    if (titleText) {
      document.title = titleText;
      const ogTitle = document.querySelector('meta[property="og:title"]');
      const twitterTitle = document.querySelector('meta[name="twitter:title"]');
      if (ogTitle) ogTitle.setAttribute('content', titleText);
      if (twitterTitle) twitterTitle.setAttribute('content', titleText);
    }
    if (descText) {
      const description = document.querySelector('meta[name="description"]');
      const ogDesc = document.querySelector('meta[property="og:description"]');
      const twitterDesc = document.querySelector('meta[name="twitter:description"]');
      if (description) description.setAttribute('content', descText);
      if (ogDesc) ogDesc.setAttribute('content', descText);
      if (twitterDesc) twitterDesc.setAttribute('content', descText);
    }
    const ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale) {
      ogLocale.setAttribute('content', locale);
    }
    refreshVerificationUI();
    updateStaticTagAria();
    updateCatalogI18n();
    if (themeToggle) {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      themeToggle.textContent = isDark
        ? formatMessage('theme_dark', {})
        : formatMessage('theme_light', {});
    }
  };

  const renderRichText = (text) => {
    const escapeHtml = (value) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const escapeAttr = (value) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    const renderInline = (value) => {
      const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
      let output = '';
      let lastIndex = 0;
      value.replace(linkPattern, (match, label, href, offset) => {
        output += escapeHtml(value.slice(lastIndex, offset));
        output += `<a href="${escapeAttr(href)}">${escapeHtml(label)}</a>`;
        lastIndex = offset + match.length;
        return match;
      });
      output += escapeHtml(value.slice(lastIndex));
      return output;
    };
    const lines = text.split('\n');
    const parts = [];
    let listItems = [];
    let paragraph = [];

    const flushParagraph = () => {
      if (!paragraph.length) return;
      parts.push(`<p>${renderInline(paragraph.join(' '))}</p>`);
      paragraph = [];
    };
    const flushList = () => {
      if (!listItems.length) return;
      const items = listItems.map((item) => `<li>${renderInline(item)}</li>`).join('');
      parts.push(`<ul>${items}</ul>`);
      listItems = [];
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        flushParagraph();
        flushList();
        return;
      }
      if (trimmed.startsWith('- ')) {
        flushParagraph();
        listItems.push(trimmed.slice(2).trim());
        return;
      }
      if (listItems.length) {
        flushList();
      }
      paragraph.push(trimmed);
    });

    flushParagraph();
    flushList();

    return parts.join('');
  };

  const formatMessage = (key, replacements) => {
    const dictionary = getDictionary();
    const template = dictionary[key] || translations.uk[key] || '';
    if (!template) return '';
    return Object.keys(replacements).reduce((text, token) => {
      return text.replace(`{${token}}`, String(replacements[token]));
    }, template);
  };

  updateStaticTagAria = () => {
    const tagElements = document.querySelectorAll('[data-tag-label]');
    tagElements.forEach((tag) => {
      const label = tag.getAttribute('data-tag-label') || '';
      if (!label) return;
      const isPending =
        tag.classList.contains('event-tag--pending') ||
        tag.classList.contains('event-card__tag--pending');
      const key = isPending ? 'tag_pending_aria' : 'tag_aria';
      tag.setAttribute('aria-label', formatMessage(key, { label }));
    });
  };

  const VERIFICATION_KEY = 'organizerVerification';
  const VERIFICATION_LINK_KEY = 'organizerVerificationLink';

  const getVerificationState = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(VERIFICATION_KEY) || '{}');
      return {
        websitePending: Boolean(stored.websitePending),
        websiteApproved: Boolean(stored.websiteApproved)
      };
    } catch (error) {
      return { websitePending: false, websiteApproved: false };
    }
  };

  const saveVerificationState = (state) => {
    try {
      localStorage.setItem(VERIFICATION_KEY, JSON.stringify(state));
    } catch (error) {
      return;
    }
  };

  const getStoredVerificationLink = () => {
    try {
      return localStorage.getItem(VERIFICATION_LINK_KEY) || '';
    } catch (error) {
      return '';
    }
  };

  const setStoredVerificationLink = (link) => {
    try {
      localStorage.setItem(VERIFICATION_LINK_KEY, link);
    } catch (error) {
      return;
    }
  };

  const isOrganizerVerified = (state) => state.websiteApproved;

  const parseDateTime = (value) => {
    if (!value) return null;
    const direct = new Date(value);
    if (!Number.isNaN(direct.getTime())) return direct;
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
    if (!match) return null;
    const [, year, month, day, hour, minute] = match;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute)
    );
  };

  const formatDateTime = (value) => {
    const date = parseDateTime(value);
    if (!date) return value;
    const parts = new Intl.DateTimeFormat('uk-UA', {
      timeZone: 'Europe/Copenhagen',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(date);
    const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${map.day}.${map.month}.${map.year} · ${map.hour}:${map.minute}`;
  };

  const formatShortDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const parts = new Intl.DateTimeFormat('uk-UA', {
      timeZone: 'Europe/Copenhagen',
      day: '2-digit',
      month: '2-digit'
    }).formatToParts(date);
    const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${map.day}.${map.month}`;
  };

  const formatTime = (value) => {
    const date = parseDateTime(value);
    if (!date) return value;
    const parts = new Intl.DateTimeFormat('uk-UA', {
      timeZone: 'Europe/Copenhagen',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(date);
    const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${map.hour}:${map.minute}`;
  };

  const formatDateRange = (start, end) => {
    if (!start) return '';
    const startLabel = formatDateTime(start);
    if (!end) return startLabel;
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return startLabel;
    }
    if (
      startDate.getFullYear() === endDate.getFullYear() &&
      startDate.getMonth() === endDate.getMonth() &&
      startDate.getDate() === endDate.getDate()
    ) {
      return `${startLabel}–${formatTime(end)}`;
    }
    return `${startLabel} – ${formatDateTime(end)}`;
  };

  const isPast = (event) => {
    const now = new Date();
    const endValue = event?.end;
    const startValue = event?.start;
    if (endValue) {
      const endDate = new Date(endValue);
      return !Number.isNaN(endDate.getTime()) && endDate < now;
    }
    if (!startValue) return false;
    const startDate = new Date(startValue);
    return !Number.isNaN(startDate.getTime()) && startDate < now;
  };

  const isArchivedEvent = (event) => event?.archived === true || event?.status === 'archived';

  const formatCurrency = (value) => `DKK ${value}`;

  const formatPriceLabel = (priceType, min, max) => {
    if (priceType === 'free') {
      return formatMessage('price_free', {});
    }
    const minValue = Number.isFinite(min) ? min : null;
    const maxValue = Number.isFinite(max) ? max : null;
    if (minValue !== null && maxValue !== null) {
      return `${formatCurrency(minValue)}–${maxValue}`;
    }
    if (minValue !== null) {
      return formatCurrency(minValue);
    }
    if (maxValue !== null) {
      return formatCurrency(maxValue);
    }
    return 'DKK';
  };

  await loadTranslations();
  applyTranslations();
  injectEventJsonLd();

  const getPreferredTheme = () => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  };

  const applyTheme = (theme) => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    if (themeToggle) {
      const isDark = theme === 'dark';
      themeToggle.setAttribute('aria-pressed', String(isDark));
      themeToggle.textContent = isDark
        ? formatMessage('theme_dark', {})
        : formatMessage('theme_light', {});
    }
  };

  const initialTheme = getPreferredTheme();
  applyTheme(initialTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      const next = current === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', next);
      applyTheme(next);
    });
  }

  const verificationSection = document.querySelector('[data-verification]');
  const verificationStatus = verificationSection
    ? verificationSection.querySelector('.verification__status')
    : null;
  const verificationHoneypot = verificationSection
    ? verificationSection.querySelector('[data-honeypot]')
    : null;
  const linkInput = verificationSection
    ? verificationSection.querySelector('input[name="verification-link"]')
    : null;
  const linkSubmitButton = verificationSection
    ? verificationSection.querySelector('[data-action="submit-link"]')
    : null;
  const verificationPending = verificationSection
    ? verificationSection.querySelector('.verification__pending')
    : null;
  let verificationStatusKey = null;

  const setVerificationStatus = (key, isError = false) => {
    verificationStatusKey = key;
    if (!verificationStatus) return;
    verificationStatus.textContent = key ? formatMessage(key, {}) : '';
    verificationStatus.classList.toggle('is-error', isError);
  };

  const applyVerificationState = (state) => {
    document.querySelectorAll('[data-verified-badge]').forEach((badge) => {
      badge.hidden = !isOrganizerVerified(state);
    });
    if (verificationPending) {
      verificationPending.hidden = !(state.websitePending && !state.websiteApproved);
    }
  };

  const syncVerificationWithServer = async () => {
    const link = getStoredVerificationLink();
    if (!link) return;
    try {
      const response = await fetch(
        `/.netlify/functions/organizer-verification?link=${encodeURIComponent(link)}`
      );
      if (!response.ok) return;
      const result = await response.json();
      if (!result || !result.ok) return;
      const current = getVerificationState();
      const nextState = {
        ...current,
        websiteApproved: Boolean(result.verified),
        websitePending: Boolean(result.pending)
      };
      saveVerificationState(nextState);
      applyVerificationState(nextState);
    } catch (error) {
      return;
    }
  };

  refreshVerificationUI = () => {
    const state = getVerificationState();
    applyVerificationState(state);
    if (verificationStatusKey) {
      setVerificationStatus(verificationStatusKey, verificationStatus?.classList.contains('is-error'));
    }
    publishState.update();
  };

  if (verificationSection) {
    const state = getVerificationState();
    applyVerificationState(state);
    syncVerificationWithServer();
    if (linkSubmitButton && linkInput) {
      linkSubmitButton.addEventListener('click', async () => {
        try {
          if (!linkInput.checkValidity()) {
            linkInput.reportValidity();
            return;
          }
          if (verificationHoneypot && verificationHoneypot.value.trim()) {
            setVerificationStatus('verification_spam', true);
            return;
          }
          const linkValue = linkInput.value.trim();
          setStoredVerificationLink(linkValue);
          await fetch('/.netlify/functions/organizer-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              link: linkValue,
              name: linkValue
            })
          });
          const nextState = { ...getVerificationState(), websitePending: true, websiteApproved: false };
          saveVerificationState(nextState);
          applyVerificationState(nextState);
          setVerificationStatus('verification_pending', false);
          publishState.update();
        } catch (error) {
          setVerificationStatus('verification_error', true);
        }
      });
    }
  }
  refreshVerificationUI();

  const shouldLoadAdmin =
    document.body.classList.contains('admin-page') ||
    document.body.classList.contains('admin-login-page');
  if (shouldLoadAdmin) {
    import('./modules/admin.js')
      .then(({ initAdmin }) => {
        initAdmin({ formatMessage });
      })
      .catch(() => {});
  }

  if (document.querySelector('.multi-step')) {
    import('./modules/event-form.js')
      .then(({ initEventForm }) => {
        initEventForm({ formatMessage, getVerificationState, publishState });
      })
      .catch(() => {});
  }

  const closeMenu = () => {
    if (!header || !menuToggle) return;
    header.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
  };

  const openMenu = () => {
    if (!header || !menuToggle) return;
    header.classList.add('is-open');
    menuToggle.setAttribute('aria-expanded', 'true');
  };

  const setFilterState = (button, isExpanded) => {
    const controls = button.getAttribute('aria-controls');
    if (!controls) return;
    const panel = document.getElementById(controls);
    if (!panel) return;
    button.setAttribute('aria-expanded', String(isExpanded));
    panel.hidden = !isExpanded;
  };

  const closeAllFilters = () => {
    filterToggles.forEach((button) => {
      setFilterState(button, false);
    });
  };

  if (menuToggle && header) {
    menuToggle.addEventListener('click', () => {
      const isOpen = header.classList.contains('is-open');
      if (isOpen) {
        closeMenu();
      } else {
        openMenu();
      }
    });
  }

  if (header) {
    let ticking = false;
    const updateHeaderShadow = () => {
      header.classList.toggle('site-header--scrolled', window.scrollY > 4);
      header.classList.toggle('is-scrolled', window.scrollY > 8);
      ticking = false;
    };
    updateHeaderShadow();
    window.addEventListener(
      'scroll',
      () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(updateHeaderShadow);
      },
      { passive: true }
    );
  }

  filterToggles.forEach((button) => {
    button.addEventListener('click', () => {
      const isExpanded = button.getAttribute('aria-expanded') === 'true';
      setFilterState(button, !isExpanded);
    });
  });

  if (primaryNav) {
    primaryNav.addEventListener('click', (event) => {
      const target = event.target;
      if (target instanceof HTMLAnchorElement) {
        closeMenu();
      }
    });
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (smallScreenQuery.matches) {
      closeMenu();
      closeAllFilters();
    } else {
      closeMenu();
    }
    if (menuToggle && document.activeElement !== menuToggle) {
      menuToggle.focus();
    }
  });


    if (catalogGrid) {
      const filtersForm = document.querySelector('.filters');
      const resultsCount = document.querySelector('.filters__count');
      const emptyState = document.querySelector('.catalog-empty');
      const errorState = document.querySelector('.catalog-error');
    const nextEventsButton = document.querySelector('[data-action="events-next"]');
    const resetEventsButton = document.querySelector('[data-action="events-reset"]');
    const paginationContainer = document.querySelector('[data-catalog-pages]');
    const searchInputs = Array.from(document.querySelectorAll('[data-event-search]'));
    const primarySearchInput = searchInputs[0] || null;
    const heroTitle = document.querySelector('[data-hero-title]');
    const heroMeta = document.querySelector('[data-hero-meta]');
    const heroTags = document.querySelector('[data-hero-tags]');
    const heroLink = document.querySelector('[data-hero-link]');
    const pastHint = document.querySelector('[data-past-hint]');
    const advancedToggle = document.querySelector('[data-action="filters-advanced"]');
    const advancedPanel = document.querySelector('#filters-advanced');
    const presetButtons = filtersForm ? Array.from(filtersForm.querySelectorAll('.filters__preset')) : [];
    const presetInputs = filtersForm
      ? {
          today: filtersForm.elements['quick-today'],
          tomorrow: filtersForm.elements['quick-tomorrow'],
          weekend: filtersForm.elements['quick-weekend'],
          online: filtersForm.elements['quick-online']
        }
      : {};
    const emptyResetButton = document.querySelector('[data-action="reset-filters"]');
    const errorRetryButton = errorState ? errorState.querySelector('[data-action="retry-load"]') : null;
      let currentFormData = null;
      let currentPage = 1;
      let totalPages = 1;
      const pageSize = 16;
      const activeFilters = {
        city: '',
        searchQuery: '',
        priceCategory: '',
        tags: new Set()
      };
    const CATALOG_STATE_KEY = 'wodCatalogState';
    let pendingCatalogState = null;
    let catalogStateRestored = false;

    const normalizeFilterString = (value) => {
      if (!value) return '';
      return value.startsWith('?') ? value : `?${value}`;
    };

    const loadCatalogState = () => {
      try {
        const raw = sessionStorage.getItem(CATALOG_STATE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (error) {
        return null;
      }
    };

    const applyStoredFilters = () => {
      if (!pendingCatalogState) return;
      const stored = normalizeFilterString(pendingCatalogState.filters || '');
      const current = window.location.search || '';
      if (!stored) {
        pendingCatalogState.filters = current;
        return;
      }
      if (stored === current) {
        pendingCatalogState.filters = current;
        return;
      }
      window.history.replaceState({}, '', `${window.location.pathname}${stored}`);
      pendingCatalogState.filters = stored;
    };

    const persistCatalogState = () => {
      try {
        const state = {
          scrollY: window.scrollY,
          page: currentPage,
          filters: window.location.search || ''
        };
        sessionStorage.setItem(CATALOG_STATE_KEY, JSON.stringify(state));
      } catch (error) {
        console.warn('Unable to persist catalog state', error);
      }
    };

    const restoreCatalogState = () => {
      if (!pendingCatalogState || catalogStateRestored) return;
      const targetPage = Number(pendingCatalogState.page) || 1;
      if (targetPage > 1) {
        currentPage = targetPage;
      }
      const scrollY = Number(pendingCatalogState.scrollY) || 0;
      if (scrollY) {
        window.scrollTo({ top: scrollY, behavior: 'auto' });
      }
      sessionStorage.removeItem(CATALOG_STATE_KEY);
      catalogStateRestored = true;
      pendingCatalogState = null;
    };
    const dateFromField = filtersForm ? filtersForm.elements['date-from'] : null;
    const dateToField = filtersForm ? filtersForm.elements['date-to'] : null;
    const showPastField = filtersForm ? filtersForm.elements['show-past'] : null;
    const advancedFields = filtersForm
      ? [filtersForm.elements.price, filtersForm.elements.format, dateFromField, dateToField]
      : [];
    const tagsFilterList = document.querySelector('[data-filters-tags-list]');
    const tagsFilterEmpty = document.querySelector('[data-filters-tags-empty]');
    const tagsFilterMoreButton = document.querySelector('[data-filters-tags-more]');
    const tagsModal = document.querySelector('[data-tags-modal]');
    const tagsModalList = document.querySelector('[data-tags-modal-list]');
    const tagsModalCloseButtons = document.querySelectorAll('[data-tags-modal-close]');
    const tagsGroup = document.querySelector('[data-filters-tags-group]');
    const dateGroup = document.querySelector('[data-filters-date-group]');
    const paramsGroup = document.querySelector('[data-filters-params-group]');
    const advancedFilters = document.querySelector('#filters-advanced');
    const cityField = filtersForm?.elements ? filtersForm.elements.city : null;
    const priceField = filtersForm?.elements ? filtersForm.elements.price : null;
    if (cityField instanceof HTMLSelectElement) {
      cityField.addEventListener('change', () => {
        setCityFilter(cityField.value);
        applyFilters();
      });
    }
    if (priceField instanceof HTMLSelectElement) {
      priceField.addEventListener('change', () => {
        setPriceFilter(priceField.value);
        applyFilters();
      });
    }
    if (tagsFilterList && filtersForm) {
      tagsFilterList.addEventListener('change', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        if (target.name !== 'tags') return;
        setSelectedTag(target.value, target.checked);
        renderTagFilters(state.events);
        applyFilters();
      });
    }

    const normalize = (value) => String(value || '').toLowerCase();
    const getTokens = (value) =>
      normalize(value)
        .split(/[\s,]+/)
        .map((token) => token.trim())
        .filter(Boolean);

    const normalizeSearchValue = (text) => String(text || '').trim().toLowerCase();
    const escapeHtml = (value) =>
      String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const matchesActiveFilters = (event) => {
      if (activeFilters.city) {
        if (normalize(event.city) !== normalize(activeFilters.city)) {
          return false;
        }
      }
      if (activeFilters.priceCategory) {
        if (normalize(event.priceType || event.priceCategory) !== normalize(activeFilters.priceCategory)) {
          return false;
        }
      }
      if (activeFilters.searchQuery) {
      const lang = 'uk';
        const query = normalize(activeFilters.searchQuery);
        const haystack = [
        getLocalizedEventTitle(event),
          event.description,
        getLocalizedCity(event.city),
          event.venue,
        getTagList(event.tags).map((tag) => getLocalizedTag(tag.label)).join(' ')
        ]
          .map((value) => normalize(value))
          .join(' ');
        if (!haystack.includes(query)) {
          return false;
        }
      }
      if (activeFilters.tags.size) {
        const eventTags = getTagList(event.tags).map((tag) => normalize(tag.label));
        for (const tag of activeFilters.tags) {
          if (!eventTags.includes(tag)) return false;
        }
      }
      return true;
    };

    const EVENT_TITLES = {
      'evt-001': {
        uk: 'Тиждень дизайну в Копенгагені: Open Studio',
      },
      'evt-002': {
        uk: 'Зимовий фестиваль їжі в Орхусі',
      },
      'evt-003': {
        uk: 'Нічний забіг в Оденсе біля річки',
      },
      'evt-004': {
        uk: 'Творчий coding jam в Ольборзі',
      },
      'evt-005': {
        uk: "Сімейний кіновечір в Есб'єрзі",
      },
      'evt-006': {
        uk: 'Спільний сніданок для новоприбулих',
      },
      'evt-007': {
        uk: 'Концертний вечір у Копенгагені',
      },
      'evt-008': {
        uk: 'Показ українського фільму',
      },
      'evt-009': {
        uk: 'Клуб данської мови',
      },
      'evt-010': {
        uk: 'Нетворкінг-ланч для стартапів',
      },
      'evt-011': {
        uk: 'Маркет ремесел та мейкерів у Колдингу',
      },
      'evt-012': {
        uk: 'Історична прогулянка в Роскілле',
      },
      'evt-013': {
        uk: 'День каякінгу на озері в Сількеборзі',
      },
      'evt-014': {
        uk: 'Сімейний день науки у Вайле',
      },
      'evt-015': {
        uk: 'День волонтера: прибирання міста',
      },
      'evt-016': {
        uk: 'Сімейний день у музеї Копенгагена',
      },
      'evt-017': {
        uk: "Кар'єрна консультація для новоприбулих",
      },
      'evt-018': {
        uk: 'Вечір арт-терапії',
      },
      'evt-019': {
        uk: 'День спадщини в Хельсінгёрі',
      },
      'evt-020': {
        uk: 'Форум української спільноти',
      }
    };

    const CITY_TRANSLATIONS = {
    copenhagen: { uk: 'Копенгаген' },
    aarhus: { uk: 'Орхус' },
    odense: { uk: 'Оденсе' },
    aalborg: { uk: 'Ольборг' },
    esbjerg: { uk: "Есб'єрг" },
    kolding: { uk: 'Колдинг' },
    roskilde: { uk: 'Роскілле' },
    silkeborg: { uk: 'Сількеборг' },
    vejle: { uk: 'Вайле' },
    fredericia: { uk: 'Фредерісія' },
    helsingør: { uk: 'Хельсінгёр' },
    helsingor: { uk: 'Хельсінгёр' }
    };

    const TAG_TRANSLATIONS = {
    adventure: { uk: 'пригоди' },
    art: { uk: 'мистецтво' },
    career: { uk: "кар'єра" },
    castle: { uk: 'замок' },
    cinema: { uk: 'кіно' },
    coding: { uk: 'кодинг' },
    community: { uk: 'спільнота' },
    craft: { uk: 'ремесла' },
    creative: { uk: 'креатив' },
    culture: { uk: 'культура' },
    danish: { uk: 'данська' },
    design: { uk: 'дизайн' },
    discussion: { uk: 'обговорення' },
    family: { uk: 'родина' },
    festival: { uk: 'фестиваль' },
    food: { uk: 'їжа' },
    heritage: { uk: 'спадщина' },
    history: { uk: 'історія' },
    indie: { uk: 'інді' },
    kayak: { uk: 'каяк' },
    kids: { uk: 'діти' },
    language: { uk: 'мова' },
    live: { uk: 'лайв' },
    lunch: { uk: 'обід' },
    market: { uk: 'маркет' },
    museum: { uk: 'музей' },
    music: { uk: 'музика' },
    networking: { uk: 'нетворкінг' },
    night: { uk: 'ніч' },
    outdoors: { uk: 'на природі' },
    science: { uk: 'наука' },
    sports: { uk: 'спорт' },
    startup: { uk: 'стартап' },
    studio: { uk: 'студія' },
    support: { uk: 'підтримка' },
    talk: { uk: 'розмова' },
    ua: { uk: 'UA' },
    volunteer: { uk: 'волонтерство' },
    volunteers: { uk: 'волонтери' },
    walking: { uk: 'пішохідна' },
    welcome: { uk: 'вітання' },
    wellbeing: { uk: 'добробут' },
    workshop: { uk: 'воркшоп' }
    };

  const getLocalizedEventTitle = (event) =>
    EVENT_TITLES[event.id]?.uk || event.title;

  const localizeByMap = (value, map) => {
      const key = normalize(value);
      const record = map[key];
      if (!record) return value;
    return record.uk || value;
    };

  const getLocalizedCity = (value) => {
      if (!value) return value;
      const normalized = normalize(value);
      const keyMap = {
        copenhagen: 'filters_city_copenhagen',
        aarhus: 'filters_city_aarhus',
        odense: 'filters_city_odense',
        aalborg: 'filters_city_aalborg',
        esbjerg: 'filters_city_esbjerg'
      };
      const key = keyMap[normalized];
      if (key) {
        const translated = formatMessage(key, {});
        return translated || value;
      }
    return localizeByMap(value, CITY_TRANSLATIONS);
    };

  const getLocalizedTag = (value) => localizeByMap(value, TAG_TRANSLATIONS);

    const getTagLabel = (tag) => (typeof tag === 'string' ? tag : tag?.label || '');
    const getTagStatus = (tag) => (typeof tag === 'string' ? 'approved' : tag?.status || 'approved');
    const getTagList = (tags) =>
      (tags || [])
        .map((tag) => ({ label: getTagLabel(tag), status: getTagStatus(tag) }))
        .filter((tag) => tag.label);

    const truncateText = (value, maxLength) => {
      const clean = String(value || '').replace(/\s+/g, ' ').trim();
      if (!clean) return '';
      if (clean.length <= maxLength) return clean;
      return `${clean.slice(0, maxLength - 3).trimEnd()}...`;
    };

    const selectHighlights = (list, limit) =>
      [...list]
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
        .slice(0, limit);

    const eventCardHelpers = {
      formatPriceLabel,
      formatMessage,
      getTagList,
      getLocalizedTag,
      getLocalizedEventTitle,
      getLocalizedCity,
      formatDateRange,
      isPast,
      isArchived: isArchivedEvent
    };

    const highlightCardHelpers = {
      formatShortDate,
      getLocalizedEventTitle,
      getLocalizedCity
    };

    const renderHighlights = (list) => {
      if (!highlightsTrack) return;
      const now = new Date();
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const upcomingWeek = list.filter((event) => {
        if (event.status !== 'published') return false;
        if (isArchivedEvent(event)) return false;
        if (isPast(event)) return false;
        const startDate = new Date(event.start);
        if (Number.isNaN(startDate.getTime())) return false;
        return startDate >= now && startDate <= weekEnd;
      });

      if (!upcomingWeek.length) {
        highlightsTrack.innerHTML = `
          <div class="highlights__empty">
            <p class="highlights__empty-title">Немає подій на найближчий тиждень.</p>
            <p class="highlights__empty-text">Перевірте каталог або поверніться пізніше — ми додаємо нові події регулярно.</p>
          </div>
        `;
        return;
      }

      const selection = selectHighlights(upcomingWeek, 6);
      highlightsTrack.innerHTML = selection.map((event) => HighlightCard(event, highlightCardHelpers)).join('');
    };

    const getNextUpcomingEvent = (formData) => {
      if (!formData) return null;
      const upcoming = state.events
        .filter((event) => matchesFilters(event, formData, { ignorePastToggle: true }))
        .filter((event) => !isArchivedEvent(event))
        .filter((event) => {
          const start = new Date(event.start);
          return !Number.isNaN(start.getTime()) && start >= new Date();
        })
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      return upcoming[0] || null;
    };

    let liveRotationTimer = null;
    let liveRotationIndex = 0;
    let liveRotationKey = '';

    const getEventEndDate = (event) => {
      const start = new Date(event.start);
      if (Number.isNaN(start.getTime())) return null;
      if (event.end) {
        const end = new Date(event.end);
        if (!Number.isNaN(end.getTime())) return end;
      }
      return new Date(start.getTime() + 90 * 60 * 1000);
    };

    const getLiveEvents = (list) => {
      const now = new Date();
      return list.filter((event) => {
        if (!event || event.status !== 'published') return false;
        if (isArchivedEvent(event)) return false;
        const start = new Date(event.start);
        const end = getEventEndDate(event);
        if (Number.isNaN(start.getTime()) || !end) return false;
        return start <= now && now <= end;
      });
    };

    const renderHeroCard = (event, isLive) => {
      if (!heroTitle || !heroMeta || !heroTags) return;
      if (!event) {
        heroTitle.textContent = formatMessage('next_up_empty', {});
        heroMeta.textContent = '';
        heroTags.innerHTML = '';
        heroTags.hidden = true;
        if (heroStatus) {
          heroStatus.hidden = true;
        }
        if (heroKicker) {
          heroKicker.textContent = formatMessage('hero_next_up', {});
        }
        if (heroLink) {
          heroLink.setAttribute('href', './main-page.html#events');
          heroLink.setAttribute('aria-disabled', 'true');
        }
        return;
      }
      const title = getLocalizedEventTitle(event);
      const city = getLocalizedCity(event.city);
      const timeLabel = formatDateRange(event.start, event.end);
      heroTitle.textContent = title;
      heroMeta.textContent = city ? `${city} · ${timeLabel}` : timeLabel;
      const tagLabels = [];
      const firstTag = getTagList(event.tags)[0];
      if (firstTag) {
      tagLabels.push(getLocalizedTag(firstTag.label));
      }
      heroTags.innerHTML = tagLabels.map((label) => `<span>${label}</span>`).join('');
      heroTags.hidden = tagLabels.length === 0;
      if (heroLink) {
        heroLink.setAttribute('href', `event-card.html?id=${encodeURIComponent(event.id)}`);
        heroLink.removeAttribute('aria-disabled');
      }
      if (heroStatus) {
        heroStatus.hidden = !isLive;
        if (isLive) {
          heroStatus.textContent = formatMessage('live_label', {});
        }
      }
      if (heroKicker) {
        heroKicker.textContent = formatMessage(isLive ? 'hero_live_kicker' : 'hero_next_up', {});
      }
    };

    const renderApp = () => {
      const payload = currentFormData || (filtersForm ? new FormData(filtersForm) : null);
      const pageSlice = getPageSlice(state.filteredEvents, currentPage, pageSize);
      currentPage = pageSlice.currentPage;
      totalPages = pageSlice.totalPages;
      const list = pageSlice.items;
      renderEvents(list);
      renderHighlights(state.events);
      const liveEvents = getLiveEvents(state.events);
      const liveKey = liveEvents.map((event) => event.id).join('|');
      if (liveKey !== liveRotationKey) {
        liveRotationKey = liveKey;
        liveRotationIndex = 0;
      }
      if (liveEvents.length > 0) {
        renderHeroCard(liveEvents[liveRotationIndex % liveEvents.length], true);
        if (liveEvents.length > 1 && !liveRotationTimer) {
          liveRotationTimer = window.setInterval(() => {
            liveRotationIndex = (liveRotationIndex + 1) % liveEvents.length;
            renderHeroCard(liveEvents[liveRotationIndex], true);
          }, 6000);
        } else if (liveEvents.length <= 1 && liveRotationTimer) {
          window.clearInterval(liveRotationTimer);
          liveRotationTimer = null;
        }
      } else {
        if (liveRotationTimer) {
          window.clearInterval(liveRotationTimer);
          liveRotationTimer = null;
        }
        renderHeroCard(getNextUpcomingEvent(payload), false);
      }
    };

    const updateCount = (count) => {
      if (resultsCount) {
        resultsCount.textContent = formatMessage('found_count', { count });
      }
    };

    const renderPagination = () => {
      if (!paginationContainer) return;
      if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        paginationContainer.hidden = true;
        return;
      }
      paginationContainer.hidden = false;
      const buttons = Array.from({ length: totalPages }, (_, index) => {
        const page = index + 1;
        const isActive = page === currentPage;
        return `<button class="catalog-page${isActive ? ' is-active' : ''}" type="button" data-page="${page}" aria-current="${isActive ? 'page' : 'false'}">${page}</button>`;
      });
      paginationContainer.innerHTML = buttons.join('');
    };

    const syncPastFilterState = (shouldClear) => {
      if (!showPastField) return;
      const isPast = Boolean(showPastField.checked);
      if (dateFromField) {
        dateFromField.disabled = isPast;
        if (isPast && shouldClear) {
          dateFromField.value = '';
        }
      }
      if (dateToField) {
        dateToField.disabled = isPast;
        if (isPast && shouldClear) {
          dateToField.value = '';
        }
      }
      if (isPast && shouldClear) {
        clearOtherDatePresets();
        syncPresetButtons();
      }
      if (pastHint) {
        pastHint.hidden = !isPast;
      }
    };

    updateCatalogI18n = () => {
      renderApp();
    };

    const seenCards = new Set();
    let cardObserver = null;

    const observeCards = () => {
      if (!('IntersectionObserver' in window)) return;
      if (!cardObserver) {
        cardObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              const card = entry.target;
              const eventId = card.dataset.eventId;
              if (!eventId || seenCards.has(eventId)) return;
              seenCards.add(eventId);
              try {
                console.log('metrics', { eventId, action: 'view' });
              } catch (error) {
                console.log('metrics', { eventId, action: 'view' });
              }
              cardObserver.unobserve(card);
            });
          },
          { threshold: 0.25 }
        );
      }
      const cards = catalogGrid.querySelectorAll('.event-card[data-event-id]');
      cards.forEach((card) => {
        if (!seenCards.has(card.dataset.eventId)) {
          cardObserver.observe(card);
        }
      });
    };

    const renderEvents = (list) => {
      catalogGrid.innerHTML = list.map((event) => EventCard(event, eventCardHelpers)).join('');
      const hasResults = list.length > 0;
      if (emptyState) {
        emptyState.hidden = hasResults;
      }
      if (errorState) {
        errorState.hidden = true;
      }
      updateCount(state.filteredEvents.length);
      observeCards();
    };

    if (catalogGrid) {
      catalogGrid.addEventListener('click', (event) => {
        const card = event.target.closest('.event-card');
        if (!card) return;
        if (event.target.closest('a, button, input, select, textarea')) return;
        const eventId = card.dataset.eventId;
        if (eventId) {
          persistCatalogState();
          window.location.href = `event-card.html?id=${encodeURIComponent(eventId)}`;
        }
      });
    }

    const setErrorState = (hasError) => {
      if (errorState) {
        errorState.hidden = !hasError;
      }
      if (emptyState) {
        emptyState.hidden = true;
      }
      if (hasError) {
        catalogGrid.innerHTML = '';
        updateCount(0);
        if (nextEventsButton) {
          nextEventsButton.disabled = true;
        }
        if (nextEventsButton) {
          nextEventsButton.disabled = true;
        }
      }
    };

    const matchesFilters = (event, formData, options = {}) => {
      const ignorePastToggle = options.ignorePastToggle;
      const includeArchived = options.includeArchived === true;
      const archivedEvent = isArchivedEvent(event);
      if (archivedEvent && !includeArchived) return false;
      if (!archivedEvent && event.status !== 'published') return false;
      if (!filtersForm || !formData) return true;
      const lang = document.documentElement.lang || 'uk';
      const dateFrom = formData.get('date-from');
      const dateTo = formData.get('date-to');
      const city = normalize(formData.get('city'));
      const price = normalize(formData.get('price'));
      const format = normalize(formData.get('format'));
      const quickToday = formData.get('quick-today');
      const quickTomorrow = formData.get('quick-tomorrow');
      const quickWeekend = formData.get('quick-weekend');
      const quickOnline = formData.get('quick-online');
      const showPast = formData.get('show-past');
      const selectedTags = formData.getAll('tags').map((tag) => normalize(tag));
      const searchValue = normalize(activeFilters.searchQuery || '');

      if (!ignorePastToggle) {
        if (showPast) {
          if (!isPast(event)) return false;
        } else if (isPast(event)) {
          return false;
        }
      } else if (isPast(event)) {
        return false;
      }

      const startDate = new Date(event.start);
      if (dateFrom) {
        const from = new Date(dateFrom);
        if (startDate < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (startDate > to) return false;
      }
      if (quickToday) {
        const today = new Date();
        if (
          startDate.getFullYear() !== today.getFullYear() ||
          startDate.getMonth() !== today.getMonth() ||
          startDate.getDate() !== today.getDate()
        ) {
          return false;
        }
      }
      if (quickTomorrow) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (
          startDate.getFullYear() !== tomorrow.getFullYear() ||
          startDate.getMonth() !== tomorrow.getMonth() ||
          startDate.getDate() !== tomorrow.getDate()
        ) {
          return false;
        }
      }
      if (quickWeekend) {
        const day = startDate.getDay();
        if (day !== 0 && day !== 6) {
          return false;
        }
      }
      if (quickOnline && normalize(event.format) !== 'online') {
        return false;
      }
      if (city && normalize(event.city) !== city) return false;
      if (price && normalize(event.priceType) !== price) return false;
      if (format && normalize(event.format) !== format) return false;
      if (selectedTags.length) {
        const eventTags = getTagList(event.tags).map((tag) => normalize(tag.label));
        for (const tag of selectedTags) {
          if (!tag) continue;
          if (!eventTags.includes(tag)) return false;
        }
      }
      if (searchValue) {
        const localizedTitle = getLocalizedEventTitle(event, lang);
        const localizedCity = getLocalizedCity(event.city, lang);
        const localizedTags = getTagList(event.tags).map((tag) => getLocalizedTag(tag.label, lang));
        const haystack = [
          localizedTitle,
          event.description,
          localizedCity,
          event.venue,
          localizedTags.join(' ')
        ]
          .map(normalize)
          .join(' ');
        if (!haystack.includes(searchValue)) return false;
      }
      return true;
    };

    const setCityFilter = (value) => {
      activeFilters.city = normalize(value);
    };

    const setPriceFilter = (value) => {
      activeFilters.priceCategory = normalize(value);
    };

    const setSearchFilter = (value) => {
      activeFilters.searchQuery = normalizeSearchValue(value);
    };

    let selectedTagOrder = [];

    const syncSelectedTags = () => {
      if (!filtersForm) {
        activeFilters.tags.clear();
        selectedTagOrder = [];
        return;
      }
      const formData = new FormData(filtersForm);
      const values = formData.getAll('tags').map((value) => normalize(value)).filter(Boolean);
      const selectedSet = new Set(values);
      selectedTagOrder = selectedTagOrder.filter((tag) => selectedSet.has(tag));
      values.forEach((tag) => {
        if (!selectedTagOrder.includes(tag)) {
          selectedTagOrder.push(tag);
        }
      });
      activeFilters.tags = new Set(selectedTagOrder);
    };

    const setSelectedTag = (value, checked) => {
      const normalized = normalize(value);
      if (!normalized) return;
      selectedTagOrder = selectedTagOrder.filter((tag) => tag !== normalized);
      if (checked) {
        selectedTagOrder.unshift(normalized);
      }
      activeFilters.tags = new Set(selectedTagOrder);
    };

    const resetActiveFilters = () => {
      activeFilters.city = '';
      activeFilters.searchQuery = '';
      activeFilters.priceCategory = '';
      activeFilters.tags.clear();
      selectedTagOrder = [];
    };

    const applyFilters = (options = {}) => {
      const preservePage = options.preservePage === true;
      if (!preservePage) {
        currentPage = 1;
      }
      syncPastFilterState(false);
      setErrorState(false);
      updateCatalogQueryParams();
      const formData = filtersForm ? new FormData(filtersForm) : null;
      currentFormData = formData;
      const includeArchived = isAdminSession();
      const baseList = state.events.filter((event) =>
        matchesFilters(event, formData, { includeArchived })
      );
      const showPast = formData?.get('show-past');
      const nextFilteredEvents = baseList.slice();
      if (showPast) {
        nextFilteredEvents.sort((a, b) => {
          const aDate = new Date(a.end || a.start || 0).getTime();
          const bDate = new Date(b.end || b.start || 0).getTime();
          return bDate - aDate;
        });
      } else {
        nextFilteredEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      }
      setFilteredEvents(nextFilteredEvents);
      totalPages = getTotalPages(nextFilteredEvents.length, pageSize);
      currentPage = clampPage(currentPage, totalPages);
      if (nextEventsButton) {
        nextEventsButton.disabled = currentPage >= totalPages;
      }
      if (resetEventsButton) {
        resetEventsButton.hidden = true;
      }
      renderPagination();
      restoreCatalogState();
      renderApp();
    };

    const goToPage = (page) => {
      currentPage = Math.min(Math.max(page, 1), totalPages);
      updateCatalogQueryParams();
      applyFilters({ preservePage: true });
    };

    const getLocalDateString = (date) => date.toISOString().split('T')[0];

    const setDateRange = (start, end) => {
      if (!filtersForm) return;
      const fromField = filtersForm.elements['date-from'];
      const toField = filtersForm.elements['date-to'];
      if (fromField) {
        fromField.value = start ? getLocalDateString(start) : '';
      }
      if (toField) {
        toField.value = end ? getLocalDateString(end) : '';
      }
    };

    const syncPresetButtons = () => {
      presetButtons.forEach((button) => {
        const key = button.dataset.quick;
        const input = presetInputs[key];
        if (!input) return;
        button.setAttribute('aria-pressed', input.checked ? 'true' : 'false');
      });
    };

    const clearOtherDatePresets = (activeKey) => {
      ['today', 'tomorrow', 'weekend'].forEach((key) => {
        if (activeKey && key === activeKey) return;
        const input = presetInputs[key];
        if (input) {
          input.checked = false;
        }
      });
    };

    const applyDatePreset = (key) => {
      if (key === 'today') {
        setDateRange(new Date(), new Date());
      }
      if (key === 'tomorrow') {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        setDateRange(date, date);
      }
      if (key === 'weekend') {
        const now = new Date();
        const day = now.getDay();
        const saturdayOffset = day === 6 ? 0 : (6 - day + 7) % 7;
        const saturday = new Date(now);
        saturday.setDate(now.getDate() + saturdayOffset);
        const sunday = new Date(saturday);
        sunday.setDate(saturday.getDate() + 1);
        setDateRange(saturday, sunday);
      }
    };

    const setSelectFromTokens = (select, tokens) => {
      if (!select || !tokens.length) return false;
      for (const option of Array.from(select.options)) {
        const value = normalize(option.value);
        const label = normalize(option.textContent);
        if (!value) continue;
        if (tokens.includes(value) || tokens.includes(label)) {
          if (select.value !== option.value) {
            select.value = option.value;
            if (select.name === 'city') {
              setCityFilter(select.value);
            } else if (select.name === 'price') {
              setPriceFilter(select.value);
            }
            return true;
          }
          return false;
        }
      }
      return false;
    };

    let tagFilterData = [];

    const buildTagToggle = (tag, index, selected, target) => {
      const tone = index % 2 === 0 ? 'cool' : 'warm';
      const checked = selected ? ' checked' : '';
      const selectedClass = selected ? ' filters__tag--selected' : '';
      const name = target === 'modal' ? 'tags-modal' : 'tags';
      return `<label class="filters__tag${selectedClass}" data-tone="${tone}">
        <input type="checkbox" name="${name}" value="${escapeHtml(tag.value)}"${checked} />
        <span>${escapeHtml(tag.label)}</span>
      </label>`;
    };

    const updateTagOverflow = () => {
      if (!tagsFilterList || !tagsFilterMoreButton) return;
      const hasOverflow = tagsFilterList.scrollHeight - tagsFilterList.clientHeight > 4;
      tagsFilterMoreButton.hidden = !hasOverflow;
    };

    const syncTagsGroupHeight = () => {
      if (!tagsGroup || !dateGroup || !paramsGroup) return;
      const dateHeight = dateGroup.getBoundingClientRect().height;
      const paramsHeight = paramsGroup.getBoundingClientRect().height;
      let gap = 0;
      if (advancedFilters) {
        const styles = window.getComputedStyle(advancedFilters);
        gap = parseFloat(styles.rowGap || styles.gap || '0') || 0;
      }
      const total = Math.max(0, dateHeight + paramsHeight + gap);
      if (!total) return;
      tagsGroup.style.height = `${total}px`;
      tagsGroup.style.maxHeight = `${total}px`;
      updateTagOverflow();
    };

    const renderTagFilters = (events) => {
      if (!tagsFilterList) return;
      const tagMap = new Map();
      (events || []).forEach((event) => {
        getTagList(event.tags).forEach((tag) => {
          const label = tag?.label ? String(tag.label).trim() : '';
          if (!label) return;
          const normalized = normalize(label);
          if (!normalized || tagMap.has(normalized)) return;
          tagMap.set(normalized, {
            label: getLocalizedTag(label),
            value: label
          });
        });
      });
      const locale = document.documentElement.lang || 'uk';
      const sorted = Array.from(tagMap.values()).sort((a, b) =>
        a.label.localeCompare(b.label, locale)
      );
      const selected = new Set(activeFilters.tags);
      const selectedTags = selectedTagOrder
        .map((value) => tagMap.get(value))
        .filter(Boolean);
      const restTags = sorted.filter((tag) => !selected.has(normalize(tag.value)));
      const ordered = [...selectedTags, ...restTags];
      tagFilterData = ordered;
      tagsFilterList.innerHTML = ordered
        .map((tag, index) => buildTagToggle(tag, index, selected.has(normalize(tag.value)), 'list'))
        .join('');
      if (tagsFilterEmpty) {
        tagsFilterEmpty.hidden = ordered.length > 0;
      }
      if (tagsModalList) {
        tagsModalList.innerHTML = ordered
          .map((tag, index) => buildTagToggle(tag, index, selected.has(normalize(tag.value)), 'modal'))
          .join('');
      }
      syncTagCheckboxes();
      requestAnimationFrame(() => {
        syncTagsGroupHeight();
        updateTagOverflow();
      });
    };

    const syncTagCheckboxes = () => {
      if (!tagsFilterList) return;
      const selected = new Set(activeFilters.tags);
      tagsFilterList.querySelectorAll('input[name="tags"]').forEach((input) => {
        if (!(input instanceof HTMLInputElement)) return;
        input.checked = selected.has(normalize(input.value));
      });
      if (tagsModalList) {
        tagsModalList.querySelectorAll('input[name="tags-modal"]').forEach((input) => {
          if (!(input instanceof HTMLInputElement)) return;
          input.checked = selected.has(normalize(input.value));
        });
      }
    };

    const applySearchFilters = (query) => {
      if (!filtersForm) return false;
      const tokens = getTokens(query);
      if (!tokens.length) return false;
      let changed = false;

      changed = setSelectFromTokens(filtersForm.elements.city, tokens) || changed;
      changed = setSelectFromTokens(filtersForm.elements.price, tokens) || changed;
      changed = setSelectFromTokens(filtersForm.elements.format, tokens) || changed;

      if (tagsFilterList) {
        const tagInputs = Array.from(tagsFilterList.querySelectorAll('input[name="tags"]'));
        tagInputs.forEach((input) => {
          const labelEl = input.closest('label')?.querySelector('span');
          const label = labelEl ? normalize(labelEl.textContent) : '';
          const value = normalize(input.value);
          if (!label && !value) return;
          if (!tokens.includes(label) && !tokens.includes(value)) return;
          if (!input.checked) {
            input.checked = true;
            changed = true;
          }
        });
      }

      ['today', 'tomorrow', 'weekend', 'online'].forEach((key) => {
        const input = presetInputs[key];
        const button = presetButtons.find((btn) => btn.dataset.quick === key);
        if (!input || !button) return;
        const label = normalize(button.textContent);
        if (!tokens.includes(label) && !tokens.includes(key)) return;
        if (!input.checked) {
          input.checked = true;
          changed = true;
        }
        if (['today', 'tomorrow', 'weekend'].includes(key)) {
          clearOtherDatePresets(key);
          applyDatePreset(key);
        }
        if (key === 'online') {
          const formatField = filtersForm.elements.format;
          if (formatField && formatField.value !== 'online') {
            formatField.value = 'online';
            changed = true;
          }
        }
      });

      if (changed) {
        syncPresetButtons();
        syncSelectedTags();
      }
      return changed;
    };

    const syncSearchInputs = (value, source) => {
      searchInputs.forEach((input) => {
        if (input === source) return;
        if (input.value !== value) {
          input.value = value;
        }
      });
    };

    const getSearchValue = () => {
      const active = searchInputs.find((input) => input.value.trim());
      if (active) return active.value.trim();
      return primarySearchInput ? primarySearchInput.value.trim() : '';
    };

    const readQueryParams = () => {
      const params = new URLSearchParams(window.location.search);
      const cityParam = params.get('city') || '';
      const priceParam = params.get('price') || '';
      const searchParam = params.get('q') || '';
      const tagsParam = params.get('tags') || '';
      const pageParam = Number(params.get('page')) || 1;
      if (filtersForm) {
        if (cityField instanceof HTMLSelectElement) {
          cityField.value = cityParam;
        }
        if (priceField instanceof HTMLSelectElement) {
          priceField.value = priceParam;
        }
      }
      activeFilters.city = normalize(cityParam);
      activeFilters.priceCategory = normalize(priceParam);
      activeFilters.searchQuery = normalizeSearchValue(searchParam);
      activeFilters.tags.clear();
      selectedTagOrder = [];
      if (tagsParam) {
        tagsParam.split(',').forEach((value) => {
          const normalized = normalize(value);
          if (normalized) {
            selectedTagOrder.push(normalized);
          }
        });
        activeFilters.tags = new Set(selectedTagOrder);
      }
      syncTagCheckboxes();
      currentPage = pageParam > 0 ? pageParam : 1;
      if (searchInputs.length) {
        syncSearchInputs(activeFilters.searchQuery);
      }
      if (filtersForm) {
        const setValue = (name, value) => {
          const field = filtersForm.elements[name];
          if (!field) return;
          if (field instanceof RadioNodeList) {
            field.value = value;
          } else {
            field.value = value;
          }
        };
        setValue('date-from', params.get('from') || '');
        setValue('date-to', params.get('to') || '');
        setValue('city', params.get('city') || '');
        setValue('price', params.get('price') || '');
        setValue('format', params.get('format') || '');
        const quickToday = filtersForm.elements['quick-today'];
        const quickTomorrow = filtersForm.elements['quick-tomorrow'];
        const quickWeekend = filtersForm.elements['quick-weekend'];
        const quickOnline = filtersForm.elements['quick-online'];
        const showPast = filtersForm.elements['show-past'];
        if (quickToday) {
          quickToday.checked = params.get('today') === '1';
        }
        if (quickTomorrow) {
          quickTomorrow.checked = params.get('tomorrow') === '1';
        }
        if (quickWeekend) {
          quickWeekend.checked = params.get('weekend') === '1';
        }
        if (quickOnline) {
          quickOnline.checked = params.get('online') === '1';
        }
        if (quickToday && quickToday.checked) {
          setDateRange(new Date(), new Date());
        }
        if (quickTomorrow && quickTomorrow.checked) {
          const date = new Date();
          date.setDate(date.getDate() + 1);
          setDateRange(date, date);
        }
        if (quickWeekend && quickWeekend.checked) {
          const now = new Date();
          const day = now.getDay();
          const saturdayOffset = day === 6 ? 0 : (6 - day + 7) % 7;
          const saturday = new Date(now);
          saturday.setDate(now.getDate() + saturdayOffset);
          const sunday = new Date(saturday);
          sunday.setDate(saturday.getDate() + 1);
          setDateRange(saturday, sunday);
        }
        if (quickOnline && quickOnline.checked) {
          setValue('format', 'online');
        }
        if (showPast) {
          showPast.checked = params.get('past') === '1';
        }
        syncPresetButtons();
      }
      if (searchInputs.length) {
        syncSearchInputs(params.get('q') || '');
      }
    };

    const updateCatalogQueryParams = () => {
      const params = new URLSearchParams();
      const searchValue = getSearchValue();
      if (searchValue) {
        params.set('q', searchValue);
      }
      if (filtersForm) {
        const formData = new FormData(filtersForm);
        const mappings = [
          ['date-from', 'from'],
          ['date-to', 'to'],
          ['city', 'city'],
          ['price', 'price'],
          ['format', 'format']
        ];
        mappings.forEach(([field, key]) => {
          const value = formData.get(field);
          if (value) {
            params.set(key, String(value));
          }
        });
        const selectedTags = formData.getAll('tags').map((value) => normalize(value)).filter(Boolean);
        if (selectedTags.length) {
          params.set('tags', selectedTags.join(','));
        }
        if (formData.get('quick-today')) {
          params.set('today', '1');
        }
        if (formData.get('quick-tomorrow')) {
          params.set('tomorrow', '1');
        }
        if (formData.get('quick-weekend')) {
          params.set('weekend', '1');
        }
        if (formData.get('quick-online')) {
          params.set('online', '1');
        }
        if (formData.get('show-past')) {
          params.set('past', '1');
        }
      }
      if (currentPage > 1) {
        params.set('page', String(currentPage));
      }
      const query = params.toString();
      const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
      window.history.pushState({}, '', nextUrl);
    };

    const setAdvancedPanelOpen = (isOpen) => {
      if (!advancedToggle || !advancedPanel) return;
      advancedPanel.hidden = !isOpen;
      advancedToggle.setAttribute('aria-expanded', String(isOpen));
      advancedToggle.classList.toggle('is-active', isOpen);
      if (isOpen) {
        requestAnimationFrame(updateTagOverflow);
      }
    };

    const syncAdvancedPanel = (force) => {
      if (!advancedToggle || !advancedPanel) return;
      if (force === true || force === false) {
        setAdvancedPanelOpen(force);
        return;
      }
      const isOpen = !advancedPanel.hidden;
      advancedToggle.setAttribute('aria-expanded', String(isOpen));
      advancedToggle.classList.toggle('is-active', isOpen);
    };

    const loadEvents = async () => {
      setLoading(true);
      try {
        const fetchedEvents = await fetchMergedEvents();
        setEvents(fetchedEvents);
        setLoading(false);
        setErrorState(false);
        readQueryParams();
        renderTagFilters(fetchedEvents);
        applyFilters({ preservePage: true });
        syncAdvancedPanel();
      } catch (error) {
        setLoading(false);
        setErrorState(true);
      }
    };

    if (filtersForm) {
      if (advancedToggle && advancedPanel) {
        advancedToggle.addEventListener('click', () => {
          const isOpen = !advancedPanel.hidden;
          setAdvancedPanelOpen(!isOpen);
        });
      }
      presetButtons.forEach((button) => {
        button.addEventListener('click', () => {
          const key = button.dataset.quick;
          const input = presetInputs[key];
          if (!input) return;
          const nextState = !input.checked;
          input.checked = nextState;
          if (key === 'online') {
            const formatField = filtersForm.elements.format;
            if (formatField) {
              formatField.value = nextState ? 'online' : '';
            }
          }
          if (['today', 'tomorrow', 'weekend'].includes(key)) {
            if (nextState) {
              clearOtherDatePresets(key);
              applyDatePreset(key);
            }
          }
          syncPresetButtons();
          updateCatalogQueryParams();
          applyFilters();
        });
      });

      filtersForm.addEventListener('input', (event) => {
        const target = event.target;
        const skipFields = ['city', 'price'];
        if (target instanceof HTMLElement && skipFields.includes(target.getAttribute('name') || '')) {
          return;
        }
        if (target instanceof HTMLInputElement && target.type === 'checkbox') {
          const today = filtersForm.elements['quick-today'];
          const tomorrow = filtersForm.elements['quick-tomorrow'];
          const weekend = filtersForm.elements['quick-weekend'];
          const online = filtersForm.elements['quick-online'];
          if (target === today && today.checked) {
            clearOtherDatePresets('today');
            applyDatePreset('today');
          }
          if (target === tomorrow && tomorrow.checked) {
            clearOtherDatePresets('tomorrow');
            applyDatePreset('tomorrow');
          }
          if (target === weekend && weekend.checked) {
            clearOtherDatePresets('weekend');
            applyDatePreset('weekend');
          }
          if (target === online && online.checked) {
            const formatField = filtersForm.elements.format;
            if (formatField) {
              formatField.value = 'online';
            }
          }
          if (target === showPastField) {
            syncPastFilterState(true);
          }
          syncPresetButtons();
        }
        if (target instanceof HTMLInputElement && target.type === 'date') {
          clearOtherDatePresets();
          syncPresetButtons();
        }
        if (target instanceof HTMLSelectElement && target.name === 'format') {
          const onlineInput = presetInputs.online;
          if (onlineInput) {
            onlineInput.checked = target.value === 'online';
          }
          syncPresetButtons();
        }
        updateCatalogQueryParams();
        applyFilters();
        syncAdvancedPanel();
      });
      filtersForm.addEventListener('submit', (event) => {
        event.preventDefault();
        updateCatalogQueryParams();
        applyFilters();
      });
      filtersForm.addEventListener('reset', () => {
        const wasOpen = advancedPanel ? !advancedPanel.hidden : false;
        setTimeout(() => {
          if (searchInputs.length) {
            syncSearchInputs('');
          }
          syncPastFilterState(true);
          syncPresetButtons();
          if (filtersForm) {
            filtersForm.elements.city.value = '';
            filtersForm.elements.price.value = '';
          }
          resetActiveFilters();
          syncTagCheckboxes();
          renderTagFilters(state.events);
          updateCatalogQueryParams();
          applyFilters();
          setAdvancedPanelOpen(wasOpen);
        }, 0);
      });
    }

    if (tagsFilterMoreButton && tagsModal) {
      tagsFilterMoreButton.addEventListener('click', () => {
        tagsModal.hidden = false;
        tagsModal.setAttribute('aria-hidden', 'false');
      });
    }

    if (tagsModal && tagsModalCloseButtons.length) {
      tagsModalCloseButtons.forEach((button) => {
        button.addEventListener('click', () => {
          tagsModal.hidden = true;
          tagsModal.setAttribute('aria-hidden', 'true');
        });
      });
    }

    if (tagsModalList && tagsModal) {
      tagsModalList.addEventListener('change', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;
        if (target.name !== 'tags-modal') return;
        const listInput = tagsFilterList?.querySelector(
          `input[name="tags"][value="${CSS.escape(target.value)}"]`
        );
        if (listInput instanceof HTMLInputElement) {
          listInput.checked = target.checked;
        }
        setSelectedTag(target.value, target.checked);
        updateCatalogQueryParams();
        renderTagFilters(state.events);
        applyFilters();
      });
    }

    if (tagsGroup && dateGroup && paramsGroup) {
      syncTagsGroupHeight();
      window.addEventListener('resize', syncTagsGroupHeight);
      const resizeObserver = new ResizeObserver(() => {
        syncTagsGroupHeight();
      });
      resizeObserver.observe(dateGroup);
      resizeObserver.observe(paramsGroup);
    }

    const handleSearchInput = (value) => {
      setSearchFilter(value);
      applyFilters();
    };

    if (searchInputs.length) {
      const searchForms = new Set();
      searchInputs.forEach((input) => {
        input.addEventListener('input', () => {
          syncSearchInputs(input.value, input);
          handleSearchInput(input.value);
        });
        const searchForm = input.closest('form');
        if (!searchForm || searchForms.has(searchForm)) return;
        searchForms.add(searchForm);
        searchForm.addEventListener('submit', (event) => {
          event.preventDefault();
          const formInput = searchForm.querySelector('[data-event-search]');
          const value = formInput ? formInput.value : '';
          syncSearchInputs(value);
          setSearchFilter(value);
          if (applySearchFilters(value)) {
            syncAdvancedPanel();
          }
          applyFilters();
          formInput?.focus({ preventScroll: true });
          const catalogSection = document.querySelector('#events');
          if (catalogSection) {
            catalogSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });
    }

    if (nextEventsButton) {
      nextEventsButton.addEventListener('click', () => {
        goToPage(currentPage + 1);
        const catalogSection = document.querySelector('#events');
        if (catalogSection) {
          requestAnimationFrame(() => {
            catalogSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        }
      });
    }

    if (resetEventsButton) {
      resetEventsButton.addEventListener('click', () => {
        goToPage(1);
        const catalogSection = document.querySelector('#events');
        if (catalogSection) {
          catalogSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    window.addEventListener('popstate', () => {
      readQueryParams();
      applyFilters({ preservePage: true });
    });

    if (paginationContainer) {
      paginationContainer.addEventListener('click', (event) => {
        const target = event.target.closest('[data-page]');
        if (!target) return;
        const page = Number(target.dataset.page) || 1;
        if (page === currentPage) return;
        goToPage(page);
        const catalogSection = document.querySelector('#events');
        if (catalogSection) {
          catalogSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    if (emptyResetButton && filtersForm) {
      emptyResetButton.addEventListener('click', () => {
        filtersForm.reset();
      });
    }

    if (errorRetryButton) {
      errorRetryButton.addEventListener('click', () => {
        loadEvents();
      });
    }

    if (tagsFilterList) {
      window.addEventListener('resize', updateTagOverflow);
    }

    pendingCatalogState = loadCatalogState();
    if (pendingCatalogState) {
      applyStoredFilters();
    }

    queueMicrotask(loadEvents);
  }

  const eventMeta = document.querySelector('.event-article__meta[data-event-start]');
  const eventPrice = document.querySelector('.event-sidebar__price[data-price-type]');
  const pastBanner = document.querySelector('[data-past-banner]');
  const ticketNote = document.querySelector('.event-sidebar__note');
  const eventTitleEl = document.querySelector('[data-event-title]');
  const eventDescriptionEl = document.querySelector('[data-event-description]');
  const eventDescriptionToggle = document.querySelector('[data-event-description-toggle]');
  const eventLocationEl = document.querySelector('[data-event-location]');
  const eventImageEl = document.querySelector('[data-event-image]');
  const eventLanguageEl = document.querySelector('[data-event-language]');
  const eventTagsEl = document.querySelector('[data-event-tags]');
  const organizerSection = document.querySelector('[data-organizer-section]');
  const organizerNameEl = document.querySelector('[data-organizer-name]');
  const organizerMetaEl = document.querySelector('[data-organizer-meta]');
  const organizerEmailEl = document.querySelector('[data-organizer-email]');
  const organizerPhoneEl = document.querySelector('[data-organizer-phone]');
  const organizerWebsiteEl = document.querySelector('[data-organizer-website]');
  const organizerSocials = document.querySelector('[data-organizer-socials]');
  const organizerInstagramEl = document.querySelector('[data-organizer-instagram]');
  const organizerFacebookEl = document.querySelector('[data-organizer-facebook]');
  const organizerTelegramEl = document.querySelector('[data-organizer-telegram]');
  const adminControls = document.querySelector('[data-admin-controls]');
  const adminArchivedBadge = document.querySelector('[data-admin-archived-badge]');
  const adminEditLink = document.querySelector('[data-action="admin-edit"]');
  const adminArchiveButton = document.querySelector('[data-action="admin-archive"]');
  const adminRestoreButton = document.querySelector('[data-action="admin-restore"]');
  const adminDeleteButton = document.querySelector('[data-action="admin-delete"]');
  let activeEventData = null;

  const updateDescriptionToggle = (text) => {
    if (!eventDescriptionEl || !eventDescriptionToggle) return;
    if (text) {
      eventDescriptionEl.dataset.fullText = text;
    }
    const fullText =
      text || eventDescriptionEl.dataset.fullText || eventDescriptionEl.textContent?.trim() || '';
    if (!fullText || fullText.length <= 400) {
      eventDescriptionEl.textContent = fullText;
      eventDescriptionToggle.hidden = true;
      eventDescriptionToggle.removeAttribute('aria-expanded');
      return;
    }
    const isExpanded = eventDescriptionToggle.getAttribute('aria-expanded') === 'true';
    if (isExpanded) {
      eventDescriptionEl.textContent = fullText;
    } else {
      const shortText = `${fullText.slice(0, 400).trim()}…`;
      eventDescriptionEl.textContent = shortText;
    }
    eventDescriptionToggle.hidden = false;
    eventDescriptionToggle.textContent = formatMessage(
      isExpanded ? 'event_description_less' : 'event_description_more',
      {}
    );
  };

  const updateEventMeta = () => {
    if (!eventMeta) return;
    const start = eventMeta.dataset.eventStart;
    const end = eventMeta.dataset.eventEnd;
    const city = eventMeta.dataset.eventCity;
    const label = formatDateRange(start, end);
    eventMeta.textContent = city ? `${label} · ${city}` : label;
    const isPastEvent = isPast({ start, end });
    if (!isPastEvent && eventPrice && ticketCtas.length) {
      const priceType = eventPrice.dataset.priceType;
      const ctaKey = priceType === 'free' ? 'register_cta' : 'ticket_cta';
      const labelText = formatMessage(ctaKey, {});
      ticketCtas.forEach((cta) => {
        cta.setAttribute('data-i18n', ctaKey);
        cta.textContent = labelText;
      });
    }
    if (pastBanner && isPastEvent) {
      pastBanner.hidden = false;
      ticketCtas.forEach((cta) => {
        cta.hidden = true;
      });
      similarCtas.forEach((cta) => {
        cta.hidden = false;
      });
      if (ticketNote) {
        ticketNote.textContent = formatMessage('similar_cta', {});
      }
    }
  };

  const updateEventPrice = () => {
    if (!eventPrice) return;
    const type = eventPrice.dataset.priceType;
    const min = Number(eventPrice.dataset.priceMin);
    const max = Number(eventPrice.dataset.priceMax);
    const minValue = Number.isNaN(min) ? null : min;
    const maxValue = Number.isNaN(max) ? null : max;
    const priceLabel = formatPriceLabel(type, minValue, maxValue);
    eventPrice.textContent = priceLabel;
    if (ticketNote && eventMeta) {
      const start = eventMeta.dataset.eventStart;
      const end = eventMeta.dataset.eventEnd;
      const isPastEvent = isPast({ start, end });
      if (!isPastEvent) {
        if (type === 'free') {
          ticketNote.textContent = formatMessage('event_register_note', {});
        } else {
          ticketNote.textContent = priceLabel
            ? `${formatMessage('event_ticket_note', {})} (${priceLabel})`
            : formatMessage('event_ticket_note', {});
        }
      }
    }
  };

  const renderEventDetail = (eventData) => {
    if (!eventData) return;
    activeEventData = eventData;
    if (eventTitleEl) eventTitleEl.textContent = eventData.title;
    if (eventDescriptionEl && eventData.description) {
      eventDescriptionEl.textContent = eventData.description;
      if (eventDescriptionToggle) {
        eventDescriptionToggle.setAttribute('aria-expanded', 'false');
      }
      updateDescriptionToggle(eventData.description);
    }
    if (eventLocationEl) {
      const parts = [eventData.venue, eventData.address, eventData.city].filter(Boolean);
      const location = parts.length ? parts.join(', ') : '';
      eventLocationEl.textContent = location || '—';
      const mapQuery = encodeURIComponent(location || eventData.city || '');
      if (mapQuery) {
        eventLocationEl.setAttribute('href', `https://www.google.com/maps/search/?api=1&query=${mapQuery}`);
        eventLocationEl.setAttribute('target', '_blank');
        eventLocationEl.setAttribute('rel', 'noopener');
      } else {
        eventLocationEl.removeAttribute('href');
      }
    }
    if (eventImageEl) {
      const imageUrl = eventData.images && eventData.images.length ? eventData.images[0] : '';
      if (imageUrl) {
        eventImageEl.hidden = false;
        eventImageEl.src = imageUrl;
        eventImageEl.alt = eventData.imageAlt || eventData.title || '';
      } else {
        eventImageEl.hidden = true;
      }
    }
    if (eventLanguageEl) {
      eventLanguageEl.textContent = eventData.language || '';
      eventLanguageEl.hidden = !eventData.language;
    }
    if (eventMeta) {
      eventMeta.dataset.eventStart = eventData.start || '';
      eventMeta.dataset.eventEnd = eventData.end || '';
      eventMeta.dataset.eventCity = eventData.city || '';
    }
    if (eventTagsEl) {
      const tags = (eventData.tags || []).map((tag) => ({
        label: tag.label,
        status: tag.status || 'approved',
        type: 'tag'
      }));
      eventTagsEl.innerHTML = tags
        .map((tag) => {
          const isPending = tag.status === 'pending';
          const pendingClass = isPending ? ' event-tag--pending' : '';
          const pendingAttrs = isPending ? ` data-i18n-title="pending_tooltip"` : '';
          return `<span class="event-tag${pendingClass}" data-tag-label="${tag.label}"${pendingAttrs}>${tag.label}</span>`;
        })
        .join('');
      updateStaticTagAria();
    }
    if (eventPrice) {
      eventPrice.dataset.priceType = eventData.priceType || 'paid';
      eventPrice.dataset.priceMin = eventData.priceMin ?? '';
      eventPrice.dataset.priceMax = eventData.priceMax ?? '';
    }
    if (ticketCtas.length) {
      ticketCtas.forEach((cta) => {
        cta.href = eventData.ticketUrl || '#';
        cta.dataset.eventId = eventData.id || '';
      });
    }
    const hasOrganizer =
      Boolean(eventData.contactPerson?.name) ||
      Boolean(eventData.contactPerson?.email) ||
      Boolean(eventData.contactPerson?.phone) ||
      Boolean(eventData.contactPerson?.website) ||
      Boolean(eventData.contactPerson?.instagram) ||
      Boolean(eventData.contactPerson?.facebook) ||
      Boolean(eventData.contactPerson?.telegram);
    if (organizerSection) {
      organizerSection.hidden = !hasOrganizer;
    }
    if (organizerNameEl) {
      organizerNameEl.textContent = eventData.contactPerson?.name || '';
    }
    if (organizerMetaEl) {
      organizerMetaEl.textContent = eventData.contactPerson?.meta || '';
      organizerMetaEl.hidden = !eventData.contactPerson?.meta;
    }
    if (organizerEmailEl) {
      if (eventData.contactPerson?.email) {
        organizerEmailEl.hidden = false;
        organizerEmailEl.textContent = eventData.contactPerson.email;
        organizerEmailEl.setAttribute('href', `mailto:${eventData.contactPerson.email}`);
      } else {
        organizerEmailEl.hidden = true;
      }
    }
    if (organizerPhoneEl) {
      if (eventData.contactPerson?.phone) {
        organizerPhoneEl.hidden = false;
        organizerPhoneEl.textContent = eventData.contactPerson.phone;
        organizerPhoneEl.setAttribute('href', `tel:${eventData.contactPerson.phone}`);
      } else {
        organizerPhoneEl.hidden = true;
      }
    }
    if (organizerWebsiteEl) {
      if (eventData.contactPerson?.website) {
        organizerWebsiteEl.hidden = false;
        organizerWebsiteEl.textContent = eventData.contactPerson.website;
        organizerWebsiteEl.setAttribute('href', eventData.contactPerson.website);
      } else {
        organizerWebsiteEl.hidden = true;
      }
    }
    const hasSocial =
      Boolean(eventData.contactPerson?.instagram) ||
      Boolean(eventData.contactPerson?.facebook) ||
      Boolean(eventData.contactPerson?.telegram);
    if (organizerSocials) {
      organizerSocials.hidden = !hasSocial;
    }
    if (organizerInstagramEl) {
      if (eventData.contactPerson?.instagram) {
        organizerInstagramEl.hidden = false;
        organizerInstagramEl.setAttribute('href', eventData.contactPerson.instagram);
      } else {
        organizerInstagramEl.hidden = true;
      }
    }
    if (organizerFacebookEl) {
      if (eventData.contactPerson?.facebook) {
        organizerFacebookEl.hidden = false;
        organizerFacebookEl.setAttribute('href', eventData.contactPerson.facebook);
      } else {
        organizerFacebookEl.hidden = true;
      }
    }
    if (organizerTelegramEl) {
      if (eventData.contactPerson?.telegram) {
        organizerTelegramEl.hidden = false;
        organizerTelegramEl.setAttribute('href', eventData.contactPerson.telegram);
      } else {
        organizerTelegramEl.hidden = true;
      }
    }
    if (adminControls) {
      const archived = isArchivedEvent(eventData);
      adminControls.hidden = !isAdminSession();
      if (adminArchivedBadge) adminArchivedBadge.hidden = !archived;
      if (adminArchiveButton) adminArchiveButton.hidden = archived;
      if (adminRestoreButton) adminRestoreButton.hidden = !archived;
      if (adminEditLink) {
        adminEditLink.href = `./new-event.html?id=${encodeURIComponent(eventData.id)}`;
      }
    }
    updateEventPrice();
    updateEventMeta();
  };

  if (document.body.classList.contains('event-page')) {
    if (eventDescriptionToggle) {
      eventDescriptionToggle.addEventListener('click', () => {
        const expanded = eventDescriptionToggle.getAttribute('aria-expanded') === 'true';
        eventDescriptionToggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        updateDescriptionToggle();
      });
    }
    if (adminArchiveButton) {
      adminArchiveButton.addEventListener('click', () => {
        if (!activeEventData) return;
        const updated = archiveLocalEvent(activeEventData, 'admin');
        if (updated) {
          renderEventDetail(updated);
        }
      });
    }
    if (adminRestoreButton) {
      adminRestoreButton.addEventListener('click', () => {
        if (!activeEventData) return;
        const updated = restoreLocalEvent(activeEventData, 'admin');
        if (updated) {
          renderEventDetail(updated);
        }
      });
    }
    if (adminDeleteButton) {
      adminDeleteButton.addEventListener('click', () => {
        if (!activeEventData) return;
        if (!window.confirm(formatMessage('admin_confirm_delete', {}))) {
          return;
        }
        deleteLocalEvent(activeEventData, 'admin');
        window.location.href = './admin-page.html#archive';
      });
    }
    const params = new URLSearchParams(window.location.search);
    const eventId = params.get('id');
    if (eventId) {
      fetchMergedEvents()
        .then((data) => {
          const eventData = data.find((item) => item.id === eventId);
          if (!eventData) return;
          if (isArchivedEvent(eventData) && !isAdminSession()) {
            window.location.replace('./404.html');
            return;
          }
          renderEventDetail(eventData);
        })
        .catch(() => {
          updateEventMeta();
          updateEventPrice();
          updateDescriptionToggle();
        });
    } else {
      updateEventMeta();
      updateEventPrice();
      updateDescriptionToggle();
    }
  }

  document.addEventListener('click', async (event) => {
    const target = event.target.closest('[data-testid="ticket-cta"]');
    if (!target) return;
    const eventId = target.dataset.eventId || target.closest('[data-event-id]')?.dataset.eventId || null;
    const payload = {
      eventId,
      action: 'ticket_click',
      ts: Date.now()
    };
    try {
      await fetch('/.netlify/functions/metrics', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.info('metrics', payload);
    }
  });

  if (highlightsTrack) {
    const prevButton = document.querySelector('.highlights__button[data-action="prev"]');
    const nextButton = document.querySelector('.highlights__button[data-action="next"]');
    const getStep = () => highlightsTrack.clientWidth * 0.8;

    const scrollByStep = (direction) => {
      highlightsTrack.scrollBy({ left: direction * getStep(), behavior: 'smooth' });
    };

    if (prevButton) {
      prevButton.addEventListener('click', () => {
        scrollByStep(-1);
      });
    }

    if (nextButton) {
      nextButton.addEventListener('click', () => {
        scrollByStep(1);
      });
    }

    highlightsTrack.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        scrollByStep(1);
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        scrollByStep(-1);
      }
    });
  }
})();
