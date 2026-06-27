/* ===========================================================================
 * TRUSS SYSTEM
 * Generates flat laser-cut truss panels matching the block's roof style. Each
 * truss is one core-material part: an outer perimeter (silhouette of the
 * truss profile) plus a series of cut-outs that remove the empty triangular
 * regions between the load-carrying members, leaving the chord-and-web
 * skeleton as material.
 *
 * Three styles, picked automatically from the roof:
 *   • Fink (W-pattern)              — gabled / parapet_gable
 *   • Mono-pitch Pratt              — slanted
 *   • Pratt parallel-chord          — flat / parapet
 *
 * All generators take (span, height, chordW) and return { outline, voids }.
 *   outline = array of {x, y} vertices, counter-clockwise winding, defining
 *             the outer perimeter (cut path 0).
 *   voids   = array of polygons (each an array of {x, y}), counter-clockwise,
 *             each describing one interior region to be removed. Voids are
 *             already inset from the theoretical member centrelines so the
 *             remaining material has thickness chordW.
 *
 * Coordinate convention: x runs along the span (0 = left, span = right);
 * y runs vertically with the BASE (bottom chord) at y = height. Apex / top
 * chord is at y = 0 (for gabled / mono-pitch) or y = 0..something (parallel
 * chord). This matches the wall-builder convention (y = 0 at top) so the
 * shapes plug into partToSvg directly without a flip.
 * =========================================================================== */

/** Perpendicular inset of a triangle by d (mm), preserving shape.
 * Moves each edge inward by d along its inward normal, returns the new
 * triangle's three vertices via intersection of the offset lines.
 * Assumes counter-clockwise winding (inward = LEFT perpendicular of edge dir).
 * If the triangle is too small to inset by d (insetted vertices flip past
 * each other), returns null and the caller should skip emitting that void. */
export function insetTrianglePerpendicular(p1, p2, p3, d) {
  // Detect winding so we always offset INWARD.
  const cross = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
  const ccw   = cross > 0;
  const verts = [p1, p2, p3];

  function offsetLine(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) return null;
    // Inward normal: CCW polygons → rotate edge 90° CCW = (-dy, dx)/len.
    // CW polygons → opposite. Multiply by d to get the offset.
    const nx = (ccw ? -dy :  dy) / len;
    const ny = (ccw ?  dx : -dx) / len;
    return { ax: a.x + d * nx, ay: a.y + d * ny,
             bx: b.x + d * nx, by: b.y + d * ny };
  }

  function lineIntersect(L1, L2) {
    // Solve (ax + t*(bx-ax), ay + t*(by-ay)) = (cx + s*(dx-cx), cy + s*(dy-cy))
    const dx1 = L1.bx - L1.ax, dy1 = L1.by - L1.ay;
    const dx2 = L2.bx - L2.ax, dy2 = L2.by - L2.ay;
    const denom = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(denom) < 1e-9) return null; // parallel (degenerate)
    const t = ((L2.ax - L1.ax) * dy2 - (L2.ay - L1.ay) * dx2) / denom;
    return { x: L1.ax + t * dx1, y: L1.ay + t * dy1 };
  }

  const L12 = offsetLine(p1, p2);
  const L23 = offsetLine(p2, p3);
  const L31 = offsetLine(p3, p1);
  if (!L12 || !L23 || !L31) return null;

  const v1 = lineIntersect(L31, L12); // vertex at p1
  const v2 = lineIntersect(L12, L23); // vertex at p2
  const v3 = lineIntersect(L23, L31); // vertex at p3
  if (!v1 || !v2 || !v3) return null;

  // Validity: a successful inset preserves the original winding AND keeps
  // each edge's direction roughly aligned with the original. When d
  // exceeds the inradius the offset lines intersect on the wrong side of
  // the original — the resulting "triangle" still has the same winding
  // sign because all three vertices flip together, so the cross-product
  // check alone misses it. The edge-reversal check catches it: a flipped
  // triangle has each inset edge running opposite to the original.
  const newCross = (v2.x - v1.x) * (v3.y - v1.y) - (v2.y - v1.y) * (v3.x - v1.x);
  if (Math.sign(newCross) !== Math.sign(cross) || Math.abs(newCross) < 1) return null;
  // Edge-direction sanity: each inset edge dot-product with the
  // corresponding original edge must be > 0.
  const insetEdges = [
    { ax: v1.x, ay: v1.y, bx: v2.x, by: v2.y },  // corresponds to original p1→p2
    { ax: v2.x, ay: v2.y, bx: v3.x, by: v3.y },
    { ax: v3.x, ay: v3.y, bx: v1.x, by: v1.y },
  ];
  const origEdges = [
    { ax: p1.x, ay: p1.y, bx: p2.x, by: p2.y },
    { ax: p2.x, ay: p2.y, bx: p3.x, by: p3.y },
    { ax: p3.x, ay: p3.y, bx: p1.x, by: p1.y },
  ];
  for (let i = 0; i < 3; i++) {
    const idx = insetEdges[i].bx - insetEdges[i].ax;
    const idy = insetEdges[i].by - insetEdges[i].ay;
    const odx = origEdges[i].bx - origEdges[i].ax;
    const ody = origEdges[i].by - origEdges[i].ay;
    if (idx * odx + idy * ody <= 0) return null;
  }
  return [v1, v2, v3];
}

/** Generic quad inset — same logic but for 4-sided polygons. */
export function insetQuadPerpendicular(p1, p2, p3, p4, d) {
  const verts = [p1, p2, p3, p4];
  const cross = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
  const ccw   = cross > 0;
  function offsetLine(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-9) return null;
    const nx = (ccw ? -dy :  dy) / len;
    const ny = (ccw ?  dx : -dx) / len;
    return { ax: a.x + d * nx, ay: a.y + d * ny,
             bx: b.x + d * nx, by: b.y + d * ny };
  }
  function lineIntersect(L1, L2) {
    const dx1 = L1.bx - L1.ax, dy1 = L1.by - L1.ay;
    const dx2 = L2.bx - L2.ax, dy2 = L2.by - L2.ay;
    const denom = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(denom) < 1e-9) return null;
    const t = ((L2.ax - L1.ax) * dy2 - (L2.ay - L1.ay) * dx2) / denom;
    return { x: L1.ax + t * dx1, y: L1.ay + t * dy1 };
  }
  const lines = [];
  for (let i = 0; i < 4; i++) {
    const L = offsetLine(verts[i], verts[(i + 1) % 4]);
    if (!L) return null;
    lines.push(L);
  }
  const out = [];
  for (let i = 0; i < 4; i++) {
    const v = lineIntersect(lines[(i + 3) % 4], lines[i]);
    if (!v) return null;
    out.push(v);
  }
  return out;
}

