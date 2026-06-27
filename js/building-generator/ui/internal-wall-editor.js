/* =====================================================================
   INTERNAL WALL EDITOR
   Coordinate system: interior mm from building NW corner.
   x = 0..bcW (west→east), y = 0..bcH (front→back)
   where bcW = fbWidth - 2*matT, bcH = sideLen
   ===================================================================== */
export let iwFloor = 0;           // floor index (0-based) or IW_ROOF
// When non-null, the IW editor is scoped to a wing's per-wing rooftop /
// floor-hole / skylight / roof-hole collections (the wing at
// CONFIG.wings[iwWingIndex]) — the editor canvas is that wing's
// footprint, and all reads/writes go through iwTarget() instead of
// CONFIG directly. null = main-building editing (the default mode).
export let iwWingIndex = null;
export let iwWingCfg = null;     // cached buildWingCfg result for the active wing
export let iwWingPlan = null;     // cached buildEdgePlans result for the active wing
export let iwTool = 'draw';      // 'draw' | 'erase'
export let iwShowCladding = false; // roof tab only — overlay roof cladding pattern
export let iwGridValue = 5;         // shared floor/roof editor grid spacing in mm
export let iwScale = 4;
export let iwOffX = 20, iwOffY = 20;
export let iwDrag = false;
export let iwDragPt = null;        // {x,y} mm — wall drag start
export let iwCurMM = null;        // {x,y} mm — mouse position
export let iwDragItem = null;      // roof item being dragged from toolbox
export let iwCustomSizes = {};
// Pan state — independent of the wall-draw / item-move gestures so a pan
// in progress doesn't accidentally place walls or grab items. Triggered
// by middle-mouse-drag or space-held + left-drag, both well-known
// conventions from desktop graphics apps.
export let iwPanning = false;
export let iwPanStartPx = null;  // {x, y} in canvas pixels at mousedown
export let iwPanStartOff = null;  // {x, y} = iwOffX/iwOffY at mousedown
export let iwSpaceDown = false;
// Shield Wall tool drag state. Non-null while a handle is being dragged.
// `kind` is one of 'segStart' | 'segEnd' | 'openStart' | 'openEnd' and
// `side` identifies which edge owns the handle. The actual drag math
// runs in iwHandleMouseMove — it converts the cursor position into an
// edge-position (0..edgeLen) and writes it back into the relevant
// field of CONFIG.rooftopShield.edges[side].
export let iwShieldDrag = null;
// Outline drag state — for the four corner-resize handles and the
// body-move handle on the shield's bounding rectangle. `kind` is one
// of 'tl' | 'tr' | 'bl' | 'br' | 'move'. iwShieldBoundsStart captures
// the initial mouse position and the bounds rect at mousedown so the
// move arithmetic can be a simple delta-from-start.
export let iwShieldBoundsDrag = null;
export let iwShieldBoundsStart = null;
// Embedded rail-zone boundary resize state. Non-null while the user is
// dragging one of the eight resize handles on a selected rail zone.
export let iwRailResizeDrag = null;
export let iwRailResizeStart = null;
// Embedded rail child-drag state. Non-null while the user is dragging the
// actual rail centerline inside a rail zone. This is deliberately separate
// from rail-zone movement and boundary resize so a rail zone can behave like
// a movable object that contains its own movable child.
export let iwRailTrackDrag = null;
// Placed-item interaction state. The roof tab supports selecting any
// number of placed items (rooftop items, skylights, roof holes) and the
// floor tab supports selecting any number of floor holes. Each selection
// entry is a { type, idx } reference pointing into the relevant target
// array; multi-selection is built up via shift-click. The most-recently-
// added entry is the "primary" — used by single-item operations like
// the topbar property editor.
//
// Drag state (`iwDragMoving`) tracks the per-item original positions of
// EVERY selected item so the drag-to-move gesture translates the whole
// group by a single delta. `startMM` is the mouse-down position in mm
// (interior frame). When non-null, an item-move gesture is in progress;
// the `moved` flag flips on once the cursor leaves the click threshold
// so a subsequent mouseup is treated as a move rather than a plain
// click. Clipboard is a list of deep-copied items captured by Ctrl+C
// and reinstated (with a small offset and a fresh selection of the
// pasted refs) by Ctrl+V.
export let iwSelection = [];
export let iwDragMoving = null;
export let iwClipboard = [];

export const IW_ROOF = 'roof'; // sentinel value for the roof tab
export const IW_TAB_SPACING = 35;     // mm between wall tongue tabs

/* Returns the object whose rooftopItems / skylights / roofHoles /
 * floorHoles the IW editor reads from and writes back to. Main mode
 * (iwWingIndex == null) returns the top-level CONFIG; wing mode
 * returns CONFIG.wings[iwWingIndex]. The wing object carries the same
 * field names so the editor's read/write code can use the returned
 * target uniformly. Out-of-bounds wing indices fall back to CONFIG so
 * a stale index from a deleted wing can't crash the editor. */
export function iwTarget() {
  if (iwWingIndex != null && CONFIG.wings && CONFIG.wings[iwWingIndex]) {
    return CONFIG.wings[iwWingIndex];
  }
  return CONFIG;
}

/* ----------------------------------------------------------------------
 * SELECTABLE ITEM REFERENCES
 * The IW editor lets the user select and manipulate four kinds of
 * placed objects: rooftop items, skylights, roof holes (both on the
 * Roof tab), and floor holes (on floor tabs). They live in four
 * different arrays under iwTarget() with different position
 * conventions (items use top-left x/y, the rest use centre x/y), so a
 * thin "ref" abstraction wraps each one up with a uniform bbox + setter
 * pair. All multi-selection logic (move, align, distribute, copy/paste,
 * delete) operates on refs rather than the raw arrays.
 * ------------------------------------------------------------------- */

/** Build a ref for the placed object at (type, idx). Returns null if
 *  the index points off the end of the array (e.g. after a delete). */
export function iwMakeRef(type, idx) {
  const tgt = iwTarget();
  let arr, item;
  switch (type) {
    case 'item':      arr = tgt.rooftopItems || []; break;
    case 'skylight':  arr = tgt.skylights    || []; break;
    case 'roofHole':  arr = tgt.roofHoles    || []; break;
    case 'floorHole': arr = tgt.floorHoles   || []; break;
    case 'railZone':  arr = tgt.embeddedRails || []; break;
    default: return null;
  }
  item = arr[idx];
  if (!item) return null;
  // Compute bbox (top-left + size) and remember whether the underlying
  // item stores its position as a top-left or centre point so the
  // setter can convert back correctly.
  let bx, by, bw, bh, centerBased;
  if (type === 'item') {
    bw = item.w || 20;
    bh = (item.type === 'equipment') ? (item.d || 15) : (item.h || item.d || 15);
    bx = item.x; by = item.y;
    centerBased = false;
  } else if (type === 'skylight') {
    bw = item.w; bh = item.h;
    bx = item.x - bw / 2; by = item.y - bh / 2;
    centerBased = true;
  } else if (type === 'railZone') {
    bw = item.w || 30; bh = item.h || 60;
    bx = item.x || 0; by = item.y || 0;
    centerBased = false;
  } else { // roofHole / floorHole — circle or square
    if (item.shape === 'circle') { bw = item.d; bh = item.d; }
    else                          { bw = item.w; bh = item.h; }
    bx = item.x - bw / 2; by = item.y - bh / 2;
    centerBased = true;
  }
  return { type, idx, item, bbox: { x: bx, y: by, w: bw, h: bh }, centerBased };
}

/** Returns refs for every selectable placed object in the current view
 *  (roof tab vs floor tab) in a stable order: items first, then
 *  skylights, then holes. Used for "select all" and for the rendering
 *  pass that needs to know which refs are selected. */
export function iwAllRefs() {
  const tgt = iwTarget();
  const out = [];
  if (iwIsRoof()) {
    (tgt.rooftopItems || []).forEach((_, idx) => { const r = iwMakeRef('item',     idx); if (r) out.push(r); });
    (tgt.skylights    || []).forEach((_, idx) => { const r = iwMakeRef('skylight', idx); if (r) out.push(r); });
    (tgt.roofHoles    || []).forEach((_, idx) => { const r = iwMakeRef('roofHole', idx); if (r) out.push(r); });
  } else {
    (tgt.floorHoles   || []).forEach((_, idx) => { const r = iwMakeRef('floorHole', idx); if (r) out.push(r); });
    (tgt.embeddedRails || []).forEach((_, idx) => { const r = iwMakeRef('railZone', idx);  if (r) out.push(r); });
  }
  return out;
}

/** Whether (type, idx) is in the current selection. */
export function iwIsSelected(type, idx) {
  return iwSelection.some(s => s.type === type && s.idx === idx);
}

/** Add to or replace the selection. If `additive` is true (shift-click),
 *  toggle membership; otherwise replace selection with a single entry. */
export function iwSelect(type, idx, additive) {
  if (additive) {
    const i = iwSelection.findIndex(s => s.type === type && s.idx === idx);
    if (i >= 0) iwSelection.splice(i, 1);
    else        iwSelection.push({ type, idx });
  } else {
    iwSelection = [{ type, idx }];
  }
}

/** Write a new bbox top-left x onto the ref's underlying item, with
 *  bounds clamping to the editor's canvas. */
export function iwSetRefBboxX(ref, newX, bW) {
  const clampedX = Math.max(0, Math.min(bW - ref.bbox.w, newX));
  ref.bbox.x = clampedX;
  ref.item.x = ref.centerBased ? clampedX + ref.bbox.w / 2 : clampedX;
}
export function iwSetRefBboxY(ref, newY, bD) {
  const clampedY = Math.max(0, Math.min(bD - ref.bbox.h, newY));
  ref.bbox.y = clampedY;
  ref.item.y = ref.centerBased ? clampedY + ref.bbox.h / 2 : clampedY;
}

/** Translate every selected item by (dx, dy) mm, clamped to the canvas.
 *  Called from the mousemove handler during a drag-to-move gesture.
 *  `origPositions` is the array of {ref, origX, origY} captured at
 *  mousedown so we always translate from the original position rather
 *  than accumulating per-frame errors. */
export function iwApplyDragDelta(dx, dy, origPositions, bW, bD) {
  for (const op of origPositions) {
    const ref = iwMakeRef(op.ref.type, op.ref.idx);
    if (!ref) continue;
    // Use edge-aware snapping on the object's top-left bbox coordinate. If the
    // usable max position is not on the grid, dragging within one grid step of
    // that edge still lands exactly flush with the edge.
    const maxX = Math.max(0, bW - ref.bbox.w);
    const maxY = Math.max(0, bD - ref.bbox.h);
    iwSetRefBboxX(ref, iwSnapEdgeAware(op.origX + dx, 0, maxX), bW);
    iwSetRefBboxY(ref, iwSnapEdgeAware(op.origY + dy, 0, maxY), bD);
  }
}

export function iwClampRailTrackOffset(z) {
  if (!z) return;
  const pr = embeddedRailProfile(z);
  const band = (pr.sleeperWidthMm || 16) + 2 * (pr.safetyMarginMm || 2);
  const across = embeddedRailOrientation(z) === 'ew' ? z.h : z.w;
  const maxOffset = Math.max(0, (across - band) / 2);
  z.trackOffset = Math.max(-maxOffset, Math.min(maxOffset, z.trackOffset || 0));
}

export function iwRailTrackAcrossInfo(z) {
  const pr = embeddedRailProfile(z);
  const band = (pr.sleeperWidthMm || 16) + 2 * (pr.safetyMarginMm || 2);
  const orientation = embeddedRailOrientation(z);
  const across = orientation === 'ew' ? (z.h || 0) : (z.w || 0);
  const minCenter = band / 2;
  const maxCenter = Math.max(minCenter, across - band / 2);
  const center = Math.max(minCenter, Math.min(maxCenter, across / 2 + (z.trackOffset || 0)));
  return { orientation, across, band, minCenter, maxCenter, center };
}

export function iwApplyRailTrackDrag(curMM) {
  if (!iwRailTrackDrag || !curMM) return;
  const z = (iwTarget().embeddedRails || [])[iwRailTrackDrag.idx];
  if (!z) return;
  const info = iwRailTrackAcrossInfo(z);
  const delta = info.orientation === 'ew'
    ? (curMM.y - iwRailTrackDrag.mouse.y)
    : (curMM.x - iwRailTrackDrag.mouse.x);
  // Snap the rail centerline in local rail-zone coordinates, but still allow
  // the safety band to land exactly flush with either boundary even when that
  // boundary is not on the current grid.
  const snappedCenter = iwSnapEdgeAware(iwRailTrackDrag.startCenter + delta, info.minCenter, info.maxCenter);
  z.trackOffset = snappedCenter - info.across / 2;
  iwClampRailTrackOffset(z);
}

export function iwApplyRailZoneResize(curMM) {
  if (!iwRailResizeDrag || !iwRailResizeStart || !curMM) return;
  const tgt = iwTarget();
  const z = (tgt.embeddedRails || [])[iwRailResizeDrag.idx];
  if (!z) return;
  const { bW, bD } = iwBounds();
  const minW = 18;
  const minH = 18;
  const dx = curMM.x - iwRailResizeStart.mouse.x;
  const dy = curMM.y - iwRailResizeStart.mouse.y;
  const orig = iwRailResizeStart.rect;
  let x1 = orig.x, y1 = orig.y, x2 = orig.x + orig.w, y2 = orig.y + orig.h;
  const handle = iwRailResizeDrag.handle;
  if (handle.includes('w')) x1 = orig.x + dx;
  if (handle.includes('e')) x2 = orig.x + orig.w + dx;
  if (handle.includes('n')) y1 = orig.y + dy;
  if (handle.includes('s')) y2 = orig.y + orig.h + dy;

  x1 = iwSnapEdgeAware(x1, 0, bW);
  x2 = iwSnapEdgeAware(x2, 0, bW);
  y1 = iwSnapEdgeAware(y1, 0, bD);
  y2 = iwSnapEdgeAware(y2, 0, bD);

  if (x2 - x1 < minW) {
    if (handle.includes('w')) x1 = x2 - minW;
    else x2 = x1 + minW;
  }
  if (y2 - y1 < minH) {
    if (handle.includes('n')) y1 = y2 - minH;
    else y2 = y1 + minH;
  }

  // Final clamp after enforcing minimum size.
  if (x1 < 0) { x2 -= x1; x1 = 0; }
  if (x2 > bW) { x1 -= (x2 - bW); x2 = bW; }
  if (y1 < 0) { y2 -= y1; y1 = 0; }
  if (y2 > bD) { y1 -= (y2 - bD); y2 = bD; }

  // Do not re-snap x/y/w/h here. One side may intentionally be an exact
  // footprint edge that is not a grid multiple, and re-snapping the size would
  // pull it back off that edge.
  z.x = Math.max(0, x1);
  z.y = Math.max(0, y1);
  z.w = Math.max(minW, x2 - x1);
  z.h = Math.max(minH, y2 - y1);
  iwClampRailTrackOffset(z);
}

export function iwRailResizeCursor(handle) {
  if (handle === 'n' || handle === 's') return 'ns-resize';
  if (handle === 'e' || handle === 'w') return 'ew-resize';
  if (handle === 'ne' || handle === 'sw') return 'nesw-resize';
  return 'nwse-resize';
}


export function iwPrimaryPointer(e) {
  return !e || e.button == null || e.button === 0;
}

export function iwBindPointerAndMouse(el, handler) {
  if (!el || !handler) return;
  if (window.PointerEvent) {
    el.addEventListener('pointerdown', e => handler(e));
  } else {
    el.addEventListener('mousedown', handler);
  }
}

/** Highest-priority floor/roof object hit-test for the floor editor.
 *  This delegated handler is called from the SVG background mousedown before
 *  wall drawing can start. It intentionally gives object handles and bodies
 *  priority over whatever tool is active (including the default Draw Wall
 *  tool), so dragging a selected object's resize handle cannot accidentally
 *  begin a wall segment behind it.
 *
 *  Per-object listeners are still bound after each render for cursor/selection
 *  responsiveness, but this function is the safety net: if a re-render or a
 *  future tool mode misses a direct listener, the background draw handler still
 *  refuses to steal the gesture from a selectable object.
 */
export function iwHandleObjectGestureMouseDown(e) {
  if (!iwPrimaryPointer(e) || iwSpaceDown || iwDragItem) return false;
  const rawTarget = e.target;
  if (!rawTarget || typeof rawTarget.closest !== 'function') return false;

  // Embedded rail resize handles get first priority. They are small and sit on
  // top of the zone, so they must never fall through to rail-zone move or wall
  // draw. Selecting the rail first keeps the topbar property editor in sync.
  const railHandle = rawTarget.closest('.iw-rail-resize');
  if (railHandle && !iwIsRoof()) {
    e.stopPropagation();
    e.preventDefault();
    const idx = parseInt(railHandle.dataset.i, 10);
    const z = (iwTarget().embeddedRails || [])[idx];
    if (!z) return true;
    iwSelect('railZone', idx, e.shiftKey);
    iwRailResizeDrag = { idx, handle: railHandle.dataset.handle };
    iwRailResizeStart = {
      mouse: iwSvgPt(e),
      rect: { x: z.x || 0, y: z.y || 0, w: z.w || 30, h: z.h || 60 },
    };
    iwDragMoving = null;
    iwDrag = false;
    iwDragPt = null;
    iwRender();
    return true;
  }

  // The rail centerline is a draggable child inside the rail zone. It must
  // outrank the rail-zone body so moving the track sideways does not move the
  // entire boundary rectangle and does not fall through to the Draw Wall tool.
  const railTrack = rawTarget.closest('.iw-rail-track');
  if (railTrack && !iwIsRoof()) {
    e.stopPropagation();
    e.preventDefault();
    const idx = parseInt(railTrack.dataset.i, 10);
    const z = (iwTarget().embeddedRails || [])[idx];
    if (!z) return true;
    if (iwTool === 'erase') {
      (iwTarget().embeddedRails || []).splice(idx, 1);
      iwSelection = [];
      iwRender();
      return true;
    }
    iwSelect('railZone', idx, e.shiftKey);
    const info = iwRailTrackAcrossInfo(z);
    iwRailTrackDrag = { idx, mouse: iwSvgPt(e), startCenter: info.center };
    iwRailResizeDrag = null;
    iwRailResizeStart = null;
    iwDragMoving = null;
    iwDrag = false;
    iwDragPt = null;
    iwRender();
    return true;
  }

  // Selectable object bodies get second priority. In erase mode, clicking an
  // object should erase it through the existing click handlers, but we still
  // return true so the background draw-wall gesture cannot start underneath.
  const objectEl = rawTarget.closest('.iw-rail-zone,.iw-hole,.iw-item,.iw-skylight,.iw-roof-hole');
  if (!objectEl) return false;
  e.stopPropagation();
  e.preventDefault();
  iwDrag = false;
  iwDragPt = null;

  if (iwTool === 'erase') return true;

  let type = null;
  if (!iwIsRoof()) {
    if (objectEl.classList.contains('iw-rail-zone')) type = 'railZone';
    else if (objectEl.classList.contains('iw-hole')) type = 'floorHole';
  } else {
    if (objectEl.classList.contains('iw-item')) type = 'item';
    else if (objectEl.classList.contains('iw-skylight')) type = 'skylight';
    else if (objectEl.classList.contains('iw-roof-hole')) type = 'roofHole';
  }
  if (!type) return true;

  const idx = parseInt(objectEl.dataset.i, 10);
  const ref = iwMakeRef(type, idx);
  if (!ref) return true;

  const additive = e.shiftKey;
  const wasSelected = iwIsSelected(type, idx);
  if (additive) {
    iwSelect(type, idx, true);
  } else if (!wasSelected) {
    iwSelect(type, idx, false);
  }

  const items = iwSelection.map(s => {
    const r = iwMakeRef(s.type, s.idx);
    return r ? { ref: s, origX: r.bbox.x, origY: r.bbox.y } : null;
  }).filter(Boolean);

  iwDragMoving = {
    startMM: iwSvgPt(e),
    items,
    moved: false,
  };
  iwRender();
  return true;
}

/** Delete every selected item from its underlying array. Removes from
 *  back-to-front so earlier indices stay valid as we splice. */
export function iwDeleteSelected() {
  if (iwSelection.length === 0) return;
  // Group indices by type, sort descending, then splice in that order.
  const byType = { item: [], skylight: [], roofHole: [], floorHole: [], railZone: [] };
  for (const s of iwSelection) {
    if (byType[s.type]) byType[s.type].push(s.idx);
  }
  const tgt = iwTarget();
  for (const type of Object.keys(byType)) {
    const arrName = ({ item:'rooftopItems', skylight:'skylights',
                       roofHole:'roofHoles', floorHole:'floorHoles', railZone:'embeddedRails' })[type];
    const arr = tgt[arrName];
    if (!Array.isArray(arr)) continue;
    byType[type].sort((a, b) => b - a);
    for (const idx of byType[type]) arr.splice(idx, 1);
  }
  iwSelection = [];
}

/** Capture deep clones of every selected item into the clipboard. The
 *  clipboard survives across selection changes so the user can copy
 *  once and paste many times. Stored as { type, item } pairs so paste
 *  can route each entry back to the right array. */
export function iwCopySelected() {
  if (iwSelection.length === 0) return;
  iwClipboard = iwSelection
    .map(s => {
      const ref = iwMakeRef(s.type, s.idx);
      if (!ref) return null;
      return { type: s.type, item: JSON.parse(JSON.stringify(ref.item)) };
    })
    .filter(Boolean);
}

/** Paste the clipboard into the current view. Each pasted item is
 *  offset by (paste_dx, paste_dy) mm from its copied position; this is
 *  the Figma-style "paste appears slightly down-right" convention. The
 *  selection is replaced with refs to the freshly pasted items so the
 *  user can immediately drag them or paste again to lay down a chain.
 *  Floor-hole entries paste into floorHoles on floor tabs and are
 *  skipped on the roof tab; rooftop items / skylights / roof holes
 *  paste into their respective arrays on the roof tab and are skipped
 *  on floor tabs. */
export function iwPasteClipboard() {
  if (!iwClipboard.length) return;
  const PASTE_DX = 8, PASTE_DY = 8;
  const tgt = iwTarget();
  const { bW, bD } = iwBounds();
  const allowed = iwIsRoof()
    ? new Set(['item', 'skylight', 'roofHole'])
    : new Set(['floorHole', 'railZone']);

  const newSelection = [];
  for (const entry of iwClipboard) {
    if (!allowed.has(entry.type)) continue;
    const arrName = ({ item:'rooftopItems', skylight:'skylights',
                       roofHole:'roofHoles', floorHole:'floorHoles', railZone:'embeddedRails' })[entry.type];
    if (!tgt[arrName]) tgt[arrName] = [];
    const arr = tgt[arrName];
    const clone = JSON.parse(JSON.stringify(entry.item));
    clone.x = (clone.x || 0) + PASTE_DX;
    clone.y = (clone.y || 0) + PASTE_DY;
    // Bounds-clamp using the clone's natural bbox. For top-left-based
    // items, x/y must stay in [0, bW - w]; for centre-based items
    // (skylights/holes), x/y is the centre, so the constraint is
    // [w/2, bW - w/2]. Compute a temporary ref for the clamp.
    const tmpIdx = arr.push(clone) - 1;
    const ref = iwMakeRef(entry.type, tmpIdx);
    if (ref) {
      iwSetRefBboxX(ref, ref.bbox.x, bW);
      iwSetRefBboxY(ref, ref.bbox.y, bD);
    }
    newSelection.push({ type: entry.type, idx: tmpIdx });
  }
  iwSelection = newSelection;
}

