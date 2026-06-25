/* =====================================================================
   SHARED MODAL EDITOR FRAMEWORK
   ---------------------------------------------------------------------
   Small, adapter-based utilities shared by the wall editor and the
   floor/roof editor. Each editor still owns its domain-specific data, but
   common behaviours — topbar button creation, align, distribute, clipboard
   affordances — now use the same framework so fixes land once.
   ===================================================================== */

function editorTopbarKit(bar) {
  return {
    sep() {
      const d = document.createElement('div');
      d.className = 'oe-topbar-sep';
      bar.appendChild(d);
      return d;
    },
    label(text) {
      const s = document.createElement('span');
      s.className = 'oe-topbar-label';
      s.textContent = text;
      bar.appendChild(s);
      return s;
    },
    button({ id, html, title, onClick, disabled = false, active = false, parent = bar, compact = false }) {
      const b = document.createElement('button');
      if (id) b.id = id;
      b.className = 'oe-tb-btn';
      b.innerHTML = html;
      b.title = title || '';
      if (compact) b.style.cssText = 'width:26px;height:26px;padding:0;display:flex;align-items:center;justify-content:center;';
      if (disabled) b.disabled = true;
      if (active) b.classList.add('tb-active');
      if (onClick && !disabled) b.addEventListener('click', e => { e.preventDefault(); onClick(e); });
      parent.appendChild(b);
      return b;
    },
  };
}

function editorNormalizeRefs(refs) {
  return (refs || []).filter(r =>
    r && r.bbox &&
    isFinite(r.bbox.x) && isFinite(r.bbox.y) &&
    isFinite(r.bbox.w) && isFinite(r.bbox.h) &&
    typeof r.setX === 'function' &&
    typeof r.setY === 'function'
  );
}

function editorAlignRefs(refs, mode) {
  refs = editorNormalizeRefs(refs);
  if (refs.length < 2) return false;
  const xs = refs.map(r => r.bbox.x);
  const rights = refs.map(r => r.bbox.x + r.bbox.w);
  const ys = refs.map(r => r.bbox.y);
  const bottoms = refs.map(r => r.bbox.y + r.bbox.h);
  switch (mode) {
    case 'left':    { const t = Math.min(...xs);      refs.forEach(r => r.setX(t)); break; }
    case 'right':   { const t = Math.max(...rights);  refs.forEach(r => r.setX(t - r.bbox.w)); break; }
    case 'centerX': { const t = (Math.min(...xs) + Math.max(...rights)) / 2; refs.forEach(r => r.setX(t - r.bbox.w / 2)); break; }
    case 'top':     { const t = Math.min(...ys);      refs.forEach(r => r.setY(t)); break; }
    case 'bottom':  { const t = Math.max(...bottoms); refs.forEach(r => r.setY(t - r.bbox.h)); break; }
    case 'centerY': { const t = (Math.min(...ys) + Math.max(...bottoms)) / 2; refs.forEach(r => r.setY(t - r.bbox.h / 2)); break; }
    default: return false;
  }
  refs.forEach(r => { if (typeof r.afterMove === 'function') r.afterMove(); });
  return true;
}

