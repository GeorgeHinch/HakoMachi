'use strict';

/* ===========================================================================
 * INTERIOR WALL CLADDING
 *
 * A second cladding panel per wall, glued to the INSIDE face. Independent
 * style — the exterior can be ribbed metal while the interior is smooth
 * gypsum/cement — but the cutouts are constrained: windows + doors must
 * be at the same wall_x as the wall core's holes so the openings align in
 * 3D space. The interior panel sits between the perpendicular walls (no
 * corner overhang), so its width is the interior face length of the wall
 * (fbWidth - 2*matT for front/back, sideLen for east/west).
 *
 * Mirror conventions match the wall core's laser layout exactly:
 *   • Front + back: no mirror; panel_x = wall_x - matT (panel inset by matT
 *                   on the corner side so it doesn't extend into the
 *                   perpendicular wall material).
 *   • West: no mirror (core stores op.x with x=0 = south, same as panel layout).
 *   • East: mirrored (core stores op.x with x=0 = NORTH, exterior cladding
 *           also mirrors via _sideMirrorX — interior follows the same rule
 *           so all three layers — core, exterior, interior — line up).
 *
 * Bays, awnings, balconies, fixtures, and cladding overrides do not apply
 * to the interior — those are external building features. The interior
 * panel is a simple rectangle with window+door cutouts and the chosen
 * cladding-pattern etch on the interior style. No parapet extension and no
 * slope rise — the interior face stops at the wall's eave height H, even
 * on a gabled or parapeted building (where the exterior cladding extends
 * up into the gable peak or parapet band).
 * =========================================================================== */
function clipInteriorRectToBand(r, y0, y1) {
  if (!r || typeof r.y !== 'number' || typeof r.h !== 'number') return r;
  const a = Math.max(y0, r.y);
  const b = Math.min(y1, r.y + r.h);
  if (b - a <= 0.01) return null;
  return { ...r, y: a - y0, h: b - a };
}

function clipInteriorLineToBand(l, y0, y1) {
  if (!l || typeof l.y1 !== 'number' || typeof l.y2 !== 'number') return l;
  let ax = l.x1, ay = l.y1, bx = l.x2, by = l.y2;
  const dy = by - ay;

  if (Math.abs(dy) < 1e-9) {
    if (ay < y0 - 1e-7 || ay > y1 + 1e-7) return null;
    return { ...l, y1: ay - y0, y2: by - y0 };
  }

  let t0 = 0, t1 = 1;
  const tA = (y0 - ay) / dy;
  const tB = (y1 - ay) / dy;
  const lo = Math.min(tA, tB), hi = Math.max(tA, tB);
  t0 = Math.max(t0, lo);
  t1 = Math.min(t1, hi);
  if (t1 < t0 - 1e-9) return null;

  return {
    ...l,
    x1: ax + (bx - ax) * t0,
    y1: ay + (by - ay) * t0 - y0,
    x2: ax + (bx - ax) * t1,
    y2: ay + (by - ay) * t1 - y0,
  };
}

function splitInteriorCladdingPartByFloors(part, plan, interiorTopWallY, interiorBottomWallY) {
  if (!part) return [];
  const splitYs = (Array.isArray(plan && plan.interFloorYs) ? plan.interFloorYs : [])
    .map(y => Number(y))
    .filter(y => Number.isFinite(y) && y > interiorTopWallY + 0.25 && y < interiorBottomWallY - 0.25)
    .map(y => y - interiorTopWallY)
    .sort((a, b) => a - b);

  if (!splitYs.length) return [part];

  const bounds = [0, ...splitYs, part.bboxH]
    .map(y => Math.max(0, Math.min(part.bboxH, y)))
    .sort((a, b) => a - b);

  const dedup = [];
  for (const y of bounds) {
    if (!dedup.length || Math.abs(y - dedup[dedup.length - 1]) > 0.35) dedup.push(y);
  }

  const out = [];
  const bandCount = dedup.length - 1;
  for (let i = 0; i < bandCount; i++) {
    const y0 = dedup[i];
    const y1 = dedup[i + 1];
    const h = y1 - y0;
    if (h <= 0.5) continue;

    const floorFromGround = bandCount - i;
    const bandRects = (part.rects || [])
      .map(r => clipInteriorRectToBand(r, y0, y1))
      .filter(Boolean);
    const bandLines = (part.lines || [])
      .map(l => clipInteriorLineToBand(l, y0, y1))
      .filter(Boolean);

    out.push({
      ...part,
      id: `${part.id}_floor_${floorFromGround}`,
      name: `${part.name} — floor ${floorFromGround} interior piece`,
      bboxH: h,
      bboxOffsetX: 0,
      bboxOffsetY: 0,
      paths: [{ type: 'cut', d: rectPath(0, 0, part.bboxW, h) }],
      rects: bandRects,
      lines: bandLines,
      meta: {
        ...(part.meta || {}),
        splitInteriorByFloor: true,
        floorFromGround,
        floorBandIndexFromTop: i + 1,
        floorBandCount: bandCount,
        sourceInteriorPartId: part.id,
      },
      assemblyNote: `${part.assemblyNote || ''} Interior cladding is split at inter-floor divider locations; install this piece only within floor band ${floorFromGround}.`,
    });
  }

  return out.length ? out : [part];
}

