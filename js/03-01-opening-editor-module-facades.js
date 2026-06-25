/* =====================================================================
   OPENING EDITOR MODULE FACADES
   ---------------------------------------------------------------------
   Transitional split of the previous monolithic opening editor into
   state/toolbox/topbar/canvas/placement modules. The original function
   bodies are kept below as *Impl functions for safety; public entry points
   now dispatch through these modules. This lets future work move one
   module at a time without changing callers or .hako data.
   ===================================================================== */

const OpeningEditorState = {
  get wall() { return oeWall; },
  set wall(v) { oeWall = v; },
  get target() { return oeStateEditTargetImpl(); },
  get activeCfg() { return oeStateActiveCfgImpl(); },
  get activePlan() { return oeStateActivePlanImpl(); },
  open(wall, wingIndex) { return oeStateOpenImpl(wall, wingIndex); },
  close() { return oeStateCloseImpl(); },
  apply() { return oeStateApplyImpl(); },
  setWall(wall) { return oeStateSetWallImpl(wall); },
  setTool(tool) { return oeStateSetToolImpl(tool); },
  updateModeBadge() { return oeStateUpdateModeBadgeImpl(); },
  commit() { return oeStateCommitImpl(); },
  resetWall() { return oeStateResetWallImpl(); },
  ops(face = oeWall) {
    if (!Array.isArray(oeOpenings[face])) oeOpenings[face] = [];
    return oeOpenings[face];
  },
  selectedOps() {
    const ops = this.ops();
    return [...oeSelectedSet].map(i => ops[i]).filter(Boolean);
  },
  clearSelection() { oeSelectedSet.clear(); },
};

const OpeningEditorToolbox = {
  populate() { return oeToolboxPopulateImpl(); },
  startDrag(e, type, styleKey) { return oeToolboxDragStartImpl(e, type, styleKey); },
  get search() { return oeToolboxSearch; },
  set search(v) { oeToolboxSearch = v || ''; },
};

const OpeningEditorTopbar = {
  populate() { return oeTopbarPopulateImpl(); },
};

const OpeningEditorPlacement = {
  drop(type, dims, x, y, styleKey) { return oePlacementDropOpeningImpl(type, dims, x, y, styleKey); },
  snapX(x, w = 0) { return oeSnapPlacementX(x, w); },
  snapY(y, h = 0) { return oeSnapPlacementY(y, h); },
  clamp(op, x, y) { return oeClampOpToWall(op, x, y); },
};

const OpeningEditorCanvas = {
  render() { return oeCanvasRenderImpl(); },
  toMM(e) { return oeCanvasToMMImpl(e); },
  hitTest(x, y) { return oeCanvasHitTestImpl(x, y); },
  click(e) { return oeCanvasClickImpl(e); },
  mouseDown(e) { return oeCanvasMouseDownImpl(e); },
};

// Public compatibility wrappers. Existing inline HTML handlers and older
// helper calls continue to use these names; the implementation is now
// routed through the relevant module.
function oeEditTarget() { return OpeningEditorState.target; }
function oeActiveCfg() { return OpeningEditorState.activeCfg; }
function oeActivePlan() { return OpeningEditorState.activePlan; }
function openOpeningEditor(wall, wingIndex) { return OpeningEditorState.open(wall, wingIndex); }
function oeClose() { return OpeningEditorState.close(); }
function oeApply() { return OpeningEditorState.apply(); }
function oeSetWall(wall) { return OpeningEditorState.setWall(wall); }
function oeUpdateModeBadge() { return OpeningEditorState.updateModeBadge(); }
function oeSetTool(tool) { return OpeningEditorState.setTool(tool); }
function oeCommit() { return OpeningEditorState.commit(); }
function oeResetWall() { return OpeningEditorState.resetWall(); }

function oePopulateToolbox() { return OpeningEditorToolbox.populate(); }
function oeToolboxDragStart(e, type, styleKey) { return OpeningEditorToolbox.startDrag(e, type, styleKey); }
function oePopulateTopbar() { return OpeningEditorTopbar.populate(); }

function oeDropOpening(type, dims, x, y, styleKey) { return OpeningEditorPlacement.drop(type, dims, x, y, styleKey); }