export function iwSelectedEditorRefs() {
  const { bW, bD } = iwBounds();
  return iwSelection.map(s => {
    const ref = iwMakeRef(s.type, s.idx);
    if (!ref) return null;
    return {
      ref,
      bbox: { ...ref.bbox },
      setX(v) { iwSetRefBboxX(ref, v, bW); },
      setY(v) { iwSetRefBboxY(ref, v, bD); },
    };
  }).filter(Boolean);
}

/** Align every selected ref to a shared edge or centre line.
 *  Uses the shared modal-editor framework so wall and floor/roof editors
 *  have identical align semantics. */
export function iwAlignSelected(mode) {
  editorAlignRefs(iwSelectedEditorRefs(), mode);
}

/** Distribute selected items evenly along an axis.
 *  Floor/roof editor keeps the original centre-spacing behaviour. */
export function iwDistributeSelected(axis) {
  editorDistributeRefs(iwSelectedEditorRefs(), axis, 'center');
}

export function openInternalWallEditor(startFloor, wingIndex) {
  if (!lastPlan) { alert('Generate a building first.'); return; }
  // Wing mode: cache the wing's cfg and plan so iwBounds and downstream
  // helpers can return wing dimensions, and iwTarget routes per-wing
  // arrays. Cache is invalidated each open so changes to wing geometry
  // (span/depth/height/roofStyle via Edit Shape) are picked up next
  // time the user clicks a wing roof part.
  if (wingIndex != null && wingIndex >= 0 && CONFIG.wings && CONFIG.wings[wingIndex]) {
    iwWingIndex = wingIndex;
    iwWingCfg   = buildWingCfg(CONFIG, CONFIG.wings[wingIndex]);
    iwWingPlan  = buildEdgePlans(iwWingCfg);
  } else {
    iwWingIndex = null;
    iwWingCfg   = null;
    iwWingPlan  = null;
  }
  const target = iwTarget();
  if (!CONFIG.internalWalls) CONFIG.internalWalls = {};
  if (!CONFIG.internalWalls[0]) CONFIG.internalWalls[0] = [];   // single shared layout
  if (!target.rooftopItems) target.rooftopItems = [];
  document.getElementById('iwModal').style.display = '';
  const gridInput = document.getElementById('iwGridInput');
  if (gridInput) {
    gridInput.value = String(iwGridValue);
    if (!gridInput._sharedGridHooked) {
      gridInput.addEventListener('change', () => {
        iwGridValue = Math.max(1, Math.min(50, parseFloat(gridInput.value) || iwGridValue || 5));
        gridInput.value = String(iwGridValue);
        iwPopulateTopbar();
        iwRender();
      });
      gridInput.addEventListener('keydown', e => e.stopPropagation(), true);
      gridInput._sharedGridHooked = true;
    }
  }
  // Reset any leftover selection/move state from a previous session.
  iwSelection  = [];
  iwDragMoving = null;
  // Honour the requested floor tab. Previously every non-roof part opened
  // the ground-floor tab, so clicking inter-floor panels or wing floor pieces
  // appeared to use the wrong editor context.
  const initialFloor = (startFloor === IW_ROOF)
    ? IW_ROOF
    : (startFloor === IW_INTER ? IW_INTER : 0);
  iwSetFloor(initialFloor);
}
export function iwClose() {
  // Drop selection so it isn't carried into the next open of the modal.
  iwSelection  = [];
  iwDragMoving = null;
  // Reset transient pan state so a held space / mid-pan doesn't leak
  // into the next open.
  iwSpaceDown = false;
  iwPanning   = false;
  iwShieldDrag = null;
  iwShieldBoundsDrag = null;
  iwShieldBoundsStart = null;
  document.getElementById('iwModal').style.display = 'none';
}
export function iwApply() { iwClose(); regenerate(); }

/**
 * Keyboard handler scoped to the floor editor modal. Currently handles
 * Delete/Backspace to remove the selected rooftop item — the listener is
 * installed once at startup and gates itself on (a) the modal being open
 * and (b) focus not being inside an input field, so it never interferes
 * with typing in the toolbox/topbar number inputs.
 */
export function iwKeyDown(e) {
  if (editorHandleCommonKeyDown(e, {
    modalId: 'iwModal',
    pan: {
      isDown: () => iwSpaceDown,
      setDown: v => { iwSpaceDown = v; },
      isPanning: () => iwPanning,
      cursorEl: () => document.getElementById('iwSvg'),
    },
    canDelete: () => iwSelection.length > 0,
    onDelete: () => { iwDeleteSelected(); iwDragMoving = null; iwRender(); },
    canCopy: () => iwSelection.length > 0,
    onCopy: () => iwCopySelected(),
    canPaste: () => iwClipboard.length > 0,
    onPaste: () => { iwPasteClipboard(); iwRender(); },
    onSelectAll: () => { iwSelection = iwAllRefs().map(r => ({ type: r.type, idx: r.idx })); iwRender(); },
    onEscape: () => {
      if (iwSelection.length > 0) { iwSelection = []; iwRender(); }
    },
  })) return;
}

export function iwKeyUp(e) {
  editorHandleCommonKeyUp(e, {
    modalId: 'iwModal',
    pan: {
      setDown: v => { iwSpaceDown = v; },
      isPanning: () => iwPanning,
      cursorEl: () => document.getElementById('iwSvg'),
    },
  });
}

export function iwFloorCount() { return lastPlan ? Math.max(1, lastPlan.floors || 1) : 1; }
export function iwIsRoof()     { return iwFloor === IW_ROOF; }
export function iwWalls() { return iwIsRoof() ? [] : ((CONFIG.internalWalls || {})[0] || []); }
export function iwIsFloor() { return !iwIsRoof(); }

/* Ensure CONFIG.rooftopShield.bounds is set explicitly (not null).
 * On first call this seeds it with the current default — the offset-
 * based inset rectangle — so subsequent drags can mutate the bounds
 * directly. Idempotent: if bounds is already set, this is a no-op.
 */
export function iwShieldEnsureBounds() {
  if (!CONFIG.rooftopShield) {
    CONFIG.rooftopShield = { enabled: true, style: 'solid', height: 8, offset: 3,
                             bounds: null,
                             edges: { front: true, back: true, east: true, west: true } };
  }
  const s = CONFIG.rooftopShield;
  if (s.bounds && Number.isFinite(s.bounds.x)) return;
  const { bW, bD } = iwBounds();
  const offset = (typeof s.offset === 'number') ? s.offset : 3;
  s.bounds = {
    x: offset, y: offset,
    w: Math.max(6, bW - 2 * offset),
    h: Math.max(6, bD - 2 * offset),
  };
}

/* Clamp the shield bounds to the inside of the roof and ensure a
 * minimum size. Called after any bounds mutation to keep the values
 * sensible. Also clamps any per-edge segment start/end and openings
 * that fall outside the new bounds — wall lengths track bounds.w/h
 * so a shrunk bounds shouldn't leave segments protruding past their
 * own edge.
 */
export function iwShieldClampBounds() {
  const s = CONFIG.rooftopShield;
  if (!s || !s.bounds) return;
  const { bW, bD } = iwBounds();
  const b = s.bounds;
  const MIN = 6;
  b.x = Math.max(0, Math.min(bW - MIN, b.x));
  b.y = Math.max(0, Math.min(bD - MIN, b.y));
  b.w = Math.max(MIN, Math.min(bW - b.x, b.w));
  b.h = Math.max(MIN, Math.min(bD - b.y, b.h));
  // Clamp per-edge segments to the new bounds. Wall lengths are
  // bounds.w (F/B) and bounds.h (E/W).
  const edges = s.edges || {};
  for (const side of ['front', 'back', 'east', 'west']) {
    const len = (side === 'front' || side === 'back') ? b.w : b.h;
    const e = edges[side];
    if (e && typeof e === 'object') {
      if (e.start != null) e.start = Math.max(0, Math.min(len, e.start));
      if (e.end != null)   e.end   = Math.max(e.start || 0, Math.min(len, e.end));
      if (e.opening) {
        e.opening.start = Math.max(e.start || 0, Math.min(e.end || len, e.opening.start));
        e.opening.end   = Math.max(e.opening.start, Math.min(e.end || len, e.opening.end));
        if (e.opening.end - e.opening.start < 1) e.opening = null;
      }
    }
  }
}

/* Convert a roof-plan-mm point into an edge-position (0..edgeLen) on a
 * given side. The side's edge runs along the bounds rectangle's
 * perimeter; for front/back the edge axis is x and the origin is at
 * the bounds' west corner. For east/west it's y, origin at the
 * bounds' south corner. Returns a raw (unclamped) value — the caller
 * clamps as appropriate.
 */
export function iwShieldEdgePos(side, pt) {
  const s = CONFIG.rooftopShield;
  let bx = 3, by = 3;
  if (s) {
    if (s.bounds && Number.isFinite(s.bounds.x)) {
      bx = s.bounds.x; by = s.bounds.y;
    } else {
      const off = (typeof s.offset === 'number') ? s.offset : 3;
      bx = off; by = off;
    }
  }
  if (side === 'front' || side === 'back') return pt.x - bx;
  return pt.y - by;
}

/* Convert the legacy `true` edge state into the object form so we can
 * mutate individual fields (start, end, opening). Idempotent — already-
 * object values pass through unchanged.
 */
export function iwShieldNormalizeEdge(side) {
  if (!CONFIG.rooftopShield) return;
  if (!CONFIG.rooftopShield.edges) {
    CONFIG.rooftopShield.edges = { front: true, back: true, east: true, west: true };
  }
  const raw = CONFIG.rooftopShield.edges[side];
  if (raw === true || raw == null) {
    const { bW, bD } = iwBounds();
    const offset = CONFIG.rooftopShield.offset || 3;
    const edgeLen = (side === 'front' || side === 'back') ? (bW - 2 * offset) : (bD - 2 * offset);
    CONFIG.rooftopShield.edges[side] = { start: 0, end: edgeLen, opening: null };
  }
}

/* Add an opening at the centre of the given side's segment. Default
 * width: 8 mm — slightly wider than a typical N-scale door so the gap
 * reads as "walk-through" on the model. The opening is clamped to fit
 * inside the segment with at least 4 mm of wall on each side.
 */
export function iwShieldAddOpening(side) {
  iwShieldNormalizeEdge(side);
  const e = CONFIG.rooftopShield.edges[side];
  const segMid = (e.start + e.end) / 2;
  const DEFAULT_W = 8;
  const minWallEachSide = 4;
  const maxOpenW = Math.max(0, (e.end - e.start) - 2 * minWallEachSide);
  const w = Math.min(DEFAULT_W, maxOpenW);
  if (w <= 0) return; // segment too small
  e.opening = { start: segMid - w / 2, end: segMid + w / 2 };
  // If the shield was disabled before, the click would have hit the
  // dashed ghost first and gone through iwShieldwallEdgeClick — so by
  // the time we get here the shield is definitely enabled.
  iwRender();
}


/* Click handler for the Shield Wall tool. Maps the mouse position into
 * roof-plan-mm coords, finds which of the four edges (front / back /
 * east / west) it's closest to, and toggles that edge in
 * CONFIG.rooftopShield.edges. A click within `EDGE_PROX` mm of any
 * edge counts; clicks well inside the roof do nothing (return false so
 * the caller can fall through to deselection).
 *
 * Auto-enables CONFIG.rooftopShield.enabled on first toggle so the
 * user doesn't have to also tick the left-panel checkbox. Returns
 * true if the click was within proximity of an edge (handled),
 * false otherwise.
 */
export function iwShieldwallEdgeClick(e) {
  if (!lastPlan) return false;
  const { bW, bD } = iwBounds();
  const p = iwSvgPt(e);
  // Proximity threshold scales with bay size — clicks anywhere within
  // ~15% of the shorter roof dimension toward an edge register, capped
  // to a reasonable range so big buildings don't make the dead zone
  // unreasonably small.
  const EDGE_PROX = Math.max(6, Math.min(20, Math.min(bW, bD) * 0.15));
  // Distances from each edge (in roof-plan-mm). Negative if outside,
  // but iwSvgPt + the rest of the editor clamps to the building so
  // negative values rarely occur.
  const dN = p.y;            // front / "south" / y=0 edge
  const dS = bD - p.y;       // back  / "north" / y=bD edge
  const dW = p.x;            // west  / x=0 edge
  const dE = bW - p.x;       // east  / x=bW edge

  // Find the nearest edge and require the click to be within proximity
  // AND also in the band along that edge (between the corners).
  const candidates = [
    { dist: dN, key: 'front', within: p.x > 0 && p.x < bW },
    { dist: dS, key: 'back',  within: p.x > 0 && p.x < bW },
    { dist: dW, key: 'west',  within: p.y > 0 && p.y < bD },
    { dist: dE, key: 'east',  within: p.y > 0 && p.y < bD },
  ].filter(c => c.within && c.dist >= 0 && c.dist <= EDGE_PROX);

  if (!candidates.length) return false;
  candidates.sort((a, b) => a.dist - b.dist);
  const hit = candidates[0];

  // Ensure CONFIG.rooftopShield exists and has an edges sub-object.
  if (!CONFIG.rooftopShield) {
    CONFIG.rooftopShield = { enabled: true, style: 'solid', height: 8, offset: 3, edges: {} };
  }
  if (!CONFIG.rooftopShield.edges) {
    CONFIG.rooftopShield.edges = { front: true, back: true, east: true, west: true };
  }

  // If the shield was disabled (no edges enabled yet), this is a fresh
  // turn-on for just the clicked edge — start with all OFF then enable
  // the clicked one so the user doesn't suddenly see all four sides.
  if (!CONFIG.rooftopShield.enabled) {
    CONFIG.rooftopShield.enabled = true;
    CONFIG.rooftopShield.edges = { front: false, back: false, east: false, west: false };
    CONFIG.rooftopShield.edges[hit.key] = true;
    const cb = document.getElementById('rooftopShieldEnabled');
    if (cb) cb.checked = true;
    iwRender();
    return true;
  }

  const cur = CONFIG.rooftopShield.edges[hit.key];
  const edgeLen = (hit.key === 'front' || hit.key === 'back')
    ? (bW - 2 * (CONFIG.rooftopShield.offset || 3))
    : (bD - 2 * (CONFIG.rooftopShield.offset || 3));
  const edgePos = (hit.key === 'front' || hit.key === 'back')
    ? p.x - (CONFIG.rooftopShield.offset || 3)
    : p.y - (CONFIG.rooftopShield.offset || 3);

  if (cur === false || cur == null) {
    // Disabled edge: enable it (full length)
    CONFIG.rooftopShield.edges[hit.key] = true;
  } else if (typeof cur === 'object' && cur.opening
             && edgePos >= cur.opening.start && edgePos <= cur.opening.end) {
    // Clicked inside the opening — remove it. Keeps the resize but
    // closes the gap.
    cur.opening = null;
  } else {
    // Click on enabled body but not in an opening — disable the edge.
    // The user can re-enable with another click, and resize/openings
    // are reached via the white handles + "+" badge.
    CONFIG.rooftopShield.edges[hit.key] = false;
  }

  // If the user has just turned off the last remaining edge, also flip
  // the enabled flag back off — otherwise the left-panel checkbox would
  // stay ticked but generate nothing.
  const anyOn = ['front', 'back', 'east', 'west'].some(k =>
    CONFIG.rooftopShield.edges[k] !== false && CONFIG.rooftopShield.edges[k] != null
  );
  if (!anyOn) CONFIG.rooftopShield.enabled = false;

  // Sync the writeForm-bound checkbox so the left panel reflects the
  // new enabled state.
  const cb = document.getElementById('rooftopShieldEnabled');
  if (cb) cb.checked = !!CONFIG.rooftopShield.enabled;
  iwRender();
  return true;
}

export function iwFloorIdxForPart(partId) {
  // Returns { floor, wingIndex } describing which floor/roof editor tab the
  // part routes to. `floor` is one of 0 (ground/main floor), IW_INTER, or
  // IW_ROOF. `wingIndex` scopes the editor to a wing when the part represents
  // a wing-local floor/roof panel.
  const id = String(partId || '');

  // Split wing floor pieces are generated with ids like
  // floor_split_wing_<wing.id>. They are not necessarily suffixed with
  // `_wingN`, so resolve them by matching the stored wing id first.
  const splitWing = id.match(/^floor_split_wing_(.+)$/);
  if (splitWing) {
    const key = splitWing[1];
    const idx = (CONFIG.wings || []).findIndex((w, i) => String(w && (w.id != null ? w.id : i)) === key);
    return { floor: 0, wingIndex: idx >= 0 ? idx : null };
  }

  // Normal wing parts carry a trailing `_wingN` suffix. Some older helpers can
  // double-append a wing token (for example floor_wing0_wing0), so always peel
  // off the final suffix and then classify the remaining base id.
  const wm = id.match(/^(.*)_wing(\d+)$/);
  const wingIndex = wm ? parseInt(wm[2], 10) : null;
  const baseId    = wm ? wm[1] : id;

  if (baseId === 'roof')         return { floor: IW_ROOF, wingIndex };
  if (baseId === 'roof_slope0')  return { floor: IW_ROOF, wingIndex };
  if (baseId === 'roof_slope1')  return { floor: IW_ROOF, wingIndex };
  if (baseId === 'cladding_roof') return { floor: IW_ROOF, wingIndex };
  if (baseId === 'roof_cladding') return { floor: IW_ROOF, wingIndex };
  if (baseId === 'roof_gabled_cladding') return { floor: IW_ROOF, wingIndex };

  // Floor cards should be editable too. Main floors route to main floor mode;
  // wing floor cards route to the wing-scoped floor editor. This includes ids
  // such as floor, floor_wing0, and floor_wing0_wing0.
  if (baseId === 'floor' || baseId.startsWith('floor_')) {
    return { floor: 0, wingIndex };
  }

  // There is one shared “Inter Floors” tab in the editor. Do not return a
  // numeric index here; openInternalWallEditor treats numeric floors as the
  // ground floor for backwards compatibility.
  const m = baseId.match(/^inter_floor_panel_(\d+)$/);
  if (m) return { floor: IW_INTER, wingIndex: null };

  return null;
}

/* Toggle the roof cladding pattern overlay in the IW editor canvas.
 * Mirrors oeToggleCladding for wall editor. The button is only visible on
 * the roof tab (managed by iwRender's display:none/'' toggling of #iwCladBtn
 * and #iwCladSep), but we leave the function callable at all times so a
 * stale keyboard shortcut or programmatic call from elsewhere can't error
 * out the editor — the next iwRender just won't show the overlay since
 * the roof-rendering branch is the only consumer of iwShowCladding. */
export function iwToggleCladding() {
  iwShowCladding = !iwShowCladding;
  const btn = document.getElementById('iwCladBtn');
  if (btn) btn.classList.toggle('tb-active', iwShowCladding);
  iwRender();
}

export function iwSetFloor(f) {
  iwFloor = f;
  if (!iwIsRoof()) {
    if (!CONFIG.internalWalls) CONFIG.internalWalls = {};
    if (!CONFIG.internalWalls[0]) CONFIG.internalWalls[0] = [];
  } else {
    // First time the user lands on the Roof tab after loading a preset, the
    // preset's rooftopEquipment count map may still hold the equipment but
    // CONFIG.rooftopItems may not yet contain any equipment entries. Migrate
    // counts → items so the editor shows the preset's equipment and the
    // user can drag/edit/remove them. Once migrated, we zero the counts so
    // they don't double-populate on the next open.
    migrateEquipCountsToItems();
  }
  // Selection from a previous tab doesn't carry over.
  iwSelection  = [];
  iwDragMoving = null;
  iwTool = 'draw';
  iwBuildTabs();
  iwPopulateToolbox();
  iwPopulateTopbar();
  iwFitView();
  iwRender();
  const status = document.getElementById('iwStatus');
  if (status) {
    status.textContent = iwIsRoof()
      ? 'Drag items from the library to place. Click a placed item to select it — drag to move, Delete/Backspace to remove.'
      : 'Select a tool from the library, then interact with the floor plan.';
  }
}

/**
 * If the legacy rooftopEquipment count map has non-zero values and
 * CONFIG.rooftopItems doesn't yet carry any equipment entries, run a simple
 * greedy placement and populate rooftopItems. After migration the counts are
 * zeroed so they aren't applied a second time. Mech-room and item-vs-item
 * collisions use the same 2 mm clearance as the original auto-placer.
 */
export function migrateEquipCountsToItems() {
  const plan = (iwWingIndex != null && iwWingPlan) ? iwWingPlan : lastPlan;
  if (!plan) return;
  const tgt = iwTarget();
  const counts = tgt.rooftopEquipment || {};
  const totalCount = Object.values(counts).reduce((sum, n) => sum + (Number(n) || 0), 0);
  if (totalCount <= 0) return;
  if (!tgt.rooftopItems) tgt.rooftopItems = [];
  const hasManualEquip = tgt.rooftopItems.some(it => it && it.type === 'equipment');
  if (hasManualEquip) return;

  // Use the currently edited roof's canvas bounds, not the main roof's
  // bounds. This matters in wing-roof mode: the editor routes writes
  // through iwTarget(), so auto-migrated legacy counts must be laid out
  // in the same roof-local coordinate frame the user is looking at.
  const { bW: roofW, bD: roofD } = iwBounds();
  const edgeMargin = 3;
  const mechRoom = plan.mechRoom || null;
  const placed = [];
  const items = [];
  for (const [key, qty] of Object.entries(counts)) {
    const n = Number(qty) || 0;
    if (n <= 0) continue;
    const eq = ROOFTOP_EQUIPMENT[key];
    if (!eq) continue;
    for (let i = 0; i < n; i++) items.push({ key, eq });
  }
  items.sort((a, b) => (b.eq.w * b.eq.d) - (a.eq.w * a.eq.d));
  function fits(rx, ry, rw, rd) {
    if (rx < edgeMargin || ry < edgeMargin) return false;
    if (rx + rw > roofW - edgeMargin || ry + rd > roofD - edgeMargin) return false;
    if (mechRoom) {
      const mx0 = mechRoom.x - 2, my0 = mechRoom.y - 2;
      const mx1 = mechRoom.x + mechRoom.w + 2, my1 = mechRoom.y + mechRoom.d + 2;
      if (!(rx + rw <= mx0 || rx >= mx1 || ry + rd <= my0 || ry >= my1)) return false;
    }
    for (const p of placed) {
      if (!(rx + rw + 2 <= p.x || rx >= p.x + p.w + 2 || ry + rd + 2 <= p.y || ry >= p.y + p.d + 2)) return false;
    }
    return true;
  }
  for (const it of items) {
    const rw = it.eq.w, rd = it.eq.d;
    let put = false;
    for (let ry = edgeMargin; ry + rd <= roofD - edgeMargin && !put; ry++) {
      for (let rx = edgeMargin; rx + rw <= roofW - edgeMargin && !put; rx++) {
        if (fits(rx, ry, rw, rd)) {
          placed.push({ key: it.key, eq: it.eq, x: rx, y: ry, w: rw, d: rd });
          tgt.rooftopItems.push({
            type: 'equipment', equipKey: it.key,
            w: rw, d: rd, h: it.eq.h, label: it.eq.label,
            x: rx, y: ry,
          });
          put = true;
        }
      }
    }
  }
  // Zero the legacy counts on the same target so the next open doesn't re-migrate.
  for (const k of Object.keys(counts)) counts[k] = 0;
}

