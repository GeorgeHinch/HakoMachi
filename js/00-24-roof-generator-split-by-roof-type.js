'use strict';

/* =====================================================================
   ROOF GENERATOR — SPLIT BY ROOF TYPE
   ---------------------------------------------------------------------
   The old generateRoof function handled every roof style in one long
   branch chain. The dispatcher above now routes to one helper per roof
   type so fixes for parapet, flat, flat-overhang, slanted, and gabled
   roofs can be made locally without accidentally changing the others.
   ===================================================================== */

function generateParapetRoof(cfg, plan) {
  const { H, matT, tw, parapetH, roofStyle, sideLen, fbWidth } = plan;

    // 80x80mm roof piece (interior dim) with tongues on all 4 edges
    // Roof local frame: width = sideLen (depth), height = sideLen (depth)
    // Wait — roof should be sideLen x sideLen? No, it should match interior dim of building.
    // Building outer footprint: fbWidth x fbWidth-not-quite. Let me think.
    // Actually side wall body length = sideLen = depth - 2*matT. That's the interior depth.
    // Front wall body width = fbWidth = full outer width. Interior width = fbWidth - 2*matT.
    // For a parapet roof, the roof sits inside the walls, so its dimensions are interior:
    //   roof_w = fbWidth - 2*matT (interior width)
    //   roof_h = sideLen (= interior depth, already accounting for front+back wall thickness)
    const roofW = fbWidth - 2 * matT;
    const roofH = sideLen + (cfg._omitConnectionWall ? matT : 0);
    const margin = Math.max(matT * 2, 5);

    // Tongues on all 4 edges
    const tongueCountW = Math.max(2, Math.min(4, Math.floor(roofW / 30)));
    const tongueCountH = Math.max(2, Math.min(4, Math.floor(roofH / 30)));
    const topTongues = placeTongues(roofW, tw, margin, [], tongueCountW, tw / 2);
    const bottomTongues = placeTongues(roofW, tw, margin, [], tongueCountW, tw / 2);
    const leftTongues = placeTongues(roofH, tw, margin, [], tongueCountH, tw / 2);
    const rightTongues = leftTongues;

    const spec = {
      width: roofW, height: roofH, matT, kerf: cfg.kerfComp,
      edges: {
        top: { tongues: topTongues, openings: [] },
        right: { tongues: rightTongues, openings: [] },
        bottom: { tongues: bottomTongues, openings: [] },
        left: { tongues: leftTongues, openings: [] },
      }
    };
    const perimeter = buildPanelPerimeterPath(spec);

    const rects = [];
    const lines = [];
    addRoofMechRoomAndEquipment(plan, cfg, rects, lines, /*roofIsRecessed=*/true);

    return {
      id: 'roof',
      name: 'Roof (recessed)',
      material: 'core',
      bboxW: roofW + 2 * matT,
      bboxH: roofH + 2 * matT,
      bboxOffsetX: matT,
      bboxOffsetY: matT,
      paths: [{ type: 'cut', d: perimeter }, ...holePathsForList(cfg.roofHoles), ...skylightHolePaths(cfg.skylights)],
      rects: rects,
      lines: lines,
    };
}

function generateFlatRoof(cfg, plan) {
  const { H, matT, tw, parapetH, roofStyle, sideLen, fbWidth } = plan;

    // Roof sits on top of the walls, edges match the FULL footprint (includes front/back wall extents).
    // Slots on each edge to receive wall-top tongues.
    const roofW = fbWidth;     // full outer width
    const roofH = fbWidth;     // hmm, depth is what we want
    // Actually roof outer footprint = fbWidth (front-back wall full width) x sideLen + 2*matT
    // Where sideLen + 2*matT means the side wall body + the front+back wall thicknesses on each end.
    // Wait the outer footprint depth = sideLen + 2*matT = depth. So roof is fbWidth x depth.
    const rW = fbWidth;
    const rH = cfg.depth; // outer depth
    const margin = Math.max(matT * 2, 5);
    
    // Slots receive wall-top tongues.  Keep these counts and spans locked to
    // generateFrontBackWall()/generateSideWall(), which place exactly 3 roof
    // tongues on flat and flat-overhang walls.  The older dynamic slot count
    // could generate only two roof slots on short buildings, leaving one wall
    // tab with nowhere to go.
    const roofTongueCount = 3;
    const sideSlotLen = (cfg._omitConnectionWall ? (rH - matT) : (rH - 2 * matT));
    const topSlots = placeTongues(rW, tw, margin, [], roofTongueCount, tw / 2);
    const bottomSlots = topSlots;
    const sideSlots = placeTongues(sideSlotLen, tw, margin, [], roofTongueCount, tw / 2);

    const rects = [];
    const BLEED = 0.6;
    // Top edge slots
    for (const s of topSlots) {
      rects.push({ type: 'cut', x: s.start, y: -BLEED, w: s.end - s.start, h: matT + BLEED, compensateKerf: true });
    }
    // Bottom edge slots
    for (const s of bottomSlots) {
      rects.push({ type: 'cut', x: s.start, y: rH - matT, w: s.end - s.start, h: matT + BLEED, compensateKerf: true });
    }
    // Left edge slots (offset by matT for front wall thickness)
    for (const s of sideSlots) {
      const yOff = cfg._omitConnectionWall ? 0 : matT;
      rects.push({ type: 'cut', x: -BLEED, y: yOff + s.start, w: matT + BLEED, h: s.end - s.start, compensateKerf: true });
    }
    // Right edge slots
    for (const s of sideSlots) {
      const yOff = cfg._omitConnectionWall ? 0 : matT;
      rects.push({ type: 'cut', x: rW - matT, y: yOff + s.start, w: matT + BLEED, h: s.end - s.start, compensateKerf: true });
    }

    const perimeter = rectPath(0, 0, rW, rH);
    const lines = [];
    addRoofMechRoomAndEquipment(plan, cfg, rects, lines, /*roofIsRecessed=*/false);
    return {
      id: 'roof',
      name: 'Roof (flat, flush)',
      material: 'core',
      bboxW: rW, bboxH: rH,
      bboxOffsetX: 0, bboxOffsetY: 0,
      paths: [{ type: 'cut', d: perimeter }, ...holePathsForList(cfg.roofHoles), ...skylightHolePaths(cfg.skylights)],
      rects: rects,
      lines: lines,
    };
}

function generateFlatOverhangRoof(cfg, plan) {
  const { H, matT, tw, parapetH, roofStyle, sideLen, fbWidth } = plan;

    // Flat-overhang roof: same construction as the flat roof but the core
    // extends past every wall by `cfg.roofOverhang` mm on all four sides,
    // forming an eave. The walls sit inset from the roof core's outer
    // edge by O, so all slot positions get offset by O relative to the
    // plain flat case. The cladding-roof panel (built later) matches the
    // new larger footprint, so a metal-look pattern can be glued on top
    // to span the full overhang.
    const O  = Math.max(0, cfg.roofOverhang || 5);
    const rW = fbWidth + 2 * O;
    const rH = cfg.depth + 2 * O;
    const margin = Math.max(matT * 2, 5);

    // Slot placement is based on the INNER wall spans (the actual wall edge
    // lengths), not the oversized roof core.  Match the wall generators exactly:
    // generateFrontBackWall() and generateSideWall() both create 3 roof tongues
    // for flat/flat-overhang roofs.  Do not derive a smaller count from the roof
    // size or short side walls will have more tabs than this roof has slots.
    const roofTongueCount = 3;
    const sideSlotLen = (cfg._omitConnectionWall ? (cfg.depth - matT) : (cfg.depth - 2 * matT));
    const sideSlotOffset = cfg._omitConnectionWall ? 0 : matT;
    const topSlots  = placeTongues(fbWidth,     tw, margin, [], roofTongueCount, tw / 2);
    const sideSlots = placeTongues(sideSlotLen, tw, margin, [], roofTongueCount, tw / 2);

    const rects = [];
    const BLEED = 0.6;
    // Walls sit inset by O from the roof core's outer edge on every side.
    // Front/back wall slots span the full matT depth of the wall material
    // at roof-local y = O..O+matT (north) and y = O+depth-matT..O+depth
    // (south). Side wall slots have an additional matT inset along their
    // own axis to skip the front/back wall material at the building corner.
    for (const s of topSlots) {
      rects.push({ type: 'cut', x: O + s.start, y: O - BLEED, w: s.end - s.start, h: matT + 2 * BLEED, compensateKerf: true });
    }
    for (const s of topSlots) {
      rects.push({ type: 'cut', x: O + s.start, y: O + cfg.depth - matT - BLEED, w: s.end - s.start, h: matT + 2 * BLEED, compensateKerf: true });
    }
    for (const s of sideSlots) {
      rects.push({ type: 'cut', x: O - BLEED, y: O + sideSlotOffset + s.start, w: matT + 2 * BLEED, h: s.end - s.start, compensateKerf: true });
    }
    for (const s of sideSlots) {
      rects.push({ type: 'cut', x: O + fbWidth - matT - BLEED, y: O + sideSlotOffset + s.start, w: matT + 2 * BLEED, h: s.end - s.start, compensateKerf: true });
    }

    const perimeter = rectPath(0, 0, rW, rH);
    const lines = [];
    addRoofMechRoomAndEquipment(plan, cfg, rects, lines, /*roofIsRecessed=*/false);
    return {
      id: 'roof',
      name: 'Roof (flat, ' + O + 'mm overhang)',
      material: 'core',
      bboxW: rW, bboxH: rH,
      bboxOffsetX: 0, bboxOffsetY: 0,
      paths: [{ type: 'cut', d: perimeter }, ...holePathsForList(cfg.roofHoles), ...skylightHolePaths(cfg.skylights)],
      rects: rects,
      lines: lines,
    };
}

