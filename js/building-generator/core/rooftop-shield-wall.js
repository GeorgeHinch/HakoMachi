/* =====================================================================
   ROOFTOP SHIELD WALL  (Japanese 囲い / kakoui / parapet screen)
   A low wall around the rooftop perimeter that hides equipment.
   Styles: 'solid' (plain panels), 'louvered' (horizontal slat cuts), 'lattice'.
   Generates 4 wall panels (front/back/east/west) sized to the roof perimeter.
   ===================================================================== */
export function generateRooftopShieldParts(cfg, plan, parts) {
  if (!cfg.rooftopShield || !cfg.rooftopShield.enabled) return [];
  const { height = 8 } = cfg.rooftopShield;
  const matT = cfg.coreThickness || 1.5;
  const cT = cfg.claddingThickness || 0.28;

  // Resolve the shield outline's bounding rect (in iw-coords). This is
  // either the user-dragged bounds or an offset-based inset by default.
  const bounds = getShieldBounds(cfg, plan);
  const shW = bounds.w;   // F/B wall length
  const shD = bounds.h;   // E/W wall length

  // Always X-braced structural cores + louvered cladding now — the old
  // solid/louvered/lattice styles were removed since the X-brace design
  // is the only one that produces a real structural part with corner
  // joinery and matching roof slots.
  return generateBracedShieldParts(cfg, plan, parts, { height, bounds, matT, cT, shW, shD });
}

/* Braced shield wall: tiled X-brace structural core (1.5 mm strips forming
 * an outer frame with diagonal cross-brace in each bay) + bottom tongues
 * that key into matching slots cut in the roof core + corner tongue/slot
 * joinery between F/B walls (tongues at ends) and E/W walls (matching
 * openings) + a separate cladding layer with scaling louvers. The bay
 * width auto-fits the wall length so adjacent bays meet cleanly and the
 * count is approximately `target_width` mm per bay (default 12).
 */
