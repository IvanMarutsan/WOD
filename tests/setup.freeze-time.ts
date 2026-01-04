export async function freezeTime(page) {
  await page.addInitScript(() => {
    const fixed = new Date('2026-01-03T12:00:00+01:00').valueOf();
    const _Date = Date;
    // @ts-ignore
    class FrozenDate extends _Date {
      constructor(...a) {
        super(...(a.length ? a : [fixed]));
      }
      static now() {
        return fixed;
      }
    }
    // @ts-ignore
    window.Date = FrozenDate;
  });
}