/** Convert an array of {x,y} into an SVG path string. */
export function polygonToPath(poly) {
  if (!poly || poly.length < 3) return '';
  let d = `M ${poly[0].x.toFixed(3)},${poly[0].y.toFixed(3)}`;
  for (let i = 1; i < poly.length; i++) {
    d += ` L ${poly[i].x.toFixed(3)},${poly[i].y.toFixed(3)}`;
  }
  return d + ' Z';
}

/**
 * Fink truss (W-pattern) — for gabled and parapet_gable roofs.
 *
 *           apex (span/2, 0)
 *               *
 *              /|\
 *             / | \
 *            /  |  \
 *      r45° / d | d \ r45°     ← d = diagonals from rafter midpoints
 *          /  \ | /  \             down to bottom-centre.
 *         / v  \|/  v \         ← v = quarter verticals (left/right).
 *        /_____*|*_____\
 *      (0,h)  (L/4,h)  (L/2,h)  (3L/4,h)  (L,h)
 *
 * Members (centre-lines):
 *   top chords (rafters) (0,h)→(L/2,0) and (L/2,0)→(L,h)
 *   bottom chord         (0,h)→(L,h)
 *   king post            (L/2,0)→(L/2,h)
 *   left vertical        (L/4,h)→(L/4,h/2)         [meets left rafter at its midpoint]
 *   right vertical       (3L/4,h)→(3L/4,h/2)
 *   left diagonal        (L/4,h/2)→(L/2,h)         [from rafter midpoint to bottom-centre]
 *   right diagonal       (3L/4,h/2)→(L/2,h)
 *
 * These divide the interior into six triangles; each is inset by chordW/2
 * to leave a chordW-thick member at every shared edge.
 */
export function generateFinkTruss(span, height, chordW) {
  const L = span, h = height;
  // Outline triangle: apex (L/2, 0) at top, base from (0,h) to (L,h).
  // CCW when y grows downward and the shape is a triangle pointing UP in
  // SVG: walking apex → bottom-right → bottom-left gives CCW with our
  // y-down convention. Pick whichever winding the inset helper detects.
  const outline = [
    { x: 0,   y: h },
    { x: L,   y: h },
    { x: L/2, y: 0 },
  ];
  // Key interior points
  const apex   = { x: L/2,    y: 0   };
  const botC   = { x: L/2,    y: h   };
  const botQL  = { x: L/4,    y: h   };
  const botQR  = { x: 3*L/4,  y: h   };
  const ratL   = { x: L/4,    y: h/2 };  // left rafter midpoint
  const ratR   = { x: 3*L/4,  y: h/2 };  // right rafter midpoint
  const botL   = { x: 0,      y: h   };
  const botR   = { x: L,      y: h   };

  // Six sub-triangles. Order each CCW (in SVG y-down) so insets work.
  const subs = [
    // Left "ear" — between left rafter, left vertical, bottom-left quarter
    [botL, botQL, ratL],
    // Left middle — between left vertical, left diagonal, bottom-quarter→centre
    [ratL, botQL, botC],
    // Left apex — between left rafter (upper half), king post, left diagonal
    [ratL, botC, apex],
    // Right apex (mirror)
    [apex, botC, ratR],
    // Right middle (mirror)
    [botC, botQR, ratR],
    // Right "ear" (mirror)
    [botQR, botR, ratR],
  ];

  const d = chordW / 2;
  const voids = [];
  for (const tri of subs) {
    const inset = insetTrianglePerpendicular(tri[0], tri[1], tri[2], d);
    if (inset) voids.push(inset);
  }
  return { outline, voids, style: 'fink' };
}

/**
 * Mono-pitch Pratt truss — for slanted roofs. Sloped top chord, horizontal
 * bottom chord, vertical posts and diagonals in tension (gravity load).
 * The top chord rises from yHigh (at the high end) to yLow (at the low end)
 * — both measured from the base y = height (bottom chord level), so yHigh
 * is the bigger rise and yLow is typically 0 if the low end meets the eave.
 * The truss is divided into `bays` vertical panels; each interior panel
 * boundary gets a vertical post, and each panel gets one diagonal sloping
 * down toward the HIGH end (Pratt convention: diagonals in tension under
 * gravity, so they hang down from the bottom of each interior post toward
 * the higher-loaded side). For mono-pitch the high end carries the bigger
 * cumulative shear, so diagonals point that way.
 */
