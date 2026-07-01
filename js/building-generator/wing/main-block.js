/* ========== generateBuilding routing is done in the we* script block below ========== */

function wingAttachmentFaceLength(cfg, wing) {
  return (wing.face === 'east' || wing.face === 'west') ? cfg.depth : cfg.width;
}

function wingConnectionOverlapInLocal(cfg, wing) {
  const faceLen = wingAttachmentFaceLength(cfg, wing);
  const x0 = Math.max(0, -Number(wing.offset || 0));
  const x1 = Math.min(Number(wing.span || 0), faceLen - Number(wing.offset || 0));
  return (x1 > x0 + 0.01) ? { x0, x1, length: x1 - x0 } : null;
}

function exposedWingConnectionSegments(cfg, wing) {
  const overlap = wingConnectionOverlapInLocal(cfg, wing);
  if (!overlap) return [];
  const span = Number(wing.span || 0);
  const out = [];
  if (overlap.x0 > 0.01) {
    out.push({ key: 'start', label: 'start overhang', x0: 0, x1: overlap.x0, length: overlap.x0 });
  }
  if (span - overlap.x1 > 0.01) {
    out.push({ key: 'end', label: 'end overhang', x0: overlap.x1, x1: span, length: span - overlap.x1 });
  }
  return out;
}

function wingSegmentCfg(wCfg, segment) {
  return Object.assign({}, wCfg, {
    width: segment.length,
    // Segment-local wall artwork cannot reuse full-wing front-face coordinates.
    // Keep these strips structural and let users add detail to the ordinary
    // exterior side panels until the editor has segment-aware front placement.
    manualOpenings: Object.assign({}, wCfg.manualOpenings || {}, { front: null }),
    wallFeatures: Object.assign({}, wCfg.wallFeatures || {}, { front: null }),
    _omitConnectionWall: false,
  });
}

function generateExposedConnectionCorePanel(rootCfg, wCfg, wPlan, wing, wingIndex, segment) {
  const segCfg = wingSegmentCfg(wCfg, segment);
  const segPlan = buildEdgePlans(segCfg);
  const wallW = segment.length;
  const { H, matT, tw, parapetH, roofStyle } = segPlan;
  const margin = Math.max(matT * 2, 5);

  const topTongues = (roofStyle === 'flat' || roofStyle === 'flat_overhang')
    ? placeTongues(wallW, tw, margin, [], 3, tw / 2)
    : [];
  const bottomTongues = placeTongues(wallW, tw, margin, [], 3, tw / 2);

  const verticalEdgeMinMargin = Math.max(parapetH + matT + 2, 8);
  const verticalEdgeMaxY = H - margin;
  const vAvail = Math.max(0, verticalEdgeMaxY - verticalEdgeMinMargin);
  const vCount = vAvail > 0 ? Math.max(2, Math.min(4, Math.floor(vAvail / 40))) : 0;
  const verticalForbidden = [[0, verticalEdgeMinMargin], [verticalEdgeMaxY, H]];
  const sideSlots = vCount > 0
    ? placeTongues(H, tw, 0.1, verticalForbidden, vCount, tw / 2)
    : [];

  const wallSpec = {
    width: wallW,
    height: H,
    matT,
    kerf: rootCfg.kerfComp,
    edges: {
      top: { tongues: topTongues, openings: [] },
      bottom: { tongues: bottomTongues, openings: [] },
      left: { tongues: [], openings: segment.key === 'start' ? sideSlots : [] },
      right: { tongues: [], openings: segment.key === 'end' ? sideSlots : [] },
    },
  };
  const rects = [];

  if (roofStyle === 'parapet') {
    const wingRoofW = wPlan.fbWidth - 2 * matT;
    const count = Math.max(2, Math.min(4, Math.floor(wingRoofW / 30)));
    const roofTongues = placeTongues(wingRoofW, tw, margin, [], count, tw / 2);
    for (const t of roofTongues) {
      const x0 = matT + t.start;
      const x1 = matT + t.end;
      const cx0 = Math.max(segment.x0, x0);
      const cx1 = Math.min(segment.x1, x1);
      if (cx1 <= cx0 + 0.01) continue;
      rects.push({
        type: 'cut',
        x: cx0 - segment.x0,
        y: parapetH,
        w: cx1 - cx0,
        h: matT,
        compensateKerf: true,
      });
    }
  }

  if (segPlan.interFloorYs && segPlan.interFloorYs.length > 0) {
    const ifTw = 6;
    const ifMargin = 3;
    const bcW = Math.max(0, wallW - 2 * matT);
    if (bcW > ifTw + 0.01) {
      const ifCount = Math.max(1, Math.min(4, Math.floor(bcW / 25)));
      const ifPoss = placeTongues(bcW, ifTw, ifMargin, [], ifCount, ifTw);
      for (const fy of segPlan.interFloorYs) {
        for (const t of ifPoss) {
          rects.push({
            type: 'cut',
            x: t.start + matT,
            y: fy - matT / 2,
            w: t.end - t.start,
            h: matT,
            compensateKerf: true,
          });
        }
      }
    }
  }

  return {
    id: `front_wall_connection_${segment.key}_wing${wingIndex}`,
    name: `Wing ${wingIndex + 1} Exposed Connection Wall (${segment.label})`,
    material: 'core',
    bboxW: wallW,
    bboxH: H + 2 * matT,
    bboxOffsetX: 0,
    bboxOffsetY: matT,
    paths: [{ type: 'cut', d: buildWallPath(wallSpec) }],
    rects,
    lines: [],
    windows: 0,
    doors: 0,
    _wingConnectionSegment: { x0: segment.x0, x1: segment.x1, key: segment.key },
  };
}

function generateExposedConnectionCladdingPanels(wCfg, wingIndex, segment) {
  const segCfg = wingSegmentCfg(wCfg, segment);
  const segPlan = buildEdgePlans(segCfg);
  const bands = hasSplitCladding(segCfg) ? ['upper', 'ground'] : [null];
  const out = [];
  for (const band of bands) {
    const part = generateCladdingPanel(segCfg, segPlan, 'front', band);
    if (!part) continue;
    const bandSuffix = band ? `_${band}` : '';
    part.id = `cladding_front_connection_${segment.key}${bandSuffix}_wing${wingIndex}`;
    part.name = `Wing ${wingIndex + 1} Exposed Connection Cladding (${segment.label}${band ? `, ${band}` : ''})`;
    part._wingConnectionSegment = { x0: segment.x0, x1: segment.x1, key: segment.key };
    out.push(part);
  }
  return out;
}

