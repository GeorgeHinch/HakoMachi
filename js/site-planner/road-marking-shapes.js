import { roadMarkingPresetByKey } from './road-marking-presets.js';

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function point(x, y) {
  return { x, y };
}

function rectPolygon(width, depth, cx = 0, cy = 0) {
  const w = width / 2;
  const d = depth / 2;
  return [point(cx - w, cy - d), point(cx + w, cy - d), point(cx + w, cy + d), point(cx - w, cy + d)];
}

function polygonPath(points = []) {
  if (!points.length) return '';
  return `M ${points[0].x} ${points[0].y} ${points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')} Z`;
}

function linePath(a, b) {
  return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
}

function rotatePoint(p, angle = 0) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return point(p.x * c - p.y * s, p.x * s + p.y * c);
}

function transformPolygon(points, transform = {}) {
  const angle = num(transform.angle, 0);
  const x = num(transform.x, 0);
  const y = num(transform.y, 0);
  return points.map(p => {
    const r = rotatePoint(p, angle);
    return point(r.x + x, r.y + y);
  });
}

function record(type, points, meta = {}, transform = {}) {
  const transformed = transformPolygon(points, transform);
  return { type, points: transformed, d: polygonPath(transformed), ...meta };
}

function barShape(preset, transform) {
  return [record('bar', rectPolygon(preset.widthMm, preset.depthMm), { layer: preset.exportLayer, presetKey: preset.key }, transform)];
}

function solidLineShape(preset, transform) {
  return [record('solidLine', rectPolygon(preset.widthMm, preset.depthMm), { layer: preset.exportLayer, presetKey: preset.key }, transform)];
}

function dashedLineShape(preset, transform) {
  const count = Math.max(1, Math.round(num(preset.dashCount, 3)));
  const total = preset.widthMm;
  const gap = total / (count * 2 - 1);
  const dash = gap;
  const start = -total / 2;
  return Array.from({ length: count }, (_, i) => {
    const cx = start + dash / 2 + i * gap * 2;
    return record('dash', rectPolygon(dash, preset.depthMm, cx, 0), { layer: preset.exportLayer, presetKey: preset.key, index: i }, transform);
  });
}

function crosswalkShape(preset, transform) {
  const stripeCount = Math.max(3, Math.round(num(preset.stripeCount, 5)));
  const stripeWidth = preset.widthMm / (stripeCount * 2 - 1);
  const start = -preset.widthMm / 2;
  return Array.from({ length: stripeCount }, (_, i) => {
    const cx = start + stripeWidth / 2 + i * stripeWidth * 2;
    return record('crosswalkStripe', rectPolygon(stripeWidth, preset.depthMm, cx, 0), { layer: preset.exportLayer, presetKey: preset.key, index: i }, transform);
  });
}

function bicycleCrossingShape(preset, transform) {
  const lineDepth = Math.max(0.12, preset.depthMm * 0.12);
  return [
    record('bicycleCrossingLine', rectPolygon(preset.widthMm, lineDepth, 0, -preset.depthMm / 2 + lineDepth / 2), { layer: preset.exportLayer, presetKey: preset.key, index: 0 }, transform),
    record('bicycleCrossingLine', rectPolygon(preset.widthMm, lineDepth, 0, preset.depthMm / 2 - lineDepth / 2), { layer: preset.exportLayer, presetKey: preset.key, index: 1 }, transform),
  ];
}

function arrowHead(width, y) {
  return [point(0, -y), point(width / 2, -y + width * 0.72), point(width * 0.18, -y + width * 0.72), point(width * 0.18, y), point(-width * 0.18, y), point(-width * 0.18, -y + width * 0.72), point(-width / 2, -y + width * 0.72)];
}

function straightArrowShape(preset, transform) {
  return [record('arrowStraight', arrowHead(preset.widthMm, preset.depthMm / 2), { layer: preset.exportLayer, presetKey: preset.key }, transform)];
}

function turnArrowShape(preset, transform, side = -1) {
  const w = preset.widthMm;
  const d = preset.depthMm;
  const pts = [
    point(-w * 0.08 * side, d / 2),
    point(w * 0.18 * side, d / 2),
    point(w * 0.18 * side, -d * 0.18),
    point(w * 0.45 * side, -d * 0.18),
    point(w * 0.45 * side, -d * 0.42),
    point(w * 0.5 * side, -d * 0.42),
    point(w * 0.28 * side, -d / 2),
    point(w * 0.06 * side, -d * 0.42),
    point(w * 0.12 * side, -d * 0.42),
    point(w * 0.12 * side, -d * 0.28),
    point(-w * 0.08 * side, -d * 0.28),
  ];
  return [record(side < 0 ? 'arrowLeft' : 'arrowRight', pts, { layer: preset.exportLayer, presetKey: preset.key }, transform)];
}

