/* =====================================================================
   SKYLIGHTS
   Each skylight produces FOUR physical layers / operations:
     1. A rectangular hole cut through the roof core/cladding at the exact
        user-selected skylight opening size (handled at the roof panel level
        via skylightHolePaths — not part of this function).
     2. A clear plexi pane that overlaps the roof hole by 1.5 mm on every
        side: (hole + 3) × (hole + 3). This gives a glue lip and prevents the
        pane from falling through the roof opening.
     3. A 1.5 mm core-material curb/surround frame that fits AROUND the plexi:
        inner opening = plexi size, outer size = plexi + 1.5 mm on every side.
        This creates the raised curb without stealing any visible glazing area.
     4. A top retaining cap, cut from core material, with the SAME outside
        size as the plexi and a centred hole equal to the skylight opening.
        That leaves a 1.5 mm donut/rim on all sides, trapping the plexi below.
   ===================================================================== */

export const SKYLIGHT_FRAME_MARGIN = 1.5;  // mm — overlap / rim / curb width on each side

/* Bucket skylights by (w, h) so identical sizes share laser sheets. Returns
 * groups of { w, h, count } — same hybrid pattern as fixtures and shutters. */
export function tallySkylights(cfg) {
  const groups = new Map();
  for (const sky of (cfg.skylights || [])) {
    const w = Number(sky.w) || 0;
    const h = Number(sky.h) || 0;
    if (w <= 0 || h <= 0) continue;
    const key = `${w.toFixed(1)}|${h.toFixed(1)}`;
    const existing = groups.get(key);
    if (existing) existing.count += 1;
    else groups.set(key, { w, h, count: 1 });
  }
  return Array.from(groups.values());
}

/* Generate cut sheets for each skylight bucket. Per skylight we emit:
 *   - 1 × core curb/surround frame: outer = hole + 6, inner = hole + 3
 *   - 1 × plexi pane:              outer = hole + 3, no inner cut
 *   - 1 × core top retaining cap:  outer = hole + 3, inner = hole
 * Multiple skylights of the same size collapse into one sheet per part type.
 */
