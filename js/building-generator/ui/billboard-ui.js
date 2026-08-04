/* =====================================================================
   BILLBOARD UI MANAGEMENT
   ===================================================================== */
export function bbAddBillboard() {
  CONFIG.billboards = CONFIG.billboards || [];
  CONFIG.billboards.push({ type: 'single', face: 'back', x: 10, w: 25, height: 18, postHeight: 12 });
  bbRenderBillboards();
}

export function bbRemoveBillboard(i) {
  CONFIG.billboards.splice(i, 1);
  bbRenderBillboards();
}

export function bbRenderBillboards() {
  const container = document.getElementById('billboardFields');
  if (!container) return;
  const bbs = CONFIG.billboards || [];
  const closeIcon = window.HakoMachiIcons ? window.HakoMachiIcons.icon('close') : 'Remove';
  if (bbs.length === 0) {
    container.innerHTML = '<div class="small" style="color:var(--muted);">No billboards yet — click Add to place one.</div>';
    return;
  }
  container.innerHTML = bbs.map((bb, i) => `
    <div style="border:1px solid var(--border);border-radius:6px;padding:8px;margin-bottom:6px;">
      <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px;">
        <b style="font-size:12px;">Billboard ${i+1}</b>
        <button data-bb-action="remove" data-bb-index="${i}" style="margin-left:auto;padding:1px 8px;font-size:11px;">${closeIcon}</button>
      </div>
      <div class="row" style="gap:6px;flex-wrap:wrap;font-size:11px;">
        <label>Type
          <select data-bb-field="type" data-bb-index="${i}">
            <option value="single" ${bb.type==='single'?'selected':''}>Single-sided</option>
            <option value="square" ${bb.type==='square'?'selected':''}>4-sided cube</option>
          </select>
        </label>
        <label>Face
          <select data-bb-field="face" data-bb-index="${i}">
            ${['front','back','east','west'].map(f=>`<option value="${f}" ${bb.face===f?'selected':''}>${f}</option>`).join('')}
          </select>
        </label>
        <label>Width (mm) <input type="number" min="8" max="80" value="${bb.w||25}" style="width:48px" data-bb-field="w" data-bb-index="${i}"></label>
        <label>Sign height <input type="number" min="6" max="40" value="${bb.height||18}" style="width:48px" data-bb-field="height" data-bb-index="${i}"></label>
        <label>Post height <input type="number" min="4" max="30" value="${bb.postHeight||12}" style="width:48px" data-bb-field="postHeight" data-bb-index="${i}"></label>
      </div>
    </div>
  `).join('');
}

export function openWingEditor() {
  if (!lastPlan) { readForm(); regenerate(); }
  document.getElementById('wingEditorModal').style.display = '';
  weRender();
  weRenderSidebar();
  document.addEventListener('keydown', weKeyDown);
}

export function weClose() {
  document.getElementById('wingEditorModal').style.display = 'none';
  document.removeEventListener('keydown', weKeyDown);
}

export function weApply() {
  weClose();
  regenerate();
}

export function weEventTargetIsEditable(e) {
  const el = e && e.target;
  if (!el) return false;
  if (el.isContentEditable) return true;
  const tag = (el.tagName || '').toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return !!(el.closest && el.closest('[contenteditable="true"]'));
}

export function weDeleteSelectedWingWithConfirm() {
  if (!weSelectedWingId || weSelectedWingId === 'main') return false;

  const idx = CONFIG.wings.findIndex(w => w.id === weSelectedWingId);
  if (idx < 0) return false;

  const wing = CONFIG.wings[idx];
  const label = `Wing ${idx + 1} (${wing.face})`;
  const ok = window.confirm(
    `Delete ${label}?\n\nThis will remove the wing and its generated walls, roof, floor, openings, and per-wing settings. This cannot be undone.`
  );
  if (!ok) return false;

  CONFIG.wings.splice(idx, 1);
  weSelectedWingId = null;
  weRender();
  weRenderSidebar();
  regenerate();
  return true;
}

export function weKeyDown(e) {
  const modal = document.getElementById('wingEditorModal');
  if (!modal || modal.style.display === 'none') return;
  if (e.key === 'Escape') { weClose(); return; }

  // Let normal form editing win. Without this guard, Delete/Backspace while
  // focused inside a wing property text/number box bubbles up to the document
  // listener and deletes the selected wing instead of the field contents.
  if ((e.key === 'Delete' || e.key === 'Backspace') && weEventTargetIsEditable(e)) return;

  if ((e.key === 'Delete' || e.key === 'Backspace') && weSelectedCutId) {
    e.preventDefault();
    weDeleteSelectedCut();
    return;
  }

  if ((e.key === 'Delete' || e.key === 'Backspace') && weSelectedWingId && weSelectedWingId !== 'main') {
    e.preventDefault();
    weDeleteSelectedWingWithConfirm();
  }
}

