const { expect, test } = require('@playwright/test');
const {
  blankSitePlannerProject,
  downloadText,
  expectNoConsoleErrors,
  installConsoleErrorTracker,
  readSitePlannerAutosave,
  seedSitePlannerAutosave,
} = require('./helpers/hakomachi-test-utils');

test.describe('core HakoMachi workflows', () => {
  test('landing page drives navigation, localization, and analytics suppression', async ({ page }) => {
    const errors = installConsoleErrorTracker(page);
    await page.goto('/', { waitUntil: 'networkidle' });

    await expect(page).toHaveTitle(/HakoMachi/);
    await expect(page.locator('a[href="site-planner.html"]')).toContainText('Site Planner');
    await expect(page.locator('a[href="building-generator.html"]')).toContainText('Building Generator');
    await expect(page.locator('.landing-utility-card')).toHaveCount(4);

    const analytics = await page.evaluate(() => ({
      enabled: window.HakoMachiAnalytics?.enabled,
      reason: window.HakoMachiAnalytics?.reason,
      googleTagCount: document.querySelectorAll('script[data-hakomachi-analytics="google-tag"]').length,
    }));
    expect(analytics.enabled).toBe(false);
    expect(['automated_browser', 'local_context']).toContain(analytics.reason);
    expect(analytics.googleTagCount).toBe(0);

    const englishSitePlannerLabel = await page.locator('[data-i18n="sitePlannerTitle"]').textContent();
    await page.selectOption('#languageSelect', 'ja');
    await expect(page.locator('[data-i18n="sitePlannerTitle"]')).not.toHaveText(englishSitePlannerLabel.trim());

    await page.locator('a[href="site-planner.html"]').click();
    await expect(page).toHaveURL(/site-planner\.html$/);
    await expect(page.locator('#workspaceMode')).toBeVisible();
    await expectNoConsoleErrors(errors);
  });

  test('site planner restores a local project and exports core project artifacts', async ({ page }, testInfo) => {
    const project = blankSitePlannerProject({
      buildings: [{
        id: 'bldg-core',
        name: 'Core Workflow Building',
        padType: 'rect',
        category: 'commercial',
        state: 'notStarted',
        x: 180,
        y: 130,
        widthPx: 80,
        depthPx: 50,
        rotationDeg: 0,
        color: '#d79631',
      }],
      roads: [{
        id: 'road-core',
        name: 'Core Workflow Road',
        mode: 'centerline',
        pointsPx: [{ x: 60, y: 260 }, { x: 420, y: 260 }],
        widthPx: 36,
        sidewalkSide: 'both',
        sidewalkWidthPx: 10,
        color: '#6f6a5e',
      }],
      benchworkOutlines: [{
        id: 'bench-core',
        pointsPx: [{ x: 30, y: 40 }, { x: 520, y: 40 }, { x: 520, y: 360 }, { x: 30, y: 360 }],
      }],
    });
    const errors = installConsoleErrorTracker(page);
    await seedSitePlannerAutosave(page, project);

    await page.goto('/site-planner.html', { waitUntil: 'networkidle' });
    await expect(page.locator('#objectBrowserTitle')).toContainText('Plan Objects');
    await expect(page.locator('#workspaceMode')).toHaveValue('layout');

    const svgDownloadPromise = page.waitForEvent('download');
    await page.locator('#svgBtn').click();
    const svgDownload = await svgDownloadPromise;
    expect(svgDownload.suggestedFilename()).toBe('hakomachi-site.svg');
    expect(await downloadText(svgDownload)).toContain('Core Workflow Building');

    await page.locator('#exportMenuBtn').click();
    const csvDownloadPromise = page.waitForEvent('download');
    await page.locator('#csvBtn').click();
    const csvDownload = await csvDownloadPromise;
    expect(csvDownload.suggestedFilename()).toBe('hakomachi-building-pads.csv');
    expect(await downloadText(csvDownload)).toContain('Core Workflow Building');

    if (testInfo.project.name === 'desktop-chromium') {
      const zipDownloadPromise = page.waitForEvent('download');
      await page.locator('#saveBtn').click();
      const zipDownload = await zipDownloadPromise;
      expect(zipDownload.suggestedFilename()).toBe('hakomachi-site.zip');
    }

    await page.locator('#view3dCanvasBtn').click();
    await expect(page.locator('#site3dView')).toBeVisible();
    const saved = await readSitePlannerAutosave(page);
    expect(saved.buildings).toHaveLength(1);
    expect(saved.roads).toHaveLength(1);
    await expectNoConsoleErrors(errors);
  });

  test('building generator edits settings, exports .hako, and imports them back', async ({ page }) => {
    const errors = installConsoleErrorTracker(page);
    await page.goto('/building-generator.html', { waitUntil: 'networkidle' });

    await expect(page.locator('#output svg').first()).toBeVisible();
    await page.locator('#width').fill('92');
    await page.locator('#depth').fill('48');
    await page.locator('#height').fill('36');

    await page.locator('#overflowTrigger').click();
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#exportConfigBtn').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.hako$/);
    const configText = await downloadText(download);
    const config = JSON.parse(configText);
    expect(Number(config.width)).toBe(92);
    expect(Number(config.depth)).toBe(48);

    await page.locator('#width').fill('120');
    await page.locator('#importConfigFile').setInputFiles(await download.path());
    await expect(page.locator('#width')).toHaveValue('92');
    await expect(page.locator('#threePreview canvas')).toBeVisible();
    await expectNoConsoleErrors(errors);
  });

  test('utility pages expose SVG/settings downloads without external services', async ({ page }) => {
    let errors = installConsoleErrorTracker(page);
    await page.goto('/utils/wooden-crate-generator.html', { waitUntil: 'networkidle' });
    await expect(page.locator('#svgHost svg')).toBeVisible();
    const crateSvgPromise = page.waitForEvent('download');
    await page.locator('#downloadSvg').click();
    const crateSvg = await crateSvgPromise;
    expect(crateSvg.suggestedFilename()).toMatch(/\.svg$/);
    expect(await downloadText(crateSvg)).toContain('<svg');
    const crateSettingsPromise = page.waitForEvent('download');
    await page.locator('#downloadSettings').click();
    const crateSettings = await crateSettingsPromise;
    expect(crateSettings.suggestedFilename()).toMatch(/\.json$/);
    await expectNoConsoleErrors(errors);

    errors = installConsoleErrorTracker(page);
    await page.goto('/utils/material-manager.html', { waitUntil: 'networkidle' });
    await expect(page.locator('#materialsList')).toHaveCount(1);
    const materialExportPromise = page.waitForEvent('download');
    await page.locator('#exportBtn').click();
    const materialExport = await materialExportPromise;
    expect(materialExport.suggestedFilename()).toMatch(/\.(hakomaterial|json)$/);
    expect(await downloadText(materialExport)).toContain('materials');
    await expectNoConsoleErrors(errors);
  });
});
