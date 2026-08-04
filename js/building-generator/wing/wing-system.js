/* =====================================================================
   WING / MULTI-BLOCK BUILDING SYSTEM
   Allows the main rectangular block to have additional wings attached
   to any face, forming L, T, U, courtyard and other complex shapes.
   ===================================================================== */

// ---- Wing colour palette (one per wing, cycles) -------------------------
export const WING_COLOURS = ['#e07030','#2a80c0','#50a060','#a040a0','#c0b020','#30a0a0'];

// ---- Geometry helpers ---------------------------------------------------

/** Absolute floor-plan bounding box of a wing {x,y,w,d,h} */
export function weWingBounds(cfg, wing) {
  const W = cfg.width, D = cfg.depth, h = wing.height || cfg.height;
  switch (wing.face) {
    case 'east':  return { x: W,            y: wing.offset,         w: wing.depth, d: wing.span, h };
    case 'west':  return { x: -wing.depth,  y: wing.offset,         w: wing.depth, d: wing.span, h };
    case 'front': return { x: wing.offset,  y: -wing.depth,         w: wing.span,  d: wing.depth, h };
    case 'back':  return { x: wing.offset,  y: D,                   w: wing.span,  d: wing.depth, h };
  }
}

/**
 * Which of the wing's four faces is which role:
 *   connection – the face touching the main block (no external wall here)
 *   outer      – the face farthest from main
 *   left/right – the two parallel faces (may be coplanar with main faces)
 * Returned names are in the WING's local frame ('front'|'back'|'east'|'west').
 */
export function weWingFaceRoles(wing) {
  // In the wing's local building frame (width=span along face, depth=outward):
  // 'front' (y=0) = connection to main,  'back' (y=depth) = outer far face,
  // 'west' (x=0) and 'east' (x=span) = the two parallel side faces.
  return { connection: 'front', outer: 'back', left: 'west', right: 'east' };
}

/**
 * Is the wing's local face `wf` coplanar with (and flush against) the main block's
 * corresponding outer face?
 */
export function weIsCoplanar(cfg, wing, wf) {
  const roles = weWingFaceRoles(wing);
  if (wf === roles.connection || wf === roles.outer) return false;
  const faceLen = (wing.face === 'east' || wing.face === 'west') ? cfg.depth : cfg.width;
  if (wf === 'west') return wing.offset < 0.5;
  if (wf === 'east') return Math.abs(wing.offset + wing.span - faceLen) < 0.5;
  return false;
}

/**
 * Build a temporary single-block cfg representing a wing, so we can reuse
 * all existing wall/floor/cladding generators.
 *
 * Convention: the wing's local X axis runs along the attachment face;
 * the wing's local Y axis runs outward from the main block.
 * So  width = wing.span  (along main face)
 *     depth = wing.depth (outward)
 */
export function weBuildWingCfg(cfg, wing) {
  return {
    ...cfg,
    width:          wing.span,
    depth:          wing.depth,
    height:         wing.height  || cfg.height,
    floors:         wing.floors  || cfg.floors,
    floorHeight:    wing.floorHeight != null ? wing.floorHeight : cfg.floorHeight,
    claddingStyle:  wing.claddingStyle  || cfg.claddingStyle,
    roofCladdingStyle: wing.roofCladdingStyle || cfg.roofCladdingStyle,
    interiorCladding:      (wing.interiorCladding      != null) ? wing.interiorCladding      : cfg.interiorCladding,
    interiorCladdingStyle: (wing.interiorCladdingStyle != null) ? wing.interiorCladdingStyle : cfg.interiorCladdingStyle,
    firstFloorCladdingStyleEnabled: false,
    windowDensity:  wing.windowDensity  != null ? wing.windowDensity  : cfg.windowDensity,
    windowStyle:    wing.windowStyle    || cfg.windowStyle,
    doorStyle:      wing.doorStyle      || cfg.doorStyle,
    frontDoorCount: 0,
    backDoorCount:  0,
    sideDoorCount:  0,
    roofStyle:      wing.roofStyle   || cfg.roofStyle,
    parapetHeight:  wing.parapetHeight != null ? wing.parapetHeight : cfg.parapetHeight,
    manualOpenings: wing.manualOpenings || { front: null, back: null, east: null, west: null },
    wings: [],   // no nested wings
    // cosmetic ids
    _wingId: wing.id,
    _wingFace: wing.face,
  };
}

