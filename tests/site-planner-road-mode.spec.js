const { expect, test } = require('@playwright/test');

const AUTOSAVE_KEY = 'hakomachiSitePlannerAutosave_v1';
const AUTOSAVE_META_KEY = 'hakomachiSitePlannerAutosaveMeta_v1';

async function canvasPixel(page, x, y) {
  return page.locator('#canvas').evaluate((canvas, point) => {
    const ratio = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(Math.round(point.x * ratio), Math.round(point.y * ratio), 1, 1).data;
    return { r: data[0], g: data[1], b: data[2], a: data[3] };
  }, { x, y });
}

function channelDistance(a, b) {
  return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
}

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

  test('clips road display to benchwork outside road editing mode', async ({ page }) => {
    const project = {
      app: 'HakoMachi Site Planner',
      version: 82,
      portableProject: true,
      savedAt: new Date().toISOString(),
      coordinateSystem: { type: 'imagePixels', origin: 'topLeft', imageWidthPx: 520, imageHeightPx: 300 },
      image: null,
      imageMeta: { naturalWidthPx: 520, naturalHeightPx: 300, mimeType: 'image/svg+xml' },
      view: { x: 0, y: 0, scale: 1 },
      site3d: { imageVisible: false, imageOpacity: 0.45 },
      scale: { calibrated: true, pxPerMm: 1, calibrationLine: null, units: 'mm' },
      buildings: [],
      roads: [
        {
          id: 'road-crossing-benchwork',
          name: 'Crossing road',
          mode: 'centerline',
          pointsPx: [{ x: 50, y: 150 }, { x: 470, y: 150 }],
          widthPx: 42,
          sidewalkSide: 'none',
          color: '#6f6a5e',
        },
      ],
      tracks: [],
      trackAccessories: [],
      benchworkOutlines: [
        { id: 'benchwork-clip', pointsPx: [{ x: 170, y: 80 }, { x: 350, y: 80 }, { x: 350, y: 220 }, { x: 170, y: 220 }] },
      ],
      roadFeatures: [],
      stlObjects: [],
      fabricRegions: [],
      streetlights: [],
      annotations: [],
    };

    await page.addInitScript(({ key, metaKey, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem(metaKey, JSON.stringify({ savedAt: value.savedAt, dirtySinceManualSave: true }));
    }, { key: AUTOSAVE_KEY, metaKey: AUTOSAVE_META_KEY, value: project });

    await page.goto('/site-planner.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(150);

    const outsideLayout = await canvasPixel(page, 95, 150);
    const insideLayout = await canvasPixel(page, 240, 150);
    expect(channelDistance(outsideLayout, insideLayout)).toBeGreaterThan(20);

    await page.selectOption('#workspaceMode', 'road');
    await page.waitForTimeout(150);

    const outsideRoadMode = await canvasPixel(page, 95, 150);
    expect(channelDistance(outsideRoadMode, outsideLayout)).toBeGreaterThan(20);
    expect(channelDistance(outsideRoadMode, insideLayout)).toBeLessThan(60);
  });
});