function editorDistributeRefs(refs, axis, mode = 'gap') {
  refs = editorNormalizeRefs(refs);
  if (refs.length < 3) return false;
  const horizontal = axis === 'h' || axis === 'x' || axis === 'horizontal';

  if (mode === 'center') {
    refs.sort((a, b) => {
      const ac = horizontal ? a.bbox.x + a.bbox.w / 2 : a.bbox.y + a.bbox.h / 2;
      const bc = horizontal ? b.bbox.x + b.bbox.w / 2 : b.bbox.y + b.bbox.h / 2;
      return ac - bc;
    });
    const firstC = horizontal ? refs[0].bbox.x + refs[0].bbox.w / 2
                              : refs[0].bbox.y + refs[0].bbox.h / 2;
    const last = refs[refs.length - 1];
    const lastC = horizontal ? last.bbox.x + last.bbox.w / 2
                             : last.bbox.y + last.bbox.h / 2;
    const step = (lastC - firstC) / (refs.length - 1);
    for (let i = 1; i < refs.length - 1; i++) {
      const c = firstC + step * i;
      if (horizontal) refs[i].setX(c - refs[i].bbox.w / 2);
      else refs[i].setY(c - refs[i].bbox.h / 2);
    }
  } else {
    refs.sort((a, b) => horizontal ? a.bbox.x - b.bbox.x : a.bbox.y - b.bbox.y);
    const first = refs[0];
    const last = refs[refs.length - 1];
    const start = horizontal ? first.bbox.x : first.bbox.y;
    const end = horizontal ? last.bbox.x + last.bbox.w : last.bbox.y + last.bbox.h;
    const total = refs.reduce((s, r) => s + (horizontal ? r.bbox.w : r.bbox.h), 0);
    const gap = (end - start - total) / (refs.length - 1);
    let cursor = start;
    for (const r of refs) {
      if (horizontal) { r.setX(cursor); cursor += r.bbox.w + gap; }
      else { r.setY(cursor); cursor += r.bbox.h + gap; }
    }
  }
  refs.forEach(r => { if (typeof r.afterMove === 'function') r.afterMove(); });
  return true;
}

function editorIcon(name) {
  const alignMap = { alignL: 'left', alignCx: 'centerH', alignR: 'right', alignT: 'top', alignCy: 'middleV', alignB: 'bottom' };
  if (alignMap[name]) return alignIconSvg(alignMap[name]);
  if (name === 'distH') return distributeIconSvg('h');
  if (name === 'distV') return distributeIconSvg('v');
  if (name === 'copy') return '<span style="font-size:13px">📋</span>';
  if (name === 'paste') return '<span style="font-size:13px">📥</span>';
  if (name === 'delete') return '<span style="font-size:13px">⌫</span>';
  return '';
}

function editorAddAlignmentGroup(bar, opts) {
  const kit = editorTopbarKit(bar);
  const alignCount = Number(opts.alignCount || 0);
  const distCount = Number(opts.distributeCount || 0);
  const canAlign = alignCount >= 2;
  const canDistribute = distCount >= 3;
  const parent = opts.parent || bar;

  const maybeLabel = label => { if (opts.showLabels !== false) kit.label(label); };

  maybeLabel('Align');
  [
    ['alignL',  'Align left edges',          () => opts.onAlign && opts.onAlign('left')],
    ['alignCx', 'Align horizontal centres',  () => opts.onAlign && opts.onAlign('centerX')],
    ['alignR',  'Align right edges',         () => opts.onAlign && opts.onAlign('right')],
    ['alignT',  'Align top edges',           () => opts.onAlign && opts.onAlign('top')],
    ['alignCy', 'Align vertical centres',    () => opts.onAlign && opts.onAlign('centerY')],
    ['alignB',  'Align bottom edges',        () => opts.onAlign && opts.onAlign('bottom')],
  ].forEach(([icon, title, cb]) => {
    kit.button({ html: editorIcon(icon), title: title + (canAlign ? '' : ' (select ≥ 2)'), onClick: cb, disabled: !canAlign, parent, compact: true });
  });

  if (opts.addSeparator !== false) kit.sep();

  maybeLabel('Distribute');
  kit.button({ html: editorIcon('distH'), title: 'Distribute horizontally' + (canDistribute ? '' : ' (select ≥ 3)'), onClick: () => opts.onDistribute && opts.onDistribute('h'), disabled: !canDistribute, parent, compact: true });
  kit.button({ html: editorIcon('distV'), title: 'Distribute vertically' + (canDistribute ? '' : ' (select ≥ 3)'), onClick: () => opts.onDistribute && opts.onDistribute('v'), disabled: !canDistribute, parent, compact: true });

  return kit;
}