/**
 * Lay out a convincing rooftop equipment arrangement based on traditional
 * Japanese commercial building conventions:
 *
 *   - Water tanks live in the BACK CORNERS (round tank NE first, square tank
 *     in the opposite back corner). Gravity-fed plumbing + iconic skyline
 *     feature — almost universal on Japanese rooftops.
 *   - The cooling tower goes back-center in the equipment yard, where it
 *     can be near the chillers below without blocking sightlines.
 *   - Large AC condensers sit in a back-edge row, often behind the shield
 *     wall (kept off the street-facing front).
 *   - Small AC condensers (one per tenant unit) line up along one of the
 *     SIDE edges (east in our convention).
 *   - The electrical / control cabinet stays near the mech room on the
 *     west side, mid-roof, for short power runs.
 *   - Mushroom vents (passive stack vents for kitchens & restrooms) are
 *     DISTRIBUTED across the roof — never clustered.
 *   - The antenna mast claims a prominent location near the back-center
 *     (often atop the mech room when one's present).
 *
 * Placement is fully deterministic — same building → same layout — so
 * running this twice in a row produces the identical result. The mech room
 * (if any) and any non-equipment rooftopItems (mechroom, billboard, etc.)
 * are honoured as obstacles; existing equipment items are replaced.
 *
 * Returns the count of items actually placed.
 */
export function iwAutoSeedRoofEquipment() {
  const plan = (iwWingIndex != null && iwWingPlan) ? iwWingPlan : lastPlan;
  if (!plan) return 0;
  const tgt = iwTarget();
  if (!tgt.rooftopItems) tgt.rooftopItems = [];
  // Drop only existing equipment items on the CURRENTLY EDITED roof — keep
  // mechroom/billboard/skylight/cutout placements on that same roof. In wing
  // mode this must mutate CONFIG.wings[iwWingIndex], not CONFIG.rooftopItems,
  // otherwise clicking Auto-seed on a wing roof populates the main roof.
  tgt.rooftopItems = tgt.rooftopItems.filter(it => it.type !== 'equipment');

  // Match the editor canvas and target roof-local coordinate frame. iwBounds()
  // already switches between main and wing dimensions based on iwWingIndex.
  const { bW: roofW, bD: roofD } = iwBounds();
  const edge = 3; // edge margin from roof boundary
  const mechRoom = plan.mechRoom || null;

  // Also avoid any non-equipment rooftopItems (mechroom drag-placed in editor,
  // billboards, STL zones). These are user-placed obstacles to respect.
  const obstacles = tgt.rooftopItems
    .filter(it => it.type !== 'equipment')
    .map(it => ({
      x: it.x, y: it.y,
      w: it.w || 20,
      d: (it.d != null ? it.d : (it.h || 15)),
    }));
  if (mechRoom) obstacles.push({ x: mechRoom.x, y: mechRoom.y, w: mechRoom.w, d: mechRoom.d });

  const placed = []; // track our newly-placed items for self-collision

  function fits(rx, ry, rw, rd) {
    if (rx < edge || ry < edge) return false;
    if (rx + rw > roofW - edge || ry + rd > roofD - edge) return false;
    // 2 mm clearance around obstacles and other items.
    for (const o of obstacles) {
      if (!(rx + rw + 2 <= o.x || rx >= o.x + o.w + 2 || ry + rd + 2 <= o.y || ry >= o.y + o.d + 2)) return false;
    }
    for (const p of placed) {
      if (!(rx + rw + 2 <= p.x || rx >= p.x + p.w + 2 || ry + rd + 2 <= p.y || ry >= p.y + p.d + 2)) return false;
    }
    return true;
  }

  // Push a placement at exact integer coords; returns true if accepted.
  function place(key, x, y) {
    const eq = ROOFTOP_EQUIPMENT[key];
    if (!eq) return false;
    const ix = Math.round(x), iy = Math.round(y);
    if (!fits(ix, iy, eq.w, eq.d)) return false;
    placed.push({ key, x: ix, y: iy, w: eq.w, d: eq.d });
    tgt.rooftopItems.push({
      type: 'equipment', equipKey: key,
      w: eq.w, d: eq.d, h: eq.h, label: eq.label,
      x: ix, y: iy,
    });
    return true;
  }

  // Spiral outward from (tx, ty) in concentric square rings, looking for a
  // valid cell. Deterministic search order — always tries E, S, W, N
  // neighbours in the same sequence so re-running gives identical results.
  function placeNear(key, tx, ty, maxRadius) {
    if (maxRadius == null) maxRadius = 15;
    if (place(key, tx, ty)) return true;
    for (let r = 1; r <= maxRadius; r++) {
      // Walk the perimeter of the r-ring clockwise from top-left.
      for (let dx = -r; dx <= r; dx++) { if (place(key, tx + dx, ty - r)) return true; }
      for (let dy = -r + 1; dy <= r; dy++) { if (place(key, tx + r, ty + dy)) return true; }
      for (let dx = r - 1; dx >= -r; dx--) { if (place(key, tx + dx, ty + r)) return true; }
      for (let dy = r - 1; dy >= -r + 1; dy--) { if (place(key, tx - r, ty + dy)) return true; }
    }
    return false;
  }

  // ===== Placement script =====
  // Roof coords: y=0 is FRONT (south), y=roofD is BACK (north).
  // The roof is generally too small to fit every item type — we attempt them
  // in priority order and rely on placeNear's spiral to find legal positions.

  // 1. WATER TANK (round) — back-east corner, anchored with a small inset.
  const tankR = ROOFTOP_EQUIPMENT.water_tank_round;
  placeNear('water_tank_round', roofW - tankR.w - edge - 2, roofD - tankR.d - edge - 2, 10);

  // 2. WATER TANK (square FRP) — opposite back-west corner if the roof is
  //    wide enough to comfortably fit both tanks without crowding.
  if (roofW >= 35) {
    placeNear('water_tank_square', edge + 2, roofD - ROOFTOP_EQUIPMENT.water_tank_square.d - edge - 2, 10);
  }

  // 3. COOLING TOWER — back-center, in the equipment yard.
  const cool = ROOFTOP_EQUIPMENT.cooling_tower;
  if (roofW >= 25) {
    placeNear('cooling_tower', (roofW - cool.w) / 2, roofD - cool.d - edge - 4, 14);
  }

  // 4. AC CONDENSERS (large) — back row, between/beside the tanks. Quantity
  //    scales with roof width: nothing on tiny roofs, 1 on medium, 2 on wide.
  const acL = ROOFTOP_EQUIPMENT.ac_large;
  const acLCount = roofW >= 65 ? 2 : (roofW >= 40 ? 1 : 0);
  for (let i = 0; i < acLCount; i++) {
    // Place them just south of the tanks/tower zone, centred horizontally.
    const totalW = acLCount * acL.w + (acLCount - 1) * 2;
    const xT = (roofW - totalW) / 2 + i * (acL.w + 2);
    placeNear('ac_large', xT, roofD - acL.d - edge - 16, 10);
  }

  // 5. AC CONDENSERS (small) — row along the east (right) edge, one per
  //    tenant unit. Quantity scales with available depth.
  const acS = ROOFTOP_EQUIPMENT.ac_small;
  const acSMax = Math.min(5, Math.max(1, Math.floor((roofD - 2 * edge - 25) / (acS.d + 2))));
  for (let i = 0; i < acSMax; i++) {
    const yT = edge + 5 + i * (acS.d + 2);
    if (yT + acS.d > roofD - edge - 20) break; // stop short of the back equipment yard
    if (!placeNear('ac_small', roofW - acS.w - edge - 1, yT, 5)) break;
  }

  // 6. ELECTRICAL CABINET — west side, mid-roof, near where a mech room
  //    typically sits. Tall narrow footprint.
  if (roofW >= 22) {
    placeNear('elec_cabinet', edge + 2, roofD * 0.45, 10);
  }

  // 7. MUSHROOM VENTS — distributed across the roof. Quantity scales with
  //    area but is capped to keep the layout believable.
  const ventCount = Math.max(2, Math.min(5, Math.floor((roofW * roofD) / 350)));
  for (let i = 0; i < ventCount; i++) {
    // Distribute across a diagonal-ish pattern so they don't line up perfectly.
    const fx = (i + 1) / (ventCount + 1);
    const fy = ((i * 2) % (ventCount + 1) + 0.5) / (ventCount + 1);
    placeNear('mushroom_vent', roofW * fx, roofD * (0.25 + 0.5 * fy), 10);
  }

  // 8. ANTENNA MAST — prominent, traditionally atop the mech room or
  //    centred back. Tiny base (2.7×2.7) so it slots into small gaps easily.
  placeNear('antenna_mast', roofW / 2, roofD * 0.55, 20);

  return placed.length;
}

export const IW_INTER = 'inter'; // sentinel for inter-floors tab

export function iwBuildTabs() {
  const el = document.getElementById('iwFloorTabs');
  if (!el) return;
  el.innerHTML = '';
  const tabs = [
    { key: 0,         label: 'Ground Floor' },
    { key: IW_INTER,  label: 'Inter Floors' },
    { key: IW_ROOF,   label: 'Roof'         },
  ];
  for (const { key, label } of tabs) {
    const b = document.createElement('button');
    b.className = 'oe-wall-tab' + (iwFloor === key ? ' oe-active' : '');
    b.textContent = label;
    b.onclick = () => iwSetFloor(key);
    el.appendChild(b);
  }
}

/* ---- Toolbox — matches opening-editor item style ---- */
/* ---- Left toolbox: item library (mirrors opening editor oe-toolbox) ---- */
export function iwPopulateToolbox() {
  const box = document.getElementById('iwToolbox');
  if (!box) return;
  box.innerHTML = '';

  function sec(lbl) {
    const s = document.createElement('div');
    s.className = 'oe-toolbox-section';
    s.textContent = lbl;
    box.appendChild(s);
  }
  function actionCard(icon, lbl, active, eraseStyle, onClick) {
    const c = document.createElement('div');
    c.className = 'oe-toolbox-item oe-action'
      + (active && !eraseStyle ? ' oe-tool-active'  : '')
      + (active &&  eraseStyle ? ' oe-erase-active' : '');
    c.innerHTML = '<span class="oe-toolbox-item-icon">' + icon + '</span>'
                + '<span class="oe-toolbox-item-label">' + lbl + '</span>';
    c.addEventListener('mousedown', e => { e.preventDefault(); onClick(c); });
    box.appendChild(c);
  }
  function dragCard(icon, lbl, sublbl, item, sizeInputs) {
    const c = document.createElement('div');
    c.className = 'oe-toolbox-item oe-draggable';
    c.title = lbl + ' — drag onto plan';
    let sHtml = '';
    if (sizeInputs && sizeInputs.length) {
      sHtml = '<div class="oe-size-row">'
        + sizeInputs.map(si =>
            '<label>' + si.label + '</label>'
            + '<input type="number" data-key="' + si.key + '" min="' + (si.min||1)
            + '" max="' + (si.max||200) + '" step="' + (si.step||1)
            + '" value="' + si.val + '">'
          ).join('')
        + '</div>';
    }
    c.innerHTML = '<span class="oe-toolbox-item-icon">' + icon + '</span>'
                + '<span class="oe-toolbox-item-label">' + lbl + '</span>'
                + '<span class="oe-toolbox-item-dim">'  + sublbl + '</span>'
                + sHtml;
    c.querySelectorAll('input').forEach(inp => {
      inp.addEventListener('click',  e => e.stopPropagation());
      inp.addEventListener('change', e => e.stopPropagation());
    });
    c.addEventListener('mousedown', e => {
      if (e.target.tagName === 'INPUT') return;
      e.preventDefault();
      iwDragItem = { ...item };
      if (sizeInputs) sizeInputs.forEach(si => {
        const inp = c.querySelector('[data-key="' + si.key + '"]');
        if (inp) iwDragItem[si.key] = parseFloat(inp.value) || si.val;
      });
      iwDrag = true;
      iwCurMM = iwSvgPt(e);
      iwRender();
    });
    box.appendChild(c);
  }

  function setTool(tool, c) {
    iwTool = tool; iwDragItem = null;
    box.querySelectorAll('.oe-tool-active,.oe-erase-active').forEach(el =>
      el.classList.remove('oe-tool-active', 'oe-erase-active'));
    c.classList.add(tool === 'erase' ? 'oe-erase-active' : 'oe-tool-active');
    iwPopulateTopbar();
    iwRender();
  }

  if (!iwIsRoof()) {
    sec('Walls');
    actionCard('✏', 'Draw wall',  iwTool === 'draw',  false, c => {
      setTool('draw', c);
      document.getElementById('iwStatus').textContent = 'Drag to draw a wall — snaps to horizontal or vertical.';
    });
    actionCard('✕', 'Erase',      iwTool === 'erase', true,  c => {
      setTool('erase', c);
      document.getElementById('iwStatus').textContent = 'Click a wall or cutout to delete it.';
    });
    sec('Cutouts');
    dragCard('○', 'Circle', 'cable pass-through', { type: 'hole', shape: 'circle' },
      [{ label: '⌀', key: 'd', val: 3, min: 0.5, max: 30, step: 0.5 }]);
    dragCard('□', 'Square', 'cable pass-through', { type: 'hole', shape: 'square' },
      [{ label: 'W', key: 'w', val: 5, min: 0.5, max: 50, step: 0.5 },
       { label: 'H', key: 'h', val: 5, min: 0.5, max: 50, step: 0.5 }]);
    sec('Embedded rail');
    dragCard('▭', 'Embedded rail', 'long axis = track direction', { type: 'embeddedRail', orientation: 'auto' },
      [{ label: 'W', key: 'w', val: 60, min: 18, max: 250, step: 1 },
       { label: 'H', key: 'h', val: 27, min: 18, max: 250, step: 1 }]);
  } else {
    sec('Roof items');
    dragCard('🏭', 'Mech. Room', 'enclosed structure', { type: 'mechroom', label: 'Mech. Room' },
      [{ label:'W', key:'w', val:20, min:4, max:200 },
       { label:'D', key:'d', val:15, min:4, max:200 },
       { label:'H', key:'h', val:12, min:2, max:60  }]);
    dragCard('📋', 'Billboard',  'wall sign',          { type: 'billboard', label: 'Billboard' },
      [{ label:'W', key:'w', val:20, min:4, max:200 },
       { label:'H', key:'h', val:12, min:2, max:60  }]);
    dragCard('📦', 'STL Zone',   'placement area',     { type: 'stlzone', label: 'STL Object' },
      [{ label:'W', key:'w', val:20, min:4, max:200 },
       { label:'D', key:'d', val:15, min:4, max:200 }]);
    dragCard('🔆', 'Skylight',   'roof hole + plexi pane', { type: 'skylight', label: 'Skylight' },
      [{ label:'W', key:'w', val:10, min:3, max:80 },
       { label:'H', key:'h', val:10, min:3, max:80 }]);
    sec('Cutouts');
    dragCard('○', 'Circle', 'cable pass-through', { type: 'hole', shape: 'circle' },
      [{ label: '⌀', key: 'd', val: 3, min: 0.5, max: 30, step: 0.5 }]);
    dragCard('□', 'Square', 'cable pass-through', { type: 'hole', shape: 'square' },
      [{ label: 'W', key: 'w', val: 5, min: 0.5, max: 50, step: 0.5 },
       { label: 'H', key: 'h', val: 5, min: 0.5, max: 50, step: 0.5 }]);
    sec('3D-printed equipment');
    actionCard('🪄', tx('ed_autoSeedLayout','Auto-seed layout'), false, false, c => {
      const target = iwTarget();
      const existing = (target.rooftopItems || []).filter(it => it.type === 'equipment').length;
      if (existing > 0) {
        const ok = confirm(tx('ed_autoSeedReplaceConfirm','Replace {n} existing equipment item{s} with an auto-seeded layout?').replace('{n}', existing).replace('{s}', existing === 1 ? '' : 's'));
        if (!ok) return;
      }
      const n = iwAutoSeedRoofEquipment();
      iwTool = 'move';
      iwSelection = [];
      iwDragMoving = null;
      iwRender();
      const status = document.getElementById('iwStatus');
      if (status) status.textContent = tx('ed_autoSeedStatus','Auto-seeded {n} equipment item{s} using traditional rooftop layout — drag any item to adjust.').replace('{n}', n).replace('{s}', n === 1 ? '' : 's');
    });
    actionCard('🗑', tx('ed_clearAllEquipment','Clear all equipment'), false, true, c => {
      const target = iwTarget();
      const existing = (target.rooftopItems || []).filter(it => it.type === 'equipment').length;
      if (existing === 0) return;
      if (!confirm(tx('ed_clearEquipmentConfirm','Remove all {n} placed equipment item{s}?').replace('{n}', existing).replace('{s}', existing === 1 ? '' : 's'))) return;
      target.rooftopItems = (target.rooftopItems || []).filter(it => it.type !== 'equipment');
      iwSelection = [];
      iwDragMoving = null;
      iwRender();
    });
    for (const [k, eq] of Object.entries(ROOFTOP_EQUIPMENT)) {
      dragCard(
        equipmentIcon(k),
        eq.label,
        eq.w + '×' + eq.d + '×' + eq.h + ' mm',
        { type: 'equipment', equipKey: k, w: eq.w, d: eq.d, h: eq.h, label: eq.label },
        null
      );
    }
    sec('Tools');
    actionCard('🏗', tx('ed_shieldWall','Shield Wall'), iwTool === 'shieldwall', false, c => {
      setTool('shieldwall', c);
      document.getElementById('iwStatus').textContent = tx('ed_shieldWallToolHint','Click a roof edge to toggle a parapet.');
    });
    actionCard('✕', tx('ed_eraseItem','Erase item'),  iwTool === 'erase',      true,  c => {
      setTool('erase', c);
      document.getElementById('iwStatus').textContent = tx('ed_eraseItemHint','Click a roof item or cutout to remove it.');
    });
  }
}

/**
 * Top-down SVG icon for each rooftop equipment type, sized to a 28×28 box.
 * Shape-specific decoration (louvers, fan rings, FRP panel grid, etc.) matches
 * the 3D STL so the toolbox card reads as a recognizable footprint at a glance.
 * Aspect ratio is preserved against the largest item in ROOFTOP_EQUIPMENT so
 * relative sizes between cards are visually proportional.
 */
export function equipmentIcon(key) {
  const eq = ROOFTOP_EQUIPMENT[key];
  if (!eq) return '⬜';
  const SZ = 28;
  // Scale all items against the same max dimension so icons stay comparable.
  let maxDim = 0;
  for (const e of Object.values(ROOFTOP_EQUIPMENT)) {
    maxDim = Math.max(maxDim, e.w, e.d);
  }
  // Cap by visual budget so even the largest fills most of the box.
  const k = (SZ - 4) / maxDim;
  const w = Math.max(4, eq.w * k);
  const d = Math.max(4, eq.d * k);
  const ox = (SZ - w) / 2, oy = (SZ - d) / 2;
  const cx = SZ / 2, cy = SZ / 2;
  const fill = '#cdd9e0', stroke = '#3a4a5a';
  let body;
  switch (eq.shape) {
    case 'box_louvered': {
      const louvers = (eq.details && eq.details.louverCount) || 5;
      let lines = '';
      for (let i = 1; i < louvers; i++) {
        const ly = oy + (d * i) / louvers;
        lines += `<line x1="${(ox+1).toFixed(2)}" y1="${ly.toFixed(2)}" x2="${(ox+w-1).toFixed(2)}" y2="${ly.toFixed(2)}" stroke="${stroke}" stroke-width="0.5" opacity="0.65"/>`;
      }
      body = `<rect x="${ox.toFixed(2)}" y="${oy.toFixed(2)}" width="${w.toFixed(2)}" height="${d.toFixed(2)}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>${lines}`;
      break;
    }
    case 'cooling_tower': {
      const r = Math.min(w, d) * 0.32;
      body = `<rect x="${ox.toFixed(2)}" y="${oy.toFixed(2)}" width="${w.toFixed(2)}" height="${d.toFixed(2)}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`
           + `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(2)}" fill="none" stroke="${stroke}" stroke-width="1"/>`
           + `<line x1="${(cx-r).toFixed(2)}" y1="${cy}" x2="${(cx+r).toFixed(2)}" y2="${cy}" stroke="${stroke}" stroke-width="0.8"/>`
           + `<line x1="${cx}" y1="${(cy-r).toFixed(2)}" x2="${cx}" y2="${(cy+r).toFixed(2)}" stroke="${stroke}" stroke-width="0.8"/>`;
      break;
    }
    case 'tank_round_legged': {
      const r = Math.min(w, d) / 2;
      body = `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(2)}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`
           + `<circle cx="${cx}" cy="${cy}" r="${(r * 0.7).toFixed(2)}" fill="none" stroke="${stroke}" stroke-width="0.5" opacity="0.6"/>`;
      break;
    }
    case 'tank_square_legged': {
      body = `<rect x="${ox.toFixed(2)}" y="${oy.toFixed(2)}" width="${w.toFixed(2)}" height="${d.toFixed(2)}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`
           + `<line x1="${(ox+w/2).toFixed(2)}" y1="${oy.toFixed(2)}" x2="${(ox+w/2).toFixed(2)}" y2="${(oy+d).toFixed(2)}" stroke="${stroke}" stroke-width="0.5" opacity="0.6"/>`
           + `<line x1="${ox.toFixed(2)}" y1="${(oy+d/2).toFixed(2)}" x2="${(ox+w).toFixed(2)}" y2="${(oy+d/2).toFixed(2)}" stroke="${stroke}" stroke-width="0.5" opacity="0.6"/>`;
      break;
    }
    case 'mushroom': {
      const r = Math.min(w, d) / 2;
      body = `<circle cx="${cx}" cy="${cy}" r="${r.toFixed(2)}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`
           + `<circle cx="${cx}" cy="${cy}" r="${(r * 0.45).toFixed(2)}" fill="${stroke}"/>`;
      break;
    }
    case 'cabinet_tall': {
      body = `<rect x="${ox.toFixed(2)}" y="${oy.toFixed(2)}" width="${w.toFixed(2)}" height="${d.toFixed(2)}" fill="#d6d2c4" stroke="#4a4030" stroke-width="1"/>`
           + `<line x1="${(ox+w/2).toFixed(2)}" y1="${(oy+1.5).toFixed(2)}" x2="${(ox+w/2).toFixed(2)}" y2="${(oy+d-1.5).toFixed(2)}" stroke="#4a4030" stroke-width="0.5"/>`;
      break;
    }
    case 'antenna': {
      const bw = Math.max(4, Math.min(w, d));
      body = `<rect x="${(cx - bw/2).toFixed(2)}" y="${(cy - bw/2).toFixed(2)}" width="${bw.toFixed(2)}" height="${bw.toFixed(2)}" fill="#3a4a5a" stroke="#1a2a3a" stroke-width="0.5"/>`
           + `<circle cx="${cx}" cy="${cy}" r="1.4" fill="#1a2a3a"/>`;
      break;
    }
    default:
      body = `<rect x="${ox.toFixed(2)}" y="${oy.toFixed(2)}" width="${w.toFixed(2)}" height="${d.toFixed(2)}" fill="#ccc" stroke="#888" stroke-width="1"/>`;
  }
  return `<svg width="${SZ}" height="${SZ}" viewBox="0 0 ${SZ} ${SZ}" xmlns="http://www.w3.org/2000/svg" style="display:block">${body}</svg>`;
}

