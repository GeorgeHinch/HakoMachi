'use strict';

/* =====================================================================
   WINDOW PARTS GENERATORS
   ===================================================================== */

/* Returns a list of window parts: glass panes, black backing, frames, and (for 
   styles with mullions) a divider frame whose multiple pane apertures leave the
   mullion as retained material. */
/* Single opaque blanking panel sized to fill the core hole for windows
 * with placement: 'blanked'. Sized = visible opening + 1mm each side
 * (= the core hole) − 0.2mm clearance for fit, same as glass. Cut from
 * cladding material so it reads as solid wall from outside. No glass,
 * no frame layers.
 */
function generateBlankedWindowPanels(cfg, upperCount, groundCount) {
  const parts = [];
  const upperDims = getWindowDims(cfg);
  const groundDims = getGroundFloorWindowDims(cfg);
  const overrideOn = !!cfg.firstFloorWindowStyleEnabled;
  const dimsEqual = upperDims.styleKey === groundDims.styleKey
                 && upperDims.scaleKey === groundDims.scaleKey;
  const total = (upperCount || 0) + (groundCount || 0);
  if (total === 0) return parts;
  const emit = (dims, count, suffix) => {
    if (count <= 0) return;
    const w = dims.w + 2 - 0.2;
    const h = dims.h + 2 - 0.2;
    parts.push(layoutPanes('blanking_panel' + suffixId(suffix), count, w, h, 'cladding',
      'Blanking panel' + suffix + ' (fills core hole behind cladding — solid, no glass)'));
  };
  if (!overrideOn || dimsEqual || groundCount === 0) {
    emit(upperDims, total, '');
  } else {
    emit(upperDims, upperCount, ' (upper floors)');
    emit(groundDims, groundCount, ' (ground floor)');
  }
  return parts;
}

/* Group a windowSpecs list by exact (w, h, style) and return an array of
 * { w, h, style, count } summary records. A separate set of glass / backing
 * / frame parts will be emitted for each distinct group, so manually-placed
 * windows whose dimensions don't match the global windowStyle's size still
 * get correctly-sized glass.
 *
 * Rounding to 0.01 mm via the toFixed in the key tolerates float drift
 * between the editor's stored values and downstream recomputations; two
 * 12-mm-wide windows whose w differs by 1e-12 are still one group. */
function groupWindowSpecsBySize(specs) {
  const groups = new Map();
  for (const s of (specs || [])) {
    if (!s || !(s.w > 0) || !(s.h > 0)) continue;
    const key = [
      s.w.toFixed(2),
      s.h.toFixed(2),
      s.style || '',
      (s.originalW || s.w).toFixed(2),
      (s.clipLeft || 0).toFixed(2),
    ].join('|');
    if (!groups.has(key)) groups.set(key, {
      w: s.w, h: s.h, style: s.style || null,
      originalW: s.originalW || s.w,
      clipLeft: s.clipLeft || 0,
      partial: !!s.partial,
      count: 0,
    });
    groups.get(key).count += 1;
  }
  return [...groups.values()];
}

/* Build a winDims-like object from a (w, h, style) tuple, suitable for
 * generateWindowPartsForDims. The mullion is pulled from the style spec
 * so multi-pane lattice/kumiko windows still get their divider piece. */
function winDimsFromSpec(spec) {
  const styleSpec = spec.style ? WINDOW_STYLES[spec.style] : null;
  return {
    w: spec.w,
    h: spec.h,
    mullion: (styleSpec && styleSpec.mullion) || 'none',
    styleKey: spec.style || null,
    scaleKey: 'manual',
  };
}

/* Build all window glass + backing + frame parts for a collection of
 * windowSpecs (one entry per actual window, with its exact dimensions and
 * style). Each unique (w, h, style) group becomes a separately-laid-out
 * set, named so the model-maker can tell them apart on the laser sheet.
 *
 * Replaces the old path of "count upper, count ground, emit one or two sets
 * at the globally-configured window size" — which produced wrong-sized
 * glass for any custom-sized manual window. Falls back to the
 * legacy upper/ground count path when no specs are available, so any
 * caller still sending counts (legacy presets, edge-case wall types)
 * keeps working. */