export function generateSkylightParts(cfg, skylightGroups) {
  const parts = [];

  function layoutRectTiles(count, cellW, cellH, gutter) {
    const cols = Math.max(1, Math.floor((250 - gutter) / (cellW + gutter)));
    const rows = Math.ceil(count / cols);
    return {
      cols,
      rows,
      sheetW: Math.min(250, cols * (cellW + gutter) + gutter),
      sheetH: rows * (cellH + gutter) + gutter,
    };
  }

  for (const group of (skylightGroups || [])) {
    if (!group || group.count <= 0) continue;

    const holeW = group.w;
    const holeH = group.h;
    const paneW = holeW + SKYLIGHT_FRAME_MARGIN * 2;
    const paneH = holeH + SKYLIGHT_FRAME_MARGIN * 2;
    const curbOuterW = paneW + SKYLIGHT_FRAME_MARGIN * 2;
    const curbOuterH = paneH + SKYLIGHT_FRAME_MARGIN * 2;
    const dimsTag = `${holeW.toFixed(1)}×${holeH.toFixed(1)}mm hole`;
    const idSuffix = `_${holeW.toFixed(1)}x${holeH.toFixed(1)}`.replace(/\./g, '_');
    const gutter = 3;

    // === Core curb/surround frame — fits AROUND the plexi pane ===
    // Outer: hole + 6 mm. Inner: pane size (hole + 3 mm), offset 1.5 mm.
    {
      const layout = layoutRectTiles(group.count, curbOuterW, curbOuterH, gutter);
      const rects = [];
      for (let i = 0; i < group.count; i++) {
        const c = i % layout.cols;
        const r = Math.floor(i / layout.cols);
        const ox = gutter + c * (curbOuterW + gutter);
        const oy = gutter + r * (curbOuterH + gutter);
        rects.push({ type: 'cut', x: ox, y: oy, w: curbOuterW, h: curbOuterH, compensateKerf: false });
        rects.push({ type: 'cut',
          x: ox + SKYLIGHT_FRAME_MARGIN,
          y: oy + SKYLIGHT_FRAME_MARGIN,
          w: paneW, h: paneH, compensateKerf: false });
      }
      parts.push({
        id: 'skylight_curb_frame' + idSuffix,
        name: `Skylight curb frame — ${group.count}× core (outer ${curbOuterW.toFixed(1)}×${curbOuterH.toFixed(1)}mm · inner plexi ${paneW.toFixed(1)}×${paneH.toFixed(1)}mm · ${dimsTag})`,
        material: 'core',
        bboxW: layout.sheetW, bboxH: layout.sheetH,
        bboxOffsetX: 0, bboxOffsetY: 0,
        paths: [], rects, lines: [],
        assemblyNote: 'Raised core curb that fits around the clear plexi pane; glue it to the roof around the skylight opening.',
        tileCount: group.count,
        tileGeom: {
          bboxW: curbOuterW, bboxH: curbOuterH,
          bboxOffsetX: 0, bboxOffsetY: 0,
          paths: [],
          rects: [
            { type: 'cut', x: 0, y: 0, w: curbOuterW, h: curbOuterH, compensateKerf: false },
            { type: 'cut', x: SKYLIGHT_FRAME_MARGIN, y: SKYLIGHT_FRAME_MARGIN,
              w: paneW, h: paneH, compensateKerf: false },
          ],
          lines: [],
        },
      });
    }

    // === Plexi sheet (window material) — 1 piece per skylight ===
    // Pane overlaps the roof hole by 1.5 mm in every direction.
    {
      const layout = layoutRectTiles(group.count, paneW, paneH, gutter);
      const rects = [];
      for (let i = 0; i < group.count; i++) {
        const c = i % layout.cols;
        const r = Math.floor(i / layout.cols);
        const ox = gutter + c * (paneW + gutter);
        const oy = gutter + r * (paneH + gutter);
        rects.push({ type: 'cut', x: ox, y: oy, w: paneW, h: paneH, compensateKerf: false });
      }
      parts.push({
        id: 'skylight_plexi' + idSuffix,
        name: `Skylight pane — ${group.count}× plexi (${paneW.toFixed(1)}×${paneH.toFixed(1)}mm · ${dimsTag})`,
        material: 'window',
        bboxW: layout.sheetW, bboxH: layout.sheetH,
        bboxOffsetX: 0, bboxOffsetY: 0,
        paths: [], rects, lines: [],
        assemblyNote: 'Clear acrylic pane — 1.5 mm larger than the roof hole on every side.',
        tileCount: group.count,
        tileGeom: {
          bboxW: paneW, bboxH: paneH,
          bboxOffsetX: 0, bboxOffsetY: 0,
          paths: [],
          rects: [{ type: 'cut', x: 0, y: 0, w: paneW, h: paneH, compensateKerf: false }],
          lines: [],
        },
      });
    }

    // === Core top retaining cap — same outer size as plexi, with a hole ===
    // Outer: pane size. Inner: roof hole size, offset 1.5 mm — this creates
    // the top donut/rim that traps the plexi and leaves the visible opening.
    {
      const layout = layoutRectTiles(group.count, paneW, paneH, gutter);
      const rects = [];
      for (let i = 0; i < group.count; i++) {
        const c = i % layout.cols;
        const r = Math.floor(i / layout.cols);
        const ox = gutter + c * (paneW + gutter);
        const oy = gutter + r * (paneH + gutter);
        rects.push({ type: 'cut', x: ox, y: oy, w: paneW, h: paneH, compensateKerf: false });
        rects.push({ type: 'cut',
          x: ox + SKYLIGHT_FRAME_MARGIN,
          y: oy + SKYLIGHT_FRAME_MARGIN,
          w: holeW, h: holeH, compensateKerf: false });
      }
      parts.push({
        id: 'skylight_top_cap' + idSuffix,
        name: `Skylight top cap — ${group.count}× core donut (${paneW.toFixed(1)}×${paneH.toFixed(1)}mm outer · ${dimsTag})`,
        material: 'core',
        bboxW: layout.sheetW, bboxH: layout.sheetH,
        bboxOffsetX: 0, bboxOffsetY: 0,
        paths: [], rects, lines: [],
        assemblyNote: 'Top retaining cap: same outside size as the plexi, with a centred skylight hole that leaves a 1.5 mm rim.',
        tileCount: group.count,
        tileGeom: {
          bboxW: paneW, bboxH: paneH,
          bboxOffsetX: 0, bboxOffsetY: 0,
          paths: [],
          rects: [
            { type: 'cut', x: 0, y: 0, w: paneW, h: paneH, compensateKerf: false },
            { type: 'cut', x: SKYLIGHT_FRAME_MARGIN, y: SKYLIGHT_FRAME_MARGIN,
              w: holeW, h: holeH, compensateKerf: false },
          ],
          lines: [],
        },
      });
    }
  }
  return parts;
}