/* ---- Topbar: properties / controls of the active tool or selected object ---- */
export function iwPopulateTopbar() {
  const bar = document.getElementById('iwTopbar');
  if (!bar) return;
  bar.innerHTML = '';

  const tb = editorTopbarKit(bar);
  const addLbl = text => tb.label(text);
  const addSep = () => tb.sep();

  // Roof cladding style picker — always visible at the start of the
  // roof-tab topbar so the user can swap roof textures (kawara, ribbed
  // metal, etc.) without leaving the editor. Same CLADDING_STYLES list
  // as the wall cladding selector; defaults to the existing
  // CONFIG.roofCladdingStyle (or wall cladding as a fallback). Change
  // triggers a full regenerate so the parts panel and 3D preview update,
  // plus an iwRender so the overlay (when toggled on) reflects the new
  // style immediately.
  if (iwIsRoof()) {
    addLbl(tx('ed_cladding','Cladding'));
    const sel = document.createElement('select');
    sel.className = 'oe-tb-btn';
    sel.style.cssText = 'padding:2px 4px;font-size:11px;height:24px;';
    sel.title = tx('ed_roofCladdingStyle','Roof cladding style');
    for (const [k, v] of Object.entries(CLADDING_STYLES)) {
      const opt = document.createElement('option');
      opt.value = k; opt.textContent = v.label;
      sel.appendChild(opt);
    }
    sel.value = CONFIG.roofCladdingStyle || CONFIG.claddingStyle || '';
    sel.addEventListener('change', () => {
      CONFIG.roofCladdingStyle = sel.value;
      // Keep the form widget in the left panel in sync so the user sees
      // their choice reflected there too.
      const leftSel = document.getElementById('roofCladdingStyle');
      if (leftSel) leftSel.value = sel.value;
      writeForm();  // refresh description + visibility logic in left panel
      regenerate(); // rebuild parts panel + 3D preview
      iwRender();   // refresh overlay if it's currently visible
    });
    // Block editor keyboard shortcuts while the dropdown has focus so
    // arrow-keys navigate the options rather than triggering delete or
    // other canvas-level actions.
    sel.addEventListener('keydown', e => e.stopPropagation(), true);
    bar.appendChild(sel);
    addSep();
  }

  // Shared grid control. The floating FAB input is kept for quick access,
  // but the topbar is now the shared-framework control and keeps both
  // values synchronized.
  editorAddGridControls(bar, {
    title: tx('ed_grid','Grid'),
    xyLabel: tx('ed_step','Step'),
    xyStep: {
      title: tx('ed_grid','Floor/roof editor grid spacing in mm'),
      value: iwGrid(), step: 1, min: 1, max: 50, width: 42,
      onChange: v => {
        iwGridValue = v;
        const fab = document.getElementById('iwGridInput');
        if (fab) fab.value = String(v);
        iwRender();
      },
    },
  });
  addSep();

  if (iwTool === 'draw' && !iwIsRoof()) {
    addLbl(tx('ed_drawMode','DRAW MODE'));
    const hint = document.createElement('span');
    hint.style.cssText = 'font-size:11px;color:var(--muted);padding:0 8px;';
    hint.textContent = tx('ed_drawHint','Click & drag on the plan to place a wall. Release to commit.');
    bar.appendChild(hint);
    addSep();
    addLbl(tx('ed_snap','SNAP'));
    const snap = document.createElement('span');
    snap.style.cssText = 'font-size:11px;color:var(--muted);padding:0 6px;';
    snap.textContent = tx('ed_snapAxis','Axis-aligned only (H or V)');
    bar.appendChild(snap);

  } else if (iwTool === 'erase') {
    addLbl(tx('ed_eraseMode','ERASE MODE'));
    const hint = document.createElement('span');
    hint.style.cssText = 'font-size:11px;color:var(--muted);padding:0 8px;';
    hint.textContent = iwIsRoof() ? tx('ed_eraseRoofHint','Click a roof item to remove it.') : tx('ed_eraseWallHint','Click a wall to delete it.');
    bar.appendChild(hint);

  } else if (iwTool === 'shieldwall' && iwIsRoof()) {
    addLbl(tx('ed_shieldWall','SHIELD WALL'));
    const hint = document.createElement('span');
    hint.style.cssText = 'font-size:11px;color:var(--muted);padding:0 8px;';
    hint.textContent = tx('ed_shieldHint','Drag the square corner handles to resize the enclosure, the dashed body to move it, the white round handles to resize each wall, click + to add an opening.');
    bar.appendChild(hint);

  } else if (iwDragItem) {
    addLbl(tx('ed_placing','PLACING'));
    const hint = document.createElement('span');
    hint.style.cssText = 'font-size:11px;color:var(--muted);padding:0 8px;';
    hint.textContent = (iwDragItem.label || iwDragItem.type) + ' — ' + tx('ed_placeRelease','release over the plan to place.');
    bar.appendChild(hint);

  } else if (!iwIsRoof() && iwSelection.length === 1 && iwSelection[0].type === 'railZone') {
    const z = (iwTarget().embeddedRails || [])[iwSelection[0].idx];
    if (z) {
      addLbl('RAIL');
      const dir = document.createElement('select');
      dir.className = 'oe-tb-btn';
      dir.style.cssText = 'padding:2px 4px;font-size:11px;height:24px;';
      dir.title = 'Track direction. Auto follows the rectangle long axis.';
      const opts = [
        ['auto', `Auto: long axis (${embeddedRailOrientation(z).toUpperCase()})`],
        ['ns', 'N/S'],
        ['ew', 'E/W'],
      ];
      for (const [value, label] of opts) {
        const opt = document.createElement('option');
        opt.value = value; opt.textContent = label;
        dir.appendChild(opt);
      }
      dir.value = z.orientation || 'auto';
      dir.addEventListener('change', () => {
        z.orientation = dir.value;
        iwClampRailTrackOffset(z);
        regenerate();
        iwRender();
      });
      dir.addEventListener('keydown', e => e.stopPropagation(), true);
      bar.appendChild(dir);
      const hint = document.createElement('span');
      hint.style.cssText = 'font-size:11px;color:var(--muted);padding:0 8px;';
      const info = iwRailTrackAcrossInfo(z);
      hint.textContent = `Effective direction: ${embeddedRailOrientation(z).toUpperCase()} · rail offset ${((z.trackOffset || 0)).toFixed(1)}mm (drag the dark rail line to move it inside the zone)`;
      bar.appendChild(hint);
    }

  } else {
    // Default: inter-floor note or empty
    if (iwFloor === IW_INTER) {
      addLbl('NOTE');
      const note = document.createElement('span');
      note.style.cssText = 'font-size:11px;color:var(--muted);padding:0 8px;';
      note.textContent = 'Wall layout is shared across all intermediate floors.';
      bar.appendChild(note);
    }
  }

  // Shared align/distribute/clipboard group. Same framework as the wall
  // editor; the floor/roof editor keeps centre-based distribution, while the
  // wall editor uses equal-gap distribution.
  const selCount = iwSelection.length;
  const group = document.createElement('div');
  group.style.cssText = 'margin-left:auto;display:flex;align-items:center;gap:2px;';
  bar.appendChild(group);

  editorAddAlignmentGroup(bar, {
    parent: group,
    showLabels: false,
    addSeparator: false,
    alignCount: selCount,
    distributeCount: selCount,
    onAlign: mode => { iwAlignSelected(mode); iwRender(); },
    onDistribute: axis => { iwDistributeSelected(axis); iwRender(); },
  });

  const s1 = document.createElement('div');
  s1.style.cssText = 'width:1px;height:18px;background:#cbd2da;margin:0 3px;';
  group.appendChild(s1);

  editorAddClipboardGroup(bar, {
    parent: group,
    canCopy: selCount >= 1,
    canPaste: iwClipboard.length > 0,
    canDelete: selCount >= 1,
    copyTitle: selCount >= 1 ? tx('ed_copyTitle','Copy (Ctrl/Cmd+C)') : tx('ed_copySelectTitle','Copy (select ≥ 1)'),
    pasteTitle: iwClipboard.length > 0 ? tx('ed_pasteTitle','Paste (Ctrl/Cmd+V)') : tx('ed_pasteEmptyTitle','Paste (clipboard empty)'),
    deleteTitle: selCount >= 1 ? tx('ed_deleteSelectedTitle','Delete selected (Delete)') : tx('ed_deleteSelectTitle','Delete (select ≥ 1)'),
    onCopy: () => { iwCopySelected(); iwPopulateTopbar(); },
    onPaste: () => { iwPasteClipboard(); iwRender(); },
    onDelete: () => { iwDeleteSelected(); iwRender(); },
  });
}

export function iwGrid()  { return Math.max(1, Number(iwGridValue) || 5); }
export function iwSnap(v) { const g = iwGrid(); return Math.round(v / g) * g; }
// Clamp-aware snap: normal grid snapping in the middle of the footprint, but
// exact edges win when the dragged coordinate is within one grid step. This
// prevents a non-grid-multiple floor/roof edge from becoming unreachable while
// grid snapping is enabled.
export function iwSnapEdgeAware(v, min, max) {
  min = Number(min) || 0;
  max = Number(max);
  if (!isFinite(max)) max = min;
  if (max < min) max = min;
  const g = iwGrid();
  const clamped = Math.max(min, Math.min(max, Number(v) || 0));
  if (clamped <= min + g) return min;
  if (clamped >= max - g) return max;
  return Math.max(min, Math.min(max, iwSnap(clamped)));
}
// Snap a coordinate to the building boundary if within one grid unit.
export function iwSnapAxis(v, max) {
  return iwSnapEdgeAware(v, 0, max);
}
export function iwSnapPt(x, y) {
  const { bW, bD } = iwBounds();
  return { x: iwSnapAxis(x, bW), y: iwSnapAxis(y, bD) };
}
export function iwBounds() {
  // Wing mode: editor canvas is the wing's interior footprint, not main's.
  // Same fbWidth/sideLen convention as main — both apply the matT inset
  // along the front-back direction so the canvas matches the actual
  // roof / floor cut area rather than the outer wall envelope.
  if (iwWingIndex != null && iwWingPlan) {
    return { bW: iwWingPlan.fbWidth - 2 * iwWingPlan.matT, bD: iwWingPlan.sideLen };
  }
  if (!lastPlan) return { bW: 60, bD: 40 };
  return { bW: lastPlan.fbWidth - 2 * lastPlan.matT, bD: lastPlan.sideLen };
}


export function iwTrussColumnPreviewEtches() {
  // Non-editable preview of the same truss support footprints that are etched
  // onto generated floor pieces. Trusses/support columns are placement guides
  // only: they do not create floor cutouts, and they should not be selectable
  // in the floor editor. The generator returns etches in the floor part's
  // outer frame (including wall thickness margins). The floor editor uses the
  // interior working frame, so subtract matT from both axes before drawing.
  if (iwIsRoof()) return [];
  const blockCfg = (iwWingIndex != null && iwWingCfg) ? iwWingCfg : CONFIG;
  const blockPlan = (iwWingIndex != null && iwWingPlan) ? iwWingPlan : lastPlan;
  if (!blockCfg || !blockPlan || !blockCfg.trusses || !blockCfg.trusses.enabled || !blockCfg.trusses.supports) return [];
  try {
    const res = generateColumnSupportsForBlock(blockCfg, blockPlan, '', '', null);
    const matT = blockPlan.matT || blockCfg.coreThickness || CONFIG.coreThickness || 1.5;
    const { bW, bD } = iwBounds();
    return (res.etches || [])
      .map(e => ({
        type: 'etch',
        x1: e.x1 - matT, y1: e.y1 - matT,
        x2: e.x2 - matT, y2: e.y2 - matT,
      }))
      // Clip obvious out-of-editor guide lines so odd legacy configs do not
      // splash marks outside the editable floor rectangle.
      .filter(e => {
        const minX = Math.min(e.x1, e.x2), maxX = Math.max(e.x1, e.x2);
        const minY = Math.min(e.y1, e.y2), maxY = Math.max(e.y1, e.y2);
        return maxX >= -0.01 && minX <= bW + 0.01 && maxY >= -0.01 && minY <= bD + 0.01;
      })
      .map(e => ({
        type: 'etch',
        x1: Math.max(0, Math.min(bW, e.x1)),
        y1: Math.max(0, Math.min(bD, e.y1)),
        x2: Math.max(0, Math.min(bW, e.x2)),
        y2: Math.max(0, Math.min(bD, e.y2)),
      }));
  } catch (err) {
    console.warn('Unable to preview truss column footprints in floor editor', err);
    return [];
  }
}

export function iwMainFloorConnectedRects() {
  // The floor editor's primary coordinate frame is the main building's usable
  // floor rectangle: x=0..bW and y=0..bD. When the building has wings, the
  // exported floor part is a merged footprint, but the editor used to zoom to
  // only the main rectangle. Return simple context rectangles for the attached
  // wing floor areas so the main-floor editor can show the whole connected
  // footprint without changing the persisted coordinate system for existing
  // holes, walls, rails, and roof items.
  if (iwIsRoof() || iwWingIndex != null || !lastPlan) return [];
  const wings = CONFIG.wings || [];
  if (!wings.length) return [];
  const { bW, bD } = iwBounds();
  const matT = lastPlan.matT || CONFIG.coreThickness || 1.5;
  const rects = [{ kind: 'main', x: 0, y: 0, w: bW, h: bD }];

  for (const w of wings) {
    if (!w || !w.face) continue;
    const ext = Math.max(0, (typeof wingOuterDepth === 'function') ? wingOuterDepth(w) : (Number(w.depth) || 0));
    const span = Math.max(0, Number(w.span) || 0);
    const off  = Number(w.offset) || 0;
    if (ext <= 0 || span <= 0) continue;
    // Wing offsets are stored against the wall/floor outline. Shift by matT so
    // they visually line up with this editor's interior floor coordinate frame.
    const a = off - matT;
    if (w.face === 'front') rects.push({ kind: 'wing', face: 'front', x: a,       y: -ext, w: span, h: ext });
    if (w.face === 'back')  rects.push({ kind: 'wing', face: 'back',  x: a,       y: bD,   w: span, h: ext });
    if (w.face === 'east')  rects.push({ kind: 'wing', face: 'east',  x: bW,      y: a,    w: ext,  h: span });
    if (w.face === 'west')  rects.push({ kind: 'wing', face: 'west',  x: -ext,    y: a,    w: ext,  h: span });
  }
  return rects;
}

export function iwViewExtents() {
  // View extents may be larger than editable bounds. This lets users see the
  // connected main + wing floor footprint while preserving the current object
  // coordinate system and clamps for the actual editable main floor.
  const { bW, bD } = iwBounds();
  const rects = iwMainFloorConnectedRects();
  if (!rects.length) return { minX: 0, minY: 0, maxX: bW, maxY: bD, w: bW, h: bD };
  let minX = 0, minY = 0, maxX = bW, maxY = bD;
  for (const r of rects) {
    minX = Math.min(minX, r.x);
    minY = Math.min(minY, r.y);
    maxX = Math.max(maxX, r.x + r.w);
    maxY = Math.max(maxY, r.y + r.h);
  }
  return { minX, minY, maxX, maxY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) };
}

export function iwFitView() {
  const wrap = document.getElementById('iwCanvasWrap');
  if (!wrap) return;
  const ext = iwViewExtents();
  const pad = 56;
  const sx = (wrap.clientWidth  - pad * 2) / ext.w;
  const sy = (wrap.clientHeight - pad * 2) / ext.h;
  iwScale = Math.max(1, Math.min(12, Math.min(sx, sy)));
  iwOffX = (wrap.clientWidth  - ext.w * iwScale) / 2;
  iwOffY = (wrap.clientHeight - ext.h * iwScale) / 2;
}

export function iwPX(x, y) {
  const ext = iwViewExtents();
  return { x: iwOffX + (x - ext.minX) * iwScale, y: iwOffY + (y - ext.minY) * iwScale };
}
export function iwMM(px,py) {
  const ext = iwViewExtents();
  return { x: ext.minX + (px - iwOffX) / iwScale, y: ext.minY + (py - iwOffY) / iwScale };
}
export function iwClamp(pt, bW, bD) { return { x: Math.max(0, Math.min(bW, pt.x)), y: Math.max(0, Math.min(bD, pt.y)) }; }

export function iwAxisAlign(start, end) {
  const dx = Math.abs(end.x - start.x), dy = Math.abs(end.y - start.y);
  return dx >= dy ? { ...end, y: start.y } : { ...end, x: start.x };
}

