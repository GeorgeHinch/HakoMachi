export function createSite3DTrackAccessoryRenderer({
  THREE,
  state,
  trackProfileDefaults,
  rad,
  clamp,
  site3DScale,
  site3DAddEdges,
  site3DBox,
  site3DBeam,
  isSiteObjectSelected,
  tagSite3DTrackAccessory,
  refreshTrackAccessoryAnchor,
  normalizeTrackAccessory,
  trackAccessoryLabel,
  isCatenaryAccessoryKind,
  isTrackSwitchAccessoryKind,
  isTrackBufferAccessoryKind,
  trackBufferHasCatenaryTerminal,
  trackSwitchDirection,
  trackSwitchGeometrySite3D,
  trackSwitchCurvePoints,
  trackSwitchMainPathPoints,
  polylineLength,
  pointAtPolylineDistance,
  offsetTrackPath,
  trackBufferGeometrySite3D,
  buildFallbackTrackAccessoryItem = null,
}) {
  function buildCatenaryItem(item, bounds) {
    refreshTrackAccessoryAnchor(item);
    const selected = item.id === state.selectedTrackAccessoryId || isSiteObjectSelected('trackAccessory', item.id);
    const material = new THREE.MeshStandardMaterial({
      color: selected ? 0xc8493a : 0xf2f0e8,
      roughness: .72,
      metalness: .02,
      transparent: false,
      opacity: 1,
      depthTest: true,
      depthWrite: true,
    });
    const detailMat = new THREE.MeshStandardMaterial({ color: selected ? 0x8f2f24 : 0xd8d3c5, roughness: .78, metalness: .02 });
    const group = new THREE.Group();
    group.name = item.name || trackAccessoryLabel(item.kind);
    group.position.set(site3DScale(item.x) - bounds.cx, 0, site3DScale(item.y) - bounds.cy);
    group.rotation.y = -rad(item.rotationDeg || 0);
    const addBox = (w, h, d, x, y, z, mat = material) => group.add(site3DAddEdges(site3DBox(w, h, d, mat, x, y, z), 0x9b9485, .28));
    const addInsulator = (x, y, z) => addBox(.7, 1.4, .7, x, y, z, detailMat);
    if (item.kind === 'catenaryDoublePortal') {
      const poleZ = 13.5;
      const height = 28;
      addBox(5, .45, 4.2, 0, .23, -poleZ);
      addBox(5, .45, 4.2, 0, .23, poleZ);
      addBox(.9, height, .9, 0, height / 2, -poleZ);
      addBox(.9, height, .9, 0, height / 2, poleZ);
      site3DBeam(group, { x: 0, y: height, z: -poleZ }, { x: 0, y: height, z: poleZ }, .32, material, 'Catenary portal top chord');
      site3DBeam(group, { x: 0, y: height - 4, z: -poleZ }, { x: 0, y: height - 4, z: poleZ }, .24, material, 'Catenary portal lower chord');
      [-8, -3, 3, 8].forEach((z, i) => {
        site3DBeam(group, { x: 0, y: height - 4, z }, { x: 0, y: height, z: z + (i % 2 === 0 ? 4 : -4) }, .18, material, 'Catenary portal truss brace');
      });
      site3DBeam(group, { x: 0, y: 19, z: -poleZ }, { x: 0, y: height - 4, z: -7 }, .22, material, 'Catenary left brace');
      site3DBeam(group, { x: 0, y: 19, z: poleZ }, { x: 0, y: height - 4, z: 7 }, .22, material, 'Catenary right brace');
      addInsulator(0, height - 6, -5.2);
      addInsulator(0, height - 6, 5.2);
    } else {
      const poleZ = -11;
      const height = 28;
      addBox(5, .45, 4.2, 0, .23, poleZ);
      addBox(.9, height, .9, 0, height / 2, poleZ);
      site3DBeam(group, { x: 0, y: height - 3, z: poleZ }, { x: 0, y: height - 3, z: 10 }, .3, material, 'Single-side catenary outreach');
      site3DBeam(group, { x: 0, y: height - 10, z: poleZ }, { x: 0, y: height - 3, z: 7 }, .22, material, 'Single-side catenary brace');
      site3DBeam(group, { x: 0, y: height - 8, z: -4 }, { x: 0, y: height - 8, z: 12 }, .18, material, 'Single-side contact wire guide');
      site3DBeam(group, { x: 0, y: height - 3, z: 7 }, { x: 0, y: height - 8, z: 12 }, .16, material, 'Single-side catenary hanger');
      addBox(5, .45, .7, 0, height + 1, poleZ);
      addInsulator(0, height - 7, 8);
    }
    return tagSite3DTrackAccessory(group, item);
  }

  function buildTrackSwitchItem(item, bounds) {
    refreshTrackAccessoryAnchor(item);
    const railMat = new THREE.MeshStandardMaterial({ color: trackProfileDefaults.railColor || '#3b3832', roughness: .48, metalness: .12 });
    const tieMat = new THREE.MeshStandardMaterial({ color: trackProfileDefaults.tieColor || '#8a6f43', roughness: .84, metalness: 0 });
    const baseMat = new THREE.MeshStandardMaterial({ color: trackProfileDefaults.roadbedTopColor || trackProfileDefaults.roadbedColor || '#c7b084', roughness: .95, metalness: 0 });
    const group = new THREE.Group();
    group.name = item.name || trackAccessoryLabel(item.kind);
    group.position.set(site3DScale(item.x) - bounds.cx, 0, site3DScale(item.y) - bounds.cy);
    group.rotation.y = -rad(item.rotationDeg || 0);
    const dir = trackSwitchDirection(item.kind);
    const geom = trackSwitchGeometrySite3D(item);
    const roadbedHeight = Math.max(.12, trackProfileDefaults.roadbedHeightMm || 2.5);
    const sleeperHeight = Math.max(.08, Math.min(.32, roadbedHeight * .16));
    const sleeperBase = roadbedHeight + .03;
    const railHeight = Math.max(.08, trackProfileDefaults.railHeightMm || .8);
    const railBase = sleeperBase + sleeperHeight;
    const scale = geom.gauge / Math.max(.1, 9);
    const switchTieSpacing = Math.max(1.5 * scale, Math.min(geom.tieSpacing, (trackProfileDefaults.tieSpacingMm || 4) * scale));
    const mainPath = trackSwitchMainPathPoints(geom, dir, 24);
    const branch = trackSwitchCurvePoints(geom, dir, 24);
    const mainRailA = offsetTrackPath(mainPath, geom.gauge / 2);
    const mainRailB = offsetTrackPath(mainPath, -geom.gauge / 2);
    const branchRailA = offsetTrackPath(branch, geom.gauge / 2);
    const branchRailB = offsetTrackPath(branch, -geom.gauge / 2);
    const addLocalSegment = (a, b, width, height, baseY, mat, name) => {
      const dx = b.x - a.x, dz = b.y - a.y;
      const length = Math.hypot(dx, dz);
      if (!(length > .01)) return null;
      const mesh = site3DAddEdges(site3DBox(length, height, width, mat, (a.x + b.x) / 2, baseY + height / 2, (a.y + b.y) / 2), 0x5f5140, .18);
      mesh.name = name;
      mesh.rotation.y = -Math.atan2(dz, dx);
      group.add(mesh);
      return mesh;
    };
    const addRailPath = (points, name) => {
      for (let i = 0; i < points.length - 1; i++) {
        addLocalSegment(points[i], points[i + 1], Math.max(.08, geom.railWidth), railHeight, railBase, railMat, name);
      }
    };
    const addTie = (p, nx, ny, name) => {
      const half = Math.max(geom.tieLength / 2, geom.gauge / 2 + 2);
      addLocalSegment({ x: p.x - nx * half, y: p.y - ny * half }, { x: p.x + nx * half, y: p.y + ny * half }, Math.max(.12, geom.tieWidth), sleeperHeight, sleeperBase, tieMat, name);
    };
    const addMainTieStations = (points, name) => {
      const length = polylineLength(points);
      if (!(length > .01)) return;
      for (let d = 0; d <= length + .001; d += switchTieSpacing) {
        const station = pointAtPolylineDistance(points, d);
        if (!station) continue;
        addTie(station.point, -station.tangent.y, station.tangent.x, name);
      }
    };
    const addDivergingTurnoutTieStations = () => {
      const minSeparation = Math.max(geom.gauge * .42, 2.4 * scale);
      const branchLength = polylineLength(branch);
      for (let d = switchTieSpacing * .5; d <= branchLength + .001; d += switchTieSpacing) {
        const station = pointAtPolylineDistance(branch, d);
        if (!station) continue;
        const p = station.point;
        if (Math.abs(p.y) < minSeparation) continue;
        addTie(p, -station.tangent.y, station.tangent.x, 'Tomix switch diverging turnout tie');
      }
    };
    for (let i = 0; i < mainPath.length - 1; i++) {
      addLocalSegment(mainPath[i], mainPath[i + 1], Math.max(.5, geom.roadbedWidth), roadbedHeight, 0, baseMat, 'Tomix switch main roadbed');
    }
    for (let i = 0; i < branch.length - 1; i++) {
      addLocalSegment(branch[i], branch[i + 1], Math.max(.5, geom.roadbedWidth), roadbedHeight, 0, baseMat, 'Tomix switch curved roadbed');
    }
    addMainTieStations(mainPath, 'Tomix switch main tie');
    addDivergingTurnoutTieStations();
    addRailPath(mainRailA, 'Tomix switch main rail A');
    addRailPath(mainRailB, 'Tomix switch main rail B');
    addRailPath(branchRailA, 'Tomix switch diverging rail A');
    addRailPath(branchRailB, 'Tomix switch diverging rail B');
    addLocalSegment({ x: -geom.halfLength + geom.length * .34, y: 0 }, { x: -geom.halfLength + geom.length * .52, y: dir * geom.offset * .42 }, Math.max(.08, geom.railWidth * .72), Math.max(.08, railHeight * .7), railBase, railMat, 'Tomix switch point blade');
    return tagSite3DTrackAccessory(group, item);
  }

  function buildTrackBufferItem(item, bounds) {
    refreshTrackAccessoryAnchor(item);
    const selected = item.id === state.selectedTrackAccessoryId || isSiteObjectSelected('trackAccessory', item.id);
    const railMat = new THREE.MeshStandardMaterial({ color: selected ? 0xc8493a : 0x34312b, roughness: .48, metalness: .12 });
    const tieMat = new THREE.MeshStandardMaterial({ color: 0x8a6f43, roughness: .84, metalness: 0 });
    const baseMat = new THREE.MeshStandardMaterial({ color: 0xc7b084, roughness: .95, metalness: 0 });
    const bufferMat = new THREE.MeshStandardMaterial({ color: selected ? 0xc8493a : 0x6f6a5e, roughness: .76, metalness: .02 });
    const terminalMat = new THREE.MeshStandardMaterial({ color: 0x8a8a86, roughness: .72, metalness: .04 });
    const group = new THREE.Group();
    group.name = item.name || trackAccessoryLabel(item.kind);
    group.position.set(site3DScale(item.x) - bounds.cx, 0, site3DScale(item.y) - bounds.cy);
    group.rotation.y = -rad(item.rotationDeg || 0);
    const geom = trackBufferGeometrySite3D(item);
    const halfW = geom.width / 2;
    group.add(site3DAddEdges(site3DBox(geom.length * 1.35, .34, geom.width, baseMat, geom.length * .32, .12, 0), 0x8f7b55, .35));
    for (let x = -geom.length * .25; x < geom.length * .82; x += Math.max(geom.tieSpacing, 2)) {
      group.add(site3DBox(Math.max(.35, geom.tieSpacing * .15), .34, geom.width * .86, tieMat, x, .45, 0));
    }
    site3DBeam(group, { x: -geom.length * .35, y: .85, z: -geom.gauge / 2 }, { x: geom.length * .78, y: .85, z: -geom.gauge / 2 }, Math.max(.1, geom.railWidth / 2), railMat, 'Buffer rail A');
    site3DBeam(group, { x: -geom.length * .35, y: .85, z: geom.gauge / 2 }, { x: geom.length * .78, y: .85, z: geom.gauge / 2 }, Math.max(.1, geom.railWidth / 2), railMat, 'Buffer rail B');
    group.add(site3DAddEdges(site3DBox(geom.length * .22, 2.4, geom.width * .88, bufferMat, geom.length * .88, 1.4, 0), 0x4b4438, .4));
    group.add(site3DAddEdges(site3DBox(geom.length * .34, .6, geom.width * .96, bufferMat, geom.length * .82, 2.8, 0), 0x4b4438, .4));
    group.add(site3DBox(geom.length * .22, .35, geom.width * .22, bufferMat, geom.length * .64, 1.05, -geom.gauge / 2));
    group.add(site3DBox(geom.length * .22, .35, geom.width * .22, bufferMat, geom.length * .64, 1.05, geom.gauge / 2));
    if (trackBufferHasCatenaryTerminal(item)) {
      const x = geom.length * .55;
      const z = -halfW - 4;
      const h = Math.max(22, geom.terminalHeight);
      const w = 4.4;
      const addTerminalBeam = (a, b, r = .16, name = 'Catenary terminal truss') => site3DBeam(group, a, b, r, terminalMat, name);
      group.add(site3DAddEdges(site3DBox(7, .65, 5, terminalMat, x, .35, z), 0x6f6a5e, .35));
      addTerminalBeam({ x: x - w / 2, y: .8, z }, { x: x - w / 2, y: h, z }, .22, 'Terminal side post');
      addTerminalBeam({ x: x + w / 2, y: .8, z }, { x: x + w / 2, y: h, z }, .22, 'Terminal side post');
      addTerminalBeam({ x: x - w / 2, y: h, z }, { x: x + w / 2, y: h, z }, .2, 'Terminal top brace');
      for (let y = 6; y < h - 4; y += 7) {
        addTerminalBeam({ x: x - w / 2, y, z }, { x: x + w / 2, y: y + 4, z }, .13, 'Terminal diagonal brace');
        addTerminalBeam({ x: x + w / 2, y: y + 4, z }, { x: x - w / 2, y: y + 8, z }, .13, 'Terminal diagonal brace');
      }
      addTerminalBeam({ x, y: h * .72, z }, { x: x - 12, y: h * .68, z: z + 1.5 }, .14, 'Terminal wire arm');
      addTerminalBeam({ x, y: h * .52, z }, { x: x - 11, y: h * .48, z: z + 1.5 }, .14, 'Terminal wire arm');
      group.add(site3DBox(.9, .9, .9, terminalMat, x - 12, h * .68, z + 1.5));
      group.add(site3DBox(.9, .9, .9, terminalMat, x - 11, h * .48, z + 1.5));
    }
    return tagSite3DTrackAccessory(group, item);
  }

  function buildSimpleItem(item, bounds) {
    const selected = item.id === state.selectedTrackAccessoryId || isSiteObjectSelected('trackAccessory', item.id);
    const material = new THREE.MeshStandardMaterial({ color: selected ? 0xc8493a : 0x6f6a5e, roughness: .74, metalness: .04 });
    const group = new THREE.Group();
    group.name = item.name || trackAccessoryLabel(item.kind);
    group.position.set(site3DScale(item.x) - bounds.cx, 0, site3DScale(item.y) - bounds.cy);
    group.rotation.y = -rad(item.rotationDeg || 0);
    group.add(site3DAddEdges(site3DBox(4, 1, 4, material, 0, .5, 0), 0x4b4438, .35));
    group.add(site3DAddEdges(site3DBox(1, 10, 1, material, 0, 5.5, 0), 0x4b4438, .35));
    return tagSite3DTrackAccessory(group, item);
  }

  function buildTrackAccessoryGroup(bounds) {
    const group = new THREE.Group();
    group.name = 'Site Planner track items';
    (state.trackAccessories || []).forEach(raw => {
      const item = normalizeTrackAccessory(raw);
      if (item.hidden) return;
      const accessory = isCatenaryAccessoryKind(item.kind)
        ? buildCatenaryItem(item, bounds)
        : isTrackSwitchAccessoryKind(item.kind)
        ? buildTrackSwitchItem(item, bounds)
        : isTrackBufferAccessoryKind(item.kind)
        ? buildTrackBufferItem(item, bounds)
        : buildFallbackTrackAccessoryItem
        ? buildFallbackTrackAccessoryItem(item, bounds)
        : buildSimpleItem(item, bounds);
      if (accessory) group.add(accessory);
    });
    return group.children.length ? group : null;
  }

  return {
    buildSite3DCatenaryItem: buildCatenaryItem,
    buildSite3DTrackSwitchItem: buildTrackSwitchItem,
    buildSite3DTrackBufferItem: buildTrackBufferItem,
    buildSite3DTrackAccessoryGroup: buildTrackAccessoryGroup,
  };
}
