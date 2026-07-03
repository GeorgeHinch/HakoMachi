import { closestPointOnSegment, distanceToSegment, dist } from './geometry.js';

export function quadPoint(a, c, b, t) {
  const mt = 1 - t;
  return {
    x: mt * mt * a.x + 2 * mt * t * c.x + t * t * b.x,
    y: mt * mt * a.y + 2 * mt * t * c.y + t * t * b.y,
  };
}

export function normalizeRoadCurves(road) {
  if (!road) return [];
  const count = Math.max(0, road.mode === 'outline' ? (road.pointsPx || []).length : (road.pointsPx || []).length - 1);
  const source = Array.isArray(road.curvesPx) ? road.curvesPx : (Array.isArray(road.curves) ? road.curves : []);
  road.curvesPx = [];
  for (let index = 0; index < count; index++) {
    const curve = source[index];
    road.curvesPx[index] = curve && Number.isFinite(Number(curve.x)) && Number.isFinite(Number(curve.y))
      ? { x: Number(curve.x), y: Number(curve.y) }
      : null;
  }
  return road.curvesPx;
}

export function roadCenterlineSamples(road, perCurve = 14) {
  if (!road || !Array.isArray(road.pointsPx) || road.pointsPx.length < 2) return [];
  normalizeRoadCurves(road);
  const samples = [];
  for (let index = 0; index < road.pointsPx.length - 1; index++) {
    const a = road.pointsPx[index];
    const b = road.pointsPx[index + 1];
    const c = road.curvesPx?.[index];
    if (index === 0) samples.push({ x: a.x, y: a.y });
    if (c) {
      for (let step = 1; step <= perCurve; step++) samples.push(quadPoint(a, c, b, step / perCurve));
    } else {
      samples.push({ x: b.x, y: b.y });
    }
  }
  return samples;
}

export function roadOutlineSamples(road, perCurve = 14) {
  if (!road || !Array.isArray(road.pointsPx) || road.pointsPx.length < 2) return [];
  normalizeRoadCurves(road);
  const points = road.pointsPx;
  const samples = [];
  for (let index = 0; index < points.length; index++) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    const c = road.curvesPx?.[index];
    if (index === 0) samples.push({ x: a.x, y: a.y });
    if (c) {
      for (let step = 1; step <= perCurve; step++) samples.push(quadPoint(a, c, b, step / perCurve));
    } else {
      samples.push({ x: b.x, y: b.y });
    }
  }
  return samples;
}

export function offsetPathPolygon(path, offsetPx) {
  if (!Array.isArray(path) || path.length < 2 || !Number.isFinite(offsetPx) || Math.abs(offsetPx) < 0.001) return [];
  const side = sign => path.map((point, index) => {
    const previous = path[Math.max(0, index - 1)];
    const next = path[Math.min(path.length - 1, index + 1)];
    const dx = next.x - previous.x;
    const dy = next.y - previous.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    return { x: point.x + nx * offsetPx * sign, y: point.y + ny * offsetPx * sign };
  });
  return side(1).concat(side(-1).reverse());
}

export function roadOffsetPolygon(pointsOrRoad, widthPx) {
  const path = Array.isArray(pointsOrRoad) ? pointsOrRoad : roadCenterlineSamples(pointsOrRoad);
  return offsetPathPolygon(path, (widthPx || 20) / 2);
}

export function roadSidewalkPolygons(road) {
  if (!road || road.mode !== 'centerline' || !Array.isArray(road.pointsPx) || road.pointsPx.length < 2) return [];
  const path = roadCenterlineSamples(road);
  const halfWidth = (road.widthPx || 20) / 2;
  const sidewalkWidth = road.sidewalkWidthPx || 0;
  const polygons = [];
  const strip = (sign, label) => {
    const inner = offsetPathPolygon(path, halfWidth * sign);
    const outer = offsetPathPolygon(path, (halfWidth + sidewalkWidth) * sign);
    if (!inner.length || !outer.length) return null;
    return { side: label, polygon: inner.slice(0, path.length).concat(outer.slice(0, path.length).reverse()) };
  };
  if (sidewalkWidth > 0 && (road.sidewalkSide === 'left' || road.sidewalkSide === 'both')) {
    const polygon = strip(1, 'left');
    if (polygon) polygons.push(polygon);
  }
  if (sidewalkWidth > 0 && (road.sidewalkSide === 'right' || road.sidewalkSide === 'both')) {
    const polygon = strip(-1, 'right');
    if (polygon) polygons.push(polygon);
  }
  return polygons;
}

