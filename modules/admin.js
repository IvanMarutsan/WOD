import { ADMIN_SESSION_KEY, getUserRoles, hasAdminRole, isSuperAdmin } from './auth.js';

export const initAdmin = ({ formatMessage }) => {
  const moderationList = document.querySelector('.moderation-list');
  const modal = document.querySelector('.modal');

  const getAdminLoginRedirect = () => {
    const redirect = encodeURIComponent(
      `${window.location.pathname}${window.location.search}${window.location.hash}`
    );
    return `./admin-login.html?redirect=${redirect}`;
  };

  const getUiLocale = () => 'uk-UA';

  const setupAdminAuth = () => {
    const path = window.location.pathname;
    const isAdminPage = path.includes('admin-page.html');
    const isLoginPage = path.includes('admin-login');
    if (!isAdminPage && !isLoginPage) return;

    const statusEl = document.querySelector('[data-admin-status]');
    const loginButton = document.querySelector('[data-admin-login]');
    const logoutButton = document.querySelector('[data-admin-logout]');
    const userMeta = document.querySelector('[data-admin-user]');
    const roleMeta = document.querySelector('[data-admin-role]');
    const metaContainer = document.querySelector('.admin-auth__meta');
    const superAdminSections = document.querySelectorAll('[data-super-admin-only]');

    const setStatus = (key) => {
      if (statusEl) statusEl.textContent = formatMessage(key, {});
    };

    const setAuthState = (state) => {
      document.body.dataset.adminAuth = state;
    };

    const setAdminSession = (value) => {
      try {
        if (value) {
          localStorage.setItem(ADMIN_SESSION_KEY, '1');
        } else {
          localStorage.removeItem(ADMIN_SESSION_KEY);
        }
      } catch (error) {
        return;
      }
    };

    const updateMeta = (user) => {
      if (!userMeta || !roleMeta || !metaContainer) return;
      if (!user) {
        metaContainer.hidden = true;
        return;
      }
      const roles = getUserRoles(user);
      const roleLabel = roles.includes('super_admin')
        ? formatMessage('admin_access_role_super', {})
        : formatMessage('admin_access_role_admin', {});
      userMeta.textContent = `${formatMessage('admin_access_user', {})}: ${user.email || '—'}`;
      roleMeta.textContent = roleLabel;
      metaContainer.hidden = false;
    };

    const setSuperAdminVisibility = (allowed) => {
      superAdminSections.forEach((section) => {
        section.hidden = !allowed;
      });
    };

    const openLogin = () => {
      if (window.netlifyIdentity) {
        window.netlifyIdentity.open('login');
      }
    };

    if (loginButton) {
      loginButton.addEventListener('click', openLogin);
    }

    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        if (window.netlifyIdentity) {
          window.netlifyIdentity.logout();
        }
      });
    }

    if (!window.netlifyIdentity) {
      if (!document.querySelector('[data-identity-widget]')) {
        const identityScript = document.createElement('script');
        identityScript.src = 'https://identity.netlify.com/v1/netlify-identity-widget.js';
        identityScript.async = true;
        identityScript.defer = true;
        identityScript.dataset.identityWidget = 'true';
        identityScript.onload = () => {
          setupAdminAuth();
        };
        document.body.appendChild(identityScript);
      }
      let attempts = 0;
      const retryInit = () => {
        if (window.netlifyIdentity) {
          setupAdminAuth();
          return;
        }
        attempts += 1;
        if (attempts < 20) {
          window.setTimeout(retryInit, 100);
        }
      };
      retryInit();
      setAuthState('checking');
      setStatus('admin_access_checking');
      return;
    }

    setAuthState('checking');

    let initTimer = null;

    const handleUser = (user) => {
      if (initTimer) {
        clearTimeout(initTimer);
        initTimer = null;
      }
      if (!user) {
        setAuthState('denied');
        setStatus('admin_access_required');
        if (loginButton) loginButton.hidden = false;
        if (logoutButton) logoutButton.hidden = true;
        updateMeta(null);
        setSuperAdminVisibility(false);
        setAdminSession(false);
        if (isAdminPage) {
          window.location.href = getAdminLoginRedirect();
        }
        return;
      }

      if (!hasAdminRole(user)) {
        setAuthState('denied');
        setStatus('admin_access_denied');
        if (loginButton) loginButton.hidden = true;
        if (logoutButton) logoutButton.hidden = false;
        updateMeta(user);
        setSuperAdminVisibility(false);
        setAdminSession(false);
        if (isLoginPage) {
          setStatus('admin_login_error');
        }
        return;
      }

      setAuthState('granted');
      setStatus('admin_access_granted');
      if (loginButton) loginButton.hidden = true;
      if (logoutButton) logoutButton.hidden = false;
      updateMeta(user);
      setSuperAdminVisibility(isSuperAdmin(user));
      setAdminSession(true);

      if (isLoginPage) {
        const redirect = searchParams.get('redirect') || './admin-page.html';
        window.location.href = hasAuthToken ? './admin-page.html' : redirect;
      }

      if (isAdminPage) {
        initModerationPanel(user, isSuperAdmin(user));
      }
    };

    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(
      window.location.hash && window.location.hash.includes('=')
        ? window.location.hash.slice(1)
        : ''
    );
    const hasRecoveryToken = searchParams.has('recovery_token') || hashParams.has('recovery_token');
    const hasInviteToken = searchParams.has('invite_token') || hashParams.has('invite_token');
    const hasConfirmToken =
      searchParams.has('confirmation_token') || hashParams.has('confirmation_token');
    const hasAuthToken = hasRecoveryToken || hasInviteToken || hasConfirmToken;

    window.netlifyIdentity.on('init', (user) => {
      handleUser(user);
      if (isLoginPage && !user && hasAuthToken) {
        const action = hasRecoveryToken ? 'recovery' : 'signup';
        window.netlifyIdentity.open(action);
      }
    });
    window.netlifyIdentity.on('login', (user) => {
      handleUser(user);
      window.netlifyIdentity.close();
    });
    window.netlifyIdentity.on('logout', () => {
      handleUser(null);
    });
    initTimer = window.setTimeout(() => {
      if (document.body.dataset.adminAuth === 'checking') {
        handleUser(null);
      }
    }, 500);

    window.netlifyIdentity.init();
  };

  const initModerationPanel = (user, superAdmin) => {
    if (!moderationList || !modal || moderationList.dataset.ready) return;
    moderationList.dataset.ready = 'true';

    const pendingContainer = document.querySelector('[data-admin-pending]');
    const verificationContainer = document.querySelector('[data-admin-verifications]');
    const rejectedContainer = document.querySelector('[data-admin-rejected]');
    const auditContainer = document.querySelector('[data-admin-audit]');
    const template = document.querySelector('#moderation-card-template');
    const verificationTemplate = document.querySelector('#verification-card-template');
    const auditTemplate = document.querySelector('#audit-row-template');
    const loadingEl = pendingContainer?.querySelector('[data-admin-loading]');
    const emptyEl = pendingContainer?.querySelector('[data-admin-empty]');
    const verificationEmptyEl = verificationContainer?.querySelector('[data-admin-verifications-empty]');
    const rejectedEmptyEl = rejectedContainer?.querySelector('[data-admin-rejected-empty]');
    const auditEmptyEl = auditContainer?.querySelector('[data-admin-audit-empty]');
    const modalDialog = modal.querySelector('.modal__dialog');
    const modalTextarea = modal.querySelector('textarea[name="reject-reason"]');
    const modalCloseButtons = modal.querySelectorAll('[data-modal-close]');
    const modalConfirm = modal.querySelector('[data-modal-confirm]');
    const editModal = document.querySelector('[data-admin-edit-modal]');
    const editDialog = editModal?.querySelector('.modal__dialog');
    const editForm = editModal?.querySelector('[data-admin-edit-form]');
    const editLinks = editModal?.querySelector('[data-admin-edit-links]');
    const editCloseButtons = editModal
      ? editModal.querySelectorAll('[data-admin-edit-close]')
      : [];
    const editSave = editModal?.querySelector('[data-admin-edit-save]');
    let activeCard = null;
    let lastTrigger = null;
    let activeEditId = null;
    let lastEditTrigger = null;
    const pendingById = new Map();

    const focusableSelector =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const openModal = (triggerButton, card) => {
      activeCard = card;
      lastTrigger = triggerButton;
      modal.hidden = false;
      if (modalTextarea) {
        modalTextarea.value = '';
        modalTextarea.focus();
      }
    };

    const closeModal = () => {
      modal.hidden = true;
      activeCard = null;
      if (lastTrigger) {
        lastTrigger.focus();
      }
    };

    const closeEditModal = () => {
      if (!editModal) return;
      editModal.hidden = true;
      activeEditId = null;
      if (lastEditTrigger) {
        lastEditTrigger.focus();
      }
    };

    const normalizeUrl = (value) => {
      const trimmed = String(value || '').trim();
      if (!trimmed) return '';
      if (/^https?:\/\//i.test(trimmed)) return trimmed;
      return `https://${trimmed}`;
    };

    const renderEditLinks = (payload) => {
      if (!editLinks) return;
      const entries = [
        { label: 'Website', value: payload['contact-website'] || payload.website },
        { label: 'Instagram', value: payload['contact-instagram'] },
        { label: 'Facebook', value: payload['contact-facebook'] },
        { label: 'Telegram', value: payload['contact-telegram'] }
      ]
        .map((entry) => ({ ...entry, url: normalizeUrl(entry.value) }))
        .filter((entry) => entry.url);
      if (!entries.length) {
        editLinks.innerHTML = '<span class="admin-edit__links-empty">Немає посилань.</span>';
        return;
      }
      editLinks.innerHTML = entries
        .map(
          (entry) =>
            `<a class="admin-edit__link" href="${entry.url}" target="_blank" rel="noopener">${entry.label}</a>`
        )
        .join('');
    };

    const openEditModal = (triggerButton, item) => {
      if (!editModal || !editForm) return;
      const payload = item?.payload || {};
      activeEditId = item?.id || null;
      lastEditTrigger = triggerButton;
      const setValue = (name, value) => {
        const field = editForm.querySelector(`[name="${CSS.escape(name)}"]`);
        if (!field) return;
        if (
          field instanceof HTMLInputElement ||
          field instanceof HTMLTextAreaElement ||
          field instanceof HTMLSelectElement
        ) {
          field.value = value ?? '';
        }
      };
      setValue('title', payload.title || item?.title || '');
      setValue('description', payload.description || '');
      setValue('category', payload.category || '');
      const tagsValue = Array.isArray(payload.tags) ? payload.tags.join(', ') : payload.tags || '';
      setValue('tags', tagsValue);
      setValue('start', payload.start || '');
      setValue('end', payload.end || '');
      setValue('format', payload.format || '');
      setValue('address', payload.address || '');
      setValue('city', payload.city || '');
      setValue('ticket-type', payload['ticket-type'] || '');
      setValue('price-min', payload['price-min'] || '');
      setValue('price-max', payload['price-max'] || '');
      setValue('ticket-url', payload['ticket-url'] || '');
      setValue('contact-name', payload['contact-name'] || '');
      setValue('contact-email', payload['contact-email'] || '');
      setValue('contact-phone', payload['contact-phone'] || '');
      setValue('contact-facebook', payload['contact-facebook'] || '');
      setValue('contact-instagram', payload['contact-instagram'] || '');
      setValue('contact-telegram', payload['contact-telegram'] || '');
      setValue('contact-website', payload['contact-website'] || '');
      renderEditLinks(payload);
      editModal.hidden = false;
      const firstField = editForm.querySelector('input, textarea, select');
      if (firstField instanceof HTMLElement) {
        firstField.focus();
      }
    };

    const updateStatus = (card, statusKey, reason) => {
      const statusPill = card.querySelector('.status-pill');
      const reasonText = card.querySelector('[data-admin-reason]');
      if (!statusPill) return;
      statusPill.textContent = formatMessage(statusKey, {});
      statusPill.classList.remove('status-pill--pending', 'status-pill--published', 'status-pill--draft');
      if (statusKey === 'admin_status_approved') {
        statusPill.classList.add('status-pill--published');
        if (reasonText) {
          reasonText.hidden = true;
        }
      } else if (statusKey === 'admin_status_rejected') {
        statusPill.classList.add('status-pill--draft');
        if (reasonText) {
          reasonText.hidden = false;
          const label = formatMessage('admin_reason_label', {});
          reasonText.textContent = reason ? `${label}: ${reason}` : `${label}: —`;
        }
      }
    };

    const renderHistory = (card, history) => {
      const historyEl = card.querySelector('[data-admin-history]');
      const historyList = card.querySelector('[data-admin-history-list]');
      if (!historyEl || !historyList) return;
      historyList.innerHTML = '';
      if (!history || history.length === 0) {
        historyEl.hidden = true;
        return;
      }
      history.forEach((entry) => {
        const li = document.createElement('li');
        const actionKey =
          entry.action === 'approve' ? 'admin_status_approved' : 'admin_status_rejected';
        const actionLabel = formatMessage(actionKey, {});
        const actor = entry.actorEmail || '—';
        const tsText = entry.ts ? new Date(entry.ts).toLocaleString(getUiLocale()) : '—';
        li.textContent = formatMessage('admin_history_entry', { action: actionLabel, actor, ts: tsText });
        historyList.appendChild(li);
      });
      historyEl.hidden = false;
    };

    const renderCards = (container, items, withActions) => {
      if (!container || !template) return;
      container.querySelectorAll('[data-admin-card]').forEach((card) => card.remove());
      items.forEach((item) => {
        const card = template.content.firstElementChild.cloneNode(true);
        card.dataset.eventId = item.id;
        const titleEl = card.querySelector('[data-admin-title]');
        const metaEl = card.querySelector('[data-admin-meta]');
        const descriptionEl = card.querySelector('[data-admin-description]');
        if (titleEl) titleEl.textContent = item.title;
        if (metaEl) metaEl.textContent = item.meta;
        if (descriptionEl) {
          const description = item.payload?.description || '';
          descriptionEl.textContent = description;
        }
        if (!withActions) {
          const actions = card.querySelector('[data-admin-actions]');
          if (actions) actions.remove();
          updateStatus(card, 'admin_status_rejected', item.reason);
        }
        renderHistory(card, item.history || []);
        if (withActions) {
          attachInlineEditHandlers(card);
        }
        container.appendChild(card);
      });
    };

    const getInlineEditElements = (card) => ({
      descriptionEl: card.querySelector('[data-admin-description]'),
      editor: card.querySelector('[data-admin-inline-edit]'),
      titleInput: card.querySelector('[data-admin-inline-title]'),
      descriptionInput: card.querySelector('[data-admin-inline-description]'),
      actions: card.querySelector('[data-admin-actions]'),
      inlineActions: card.querySelector('[data-admin-edit-actions]'),
      saveButton: card.querySelector('[data-admin-inline-save]'),
      cancelButton: card.querySelector('[data-admin-inline-cancel]')
    });

    const toggleInlineEditUI = (card, editing) => {
      const elems = getInlineEditElements(card);
      if (elems.descriptionEl) elems.descriptionEl.hidden = editing;
      if (elems.editor) elems.editor.hidden = !editing;
      if (elems.actions) elems.actions.hidden = editing;
      if (elems.inlineActions) elems.inlineActions.hidden = !editing;
      card.classList.toggle('is-editing', editing);
    };

    const populateInlineForm = (card, eventData) => {
      const elems = getInlineEditElements(card);
      const payload = eventData.payload || {};
      if (elems.titleInput) {
        elems.titleInput.value = payload.title || eventData.title || '';
      }
      if (elems.descriptionInput) {
        elems.descriptionInput.value = payload.description || '';
      }
    };

    const startInlineEdit = (card) => {
      const eventId = card.dataset.eventId;
      const eventData = pendingById.get(eventId);
      if (!eventData) return;
      populateInlineForm(card, eventData);
      toggleInlineEditUI(card, true);
      getInlineEditElements(card).titleInput?.focus();
    };

    const cancelInlineEdit = (card) => {
      const eventId = card.dataset.eventId;
      const eventData = pendingById.get(eventId);
      if (eventData) {
        populateInlineForm(card, eventData);
      }
      toggleInlineEditUI(card, false);
    };

    const saveInlineEdit = async (card) => {
      const eventId = card.dataset.eventId;
      if (!eventId) return;
      const eventData = pendingById.get(eventId);
      if (!eventData) return;
      const elems = getInlineEditElements(card);
      const titleValue = elems.titleInput?.value.trim() || eventData.title || '';
      const descriptionValue = elems.descriptionInput?.value.trim() || '';
      const tags = Array.isArray(eventData.payload?.tags)
        ? [...eventData.payload.tags]
        : [];
      const payload = {
        title: titleValue,
        description: descriptionValue,
        tags
      };
      const lastModifiedByAdmin = new Date().toISOString();
      if (elems.saveButton) elems.saveButton.disabled = true;
      if (elems.cancelButton) elems.cancelButton.disabled = true;
      try {
        const response = await fetch('/.netlify/functions/update-event', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify({ id: eventId, payload, lastModifiedByAdmin })
        });
        if (!response.ok) throw new Error('update failed');
        const result = await response.json();
        if (!result?.ok) throw new Error('update failed');
        const nextPayload = {
          ...(eventData.payload || {}),
          ...payload
        };
        eventData.payload = nextPayload;
        eventData.title = payload.title;
        pendingById.set(eventId, eventData);
        const titleEl = card.querySelector('[data-admin-title]');
        const descriptionEl = card.querySelector('[data-admin-description]');
        if (titleEl) titleEl.textContent = payload.title;
        if (descriptionEl) descriptionEl.textContent = payload.description || '';
        toggleInlineEditUI(card, false);
      } catch (error) {
        console.error('Inline update failed', error);
      } finally {
        if (elems.saveButton) elems.saveButton.disabled = false;
        if (elems.cancelButton) elems.cancelButton.disabled = false;
      }
    };

    const attachInlineEditHandlers = (card) => {
      const editButton = card.querySelector('[data-action="inline-edit"]');
      const saveButton = card.querySelector('[data-admin-inline-save]');
      const cancelButton = card.querySelector('[data-admin-inline-cancel]');
      if (editButton) {
        editButton.addEventListener('click', () => startInlineEdit(card));
      }
      if (saveButton) {
        saveButton.addEventListener('click', () => saveInlineEdit(card));
      }
      if (cancelButton) {
        cancelButton.addEventListener('click', () => cancelInlineEdit(card));
      }
    };

    const renderVerifications = (items) => {
      if (!verificationContainer || !verificationTemplate) return;
      verificationContainer
        .querySelectorAll('[data-admin-verification-row]')
        .forEach((card) => card.remove());
      items.forEach((item) => {
        const row = verificationTemplate.content.firstElementChild.cloneNode(true);
        const nameEl = row.querySelector('[data-admin-verification-name]');
        const metaEl = row.querySelector('[data-admin-verification-meta]');
        const linkEl = row.querySelector('[data-admin-verification-link]');
        const link = item.link || '—';
        const createdAt = item.createdAt
          ? new Date(item.createdAt).toLocaleString(getUiLocale())
          : '—';
        row.dataset.link = item.link || '';
        row.dataset.name = item.name || link;
        if (nameEl) nameEl.textContent = item.name || link;
        if (metaEl) metaEl.textContent = createdAt;
        if (linkEl) {
          linkEl.href = item.link || '#';
          linkEl.textContent = item.link || '—';
        }
        verificationContainer.appendChild(row);
      });
    };

    const renderAudit = (items) => {
      if (!auditContainer || !auditTemplate) return;
      auditContainer.querySelectorAll('[data-admin-audit-row]').forEach((row) => row.remove());
      if (!items || items.length === 0) {
        if (auditEmptyEl) auditEmptyEl.hidden = false;
        return;
      }
      if (auditEmptyEl) auditEmptyEl.hidden = true;
      items.forEach((entry) => {
        const row = auditTemplate.content.firstElementChild.cloneNode(true);
        const titleEl = row.querySelector('[data-admin-audit-title]');
        const metaEl = row.querySelector('[data-admin-audit-meta]');
        const statusEl = row.querySelector('[data-admin-audit-status]');
        const reasonEl = row.querySelector('[data-admin-audit-reason]');
        if (titleEl) titleEl.textContent = entry.title;
        const actor = entry.actorEmail || '—';
        const ts = entry.ts ? new Date(entry.ts).toLocaleString(getUiLocale()) : '—';
        if (metaEl) metaEl.textContent = `${actor} · ${ts}`;
        const statusKey =
          entry.action === 'approve' ? 'admin_status_approved' : 'admin_status_rejected';
        if (statusEl) {
          statusEl.textContent = formatMessage(statusKey, {});
          statusEl.classList.remove('status-pill--pending');
          statusEl.classList.add(
            entry.action === 'approve' ? 'status-pill--published' : 'status-pill--draft'
          );
        }
        if (reasonEl) {
          if (entry.reason) {
            const label = formatMessage('admin_reason_label', {});
            reasonEl.textContent = `${label}: ${entry.reason}`;
            reasonEl.hidden = false;
          } else {
            reasonEl.hidden = true;
          }
        }
        auditContainer.appendChild(row);
      });
    };

    const setEmptyState = (el, isEmpty) => {
      if (!el) return;
      el.hidden = !isEmpty;
    };

    const getAuthHeaders = () => {
      const token = user?.token?.access_token;
      return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const loadModerationQueue = async () => {
      if (loadingEl) loadingEl.hidden = false;
      if (emptyEl) emptyEl.hidden = true;
      if (verificationEmptyEl) verificationEmptyEl.hidden = true;
      if (rejectedEmptyEl) rejectedEmptyEl.hidden = true;
      if (auditEmptyEl) auditEmptyEl.hidden = true;
      try {
        const lang = 'uk';
        const response = await fetch(`/.netlify/functions/admin-events?lang=${encodeURIComponent(lang)}`, {
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), 'x-locale': lang }
        });
        if (!response.ok) {
          throw new Error('admin events failed');
        }
        const result = await response.json();
        const pending = Array.isArray(result?.pending) ? result.pending : [];
        const rejected = Array.isArray(result?.rejected) ? result.rejected : [];
        const audit = Array.isArray(result?.audit) ? result.audit : [];
        const verifications = Array.isArray(result?.verifications) ? result.verifications : [];
        pendingById.clear();
        pending.forEach((item) => {
          if (item?.id) pendingById.set(item.id, item);
        });
        renderCards(pendingContainer, pending, true);
        renderCards(rejectedContainer, rejected, false);
        renderVerifications(verifications);
        setEmptyState(emptyEl, pending.length === 0);
        setEmptyState(verificationEmptyEl, verifications.length === 0);
        setEmptyState(rejectedEmptyEl, rejected.length === 0);
        if (superAdmin) {
          renderAudit(audit);
        }
      } catch (error) {
        setEmptyState(emptyEl, true);
        setEmptyState(verificationEmptyEl, true);
        setEmptyState(rejectedEmptyEl, true);
        if (auditEmptyEl) auditEmptyEl.hidden = false;
      } finally {
        if (loadingEl) loadingEl.hidden = true;
      }
    };

    const sendModerationAction = async (eventId, action, reason, payload) => {
      try {
        const body = { id: eventId, action, reason };
        if (payload && typeof payload === 'object') {
          body.payload = payload;
        }
        await fetch('/.netlify/functions/admin-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(body)
        });
      } catch (error) {
        // Ignore network errors for optimistic UI.
      }
    };

    const sendVerificationAction = async ({ link, name, action }) => {
      try {
        await fetch('/.netlify/functions/admin-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ link, name, action })
        });
      } catch (error) {
        // Ignore network errors for optimistic UI.
      }
    };

    if (pendingContainer) {
      pendingContainer.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const card = target.closest('[data-admin-card]');
        if (!card) return;
        const eventId = card.dataset.eventId || '';
        if (target.dataset.action === 'view') {
          const item = pendingById.get(eventId);
          if (item) {
            openEditModal(target, item);
          }
          return;
        }
        if (target.dataset.action === 'approve') {
          updateStatus(card, 'admin_status_approved');
          sendModerationAction(eventId, 'approve').then(loadModerationQueue);
        }
        if (target.dataset.action === 'reject') {
          openModal(target, card);
        }
      });
    }

    if (verificationContainer) {
      verificationContainer.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.dataset.action !== 'approve-verification') return;
        const card = target.closest('[data-admin-verification-row]');
        if (!card) return;
        const link = card.dataset.link || '';
        const name = card.dataset.name || '';
        sendVerificationAction({ link, name, action: 'approve' });
        card.remove();
        const remaining =
          verificationContainer.querySelectorAll('[data-admin-verification-row]').length === 0;
        setEmptyState(verificationEmptyEl, remaining);
      });
    }

    modalCloseButtons.forEach((button) => {
      button.addEventListener('click', () => {
        closeModal();
      });
    });

    if (modalConfirm) {
      modalConfirm.addEventListener('click', () => {
        if (!activeCard || !modalTextarea) return;
        if (!modalTextarea.checkValidity()) {
          modalTextarea.reportValidity();
          return;
        }
        const reason = modalTextarea.value.trim();
        updateStatus(activeCard, 'admin_status_rejected', reason);
        sendModerationAction(activeCard.dataset.eventId || '', 'reject', reason).then(
          loadModerationQueue
        );
        closeModal();
      });
    }

    modal.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key !== 'Tab') return;
      if (!modalDialog) return;
      const focusable = Array.from(modalDialog.querySelectorAll(focusableSelector));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    if (editModal) {
      editCloseButtons.forEach((button) => {
        button.addEventListener('click', () => {
          closeEditModal();
        });
      });

      editModal.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeEditModal();
          return;
        }
        if (event.key !== 'Tab') return;
        if (!editDialog) return;
        const focusable = Array.from(editDialog.querySelectorAll(focusableSelector));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      });
    }

    if (editForm) {
      editForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!activeEditId) return;
        if (!editSave) return;
        editSave.disabled = true;
        const formData = new FormData(editForm);
        const payload = Object.fromEntries(formData.entries());
        try {
          const response = await fetch('/.netlify/functions/admin-update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
            body: JSON.stringify({ id: activeEditId, action: 'edit', payload })
          });
          if (!response.ok) throw new Error('edit failed');
          await loadModerationQueue();
          closeEditModal();
        } catch (error) {
          // Ignore edit failures for now.
        } finally {
          editSave.disabled = false;
        }
      });
    }

    loadModerationQueue();
  };

  setupAdminAuth();
};