function generateSlantedRoof(cfg, plan) {
  const { H, matT, tw, parapetH, roofStyle, sideLen, fbWidth } = plan;

    const pitch    = cfg.roofPitch || 10;
    const slopeDir = cfg.roofSlopeDirection || 'back';
    const nsAxis   = (slopeDir === 'front' || slopeDir === 'back');

    // Use OUTER building dimensions so the panel spans wall-face to wall-face
    const span0    = nsAxis ? cfg.depth : cfg.width;
    const perpLen0 = nsAxis ? cfg.width  : cfg.depth;
    const slantLen0 = Math.hypot(span0, pitch);

    // Overhang: eave extends along slope run; verge extends perpendicular
    const ohFB = cfg.roofOverhangFB || 0;
    const ohEW = cfg.roofOverhangEW || 0;
    const ohEave  = nsAxis ? ohFB : ohEW;
    const ohVerge = nsAxis ? ohEW : ohFB;
    const ohSlant = ohEave > 0 ? ohEave * (slantLen0 / span0) : 0;

    // Total panel dimensions — both eave ends overhang, both verge sides overhang
    const slantLen = slantLen0 + 2 * ohSlant;
    const perpLen  = perpLen0  + 2 * ohVerge;

    // Tongue/slot joints at the eave edges: for NS-axis slope, the FB walls
    // (front and back) have flat tops carrying tongues that key into slot
    // rows in the roof panel here. Both FB walls' top edges sit at the same
    // horizontal positions in the roof's perpendicular direction (along
    // perpLen = fbWidth), and use the same `placeTongues(fbWidth, tw,
    // margin, [], 3, tw/2)` layout as generateFrontBackWall's topTongues.
    //
    // The walls are inset from the roof's outer perimeter by `ohSlant` on
    // each eave end (the eave overhang) and `ohVerge` on each verge side.
    // So the front-wall row sits at roof y = ohSlant and the back-wall row
    // sits at roof y = slantLen − ohSlant − matT, with each slot rect's x
    // shifted by ohVerge to land at the wall's actual span. BLEED widens
    // the y dimension slightly so the vertical wall tongue passes through
    // the tilted roof's slot without binding at the slope angle.
    //
    // EW-axis slope skipped here — that case puts the trapezoidal walls on
    // the FB axis and the flat-topped walls on the side axis; not all
    // EW-axis geometry is finished (the side walls don't yet rise to
    // H+pitch on the high-eave end), so we don't try to wire the joints
    // for it. NS-axis is the common case and matches the user's setup.
    const rects = [];
    const lines = [];
    if (nsAxis) {
      const matT = plan.matT;
      const tw = plan.tw;
      const slotMargin = Math.max(matT * 2, 5);
      const BLEED = 0.6;
      // NOTE: NO front/back eave slot rows for a slanted roof. The FB
      // walls have flat horizontal tops, and a tongue sticking straight
      // up from a horizontal top would meet this tilted roof at the
      // SLOPE angle rather than perpendicular — a bad, wedge-y joint.
      // generateFrontBackWall correspondingly omits the FB walls' top
      // tongues for the slanted style; the FB walls simply rest against
      // the underside of the roof and get glued there. We still keep
      // the VERGE slot rows below — those mate with the SIDE walls'
      // slanted-top tongues, which DO follow the roof's slope and
      // enter their slots perpendicular to the roof plane.

      // Verge slot rows: the trapezoidal SIDE walls (east, west) carry
      // perpendicular-to-edge tongues on their slanted tops (added in
      // buildSlantedWallPath's slanted-top branch), and those need a
      // matching slot row on each verge of the roof.
      //
      // Position mapping from wall-x to roof-y:
      //   Side wall x runs from 0 (3D z=matT, just inside front wall) to
      //   sideLen (3D z=depth-matT, just inside back wall). In the roof's
      //   unrolled y, those map to y = ohSlant + matT and
      //   y = ohSlant + slantLen0 − matT respectively. So roof-y for a
      //   wall-x of `x` is approximately ohSlant + matT + x (using
      //   slantLen0/depth ≈ 1; for typical pitch/depth < 0.25 the error
      //   is under 3% and well within the BLEED tolerance).
      //
      //   The same `placeTongues(sideLen, tw, slotMargin, [], 3, tw/2)`
      //   call that the side wall uses for its top tongues gives us slot
      //   start/end positions in the wall's x-axis; offset them by
      //   ohSlant + matT and they land on the roof's verge.
      //
      // West verge sits at roof x = ohVerge (= the west wall's outer
      // face). East verge sits at roof x = perpLen − ohVerge (= the east
      // wall's outer face). The slot rect extends matT INWARD from there
      // to cover the wall material's thickness, plus BLEED on the inside
      // for the same slope-angle clearance the eave slots use; the
      // outward end clamps to the roof's perimeter when ohVerge = 0.
      const vergeSlots = placeTongues(sideLen, tw, slotMargin, [], 3, tw / 2);
      {
        // West verge — slots at roof x ≈ ohVerge (the west wall's outer face)
        let x = ohVerge - BLEED;
        let w = matT + 2 * BLEED;
        if (x < 0) { w += x; x = 0; }
        for (const s of vergeSlots) {
          rects.push({
            type: 'cut',
            x: x, y: ohSlant + matT + s.start,
            w: w, h: s.end - s.start,
            compensateKerf: true,
          });
        }
      }
      {
        // East verge — slots at roof x ≈ perpLen − ohVerge − matT (east wall material)
        let x = perpLen - ohVerge - matT - BLEED;
        let w = matT + 2 * BLEED;
        if (x + w > perpLen) { w = perpLen - x; }
        for (const s of vergeSlots) {
          rects.push({
            type: 'cut',
            x: x, y: ohSlant + matT + s.start,
            w: w, h: s.end - s.start,
            compensateKerf: true,
          });
        }
      }
    }

    const perimeter = rectPath(0, 0, perpLen, slantLen);

    const highLabel = { front:'front high', back:'back high', east:'east high', west:'west high' }[slopeDir];
    const corePanel = {
      id: 'roof', name: `Roof (slanted — ${highLabel})`,
      material: 'core',
      bboxW: perpLen, bboxH: slantLen, bboxOffsetX: 0, bboxOffsetY: 0,
      paths: [{ type: 'cut', d: perimeter }, ...holePathsForList(cfg.roofHoles), ...skylightHolePaths(cfg.skylights)],
      rects: rects,
      lines: lines,
    };
    const claddingPanel = generateRoofCladdingPanel('roof_cladding', `Roof Cladding (slanted — ${highLabel})`,
      perpLen, slantLen, CLADDING_STYLES[cfg.roofCladdingStyle || cfg.claddingStyle], cfg);
    if (claddingPanel) {
      claddingPanel.lines.push(...rooftopEquipmentEtchLines(plan, ohVerge, ohSlant));
    }
    // Skylight openings cut through BOTH the roof core and the roof cladding.
    // The slanted roof stores skylight coords directly in this unrolled roof
    // panel frame, so the cladding uses the same rectangular cuts as the core.
    if (claddingPanel && cfg.skylights && cfg.skylights.length > 0) {
      claddingPanel.paths.push(...skylightHolePaths(cfg.skylights));
    }
    return claddingPanel ? [corePanel, claddingPanel] : corePanel;
}


function gableRoofAngleLockStations(cfg, plan, perpLen, ohVerge) {
  const matT = (cfg && cfg.coreThickness) || (plan && plan.matT) || 1.5;
  const usableStart = Math.max(8, ohVerge + matT + 6);
  const usableEnd = Math.max(usableStart + 1, perpLen - usableStart);
  const usableLen = Math.max(1, usableEnd - usableStart);
  const desiredSpacing = 70;
  const count = Math.max(1, Math.min(5, Math.floor(usableLen / desiredSpacing) + 1));

  const trussKeepout = [];
  const t = cfg && cfg.trusses;
  if (t && t.enabled) {
    const ridge = effectiveRidgeDir(cfg);
    const frame = trussInteriorFrame(cfg, plan);
    const lengthAlong = ridge === 'ew' ? frame.width : frame.depth;
    const spacing = Math.max(5, t.spacing || 30);
    const flangeW = (t.supportFlangeW != null) ? t.supportFlangeW : 4;
    const margin = t.supports ? flangeW / 2 : 0;
    const trussPositions = trussSupportPositions(lengthAlong, spacing, margin);
    const baseOffset = (cfg.roofStyle === 'parapet_gable') ? 0 : (ohVerge + matT);
    for (const p of trussPositions) trussKeepout.push(baseOffset + p);
  }

  function isClear(x) {
    return trussKeepout.every(tx => Math.abs(tx - x) >= 8);
  }

  const stations = [];
  for (let i = 0; i < count; i++) {
    let x = (count === 1) ? (usableStart + usableEnd) / 2 : usableStart + (usableLen * i) / (count - 1);
    if (!isClear(x) && trussKeepout.length) {
      // Shift away from the closest truss station. Keep the move small and
      // clamp back inside the hidden underside zone.
      let closest = trussKeepout[0];
      for (const tx of trussKeepout) if (Math.abs(tx - x) < Math.abs(closest - x)) closest = tx;
      const dir = (x >= closest) ? 1 : -1;
      const candidates = [x + dir * 10, x - dir * 10, x + 16, x - 16]
        .map(v => Math.max(usableStart, Math.min(usableEnd, v)));
      const found = candidates.find(isClear);
      if (found != null) x = found;
    }
    if (isClear(x) || !trussKeepout.length) {
      if (stations.every(s => Math.abs(s - x) > 12)) stations.push(x);
    }
  }

  if (!stations.length) {
    const fallback = (usableStart + usableEnd) / 2;
    stations.push(fallback);
  }
  return stations;
}

function generateGableRoofAngleLockOutline(edgeLen, roofCos, roofSin, tabAlong, tabDepth, tabCenterFromApex, webDepth = null) {
  // Underside roof-angle gusset. The TOP contact edges follow the exact roof
  // pitch and the tabs are centered from the exact roof-panel slot position.
  //
  // Earlier versions made the whole part a literal triangle whose height was
  // determined by the roof pitch. On shallow parapet-gable roofs that produced
  // a nearly-flat piece; the tab positions were mathematically near the slots,
  // but the part had no useful vertical body and was very hard to fit/interpret.
  //
  // This version keeps the roof-contact V exact, then extends a deeper web
  // downward below that V. The tabs still sit on the true roof-slope edges.
  const run = edgeLen * roofCos;
  const rise = edgeLen * roofSin;
  const webH = Math.max(webDepth == null ? 0 : webDepth, rise + 4.5, tabDepth + 3.2);

  const L = { x: 0, y: rise };
  const A = { x: run, y: 0 };
  const R = { x: 2 * run, y: rise };
  const RB = { x: 2 * run, y: webH };
  const LB = { x: 0, y: webH };

  function slopedEdgeWithOutwardTab(a, b, tabCenterFromA) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.max(0.001, Math.hypot(dx, dy));
    const ux = dx / len, uy = dy / len;
    // For this CCW outline, exterior of the top V is the right-hand normal.
    const nx = uy;
    const ny = -ux;

    const half = Math.min(len * 0.28, Math.max(0.7, tabAlong / 2));
    const center = Math.max(half + 0.3, Math.min(len - half - 0.3, tabCenterFromA));
    const d = Math.max(0.6, tabDepth);

    const p1 = { x: a.x + ux * (center - half), y: a.y + uy * (center - half) };
    const p2 = { x: a.x + ux * (center + half), y: a.y + uy * (center + half) };
    const q1 = { x: p1.x + nx * d, y: p1.y + ny * d };
    const q2 = { x: p2.x + nx * d, y: p2.y + ny * d };

    return [a, p1, q1, q2, p2, b];
  }

  const tabFromApex = Math.max(0.3, Math.min(edgeLen - 0.3, tabCenterFromApex));
  const leftTabFromL = edgeLen - tabFromApex;
  const rightTabFromA = tabFromApex;

  const leftEdge = slopedEdgeWithOutwardTab(L, A, leftTabFromL);
  const rightEdge = slopedEdgeWithOutwardTab(A, R, rightTabFromA);

  return [
    LB,
    L,
    ...leftEdge.slice(1),
    ...rightEdge.slice(1),
    RB,
  ];
}

