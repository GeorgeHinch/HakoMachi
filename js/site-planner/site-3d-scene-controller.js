export function createSite3DSceneController({
  THREE,
  state,
  site3d,
  baseThicknessMm,
  initSite3D,
  site3DCameraSnapshot,
  clearSite3DHoverIndicator,
  disposeSite3DObject,
  site3DBounds,
  site3DBenchworkFootprintsMm,
  buildSite3DBase,
  buildSite3DReferenceImage,
  buildSite3DRoadGroup,
  buildSite3DTrackGroup,
  buildSite3DTrackAccessoryGroup,
  normalizeBuilding,
  syncBuildingMetrics,
  buildSite3DBuildingGroup,
  tagSite3DBuilding,
  isBuildingSelected,
  buildSite3DSelectionHelper,
  normalizeStlObject,
  buildSite3DStlObjectGroup,
  restoreSite3DCameraSnapshot,
  updateSite3DHoverIndicator,
  renderSite3D,
}) {
  function updateSite3D(options = {}) {
    if (state.viewMode !== '3d') return;
    const hadCamera = !!(site3d.initialized && site3d.camera);
    if (!initSite3D()) return;
    const shouldPreserveCamera = options.preserveCamera === true || (options.preserveCamera !== false && hadCamera);
    const cameraSnapshot = shouldPreserveCamera ? site3DCameraSnapshot() : null;
    clearSite3DHoverIndicator();
    while (site3d.root.children.length) {
      const child = site3d.root.children.pop();
      disposeSite3DObject(child);
    }
    const bounds = site3DBounds();
    site3d.bounds = bounds;
    const benchworkBaseCount = site3DBenchworkFootprintsMm().length;
    site3d.root.add(buildSite3DBase(bounds, baseThicknessMm));
    const referenceImage = buildSite3DReferenceImage(bounds);
    if (referenceImage) site3d.root.add(referenceImage);
    const roads = buildSite3DRoadGroup(bounds);
    if (roads) site3d.root.add(roads);
    const tracks = buildSite3DTrackGroup(bounds);
    if (tracks) site3d.root.add(tracks);
    const trackItems = buildSite3DTrackAccessoryGroup(bounds);
    if (trackItems) site3d.root.add(trackItems);
    if (!benchworkBaseCount) {
      const grid = new THREE.GridHelper(Math.max(bounds.width, bounds.depth), 20, 0x8a7f66, 0xcfc5aa);
      grid.position.y = .015;
      site3d.root.add(grid);
    }
    state.buildings.forEach(raw => {
      const building = normalizeBuilding(raw);
      syncBuildingMetrics(building);
      if (building.hidden) return;
      const group = buildSite3DBuildingGroup(building, bounds);
      if (!group) return;
      tagSite3DBuilding(group, building);
      site3d.root.add(group);
      if (isBuildingSelected(building.id)) {
        const helper = buildSite3DSelectionHelper(building, bounds);
        if (helper) site3d.root.add(helper);
      }
    });
    (state.stlObjects || []).forEach(raw => {
      const object = normalizeStlObject(raw);
      if (object.hidden) return;
      const group = buildSite3DStlObjectGroup(object, bounds);
      if (!group) return;
      site3d.root.add(group);
      if (object.id === state.selectedStlObjectId) {
        const helper = buildSite3DStlObjectGroup({ ...object, color: '#0f766e' }, bounds);
        if (helper) {
          helper.name = 'Selected STL object outline';
          helper.traverse?.(child => {
            if (!child.material) return;
            child.material.transparent = true;
            child.material.opacity = child.isMesh ? .12 : .95;
          });
          site3d.root.add(helper);
        }
      }
    });
    const radius = Math.max(bounds.width, bounds.depth, 60);
    site3d.camera.near = Math.max(.25, radius / 1000);
    site3d.camera.far = Math.max(800, radius * 8);
    if (!restoreSite3DCameraSnapshot(cameraSnapshot)) {
      site3d.camera.position.set(radius * .72, Math.max(70, radius * .58), radius * .82);
      site3d.camera.updateProjectionMatrix();
      if (site3d.controls) {
        site3d.controls.target.set(0, 0, 0);
        site3d.controls.update();
      } else {
        site3d.camera.lookAt(0, 0, 0);
      }
    }
    updateSite3DHoverIndicator();
    renderSite3D();
  }

  return { updateSite3D };
}