export function layoutDividerFrame(id, count, outerW, outerH, innerApW, innerApH, mullion, material, description) {
  // Mullion strip width (the visible mullion thickness in real terms)
  const mullW = 0.5;  // 0.5mm = 75mm at 1:150 scale (typical real mullion)

  // Compute pane aperture rects for ONE divider frame, in local coords (0..outerW, 0..outerH).
  // Apertures all sit inside the inner-aperture footprint (centered).
  const apOffX = (outerW - innerApW) / 2;
  const apOffY = (outerH - innerApH) / 2;

  function panesForMullion() {
    if (mullion === 'vertical_1') {
      // 2 side-by-side panes
      const halfW = (innerApW - mullW) / 2;
      return [
        { x: apOffX, y: apOffY, w: halfW, h: innerApH },
        { x: apOffX + halfW + mullW, y: apOffY, w: halfW, h: innerApH },
      ];
    }
    if (mullion === 'vertical_many') {
      // n vertical panes (n = 3-5 depending on width)
      const n = Math.max(3, Math.min(5, Math.floor(innerApW / 6)));
      const totalMull = (n - 1) * mullW;
      const paneW = (innerApW - totalMull) / n;
      const out = [];
      for (let i = 0; i < n; i++) {
        out.push({ x: apOffX + i * (paneW + mullW), y: apOffY, w: paneW, h: innerApH });
      }
      return out;
    }
    if (mullion === 'grid_2x2') {
      const halfW = (innerApW - mullW) / 2;
      const halfH = (innerApH - mullW) / 2;
      return [
        { x: apOffX, y: apOffY, w: halfW, h: halfH },
        { x: apOffX + halfW + mullW, y: apOffY, w: halfW, h: halfH },
        { x: apOffX, y: apOffY + halfH + mullW, w: halfW, h: halfH },
        { x: apOffX + halfW + mullW, y: apOffY + halfH + mullW, w: halfW, h: halfH },
      ];
    }
    if (mullion === 'grid_3x2') {
      const colMull = 2 * mullW;
      const paneW = (innerApW - colMull) / 3;
      const halfH = (innerApH - mullW) / 2;
      const out = [];
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 3; col++) {
          out.push({
            x: apOffX + col * (paneW + mullW),
            y: apOffY + row * (halfH + mullW),
            w: paneW, h: halfH,
          });
        }
      }
      return out;
    }
    if (mullion === 'industrial_slider_3' || mullion === 'industrial_slider_4' || mullion === 'industrial_slider_6') {
      const cols = (mullion === 'industrial_slider_3') ? 3 : (mullion === 'industrial_slider_4') ? 4 : 6;
      const splitRatio = 0.68;
      const topH = innerApH * splitRatio;
      const botH = innerApH - topH - mullW;
      const totalMull = (cols - 1) * mullW;
      const paneW = (innerApW - totalMull) / cols;
      const out = [];
      if (paneW <= 0 || topH <= 0) return [{ x: apOffX, y: apOffY, w: innerApW, h: innerApH }];
      for (let col = 0; col < cols; col++) {
        const px = apOffX + col * (paneW + mullW);
        out.push({ x: px, y: apOffY, w: paneW, h: topH });
        if (botH > 0.6) out.push({ x: px, y: apOffY + topH + mullW, w: paneW, h: botH });
      }
      return out;
    }
    if (mullion === 'mushiko_slits') {
      // Real cut-through slits with kerf-safe plaster between. The frame piece
      // is plaster material; the surrounding glass+backing handle the dark
      // appearance behind each slit. Outer-perimeter cut is handled by the
      // caller; we only return the slit apertures here.
      return mushikoSlitRects(innerApW, innerApH).map(s => ({
        x: apOffX + s.x, y: apOffY + s.y, w: s.w, h: s.h,
      }));
    }
    if (mullion === 'renji_vertical' || mullion === 'ranma_lattice' ||
        mullion === 'shoji_grid'     || mullion === 'yukimi_split') {
      // Single big aperture — the lattice / kumiko / bars are etched on the
      // external frame piece, not made of retained mullion material.
      return [{ x: apOffX, y: apOffY, w: innerApW, h: innerApH }];
    }
    // Fallback: single aperture
    return [{ x: apOffX, y: apOffY, w: innerApW, h: innerApH }];
  }

  const panesPerFrame = panesForMullion();

  // Validate: skip panes too small to be useful (< 0.6mm in any dimension)
  const validPanes = panesPerFrame.filter(p => p.w >= 0.6 && p.h >= 0.6);
  if (validPanes.length === 0) {
    // Fall back to single aperture if mullion would make panes unreadable
    return layoutSingleApFrames(id, count, outerW, outerH, innerApW, innerApH, material,
      description + ' (mullion suppressed — panes too small)');
  }

  // Lay out 'count' divider frames in a grid
  const gutter = 5;
  const cols = Math.min(count, Math.max(4, Math.floor((250 - gutter) / (outerW + gutter))));
  const rows = Math.ceil(count / cols);
  const sheetW = cols * (outerW + gutter) + gutter;
  const sheetH = rows * (outerH + gutter) + gutter;
  const rects = [];
  for (let i = 0; i < count; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const ox = gutter + c * (outerW + gutter);
    const oy = gutter + r * (outerH + gutter);
    // Outer perimeter cut
    rects.push({ type: 'cut', x: ox, y: oy, w: outerW, h: outerH, compensateKerf: false });
    // Pane aperture cuts (these leave mullion material between them)
    for (const p of validPanes) {
      rects.push({ type: 'cut', x: ox + p.x, y: oy + p.y, w: p.w, h: p.h, compensateKerf: false });
    }
  }
  // Single-tile preview geometry: outer rect + pane apertures at local (0,0).
  const tileRects = [
    { type: 'cut', x: 0, y: 0, w: outerW, h: outerH, compensateKerf: false },
  ];
  for (const p of validPanes) {
    tileRects.push({ type: 'cut', x: p.x, y: p.y, w: p.w, h: p.h, compensateKerf: false });
  }
  const tileGeom = {
    bboxW: outerW, bboxH: outerH,
    bboxOffsetX: 0, bboxOffsetY: 0,
    paths: [], rects: tileRects, lines: [],
  };
  return {
    id: id, name: description, material: material,
    assemblyNote: `Cut-through divider grid: ${validPanes.length} pane aperture${validPanes.length !== 1 ? 's' : ''} per frame; retained material forms the mullions.`,
    bboxW: sheetW, bboxH: sheetH,
    bboxOffsetX: 0, bboxOffsetY: 0,
    paths: [], rects: rects, lines: [],
    tileCount: count,
    tileGeom: tileGeom,
  };
}

