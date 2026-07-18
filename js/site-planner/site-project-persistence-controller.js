export function createSiteProjectPersistenceController({
  state,
  canvas,
  normalizeBuilding,
  syncBuildingMetrics,
  normalizeBenchworkOutline,
  normalizeFabricRegion,
  normalizeStreetlight,
  normalizeStlObject,
  normalizeDrivingSide,
  imageMetaForProject,
  updateImagePortableStatus,
  formatBytes,
}) {
  function historySnapshot() {
    return JSON.stringify({
      imageMeta: state.imageMeta,
      imageOpacity: state.imageOpacity,
      imageLocked: state.imageLocked,
      pxPerMm: state.pxPerMm,
      calibrationLine: state.calibrationLine,
      lastCalibrationLine: state.lastCalibrationLine,
      buildings: state.buildings,
      roads: state.roads,
      tracks: state.tracks || [],
      trackAccessories: state.trackAccessories || [],
      roadFeatures: state.roadFeatures,
      roadDrivingSide: normalizeDrivingSide(state.roadDrivingSide),
      roadIntersectionDetails: state.roadIntersectionDetails,
      roadIntersectionOverrides: state.roadIntersectionOverrides || {},
      railCrossingOverrides: state.railCrossingOverrides || {},
      stlObjects: state.stlObjects || [],
      benchworkOutlines: state.benchworkOutlines,
      fabricRegions: state.fabricRegions,
      streetlights: state.streetlights,
      annotations: state.annotations,
      selectedId: state.selectedId,
      selectedIds: state.selectedIds,
      selectedSiteObjects: state.selectedSiteObjects || [],
      selectedRoadId: state.selectedRoadId,
      selectedRoadIntersectionId: state.selectedRoadIntersectionId,
      selectedRailCrossingId: state.selectedRailCrossingId,
      selectedTrackId: state.selectedTrackId,
      selectedTrackPointIndex: state.selectedTrackPointIndex,
      selectedTrackAccessoryId: state.selectedTrackAccessoryId,
      selectedStlObjectId: state.selectedStlObjectId,
      selectedBenchworkId: state.selectedBenchworkId,
      selectedFabricId: state.selectedFabricId,
      selectedStreetlightId: state.selectedStreetlightId,
      selectedAnnotationId: state.selectedAnnotationId,
      measureLine: state.measureLine,
    });
  }

  function makeProjectPayload(opts = {}) {
    state.buildings = state.buildings.map(normalizeBuilding);
    state.buildings.forEach(syncBuildingMetrics);
    state.benchworkOutlines.forEach(normalizeBenchworkOutline);
    state.fabricRegions.forEach(normalizeFabricRegion);
    state.streetlights.forEach(normalizeStreetlight);
    state.stlObjects = (state.stlObjects || []).map(normalizeStlObject);
    const includeImageDataUrl = opts.includeImageDataUrl !== false;
    return {
      app: 'HakoMachi Site Planner',
      version: 80,
      savedAt: new Date().toISOString(),
      portableProject: true,
      coordinateSystem: {
        type: 'imagePixels',
        origin: 'topLeft',
        imageWidthPx: state.image?.naturalWidth || state.image?.width || state.imageMeta?.naturalWidthPx || null,
        imageHeightPx: state.image?.naturalHeight || state.image?.height || state.imageMeta?.naturalHeightPx || null,
      },
      canvasViewport: (() => {
        const r = canvas.getBoundingClientRect();
        return { widthPx: r.width, heightPx: r.height };
      })(),
      image: imageMetaForProject(state.imageMeta, state.image, { includeDataUrl: includeImageDataUrl }),
      view: state.view,
      site3d: state.site3d,
      imageOpacity: state.imageOpacity,
      imageLocked: state.imageLocked,
      scale: { calibrated: !!state.pxPerMm, pxPerMm: state.pxPerMm, calibrationLine: state.calibrationLine, units: 'mm' },
      buildings: state.buildings,
      roads: state.roads,
      tracks: state.tracks || [],
      trackAccessories: state.trackAccessories || [],
      roadFeatures: state.roadFeatures,
      roadDrivingSide: normalizeDrivingSide(state.roadDrivingSide),
      roadIntersectionDetails: state.roadIntersectionDetails !== false,
      roadIntersectionOverrides: state.roadIntersectionOverrides || {},
      railCrossingOverrides: state.railCrossingOverrides || {},
      stlObjects: state.stlObjects || [],
      benchworkOutlines: state.benchworkOutlines,
      fabricRegions: state.fabricRegions,
      siteConstraints: [
        ...state.roads.map(r => ({ ...r, type: 'road' })),
        ...state.benchworkOutlines.map(b => ({ ...b, type: 'benchworkOutline' })),
        ...(state.stlObjects || []).map(o => ({ ...o, type: 'stlObject' })),
      ],
      streetlights: state.streetlights,
      annotations: state.annotations,
    };
  }

  function projectJson(opts = {}) {
    const includeImageDataUrl = opts.includeImageDataUrl === true;
    const payload = makeProjectPayload({ includeImageDataUrl });
    const manifestAssets = [];
    const manifestAssetPaths = new Set();
    function addManifestAsset(asset) {
      if (!asset?.path) return;
      const key = String(asset.path);
      if (manifestAssetPaths.has(key)) return;
      manifestAssetPaths.add(key);
      manifestAssets.push(asset);
    }
    if (opts.imageAsset && payload.image) {
      payload.image.asset = opts.imageAsset;
      addManifestAsset(opts.imageAsset);
    }
    if (Array.isArray(opts.hakoAssets)) {
      const byBuildingId = new Map(opts.hakoAssets.map(entry => [entry.buildingId, entry.asset]));
      payload.buildings = (payload.buildings || []).map(raw => {
        const b = structuredClone(raw);
        const asset = byBuildingId.get(b.id);
        if (asset && b.hakoFile) {
          b.hakoFile = { ...(b.hakoFile || {}), ...asset };
          delete b.hakoFile.dataText;
          delete b.hakoFile.parsedConfig;
          delete b.hakoFile.unavailable;
          delete b.hakoConfig;
        }
        addManifestAsset(b.hakoFile);
        return b;
      });
    }
    if (Array.isArray(opts.stlAssets)) {
      const byId = new Map(opts.stlAssets.filter(entry => entry.role !== 'source').map(entry => [entry.objectId, entry.asset]));
      const sourceById = new Map(opts.stlAssets.filter(entry => entry.role === 'source').map(entry => [`${entry.objectId}|${entry.sourceAssetId}`, entry.asset]));
      payload.stlObjects = (payload.stlObjects || []).map(raw => {
        const obj = structuredClone(raw);
        const asset = byId.get(obj.id);
        if (asset) {
          obj.asset = { ...(obj.asset || {}), ...asset };
          delete obj.asset.dataBase64;
        }
        addManifestAsset(obj.asset);
        obj.sourceAssets = Array.isArray(obj.sourceAssets) ? obj.sourceAssets.map(rawSource => {
          const source = structuredClone(rawSource);
          const sourceAsset = sourceById.get(`${obj.id}|${source.id}`);
          if (sourceAsset) {
            Object.assign(source, sourceAsset);
            delete source.dataBase64;
          }
          addManifestAsset(source);
          return source;
        }) : [];
        return obj;
      });
    }
    if (manifestAssets.length) {
      payload.assetManifest = {
        schema: 'hakomachi.site-assets',
        schemaVersion: 1,
        assets: manifestAssets,
      };
    }
    if (payload.image?.dataUrl) {
      updateImagePortableStatus(`Portable save: embedded original ${payload.image.naturalWidthPx || '?'} \u00d7 ${payload.image.naturalHeightPx || '?'} px image (${formatBytes(payload.image.dataUrlByteLength || 0)}).`);
    } else if (opts.imageAsset) {
      updateImagePortableStatus(`Portable save: reference image stored separately as ${opts.imageAsset.path}.`);
    } else if (state.imageMeta) {
      updateImagePortableStatus('Portable save warning: no embedded image data. Re-import the image before sharing this file.');
    }
    return payload;
  }

  return {
    historySnapshot,
    makeProjectPayload,
    projectJson,
  };
}
