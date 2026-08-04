/* =====================================================================
   FLOOR BANDS
   ===================================================================== */
import { clipPolygonByLayoutCuts, layoutCutsActive } from '../core/layout-cut-geometry.js?v=hm-assets-20260804-8';
import { oeWallLayoutCutInterval } from './opening-editor-facades.js?v=hm-assets-20260804-8';

export function oeWallHasParapetBand(cfg, wall) {
  if (!cfg) return false;
  if (cfg.roofStyle === 'parapet') return true;
  if (cfg.roofStyle !== 'parapet_gable') return false;
  const sides = cfg.parapetSides || 'all';
  if (sides === 'all') return true;
  if (sides === 'fb') return wall === 'front' || wall === 'back';
  if (sides === 'ew') return wall === 'east' || wall === 'west';
  return false;
}

export function oeWallParapetHeight(plan, cfg, wall) {
  if (!oeWallHasParapetBand(cfg, wall)) return 0;
  return Math.max(0, Number((plan && plan.parapetH != null) ? plan.parapetH : cfg.parapetHeight) || 0);
}

export function oeGetFloorBands(wall) {
  const plan = oeActivePlan();
  if (!plan) return [];
  const cfg = oeActiveCfg();
  const { H, matT, parapetH, visualFloorYs, hasFrontBay, hasBackBay, bayCeilingY } = plan;

  // Bottom of the usable wall (bay ceiling for a walled bay, otherwise floor)
  let baseY = H;
  if (wall === 'front' && hasFrontBay) baseY = bayCeilingY;
  if (wall === 'back'  && hasBackBay)  baseY = bayCeilingY;

  // Only reserve a top parapet/roof-clearance band when this roof style
  // actually has a parapet.  A stale non-zero cfg.parapetHeight should not
  // create an empty, hatched-looking band on flat/gabled/slanted walls.
  const wallParapetH = oeWallParapetHeight(plan, cfg, wall);
  const topBound = wallParapetH > 0 ? (wallParapetH + matT + 3) : 0;

  // Rebuild the same deduplicated boundary list as buildEdgePlans for the
  // active edit target. This is critical for wing walls whose explicit
  // height is shorter than the main building: using main.visualFloorYs here
  // made door snapping choose a floor band below the wing's actual bottom.
  const rawBoundaries = [topBound, ...(visualFloorYs || []), baseY]
    .filter(v => v != null && isFinite(v))
    .map(v => Math.max(0, Math.min(H, v)))
    .sort((a, b) => a - b);
  const bounds = [];
  for (const b of rawBoundaries) {
    if (bounds.length === 0 || Math.abs(bounds[bounds.length - 1] - b) >= 0.5) bounds.push(b);
  }

  const bands = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const yTop = bounds[i], yBottom = bounds[i + 1];
    if (yBottom - yTop < 8) continue;            // too short to hold a window
    const centerY = yTop + (yBottom - yTop) * 0.55;
    bands.push({ yTop, yBottom, centerY });
  }
  return bands;
}

/* Return the index of the band that contains the given Y, or -1. */
export function oeYToBand(bands, y) {
  for (let i = 0; i < bands.length; i++) {
    if (y >= bands[i].yTop && y <= bands[i].yBottom) return i;
  }
  return -1;
}

export function oeGetAutoOpenings(wall) {
  const plan = oeActivePlan();
  if (!plan) return [];
  const cfg = oeActiveCfg();
  const { H, matT, fbWidth, sideLen } = plan;
  const winDims = getWindowDims(cfg);
  const groundWinDims = getGroundFloorWindowDims(cfg);
  const doorStyle = cfg.doorStyle;
  const result = [];

  const pushW = wins => wins.forEach(w => result.push({ type: 'window', x: w.x, y: w.y, w: w.width, h: w.height }));
  const pushD = ds   => ds.forEach(d   => result.push({ type: 'door',   x: d.x, y: d.y, w: d.width, h: d.height }));

  if (wall === 'front' || wall === 'back') {
    const hasBay = (wall === 'front' && plan.hasFrontBay) || (wall === 'back' && plan.hasBackBay);
    const bayHeight = plan.bayHeight || 0;
    const cnt = (wall === 'front') ? (cfg.frontDoorCount || 0) : (cfg.backDoorCount || 0);
    const dh = DOOR_STYLES[doorStyle] ? DOOR_STYLES[doorStyle].height : 0;
    const doorReserveH = (cnt > 0 && !hasBay) ? dh + 3 : 0;
    const sYs = hasBay ? (plan.slotYs || []).filter(y => y < (H - bayHeight) - 1) : (plan.slotYs || []);
    const fYs = hasBay ? (plan.floorCenterYs || []).filter(y => y < (H - bayHeight) - 1) : (plan.floorCenterYs || []);
    pushW(computeWindows(fbWidth, H, { density: cfg.windowDensity, winDims, groundWinDims, groundFloorCenterY: plan.groundFloorCenterY, hasOpening: hasBay, openingY: H - bayHeight, openingH: bayHeight, slotYs: sYs, floorCenterYs: fYs, parapetH: plan.parapetH, matT, doorReserveH, cfg, plan, edgeId: wall }));
    if (!hasBay) pushD(computeDoors(fbWidth, H, { doorStyle, doorCount: cnt, hasOpening: false, bayXStart: 0, bayXEnd: 0, cfg, plan, edgeId: wall }));
  } else {
    const cnt = cfg.sideDoorCount || 0;
    const dh = DOOR_STYLES[doorStyle] ? DOOR_STYLES[doorStyle].height : 0;
    const doorReserveH = cnt > 0 ? dh + 3 : 0;
    pushW(computeWindows(sideLen, H, { density: cfg.windowDensity, winDims, groundWinDims, groundFloorCenterY: plan.groundFloorCenterY, hasOpening: false, openingY: 0, openingH: 0, slotYs: plan.slotYs, floorCenterYs: plan.floorCenterYs, parapetH: plan.parapetH, matT, doorReserveH, cfg, plan, edgeId: wall }));
    pushD(computeDoors(sideLen, H, { doorStyle, doorCount: cnt, hasOpening: false, bayXStart: 0, bayXEnd: 0, cfg, plan, edgeId: wall }));
  }
  return result;
}

/* ---- Mirror current wall to its opposite ---- */

export function oeMirrorToOpposite() {
  const OPP = { front: 'back', back: 'front', east: 'west', west: 'east' };
  const oppWall = OPP[oeWall];
  if (!oppWall) return;

  // Make sure the source wall has initialised openings
  if (!Array.isArray(oeOpenings[oeWall])) {
    oeOpenings[oeWall] = oeGetAutoOpenings(oeWall);
  }

  const { W: srcW } = oeGetWallDims(oeWall);
  const { W: dstW } = oeGetWallDims(oppWall);
  const ops = oeOpenings[oeWall] || [];

  // Reflect each opening's X across the wall centre.
  // A window at x with width w becomes x' = wallW − x − w on the opposite wall.
  // The scale factor accounts for walls that have different widths
  // (front/back vs east/west may differ on asymmetric buildings).
  const widthRatio = dstW / (srcW || dstW);
  const mirrored = ops.map(op => ({
    ...op,
    x: dstW - (op.x * widthRatio) - (op.w * widthRatio),
    w: op.w * widthRatio,
    // h and y are unchanged (vertical position stays the same floor band)
  }));

  oeOpenings[oppWall] = mirrored;

  // Persist to the active target so the next regeneration picks it up.
  // setWallFeaturesForFace also updates the legacy manualOpenings bucket.
  setWallFeaturesForFace(oeEditTarget(), oppWall, mirrored);

  // Mark the opposite tab as manually edited
  const tab = document.getElementById('oeTab' + oppWall.charAt(0).toUpperCase() + oppWall.slice(1));
  if (tab) tab.classList.add('oe-manual-indicator');

  oeSelectedSet.clear();
  // Switch to the opposite wall so the user can see the result immediately
  oeSetWall(oppWall);
}

export function oeDistributeRow() {
  if (oeSelectedSet.size === 0) return;
  const firstIdx = [...oeSelectedSet][0];
  const op = oeOpenings[oeWall][firstIdx];
  if (!op || op.type !== 'window') return;

  const bands = oeGetFloorBands(oeWall);
  const selBandIdx = oeYToBand(bands, op.y + op.h / 2);
  if (selBandIdx < 0) return;

  // Collect all windows whose centres fall in the same band
  const inBand = oeOpenings[oeWall]
    .map((o, i) => ({ o, i }))
    .filter(({ o }) => o.type === 'window' && oeYToBand(bands, o.y + o.h / 2) === selBandIdx);

  if (inBand.length < 2) return; // nothing to distribute

  const { W } = oeGetWallDims(oeWall);
  const MARGIN = 3;
  const totalW = inBand.reduce((s, { o }) => s + o.w, 0);
  const available = W - 2 * MARGIN - totalW;
  if (available <= 0) return;
  const gap = available / (inBand.length + 1);

  // Sort by current X and redistribute
  inBand.sort((a, b) => a.o.x - b.o.x);
  let x = MARGIN + gap;
  for (const { o } of inBand) {
    o.x = x;
    x += o.w + gap;
  }
  oeCommit();
  oeRender();
}

/* ---- Bay drag state ---- */
// (Previously these tracked the special bay-drag handler that has now been
// folded into the standard opening drag path — bays use the same selection
// and drag flow as windows/doors, with a Y-lock constraint inside onMove.)

export let oeShowCladding = false;    // whether to overlay the cladding pattern in the editor

// Alternating band fill colours — two subtle tints so bands are easy to distinguish
export const OE_BAND_FILLS = ['rgba(255,255,240,0.18)', 'rgba(200,230,255,0.18)'];

export function oeToggleCladding() {
  oeShowCladding = !oeShowCladding;
  const btn = document.getElementById('oeCladBtn');
  if (btn) btn.classList.toggle('tb-active', oeShowCladding);
  oeRender();
}

/* ---- Render ---- */

/**
 * Returns coplanar wing sections that form a joined/L-shaped wall with the
 * currently-edited face. Uses the same wingCoplanarCheck logic as the SVG generator.
 *
 * Each entry: { width (mm along face), height (mm), wing (ref), side: 'left'|'right' }
 *
 * Convention — "left" means the smaller-x end of the editor canvas for each face:
 *   front  : left=west,  right=east
 *   back   : left=east,  right=west   (back is viewed mirrored)
 *   east   : left=south, right=north  (x=0=south convention)
 *   west   : left=south, right=north
 */
export function oeComputeWingExtensions() {
  // Wing edit mode: a wing has no sub-wings, so there are no coplanar
  // extensions to render. Returning [] keeps the editor's main wall as
  // the only canvas drawn — the wing's wall stands alone.
  if (oeWingIndex != null) return [];
  const wings  = CONFIG.wings || [];
  const plan   = lastPlan;
  const mainW  = CONFIG.width, mainD = CONFIG.depth;
  const baseH  = plan ? plan.H : CONFIG.height;
  const result = [];

  for (const wing of wings) {
    const cp     = wingCoplanarCheck(wing, mainW, mainD);
    const wingH  = wingHeight(CONFIG, wing);
    const extW   = wing.depth; // how far the wing extends perpendicular to the joined face

    switch (oeWall) {
      case 'front':
        // east/west wings whose "west" face is flush with the main front face.
        // Editor's front-wall x runs west→east in the unmirrored laser-panel
        // convention. For the user's "+N up" plan-view mental model, an east
        // wing extending FRONT renders on the LEFT of the editor.
        if (wing.face === 'east' && cp.westCoplanar) result.push({ side:'left',  width:extW, height:wingH, wing });
        if (wing.face === 'west' && cp.westCoplanar) result.push({ side:'right', width:extW, height:wingH, wing });
        break;
      case 'back':
        // east/west wings whose "east" face is flush with the main back face.
        if (wing.face === 'east' && cp.eastCoplanar) result.push({ side:'right', width:extW, height:wingH, wing });
        if (wing.face === 'west' && cp.eastCoplanar) result.push({ side:'left',  width:extW, height:wingH, wing });
        break;
      case 'east':
        // front/back wings whose "east" face is flush with the main east face.
        // East wall view is mirrored (see `oeMirrorX`) so +N/FRONT (Y=0) is on
        // the right; a front-face wing at the east end (eastCoplanar) sits at
        // the FRONT-EAST corner so its extension shows on the RIGHT.
        if (wing.face === 'front' && cp.eastCoplanar) result.push({ side:'right', width:extW, height:wingH, wing });
        if (wing.face === 'back'  && cp.eastCoplanar) result.push({ side:'left',  width:extW, height:wingH, wing });
        break;
      case 'west':
        // front/back wings whose "west" face is flush with the main west face.
        // West wall view is NOT mirrored (its laser-panel convention already
        // matches standard external observer view: FRONT/Y=0 is on the left).
        if (wing.face === 'front' && cp.westCoplanar) result.push({ side:'left',  width:extW, height:wingH, wing });
        if (wing.face === 'back'  && cp.westCoplanar) result.push({ side:'right', width:extW, height:wingH, wing });
        break;
    }
  }
  return result;
}

/**
 *   pitchL  – extra height (mm) at x=0 (left when viewed from outside)
 *   pitchR  – extra height at x=W
 *   gable   – triangle height for gable-end walls (pentagon)
 *   wallH   – effective base wall height (may exceed plan.H for high-eave rectangular walls)
 * For a plain rectangular wall all values are 0 / plan.H.
 */
export function oeWallShapeInfo() {
  // In wing mode use the wing's cfg/plan; otherwise main's.
  const inWing = (oeWingIndex != null && oeWingCfg && oeWingPlan);
  const plan      = inWing ? oeWingPlan : lastPlan;
  const srcCfg    = inWing ? oeWingCfg  : CONFIG;
  const baseH     = plan ? plan.H : srcCfg.height;
  const roofStyle = srcCfg.roofStyle;
  const pitch     = srcCfg.roofPitch || 0;
  const slopeDir  = srcCfg.roofSlopeDirection || 'back';
  const ridgeDir  = srcCfg.roofRidgeDirection || 'ew';
  const nsAxis    = slopeDir === 'back' || slopeDir === 'front';
  const isSide    = oeWall === 'east' || oeWall === 'west';

  const none = { pitchL:0, pitchR:0, gable:0, wallH: baseH };

  if (roofStyle === 'gabled') {
    const ewRidge = ridgeDir === 'ew';
    const isGableEnd = (ewRidge && isSide) || (!ewRidge && !isSide);
    return { ...none, gable: isGableEnd ? pitch : 0 };
  }

  if (roofStyle === 'slanted') {
    if (isSide && nsAxis) {
      // Side walls trapezoidal for NS slope; x=0 = south/front
      return { pitchL: slopeDir==='front'?pitch:0, pitchR: slopeDir==='back'?pitch:0,
               gable:0, wallH: baseH };
    }
    if (isSide && !nsAxis) {
      // Side walls rectangular but one is taller. Same fix as the NS-axis
      // FB-high case above: encode the extension as pitchL===pitchR so the
      // rectangular extension renders as `peakAbove` above the building
      // portion rather than stretching `wallH` and pushing window Y values
      // toward the visual middle.
      const isHigh = (slopeDir==='east'&&oeWall==='east') || (slopeDir==='west'&&oeWall==='west');
      if (isHigh) {
        return { pitchL: pitch, pitchR: pitch, gable: 0, wallH: baseH };
      }
      return { ...none, wallH: baseH };
    }
    if (!isSide && !nsAxis) {
      // Front/back walls trapezoidal for EW slope; x=0=west for front, x=0=east for back
      const isBack = oeWall==='back';
      let pl = slopeDir==='west'?pitch:0, pr = slopeDir==='east'?pitch:0;
      if (isBack) { [pl, pr] = [pr, pl]; }  // back wall is viewed from the opposite direction
      return { pitchL:pl, pitchR:pr, gable:0, wallH: baseH };
    }
    if (!isSide && nsAxis) {
      // Front/back walls rectangular at different heights. The high-side
      // wall extends UP by `pitch` past the building's top — that's an
      // "attic" sliver above the wall's normal H, not part of the
      // habitable wall itself. We render it the same way a gabled apex
      // gets rendered: the extension sits ABOVE the wall's coord y=0,
      // while `wallH` stays at the building height so window placements
      // (stored in oeOpenings as building-relative y values) display at
      // the same vertical fraction as on the flat-roof counterpart.
      // Without this, the editor's coord system would stretch building-
      // relative window Ys across the larger wallH+pitch range, pushing
      // the ground floor visually toward the wall's middle instead of
      // its bottom — even though the laser-cut wall puts the windows
      // correctly at the bottom of the building portion.
      //
      // The extension is encoded as equal pitchL===pitchR so the wallPts
      // polygon-builder draws a horizontal top edge raised by `pitch`,
      // matching the rectangular shape (a single shared apex value would
      // draw a gable triangle, which is the wrong silhouette). peakAbove
      // = max(pitchL, pitchR, gable) then naturally accommodates the
      // extra height above oe-coord y=0.
      const isHigh = (slopeDir==='back'&&oeWall==='back') || (slopeDir==='front'&&oeWall==='front');
      if (isHigh) {
        return { pitchL: pitch, pitchR: pitch, gable: 0, wallH: baseH };
      }
      return { ...none, wallH: baseH };
    }
  }

  return none;
}

/* ---- OpeningEditorCanvas implementation ---- */

