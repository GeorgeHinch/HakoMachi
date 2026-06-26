'use strict';

/* =====================================================================
   WALL FEATURE ACCESSORS — CURRENT MODEL
   ===================================================================== */

function wallFeaturesForFace(cfg, face, opts = {}) {
  if (!cfg) return [];
  const wf = ensureWallFeatureMap(cfg);
  if (Array.isArray(wf[face])) {
    return opts.clone === false ? wf[face] : wf[face].map(cloneWallFeature);
  }
  return [];
}

function wallFaceIsManual(cfg, face) {
  // In wallFeatures, `null` means auto/live defaults. An array means the user
  // has taken manual control of that face. Importantly, an EMPTY array is a
  // valid manual state: "this wall intentionally has no manually placed
  // openings/items". Do not collapse it to null or the wall will regenerate
  // its default windows/doors after the last item is deleted.
  if (!cfg) return false;
  const wf = ensureWallFeatureMap(cfg);
  return Array.isArray(wf[face]);
}

function wallHasManualFeatures(cfg, face) {
  return wallFaceIsManual(cfg, face);
}

function structuralWallFeaturesForFace(cfg, face) {
  const base = wallFeaturesForFace(cfg, face)
    .filter(op => op && !WALL_FEATURE_SURFACE_TYPES.has(op.type));
  const railOps = embeddedRailBayOpsForFace(cfg, face);
  return railOps.length ? base.concat(railOps) : base;
}

/* Shared wall/config accessors used by generators, editors, and embedded rail. */
function surfaceWallFeaturesForFace(cfg, face, type) {
  return wallFeaturesForFace(cfg, face).filter(op => op && op.type === type);
}

function setWallFeaturesForFace(cfg, face, features, opts = {}) {
  const wf = ensureWallFeatureMap(cfg);
  const raw = Array.isArray(features) ? features : [];
  // Embedded-rail bay openings are generated from cfg.embeddedRails. They may
  // appear in the opening editor as draggable linked handles, but they should
  // never be persisted as manual wall features or they will duplicate/stale
  // when the rail zone moves later.
  const arr = raw.filter(op => !(op && op._embeddedRail)).map(cloneWallFeature);

  // Preserve an explicit empty array as an intentional manual-empty wall.
  // `null` means auto/default wall state; `[]` means "the user cleared this
  // wall and wants it to stay clear." If the working array contained only
  // generated rail handles, do not mark the wall manual-empty unless the caller
  // explicitly asks for it.
  const preserveEmpty = opts.preserveEmpty === true
    || (raw.length === 0 && opts.preserveEmpty !== false);
  wf[face] = arr.length ? arr : (preserveEmpty ? [] : null);
  cfg.storageVersion = Math.max(Number(cfg.storageVersion) || 0, 2);
}

function clearWallFeaturesForFace(cfg, face) {
  ensureWallFeatureMap(cfg)[face] = null;
  cfg.storageVersion = Math.max(Number(cfg.storageVersion) || 0, 2);
}

function findBayOnFace(cfg, face) {
  return structuralWallFeaturesForFace(cfg, face).find(op => op && op.type === 'bay') || null;
}

/* "Is this face in manual-windows-and-doors mode?"
 *
 * The bay lives in wallFeatures alongside windows and doors, but its presence
 * ALONE doesn't mean the user has taken over window/door layout. Without this
 * distinction, dropping a bay would silently disable the auto window pattern.
 *
 * Returns the filtered array of window+door manual ops, or null when none
 * exist. Use structuralWallFeaturesForFace(...) when iterating structural ops
 * INCLUDING the bay.
 */
function manualStructuralOps(cfg, face) {
  if (!cfg) return null;
  const wf = ensureWallFeatureMap(cfg);

  // IMPORTANT: in the unified wallFeatures model, the presence of an array
  // means this face is manually controlled. That includes:
  //   - []                     => intentionally no wall features
  //   - [fixtures only]         => no manually placed windows/doors
  //   - [cladding overrides...] => no manually placed windows/doors
  //
  // Previously this returned null when the array had only surface features,
  // which sent the wall core generator back into auto mode and re-created
  // default windows. That is why an east/west wall with vents/cladding patches
  // but no windows still generated auto window holes. Return the filtered
  // structural list even when empty so auto windows/doors stay suppressed.
  if (Array.isArray(wf[face])) {
    return wf[face].filter(op => op && (op.type === 'window' || op.type === 'door'));
  }

  // null means the face has never been manually controlled and may use the
  // global auto window/door settings.
  return null;
}