export function rebuildRoadGeometry(road) {
  if (!road) return road;
  normalizeRoadCurves(road);
  if (road.mode === 'outline') {
    road.roadPolygonPx = roadOutlineSamples(road);
    road.sidewalkPolygonsPx = [];
    return road;
  }
  road.roadCenterlineSamplesPx = roadCenterlineSamples(road);
  road.roadPolygonPx = roadOffsetPolygon(road, road.widthPx || 20);
  road.sidewalkPolygonsPx = roadSidewalkPolygons(road);
  return road;
}

export function roadEdgePaths(road) {
  const path = road.roadCenterlineSamplesPx || roadCenterlineSamples(road);
  if (!Array.isArray(path) || path.length < 2) return { left: [], right: [] };
  const halfWidth = (road.widthPx || 20) / 2;
  const left = [];
  const right = [];
  path.forEach((point, index) => {
    const previous = path[Math.max(0, index - 1)];
    const next = path[Math.min(path.length - 1, index + 1)];
    const dx = next.x - previous.x;
    const dy = next.y - previous.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    left.push({ x: point.x + nx * halfWidth, y: point.y + ny * halfWidth });
    right.push({ x: point.x - nx * halfWidth, y: point.y - ny * halfWidth });
  });
  return { left, right };
}

export function hitRoadCenterlineSegment(point, road, { pointerType = 'mouse', viewScale = 1 } = {}) {
  if (!road || road.mode !== 'centerline' || !Array.isArray(road.pointsPx) || road.pointsPx.length < 2) return null;
  const coarse = pointerType === 'pen' || pointerType === 'touch';
  const tolerance = (coarse ? 18 : 10) / viewScale;
  normalizeRoadCurves(road);
  let best = { distance: Infinity, index: -1 };
  for (let index = 0; index < road.pointsPx.length - 1; index++) {
    const a = road.pointsPx[index];
    const b = road.pointsPx[index + 1];
    const c = road.curvesPx?.[index];
    if (c) {
      let previous = a;
      for (let step = 1; step <= 16; step++) {
        const current = quadPoint(a, c, b, step / 16);
        const distance = distanceToSegment(point, previous, current);
        if (distance < best.distance) best = { distance, index };
        previous = current;
      }
    } else {
      const distance = distanceToSegment(point, a, b);
      if (distance < best.distance) best = { distance, index };
    }
  }
  return best.distance <= tolerance ? best : null;
}

export function hitRoadOutlineSegment(point, road, { pointerType = 'mouse', viewScale = 1 } = {}) {
  if (!road || road.mode !== 'outline' || !Array.isArray(road.pointsPx) || road.pointsPx.length < 2) return null;
  const coarse = pointerType === 'pen' || pointerType === 'touch';
  const tolerance = (coarse ? 18 : 10) / viewScale;
  normalizeRoadCurves(road);
  let best = { distance: Infinity, index: -1 };
  for (let index = 0; index < road.pointsPx.length; index++) {
    const a = road.pointsPx[index];
    const b = road.pointsPx[(index + 1) % road.pointsPx.length];
    const c = road.curvesPx?.[index];
    if (c) {
      let previous = a;
      for (let step = 1; step <= 16; step++) {
        const current = quadPoint(a, c, b, step / 16);
        const distance = distanceToSegment(point, previous, current);
        if (distance < best.distance) best = { distance, index };
        previous = current;
      }
    } else {
      const distance = distanceToSegment(point, a, b);
      if (distance < best.distance) best = { distance, index };
    }
  }
  return best.distance <= tolerance ? best : null;
}