export function oeExposureZoneVisual(zone) {
  const exp = (zone && zone.exposure) || 'exposedSide';
  const vis = {
    partyWall:   { fill: 'rgba(120,120,120,0.28)', stroke: 'rgba(85,85,85,0.95)', hatch: 'diag',  label: 'Party wall' },
    serviceGap:  { fill: 'rgba(120,135,155,0.18)', stroke: 'rgba(85,100,120,0.90)', hatch: 'grid',  label: 'Service gap' },
    alley:       { fill: 'rgba(214,166,68,0.16)',  stroke: 'rgba(170,120,30,0.95)', hatch: 'diag2', label: 'Alley' },
    rearService: { fill: 'rgba(120,165,195,0.16)', stroke: 'rgba(65,115,145,0.95)', hatch: 'h',     label: 'Rear service' },
    sideStreet:  { fill: 'rgba(96,160,112,0.12)',  stroke: 'rgba(48,120,70,0.95)',  hatch: 'v',     label: 'Side street' },
    mainStreet:  { fill: 'rgba(70,160,110,0.10)',  stroke: 'rgba(42,116,82,0.90)',  hatch: '',      label: 'Main street' },
    exposedSide: { fill: 'rgba(90,125,185,0.12)',  stroke: 'rgba(70,100,150,0.92)', hatch: '',      label: 'Exposed side' },
  };
  return vis[exp] || vis.exposedSide;
}

export function oeExposureZoneOverlaySvg(cfg, plan, wall, ox, oy, s, wallW, wallH) {
  if (!oeShowExposureZones) return '';
  if (!cfg) return '';
  normalizeSegmentedWallExposureZones(cfg);
  const zoneCount = Array.isArray(cfg.wallExposureZones) ? cfg.wallExposureZones.length : 0;
  if (!zoneCount) return '';

  const zones = cfg.wallExposureZones
    .map(z => normalizeWallExposureZone(z, wall, Math.max(1, Number(cfg.floorCount) || 1)))
    .filter(z => z && z.edgeId === wall);

  if (!zones.length) return '';

  const patternIds = {
    diag: 'oe-exp-hatch-diag',
    diag2: 'oe-exp-hatch-diag2',
    grid: 'oe-exp-hatch-grid',
    h: 'oe-exp-hatch-h',
    v: 'oe-exp-hatch-v',
  };

  let out = '<g pointer-events="none">';
  out += `<defs>`;
  out += `<pattern id="${patternIds.diag}" patternUnits="userSpaceOnUse" width="8" height="8"><path d="M-2,8 l10,-10 M0,10 l10,-10 M6,12 l10,-10" stroke="rgba(70,70,70,0.35)" stroke-width="1"/></pattern>`;
  out += `<pattern id="${patternIds.diag2}" patternUnits="userSpaceOnUse" width="8" height="8"><path d="M-2,0 l10,10 M0,-2 l10,10 M6,-4 l10,10" stroke="rgba(120,90,25,0.30)" stroke-width="1"/></pattern>`;
  out += `<pattern id="${patternIds.grid}" patternUnits="userSpaceOnUse" width="8" height="8"><path d="M0 0H8 M0 4H8 M0 8H8 M0 0V8 M4 0V8 M8 0V8" stroke="rgba(65,85,105,0.25)" stroke-width="0.8"/></pattern>`;
  out += `<pattern id="${patternIds.h}" patternUnits="userSpaceOnUse" width="8" height="8"><path d="M0 2H8 M0 6H8" stroke="rgba(55,105,135,0.26)" stroke-width="1"/></pattern>`;
  out += `<pattern id="${patternIds.v}" patternUnits="userSpaceOnUse" width="8" height="8"><path d="M2 0V8 M6 0V8" stroke="rgba(45,110,65,0.24)" stroke-width="1"/></pattern>`;
  out += `</defs>`;

  const legendMap = new Map();

  for (const z of zones) {
    const yr = yRangeForFloorSpan(plan, z.fromFloor, z.toFloor);
    const x = ox + z.fromT * wallW * s;
    const y = oy + yr.yTop * s;
    const w = Math.max(0, (z.toT - z.fromT) * wallW * s);
    const h = Math.max(0, (yr.yBottom - yr.yTop) * s);
    if (w < 2 || h < 2) continue;
    const vis = oeExposureZoneVisual(z);
    legendMap.set(vis.label || z.exposure, vis);

    out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="${vis.fill}" stroke="${vis.stroke}" stroke-width="1" stroke-dasharray="5 3"/>`;
    if (vis.hatch && patternIds[vis.hatch]) {
      out += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="url(#${patternIds[vis.hatch]})" opacity="0.9"/>`;
    }
    if (w >= 34 && h >= 16) {
      const label = vis.label || z.exposure;
      const flags = [];
      if ((z.exposure === 'partyWall') || z.claddingMode === 'none' || z.claddingMode === 'structuralOnly') flags.push('no cladding');
      if (!z.allowWindows) flags.push('no windows');
      if (!z.allowDoors) flags.push('no doors');
      out += `<text x="${(x + w/2).toFixed(1)}" y="${(y + 11).toFixed(1)}" text-anchor="middle" fill="${vis.stroke}" font-size="11" font-weight="700" font-family="system-ui">${label}</text>`;
      if (flags.length && h >= 28) {
        out += `<text x="${(x + w/2).toFixed(1)}" y="${(y + 23).toFixed(1)}" text-anchor="middle" fill="${vis.stroke}" font-size="9" font-family="system-ui">${flags.join(' • ')}</text>`;
      }
    }
  }

  const legendItems = [...legendMap.entries()];
  if (legendItems.length) {
    const boxW = 162;
    const rowH = 14;
    const boxH = 18 + legendItems.length * rowH;
    const lx = ox + 6;
    const ly = oy + 6;
    out += `<rect x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" width="${boxW}" height="${boxH}" rx="6" fill="rgba(255,255,255,0.88)" stroke="rgba(70,70,70,0.35)"/>`;
    out += `<text x="${(lx+8).toFixed(1)}" y="${(ly+12).toFixed(1)}" fill="#333" font-size="10" font-weight="700" font-family="system-ui">Exposure zones</text>`;
    legendItems.forEach(([lab, vis], i) => {
      const yy = ly + 18 + i * rowH;
      out += `<rect x="${(lx+8).toFixed(1)}" y="${yy.toFixed(1)}" width="10" height="10" fill="${vis.fill}" stroke="${vis.stroke}" stroke-width="1"/>`;
      if (vis.hatch && patternIds[vis.hatch]) {
        out += `<rect x="${(lx+8).toFixed(1)}" y="${yy.toFixed(1)}" width="10" height="10" fill="url(#${patternIds[vis.hatch]})"/>`;
      }
      out += `<text x="${(lx+24).toFixed(1)}" y="${(yy+8).toFixed(1)}" fill="#333" font-size="10" font-family="system-ui">${lab}</text>`;
    });
  }

  out += `</g>`;
  return out;
}

