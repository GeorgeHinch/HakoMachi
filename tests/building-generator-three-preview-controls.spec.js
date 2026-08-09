const { test, expect } = require('@playwright/test');

test.describe('building generator 3D preview controls', () => {
  test('keeps the same working controls after applying opening edits', async ({ page }) => {
    await page.goto('/building-generator.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => (
      !!window.HakoMachiBuildingGeneratorRuntime?.generateBuilding
      && !!window.threeControls
      && !!document.querySelector('#threePreview canvas')
    ));

    await page.evaluate(() => { window.__controlsBeforeOpeningEdit = window.threeControls; });
    await page.click('#openingEditorBtn');
    await expect.poll(() => page.evaluate(() => window.threeControls?.enabled)).toBe(false);

    await page.click('#oeApplyBtn');
    await expect(page.locator('#openingEditorModal')).toBeHidden();
    await expect.poll(() => page.evaluate(() => ({
      sameInstance: window.threeControls === window.__controlsBeforeOpeningEdit,
      enabled: window.threeControls?.enabled,
    }))).toEqual({ sameInstance: true, enabled: true });

    const canvas = page.locator('#threePreview canvas');
    const before = await canvas.screenshot();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.4, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(250);
    const after = await canvas.screenshot();
    expect(after.equals(before)).toBe(false);
  });
});
