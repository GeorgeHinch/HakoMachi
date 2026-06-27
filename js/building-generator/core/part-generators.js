/* =====================================================================
   PART GENERATORS
   These return objects: { id, name, material, widthMm, heightMm, paths: [{type, d}], rects: [...], lines: [...] }
   ===================================================================== */

/* Compatibility entry point used by segmented wall generation. The fuller
 * implementation normally lives in the fixture generator file; keep this
 * non-throwing fallback so a partial fixture module cannot break building
 * generation before all cleanup is complete. */
export function cutFixtureHolesInCore(rects, paths, cfg, face, xMirror) {
  if (typeof addFixtureThroughHolesToWall === 'function') {
    return addFixtureThroughHolesToWall(rects, paths, cfg, face, xMirror);
  }
  // Fallback: skip through-holes rather than crashing the whole export.
  return undefined;
}

/* Fallback tally helpers. These are intentionally small and are overwritten
 * by the full implementations when the fixture/tally module provides them. */
export function tallyFixtures(cfg) {
  const groups = new Map();
  for (const face of ['front', 'back', 'east', 'west']) {
    const features = (typeof surfaceWallFeaturesForFace === 'function')
      ? surfaceWallFeaturesForFace(cfg, face, 'fixture')
      : [];
    for (const f of features || []) {
      if (!f || !f.style) continue;
      const style = FIXTURE_STYLES && FIXTURE_STYLES[f.style];
      if (!style) continue;
      const w = Number(f.w) || style.width || 1;
      const h = Number(f.h) || style.height || 1;
      const scupper = (typeof downspoutHasScupperBox === 'function')
        ? downspoutHasScupperBox(cfg, face, f.style)
        : false;
      const key = `${f.style}|${w.toFixed(1)}|${h.toFixed(1)}|S${scupper ? 1 : 0}`;
      const existing = groups.get(key);
      if (existing) existing.count += 1;
      else groups.set(key, {
        style: f.style,
        w,
        h,
        count: 1,
        isDefault: Math.abs(w - (style.width || w)) < 0.05 && Math.abs(h - (style.height || h)) < 0.05,
        scupper,
      });
    }
  }
  return Array.from(groups.values());
}

export function tallyShutters(cfg) {
  const groups = new Map();
  for (const face of ['front', 'back', 'east', 'west']) {
    const ops = (typeof structuralWallFeaturesForFace === 'function')
      ? structuralWallFeaturesForFace(cfg, face)
      : [];
    for (const op of ops || []) {
      if (!op || op.type !== 'window' || !op.hasShutters) continue;
      const styleKey = op.shutterStyle || 'louvered';
      if (!SHUTTER_STYLES || !SHUTTER_STYLES[styleKey]) continue;
      const sw = Math.max(2, (Number(op.w) || 0) * (typeof SHUTTER_W_RATIO === 'number' ? SHUTTER_W_RATIO : 0.28));
      const sh = Number(op.h) || 0;
      const key = `${styleKey}|${sw.toFixed(1)}|${sh.toFixed(1)}`;
      const existing = groups.get(key);
      if (existing) existing.count += 1;
      else groups.set(key, { style: styleKey, w: sw, h: sh, count: 1 });
    }
  }
  return Array.from(groups.values());
}

export function generateShutterParts(cfg, shutterGroups) {
  return [];
}

export function tallyPrintedItems(cfg) {
  const groups = new Map();
  for (const face of ['front', 'back', 'east', 'west']) {
    const items = (typeof surfaceWallFeaturesForFace === 'function')
      ? surfaceWallFeaturesForFace(cfg, face, 'printed_item')
      : [];
    for (const it of items || []) {
      if (!it || !it.style || !PRINTED_STYLES || !PRINTED_STYLES[it.style]) continue;
      const w = Number(it.w) || 0;
      const h = Number(it.h) || 0;
      if (w <= 0 || h <= 0) continue;
      const key = `${it.style}|${w.toFixed(1)}|${h.toFixed(1)}`;
      const existing = groups.get(key);
      if (existing) existing.count += 1;
      else groups.set(key, { style: it.style, w, h, count: 1 });
    }
  }
  return Array.from(groups.values());
}

export function generatePrintedSheets(cfg, printedGroups) {
  return [];
}

export function tallyCladdingOverrides(cfg, plan) {
  return [];
}

