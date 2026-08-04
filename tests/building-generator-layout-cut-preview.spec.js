const { test, expect } = require('@playwright/test');

const suppliedArcCutConfig = {
  width: 86.78996248471772,
  depth: 110.9583680412339,
  height: 49,
  heightIncludesParapet: true,
  heightMode: 'floors',
  floorCount: 3,
  floorHeight: 15,
  roofStyle: 'parapet',
  parapetHeight: 4,
  coreThickness: 1.5,
  claddingThickness: 0.28,
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
  });
});