export function generateMonoPitchTruss(span, riseAtX0, riseAtXL, height, chordW) {
  const L = span;
  // Top chord runs from (0, height - riseAtX0) to (L, height - riseAtXL).
  // (Our y grows downward; smaller y = higher up.)
  const yT0 = height - riseAtX0;
  const yTL = height - riseAtXL;

  // Outline (CCW with y-down): walk base left→right, then up the right side,
  // along the slope back to top-left, down to start.
  const outline = [
    { x: 0, y: height },
    { x: L, y: height },
    { x: L, y: yTL },
    { x: 0, y: yT0 },
  ];

  // Bay count: aim for roughly 1.5–2.5 m per bay at real scale, so for
  // span S (mm at N-scale 1:150) the equivalent real span is S * 150 mm;
  // pick bays so each bay is 10–25 mm on the model (real 1.5–3.75 m).
  const bays = Math.max(2, Math.min(8, Math.round(L / 15)));
  const dx = L / bays;
  // High end: the side with the larger rise (smaller y). Diagonals point
  // FROM bottom of post on the low side TO top of post on the high side
  // (forming a tension member under gravity).
  const highOnRight = (riseAtXL > riseAtX0);

  const voids = [];
  const d = chordW / 2;
  for (let i = 0; i < bays; i++) {
    const xL = i * dx, xR = (i + 1) * dx;
    const yTopL = yT0 + (yTL - yT0) * (xL / L);
    const yTopR = yT0 + (yTL - yT0) * (xR / L);

    // Each bay is split by a diagonal into two triangles. Pratt diagonals
    // run from top of one side down to bottom of the other side opposite
    // the loaded (high) end. For high-on-right, the diagonal in each bay
    // goes from top-LEFT corner to bottom-RIGHT corner (slopes down-right
    // toward the high end's BOTTOM).
    // For symmetry consider direction: actually for mono-pitch Pratt, all
    // diagonals point toward the higher end. We always pick: diagonal from
    // top of the LOWER-end-side post to bottom of the HIGHER-end-side post,
    // measured per bay.
    let triA, triB;
    if (highOnRight) {
      // diagonal from (xL, yTopL) to (xR, height)
      triA = [
        { x: xL, y: yTopL },
        { x: xR, y: yTopR },
        { x: xR, y: height },
      ];
      triB = [
        { x: xL, y: yTopL },
        { x: xR, y: height },
        { x: xL, y: height },
      ];
    } else {
      // diagonal from (xR, yTopR) to (xL, height)
      triA = [
        { x: xL, y: yTopL },
        { x: xR, y: yTopR },
        { x: xL, y: height },
      ];
      triB = [
        { x: xR, y: yTopR },
        { x: xR, y: height },
        { x: xL, y: height },
      ];
    }
    const iA = insetTrianglePerpendicular(triA[0], triA[1], triA[2], d);
    const iB = insetTrianglePerpendicular(triB[0], triB[1], triB[2], d);
    if (iA) voids.push(iA);
    if (iB) voids.push(iB);
  }
  return { outline, voids, style: 'monopitch_pratt' };
}

/**
 * Pratt parallel-chord truss — for flat / parapet roofs.
 * Two horizontal chords spaced `height` apart, vertical posts at panel
 * boundaries, diagonals sloping down toward the CENTRE in each half
 * (Pratt convention: diagonals carry tension under gravity for parallel
 * chords too; the half-symmetry concentrates load toward mid-span).
 */
export function generateParallelChordTruss(span, height, chordW) {
  const L = span, h = height;
  // Outer rectangle (CCW with y-down).
  const outline = [
    { x: 0, y: h },
    { x: L, y: h },
    { x: L, y: 0 },
    { x: 0, y: 0 },
  ];
  // Bay count similar to mono-pitch, but keep it EVEN so the centre
  // symmetry has a clean mid-post. Round to nearest even number ≥ 4.
  let bays = Math.max(4, Math.round(L / 15));
  if (bays % 2) bays += 1;
  const dx  = L / bays;
  const mid = bays / 2;

  const voids = [];
  const d = chordW / 2;
  for (let i = 0; i < bays; i++) {
    const xL = i * dx, xR = (i + 1) * dx;
    // Diagonal direction: left half → from top-LEFT down to bottom-RIGHT
    // (slopes ↘). Right half → mirrored: top-RIGHT down to bottom-LEFT
    // (slopes ↙). Both slope toward the centre's bottom.
    let triA, triB;
    if (i < mid) {
      triA = [{ x: xL, y: 0 }, { x: xR, y: 0 }, { x: xR, y: h }];
      triB = [{ x: xL, y: 0 }, { x: xR, y: h }, { x: xL, y: h }];
    } else {
      triA = [{ x: xL, y: 0 }, { x: xR, y: 0 }, { x: xL, y: h }];
      triB = [{ x: xR, y: 0 }, { x: xR, y: h }, { x: xL, y: h }];
    }
    const iA = insetTrianglePerpendicular(triA[0], triA[1], triA[2], d);
    const iB = insetTrianglePerpendicular(triB[0], triB[1], triB[2], d);
    if (iA) voids.push(iA);
    if (iB) voids.push(iB);
  }
  return { outline, voids, style: 'parallel_pratt' };
}

/**
 * Wrapper: pick the right truss style for a roof and return the geometry.
 * @param roofStyle  cfg.roofStyle ('gabled', 'parapet_gable', 'slanted',
 *                   'flat', 'parapet')
 * @param span       horizontal length of the truss in mm (the spanned
 *                   dimension)
 * @param spanDims   { roofPitch, isHighSideLeft }  — extra context for
 *                   the slanted case. roofPitch is the rise from eave to
 *                   ridge for gabled, or rise from low eave to high eave
 *                   for slanted.
 * @param chordW     member visual width (mm)
 */
export function generateTrussGeometry(roofStyle, span, spanDims, chordW) {
  const pitch = spanDims.roofPitch || 10;
  switch (roofStyle) {
    case 'gabled':
    case 'parapet_gable':
      return generateFinkTruss(span, pitch, chordW);
    case 'slanted':
      // Mono-pitch: one end is high, other is low. The truss height is
      // the wall height that supports it (not the pitch); for our laser
      // panel we just need the sloped top chord, so the truss panel's
      // bottom-chord-to-top-chord depth at the high end = pitch + a small
      // depth d. Use pitch * 0.6 as the truss depth at the low end so the
      // panel has some thickness even at the eave. (Real mono-pitch
      // trusses taper to a point but a tapered point isn't a useful
      // laser piece — there's no place to glue.)
      // For mvp, just use pitch as the high-end rise and pitch * 0.5 as
      // the low-end depth.
      return generateMonoPitchTruss(span, pitch * 0.5, pitch, pitch * 0.5 + chordW, chordW);
    case 'flat':
    case 'parapet':
    default:
      // Parallel-chord truss. Depth = span / 10 (standard rule of thumb
      // for steel parallel-chord trusses), clamped to 10–25 mm so it's
      // neither paper-thin nor over-tall.
      return generateParallelChordTruss(span, Math.max(10, Math.min(25, span / 10)), chordW);
  }
}

/**
 * Convert a {outline, voids} geometry into a part object suitable for
 * pushing into the parts array. Outline + voids both become 'cut' paths.
 * The bbox dimensions are derived from the outline's extents.
 */
export function trussGeometryToPart(geom, partId, partName, materialKey) {
  const { outline, voids } = geom;
  if (!outline || outline.length < 3) return null;
  const xs = outline.map(p => p.x), ys = outline.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const paths = [{ type: 'cut', d: polygonToPath(outline) }];
  for (const v of voids) {
    paths.push({ type: 'cut', d: polygonToPath(v) });
  }
  return {
    id: partId,
    name: partName,
    material: materialKey,
    bboxW: maxX - minX,
    bboxH: maxY - minY,
    bboxOffsetX: -minX,
    bboxOffsetY: -minY,
    paths,
    rects: [],
    lines: [],
  };
}