export function oeCanvasRenderImpl() {
  const svg = document.getElementById('openingEditorSvg');
  if (!svg) return;
  const { W, H: baseH } = oeGetWallDims(oeWall);
  const layoutCutInterval = oeWallLayoutCutInterval(oeWall);
  const hasLayoutCut = layoutCutInterval.cropped || layoutCutInterval.omit;

  // Emit the 4 corner resize handles for a selected opening. Each handle
  // carries data-oe-handle (corner identifier) + data-oe-idx (which op in
  // oeOpenings[oeWall]) so the mousedown handler can dispatch to a resize
  // drag. Cursor hints match the diagonal of each corner; for bay-typed
  // openings the bottom is anchored, so SW/SE corners get an ew-resize
  // cursor (they only resize width, not height) — the resize handler will
  // also enforce that constraint mathematically.
  // Doors are intentionally NOT resizable after placement — their dimensions
  // come from the door style's canonical w/h, and resizing produces visually
  // jarring proportions (e.g. a tall narrow door stretched into a square).
  // The size can still be set BEFORE drop via the toolbox card's W/H inputs.
  // We return an empty string for doors so the selection still highlights
  // (border + label remain) but no resize grips appear.
  function oeResizeHandles(rx, ry, rw, rh, opIdx, opType) {
    if (opIdx == null || opIdx < 0) return '';
    const handleOp = (oeOpenings[oeWall] || [])[opIdx];
    if (handleOp && handleOp._embeddedRail) return '';
    if (opType === 'door') return '';
    // Wall pass-through holes are stored as fixture ops with placement:'cutout'.
    // Their default footprints are only a few millimetres wide, so the 8px
    // resize grips can cover the entire visible object and make every drag
    // start look like a resize instead of a move. Keep them draggable by
    // suppressing post-placement resize handles; size is still controlled
    // before placement from the toolbox W/H fields.
    if (opType === 'fixture') {
      const fxSpec = handleOp && FIXTURE_STYLES[handleOp.style];
      if (fxSpec && fxSpec.placement === 'cutout') return '';
    }
    const corners = [
      ['nw', rx,      ry,      'nwse-resize'],
      ['ne', rx + rw, ry,      'nesw-resize'],
      ['sw', rx,      ry + rh, 'nesw-resize'],
      ['se', rx + rw, ry + rh, 'nwse-resize'],
    ];
    let out = '';
    const grip = oeIsTouchLikeEditor() ? 14 : 8;
    const gripHalf = grip / 2;
    for (const [corner, hx, hy, cur] of corners) {
      // Bays: the bottom edge is locked to y=H, so SW/SE corners can only
      // change width. Use ew-resize cursor to communicate that.
      const cursor = (opType === 'bay' && (corner === 'sw' || corner === 'se')) ? 'ew-resize' : cur;
      out += `<rect x="${(hx - gripHalf).toFixed(1)}" y="${(hy - gripHalf).toFixed(1)}" width="${grip}" height="${grip}"`
           + ` fill="#f70" stroke="white" stroke-width="1" rx="2"`
           + ` data-oe-handle="${corner}" data-oe-idx="${opIdx}" style="cursor:${cursor}"/>`;
    }
    return out;
  }

  // ---- Wall shape info ----
  const si      = oeWallShapeInfo();
  const pitchL  = si.pitchL, pitchR = si.pitchR, gable = si.gable;
  const wallH   = si.wallH;
  const activePlan = oeActivePlan();
  const activeCfg  = oeActiveCfg();
  const wallParapetH = oeWallParapetHeight(activePlan, activeCfg, oeWall);
  const peakAbove = Math.max(pitchL, pitchR, gable);

  // ---- Coplanar wing extensions (joined / L-shaped walls) ----
  const wingExts   = hasLayoutCut ? [] : oeComputeWingExtensions();
  const leftExts   = wingExts.filter(e => e.side === 'left');
  const rightExts  = wingExts.filter(e => e.side === 'right');
  const leftExtW   = leftExts.reduce((a, e) => a + e.width, 0);
  const rightExtW  = rightExts.reduce((a, e) => a + e.width, 0);
  const totalDispW = W + leftExtW + rightExtW;

  const PAD = 32;
  const totalH = wallH + peakAbove;
  const s = Math.min((900 - PAD * 2) / totalDispW, (560 - PAD * 2) / totalH, 7) * oeZoom;
  oeEditorScale = s;
  oeExtraTop    = peakAbove * s;
  oeWallEffH    = wallH;
  oeWallLeftPx  = leftExtW * s;   // SVG px left of ox that belong to wing extensions

  const svgW = totalDispW * s + PAD * 2;
  const svgH = totalH * s + PAD * 2;
  const ox   = PAD + leftExtW * s;  // x-origin of the MAIN WALL in SVG coords
  const oy   = PAD + oeExtraTop;

  svg.setAttribute('width',   svgW);
  svg.setAttribute('height',  svgH);
  svg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);

  // Build polygon points for the wall outline. Includes coplanar wing
  // extensions as L (or U) steps so the merged wall looks continuous — and
  // so cladding, floor bands and parapet (all drawn inside the clip path)
  // naturally extend across the wing portion too.
  function wallPts() {
    if (hasLayoutCut) {
      const x0mm = oeWall === 'east' ? W - layoutCutInterval.x1 : layoutCutInterval.x0;
      const x1mm = oeWall === 'east' ? W - layoutCutInterval.x0 : layoutCutInterval.x1;
      const yB = oy + wallH * s;
      const topYAt = (x) => {
        if (gable > 0) {
          if (x <= W / 2) return oy - (pitchL + (gable - pitchL) * (x / Math.max(W / 2, 0.001))) * s;
          return oy - (gable + (pitchR - gable) * ((x - W / 2) / Math.max(W / 2, 0.001))) * s;
        }
        return oy - (pitchL + (pitchR - pitchL) * (x / Math.max(W, 0.001))) * s;
      };
      const p = [
        `${(ox + x0mm * s).toFixed(1)},${yB.toFixed(1)}`,
        `${(ox + x0mm * s).toFixed(1)},${topYAt(x0mm).toFixed(1)}`,
      ];
      if (gable > 0 && x0mm < W / 2 && x1mm > W / 2) {
        p.push(`${(ox + W * s / 2).toFixed(1)},${(oy - gable * s).toFixed(1)}`);
      }
      p.push(`${(ox + x1mm * s).toFixed(1)},${topYAt(x1mm).toFixed(1)}`);
      p.push(`${(ox + x1mm * s).toFixed(1)},${yB.toFixed(1)}`);
      return p.join(' ');
    }
    const p = [];
    // Up to one extension per side is supported in the polygon. Additional
    // extensions on the same side will still render as separate hatched
    // panels (rare case).
    const lExt = leftExts[0]  || null;
    const rExt = rightExts[0] || null;
    const lExtWpx = lExt ? lExt.width  * s : 0;
    const lExtHpx = lExt ? lExt.height * s : 0;
    const rExtWpx = rExt ? rExt.width  * s : 0;
    const rExtHpx = rExt ? rExt.height * s : 0;
    const x0 = ox - lExtWpx;
    const xE = ox + W*s + rExtWpx;
    const yB = oy + wallH*s;
    // Walk the perimeter counter-clockwise starting bottom-left.
    p.push(`${x0.toFixed(1)},${yB.toFixed(1)}`);                                     // bottom-left
    if (lExt) {
      p.push(`${x0.toFixed(1)},${(yB - lExtHpx).toFixed(1)}`);                       // up left ext
      p.push(`${ox.toFixed(1)},${(yB - lExtHpx).toFixed(1)}`);                       // step right at ext top
    }
    p.push(`${ox.toFixed(1)},${(oy - pitchL*s).toFixed(1)}`);                        // main top-left
    if (gable > 0)
      p.push(`${(ox+W*s/2).toFixed(1)},${(oy - gable*s).toFixed(1)}`);               // apex
    p.push(`${(ox+W*s).toFixed(1)},${(oy - pitchR*s).toFixed(1)}`);                  // main top-right
    if (rExt) {
      p.push(`${(ox+W*s).toFixed(1)},${(yB - rExtHpx).toFixed(1)}`);                 // down to right ext top
      p.push(`${xE.toFixed(1)},${(yB - rExtHpx).toFixed(1)}`);                       // right along ext top
    }
    p.push(`${xE.toFixed(1)},${yB.toFixed(1)}`);                                     // bottom-right
    return p.join(' ');
  }
  const WPTS = wallPts();
  // Total extended wall x range used by cladding, floor bands, parapet
  const wxStart = ox - leftExtW * s;
  const wxEnd   = ox + W * s + rightExtW * s;
  const wxW     = wxEnd - wxStart;

  let html = `<defs>
    <clipPath id="oe-wall-clip"><polygon points="${WPTS}"/></clipPath>
    <pattern id="oe-hatch" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="5" stroke="#bbb" stroke-width="1.2"/>
    </pattern>
    <pattern id="oe-buffer-hatch" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
      <rect width="6" height="6" fill="#a89889"/>
      <line x1="0" y1="0" x2="0" y2="6" stroke="#7a6c5e" stroke-width="2"/>
    </pattern>
  </defs>`;

  // Wall background fill (matches actual shape)
  html += `<polygon data-oe-wall-outline="true" data-oe-layout-cut="${hasLayoutCut ? 'true' : 'false'}" data-oe-layout-cut-x0="${layoutCutInterval.x0.toFixed(3)}" data-oe-layout-cut-x1="${layoutCutInterval.x1.toFixed(3)}" points="${WPTS}" fill="#c8bfb0" stroke="none"/>`;

  // ---- All interior content clipped to the wall polygon ----
  html += `<g clip-path="url(#oe-wall-clip)">`;

  // Edge buffer overlay — the strips along each end of front/back walls
  // where the perpendicular wall's core material sits behind the inside
  // face, making it impossible to cut a real through-opening. Rendered
  // first (under everything else) as a hatched zone with a hairline divider
  // so the user understands the placement constraint visually before they
  // try to drag a window into it.
  //
  // Cladding patches (op.type === 'cladding_override') deliberately
  // ignore this buffer — they don't cut through the wall, they paint over
  // its outer face. The perpendicular wall's core sitting behind doesn't
  // block a surface patch the way it would block a through-cut. To make
  // that visible at a glance, mask the hatched overlay out of any region
  // a cladding patch covers: where a patch is, the hatch isn't drawn, so
  // the user sees that the buffer constraint doesn't apply to the patch.
  // The hatch still shows in the parts of the buffer not covered by
  // patches, where it's a valid warning against placing windows/doors.
  {
    const buf = oeEdgeBuffer(oeWall);
    if (buf.left > 0 || buf.right > 0) {
      const yT = -peakAbove, yB = wallH;

      // Build a mask out of any cladding patches that sit on this wall.
      // White = hatch visible, black = hatch hidden. SVG masks composite
      // by luminance; one big white background plus black-over-patches
      // gives us "show hatch everywhere except patch interiors".
      const editorOps = oeOpenings[oeWall] || [];
      const patches = editorOps.filter(o => o && o.type === 'cladding_override');
      let maskAttr = '';
      if (patches.length > 0) {
        const maskId = 'oe-buffer-mask';
        let maskBody = `<rect x="0" y="0" width="100%" height="100%" fill="white"/>`;
        for (const op of patches) {
          const px = ox + oeMirrorX(op.x, op.w) * s;
          const py = oy + op.y * s;
          const pw = op.w * s, ph = op.h * s;
          maskBody += `<rect x="${px.toFixed(1)}" y="${py.toFixed(1)}" width="${pw.toFixed(1)}" height="${ph.toFixed(1)}" fill="black"/>`;
        }
        html += `<defs><mask id="${maskId}">${maskBody}</mask></defs>`;
        maskAttr = ` mask="url(#${maskId})"`;
      }

      if (buf.left > 0) {
        html += `<rect x="${ox.toFixed(1)}" y="${(oy + yT * s).toFixed(1)}"`
              + ` width="${(buf.left * s).toFixed(1)}" height="${((yB - yT) * s).toFixed(1)}"`
              + ` fill="url(#oe-buffer-hatch)" opacity="0.55" pointer-events="none"${maskAttr}/>`;
        html += `<line x1="${(ox + buf.left * s).toFixed(1)}" y1="${(oy + yT * s).toFixed(1)}"`
              + ` x2="${(ox + buf.left * s).toFixed(1)}" y2="${(oy + yB * s).toFixed(1)}"`
              + ` stroke="#7a6c5e" stroke-width="0.5" stroke-dasharray="3 2" pointer-events="none"/>`;
      }
      if (buf.right > 0) {
        html += `<rect x="${(ox + (W - buf.right) * s).toFixed(1)}" y="${(oy + yT * s).toFixed(1)}"`
              + ` width="${(buf.right * s).toFixed(1)}" height="${((yB - yT) * s).toFixed(1)}"`
              + ` fill="url(#oe-buffer-hatch)" opacity="0.55" pointer-events="none"${maskAttr}/>`;
        html += `<line x1="${(ox + (W - buf.right) * s).toFixed(1)}" y1="${(oy + yT * s).toFixed(1)}"`
              + ` x2="${(ox + (W - buf.right) * s).toFixed(1)}" y2="${(oy + yB * s).toFixed(1)}"`
              + ` stroke="#7a6c5e" stroke-width="0.5" stroke-dasharray="3 2" pointer-events="none"/>`;
      }
    }
  }

  // Placement grid dots. X/Y spacing and origins are controlled from the
  // top properties bar. Dots are grid INTERSECTIONS in bottom-left
  // measurement space: X grows right, Y grows upward from the wall bottom.
  if (oeGrid.enabled && oeGridStep('x') > 0 && oeGridStep('y') > 0) {
    let displayStepX = oeGridStep('x');
    let displayStepY = oeGridStep('y');
    while (displayStepX * s < 4) displayStepX *= 2;
    while (displayStepY * s < 4) displayStepY *= 2;
    const dotR = Math.min(1.2, Math.min(displayStepX, displayStepY) * s * 0.12);
    const gx0 = oeGridStart(0, displayStepX, oeGridOrigin('x'));
    const yMeasureMax = wallH + peakAbove;
    const gyMeasure0 = oeGridStart(0, displayStepY, oeGridOrigin('y'));
    html += `<g opacity="0.35" pointer-events="none">`;
    for (let gx = gx0; gx <= W + 0.01; gx += displayStepX) {
      for (let gyMeasure = gyMeasure0; gyMeasure <= yMeasureMax + 0.01; gyMeasure += displayStepY) {
        const gyInternal = wallH - gyMeasure;
        html += `<circle cx="${(ox+gx*s).toFixed(1)}" cy="${(oy+gyInternal*s).toFixed(1)}" r="${dotR}" fill="#666"/>`;
      }
    }
    html += `</g>`;
  }

  // Floor band tints (extend across wing portion too via the L-shape clip)
  const bands = oeGetFloorBands(oeWall);
  for (let i = 0; i < bands.length; i++) {
    const b = bands[i];
    const by = oy + b.yTop * s, bh = (b.yBottom - b.yTop) * s;
    html += `<rect x="${wxStart.toFixed(1)}" y="${by}" width="${wxW.toFixed(1)}" height="${bh}" fill="${OE_BAND_FILLS[i % 2]}" pointer-events="none"/>`;
    if (i > 0)
      html += `<line x1="${wxStart.toFixed(1)}" y1="${by}" x2="${wxEnd.toFixed(1)}" y2="${by}" stroke="rgba(80,80,80,0.25)" stroke-width="0.8" stroke-dasharray="4 3" pointer-events="none"/>`;
    html += `<text x="${(ox+W*s-3).toFixed(1)}" y="${by+bh-4}" font-size="8" fill="rgba(60,60,60,0.35)" text-anchor="end" font-family="system-ui" pointer-events="none">floor ${bands.length - i}</text>`;
  }

  // Parapet zone (extends across L-shape — clip path crops to wing's parapet height too)
  if (wallParapetH > 0) {
    const ph = wallParapetH * s;
    const roofLineY = oy + ph;
    html += `<rect data-oe-parapet-band="true" data-parapet-mm="${wallParapetH.toFixed(3)}" x="${wxStart.toFixed(1)}" y="${oy}" width="${wxW.toFixed(1)}" height="${ph.toFixed(1)}" fill="url(#oe-hatch)" opacity="0.55" pointer-events="none"/>`;
    html += `<line data-oe-roof-line="true" x1="${wxStart.toFixed(1)}" y1="${roofLineY.toFixed(1)}" x2="${wxEnd.toFixed(1)}" y2="${roofLineY.toFixed(1)}" stroke="rgba(80,80,80,0.45)" stroke-width="0.9" stroke-dasharray="4 3" pointer-events="none"/>`;
    if (ph >= 10) {
      html += `<text x="${ox+4}" y="${oy+ph-3}" font-size="9" fill="#666" font-family="system-ui" pointer-events="none">parapet</text>`;
    }
  }

  // Bay opening — drawn as part of the editor's interactive layer so it
  // selects, drags, resizes, and deletes through the SAME code paths as
  // every other opening. Sourced from the bay entry in oeOpenings (where
  // the user's drag-in-progress mutations live). Side-wall bays are ordinary
  // wall features, so draw them from the entry instead of relying only on
  // front/back plan-level bay state.
  const opsArrBay = oeOpenings[oeWall] || [];
  const bayEntry  = opsArrBay.find(op => op && op.type === 'bay');
  if (bayEntry) {
    const bayIdx   = opsArrBay.indexOf(bayEntry);
    const bayX     = bayEntry.x;
    const bayY     = bayEntry.y;
    const bayW     = bayEntry.w;
    const bayH     = bayEntry.h;
    const bayStyle = bayEntry.style;
    const isSel     = oeSelectedSet.has(bayIdx);
    const isPrimary = isSel && [...oeSelectedSet][0] === bayIdx;
    const rx = ox + oeMirrorX(bayX, bayW) * s;
    const ry = oy + bayY * s;
    const rw = bayW * s;
    const rh = bayH * s;
    const stroke = isSel ? '#f70' : '#555';
    const sw     = isSel ? 2.5   : 1.0;
    const idxAttr = (bayIdx >= 0) ? ` data-oe-idx="${bayIdx}"` : '';
    const linkLabel = (bayStyle === 'through') ? ' (⇔ linked)' : '';
    html += `<rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}"`
          + ` fill="#9a9088" stroke="${stroke}" stroke-width="${sw}"`
          + ` data-oe-bay="1"${idxAttr} style="cursor:move"/>`;
    html += `<text x="${(rx + rw / 2).toFixed(1)}" y="${(ry + rh / 2 + 4).toFixed(1)}" font-size="9" fill="#eee"`
          + ` text-anchor="middle" font-family="system-ui" pointer-events="none">bay${linkLabel}</text>`;
    if (isPrimary) {
      const cntLabel = oeSelectedSet.size > 1 ? ` [${oeSelectedSet.size}]` : '';
      const styleLbl = (bayStyle === 'through') ? 'through' : 'side';
      html += `<text x="${(rx + rw / 2).toFixed(1)}" y="${(ry - 4).toFixed(1)}" font-size="9" fill="#f70" text-anchor="middle" font-family="system-ui" font-weight="600">${styleLbl} bay ${bayW.toFixed(1)}×${bayH.toFixed(1)}${cntLabel}</text>`;
      html += oeResizeHandles(rx, ry, rw, rh, bayIdx, 'bay');
    }
  }

  // Floor centre lines
  if (activePlan && activePlan.floorCenterYs) {
    for (const cy of activePlan.floorCenterYs)
      html += `<line x1="${ox}" y1="${oy+cy*s}" x2="${ox+W*s}" y2="${oy+cy*s}" stroke="rgba(80,140,100,0.4)" stroke-width="0.7" stroke-dasharray="5 4" pointer-events="none"/>`;
  }

  html += oeExposureZoneOverlaySvg(activeCfg, activePlan, oeWall, ox, oy, s, W, wallH);

  // Cladding overlay (extends across full L-shape — clip path crops naturally)
  if (oeShowCladding && activePlan) {
    const cT = activeCfg.claddingThickness || CONFIG.claddingThickness || 0.28;

    const ops = oeOpenings[oeWall] || [];
    const cutOpenings = ops.filter(op => op.type !== 'awning' && op.type !== 'balcony')
                           .map(op => ({ x:op.x, y:op.y, w:op.w, h:op.h }));

    // Full extended wall width in mm (main + left + right wing extensions)
    const wxWmm = W + leftExtW + rightExtW;
    // The cladding pattern is computed across the full extended width in
    // *mm*, with main wall's openings positioned at x = leftExtW + (mirrored)op.x
    // (shifted right by the left extension; mirrored for east/west walls so
    // the cuts line up with the rendered window/door rectangles above).
    const cladOps = cutOpenings.map(op => ({ x: oeMirrorX(op.x, op.w) + leftExtW, y: op.y, w: op.w, h: op.h }));
    // Include the bay opening as a cut so cladding seam lines don't draw
    // across it (same fix we apply to the laser-panel cladding). Bays are
    // only on front/back so no mirror needed.
    if (activePlan && ((oeWall === 'front' && activePlan.hasFrontBay) || (oeWall === 'back' && activePlan.hasBackBay))) {
      const bayW = activePlan.bayXEnd - activePlan.bayXStart;
      cladOps.push({
        x: activePlan.bayXStart + leftExtW,
        y: wallH - activePlan.bayHeight,
        w: bayW,
        h: activePlan.bayHeight,
      });
    }

    function drawCladdingBand(styleKey, bandTop, bandBottom) {
      const styleSpec = CLADDING_STYLES[styleKey];
      if (!styleSpec) return;
      const bandCuts = cladOps.map(c => {
        const cy0=Math.max(c.y,bandTop), cy1=Math.min(c.y+c.h,bandBottom);
        if (cy1<=cy0) return null;
        return { x:c.x, y:cy0, w:c.w, h:cy1-cy0 };
      }).filter(Boolean);
      html += `<rect x="${wxStart.toFixed(1)}" y="${oy+bandTop*s}" width="${wxW.toFixed(1)}" height="${(bandBottom-bandTop)*s}" fill="rgba(190,175,158,0.55)" pointer-events="none"/>`;
      const lines = generateCladdingPattern(styleSpec, 0, bandTop, wxWmm, bandBottom, bandCuts);
      for (const l of lines)
        html += `<line x1="${(wxStart+l.x1*s).toFixed(2)}" y1="${(oy+l.y1*s).toFixed(2)}" x2="${(wxStart+l.x2*s).toFixed(2)}" y2="${(oy+l.y2*s).toFixed(2)}" stroke="rgba(70,50,30,0.55)" stroke-width="0.6" pointer-events="none"/>`;
      for (const op of ops) {
        if (op.type === 'awning' || op.type === 'balcony' || op.type === 'fixture' || op.type === 'cladding_override' || op.type === 'printed_item') continue;
        if (op.type === 'bay') continue;  // bay is drawn via the plan path above
        const cy0=Math.max(op.y,bandTop), cy1=Math.min(op.y+op.h,bandBottom);
        if (cy1<=cy0) continue;
        if (op.type === 'cladding_override') {
          // Override region — main cladding pattern is suppressed here (via
          // cutOpenings), and a secondary-cladding piece fills the area.
          // Render its own etched pattern so the user sees the replacement.
          // Merge in any per-override styleParams (e.g. corrugated metal
          // sheet dims) so the live editor preview matches what the laser
          // piece will actually look like.
          const overStyle = effectiveCladdingStyle(CLADDING_STYLES[op.claddingStyle], op.styleParams);
          const rx = ox + oeMirrorX(op.x, op.w)*s;
          const ry = oy + cy0*s;
          const rw = op.w*s, rh = (cy1-cy0)*s;
          html += `<rect x="${rx.toFixed(2)}" y="${ry.toFixed(2)}" width="${rw.toFixed(2)}" height="${rh.toFixed(2)}" fill="rgba(210,196,170,0.85)" pointer-events="none"/>`;
          if (overStyle) {
            // Generate pattern in piece-local coords (0..w, 0..h) and offset
            // into the visible band slice. clipY accounts for the band cut.
            const clipY = cy0 - op.y;
            const overLines = generateCladdingPattern(overStyle, 0, 0, op.w, op.h, []);
            for (const l of overLines) {
              const ly1 = l.y1 - clipY, ly2 = l.y2 - clipY;
              if (ly1 < 0 && ly2 < 0) continue;
              if (ly1 > rh/s && ly2 > rh/s) continue;
              html += `<line x1="${(rx + l.x1*s).toFixed(2)}" y1="${(ry + ly1*s).toFixed(2)}" x2="${(rx + l.x2*s).toFixed(2)}" y2="${(ry + ly2*s).toFixed(2)}" stroke="rgba(40,30,15,0.65)" stroke-width="0.6" pointer-events="none"/>`;
            }
          }
          continue;
        }
        const isWin = op.type==='window';
        html += `<rect x="${(ox+oeMirrorX(op.x, op.w)*s).toFixed(2)}" y="${(oy+cy0*s).toFixed(2)}" width="${(op.w*s).toFixed(2)}" height="${((cy1-cy0)*s).toFixed(2)}" fill="${isWin?'rgba(130,175,215,0.7)':'rgba(230,190,140,0.7)'}" pointer-events="none"/>`;
      }
      const edgePx = cT * s;
      if (edgePx >= 1) {
        html += `<line x1="${wxStart.toFixed(1)}" y1="${oy+bandTop*s}" x2="${wxStart.toFixed(1)}" y2="${oy+bandBottom*s}" stroke="rgba(120,90,60,0.35)" stroke-width="${edgePx}" pointer-events="none"/>`;
        html += `<line x1="${wxEnd.toFixed(1)}" y1="${oy+bandTop*s}" x2="${wxEnd.toFixed(1)}" y2="${oy+bandBottom*s}" stroke="rgba(120,90,60,0.35)" stroke-width="${edgePx}" pointer-events="none"/>`;
      }
    }

    const splitEnabled = !!(activeCfg.firstFloorCladdingStyleEnabled) &&
      activeCfg.firstFloorCladdingStyle && activeCfg.firstFloorCladdingStyle !== activeCfg.claddingStyle;
    const firstFloorH = activePlan.firstFloorHeight || activeCfg.floorHeight || CONFIG.floorHeight || 30;
    const splitY = wallH - firstFloorH;
    if (splitEnabled && splitY > 2 && splitY < wallH - 2) {
      drawCladdingBand(activeCfg.claddingStyle, 0, splitY);
      drawCladdingBand(activeCfg.firstFloorCladdingStyle, splitY, wallH);
      html += `<line x1="${ox}" y1="${oy+splitY*s}" x2="${ox+W*s}" y2="${oy+splitY*s}" stroke="rgba(60,40,20,0.5)" stroke-width="1" stroke-dasharray="4 2" pointer-events="none"/>`;
      html += `<text x="${ox+4}" y="${oy+splitY*s-3}" font-size="8" fill="rgba(60,40,20,0.6)" font-family="system-ui" pointer-events="none">upper cladding</text>`;
      html += `<text x="${ox+4}" y="${oy+splitY*s+9}" font-size="8" fill="rgba(60,40,20,0.6)" font-family="system-ui" pointer-events="none">ground cladding</text>`;
    } else {
      drawCladdingBand(activeCfg.claddingStyle, 0, wallH);
    }
  }

  // Wing footprint overlay — shows where wings attach to this wall, so the
  // user can avoid placing openings in zones occupied by wing interiors /
  // wing connection walls. A wing's FRONT face attaches to main.<wing.face>,
  // so its footprint sits on that wall at x∈[wing.offset, wing.offset+wing.span]
  // and y∈[wallH-wingH, wallH]. For east/west walls the editor view is
  // mirrored relative to laser-panel x (so +N/FRONT appears on observer's
  // right for east, left for west — matching standard external view); we
  // route the x through `oeMirrorX` so the rendered position lines up with
  // the footprint mini-map and the +N/+S labels.
  for (const wi in (CONFIG.wings || [])) {
    const wing = CONFIG.wings[wi];
    if (wing.face !== oeWall) continue;
    const wingSpan = wing.span || 0;
    const fx0 = ox + oeMirrorX(wing.offset || 0, wingSpan) * s;
    const fxW = wingSpan * s;
    const wH2 = wingHeight(CONFIG, wing);
    const fy0 = oy + (wallH - wH2) * s;
    const fyH = wH2 * s;
    // Hatched fill (re-uses the same pattern as the parapet zone)
    html += `<rect x="${fx0.toFixed(1)}" y="${fy0.toFixed(1)}" width="${fxW.toFixed(1)}" height="${fyH.toFixed(1)}" fill="rgba(180,140,90,0.18)" stroke="rgba(160,110,60,0.7)" stroke-width="1.5" stroke-dasharray="6 3" pointer-events="none"/>`;
    html += `<rect x="${fx0.toFixed(1)}" y="${fy0.toFixed(1)}" width="${fxW.toFixed(1)}" height="${fyH.toFixed(1)}" fill="url(#oe-hatch)" opacity="0.25" pointer-events="none"/>`;
    // Label "Wing N" — centred, with the wing's connection type
    const connLabel = (wing.connection === 'open') ? 'open' : 'wall';
    html += `<text x="${(fx0 + fxW/2).toFixed(1)}" y="${(fy0 + fyH/2).toFixed(1)}" font-size="11" fill="rgba(110,70,30,0.85)" text-anchor="middle" font-family="system-ui" font-weight="600" pointer-events="none">Wing ${+wi + 1}</text>`;
    html += `<text x="${(fx0 + fxW/2).toFixed(1)}" y="${(fy0 + fyH/2 + 13).toFixed(1)}" font-size="9" fill="rgba(110,70,30,0.6)" text-anchor="middle" font-family="system-ui" pointer-events="none">(${connLabel} · ${wing.span}×${wH2.toFixed(0)}mm)</text>`;
  }

  html += `</g>`; // end clip group

  // ---- Coplanar wing extension markers (outside main-wall clip).
  // Cladding/floor-bands/parapet are now drawn across the full L-shape
  // (handled by the extended wallPts polygon clip), so the wing portion
  // already looks cladded and continuous. We just add a subtle dashed
  // boundary at the step and a "Wing N" label so the user can see which
  // part belongs to the wing and isn't directly editable from here.
  {
    function drawWingMarker(ext, panX, isLeft) {
      const extPx  = ext.width * s;
      const extHPx = ext.height * s;
      const panY   = oy + (wallH - ext.height) * s;
      // Dashed boundary on the side that touches main, and along the step
      const stepX = isLeft ? (panX + extPx) : panX;
      html += `<line x1="${stepX.toFixed(1)}" y1="${oy.toFixed(1)}" x2="${stepX.toFixed(1)}" y2="${panY.toFixed(1)}" stroke="rgba(110,80,50,0.5)" stroke-width="1.2" stroke-dasharray="3 3" pointer-events="none"/>`;
      // Label "Wing N" — find wing index from CONFIG.wings
      const wi = (CONFIG.wings || []).indexOf(ext.wing);
      const lx = panX + extPx / 2, ly = panY + extHPx / 2;
      html += `<text x="${lx.toFixed(1)}" y="${(ly-5).toFixed(1)}" font-size="11" fill="rgba(110,70,30,0.85)" text-anchor="middle" font-family="system-ui" font-weight="600" pointer-events="none">Wing ${wi >= 0 ? wi + 1 : '?'}</text>`;
      html += `<text x="${lx.toFixed(1)}" y="${(ly+8).toFixed(1)}" font-size="8" fill="rgba(110,70,30,0.6)" text-anchor="middle" font-family="system-ui" pointer-events="none">edit via wing tab</text>`;
    }
    // Left extensions accumulate right-to-left from ox
    {
      let curX = ox;
      for (const ext of [...leftExts].reverse()) {
        curX -= ext.width * s;
        drawWingMarker(ext, curX, true);
      }
    }
    // Right extensions accumulate left-to-right from ox+W*s
    {
      let curX = ox + W * s;
      for (const ext of rightExts) {
        drawWingMarker(ext, curX, false);
        curX += ext.width * s;
      }
    }
  }

  // Wall outline on top (not clipped, so it's always sharp)
  html += `<polygon points="${WPTS}" fill="none" stroke="#555" stroke-width="1.5"/>`;

  // Dimension labels
  html += `<text x="${ox+W*s/2}" y="${(oy-peakAbove*s-8).toFixed(1)}" font-size="10" fill="#555" text-anchor="middle" font-family="system-ui">${W.toFixed(1)} mm</text>`;
  html += `<text x="${(ox-14).toFixed(1)}" y="${(oy+wallH*s/2).toFixed(1)}" font-size="10" fill="#555" text-anchor="middle" font-family="system-ui" transform="rotate(-90,${(ox-14).toFixed(1)},${(oy+wallH*s/2).toFixed(1)})">${wallH.toFixed(1)} mm</text>`;

  // Slant/gable pitch labels
  if (pitchL > 0)
    html += `<text x="${ox+4}" y="${(oy-pitchL*s-4).toFixed(1)}" font-size="9" fill="#888" font-family="system-ui">+${pitchL.toFixed(0)}</text>`;
  if (pitchR > 0)
    html += `<text x="${(ox+W*s-4).toFixed(1)}" y="${(oy-pitchR*s-4).toFixed(1)}" font-size="9" fill="#888" text-anchor="end" font-family="system-ui">+${pitchR.toFixed(0)}</text>`;
  if (gable > 0)
    html += `<text x="${(ox+W*s/2).toFixed(1)}" y="${(oy-gable*s-6).toFixed(1)}" font-size="9" fill="#888" text-anchor="middle" font-family="system-ui">▲ ${gable.toFixed(0)} mm</text>`;

  // Openings (outside clip so selection handles are always visible)
  const ops = oeOpenings[oeWall] || [];

  // ---- Pass 1: cladding overrides (rendered FIRST so they sit beneath
  // windows, doors, fixtures, awnings, balconies). The data array order
  // doesn't determine z-order — render-order does. We iterate twice to
  // keep both passes correct regardless of insertion order.
  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    if (op.type !== 'cladding_override') continue;
    const isSel = oeSelectedSet.has(i);
    const isPrimary = isSel && [...oeSelectedSet][0] === i;
    const rx = ox + oeMirrorX(op.x, op.w)*s, ry = oy + op.y*s, rw = op.w*s, rh = op.h*s;
    const styleSpec = CLADDING_STYLES[op.claddingStyle];
    const styleLabel = styleSpec ? styleSpec.label : op.claddingStyle;
    // Tint patch — soft beige/tan with diagonal hatching to clearly read
    // as "alternate cladding" without preselecting a colour that conflicts
    // with the user's intended secondary style.
    const stroke = isSel ? '#f70' : '#5a4a32';
    const sw = isSel ? 2.5 : 1.2;
    // Background swatch using a CSS pattern fill via inline SVG
    const patId = 'oeOverPat_' + i;
    html += `<defs><pattern id="${patId}" patternUnits="userSpaceOnUse" width="${(s*1.5).toFixed(2)}" height="${(s*1.5).toFixed(2)}">`
         + `<rect width="${(s*1.5).toFixed(2)}" height="${(s*1.5).toFixed(2)}" fill="#d4c8ad"/>`
         + `<path d="M0,${(s*1.5).toFixed(2)} L${(s*1.5).toFixed(2)},0" stroke="#8a7a5c" stroke-width="0.5"/>`
         + `</pattern></defs>`;
    html += `<rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${rw.toFixed(1)}" height="${rh.toFixed(1)}"`
         + ` fill="url(#${patId})" stroke="${stroke}" stroke-width="${sw}" stroke-dasharray="${isSel ? '' : '4 2'}" data-oe-idx="${i}"/>`;
    // Style label inside the patch (only if room)
    if (rw > 30 && rh > 12) {
      html += `<text x="${(rx+rw/2).toFixed(1)}" y="${(ry+rh/2+3).toFixed(1)}" font-size="9" fill="#3a2a18" text-anchor="middle" font-family="system-ui" pointer-events="none">${styleLabel}</text>`;
    }
    if (isPrimary) {
      const cntLabel = oeSelectedSet.size > 1 ? ` [${oeSelectedSet.size}]` : '';
      html += `<text x="${(rx+rw/2).toFixed(1)}" y="${(ry-3).toFixed(1)}" font-size="9" fill="#f70" text-anchor="middle" font-family="system-ui" font-weight="600">${op.w.toFixed(0)}×${op.h.toFixed(0)}${cntLabel}</text>`;
      html += oeResizeHandles(rx, ry, rw, rh, i, 'cladding_override');
    }
  }

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    if (op.type === 'cladding_override') continue;  // already rendered in pass 1
    if (op.type === 'bay') continue;  // rendered via the plan-based bay path below
    const isSel = oeSelectedSet.has(i);
    const isPrimary = isSel && [...oeSelectedSet][0] === i;
    // Apply the east/west mirror at render time so the editor view matches
    // the +N/+S external-observer convention (see `oeMirrorX`).
    const rx = ox + oeMirrorX(op.x, op.w)*s, ry = oy + op.y*s, rw = op.w*s;

    if (op.type === 'awning') {
      // ---- Awning: striped horizontal bar ----
      const dispH = AWNING_DISP_H * s;
      const stroke = isSel ? '#f70' : '#7a4b15';
      const sw = isSel ? 2.5 : 1.2;
      html += `<rect x="${rx.toFixed(1)}" y="${ry.toFixed(1)}" width="${rw.toFixed(1)}" height="${dispH.toFixed(1)}" fill="#c4935a" stroke="${stroke}" stroke-width="${sw}" data-oe-idx="${i}"/>`;
      // Alternating darker stripes (every 3mm); guard step > 0 to be safe
      const spPx = Math.max(3 * s, 0.5);
      for (let sx = rx; sx < rx + rw; sx += spPx * 2) {
        const cw = Math.min(spPx, rx + rw - sx);
        if (cw > 0.5) html += `<rect x="${sx.toFixed(1)}" y="${ry.toFixed(1)}" width="${cw.toFixed(1)}" height="${dispH.toFixed(1)}" fill="rgba(90,45,5,0.28)" pointer-events="none"/>`;
      }
      // Depth label inside the bar
      if (rw > 16) {
        html += `<text x="${(rx+rw/2).toFixed(1)}" y="${(ry+dispH*0.72).toFixed(1)}" font-size="7" fill="rgba(50,20,0,0.75)" text-anchor="middle" font-family="system-ui" font-weight="600" pointer-events="none">↙${op.h.toFixed(0)}mm</text>`;
      }
      if (isPrimary) {
        const cntLabel = oeSelectedSet.size > 1 ? ` [${oeSelectedSet.size}]` : '';
        html += `<text x="${(rx+rw/2).toFixed(1)}" y="${(ry-3).toFixed(1)}" font-size="9" fill="#f70" text-anchor="middle" font-family="system-ui" font-weight="600">${op.w.toFixed(1)}W × ${op.h.toFixed(1)}D${cntLabel}</text>`;
        html += oeResizeHandles(rx, ry, rw, dispH, i, 'awning');
      }

    } else if (op.type === 'balcony') {
      // ---- Balcony ----
      const rh = op.h * s;
      const { W: wallW } = oeGetWallDims(oeWall);
      const touchL = (op.x) <= BALCONY_TOUCH_MARGIN;
      const touchR = (op.x + op.w) >= (wallW - BALCONY_TOUCH_MARGIN);
      const isInt  = op.balconyType === 'internal';
      const isLSh  = isInt && (touchL || touchR);
      const fill   = isInt ? '#5a7a8e' : '#e8d5a0';
      const stroke = isSel ? '#f70' : (isInt ? '#3a5a6e' : '#b08830');
      const sw = isSel ? 2.5 : 1.5;
      html += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" data-oe-idx="${i}"/>`;
      // Pattern — diagonal hatch for internal, grid for external
      if (isInt) {
        const sp = 5 * s;
        for (let lx = rx - rh; lx < rx + rw + sp; lx += sp) {
          const x1 = Math.max(rx, lx), y1 = ry + (lx >= rx ? 0 : rx - lx);
          const x2 = Math.min(rx + rw, lx + rh), y2 = ry + (lx + rh <= rx + rw ? rh : rw - (lx - rx));
          if (x1 < x2) html += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="rgba(0,0,0,0.18)" stroke-width="0.7" pointer-events="none"/>`;
        }
      } else {
        const gsp = 5 * s;
        for (let gx = rx + gsp; gx < rx + rw; gx += gsp)
          html += `<line x1="${gx.toFixed(1)}" y1="${ry}" x2="${gx.toFixed(1)}" y2="${(ry+rh).toFixed(1)}" stroke="rgba(0,0,0,0.12)" stroke-width="0.6" pointer-events="none"/>`;
        for (let gy = ry + gsp; gy < ry + rh; gy += gsp)
          html += `<line x1="${rx}" y1="${gy.toFixed(1)}" x2="${(rx+rw).toFixed(1)}" y2="${gy.toFixed(1)}" stroke="rgba(0,0,0,0.12)" stroke-width="0.6" pointer-events="none"/>`;
      }
      // L-shape side indicators
      if (touchL) html += `<rect x="${rx}" y="${ry+rh*0.15}" width="${3*s}" height="${rh*0.7}" fill="rgba(255,140,0,0.55)" rx="1" pointer-events="none"/>`;
      if (touchR) html += `<rect x="${rx+rw-3*s}" y="${ry+rh*0.15}" width="${3*s}" height="${rh*0.7}" fill="rgba(255,140,0,0.55)" rx="1" pointer-events="none"/>`;
      // Centre labels
      if (rw > 18 && rh > 8) {
        const lc = isInt ? '#fff' : '#6a4800';
        html += `<text x="${(rx+rw/2).toFixed(1)}" y="${(ry+rh*0.55).toFixed(1)}" font-size="7" fill="${lc}" text-anchor="middle" font-family="system-ui" font-weight="600" pointer-events="none">${isInt?'↓':'↗'}${op.d.toFixed(0)}mm</text>`;
        if (isLSh) html += `<text x="${(rx+rw/2).toFixed(1)}" y="${(ry+rh*0.78).toFixed(1)}" font-size="6" fill="${lc}" text-anchor="middle" font-family="system-ui" opacity="0.8" pointer-events="none">L-shape</text>`;
      }
      if (isPrimary) {
        const cntLabel = oeSelectedSet.size > 1 ? ` [${oeSelectedSet.size}]` : '';
        html += `<text x="${(rx+rw/2).toFixed(1)}" y="${(ry-3).toFixed(1)}" font-size="9" fill="#f70" text-anchor="middle" font-family="system-ui" font-weight="600">${op.balconyType} ${op.w.toFixed(0)}×${op.d.toFixed(0)}×${op.h.toFixed(0)}${cntLabel}</text>`;
        html += oeResizeHandles(rx, ry, rw, rh, i, 'balcony');
      }

    } else if (op.type === 'fixture') {
      // ---- Surface fixture (vent / meter / sign / lantern / etc.) ----
      // Rendered via the shared `buildFixtureSvgBody` helper so the toolbox
      // icon, editor preview, and laser-cut piece all stay in lock-step.
      const styleSpec = FIXTURE_STYLES[op.style];
      const firstPiece = styleSpec && styleSpec.pieces && styleSpec.pieces[0];
      const styleFrame = (firstPiece && firstPiece.frameColor) || '#3a3a34';
      const rh = op.h * s;
      const stroke = isSel ? '#f70' : styleFrame;
      const sw = isSel ? 2.5 : 1.0;
      // Click target — transparent fill; visual fill comes from the body SVG.
      // Pass-through/cutout holes can be extremely small, so give them a
      // larger invisible editor-only hit box. The actual visible/cut geometry
      // remains op.w × op.h.
      if (oeIsCutoutFixture(op)) {
        const hb = oeFixtureHitBounds(op);
        const hx = ox + oeMirrorX(hb.x0, hb.x1 - hb.x0) * s;
        const hy = oy + hb.y0 * s;
        const hw = (hb.x1 - hb.x0) * s;
        const hh = (hb.y1 - hb.y0) * s;
        html += `<rect x="${hx.toFixed(1)}" y="${hy.toFixed(1)}" width="${hw.toFixed(1)}" height="${hh.toFixed(1)}" fill="transparent" stroke="none" data-oe-idx="${i}" style="cursor:move"/>`;
      }
      html += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="transparent" stroke="${stroke}" stroke-width="${sw}" data-oe-idx="${i}" style="cursor:move"/>`;
      if (styleSpec && rw > 3 && rh > 3) {
        const scaleX = rw / op.w;
        const scaleY = rh / op.h;
        const body = buildFixtureSvgBody(styleSpec, op.w, op.h, {
          strokeWidth: 0.18, thickStrokeWidth: 0.3,
        });
        // Visually indicate "this projects from the wall" for layered tiers
        // by a subtle drop-shadow filter using SVG's built-in feDropShadow.
        // Flush placements (etched or cutout) skip the filter entirely —
        // etched markings are flat, and cutouts are holes (no projection).
        const tier = styleSpec.depthTier;
        const isFlat = (tier === 'flush') ||
                       styleSpec.placement === 'etched' ||
                       styleSpec.placement === 'cutout';
        const shadowOffset  = isFlat ? 0 : (tier === 'deep') ? 1.5 : (tier === 'medium') ? 1.0 : 0.5;
        const shadowOpacity = isFlat ? 0 : (tier === 'deep') ? 0.30 : (tier === 'medium') ? 0.22 : 0.14;
        const filterAttr    = isFlat ? '' : ` filter="drop-shadow(${shadowOffset} ${shadowOffset} 0.6 rgba(0,0,0,${shadowOpacity}))"`;
        html += `<g transform="translate(${rx.toFixed(1)} ${ry.toFixed(1)}) scale(${scaleX.toFixed(3)} ${scaleY.toFixed(3)})" pointer-events="none"${filterAttr}>${body}</g>`;
      } else {
        // Fallback: small grey rect with style label
        const fallbackFill = (firstPiece && firstPiece.panelFill) || '#bdbdb5';
        html += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${fallbackFill}" pointer-events="none"/>`;
      }
      if (isPrimary) {
        const cntLabel = oeSelectedSet.size > 1 ? ` [${oeSelectedSet.size}]` : '';
        const tierTag  = styleSpec && styleSpec.depthTier ? ` · ${styleSpec.depthTier}` : '';
        html += `<text x="${(rx+rw/2).toFixed(1)}" y="${(ry-3).toFixed(1)}" font-size="9" fill="#f70" text-anchor="middle" font-family="system-ui" font-weight="600">${op.w.toFixed(1)}×${op.h.toFixed(1)}${tierTag}${cntLabel}</text>`;
        // Full-height fixtures (e.g. downspout) auto-size to the wall and
        // have a very thin footprint, so corner resize handles would cover
        // the entire click area and prevent the user from grabbing the body
        // to drag the fixture left/right. Skip the handles in that case —
        // width is set via the toolbox card and height is determined by
        // the wall, leaving nothing useful to resize after placement.
        if (!(styleSpec && (styleSpec.fullHeight || styleSpec.placement === 'cutout'))) {
          html += oeResizeHandles(rx, ry, rw, rh, i, 'fixture');
        }
      }

    } else if (op.type === 'printed_item') {
      // ---- Printed item (printed sheet, not laser-cut) ----
      // Renders the full-colour artwork on the wall via buildPrintedSvgBody
      // — same source of truth as the toolbox card and the printed sheet
      // output. Bordered with a thin purple stroke so it reads as "printed,
      // not cut" at a glance.
      const styleSpec = PRINTED_STYLES[op.style];
      const rh = op.h * s;
      const stroke = isSel ? '#f70' : '#6a3a8a';
      const sw = isSel ? 2.5 : 0.8;
      html += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="transparent" stroke="${stroke}" stroke-width="${sw}" stroke-dasharray="${isSel ? '' : '2 1.5'}" data-oe-idx="${i}"/>`;
      if (styleSpec && rw > 4 && rh > 4) {
        const scaleX = rw / op.w, scaleY = rh / op.h;
        const body = buildPrintedSvgBody(styleSpec, op.w, op.h);
        html += `<g transform="translate(${rx.toFixed(1)} ${ry.toFixed(1)}) scale(${scaleX.toFixed(3)} ${scaleY.toFixed(3)})" pointer-events="none">${body}</g>`;
      }
      if (isPrimary) {
        const cntLabel = oeSelectedSet.size > 1 ? ` [${oeSelectedSet.size}]` : '';
        const styleLbl = styleSpec ? styleSpec.label : op.style;
        html += `<text x="${(rx+rw/2).toFixed(1)}" y="${(ry-3).toFixed(1)}" font-size="9" fill="#f70" text-anchor="middle" font-family="system-ui" font-weight="600">${styleLbl} ${op.w.toFixed(1)}×${op.h.toFixed(1)} · printed${cntLabel}</text>`;
        html += oeResizeHandles(rx, ry, rw, rh, i, 'printed_item');
      }

    } else {
      // ---- Window or door ----
      const isWin = op.type === 'window';
      const rh = op.h*s;
      if (isWin) {
        // Window — render style-specific pane background + lattice / mullion
        // pattern using the same data the toolbox card uses. Falls back to
        // the global CONFIG.windowStyle when an older op didn't store its
        // own style (e.g. windows placed before per-op style support).
        const styleKey = op.style || CONFIG.windowStyle;
        const styleSpec = WINDOW_STYLES[styleKey] || null;
        const stroke = isSel ? '#f70' : ((styleSpec && styleSpec.frameColor) || '#2a64aa');
        const sw = isSel ? 2.5 : 1.2;
        // Selection rectangle (transparent fill — actual fill comes from the
        // SVG body that follows). Kept as the click target.
        html += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="rgba(255,255,255,0.001)" stroke="${stroke}" stroke-width="${sw}" data-oe-idx="${i}" pointer-events="all" style="cursor:move"/>`;
        if (styleSpec && rw > 4 && rh > 3) {
          const scaleX = rw / op.w;   // px/mm in displayed window
          const scaleY = rh / op.h;
          const body = buildWindowSvgBody(styleSpec, op.w, op.h, { strokeWidth: 0.35 });
          html += `<g transform="translate(${rx.toFixed(1)} ${ry.toFixed(1)}) scale(${scaleX.toFixed(3)} ${scaleY.toFixed(3)})" pointer-events="none">${body}</g>`;
        } else {
          // Fallback: solid pane with single mullion hint
          const fallbackFill = (styleSpec && styleSpec.paneFill) || 'rgba(160,205,245,0.85)';
          html += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${fallbackFill}" pointer-events="none"/>`;
          if (rw > 6 && rh > 4) {
            html += `<line x1="${rx+rw/2}" y1="${ry+1}" x2="${rx+rw/2}" y2="${ry+rh-1}" stroke="${stroke}" stroke-width="0.5" opacity="0.4" pointer-events="none"/>`;
          }
        }
        // Shutters — pair of decorative panels flanking the window. Sized
        // by SHUTTER_W_RATIO of the window width; full window height.
        // Rendered with a subtle drop-shadow to hint they project slightly.
        if (op.hasShutters) {
          const shutterStyle = SHUTTER_STYLES[op.shutterStyle || 'louvered'];
          if (shutterStyle) {
            const shW = Math.max(2, op.w * SHUTTER_W_RATIO);
            const shH = op.h;
            const shWpx = shW * s;
            const shHpx = shH * s;
            const shBody = buildShutterSvgBody(shutterStyle, shW, shH, { strokeWidth: 0.18 });
            const sScaleX = shWpx / shW, sScaleY = shHpx / shH;
            // Left shutter
            const lx = rx - shWpx;
            html += `<g transform="translate(${lx.toFixed(1)} ${ry.toFixed(1)}) scale(${sScaleX.toFixed(3)} ${sScaleY.toFixed(3)})" pointer-events="none" filter="drop-shadow(0.5 0.5 0.6 rgba(0,0,0,0.18))">${shBody}</g>`;
            // Right shutter
            const rrx = rx + rw;
            html += `<g transform="translate(${rrx.toFixed(1)} ${ry.toFixed(1)}) scale(${sScaleX.toFixed(3)} ${sScaleY.toFixed(3)})" pointer-events="none" filter="drop-shadow(0.5 0.5 0.6 rgba(0,0,0,0.18))">${shBody}</g>`;
          }
        }
      } else {
        // Door — render style-specific glass apertures and engraved features
        // via the shared `buildDoorSvgBody` helper so the toolbox icon and
        // on-wall preview stay in lock-step.
        const styleSpec = DOOR_STYLES[op.style || CONFIG.doorStyle];
        const styleFrame = (styleSpec && styleSpec.frameColor) || '#c84a3a';
        const stroke = isSel ? '#f70' : styleFrame;
        const sw = isSel ? 2.5 : 1.2;
        // Click target — transparent fill since the visual fill comes from
        // the SVG body that follows. The selection-ring stroke stays here.
        html += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="transparent" stroke="${stroke}" stroke-width="${sw}" data-oe-idx="${i}"/>`;
        if (styleSpec && rw > 4 && rh > 6) {
          const scaleX = rw / op.w;   // px/mm in displayed door
          const scaleY = rh / op.h;
          const body = buildDoorSvgBody(styleSpec, op.w, op.h, {
            strokeWidth: 0.3, thickStrokeWidth: 0.4, glassStrokeWidth: 0.6,
          });
          html += `<g transform="translate(${rx.toFixed(1)} ${ry.toFixed(1)}) scale(${scaleX.toFixed(3)} ${scaleY.toFixed(3)})" pointer-events="none">${body}</g>`;
        } else if (rw > 6 && rh > 4) {
          // Fallback (no style or door too small): solid panel + cross hint
          const fallbackFill = (styleSpec && styleSpec.panelFill) || 'rgba(245,185,130,0.85)';
          html += `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${fallbackFill}" pointer-events="none"/>`;
          html += `<line x1="${rx+rw/2}" y1="${ry+1}" x2="${rx+rw/2}" y2="${ry+rh-1}" stroke="${stroke}" stroke-width="0.5" opacity="0.4" pointer-events="none"/>`;
          html += `<line x1="${rx+1}" y1="${ry+rh*0.55}" x2="${rx+rw-1}" y2="${ry+rh*0.55}" stroke="${stroke}" stroke-width="0.5" opacity="0.4" pointer-events="none"/>`;
        }
      }
      if (isPrimary) {
        const bandIdx  = oeYToBand(bands, op.y + op.h / 2);
        const bandLabel = bandIdx >= 0 ? ` · floor ${bands.length - bandIdx}` : '';
        const cntLabel  = oeSelectedSet.size > 1 ? ` [${oeSelectedSet.size} sel]` : '';
        html += `<text x="${rx+rw/2}" y="${ry-3}" font-size="9" fill="#f70" text-anchor="middle" font-family="system-ui" font-weight="600">${op.w.toFixed(1)}×${op.h.toFixed(1)}${bandLabel}${cntLabel}</text>`;
        html += oeResizeHandles(rx, ry, rw, rh, i, op.type);
        if (bandIdx >= 0) {
          const b = bands[bandIdx];
          html += `<rect x="${ox}" y="${oy+b.yTop*s}" width="${W*s}" height="${(b.yBottom-b.yTop)*s}" fill="none" stroke="#f70" stroke-width="1" stroke-dasharray="4 3" opacity="0.6" pointer-events="none"/>`;
        }
      }
    }
  }

  // Rubber-band selection rect
  if (_oeRubberBand) {
    const rb = _oeRubberBand;
    const rbx = ox + Math.min(rb.x0, rb.x1)*s, rby = oy + Math.min(rb.y0, rb.y1)*s;
    const rbw = Math.abs(rb.x1 - rb.x0)*s,     rbh = Math.abs(rb.y1 - rb.y0)*s;
    html += `<rect x="${rbx}" y="${rby}" width="${rbw}" height="${rbh}" fill="rgba(247,160,0,0.08)" stroke="#f70" stroke-width="1" stroke-dasharray="4 3" pointer-events="none"/>`;
  }

  svg.innerHTML = html;
  // Let iPad/finger gestures scroll the editor canvas by default. Active
  // object drags temporarily opt into touch-action:none in oeCanvasPointerDownImpl.
  svg.style.touchAction = 'pan-x pan-y';
  svg.style.webkitUserSelect = 'none';
  svg.style.userSelect = 'none';
  if (window.PointerEvent) {
    svg.onpointerdown = oeCanvasPointerDownImpl;
    svg.onmousedown = null;
  } else {
    svg.onpointerdown = null;
    svg.onmousedown = oeMouseDown;
  }
  svg.onclick = oeClick;
  svg.onwheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1/1.12;
    oeZoom = Math.max(0.3, Math.min(4, oeZoom * factor));
    const lbl = document.getElementById('oeZoomLabel');
    if (lbl) lbl.textContent = Math.round(oeZoom * 100) + '%';
    oeRender();
  };
  const lbl = document.getElementById('oeZoomLabel');
  if (lbl) lbl.textContent = Math.round(oeZoom * 100) + '%';
  document.removeEventListener('keydown', oeKeyDown);
  document.addEventListener('keydown', oeKeyDown);
  document.removeEventListener('keyup', oeKeyUp);
  document.addEventListener('keyup', oeKeyUp);
  // Suppress context-menu / auxclick when the user middle-clicks for a
  // pan so the OS autoscroll / paste affordance doesn't pop up.
  svg.oncontextmenu = e => { if (oePanning) e.preventDefault(); };
  svg.onauxclick    = e => { if (e.button === 1) e.preventDefault(); };
  oePopulateTopbar();
  oeRenderFootprintMap();
}