function generateWindowPartsFromSpecs(cfg, openingSpecs) {
  if (!openingSpecs || openingSpecs.length === 0) return [];
  const groups = groupWindowSpecsBySize(openingSpecs);
  // Sort groups by descending count so the dominant size gets the simplest
  // suffix and shows up first in the part list — easier to scan.
  groups.sort((a, b) => b.count - a.count || (b.w * b.h) - (a.w * a.h));
  // Pick a human-readable suffix. If there's only one group, no suffix at
  // all (matches the legacy single-set layout). For multiple groups,
  // suffix with the dimensions so the model-maker can match the parts to
  // their windows visually.
  const out = [];
  for (const g of groups) {
    const suffix = (groups.length === 1)
      ? ''
      : ` (${g.w.toFixed(g.w % 1 === 0 ? 0 : 1)}×${g.h.toFixed(g.h % 1 === 0 ? 0 : 1)}${g.style ? ' ' + g.style : ''})`;
    out.push(...generateWindowPartsForDims(cfg, winDimsFromSpec(g), g.count, suffix));
  }
  return out;
}

/* Spec-driven blanking-panel generator: same grouping logic as the glass
 * version, since blanked windows also need panels sized to their exact
 * core hole. */
function generateBlankedWindowPanelsFromSpecs(cfg, blankedSpecs) {
  if (!blankedSpecs || blankedSpecs.length === 0) return [];
  const groups = groupWindowSpecsBySize(blankedSpecs);
  groups.sort((a, b) => b.count - a.count || (b.w * b.h) - (a.w * a.h));
  const out = [];
  for (const g of groups) {
    const suffix = (groups.length === 1)
      ? ''
      : ` (${g.w.toFixed(g.w % 1 === 0 ? 0 : 1)}×${g.h.toFixed(g.h % 1 === 0 ? 0 : 1)})`;
    const w = g.w + 2 - 0.2;
    const h = g.h + 2 - 0.2;
    out.push(layoutPanes('blanking_panel' + suffixId(suffix), g.count, w, h, 'cladding',
      'Blanking panel' + suffix + ' (fills core hole behind cladding — solid, no glass)'));
  }
  return out;
}


function generateWindowParts(cfg, totalWindows, groundFloorWindowCount) {
  if (totalWindows === 0 && (!groundFloorWindowCount || groundFloorWindowCount === 0)) return [];
  const cT = cfg.claddingThickness;
  const upperDims = getWindowDims(cfg);
  const groundDims = getGroundFloorWindowDims(cfg);
  const overrideOn = !!cfg.firstFloorWindowStyleEnabled;
  // If the override is on AND the dims actually differ, we produce TWO sets:
  //   - "upper" sized for the upper-floor count
  //   - "ground" sized for the ground-floor count
  // Otherwise, one set sized to total.
  const dimsEqual = upperDims.styleKey === groundDims.styleKey 
                 && upperDims.scaleKey === groundDims.scaleKey;
  if (!overrideOn || dimsEqual || groundFloorWindowCount === 0) {
    // One set covering all windows
    return generateWindowPartsForDims(cfg, upperDims, totalWindows + (groundFloorWindowCount || 0), '');
  }
  // Two distinct sets
  const upperOnly = totalWindows;  // upper-floor windows already exclude ground-floor count
  const out = [];
  out.push(...generateWindowPartsForDims(cfg, upperDims, upperOnly, ' (upper floors)'));
  out.push(...generateWindowPartsForDims(cfg, groundDims, groundFloorWindowCount, ' (ground floor)'));
  return out;
}

/* Inner helper: produce a complete window stack (glass / black backing / inner / 
   divider / external frames) for ONE window dim. Names get the suffix appended 
   so dual-stack outputs are distinguishable. */