// ---- Suffix helpers so parts get unique IDs ----------------------------
export function weSuffix(wing) { return '_' + wing.id; }

export function weRenamePartForWing(part, wing) {
  const col = WING_COLOURS[CONFIG.wings.indexOf(wing) % WING_COLOURS.length];
  return {
    ...part,
    id:   part.id   + weSuffix(wing),
    name: part.name + ` (Wing ${CONFIG.wings.indexOf(wing) + 1})`,
    _wingColour: col,
  };
}

// ---- Opening injection into main walls --------------------------------
/**
 * After generating a main-block wall, cut openings into it for each 'open'
 * wing connection, and add wall-to-wing structural attachment slots.
 */
export function weInjectWingConnections(part, cfg, plan, mainFace, wings) {
  const H = plan.H;
  const matT = plan.matT;

  for (const wing of wings) {
    const wingH = wing.height || H;

    // Convert floor-plan position of the wing overlap to wall-local x coords:
    // Front/back wall local x = floor-plan x  (spans 0..fbWidth)
    // Side wall local x       = floor-plan y − matT  (spans 0..sideLen)
    let wallLocalStart, wallLocalEnd;
    if (mainFace === 'front' || mainFace === 'back') {
      wallLocalStart = wing.offset;
      wallLocalEnd   = wing.offset + wing.span;
    } else {
      // east or west side wall
      wallLocalStart = wing.offset - matT;
      wallLocalEnd   = wing.offset + wing.span - matT;
    }
    wallLocalStart = Math.max(0, wallLocalStart);
    wallLocalEnd   = Math.min(mainFace === 'front' || mainFace === 'back' ? plan.fbWidth : plan.sideLen, wallLocalEnd);
    if (wallLocalEnd <= wallLocalStart) continue;

    if (wing.connection === 'open') {
      // Large rectangular opening — the two interiors become one space
      const openingY = H - wingH;                          // wall y = 0 at top
      part.rects.push({
        type: 'cut',
        x: wallLocalStart - 1,
        y: openingY - 1,
        w: (wallLocalEnd - wallLocalStart) + 2,
        h: wingH + 2,
        compensateKerf: false,
        _label: 'wing-opening',
      });
    } else {
      // 'wall' connection: add narrow attachment slot pairs for the wing's parallel walls
      // at the two edge positions (wallLocalStart and wallLocalEnd)
      const slotW = plan.tw;
      const slotH = matT + 0.1;
      const floorYs = plan.slotYs || [];
      for (const fy of floorYs) {
        for (const slotX of [wallLocalStart - slotW / 2, wallLocalEnd - slotW / 2]) {
          if (slotX < 0 || slotX + slotW > (mainFace === 'front' || mainFace === 'back' ? plan.fbWidth : plan.sideLen)) continue;
          part.rects.push({ type: 'cut', x: slotX, y: fy - slotH / 2, w: slotW, h: slotH, compensateKerf: true });
        }
      }
    }
  }
  return part;
}