export function generateBracedShieldParts(cfg, plan, parts, ctx) {
  const { height, offset, matT, cT, shW, shD } = ctx;
  // Target *interior* (visible) width of a single bay's X-brace area.
  // Each bay sits between two shared vertical columns (matT thick), so
  // a wall of length wLen lays out as (N+1) columns + N bay interiors:
  //   wLen = (N+1)*matT + N*interior
  // We pick N so `interior` lands near this target, keeping the bays
  // roughly square (~10 mm wide × ~5 mm tall on an 8 mm wall).
  const bayTargetInterior = 10;

  function computeBays(len) {
    // Solve N from wLen = (N+1)*matT + N*interior ≈ (N+1)*matT + N*target
    //   wLen - matT ≈ N * (matT + target)
    //   N ≈ (wLen - matT) / (matT + target)
    const N = Math.max(1, Math.round((len - matT) / (matT + bayTargetInterior)));
    const interior = (len - (N + 1) * matT) / N;
    // stride = column-left-edge to next column-left-edge (matT + interior).
    // Useful for placing both the bottom tongues and the bays.
    return { N, interior, stride: matT + interior };
  }

  // Cut paths for the X-brace pattern inside one bay. Four triangular
  // cutouts between the bay's inner-frame rectangle (= top/bottom outer
  // frame + the two shared columns flanking this bay) and the diagonal
  // cross-brace. Geometry is derived by offsetting each diagonal's
  // centreline by braceT/2 perpendicular to its direction. braceT is
  // independent of matT — the diagonals are usually thinner than the
  // outer frame so the X-brace reads as a delicate structural element.
  const braceT = (typeof cfg.rooftopShield.braceThickness === 'number')
                 ? cfg.rooftopShield.braceThickness
                 : 0.7;
  function bracedBayCuts(interiorL, interior, h) {
    const hw = braceT / 2;
    // The bay's clear interior, bounded by shared columns on left/right
    // and the top/bottom outer frame above/below.
    const innerL = interiorL;
    const innerR = interiorL + interior;
    const innerT = matT;
    const innerB = h - matT;
    const dx = innerR - innerL;
    const dy = innerB - innerT;
    if (dx <= 0 || dy <= 0) return [];
    const L = Math.hypot(dx, dy);
    // xOff/yOff = where each diagonal strip's outer edge meets the inner
    // frame. apexX/apexY = how far the opposing strips' inner edges meet
    // before reaching the bay centre (the "tip" of each triangular cutout).
    const xOff   = hw * L / dy;
    const yOff   = hw * L / dx;
    const apexY  = hw * L / dx;
    const apexX  = hw * L / dy;
    // Degenerate: strips too thick to fit inside the bay
    if (xOff > dx / 2 || yOff > dy / 2) return [];

    const cx = (innerL + innerR) / 2;
    const cy = (innerT + innerB) / 2;
    const tri = (a, b, c) =>
      `M ${a[0]},${a[1]} L ${b[0]},${b[1]} L ${c[0]},${c[1]} Z`;

    return [
      // top, bottom, left, right triangular cutouts
      { type: 'cut', d: tri([innerL + xOff, innerT], [innerR - xOff, innerT], [cx, cy - apexY]) },
      { type: 'cut', d: tri([innerL + xOff, innerB], [innerR - xOff, innerB], [cx, cy + apexY]) },
      { type: 'cut', d: tri([innerL, innerT + yOff], [innerL, innerB - yOff], [cx - apexX, cy]) },
      { type: 'cut', d: tri([innerR, innerT + yOff], [innerR, innerB - yOff], [cx + apexX, cy]) },
    ];
  }

  // Compute tongue positions along the bottom edge — one at each shared
  // vertical column (N+1 tongues for N bays). Each is matT wide and sits
  // exactly under its column, so the column transmits load straight down
  // into the roof slot.
  function bottomTonguesFor(N, stride, wLen) {
    const tongues = [];
    for (let i = 0; i <= N; i++) {
      const startX = i * stride;
      tongues.push({ start: startX, end: startX + matT });
    }
    return tongues;
  }

  // Build the structural core panel for one shield wall segment. The
  // leftAtCorner / rightAtCorner flags say whether each end touches a
  // building corner — only those ends get a corner-joinery tongue (for
  // F/B walls) or matching opening (for E/W walls). Internal ends
  // (terminating at an opening, or where the wall has been resized
  // shorter than the corner-to-corner distance) terminate cleanly.
  // Vertical corner-joint position: centred on the wall height —
  // keeps it clear of the bottom-tab row and the top decorative edge.
  function buildShieldWallPart(id, name, wLen, info, isFB, leftAtCorner, rightAtCorner) {
    const { N, interior, stride } = info;
    const bottomTongues = bottomTonguesFor(N, stride, wLen);

    const corner = { start: height / 2 - matT / 2, end: height / 2 + matT / 2 };
    const leftTongues   = (isFB  && leftAtCorner)  ? [corner] : [];
    const leftOpenings  = (!isFB && leftAtCorner)  ? [corner] : [];
    const rightTongues  = (isFB  && rightAtCorner) ? [corner] : [];
    const rightOpenings = (!isFB && rightAtCorner) ? [corner] : [];

    const spec = {
      width: wLen,
      height,
      matT,
      kerf: cfg.kerfComp || 0,
      edges: {
        top:    { tongues: [], openings: [] },
        right:  { tongues: rightTongues, openings: rightOpenings },
        bottom: { tongues: bottomTongues, openings: [] },
        left:   { tongues: leftTongues, openings: leftOpenings },
      },
    };
    const outline = buildWallPath(spec);

    // X-brace cutouts (one set per bay) — generated in panel-local coords
    // (x=0 at the wall's left main-panel edge, y=0 at top). Each bay's
    // interior left edge is at i*stride + matT (right after column i),
    // and the interior is `interior` wide. The outline path's tongues
    // extend past x=0/x=wLen and below y=height, but the cutouts stay
    // inside the panel's main rectangle.
    const bayCuts = [];
    for (let i = 0; i < N; i++) {
      bayCuts.push(...bracedBayCuts(i * stride + matT, interior, height));
    }

    // bbox grows on the left only if leftAtCorner+isFB (left tongue),
    // and on the right similarly. bboxOffsetX accounts for the left
    // extension so the part's (0,0) lands at the main-panel west edge.
    const leftExt  = (isFB && leftAtCorner)  ? matT : 0;
    const rightExt = (isFB && rightAtCorner) ? matT : 0;
    return {
      id, name, material: 'core',
      bboxW: wLen + leftExt + rightExt,
      bboxH: height + matT,
      bboxOffsetX: leftExt,
      bboxOffsetY: 0,
      paths: [{ type: 'cut', d: outline }, ...bayCuts],
      rects: [], lines: [],
    };
  }

  // Louvered cladding panel — separate 0.28 mm part that glues to the
  // outside face of the core. Louver count scales with the wall height
  // (mirroring vent_louvered's algorithm exactly: 0.6 mm target pitch,
  // 0.5 mm top/bottom margin). Width follows the wall length, so wider
  // walls just get longer louvers, same count.
  function makeLouverCladding(id, name, wLen) {
    const margin = 0.5;
    const targetPitch = 0.6;
    const usable = Math.max(0, height - 2 * margin);
    const count = Math.max(2, Math.round(usable / targetPitch) + 1);
    const pitch = count > 1 ? usable / (count - 1) : 0;
    const lines = [];
    for (let i = 0; i < count; i++) {
      const y = margin + i * pitch;
      lines.push({ type: 'etch', x1: 0.5, y1: y, x2: wLen - 0.5, y2: y });
    }
    return {
      id, name, material: 'cladding',
      bboxW: wLen, bboxH: height, bboxOffsetX: 0, bboxOffsetY: 0,
      paths: [{ type: 'cut', d: rectPath(0, 0, wLen, height) }],
      rects: [], lines,
    };
  }

  const fbInfoFull = computeBays(shW);
  const ewInfoFull = computeBays(shD);

  // Cut slots into the roof core to receive the bottom tongues. Slots
  // are placed in build-frame coords (matching where each shield wall
  // sits on the roof), then translated into the roof part's local frame
  // by subtracting the roof's bbox origin. The roof part is generated
  // earlier by generateRoof and lives in `parts` — we mutate its `rects`
  // array to add the slot cuts in-place.
  const edges = (cfg.rooftopShield.edges) || { front: true, back: true, east: true, west: true };
  if (parts) {
    addShieldRoofSlots(cfg, plan, parts, edges, ctx);
  }

  // Each side may produce 0, 1, or 2 wall segments (resize + opening
  // splits the wall in two). Bay count for each segment is computed
  // from its own length so the X-brace pattern stays roughly square
  // regardless of segment size.
  const out = [];
  function emitFor(side, edgeLen, isFB) {
    const segs = shieldEdgeSegments(edges[side], edgeLen);
    if (!segs.length) return;
    const suffix = isFB ? ['_west', '_east'] : ['_front', '_back'];
    segs.forEach((s, i) => {
      const segLen = s.end - s.start;
      const info = computeBays(segLen);
      const baseId = 'shield_' + side + (segs.length > 1 ? suffix[i] : '');
      const baseName = 'Shield wall — ' + side
        + (segs.length > 1 ? ' (' + suffix[i].slice(1) + ' segment)' : '');
      out.push(buildShieldWallPart(baseId, baseName, segLen, info, isFB, s.leftAtCorner, s.rightAtCorner));
      const cladId = 'shield_cladding_' + side + (segs.length > 1 ? suffix[i] : '');
      const cladName = 'Shield cladding — ' + side
        + (segs.length > 1 ? ' (' + suffix[i].slice(1) + ' segment)' : '');
      out.push(makeLouverCladding(cladId, cladName, segLen));
    });
  }
  emitFor('front', shW, true);
  emitFor('back',  shW, true);
  emitFor('east',  shD, false);
  emitFor('west',  shD, false);
  return out;
}