function oeUpdateFloatingActionBarState() {
  const eraseBtn = document.getElementById('oeEraseBtn');
  if (eraseBtn) eraseBtn.classList.toggle('fab-active', oeTool === 'erase');

  const cladBtn = document.getElementById('oeCladBtn');
  if (cladBtn) cladBtn.classList.toggle('fab-active', oeShowCladding);

  const delBtn = document.getElementById('oeDeleteSelectedBtn');
  if (delBtn) {
    const n = oeSelectedSet ? oeSelectedSet.size : 0;
    delBtn.classList.toggle('oe-visible', n > 0);
    delBtn.disabled = n <= 0;
    delBtn.textContent = n > 1 ? `🗑 ${tx('ed_deleteN','Delete {n}').replace('{n}', n)}` : `🗑 ${tx('ed_delete','Delete')}`;
    delBtn.title = n > 0
      ? tx('ed_deleteWallItemTitle','Delete {n} selected wall item{s}').replace('{n}', n).replace('{s}', n > 1 ? 's' : '')
      : tx('ed_selectWallItemDelete','Select a wall item to delete it');
  }
}

function oeRender() {
  const out = OpeningEditorCanvas.render();
  oeUpdateFloatingActionBarState();
  return out;
}
function oeToMM(e) { return OpeningEditorCanvas.toMM(e); }
function oeHitTest(x, y) { return OpeningEditorCanvas.hitTest(x, y); }
function oeClick(e) { return OpeningEditorCanvas.click(e); }
function oeMouseDown(e) { return OpeningEditorCanvas.mouseDown(e); }

/** Round v to the nearest placement-grid increment for a given axis. */
function oeGridStep(axis) {
  const raw = axis === 'y' ? oeGrid.yStep : oeGrid.xStep;
  return Math.max(0, Number(raw) || 0);
}
function oeGridOrigin(axis) {
  const raw = axis === 'y' ? oeGrid.yOrigin : oeGrid.xOrigin;
  return isFinite(Number(raw)) ? Number(raw) : 0;
}
function oeWallMeasureHeight() {
  try {
    const dims = oeGetWallDims(oeWall);
    return Number(dims && dims.H) || 0;
  } catch (e) {
    return 0;
  }
}
function oeSnapAxis(v, axis = 'x') {
  if (!oeGrid.enabled) return v;
  const step = oeGridStep(axis);
  if (step <= 0) return v;
  const origin = oeGridOrigin(axis);
  if (axis === 'y') {
    // User-facing Y measurements always start at the BOTTOM-left of the
    // wall. Internally wall coordinates are top-down, so convert the
    // coordinate into bottom-up measurement space, snap there, then convert
    // back to the internal top-down coordinate.
    const H = oeWallMeasureHeight();
    const measuredY = H - v;
    const snappedMeasuredY = origin + Math.round((measuredY - origin) / step) * step;
    return H - snappedMeasuredY;
  }
  return origin + Math.round((v - origin) / step) * step;
}
function oeSnapSize(v, axis = 'x') {
  if (!oeGrid.enabled) return v;
  const step = oeGridStep(axis);
  if (step <= 0) return v;
  return Math.round(v / step) * step;
}
// Backwards-compatible x-axis snap used by older editor code.
function oeSnap(v) { return oeSnapAxis(v, 'x'); }
function oeSnapX(v) { return oeSnapAxis(v, 'x'); }
function oeSnapY(v) { return oeSnapAxis(v, 'y'); }
function oeSnapSizeX(v) { return oeSnapSize(v, 'x'); }
function oeSnapSizeY(v) { return oeSnapSize(v, 'y'); }
function oeSnapPlacementX(x, w = 0) {
  return (oeGrid.enabled && oeGrid.anchor === 'center')
    ? oeSnapX(x + (Number(w) || 0) / 2) - (Number(w) || 0) / 2
    : oeSnapX(x);
}
function oeSnapPlacementY(y, h = 0) {
  const hh = Number(h) || 0;
  if (!oeGrid.enabled) return y;
  if (oeGrid.anchor === 'center') {
    return oeSnapY(y + hh / 2) - hh / 2;
  }
  // Bottom-left anchor: snap the object's lower-left/bottom edge to a
  // bottom-up Y measurement grid point.
  return oeSnapY(y + hh) - hh;
}
function oeGridStart(min, step, origin) {
  if (!(step > 0)) return min;
  return origin + Math.ceil((min - origin) / step) * step;
}
function oeSyncLegacySnapGrid() {
  // Keep old toolbox dropdowns roughly in sync when x/y are equal.
  if (!oeGrid.enabled) oeSnapGrid = 0;
  else if (Math.abs((Number(oeGrid.xStep) || 0) - (Number(oeGrid.yStep) || 0)) < 1e-9) oeSnapGrid = Number(oeGrid.xStep) || 0;
}
function oeOpAnchorPoint(op) {
  const h = oeOpH(op);
  if (oeGrid.anchor === 'center') return { x: op.x + (op.w || 0) / 2, y: op.y + h / 2 };
  // Bottom-left anchor in internal top-down coordinates.
  return { x: op.x || 0, y: (op.y || 0) + h };
}
function oeOpMeasurePoint(op) {
  const p = oeOpAnchorPoint(op);
  return { x: p.x, y: oeWallMeasureHeight() - p.y };
}
function oeClampOpToWall(op, x, y) {
  const { W, H } = oeGetWallDims(oeWall);
  const buf = oeEdgeBuffer(oeWall);
  const isThroughCut = (op.type === 'window' || op.type === 'door' || op.type === 'bay');
  const minX = isThroughCut ? buf.left : 0;
  const maxX = isThroughCut ? (W - (op.w || 0) - buf.right) : (W - (op.w || 0));
  const opH = oeOpH(op);
  const maxY = Math.max(0, H - opH);
  return {
    x: Math.max(minX, Math.min(Math.max(minX, maxX), x)),
    y: Math.max(0, Math.min(maxY, y)),
  };
}
function oeMoveSelectionAnchorTo(anchorX, measuredYFromBottom) {
  const ops = oeOpenings[oeWall] || [];
  const primaryIdx = [...oeSelectedSet][0];
  const primary = ops[primaryIdx];
  if (!primary) return;
  const H = oeWallMeasureHeight();
  const targetInternalY = H - measuredYFromBottom;
  const cur = oeOpAnchorPoint(primary);
  const dx = anchorX - cur.x;
  const dy = targetInternalY - cur.y;
  for (const i of oeSelectedSet) {
    const op = ops[i];
    if (!op) continue;
    if (op.type === 'bay') {
      const c = oeClampOpToWall(op, op.x + dx, op.y);
      op.x = oeSnapPlacementX(c.x, op.w || 0);
      op.y = oeGetWallDims(oeWall).H - op.h;
      continue;
    }
    const c = oeClampOpToWall(op, op.x + dx, op.y + dy);
    op.x = oeSnapPlacementX(c.x, op.w || 0);
    op.y = oeSnapPlacementY(c.y, oeOpH(op));
  }
  oeCommit();
  oeRender();
}

