export async function gotoHome(page) {
  await page.goto('/main-page.html');
}

export async function waitForEventsRendered(page) {
  await page.waitForSelector('[data-testid="event-card"]', { state: 'visible' });
}

export async function enableAdminSession(page) {
  await page.addInitScript(() => {
    localStorage.setItem('wodAdminSession', '1');
  });
}

export async function createEventToPreview(page) {
  await enableAdminSession(page);
  await page.goto('/new-event.html');

  // Step 1: basics
  await page.getByLabel(/Назва|Title|Titel/i).fill('Test meetup');
  await page.getByLabel(/Опис|Description|Beskrivelse/i).fill('Short event description for preview.');
  await page.getByLabel(/Категорія|Category|Kategori/i).selectOption({ value: 'music' });
  const tagsInput = page.getByLabel(/Додати тег|Add tag|Tilføj tag/i);
  await tagsInput.fill('Community');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: /Далі|Next|Næste/i }).click();

  // Step 2: time & location
  await page.getByLabel(/Початок|Start/i).fill('2030-05-01T18:00');
  await page.getByLabel(/Завершення|End/i).fill('2030-05-01T20:00');
  await page.locator('select[name="format"]').selectOption({ value: 'offline' });
  await page.locator('select[name="language"]').selectOption({ value: 'uk' });
  await page.getByLabel(/Адреса|Address|Adresse/i).fill('Copenhagen, Main St 10');
  await page.getByRole('button', { name: /Далі|Next|Næste/i }).click();

  // Step 3: tickets
  await page.getByLabel(/Платно|Paid|Betalt/i).check();
  await page.getByLabel(/Мінімальна ціна|Minimum price|Minimumpris/i).fill('50');
  await page.getByLabel(/Максимальна ціна|Maximum price|Maksimumspris/i).fill('120');
  await page.getByRole('button', { name: /Далі|Next|Næste/i }).click();

  // Step 4: contacts
  await page.locator('input[name="image"]').setInputFiles({
    name: 'event.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2P4z8DwHwAE/wJ/lYt9NwAAAABJRU5ErkJggg==',
      'base64'
    )
  });
  await page.getByLabel(/Організація|Organization|Organisation/i).fill('Community Hub');
  await page.getByRole('button', { name: /Далі|Next|Næste/i }).click();
}
