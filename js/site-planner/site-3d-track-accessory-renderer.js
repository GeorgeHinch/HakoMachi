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

  function buildCrossingSignalItem(item, bounds) {
    const selected = item.id === state.selectedTrackAccessoryId || isSiteObjectSelected('trackAccessory', item.id);
    const yellowMat = new THREE.MeshStandardMaterial({ color: selected ? 0xc8493a : 0xf0b82f, roughness: .78, metalness: .02 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x23201c, roughness: .72, metalness: .04 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xd52522, emissive: 0x4a0504, roughness: .38, metalness: .02 });
    const lensOffMat = new THREE.MeshStandardMaterial({ color: 0x3a1715, roughness: .48, metalness: .02 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x6f6a5e, roughness: .68, metalness: .08 });
    const group = new THREE.Group();
    group.name = item.name || trackAccessoryLabel(item.kind);
    group.position.set(site3DScale(item.x) - bounds.cx, 0, site3DScale(item.y) - bounds.cy);
    group.rotation.y = -rad(item.rotationDeg || 0);
    const addBox = (w, h, d, x, y, z, mat = yellowMat, edge = 0x4b4438) => {
      const mesh = site3DAddEdges(site3DBox(w, h, d, mat, x, y, z), edge, .32);
      group.add(mesh);
      return mesh;
    };
    const addStripe = (x, y, z, rotation = 0) => {
      const stripe = site3DBox(1.3, .08, 7.6, blackMat, x, y, z);
      stripe.rotation.y = rotation;
      group.add(stripe);
    };
    addBox(6, .5, 5, 0, .25, 0, metalMat, 0x4b4438);
    addBox(.85, 24, .85, 0, 12, 0, yellowMat, 0x3a2b1e);
    for (let y = 4; y < 22; y += 5.2) addBox(.92, 2.3, .92, 0, y, 0, blackMat, 0x1d1712);
    [-4.1, 4.1].forEach((z, index) => {
      const head = addBox(2.8, 3.2, 2.2, 0, 13.5, z, blackMat, 0x1d1712);
      head.name = `${group.name} red warning lamp housing ${index + 1}`;
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, .22, 18), index === 0 || item.kind === 'occupancyLight' ? redMat : lensOffMat);
      lens.name = `${group.name} red warning lamp lens ${index + 1}`;
      lens.rotation.x = Math.PI / 2;
      lens.position.set(0, 13.5, z - 1.16);
      group.add(lens);
      const hood = site3DBox(.42, .42, 1.5, blackMat, 0, 15.15, z - 1.4);
      hood.name = 'Crossing lamp hood';
      group.add(hood);
    });
    if (item.kind === 'occupancyLight') {
      addBox(3, 3, 1.4, 0, 8.7, -4.2, redMat, 0x641b16);
      addBox(3, 3, 1.4, 0, 8.7, 4.2, redMat, 0x641b16);
    }
    const crossA = addBox(2.4, .42, 18, 0, 23.2, 0, yellowMat, 0x3a2b1e);
    const crossB = addBox(2.4, .42, 18, 0, 23.2, 0, yellowMat, 0x3a2b1e);
    crossA.name = 'Japanese crossing buck diagonal plate A';
    crossB.name = 'Japanese crossing buck diagonal plate B';
    crossA.rotation.x = rad(36);
    crossB.rotation.x = rad(-36);
    [-6, 0, 6].forEach(z => addStripe(0, 23.45, z, 0));
    return tagSite3DTrackAccessory(group, item);
  }

  function buildCrossingArmItem(item, bounds) {
    const selected = item.id === state.selectedTrackAccessoryId || isSiteObjectSelected('trackAccessory', item.id);
    const yellowMat = new THREE.MeshStandardMaterial({ color: selected ? 0xc8493a : 0xf0b82f, roughness: .78, metalness: .02 });
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x23201c, roughness: .72, metalness: .04 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xd52522, emissive: 0x4a0504, roughness: .38, metalness: .02 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x6f6a5e, roughness: .72, metalness: .08 });
    const group = new THREE.Group();
    group.name = item.name || trackAccessoryLabel(item.kind);
    group.position.set(site3DScale(item.x) - bounds.cx, 0, site3DScale(item.y) - bounds.cy);
    group.rotation.y = -rad(item.rotationDeg || 0);
    const addBox = (w, h, d, x, y, z, mat = yellowMat, edge = 0x4b4438) => {
      const mesh = site3DAddEdges(site3DBox(w, h, d, mat, x, y, z), edge, .32);
      group.add(mesh);
      return mesh;
    };
    addBox(6, .55, 5, 0, .28, 0, metalMat, 0x4b4438);
    addBox(1, 17, 1, 0, 8.8, 0, yellowMat, 0x3a2b1e);
    [4.2, 9.4, 14.6].forEach(y => addBox(1.08, 2.4, 1.08, 0, y, 0, blackMat, 0x1d1712));
    addBox(4.8, 3.2, 3.2, 0, 8.5, -2.9, blackMat, 0x1d1712);
    const boomY = 13.4;
    const boom = addBox(39, .68, .68, 20, boomY, 0, yellowMat, 0x3a2b1e);
    boom.name = 'Japanese crossing striped barrier arm';
    for (let x = 4; x < 39; x += 7) {
      const stripe = site3DBox(2.4, .74, .74, blackMat, 0, 0, 0);
      stripe.name = 'Barrier arm black stripe';
      stripe.position.set(x, boomY + .01, 0);
      stripe.rotation.z = rad(18);
      group.add(stripe);
    }
    [-3.6, 3.6].forEach(z => {
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.95, .95, .24, 18), redMat);
      lamp.rotation.x = Math.PI / 2;
      lamp.position.set(0, 11.8, z);
      lamp.name = 'Crossing arm red warning lens';
      group.add(lamp);
      addBox(2.5, 2.5, 1.4, 0, 11.8, z, blackMat, 0x1d1712);
    });
    const crossA = addBox(13, .38, 2.2, 0, 18.8, -1.72, yellowMat, 0x3a2b1e);
    const crossB = addBox(13, .38, 2.2, 0, 18.8, -1.72, yellowMat, 0x3a2b1e);
    crossA.name = 'Crossing arm crossbuck diagonal plate A';
    crossB.name = 'Crossing arm crossbuck diagonal plate B';
    crossA.rotation.z = rad(36);
    crossB.rotation.z = rad(-36);
    const directionPanel = addBox(7.8, 1.65, .32, 0, 16.55, -1.9, yellowMat, 0x3a2b1e);
    directionPanel.name = 'Crossing arm direction indicator panel';
    [-1.6, 1.6].forEach(x => {
      const stripe = addBox(3.4, .28, .36, x, 16.55, -2.1, blackMat, 0x1d1712);
      stripe.name = 'Crossing arm direction indicator stripe';
      stripe.rotation.z = rad(-28);
    });
    return tagSite3DTrackAccessory(group, item);
  }

  function buildIntrusionDetectorItem(item, bounds) {
    const selected = item.id === state.selectedTrackAccessoryId || isSiteObjectSelected('trackAccessory', item.id);
    const baseMat = new THREE.MeshStandardMaterial({ color: selected ? 0xc8493a : 0x7d807e, roughness: .72, metalness: .08 });
    const housingMat = new THREE.MeshStandardMaterial({ color: selected ? 0xd96250 : 0xa6aaa8, roughness: .66, metalness: .06 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x222629, roughness: .55, metalness: .04 });
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x263b48, roughness: .2, metalness: .02, transparent: true, opacity: .78 });
    const beamMat = new THREE.MeshBasicMaterial({ color: 0x72a6bd, transparent: true, opacity: selected ? .45 : .24 });
    const group = new THREE.Group();
    group.name = item.name || trackAccessoryLabel(item.kind);
    group.position.set(site3DScale(item.x) - bounds.cx, 0, site3DScale(item.y) - bounds.cy);
    group.rotation.y = -rad(item.rotationDeg || 0);
    const addBox = (w, h, d, x, y, z, mat = housingMat, edge = 0x4b4438) => {
      const mesh = site3DAddEdges(site3DBox(w, h, d, mat, x, y, z), edge, .32);
      group.add(mesh);
      return mesh;
    };
    const faceDir = -1;
    const addDetectorHead = () => {
      const z = 0;
      addBox(5.6, .45, 4.4, 0, .23, z, baseMat, 0x4b4438).name = 'HB-type intrusion detector low concrete plinth';
      addBox(3.6, 1.8, 3.2, 0, 1.35, z, baseMat, 0x4b4438).name = 'HB-type intrusion detector short grey pedestal';
      const body = addBox(5.2, 3.4, 3.8, 0, 3.9, z, housingMat, 0x4b4438);
      body.name = 'HB-type level crossing obstruction detector grey sensor housing';
      const face = addBox(4.1, 2.45, .32, 0, 3.95, z + (faceDir * 2.08), darkMat, 0x151719);
      face.name = 'HB-type intrusion detector dark sensor face';
      [-1.25, 1.25].forEach(x => {
        const lens = new THREE.Mesh(new THREE.CylinderGeometry(.48, .48, .2, 18), glassMat);
        lens.name = 'HB-type intrusion detector optical sensor lens';
        lens.rotation.x = Math.PI / 2;
        lens.position.set(x, 4.05, z + (faceDir * 2.28));
        group.add(lens);
      });
      const hood = addBox(5.6, .28, 1.2, 0, 5.55, z + (faceDir * 1.72), housingMat, 0x4b4438);
      hood.name = 'HB-type intrusion detector shallow rain hood';
      const rear = addBox(3.2, 1.4, .24, 0, 3.9, z - (faceDir * 2.03), darkMat, 0x151719);
      rear.name = 'HB-type intrusion detector rear service panel';
    };
    addDetectorHead();
    const beamGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 4.05, faceDir * 2.55),
      new THREE.Vector3(0, 4.05, faceDir * 14),
    ]);
    const beam = new THREE.Line(beamGeo, beamMat);
    beam.name = 'HB-type intrusion detector obstruction detection beam';
    group.add(beam);
    const cable = site3DBeam(group, { x: -2.15, y: .48, z: 0 }, { x: -2.15, y: 3.05, z: 0 }, .08, darkMat, 'HB-type intrusion detector conduit');
    cable.name = 'HB-type intrusion detector conduit';
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
        : item.kind === 'signal' || item.kind === 'occupancyLight'
        ? buildCrossingSignalItem(item, bounds)
        : item.kind === 'crossingArm'
        ? buildCrossingArmItem(item, bounds)
        : item.kind === 'intrusionDetector'
        ? buildIntrusionDetectorItem(item, bounds)
        : buildSimpleItem(item, bounds);
      if (accessory) group.add(accessory);
    });
    return group.children.length ? group : null;
  }

  return {
    buildSite3DCatenaryItem: buildCatenaryItem,
    buildSite3DTrackSwitchItem: buildTrackSwitchItem,
    buildSite3DTrackBufferItem: buildTrackBufferItem,
    buildSite3DCrossingSignalItem: buildCrossingSignalItem,
    buildSite3DCrossingArmItem: buildCrossingArmItem,
    buildSite3DIntrusionDetectorItem: buildIntrusionDetectorItem,
    buildSite3DTrackAccessoryGroup: buildTrackAccessoryGroup,
  };
}
