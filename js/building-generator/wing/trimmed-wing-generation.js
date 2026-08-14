/* =====================================================================
   TRIM-AWARE WING GENERATION
   ---------------------------------------------------------------------
   Compatibility wrapper around the existing multi-block generator.

   The legacy wing generator intentionally builds complete blocks first and
   applies layout cuts as a final pass. That is safe for ordinary rectangular
   walls, but two wall classes need a physical-span reconciliation step:

   - explicitly mirrored wing side panels (`mirrorX`), where the exported
     left/right edge is the reverse of the generator-local panel axis;
   - coplanar L/T merged walls, whose physical span includes one or two wing
     extensions even though the generic layout-cut wall model only knows the
     original main-block rectangle.

   This module leaves the established generator in place, regenerates only
   those affected wall parts from an untrimmed reference build, and then
   rebuilds window/door accessory sheets from post-trim opening metadata.
   ===================================================================== */

export * from './main-block.js';

import { generateBuildingWithWings as generateBuildingWithWingsBase } from './main-block.js';
import { computeFaceMerges } from './block-context.js';
import { buildEdgePlans } from '../core/segmented-wall-exposure.js';
import {
  clipLocalPolygonToXInterval,
  clipOpeningSpecsForLayoutCut,
  clipRectToXInterval,
  clipLineToXInterval,
  generateLayoutCutSolidBackParts,
  layoutCutWallClipSpec,
  layoutCutsActive,
  layoutLineSide,
  parseSvgPathToPoints,
  pointsToSvgPath,
  polygonBounds,
  sampleLayoutCutSegments,
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

function cloneJson(value) {
  if (value == null) return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function activeCuts(cfg) {
  return Array.isArray(cfg && cfg.layoutCuts)
    ? cfg.layoutCuts.filter(cut => cut && cut.enabled !== false)
    : [];
}

function lerpPoint(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function retainedParamInterval(world0, world1, cuts, cfg) {
  let lo = 0;
  let hi = 1;
  const tolerance = 1e-7;

  for (const cut of cuts) {
    const keepRight = cut.keepSide === 'right';
    const sign = keepRight ? -1 : 1;
    const segments = sampleLayoutCutSegments(cut, cfg);
    for (const [a, b] of segments) {
      const score = t => sign * layoutLineSide(a, b, lerpPoint(world0, world1, t));
      const s0 = score(lo);
      const s1 = score(hi);
      const in0 = s0 >= -tolerance;
      const in1 = s1 >= -tolerance;

      if (in0 && in1) continue;
      if (!in0 && !in1) return { omit: true, t0: 0, t1: 0 };

      const den = s0 - s1;
      if (Math.abs(den) < 1e-12) return { omit: true, t0: 0, t1: 0 };
      const cross = Math.max(lo, Math.min(hi, lo + (hi - lo) * (s0 / den)));
      if (!in0) lo = cross;
      else hi = cross;
      if (hi - lo <= 1e-6) return { omit: true, t0: 0, t1: 0 };
    }
  }
  return { omit: false, t0: lo, t1: hi };
}

function mainCladdingSpan(cfg, face) {
  const cT = Math.max(0, Number(cfg && cfg.claddingThickness) || 0);
  if (face === 'front' || face === 'back') return Math.max(0, Number(cfg.width) || 0) + 2 * cT;
  return Math.max(0, Number(cfg.depth) || 0);
}

function coplanarSpanInfo(part, cfg, spec) {
  const merge = part && part._coplanarMerge;
  if (!merge || !merge.face) return null;
  const face = merge.face;
  const merges = computeFaceMerges(cfg, Number(cfg.width) || 0, Number(cfg.depth) || 0);
  const faceMerges = merges && merges[face] ? merges[face] : { left: null, right: null };
  const plan = buildEdgePlans(cfg);
  const isCore = merge.kind === 'core';
  const mainW = isCore
    ? ((face === 'east' || face === 'west') ? Number(plan.sideLen) || 0 : Number(plan.fbWidth) || Number(cfg.width) || 0)
    : mainCladdingSpan(cfg, face);
  if (!(mainW > 0)) return null;

  const extensionWidth = side => {
    const item = faceMerges[side];
    if (!item || !item.wing) return 0;
    const depth = Math.max(0, Number(item.wing.depth) || 0);
    return isCore ? depth + (Number(plan.matT) || Number(cfg.coreThickness) || 0) : depth;
  };
  const leftW = extensionWidth('left');
  const rightW = extensionWidth('right');
  const panelW = leftW + mainW + rightW;
  if (!(panelW > 0)) return null;

  // spec.toWorld() correctly describes the main face's physical direction.
  // Extend that directed axis by the attached wing lengths instead of asking
  // the generic rectangular-main footprint to describe an L/T wall.
  const main0 = spec.toWorld(0);
  const main1 = spec.toWorld(mainW);
  const vx = (main1.x - main0.x) / mainW;
  const vy = (main1.y - main0.y) / mainW;
  return {
    panelW,
    mainOffset: leftW,
    mainW,
    world0: { x: main0.x - vx * leftW, y: main0.y - vy * leftW },
    world1: { x: main1.x + vx * rightW, y: main1.y + vy * rightW },
  };
}

function physicalSpanForPart(part, cfg) {
  const spec = layoutCutWallClipSpec(part, cfg);
  if (!spec) return null;

  const merged = coplanarSpanInfo(part, cfg, spec);
  if (merged) {
    return {
      ...merged,
      kind: spec.kind,
      matT: spec.matT,
      mirrored: !!part.mirrorX,
    };
  }

  if (!part.mirrorX) return null;
  const panelW = Number(spec.panelW) || 0;
  if (!(panelW > 0)) return null;

  // The exported panel is mirrored after generation. Resolve layout cuts in
  // that exported physical frame: q=0 corresponds to the pre-mirror panelW
  // end and q=panelW corresponds to the pre-mirror x=0 end.
  return {
    panelW,
    mainOffset: 0,
    mainW: panelW,
    world0: spec.toWorld(panelW),
    world1: spec.toWorld(0),
    kind: spec.kind,
    matT: spec.matT,
    mirrored: true,
  };
}

function sourceIntervalForPhysical(span, physicalX0, physicalX1) {
  if (!span.mirrored) return { x0: physicalX0, x1: physicalX1 };
  return {
    x0: span.panelW - physicalX1,
    x1: span.panelW - physicalX0,
  };
}

function clipPathToInterval(path, x0, x1) {
  if (!path || !path.d) return path;
  const pts = parseSvgPathToPoints(path.d);
  if (!pts || pts.length < 3) return path;
  const clipped = clipLocalPolygonToXInterval(pts, x0, x1);
  if (!clipped || clipped.length < 3) return null;
  return { ...path, d: pointsToSvgPath(clipped), _layoutClipped: true };
}

function structuralSlotRect(r, matT) {
  if (!r || r.type !== 'cut' || !r.compensateKerf) return false;
  const w = Math.abs(Number(r.w) || 0);
  const h = Math.abs(Number(r.h) || 0);
  const t = Math.max(0.2, Number(matT) || 1.5);
  // Structural receiver slots are normally one material-thickness in one
  // dimension. Door/window cutouts are not kerf-compensated in this path.
  return w <= t * 1.8 || h <= t * 1.8;
}

function clipRectForTrim(r, x0, x1, matT) {
  if (!r || r.type !== 'cut') return r;
  const clipped = clipRectToXInterval(r, x0, x1);
  if (!clipped) return null;
  const changed = Math.abs(clipped.x - r.x) > EPS || Math.abs(clipped.w - r.w) > EPS;
  // Never leave a half-width receiver slot at a trim boundary. A partial slot
  // cannot mate with a full material-thickness tab and is worse than no slot.
  if (changed && structuralSlotRect(r, matT)) return null;
  return clipped;
}

function clipSpecsToPhysicalInterval(specs, span, physicalX0, physicalX1, minW = MIN_OPENING_W) {
  const out = [];
  for (const raw of (specs || [])) {
    if (!raw || !(Number(raw.w) > 0) || !(Number(raw.h) > 0)) continue;
    const sx = Number(raw.x) || 0;
    const sw = Number(raw.w) || 0;
    const q0 = span.mirrored ? span.panelW - (sx + sw) : sx;
    const q1 = span.mirrored ? span.panelW - sx : sx + sw;
    const k0 = Math.max(q0, physicalX0);
    const k1 = Math.min(q1, physicalX1);
    const w = k1 - k0;
    if (w < minW) continue;

    const originalW = Number(raw.originalW || raw.w) || sw;
    const removedFromPhysicalLeft = Math.max(0, k0 - q0);
    const sourceX = span.mirrored ? span.panelW - k1 : k0;
    const clipLeft = (Number(raw.clipLeft) || 0) + removedFromPhysicalLeft;
    out.push({
      ...raw,
      x: sourceX,
      w,
      originalW,
      clipLeft,
      partial: Math.abs(w - originalW) > EPS || Math.abs(clipLeft) > EPS,
    });
  }
  return out;
}

function trimCustomWallPart(part, cfg, cuts) {
  const span = physicalSpanForPart(part, cfg);
  if (!span) return null;
  const kept = retainedParamInterval(span.world0, span.world1, cuts, cfg);
  if (kept.omit) {
    part._layoutCutOmit = true;
    return { part, span, physicalX0: 0, physicalX1: 0 };
  }

  const physicalX0 = Math.max(0, span.panelW * kept.t0);
  const physicalX1 = Math.min(span.panelW, span.panelW * kept.t1);
  const source = sourceIntervalForPhysical(span, physicalX0, physicalX1);
  const x0 = Math.max(0, source.x0);
  const x1 = Math.min(span.panelW, source.x1);
  if (x1 - x0 <= EPS) {
    part._layoutCutOmit = true;
    return { part, span, physicalX0, physicalX1 };
  }

  const outerIndex = (part.paths || []).findIndex(p => p && p.type === 'cut' && p.d);
  if (outerIndex >= 0) {
    const tabPad = span.kind === 'core' ? (Number(span.matT) || 0) : 0;
    const clipX0 = x0 <= EPS ? x0 - tabPad : x0;
    const clipX1 = x1 >= span.panelW - EPS ? x1 + tabPad : x1;
    const outer = clipPathToInterval(part.paths[outerIndex], clipX0, clipX1);
    if (!outer) {
      part._layoutCutOmit = true;
      return { part, span, physicalX0, physicalX1 };
    }
    part.paths[outerIndex] = outer;

    // Secondary polygon cutouts (bay/opening relief paths) must not survive as
    // detached geometry in the discarded end of the wall.
    part.paths = part.paths.map((path, index) => {
      if (index === outerIndex || !path || path.type !== 'cut' || !path.d) return path;
      return clipPathToInterval(path, x0, x1);
    }).filter(Boolean);
  }

  part.rects = (part.rects || []).map(r => clipRectForTrim(r, x0, x1, span.matT)).filter(Boolean);
  part.lines = (part.lines || []).map(l => clipLineToXInterval(l, x0, x1)).filter(Boolean);

  part.windowSpecs = clipSpecsToPhysicalInterval(part.windowSpecs, span, physicalX0, physicalX1);
  part.blankedSpecs = clipSpecsToPhysicalInterval(part.blankedSpecs, span, physicalX0, physicalX1);
  part.doorSpecs = clipSpecsToPhysicalInterval(part.doorSpecs, span, physicalX0, physicalX1);
  part._layoutCutOpeningSpecsResolved = true;
  part._layoutCutPhysicalSpanResolved = true;
  part._layoutCutSourceInterval = { x0, x1 };
  part._layoutCutPhysicalInterval = { x0: physicalX0, x1: physicalX1 };

  const outline = outerIndex >= 0 ? parseSvgPathToPoints(part.paths[outerIndex]?.d || '') : [];
  const bounds = polygonBounds(outline);
  if (bounds && Number.isFinite(bounds.w) && Number.isFinite(bounds.h) && bounds.w > 0 && bounds.h > 0) {
    part.bboxW = bounds.w;
    part.bboxH = bounds.h;
    part.bboxOffsetX = -bounds.minX;
    part.bboxOffsetY = -bounds.minY;
    if (!/layout cut/.test(part.name || '')) part.name = `${part.name || part.id} — layout cut`;
  }
  return { part, span, physicalX0, physicalX1 };
}

function customPartCandidate(part, cfg) {
  if (!part || (!part.mirrorX && !part._coplanarMerge)) return false;
  return !!layoutCutWallClipSpec(part, cfg);
}

function replaceCustomWalls(trimmedParts, rawParts, cfg, cuts) {
  const byId = new Map((trimmedParts || []).map(part => [part && part.id, part]));
  for (const rawPart of (rawParts || [])) {
    if (!customPartCandidate(rawPart, cfg)) continue;
    const fixed = cloneJson(rawPart);
    trimCustomWallPart(fixed, cfg, cuts);
    const current = byId.get(fixed.id);
    const index = current ? trimmedParts.indexOf(current) : -1;
    if (fixed._layoutCutOmit) {
      if (index >= 0) trimmedParts.splice(index, 1);
      continue;
    }
    if (index >= 0) trimmedParts[index] = fixed;
    else trimmedParts.push(fixed);
  }
}

function dropPartiallyTrimmedSlots(parts, cfg) {
  for (const part of (parts || [])) {
    const spec = layoutCutWallClipSpec(part, cfg);
    if (!spec || !Array.isArray(part.rects)) continue;
    const interval = part._layoutCutSourceInterval;
    if (!interval) continue;
    part.rects = part.rects.filter(r => {
      if (!structuralSlotRect(r, spec.matT)) return true;
      const rx0 = Number(r.x) || 0;
      const rx1 = rx0 + (Number(r.w) || 0);
      return rx0 >= interval.x0 - EPS && rx1 <= interval.x1 + EPS;
    });
  }
}

function isOpeningAccessoryPart(part) {
  const id = String(part && part.id || '').toLowerCase();
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

function openingSpecsForPart(part, key, cfg) {
  const specs = Array.isArray(part && part[key]) ? part[key] : [];
  if (part && part._layoutCutOpeningSpecsResolved) return specs.map(item => ({ ...item }));
  return clipOpeningSpecsForLayoutCut(part, specs, cfg, MIN_OPENING_W);
}

function rebuildOpeningAccessories(parts, cfg) {
  const wallParts = (parts || []).filter(part => !!layoutCutWallClipSpec(part, cfg));
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
    const windows = openingSpecsForPart(part, 'windowSpecs', cfg);
    const blanked = openingSpecsForPart(part, 'blankedSpecs', cfg);
    const doors = openingSpecsForPart(part, 'doorSpecs', cfg);

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
  if (!layoutCutsActive(cfg) || !Array.isArray(cfg && cfg.wings) || cfg.wings.length === 0) {
    return generateBuildingWithWingsBase(cfg);
  }

  const cuts = activeCuts(cfg);
  if (!cuts.length) return generateBuildingWithWingsBase(cfg);

  // Keep the established result for all ordinary parts: trusses, columns,
  // floors/roofs, internal walls and the 3D-facing metadata already have
  // specialized trim behavior in the base generator.
  const result = generateBuildingWithWingsBase(cfg);

  // Regenerate a no-cut reference solely to recover complete affected wall
  // geometry before the legacy final-pass clipping/mirroring can discard the
  // wrong physical end. No saved config is changed.
  const rawCfg = cloneJson(cfg);
  rawCfg.layoutCuts = [];
  const raw = generateBuildingWithWingsBase(rawCfg);

  replaceCustomWalls(result.parts, raw.parts, cfg, cuts);
  dropPartiallyTrimmedSlots(result.parts, cfg);

  // The base result already includes solid-back parts generated from the real
  // cut config. Add them only if an older generator path omitted them.
  if (!result.parts.some(part => part && part.meta && part.meta.role === 'solid_back')) {
    result.parts.push(...generateLayoutCutSolidBackParts(cfg, result.plan));
  }

  const counts = rebuildOpeningAccessories(result.parts, cfg);
  result.totalWindows = counts.totalWindows;
  result.upperWindows = counts.upperWindows;
  result.groundWindows = counts.groundWindows;
  result.totalDoors = counts.totalDoors;
  return result;
}