function generateWindowPartsForDims(cfg, winDims, count, suffix) {
  if (count <= 0) return [];
  const cT = cfg.claddingThickness;
  // Exact count — no spares. Re-cutting a few extras later if needed is
  // cheaper than wasting laser time and material on unused pieces every build.
  const total = count;

  // Look up the style spec (for frameMaterial, frameColor, paneFill, etc.).
  // winDims may be a synthetic dim (e.g. cladding-style override) so styleKey
  // can be missing — fall back to plain cladding/no extras in that case.
  const styleSpec = (winDims.styleKey && WINDOW_STYLES[winDims.styleKey]) || null;
  const frameMaterial = (styleSpec && styleSpec.frameMaterial) || 'cladding';
  // Lattice / kumiko etched on the external frame piece (renji, shoji, ranma, yukimi).
  const etchShapes = styleSpec
    ? windowFeatureShapes(styleSpec, winDims.w, winDims.h)
    : [];

  // Glass: visible window size + 1mm on each side (for the core hole) - 0.2mm clearance for fit
  const glassW = winDims.w + 2 - 0.2;
  const glassH = winDims.h + 2 - 0.2;

  const parts = [];

  parts.push(layoutPanes('glass' + suffixId(suffix), total, glassW, glassH, 'window',
    'Glass panes' + suffix + ' (slot into core hole, 0.2mm clearance)'));

  parts.push(layoutPanes('black_backing' + suffixId(suffix), total, glassW, glassH, 'backing',
    'Black backing' + suffix + ' (optional layer 1 — blackout)'));

  // Inner frame (sits inside the core hole, behind cladding)
  const innerFrameOuterW = glassW;
  const innerFrameOuterH = glassH;
  const innerApW = Math.max(2, winDims.w - 1);
  const innerApH = Math.max(2, winDims.h - 1);

  parts.push(layoutSingleApFrames('frame_inner' + suffixId(suffix), total,
    innerFrameOuterW, innerFrameOuterH, innerApW, innerApH,
    'cladding',
    'Inner frame' + suffix + ' — single aperture (use 1-2 per window for depth)'));

  if (winDims.mullion && winDims.mullion !== 'none') {
    // For Japanese lattice/kumiko styles, the visible "panes" come from
    // etching on the external frame (handled below) — no divider frame piece.
    // mushiko_slits is the exception: real cut-through slits in a separate
    // plaster-material piece that replaces the divider role.
    const etchedLatticeStyles = new Set(['renji_vertical', 'ranma_lattice', 'shoji_grid', 'yukimi_split']);
    const isEtchedLattice = etchedLatticeStyles.has(winDims.mullion);
    if (!isEtchedLattice) {
      const dividerMat = (winDims.mullion === 'mushiko_slits') ? 'plaster' : 'cladding';
      const dividerLabel = (winDims.mullion === 'mushiko_slits')
        ? 'Plaster slit frame'
        : 'Divider frame';
      parts.push(layoutDividerFrame('frame_divider' + suffixId(suffix), total,
        innerFrameOuterW, innerFrameOuterH, innerApW, innerApH, winDims.mullion,
        dividerMat,
        dividerLabel + suffix + ' — multi-pane (max 1 per window; retained material = mullion / plaster between slits)'));
    }
  }

  // External frame = visible trim ring glued to the FRONT of the cladding
  // around the window. It's a donut piece:
  //   • Inner aperture = exactly the window opening (light passes through
  //     unobstructed, lines up with the cladding hole below it).
  //   • Outer extends WINDOW_TRIM_MARGIN beyond the opening on each side,
  //     creating a visible trim ring of that width on the cladding surface.
  // Any kumiko / lattice etching is drawn inside the aperture, so it falls
  // exactly within the visible window area.
  const WINDOW_TRIM_MARGIN = 1.0;   // mm trim ring width on each side
  const extOuterW = winDims.w + 2 * WINDOW_TRIM_MARGIN;
  const extOuterH = winDims.h + 2 * WINDOW_TRIM_MARGIN;
  const extInnerW = winDims.w;
  const extInnerH = winDims.h;

  parts.push(layoutSingleApFrames('frame_external' + suffixId(suffix), total,
    extOuterW, extOuterH, extInnerW, extInnerH,
    frameMaterial,
    'External frame' + suffix + ' — trim ring (1mm wider than opening on each side, glues to cladding around window)',
    etchShapes));

  return parts;
}

