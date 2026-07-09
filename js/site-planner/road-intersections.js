import { distanceToSegment, dist, pointInPoly } from './geometry.js';
import { nearestPointOnRoadPath, pointAtPathDistance, roadCenterlineSamples, roadHasSidewalk } from './road-geometry.js';

const DEFAULTS = Object.freeze({
  endpointSnapPx: 8,
  clusterPx: 18,
  curbRadiusFactor: 0.85,
  curbRadiusMinPx: 8,
  sidewalkBulbFactor: 0.55,
  crosswalkOffsetFactor: 1.55,
  crosswalkWidthFactor: 0.45,
  stopBarOffsetFactor: 1.95,
  stopBarDepthFactor: 0.12,
  stopBarLaneWidthFactor: 0.44,
  stopBarLaneScope: 'inboundLane',
  drivingSide: 'left',
  tactileDepthFactor: 0.28,
});

function finitePoint(point) {
  return point && Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y));
}

function clonePoint(point) {
  return { x: Number(point.x) || 0, y: Number(point.y) || 0 };
}

function normalizeOptions(options = {}) {
  return { ...DEFAULTS, ...options };
}

function tangentFromSamples(samples, index, towardNode = true) {
  if (!samples || samples.length < 2) return 0;
  const a = samples[Math.max(0, index - 1)];
  const b = samples[Math.min(samples.length - 1, index + 1)];
  let angle = Math.atan2((b?.y || 0) - (a?.y || 0), (b?.x || 0) - (a?.x || 0));
  if (towardNode) angle += Math.PI;
  return normalizeAngle(angle);
}

function normalizeAngle(angle) {
  const twoPi = Math.PI * 2;
  let out = angle % twoPi;
  if (out < 0) out += twoPi;
  return out;
}

function angularDelta(a, b) {
  const diff = Math.abs(normalizeAngle(a) - normalizeAngle(b));
  return Math.min(diff, Math.PI * 2 - diff);
}