/**
 * Generate all truss parts for one block (main or wing).
 *   blockCfg : the block's effective config (cfg for main, wing-cfg for wings)
 *   blockPlan: the block's edge plan
 *   sfx      : id suffix to disambiguate wing parts ('' for main, '_wingN')
 *   nameLbl  : friendly name prefix ('' for main, 'Wing N ' for wings)
 * Returns an array of parts ready to push.
 */
/**
 * Shared positioning rule for trusses (and their vertical supports).
 * Returns an array of x-coordinates (or y-coordinates, depending on
 * axis) along the building's length where each truss centreline sits.
 *
 * Both trusses and column supports must agree on these positions —
 * otherwise the floor etchings (placed at column positions) won't line
 * up with where the user actually drops the trusses. Keeping this in a
 * shared helper means the truss generator and the support generator
 * always compute the same set.
 *
 * Convention: positions are evenly distributed along `lengthAlong`,
 * with a `marginEachEnd` inset from each end. Count is derived from
 * the target spacing — `floor(usable/spacing) + 1` for the
 * "spacing-or-tighter" interpretation, clamped to ≥ 2 so even very
 * short blocks get end-truss + end-truss.
 */
export function trussSupportPositions(lengthAlong, spacing, marginEachEnd) {
  const spacingSafe = Math.max(5, spacing);
  const margin = Math.max(0, marginEachEnd || 0);
  const usable = Math.max(spacingSafe, lengthAlong - 2 * margin);
  const count = Math.max(2, Math.floor(usable / spacingSafe) + 1);
  const positions = [];
  if (count === 1) {
    positions.push(lengthAlong / 2);
  } else {
    for (let i = 0; i < count; i++) {
      positions.push(margin + i * usable / (count - 1));
    }
  }

  return positions;
}

/* Layout-cut helper for trusses and their column supports.
 *
 * Floor/roof panels can be clipped directly in their own 2D sheet geometry,
 * but trusses and columns are separate vertical assemblies. They need a
 * small amount of footprint reasoning: at each truss station, find the kept
 * span of that truss line after the layout cuts are applied. Trusses fully
 * outside the kept footprint are omitted; trusses crossing the cut are
 * regenerated with the shortened span so they no longer extend into the
 * ghosted/cut-away area. */
export function layoutCropContextIsActive(cropCtx) {
  return !!(cropCtx && cropCtx.rootCfg && layoutCutsActive(cropCtx.rootCfg));
}

export function layoutCropToWorld(cropCtx, p) {
  if (cropCtx && typeof cropCtx.toWorld === 'function') return cropCtx.toWorld(p);
  return { x: p.x, y: p.y };
}

export function clippedBlockFootprintForLayoutCrop(blockCfg, cropCtx) {
  if (!layoutCropContextIsActive(cropCtx)) return null;
  const rootCfg = cropCtx.rootCfg || CONFIG;
  refreshMeasuredLayoutCuts(rootCfg);
  const cuts = (rootCfg.layoutCuts || []).filter(c => c && c.enabled !== false);
  if (!cuts.length) return null;
  const rectLocal = [
    { x: 0, y: 0 },
    { x: blockCfg.width, y: 0 },
    { x: blockCfg.width, y: blockCfg.depth },
    { x: 0, y: blockCfg.depth },
  ];
  const rectWorld = rectLocal.map(p => layoutCropToWorld(cropCtx, p));
  return clipPolygonByLayoutCuts(rectWorld, cuts, rootCfg);
}

export function pointInPolygonWithNudge(pt, poly) {
  if (!poly || poly.length < 3) return false;
  if (pointInPolygon(pt, poly)) return true;
  // Boundary points can fail the normal ray-cast test. Try a very small
  // plus-shaped nudge so trusses/columns lying exactly on a wall edge are
  // still treated as inside when that wall remains after the crop.
  const eps = 0.05;
  return pointInPolygon({ x: pt.x + eps, y: pt.y }, poly)
      || pointInPolygon({ x: pt.x - eps, y: pt.y }, poly)
      || pointInPolygon({ x: pt.x, y: pt.y + eps }, poly)
      || pointInPolygon({ x: pt.x, y: pt.y - eps }, poly);
}

export function polygonSignedArea(poly) {
  if (!Array.isArray(poly) || poly.length < 3) return 0;
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i], q = poly[(i + 1) % poly.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

export function polygonAbsArea(poly) {
  return Math.abs(polygonSignedArea(poly));
}

export function cleanPolygonVertices(poly, eps) {
  eps = eps || 0.001;
  const out = [];
  for (const p of (poly || [])) {
    const q = out[out.length - 1];
    if (!q || Math.hypot(p.x - q.x, p.y - q.y) > eps) out.push({ x: p.x, y: p.y });
  }
  if (out.length > 2) {
    const a = out[0], z = out[out.length - 1];
    if (Math.hypot(a.x - z.x, a.y - z.y) <= eps) out.pop();
  }
  return out;
}

export function clipPolygonByXMin(poly, xMin) {
  if (!poly || poly.length < 3) return [];
  const out = [];
  const inside = p => p.x >= xMin - 1e-7;
  const intersect = (a, b) => {
    const dx = b.x - a.x;
    if (Math.abs(dx) < 1e-9) return { x: xMin, y: b.y };
    const t = (xMin - a.x) / dx;
    return { x: xMin, y: a.y + t * (b.y - a.y) };
  };
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i], prev = poly[(i + poly.length - 1) % poly.length];
    const curIn = inside(cur), prevIn = inside(prev);
    if (curIn) {
      if (!prevIn) out.push(intersect(prev, cur));
      out.push(cur);
    } else if (prevIn) {
      out.push(intersect(prev, cur));
    }
  }
  return cleanPolygonVertices(out);
}

