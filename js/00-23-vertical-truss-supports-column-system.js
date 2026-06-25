'use strict';

/* ===========================================================================
 * VERTICAL TRUSS SUPPORTS (column system)
 *
 * Each truss bearing point gets a vertical support column running
 * floor-to-eave along the wall. Two cross-sections are available:
 * I-beam = back flange + web + end cap; T-beam = back flange + web only.
 *
 *           ╔══════╗              ← back flange (against wall, slotted)
 *           ║  []  ║   ←matT       slot accepts web's inner tabs
 *           ║      ║
 *           ║  []  ║
 *           ║      ║
 *           ║  []  ║
 *           ╚══════╝
 *               ║              ── web sticks out perpendicular to wall
 *               ║              ── tabs on both edges feed into back+cap slots
 *               ║
 *           ╔══════╗              ← end cap (parallel to wall, slotted, identical to back)
 *           ║      ║
 *           ║      ║
 *           ╚══════╝
 *
 * Cross-section viewed from above (the I-beam look):
 *
 *   wall ══════════════ ← back flange glued flat to wall
 *           │
 *           │ web (perpendicular)
 *           │
 *        ──────         ← end cap (parallel to wall, webDepth out)
 *
 * Two columns per truss (one per bearing wall). All pieces are cut
 * from core material so they slot together with kerf-tight tabs at
 * the same thickness as everything else. Heights honour parapets:
 * the column tops at eave level (H - parapetH), not the parapet top,
 * so the truss sits where it should.
 *
 * The matching FLOOR ETCHINGS are emitted as part of the same call —
 * one small footprint rectangle per column on the main floor, marking
 * where the user should glue each column at assembly time.
 * =========================================================================== */

/** A flat flange/cap piece: rectangle with N vertical slots cut into
 *  the middle to receive the web's tabs. Used for both the back-against-
 *  wall piece and the outer end cap; geometrically identical.
 *
 *  Optional `topNotch = { width, depth }` cuts an upward-opening rectangular
 *  notch at the top centre to receive a tab from the truss bottom chord.
 *  The notch is woven into the outer outline (not a separate hole) since
 *  it must be open at the top edge so the tab can drop in vertically.
 */
function generateColumnFlangePiece(H, flangeW, matT, slotPositions, slotLen, topNotch) {
  let paths;
  if (topNotch && topNotch.width > 0 && topNotch.depth > 0) {
    const nw = topNotch.width;
    const nd = topNotch.depth;
    const nx0 = (flangeW - nw) / 2;
    const nx1 = nx0 + nw;
    // Outline polygon with notch at top centre. Walk CCW (y-down):
    // start TL → walk right to notch left → down into notch → across
    // notch bottom → up out of notch → right to TR → down RH side →
    // across bottom → up LH side back to TL.
    const d = `M 0,0 L ${nx0},0 L ${nx0},${nd} L ${nx1},${nd} L ${nx1},0 L ${flangeW},0 L ${flangeW},${H} L 0,${H} Z`;
    paths = [{ type: 'cut', d }];
  } else {
    paths = [{ type: 'cut', d: rectPath(0, 0, flangeW, H) }];
  }
  const slotW = matT;
  const sx = (flangeW - slotW) / 2;
  for (const sy of slotPositions) {
    const sy0 = sy - slotLen / 2;
    paths.push({ type: 'cut', d: rectPath(sx, sy0, slotW, slotLen) });
  }
  return {
    paths,
    bboxW: flangeW,
    bboxH: H,
    bboxOffsetX: 0,
    bboxOffsetY: 0,
    rects: [],
    lines: [],
  };
}

/** The perpendicular web piece. Rectangle (webDepth × H) with matT-long
 *  tab extensions on both long edges at the same y-positions that the
 *  flange's slots use. Outline is a single closed polygon walked CCW
 *  in y-down coords. */