function generateInteriorCladdingPanel(cfg, plan, which) {
  if (!cfg.interiorCladding) return null;
  const { matT, fbWidth, sideLen, H, bayHeight, hasFrontBay, hasBackBay } = plan;
  const bayXYForThisWall = (which === 'front' || which === 'back') ? planBayXFor(plan, which) : null;

  // Style: interior-specific if set, else fall back to exterior. Falling
  // back means the user can enable interior cladding without immediately
  // picking a style and get a sensible default.
  const styleKey = cfg.interiorCladdingStyle || cfg.claddingStyle;
  const styleSpec = CLADDING_STYLES[styleKey] || CLADDING_STYLES[cfg.claddingStyle];
  if (!styleSpec) return null;

  // Panel dimensions + identity.
  let panelW, panelH, cId, cName;
  // wallW = length of the wall in WALL FRAME (= the dimension along which
  // openings are stored). For FB it's fbWidth; for sides it's sideLen.
  let wallW;
  // The east wall stores op.x with x=0=NORTH and laser-mirrors it for both
  // the core and exterior cladding; interior follows suit.
  const eastMirror = (which === 'east');
  if (which === 'front' || which === 'back') {
    wallW  = fbWidth;
    panelW = fbWidth - 2 * matT;
    panelH = H;
    cId    = 'interior_cladding_' + which;
    cName  = (which === 'front' ? 'Front' : 'Back') + ' Interior Cladding';
  } else {
    wallW  = sideLen;
    panelW = sideLen;
    panelH = H;
    cId    = 'interior_cladding_' + which;
    cName  = (which === 'east' ? 'East' : 'West') + ' Interior Cladding';
  }
  // cornerInset: how far the interior panel sits inside wall_x = 0.
  // FB walls have matT on each side hidden by the side walls; sides have 0.
  const cornerInset = (which === 'front' || which === 'back') ? matT : 0;

  // Interior cladding is glued to the room-side face, so it should cover the
  // CLEAR wall area rather than the full exterior wall height. Leave room for
  // the bottom floor plate and the top roof/ceiling plate. For parapet roofs,
  // the usable interior wall starts below the recessed roof deck/parapet well,
  // not at the exterior parapet top.
  const interiorTopWallY = Math.max(0, (cfg.roofStyle === 'parapet' ? (plan.parapetH || 0) : 0) + matT);
  const interiorBottomWallY = Math.max(interiorTopWallY + 1, H - matT);
  panelH = Math.max(1, interiorBottomWallY - interiorTopWallY);

  // Map a wall-frame opening to an interior-panel laser-flat x position.
  // Interior panels are glued to the INSIDE face, so their visible face is the
  // reverse side of the exterior cladding. Mirror every interior panel relative
  // to its matching outside sheet:
  //   front/back: exterior is wall_x - matT, interior is reversed across panelW
  //   west:       exterior is wall_x,        interior is sideLen - wall_x - w
  //   east:       exterior is mirrored,      interior becomes the unmirrored wall_x
  function wallToPanelX(wallX, oW) {
    if (which === 'front' || which === 'back') {
      return panelW - (wallX - cornerInset) - oW;
    }
    if (which === 'west') return sideLen - wallX - oW;
    if (which === 'east') return wallX;
    return wallX - cornerInset;
  }

  // ── Collect openings (windows + doors) in WALL FRAME ──────────────────
  // Manual mode wins when present; otherwise we run the same auto-compute
  // helpers that the wall core + exterior cladding use, so the three layers
  // are guaranteed to produce holes at the same wall_x. This avoids the
  // 0.5 mm-drift class of bug where slightly different rounding paths in
  // duplicate placement code make holes that don't quite line up.
  const openings = [];
  const winDims = getWindowDims(cfg);
  const groundWinDims = getGroundFloorWindowDims(cfg);

  if (which === 'front' || which === 'back') {
    const fbDoorCount = (which === 'front') ? (cfg.frontDoorCount || 0) : (cfg.backDoorCount || 0);
    const hasBay = (which === 'front') ? hasFrontBay : hasBackBay;
    const _manual = manualStructuralOps(cfg, which);
    if (_manual) {
      for (const op of _manual) {
        if (op.type === 'window' || op.type === 'door') {
          openings.push({ type: op.type, x: op.x, y: op.y, w: op.w, h: op.h });
        }
      }
    } else {
      const slotYsForThisWall = (hasFrontBay || hasBackBay)
        ? (plan.slotYs || []).filter(y => y < (H - bayHeight) - 1)
        : (plan.slotYs || []);
      const floorCenterYsForThisWall = (hasFrontBay || hasBackBay)
        ? (plan.floorCenterYs || []).filter(y => y < (H - bayHeight) - 1)
        : (plan.floorCenterYs || []);
      const doorStyle = cfg.doorStyle;
      const doorH = (doorStyle && doorStyle !== 'none' && DOOR_STYLES[doorStyle]) ? DOOR_STYLES[doorStyle].height : 0;
      const doorReserveH = (fbDoorCount > 0 && !hasBay) ? doorH + 3 : 0;
      const wallWindows = computeWindows(fbWidth, H, {
        density: cfg.windowDensity, winDims, groundWinDims,
        groundFloorCenterY: plan.groundFloorCenterY,
        hasOpening: hasBay,
        openingY: H - bayHeight, openingH: bayHeight,
        slotYs: slotYsForThisWall, floorCenterYs: floorCenterYsForThisWall,
        parapetH: plan.parapetH, matT: plan.matT,
        doorReserveH,
      });
      for (const w of wallWindows) {
        openings.push({ type: 'window', x: w.x, y: w.y, w: w.width, h: w.height });
      }
      if (!hasBay) {
        const wallDoors = computeDoors(fbWidth, H, {
          doorStyle, doorCount: fbDoorCount,
          hasOpening: false, bayXStart: 0, bayXEnd: 0,
          cfg, plan, edgeId: which,
        });
        for (const d of wallDoors) {
          openings.push({ type: 'door', x: d.x, y: d.y, w: d.width, h: d.height });
        }
      }
    }
  } else {
    // East / West side walls.
    const sideDoorCount = cfg.sideDoorCount || 0;
    const _manual = manualStructuralOps(cfg, which);
    if (_manual) {
      for (const op of _manual) {
        if (op.type === 'window' || op.type === 'door') {
          openings.push({ type: op.type, x: op.x, y: op.y, w: op.w, h: op.h });
        }
      }
    } else {
      const doorStyle = cfg.doorStyle;
      const doorH = (doorStyle && doorStyle !== 'none' && DOOR_STYLES[doorStyle]) ? DOOR_STYLES[doorStyle].height : 0;
      const doorReserveH = (sideDoorCount > 0) ? doorH + 3 : 0;
      const wallWindows = computeWindows(sideLen, H, {
        density: cfg.windowDensity, winDims, groundWinDims,
        groundFloorCenterY: plan.groundFloorCenterY,
        hasOpening: false, openingY: 0, openingH: 0,
        slotYs: plan.slotYs || [], floorCenterYs: plan.floorCenterYs || [],
        parapetH: plan.parapetH, matT: plan.matT,
        doorReserveH,
      });
      for (const w of wallWindows) {
        openings.push({ type: 'window', x: w.x, y: w.y, w: w.width, h: w.height });
      }
      const wallDoors = computeDoors(sideLen, H, {
        doorStyle, doorCount: sideDoorCount,
        hasOpening: false, bayXStart: 0, bayXEnd: 0,
        cfg, plan, edgeId: which,
      });
      for (const d of wallDoors) {
        openings.push({ type: 'door', x: d.x, y: d.y, w: d.width, h: d.height });
      }
    }
  }

  // Add the structural bay/large-door opening to the interior cladding too.
  // Exterior cladding and the core wall already include this, but the
  // interior cladding path was only collecting regular windows/doors, so bay
  // openings stayed covered on the inside face.
  if ((which === 'front' || which === 'back') && ((which === 'front') ? hasFrontBay : hasBackBay) && bayXYForThisWall) {
    openings.push({
      type: 'bay',
      x: bayXYForThisWall.bayXStart,
      y: H - bayHeight,
      w: bayXYForThisWall.bayXEnd - bayXYForThisWall.bayXStart,
      h: bayHeight,
    });
  }

  // ── Apply mirror/inset to opening positions ────────────────────────────
  // Each opening becomes a cut rect on the panel + a cutOpenings entry so
  // the cladding pattern stops at the hole boundary.
  const rects = [];
  const cutOpenings = [];
  for (const op of openings) {
    const px = wallToPanelX(op.x, op.w);
    // Clip to the clear-height interior cladding panel instead of dropping
    // openings that overlap the floor/ceiling trim area. Convert from wall
    // coordinates (y=0 at exterior top) into panel-local coordinates whose
    // y=0 starts at interiorTopWallY.
    const x0 = Math.max(0, px);
    const x1 = Math.min(panelW, px + op.w);
    const y0Wall = Math.max(interiorTopWallY, op.y);
    const y1Wall = Math.min(interiorBottomWallY, op.y + op.h);
    const y0 = y0Wall - interiorTopWallY;
    const y1 = y1Wall - interiorTopWallY;
    const cw = x1 - x0;
    const ch = y1 - y0;
    if (cw <= 0.01 || ch <= 0.01) continue;
    rects.push({ type: 'cut', x: x0, y: y0, w: cw, h: ch, compensateKerf: false });
    cutOpenings.push({ x: x0, y: y0, w: cw, h: ch });
  }

  // ── Cladding pattern etch ──────────────────────────────────────────────
  // Same generator the exterior uses, fed the interior style. cutOpenings
  // clip the pattern lines so etches don't run through holes.
  const lines = [];
  const patternLines = generateCladdingPattern(styleSpec, 0, 0, panelW, panelH, cutOpenings, null);
  for (const ln of patternLines) {
    lines.push({ type: 'etch', x1: ln.x1, y1: ln.y1, x2: ln.x2, y2: ln.y2 });
  }

  // ── Column position indicators ─────────────────────────────────────────
  // When column supports are enabled and THIS wall is a bearing wall, etch
  // an outline of each column's back-flange footprint so the assembler
  // knows where to glue each column on the room side. The indicators line
  // up with the floor etchings the column generator already emits — same
  // along-wall positions, same flangeW — so the column sits at the
  // intersection of "floor mark" and "wall mark", a self-fixturing guide.
  //
  // The indicator is a hollow rectangle (4 etched edges) rather than a
  // filled region so the cladding pattern still shows through. Width =
  // flangeW (the column's along-wall dimension); height = colH (floor to
  // eave). For roofs with a parapet the parapet band sits above the
  // indicator — the column doesn't extend into the parapet.
  const t = cfg.trusses;
  if (t && t.enabled && t.supports) {
    // Resolve axis the same way the truss generator does so the indicator
    // always falls on the same wall the columns actually land on.
    const isGable = cfg.roofStyle === 'gabled' || cfg.roofStyle === 'parapet_gable';
    const ridge = effectiveRidgeDir(cfg);
    let axis = t.axis;
    if (!axis || (axis !== 'ns' && axis !== 'ew')) {
      if (isGable) axis = ridge === 'ew' ? 'ns' : 'ew';
      else         axis = cfg.width >= cfg.depth ? 'ns' : 'ew';
    }
    const isBearingFB   = (axis === 'ns' && (which === 'front' || which === 'back'));
    const isBearingWall = isBearingFB
                       || (axis === 'ew' && (which === 'east'  || which === 'west'));
    if (isBearingWall) {
      const flangeW    = (t.supportFlangeW != null) ? t.supportFlangeW : 4;
      const frame      = trussInteriorFrame(cfg, plan);
      const lengthAlong = (axis === 'ns') ? frame.width : frame.depth;
      const spacing    = Math.max(5, t.spacing || 30);
      const margin     = flangeW / 2;
      const positions  = trussSupportPositions(lengthAlong, spacing, margin);

      const parapetH = plan.parapetH || 0;
      const colH     = panelH - parapetH;
      const yTop     = panelH - colH;  // = parapetH (= 0 on no-parapet roofs)
      const yBot     = panelH;
      for (const wallCenter of positions) {
        // Positions are inside-frame coordinates. Front/back wall panels are
        // full exterior width, so add the west-wall thickness to place the
        // indicator in the clear interior. Side wall panels already start at
        // the inside face between front/back walls, so no offset is needed.
        const wallCenterX = isBearingFB ? (frame.x0 + wallCenter) : wallCenter;
        const wallXL = wallCenterX - flangeW / 2;
        const panelXL = wallToPanelX(wallXL, flangeW);
        if (panelXL < -0.1 || panelXL + flangeW > panelW + 0.1) continue;
        const panelXR = panelXL + flangeW;
        // Four etched edges of the back-flange footprint rectangle.
        lines.push({ type: 'etch', x1: panelXL, y1: yTop, x2: panelXR, y2: yTop });
        lines.push({ type: 'etch', x1: panelXR, y1: yTop, x2: panelXR, y2: yBot });
        lines.push({ type: 'etch', x1: panelXR, y1: yBot, x2: panelXL, y2: yBot });
        lines.push({ type: 'etch', x1: panelXL, y1: yBot, x2: panelXL, y2: yTop });
      }
    }
  }

  // Resolve the material — the cladding style may pin itself to a heavier
  // stock (some traditional surfaces use a thicker board than alc_panel
  // and live on the 0.8mm sheet); the exterior cladding picker already
  // honours this and the interior shares the same logic so the parts
  // panel groups material correctly.
  const material = (cfg.claddingMaterials && cfg.claddingMaterials[styleKey]) || 'cladding';

  const fullInteriorPart = {
    id: cId,
    name: cName + ` (clear interior height ${panelH.toFixed(1)}mm)`,
    material,
    bboxW: panelW, bboxH: panelH,
    bboxOffsetX: 0, bboxOffsetY: 0,
    assemblyNote: `Interior cladding is shortened to the clear room-side height: top offset ${interiorTopWallY.toFixed(1)}mm, bottom offset ${(H - interiorBottomWallY).toFixed(1)}mm from the exterior wall frame.`,
    paths: [{ type: 'cut', d: rectPath(0, 0, panelW, panelH) }],
    rects,
    lines,
    meta: { area: 'interior_walls', role: 'interior_cladding', wall: which },
  };

  return splitInteriorCladdingPartByFloors(fullInteriorPart, plan, interiorTopWallY, interiorBottomWallY);
}