export function clipPolygonByXMax(poly, xMax) {
  if (!poly || poly.length < 3) return [];
  const out = [];
  const inside = p => p.x <= xMax + 1e-7;
  const intersect = (a, b) => {
    const dx = b.x - a.x;
    if (Math.abs(dx) < 1e-9) return { x: xMax, y: b.y };
    const t = (xMax - a.x) / dx;
    return { x: xMax, y: a.y + t * (b.y - a.y) };
  };
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i], prev = poly[(i + poly.length - 1) % poly.length];
    const curIn = inside(cur), prevIn = inside(prev);
    if (curIn) {
      if (!prevIn) out.push(intersect(prev, cur));
      out.push(cur);
    } else if (prevIn) {
      out.push(intersect(prev, cur));
    }
  }
  return cleanPolygonVertices(out);
}

export function clipPolygonToXRange(poly, xMin, xMax) {
  if (!poly || poly.length < 3) return [];
  let out = clipPolygonByXMin(poly, xMin);
  if (out.length < 3) return [];
  out = clipPolygonByXMax(out, xMax);
  return out.length >= 3 ? cleanPolygonVertices(out) : [];
}

export function clipPolygonByYMin(poly, yMin) {
  if (!poly || poly.length < 3) return [];
  const out = [];
  const inside = p => p.y >= yMin - 1e-7;
  const intersect = (a, b) => {
    const dy = b.y - a.y;
    if (Math.abs(dy) < 1e-9) return { x: b.x, y: yMin };
    const t = (yMin - a.y) / dy;
    return { x: a.x + t * (b.x - a.x), y: yMin };
  };
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i], prev = poly[(i + poly.length - 1) % poly.length];
    const curIn = inside(cur), prevIn = inside(prev);
    if (curIn) {
      if (!prevIn) out.push(intersect(prev, cur));
      out.push(cur);
    } else if (prevIn) {
      out.push(intersect(prev, cur));
    }
  }
  return cleanPolygonVertices(out);
}

export function clipPolygonByYMax(poly, yMax) {
  if (!poly || poly.length < 3) return [];
  const out = [];
  const inside = p => p.y <= yMax + 1e-7;
  const intersect = (a, b) => {
    const dy = b.y - a.y;
    if (Math.abs(dy) < 1e-9) return { x: b.x, y: yMax };
    const t = (yMax - a.y) / dy;
    return { x: a.x + t * (b.x - a.x), y: yMax };
  };
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i], prev = poly[(i + poly.length - 1) % poly.length];
    const curIn = inside(cur), prevIn = inside(prev);
    if (curIn) {
      if (!prevIn) out.push(intersect(prev, cur));
      out.push(cur);
    } else if (prevIn) {
      out.push(intersect(prev, cur));
    }
  }
  return cleanPolygonVertices(out);
}

export function clipPolygonToRect(poly, xMin, yMin, xMax, yMax) {
  if (!poly || poly.length < 3) return [];
  let out = clipPolygonByXMin(poly, xMin);
  if (out.length < 3) return [];
  out = clipPolygonByXMax(out, xMax);
  if (out.length < 3) return [];
  out = clipPolygonByYMin(out, yMin);
  if (out.length < 3) return [];
  out = clipPolygonByYMax(out, yMax);
  return out.length >= 3 ? cleanPolygonVertices(out) : [];
}

/** Trim an already-generated full truss to the layout-cut interval.
 *
 * Earlier layout-cut handling regenerated the truss at the shortened span.
 * That made the internal web pattern re-space itself and it also injected
 * bearing tabs at the new artificial cut edge. For layout crops we want the
 * opposite: generate the complete truss exactly as if the building were whole,
 * including tabs only at the original support-column bearings, then slice the
 * finished geometry at the kept top-down interval. This preserves the original
 * internal structure and automatically removes tabs on any side where the
 * support column has been cropped away. */
export function trimGeneratedTrussGeometryToSpanInterval(geom, start, end) {
  if (!geom || !geom.outline || geom.outline.length < 3) return null;
  const xs = geom.outline.map(p => p.x);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const xMin = Math.max(minX, Number(start));
  const xMax = Math.min(maxX, Number(end));
  if (!isFinite(xMin) || !isFinite(xMax) || xMax - xMin < 1) return null;
  if (xMin <= minX + 1e-6 && xMax >= maxX - 1e-6) return geom;

  const outline = clipPolygonToXRange(geom.outline, xMin, xMax);
  if (!outline || outline.length < 3 || polygonAbsArea(outline) < 1) return null;

  const voids = [];
  for (const v of (geom.voids || [])) {
    const cv = clipPolygonToXRange(v, xMin, xMax);
    if (cv && cv.length >= 3 && polygonAbsArea(cv) > 0.25) voids.push(cv);
  }
  return { ...geom, outline, voids, layoutTrimInterval: { start: xMin, end: xMax } };
}

export function trussSpanIntervalForLayoutCrop(blockCfg, axis, span, position, cropCtx, interiorFrame) {
  const clippedWorld = clippedBlockFootprintForLayoutCrop(blockCfg, cropCtx);
  if (!clippedWorld) return { start: 0, end: span, clipped: false };
  if (clippedWorld.length < 3) return null;

  const frame = interiorFrame || trussInteriorFrame(blockCfg, null);
  // `span` and `position` are measured in the clear inside frame. Convert
  // them back to the block's outer local frame before testing layout cuts.
  const localAt = axis === 'ns'
    ? (s) => ({ x: frame.x0 + position, y: frame.y0 + s })
    : (s) => ({ x: frame.x0 + s, y: frame.y0 + position });
  const insideAt = (s) => pointInPolygonWithNudge(layoutCropToWorld(cropCtx, localAt(s)), clippedWorld);

  // Sample by small cells and keep the largest contiguous inside interval.
  // This is stable for straight, angled, and sampled arc layout cuts and avoids
  // needing a full line/polygon boolean library for the truss station line.
  const cells = Math.max(80, Math.min(600, Math.ceil(span * 3)));
  const ds = span / cells;
  const intervals = [];
  let inRun = false, runStart = 0;
  for (let i = 0; i < cells; i++) {
    const s0 = i * ds;
    const s1 = (i + 1) * ds;
    const mid = (s0 + s1) / 2;
    const inside = insideAt(mid);
    if (inside && !inRun) { inRun = true; runStart = s0; }
    if ((!inside || i === cells - 1) && inRun) {
      const runEnd = inside && i === cells - 1 ? s1 : s0;
      if (runEnd - runStart > 0.1) intervals.push({ start: runStart, end: runEnd });
      inRun = false;
    }
  }
  if (!intervals.length) return null;
  let best = intervals[0];
  for (const iv of intervals) if ((iv.end - iv.start) > (best.end - best.start)) best = iv;

  // Refine boundaries against neighbouring outside samples when possible.
  function refineBoundary(lo, hi, wantInsideAtHi) {
    let a = lo, b = hi;
    for (let k = 0; k < 14; k++) {
      const m = (a + b) / 2;
      const inside = insideAt(m);
      if (inside === wantInsideAtHi) b = m; else a = m;
    }
    return b;
  }
  if (best.start > 0) best.start = refineBoundary(Math.max(0, best.start - ds), best.start, true);
  if (best.end < span) best.end = refineBoundary(Math.min(span, best.end + ds), best.end, false);

  best.start = Math.max(0, Math.min(span, best.start));
  best.end   = Math.max(0, Math.min(span, best.end));
  if (best.end - best.start < Math.max(5, (blockCfg.trusses && blockCfg.trusses.chordW || 2) * 4)) return null;
  const clipped = best.start > 0.25 || best.end < span - 0.25;
  return { start: best.start, end: best.end, clipped };
}