// ---- Dividing wall between main and wing ('wall' connection) -----------
export function weGenerateDividingWall(cfg, plan, wing) {
  const mainBodyH = wallBodyHeightFromConfig(cfg);
  const wingH   = wing.height || mainBodyH;
  const wallW   = wing.span;          // along the attachment face
  const wallH   = Math.min(mainBodyH, wingH);
  const matT    = plan.matT;
  const tw      = plan.tw;
  const margin  = Math.max(matT * 2, 5);

  // Collect floor slot Y positions from BOTH sides (main + wing)
  const mainSlotYs = plan.slotYs || [];
  const wingCfg    = weBuildWingCfg(cfg, wing);
  const wingPlan   = buildEdgePlans(wingCfg);
  const wingSlotYs = wingPlan.slotYs || [];
  const allSlotYs  = [...new Set([...mainSlotYs, ...wingSlotYs])].sort((a, b) => a - b);

  const rects = [];

  // Top tongues (roof connection) — flat and flat_overhang both use the
  // wall-top-tongue + roof-slot mechanism, just with different roof footprints.
  const topTongues = (cfg.roofStyle === 'flat' || cfg.roofStyle === 'flat_overhang')
    ? placeTongues(wallW, tw, margin, [], 3, tw / 2)
    : [];
  // Bottom tongues (floor connection) — these will slot into the shared floor panel
  const bottomTongues = placeTongues(wallW, tw, margin, [], 3, tw / 2);

  // Inter-floor slots on the dividing wall
  const ifTw = 6, ifMargin = 3;
  const ifPoss = placeTongues(wallW, ifTw, ifMargin, [], Math.max(2, Math.min(3, Math.floor(wallW / 35))), ifTw);
  for (const fy of allSlotYs) {
    for (const t of ifPoss) {
      rects.push({ type: 'cut', x: t.start, y: fy - matT / 2, w: t.end - t.start, h: matT, compensateKerf: true });
    }
  }

  const spec = {
    width: wallW, height: wallH, matT, kerf: cfg.kerfComp,
    edges: {
      top:    { tongues: topTongues,    openings: [] },
      bottom: { tongues: bottomTongues, openings: [] },
      left:   { tongues: [],            openings: [] },
      right:  { tongues: [],            openings: [] },
    },
  };
  const perimeter = buildWallPath(spec);

  const idx = CONFIG.wings.indexOf(wing);
  return {
    id:   'dividing_wall_' + wing.id,
    name: `Dividing Wall (Wing ${idx + 1})`,
    material: 'core',
    bboxW: wallW + matT * 2, bboxH: wallH + matT,
    bboxOffsetX: matT, bboxOffsetY: matT,
    paths: [{ type: 'cut', d: perimeter }],
    rects,
    lines: [],
    windows: 0, doors: 0,
    _isDividingWall: true,
  };
}

// ---- Wing floor (separate panel or note to merge for 'open') ----------
export function weGenerateWingFloor(cfg, plan, wing) {
  const wingCfg  = weBuildWingCfg(cfg, wing);
  const wingPlan = buildEdgePlans(wingCfg);
  const part     = generateFloor(wingCfg, wingPlan);
  return weRenamePartForWing({ ...part, id: 'floor' + weSuffix(wing) }, wing);
}

// ---- Multi-block building generator ------------------------------------
// ====================================================================
// WING LAYOUT EDITOR
// ====================================================================

export let weSelectedWingId = null;

export const WE_SCALE = 3.5;   // SVG px per mm in the layout view
export const WE_PAD = 40;    // padding around the floor plan


export let weSelectedCutId = null;
export let weCutDragState = null;

export function weEnsureLayoutCuts() {
  if (!Array.isArray(CONFIG.layoutCuts)) CONFIG.layoutCuts = [];
  return CONFIG.layoutCuts;
}