function editorAddClipboardGroup(bar, opts) {
  const kit = editorTopbarKit(bar);
  const parent = opts.parent || bar;
  const canCopy = !!opts.canCopy;
  const canPaste = !!opts.canPaste;
  const canDelete = !!opts.canDelete;
  kit.button({ html: editorIcon('copy'),   title: opts.copyTitle   || (canCopy ? 'Copy' : 'Copy (select ≥ 1)'), onClick: opts.onCopy,   disabled: !canCopy,   parent, compact: true });
  kit.button({ html: editorIcon('paste'),  title: opts.pasteTitle  || (canPaste ? 'Paste' : 'Paste (clipboard empty)'), onClick: opts.onPaste, disabled: !canPaste, parent, compact: true });
  kit.button({ html: editorIcon('delete'), title: opts.deleteTitle || (canDelete ? 'Delete selected' : 'Delete (select ≥ 1)'), onClick: opts.onDelete, disabled: !canDelete, parent, compact: true });
  return kit;
}

function editorAddNumberControl(bar, opts) {
  const wrap = document.createElement('span');
  wrap.style.cssText = 'display:inline-flex;align-items:center;gap:3px;';
  if (opts.label) {
    const lab = document.createElement('span');
    lab.className = 'oe-topbar-label';
    lab.textContent = opts.label;
    wrap.appendChild(lab);
  }
  const inp = document.createElement('input');
  inp.type = 'number';
  inp.min = String(opts.min != null ? opts.min : 0);
  inp.max = String(opts.max != null ? opts.max : 9999);
  inp.step = String(opts.step != null ? opts.step : 1);
  inp.value = String(opts.value != null ? opts.value : 0);
  inp.className = 'oe-sel-size-input';
  inp.style.width = (opts.width || 46) + 'px';
  inp.title = opts.title || '';
  function apply() {
    let v = parseFloat(inp.value);
    if (!isFinite(v)) v = Number(opts.fallback != null ? opts.fallback : 0);
    v = Math.max(Number(inp.min), Math.min(Number(inp.max), v));
    inp.value = String(v);
    if (opts.onChange) opts.onChange(v, inp);
  }
  inp.addEventListener('change', apply);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); apply(); } });
  inp.addEventListener('keydown', e => e.stopPropagation(), true);
  wrap.appendChild(inp);
  bar.appendChild(wrap);
  return inp;
}

function editorAddGridControls(bar, opts) {
  const kit = editorTopbarKit(bar);
  kit.label(opts.title || 'Grid');
  if (opts.toggle) {
    kit.button({
      html: opts.enabled ? 'Grid on' : 'Grid off',
      title: opts.toggleTitle || 'Toggle grid snapping',
      active: !!opts.enabled,
      onClick: opts.onToggle,
    });
  }
  const ctrls = {};
  if (opts.xStep) ctrls.xStep = editorAddNumberControl(bar, { label: 'X', ...opts.xStep });
  if (opts.yStep) ctrls.yStep = editorAddNumberControl(bar, { label: 'Y', ...opts.yStep });
  if (opts.xyStep) ctrls.xyStep = editorAddNumberControl(bar, { label: opts.xyLabel || 'Grid', ...opts.xyStep });
  if (opts.xOrigin) ctrls.xOrigin = editorAddNumberControl(bar, { label: 'Ox', ...opts.xOrigin });
  if (opts.yOrigin) ctrls.yOrigin = editorAddNumberControl(bar, { label: 'Y0', ...opts.yOrigin });
  if (opts.anchor) {
    const sel = document.createElement('select');
    sel.className = 'oe-tb-btn';
    sel.style.cssText = 'padding:2px 4px;font-size:11px;height:24px;';
    sel.title = opts.anchor.title || 'Snap anchor';
    for (const option of opts.anchor.options || []) {
      const opt = document.createElement('option');
      opt.value = option.value;
      opt.textContent = option.label;
      sel.appendChild(opt);
    }
    sel.value = opts.anchor.value;
    sel.addEventListener('change', () => opts.anchor.onChange && opts.anchor.onChange(sel.value));
    sel.addEventListener('keydown', e => e.stopPropagation(), true);
    bar.appendChild(sel);
    ctrls.anchor = sel;
  }
  return ctrls;
}