function generateColumnWebPiece(H, webDepth, matT, slotPositions, slotLen, outerTabs = true) {
  // Coordinate convention: the body of the web sits between x = matT
  // and x = matT + webDepth. Inner tabs jut to x = 0 and slot into the
  // back flange. For I-beams only, outer tabs also jut to
  // x = matT + webDepth + matT and slot into the end cap. T-beams omit
  // those outer tabs so the column has less depth.
  // Walk CCW (y-down).
  const xL  = matT;
  const xR  = matT + webDepth;
  const xTL = 0;            // left tab outer edge
  const xTR = outerTabs ? (matT + webDepth + matT) : xR;  // right tab outer edge
  const totalW = (outerTabs ? matT * 2 : matT) + webDepth;

  const sorted = [...slotPositions].sort((a, b) => a - b);

  const pts = [];
  // Top-left of body
  pts.push({ x: xL, y: 0 });
  // Across top to top-right
  pts.push({ x: xR, y: 0 });
  // Down right edge. I-beams get outer tabs; T-beams keep this edge plain.
  if (outerTabs) {
    for (const sy of sorted) {
      const ty0 = sy - slotLen / 2;
      const ty1 = sy + slotLen / 2;
      pts.push({ x: xR,  y: ty0 });
      pts.push({ x: xTR, y: ty0 });
      pts.push({ x: xTR, y: ty1 });
      pts.push({ x: xR,  y: ty1 });
    }
  }
  pts.push({ x: xR, y: H });
  // Across bottom to bottom-left
  pts.push({ x: xL, y: H });
  // Up left edge with inner tabs (reversed order so we walk bottom-to-top)
  for (let i = sorted.length - 1; i >= 0; i--) {
    const sy = sorted[i];
    const ty0 = sy + slotLen / 2;
    const ty1 = sy - slotLen / 2;
    pts.push({ x: xL,  y: ty0 });
    pts.push({ x: xTL, y: ty0 });
    pts.push({ x: xTL, y: ty1 });
    pts.push({ x: xL,  y: ty1 });
  }
  // Close: back to start

  let d = `M ${pts[0].x.toFixed(3)},${pts[0].y.toFixed(3)}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i].x.toFixed(3)},${pts[i].y.toFixed(3)}`;
  }
  d += ' Z';

  return {
    paths: [{ type: 'cut', d }],
    bboxW: totalW,
    bboxH: H,
    bboxOffsetX: 0,
    bboxOffsetY: 0,
    rects: [],
    lines: [],
  };
}

/** Generate all vertical support parts for one block. Returns
 *  { parts, etches } where etches is the floor-etching segments to be
 *  merged onto the floor part by the caller. */
