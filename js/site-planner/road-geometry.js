import { closestPointOnSegment, distanceToSegment, dist, pointInPoly } from './geometry.js';

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

function roadPolygonForClipping(road) {
  if (!road || road.hidden) return [];
  if ((road.roadPolygonPx || []).length >= 3) return road.roadPolygonPx;
  if (road.mode === 'outline') return roadOutlineSamples(road);
  if (road.mode === 'centerline') return roadOffsetPolygon(road, road.widthPx || 20);
  return [];
}

function polygonsIntersect(a = [], b = []) {
  if (a.length < 3 || b.length < 3) return false;
  if (a.some(point => pointInPoly(point, b)) || b.some(point => pointInPoly(point, a))) return true;
  for (let ai = 0; ai < a.length; ai++) {
    const a0 = a[ai];
    const a1 = a[(ai + 1) % a.length];
    for (let bi = 0; bi < b.length; bi++) {
      if (lineIntersection(a0, a1, b[bi], b[(bi + 1) % b.length])) return true;
    }
  }
  return false;
}

function sidewalkSegmentPolygon(a, b, sign, halfWidth, sidewalkWidth) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const nx = -dy / length * sign;
  const ny = dx / length * sign;
  const innerA = { x: a.x + nx * halfWidth, y: a.y + ny * halfWidth };
  const innerB = { x: b.x + nx * halfWidth, y: b.y + ny * halfWidth };
  const outerB = { x: b.x + nx * (halfWidth + sidewalkWidth), y: b.y + ny * (halfWidth + sidewalkWidth) };
  const outerA = { x: a.x + nx * (halfWidth + sidewalkWidth), y: a.y + ny * (halfWidth + sidewalkWidth) };
  return [innerA, innerB, outerB, outerA];
}

function sidewalkRunPolygon(path, sign, halfWidth, sidewalkWidth) {
  const offsetSide = offset => path.map((point, index) => {
    const previous = path[Math.max(0, index - 1)];
    const next = path[Math.min(path.length - 1, index + 1)];
    const dx = next.x - previous.x;
    const dy = next.y - previous.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length * sign;
    const ny = dx / length * sign;
    return { x: point.x + nx * offset, y: point.y + ny * offset };
  });
  const inner = offsetSide(halfWidth);
  const outer = offsetSide(halfWidth + sidewalkWidth);
  return inner.concat(outer.reverse());
}

function resamplePathForSidewalkClipping(path, stepPx) {
  if (!Array.isArray(path) || path.length < 2) return path || [];
  const total = pathTotalLength(path);
  if (!Number.isFinite(total) || total <= stepPx) return path;
  const count = Math.max(1, Math.ceil(total / stepPx));
  const samples = [];
  for (let index = 0; index <= count; index++) {
    const hit = pointAtPathDistance(path, total * index / count);
    if (hit?.point) samples.push(hit.point);
  }
  return samples;
}

function normalizeAngle(angle) {
  const twoPi = Math.PI * 2;
  let out = angle % twoPi;
  if (out < 0) out += twoPi;
  return out;
}

function angularDelta(from, to) {
  return normalizeAngle(to - from);
}

function shortestAngularDelta(from, to) {
  let delta = angularDelta(from, to);
  if (delta > Math.PI) delta -= Math.PI * 2;
  return delta;
}