export function columnBearingInsideLayoutCrop(blockCfg, axis, wall, pos, cropCtx, matT, interiorFrame) {
  const clippedWorld = clippedBlockFootprintForLayoutCrop(blockCfg, cropCtx);
  if (!clippedWorld) return true;
  if (clippedWorld.length < 3) return false;
  const frame = interiorFrame || trussInteriorFrame(blockCfg, { matT: matT || blockCfg.coreThickness || 1.5 });
  const eps = 0.1;
  let p;
  // `pos` is in the clear inside frame. Test just inside the corresponding
  // bearing wall, still in the block's outer footprint coordinates.
  if (wall === 'front') p = { x: frame.x0 + pos, y: frame.y0 + eps };
  else if (wall === 'back') p = { x: frame.x0 + pos, y: frame.y0 + frame.depth - eps };
  else if (wall === 'west') p = { x: frame.x0 + eps, y: frame.y0 + pos };
  else p = { x: frame.x0 + frame.width - eps, y: frame.y0 + pos };
  return pointInPolygonWithNudge(layoutCropToWorld(cropCtx, p), clippedWorld);
}

export function generateTrussesForBlock(blockCfg, blockPlan, sfx, nameLbl, cropCtx) {
  const t = blockCfg.trusses;
  if (!t || !t.enabled) return [];
  const chordW = (t.chordW != null) ? t.chordW : 2;
  if (chordW <= 0) return [];

  // Determine axis. Auto-pick rules:
  //   gabled / parapet_gable → perpendicular to ridge
  //   else → perpendicular to longer dimension
  const ridge = effectiveRidgeDir(blockCfg);
  const isGable = blockCfg.roofStyle === 'gabled' || blockCfg.roofStyle === 'parapet_gable';
  let axis = t.axis;
  if (!axis || (axis !== 'ns' && axis !== 'ew')) {
    if (isGable) {
      // Ridge ew → trusses span ns; ridge ns → trusses span ew. The truss
      // bridges between the eave walls (perpendicular to ridge).
      axis = ridge === 'ew' ? 'ns' : 'ew';
    } else {
      axis = blockCfg.width >= blockCfg.depth ? 'ns' : 'ew';
    }
  }

  // Span and station spacing use the clear INSIDE dimensions of the block,
  // not the exterior footprint. Otherwise the truss panels are too long by
  // 2× wall thickness and the first/last stations are offset into the walls.
  const frame = trussInteriorFrame(blockCfg, blockPlan);
  const fullSpan     = axis === 'ns' ? frame.depth : frame.width;
  const lengthAlong  = axis === 'ns' ? frame.width : frame.depth;
  const spacing      = Math.max(5, t.spacing || 30);

  // Use the shared positioning so the floor etchings emitted by the
  // column-support generator align exactly with where the truss
  // centrelines should land. The frame already excludes the wall material,
  // so when support columns are enabled the margin only needs half the
  // flange width to keep the footprint clear of the inside wall face.
  const flangeW = (t.supportFlangeW != null) ? t.supportFlangeW : 4;
  const matT_   = frame.matT;
  const margin  = t.supports ? flangeW / 2 : 0;
  const positions = trussSupportPositions(lengthAlong, spacing, margin);
  const count = positions.length;

  const styleLabelBase = {
    fink:             'Fink',
    monopitch_pratt:  'Mono-pitch Pratt',
    parallel_pratt:   'Pratt parallel-chord',
  };

  const parts = [];
  for (let i = 0; i < count; i++) {
    const crop = trussSpanIntervalForLayoutCrop(blockCfg, axis, fullSpan, positions[i], cropCtx, frame);
    if (!crop) continue;

    // Generate the COMPLETE truss first. Layout cuts should behave like a
    // physical saw cut through an already-designed truss, not like a new
    // shorter truss with all web bays remapped. This keeps the web rhythm and
    // keeps bearing tabs only at the original ends that still exist.
    const spanDims = { roofPitch: blockCfg.roofPitch || 10 };
    const geom = generateTrussGeometry(blockCfg.roofStyle, fullSpan, spanDims, chordW);
    if (!geom) continue;

    // Bearing tabs are also injected on the full truss before trimming. If a
    // layout cut removes one bearing wall, the tab on that side is clipped off
    // with the discarded portion instead of being recreated on the new cut edge.
    let geomWithTabs = geom;
    if (t.supports) {
      const webDepth = (t.supportDepth != null) ? t.supportDepth : 4;
      const tabDepth = matT_ * 2;
      const columnType = t.supportColumnType === 't' ? 't' : 'i';
      const injected = injectTrussBearingTabs(geom, matT_, webDepth, tabDepth, columnType);
      if (injected) geomWithTabs = injected;
    }

    const geomFinal = crop.clipped
      ? trimGeneratedTrussGeometryToSpanInterval(geomWithTabs, crop.start, crop.end)
      : geomWithTabs;
    if (!geomFinal) continue;

    const styleLabel = styleLabelBase[geom.style] || geom.style;
    const keptSpan = crop.end - crop.start;
    const clipNote = crop.clipped
      ? `, layout-cut trim ${keptSpan.toFixed(0)}mm kept from original ${fullSpan.toFixed(0)}mm span`
      : `, ${fullSpan.toFixed(0)}mm span`;
    const part = trussGeometryToPart(
      geomFinal,
      `truss_${i}${sfx}`,
      `${nameLbl}Truss ${i + 1}/${count} (${styleLabel}${clipNote})`,
      'core',
    );
    if (part) {
      if (crop.clipped) {
        part.assemblyNote = `Layout cut physically trimmed this truss station from the full-size truss. Kept original span interval ${crop.start.toFixed(1)}–${crop.end.toFixed(1)}mm; web layout and bearing tabs were not regenerated at the cut edge.`;
      }
      parts.push(part);
    }
  }
  return parts;
}
/** Resolve truss axis using the same rules as the truss and column generators. */
export function resolveTrussAxis(blockCfg) {
  const t = blockCfg.trusses || {};
  const ridge = effectiveRidgeDir(blockCfg);
  const isGable = blockCfg.roofStyle === 'gabled' || blockCfg.roofStyle === 'parapet_gable';
  let axis = t.axis;
  if (!axis || (axis !== 'ns' && axis !== 'ew')) {
    if (isGable) {
      // Ridge ew → trusses span north/south. Ridge ns → trusses span east/west.
      axis = ridge === 'ew' ? 'ns' : 'ew';
    } else {
      axis = blockCfg.width >= blockCfg.depth ? 'ns' : 'ew';
    }
  }
  return axis;
}


