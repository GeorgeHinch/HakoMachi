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
};

async function generate(page, config) {
  return page.evaluate((cfg) => {
    const runtime = window.HakoMachiBuildingGeneratorRuntime;
    const clone = value => window.structuredClone
      ? window.structuredClone(value)
      : JSON.parse(JSON.stringify(value));
    return runtime.generateBuilding(clone(cfg));
  }, config);
}

test.describe('coplanar merged openings (#232)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/building-generator.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => !!window.HakoMachiBuildingGeneratorRuntime?.generateBuilding);
  });

  test('reconciles main and wing opening metadata before accessory generation', async ({ page }) => {
    const cfg = {
      ...baseConfig,
      wallFeatures: {
        front: [], back: [], east: [],
        west: [{ type: 'window', x: 28, y: 14, w: 8, h: 10, style: 'single' }],
      },
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
        wallFeatures: {
          front: [], back: [], east: [],
          west: [{ type: 'window', x: 4, y: 14, w: 7, h: 10, style: 'single' }],
        },
      }],
      layoutCuts: [{
        id: 'trim-front-extension-half', type: 'line',
        x1: -20, y1: -15, x2: 120, y2: -15,
        keepSide: 'left', enabled: true, positionMode: 'free', solidBack: false,
      }],
    };

    const result = await generate(page, cfg);
    const merged = result.parts.find(part => part.id === 'side_wall_west');
    expect(merged?._coplanarMerge?.kind).toBe('core');
    expect(merged?._coplanarOpeningSpecsReconciled).toBe(true);
    expect(merged.windowSpecs).toHaveLength(2);
    expect(merged.windowSpecs.some(spec => spec.x < 60)).toBe(true);
    expect(merged.windowSpecs.some(spec => spec.x > 65)).toBe(true);

    const glassSheets = result.parts.filter(part => part.id === 'glass' || String(part.id).startsWith('glass_'));
    expect(glassSheets.length).toBeGreaterThan(0);
    expect(glassSheets.reduce((sum, part) => sum + Number(part.tileCount || 0), 0)).toBe(2);
  });
});