let oeOpenings = {};
let oeSelectedSet = new Set();   // indices of selected openings (multi-select)
let oeClipboard = [];            // deep-cloned ops awaiting paste (cross-wall safe)
let oeClipboardSourceWall = null;  // wall the clipboard items came from (for toast)
let oePasteCount = 0;            // how many pastes since last copy; offsets each paste
let _oeRubberBand = null;        // {x0,y0,x1,y1} mm coords during rubber-band drag
let oeEditorScale = 4;

/** Map a part id to a wall key ('front'|'back'|'east'|'west') or null. */
function wallFromPartId(id) {
  // Wing-suffix detection: wing parts get a `_wingN` suffix added in
  // generateBuildingWithWings (e.g. `back_wall_wing0`, `cladding_side_east_wing1`).
  // Peel it off to expose the underlying wall/cladding id, and capture the
  // wing index so the caller can route the click to the wing's
  // manualOpenings instead of the main building's.
  const wm = id.match(/^(.*)_wing(\d+)$/);
  const wingIndex = wm ? parseInt(wm[2], 10) : null;
  const baseId    = wm ? wm[1] : id;

  // Core walls
  let wall = null;
  if (baseId === 'front_wall'     || baseId.startsWith('front_wall_'))     wall = 'front';
  else if (baseId === 'back_wall'      || baseId.startsWith('back_wall_'))      wall = 'back';
  else if (baseId === 'side_wall_east' || baseId.startsWith('side_wall_east_')) wall = 'east';
  else if (baseId === 'side_wall_west' || baseId.startsWith('side_wall_west_')) wall = 'west';
  // Cladding panels (also clickable — same openings). Front/back use
  // `cladding_front` / `cladding_back`; sides use `cladding_side_east` /
  // `cladding_side_west` (per generateCladdingPanel's id-building logic at
  // the `cId = 'cladding_side_' + which` line). The longer side prefix has
  // to be checked first — `cladding_side_east`.startsWith('cladding_east')
  // is false anyway, but listing the side variants explicitly keeps the
  // intent clear.
  else if (baseId.startsWith('cladding_front'))     wall = 'front';
  else if (baseId.startsWith('cladding_back'))      wall = 'back';
  else if (baseId.startsWith('cladding_side_east')) wall = 'east';
  else if (baseId.startsWith('cladding_side_west')) wall = 'west';
  // Inner parapet cladding — small strips that glue inside the parapet,
  // but they're per-face and a user clicking one is reasonable to take
  // them to the opening editor for that face.
  else if (baseId === 'cladding_parapet_inner_front') wall = 'front';
  else if (baseId === 'cladding_parapet_inner_back')  wall = 'back';
  else if (baseId === 'cladding_parapet_inner_east')  wall = 'east';
  else if (baseId === 'cladding_parapet_inner_west')  wall = 'west';
  if (!wall) return null;
  return { wall, wingIndex };
}