export function hitRoadPoint(point, road, { pointerType = 'mouse', viewScale = 1 } = {}) {
  if (!road || !Array.isArray(road.pointsPx) || !road.pointsPx.length) return null;
  const coarse = pointerType === 'pen' || pointerType === 'touch';
  const tolerance = (coarse ? 18 : 11) / viewScale;
  let best = { distance: Infinity, index: -1 };
  road.pointsPx.forEach((roadPoint, index) => {
    const distance = dist(point, roadPoint);
    if (distance < best.distance) best = { distance, index };
  });
  return best.distance <= tolerance ? best : null;
}

export function nearestPointOnRoadPath(point, road, includeEndpoints = true) {
  if (!road || road.hidden || road.mode !== 'centerline') return null;
  const samples = roadCenterlineSamples(road, 20);
  if (!samples || samples.length < 2) return null;
  let best = { distance: Infinity, point: null, roadId: road.id, kind: 'segment' };
  if (includeEndpoints && road.pointsPx?.length) {
    [0, road.pointsPx.length - 1].forEach(index => {
      const endpoint = road.pointsPx[index];
      const distance = dist(point, endpoint);
      if (distance < best.distance) {
        best = { distance, point: { x: endpoint.x, y: endpoint.y }, roadId: road.id, kind: index === 0 ? 'endpointStart' : 'endpointEnd', pointIndex: index };
      }
    });
  }
  for (let index = 0; index < samples.length - 1; index++) {
    const hit = closestPointOnSegment(point, samples[index], samples[index + 1]);
    if (hit.distance < best.distance) best = { distance: hit.distance, point: hit.point, roadId: road.id, kind: 'segment' };
  }
  return best.point ? best : null;
}

export function pathTotalLength(path) {
  let length = 0;
  for (let index = 1; index < (path || []).length; index++) length += dist(path[index - 1], path[index]);
  return length;
}

export function pointAtPathDistance(path = [], target) {
  if (!path.length) return null;
  if (target <= 0) return { point: { ...path[0] }, tangent: path[1] ? Math.atan2(path[1].y - path[0].y, path[1].x - path[0].x) : 0, index: 0 };
  let accumulated = 0;
  for (let index = 1; index < path.length; index++) {
    const a = path[index - 1];
    const b = path[index];
    const segmentLength = dist(a, b);
    if (accumulated + segmentLength >= target) {
      const t = segmentLength ? (target - accumulated) / segmentLength : 0;
      return {
        point: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
        tangent: Math.atan2(b.y - a.y, b.x - a.x),
        index: index - 1,
      };
    }
    accumulated += segmentLength;
  }
  const a = path[Math.max(0, path.length - 2)];
  const b = path[path.length - 1];
  return { point: { ...b }, tangent: a ? Math.atan2(b.y - a.y, b.x - a.x) : 0, index: path.length - 1 };
}

export function lineIntersection(a, b, c, d) {
  const denominator = (a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x);
  if (Math.abs(denominator) < 1e-9) return null;
  const px = ((a.x * b.y - a.y * b.x) * (c.x - d.x) - (a.x - b.x) * (c.x * d.y - c.y * d.x)) / denominator;
  const py = ((a.x * b.y - a.y * b.x) * (c.y - d.y) - (a.y - b.y) * (c.x * d.y - c.y * d.x)) / denominator;
  const within = (p, q, r) => Math.min(p, q) - 1e-6 <= r && r <= Math.max(p, q) + 1e-6;
  if (within(a.x, b.x, px) && within(a.y, b.y, py) && within(c.x, d.x, px) && within(c.y, d.y, py)) return { x: px, y: py };
  return null;
}

export function roadHasSidewalk(road) {
  return !!(road && road.mode === 'centerline' && road.sidewalkSide && road.sidewalkSide !== 'none' && Number(road.sidewalkWidthPx) > 0);
}

export function sidewalkTotalWidthPx(road) {
  if (!roadHasSidewalk(road)) return 0;
  const sidewalkWidth = road.sidewalkWidthPx || 0;
  if (road.sidewalkSide === 'both') return sidewalkWidth * 2;
  if (road.sidewalkSide === 'left' || road.sidewalkSide === 'right') return sidewalkWidth;
  return 0;
}