export function iwRender() {
  const svg  = document.getElementById('iwSvg');
  const wrap = document.getElementById('iwCanvasWrap');
  if (!svg || !wrap) return;
  // Sync the topbar's align/distribute/clipboard buttons with the current
  // selection state. iwPopulateTopbar inspects iwSelection.length and
  // iwClipboard.length to decide which buttons are enabled, so calling
  // it from here keeps the affordances accurate after every mouse
  // event that mutates the selection (mousedown, mouseup, outside-click
  // deselect, multi-select via shift-click) without each call site
  // having to remember to refresh the topbar itself.
  iwPopulateTopbar();
  const W = wrap.clientWidth, H = wrap.clientHeight;
  svg.setAttribute('width', W); svg.setAttribute('height', H);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

  const { bW, bD } = iwBounds();
  const matT   = lastPlan?.matT || CONFIG.coreThickness || 1.5;
  const g      = iwGrid();
  const erasing = iwTool === 'erase';
  const isRoof  = iwIsRoof();

  // Cladding FAB — visible only on the roof tab. Hide both the separator
  // before it and the button itself when we're on a floor view. Updating
  // the button's active state here so a tab switch with cladding-on
  // immediately re-syncs the visual.
  const cladBtn = document.getElementById('iwCladBtn');
  const cladSep = document.getElementById('iwCladSep');
  if (cladBtn) {
    cladBtn.style.display = isRoof ? '' : 'none';
    cladBtn.classList.toggle('tb-active', isRoof && iwShowCladding);
  }
  if (cladSep) cladSep.style.display = isRoof ? '' : 'none';

  let h = `<rect width="${W}" height="${H}" fill="#e0e0d8"/>`;

  // Grid dots
  for (let x = 0; x <= bW + 0.01; x += g) {
    for (let y = 0; y <= bD + 0.01; y += g) {
      const p = iwPX(x, y);
      if (p.x >= 2 && p.x <= W - 2 && p.y >= 2 && p.y <= H - 2)
        h += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="1" fill="#bbb"/>`;
    }
  }

  // Connected floor context: when editing the main floor of a winged
  // building, draw the attached wing floor rectangles in the same canvas so
  // the user can see the whole merged floor footprint. These are visual
  // context only in this pass; object editing still uses the existing main
  // floor coordinate/clamp rules.
  const connectedRects = iwMainFloorConnectedRects();
  if (!isRoof && iwWingIndex == null && connectedRects.length > 1) {
    for (const r of connectedRects.filter(rr => rr.kind === 'wing')) {
      const a = iwPX(r.x, r.y);
      const b = iwPX(r.x + r.w, r.y + r.h);
      h += `<rect x="${Math.min(a.x,b.x).toFixed(1)}" y="${Math.min(a.y,b.y).toFixed(1)}" `
        + `width="${Math.abs(b.x-a.x).toFixed(1)}" height="${Math.abs(b.y-a.y).toFixed(1)}" `
        + `fill="rgba(42,100,170,0.08)" stroke="rgba(42,100,170,0.55)" stroke-width="1.4" stroke-dasharray="6 4" pointer-events="none"/>`;
    }
    const ext = iwViewExtents();
    const ea = iwPX(ext.minX, ext.minY);
    const eb = iwPX(ext.maxX, ext.maxY);
    h += `<rect x="${ea.x.toFixed(1)}" y="${ea.y.toFixed(1)}" width="${(eb.x-ea.x).toFixed(1)}" height="${(eb.y-ea.y).toFixed(1)}" `
      + `fill="none" stroke="rgba(42,100,170,0.35)" stroke-width="1" stroke-dasharray="2 5" pointer-events="none"/>`;
    h += `<text x="${ea.x.toFixed(1)}" y="${(ea.y - 10).toFixed(1)}" font-size="10" font-family="system-ui" fill="#2a64aa" pointer-events="none">connected floor context</text>`;
  }

  // Building footprint
  const fp = iwPX(0, 0), fpR = iwPX(bW, bD);
  const fpW = (fpR.x - fp.x).toFixed(1), fpH = (fpR.y - fp.y).toFixed(1);
  const roofFill = isRoof ? '#d8e8d0' : '#fff';
  h += `<rect x="${fp.x.toFixed(1)}" y="${fp.y.toFixed(1)}" width="${fpW}" height="${fpH}" fill="${roofFill}" stroke="#555" stroke-width="2"/>`;

  // Floor donut / wire-access opening preview. This is a generated cut in
  // the exported floor SVG, not a draggable object; the edge frame remains
  // intact and all normal floor holes/rail zones still render on top.
  if (!isRoof && CONFIG.floorOutlineOpening) {
    const mainOpen = floorOutlineOpeningRectFor(CONFIG, 0, 0, bW, bD);
    if (mainOpen) {
      const oa = iwPX(mainOpen.x, mainOpen.y);
      const ob = iwPX(mainOpen.x + mainOpen.w, mainOpen.y + mainOpen.h);
      h += `<rect x="${Math.min(oa.x,ob.x).toFixed(1)}" y="${Math.min(oa.y,ob.y).toFixed(1)}" `
        + `width="${Math.abs(ob.x-oa.x).toFixed(1)}" height="${Math.abs(ob.y-oa.y).toFixed(1)}" `
        + `fill="rgba(255,255,255,0.72)" stroke="#c84a3a" stroke-width="1.8" stroke-dasharray="7 3" pointer-events="none"/>`;
      h += `<text x="${((oa.x+ob.x)/2).toFixed(1)}" y="${((oa.y+ob.y)/2).toFixed(1)}" font-size="10" font-family="system-ui" fill="#9c382b" text-anchor="middle" dominant-baseline="middle" pointer-events="none">wire access opening</text>`;
    }
  }

  // Truss column footprint placement guides — preview the same etched outlines
  // that appear on the generated floor SVG. These are non-interactive guides;
  // supports/trusses still do not cut or slot through the floor.
  if (!isRoof) {
    const trussEtches = iwTrussColumnPreviewEtches();
    if (trussEtches.length) {
      for (const e of trussEtches) {
        const a = iwPX(e.x1, e.y1);
        const b = iwPX(e.x2, e.y2);
        h += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="rgba(42,100,170,0.7)" stroke-width="1" stroke-dasharray="3 2" pointer-events="none"/>`;
      }
      const label = trussEtches[0];
      const lp = iwPX(Math.max(1, Math.min(bW - 1, label.x1)), Math.max(1, Math.min(bD - 1, label.y1)));
      h += `<text x="${lp.x.toFixed(1)}" y="${(lp.y - 5).toFixed(1)}" font-size="9" font-family="system-ui" fill="#2a64aa" pointer-events="none">truss column footprint</text>`;
    }
  }

  // Roof cladding overlay — drawn UNDER any placed items (mech rooms,
  // billboards, equipment) so users can still see and interact with them,
  // and OVER the green roof-fill so the colour reads as the panel base
  // colour beneath the pattern. Same generateCladdingPattern helper as the
  // wall editor uses; coords are in roof-plan-mm and get converted to
  // canvas pixels via iwPX.
  if (isRoof && iwShowCladding) {
    const styleKey = CONFIG.roofCladdingStyle || CONFIG.claddingStyle;
    const styleSpec = CLADDING_STYLES[styleKey];
    if (styleSpec) {
      // Translucent base tint over the green roof fill so the pattern
      // reads with the right material colour underneath
      h += `<rect x="${fp.x.toFixed(1)}" y="${fp.y.toFixed(1)}" width="${fpW}" height="${fpH}" fill="rgba(190,175,158,0.5)" pointer-events="none"/>`;
      const segs = generateCladdingPattern(styleSpec, 0, 0, bW, bD, [], null);
      for (const seg of segs) {
        const a = iwPX(seg.x1, seg.y1);
        const b = iwPX(seg.x2, seg.y2);
        h += `<line x1="${a.x.toFixed(2)}" y1="${a.y.toFixed(2)}" x2="${b.x.toFixed(2)}" y2="${b.y.toFixed(2)}" stroke="rgba(70,50,30,0.55)" stroke-width="0.6" pointer-events="none"/>`;
      }
    }
  }

  // Gabled roof ridge guide. This is preview-only in the flat roof editor:
  // it shows both the centre ridge and the extra cladding bridge/gap created
  // because the two rigid roof panels do not fully touch as a single flat
  // surface at the peak. It does not export as a cut/etch line.
  if (isRoof && (CONFIG.roofStyle === 'gabled' || CONFIG.roofStyle === 'parapet_gable')) {
    const ridgeDir = CONFIG.roofRidgeDirection || 'ew';
    const isEW = ridgeDir === 'ew';
    const pitch = CONFIG.roofPitch || 10;
    const halfSpan = isEW ? bD / 2 : bW / 2;
    const ridgeGap = 2 * matT * Math.tan(Math.atan2(pitch, Math.max(0.001, halfSpan)));
    const gapPx = Math.max(3, ridgeGap * iwScale);

    const a = isEW ? iwPX(0, bD / 2) : iwPX(bW / 2, 0);
    const b = isEW ? iwPX(bW, bD / 2) : iwPX(bW / 2, bD);

    // Ridge bridge band, centred on the ridge line.
    if (isEW) {
      h += `<rect x="${fp.x.toFixed(1)}" y="${(a.y - gapPx / 2).toFixed(1)}" width="${fpW}" height="${gapPx.toFixed(1)}" `
        + `fill="rgba(255,145,0,0.14)" stroke="rgba(184,92,0,0.45)" stroke-width="0.8" stroke-dasharray="4 3" pointer-events="none"/>`;
    } else {
      h += `<rect x="${(a.x - gapPx / 2).toFixed(1)}" y="${fp.y.toFixed(1)}" width="${gapPx.toFixed(1)}" height="${fpH}" `
        + `fill="rgba(255,145,0,0.14)" stroke="rgba(184,92,0,0.45)" stroke-width="0.8" stroke-dasharray="4 3" pointer-events="none"/>`;
    }

    const labelX = isEW ? (a.x + b.x) / 2 : (a.x + 8);
    const labelY = isEW ? (a.y - gapPx / 2 - 7) : ((a.y + b.y) / 2);
    const labelTransform = isEW ? '' : ` transform="rotate(-90 ${labelX.toFixed(1)} ${labelY.toFixed(1)})"`;
    h += `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" `
      + `stroke="#b85c00" stroke-width="1.8" stroke-dasharray="8 5" pointer-events="none"/>`;
    h += `<text x="${labelX.toFixed(1)}" y="${labelY.toFixed(1)}" font-size="10" font-family="system-ui" `
      + `font-weight="600" fill="#9a4b00" text-anchor="middle" pointer-events="none"${labelTransform}>gable ridge / ${ridgeGap.toFixed(1)}mm bridge</text>`;
  }

  // Shield wall visualization — draw segments along each edge of the
  // shield's bounding rectangle, with gaps where openings are configured.
  // When the Shield Wall tool is active, additionally show:
  //   • the dashed bounding rect outline (so the user sees what to drag)
  //   • 4 square corner handles to resize the entire outline
  //   • a "move" handle inside the bounds to drag the whole thing around
  //   • dashed ghost strips along disabled edges
  //   • round drag handles at each wall segment's outer endpoints (resize)
  //   • a "+" badge at gap-less segment centres (click to add an opening)
  //   • round handles at the opening's endpoints (resize opening)
  // Handles use pointer-events: all so the mousedown handler can hit-test
  // them by reading e.target.dataset; everything else is pointer-events:
  // none so it doesn't swallow clicks on the body.
  if (isRoof) {
    const shield = CONFIG.rooftopShield || {};
    const sEnabled = !!shield.enabled;
    const edges = shield.edges || { front: true, back: true, east: true, west: true };
    const stripPx = Math.max(2, matT * iwScale);
    const toolActive = (iwTool === 'shieldwall');
    // Resolve the shield bounds in iw-coords (same fallback logic as
    // getShieldBounds in the generator — uses explicit `bounds` if set,
    // else an inset by `offset` from all four roof edges).
    const sOffset = (typeof shield.offset === 'number') ? shield.offset : 3;
    const bExplicit = shield.bounds && Number.isFinite(shield.bounds.x);
    const sb = bExplicit ? {
      x: Math.max(0, Math.min(bW - 6, shield.bounds.x)),
      y: Math.max(0, Math.min(bD - 6, shield.bounds.y)),
      w: Math.max(6, Math.min(bW - shield.bounds.x, shield.bounds.w)),
      h: Math.max(6, Math.min(bD - shield.bounds.y, shield.bounds.h)),
    } : {
      x: sOffset, y: sOffset,
      w: Math.max(6, bW - 2 * sOffset),
      h: Math.max(6, bD - 2 * sOffset),
    };
    const shW = sb.w;
    const shD = sb.h;

    // Map an edge-position (0..edgeLen) on a given side to a canvas
    // px point on the outer surface of the shield strip — the wall's
    // outward-facing edge sits ON the bounds rectangle's perimeter.
    function edgePointPx(side, edgePos) {
      if (side === 'front') return iwPX(sb.x + edgePos, sb.y);
      if (side === 'back')  return iwPX(sb.x + edgePos, sb.y + sb.h);
      if (side === 'west')  return iwPX(sb.x, sb.y + edgePos);
      /* east */            return iwPX(sb.x + sb.w, sb.y + edgePos);
    }
    // Returns {x, y, w, h} canvas-px for a strip running from edgePos a→b
    // on the given side. Strip extends INWARD from the bounds perimeter
    // so it visually represents the wall material thickness.
    function stripRectPx(side, a, b) {
      const p1 = edgePointPx(side, a);
      const p2 = edgePointPx(side, b);
      if (side === 'front') return { x: p1.x, y: p1.y,           w: p2.x - p1.x, h: stripPx };
      if (side === 'back')  return { x: p1.x, y: p1.y - stripPx, w: p2.x - p1.x, h: stripPx };
      if (side === 'west')  return { x: p1.x, y: p1.y,           w: stripPx, h: p2.y - p1.y };
      /* east */            return { x: p1.x - stripPx, y: p1.y, w: stripPx, h: p2.y - p1.y };
    }

    function drawHandle(side, edgePos, kind, idx) {
      // Place handles ON the bounds perimeter (where the wall's outer
      // edge sits). data-attrs let the mousedown handler identify what
      // to do without re-running hit math.
      const p = edgePointPx(side, edgePos);
      const r = (kind === 'open') ? 4.5 : 5.5;
      const fill = (kind === 'open') ? '#f7a000' : '#fff';
      const stroke = '#783718';
      return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r}" `
           + `fill="${fill}" stroke="${stroke}" stroke-width="1.5" `
           + `data-shield-handle="${kind}" data-shield-side="${side}" data-shield-idx="${idx||0}" `
           + `style="cursor:${(side==='front'||side==='back')?'ew-resize':'ns-resize'}" />`;
    }

    function drawPlusBadge(side, edgePos) {
      const p = edgePointPx(side, edgePos);
      // Centre the badge on the strip's inward face (offset half-strip
      // away from the bounds perimeter).
      let cx = p.x, cy = p.y;
      if (side === 'front') cy += stripPx / 2;
      if (side === 'back')  cy -= stripPx / 2;
      if (side === 'west')  cx += stripPx / 2;
      if (side === 'east')  cx -= stripPx / 2;
      return `<g data-shield-plus="${side}" style="cursor:pointer;">`
           + `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="6.5" fill="#fff" stroke="#783718" stroke-width="1.2"/>`
           + `<text x="${cx.toFixed(1)}" y="${(cy + 1).toFixed(1)}" font-size="11" font-family="system-ui" font-weight="700" fill="#783718" text-anchor="middle" dominant-baseline="middle" pointer-events="none">+</text>`
           + `</g>`;
    }

    // Bounds outline + move/resize affordances — visible only when the
    // Shield Wall tool is active, since they'd clutter the view in
    // normal use. The body-move rect covers the interior of the bounds
    // (minus a small margin) so clicks/drags there translate the
    // entire shield enclosure. The 4 corner squares resize the outline.
    if (toolActive && sEnabled) {
      const tlp = iwPX(sb.x, sb.y);
      const trp = iwPX(sb.x + sb.w, sb.y);
      const blp = iwPX(sb.x, sb.y + sb.h);
      const brp = iwPX(sb.x + sb.w, sb.y + sb.h);
      // Dashed outline shows the user the draggable region
      h += `<rect x="${tlp.x.toFixed(1)}" y="${tlp.y.toFixed(1)}" width="${(brp.x - tlp.x).toFixed(1)}" height="${(brp.y - tlp.y).toFixed(1)}" fill="none" stroke="rgba(120,55,25,0.5)" stroke-width="0.8" stroke-dasharray="6 4" pointer-events="none"/>`;
      // Body-move target: invisible rect inside the bounds, slightly
      // smaller so it doesn't overlap the wall strips / handles.
      const inset = stripPx + 4;
      if (brp.x - tlp.x > inset * 2 && brp.y - tlp.y > inset * 2) {
        h += `<rect x="${(tlp.x + inset).toFixed(1)}" y="${(tlp.y + inset).toFixed(1)}" `
           + `width="${(brp.x - tlp.x - inset * 2).toFixed(1)}" height="${(brp.y - tlp.y - inset * 2).toFixed(1)}" `
           + `fill="rgba(184,90,40,0.06)" stroke="none" `
           + `data-shield-bounds="move" style="cursor:move;"/>`;
      }
      // Corner resize handles (squares, distinct from the circular
      // wall-end handles so users can tell them apart at a glance).
      function cornerHandle(p, corner) {
        const s = 9;
        return `<rect x="${(p.x - s / 2).toFixed(1)}" y="${(p.y - s / 2).toFixed(1)}" width="${s}" height="${s}" `
             + `fill="#fff" stroke="#783718" stroke-width="1.5" `
             + `data-shield-bounds="${corner}" `
             + `style="cursor:${corner === 'tl' || corner === 'br' ? 'nwse-resize' : 'nesw-resize'};"/>`;
      }
      h += cornerHandle(tlp, 'tl');
      h += cornerHandle(trp, 'tr');
      h += cornerHandle(blp, 'bl');
      h += cornerHandle(brp, 'br');
    }

    for (const side of ['front', 'back', 'east', 'west']) {
      const edgeLen = (side === 'front' || side === 'back') ? shW : shD;
      const edgeState = edges[side];
      const segs = sEnabled ? shieldEdgeSegments(edgeState, edgeLen) : [];

      // Disabled-edge ghost (only when tool is active so it doesn't
      // clutter the view in normal use).
      if (toolActive && !segs.length) {
        const r = stripRectPx(side, 0, edgeLen);
        h += `<rect x="${r.x.toFixed(1)}" y="${r.y.toFixed(1)}" width="${r.w.toFixed(1)}" height="${r.h.toFixed(1)}" fill="rgba(184,90,40,0.10)" stroke="rgba(120,55,25,0.5)" stroke-width="0.6" stroke-dasharray="4 3" pointer-events="none"/>`;
        continue;
      }

      // Solid strips for each segment of the enabled edge
      for (const s of segs) {
        const r = stripRectPx(side, s.start, s.end);
        h += `<rect x="${r.x.toFixed(1)}" y="${r.y.toFixed(1)}" width="${r.w.toFixed(1)}" height="${r.h.toFixed(1)}" fill="rgba(184,90,40,0.55)" stroke="rgba(120,55,25,0.85)" stroke-width="0.6" pointer-events="none"/>`;
      }

      // Tool-active extras: drag handles for resize + opening + plus badge
      if (!toolActive || !sEnabled || !segs.length) continue;
      // Resolve the explicit edgeState into a normalized form so we can
      // surface segStart / segEnd / openingStart / openingEnd for handles.
      let segStart, segEnd, hasOpening, openStart, openEnd;
      if (edgeState === true) {
        segStart = 0; segEnd = edgeLen; hasOpening = false;
      } else {
        segStart = Math.max(0, edgeState.start || 0);
        segEnd   = Math.min(edgeLen, edgeState.end != null ? edgeState.end : edgeLen);
        if (edgeState.opening) {
          openStart = Math.max(segStart, edgeState.opening.start || 0);
          openEnd   = Math.min(segEnd, edgeState.opening.end != null ? edgeState.opening.end : openStart);
          hasOpening = openEnd > openStart + 0.5;
        }
      }
      // Outer resize handles (segment start + end)
      h += drawHandle(side, segStart, 'segStart');
      h += drawHandle(side, segEnd,   'segEnd');
      // Opening handles or "+" badge to add an opening
      if (hasOpening) {
        h += drawHandle(side, openStart, 'openStart');
        h += drawHandle(side, openEnd,   'openEnd');
      } else if (segEnd - segStart > 12) {
        // Plus badge only if the segment is long enough to fit a
        // reasonable opening (~8 mm) plus a bit of wall on each side
        h += drawPlusBadge(side, (segStart + segEnd) / 2);
      }
    }
  }

  // Dimension labels
  h += `<text x="${((fp.x+fpR.x)/2).toFixed(1)}" y="${(fp.y-8).toFixed(1)}" font-size="10" font-family="system-ui" fill="#888" text-anchor="middle">${bW.toFixed(1)} mm</text>`;
  h += `<text x="${(fp.x-8).toFixed(1)}" y="${((fp.y+fpR.y)/2).toFixed(1)}" font-size="10" font-family="system-ui" fill="#888" text-anchor="middle" transform="rotate(-90,${(fp.x-8).toFixed(1)},${((fp.y+fpR.y)/2).toFixed(1)})">${bD.toFixed(1)} mm</text>`;

  // Cardinal direction labels — N top, S bottom, E right, W left. Matches
  // the orientation used by the wall editor's footprint minimap and the
  // 3D preview so the user keeps the same mental model across editors.
  // Placed slightly outside the rect; dimension labels live above (top)
  // and to the left, so the cardinal letters offset further out and use
  // a bolder colour to read as orientation rather than measurement.
  const cxMid = (fp.x + fpR.x) / 2;
  const cyMid = (fp.y + fpR.y) / 2;
  const card = 'font-size="13" font-family="system-ui" font-weight="600" fill="#555" pointer-events="none"';
  h += `<text x="${cxMid.toFixed(1)}" y="${(fp.y - 22).toFixed(1)}" ${card} text-anchor="middle">N</text>`;
  h += `<text x="${cxMid.toFixed(1)}" y="${(fpR.y + 18).toFixed(1)}" ${card} text-anchor="middle" dominant-baseline="hanging">S</text>`;
  h += `<text x="${(fpR.x + 14).toFixed(1)}" y="${cyMid.toFixed(1)}" ${card} dominant-baseline="middle">E</text>`;
  h += `<text x="${(fp.x - 14).toFixed(1)}" y="${cyMid.toFixed(1)}" ${card} text-anchor="end" dominant-baseline="middle">W</text>`;

  if (!isRoof) {
    // ---- Floor view: draw walls ----
    const walls  = iwWalls();
    const wallPx = Math.max(1.5, matT * iwScale);

    walls.forEach((w, i) => {
      const p1 = iwPX(w.x1, w.y1), p2 = iwPX(w.x2, w.y2);
      const isH = Math.abs(w.y2 - w.y1) < 0.01;
      const len = isH ? Math.abs(w.x2 - w.x1) : Math.abs(w.y2 - w.y1);
      const col = erasing ? '#c44' : '#2a5a9a';
      h += `<line class="iw-wall" data-i="${i}" x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="${col}" stroke-width="${wallPx.toFixed(1)}" stroke-linecap="square" style="cursor:${erasing?'pointer':'default'}"/>`;
      if (iwScale > 3 && len > 5)
        h += `<text x="${((p1.x+p2.x)/2).toFixed(1)}" y="${((p1.y+p2.y)/2-5).toFixed(1)}" font-size="9" font-family="system-ui" fill="${col}" text-anchor="middle" pointer-events="none">${len.toFixed(0)}</text>`;
      if (!erasing && lastPlan) {
        const { tabPositions } = iwComputeTabs(i, walls, matT);
        const x0 = Math.min(w.x1, w.x2), y0 = Math.min(w.y1, w.y2);
        for (const tp of tabPositions) {
          const pp = iwPX(isH ? x0 + tp : w.x1, isH ? w.y1 : y0 + tp);
          const tl = Math.max(3, matT * iwScale / 2);
          if (isH) h += `<line x1="${pp.x.toFixed(1)}" y1="${(pp.y-tl).toFixed(1)}" x2="${pp.x.toFixed(1)}" y2="${(pp.y+tl).toFixed(1)}" stroke="#aad" stroke-width="1" pointer-events="none"/>`;
          else     h += `<line x1="${(pp.x-tl).toFixed(1)}" y1="${pp.y.toFixed(1)}" x2="${(pp.x+tl).toFixed(1)}" y2="${pp.y.toFixed(1)}" stroke="#aad" stroke-width="1" pointer-events="none"/>`;
        }
      }
    });

    // Wall drag preview
    if (iwDrag && !iwDragItem && iwDragPt && iwCurMM) {
      const cl = iwClamp(iwCurMM, bW, bD);
      const al = iwAxisAlign(iwDragPt, iwSnapPt(cl.x, cl.y));
      const p1 = iwPX(iwDragPt.x, iwDragPt.y), p2 = iwPX(al.x, al.y);
      h += `<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="#2a5a9a88" stroke-width="${wallPx.toFixed(1)}" stroke-dasharray="6,4" pointer-events="none"/>`;
    }
    // Cursor dot
    if (iwCurMM && !iwDrag) {
      const cl = iwClamp(iwCurMM, bW, bD);
      const sm = iwSnapPt(cl.x, cl.y);
      const sp = iwPX(sm.x, sm.y);
      h += `<circle cx="${sp.x.toFixed(1)}" cy="${sp.y.toFixed(1)}" r="3" fill="${erasing?'#c44':'#2a5a9a'}" stroke="white" stroke-width="1.5" pointer-events="none"/>`;
    }

    // Floor holes (circles & squares) — selectable like roof holes.
    // Selection flips stroke to the unified bright blue.
    const railZones = iwTarget().embeddedRails || [];
    railZones.forEach((z, i) => {
      const sel = !erasing && iwIsSelected('railZone', i);
      const rp = iwPX(z.x, z.y);
      const pw = (z.w || 30) * iwScale, ph = (z.h || 60) * iwScale;
      const sr = embeddedRailSafetyRect(z);
      const sp = iwPX(sr.x, sr.y);
      const spw = sr.w * iwScale, sph = sr.h * iwScale;
      const col = erasing ? '#c44' : (sel ? '#1f6dff' : '#6b5b22');
      h += `<rect class="iw-rail-zone" data-i="${i}" x="${rp.x.toFixed(1)}" y="${rp.y.toFixed(1)}" width="${pw.toFixed(1)}" height="${ph.toFixed(1)}" fill="rgba(160,125,35,0.12)" stroke="${col}" stroke-width="${sel ? 2.5 : 1.5}" stroke-dasharray="7,3" style="cursor:${erasing?'pointer':'move'}"/>`;
      h += `<rect x="${sp.x.toFixed(1)}" y="${sp.y.toFixed(1)}" width="${spw.toFixed(1)}" height="${sph.toFixed(1)}" fill="rgba(220,160,40,0.12)" stroke="#c6902a" stroke-width="1" stroke-dasharray="3,2" pointer-events="none"/>`;
      const isEW = embeddedRailOrientation(z) === 'ew';
      if (isEW) {
        const cy = z.y + z.h / 2 + (z.trackOffset || 0);
        const p1 = iwPX(z.x, cy), p2 = iwPX(z.x + z.w, cy);
        const railHitW = Math.max(12, ((embeddedRailProfile(z).sleeperWidthMm || 16) + 2) * iwScale);
        h += `<line class="iw-rail-track" data-i="${i}" x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="rgba(0,0,0,0)" stroke-width="${railHitW.toFixed(1)}" stroke-linecap="round" style="cursor:${erasing?'pointer':'grab'}"/>`;
        h += `<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="#333" stroke-width="2" pointer-events="none"/>`;
      } else {
        const cx = z.x + z.w / 2 + (z.trackOffset || 0);
        const p1 = iwPX(cx, z.y), p2 = iwPX(cx, z.y + z.h);
        const railHitW = Math.max(12, ((embeddedRailProfile(z).sleeperWidthMm || 16) + 2) * iwScale);
        h += `<line class="iw-rail-track" data-i="${i}" x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="rgba(0,0,0,0)" stroke-width="${railHitW.toFixed(1)}" stroke-linecap="round" style="cursor:${erasing?'pointer':'grab'}"/>`;
        h += `<line x1="${p1.x.toFixed(1)}" y1="${p1.y.toFixed(1)}" x2="${p2.x.toFixed(1)}" y2="${p2.y.toFixed(1)}" stroke="#333" stroke-width="2" pointer-events="none"/>`;
      }
      if (iwScale > 2) h += `<text x="${(rp.x + pw/2).toFixed(1)}" y="${(rp.y + ph/2 + 4).toFixed(1)}" font-size="8" font-family="system-ui" fill="${col}" text-anchor="middle" pointer-events="none">${embeddedRailOrientationLabel(z)} rail</text>`;
      if (sel) {
        const hs = 8;
        const handles = [
          ['nw', rp.x,       rp.y],
          ['n',  rp.x+pw/2,  rp.y],
          ['ne', rp.x+pw,    rp.y],
          ['e',  rp.x+pw,    rp.y+ph/2],
          ['se', rp.x+pw,    rp.y+ph],
          ['s',  rp.x+pw/2,  rp.y+ph],
          ['sw', rp.x,       rp.y+ph],
          ['w',  rp.x,       rp.y+ph/2],
        ];
        for (const [hn, hx, hy] of handles) {
          h += `<rect class="iw-rail-resize" data-i="${i}" data-handle="${hn}" x="${(hx-hs/2).toFixed(1)}" y="${(hy-hs/2).toFixed(1)}" width="${hs}" height="${hs}" rx="1.5" fill="#fff" stroke="#1f6dff" stroke-width="1.5" style="cursor:${iwRailResizeCursor(hn)}"/>`;
        }
      }
    });

    const floorHoles = iwTarget().floorHoles || [];
    floorHoles.forEach((hole, i) => {
      const sel = !erasing && iwIsSelected('floorHole', i);
      const col = erasing ? '#c44' : (sel ? '#1f6dff' : '#8840a0');
      const strokeW = (sel && !erasing) ? 2.5 : 1.5;
      const cursorVal = erasing ? 'pointer' : 'move';
      if (hole.shape === 'circle') {
        const r = (hole.d / 2) * iwScale;
        const cp = iwPX(hole.x, hole.y);
        h += `<circle class="iw-hole" data-i="${i}" cx="${cp.x.toFixed(1)}" cy="${cp.y.toFixed(1)}" r="${r.toFixed(1)}" fill="${erasing?'rgba(200,68,68,0.12)':'rgba(136,64,160,0.12)'}" stroke="${col}" stroke-width="${strokeW}" style="cursor:${cursorVal}"/>`;
        h += `<line x1="${(cp.x-r*.4).toFixed(1)}" y1="${cp.y.toFixed(1)}" x2="${(cp.x+r*.4).toFixed(1)}" y2="${cp.y.toFixed(1)}" stroke="${col}" stroke-width="0.7" pointer-events="none"/>`;
        h += `<line x1="${cp.x.toFixed(1)}" y1="${(cp.y-r*.4).toFixed(1)}" x2="${cp.x.toFixed(1)}" y2="${(cp.y+r*.4).toFixed(1)}" stroke="${col}" stroke-width="0.7" pointer-events="none"/>`;
        if (iwScale > 2) h += `<text x="${cp.x.toFixed(1)}" y="${(cp.y+r+9).toFixed(1)}" font-size="8" font-family="system-ui" fill="${col}" text-anchor="middle" pointer-events="none">⌀${hole.d}mm</text>`;
      } else {
        const hp = iwPX(hole.x - hole.w/2, hole.y - hole.h/2);
        const pw = hole.w * iwScale, ph = hole.h * iwScale;
        h += `<rect class="iw-hole" data-i="${i}" x="${hp.x.toFixed(1)}" y="${hp.y.toFixed(1)}" width="${pw.toFixed(1)}" height="${ph.toFixed(1)}" fill="${erasing?'rgba(200,68,68,0.12)':'rgba(136,64,160,0.12)'}" stroke="${col}" stroke-width="${strokeW}" style="cursor:${cursorVal}"/>`;
        if (iwScale > 2) h += `<text x="${(hp.x+pw/2).toFixed(1)}" y="${(hp.y+ph+9).toFixed(1)}" font-size="8" font-family="system-ui" fill="${col}" text-anchor="middle" pointer-events="none">${hole.w}×${hole.h}mm</text>`;
      }
    });
    // Hole drag ghost (floor tab)
    if (iwDragItem && iwDragItem.type === 'hole' && iwCurMM) {
      const cl = iwClamp(iwCurMM, bW, bD);
      const gp = iwPX(iwSnapAxis(cl.x, bW), iwSnapAxis(cl.y, bD));
      if (iwDragItem.shape === 'circle') {
        const r = (iwDragItem.d / 2) * iwScale;
        h += `<circle cx="${gp.x.toFixed(1)}" cy="${gp.y.toFixed(1)}" r="${r.toFixed(1)}" fill="rgba(136,64,160,0.15)" stroke="#8840a0" stroke-width="1.5" stroke-dasharray="4,3" pointer-events="none"/>`;
      } else {
        const pw = iwDragItem.w * iwScale, ph = iwDragItem.h * iwScale;
        h += `<rect x="${(gp.x-pw/2).toFixed(1)}" y="${(gp.y-ph/2).toFixed(1)}" width="${pw.toFixed(1)}" height="${ph.toFixed(1)}" fill="rgba(136,64,160,0.15)" stroke="#8840a0" stroke-width="1.5" stroke-dasharray="4,3" pointer-events="none"/>`;
      }
    }
    // Embedded rail drag ghost (floor tab)
    if (iwDragItem && iwDragItem.type === 'embeddedRail' && iwCurMM) {
      const cl = iwClamp(iwCurMM, bW, bD);
      const rw = iwDragItem.w || 27, rh = iwDragItem.h || 60;
      const ix = iwSnapEdgeAware(cl.x - rw / 2, 0, Math.max(0, bW - rw));
      const iy = iwSnapEdgeAware(cl.y - rh / 2, 0, Math.max(0, bD - rh));
      const gp = iwPX(ix, iy);
      h += `<rect x="${gp.x.toFixed(1)}" y="${gp.y.toFixed(1)}" width="${(rw*iwScale).toFixed(1)}" height="${(rh*iwScale).toFixed(1)}" fill="rgba(160,125,35,0.15)" stroke="#6b5b22" stroke-width="1.5" stroke-dasharray="7,3" pointer-events="none"/>`;
    }

    svg.innerHTML = h;
    if (erasing) {
      svg.querySelectorAll('.iw-wall').forEach(line => {
        line.addEventListener('click', e => {
          e.stopPropagation();
          CONFIG.internalWalls[0].splice(parseInt(line.dataset.i), 1);
          iwRender();
        });
      });
      svg.querySelectorAll('.iw-hole').forEach(el => {
        el.addEventListener('click', e => {
          e.stopPropagation();
          (iwTarget().floorHoles || []).splice(parseInt(el.dataset.i), 1);
          iwRender();
        });
      });
      svg.querySelectorAll('.iw-rail-zone').forEach(el => {
        el.addEventListener('click', e => {
          e.stopPropagation();
          (iwTarget().embeddedRails || []).splice(parseInt(el.dataset.i), 1);
          iwRender();
        });
      });
    } else {
      // Floor holes need their own direct drag binding in addition to the
      // delegated object-priority handler. The delegated handler prevents the
      // default Draw Wall tool from stealing the first click, but a direct
      // listener keeps placed holes draggable even after SVG re-renders or when
      // another floor tool is active. This mirrors the roof-hole/skylight drag
      // behavior and makes the hit target unambiguous.
      svg.querySelectorAll('.iw-hole').forEach(el => {
        el.addEventListener('mousedown', e => {
          if (!iwPrimaryPointer(e)) return;
          if (iwSpaceDown) return;
          e.stopPropagation();
          e.preventDefault();
          const idx = parseInt(el.dataset.i, 10);
          const ref = iwMakeRef('floorHole', idx);
          if (!ref) return;
          const additive = e.shiftKey;
          const wasSelected = iwIsSelected('floorHole', idx);
          if (additive) {
            iwSelect('floorHole', idx, true);
          } else if (!wasSelected) {
            iwSelect('floorHole', idx, false);
          }
          const items = iwSelection.map(s => {
            const r = iwMakeRef(s.type, s.idx);
            return r ? { ref: s, origX: r.bbox.x, origY: r.bbox.y } : null;
          }).filter(Boolean);
          iwDragMoving = { startMM: iwSvgPt(e), items, moved: false };
          iwDrag = false;
          iwDragPt = null;
          iwRender();
        });
      });
    }

  } else {
    // ---- Roof view: draw rooftop items ----
    const items = iwTarget().rooftopItems || [];
    const COLORS = { mechroom: ['#c0d8c0','#4a7a4a'], billboard: ['#d8d0b8','#7a6a30'], stlzone: ['#d8c8e0','#6a4a8a'], equipment: ['#cdd9e0','#3a4a5a'] };

    items.forEach((item, i) => {
      const p = iwPX(item.x, item.y);
      // Equipment items store their footprint as w (width = east-west) × d (depth = north-south).
      // Other item types historically used `h` as the depth field; keep that fallback.
      const itemDepth = (item.type === 'equipment') ? (item.d || 15) : (item.h || item.d || 15);
      const pw = (item.w || 20) * iwScale, pd = itemDepth * iwScale;
      const [fill, stroke] = COLORS[item.type] || ['#ccc','#888'];
      const isSelected = !erasing && iwIsSelected('item', i);
      // Moving = the user is currently dragging the selection AND this
      // item is part of it. iwDragMoving carries the original positions
      // for every selected ref, so cross-referencing it gives the same
      // opacity-while-dragging effect for every selected item.
      const isMoving = !erasing && isSelected && iwDragMoving && iwDragMoving.moved;
      const outlineCol = erasing ? '#c44' : (isSelected ? '#1f6dff' : stroke);
      const outlineW   = erasing ? 2 : (isSelected ? 2.5 : 1.5);
      const opacityAttr = isMoving ? ' opacity="0.55"' : '';
      h += `<rect class="iw-item" data-i="${i}" x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" width="${pw.toFixed(1)}" height="${pd.toFixed(1)}" fill="${fill}" stroke="${outlineCol}" stroke-width="${outlineW}" rx="2"${opacityAttr} style="cursor:${erasing?'pointer':'move'}"/>`;
      // For equipment items, etch the same shape-specific marks used on the
      // toolbox icon (fan circle, FRP grid, mushroom dot, etc.) onto the
      // placed footprint so each item is recognizable at a glance on the plan.
      if (item.type === 'equipment' && item.equipKey && ROOFTOP_EQUIPMENT[item.equipKey]) {
        const eq = ROOFTOP_EQUIPMENT[item.equipKey];
        const cx = p.x + pw / 2, cy = p.y + pd / 2;
        const detailCol = erasing ? '#c44' : stroke;
        if (eq.shape === 'cooling_tower') {
          const r = Math.min(pw, pd) * 0.32;
          h += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="${detailCol}" stroke-width="0.8" pointer-events="none"/>`;
          h += `<line x1="${(cx-r).toFixed(1)}" y1="${cy.toFixed(1)}" x2="${(cx+r).toFixed(1)}" y2="${cy.toFixed(1)}" stroke="${detailCol}" stroke-width="0.6" pointer-events="none"/>`;
          h += `<line x1="${cx.toFixed(1)}" y1="${(cy-r).toFixed(1)}" x2="${cx.toFixed(1)}" y2="${(cy+r).toFixed(1)}" stroke="${detailCol}" stroke-width="0.6" pointer-events="none"/>`;
        } else if (eq.shape === 'tank_round_legged') {
          const r = Math.min(pw, pd) / 2 - 1;
          if (r > 2) h += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="${detailCol}" stroke-width="0.6" opacity="0.7" pointer-events="none"/>`;
        } else if (eq.shape === 'mushroom') {
          const r = Math.min(pw, pd) * 0.25;
          if (r > 1.5) h += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="${detailCol}" opacity="0.65" pointer-events="none"/>`;
        } else if (eq.shape === 'box_louvered') {
          const louvers = (eq.details && eq.details.louverCount) || 5;
          for (let li = 1; li < louvers; li++) {
            const ly = p.y + (pd * li) / louvers;
            h += `<line x1="${(p.x+1).toFixed(1)}" y1="${ly.toFixed(1)}" x2="${(p.x+pw-1).toFixed(1)}" y2="${ly.toFixed(1)}" stroke="${detailCol}" stroke-width="0.4" opacity="0.55" pointer-events="none"/>`;
          }
        } else if (eq.shape === 'tank_square_legged') {
          h += `<line x1="${(p.x+pw/2).toFixed(1)}" y1="${(p.y+1).toFixed(1)}" x2="${(p.x+pw/2).toFixed(1)}" y2="${(p.y+pd-1).toFixed(1)}" stroke="${detailCol}" stroke-width="0.5" opacity="0.6" pointer-events="none"/>`;
          h += `<line x1="${(p.x+1).toFixed(1)}" y1="${(p.y+pd/2).toFixed(1)}" x2="${(p.x+pw-1).toFixed(1)}" y2="${(p.y+pd/2).toFixed(1)}" stroke="${detailCol}" stroke-width="0.5" opacity="0.6" pointer-events="none"/>`;
        } else if (eq.shape === 'antenna') {
          h += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="1.4" fill="${detailCol}" pointer-events="none"/>`;
        }
      }
      if (iwScale > 2) {
        const lbl = item.label || item.type;
        h += `<text x="${(p.x + pw/2).toFixed(1)}" y="${(p.y + pd/2 + 4).toFixed(1)}" font-size="9" font-family="system-ui" fill="${stroke}" text-anchor="middle" pointer-events="none">${lbl}</text>`;
        const dim2 = (item.type === 'equipment') ? item.d : (item.h || item.d);
        if (item.w && dim2) h += `<text x="${(p.x + pw/2).toFixed(1)}" y="${(p.y + pd/2 - 4).toFixed(1)}" font-size="8" font-family="system-ui" fill="${stroke}" text-anchor="middle" opacity="0.7" pointer-events="none">${item.w}×${dim2}</text>`;
      }
    });

    if (iwDragItem && iwDragItem.type !== 'hole' && iwCurMM) {
      const cl = iwClamp(iwCurMM, bW, bD);
      // Equipment uses .d for depth; legacy items use .h.
      const dim2 = (iwDragItem.type === 'equipment')
        ? (iwDragItem.d || 15)
        : (iwDragItem.h || iwDragItem.d || 15);
      const sx = iwSnapEdgeAware(cl.x - (iwDragItem.w||20)/2, 0, Math.max(0, bW - (iwDragItem.w||20)));
      const sy = iwSnapEdgeAware(cl.y - dim2/2, 0, Math.max(0, bD - dim2));
      const px = iwPX(sx, sy);
      const pw = (iwDragItem.w || 20) * iwScale, pd = dim2 * iwScale;
      h += `<rect x="${px.x.toFixed(1)}" y="${px.y.toFixed(1)}" width="${pw.toFixed(1)}" height="${pd.toFixed(1)}" fill="rgba(100,100,200,0.25)" stroke="#448" stroke-width="1.5" stroke-dasharray="5,3" rx="2" pointer-events="none"/>`;
    }

    // Roof holes — selectable like rooftop items. When part of the
    // current selection the stroke flips to the bright blue used by
    // selected items, with a beefier outline so the hole reads as
    // "active" against the muted purple of unselected holes.
    const roofHoles = iwTarget().roofHoles || [];
    roofHoles.forEach((hole, i) => {
      const sel    = !erasing && iwIsSelected('roofHole', i);
      const col    = erasing ? '#c44' : (sel ? '#1f6dff' : '#8840a0');
      const strokeW = (sel && !erasing) ? 2.5 : 1.5;
      const cursorVal = erasing ? 'pointer' : 'move';
      if (hole.shape === 'circle') {
        const r = (hole.d / 2) * iwScale;
        const cp = iwPX(hole.x, hole.y);
        h += `<circle class="iw-roof-hole" data-i="${i}" cx="${cp.x.toFixed(1)}" cy="${cp.y.toFixed(1)}" r="${r.toFixed(1)}" fill="${erasing?'rgba(200,68,68,0.12)':'rgba(136,64,160,0.12)'}" stroke="${col}" stroke-width="${strokeW}" style="cursor:${cursorVal}"/>`;
        h += `<line x1="${(cp.x-r*.4).toFixed(1)}" y1="${cp.y.toFixed(1)}" x2="${(cp.x+r*.4).toFixed(1)}" y2="${cp.y.toFixed(1)}" stroke="${col}" stroke-width="0.7" pointer-events="none"/>`;
        h += `<line x1="${cp.x.toFixed(1)}" y1="${(cp.y-r*.4).toFixed(1)}" x2="${cp.x.toFixed(1)}" y2="${(cp.y+r*.4).toFixed(1)}" stroke="${col}" stroke-width="0.7" pointer-events="none"/>`;
        if (iwScale > 2) h += `<text x="${cp.x.toFixed(1)}" y="${(cp.y+r+9).toFixed(1)}" font-size="8" font-family="system-ui" fill="${col}" text-anchor="middle" pointer-events="none">⌀${hole.d}mm</text>`;
      } else {
        const hp = iwPX(hole.x - hole.w/2, hole.y - hole.h/2);
        const pw = hole.w * iwScale, ph = hole.h * iwScale;
        h += `<rect class="iw-roof-hole" data-i="${i}" x="${hp.x.toFixed(1)}" y="${hp.y.toFixed(1)}" width="${pw.toFixed(1)}" height="${ph.toFixed(1)}" fill="${erasing?'rgba(200,68,68,0.12)':'rgba(136,64,160,0.12)'}" stroke="${col}" stroke-width="${strokeW}" style="cursor:${cursorVal}"/>`;
        if (iwScale > 2) h += `<text x="${(hp.x+pw/2).toFixed(1)}" y="${(hp.y+ph+9).toFixed(1)}" font-size="8" font-family="system-ui" fill="${col}" text-anchor="middle" pointer-events="none">${hole.w}×${hole.h}mm</text>`;
      }
    });
    // Hole drag ghost (roof tab)
    if (iwDragItem && iwDragItem.type === 'hole' && iwCurMM) {
      const cl = iwClamp(iwCurMM, bW, bD);
      const gp = iwPX(iwSnapAxis(cl.x, bW), iwSnapAxis(cl.y, bD));
      if (iwDragItem.shape === 'circle') {
        const r = (iwDragItem.d / 2) * iwScale;
        h += `<circle cx="${gp.x.toFixed(1)}" cy="${gp.y.toFixed(1)}" r="${r.toFixed(1)}" fill="rgba(136,64,160,0.15)" stroke="#8840a0" stroke-width="1.5" stroke-dasharray="4,3" pointer-events="none"/>`;
      } else {
        const pw = iwDragItem.w * iwScale, ph = iwDragItem.h * iwScale;
        h += `<rect x="${(gp.x-pw/2).toFixed(1)}" y="${(gp.y-ph/2).toFixed(1)}" width="${pw.toFixed(1)}" height="${ph.toFixed(1)}" fill="rgba(136,64,160,0.15)" stroke="#8840a0" stroke-width="1.5" stroke-dasharray="4,3" pointer-events="none"/>`;
      }
    }

    // Skylights — render as a translucent blue pane with a darker frame
    // outline (frame = hole + 1.5mm margin all sides). Distinct from roof
    // holes (purple) so the two are easy to tell apart in the editor.
    // When part of the selection, the frame and stroke flip to the
    // standard selection blue with a thicker outline.
    const skylights = iwTarget().skylights || [];
    skylights.forEach((sky, i) => {
      const sel       = !erasing && iwIsSelected('skylight', i);
      const col       = erasing ? '#c44' : (sel ? '#1f6dff' : '#3a78c0');
      const paneFill  = erasing ? 'rgba(200,68,68,0.15)' : 'rgba(150,200,235,0.45)';
      const frameStroke = erasing ? '#c44' : (sel ? '#1f6dff' : '#2a5a8a');
      const strokeW   = (sel && !erasing) ? 2.5 : 1.5;
      const cursorVal = erasing ? 'pointer' : 'move';
      const fw = (sky.w + SKYLIGHT_FRAME_MARGIN * 2);
      const fh = (sky.h + SKYLIGHT_FRAME_MARGIN * 2);
      const fp = iwPX(sky.x - fw / 2, sky.y - fh / 2);
      const fpw = fw * iwScale, fph = fh * iwScale;
      // Frame outline (the outer frame piece extent)
      h += `<rect x="${fp.x.toFixed(1)}" y="${fp.y.toFixed(1)}" width="${fpw.toFixed(1)}" height="${fph.toFixed(1)}" fill="none" stroke="${frameStroke}" stroke-width="${sel ? '1.5' : '1.0'}" stroke-dasharray="2,2" pointer-events="none"/>`;
      // Hole (and plexi pane) — clickable for select/erase
      const hp = iwPX(sky.x - sky.w / 2, sky.y - sky.h / 2);
      const pw = sky.w * iwScale, ph = sky.h * iwScale;
      h += `<rect class="iw-skylight" data-i="${i}" x="${hp.x.toFixed(1)}" y="${hp.y.toFixed(1)}" width="${pw.toFixed(1)}" height="${ph.toFixed(1)}" fill="${paneFill}" stroke="${col}" stroke-width="${strokeW}" style="cursor:${cursorVal}"/>`;
      // Subtle cross-glint to read as glass
      if (iwScale > 1.5) {
        h += `<line x1="${hp.x.toFixed(1)}" y1="${hp.y.toFixed(1)}" x2="${(hp.x+pw).toFixed(1)}" y2="${(hp.y+ph).toFixed(1)}" stroke="rgba(255,255,255,0.55)" stroke-width="0.6" pointer-events="none"/>`;
      }
      if (iwScale > 2) {
        h += `<text x="${(hp.x+pw/2).toFixed(1)}" y="${(hp.y+ph+10).toFixed(1)}" font-size="8" font-family="system-ui" fill="${col}" text-anchor="middle" pointer-events="none">🔆 ${sky.w}×${sky.h}mm</text>`;
      }
    });
    // Skylight drag ghost
    if (iwDragItem && iwDragItem.type === 'skylight' && iwCurMM) {
      const cl = iwClamp(iwCurMM, bW, bD);
      const gp = iwPX(iwSnapAxis(cl.x, bW), iwSnapAxis(cl.y, bD));
      const fw = (iwDragItem.w + SKYLIGHT_FRAME_MARGIN * 2);
      const fh = (iwDragItem.h + SKYLIGHT_FRAME_MARGIN * 2);
      const fpw = fw * iwScale, fph = fh * iwScale;
      const pw = iwDragItem.w * iwScale, ph = iwDragItem.h * iwScale;
      h += `<rect x="${(gp.x-fpw/2).toFixed(1)}" y="${(gp.y-fph/2).toFixed(1)}" width="${fpw.toFixed(1)}" height="${fph.toFixed(1)}" fill="none" stroke="#2a5a8a" stroke-width="1.0" stroke-dasharray="2,2" pointer-events="none"/>`;
      h += `<rect x="${(gp.x-pw/2).toFixed(1)}" y="${(gp.y-ph/2).toFixed(1)}" width="${pw.toFixed(1)}" height="${ph.toFixed(1)}" fill="rgba(150,200,235,0.45)" stroke="#3a78c0" stroke-width="1.5" stroke-dasharray="4,3" pointer-events="none"/>`;
    }

    svg.innerHTML = h;
    if (erasing) {
      svg.querySelectorAll('.iw-item').forEach(el => {
        el.addEventListener('click', e => {
          e.stopPropagation();
          const i = parseInt(el.dataset.i);
          iwTarget().rooftopItems.splice(i, 1);
          iwSelection = iwSelection.filter(s => !(s.type === 'item' && s.idx === i))
                                   .map(s => (s.type === 'item' && s.idx > i) ? { ...s, idx: s.idx - 1 } : s);
          iwRender();
        });
      });
      svg.querySelectorAll('.iw-roof-hole').forEach(el => {
        el.addEventListener('click', e => {
          e.stopPropagation();
          const i = parseInt(el.dataset.i);
          (iwTarget().roofHoles || []).splice(i, 1);
          iwSelection = iwSelection.filter(s => !(s.type === 'roofHole' && s.idx === i))
                                   .map(s => (s.type === 'roofHole' && s.idx > i) ? { ...s, idx: s.idx - 1 } : s);
          iwRender();
        });
      });
      svg.querySelectorAll('.iw-skylight').forEach(el => {
        el.addEventListener('click', e => {
          e.stopPropagation();
          const i = parseInt(el.dataset.i);
          (iwTarget().skylights || []).splice(i, 1);
          iwSelection = iwSelection.filter(s => !(s.type === 'skylight' && s.idx === i))
                                   .map(s => (s.type === 'skylight' && s.idx > i) ? { ...s, idx: s.idx - 1 } : s);
          iwRender();
        });
      });
    } else {
      // Click-to-select + drag-to-move for placed items, skylights, and
      // both kinds of holes. Same mousedown logic for all four — the
      // handler reads the item type from data-iw-kind and the index
      // from data-i, captures the original positions of every selected
      // ref (including the just-clicked one if not already selected),
      // and lets the mousemove handler apply the per-frame delta. Whether
      // the gesture ends as a click (selection change only) or a move
      // is decided in mouseup based on iwDragMoving.moved.
      function bindSelectDrag(selector, type) {
        svg.querySelectorAll(selector).forEach(el => {
          // iPad/Safari pointer path. Auto-seeded roof equipment is rendered
          // as normal .iw-item rectangles, so pointerdown makes those items
          // selectable/draggable just like manually dropped items.
          iwBindPointerAndMouse(el, e => {
            if (!iwPrimaryPointer(e)) return;
            // Let pan gesture through even when the cursor is over a
            // placed item — without this, space-held drag on an item
            // would select it instead of scrolling the view.
            if (iwSpaceDown) return;
            e.stopPropagation();
            e.preventDefault();
            try { if (el.setPointerCapture && e.pointerId != null) el.setPointerCapture(e.pointerId); } catch (_) {}
            const idx = parseInt(el.dataset.i, 10);
            const ref = iwMakeRef(type, idx);
            if (!ref) return;
            // Selection update: shift toggles membership; plain click on an
            // unselected item replaces selection; plain click on an already
            // selected item keeps the existing selection so a multi-select
            // group can be dragged by grabbing any member.
            const additive = !!e.shiftKey;
            const wasSelected = iwIsSelected(type, idx);
            if (additive) {
              iwSelect(type, idx, true);
            } else if (!wasSelected) {
              iwSelect(type, idx, false);
            }
            // Capture original positions of every selected ref. Using
            // ref.bbox.x/y rather than ref.item.x/y because the dragged
            // delta is applied to TOP-LEFT positions; the setter
            // handles centre-based items internally.
            const items = iwSelection.map(s => {
              const r = iwMakeRef(s.type, s.idx);
              return r ? { ref: s, origX: r.bbox.x, origY: r.bbox.y } : null;
            }).filter(Boolean);
            iwDragMoving = {
              startMM: iwSvgPt(e),
              items,
              moved: false,
            };
            iwRender();
          });
        });
      }
      if (iwIsRoof()) {
        bindSelectDrag('.iw-item',      'item');
        bindSelectDrag('.iw-skylight',  'skylight');
        bindSelectDrag('.iw-roof-hole', 'roofHole');
      } else {
        bindSelectDrag('.iw-hole',      'floorHole');
        svg.querySelectorAll('.iw-rail-track').forEach(el => {
          el.addEventListener('mousedown', e => {
            if (!iwPrimaryPointer(e)) return;
            if (iwSpaceDown) return;
            e.stopPropagation();
            e.preventDefault();
            const idx = parseInt(el.dataset.i, 10);
            const z = (iwTarget().embeddedRails || [])[idx];
            if (!z) return;
            if (iwTool === 'erase') {
              (iwTarget().embeddedRails || []).splice(idx, 1);
              iwSelection = [];
              iwRender();
              return;
            }
            iwSelect('railZone', idx, e.shiftKey);
            const info = iwRailTrackAcrossInfo(z);
            iwRailTrackDrag = { idx, mouse: iwSvgPt(e), startCenter: info.center };
            iwRailResizeDrag = null;
            iwRailResizeStart = null;
            iwDragMoving = null;
            iwRender();
          });
        });
        bindSelectDrag('.iw-rail-zone', 'railZone');
        svg.querySelectorAll('.iw-rail-resize').forEach(el => {
          el.addEventListener('mousedown', e => {
            if (!iwPrimaryPointer(e)) return;
            if (iwSpaceDown) return;
            e.stopPropagation();
            e.preventDefault();
            const idx = parseInt(el.dataset.i, 10);
            const z = (iwTarget().embeddedRails || [])[idx];
            if (!z) return;
            iwSelect('railZone', idx, e.shiftKey);
            iwRailResizeDrag = { idx, handle: el.dataset.handle };
            iwRailResizeStart = {
              mouse: iwSvgPt(e),
              rect: { x: z.x || 0, y: z.y || 0, w: z.w || 30, h: z.h || 60 },
            };
            iwDragMoving = null;
            iwRender();
          });
        });
      }
    }
  }
  // Shield-wall handles + plus-badges. Each carries data-shield-* attrs
  // describing which side and which handle was clicked. Handles start
  // drag operations (resize segment or opening), the plus-badge adds
  // a new opening at the segment's centre. Stop propagation so the
  // regular iwShieldwallEdgeClick / deselection doesn't also fire.
  svg.querySelectorAll('[data-shield-handle]').forEach(el => {
    el.addEventListener('mousedown', e => {
      if (!iwPrimaryPointer(e)) return;
      if (iwSpaceDown) return;  // let pan gesture through
      e.stopPropagation();
      e.preventDefault();
      iwShieldDrag = {
        side: el.dataset.shieldSide,
        kind: el.dataset.shieldHandle,
      };
    });
  });
  svg.querySelectorAll('[data-shield-plus]').forEach(el => {
    el.addEventListener('mousedown', e => {
      if (!iwPrimaryPointer(e)) return;
      if (iwSpaceDown) return;
      e.stopPropagation();
      e.preventDefault();
      iwShieldAddOpening(el.dataset.shieldPlus);
    });
  });
  // Shield bounds resize / move handles. Capture the initial bounds
  // rectangle and mouse position so the drag math can apply a delta.
  svg.querySelectorAll('[data-shield-bounds]').forEach(el => {
    el.addEventListener('mousedown', e => {
      if (!iwPrimaryPointer(e)) return;
      if (iwSpaceDown) return;
      e.stopPropagation();
      e.preventDefault();
      iwShieldEnsureBounds();
      iwShieldBoundsDrag = el.dataset.shieldBounds;
      const b = CONFIG.rooftopShield.bounds;
      iwShieldBoundsStart = {
        mouse: iwSvgPt(e),
        bounds: { x: b.x, y: b.y, w: b.w, h: b.h },
      };
    });
  });
  // Building footprint minimap in the canvas corner. No active wall to
  // highlight in this editor (we're viewing the floor / roof from above,
  // not editing a single face), so pass null. Function is shared with
  // the wall editor's oeRenderFootprintMap which has its own SVG.
  renderBuildingFootprintMap(document.getElementById('iwFootprintSvg'), null);
}

