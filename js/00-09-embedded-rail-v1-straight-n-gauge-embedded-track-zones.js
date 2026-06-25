'use strict';

/* =====================================================================
   EMBEDDED RAIL V1 — straight N-gauge embedded track zones
   ---------------------------------------------------------------------
   This feature is intentionally modelled as a floor-zone recipe rather than
   as generic objects that slot through the floor. Trusses/supports remain
   etch-only. The existing hole feature remains the only ordinary through-cut;
   holes are blocked from rail safety zones and, when valid, cut all generated
   rail stack layers.
   ===================================================================== */
const EMBEDDED_RAIL_DEFAULT_PROFILE = {
  label: 'N gauge Code 80 starter profile',
  gaugeInsideRailsMm: 9.0,
  railCode: 80,
  railHeightMm: 2.03,
  totalTrackHeightMm: 3.0,
  sleeperWidthMm: 16.0,
  outsideRailWidthMm: 10.8,
  betweenRailsInsertWidthMm: 7.2,
  flangeSideClearanceMm: 0.9,
  safetyMarginMm: 2.0,
  bayOpeningWidthMm: 27,
  bayOpeningHeightMm: 45,
};
function embeddedRailProfile(z) {
  return { ...EMBEDDED_RAIL_DEFAULT_PROFILE, ...((z && z.trackProfile) || {}) };
}
function embeddedRailsForCfg(cfg) {
  return (cfg && Array.isArray(cfg.embeddedRails)) ? cfg.embeddedRails.filter(z => z && z.w > 1 && z.h > 1) : [];
}
function embeddedRailOrientation(z) {
  // 'auto' keeps the editor simple: the rail runs along the rectangle's long axis.
  // Users can override the direction from the floor-editor top bar when needed.
  const raw = z && z.orientation;
  if (raw === 'ns' || raw === 'ew') return raw;
  return ((z && Number(z.w) || 0) >= ((z && Number(z.h)) || 0)) ? 'ew' : 'ns';
}
function embeddedRailOrientationLabel(z) {
  const eff = embeddedRailOrientation(z);
  const raw = (z && z.orientation) || 'auto';
  if (raw === 'auto' || raw == null) return `Auto ${eff.toUpperCase()}`;
  return eff.toUpperCase();
}
function embeddedRailSafetyRect(z) {
  const pr = embeddedRailProfile(z);
  const o = embeddedRailOrientation(z);
  const margin = pr.safetyMarginMm || 2;
  if (o === 'ew') {
    const cy = z.y + z.h / 2 + (z.trackOffset || 0);
    const band = pr.sleeperWidthMm + 2 * margin;
    return { x: z.x, y: cy - band / 2, w: z.w, h: band };
  }
  const cx = z.x + z.w / 2 + (z.trackOffset || 0);
  const band = pr.sleeperWidthMm + 2 * margin;
  return { x: cx - band / 2, y: z.y, w: band, h: z.h };
}
function rectsOverlap(a, b, pad = 0) {
  return !!(a && b && a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y);
}
function floorHoleBBox(h) {
  if (!h) return null;
  if (h.shape === 'circle') {
    const d = h.d || 3;
    return { x: h.x - d / 2, y: h.y - d / 2, w: d, h: d };
  }
  return { x: h.x - (h.w || 5) / 2, y: h.y - (h.h || 5) / 2, w: h.w || 5, h: h.h || 5 };
}
function floorHoleOverlapsEmbeddedRailSafety(h, cfg) {
  const hb = floorHoleBBox(h);
  return embeddedRailsForCfg(cfg).some(z => rectsOverlap(hb, embeddedRailSafetyRect(z), 0));
}
function embeddedRailValidationWarnings(cfg) {
  const out = [];
  const rails = embeddedRailsForCfg(cfg);
  if (!rails.length) return out;
  const matT = cfg.coreThickness || 1.5;
  const bcW = (cfg.width || 80) - 2 * matT;
  const bcH = (cfg.depth || 80) - 2 * matT;
  rails.forEach((z, i) => {
    const label = `Embedded rail #${i + 1}`;
        if (z.x < -0.01 || z.y < -0.01 || z.x + z.w > bcW + 0.01 || z.y + z.h > bcH + 0.01) {
      out.push(`${label}: zone extends outside the interior floor footprint.`);
    }
    const sr = embeddedRailSafetyRect(z);
    for (const h of (cfg.floorHoles || [])) {
      if (rectsOverlap(floorHoleBBox(h), sr, 0)) {
        out.push(`${label}: a floor hole overlaps the protected track safety zone and will be skipped for placement/export safety.`);
        break;
      }
    }
  });
  return out;
}
function embeddedRailBayWallWidthForFace(cfg, face) {
  const matT = (cfg && cfg.coreThickness) || 1.5;
  if (face === 'east' || face === 'west') return Math.max(0, ((cfg && cfg.depth) || 80) - 2 * matT);
  return (cfg && cfg.width) || 80;
}
function embeddedRailSvgMirrorsFace(face) {
  // Rail-generated bay openings use the same floor-plan physical coordinate
  // in the SVG/export wall sheets. The floor editor and 3D preview are the
  // source of truth for rail centerline position; mirroring here made the
  // SVG bay holes appear on the opposite side from both. Any required visual
  // face mirroring is handled by the wall/SVG renderer itself, not by the
  // embedded-rail bay generator.
  return false;
}
function embeddedRailPhysicalXToWallLocal(cfg, face, x, w) {
  const wallW = embeddedRailBayWallWidthForFace(cfg, face);
  if (embeddedRailSvgMirrorsFace(face)) return Math.max(0, Math.min(wallW - w, wallW - x - w));
  return Math.max(0, Math.min(wallW - w, x));
}
function embeddedRailWallLocalXToPhysical(cfg, face, x, w) {
  const wallW = embeddedRailBayWallWidthForFace(cfg, face);
  if (embeddedRailSvgMirrorsFace(face)) return Math.max(0, Math.min(wallW - w, wallW - x - w));
  return Math.max(0, Math.min(wallW - w, x));
}
function embeddedRailBayOpsForFace(cfg, face, opts = {}) {
  const rails = embeddedRailsForCfg(cfg);
  if (!rails.length) return [];
  const H = wallBodyHeightFromConfig(cfg) || 60;
  const matT = cfg.coreThickness || 1.5;
  const bcW = (cfg.width || 80) - 2 * matT;
  const bcH = (cfg.depth || 80) - 2 * matT;
  const coordSpace = opts.coordSpace || opts.space || 'svg';
  const ops = [];
  for (let railIdx = 0; railIdx < rails.length; railIdx++) {
    const z = rails[railIdx];
    const o = embeddedRailOrientation(z);
    const pr = embeddedRailProfile(z);
    const bayW = pr.bayOpeningWidthMm || 27;
    const bayH = pr.bayOpeningHeightMm || 45;
    let x = 0, through = false, hit = false;
    if (o === 'ns') {
      const trackXInterior = z.x + z.w / 2 + (z.trackOffset || 0);
      // Physical coordinate: model west-to-east, matching the floor editor.
      x = Math.max(0, Math.min((cfg.width || bcW) - bayW, matT + trackXInterior - bayW / 2));
      const touchesFront = z.y <= 0.5;
      const touchesBack  = z.y + z.h >= bcH - 0.5;
      through = touchesFront && touchesBack;
      hit = (face === 'front' && touchesFront) || (face === 'back' && touchesBack);
    } else {
      // Physical coordinate along the side wall's depth axis.
      const trackYInterior = z.y + z.h / 2 + (z.trackOffset || 0);
      x = Math.max(0, Math.min((cfg.depth || bcH) - bayW, matT + trackYInterior - bayW / 2));
      const touchesWest = z.x <= 0.5;
      const touchesEast = z.x + z.w >= bcW - 0.5;
      through = touchesWest && touchesEast;
      hit = (face === 'west' && touchesWest) || (face === 'east' && touchesEast);
    }
    if (hit) {
      const wallLocalX = (coordSpace === 'physical') ? x : embeddedRailPhysicalXToWallLocal(cfg, face, x, bayW);
      ops.push({
        type: 'bay', style: through ? 'through' : 'side',
        x: wallLocalX, y: Math.max(0, H - bayH), w: bayW, h: Math.min(bayH, H),
        doorStyle: 'none', doorPercentOpen: 0,
        _embeddedRail: true,
        _embeddedRailIndex: railIdx,
        _embeddedRailFace: face,
        _embeddedRailCoordSpace: coordSpace,
      });
    }
  }
  return ops;
}

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