function pointInPolygonEvenOdd(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersects = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / ((yj - yi) || 1e-12) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

function clipSegmentToPolygonPieces(x1, y1, x2, y2, poly) {
  // Generic segment clipper for both convex and concave polygons. It collects
  // all segment/edge intersection parameters, sorts them, then keeps the
  // sub-intervals whose midpoint lies inside the polygon. This is intentionally
  // small and local because the connected parapet-gable crown has a concave
  // V-shaped lower edge; simple rectangle or triangle clippers are not enough.
  const dx = x2 - x1, dy = y2 - y1;
  const ts = [0, 1];
  const EPS = 1e-8;

  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const ex = b.x - a.x, ey = b.y - a.y;
    const denom = dx * ey - dy * ex;
    if (Math.abs(denom) < EPS) continue; // parallel / collinear
    const qx = a.x - x1, qy = a.y - y1;
    const t = (qx * ey - qy * ex) / denom;
    const u = (qx * dy - qy * dx) / denom;
    if (t > -EPS && t < 1 + EPS && u > -EPS && u < 1 + EPS) {
      ts.push(Math.max(0, Math.min(1, t)));
    }
  }

  ts.sort((a, b) => a - b);
  const uniq = [];
  for (const t of ts) {
    if (!uniq.length || Math.abs(t - uniq[uniq.length - 1]) > 1e-6) uniq.push(t);
  }

  const pieces = [];
  for (let i = 0; i < uniq.length - 1; i++) {
    const a = uniq[i], b = uniq[i + 1];
    if (b - a < 1e-6) continue;
    const mid = (a + b) / 2;
    const mx = x1 + dx * mid;
    const my = y1 + dy * mid;
    if (!pointInPolygonEvenOdd(mx, my, poly)) continue;
    pieces.push({
      x1: x1 + dx * a,
      y1: y1 + dy * a,
      x2: x1 + dx * b,
      y2: y1 + dy * b,
    });
  }
  return pieces;
}