function generateColumnSupportsForBlock(blockCfg, blockPlan, sfx, nameLbl, cropCtx) {
  const t = blockCfg.trusses;
  if (!t || !t.enabled || !t.supports) return { parts: [], etches: [] };

  const flangeW   = (t.supportFlangeW != null) ? t.supportFlangeW : 4;
  const webDepth  = (t.supportDepth   != null) ? t.supportDepth   : 4;
  const columnType = t.supportColumnType === 't' ? 't' : 'i';
  const isTBeam = columnType === 't';
  if (flangeW <= 0 || webDepth <= 0) return { parts: [], etches: [] };

  const matT      = blockPlan.matT || blockCfg.coreThickness || 1.5;
  const parapetH  = blockPlan.parapetH || 0;
  // Truss sits at eave level: H minus parapet for parapet roofs, the
  // full H for plain flat/gabled/slanted. The user may want a slightly
  // shorter column to leave room for the truss's own depth on top —
  // a manual override could be added later; for V1 this matches the
  // truss's reference y=0 to the column top.
  const colH = Math.max(5, blockPlan.H - parapetH);

  // Same positions as the truss generator (shared helper).
  const ridge = effectiveRidgeDir(blockCfg);
  const isGable = blockCfg.roofStyle === 'gabled' || blockCfg.roofStyle === 'parapet_gable';
  let axis = t.axis;
  if (!axis || (axis !== 'ns' && axis !== 'ew')) {
    axis = isGable
      ? (ridge === 'ew' ? 'ns' : 'ew')
      : (blockCfg.width >= blockCfg.depth ? 'ns' : 'ew');
  }
  const frame = trussInteriorFrame(blockCfg, blockPlan);
  const lengthAlong = axis === 'ns' ? frame.width : frame.depth;
  const spacing     = Math.max(5, t.spacing || 30);
  const positions   = trussSupportPositions(lengthAlong, spacing, flangeW / 2);

  // Slot positions on the flange/cap: 3 slots evenly along the height
  // (at H/6, H/2, 5H/6). Tab length = matT × 3 — long enough to grip
  // well without being so long that the flange feels weak between slots.
  const slotLen = Math.min(colH / 4, matT * 3);
  const slotPositions = [colH / 6, colH / 2, 5 * colH / 6];

  // Top notch: a rectangular cut at the top centre of the back flange
  // and the end cap. The truss bottom chord has matching downward tabs
  // at each bearing — the tab slides into this notch from above and
  // locks the truss in place horizontally without glue. Notch width =
  // matT (the truss material thickness, since the flange is perpendicular
  // to the truss plane and the tab passes through the flange's matT
  // thickness). Notch depth = tabDepth (the tab's vertical extent below
  // the chord). The same tabDepth value is passed to the truss generator
  // so the truss tab matches.
  const tabDepth = matT * 2;
  const topNotch = { width: matT, depth: tabDepth };

  // Pre-build one of each piece (every column shares geometry — the
  // dedup display will collapse them).
  function tagBack(part, label) {
    return { ...part, id: `col_back_${label}${sfx}`,
             name: `${nameLbl}Column ${isTBeam ? 'T-beam' : 'I-beam'} back flange — ${label}`,
             material: 'core' };
  }
  function tagWeb(part, label) {
    return { ...part, id: `col_web_${label}${sfx}`,
             name: `${nameLbl}Column ${isTBeam ? 'T-beam' : 'I-beam'} web — ${label}`,
             material: 'core' };
  }
  function tagCap(part, label) {
    return { ...part, id: `col_cap_${label}${sfx}`,
             name: `${nameLbl}Column I-beam end cap — ${label}`,
             material: 'core' };
  }

  // Bearing walls for the columns: trusses with axis 'ns' bridge from
  // front to back wall, so columns sit on front + back. Axis 'ew' →
  // columns on east + west.
  const bearingWalls = axis === 'ns' ? ['front', 'back'] : ['east', 'west'];

  const keptBearings = [];
  for (let i = 0; i < positions.length; i++) {
    for (const wall of bearingWalls) {
      if (columnBearingInsideLayoutCrop(blockCfg, axis, wall, positions[i], cropCtx, matT, frame)) {
        keptBearings.push({ i, pos: positions[i], wall });
      }
    }
  }

  // Generate parts — I-beam uses back/web/cap per bearing; T-beam uses
  // back/web only. All copies are geometrically identical and the parts
  // panel dedup collapses them into "Cut ×N copies".
  const parts = [];
  for (const kb of keptBearings) {
    const label = `truss ${kb.i + 1} ${kb.wall}`;
    parts.push(tagBack(generateColumnFlangePiece(colH, flangeW, matT, slotPositions, slotLen, topNotch), label));
    parts.push(tagWeb (generateColumnWebPiece   (colH, webDepth, matT, slotPositions, slotLen, !isTBeam), label));
    if (!isTBeam) {
      parts.push(tagCap(generateColumnFlangePiece(colH, flangeW, matT, slotPositions, slotLen, topNotch), label));
    }
  }

  // FLOOR ETCHINGS — one footprint rectangle per column at the wall,
  // plus a centred web line so the assembler knows which way the fin
  // points. Coordinates are in the floor part's OUTER frame:
  //   x = 0..floorW (west→east, where floorW = fbWidth)
  //   y = 0..floorH (front→back, where floorH = sideLen + 2*matT)
  // The interior usable area (inside the walls) is x ∈ [matT, floorW-matT]
  // and y ∈ [matT, floorH-matT]. Truss positions are stored in the INSIDE
  // frame, then converted back to floor x/y with frame.x0/frame.y0 here.
  // The footprint depth is measured from the wall's INTERIOR surface
  // (y=matT for front wall, y=floorH-matT for back, etc.).
  const floorW = blockPlan.fbWidth;
  const floorH = blockPlan.sideLen + 2 * matT;
  const etches = [];

  for (const kb of keptBearings) {
    const wall = kb.wall;
    // Convert inside-frame truss station coordinate back to the floor's
    // outer frame. Front/back bearing walls use x; east/west use y.
    const pos = (wall === 'front' || wall === 'back') ? (frame.x0 + kb.pos) : (frame.y0 + kb.pos);
    {
      let rx0, ry0, rx1, ry1, midX, midY;
      const footprintDepth = matT + webDepth + (isTBeam ? 0 : matT);
      const halfFlange = flangeW / 2;
      if (wall === 'front') {
        rx0 = pos - halfFlange; ry0 = matT;
        rx1 = pos + halfFlange; ry1 = matT + footprintDepth;
        midX = pos; midY = -1;
      } else if (wall === 'back') {
        rx0 = pos - halfFlange; ry0 = floorH - matT - footprintDepth;
        rx1 = pos + halfFlange; ry1 = floorH - matT;
        midX = pos; midY = -1;
      } else if (wall === 'west') {
        rx0 = matT;             ry0 = pos - halfFlange;
        rx1 = matT + footprintDepth; ry1 = pos + halfFlange;
        midX = -1; midY = pos;
      } else { // 'east'
        rx0 = floorW - matT - footprintDepth; ry0 = pos - halfFlange;
        rx1 = floorW - matT;                   ry1 = pos + halfFlange;
        midX = -1; midY = pos;
      }
      // Clamp to floor bounds — defensive, the margin should have
      // already kept the footprint inside.
      rx0 = Math.max(0, rx0); rx1 = Math.min(floorW, rx1);
      ry0 = Math.max(0, ry0); ry1 = Math.min(floorH, ry1);
      if (rx1 - rx0 < 0.1 || ry1 - ry0 < 0.1) continue;
      // Outline rectangle (4 lines)
      etches.push({ type: 'etch', x1: rx0, y1: ry0, x2: rx1, y2: ry0 });
      etches.push({ type: 'etch', x1: rx1, y1: ry0, x2: rx1, y2: ry1 });
      etches.push({ type: 'etch', x1: rx1, y1: ry1, x2: rx0, y2: ry1 });
      etches.push({ type: 'etch', x1: rx0, y1: ry1, x2: rx0, y2: ry0 });
      // Web centreline showing which way the fin projects from the wall.
      if (midY < 0) {
        etches.push({ type: 'etch', x1: midX, y1: ry0, x2: midX, y2: ry1 });
      } else {
        etches.push({ type: 'etch', x1: rx0, y1: midY, x2: rx1, y2: midY });
      }
    }
  }

  return { parts, etches };
}