/* Add slot cuts to the roof core panel for the braced shield wall's
 * bottom tongues. Looks up the roof part by id (parapet/flat → 'roof',
 * slanted → 'roof', gabled → 'roof_slope0'/'roof_slope1'; for slanted
 * and gabled the shield wall doesn't really make sense, so we just
 * skip in those cases — leaving the tongues unmated, which is fine as
 * they can be trimmed or glued flat).
 *
 * Slot positions in build frame:
 *   F shield: z = offset, spans x = [matT+offset, matT+offset+shW]
 *   B shield: z = sideLen+matT-offset, x = same range
 *   E shield: x = fbWidth-matT-offset, z = [offset, offset+shD]
 *   W shield: x = matT+offset, z = same range
 * Bottom tongues live along the wall's bottom edge at tongue positions
 * computed by bottomTonguesFor. Translate each tongue's wall-local x
 * into build-frame x (or z), then into the roof part's local frame.
 */
export function addShieldRoofSlots(cfg, plan, parts, edges, ctx) {
  const { height, bounds, matT, cT, shW, shD } = ctx;
  // Find the roof core — parapet/flat have a single 'roof' part with
  // local coords starting at (0,0) at the front-west corner. Slanted
  // and gabled are uncommon use-cases for shield walls and we leave
  // those alone (no slots cut — the tongues can be trimmed off).
  const roofPart = parts.find(p => p.id === 'roof');
  if (!roofPart) return;
  if (cfg.roofStyle !== 'parapet' && cfg.roofStyle !== 'flat' && cfg.roofStyle !== 'flat_overhang') return;

  // Roof-local coord conversion. iw-coords ARE roof-local for parapet
  // (both start at the inside-west / inside-south wall faces). For flat
  // the core IS the building's footprint (no extension), so iw_x=0
  // (inside-west face, at build_x=matT) maps to roof-local x = matT.
  // For flat_overhang the core extends past every wall by `O` mm, so
  // iw_x=0 maps to roof-local x = matT + O.
  const isParapet = cfg.roofStyle === 'parapet';
  const overhangPx = (cfg.roofStyle === 'flat_overhang')
    ? Math.max(0, cfg.roofOverhang || 5)
    : 0;
  const iwToLocalX = (ix) => isParapet ? ix : (ix + matT + overhangPx);
  const iwToLocalY = (iy) => isParapet ? iy : (iy + matT + overhangPx);

  // Wall-local bottom tongue positions for a single segment of length
  // wLen. Mirrors bottomTonguesFor / computeBays from the braced
  // generator — duplicated here for locality, so the slot positions
  // are obvious from this function alone. KEEP IN SYNC with those.
  function bottomTongues(wLen) {
    const bayTargetInterior = 10;
    const N = Math.max(1, Math.round((wLen - matT) / (matT + bayTargetInterior)));
    const interior = (wLen - (N + 1) * matT) / N;
    const stride = matT + interior;
    const tongues = [];
    for (let i = 0; i <= N; i++) {
      tongues.push({ start: i * stride, end: i * stride + matT });
    }
    return tongues;
  }

  // For each side, compute segments and cut a slot per tongue. Walls
  // sit along the bounds rectangle's perimeter:
  //   front: iw_y range [bounds.y, bounds.y + matT], iw_x along [bounds.x, bounds.x+bounds.w]
  //   back:  iw_y range [bounds.y+bounds.h-matT, bounds.y+bounds.h]
  //   west:  iw_x range [bounds.x, bounds.x + matT], iw_y along [bounds.y, bounds.y+bounds.h]
  //   east:  iw_x range [bounds.x+bounds.w-matT, bounds.x+bounds.w]
  function cutSlotsForSide(side, edgeLen) {
    const segs = shieldEdgeSegments(edges[side], edgeLen);
    if (!segs.length) return;
    for (const seg of segs) {
      const segLen = seg.end - seg.start;
      const tongues = bottomTongues(segLen);
      for (const t of tongues) {
        const edgePos0 = seg.start + t.start;
        const edgePos1 = seg.start + t.end;
        let x, y, w, h;
        if (side === 'front') {
          x = iwToLocalX(bounds.x + edgePos0);
          y = iwToLocalY(bounds.y);
          w = edgePos1 - edgePos0; h = matT;
        } else if (side === 'back') {
          x = iwToLocalX(bounds.x + edgePos0);
          y = iwToLocalY(bounds.y + bounds.h - matT);
          w = edgePos1 - edgePos0; h = matT;
        } else if (side === 'west') {
          x = iwToLocalX(bounds.x);
          y = iwToLocalY(bounds.y + edgePos0);
          w = matT; h = edgePos1 - edgePos0;
        } else {
          x = iwToLocalX(bounds.x + bounds.w - matT);
          y = iwToLocalY(bounds.y + edgePos0);
          w = matT; h = edgePos1 - edgePos0;
        }
        roofPart.rects.push({ type: 'cut', x, y, w, h, compensateKerf: false });
      }
    }
  }

  cutSlotsForSide('front', shW);
  cutSlotsForSide('back',  shW);
  cutSlotsForSide('west',  shD);
  cutSlotsForSide('east',  shD);
}


