export const uid = prefix => prefix + '_' + Math.random().toString(36).slice(2, 9);
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const rad = degrees => degrees * Math.PI / 180;
export const deg = radians => radians * 180 / Math.PI;
export const fmt = value => Number.isFinite(value)
  ? (Math.abs(value) >= 100 ? value.toFixed(1) : value.toFixed(2)).replace(/\.00$/, '')
  : '—';

export function transformedRect(rect) {
  const center = { x: rect.x, y: rect.y };
  const width = rect.widthPx;
  const depth = rect.depthPx;
  const angle = rad(rect.rotationDeg || 0);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const local = [
    { x: -width / 2, y: -depth / 2 },
    { x: width / 2, y: -depth / 2 },
    { x: width / 2, y: depth / 2 },
    { x: -width / 2, y: depth / 2 },
  ];
  return local.map(point => ({
    x: center.x + point.x * cos - point.y * sin,
    y: center.y + point.x * sin + point.y * cos,
  }));
}

export function rectLocal(rect, point) {
  const angle = rad(-(rect.rotationDeg || 0));
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - rect.x;
  const dy = point.y - rect.y;
  return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
}

export function polygonCenter(points) {
  const count = points.length || 1;
  return points.reduce((sum, point) => ({
    x: sum.x + point.x / count,
    y: sum.y + point.y / count,
  }), { x: 0, y: 0 });
}

export function polygonArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

export function pointInPoly(point, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    if (((a.y > point.y) !== (b.y > point.y)) && (point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x)) {
      inside = !inside;
    }
  }
  return inside;
}

export function closestPointOnSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq <= 1e-9) return { point: { x: a.x, y: a.y }, t: 0, distance: dist(point, a) };
  const t = clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq, 0, 1);
  const closest = { x: a.x + dx * t, y: a.y + dy * t };
  return { point: closest, t, distance: dist(point, closest) };
}

export function distanceToSegment(point, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (!lengthSq) return dist(point, a);
  let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq;
  t = clamp(t, 0, 1);
  return dist(point, { x: a.x + t * dx, y: a.y + t * dy });
}

export function selectionRectFromPoints(a, b) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  };
}

export function bboxOverlaps(a, b) {
  return a.x <= b.x + b.w && a.x + a.w >= b.x && a.y <= b.y + b.h && a.y + a.h >= b.y;
}