/* Resolve the building's effective bay state.
 *
 * Returns { hasFrontBay, hasBackBay, bayXStart, bayXEnd, bayWidth, bayHeight }.
 *
 * Source of truth is cfg.manualOpenings — bays are placed through the
 * opening editor's toolbox, never via top-level cfg fields. A through-bay
 * is stored as twin entries on both front and back walls (same local-X),
 * but resolveBay is defensive: if it sees a through entry on only one
 * wall it still flags the other wall's cut so an orphan half doesn't
 * silently disappear.
 */
function resolveBay(cfg, fbWidth) {
  const frontBay = findBayOnFace(cfg, 'front');
  const backBay  = findBayOnFace(cfg, 'back');

  // A through-bay on either wall implies the OTHER wall is also cut, even
  // if the twin entry is missing (defensive against any orphan halves).
  const frontThrough = !!(frontBay && frontBay.style === 'through');
  const backThrough  = !!(backBay  && backBay.style  === 'through');

  const hasFrontBay = !!frontBay || backThrough;
  const hasBackBay  = !!backBay  || frontThrough;

  if (!hasFrontBay && !hasBackBay) {
    return { hasFrontBay: false, hasBackBay: false,
             bayXStart: 0, bayXEnd: 0, bayWidth: 0, bayHeight: 0 };
  }

  // Bay parameters come from whichever bay actually exists. When both exist
  // (the twin entries created by a through-bay drop), the FRONT entry is
  // the canonical source — its x is the world position from west, which
  // also equals the front wall's local x in the laser layout. The BACK
  // wall's local x must be MIRRORED for a through-bay (fbWidth - x - w)
  // because the back wall is assembled with its cladding face turned
  // outward (north), which physically flips it horizontally relative to
  // the front. Without that mirror, the two bay cuts end up at opposite
  // corners of the building in 3D and the bay doesn't actually go through.
  //
  // The plan exposes bayXStart in the canonical (front-wall / world-from-west)
  // frame; consumers that draw the back wall pass `which='back'` to
  // planBayXFor() to get the mirrored coordinates. Side bays (no front
  // partner, no through-bay style) use the bay's own stored x directly
  // with no mirror — they're a single-wall feature.
  const src = frontBay || backBay;
  const bayWidth  = src.w;
  const bayHeight = src.h;
  const bayXStart = src.x;
  const bayXEnd   = bayXStart + bayWidth;
  const bayIsThrough = !!(frontBay && frontBay.style === 'through')
                    || !!(backBay  && backBay.style  === 'through');
  const frontBayXStart = frontBay ? frontBay.x : bayXStart;
  const frontBayXEnd   = frontBay ? frontBay.x + frontBay.w : bayXEnd;
  const backBayXStart  = backBay  ? backBay.x  : bayXStart;
  const backBayXEnd    = backBay  ? backBay.x + backBay.w : bayXEnd;

  return { hasFrontBay, hasBackBay, bayXStart, bayXEnd, bayWidth, bayHeight, bayIsThrough,
           frontBayXStart, frontBayXEnd, backBayXStart, backBayXEnd };
}

/* For a through-bay the back wall's local-x must be mirrored so the cut
 * aligns with the front-wall cut in 3D after the back wall is flipped
 * during assembly. Front-wall consumers and side-bay back-wall consumers
 * both use the canonical x as stored; only a back-wall consumer with a
 * through-bay needs the mirror. Returns { bayXStart, bayXEnd } in the
 * frame appropriate for `which`. */
function planBayXFor(plan, which) {
  // SVG/export consumers need the bay X coordinate in the specific wall
  // sheet's local frame. Embedded-rail generated through-bays can have
  // different front/back local X values even though they share one physical
  // centerline, so prefer the per-face values captured by resolveBay().
  if (which === 'front' && Number.isFinite(plan.frontBayXStart) && Number.isFinite(plan.frontBayXEnd)) {
    return { bayXStart: plan.frontBayXStart, bayXEnd: plan.frontBayXEnd };
  }
  if (which === 'back' && Number.isFinite(plan.backBayXStart) && Number.isFinite(plan.backBayXEnd)) {
    return { bayXStart: plan.backBayXStart, bayXEnd: plan.backBayXEnd };
  }
  return { bayXStart: plan.bayXStart, bayXEnd: plan.bayXEnd };
}