export function weAllBounds() {
  const W = CONFIG.width, D = CONFIG.depth;
  let minX = 0, minY = 0, maxX = W, maxY = D;
  for (const wing of (CONFIG.wings || [])) {
    const b = weWingBounds(CONFIG, wing);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.d);
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

export function weAddLayoutCut(type) {
  const b = weAllBounds();
  const id = 'cut_' + Date.now();
  const pad = Math.max(10, Math.min(b.w, b.h) * 0.08);
  const y = b.minY + b.h * 0.65;
  const x1 = b.minX - pad, x2 = b.maxX + pad;
  const cut = type === 'arc'
    ? { id, type: 'arc', x1, y1: y, x2, y2: y, cx: (x1 + x2) / 2, cy: y - Math.max(20, b.h * 0.28), keepSide: 'left', enabled: true,
        positionMode: 'free', targetId: 'main', referenceEdge: 'back', startOffset: 20, endOffset: 20, bulge: Math.max(20, b.h * 0.18), bulgeSide: 1 }
    : { id, type: 'line', x1, y1: y, x2, y2: y, keepSide: 'left', enabled: true, positionMode: 'free', solidBack: false };
  weEnsureLayoutCuts().push(cut);
  weSelectedCutId = id;
  weSelectedWingId = null;
  weRender();
  weRenderSidebar();
  regenerate();
}

export function weDeleteSelectedCut() {
  const cuts = weEnsureLayoutCuts();
  const idx = cuts.findIndex(c => c.id === weSelectedCutId);
  if (idx < 0) return;
  cuts.splice(idx, 1);
  weSelectedCutId = null;
  weRender();
  weRenderSidebar();
  regenerate();
}

export function weToggleCutDirection(id) {
  const cut = weEnsureLayoutCuts().find(c => c.id === id);
  if (!cut) return;
  cut.keepSide = cut.keepSide === 'right' ? 'left' : 'right';
  weSelectedCutId = id;
  weSelectedWingId = null;
  weRender();
  weRenderSidebar();
  regenerate();
}


export function weInferMeasuredArcTarget(cut) {
  if (!cut || cut.type !== 'arc') return;
  const mid = { x: ((Number(cut.x1)||0) + (Number(cut.x2)||0)) / 2, y: ((Number(cut.y1)||0) + (Number(cut.y2)||0)) / 2 };
  for (const wing of (CONFIG.wings || [])) {
    const b = weWingBounds(CONFIG, wing);
    if (mid.x >= b.x - 0.01 && mid.x <= b.x + b.w + 0.01 && mid.y >= b.y - 0.01 && mid.y <= b.y + b.d + 0.01) {
      cut.targetId = wing.id;
      if (wing.face === 'east')  { cut.startOffset = Math.max(0, (Number(cut.x1)||0) - CONFIG.width); cut.endOffset = Math.max(0, (Number(cut.x2)||0) - CONFIG.width); }
      if (wing.face === 'west')  { cut.startOffset = Math.max(0, 0 - (Number(cut.x1)||0));          cut.endOffset = Math.max(0, 0 - (Number(cut.x2)||0)); }
      if (wing.face === 'front') { cut.startOffset = Math.max(0, 0 - (Number(cut.y1)||0));          cut.endOffset = Math.max(0, 0 - (Number(cut.y2)||0)); }
      if (wing.face === 'back')  { cut.startOffset = Math.max(0, (Number(cut.y1)||0) - CONFIG.depth); cut.endOffset = Math.max(0, (Number(cut.y2)||0) - CONFIG.depth); }
      return;
    }
  }
  cut.targetId = 'main';
  const dFront = Math.abs(mid.y);
  const dBack  = Math.abs(CONFIG.depth - mid.y);
  const dWest  = Math.abs(mid.x);
  const dEast  = Math.abs(CONFIG.width - mid.x);
  const best = Math.min(dFront, dBack, dWest, dEast);
  cut.referenceEdge = best === dFront ? 'front' : best === dBack ? 'back' : best === dEast ? 'east' : 'west';
  if (cut.referenceEdge === 'front') { cut.startOffset = Math.max(0, Number(cut.y1)||0); cut.endOffset = Math.max(0, Number(cut.y2)||0); }
  if (cut.referenceEdge === 'back')  { cut.startOffset = Math.max(0, CONFIG.depth - (Number(cut.y1)||0)); cut.endOffset = Math.max(0, CONFIG.depth - (Number(cut.y2)||0)); }
  if (cut.referenceEdge === 'west')  { cut.startOffset = Math.max(0, Number(cut.x1)||0); cut.endOffset = Math.max(0, Number(cut.x2)||0); }
  if (cut.referenceEdge === 'east')  { cut.startOffset = Math.max(0, CONFIG.width - (Number(cut.x1)||0)); cut.endOffset = Math.max(0, CONFIG.width - (Number(cut.x2)||0)); }
}

export function weEnsureMeasuredArcDefaults(cut) {
  if (!cut || cut.type !== 'arc') return;
  if (!cut.targetId) weInferMeasuredArcTarget(cut);
  if (!cut.targetId) cut.targetId = 'main';
  if (!['front','back','east','west'].includes(cut.referenceEdge)) cut.referenceEdge = 'back';
  if (!isFinite(Number(cut.startOffset))) cut.startOffset = 20;
  if (!isFinite(Number(cut.endOffset))) cut.endOffset = 20;
  if (!isFinite(Number(cut.bulge))) cut.bulge = 20;
  if (Number(cut.bulgeSide) !== -1) cut.bulgeSide = 1;
  updateMeasuredArcCutGeometry(cut, CONFIG);
}

export function weRenderSelectedCutControls(sidebar, cut) {
  if (!cut) return;
  const dirBtn = document.createElement('button');
  dirBtn.textContent = '↔ Toggle kept side';
  dirBtn.style.cssText = 'width:100%;font-size:11px;margin-bottom:5px;';
  dirBtn.onclick = () => weToggleCutDirection(cut.id);
  sidebar.appendChild(dirBtn);

  if (cut.type !== 'arc') {
    const solidBack = document.createElement('div');
    solidBack.className = 'field';
    solidBack.innerHTML = `<label><input type="checkbox"> Solid black back panel</label>
      <div class="small">Adds a black-card backing piece sized to this straight cut edge. Existing open-slice behavior stays unchanged when off.</div>`;
    const input = solidBack.querySelector('input');
    input.checked = cut.solidBack === true;
    input.onchange = () => {
      cut.solidBack = input.checked;
      weRender();
      weRenderSidebar();
      regenerate();
    };
    sidebar.appendChild(solidBack);
    return;
  }

  const arcBackNote = document.createElement('div');
  arcBackNote.style.cssText = 'font-size:10px;color:var(--muted);line-height:1.35;margin:-2px 0 6px;';
  arcBackNote.textContent = 'Solid back panels are disabled for arc cuts; use a straight or angled cut for a fabricatable backing piece.';
  sidebar.appendChild(arcBackNote);

  const mode = document.createElement('div');
  mode.className = 'field';
  mode.innerHTML = `<label>Arc positioning</label><select>
    <option value="free">Drag handles</option>
    <option value="measured">Measured offsets</option>
  </select>`;
  const modeSel = mode.querySelector('select');
  modeSel.value = cut.positionMode === 'measured' ? 'measured' : 'free';
  modeSel.onchange = () => {
    cut.positionMode = modeSel.value;
    if (cut.positionMode === 'measured') weEnsureMeasuredArcDefaults(cut);
    weRender(); weRenderSidebar(); regenerate();
  };
  sidebar.appendChild(mode);

  if (cut.positionMode !== 'measured') return;
  weEnsureMeasuredArcDefaults(cut);

  const targetWrap = document.createElement('div');
  targetWrap.className = 'field';
  let opts = `<option value="main">Main body</option>`;
  (CONFIG.wings || []).forEach((w, i) => {
    opts += `<option value="${w.id}">Wing ${i + 1} (${w.face})</option>`;
  });
  targetWrap.innerHTML = `<label>Measure on</label><select>${opts}</select>`;
  const targetSel = targetWrap.querySelector('select');
  targetSel.value = cut.targetId || 'main';
  targetSel.onchange = () => {
    cut.targetId = targetSel.value;
    // Keep offsets but clamp/re-resolve against the new target.
    weEnsureMeasuredArcDefaults(cut);
    weRender(); weRenderSidebar(); regenerate();
  };
  sidebar.appendChild(targetWrap);

  if ((cut.targetId || 'main') === 'main') {
    const edgeWrap = document.createElement('div');
    edgeWrap.className = 'field';
    edgeWrap.innerHTML = `<label>Reference edge</label><select>
      <option value="front">Main front edge</option>
      <option value="back">Main back edge</option>
      <option value="east">Main east/right edge</option>
      <option value="west">Main west/left edge</option>
    </select>`;
    const edgeSel = edgeWrap.querySelector('select');
    edgeSel.value = cut.referenceEdge || 'back';
    edgeSel.onchange = () => { cut.referenceEdge = edgeSel.value; updateMeasuredArcCutGeometry(cut, CONFIG); weRender(); weRenderSidebar(); regenerate(); };
    sidebar.appendChild(edgeWrap);
  } else {
    const note = document.createElement('div');
    note.style.cssText = 'font-size:10px;color:var(--muted);line-height:1.35;margin:-3px 0 6px;';
    note.textContent = 'Offsets are measured away from the wing connection to the main body. The two endpoints sit on the two side edges of that wing.';
    sidebar.appendChild(note);
  }

  function arcNum(label, key, min, max, step) {
    const d = document.createElement('div');
    d.className = 'field';
    d.innerHTML = `<label>${label}</label><input type="number" min="${min}" max="${max}" step="${step}" value="${cut[key] != null ? cut[key] : 0}">`;
    const inp = d.querySelector('input');
    inp.onchange = () => {
      const v = parseFloat(inp.value);
      cut[key] = isFinite(v) ? v : 0;
      updateMeasuredArcCutGeometry(cut, CONFIG);
      weRender(); weRenderSidebar(); regenerate();
    };
    sidebar.appendChild(d);
  }

  const info = measuredArcTargetInfo(CONFIG, cut);
  const maxOffset = info.kind === 'wing' ? Math.max(0, Number(info.wing.depth) || 0)
    : (['front','back'].includes(cut.referenceEdge || 'back') ? CONFIG.depth : CONFIG.width);
  arcNum('Start offset from reference (mm)', 'startOffset', 0, Math.max(0, maxOffset), 0.5);
  arcNum('End offset from reference (mm)',   'endOffset',   0, Math.max(0, maxOffset), 0.5);
  arcNum('Arc bulge (mm)',                   'bulge',       -500, 500, 0.5);

  const flip = document.createElement('button');
  flip.textContent = '↕ Flip arc bow direction';
  flip.style.cssText = 'width:100%;font-size:11px;margin-bottom:6px;';
  flip.onclick = () => { cut.bulgeSide = Number(cut.bulgeSide) < 0 ? 1 : -1; updateMeasuredArcCutGeometry(cut, CONFIG); weRender(); weRenderSidebar(); regenerate(); };
  sidebar.appendChild(flip);
}

export function weCutSvgPoint(evt) {
  const svg = document.getElementById('wingEditorSvg');
  const rect = svg.getBoundingClientRect();
  const vb = (svg.getAttribute('viewBox') || '0 0 1 1').split(/\s+/).map(Number);
  const sx = vb[2] / rect.width;
  const sy = vb[3] / rect.height;
  return { x: (evt.clientX - rect.left) * sx + vb[0], y: (evt.clientY - rect.top) * sy + vb[1] };
}

export function weRenderLayoutCutFade(ox, oy, s) {
  const cuts = weEnsureLayoutCuts().filter(cut => cut && cut.enabled !== false);
  if (!cuts.length) return '';
  refreshMeasuredLayoutCuts(CONFIG);
  const f = value => Number(value).toFixed(2);
  const pathFor = poly => (poly || []).map((point, index) => {
    const x = ox + Number(point.x) * s;
    const y = oy + Number(point.y) * s;
    return `${index ? 'L' : 'M'} ${f(x)} ${f(y)}`;
  }).join(' ') + ' Z';
  const rectPoly = (x, y, w, d) => [
    { x, y }, { x: x + w, y }, { x: x + w, y: y + d }, { x, y: y + d },
  ];
  const blocks = [
    { id: 'main', poly: rectPoly(0, 0, Number(CONFIG.width) || 0, Number(CONFIG.depth) || 0) },
    ...CONFIG.wings.map(wing => {
      const bounds = weWingBounds(CONFIG, wing);
      return { id: wing.id, poly: rectPoly(bounds.x, bounds.y, bounds.w, bounds.d) };
    }),
  ];
  let html = '<g class="we-layout-cut-fade" data-layout-cut-fade="true" pointer-events="none">';
  for (const block of blocks) {
    const kept = clipPolygonByLayoutCuts(block.poly, cuts, CONFIG);
    if (!kept || kept.length < 3) {
      html += `<path d="${pathFor(block.poly)}" fill="#f6f4ee" fill-opacity="0.78"/>`;
      continue;
    }
    // Even-odd fill leaves the exported footprint transparent and fades only
    // the material trimmed away by the same cropper used for generated parts.
    html += `<path d="${pathFor(block.poly)} ${pathFor(kept)}" fill="#f6f4ee" fill-opacity="0.78" fill-rule="evenodd"/>`;
  }
  return html + '</g>';
}

export function weRenderLayoutCuts(ox, oy, s, minX, minY, maxX, maxY) {
  const cuts = weEnsureLayoutCuts();
  if (!cuts.length) return '';
  let html = '<g class="we-layout-cuts">';
  const f = v => Number(v).toFixed(2);
  refreshMeasuredLayoutCuts(CONFIG);
  for (const rawCut of cuts) {
    if (!rawCut || rawCut.enabled === false) continue;
    const cut = resolveLayoutCutGeometry(rawCut, CONFIG);
    const selected = rawCut.id === weSelectedCutId;
    const measuredArc = rawCut.type === 'arc' && rawCut.positionMode === 'measured';
    const x1 = ox + cut.x1 * s, y1 = oy + cut.y1 * s;
    const x2 = ox + cut.x2 * s, y2 = oy + cut.y2 * s;
    const stroke = selected ? '#d22' : '#a22';
    const sw = selected ? 3 : 2;
    // The visible dashed cut is intentionally thin, so draw a second invisible
    // non-dashed stroke behind it as the hit target. Without this, only the
    // painted dash segments are clickable, which makes an unselected cut feel
    // almost impossible to pick back up once its handles are hidden.
    const hitSw = 18;
    if (cut.type === 'arc') {
      const cx = ox + cut.cx * s, cy = oy + cut.cy * s;
      const d = `M ${f(x1)},${f(y1)} Q ${f(cx)},${f(cy)} ${f(x2)},${f(y2)}`;
      html += `<path d="${d}" fill="none" stroke="transparent" stroke-width="${hitSw}" data-cutline="${cut.id}" pointer-events="stroke" style="cursor:pointer"/>`;
      html += `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-dasharray="7 4" data-cutline="${cut.id}" pointer-events="stroke" style="cursor:pointer"/>`;
      if (selected && !measuredArc) html += `<circle cx="${f(cx)}" cy="${f(cy)}" r="5" fill="#d22" stroke="#fff" stroke-width="1" data-cutid="${cut.id}" data-cuthandle="ctrl" style="cursor:move"/>`;
      // label near the control point
      html += `<text x="${f(cx)}" y="${f(cy - 10)}" font-size="9" fill="#a22" text-anchor="middle" font-family="system-ui" pointer-events="none">keep ${cut.keepSide}${measuredArc ? ' · measured' : ''}</text>`;
    } else {
      html += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="transparent" stroke-width="${hitSw}" data-cutline="${cut.id}" pointer-events="stroke" style="cursor:pointer"/>`;
      html += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${stroke}" stroke-width="${sw}" stroke-dasharray="7 4" data-cutline="${cut.id}" pointer-events="stroke" style="cursor:pointer"/>`;
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      html += `<text x="${f(mx)}" y="${f(my - 8)}" font-size="9" fill="#a22" text-anchor="middle" font-family="system-ui" pointer-events="none">keep ${cut.keepSide}${rawCut.solidBack === true ? ' · solid back' : ''}</text>`;
    }
    if (selected && !measuredArc) {
      html += `<circle cx="${f(x1)}" cy="${f(y1)}" r="5" fill="#d22" stroke="#fff" stroke-width="1" data-cutid="${cut.id}" data-cuthandle="p1" style="cursor:move"/>`;
      html += `<circle cx="${f(x2)}" cy="${f(y2)}" r="5" fill="#d22" stroke="#fff" stroke-width="1" data-cutid="${cut.id}" data-cuthandle="p2" style="cursor:move"/>`;
    } else if (selected && measuredArc) {
      html += `<circle cx="${f(x1)}" cy="${f(y1)}" r="4" fill="#fff" stroke="#d22" stroke-width="2" pointer-events="none"/>`;
      html += `<circle cx="${f(x2)}" cy="${f(y2)}" r="4" fill="#fff" stroke="#d22" stroke-width="2" pointer-events="none"/>`;
    }
  }
  html += '</g>';
  return html;
}
