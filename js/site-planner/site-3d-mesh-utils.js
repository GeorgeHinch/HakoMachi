export function createSite3DMeshUtils({ THREE, dist, site3DScale, signedArea2D, getBounds }) {
  function site3DMaterial(color, fallback = 0xd7b56d, opts = {}) {
    let materialColor;
    try { materialColor = new THREE.Color(color || fallback); } catch (_err) { materialColor = new THREE.Color(fallback); }
    const opacity = opts.opacity ?? 1;
    const transparent = opts.transparent ?? opacity < 1;
    return new THREE.MeshStandardMaterial({ color: materialColor, roughness: .82, metalness: 0, opacity, transparent, depthTest: opts.depthTest ?? true, depthWrite: opts.depthWrite ?? !transparent, ...opts });
  }

  function site3DAddEdges(mesh, color = 0x4b3828, opacity = .45) {
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 30), new THREE.LineBasicMaterial({ color, transparent: true, opacity })));
    return mesh;
  }

  function site3DAddFlatPolygon(group, points, material, outlineMaterial, name, y = .07) {
    if (!points || points.length < 3) return null;
    const ordered = signedArea2D(points) < 0 ? points.slice().reverse() : points.slice();
    const bounds = getBounds();
    const shape = new THREE.Shape();
    ordered.forEach((point, index) => {
      const x = site3DScale(point.x) - bounds.cx;
      const z = site3DScale(point.y) - bounds.cy;
      if (index === 0) shape.moveTo(x, z); else shape.lineTo(x, z);
    });
    shape.closePath();
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.y = y;
    group.add(mesh);
    const vertices = [];
    ordered.forEach((point, index) => {
      const next = ordered[(index + 1) % ordered.length];
      vertices.push(site3DScale(point.x) - bounds.cx, y + .025, site3DScale(point.y) - bounds.cy, site3DScale(next.x) - bounds.cx, y + .025, site3DScale(next.y) - bounds.cy);
    });
    const edgeGeometry = new THREE.BufferGeometry();
    edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const edge = new THREE.LineSegments(edgeGeometry, outlineMaterial);
    edge.name = `${name} outline`;
    group.add(edge);
    return mesh;
  }

  function site3DAddRaisedPolygon(group, points, material, outlineMaterial, name, topY = .2, height = .15) {
    if (!points || points.length < 3) return null;
    const ordered = signedArea2D(points) < 0 ? points.slice().reverse() : points.slice();
    const bounds = getBounds();
    const shape = new THREE.Shape();
    ordered.forEach((point, index) => {
      const x = site3DScale(point.x) - bounds.cx;
      const z = site3DScale(point.y) - bounds.cy;
      if (index === 0) shape.moveTo(x, z); else shape.lineTo(x, z);
    });
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: Math.max(.02, height), bevelEnabled: false });
    geometry.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = name;
    mesh.position.y = topY;
    group.add(mesh);
    if (outlineMaterial) site3DAddEdges(mesh, outlineMaterial.color?.getHex?.() ?? 0x8f7b55, outlineMaterial.opacity ?? .45);
    return mesh;
  }

  function site3DAddBoxSegments(group, segments, material, name, width, height, baseY, bounds) {
    const valid = (segments || []).filter(segment => segment?.a && segment?.b && dist(segment.a, segment.b) > 0);
    if (!valid.length) return null;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.InstancedMesh(geometry, material, valid.length);
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    valid.forEach((segment, index) => {
      const dx = site3DScale(segment.b.x - segment.a.x);
      const dz = site3DScale(segment.b.y - segment.a.y);
      const length = Math.max(.05, Math.hypot(dx, dz));
      const angle = Math.atan2(dz, dx);
      position.set(site3DScale((segment.a.x + segment.b.x) / 2) - bounds.cx, baseY + height / 2, site3DScale((segment.a.y + segment.b.y) / 2) - bounds.cy);
      quaternion.setFromAxisAngle(up, -angle);
      scale.set(length, height, width);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.name = name;
    group.add(mesh);
    return mesh;
  }

  function site3DBox(width, height, depth, material, x, y, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(Math.max(.05, width), Math.max(.05, height), Math.max(.05, depth)), material);
    mesh.position.set(x || 0, y || 0, z || 0);
    return mesh;
  }

  function site3DBeam(group, a, b, radius, material, name = 'Catenary beam') {
    const start = new THREE.Vector3(a.x, a.y, a.z);
    const end = new THREE.Vector3(b.x, b.y, b.z);
    const delta = end.clone().sub(start);
    const length = delta.length();
    if (!(length > .01)) return null;
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 8), material);
    mesh.name = name;
    mesh.position.copy(start.add(end).multiplyScalar(.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    group.add(mesh);
    return mesh;
  }

  return { site3DMaterial, site3DAddEdges, site3DAddFlatPolygon, site3DAddRaisedPolygon, site3DAddBoxSegments, site3DBox, site3DBeam };
}