/* Returns the object whose wallFeatures the editor reads from and writes
 * back to. For main-building editing this is the top-level CONFIG; for wing
 * editing it is the wing object at CONFIG.wings[oeWingIndex]. Legacy manual*
 * buckets are converted once at import/load and are not used for new writes. */
/* ---- OpeningEditorState implementation ---- */
function oeStateEditTargetImpl() {
  if (oeWingIndex != null && CONFIG.wings && CONFIG.wings[oeWingIndex]) {
    return CONFIG.wings[oeWingIndex];
  }
  return CONFIG;
}

function oeStateActiveCfgImpl() {
  return (oeWingIndex != null && oeWingCfg) ? oeWingCfg : CONFIG;
}

function oeStateActivePlanImpl() {
  return (oeWingIndex != null && oeWingPlan) ? oeWingPlan : lastPlan;
}

function oeStateOpenImpl(wall, wingIndex) {
  if (typeof wall !== 'string') wall = null;
  if (!lastPlan) { readForm(); regenerate(); }

  // Wing mode: cache the wing's per-wing cfg and plan so the editor's
  // geometry helpers (oeGetWallDims, oeWallShapeInfo) can return wing
  // dimensions and the wing's roof shape rather than the main's. The
  // cache is invalidated each open so changes to wing.span / .depth /
  // .floors / .height / .roofStyle (via the Edit Shape modal) are
  // picked up the next time the user clicks a wing wall.
  if (wingIndex != null && wingIndex >= 0 && CONFIG.wings && CONFIG.wings[wingIndex]) {
    oeWingIndex = wingIndex;
    oeWingCfg   = buildWingCfg(CONFIG, CONFIG.wings[wingIndex]);
    oeWingPlan  = buildEdgePlans(oeWingCfg);
  } else {
    oeWingIndex = null;
    oeWingCfg   = null;
    oeWingPlan  = null;
  }

  // Load all wall features from the active edit target (main or wing).
  // This is the first consumer of the unified wall feature model. It still
  // supports older .hako files because wallFeaturesForFace() synthesizes the
  // unified list from the legacy manual* buckets when wallFeatures is absent.
  const target = oeEditTarget();
  migrateLegacyWallFeatures(target);
  oeOpenings = { front: null, back: null, east: null, west: null };
  for (const face of ['front', 'back', 'east', 'west']) {
    oeOpenings[face] = oeWallFeatureEditorOps(face);
  }

  document.getElementById('openingEditorModal').style.display = '';
  oeEditorOpen = true;
  if (threeControls) { try { threeControls.dispose(); } catch(e) {} threeControls = null; }
  const _tp = document.getElementById('threePreview');
  if (_tp) _tp.style.display = 'none';
  OpeningEditorToolbox.populate();
  OpeningEditorTopbar.populate();
  // For wing mode, the connection face ('front' in wing-local coords) is
  // an interior wall with no laser part. If the caller didn't pin a wall,
  // default to 'back' (the wing's outermost face — always editable).
  let initialWall = wall;
  if (oeWingIndex != null && !initialWall) initialWall = 'back';
  oeSetWall(initialWall || oeWall);
  oeSetTool(oeTool === 'window' || oeTool === 'door' ? 'move' : oeTool);
}