export function trussInteriorFrame(blockCfg, blockPlan) {
  const matT = (blockPlan && blockPlan.matT) || blockCfg.coreThickness || 1.5;
  const width = Number(blockCfg.width) || 0;
  const depth = Number(blockCfg.depth) || 0;
  // Trusses are installed inside the wall shell. Their spans and station
  // spacing must therefore use the clear INSIDE dimensions, not the exterior
  // footprint. The x0/y0 offsets convert back to the floor/footprint frame
  // whenever we need etch marks, wall indicators, or layout-cut checks.
  return {
    matT,
    x0: matT,
    y0: matT,
    width: Math.max(1, width - 2 * matT),
    depth: Math.max(1, depth - 2 * matT),
  };
}

export function wallXBracingEnabled(t) {
  if (!t) return false;
  if (typeof t.xBraceEnabled === 'boolean') return t.xBraceEnabled;
  // Backward compatibility for .hako files made while X-bracing used four
  // per-wall checkboxes. Any checked wall means the simplified toggle is on.
  return Array.isArray(t.xBraceWalls) && t.xBraceWalls.length > 0;
}

/**
 * One bay-based interior wall X-brace part.
 *
 * Each bay now outputs a single connected X-shaped part, with no surrounding
 * rectangular frame. The outline is the union of two diagonal brace strips.
 * Each strip is built with a true square cap, extended past the bay corner,
 * then trimmed back to the bay rectangle. That makes the four outer ends land
 * square to the bay edges/corners instead of square to the diagonal itself.
 */
export function squareCappedStripPolygon(x1, y1, x2, y2, width) {
  const dx = x2 - x1, dy = y2 - y1;
  const L = Math.hypot(dx, dy);
  if (!(L > 0)) return null;
  const hw = Math.max(0.15, width / 2);
  const px = -dy / L * hw;
  const py =  dx / L * hw;
  return [
    { x: x1 + px, y: y1 + py },
    { x: x2 + px, y: y2 + py },
    { x: x2 - px, y: y2 - py },
    { x: x1 - px, y: y1 - py },
  ];
}

export function pointOnSegmentEps(p, a, b, eps) {
  eps = eps || 1e-6;
  const cross = (p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x);
  if (Math.abs(cross) > eps) return false;
  const dot = (p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y);
  if (dot < -eps) return false;
  const len2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  return dot <= len2 + eps;
}

export function pointOnPolygonBoundary(p, poly, eps) {
  for (let i = 0; i < poly.length; i++) {
    if (pointOnSegmentEps(p, poly[i], poly[(i + 1) % poly.length], eps)) return true;
  }
  return false;
}

export function segmentIntersectionPoint(a, b, c, d) {
  const rX = b.x - a.x, rY = b.y - a.y;
  const sX = d.x - c.x, sY = d.y - c.y;
  const den = rX * sY - rY * sX;
  if (Math.abs(den) < 1e-9) return null;
  const qX = c.x - a.x, qY = c.y - a.y;
  const t = (qX * sY - qY * sX) / den;
  const u = (qX * rY - qY * rX) / den;
  if (t < -1e-8 || t > 1 + 1e-8 || u < -1e-8 || u > 1 + 1e-8) return null;
  return { x: a.x + t * rX, y: a.y + t * rY };
}

export function addUniquePoint(out, p, eps) {
  eps = eps || 1e-5;
  if (!p || !isFinite(p.x) || !isFinite(p.y)) return;
  for (const q of out) {
    if (Math.hypot(p.x - q.x, p.y - q.y) < eps) return;
  }
  out.push(p);
}

export function removeNearlyCollinearPoints(poly, eps) {
  eps = eps || 1e-5;
  if (!poly || poly.length < 4) return poly || [];
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[(i - 1 + poly.length) % poly.length];
    const b = poly[i];
    const c = poly[(i + 1) % poly.length];
    const abx = b.x - a.x, aby = b.y - a.y;
    const bcx = c.x - b.x, bcy = c.y - b.y;
    const cross = Math.abs(abx * bcy - aby * bcx);
    const len = Math.hypot(abx, aby) + Math.hypot(bcx, bcy);
    if (len > 0 && cross / len < eps) continue;
    out.push(b);
  }
  return out;
}

export function unionTwoStarPolygons(polyA, polyB) {
  const pts = [];
  const insideStrict = (p, poly) => pointInPolygon(p, poly) && !pointOnPolygonBoundary(p, poly, 1e-6);

  for (const p of polyA) if (!insideStrict(p, polyB)) addUniquePoint(pts, { x: p.x, y: p.y });
  for (const p of polyB) if (!insideStrict(p, polyA)) addUniquePoint(pts, { x: p.x, y: p.y });

  for (let i = 0; i < polyA.length; i++) {
    const a = polyA[i], b = polyA[(i + 1) % polyA.length];
    for (let j = 0; j < polyB.length; j++) {
      const c = polyB[j], d = polyB[(j + 1) % polyB.length];
      addUniquePoint(pts, segmentIntersectionPoint(a, b, c, d));
    }
  }

  if (pts.length < 3) return [];
  const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
  pts.sort((p, q) => Math.atan2(p.y - cy, p.x - cx) - Math.atan2(q.y - cy, q.x - cx));
  return removeNearlyCollinearPoints(pts, 1e-4);
}

