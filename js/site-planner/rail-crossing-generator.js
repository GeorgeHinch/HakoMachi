import { dist, pointInPoly } from './geometry.js';
import { lineIntersection } from './road-geometry.js';

const DEFAULT_CENTER_CLEARANCE_MM = 6.7;
const DEFAULT_OUTER_PLATE_MM = 2.6;
const DEFAULT_EDGE_MARGIN_MM = 2;
const DEFAULT_FLANGEWAY_MM = 1.2;
const DEFAULT_TEMPLATE_MARGIN_MM = 4;

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

function angleOffsetRadians(deg) {
  return (Number(deg) || 0) * Math.PI / 180;
}

function normalizedAngleDeltaDeg(a, b) {
  let deg = Math.abs(((a - b) * 180 / Math.PI) % 180);
  if (deg > 90) deg = 180 - deg;
  return Number(deg.toFixed(2));
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

function orientedRect(center, along, across, lengthPx, widthPx) {
  const a = add(center, along, -lengthPx / 2);
  const b = add(center, along, lengthPx / 2);
  return [
    add(a, across, -widthPx / 2),
    add(b, across, -widthPx / 2),
    add(b, across, widthPx / 2),
    add(a, across, widthPx / 2),
  ];
}

function linePath(a, b) {
  return finitePoint(a) && finitePoint(b) ? `M ${fmt(a.x)} ${fmt(a.y)} L ${fmt(b.x)} ${fmt(b.y)}` : '';
}

function pushLine(records, crossing, layer, type, a, b, extra = {}) {
  const d = linePath(a, b);
  if (!d) return;
  records.push({
    type,
    layer,
    operation: 'engrave',
    crossingId: crossing.id,
    crossingKey: crossing.key,
    roadId: crossing.roadId,
    trackId: crossing.trackId,
    d,
    ...extra,
  });
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
    surveyTemplateEnabled: raw.surveyTemplateEnabled === true,
    roadAngleOffsetDeg: Number.isFinite(Number(raw.roadAngleOffsetDeg)) ? Number(raw.roadAngleOffsetDeg) : 0,
    trackAngleOffsetDeg: Number.isFinite(Number(raw.trackAngleOffsetDeg)) ? Number(raw.trackAngleOffsetDeg) : 0,
    crossingOffsetMm: Number.isFinite(Number(raw.crossingOffsetMm)) ? Number(raw.crossingOffsetMm) : 0,
    roadWidthMm: Number.isFinite(Number(raw.roadWidthMm)) && Number(raw.roadWidthMm) > 0 ? Number(raw.roadWidthMm) : null,
    flangewayMm: Number.isFinite(Number(raw.flangewayMm)) && Number(raw.flangewayMm) > 0 ? Number(raw.flangewayMm) : DEFAULT_FLANGEWAY_MM,
    trimGuideEnabled: raw.trimGuideEnabled !== false,
    registrationMarksEnabled: raw.registrationMarksEnabled !== false,
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
          const roadDistancePx = segmentPathDistance(roadPath, ri, hit);
          const key = crossingOverrideKey(road.id, track.id, roadDistancePx);
          const override = normalizeRailCrossingOverride(overrides[key]);
          const baseRoadAngle = Math.atan2(rb.y - ra.y, rb.x - ra.x);
          const baseTrackAngle = Math.atan2(tb.y - ta.y, tb.x - ta.x);
          const roadAngle = baseRoadAngle + angleOffsetRadians(override.roadAngleOffsetDeg);
          const trackAngle = baseTrackAngle + angleOffsetRadians(override.trackAngleOffsetDeg);
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
          const roadWidthPx = override.roadWidthMm ? mmToPx(override.roadWidthMm, context) : (road.widthPx || 24);
          const crossingPoint = add(hit, roadNormal, mmToPx(override.crossingOffsetMm, context));
          const crossingLengthPx = Math.min(Math.max(roadWidthPx, roadWidthPx / projection + marginPx * 2), roadWidthPx * 3.5);
          const railArcOffsetPx = mmToPx(override.railArcOffsetMm, context);
          const crossing = {
            id: `rail_crossing_${crossings.length + 1}`,
            key,
            enabled: override.enabled,
            roadId: road.id,
            roadName: road.name || 'Road',
            trackId: track.id,
            trackName: track.name || 'Track',
            point: crossingPoint,
            roadDistancePx,
            trackDistancePx: segmentPathDistance(trackPath, ti, hit),
            baseRoadAngle,
            baseTrackAngle,
            roadAngle,
            trackAngle,
            crossingAngleDeg: normalizedAngleDeltaDeg(roadAngle, trackAngle),
            roadVector,
            roadNormal,
            trackVector,
            trackNormal,
            crossingLengthPx,
            roadWidthPx,
            roadWidthMm: pxToMm(roadWidthPx, context),
            centerClearanceMm: DEFAULT_CENTER_CLEARANCE_MM,
            centerWidthPx,
            outerWidthPx,
            railWidthPx,
            gaugePx,
            gaugeMm,
            flangewayMm: override.flangewayMm,
            flangewayPx: mmToPx(override.flangewayMm, context),
            crossingOffsetMm: override.crossingOffsetMm,
            roadAngleOffsetDeg: override.roadAngleOffsetDeg,
            trackAngleOffsetDeg: override.trackAngleOffsetDeg,
            surveyTemplateEnabled: override.surveyTemplateEnabled,
            trimGuideEnabled: override.trimGuideEnabled,
            registrationMarksEnabled: override.registrationMarksEnabled,
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

export function railCrossingSurveyTemplateRecords(crossings = []) {
  const records = [];
  crossings.filter(crossing => crossing && crossing.surveyTemplateEnabled && crossing.enabled !== false).forEach(crossing => {
    const context = { gaugePx: crossing.gaugePx, gaugeMm: crossing.gaugeMm };
    const marginPx = mmToPx(DEFAULT_TEMPLATE_MARGIN_MM, context);
    const flangewayPx = Number(crossing.flangewayPx) || mmToPx(DEFAULT_FLANGEWAY_MM, context);
    const railSlotWidthPx = Math.max(0.6, (Number(crossing.railWidthPx) || mmToPx(0.8, context)) + flangewayPx * 2);
    const templateRoadWidthPx = Math.max(8, Number(crossing.roadWidthPx) || crossing.crossingLengthPx * 0.6);
    const templateLengthPx = Math.max(crossing.gaugePx + railSlotWidthPx * 2 + marginPx * 3, mmToPx(32, context));
    const slotLengthPx = Math.max(templateRoadWidthPx + marginPx * 2, crossing.crossingLengthPx);
    const templatePoly = orientedRect(crossing.point, crossing.roadVector, crossing.roadNormal, templateLengthPx, templateRoadWidthPx + marginPx * 2);

    records.push({
      type: 'railCrossingSurveyTemplateOutline',
      layer: 'railCrossingSurveyCut',
      operation: 'cutRetained',
      crossingId: crossing.id,
      crossingKey: crossing.key,
      roadId: crossing.roadId,
      trackId: crossing.trackId,
      panelKind: 'surveyTemplate',
      d: polygonPath(templatePoly),
    });

    [-1, 1].forEach(side => {
      const railCenter = add(crossing.point, crossing.trackNormal, side * crossing.gaugePx / 2);
      records.push({
        type: 'railCrossingSurveyRailSlot',
        layer: 'railCrossingSurveySlotCut',
        operation: 'cutScrap',
        crossingId: crossing.id,
        crossingKey: crossing.key,
        roadId: crossing.roadId,
        trackId: crossing.trackId,
        panelKind: side < 0 ? 'railSlotLeft' : 'railSlotRight',
        d: polygonPath(orientedRect(railCenter, crossing.trackVector, crossing.trackNormal, slotLengthPx, railSlotWidthPx)),
      });
    });

    pushLine(records, crossing, 'railCrossingSurveyEngrave', 'railCrossingSurveyTrackCenterline',
      add(crossing.point, crossing.trackVector, -slotLengthPx / 2),
      add(crossing.point, crossing.trackVector, slotLengthPx / 2),
      { panelKind: 'trackCenterline' });
    pushLine(records, crossing, 'railCrossingSurveyEngrave', 'railCrossingSurveyRoadCenterline',
      add(crossing.point, crossing.roadVector, -templateLengthPx / 2),
      add(crossing.point, crossing.roadVector, templateLengthPx / 2),
      { panelKind: 'roadCenterline' });

    [-1, 1].forEach(side => {
      const roadEdgeCenter = add(crossing.point, crossing.roadNormal, side * templateRoadWidthPx / 2);
      pushLine(records, crossing, 'railCrossingSurveyEngrave', 'railCrossingSurveyRoadEdge',
        add(roadEdgeCenter, crossing.roadVector, -templateLengthPx / 2),
        add(roadEdgeCenter, crossing.roadVector, templateLengthPx / 2),
        { panelKind: side < 0 ? 'roadEdgeLeft' : 'roadEdgeRight' });

      const flangewayCenter = add(crossing.point, crossing.trackNormal, side * (crossing.gaugePx / 2 + flangewayPx));
      pushLine(records, crossing, 'railCrossingSurveyEngrave', 'railCrossingSurveyFlangewayGuide',
        add(flangewayCenter, crossing.trackVector, -slotLengthPx / 2),
        add(flangewayCenter, crossing.trackVector, slotLengthPx / 2),
        { panelKind: side < 0 ? 'flangewayLeft' : 'flangewayRight' });
    });

    const tickLengthPx = mmToPx(2, context);
    [-1, 1].forEach(side => {
      const tickCenter = add(crossing.point, crossing.trackVector, side * templateLengthPx * 0.32);
      pushLine(records, crossing, 'railCrossingSurveyEngrave', 'railCrossingSurveyReferenceTick',
        add(tickCenter, crossing.trackNormal, -tickLengthPx),
        add(tickCenter, crossing.trackNormal, tickLengthPx),
        { panelKind: 'referenceTick' });
    });

    if (crossing.trimGuideEnabled !== false) {
      [-1, 1].forEach(sign => {
        [0.5, 1].forEach(mm => {
          const center = add(crossing.point, crossing.roadNormal, sign * mmToPx(mm, context));
          pushLine(records, crossing, 'railCrossingSurveyEngrave', 'railCrossingSurveyTrimGuide',
            add(center, crossing.roadVector, -templateLengthPx / 2),
            add(center, crossing.roadVector, templateLengthPx / 2),
            { panelKind: `trim${sign > 0 ? 'Plus' : 'Minus'}${mm}` });
        });
      });
    }

    if (crossing.registrationMarksEnabled !== false) {
      const regOffset = Math.min(templateLengthPx, templateRoadWidthPx) * 0.35;
      [
        add(add(crossing.point, crossing.roadVector, -regOffset), crossing.roadNormal, -regOffset),
        add(add(crossing.point, crossing.roadVector, regOffset), crossing.roadNormal, -regOffset),
        add(add(crossing.point, crossing.roadVector, -regOffset), crossing.roadNormal, regOffset),
        add(add(crossing.point, crossing.roadVector, regOffset), crossing.roadNormal, regOffset),
      ].forEach((mark, index) => {
        pushLine(records, crossing, 'railCrossingSurveyEngrave', 'railCrossingSurveyRegistrationMark',
          add(mark, crossing.roadVector, -tickLengthPx),
          add(mark, crossing.roadVector, tickLengthPx),
          { panelKind: 'registrationMark', index });
        pushLine(records, crossing, 'railCrossingSurveyEngrave', 'railCrossingSurveyRegistrationMark',
          add(mark, crossing.roadNormal, -tickLengthPx),
          add(mark, crossing.roadNormal, tickLengthPx),
          { panelKind: 'registrationMark', index });
      });
    }

    records.push({
      type: 'railCrossingSurveyAngleLabel',
      layer: 'railCrossingSurveyEngrave',
      operation: 'engrave',
      crossingId: crossing.id,
      crossingKey: crossing.key,
      roadId: crossing.roadId,
      trackId: crossing.trackId,
      panelKind: 'angleLabel',
      text: `${fmt(crossing.crossingAngleDeg, 1)} deg`,
      x: add(crossing.point, crossing.roadVector, templateLengthPx * 0.28).x,
      y: add(crossing.point, crossing.roadVector, templateLengthPx * 0.28).y,
    });
  });
  return records.filter(record => record.d || record.text);
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
  const records = railCrossingSurveyTemplateRecords(crossings);
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
  return records.filter(record => record.d || record.text);
}

export function railCrossingSummary(crossings = []) {
  return {
    crossings: crossings.filter(crossing => crossing.enabled !== false).length,
    panels: crossings.filter(crossing => crossing.enabled !== false).reduce((sum, crossing) => sum + (crossing.panels?.length || 0), 0),
  };
}

export const RAIL_CROSSING_CENTER_CLEARANCE_MM = DEFAULT_CENTER_CLEARANCE_MM;