function editorIsTypingTarget(target) {
  if (!target) return false;
  const tag = (target.tagName || '').toUpperCase();
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function editorModalIsOpen(modalId) {
  const modal = document.getElementById(modalId);
  return !!(modal && modal.style.display !== 'none');
}

function editorHandleCommonKeyDown(e, opts) {
  if (!editorModalIsOpen(opts.modalId)) return false;
  const inField = editorIsTypingTarget(e.target);
  if (e.key === 'Escape' && opts.onEscape && (!inField || opts.escapeInFields)) {
    e.preventDefault();
    opts.onEscape(e);
    return true;
  }
  if ((e.key === ' ' || e.code === 'Space') && opts.pan && !inField) {
    if (!opts.pan.isDown()) {
      opts.pan.setDown(true);
      const el = opts.pan.cursorEl && opts.pan.cursorEl();
      if (el && !(opts.pan.isPanning && opts.pan.isPanning())) el.style.cursor = 'grab';
    }
    e.preventDefault();
    return true;
  }
  const modKey = e.ctrlKey || e.metaKey;
  if (modKey && !inField) {
    const k = e.key;
    if ((k === 'c' || k === 'C') && opts.onCopy && (opts.canCopy == null || opts.canCopy())) {
      e.preventDefault(); opts.onCopy(e); return true;
    }
    if ((k === 'v' || k === 'V') && opts.onPaste && (opts.canPaste == null || opts.canPaste())) {
      e.preventDefault(); opts.onPaste(e); return true;
    }
    if ((k === 'd' || k === 'D') && opts.onDuplicate && (opts.canDuplicate == null || opts.canDuplicate())) {
      e.preventDefault(); opts.onDuplicate(e); return true;
    }
    if ((k === 'a' || k === 'A') && opts.onSelectAll) {
      e.preventDefault(); opts.onSelectAll(e); return true;
    }
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') && opts.onDelete && (opts.canDelete == null || opts.canDelete()) && !inField) {
    e.preventDefault();
    opts.onDelete(e);
    return true;
  }
  return false;
}

function editorHandleCommonKeyUp(e, opts) {
  if (!editorModalIsOpen(opts.modalId)) return false;
  if ((e.key === ' ' || e.code === 'Space') && opts.pan) {
    opts.pan.setDown(false);
    const el = opts.pan.cursorEl && opts.pan.cursorEl();
    if (el && !(opts.pan.isPanning && opts.pan.isPanning())) el.style.cursor = '';
    return true;
  }
  return false;
}

function alignIconSvg(type) {
  const W = 18, H = 14;
  let rects = '';
  switch (type) {
    case 'left':
      rects = `<rect x="1" y="2" width="7" height="4" fill="currentColor" rx="0.5"/>
               <rect x="1" y="8" width="11" height="4" fill="currentColor" rx="0.5"/>
               <line x1="1" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="1.5"/>`;
      break;
    case 'centerH':
      rects = `<rect x="4" y="2" width="10" height="4" fill="currentColor" rx="0.5"/>
               <rect x="6" y="8" width="6" height="4" fill="currentColor" rx="0.5"/>
               <line x1="9" y1="1" x2="9" y2="13" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 1.5"/>`;
      break;
    case 'right':
      rects = `<rect x="10" y="2" width="7" height="4" fill="currentColor" rx="0.5"/>
               <rect x="6" y="8" width="11" height="4" fill="currentColor" rx="0.5"/>
               <line x1="17" y1="1" x2="17" y2="13" stroke="currentColor" stroke-width="1.5"/>`;
      break;
    case 'top':
      rects = `<rect x="2" y="1" width="4" height="7" fill="currentColor" rx="0.5"/>
               <rect x="8" y="1" width="4" height="11" fill="currentColor" rx="0.5"/>
               <line x1="1" y1="1" x2="17" y2="1" stroke="currentColor" stroke-width="1.5"/>`;
      break;
    case 'middleV':
      rects = `<rect x="2" y="4" width="4" height="6" fill="currentColor" rx="0.5"/>
               <rect x="8" y="2" width="4" height="10" fill="currentColor" rx="0.5"/>
               <line x1="1" y1="7" x2="17" y2="7" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 1.5"/>`;
      break;
    case 'bottom':
      rects = `<rect x="2" y="6" width="4" height="7" fill="currentColor" rx="0.5"/>
               <rect x="8" y="2" width="4" height="11" fill="currentColor" rx="0.5"/>
               <line x1="1" y1="13" x2="17" y2="13" stroke="currentColor" stroke-width="1.5"/>`;
      break;
  }
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block">${rects}</svg>`;
}

function distributeIconSvg(dir) {
  if (dir === 'h') return `<svg width="20" height="14" viewBox="0 0 20 14" style="display:block">
    <rect x="1"  y="3" width="3" height="8" fill="currentColor" rx="0.5"/>
    <rect x="8"  y="3" width="4" height="8" fill="currentColor" rx="0.5"/>
    <rect x="16" y="3" width="3" height="8" fill="currentColor" rx="0.5"/>
    <line x1="4" y1="7" x2="8" y2="7" stroke="currentColor" stroke-width="1" stroke-dasharray="1.5 1"/>
    <line x1="12" y1="7" x2="16" y2="7" stroke="currentColor" stroke-width="1" stroke-dasharray="1.5 1"/>
  </svg>`;
  return `<svg width="14" height="20" viewBox="0 0 14 20" style="display:block">
    <rect x="3" y="1"  width="8" height="3" fill="currentColor" rx="0.5"/>
    <rect x="3" y="8"  width="8" height="4" fill="currentColor" rx="0.5"/>
    <rect x="3" y="16" width="8" height="3" fill="currentColor" rx="0.5"/>
    <line x1="7" y1="4"  x2="7" y2="8"  stroke="currentColor" stroke-width="1" stroke-dasharray="1.5 1"/>
    <line x1="7" y1="12" x2="7" y2="16" stroke="currentColor" stroke-width="1" stroke-dasharray="1.5 1"/>
  </svg>`;
}

/* ---- Align / distribute functions: shared editor framework adapter ---- */

function oeSelectedEditorRefs() {
  const ops = oeOpenings[oeWall] || [];
  return [...oeSelectedSet].map(i => {
    const op = ops[i];
    if (!op) return null;
    return {
      op,
      bbox: { x: op.x, y: op.y, w: op.w, h: oeOpH(op) },
      setX(v) { op.x = oeSnapPlacementX(v, op.w); },
      setY(v) { op.y = oeSnapPlacementY(v, oeOpH(op)); },
      afterMove() {
        if (op.type === 'door') {
          op.y = oeDoorSnappedY(oeWall, op.h, op.y + op.h / 2);
        }
      },
    };
  }).filter(Boolean);
}

function oeAlignMode(mode) {
  if (editorAlignRefs(oeSelectedEditorRefs(), mode)) {
    oeCommit();
    oeRender();
  }
}
function oeAlignLeft()    { oeAlignMode('left'); }
function oeAlignRight()   { oeAlignMode('right'); }
function oeAlignCenterH() { oeAlignMode('centerX'); }
function oeAlignTop()     { oeAlignMode('top'); }
function oeAlignBottom()  { oeAlignMode('bottom'); }
function oeAlignMiddleV() { oeAlignMode('centerY'); }

/* ---- Distribute functions ---- */

function oeDistributeHorizontal() {
  if (editorDistributeRefs(oeSelectedEditorRefs(), 'h', 'gap')) {
    oeCommit();
    oeRender();
  }
}

function oeDistributeVertical() {
  if (editorDistributeRefs(oeSelectedEditorRefs(), 'v', 'gap')) {
    oeCommit();
    oeRender();
  }
}
