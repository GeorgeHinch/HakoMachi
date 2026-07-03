import { pointInPoly, polyEdgeDistance } from './geometry.js';
import { rebuildRoadGeometry } from './road-geometry.js';

export function createRoadModelController({
  state,
  uid,
  mmToPx,
  pxToMm,
  currentScaleDivisor,
  presetModelMm,
  roadPresetByKey,
  sidewalkPresetByKey,
  lockedHitTolerance,
  hitRoadPoint,
  hitRoadCenterlineSegment,
}) {
  function normalizeRoad(road) {
    if (!road) return road;
    road.id = road.id || uid('road');
    road.name = road.name || `${road.mode === 'outline' ? 'Road Outline' : 'Road Centerline'} ${state.roads.length + 1}`;
    road.mode = road.mode || road.roadMode || 'centerline';
    road.pointsPx = Array.isArray(road.pointsPx) ? road.pointsPx.map(point => ({ x: Number(point.x) || 0, y: Number(point.y) || 0 })) : [];
    if (!road.pointsPx.length && Array.isArray(road.polygon)) road.pointsPx = road.polygon.map(point => ({ x: Number(point.x) || 0, y: Number(point.y) || 0 }));
    road.roadWidthPreset = road.roadWidthPreset || road.widthPreset || 'two_lane_local';
    road.widthMm = Number.isFinite(Number(road.widthMm)) ? Number(road.widthMm) : (presetModelMm(roadPresetByKey(road.roadWidthPreset), currentScaleDivisor()) || 40);
    road.widthPx = Number.isFinite(Number(road.widthPx)) ? Number(road.widthPx) : (state.pxPerMm ? mmToPx(road.widthMm) : 48);
    road.sidewalkSide = road.sidewalkSide || 'none';
    road.sidewalkWidthPreset = road.sidewalkWidthPreset || road.sidewalkPreset || 'standard';
    road.sidewalkWidthMm = Number.isFinite(Number(road.sidewalkWidthMm)) ? Number(road.sidewalkWidthMm) : (presetModelMm(sidewalkPresetByKey(road.sidewalkWidthPreset), currentScaleDivisor()) || 10);
    road.sidewalkWidthPx = Number.isFinite(Number(road.sidewalkWidthPx)) ? Number(road.sidewalkWidthPx) : (state.pxPerMm ? mmToPx(road.sidewalkWidthMm) : 10);
    road.locked = !!road.locked;
    road.hidden = !!road.hidden;
    road.color = road.color || '#6f6a5e';
    rebuildRoadGeometry(road);
    return road;
  }

  function syncRoadMetrics(road) {
    if (!road) return road;
    if (state.pxPerMm) {
      road.widthMm = pxToMm(road.widthPx || 0);
      road.sidewalkWidthMm = pxToMm(road.sidewalkWidthPx || 0);
      road.pointsMm = (road.pointsPx || []).map(point => ({ x: pxToMm(point.x), y: pxToMm(point.y) }));
      road.curvesMm = (road.curvesPx || []).map(curve => curve ? { x: pxToMm(curve.x), y: pxToMm(curve.y) } : null);
    }
    rebuildRoadGeometry(road);
    return road;
  }

  function selectedRoad() {
    return state.roads.find(road => road.id === state.selectedRoadId) || null;
  }

  function hitRoad(point, pointerType = 'mouse') {
    for (let index = state.roads.length - 1; index >= 0; index--) {
      const road = normalizeRoad(state.roads[index]);
      if (road.hidden) continue;
      if (road.locked) {
        const tolerance = lockedHitTolerance(pointerType);
        if (hitRoadPoint(point, road, pointerType) || hitRoadCenterlineSegment(point, road, pointerType)) return road;
        if ((road.roadPolygonPx || []).length >= 2 && polyEdgeDistance(point, road.roadPolygonPx) <= tolerance) return road;
        for (const sidewalk of (road.sidewalkPolygonsPx || [])) {
          if ((sidewalk.polygon || []).length >= 2 && polyEdgeDistance(point, sidewalk.polygon) <= tolerance) return road;
        }
        continue;
      }
      if (pointInPoly(point, road.roadPolygonPx || [])) return road;
      for (const sidewalk of (road.sidewalkPolygonsPx || [])) {
        if (pointInPoly(point, sidewalk.polygon || [])) return road;
      }
    }
    return null;
  }

  function moveRoad(road, dx, dy) {
    if (!road || road.locked) return;
    road.pointsPx = (road.pointsPx || []).map(point => ({ x: point.x + dx, y: point.y + dy }));
    road.curvesPx = (road.curvesPx || []).map(curve => curve ? { x: curve.x + dx, y: curve.y + dy } : null);
    rebuildRoadGeometry(road);
    syncRoadMetrics(road);
  }

  function createRoadCenterlineFromPoints(points) {
    const defaultRoadMm = presetModelMm(roadPresetByKey('two_lane_local'), currentScaleDivisor()) || 40;
    const defaultSidewalkMm = presetModelMm(sidewalkPresetByKey('standard'), currentScaleDivisor()) || 10;
    const road = normalizeRoad({
      id: uid('road'),
      name: `Road ${state.roads.length + 1}`,
      mode: 'centerline',
      pointsPx: (points || []).map(point => ({ x: point.x, y: point.y })),
      curvesPx: [],
      roadWidthPreset: 'two_lane_local',
      widthMm: defaultRoadMm,
      widthPx: state.pxPerMm ? mmToPx(defaultRoadMm) : 48,
      sidewalkSide: 'none',
      sidewalkWidthPreset: 'standard',
      sidewalkWidthMm: defaultSidewalkMm,
      sidewalkWidthPx: state.pxPerMm ? mmToPx(defaultSidewalkMm) : 10,
      color: '#6f6a5e',
    });
    syncRoadMetrics(road);
    return road;
  }

  function createRoadOutlineFromPoints(points) {
    return normalizeRoad({
      id: uid('road'),
      name: `Road Outline ${state.roads.length + 1}`,
      mode: 'outline',
      pointsPx: (points || []).map(point => ({ x: point.x, y: point.y })),
      widthMm: 0,
      widthPx: 0,
      sidewalkSide: 'none',
      sidewalkWidthMm: 0,
      sidewalkWidthPx: 0,
      color: '#6f6a5e',
    });
  }

  return {
    createRoadCenterlineFromPoints,
    createRoadOutlineFromPoints,
    hitRoad,
    moveRoad,
    normalizeRoad,
    selectedRoad,
    syncRoadMetrics,
  };
}
