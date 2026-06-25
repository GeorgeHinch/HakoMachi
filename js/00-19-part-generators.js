'use strict';

/* =====================================================================
   PART GENERATORS
   These return objects: { id, name, material, widthMm, heightMm, paths: [{type, d}], rects: [...], lines: [...] }
   ===================================================================== */

/* Compatibility entry point used by segmented wall generation. The fuller
 * implementation normally lives in the fixture generator file; keep this
 * non-throwing fallback so a partial fixture module cannot break building
 * generation before all cleanup is complete. */
function cutFixtureHolesInCore(rects, paths, cfg, face, xMirror) {
  if (typeof addFixtureThroughHolesToWall === 'function') {
    return addFixtureThroughHolesToWall(rects, paths, cfg, face, xMirror);
  }
  // Fallback: skip through-holes rather than crashing the whole export.
  return undefined;
}

/* Fallback tally helpers. These are intentionally small and are overwritten
 * by the full implementations when the fixture/tally module provides them. */
function tallyFixtures(cfg) {
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

function tallyShutters(cfg) {
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

function generateShutterParts(cfg, shutterGroups) {
  return [];
}

function tallyPrintedItems(cfg) {
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

function generatePrintedSheets(cfg, printedGroups) {
  return [];
}

function tallyCladdingOverrides(cfg, plan) {
  return [];
}

function generateCladdingOverrideParts(cfg, overrideGroups) {
  return [];
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
