'use strict';

/* =====================================================================
   GEOMETRY PRIMITIVES
   ===================================================================== */

// Stored from the last successful generateBuilding call — used by the WYSIWYG editor
let lastPlan = null;
let lastResult = null;

/**
 * Place tongues evenly along an edge of given length, dodging "forbidden zones"
 * where a tongue cannot be placed (e.g. opening cutouts).
 *
 * Returns array of {start, end, center} in mm along the edge.
 *
 * Parameters:
 *   edgeLength: total length of edge (mm)
 *   tongueWidth: width of each tongue (mm)
 *   minMargin: minimum distance from edge corners or forbidden zones (mm)
 *   forbidden: array of [start, end] pairs along the edge where tongues can't go
 *   targetCount: desired number of tongues (algorithm may reduce if it doesn't fit)
 *   minSpacing: minimum gap between adjacent tongues (mm)
 */
function placeTongues(edgeLength, tongueWidth, minMargin, forbidden, targetCount, minSpacing) {
  if (targetCount <= 0 || edgeLength <= 0) return [];
  forbidden = forbidden || [];
  minMargin = minMargin || 3;
  minSpacing = minSpacing || 5;

  // Build list of "free regions" along the edge, accounting for corner margins
  // and forbidden zones (with minMargin on each side of each forbidden zone).
  let regions = [{ start: minMargin, end: edgeLength - minMargin }];
  for (const [fStart, fEnd] of forbidden) {
    const newRegions = [];
    for (const r of regions) {
      const fS = fStart - minMargin;
      const fE = fEnd + minMargin;
      if (fE <= r.start || fS >= r.end) {
        newRegions.push(r);
      } else {
        if (fS > r.start) newRegions.push({ start: r.start, end: Math.min(r.end, fS) });
        if (fE < r.end) newRegions.push({ start: Math.max(r.start, fE), end: r.end });
      }
    }
    regions = newRegions;
  }

  // If no region can fit a full-width tongue, try with a smaller tongue width
  // (fall back to 75% then 50% of tongueWidth)
  let effectiveTongueWidth = tongueWidth;
  let regionsWithCapacity = regions.filter(r => (r.end - r.start) >= effectiveTongueWidth);
  if (regionsWithCapacity.length === 0 && tongueWidth > 5) {
    effectiveTongueWidth = Math.max(5, tongueWidth * 0.6);
    regionsWithCapacity = regions.filter(r => (r.end - r.start) >= effectiveTongueWidth);
  }
  if (regionsWithCapacity.length === 0 && effectiveTongueWidth > 4) {
    effectiveTongueWidth = 4;
    regionsWithCapacity = regions.filter(r => (r.end - r.start) >= effectiveTongueWidth);
  }
  if (regionsWithCapacity.length === 0) return [];
  regions = regionsWithCapacity;

  const totalCapacity = regions.reduce((sum, r) => {
    const len = r.end - r.start;
    return sum + Math.max(0, Math.floor((len + minSpacing) / (effectiveTongueWidth + minSpacing)));
  }, 0);
  if (totalCapacity === 0) return [];

  // Two-pass distribution. The OLD greedy rounded `actualCount * cap / total`
  // per region, which for two equal-capacity regions splitting around a
  // centered obstacle (e.g. the default single side door) handed the first
  // region its full Math.round(actualCount/2) share and left the second
  // region short — producing visibly lopsided 2+1 tongue rows on side walls.
  //
  // New algorithm:
  //   pass 1: give every region a baseline of floor(actualCount / numRegions)
  //           tongues (capped at the region's capacity).
  //   pass 2: distribute leftover tongues one at a time, always to the region
  //           with the most REMAINING capacity (cap minus tongues already
  //           assigned). Ties broken by visiting regions in their natural
  //           left-to-right order; never assigns a remainder when the
  //           pre-distributed counts already saturate the regions OR when
  //           giving it would make a strictly-equal-capacity sibling visibly
  //           emptier — i.e. for N equal regions with k < N remainder
  //           tongues, those tongues are dropped to keep visual symmetry,
  //           preferring fewer-but-balanced to more-but-lopsided.
  const actualCount = Math.min(targetCount, totalCapacity);
  const numRegions = regions.length;
  const baseShare = (numRegions > 0) ? Math.floor(actualCount / numRegions) : 0;
  // Capacities aligned with the sorted-by-length region order used below
  // (regions sorted by length desc → same order we'll iterate in pass 2).
  const sortedRegions = [...regions].sort((a, b) => (b.end - b.start) - (a.end - a.start));
  const regionCaps = sortedRegions.map(r => {
    const len = r.end - r.start;
    return Math.max(0, Math.floor((len + minSpacing) / (effectiveTongueWidth + minSpacing)));
  });
  // assigned[i] = how many tongues region i has been given
  const assigned = sortedRegions.map((_, i) => Math.min(baseShare, regionCaps[i]));
  let remaining = actualCount - assigned.reduce((s, n) => s + n, 0);

  // Distribute the remainder. Each iteration: pick the region whose REMAINING
  // capacity (cap − assigned) is STRICTLY greater than every other region's,
  // and add one tongue there. If no region uniquely wins (all candidates tied
  // at the same remaining-capacity), stop — adding to one would unbalance
  // against its equal sibling. This is the case that fires when a side wall
  // door splits the bottom edge into two equal regions: both regions have
  // the same leftover capacity, so no remainder is assigned and the result
  // is a symmetric 1+1 layout instead of a lopsided 2+1.
  while (remaining > 0) {
    let bestIdx = -1, bestExcess = -1;
    let bestUnique = false;
    for (let i = 0; i < sortedRegions.length; i++) {
      const excess = regionCaps[i] - assigned[i];
      if (excess <= 0) continue;
      if (excess > bestExcess) {
        bestExcess = excess;
        bestIdx = i;
        bestUnique = true;
      } else if (excess === bestExcess) {
        bestUnique = false;
      }
    }
    if (bestIdx === -1 || !bestUnique) break;
    assigned[bestIdx] += 1;
    remaining -= 1;
  }

  const tongues = [];
  for (let i = 0; i < sortedRegions.length; i++) {
    const r = sortedRegions[i];
    const nForRegion = assigned[i];
    if (nForRegion === 0) continue;
    const len = r.end - r.start;
    const totalTongueWidth = nForRegion * effectiveTongueWidth;
    const totalGapSpace = len - totalTongueWidth;
    const gap = totalGapSpace / (nForRegion + 1);
    for (let i2 = 0; i2 < nForRegion; i2++) {
      const start = r.start + gap + i2 * (effectiveTongueWidth + gap);
      tongues.push({ start, end: start + effectiveTongueWidth, center: start + effectiveTongueWidth / 2 });
    }
  }
  // Sort tongues by start position
  tongues.sort((a, b) => a.start - b.start);
  return tongues;
}

/* Mirror slot positions along an edge while preserving slot widths.
 * Used when converting wall-local tongue coordinates into floor-plan
 * coordinates.  The front wall is edited/exported as an exterior elevation,
 * but the floor plan is viewed from above with the front edge at the top;
 * those two views face each other, so the front wall's left/right order is
 * reversed on the floor panel. */
function mirrorSlotsAlongEdge(slots, edgeLength) {
  return (slots || [])
    .map(s => {
      const center = (s.center != null) ? s.center : (s.start + s.end) / 2;
      return {
        ...s,
        start: edgeLength - s.end,
        end:   edgeLength - s.start,
        center: edgeLength - center,
      };
    })
    .sort((a, b) => a.start - b.start);
}


/* Assembly-keyed wall bottom tabs ---------------------------------------
 *
 * Some wall faces are visually direction-sensitive: manual windows/doors,
 * cladding overrides, printed overlays, fixtures, asymmetric bays, etc. If
 * their bottom tabs are perfectly symmetric, the core wall can accidentally be
 * plugged into the matching floor slots backwards; the SVG wall and cladding
 * will then disagree even though the joint physically fits.
 *
 * When asymmetricWallKeying is enabled, these helpers shift ONLY the bottom
 * tongue/slot row for an orientation-sensitive face. The wall bottom tongues
 * and the matching floor slots both pass through the same helper in wall-local
 * coordinates, so they still fit each other, but the reversed wall no longer
 * lines up with the floor.
 */
function isFeatureCenteredOnEdge(op, edgeLength, eps = 0.25) {
  if (!op || op.x == null || op.w == null || !edgeLength) return true;
  const c = Number(op.x) + Number(op.w) / 2;
  return Math.abs(c - edgeLength / 2) <= eps;
}

function wallFaceHasOrientationSensitiveFeatures(cfg, face, edgeLength) {
  if (!cfg || cfg.asymmetricWallKeying === false) return false;

  // Manual/unified wall features are the strongest signal. Surface-only
  // features matter too because cladding may be asymmetric even when the core
  // wall has no cut openings.
  const features = wallFeaturesForFace(cfg, face, { clone: false });
  if (Array.isArray(features) && features.length) {
    // Any non-centered feature makes orientation obvious. If all features are
    // centered but the user manually edited the face, still key it when there
    // is more than one item because the sequence/order may be asymmetric.
    if (features.some(op => op && op.type && !isFeatureCenteredOnEdge(op, edgeLength))) return true;
    if (features.length > 1) return true;
    // Surface-only cladding/printed/fixture details can be visually asymmetric
    // even with a centered bounding box.
    if (features.some(op => op && WALL_FEATURE_SURFACE_TYPES.has(op.type))) return true;
  }

  // Legacy buckets may still appear in imported configs before migration has
  // stripped them, so treat any explicit cladding/fixture/printed items as
  // orientation-sensitive.
  for (const bucket of ['manualCladdingOverrides', 'manualFixtures', 'manualPrintedItems', 'manualAwnings', 'manualBalconies']) {
    const arr = cfg[bucket] && cfg[bucket][face];
    if (Array.isArray(arr) && arr.length) return true;
  }

  // Ground-floor special cladding creates a visibly different layered face;
  // key all faces so a wall cannot be flipped relative to its exterior skin.
  if (cfg.firstFloorCladdingStyleEnabled && cfg.firstFloorCladdingStyle && cfg.firstFloorCladdingStyle !== cfg.claddingStyle) return true;

  return false;
}

function wallAssemblyKeyOffset(cfg, face, edgeLength, matT, tw) {
  if (!wallFaceHasOrientationSensitiveFeatures(cfg, face, edgeLength)) return 0;
  // Keep the offset large enough to be obvious in the joint, but small enough
  // to preserve the existing tongue layout around doors/bays.
  const base = Math.min(4, Math.max(1.5, (matT || 1.5) * 1.6, (tw || 15) * 0.12));
  // Opposite faces shift opposite ways so accidentally swapping/reversing wall
  // panels is less likely to fit.
  const signByFace = { front: 1, back: -1, east: 1, west: -1 };
  return (signByFace[face] || 1) * base;
}