function tangentVector(angle) {
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function localSideVector(angle, side) {
  const sign = side === 'right' ? -1 : 1;
  return { x: -Math.sin(angle) * sign, y: Math.cos(angle) * sign };
}

function addVector(point, vector, amount = 1) {
  return { x: point.x + vector.x * amount, y: point.y + vector.y * amount };
}

function angleFrom(center, point) {
  return normalizeAngle(Math.atan2(point.y - center.y, point.x - center.x));
}

function polarPoint(center, angle, radius) {
  return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
}

function pointNear(a, b, tolerance = 1e-5) {
  return dist(a, b) <= tolerance;
}

function roadSideMatchesLocalSide(roadSide, localSide, sameDirection) {
  if (roadSide === 'both') return true;
  if (roadSide !== 'left' && roadSide !== 'right') return false;
  if (sameDirection) return roadSide === localSide;
  return roadSide !== localSide;
}

function sidewalkOnLocalSide(arm, localSide) {
  return !!(arm?.sidewalkWidthPx > 0 && roadSideMatchesLocalSide(arm.road?.sidewalkSide, localSide, arm.sameDirection));
}

function roadPathSegments(road) {
  const path = roadCenterlineSamples(road, 18);
  return (path || []).slice(0, -1).map((a, index) => {
    const b = path[index + 1];
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    return { road, roadId: road.id, a, b, angle };
  }).filter(segment => !pointNear(segment.a, segment.b));
}

function armFromSegment(segment, center, sameDirection) {
  const angle = sameDirection ? segment.angle : normalizeAngle(segment.angle + Math.PI);
  return {
    road: segment.road,
    roadId: segment.roadId,
    center,
    tangent: angle,
    sameDirection,
    halfWidthPx: Math.max(0.5, Number(segment.road?.widthPx) || 20) / 2,
    sidewalkWidthPx: Math.max(0, Number(segment.road?.sidewalkWidthPx) || 0),
  };
}

function armsForSegmentIntersection(segment, center) {
  const startHit = pointNear(center, segment.a);
  const endHit = pointNear(center, segment.b);
  if (startHit && !endHit) return [armFromSegment(segment, center, true)];
  if (endHit && !startHit) return [armFromSegment(segment, center, false)];
  return [armFromSegment(segment, center, true), armFromSegment(segment, center, false)];
}

function addUniqueArm(arms, arm) {
  if (!arm?.roadId) return;
  const duplicate = arms.some(existing => existing.roadId === arm.roadId && angularDelta(existing.tangent, arm.tangent) < 0.02);
  if (!duplicate) arms.push(arm);
}

function collectSidewalkIntersectionNodes(roads = []) {
  const centerlineRoads = (roads || []).filter(road => road && !road.hidden && road.mode === 'centerline' && (road.pointsPx || []).length >= 2);
  const segmentsByRoad = new Map(centerlineRoads.map(road => [road.id, roadPathSegments(road)]));
  const nodes = [];
  const nodeTolerance = Math.max(1, ...centerlineRoads.map(road => Number(road.widthPx) || 20)) * 0.04;
  const findNode = point => nodes.find(node => dist(node.center, point) <= nodeTolerance);

  for (let aIndex = 0; aIndex < centerlineRoads.length; aIndex++) {
    for (let bIndex = aIndex + 1; bIndex < centerlineRoads.length; bIndex++) {
      const aSegments = segmentsByRoad.get(centerlineRoads[aIndex].id) || [];
      const bSegments = segmentsByRoad.get(centerlineRoads[bIndex].id) || [];
      aSegments.forEach(aSegment => {
        bSegments.forEach(bSegment => {
          const hit = lineIntersection(aSegment.a, aSegment.b, bSegment.a, bSegment.b);
          if (!hit) return;
          let node = findNode(hit);
          if (!node) {
            node = { center: hit, arms: [] };
            nodes.push(node);
          }
          armsForSegmentIntersection(aSegment, hit).forEach(arm => addUniqueArm(node.arms, arm));
          armsForSegmentIntersection(bSegment, hit).forEach(arm => addUniqueArm(node.arms, arm));
        });
      });
    }
  }

  return nodes
    .map(node => ({ ...node, arms: node.arms.sort((a, b) => a.tangent - b.tangent) }))
    .filter(node => node.arms.length >= 2 && node.arms.some(arm => arm.sidewalkWidthPx > 0));
}

function sidewalkCornerPolygon(node, arm, nextArm, delta) {
  if (delta < 0.22 || delta > Math.PI * 1.45) return null;
  if (!sidewalkOnLocalSide(arm, 'left') || !sidewalkOnLocalSide(nextArm, 'right')) return null;
  const aForward = tangentVector(arm.tangent);
  const bForward = tangentVector(nextArm.tangent);
  const aSide = localSideVector(arm.tangent, 'left');
  const bSide = localSideVector(nextArm.tangent, 'right');
  const reach = Math.max(arm.halfWidthPx, nextArm.halfWidthPx, 4);
  const p1 = addVector(addVector(node.center, aForward, reach), aSide, arm.halfWidthPx);
  const p2 = addVector(addVector(node.center, bForward, reach), bSide, nextArm.halfWidthPx);
  const p3 = addVector(addVector(node.center, bForward, reach), bSide, nextArm.halfWidthPx + nextArm.sidewalkWidthPx);
  const p4 = addVector(addVector(node.center, aForward, reach), aSide, arm.halfWidthPx + arm.sidewalkWidthPx);
  const outerStart = angleFrom(node.center, p4);
  const outerSpan = shortestAngularDelta(outerStart, angleFrom(node.center, p3));
  const stepCount = Math.max(2, Math.min(8, Math.ceil(delta / (Math.PI / 10))));
  const sampleEdge = (startAngle, span, startRadius, endRadius) => {
    const points = [];
    for (let index = 0; index <= stepCount; index++) {
      const t = index / stepCount;
      points.push(polarPoint(node.center, startAngle + span * t, startRadius + (endRadius - startRadius) * t));
    }
    return points;
  };
  const outer = sampleEdge(outerStart, outerSpan, dist(node.center, p4), dist(node.center, p3));
  const polygon = [p1, p2].concat(outer.reverse()).filter((point, index, points) => index === 0 || !pointNear(point, points[index - 1], 0.01));
  if (polygon.length < 3 || Math.abs(polygonAreaSigned(polygon)) < 0.5) return null;
  return {
    side: 'intersection',
    polygon: polygonAreaSigned(polygon) < 0 ? polygon.reverse() : polygon,
    clipped: true,
    merged: true,
    kind: 'intersectionSidewalkCorner',
    ownerRoadId: arm.roadId,
    fromRoadId: arm.roadId,
    toRoadId: nextArm.roadId,
  };
}

function polygonAreaSigned(points = []) {
  let area = 0;
  for (let index = 0; index < points.length; index++) {
    const a = points[index];
    const b = points[(index + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}

function intersectionSidewalkCornerPolygons(road, roads = []) {
  if (!road?.id || !Array.isArray(roads) || roads.length <= 1) return [];
  const corners = [];
  collectSidewalkIntersectionNodes(roads).forEach(node => {
    const arms = node.arms || [];
    arms.forEach((arm, index) => {
      const nextArm = arms[(index + 1) % arms.length];
      const delta = angularDelta(arm.tangent, nextArm.tangent);
      const corner = sidewalkCornerPolygon(node, arm, nextArm, delta);
      if (corner && corner.ownerRoadId === road.id) corners.push(corner);
    });
  });
  return corners;
}

export function clippedRoadSidewalkPolygons(road, roads = []) {
  const base = roadSidewalkPolygons(road);
  if (!base.length || !Array.isArray(roads) || roads.length <= 1) return base;
  const clippingPolygons = roads
    .filter(other => other && other.id !== road.id)
    .map(roadPolygonForClipping)
    .filter(polygon => polygon.length >= 3);
  if (!clippingPolygons.length || road.mode !== 'centerline') return base;
  const halfWidth = (road.widthPx || 20) / 2;
  const sidewalkWidth = road.sidewalkWidthPx || 0;
  const path = resamplePathForSidewalkClipping(roadCenterlineSamples(road), Math.max(4, Math.min(18, halfWidth, sidewalkWidth || 10)));
  if (path.length < 2) return base;
  const sides = [];
  if (sidewalkWidth > 0 && (road.sidewalkSide === 'left' || road.sidewalkSide === 'both')) sides.push({ sign: 1, side: 'left' });
  if (sidewalkWidth > 0 && (road.sidewalkSide === 'right' || road.sidewalkSide === 'both')) sides.push({ sign: -1, side: 'right' });
  const kept = [];
  let clipped = false;
  sides.forEach(({ sign, side }) => {
    let runStart = null;
    const flushRun = endIndex => {
      if (runStart === null) return;
      const runPath = path.slice(runStart, endIndex + 1);
      if (runPath.length >= 2) kept.push({ side, polygon: sidewalkRunPolygon(runPath, sign, halfWidth, sidewalkWidth), clipped: true, segmentIndex: runStart });
      runStart = null;
    };
    for (let index = 0; index < path.length - 1; index++) {
      const polygon = sidewalkSegmentPolygon(path[index], path[index + 1], sign, halfWidth, sidewalkWidth);
      const blocked = clippingPolygons.some(clip => polygonsIntersect(polygon, clip));
      if (blocked) {
        clipped = true;
        flushRun(index);
      } else {
        if (runStart === null) runStart = index;
      }
    }
    flushRun(path.length - 1);
  });
  const clippedStrips = clipped ? kept : base;
  const corners = intersectionSidewalkCornerPolygons(road, roads);
  return corners.length ? clippedStrips.concat(corners) : clippedStrips;
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
      const neighbor = index === 0 ? road.pointsPx[1] : road.pointsPx[index - 1];
      const tangent = neighbor ? Math.atan2((index === 0 ? neighbor.y - endpoint.y : endpoint.y - neighbor.y), (index === 0 ? neighbor.x - endpoint.x : endpoint.x - neighbor.x)) : 0;
      const distance = dist(point, endpoint);
      if (distance < best.distance) {
        best = { distance, point: { x: endpoint.x, y: endpoint.y }, tangent, roadId: road.id, kind: index === 0 ? 'endpointStart' : 'endpointEnd', pointIndex: index };
      }
    });
  }
  for (let index = 0; index < samples.length - 1; index++) {
    const hit = closestPointOnSegment(point, samples[index], samples[index + 1]);
    if (hit.distance < best.distance) {
      best = {
        distance: hit.distance,
        point: hit.point,
        tangent: Math.atan2(samples[index + 1].y - samples[index].y, samples[index + 1].x - samples[index].x),
        roadId: road.id,
        kind: 'segment',
      };
    }
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
