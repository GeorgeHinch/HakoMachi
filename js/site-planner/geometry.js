export const uid = prefix => prefix + '_' + Math.random().toString(36).slice(2, 9);
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const rad = degrees => degrees * Math.PI / 180;
export const deg = radians => radians * 180 / Math.PI;
export const fmt = value => Number.isFinite(value)
  ? (Math.abs(value) >= 100 ? value.toFixed(1) : value.toFixed(2)).replace(/\.00$/, '')
  : '—';