/* Layout for simple frames: each frame is an outer rectangle with ONE rectangular 
   aperture in the middle. Optionally adds etched shapes (e.g. wooden lattice) to
   each frame piece — passed as window-local shapes that get scaled to the
   visible aperture and offset to each piece's position on the sheet. */
export function layoutSingleApFrames(id, count, outerW, outerH, innerW, innerH, material, description, etchShapes) {
  const gutter = 5;
  const cols = Math.min(count, Math.max(4, Math.floor((250 - gutter) / (outerW + gutter))));
  const rows = Math.ceil(count / cols);
  const sheetW = cols * (outerW + gutter) + gutter;
  const sheetH = rows * (outerH + gutter) + gutter;
  const rects = [];
  const lines = [];
  // Helper to push one tile's content (outer + inner rects, plus optional
  // etched lattice shapes) at the given top-left coords. Returning both the
  // tiled sheet and a single-tile preview geometry means the UI can show
  // one copy + "Cut ×N" while the downloaded SVG keeps every tile inline.
  function pushTile(ox, oy, outRects, outLines) {
    outRects.push({ type: 'cut', x: ox, y: oy, w: outerW, h: outerH, compensateKerf: false });
    const ix = ox + (outerW - innerW) / 2;
    const iy = oy + (outerH - innerH) / 2;
    outRects.push({ type: 'cut', x: ix, y: iy, w: innerW, h: innerH, compensateKerf: false });
    if (etchShapes && etchShapes.length) {
      for (const sh of etchShapes) {
        if (sh.type === 'line') {
          outLines.push({
            type: 'etch',
            x1: ix + sh.x1, y1: iy + sh.y1,
            x2: ix + sh.x2, y2: iy + sh.y2,
          });
        } else if (sh.type === 'rect') {
          const rx1 = ix + sh.x,        ry1 = iy + sh.y;
          const rx2 = ix + sh.x + sh.w, ry2 = iy + sh.y + sh.h;
          outLines.push({ type: 'etch', x1: rx1, y1: ry1, x2: rx2, y2: ry1 });
          outLines.push({ type: 'etch', x1: rx2, y1: ry1, x2: rx2, y2: ry2 });
          outLines.push({ type: 'etch', x1: rx2, y1: ry2, x2: rx1, y2: ry2 });
          outLines.push({ type: 'etch', x1: rx1, y1: ry2, x2: rx1, y2: ry1 });
        }
      }
    }
  }
  for (let i = 0; i < count; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const ox = gutter + c * (outerW + gutter);
    const oy = gutter + r * (outerH + gutter);
    pushTile(ox, oy, rects, lines);
  }
  // Build the single-tile preview geometry separately with the tile's
  // local origin at (0,0).
  const tileRects = [];
  const tileLines = [];
  pushTile(0, 0, tileRects, tileLines);
  const tileGeom = {
    bboxW: outerW, bboxH: outerH,
    bboxOffsetX: 0, bboxOffsetY: 0,
    paths: [], rects: tileRects, lines: tileLines,
  };
  return {
    id: id, name: description, material: material,
    bboxW: sheetW, bboxH: sheetH,
    bboxOffsetX: 0, bboxOffsetY: 0,
    paths: [], rects: rects, lines: lines,
    tileCount: count,
    tileGeom: tileGeom,
  };
}