/** Find the floor part in `parts` and append the given etch segments
 *  to its `lines` array. The floor part id is 'floor' (main block) or
 *  'floor_wing*' / merged 'floor' for wing builds — we look for both
 *  the plain 'floor' and any 'floor*' part with material 'core'. The
 *  first match wins; if nothing matches, the etchings are silently
 *  dropped (better than failing the whole regenerate). */
function applyColumnFloorEtchings(parts, etches) {
  if (!etches || etches.length === 0) return;
  const floorPart = parts.find(p =>
    p && p.material === 'core' && (p.id === 'floor' || /^floor(_|$)/.test(p.id))
  );
  if (!floorPart) return;
  if (!Array.isArray(floorPart.lines)) floorPart.lines = [];
  for (const e of etches) floorPart.lines.push(e);
}

function transformColumnEtchLine(e, pointMapper) {
  if (!e || typeof pointMapper !== 'function') return e;
  const a = pointMapper({ x: e.x1, y: e.y1 });
  const b = pointMapper({ x: e.x2, y: e.y2 });
  return Object.assign({}, e, { x1: a.x, y1: a.y, x2: b.x, y2: b.y });
}

function sameWingFloorTransform(part, cfg, wing) {
  const tr = part && part._layoutClipTransform;
  if (!tr || tr.kind !== 'wing' || !wing) return false;
  const mainW = Number(tr.mainW != null ? tr.mainW : (cfg && cfg.width)) || 0;
  const mainD = Number(tr.mainD != null ? tr.mainD : (cfg && cfg.depth)) || 0;
  return tr.face === wing.face
      && Math.abs((Number(tr.offset) || 0) - (Number(wing.offset) || 0)) < 0.01
      && Math.abs(mainW - (Number(cfg && cfg.width) || 0)) < 0.01
      && Math.abs(mainD - (Number(cfg && cfg.depth) || 0)) < 0.01
      && Math.abs((Number(part.bboxW) || 0) - (Number(wing.span) || 0)) < 0.1;
}