export function generateCladdingOverrideParts(cfg, overrideGroups) {
  return [];
}

export function effectiveCladdingStyle(baseStyle, styleParams) {
  if (!baseStyle) return null;
  if (!styleParams || baseStyle.pattern !== 'corrugated_overlap') return baseStyle;
  return {
    ...baseStyle,
    sheetW: styleParams.sheetW != null ? styleParams.sheetW : baseStyle.sheetW,
    sheetH: styleParams.sheetH != null ? styleParams.sheetH : baseStyle.sheetH,
    corrugationSpacing: styleParams.corrugationSpacing != null ? styleParams.corrugationSpacing : baseStyle.corrugationSpacing,
    offsetFraction: styleParams.offsetFraction != null ? styleParams.offsetFraction : baseStyle.offsetFraction,
  };
}

export function clipSegmentToTriangle(x1, y1, x2, y2, halfSpan, pitch, mirror) {
  const planes = mirror
    ? [(x, y) => y, (x, y) => x, (x, y) => halfSpan * pitch - pitch * x - halfSpan * y]
    : [(x, y) => y, (x, y) => halfSpan - x, (x, y) => pitch * x - halfSpan * y];
  for (const dist of planes) {
    const d1 = dist(x1, y1);
    const d2 = dist(x2, y2);
    if (d1 < 0 && d2 < 0) return null;
    if (d1 >= 0 && d2 >= 0) continue;
    const t = d1 / (d1 - d2);
    const nx = x1 + t * (x2 - x1);
    const ny = y1 + t * (y2 - y1);
    if (d1 < 0) { x1 = nx; y1 = ny; }
    else { x2 = nx; y2 = ny; }
  }
  return { x1, y1, x2, y2 };
}

export function clipSegmentToConvexPolygon(x1, y1, x2, y2, poly) {
  if (!Array.isArray(poly) || poly.length < 3) return { x1, y1, x2, y2 };
  const EPS = 1e-6;
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    area += a.x * b.y - b.x * a.y;
  }
  const winding = area >= 0 ? 1 : -1;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const ex = b.x - a.x, ey = b.y - a.y;
    const dist = (x, y) => winding * (ex * (y - a.y) - ey * (x - a.x));
    const d1 = dist(x1, y1);
    const d2 = dist(x2, y2);
    if (d1 < -EPS && d2 < -EPS) return null;
    if (d1 >= -EPS && d2 >= -EPS) continue;
    const t = d1 / (d1 - d2);
    const nx = x1 + t * (x2 - x1);
    const ny = y1 + t * (y2 - y1);
    if (d1 < -EPS) { x1 = nx; y1 = ny; }
    else { x2 = nx; y2 = ny; }
  }
  if (Math.hypot(x2 - x1, y2 - y1) < 0.01) return null;
  return { x1, y1, x2, y2 };
}

export function emitFixtureMarkerEtchesOnOverride(lines, mark, ox, oy) {
  if (!lines || !mark) return;
  const x = ox + (Number(mark.x) || 0);
  const y = oy + (Number(mark.y) || 0);
  const w = Number(mark.w) || 0;
  const h = Number(mark.h) || 0;
  if (w <= 0 || h <= 0) return;
  lines.push({ type: 'etch', x1: x, y1: y, x2: x + w, y2: y });
  lines.push({ type: 'etch', x1: x + w, y1: y, x2: x + w, y2: y + h });
  lines.push({ type: 'etch', x1: x + w, y1: y + h, x2: x, y2: y + h });
  lines.push({ type: 'etch', x1: x, y1: y + h, x2: x, y2: y });
}

/* Compute window grid for a wall. Returns array of {x, y, width, height, isGround} in WALL local frame.
   
   Windows are placed at CANONICAL floor center Y positions, identical across all 
   walls so they align horizontally. A window at any floor center Y is rejected only 
   if it intersects a wall-specific obstacle (bay opening, door reserve zone, slot 
   cut). Column X positions are computed per-wall (different walls have different 
   widths) but consistent within one wall so windows stack vertically.
   
   Ground-floor override: if groundWinDims is provided AND groundFloorCenterY 
   matches one of the floorCenterYs, that floor's windows use groundWinDims instead 
   of winDims. Each window in the result has isGround=true if it sits on the ground 
   floor (lets callers tag them for the correct window-parts file). */