/* Generate horizontal trim strips. Returns an array of parts. */
export function generateTrimStrips(cfg, plan, parts) {
  if (!cfg.trimTop && !cfg.trimBottom && !cfg.trimBelt) return [];
  const cT = cfg.claddingThickness;
  const trimH = cfg.trimHeight || 2;
  const overhang = (cfg.trimOverhang != null) ? cfg.trimOverhang : cT;

  // Wall dimensions
  const fbWidth = plan.fbWidth;
  const sideLen = plan.sideLen;
  const H = plan.H;
  // Floor boundary (wall-Y) — used to position the belt course centred on
  // the join between ground and upper floors.
  const boundaryY = (plan.firstFloorHeight && plan.firstFloorHeight > 0)
    ? (H - plan.firstFloorHeight)
    : (H / 2);

  // Trim band Y ranges in WALL coords (y=0 at top, y=H at bottom)
  const topBandY  = cfg.trimTop    ? [0, trimH]                                  : null;
  const beltBandY = cfg.trimBelt   ? [boundaryY - trimH / 2, boundaryY + trimH / 2] : null;
  const botBandY  = cfg.trimBottom ? [H - trimH, H]                              : null;
  const bandsToEmit = [];
  if (topBandY)  bandsToEmit.push({ name: 'top',    yRange: topBandY  });
  if (beltBandY) bandsToEmit.push({ name: 'belt',   yRange: beltBandY });
  if (botBandY)  bandsToEmit.push({ name: 'bottom', yRange: botBandY  });

  // Strip widths per wall family.
  // The side cladding is `sideLen + 2·matT` wide (the side wall body PLUS
  // the front and back wall thicknesses on each end — see generateCladdingPanel
  // for side walls, which extends the cladding past the wall body by matT on
  // each side to wrap the corner cleanly). The side trim has to match this so
  // it spans the full visible side face; otherwise the strip cuts come out
  // short and a 2·matT + 2·cT strip of bare wall is left exposed at each
  // corner. (Earlier this used `sideLen − 2·cT`, which was an outdated
  // assumption based on the side cladding being inset by cT rather than
  // extended by matT.)
  const matT = cfg.coreThickness;
  const fbCladW = fbWidth + 2 * cT;
  const sideCladW = sideLen + 2 * matT;
  const fbStripW = fbCladW + 2 * overhang;
  const sideStripW = sideCladW;

  // For F/B strips: trim-X = wall-X + cT + overhang (trim's x=0 is
  //   `overhang` past the cladding wrap, which itself is cT past the wall).
  // For SIDE strips: side cladding spans wall-X = [−matT, sideLen + matT],
  //   matching the trim's [0, sideLen + 2·matT].
  //     West  → trim-X = wall-X + matT     (direct shift)
  //     East  → trim-X = (sideLen + matT) − wall-X     (mirrored, like the
  //                                                     east cladding panel)
  function notchesForWall(wallKey, yRange) {
    // Gather all opening rects from this wall's cladding panel(s)
    const wallPanels = (parts || []).filter(p =>
      p.wallKey === wallKey && Array.isArray(p.wallOpenings));
    const ops = [];
    for (const p of wallPanels) {
      for (const o of p.wallOpenings) {
        // Y-range overlap check (the opening must intersect the trim band)
        if (o.y + o.h <= yRange[0]) continue;
        if (o.y >= yRange[1]) continue;
        ops.push(o);
      }
    }
    // Manual cladding-overrides cut the cladding too — treat them as notches.
    const ovs = surfaceWallFeaturesForFace(cfg, wallKey, 'cladding_override');
    for (const ov of ovs) {
      if (ov.y + ov.h <= yRange[0]) continue;
      if (ov.y >= yRange[1]) continue;
      ops.push({ x: ov.x, y: ov.y, w: ov.w, h: ov.h, kind: 'override' });
    }
    // Filled-blanked windows in manual (no cladding panel may cover their band
    // if the panel is the wrong band — wallOpenings above already catches the
    // panel where they appear, so nothing extra needed for them here).
    // Convert each opening's wall-X to trim-strip-X and clamp to strip bounds.
    const isFB = (wallKey === 'front' || wallKey === 'back');
    const stripW = isFB ? fbStripW : sideStripW;
    const notches = [];
    for (const o of ops) {
      let trimX, trimXEnd;
      if (isFB) {
        trimX    = o.x + cT + overhang;
        trimXEnd = o.x + o.w + cT + overhang;
      } else if (wallKey === 'west') {
        trimX    = o.x + matT;
        trimXEnd = o.x + o.w + matT;
      } else { // east — mirror around (sideLen + matT) to match east cladding
        trimX    = (sideLen + matT) - (o.x + o.w);
        trimXEnd = (sideLen + matT) - o.x;
      }
      // Clamp to strip bounds — openings beyond strip extent are ignored
      const x0 = Math.max(0, trimX);
      const x1 = Math.min(stripW, trimXEnd);
      if (x1 > x0) notches.push({ x0, x1 });
    }
    // Sort + merge overlapping notches (e.g. two adjacent doors with no gap)
    notches.sort((a, b) => a.x0 - b.x0);
    const merged = [];
    for (const n of notches) {
      const last = merged[merged.length - 1];
      if (last && n.x0 <= last.x1 + 0.05) {
        last.x1 = Math.max(last.x1, n.x1);
      } else {
        merged.push({ ...n });
      }
    }
    return merged;
  }

  // For each wall × band, build a list of strip segments (trim rect cuts
  // separated by notches). If a single opening would split the strip in
  // two, that produces two segments.
  function segmentsForStrip(wallKey, bandYRange) {
    const isFB = (wallKey === 'front' || wallKey === 'back');
    const stripW = isFB ? fbStripW : sideStripW;
    const notches = notchesForWall(wallKey, bandYRange);
    const segments = [];
    let cursor = 0;
    for (const n of notches) {
      if (n.x0 > cursor + 0.05) {
        segments.push({ x0: cursor, x1: n.x0 });
      }
      cursor = Math.max(cursor, n.x1);
    }
    if (cursor < stripW - 0.05) {
      segments.push({ x0: cursor, x1: stripW });
    }
    return segments;
  }

  // Lay out all segments on a single sheet, row by row, with gutters.
  const gutter = 5;
  const rects = [];
  const sheetSegments = [];   // {x0, x1, wall, band, yRange}
  for (const band of bandsToEmit) {
    for (const wallKey of ['front', 'back', 'east', 'west']) {
      const segs = segmentsForStrip(wallKey, band.yRange);
      for (const s of segs) sheetSegments.push({ ...s, wall: wallKey, band: band.name, yRange: band.yRange });
    }
  }

  if (sheetSegments.length === 0) return [];

  let sheetW = 0;
  let sheetY = gutter;
  for (const s of sheetSegments) {
    const w = s.x1 - s.x0;
    rects.push({ type: 'cut', x: gutter, y: sheetY, w, h: trimH, compensateKerf: false });
    sheetW = Math.max(sheetW, gutter + w + gutter);
    sheetY += trimH + gutter;
  }

  // ---- Etch a "glue here" outline on the cladding panels ----
  // For each segment, find which cladding panel(s) it touches and add
  // dashed etched lines on those panels showing the segment's footprint.
  // Trim-strip coords -> cladding-frame coords:
  //   F/B: cladding-X = trim-X − overhang     (F/B trim has overhang past
  //                                            the F/B cladding's wrap)
  //   Side: cladding-X = trim-X                (side trim and side cladding
  //                                            are exactly the same width and
  //                                            both share the same x=0 origin,
  //                                            and the east mirror is already
  //                                            baked into the trim-X math, so
  //                                            no extra transform here)
  for (const seg of sheetSegments) {
    const wallKey = seg.wall;
    const segW = seg.x1 - seg.x0;
    // Find this wall's cladding panel(s) that intersect this band's Y range.
    const wallPanels = (parts || []).filter(p =>
      p.wallKey === wallKey && Array.isArray(p.wallOpenings));
    for (const panel of wallPanels) {
      const panelY0 = panel.panelYStart || 0;
      const panelY1 = panelY0 + panel.bboxH - (panel.bboxOffsetY || 0);
      // Y overlap?
      const overlapY0 = Math.max(seg.yRange[0], panelY0);
      const overlapY1 = Math.min(seg.yRange[1], panelY1);
      if (overlapY1 <= overlapY0) continue;
      // Convert wall-Y to PANEL-LOCAL Y
      const py0 = overlapY0 - panelY0;
      const py1 = overlapY1 - panelY0;
      // Convert trim-strip X to cladding-panel X
      let cx0, cx1;
      if (wallKey === 'front' || wallKey === 'back') {
        cx0 = seg.x0 - overhang;
        cx1 = seg.x1 - overhang;
      } else {
        // West and east — direct copy. Trim-X already shares the panel's
        // local-X origin (panel.x=0 is the front edge of the side cladding;
        // trim.x=0 is the same physical point). For east the mirror is
        // already applied during notch generation (`(sideLen + matT) − …`),
        // so the segments produced here are already in the panel's mirrored
        // frame and don't need another mirror.
        cx0 = seg.x0;
        cx1 = seg.x1;
      }
      // Clamp to panel X bounds (segments at the strip ends with overhang
      // would extend past the cladding edges — those parts have nothing to
      // glue to, so we just don't etch them).
      const pcx0 = Math.max(0, cx0);
      const pcx1 = Math.min(panel.bboxW, cx1);
      if (pcx1 <= pcx0) continue;
      // Emit the outline as 4 etched line segments. Using lines (not a path)
      // keeps it compatible with existing renderer + laser pipelines that
      // already treat lines as etch.
      panel.lines.push({ type: 'etch', x1: pcx0, y1: py0, x2: pcx1, y2: py0 });
      panel.lines.push({ type: 'etch', x1: pcx1, y1: py0, x2: pcx1, y2: py1 });
      panel.lines.push({ type: 'etch', x1: pcx1, y1: py1, x2: pcx0, y2: py1 });
      panel.lines.push({ type: 'etch', x1: pcx0, y1: py1, x2: pcx0, y2: py0 });
    }
  }

  // Summary
  const bandsDesc = bandsToEmit.map(b => b.name).join(' + ') + ' trim';
  const totalNotches = sheetSegments.length - bandsToEmit.length * 4;  // 4 walls per band
  const notchNote = totalNotches > 0 ? ` (${totalNotches} extra segment${totalNotches === 1 ? '' : 's'} from door/window notches)` : '';

  return [{
    id: 'trim_strips',
    name: `Trim strips — ${bandsDesc}: ${sheetSegments.length} pieces${notchNote}`,
    material: 'cladding',
    bboxW: sheetW, bboxH: sheetY,
    bboxOffsetX: 0, bboxOffsetY: 0,
    paths: [], rects: rects, lines: [],
    assemblyNote: 'Glue around the building at the marked outlines on each cladding panel. Notched segments fit between doors and other openings.',
  }];
}