function combinedArrowShape(preset, transform, side = -1) {
  return [
    ...straightArrowShape({ ...preset, widthMm: preset.widthMm * 0.45 }, transform),
    ...turnArrowShape({ ...preset, widthMm: preset.widthMm * 0.74 }, { ...transform, x: (transform.x || 0) + side * preset.widthMm * 0.18 }, side),
  ];
}

function diamondShape(preset, transform) {
  const w = preset.widthMm / 2;
  const d = preset.depthMm / 2;
  return [record('diamond', [point(0, -d), point(w, 0), point(0, d), point(-w, 0)], { layer: preset.exportLayer, presetKey: preset.key }, transform)];
}

function chevronShape(preset, transform) {
  const count = 4;
  const stripeW = preset.widthMm / (count * 1.8);
  const parts = [];
  for (let i = 0; i < count; i += 1) {
    const cx = -preset.widthMm / 2 + stripeW + i * stripeW * 1.8;
    parts.push(record('chevronStripe', [point(cx, -preset.depthMm / 2), point(cx + stripeW, -preset.depthMm / 2), point(cx + stripeW * 2, preset.depthMm / 2), point(cx + stripeW, preset.depthMm / 2)], { layer: preset.exportLayer, presetKey: preset.key, index: i }, transform));
  }
  return parts;
}

function safetyZoneShape(preset, transform) {
  return [
    record('safetyZoneOuter', rectPolygon(preset.widthMm, preset.depthMm), { layer: preset.exportLayer, presetKey: preset.key, fill: false }, transform),
    ...chevronShape({ ...preset, widthMm: preset.widthMm * 0.82, depthMm: preset.depthMm * 0.72 }, transform),
  ];
}

function roadTextShape(preset, transform) {
  return [{ type: 'text', text: preset.text || preset.label || preset.key, x: num(transform.x, 0), y: num(transform.y, 0), angle: num(transform.angle, 0), widthMm: preset.widthMm, depthMm: preset.depthMm, layer: preset.exportLayer, presetKey: preset.key }];
}

export function buildRoadMarkingShapes(presetOrKey, transform = {}) {
  const preset = typeof presetOrKey === 'string' ? roadMarkingPresetByKey(presetOrKey) : presetOrKey;
  const draw = preset?.markingDraw || preset?.draw || 'bar';
  if (draw === 'bar') return barShape(preset, transform);
  if (draw === 'solidLine') return solidLineShape(preset, transform);
  if (draw === 'dashedLine' || draw === 'curbDash') return dashedLineShape(preset, transform);
  if (draw === 'crosswalk') return crosswalkShape(preset, transform);
  if (draw === 'bicycleCrossing') return bicycleCrossingShape(preset, transform);
  if (draw === 'arrowStraight') return straightArrowShape(preset, transform);
  if (draw === 'arrowLeft') return turnArrowShape(preset, transform, -1);
  if (draw === 'arrowRight') return turnArrowShape(preset, transform, 1);
  if (draw === 'arrowStraightLeft') return combinedArrowShape(preset, transform, -1);
  if (draw === 'arrowStraightRight') return combinedArrowShape(preset, transform, 1);
  if (draw === 'diamond') return diamondShape(preset, transform);
  if (draw === 'chevronZone') return chevronShape(preset, transform);
  if (draw === 'safetyZone') return safetyZoneShape(preset, transform);
  if (draw === 'roadText' || draw === 'speedNumber') return roadTextShape(preset, transform);
  return barShape(preset, transform);
}

export function roadMarkingShapesToSvgRecords(shapes = []) {
  return shapes.map(shape => ({
    type: shape.type,
    layer: shape.layer || 'roadMarkingEtch',
    presetKey: shape.presetKey,
    d: shape.d || '',
    text: shape.text || '',
    x: shape.x,
    y: shape.y,
    angle: shape.angle,
    widthMm: shape.widthMm,
    depthMm: shape.depthMm,
    fill: shape.fill !== false,
  }));
}

export function buildRoadMarkingSvgRecords(presetOrKey, transform = {}) {
  return roadMarkingShapesToSvgRecords(buildRoadMarkingShapes(presetOrKey, transform));
}

export { polygonPath, linePath, transformPolygon };
