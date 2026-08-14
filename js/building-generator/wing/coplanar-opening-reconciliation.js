/* =====================================================================
   COPLANAR MERGED OPENING RECONCILIATION
   ---------------------------------------------------------------------
   The L/T core merge moves the main wall into a wider local frame and folds
   a wing side wall's cut rectangles into that frame. Historically the
   corresponding window/door metadata was not moved with those rectangles.
   This wrapper rebuilds that metadata from an uncut reference and then
   regenerates accessory sheets from the post-trim specs.
   ===================================================================== */

export * from './trimmed-wing-generation.js';

import {
  generateBuildingWithWings as generateTrimmedWingBuilding,
  setTrimmedWingBaseGenerator,
} from './trimmed-wing-generation.js';
import { generateBuildingWithWings as generateRawWingBuilding } from './main-block.js';
import { computeFaceMerges } from './block-context.js';
import { buildWingCfg, wingHeight } from './default-wing-template.js';
import { buildEdgePlans } from '../core/segmented-wall-exposure.js';
import { generateCladdingPanel } from '../core/roof-fascia-trim.js';
import {
  clipOpeningSpecsForLayoutCut,
  layoutCutPartWallKind,
  layoutCutWallClipSpec,
  layoutCutsActive,
  tallyDoorSpecs,
} from '../core/layout-cut-geometry.js';
import {
  generateBlankedWindowPanels,
  generateBlankedWindowPanelsFromSpecs,
  generateDoorInserts,
  generateDoorInsertsFromSpecs,
  generateWindowParts,
  generateWindowPartsFromSpecs,
} from '../core/window-parts.js';
import { normalizePartsMetadata } from '../core/part-metadata.js';

const EPS = 0.01;
const MIN_OPENING_W = 1.0;
const SPEC_KEYS = ['windowSpecs', 'blankedSpecs', 'doorSpecs'];
let runtimeBaseGenerateBuildingWithWings = null;

export function installTrimAwareWingGeneration(baseGenerator) {
  runtimeBaseGenerateBuildingWithWings = typeof baseGenerator === 'function' ? baseGenerator : null;
  setTrimmedWingBaseGenerator(runtimeBaseGenerateBuildingWithWings);
}

function generateRawWingBuildingFromRuntime(cfg) {
  return runtimeBaseGenerateBuildingWithWings
    ? runtimeBaseGenerateBuildingWithWings(cfg)
    : generateRawWingBuilding(cfg);
}