function rangesOverlap(a0, a1, b0, b1) {
  return a0 < b1 - 0.01 && a1 > b0 + 0.01;
}

function shiftedTonguesAreSafe(tongues, edgeLength, forbidden, margin) {
  const fz = forbidden || [];
  for (const t of tongues || []) {
    if (t.start < margin - 0.01 || t.end > edgeLength - margin + 0.01) return false;
    for (const [f0, f1] of fz) {
      if (rangesOverlap(t.start, t.end, f0 - margin, f1 + margin)) return false;
    }
  }
  return true;
}

function applyWallAssemblyKeyToTongues(tongues, edgeLength, cfg, face, forbidden, matT, tw, marginOverride) {
  const original = (tongues || []).map(t => ({ ...t }));
  const offset = wallAssemblyKeyOffset(cfg, face, edgeLength, matT, tw);
  if (!offset || original.length === 0) return original;
  const margin = marginOverride != null ? marginOverride : Math.max((matT || 1.5) * 2, 5);

  // Try the full offset, then reduced offsets. If a door/bay leaves no room,
  // leave the row unkeyed rather than creating a bad slot collision.
  for (const mult of [1, 0.75, 0.5, 0.25]) {
    const dx = offset * mult;
    const shifted = original.map(t => ({
      ...t,
      start: t.start + dx,
      end: t.end + dx,
      center: (t.center != null ? t.center + dx : (t.start + t.end) / 2 + dx),
      assemblyKeyed: true,
      assemblyKeyFace: face,
    })).sort((a, b) => a.start - b.start);
    if (shiftedTonguesAreSafe(shifted, edgeLength, forbidden, margin)) return shifted;
  }
  return original;
}

/**
 * Build a wall path with tongues, slots, and openings.
 * The path starts at (0,0), goes around clockwise, and returns.
 *
 * Spec object:
 *   width, height: outer dimensions of the wall body (mm)
 *   matT: material thickness for tongue/slot depth (mm)
 *   kerf: kerf compensation (mm; subtracted from tongue dims, added to slot dims)
 *   edges: { top, bottom, left, right }
 *     each edge: { tongues: [{start, end}], openings: [{start, end}] }
 *     start/end are positions ALONG the edge (in mm) measured from the start corner.
 *     A tongue protrudes OUTWARD from the edge by matT.
 *     An opening cuts INTO the wall (creates a notch in the perimeter).
 *
 * Direction conventions (clockwise from top-left):
 *   Top edge goes left→right (x increases), tongues protrude UP (-y), openings cut DOWN
 *   Right edge goes top→bottom (y increases), tongues protrude RIGHT (+x), openings cut LEFT
 *   Bottom edge goes right→left (x decreases), tongues protrude DOWN (+y), openings cut UP
 *   Left edge goes bottom→top (y decreases), tongues protrude LEFT (-x), openings cut RIGHT
 */
function buildWallPath(spec) {
  const { width: W, height: H, matT, kerf } = spec;
  const k = kerf || 0;
  const td = matT;     // tongue depth = material thickness
  const sd = matT;     // slot depth same

  // Apply kerf: tongues get smaller (subtract k), slots get bigger (add k)
  // (k is typically negative for laser kerf, so subtracting makes tongues smaller)
  const tk = -k;  // tongue trim per side
  const sk = k;   // slot expansion per side

  let d = `M 0,0`;

  // === TOP EDGE (left to right, tongues UP, openings DOWN-cutting)
  // Sort features by start position
  const topFeatures = [
    ...spec.edges.top.tongues.map(t => ({ ...t, kind: 'tongue' })),
    ...spec.edges.top.openings.map(o => ({ ...o, kind: 'opening' })),
  ].sort((a, b) => a.start - b.start);
  let x = 0;
  for (const f of topFeatures) {
    const fStart = f.start + (f.kind === 'tongue' ? tk : -sk);
    const fEnd = f.end - (f.kind === 'tongue' ? tk : -sk);
    if (fStart > x) d += ` L ${fStart},0`;
    if (f.kind === 'tongue') {
      d += ` L ${fStart},${-td} L ${fEnd},${-td} L ${fEnd},0`;
    } else { // opening
      d += ` L ${fStart},${td} L ${fEnd},${td} L ${fEnd},0`;
    }
    x = fEnd;
  }
  if (x < W) d += ` L ${W},0`;

  // === RIGHT EDGE (top to bottom, tongues RIGHT, openings LEFT-cutting)
  const rightFeatures = [
    ...spec.edges.right.tongues.map(t => ({ ...t, kind: 'tongue' })),
    ...spec.edges.right.openings.map(o => ({ ...o, kind: 'opening' })),
  ].sort((a, b) => a.start - b.start);
  let y = 0;
  for (const f of rightFeatures) {
    const fStart = f.start + (f.kind === 'tongue' ? tk : -sk);
    const fEnd = f.end - (f.kind === 'tongue' ? tk : -sk);
    if (fStart > y) d += ` L ${W},${fStart}`;
    if (f.kind === 'tongue') {
      d += ` L ${W + td},${fStart} L ${W + td},${fEnd} L ${W},${fEnd}`;
    } else {
      d += ` L ${W - td},${fStart} L ${W - td},${fEnd} L ${W},${fEnd}`;
    }
    y = fEnd;
  }
  if (y < H) d += ` L ${W},${H}`;

  // === BOTTOM EDGE (right to left, tongues DOWN, openings UP-cutting)
  const bottomFeatures = [
    ...spec.edges.bottom.tongues.map(t => ({ ...t, kind: 'tongue' })),
    ...spec.edges.bottom.openings.map(o => ({ ...o, kind: 'opening' })),
  ].sort((a, b) => b.start - a.start);  // reverse order, traversing right-to-left
  // Bottom features use position measured from the LEFT, but we're walking from right to left
  // So convert: in path-x, position from LEFT = position. Going right to left, we visit larger x first.
  let xpos = W;
  // Re-sort based on position-from-left, descending
  const bottomFeaturesSorted = [...bottomFeatures];
  for (const f of bottomFeaturesSorted) {
    // f.start, f.end are measured from the left of the bottom edge
    const fStart = f.start + (f.kind === 'tongue' ? tk : -sk);
    const fEnd = f.end - (f.kind === 'tongue' ? tk : -sk);
    // Walking right-to-left: jump to the END (rightmost edge of feature) first
    if (xpos > fEnd) d += ` L ${fEnd},${H}`;
    if (f.kind === 'tongue') {
      d += ` L ${fEnd},${H + td} L ${fStart},${H + td} L ${fStart},${H}`;
    } else {
      d += ` L ${fEnd},${H - td} L ${fStart},${H - td} L ${fStart},${H}`;
    }
    xpos = fStart;
  }
  if (xpos > 0) d += ` L 0,${H}`;

  // === LEFT EDGE (bottom to top, tongues LEFT, openings RIGHT-cutting)
  const leftFeatures = [
    ...spec.edges.left.tongues.map(t => ({ ...t, kind: 'tongue' })),
    ...spec.edges.left.openings.map(o => ({ ...o, kind: 'opening' })),
  ].sort((a, b) => b.start - a.start);  // reverse: positions from top, descending
  let ypos = H;
  for (const f of leftFeatures) {
    // f.start, f.end measured from the TOP of the left edge
    const fStart = f.start + (f.kind === 'tongue' ? tk : -sk);
    const fEnd = f.end - (f.kind === 'tongue' ? tk : -sk);
    // Walking bottom-to-top: visit larger y first (i.e. fEnd)
    if (ypos > fEnd) d += ` L 0,${fEnd}`;
    if (f.kind === 'tongue') {
      d += ` L ${-td},${fEnd} L ${-td},${fStart} L 0,${fStart}`;
    } else {
      d += ` L ${td},${fEnd} L ${td},${fStart} L 0,${fStart}`;
    }
    ypos = fStart;
  }
  if (ypos > 0) d += ` L 0,0`;
  d += ` Z`;
  return d;
}