export function layoutPanes(id, count, w, h, material, description) {
  // Lay out 'count' rectangles in a grid with 5mm gutter
  const gutter = 5;
  const cols = Math.min(count, Math.max(4, Math.floor((250 - gutter) / (w + gutter))));
  const rows = Math.ceil(count / cols);
  const sheetW = cols * (w + gutter) + gutter;
  const sheetH = rows * (h + gutter) + gutter;
  const rects = [];
  for (let i = 0; i < count; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    rects.push({
      type: 'cut',
      x: gutter + c * (w + gutter),
      y: gutter + r * (h + gutter),
      w: w, h: h,
      compensateKerf: false,
    });
  }
  // Single-tile preview geometry: the UI shows just one copy + a count
  // badge so identical multi-pane sheets read the same as wall panels that
  // already have a "Cut ×N" note. The downloaded SVG keeps the tiled
  // layout above for one-pass laser cutting.
  const tileGeom = {
    bboxW: w, bboxH: h,
    bboxOffsetX: 0, bboxOffsetY: 0,
    paths: [],
    rects: [{ type: 'cut', x: 0, y: 0, w: w, h: h, compensateKerf: false }],
    lines: [],
  };
  return {
    id: id,
    name: description,
    material: material,
    bboxW: sheetW, bboxH: sheetH,
    bboxOffsetX: 0, bboxOffsetY: 0,
    paths: [],
    rects: rects,
    lines: [],
    tileCount: count,
    tileGeom: tileGeom,
  };
}