function oeStateCloseImpl() {
  document.getElementById('openingEditorModal').style.display = 'none';
  document.removeEventListener('keydown', oeKeyDown);
  document.removeEventListener('keyup',   oeKeyUp);
  // Reset transient pan state so the editor opens cleanly next time
  // (avoids stuck cursor if the user closed while holding space).
  oeSpaceDown = false;
  oePanning   = false;
  oeEditorOpen = false;
  const _tp = document.getElementById('threePreview');
  if (_tp) _tp.style.display = '';
  if (threeRenderer && threeCamera && !threeControls) {
    try {
      threeControls = new THREE.OrbitControls(threeCamera, threeRenderer.domElement);
      threeControls.enableDamping = true;
    } catch(e) { threeControls = null; }
  }
  if (threeRenderer && threeCamera) {
    const cont = document.getElementById('threePreview');
    if (cont) {
      threeRenderer.setSize(cont.clientWidth, cont.clientHeight);
      threeCamera.aspect = cont.clientWidth / cont.clientHeight;
      threeCamera.updateProjectionMatrix();
    }
  }
}

function oeStateApplyImpl() {
  const target = oeEditTarget();
  if (!target.manualOpenings) target.manualOpenings = { front: null, back: null, east: null, west: null };
  if (!target.manualAwnings)  target.manualAwnings  = { front: [],  back: [],  east: [],  west: []  };
  if (!target.manualBalconies) target.manualBalconies = { front: [], back: [], east: [], west: [] };
  if (!target.manualFixtures)  target.manualFixtures  = { front: [], back: [], east: [], west: [] };
  if (!target.manualCladdingOverrides) target.manualCladdingOverrides = { front: [], back: [], east: [], west: [] };
  if (!target.manualPrintedItems) target.manualPrintedItems = { front: [], back: [], east: [], west: [] };
  for (const w of ['front', 'back', 'east', 'west']) {
    // Drop generated embedded-rail bays before writing manual buckets; they
    // are derived from cfg.embeddedRails and remain linked handles only.
    const rawOps = Array.isArray(oeOpenings[w]) ? oeOpenings[w] : [];
    const ops = rawOps.filter(op => !(op && op._embeddedRail));
    setWallFeaturesForFace(target, w, rawOps, { preserveEmpty: ops.length === 0 && rawOps.length === 0 });
    const structural = ops.filter(op =>
      op.type !== 'awning' && op.type !== 'balcony' &&
      op.type !== 'fixture' && op.type !== 'cladding_override' &&
      op.type !== 'printed_item');
    target.manualOpenings[w]  = structural.length > 0 ? structural : null;
    target.manualAwnings[w]   = ops.filter(op => op.type === 'awning')
                                   .map(op => ({ x: op.x, y: op.y, w: op.w, d: op.h }));
    target.manualBalconies[w] = ops.filter(op => op.type === 'balcony')
                                   .map(op => ({ x: op.x, y: op.y, w: op.w, h: op.h, d: op.d, balconyType: op.balconyType }));
    target.manualFixtures[w]  = ops.filter(op => op.type === 'fixture')
                                   .map(op => ({ x: op.x, y: op.y, w: op.w, h: op.h, style: op.style }));
    target.manualCladdingOverrides[w] = ops.filter(op => op.type === 'cladding_override')
                                   .map(op => ({
                                     x: op.x, y: op.y, w: op.w, h: op.h,
                                     claddingStyle: op.claddingStyle,
                                     layered: !!op.layered,
                                     // Pass through per-override style params
                                     // (currently corrugated metal sheet
                                     // dimensions / corrugation density);
                                     // omitted entirely on save when unset
                                     // so legacy .hako files don't grow a
                                     // spurious empty field.
                                     ...(op.styleParams ? { styleParams: { ...op.styleParams } } : {}),
                                   }));
    target.manualPrintedItems[w] = ops.filter(op => op.type === 'printed_item')
                                   .map(op => ({ x: op.x, y: op.y, w: op.w, h: op.h, style: op.style }));
  }
  oeClose();
  regenerate();
}