/* Build an L-shaped wall perimeter path WITH edge tongues.
   extRight=true  → extension at bottom-right; extRight=false → extension at bottom-left.
   stepY = mainH − extH (where the inner step starts from the top).

   opts:
     matT      — tongue/slot depth (= material thickness)
     mainTopTongues  — tongues along the main top edge (x in [0, mainW]),    protrude UP
     extTopTongues   — tongues along the extension top edge,                 protrude UP
     mainBotTongues  — tongues along the main-portion bottom (x in [0, mainW])
     extBotTongues   — tongues along the extension-portion bottom
     extTopShift     — offset (in main x) of the ext-top tongues relative to the
                       start of the extension. Used when the L-shape bridges the
                       wing's matT corner so tongue positions still match the
                       wing's roof/wall layout. Defaults to 0.
     extBotShift     — same idea, for the bottom edge.
     extRightTongues — tongues along the extension's right edge (y in [0, extH]), protrude RIGHT
     leftTongues     — tongues along the full left edge (y in [0, mainH]),         protrude LEFT
     mainRightTongues— tongues along the main wall's far-side right edge (only used
                       when extRight=false; the L-shape's "right" is the main wall there)
*/
function buildLShapePathWithFeatures(mainW, mainH, extW, extH, extRight, opts) {
  const matT = opts.matT;
  const stepY = mainH - extH;
  const totalW = mainW + extW;
  const fx = v => v.toFixed(3);
  const td  = matT;

  const mainTop = (opts.mainTopTongues || []).slice().sort((a, b) => a.start - b.start);
  const extTop  = (opts.extTopTongues  || []).slice().sort((a, b) => a.start - b.start);
  const mainBot = (opts.mainBotTongues || []).slice().sort((a, b) => a.start - b.start);
  const extBot  = (opts.extBotTongues  || []).slice().sort((a, b) => a.start - b.start);
  const extRT   = (opts.extRightTongues|| []).slice().sort((a, b) => a.start - b.start);
  const leftTng = (opts.leftTongues    || []).slice().sort((a, b) => a.start - b.start);
  const extBotShift = opts.extBotShift || 0;
  const extTopShift = opts.extTopShift || 0;

  // Combine bottom tongues into a single list in wall-local x. Main portion is
  // at wall-local x = xMainStart + t (xMainStart = 0 if extRight, extW otherwise).
  // Ext portion is at wall-local x = xExtStart + extBotShift + t (xExtStart = mainW if
  // extRight, 0 otherwise).
  const xMainStart = extRight ? 0      : extW;
  const xExtStart  = extRight ? mainW  : 0;
  const allBot = [
    ...mainBot.map(t => ({ start: xMainStart + t.start, end: xMainStart + t.end })),
    ...extBot .map(t => ({ start: xExtStart  + extBotShift + t.start,
                            end:   xExtStart  + extBotShift + t.end })),
  ].sort((a, b) => a.start - b.start);

  let d;

  // ── extRight=true: extension on the right; path walks ──────────────────────
  // (0,0) → main top → step at (mainW, 0..stepY) → ext top → ext right → bottom → left → close.
  if (extRight) {
    d = `M 0,0`;
    // Main top (x in [0, mainW], tongues UP at y=-td)
    let x = 0;
    for (const t of mainTop) {
      if (t.start > x) d += ` L ${fx(t.start)},0`;
      d += ` L ${fx(t.start)},${fx(-td)} L ${fx(t.end)},${fx(-td)} L ${fx(t.end)},0`;
      x = t.end;
    }
    if (x < mainW) d += ` L ${fx(mainW)},0`;
    // Step DOWN at x=mainW from y=0 to y=stepY (no features)
    d += ` L ${fx(mainW)},${fx(stepY)}`;
    // Ext top (x in [mainW, totalW], tongues UP at y=stepY-td). Tongue positions
    // come in as positions within the wing's wall length [0, ...]; the start of
    // those positions is offset by extTopShift inside the extension.
    x = mainW;
    for (const t of extTop) {
      const xs = mainW + extTopShift + t.start, xe = mainW + extTopShift + t.end;
      if (xs > x) d += ` L ${fx(xs)},${fx(stepY)}`;
      d += ` L ${fx(xs)},${fx(stepY - td)} L ${fx(xe)},${fx(stepY - td)} L ${fx(xe)},${fx(stepY)}`;
      x = xe;
    }
    if (x < totalW) d += ` L ${fx(totalW)},${fx(stepY)}`;
    // Ext right (y in [stepY, mainH], tongues RIGHT at x=totalW+td). Tongue positions
    // are in [0, extH] in local "y from stepY" coords → absolute y = stepY + t.
    let y = stepY;
    for (const t of extRT) {
      const ys = stepY + t.start, ye = stepY + t.end;
      if (ys > y) d += ` L ${fx(totalW)},${fx(ys)}`;
      d += ` L ${fx(totalW + td)},${fx(ys)} L ${fx(totalW + td)},${fx(ye)} L ${fx(totalW)},${fx(ye)}`;
      y = ye;
    }
    if (y < mainH) d += ` L ${fx(totalW)},${fx(mainH)}`;
    // Bottom (walking RIGHT→LEFT from totalW to 0, tongues DOWN at y=mainH+td)
    // and carving up by `bay.height` between bay.xEnd and bay.xStart if a bay
    // opening sits on this wall. Bay coords are already in L-frame (main side).
    const bay = opts.bay || null;
    let xpos = totalW;
    const sortedBot = [...allBot].sort((a, b) => b.start - a.start);
    // Tongues to the right of the bay (or all of them if no bay)
    for (const t of sortedBot) {
      if (bay && t.start < bay.xEnd) continue;
      if (xpos > t.end) d += ` L ${fx(t.end)},${fx(mainH)}`;
      d += ` L ${fx(t.end)},${fx(mainH + td)} L ${fx(t.start)},${fx(mainH + td)} L ${fx(t.start)},${fx(mainH)}`;
      xpos = t.start;
    }
    if (bay) {
      // Move to bay's east edge along y=mainH, then carve up, across, and down
      if (xpos > bay.xEnd) d += ` L ${fx(bay.xEnd)},${fx(mainH)}`;
      d += ` L ${fx(bay.xEnd)},${fx(mainH - bay.height)} L ${fx(bay.xStart)},${fx(mainH - bay.height)} L ${fx(bay.xStart)},${fx(mainH)}`;
      xpos = bay.xStart;
      // Remaining tongues to the left of the bay
      for (const t of sortedBot) {
        if (t.start >= bay.xEnd) continue;       // already handled
        if (t.end > bay.xStart) continue;         // would collide with bay
        if (xpos > t.end) d += ` L ${fx(t.end)},${fx(mainH)}`;
        d += ` L ${fx(t.end)},${fx(mainH + td)} L ${fx(t.start)},${fx(mainH + td)} L ${fx(t.start)},${fx(mainH)}`;
        xpos = t.start;
      }
    }
    if (xpos > 0) d += ` L 0,${fx(mainH)}`;
    // Left (full, walking BOTTOM→TOP from mainH to 0, tongues LEFT at x=-td).
    // leftTongues are in [0, mainH] measured from the TOP.
    let ypos = mainH;
    for (const t of [...leftTng].sort((a, b) => b.start - a.start)) {
      if (ypos > t.end) d += ` L 0,${fx(t.end)}`;
      d += ` L ${fx(-td)},${fx(t.end)} L ${fx(-td)},${fx(t.start)} L 0,${fx(t.start)}`;
      ypos = t.start;
    }
    if (ypos > 0) d += ` L 0,0`;
    d += ` Z`;
    return d;
  }

  // ── extRight=false: extension on the left; path walks ──────────────────────
  // (extW,0) → main top (right) → right edge → bottom → left edge UP to (0, stepY) →
  // ext top (right) to (extW, stepY) → step UP to (extW, 0) → close.
  d = `M ${fx(extW)},0`;
  // Main top (x in [extW, totalW], tongues UP at y=-td). mainTop positions are
  // in [0, mainW] so add extW to get wall-local x.
  let x = extW;
  for (const t of mainTop) {
    const xs = extW + t.start, xe = extW + t.end;
    if (xs > x) d += ` L ${fx(xs)},0`;
    d += ` L ${fx(xs)},${fx(-td)} L ${fx(xe)},${fx(-td)} L ${fx(xe)},0`;
    x = xe;
  }
  if (x < totalW) d += ` L ${fx(totalW)},0`;
  // Right edge (y in [0, mainH], tongues RIGHT at x=totalW+td). The original right
  // edge tongues belong to the MAIN wall (the side that was unchanged) — they
  // ride along the full mainH. We reuse leftTongues here only if the caller wanted to
  // — for extRight=false the OPPOSITE side is "right", so we pass the original right
  // tongues via opts. We don't have them here so leave the right edge plain unless
  // opts.mainRightTongues is supplied.
  const mainRight = (opts.mainRightTongues || []).slice().sort((a, b) => a.start - b.start);
  let y = 0;
  for (const t of mainRight) {
    if (t.start > y) d += ` L ${fx(totalW)},${fx(t.start)}`;
    d += ` L ${fx(totalW + td)},${fx(t.start)} L ${fx(totalW + td)},${fx(t.end)} L ${fx(totalW)},${fx(t.end)}`;
    y = t.end;
  }
  if (y < mainH) d += ` L ${fx(totalW)},${fx(mainH)}`;
  // Bottom (walking RIGHT→LEFT, tongues DOWN at y=mainH+td) — with optional
  // bay carve. Same logic as the extRight branch above.
  const bayLR = opts.bay || null;
  let xpos = totalW;
  const sortedBotLR = [...allBot].sort((a, b) => b.start - a.start);
  for (const t of sortedBotLR) {
    if (bayLR && t.start < bayLR.xEnd) continue;
    if (xpos > t.end) d += ` L ${fx(t.end)},${fx(mainH)}`;
    d += ` L ${fx(t.end)},${fx(mainH + td)} L ${fx(t.start)},${fx(mainH + td)} L ${fx(t.start)},${fx(mainH)}`;
    xpos = t.start;
  }
  if (bayLR) {
    if (xpos > bayLR.xEnd) d += ` L ${fx(bayLR.xEnd)},${fx(mainH)}`;
    d += ` L ${fx(bayLR.xEnd)},${fx(mainH - bayLR.height)} L ${fx(bayLR.xStart)},${fx(mainH - bayLR.height)} L ${fx(bayLR.xStart)},${fx(mainH)}`;
    xpos = bayLR.xStart;
    for (const t of sortedBotLR) {
      if (t.start >= bayLR.xEnd) continue;
      if (t.end > bayLR.xStart) continue;
      if (xpos > t.end) d += ` L ${fx(t.end)},${fx(mainH)}`;
      d += ` L ${fx(t.end)},${fx(mainH + td)} L ${fx(t.start)},${fx(mainH + td)} L ${fx(t.start)},${fx(mainH)}`;
      xpos = t.start;
    }
  }
  if (xpos > 0) d += ` L 0,${fx(mainH)}`;
  // Left edge from (0, mainH) UP to (0, stepY). Tongues LEFT at x=-td, only those
  // with t.start within (stepY, mainH).
  let ypos = mainH;
  for (const t of [...leftTng].sort((a, b) => b.start - a.start)) {
    if (t.start < stepY - 0.01) continue;  // skip tongues in the ext-top portion
    if (ypos > t.end) d += ` L 0,${fx(t.end)}`;
    d += ` L ${fx(-td)},${fx(t.end)} L ${fx(-td)},${fx(t.start)} L 0,${fx(t.start)}`;
    ypos = t.start;
  }
  if (ypos > stepY) d += ` L 0,${fx(stepY)}`;
  // Ext top (walking LEFT→RIGHT from (0, stepY) to (extW, stepY), tongues UP at y=stepY-td)
  // extTop tongue positions are within [0, wing wall length]; shift by extTopShift.
  x = 0;
  for (const t of extTop) {
    const xs = extTopShift + t.start, xe = extTopShift + t.end;
    if (xs > x) d += ` L ${fx(xs)},${fx(stepY)}`;
    d += ` L ${fx(xs)},${fx(stepY - td)} L ${fx(xe)},${fx(stepY - td)} L ${fx(xe)},${fx(stepY)}`;
    x = xe;
  }
  if (x < extW) d += ` L ${fx(extW)},${fx(stepY)}`;
  // Step UP from (extW, stepY) to (extW, 0), closing
  d += ` L ${fx(extW)},0`;
  d += ` Z`;
  return d;
}

