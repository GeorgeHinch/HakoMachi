const { test, expect } = require('@playwright/test');

const baseConfig = {
  width: 80,
  depth: 70,
  height: 44,
  heightIncludesParapet: true,
  heightMode: 'floors',
  floorCount: 1,
  floorHeight: 40,
  roofStyle: 'flat',
  parapetHeight: 0,
  coreThickness: 1.5,
  claddingThickness: 0.28,
  claddingStyle: 'alc_panel',
  tongueWidth: 8,
  floorPanels: true,
  windowDensity: 'none',
  wallFeatures: { front: [], back: [], east: [], west: [] },
};

async function generate(page, config) {
  return page.evaluate((cfg) => {
    const runtime = window.HakoMachiBuildingGeneratorRuntime;
    const clone = value => window.structuredClone
      ? window.structuredClone(value)
      : JSON.parse(JSON.stringify(value));
    const result = runtime.generateBuilding(clone(cfg));
    return result;
  }, config);
}

test.describe('trimmed wing fabrication reconciliation (#232)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/building-generator.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => !!window.HakoMachiBuildingGeneratorRuntime?.generateBuilding);
  });

  test('clips mirrored front-wing west wall in physical orientation and rebuilds accessories', async ({ page }) => {
    const cfg = {
      ...baseConfig,
      wings: [{
        id: 'front-wing',
        face: 'front',
        offset: 20,
        span: 30,
        depth: 30,
        height: 40,
        floors: 1,
        connection: 'wall',
        windowDensity: 'none',
        wallFeatures: {
          front: [], back: [], east: [],
          west: [
            // Crosses the trim at wing-local x=15. The retained physical
            // piece is the right half after the west panel's SVG mirror.
            { type: 'window', x: 10, y: 14, w: 10, h: 10, style: 'single' },
            // Entirely in the discarded outer half; must not generate glass.
            { type: 'window', x: 22, y: 14, w: 6, h: 10, style: 'single' },
          ],
        },
      }],
      layoutCuts: [{
        id: 'trim-front-wing-half', type: 'line',
        x1: -20, y1: -15, x2: 120, y2: -15,
        keepSide: 'left', enabled: true, positionMode: 'free', solidBack: false,
      }],
    };

    const result = await generate(page, cfg);
    const west = result.parts.find(part => part.id === 'cladding_side_west_wing0');
    expect(west).toBeTruthy();
    expect(west.mirrorX).toBe(true);
    expect(west._layoutCutPhysicalSpanResolved).toBe(true);
    expect(west.windowSpecs).toHaveLength(1);
    expect(west.windowSpecs[0].partial).toBe(true);
    expect(west.windowSpecs[0].w).toBeCloseTo(5, 1);
    // In the exported mirrored face, the discarded half is on the physical
    // left of this opening. Generic pre-mirror clipping incorrectly reported
    // clipLeft=0 here, producing the wrong partial frame/door artwork.
    expect(west.windowSpecs[0].clipLeft).toBeCloseTo(5, 1);

    const glassSheets = result.parts.filter(part => part.id === 'glass' || String(part.id).startsWith('glass_'));
    expect(glassSheets.length).toBeGreaterThan(0);
    expect(glassSheets.reduce((sum, part) => sum + Number(part.tileCount || 0), 0)).toBe(1);
  });

  test('trims the wing extension of a coplanar merged L wall instead of treating it as the main rectangle', async ({ page }) => {
    const cfg = {
      ...baseConfig,
      wings: [{
        id: 'front-coplanar-wing',
        face: 'front',
        offset: 0,
        span: 30,
        depth: 30,
        height: 40,
        floors: 1,
        connection: 'wall',
        windowDensity: 'none',
        wallFeatures: { front: [], back: [], east: [], west: [] },
      }],
    };

    const uncut = await generate(page, { ...cfg, layoutCuts: [] });
    const cut = await generate(page, {
      ...cfg,
      layoutCuts: [{
        id: 'trim-coplanar-extension', type: 'line',
        x1: -20, y1: -15, x2: 120, y2: -15,
        keepSide: 'left', enabled: true, positionMode: 'free', solidBack: false,
      }],
    });

    const uncutWest = uncut.parts.find(part => part.id === 'side_wall_west');
    const cutWest = cut.parts.find(part => part.id === 'side_wall_west');
    expect(uncutWest?._coplanarMerge).toBeTruthy();
    expect(cutWest?._coplanarMerge).toBeTruthy();
    expect(cutWest?._layoutCutPhysicalSpanResolved).toBe(true);

    // The cut passes only through the 30mm front-wing extension. The original
    // generic wall clip used the main block's 0..depth footprint and therefore
    // left the merged extension untouched. The reconciled panel should lose
    // roughly half the extension while retaining the main west wall.
    expect(Number(cutWest.bboxW)).toBeLessThan(Number(uncutWest.bboxW) - 10);
    expect(Number(cutWest.bboxW)).toBeGreaterThan(Number(uncutWest.bboxW) - 22);
  });
});