function oeStateSetWallImpl(wall) {
  oeWall = wall;
  oeSelectedSet.clear();
  const targetForManualState = oeEditTarget();
  const wallIsManual = wallFaceIsManual(targetForManualState, wall);
  if (oeOpenings[wall] === undefined || oeOpenings[wall] === null) {
    const autoOps = wallIsManual ? [] : (oeGetAutoOpenings(wall) || []);
    const railOps = embeddedRailBayOpsForFace(oeEditTarget(), wall);
    oeOpenings[wall] = autoOps.concat(railOps);
  } else if (!wallIsManual) {
    // Auto walls with only generated/non-window objects still need their live
    // default windows/doors materialised in the editor view. Manual-empty
    // walls must NOT run this branch, or deleting the last item immediately
    // brings the default wall state back.
    const hasStructural = oeOpenings[wall].some(op => op.type === 'window' || op.type === 'door');
    if (!hasStructural) {
      const autoOps = oeGetAutoOpenings(wall);
      if (autoOps && autoOps.length) oeOpenings[wall].push(...autoOps);
    }
  }
  const targetForTabs = oeEditTarget();
  for (const w of ['front', 'back', 'east', 'west']) {
    const tab = document.getElementById('oeTab' + w.charAt(0).toUpperCase() + w.slice(1));
    if (!tab) continue;
    tab.classList.toggle('oe-active', w === wall);
    tab.classList.toggle('oe-manual-indicator', wallHasManualFeatures(targetForTabs, w));
  }
  oeUpdateModeBadge();
  oeRender();
}

function oeStateUpdateModeBadgeImpl() {
  const badge = document.getElementById('oeModeBadge');
  const target = oeEditTarget();
  const isManual = wallHasManualFeatures(target, oeWall);
  badge.textContent = isManual ? '✎ Manual' : '⚙ Auto (live)';
  badge.className = 'oe-mode-badge ' + (isManual ? 'oe-mode-manual' : 'oe-mode-auto');
}

function oeStateSetToolImpl(tool) {
  oeTool = tool;
  const eraseBtn = document.getElementById('oeTool-erase');
  if (eraseBtn) eraseBtn.classList.toggle('tb-active', tool === 'erase');
  const svg = document.getElementById('openingEditorSvg');
  if (svg) svg.style.cursor = (tool === 'erase') ? 'not-allowed' : 'default';
}

function oeGetWallDims(wall) {
  // Main and wing editing share this helper. In wing mode the active plan is
  // built from the wing's own cfg, so explicit wing.height overrides are
  // respected instead of falling back to the main building height.
  const plan = oeActivePlan();
  const cfg  = oeActiveCfg();
  if (!plan) return { W: cfg.width || CONFIG.width, H: wallBodyHeightFromConfig(cfg || CONFIG) };
  const { H, fbWidth, sideLen } = plan;
  if (wall === 'front' || wall === 'back') return { W: fbWidth, H };
  return { W: sideLen, H };
}

/* Edge buffer (in mm) along the X axis of a wall — the strip near each
 * end where the core material from the perpendicular wall sits behind the
 * inside face, making it impossible to cut a real through-opening
 * (window/door/bay) there.
 *
 * The building assembles with front/back panels spanning the full width
 * and side panels fitting BETWEEN them (sideLen = depth - 2*matT). That
 * geometry means the front and back walls' leftmost and rightmost matT
 * mm are backed by the side wall material — anything cut there would be
 * blocked by the perpendicular wall.
 *
 * Side walls have no such buffer on their X axis: their full sideLen
 * spans the gap between the front and back walls exactly.
 *
 * Returns { left, right } in mm. Use Math.max(left, 2) etc. if you also
 * want a minimum aesthetic margin — but the geometric truth is just matT.
 */
function oeEdgeBuffer(wall) {
  const matT = (CONFIG.coreThickness && CONFIG.coreThickness > 0) ? CONFIG.coreThickness : 1.5;
  if (wall === 'front' || wall === 'back') {
    return { left: matT, right: matT };
  }
  return { left: 0, right: 0 };
}

/* East wall editor view is mirrored from the laser-panel x convention so it
   matches standard external observer view: when you face an east wall from
   outside (facing west), the building's FRONT (Y=0, labeled +N in the
   footprint view) is on your RIGHT. The other three walls already lay out
   correctly with the laser-panel convention. We store x in laser-panel
   convention (matching `mainWallOpeningsFromWings` and the cut layout, where
   x=0 corresponds to Y=matT for east/west walls); the mirror is applied at
   the rendering and click boundaries.

   For 'east':       rendered_x = ox + (W - stored_x - w) * s
   For other walls:  rendered_x = ox +  stored_x       * s   */
function oeMirrorX(x, w) {
  if (oeWall !== 'east') return x;
  const W = oeGetWallDims(oeWall).W;
  return W - x - (w || 0);
}
