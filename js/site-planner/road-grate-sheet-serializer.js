import { buildDrainageGrateInsert, drainageGrateSvgPaths } from './road-drainage-grate-inserts.js';

const DEFAULT_SHEET = Object.freeze({
  widthMm: 180,
  heightMm: 120,
  marginMm: 6,
  gapMm: 4,
});

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function bboxForPart(part) {
  if (part.type === 'rect') return { x: part.x, y: part.y, width: part.width, height: part.height };
  if (part.type === 'circle') return { x: part.cx - part.r, y: part.cy - part.r, width: part.r * 2, height: part.r * 2 };
  if (part.type === 'line') return { x: Math.min(part.x1, part.x2), y: Math.min(part.y1, part.y2), width: Math.abs(part.x2 - part.x1), height: Math.abs(part.y2 - part.y1) };
  return { x: 0, y: 0, width: 0, height: 0 };
}

function unionBounds(parts = []) {
  const boxes = parts.map(bboxForPart).filter(box => Number.isFinite(box.x));
  if (!boxes.length) return { x: 0, y: 0, width: 0, height: 0 };
  const minX = Math.min(...boxes.map(box => box.x));
  const minY = Math.min(...boxes.map(box => box.y));
  const maxX = Math.max(...boxes.map(box => box.x + box.width));
  const maxY = Math.max(...boxes.map(box => box.y + box.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function escapeAttr(value) {
  return String(value ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function translatePath(d, x, y) {
  return `translate(${x} ${y}) ${d}`;
}

function partElement(part, offset, style) {
  const d = part.d || '';
  if (!d) return '';
  return `<path d="${escapeAttr(d)}" transform="${escapeAttr(translatePath('', offset.x, offset.y))}" ${style} data-part-id="${escapeAttr(part.id || '')}"/>`;
}

function styleForLayer(layer) {
  if (layer.includes('Score')) return 'fill="none" stroke="#d33" stroke-width="0.08" stroke-dasharray="0.8 0.5"';
  if (layer.includes('Guide')) return 'fill="none" stroke="#777" stroke-width="0.06" stroke-dasharray="0.5 0.5" opacity="0.65"';
  return 'fill="none" stroke="#111" stroke-width="0.08"';
}

function layoutItems(items, sheet = {}) {
  const s = { ...DEFAULT_SHEET, ...sheet };
  let x = s.marginMm;
  let y = s.marginMm;
  let rowHeight = 0;
  return items.map(item => {
    const w = item.bounds.width;
    const h = item.bounds.height;
    if (x + w > s.widthMm - s.marginMm && x > s.marginMm) {
      x = s.marginMm;
      y += rowHeight + s.gapMm;
      rowHeight = 0;
    }
    const placed = { ...item, sheetX: x - item.bounds.x, sheetY: y - item.bounds.y };
    x += w + s.gapMm;
    rowHeight = Math.max(rowHeight, h);
    return placed;
  });
}

export function buildGrateSheetItems(grateSpecs = [], materialLibraryOrProfile = {}) {
  return grateSpecs.map((spec, index) => {
    const insert = spec?.layers ? spec : buildDrainageGrateInsert(spec, materialLibraryOrProfile);
    const paths = drainageGrateSvgPaths(insert);
    const grateParts = [...(paths.grateCut || []), ...(paths.grateScore || []), ...(paths.grateGuide || [])];
    const roadParts = paths.roadDeckCut || [];
    return {
      id: spec.id || insert.spec.key || `grate-${index + 1}`,
      label: insert.spec.label || insert.spec.key || `Grate ${index + 1}`,
      insert,
      paths,
      grateParts,
      roadParts,
      bounds: unionBounds(grateParts),
      roadOpeningBounds: unionBounds(roadParts),
    };
  });
}

export function serializeGrateInsertSheetSvg(grateSpecs = [], options = {}) {
  const sheet = { ...DEFAULT_SHEET, ...(options.sheet || {}) };
  const items = layoutItems(buildGrateSheetItems(grateSpecs, options.materialLibrary || {}), sheet);
  const body = items.map(item => {
    const sheetLayers = {
      grateCut: item.paths.grateCut || [],
      grateScore: item.paths.grateScore || [],
      ...(options.includeGuides ? { grateGuide: item.paths.grateGuide || [] } : {}),
    };
    const groups = Object.entries(sheetLayers).map(([layer, parts]) => {
      const style = styleForLayer(layer);
      return `<g data-layer="${escapeAttr(layer)}">${parts.map(part => partElement(part, { x: item.sheetX, y: item.sheetY }, style)).join('')}</g>`;
    }).join('');
    return `<g id="${escapeAttr(item.id)}" data-label="${escapeAttr(item.label)}">${groups}</g>`;
  }).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${sheet.widthMm}mm" height="${sheet.heightMm}mm" viewBox="0 0 ${sheet.widthMm} ${sheet.heightMm}">${body}</svg>`;
}

export function serializeGrateInsertSheetsByMaterial(grateSpecs = [], options = {}) {
  const items = buildGrateSheetItems(grateSpecs, options.materialLibrary || {});
  const byMaterial = items.reduce((groups, item) => {
    const materialId = item.insert.materials?.grate?.materialId || item.insert.materials?.grate?.material?.id || 'road-hatch-dark';
    if (!groups[materialId]) groups[materialId] = [];
    groups[materialId].push(item.insert);
    return groups;
  }, {});
  return Object.entries(byMaterial).map(([materialId, inserts]) => ({
    materialId,
    svg: serializeGrateInsertSheetSvg(inserts, options),
  }));
}

export { DEFAULT_SHEET as DEFAULT_GRATE_SHEET };
