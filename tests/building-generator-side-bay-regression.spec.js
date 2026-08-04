const { expect, test } = require('@playwright/test');

test.describe('building generator side bay regressions', () => {
  test('Shape Editor fades the portion removed by an arc layout cut', async ({ page }) => {
    await page.goto('/building-generator.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => !!window.HakoMachiBuildingGeneratorRuntime?.generateBuilding);
    await page.click('#wingEditorBtn');
    await page.evaluate(() => {
      const runtime = window.HakoMachiBuildingGeneratorRuntime;
      const width = Number(runtime.CONFIG.width) || 100;
      const depth = Number(runtime.CONFIG.depth) || 60;
      runtime.CONFIG.layoutCuts = [{
        id: 'arc-fade',
        type: 'arc',
        x1: 0,
        y1: depth / 2,
        cx: width / 2,
        cy: depth * 0.9,
        x2: width,
        y2: depth / 2,
        keepSide: 'left',
      }];
    });
    await page.click('#weCloseBtn');
    await page.click('#wingEditorBtn');

    const fade = page.locator('#wingEditorSvg [data-layout-cut-fade="true"]');
    await expect(fade).toHaveCount(1);
    await expect(fade.locator('path')).toHaveCount(1);
    await expect(fade.locator('path')).toHaveAttribute('fill-rule', 'evenodd');
    await expect(fade.locator('path')).toHaveAttribute('fill-opacity', '0.78');
  });

  test('printed layout reference keeps arc cuts in Shape Editor orientation', async ({ page }) => {
    await page.goto('/building-generator.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => !!window.HakoMachiBuildingGeneratorRuntime?.generateBuilding);

    const result = await page.evaluate(() => {
      const runtime = window.HakoMachiBuildingGeneratorRuntime;
      const makeConfig = keepSide => {
        const cfg = window.structuredClone
          ? window.structuredClone(runtime.CONFIG)
          : JSON.parse(JSON.stringify(runtime.CONFIG));
        Object.assign(cfg, {
          width: 100,
          depth: 80,
          wings: [],
          layoutCuts: [{
            id: `printed-arc-${keepSide}`,
            type: 'arc',
            x1: 0,
            y1: 40,
            cx: 50,
            cy: 70,
            x2: 100,
            y2: 40,
            keepSide,
          }],
        });
        return cfg;
      };
      const meanPolygonY = keepSide => {
        const part = runtime.generateBuilding(makeConfig(keepSide)).parts
          .find(candidate => candidate.id === 'building_layout_reference_print');
        const points = part.svgContent.match(/<polygon points="([^"]+)"/)[1]
          .trim()
          .split(/\s+/)
          .map(pair => Number(pair.split(',')[1]));
        return {
          meanY: points.reduce((total, y) => total + y, 0) / points.length,
          svg: part.svgContent,
        };
      };
      return {
        left: meanPolygonY('left'),
        right: meanPolygonY('right'),
      };
    });

    // In the Shape Editor's front-up coordinate system, the left side of this
    // upward-bulging arc sits closer to the front/top of the footprint. A
    // map-style Y inversion would reverse this relationship.
    expect(result.left.meanY).toBeLessThan(result.right.meanY);
    expect(result.left.svg).toContain('front-up plan view');
    expect(result.left.svg).toContain('>Front</text>');
    expect(result.left.svg).toContain('>Back</text>');
    expect(result.left.svg).not.toContain('north-up plan view');
  });

  test('3D clipping planes retain the Shape Editor cut side', async ({ page }) => {
    await page.goto('/building-generator.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => !!window.HakoMachiBuildingPreviewRenderer?.buildBuildingPreviewGroup);

    const result = await page.evaluate(() => {
      const runtime = window.HakoMachiBuildingGeneratorRuntime;
      const cfg = window.structuredClone
        ? window.structuredClone(runtime.CONFIG)
        : JSON.parse(JSON.stringify(runtime.CONFIG));
      Object.assign(cfg, {
        width: 100,
        depth: 80,
        wings: [],
        layoutCuts: [{ id: 'front-cut', type: 'line', x1: 0, y1: 40, x2: 100, y2: 40, keepSide: 'left' }],
      });
      const group = window.HakoMachiBuildingPreviewRenderer.buildBuildingPreviewGroup(cfg);
      let plane = null;
      group.traverse(child => {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        if (!plane) plane = materials.find(material => material?.clippingPlanes?.length)?.clippingPlanes[0] || null;
      });
      return {
        planeFound: !!plane,
        // p.y = 60 is the kept lower/back side in front-up plan coordinates;
        // p.y = 20 is the trimmed front side.
        keptDistance: plane?.distanceToPoint(new THREE.Vector3(0, 0, 20)),
        trimmedDistance: plane?.distanceToPoint(new THREE.Vector3(0, 0, -20)),
      };
    });

    expect(result.planeFound).toBe(true);
    // Three.js local clipping retains the positive half-plane.
    expect(result.keptDistance).toBeGreaterThanOrEqual(0);
    expect(result.trimmedDistance).toBeLessThanOrEqual(0);
  });

  test('Shape Editor finishes a wing resize when the pointer is released', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', error => pageErrors.push(error.message));

    await page.goto('/building-generator.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => !!window.HakoMachiBuildingGeneratorRuntime?.generateBuilding);
    await page.click('#wingEditorBtn');
    await page.click('#wingEditorSvg [data-addface="east"]');

    const depthHandle = page.locator('#wingEditorSvg [data-handle="depth"]').first();
    const box = await depthHandle.boundingBox();
    expect(box, 'the selected wing should expose a depth resize handle').toBeTruthy();

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 36, box.y + box.height / 2);
    await page.mouse.up();

    const result = await page.evaluate(() => {
      const wing = window.HakoMachiBuildingGeneratorRuntime.CONFIG.wings.at(-1);
      return { depth: wing?.depth, wingCount: window.HakoMachiBuildingGeneratorRuntime.CONFIG.wings.length };
    });
    expect(result.wingCount).toBeGreaterThan(0);
    expect(result.depth).toBeGreaterThan(40);
    expect(pageErrors).toEqual([]);
  });

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

  test('opening editor draws parapet bands at the configured wall height only on parapeted faces', async ({ page }) => {
    await page.goto('/building-generator.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => !!window.HakoMachiBuildingGeneratorRuntime?.generateBuilding);

    async function openEditorFor(configPatch, wall = 'front') {
      await page.evaluate(({ configPatch }) => {
        const runtime = window.HakoMachiBuildingGeneratorRuntime;
        Object.assign(runtime.CONFIG, {
          floors: 2,
          width: 84,
          depth: 52,
          height: 64,
          parapetHeight: 3,
          wallFeatures: { front: [], back: [], east: [], west: [] },
          ...configPatch,
        });
        runtime.writeForm?.();
        runtime.regenerate?.();
      }, { configPatch });
      const modalVisible = await page.locator('#openingEditorModal').evaluate(modal => {
        return !!modal && getComputedStyle(modal).display !== 'none';
      }).catch(() => false);
      if (!modalVisible) {
        await page.click('#openingEditorBtn');
      } else {
        await page.evaluate(() => {
          if (typeof window.oeRender === 'function') window.oeRender();
        });
      }
      await page.click(`[data-oe-wall="${wall}"]`);
      await page.waitForSelector('#openingEditorSvg');
      await page.waitForTimeout(80);
    }

    await openEditorFor({ roofStyle: 'parapet', parapetHeight: 3 }, 'front');
    const parapetBand = await page.evaluate(() => {
      const rect = document.querySelector('#openingEditorSvg [data-oe-parapet-band="true"]');
      const line = document.querySelector('#openingEditorSvg [data-oe-roof-line="true"]');
      return {
        mm: Number(rect?.getAttribute('data-parapet-mm')),
        y: Number(rect?.getAttribute('y')),
        h: Number(rect?.getAttribute('height')),
        lineY: Number(line?.getAttribute('y1')),
      };
    });
    expect(parapetBand.mm).toBeCloseTo(3, 3);
    expect(parapetBand.lineY - parapetBand.y).toBeCloseTo(parapetBand.h, 1);

    await openEditorFor({ roofStyle: 'parapet_gable', parapetHeight: 5, parapetSides: 'fb' }, 'east');
    const eastHasBand = await page.locator('#openingEditorSvg [data-oe-parapet-band="true"]').count();
    expect(eastHasBand).toBe(0);

    await openEditorFor({ roofStyle: 'parapet_gable', parapetHeight: 5, parapetSides: 'fb' }, 'front');
    const frontBandMm = await page.evaluate(() =>
      Number(document.querySelector('#openingEditorSvg [data-oe-parapet-band="true"]')?.getAttribute('data-parapet-mm'))
    );
    expect(frontBandMm).toBeCloseTo(5, 3);

    await openEditorFor({ roofStyle: 'flat', parapetHeight: 8 }, 'front');
    const flatHasBand = await page.locator('#openingEditorSvg [data-oe-parapet-band="true"]').count();
    expect(flatHasBand).toBe(0);
  });

  test('main roof truss controls persist and generate vertical support columns', async ({ page }) => {
    await page.goto('/building-generator.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => !!window.HakoMachiBuildingGeneratorRuntime?.generateBuilding);
    await page.evaluate(() => {
      let node = document.getElementById('trussesEnabled');
      while (node) {
        if (node.tagName === 'DETAILS') node.open = true;
        node = node.parentElement;
      }
    });

    await expect(page.locator('#trussControls')).toBeHidden();
    await page.check('#trussesEnabled');
    await expect(page.locator('#trussControls')).toBeVisible();
    await expect(page.locator('#trussSupportControls')).toBeHidden();
    await page.selectOption('#trussAxis', 'ns');
    await page.fill('#trussSpacing', '24');
    await page.fill('#trussChordW', '2.5');
    await page.check('#trussSupportsEnabled');
    await expect(page.locator('#trussSupportControls')).toBeVisible();
    await page.selectOption('#trussSupportColumnType', 't');
    await page.fill('#trussSupportDepth', '5');
    await page.fill('#trussSupportFlangeW', '4.5');

    const result = await page.evaluate(() => {
      const runtime = window.HakoMachiBuildingGeneratorRuntime;
      runtime.readForm();
      const generated = runtime.generateBuilding(runtime.CONFIG);
      const supportParts = generated.parts.filter(part => /Column T-beam/.test(part.name || ''));
      const floor = generated.parts.find(part => part.id === 'floor');
      return {
        trusses: runtime.CONFIG.trusses,
        supportCount: supportParts.length,
        floorEtches: (floor?.lines || []).filter(line => line.type === 'etch').length,
      };
    });

    expect(result.trusses).toMatchObject({
      enabled: true,
      spacing: 24,
      axis: 'ns',
      chordW: 2.5,
      supports: true,
      supportColumnType: 't',
      supportDepth: 5,
      supportFlangeW: 4.5,
    });
    expect(result.supportCount).toBeGreaterThan(0);
    expect(result.floorEtches).toBeGreaterThan(0);
  });
});
