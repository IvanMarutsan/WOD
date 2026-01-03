import { test as base } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      const fixed = new Date('2026-01-03T12:00:00+01:00').valueOf();
      const _Date = Date;
      // @ts-ignore
      class FrozenDate extends _Date {
        constructor(...args) {
          super(...(args.length ? args : [fixed]));
        }
        static now() {
          return fixed;
        }
      }
      // @ts-ignore
      window.Date = FrozenDate;
    });
    await use(page);
  }
});

export { expect } from '@playwright/test';
