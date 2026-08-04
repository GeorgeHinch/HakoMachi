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
    front: [
      { type: 'window', x: 3, y: 12, w: 10, h: 10, style: 'single' },
      { type: 'window', x: 75, y: 12, w: 8, h: 10, style: 'single' },
      // This lies behind the attached front wing. It must not leave a detached
      // cutout or generate glass for the removed cladding area.
      { type: 'window', x: 23, y: 28.5, w: 8, h: 5, style: 'single' },
    ],
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
  test('lets the opening editor select a wing and its exposed wall faces', async ({ page }) => {
    await page.goto('/building-generator.html', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => !!window.HakoMachiBuildingGeneratorRuntime?.generateBuilding);
    await page.evaluate((config) => {
      Object.assign(window.CONFIG, structuredClone(config));
      window.regenerate();
    }, suppliedArcCutConfig);

    await page.click('#openingEditorBtn');
    await expect(page.locator('#oeTargetSelect')).toHaveValue('main');
    await expect(page.locator('#oeTargetSelect option')).toHaveText([
      'Main building',
      'Wing 1 (back)',
      'Wing 2 (front)',
    ]);
    await expect(page.locator('#oeTabFront')).toBeVisible();

    await page.selectOption('#oeTargetSelect', 'wing:1');
    await expect(page.locator('#oeTargetSelect')).toHaveValue('wing:1');
    await expect(page.locator('#oeTabFront')).toBeHidden();
    await expect(page.locator('#oeTabBack')).toHaveClass(/oe-active/);
    await expect(page.locator('#oeTabEast')).toBeVisible();
    await expect(page.locator('#oeTabWest')).toBeVisible();

    await page.selectOption('#oeTargetSelect', 'main');
    await expect(page.locator('#oeTargetSelect')).toHaveValue('main');
    await expect(page.locator('#oeTabFront')).toBeVisible();
  });

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
      const cutParts = runtime.generateBuilding(withCut).parts;
      const offsets = ['front_wall', 'back_wall'].map(id => {
        const part = cutParts.find(candidate => candidate.id === id);
        return { id, bboxOffsetX: Number(part?.bboxOffsetX) || 0 };
      });
      return { withCut: list(withCut), withoutCut: list(withoutCut), offsets };
    });
    expect(wallInventory.withoutCut).toContain('side_wall_east_wing0');
    expect(wallInventory.withoutCut).toContain('side_wall_east_wing1');
    expect(wallInventory.withCut).toContain('side_wall_east_wing0');
    expect(wallInventory.withCut).toContain('side_wall_east_wing1');
    // The front sheet is mirrored on assembly, while the back sheet retains
    // its local direction. Both mappings are intentional and must remain
    // independently tested.
    expect(wallInventory.offsets.find(part => part.id === 'front_wall').bboxOffsetX).toBeLessThanOrEqual(0.01);
    expect(wallInventory.offsets.find(part => part.id === 'back_wall').bboxOffsetX).toBeLessThan(-0.01);

    const frontCladding = await page.evaluate((config) => {
      const runtime = window.HakoMachiBuildingGeneratorRuntime;
      const clone = value => window.structuredClone ? window.structuredClone(value) : JSON.parse(JSON.stringify(value));
      const cfg = Object.assign(clone(runtime.CONFIG), clone(config));
      const part = runtime.generateBuilding(cfg).parts.find(candidate => candidate.id === 'cladding_front');
      return {
        rects: part?.rects || [],
        windowSpecs: part?.windowSpecs || [],
        hasDetachedCutPath: (part?.paths || []).slice(1).some(path => /15\.9\d*,49\.4\d*/.test(path?.d || '')),
      };
    }, suppliedArcCutConfig);
    expect(frontCladding.rects.some(rect => rect.x > 20 && rect.x < 32 && rect.y > 25)).toBe(false);
    expect(frontCladding.windowSpecs.some(window => window.x > 20 && window.x < 32 && window.y > 25)).toBe(false);
    expect(frontCladding.hasDetachedCutPath).toBe(false);

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
    expect(openingEditor.shownX0).toBeLessThanOrEqual(0.01);
    expect(openingEditor.shownX1).toBeLessThan(suppliedArcCutConfig.width);
    expect(await page.locator('#openingEditorSvg [data-oe-layout-cut-fade-item="true"]').count()).toBeGreaterThan(0);

    await page.click('[data-oe-wall="back"]');
    const backEditor = await page.evaluate(() => {
      const outline = document.querySelector('#openingEditorSvg [data-oe-wall-outline="true"]');
      return {
        hasLayoutCut: outline?.getAttribute('data-oe-layout-cut'),
        shownX0: Number(outline?.getAttribute('data-oe-layout-cut-x0')),
        shownX1: Number(outline?.getAttribute('data-oe-layout-cut-x1')),
      };
    });
    expect(backEditor.hasLayoutCut).toBe('true');
    expect(backEditor.shownX0).toBeGreaterThan(0.01);
    expect(backEditor.shownX1).toBeLessThan(suppliedArcCutConfig.width);
  });
});
