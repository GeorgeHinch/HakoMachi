const { expect, test } = require('@playwright/test');

test.describe('site planner road editing workspace', () => {
  test('switches the left rail to road-specific tools', async ({ page }) => {
    await page.goto('/site-planner.html', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#workspaceMode')).toHaveValue('layout');
    await expect(page.locator('[data-tool="rect"]')).toBeVisible();
    await expect(page.locator('#roadCenterlineModeBtn')).toBeHidden();

    await page.selectOption('#workspaceMode', 'road');

    await expect(page.locator('.sitePlannerApp')).toHaveClass(/roadWorkspace/);
    await expect(page.locator('[data-tool="rect"]')).toBeHidden();
    await expect(page.locator('#roadCenterlineModeBtn')).toBeVisible();
    await expect(page.locator('#roadMarkingModeBtn')).toBeVisible();
    await expect(page.locator('#roadIntersectionModeBtn')).toBeVisible();
    await expect(page.locator('#roadCutPreviewModeBtn')).toBeVisible();

    await page.click('#roadMarkingModeBtn');
    await expect(page.locator('#roadMarkingModeBtn')).toHaveClass(/active/);
    await expect(page.locator('#statusTool')).toContainText('Road etching / marking');

    await page.click('#roadCutPreviewModeBtn');
    await expect(page.locator('#roadCutPreviewModeBtn')).toHaveClass(/roadActionActive/);
    await expect(page.locator('#roadExportPreviewBtn')).toHaveText('Road Export Preview: On');
  });
});