function generateInnerParapetCladding(cfg, plan) {
  if (cfg.parapetInnerCladding === false) return [];
  const { matT, parapetH, fbWidth, sideLen } = plan;
  const styleKey  = cfg.claddingStyle;
  const styleSpec = CLADDING_STYLES[styleKey];
  const material  = (styleSpec && cfg.claddingMaterials && cfg.claddingMaterials[styleKey])
                  || 'cladding';

  // ─── Flat parapet roof ─────────────────────────────────────────────
  // Four foldable top-wrap strips, one per wall. Each strip is no longer
  // just the visible INSIDE face of the parapet. It now includes:
  //   • a top cap band = matT, which folds over the exposed core top edge;
  //   • an inside drop = parapetH, which continues down the inner face to
  //     the recessed roof deck.
  // In flat layout the cap sits above the fold line and the patterned
  // inner face sits below it:
  //      y=0 ............. top-cap outer edge
  //      y=matT .......... score/fold line over wall top
  //      y=matT+parapetH . bottom edge at roof deck
  // This keeps the exterior wall cladding unchanged while hiding both
  // bare surfaces that are visible from above: the parapet's top edge and
  // the vertical inside space between the roof and the top of the wall.
  if (cfg.roofStyle === 'parapet') {
    if (!parapetH || parapetH <= 0) return [];
    if (!styleSpec) return [];
    const parts = [];
    const wrapDepth = matT;
    const faces = [
      { which: 'front', label: 'Front', width: fbWidth - 2 * matT },
      { which: 'back',  label: 'Back',  width: fbWidth - 2 * matT },
      { which: 'east',  label: 'East',  width: sideLen },
      { which: 'west',  label: 'West',  width: sideLen },
    ];
    for (const { which, label, width } of faces) {
      if (width <= 0) continue;
      const w = width;
      // The recessed roof core occupies the bottom matT of the parapet well.
      // The inside drop should stop at the TOP of the roof deck, not continue
      // down behind/into the roof core. Previous size was wrapDepth+parapetH,
      // which made the vertical inside leg one core thickness too long.
      const insideDrop = Math.max(0, parapetH - matT);
      const h = wrapDepth + insideDrop;
      const lines = [
        // Fold/score line: the narrow band above this folds over the top
        // of the wall; the lower band glues to the visible inside face above
        // the recessed roof deck.
        { type: 'etch', x1: 0, y1: wrapDepth, x2: w, y2: wrapDepth },
      ];
      // Etch the cladding pattern only on the vertical inside face. The
      // horizontal top cap is deliberately left plain so it reads as a
      // folded edge instead of another wall face.
      const patSegs = generateCladdingPattern(styleSpec, 0, wrapDepth, w, h, [], null);
      for (const seg of patSegs) {
        lines.push({ type: 'etch', x1: seg.x1, y1: seg.y1, x2: seg.x2, y2: seg.y2 });
      }
      parts.push({
        id: 'cladding_parapet_inner_' + which,
        name: label + ' inner parapet top-wrap cladding',
        material: material,
        bboxW: w,
        bboxH: h,
        bboxOffsetX: 0,
        bboxOffsetY: 0,
        paths: [{ type: 'cut', d: rectPath(0, 0, w, h) }],
        rects: [],
        lines: lines,
        assemblyNote: `Score the fold line ${wrapDepth.toFixed(1)} mm from the edge. Fold that narrow band over the parapet wall top, then glue the remaining ${insideDrop.toFixed(1)} mm band down the visible inside face to the top of the recessed roof deck.`,
      });
    }
    return parts;
  }

  // ─── Parapet-hidden gable ──────────────────────────────────────────
  // Mixed geometry: gable walls hide a triangular peak, eave walls in
  // 'all' mode hide the slope's rise. From INSIDE the building looking
  // up at each wall above the eave height:
  //
  //   • Gable wall: the roof slopes cut diagonally across the wall
  //     from each base corner up to the apex at (gableWidth/2, pitch).
  //     The roof material occupies the area ABOVE these slope lines,
  //     so only the area BELOW (the triangular peak shape) is visible
  //     from inside. We split that triangle along its vertical axis
  //     of symmetry into two right triangles per wall — legs are
  //     (gableWidth/2) and pitch — so each piece naturally covers ONE
  //     slope side. Four right triangles total (2 per gable × 2 walls).
  //
  //   • Eave wall (parapeted only in 'all' mode): roof slopes UP and
  //     AWAY from this wall toward the ridge, so it doesn't obstruct
  //     the eave wall's interior face. The full parapet extension is
  //     visible from inside — a rectangle of (eaveWidth) × (pitch +
  //     parapetH). One rectangle per parapeted eave wall.
  //
  // Total piece count by parapetSides mode:
  //   all  → 4 triangles + 2 rectangles = 6
  //   fb   → 4 triangles only           = 4   (FB walls are gable)
  //   ew   → 4 triangles only           = 4   (EW walls are gable)
  //
  // Cladding pattern is etched on the rectangles (matching the flat
  // parapet behaviour above) but NOT on the triangles, because clipping
  // line segments to a triangle would need new intersection plumbing
  // and the pattern adds little inside a 28×10 mm shape anyway. Deferred.
  if (cfg.roofStyle === 'parapet_gable') {
    const pitch    = cfg.roofPitch || 10;
    const parH     = parapetH || 0;
    const ridgeDir = effectiveRidgeDir(cfg);
    const ewRidge  = (ridgeDir === 'ew');
    const parts    = [];

    // Gable-end walls — always parapeted under parapet_gable. Each
    // contributes two right triangles, mirror-image halves of the
    // hidden peak.
    const gableFaces  = ewRidge ? ['east', 'west'] : ['front', 'back'];
    const gableWidth  = ewRidge ? sideLen : (fbWidth - 2 * matT);
    const halfSpan    = gableWidth / 2;

    for (const face of gableFaces) {
      if (!wallHasParapet(cfg, face)) continue;

      // If the parapet continues above the roof peak, the two triangular
      // inside-gable pieces do not need to be separate. The visible inside
      // face is one connected crown/bowtie-ish panel: full-width parapet top
      // band, with a V-shaped lower edge following the two roof slopes down
      // to the eave corners. This is cleaner and avoids the four undersized
      // little triangles that were generated for low-pitch / tall-parapet
      // buildings such as 149×112×40 with pitch 4 and parapet 5.
      const capAbovePeak = Math.max(0, parH - matT);
      const canUseConnectedCrown = capAbovePeak > 0.35 && gableWidth > 1 && pitch > 0.35;
      if (canUseConnectedCrown) {
        const crownH = pitch + capAbovePeak;
        const crownPath =
          `M 0,0 L ${gableWidth.toFixed(3)},0 ` +
          `L ${gableWidth.toFixed(3)},${crownH.toFixed(3)} ` +
          `L ${(gableWidth / 2).toFixed(3)},${capAbovePeak.toFixed(3)} ` +
          `L 0,${crownH.toFixed(3)} Z`;

        const crownPoly = [
          { x: 0, y: 0 },
          { x: gableWidth, y: 0 },
          { x: gableWidth, y: crownH },
          { x: gableWidth / 2, y: capAbovePeak },
          { x: 0, y: crownH },
        ];

        let crownLines = [];
        if (styleSpec) {
          const patSegs = generateCladdingPattern(styleSpec, 0, 0, gableWidth, crownH, [], null);
          for (const seg of patSegs) {
            const clipped = clipSegmentToPolygonPieces(seg.x1, seg.y1, seg.x2, seg.y2, crownPoly);
            for (const c of clipped) {
              crownLines.push({ type: 'etch', x1: c.x1, y1: c.y1, x2: c.x2, y2: c.y2 });
            }
          }
        }
        // Light reference mark at the roof-peak height so the user can align
        // the centre notch above the gable ridge. Keep it short and clipped
        // to the crown so it does not become a visible stray segment.
        for (const c of clipSegmentToPolygonPieces(
          Math.max(0, gableWidth / 2 - 3), capAbovePeak,
          Math.min(gableWidth, gableWidth / 2 + 3), capAbovePeak,
          crownPoly
        )) {
          crownLines.push({ type: 'etch', x1: c.x1, y1: c.y1, x2: c.x2, y2: c.y2 });
        }

        parts.push({
          id: `cladding_parapet_inner_${face}_crown`,
          name: `${face[0].toUpperCase() + face.slice(1)} inner parapet cladding (connected gable crown)`,
          material: material,
          bboxW: gableWidth,
          bboxH: crownH,
          bboxOffsetX: 0,
          bboxOffsetY: 0,
          paths: [{ type: 'cut', d: crownPath }],
          rects: [],
          lines: crownLines,
          assemblyNote: `One-piece inside gable parapet insert. The V-shaped lower edge follows the two roof slopes; the cladding texture is clipped to the crown shape. The small centre etch marks the roof peak/ridge alignment. This replaces two separate triangular inserts because the parapet extends ${capAbovePeak.toFixed(1)} mm above the roof peak.`,
        });
        continue;
      }

      // Fallback for cases where the roof peak reaches the parapet top:
      // two right triangles per gable wall, one for each slope side.
      const triPathA = `M 0,0 L ${halfSpan.toFixed(3)},0 L ${halfSpan.toFixed(3)},${pitch.toFixed(3)} Z`;
      const triPathB = `M 0,0 L ${halfSpan.toFixed(3)},0 L 0,${pitch.toFixed(3)} Z`;
      let linesA = [], linesB = [];
      if (styleSpec) {
        const patSegs = generateCladdingPattern(styleSpec, 0, 0, halfSpan, pitch, [], null);
        for (const seg of patSegs) {
          const cA = clipSegmentToTriangle(seg.x1, seg.y1, seg.x2, seg.y2, halfSpan, pitch, false);
          if (cA) linesA.push({ type: 'etch', x1: cA.x1, y1: cA.y1, x2: cA.x2, y2: cA.y2 });
          const cB = clipSegmentToTriangle(seg.x1, seg.y1, seg.x2, seg.y2, halfSpan, pitch, true);
          if (cB) linesB.push({ type: 'etch', x1: cB.x1, y1: cB.y1, x2: cB.x2, y2: cB.y2 });
        }
      }
      for (const sideLbl of ['A', 'B']) {
        const isA = sideLbl === 'A';
        parts.push({
          id: `cladding_parapet_inner_${face}_${sideLbl}`,
          name: `${face[0].toUpperCase() + face.slice(1)} inner parapet cladding (slope ${sideLbl})`,
          material: material,
          bboxW: halfSpan,
          bboxH: pitch,
          bboxOffsetX: 0,
          bboxOffsetY: 0,
          paths: [{ type: 'cut', d: isA ? triPathA : triPathB }],
          rects: [],
          lines: isA ? linesA : linesB,
        });
      }
    }

    // Eave walls — parapeted only in 'all' mode. Full rectangle, height
    // = pitch + parapetH (the parapet extension above the eave).
    const eaveFaces  = ewRidge ? ['front', 'back'] : ['east', 'west'];
    const eaveWidth  = ewRidge ? (fbWidth - 2 * matT) : sideLen;
    // The roof core hides/occupies the bottom matT of the parapet well, so
    // the rectangular inside cladding should stop at the top of the roof deck.
    const eaveHeight = pitch + Math.max(0, parH - matT);

    if (eaveHeight > 0 && eaveWidth > 0) {
      for (const face of eaveFaces) {
        if (!wallHasParapet(cfg, face)) continue;
        // Etch the cladding pattern, matching the flat-parapet rect's
        // behaviour. Same generator + line-mapping pattern.
        let lines = [];
        if (styleSpec) {
          const patSegs = generateCladdingPattern(styleSpec, 0, 0, eaveWidth, eaveHeight, [], null);
          lines = patSegs.map(seg => ({ type: 'etch', x1: seg.x1, y1: seg.y1, x2: seg.x2, y2: seg.y2 }));
        }
        parts.push({
          id: 'cladding_parapet_inner_' + face,
          name: `${face[0].toUpperCase() + face.slice(1)} inner parapet cladding`,
          material: material,
          bboxW: eaveWidth,
          bboxH: eaveHeight,
          bboxOffsetX: 0,
          bboxOffsetY: 0,
          paths: [{ type: 'cut', d: rectPath(0, 0, eaveWidth, eaveHeight) }],
          rects: [],
          lines: lines,
        });
      }
    }

    return parts;
  }

  return [];
}