// ---- Render the top-down floor plan SVG -------------------------------
export function weRender() {
  const svg = document.getElementById('wingEditorSvg');
  if (!svg) return;

  const W = CONFIG.width, D = CONFIG.depth;
  const s = WE_SCALE, P = WE_PAD;

  // Compute total bounding box including all wings and any layout-cut handles
  let { minX, minY, maxX, maxY } = weAllBounds();
  for (const cut of weEnsureLayoutCuts()) {
    if (!cut || cut.enabled === false) continue;
    const resolved = resolveLayoutCutGeometry(cut, CONFIG);
    minX = Math.min(minX, resolved.x1, resolved.x2, resolved.cx != null ? resolved.cx : resolved.x1);
    minY = Math.min(minY, resolved.y1, resolved.y2, resolved.cy != null ? resolved.cy : resolved.y1);
    maxX = Math.max(maxX, resolved.x1, resolved.x2, resolved.cx != null ? resolved.cx : resolved.x1);
    maxY = Math.max(maxY, resolved.y1, resolved.y2, resolved.cy != null ? resolved.cy : resolved.y1);
  }
  // Origin offset so all blocks are visible
  const ox = P - minX * s;
  const oy = P - minY * s;
  const svgW = (maxX - minX) * s + P * 2;
  const svgH = (maxY - minY) * s + P * 2;

  svg.setAttribute('width',   svgW);
  svg.setAttribute('height',  svgH);
  svg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`);

  let html = '';

  // Grid
  const gridStep = 10; // mm
  html += `<g opacity="0.18" pointer-events="none">`;
  for (let gx = Math.floor(minX / gridStep) * gridStep; gx <= maxX + gridStep; gx += gridStep)
    html += `<line x1="${ox+gx*s}" y1="${oy+minY*s-P}" x2="${ox+gx*s}" y2="${oy+maxY*s+P}" stroke="#888" stroke-width="0.5"/>`;
  for (let gy = Math.floor(minY / gridStep) * gridStep; gy <= maxY + gridStep; gy += gridStep)
    html += `<line x1="${ox+minX*s-P}" y1="${oy+gy*s}" x2="${ox+maxX*s+P}" y2="${oy+gy*s}" stroke="#888" stroke-width="0.5"/>`;
  html += '</g>';

  // Wings first (below main)
  for (const wing of CONFIG.wings) {
    const b    = weWingBounds(CONFIG, wing);
    const col  = WING_COLOURS[CONFIG.wings.indexOf(wing) % WING_COLOURS.length];
    const isSel = wing.id === weSelectedWingId;
    const bx = ox + b.x * s, by = oy + b.y * s, bw = b.w * s, bd = b.d * s;

    html += `<rect x="${bx}" y="${by}" width="${bw}" height="${bd}"
      fill="${col}33" stroke="${isSel ? '#f70' : col}" stroke-width="${isSel ? 2.5 : 1.5}"
      data-wingid="${wing.id}" style="cursor:pointer"/>`;

    // Connection type badge
    const cx = bx + bw / 2, cy = by + bd / 2;
    html += `<text x="${cx}" y="${cy - 4}" font-size="9" fill="${col}" font-weight="600"
      text-anchor="middle" font-family="system-ui" pointer-events="none">Wing ${CONFIG.wings.indexOf(wing) + 1}</text>`;
    html += `<text x="${cx}" y="${cy + 7}" font-size="8" fill="${col}"
      text-anchor="middle" font-family="system-ui" pointer-events="none">${wing.connection === 'open' ? '⬜ open' : '⬛ wall'}</text>`;
    const hw = (wing.height || CONFIG.height).toFixed(0);
    html += `<text x="${cx}" y="${cy + 17}" font-size="7" fill="${col}"
      text-anchor="middle" font-family="system-ui" pointer-events="none">${b.w.toFixed(0)}×${b.d.toFixed(0)}×${hw}mm</text>`;

    // Resize handles on outer/parallel edges
    if (isSel) {
      // outer edge handle (filled orange)
      const handles = weGetResizeHandles(CONFIG, wing, ox, oy, s);
      for (const h of handles) {
        html += `<rect x="${h.hx - 5}" y="${h.hy - 5}" width="10" height="10"
          fill="#f70" stroke="#fff" stroke-width="1" rx="2"
          data-wingid="${wing.id}" data-handle="${h.id}" style="cursor:${h.cursor}"/>`;
      }
    }
  }

  // Main block — clickable as sentinel 'main' so the sidebar can show
  // main-only options (currently the truss block; in future other
  // per-block features can hang off the same selector). Highlighted
  // when selected just like wings.
  const mainSel = (weSelectedWingId === 'main');
  html += `<rect x="${ox}" y="${oy}" width="${W*s}" height="${D*s}"
    fill="#c8c0b0" stroke="${mainSel ? '#f70' : '#555'}" stroke-width="${mainSel ? 2.5 : 2}"
    data-wingid="main" style="cursor:pointer"/>`;
  html += `<text x="${ox+W*s/2}" y="${oy+D*s/2+4}" font-size="11" fill="#555"
    text-anchor="middle" font-family="system-ui" pointer-events="none">Main</text>`;
  html += `<text x="${ox+W*s/2}" y="${oy+D*s/2+16}" font-size="8" fill="#777"
    text-anchor="middle" font-family="system-ui" pointer-events="none">${W}×${D}×${CONFIG.height}mm</text>`;

  // "Add wing" arrows on each face
  const arrowDefs = [
    { face: 'east',  ax: ox + W*s + 8,      ay: oy + D*s/2,     label: '+E' },
    { face: 'west',  ax: ox - 8,            ay: oy + D*s/2,     label: '+W' },
    { face: 'front', ax: ox + W*s/2,        ay: oy - 8,         label: '+N' },
    { face: 'back',  ax: ox + W*s/2,        ay: oy + D*s + 8,   label: '+S' },
  ];
  for (const a of arrowDefs) {
    const alreadyHas = CONFIG.wings.some(w => w.face === a.face);
    const col = alreadyHas ? '#bbb' : '#2a80c0';
    html += `<circle cx="${a.ax}" cy="${a.ay}" r="12" fill="${col}" opacity="0.85"
      data-addface="${a.face}" style="cursor:pointer"/>`;
    html += `<text x="${a.ax}" y="${a.ay+4}" font-size="11" fill="white" font-weight="700"
      text-anchor="middle" font-family="system-ui" pointer-events="none">${a.label}</text>`;
  }

  // Fade the portion that will be removed before drawing the interactive cut
  // guides and handles above it.
  html += weRenderLayoutCutFade(ox, oy, s);
  // Layout cut masks draw above the building blocks. Clicking a dashed cut
  // toggles which side is kept; selected cuts expose endpoint/control handles.
  html += weRenderLayoutCuts(ox, oy, s, minX, minY, maxX, maxY);

  svg.innerHTML = html;

  // Event handling — assign rather than stacking listeners each render.
  // weRender() rebuilds the SVG often while dragging/toggling, and using
  // addEventListener here caused each click to fire multiple old handlers.
  svg.onclick = weOnClick;
  svg.onmousedown = weOnMouseDown;
}

export function weGetResizeHandles(cfg, wing, ox, oy, s) {
  const b = weWingBounds(cfg, wing);
  const roles = weWingFaceRoles(wing);
  // Outer edge midpoint + two parallel edge midpoints
  const handles = [];
  const cx = ox + (b.x + b.w / 2) * s;
  const cy = oy + (b.y + b.d / 2) * s;
  const bx = ox + b.x * s, by = oy + b.y * s;
  const bw = b.w * s, bd = b.d * s;

  switch (wing.face) {
    case 'east':
      handles.push({ id: 'depth', hx: bx + bw,       hy: cy,         cursor: 'ew-resize' });
      handles.push({ id: 'left',  hx: cx,             hy: by,         cursor: 'ns-resize' });
      handles.push({ id: 'right', hx: cx,             hy: by + bd,    cursor: 'ns-resize' });
      break;
    case 'west':
      handles.push({ id: 'depth', hx: bx,             hy: cy,         cursor: 'ew-resize' });
      handles.push({ id: 'left',  hx: cx,             hy: by,         cursor: 'ns-resize' });
      handles.push({ id: 'right', hx: cx,             hy: by + bd,    cursor: 'ns-resize' });
      break;
    case 'front':
      handles.push({ id: 'depth', hx: cx,             hy: by,         cursor: 'ns-resize' });
      handles.push({ id: 'left',  hx: bx,             hy: cy,         cursor: 'ew-resize' });
      handles.push({ id: 'right', hx: bx + bw,        hy: cy,         cursor: 'ew-resize' });
      break;
    case 'back':
      handles.push({ id: 'depth', hx: cx,             hy: by + bd,    cursor: 'ns-resize' });
      handles.push({ id: 'left',  hx: bx,             hy: cy,         cursor: 'ew-resize' });
      handles.push({ id: 'right', hx: bx + bw,        hy: cy,         cursor: 'ew-resize' });
      break;
  }
  return handles;
}

export function weOnClick(e) {
  const cutLine = e.target.dataset.cutline;
  const cutId = e.target.dataset.cutid;
  if (cutLine) { weToggleCutDirection(cutLine); return; }
  if (cutId) { weSelectedCutId = cutId; weSelectedWingId = null; weRender(); weRenderSidebar(); return; }

  const wingId = e.target.dataset.wingid;
  const addFace = e.target.dataset.addface;
  if (addFace) { weSelectedCutId = null; weAddWing(addFace); return; }
  if (wingId) { weSelectedCutId = null; weSelectedWingId = wingId; weRender(); weRenderSidebar(); return; }
  // Click on empty canvas → deselect
  if (!e.target.dataset.handle && !e.target.dataset.cuthandle) { weSelectedWingId = null; weSelectedCutId = null; weRender(); weRenderSidebar(); }
}

export function weAddWing(face) {
  const W = CONFIG.width, D = CONFIG.depth;
  const id = 'wing_' + Date.now();
  const defaultSpan  = (face === 'east' || face === 'west') ? Math.round(D * 0.6) : Math.round(W * 0.6);
  const defaultDepth = 40;
  const defaultOffset = (face === 'east' || face === 'west')
    ? Math.round((D - defaultSpan) / 2)
    : Math.round((W - defaultSpan) / 2);

  CONFIG.wings.push({
    id, face,
    offset: defaultOffset,
    span:   defaultSpan,
    depth:  defaultDepth,
    height: CONFIG.height,
    floors: 1,
    connection: 'wall',
    // style overrides (null = inherit)
    claddingStyle: null, windowDensity: null, windowStyle: null,
    roofStyle: null, parapetH: null, floorHeight: null,
    manualOpenings: { front: null, back: null, east: null, west: null },
  });
  weSelectedWingId = id;
  weRender();
  weRenderSidebar();
  regenerate();
}

function weAttachmentFaceLength(wing) {
  return (wing.face === 'east' || wing.face === 'west') ? CONFIG.depth : CONFIG.width;
}

function weClampWingAttachment(wing) {
  if (!wing) return;
  const faceLen = Math.max(1, Number(weAttachmentFaceLength(wing)) || 1);
  wing.span = Math.max(15, Number(wing.span) || 15);
  wing.depth = Math.max(15, Number(wing.depth) || 15);

  // Keep at least a small real overlap so an overhanging wing remains attached
  // to the main building instead of becoming a detached rectangle.
  const minOverlap = Math.min(5, faceLen, wing.span);
  const minOffset = -wing.span + minOverlap;
  const maxOffset = faceLen - minOverlap;
  wing.offset = Math.max(minOffset, Math.min(maxOffset, Number(wing.offset) || 0));
}

// ---- Drag to reposition / resize wings --------------------------------
export let _weDragState = null;

export function weOnMouseDown(e) {
  if (!iwPrimaryPointer(e)) return;

  const cutId = e.target.dataset.cutid;
  const cutHandle = e.target.dataset.cuthandle;
  if (cutId && cutHandle) {
    const cut = weEnsureLayoutCuts().find(c => c.id === cutId);
    if (!cut) return;
    e.preventDefault();
    weSelectedCutId = cutId;
    weSelectedWingId = null;
    weRenderSidebar();
    const start = weCutSvgPoint(e);
    const orig = { x1: cut.x1, y1: cut.y1, x2: cut.x2, y2: cut.y2, cx: cut.cx, cy: cut.cy };
    function onMove(me) {
      const p = weCutSvgPoint(me);
      const dx = (p.x - start.x) / WE_SCALE;
      const dy = (p.y - start.y) / WE_SCALE;
      if (cutHandle === 'p1') { cut.x1 = orig.x1 + dx; cut.y1 = orig.y1 + dy; }
      else if (cutHandle === 'p2') { cut.x2 = orig.x2 + dx; cut.y2 = orig.y2 + dy; }
      else if (cutHandle === 'ctrl') { cut.cx = orig.cx + dx; cut.cy = orig.cy + dy; }
      weRender();
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      regenerate();
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return;
  }

  const wingId  = e.target.dataset.wingid;
  const handleId = e.target.dataset.handle;
  if (!wingId) return;

  const wing = CONFIG.wings.find(w => w.id === wingId);
  if (!wing) return;
  weSelectedWingId = wingId;
  weRender(); weRenderSidebar();

  const svg    = document.getElementById('wingEditorSvg');
  const svgR   = svg.getBoundingClientRect();
  const startX = (e.clientX - svgR.left)  / WE_SCALE;
  const startY = (e.clientY - svgR.top)   / WE_SCALE;
  const origOffset = wing.offset, origSpan = wing.span, origDepth = wing.depth;

  _weDragState = { wing, handleId, startX, startY, origOffset, origSpan, origDepth };

  function onMove(me) {
    const dx = (me.clientX - svgR.left)  / WE_SCALE - startX;
    const dy = (me.clientY - svgR.top)   / WE_SCALE - startY;

    if (!handleId) {
      // Drag body = slide along the attachment face
      if (wing.face === 'east' || wing.face === 'west') {
        wing.offset = origOffset + dy;
      } else {
        wing.offset = origOffset + dx;
      }
      weClampWingAttachment(wing);
    } else if (handleId === 'depth') {
      // Resize depth (outward dimension)
      let delta = (wing.face === 'east' || wing.face === 'front') ? dx :
                  (wing.face === 'west') ? -dx : dy;
      if (wing.face === 'back') delta = dy;
      if (wing.face === 'front') delta = -dy;
      wing.depth = Math.max(15, Math.round(origDepth + delta));
      weClampWingAttachment(wing);
    } else if (handleId === 'left') {
      // Resize span left/top edge
      let delta = (wing.face === 'east' || wing.face === 'west') ? dy : dx;
      const newSpan   = Math.max(15, origSpan - delta);
      const newOffset = origOffset + (origSpan - newSpan);
      wing.span   = Math.round(newSpan);
      wing.offset = Math.round(newOffset);
      weClampWingAttachment(wing);
    } else if (handleId === 'right') {
      // Resize span right/bottom edge
      let delta = (wing.face === 'east' || wing.face === 'west') ? dy : dx;
      wing.span = Math.max(15, Math.round(origSpan + delta));
      weClampWingAttachment(wing);
    }
    weRender();
  }

  function cleanupDrag() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  }

  function onUp() {
    cleanupDrag();
    _weDragState = null;
    regenerate();
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

// ---- Sidebar property panel -------------------------------------------
export function weRenderSidebar() {
  const sidebar = document.getElementById('weSidebar');
  if (!sidebar) return;
  sidebar.innerHTML = '';

  // Layout cut tools. These are global export-crop masks, not tied to a
  // specific wing. Click a dashed cut line in the canvas to flip the kept side.
  const cutHdr = document.createElement('div');
  cutHdr.className = 'we-section-label';
  cutHdr.textContent = 'Layout Cuts';
  sidebar.appendChild(cutHdr);
  const cutNote = document.createElement('div');
  cutNote.style.cssText = 'font-size:10px;color:var(--muted);line-height:1.35;margin-bottom:5px;';
  cutNote.textContent = 'Non-destructive export crop. Click a dashed cut line to toggle which side is kept; drag red handles to move it.';
  sidebar.appendChild(cutNote);
  const cutBtns = document.createElement('div');
  cutBtns.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:5px;';
  const plusIcon = window.HakoMachiIcons ? window.HakoMachiIcons.icon('plus') : '+';
  cutBtns.innerHTML = `<button type="button">${plusIcon} Straight</button><button type="button">${plusIcon} Arc</button>`;
  cutBtns.children[0].onclick = () => weAddLayoutCut('line');
  cutBtns.children[1].onclick = () => weAddLayoutCut('arc');
  sidebar.appendChild(cutBtns);
  if (weSelectedCutId) {
    const cut = weEnsureLayoutCuts().find(c => c.id === weSelectedCutId);
    if (cut) {
      const cutInfo = document.createElement('div');
      cutInfo.style.cssText = 'font-size:10px;color:#a22;background:#fff0f0;border:1px solid #e0b0b0;border-radius:4px;padding:5px;margin-bottom:5px;';
      cutInfo.textContent = `${cut.type === 'arc' ? 'Arc' : 'Straight'} cut selected — keeping ${cut.keepSide} side.`;
      sidebar.appendChild(cutInfo);
      weRenderSelectedCutControls(sidebar, cut);
      const del = document.createElement('button');
      del.innerHTML = `${window.HakoMachiIcons ? window.HakoMachiIcons.icon('trash') : ''}<span>Remove selected cut</span>`;
      del.style.cssText = 'width:100%;font-size:11px;margin-bottom:6px;border-color:#d22;color:#a22;background:#fff5f5;';
      del.onclick = weDeleteSelectedCut;
      sidebar.appendChild(del);
    }
  }
  if (weEnsureLayoutCuts().length) {
    const clear = document.createElement('button');
    clear.textContent = 'Clear all layout cuts';
    clear.style.cssText = 'width:100%;font-size:11px;margin-bottom:8px;';
    clear.onclick = () => {
      if (!confirm('Clear all layout cuts?')) return;
      CONFIG.layoutCuts = [];
      weSelectedCutId = null;
      weRender(); weRenderSidebar(); regenerate();
    };
    sidebar.appendChild(clear);
  }

  // Block list — Main first, then wings. Selecting "Main" puts the
  // sidebar into main-block mode where only main-applicable controls
  // (currently the truss block) are shown; selecting a wing shows the
  // full per-wing property panel as before. The same `weSelectedWingId`
  // state holds either a wing UUID or the sentinel string 'main'.
  const listHdr = document.createElement('div');
  listHdr.className = 'we-section-label';
  listHdr.textContent = 'Blocks';
  sidebar.appendChild(listHdr);

  const mainChip = document.createElement('div');
  mainChip.className = 'we-wing-chip' + (weSelectedWingId === 'main' ? ' we-selected' : '');
  mainChip.innerHTML = `<span class="we-wing-dot" style="background:#c8c0b0;border:1px solid #555"></span>Main`;
  mainChip.onclick = () => { weSelectedWingId = 'main'; weRender(); weRenderSidebar(); };
  sidebar.appendChild(mainChip);

  for (const wing of CONFIG.wings) {
    const idx  = CONFIG.wings.indexOf(wing);
    const col  = WING_COLOURS[idx % WING_COLOURS.length];
    const chip = document.createElement('div');
    chip.className = 'we-wing-chip' + (wing.id === weSelectedWingId ? ' we-selected' : '');
    chip.innerHTML = `<span class="we-wing-dot" style="background:${col}"></span>Wing ${idx + 1} (${wing.face})`;
    chip.onclick = () => { weSelectedWingId = wing.id; weRender(); weRenderSidebar(); };
    sidebar.appendChild(chip);
  }

  // Main mode: only the truss section is shown (other main settings live
  // in the main controls panel on the left of the app).
  if (weSelectedWingId === 'main') {
    weRenderTrussSection(sidebar, CONFIG, () => { weRender(); weRenderSidebar(); regenerate(); });
    return;
  }

  if (!weSelectedWingId) {
    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:11px;color:var(--muted);margin-top:8px;';
    hint.textContent = 'Click Main, a wing, or the + arrows to add a wing.';
    sidebar.appendChild(hint);
    return;
  }

  const wing = CONFIG.wings.find(w => w.id === weSelectedWingId);
  if (!wing) return;

  const propsHdr = document.createElement('div');
  propsHdr.className = 'we-section-label';
  propsHdr.textContent = 'Properties';
  sidebar.appendChild(propsHdr);

  function numField(label, key, min, max, step) {
    const d = document.createElement('div'); d.className = 'field';
    d.innerHTML = `<label>${label}</label><input type="number" min="${min}" max="${max}" step="${step}" value="${wing[key] != null ? wing[key] : ''}">`;
    const inp = d.querySelector('input');
    inp.addEventListener('change', () => {
      if (inp.value === '') {
        wing[key] = null;
      } else {
        let v = parseFloat(inp.value);
        if (!isFinite(v)) v = min;
        if (v < min) v = min;
        if (v > max) v = max;
        wing[key] = v;
        if (key === 'offset' || key === 'span' || key === 'depth') weClampWingAttachment(wing);
        inp.value = wing[key];
      }
      weRender(); weRenderSidebar(); regenerate();
    });
    sidebar.appendChild(d);
  }

  function twoNumFields(lA, kA, lB, kB, min, max, step) {
    const row = document.createElement('div'); row.className = 'field-row';
    function makeF(label, key) {
      const d = document.createElement('div'); d.className = 'field';
      d.innerHTML = `<label>${label}</label><input type="number" min="${min}" max="${max}" step="${step}" value="${wing[key] != null ? wing[key] : ''}">`;
      d.querySelector('input').addEventListener('change', ev => {
        wing[key] = parseFloat(ev.target.value) || null;
        if (key === 'offset' || key === 'span' || key === 'depth') weClampWingAttachment(wing);
        weRender(); weRenderSidebar(); regenerate();
      });
      return d;
    }
    row.appendChild(makeF(lA, kA)); row.appendChild(makeF(lB, kB));
    sidebar.appendChild(row);
  }

  const faceLenForWing = weAttachmentFaceLength(wing);
  numField('Offset (mm)',  'offset', -500, faceLenForWing + 500, 1);
  twoNumFields('Span (mm)', 'span', 'Depth (mm)', 'depth', 5, 500, 1);
  numField('Floors',       'floors',  1,   10, 1);
  // Optional height override — leave blank to derive from Floors × main
  // building floor heights. Set to a positive value to lock the wing's
  // total height regardless of floor count. The wing's per-floor heights
  // scale to fit, so the floor band positions still divide the override
  // evenly. Best used with 'wall' connections; 'open' connections rely on
  // floor heights matching the main building's, which a height override
  // breaks by design.
  numField('Height override (mm) — blank inherits', 'height', 10, 500, 1);

  // Show the derived total height as a read-only hint so users know what
  // floor count / override maps to. The hint adapts to which mode is active.
  (function showDerivedHeight() {
    const h = wingHeight(CONFIG, wing);
    const floorH = (CONFIG.floorHeight && CONFIG.floorHeight > 0) ? CONFIG.floorHeight : 30;
    const firstH = (CONFIG.firstFloorHeightEnabled && CONFIG.firstFloorHeight && CONFIG.firstFloorHeight > 0)
      ? CONFIG.firstFloorHeight
      : floorH;
    const inheritedTotal = firstH + ((wing.floors || 1) - 1) * floorH;
    const overrideActive = !!(wing.height && wing.height > 0
                              && Math.abs(wing.height - inheritedTotal) > 0.01);
    const hint = document.createElement('div');
    hint.className = 'we-hint';
    hint.style.cssText = 'font-size:11px;color:#666;margin:-4px 0 8px 0;line-height:1.4;';
    if (overrideActive) {
      const scale = h / inheritedTotal;
      const scaledFirst = (firstH * scale).toFixed(1);
      const scaledStd   = (floorH * scale).toFixed(1);
      hint.textContent = `Height: ${h} mm (OVERRIDE — wing floors scaled to 1st ${scaledFirst} mm + ${(wing.floors||1)-1} × ${scaledStd} mm)`;
      hint.style.color = '#a05000';
    } else {
      hint.textContent = `Height: ${h} mm (1st floor ${firstH} mm + ${(wing.floors||1)-1} × ${floorH} mm — inherited from main)`;
    }
    sidebar.appendChild(hint);
  })();

  // Connection type
  const connHdr = document.createElement('div'); connHdr.className = 'we-section-label'; connHdr.textContent = 'Connection';
  sidebar.appendChild(connHdr);
  const connRow = document.createElement('div'); connRow.className = 'we-connection-toggle';
  function connBtn(label, val) {
    const b = document.createElement('button');
    b.textContent = label;
    b.className = wing.connection === val ? 'active' : '';
    b.title = val === 'wall' ? 'A solid dividing wall separates the two blocks' : 'Open plan — interiors are connected (floor heights must match)';
    b.onclick = () => { wing.connection = val; weRender(); weRenderSidebar(); regenerate(); };
    connRow.appendChild(b);
  }
  connBtn('⬛ Wall', 'wall');
  connBtn('⬜ Open', 'open');
  sidebar.appendChild(connRow);

  if (wing.connection === 'open') {
    const note = document.createElement('div');
    note.style.cssText = 'font-size:10px;color:#a05000;background:#fff3e0;border:1px solid #f0c070;border-radius:3px;padding:4px 6px;';
    note.textContent = 'Open plan: floor heights must match on each level.';
    sidebar.appendChild(note);
  }

  // Style overrides
  const styleHdr = document.createElement('div'); styleHdr.className = 'we-section-label'; styleHdr.textContent = 'Style Overrides';
  sidebar.appendChild(styleHdr);

  function selectField(label, key, options) {
    const d = document.createElement('div'); d.className = 'field';
    const opts = [['', '— Inherit —'], ...options];
    d.innerHTML = `<label>${label}</label><select>${opts.map(([v,t]) => `<option value="${v}" ${wing[key] === v || (v === '' && wing[key] == null) ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
    d.querySelector('select').addEventListener('change', ev => { wing[key] = ev.target.value || null; regenerate(); });
    sidebar.appendChild(d);
  }

  selectField('Cladding', 'claddingStyle', Object.entries(CLADDING_STYLES).map(([k, v]) => [k, v.label || k]));
  // Roof cladding override: separate from wall cladding because the user
  // may want, e.g., corrugated metal walls + tile roof on a wing while
  // main has both metal. Falls back to wing.claddingStyle (and then main's
  // roofCladdingStyle, then main's claddingStyle) via buildWingCfg's
  // `roofCladdingStyle: wing.roofCladdingStyle || cfg.roofCladdingStyle`
  // — which inherits down the same precedence chain as wing.claddingStyle.
  selectField('Roof cladding', 'roofCladdingStyle', Object.entries(CLADDING_STYLES).map(([k, v]) => [k, v.label || k]));

  // Interior cladding controls — per-wing override. The toggle is a
  // tri-state: 'inherit' (null) follows main's setting, true/false force
  // it on or off for this wing alone. Style picker only shown when the
  // resolved effective state is "on" so the field doesn't claim screen
  // real estate when it would have no effect.
  {
    const d = document.createElement('div'); d.className = 'field';
    const cur = wing.interiorCladding;
    const inheritedFromMain = !!CONFIG.interiorCladding;
    const inheritLabel = `inherit (${inheritedFromMain ? 'on' : 'off'})`;
    d.innerHTML = `<label>Interior cladding</label>
      <select>
        <option value=""    ${cur == null  ? 'selected' : ''}>— ${inheritLabel} —</option>
        <option value="on"  ${cur === true ? 'selected' : ''}>On</option>
        <option value="off" ${cur === false? 'selected' : ''}>Off</option>
      </select>`;
    d.querySelector('select').addEventListener('change', ev => {
      const v = ev.target.value;
      wing.interiorCladding = v === '' ? null : (v === 'on');
      weRenderSidebar(); regenerate();
    });
    sidebar.appendChild(d);

    // Show style picker if interior cladding is effectively ON for this
    // wing (either explicitly set true, or inherited-on from main).
    const effectiveOn = (cur === true) || (cur == null && inheritedFromMain);
    if (effectiveOn) {
      selectField('Interior style', 'interiorCladdingStyle',
        Object.entries(CLADDING_STYLES).map(([k, v]) => [k, v.label || k]));
    }
  }
  selectField('Roof',     'roofStyle',     [
    ['flat',    'Flat'],
    ['parapet', 'Parapet'],
    ['slanted', 'Slanted'],
    ['gabled',  'Gabled'],
  ]);

  // ── Roof-specific overrides. The effective roof style is the wing's override
  // (when set) or main cfg's value (when wing.roofStyle is null/Inherit). Each
  // sub-field can independently be left empty to inherit main's value.
  const effectiveRoof = wing.roofStyle || CONFIG.roofStyle;

  function inheritedNumField(label, key, min, max, step, mainValue) {
    const d = document.createElement('div'); d.className = 'field';
    const placeholder = (mainValue != null) ? `inherit (${mainValue})` : 'inherit';
    d.innerHTML = `<label>${label}</label><input type="number" min="${min}" max="${max}" step="${step}" value="${wing[key] != null ? wing[key] : ''}" placeholder="${placeholder}">`;
    const inp = d.querySelector('input');
    inp.addEventListener('change', () => {
      const v = inp.value.trim();
      wing[key] = v === '' ? null : parseFloat(v);
      weRender(); weRenderSidebar(); regenerate();
    });
    sidebar.appendChild(d);
  }
  function inheritedSelectField(label, key, options, mainValue) {
    const d = document.createElement('div'); d.className = 'field';
    const mainLabel = options.find(([v]) => v === mainValue);
    const inheritLabel = mainLabel ? `— Inherit (${mainLabel[1]}) —` : '— Inherit —';
    const opts = [['', inheritLabel], ...options];
    d.innerHTML = `<label>${label}</label><select>${opts.map(([v,t]) =>
      `<option value="${v}" ${wing[key] === v || (v === '' && wing[key] == null) ? 'selected' : ''}>${t}</option>`
    ).join('')}</select>`;
    d.querySelector('select').addEventListener('change', ev => {
      wing[key] = ev.target.value || null;
      weRender(); weRenderSidebar(); regenerate();
    });
    sidebar.appendChild(d);
  }

  if (effectiveRoof === 'parapet') {
    inheritedNumField('Parapet height (mm)', 'parapetHeight', 1, 10, 0.5, CONFIG.parapetHeight);
  } else if (effectiveRoof === 'slanted') {
    inheritedNumField('Roof pitch (mm rise)', 'roofPitch', 3, 40, 1, CONFIG.roofPitch);
    inheritedSelectField('High side', 'roofSlopeDirection', [
      ['back',  'Back is high'],
      ['front', 'Front is high'],
      ['east',  'East is high'],
      ['west',  'West is high'],
    ], CONFIG.roofSlopeDirection);
  } else if (effectiveRoof === 'gabled') {
    inheritedNumField('Roof pitch (mm rise)', 'roofPitch', 3, 40, 1, CONFIG.roofPitch);
    inheritedSelectField('Ridge direction', 'roofRidgeDirection', [
      ['ew', 'East–West (slopes face span ends)'],
      ['ns', 'North–South (slopes face depth ends)'],
    ], CONFIG.roofRidgeDirection);
  }

  // Truss section — same renderer as main, but bound to the wing's own
  // trusses object. Auto-initialised when missing so the user's first
  // toggle creates the field rather than throwing.
  if (!wing.trusses) {
    wing.trusses = { enabled: false, spacing: 30, axis: null, chordW: 2,
                     xBraceEnabled: false, xBraceW: 1.0, xBraceWalls: [],
                     supports: false, supportColumnType: 'i', supportDepth: 4, supportFlangeW: 4 };
  }
  weRenderTrussSection(sidebar, wing, () => { weRender(); weRenderSidebar(); regenerate(); });

  // Delete button
  const delBtn = document.createElement('button');
  delBtn.innerHTML = `${window.HakoMachiIcons ? window.HakoMachiIcons.icon('trash') : ''}<span>Remove Wing</span>`;
  delBtn.style.cssText = 'margin-top:12px;width:100%;padding:6px;font-size:12px;cursor:pointer;border:1px solid var(--accent);color:var(--accent);border-radius:3px;background:#fff3ee;';
  delBtn.onclick = () => {
    weDeleteSelectedWingWithConfirm();
  };
  sidebar.appendChild(delBtn);
}

/* Renders the Trusses controls block into the given sidebar element.
 * `blockObj` is either CONFIG (for main) or a wing object — both carry
 * a `trusses` field with the same shape. `onChange` is fired after every
 * edit; callers pass a closure that rerenders the canvas + regenerates
 * the build. Initialises blockObj.trusses lazily so older saves that
 * predate this feature get sensible defaults on first interaction. */
export function weRenderTrussSection(sidebar, blockObj, onChange) {
  if (!blockObj.trusses) {
    blockObj.trusses = { enabled: false, spacing: 30, axis: null, chordW: 2,
                         xBraceEnabled: false, xBraceW: 1.0, xBraceWalls: [],
                         supports: false, supportColumnType: 'i', supportDepth: 4, supportFlangeW: 4 };
  }
  const t = blockObj.trusses;
  if (t.xBraceEnabled == null) t.xBraceEnabled = Array.isArray(t.xBraceWalls) && t.xBraceWalls.length > 0;
  if (t.xBraceW == null) t.xBraceW = 1.0;
  if (!t.supportColumnType) t.supportColumnType = 'i';
  if (t.supportDepth == null) t.supportDepth = 4;
  if (t.supportFlangeW == null) t.supportFlangeW = 4;

  const hdr = document.createElement('div');
  hdr.className = 'we-section-label';
  hdr.textContent = 'Trusses';
  sidebar.appendChild(hdr);

  // Enable toggle
  const enableField = document.createElement('div'); enableField.className = 'field';
  enableField.innerHTML = `<label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
    <input type="checkbox" ${t.enabled ? 'checked' : ''}>
    <span>Enable trusses</span>
  </label>`;
  const enableInput = enableField.querySelector('input');
  enableInput.addEventListener('change', () => {
    t.enabled = enableInput.checked;
    onChange();
  });
  sidebar.appendChild(enableField);

  if (!t.enabled) {
    const hint = document.createElement('div');
    hint.style.cssText = 'font-size:10px;color:var(--muted);margin-top:-2px;';
    hint.textContent = 'Style auto-picked from roof (Fink for gabled, mono-pitch Pratt for slanted, parallel-chord Pratt for flat/parapet).';
    sidebar.appendChild(hint);
    return;
  }

  // Spacing (mm between truss positions)
  const spacingField = document.createElement('div'); spacingField.className = 'field';
  spacingField.innerHTML = `<label>Spacing (mm)</label>
    <input type="number" min="5" max="200" step="1" value="${t.spacing}">`;
  const spacingInput = spacingField.querySelector('input');
  spacingInput.addEventListener('change', () => {
    t.spacing = Math.max(5, parseFloat(spacingInput.value) || 30);
    onChange();
  });
  sidebar.appendChild(spacingField);

  // Direction (auto / ns / ew)
  const dirField = document.createElement('div'); dirField.className = 'field';
  const ridgeForLabel = effectiveRidgeDir(blockObj);
  const autoLabel = (blockObj.roofStyle === 'gabled' || blockObj.roofStyle === 'parapet_gable')
    ? (ridgeForLabel === 'ew' ? 'Auto (NS — perpendicular to ridge)' : 'Auto (EW — perpendicular to ridge)')
    : `Auto (perpendicular to longer side)`;
  dirField.innerHTML = `<label>Direction</label>
    <select>
      <option value="" ${t.axis == null ? 'selected' : ''}>${autoLabel}</option>
      <option value="ns" ${t.axis === 'ns' ? 'selected' : ''}>N–S (trusses run north-south)</option>
      <option value="ew" ${t.axis === 'ew' ? 'selected' : ''}>E–W (trusses run east-west)</option>
    </select>`;
  const dirInput = dirField.querySelector('select');
  dirInput.addEventListener('change', () => {
    t.axis = dirInput.value || null;
    onChange();
  });
  sidebar.appendChild(dirField);

  // Chord width
  const chordField = document.createElement('div'); chordField.className = 'field';
  chordField.innerHTML = `<label>Member width (mm)</label>
    <input type="number" min="0.5" max="10" step="0.5" value="${t.chordW}">`;
  const chordInput = chordField.querySelector('input');
  chordInput.addEventListener('change', () => {
    t.chordW = Math.max(0.5, parseFloat(chordInput.value) || 2);
    onChange();
  });
  sidebar.appendChild(chordField);

  // Wall X-bracing — simplified to a single toggle. The generator automatically
  // adds braces on the truss-bearing walls for the selected truss direction:
  // N-S trusses = front/back walls; E-W trusses = east/west walls.
  const xbField = document.createElement('div'); xbField.className = 'field';
  xbField.innerHTML = `<label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
    <input type="checkbox" ${wallXBracingEnabled(t) ? 'checked' : ''}>
    <span>Add wall X-bracing between trusses</span>
  </label>
  <div class="small">Automatically places connected X braces on the truss-bearing walls for the selected direction.</div>`;
  const xbInput = xbField.querySelector('input');
  xbInput.addEventListener('change', () => {
    t.xBraceEnabled = xbInput.checked;
    // Clear the old per-wall list so saved files use the new single-toggle model.
    t.xBraceWalls = [];
    onChange();
  });
  sidebar.appendChild(xbField);

  const xbWidthField = document.createElement('div'); xbWidthField.className = 'field';
  xbWidthField.innerHTML = `<label>Wall X-brace width (mm)</label>
    <input type="number" min="0.3" max="10" step="0.1" value="${t.xBraceW ?? 1.0}">
    <div class="small">Width of the wall X-brace strips only. This does not change the roof truss member width.</div>`;
  const xbWidthInput = xbWidthField.querySelector('input');
  xbWidthInput.addEventListener('change', () => {
    t.xBraceW = Math.max(0.3, parseFloat(xbWidthInput.value) || 1.0);
    onChange();
  });
  sidebar.appendChild(xbWidthField);

  // Vertical column supports — the 3-piece I-beam system that holds
  // each truss up against the wall. Default off so existing users
  // don't get surprise column parts on regenerate; once enabled, the
  // depth+flangeW inputs let the user dial in the visual proportions
  // (defaults at 4×4 mm read well at N-scale).
  const supHdr = document.createElement('div');
  supHdr.style.cssText = 'font-size:11px;color:#555;margin-top:10px;';
  supHdr.textContent = 'Vertical wall supports';
  sidebar.appendChild(supHdr);

  const supField = document.createElement('div'); supField.className = 'field';
  supField.innerHTML = `<label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
    <input type="checkbox" ${t.supports ? 'checked' : ''}>
    <span>Add column supports at each truss</span>
  </label>`;
  const supInput = supField.querySelector('input');
  supInput.addEventListener('change', () => {
    t.supports = supInput.checked;
    onChange();
  });
  sidebar.appendChild(supField);

  if (t.supports) {
    // Column cross-section: I-beam has back flange + web + end cap; T-beam
    // omits the end cap so it projects less deeply into the model interior.
    const typeField = document.createElement('div'); typeField.className = 'field';
    const supportType = t.supportColumnType === 't' ? 't' : 'i';
    typeField.innerHTML = `<label>Column cross-section</label>
      <select>
        <option value="i" ${supportType === 'i' ? 'selected' : ''}>I-beam — back + web + end cap</option>
        <option value="t" ${supportType === 't' ? 'selected' : ''}>T-beam — back + web only</option>
      </select>`;
    const typeInput = typeField.querySelector('select');
    typeInput.addEventListener('change', () => {
      t.supportColumnType = typeInput.value === 't' ? 't' : 'i';
      onChange();
    });
    sidebar.appendChild(typeField);

    // Depth: how far the web sticks out from the wall.
    const depthField = document.createElement('div'); depthField.className = 'field';
    depthField.innerHTML = `<label>Web depth (mm)</label>
      <input type="number" min="1" max="20" step="0.5" value="${t.supportDepth != null ? t.supportDepth : 4}">`;
    const depthInput = depthField.querySelector('input');
    depthInput.addEventListener('change', () => {
      t.supportDepth = Math.max(1, parseFloat(depthInput.value) || 4);
      onChange();
    });
    sidebar.appendChild(depthField);

    // Flange width: visual width of the wall-side flange along the wall.
    // For I-beams, the end cap uses the same width.
    const flangeField = document.createElement('div'); flangeField.className = 'field';
    flangeField.innerHTML = `<label>Flange width (mm)</label>
      <input type="number" min="2" max="20" step="0.5" value="${t.supportFlangeW != null ? t.supportFlangeW : 4}">`;
    const flangeInput = flangeField.querySelector('input');
    flangeInput.addEventListener('change', () => {
      t.supportFlangeW = Math.max(2, parseFloat(flangeInput.value) || 4);
      onChange();
    });
    sidebar.appendChild(flangeField);

    const supHint = document.createElement('div');
    supHint.style.cssText = 'font-size:10px;color:var(--muted);margin-top:-2px;';
    supHint.textContent = supportType === 't'
      ? 'T-beam columns use only a wall-side flange and perpendicular web, so the etched floor footprint is shallower and no end-cap pieces are generated.'
      : 'I-beam columns use back flange + perpendicular web + end cap (all core). The floor shows an etched footprint at each position.';
    sidebar.appendChild(supHint);
  }
}
