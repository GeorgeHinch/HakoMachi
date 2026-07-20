export function createSiteProjectLoadController({
  windowRef,
  documentRef,
  state,
  canvas,
  getElement,
  setAutosaveSuppressed,
  restoreProjectView,
  applySite3DSettings,
  syncSite3DControls,
  wrap,
  collectProjectBuildings,
  footprintLoadMessage,
  savedImageDimensions,
  normalizeRoad,
  normalizeTrack,
  normalizeTrackAccessory,
  migrateLoadedRoadFeatures,
  normalizeDrivingSide,
  normalizeStlObject,
  normalizeBenchworkOutline,
  normalizeFabricRegion,
  normalizeStreetlight,
  clearBuildingSelection,
  setImageStatus,
  updateImagePortableStatus,
  scaleLoadedPixelGeometry,
  loadAlignmentMessage,
  fitImage,
  syncAll,
  resetHistory,
  updateAutosaveStatus,
}) {
  function loadProject(project, opts = {}) {
    setAutosaveSuppressed(true);
    state.image = null;
    state.imageMeta = project.image || null;
    state.imageOpacity = Number.isFinite(project.imageOpacity) ? project.imageOpacity : (state.imageMeta?.opacity ?? state.imageOpacity ?? .75);
    state.imageLocked = project.imageLocked ?? state.imageLocked ?? true;
    state.view = restoreProjectView(project, canvas.getBoundingClientRect()) || state.view;
    state.viewMode = '2d';
    applySite3DSettings(project.site3d || {});
    syncSite3DControls();
    wrap.classList.remove('view3d');
    documentRef.querySelector('.sitePlannerApp')?.classList.remove('view3d');
    state.pxPerMm = project.scale?.pxPerMm || null;
    state.calibrationLine = project.scale?.calibrationLine || null;
    state.lastCalibrationLine = state.calibrationLine;
    const loadedBuildingSet = collectProjectBuildings(project);
    state.buildings = loadedBuildingSet.buildings;
    const loadFootprintMessage = footprintLoadMessage(project, state.buildings.length, loadedBuildingSet.source);
    const savedDims = savedImageDimensions(project);
    const loadedRoads = Array.isArray(project.roads) ? project.roads : (Array.isArray(project.siteConstraints) ? project.siteConstraints.filter(item => item && item.type === 'road') : []);
    state.roads = loadedRoads.map(normalizeRoad);
    state.tracks = (Array.isArray(project.tracks) ? project.tracks : []).map(normalizeTrack);
    state.trackAccessories = (Array.isArray(project.trackAccessories) ? project.trackAccessories : []).map(normalizeTrackAccessory);
    state.roadFeatures = migrateLoadedRoadFeatures(project.roadFeatures);
    state.roadDrivingSide = normalizeDrivingSide(project.roadDrivingSide);
    state.roadIntersectionDetails = project.roadIntersectionDetails !== false;
    state.roadIntersectionOverrides = project.roadIntersectionOverrides && typeof project.roadIntersectionOverrides === 'object' ? structuredClone(project.roadIntersectionOverrides) : {};
    state.generatedRoadIntersections = [];
    state.railCrossingOverrides = project.railCrossingOverrides && typeof project.railCrossingOverrides === 'object' ? structuredClone(project.railCrossingOverrides) : {};
    state.generatedRailCrossings = [];
    const loadedStlObjects = Array.isArray(project.stlObjects) ? project.stlObjects : (Array.isArray(project.siteObjects) ? project.siteObjects.filter(item => item && (item.type === 'stl' || item.type === 'stlObject' || item.kind === 'stl')) : (Array.isArray(project.siteConstraints) ? project.siteConstraints.filter(item => item && (item.type === 'stlObject' || item.type === 'stl' || item.kind === 'stl')) : []));
    state.stlObjects = loadedStlObjects.map(normalizeStlObject);
    const loadedBenchworks = Array.isArray(project.benchworkOutlines) ? project.benchworkOutlines : (Array.isArray(project.siteConstraints) ? project.siteConstraints.filter(item => item && (item.type === 'benchworkOutline' || item.type === 'benchwork' || item.constraintType === 'benchworkOutline')) : []);
    state.benchworkOutlines = loadedBenchworks.map(normalizeBenchworkOutline);
    state.fabricRegions = (project.fabricRegions || []).map(normalizeFabricRegion);
    state.streetlights = (project.streetlights || []).map(normalizeStreetlight);
    state.annotations = project.annotations || [];
    clearBuildingSelection();
    state.selectedRoadId = null;
    state.selectedRoadIntersectionId = null;
    state.selectedTrackId = null;
    state.selectedTrackPointIndex = null;
    state.selectedTrackAccessoryId = null;
    state.selectedRailCrossingId = null;
    state.selectedStlObjectId = null;
    state.selectedBenchworkId = null;
    state.selectedStreetlightId = null;
    state.selectedAnnotationId = null;
    if (getElement('opacity')) getElement('opacity').value = String(state.imageOpacity);
    if (getElement('imageLockBtn')) getElement('imageLockBtn').textContent = state.imageLocked ? 'Locked' : 'Unlocked';

    const completeLoad = () => {
      setAutosaveSuppressed(false);
      syncAll({ skipDirty: true });
      resetHistory(opts.fromAutosave ? 'autosave restored' : 'project loaded');
    };
    if (state.imageMeta?.dataUrl) {
      const image = new windowRef.Image();
      image.onload = () => {
        state.image = image;
        const loadedW = image.naturalWidth || image.width;
        const loadedH = image.naturalHeight || image.height;
        const savedW = savedDims.w || state.imageMeta.naturalWidthPx;
        const savedH = savedDims.h || state.imageMeta.naturalHeightPx;
        if (savedW && savedH && (loadedW !== savedW || loadedH !== savedH)) {
          scaleLoadedPixelGeometry(state, loadedW / savedW, loadedH / savedH);
          setImageStatus(loadAlignmentMessage(state.buildings.length, savedW, savedH, loadedW, loadedH, true), 'warning');
          updateImagePortableStatus('Portable image warning: loaded pixel dimensions differed from saved metadata, so planner geometry was remapped to the restored image.');
        } else {
          setImageStatus(loadAlignmentMessage(state.buildings.length, savedW || loadedW, savedH || loadedH, loadedW, loadedH, false), 'okText');
          state.imageMeta.naturalWidthPx = loadedW;
          state.imageMeta.naturalHeightPx = loadedH;
          state.imageMeta.pixelDimensionsVerifiedOnLoad = true;
          updateImagePortableStatus();
        }
        if (loadFootprintMessage && state.buildings.length === 0) setImageStatus(loadFootprintMessage, 'warning');
        if (!project.view) fitImage();
        completeLoad();
      };
      image.onerror = () => {
        setImageStatus('Project loaded, but the embedded image could not be decoded.', 'warning');
        updateImagePortableStatus('Portable image error: embedded image could not be decoded.');
        if (loadFootprintMessage) setImageStatus(loadFootprintMessage, 'warning');
        completeLoad();
      };
      image.src = state.imageMeta.dataUrl;
    } else {
      if (state.imageMeta) {
        if (state.imageMeta.assetLoadError) {
          setImageStatus(`Referenced image asset could not be loaded: ${state.imageMeta.assetLoadError}`, 'warning');
          updateImagePortableStatus('Portable image warning: referenced image asset could not be loaded.');
        } else {
          setImageStatus('Project loaded without embedded image data. Re-import the original image to see the reference layer.', 'warning');
          updateImagePortableStatus('Portable save warning: this project has image metadata but no embedded image data.');
        }
      } else {
        setImageStatus('No image loaded.', 'muted');
        updateImagePortableStatus();
      }
      if (loadFootprintMessage) setImageStatus(loadFootprintMessage, 'warning');
      completeLoad();
    }
    state.dirty = false;
    state.dirtySinceManualSave = !!opts.dirtySinceManualSave;
    updateAutosaveStatus(opts.fromAutosave ? 'Autosave: restored' : 'Autosave: loaded');
    setTimeout(() => updateAutosaveStatus(), 1200);
  }

  return { loadProject };
}
