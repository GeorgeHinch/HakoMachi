export function createSite3DBuildingRenderer({
  THREE,
  logger,
  site3DScale,
  site3DMaterial,
  site3DBox,
  site3DAddEdges,
  site3DBuildingFootprintMm,
  site3DBuildingCenterMm,
  site3DBuildingConfig,
  site3DGeneratorBuildingConfig,
  site3DBuildingHeightMm,
  site3DFloorCount,
  site3DBuildingElevationMm,
  site3DPlannerRotationY,
  site3DGeneratorModelOriginOffset,
  site3DGeneratorModelRotationY,
  visibleBuildingPolygons,
  tagSite3DBuilding,
  positiveNumber,
}) {
  function windowColumns(width, density) {
    const d = String(density || 'normal');
    if (d === 'none') return 0;
    if (d === 'sparse') return Math.max(1, Math.floor(width / 22));
    if (d === 'dense') return Math.max(3, Math.floor(width / 9));
    return Math.max(2, Math.floor(width / 14));
  }

  function gabledRoof(width, depth, roofH, mat, ridgeDirection = 'ew') {
    const ew = ridgeDirection !== 'ns';
    const x0 = -width / 2;
    const x1 = width / 2;
    const z0 = -depth / 2;
    const z1 = depth / 2;
    const verts = ew
      ? [[x0, 0, z0], [x1, 0, z0], [x0, 0, z1], [x1, 0, z1], [x0, roofH, 0], [x1, roofH, 0]]
      : [[x0, 0, z0], [x0, 0, z1], [x1, 0, z0], [x1, 0, z1], [0, roofH, z0], [0, roofH, z1]];
    const faces = ew
      ? [0, 1, 5, 0, 5, 4, 2, 4, 5, 2, 5, 3, 0, 2, 3, 0, 3, 1, 0, 4, 2, 1, 3, 5]
      : [0, 4, 5, 0, 5, 1, 2, 3, 5, 2, 5, 4, 0, 2, 4, 1, 5, 3, 0, 1, 3, 0, 3, 2];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts.flat(), 3));
    geo.setIndex(faces);
    geo.computeVertexNormals();
    return site3DAddEdges(new THREE.Mesh(geo, mat), 0x3d332b, .45);
  }

  function slopedRoof(width, depth, roofH, mat) {
    const x0 = -width / 2;
    const x1 = width / 2;
    const z0 = -depth / 2;
    const z1 = depth / 2;
    const verts = [[x0, 0, z0], [x1, 0, z0], [x0, roofH, z1], [x1, roofH, z1], [x0, -.6, z0], [x1, -.6, z0], [x0, roofH - .6, z1], [x1, roofH - .6, z1]];
    const faces = [0, 1, 3, 0, 3, 2, 4, 6, 7, 4, 7, 5, 0, 4, 5, 0, 5, 1, 2, 3, 7, 2, 7, 6, 0, 2, 6, 0, 6, 4, 1, 5, 7, 1, 7, 3];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts.flat(), 3));
    geo.setIndex(faces);
    geo.computeVertexNormals();
    return site3DAddEdges(new THREE.Mesh(geo, mat), 0x3d332b, .45);
  }

  function addFacadeDetails(group, profile) {
    const { w, d, height, floors, floorH } = profile;
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x6d9fbd, roughness: .25, metalness: .05, transparent: true, opacity: .74 });
    const darkGlassMat = new THREE.MeshStandardMaterial({ color: 0x315267, roughness: .28, metalness: .08, transparent: true, opacity: .82 });
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x5f4d3f, roughness: .8, metalness: .02 });
    const signMat = new THREE.MeshStandardMaterial({ color: 0xc8493a, roughness: .65, metalness: 0 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x6d604f, roughness: .8, metalness: 0 });
    const frontZ = -d / 2 - .08;
    const backZ = d / 2 + .08;
    const rightX = w / 2 + .08;
    const leftX = -w / 2 - .08;
    for (let i = 1; i < floors; i++) {
      const y = Math.min(height - .6, i * floorH);
      group.add(site3DBox(w + .6, .28, .16, trimMat, 0, y, frontZ));
      group.add(site3DBox(w + .6, .28, .16, trimMat, 0, y, backZ));
      group.add(site3DBox(.16, .28, d + .6, trimMat, leftX, y, 0));
      group.add(site3DBox(.16, .28, d + .6, trimMat, rightX, y, 0));
    }
    const cols = windowColumns(w, profile.windowDensity);
    const sideCols = Math.max(1, Math.min(4, windowColumns(d, profile.windowDensity) - 1));
    const winW = Math.max(2.4, Math.min(7, w / (cols * 2.2 || 3)));
    const winH = Math.max(2.4, Math.min(5.5, floorH * .42));
    const addWindow = (x, y, z, side = false, mat = glassMat) => {
      const mesh = side ? site3DBox(.18, winH, winW, mat, x, y, z) : site3DBox(winW, winH, .18, mat, x, y, z);
      group.add(mesh);
    };
    for (let floor = 0; floor < floors; floor++) {
      const y = Math.min(height - winH * .55, (floor + .56) * floorH);
      const first = floor === 0;
      if (first && profile.commercial) {
        const panelW = Math.max(5, Math.min(12, w / 4));
        [-1, 0, 1].forEach(n => group.add(site3DBox(panelW, Math.min(7, floorH * .58), .2, darkGlassMat, n * panelW * 1.12, Math.min(floorH * .45, 4.6), frontZ)));
      } else if (cols) {
        for (let c = 0; c < cols; c++) {
          const x = -w / 2 + (c + 1) * w / (cols + 1);
          addWindow(x, y, frontZ, false, glassMat);
          addWindow(x, y, backZ, false, glassMat);
        }
      }
      if (floor > 0 || !profile.commercial) {
        for (let c = 0; c < sideCols; c++) {
          const z = -d / 2 + (c + 1) * d / (sideCols + 1);
          addWindow(leftX, y, z, true, glassMat);
          addWindow(rightX, y, z, true, glassMat);
        }
      }
    }
    group.add(site3DBox(Math.min(7, w * .22), Math.min(7, floorH * .62), .22, doorMat, -w * .22, Math.min(floorH * .34, 3.4), frontZ - .04));
    if (profile.industrial) {
      group.add(site3DBox(Math.min(14, w * .36), Math.min(9, floorH * .7), .24, doorMat, w * .22, Math.min(floorH * .38, 4.2), frontZ - .05));
    }
    if (profile.signage > .25) {
      const signW = Math.min(w * .62, Math.max(8, w * .35));
      group.add(site3DBox(signW, Math.min(3.2, floorH * .26), .24, signMat, 0, Math.min(height - .8, Math.max(floorH * .78, 8)), frontZ - .1));
    }
    const roofMat = new THREE.MeshStandardMaterial({ color: profile.roofColor, roughness: .9, metalness: 0 });
    const roofStyle = String(profile.roofStyle || 'parapet');
    if (roofStyle.includes('gable')) {
      const roof = gabledRoof(w + 2, d + 2, Math.max(3, Math.min(10, Math.min(w, d) * .18)), roofMat, profile.roofRidgeDirection);
      roof.position.y = height;
      group.add(roof);
    } else if (roofStyle.includes('slant')) {
      const roof = slopedRoof(w + 2, d + 2, Math.max(2.5, Math.min(8, Math.min(w, d) * .12)), roofMat);
      roof.position.y = height;
      group.add(roof);
    } else {
      group.add(site3DBox(w + 1, .6, d + 1, roofMat, 0, height + .3, 0));
      if (roofStyle.includes('parapet')) {
        const ph = Math.max(1.2, Math.min(4, profile.floorH * .22));
        group.add(site3DBox(w + 1, ph, .7, roofMat, 0, height + ph / 2, -d / 2));
        group.add(site3DBox(w + 1, ph, .7, roofMat, 0, height + ph / 2, d / 2));
        group.add(site3DBox(.7, ph, d + 1, roofMat, -w / 2, height + ph / 2, 0));
        group.add(site3DBox(.7, ph, d + 1, roofMat, w / 2, height + ph / 2, 0));
      }
    }
    if (profile.industrial || profile.commercial) {
      group.add(site3DBox(Math.min(8, w * .18), 2.2, Math.min(7, d * .18), trimMat, -w * .22, height + 1.5, d * .18));
      group.add(site3DBox(Math.min(5, w * .12), 1.3, Math.min(4, d * .12), trimMat, w * .18, height + 1.05, -d * .12));
    }
  }

  function buildMassing(b, bounds) {
    const pts = site3DBuildingFootprintMm(b);
    const center = site3DBuildingCenterMm(b);
    const cfg = site3DBuildingConfig(b);
    const height = site3DBuildingHeightMm(b, cfg);
    const mat = site3DMaterial(b.color, 0xd79631);
    let mesh;
    let detailBox = null;
    if (pts && pts.length >= 3 && b.padType === 'polygon') {
      const shape = new THREE.Shape();
      pts.forEach((p, i) => {
        const x = p.x - center.x;
        const y = -(p.y - center.y);
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      });
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
      geo.rotateX(-Math.PI / 2);
      mesh = new THREE.Mesh(geo, mat);
      const xs = pts.map(p => p.x);
      const ys = pts.map(p => p.y);
      detailBox = { w: Math.max(...xs) - Math.min(...xs), d: Math.max(...ys) - Math.min(...ys) };
    } else {
      const w = positiveNumber(b.widthMm, pts && Math.max(...pts.map(p => p.x)) - Math.min(...pts.map(p => p.x)), 20) || 20;
      const d = positiveNumber(b.depthMm, pts && Math.max(...pts.map(p => p.y)) - Math.min(...pts.map(p => p.y)), 20) || 20;
      mesh = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), mat);
      mesh.position.y = height / 2;
      detailBox = { w, d };
    }
    site3DAddEdges(mesh, 0x4b3828, .55);
    const group = new THREE.Group();
    group.name = b.name || 'Building massing';
    group.userData.sitePlannerDetailedFallback = true;
    group.add(mesh);
    const floorCount = site3DFloorCount(b, cfg);
    const profile = {
      w: Math.max(4, detailBox?.w || cfg?.width || 20),
      d: Math.max(4, detailBox?.d || cfg?.depth || 20),
      height,
      floors: floorCount,
      floorH: Math.max(4, Math.min(40, height / Math.max(1, floorCount))),
      roofStyle: cfg?.roofStyle || 'parapet',
      roofRidgeDirection: cfg?.roofRidgeDirection || 'ew',
      roofColor: cfg?.roofColor || 0x5f6466,
      windowDensity: cfg?.windowDensity || 'normal',
      commercial: Number(cfg?.commercialIntensity || 0) > 0.5 || /shop|commercial|zakkyo|tenant/i.test(String(cfg?.buildingType || b.category || '')),
      industrial: /warehouse|industrial|workshop|service/i.test(String(cfg?.buildingType || b.category || '')),
      signage: Number(cfg?.signageIntensity || 0),
    };
    if (b.padType !== 'polygon') addFacadeDetails(group, profile);
    group.position.set(center.x - bounds.cx, site3DBuildingElevationMm(b), center.y - bounds.cy);
    group.rotation.y = site3DPlannerRotationY(b, { geometryAlreadyInSiteCoordinates: b.padType === 'polygon' });
    return group;
  }

  function buildSelectionHelper(b, bounds, opts = {}) {
    const cfg = site3DGeneratorBuildingConfig(b) || site3DBuildingConfig(b) || {};
    const yOffset = Number(opts.yOffset) || 0;
    const y0 = site3DBuildingElevationMm(b) + yOffset;
    const y1 = y0 + site3DBuildingHeightMm(b, cfg);
    const verts = [];
    visibleBuildingPolygons(b).forEach(poly => {
      if (!Array.isArray(poly) || poly.length < 3) return;
      const pts = poly.map(p => ({ x: site3DScale(p.x) - bounds.cx, z: site3DScale(p.y) - bounds.cy }));
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const z = pts[(i + 1) % pts.length];
        verts.push(a.x, y0, a.z, z.x, y0, z.z);
        verts.push(a.x, y1, a.z, z.x, y1, z.z);
        verts.push(a.x, y0, a.z, a.x, y1, a.z);
      }
    });
    if (!verts.length) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    const mat = new THREE.LineBasicMaterial({ color: opts.color ?? 0x0f766e, transparent: true, opacity: opts.opacity ?? .95 });
    const helper = new THREE.LineSegments(geo, mat);
    helper.userData.sitePlannerSelectionHelper = !opts.hover;
    helper.userData.sitePlannerHoverHelper = !!opts.hover;
    return helper;
  }

  function buildBuildingGroup(b, bounds) {
    const cfg = site3DGeneratorBuildingConfig(b);
    const center = site3DBuildingCenterMm(b);
    const sharedRenderer = window.HakoMachiBuildingPreviewRenderer || globalThis.HakoMachiBuildingPreviewRenderer;
    if (cfg && sharedRenderer?.buildBuildingPreviewGroup) {
      try {
        const group = sharedRenderer.buildBuildingPreviewGroup(cfg, { includeStlOverlay: false });
        const wrapper = new THREE.Group();
        wrapper.name = b.name || 'HakoMachi building';
        wrapper.userData.sitePlannerGeneratorPreview = true;
        group.name = `${wrapper.name} preview`;
        const originOffset = site3DGeneratorModelOriginOffset(b, cfg);
        if (originOffset) group.position.set(-originOffset.x, 0, -originOffset.z);
        wrapper.add(group);
        tagSite3DBuilding(wrapper, b);
        wrapper.position.set(center.x - bounds.cx, site3DBuildingElevationMm(b), center.y - bounds.cy);
        wrapper.rotation.y = site3DGeneratorModelRotationY(b, cfg);
        wrapper.updateMatrixWorld(true);
        sharedRenderer.applyLayoutCutClippingToGroup?.(group, cfg, group.matrixWorld);
        return wrapper;
      } catch (err) {
        logger?.warn?.('3D generated building fallback:', err);
      }
    }
    return buildMassing(b, bounds);
  }

  return {
    buildSite3DBuildingGroup: buildBuildingGroup,
    buildSite3DSelectionHelper: buildSelectionHelper,
    buildSite3DMassing: buildMassing,
  };
}