export function oeKeyUp(e) {
  editorHandleCommonKeyUp(e, {
    modalId: 'openingEditorModal',
    pan: {
      setDown: v => { oeSpaceDown = v; },
      isPanning: () => oePanning,
      cursorEl: () => document.getElementById('openingEditorSvg'),
    },
  });
}

/* ---- Building footprint mini-map (static element in the footer) ---- */
/**
 * Render the building footprint into the given SVG element. Used by both
 * the wall editor (which passes a highlightWall so the active face glows
 * orange) and the floor / roof editor (which passes null since neither
 * has a single "active wall" to highlight). The function fills the
 * supplied SVG's innerHTML and sets its width/height; both editors place
 * a separate <svg> element in their canvas corner so they have their
 * own independent maps without sharing DOM.
 *
 * Cardinal labels (N/S/E/W) are placed outside the rectangle on each
 * side. Top = N, bottom = S — matching the wall editor's existing
 * convention so the orientation reads the same everywhere.
 *
 * @param svgEl         the target <svg> element
 * @param highlightWall 'front' | 'back' | 'east' | 'west' | null
 */
export function renderBuildingFootprintMap(svgEl, highlightWall) {
  if (!svgEl) return;

  const FP_W = 120, FP_H = 96, FP_PAD = 10;
  const mainW = CONFIG.width || 80, mainD = CONFIG.depth || 60;
  const wings = CONFIG.wings || [];

  // Compute bounding box over main block + all wings
  let minX = 0, maxX = mainW, minY = 0, maxY = mainD;
  for (const wing of wings) {
    const wS = wing.span || 30, wD = wing.depth || 20, off = wing.offset || 0;
    if      (wing.face === 'east')  { maxX = Math.max(maxX, mainW + wD); minY = Math.min(minY, off); maxY = Math.max(maxY, off + wS); }
    else if (wing.face === 'west')  { minX = Math.min(minX, -wD);        minY = Math.min(minY, off); maxY = Math.max(maxY, off + wS); }
    else if (wing.face === 'front') { maxY = Math.max(maxY, mainD + wD); minX = Math.min(minX, off); maxX = Math.max(maxX, off + wS); }
    else                            { minY = Math.min(minY, -wD);        minX = Math.min(minX, off); maxX = Math.max(maxX, off + wS); }
  }

  const bW = maxX - minX, bH = maxY - minY;
  const fp_s  = Math.min((FP_W - 2*FP_PAD) / bW, (FP_H - 2*FP_PAD) / bH) * 0.85;
  const fp_ox = FP_PAD + (FP_W - 2*FP_PAD - bW*fp_s)/2 - minX*fp_s;
  const fp_oy = FP_PAD + (FP_H - 2*FP_PAD - bH*fp_s)/2 - minY*fp_s;

  const edgeHighlight = {
    front: [[fp_ox,             fp_oy,            fp_ox+mainW*fp_s, fp_oy           ]],
    back:  [[fp_ox,             fp_oy+mainD*fp_s, fp_ox+mainW*fp_s, fp_oy+mainD*fp_s]],
    east:  [[fp_ox+mainW*fp_s,  fp_oy,            fp_ox+mainW*fp_s, fp_oy+mainD*fp_s]],
    west:  [[fp_ox,             fp_oy,            fp_ox,            fp_oy+mainD*fp_s]],
  };

  let html = '';

  // Wings (drawn first so main block sits on top)
  for (const wing of wings) {
    let wx, wy, ww, wh;
    const wS = wing.span || 30, wD = wing.depth || 20, off = wing.offset || 0;
    if      (wing.face === 'east')  { wx = mainW;  wy = off; ww = wD; wh = wS; }
    else if (wing.face === 'west')  { wx = -wD;    wy = off; ww = wD; wh = wS; }
    else if (wing.face === 'front') { wx = off;    wy = -wD;   ww = wS; wh = wD; }
    else                            { wx = off;    wy = mainD; ww = wS; wh = wD; }
    html += `<rect x="${(fp_ox+wx*fp_s).toFixed(1)}" y="${(fp_oy+wy*fp_s).toFixed(1)}" `
          + `width="${(ww*fp_s).toFixed(1)}" height="${(wh*fp_s).toFixed(1)}" `
          + `fill="#d4c8b8" stroke="#aaa" stroke-width="0.8"/>`;
  }

  // Main block
  html += `<rect x="${fp_ox.toFixed(1)}" y="${fp_oy.toFixed(1)}" `
        + `width="${(mainW*fp_s).toFixed(1)}" height="${(mainD*fp_s).toFixed(1)}" `
        + `fill="#c8bfb0" stroke="#888" stroke-width="1"/>`;

  // Active wall highlight (only when a wall is being edited)
  if (highlightWall) {
    for (const [x1,y1,x2,y2] of (edgeHighlight[highlightWall] || [])) {
      html += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" `
            + `stroke="#f70" stroke-width="3" stroke-linecap="round"/>`;
    }
  }

  // Cardinal compass labels
  const cx = fp_ox + mainW*fp_s/2, cy = fp_oy + mainD*fp_s/2;
  html += `<text x="${cx.toFixed(1)}"             y="${(fp_oy+mainD*fp_s+9).toFixed(1)}" font-size="7" fill="#999" text-anchor="middle"  font-family="system-ui">S</text>`;
  html += `<text x="${cx.toFixed(1)}"             y="${(fp_oy-3).toFixed(1)}"             font-size="7" fill="#999" text-anchor="middle"  font-family="system-ui">N</text>`;
  html += `<text x="${(fp_ox+mainW*fp_s+8).toFixed(1)}" y="${(cy+3).toFixed(1)}"          font-size="7" fill="#999"                       font-family="system-ui">E</text>`;
  html += `<text x="${(fp_ox-8).toFixed(1)}"      y="${(cy+3).toFixed(1)}"                font-size="7" fill="#999" text-anchor="end"     font-family="system-ui">W</text>`;

  svgEl.setAttribute('width',  FP_W);
  svgEl.setAttribute('height', FP_H);
  svgEl.innerHTML = html;
}