function cloneJson(value) {
  if (value == null) return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function clipSpecsToInterval(specs, interval, minW = MIN_OPENING_W) {
  if (!interval) return (specs || []).map(spec => ({ ...spec }));
  const out = [];
  for (const raw of (specs || [])) {
    if (!raw || !(Number(raw.w) > 0) || !(Number(raw.h) > 0)) continue;
    const sx = Number(raw.x) || 0;
    const sw = Number(raw.w) || 0;
    const k0 = Math.max(sx, interval.x0);
    const k1 = Math.min(sx + sw, interval.x1);
    const w = k1 - k0;
    if (w < minW) continue;
    const originalW = Number(raw.originalW || raw.w) || sw;
    const clipLeft = (Number(raw.clipLeft) || 0) + Math.max(0, k0 - sx);
    out.push({
      ...raw,
      x: k0,
      w,
      originalW,
      clipLeft,
      partial: Math.abs(w - originalW) > EPS || Math.abs(clipLeft) > EPS,
    });
  }
  return out;
}

function specKey(spec) {
  return [
    spec?.style || '',
    Number(spec?.x || 0).toFixed(3),
    Number(spec?.y || 0).toFixed(3),
    Number(spec?.w || 0).toFixed(3),
    Number(spec?.h || 0).toFixed(3),
    spec?.isGround ? 'g' : 'u',
  ].join('|');
}

function dedupeSpecs(specs) {
  const seen = new Set();
  return (specs || []).filter(spec => {
    const key = specKey(spec);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function wallFeatureSpecs(owner, face) {
  const features = owner?.wallFeatures?.[face];
  if (!Array.isArray(features)) return null;
  const empty = { windowSpecs: [], blankedSpecs: [], doorSpecs: [] };
  for (const feature of features) {
    if (!feature || !(Number(feature.w) > 0) || !(Number(feature.h) > 0)) continue;
    const spec = {
      ...feature,
      x: Number(feature.x) || 0,
      y: Number(feature.y) || 0,
      w: Number(feature.w),
      h: Number(feature.h),
      originalW: Number(feature.w),
      clipLeft: 0,
      isGround: !!feature.isGround,
    };
    if (feature.type === 'window') empty.windowSpecs.push(spec);
    else if (feature.type === 'door') empty.doorSpecs.push(spec);
  }
  return empty;
}

function specsForMainPart(rawPart, cfg, face, kind) {
  const fallback = kind === 'core' ? wallFeatureSpecs(cfg, face) : null;
  const out = {};
  for (const key of SPEC_KEYS) {
    const existing = rawPart?.[key];
    out[key] = Array.isArray(existing) && existing.length
      ? existing.map(spec => ({ ...spec }))
      : (fallback?.[key] || []).map(spec => ({ ...spec }));
  }
  return out;
}

function wingSpecsForMerge(cfg, wing, wingFace, kind, band) {
  const wCfg = buildWingCfg(cfg, wing);
  const wPlan = buildEdgePlans(wCfg);
  if (kind === 'exterior_cladding') {
    const wingPart = generateCladdingPanel(wCfg, wPlan, wingFace, band === 'all' ? null : band);
    return {
      specs: Object.fromEntries(SPEC_KEYS.map(key => [key, (wingPart?.[key] || []).map(spec => ({ ...spec }))])),
      width: Number(wingPart?.bboxW) || 0,
      sideLen: Number(wPlan.sideLen) || 0,
    };
  }
  return {
    specs: wallFeatureSpecs(wing, wingFace) || { windowSpecs: [], blankedSpecs: [], doorSpecs: [] },
    width: 0,
    sideLen: Number(wPlan.sideLen) || 0,
  };
}

function mergedSpecs(rawPart, cfg) {
  const merge = rawPart?._coplanarMerge;
  if (!merge || !merge.face || (merge.kind !== 'core' && merge.kind !== 'cladding')) return null;
  const face = merge.face;
  const kind = merge.kind === 'cladding' ? 'exterior_cladding' : 'core';
  const mainW = Number(cfg.width) || 0;
  const mainD = Number(cfg.depth) || 0;
  const topology = computeFaceMerges(cfg, mainW, mainD);
  const faceMerges = topology?.[face] || { left: null, right: null };
  if (!faceMerges.left && !faceMerges.right) return null;

  const plan = buildEdgePlans(cfg);
  const matT = Number(plan.matT) || Number(cfg.coreThickness) || 0;
  const faceMainW = kind === 'exterior_cladding'
    ? ((face === 'east' || face === 'west') ? mainD : mainW + 2 * (Number(cfg.claddingThickness) || 0))
    : ((face === 'east' || face === 'west') ? Number(plan.sideLen) || 0 : Number(plan.fbWidth) || mainW);
  const leftWing = faceMerges.left
    ? wingSpecsForMerge(cfg, faceMerges.left.wing, faceMerges.left.wingFace, kind, merge.band)
    : null;
  const rightWing = faceMerges.right
    ? wingSpecsForMerge(cfg, faceMerges.right.wing, faceMerges.right.wingFace, kind, merge.band)
    : null;
  const leftExtW = leftWing
    ? (kind === 'exterior_cladding' ? leftWing.width : (Number(faceMerges.left.wing.depth) || 0) + matT)
    : 0;
  const xMain = leftExtW;

  const out = { windowSpecs: [], blankedSpecs: [], doorSpecs: [] };
  const mainSpecs = specsForMainPart(rawPart, cfg, face, kind);
  for (const key of SPEC_KEYS) {
    out[key].push(...mainSpecs[key].map(spec => ({ ...spec, x: (Number(spec.x) || 0) + xMain })));
  }

  for (const side of ['left', 'right']) {
    const m = faceMerges[side];
    if (!m || !m.wing) continue;
    const wing = m.wing;
    const wingData = side === 'left' ? leftWing : rightWing;
    const stepY = kind === 'core' ? Number(plan.H) - Number(wingHeight(cfg, wing)) : 0;
    const wingWallXStart = kind === 'exterior_cladding'
      ? (side === 'left' ? 0 : xMain + faceMainW)
      : (side === 'left' ? 2 * matT : xMain + faceMainW + 2 * matT);

    for (const key of SPEC_KEYS) {
      for (const spec of (wingData?.specs?.[key] || [])) {
        const sx = Number(spec.x) || 0;
        const sw = Number(spec.w) || 0;
        const sourceWidth = kind === 'exterior_cladding' ? wingData.width : wingData.sideLen;
        const x = m.flipWX ? (sourceWidth - (sx + sw)) : sx;
        out[key].push({
          ...spec,
          x: x + wingWallXStart,
          y: (Number(spec.y) || 0) + stepY,
        });
      }
    }
  }

  for (const key of SPEC_KEYS) out[key] = dedupeSpecs(out[key]);
  return out;
}

function reconcileCoplanarSpecs(parts, rawParts, cfg) {
  const rawById = new Map((rawParts || []).map(part => [part?.id, part]));
  for (const part of (parts || [])) {
    if (!part?._coplanarMerge || !['core', 'cladding'].includes(part._coplanarMerge.kind)) continue;
    const rawPart = rawById.get(part.id);
    if (!rawPart) continue;
    const specs = mergedSpecs(rawPart, cfg);
    if (!specs) continue;
    const interval = part._layoutCutSourceInterval || null;
    for (const key of SPEC_KEYS) part[key] = clipSpecsToInterval(specs[key], interval);
    part._layoutCutOpeningSpecsResolved = true;
    part._coplanarOpeningSpecsReconciled = true;
  }
}

function isOpeningAccessoryPart(part) {
  const id = String(part?.id || '').toLowerCase();
  return id === 'glass' || id.startsWith('glass_')
      || id === 'black_backing' || id.startsWith('black_backing_')
      || id === 'frame_inner' || id.startsWith('frame_inner_')
      || id === 'frame_divider' || id.startsWith('frame_divider_')
      || id === 'frame_external' || id.startsWith('frame_external_')
      || id === 'blanking_panel' || id.startsWith('blanking_panel_')
      || id.startsWith('door_insert_') || id.startsWith('door_glass_');
}

function mergeTallies(dst, src) {
  for (const [key, count] of Object.entries(src || {})) dst[key] = (dst[key] || 0) + Number(count || 0);
}

function resolvedSpecs(part, key, cfg) {
  const specs = Array.isArray(part?.[key]) ? part[key] : [];
  if (part?._layoutCutOpeningSpecsResolved) return specs.map(spec => ({ ...spec }));
  return clipOpeningSpecsForLayoutCut(part, specs, cfg, MIN_OPENING_W);
}

function rebuildAccessories(parts, cfg) {
  const candidateWalls = (parts || []).filter(part => !!layoutCutWallClipSpec(part, cfg));
  const claddingWalls = candidateWalls.filter(part => layoutCutPartWallKind(part) === 'exterior_cladding');
  const wallParts = claddingWalls.length ? claddingWalls : candidateWalls;
  const allWindows = [];
  const allBlanked = [];
  const allDoors = [];
  let upperWindows = 0;
  let groundWindows = 0;
  let blankedUpper = 0;
  let blankedGround = 0;
  let totalWindows = 0;
  let totalDoors = 0;
  const doorTallies = {};

  for (const part of wallParts) {
    const windows = resolvedSpecs(part, 'windowSpecs', cfg);
    const blanked = resolvedSpecs(part, 'blankedSpecs', cfg);
    const doors = resolvedSpecs(part, 'doorSpecs', cfg);

    if (windows.length) {
      allWindows.push(...windows);
      totalWindows += windows.length;
      upperWindows += windows.filter(w => !w.isGround).length;
      groundWindows += windows.filter(w => !!w.isGround).length;
    } else if (!Array.isArray(part.windowSpecs) || part.windowSpecs.length === 0) {
      totalWindows += Number(part.windows || 0);
      upperWindows += Number(part.upperWindows || 0);
      groundWindows += Number(part.groundWindows || 0);
    }

    if (blanked.length) {
      allBlanked.push(...blanked);
      blankedUpper += blanked.filter(w => !w.isGround).length;
      blankedGround += blanked.filter(w => !!w.isGround).length;
    } else if (!Array.isArray(part.blankedSpecs) || part.blankedSpecs.length === 0) {
      blankedUpper += Number(part.blankedUpper || 0);
      blankedGround += Number(part.blankedGround || 0);
    }

    if (doors.length) {
      allDoors.push(...doors);
      totalDoors += doors.length;
      mergeTallies(doorTallies, tallyDoorSpecs(doors));
    } else if (!Array.isArray(part.doorSpecs) || part.doorSpecs.length === 0) {
      totalDoors += Number(part.doors || 0);
      mergeTallies(doorTallies, part.doorStyleTallies || {});
    }
  }

  for (let i = parts.length - 1; i >= 0; i--) {
    if (isOpeningAccessoryPart(parts[i])) parts.splice(i, 1);
  }

  parts.push(...(allWindows.length
    ? generateWindowPartsFromSpecs(cfg, allWindows)
    : generateWindowParts(cfg, upperWindows, groundWindows)));
  parts.push(...(allBlanked.length
    ? generateBlankedWindowPanelsFromSpecs(cfg, allBlanked)
    : generateBlankedWindowPanels(cfg, blankedUpper, blankedGround)));
  parts.push(...(allDoors.length
    ? generateDoorInsertsFromSpecs(cfg, allDoors)
    : generateDoorInserts(cfg, doorTallies)));
  normalizePartsMetadata(parts);
  return { totalWindows, upperWindows, groundWindows, totalDoors };
}

export function generateBuildingWithWings(cfg) {
  const result = generateTrimmedWingBuilding(cfg);
  if (!layoutCutsActive(cfg) || !Array.isArray(cfg?.wings) || cfg.wings.length === 0) return result;
  if (!(result.parts || []).some(part => part?._coplanarMerge?.kind === 'core')) return result;

  const rawCfg = cloneJson(cfg);
  rawCfg.layoutCuts = [];
  const raw = generateRawWingBuildingFromRuntime(rawCfg);
  reconcileCoplanarSpecs(result.parts, raw.parts, cfg);
  const counts = rebuildAccessories(result.parts, cfg);
  result.totalWindows = counts.totalWindows;
  result.upperWindows = counts.upperWindows;
  result.groundWindows = counts.groundWindows;
  result.totalDoors = counts.totalDoors;
  return result;
}