/* Convert a human suffix like " (ground floor)" into a kebab id like "_ground" */
function suffixId(suffix) {
  if (!suffix) return '';
  if (suffix.includes('ground')) return '_ground';
  if (suffix.includes('upper')) return '_upper';
  return '_' + suffix.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

/* Generates door insert pieces. Each door insert is the door visible on the
   building face — panel/glass apertures CUT (not etched in scrap), with panel
   ridges and slat detail etched on the retained body of the piece. */
function generateDoorInserts(cfg, doorTallies) {
  // doorTallies: { styleKey: count }
  const cT = cfg.claddingThickness;
  const parts = [];
  // Trim margin around each insert. The door piece sits inside the
  // cladding-hole (it doesn't cut through the wall core; it glues into the
  // hole flush with the cladding face), so trimming during fitting is
  // common: nudge the corners with a hobby knife so the piece settles flat
  // without binding. The actual fit dimensions are `insetW × insetH`
  // (already 0.2 mm smaller than the cladding hole on each side for slip-
  // fit clearance). Cutting at exactly those dims leaves no material to
  // remove if the laser singes the edge or the user wants to chamfer the
  // back — once you've trimmed, the piece is undersized. So we cut at
  // `insetW + 2·trim × insetH + 2·trim` and engrave the true fit outline
  // at the inset dimensions so the user knows where to trim back to.
  // Default is 0.75 mm per side — enough to recover from one or two
  // knife passes, not so much that the piece is wildly oversized on the
  // sheet. User-adjustable under Laser Settings.
  const trim = Math.max(0, Math.min(5, Number(cfg.surfaceFeatureTrimOffset ?? 0.75)));
  for (const [styleKey, count] of Object.entries(doorTallies)) {
    if (count <= 0) continue;
    const door = DOOR_STYLES[styleKey];
    if (!door) continue;

    const total = count;  // exact count — no spares
    // Insert is 0.2mm smaller than the cladding door hole on each side, for fit
    const insetW = door.width - 0.4;
    const insetH = door.height - 0.4;
    // Outer cut dimensions (insert + trim margin on each side)
    const cutW = insetW + 2 * trim;
    const cutH = insetH + 2 * trim;

    const gutter = 5;
    const cols = Math.min(total, Math.max(2, Math.floor((250 - gutter) / (cutW + gutter))));
    const rows = Math.ceil(total / cols);
    const sheetW = cols * (cutW + gutter) + gutter;
    const sheetH = rows * (cutH + gutter) + gutter;

    // Push the geometry for one door insert (outer cut + glass apertures +
    // etched features + engraved trim-guide outline) at a tile's local
    // top-left coords. The OUTER cut starts at (ox, oy) and is cutW × cutH;
    // the inner door content (engraving outline, glass apertures, etched
    // features) starts at (ox + trim, oy + trim) and is insetW × insetH.
    // Used to build BOTH the tiled sheet AND the single-tile preview so
    // the download keeps the tiled layout while the UI shows one card
    // with a "Cut ×N" badge.
    function pushDoorTile(ox, oy, outRects, outLines) {
      // Outer perimeter — oversized by `trim` on every side
      outRects.push({ type: 'cut', x: ox, y: oy, w: cutW, h: cutH, compensateKerf: false });
      // Engraved trim-guide outline at the actual fit dimensions. The model-
      // maker trims the outer cut back to this rectangle to seat the piece
      // in its cladding hole with the intended 0.2 mm clearance per side.
      const dx = ox + trim, dy = oy + trim;
      outLines.push({ type: 'etch', x1: dx,           y1: dy,           x2: dx + insetW, y2: dy });
      outLines.push({ type: 'etch', x1: dx + insetW,  y1: dy,           x2: dx + insetW, y2: dy + insetH });
      outLines.push({ type: 'etch', x1: dx + insetW,  y1: dy + insetH,  x2: dx,          y2: dy + insetH });
      outLines.push({ type: 'etch', x1: dx,           y1: dy + insetH,  x2: dx,          y2: dy });
      // Glass apertures (positioned within the inner door content — NOT
      // expanded by the trim margin, since they have to line up with the
      // glass cuts in the wall core; the trim is only for the outer edge).
      const sx = insetW / door.width;
      const sy = insetH / door.height;
      const doorGlassPanes = Array.isArray(door.glassPanes) ? door.glassPanes : [];
      for (const gp of doorGlassPanes) {
        const gx = dx + gp.x1 * sx;
        const gy = dy + gp.y1 * sy;
        const gw = (gp.x2 - gp.x1) * sx;
        const gh = (gp.y2 - gp.y1) * sy;
        if (gw < 0.6 || gh < 0.6) continue;
        outRects.push({ type: 'cut', x: gx, y: gy, w: gw, h: gh, compensateKerf: false });
      }
      // Etched features (panel ridges, shutter slats, double-door split, etc.)
      const shapes = doorFeatureShapes(door);
      for (const sh of shapes) {
        if (sh.type === 'rect') {
          const x1 = dx + sh.x * sx, y1 = dy + sh.y * sy;
          const x2 = dx + (sh.x + sh.w) * sx, y2 = dy + (sh.y + sh.h) * sy;
          outLines.push({ type: 'etch', x1, y1, x2, y2: y1 });
          outLines.push({ type: 'etch', x1: x2, y1, x2, y2 });
          outLines.push({ type: 'etch', x1: x2, y1: y2, x2: x1, y2 });
          outLines.push({ type: 'etch', x1, y1: y2, x2: x1, y2: y1 });
        } else if (sh.type === 'line') {
          outLines.push({ type: 'etch',
            x1: dx + sh.x1 * sx, y1: dy + sh.y1 * sy,
            x2: dx + sh.x2 * sx, y2: dy + sh.y2 * sy });
        } else if (sh.type === 'circle') {
          const cx = dx + sh.cx * sx, cy = dy + sh.cy * sy;
          const rx = sh.r * sx, ry = sh.r * sy;
          const N = 12;
          let px = cx + rx, py = cy;
          for (let i = 1; i <= N; i++) {
            const a = (i / N) * 2 * Math.PI;
            const nx = cx + Math.cos(a) * rx;
            const ny = cy + Math.sin(a) * ry;
            outLines.push({ type: 'etch', x1: px, y1: py, x2: nx, y2: ny });
            px = nx; py = ny;
          }
        }
      }
    }

    const rects = [];
    const lines = [];
    for (let i = 0; i < total; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const ox = gutter + c * (cutW + gutter);
      const oy = gutter + r * (cutH + gutter);
      pushDoorTile(ox, oy, rects, lines);
    }
    // Single-tile preview geometry (origin at 0,0).
    const tileRects = [], tileLines = [];
    pushDoorTile(0, 0, tileRects, tileLines);
    const tileGeom = {
      bboxW: cutW, bboxH: cutH,
      bboxOffsetX: 0, bboxOffsetY: 0,
      paths: [], rects: tileRects, lines: tileLines,
    };

    parts.push({
      id: 'door_insert_' + styleKey,
      name: `Door insert — ${door.label} (${count}×, ${trim.toFixed(2)}mm trim offset)`,
      material: door.frameMaterial || 'cladding',
      assemblyNote: `Surface-fit insert is cut ${trim.toFixed(2)}mm oversized per side and etched with the true fit outline.`,
      bboxW: sheetW, bboxH: sheetH,
      bboxOffsetX: 0, bboxOffsetY: 0,
      paths: [], rects: rects, lines: lines,
      tileCount: total,
      tileGeom: tileGeom,
    });

    // Glass pane sheet for this door style (if it has any glass apertures)
    const glassApertures = Array.isArray(door.glassPanes) ? door.glassPanes : [];
    if (glassApertures.length > 0) {
      const sx = insetW / door.width;
      const sy = insetH / door.height;
      // Generate a glass pane for each aperture (slightly oversized: aperture + 1mm border, -0.2mm for fit)
      const glassPieces = [];
      for (let pi = 0; pi < glassApertures.length; pi++) {
        const gp = glassApertures[pi];
        // Glass pane oversized by 0.9 mm each side over the visible aperture
        // (= +2 mm minus 0.2 mm fit clearance), matching the window pattern.
        // The pane slots into the core hole (cut at aperture + 1 mm each side)
        // and is glued to the lip; the cladding insert is then glued on top.
        const gw = (gp.x2 - gp.x1) * sx + 2 - 0.2;
        const gh = (gp.y2 - gp.y1) * sy + 2 - 0.2;
        if (gw < 1 || gh < 1) continue;
        for (let n = 0; n < total; n++) {
          glassPieces.push({ w: gw, h: gh, paneIndex: pi });
        }
      }
      if (glassPieces.length > 0) {
        // Lay out simply
        const maxW = Math.max(...glassPieces.map(g => g.w));
        const maxH = Math.max(...glassPieces.map(g => g.h));
        const gCols = Math.max(2, Math.floor((250 - gutter) / (maxW + gutter)));
        const gRows = Math.ceil(glassPieces.length / gCols);
        const gSheetW = gCols * (maxW + gutter) + gutter;
        const gSheetH = gRows * (maxH + gutter) + gutter;
        const gRects = [];
        for (let i = 0; i < glassPieces.length; i++) {
          const piece = glassPieces[i];
          const c = i % gCols;
          const r = Math.floor(i / gCols);
          const ox = gutter + c * (maxW + gutter) + (maxW - piece.w) / 2;
          const oy = gutter + r * (maxH + gutter) + (maxH - piece.h) / 2;
          gRects.push({ type: 'cut', x: ox, y: oy, w: piece.w, h: piece.h, compensateKerf: false });
        }
        parts.push({
          id: 'door_glass_' + styleKey,
          name: `Door glass — ${door.label} (slots into core holes, 0.2 mm clearance)`,
          material: 'window',
          bboxW: gSheetW, bboxH: gSheetH,
          bboxOffsetX: 0, bboxOffsetY: 0,
          paths: [], rects: gRects, lines: [],
        });
      }
    }
  }
  return parts;
}

function cropDoorStyleForSpec(baseDoor, spec) {
  const origW = Number(spec.originalW || spec.w || baseDoor.width || 1);
  const origH = Number(spec.originalH || spec.h || baseDoor.height || 1);
  const baseW = Math.max(0.01, Number(baseDoor.width || origW || 1));
  const baseH = Math.max(0.01, Number(baseDoor.height || origH || 1));
  const outH  = Math.max(0.01, Number(spec.h || origH || baseH));
  const clipLeft = Number(spec.clipLeft || 0);
  const clipRight = clipLeft + Number(spec.w || origW);
  const sxFull = origW / baseW;
  const syFull = outH / baseH;
  const out = { ...baseDoor, width: spec.w, height: outH, centerSplit: false };

  // Door specs are stored in the actual cladding/opening dimensions, while
  // DOOR_STYLES feature coordinates are authored in each style's base size.
  // Scale the authored feature geometry into the resized door's full local
  // coordinate system FIRST, then apply any layout-cut clipping. The old code
  // clipped unscaled base coordinates directly, so details like the rolling
  // shutter lock/handle stayed at the original 14×22mm position when the door
  // was resized, making the SVG handle float too high/left on larger doors.
  const sx = (v) => Number(v || 0) * sxFull;
  const sy = (v) => Number(v || 0) * syFull;
  const sr = (v) => Number(v || 0) * Math.max(0.01, (sxFull + syFull) / 2);

  function scaleFeature(f) {
    const o = { ...f };
    if ('x1' in o) o.x1 = sx(o.x1);
    if ('x2' in o) o.x2 = sx(o.x2);
    if ('x'  in o) o.x  = sx(o.x);
    if ('w'  in o) o.w  = sx(o.w);
    if ('cx' in o) o.cx = sx(o.cx);
    if ('y1' in o) o.y1 = sy(o.y1);
    if ('y2' in o) o.y2 = sy(o.y2);
    if ('y'  in o) o.y  = sy(o.y);
    if ('h'  in o) o.h  = sy(o.h);
    if ('cy' in o) o.cy = sy(o.cy);
    if ('r'  in o) o.r  = sr(o.r);
    return o;
  }

  function clipXRange(x1, x2) {
    const a = Math.max(x1, clipLeft);
    const b = Math.min(x2, clipRight);
    if (b - a <= 0.05) return null;
    return [a - clipLeft, b - clipLeft];
  }

  out.glassPanes = [];
  for (const gp of (baseDoor.glassPanes || [])) {
    const sgp = {
      ...gp,
      x1: sx(gp.x1), x2: sx(gp.x2),
      y1: sy(gp.y1), y2: sy(gp.y2),
    };
    const xr = clipXRange(sgp.x1, sgp.x2);
    if (!xr) continue;
    out.glassPanes.push({ ...sgp, x1: xr[0], x2: xr[1] });
  }

  const features = [];
  const maybeRect = (f, typeName) => {
    // Accept both x1/x2/y1/y2 rectangles and x/y/w/h rectangles. Normalize
    // to the x1/x2 vocabulary used by the existing feature emitters.
    const x1 = ('x1' in f) ? f.x1 : f.x;
    const x2 = ('x2' in f) ? f.x2 : (f.x + f.w);
    const xr = clipXRange(x1, x2);
    if (!xr) return;
    if ('x' in f || 'w' in f) {
      features.push({ ...f, type: typeName || f.type, x: xr[0], w: xr[1] - xr[0] });
    } else {
      features.push({ ...f, type: typeName || f.type, x1: xr[0], x2: xr[1] });
    }
  };
  const maybeLine = (f) => {
    const x1 = f.x1, x2 = f.x2;
    if (Math.abs(x2 - x1) < 1e-9) {
      if (x1 >= clipLeft - 0.01 && x1 <= clipRight + 0.01) {
        features.push({ ...f, x1: x1 - clipLeft, x2: x2 - clipLeft });
      }
      return;
    }
    const xr = clipXRange(Math.min(x1, x2), Math.max(x1, x2));
    if (!xr) return;
    const nx1 = Math.max(clipLeft, Math.min(clipRight, x1)) - clipLeft;
    const nx2 = Math.max(clipLeft, Math.min(clipRight, x2)) - clipLeft;
    features.push({ ...f, x1: nx1, x2: nx2 });
  };

  if (baseDoor.centerSplit) {
    const cx = origW / 2;
    if (cx >= clipLeft - 0.01 && cx <= clipRight + 0.01) {
      features.push({ type: 'rail', x1: cx - clipLeft, y1: 0.5 * syFull, x2: cx - clipLeft, y2: outH - 0.5 * syFull });
    }
  }

  // Procedural slats are regenerated across the retained partial width.
  out.rollingSlats = !!baseDoor.rollingSlats;

  for (const raw of (baseDoor.features || [])) {
    const f = scaleFeature(raw);
    switch (f.type) {
      case 'panel':
      case 'kickPlate':
      case 'lockPlate':
      case 'hikite':
      case 'ironBand':
        maybeRect(f);
        break;
      case 'crashBar':
      case 'rail':
      case 'handle':
        maybeLine(f);
        break;
      case 'track':
        features.push({ ...f });
        break;
      case 'knob':
      case 'stud':
        if (f.cx >= clipLeft && f.cx <= clipRight) features.push({ ...f, cx: f.cx - clipLeft });
        break;
      case 'latticeVertical':
      case 'latticeGrid':
      case 'plankSeams':
      case 'horizontalRails':
        maybeRect(f);
        break;
      default:
        features.push({ ...f });
    }
  }
  out.features = features;
  return out;
}

function groupDoorSpecsBySize(specs) {
  const groups = new Map();
  for (const s of (specs || [])) {
    if (!s || !s.style || s.style === 'none' || !(s.w > 0) || !(s.h > 0)) continue;
    const key = [
      s.style,
      (s.w || 0).toFixed(2),
      (s.h || 0).toFixed(2),
      (s.originalW || s.w || 0).toFixed(2),
      (s.clipLeft || 0).toFixed(2),
    ].join('|');
    if (!groups.has(key)) {
      groups.set(key, {
        style: s.style, w: s.w, h: s.h,
        originalW: s.originalW || s.w,
        clipLeft: s.clipLeft || 0,
        partial: !!s.partial,
        count: 0,
      });
    }
    groups.get(key).count++;
  }
  return [...groups.values()];
}

function generateDoorInsertsFromSpecs(cfg, doorSpecs) {
  const groups = groupDoorSpecsBySize(doorSpecs);
  if (!groups.length) return [];
  const parts = [];
  const trim = Math.max(0, Math.min(5, Number(cfg.surfaceFeatureTrimOffset ?? 0.75)));
  const gutter = 5;

  for (const g of groups) {
    const baseDoor = DOOR_STYLES[g.style];
    if (!baseDoor || g.count <= 0) continue;
    const door = cropDoorStyleForSpec(baseDoor, g);
    const total = g.count;

    const insetW = Math.max(0.6, door.width - 0.4);
    const insetH = Math.max(0.6, door.height - 0.4);
    const cutW = insetW + 2 * trim;
    const cutH = insetH + 2 * trim;
    const cols = Math.min(total, Math.max(2, Math.floor((250 - gutter) / (cutW + gutter))));
    const rows = Math.ceil(total / cols);
    const sheetW = cols * (cutW + gutter) + gutter;
    const sheetH = rows * (cutH + gutter) + gutter;
    const partialLabel = g.partial ? ` partial ${g.w.toFixed(1)}mm of ${g.originalW.toFixed(1)}mm` : '';

    function pushDoorTile(ox, oy, outRects, outLines) {
      outRects.push({ type: 'cut', x: ox, y: oy, w: cutW, h: cutH, compensateKerf: false });
      const dx = ox + trim, dy = oy + trim;
      outLines.push({ type: 'etch', x1: dx,           y1: dy,           x2: dx + insetW, y2: dy });
      outLines.push({ type: 'etch', x1: dx + insetW,  y1: dy,           x2: dx + insetW, y2: dy + insetH });
      outLines.push({ type: 'etch', x1: dx + insetW,  y1: dy + insetH,  x2: dx,          y2: dy + insetH });
      outLines.push({ type: 'etch', x1: dx,           y1: dy + insetH,  x2: dx,          y2: dy });

      const sx = insetW / Math.max(0.01, door.width);
      const sy = insetH / Math.max(0.01, door.height);
      for (const gp of (door.glassPanes || [])) {
        const gx = dx + gp.x1 * sx;
        const gy = dy + gp.y1 * sy;
        const gw = (gp.x2 - gp.x1) * sx;
        const gh = (gp.y2 - gp.y1) * sy;
        if (gw < 0.6 || gh < 0.6) continue;
        outRects.push({ type: 'cut', x: gx, y: gy, w: gw, h: gh, compensateKerf: false });
      }
      const shapes = doorFeatureShapes(door);
      for (const sh of shapes) {
        if (sh.type === 'rect') {
          const x1 = dx + sh.x * sx, y1 = dy + sh.y * sy;
          const x2 = dx + (sh.x + sh.w) * sx, y2 = dy + (sh.y + sh.h) * sy;
          outLines.push({ type: 'etch', x1, y1, x2, y2: y1 });
          outLines.push({ type: 'etch', x1: x2, y1, x2, y2 });
          outLines.push({ type: 'etch', x1: x2, y1: y2, x2: x1, y2 });
          outLines.push({ type: 'etch', x1, y1: y2, x2: x1, y2: y1 });
        } else if (sh.type === 'line') {
          outLines.push({ type: 'etch',
            x1: dx + sh.x1 * sx, y1: dy + sh.y1 * sy,
            x2: dx + sh.x2 * sx, y2: dy + sh.y2 * sy });
        } else if (sh.type === 'circle') {
          const cx = dx + sh.cx * sx, cy = dy + sh.cy * sy;
          const rx = sh.r * sx, ry = sh.r * sy;
          const N = 12;
          let px = cx + rx, py = cy;
          for (let i = 1; i <= N; i++) {
            const a = (i / N) * 2 * Math.PI;
            const nx = cx + Math.cos(a) * rx;
            const ny = cy + Math.sin(a) * ry;
            outLines.push({ type: 'etch', x1: px, y1: py, x2: nx, y2: ny });
            px = nx; py = ny;
          }
        }
      }
    }

    const rects = [], lines = [];
    for (let i = 0; i < total; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      pushDoorTile(gutter + c * (cutW + gutter), gutter + r * (cutH + gutter), rects, lines);
    }
    const tileRects = [], tileLines = [];
    pushDoorTile(0, 0, tileRects, tileLines);

    const idSuffix = suffixId(`${g.style}_${g.w.toFixed(1)}x${g.h.toFixed(1)}_${g.clipLeft.toFixed(1)}of${g.originalW.toFixed(1)}`);
    parts.push({
      id: 'door_insert' + idSuffix,
      name: `Door insert — ${baseDoor.label}${partialLabel} (${total}×, ${trim.toFixed(2)}mm trim offset)`,
      material: baseDoor.frameMaterial || 'cladding',
      assemblyNote: `Layout-cut-aware insert. ${g.partial ? `This is a partial door piece beginning ${g.clipLeft.toFixed(1)}mm from the original door's left edge. ` : ''}Surface-fit insert is cut ${trim.toFixed(2)}mm oversized per side and etched with the true fit outline.`,
      bboxW: sheetW, bboxH: sheetH,
      bboxOffsetX: 0, bboxOffsetY: 0,
      paths: [], rects, lines,
      tileCount: total,
      tileGeom: { bboxW: cutW, bboxH: cutH, bboxOffsetX: 0, bboxOffsetY: 0, paths: [], rects: tileRects, lines: tileLines },
    });

    const glassApertures = Array.isArray(door.glassPanes) ? door.glassPanes : [];
    if (glassApertures.length > 0) {
      const sx = insetW / Math.max(0.01, door.width);
      const sy = insetH / Math.max(0.01, door.height);
      const glassPieces = [];
      for (let pi = 0; pi < glassApertures.length; pi++) {
        const gp = glassApertures[pi];
        const gw = (gp.x2 - gp.x1) * sx + 2 - 0.2;
        const gh = (gp.y2 - gp.y1) * sy + 2 - 0.2;
        if (gw < 1 || gh < 1) continue;
        for (let n = 0; n < total; n++) glassPieces.push({ w: gw, h: gh, paneIndex: pi });
      }
      if (glassPieces.length > 0) {
        const maxW = Math.max(...glassPieces.map(gp => gp.w));
        const maxH = Math.max(...glassPieces.map(gp => gp.h));
        const gCols = Math.max(2, Math.floor((250 - gutter) / (maxW + gutter)));
        const gRows = Math.ceil(glassPieces.length / gCols);
        const gSheetW = gCols * (maxW + gutter) + gutter;
        const gSheetH = gRows * (maxH + gutter) + gutter;
        const gRects = [];
        for (let i = 0; i < glassPieces.length; i++) {
          const piece = glassPieces[i];
          const c = i % gCols;
          const r = Math.floor(i / gCols);
          const ox = gutter + c * (maxW + gutter) + (maxW - piece.w) / 2;
          const oy = gutter + r * (maxH + gutter) + (maxH - piece.h) / 2;
          gRects.push({ type: 'cut', x: ox, y: oy, w: piece.w, h: piece.h, compensateKerf: false });
        }
        parts.push({
          id: 'door_glass' + idSuffix,
          name: `Door glass — ${baseDoor.label}${partialLabel} (slots into core holes, 0.2 mm clearance)`,
          material: 'window',
          bboxW: gSheetW, bboxH: gSheetH,
          bboxOffsetX: 0, bboxOffsetY: 0,
          paths: [], rects: gRects, lines: [],
        });
      }
    }
  }
  return parts;
}