export function iwSvgPt(e) {
  const r = document.getElementById('iwSvg').getBoundingClientRect();
  return iwMM(e.clientX - r.left, e.clientY - r.top);
}

export function iwHandleMouseMove(e) {
  // Pan gesture takes priority over normal hover / drag handling — once
  // the user is mid-pan we just translate the offset and re-render, no
  // wall snap-points or item-hover highlights to track.
  if (iwPanning) {
    const svg = document.getElementById('iwSvg');
    const r = svg.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    iwOffX = iwPanStartOff.x + (px - iwPanStartPx.x);
    iwOffY = iwPanStartOff.y + (py - iwPanStartPx.y);
    iwRender();
    return;
  }
  if (iwRailTrackDrag) {
    iwCurMM = iwSvgPt(e);
    iwApplyRailTrackDrag(iwCurMM);
    iwRender();
    return;
  }
  if (iwRailResizeDrag) {
    iwCurMM = iwSvgPt(e);
    iwApplyRailZoneResize(iwCurMM);
    iwRender();
    return;
  }
  // Shield-wall drag — translate cursor into edge-pos, write back the
  // appropriate field of the edge state, re-render. The state object
  // is normalized to the explicit form on first drag of an edge, so
  // subsequent drags can read/write directly.
  if (iwShieldDrag) {
    const { side, kind } = iwShieldDrag;
    iwShieldNormalizeEdge(side);
    const edges = CONFIG.rooftopShield.edges;
    iwShieldEnsureBounds();
    const b = CONFIG.rooftopShield.bounds;
    const edgeLen = (side === 'front' || side === 'back') ? b.w : b.h;
    let pos = iwShieldEdgePos(side, iwSvgPt(e));
    pos = iwSnapEdgeAware(pos, 0, edgeLen);
    const eState = edges[side];
    if (kind === 'segStart') {
      eState.start = Math.min(pos, eState.end - 2);
      if (eState.opening && eState.opening.start < eState.start) {
        eState.opening.start = eState.start;
        if (eState.opening.end - eState.opening.start < 2) eState.opening = null;
      }
    } else if (kind === 'segEnd') {
      eState.end = Math.max(pos, eState.start + 2);
      if (eState.opening && eState.opening.end > eState.end) {
        eState.opening.end = eState.end;
        if (eState.opening.end - eState.opening.start < 2) eState.opening = null;
      }
    } else if (kind === 'openStart' && eState.opening) {
      eState.opening.start = Math.max(eState.start, Math.min(pos, eState.opening.end - 2));
    } else if (kind === 'openEnd' && eState.opening) {
      eState.opening.end = Math.min(eState.end, Math.max(pos, eState.opening.start + 2));
    }
    iwRender();
    return;
  }
  // Shield bounds drag — move or resize the entire shield enclosure
  // rectangle. Apply a delta from the drag-start position, clamp to
  // the roof footprint, and clamp any segments/openings that fall
  // outside the new bounds.
  if (iwShieldBoundsDrag && iwShieldBoundsStart) {
    const cur = iwSvgPt(e);
    const dx = cur.x - iwShieldBoundsStart.mouse.x;
    const dy = cur.y - iwShieldBoundsStart.mouse.y;
    const orig = iwShieldBoundsStart.bounds;
    const b = CONFIG.rooftopShield.bounds;
    switch (iwShieldBoundsDrag) {
      case 'move':
        b.x = iwSnapEdgeAware(orig.x + dx, 0, Math.max(0, bW - orig.w));
        b.y = iwSnapEdgeAware(orig.y + dy, 0, Math.max(0, bD - orig.h));
        b.w = orig.w; b.h = orig.h;
        break;
      case 'tl':  // top-left
        b.x = iwSnapEdgeAware(orig.x + dx, 0, orig.x + orig.w);
        b.y = iwSnapEdgeAware(orig.y + dy, 0, orig.y + orig.h);
        b.w = orig.x + orig.w - b.x;
        b.h = orig.y + orig.h - b.y;
        break;
      case 'tr':  // top-right
        b.y = iwSnapEdgeAware(orig.y + dy, 0, orig.y + orig.h);
        { const right = iwSnapEdgeAware(orig.x + orig.w + dx, orig.x, bW); b.w = right - orig.x; }
        b.h = orig.y + orig.h - b.y;
        break;
      case 'bl':  // bottom-left
        b.x = iwSnapEdgeAware(orig.x + dx, 0, orig.x + orig.w);
        b.w = orig.x + orig.w - b.x;
        { const bottom = iwSnapEdgeAware(orig.y + orig.h + dy, orig.y, bD); b.h = bottom - orig.y; }
        break;
      case 'br':  // bottom-right
        { const right = iwSnapEdgeAware(orig.x + orig.w + dx, orig.x, bW); b.w = right - orig.x; }
        { const bottom = iwSnapEdgeAware(orig.y + orig.h + dy, orig.y, bD); b.h = bottom - orig.y; }
        break;
    }
    iwShieldClampBounds();
    iwRender();
    return;
  }
  iwCurMM = iwSvgPt(e);
  // Move-in-progress: translate every selected ref by the same mouse
  // delta from its captured original position. Original positions were
  // captured at mousedown so the per-frame delta math is exact (no
  // accumulated rounding drift). Once the cursor has moved past the
  // click threshold we lock the gesture as a move so a subsequent
  // mouseup is treated as a move rather than a plain click.
  if (iwDragMoving) {
    const dx = iwCurMM.x - iwDragMoving.startMM.x;
    const dy = iwCurMM.y - iwDragMoving.startMM.y;
    if (!iwDragMoving.moved && Math.hypot(dx, dy) > 1.5) iwDragMoving.moved = true;
    if (iwDragMoving.moved) {
      const { bW, bD } = iwBounds();
      iwApplyDragDelta(dx, dy, iwDragMoving.items, bW, bD);
    }
  }
  iwRender();
}

