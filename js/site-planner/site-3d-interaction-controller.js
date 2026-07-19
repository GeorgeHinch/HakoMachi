export function createSite3DInteractionController({
  state,
  site3d,
  disposeSite3DObject,
  buildSite3DSelectionHelper,
  normalizeBuilding,
  selectTrackAccessory,
  clearPlanObjectSelection,
  selectStlObject,
  setBuildingSelection,
  renderList,
  renderRoads,
  renderStreetlights,
  renderSelected,
  updateHandoff,
  updateSite3D,
  setSidebarOpen,
}) {
  function renderSite3D() {
    if (site3d.renderer && site3d.scene && site3d.camera) site3d.renderer.render(site3d.scene, site3d.camera);
  }

  function clearSite3DHoverIndicator() {
    if (!site3d.hoverHelper) return false;
    site3d.root?.remove?.(site3d.hoverHelper);
    disposeSite3DObject(site3d.hoverHelper);
    site3d.hoverHelper = null;
    return true;
  }

  function updateSite3DHoverIndicator() {
    if (state.viewMode !== '3d' || !site3d.root || !site3d.bounds) return;
    clearSite3DHoverIndicator();
    const building = state.buildings.find(item => item.id === state.hoverBuildingId && !item.hidden);
    if (building) {
      const helper = buildSite3DSelectionHelper(normalizeBuilding(building), site3d.bounds, {
        hover: true,
        color: 0xd79631,
        opacity: .62,
        yOffset: .08,
      });
      if (helper) {
        helper.name = 'Hovered building outline';
        site3d.hoverHelper = helper;
        site3d.root.add(helper);
      }
    }
    renderSite3D();
  }

  function site3DCameraSnapshot() {
    if (!site3d.camera) return null;
    return {
      position: site3d.camera.position.clone(),
      quaternion: site3d.camera.quaternion.clone(),
      zoom: site3d.camera.zoom,
      target: site3d.controls?.target?.clone?.() || null,
    };
  }

  function restoreSite3DCameraSnapshot(snapshot) {
    if (!snapshot || !site3d.camera) return false;
    site3d.camera.position.copy(snapshot.position);
    site3d.camera.quaternion.copy(snapshot.quaternion);
    site3d.camera.zoom = snapshot.zoom;
    site3d.camera.updateProjectionMatrix();
    if (site3d.controls && snapshot.target) {
      site3d.controls.target.copy(snapshot.target);
      site3d.controls.update();
    }
    return true;
  }

  function site3DHitSelectionData(object) {
    const data = object?.userData || {};
    if (data.sitePlannerSelectionHelper || data.sitePlannerHoverHelper) return null;
    if (data.sitePlannerTrackAccessoryId) return { type: 'trackAccessory', id: data.sitePlannerTrackAccessoryId };
    if (data.sitePlannerRoadFeatureId) return { type: 'roadFeature', id: data.sitePlannerRoadFeatureId };
    if (data.sitePlannerStlObjectId) return { type: 'stlObject', id: data.sitePlannerStlObjectId };
    if (data.sitePlannerBuildingId) return { type: 'building', id: data.sitePlannerBuildingId };
    if (data.sitePlannerTrackId) return { type: 'track', id: data.sitePlannerTrackId };
    if (data.sitePlannerRoadId) return { type: 'road', id: data.sitePlannerRoadId };
    return null;
  }

  function selectSite3DHit(selection) {
    if (!selection?.id) return false;
    if (selection.type === 'trackAccessory') {
      const item = (state.trackAccessories || []).find(accessory => accessory.id === selection.id);
      if (!item) return false;
      selectTrackAccessory(item, { skipSync: true });
    } else if (selection.type === 'roadFeature') {
      const feature = (state.roadFeatures || []).find(item => item.id === selection.id);
      if (!feature) return false;
      clearPlanObjectSelection();
      state.selectedRoadFeatureId = feature.id;
    } else if (selection.type === 'stlObject') {
      const object = (state.stlObjects || []).find(item => item.id === selection.id);
      if (!object) return false;
      selectStlObject(object);
    } else if (selection.type === 'building') {
      const building = state.buildings.find(item => item.id === selection.id);
      if (!building) return false;
      clearPlanObjectSelection();
      setBuildingSelection([selection.id], selection.id);
    } else if (selection.type === 'track') {
      const track = (state.tracks || []).find(item => item.id === selection.id);
      if (!track) return false;
      clearPlanObjectSelection();
      state.selectedTrackId = track.id;
      state.selectedTrackPointIndex = null;
    } else if (selection.type === 'road') {
      const road = (state.roads || []).find(item => item.id === selection.id);
      if (!road) return false;
      clearPlanObjectSelection();
      state.selectedRoadId = road.id;
      if (road.mode !== 'outline') state.roadOutlineEditId = null;
    } else {
      return false;
    }
    renderList();
    renderRoads();
    renderStreetlights();
    renderSelected();
    updateHandoff();
    updateSite3D({ preserveCamera: true });
    setSidebarOpen(true);
    return true;
  }

  function handleSite3DPointerUp(event) {
    if (state.viewMode !== '3d' || !site3d.raycaster || !site3d.pointer || !site3d.camera || !site3d.renderer) return;
    if (event.button != null && event.button !== 0) return;
    const start = site3d.pointerDown;
    site3d.pointerDown = null;
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 6) return;
    const rect = site3d.renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    site3d.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    site3d.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    site3d.raycaster.setFromCamera(site3d.pointer, site3d.camera);
    const hits = site3d.raycaster.intersectObjects(site3d.root?.children || [], true);
    const selection = hits.map(hit => site3DHitSelectionData(hit.object)).find(Boolean);
    selectSite3DHit(selection);
  }

  return {
    renderSite3D,
    clearSite3DHoverIndicator,
    updateSite3DHoverIndicator,
    site3DCameraSnapshot,
    restoreSite3DCameraSnapshot,
    site3DHitSelectionData,
    selectSite3DHit,
    handleSite3DPointerUp,
  };
}