/* Generate the thin door panels that close (or partially close) a bay
 * opening. Each panel is a single rectangle cut from cladding material,
 * with style-specific etching, sized to the visible / closed portion of
 * the bay door. The piece glues to the INSIDE face of the core panel
 * behind the bay opening, sitting one matT recessed from the cladding
 * face — this small offset gives the bay visible depth so it reads as a
 * real recessed door rather than a sticker on the wall.
 *
 * Returns one part per bay face. A through-bay produces two pieces (one
 * for each visible face). Bays with doorStyle === 'none' or 100% open
 * are skipped — no panel needed.
 *
 * Percent-open behaviour depends on the door style's `direction`:
 *   • 'overhead' (roller/sectional/paneled/tilt_up): the door retracts
 *     UPWARD into a ceiling track. The visible piece is the LOWER
 *     portion of the original opening (the part still hanging in front
 *     of the bay as the door is partially rolled up). Cut piece height
 *     shrinks; width stays at full opening width.
 *   • 'side' (slatted): the door slides sideways. Visible piece is the
 *     LEFT portion; cut piece width shrinks, height stays full.
 *
 * The etch features come from each style's `etchFn(w, h)` callback,
 * which returns objects in the same { type: 'line' | 'rect' | 'circle' }
 * shape used by doorFeatureShapes — coords local to the panel (0..w,
 * 0..h, y growing downward). */
