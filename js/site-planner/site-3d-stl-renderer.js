export function createSite3DStlRenderer({
  THREE,
  logger,
  base64ToArrayBuffer,
  boundsFromVertices,
  estimateStlTriangleCount,
  parseStlVertices,
  normalizeStlObject,
  site3DScale,
  mmToPx,
  site3DMaterial,
  tagSite3DStlObject,
  maxTriangles = 50000,
}) {
  function site3DStlGeometry(obj, targetW, targetH, targetD) {
    const dataBase64 = obj?.asset?.dataBase64;
    if (obj?.asset) delete obj.asset.renderFallbackReason;
    if (!dataBase64 || typeof THREE === 'undefined') {
      if (obj?.asset) obj.asset.renderFallbackReason = obj.asset?.unavailable ? 'asset-unavailable' : 'asset-missing';
      return null;
    }
    try {
      const buffer = base64ToArrayBuffer(dataBase64);
      const triangleCount = estimateStlTriangleCount(buffer);
      if (triangleCount > maxTriangles) {
        if (obj?.asset) obj.asset.renderFallbackReason = 'mesh-too-large';
        return null;
      }
      const vertices = parseStlVertices(buffer);
      if (vertices.length < 3) {
        if (obj?.asset) obj.asset.renderFallbackReason = 'parse-failed';
        return null;
      }
      const vertexCount = vertices.length - (vertices.length % 3);
      if (vertexCount < 3) {
        if (obj?.asset) obj.asset.renderFallbackReason = 'parse-failed';
        return null;
      }
      const bounds = obj.bounds && obj.bounds.vertexCount ? obj.bounds : boundsFromVertices(vertices, 'stl');
      const rawW = Math.max(.0001, Number(bounds.width) || 1);
      const rawD = Math.max(.0001, Number(bounds.depth) || 1);
      const rawH = Math.max(.0001, Number(bounds.height) || 1);
      const cx = (Number(bounds.minX) + Number(bounds.maxX)) / 2 || 0;
      const cy = (Number(bounds.minY) + Number(bounds.maxY)) / 2 || 0;
      const minZ = Number(bounds.minZ) || 0;
      const sx = targetW / rawW;
      const sy = targetH / rawH;
      const sz = targetD / rawD;
      const positions = [];
      vertices.slice(0, vertexCount).forEach(v => {
        positions.push((v.x - cx) * sx, (v.z - minZ) * sy, (v.y - cy) * sz);
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.computeVertexNormals();
      geo.computeBoundingBox();
      geo.computeBoundingSphere();
      return geo;
    } catch (err) {
      logger?.warn?.('STL 3D mesh fallback:', err);
      return null;
    }
  }

  function buildSite3DStlObjectGroup(raw, bounds) {
    const obj = normalizeStlObject(raw);
    if (!obj || obj.hidden) return null;
    const w = Math.max(.5, site3DScale(obj.widthPx || mmToPx(obj.widthMm * obj.scale || 1)));
    const d = Math.max(.5, site3DScale(obj.depthPx || mmToPx(obj.depthMm * obj.scale || 1)));
    const h = Math.max(.5, Number(obj.heightMm || 8) * (Number(obj.scale) || 1));
    const group = new THREE.Group();
    const geometry = site3DStlGeometry(obj, w, h, d);
    if (geometry) {
      group.name = obj.name || 'STL site object';
      const mesh = new THREE.Mesh(geometry, site3DMaterial(obj.color, 0x496a78, { transparent: false, opacity: 1, side: THREE.DoubleSide }));
      mesh.userData.sitePlannerStlActualMesh = true;
      group.add(mesh);
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 30), new THREE.LineBasicMaterial({ color: 0x24424d, transparent: true, opacity: .34 })));
    } else {
      group.name = obj.name || 'STL site object proxy';
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), site3DMaterial(obj.color, 0x496a78, { transparent: false, opacity: 1 }));
      mesh.position.y = h / 2;
      group.add(mesh);
      const edgeGeo = new THREE.EdgesGeometry(mesh.geometry);
      const edges = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: 0x24424d, transparent: true, opacity: .62 }));
      edges.position.copy(mesh.position);
      group.add(edges);
    }
    group.position.set(site3DScale(obj.x) - bounds.cx, 0, site3DScale(obj.y) - bounds.cy);
    group.rotation.y = -(Number(obj.rotationDeg) || 0) * Math.PI / 180;
    return tagSite3DStlObject(group, obj);
  }

  return {
    site3DStlGeometry,
    buildSite3DStlObjectGroup,
  };
}