function generateSharedConnectionInteriorCladding(wCfg, wingIndex, overlap) {
  if (!overlap) return [];
  const seg = { key: 'shared', label: 'shared overlap', x0: overlap.x0, x1: overlap.x1, length: overlap.length };
  const segCfg = wingSegmentCfg(wCfg, seg);
  const segPlan = buildEdgePlans(segCfg);
  const sharedIps = generateInteriorCladdingPanel(segCfg, segPlan, 'front');
  const sharedList = Array.isArray(sharedIps) ? sharedIps : (sharedIps ? [sharedIps] : []);
  return sharedList.map((part, idx) => {
    const pieceSuffix = sharedList.length > 1 ? `_floor_${idx + 1}` : '';
    part.id = `shared_wall_interior_cladding${pieceSuffix}_wing${wingIndex}`;
    part.name = sharedList.length > 1
      ? `Wing ${wingIndex + 1} Shared Wall Interior Cladding (wing side, overlap) - piece ${idx + 1}`
      : `Wing ${wingIndex + 1} Shared Wall Interior Cladding (wing side, overlap)`;
    part._sharedWallInteriorCladding = true;
    part._wingConnectionSegment = { x0: overlap.x0, x1: overlap.x1, key: 'shared' };
    return part;
  });
}


export function generateBuildingWithWings(cfg) {
  const parts = [];
  const mainW = cfg.width, mainD = cfg.depth;

  /* ---- 1. Main block ---- */
  const plan = buildEdgePlans(cfg);

  // Connection openings: for 'open' wings, cut openings into the main block walls
  // We pass these via a temporary augmented cfg that the wall generators will use
  const openingsForMain = mainWallOpeningsFromWings(cfg);
  const mainCfgAug = Object.assign({}, cfg, { _wingOpenings: openingsForMain });

  const mainBlockCtx = makeBlockContext(cfg, { cfg: mainCfgAug, plan, label: 'Main' });
  parts.push(...generateBlockCoreWallParts(mainBlockCtx));

  /* Apply 'open' connection openings to the main block walls */
  const facePartIds = {
    east:  'side_wall_east', west:  'side_wall_west',
    front: 'front_wall',     back:  'back_wall',
  };
  for (const [face, ops] of Object.entries(openingsForMain)) {
    if (!ops.length) continue;
    const wallPart = parts.find(p => p.id === facePartIds[face]);
    if (!wallPart) continue;
    for (const op of ops) {
      const isSide = face === 'east' || face === 'west';
      const wx = isSide ? op.x0 - plan.matT : op.x0;
      const ww = op.x1 - op.x0;
      wallPart.rects.push({
        type: 'cut', x: wx - 1, y: op.y0 - 1,
        w: ww + 2, h: (op.y1 - op.y0) + 2, compensateKerf: false,
      });
    }
  }

  /* Wing attachment slots: cut tongue-matching slots into the main block face walls
     at each position where a wing's parallel-face left edge passes through */
  {
    const matT = plan.matT;
    const tw   = cfg.tongueWidth || 15;
    const margin = Math.max(matT * 2, 5);
    const mainH = plan.H;

    for (const wing of (cfg.wings || [])) {
      const wH   = wingHeight(cfg, wing);
      const wCfg = buildWingCfg(cfg, wing);
      const wPlan = buildEdgePlans(wCfg);
      const cp   = wingCoplanarCheck(wing, mainW, mainD);

      // Compute the tongue positions matching generateSideWall leftTongues for the wing
      const vEdgeMin = Math.max((wPlan.parapetH || 0) + matT + 2, 8);
      const vEdgeMax = wH - margin;
      const vCount   = Math.max(2, Math.min(4, Math.floor(Math.max(0, vEdgeMax - vEdgeMin) / 40)));
      const tongues  = placeTongues(wH, tw, 0.1, [[0, vEdgeMin], [vEdgeMax, wH]], vCount, tw / 2);

      // Y offset: in the main wall, the wing bottom aligns with the floor (y=mainH)
      const yOff = mainH - wH;

      const wallPart = parts.find(p => p.id === facePartIds[wing.face]);
      if (!wallPart) continue;

      // Determine parallel face x-positions in the main wall's local coordinate frame
      const faceIsEW = (wing.face === 'east' || wing.face === 'west');
      // For east/west-face wings, main wall local x = floor_y - matT
      // For front/back-face wings, main wall local x = floor_x directly (same coords as front wall)
      const northFaceX = faceIsEW ? (wing.offset - matT) : wing.offset;
      const southFaceX = faceIsEW ? (wing.offset + wing.span - matT) : (wing.offset + wing.span);
      const wallLen    = faceIsEW ? plan.sideLen : plan.fbWidth;
      // East wall laser panel uses the internal-view convention (north on
      // right of panel) to match the openings editor's east display. The
      // storage-frame face X values (which align with main Y axis) must be
      // mirrored at the cut layer so the parallel-face attachment slots land
      // at the same physical position as the rest of the east-wall features.
      const mirrorX = (wing.face === 'east');

      // Slot rectangles must sit INSIDE the wing span. The start-side slot
      // occupies [start, start+matT], while the end-side slot occupies
      // [end-matT, end]. The previous code used the same left-edge formula
      // for both, placing the end-side slot at [end, end+matT], which made
      // one set of main-wall slots one core thickness too far past the wing.
      // Mirrored east-wall panels need the complementary formulas.
      const placeStartSlotX = (fx) => mirrorX ? (wallLen - fx - matT) : fx;
      const placeEndSlotX   = (fx) => mirrorX ? (wallLen - fx)        : (fx - matT);

      // North/west parallel face slots (skip if coplanar)
      if (!cp.westCoplanar && northFaceX >= 0 && northFaceX < wallLen) {
        const slotX = placeStartSlotX(northFaceX);
        for (const t of tongues) {
          wallPart.rects.push({ type: 'cut',
            x: slotX, y: yOff + t.start, w: matT, h: t.end - t.start,
            compensateKerf: true });
        }
      }
      // South/east parallel face slots (skip if coplanar)
      if (!cp.eastCoplanar && southFaceX > 0 && southFaceX <= wallLen) {
        const slotX = placeEndSlotX(southFaceX);
        for (const t of tongues) {
          wallPart.rects.push({ type: 'cut',
            x: slotX, y: yOff + t.start, w: matT, h: t.end - t.start,
            compensateKerf: true });
        }
      }
    }
  }

  /* Wing roof TOP-tongue slots in main walls. For each wing with a parapet
     roof, the wing roof has a tongue on its TOP edge (= the edge adjacent to
     the wing's connection face) that protrudes toward main. Without a slot in
     main's wall to receive it, the tongue has nowhere to land. The previous
     `generateDividingWall` piece was meant to handle this but was the wrong
     dimensions (wing.depth instead of wing.span) and wasn't placed anywhere in
     the assembly, so the slot never actually existed. Cut it directly into
     main's wall at the connection face here. */
  {
    const matT = plan.matT;
    const tw   = cfg.tongueWidth || 15;
    const margin = Math.max(matT * 2, 5);
    const mainH = plan.H;

    for (const wing of (cfg.wings || [])) {
      const wCfg  = buildWingCfg(cfg, wing);
      if (wCfg.roofStyle !== 'parapet') continue;
      const wPlan = buildEdgePlans(wCfg);
      const wH    = wingHeight(cfg, wing);

      // Wing roof's W-axis tongues — use the SAME placeTongues call as
      // generateRoof so positions line up exactly.
      const wingRoofW = wPlan.fbWidth - 2 * matT;
      const wingRoofTongueCountW = Math.max(2, Math.min(4, Math.floor(wingRoofW / 30)));
      const wingRoofWTongues = placeTongues(wingRoofW, tw, margin, [], wingRoofTongueCountW, tw / 2);
      if (!wingRoofWTongues.length) continue;

      // Find main's wall at the wing's connection face.
      const wallPart = parts.find(p => p.id === facePartIds[wing.face]);
      if (!wallPart) continue;

      const faceIsEW = (wing.face === 'east' || wing.face === 'west');
      const wallLen  = faceIsEW ? plan.sideLen : plan.fbWidth;
      // East-wall laser panel uses the internal-view convention (north on
      // right), so storage-frame X values must be mirrored — same treatment
      // as the parallel-face attachment slots above.
      const mirrorX = (wing.face === 'east');

      // Vertical position in main's wall: where the wing's roof sits.
      //   wing's parapet is at `wPlan.parapetH` from top of wing wall
      //   wing wall top in main's wall frame is at (mainH - wH)
      //   → slot top-y = (mainH - wH) + wPlan.parapetH
      const slotY = (mainH - wH) + wPlan.parapetH;

      for (const t of wingRoofWTongues) {
        // Wing-local x range of the tongue (matT corner + roof-local position)
        const wingLocalStart = wing.offset + matT + t.start;
        const wingLocalEnd   = wing.offset + matT + t.end;
        const clippedStart = Math.max(0, wingLocalStart);
        const clippedEnd = Math.min(wallLen, wingLocalEnd);
        if (clippedEnd <= clippedStart + 0.01) continue;
        const w = clippedEnd - clippedStart;
        // Map to wall-panel x. East wall mirrors.
        const xLeft = mirrorX ? (wallLen - clippedEnd) : clippedStart;
        wallPart.rects.push({
          type: 'cut',
          x: xLeft, y: slotY, w, h: matT,
          compensateKerf: true,
        });
      }
    }
  }
  const roofResultMain = generateRoof(cfg, plan);
  if (Array.isArray(roofResultMain)) parts.push(...roofResultMain); else parts.push(roofResultMain);
  addPartsToList(parts, generateMergedFloor(cfg, plan));

  /* Main block's trusses + X-bracing. The wing loop further down emits
     each wing's own trusses; this call is for the main block specifically
     and runs whether or not any wing has trusses on. Empty when
     cfg.trusses.enabled is false (the default) so no parts are generated
     unless the user explicitly opted in. */
  const mainLayoutCropCtx = { rootCfg: cfg, toWorld: p => ({ x: p.x, y: p.y }) };
  parts.push(...generateTrussesForBlock(cfg, plan, '', '', mainLayoutCropCtx));
  parts.push(...generateXBracesForBlock(cfg, plan, '', ''));

  /* Main block's column supports + their floor etchings. The etchings
     get applied to the (already-merged) floor part directly — the
     wing extensions don't overlap main's footprint area, so writing
     main's etchings in the floor's main-coord region is safe with or
     without wings present. */
  const colSupMain = generateColumnSupportsForBlock(cfg, plan, '', '', mainLayoutCropCtx);
  parts.push(...colSupMain.parts);
  applyColumnFloorEtchings(parts, colSupMain.etches);

  /* Coplanar merge isolation.
     These functions are intentionally the ONLY place where main+wing faces
     are folded into L/T-shaped shared panels. Normal main and wing parts now
     flow through the shared block generators above; coplanar merge remains
     isolated because it is a true special case, not ordinary wall generation. */
  function applyCoplanarCoreWallMerges() {
    const coreMerges = computeFaceMerges(cfg, mainW, mainD);
    const matT   = plan.matT;
    const tw     = cfg.tongueWidth || 15;
    const margin = Math.max(matT * 2, 5);
    const ssRoofTop = (plan.roofStyle === 'flat' || plan.roofStyle === 'flat_overhang');

    for (const face of ['front', 'back', 'east', 'west']) {
      const faceM = coreMerges[face];
      if (!faceM.left && !faceM.right) continue;

      const partIdx = parts.findIndex(p => p.id === facePartIds[face]);
      if (partIdx < 0) continue;
      const wallPart = parts[partIdx];

      const faceIsEW2 = (face === 'east' || face === 'west');
      const faceMainW = faceIsEW2 ? plan.sideLen : plan.fbWidth;

      // ── Recompute main wall's tongue positions so they fold into the merged
      // outline. These mirror what generateFrontBackWall / generateSideWall
      // produced. (Cheap to redo; avoids fragile path parsing.) ──────────────
      let mainTopT = [];
      let mainBotT = [];
      let leftT    = [];

      if (!faceIsEW2) {
        // Front/back wall main features
        const hasBay = (face === 'front' && plan.hasFrontBay) || (face === 'back' && plan.hasBackBay);
        const fbDoorCount = (face === 'front') ? (cfg.frontDoorCount || 0) : (cfg.backDoorCount || 0);
        const manual = manualStructuralOps(cfg, face);
        let doors = [];
        if (manual) doors = manual.filter(o => o.type === 'door');
        else if (!hasBay && fbDoorCount > 0 && cfg.doorStyle && cfg.doorStyle !== 'none')
          doors = computeDoors(plan.fbWidth, plan.H, { doorStyle: cfg.doorStyle, doorCount: fbDoorCount, hasOpening: false, bayXStart: 0, bayXEnd: 0 });
        const doorForbidden = bottomTongueForbiddenZones(doors, cfg, plan.H);
        const bottomForbidden = [
          ...(hasBay ? [[plan.bayXStart, plan.bayXEnd]] : []),
          ...doorForbidden,
        ];
        mainBotT = placeTongues(plan.fbWidth, tw, margin, bottomForbidden, 3, tw / 2);
        mainTopT = ssRoofTop ? placeTongues(plan.fbWidth, tw, margin, [], 3, tw / 2) : [];
      } else {
        // Side wall main features
        const manual = manualStructuralOps(cfg, face);
        let doors = [];
        if (manual) doors = manual.filter(o => o.type === 'door');
        else if ((cfg.sideDoorCount || 0) > 0 && cfg.doorStyle && cfg.doorStyle !== 'none')
          doors = computeDoors(plan.sideLen, plan.H, { doorStyle: cfg.doorStyle, doorCount: cfg.sideDoorCount, hasOpening: false, bayXStart: 0, bayXEnd: 0 });
        const doorForbidden = bottomTongueForbiddenZones(doors, cfg, plan.H);
        mainBotT = placeTongues(plan.sideLen, tw, margin, doorForbidden, 3, tw / 2);
        mainTopT = ssRoofTop ? placeTongues(plan.sideLen, tw, margin, [], 3, tw / 2) : [];
      }

      // Vertical (left/right) edge tongues — between this wall and the
      // perpendicular walls. Same algorithm as generateSideWall.
      {
        const sideHasBay = plan.hasFrontBay || plan.hasBackBay;
        const verticalEdgeMinMargin = Math.max(plan.parapetH + matT + 2, 8);
        const verticalEdgeMaxY = sideHasBay ? (plan.bayCeilingY - 3) : (plan.H - margin);
        const vAvail = verticalEdgeMaxY - verticalEdgeMinMargin;
        const vTongueCount = Math.max(2, Math.min(4, Math.floor(vAvail / 40)));
        const verticalForbidden = [
          [0, verticalEdgeMinMargin],
          [verticalEdgeMaxY, plan.H],
        ];
        leftT = placeTongues(plan.H, tw, 0.1, verticalForbidden, vTongueCount, tw / 2);
      }

      // Per-side wing extension data builder
      const buildExtData = (m) => {
        const wing = m.wing;
        const wH = wingHeight(cfg, wing);
        const extW = wing.depth + matT;
        const wallLenExt = wing.depth;
        const stepY = plan.H - wH;
        const extBotT = placeTongues(wallLenExt, tw, margin, [], 3, tw / 2);
        const extTopT = ssRoofTop ? placeTongues(wallLenExt, tw, margin, [], 3, tw / 2) : [];
        const extVerticalMaxY = wH - margin;
        const extVerticalMinMargin = Math.max(plan.parapetH + matT + 2, 8);
        const extVAvail = Math.max(0, extVerticalMaxY - extVerticalMinMargin);
        const extVCount = (extVAvail > 0) ? Math.max(2, Math.min(4, Math.floor(extVAvail / 40))) : 0;
        const extVerticalForbidden = [[0, extVerticalMinMargin], [extVerticalMaxY, wH]];
        const extVerticalT = (extVCount > 0)
          ? placeTongues(wH, tw, 0.1, extVerticalForbidden, extVCount, tw / 2)
                  .map(t => ({ start: t.start - stepY, end: t.end - stepY }))
                  .filter(t => t.start >= -0.01 && t.end <= wH + 0.01)
          : [];
        return { m, wing, wH, extW, wallLenExt, stepY, extBotT, extTopT, extVerticalT };
      };

      const leftExt  = faceM.left  ? buildExtData(faceM.left)  : null;
      const rightExt = faceM.right ? buildExtData(faceM.right) : null;

      // Bay info (front/back only): bay sits in main's portion. In the merged
      // frame the bay's x is offset by xMain (= leftExt.extW if a left wing
      // exists, else 0).
      const xMain = leftExt ? leftExt.extW : 0;
      const mergeMainHasBay = !faceIsEW2 &&
        ((face === 'front' && plan.hasFrontBay) || (face === 'back' && plan.hasBackBay));
      const bayOpt = mergeMainHasBay
        ? { xStart: plan.bayXStart + xMain,
            xEnd:   plan.bayXEnd   + xMain,
            height: plan.bayHeight }
        : null;

      // Build the outline path. 1 wing → L-shape (existing behaviour);
      // 2 wings → T-shape (new).
      let lPath;
      if (leftExt && rightExt) {
        lPath = buildTShapePathWithFeatures(
          faceMainW, plan.H,
          leftExt.extW, leftExt.wH,
          rightExt.extW, rightExt.wH,
          {
            matT,
            mainTopTongues:       mainTopT,
            mainBotTongues:       mainBotT,
            leftExtTopTongues:    leftExt.extTopT,
            leftExtBotTongues:    leftExt.extBotT,
            leftExtLeftTongues:   leftExt.extVerticalT,
            leftExtTopShift:      matT,
            leftExtBotShift:      matT,
            rightExtTopTongues:   rightExt.extTopT,
            rightExtBotTongues:   rightExt.extBotT,
            rightExtRightTongues: rightExt.extVerticalT,
            rightExtTopShift:     matT,
            rightExtBotShift:     matT,
            bay:                  bayOpt,
          });
      } else if (leftExt) {
        lPath = buildLShapePathWithFeatures(faceMainW, plan.H, leftExt.extW, leftExt.wH, false, {
          matT,
          mainTopTongues:   mainTopT,
          extTopTongues:    leftExt.extTopT,
          extTopShift:      matT,
          mainBotTongues:   mainBotT,
          extBotTongues:    leftExt.extBotT,
          extBotShift:      matT,
          extRightTongues:  leftExt.extVerticalT,
          leftTongues:      leftT,
          mainRightTongues: leftT,
          bay:              bayOpt,
        });
      } else {
        lPath = buildLShapePathWithFeatures(faceMainW, plan.H, rightExt.extW, rightExt.wH, true, {
          matT,
          mainTopTongues:   mainTopT,
          extTopTongues:    rightExt.extTopT,
          extTopShift:      matT,
          mainBotTongues:   mainBotT,
          extBotTongues:    rightExt.extBotT,
          extBotShift:      matT,
          extRightTongues:  rightExt.extVerticalT,
          leftTongues:      leftT,
          mainRightTongues: leftT,
          bay:              bayOpt,
        });
      }
      wallPart.paths = [{ type: 'cut', d: lPath }];
      wallPart._coplanarMerge = { kind: 'core', face, shape: (leftExt && rightExt) ? 'T' : 'L' };

      // Update bbox to include all extensions (and matT tongue protrusions).
      const totalExtW = (leftExt ? leftExt.extW : 0) + (rightExt ? rightExt.extW : 0);
      wallPart.bboxW = faceMainW + totalExtW + 2 * matT;
      wallPart.name  = wallPart.name.replace(' (merged)', '') + ' (merged)';

      // Translate main's existing features (windows, doors, slots) into the
      // merged L/T frame. For extRight-only (no left wing) xMain = 0 so this
      // is a no-op, matching the previous single-wing behaviour exactly.
      if (xMain !== 0) {
        wallPart.rects = (wallPart.rects || []).map(r => ({ ...r, x: r.x + xMain }));
        wallPart.lines = (wallPart.lines || []).map(l => ({
          ...l, x1: l.x1 + xMain, x2: l.x2 + xMain,
        }));
      }

      // Generate each wing's coplanar wall and fold its rects (windows,
      // doors, slots for inter-floor panels, slots for the wing's
      // perpendicular walls, etc.) into wallPart.rects.
      //
      // The +2·matT offset is: one matT bridge of wall material between main
      // wall end and the wing wall, plus one matT for the wing's front matT
      // corner (where the wing's connecting wall thickness sits).
      //
      // The flipWX flag (from computeFaceMerges) handles the case where the
      // wing's natural x=0 end is on the FAR side of the wing portion in the
      // merged panel instead of adjacent to main — true for (west, !extRight)
      // and (east, extRight) after the front-merge extRight flip.
      for (const side of ['left', 'right']) {
        const ext = (side === 'left') ? leftExt : rightExt;
        if (!ext) continue;
        const wing     = ext.wing;
        const wCfg     = buildWingCfg(cfg, wing);
        const wPlan    = buildEdgePlans(wCfg);
        const wingFace = ext.m.wingFace;
        const wingSide = (wingFace === 'east') ? 'E' : 'W';
        const wingWall = generateSideWall(wCfg, wPlan, wingSide);
        const wSideLen = wPlan.sideLen;
        const wingWallXStart = (side === 'left')
          ? 2 * matT
          : xMain + faceMainW + 2 * matT;
        const flipWX = ext.m.flipWX;
        const wingRectsT = (wingWall.rects || []).map(r => {
          const x = flipWX ? (wSideLen - (r.x + r.w)) : r.x;
          return { ...r, x: x + wingWallXStart, y: r.y + ext.stepY };
        });
        wallPart.rects = (wallPart.rects || []).concat(wingRectsT);
      }
    }
  }
  applyCoplanarCoreWallMerges();


  parts.push(...generateInterFloorPanels(cfg, plan));
  parts.push(...generateEmbeddedRailParts(cfg, plan));

  function pushCladding(blockCfg, blockPlan, suffix, excludeFaces = new Set()) {
    const wingMatch = suffix ? String(suffix).match(/^_wing(\d+)$/) : null;
    const ctx = wingMatch
      ? makeBlockContext(cfg, {
          wing: cfg.wings[parseInt(wingMatch[1], 10)],
          wingIndex: parseInt(wingMatch[1], 10),
          cfg: blockCfg,
          plan: blockPlan,
          suffix,
        })
      : makeBlockContext(cfg, { cfg: blockCfg, plan: blockPlan, suffix: '' });
    parts.push(...generateBlockCladdingParts(ctx, { excludeFaces, nameMode: 'suffix' }));
  }

  /* Main block cladding: each face is always generated; wing coverage zones
     are handled as rectangular cutouts inside generateCladdingPanel.
     For 'open' wings the main wall has an opening already, so no extra exclusion needed. */
  pushCladding(cfg, plan, '', new Set());

  /* ── Coplanar cladding merge ─────────────────────────────────────────────
     Special-case post-process only: when a wing face is flush with a main
     face, replace the rectangular main-face cladding panel with one L/T-shaped
     shared cladding panel. Kept isolated from ordinary cladding generation so
     wing/main fixes do not accidentally get buried inside merge-specific code. */
  function applyCoplanarCladdingMerges() {
    if (!cfg.wings || cfg.wings.length === 0) return;
    const split = hasSplitCladding(cfg);
    // Main panel IDs differ for split vs single cladding. For split cladding
    // we merge band-by-band (upper with upper, ground with ground); for single
    // cladding we merge one combined panel.
    const cladIdsFor = split
      ? {
          front: ['cladding_front_upper', 'cladding_front_ground'],
          back:  ['cladding_back_upper',  'cladding_back_ground'],
          east:  ['cladding_east_upper',  'cladding_east_ground'],
          west:  ['cladding_west_upper',  'cladding_west_ground'],
        }
      : {
          front: ['cladding_front'],
          back:  ['cladding_back'],
          east:  ['cladding_side_east'],
          west:  ['cladding_side_west'],
        };
    const fx = v => v.toFixed(3);

    // Helper: parse a 4-point rect-shaped SVG path back to {x,y,w,h}
    function rectFromCutPath(d) {
      if (!d || typeof d !== 'string') return null;
      const re = /^M\s+([-\d.]+),([-\d.]+)\s+L\s+([-\d.]+),([-\d.]+)\s+L\s+([-\d.]+),([-\d.]+)\s+L\s+([-\d.]+),([-\d.]+)\s+Z\s*$/;
      const mm = d.match(re);
      if (!mm) return null;
      const n = mm.slice(1).map(parseFloat);
      const x1 = n[0], y1 = n[1], x2 = n[2], y2 = n[3], x3 = n[4], y3 = n[5], x4 = n[6], y4 = n[7];
      if (Math.abs(x1 - x4) > 0.001 || Math.abs(x2 - x3) > 0.001 ||
          Math.abs(y1 - y2) > 0.001 || Math.abs(y3 - y4) > 0.001) return null;
      return { x: x1, y: y1, w: x2 - x1, h: y4 - y1 };
    }

    // Process per-face using the shared topology. Each face gets its merge
    // applied once with both wings (if present) baked into a single T-shape.
    // This avoids the previous bug where iterating wings would overwrite an
    // earlier wing's L-shape with a later wing's L-shape.
    const faceMerges = computeFaceMerges(cfg, mainW, mainD);

    for (const face of ['front', 'back', 'east', 'west']) {
      const faceM = faceMerges[face];
      if (!faceM.left && !faceM.right) continue;

      // Filter out wings whose cladding split flag doesn't match main's. We
      // can't merge a single-band wing panel into a split (upper/ground) main
      // pair or vice-versa.
      const filteredM = { left: null, right: null };
      for (const side of ['left', 'right']) {
        const m = faceM[side];
        if (!m) continue;
        const wCfg = buildWingCfg(cfg, m.wing);
        if (split !== hasSplitCladding(wCfg)) continue;
        filteredM[side] = m;
      }
      if (!filteredM.left && !filteredM.right) continue;

      const mainIds = cladIdsFor[face];
      const bands   = split ? ['upper', 'ground'] : [null];

      for (let bi = 0; bi < mainIds.length; bi++) {
        const mainId = mainIds[bi];
        const band   = bands[bi];
        const idx    = parts.findIndex(p => p.id === mainId);
        if (idx < 0) continue;
        const mainPart = parts[idx];

        // Generate wing cladding panels for each side that has a merge.
        const wingData = { left: null, right: null };
        for (const side of ['left', 'right']) {
          const m = filteredM[side];
          if (!m) continue;
          const wCfg  = buildWingCfg(cfg, m.wing);
          const wPlan = buildEdgePlans(wCfg);
          const wingPart = band
            ? generateCladdingPanel(wCfg, wPlan, m.wingFace, band)
            : generateCladdingPanel(wCfg, wPlan, m.wingFace);
          if (!wingPart) continue;
          wingData[side] = { m, wCfg, wingPart };
        }
        if (!wingData.left && !wingData.right) continue;

        const mainCW = mainPart.bboxW;
        const mainCH = mainPart.bboxH;
        const leftCW  = wingData.left  ? wingData.left.wingPart.bboxW  : 0;
        const leftCH  = wingData.left  ? wingData.left.wingPart.bboxH  : 0;
        const rightCW = wingData.right ? wingData.right.wingPart.bboxW : 0;
        const rightCH = wingData.right ? wingData.right.wingPart.bboxH : 0;
        const stepYL = mainCH - leftCH;
        const stepYR = mainCH - rightCH;
        const totalW = leftCW + mainCW + rightCW;
        const xMain  = leftCW;
        const xRight = leftCW + mainCW;

        // Build outer perimeter — T-shape for two wings, L-shape for one.
        let lPath;
        if (wingData.left && wingData.right) {
          lPath = `M 0,${fx(stepYL)} L ${fx(xMain)},${fx(stepYL)} L ${fx(xMain)},0 L ${fx(xRight)},0 L ${fx(xRight)},${fx(stepYR)} L ${fx(totalW)},${fx(stepYR)} L ${fx(totalW)},${fx(mainCH)} L 0,${fx(mainCH)} Z`;
        } else if (wingData.left) {
          lPath = `M 0,${fx(stepYL)} L ${fx(xMain)},${fx(stepYL)} L ${fx(xMain)},0 L ${fx(totalW)},0 L ${fx(totalW)},${fx(mainCH)} L 0,${fx(mainCH)} Z`;
        } else {
          lPath = `M 0,0 L ${fx(xRight)},0 L ${fx(xRight)},${fx(stepYR)} L ${fx(totalW)},${fx(stepYR)} L ${fx(totalW)},${fx(mainCH)} L 0,${fx(mainCH)} Z`;
        }

        // Bay cutout / other rect-shaped extra paths: translate by xMain so
        // they line up with the main portion in the merged frame.
        const extraRects = (mainPart.paths || []).slice(1)
          .map(p => rectFromCutPath(p.d))
          .filter(r => r !== null)
          .map(r => ({ ...r, x: r.x + xMain }));

        mainPart.paths = [
          { type: 'cut', d: lPath },
          ...extraRects.map(r => ({ type: 'cut', d: rectPath(r.x, r.y, r.w, r.h) })),
        ];

        // Translate main's existing features into the merged frame.
        if (xMain !== 0) {
          mainPart.rects = (mainPart.rects || []).map(r => ({ ...r, x: r.x + xMain }));
          mainPart.lines = (mainPart.lines || []).map(l => ({ ...l, x1: l.x1 + xMain, x2: l.x2 + xMain }));
        }

        // Merge each wing's features.
        const collectedWingLines = [];
        for (const side of ['left', 'right']) {
          const wd = wingData[side];
          if (!wd) continue;
          const wingTx = (side === 'left') ? 0      : xRight;
          const wingTy = (side === 'left') ? stepYL : stepYR;
          const flipWX = wd.m.flipWX;
          const extCW  = wd.wingPart.bboxW;
          const wingRects = (wd.wingPart.rects || []).map(r => {
            const x = flipWX ? (extCW - (r.x + r.w)) : r.x;
            return { ...r, x: x + wingTx, y: r.y + wingTy };
          });
          const wingLines = (wd.wingPart.lines || []).map(l => {
            const x1 = flipWX ? (extCW - l.x1) : l.x1;
            const x2 = flipWX ? (extCW - l.x2) : l.x2;
            return { ...l, x1: x1 + wingTx, y1: l.y1 + wingTy, x2: x2 + wingTx, y2: l.y2 + wingTy };
          });
          mainPart.rects = (mainPart.rects || []).concat(wingRects);
          collectedWingLines.push(...wingLines);
        }

        // Regenerate the cladding seam-line pattern across the whole merged
        // outline. Each missing corner (above a wing extension) is added as a
        // clipping cut so the pattern doesn't draw into empty space.
        const cT = cfg.claddingThickness || 0.28;
        const mainStyleKey = (band === 'ground') ? cfg.firstFloorCladdingStyle  : cfg.claddingStyle;
        const stylesMatch = ['left', 'right'].every(side => {
          const wd = wingData[side];
          if (!wd) return true;
          const wsk = (band === 'ground') ? wd.wCfg.firstFloorCladdingStyle : wd.wCfg.claddingStyle;
          return wsk === mainStyleKey;
        });
        const styleSpec = CLADDING_STYLES[mainStyleKey];
        if (styleSpec && stylesMatch) {
          const cornerCuts = [];
          if (wingData.left)  cornerCuts.push({ x: 0,      y: 0, w: leftCW,  h: stepYL });
          if (wingData.right) cornerCuts.push({ x: xRight, y: 0, w: rightCW, h: stepYR });
          const cuts = mainPart.rects.concat(cornerCuts).concat(extraRects);
          const lines = generateCladdingPattern(
            styleSpec, cT, 0, totalW - cT, mainCH, cuts,
          );
          mainPart.lines = lines.map(ln => ({ type: 'etch', x1: ln.x1, y1: ln.y1, x2: ln.x2, y2: ln.y2 }));
        } else {
          // Style mismatch — keep main's regenerated pattern (if any) and add
          // each wing's etched lines verbatim, translated.
          mainPart.lines = (mainPart.lines || []).concat(collectedWingLines);
        }

        // Update bbox and name.
        mainPart.bboxW = totalW;
        mainPart._coplanarMerge = { kind: 'cladding', face, band: band || 'all', shape: (wingData.left && wingData.right) ? 'T' : 'L' };
        const shape = (wingData.left && wingData.right) ? 'T-shape' : 'L-shape';
        if (!mainPart.name.includes('-shape')) mainPart.name += ` (${shape})`;
      }
    }
  }
  applyCoplanarCladdingMerges();

  const mainSupplementalCtx = makeBlockContext(cfg, { cfg, plan, suffix: '', label: 'Main' });
  parts.push(...generateBlockSupplementalParts(mainSupplementalCtx, parts));

  if (cfg.roofStyle !== 'gabled') {
    const cT = cfg.claddingThickness;
    parts.push({ id: 'cladding_roof', name: 'Cladding Roof', material: 'cladding',
      bboxW: plan.fbWidth + 2*cT, bboxH: cfg.depth + 2*cT,
      bboxOffsetX: 0, bboxOffsetY: 0,
      paths: [{ type: 'cut', d: rectPath(0, 0, plan.fbWidth + 2*cT, cfg.depth + 2*cT) }],
      rects: [], lines: [] });
  }

  /* ---- 2. Wings ---- */
  for (let wi = 0; wi < cfg.wings.length; wi++) {
    const wing = cfg.wings[wi];
    const sfx = `_wing${wi}`;
    const wCfg = buildWingCfg(cfg, wing);
    const wPlan = buildEdgePlans(wCfg);
    const wingLayoutClipTransform = (localOffsetX, localOffsetY) => ({
      kind: 'wing',
      face: wing.face,
      offset: wing.offset,
      mainW: cfg.width,
      mainD: cfg.depth,
      localOffsetX: localOffsetX || 0,
      localOffsetY: localOffsetY || 0,
    });
    const wingRoofLocalOffset = () => {
      if (wCfg.roofStyle === 'parapet') {
        return { x: wPlan.matT, y: wCfg._omitConnectionWall ? 0 : wPlan.matT };
      }
      if (wCfg.roofStyle === 'flat_overhang') {
        const O = Math.max(0, Number(wCfg.roofOverhang) || 5);
        return { x: -O, y: -O };
      }
      return { x: 0, y: 0 };
    };
    const wingRoofCladdingLocalOffset = () => {
      if (wCfg.roofStyle === 'parapet') {
        return { x: wPlan.matT, y: wCfg._omitConnectionWall ? 0 : wPlan.matT };
      }
      if (wCfg.roofStyle === 'flat_overhang') {
        const O = Math.max(0, Number(wCfg.roofOverhang) || 5);
        return { x: -O, y: -O };
      }
      const cT = Number(wCfg.claddingThickness) || 0;
      return { x: -cT, y: -cT };
    };
    const connWall = wingConnectionWallKey(wing); // wing-local connection face
    const exposedConnectionSegments = exposedWingConnectionSegments(cfg, wing);
    const sharedConnectionOverlap = wingConnectionOverlapInLocal(cfg, wing);

    // Walls — shared block wrapper handles side/front-back dispatch, suffixes,
    // Wing N naming, and coplanar-face suppression.
    //
    // The wing-local connection face is omitted for both "Open" and "Wall"
    // connections. For "Wall" connections the visible divider is the main
    // wall itself; the wing's two side walls tab into slots cut in that main
    // wall. Do not add a separate wing front/back divider panel here.
    const wingBlockCtx = makeBlockContext(cfg, { wing, wingIndex: wi, cfg: wCfg, plan: wPlan, suffix: sfx });
    parts.push(...generateBlockCoreWallParts(wingBlockCtx, {
      excludeFaces: new Set([connWall]),
      skipCoplanar: true,
    }));
    for (const segment of exposedConnectionSegments) {
      parts.push(generateExposedConnectionCorePanel(cfg, wCfg, wPlan, wing, wi, segment));
    }

    /* Wing floor — merged into main building floor via generateMergedFloor,
       so we DON'T push a separate wing floor part here. */

    /* Wing inter-floor panels */
    const wInterFloors = generateInterFloorPanels(wCfg, wPlan);
    wInterFloors.forEach((p, i) => { p.id += sfx; p.name = `Wing ${wi+1} ${p.name}`; });
    parts.push(...wInterFloors);

    /* Wing roof */
    const wRoof = generateRoof(wCfg, wPlan);
    const wRoofOff = wingRoofLocalOffset();
    if (Array.isArray(wRoof)) {
      wRoof.forEach((p, i) => {
        p.id += sfx;
        p.name = `Wing ${wi+1} ${p.name}`;
        // Flat/parapet wing roof panels live in wing-local plan coordinates;
        // mark them crop-aware so layout cut lines/arcs affect the exported
        // core roof piece for this wing instead of only the main roof.
        if (p.id.startsWith('roof' + sfx) || p.id.includes('roof')) {
          p._layoutClipTransform = wingLayoutClipTransform(wRoofOff.x, wRoofOff.y);
        }
      });
      parts.push(...wRoof);
    } else {
      wRoof.id += sfx; wRoof.name = `Wing ${wi+1} Roof`;
      wRoof._layoutClipTransform = wingLayoutClipTransform(wRoofOff.x, wRoofOff.y);
      parts.push(wRoof);
    }

    /* Wing cladding:
       - Always exclude the connection face ('front') from EXTERIOR cladding — it is
         interior even when the solid core connection wall is generated above.
       - Also exclude coplanar parallel faces ('west'/'east') when they are flush with
         a main-block outer face; those positions are already covered by the main block's
         cladding and generating a wing panel there would create a double layer. */
    const cp2 = wingCoplanarCheck(wing, mainW, mainD);
    const wCladExclude = new Set(['front']); // connection face always interior
    if (cp2.westCoplanar) wCladExclude.add('west');
    if (cp2.eastCoplanar) wCladExclude.add('east');
    pushCladding(wCfg, wPlan, sfx, wCladExclude);
    for (const segment of exposedConnectionSegments) {
      parts.push(...generateExposedConnectionCladdingPanels(wCfg, wi, segment));
    }

    // Shared-wall interior cladding for solid wing connections.
    // The wing connection face is intentionally excluded from exterior
    // cladding and its core wall is omitted, because the main wall is the
    // shared structural wall. But the wing-side face of that shared wall
    // still needs an interior cladding piece. The main-building side is
    // already handled by the main block's own interior cladding panel.
    if (wing.connection !== 'open') {
      const sharedList = generateSharedConnectionInteriorCladding(wCfg, wi, sharedConnectionOverlap);
      let sharedIdx = 0;
      for (const sharedIp of sharedList) {
        sharedIdx++;
        sharedIp._sharedWallInteriorCladding = true;
        applyBlockIdentity(sharedIp, wingBlockCtx, {
          nameMode: 'suffix',
          meta: { area: 'interior_walls', role: 'interior_cladding', splitInteriorByFloor: sharedList.length > 1 },
        });
        parts.push(sharedIp);
      }
    }

    if (wCfg.roofStyle !== 'gabled') {
      const cT = wCfg.claddingThickness;
      let wRW, wRH;
      if (wCfg.roofStyle === 'parapet') {
        // Parapet — cladding fits over the recessed wing roof. With an
        // omitted connection wall, the roof/cladding run starts at the main
        // wall seam and only loses the far wall thickness along depth.
        wRW = wPlan.fbWidth - 2 * wPlan.matT;
        // Core roof still uses the structural inside span plus tabs, but the
        // roof cladding is the visible cap sheet. When the connection wall is
        // omitted, that visible sheet should cover from the main-wall seam to
        // the far wing edge; otherwise the side-attached wing looks one core
        // thickness short even though the slotted core roof has its tab.
        wRH = wCfg._omitConnectionWall ? wCfg.depth : (wCfg.depth - 2 * wPlan.matT);
      } else {
        // Flat — cladding spans the wing's outer footprint + cT overhang.
        wRW = wPlan.fbWidth + 2 * cT;
        wRH = wCfg.depth    + 2 * cT;
      }
      // Etch the configured roof cladding pattern onto the wing's roof
      // sheet. Mirrors the main building's flat/parapet roof cladding
      // handling (see line ~13544): falls back to wall cladding when no
      // roof-specific style is set. Without this, wing roofs shipped as
      // blank sheets even when the main building emitted a tiled pattern
      // — and there was no way to override roof cladding per-wing
      // separately from wall cladding.
      const wRoofStyleKey  = wCfg.roofCladdingStyle || wCfg.claddingStyle;
      const wRoofStyleSpec = CLADDING_STYLES[wRoofStyleKey];
      const wRoofLines = wRoofStyleSpec
        ? generateCladdingPattern(wRoofStyleSpec, 0, 0, wRW, wRH, [], null)
            .map(seg => ({ type: 'etch', x1: seg.x1, y1: seg.y1, x2: seg.x2, y2: seg.y2 }))
        : [];
      const wCladOff = wingRoofCladdingLocalOffset();
      parts.push({ id: 'cladding_roof' + sfx, name: `Wing ${wi+1} Cladding Roof`, material: 'cladding',
        bboxW: wRW, bboxH: wRH,
        bboxOffsetX: 0, bboxOffsetY: 0,
        paths: [{ type: 'cut', d: rectPath(0, 0, wRW, wRH) }],
        rects: [], lines: wRoofLines,
        _layoutClipTransform: wingLayoutClipTransform(wCladOff.x, wCladOff.y) });
    }

    // Wing-local supplemental parts use the same helper as the main block.
    // Global-only items such as billboards, rooftop shields, mech rooms, and
    // ground-floor offsets remain main-block features unless a future wing UI
    // exposes separate controls for them.
    parts.push(...generateBlockSupplementalParts(wingBlockCtx, parts, {
      groundFloorOffset: false,
      rooftopMechRoom: false,
      billboards: false,
      rooftopShield: false,
    }));

    /* ---- 3. Dividing wall (for 'wall' connections) ----
       Historically a separate part was generated here, but it had the wrong
       dimensions (width = wing.depth instead of wing.span) and wasn't placed
       anywhere in the assembly — so the wing roof's TOP tongue had no slot.
       The slot is now cut directly into main's wall at the connection face
       (see "Wing roof TOP-tongue slots in main walls" above), and this piece
       is no longer produced. The generator is kept in the file in case any
       other code path references it. */
    // if (wing.connection === 'wall') {
    //   const dw = generateDividingWall(cfg, plan, wCfg, wPlan, wing, wi);
    //   parts.push(dw);
    // }

    /* Wing trusses + X-bracing — same rules as main, but operating on
       the wing's own trusses object (carried on the wing). The sfx
       discriminator keeps part ids unique across wings, and the name
       prefix surfaces "Wing 1/2/…" in the parts panel so the user can
       tell which truss belongs to which block at glue time. Layout cuts
       are authored in main/world coordinates, so trusses are cropped by
       converting each wing-local truss station into that shared footprint
       frame before span/omission decisions are made. */
    const wingTrussCropTransform = { kind: 'wing', face: wing.face, offset: wing.offset, mainW: cfg.width, mainD: cfg.depth };
    const wingLayoutCropCtx = {
      rootCfg: cfg,
      toWorld: p => wingLocalToWorldPointForLayoutCut(cfg, wingTrussCropTransform, p),
    };
    parts.push(...generateTrussesForBlock(wCfg, wPlan, sfx, `Wing ${wi + 1} `, wingLayoutCropCtx));
    parts.push(...generateXBracesForBlock(wCfg, wPlan, sfx, `Wing ${wi + 1} `));

    /* Wing column supports. The PARTS get emitted just like main's, and
       the floor footprint etchings are now written onto the wing's actual
       floor area: directly onto a split wing floor when material-size
       panelization separated it, or transformed into the merged floor's
       global coordinate frame when the wing remains part of the combined
       floor. */
    const colSupWing = generateColumnSupportsForBlock(wCfg, wPlan, sfx, `Wing ${wi + 1} `, wingLayoutCropCtx);
    parts.push(...colSupWing.parts);
    applyWingColumnFloorEtchings(parts, colSupWing.etches, cfg, wing);
  }

  /* ---- Window/door tallies ---- */
  let totalWindows = 0, upperWindows = 0, groundWindows = 0, totalDoors = 0;
  let blankedUpper = 0, blankedGround = 0;
  const doorTallies = {};
  const allWindowSpecs = [];
  const allBlankedSpecs = [];
  for (const p of parts) {
    if (!p) continue;
    // Same rule as the main-building path: collect window/door metadata from
    // any material. This is especially important for wings, where users often
    // route cladding styles to custom material folders; otherwise multi-pane
    // grid frames such as Office 3×2 and style-specific door inserts vanish
    // from the cut sheets.
    if (p.windows)       totalWindows += p.windows;
    if (p.upperWindows)  upperWindows += p.upperWindows;
    if (p.groundWindows) groundWindows += p.groundWindows;
    if (p.blankedUpper)  blankedUpper += p.blankedUpper;
    if (p.blankedGround) blankedGround += p.blankedGround;
    if (p.doors)         totalDoors += p.doors;
    if (p.windowSpecs && p.windowSpecs.length) allWindowSpecs.push(...p.windowSpecs);
    if (p.blankedSpecs && p.blankedSpecs.length) allBlankedSpecs.push(...p.blankedSpecs);
    if (p.doorStyleTallies) {
      for (const [s, n] of Object.entries(p.doorStyleTallies)) {
        doorTallies[s] = (doorTallies[s] || 0) + n;
      }
    }
  }
  const windowParts = (allWindowSpecs.length > 0)
    ? generateWindowPartsFromSpecs(cfg, allWindowSpecs)
    : generateWindowParts(cfg, upperWindows, groundWindows);
  parts.push(...windowParts);
  const blankedParts = (allBlankedSpecs.length > 0)
    ? generateBlankedWindowPanelsFromSpecs(cfg, allBlankedSpecs)
    : generateBlankedWindowPanels(cfg, blankedUpper, blankedGround);
  parts.push(...blankedParts);
  parts.push(...generateDoorInserts(cfg, doorTallies));
  parts.push(...generateFixtureParts(cfg, tallyFixtures(cfg)));
  parts.push(...generateShutterParts(cfg, tallyShutters(cfg)));
  parts.push(...generateCladdingOverrideParts(cfg, tallyCladdingOverrides(cfg, plan)));
  parts.push(...generateSkylightParts(cfg, tallySkylights(cfg)));
  parts.push(...generatePrintedSheets(cfg, tallyPrintedItems(cfg)));

  parts.push(...generateInternalWallParts(cfg, plan));
  injectInternalWallSlots(parts, cfg, plan);

  parts.push(...generateLayoutCutSolidBackParts(cfg, plan));
  applyLayoutCutsToGeneratedParts(cfg, parts);

  normalizePartsMetadata(parts);
  return { parts, plan, totalWindows, upperWindows, groundWindows, totalDoors };
}