/* Returns {w, h, mullion} for the current style+scale */
function getWindowDims(cfg) {
  const style = WINDOW_STYLES[cfg.windowStyle];
  if (!style) return { w: 8, h: 5, mullion: 'none' };
  const scale = WINDOW_SCALES[cfg.windowScale] || 1.0;
  return {
    w: style.baseW * scale,
    h: style.baseH * scale,
    mullion: style.mullion,
    styleKey: cfg.windowStyle,
    scaleKey: cfg.windowScale,
  };
}

/* Returns the window dims for the GROUND FLOOR specifically. If the override
   is enabled, uses cfg.firstFloorWindowStyle and firstFloorWindowScale.
   Otherwise returns the same dims as the regular getWindowDims. */
function getGroundFloorWindowDims(cfg) {
  if (!cfg.firstFloorWindowStyleEnabled) return getWindowDims(cfg);
  const style = WINDOW_STYLES[cfg.firstFloorWindowStyle];
  if (!style) return getWindowDims(cfg);
  const scale = WINDOW_SCALES[cfg.firstFloorWindowScale] || 1.0;
  return {
    w: style.baseW * scale,
    h: style.baseH * scale,
    mullion: style.mullion,
    styleKey: cfg.firstFloorWindowStyle,
    scaleKey: cfg.firstFloorWindowScale,
  };
}

/* Returns the cladding style key to use for the GROUND FLOOR specifically.
   When the override is enabled, returns cfg.firstFloorCladdingStyle; otherwise
   returns cfg.claddingStyle (same as upper floors). */
function getGroundFloorCladdingStyle(cfg) {
  if (cfg.firstFloorCladdingStyleEnabled && CLADDING_STYLES[cfg.firstFloorCladdingStyle]) {
    return cfg.firstFloorCladdingStyle;
  }
  return cfg.claddingStyle;
}

/* Returns true if the ground floor has a different cladding style than the upper
   floors and we need to split the cladding panels. */
function hasSplitCladding(cfg) {
  return cfg.firstFloorCladdingStyleEnabled
    && CLADDING_STYLES[cfg.firstFloorCladdingStyle]
    && cfg.firstFloorCladdingStyle !== cfg.claddingStyle;
}

/* Returns mullion lines (etched) inside a window opening at (x, y, w, h).
   Returns array of {x1, y1, x2, y2} in the same coordinate frame as the window. */
function getMullionLines(x, y, w, h, mullion) {
  const lines = [];
  if (mullion === 'vertical_1') {
    // single vertical bar in the middle
    lines.push({ x1: x + w/2, y1: y, x2: x + w/2, y2: y + h });
  } else if (mullion === 'vertical_many') {
    // multiple vertical bars (3 evenly spaced for ribbon windows)
    const n = Math.max(2, Math.floor(w / 6));
    for (let i = 1; i < n; i++) {
      const xi = x + (i * w) / n;
      lines.push({ x1: xi, y1: y, x2: xi, y2: y + h });
    }
  } else if (mullion === 'grid_2x2') {
    lines.push({ x1: x + w/2, y1: y, x2: x + w/2, y2: y + h });
    lines.push({ x1: x, y1: y + h/2, x2: x + w, y2: y + h/2 });
  } else if (mullion === 'grid_3x2') {
    lines.push({ x1: x + w/3, y1: y, x2: x + w/3, y2: y + h });
    lines.push({ x1: x + 2*w/3, y1: y, x2: x + 2*w/3, y2: y + h });
    lines.push({ x1: x, y1: y + h/2, x2: x + w, y2: y + h/2 });
  } else if (mullion === 'industrial_slider_3' || mullion === 'industrial_slider_4' || mullion === 'industrial_slider_6') {
    const cols = (mullion === 'industrial_slider_3') ? 3 : (mullion === 'industrial_slider_4') ? 4 : 6;
    const splitY = y + h * 0.68;
    for (let i = 1; i < cols; i++) {
      const xi = x + (i * w) / cols;
      lines.push({ x1: xi, y1: y, x2: xi, y2: y + h });
    }
    lines.push({ x1: x, y1: splitY, x2: x + w, y2: splitY });
  }
  return lines;
}
