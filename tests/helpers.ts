export async function gotoHome(page) {
  await page.goto('/');
}

export async function waitForEventsRendered(page) {
  await page.waitForSelector('[data-testid="event-card"]', { state: 'visible' });
}