export function iwHandleMouseDown(e) {
  // Pan triggers — middle mouse OR space-held left mouse. Started here
  // before any normal interaction so it can short-circuit wall-draw and
  // item-select. preventDefault stops middle-click from triggering the
  // OS autoscroll affordance on Windows / Linux.
  if (e.button === 1 || (e.button === 0 && iwSpaceDown)) {
    e.preventDefault();
    const svg = document.getElementById('iwSvg');
    const r = svg.getBoundingClientRect();
    iwPanning = true;
    iwPanStartPx  = { x: e.clientX - r.left, y: e.clientY - r.top };
    iwPanStartOff = { x: iwOffX, y: iwOffY };
    svg.style.cursor = 'grabbing';
    return;
  }
  if (!iwPrimaryPointer(e)) return;
  if (iwHandleObjectGestureMouseDown(e)) return;
  if (iwDragItem) return; // handled on mouseup from document
  // Background mousedown in roof view (not on an item) deselects whatever
  // was previously selected. The item rect's own mousedown stops propagation
  // before this runs, so this only fires when clicking empty roof area.
  if (iwIsRoof()) {
    // Shield Wall tool: clicking near a roof edge toggles a parapet on
    // that side. The Shield Wall toolbox card sets iwTool='shieldwall',
    // and CONFIG.rooftopShield.enabled is auto-set true on first toggle
    // so the user doesn't have to also tick the left-panel checkbox.
    if (iwTool === 'shieldwall') {
      const handled = iwShieldwallEdgeClick(e);
      if (handled) return;
    }
    if (iwSelection.length > 0) {
      iwSelection = [];
      iwRender();
    }
    return;
  }
  if (iwTool !== 'draw' || iwIsRoof()) return;
  const { bW, bD } = iwBounds();
  const cl = iwClamp(iwSvgPt(e), bW, bD);
  iwDragPt = iwSnapPt(cl.x, cl.y);
  iwDrag = true;
}

export function iwHandleMouseUp(e) {
  // End pan first if one's in progress — must come before any
  // wall-draw / item-move completion so a panning mouseup doesn't
  // accidentally drop a wall at the cursor's release position.
  if (iwPanning) {
    iwPanning = false;
    iwPanStartPx = null;
    iwPanStartOff = null;
    const svg = document.getElementById('iwSvg');
    if (svg) svg.style.cursor = iwSpaceDown ? 'grab' : '';
    return;
  }
  if (iwRailTrackDrag) {
    iwRailTrackDrag = null;
    iwRender();
    return;
  }
  if (iwRailResizeDrag) {
    iwRailResizeDrag = null;
    iwRailResizeStart = null;
    iwRender();
    return;
  }
  // Finish a shield-wall handle drag — clear the drag state and let
  // iwRender redraw with the new positions. No persistence here; the
  // state lives directly in CONFIG.rooftopShield.edges so it'll be
  // saved with the preset like everything else.
  if (iwShieldDrag) {
    iwShieldDrag = null;
    return;
  }
  // Same for the shield-bounds drag (outline resize / move).
  if (iwShieldBoundsDrag) {
    iwShieldBoundsDrag = null;
    iwShieldBoundsStart = null;
    return;
  }
  // Finish a move-in-progress on the selected items. We clear the move
  // state regardless (mouseup always ends the gesture), but leave the
  // selection in place so the user can immediately press
  // Delete/Backspace, hit Ctrl+C, or drag again. A no-movement mouseup
  // is treated as a plain click that just leaves the selection at its
  // original position.
  if (iwDragMoving) {
    iwDragMoving = null;
    iwRender();
    return;
  }
  if (iwDragItem && iwCurMM) {
    const { bW, bD } = iwBounds();
    const cl = iwClamp(iwCurMM, bW, bD);
    const sx = iwSnapAxis(cl.x, bW), sy = iwSnapAxis(cl.y, bD);
    const tgt = iwTarget();
    if (iwDragItem.type === 'hole') {
      // Place a circle or square cutout. Floor holes are blocked from the
      // embedded-track safety zone because they cut through all rail stack layers.
      const newHole = { ...iwDragItem, x: sx, y: sy };
      if (!iwIsRoof() && floorHoleOverlapsEmbeddedRailSafety(newHole, tgt)) {
        flashMessage('Floor holes cannot be placed inside the embedded track safety zone.', 'warn');
      } else {
        const store = iwIsRoof()
          ? (tgt.roofHoles  || (tgt.roofHoles  = []))
          : (tgt.floorHoles || (tgt.floorHoles = []));
        store.push(newHole);
      }
    } else if (iwDragItem.type === 'embeddedRail' && !iwIsRoof()) {
      const rw = iwDragItem.w || 27;
      const rh = iwDragItem.h || 60;
      const ix = iwSnapEdgeAware(sx - rw / 2, 0, Math.max(0, bW - rw));
      const iy = iwSnapEdgeAware(sy - rh / 2, 0, Math.max(0, bD - rh));
      if (!tgt.embeddedRails) tgt.embeddedRails = [];
      tgt.embeddedRails.push({ x: ix, y: iy, w: rw, h: rh, orientation: iwDragItem.orientation || 'auto', trackOffset: 0 });
    } else if (iwDragItem.type === 'skylight' && iwIsRoof()) {
      // Skylights live in target.skylights. The stored x/y is the centre of
      // the hole (consistent with roofHoles), and w/h is the hole size — the
      // frame and plexi are derived geometrically from these at build time.
      const w = iwDragItem.w || 10;
      const h = iwDragItem.h || 10;
      const cx = Math.max(w/2, Math.min(bW - w/2, sx));
      const cy = Math.max(h/2, Math.min(bD - h/2, sy));
      if (!tgt.skylights) tgt.skylights = [];
      tgt.skylights.push({ x: cx, y: cy, w, h });
    } else if (iwIsRoof()) {
      // Place a roof structural item. Equipment items carry their depth in `.d`
      // (with `.h` reserved for the 3D height of the STL); legacy items
      // (mechroom, billboard, stlzone) use `.h` as the plan-view depth.
      const dim2 = (iwDragItem.type === 'equipment')
        ? (iwDragItem.d || 15)
        : (iwDragItem.h || iwDragItem.d || 15);
      const ix = iwSnapEdgeAware(sx - (iwDragItem.w||20)/2, 0, Math.max(0, bW - (iwDragItem.w||20)));
      const iy = iwSnapEdgeAware(sy - dim2/2, 0, Math.max(0, bD - dim2));
      if (!tgt.rooftopItems) tgt.rooftopItems = [];
      tgt.rooftopItems.push({ ...iwDragItem, x: ix, y: iy });
    }
    iwDragItem = null; iwDrag = false;
    iwRender(); return;
  }
  iwDragItem = null;
  if (!iwDrag || iwTool !== 'draw' || iwIsRoof()) { iwDrag = false; return; }
  iwDrag = false;
  if (!iwDragPt || !iwCurMM) return;
  const { bW, bD } = iwBounds();
  const cl = iwClamp(iwCurMM, bW, bD);
  const al = iwAxisAlign(iwDragPt, iwSnapPt(cl.x, cl.y));
  const len = Math.hypot(al.x - iwDragPt.x, al.y - iwDragPt.y);
  if (len < 3) { iwDragPt = null; return; }
  if (!CONFIG.internalWalls[0]) CONFIG.internalWalls[0] = [];
  CONFIG.internalWalls[0].push({ x1: iwDragPt.x, y1: iwDragPt.y, x2: al.x, y2: al.y });
  iwDragPt = null;
  iwRender();
}

export function iwHandleMouseLeave() { if (!iwDragItem) { iwCurMM = null; if (!iwDrag) iwRender(); } }


/* ---- Tab computation with stagger & half-lap detection ---- */
export function iwComputeTabs(wi, walls, matT) {
  const w = walls[wi];
  const isH = Math.abs(w.y2 - w.y1) < 0.01;
  const len = isH ? Math.abs(w.x2 - w.x1) : Math.abs(w.y2 - w.y1);
  const x0  = isH ? Math.min(w.x1, w.x2) : w.x1;
  const y0  = isH ? w.y1 : Math.min(w.y1, w.y2);

  // Find crossing points (half-lap positions along this wall's span)
  const crossings = [];
  for (let j = 0; j < walls.length; j++) {
    if (j === wi) continue;
    const w2 = walls[j];
    const isH2 = Math.abs(w2.y2 - w2.y1) < 0.01;
    if (isH === isH2) continue; // parallel, no crossing
    if (isH) {
      // w is H, w2 is V at x = w2.x1
      const cx = w2.x1;
      const ylo = Math.min(w2.y1, w2.y2), yhi = Math.max(w2.y1, w2.y2);
      if (cx > x0 + matT && cx < x0 + len - matT && y0 > ylo && y0 < yhi)
        crossings.push({ pos: cx - x0, dir: 'v' });
    } else {
      // w is V, w2 is H at y = w2.y1
      const cy = w2.y1;
      const xlo = Math.min(w2.x1, w2.x2), xhi = Math.max(w2.x1, w2.x2);
      if (cy > y0 + matT && cy < y0 + len - matT && x0 > xlo && x0 < xhi)
        crossings.push({ pos: cy - y0, dir: 'h' });
    }
  }

  // Stagger phase based on rank among parallel walls
  const myRef = isH ? w.y1 : w.x1;
  const rank  = walls.filter((ww, k) => k !== wi
    && (Math.abs(ww.y2 - ww.y1) < 0.01) === isH
    && (isH ? ww.y1 : ww.x1) < myRef - matT / 2).length;
  const phase = (rank % 2) * (IW_TAB_SPACING / 2);

  // Place tabs, avoiding crossing ± 2*matT
  const n = Math.max(2, Math.round(len / IW_TAB_SPACING));
  const spacing = len / (n + 1);
  const tabPositions = [];
  for (let ti = 1; ti <= n; ti++) {
    let pos = spacing * ti + phase;
    if (pos <= matT || pos >= len - matT) continue;
    if (crossings.some(c => Math.abs(c.pos - pos) < matT * 2.5)) continue;
    tabPositions.push(pos);
  }
  // Fallback: ensure ≥ 2 tabs
  if (tabPositions.length < 2) {
    tabPositions.length = 0;
    for (let ti = 1; ti <= Math.max(2, n); ti++) {
      const pos = len * ti / (Math.max(2, n) + 1);
      if (pos > matT && pos < len - matT && !crossings.some(c => Math.abs(c.pos - pos) < matT * 2))
        tabPositions.push(pos);
    }
  }
  return { tabPositions, crossings, isH, len, x0, y0 };
}