/* Build a T-shaped wall perimeter path WITH edge tongues.
   Used when two wings extend the same main face (one on each side). The
   outline is a T: main rectangle at top spanning full width of merged panel,
   with left and right wings hanging from its bottom corners.

   Coordinate frame: the merged panel's (0,0) is at the TOP-LEFT of the LEFT
   WING. Main rectangle occupies x ∈ [leftCW, leftCW+mainW], y ∈ [0, mainH].

   opts:
     matT                — tongue depth
     mainTopTongues      — main top tongues, positions in main-local x [0, mainW]
     mainBotTongues      — main bottom tongues, positions in main-local x
     leftExtTopTongues   — left wing top tongues, in wing-local x
     leftExtTopShift     — offset (default 0) from left-merged-x=0 to start of
                           left wing's wall content (allows bridging matT corner)
     leftExtBotTongues   — left wing bottom tongues, in wing-local x
     leftExtBotShift     — offset from left-merged-x=0 to start of left wing
                           wall content along the bottom
     leftExtLeftTongues  — left wing outer (left) vertical tongues, in wing-
                           local y [0, leftCH]
     rightExtTopTongues  — right wing top tongues, in wing-local x
     rightExtTopShift    — offset from start of right wing in merged frame to
                           start of wall content (typically matT)
     rightExtBotTongues  — right wing bottom tongues, in wing-local x
     rightExtBotShift    — same idea for bottom
     rightExtRightTongues — right wing outer (right) vertical tongues, in wing-
                           local y [0, rightCH]
     bay                 — optional { xStart, xEnd, height } in MERGED-frame x

   leftCW, leftCH       — left wing extension width and height
   rightCW, rightCH     — right wing extension width and height
*/
function buildTShapePathWithFeatures(mainW, mainH, leftCW, leftCH, rightCW, rightCH, opts) {
  const matT  = opts.matT;
  const td    = matT;
  const fx    = v => v.toFixed(3);
  const stepYL = mainH - leftCH;
  const stepYR = mainH - rightCH;
  const xMain  = leftCW;
  const xRight = leftCW + mainW;
  const totalW = leftCW + mainW + rightCW;

  const mainTop  = (opts.mainTopTongues       || []).slice().sort((a, b) => a.start - b.start);
  const mainBot  = (opts.mainBotTongues       || []).slice().sort((a, b) => a.start - b.start);
  const leftTop  = (opts.leftExtTopTongues    || []).slice().sort((a, b) => a.start - b.start);
  const leftBot  = (opts.leftExtBotTongues    || []).slice().sort((a, b) => a.start - b.start);
  const leftLeft = (opts.leftExtLeftTongues   || []).slice().sort((a, b) => a.start - b.start);
  const rightTop = (opts.rightExtTopTongues   || []).slice().sort((a, b) => a.start - b.start);
  const rightBot = (opts.rightExtBotTongues   || []).slice().sort((a, b) => a.start - b.start);
  const rightRT  = (opts.rightExtRightTongues || []).slice().sort((a, b) => a.start - b.start);
  const leftTopShift  = opts.leftExtTopShift  || 0;
  const leftBotShift  = opts.leftExtBotShift  || 0;
  const rightTopShift = opts.rightExtTopShift || 0;
  const rightBotShift = opts.rightExtBotShift || 0;

  // Combine bottom tongues into a single list in merged-frame x.
  // Left wing bottom: x = leftBotShift + t.
  // Main bottom: x = xMain + t.
  // Right wing bottom: x = xRight + rightBotShift + t.
  const allBot = [
    ...leftBot .map(t => ({ start: leftBotShift + t.start,            end: leftBotShift + t.end })),
    ...mainBot .map(t => ({ start: xMain        + t.start,            end: xMain        + t.end })),
    ...rightBot.map(t => ({ start: xRight + rightBotShift + t.start,  end: xRight + rightBotShift + t.end })),
  ].sort((a, b) => a.start - b.start);

  // Walk clockwise from (xMain, 0) = top-left of main rectangle.
  let d = `M ${fx(xMain)},0`;

  // 1) Main top edge — walk right, tongues UP at y=-td.
  let x = xMain;
  for (const t of mainTop) {
    const xs = xMain + t.start, xe = xMain + t.end;
    if (xs > x) d += ` L ${fx(xs)},0`;
    d += ` L ${fx(xs)},${fx(-td)} L ${fx(xe)},${fx(-td)} L ${fx(xe)},0`;
    x = xe;
  }
  if (x < xRight) d += ` L ${fx(xRight)},0`;

  // 2) Main's right edge down to top of right wing (no tongues — interior step).
  d += ` L ${fx(xRight)},${fx(stepYR)}`;

  // 3) Right wing top edge — walk right, tongues UP at y=stepYR-td.
  x = xRight;
  for (const t of rightTop) {
    const xs = xRight + rightTopShift + t.start, xe = xRight + rightTopShift + t.end;
    if (xs > x) d += ` L ${fx(xs)},${fx(stepYR)}`;
    d += ` L ${fx(xs)},${fx(stepYR - td)} L ${fx(xe)},${fx(stepYR - td)} L ${fx(xe)},${fx(stepYR)}`;
    x = xe;
  }
  if (x < totalW) d += ` L ${fx(totalW)},${fx(stepYR)}`;

  // 4) Right wing's right edge — walk down, tongues RIGHT at x=totalW+td.
  let y = stepYR;
  for (const t of rightRT) {
    const ys = stepYR + t.start, ye = stepYR + t.end;
    if (ys > y) d += ` L ${fx(totalW)},${fx(ys)}`;
    d += ` L ${fx(totalW + td)},${fx(ys)} L ${fx(totalW + td)},${fx(ye)} L ${fx(totalW)},${fx(ye)}`;
    y = ye;
  }
  if (y < mainH) d += ` L ${fx(totalW)},${fx(mainH)}`;

  // 5) Bottom edge — walk LEFT from (totalW, mainH) to (0, mainH), tongues DOWN
  //    at y=mainH+td. Optional bay carved upward in the main portion.
  const bay = opts.bay || null;
  let xpos = totalW;
  const sortedBot = [...allBot].sort((a, b) => b.start - a.start);
  for (const t of sortedBot) {
    if (bay && t.start < bay.xEnd) continue;
    if (xpos > t.end) d += ` L ${fx(t.end)},${fx(mainH)}`;
    d += ` L ${fx(t.end)},${fx(mainH + td)} L ${fx(t.start)},${fx(mainH + td)} L ${fx(t.start)},${fx(mainH)}`;
    xpos = t.start;
  }
  if (bay) {
    if (xpos > bay.xEnd) d += ` L ${fx(bay.xEnd)},${fx(mainH)}`;
    d += ` L ${fx(bay.xEnd)},${fx(mainH - bay.height)} L ${fx(bay.xStart)},${fx(mainH - bay.height)} L ${fx(bay.xStart)},${fx(mainH)}`;
    xpos = bay.xStart;
    for (const t of sortedBot) {
      if (t.start >= bay.xEnd) continue;
      if (t.end > bay.xStart) continue;
      if (xpos > t.end) d += ` L ${fx(t.end)},${fx(mainH)}`;
      d += ` L ${fx(t.end)},${fx(mainH + td)} L ${fx(t.start)},${fx(mainH + td)} L ${fx(t.start)},${fx(mainH)}`;
      xpos = t.start;
    }
  }
  if (xpos > 0) d += ` L 0,${fx(mainH)}`;

  // 6) Left wing's left edge — walk UP from (0, mainH) to (0, stepYL),
  //    tongues LEFT at x=-td. Tongue positions are in wing-local y [0, leftCH]
  //    so merged y = stepYL + t.
  let ypos = mainH;
  for (const t of [...leftLeft].sort((a, b) => b.start - a.start)) {
    const ys = stepYL + t.start, ye = stepYL + t.end;
    if (ypos > ye) d += ` L 0,${fx(ye)}`;
    d += ` L ${fx(-td)},${fx(ye)} L ${fx(-td)},${fx(ys)} L 0,${fx(ys)}`;
    ypos = ys;
  }
  if (ypos > stepYL) d += ` L 0,${fx(stepYL)}`;

  // 7) Left wing top edge — walk RIGHT from (0, stepYL) to (xMain, stepYL),
  //    tongues UP at y=stepYL-td.
  x = 0;
  for (const t of leftTop) {
    const xs = leftTopShift + t.start, xe = leftTopShift + t.end;
    if (xs > x) d += ` L ${fx(xs)},${fx(stepYL)}`;
    d += ` L ${fx(xs)},${fx(stepYL - td)} L ${fx(xe)},${fx(stepYL - td)} L ${fx(xe)},${fx(stepYL)}`;
    x = xe;
  }
  if (x < xMain) d += ` L ${fx(xMain)},${fx(stepYL)}`;

  // 8) Main's left edge — walk UP from (xMain, stepYL) back to (xMain, 0).
  //    No tongues here either (interior step).
  d += ` L ${fx(xMain)},0 Z`;
  return d;
}

/* Build a simple L-shaped perimeter path (no edge tongues — connections added as
   interior rect slots separately).  extRight=true → extension at bottom-right;
   extRight=false → extension at bottom-left.
   stepY = mainH − extH (where the inner step starts from the top). */
function buildLShapePath(mainW, mainH, extW, extH, extRight) {
  const stepY = mainH - extH;
  const totalW = mainW + extW;
  if (extRight) {
    return `M 0,0 L ${mainW},0 L ${mainW},${stepY} L ${totalW},${stepY} L ${totalW},${mainH} L 0,${mainH} Z`;
  } else {
    // Extension at left: path goes around the right side of the main block first
    return `M ${extW},0 L ${totalW},0 L ${totalW},${mainH} L 0,${mainH} L 0,${stepY} L ${extW},${stepY} Z`;
  }
}

/* ---- Gable-wall helpers ---- */

/** Returns true when this wall face is the triangular GABLE END for a gabled roof. */
function isGableEndWall(cfg, which) {
  if (cfg.roofStyle !== 'gabled' && cfg.roofStyle !== 'parapet_gable') return false;
  const ridge = effectiveRidgeDir(cfg);
  // EW ridge: slopes face N/S → eave walls are front/back; GABLE ENDS are east/west
  // NS ridge: slopes face E/W → eave walls are east/west; GABLE ENDS are front/back
  if (which === 'east'  || which === 'west') return ridge === 'ew';
  if (which === 'front' || which === 'back') return ridge === 'ns';
  return false;
}

/* Effective ridge direction for gable-style roofs.
 *
 * For the plain `gabled` style, the user picks via cfg.roofRidgeDirection
 * — either 'ew' or 'ns'.
 *
 * For `parapet_gable`, the user's parapet-sides choice constrains the
 * ridge so the parapets always sit on the peak-end walls (otherwise the
 * parapets wouldn't be hiding anything and the style would lose its
 * purpose):
 *   • parapetSides = 'fb' → ridge must be 'ns' (peaks on front/back)
 *   • parapetSides = 'ew' → ridge must be 'ew' (peaks on east/west)
 *   • parapetSides = 'all' → ridge is user-picked (defaults to 'ew')
 *
 * Returns 'ew' or 'ns'. */
function effectiveRidgeDir(cfg) {
  if (cfg.roofStyle === 'parapet_gable') {
    const sides = cfg.parapetSides || 'all';
    if (sides === 'fb') return 'ns';
    if (sides === 'ew') return 'ew';
    // 'all' — fall through to user pick
  }
  return cfg.roofRidgeDirection || 'ew';
}

/* True if the given wall should be extended upward as a parapet under
 * the `parapet_gable` roof style. For other roof styles always false —
 * the existing wall generators handle their tops in the usual way. */
function wallHasParapet(cfg, which) {
  if (cfg.roofStyle !== 'parapet_gable') return false;
  const sides = cfg.parapetSides || 'all';
  if (sides === 'all') return true;
  if (sides === 'fb') return (which === 'front' || which === 'back');
  if (sides === 'ew') return (which === 'east'  || which === 'west');
  return false;
}

