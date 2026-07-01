const { expect, test } = require('@playwright/test');

const pages = [
  { path: '/', title: /HakoMachi/i, strictOverflow: true },
  { path: '/site-planner.html', title: /Site Planner/i, strictOverflow: false },
  { path: '/building-generator.html', title: /Building Generator/i, strictOverflow: false },
];

test.describe('short viewport smoke', () => {
  for (const pageCase of pages) {
    test(`${pageCase.path} renders at phone height`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 640 });
      await page.goto(pageCase.path, { waitUntil: 'domcontentloaded' });

      await expect(page).toHaveTitle(pageCase.title);
      await expect(page.locator('body')).toBeVisible();

      const metrics = await page.evaluate(() => ({
        bodyHeight: document.body.scrollHeight,
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }));

      expect(metrics.bodyHeight).toBeGreaterThan(100);
      if (pageCase.strictOverflow) {
        expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
      }
    });
  }
});