/* ---- Build wall panel SVG path with tabs and half-lap notches ---- */
// panelL = length, panelH = floor height
// tabs protrude above (y<0) and below (y>panelH)
// halfLaps: [{pos, edge:'top'|'bottom'}] — rectangular notches INTO the panel
export function iwBuildPanelPath(panelL, panelH, matT, tabPos, halfLaps) {
  const tt = [...tabPos].sort((a, b) => a - b);

  // Build the entire internal wall, tabs included, as one positive-coordinate
  // exterior CUT outline. Earlier versions put the top tabs at y=-matT and
  // then used bboxOffsetY to compensate. The SVG card/export path could render
  // those protrusions as if they were separate/cropped pieces, and the etched
  // floor guide lines overlaid the red cut edge in blue. Keeping everything
  // inside the bbox and removing those redundant etch guides makes the wall
  // cut as one physical piece.
  const yTopBody = matT;
  const yBotBody = matT + panelH;

  // Outer perimeter clockwise, starting at top-left of the clear wall body.
  const pts = [[0, yTopBody]];

  // Top edge left→right with upward tab protrusions into the upper panel.
  for (const p of tt) {
    const l = p - matT / 2, r = p + matT / 2;
    pts.push([l, yTopBody], [l, 0], [r, 0], [r, yTopBody]);
  }

  pts.push([panelL, yTopBody], [panelL, yBotBody]);

  // Bottom edge right→left with downward tab protrusions into the lower panel.
  for (const p of [...tt].reverse()) {
    const l = p - matT / 2, r = p + matT / 2;
    pts.push([r, yBotBody], [r, yBotBody + matT], [l, yBotBody + matT], [l, yBotBody]);
  }

  pts.push([0, yBotBody]);

  const d = 'M ' + pts.map(p => `${p[0].toFixed(3)},${p[1].toFixed(3)}`).join(' L ') + ' Z';
  const paths = [{ type: 'cut', d }];

  // Half-lap notches as inner rectangular CUTS, shifted into the positive
  // local coordinate system used by the new one-piece outline.
  for (const lap of halfLaps) {
    const x1 = (lap.pos - matT / 2).toFixed(3);
    const x2 = (lap.pos + matT / 2).toFixed(3);
    const y1 = lap.edge === 'top' ? yTopBody : (yTopBody + panelH / 2);
    const y2 = lap.edge === 'top' ? (yTopBody + panelH / 2) : yBotBody;
    paths.push({
      type: 'cut',
      d: `M ${x1},${y1.toFixed(3)} L ${x2},${y1.toFixed(3)} L ${x2},${y2.toFixed(3)} L ${x1},${y2.toFixed(3)} Z`
    });
  }

  // No blue etch guide lines on the body edges. Those coincided with the
  // actual cut boundary and made the vertical internal wall look engraved.
  return { paths, lines: [] };
}

/* ---- Internal wall vertical levels ----
 * Internal walls slot into horizontal plates at the bottom and top of each
 * occupied level. The cut part therefore has:
 *   clear body height = level floor-to-ceiling pitch - bottom plate - top plate
 *   overall bbox      = clear body height + two tab protrusions
 * This keeps the visible wall body between the floor and ceiling instead of
 * making it the full outside wall/floor-band height and then adding tabs on
 * top of that.
 */
export function internalWallLevelSpecs(plan) {
  const matT = plan.matT || 1.5;
  const H = plan.H || 0;
  const floors = Math.max(1, plan.floors || 1);

  // Use the same floor boundary model as window/floor-band placement. These
  // are y-from-top wall coordinates; H is ground/base. If visual boundaries
  // are unavailable, fall back to firstFloorHeight/floorHeight.
  const visual = [...(plan.visualFloorYs || [])]
    .filter(y => y > 0.01 && y < H - 0.01)
    .sort((a, b) => b - a); // ground-up boundaries: lowest first (larger y)

  const levels = [];
  let bottomY = H;
  if (visual.length) {
    for (let i = 0; i < floors; i++) {
      const topY = (i < visual.length) ? visual[i] : 0;
      const pitch = Math.max(0, bottomY - topY);
      if (pitch > matT * 2 + 1) {
        levels.push({
          idx: i,
          label: i === 0 ? 'Ground floor' : `Floor ${i + 1}`,
          pitch,
          clearH: Math.max(5, pitch - 2 * matT),
          topY,
          bottomY,
        });
      }
      bottomY = topY;
      if (bottomY <= 0.01) break;
    }
  }

  if (!levels.length) {
    const firstH = plan.firstFloorHeight || plan.floorHeight || (floors > 1 ? H / floors : H);
    const upperH = plan.floorHeight || firstH;
    for (let i = 0; i < floors; i++) {
      const pitch = Math.max(0, i === 0 ? firstH : upperH);
      if (pitch > matT * 2 + 1) {
        levels.push({
          idx: i,
          label: i === 0 ? 'Ground floor' : `Floor ${i + 1}`,
          pitch,
          clearH: Math.max(5, pitch - 2 * matT),
          topY: null,
          bottomY: null,
        });
      }
    }
  }

  // Final guard for very short / unusual configs.
  if (!levels.length) {
    const pitch = Math.max(5 + 2 * matT, H);
    levels.push({
      idx: 0,
      label: 'Ground floor',
      pitch,
      clearH: Math.max(5, pitch - 2 * matT),
      topY: null,
      bottomY: null,
    });
  }

  return levels;
}

/* ---- Generate SVG parts for all internal walls ---- */
export function generateInternalWallParts(cfg, plan) {
  const sharedWalls = (cfg.internalWalls || {})[0] || [];
  if (!sharedWalls.length) return [];

  const matT   = plan.matT;
  const levels = internalWallLevelSpecs(plan);
  const parts  = [];

  // Same plan layout applied to each occupied floor level, but each level's
  // wall body height is the clear distance between horizontal plates rather
  // than the full wall/floor-band height.
  for (const lvlSpec of levels) {
    const lvl = lvlSpec.idx;
    const lvlLabel = lvlSpec.label;
    const panelH = lvlSpec.clearH;
    sharedWalls.forEach((w, wi) => {
      const { tabPositions, crossings, isH, len } = iwComputeTabs(wi, sharedWalls, matT);
      if (len < matT * 2) return;
      const halfLaps   = crossings.map(c => ({ pos: c.pos, edge: isH ? 'top' : 'bottom' }));
      const { paths, lines } = iwBuildPanelPath(len, panelH, matT, tabPositions, halfLaps);
      const dir    = isH ? 'horizontal' : 'vertical';
      const posLbl = isH ? `y=${w.y1.toFixed(1)}` : `x=${w.x1.toFixed(1)}`;
      const crossNote = halfLaps.length ? ` ${halfLaps.length} half-lap notch${halfLaps.length > 1 ? 'es' : ''}.` : '';
      parts.push({
        id: `iwall_f${lvl}_${wi}`, material: 'core',
        name: `Internal wall — ${lvlLabel}, ${dir}, ${len.toFixed(0)} mm × ${panelH.toFixed(1)} mm clear (${posLbl})`,
        assemblyNote: `Clear wall body is ${panelH.toFixed(1)}mm between floor/ceiling plates; tabs add ${matT.toFixed(1)}mm into each horizontal panel (${tabPositions.length} tabs, staggered).${crossNote}`,
        bboxW: len, bboxH: panelH + 2 * matT,
        bboxOffsetX: 0, bboxOffsetY: 0,
        paths, rects: [], lines,
      });
    });
  }
  return parts;
}
/* ---- Inject wall-tab slots into floor & inter-floor panel parts ---- */
export function injectInternalWallSlots(parts, cfg, plan) {
  const sharedWalls = (cfg.internalWalls || {})[0] || [];
  if (!sharedWalls.length) return;

  const matT = plan.matT;
  const kerf = cfg.kerfComp || 0;

  function slotPath(cx, cy) {
    const hw = matT / 2 - kerf;
    return `M ${(cx-hw).toFixed(3)},${(cy-hw).toFixed(3)} L ${(cx+hw).toFixed(3)},${(cy-hw).toFixed(3)} L ${(cx+hw).toFixed(3)},${(cy+hw).toFixed(3)} L ${(cx-hw).toFixed(3)},${(cy+hw).toFixed(3)} Z`;
  }

  // Shared slot positions (interior coordinates)
  const sharedSlots = [];
  sharedWalls.forEach((w, wi) => {
    const { tabPositions, isH, x0, y0 } = iwComputeTabs(wi, sharedWalls, matT);
    for (const tp of tabPositions) {
      sharedSlots.push(isH ? { cx: x0 + tp, cy: w.y1 } : { cx: w.x1, cy: y0 + tp });
    }
  });

  // Inject into every inter-floor panel (same slots on all levels)
  const sortedIFYs = plan.interFloorYs ? [...plan.interFloorYs].sort((a, b) => a - b) : [];
  for (let panelN = 1; panelN <= sortedIFYs.length; panelN++) {
    const ifPart = parts.find(p => p.id === `inter_floor_panel_${panelN}`);
    if (!ifPart) continue;
    for (const sl of sharedSlots)
      ifPart.paths.push({ type: 'cut', d: slotPath(sl.cx, sl.cy) });
  }

  // Inject into base floor plate (exterior coordinates: +matT offset)
  const floorPart = parts.find(p => p.id === 'floor');
  if (floorPart) {
    for (const sl of sharedSlots)
      floorPart.paths.push({ type: 'cut', d: slotPath(sl.cx + matT, sl.cy + matT) });
  }

  // Inject top-tab sockets into horizontal roof/ceiling panels when the roof
  // is a flat plate. This gives the top-floor internal wall tabs somewhere to
  // land instead of only accounting for the floor side.
  const roofPart = parts.find(p => p.id === 'roof');
  if (roofPart && (plan.roofStyle === 'parapet' || plan.roofStyle === 'flat' || plan.roofStyle === 'flat_overhang')) {
    let ox = matT, oy = matT; // flat roof uses full exterior footprint
    if (plan.roofStyle === 'parapet') {
      ox = 0; oy = 0;          // recessed parapet roof panel is already in the interior frame
    } else if (plan.roofStyle === 'flat_overhang') {
      const O = Math.max(0, cfg.roofOverhang || 5);
      ox = O + matT; oy = O + matT;
    }
    for (const sl of sharedSlots) {
      roofPart.paths.push({ type: 'cut', d: slotPath(sl.cx + ox, sl.cy + oy) });
    }
  }
}


export function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generatedBuildingName(cfg) {
  const typeSpec = BUILDING_TYPES[cfg.buildingType] || {};
  const typeLabel = typeSpec.label || 'Building';
  const floors = Math.max(1, Number(cfg.floorCount || 1));
  const wings = (cfg.wings || []).length;
  const dims = `${Number(cfg.width || 0).toFixed(0)}×${Number(cfg.depth || 0).toFixed(0)}×${Number(cfg.height || 0).toFixed(0)}mm`;
  const wingText = wings ? ` + ${wings} wing${wings !== 1 ? 's' : ''}` : '';
  return `${typeLabel} — ${floors}F${wingText} (${dims})`;
}

export function currentBuildingName(cfg) {
  const raw = cfg && typeof cfg.buildingName === 'string' ? cfg.buildingName.trim() : '';
  return raw || generatedBuildingName(cfg || CONFIG);
}

export function renderBuildingNameHtml() {
  return `<div class="building-title-card" id="buildingTitleCard">`
    + `<div class="building-title-label">Building name</div>`
    + `<div class="building-title-row">`
    + `<div class="building-title-text" id="buildingTitleText">${escapeHtml(currentBuildingName(CONFIG))}</div>`
    + `<button class="building-title-edit" id="buildingTitleEdit" type="button" title="Edit building name" aria-label="Edit building name">✎</button>`
    + `</div></div>`;
}

export function bindBuildingNameEditor() {
  const editBtn = document.getElementById('buildingTitleEdit');
  const card = document.getElementById('buildingTitleCard');
  const textEl = document.getElementById('buildingTitleText');
  if (!editBtn || !card || !textEl) return;

  editBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const input = document.createElement('input');
    input.className = 'building-title-input';
    input.type = 'text';
    input.value = currentBuildingName(CONFIG);
    input.setAttribute('aria-label', 'Building name');

    const row = card.querySelector('.building-title-row');
    row.innerHTML = '';
    row.appendChild(input);
    input.focus();
    input.select();

    let committed = false;
    function commit(save) {
      if (committed) return;
      committed = true;
      const next = input.value.trim();
      if (save) CONFIG.buildingName = next || null;
      regenerate();
    }
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') commit(true);
      if (ev.key === 'Escape') commit(false);
    });
    input.addEventListener('blur', () => commit(true));
  });
}

/* Regenerate building and update preview */
export function regenerate() {
  readForm();
  let result;
  let warning = '';
  try {
    result = generateBuilding(CONFIG);
    const layoutReferencePart = generateBuildingLayoutReferencePart(CONFIG, result.plan);
    if (layoutReferencePart) result.parts.push(layoutReferencePart);
    lastPlan = result.plan;
    lastResult = result;
    renderMaterialsForm();   // keep cladding-style → material list current
  } catch (e) {
    document.getElementById('output').innerHTML = '<div class="warn">Error generating building: ' + e.message + '</div>';
    console.error(e);
    return;
  }
  result.parts = applySheetSplittingToParts(result.parts, CONFIG);
  const { parts, plan, totalWindows, totalDoors } = result;

  // Render preview — grouped by material then sheet
  renderPartsOutput(parts);

  // Stats
  const totalCoreParts = parts.filter(p => p.material === 'core').length;
  const totalCladdingParts = parts.filter(p => p.material === 'cladding').length;
  let statsHtml = renderBuildingNameHtml();
  statsHtml += '<div class="preview-section"><h2>Stats</h2>';
  statsHtml += `<div class="stat-row"><span>Building footprint</span><span>${CONFIG.width} × ${CONFIG.depth} × ${CONFIG.height} mm</span></div>`;
  statsHtml += `<div class="stat-row"><span>Real-world (1:150)</span><span>${(CONFIG.width * 0.15).toFixed(1)} × ${(CONFIG.depth * 0.15).toFixed(1)} × ${(CONFIG.height * 0.15).toFixed(1)} m</span></div>`;
  statsHtml += `<div class="stat-row"><span>Core parts</span><span>${totalCoreParts}</span></div>`;
  statsHtml += `<div class="stat-row"><span>Cladding parts</span><span>${totalCladdingParts}</span></div>`;
  statsHtml += `<div class="stat-row"><span>Total windows</span><span>${totalWindows}</span></div>`;
  statsHtml += `<div class="stat-row"><span>Total doors</span><span>${totalDoors}</span></div>`;
  statsHtml += '</div>';
  document.getElementById('stats').innerHTML = statsHtml;
  bindBuildingNameEditor();

  // Warnings
  let warnings = '';
  // Stack budget check
  const stackInner = CONFIG.claddingThickness + 0.5 + CONFIG.claddingThickness;
  if (stackInner > CONFIG.coreThickness) {
    warnings += `<div class="warn">Window stack (backing + glass + 1 frame = ${stackInner.toFixed(2)}mm) exceeds core thickness (${CONFIG.coreThickness}mm). Glass will protrude.</div>`;
  }
  if (CONFIG.roofStyle === 'parapet' && CONFIG.parapetHeight + CONFIG.coreThickness > 8) {
    warnings += `<div class="warn">Parapet height (${CONFIG.parapetHeight}mm) is unusually large. Walls may need additional bracing.</div>`;
  }
  if (totalWindows === 0 && CONFIG.windowDensity !== 'none') {
    warnings += `<div class="warn">No windows fit in the given building dimensions. Try smaller window size or larger building.</div>`;
  }

  // Bay opening height constraint.
  // plan.H = cfg.height (parapet lives in plan.parapetH — already excluded ✓).
  // When first-floor height is overridden, the upper floors use the remaining height;
  // the bay (which spans the first floor) should not exceed one upper-floor height
  // minus matT, so the bay-ceiling panel always has a ledge to seat its tongue joints.
  if ((CONFIG.hasFrontBay || CONFIG.hasBackBay) && lastPlan) {
    const matT        = lastPlan.matT || CONFIG.coreThickness || 1.5;
    const H           = lastPlan.H;   // wall height only, parapet excluded
    const floors      = lastPlan.floors || 1;
    const firstFloorH = lastPlan.firstFloorHeight || (H / floors);
    // Upper floors share the remaining height equally
    const upperFloorH = floors > 1 ? (H - firstFloorH) / (floors - 1) : H;
    const refFloorH   = floors > 1 ? upperFloorH : H;
    const maxBayH     = refFloorH - matT;
    const bayH        = lastPlan.bayHeight || 0;
    if (bayH > maxBayH) {
      warnings += `<div class="warn">Bay opening height (${bayH.toFixed(1)} mm) exceeds the safe maximum of ${maxBayH.toFixed(1)} mm`
        + ` (${floors > 1 ? `upper-floor height ${refFloorH.toFixed(1)}` : `wall height ${H.toFixed(1)}`} mm`
        + ` − material thickness ${matT} mm).`
        + ` The bay-ceiling panel needs at least ${matT} mm of wall material above the opening for its tongue joints.</div>`;
    }
  }
  for (const msg of embeddedRailValidationWarnings(CONFIG)) {
    warnings += `<div class="warn">${msg}</div>`;
  }
  document.getElementById('warnings').innerHTML = warnings;
}

/* ---------------------------------------------------------------------------
   TONGUE/SLOT CONSISTENCY VERIFICATION

   Each tongue (a 4-point outward bump on a part's perimeter, matT deep) must
   plug into exactly one slot. Slots come in two flavours:
     1. Interior rect cuts with one dimension ≈ matT (e.g. roof slots at
        parapetH, dividing-wall connection slots).
     2. Inward perimeter bumps — "openings" produced by buildWallPath when a
        front/back wall has slots on its left/right edges for side-wall
        tongues.
   Counts are split by orientation:
     • Horizontal-edge tongues (vertical protrusions) ↔ slots with h ≈ matT
       AND horizontal-edge openings (inward vertical bumps).
     • Vertical-edge tongues (horizontal protrusions) ↔ slots with w ≈ matT
       AND vertical-edge openings (inward horizontal bumps).
   When the counts disagree there's a tab somewhere with no matching slot,
   or a slot that won't receive any tab.

   The detector ignores:
     • Non-core parts (cladding, trim, windows) — they don't participate in
       the structural tongue-and-slot system.
     • Large rectangular bay carves — their bump depth ≠ matT so the strict
       length check skips them.
*/
export function classifyBumpsInPath(d, matT, tolerance) {
  // Pull (x,y) points out of M/L commands in walk order.
  const pts = [];
  const re = /[ML]\s*(-?[\d.]+),(-?[\d.]+)/g;
  let m;
  while ((m = re.exec(d)) !== null) {
    pts.push({ x: parseFloat(m[1]), y: parseFloat(m[2]) });
  }

  const r = {
    horizTongues: 0, vertTongues: 0,
    horizOpenings: 0, vertOpenings: 0,
  };
  for (let i = 0; i + 3 < pts.length; i++) {
    const a = pts[i], b = pts[i+1], c = pts[i+2], d2 = pts[i+3];
    const ab = { dx: b.x - a.x, dy: b.y - a.y };
    const bc = { dx: c.x - b.x, dy: c.y - b.y };
    const cd = { dx: d2.x - c.x, dy: d2.y - c.y };

    // ab and cd must be perpendicular moves of matT length.
    const abIsVert  = Math.abs(ab.dx) < tolerance && Math.abs(Math.abs(ab.dy) - matT) < tolerance;
    const abIsHoriz = Math.abs(ab.dy) < tolerance && Math.abs(Math.abs(ab.dx) - matT) < tolerance;
    if (!abIsVert && !abIsHoriz) continue;
    if (abIsVert) {
      if (Math.abs(cd.dx) > tolerance) continue;
      if (Math.abs(Math.abs(cd.dy) - matT) > tolerance) continue;
      if (Math.abs(ab.dy + cd.dy) > tolerance) continue;
    } else {
      if (Math.abs(cd.dy) > tolerance) continue;
      if (Math.abs(Math.abs(cd.dx) - matT) > tolerance) continue;
      if (Math.abs(ab.dx + cd.dx) > tolerance) continue;
    }
    // bc must be parallel to the edge with non-zero length.
    if (abIsVert) {
      if (Math.abs(bc.dy) > tolerance) continue;
      if (Math.abs(bc.dx) < tolerance) continue;
    } else {
      if (Math.abs(bc.dx) > tolerance) continue;
      if (Math.abs(bc.dy) < tolerance) continue;
    }

    // Outward perpendicular of bc for a clockwise walk is (bc.dy, -bc.dx).
    // Dot product with ab tells us which way the bump points.
    const dot = ab.dx * bc.dy + ab.dy * (-bc.dx);
    if (Math.abs(dot) < tolerance) continue;
    if (dot > 0) {
      if (abIsVert) r.horizTongues++;
      else r.vertTongues++;
    } else {
      if (abIsVert) r.horizOpenings++;
      else r.vertOpenings++;
    }
  }
  return r;
}

export function verifyTongueSlotMatch(parts, matT) {
  // h/w-match tolerance: slot h/w can be matT or matT+bleed (some slots add
  // ~0.6 mm bleed for tongue clearance). Allow up to 1 mm slop.
  const SLOT_DIM_TOL = 1.0;
  const TOL = 0.1;
  let horizTongues = 0, vertTongues = 0;
  let horizOpenings = 0, vertOpenings = 0;
  let horizSlots = 0, vertSlots = 0;

  for (const part of parts) {
    if (part.material !== 'core') continue;
    for (const p of (part.paths || [])) {
      if (p.type !== 'cut' || !p.d) continue;
      const c = classifyBumpsInPath(p.d, matT, TOL);
      horizTongues  += c.horizTongues;
      vertTongues   += c.vertTongues;
      horizOpenings += c.horizOpenings;
      vertOpenings  += c.vertOpenings;
    }
    for (const r of (part.rects || [])) {
      if (r.type !== 'cut') continue;
      // Slot identification: one dimension within slop of matT, the other
      // strictly larger (otherwise it's a tiny square, not a slot).
      const hIsThin = Math.abs(r.h - matT) < SLOT_DIM_TOL;
      const wIsThin = Math.abs(r.w - matT) < SLOT_DIM_TOL;
      const hIsLong = r.h > matT + SLOT_DIM_TOL;
      const wIsLong = r.w > matT + SLOT_DIM_TOL;
      if (hIsThin && wIsLong) horizSlots++;        // wide slot, thin in Y → horizontal slot
      else if (wIsThin && hIsLong) vertSlots++;    // tall slot, thin in X → vertical slot
    }
  }

  const horizMatched = horizSlots + horizOpenings;
  const vertMatched  = vertSlots  + vertOpenings;
  const issues = [];
  if (horizTongues !== horizMatched) {
    issues.push(
      `Horizontal-edge tongues: ${horizTongues}; matching features ` +
      `(rect slots h≈${matT}: ${horizSlots}, perimeter openings: ${horizOpenings}, total ${horizMatched})` +
      ` (diff ${horizTongues - horizMatched}).`
    );
  }
  if (vertTongues !== vertMatched) {
    issues.push(
      `Vertical-edge tongues: ${vertTongues}; matching features ` +
      `(rect slots w≈${matT}: ${vertSlots}, perimeter openings: ${vertOpenings}, total ${vertMatched})` +
      ` (diff ${vertTongues - vertMatched}).`
    );
  }
  return {
    issues,
    horizTongues, vertTongues, horizSlots, vertSlots,
    horizOpenings, vertOpenings,
  };
}

/* Export ZIP filename/path helpers.
 * ZIP paths are grouped by material first:
 *   1.5mm_Plywood/
 *   0.28mm_Basswood/
 *   0.5mm_Clear_PVC/
 *
 * Inside each material folder, files are named:
 *   Main_Wall_PartName.svg
 *   Wing_01_Wall_PartName.svg
 *
 * Example:
 *   1.5mm_Plywood/Wing_01_Back_Wall.svg
 */