function generateBayDoorParts(cfg, plan) {
  const parts = [];
  for (const face of ['front', 'back']) {
    const bay = findBayOnFace(cfg, face);
    if (!bay) continue;
    const styleKey = bay.doorStyle || 'none';
    if (styleKey === 'none') continue;
    const style = BAY_DOOR_STYLES[styleKey];
    if (!style || !style.etchFn) continue;

    const pct = Math.max(0, Math.min(100, Number(bay.doorPercentOpen) || 0));
    const ratioClosed = 1 - pct / 100;
    if (ratioClosed <= 0.01) continue;  // fully open → no panel needed

    // Compute the visible piece size. Overhead doors keep full width and
    // shrink in height; side-sliding doors do the opposite.
    const isSide = style.direction === 'side';
    const panelW = isSide ? (bay.w * ratioClosed) : bay.w;
    const panelH = isSide ? bay.h : (bay.h * ratioClosed);
    if (panelW < 1 || panelH < 1) continue;

    // Generate the etch features for the FULL door, then shift + clip to
    // the visible region. Calling style.etchFn(bay.w, bay.h) returns
    // features in the FULL door's local frame (top-left = (0,0)); we
    // then map them into the cut piece's frame.
    //
    // For OVERHEAD doors (roller/paneled/sectional/tilt-up), the door
    // retracts UPWARD as it opens — the top of the door slides into the
    // housing and the BOTTOM stays in the opening. So the visible portion
    // of the door fabric is its BOTTOM `panelH` worth; features above
    // `bay.h − panelH` in the full-door frame remain visible, everything
    // above that is hidden. We shift y by `−(bay.h − panelH)` so the
    // door's bottom edge lands at the cut piece's bottom edge, then drop
    // anything outside the panel's local rectangle.
    //
    // For SIDE-sliding doors (slatted), the door retracts to the right —
    // the right of the door fabric slides out of the opening and the
    // LEFT `panelW` worth stays visible. The cut piece's local origin
    // already lines up with the door's left edge, so no shift is needed.
    //
    // The previous implementation called etchFn(panelW, panelH) directly
    // and let the etcher build a SHORTER complete door for the visible
    // size. That treated each partial-open state as its own self-similar
    // mini-door, which put the paneled style's window row (always in the
    // TOP panel) at the TOP of whatever portion remained visible — i.e.
    // showing windows even at 80% open when, physically, the windowed
    // top of the door has long since retracted out of sight.
    const yShift = isSide ? 0 : -(bay.h - panelH);
    const fullFeats = style.etchFn(bay.w, bay.h);
    const feats = [];
    for (const f of fullFeats) {
      if (f.type === 'line') {
        let x1 = f.x1, x2 = f.x2;
        let y1 = f.y1 + yShift, y2 = f.y2 + yShift;
        // Skip lines entirely outside the visible rect. We don't do
        // segment-against-rect clipping for partial overlaps — etchFn
        // outputs are typically axis-aligned or fully inside one of
        // the panels, so a bbox-style drop is correct for them; a few
        // diagonals (tilt_up bracing) might stick into the hidden
        // region but those ones are inside the inset frame which sits
        // well below the door's top, so they survive whole at any
        // partial-open ratio we'd reasonably allow.
        const yMin = Math.min(y1, y2), yMax = Math.max(y1, y2);
        const xMin = Math.min(x1, x2), xMax = Math.max(x1, x2);
        if (yMax < 0 || yMin > panelH) continue;
        if (xMax < 0 || xMin > panelW) continue;
        feats.push({ type: 'line', x1, y1, x2, y2 });
      } else if (f.type === 'rect') {
        const x = f.x, y = f.y + yShift, w = f.w, h = f.h;
        // Drop if entirely outside; clip if it straddles the visible edge.
        if (y + h <= 0 || y >= panelH) continue;
        if (x + w <= 0 || x >= panelW) continue;
        const cx1 = Math.max(0, x),     cy1 = Math.max(0, y);
        const cx2 = Math.min(panelW, x + w), cy2 = Math.min(panelH, y + h);
        const cw = cx2 - cx1, ch = cy2 - cy1;
        if (cw > 0.05 && ch > 0.05) {
          feats.push({ type: 'rect', x: cx1, y: cy1, w: cw, h: ch });
        }
      } else if (f.type === 'circle') {
        const cx = f.cx, cy = f.cy + yShift, r = f.r;
        // Circle bbox check — if any of the circle would intrude, keep
        // it whole. Partial-circle clipping isn't worth the geometry
        // here because the only style using circles (none currently;
        // future-proofing) would be small handles or pulls that don't
        // tend to straddle the visible edge.
        if (cy + r <= 0 || cy - r >= panelH) continue;
        if (cx + r <= 0 || cx - r >= panelW) continue;
        feats.push({ type: 'circle', cx, cy, r });
      }
    }

    const rects = [{ type: 'cut', x: 0, y: 0, w: panelW, h: panelH, compensateKerf: false }];
    const lines = [];
    for (const f of feats) {
      if (f.type === 'line') {
        lines.push({ type: 'etch', x1: f.x1, y1: f.y1, x2: f.x2, y2: f.y2 });
      } else if (f.type === 'rect') {
        // Render rect outlines as four etched edges (no fill — laser etch
        // just scores the outline).
        const x2 = f.x + f.w, y2 = f.y + f.h;
        lines.push({ type: 'etch', x1: f.x, y1: f.y,  x2: x2,  y2: f.y });
        lines.push({ type: 'etch', x1: x2,  y1: f.y,  x2: x2,  y2: y2 });
        lines.push({ type: 'etch', x1: x2,  y1: y2,   x2: f.x, y2: y2 });
        lines.push({ type: 'etch', x1: f.x, y1: y2,   x2: f.x, y2: f.y });
      } else if (f.type === 'circle') {
        // Approximate the circle as a 12-segment polyline for etching.
        const N = 12;
        let px = f.cx + f.r, py = f.cy;
        for (let j = 1; j <= N; j++) {
          const a = (j / N) * 2 * Math.PI;
          const nx = f.cx + Math.cos(a) * f.r;
          const ny = f.cy + Math.sin(a) * f.r;
          lines.push({ type: 'etch', x1: px, y1: py, x2: nx, y2: ny });
          px = nx; py = ny;
        }
      }
    }

    const align = isSide
      ? `LEFT edge of the opening (door slides right when retracted)`
      : `BOTTOM edge of the opening (door retracts upward — the bottom of the door is what stays in the opening)`;
    // The "far" edge is the one that moves as the door opens — that's
    // where the wall etches its alignment tick marks. For side doors
    // the door slides right, so the tick marks the panel's RIGHT edge.
    // For overhead doors the door retracts UP, so the tick marks the
    // panel's TOP edge (the bottom is anchored at the opening bottom).
    const farEdge = isSide ? 'right' : 'top';
    parts.push({
      id: `bay_door_${face}`,
      name: `Bay door panel — ${face} (${style.label}${pct > 0 ? `, ${pct}% open` : ''})`,
      material: 'cladding',
      bboxW: panelW, bboxH: panelH,
      bboxOffsetX: 0, bboxOffsetY: 0,
      paths: [], rects, lines,
      assemblyNote:
        `Glue to the INSIDE face of the ${face} wall core, aligned to the ${align}. ` +
        `Sits one core-panel thickness behind the cladding face — the recess is what gives the bay visible depth. ` +
        `The wall has small etched tick marks next to the bay opening showing where the panel's ${farEdge} edge should land.`,
    });
  }
  return parts;
}

