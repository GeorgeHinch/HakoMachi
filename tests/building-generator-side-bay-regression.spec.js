const { expect, test } = require('@playwright/test');

test.describe('building generator side bay regressions', () => {
  test('west gable walls can carry a bay opening through the bottom edge', async ({ page }) => {
    await page.goto('/building-generator.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => !!window.HakoMachiBuildingGeneratorRuntime?.generateBuilding);
    await page.waitForFunction(() => !!window.get3DWallOpenings);

    const result = await page.evaluate(() => {
      const runtime = window.HakoMachiBuildingGeneratorRuntime;
      const cfg = window.structuredClone
        ? window.structuredClone(runtime.CONFIG)
        : JSON.parse(JSON.stringify(runtime.CONFIG));
      Object.assign(cfg, {
        buildingType: 'industrial_loading',
        buildingName: 'West bay fixture',
        floors: 1,
        width: 78.51945539369831,
        depth: 69.8943007523153,
        height: 34,
        coreThickness: 1.5,
        roofStyle: 'gabled',
        roofRidgeDirection: 'ew',
        roofPitch: 6,
        wallFeatures: {
          front: [],
          back: [],
          east: [],
          west: [
            {
              type: 'bay',
              style: 'side',
              x: 12,
              y: 0,
              w: 32,
              h: 24,
              doorStyle: 'none',
              doorPercentOpen: 0,
            },
          ],
        },
      });
      runtime.upgradeConfigToCurrentStorage(cfg);
      const manual = window.manualStructuralOps(cfg, 'west');
      const plan = runtime.buildEdgePlans(cfg);
      const previewBay = window.get3DWallOpenings(cfg, plan, 'west')
        .find(op => op.type === 'bay');
      const generated = runtime.generateBuilding(cfg);
      const west = generated.parts.find(part => part.id === 'side_wall_west');
      const d = west?.paths?.map(path => path.d || '').join(' ') || '';
      return {
        manualTypes: manual.map(op => op.type),
        previewBay,
        hasWestWall: !!west,
        pathData: d,
      };
    });

    expect(result.manualTypes).toContain('bay');
    expect(result.previewBay).toMatchObject({ type: 'bay', x: 12, y: 10, w: 32, h: 24 });
    expect(result.hasWestWall).toBe(true);
    expect(result.pathData).toMatch(/L\s+44(?:\.0+)?,10(?:\.0+)?\s+L\s+12(?:\.0+)?,10(?:\.0+)?\s+L\s+12(?:\.0+)?,34(?:\.0+)?/);
  });

  test('opening editor dropdowns stay capped without horizontal toolbar scroll', async ({ page }) => {
    const viewports = [
      { width: 1366, height: 900, label: 'desktop' },
      { width: 1024, height: 768, label: 'narrow desktop' },
      { width: 834, height: 1112, label: 'iPad' },
    ];

    async function seedAndOpenEditor() {
      await page.goto('/building-generator.html', { waitUntil: 'networkidle' });
      await page.waitForFunction(() => !!window.HakoMachiBuildingGeneratorRuntime?.generateBuilding);
      await page.evaluate(() => {
        const runtime = window.HakoMachiBuildingGeneratorRuntime;
        Object.assign(runtime.CONFIG, {
          floors: 3,
          width: 90,
          depth: 60,
          height: 72,
        });
        runtime.CONFIG.wallFeatures = runtime.CONFIG.wallFeatures || {};
        runtime.CONFIG.wallFeatures.front = [
          { type: 'window', style: 'industrial_slider_6', x: 8, y: 18, w: 36, h: 8, hasShutters: true, shutterStyle: 'louvered' },
          { type: 'cladding_override', x: 48, y: 18, w: 22, h: 18, claddingStyle: 'corrugated_metal_overlap' },
          { type: 'bay', style: 'front', x: 24, y: 0, w: 30, h: 24, doorStyle: 'roller_shutter', doorPercentOpen: 25 },
        ];
        runtime.regenerate?.();
      });
      await page.click('#openingEditorBtn');
      await page.waitForSelector('#openingEditorSvg [data-oe-idx]');
    }

    async function selectOpening(index) {
      const target = page.locator(`#openingEditorSvg [data-oe-idx="${index}"]`).first();
      const box = await target.boundingBox();
      expect(box, `opening ${index} should be visible`).toBeTruthy();
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(60);
    }

    async function expectToolbarFits(label, index) {
      const metrics = await page.evaluate(() => {
        const bar = document.getElementById('oeTopbar');
        const selects = [...bar.querySelectorAll('select.oe-tb-btn')].map(select => ({
          width: Math.round(select.getBoundingClientRect().width),
          minHeight: Math.round(select.getBoundingClientRect().height),
        }));
        return {
          scrollWidth: bar.scrollWidth,
          clientWidth: bar.clientWidth,
          selects,
        };
      });
      expect(metrics.scrollWidth, `${label} selection ${index} should not horizontally scroll`).toBeLessThanOrEqual(metrics.clientWidth + 1);
      for (const select of metrics.selects) {
        expect(select.width, `${label} selection ${index} select width`).toBeLessThanOrEqual(190);
        expect(select.minHeight, `${label} selection ${index} select touch target`).toBeGreaterThanOrEqual(22);
      }
    }

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await seedAndOpenEditor();
      await expectToolbarFits(`${viewport.label} unselected`, 'none');

      for (const index of [0, 1, 2]) {
        await selectOpening(index);
        await expectToolbarFits(viewport.label, index);
      }
    }
  });
});
