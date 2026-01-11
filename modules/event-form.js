import { ADMIN_SESSION_KEY, hasAdminRole } from './auth.js';
import { buildLocalEventId, findMergedEventById, upsertLocalEvent } from './local-events.js';

export const initEventForm = ({ formatMessage, getVerificationState, publishState }) => {
  const multiStepForm = document.querySelector('.multi-step');
  if (!multiStepForm) return;

  const steps = Array.from(multiStepForm.querySelectorAll('.form-step'));
  const stepperItems = Array.from(document.querySelectorAll('.stepper__item'));
  const nextButton = multiStepForm.querySelector('[data-action="next"]');
  const backButton = multiStepForm.querySelector('[data-action="back"]');
  const previewTitle = document.querySelector('#preview-title');
  const previewOrganizer = document.querySelector('#preview-organizer');
  const previewDescription = document.querySelector('#preview-description');
  const previewCategory = document.querySelector('#preview-category');
  const previewTags = document.querySelector('#preview-tags');
  const previewTime = document.querySelector('#preview-time');
  const previewLocation = document.querySelector('#preview-location');
  const previewTickets = document.querySelector('#preview-tickets');
  const previewFormat = document.querySelector('#preview-format');
  const previewImage = document.querySelector('#preview-image');
  const categorySelect = multiStepForm.querySelector('select[name="category"]');
  const formatSelect = multiStepForm.querySelector('select[name="format"]');
  const imageInput = multiStepForm.querySelector('input[name="image"]');
  const imageAltInput = multiStepForm.querySelector('input[name="image-alt"]');
  const contactNameField = multiStepForm.querySelector('input[name="contact-name"]');
  const tagsInput = multiStepForm.querySelector('.tags-input__field');
  const tagsList = multiStepForm.querySelector('.tags-input__list');
  const tagsHidden = multiStepForm.querySelector('input[name="tags"]');
  const statusField = multiStepForm.querySelector('input[name="status"]');
  const verificationBanner = multiStepForm.querySelector('[data-verification-banner]');
  const verificationBannerButton = multiStepForm.querySelector('[data-action="open-verification"]');
  const honeypotField = multiStepForm.querySelector('input[name="website"]');
  const pendingCategories = new Set();
  const pendingTags = new Set();
  let currentStep = 0;
  const publishButton = multiStepForm.querySelector('button[type="submit"]');
  const verificationWarning = multiStepForm.querySelector('[data-verification-warning]');
  const submitStatus = multiStepForm.querySelector('[data-submit-status]');
  const organizerId = multiStepForm.dataset.organizerId || 'org-001';
  let organizerStatus = 'none';
  let previewImageUrl = null;
  let identityUser = null;
  let editingEventId = null;
  let editingEventData = null;

  const isAdminBypass = () => {
    if (identityUser && hasAdminRole(identityUser)) return true;
    try {
      return localStorage.getItem(ADMIN_SESSION_KEY) === '1';
    } catch (error) {
      return false;
    }
  };

  const getTagsRequiredMessage = () =>
    formatMessage('form_tags_required', {}) || 'Add at least one tag.';

  const ensureTagsSelected = (report = false) => {
    const hasTags = pendingTags.size > 0;
    if (!tagsInput) return hasTags;
    if (!hasTags) {
      if (report) {
        tagsInput.setCustomValidity(getTagsRequiredMessage());
        tagsInput.reportValidity();
        tagsInput.focus();
      }
      return false;
    }
    tagsInput.setCustomValidity('');
    return true;
  };

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
    const startDate = parseDateTime(start);
    const endDate = parseDateTime(end);
    if (!startDate || !endDate) return startLabel;
    if (
      startDate.getFullYear() === endDate.getFullYear() &&
      startDate.getMonth() === endDate.getMonth() &&
      startDate.getDate() === endDate.getDate()
    ) {
      return `${startLabel}–${formatTime(end)}`;
    }
    return `${startLabel} – ${formatDateTime(end)}`;
  };

  const formatInputDateTime = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (num) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;
  };

  const guessCity = (address) => {
    const normalized = String(address || '').toLowerCase();
    const map = [
      { keys: ['copenhagen', 'копенгаген'], value: 'Copenhagen' },
      { keys: ['aarhus', 'орхус'], value: 'Aarhus' },
      { keys: ['odense', 'оденсе'], value: 'Odense' },
      { keys: ['aalborg', 'ольборг'], value: 'Aalborg' },
      { keys: ['esbjerg', "есб'єрг", 'есбʼєрг'], value: 'Esbjerg' }
    ];
    const match = map.find((entry) => entry.keys.some((key) => normalized.includes(key)));
    return match ? match.value : '';
  };

  const applyPreviewImage = (value, altText) => {
    if (!previewImage) return;
    if (!value) {
      previewImage.hidden = true;
      previewImage.removeAttribute('src');
      previewImage.removeAttribute('alt');
      previewImageUrl = null;
      return;
    }
    previewImage.hidden = false;
    previewImage.src = value;
    previewImage.alt = altText || '';
    previewImageUrl = value;
  };

  const populateFormFromEvent = (eventData) => {
    if (!eventData) return;
    const setValue = (name, value) => {
      const field = multiStepForm.elements[name];
      if (!field) return;
      if (field instanceof RadioNodeList) {
        field.value = value ?? '';
      } else if (field instanceof HTMLInputElement || field instanceof HTMLSelectElement) {
        field.value = value ?? '';
      }
    };
    setValue('title', eventData.title || '');
    setValue('description', eventData.description || '');
    const categoryValue = eventData.category?.label || '';
    if (categorySelect && categoryValue) {
      const hasOption = Array.from(categorySelect.options).some((option) => option.value === categoryValue);
      if (!hasOption) {
        const option = document.createElement('option');
        option.value = categoryValue;
        option.textContent = categoryValue;
        categorySelect.appendChild(option);
      }
    }
    setValue('category', categoryValue);
    setValue('start', formatInputDateTime(eventData.start));
    setValue('end', formatInputDateTime(eventData.end));
    setValue('format', eventData.format || '');
    setValue('address', eventData.address || [eventData.city, eventData.venue].filter(Boolean).join(', '));
    setValue('ticket-type', eventData.priceType || '');
    setValue('price-min', eventData.priceMin ?? '');
    setValue('price-max', eventData.priceMax ?? '');
    setValue('ticket-url', eventData.ticketUrl || '');
    setValue('contact-name', eventData.contactPerson?.name || '');
    setValue('contact-email', eventData.contactPerson?.email || '');
    setValue('contact-phone', eventData.contactPerson?.phone || '');
    setValue('contact-website', eventData.contactPerson?.website || '');
    setValue('contact-instagram', eventData.contactPerson?.instagram || '');
    setValue('contact-facebook', eventData.contactPerson?.facebook || '');
    setValue('contact-telegram', eventData.contactPerson?.telegram || '');
    pendingTags.clear();
    (eventData.tags || []).forEach((tag) => {
      if (tag?.label) pendingTags.add(tag.label);
    });
    if (tagsHidden) {
      tagsHidden.value = Array.from(pendingTags).join(', ');
    }
    applyPreviewImage(eventData.images?.[0] || '', eventData.imageAlt || '');
    renderTagChips();
    updatePreview();
  };

  const updateAdminSessionFlag = (user) => {
    try {
      if (user && hasAdminRole(user)) {
        localStorage.setItem(ADMIN_SESSION_KEY, '1');
      } else {
        localStorage.removeItem(ADMIN_SESSION_KEY);
      }
    } catch (error) {
      return;
    }
  };

  const initIdentitySession = () => {
    if (!window.netlifyIdentity) {
      window.addEventListener(
        'load',
        () => {
          if (window.netlifyIdentity) initIdentitySession();
        },
        { once: true }
      );
      return;
    }
    window.netlifyIdentity.on('init', (user) => {
      identityUser = user;
      updateAdminSessionFlag(user);
      publishState.update();
    });
    window.netlifyIdentity.on('login', (user) => {
      identityUser = user;
      updateAdminSessionFlag(user);
      publishState.update();
    });
    window.netlifyIdentity.on('logout', () => {
      identityUser = null;
      updateAdminSessionFlag(null);
      publishState.update();
    });
    window.netlifyIdentity.init();
  };

  const setStep = (index) => {
    steps.forEach((step, stepIndex) => {
      const isActive = stepIndex === index;
      step.classList.toggle('is-active', isActive);
      step.hidden = !isActive;
    });
    stepperItems.forEach((item, itemIndex) => {
      if (itemIndex === index) {
        item.setAttribute('aria-current', 'step');
      } else {
        item.removeAttribute('aria-current');
      }
    });
    if (backButton) {
      backButton.disabled = index === 0;
    }
    if (nextButton) {
      nextButton.hidden = index === steps.length - 1;
    }
    updatePreview();
  };

  const getFieldValue = (name) => {
    const field = multiStepForm.elements[name];
    if (!field) return '';
    if (field instanceof RadioNodeList) {
      return field.value;
    }
    return field.value;
  };

  const getSelectLabel = (select, fallback) => {
    if (!select) return fallback;
    const option = Array.from(select.options).find((item) => item.value === fallback);
    return option?.textContent?.trim() || fallback;
  };

  const updatePreviewImage = () => {
    if (!previewImage) return;
    const file = imageInput?.files?.[0];
    const altText = imageAltInput?.value?.trim() || '';
    if (!file) {
      if (!previewImageUrl) {
        applyPreviewImage('', '');
      } else {
        applyPreviewImage(previewImageUrl, altText);
      }
      return;
    }
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result !== 'string') return;
      applyPreviewImage(reader.result, altText);
    });
    reader.readAsDataURL(file);
  };

  const updatePreview = () => {
    if (previewTitle) previewTitle.textContent = getFieldValue('title');
    if (previewOrganizer) {
      const organizerValue = getFieldValue('organizer') || getFieldValue('contact-name');
      previewOrganizer.textContent = organizerValue;
    }
    if (previewDescription) previewDescription.textContent = getFieldValue('description');
    if (previewCategory) {
      previewCategory.textContent = getSelectLabel(categorySelect, getFieldValue('category'));
    }
    if (previewTags) {
      previewTags.textContent = Array.from(pendingTags).join(', ');
    }
    if (previewTime) {
      const start = getFieldValue('start');
      const end = getFieldValue('end');
      previewTime.textContent = formatDateRange(start, end);
    }
    if (previewLocation) {
      const city = getFieldValue('city');
      const address = getFieldValue('address');
      previewLocation.textContent = [city, address].filter(Boolean).join(', ');
    }
    if (previewTickets) {
      const type = getFieldValue('ticket-type');
      const min = getFieldValue('price-min');
      const max = getFieldValue('price-max');
      if (type === 'free') {
        previewTickets.textContent = formatMessage('form_ticket_free', {});
      } else if (type === 'paid') {
        const priceRange = [min, max].filter(Boolean).join('–');
        const paidLabel = formatMessage('form_ticket_paid', {});
        previewTickets.textContent = priceRange ? `${paidLabel} · ${priceRange}` : paidLabel;
      } else {
        previewTickets.textContent = [min, max].filter(Boolean).join('–');
      }
    }
    if (previewFormat) {
      previewFormat.textContent = getSelectLabel(formatSelect, getFieldValue('format'));
    }
    updatePreviewImage();
  };

  const flushTagInput = () => {
    if (!tagsInput) return;
    const value = tagsInput.value.trim();
    if (!value) return;
    value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .forEach((tag) => pendingTags.add(tag));
    tagsInput.value = '';
    renderTagChips();
  };

  const renderTagChips = () => {
    if (!tagsList) return;
    tagsList.innerHTML = '';
    pendingTags.forEach((tag) => {
      const li = document.createElement('li');
      li.className = 'tags-input__chip pending';
      li.textContent = tag;
      li.title = formatMessage('pending_tooltip', {}) || 'Pending approval';
      li.dataset.i18nTitle = 'pending_tooltip';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'tags-input__remove';
      remove.textContent = '×';
      remove.addEventListener('click', () => {
        pendingTags.delete(tag);
        renderTagChips();
        publishState.update();
      });
      li.appendChild(remove);
      tagsList.appendChild(li);
    });
    const value = Array.from(pendingTags).join(', ');
    if (tagsHidden) tagsHidden.value = value;
    ensureTagsSelected();
    publishState.update();
  };

  const updatePendingCategory = () => {
    if (!categorySelect) return;
    const value = categorySelect.value.trim();
    pendingCategories.clear();
    if (value && value === 'pending') {
      pendingCategories.add(value);
    }
  };

  if (categorySelect) {
    categorySelect.addEventListener('change', () => {
      updatePendingCategory();
      updatePreview();
      publishState.update();
    });
  }

  if (formatSelect) {
    formatSelect.addEventListener('change', () => {
      updatePreview();
    });
  }

  if (tagsInput) {
    tagsInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault();
        flushTagInput();
      }
    });
    tagsInput.addEventListener('blur', () => {
      flushTagInput();
    });
  }

  if (contactNameField) {
    contactNameField.addEventListener('input', () => {
      updatePreview();
    });
  }

  if (imageInput) {
    imageInput.addEventListener('change', () => {
      updatePreview();
    });
  }

  if (imageAltInput) {
    imageAltInput.addEventListener('input', () => {
      updatePreview();
    });
  }

  const validateStep = () => {
    if (currentStep === 0) {
      ensureTagsSelected(false);
    }
    const activeStep = steps[currentStep];
    if (!activeStep) return true;
    const fields = Array.from(activeStep.querySelectorAll('input, select, textarea')).filter(
      (field) => field.type !== 'hidden'
    );
    for (const field of fields) {
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }
    return true;
  };

  const getEffectiveOrganizerStatus = () => {
    const verification = getVerificationState();
    if (isAdminBypass()) return 'admin';
    if (organizerStatus && organizerStatus !== 'none') return organizerStatus;
    if (verification.websiteApproved) return 'verified';
    if (verification.websitePending) return 'pending_manual';
    return 'none';
  };

  const loadOrganizerStatus = async () => {
    try {
      const response = await fetch('./data/organizers.json');
      if (!response.ok) return;
      const list = await response.json();
      const organizer = Array.isArray(list)
        ? list.find((item) => item.id === organizerId)
        : null;
      if (organizer && organizer.verificationStatus) {
        organizerStatus = organizer.verificationStatus;
        publishState.update();
      }
    } catch (error) {
      return;
    }
  };

  setStep(currentStep);
  renderTagChips();
  publishState.update = () => {
    const isAdmin = isAdminBypass();
    const verified = getEffectiveOrganizerStatus() !== 'none';
    const hasTags = pendingTags.size > 0;
    if (publishButton) {
      publishButton.disabled = isAdmin ? !hasTags : !verified || !hasTags;
    }
    if (verificationWarning) {
      verificationWarning.hidden = isAdmin || verified;
    }
    if (verificationBanner) {
      verificationBanner.hidden = isAdmin || verified;
    }
  };
  publishState.update();
  initIdentitySession();
  loadOrganizerStatus();

  const params = new URLSearchParams(window.location.search);
  const eventIdParam = params.get('id');
  if (eventIdParam) {
    findMergedEventById(eventIdParam)
      .then((eventData) => {
        if (!eventData) return;
        editingEventId = eventData.id;
        editingEventData = eventData;
        populateFormFromEvent(eventData);
      })
      .catch(() => {});
  }

  if (verificationBannerButton) {
    verificationBannerButton.addEventListener('click', () => {
      window.location.href = 'main-page.html#settings';
    });
  }

  if (nextButton) {
    nextButton.addEventListener('click', () => {
      flushTagInput();
      if (!validateStep()) return;
      currentStep = Math.min(currentStep + 1, steps.length - 1);
      setStep(currentStep);
    });
  }

  if (backButton) {
    backButton.addEventListener('click', () => {
      currentStep = Math.max(currentStep - 1, 0);
      setStep(currentStep);
    });
  }

  multiStepForm.addEventListener('submit', async (event) => {
    flushTagInput();
    if (!ensureTagsSelected(true)) {
      event.preventDefault();
      return;
    }
    const verified = getEffectiveOrganizerStatus() !== 'none';
    if (!verified) {
      event.preventDefault();
      if (verificationWarning) {
        verificationWarning.hidden = false;
      }
      return;
    }
    event.preventDefault();
    if (honeypotField && honeypotField.value.trim()) {
      if (submitStatus) {
        submitStatus.textContent = formatMessage('spam_blocked', {});
      }
      return;
    }
    if (statusField) {
      statusField.value = isAdminBypass() ? 'approved' : 'pending';
    }
    if (!validateStep()) {
      return;
    }
    if (submitStatus) {
      submitStatus.textContent = '';
    }
    try {
      const formData = new FormData(multiStepForm);
      const payload = Object.fromEntries(formData.entries());
      const tagsForPayload = Array.from(pendingTags);
      const finalTags = tagsForPayload.length ? tagsForPayload : ['General'];
      const tagsPayload = finalTags.join(', ');
      payload.tags = tagsPayload;
      if (tagsHidden) {
        tagsHidden.value = tagsPayload;
      }
      const eventId = editingEventId || buildLocalEventId();
      const city = guessCity(payload.address);
      const priceMin = payload['price-min'] ? Number(payload['price-min']) : null;
      const priceMax = payload['price-max'] ? Number(payload['price-max']) : null;
      const nextEvent = {
        id: eventId,
        title: payload.title || editingEventData?.title || '—',
        slug: editingEventData?.slug || eventId,
        description: payload.description || '',
        category: {
          label: payload.category || '',
          status: 'approved'
        },
        tags: finalTags.map((label) => ({ label, status: 'approved' })),
        start: payload.start || '',
        end: payload.end || '',
        format: payload.format || '',
        venue: payload.address || '',
        address: payload.address || '',
        city: city || editingEventData?.city || '',
        priceType: payload['ticket-type'] || '',
        priceMin: Number.isFinite(priceMin) ? priceMin : null,
        priceMax: Number.isFinite(priceMax) ? priceMax : null,
        ticketUrl: payload['ticket-url'] || '',
        organizerId,
        images: previewImageUrl ? [previewImageUrl] : editingEventData?.images || [],
        imageAlt: imageAltInput?.value?.trim() || editingEventData?.imageAlt || '',
        contactPerson: {
          name: payload['contact-name'] || '',
          email: payload['contact-email'] || '',
          phone: payload['contact-phone'] || '',
          website: payload['contact-website'] || '',
          instagram: payload['contact-instagram'] || '',
          facebook: payload['contact-facebook'] || '',
          telegram: payload['contact-telegram'] || ''
        },
        status: 'published',
        archived: false,
        forUkrainians: editingEventData?.forUkrainians ?? true,
        familyFriendly: editingEventData?.familyFriendly ?? false,
        volunteer: editingEventData?.volunteer ?? false
      };
      const saved = upsertLocalEvent(nextEvent, identityUser?.email || 'admin');
      if (submitStatus) {
        submitStatus.textContent = formatMessage('submit_success', {});
      }
      if (saved?.id) {
        window.location.href = `./event-card.html?id=${encodeURIComponent(saved.id)}`;
      }
    } catch (error) {
      if (submitStatus) {
        submitStatus.textContent = formatMessage('submit_error', {});
      }
    }
  });
};