/* Produce laser-cut sheets for cladding overrides. One sheet per
 * (claddingStyle × dimensions). Each entry contributes one cut piece sized
 * to its bbox, with the secondary cladding pattern etched on it. Cut from
 * cladding material (0.28mm basswood, same as the main cladding). */
function generateCladdingOverrideParts(cfg, overrideGroups) {
  const parts = [];
  for (const group of (overrideGroups || [])) {
    if (!group || group.count <= 0) continue;
    const baseStyle = CLADDING_STYLES[group.claddingStyle];
    if (!baseStyle) continue;
    // Merge in any per-override style params before generating the etch
    // pattern, so corrugated overrides at custom sheet dimensions get the
    // right pattern on their own sheet (groups are already keyed by
    // styleParams in tallyCladdingOverrides so each variant lands here
    // separately).
    const style = effectiveCladdingStyle(baseStyle, group.styleParams);

    const pw = group.w, ph = group.h;
    const gutter = 3;
    // For larger override pieces, fewer per row; aim to keep sheet ≤ 250mm wide.
    const cols = Math.max(1, Math.floor((250 - gutter) / (pw + gutter)));
    const rows = Math.ceil(group.count / cols);
    const sheetW = Math.min(250, cols * (pw + gutter) + gutter);
    const sheetH = rows * (ph + gutter) + gutter;

    const rects = [];
    const lines = [];
    const cutouts = group.cutouts || [];
    const fixtureMarks = group.fixtureMarks || [];

    for (let i = 0; i < group.count; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const ox = gutter + c * (pw + gutter);
      const oy = gutter + r * (ph + gutter);
      // Outer cut for the piece
      rects.push({ type: 'cut', x: ox, y: oy, w: pw, h: ph, compensateKerf: false });
      // Cutouts for window/door openings that pass through the wall
      // behind this piece. Without these, the override piece would
      // block the openings it covers. Clip to the piece's bbox as a
      // floating-point safety; the tally already does the math but a
      // 1e-3 mm overshoot here would leave a free-floating sliver in
      // the laser path, so we re-clamp.
      for (const co of cutouts) {
        const cox = Math.max(0, co.x);
        const coy = Math.max(0, co.y);
        const cow = Math.min(pw - cox, co.w - (cox - co.x));
        const coh = Math.min(ph - coy, co.h - (coy - co.y));
        if (cow > 0.001 && coh > 0.001) {
          rects.push({ type: 'cut', discard: true, x: ox + cox, y: oy + coy, w: cow, h: coh, compensateKerf: false });
        }
      }
      // Etch the secondary cladding pattern. generateCladdingPattern returns
      // line segments in local (0..pw, 0..ph) coords for the given style.
      // Pass the piece's cutouts as cutOpenings so the etched pattern is
      // clipped around them — without this, the pattern lines would run
      // through the window/door cutouts and waste laser time on lines
      // that are about to be cut away anyway.
      const patLines = generateCladdingPattern(style, 0, 0, pw, ph, cutouts);
      for (const l of patLines) {
        lines.push({
          type: 'etch',
          x1: ox + l.x1, y1: oy + l.y1,
          x2: ox + l.x2, y2: oy + l.y2,
        });
      }
      for (const m of fixtureMarks) emitFixtureMarkerEtchesOnOverride(lines, m, ox, oy);
    }

    const dimsTag = `${pw.toFixed(1)}×${ph.toFixed(1)}mm`;
    const idSuffix = `_${pw.toFixed(1)}x${ph.toFixed(1)}`.replace(/\./g, '_');
    // Single-tile preview: one override piece with its etched cladding
    // pattern. Same geometry as one of the tiled cells above — including
    // the cutouts so the preview matches what gets laser-cut.
    const tileRects = [{ type: 'cut', x: 0, y: 0, w: pw, h: ph, compensateKerf: false }];
    for (const co of cutouts) {
      const cox = Math.max(0, co.x);
      const coy = Math.max(0, co.y);
      const cow = Math.min(pw - cox, co.w - (cox - co.x));
      const coh = Math.min(ph - coy, co.h - (coy - co.y));
      if (cow > 0.001 && coh > 0.001) {
        tileRects.push({ type: 'cut', discard: true, x: cox, y: coy, w: cow, h: coh, compensateKerf: false });
      }
    }
    const tileLines = (generateCladdingPattern(style, 0, 0, pw, ph, cutouts) || [])
      .map(l => ({ type: 'etch', x1: l.x1, y1: l.y1, x2: l.x2, y2: l.y2 }));
    for (const m of fixtureMarks) emitFixtureMarkerEtchesOnOverride(tileLines, m, 0, 0);
    parts.push({
      id: 'cladding_override_' + group.claddingStyle + idSuffix,
      name: `Cladding override — ${style.label} (${group.count}× · ${dimsTag})`,
      material: 'cladding',
      bboxW: sheetW, bboxH: sheetH,
      bboxOffsetX: 0, bboxOffsetY: 0,
      paths: [], rects: rects, lines: lines,
      meta: { area: 'exterior_walls', role: 'cladding_override_piece', claddingOverrideMode: 'replacement_piece' },
      tileCount: group.count,
      tileGeom: {
        bboxW: pw, bboxH: ph,
        bboxOffsetX: 0, bboxOffsetY: 0,
        paths: [], rects: tileRects, lines: tileLines,
      },
    });
  }
  return parts;
}