export function layoutReferencePhysicalOffset(face, edgeLen, pos, span) {
  const len = Math.max(0, Number(edgeLen) || 0);
  const p = Math.max(0, Number(pos) || 0);
  const s = Math.max(0, Number(span) || 0);
  const maxStart = Math.max(0, len - s);

  // Top-down layout reference uses screen/site coordinates:
  //   north/back = top, south/front = bottom, east = right, west = left.
  // The back wall must be mirrored because its wall-local left-to-right axis is
  // opposite the front wall. Side-wall local positions already run north→south
  // for the reference map, so mirroring east here made east-wall objects appear
  // backwards along the side of the building.
  if (face === 'back') return Math.max(0, Math.min(maxStart, len - p - s));
  return Math.max(0, Math.min(maxStart, p));
}

export function collectLayoutReferenceOpeningsForBlock(blockCfg, blockPlan, bounds) {
  const out = [];
  if (!blockCfg || !blockPlan || !bounds) return out;
  const markerByType = { window: 3.2, door: 4.0, bay: 5.2 };
  for (const face of ['front', 'back', 'east', 'west']) {
    const edgeLen = (face === 'front' || face === 'back') ? bounds.w : bounds.d;
    const ops = get3DWallOpenings(blockCfg, blockPlan, face)
      .filter(op => op && (op.type === 'window' || op.type === 'door' || op.type === 'bay'));
    for (const op of ops) {
      const span = Math.max(0, Number(op.w) || 0);
      const along = layoutReferencePhysicalOffset(face, edgeLen, op.x, span);
      const m = markerByType[op.type] || 3.2;
      let x = 0, y = 0, w = 0, h = 0;
      if (face === 'front') {
        x = bounds.x + along; y = bounds.y - m; w = span; h = m;
      } else if (face === 'back') {
        x = bounds.x + along; y = bounds.y + bounds.d; w = span; h = m;
      } else if (face === 'east') {
        x = bounds.x + bounds.w; y = bounds.y + along; w = m; h = span;
      } else {
        x = bounds.x - m; y = bounds.y + along; w = m; h = span;
      }
      out.push({ type: op.type, x, y, w, h, face });
    }
  }
  return out;
}

