const { expect, test } = require('@playwright/test');

test.describe('site planner track editing workspace', () => {
  test('switches the left rail to track-specific tools', async ({ page }) => {
    await page.goto('/site-planner.html', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#workspaceMode')).toHaveValue('layout');
    await expect(page.locator('[data-tool="rect"]')).toBeVisible();
    await expect(page.locator('#trackDrawModeBtn')).toBeHidden();

    await page.selectOption('#workspaceMode', 'track');

    await expect(page.locator('.sitePlannerApp')).toHaveClass(/trackWorkspace/);
    await expect(page.locator('[data-tool="rect"]')).toBeHidden();
    await expect(page.locator('#roadCenterlineModeBtn')).toBeHidden();
    await expect(page.locator('#trackDrawModeBtn')).toBeVisible();
    await expect(page.locator('#trackEditModeBtn')).toBeVisible();
    await expect(page.locator('#trackConnectModeBtn')).toBeVisible();
    await expect(page.locator('#trackCutPreviewModeBtn')).toBeVisible();

    await page.click('#trackDrawModeBtn');
    await expect(page.locator('#trackDrawModeBtn')).toHaveClass(/active/);
    await expect(page.locator('#statusTool')).toContainText('Draw track');

    await page.click('#trackCutPreviewModeBtn');
    await expect(page.locator('#trackCutPreviewModeBtn')).toHaveClass(/trackActionActive/);
    await expect(page.locator('#trackExportBadge')).toBeVisible();
    await expect(page.locator('#statusTool')).toContainText('Track output preview');
  });
});