function findPanelizedWingFloorPart(parts, cfg, wing) {
  return (parts || []).find(p =>
    p && p.material === 'core'
      && String(p.id || '').startsWith('floor_split_wing_')
      && sameWingFloorTransform(p, cfg, wing)
  );
}

/** Append a wing block's column-footprint etches to the floor that actually
 *  carries that wing. If the material-size panelizer has split this wing
 *  into its own floor piece, the marks stay wing-local on that split piece.
 *  Otherwise the marks are converted from wing-local floor coordinates into
 *  the merged floor's global shape-editor coordinates and added to the main
 *  merged floor. Layout cuts run later and will crop these etches together
 *  with the floor outline. */
function applyWingColumnFloorEtchings(parts, etches, cfg, wing) {
  if (!etches || etches.length === 0 || !wing) return;

  const splitWingFloor = findPanelizedWingFloorPart(parts, cfg, wing);
  if (splitWingFloor) {
    if (!Array.isArray(splitWingFloor.lines)) splitWingFloor.lines = [];
    for (const e of etches) splitWingFloor.lines.push(e);
    return;
  }

  const floorPart = parts.find(p =>
    p && p.material === 'core' && (p.id === 'floor' || p.id === 'floor_main_panelized')
  );
  if (!floorPart) return;

  const tr = {
    kind: 'wing',
    face: wing.face,
    offset: wing.offset,
    mainW: cfg.width,
    mainD: cfg.depth,
  };
  if (!Array.isArray(floorPart.lines)) floorPart.lines = [];
  for (const e of etches) {
    floorPart.lines.push(transformColumnEtchLine(e, p => wingLocalToWorldPointForLayoutCut(cfg, tr, p)));
  }
}


function generateRoof(cfg, plan) {
  const roofStyle = plan.roofStyle;

  switch (roofStyle) {
    case 'parapet':
      return generateParapetRoof(cfg, plan);
    case 'flat':
      return generateFlatRoof(cfg, plan);
    case 'flat_overhang':
      return generateFlatOverhangRoof(cfg, plan);
    case 'slanted':
      return generateSlantedRoof(cfg, plan);
    case 'gabled':
    case 'parapet_gable':
      return generateGabledRoof(cfg, plan);
    default:
      // Keep a stable fallback for older .hako files or partially edited
      // configs that predate the current roof-style list.
      return generateParapetRoof(cfg, plan);
  }
}
