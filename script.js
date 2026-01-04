(() => {
  const header = document.querySelector('.site-header');
  const menuToggle = document.querySelector('.menu-toggle');
  const primaryNav = document.querySelector('#primary-nav');
  const filterToggles = document.querySelectorAll('.filters__toggle-btn');
  const smallScreenQuery = window.matchMedia('(max-width: 767px)');
  const multiStepForm = document.querySelector('.multi-step');
  const moderationList = document.querySelector('.moderation-list');
  const modal = document.querySelector('.modal');
  const catalogGrid = document.querySelector('.catalog-grid');
  const ticketCtas = document.querySelectorAll('.event-sidebar__cta--ticket');
  const similarCtas = document.querySelectorAll('.event-sidebar__cta--similar');
  const langButtons = document.querySelectorAll('.lang-switch__button');
  const themeToggle = document.querySelector('.theme-toggle');
  const debugEnabled = new URLSearchParams(window.location.search).get('debug') === '1';
  const logBuffer = [];
  let debugPanel = null;
  let debugList = null;

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

  const translations = {
    uk: {
      title_home: 'Події для українців у Данії',
      tagline: 'Концерти, зустрічі, освітні події — у містах Данії та онлайн.',
      hero_eyebrow: 'Найближчі події',
      nav_events: 'Події',
      nav_organizers: 'Організатори',
      nav_about: 'Про нас',
      nav_contacts: 'Контакти',
      nav_dashboard: 'Дашборд',
      skip_link: 'Перейти до вмісту',
      nav_toggle: 'Перемкнути навігацію',
      nav_primary_aria: 'Основна навігація',
      brand_aria: 'Бренд платформи',
      lang_switch_aria: 'Мова',
      theme_toggle_aria: 'Перемкнути тему',
      theme_light: 'Світла',
      theme_dark: 'Темна',
      back_to_catalog: 'До каталогу',
      back_to_dashboard: 'Назад до дашборду',
      search_placeholder: 'Пошук за містом, тематикою або датою',
      presets: {
        today: 'Сьогодні',
        tomorrow: 'Завтра',
        weekend: 'Вихідні',
        online: 'Онлайн'
      },
      search_label: 'Пошук подій',
      search_help: 'Наприклад: Копенгаген, музика або вихідні.',
      cta_explore: 'Переглянути події',
      cta_add_event: 'Додати подію',
      home_link: 'Домівка',
      cta_details: 'Детальніше',
      ticket_cta: 'Квитки',
      register_cta: 'Реєстрація',
      dashboard_create_cta: 'Створити подію',
      dashboard_tab_events: 'Мої події',
      dashboard_tab_create: 'Створити подію',
      dashboard_tab_settings: 'Налаштування',
      dashboard_eyebrow: 'Робочий простір організатора',
      dashboard_title: 'Дашборд',
      dashboard_tabs_aria: 'Розділи дашборду',
      dashboard_events_summary: 'Керуйте чернетками та опублікованими подіями.',
      dashboard_table_aria: 'Статуси подій',
      dashboard_table_event: 'Подія',
      dashboard_table_date: 'Дата',
      dashboard_table_status: 'Статус',
      dashboard_table_actions: 'Дії',
      dashboard_status_published: 'Опубліковано',
      dashboard_status_pending: 'На модерації',
      dashboard_status_draft: 'Чернетка',
      dashboard_action_view: 'Переглянути',
      dashboard_action_edit: 'Редагувати',
      dashboard_action_continue: 'Продовжити',
      dashboard_empty_eyebrow: 'Немає майбутніх подій',
      dashboard_empty_title: 'Почніть планувати наступну подію.',
      dashboard_empty_summary: 'Створіть чернетку, щоб зафіксувати ідеї.',
      dashboard_settings_summary: 'Налаштуйте профіль та верифікацію організатора.',
      admin_eyebrow: 'Робочий простір адміністратора',
      admin_title: 'Черга модерації',
      admin_pending_title: 'Події на розгляді',
      admin_pending_summary: 'Перевіряйте нові заявки та публікуйте їх.',
      admin_status_pending: 'На розгляді',
      admin_action_approve: 'Схвалити',
      admin_action_reject: 'Відхилити',
      admin_modal_title: 'Відхилити подію',
      admin_modal_help: 'Вкажіть коротку причину відхилення.',
      admin_modal_reason_label: 'Причина',
      admin_modal_cancel: 'Скасувати',
      admin_modal_reject: 'Відхилити',
      create_event_eyebrow: 'Створення події',
      stepper_aria: 'Кроки створення події',
      step_basic: '1. Основне',
      step_time: '2. Час/місце',
      step_tickets: '3. Квитки',
      step_media: '4. Медіа',
      step_preview: '5. Прев’ю',
      form_title_label: 'Назва події',
      form_title_help: 'Мінімум 3 символи.',
      form_category_placeholder: 'Оберіть категорію',
      form_category_music: 'Музика',
      form_category_food: 'Їжа',
      form_category_sport: 'Спорт',
      form_category_tech: 'Tech',
      form_tags_placeholder: 'дизайн',
      form_start_label: 'Початок',
      form_start_help: 'Вкажіть локальний час.',
      form_format_label: 'Формат',
      form_format_placeholder: 'Оберіть формат',
      form_format_offline: 'Офлайн',
      form_format_online: 'Онлайн',
      form_address_label: 'Адреса',
      form_address_placeholder: 'Копенгаген, Main St 10',
      form_address_help: 'Для онлайн-подій вкажіть платформу.',
      form_ticket_type_label: 'Тип події',
      form_ticket_free: 'Безкоштовно',
      form_ticket_paid: 'Платно',
      form_price_min: 'Мінімальна ціна',
      form_price_max: 'Максимальна ціна',
      form_ticket_url: 'Зовнішній лінк на квитки',
      form_ticket_help: 'Необов’язково.',
      form_image_label: 'Зображення події',
      form_image_alt_label: 'Alt текст',
      form_image_alt_placeholder: 'Опис зображення',
      form_image_alt_help: 'Наприклад: сцена з освітленням.',
      preview_title: 'Назва',
      preview_category: 'Категорія',
      preview_tags: 'Теги',
      preview_time: 'Час',
      preview_location: 'Місце',
      preview_tickets: 'Квитки',
      preview_format: 'Формат',
      form_submit_moderation: 'Надіслати на модерацію',
      form_back: 'Назад',
      form_next: 'Далі',
      required_label: 'Обовʼязково',
      event_eyebrow: 'Дизайн і продукт',
      event_description_title: 'Опис',
      event_description_body:
        'Зустріч спільноти про масштабовані дизайн-системи. Обговоримо кейси, проведемо воркшоп і познайомимося ближче.',
      event_where_title: 'Де',
      event_map_placeholder: 'Плейсхолдер мапи',
      event_language_title: 'Мова події',
      event_language_value: 'uk / en',
      event_tags_title: 'Теги',
      event_organizer_title: 'Організатор',
      event_share_title: 'Поділитися',
      event_share_facebook: 'Facebook',
      event_share_x: 'X',
      event_share_linkedin: 'LinkedIn',
      event_ticket_note: 'Купити квитки (DKK 350–520)',
      ticket_panel_aria: 'Панель квитків',
      organizer_meta: 'Некомерційна спільнота зустрічей',
      organizer_contact_email: 'Email',
      organizer_contact_phone: 'Телефон',
      organizer_contact_website: 'Сайт',
      organizer_logo_placeholder: 'Лого',
      organizer_description:
        'Некомерційна спільнота, що проводить події для дизайнерів, креаторів і лідерів спільнот.',
      organizer_events_title: 'Події',
      organizer_events_summary: 'Останні події цього організатора.',
      docs_title: 'Допомога та правила',
      docs_summary: 'Короткі відповіді на найчастіші питання про модерацію та оформлення подій.',
      docs_nav_aria: 'Зміст',
      docs_nav_naming: 'Правила назв подій',
      docs_nav_tags: 'Теги та категорії (як створювати)',
      docs_nav_past: 'Що вважати минулою подією',
      docs_nav_verification: 'Верифікація організаторів',
      docs_naming_title: 'Правила назв подій',
      docs_naming_body_1:
        'Назва має бути короткою, без капслоку та зайвих символів. Додавайте місто лише якщо це важливо.',
      docs_naming_body_2: 'Приклад: “Кінопоказ у Копенгагені: Docu UA Night”.',
      docs_tags_title: 'Теги та категорії (як створювати)',
      docs_tags_body_1:
        'Обирайте найрелевантнішу категорію та 2–5 тегів. Для нової категорії натисніть “Додати категорію”.',
      docs_tags_body_2: 'Нові теги потрапляють на модерацію та будуть позначені як “на розгляді”.',
      docs_past_title: 'Що вважати минулою подією',
      docs_past_body_1:
        'Якщо подія завершилася або дата початку вже минула (і кінцеву дату не вказано), вона вважається минулою.',
      docs_past_body_2: 'За потреби увімкніть фільтр “Показати минулі”, щоб переглянути архів.',
      docs_verification_title: 'Верифікація організаторів',
      docs_verification_body_1:
        'Верифікація потрібна для публікації подій. Ви можете підтвердити email або надати сайт/соцмережі.',
      docs_verification_body_2: 'Після перевірки статус організатора змінюється на “Верифіковано”.',
      privacy_title: 'Політика конфіденційності',
      privacy_summary: 'Ми збираємо мінімум даних, потрібних для роботи платформи, і не використовуємо сторонні трекери.',
      privacy_nav_data: 'Які дані збираємо',
      privacy_nav_usage: 'Як використовуємо',
      privacy_nav_storage: 'Зберігання',
      privacy_nav_contact: 'Контакти',
      privacy_data_title: 'Які дані збираємо',
      privacy_data_body:
        'Ми зберігаємо лише базові дані подій і контактів організаторів, які ви добровільно надаєте у формах.',
      privacy_usage_title: 'Як використовуємо',
      privacy_usage_body:
        'Дані потрібні для публікації подій, модерації та зв’язку з організаторами. Ми не показуємо їх третім сторонам.',
      privacy_storage_title: 'Зберігання',
      privacy_storage_body:
        'Дані зберігаються лише стільки, скільки потрібно для роботи сервісу. Після цього їх можна видалити за запитом.',
      privacy_contact_title: 'Контакти',
      privacy_contact_body:
        'Якщо маєте питання щодо конфіденційності, напишіть нам на email, вказаний у розділі контактів.',
      terms_title: 'Умови користування',
      terms_summary: 'Ці умови описують правила використання платформи та відповідальність організаторів і відвідувачів.',
      legal_nav_aria: 'Зміст',
      terms_nav_rules: 'Основні правила',
      terms_nav_content: 'Контент і модерація',
      terms_nav_liability: 'Відповідальність',
      terms_nav_contact: 'Контакти',
      terms_rules_title: 'Основні правила',
      terms_rules_body:
        'Публікуйте лише достовірні події та поважайте спільноту. Заборонені спам, дискримінація та небезпечний контент.',
      terms_content_title: 'Контент і модерація',
      terms_content_body:
        'Ми перевіряємо події перед публікацією. Модератори можуть відхилити подію, якщо вона не відповідає правилам.',
      terms_liability_title: 'Відповідальність',
      terms_liability_body:
        'Організатори відповідають за точність інформації та проведення подій. Платформа не є стороною угод між учасниками.',
      terms_contact_title: 'Контакти',
      terms_contact_body:
        'Для запитань щодо умов користування звертайтесь через форму зворотного зв’язку або email.',
      filter_title: 'Каталог',
      catalog_summary: 'Додавайте фільтри та переглядайте події у зручному списку.',
      highlights_title: 'Тижневі добірки',
      highlights_prev: 'Назад',
      highlights_next: 'Далі',
      highlights_prev_aria: 'Попередні добірки',
      highlights_next_aria: 'Наступні добірки',
      highlights_list_aria: 'Список тижневих добірок',
      filters_date: 'Дата',
      filters_from: 'Від',
      filters_to: 'До',
      filters_today: 'Сьогодні',
      filters_tomorrow: 'Завтра',
      filters_weekend: 'Вихідні',
      filters_online: 'Онлайн',
      filters_location: 'Місце та категорія',
      filters_aria: 'Фільтри каталогу',
      filters_city: 'Місто',
      filters_all_cities: 'Усі міста',
      filters_category: 'Категорія',
      filters_all_categories: 'Усі категорії',
      category_music: 'Музика',
      category_networking: 'Networking',
      category_cinema: 'Кіно',
      category_education: 'Освіта',
      category_kids: 'Для дітей',
      category_community: 'Спільнота',
      filters_preferences: 'Параметри',
      filters_price: 'Ціна',
      filters_any_price: 'Будь-яка',
      filters_free: 'Безкоштовно',
      filters_paid: 'Платно',
      price_free: 'Безкоштовно',
      filters_format: 'Формат',
      filters_any_format: 'Будь-який',
      filters_offline: 'Офлайн',
      filters_audience: 'Аудиторія',
      filters_ua: 'UA',
      filters_family: 'Сім\'ям',
      filters_volunteer: 'Волонтерам',
      filters_past: 'Показати минулі',
      reset_filters: 'Скинути фільтри',
      empty_state: 'Немає подій за цим запитом.',
      similar_cta: 'Схожі події',
      error_eyebrow: 'Помилка',
      error_title: 'Не вдалося завантажити події.',
      error_summary: "Перевірте з'єднання та спробуйте ще раз.",
      error_retry: 'Повторити',
      home_about_title: 'Про нас',
      home_about_summary: 'Коротко про платформу та принципи модерації подій.',
      home_contact_title: 'Контакти',
      home_contact_summary: 'Напишіть нам, якщо маєте питання або хочете додати подію.',
      found_count: 'Знайдено {count}',
      footer_rights: '© 2024 What’s on DK?. Всі права захищено.',
      footer_help: 'Допомога',
      footer_privacy: 'Політика конфіденційності',
      footer_terms: 'Умови користування',
      not_found_title: 'Сторінку не знайдено',
      not_found_summary: 'Перевірте адресу або скористайтеся пошуком — можливо, потрібна подія вже тут.',
      not_found_search_label: 'Пошук подій',
      not_found_search_placeholder: 'Пошук за містом або темою',
      not_found_search_action: 'Пошук',
      not_found_help: 'Якщо помилка повторюється, напишіть нам — ми допоможемо знайти потрібну інформацію.',
      not_found_back: 'Повернутися на головну',
      switch_lang: 'Мова',
      meta_index_title: 'What’s on DK? — Події для українців у Данії',
      meta_index_desc: 'Актуальні події для українців у Данії: концерти, зустрічі, освіта та онлайн-івенти.',
      meta_event_title: 'Design Systems Meetup — What’s on DK?',
      meta_event_desc: 'Деталі події, квитки та локація для Design Systems Meetup.',
      meta_org_title: 'Evently Community — What’s on DK?',
      meta_org_desc: 'Профіль організатора та добірка подій у Данії.',
      meta_about_title: 'Про нас — What’s on DK?',
      meta_about_desc: 'Місія платформи та правила модерації подій для українців у Данії.',
      meta_contacts_title: 'Контакти — What’s on DK?',
      meta_contacts_desc: 'Контакти та відповіді на часті питання щодо подій у Данії.',
      meta_docs_title: 'Допомога — What’s on DK?',
      meta_docs_desc: 'Короткі правила для назв подій, тегів, архіву та верифікації.',
      meta_privacy_title: 'Політика конфіденційності — What’s on DK?',
      meta_privacy_desc: 'Мінімальний збір даних і відсутність трекерів.',
      meta_terms_title: 'Умови користування — What’s on DK?',
      meta_terms_desc: 'Правила використання платформи та відповідальність організаторів.',
      meta_dashboard_title: 'Дашборд — What’s on DK?',
      meta_dashboard_desc: 'Керування подіями, статусами та верифікацією організатора.',
      meta_dashboard_new_title: 'Створити подію — What’s on DK?',
      meta_dashboard_new_desc: 'Покрокова форма створення події.',
      meta_admin_title: 'Модерація — What’s on DK?',
      meta_admin_desc: 'Перевірка нових заявок на події.',
      meta_not_found_title: '404 — What’s on DK?',
      meta_not_found_desc: 'Сторінку не знайдено. Перейдіть на головну або скористайтеся пошуком.',
      organizer_location: 'Організатор у Данії',
      verified_badge: 'Верифіковано',
      verification_email_title: 'Верифікація через email',
      verification_email_label: 'Email для верифікації',
      verification_email_help: 'Ми надішлемо 6-значний код.',
      verification_send_code: 'Надіслати код',
      verification_code_label: 'Код підтвердження',
      verification_code_help: 'Введіть 6 цифр із листа.',
      verification_verify_code: 'Підтвердити код',
      verification_link_title: 'Сайт або соцмережа',
      verification_link_label: 'Посилання',
      verification_link_help: 'Ми перевіримо вручну.',
      verification_link_submit: 'Перевіримо вручну',
      verification_pending: 'Очікує підтвердження',
      verification_note: 'Для публікації подій потрібна верифікація організатора.',
      verification_code_sent: 'Код надіслано. Перевірте пошту.',
      verification_success: 'Організатора верифіковано.',
      verification_invalid_code: 'Невірний код. Спробуйте ще раз.',
      verification_error: 'Не вдалося виконати дію. Спробуйте пізніше.',
      verification_blocked: 'Щоб опублікувати подію, підтвердьте верифікацію організатора.',
      verification_banner_text: 'Щоб опублікувати подію, потрібна верифікація організатора.',
      verification_banner_action: 'Перейти до верифікації',
      submit_success: 'Подію надіслано на модерацію.',
      submit_error: 'Не вдалося надіслати подію. Спробуйте ще раз.',
      spam_blocked: 'Запит відхилено. Спробуйте ще раз.',
      verification_spam: 'Запит відхилено. Спробуйте ще раз.',
      archived_label: 'Архівовано',
      event_past_banner: 'Ця подія вже минула',
      tag_aria: 'Тег: {label}',
      tag_pending_aria: 'Тег: {label}, очікує підтвердження',
      category_aria: 'Категорія: {label}',
      category_pending_aria: 'Категорія: {label}, очікує підтвердження',
      about_title: 'Про проєкт',
      about_tagline: 'Платформа для української спільноти в Данії, що об’єднує події та ініціативи.',
      about_mission_title: 'Наша місія',
      about_mission_body: 'Ми допомагаємо українцям у Данії знаходити події, підтримку та нові знайомства.',
      about_submit_title: 'Як додати подію',
      about_submit_body: 'Надішліть подію через форму або на email. Ми перевіряємо події перед публікацією.',
      about_moderation_title: 'Модерація',
      about_moderation_body: 'Ми модеруюємо події, щоб вони відповідали правилам спільноти та були безпечними.',
      contacts_title: 'Контакти',
      contacts_tagline: 'Напишіть нам, якщо маєте питання або хочете додати подію.',
      contacts_email_title: 'Email',
      contacts_email_body: 'hello@whatsondk.test',
      contacts_faq_title: 'FAQ',
      contacts_faq_q1: 'Як додати подію?',
      contacts_faq_a1: 'Надішліть подію через форму або на email, і ми її перевіримо.',
      contacts_faq_q2: 'Які мови підтримуються?',
      contacts_faq_a2: 'Публікуємо події українською, данською або англійською.',
      contacts_faq_q3: 'Які міста охоплюємо?',
      contacts_faq_a3: 'Копенгаген, Орхус, Оденсе, Ольборг, Есб\'єрг та онлайн.',
      form_end_label: 'Завершення',
      form_optional_hint: '(необов\'язково)',
      form_contact_legend: 'Контактна особа',
      form_contact_name: 'Імʼя',
      form_contact_name_help: 'Вкажіть імʼя контактної особи.',
      form_contact_email: 'Email',
      form_contact_email_help: 'Наприклад: name@example.com.',
      form_contact_phone: 'Телефон',
      form_contact_phone_help: 'Формат: +45 12 34 56 78.',
      event_contact_title: 'Контакти',
      event_contact_name: 'Імʼя',
      event_contact_email_label: 'Email',
      event_contact_phone_label: 'Телефон',
      form_category_label: 'Категорія',
      form_add_category: 'Додати категорію',
      form_category_modal_title: 'Нова категорія',
      form_category_input_label: 'Назва категорії',
      form_category_help: 'Категорію перевірить модератор.',
      form_category_cancel: 'Скасувати',
      form_category_submit: 'Надіслати на затвердження',
      form_tags_label: 'Теги',
      form_tags_help: 'Натисніть Enter, щоб додати тег.',
      form_tags_input_label: 'Додати тег',
      pending_label: '(на розгляді)',
      pending_tooltip: 'Очікує підтвердження',
      remove_tag_label: 'Видалити тег {tag}'
    },
    en: {
      title_home: 'Events for Ukrainians in Denmark',
      tagline: 'Concerts, meetups, and education events — across Denmark and online.',
      hero_eyebrow: 'Upcoming experiences',
      nav_events: 'Events',
      nav_organizers: 'Organizers',
      nav_about: 'About',
      nav_contacts: 'Contacts',
      nav_dashboard: 'Dashboard',
      skip_link: 'Skip to content',
      nav_toggle: 'Toggle navigation',
      nav_primary_aria: 'Primary navigation',
      brand_aria: 'Platform brand',
      lang_switch_aria: 'Language',
      theme_toggle_aria: 'Toggle theme',
      theme_light: 'Light',
      theme_dark: 'Dark',
      back_to_catalog: 'Back to catalog',
      back_to_dashboard: 'Back to dashboard',
      search_placeholder: 'Search by city, theme, or date',
      presets: {
        today: 'Today',
        tomorrow: 'Tomorrow',
        weekend: 'Weekend',
        online: 'Online'
      },
      search_label: 'Search events',
      search_help: 'For example: Copenhagen, music, or weekend.',
      cta_explore: 'Browse events',
      cta_add_event: 'Add event',
      home_link: 'Home',
      cta_details: 'Details',
      ticket_cta: 'Tickets',
      register_cta: 'Register',
      dashboard_create_cta: 'Create event',
      dashboard_tab_events: 'My events',
      dashboard_tab_create: 'Create event',
      dashboard_tab_settings: 'Settings',
      dashboard_eyebrow: 'Organizer workspace',
      dashboard_title: 'Dashboard',
      dashboard_tabs_aria: 'Dashboard sections',
      dashboard_events_summary: 'Manage your drafts and published events.',
      dashboard_table_aria: 'Events status table',
      dashboard_table_event: 'Event',
      dashboard_table_date: 'Date',
      dashboard_table_status: 'Status',
      dashboard_table_actions: 'Actions',
      dashboard_status_published: 'Published',
      dashboard_status_pending: 'Pending',
      dashboard_status_draft: 'Draft',
      dashboard_action_view: 'View',
      dashboard_action_edit: 'Edit',
      dashboard_action_continue: 'Continue',
      dashboard_empty_eyebrow: 'No upcoming events',
      dashboard_empty_title: 'Start planning your next event.',
      dashboard_empty_summary: 'Create a draft to keep ideas organized.',
      dashboard_settings_summary: 'Configure your organizer profile and verification.',
      admin_eyebrow: 'Admin workspace',
      admin_title: 'Moderation queue',
      admin_pending_title: 'Pending events',
      admin_pending_summary: 'Review new submissions and publish them.',
      admin_status_pending: 'Pending',
      admin_action_approve: 'Approve',
      admin_action_reject: 'Reject',
      admin_modal_title: 'Reject event',
      admin_modal_help: 'Provide a short reason for rejection.',
      admin_modal_reason_label: 'Reason',
      admin_modal_cancel: 'Cancel',
      admin_modal_reject: 'Reject',
      create_event_eyebrow: 'Create new event',
      stepper_aria: 'Event creation steps',
      step_basic: '1. Basics',
      step_time: '2. Time & location',
      step_tickets: '3. Tickets',
      step_media: '4. Media',
      step_preview: '5. Preview',
      form_title_label: 'Event title',
      form_title_help: 'Minimum 3 characters.',
      form_category_placeholder: 'Select a category',
      form_category_music: 'Music',
      form_category_food: 'Food',
      form_category_sport: 'Sport',
      form_category_tech: 'Tech',
      form_tags_placeholder: 'design',
      form_start_label: 'Start',
      form_start_help: 'Use local time.',
      form_format_label: 'Format',
      form_format_placeholder: 'Select format',
      form_format_offline: 'Offline',
      form_format_online: 'Online',
      form_address_label: 'Address',
      form_address_placeholder: 'Copenhagen, Main St 10',
      form_address_help: 'For online events, specify the platform.',
      form_ticket_type_label: 'Ticket type',
      form_ticket_free: 'Free',
      form_ticket_paid: 'Paid',
      form_price_min: 'Minimum price',
      form_price_max: 'Maximum price',
      form_ticket_url: 'External ticket link',
      form_ticket_help: 'Optional.',
      form_image_label: 'Event image',
      form_image_alt_label: 'Alt text',
      form_image_alt_placeholder: 'Image description',
      form_image_alt_help: 'For example: a stage with lighting.',
      preview_title: 'Title',
      preview_category: 'Category',
      preview_tags: 'Tags',
      preview_time: 'Time',
      preview_location: 'Location',
      preview_tickets: 'Tickets',
      preview_format: 'Format',
      form_submit_moderation: 'Submit for moderation',
      form_back: 'Back',
      form_next: 'Next',
      required_label: 'Required',
      event_eyebrow: 'Design & Product',
      event_description_title: 'Description',
      event_description_body:
        'A community meetup focused on scalable design systems. Hear case studies, join a workshop, and connect with peers.',
      event_where_title: 'Where',
      event_map_placeholder: 'Map placeholder',
      event_language_title: 'Event language',
      event_language_value: 'uk / en',
      event_tags_title: 'Tags',
      event_organizer_title: 'Organizer',
      event_share_title: 'Share',
      event_share_facebook: 'Facebook',
      event_share_x: 'X',
      event_share_linkedin: 'LinkedIn',
      event_ticket_note: 'Buy tickets (DKK 350–520)',
      ticket_panel_aria: 'Ticket panel',
      organizer_meta: 'Non-profit meetup collective',
      organizer_contact_email: 'Email',
      organizer_contact_phone: 'Phone',
      organizer_contact_website: 'Website',
      organizer_logo_placeholder: 'Logo',
      organizer_description:
        'Non-profit collective hosting events for designers, builders, and community leaders.',
      organizer_events_title: 'Events',
      organizer_events_summary: 'Latest events hosted by this organizer.',
      docs_title: 'Help & guidelines',
      docs_summary: 'Quick answers about moderation, naming, and organizer verification.',
      docs_nav_aria: 'Table of contents',
      docs_nav_naming: 'Event naming rules',
      docs_nav_tags: 'Tags and categories (how to create)',
      docs_nav_past: 'What counts as a past event',
      docs_nav_verification: 'Organizer verification',
      docs_naming_title: 'Event naming rules',
      docs_naming_body_1:
        'Keep titles short, avoid all caps, and remove extra symbols. Add the city only when it is essential.',
      docs_naming_body_2: 'Example: “Copenhagen Film Night: Docu UA”.',
      docs_tags_title: 'Tags and categories (how to create)',
      docs_tags_body_1:
        'Choose the most relevant category and 2–5 tags. Use “Add category” when you need a new one.',
      docs_tags_body_2: 'New tags go to moderation and are marked as pending.',
      docs_past_title: 'What counts as a past event',
      docs_past_body_1:
        'If the event ended, or the start time already passed and no end time is set, it is treated as past.',
      docs_past_body_2: 'Use the “Show past” filter to browse the archive.',
      docs_verification_title: 'Organizer verification',
      docs_verification_body_1:
        'Verification is required to publish events. You can verify by email or submit a website/social link.',
      docs_verification_body_2: 'After review, the organizer status updates to “Verified”.',
      privacy_title: 'Privacy Policy',
      privacy_summary: 'We collect the minimum data needed to run the platform and do not use third-party trackers.',
      privacy_nav_data: 'What data we collect',
      privacy_nav_usage: 'How we use it',
      privacy_nav_storage: 'Storage',
      privacy_nav_contact: 'Contact',
      privacy_data_title: 'What data we collect',
      privacy_data_body:
        'We only store basic event details and organizer contacts that you provide in the forms.',
      privacy_usage_title: 'How we use it',
      privacy_usage_body:
        'Data is used for publishing events, moderation, and contacting organizers. We do not share it with third parties.',
      privacy_storage_title: 'Storage',
      privacy_storage_body:
        'We keep data only as long as needed for the service. You can request removal at any time.',
      privacy_contact_title: 'Contact',
      privacy_contact_body:
        'If you have privacy questions, reach out using the email listed in the contacts section.',
      terms_title: 'Terms of Use',
      terms_summary: 'These terms explain how the platform works and the responsibilities of organizers and visitors.',
      legal_nav_aria: 'Contents',
      terms_nav_rules: 'Core rules',
      terms_nav_content: 'Content and moderation',
      terms_nav_liability: 'Liability',
      terms_nav_contact: 'Contact',
      terms_rules_title: 'Core rules',
      terms_rules_body:
        'Publish only accurate events and respect the community. Spam, discrimination, and unsafe content are not allowed.',
      terms_content_title: 'Content and moderation',
      terms_content_body:
        'We review events before publishing. Moderators can reject events that do not meet the rules.',
      terms_liability_title: 'Liability',
      terms_liability_body:
        'Organizers are responsible for event accuracy and delivery. The platform is not a party to user agreements.',
      terms_contact_title: 'Contact',
      terms_contact_body:
        'For questions about these terms, use the contact form or email.',
      filter_title: 'Catalog',
      catalog_summary: 'Use filters to browse events in a compact list.',
      highlights_title: 'Weekly highlights',
      highlights_prev: 'Prev',
      highlights_next: 'Next',
      highlights_prev_aria: 'Previous highlights',
      highlights_next_aria: 'Next highlights',
      highlights_list_aria: 'Weekly highlights list',
      filters_date: 'Date',
      filters_from: 'From',
      filters_to: 'To',
      filters_today: 'Today',
      filters_tomorrow: 'Tomorrow',
      filters_weekend: 'Weekend',
      filters_online: 'Online',
      filters_location: 'Location & category',
      filters_aria: 'Catalog filters',
      filters_city: 'City',
      filters_all_cities: 'All cities',
      filters_category: 'Category',
      filters_all_categories: 'All categories',
      category_music: 'Music',
      category_networking: 'Networking',
      category_cinema: 'Cinema',
      category_education: 'Education',
      category_kids: 'For kids',
      category_community: 'Community',
      filters_preferences: 'Preferences',
      filters_price: 'Price',
      filters_any_price: 'Any',
      filters_free: 'Free',
      filters_paid: 'Paid',
      price_free: 'Free',
      filters_format: 'Format',
      filters_any_format: 'Any',
      filters_offline: 'Offline',
      filters_audience: 'Audience',
      filters_ua: 'UA',
      filters_family: 'For families',
      filters_volunteer: 'For volunteers',
      filters_past: 'Show past',
      reset_filters: 'Reset filters',
      empty_state: 'No events match your search.',
      similar_cta: 'Similar events',
      error_eyebrow: 'Error',
      error_title: 'We could not load events.',
      error_summary: 'Check your connection and try again.',
      error_retry: 'Try again',
      home_about_title: 'About',
      home_about_summary: 'A quick overview of the platform and moderation approach.',
      home_contact_title: 'Contacts',
      home_contact_summary: 'Reach out if you have questions or want to add an event.',
      found_count: 'Found {count}',
      footer_rights: '© 2024 What’s on DK?. All rights reserved.',
      footer_help: 'Help',
      footer_privacy: 'Privacy Policy',
      footer_terms: 'Terms of Use',
      not_found_title: 'Page not found',
      not_found_summary: 'Check the address or try search — the event might already be here.',
      not_found_search_label: 'Search events',
      not_found_search_placeholder: 'Search by city or topic',
      not_found_search_action: 'Search',
      not_found_help: 'If the issue persists, contact us and we will help you find the right info.',
      not_found_back: 'Back home',
      switch_lang: 'Language',
      meta_index_title: 'What’s on DK? — Events for Ukrainians in Denmark',
      meta_index_desc: 'Discover events for Ukrainians in Denmark: concerts, meetups, education, and online events.',
      meta_event_title: 'Design Systems Meetup — What’s on DK?',
      meta_event_desc: 'Event details, tickets, and location for Design Systems Meetup.',
      meta_org_title: 'Evently Community — What’s on DK?',
      meta_org_desc: 'Organizer profile with upcoming events in Denmark.',
      meta_about_title: 'About — What’s on DK?',
      meta_about_desc: 'Platform mission and moderation principles for events in Denmark.',
      meta_contacts_title: 'Contacts — What’s on DK?',
      meta_contacts_desc: 'Contact details and FAQs about events in Denmark.',
      meta_docs_title: 'Help — What’s on DK?',
      meta_docs_desc: 'Rules for event naming, tags, archive, and verification.',
      meta_privacy_title: 'Privacy Policy — What’s on DK?',
      meta_privacy_desc: 'Minimal data collection and no third-party trackers.',
      meta_terms_title: 'Terms of Use — What’s on DK?',
      meta_terms_desc: 'Platform usage rules and organizer responsibilities.',
      meta_dashboard_title: 'Dashboard — What’s on DK?',
      meta_dashboard_desc: 'Manage events, statuses, and organizer verification.',
      meta_dashboard_new_title: 'Create event — What’s on DK?',
      meta_dashboard_new_desc: 'Step-by-step event creation form.',
      meta_admin_title: 'Moderation — What’s on DK?',
      meta_admin_desc: 'Review new event submissions.',
      meta_not_found_title: '404 — What’s on DK?',
      meta_not_found_desc: 'Page not found. Return home or try search.',
      organizer_location: 'Organizer in Denmark',
      verified_badge: 'Verified',
      verification_email_title: 'Verify by email',
      verification_email_label: 'Verification email',
      verification_email_help: 'We will send a 6-digit code.',
      verification_send_code: 'Send code',
      verification_code_label: 'Verification code',
      verification_code_help: 'Enter the 6 digits from the email.',
      verification_verify_code: 'Confirm code',
      verification_link_title: 'Website or social link',
      verification_link_label: 'Link',
      verification_link_help: 'We will review it manually.',
      verification_link_submit: 'Submit for review',
      verification_pending: 'Pending review',
      verification_note: 'Verification is required to publish events.',
      verification_code_sent: 'Code sent. Check your inbox.',
      verification_success: 'Organizer verified.',
      verification_invalid_code: 'Invalid code. Try again.',
      verification_error: 'Action failed. Please try again.',
      verification_blocked: 'Verify the organizer before publishing the event.',
      verification_banner_text: 'Organizer verification is required to publish the event.',
      verification_banner_action: 'Open verification',
      submit_success: 'Event submitted for moderation.',
      submit_error: 'Failed to submit the event. Please try again.',
      spam_blocked: 'Request rejected. Please try again.',
      verification_spam: 'Request rejected. Please try again.',
      archived_label: 'Archived',
      event_past_banner: 'This event has passed',
      tag_aria: 'Tag: {label}',
      tag_pending_aria: 'Tag: {label}, pending approval',
      category_aria: 'Category: {label}',
      category_pending_aria: 'Category: {label}, pending approval',
      about_title: 'About the project',
      about_tagline: 'A platform for the Ukrainian community in Denmark, connecting events and initiatives.',
      about_mission_title: 'Our mission',
      about_mission_body: 'We help Ukrainians in Denmark find events, support, and new connections.',
      about_submit_title: 'How to submit an event',
      about_submit_body: 'Send your event via the form or email. We review submissions before publishing.',
      about_moderation_title: 'Moderation',
      about_moderation_body: 'We moderate events to keep the community safe and aligned with our guidelines.',
      contacts_title: 'Contacts',
      contacts_tagline: 'Get in touch if you have questions or want to submit an event.',
      contacts_email_title: 'Email',
      contacts_email_body: 'hello@whatsondk.test',
      contacts_faq_title: 'FAQ',
      contacts_faq_q1: 'How do I add an event?',
      contacts_faq_a1: 'Send the event via the form or email and we will review it.',
      contacts_faq_q2: 'Which languages are supported?',
      contacts_faq_a2: 'We publish events in Ukrainian, Danish, or English.',
      contacts_faq_q3: 'Which cities are covered?',
      contacts_faq_a3: 'Copenhagen, Aarhus, Odense, Aalborg, Esbjerg, and online.',
      form_end_label: 'End time',
      form_optional_hint: '(optional)',
      form_contact_legend: 'Contact person',
      form_contact_name: 'Name',
      form_contact_name_help: 'Add a contact name.',
      form_contact_email: 'Email',
      form_contact_email_help: 'For example: name@example.com.',
      form_contact_phone: 'Phone',
      form_contact_phone_help: 'Format: +45 12 34 56 78.',
      event_contact_title: 'Contacts',
      event_contact_name: 'Name',
      event_contact_email_label: 'Email',
      event_contact_phone_label: 'Phone',
      form_category_label: 'Category',
      form_add_category: 'Add category',
      form_category_modal_title: 'New category',
      form_category_input_label: 'Category name',
      form_category_help: 'A moderator will review the category.',
      form_category_cancel: 'Cancel',
      form_category_submit: 'Submit for approval',
      form_tags_label: 'Tags',
      form_tags_help: 'Press Enter to add a tag.',
      form_tags_input_label: 'Add tag',
      pending_label: '(pending)',
      pending_tooltip: 'Pending approval',
      remove_tag_label: 'Remove tag {tag}'
    },
    da: {
      title_home: 'Begivenheder for ukrainere i Danmark',
      tagline: 'Koncerter, møder og læring — i byer i Danmark og online.',
      hero_eyebrow: 'Kommende oplevelser',
      nav_events: 'Begivenheder',
      nav_organizers: 'Arrangører',
      nav_about: 'Om',
      nav_contacts: 'Kontakt',
      nav_dashboard: 'Dashboard',
      skip_link: 'Spring til indhold',
      nav_toggle: 'Skift navigation',
      nav_primary_aria: 'Primær navigation',
      brand_aria: 'Platformens brand',
      lang_switch_aria: 'Sprog',
      theme_toggle_aria: 'Skift tema',
      theme_light: 'Lys',
      theme_dark: 'Mørk',
      back_to_catalog: 'Tilbage til katalog',
      back_to_dashboard: 'Tilbage til dashboard',
      search_placeholder: 'Søg efter by, tema eller dato',
      presets: {
        today: 'I dag',
        tomorrow: 'I morgen',
        weekend: 'Weekend',
        online: 'Online'
      },
      search_label: 'Søg efter events',
      search_help: 'For eksempel: København, musik eller weekend.',
      cta_explore: 'Se begivenheder',
      cta_add_event: 'Tilføj begivenhed',
      home_link: 'Forside',
      cta_details: 'Detaljer',
      ticket_cta: 'Billetter',
      register_cta: 'Tilmelding',
      dashboard_create_cta: 'Opret event',
      dashboard_tab_events: 'Mine events',
      dashboard_tab_create: 'Opret event',
      dashboard_tab_settings: 'Indstillinger',
      dashboard_eyebrow: 'Arrangørens arbejdsområde',
      dashboard_title: 'Dashboard',
      dashboard_tabs_aria: 'Dashboard-sektioner',
      dashboard_events_summary: 'Administrer dine kladder og publicerede events.',
      dashboard_table_aria: 'Eventstatus tabel',
      dashboard_table_event: 'Event',
      dashboard_table_date: 'Dato',
      dashboard_table_status: 'Status',
      dashboard_table_actions: 'Handlinger',
      dashboard_status_published: 'Publiceret',
      dashboard_status_pending: 'Afventer',
      dashboard_status_draft: 'Kladde',
      dashboard_action_view: 'Se',
      dashboard_action_edit: 'Rediger',
      dashboard_action_continue: 'Fortsæt',
      dashboard_empty_eyebrow: 'Ingen kommende events',
      dashboard_empty_title: 'Begynd at planlægge dit næste event.',
      dashboard_empty_summary: 'Opret en kladde for at holde styr på idéer.',
      dashboard_settings_summary: 'Konfigurer arrangørens profil og bekræftelse.',
      admin_eyebrow: 'Administratorens arbejdsområde',
      admin_title: 'Moderationskø',
      admin_pending_title: 'Afventende events',
      admin_pending_summary: 'Gennemgå nye indsendelser og udgiv dem.',
      admin_status_pending: 'Afventer',
      admin_action_approve: 'Godkend',
      admin_action_reject: 'Afvis',
      admin_modal_title: 'Afvis event',
      admin_modal_help: 'Angiv en kort begrundelse for afvisning.',
      admin_modal_reason_label: 'Begrundelse',
      admin_modal_cancel: 'Annuller',
      admin_modal_reject: 'Afvis',
      create_event_eyebrow: 'Opret nyt event',
      stepper_aria: 'Trin til eventoprettelse',
      step_basic: '1. Grundlæggende',
      step_time: '2. Tid og sted',
      step_tickets: '3. Billetter',
      step_media: '4. Medier',
      step_preview: '5. Forhåndsvisning',
      form_title_label: 'Eventtitel',
      form_title_help: 'Minimum 3 tegn.',
      form_category_placeholder: 'Vælg kategori',
      form_category_music: 'Musik',
      form_category_food: 'Mad',
      form_category_sport: 'Sport',
      form_category_tech: 'Tech',
      form_tags_placeholder: 'design',
      form_start_label: 'Start',
      form_start_help: 'Brug lokal tid.',
      form_format_label: 'Format',
      form_format_placeholder: 'Vælg format',
      form_format_offline: 'Offline',
      form_format_online: 'Online',
      form_address_label: 'Adresse',
      form_address_placeholder: 'København, Main St 10',
      form_address_help: 'For online events, angiv platformen.',
      form_ticket_type_label: 'Billet-type',
      form_ticket_free: 'Gratis',
      form_ticket_paid: 'Betalt',
      form_price_min: 'Minimumspris',
      form_price_max: 'Maksimumspris',
      form_ticket_url: 'Eksternt billetlink',
      form_ticket_help: 'Valgfrit.',
      form_image_label: 'Eventbillede',
      form_image_alt_label: 'Alt-tekst',
      form_image_alt_placeholder: 'Billedbeskrivelse',
      form_image_alt_help: 'For eksempel: en scene med lys.',
      preview_title: 'Titel',
      preview_category: 'Kategori',
      preview_tags: 'Tags',
      preview_time: 'Tid',
      preview_location: 'Sted',
      preview_tickets: 'Billetter',
      preview_format: 'Format',
      form_submit_moderation: 'Send til moderation',
      form_back: 'Tilbage',
      form_next: 'Næste',
      required_label: 'Påkrævet',
      event_eyebrow: 'Design og produkt',
      event_description_title: 'Beskrivelse',
      event_description_body:
        'Et community-møde om skalerbare design systemer. Vi gennemgår cases, holder workshop og mødes med andre.',
      event_where_title: 'Hvor',
      event_map_placeholder: 'Kort-placering',
      event_language_title: 'Event-sprog',
      event_language_value: 'uk / en',
      event_tags_title: 'Tags',
      event_organizer_title: 'Arrangør',
      event_share_title: 'Del',
      event_share_facebook: 'Facebook',
      event_share_x: 'X',
      event_share_linkedin: 'LinkedIn',
      event_ticket_note: 'Køb billetter (DKK 350–520)',
      ticket_panel_aria: 'Billetpanel',
      organizer_meta: 'Non-profit meetup fællesskab',
      organizer_contact_email: 'Email',
      organizer_contact_phone: 'Telefon',
      organizer_contact_website: 'Website',
      organizer_logo_placeholder: 'Logo',
      organizer_description:
        'Non-profit fællesskab, der afholder events for designere, skabere og community-ledere.',
      organizer_events_title: 'Events',
      organizer_events_summary: 'Seneste events arrangeret af denne arrangør.',
      docs_title: 'Hjælp og regler',
      docs_summary: 'Korte svar om moderation, navngivning og arrangørbekræftelse.',
      docs_nav_aria: 'Indholdsfortegnelse',
      docs_nav_naming: 'Regler for eventnavne',
      docs_nav_tags: 'Tags og kategorier (sådan opretter du)',
      docs_nav_past: 'Hvad tæller som et tidligere event',
      docs_nav_verification: 'Arrangørbekræftelse',
      docs_naming_title: 'Regler for eventnavne',
      docs_naming_body_1:
        'Hold titler korte, undgå versaler og ekstra symboler. Tilføj by kun når det er vigtigt.',
      docs_naming_body_2: 'Eksempel: “København Filmaften: Docu UA”.',
      docs_tags_title: 'Tags og kategorier (sådan opretter du)',
      docs_tags_body_1:
        'Vælg den mest relevante kategori og 2–5 tags. Brug “Tilføj kategori” når du mangler en.',
      docs_tags_body_2: 'Nye tags sendes til moderation og markeres som afventende.',
      docs_past_title: 'Hvad tæller som et tidligere event',
      docs_past_body_1:
        'Hvis eventet er slut, eller starttidspunktet allerede er passeret og slutdato ikke er angivet, regnes det som tidligere.',
      docs_past_body_2: 'Brug filteret “Vis tidligere” for at se arkivet.',
      docs_verification_title: 'Arrangørbekræftelse',
      docs_verification_body_1:
        'Bekræftelse kræves for at udgive events. Du kan bekræfte via email eller indsende en hjemmeside/socialt link.',
      docs_verification_body_2: 'Efter gennemgang opdateres status til “Bekræftet”.',
      privacy_title: 'Privatlivspolitik',
      privacy_summary: 'Vi indsamler kun de data, der er nødvendige for platformen, og bruger ingen tredjeparts-trackere.',
      privacy_nav_data: 'Hvilke data vi indsamler',
      privacy_nav_usage: 'Hvordan vi bruger dem',
      privacy_nav_storage: 'Opbevaring',
      privacy_nav_contact: 'Kontakt',
      privacy_data_title: 'Hvilke data vi indsamler',
      privacy_data_body:
        'Vi gemmer kun grundlæggende eventoplysninger og arrangørkontakter, som du selv udfylder i formularerne.',
      privacy_usage_title: 'Hvordan vi bruger dem',
      privacy_usage_body:
        'Data bruges til publicering, moderation og kontakt med arrangører. Vi deler dem ikke med tredjepart.',
      privacy_storage_title: 'Opbevaring',
      privacy_storage_body:
        'Vi opbevarer data kun så længe, det er nødvendigt for tjenesten. Du kan anmode om sletning.',
      privacy_contact_title: 'Kontakt',
      privacy_contact_body:
        'Har du spørgsmål om privatliv, så skriv til os via emailen i kontaktsektionen.',
      terms_title: 'Vilkår',
      terms_summary: 'Disse vilkår beskriver brugen af platformen og ansvar for arrangører og besøgende.',
      legal_nav_aria: 'Indhold',
      terms_nav_rules: 'Grundregler',
      terms_nav_content: 'Indhold og moderation',
      terms_nav_liability: 'Ansvar',
      terms_nav_contact: 'Kontakt',
      terms_rules_title: 'Grundregler',
      terms_rules_body:
        'Publicér kun korrekte events og respekter fællesskabet. Spam, diskrimination og farligt indhold er ikke tilladt.',
      terms_content_title: 'Indhold og moderation',
      terms_content_body:
        'Vi gennemgår events før publicering. Moderatorer kan afvise events, der ikke følger reglerne.',
      terms_liability_title: 'Ansvar',
      terms_liability_body:
        'Arrangører er ansvarlige for eventinfo og afvikling. Platformen er ikke part i aftaler mellem brugere.',
      terms_contact_title: 'Kontakt',
      terms_contact_body:
        'Har du spørgsmål til vilkår, kontakt os via formularen eller email.',
      filter_title: 'Katalog',
      catalog_summary: 'Brug filtre til at se begivenheder i en kompakt liste.',
      highlights_title: 'Ugens højdepunkter',
      highlights_prev: 'Tilbage',
      highlights_next: 'Næste',
      highlights_prev_aria: 'Forrige højdepunkter',
      highlights_next_aria: 'Næste højdepunkter',
      highlights_list_aria: 'Liste med ugens højdepunkter',
      filters_date: 'Dato',
      filters_from: 'Fra',
      filters_to: 'Til',
      filters_today: 'I dag',
      filters_tomorrow: 'I morgen',
      filters_weekend: 'Weekend',
      filters_online: 'Online',
      filters_location: 'Sted og kategori',
      filters_aria: 'Katalogfiltre',
      filters_city: 'By',
      filters_all_cities: 'Alle byer',
      filters_category: 'Kategori',
      filters_all_categories: 'Alle kategorier',
      category_music: 'Musik',
      category_networking: 'Networking',
      category_cinema: 'Film',
      category_education: 'Uddannelse',
      category_kids: 'For børn',
      category_community: 'Fællesskab',
      filters_preferences: 'Indstillinger',
      filters_price: 'Pris',
      filters_any_price: 'Alle',
      filters_free: 'Gratis',
      filters_paid: 'Betalt',
      price_free: 'Gratis',
      filters_format: 'Format',
      filters_any_format: 'Alle',
      filters_offline: 'Offline',
      filters_audience: 'Målgruppe',
      filters_ua: 'UA',
      filters_family: 'For familier',
      filters_volunteer: 'For frivillige',
      filters_past: 'Vis tidligere',
      reset_filters: 'Nulstil filtre',
      empty_state: 'Ingen begivenheder matcher din søgning.',
      similar_cta: 'Lignende begivenheder',
      error_eyebrow: 'Fejl',
      error_title: 'Vi kunne ikke hente events.',
      error_summary: 'Tjek forbindelsen og prøv igen.',
      error_retry: 'Prøv igen',
      home_about_title: 'Om',
      home_about_summary: 'En kort oversigt over platformen og moderationen.',
      home_contact_title: 'Kontakt',
      home_contact_summary: 'Kontakt os, hvis du har spørgsmål eller vil tilføje en begivenhed.',
      found_count: 'Fundet {count}',
      footer_rights: '© 2024 What’s on DK?. Alle rettigheder forbeholdes.',
      footer_help: 'Hjælp',
      footer_privacy: 'Privatlivspolitik',
      footer_terms: 'Vilkår',
      not_found_title: 'Siden blev ikke fundet',
      not_found_summary: 'Tjek adressen eller brug søgning — måske er eventet allerede her.',
      not_found_search_label: 'Søg events',
      not_found_search_placeholder: 'Søg efter by eller emne',
      not_found_search_action: 'Søg',
      not_found_help: 'Hvis problemet fortsætter, så kontakt os — vi hjælper dig gerne.',
      not_found_back: 'Tilbage til forsiden',
      switch_lang: 'Sprog',
      meta_index_title: 'What’s on DK? — Events for ukrainere i Danmark',
      meta_index_desc: 'Find events for ukrainere i Danmark: koncerter, møder, læring og online events.',
      meta_event_title: 'Design Systems Meetup — What’s on DK?',
      meta_event_desc: 'Eventdetaljer, billetter og lokation for Design Systems Meetup.',
      meta_org_title: 'Evently Community — What’s on DK?',
      meta_org_desc: 'Arrangørprofil med kommende events i Danmark.',
      meta_about_title: 'Om — What’s on DK?',
      meta_about_desc: 'Platformens mission og moderationsprincipper for events i Danmark.',
      meta_contacts_title: 'Kontakt — What’s on DK?',
      meta_contacts_desc: 'Kontaktoplysninger og FAQ om events i Danmark.',
      meta_docs_title: 'Hjælp — What’s on DK?',
      meta_docs_desc: 'Regler for eventnavne, tags, arkiv og bekræftelse.',
      meta_privacy_title: 'Privatlivspolitik — What’s on DK?',
      meta_privacy_desc: 'Minimal dataindsamling og ingen tredjeparts-trackere.',
      meta_terms_title: 'Vilkår — What’s on DK?',
      meta_terms_desc: 'Regler for platformen og arrangøransvar.',
      meta_dashboard_title: 'Dashboard — What’s on DK?',
      meta_dashboard_desc: 'Administrer events, status og arrangørbekræftelse.',
      meta_dashboard_new_title: 'Opret event — What’s on DK?',
      meta_dashboard_new_desc: 'Trinvis oprettelse af event.',
      meta_admin_title: 'Moderation — What’s on DK?',
      meta_admin_desc: 'Gennemgå nye eventindsendelser.',
      meta_not_found_title: '404 — What’s on DK?',
      meta_not_found_desc: 'Siden blev ikke fundet. Gå til forsiden eller søg.',
      organizer_location: 'Arrangør i Danmark',
      verified_badge: 'Bekræftet',
      verification_email_title: 'Bekræft via email',
      verification_email_label: 'Email til bekræftelse',
      verification_email_help: 'Vi sender en 6-cifret kode.',
      verification_send_code: 'Send kode',
      verification_code_label: 'Bekræftelseskode',
      verification_code_help: 'Indtast de 6 cifre fra emailen.',
      verification_verify_code: 'Bekræft kode',
      verification_link_title: 'Website eller sociale medier',
      verification_link_label: 'Link',
      verification_link_help: 'Vi gennemgår den manuelt.',
      verification_link_submit: 'Send til gennemgang',
      verification_pending: 'Afventer godkendelse',
      verification_note: 'Bekræftelse kræves for at udgive events.',
      verification_code_sent: 'Koden er sendt. Tjek din indbakke.',
      verification_success: 'Arrangøren er bekræftet.',
      verification_invalid_code: 'Ugyldig kode. Prøv igen.',
      verification_error: 'Handling mislykkedes. Prøv igen senere.',
      verification_blocked: 'Bekræft arrangøren før du udgiver eventet.',
      verification_banner_text: 'Arrangørbekræftelse kræves for at udgive eventet.',
      verification_banner_action: 'Åbn bekræftelse',
      submit_success: 'Eventet er sendt til moderation.',
      submit_error: 'Kunne ikke sende eventet. Prøv igen.',
      spam_blocked: 'Anmodning afvist. Prøv igen.',
      verification_spam: 'Anmodning afvist. Prøv igen.',
      archived_label: 'Arkiveret',
      event_past_banner: 'Denne begivenhed er allerede afholdt',
      tag_aria: 'Tag: {label}',
      tag_pending_aria: 'Tag: {label}, afventer godkendelse',
      category_aria: 'Kategori: {label}',
      category_pending_aria: 'Kategori: {label}, afventer godkendelse',
      about_title: 'Om projektet',
      about_tagline: 'En platform for det ukrainske fællesskab i Danmark med events og initiativer.',
      about_mission_title: 'Vores mission',
      about_mission_body: 'Vi hjælper ukrainere i Danmark med at finde events, støtte og nye forbindelser.',
      about_submit_title: 'Sådan indsender du et event',
      about_submit_body: 'Send dit event via formularen eller email. Vi gennemgår før offentliggørelse.',
      about_moderation_title: 'Moderation',
      about_moderation_body: 'Vi modererer events for at sikre kvalitet og sikkerhed i fællesskabet.',
      contacts_title: 'Kontakt',
      contacts_tagline: 'Kontakt os, hvis du har spørgsmål eller vil indsende et event.',
      contacts_email_title: 'Email',
      contacts_email_body: 'hello@whatsondk.test',
      contacts_faq_title: 'FAQ',
      contacts_faq_q1: 'Hvordan tilføjer jeg et event?',
      contacts_faq_a1: 'Send eventet via formularen eller email, så gennemgår vi det.',
      contacts_faq_q2: 'Hvilke sprog understøttes?',
      contacts_faq_a2: 'Vi publicerer events på ukrainsk, dansk eller engelsk.',
      contacts_faq_q3: 'Hvilke byer dækker I?',
      contacts_faq_a3: 'København, Aarhus, Odense, Aalborg, Esbjerg og online.',
      form_end_label: 'Sluttidspunkt',
      form_optional_hint: '(valgfrit)',
      form_contact_legend: 'Kontaktperson',
      form_contact_name: 'Navn',
      form_contact_name_help: 'Angiv kontaktpersonens navn.',
      form_contact_email: 'Email',
      form_contact_email_help: 'For eksempel: name@example.com.',
      form_contact_phone: 'Telefon',
      form_contact_phone_help: 'Format: +45 12 34 56 78.',
      event_contact_title: 'Kontakt',
      event_contact_name: 'Navn',
      event_contact_email_label: 'Email',
      event_contact_phone_label: 'Telefon',
      form_category_label: 'Kategori',
      form_add_category: 'Tilføj kategori',
      form_category_modal_title: 'Ny kategori',
      form_category_input_label: 'Kategorinavn',
      form_category_help: 'En moderator gennemgår kategorien.',
      form_category_cancel: 'Annuller',
      form_category_submit: 'Send til godkendelse',
      form_tags_label: 'Tags',
      form_tags_help: 'Tryk Enter for at tilføje et tag.',
      form_tags_input_label: 'Tilføj tag',
      pending_label: '(afventer)',
      pending_tooltip: 'Afventer godkendelse',
      remove_tag_label: 'Fjern tag {tag}'
    }
  };

  const getDictionary = (lang) => translations[lang] || translations.uk;

  let refreshVerificationUI = () => {};
  let updatePublishState = () => {};
  let updateStaticTagAria = () => {};
  let updateCatalogI18n = () => {};

  const applyTranslations = (lang) => {
    const dictionary = getDictionary(lang);
    document.documentElement.lang = lang;
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
    langButtons.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.lang === lang));
    });

    const localeMap = {
      uk: 'uk_UA',
      en: 'en_US',
      da: 'da_DK'
    };
    const locale = localeMap[lang] || 'uk_UA';
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
                    : path.includes('dashboard-new')
                      ? 'dashboard_new'
                      : path.includes('dashboard')
                        ? 'dashboard'
                        : path.includes('admin')
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

  const formatMessage = (key, replacements) => {
    const dictionary = getDictionary(document.documentElement.lang || 'uk');
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
      const key = tag.dataset.tagType === 'category'
        ? isPending
          ? 'category_pending_aria'
          : 'category_aria'
        : isPending
          ? 'tag_pending_aria'
          : 'tag_aria';
      tag.setAttribute('aria-label', formatMessage(key, { label }));
    });
  };

  const VERIFICATION_KEY = 'organizerVerification';

  const getVerificationState = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(VERIFICATION_KEY) || '{}');
      return {
        emailVerified: Boolean(stored.emailVerified),
        websitePending: Boolean(stored.websitePending)
      };
    } catch (error) {
      return { emailVerified: false, websitePending: false };
    }
  };

  const saveVerificationState = (state) => {
    try {
      localStorage.setItem(VERIFICATION_KEY, JSON.stringify(state));
    } catch (error) {
      return;
    }
  };

  const isOrganizerVerified = (state) => state.emailVerified || state.websitePending;

  const formatDateTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const parts = new Intl.DateTimeFormat('da-DK', {
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
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const parts = new Intl.DateTimeFormat('da-DK', {
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

  const getStoredLang = () => {
    try {
      return localStorage.getItem('lang');
    } catch (error) {
      return null;
    }
  };

  const setStoredLang = (lang) => {
    try {
      localStorage.setItem('lang', lang);
    } catch (error) {
      return;
    }
  };

  const params = new URLSearchParams(window.location.search);
  const urlLang = params.get('lang');
  const initialLang = urlLang || getStoredLang() || 'uk';
  applyTranslations(initialLang);
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
      const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      const next = current === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', next);
      applyTheme(next);
    });
  }

  if (langButtons.length) {
    langButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const lang = button.dataset.lang || 'uk';
        setStoredLang(lang);
        applyTranslations(lang);
        const nextParams = new URLSearchParams(window.location.search);
        nextParams.set('lang', lang);
        const nextUrl = `${window.location.pathname}?${nextParams.toString()}`;
        window.history.pushState({}, '', nextUrl);
      });
    });
  }

  const verificationSection = document.querySelector('[data-verification]');
  const verificationStatus = verificationSection
    ? verificationSection.querySelector('.verification__status')
    : null;
  const verificationHoneypot = verificationSection
    ? verificationSection.querySelector('input[name="website"]')
    : null;
  const emailInput = verificationSection
    ? verificationSection.querySelector('input[name="verification-email"]')
    : null;
  const sendCodeButton = verificationSection
    ? verificationSection.querySelector('[data-action="send-code"]')
    : null;
  const codeWrap = verificationSection ? verificationSection.querySelector('.verification__code') : null;
  const codeInput = verificationSection
    ? verificationSection.querySelector('input[name="verification-code"]')
    : null;
  const verifyCodeButton = verificationSection
    ? verificationSection.querySelector('[data-action="verify-code"]')
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
  let pendingCode = null;

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
      verificationPending.hidden = !state.websitePending;
    }
  };

  refreshVerificationUI = () => {
    const state = getVerificationState();
    applyVerificationState(state);
    if (verificationStatusKey) {
      setVerificationStatus(verificationStatusKey, verificationStatus?.classList.contains('is-error'));
    }
    updatePublishState();
  };

  if (verificationSection) {
    const state = getVerificationState();
    applyVerificationState(state);
    if (sendCodeButton && emailInput) {
      sendCodeButton.addEventListener('click', async () => {
        try {
          if (!emailInput.checkValidity()) {
            emailInput.reportValidity();
            return;
          }
          if (verificationHoneypot && verificationHoneypot.value.trim()) {
            setVerificationStatus('verification_spam', true);
            return;
          }
          const response = await fetch('/.netlify/functions/send-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: emailInput.value,
              website: verificationHoneypot ? verificationHoneypot.value : ''
            })
          });
          if (response.ok) {
            const result = await response.json();
            pendingCode = result?.code || '123456';
          } else {
            pendingCode = '123456';
          }
          if (codeWrap) {
            codeWrap.hidden = false;
          }
          setVerificationStatus('verification_code_sent', false);
        } catch (error) {
          pendingCode = '123456';
          if (codeWrap) {
            codeWrap.hidden = false;
          }
          setVerificationStatus('verification_code_sent', false);
        }
      });
    }

    if (verifyCodeButton && codeInput) {
      verifyCodeButton.addEventListener('click', () => {
        try {
          if (!codeInput.checkValidity()) {
            codeInput.reportValidity();
            return;
          }
          if (!pendingCode || codeInput.value !== pendingCode) {
            setVerificationStatus('verification_invalid_code', true);
            return;
          }
          const nextState = { ...getVerificationState(), emailVerified: true };
          saveVerificationState(nextState);
          applyVerificationState(nextState);
          setVerificationStatus('verification_success', false);
          pendingCode = null;
          codeInput.value = '';
          updatePublishState();
        } catch (error) {
          setVerificationStatus('verification_error', true);
        }
      });
    }

    if (linkSubmitButton && linkInput) {
      linkSubmitButton.addEventListener('click', () => {
        try {
          if (!linkInput.checkValidity()) {
            linkInput.reportValidity();
            return;
          }
          const nextState = { ...getVerificationState(), websitePending: true };
          saveVerificationState(nextState);
          applyVerificationState(nextState);
          setVerificationStatus('verification_pending', false);
          updatePublishState();
        } catch (error) {
          setVerificationStatus('verification_error', true);
        }
      });
    }
  }
  refreshVerificationUI();

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

  if (multiStepForm) {
    const steps = Array.from(multiStepForm.querySelectorAll('.form-step'));
    const stepperItems = Array.from(document.querySelectorAll('.stepper__item'));
    const nextButton = multiStepForm.querySelector('[data-action="next"]');
    const backButton = multiStepForm.querySelector('[data-action="back"]');
    const previewTitle = document.querySelector('#preview-title');
    const previewCategory = document.querySelector('#preview-category');
    const previewTags = document.querySelector('#preview-tags');
    const previewTime = document.querySelector('#preview-time');
    const previewLocation = document.querySelector('#preview-location');
    const previewTickets = document.querySelector('#preview-tickets');
    const previewFormat = document.querySelector('#preview-format');
    const categorySelect = multiStepForm.querySelector('select[name="category"]');
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
      if (index === steps.length - 1) {
        updatePreview();
      }
    };

    const getFieldValue = (name) => {
      const field = multiStepForm.elements[name];
      if (!field) return '';
      if (field instanceof RadioNodeList) {
        return field.value;
      }
      return field.value;
    };

    const updatePreview = () => {
      const pendingLabel = formatMessage('pending_label', {});
      const pendingTooltip = formatMessage('pending_tooltip', {});
      if (previewTitle) {
        previewTitle.textContent = getFieldValue('title') || '—';
      }
      if (previewCategory) {
        const value = getFieldValue('category');
        const isPending = pendingCategories.has(value);
        previewCategory.textContent = value
          ? `${value}${isPending ? ` ${pendingLabel}` : ''}`
          : '—';
        if (previewCategory && isPending) {
          previewCategory.setAttribute('title', pendingTooltip);
        } else if (previewCategory) {
          previewCategory.removeAttribute('title');
        }
      }
      if (previewTags) {
        const tags = Array.from(pendingTags);
        previewTags.textContent = tags.length ? `${tags.join(', ')} ${pendingLabel}` : '—';
        if (tags.length) {
          previewTags.setAttribute('title', pendingTooltip);
        } else {
          previewTags.removeAttribute('title');
        }
      }
      if (previewTime) {
        const start = getFieldValue('start');
        const end = getFieldValue('end');
        previewTime.textContent = start ? (end ? `${start} → ${end}` : start) : '—';
      }
      if (previewLocation) {
        previewLocation.textContent = getFieldValue('address') || '—';
      }
      if (previewTickets) {
        const ticketType = getFieldValue('ticket-type') || '—';
        const minPrice = getFieldValue('price-min');
        const maxPrice = getFieldValue('price-max');
        const priceLabel = minPrice || maxPrice ? `${minPrice || '0'}–${maxPrice || '∞'}` : '—';
        previewTickets.textContent = `${ticketType}${ticketType !== '—' ? ` · ${priceLabel}` : ''}`;
      }
      if (previewFormat) {
        previewFormat.textContent = getFieldValue('format') || '—';
      }
    };

    const renderTagChips = () => {
      if (!tagsList || !tagsHidden) return;
      const pendingLabel = formatMessage('pending_label', {});
      const pendingTooltip = formatMessage('pending_tooltip', {});
      tagsList.innerHTML = Array.from(pendingTags)
        .map((tag) => {
          const removeLabel = formatMessage('remove_tag_label', { tag });
          return `
            <span class="tags-input__chip pending" title="${pendingTooltip}" aria-label="${tag} ${pendingLabel}">
              ${tag}
              <span class="tags-input__pending">${pendingLabel}</span>
              <button type="button" data-tag="${tag}" aria-label="${removeLabel}">&times;</button>
            </span>
          `;
        })
        .join('');
      tagsHidden.value = Array.from(pendingTags).join(', ');
    };


    if (tagsInput && tagsList) {
      tagsInput.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        const value = tagsInput.value.trim();
        if (!value) return;
        const normalized = value.toLowerCase();
        const hasTag = Array.from(pendingTags).some((tag) => tag.toLowerCase() === normalized);
        if (hasTag) {
          tagsInput.value = '';
          return;
        }
        pendingTags.add(value);
        tagsInput.value = '';
        renderTagChips();
        updatePreview();
      });

      tagsList.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const tag = target.dataset.tag;
        if (!tag) return;
        pendingTags.forEach((existing) => {
          if (existing === tag) {
            pendingTags.delete(existing);
          }
        });
        renderTagChips();
        updatePreview();
      });
    }

    const validateStep = () => {
      const activeStep = steps[currentStep];
      if (!activeStep) return true;
      const fields = Array.from(activeStep.querySelectorAll('input, select, textarea'));
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
      if (verification.emailVerified) return 'email_verified';
      if (verification.websitePending) return 'pending_manual';
      return organizerStatus;
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
          updatePublishState();
        }
      } catch (error) {
        return;
      }
    };

    setStep(currentStep);
    renderTagChips();
    updatePublishState = () => {
      const verified = getEffectiveOrganizerStatus() !== 'none';
      if (publishButton) {
        publishButton.disabled = !verified;
      }
      if (verificationWarning) {
        verificationWarning.hidden = verified;
      }
      if (verificationBanner) {
        verificationBanner.hidden = verified;
      }
    };
    updatePublishState();
    loadOrganizerStatus();

    if (verificationBannerButton) {
      verificationBannerButton.addEventListener('click', () => {
        window.location.href = 'dashboard.html#settings';
      });
    }

    if (nextButton) {
      nextButton.addEventListener('click', () => {
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
        statusField.value = 'pending';
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
        const response = await fetch('/.netlify/functions/submit-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          throw new Error('Submit failed');
        }
        const result = await response.json();
        if (!result?.ok) {
          throw new Error('Submit failed');
        }
        if (submitStatus) {
          submitStatus.textContent = formatMessage('submit_success', {});
        }
      } catch (error) {
        if (submitStatus) {
          submitStatus.textContent = formatMessage('submit_error', {});
        }
      }
    });
  }

  if (moderationList && modal) {
    const modalDialog = modal.querySelector('.modal__dialog');
    const modalTextarea = modal.querySelector('textarea[name="reject-reason"]');
    const modalCloseButtons = modal.querySelectorAll('[data-modal-close]');
    const modalConfirm = modal.querySelector('[data-modal-confirm]');
    let activeCard = null;
    let lastTrigger = null;

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

    const updateStatus = (card, status, reason) => {
      const statusPill = card.querySelector('.status-pill');
      const reasonText = card.querySelector('.moderation-card__reason');
      if (!statusPill) return;
      statusPill.textContent = status;
      statusPill.classList.remove('status-pill--pending', 'status-pill--published', 'status-pill--draft');
      if (status === 'Approved') {
        statusPill.classList.add('status-pill--published');
        if (reasonText) {
          reasonText.hidden = true;
        }
      } else if (status === 'Rejected') {
        statusPill.classList.add('status-pill--draft');
        if (reasonText) {
          reasonText.hidden = false;
          reasonText.textContent = reason ? `Reason: ${reason}` : 'Reason: —';
        }
      }
    };

    moderationList.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const card = target.closest('.moderation-card');
      if (!card) return;
      if (target.dataset.action === 'approve') {
        updateStatus(card, 'Approved');
      }
      if (target.dataset.action === 'reject') {
        openModal(target, card);
      }
    });

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
        updateStatus(activeCard, 'Rejected', modalTextarea.value.trim());
        closeModal();
      });
    }

    modal.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal();
        return;
      }
      if (event.key !== 'Tab' || !modalDialog) return;
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
  }

  if (catalogGrid) {
    const filtersForm = document.querySelector('.filters');
    const resultsCount = document.querySelector('.filters__count');
    const emptyState = document.querySelector('.catalog-empty');
    const errorState = document.querySelector('.catalog-error');
    const loadMoreButton = document.querySelector('.load-more__button');
    const searchInput = document.querySelector('#event-search');
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
    let events = [];
    let filteredEvents = [];
    let visibleCount = 0;
    const pageSize = 12;

    const formatPrice = (event) => {
      if (event.priceType === 'free') {
        return { label: formatPriceLabel('free'), className: 'event-card__price--free' };
      }
      return {
        label: formatPriceLabel(event.priceType, event.priceMin, event.priceMax),
        className: 'event-card__price--paid'
      };
    };

    const normalize = (value) => String(value || '').toLowerCase();

    const getTagLabel = (tag) => (typeof tag === 'string' ? tag : tag?.label || '');
    const getTagStatus = (tag) => (typeof tag === 'string' ? 'approved' : tag?.status || 'approved');
    const getTagList = (tags) =>
      (tags || [])
        .map((tag) => ({ label: getTagLabel(tag), status: getTagStatus(tag) }))
        .filter((tag) => tag.label);

    const buildCard = (event) => {
      const image = event.images && event.images.length ? event.images[0] : '';
      const priceInfo = formatPrice(event);
      const isFree = event.priceType === 'free';
      const pastEvent = isPast(event);
      const cardClass = `event-card ${isFree ? 'event-card--free' : 'event-card--paid'}${
        pastEvent ? ' event-card--archived' : ''
      }`;
      const freeLabel = formatMessage('price_free', {});
      const badgeMarkup = isFree
        ? `<span class="event-card__badge">${freeLabel}</span>`
        : '';
      const archivedLabel = formatMessage('archived_label', {});
      const archivedMarkup = pastEvent
        ? `<span class="event-card__status" aria-label="${archivedLabel}">${archivedLabel}</span>`
        : '';
      const pendingLabel = formatMessage('pending_label', {});
      const pendingTooltip = formatMessage('pending_tooltip', {});
      const buildTag = (tag, type = 'tag') => {
        const isPending = tag.status === 'pending';
        const pendingClass = isPending ? ' event-card__tag--pending' : '';
        const ariaKey =
          type === 'category'
            ? isPending
              ? 'category_pending_aria'
              : 'category_aria'
            : isPending
              ? 'tag_pending_aria'
              : 'tag_aria';
        const ariaLabel = formatMessage(ariaKey, { label: tag.label });
        const pendingAttrs = isPending ? ` title="${pendingTooltip}"` : '';
        return `<span class="event-card__tag${pendingClass}" aria-label="${ariaLabel}" data-tag-label="${tag.label}" data-tag-type="${type}"${pendingAttrs}>${tag.label}</span>`;
      };
      const baseTags = getTagList(event.tags);
      const categoryTag = event.category?.label
        ? { label: event.category.label, status: event.category.status || 'approved' }
        : null;
      const tags = [
        ...(categoryTag ? [buildTag(categoryTag, 'category')] : []),
        ...baseTags.map((tag) => buildTag(tag, 'tag'))
      ].join('');
      const ticketKey = event.priceType === 'free' ? 'register_cta' : 'ticket_cta';
      const ticketLabel = formatMessage(ticketKey, {});
      const ticketUrl = event.ticketUrl ? event.ticketUrl : 'event.html';
      const location = `${event.city} · ${event.venue}`;
      return `\n        <article class=\"${cardClass}\" data-event-id=\"${event.id}\" data-status=\"${pastEvent ? 'archived' : 'active'}\" data-testid=\"event-card\">\n          ${badgeMarkup}\n          ${archivedMarkup}\n          <img class=\"event-card__image\" src=\"${image}\" alt=\"${event.title}\" loading=\"lazy\" width=\"800\" height=\"540\" />\n          <div class=\"event-card__body\">\n            <div class=\"event-card__meta\">\n              <span class=\"event-card__datetime\">${formatDateRange(event.start, event.end)}</span>\n              <span class=\"event-card__price ${priceInfo.className}\">${priceInfo.label}</span>\n            </div>\n            <h3 class=\"event-card__title\">\n              <a class=\"event-card__link\" href=\"event.html\">${event.title}</a>\n            </h3>\n            <p class=\"event-card__location\">${location}</p>\n            <div class=\"event-card__tags\">\n              ${tags}\n            </div>\n            <a class=\"event-card__cta event-card__cta--ticket\" href=\"${ticketUrl}\" rel=\"noopener\" data-testid=\"ticket-cta\" data-i18n=\"${ticketKey}\">${ticketLabel}</a>\n          </div>\n        </article>\n      `;
    };

    const updateCount = (count) => {
      if (resultsCount) {
        resultsCount.textContent = formatMessage('found_count', { count });
      }
    };

    updateCatalogI18n = () => {
      updateCount(filteredEvents.length);
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
      catalogGrid.innerHTML = list.map(buildCard).join('');
      const hasResults = list.length > 0;
      if (emptyState) {
        emptyState.hidden = hasResults;
      }
      if (errorState) {
        errorState.hidden = true;
      }
      updateCount(list.length);
      observeCards();
    };

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
        if (loadMoreButton) {
          loadMoreButton.hidden = true;
          loadMoreButton.disabled = true;
        }
      }
    };

    const matchesFilters = (event) => {
      if (event.status !== 'published') return false;
      if (!filtersForm) return true;
      const formData = new FormData(filtersForm);
      const dateFrom = formData.get('date-from');
      const dateTo = formData.get('date-to');
      const city = normalize(formData.get('city'));
      const category = normalize(formData.get('category'));
      const price = normalize(formData.get('price'));
      const format = normalize(formData.get('format'));
      const quickToday = formData.get('quick-today');
      const quickTomorrow = formData.get('quick-tomorrow');
      const quickWeekend = formData.get('quick-weekend');
      const quickOnline = formData.get('quick-online');
      const showPast = formData.get('show-past');
      const audienceUa = formData.get('audience-ua');
      const audienceFamily = formData.get('audience-family');
      const audienceVolunteer = formData.get('audience-volunteer');
      const searchValue = normalize(searchInput ? searchInput.value : '');

      if (showPast) {
        if (!isPast(event)) return false;
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
      if (audienceUa && !event.forUkrainians) return false;
      if (audienceFamily && !event.familyFriendly) return false;
      if (audienceVolunteer && !event.volunteer) return false;
      if (city && normalize(event.city) !== city) return false;
      const categoryLabel = normalize(event.category?.label || event.categoryId || '');
      if (category && categoryLabel !== category) return false;
      if (price && normalize(event.priceType) !== price) return false;
      if (format && normalize(event.format) !== format) return false;
      if (searchValue) {
        const haystack = [
          event.title,
          event.description,
          event.city,
          event.venue,
          getTagList(event.tags)
            .map((tag) => tag.label)
            .join(' '),
          event.category?.label || ''
        ]
          .map(normalize)
          .join(' ');
        if (!haystack.includes(searchValue)) return false;
      }
      return true;
    };

    const applyFilters = () => {
      setErrorState(false);
      filteredEvents = events.filter(matchesFilters);
      const showPast = filtersForm && filtersForm.elements['show-past']?.checked;
      if (showPast) {
        filteredEvents.sort((a, b) => {
          const aDate = new Date(a.end || a.start || 0).getTime();
          const bDate = new Date(b.end || b.start || 0).getTime();
          return bDate - aDate;
        });
      }
      visibleCount = Math.min(pageSize, filteredEvents.length);
      renderEvents(filteredEvents.slice(0, visibleCount));
      if (loadMoreButton) {
        const hasMore = visibleCount < filteredEvents.length;
        loadMoreButton.hidden = !hasMore;
        loadMoreButton.disabled = !hasMore;
      }
    };

    const showMore = () => {
      visibleCount = Math.min(visibleCount + pageSize, filteredEvents.length);
      renderEvents(filteredEvents.slice(0, visibleCount));
      if (loadMoreButton) {
        const hasMore = visibleCount < filteredEvents.length;
        loadMoreButton.hidden = !hasMore;
        loadMoreButton.disabled = !hasMore;
      }
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

    const readQueryParams = () => {
      const params = new URLSearchParams(window.location.search);
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
        setValue('city', params.get('city') || 'copenhagen');
        setValue('category', params.get('category') || '');
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
      if (searchInput) {
        searchInput.value = params.get('q') || '';
      }
    };

    const updateQueryParams = () => {
      const params = new URLSearchParams();
      if (searchInput && searchInput.value.trim()) {
        params.set('q', searchInput.value.trim());
      }
      if (filtersForm) {
        const formData = new FormData(filtersForm);
        const mappings = [
          ['date-from', 'from'],
          ['date-to', 'to'],
          ['city', 'city'],
          ['category', 'category'],
          ['price', 'price'],
          ['format', 'format']
        ];
        mappings.forEach(([field, key]) => {
          const value = formData.get(field);
          if (value) {
            params.set(key, String(value));
          }
        });
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
      const query = params.toString();
      const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
      window.history.pushState({}, '', nextUrl);
    };

    const loadEvents = async () => {
      try {
        const response = await fetch('./data/events.json');
        if (!response.ok) {
          throw new Error('Failed to load events');
        }
        events = await response.json();
        setErrorState(false);
        readQueryParams();
        applyFilters();
      } catch (error) {
        setErrorState(true);
      }
    };

    if (filtersForm) {
      presetButtons.forEach((button) => {
        button.addEventListener('click', () => {
          const key = button.dataset.quick;
          const input = presetInputs[key];
          if (!input) return;
          const nextState = !input.checked;
          input.checked = nextState;
          if (key === 'online' && nextState) {
            const formatField = filtersForm.elements.format;
            if (formatField) {
              formatField.value = 'online';
            }
          }
          if (['today', 'tomorrow', 'weekend'].includes(key)) {
            if (nextState) {
              clearOtherDatePresets(key);
              applyDatePreset(key);
            }
          }
          syncPresetButtons();
          updateQueryParams();
          applyFilters();
        });
      });

      filtersForm.addEventListener('input', (event) => {
        const target = event.target;
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
        updateQueryParams();
        applyFilters();
      });
      filtersForm.addEventListener('submit', (event) => {
        event.preventDefault();
        updateQueryParams();
        applyFilters();
      });
      filtersForm.addEventListener('reset', () => {
        setTimeout(() => {
          if (searchInput) {
            searchInput.value = '';
          }
          syncPresetButtons();
          updateQueryParams();
          applyFilters();
        }, 0);
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        updateQueryParams();
        applyFilters();
      });
      const searchForm = searchInput.closest('form');
      if (searchForm) {
        searchForm.addEventListener('submit', (event) => {
          event.preventDefault();
          updateQueryParams();
          applyFilters();
          searchInput.focus({ preventScroll: true });
        });
      }
    }

    if (loadMoreButton) {
      loadMoreButton.addEventListener('click', () => {
        showMore();
      });
    }

    window.addEventListener('popstate', () => {
      readQueryParams();
      applyFilters();
    });

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

    loadEvents();
  }

  const eventMeta = document.querySelector('.event-article__meta[data-event-start]');
  const eventPrice = document.querySelector('.event-sidebar__price[data-price-type]');
  const pastBanner = document.querySelector('[data-past-banner]');
  const ticketNote = document.querySelector('.event-sidebar__note');

  if (eventMeta) {
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
  }

  if (eventPrice) {
    const type = eventPrice.dataset.priceType;
    const min = Number(eventPrice.dataset.priceMin);
    const max = Number(eventPrice.dataset.priceMax);
    const minValue = Number.isNaN(min) ? null : min;
    const maxValue = Number.isNaN(max) ? null : max;
    eventPrice.textContent = formatPriceLabel(type, minValue, maxValue);
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

  const highlightsTrack = document.querySelector('.highlights__track');
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