export function connectedXBraceOutline(w, h, memberW) {
  // Build the X from two square-capped diagonal members, but extend each
  // member beyond the bay first and then clip it back to the bay rectangle.
  // That preserves the nice connected X at the centre while making the outer
  // ends terminate square to the wall bay edges/corners.
  const diagLen = Math.hypot(w, h);
  if (!(diagLen > 0)) return [];
  const ext = Math.max(memberW * 2, 2);

  const uxA = w / diagLen, uyA = h / diagLen;
  const rawA = squareCappedStripPolygon(-uxA * ext, -uyA * ext, w + uxA * ext, h + uyA * ext, memberW);

  const uxB = w / diagLen, uyB = -h / diagLen;
  const rawB = squareCappedStripPolygon(-uxB * ext, h - uyB * ext, w + uxB * ext, 0 + uyB * ext, memberW);

  const stripA = rawA ? clipPolygonToRect(rawA, 0, 0, w, h) : [];
  const stripB = rawB ? clipPolygonToRect(rawB, 0, 0, w, h) : [];
  if (!stripA || !stripB || stripA.length < 3 || stripB.length < 3) return [];
  return unionTwoStarPolygons(stripA, stripB);
}

export function generateXBraceBayPart(bayW, wallH, memberW, id, name, note) {
  const w = Math.max(0, bayW);
  const h = Math.max(0, wallH);
  const m = Math.max(0.3, memberW || 2);
  if (w < m * 2 || h < m * 2) return null;

  const outlineRaw = connectedXBraceOutline(w, h, m);
  if (!outlineRaw || outlineRaw.length < 6 || polygonAbsArea(outlineRaw) < 1) return null;
  const b = polygonBounds(outlineRaw);
  const outline = outlineRaw.map(p => ({ x: p.x - b.minX, y: p.y - b.minY }));

  return {
    id,
    name,
    material: 'cladding',
    bboxW: b.w,
    bboxH: b.h,
    bboxOffsetX: 0,
    bboxOffsetY: 0,
    paths: [{ type: 'cut', d: polygonToPath(outline) }],
    rects: [],
    lines: [],
    assemblyNote: note || 'Glue this connected X brace to the inside wall cladding between adjacent truss stations.',
  };
}

/**
 * Generate one connected interior X-brace for each wall bay between adjacent
 * truss positions. Only the bearing walls for the current truss direction
 * get bay braces:
 *   axis ns → front/back walls have bays between trusses
 *   axis ew → east/west walls have bays between trusses
 */
export function generateXBracesForBlock(blockCfg, blockPlan, sfx, nameLbl) {
  const t = blockCfg.trusses;
  if (!t || !t.enabled || !wallXBracingEnabled(t)) return [];
  const memberW = (t.xBraceW != null) ? t.xBraceW : 1.0;
  if (memberW <= 0) return [];

  const axis = resolveTrussAxis(blockCfg);
  const walls = axis === 'ns' ? ['front', 'back'] : ['east', 'west'];
  const flangeW = (t.supportFlangeW != null) ? t.supportFlangeW : 4;
  const matT = blockPlan.matT || blockCfg.coreThickness || 1.5;
  const frame = trussInteriorFrame(blockCfg, blockPlan);
  const margin = t.supports ? flangeW / 2 : 0;
  const lengthAlong = axis === 'ns' ? frame.width : frame.depth;
  const spacing = Math.max(5, t.spacing || 30);
  const positionsInner = trussSupportPositions(lengthAlong, spacing, margin);
  if (positionsInner.length < 2) return [];

  const braceH = Math.max(5, (blockPlan.H || blockCfg.height || 0) - (blockPlan.parapetH || 0));
  const fitInset = t.supports ? flangeW / 2 : 0;
  const out = [];

  function addPartsForFace(face, wallW, positionsLocal) {
    const faceTitle = face.charAt(0).toUpperCase() + face.slice(1);
    for (let i = 0; i < positionsLocal.length - 1; i++) {
      // The brace sits between adjacent truss/column lines. If column
      // supports are enabled, shrink the bay by half a flange at each side
      // so the X brace terminates at the column faces instead of overlapping
      // the support flanges. This works for both I and T support columns,
      // since both use the same wall-side flange position.
      const x0 = Math.max(0, positionsLocal[i] + fitInset);
      const x1 = Math.min(wallW, positionsLocal[i + 1] - fitInset);
      const bayW = x1 - x0;
      if (bayW < memberW * 2) continue;
      const part = generateXBraceBayPart(
        bayW,
        braceH,
        memberW,
        `xbrace_${face}_bay${i + 1}${sfx}`,
        `${nameLbl}Interior X-Brace ${faceTitle} bay ${i + 1}/${positionsLocal.length - 1} (${bayW.toFixed(0)}mm × ${braceH.toFixed(0)}mm)`,
        `Glue this connected X brace to the inside ${face} wall cladding between truss stations ${i + 1} and ${i + 2}. Align the four outer ends to the adjacent column/truss and roof/floor edge lines; the ends are trimmed square to the bay corners/edges.`,
      );
      if (part) out.push(part);
    }
  }

  for (const face of walls) {
    if (face !== 'front' && face !== 'back' && face !== 'east' && face !== 'west') continue;

    // Front/back walls have multiple bays only when trusses run N-S and are
    // spaced along the building width. East/west walls have multiple bays
    // only when trusses run E-W and are spaced along the building depth.
    if ((face === 'front' || face === 'back') && axis === 'ns') {
      // X-brace bay widths are measured between truss stations inside the
      // wall shell. No wall-thickness offset is needed for the cut part
      // itself because each bay is emitted as an independent strip.
      addPartsForFace(face, frame.width, positionsInner);
    } else if ((face === 'east' || face === 'west') && axis === 'ew') {
      addPartsForFace(face, frame.depth, positionsInner);
    }
  }
  return out;
}
