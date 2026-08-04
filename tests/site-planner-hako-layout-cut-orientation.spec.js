const { expect, test } = require('@playwright/test');

test.describe('Site Planner Hako layout-cut orientation', () => {
  test('keeps the centered polygon origin when a generator update changes the footprint', async ({ page }) => {
    await page.goto('/site-planner.html', { waitUntil: 'networkidle' });

    const result = await page.evaluate(async () => {
      const [{ createHakoHandoffController }, { deriveFootprintFromHakoConfig }] = await Promise.all([
        import('/js/site-planner/hako-handoff-controller.js'),
        import('/js/site-planner/hako-footprint-utils.js'),
      ]);
      const building = { id: 'returned-building', padType: 'rect', x: 500, y: 500, widthPx: 100, depthPx: 80, rotationDeg: 0 };
      const controller = createHakoHandoffController({
        state: { projectName: 'Test site' },
        autosaveKey: 'test-autosave',
        buildingUpdateKey: 'test-update',
        getElement: () => null,
        selected: () => building,
        normalizeBuilding: () => {},
        syncBuildingMetrics: () => {},
        deriveFootprintFromHakoConfig,
        buildingCenter: item => item.padType === 'rect'
          ? { x: item.x, y: item.y }
          : item.pointsPx.reduce((sum, point) => ({ x: sum.x + point.x / item.pointsPx.length, y: sum.y + point.y / item.pointsPx.length }), { x: 0, y: 0 }),
        mmToPx: value => value,
        rad: degrees => degrees * Math.PI / 180,
        slug: value => value,
        setBuildingSelection: () => {},
        syncAll: () => {},
      });
      controller.applyHakoConfigToPlannerFootprint(building, {
        width: 100,
        depth: 80,
        wings: [{ id: 'east-wing', face: 'east', offset: 10, span: 60, depth: 20 }],
      });
      return { origin: building.hakoGeometryOriginMm, padType: building.padType };
    });

    expect(result.padType).toBe('polygon');
    expect(result.origin).toEqual({ x: 60, y: 40 });
  });

  test('uses the generator cropper and preserved footprint origin for returned buildings', async ({ page }) => {
    await page.goto('/site-planner.html', { waitUntil: 'networkidle' });

    const result = await page.evaluate(async () => {
      const [{ createHakoBuildingGeometryController }, { clipPolygonByLayoutCuts }] = await Promise.all([
        import('/js/site-planner/hako-building-geometry-controller.js'),
        import('/js/building-generator/core/layout-cut-geometry.js'),
      ]);
      const cfg = {
        width: 100,
        depth: 80,
        layoutCuts: [{ id: 'front-cut', type: 'line', x1: 0, y1: 40, x2: 100, y2: 40, keepSide: 'left' }],
      };
      const building = {
        padType: 'polygon',
        hakoConfig: cfg,
        hakoGeometryOriginMm: { x: 50, y: 40 },
        rotationDeg: 0,
        pointsPx: [{ x: 450, y: 460 }, { x: 550, y: 460 }, { x: 550, y: 540 }, { x: 450, y: 540 }],
      };
      const controller = createHakoBuildingGeometryController({
        state: { pxPerMm: 1 },
        collectArrayFields: (root, paths) => paths.flatMap(path => {
          const value = path.reduce((current, key) => current && current[key], root);
          return Array.isArray(value) ? value : [];
        }),
        buildingPoints: item => item.pointsPx,
        buildingCenter: item => item.pointsPx.reduce((sum, point) => ({
          x: sum.x + point.x / item.pointsPx.length,
          y: sum.y + point.y / item.pointsPx.length,
        }), { x: 0, y: 0 }),
        mmToPx: value => value,
        pxToMm: value => value,
        rad: degrees => degrees * Math.PI / 180,
      });
      const expected = clipPolygonByLayoutCuts([
        { x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 80 }, { x: 0, y: 80 },
      ], cfg.layoutCuts, cfg).map(point => ({ x: 450 + point.x, y: 460 + point.y }));
      const actual = controller.visibleBuildingPolygons(building)[0];
      const signature = points => points.map(point => `${point.x.toFixed(3)},${point.y.toFixed(3)}`).sort();
      return { expected: signature(expected), actual: signature(actual) };
    });

    expect(result.actual).toEqual(result.expected);
  });

  test('uses a returned polygon footprint rotation once in the site 3D preview', async ({ page }) => {
    await page.goto('/site-planner.html', { waitUntil: 'networkidle' });

    const result = await page.evaluate(async () => {
      const { createSite3DBuildingConfigController } = await import('/js/site-planner/site-3d-building-config.js');
      const positiveNumber = (...values) => values.map(Number).find(value => Number.isFinite(value) && value > 0) || null;
      const controller = createSite3DBuildingConfigController({
        transformedRect: () => [],
        buildingCenter: () => ({ x: 0, y: 0 }),
        site3DScale: value => value,
        positiveNumber,
        hasAttachedHakoFile: () => true,
        hakoFootprintRotationDeg: () => 90,
      });
      const building = {
        hakoConfig: { width: 100, depth: 80 },
        padType: 'polygon',
        rotationDeg: 90,
        hakoGeometryOriginMm: { x: 60, y: 40 },
      };
      return {
        rotationY: controller.site3DGeneratorModelRotationY(building, building.hakoConfig),
        originOffset: controller.site3DGeneratorModelOriginOffset(building, building.hakoConfig),
      };
    });

    expect(result.rotationY).toBeCloseTo(-Math.PI / 2, 8);
    expect(result.originOffset).toEqual({ x: 10, z: 0 });
  });

  test('clips every returned wing with a free arc owned by the main shape', async ({ page }) => {
    await page.goto('/site-planner.html', { waitUntil: 'networkidle' });

    const result = await page.evaluate(async () => {
      const [{ createHakoBuildingGeometryController }, { clipPolygonByLayoutCuts }, { deriveFootprintFromHakoConfig }] = await Promise.all([
        import('/js/site-planner/hako-building-geometry-controller.js'),
        import('/js/building-generator/core/layout-cut-geometry.js'),
        import('/js/site-planner/hako-footprint-utils.js'),
      ]);
      const cfg = {
        width: 86.78996248471772,
        depth: 110.9583680412339,
        wings: [
          { id: 'back-wing', face: 'back', offset: 0, span: 82, depth: 40 },
          { id: 'front-wing', face: 'front', offset: 0, span: 52, depth: 18 },
        ],
        layoutCuts: [{
          id: 'free-arc', type: 'arc',
          x1: 79.57309238439005, y1: 172.42074227079945,
          x2: 37.78912164087538, y2: -21.929718985321216,
          cx: 43.39498124235886, cy: 44.51459617525653,
          keepSide: 'left', targetId: 'main',
        }],
      };
      const derived = deriveFootprintFromHakoConfig(cfg);
      const xs = derived.pointsMm.map(point => point.x);
      const ys = derived.pointsMm.map(point => point.y);
      const origin = {
        x: (Math.min(...xs) + Math.max(...xs)) / 2,
        y: (Math.min(...ys) + Math.max(...ys)) / 2,
      };
      const center = { x: 500, y: 500 };
      const building = {
        padType: 'polygon',
        hakoConfig: cfg,
        hakoGeometryOriginMm: origin,
        rotationDeg: 0,
        pointsPx: derived.pointsMm.map(point => ({
          x: center.x + point.x - origin.x,
          y: center.y + point.y - origin.y,
        })),
      };
      const controller = createHakoBuildingGeometryController({
        state: { pxPerMm: 1 },
        collectArrayFields: (root, paths) => paths.flatMap(path => {
          const value = path.reduce((current, key) => current && current[key], root);
          return Array.isArray(value) ? value : [];
        }),
        buildingPoints: item => item.pointsPx,
        buildingCenter: () => center,
        mmToPx: value => value,
        pxToMm: value => value,
        rad: degrees => degrees * Math.PI / 180,
      });
      const expected = controller.hakoBlockPolygonsMm(cfg)
        .map(block => clipPolygonByLayoutCuts(block.poly, cfg.layoutCuts, cfg))
        .filter(poly => poly.length >= 3)
        .map(poly => poly.map(point => ({
          x: center.x + point.x - origin.x,
          y: center.y + point.y - origin.y,
        })));
      const signature = polys => polys.map(poly => poly
        .map(point => point.x.toFixed(3) + ',' + point.y.toFixed(3))
        .sort()
        .join('|'))
        .sort();
      return { expected: signature(expected), actual: signature(controller.visibleBuildingPolygons(building)) };
    });

    expect(result.actual).toEqual(result.expected);
  });
});