/* ---- Dividing wall generator ---- */
export function generateDividingWall(cfg, mainPlan, wCfg, wPlan, wing, wingIdx) {
  const sfx = `_wing${wingIdx}_div`;
  const matT = cfg.coreThickness;
  const tw   = cfg.tongueWidth;
  const wH   = wPlan.H;  // wing height
  const mH   = mainPlan.H; // main height

  // The dividing wall panel dimensions:
  // Width  = wing.depth (extends from main face outward)
  // Height = max(mH, wH) at the connection zone
  // For this V1: use wing height. The main block wall already ends at mH.
  const divW = wing.depth;
  const divH = wH;

  const margin = Math.max(matT * 2, 5);

  // Tongue positions on the edge that connects into the main block wall
  const vEdgeMin  = Math.max((wPlan.parapetH || 0) + matT + 2, 8);
  const vEdgeMax  = divH - margin;
  const vCount    = Math.max(2, Math.min(4, Math.floor(Math.max(0, vEdgeMax - vEdgeMin) / 40)));
  const connTongues = placeTongues(divH, tw, 0.1, [[0, vEdgeMin], [vEdgeMax, divH]], vCount, tw / 2);

  // Top tongues (into any roof structure)
  const topTongues = placeTongues(divW, tw, margin, [], 2, tw / 2);
  // Bottom tongues (into floor)
  const bottomTongues = placeTongues(divW, tw, margin, [], 2, tw / 2);

  // Inter-floor slots (matching the WING's floor layout)
  const rects = [];
  for (const slotY of (wPlan.slotYs || [])) {
    rects.push({ type: 'cut', x: 0, y: slotY - matT / 2, w: divW, h: matT, compensateKerf: true });
  }

  // Build perimeter using buildWallPath — left edge has tongues into the main block wall
  const spec = {
    width: divW, height: divH, matT, kerf: cfg.kerfComp,
    edges: {
      top:    { tongues: topTongues,    openings: [] },
      bottom: { tongues: bottomTongues, openings: [] },
      left:   { tongues: connTongues,   openings: [] },  // protrudes into main block wall
      right:  { tongues: [],            openings: [] },
    }
  };
  const perimeter = buildWallPath(spec);

  // Windows: no windows on the dividing wall (it's interior)
  return {
    id: `dividing_wall${sfx}`,
    name: `Wing ${wingIdx + 1} Dividing Wall`,
    material: 'core',
    bboxW: divW + 2 * matT,
    bboxH: divH + 2 * matT,
    bboxOffsetX: matT,
    bboxOffsetY: matT,
    paths: [{ type: 'cut', d: perimeter }],
    rects,
    lines: [],
    windows: 0,
    doors: 0,
  };
}