/**
 * Pentagon perimeter for a gable-end wall.
 *   Shape: rectangular body (wallW × wallH) + isoceles triangle above it.
 *   Apex at (wallW/2, −pitch).  Left/right/bottom edges carry the same
 *   tongue/opening features as the corresponding rectangular wall.
 *   The two diagonal gable-slope edges carry tabs when slopeTabSpec is provided.
 *
 * slopeTabSpec: { tw, margin, kerf } — if supplied, rectangular tabs are
 *   generated along both slant edges, matching the slots cut in the slope panels.
 */
function buildGableWallPath(wallW, wallH, pitch, spec, slopeTabSpec = null) {
  const { matT, kerf } = spec;
  const k  = kerf || 0;
  const td = matT;
  const tk = -k;
  const sk =  k;

  const halfW    = wallW / 2;
  const slantLen = Math.hypot(halfW, pitch);

  let d = 'M 0,0';

  // ---- GABLE SLOPES ----
  if (slopeTabSpec) {
    const { tw: tabW, margin: tabMargin } = slopeTabSpec;
    const tabDepth = matT;   // tab protrudes by one material thickness
    const tabK     = -(slopeTabSpec.kerf || 0);
    const tabCount = Math.max(2, Math.min(3, Math.floor(slantLen / 25)));
    const tabs     = placeTongues(slantLen, tabW, tabMargin, [], tabCount, tabW / 2);

    // Left slant edge: travels from (0,0) → apex (halfW, −pitch).
    // Tangent:  (halfW, −pitch) / slantLen  [in SVG y-down coords]
    // Outward normal (CW rotate tangent):  (tanY, −tanX)
    const lTx = halfW / slantLen,  lTy = -pitch / slantLen;
    const lNx = lTy,               lNy = -lTx;   // outward for left edge (upper-left)

    for (const tab of tabs) {
      const s = tab.start + tabK, e = tab.end - tabK;
      d += ` L ${(s*lTx).toFixed(3)},${(s*lTy).toFixed(3)}`;                        // walk to tab start
      d += ` L ${(s*lTx+tabDepth*lNx).toFixed(3)},${(s*lTy+tabDepth*lNy).toFixed(3)}`; // step out
      d += ` L ${(e*lTx+tabDepth*lNx).toFixed(3)},${(e*lTy+tabDepth*lNy).toFixed(3)}`; // across tab
      d += ` L ${(e*lTx).toFixed(3)},${(e*lTy).toFixed(3)}`;                        // step back
    }
    d += ` L ${halfW.toFixed(3)},${(-pitch).toFixed(3)}`;  // apex

    // Right slant edge: travels from apex (halfW, −pitch) → (wallW, 0).
    // Tangent: (halfW, pitch) / slantLen
    // Outward normal (CW rotate): (pitch, −halfW) / slantLen  (upper-right)
    const rTx = halfW / slantLen,  rTy = pitch / slantLen;
    const rNx = rTy,               rNy = -rTx;

    for (const tab of tabs) {   // same tab positions, from apex outward
      const s = tab.start + tabK, e = tab.end - tabK;
      const ax = halfW + s*rTx, ay = -pitch + s*rTy;
      const bx = halfW + e*rTx, by = -pitch + e*rTy;
      d += ` L ${ax.toFixed(3)},${ay.toFixed(3)}`;
      d += ` L ${(ax+tabDepth*rNx).toFixed(3)},${(ay+tabDepth*rNy).toFixed(3)}`;
      d += ` L ${(bx+tabDepth*rNx).toFixed(3)},${(by+tabDepth*rNy).toFixed(3)}`;
      d += ` L ${bx.toFixed(3)},${by.toFixed(3)}`;
    }
    d += ` L ${wallW},0`;  // right eave
  } else {
    // Plain diagonals — no tabs
    d += ` L ${halfW.toFixed(3)},${(-pitch).toFixed(3)} L ${wallW},0`;
  }

  // ---- RIGHT EDGE (top→bottom) ----
  const rightFeats = [
    ...(spec.edges.right.tongues  || []).map(t => ({ ...t, kind: 'tongue'  })),
    ...(spec.edges.right.openings || []).map(o => ({ ...o, kind: 'opening' })),
  ].sort((a, b) => a.start - b.start);
  let y = 0;
  for (const f of rightFeats) {
    const fS = f.start + (f.kind === 'tongue' ? tk : -sk);
    const fE = f.end   - (f.kind === 'tongue' ? tk : -sk);
    if (fS > y) d += ` L ${wallW},${fS}`;
    d += f.kind === 'tongue'
      ? ` L ${wallW + td},${fS} L ${wallW + td},${fE} L ${wallW},${fE}`
      : ` L ${wallW - td},${fS} L ${wallW - td},${fE} L ${wallW},${fE}`;
    y = fE;
  }
  if (y < wallH) d += ` L ${wallW},${wallH}`;

  // ---- BOTTOM EDGE (right→left) ----
  const botFeats = [
    ...(spec.edges.bottom.tongues  || []).map(t => ({ ...t, kind: 'tongue'  })),
    ...(spec.edges.bottom.openings || []).map(o => ({ ...o, kind: 'opening' })),
  ].sort((a, b) => b.start - a.start);
  let xp = wallW;
  for (const f of botFeats) {
    const fS = f.start + (f.kind === 'tongue' ? tk : -sk);
    const fE = f.end   - (f.kind === 'tongue' ? tk : -sk);
    if (xp > fE) d += ` L ${fE},${wallH}`;
    d += f.kind === 'tongue'
      ? ` L ${fE},${wallH + td} L ${fS},${wallH + td} L ${fS},${wallH}`
      : ` L ${fE},${wallH - td} L ${fS},${wallH - td} L ${fS},${wallH}`;
    xp = fS;
  }
  if (xp > 0) d += ` L 0,${wallH}`;

  // ---- LEFT EDGE (bottom→top) ----
  const leftFeats = [
    ...(spec.edges.left.tongues  || []).map(t => ({ ...t, kind: 'tongue'  })),
    ...(spec.edges.left.openings || []).map(o => ({ ...o, kind: 'opening' })),
  ].sort((a, b) => b.start - a.start);
  let yp = wallH;
  for (const f of leftFeats) {
    const fS = f.start + (f.kind === 'tongue' ? tk : -sk);
    const fE = f.end   - (f.kind === 'tongue' ? tk : -sk);
    if (yp > fE) d += ` L 0,${fE}`;
    d += f.kind === 'tongue'
      ? ` L ${-td},${fE} L ${-td},${fS} L 0,${fS}`
      : ` L ${td},${fE} L ${td},${fS} L 0,${fS}`;
    yp = fS;
  }
  if (yp > 0) d += ' L 0,0';
  d += ' Z';
  return d;
}


/**
 * Trapezoidal perimeter for a wall whose top edge is slanted.
 *   pitchLeft  = extra height at x=0   (top-left  at y = −pitchLeft)
 *   pitchRight = extra height at x=wallW (top-right at y = −pitchRight)
 * Tongue/opening features are only placed within the rectangular base [0, wallH].
 * The slanted top edge has no tongue features (roof just rests on it).
 */