function pointsToPath(pts, ox = 0, oy = 0) {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(ox + p.x).toFixed(3)},${(oy + p.y).toFixed(3)}`).join(' ') + ' Z';
}

function generateGableRoofAngleLockParts(cfg, plan, stationCount, halfSpan, pitch, ridgeDir, slotSpec = null) {
  if (!stationCount || stationCount <= 0) return [];
  const matT = (cfg && cfg.coreThickness) || (plan && plan.matT) || 1.5;
  const clearance = (cfg && cfg.slotClearance != null) ? Number(cfg.slotClearance) : 0.08;
  const slantLen = slotSpec && slotSpec.slantLen ? Number(slotSpec.slantLen) : Math.hypot(halfSpan, pitch);
  const roofCos = halfSpan / Math.max(0.001, slantLen);
  const roofSin = pitch / Math.max(0.001, slantLen);

  const tabAlong = slotSpec && (slotSpec.tabLen || slotSpec.slotLen)
    ? Number(slotSpec.tabLen || slotSpec.slotLen)
    : Math.max(3.2, Math.min(5.2, Math.hypot(Math.max(5, Math.min(11, halfSpan * 0.28)), Math.max(0.5, Math.min(8, halfSpan ? Math.max(5, Math.min(11, halfSpan * 0.28)) * (pitch / halfSpan) : 2))) * 0.32));
  const tabDepth = slotSpec && slotSpec.slotW
    ? Number(slotSpec.slotW)
    : Math.max(1.0, matT + clearance);

  // Distance from the ridge/apex to the centre of the roof-panel slot along
  // the roof slope. This is the critical alignment value.
  const slotY = slotSpec && slotSpec.slotY != null ? Number(slotSpec.slotY) : Math.max(0, slantLen - tabAlong - matT);
  const slotLenForCenter = slotSpec && slotSpec.slotLen ? Number(slotSpec.slotLen) : tabAlong;
  const tabCenterFromApex = Math.max(tabAlong / 2 + 0.3, slantLen - (slotY + slotLenForCenter / 2));

  // Keep the roof-contact edge compact, but make the vertical web deep enough
  // to be a real gusset. This avoids the shallow-roof failure where the lock
  // became almost flat even though the slot math was correct.
  const edgeLen = Math.max(tabCenterFromApex + tabAlong / 2 + 1.2, tabAlong + 2.0, 5.0);
  const webDepth = Math.max(5.5, matT * 3.4, pitch > 0 ? Math.min(9, pitch + matT * 1.5) : 5.5);
  const pts = generateGableRoofAngleLockOutline(edgeLen, roofCos, roofSin, tabAlong, tabDepth, tabCenterFromApex, webDepth);

  const minX = Math.min(...pts.map(p => p.x));
  const maxX = Math.max(...pts.map(p => p.x));
  const minY = Math.min(...pts.map(p => p.y));
  const maxY = Math.max(...pts.map(p => p.y));
  const cellW = maxX - minX;
  const cellH = maxY - minY;
  const apexX = edgeLen * roofCos;
  const apexY = 0;
  const gutter = 4;
  const cols = Math.max(1, Math.min(stationCount, Math.floor((250 - gutter) / (cellW + gutter))));
  const rows = Math.ceil(stationCount / cols);
  const sheetW = cols * (cellW + gutter) + gutter;
  const sheetH = rows * (cellH + gutter) + gutter;
  const paths = [];
  const lines = [];

  for (let i = 0; i < stationCount; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const ox = gutter + c * (cellW + gutter) - minX;
    const oy = gutter + r * (cellH + gutter) - minY;
    paths.push({ type: 'cut', d: pointsToPath(pts, ox, oy) });
    lines.push({ type: 'etch', x1: ox + apexX, y1: oy + apexY + 0.25, x2: ox + apexX, y2: oy + Math.max(apexY + 0.75, maxY - minY - 0.4) });
  }

  return [createPart({
    id: 'gable_roof_angle_locks',
    name: `Gable roof angle-locks with aligned tabs — ${stationCount}× (${ridgeDir} ridge)`,
    material: 'core',
    bboxW: sheetW,
    bboxH: sheetH,
    bboxOffsetX: 0,
    bboxOffsetY: 0,
    paths,
    rects: [],
    lines,
    tileCount: stationCount,
    tileGeom: {
      bboxW: cellW,
      bboxH: cellH,
      bboxOffsetX: -minX,
      bboxOffsetY: -minY,
      paths: [{ type: 'cut', d: pointsToPath(pts, -minX, -minY) }],
      rects: [],
      lines: [{ type: 'etch', x1: apexX - minX, y1: apexY + 0.25 - minY, x2: apexX - minX, y2: Math.max(apexY + 0.75, maxY - 0.4) - minY }],
    },
    meta: {
      area: 'roof',
      role: 'roof_angle_lock',
      slotY,
      slotLen: slotSpec && slotSpec.slotLen ? Number(slotSpec.slotLen) : tabAlong,
      tabLen: tabAlong,
      slotW: tabDepth,
      slotEndClearance: slotSpec && slotSpec.slotEndClearance ? Number(slotSpec.slotEndClearance) : 0,
      tabCenterFromApex,
      roofPitchRatio: roofSin / Math.max(0.0001, roofCos),
    },
    assemblyNote: `Deep underside gable-angle gussets. The top V follows the exact roof pitch. The tab center is derived from the roof slot center, and the roof slot includes extra along-slope end clearance so the protruding tab does not sit 1–2 mm away from the slot. The centre etched line points toward the ridge.`
  })];
}

function generateGabledRoof(cfg, plan) {
  const { H, matT, tw, parapetH, roofStyle, sideLen, fbWidth } = plan;

    const pitch    = cfg.roofPitch || 10;
    const ridgeDir = effectiveRidgeDir(cfg);
    const ewRidge  = (ridgeDir === 'ew');
    // For parapet_gable, no roof overhang — the roof sits BEHIND the
    // parapet walls (where present) or flush against eave-wall tops
    // (where not). Forcing zero overhang keeps the geometry simple at
    // this MVP stage; user-controlled overhang is a later enhancement.
    // Verge tabs are also suppressed for any wall that has a parapet,
    // because that wall is a flat-top extension (no triangular peak
    // for tabs to key into) — see the gableHasTabs flag below.
    const isParapetGabled = (roofStyle === 'parapet_gable');

    // Use OUTER building dimensions: each slope spans from outer wall face to ridge centre.
    // For parapet_gable, the roof is RECESSED inside the walls (the
    // parapets cover the verge ends, and on 'all' mode the eave ends
    // too). Subtract 2*matT on both axes so the roof slides down inside
    // the cavity, sitting at the eave height against either the
    // parapet inner face or the eave wall top. Keeps the MVP geometry
    // uniform across all three parapetSides modes; refining the
    // dimensions for non-parapet eave walls (where the roof could
    // technically extend out to the wall's outer face) is a later
    // enhancement.
    const halfSpan0 = isParapetGabled
                      ? (ewRidge ? (cfg.depth - 2 * matT) / 2 : (cfg.width - 2 * matT) / 2)
                      : (ewRidge ? cfg.depth / 2 : cfg.width / 2);
    const perpLen0  = isParapetGabled
                      ? (ewRidge ? cfg.width - 2 * matT : cfg.depth - 2 * matT)
                      : (ewRidge ? cfg.width : cfg.depth);
    const slantLen0 = Math.hypot(halfSpan0, pitch);

    // Overhang: eave = low end (beyond wall face); verge = ridge-end sides.
    // Forced zero for parapet_gable — the roof can't extend past walls
    // that are taller than it. User-set overhang values are ignored
    // here (the field is hidden in the UI for this style anyway).
    const ohFB = isParapetGabled ? 0 : (cfg.roofOverhangFB || 0);
    const ohEW = isParapetGabled ? 0 : (cfg.roofOverhangEW || 0);
    const ohEave  = ewRidge ? ohFB : ohEW;
    const ohVerge = ewRidge ? ohEW : ohFB;
    const ohEaveS = ohEave > 0 ? ohEave * (slantLen0 / halfSpan0) : 0;

    // Each panel: eave end extends by ohEaveS; ridge end has no overhang;
    //             both verge sides extend by ohVerge
    const slantLen = slantLen0 + ohEaveS;
    const perpLen  = perpLen0  + 2 * ohVerge;
    const margin   = Math.max(matT * 2, 5);

    // No tongue-slot joints on any edge — panels rest on wall tops and meet at the ridge.
    // Exception: VERGE slots at the gable-wall positions, which receive the tabs on the
    // triangular gable wall tops.
    // When ohVerge === 0 the slot lands on the panel edge → embed as an open notch in
    // the perimeter path (same approach as the floor panel).
    // When ohVerge  >  0 the slot is interior → use a closed-rect cut.
    // For parapet_gable, verge slots are SUPPRESSED entirely: the
    // gable-end walls under this style are always flat-top parapets
    // (not triangular peaks), so there's no peak-edge with tabs to slot
    // into. The roof's verge edges sit behind the parapet inner face
    // and are glued.
    const vergeSlantLen = Math.hypot(halfSpan0, pitch);
    const vergeSlotCount = isParapetGabled
                           ? 0
                           : Math.max(2, Math.min(3, Math.floor(vergeSlantLen / 25)));
    const vergeSlots = isParapetGabled
                       ? []
                       : placeTongues(vergeSlantLen, tw, margin, [], vergeSlotCount, tw / 2);

    // parapet_gable EAVE slots: only when the eave walls don't have
    // parapets (i.e. in 'fb' or 'ew' modes, not 'all'). The eave walls
    // sit flat at H and the roof's bottom edge rests on them; the
    // tongues on the wall top key into these slots so the roof aligns
    // before glue-up. Walls under 'all' mode (eave walls also have
    // parapets) skip this — the roof slides down behind the parapet
    // and is glued.
    //
    // Same placeTongues call as the wall generators (interior length
    // = perpLen for both side and FB eave walls) so the slot positions
    // are bit-identical to the tongue positions and the joint mates
    // without sub-mm misalignment. The slot extends slightly past the
    // panel's bottom edge (matT + BLEED) so the cut is clean at the
    // edge and the tongue can engage even after kerf compensation.
    //
    // Geometric caveat: the panel is tilted at angle θ to horizontal,
    // and the tongue rises vertically from the wall top — so the
    // tongue passes through the panel obliquely. The vertical extent
    // of the tongue (matT) is shorter than the panel's slant thickness
    // (matT/cos θ); the tongue won't fully poke through. For typical
    // pitches (~10mm rise / 30mm half-span → θ≈18°) the under-engagement
    // is fractions of a mm and glue takes up the rest. Steeper pitches
    // will start to feel loose; a future enhancement can lengthen the
    // parapet_gable verge joinery: panel verge edges grow tongues
    // sticking OUT toward the gable walls, and the gable walls accept
    // them through INTERIOR slot paths cut along the verge line.
    //
    // This is the "side that slants" the user pointed at — in 3D the
    // verge edge runs from eave (low) up to ridge (high) along the
    // gable wall, at the slope angle. Slots oriented along this line
    // hold the panel at that angle. The eave and ridge sides aren't
    // tongued: the eave meets its wall at the pitch angle (the panel
    // tilts away from horizontal across that joint), and the ridge
    // meets the other panel at twice that angle — both are too far
    // from perpendicular for a simple slab tongue to hold.
    //
    // For PLAIN gabled, the same joint works the opposite way: the
    // wall has a triangular peak in its PERIMETER and slope-tabs on
    // those sloping perimeter edges; the panel's verge edge has
    // matching slot notches. That can't work here because parapet_gable
    // gable walls have flat parapet tops (no sloping perimeter edge),
    // so the joinery direction inverts: tongues out from the panel,
    // slots cut INTERIOR to the wall along the now-hidden verge line.
    //
    // Both panel and wall use the SAME placeTongues call against
    // vergeSlantLen so positions match bit-for-bit. The dihedral angle
    // along the verge between a vertical wall and a panel tilted at θ
    // is 90° (the panel sticks out perpendicular to the wall — a
    // surprising-but-true result from the cross-product geometry), so
    // the tongue's natural direction in panel plane carries it
    // straight through the wall thickness, perpendicular to the wall
    // face. Slot orientation matches the verge slope.
    const vergeTongueCount = Math.max(2, Math.min(4, Math.floor(vergeSlantLen / 25)));
    const vergeTongues = isParapetGabled
                         ? placeTongues(vergeSlantLen, tw, margin, [], vergeTongueCount, tw / 2)
                         : [];

    const slopeLabels = ewRidge ? ['Front slope', 'Back slope'] : ['East slope', 'West slope'];

    function makeGablePanelParts(id, name) {
      let perimeter;
      const rects = [];

      if (ohVerge === 0 && vergeSlots.length > 0) {
        // ---- Plain gabled, no overhang: open-edge notches in the
        // perimeter path (panel verge edges INDENT inward by matT to
        // receive the wall's sloping perimeter tabs).
        // Top edge (left→right)
        let d = `M 0,0 L ${perpLen.toFixed(3)},0`;

        // Right edge (top→bottom) — right-verge notches indent LEFT by matT
        let ry = 0;
        for (const s of vergeSlots) {
          const y1 = ohEaveS + s.start, y2 = ohEaveS + s.end;
          if (y1 > ry) d += ` L ${perpLen.toFixed(3)},${y1.toFixed(3)}`;
          d += ` L ${(perpLen - matT).toFixed(3)},${y1.toFixed(3)}`
             + ` L ${(perpLen - matT).toFixed(3)},${y2.toFixed(3)}`
             + ` L ${perpLen.toFixed(3)},${y2.toFixed(3)}`;
          ry = y2;
        }
        d += ` L ${perpLen.toFixed(3)},${slantLen.toFixed(3)}`;

        // Bottom edge (right→left)
        d += ` L 0,${slantLen.toFixed(3)}`;

        // Left edge (bottom→top) — left-verge notches indent RIGHT by matT
        let ly = slantLen;
        for (const s of [...vergeSlots].reverse()) {
          const y1 = ohEaveS + s.start, y2 = ohEaveS + s.end;
          if (y2 < ly) d += ` L 0,${y2.toFixed(3)}`;
          d += ` L ${matT.toFixed(3)},${y2.toFixed(3)}`
             + ` L ${matT.toFixed(3)},${y1.toFixed(3)}`
             + ` L 0,${y1.toFixed(3)}`;
          ly = y1;
        }
        d += ` L 0,0 Z`;
        perimeter = d;

      } else if (vergeTongues.length > 0) {
        // ---- parapet_gable: verge edges PROTRUDE outward by matT at
        // each tongue position. Panel y coords map to slant-distance
        // s in [0, vergeSlantLen] by y = slantLen − s — i.e. s=0 is
        // the eave end (panel y=slantLen) and s=vergeSlantLen is the
        // ridge end (panel y=0). placeTongues returned positions in s;
        // we convert to panel y for the perimeter walk.
        //
        // Kerf convention matches buildWallPath: tongue path is drawn
        // slightly OUTSIDE the desired final dimension (tk = −kerf),
        // and the laser cut eats it back to spec.
        const kerf = cfg.kerfComp || 0;
        const tk = -kerf;
        // Pre-convert s-ranges to panel-y ranges and re-sort top→bottom
        const rightTongues = vergeTongues.map(t => ({
          y1: slantLen - t.end + tk,  // higher on panel (smaller y)
          y2: slantLen - t.start - tk, // lower on panel (larger y)
        })).sort((a, b) => a.y1 - b.y1);
        const leftTongues = [...rightTongues]; // mirror — same y positions, opposite side

        let d = `M 0,0 L ${perpLen.toFixed(3)},0`;

        // Right edge (top→bottom): protrude RIGHT to perpLen+matT at each tongue
        let ry = 0;
        for (const t of rightTongues) {
          if (t.y1 > ry) d += ` L ${perpLen.toFixed(3)},${t.y1.toFixed(3)}`;
          d += ` L ${(perpLen + matT).toFixed(3)},${t.y1.toFixed(3)}`
             + ` L ${(perpLen + matT).toFixed(3)},${t.y2.toFixed(3)}`
             + ` L ${perpLen.toFixed(3)},${t.y2.toFixed(3)}`;
          ry = t.y2;
        }
        d += ` L ${perpLen.toFixed(3)},${slantLen.toFixed(3)}`;
        d += ` L 0,${slantLen.toFixed(3)}`;

        // Left edge (bottom→top): protrude LEFT to -matT at each tongue
        let ly = slantLen;
        for (const t of [...leftTongues].reverse()) {
          if (t.y2 < ly) d += ` L 0,${t.y2.toFixed(3)}`;
          d += ` L ${(-matT).toFixed(3)},${t.y2.toFixed(3)}`
             + ` L ${(-matT).toFixed(3)},${t.y1.toFixed(3)}`
             + ` L 0,${t.y1.toFixed(3)}`;
          ly = t.y1;
        }
        d += ` L 0,0 Z`;
        perimeter = d;

      } else {
        // ---- Plain gabled with overhang OR no joinery: simple rect
        // plus interior verge slot rects (when applicable).
        perimeter = rectPath(0, 0, perpLen, slantLen);
        const lx = ohVerge;               // left slot starts at the gable wall outer face
        const rx = perpLen - ohVerge - matT; // right slot starts at gable wall inner face
        for (const s of vergeSlots) {
          rects.push({ type:'cut', x: lx, y: ohEaveS + s.start,
                       w: matT, h: s.end - s.start, compensateKerf: true });
          rects.push({ type:'cut', x: rx, y: ohEaveS + s.start,
                       w: matT, h: s.end - s.start, compensateKerf: true });
        }
      }

      // Bbox grows on left/right when verge tongues protrude
      const tongueOverhang = (vergeTongues.length > 0) ? matT : 0;
      return { id, name, material: 'core',
               bboxW: perpLen + 2 * tongueOverhang,
               bboxH: slantLen,
               bboxOffsetX: tongueOverhang,
               bboxOffsetY: 0,
               paths: [{ type: 'cut', d: perimeter }],
               rects, lines: [] };
    }

    const panel0 = makeGablePanelParts('roof_slope0', `Roof ${slopeLabels[0]} (gabled ${ridgeDir} ridge)`);
    const panel1 = makeGablePanelParts('roof_slope1', `Roof ${slopeLabels[1]} (gabled ${ridgeDir} ridge)`);

    // Small underside angle-lock brackets. Each bracket is a tiny triangular
    // core piece installed perpendicular to the ridge. Matching narrow slots
    // are cut into both roof-core panels close to the ridge where they will be
    // covered by the roof cladding/ridge cap, so the locator cuts should not
    // be visible on the final model. Stations deliberately avoid truss
    // centrelines when trusses are enabled.
    const angleLockStations = gableRoofAngleLockStations(cfg, plan, perpLen, ohVerge);
    const angleLockClearance = (cfg.slotClearance != null) ? Number(cfg.slotClearance) : 0.08;
    const angleLockSlotW = Math.max(matT + 0.12, matT + angleLockClearance);

    // The lock tab and the roof slot need two related but not identical sizes.
    // The tab is the physical protrusion on the lock piece. The roof slot gets
    // extra length along the roof slope so a 1–2 mm visual/assembly offset does
    // not leave the tab missing the slot. Previously the tight slot and the
    // protruding tab could sit just apart on the panel preview.
    const angleLockTabLen = Math.max(3.2, Math.min(5.2, matT * 2.6));
    const angleLockSlotEndClearance = Math.max(0.8, Math.min(1.4, matT * 0.75));
    const angleLockSlotLen = angleLockTabLen + 2 * angleLockSlotEndClearance;

    // Keep the slot close to the ridge. The tab center is derived from the
    // slot center, so the lock and panel now share one along-slope datum.
    const angleLockRidgeInset = Math.max(0.2, Math.min(0.5, matT * 0.2));
    const angleLockSlotY = Math.max(0.2, slantLen - angleLockSlotLen - angleLockRidgeInset);
    const angleLockSlotSpec = {
      slantLen,
      slotY: angleLockSlotY,
      slotLen: angleLockSlotLen,
      tabLen: angleLockTabLen,
      slotEndClearance: angleLockSlotEndClearance,
      slotW: angleLockSlotW,
    };
    for (const st of angleLockStations) {
      const x = st - angleLockSlotW / 2;
      if (x < 0.3 || x + angleLockSlotW > perpLen - 0.3) continue;
      const slot = { type: 'cut', x, y: angleLockSlotY, w: angleLockSlotW, h: angleLockSlotLen, compensateKerf: true };
      panel0.rects.push({ ...slot });
      panel1.rects.push({ ...slot });
      panel0.lines.push({ type: 'etch', x1: st - 2.5, y1: angleLockSlotY - 0.8, x2: st + 2.5, y2: angleLockSlotY - 0.8 });
      panel1.lines.push({ type: 'etch', x1: st - 2.5, y1: angleLockSlotY - 0.8, x2: st + 2.5, y2: angleLockSlotY - 0.8 });
    }

    // Matching skylight cut paths for the single folded roof-cladding piece.
    // panel0 lives on the first half of the folded cladding (eave→ridge);
    // panel1 is mirrored onto the second half (ridge→opposite eave).
    const claddingSkylightPaths = [];
    const claddingRidgeGap = 2 * matT * Math.tan(Math.atan2(pitch, halfSpan0));
    const claddingTotalH = 2 * slantLen + claddingRidgeGap;

    // Skylights on a gabled roof: place each onto whichever slope panel
    // its CENTRE point lies on, transforming from footprint (x, y) to
    // panel (u, v) coords. Until this branch was added, gabled roofs
    // silently dropped all cfg.skylights — the user would drop one in
    // the rooftop placement panel and it would never appear on the
    // laser output (and if the building had wings with a flat or
    // parapet roof, the same skylights would leak onto those wing roofs
    // until the buildWingCfg fix). Only the flat / parapet / slanted
    // branches above piped skylights through.
    //
    // Geometry: the panel's u-axis runs along the ridge (= perpLen),
    // its v-axis from eave (v=0) to ridge (v=slantLen). A skylight
    // whose footprint dimensions are (w, h) is rectangular when
    // projected onto the panel plane — but the dimension along the
    // slope stretches by 1/cos θ = slantLen0/halfSpan0 because the
    // panel is tilted at θ. The dimension across the ridge is
    // unchanged. The eave overhang ohEaveS shifts v downward (v=0 is
    // the eave overhang edge, the wall is at v=ohEaveS), and the
    // verge overhang ohVerge shifts u (u=0 is the verge overhang edge,
    // the gable wall is at u=ohVerge).
    //
    // Skylights whose footprint straddles the ridge are not split —
    // the centre's side determines the whole assignment. A skylight
    // wider than half the span across the ridge would produce a cut
    // that extends past the panel's ridge edge; this is left for the
    // user to handle (don't centre a skylight on the ridge).
    if (cfg.skylights && cfg.skylights.length > 0) {
      const slopeStretch = slantLen0 / halfSpan0;
      for (const sky of cfg.skylights) {
        if (!sky || !(sky.w > 0) || !(sky.h > 0)) continue;
        let target, u, v, wPanel, hPanel;
        if (ewRidge) {
          // ridge-ew: ridge runs east-west; perpLen along cfg.width,
          // slope axis = y. Front slope = small-y half (panel0),
          // back slope = large-y half (panel1).
          const isFront = sky.y < halfSpan0;
          target = isFront ? panel0 : panel1;
          const d_h = isFront ? sky.y : (cfg.depth - sky.y);  // horiz dist eave→centre
          wPanel = sky.w;                       // along ridge, unchanged
          hPanel = sky.h * slopeStretch;        // along slope, stretched
          u = sky.x + ohVerge - wPanel / 2;
          v = ohEaveS + d_h * slopeStretch - hPanel / 2;
        } else {
          // ridge-ns: ridge runs north-south; perpLen along cfg.depth,
          // slope axis = x. East slope = large-x half (panel0),
          // west slope = small-x half (panel1).
          const isEast = sky.x >= halfSpan0;
          target = isEast ? panel0 : panel1;
          const d_h = isEast ? (cfg.width - sky.x) : sky.x;
          wPanel = sky.h;                       // along ridge (=y), unchanged
          hPanel = sky.w * slopeStretch;        // along slope (=x), stretched
          u = sky.y + ohVerge - wPanel / 2;
          v = ohEaveS + d_h * slopeStretch - hPanel / 2;
        }
        const skyCutPath = rectPath(u, v, wPanel, hPanel);
        target.paths.push({ type: 'cut', d: skyCutPath });

        // The gabled roof cladding is generated as one folded piece rather
        // than two separate slope pieces, so duplicate the same skylight hole
        // onto the correct half of that folded cladding. The first slope
        // uses the same local y as the core panel; the second slope is flipped
        // from the opposite eave back toward the ridge, leaving the extra
        // ridge-wrap gap uncut.
        if (target === panel0) {
          claddingSkylightPaths.push({ type: 'cut', d: skyCutPath });
        } else {
          claddingSkylightPaths.push({ type: 'cut', d: rectPath(u, claddingTotalH - (v + hPanel), wPanel, hPanel) });
        }
      }
    }

    const styleSpec = CLADDING_STYLES[cfg.roofCladdingStyle || cfg.claddingStyle];
    const combinedClad = styleSpec
      ? generateGabledRoofCladding(perpLen, slantLen, halfSpan0, pitch, matT, styleSpec, ridgeDir)
      : null;
    // Add rooftop equipment placement marks to the cladding, not the core.
    // For folded gabled cladding, these are placed on the first slope panel
    // in the same local developed frame used by the editor's roof plan.
    if (combinedClad) {
      combinedClad.lines.push(...rooftopEquipmentEtchLines(plan, ohVerge, 0));
    }
    // Add matching cut-through holes to the folded roof cladding for every
    // skylight cut into the gabled roof core panels.
    if (combinedClad && claddingSkylightPaths.length > 0) {
      combinedClad.paths.push(...claddingSkylightPaths);
    }

    const parts = [panel0, panel1];
    parts.push(...generateGableRoofAngleLockParts(cfg, plan, angleLockStations.length, halfSpan0, pitch, ridgeDir, angleLockSlotSpec));
    if (combinedClad) parts.push(combinedClad);
    return parts;
}



/**
 * Single folding cladding panel for a gabled roof.
 * Covers both slopes in one piece:
 *   height = 2 × slantLen + ridgeGap
 *   ridgeGap = 2 × matT × tan(slantAngle)  — extra length to clear the core thickness at the ridge
 *   fold/score etch line at foldY = slantLen + ridgeGap/2
 *
 * The pattern is generated separately for the BOTTOM half (eave-to-fold)
 * and TOP half (fold-to-back-eave) by calling generateCladdingPattern on
 * each rectangular region. That keeps tile rows / brick courses / panel
 * seams oriented correctly toward their respective eaves on either side
 * of the ridge — the pattern reads as "tiles flowing down each slope to
 * its eave" rather than as one big block that ignores the fold.
 */
function generateGabledRoofCladding(perpLen, slantLen, halfSpan, pitch, matT, styleSpec, ridgeDir) {
  if (!styleSpec) return null;

  const slantAngle = Math.atan2(pitch, halfSpan);

  // The two rigid roof-core panels meet near the ridge but do not share one
  // continuous flat plane: the cladding needs extra developed length to wrap
  // over the thickness/dihedral at the peak. Keep that bridge as its own
  // un-patterned band instead of treating it as part of either shingled/
  // corrugated slope.
  const ridgeGap = 2 * matT * Math.tan(slantAngle);
  const totalH   = 2 * slantLen + ridgeGap;

  const frontSlopeEndY = slantLen;
  const backSlopeStartY = slantLen + ridgeGap;
  const foldY = slantLen + ridgeGap / 2;

  // Front/bottom slope — eave to roof-core ridge edge.
  const bottomSegs = generateCladdingPattern(styleSpec, 0, 0, perpLen, slantLen, [], null);

  // Back/top slope — generate in its own eave→ridge frame, then translate
  // after the ridge bridge. The gap itself remains free of cladding pattern
  // etches so it behaves visually like a ridge-cap / fold bridge.
  const topSegsLocal = generateCladdingPattern(styleSpec, 0, 0, perpLen, slantLen, [], null);
  const topSegs = topSegsLocal.map(s => ({
    x1: s.x1, y1: s.y1 + backSlopeStartY,
    x2: s.x2, y2: s.y2 + backSlopeStartY,
  }));

  const lines = [
    ...bottomSegs.map(s => ({ type: 'etch', x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 })),
    ...topSegs.map(s    => ({ type: 'etch', x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 })),

    // Mark both roof-core ridge edges plus the actual fold/score centre.
    // These are etch guides only; the whole cladding remains one cut piece.
    { type: 'etch', x1: 0, y1: frontSlopeEndY,  x2: perpLen, y2: frontSlopeEndY },
    { type: 'etch', x1: 0, y1: backSlopeStartY, x2: perpLen, y2: backSlopeStartY },

    // Centre fold / score line. Double-stroked so it reads as bolder than
    // the two ridge-gap boundary guides.
    { type: 'etch', x1: 0, y1: foldY, x2: perpLen, y2: foldY },
    { type: 'etch', x1: 0, y1: foldY, x2: perpLen, y2: foldY },
  ];

  return {
    id: 'roof_gabled_cladding',
    name: `Roof Cladding (gabled ${ridgeDir} ridge — ridge bridge ${ridgeGap.toFixed(2)}mm, score & fold at centre)`,
    material: 'cladding',
    bboxW: perpLen, bboxH: totalH, bboxOffsetX: 0, bboxOffsetY: 0,
    paths: [{ type: 'cut', d: rectPath(0, 0, perpLen, totalH) }],
    rects: [], lines,
  };
}

/* Generate a roof cladding panel with groove lines representing tiles/shingles */
/* Generate a roof cladding panel with the proper pattern for the chosen
 * cladding style. Slanted/gabled roofs only — parapet and flat roofs are
 * un-clad (the wall cladding wraps the roof line). Delegates pattern
 * generation to generateCladdingPattern so the result matches the wall
 * cladding logic exactly (kawara tile-overlap, brick offset courses,
 * standing-seam metal lines, etc.). The cladding pattern is etched on
 * top of a plain rectangular cut perimeter sized to the roof slope. */
function generateRoofCladdingPanel(id, name, panelW, panelH, styleSpec, cfg) {
  if (!styleSpec) return null;
  // Hand the panel bounds and an empty cuts list (the roof slope has no
  // openings) to the shared pattern generator. It returns segments in
  // {x1, y1, x2, y2} which we wrap as etch lines on the part.
  const patSegs = generateCladdingPattern(styleSpec, 0, 0, panelW, panelH, [], null);
  const lines = patSegs.map(seg => ({ type: 'etch', x1: seg.x1, y1: seg.y1, x2: seg.x2, y2: seg.y2 }));
  const perimeter = rectPath(0, 0, panelW, panelH);
  return {
    id, name, material: 'cladding',
    bboxW: panelW, bboxH: panelH, bboxOffsetX: 0, bboxOffsetY: 0,
    paths: [{ type: 'cut', d: perimeter }],
    rects: [], lines,
  };
}
function generateFloor(cfg, plan) {
  const { H, matT, tw, sideLen, fbWidth, bayXStart, bayXEnd,
          hasFrontBay, hasBackBay } = plan;
  // Floor outer dim: full footprint = fbWidth x depth = fbWidth x (sideLen + 2*matT)
  const floorW = fbWidth;
  const floorH = sideLen + 2 * matT;

  const margin = Math.max(matT * 2, 5);

  // ---- Compute door forbidden zones to MATCH the wall bottomTongues calls exactly ----
  // generateFrontBackWall and generateSideWall already exclude door X-ranges from their
  // bottomTongues placement; the floor slots must use the same forbidden zones or the
  // tongues and slots will land in different positions.
  const doorStyle = cfg.doorStyle;

  // Forbidden zones for bottom-edge floor slots: same rule as the wall's
  // bottom-tongue placement — only glass doors that reach the bottom of
  // the wall block the slot, since the wall material is continuous to
  // the floor everywhere else.
  function doorForbiddenZones(wallDoors) {
    return bottomTongueForbiddenZones(wallDoors, cfg, H);
  }

  // Get a face's doors. PRIORITY: manual ops first, then auto-count fallback.
  // The old version returned [] when count<=0, which missed manual doors on
  // walls whose face-specific count was 0. The wall generator already checks
  // manual ops first (see generateFrontBackWall / generateSideWall), so the
  // floor must match that priority to avoid tongue/slot misalignment when
  // the user has manually-placed doors but no auto door count.
  function getWallDoors(manualKey, edgeLen, wallH, count, hasBay) {
    const manual = manualStructuralOps(cfg, manualKey);
    if (manual) return manual.filter(o => o.type === 'door');
    if (count <= 0 || !doorStyle || doorStyle === 'none') return [];
    if (hasBay) return [];
    return computeDoors(edgeLen, wallH, { doorStyle, doorCount: count, hasOpening: false, bayXStart: 0, bayXEnd: 0 });
  }

  const frontDoors = getWallDoors('front', fbWidth, H, cfg.frontDoorCount || 0, hasFrontBay);
  const backDoors  = getWallDoors('back',  fbWidth, H, cfg.backDoorCount  || 0, hasBackBay);
  // East and west walls can have INDEPENDENT door layouts when the user
  // places doors manually per-face. The floor needs separate slot lists for
  // each side — the old code shared a single `sideSlots` derived from the
  // east face only, which left the floor's left (west) edge with slots that
  // didn't match the west wall's bottom tongues whenever the two faces
  // diverged (e.g. east=1 door, west=3 doors in the same building).
  const eastDoors  = getWallDoors('east',  sideLen, H, cfg.sideDoorCount  || 0, false);
  const westDoors  = getWallDoors('west',  sideLen, H, cfg.sideDoorCount  || 0, false);

  // Use the same wall-local bay coordinates as generateFrontBackWall().
  // This matters for through-bays: the back wall's bay/tongue layout is
  // mirrored in wall-local space, and the floor slot exclusions must match
  // that wall part rather than reusing the front wall's canonical X range.
  const frontBaySlotX = planBayXFor(plan, 'front');
  const backBaySlotX  = planBayXFor(plan, 'back');
  const frontForbidden = [...(hasFrontBay ? [[frontBaySlotX.bayXStart, frontBaySlotX.bayXEnd]] : []), ...doorForbiddenZones(frontDoors)];
  const backForbidden  = [...(hasBackBay  ? [[backBaySlotX.bayXStart,  backBaySlotX.bayXEnd ]] : []), ...doorForbiddenZones(backDoors)];
  const eastForbidden  = doorForbiddenZones(eastDoors);
  const westForbidden  = doorForbiddenZones(westDoors);

  // Use count=3 for all edges, matching the targetCount used in the wall generators.
  // Front-wall tongues are generated in exterior-elevation coordinates. The
  // floor plan is viewed from above with the front edge at the top, so the
  // front wall's left/right order is reversed on the floor panel. The back
  // wall uses its own wall-local bay exclusions above so through-bay back
  // slots stay aligned with the generated back wall part.
  const frontWallLocalSlots = applyWallAssemblyKeyToTongues(
    placeTongues(floorW, tw, margin, frontForbidden, 3, tw / 2),
    floorW, cfg, 'front', frontForbidden, matT, tw, margin
  );
  const splitRanges = floorSplitRangesByFace(cfg, matT, sideLen);
  let frontSlots = mirrorSlotsAlongEdge(frontWallLocalSlots, floorW);
  let backSlots  = applyWallAssemblyKeyToTongues(
    placeTongues(floorW, tw, margin, backForbidden,  3, tw / 2),
    floorW, cfg, 'back', backForbidden, matT, tw, margin
  );
  let eastSlots  = applyWallAssemblyKeyToTongues(
    placeTongues(sideLen, tw, margin, eastForbidden, 3, tw / 2),
    sideLen, cfg, 'east', eastForbidden, matT, tw, margin
  );
  let westSlots  = applyWallAssemblyKeyToTongues(
    placeTongues(sideLen, tw, margin, westForbidden, 3, tw / 2),
    sideLen, cfg, 'west', westForbidden, matT, tw, margin
  );
  frontSlots = applyFloorSplitHalfWidthSlots(frontSlots, splitRanges.front);
  backSlots  = applyFloorSplitHalfWidthSlots(backSlots,  splitRanges.back);
  eastSlots  = applyFloorSplitHalfWidthSlots(eastSlots,  splitRanges.east);
  westSlots  = applyFloorSplitHalfWidthSlots(westSlots,  splitRanges.west);

  // Build the floor perimeter with slot notches integrated into the path.
  // Each slot is drawn as an inward indent so there is NO separate closing line
  // on the outside — the perimeter itself is the open edge of every slot.
  function buildFloorPerimeter() {
    let d = 'M 0,0';

    // TOP (left→right): front-wall slots indent DOWN by matT
    let x = 0;
    for (const s of [...frontSlots].sort((a,b) => a.start - b.start)) {
      if (s.start > x) d += ` L ${s.start.toFixed(3)},0`;
      { const sd = floorSlotDepth(s, matT); d += ` L ${s.start.toFixed(3)},${sd.toFixed(3)} L ${s.end.toFixed(3)},${sd.toFixed(3)} L ${s.end.toFixed(3)},0`; }
      x = s.end;
    }
    d += ` L ${floorW.toFixed(3)},0`;

    // RIGHT (top→bottom): east-wall slots indent LEFT by matT
    let y = 0;
    for (const s of [...eastSlots].sort((a,b) => a.start - b.start)) {
      const y1 = matT + s.start, y2 = matT + s.end;
      if (y1 > y) d += ` L ${floorW.toFixed(3)},${y1.toFixed(3)}`;
      { const sd = floorSlotDepth(s, matT); d += ` L ${(floorW-sd).toFixed(3)},${y1.toFixed(3)} L ${(floorW-sd).toFixed(3)},${y2.toFixed(3)} L ${floorW.toFixed(3)},${y2.toFixed(3)}`; }
      y = y2;
    }
    d += ` L ${floorW.toFixed(3)},${floorH.toFixed(3)}`;

    // BOTTOM (right→left): back-wall slots indent UP by matT
    x = floorW;
    for (const s of [...backSlots].sort((a,b) => b.start - a.start)) {
      if (s.end < x) d += ` L ${s.end.toFixed(3)},${floorH.toFixed(3)}`;
      { const sd = floorSlotDepth(s, matT); d += ` L ${s.end.toFixed(3)},${(floorH-sd).toFixed(3)} L ${s.start.toFixed(3)},${(floorH-sd).toFixed(3)} L ${s.start.toFixed(3)},${floorH.toFixed(3)}`; }
      x = s.start;
    }
    d += ` L 0,${floorH.toFixed(3)}`;

    // LEFT (bottom→top): west-wall slots indent RIGHT by matT
    y = floorH;
    for (const s of [...westSlots].sort((a,b) => b.start - a.start)) {
      const y1 = matT + s.start, y2 = matT + s.end;
      if (y2 < y) d += ` L 0,${y2.toFixed(3)}`;
      { const sd = floorSlotDepth(s, matT); d += ` L ${sd.toFixed(3)},${y2.toFixed(3)} L ${sd.toFixed(3)},${y1.toFixed(3)} L 0,${y1.toFixed(3)}`; }
      y = y1;
    }
    d += ' L 0,0 Z';
    return d;
  }

  return {
    id: 'floor',
    name: 'Floor',
    material: 'core',
    bboxW: floorW, bboxH: floorH,
    bboxOffsetX: 0, bboxOffsetY: 0,
    paths: [{ type: 'cut', d: buildFloorPerimeter() }, ...floorOutlineOpeningPathsFor(cfg, 0, 0, floorW, floorH), ...holePathsForList(cfg.floorHoles)],
    rects: [],
    lines: [],
  };
}

/* Generate a single MERGED floor part covering the main block + all wings.
   Returns one connected polygon (with proper slot indents on every exterior
   wall edge and no slots on the interior wing-connection edges).
   Falls back to generateFloor() for the no-wing case or unsupported layouts. */
function generateMergedFloorRaw(cfg, plan) {
  const wings = (cfg.wings || []).slice();
  if (wings.length === 0) return generateFloor(cfg, plan);

  const { H, matT, tw, sideLen, fbWidth, bayXStart, bayXEnd,
          hasFrontBay, hasBackBay } = plan;
  const floorW = fbWidth;
  const floorH = sideLen + 2 * matT;
  const margin = Math.max(matT * 2, 5);
  const doorStyle = cfg.doorStyle;

  // Group wings by face, sort by offset
  const byFace = { front: [], back: [], east: [], west: [] };
  for (const w of wings) {
    if (w && byFace[w.face]) byFace[w.face].push(w);
  }
  for (const f of ['front','back','east','west']) byFace[f].sort((a,b) => a.offset - b.offset);

  // Validate: each wing inside its face, no overlaps; otherwise fall back.
  const faceLen = { front: floorW, back: floorW, east: floorH, west: floorH };
  for (const f of ['front','back','east','west']) {
    let lastEnd = -Infinity;
    for (const w of byFace[f]) {
      const startMain = (f === 'east' || f === 'west') ? w.offset : w.offset;
      const endMain   = startMain + w.span;
      if (startMain < 0 || endMain > faceLen[f] + 0.01) return generateFloor(cfg, plan);
      if (startMain < lastEnd - 0.01) return generateFloor(cfg, plan);
      lastEnd = endMain;
    }
  }

  // ── Door forbidden zones, identical to generateFloor ──────────────────────
  // Same rule: only glass doors reaching the wall's bottom edge block.
  function doorForbiddenZones(wallDoors) {
    return bottomTongueForbiddenZones(wallDoors, cfg, H);
  }
  // PRIORITY: manual ops first, then auto-count fallback. See generateFloor
  // for the longer explanation; the rule must match so floor slots align
  // with wall bottom tongues even when face-specific door counts are 0.
  function getWallDoors(manualKey, edgeLen, wallH, count, hasBay) {
    const manual = manualStructuralOps(cfg, manualKey);
    if (manual) return manual.filter(o => o.type === 'door');
    if (count <= 0 || !doorStyle || doorStyle === 'none') return [];
    if (hasBay) return [];
    return computeDoors(edgeLen, wallH, { doorStyle, doorCount: count, hasOpening: false, bayXStart: 0, bayXEnd: 0 });
  }
  const frontDoors = getWallDoors('front', fbWidth, H, cfg.frontDoorCount || 0, hasFrontBay);
  const backDoors  = getWallDoors('back',  fbWidth, H, cfg.backDoorCount  || 0, hasBackBay);
  // East and west computed independently — see generateFloor for rationale.
  const eastDoors  = getWallDoors('east',  sideLen, H, cfg.sideDoorCount  || 0, false);
  const westDoors  = getWallDoors('west',  sideLen, H, cfg.sideDoorCount  || 0, false);

  // Wing connection ranges (in WALL-LOCAL coords for each face)
  // Front/back walls: wall-local = main x (= floor x), range [offset, offset+span]
  // East/west walls : wall-local = floor y - matT (since side wall spans matT..floorH-matT)
  const frontWingF = byFace.front.map(w => [w.offset, w.offset + w.span]);
  const backWingF  = byFace.back .map(w => [w.offset, w.offset + w.span]);
  const eastWingF  = byFace.east .map(w => [Math.max(0, w.offset - matT), Math.min(sideLen, w.offset + w.span - matT)]);
  const westWingF  = byFace.west .map(w => [Math.max(0, w.offset - matT), Math.min(sideLen, w.offset + w.span - matT)]);

  // Base wall-bottom forbidden zones must match the wall generators.  Do
  // NOT add wing connection spans here: the physical main wall still exists
  // across a `connection: 'wall'` wing joint, so any bottom tongues the wall
  // generates under that span still need matching floor slots.  The merged
  // floor perimeter naturally skips the connection span because it detours
  // around the wing; we add those skipped slots back as internal rectangular
  // holes below.
  // Use the same wall-local bay coordinates as generateFrontBackWall().
  // This matters for through-bays: the back wall's bay/tongue layout is
  // mirrored in wall-local space, and the floor slot exclusions must match
  // that wall part rather than reusing the front wall's canonical X range.
  const frontBaySlotX = planBayXFor(plan, 'front');
  const backBaySlotX  = planBayXFor(plan, 'back');
  const frontForbidden = [...(hasFrontBay ? [[frontBaySlotX.bayXStart, frontBaySlotX.bayXEnd]] : []), ...doorForbiddenZones(frontDoors)];
  const backForbidden  = [...(hasBackBay  ? [[backBaySlotX.bayXStart,  backBaySlotX.bayXEnd ]] : []), ...doorForbiddenZones(backDoors)];
  const eastForbidden  = doorForbiddenZones(eastDoors);
  const westForbidden  = doorForbiddenZones(westDoors);

  // Same front-edge mirror as generateFloor(): wall-local front tongues are
  // exterior-elevation coordinates, while this merged floor outline is a
  // top-down plan with the front edge at the top. Back-wall bay exclusions
  // are resolved separately with planBayXFor('back'), so the back edge stays
  // aligned with the generated back wall part. Keep an "all slots" list that
  // matches the wall, then derive exterior-only slots by removing the wing
  // connection spans from the perimeter pass.
  const frontWallLocalSlots = applyWallAssemblyKeyToTongues(
    placeTongues(fbWidth, tw, margin, frontForbidden, 3, tw / 2),
    fbWidth, cfg, 'front', frontForbidden, matT, tw, margin
  );
  const splitRanges = floorSplitRangesByFace(cfg, matT, sideLen);
  let frontSlotsAll = mirrorSlotsAlongEdge(frontWallLocalSlots, fbWidth);
  let backSlotsAll  = applyWallAssemblyKeyToTongues(
    placeTongues(fbWidth, tw, margin, backForbidden,  3, tw / 2),
    fbWidth, cfg, 'back', backForbidden, matT, tw, margin
  );
  let eastSlotsAll  = applyWallAssemblyKeyToTongues(
    placeTongues(sideLen, tw, margin, eastForbidden,  3, tw / 2),
    sideLen, cfg, 'east', eastForbidden, matT, tw, margin
  );
  let westSlotsAll  = applyWallAssemblyKeyToTongues(
    placeTongues(sideLen, tw, margin, westForbidden,  3, tw / 2),
    sideLen, cfg, 'west', westForbidden, matT, tw, margin
  );
  frontSlotsAll = applyFloorSplitHalfWidthSlots(frontSlotsAll, splitRanges.front);
  backSlotsAll  = applyFloorSplitHalfWidthSlots(backSlotsAll,  splitRanges.back);
  eastSlotsAll  = applyFloorSplitHalfWidthSlots(eastSlotsAll,  splitRanges.east);
  westSlotsAll  = applyFloorSplitHalfWidthSlots(westSlotsAll,  splitRanges.west);

  function slotIntersectsRanges(slot, ranges) {
    return (ranges || []).some(r => slot.start < r[1] - 0.01 && slot.end > r[0] + 0.01);
  }
  function slotCenterInRange(slot, r) {
    const c = (slot.start + slot.end) / 2;
    return c >= r[0] - 0.01 && c <= r[1] + 0.01;
  }
  function slotsOutsideRanges(slots, ranges) {
    return (slots || []).filter(s => !slotIntersectsRanges(s, ranges));
  }
  function slotsInsideRange(slots, r) {
    return (slots || []).filter(s => slotCenterInRange(s, r));
  }

  // Exterior perimeter slots. Wing spans are excluded here because the
  // connection line is no longer an outside edge of the merged floor.
  const frontSlots = slotsOutsideRanges(frontSlotsAll, frontWingF);
  const backSlots  = slotsOutsideRanges(backSlotsAll,  backWingF);
  const eastSlots  = slotsOutsideRanges(eastSlotsAll,  eastWingF);
  const westSlots  = slotsOutsideRanges(westSlotsAll,  westWingF);

  // Internal floor slots for `wall` wing connections. These are the slots
  // that were missing: the main wall section under the wing connection still
  // has bottom tongues, but that edge became internal after the floor merge.
  // Cut through-rect slots on the shared seam, matching the SAME wall-bottom
  // slot coordinates used above. `open` connections intentionally get none.
  const internalSlotRects = [];
  function addInternalSlotRect(x, y, w, h) {
    if (w <= 0.01 || h <= 0.01) return;
    internalSlotRects.push({
      type: 'cut', x, y, w, h,
      compensateKerf: true,
      _label: 'wing-wall-floor-slot',
    });
  }
  function isWallConnection(w) { return !w || w.connection !== 'open'; }

  for (const w of byFace.front.filter(isWallConnection)) {
    const r = [w.offset, w.offset + w.span];
    for (const s of slotsInsideRange(frontSlotsAll, r)) {
      addInternalSlotRect(s.start, 0, s.end - s.start, matT);
    }
  }
  for (const w of byFace.back.filter(isWallConnection)) {
    const r = [w.offset, w.offset + w.span];
    for (const s of slotsInsideRange(backSlotsAll, r)) {
      addInternalSlotRect(s.start, floorH - matT, s.end - s.start, matT);
    }
  }
  const eastSlotsFloorAll = eastSlotsAll.map(s => ({ start: matT + s.start, end: matT + s.end }));
  for (const w of byFace.east.filter(isWallConnection)) {
    const r = [w.offset, w.offset + w.span];
    for (const s of slotsInsideRange(eastSlotsFloorAll, r)) {
      addInternalSlotRect(floorW - matT, s.start, matT, s.end - s.start);
    }
  }
  const westSlotsFloorAll = westSlotsAll.map(s => ({ start: matT + s.start, end: matT + s.end }));
  for (const w of byFace.west.filter(isWallConnection)) {
    const r = [w.offset, w.offset + w.span];
    for (const s of slotsInsideRange(westSlotsFloorAll, r)) {
      addInternalSlotRect(0, s.start, matT, s.end - s.start);
    }
  }

  // Wing-local outer-edge slot positions
  function wingSlots(w) {
    return {
      back: placeTongues(w.span, tw, margin, [], 3, tw / 2), // along x_wing in [0, span], on the wing's far edge
      // Side-wall bottom slots must use the same body length as
      // generateSideWall() for a wing with the connection face omitted.
      side: placeTongues(wingSideWallBodyLength(w, matT), tw, margin, [], 3, tw / 2),
    };
  }

  // Compute bbox extents (wings extend beyond main floor in ±x or ±y)
  let xMin = 0, xMax = floorW, yMin = 0, yMax = floorH;
  for (const w of wings) {
    const ext = wingOuterDepth(w);
    if (w.face === 'west')  xMin = Math.min(xMin, -ext);
    if (w.face === 'east')  xMax = Math.max(xMax, floorW + ext);
    if (w.face === 'front') yMin = Math.min(yMin, -ext);
    if (w.face === 'back')  yMax = Math.max(yMax, floorH + ext);
  }
  const bboxW = xMax - xMin;
  const bboxH = yMax - yMin;
  const bboxOffsetX = -xMin;
  const bboxOffsetY = -yMin;

  const fx = v => v.toFixed(3);
  let d = 'M 0,0';

  // ── Helper: emit slot indents along a 1-D segment ──────────────────────────
  // Walks from `start` to `end` along an axis-aligned direction, drawing slot
  // indents normal to the walk direction. Filters/sorts the supplied slots so
  // only those overlapping [min(start,end), max(start,end)] are drawn, in walk
  // order.
  //
  //   axis: 'x' or 'y' — which axis we're walking along
  //   start, end: walk start and end in that axis
  //   fixed: the other axis's constant coordinate
  //   slots: list of {start, end} in absolute walk-axis coords
  //   indent: +matT or -matT (signed normal direction into polygon interior)
  //
  // Returns nothing; mutates the d string via closure.
  function emit(axis, start, end, fixed, slots, indent) {
    const dir = (end > start) ? 1 : -1;
    // Filter slots to the segment, then sort by walk position
    const lo = Math.min(start, end), hi = Math.max(start, end);
    // Normalize each slot to have start <= end so near/far logic below is
    // walk-direction-driven (callers don't need to flip start/end themselves).
    const segSlots = (slots || [])
      .map(s => (s.start <= s.end) ? s : { start: s.end, end: s.start })
      .filter(s => s.end > lo + 0.01 && s.start < hi - 0.01)
      .map(s => ({ start: Math.max(s.start, lo), end: Math.min(s.end, hi) }))
      .sort((a, b) => dir * (a.start - b.start));

    let cur = start;
    for (const s of segSlots) {
      // In walk-axis coords, the "near" edge of the slot (encountered first) is
      // s.start when dir=+1, s.end when dir=-1.
      const slotNear = (dir === 1) ? s.start : s.end;
      const slotFar  = (dir === 1) ? s.end   : s.start;

      // Walk straight to slot near-edge
      if (axis === 'x') d += ` L ${fx(slotNear)},${fx(fixed)}`;
      else              d += ` L ${fx(fixed)},${fx(slotNear)}`;
      // Indent in (perpendicular to walk). Split-floor seam slots remain
      // full material depth; when split, only the slot WIDTH along the seam
      // is halved, never the slot depth.
      const slotIndent = indent * ((s && s.depthFactor) || 1);
      if (axis === 'x') d += ` L ${fx(slotNear)},${fx(fixed + slotIndent)}`;
      else              d += ` L ${fx(fixed + slotIndent)},${fx(slotNear)}`;
      // Across slot at indented level
      if (axis === 'x') d += ` L ${fx(slotFar)},${fx(fixed + slotIndent)}`;
      else              d += ` L ${fx(fixed + slotIndent)},${fx(slotFar)}`;
      // Back out
      if (axis === 'x') d += ` L ${fx(slotFar)},${fx(fixed)}`;
      else              d += ` L ${fx(fixed)},${fx(slotFar)}`;
      cur = slotFar;
    }
    // Finish to end
    if (axis === 'x') d += ` L ${fx(end)},${fx(fixed)}`;
    else              d += ` L ${fx(fixed)},${fx(end)}`;
  }

  // ── Detour helpers — for each face, walk around the wing's 3 outer edges ──

  // FRONT wing: walking +x along y=0, detour up (negative y) and back
  function detourFront(w) {
    const ext = wingOuterDepth(w);
    const ws = wingSlots(w);
    // Wing's local-west wall slot main-y positions: -(matT + s.start) .. -(matT + s.end)
    // Walking -y on wing west: indent +x (right, into wing interior)
    const wWestSlotsMain = ws.side.map(s => ({ start: -s.end, end: -s.start }));
    emit('y', 0, -ext, w.offset, wWestSlotsMain, +matT);
    // Wing's far edge (back wall): walking +x, indent +y (down toward main block)
    const wBackSlotsMain = ws.back.map(s => ({ start: w.offset + s.start, end: w.offset + s.end }));
    emit('x', w.offset, w.offset + w.span, -ext, wBackSlotsMain, +matT);
    // Wing's local-east wall: walking +y back to y=0, indent -x (left, into interior)
    const wEastSlotsMain = ws.side.map(s => ({ start: -s.end, end: -s.start }));
    emit('y', -ext, 0, w.offset + w.span, wEastSlotsMain, -matT);
  }

  // BACK wing: walking -x along y=floorH, detour down (+y) and back
  function detourBack(w) {
    const ext = wingOuterDepth(w);
    const yB = floorH;
    const ws = wingSlots(w);
    // Wing's local-east wall (south side of wing in screen / east in main): walking +y, indent -x
    const wEastSlotsMain = ws.side.map(s => ({ start: yB + s.start, end: yB + s.end }));
    emit('y', yB, yB + ext, w.offset + w.span, wEastSlotsMain, -matT);
    // Wing back wall (far edge): walking -x, indent -y (up toward main)
    const wBackSlotsMain = ws.back.map(s => ({ start: w.offset + s.start, end: w.offset + s.end }));
    emit('x', w.offset + w.span, w.offset, yB + ext, wBackSlotsMain, -matT);
    // Wing's local-west wall: walking -y back, indent +x
    const wWestSlotsMain = ws.side.map(s => ({ start: yB + s.start, end: yB + s.end }));
    emit('y', yB + ext, yB, w.offset, wWestSlotsMain, +matT);
  }

  // EAST wing: walking +y along x=floorW, detour right (+x) and back
  function detourEast(w) {
    const ext = wingOuterDepth(w);
    const xR = floorW;
    const ws = wingSlots(w);
    // Wing local west wall: walking +x along south of wing, indent +y
    const wWestSlotsMain = ws.side.map(s => ({ start: xR + s.start, end: xR + s.end }));
    emit('x', xR, xR + ext, w.offset, wWestSlotsMain, +matT);
    // Wing far (back) wall: walking +y, indent -x
    const wBackSlotsMain = ws.back.map(s => ({ start: w.offset + s.start, end: w.offset + s.end }));
    emit('y', w.offset, w.offset + w.span, xR + ext, wBackSlotsMain, -matT);
    // Wing local east wall: walking -x back to main, indent -y
    const wEastSlotsMain = ws.side.map(s => ({ start: xR + s.start, end: xR + s.end }));
    emit('x', xR + ext, xR, w.offset + w.span, wEastSlotsMain, -matT);
  }

  // WEST wing: walking -y along x=0, detour left (-x) and back
  function detourWest(w) {
    const ext = wingOuterDepth(w);
    const ws = wingSlots(w);
    // Wing local east wall: walking -x along north of wing, indent -y
    const wEastSlotsMain = ws.side.map(s => ({ start: -s.end, end: -s.start }));
    emit('x', 0, -ext, w.offset + w.span, wEastSlotsMain, -matT);
    // Wing far (back) wall: walking -y, indent +x
    const wBackSlotsMain = ws.back.map(s => ({ start: w.offset + s.start, end: w.offset + s.end }));
    emit('y', w.offset + w.span, w.offset, -ext, wBackSlotsMain, +matT);
    // Wing local west wall: walking +x back to main, indent +y
    const wWestSlotsMain = ws.side.map(s => ({ start: -s.end, end: -s.start }));
    emit('x', -ext, 0, w.offset, wWestSlotsMain, +matT);
  }

  // ── Walk perimeter clockwise: top → right → bottom → left ─────────────────

  // TOP edge (y=0, walking +x). Detour up into each front wing.
  {
    let x = 0;
    for (const w of byFace.front) {
      emit('x', x, w.offset, 0, frontSlots, +matT);
      detourFront(w);
      x = w.offset + w.span;
    }
    emit('x', x, floorW, 0, frontSlots, +matT);
  }

  // RIGHT edge (x=floorW, walking +y). The main side wall spans floor y in [matT, floorH-matT].
  // East slot positions in side-wall-local coords need translation to floor y (add matT).
  const eastSlotsFloor = eastSlots.map(s => ({ start: matT + s.start, end: matT + s.end }));
  {
    let y = 0;
    for (const w of byFace.east) {
      emit('y', y, w.offset, floorW, eastSlotsFloor, -matT);
      detourEast(w);
      y = w.offset + w.span;
    }
    emit('y', y, floorH, floorW, eastSlotsFloor, -matT);
  }

  // BOTTOM edge (y=floorH, walking -x). Iterate back wings in REVERSE (right→left).
  {
    let x = floorW;
    const backWingsRev = [...byFace.back].reverse();
    for (const w of backWingsRev) {
      emit('x', x, w.offset + w.span, floorH, backSlots, -matT);
      detourBack(w);
      x = w.offset;
    }
    emit('x', x, 0, floorH, backSlots, -matT);
  }

  // LEFT edge (x=0, walking -y). Iterate west wings in REVERSE (bottom→top).
  const westSlotsFloor = westSlots.map(s => ({ start: matT + s.start, end: matT + s.end }));
  {
    let y = floorH;
    const westWingsRev = [...byFace.west].reverse();
    for (const w of westWingsRev) {
      emit('y', y, w.offset + w.span, 0, westSlotsFloor, +matT);
      detourWest(w);
      y = w.offset;
    }
    emit('y', y, 0, 0, westSlotsFloor, +matT);
  }

  d += ' Z';

  const nm = wings.length === 1
    ? 'Floor (merged with 1 wing)'
    : `Floor (merged with ${wings.length} wings)`;

  const floorWireOpeningPaths = [];
  floorWireOpeningPaths.push(...floorOutlineOpeningPathsFor(cfg, 0, 0, floorW, floorH));
  // For merged floor footprints, also cut a centered opening in each wing
  // rectangle so the wing floor remains a ring rather than becoming a solid
  // appendage. Coordinates remain in the same merged-floor physical frame as
  // the perimeter path, so no wall/window/feature coordinates are shifted.
  for (const w of wings) {
    const ext = wingOuterDepth(w);
    if (!(ext > 0) || !(w.span > 0)) continue;
    if (w.face === 'front') floorWireOpeningPaths.push(...floorOutlineOpeningPathsFor(cfg, w.offset, -ext, w.span, ext));
    else if (w.face === 'back') floorWireOpeningPaths.push(...floorOutlineOpeningPathsFor(cfg, w.offset, floorH, w.span, ext));
    else if (w.face === 'east') floorWireOpeningPaths.push(...floorOutlineOpeningPathsFor(cfg, floorW, w.offset, ext, w.span));
    else if (w.face === 'west') floorWireOpeningPaths.push(...floorOutlineOpeningPathsFor(cfg, -ext, w.offset, ext, w.span));
  }

  return {
    id: 'floor',
    name: nm,
    material: 'core',
    bboxW, bboxH, bboxOffsetX, bboxOffsetY,
    paths: [{ type: 'cut', d }, ...floorWireOpeningPaths, ...holePathsForList(cfg.floorHoles)],
    rects: internalSlotRects,
    lines: [],
  };
}


const LASER_SAFETY_EDGE_BUFFER_MM = 6.35; // 1/4 in on every sheet edge