/* Corner trim — four narrow vertical strips that wrap each building corner.
 *
 * Each strip is 3 mm wide with an etched fold line down the centre at
 * x = 1.5 mm, so the user can score-and-fold along the centre and glue
 * 1.5 mm of cladding-thickness material to each adjacent face. Strips
 * are sized to match each corner's own height — for parapet, flat, and
 * gabled roofs that's `plan.H` on all four corners; for a slanted roof
 * the high-side corners pick up the pitch (+`cfg.roofPitch` mm) and the
 * low-side corners stay at `plan.H`. Wall corners on a gabled roof are
 * always at the eave height (`plan.H`) because the ridge peaks lie in
 * the middle of two walls rather than at a corner.
 *
 * The four strips are laid out horizontally on a single laser sheet
 * (left → right = NE, NW, SE, SW) so the user can identify which strip
 * goes to which corner by position (and by height, for slanted roofs).
 */
export function generateCornerTrim(cfg, plan) {
  if (!cfg.cornerTrim) return [];

  const baseH = plan.H;
  const pitch = cfg.roofPitch || 0;
  const slopeDir = cfg.roofSlopeDirection || 'back';

  function cornerHeight(corner /* 'ne' | 'nw' | 'se' | 'sw' */) {
    if (cfg.roofStyle !== 'slanted') return baseH;
    // slanted roof — exactly two of the four corners are at the high end
    // (slopeDir names the high side). Other roof styles either have all
    // corners equal (parapet, flat, gabled with corners at eave) or the
    // pitch only affects the middle of the wall (gabled peak isn't at
    // a corner), so they all use baseH.
    const isHighCorner =
      (slopeDir === 'back'  && corner.startsWith('n')) ||   // ne, nw  ←  back-high
      (slopeDir === 'front' && corner.startsWith('s')) ||   // se, sw  ←  front-high
      (slopeDir === 'east'  && corner.endsWith('e'))   ||   // ne, se  ←  east-high
      (slopeDir === 'west'  && corner.endsWith('w'));       // nw, sw  ←  west-high
    return baseH + (isHighCorner ? pitch : 0);
  }

  const corners = ['ne', 'nw', 'se', 'sw'];
  const heights = corners.map(cornerHeight);

  // Sheet layout — horizontal stack with 5 mm gutters. Strips are 3 mm wide
  // (1.5 mm + 1.5 mm) so a row of 4 strips is only 4×3 + 5×5 = 37 mm wide
  // even on a tall building, which fits any reasonable laser sheet.
  const stripW = 3.0;     // 1.5 mm each side of the fold
  const foldX  = 1.5;     // centre of the strip — fold line position
  const gutter = 5;
  const maxH   = Math.max(...heights);

  const rects = [];
  const lines = [];
  let x = gutter;
  corners.forEach((cornerName, i) => {
    const h = heights[i];
    // Cut rectangle for the strip
    rects.push({ type: 'cut', x, y: gutter, w: stripW, h, compensateKerf: false });
    // Etched fold line — full height of the strip
    lines.push({ type: 'etch', x1: x + foldX, y1: gutter, x2: x + foldX, y2: gutter + h });
    x += stripW + gutter;
  });

  // Per-corner height summary in the part name so the user can spot at a
  // glance which strip is which (especially handy for slanted roofs where
  // adjacent strips have different heights).
  const heightsLbl = corners.map((c, i) => `${c.toUpperCase()} ${heights[i].toFixed(1)}`).join(' · ');

  return [{
    id: 'corner_trim',
    name: `Corner trim — 4 strips, 3 mm wide (${heightsLbl} mm)`,
    material: 'cladding',
    bboxW: x, bboxH: maxH + 2 * gutter,
    bboxOffsetX: 0, bboxOffsetY: 0,
    paths: [], rects, lines,
    assemblyNote: 'Score along the etched centre line of each strip, fold 90°, and glue 1.5 mm to each cladding face that meets at the corner. Strips are laid out left → right as NE · NW · SE · SW (back-east, back-west, front-east, front-west).',
  }];
}
