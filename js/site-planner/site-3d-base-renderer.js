export function createSite3DBaseRenderer({
  THREE,
  state,
  signedArea2D,
  site3DScale,
  site3DBenchworkFootprintsMm,
  normalizeBenchworkOutline,
  benchworkSamples,
  applySite3DSettings,
  referenceImageYMm = 0.045,
  referenceImageRenderOrder = 20,
}) {
  function buildSite3DBase(bounds, baseT) {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xcab98d,
      roughness: .9,
      metalness: 0,
      side: THREE.DoubleSide,
      transparent: false,
      opacity: 1,
      depthTest: true,
      depthWrite: true,
    });
    const benchworks = site3DBenchworkFootprintsMm();
    if (!benchworks.length) {
      const base = new THREE.Mesh(new THREE.BoxGeometry(bounds.width, baseT, bounds.depth), mat);
      base.name = 'Negative-thickness rectangular site base';
      base.position.y = -baseT / 2;
      return base;
    }
    const group = new THREE.Group();
    group.name = 'Negative-thickness benchwork site base';
    benchworks.forEach((pts, idx) => {
      const ordered = signedArea2D(pts) < 0 ? pts.slice().reverse() : pts.slice();
      const shape = new THREE.Shape();
      ordered.forEach((p, i) => {
        const x = p.x - bounds.cx;
        const y = p.y - bounds.cy;
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      });
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: baseT, bevelEnabled: false });
      geo.rotateX(Math.PI / 2);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = `Benchwork base ${idx + 1}`;
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 30), new THREE.LineBasicMaterial({ color: 0x8a6f43, transparent: true, opacity: .6 })));
      group.add(mesh);
    });
    return group;
  }

  function site3DReferenceImageMaskPaths() {
    return (state.benchworkOutlines || []).map(raw => {
      const bw = normalizeBenchworkOutline(raw);
      if (!bw || bw.hidden) return null;
      const pts = benchworkSamples(bw, 24);
      return pts.length >= 3 ? pts : null;
    }).filter(Boolean);
  }

  function buildSite3DReferenceTexture(w, h) {
    const masks = site3DReferenceImageMaskPaths();
    if (!masks.length) {
      const tex = new THREE.Texture(state.image);
      tex.needsUpdate = true;
      return tex;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w));
    canvas.height = Math.max(1, Math.round(h));
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      const tex = new THREE.Texture(state.image);
      tex.needsUpdate = true;
      return tex;
    }
    masks.forEach(pts => {
      ctx.save();
      ctx.beginPath();
      pts.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(state.image, 0, 0, w, h);
      ctx.restore();
    });
    const tex = (typeof THREE.CanvasTexture === 'function') ? new THREE.CanvasTexture(canvas) : new THREE.Texture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  function buildSite3DReferenceImage(bounds) {
    const settings = applySite3DSettings();
    if (!settings.imageVisible || !state.image) return null;
    const w = Number(state.image.naturalWidth || state.image.width || state.imageMeta?.naturalWidthPx);
    const h = Number(state.image.naturalHeight || state.image.height || state.imageMeta?.naturalHeightPx);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
    const tex = buildSite3DReferenceTexture(w, h);
    tex.flipY = false;
    tex.needsUpdate = true;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: settings.imageOpacity,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const width = site3DScale(w);
    const depth = site3DScale(h);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), mat);
    mesh.name = '3D reference image plane';
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(width / 2 - bounds.cx, referenceImageYMm, depth / 2 - bounds.cy);
    mesh.renderOrder = referenceImageRenderOrder;
    return mesh;
  }

  return {
    buildSite3DBase,
    buildSite3DReferenceImage,
    buildSite3DReferenceTexture,
    site3DReferenceImageMaskPaths,
  };
}
