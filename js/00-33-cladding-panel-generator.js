'use strict';

/* =====================================================================
   WALL CLADDING PANEL GENERATOR
   ===================================================================== */
/* Reverse the cladding-frame x transform back to wall-frame coords.
 *   - front/back: cladding-X = wall-X + cT → wall-X = cladding-X - cT
 *   - west:       cladding-X = wall-X + matT → wall-X = cladding-X - matT
 *   - east:       cladding-X = sideLen - wall-X - w + matT (mirrored)
 *                 → wall-X = sideLen - (cladding-X - matT) - w
 *
 * The trim generator uses this to know where openings ACTUALLY sit on the
 * wall (so notches on the trim strip line up with the door / window cuts
 * underneath, regardless of which wall the trim is for).
 */
function wallXFromCladdingX(cladX, cladW, which, plan, cfg) {
  const cT = cfg.claddingThickness;
  const matT = cfg.coreThickness;
  if (which === 'front' || which === 'back') {
    return cladX - cT;
  }
  if (which === 'west') {
    return cladX - matT;
  }
  // east — mirrored
  return plan.sideLen - (cladX - matT) - cladW;
}

/* Generate cladding for a wall */
function generateCladdingPanel(cfg, plan, which, band) {
  // band: undefined or null = full wall (one panel)
  //       'upper' = only the upper-floors portion (excludes ground floor)
  //       'ground' = only the ground-floor portion
  // When split is requested, the boundary is at H - firstFloorHeight in wall coords,
  // i.e. the boundary (in cladding y) is cT + (H - firstFloorHeight) below the cladding top.
  const { matT, tw, parapetH, fbWidth, sideLen, bayHeight, H,
          hasFrontBay, hasBackBay } = plan;
  // Through-bay mirror for back wall (see planBayXFor). For front, west,
  // east, or side bays this returns plan.bayXStart unchanged.
  const { bayXStart, bayXEnd } = planBayXFor(plan, which);
  const cT = cfg.claddingThickness;
  const floorBottomCladdingExtension = cfg.claddingExtendsToFloorBottom
    ? Math.max(0, Number(cfg.coreThickness || matT || 0))
    : 0;
  const splitMode = (band === 'upper' || band === 'ground');
  // Choose cladding style: ground band uses override style if enabled, otherwise default.
  const styleKey = (band === 'ground') ? getGroundFloorCladdingStyle(cfg) : cfg.claddingStyle;
  const claddingStyleSpec = CLADDING_STYLES[styleKey] || CLADDING_STYLES[cfg.claddingStyle];
  // Boundary in WALL frame (y=0 at top, y=H at bottom): the line where upper band 
  // meets ground band. = H - firstFloorHeight
  const firstFloorHeight = plan.firstFloorHeight;
  const boundaryWall = H - firstFloorHeight;

  let cWidth, cHeight, cName, cId;
  let hasBay = false;
  let baySpec = null;
  // Different walls have different cladding dimensions:
  //   front/back: full outer width + 2*cT overhang on left+right + cT overhang on top
  //               (the overhang wraps around to cover the side wall outer edges in X)
  //   sides: full sideLen — covers the entire visible side wall body.
  //          The front/back cladding overhangs cover the corner in X (perpendicular);
  //          there is NO reason to inset the side cladding in Z.
  if (which === 'front' || which === 'back') {
    // For a slanted NS-axis roof the HIGH-side wall extends UP by the slope
    // pitch so its top sits at the roof's high edge. The cladding follows —
    // adding the same sPitch of height keeps the visible exterior flush with
    // the wall and the roof angle. The LOW-side wall's cladding stays at H
    // exactly (matches its wall, no extension).
    const isSlantedFBRoof = cfg.roofStyle === 'slanted';
    const cladSlopeDir    = cfg.roofSlopeDirection || 'back';
    const cladIsNS        = isSlantedFBRoof && (cladSlopeDir === 'front' || cladSlopeDir === 'back');
    const cladIsHighSide  = cladIsNS && (
      (cladSlopeDir === 'front' && which === 'front') ||
      (cladSlopeDir === 'back'  && which === 'back')
    );
    // Parapet-hidden gable: when this FB wall is a parapeted wall, the
    // wall extends up by (pitch + parapetH). The cladding wraps the
    // full visible face, so its height grows by the same amount. Same
    // mechanism as the slanted high-side wall above — different reason
    // (this is a flat extension above the eave, not a slope rise to
    // meet a tilted roof).
    const cladFBParapetUp = wallHasParapet(cfg, which)
                            ? ((cfg.roofPitch || 10) + (cfg.parapetHeight || 0))
                            : 0;
    const slopeRise = cladIsHighSide ? (cfg.roofPitch || 10) : cladFBParapetUp;
    cWidth = fbWidth + 2 * cT;
    cHeight = H + slopeRise;
    cId = 'cladding_' + which;
    cName = (which === 'front' ? 'Front' : 'Back') + ' Cladding';
    hasBay = (which === 'front' ? hasFrontBay : hasBackBay);
    if (hasBay) {
      // Bay cutout: in cladding frame, shifted by +cT from wall frame (because cladding extends cT to left of wall x=0)
      const wallBottomY = cHeight - floorBottomCladdingExtension;
      baySpec = {
        x: bayXStart + cT,
        y: wallBottomY - bayHeight,
        w: bayXEnd - bayXStart,
        h: bayHeight + floorBottomCladdingExtension,
      };
    }
  } else {
    // Side cladding spans exactly the building's external depth: matT corner
    // + sideLen wall body + matT corner = mainD. NO overhang past the corners
    // — the front/back cladding's cT overhang on each end is what covers the
    // corner seam (it overlaps the outer face of this side cladding at the
    // corner). Wall body's x=0 sits at cladding-frame x = matT, so openings
    // shift by matT on x.
    // For a slanted NS-axis roof the side wall is trapezoidal: tall on the
    // high-eave end, short on the low-eave end. The cladding follows that
    // trapezoid — its panel height grows by sPitch and its TOP edge slants
    // between the two corners so the cladding wraps the wall outline exactly.
    const sideClSlantedNS = cfg.roofStyle === 'slanted'
                          && ((cfg.roofSlopeDirection || 'back') === 'front'
                           || (cfg.roofSlopeDirection || 'back') === 'back');
    // Same parapet-extension logic as the FB branch above — when this
    // side wall is parapeted under parapet_gable, the cladding grows
    // up by (pitch + parapetH) to wrap the extended wall.
    const cladSideParapetUp = wallHasParapet(cfg, which)
                              ? ((cfg.roofPitch || 10) + (cfg.parapetHeight || 0))
                              : 0;
    const sideSlopeRise = sideClSlantedNS ? (cfg.roofPitch || 10) : cladSideParapetUp;
    cWidth = sideLen + 2 * matT;
    cHeight = H + sideSlopeRise;
    cId = 'cladding_side_' + which;
    cName = 'Side Cladding ' + (which === 'east' ? 'East' : 'West');
  }

  // Optional floor-edge skirt: extend only the bottom of exterior cladding
  // downward by one core/floor thickness so the cladding can cover the exposed
  // edge of the floor panel. This must NOT shift any wall-coordinate content:
  // windows, doors, fixtures, cladding overrides, bay positions, and etched
  // patterns remain aligned to the original wall frame. Bottom-touching
  // openings are extended through the skirt below.
  if (floorBottomCladdingExtension > 0.01) {
    cHeight += floorBottomCladdingExtension;
  }

  // Apply band restriction by trimming the cladding panel to the appropriate Y range.
  // boundaryClad is the boundary expressed in CLADDING frame y. Cladding frame y now
  // Boundary in CLADDING frame. For the standard case (no top overhang)
  // the cladding panel runs y=[0, H] and matches the wall coordinates
  // exactly, so the boundary sits at boundaryWall. For the high-side FB
  // wall of a slanted NS-axis roof, the cladding extends an additional
  // sPitch above the wall (cHeight = H + sPitch), and the boundary
  // shifts down by that amount inside the cladding frame so the ground
  // band still wraps exactly the firstFloorHeight bottom strip.
  const cladTopOverhang = cHeight - H - floorBottomCladdingExtension;
  const boundaryClad = boundaryWall + cladTopOverhang;
  let panelYStart = 0;          // top of this panel in cladding frame
  let panelYEnd = cHeight;      // bottom of this panel in cladding frame
  if (band === 'upper') {
    panelYEnd = boundaryClad;   // upper panel ends at the boundary
    cId = 'cladding_' + which + '_upper';
    cName = (which === 'front' ? 'Front' : (which === 'back' ? 'Back' : 'Side ' + which)) + ' Cladding (upper)';
  } else if (band === 'ground') {
    panelYStart = boundaryClad; // ground panel starts at the boundary
    cId = 'cladding_' + which + '_ground';
    cName = (which === 'front' ? 'Front' : (which === 'back' ? 'Back' : 'Side ' + which)) + ' Cladding (ground)';
  }
  const panelHeight = panelYEnd - panelYStart;

  // For BAY: only include the bay if it's in this band's Y range.
  // The bay's Y range in cladding frame is [cHeight - bayHeight, cHeight].
  if (baySpec) {
    if (panelYEnd <= baySpec.y || panelYStart >= baySpec.y + baySpec.h) {
      baySpec = null;  // bay not in this band; remove it
      hasBay = false;
    } else {
      // Clip bay to band range and translate to band-local coords (so panelYStart -> 0)
      const clippedY0 = Math.max(baySpec.y, panelYStart);
      const clippedY1 = Math.min(baySpec.y + baySpec.h, panelYEnd);
      baySpec = {
        x: baySpec.x,
        y: clippedY0 - panelYStart,
        w: baySpec.w,
        h: clippedY1 - clippedY0,
      };
    }
  }

  // After translation: this panel's local frame is [0, cWidth] × [0, panelHeight].
  // From here on, all coordinates are in this panel-local frame.
  const localCWidth = cWidth;
  const localCHeight = panelHeight;

  // Gable-end cladding: the panel is a pentagon (triangle sits above the rectangle).
  // Only applies when the top of this band is at the wall top (panelYStart === 0).
  // SIDE cladding for slanted NS-axis: trapezoidal panel matching the
  // trapezoidal side wall. The top edge slants between the low corner
  // (y=cladTopOverhang in the panel frame) and the high corner (y=0).
  // slopeDir='back' → high on the north (right of panel, x=cWidth).
  // slopeDir='front' → high on the south (left of panel, x=0).
  const isSideSlantedClad = (which === 'east' || which === 'west')
                            && cfg.roofStyle === 'slanted'
                            && ((cfg.roofSlopeDirection || 'back') === 'front'
                             || (cfg.roofSlopeDirection || 'back') === 'back');
  const clPitch = cfg.roofPitch || 10;
  // Trapezoidal side cladding's slanted top edge corner Y values. Hoisted
  // so the pattern generator can clip engrave lines against this same edge.
  // slopeDir='back'  → high on the north (right, x=localCWidth, y=0); low on the south.
  // slopeDir='front' → high on the south (left, x=0, y=0); low on the north.
  const _slopeDirLocal = cfg.roofSlopeDirection || 'back';
  const sideClTopLeftY  = isSideSlantedClad ? (_slopeDirLocal === 'front' ? 0 : clPitch) : 0;
  const sideClTopRightY = isSideSlantedClad ? (_slopeDirLocal === 'front' ? clPitch : 0) : 0;
  // A wall is a "cladding gable end" — meaning the cladding panel gets
  // a triangular apex above the rectangle — only when the underlying
  // wall actually has a triangular peak. Plain `gabled` walls do; the
  // parapet_gable variant's gable-end walls instead carry a FLAT
  // parapet that hides the would-be peak (we already extended cHeight
  // up by pitch + parapetH above), so the cladding stays rectangular.
  // Treating those as gable-end here would double-stack: cHeight grew
  // by pitch+parapetH AND a clPitch triangle would be added on top of
  // that, giving a sloped-top panel sitting above the parapet — both
  // wrong visually and structurally.
  const isCladdingGableEnd = isGableEndWall(cfg, which)
                              && panelYStart === 0
                              && !wallHasParapet(cfg, which);
  let perimPath;
  if (isCladdingGableEnd) {
    // Apex is above the rectangle by clPitch (in the panel's local coordinate frame).
    // Eaves at the panel top (y=0); apex at y=-clPitch (above panel top).
    const eaveY  = 0;
    const apexY  = -clPitch;       // negative — above the panel top
    perimPath = `M 0,${eaveY} L ${(localCWidth / 2).toFixed(3)},${apexY.toFixed(3)} L ${localCWidth},${eaveY} L ${localCWidth},${localCHeight} L 0,${localCHeight} Z`;
  } else if (isSideSlantedClad && !splitMode) {
    // Trapezoidal side cladding. We only emit the slanted top in the full-panel
    // (un-split) case so the band-split logic stays a clean rectangle for each
    // band — the apex of the slope is always in the topmost band, which the
    // splitMode renderer handles separately below if ever needed.
    perimPath = `M 0,${sideClTopLeftY} L ${localCWidth.toFixed(3)},${sideClTopRightY} `
              + `L ${localCWidth.toFixed(3)},${localCHeight.toFixed(3)} `
              + `L 0,${localCHeight.toFixed(3)} Z`;
  } else {
    perimPath = rectPath(0, 0, localCWidth, localCHeight);
  }
  const paths = [{ type: 'cut', d: perimPath }];

  const rects = [];
  const lines = [];
  // When edge/full-height cladding overrides split the base cladding into
  // retained sub-pieces, clip all engraves/marks to those visible pieces.
  // Otherwise fixture ticks and pattern remnants can remain in the blank
  // replaced region even though no base cladding will exist there.
  let retainedEtchClipRects = null;
  const flushEdgeOverrideCuts = [];
  const BOTTOM_TOUCH_EPS = 0.02;
  const bottomCutouts = [];
  const edgeOverrideCuts = [];
  function addFlushEdgeOverrideCut(cut) {
    if (!cut) return;
    const x1 = Math.max(0, Math.min(localCWidth, cut.x1));
    const y1 = Math.max(0, Math.min(localCHeight, cut.y1));
    const x2 = Math.max(0, Math.min(localCWidth, cut.x2));
    const y2 = Math.max(0, Math.min(localCHeight, cut.y2));
    if (x2 <= x1 + 0.01 || y2 <= y1 + 0.01) return;
    flushEdgeOverrideCuts.push({ x1, y1, x2, y2 });
    addEdgeOverrideCut({ x1, y1, x2, y2 });
  }
  function subtractRectFromRects(rectsIn, cut) {
    const out = [];
    const eps = 0.01;
    for (const r of rectsIn) {
      const ix1 = Math.max(r.x, cut.x1);
      const iy1 = Math.max(r.y, cut.y1);
      const ix2 = Math.min(r.x + r.w, cut.x2);
      const iy2 = Math.min(r.y + r.h, cut.y2);
      if (ix2 <= ix1 + eps || iy2 <= iy1 + eps) {
        out.push(r);
        continue;
      }
      // Above
      if (iy1 > r.y + eps) out.push({ x: r.x, y: r.y, w: r.w, h: iy1 - r.y });
      // Below
      if (iy2 < r.y + r.h - eps) out.push({ x: r.x, y: iy2, w: r.w, h: (r.y + r.h) - iy2 });
      // Left middle
      if (ix1 > r.x + eps) out.push({ x: r.x, y: iy1, w: ix1 - r.x, h: iy2 - iy1 });
      // Right middle
      if (ix2 < r.x + r.w - eps) out.push({ x: ix2, y: iy1, w: (r.x + r.w) - ix2, h: iy2 - iy1 });
    }
    return out.filter(r => r.w > eps && r.h > eps);
  }
  function addEdgeOverrideCut(cut) {
    if (!cut) return;
    const x1 = Math.max(0, Math.min(localCWidth, cut.x1));
    const y1 = Math.max(0, Math.min(localCHeight, cut.y1));
    const x2 = Math.max(0, Math.min(localCWidth, cut.x2));
    const y2 = Math.max(0, Math.min(localCHeight, cut.y2));
    if (x2 <= x1 + 0.01 || y2 <= y1 + 0.01) return;
    edgeOverrideCuts.push({ x1, y1, x2, y2 });
  }
  function addBottomCutout(cut) {
    if (!cut || !(cut.x2 > cut.x1)) return;
    cut.x1 = Math.max(0, Math.min(localCWidth, cut.x1));
    cut.x2 = Math.max(0, Math.min(localCWidth, cut.x2));
    if (cut.x2 - cut.x1 <= 0.01) return;
    bottomCutouts.push(cut);
  }
  function extendBottomTouchingOpening(y, h) {
    if (floorBottomCladdingExtension <= 0.01) return h;
    const wallBottomLocal = localCHeight - floorBottomCladdingExtension;
    return (y + h >= wallBottomLocal - BOTTOM_TOUCH_EPS)
      ? h + floorBottomCladdingExtension
      : h;
  }
  function addOpeningCut(x, y, w, h) {
    h = extendBottomTouchingOpening(y, h);
    if (!(w > 0 && h > 0)) return;
    // If an opening reaches the bottom edge of the panel, do not draw it as
    // a separate U-shaped path. Instead, store it and later rebuild the
    // OUTER cladding perimeter so the bottom edge routes up and around that
    // opening. This removes the visible surplus red bottom line on the
    // cladding layer and also avoids any chance of double-cutting.
    if (y + h >= localCHeight - BOTTOM_TOUCH_EPS) {
      addBottomCutout({ kind: 'simple', x1: x, x2: x + w, yTop: y });
    } else {
      rects.push({ type: 'cut', x, y, w, h, compensateKerf: false });
    }
  }
  if (baySpec) {
    addOpeningCut(baySpec.x, baySpec.y, baySpec.w, baySpec.h);
  }
  // We collect all "cut openings" first (windows + doors + bay) then use them to
  // clip etched seam lines so no etch falls inside a cut (which would be lost as scrap).
  const cutOpenings = [];

  // Segmented Wall Exposure: partyWall / structuralOnly zones do not receive
  // exterior cladding. We cut those rectangles out of the cladding panel
  // instead of treating the whole side wall as one exposure condition.
  const exposureNoCladding = wallExposureNoCladdingWallRects(
    cfg, plan, which,
    (which === 'front' || which === 'back') ? fbWidth : sideLen,
    H
  );
  function wallRectToCladdingLocal(r) {
    let x;
    if (which === 'front' || which === 'back') {
      x = r.x + cT;
    } else if (which === 'west') {
      x = r.x + matT;
    } else {
      x = (sideLen - r.x - r.w) + matT;
    }
    const yFull = r.y + cladTopOverhang;
    const y0 = Math.max(panelYStart, yFull);
    const y1 = Math.min(panelYEnd, yFull + r.h);
    if (y1 <= y0 + 0.01) return null;
    return { x, y: y0 - panelYStart, w: r.w, h: y1 - y0, exposure: r.exposure };
  }
  for (const zr of exposureNoCladding) {
    const cr = wallRectToCladdingLocal(zr);
    if (!cr) continue;
    rects.push({ type: 'cut', x: cr.x, y: cr.y, w: cr.w, h: cr.h, compensateKerf: false });
    cutOpenings.push({ x: cr.x, y: cr.y, w: cr.w, h: cr.h, kind: 'exposure_' + cr.exposure });
  }

  // Wing side-cladding connection relief. For wings, the connection-face core
  // wall is omitted and the wing's east/west side cladding runs all the way
  // back to the main-wall plane. The main wall already has exterior cladding
  // on that plane, so the wing side cladding would otherwise be too long by
  // one main cladding thickness exactly where the two cladding sheets butt
  // together. Treat this as a local edge notch at the wing's connection end.
  // Do NOT shorten/translate the whole panel: windows, doors, fixtures, and
  // etched seams keep their existing cladding-frame coordinates down the rest
  // of the piece.
  if (cfg._omitConnectionWall && (which === 'east' || which === 'west')) {
    const reliefDepth = Math.max(0, Math.min(
      localCWidth,
      Number(cfg._connectionMainCladdingThickness) || Number(cfg.claddingThickness) || 0,
    ));
    const touchH = Math.max(0, Math.min(
      cHeight,
      Number(cfg._connectionMainWallHeight) || H || cHeight,
    ));
    if (reliefDepth > 0.01 && touchH > 0.01) {
      const contactY0Full = Math.max(0, cHeight - touchH);
      const contactY1Full = cHeight;
      const overlapY0Full = Math.max(panelYStart, contactY0Full);
      const overlapY1Full = Math.min(panelYEnd, contactY1Full);
      if (overlapY1Full > overlapY0Full + 0.01) {
        const localYTop = overlapY0Full - panelYStart;
        const localYBottom = overlapY1Full - panelYStart;
        // West side cladding's connection end is the left edge. East side
        // cladding is horizontally mirrored, so its connection end is the
        // right edge.
        const reliefX1 = (which === 'east') ? (localCWidth - reliefDepth) : 0;
        const reliefX2 = (which === 'east') ? localCWidth : reliefDepth;
        addBottomCutout({ kind: 'simple', x1: reliefX1, x2: reliefX2, yTop: localYTop });
        cutOpenings.push({
          x: reliefX1,
          y: localYTop,
          w: reliefX2 - reliefX1,
          h: Math.max(0, localYBottom - localYTop),
          kind: 'wing_connection_cladding_relief',
        });
      }
    }
  }

  // Window cutouts (cladding has visible window openings; core has 1mm-bigger holes)
  const cladWindows = [];
  const cladDoors = [];
  // Surface fixtures (don't cut through — get a faint etched footprint outline
  // on the cladding so the model-maker knows where to glue each one).
  const cladFixtures = [];
  const cladOverrides = [];
  const winDims = getWindowDims(cfg);
  const groundWinDims = getGroundFloorWindowDims(cfg);

  if (which === 'front' || which === 'back') {
    const doorStyle = cfg.doorStyle;
    const fbDoorCount = (which === 'front') ? (cfg.frontDoorCount || 0) : (cfg.backDoorCount || 0);
    const doorH = (doorStyle && doorStyle !== 'none' && DOOR_STYLES[doorStyle]) ? DOOR_STYLES[doorStyle].height : 0;
    const doorReserveH = (fbDoorCount > 0 && !hasBay) ? doorH + 3 : 0;
    const slotYsForThisWall = (hasFrontBay || hasBackBay)
      ? (plan.slotYs || []).filter(y => y < (H - bayHeight) - 1)
      : (plan.slotYs || []);
    const floorCenterYsForThisWall = (hasFrontBay || hasBackBay)
      ? (plan.floorCenterYs || []).filter(y => y < (H - bayHeight) - 1)
      : (plan.floorCenterYs || []);

    const _fbManualOps = manualStructuralOps(cfg, which);
    if (_fbManualOps) {
      // Manual mode — cladding frame y now matches wall frame y (no top overhang)
      for (const op of _fbManualOps) {
        if (op.type === 'window') {
          cladWindows.push({ x: op.x + cT, y: op.y, w: op.w, h: op.h, isGround: false, style: op.style });
        } else if (op.type === 'door') {
          cladDoors.push({ x: op.x + cT, y: op.y, w: op.w, h: op.h, style: op.style || cfg.doorStyle });
        }
      }
    } else {
      // Auto mode
      const wallWindows = computeWindows(fbWidth, H, {
        density: cfg.windowDensity,
        winDims: winDims,
        groundWinDims: groundWinDims,
        groundFloorCenterY: plan.groundFloorCenterY,
        hasOpening: (hasFrontBay || hasBackBay) && (which === 'front' ? hasFrontBay : hasBackBay),
        openingY: H - bayHeight, openingH: bayHeight,
        slotYs: slotYsForThisWall,
        floorCenterYs: floorCenterYsForThisWall,
        parapetH: plan.parapetH,
        matT: plan.matT,
        doorReserveH: doorReserveH,
        cfg, plan, edgeId: which,
      });
      for (const w of wallWindows) {
        // Auto-mode windows on the ground floor pick up the first-floor
        // style override when enabled — matches the legacy two-set generator
        // which fed groundDims (carrying firstFloorWindowStyle) into the
        // ground-floor parts. Without this, ground windows would carry the
        // upper style downstream and the spec-grouping would put them in a
        // (w_ground, h_ground, upperStyle) bucket instead of the correct
        // (w_ground, h_ground, firstFloorWindowStyle) bucket.
        const winStyle = (w.isGround && cfg.firstFloorWindowStyleEnabled && cfg.firstFloorWindowStyle)
          ? cfg.firstFloorWindowStyle
          : cfg.windowStyle;
        cladWindows.push({ x: w.x + cT, y: w.y, w: w.width, h: w.height, isGround: w.isGround, style: winStyle });
      }
      if (!hasBay) {
        const wallDoors = computeDoors(fbWidth, H, {
          doorStyle: doorStyle, doorCount: fbDoorCount,
          hasOpening: false, bayXStart: 0, bayXEnd: 0,
          cfg, plan, edgeId: which,
        });
        for (const d of wallDoors) {
          cladDoors.push({ x: d.x + cT, y: d.y, w: d.width, h: d.height, style: d.style });
        }
      }
    }
    // Pull user-placed fixtures (surface-mounted, don't cut through). Same
    // cladding-frame x shift as windows/doors so the etched outline lands
    // exactly where the editor showed the fixture.
    for (const fx of surfaceWallFeaturesForFace(cfg, which, 'fixture')) {
      cladFixtures.push({
        x: fx.x + cT, y: fx.y, w: fx.w, h: fx.h,
        style: fx.style,
      });
    }
    // Pull user-placed cladding overrides — secondary-cladding patches that
    // replace the main cladding in a rectangular region. Same x shift as
    // windows/fixtures so the cut bbox lands where the editor showed it.
    //
    // Edge-flush extension: the cladding panel is `fbWidth + 2*cT` wide
    // (cT overhang on each side covers the corner where the perpendicular
    // wall's cladding ends), but the wall body itself is just `fbWidth`.
    // A patch placed at wall x=0 with width=fbWidth lands at cladding
    // x=[cT, cT+fbWidth] — leaving a cT-wide strip of base cladding
    // visible at each corner. For FB this is only ~0.3 mm and barely
    // perceptible, but the same logic on side walls (matT=1.5 mm) is
    // clearly visible. We extend the cut out to the cladding panel edge
    // on any side where the override sits flush with the wall, so a
    // full-wall patch covers the full cladding panel cleanly. The
    // matching override piece is enlarged by the same amount in
    // tallyCladdingOverrides so it slots into the wider cut.
    for (const ov of surfaceWallFeaturesForFace(cfg, which, 'cladding_override')) {
      const leftClFlush  = ov.x <= 0.001;
      const rightClFlush = (ov.x + ov.w) >= (fbWidth - 0.001);
      const leftExt  = leftClFlush  ? cT : 0;
      const rightExt = rightClFlush ? cT : 0;
      cladOverrides.push({
        x: (ov.x + cT) - leftExt,
        y: ov.y,
        w: ov.w + leftExt + rightExt,
        h: ov.h,
        claddingStyle: ov.claddingStyle,
        layered: !!ov.layered,
        // Per-override style params (e.g. corrugated sheet dimensions);
        // forwarded so generateCladdingOverrideParts can group/render
        // each variant on its own sheet. Undefined when unset → the
        // override generator uses the style's defaults.
        styleParams: ov.styleParams ? { ...ov.styleParams } : undefined,
      });
    }
  } else {
    const doorStyle = cfg.doorStyle;
    const sideDoorCount = cfg.sideDoorCount || 0;
    const doorH = (doorStyle && doorStyle !== 'none' && DOOR_STYLES[doorStyle]) ? DOOR_STYLES[doorStyle].height : 0;
    const doorReserveH = (sideDoorCount > 0) ? doorH + 3 : 0;

    const _sideManualOps = manualStructuralOps(cfg, which);
    // Side cladding spans sideLen + 2*matT, with the wall body's x=0 sitting
    // at cladding-frame x = matT (= the south corner extension).
    const sideXShift = matT;
    // East side cladding mirrors x to match the east laser core panel and the
    // openings editor display (internal view, north on right).
    const _sideCladMirrorX = (which === 'east');
    const _sideMirroredX = (rawX, w) => _sideCladMirrorX
      ? ((sideLen - rawX - w) + sideXShift)
      : (rawX + sideXShift);
    if (_sideManualOps) {
      // Manual mode — shift openings into the cladding frame
      for (const op of _sideManualOps) {
        if (op.type === 'window') {
          cladWindows.push({ x: _sideMirroredX(op.x, op.w), y: op.y, w: op.w, h: op.h, isGround: false, style: op.style });
        } else if (op.type === 'door') {
          cladDoors.push({ x: _sideMirroredX(op.x, op.w), y: op.y, w: op.w, h: op.h, style: op.style || cfg.doorStyle });
        }
      }
    } else {
      // Auto mode
      const wallWindows = computeWindows(sideLen, H, {
        density: cfg.windowDensity,
        winDims: winDims,
        groundWinDims: groundWinDims,
        groundFloorCenterY: plan.groundFloorCenterY,
        hasOpening: false, openingY: 0, openingH: 0,
        slotYs: plan.slotYs,
        floorCenterYs: plan.floorCenterYs,
        parapetH: plan.parapetH,
        matT: plan.matT,
        doorReserveH: doorReserveH,
        cfg, plan, edgeId: which,
      });
      for (const w of wallWindows) {
        // See FB-wall version above for rationale.
        const winStyle = (w.isGround && cfg.firstFloorWindowStyleEnabled && cfg.firstFloorWindowStyle)
          ? cfg.firstFloorWindowStyle
          : cfg.windowStyle;
        cladWindows.push({ x: _sideMirroredX(w.x, w.width), y: w.y, w: w.width, h: w.height, isGround: w.isGround, style: winStyle });
      }
      const wallDoors = computeDoors(sideLen, H, {
        doorStyle: doorStyle, doorCount: sideDoorCount,
        hasOpening: false, bayXStart: 0, bayXEnd: 0,
        cfg, plan, edgeId: which,
      });
      for (const d of wallDoors) {
        cladDoors.push({ x: _sideMirroredX(d.x, d.width), y: d.y, w: d.width, h: d.height, style: d.style });
      }
    }
    // Pull user-placed fixtures with the same mirror/shift the windows and
    // doors use. The editor stores fixture x in wall-local space; the cladding
    // panel needs it in cladding-frame space.
    for (const fx of surfaceWallFeaturesForFace(cfg, which, 'fixture')) {
      cladFixtures.push({
        x: _sideMirroredX(fx.x, fx.w), y: fx.y, w: fx.w, h: fx.h,
        style: fx.style,
      });
    }
    // Same for cladding overrides on side walls. Edge-flush extension
    // works the same way as on FB walls (see comment in the FB branch),
    // but the shift here is matT (the side cladding wraps the matT
    // corner extension on each end). Detect flush in CLADDING-FRAME
    // coords (after mirroring for the east wall) — that way the "left
    // end" and "right end" of the cladding panel are unambiguous, and
    // we don't have to reason about which stored x corresponds to which
    // physical end for east-vs-west.
    for (const ov of surfaceWallFeaturesForFace(cfg, which, 'cladding_override')) {
      const claddingX = _sideMirroredX(ov.x, ov.w);
      const leftClFlush  = claddingX <= matT + 0.001;
      const rightClFlush = (claddingX + ov.w) >= (cWidth - matT - 0.001);
      const leftExt  = leftClFlush  ? matT : 0;
      const rightExt = rightClFlush ? matT : 0;
      cladOverrides.push({
        x: claddingX - leftExt,
        y: ov.y,
        w: ov.w + leftExt + rightExt,
        h: ov.h,
        claddingStyle: ov.claddingStyle,
        layered: !!ov.layered,
        styleParams: ov.styleParams ? { ...ov.styleParams } : undefined,
      });
    }
  }

  // ─── Convert wall-frame y to cladding-frame y ───
  // The push loops above pushed window/door/fixture/override y values in the
  // WALL frame (where y=0 is the wall's TOP edge). The cladding frame's y=0
  // is the cladding panel's TOP edge, which sits cladTopOverhang ABOVE the
  // wall's top on the high-side FB wall of a slanted NS-axis roof. Shift
  // all items by +cladTopOverhang so subsequent band filtering and rect
  // emission use cladding-frame coordinates consistently. For all other
  // walls cladTopOverhang is 0 and this loop is a no-op.
  if (cladTopOverhang > 0) {
    for (const w of cladWindows)   w.y += cladTopOverhang;
    for (const d of cladDoors)     d.y += cladTopOverhang;
    for (const f of cladFixtures)  f.y += cladTopOverhang;
    for (const o of cladOverrides) o.y += cladTopOverhang;
  }

  // Filter windows/doors to this band only, and translate to panel-local coords.
  // A window is in the band if its FULL Y range fits within [panelYStart, panelYEnd].
  // (Since the boundary aligns with floor centers, this is clean.)
  function inThisBand(item) {
    return item.y >= panelYStart - 0.1 && item.y + item.h <= panelYEnd + 0.1;
  }
  const cladWindowsBand = cladWindows.filter(inThisBand).map(w => ({
    ...w, y: w.y - panelYStart,
  }));
  const cladDoorsBand = cladDoors.filter(inThisBand).map(d => ({
    ...d, y: d.y - panelYStart,
  }));
  // Fixtures use the same inThisBand check (their y/h are in wall frame).
  // A fixture is included if its whole footprint fits within the panel's
  // band; one straddling the split would land on neither (rare edge case).
  const cladFixturesBand0 = cladFixtures.filter(inThisBand).map(f => ({
    ...f, y: f.y - panelYStart,
  }));
  // Same banding for cladding overrides.
  const cladOverridesBand = cladOverrides.filter(inThisBand).map(o => {
    const yLocal = o.y - panelYStart;
    return {
      ...o,
      y: yLocal,
      h: extendBottomTouchingOpening(yLocal, o.h),
      touchesPanelEdge: !!(
        o.x <= 0.001 ||
        o.x + o.w >= localCWidth - 0.001 ||
        yLocal <= 0.001 ||
        yLocal + extendBottomTouchingOpening(yLocal, o.h) >= localCHeight - 0.001
      ),
    };
  });

  function rectInsideAnyFlushOverride(r) {
    if (!r) return false;
    for (const o of cladOverridesBand) {
      if (o.layered) continue;
      const ix1 = Math.max(r.x, o.x);
      const iy1 = Math.max(r.y, o.y);
      const ix2 = Math.min(r.x + r.w, o.x + o.w);
      const iy2 = Math.min(r.y + r.h, o.y + o.h);
      const aw = Math.max(0, ix2 - ix1);
      const ah = Math.max(0, iy2 - iy1);
      const area = Math.max(0.001, r.w * r.h);
      if ((aw * ah) >= area * 0.98) return true;
    }
    return false;
  }

  // Surface fixture location marks that sit on a replaced cladding patch should
  // not stay on the base cladding. They would be hidden by the override piece;
  // tallyCladdingOverrides transfers equivalent marks onto the override sheet.
  const cladFixturesBand = cladFixturesBand0.filter(f => !rectInsideAnyFlushOverride(f));

  for (const w of cladWindowsBand) {
    const winStyle = w.style ? WINDOW_STYLES[w.style] : null;
    const placement = (winStyle && winStyle.placement) || 'opening';

    if (placement === 'etched') {
      // Blanked window — no cut at all. Etch a rectangle outline plus a
      // simple sash cross on the cladding to suggest a faux/painted window.
      // Pattern lines still cross the area (no cutOpenings entry).
      const inset = 0.25;
      const x1 = w.x + inset,        y1 = w.y + inset;
      const x2 = w.x + w.w - inset,  y2 = w.y + w.h - inset;
      // Outer rectangle
      lines.push({ type: 'etch', x1, y1, x2, y2: y1 });
      lines.push({ type: 'etch', x1: x2, y1, x2, y2 });
      lines.push({ type: 'etch', x1: x2, y1: y2, x2: x1, y2 });
      lines.push({ type: 'etch', x1, y1: y2, x2: x1, y2: y1 });
      // Sash cross (vertical + horizontal midlines) — only if window is big
      // enough to read as panes; small etched windows get a plain outline.
      if (w.w > 4 && w.h > 4) {
        const cx = w.x + w.w / 2, cy = w.y + w.h / 2;
        lines.push({ type: 'etch', x1: cx, y1: y1, x2: cx, y2: y2 });
        lines.push({ type: 'etch', x1: x1, y1: cy, x2: x2, y2: cy });
      }
    } else {
      // Standard opening (default) and blanked filled — both cut the hole.
      // For 'blanked', the difference is downstream: no glass/frame parts,
      // just a single opaque blanking panel cut on a separate sheet.
      addOpeningCut(w.x, w.y, w.w, w.h);
      cutOpenings.push({ x: w.x, y: w.y, w: w.w, h: extendBottomTouchingOpening(w.y, w.h) });
    }
  }
  for (const d of cladDoorsBand) {
    addOpeningCut(d.x, d.y, d.w, d.h);
    cutOpenings.push({ x: d.x, y: d.y, w: d.w, h: extendBottomTouchingOpening(d.y, d.h) });
  }
  // Cladding overrides come in two mount modes:
  //   • Flush (`layered === false`, the default): cut a rectangular hole
  //     through the base cladding. The override piece — produced by
  //     generateCladdingOverrideParts — slots into this hole and ends up
  //     coplanar with the base cladding (sandwiched between the core and
  //     the surrounding cladding, no thickness step).
  //   • Layered (`layered === true`): no hole cut. Instead etch L-bracket
  //     corner ticks at the four corners of the override's bbox — the
  //     same alignment-mark idiom used for layered fixtures — so the user
  //     can position the override piece accurately during assembly. The
  //     override sits ON TOP of the base cladding (raised by one material
  //     thickness in that patch). Either way we add the bbox to
  //     `cutOpenings` so the base cladding's etched pattern is clipped
  //     out of the override's footprint — in layered mode we don't want
  //     the base pattern showing through under the override piece, and
  //     in flush mode we don't want pattern lines inside the cut hole.
  function addEdgeTouchingOverrideExclusion(o) {
    let x1 = Math.max(0, Math.min(localCWidth, o.x));
    let y1 = Math.max(0, Math.min(localCHeight, o.y));
    let x2 = Math.max(0, Math.min(localCWidth, o.x + o.w));
    let y2 = Math.max(0, Math.min(localCHeight, o.y + o.h));
    if (x2 <= x1 + 0.01 || y2 <= y1 + 0.01) return false;

    const edgeSnap = Math.max(0.5, Number(matT || 0), Number(cT || 0)) + 0.08;
    if (x1 <= edgeSnap) x1 = 0;
    if (y1 <= edgeSnap) y1 = 0;
    if (localCWidth - x2 <= edgeSnap) x2 = localCWidth;
    if (localCHeight - y2 <= edgeSnap || y2 >= localCHeight - BOTTOM_TOUCH_EPS) y2 = localCHeight;

    const touchesEdge = x1 <= 0.001 || y1 <= 0.001 || x2 >= localCWidth - 0.001 || y2 >= localCHeight - 0.001;
    if (!touchesEdge) return false;

    // Flush + edge-touching means this area is replaced by the override layer
    // and should simply be removed from the base cladding. No green waste,
    // no alignment ticks, no red floating notch line on the removed section.
    addFlushEdgeOverrideCut({ x1, y1, x2, y2 });
    return true;
  }

  for (const o of cladOverridesBand) {
    if (o.layered) {
      const tickLen = Math.max(0.6, Math.min(1.5, Math.min(o.w, o.h) * 0.25));
      const x1 = o.x, y1 = o.y, x2 = o.x + o.w, y2 = o.y + o.h;
      lines.push({ type: 'etch', x1: x1, y1: y1, x2: x1 + tickLen, y2: y1 });
      lines.push({ type: 'etch', x1: x1, y1: y1, x2: x1, y2: y1 + tickLen });
      lines.push({ type: 'etch', x1: x2, y1: y1, x2: x2 - tickLen, y2: y1 });
      lines.push({ type: 'etch', x1: x2, y1: y1, x2: x2, y2: y1 + tickLen });
      lines.push({ type: 'etch', x1: x1, y1: y2, x2: x1 + tickLen, y2: y2 });
      lines.push({ type: 'etch', x1: x1, y1: y2, x2: x1, y2: y2 - tickLen });
      lines.push({ type: 'etch', x1: x2, y1: y2, x2: x2 - tickLen, y2: y2 });
      lines.push({ type: 'etch', x1: x2, y1: y2, x2: x2, y2: y2 - tickLen });
    } else {
      const edgeExcluded = addEdgeTouchingOverrideExclusion(o);
      if (!edgeExcluded) {
        rects.push({ type: 'cut', x: o.x, y: o.y, w: o.w, h: o.h, compensateKerf: false });
      }
      cutOpenings.push({ x: o.x, y: o.y, w: o.w, h: o.h });
    }
  }
  // Fixture markers on cladding — three branches by placement:
  //   • placement: 'cutout' → cut a hole right through the cladding at the
  //     fixture's bbox (rect cut or circle path). The matching hole through
  //     the core panel is emitted by the wall generator (generateFront/Back/
  //     SideWall). The cladding pattern is clipped around the cut via
  //     cutOpenings, just like a window.
  //   • placement: 'etched' → engrave the full feature set (beacon, triangle,
  //     hatch outline, etc.) directly onto the cladding panel at the fixture's
  //     position. No separate piece is cut. The cladding etch IS the fixture.
  //   • placement: 'layered' (default) → emit corner-tick "L" brackets at the
  //     fixture's bbox to mark where to glue the cut-out piece on top. The
  //     fixture piece itself comes from generateFixtureParts on its own sheet.
  for (const f of cladFixturesBand) {
    const style = FIXTURE_STYLES[f.style];
    if (!style) continue;
    const hasDownspoutScupper = downspoutHasScupperBox(cfg, which, f.style);
    const scupper = hasDownspoutScupper ? downspoutScupperLocalSpec(f.w, f.h) : null;

    if (style.throughCore) {
      const th = fixtureThroughHoleSpec(style, f.w, f.h);
      if (th) {
        addFixtureThroughHoleGeometry(rects, paths, f.x, f.y, f.w, f.h, th);
        cutOpenings.push({ x: f.x + th.x, y: f.y + th.y, w: th.w, h: th.h });
      }
    }

    if (style.placement === 'cutout') {
      // ── Cutout — clean hole through the cladding panel ──
      // shape:'circle' (from the piece) becomes an SVG arc path; rect becomes
      // a plain rect cut. The bbox is added to cutOpenings either way so the
      // cladding pattern is clipped around it.
      const piece0 = style.pieces && style.pieces[0];
      const isCircle = piece0 && piece0.shape === 'circle';
      if (isCircle) {
        const cx = f.x + f.w / 2, cy = f.y + f.h / 2;
        const rx = f.w / 2,       ry = f.h / 2;
        // Single-radius arc when w≈h, fall back to two-arc ellipse otherwise.
        // SVG arc-path A command takes both radii so it handles either case.
        const r = (Math.abs(rx - ry) < 0.05) ? rx : null;
        let d;
        if (r != null) {
          d = `M ${(cx - r).toFixed(3)},${cy.toFixed(3)}`
            + ` A ${r.toFixed(3)},${r.toFixed(3)} 0 1,1 ${(cx + r).toFixed(3)},${cy.toFixed(3)}`
            + ` A ${r.toFixed(3)},${r.toFixed(3)} 0 1,1 ${(cx - r).toFixed(3)},${cy.toFixed(3)} Z`;
        } else {
          d = `M ${(cx - rx).toFixed(3)},${cy.toFixed(3)}`
            + ` A ${rx.toFixed(3)},${ry.toFixed(3)} 0 1,1 ${(cx + rx).toFixed(3)},${cy.toFixed(3)}`
            + ` A ${rx.toFixed(3)},${ry.toFixed(3)} 0 1,1 ${(cx - rx).toFixed(3)},${cy.toFixed(3)} Z`;
        }
        paths.push({ type: 'cut', d, compensateKerf: false });
      } else {
        rects.push({ type: 'cut', x: f.x, y: f.y, w: f.w, h: f.h, compensateKerf: false });
      }
      // Always clip pattern around the bbox (paths-cutOpenings clipping
      // operates on rects only; circles slightly over-clip the corners,
      // which is fine — the cut hides the over-clipped pattern lines).
      cutOpenings.push({ x: f.x, y: f.y, w: f.w, h: f.h });

    } else if (style.placement === 'etched') {
      // ── Etched fixture — walk pieces and emit features as cladding etches ──
      // Block the underlying cladding pattern from running THROUGH the
      // fixture's footprint by adding the bbox to cutOpenings. The fixture
      // itself isn't cut; the bbox here only suppresses pattern lines so
      // the etched features (hatch outline, beacon, warning triangle, etc.)
      // read cleanly against an unbroken background. Without this, the
      // base cladding's corrugations / lap lines / brick courses would
      // run right across the emergency-hatch panel and visually compete
      // with the etched detail.
      cutOpenings.push({ x: f.x, y: f.y, w: f.w, h: f.h });
      const scaleX = f.w / style.width;
      const scaleY = f.h / style.height;
      for (const piece of fixturePieces) {
        const pcOx = ((piece.offsetX != null) ? piece.offsetX : 0) * scaleX;
        const pcOy = ((piece.offsetY != null) ? piece.offsetY : 0) * scaleY;
        const pcW  = ((piece.width   != null) ? piece.width   : style.width)  * scaleX;
        const pcH  = ((piece.height  != null) ? piece.height  : style.height) * scaleY;
        const pieceFeatures = piece.featureGenerator
          ? piece.featureGenerator(pcW, pcH)
          : (piece.features || []);
        if (pieceFeatures.length === 0) continue;
        const shapes = doorFeatureShapes({ width: pcW, height: pcH, features: pieceFeatures });
        const baseX = f.x + pcOx;
        const baseY = f.y + pcOy;
        for (const sh of shapes) {
          if (sh.type === 'rect') {
            const x1 = baseX + sh.x,        y1 = baseY + sh.y;
            const x2 = baseX + sh.x + sh.w, y2 = baseY + sh.y + sh.h;
            lines.push({ type: 'etch', x1, y1, x2, y2: y1 });
            lines.push({ type: 'etch', x1: x2, y1, x2, y2 });
            lines.push({ type: 'etch', x1: x2, y1: y2, x2: x1, y2 });
            lines.push({ type: 'etch', x1, y1: y2, x2: x1, y2: y1 });
          } else if (sh.type === 'line') {
            lines.push({ type: 'etch',
              x1: baseX + sh.x1, y1: baseY + sh.y1,
              x2: baseX + sh.x2, y2: baseY + sh.y2 });
          } else if (sh.type === 'circle') {
            const cx = baseX + sh.cx, cy = baseY + sh.cy, rad = sh.r;
            const N = 16;
            let px = cx + rad, py = cy;
            for (let j = 1; j <= N; j++) {
              const a = (j / N) * 2 * Math.PI;
              const nx = cx + Math.cos(a) * rad;
              const ny = cy + Math.sin(a) * rad;
              lines.push({ type: 'etch', x1: px, y1: py, x2: nx, y2: ny });
              px = nx; py = ny;
            }
          }
        }
      }
    } else {
      // ── Layered fixture — emit corner-tick brackets at the bbox ──
      const tickLen = Math.max(0.6, Math.min(1.5, Math.min(f.w, f.h) * 0.25));
      const x1 = f.x, y1 = f.y, x2 = f.x + f.w, y2 = f.y + f.h;
      lines.push({ type: 'etch', x1: x1, y1: y1, x2: x1 + tickLen, y2: y1 });
      lines.push({ type: 'etch', x1: x1, y1: y1, x2: x1, y2: y1 + tickLen });
      lines.push({ type: 'etch', x1: x2, y1: y1, x2: x2 - tickLen, y2: y1 });
      lines.push({ type: 'etch', x1: x2, y1: y1, x2: x2, y2: y1 + tickLen });
      lines.push({ type: 'etch', x1: x1, y1: y2, x2: x1 + tickLen, y2: y2 });
      lines.push({ type: 'etch', x1: x1, y1: y2, x2: x1, y2: y2 - tickLen });
      lines.push({ type: 'etch', x1: x2, y1: y2, x2: x2 - tickLen, y2: y2 });
      lines.push({ type: 'etch', x1: x2, y1: y2, x2: x2, y2: y2 - tickLen });

      if (hasDownspoutScupper && scupper) {
        const scupperHoleY = downspoutScupperWallHoleY(cfg, which, f.y, scupper);
        const scupperBoxY = downspoutScupperWallBoxY(cfg, which, f.y, scupper);
        rects.push({
          type: 'cut',
          x: f.x + scupper.throatX,
          y: scupperHoleY,
          w: scupper.throatW,
          h: scupper.throatH,
          compensateKerf: false,
        });
        cutOpenings.push({
          x: f.x + scupper.boxX,
          y: scupperBoxY,
          w: scupper.boxW,
          h: scupper.boxH,
        });

        const bx1 = f.x + scupper.boxX, by1 = scupperBoxY;
        const bx2 = bx1 + scupper.boxW, by2 = by1 + scupper.boxH;
        const bt  = Math.max(0.6, Math.min(1.2, Math.min(scupper.boxW, scupper.boxH) * 0.22));
        lines.push({ type: 'etch', x1: bx1, y1: by1, x2: bx1 + bt, y2: by1 });
        lines.push({ type: 'etch', x1: bx1, y1: by1, x2: bx1, y2: by1 + bt });
        lines.push({ type: 'etch', x1: bx2, y1: by1, x2: bx2 - bt, y2: by1 });
        lines.push({ type: 'etch', x1: bx2, y1: by1, x2: bx2, y2: by1 + bt });
        lines.push({ type: 'etch', x1: bx1, y1: by2, x2: bx1 + bt, y2: by2 });
        lines.push({ type: 'etch', x1: bx1, y1: by2, x2: bx1, y2: by2 - bt });
        lines.push({ type: 'etch', x1: bx2, y1: by2, x2: bx2 - bt, y2: by2 });
        lines.push({ type: 'etch', x1: bx2, y1: by2, x2: bx2, y2: by2 - bt });
      }
    }
  }
  if (baySpec) {
    cutOpenings.push({ x: baySpec.x, y: baySpec.y, w: baySpec.w, h: baySpec.h });
  }

  // Wing coverage zones: where a wing sits against this face, blank the
  // exterior cladding (for 'wall' connections only; 'open' connections show
  // the opening which is already cut).
  //
  // Parapet-roof wings need a more complex opening than a plain rectangle.
  // The shared wall is visible again INSIDE the wing's recessed roof well,
  // from the top of the wing parapet down to the roof deck. To cover that
  // visible inside face, leave a flap attached at the top of the wing cutout:
  //   fold line 1 = along the top of the wing opening,
  //   fold line 2 = matT below that,
  //   remaining drop = wing parapet height down to the wing roof line.
  // In flat laser form this looks like a notched opening with a hanging tab,
  // rather than a simple rectangular hole cut all the way to the wing wall top.
  for (const wing of (cfg.wings || [])) {
    if (wing.face !== which) continue;
    if (wing.connection === 'open') continue;
    const wH = wingHeight(cfg, wing);
    const { matT: wMatT = matT } = plan;

    let cx, cw;
    if (which === 'east' || which === 'west') {
      // Side cladding: x runs 0..sideLen (floor_y - matT)
      cx = Math.max(0, wing.offset - wMatT);
      const cx2 = Math.min(cWidth, wing.offset + wing.span - wMatT);
      cw = cx2 - cx;
      if (which === 'east') {
        cx = cWidth - cx - cw;
      }
    } else {
      // Front/back cladding: x runs 0..cWidth with cT overhang on each side
      cx = Math.max(0, wing.offset + cT);
      const cx2 = Math.min(cWidth, wing.offset + wing.span + cT);
      cw = cx2 - cx;
    }
    if (cw <= 0) continue;

    // Y in cladding frame: wing bottom at floor = y=cHeight, wing top at y=cHeight-wH
    const cyTop    = Math.max(0, (cHeight - wH) - panelYStart);
    const cyBottom = Math.min(panelHeight, cHeight - panelYStart);
    const ch = cyBottom - cyTop;
    if (ch <= 0) continue;

    const wingCfg = buildWingCfg(cfg, wing);
    const wingRoofStyle = wingCfg.roofStyle || wing.roofStyle || cfg.roofStyle;
    const wingParapetH = Math.max(0, wingCfg.parapetHeight || 0);
    const needsRoofWellFlap = (wingRoofStyle === 'parapet' || wingRoofStyle === 'parapet_gable')
                              && wingParapetH > 0;

    if (needsRoofWellFlap) {
      // Hanging flap depth in the flat part:
      //   matT to wrap over the parapet wall top + parapetH to drop to roof line.
      const flapFold1Y = cyTop;
      const flapBottom = Math.min(cyBottom, cyTop + matT + wingParapetH);

      // Leave clearance at the two sides so the wing's side parapet walls can
      // rise up through the opening. The remaining central strip becomes the
      // fold-down flap that covers the visible inside face between those walls.
      const wallClear = Math.max(0, Math.min(wMatT, (cw - 0.5) / 2));
      const flapX = cx + wallClear;
      const flapW = cw - 2 * wallClear;

      if (wallClear > 0.01 && flapW > 0.5) {
        const sideNotchH = Math.max(0, flapBottom - flapFold1Y);
        if (sideNotchH > 0.01) {
          // Keep separate hidden clip-openings for etch suppression, but render
          // the actual laser cut as one unified polygon so we don't emit a pile
          // of redundant overlapping red cut segments.
          cutOpenings.push({ x: cx, y: flapFold1Y, w: wallClear, h: sideNotchH });
          cutOpenings.push({ x: cx + cw - wallClear, y: flapFold1Y, w: wallClear, h: sideNotchH });
        }

        addBottomCutout({
          kind: 'flap',
          x1: cx,
          x2: cx + cw,
          yTop: flapFold1Y,
          flapX,
          flapW,
          flapBottom,
        });
      } else {
        // Extremely narrow wing opening: fall back to a simple bottom cutout.
        addBottomCutout({ kind: 'simple', x1: cx, x2: cx + cw, yTop: flapFold1Y });
      }

      // Hidden clip-opening for the actual through-hole beneath the flap / notches.
      const holeH = cyBottom - flapBottom;
      if (holeH > 0.01) {
        cutOpenings.push({ x: cx, y: flapBottom, w: cw, h: holeH });
      }
    } else {
      addOpeningCut(cx, cyTop, cw, ch);
      cutOpenings.push({ x: cx, y: cyTop, w: cw, h: ch });
    }
  }

  if (flushEdgeOverrideCuts.length) {
    const eps = 0.05;
    const edgeSnap = Math.max(0.5, Number(matT || 0), Number(cT || 0)) + 0.08;
    let keptRects = [{ x: 0, y: 0, w: localCWidth, h: localCHeight }];

    for (const c of flushEdgeOverrideCuts) {
      keptRects = subtractRectFromRects(keptRects, c);
    }

    // Discard edge-only slivers caused by cladding overlap math. These are not
    // useful visible base pieces; the flush override piece absorbs them.
    keptRects = keptRects.filter(r => {
      if (r.w <= eps || r.h <= eps) return false;
      const touchesLeft = r.x <= eps;
      const touchesRight = r.x + r.w >= localCWidth - eps;
      const touchesTop = r.y <= eps;
      const touchesBottom = r.y + r.h >= localCHeight - eps;
      if ((touchesLeft || touchesRight) && r.w <= edgeSnap + eps) return false;
      if ((touchesTop || touchesBottom) && r.h <= edgeSnap + eps) return false;
      return true;
    });

    retainedEtchClipRects = keptRects.map(r => ({ ...r }));
    if (keptRects.length) {
      paths.splice(0, 1, ...keptRects.map(r => ({
        type: 'cut',
        structural: true,
        d: rectPath(r.x, r.y, r.w, r.h),
      })));
    } else {
      paths.splice(0, 1);
    }
  }

  if (bottomCutouts.length) {
    // Rebuild the main cladding outline so every bottom-touching opening
    // becomes part of the single exterior contour. This removes the apparent
    // red cut line that used to continue across door/bay/wing openings.
    const f3 = (n) => Number(n).toFixed(3);
    function perimeterTopAndSidesPrefix() {
      if (isCladdingGableEnd) {
        return `M 0,0 L ${f3(localCWidth / 2)},${f3(-clPitch)} L ${f3(localCWidth)},0 L ${f3(localCWidth)},${f3(localCHeight)}`;
      }
      if (isSideSlantedClad && !splitMode) {
        return `M 0,${f3(sideClTopLeftY)} L ${f3(localCWidth)},${f3(sideClTopRightY)} L ${f3(localCWidth)},${f3(localCHeight)}`;
      }
      return `M 0,0 L ${f3(localCWidth)},0 L ${f3(localCWidth)},${f3(localCHeight)}`;
    }
    function cutoutCovers(outer, inner) {
      const eps = 0.01;
      if (!outer || !inner) return false;
      if (inner.x1 < outer.x1 - eps || inner.x2 > outer.x2 + eps) return false;
      if (outer.kind === 'simple') {
        return inner.yTop >= outer.yTop - eps;
      }
      // Flap cutout: the side strips are open from yTop downward, and the
      // full width is open from flapBottom downward. Nested bottom openings
      // fully inside those already-removed regions should not generate a
      // second contour step.
      const flapL = outer.flapX;
      const flapR = outer.flapX + outer.flapW;
      if (inner.yTop >= outer.flapBottom - eps) return true;
      const inLeftStrip  = inner.x2 <= flapL + eps;
      const inRightStrip = inner.x1 >= flapR - eps;
      if ((inLeftStrip || inRightStrip) && inner.yTop >= outer.yTop - eps) return true;
      return false;
    }

    const rawCuts = bottomCutouts
      .filter(c => c.x2 > c.x1 + 0.01)
      // Consider shallower / wider cutouts first so nested bottom openings
      // inside a larger cladding gap can be suppressed.
      .sort((a, b) => {
        const dy = a.yTop - b.yTop;
        if (Math.abs(dy) > 0.01) return dy;
        const aw = (a.x2 - a.x1), bw = (b.x2 - b.x1);
        return bw - aw;
      });

    const visibleCuts = [];
    for (const c of rawCuts) {
      if (visibleCuts.some(outer => cutoutCovers(outer, c))) continue;
      visibleCuts.push(c);
    }

    const cuts = visibleCuts.sort((a, b) => b.x2 - a.x2);
    let d = perimeterTopAndSidesPrefix();
    let curX = localCWidth;
    for (const c of cuts) {
      const x1 = Math.max(0, Math.min(localCWidth, c.x1));
      const x2 = Math.max(0, Math.min(localCWidth, c.x2));
      if (x2 <= x1 + 0.01) continue;
      if (curX > x2 + 0.01) d += ` L ${f3(x2)},${f3(localCHeight)}`;
      if (c.kind === 'flap' && c.flapW > 0.5) {
        d += ` L ${f3(x2)},${f3(c.yTop)}`
          + ` L ${f3(c.flapX + c.flapW)},${f3(c.yTop)}`
          + ` L ${f3(c.flapX + c.flapW)},${f3(c.flapBottom)}`
          + ` L ${f3(c.flapX)},${f3(c.flapBottom)}`
          + ` L ${f3(c.flapX)},${f3(c.yTop)}`
          + ` L ${f3(x1)},${f3(c.yTop)}`
          + ` L ${f3(x1)},${f3(localCHeight)}`;
      } else {
        d += ` L ${f3(x2)},${f3(c.yTop)}`
          + ` L ${f3(x1)},${f3(c.yTop)}`
          + ` L ${f3(x1)},${f3(localCHeight)}`;
      }
      curX = x1;
    }
    if (curX > 0.01) d += ` L 0,${f3(localCHeight)}`;
    d += ' Z';
    paths[0].d = d;
  }

  // Floor-bottom cladding-extension seam. This line marks where the original
  // wall bottom ends and the added skirt starts, but it must stop at window/
  // door/bay cut lines. It used to be pushed before cutOpenings was populated,
  // so it ran straight through openings.
  if (floorBottomCladdingExtension > 0.01) {
    const wallBottomLocal = localCHeight - floorBottomCladdingExtension;
    const segs = clipHorizontalLineByCuts(wallBottomLocal, 0, localCWidth, cutOpenings, 0.02);
    for (const [a, b] of segs) {
      lines.push({ type: 'etch', x1: a, y1: wallBottomLocal, x2: b, y2: wallBottomLocal });
    }
  }

  // Etched cladding pattern — dispatch by pattern type. All etches are clipped 
  // to avoid passing through any cut openings (where they'd be lost as scrap).
  // Cladding y now matches wall y exactly (no top overhang), so the pattern
  // starts at y=0. The x-axis cT inset matches the front/back left/right
  // overhang region (still applies); for sides without left/right overhang
  // it acts as a small margin from the laser-cut edge.
  // Etched cladding pattern. For ordinary rectangular panels the pattern
  // starts at y=0. For gable-end cladding the cut outline rises above y=0
  // into the triangular gable, so generate the pattern over that full
  // pentagonal footprint and clip each segment to the gable polygon. Without
  // this, ribbed/ALC/etc. etches stop at the eave line even though the cut
  // cladding piece physically continues up into the roof triangle.
  const patEtchTop = isCladdingGableEnd ? -clPitch : 0;
  const patEtchBottom = localCHeight;
  // For trapezoidal side cladding, hand the pattern generator the slanted
  // top edge so engrave lines stop at the cut line instead of extending up
  // into the empty triangle above. The pattern's x range is [cT, localCWidth-cT],
  // so we sample the slope's Y at those exact x values.
  const patEtchTopEdge = (isSideSlantedClad && !splitMode)
    ? {
        leftY:  sideClTopLeftY  + (sideClTopRightY - sideClTopLeftY) *               cT / localCWidth,
        rightY: sideClTopLeftY  + (sideClTopRightY - sideClTopLeftY) * (localCWidth - cT) / localCWidth,
      }
    : undefined;
  let patternLines = generateCladdingPattern(claddingStyleSpec, cT, patEtchTop, localCWidth - cT, patEtchBottom, cutOpenings, patEtchTopEdge);
  if (isCladdingGableEnd) {
    const gablePoly = [
      { x: 0, y: 0 },
      { x: localCWidth / 2, y: -clPitch },
      { x: localCWidth, y: 0 },
      { x: localCWidth, y: localCHeight },
      { x: 0, y: localCHeight },
    ];
    const clipped = [];
    for (const ln of patternLines) {
      const c = clipSegmentToConvexPolygon(ln.x1, ln.y1, ln.x2, ln.y2, gablePoly);
      if (c) clipped.push(c);
    }
    patternLines = clipped;
  }
  for (const ln of patternLines) {
    lines.push({ type: 'etch', x1: ln.x1, y1: ln.y1, x2: ln.x2, y2: ln.y2 });
  }

  // If override subtraction split this base cladding into retained sub-pieces,
  // clip *all* accumulated engrave/mark lines to those pieces now. This catches
  // fixture location ticks and floor-skirt seams that were emitted before the
  // final retained perimeter was known.
  if (Array.isArray(retainedEtchClipRects)) {
    const clippedLines = [];
    const seen = new Set();
    for (const ln of lines) {
      let emitted = false;
      for (const rr of retainedEtchClipRects) {
        if (!rr || rr.w <= 0.01 || rr.h <= 0.01) continue;
        const poly = [
          { x: rr.x, y: rr.y },
          { x: rr.x + rr.w, y: rr.y },
          { x: rr.x + rr.w, y: rr.y + rr.h },
          { x: rr.x, y: rr.y + rr.h },
        ];
        const c = clipSegmentToConvexPolygon(ln.x1, ln.y1, ln.x2, ln.y2, poly);
        if (!c) continue;
        const key = `${ln.type || 'etch'}|${c.x1.toFixed(3)},${c.y1.toFixed(3)},${c.x2.toFixed(3)},${c.y2.toFixed(3)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        clippedLines.push({ ...ln, x1: c.x1, y1: c.y1, x2: c.x2, y2: c.y2 });
        emitted = true;
      }
      // retainedEtchClipRects=[] means no visible base cladding remains.
      if (!retainedEtchClipRects.length) emitted = false;
    }
    lines.splice(0, lines.length, ...clippedLines);
  }

  // Gable-end panels intentionally do NOT add a horizontal eave/cap etch line.
  // The cladding is one continuous sheet over the rectangular wall and the
  // gable/parapet triangle above it, so the selected cladding pattern should
  // read as continuous into that upper area instead of being visually cut off
  // by an artificial eave line. Pattern seams still clip to the actual gable
  // outline above.

  // Count windows by placement category on this PANEL.
  //   • opening  → standard cut-through, needs glass + frames
  //   • blanked  → cut-through but no glass; gets a single blanking panel
  //   • etched   → no cut at all, no parts (etched outline on cladding only)
  const placementOf = (w) => {
    const s = w.style ? WINDOW_STYLES[w.style] : null;
    return (s && s.placement) || 'opening';
  };
  // For backward-compat reasons the part counts ONLY include 'opening'
  // windows (those that need the full glass+frame stack). Blanked counts
  // are tracked separately.
  const openingWindows = cladWindowsBand.filter(w => placementOf(w) === 'opening');
  const blankedWindows = cladWindowsBand.filter(w => placementOf(w) === 'blanked');
  const groundCount = openingWindows.filter(w => w.isGround).length;
  const upperCount = openingWindows.length - groundCount;
  const blankedGround = blankedWindows.filter(w => w.isGround).length;
  const blankedUpper = blankedWindows.length - blankedGround;

  // Per-window dimension records. The building-level glass/frame/backing
  // generator groups these by (w, h, style) and emits one set of parts per
  // distinct group, so a wall mixing 8×5 default-style windows, 12×9
  // industrial_small windows, and 12×3 slit windows gets three sets of
  // correctly-sized glass — not one set sized to the global windowStyle.
  // The earlier code used only upper/ground counts plus cfg.windowStyle,
  // which produced wrong-sized glass for any manually-placed window whose
  // dimensions didn't match getWindowDims(cfg). Style falls back to
  // cfg.windowStyle (or cfg.firstFloorWindowStyle on the ground floor when
  // the override is enabled) when the manual op didn't set one.
  const effectiveStyle = (w) => {
    if (w.style) return w.style;
    if (w.isGround && cfg.firstFloorWindowStyleEnabled && cfg.firstFloorWindowStyle) {
      return cfg.firstFloorWindowStyle;
    }
    return cfg.windowStyle;
  };
  const windowSpecs = openingWindows.map(w => ({
    x: w.x, y: w.y,
    w: w.w, h: w.h,
    originalW: w.w, clipLeft: 0,
    style: effectiveStyle(w), isGround: !!w.isGround,
  }));
  const blankedSpecs = blankedWindows.map(w => ({
    x: w.x, y: w.y,
    w: w.w, h: w.h,
    originalW: w.w, clipLeft: 0,
    style: effectiveStyle(w), isGround: !!w.isGround,
  }));
  const doorSpecs = cladDoorsBand.map(d => ({
    x: d.x, y: d.y,
    w: d.w, h: d.h,
    originalW: d.w, clipLeft: 0,
    style: d.style || cfg.doorStyle,
  })).filter(d => d.style && d.style !== 'none');

  return {
    id: cId,
    name: cName,
    material: (cfg.claddingMaterials && cfg.claddingMaterials[styleKey]) || 'cladding',
    assemblyNote: floorBottomCladdingExtension > 0.01
      ? `Bottom skirt extends ${floorBottomCladdingExtension.toFixed(2)} mm below the wall to cover the floor/core edge. Do not shift window/door alignment; align the original wall bottom at the skirt fold/step line.`
      : undefined,
    bboxW: localCWidth,
    bboxH: localCHeight + (isCladdingGableEnd ? clPitch : 0),
    bboxOffsetX: 0,
    bboxOffsetY: isCladdingGableEnd ? clPitch : 0,
    paths: paths,
    rects: rects,
    lines: lines,
    // For slanted roofs the trapezoidal wall pair (FB on EW-axis, sides on
    // NS-axis) has the "non-canonical" wall — back for EW, west for NS —
    // rendered as the horizontal mirror of its sibling. The CLADDING that
    // glues onto that wall has to mirror in lockstep: its panel pattern,
    // opening cuts, trim notches, fixture etches all need to land at the
    // mirrored physical positions to align with the mirrored core. Without
    // this, two walls' cladding panels can hash identical (centered doors
    // and symmetric cladding patterns mirror to themselves), and the
    // dedup collapses them under a misleading "Cut ×2 identical copies"
    // hint while the cores sit in their own separate cards.
    mirrorX: cfg.roofStyle === 'slanted' && (
      (which === 'back' && (cfg.roofSlopeDirection === 'east' || cfg.roofSlopeDirection === 'west')) ||
      (which === 'west' && (cfg.roofSlopeDirection === 'front' || cfg.roofSlopeDirection === 'back'))
    ),
    windows: openingWindows.length,
    upperWindows: upperCount,
    groundWindows: groundCount,
    blankedUpper: blankedUpper,
    blankedGround: blankedGround,
    windowSpecs,
    blankedSpecs,
    doors: doorSpecs.length,
    doorSpecs,
    doorStyleTallies: tallyDoorSpecs(doorSpecs),
    // Wall identity + opening data for downstream consumers (trim, etc.).
    // wallOpenings stores rects in WALL-frame coords (un-mirrored, un-shifted)
    // so the trim generator can compute notch positions per wall without
    // needing to reverse the cladding-frame transform.
    wallKey: which,
    panelYStart: panelYStart || 0,
    wallOpenings: (() => {
      const out = [];
      // openingWindows + blankedWindows (both cut through; etched skipped)
      for (const w of openingWindows) {
        // Reverse the cladding-frame transform back to wall-frame coords
        const wx = wallXFromCladdingX(w.x, w.w, which, plan, cfg);
        out.push({ x: wx, y: w.y + (panelYStart || 0), w: w.w, h: w.h, kind: 'window' });
      }
      for (const w of blankedWindows) {
        const wx = wallXFromCladdingX(w.x, w.w, which, plan, cfg);
        out.push({ x: wx, y: w.y + (panelYStart || 0), w: w.w, h: w.h, kind: 'window_blanked' });
      }
      for (const d of cladDoorsBand) {
        const wx = wallXFromCladdingX(d.x, d.w, which, plan, cfg);
        out.push({ x: wx, y: d.y + (panelYStart || 0), w: d.w, h: d.h, kind: 'door' });
      }
      // Bay opening: a structural hole at the bottom of the front (and, for
      // through-bays, back) wall. Living in the plan rather than per-panel
      // means we add it here explicitly. Only the panel whose Y range
      // contains the bay's range emits the entry — for non-split cladding
      // the whole wall is one panel and the bay always lands; for split
      // cladding the bay sits in the ground panel.
      const wallHasBay = ((which === 'front' && plan.hasFrontBay) ||
                         (which === 'back'  && plan.hasBackBay));
      if (wallHasBay && plan.bayHeight > 0 && plan.bayWidth > 0) {
        const bayWallY = plan.H - plan.bayHeight;
        // panelY range in WALL frame = [panelYStart - cladTopOverhang,
        // panelYEnd - cladTopOverhang]. For non-slanted roofs cladTopOverhang
        // is 0 so wall-frame matches cladding-frame directly.
        const panelWallY0 = panelYStart - cladTopOverhang;
        const panelWallY1 = panelYEnd   - cladTopOverhang;
        const bayOverlap0 = Math.max(bayWallY, panelWallY0);
        const bayOverlap1 = Math.min(plan.H,    panelWallY1);
        if (bayOverlap1 > bayOverlap0) {
          out.push({
            x: plan.bayXStart,
            y: bayOverlap0,
            w: plan.bayWidth,
            h: bayOverlap1 - bayOverlap0,
            kind: 'bay',
          });
        }
      }
      return out;
    })(),
  };
}
