export function createSite3DSceneUtils({
  state,
  site3DScale,
  normalizeBenchworkOutline,
  benchworkSamples,
  normalizeRoad,
  syncRoadMetrics,
  roadDisplayPolygons,
  shouldClipRoadsToBenchwork,
  normalizeTrack,
  trackPathSamples,
  normalizeTrackAccessory,
  refreshTrackAccessoryAnchor,
  normalizeBuilding,
  site3DBuildingFootprintMm,
  normalizeStlObject,
  stlObjectRect,
}) {
  function site3DBenchworkFootprintsMm() {
    return (state.benchworkOutlines || []).map(raw => {
      const benchwork = normalizeBenchworkOutline(raw);
      if (!benchwork || benchwork.hidden) return null;
      const points = benchworkSamples(benchwork, 24).map(point => ({ x: site3DScale(point.x), y: site3DScale(point.y) }));
      return points.length >= 3 ? points : null;
    }).filter(Boolean);
  }

  function site3DBounds() {
    const xs = [];
    const ys = [];
    if (state.image || state.imageMeta) {
      const width = Number(state.image?.naturalWidth || state.image?.width || state.imageMeta?.naturalWidthPx);
      const height = Number(state.image?.naturalHeight || state.image?.height || state.imageMeta?.naturalHeightPx);
      if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
        xs.push(0, site3DScale(width));
        ys.push(0, site3DScale(height));
      }
    }
    site3DBenchworkFootprintsMm().forEach(points => points.forEach(point => { xs.push(point.x); ys.push(point.y); }));
    state.roads.forEach(raw => {
      const road = normalizeRoad(raw);
      syncRoadMetrics(road);
      const add = point => { xs.push(site3DScale(point.x)); ys.push(site3DScale(point.y)); };
      const display = roadDisplayPolygons(road, { perCurve: 32, clipToBenchwork: shouldClipRoadsToBenchwork() });
      display.roadPolygons.forEach(polygon => polygon.forEach(add));
      display.sidewalkPolygons.forEach(sidewalk => (sidewalk.polygon || []).forEach(add));
    });
    (state.tracks || []).forEach(raw => {
      const track = normalizeTrack(raw);
      if (!track.hidden) trackPathSamples(track, 18).forEach(point => { xs.push(site3DScale(point.x)); ys.push(site3DScale(point.y)); });
    });
    (state.trackAccessories || []).forEach(raw => {
      const item = normalizeTrackAccessory(raw);
      refreshTrackAccessoryAnchor(item);
      if (!item.hidden) { xs.push(site3DScale(item.x)); ys.push(site3DScale(item.y)); }
    });
    state.buildings.forEach(raw => {
      const building = normalizeBuilding(raw);
      if (!building.hidden) site3DBuildingFootprintMm(building)?.forEach(point => { xs.push(point.x); ys.push(point.y); });
    });
    (state.stlObjects || []).forEach(raw => {
      const object = normalizeStlObject(raw);
      if (!object.hidden) stlObjectRect(object).forEach(point => { xs.push(site3DScale(point.x)); ys.push(site3DScale(point.y)); });
    });
    if (!xs.length || !ys.length) return { minX: -60, maxX: 60, minY: -40, maxY: 40, width: 120, depth: 80, cx: 0, cy: 0 };
    const width = Math.max(...xs) - Math.min(...xs);
    const depth = Math.max(...ys) - Math.min(...ys);
    const pad = Math.max(8, Math.min(60, Math.max(width, depth) * .06));
    const minX = Math.min(...xs) - pad;
    const maxX = Math.max(...xs) + pad;
    const minY = Math.min(...ys) - pad;
    const maxY = Math.max(...ys) + pad;
    return { minX, maxX, minY, maxY, width: Math.max(1, maxX - minX), depth: Math.max(1, maxY - minY), cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
  }

  function disposeSite3DObject(object) {
    if (!object) return;
    object.traverse?.(child => {
      child.geometry?.dispose?.();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.filter(Boolean).forEach(material => {
        Object.values(material).forEach(value => { if (value?.isTexture) value.dispose?.(); });
        material.dispose?.();
      });
    });
  }

  function site3DPlannerRotationY(building, options = {}) {
    if (options.geometryAlreadyInSiteCoordinates && building?.padType === 'polygon') return 0;
    return -(Number(building?.rotationDeg) || 0) * Math.PI / 180;
  }

  return { site3DBenchworkFootprintsMm, site3DBounds, disposeSite3DObject, site3DPlannerRotationY };
}
