const { test, expect } = require('@playwright/test');

const suppliedArcCutConfig = {
  width: 86.78996248471772,
  depth: 110.9583680412339,
  height: 70,
  heightIncludesParapet: true,
  heightMode: 'floors',
  floorCount: 3,
  floorHeight: 22,
  roofStyle: 'parapet',
  parapetHeight: 4,
  coreThickness: 1.5,
  claddingThickness: 0.28,
  wallFeatures: {
    front: [{ type: 'window', x: 3, y: 12, w: 10, h: 10, style: 'single' }],
  },
  wings: [
    { id: 'back-wing', face: 'back', offset: 0, span: 82, depth: 40, height: 30, floors: 1, connection: 'wall' },
    { id: 'front-wing', face: 'front', offset: 0, span: 52, depth: 18, height: 49, floors: 1, connection: 'wall' },
  ],
  layoutCuts: [{
    id: 'free-arc', type: 'arc',
    x1: 79.57309238439005, y1: 172.42074227079945,
    x2: 37.78912164087538, y2: -21.929718985321216,
    cx: 43.39498124235886, cy: 44.51459617525653,
    keepSide: 'left', solidBack: false, enabled: true,
    positionMode: 'free', targetId: 'main', referenceEdge: 'back',
    startOffset: 20, endOffset: 20, bulge: 30.412506247422098, bulgeSide: 1,
  }],
};

test.describe('building generator layout-cut 3D preview', () => {
  test('clips the supplied free arc consistently across its main block and wings', async ({ page }) => {
    await page.goto('/building-generator.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => (
      !!window.HakoMachiBuildingGeneratorRuntime?.generateBuilding
      && typeof window.updateThreePreview === 'function'
    ));
    await page.evaluate((config) => {
      Object.assign(window.CONFIG, structuredClone(config));
      window.regenerate();
      window.updateThreePreview(window.CONFIG);
    }, suppliedArcCutConfig);

    await expect(page.locator('#threePreview canvas')).toBeVisible();
    await page.waitForTimeout(500);
    const preview = await page.evaluate(() => {
      const group = window.buildingMesh;
      const guide = group?.getObjectByName?.('Layout cut guide');
      let firstPlane = null;
      let guideUsesDepthTest = true;
      const boxes = [];
      group?.traverse?.(child => {
        if (child.userData?.layoutCutGuide) {
          const guideMaterials = Array.isArray(child.material) ? child.material : [child.material];
          if (guideMaterials.some(material => material?.depthTest === false)) guideUsesDepthTest = false;
        }
        if (!child.isMesh || child.userData?.layoutCutGuide) return;
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        const plane = materials.find(Boolean)?.clippingPlanes?.[0];
        if (!firstPlane && plane) {
          firstPlane = {
            normalX: plane.normal.x,
            normalZ: plane.normal.z,
          };
        }
        const box = new window.THREE.Box3().setFromObject(child);
        if (!box.isEmpty()) boxes.push({ minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z });
      });
      return {
        planes: group?.userData?.layoutCutClippingPlaneCount || 0,
        guideSegments: guide?.children?.length || 0,
        guideUsesDepthTest,
        firstPlane,
        bounds: boxes.length ? {
          minX: Math.min(...boxes.map(box => box.minX)),
          maxX: Math.max(...boxes.map(box => box.maxX)),
          minZ: Math.min(...boxes.map(box => box.minZ)),
          maxZ: Math.max(...boxes.map(box => box.maxZ)),
        } : null,
      };
    });

    expect(preview.planes).toBe(24);
    expect(preview.guideSegments).toBeGreaterThan(24);
    expect(preview.guideUsesDepthTest).toBe(true);
    expect(preview.bounds).not.toBeNull();
    // The first free-arc segment travels north-west. Left of it is east, so
    // the 3D clipping plane must retain a positive X / negative Z normal.
    expect(preview.firstPlane.normalX).toBeGreaterThan(0);
    expect(preview.firstPlane.normalZ).toBeLessThan(0);

    const wallInventory = await page.evaluate(() => {
      const runtime = window.HakoMachiBuildingGeneratorRuntime;
      const clone = value => window.structuredClone ? window.structuredClone(value) : JSON.parse(JSON.stringify(value));
      const list = cfg => runtime.generateBuilding(cfg).parts
        .filter(part => /(?:wall|side_wall|front_wall|back_wall)/.test(part.id))
        .map(part => part.id)
        .sort();
      const withCut = clone(runtime.CONFIG);
      const withoutCut = clone(runtime.CONFIG);
      withoutCut.layoutCuts = [];
      return { withCut: list(withCut), withoutCut: list(withoutCut) };
    });
    expect(wallInventory.withoutCut).toContain('side_wall_east_wing0');
    expect(wallInventory.withoutCut).toContain('side_wall_east_wing1');
    expect(wallInventory.withCut).toContain('side_wall_east_wing0');
    expect(wallInventory.withCut).toContain('side_wall_east_wing1');

    await page.click('#openingEditorBtn');
    await page.click('[data-oe-wall="front"]');
    await expect(page.locator('#openingEditorSvg [data-oe-wall-outline="true"]')).toBeVisible();
    await expect(page.locator('#openingEditorSvg [data-oe-layout-cut-fade="true"]')).toBeVisible();
    const openingEditor = await page.evaluate(() => {
      const outline = document.querySelector('#openingEditorSvg [data-oe-wall-outline="true"]');
      return {
        hasLayoutCut: outline?.getAttribute('data-oe-layout-cut'),
        shownX0: Number(outline?.getAttribute('data-oe-layout-cut-x0')),
        shownX1: Number(outline?.getAttribute('data-oe-layout-cut-x1')),
      };
    });
    expect(openingEditor.hasLayoutCut).toBe('true');
    expect(openingEditor.shownX0).toBeGreaterThan(0);
    expect(openingEditor.shownX1).toBeLessThan(suppliedArcCutConfig.width);
    expect(await page.locator('#openingEditorSvg [data-oe-layout-cut-fade-item="true"]').count()).toBeGreaterThan(0);
  });
});