function layoutReferenceRectPolygon(bounds) {
  return [
    { x: bounds.x, y: bounds.y },
    { x: bounds.x + bounds.w, y: bounds.y },
    { x: bounds.x + bounds.w, y: bounds.y + bounds.d },
    { x: bounds.x, y: bounds.y + bounds.d },
  ];
}

function layoutReferenceClippedPolygon(bounds, rootCfg) {
  const poly = layoutReferenceRectPolygon(bounds);
  if (!layoutCutsActive(rootCfg)) return poly;
  const clipped = clipPolygonByLayoutCuts(poly, rootCfg.layoutCuts, rootCfg);
  return clipped && clipped.length >= 3 ? clipped : poly;
}

function layoutReferencePolygonBounds(poly) {
  const xs = (poly || []).map(p => p.x);
  const ys = (poly || []).map(p => p.y);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

function layoutReferencePolygonCenter(poly, fallback) {
  if (!poly || !poly.length) return { x: fallback.x + fallback.w / 2, y: fallback.y + fallback.d / 2 };
  return poly.reduce((acc, p) => ({ x: acc.x + p.x / poly.length, y: acc.y + p.y / poly.length }), { x: 0, y: 0 });
}

function layoutReferencePointInPolygon(point, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (((a.y > point.y) !== (b.y > point.y)) && point.x < (b.x - a.x) * (point.y - a.y) / ((b.y - a.y) || 1e-9) + a.x) inside = !inside;
  }
  return inside;
}

function layoutReferenceOpeningProbe(op) {
  if (op.face === 'front') return { x: op.x + op.w / 2, y: op.y + op.h + 0.1 };
  if (op.face === 'back') return { x: op.x + op.w / 2, y: op.y - 0.1 };
  if (op.face === 'east') return { x: op.x - 0.1, y: op.y + op.h / 2 };
  return { x: op.x + op.w + 0.1, y: op.y + op.h / 2 };
}

function layoutReferenceOpeningRetained(op, poly) {
  return !poly || poly.length < 3 || layoutReferencePointInPolygon(layoutReferenceOpeningProbe(op), poly);
}

export function generateBuildingLayoutReferencePart(cfg, mainPlan) {
  if (!cfg) return null;
  ensurePrintedMaterialDefinition(cfg);
  const blocks = [];
  const rootPlan = mainPlan || buildEdgePlans(cfg);
  blocks.push({
    label: 'Main',
    bounds: { x: 0, y: 0, w: Number(cfg.width) || 80, d: Number(cfg.depth) || 60 },
    cfg,
    plan: rootPlan,
    isMain: true,
  });

  for (let i = 0; i < (cfg.wings || []).length; i++) {
    const wing = cfg.wings[i];
    if (!wing) continue;
    const wingCfg = buildWingCfg(cfg, wing);
    const wingPlan = buildEdgePlans(wingCfg);
    const b = weWingBounds(cfg, wing);
    blocks.push({
      label: `Wing ${i + 1}`,
      bounds: { x: b.x, y: b.y, w: b.w, d: b.d },
      cfg: wingCfg,
      plan: wingPlan,
      isMain: false,
    });
  }

  for (const block of blocks) {
    block.poly = layoutReferenceClippedPolygon(block.bounds, cfg);
  }

  const openings = [];
  for (const block of blocks) {
    openings.push(...collectLayoutReferenceOpeningsForBlock(block.cfg, block.plan, block.bounds)
      .filter(op => layoutReferenceOpeningRetained(op, block.poly)));
  }

  const polyBounds = blocks.map(b => layoutReferencePolygonBounds(b.poly || layoutReferenceRectPolygon(b.bounds)));
  let minX = Math.min(...polyBounds.map(b => b.minX), 0);
  let minY = Math.min(...polyBounds.map(b => b.minY), 0);
  let maxX = Math.max(...polyBounds.map(b => b.maxX), Number(cfg.width) || 80);
  let maxY = Math.max(...polyBounds.map(b => b.maxY), Number(cfg.depth) || 60);
  for (const op of openings) {
    minX = Math.min(minX, op.x);
    minY = Math.min(minY, op.y);
    maxX = Math.max(maxX, op.x + op.w);
    maxY = Math.max(maxY, op.y + op.h);
  }

  const PAD = 10;
  const TITLE_H = 11;
  const LEGEND_H = 12;
  const bodyW = Math.max(20, maxX - minX);
  const bodyH = Math.max(20, maxY - minY);
  const canvasW = bodyW + PAD * 2;
  const canvasH = bodyH + PAD * 2 + TITLE_H + LEGEND_H;
  const ox = PAD - minX;
  const oy = PAD + TITLE_H - minY;

  const colors = {
    mainFill: '#dfd4c1',
    wingFill: '#eee4d3',
    outline: '#4a4038',
    window: '#71b6ff',
    door: '#f0a14a',
    bay: '#7a5cf0',
    text: '#3b332d',
    helper: '#7a6d63',
  };

  let body = '';
  body += `<rect x="0" y="0" width="${canvasW.toFixed(3)}" height="${canvasH.toFixed(3)}" fill="#ffffff"/>`;
  body += `<text x="${(canvasW/2).toFixed(3)}" y="8.5" text-anchor="middle" font-family="system-ui" font-size="5.0" font-weight="700" fill="${colors.text}">Building layout reference</text>`;
  body += `<text x="${(canvasW/2).toFixed(3)}" y="13.0" text-anchor="middle" font-family="system-ui" font-size="2.6" fill="${colors.helper}">Footprint with window / door / bay positions</text>`;

  for (const block of blocks) {
    const poly = block.poly || layoutReferenceRectPolygon(block.bounds);
    const pts = poly.map(p => `${(ox + p.x).toFixed(3)},${(oy + p.y).toFixed(3)}`).join(' ');
    const center = layoutReferencePolygonCenter(poly, block.bounds);
    body += `<polygon points="${pts}" fill="${block.isMain ? colors.mainFill : colors.wingFill}" stroke="${colors.outline}" stroke-width="0.35"/>`;
    body += `<text x="${(ox + center.x).toFixed(3)}" y="${(oy + center.y + 1.2).toFixed(3)}" text-anchor="middle" font-family="system-ui" font-size="3.0" fill="${colors.helper}">${block.label}</text>`;
  }

  for (const op of openings) {
    const fill = colors[op.type] || colors.window;
    body += `<rect x="${(ox + op.x).toFixed(3)}" y="${(oy + op.y).toFixed(3)}" width="${op.w.toFixed(3)}" height="${op.h.toFixed(3)}" fill="${fill}" fill-opacity="0.92" stroke="#ffffff" stroke-width="0.18" rx="0.25" ry="0.25"/>`;
  }

  const bodyCx = ox + (minX + maxX) / 2;
  const bodyCy = oy + (minY + maxY) / 2;
  body += `<text x="${bodyCx.toFixed(3)}" y="${(oy + minY - 3.2).toFixed(3)}" text-anchor="middle" font-family="system-ui" font-size="3.2" fill="${colors.helper}">N</text>`;
  body += `<text x="${bodyCx.toFixed(3)}" y="${(oy + maxY + 6.4).toFixed(3)}" text-anchor="middle" font-family="system-ui" font-size="3.2" fill="${colors.helper}">S</text>`;
  body += `<text x="${(ox + maxX + 3.8).toFixed(3)}" y="${(bodyCy + 1.1).toFixed(3)}" text-anchor="middle" font-family="system-ui" font-size="3.2" fill="${colors.helper}">E</text>`;
  body += `<text x="${(ox + minX - 3.8).toFixed(3)}" y="${(bodyCy + 1.1).toFixed(3)}" text-anchor="middle" font-family="system-ui" font-size="3.2" fill="${colors.helper}">W</text>`;

  const legendY = canvasH - 5.2;
  const legendItems = [
    { label: 'Window', color: colors.window },
    { label: 'Door', color: colors.door },
    { label: 'Bay', color: colors.bay },
  ];
  let lx = 9;
  for (const item of legendItems) {
    body += `<rect x="${lx.toFixed(3)}" y="${(legendY - 2.6).toFixed(3)}" width="4.0" height="2.6" fill="${item.color}" stroke="#ffffff" stroke-width="0.18" rx="0.25" ry="0.25"/>`;
    body += `<text x="${(lx + 5.6).toFixed(3)}" y="${legendY.toFixed(3)}" font-family="system-ui" font-size="2.8" fill="${colors.text}">${item.label}</text>`;
    lx += 18;
  }

  return normalizePartMetadata({
    id: 'building_layout_reference',
    name: 'Building layout reference print',
    material: 'printed',
    bboxW: canvasW,
    bboxH: canvasH,
    bboxOffsetX: 0,
    bboxOffsetY: 0,
    paths: [],
    rects: [],
    lines: [],
    svgContent: body,
    assemblyNote: 'Print at 100% for a flat reference showing the overall building footprint and the placement of windows, doors, and bay openings.',
    meta: { scope: 'main', area: 'general', role: 'printed_detail' },
  });
}

export function oeRenderFootprintMap() {
  renderBuildingFootprintMap(document.getElementById('oeFootprintSvg'), oeWall);
}



/* ---- iPad / Apple Pencil pointer support ----
 * The original editor was mouse-only: mousedown created document-level
 * mousemove/mouseup drags. iPadOS/Safari and Apple Pencil deliver Pointer
 * Events instead, so active drags are now bound through this small adapter.
 * Mouse behavior remains unchanged as a fallback on older browsers.
 */
