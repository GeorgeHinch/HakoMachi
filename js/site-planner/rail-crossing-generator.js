import { dist, pointInPoly } from './geometry.js';
import { lineIntersection } from './road-geometry.js';

const DEFAULT_CENTER_CLEARANCE_MM = 6.7;
const DEFAULT_OUTER_PLATE_MM = 2.6;
const DEFAULT_EDGE_MARGIN_MM = 2;

function finitePoint(point) {
  return point && Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y));
}

function fmt(value, precision = 3) {
  return Number((Number(value) || 0).toFixed(precision)).toString();
}

function add(point, vector, amount = 1) {
  return { x: point.x + vector.x * amount, y: point.y + vector.y * amount };
}

function unitFromAngle(angle) {
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function normalOf(vector) {
  return { x: -vector.y, y: vector.x };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

function polygonPath(points = []) {
  const clean = points.filter(finitePoint);
  if (!clean.length) return '';
  return `M ${fmt(clean[0].x)} ${fmt(clean[0].y)} ${clean.slice(1).map(point => `L ${fmt(point.x)} ${fmt(point.y)}`).join(' ')} Z`;
}

function segmentPathDistance(path, segmentIndex, point) {
  let distance = 0;
  for (let index = 1; index <= segmentIndex; index++) distance += dist(path[index - 1], path[index]);
  const a = path[segmentIndex];
  return distance + (a ? dist(a, point) : 0);
}

function mmToPx(mm, context = {}) {
  if (Number.isFinite(Number(context.pxPerMm)) && Number(context.pxPerMm) > 0) return Number(mm) * Number(context.pxPerMm);
  if (Number.isFinite(Number(context.gaugePx)) && Number(context.gaugePx) > 0 && Number.isFinite(Number(context.gaugeMm)) && Number(context.gaugeMm) > 0) {
    return Number(mm) * Number(context.gaugePx) / Number(context.gaugeMm);
  }
  return Number(mm) || 0;
}

function pxToMm(px, context = {}) {
  if (Number.isFinite(Number(context.pxPerMm)) && Number(context.pxPerMm) > 0) return Number(px) / Number(context.pxPerMm);
  if (Number.isFinite(Number(context.gaugePx)) && Number(context.gaugePx) > 0 && Number.isFinite(Number(context.gaugeMm)) && Number(context.gaugeMm) > 0) {
    return Number(px) * Number(context.gaugeMm) / Number(context.gaugePx);
  }
  return Number(px) || 0;
}

function crossingOverrideKey(roadId, trackId, roadDistancePx) {
  return `${roadId || 'road'}:${trackId || 'track'}:${Math.round((Number(roadDistancePx) || 0) / 5) * 5}`;
}

function curvedStripPolygon(crossing, lateralOffsetPx, widthPx, lengthPx, arcOffsetPx = 0, steps = 8) {
  const along = crossing.trackVector;
  const across = crossing.trackNormal;
  const control = add(add(crossing.point, across, lateralOffsetPx), crossing.roadVector, arcOffsetPx);
  const start = add(add(crossing.point, along, -lengthPx / 2), across, lateralOffsetPx);
  const end = add(add(crossing.point, along, lengthPx / 2), across, lateralOffsetPx);
  const centerline = [];
  for (let index = 0; index <= steps; index++) {
    const t = index / steps;
    const mt = 1 - t;
    centerline.push({
      x: mt * mt * start.x + 2 * mt * t * control.x + t * t * end.x,
      y: mt * mt * start.y + 2 * mt * t * control.y + t * t * end.y,
    });
  }
  const left = [];
  const right = [];
  centerline.forEach((point, index) => {
    const prev = centerline[Math.max(0, index - 1)];
    const next = centerline[Math.min(centerline.length - 1, index + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const normal = { x: -dy / len, y: dx / len };
    left.push(add(point, normal, widthPx / 2));
    right.push(add(point, normal, -widthPx / 2));
  });
  return left.concat(right.reverse());
}

function straightPanelPolygon(center, along, across, lengthPx, widthPx) {
  const a = add(center, along, -lengthPx / 2);
  const b = add(center, along, lengthPx / 2);
  return [
    add(a, across, -widthPx / 2),
    add(b, across, -widthPx / 2),
    add(b, across, widthPx / 2),
    add(a, across, widthPx / 2),
  ];
}

function platingLinesForPanel(crossing, lateralOffsetPx, widthPx, lengthPx, arcOffsetPx = 0) {
  const lines = [];
  const along = crossing.trackVector;
  const across = crossing.trackNormal;
  const center = add(crossing.point, across, lateralOffsetPx);
  const spacing = Math.max(2, Math.min(widthPx, lengthPx) / 4);
  for (let x = -lengthPx / 2 + spacing; x < lengthPx / 2; x += spacing) {
    const mid = add(add(center, along, x), crossing.roadVector, arcOffsetPx * (1 - Math.abs(x) / Math.max(1, lengthPx / 2)) * 0.35);
    lines.push({
      a: add(add(mid, along, -spacing * 0.55), across, -widthPx * 0.42),
      b: add(add(mid, along, spacing * 0.55), across, widthPx * 0.42),
    });
    lines.push({
      a: add(add(mid, along, -spacing * 0.55), across, widthPx * 0.42),
      b: add(add(mid, along, spacing * 0.55), across, -widthPx * 0.42),
    });
  }
  return lines;
}

export function railCrossingOverrideKey(crossing) {
  return crossingOverrideKey(crossing?.roadId, crossing?.trackId, crossing?.roadDistancePx);
}

export function normalizeRailCrossingOverride(raw = {}) {
  return {
    enabled: raw.enabled !== false,
    railArcOffsetMm: Number.isFinite(Number(raw.railArcOffsetMm)) ? Number(raw.railArcOffsetMm) : 0,
  };
}

export function buildRailCrossings({ roads = [], tracks = [], roadCenterlineSamples, trackPathSamples, pxPerMm = null, overrides = {} } = {}) {
  const crossings = [];
  roads.forEach(rawRoad => {
    const road = rawRoad;
    if (!road || road.hidden || road.mode !== 'centerline' || !Array.isArray(road.pointsPx) || road.pointsPx.length < 2) return;
    const roadPath = roadCenterlineSamples(road, 24);
    if (roadPath.length < 2) return;
    tracks.forEach(rawTrack => {
      const track = rawTrack;
      if (!track || track.hidden || !Array.isArray(track.pointsPx) || track.pointsPx.length < 2) return;
      const trackPath = trackPathSamples(track, 24);
      if (trackPath.length < 2) return;
      for (let ri = 0; ri < roadPath.length - 1; ri++) {
        const ra = roadPath[ri];
        const rb = roadPath[ri + 1];
        for (let ti = 0; ti < trackPath.length - 1; ti++) {
          const ta = trackPath[ti];
          const tb = trackPath[ti + 1];
          const hit = lineIntersection(ra, rb, ta, tb);
          if (!hit) continue;
          const roadAngle = Math.atan2(rb.y - ra.y, rb.x - ra.x);
          const trackAngle = Math.atan2(tb.y - ta.y, tb.x - ta.x);
          const trackVector = unitFromAngle(trackAngle);
          const roadVector = unitFromAngle(roadAngle);
          const trackNormal = normalOf(trackVector);
          const roadNormal = normalOf(roadVector);
          const gaugePx = Number(track.gaugePx) || (pxPerMm ? 9 * pxPerMm : 9);
          const gaugeMm = Number(track.gaugeMm) || 9;
          const railWidthPx = Number(track.railWidthPx) || mmToPx(Number(track.railWidthMm) || 0.8, { pxPerMm, gaugePx, gaugeMm });
          const context = { pxPerMm, gaugePx, gaugeMm };
          const centerWidthPx = mmToPx(DEFAULT_CENTER_CLEARANCE_MM, context);
          const outerWidthPx = mmToPx(DEFAULT_OUTER_PLATE_MM, context);
          const marginPx = mmToPx(DEFAULT_EDGE_MARGIN_MM, context);
          const projection = Math.max(0.18, Math.abs(dot(trackVector, roadNormal)));
          const crossingLengthPx = Math.min(Math.max(road.widthPx || 24, (road.widthPx || 24) / projection + marginPx * 2), (road.widthPx || 24) * 3.5);
          const roadDistancePx = segmentPathDistance(roadPath, ri, hit);
          const key = crossingOverrideKey(road.id, track.id, roadDistancePx);
          const override = normalizeRailCrossingOverride(overrides[key]);
          const railArcOffsetPx = mmToPx(override.railArcOffsetMm, context);
          const crossing = {
            id: `rail_crossing_${crossings.length + 1}`,
            key,
            enabled: override.enabled,
            roadId: road.id,
            roadName: road.name || 'Road',
            trackId: track.id,
            trackName: track.name || 'Track',
            point: hit,
            roadDistancePx,
            trackDistancePx: segmentPathDistance(trackPath, ti, hit),
            roadAngle,
            trackAngle,
            roadVector,
            roadNormal,
            trackVector,
            trackNormal,
            crossingLengthPx,
            centerClearanceMm: DEFAULT_CENTER_CLEARANCE_MM,
            centerWidthPx,
            outerWidthPx,
            railWidthPx,
            gaugePx,
            gaugeMm,
            railArcOffsetMm: override.railArcOffsetMm,
            railArcOffsetPx,
            panels: [],
            engraves: [],
          };
          const outerOffset = gaugePx / 2 + railWidthPx / 2 + outerWidthPx / 2;
          [
            { kind: 'center', lateralOffsetPx: 0, widthPx: centerWidthPx },
            { kind: 'outerLeft', lateralOffsetPx: -outerOffset, widthPx: outerWidthPx },
            { kind: 'outerRight', lateralOffsetPx: outerOffset, widthPx: outerWidthPx },
          ].forEach(panel => {
            const polygon = curvedStripPolygon(crossing, panel.lateralOffsetPx, panel.widthPx, crossingLengthPx, railArcOffsetPx);
            crossing.panels.push({ ...panel, polygon });
            platingLinesForPanel(crossing, panel.lateralOffsetPx, panel.widthPx, crossingLengthPx, railArcOffsetPx).forEach(line => crossing.engraves.push({ ...line, panelKind: panel.kind }));
          });
          crossings.push(crossing);
        }
      }
    });
  });
  return crossings.filter((crossing, index, all) => index === all.findIndex(other => other.roadId === crossing.roadId && other.trackId === crossing.trackId && dist(other.point, crossing.point) < 8));
}

export function buildRailCrossingInfillPanels(crossings = [], options = {}) {
  const maxGapPx = Number(options.maxGapPx) || 180;
  const out = [];
  const byRoad = crossings.filter(crossing => crossing.enabled !== false).reduce((groups, crossing) => {
    (groups[crossing.roadId] ||= []).push(crossing);
    return groups;
  }, {});
  Object.values(byRoad).forEach(group => {
    const sorted = group.slice().sort((a, b) => a.roadDistancePx - b.roadDistancePx);
    for (let index = 0; index < sorted.length - 1; index++) {
      const a = sorted[index];
      const b = sorted[index + 1];
      const gap = b.roadDistancePx - a.roadDistancePx;
      const usable = gap - (a.gaugePx + b.gaugePx) / 2;
      if (usable <= 4 || usable > maxGapPx) continue;
      const center = { x: (a.point.x + b.point.x) / 2, y: (a.point.y + b.point.y) / 2 };
      const roadWidth = Math.max(a.crossingLengthPx * 0.35, Number(options.roadWidthPxById?.[a.roadId]) || 24);
      out.push({
        id: `rail_crossing_infill_${out.length + 1}`,
        roadId: a.roadId,
        betweenTrackIds: [a.trackId, b.trackId],
        polygon: straightPanelPolygon(center, a.roadVector, a.roadNormal, Math.max(4, usable), roadWidth),
      });
    }
  });
  return out;
}

export function hitRailCrossing(point, crossings = [], tolerancePx = 8) {
  for (let index = crossings.length - 1; index >= 0; index--) {
    const crossing = crossings[index];
    if (!crossing || crossing.enabled === false) continue;
    if (dist(point, crossing.point) <= tolerancePx) return crossing;
    if ((crossing.panels || []).some(panel => pointInPoly(point, panel.polygon || []))) return crossing;
  }
  return null;
}

export function railCrossingSvgRecords(crossings = [], options = {}) {
  const records = [];
  crossings.filter(crossing => crossing.enabled !== false).forEach(crossing => {
    (crossing.panels || []).forEach((panel, index) => {
      records.push({
        type: 'railCrossingPanel',
        layer: 'railCrossingCut',
        operation: 'cutRetained',
        crossingId: crossing.id,
        crossingKey: crossing.key,
        roadId: crossing.roadId,
        trackId: crossing.trackId,
        panelKind: panel.kind,
        index,
        d: polygonPath(panel.polygon || []),
      });
    });
    (crossing.engraves || []).forEach((line, index) => {
      records.push({
        type: 'railCrossingPlateEngrave',
        layer: 'railCrossingPlateEngrave',
        operation: 'engrave',
        crossingId: crossing.id,
        crossingKey: crossing.key,
        roadId: crossing.roadId,
        trackId: crossing.trackId,
        panelKind: line.panelKind,
        index,
        d: finitePoint(line.a) && finitePoint(line.b) ? `M ${fmt(line.a.x)} ${fmt(line.a.y)} L ${fmt(line.b.x)} ${fmt(line.b.y)}` : '',
      });
    });
  });
  (options.infillPanels || []).forEach((panel, index) => {
    records.push({
      type: 'railCrossingInfillPanel',
      layer: 'railCrossingCut',
      operation: 'cutRetained',
      roadId: panel.roadId,
      trackId: (panel.betweenTrackIds || []).join(','),
      panelKind: 'betweenTracks',
      index,
      d: polygonPath(panel.polygon || []),
    });
  });
  return records.filter(record => record.d);
}

export function railCrossingSummary(crossings = []) {
  return {
    crossings: crossings.filter(crossing => crossing.enabled !== false).length,
    panels: crossings.filter(crossing => crossing.enabled !== false).reduce((sum, crossing) => sum + (crossing.panels?.length || 0), 0),
  };
}

export const RAIL_CROSSING_CENTER_CLEARANCE_MM = DEFAULT_CENTER_CLEARANCE_MM;