function buildSlantedWallPath(wallW, wallH, pitchLeft, pitchRight, spec) {
  const { matT, kerf } = spec;
  const k  = kerf || 0;
  const td = matT;
  const tk = -k;
  const sk =  k;

  let d = `M 0,${(-pitchLeft).toFixed(3)}`;

  // ---- TOP EDGE ----
  // Two cases, both can carry tongues:
  //
  //   • Horizontal top (pitchLeft === pitchRight): top runs flat at
  //     y=−pitch. Tongues stick straight UP just like buildWallPath's
  //     top edge does — used by the HIGH-side FB wall on NS-axis slanted
  //     roofs ("rectangular with a flat top raised by pitch", built via
  //     buildSlantedWallPath with equal pitches).
  //
  //   • Slanted top (pitchLeft !== pitchRight): top runs diagonally from
  //     (0, −pitchLeft) to (wallW, −pitchRight). Tongues stick
  //     perpendicular to the slanted edge — they end up as small
  //     parallelograms protruding outward (UP-and-toward-the-LOWER-end).
  //     This is what the trapezoidal SIDE walls of an NS-axis slanted
  //     roof need so they can key into the roof panel's verge-row slots,
  //     analogous to the FB walls' eave-row tongues.
  //
  // Tongue x positions are taken from `spec.edges.top.tongues` as
  // [start, end] x-ranges along the wall's x-axis (NOT arclength). When
  // the top is slanted, each tongue's outer corners are offset from its
  // base corners by matT in the direction of the outward unit normal
  // N = ((pitchLeft − pitchRight), −wallW) / slantLenLocal. For a
  // back-high case (pitchL=0, pitchR=pitch), N points UP-LEFT — exactly
  // away from the wall body that sits below the slanted top edge.
  const horizontalTop = (pitchLeft === pitchRight);
  const hasTopTongues = spec.edges.top && (spec.edges.top.tongues || []).length > 0;
  if (horizontalTop && hasTopTongues) {
    const topTongues = [...spec.edges.top.tongues].sort((a, b) => a.start - b.start);
    const topY = -pitchLeft;
    let x = 0;
    for (const t of topTongues) {
      const tS = t.start + tk;
      const tE = t.end   - tk;
      if (tS > x) d += ` L ${tS.toFixed(3)},${topY.toFixed(3)}`;
      d += ` L ${tS.toFixed(3)},${(topY - td).toFixed(3)}`
         + ` L ${tE.toFixed(3)},${(topY - td).toFixed(3)}`
         + ` L ${tE.toFixed(3)},${topY.toFixed(3)}`;
      x = tE;
    }
    if (x < wallW) d += ` L ${wallW},${topY.toFixed(3)}`;
  } else if (!horizontalTop && hasTopTongues) {
    const topTongues = [...spec.edges.top.tongues].sort((a, b) => a.start - b.start);
    const slantLenLocal = Math.hypot(wallW, pitchLeft - pitchRight);
    const nx = (pitchLeft - pitchRight) / slantLenLocal;
    const ny = -wallW / slantLenLocal;
    const yAtX = (x) => -pitchLeft + x * (pitchLeft - pitchRight) / wallW;
    let x = 0;
    for (const t of topTongues) {
      const tS = t.start + tk;
      const tE = t.end   - tk;
      if (tS > x) d += ` L ${tS.toFixed(3)},${yAtX(tS).toFixed(3)}`;
      const yS = yAtX(tS);
      const yE = yAtX(tE);
      d += ` L ${(tS + td * nx).toFixed(3)},${(yS + td * ny).toFixed(3)}`
         + ` L ${(tE + td * nx).toFixed(3)},${(yE + td * ny).toFixed(3)}`
         + ` L ${tE.toFixed(3)},${yE.toFixed(3)}`;
      x = tE;
    }
    if (x < wallW) d += ` L ${wallW},${(-pitchRight).toFixed(3)}`;
  } else {
    // ---- FEATURELESS TOP EDGE (slanted or horizontal, no tongues) ----
    d += ` L ${wallW},${(-pitchRight).toFixed(3)}`;
  }

  // ---- RIGHT EDGE (top-right → bottom-right), tongues/openings in [0, wallH] ----
  const rightFeats = [
    ...(spec.edges.right.tongues  || []).map(t => ({ ...t, kind: 'tongue'  })),
    ...(spec.edges.right.openings || []).map(o => ({ ...o, kind: 'opening' })),
  ].sort((a, b) => a.start - b.start);
  let y = -pitchRight;
  for (const f of rightFeats) {
    const fS = f.start + (f.kind === 'tongue' ? tk : -sk);
    const fE = f.end   - (f.kind === 'tongue' ? tk : -sk);
    if (fS > y) d += ` L ${wallW},${fS.toFixed(3)}`;
    d += f.kind === 'tongue'
      ? ` L ${(wallW+td).toFixed(3)},${fS.toFixed(3)} L ${(wallW+td).toFixed(3)},${fE.toFixed(3)} L ${wallW},${fE.toFixed(3)}`
      : ` L ${(wallW-td).toFixed(3)},${fS.toFixed(3)} L ${(wallW-td).toFixed(3)},${fE.toFixed(3)} L ${wallW},${fE.toFixed(3)}`;
    y = fE;
  }
  if (y < wallH) d += ` L ${wallW},${wallH}`;

  // ---- BOTTOM EDGE (right → left) ----
  const botFeats = [
    ...(spec.edges.bottom.tongues  || []).map(t => ({ ...t, kind: 'tongue'  })),
    ...(spec.edges.bottom.openings || []).map(o => ({ ...o, kind: 'opening' })),
  ].sort((a, b) => b.start - a.start);
  let xp = wallW;
  for (const f of botFeats) {
    const fS = f.start + (f.kind === 'tongue' ? tk : -sk);
    const fE = f.end   - (f.kind === 'tongue' ? tk : -sk);
    if (xp > fE) d += ` L ${fE.toFixed(3)},${wallH}`;
    d += f.kind === 'tongue'
      ? ` L ${fE.toFixed(3)},${(wallH+td).toFixed(3)} L ${fS.toFixed(3)},${(wallH+td).toFixed(3)} L ${fS.toFixed(3)},${wallH}`
      : ` L ${fE.toFixed(3)},${(wallH-td).toFixed(3)} L ${fS.toFixed(3)},${(wallH-td).toFixed(3)} L ${fS.toFixed(3)},${wallH}`;
    xp = fS;
  }
  if (xp > 0) d += ` L 0,${wallH}`;

  // ---- LEFT EDGE (bottom-left → top-left), tongues/openings in [0, wallH] ----
  const leftFeats = [
    ...(spec.edges.left.tongues  || []).map(t => ({ ...t, kind: 'tongue'  })),
    ...(spec.edges.left.openings || []).map(o => ({ ...o, kind: 'opening' })),
  ].sort((a, b) => b.start - a.start);
  let yp = wallH;
  for (const f of leftFeats) {
    const fS = f.start + (f.kind === 'tongue' ? tk : -sk);
    const fE = f.end   - (f.kind === 'tongue' ? tk : -sk);
    if (yp > fE) d += ` L 0,${fE.toFixed(3)}`;
    d += f.kind === 'tongue'
      ? ` L ${(-td).toFixed(3)},${fE.toFixed(3)} L ${(-td).toFixed(3)},${fS.toFixed(3)} L 0,${fS.toFixed(3)}`
      : ` L ${td.toFixed(3)},${fE.toFixed(3)} L ${td.toFixed(3)},${fS.toFixed(3)} L 0,${fS.toFixed(3)}`;
    yp = fS;
  }
  if (yp > -pitchLeft) d += ` L 0,${(-pitchLeft).toFixed(3)}`;
  d += ' Z';
  return d;
}

/* Build a perimeter-only panel path with OUTWARD tongues and NO interior slot
   cutouts. Used for floor/ceiling panels where the panel carries the tongues. */
function buildPanelPerimeterPath(spec) {
  const { width: W, height: H, matT, kerf } = spec;
  const k = kerf || 0;
  const td = matT;
  const tk = -k;

  let d = `M 0,0`;

  // TOP EDGE
  const topTongues = [...(spec.edges.top.tongues || [])].sort((a, b) => a.start - b.start);
  let x = 0;
  for (const t of topTongues) {
    const s = t.start + tk;
    const e = t.end - tk;
    if (s > x) d += ` L ${s},0`;
    d += ` L ${s},${-td} L ${e},${-td} L ${e},0`;
    x = e;
  }
  if (x < W) d += ` L ${W},0`;

  // RIGHT EDGE
  const rightTongues = [...(spec.edges.right.tongues || [])].sort((a, b) => a.start - b.start);
  let y = 0;
  for (const t of rightTongues) {
    const s = t.start + tk;
    const e = t.end - tk;
    if (s > y) d += ` L ${W},${s}`;
    d += ` L ${W + td},${s} L ${W + td},${e} L ${W},${e}`;
    y = e;
  }
  if (y < H) d += ` L ${W},${H}`;

  // BOTTOM EDGE
  const bottomTongues = [...(spec.edges.bottom.tongues || [])].sort((a, b) => b.start - a.start);
  let bx = W;
  for (const t of bottomTongues) {
    const s = t.start + tk;
    const e = t.end - tk;
    if (bx > e) d += ` L ${e},${H}`;
    d += ` L ${e},${H + td} L ${s},${H + td} L ${s},${H}`;
    bx = s;
  }
  if (bx > 0) d += ` L 0,${H}`;

  // LEFT EDGE
  const leftTongues = [...(spec.edges.left.tongues || [])].sort((a, b) => b.start - a.start);
  let ly = H;
  for (const t of leftTongues) {
    const s = t.start + tk;
    const e = t.end - tk;
    if (ly > e) d += ` L 0,${e}`;
    d += ` L ${-td},${e} L ${-td},${s} L 0,${s}`;
    ly = s;
  }

  if (ly > 0) d += ` L 0,0`;
  d += ` Z`;

  return d;
}

/* Make a rectangle path string */
function rectPath(x, y, w, h) {
  return `M ${x},${y} L ${x + w},${y} L ${x + w},${y + h} L ${x},${y + h} Z`;
}

/* Clip a vertical line at fixed x, going from y0 to y1, against a list of 
   rectangular openings. Returns array of [yStart, yEnd] segments outside any 
   opening. A small margin is applied around openings so the etch doesn't run 
   right up against the cut edge. */
function clipVerticalLineByCuts(x, y0, y1, cuts, margin) {
  margin = (margin == null) ? 0.5 : margin;
  // Build list of "blocked" y intervals where the line passes through a cut
  let blocked = [];
  for (const c of cuts) {
    // Line crosses this cut's x range?
    if (x > c.x - margin && x < c.x + c.w + margin) {
      blocked.push([c.y - margin, c.y + c.h + margin]);
    }
  }
  // Merge overlapping intervals
  blocked.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const b of blocked) {
    if (merged.length && b[0] <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], b[1]);
    } else {
      merged.push([...b]);
    }
  }
  // Compute complement of blocked intervals within [y0, y1]
  const segments = [];
  let cur = y0;
  for (const [bStart, bEnd] of merged) {
    if (bEnd <= cur) continue;
    if (bStart > y1) break;
    if (bStart > cur) segments.push([cur, Math.min(bStart, y1)]);
    cur = Math.max(cur, bEnd);
  }
  if (cur < y1) segments.push([cur, y1]);
  // Filter out very short segments (< 0.5mm) — they'd be invisible/messy
  return segments.filter(([a, b]) => b - a >= 0.5);
}

function clipHorizontalLineByCuts(y, x0, x1, cuts, margin) {
  margin = (margin == null) ? 0.5 : margin;
  let blocked = [];
  for (const c of cuts) {
    if (y > c.y - margin && y < c.y + c.h + margin) {
      blocked.push([c.x - margin, c.x + c.w + margin]);
    }
  }
  blocked.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const b of blocked) {
    if (merged.length && b[0] <= merged[merged.length - 1][1]) {
      merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], b[1]);
    } else {
      merged.push([...b]);
    }
  }
  const segments = [];
  let cur = x0;
  for (const [bStart, bEnd] of merged) {
    if (bEnd <= cur) continue;
    if (bStart > x1) break;
    if (bStart > cur) segments.push([cur, Math.min(bStart, x1)]);
    cur = Math.max(cur, bEnd);
  }
  if (cur < x1) segments.push([cur, x1]);
  return segments.filter(([a, b]) => b - a >= 0.5);
}

/* Cladding pattern dispatcher. Returns an array of {x1, y1, x2, y2} line 
   segments (in cladding-panel coords) representing the etched detail for the 
   chosen style. All segments are clipped against cutOpenings.
   
   panelLeft/Top/Right/Bottom: the inner region of the cladding panel where 
     etches should be drawn (typically inset by cT to avoid the panel edge). */