export function oeIsTouchLikeEditor() {
  return oeLastPointerType === 'touch' || oeLastPointerType === 'pen' ||
         (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
}

export function oeBeginDocumentDrag(sourceEvent, onMove, onUp, options = {}) {
  const usePointer = !!(sourceEvent && sourceEvent.type && sourceEvent.type.indexOf('pointer') === 0 && window.PointerEvent);
  const capture = !!options.capture;
  let cleaned = false;

  function cleanup() {
    if (cleaned) return;
    cleaned = true;
    if (usePointer) {
      document.removeEventListener('pointermove', move, capture);
      document.removeEventListener('pointerup', up, capture);
      document.removeEventListener('pointercancel', up, capture);
      const svg = document.getElementById('openingEditorSvg');
      try { if (svg) svg.style.touchAction = 'pan-x pan-y'; } catch (err) {}
      try { if (svg && sourceEvent.pointerId != null) svg.releasePointerCapture(sourceEvent.pointerId); } catch (err) {}
    } else {
      document.removeEventListener('mousemove', move, capture);
      document.removeEventListener('mouseup', up, capture);
    }
  }

  function move(ev) {
    if (usePointer && sourceEvent.pointerId != null && ev.pointerId !== sourceEvent.pointerId) return;
    if (ev.cancelable) ev.preventDefault();
    onMove(ev);
  }

  function up(ev) {
    if (usePointer && sourceEvent.pointerId != null && ev.pointerId !== sourceEvent.pointerId) return;
    if (ev && ev.cancelable) ev.preventDefault();
    cleanup();
    onUp(ev || sourceEvent);
  }

  if (usePointer) {
    const svg = document.getElementById('openingEditorSvg');
    try { if (svg && sourceEvent.pointerId != null) svg.setPointerCapture(sourceEvent.pointerId); } catch (err) {}
    document.addEventListener('pointermove', move, { capture, passive: false });
    document.addEventListener('pointerup', up, { capture, passive: false });
    document.addEventListener('pointercancel', up, { capture, passive: false });
  } else {
    document.addEventListener('mousemove', move, capture);
    document.addEventListener('mouseup', up, capture);
  }

  return cleanup;
}

export function oeTouchPointerShouldStartEditorGesture(e) {
  // Mouse and Apple Pencil should behave like the desktop editor. Finger touch
  // is different: it must be able to scroll the overflow canvas. We only steal
  // a finger gesture when it is clearly an editor gesture.
  if (!e || e.pointerType !== 'touch') return true;
  if (oeMobilePanMode) return true;

  const tgt = e.target;
  if (tgt && tgt.dataset && tgt.dataset.oeHandle && tgt.dataset.oeIdx != null) return true;

  const directIdx = oeEventTargetOpeningIndex(e);
  if (directIdx >= 0) return oeSelectedSet.has(directIdx);

  const pt = oeToMM(e);
  const hitIdx = oeHitTest(pt.x, pt.y);
  return hitIdx >= 0 && oeSelectedSet.has(hitIdx);
}

export function oeCanvasPointerDownImpl(e) {
  oeLastPointerType = e.pointerType || 'mouse';

  // Let one-finger touch scroll unless the gesture starts on a selected item
  // or a resize handle. Tapping an unselected item still selects it via the
  // normal click path; a second touch-drag moves it. This avoids the old iPad
  // behavior where every touch on the wall canvas captured the gesture and made
  // the editor almost impossible to scroll.
  if (e.pointerType === 'touch' && !oeTouchPointerShouldStartEditorGesture(e)) {
    return;
  }

  // On iPad, a hardware keyboard is not guaranteed. Pan mode provides the
  // equivalent of holding Space while dragging: useful when zoomed in and
  // editing with Pencil or a finger.
  const previousSpaceDown = oeSpaceDown;
  if (oeMobilePanMode) oeSpaceDown = true;

  // Prevent page scrolling / text selection only after we've decided this is
  // an editor gesture. Empty-canvas finger drags are allowed to bubble to the
  // scroll container.
  if ((e.pointerType === 'pen' || e.pointerType === 'touch') && e.cancelable) {
    e.preventDefault();
  }

  try {
    const svg = document.getElementById('openingEditorSvg');
    if (svg) svg.style.touchAction = 'none';
    if (svg && e.pointerId != null) svg.setPointerCapture(e.pointerId);
  } catch (err) {}

  try {
    oeMouseDown(e);
  } finally {
    oeSpaceDown = previousSpaceDown;
  }
}


/* ---- Hit test & coordinate conversion ---- */

/* Visual height of an opening in wall-editor coordinates.
   For awnings, op.h stores the DEPTH (projection) not the on-wall height. */
export function oeOpH(op) {
  return op.type === 'awning' ? AWNING_DISP_H : op.h;
}

export function oeIsCutoutFixture(op) {
  if (!op || op.type !== 'fixture') return false;
  const style = FIXTURE_STYLES[op.style];
  return !!(style && style.placement === 'cutout');
}

export function oeFixtureHitBounds(op) {
  const w = Number(op && op.w) || 0;
  const h = Number(op && op.h) || 0;
  let x0 = Number(op && op.x) || 0;
  let y0 = Number(op && op.y) || 0;
  let x1 = x0 + w;
  let y1 = y0 + h;

  // Tiny wall pass-throughs are often 1–3 mm wide, which makes them hard to
  // grab in the wall editor. This is only an editor hit target; it does not
  // change the actual SVG/cut geometry.
  const minHit = oeIsCutoutFixture(op) ? 7 : 2;
  if (op && op.type === 'fixture' && w < minHit) {
    const pad = (minHit - w) / 2;
    x0 -= pad;
    x1 += pad;
  }
  if (op && op.type === 'fixture' && h < minHit) {
    const pad = (minHit - h) / 2;
    y0 -= pad;
    y1 += pad;
  }
  return { x0, y0, x1, y1 };
}

export function oeEventTargetOpeningIndex(e) {
  const t = e && e.target;
  if (!t || typeof t.closest !== 'function') return -1;
  const el = t.closest('[data-oe-idx]');
  if (!el || el.dataset.oeIdx == null) return -1;
  const idx = parseInt(el.dataset.oeIdx, 10);
  const ops = oeOpenings[oeWall] || [];
  return (Number.isFinite(idx) && idx >= 0 && idx < ops.length) ? idx : -1;
}

export function oeCanvasHitTestImpl(mx, my) {
  const ops = oeOpenings[oeWall] || [];
  // First pass — non-override ops (windows/doors/fixtures/awnings/balconies)
  // hit first since they visually sit on top of cladding overrides.
  // For very thin fixtures (notably downspouts, where w can be < 1 mm) the
  // exact rect would be near-impossible to click on at typical zoom; pad
  // the hit area horizontally so the user can reliably grab the body.
  for (let i = ops.length - 1; i >= 0; i--) {
    const op = ops[i];
    if (op.type === 'cladding_override') continue;
    if (op.type === 'fixture') {
      const hb = oeFixtureHitBounds(op);
      if (mx >= hb.x0 && mx <= hb.x1 && my >= hb.y0 && my <= hb.y1) return i;
      continue;
    }
    const hitH = op.type === 'awning' ? AWNING_DISP_H : op.h;
    let hx0 = op.x, hx1 = op.x + op.w, hy0 = op.y, hy1 = op.y + hitH;
    if (op.type === 'window') {
      const ws = WINDOW_STYLES[op.style || CONFIG.windowStyle];
      if (ws && (ws.placement === 'blanked' || ws.placement === 'etched')) {
        // Blanked/faux windows are often just engraved outlines or dark fill
        // and can feel hard to grab. Pad only the editor hit target.
        const pad = 2;
        hx0 -= pad; hx1 += pad; hy0 -= pad; hy1 += pad;
      }
    }
    if (mx >= hx0 && mx <= hx1 && my >= hy0 && my <= hy1) return i;
  }
  // Second pass — cladding overrides (only hit when no feature is at this point)
  for (let i = ops.length - 1; i >= 0; i--) {
    const op = ops[i];
    if (op.type !== 'cladding_override') continue;
    if (mx >= op.x && mx <= op.x + op.w && my >= op.y && my <= op.y + op.h) return i;
  }
  return -1;
}

export function oeCanvasToMMImpl(e) {
  const svg = document.getElementById('openingEditorSvg');
  const r = svg.getBoundingClientRect();
  const PAD = 32;
  const rawX = (e.clientX - r.left  - PAD - oeWallLeftPx) / oeEditorScale;
  const y    = (e.clientY - r.top   - PAD - oeExtraTop)   / oeEditorScale;
  // East wall view is mirrored on screen vs storage convention (so the
  // observer-from-outside layout matches the footprint +N/+S labels). Apply
  // the inverse mirror here so the rest of the editor — hit-tests, drag
  // math, opening placement — keeps operating on stored (laser-panel) x.
  const x = (oeWall === 'east')
              ? oeGetWallDims(oeWall).W - rawX
              : rawX;
  return { x, y };
}

/* ---- Click (select / erase only — placement is drag-from-toolbox) ---- */

export let _oeDragMoved = false;

export function oeCanvasClickImpl(e) {
  if (_oeDragMoved) return;
  const { x, y } = oeToMM(e);
  const directIdx = oeEventTargetOpeningIndex(e);
  const hitIdx = directIdx >= 0 ? directIdx : oeHitTest(x, y);

  if (oeTool === 'erase') {
    if (hitIdx >= 0) {
      oeOpenings[oeWall].splice(hitIdx, 1);
      // Adjust selected indices above the removed one
      const next = new Set();
      for (const i of oeSelectedSet) { if (i < hitIdx) next.add(i); else if (i > hitIdx) next.add(i - 1); }
      oeSelectedSet = next;
      oeCommit(); oeRender();
    }
    return;
  }

  if (hitIdx >= 0) {
    if (e.shiftKey) {
      // Shift+click: toggle this item in the selection
      if (oeSelectedSet.has(hitIdx)) oeSelectedSet.delete(hitIdx);
      else oeSelectedSet.add(hitIdx);
    } else {
      // Plain click on an opening: replace selection with just this item
      oeSelectedSet = new Set([hitIdx]);
    }
  } else {
    // Click on empty space: clear selection (unless rubber-band just finished)
    oeSelectedSet.clear();
  }
  oeRender();
}

/* ---- Linked-bay helpers ----
 *
 * Through-bay placement creates twin entries on the front and back walls
 * (same local-X, same w/h, same style='through'). Any single edit needs to
 * be mirrored to the partner so the two stay in lock-step. These helpers
 * centralise that mirroring; the drag, resize, drop, and delete paths all
 * call them after a structural change. Side bays carry style='side' and
 * have no partner — the helpers short-circuit.
 */

/* Sync the through-bay partner on the opposing wall to match `op`'s
 * geometry. No-op for side bays. Writes to both oeOpenings (the editor's
 * working state) and CONFIG.manualOpenings (the committed state) so a
 * subsequent regenerate sees consistent values on both walls.
 */
export function oeBayOppositeWall(sourceWall) {
  return sourceWall === 'front' ? 'back'
       : sourceWall === 'back'  ? 'front'
       : null;
}

export function oeEnsureWallFeatureWorkingArray(face) {
  if (!Array.isArray(oeOpenings[face])) {
    const target = oeEditTarget();
    const feats = wallFeaturesForFace(target, face);
    oeOpenings[face] = feats.length ? feats : [];
  }
  return oeOpenings[face];
}

export function oeCommitWorkingWallFeatures(face) {
  const target = oeEditTarget();
  const arr = Array.isArray(oeOpenings[face]) ? oeOpenings[face] : [];
  setWallFeaturesForFace(target, face, arr);
}


export function oeWallFeatureEditorOps(face) {
  const target = oeEditTarget();
  const base = wallFeaturesForFace(target, face);
  const railOps = embeddedRailBayOpsForFace(target, face);
  if (wallFaceIsManual(target, face)) return base.concat(railOps);
  return (base.length || railOps.length) ? base.concat(railOps) : null;
}

export function oeApplyEmbeddedRailBayMove(op, sourceWall) {
  if (!op || !op._embeddedRail) return false;
  const target = oeEditTarget();
  const rails = embeddedRailsForCfg(target);
  const z = rails[Number(op._embeddedRailIndex)];
  if (!z) return false;

  const matT = target.coreThickness || 1.5;
  const pr = embeddedRailProfile(z);
  const bayW = Number(op.w) || Number(pr.bayOpeningWidthMm) || 27;
  const wallLocalX = Number(op.x) || 0;
  const physicalX = embeddedRailWallLocalXToPhysical(target, sourceWall, wallLocalX, bayW);
  const centerOnWall = physicalX + bayW / 2;
  const orientation = embeddedRailOrientation(z);

  if (orientation === 'ns' && (sourceWall === 'front' || sourceWall === 'back')) {
    const trackXInterior = centerOnWall - matT;
    z.trackOffset = trackXInterior - (Number(z.x) + Number(z.w) / 2);
  } else if (orientation === 'ew' && (sourceWall === 'west' || sourceWall === 'east')) {
    const trackYInterior = centerOnWall - matT;
    z.trackOffset = trackYInterior - (Number(z.y) + Number(z.h) / 2);
  } else {
    return false;
  }

  iwClampRailTrackOffset(z);

  // Refresh every rail-generated bay op in the editor working arrays so the
  // opposite face and current face both show the exact regenerated opening.
  for (const face of ['front', 'back', 'east', 'west']) {
    if (!Array.isArray(oeOpenings[face])) continue;
    oeOpenings[face] = oeOpenings[face].filter(p => !(p && p._embeddedRail));
    const regenerated = embeddedRailBayOpsForFace(target, face);
    if (regenerated.length) oeOpenings[face].push(...regenerated);
  }
  return true;
}

/* Sync the through-bay partner on the opposing wall to match `op`'s
 * geometry. No-op for side bays.
 *
 * Important: after the wallFeatures refactor, CONFIG.manualOpenings is only
 * a compatibility mirror. The authoritative store is target.wallFeatures.
 * The old helper edited CONFIG.manualOpenings directly, then migration would
 * overwrite those edits from stale wallFeatures. This helper now updates the
 * editor working arrays and commits the partner wall through
 * setWallFeaturesForFace(), preserving surface items on that wall.
 */
export function oeSyncLinkedBayPartner(op, sourceWall) {
  if (op && op._embeddedRail) return;
  if (!op || op.type !== 'bay' || op.style !== 'through') return;
  const otherWall = oeBayOppositeWall(sourceWall);
  if (!otherWall) return;

  const partner = {
    type: 'bay',
    x: op.x, y: op.y,
    w: op.w, h: op.h,
    style: op.style,
    doorStyle: op.doorStyle || 'none',
    doorPercentOpen: op.doorPercentOpen || 0,
  };

  const arr = oeEnsureWallFeatureWorkingArray(otherWall);
  const firstBayIdx = arr.findIndex(p => p && p.type === 'bay');
  if (firstBayIdx >= 0) {
    arr[firstBayIdx] = { ...arr[firstBayIdx], ...partner };
    // Enforce the single-bay rule on the partner wall while preserving
    // non-bay features such as fixtures, awnings, cladding patches, etc.
    oeOpenings[otherWall] = arr.filter((p, idx) => !(p && p.type === 'bay') || idx === firstBayIdx);
  } else {
    arr.push(partner);
  }
  oeCommitWorkingWallFeatures(otherWall);
}

/* Remove the through-bay partner on the opposing wall when `op` is being
 * deleted. No-op for side bays. Updates oeOpenings and the unified
 * wallFeatures store; setWallFeaturesForFace keeps legacy manualOpenings in
 * sync for older code paths.
 */
export function oeDeleteLinkedBayPartner(op, sourceWall) {
  if (op && op._embeddedRail) return false;
  if (!op || op.type !== 'bay' || op.style !== 'through') return false;
  const otherWall = oeBayOppositeWall(sourceWall);
  if (!otherWall) return false;

  const arr = oeEnsureWallFeatureWorkingArray(otherWall);
  const before = arr.length;
  oeOpenings[otherWall] = arr.filter(p => !(p && p.type === 'bay'));
  const removed = oeOpenings[otherWall].length !== before;
  if (removed) oeCommitWorkingWallFeatures(otherWall);
  return removed;
}

/* ---- Drag ---- */

export function oeCanvasMouseDownImpl(e) {
  // Pan triggers: middle mouse OR space-held + left mouse. The canvas
  // container has overflow:auto, so panning is just translating
  // scrollLeft / scrollTop while the user drags. Document-level
  // listeners track the rest of the gesture so the user can release
  // the button anywhere on the page without leaving pan mode stuck on.
  if (e.button === 1 || (e.button === 0 && oeSpaceDown)) {
    e.preventDefault();
    const container = document.querySelector('.oe-canvas-area');
    if (!container) return;
    oePanning = true;
    oePanStartPx = { x: e.clientX, y: e.clientY };
    oePanStartScroll = { l: container.scrollLeft, t: container.scrollTop };
    const svg = document.getElementById('openingEditorSvg');
    if (svg) svg.style.cursor = 'grabbing';

    function move(ev) {
      if (!oePanning) return;
      const dx = ev.clientX - oePanStartPx.x;
      const dy = ev.clientY - oePanStartPx.y;
      container.scrollLeft = oePanStartScroll.l - dx;
      container.scrollTop  = oePanStartScroll.t - dy;
    }
    function up() {
      oePanning = false;
      oePanStartPx = null;
      oePanStartScroll = null;
      if (cleanupDrag) cleanupDrag();
      const svg = document.getElementById('openingEditorSvg');
      if (svg) svg.style.cursor = oeSpaceDown ? 'grab' : 'crosshair';
    }
    const cleanupDrag = oeBeginDocumentDrag(e, move, up, { capture: true });
    return;
  }
  if (!iwPrimaryPointer(e)) return;
  const { x, y } = oeToMM(e);

  // ---- Corner resize drag ----
  // If the click landed on a corner resize handle, dispatch a resize drag.
  // The handle's data-oe-handle attribute identifies which corner (nw/ne/sw/se)
  // and data-oe-idx points to the op in oeOpenings[oeWall].
  const tgt = e.target;
  if (tgt && tgt.dataset && tgt.dataset.oeHandle && tgt.dataset.oeIdx != null) {
    const handle = tgt.dataset.oeHandle;
    const idx = parseInt(tgt.dataset.oeIdx, 10);
    const ops = oeOpenings[oeWall] || [];
    const op = ops[idx];
    if (op && Number.isFinite(idx)) {
      e.preventDefault();
      e.stopPropagation();
      const { W: wallW, H: wallH } = oeGetWallDims(oeWall);
      const isBay = op.type === 'bay';
      const isAwning = op.type === 'awning';
      // Awnings store DEPTH in op.h (it's the projection from the wall, not
      // a wall-Y dimension). Resize semantics for awnings: NW/NE/SW/SE
      // change w and depth. We map h↔depth in math below.
      const orig = { x: op.x, y: op.y, w: op.w, h: op.h };
      const opSnapX = (v) => oeSnapSizeX(v);
      const opSnapY = (v) => oeSnapSizeY(v);
      const MIN_W = 2, MIN_H = 2;

      function doResize(mx, my) {
        // Clamp to wall bounds
        mx = Math.max(0, Math.min(wallW, mx));
        my = Math.max(0, Math.min(wallH, my));

        // For bays the bottom edge is anchored to y=wallH (the ground line):
        // any vertical drag adjusts the top edge instead. SW/SE corners
        // therefore only affect width — the y/h math collapses to a no-op.
        const east  = (handle === 'ne' || handle === 'se');
        const west  = (handle === 'nw' || handle === 'sw');
        const north = (handle === 'nw' || handle === 'ne');
        const south = (handle === 'sw' || handle === 'se');

        // ---- X axis ----
        // Through-cuts (window/door/bay) must respect the edge buffer — the
        // strip of wall at each end where the perpendicular wall's core
        // material sits behind the inside face. Surface items don't.
        const isThroughCut = (op.type === 'window' || op.type === 'door' || op.type === 'bay');
        const buf = oeEdgeBuffer(oeWall);
        const xMin    = isThroughCut ? buf.left : 0;
        const xRight  = isThroughCut ? (wallW - buf.right) : wallW;
        let newX = orig.x, newW = orig.w;
        if (east) {
          newW = opSnapX(Math.max(MIN_W, mx - orig.x));
          newW = Math.min(newW, xRight - orig.x);
        } else if (west) {
          // Snap the cursor X first so newX is grid-aligned. The east edge
          // stays put at orig.x + orig.w; new width = east edge - new X.
          newX = opSnapX(Math.max(xMin, Math.min(orig.x + orig.w - MIN_W, mx)));
          newW = (orig.x + orig.w) - newX;
        }

        // ---- Y axis ----
        let newY = orig.y, newH = orig.h;
        if (isBay) {
          // Bottom is locked to y = wallH. North handles can resize height
          // (which moves y up/down). South handles don't change y/h.
          if (north) {
            // Cursor Y is the new top edge of the bay; height = wallH - newY
            newY = opSnapY(Math.max(0, Math.min(wallH - MIN_H, my)));
            newH = wallH - newY;
          }
        } else {
          if (south) {
            newH = opSnapY(Math.max(MIN_H, my - orig.y));
            newH = Math.min(newH, wallH - orig.y);
          } else if (north) {
            newY = oeSnapY(Math.max(0, Math.min(orig.y + orig.h - MIN_H, my)));
            newH = (orig.y + orig.h) - newY;
          }
        }

        // Awning: op.h stores depth; we still let north/south handles drive
        // it (the visual rect uses AWNING_DISP_H, but the user expects the
        // drag to change "size"). Cap depth at a sensible 60 mm.
        if (isAwning && (north || south)) {
          newH = Math.min(60, Math.max(MIN_H, newH));
        }

        op.x = newX; op.y = newY; op.w = newW; op.h = newH;
        oeRender();
      }

      function onMove(me) {
        const pt = oeToMM(me);
        _oeDragMoved = true;
        doResize(pt.x, pt.y);
      }
      function onUp() {
        if (cleanupDrag) cleanupDrag();
        // Through-bay resize: mirror the new w/h/x to the linked partner
        // on the opposing wall before commit so the two stay in lock-step.
        if (isBay && op.style === 'through') oeSyncLinkedBayPartner(op, oeWall);
        oeCommit();
        // Bay resize must trigger regenerate so lastPlan picks up the new
        // bayHeight/bayWidth and the plan-based bay render redraws at the
        // correct size.
        if (isBay) regenerate();
        oeRender();
        setTimeout(() => { _oeDragMoved = false; }, 0);
      }
      // Select this op so the resize feedback (selection box + handles) stays
      // visible during the drag.
      oeSelectedSet = new Set([idx]);
      oeRender();
      const cleanupDrag = oeBeginDocumentDrag(e, onMove, onUp);
      return;
    }
  }

  // ---- Opening drag (single or multi) ----
  // Bays go through this path just like any other opening; the standard
  // selection, multi-select, and delete behaviours all apply. Bay-specific
  // Y locking happens inside onMove below (bays stay bottom-anchored).
  // Prefer explicit data-oe-idx from the SVG target; this avoids transparent
  // fill / faux-window outline quirks where a blanked window visually exists
  // but the background SVG receives the mouse event.
  const directIdx = oeEventTargetOpeningIndex(e);
  const hitIdx = directIdx >= 0 ? directIdx : oeHitTest(x, y);
  if (hitIdx < 0) {
    // Miss on empty canvas — start rubber-band selection
    _oeDragMoved = false;
    _oeRubberBand = { x0: x, y0: y, x1: x, y1: y };

    function onRBMove(me) {
      const { x: mx, y: my } = oeToMM(me);
      _oeRubberBand.x1 = mx; _oeRubberBand.y1 = my;
      if (Math.abs(mx - x) > 1 || Math.abs(my - y) > 1) _oeDragMoved = true;
      oeRender();
    }
    function onRBUp(me) {
      if (cleanupDrag) cleanupDrag();
      const rb = _oeRubberBand;
      _oeRubberBand = null;
      if (_oeDragMoved) {
        // Select all openings whose centres fall inside the rubber-band rect
        const x0 = Math.min(rb.x0, rb.x1), x1 = Math.max(rb.x0, rb.x1);
        const y0 = Math.min(rb.y0, rb.y1), y1 = Math.max(rb.y0, rb.y1);
        const ops = oeOpenings[oeWall] || [];
        const next = me.shiftKey ? new Set(oeSelectedSet) : new Set();
        for (let i = 0; i < ops.length; i++) {
          const op = ops[i];
          const cx = op.x + op.w / 2, cy = op.y + oeOpH(op) / 2;
          if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) next.add(i);
        }
        oeSelectedSet = next;
        setTimeout(() => { _oeDragMoved = false; }, 0);
      }
      oeRender();
    }
    const cleanupDrag = oeBeginDocumentDrag(e, onRBMove, onRBUp);
    return;
  }

  // Hit an opening
  if (!oeSelectedSet.has(hitIdx)) {
    // Clicking an unselected opening: replace selection (unless Shift)
    oeSelectedSet = e.shiftKey ? new Set([...oeSelectedSet, hitIdx]) : new Set([hitIdx]);
  }

  _oeDragMoved = false;
  const { W, H } = oeGetWallDims(oeWall);
  const svg = document.getElementById('openingEditorSvg');
  svg.style.cursor = 'grabbing';

  // Snapshot original positions for ALL selected openings
  const allOps = oeOpenings[oeWall];
  const origPositions = {};
  for (const i of oeSelectedSet) origPositions[i] = { x: allOps[i].x, y: allOps[i].y };

  function onMove(me) {
    const { x: mx, y: my } = oeToMM(me);
    const dx = mx - x, dy = my - y;
    if (Math.abs(dx) > 0.3 || Math.abs(dy) > 0.3) _oeDragMoved = true;
    // Edge buffer applies to through-cuts only (window/door/bay); surface
    // items (awning/balcony/fixture/cladding_override/printed_item) can sit
    // anywhere along the wall since they don't penetrate.
    const buf = oeEdgeBuffer(oeWall);
    for (const i of oeSelectedSet) {
      const op = allOps[i];
      const orig = origPositions[i];
      const opH = oeOpH(op);
      const isThroughCut = (op.type === 'window' || op.type === 'door' || op.type === 'bay');
      const minX = isThroughCut ? buf.left : 0;
      const maxX = isThroughCut ? (W - op.w - buf.right) : (W - op.w);
      op.x = oeSnapPlacementX(Math.max(minX, Math.min(maxX, orig.x + dx)), op.w);
      if (op.type === 'bay') {
        // Bays stay bottom-anchored — Y never changes regardless of cursor.
        op.y = H - op.h;
      } else if (op.type === 'door') {
        // Doors snap so their bottom rests on a floor surface (each floor
        // band's bottom edge). Pick the band using the door's vertical
        // center after applying the drag delta — letting the user move
        // doors freely between floors as they drag.
        const centerY = (orig.y + dy) + op.h / 2;
        op.y = oeDoorSnappedY(oeWall, op.h, centerY);
      } else {
        // All other types — including windows — move freely within the
        // wall bounds. Previously windows were locked to whichever floor
        // band they started in, which made it impossible to drag a window
        // up or down a floor (and surprised users who tried). The auto-
        // generated layouts still center new windows in their band; the
        // user can now move them across band lines by hand.
        op.y = oeSnapPlacementY(Math.max(0, Math.min(H - opH, orig.y + dy)), opH);
      }
    }
    oeRender();
  }
  function onUp() {
    svg.style.cursor = oeTool === 'move' ? 'grab' : 'crosshair';
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    // Bay moves change the structural plan (wall outline, floor panel
    // position, window auto-layout exclusion zones), so a drag that touched
    // a bay must trigger regenerate so lastPlan refreshes and the wall
    // outline / cladding update. A through-bay also needs its partner on
    // the opposing wall synced before the commit so manualOpenings reflects
    // both halves consistently.
    if (_oeDragMoved) {
      let bayMoved = false;
      let railBayMoved = false;
      for (const i of oeSelectedSet) {
        const op = allOps[i];
        if (op && op.type === 'bay') {
          bayMoved = true;
          if (op._embeddedRail) {
            railBayMoved = oeApplyEmbeddedRailBayMove(op, oeWall) || railBayMoved;
          } else if (op.style === 'through') {
            oeSyncLinkedBayPartner(op, oeWall);
          }
        }
      }
      oeCommit();
      if (bayMoved || railBayMoved) regenerate();
    }
    setTimeout(() => { _oeDragMoved = false; }, 0);
  }
  const cleanupDrag = oeBeginDocumentDrag(e, onMove, onUp);
  oeRender();
}

