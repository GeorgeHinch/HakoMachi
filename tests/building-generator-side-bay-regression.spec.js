const { expect, test } = require('@playwright/test');

test.describe('building generator side bay regressions', () => {
  test('west gable walls can carry a bay opening through the bottom edge', async ({ page }) => {
    await page.goto('/building-generator.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => !!window.HakoMachiBuildingGeneratorRuntime?.generateBuilding);

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
      const generated = runtime.generateBuilding(cfg);
      const west = generated.parts.find(part => part.id === 'side_wall_west');
      const d = west?.paths?.map(path => path.d || '').join(' ') || '';
      return {
        manualTypes: manual.map(op => op.type),
        hasWestWall: !!west,
        pathData: d,
      };
    });

    expect(result.manualTypes).toContain('bay');
    expect(result.hasWestWall).toBe(true);
    expect(result.pathData).toMatch(/L\s+44(?:\.0+)?,10(?:\.0+)?\s+L\s+12(?:\.0+)?,10(?:\.0+)?\s+L\s+12(?:\.0+)?,34(?:\.0+)?/);
  });
});
