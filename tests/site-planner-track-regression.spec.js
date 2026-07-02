const { expect, test } = require('@playwright/test');

const AUTOSAVE_KEY = 'hakomachiSitePlannerAutosave_v1';
const AUTOSAVE_META_KEY = 'hakomachiSitePlannerAutosaveMeta_v1';

async function loadPlanner(page) {
  await page.goto('/site-planner.html', { waitUntil: 'networkidle' });
  await page.locator('#canvas').waitFor({ state: 'visible' });
}

async function importTinyReferenceImage(page) {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="#f7f4ec"/></svg>';
  await page.locator('#imageFile').setInputFiles({
    name: 'track-test-plan.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(svg),
  });
  await expect(page.locator('#emptyImageOverlay')).toBeHidden({ timeout: 10000 });
}

async function autosavePayload(page) {
  await page.waitForFunction(key => {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    try {
      return !!JSON.parse(raw);
    } catch (_err) {
      return false;
    }
  }, AUTOSAVE_KEY);
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)), AUTOSAVE_KEY);
}

test.describe('Site Planner track regressions', () => {
  test('drawn track path is saved through autosave', async ({ page }) => {
    await loadPlanner(page);
    await importTinyReferenceImage(page);

    await page.locator('[data-tool="track"]').click();
    const box = await page.locator('#canvas').boundingBox();
    expect(box).not.toBeNull();

    await page.mouse.click(box.x + 220, box.y + 220);
    await page.mouse.click(box.x + 320, box.y + 245);
    await page.mouse.click(box.x + 420, box.y + 205);
    await page.keyboard.press('Enter');

    await page.waitForTimeout(700);
    const payload = await autosavePayload(page);
    expect(payload.tracks).toHaveLength(1);
    expect(payload.tracks[0].pointsPx.length).toBeGreaterThanOrEqual(2);
    expect(payload.tracks[0].gaugeMm).toBe(9);
    expect(payload.tracks[0].roadbedWidthMm).toBe(19);
  });

  test('straight, curved, S-curve, and joined track fixtures round-trip through load/autosave', async ({ page }) => {
    const project = {
      app: 'HakoMachi Site Planner',
      version: 80,
      portableProject: true,
      savedAt: new Date().toISOString(),
      coordinateSystem: { type: 'imagePixels', origin: 'topLeft', imageWidthPx: 900, imageHeightPx: 600 },
      image: null,
      view: { x: 0, y: 0, scale: 1 },
      site3d: { imageVisible: true, imageOpacity: 0.45 },
      imageOpacity: 0.75,
      imageLocked: true,
      scale: { calibrated: false, pxPerMm: null, calibrationLine: null, units: 'mm' },
      buildings: [],
      roads: [],
      roadFeatures: [],
      stlObjects: [],
      benchworkOutlines: [],
      fabricRegions: [],
      streetlights: [],
      annotations: [],
      tracks: [
        { id: 'track_straight', name: 'Straight fixture', pointsPx: [{ x: 80, y: 120 }, { x: 260, y: 120 }], gaugeMm: 9, roadbedWidthMm: 19, tieSpacingMm: 4 },
        { id: 'track_curve', name: 'Curved fixture', pointsPx: [{ x: 80, y: 220 }, { x: 260, y: 220 }], curvesPx: [{ x: 170, y: 170 }], gaugeMm: 9, roadbedWidthMm: 19, tieSpacingMm: 4 },
        { id: 'track_s_curve', name: 'S-curve fixture', pointsPx: [{ x: 80, y: 340 }, { x: 200, y: 300 }, { x: 320, y: 340 }], curvesPx: [{ x: 140, y: 270 }, { x: 260, y: 370 }], gaugeMm: 9, roadbedWidthMm: 19, tieSpacingMm: 4 },
        { id: 'track_join_a', name: 'Joined A', pointsPx: [{ x: 400, y: 120 }, { x: 520, y: 120 }], endpointConnections: { end: { trackId: 'track_join_b', endpoint: 'start' } }, gaugeMm: 9, roadbedWidthMm: 19, tieSpacingMm: 4 },
        { id: 'track_join_b', name: 'Joined B', pointsPx: [{ x: 520, y: 120 }, { x: 620, y: 190 }], endpointConnections: { start: { trackId: 'track_join_a', endpoint: 'end' } }, gaugeMm: 9, roadbedWidthMm: 19, tieSpacingMm: 4 },
      ],
    };

    await page.addInitScript(({ key, metaKey, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem(metaKey, JSON.stringify({ savedAt: value.savedAt, dirtySinceManualSave: true }));
    }, { key: AUTOSAVE_KEY, metaKey: AUTOSAVE_META_KEY, value: project });

    await loadPlanner(page);
    await page.waitForTimeout(700);
    const payload = await autosavePayload(page);
    const byId = Object.fromEntries(payload.tracks.map(track => [track.id, track]));

    expect(payload.tracks).toHaveLength(5);
    expect(byId.track_straight.pointsPx).toHaveLength(2);
    expect(byId.track_curve.curvesPx.filter(Boolean)).toHaveLength(1);
    expect(byId.track_s_curve.curvesPx.filter(Boolean)).toHaveLength(2);
    expect(byId.track_join_a.endpointConnections.end).toMatchObject({ trackId: 'track_join_b', endpoint: 'start' });
    expect(byId.track_join_b.endpointConnections.start).toMatchObject({ trackId: 'track_join_a', endpoint: 'end' });
    for (const track of payload.tracks) {
      expect(track.gaugeMm).toBe(9);
      expect(track.roadbedWidthMm).toBe(19);
      expect(track.tieSpacingMm).toBe(4);
    }
  });
});