function unit(angle) {
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function sideVector(angle) {
  return { x: -Math.sin(angle), y: Math.cos(angle) };
}

function normalizeDrivingSide(value) {
  return value === 'right' ? 'right' : 'left';
}

function stopBarLaneSide(scope, drivingSide) {
  if (scope === 'fullRoad' || scope === 'bothDirections') return 'both';
  if (scope === 'leftLane' || scope === 'leftInboundLane') return 'left';
  if (scope === 'rightLane' || scope === 'rightInboundLane') return 'right';
  return normalizeDrivingSide(drivingSide);
}

function laneSideSign(laneSide) {
  return laneSide === 'right' ? -1 : 1;
}

function pointInOrOnPolygon(point, polygon = [], tolerance = 0.75) {
  if (!finitePoint(point) || polygon.length < 3) return false;
  if (pointInPoly(point, polygon)) return true;
  for (let index = 0; index < polygon.length; index++) {
    if (distanceToSegment(point, polygon[index], polygon[(index + 1) % polygon.length]) <= tolerance) return true;
  }
  return false;
}

function stopBarFitsRoad(stopBar, road) {
  const polygon = road?.roadPolygonPx || [];
  if (polygon.length < 3) return true;
  return (stopBar.corners || []).every(corner => pointInOrOnPolygon(corner, polygon));
}

function add(point, vector, amount = 1) {
  return { x: point.x + vector.x * amount, y: point.y + vector.y * amount };
}

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function armKey(arm) {
  return `${arm.roadId}:${arm.endpoint}`;
}

function roadWidth(road) {
  return Math.max(1, Number(road?.widthPx) || 20);
}

function sidewalkWidth(road) {
  return roadHasSidewalk(road) ? Math.max(0, Number(road?.sidewalkWidthPx) || 0) : 0;
}

function endpointDescriptors(road, normalizeRoad = item => item) {
  const normalized = normalizeRoad(road);
  if (!normalized || normalized.hidden || normalized.mode !== 'centerline' || !Array.isArray(normalized.pointsPx) || normalized.pointsPx.length < 2) return [];
  const samples = roadCenterlineSamples(normalized, 18);
  const first = normalized.pointsPx[0];
  const last = normalized.pointsPx[normalized.pointsPx.length - 1];
  return [
    {
      road: normalized,
      roadId: normalized.id,
      endpoint: 'start',
      pointIndex: 0,
      point: clonePoint(first),
      widthPx: roadWidth(normalized),
      sidewalkWidthPx: sidewalkWidth(normalized),
      tangent: tangentFromSamples(samples, 0, false),
    },
    {
      road: normalized,
      roadId: normalized.id,
      endpoint: 'end',
      pointIndex: normalized.pointsPx.length - 1,
      point: clonePoint(last),
      widthPx: roadWidth(normalized),
      sidewalkWidthPx: sidewalkWidth(normalized),
      tangent: tangentFromSamples(samples, samples.length - 1, true),
    },
  ];
}

function clusterEndpoints(endpoints, options) {
  const clusters = [];
  endpoints.forEach(endpoint => {
    let best = null;
    clusters.forEach(cluster => {
      const distance = dist(endpoint.point, cluster.center);
      if (distance <= options.clusterPx && (!best || distance < best.distance)) best = { cluster, distance };
    });
    if (best) {
      best.cluster.arms.push(endpoint);
      best.cluster.center = averagePoints(best.cluster.arms.map(arm => arm.point));
    } else {
      clusters.push({ center: clonePoint(endpoint.point), arms: [endpoint] });
    }
  });
  return clusters;
}

function averagePoints(points) {
  const count = points.length || 1;
  return points.reduce((sum, point) => ({ x: sum.x + point.x / count, y: sum.y + point.y / count }), { x: 0, y: 0 });
}

function addSegmentArms(clusters, roads, options, normalizeRoad) {
  clusters.forEach(cluster => {
    const seen = new Set((cluster.arms || []).map(armKey));
    (roads || []).forEach(rawRoad => {
      const road = normalizeRoad(rawRoad);
      if (!road || road.hidden || road.mode !== 'centerline' || !Array.isArray(road.pointsPx) || road.pointsPx.length < 2) return;
      if ((cluster.arms || []).some(arm => arm.roadId === road.id)) return;
      const hit = nearestPointOnRoadPath(cluster.center, road, false);
      if (!hit || hit.distance > Math.max(options.endpointSnapPx, roadWidth(road) * 0.35)) return;
      const key = `${road.id}:through`;
      if (seen.has(key)) return;
      const samples = roadCenterlineSamples(road, 18);
      const nearestIndex = Math.max(0, Math.min(samples.length - 1, hit.index || 0));
      const tangent = tangentFromSamples(samples, nearestIndex, false);
      const reverseTangent = normalizeAngle(tangent + Math.PI);
      cluster.arms.push({ road, roadId: road.id, endpoint: 'throughA', pointIndex: null, point: clonePoint(hit.point), widthPx: roadWidth(road), sidewalkWidthPx: sidewalkWidth(road), tangent });
      cluster.arms.push({ road, roadId: road.id, endpoint: 'throughB', pointIndex: null, point: clonePoint(hit.point), widthPx: roadWidth(road), sidewalkWidthPx: sidewalkWidth(road), tangent: reverseTangent });
      seen.add(key);
    });
  });
  return clusters;
}

export function classifyIntersection(arms) {
  const count = arms?.length || 0;
  if (count <= 1) return 'dead-end';
  if (count === 2) {
    const delta = angularDelta(arms[0].tangent, arms[1].tangent);
    return Math.abs(delta - Math.PI) < Math.PI / 6 ? 'straight-join' : 'corner';
  }
  if (count === 3) return 't-junction';
  if (count === 4) return 'cross-junction';
  return 'multi-junction';
}

export function buildIntersectionNode(cluster, index, options = {}) {
  const opts = normalizeOptions(options);
  const arms = (cluster.arms || [])
    .map(arm => ({ ...arm, tangent: normalizeAngle(arm.tangent) }))
    .sort((a, b) => a.tangent - b.tangent);
  const maxRoadWidth = Math.max(...arms.map(arm => arm.widthPx), 1);
  const maxSidewalkWidth = Math.max(...arms.map(arm => arm.sidewalkWidthPx), 0);
  const curbRadiusPx = Math.max(opts.curbRadiusMinPx, maxRoadWidth * opts.curbRadiusFactor);
  const sidewalkBulbRadiusPx = maxSidewalkWidth > 0 ? curbRadiusPx + maxSidewalkWidth * (1 + opts.sidewalkBulbFactor) : 0;
  const node = {
    id: `intersection_${index + 1}`,
    x: cluster.center.x,
    y: cluster.center.y,
    center: clonePoint(cluster.center),
    type: classifyIntersection(arms),
    arms,
    maxRoadWidthPx: maxRoadWidth,
    maxSidewalkWidthPx: maxSidewalkWidth,
    curbRadiusPx,
    sidewalkBulbRadiusPx,
    curbReturns: [],
    crosswalks: [],
    stopBars: [],
    tactilePavers: [],
  };
  node.curbReturns = buildCurbReturns(node);
  node.crosswalks = buildCrosswalks(node, opts);
  node.stopBars = buildStopBars(node, opts);
  node.tactilePavers = buildTactilePavers(node, opts);
  return node;
}

export function buildCurbReturns(node) {
  const arms = node.arms || [];
  if (arms.length < 2) return [];
  return arms.map((arm, index) => {
    const next = arms[(index + 1) % arms.length];
    const angle = normalizeAngle((arm.tangent + next.tangent) / 2);
    const wrapFix = Math.abs(arm.tangent - next.tangent) > Math.PI;
    const bisector = wrapFix ? normalizeAngle(angle + Math.PI) : angle;
    return {
      fromRoadId: arm.roadId,
      toRoadId: next.roadId,
      fromEndpoint: arm.endpoint,
      toEndpoint: next.endpoint,
      center: add(node.center, unit(bisector), node.curbRadiusPx * 0.62),
      radiusPx: node.curbRadiusPx,
      startAngle: arm.tangent,
      endAngle: next.tangent,
      sidewalkBulbRadiusPx: node.sidewalkBulbRadiusPx,
    };
  });
}

export function buildCrosswalks(node, options = {}) {
  const opts = normalizeOptions(options);
  if (!node.arms || node.arms.length < 3) return [];
  return node.arms.map(arm => {
    const forward = unit(arm.tangent);
    const side = sideVector(arm.tangent);
    const offset = node.curbRadiusPx * opts.crosswalkOffsetFactor;
    const center = add(node.center, forward, offset);
    const halfLength = Math.max(arm.widthPx * 0.72, arm.widthPx / 2 + arm.sidewalkWidthPx);
    const depth = Math.max(3, arm.widthPx * opts.crosswalkWidthFactor);
    return {
      roadId: arm.roadId,
      endpoint: arm.endpoint,
      center,
      angle: arm.tangent,
      roadWidthPx: arm.widthPx,
      sidewalkWidthPx: arm.sidewalkWidthPx,
      widthPx: halfLength * 2,
      depthPx: depth,
      p1: add(center, side, -halfLength),
      p2: add(center, side, halfLength),
      stripes: buildCrosswalkStripes(center, side, forward, halfLength, depth),
    };
  });
}

function buildCrosswalkStripes(center, side, forward, halfLength, depth) {
  const stripeCount = Math.max(4, Math.round((halfLength * 2) / 10));
  const stripeWidth = (halfLength * 2) / (stripeCount * 2 - 1);
  const stripes = [];
  for (let index = 0; index < stripeCount; index++) {
    const offset = -halfLength + stripeWidth / 2 + index * stripeWidth * 2;
    const stripeCenter = add(center, side, offset);
    stripes.push({
      center: stripeCenter,
      widthPx: stripeWidth,
      depthPx: depth,
      corners: rectangleCorners(stripeCenter, side, forward, stripeWidth, depth),
    });
  }
  return stripes;
}

export function buildStopBars(node, options = {}) {
  const opts = normalizeOptions(options);
  if (!node.arms || node.arms.length < 2) return [];
  return node.arms.map(arm => {
    const forward = unit(arm.tangent);
    const side = sideVector(arm.tangent);
    const baseCenter = add(node.center, forward, node.curbRadiusPx * opts.stopBarOffsetFactor);
    const fullWidth = Math.max(arm.widthPx * 0.72, arm.widthPx - 4);
    const laneScope = arm.stopBarLaneScope || opts.stopBarLaneScope || 'inboundLane';
    const drivingSide = normalizeDrivingSide(arm.drivingSide || opts.drivingSide);
    const laneSide = stopBarLaneSide(laneScope, drivingSide);
    const width = laneSide === 'both'
      ? fullWidth
      : Math.max(2, Math.min(fullWidth, arm.widthPx * opts.stopBarLaneWidthFactor));
    const depth = Math.max(2, arm.widthPx * opts.stopBarDepthFactor);
    const makeStopBar = nextLaneSide => {
      const center = nextLaneSide === 'both'
        ? baseCenter
        : add(baseCenter, side, laneSideSign(nextLaneSide) * arm.widthPx * 0.25);
      return {
        roadId: arm.roadId,
        endpoint: arm.endpoint,
        center,
        angle: arm.tangent,
        widthPx: width,
        depthPx: depth,
        laneScope,
        laneSide: nextLaneSide,
        drivingSide,
        trafficDirection: 'inbound',
        corners: rectangleCorners(center, side, forward, width, depth),
      };
    };
    const preferred = makeStopBar(laneSide);
    if (stopBarFitsRoad(preferred, arm.road)) return preferred;
    if (laneSide !== 'both') {
      const alternate = makeStopBar(laneSide === 'left' ? 'right' : 'left');
      if (stopBarFitsRoad(alternate, arm.road)) return alternate;
    }
    if ((arm.road?.roadPolygonPx || []).length >= 3) return null;
    return preferred;
  }).filter(Boolean);
}

export function buildTactilePavers(node, options = {}) {
  const opts = normalizeOptions(options);
  if (!node.crosswalks?.length) return [];
  return node.crosswalks.flatMap(crosswalk => {
    const forward = unit(crosswalk.angle);
    const side = sideVector(crosswalk.angle);
    const sidewalkWidth = Math.max(0, Number(crosswalk.sidewalkWidthPx) || 0);
    if (!sidewalkWidth) return [];
    const roadWidth = Math.max(1, Number(crosswalk.roadWidthPx) || Math.max(1, crosswalk.widthPx - sidewalkWidth * 2));
    const depth = Math.max(2, sidewalkWidth * opts.tactileDepthFactor);
    const width = Math.max(3, Math.min(crosswalk.depthPx * 1.2, sidewalkWidth * 2.4));
    return [-1, 1].map(sign => {
      const edge = add(crosswalk.center, side, sign * (roadWidth / 2 + sidewalkWidth / 2));
      return {
        roadId: crosswalk.roadId,
        endpoint: crosswalk.endpoint,
        side: sign < 0 ? 'leftEdge' : 'rightEdge',
        sideSign: sign,
        center: edge,
        angle: crosswalk.angle,
        widthPx: width,
        depthPx: depth,
        corners: rectangleCorners(edge, forward, side, width, depth),
      };
    });
  });
}

function rectangleCorners(center, axisX, axisY, width, depth) {
  const halfW = width / 2;
  const halfD = depth / 2;
  return [
    add(add(center, axisX, -halfW), axisY, -halfD),
    add(add(center, axisX, halfW), axisY, -halfD),
    add(add(center, axisX, halfW), axisY, halfD),
    add(add(center, axisX, -halfW), axisY, halfD),
  ];
}

export function buildRoadIntersections(roads, options = {}) {
  const opts = normalizeOptions(options);
  const normalizeRoad = opts.normalizeRoad || (road => road);
  const endpoints = (roads || []).flatMap(road => endpointDescriptors(road, normalizeRoad));
  const clusters = addSegmentArms(clusterEndpoints(endpoints, opts), roads, opts, normalizeRoad)
    .filter(cluster => (cluster.arms || []).length >= 2);
  return clusters.map((cluster, index) => buildIntersectionNode(cluster, index, opts));
}

export function createRoadIntersectionEngine(options = {}) {
  return {
    buildRoadIntersections: (roads, nextOptions = {}) => buildRoadIntersections(roads, { ...options, ...nextOptions }),
    buildIntersectionNode,
    buildCurbReturns,
    buildCrosswalks,
    buildStopBars,
    buildTactilePavers,
    classifyIntersection,
  };
}

export function intersectionSummary(intersections = []) {
  return intersections.reduce((summary, intersection) => {
    summary.total += 1;
    summary[intersection.type] = (summary[intersection.type] || 0) + 1;
    summary.crosswalks += intersection.crosswalks?.length || 0;
    summary.stopBars += intersection.stopBars?.length || 0;
    summary.tactilePavers += intersection.tactilePavers?.length || 0;
    return summary;
  }, { total: 0, crosswalks: 0, stopBars: 0, tactilePavers: 0 });
}
