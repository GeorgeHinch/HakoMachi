import { dist, pointInPoly } from './geometry.js';
import { nearestPointOnRoadPath, roadHasSidewalk } from './road-geometry.js';

export function findRoadConnectionSnap(point, roads, {
  excludeRoadId = null,
  pointerType = 'mouse',
  viewScale = 1,
  normalizeRoad = road => road,
} = {}) {
  const coarse = pointerType === 'pen' || pointerType === 'touch';
  const tolerance = (coarse ? 20 : 14) / viewScale;
  let best = null;
  (roads || []).forEach(rawRoad => {
    const road = normalizeRoad(rawRoad);
    if (!road || road.id === excludeRoadId || road.hidden || road.mode !== 'centerline') return;
    const hit = nearestPointOnRoadPath(point, road, true);
    if (hit && hit.distance <= tolerance && (!best || hit.distance < best.distance)) best = hit;
  });
  return best;
}

export function snapRoadPointForConnection(point, roads, options = {}) {
  const hit = findRoadConnectionSnap(point, roads, options);
  return hit
    ? { x: hit.point.x, y: hit.point.y, connection: { roadId: hit.roadId, kind: hit.kind, pointIndex: hit.pointIndex ?? null } }
    : { x: point.x, y: point.y, connection: null };
}

export function setRoadEndpointConnection(road, index, snap) {
  if (!road || !snap || !Number.isInteger(index)) return;
  road.endpointConnections = road.endpointConnections || {};
  const key = index === 0 ? 'start' : (index === (road.pointsPx?.length || 0) - 1 ? 'end' : null);
  if (!key) return;
  if (snap.connection) road.endpointConnections[key] = snap.connection;
  else delete road.endpointConnections[key];
}

export function roadSurfaceAtPoint(point, roads, { normalizeRoad = road => road } = {}) {
  for (let index = (roads || []).length - 1; index >= 0; index--) {
    const road = normalizeRoad(roads[index]);
    if (!road || road.hidden) continue;
    if ((road.roadPolygonPx || []).length >= 3 && pointInPoly(point, road.roadPolygonPx)) return road;
  }
  return null;
}

export function roadEndpointJunctions(roads, {
  normalizeRoad = road => road,
  selectedRoadId = null,
} = {}) {
  const out = [];
  const seen = new Set();
  (roads || []).forEach(rawRoad => {
    const road = normalizeRoad(rawRoad);
    if (!road || road.hidden || road.mode !== 'centerline' || !road.pointsPx || road.pointsPx.length < 2) return;
    const endpoints = [
      { point: road.pointsPx[0], key: 'start' },
      { point: road.pointsPx[road.pointsPx.length - 1], key: 'end' },
    ];
    endpoints.forEach(endpoint => {
      let best = null;
      (roads || []).forEach(rawOther => {
        const other = normalizeRoad(rawOther);
        if (!other || other.id === road.id || other.hidden || other.mode !== 'centerline') return;
        const hit = nearestPointOnRoadPath(endpoint.point, other, true);
        const tolerance = Math.max(3, Math.min((road.widthPx || 20), (other.widthPx || 20)) * 0.35);
        if (hit && hit.distance <= tolerance && (!best || hit.distance < best.distance)) best = { ...hit, other };
      });
      if (!best) return;
      const x = (endpoint.point.x + best.point.x) / 2;
      const y = (endpoint.point.y + best.point.y) / 2;
      const key = `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`;
      if (seen.has(key)) return;
      seen.add(key);
      const roadRadius = Math.max((road.widthPx || 20), (best.other?.widthPx || 20)) * 0.58;
      const sidewalkWidth = Math.max(roadHasSidewalk(road) ? (road.sidewalkWidthPx || 0) : 0, roadHasSidewalk(best.other) ? (best.other.sidewalkWidthPx || 0) : 0);
      out.push({
        x,
        y,
        radius: roadRadius,
        sidewalkRadius: sidewalkWidth > 0 ? roadRadius + sidewalkWidth : 0,
        sidewalkWidth,
        hasSidewalkBulb: sidewalkWidth > 0,
        selected: road.id === selectedRoadId || best.other?.id === selectedRoadId,
      });
    });
  });
  return out;
}

export function roadJunctionPoints(roads, options = {}) {
  return roadEndpointJunctions(roads, options).map(junction => ({
    x: junction.x,
    y: junction.y,
    radius: Math.max(junction.radius || 0, junction.sidewalkRadius || 0),
  }));
}

export function isNearJunctionPoint(point, junctions, avoidPx) {
  return (junctions || []).some(junction => dist(point, junction) < Math.max(avoidPx, junction.radius || 0));
}