function generateCladdingPattern(style, panelLeft, panelTop, panelRight, panelBottom, cutOpenings, topEdge) {
  const out = [];
  const W = panelRight - panelLeft;
  const H = panelBottom - panelTop;
  const pat = style.pattern || 'lines';

  // Optional slanted-top clip: panel's top edge isn't flat at panelTop but
  // instead slants linearly from `topEdge.leftY` at panelLeft to
  // `topEdge.rightY` at panelRight. Used for trapezoidal side cladding
  // on slanted NS-axis roofs so the engrave lines stop at the cut line
  // instead of extending into the empty area above the slope. When
  // omitted, the top edge stays flat at panelTop and behaviour is unchanged.
  const hasSlant = topEdge && (topEdge.leftY !== topEdge.rightY);
  const slantSlope = hasSlant ? (topEdge.rightY - topEdge.leftY) / W : 0;
  const slantBaseY = topEdge ? topEdge.leftY : panelTop;
  function topYAt(x) {
    if (!topEdge) return panelTop;
    return slantBaseY + slantSlope * (x - panelLeft);
  }

  function pushClippedV(x, y0, y1) {
    // Clip the top of the line against the slanted top edge at this x.
    const yTopHere = topYAt(x);
    if (yTopHere >= y1) return;          // entirely above the slope → drop
    if (yTopHere > y0)  y0 = yTopHere;   // trim the portion above the slope
    const segs = clipVerticalLineByCuts(x, y0, y1, cutOpenings);
    for (const [a, b] of segs) out.push({ x1: x, y1: a, x2: x, y2: b });
  }
  function pushClippedH(y, x0, x1) {
    // For a horizontal line, find the x-range where y sits BELOW the slanted
    // top edge (y >= topYAt(x)). Outside that range, the line is above the
    // slope and should be dropped.
    if (topEdge) {
      if (slantSlope > 0) {
        // top edge rises L→R: y >= leftY + slope*(x-panelLeft) → x <= panelLeft + (y-leftY)/slope
        const xMax = panelLeft + (y - slantBaseY) / slantSlope;
        if (xMax <= x0) return;          // whole line above the slope
        if (xMax < x1) x1 = xMax;
      } else if (slantSlope < 0) {
        // top edge falls L→R: y >= leftY + slope*(x-panelLeft) → x >= panelLeft + (y-leftY)/slope
        const xMin = panelLeft + (y - slantBaseY) / slantSlope;
        if (xMin >= x1) return;          // whole line above the slope
        if (xMin > x0) x0 = xMin;
      } else {
        // flat top at slantBaseY (rare case where topEdge is set but flat)
        if (y < slantBaseY) return;
      }
    }
    const segs = clipHorizontalLineByCuts(y, x0, x1, cutOpenings);
    for (const [a, b] of segs) out.push({ x1: a, y1: y, x2: b, y2: y });
  }
  /* Push a clipped diagonal line (for namako). Naive: sample line at small 
     steps and drop samples that fall inside a cut. Build segments from 
     contiguous outside-the-cut runs. */
  function pushClippedDiag(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.5) return;
    const steps = Math.max(2, Math.ceil(len / 0.3));
    let segStart = null;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = x0 + dx * t, py = y0 + dy * t;
      let inside = false;
      for (const c of cutOpenings) {
        if (px > c.x - 0.5 && px < c.x + c.w + 0.5 &&
            py > c.y - 0.5 && py < c.y + c.h + 0.5) {
          inside = true; break;
        }
      }
      // Also drop samples that sit above the slanted top edge (if any) —
      // the inside-cut test handles only rectangular cuts; the slope is a
      // separate constraint that lives on the panel outline.
      if (!inside && topEdge) {
        if (py < topYAt(px)) inside = true;
      }
      if (!inside) {
        if (segStart === null) segStart = { x: px, y: py };
      } else {
        if (segStart) {
          // close current segment at previous step
          const tPrev = (i - 1) / steps;
          const ex = x0 + dx * tPrev, ey = y0 + dy * tPrev;
          if (Math.hypot(ex - segStart.x, ey - segStart.y) >= 0.5) {
            out.push({ x1: segStart.x, y1: segStart.y, x2: ex, y2: ey });
          }
          segStart = null;
        }
      }
    }
    if (segStart) {
      const ex = x0 + dx, ey = y0 + dy;
      if (Math.hypot(ex - segStart.x, ey - segStart.y) >= 0.5) {
        out.push({ x1: segStart.x, y1: segStart.y, x2: ex, y2: ey });
      }
    }
  }

  function pushMetalFastenerField(style) {
    if (!style || !style.metalFasteners) return;
    const tick = (style.fastenerTickSize != null) ? Number(style.fastenerTickSize) : 0.55;
    const rowSpacing = Math.max(3, Number(style.fastenerSpacingY) || 12);
    const colSpacing = Math.max(4, Number(style.fastenerSpacingX) || 13);
    const offsetRows = style.fastenerOffsetRows !== false;
    const leftInset = Math.max(2, colSpacing * 0.45);
    const topInset = Math.max(3, rowSpacing * 0.35);
    let rowIndex = 0;

    function insideCutOrAboveTop(cx, cy) {
      if (cx <= panelLeft + 0.05 || cx >= panelRight - 0.05) return true;
      if (cy <= panelTop + 0.05 || cy >= panelBottom - 0.05) return true;
      if (topEdge && cy < topYAt(cx)) return true;
      for (const c of cutOpenings || []) {
        if (cx > c.x - 0.4 && cx < c.x + c.w + 0.4 &&
            cy > c.y - 0.4 && cy < c.y + c.h + 0.4) return true;
      }
      return false;
    }

    for (let y = panelTop + topInset; y < panelBottom - 0.4; y += rowSpacing) {
      const rowShift = (offsetRows && (rowIndex % 2 === 1)) ? colSpacing / 2 : 0;
      for (let x = panelLeft + leftInset + rowShift; x < panelRight - 0.4; x += colSpacing) {
        if (insideCutOrAboveTop(x, y)) continue;
        // Diagonal dash that reads as a screw/bolt head at small scale and
        // does not disappear into the vertical rib etch lines.
        pushClippedDiag(x - tick * 0.45, y - tick * 0.45, x + tick * 0.45, y + tick * 0.45);
      }
      rowIndex++;
    }
  }

  if (pat === 'lines') {
    const ss = style.seamSpacing || {};
    // Track primary seam positions so subdivides and bolt dots can use
    // them as anchors. Subdivides emit secondary lines BETWEEN each pair
    // of primary verticals/horizontals; bolt dots sit at the
    // intersections of primary lines.
    const xs = [];   // primary vertical seam x-positions (cladding-frame)
    const ys = [];   // primary horizontal seam y-positions
    if (ss.vertical) {
      const n = Math.floor(W / ss.vertical);
      for (let i = 1; i < n; i++) {
        const x = panelLeft + i * (W / n);
        xs.push(x);
        pushClippedV(x, panelTop, panelBottom);
      }
      // Optional decorative subdivision — emit (verticalSubdivide - 1)
      // secondary verticals between each pair of primaries, including
      // before the first and after the last so the leftmost and
      // rightmost panel edges get the same subdivision pattern as
      // every other panel. The seamSpacing math used to find the
      // primary spacing also tells us the panel width: `step = W/n`.
      const vSub = style.verticalSubdivide || 0;
      if (vSub > 1 && xs.length >= 1) {
        const step = W / n;
        // Anchor positions include the panel-left edge, the
        // primary seams, and the panel-right edge so every "panel"
        // (the W/n strip between anchors) gets its subdivision.
        const anchors = [panelLeft, ...xs, panelRight];
        for (let i = 0; i < anchors.length - 1; i++) {
          const a = anchors[i], b = anchors[i + 1];
          for (let k = 1; k < vSub; k++) {
            const x = a + (b - a) * (k / vSub);
            pushClippedV(x, panelTop, panelBottom);
          }
        }
      }
    }
    if (ss.horizontal) {
      const n = Math.floor(H / ss.horizontal);
      for (let i = 1; i < n; i++) {
        const y = panelTop + i * (H / n);
        ys.push(y);
        pushClippedH(y, panelLeft, panelRight);
      }
      const hSub = style.horizontalSubdivide || 0;
      if (hSub > 1 && ys.length >= 1) {
        const anchors = [panelTop, ...ys, panelBottom];
        for (let i = 0; i < anchors.length - 1; i++) {
          const a = anchors[i], b = anchors[i + 1];
          for (let k = 1; k < hSub; k++) {
            const y = a + (b - a) * (k / hSub);
            pushClippedH(y, panelLeft, panelRight);
          }
        }
      }
    }
    // Optional exposed fastener ticks. Earlier builds drew a tiny + exactly
    // on the ALC seam intersection. That was technically present, but the
    // cross arms sat on top of the seam etches and were nearly impossible to
    // distinguish from normal ALC panel lines. Draw short diagonal tick marks
    // inset inside each panel corner instead, so the fastener style reads
    // visibly different while staying laser-friendly at 1:150.
    if (style.boltDots && (ss.vertical || ss.horizontal)) {
      const tick = (style.boltSize != null) ? style.boltSize : 0.55;
      const inset = Math.max(0.28, tick * 0.75);
      const xAnchors = [panelLeft, ...xs, panelRight];
      const yAnchors = [panelTop, ...ys, panelBottom];

      function pushFastenerTick(cx, cy, sx, sy) {
        if (cx <= panelLeft + 0.05 || cx >= panelRight - 0.05) return;
        if (cy <= panelTop + 0.05 || cy >= panelBottom - 0.05) return;
        if (topEdge && cy < topYAt(cx)) return;
        for (const c of cutOpenings || []) {
          if (cx > c.x - 0.2 && cx < c.x + c.w + 0.2 &&
              cy > c.y - 0.2 && cy < c.y + c.h + 0.2) return;
        }
        const x0 = cx - sx * tick * 0.45;
        const y0 = cy - sy * tick * 0.45;
        const x1 = cx + sx * tick * 0.45;
        const y1 = cy + sy * tick * 0.45;
        pushClippedDiag(x0, y0, x1, y1);
      }

      for (let xi = 0; xi < xAnchors.length - 1; xi++) {
        const xa = xAnchors[xi], xb = xAnchors[xi + 1];
        if ((xb - xa) < inset * 2.2) continue;
        for (let yi = 0; yi < yAnchors.length - 1; yi++) {
          const ya = yAnchors[yi], yb = yAnchors[yi + 1];
          if ((yb - ya) < inset * 2.2) continue;
          // Four corner ticks per visible panel, inset just enough that they
          // do not merge into the primary seam grid.
          pushFastenerTick(xa + inset, ya + inset, +1, +1);
          pushFastenerTick(xb - inset, ya + inset, -1, +1);
          pushFastenerTick(xa + inset, yb - inset, +1, -1);
          pushFastenerTick(xb - inset, yb - inset, -1, -1);
        }
      }
    }
    pushMetalFastenerField(style);
  }

  else if (pat === 'board_batten') {
    // Vertical board-and-batten siding (押縁張り). Boards sit flat
    // between the battens; the battens are raised strips covering each
    // joint between adjacent boards. We etch only the battens — each
    // batten reads as TWO parallel vertical lines (its left and right
    // edges), giving the cladding its distinctive doubled-rhythm look.
    // The cycle = boardWidth + battenWidth, repeating across the panel.
    //
    // Centre the pattern in the panel so a full board sits on each
    // edge — the run starts and ends on a board rather than half a
    // batten, which matches how real siding is laid out on a wall.
    const bw = style.boardWidth   || 2.0;
    const tw = style.battenWidth  || 0.6;
    const cycle = bw + tw;
    if (cycle > 0.1) {
      const nCycles = Math.floor((W - bw) / cycle);
      if (nCycles >= 1) {
        // Total run = nCycles*cycle + bw (one trailing board), leftover
        // margin split evenly so the pattern centres on the panel.
        const runW = nCycles * cycle + bw;
        const leftPad = panelLeft + (W - runW) / 2;
        for (let k = 0; k < nCycles; k++) {
          // Batten left edge sits after the k-th board, batten right
          // edge sits just before the (k+1)-th board.
          const xLeft  = leftPad + bw + k * cycle;
          const xRight = xLeft + tw;
          pushClippedV(xLeft,  panelTop, panelBottom);
          pushClippedV(xRight, panelTop, panelBottom);
        }
      }
    }
  }

  else if (pat === 'offset_courses') {
    // Brick / stone with staggered courses. Horizontal mortar lines run full 
    // width, vertical joints alternate position by offsetFraction each course.
    const cw = style.courseW || 1.4;     // course width (each unit)
    const ch = style.courseH || 0.4;     // course height
    const off = (style.offsetFraction != null) ? style.offsetFraction : 0.5;
    const nRows = Math.floor(H / ch);
    // Horizontal mortar lines
    for (let i = 1; i < nRows; i++) {
      const y = panelTop + i * (H / nRows);
      pushClippedH(y, panelLeft, panelRight);
    }
    // Vertical joints, alternating offset per course
    for (let r = 0; r < nRows; r++) {
      const yTop = panelTop + r * (H / nRows);
      const yBot = panelTop + (r + 1) * (H / nRows);
      const xOffsetThisRow = (r % 2) * off * cw;
      for (let x = panelLeft + xOffsetThisRow; x < panelRight - 0.1; x += cw) {
        if (x <= panelLeft + 0.1) continue;
        // Clip the vertical joint segment to avoid cuts
        const segs = clipVerticalLineByCuts(x, yTop, yBot, cutOpenings);
        for (const [a, b] of segs) out.push({ x1: x, y1: a, x2: x, y2: b });
      }
    }
  }

  else if (pat === 'random_rubble') {
    // Pseudo-random irregular polygons. Use a deterministic LCG so the same 
    // panel size produces the same pattern each generation.
    const avg = style.avgSize || 2.5;
    let seed = 12345 + Math.round(W * 31 + H * 17);
    function rnd() { seed = (seed * 1664525 + 1013904223) | 0; return ((seed >>> 0) / 0xFFFFFFFF); }
    // Build a random network of points and connect into Voronoi-ish segments.
    // Simpler approximation: scatter centers in a jittered grid, then connect 
    // each center to its right and down neighbors via wavy lines.
    const cellW = avg, cellH = avg;
    const cols = Math.max(2, Math.floor(W / cellW));
    const rows = Math.max(2, Math.floor(H / cellH));
    const pts = [];
    for (let r = 0; r <= rows; r++) {
      pts.push([]);
      for (let c = 0; c <= cols; c++) {
        const baseX = panelLeft + c * (W / cols);
        const baseY = panelTop + r * (H / rows);
        const jx = (rnd() - 0.5) * cellW * 0.6;
        const jy = (rnd() - 0.5) * cellH * 0.6;
        pts[r].push([baseX + jx, baseY + jy]);
      }
    }
    // Connect horizontal neighbors (within each row)
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const a = pts[r][c], b = pts[r][c + 1];
        // Skip if either end is outside the panel (avoid drawing past edge)
        if (a[0] < panelLeft - 0.5 || b[0] > panelRight + 0.5) continue;
        if (a[1] < panelTop || b[1] > panelBottom) continue;
        pushClippedDiag(a[0], a[1], b[0], b[1]);
      }
    }
    // Connect vertical neighbors
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c <= cols; c++) {
        const a = pts[r][c], b = pts[r + 1][c];
        if (a[0] < panelLeft || b[0] > panelRight) continue;
        if (a[1] < panelTop - 0.5 || b[1] > panelBottom + 0.5) continue;
        pushClippedDiag(a[0], a[1], b[0], b[1]);
      }
    }
  }

  else if (pat === 'diagonal_grid') {
    // Namako-kabe diagonal tile pattern: rotated 45° grid of square tiles.
    const ts = style.tileSize || 1.5;
    const diag = ts * Math.SQRT2;  // diagonal-to-diagonal spacing of the rotated grid
    // Two families of parallel diagonals: at +45° and -45°.
    // Spacing along their normal = diag. Cover all of [panelLeft, panelRight] × [panelTop, panelBottom].
    const minDim = Math.min(W, H);
    const maxDim = Math.max(W, H);
    // For + slope (y = -x + c, so c = x + y): c ranges from panelLeft+panelTop to panelRight+panelBottom
    const cMin1 = panelLeft + panelTop;
    const cMax1 = panelRight + panelBottom;
    for (let c = cMin1; c <= cMax1 + 0.001; c += diag) {
      // Line: x + y = c
      // Find intersections with panel rectangle
      const xs = [];
      // Top edge y=panelTop: x = c - panelTop
      let xt = c - panelTop;
      if (xt >= panelLeft && xt <= panelRight) xs.push([xt, panelTop]);
      // Bottom edge y=panelBottom: x = c - panelBottom
      let xb = c - panelBottom;
      if (xb >= panelLeft && xb <= panelRight) xs.push([xb, panelBottom]);
      // Left edge x=panelLeft: y = c - panelLeft
      let yl = c - panelLeft;
      if (yl >= panelTop && yl <= panelBottom) xs.push([panelLeft, yl]);
      // Right edge x=panelRight: y = c - panelRight
      let yr = c - panelRight;
      if (yr >= panelTop && yr <= panelBottom) xs.push([panelRight, yr]);
      if (xs.length >= 2) {
        // Take the first and last to span the line through the panel
        xs.sort((a, b) => a[0] - b[0]);
        const a = xs[0], b = xs[xs.length - 1];
        pushClippedDiag(a[0], a[1], b[0], b[1]);
      }
    }
    // For - slope (y = x + c, so c = y - x): c ranges from panelTop-panelRight to panelBottom-panelLeft
    const cMin2 = panelTop - panelRight;
    const cMax2 = panelBottom - panelLeft;
    for (let c = cMin2; c <= cMax2 + 0.001; c += diag) {
      const xs = [];
      let xt = panelTop - c;
      if (xt >= panelLeft && xt <= panelRight) xs.push([xt, panelTop]);
      let xb = panelBottom - c;
      if (xb >= panelLeft && xb <= panelRight) xs.push([xb, panelBottom]);
      let yl = panelLeft + c;
      if (yl >= panelTop && yl <= panelBottom) xs.push([panelLeft, yl]);
      let yr = panelRight + c;
      if (yr >= panelTop && yr <= panelBottom) xs.push([panelRight, yr]);
      if (xs.length >= 2) {
        xs.sort((a, b) => a[0] - b[0]);
        const a = xs[0], b = xs[xs.length - 1];
        pushClippedDiag(a[0], a[1], b[0], b[1]);
      }
    }
  }

  else if (pat === 'tile_overlap') {
    // Kawara-like overlapping tile pattern. Approximates the wave look with 
    // horizontal courses and small vertical "cap" marks staggered by half-tile 
    // each course (the visible curved overlap).
    const tw = style.tileW || 1.8;
    const th = style.tileH || 2.0;
    const nRows = Math.floor(H / th);
    // Horizontal lines at the BOTTOM of each row (where one course of tiles overlaps the next)
    for (let i = 1; i <= nRows; i++) {
      const y = panelTop + i * (H / nRows);
      if (y >= panelBottom) break;
      pushClippedH(y, panelLeft, panelRight);
    }
    // Short vertical "cap" marks on each course, staggered. Each tile 
    // produces a small downward tick mark from the course line above.
    for (let r = 0; r < nRows; r++) {
      const courseTop = panelTop + r * (H / nRows);
      const offset = (r % 2) * tw / 2;
      for (let x = panelLeft + offset; x < panelRight; x += tw) {
        if (x <= panelLeft + 0.1) continue;
        // small tick from courseTop down by ~30% of the row height
        const tickEnd = courseTop + (H / nRows) * 0.3;
        const segs = clipVerticalLineByCuts(x, courseTop, tickEnd, cutOpenings);
        for (const [a, b] of segs) out.push({ x1: x, y1: a, x2: x, y2: b });
      }
    }
  }

  else if (pat === 'corrugated_overlap') {
    // Overlapping corrugated metal roofing sheets — the classic "tin roof"
    // look. Each row of sheets sits staggered laterally from the row above
    // (brick-pattern offset by `offsetFraction * sheetW`), and dense
    // vertical lines etch the corrugation ridges within each row. Two line
    // families render:
    //
    //   1. Full-width horizontal lines at every sheet-row boundary — the
    //      visible lap where one course of sheets rests on top of the
    //      course below.
    //   2. Per-row vertical corrugations, each row's grid shifted by
    //      `(sheetW * offsetFraction) mod corrSpacing` from its neighbour.
    //      That shift is what makes the brick stagger READ at the row
    //      boundary: corrugations don't line up across the lap, the same
    //      way they don't in the photo reference.
    //
    // We deliberately don't draw explicit per-sheet LATERAL boundary
    // marks. At typical model scale (~1:150) corrugations are already at
    // the laser-etch resolution limit, and adding an extra vertical line
    // at each sheet-edge would visually compete with the corrugations
    // rather than reinforce the "sheets" reading — the horizontal lap
    // banding plus the row-to-row corrugation stagger does that job
    // cleanly on its own.
    const sheetW = style.sheetW || 5;
    const sheetH = style.sheetH || 12;
    const corrSpacing = style.corrugationSpacing || 0.7;
    const offsetFraction = (style.offsetFraction != null) ? style.offsetFraction : 0.5;

    const nRows = Math.max(1, Math.floor(H / sheetH));
    const rowH = H / nRows;

    // 1. Horizontal sheet-row boundaries
    for (let i = 1; i < nRows; i++) {
      pushClippedH(panelTop + i * rowH, panelLeft, panelRight);
    }

    // 2. Per-row corrugations, with brick-stagger shift between adjacent rows
    const shiftPerRow = (sheetW * offsetFraction) % corrSpacing;
    for (let r = 0; r < nRows; r++) {
      const yTop = panelTop + r * rowH;
      const yBot = panelTop + (r + 1) * rowH;
      const shift = (r % 2) * shiftPerRow;
      for (let x = panelLeft + shift + corrSpacing; x < panelRight - 0.05; x += corrSpacing) {
        if (x <= panelLeft + 0.05) continue;
        const segs = clipVerticalLineByCuts(x, yTop, yBot, cutOpenings);
        for (const [a, b] of segs) out.push({ x1: x, y1: a, x2: x, y2: b });
      }
    }
  }

  return out;
}

/* Make a rectangular slot path (used for interior cutouts) */
function slotPath(x, y, w, h, kerf) {
  const k = kerf || 0;
  // Slots get bigger by k on each side (when kerf is negative, slots get smaller by |k|... wait)
  // Convention: kerf is negative (laser removes material) → tongues are SMALLER than nominal,
  // slots are LARGER than nominal so the (smaller) tongues fit in.
  // To make slots bigger, we ADD |k| on each side.
  const expand = k;  // for k=-0.005, expand=-0.005, slot grows by 0.01 total. Hmm wrong sign.
  // Let me use -k for expansion: if k = -0.005 (kerf removes 0.005 from each cut), 
  // then to compensate, slot SHOULD be 0.005 BIGGER on each side.
  const exp = -k;
  return `M ${x - exp},${y - exp} L ${x + w + exp},${y - exp} L ${x + w + exp},${y + h + exp} L ${x - exp},${y + h + exp} Z`;
}