/* ---- Keyboard ---- */

export function oeDeleteSelectedItems() {
  if (oeSelectedSet.size === 0) return;
  const toDelete = [...oeSelectedSet].sort((a, b) => b - a);
  let bayDeleted = false;
  const partnersToRemove = [];
  for (const i of toDelete) {
    const op = (oeOpenings[oeWall] || [])[i];
    if (op && op.type === 'bay') {
      bayDeleted = true;
      if (op.style === 'through') partnersToRemove.push(op);
    }
    if (oeOpenings[oeWall]) oeOpenings[oeWall].splice(i, 1);
  }
  oeSelectedSet.clear();
  oeCommit();
  for (const op of partnersToRemove) {
    oeDeleteLinkedBayPartner(op, oeWall);
  }
  if (bayDeleted) regenerate();
  oeRender();
}

export function oeKeyDown(e) {
  if (editorHandleCommonKeyDown(e, {
    modalId: 'openingEditorModal',
    pan: {
      isDown: () => oeSpaceDown,
      setDown: v => { oeSpaceDown = v; },
      isPanning: () => oePanning,
      cursorEl: () => document.getElementById('openingEditorSvg'),
    },
    onEscape: () => oeClose(),
    canCopy: () => oeSelectedSet.size > 0,
    onCopy: () => oeCopy(),
    canPaste: () => oeClipboard.length > 0,
    onPaste: () => oePaste(),
    canDuplicate: () => oeSelectedSet.size > 0,
    onDuplicate: () => { oeCopy(); oePaste(); },
    canDelete: () => oeSelectedSet.size > 0,
    onDelete: () => oeDeleteSelectedItems(),
  })) return;
  if (oeSelectedSet.size > 0 && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
    e.preventDefault();
    const { W, H } = oeGetWallDims(oeWall);
    const unit = oeGrid.enabled ? Math.min(oeGridStep('x') || 0.5, oeGridStep('y') || 0.5) : 0.5;
    const step = e.shiftKey ? unit * 5 : unit;
    const ops  = oeOpenings[oeWall];
    const doorBands = oeGetDoorBands(oeWall);
    const buf = oeEdgeBuffer(oeWall);
    for (const i of oeSelectedSet) {
      const op = ops[i];
      const isThroughCut = (op.type === 'window' || op.type === 'door' || op.type === 'bay');
      const xMin = isThroughCut ? buf.left : 0;
      const xMax = isThroughCut ? (W - op.w - buf.right) : (W - op.w);
      if (e.key === 'ArrowLeft')  op.x = oeSnapPlacementX(Math.max(xMin, op.x - step), op.w);
      if (e.key === 'ArrowRight') op.x = oeSnapPlacementX(Math.min(xMax, op.x + step), op.w);
      if (op.type === 'door') {
        // Up/Down jumps the door to the adjacent floor's surface. Door's
        // bottom sits on some band's yBottom; probe just above to find
        // which band that is. Uses doorBands so the bay-floor on a bay
        // wall is reachable.
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          const probeY = op.y + op.h - 0.5;
          const cb = oeYToBand(doorBands, probeY);
          if (cb >= 0) {
            const target = (e.key === 'ArrowUp')
              ? Math.max(0, cb - 1)
              : Math.min(doorBands.length - 1, cb + 1);
            op.y = Math.max(0, doorBands[target].yBottom - op.h);
          }
        }
      } else {
        // Vertical arrow keys nudge by `step` mm. No band clamping — the
        // user can walk an item up or down past floor boundaries the same
        // way drag now allows. Wall bounds still apply.
        const opH = oeOpH(op);
        const minY = 0;
        const maxY = H - opH;
        if (e.key === 'ArrowUp')   op.y = oeSnapPlacementY(Math.max(minY, op.y - step), opH);
        if (e.key === 'ArrowDown') op.y = oeSnapPlacementY(Math.min(maxY, op.y + step), opH);
      }
    }
    let arrowRailBayMoved = false;
    for (const i of oeSelectedSet) {
      const op = ops[i];
      if (op && op._embeddedRail && op.type === 'bay') {
        arrowRailBayMoved = oeApplyEmbeddedRailBayMove(op, oeWall) || arrowRailBayMoved;
      }
    }
    oeCommit();
    if (arrowRailBayMoved) regenerate();
    oeRender();
  }
}

/* ---- Clipboard: copy/paste selected items ---- */

/* Briefly flash a status message in the top-bar so the user knows copy or
 * paste worked. The bar gets rebuilt frequently (every selection change,
 * every wall switch), so the toast lives in a separate floating div. */
export function oeShowEditorToast(message) {
  let toast = document.getElementById('oeToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'oeToast';
    toast.style.cssText = [
      'position:fixed', 'top:60px', 'left:50%', 'transform:translateX(-50%)',
      'background:rgba(30,30,40,0.92)', 'color:#fff', 'padding:6px 14px',
      'border-radius:6px', 'font-size:12px', 'font-family:system-ui',
      'z-index:10000', 'pointer-events:none', 'opacity:0',
      'transition:opacity 0.15s ease-out',
      'box-shadow:0 2px 8px rgba(0,0,0,0.3)',
    ].join(';');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  // Force reflow so the opacity transition fires
  toast.offsetHeight;  // eslint-disable-line no-unused-expressions
  toast.style.opacity = '1';
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => {
    toast.style.opacity = '0';
  }, 1100);
}

/* Copy the currently-selected ops to the editor clipboard. Items are deep-
 * cloned so subsequent edits to the source don't pollute the clipboard.
 * Each call resets oePasteCount so the FIRST paste lands at the standard
 * +offset; successive pastes step further to avoid stacking on each other. */
export function oeCopy() {
  if (oeSelectedSet.size === 0) {
    oeShowEditorToast('Nothing selected to copy');
    return;
  }
  const ops = oeOpenings[oeWall] || [];
  const selected = [...oeSelectedSet]
    .sort((a, b) => a - b)
    .map(i => ops[i])
    .filter(Boolean);
  if (selected.length === 0) return;
  oeClipboard = selected.map(op => JSON.parse(JSON.stringify(op)));
  oeClipboardSourceWall = oeWall;
  oePasteCount = 0;
  oeShowEditorToast(`Copied ${selected.length} item${selected.length > 1 ? 's' : ''}`);
  oePopulateTopbar();   // refresh Paste button enabled state
}

/* Paste the clipboard's items onto the current wall. Each paste offsets
 * the items by an incrementing delta (3mm × oePasteCount) so successive
 * pastes don't overlap perfectly. Items are clamped to wall bounds and
 * selected after paste so the user can immediately move/delete them. */
export function oePaste() {
  if (oeClipboard.length === 0) {
    oeShowEditorToast('Clipboard is empty');
    return;
  }
  const { W, H } = oeGetWallDims(oeWall);
  oePasteCount += 1;
  const baseDelta = 3;
  const rawDx = baseDelta * oePasteCount;
  const rawDy = baseDelta * oePasteCount;
  // Snap delta to grid (matches editor's snapping convention)
  const dx = oeGrid.enabled ? oeSnapSizeX(rawDx) : rawDx;
  const dy = oeGrid.enabled ? oeSnapSizeY(rawDy) : rawDy;

  if (!Array.isArray(oeOpenings[oeWall])) oeOpenings[oeWall] = [];
  const ops = oeOpenings[oeWall];
  const newIndices = [];
  for (const src of oeClipboard) {
    const newOp = JSON.parse(JSON.stringify(src));
    // Apply offset and clamp to wall bounds (only x/y — width/height stay)
    const opH = (newOp.type === 'awning') ? (newOp.h || 5)  // awning h field stores depth; visual height is AWNING_DISP_H
                                          : (newOp.h || 0);
    newOp.x = oeSnapPlacementX(Math.max(0, Math.min(Math.max(0, W - (newOp.w || 0)), (newOp.x || 0) + dx)), newOp.w || 0);
    newOp.y = oeSnapPlacementY(Math.max(0, Math.min(Math.max(0, H - opH), (newOp.y || 0) + dy)), opH);
    ops.push(newOp);
    newIndices.push(ops.length - 1);
  }
  oeSelectedSet = new Set(newIndices);
  oeCommit();
  oeRender();
  oePopulateTopbar();
  const sourceLabel = (oeClipboardSourceWall && oeClipboardSourceWall !== oeWall)
    ? ` from ${oeClipboardSourceWall}` : '';
  oeShowEditorToast(`Pasted ${oeClipboard.length} item${oeClipboard.length > 1 ? 's' : ''}${sourceLabel}`);
}

/* ---- Commit to CONFIG (without closing) ---- */

export function oeStateCommitImpl() {
  const target = oeEditTarget();
  const ops = Array.isArray(oeOpenings[oeWall]) ? oeOpenings[oeWall] : [];
  const persistedOps = ops.filter(op => !(op && op._embeddedRail));

  // Unified wall feature commit. An empty persisted array is intentional and
  // must be kept as [] so the wall does not fall back to auto/default layout.
  setWallFeaturesForFace(target, oeWall, ops, { preserveEmpty: persistedOps.length === 0 });

  oeUpdateModeBadge();
  const tab = document.getElementById('oeTab' + oeWall.charAt(0).toUpperCase() + oeWall.slice(1));
  if (tab) tab.classList.toggle('oe-manual-indicator', wallHasManualFeatures(target, oeWall));
}
export function oeStateResetWallImpl() {
  const target = oeEditTarget();
  oeOpenings[oeWall] = oeGetAutoOpenings(oeWall);  // auto layout (no awnings/fixtures)
  clearWallFeaturesForFace(target, oeWall);
  oeSelectedSet.clear();
  oeUpdateModeBadge();
  const tab = document.getElementById('oeTab' + oeWall.charAt(0).toUpperCase() + oeWall.slice(1));
  if (tab) tab.classList.remove('oe-manual-indicator');
  oeRender();
}
export function oeGetWinDims(styleKey) {
  const key = styleKey || Object.keys(WINDOW_STYLES)[0];
  const style = WINDOW_STYLES[key];
  if (!style) return { w: 8, h: 5 };
  // Custom size takes priority; otherwise apply scale to style default
  if (oeCustomSizes[key]) return { ...oeCustomSizes[key] };
  const scaleEl = document.getElementById('oeWindowScale');
  const scale = WINDOW_SCALES[(scaleEl && scaleEl.value) || 'default'] || 1.0;
  return { w: +(style.baseW * scale).toFixed(2), h: +(style.baseH * scale).toFixed(2) };
}

export function oeGetDoorDims(styleKey) {
  const key = styleKey || Object.keys(DOOR_STYLES)[0];
  const style = DOOR_STYLES[key];
  if (!style) return { w: 7, h: 18 };
  if (oeCustomSizes[key]) return { ...oeCustomSizes[key] };
  return { w: style.width, h: style.height };
}

export function oeGetAwningDims(styleKey) {
  const key = styleKey || Object.keys(AWNING_STYLES)[0];
  const style = AWNING_STYLES[key];
  if (!style) return { w: 22, d: 10 };
  const ck = 'awning_' + key;
  if (oeCustomSizes[ck]) return { ...oeCustomSizes[ck] };
  return { w: style.baseW, d: style.baseD };
}

export function oeGetBalconyDims(styleKey) {
  const key = styleKey || Object.keys(BALCONY_STYLES)[0];
  const style = BALCONY_STYLES[key];
  if (!style) return { w: 20, d: 10, h: 8, balconyType: 'internal' };
  const ck = 'balcony_' + key;
  const custom = oeCustomSizes[ck];
  return custom
    ? { w: custom.w, d: custom.d, h: custom.h, balconyType: style.balconyType }
    : { w: style.baseW, d: style.baseD, h: style.baseH, balconyType: style.balconyType };
}

export function oeGetFixtureDims(styleKey) {
  const key = styleKey || Object.keys(FIXTURE_STYLES)[0];
  const style = FIXTURE_STYLES[key];
  if (!style) return { w: 4, h: 4 };
  const ck = 'fixture_' + key;
  if (oeCustomSizes[ck]) return { ...oeCustomSizes[ck] };
  return { w: style.width, h: style.height };
}

export function oeGetCladdingOverrideDims(styleKey) {
  // Cladding override is a virtual toolbox item — there's no STYLES dict
  // entry for it. Default size is a sensible cladding patch (30×20mm); the
  // user can resize in the editor or via the toolbox card W/H inputs.
  const ck = 'cladding_override_' + (styleKey || 'override');
  if (oeCustomSizes[ck]) return { ...oeCustomSizes[ck] };
  return { w: 30, h: 20 };
}

export function oeGetPrintedItemDims(styleKey) {
  const key = styleKey || Object.keys(PRINTED_STYLES)[0];
  const style = PRINTED_STYLES[key];
  if (!style) return { w: 5, h: 5 };
  const ck = 'printed_' + key;
  if (oeCustomSizes[ck]) return { ...oeCustomSizes[ck] };
  return { w: style.width, h: style.height };
}

export function oeGetBayDims(styleKey) {
  const key = styleKey || 'side';
  const style = BAY_STYLES[key] || BAY_STYLES.side;
  const ck = 'bay_' + key;
  if (oeCustomSizes[ck]) return { ...oeCustomSizes[ck] };
  return { w: style.baseW, h: style.baseH };
}

// Pick a sensible default cladding style for overrides — one that's likely
// to contrast with the building's main wall cladding. We prefer cement lap
// siding (horizontal courses) which contrasts nicely with the common
// vertical-line defaults (alc_panel, ribbed_metal). Falls back to the first
// available style if cement_siding_lap isn't defined.
export function oeDefaultOverrideCladdingStyle() {
  if (CLADDING_STYLES.cement_siding_lap) return 'cement_siding_lap';
  if (CLADDING_STYLES.concrete_panel_large) return 'concrete_panel_large';
  return Object.keys(CLADDING_STYLES)[0];
}
