/* =====================================================================
   TOOLBOX — dynamic left panel; one draggable card per opening style
   ===================================================================== */

/* ---- OpeningEditorToolbox implementation ---- */
function oeToolboxPopulateImpl() {
  const box = document.getElementById('oeToolbox');
  if (!box) return;
  box.innerHTML = '';

  // ---- Window scale selector ----
  const scaleRow = document.createElement('div');
  scaleRow.className = 'oe-toolbox-scale-row';
  scaleRow.innerHTML = `
    <label>Win scale</label>
    <select id="oeWindowScale">
      <option value="small">75%</option>
      <option value="default">100%</option>
      <option value="large">140%</option>
      <option value="xlarge">180%</option>
    </select>`;
  box.appendChild(scaleRow);
  const scaleEl = scaleRow.querySelector('#oeWindowScale');
  scaleEl.value = CONFIG.windowScale || 'default';
  scaleEl.addEventListener('change', oePopulateToolbox); // rebuild cards on scale change

  // ---- Snap grid selector ----
  const snapRow = document.createElement('div');
  snapRow.className = 'oe-toolbox-scale-row';
  snapRow.innerHTML = `
    <label>Grid snap</label>
    <select id="oeSnapSelect">
      <option value="0">Off</option>
      <option value="0.5">0.5 mm</option>
      <option value="1">1 mm</option>
      <option value="2">2 mm</option>
      <option value="5">5 mm</option>
    </select>`;
  box.appendChild(snapRow);
  const snapEl = snapRow.querySelector('#oeSnapSelect');
  snapEl.value = String(oeSnapGrid);
  snapEl.addEventListener('change', () => {
    const v = parseFloat(snapEl.value) || 0;
    oeSnapGrid = v;
    oeGrid.enabled = v > 0;
    if (v > 0) { oeGrid.xStep = v; oeGrid.yStep = v; }
    oePopulateTopbar();
    oeRender();
  });

  // ---- Search / filter ----
  const searchRow = document.createElement('div');
  searchRow.className = 'oe-toolbox-scale-row';
  searchRow.innerHTML = `
    <label>Search</label>
    <input id="oeToolboxSearch" type="search" placeholder="window, bay, pipe…" autocomplete="off">`;
  box.appendChild(searchRow);
  const searchEl = searchRow.querySelector('#oeToolboxSearch');
  searchEl.value = oeToolboxSearch || '';
  searchEl.addEventListener('input', () => {
    oeToolboxSearch = searchEl.value || '';
    const cursor = searchEl.selectionStart || oeToolboxSearch.length;
    oePopulateToolbox();
    requestAnimationFrame(() => {
      const next = document.getElementById('oeToolboxSearch');
      if (next) {
        next.focus();
        try { next.setSelectionRange(cursor, cursor); } catch (e) {}
      }
    });
  });
  searchEl.addEventListener('keydown', e => e.stopPropagation(), true);

  // ---- Toolbox section / type decoupling ----
  // A style's TYPE (the dict it lives in: WINDOW/DOOR/FIXTURE/AWNING/
  // BALCONY_STYLES) drives its actual behavior throughout the editor —
  // drag, drop, save, render, laser output. Its TOOLBOX SECTION (where
  // its card appears in this panel) is independent: a style can override
  // via `toolboxSection: 'doors'` etc. So a fixture-typed style with
  // placement:'etched' can show up in the Doors section while still
  // behaving like an etched fixture downstream.
  function defaultSectionOf(type, style) {
    switch (type) {
      case 'window':  return 'windows';
      case 'door':    return 'doors';
      case 'bay':     return 'bays';
      case 'fixture': return (style.placement === 'cutout') ? 'passthroughs' : 'fixtures';
      case 'awning':  return 'awnings';
      case 'balcony': return 'balconies';
      case 'cladding_override': return 'cladding_overrides';
      case 'printed_item':      return 'printed_items';
    }
    return 'fixtures';
  }
  function getStylesForSection(sectionId) {
    const items = [];
    const visit = (dict, type) => {
      for (const [key, style] of Object.entries(dict)) {
        const sec = style.toolboxSection || defaultSectionOf(type, style);
        if (sec === sectionId) items.push({ key, style, type });
      }
    };
    visit(WINDOW_STYLES,  'window');
    visit(DOOR_STYLES,    'door');
    visit(BAY_STYLES,     'bay');
    visit(FIXTURE_STYLES, 'fixture');
    visit(AWNING_STYLES,  'awning');
    visit(BALCONY_STYLES, 'balcony');
    visit(PRINTED_STYLES, 'printed_item');
    // Cladding override is a single virtual toolbox item — not bound to any
    // *_STYLES dict. It drops with a default size + secondary-cladding style,
    // then the user picks the desired style via the object-properties bar.
    if (sectionId === 'cladding_overrides') {
      items.push({
        key: 'override',
        style: { label: 'Cladding patch', description: 'Drag onto a wall to override the main cladding pattern in a rectangular region. Pick the secondary cladding style after dropping.' },
        type: 'cladding_override',
      });
    }
    return items;
  }

  function oeToolboxSearchTerms(item, sectionId, sectionLabel) {
    const style = item.style || {};
    const raw = [
      sectionLabel,
      sectionId,
      item.type,
      item.key,
      style.label,
      style.description,
      style.placement,
      style.depthTier,
      style.toolboxSection,
      style.panelFill,
      style.frameColor,
      style.baseW != null ? `${style.baseW}w` : '',
      style.baseH != null ? `${style.baseH}h` : '',
      style.width != null ? `${style.width}w` : '',
      style.height != null ? `${style.height}h` : '',
      style.fullHeight ? 'full height tall downspout' : '',
      style.throughCore ? 'through penetration cut core hole pipe pass-through' : '',
      style.laserCaveat || '',
      style.rollingSlats ? 'rollup roller shutter slats bay garage' : '',
      style.glassPanes && style.glassPanes.length ? 'glass window panes' : '',
      style.features ? JSON.stringify(style.features) : '',
    ];
    return raw.filter(Boolean).join(' ').toLowerCase();
  }

  function oeToolboxItemMatches(item, sectionId, sectionLabel) {
    const q = (oeToolboxSearch || '').trim().toLowerCase();
    if (!q) return true;
    const hay = oeToolboxSearchTerms(item, sectionId, sectionLabel);
    return q.split(/\s+/).every(term => hay.includes(term));
  }

  // ---- Card builders, one per underlying TYPE (not per section) ----
  // Each returns a fully-assembled DOM node ready for box.appendChild,
  // or null if the style isn't placeable. Builders close over the
  // surrounding oePopulateToolbox scope (oeCustomSizes, scaleEl, box…).

  function buildWindowCard(key, style) {
    const scale = WINDOW_SCALES[scaleEl.value] || 1;
    const defW = +(style.baseW * scale).toFixed(2);
    const defH = +(style.baseH * scale).toFixed(2);
    const custom = oeCustomSizes[key];
    const w = custom ? custom.w : defW;
    const h = custom ? custom.h : defH;
    const PREVIEW_S = Math.min(5, 80 / Math.max(w, h));
    const svgW = Math.round(w * PREVIEW_S), svgH = Math.round(h * PREVIEW_S);

    const card = document.createElement('div');
    card.className = 'oe-toolbox-item oe-draggable';
    card.title = `${style.label}  ${w}\u00d7${h} mm \u2014 drag onto wall`;
    card.innerHTML = `
      <svg width="${svgW}" height="${svgH}" viewBox="0 0 ${w} ${h}" style="display:block">${buildWindowSvgBody(style, w, h)}</svg>
      <div class="oe-toolbox-item-label">${style.label}</div>`;

    const sizeRow = document.createElement('div');
    sizeRow.className = 'oe-size-row';
    sizeRow.innerHTML = `
      <label>W</label>
      <input type="number" min="1" max="100" step="0.5" value="${w}" class="${custom ? 'oe-custom' : ''}">
      <label>H</label>
      <input type="number" min="1" max="100" step="0.5" value="${h}" class="${custom ? 'oe-custom' : ''}">
      <button class="oe-size-reset" title="Reset to style default" style="${custom ? '' : 'visibility:hidden'}">\u21ba</button>`;
    card.appendChild(sizeRow);
    const [wInp, hInp] = sizeRow.querySelectorAll('input');
    const resetBtn = sizeRow.querySelector('.oe-size-reset');

    function updateCard() {
      const newW = parseFloat(wInp.value) || defW;
      const newH = parseFloat(hInp.value) || defH;
      if (Math.abs(newW - defW) < 0.01 && Math.abs(newH - defH) < 0.01) {
        delete oeCustomSizes[key];
        wInp.classList.remove('oe-custom'); hInp.classList.remove('oe-custom');
        resetBtn.style.visibility = 'hidden';
      } else {
        oeCustomSizes[key] = { w: newW, h: newH };
        wInp.classList.add('oe-custom'); hInp.classList.add('oe-custom');
        resetBtn.style.visibility = '';
      }
    }
    wInp.addEventListener('change', updateCard);
    hInp.addEventListener('change', updateCard);
    wInp.addEventListener('click', e => e.stopPropagation());
    hInp.addEventListener('click', e => e.stopPropagation());
    resetBtn.addEventListener('click', e => {
      e.stopPropagation();
      delete oeCustomSizes[key];
      wInp.value = defW; hInp.value = defH;
      wInp.classList.remove('oe-custom'); hInp.classList.remove('oe-custom');
      resetBtn.style.visibility = 'hidden';
    });
    oeAddToolboxDragHandlers(card, 'window', key);
    return card;
  }

  function buildDoorCard(key, style) {
    if (!style.width || !style.height) return null;
    const defW = style.width, defH = style.height;
    const custom = oeCustomSizes[key];
    const w = custom ? custom.w : defW;
    const h = custom ? custom.h : defH;
    const PREVIEW_S = Math.min(4, 80 / Math.max(w, h));
    const svgW = Math.max(16, Math.round(w * PREVIEW_S));
    const svgH = Math.max(20, Math.round(h * PREVIEW_S));

    const card = document.createElement('div');
    card.className = 'oe-toolbox-item oe-draggable';
    card.title = `${style.label}  ${w}\u00d7${h} mm \u2014 drag onto wall`;
    card.innerHTML = `
      <svg width="${svgW}" height="${svgH}" viewBox="0 0 ${w} ${h}" style="display:block">${buildDoorSvgBody(style, w, h, { strokeWidth: 0.3, thickStrokeWidth: 0.4, glassStrokeWidth: 0.25 })}</svg>
      <div class="oe-toolbox-item-label">${style.label}</div>`;

    const sizeRow = document.createElement('div');
    sizeRow.className = 'oe-size-row';
    sizeRow.innerHTML = `
      <label>W</label>
      <input type="number" min="1" max="100" step="0.5" value="${w}" class="${custom ? 'oe-custom' : ''}">
      <label>H</label>
      <input type="number" min="1" max="100" step="0.5" value="${h}" class="${custom ? 'oe-custom' : ''}">
      <button class="oe-size-reset" title="Reset to style default" style="${custom ? '' : 'visibility:hidden'}">\u21ba</button>`;
    card.appendChild(sizeRow);
    const [wInp, hInp] = sizeRow.querySelectorAll('input');
    const resetBtn = sizeRow.querySelector('.oe-size-reset');

    function updateDoorCard() {
      const newW = parseFloat(wInp.value) || defW;
      const newH = parseFloat(hInp.value) || defH;
      if (Math.abs(newW - defW) < 0.01 && Math.abs(newH - defH) < 0.01) {
        delete oeCustomSizes[key];
        wInp.classList.remove('oe-custom'); hInp.classList.remove('oe-custom');
        resetBtn.style.visibility = 'hidden';
      } else {
        oeCustomSizes[key] = { w: newW, h: newH };
        wInp.classList.add('oe-custom'); hInp.classList.add('oe-custom');
        resetBtn.style.visibility = '';
      }
    }
    wInp.addEventListener('change', updateDoorCard);
    hInp.addEventListener('change', updateDoorCard);
    wInp.addEventListener('click', e => e.stopPropagation());
    hInp.addEventListener('click', e => e.stopPropagation());
    resetBtn.addEventListener('click', e => {
      e.stopPropagation();
      delete oeCustomSizes[key];
      wInp.value = defW; hInp.value = defH;
      wInp.classList.remove('oe-custom'); hInp.classList.remove('oe-custom');
      resetBtn.style.visibility = 'hidden';
    });
    oeAddToolboxDragHandlers(card, 'door', key);
    return card;
  }

  function buildFixtureCard(key, style) {
    const ck = 'fixture_' + key;
    const defW = style.width, defH = style.height;
    const custom = oeCustomSizes[ck];
    const w = custom ? custom.w : defW;
    const h = custom ? custom.h : defH;
    const PREVIEW_S = Math.min(6, 80 / Math.max(w, h));
    const svgW = Math.max(16, Math.round(w * PREVIEW_S));
    const svgH = Math.max(20, Math.round(h * PREVIEW_S));
    // A fullHeight fixture (e.g. downspout) auto-sizes to the wall's baseH
    // at drop time, so the toolbox H input has no effect — lock it and show
    // an explanatory placeholder so the user understands the value isn't
    // editable. Width still applies normally.
    const isFullHeight = !!style.fullHeight;

    const card = document.createElement('div');
    card.className = 'oe-toolbox-item oe-draggable';
    const tierLabel = (style.placement === 'cutout') ? ' \u00b7 cutout'
                    : (style.placement === 'etched') ? ' \u00b7 etched'
                    : (style.depthTier === 'deep')   ? ' \u00b7 deep'
                    : (style.depthTier === 'medium') ? ' \u00b7 medium'
                    : '';
    const cardSizeLabel = isFullHeight ? `${w}\u00d7auto mm` : `${w}\u00d7${h} mm`;
    card.title = `${style.label}  ${cardSizeLabel}${tierLabel} \u2014 drag onto wall`;
    card.innerHTML = `
      <svg width="${svgW}" height="${svgH}" viewBox="0 0 ${w} ${h}" style="display:block">${buildFixtureSvgBody(style, w, h, { strokeWidth: 0.18, thickStrokeWidth: 0.28 })}</svg>
      <div class="oe-toolbox-item-label">${style.label}</div>`;

    const sizeRow = document.createElement('div');
    sizeRow.className = 'oe-size-row';
    const hValAttr = isFullHeight ? 'auto' : h;
    const hExtra   = isFullHeight ? 'disabled title="Sizes to wall height automatically"' : '';
    sizeRow.innerHTML = `
      <label>W</label>
      <input type="number" min="0.5" max="100" step="0.5" value="${w}" class="${custom ? 'oe-custom' : ''}">
      <label>H</label>
      <input type="${isFullHeight ? 'text' : 'number'}" ${isFullHeight ? '' : 'min="0.5" max="100" step="0.5"'} value="${hValAttr}" class="${custom && !isFullHeight ? 'oe-custom' : ''}" ${hExtra}>
      <button class="oe-size-reset" title="Reset to style default" style="${custom && !isFullHeight ? '' : 'visibility:hidden'}">\u21ba</button>`;
    card.appendChild(sizeRow);
    const [wInp, hInp] = sizeRow.querySelectorAll('input');
    const resetBtn = sizeRow.querySelector('.oe-size-reset');

    function updateFixtureCard() {
      const newW = parseFloat(wInp.value) || defW;
      const newH = isFullHeight ? defH : (parseFloat(hInp.value) || defH);
      if (Math.abs(newW - defW) < 0.01 && Math.abs(newH - defH) < 0.01) {
        delete oeCustomSizes[ck];
        wInp.classList.remove('oe-custom'); if (!isFullHeight) hInp.classList.remove('oe-custom');
        resetBtn.style.visibility = 'hidden';
      } else {
        oeCustomSizes[ck] = { w: newW, h: newH };
        wInp.classList.add('oe-custom'); if (!isFullHeight) hInp.classList.add('oe-custom');
        resetBtn.style.visibility = '';
      }
    }
    wInp.addEventListener('change', updateFixtureCard);
    if (!isFullHeight) hInp.addEventListener('change', updateFixtureCard);
    wInp.addEventListener('click', e => e.stopPropagation());
    hInp.addEventListener('click', e => e.stopPropagation());
    resetBtn.addEventListener('click', e => {
      e.stopPropagation();
      delete oeCustomSizes[ck];
      wInp.value = defW;
      if (!isFullHeight) hInp.value = defH;
      wInp.classList.remove('oe-custom'); if (!isFullHeight) hInp.classList.remove('oe-custom');
      resetBtn.style.visibility = 'hidden';
    });
    oeAddToolboxDragHandlers(card, 'fixture', key);
    return card;
  }

  function buildAwningCard(key, style) {
    const ck = 'awning_' + key;
    const defW = style.baseW, defD = style.baseD;
    const custom = oeCustomSizes[ck];
    const w = custom ? custom.w : defW;
    const d = custom ? custom.d : defD;
    const PS = Math.min(5, 80 / w);
    const pvgW = Math.max(24, Math.round(w * PS));
    const pvgH = Math.max(10, Math.round(AWNING_DISP_H * PS * 2));

    const sp = 3;
    let stripes = '';
    for (let sx = 0; sx < w; sx += sp * 2) {
      stripes += `<rect x="${sx.toFixed(1)}" y="0" width="${sp}" height="${AWNING_DISP_H}" fill="rgba(100,55,10,0.28)"/>`;
    }
    const card = document.createElement('div');
    card.className = 'oe-toolbox-item oe-draggable';
    card.title = `${style.label} \u2014 W:${w} \u00d7 D:${d} mm \u2014 drag onto wall`;
    card.innerHTML = `
      <svg width="${pvgW}" height="${pvgH}" viewBox="0 0 ${w} ${AWNING_DISP_H}" style="display:block">
        <rect x="0" y="0" width="${w}" height="${AWNING_DISP_H}" fill="#c4935a" stroke="#7a4b15" stroke-width="0.4"/>
        ${stripes}
      </svg>
      <div class="oe-toolbox-item-label">${style.label}</div>`;

    const sizeRow = document.createElement('div');
    sizeRow.className = 'oe-size-row';
    sizeRow.innerHTML = `
      <label>W</label>
      <input type="number" min="5" max="100" step="1" value="${w}" class="${custom ? 'oe-custom' : ''}">
      <label>D</label>
      <input type="number" min="3" max="40"  step="1" value="${d}" class="${custom ? 'oe-custom' : ''}">
      <button class="oe-size-reset" title="Reset to default" style="${custom ? '' : 'visibility:hidden'}">\u21ba</button>`;
    card.appendChild(sizeRow);
    const [wInp, dInp] = sizeRow.querySelectorAll('input');
    const resetBtn = sizeRow.querySelector('.oe-size-reset');

    function updateAwning() {
      const nW = parseFloat(wInp.value) || defW;
      const nD = parseFloat(dInp.value) || defD;
      if (Math.abs(nW - defW) < 0.01 && Math.abs(nD - defD) < 0.01) {
        delete oeCustomSizes[ck];
        wInp.classList.remove('oe-custom'); dInp.classList.remove('oe-custom');
        resetBtn.style.visibility = 'hidden';
      } else {
        oeCustomSizes[ck] = { w: nW, d: nD };
        wInp.classList.add('oe-custom'); dInp.classList.add('oe-custom');
        resetBtn.style.visibility = '';
      }
    }
    wInp.addEventListener('change', updateAwning);
    dInp.addEventListener('change', updateAwning);
    wInp.addEventListener('click', e => e.stopPropagation());
    dInp.addEventListener('click', e => e.stopPropagation());
    resetBtn.addEventListener('click', e => {
      e.stopPropagation();
      delete oeCustomSizes[ck];
      wInp.value = defW; dInp.value = defD;
      wInp.classList.remove('oe-custom'); dInp.classList.remove('oe-custom');
      resetBtn.style.visibility = 'hidden';
    });
    oeAddToolboxDragHandlers(card, 'awning', key);
    return card;
  }

  function buildBalconyCard(key, style) {
    const ck = 'balcony_' + key;
    const defW = style.baseW, defD = style.baseD, defH = style.baseH;
    const isInt = style.balconyType === 'internal';
    const custom = oeCustomSizes[ck];
    const w = custom ? custom.w : defW;
    const d = custom ? custom.d : defD;
    const h = custom ? custom.h : defH;
    const PS = Math.min(4, 80 / Math.max(w, h));
    const pvgW = Math.max(24, Math.round(w * PS));
    const pvgH = Math.max(14, Math.round(h * PS));
    const fill   = isInt ? '#5a7a8e' : '#e8d5a0';
    const sfill  = isInt ? 'rgba(0,0,0,0.2)' : 'rgba(150,100,0,0.15)';
    const stroke = isInt ? '#3a5a6e' : '#b08830';
    let hatch = '';
    if (isInt) {
      for (let lx = -h; lx < w + h; lx += 4)
        hatch += `<line x1="${Math.max(0,lx).toFixed(1)}" y1="${lx>=0?0:(-lx).toFixed(1)}" x2="${Math.min(w,lx+h).toFixed(1)}" y2="${lx+h<=w?h:(w-lx).toFixed(1)}" stroke="${sfill}" stroke-width="0.6"/>`;
    } else {
      for (let gx = 4; gx < w; gx += 4)
        hatch += `<line x1="${gx}" y1="0" x2="${gx}" y2="${h}" stroke="${sfill}" stroke-width="0.5"/>`;
      for (let gy = 4; gy < h; gy += 4)
        hatch += `<line x1="0" y1="${gy}" x2="${w}" y2="${gy}" stroke="${sfill}" stroke-width="0.5"/>`;
    }

    const card = document.createElement('div');
    card.className = 'oe-toolbox-item oe-draggable';
    card.title = `${style.label} \u2014 W:${w} D:${d} H:${h} mm \u2014 drag onto wall`;
    card.innerHTML = `
      <svg width="${pvgW}" height="${pvgH}" viewBox="0 0 ${w} ${h}" style="display:block">
        <rect x="0" y="0" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="0.5"/>
        ${hatch}
        <text x="${w/2}" y="${h*0.6}" font-size="${Math.max(2,h*0.35)}" text-anchor="middle" font-family="system-ui" fill="${isInt?'#fff':'#6a4800'}" font-weight="600">${isInt?'\u2193':'\u2197'}</text>
      </svg>
      <div class="oe-toolbox-item-label">${style.label}</div>`;

    const sizeRow = document.createElement('div');
    sizeRow.className = 'oe-size-row';
    sizeRow.innerHTML = `
      <label>W</label><input type="number" min="5" max="200" step="1" value="${w}" class="${custom?'oe-custom':''}">
      <label>D</label><input type="number" min="3" max="60"  step="1" value="${d}" class="${custom?'oe-custom':''}">
      <label>H</label><input type="number" min="3" max="40"  step="1" value="${h}" class="${custom?'oe-custom':''}">
      <button class="oe-size-reset" style="${custom?'':'visibility:hidden'}" title="Reset">\u21ba</button>`;
    card.appendChild(sizeRow);
    const [wInp, dInp, hInp] = sizeRow.querySelectorAll('input');
    const resetBtn = sizeRow.querySelector('.oe-size-reset');

    function updateBalc() {
      const nW = parseFloat(wInp.value) || defW;
      const nD = parseFloat(dInp.value) || defD;
      const nH = parseFloat(hInp.value) || defH;
      if (Math.abs(nW-defW)<0.01 && Math.abs(nD-defD)<0.01 && Math.abs(nH-defH)<0.01) {
        delete oeCustomSizes[ck];
        [wInp,dInp,hInp].forEach(el=>el.classList.remove('oe-custom'));
        resetBtn.style.visibility='hidden';
      } else {
        oeCustomSizes[ck] = { w: nW, d: nD, h: nH };
        [wInp,dInp,hInp].forEach(el=>el.classList.add('oe-custom'));
        resetBtn.style.visibility='';
      }
    }
    wInp.addEventListener('change', updateBalc);
    dInp.addEventListener('change', updateBalc);
    hInp.addEventListener('change', updateBalc);
    [wInp, dInp, hInp].forEach(el => el.addEventListener('click', e => e.stopPropagation()));
    resetBtn.addEventListener('click', e => {
      e.stopPropagation();
      delete oeCustomSizes[ck];
      wInp.value=defW; dInp.value=defD; hInp.value=defH;
      [wInp,dInp,hInp].forEach(el=>el.classList.remove('oe-custom'));
      resetBtn.style.visibility='hidden';
    });
    oeAddToolboxDragHandlers(card, 'balcony', key);
    return card;
  }

  // ---- Cladding override card ----
  // Single virtual item — drops a cladding-override region at default size
  // with a default secondary style. Selection picker swaps the style afterward.
  function buildCladdingOverrideCard(key, style) {
    const defW = 30, defH = 20;
    const ck = 'cladding_override_' + key;
    const custom = oeCustomSizes[ck];
    const w = custom ? custom.w : defW;
    const h = custom ? custom.h : defH;
    const svgW = Math.max(48, Math.round(w * 1.6));
    const svgH = Math.max(36, Math.round(h * 1.6));

    const card = document.createElement('div');
    card.className = 'oe-toolbox-item oe-draggable';
    card.title = `${style.label} \u2014 drag onto wall, then pick the cladding style`;
    // Swatch preview: split rect showing two contrasting fills suggests
    // "swap of material" without picking a specific style for the preview.
    card.innerHTML = `
      <svg width="${svgW}" height="${svgH}" viewBox="0 0 30 20" style="display:block">
        <defs>
          <pattern id="oeOverridePat" patternUnits="userSpaceOnUse" width="3" height="3">
            <rect width="3" height="3" fill="#c8c0b0"/>
            <path d="M0,3 L3,0" stroke="#8a8278" stroke-width="0.3"/>
          </pattern>
        </defs>
        <rect x="0.4" y="0.4" width="29.2" height="19.2" fill="url(#oeOverridePat)" stroke="#5a4a32" stroke-width="0.5" stroke-dasharray="1.2 0.8"/>
      </svg>
      <div class="oe-toolbox-item-label">${style.label}</div>`;

    const sizeRow = document.createElement('div');
    sizeRow.className = 'oe-size-row';
    sizeRow.innerHTML = `
      <label>W</label>
      <input type="number" min="2" max="500" step="1" value="${w}" class="${custom ? 'oe-custom' : ''}">
      <label>H</label>
      <input type="number" min="2" max="500" step="1" value="${h}" class="${custom ? 'oe-custom' : ''}">
      <button class="oe-size-reset" title="Reset to default" style="${custom ? '' : 'visibility:hidden'}">\u21ba</button>`;
    card.appendChild(sizeRow);
    const [wInp, hInp] = sizeRow.querySelectorAll('input');
    const resetBtn = sizeRow.querySelector('.oe-size-reset');

    function updateCard() {
      const newW = parseFloat(wInp.value) || defW;
      const newH = parseFloat(hInp.value) || defH;
      if (Math.abs(newW - defW) < 0.01 && Math.abs(newH - defH) < 0.01) {
        delete oeCustomSizes[ck];
        wInp.classList.remove('oe-custom'); hInp.classList.remove('oe-custom');
        resetBtn.style.visibility = 'hidden';
      } else {
        oeCustomSizes[ck] = { w: newW, h: newH };
        wInp.classList.add('oe-custom'); hInp.classList.add('oe-custom');
        resetBtn.style.visibility = '';
      }
    }
    wInp.addEventListener('change', updateCard);
    hInp.addEventListener('change', updateCard);
    wInp.addEventListener('click', e => e.stopPropagation());
    hInp.addEventListener('click', e => e.stopPropagation());
    resetBtn.addEventListener('click', e => {
      e.stopPropagation();
      delete oeCustomSizes[ck];
      wInp.value = defW; hInp.value = defH;
      wInp.classList.remove('oe-custom'); hInp.classList.remove('oe-custom');
      resetBtn.style.visibility = 'hidden';
    });

    oeAddToolboxDragHandlers(card, 'cladding_override', key);
    return card;
  }

  // ---- Printed item card ----
  function buildPrintedItemCard(key, style) {
    const ck = 'printed_' + key;
    const defW = style.width, defH = style.height;
    const custom = oeCustomSizes[ck];
    const w = custom ? custom.w : defW;
    const h = custom ? custom.h : defH;
    // Preview at ~80px on the long side so all styles read clearly at a glance
    const PREVIEW_S = Math.min(8, 80 / Math.max(w, h));
    const svgW = Math.max(28, Math.round(w * PREVIEW_S));
    const svgH = Math.max(28, Math.round(h * PREVIEW_S));

    const card = document.createElement('div');
    card.className = 'oe-toolbox-item oe-draggable';
    card.title = `${style.label}  ${w}\u00d7${h} mm \u2014 drag onto wall (printed, not laser-cut)`;
    card.innerHTML = `
      <svg width="${svgW}" height="${svgH}" viewBox="0 0 ${w} ${h}" style="display:block">${buildPrintedSvgBody(style, w, h)}</svg>
      <div class="oe-toolbox-item-label">${style.label}</div>`;

    const sizeRow = document.createElement('div');
    sizeRow.className = 'oe-size-row';
    sizeRow.innerHTML = `
      <label>W</label>
      <input type="number" min="1" max="120" step="0.5" value="${w}" class="${custom ? 'oe-custom' : ''}">
      <label>H</label>
      <input type="number" min="1" max="120" step="0.5" value="${h}" class="${custom ? 'oe-custom' : ''}">
      <button class="oe-size-reset" title="Reset to style default" style="${custom ? '' : 'visibility:hidden'}">\u21ba</button>`;
    card.appendChild(sizeRow);
    const [wInp, hInp] = sizeRow.querySelectorAll('input');
    const resetBtn = sizeRow.querySelector('.oe-size-reset');
    function updateCard() {
      const newW = parseFloat(wInp.value) || defW;
      const newH = parseFloat(hInp.value) || defH;
      if (Math.abs(newW - defW) < 0.01 && Math.abs(newH - defH) < 0.01) {
        delete oeCustomSizes[ck];
        wInp.classList.remove('oe-custom'); hInp.classList.remove('oe-custom');
        resetBtn.style.visibility = 'hidden';
      } else {
        oeCustomSizes[ck] = { w: newW, h: newH };
        wInp.classList.add('oe-custom'); hInp.classList.add('oe-custom');
        resetBtn.style.visibility = '';
      }
    }
    wInp.addEventListener('change', updateCard);
    hInp.addEventListener('change', updateCard);
    wInp.addEventListener('click', e => e.stopPropagation());
    hInp.addEventListener('click', e => e.stopPropagation());
    resetBtn.addEventListener('click', e => {
      e.stopPropagation();
      delete oeCustomSizes[ck];
      wInp.value = defW; hInp.value = defH;
      wInp.classList.remove('oe-custom'); hInp.classList.remove('oe-custom');
      resetBtn.style.visibility = 'hidden';
    });
    oeAddToolboxDragHandlers(card, 'printed_item', key);
    return card;
  }

  // ---- Bay card ----
  // Bays are unique: only one per building, bottom-anchored to the ground
  // floor, and 'through' style auto-pairs the back wall when placed on the
  // front. Card visualises a U-cut (wall with door-sized notch) for 'side'
  // and a tunnel (two flanking pillars) for 'through'.
  function buildBayCard(key, style) {
    const ck = 'bay_' + key;
    const defW = style.baseW, defH = style.baseH;
    const custom = oeCustomSizes[ck];
    const w = custom ? custom.w : defW;
    const h = custom ? custom.h : defH;
    const isThrough = key === 'through';
    const svgW = 60, svgH = 44;

    const card = document.createElement('div');
    card.className = 'oe-toolbox-item oe-draggable';
    card.title = `${style.label} \u2014 ${style.description} \u2014 drag onto front or back wall`;
    // Preview: a wall slab with the bay opening cut at the bottom. For
    // 'through' a second wall slab is drawn behind to suggest the tunnel.
    const wallW = 50, wallH = 36, bayW = 16, bayH = 18;
    const bayX = (wallW - bayW) / 2;
    const bayY = wallH - bayH;
    const wallFill = '#cbbfa3';
    const bayFill = isThrough ? '#cfd8dc' : '#3a2e22';  // through shows light (sky), side shows dark (interior)
    const stroke = '#7a6b54';
    let backWall = '';
    if (isThrough) {
      // Offset back-wall slab a few pixels right/down to suggest depth
      backWall = `
        <rect x="6" y="3" width="${wallW}" height="${wallH}" fill="#b8ac90" stroke="${stroke}" stroke-width="0.4" opacity="0.7"/>
        <rect x="${6+bayX}" y="${3+bayY}" width="${bayW}" height="${bayH}" fill="#cfd8dc" stroke="${stroke}" stroke-width="0.3"/>`;
    }
    card.innerHTML = `
      <svg width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" style="display:block">
        ${backWall}
        <rect x="2" y="6" width="${wallW}" height="${wallH}" fill="${wallFill}" stroke="${stroke}" stroke-width="0.5"/>
        <rect x="${2+bayX}" y="${6+bayY}" width="${bayW}" height="${bayH}" fill="${bayFill}" stroke="${stroke}" stroke-width="0.5"/>
      </svg>
      <div class="oe-toolbox-item-label">${style.label}</div>`;

    const sizeRow = document.createElement('div');
    sizeRow.className = 'oe-size-row';
    sizeRow.innerHTML = `
      <label>W</label>
      <input type="number" min="15" max="300" step="1" value="${w}" class="${custom ? 'oe-custom' : ''}">
      <label>H</label>
      <input type="number" min="10" max="80"  step="1" value="${h}" class="${custom ? 'oe-custom' : ''}">
      <button class="oe-size-reset" title="Reset to default" style="${custom ? '' : 'visibility:hidden'}">\u21ba</button>`;
    card.appendChild(sizeRow);
    const [wInp, hInp] = sizeRow.querySelectorAll('input');
    const resetBtn = sizeRow.querySelector('.oe-size-reset');

    function updateBayCard() {
      const nW = parseFloat(wInp.value) || defW;
      const nH = parseFloat(hInp.value) || defH;
      if (Math.abs(nW - defW) < 0.01 && Math.abs(nH - defH) < 0.01) {
        delete oeCustomSizes[ck];
        wInp.classList.remove('oe-custom'); hInp.classList.remove('oe-custom');
        resetBtn.style.visibility = 'hidden';
      } else {
        oeCustomSizes[ck] = { w: nW, h: nH };
        wInp.classList.add('oe-custom'); hInp.classList.add('oe-custom');
        resetBtn.style.visibility = '';
      }
    }
    wInp.addEventListener('change', updateBayCard);
    hInp.addEventListener('change', updateBayCard);
    wInp.addEventListener('click', e => e.stopPropagation());
    hInp.addEventListener('click', e => e.stopPropagation());
    resetBtn.addEventListener('click', e => {
      e.stopPropagation();
      delete oeCustomSizes[ck];
      wInp.value = defW; hInp.value = defH;
      wInp.classList.remove('oe-custom'); hInp.classList.remove('oe-custom');
      resetBtn.style.visibility = 'hidden';
    });

    oeAddToolboxDragHandlers(card, 'bay', key);
    return card;
  }

  // ---- Dispatch table: type \u2192 builder ----
  const builders = {
    window:            buildWindowCard,
    door:              buildDoorCard,
    fixture:           buildFixtureCard,
    awning:            buildAwningCard,
    balcony:           buildBalconyCard,
    cladding_override: buildCladdingOverrideCard,
    printed_item:      buildPrintedItemCard,
    bay:               buildBayCard,
  };

  let renderedToolboxItems = 0;
  function renderSection(headerText, sectionId) {
    const items = getStylesForSection(sectionId)
      .filter(item => oeToolboxItemMatches(item, sectionId, headerText));
    if (items.length === 0) return;
    const hdr = document.createElement('div');
    hdr.className = 'oe-toolbox-section';
    hdr.textContent = headerText;
    box.appendChild(hdr);
    for (const item of items) {
      const card = builders[item.type](item.key, item.style);
      if (card) {
        box.appendChild(card);
        renderedToolboxItems++;
      }
    }
  }

  renderSection('Windows',           'windows');
  renderSection('Doors',             'doors');
  renderSection('Bays',              'bays');
  renderSection('Fixtures',          'fixtures');
  renderSection('Industrial Fixtures','industrial_fixtures');
  renderSection('Awnings',           'awnings');
  renderSection('Balconies',         'balconies');
  renderSection('Cladding',          'cladding_overrides');
  renderSection('Printed items',     'printed_items');
  renderSection('Pass-throughs',     'passthroughs');

  if (renderedToolboxItems === 0) {
    const empty = document.createElement('div');
    empty.className = 'oe-toolbox-empty';
    empty.textContent = oeToolboxSearch
      ? `No objects match “${oeToolboxSearch}”.`
      : 'No toolbox objects available.';
    box.appendChild(empty);
  }
}

/* ---- Drag from toolbox ---- */


function oeAddToolboxDragHandlers(card, type, styleKey) {
  if (!card) return;
  card.style.touchAction = 'none';
  card.addEventListener('pointerdown', e => {
    oeLastPointerType = e.pointerType || 'mouse';
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
    if (window.PointerEvent) {
      e.preventDefault();
      oeToolboxDragStart(e, type, styleKey);
    }
  });
  card.addEventListener('mousedown', e => {
    // When Pointer Events exist, pointerdown is the canonical path and
    // this compatibility mouse event would create a duplicate ghost.
    if (window.PointerEvent) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
    e.preventDefault();
    oeToolboxDragStart(e, type, styleKey);
  });
}

function oeToolboxDragStartImpl(e, type, styleKey) {
  // Compute opening dims at drag-start time so they're fixed for this drag
  const dims = type === 'window'  ? oeGetWinDims(styleKey)
             : type === 'door'    ? oeGetDoorDims(styleKey)
             : type === 'awning'  ? oeGetAwningDims(styleKey)
             : type === 'fixture' ? oeGetFixtureDims(styleKey)
             : type === 'cladding_override' ? oeGetCladdingOverrideDims(styleKey)
             : type === 'printed_item' ? oeGetPrintedItemDims(styleKey)
             : type === 'bay'     ? oeGetBayDims(styleKey)
             :                      oeGetBalconyDims(styleKey);

  const isAwning  = type === 'awning';
  const isBalcony = type === 'balcony';
  const isFixture = type === 'fixture';
  const isOverride = type === 'cladding_override';
  const isPrinted = type === 'printed_item';
  const isBay     = type === 'bay';
  const isInt     = isBalcony && dims.balconyType === 'internal';
  // For fixtures, borrow the colour from the style's first piece so the
  // ghost matches what'll land on the wall.
  const fixSpec = isFixture ? FIXTURE_STYLES[styleKey] : null;
  const fixFirstPiece = fixSpec && fixSpec.pieces && fixSpec.pieces[0];
  const borderCol = type === 'window'  ? '#2a64aa'
                  : type === 'door'    ? '#c84a3a'
                  : type === 'awning'  ? '#7a4b15'
                  : isFixture          ? ((fixFirstPiece && fixFirstPiece.frameColor) || '#3a3a34')
                  : isOverride         ? '#5a4a32'
                  : isPrinted          ? '#6a3a8a'
                  : isBay              ? '#3a3a3a'
                  : isInt              ? '#3a5a6e' : '#b08830';
  const bgCol     = type === 'window'  ? 'rgba(160,205,245,0.82)'
                  : type === 'door'    ? 'rgba(245,185,130,0.82)'
                  : type === 'awning'  ? 'rgba(196,147,90,0.82)'
                  : isFixture          ? ((fixFirstPiece && fixFirstPiece.panelFill) || 'rgba(189,189,181,0.82)')
                  : isOverride         ? 'rgba(200,192,176,0.75)'
                  : isPrinted          ? 'rgba(180,140,210,0.75)'
                  : isBay              ? 'rgba(60,45,30,0.55)'
                  : isInt              ? 'rgba(90,122,142,0.82)' : 'rgba(232,213,160,0.82)';
  const ghostW = isOverride ? Math.max(30, dims.w * 4) : Math.max(20, dims.w * 5);
  const ghostH = isAwning   ? Math.max(8, (dims.d || 10) * 2)
               : isBalcony  ? Math.max(10, (dims.h || 8) * 5)
               : isOverride ? Math.max(30, dims.h * 4)
               :              Math.max(15, dims.h * 5);
  const ghostLbl = isAwning  ? `${dims.w.toFixed(1)}W × ${dims.d.toFixed(1)}D`
                 : isBalcony ? `${dims.w.toFixed(1)}W × ${dims.d.toFixed(1)}D × ${dims.h.toFixed(1)}H`
                 :             `${dims.w.toFixed(1)}×${dims.h.toFixed(1)}`;

  // Ghost element follows cursor
  const ghost = document.createElement('div');
  ghost.style.cssText = [
    'position:fixed', 'pointer-events:none', 'z-index:9999',
    'transform:translate(-50%,-50%)',
    `width:${ghostW}px`, `height:${ghostH}px`,
    `border:2px solid ${borderCol}`, `background:${bgCol}`,
    'border-radius:3px', 'display:flex', 'align-items:center', 'justify-content:center',
    'font-size:9px', 'color:#333', 'font-family:system-ui', 'box-shadow:0 2px 8px rgba(0,0,0,0.2)',
    `left:${e.clientX}px`, `top:${e.clientY}px`,
  ].join(';');
  ghost.textContent = ghostLbl;
  document.body.appendChild(ghost);

  const svg = document.getElementById('openingEditorSvg');

  const onMove = me => {
    ghost.style.left = me.clientX + 'px';
    ghost.style.top  = me.clientY + 'px';
    const r = svg.getBoundingClientRect();
    const over = me.clientX >= r.left && me.clientX <= r.right && me.clientY >= r.top && me.clientY <= r.bottom;
    svg.style.outline = over ? '2px dashed #f70' : '';
  };

  const onUp = me => {
    if (cleanupDrag) cleanupDrag();
    ghost.remove();
    svg.style.outline = '';

    const r = svg.getBoundingClientRect();
    const over = me.clientX >= r.left && me.clientX <= r.right && me.clientY >= r.top && me.clientY <= r.bottom;
    if (!over) return;

    const PAD = 32;
    const mmX = (me.clientX - r.left  - PAD - oeWallLeftPx) / oeEditorScale;
    const mmY = (me.clientY - r.top   - PAD - oeExtraTop)   / oeEditorScale;
    oeDropOpening(type, dims, mmX, mmY, styleKey);
  };

  const cleanupDrag = oeBeginDocumentDrag(e, onMove, onUp);
}

/* Snap a door to the bottom of whichever floor band the probe Y falls in.
   Doors always rest with their bottom on a floor surface — but can sit on
   ANY floor's surface, not just the ground floor. Used by both door
   placement (drag-and-drop) and door drag-to-reposition. */
/* Bands suitable for *door* placement on a wall.
 *
 * Returns the same bands as oeGetFloorBands, plus — on a bay-bearing wall —
 * a synthetic ground-floor band spanning from the bay ceiling down to the
 * floor (y=H). Doors can sit on this floor alongside the bay opening; the
 * regular bands list omits it because windows would visually collide with
 * the bay aperture there.
 */
function oeGetDoorBands(wall) {
  const bands = oeGetFloorBands(wall);
  const plan = oeActivePlan();
  if (!plan) return bands;
  const hasBay = (wall === 'front' && plan.hasFrontBay) ||
                 (wall === 'back'  && plan.hasBackBay);
  if (!hasBay) return bands;
  const wallH = oeGetWallDims(wall).H;
  const bayCeilingY = plan.bayCeilingY;
  if (bayCeilingY == null || bayCeilingY >= wallH - 0.5) return bands;
  // Append the ground-floor band. Order doesn't matter — oeDoorSnappedY
  // searches by containment then by closest centre.
  return [
    ...bands,
    { yTop: bayCeilingY, yBottom: wallH, centerY: (bayCeilingY + wallH) / 2 },
  ];
}

function oeDoorSnappedY(wall, doorH, probeY) {
  const { H } = oeGetWallDims(wall);
  const bands = oeGetDoorBands(wall);
  if (!bands.length) return Math.max(0, H - doorH);
  let band = null;
  for (const b of bands) {
    if (probeY >= b.yTop && probeY <= b.yBottom) { band = b; break; }
  }
  if (!band) {
    // Probe is outside every band — clamp to the closest one by center.
    let bestDist = Infinity;
    for (const b of bands) {
      const bc = (b.yTop + b.yBottom) / 2;
      const d  = Math.abs(probeY - bc);
      if (d < bestDist) { band = b; bestDist = d; }
    }
  }
  return Math.max(0, band.yBottom - doorH);
}

/* Show a modal asking the user how to handle an opening that's too large
 * for the ground-floor band. Three resolution paths:
 *
 *  - "Make ground floor taller" — enables the firstFloorHeight override
 *    and grows it just enough to fit, then re-attempts the drop. Only
 *    offered when the height is the problem (the bay/wall width is a
 *    bigger commitment to change so we don't surface it here).
 *  - "Shrink to fit" — clamps the opening dimensions to the band, then
 *    drops at the reduced size.
 *  - "Cancel" — abandon the drop entirely.
 *
 * `opts` shape:
 *   { type, dims, bandH, wallW, tooTall, tooWide,
 *     onMakeTaller, onShrink, onCancel }
 *
 * Each handler is invoked AFTER the modal dismisses, so callers can run
 * synchronous re-drops without worrying about overlay z-order or focus.
 */
function oeShowOversizeModal(opts) {
  const { type, dims, bandH, wallW, tooTall, tooWide,
          onMakeTaller, onShrink, onCancel } = opts;
  // Remove any prior instance (defensive — modal is meant to be modal).
  const existing = document.getElementById('oeOversizeModal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'oeOversizeModal';
  overlay.style.cssText =
    'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:10000;'
    + 'display:flex;align-items:center;justify-content:center;'
    + 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;';

  const dialog = document.createElement('div');
  dialog.style.cssText =
    'background:var(--panel);border:1px solid var(--border);border-radius:8px;'
    + 'padding:24px;max-width:440px;width:90%;'
    + 'box-shadow:0 10px 40px rgba(0,0,0,0.25);';

  const title = document.createElement('h3');
  title.style.cssText = 'margin:0 0 12px;font-size:16px;color:var(--text);font-weight:700;';
  const typeLabel = type === 'window' ? 'Window' : type === 'door' ? 'Door' : 'Object';
  title.textContent = `${typeLabel} too large for ground floor`;
  dialog.appendChild(title);

  const msg = document.createElement('p');
  msg.style.cssText = 'margin:0 0 18px;font-size:13px;color:var(--muted);line-height:1.5;';
  let msgText = `The ${typeLabel.toLowerCase()} you're placing (${dims.w.toFixed(1)} × ${dims.h.toFixed(1)} mm) `;
  if (tooTall && tooWide) {
    msgText += `is larger than the ground floor (available ${wallW.toFixed(1)} × ${bandH.toFixed(1)} mm).`;
  } else if (tooTall) {
    msgText += `is taller than the ground floor (${bandH.toFixed(1)} mm available).`;
  } else {
    msgText += `is wider than the wall (${wallW.toFixed(1)} mm available).`;
  }
  msg.textContent = msgText;
  dialog.appendChild(msg);

  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;flex-direction:column;gap:8px;';

  const close = () => overlay.remove();

  // "Make taller" is only meaningful if height is the problem — there's no
  // analogous knob for widening the wall on a per-floor basis.
  if (tooTall) {
    const btnTaller = document.createElement('button');
    btnTaller.textContent = 'Make ground floor taller';
    btnTaller.style.cssText =
      'padding:10px 16px;background:var(--accent);color:white;border:none;'
      + 'border-radius:4px;font-size:13px;font-weight:600;cursor:pointer;';
    btnTaller.onmouseenter = () => btnTaller.style.background = 'var(--accent-dark)';
    btnTaller.onmouseleave = () => btnTaller.style.background = 'var(--accent)';
    btnTaller.onclick = () => { close(); onMakeTaller(); };
    btnRow.appendChild(btnTaller);
  }

  const btnShrink = document.createElement('button');
  btnShrink.textContent = `Shrink ${typeLabel.toLowerCase()} to fit`;
  btnShrink.style.cssText =
    'padding:10px 16px;background:var(--panel);color:var(--text);'
    + 'border:1px solid var(--border);border-radius:4px;font-size:13px;cursor:pointer;';
  btnShrink.onmouseenter = () => btnShrink.style.background = 'var(--bg)';
  btnShrink.onmouseleave = () => btnShrink.style.background = 'var(--panel)';
  btnShrink.onclick = () => { close(); onShrink(); };
  btnRow.appendChild(btnShrink);

  const btnCancel = document.createElement('button');
  btnCancel.textContent = 'Cancel';
  btnCancel.style.cssText =
    'padding:10px 16px;background:transparent;color:var(--muted);'
    + 'border:1px solid var(--border);border-radius:4px;font-size:13px;cursor:pointer;';
  btnCancel.onmouseenter = () => btnCancel.style.background = 'var(--bg)';
  btnCancel.onmouseleave = () => btnCancel.style.background = 'transparent';
  btnCancel.onclick = () => { close(); onCancel(); };
  btnRow.appendChild(btnCancel);

  dialog.appendChild(btnRow);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);

  // Esc cancels (matches typical dialog UX). Use a one-shot listener bound
  // to the overlay so we don't leak handlers if the modal is replaced.
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      document.removeEventListener('keydown', escHandler);
      close();
      onCancel();
    }
  };
  document.addEventListener('keydown', escHandler);
}

/* ---- OpeningEditorPlacement implementation ---- */
function oePlacementDropOpeningImpl(type, dims, x, y, styleKey) {
  const { W, H } = oeGetWallDims(oeWall);
  if (!Array.isArray(oeOpenings[oeWall])) oeOpenings[oeWall] = [];

  // Pre-flight size check for openings that live in floor bands. Windows
  // and doors that exceed the target band's height (or the wall's width)
  // would otherwise be silently clipped — confusing for the user who just
  // dragged a specific-sized item from the toolbox. Behaviour:
  //
  //  - Ground floor + height exceeds band: prompt the user via modal,
  //    offering either "make the floor taller" (we have a per-floor knob
  //    for that — firstFloorHeight) or "shrink the object to fit".
  //  - Upper floor OR width-only excess: silently clamp and flash a
  //    message. Widening the wall affects the whole building and growing
  //    floorHeight affects every upper floor at once, so neither is a
  //    sensible single-opening response — clamping is the right default.
  if (type === 'window' || type === 'door') {
    const bands = oeGetFloorBands(oeWall);
    const bi = oeYToBand(bands, y);
    const band = (bi >= 0) ? bands[bi] : null;
    const bandH = band ? (band.yBottom - band.yTop) : H;
    // The last band in the list is the ground floor (bands are ordered
    // top→bottom). If the click missed every band, treat it as ground —
    // doors always snap to a floor surface anyway, and the ground band
    // is where windows-with-no-band land via the existing fallback.
    const isGroundFloor = (bi === bands.length - 1) || (bi < 0);
    // Margins. Vertical: 2 mm so the opening doesn't butt up against the
    // floor panel slot. Horizontal: the edge buffer (matT on front/back,
    // 0 on side walls), which is where the perpendicular wall's core
    // material sits behind the inside face.
    const buf = oeEdgeBuffer(oeWall);
    const maxH = Math.max(2, bandH - 2);
    const maxW = Math.max(2, W - buf.left - buf.right);
    const tooTall = dims.h > maxH;
    const tooWide = dims.w > maxW;

    if (tooTall || tooWide) {
      if (isGroundFloor && tooTall) {
        oeShowOversizeModal({
          type, dims, bandH, wallW: W, tooTall, tooWide,
          onMakeTaller: () => {
            // Enable the first-floor height override and grow it just
            // enough to fit the opening (with the 2 mm top margin).
            const targetCfg = oeEditTarget();
            const wallH = wallBodyHeightFromConfig(targetCfg || CONFIG) || 100;
            const targetFFH = dims.h + 2;
            // Keep at least 8 mm of upper-floor space above the new
            // ground floor so the rest of the building doesn't collapse.
            const clampedFFH = Math.min(targetFFH, wallH - 8);
            targetCfg.firstFloorHeightEnabled = true;
            targetCfg.firstFloorHeight = Math.max(targetCfg.firstFloorHeight || 30, clampedFFH);
            if (targetCfg === CONFIG) writeForm();
            regenerate();
            // Width is still subject to the wall clamp — there's no
            // building-wide widening option in this modal, so apply it
            // up front before re-attempting the drop.
            const wClamped = Math.min(dims.w, maxW);
            oeDropOpening(type, { ...dims, w: wClamped }, x, y, styleKey);
          },
          onShrink: () => {
            const newH = Math.min(dims.h, maxH);
            const newW = Math.min(dims.w, maxW);
            oeDropOpening(type, { ...dims, h: newH, w: newW }, x, y, styleKey);
          },
          onCancel: () => { /* drop abandoned */ },
        });
        return;
      }
      // Upper floor, or width-only excess: silently clamp + flash.
      const newH = Math.min(dims.h, maxH);
      const newW = Math.min(dims.w, maxW);
      const label = (type === 'window') ? 'Window' : 'Door';
      flashMessage(
        `${label} resized from ${dims.w.toFixed(1)}×${dims.h.toFixed(1)} mm `
        + `to ${newW.toFixed(1)}×${newH.toFixed(1)} mm to fit the floor.`,
        'warn'
      );
      dims = { ...dims, h: newH, w: newW };
    }
  }

  if (type === 'window') {
    const buf = oeEdgeBuffer(oeWall);
    const bands = oeGetFloorBands(oeWall);
    const bi = oeYToBand(bands, y);
    let ny;
    if (bi >= 0) {
      const b = bands[bi];
      const cy = b.yTop + (b.yBottom - b.yTop) * 0.55;
      ny = Math.max(b.yTop + 1, Math.min(b.yBottom - dims.h - 1, cy - dims.h / 2));
    } else {
      ny = Math.max(2, Math.min(H - dims.h - 2, y - dims.h / 2));
    }
    oeOpenings[oeWall].push({ type: 'window',
      x: oeSnapPlacementX(Math.max(buf.left, Math.min(W - dims.w - buf.right, x - dims.w / 2)), dims.w),
      y: oeSnapPlacementY(ny, dims.h), w: dims.w, h: dims.h,
      style: styleKey });
  } else if (type === 'awning') {
    // Place awning; y = attachment point on wall face. Snap x to grid.
    // h field stores the DEPTH (projection), not visual wall height.
    oeOpenings[oeWall].push({ type: 'awning',
      x: oeSnapPlacementX(Math.max(0, Math.min(W - dims.w, x - dims.w / 2)), dims.w),
      y: oeSnapPlacementY(Math.max(0, Math.min(H - AWNING_DISP_H, y)), AWNING_DISP_H),
      w: dims.w,
      h: dims.d });   // h = depth for awnings
  } else if (type === 'balcony') {
    oeOpenings[oeWall].push({ type: 'balcony',
      x: oeSnapPlacementX(Math.max(0, Math.min(W - dims.w, x - dims.w / 2)), dims.w),
      y: oeSnapPlacementY(Math.max(0, Math.min(H - dims.h, y - dims.h / 2)), dims.h),
      w: dims.w, h: dims.h, d: dims.d,
      balconyType: dims.balconyType });
  } else if (type === 'fixture') {
    // Fixtures float freely on the wall surface — no band snapping; the
    // user places them wherever they look right. Clamp to wall bounds.
    // A `fullHeight: true` style (the downspout, currently) auto-sizes to
    // span from the gutter line down to ground. For a parapet roof the
    // gutter sits at the roof DECK level — the top of the roof core panel
    // — which is recessed below the parapet's top edge by `parapetH` mm
    // (since the wall material extends `parapetH` mm above the deck as
    // the parapet itself). For other roof styles (slanted, gabled, flat
    // without parapet) the deck sits at the wall top, so the downspout
    // uses the full wall height.
    const fStyle = FIXTURE_STYLES[styleKey];
    if (fStyle && fStyle.fullHeight) {
      const activeCfg = oeActiveCfg();
      const activePlan = oeActivePlan();
      const topY = downspoutRooflineTopY(activeCfg, activePlan, oeWall, styleKey);
      const downH = Math.max(1, H - topY);
      oeOpenings[oeWall].push({ type: 'fixture',
        x: oeSnapPlacementX(Math.max(0, Math.min(W - dims.w, x - dims.w / 2)), dims.w),
        y: topY,
        w: dims.w, h: downH,
        style: styleKey });
    } else {
      oeOpenings[oeWall].push({ type: 'fixture',
        x: oeSnapPlacementX(Math.max(0, Math.min(W - dims.w, x - dims.w / 2)), dims.w),
        y: oeSnapPlacementY(Math.max(0, Math.min(H - dims.h, y - dims.h / 2)), dims.h),
        w: dims.w, h: dims.h,
        style: styleKey });
    }
  } else if (type === 'cladding_override') {
    // Free-placed rectangular patch of secondary cladding material. Clamps
    // to wall bounds; the user picks the actual style via the topbar picker.
    oeOpenings[oeWall].push({ type: 'cladding_override',
      x: oeSnapPlacementX(Math.max(0, Math.min(W - dims.w, x - dims.w / 2)), dims.w),
      y: oeSnapPlacementY(Math.max(0, Math.min(H - dims.h, y - dims.h / 2)), dims.h),
      w: dims.w, h: dims.h,
      claddingStyle: oeDefaultOverrideCladdingStyle(),
    });
  } else if (type === 'printed_item') {
    // Free-placed printed item — prints on a separate sheet (not laser-cut)
    // and gets glued to the wall by the user.
    oeOpenings[oeWall].push({ type: 'printed_item',
      x: oeSnapPlacementX(Math.max(0, Math.min(W - dims.w, x - dims.w / 2)), dims.w),
      y: oeSnapPlacementY(Math.max(0, Math.min(H - dims.h, y - dims.h / 2)), dims.h),
      w: dims.w, h: dims.h,
      style: styleKey,
    });
  } else if (type === 'bay') {
    // Bays are restricted: front/back walls only, single instance per
    // building, bottom-anchored to the ground (y = H - h). 'through' style
    // creates LINKED twin entries on both walls so the user can see, drag,
    // resize, or delete the bay from either side of the building — the two
    // entries stay in sync via the standard drag/resize/delete commit path.
    if (oeWall !== 'front' && oeWall !== 'back') {
      flashMessage('Bays can only be placed on the front or back wall.', 'warn');
      return;
    }
    if (styleKey === 'through' && oeWall === 'back') {
      flashMessage('A through-bay must be placed on the front wall.', 'warn');
      return;
    }
    // Remove any existing bay (single-bay rule). We check both walls so
    // that switching the bay's home face works cleanly.
    for (const face of ['front', 'back']) {
      oeEnsureWallFeatureWorkingArray(face);
      oeOpenings[face] = oeOpenings[face].filter(op => op.type !== 'bay');
    }
    if (!Array.isArray(oeOpenings[oeWall])) oeOpenings[oeWall] = [];
    const buf = oeEdgeBuffer(oeWall);
    const maxBayW = Math.max(2, W - buf.left - buf.right);
    const bw = Math.min(maxBayW, dims.w);
    const bh = Math.min(H - 2, dims.h);
    const bx = oeSnapPlacementX(Math.max(buf.left, Math.min(W - bw - buf.right, x - bw / 2)), bw);
    const bayEntry = { type: 'bay',
      x: bx, y: H - bh,            // bottom-anchored
      w: bw, h: bh,
      style: styleKey,
      doorStyle: 'none',           // none | roller | paneled | sectional | tilt_up | slatted
      doorPercentOpen: 0,          // 0 = closed, 100 = fully open
    };
    oeOpenings[oeWall].push(bayEntry);

    // Through-bay: create a paired entry on the opposing wall. The two
    // entries share local-X coordinates because the laser-cut convention
    // assembles both panels without flipping (so wall-local X = global X
    // for both faces). Any subsequent edit to one is mirrored to the other
    // by the bay-sync helpers below.
    if (styleKey === 'through') {
      const otherWall = (oeWall === 'front') ? 'back' : 'front';
      oeEnsureWallFeatureWorkingArray(otherWall);
      oeOpenings[otherWall].push({ type: 'bay',
        x: bx, y: H - bh,
        w: bw, h: bh,
        style: styleKey,
        doorStyle: 'none',
        doorPercentOpen: 0,
      });
    }
  } else {
    const buf = oeEdgeBuffer(oeWall);
    oeOpenings[oeWall].push({ type: 'door',
      x: oeSnapPlacementX(Math.max(buf.left, Math.min(W - dims.w - buf.right, x - dims.w / 2)), dims.w),
      y: oeDoorSnappedY(oeWall, dims.h, y), w: dims.w, h: dims.h,
      style: styleKey,
    });
  }

  oeSelectedSet = new Set([oeOpenings[oeWall].length - 1]);
  oeCommit();
  // Bay drops touch both front and back oeOpenings arrays (single-bay rule
  // clears any pre-existing bay regardless of where it lived). Since the
  // unified wallFeatures model is now authoritative, commit BOTH affected
  // walls through setWallFeaturesForFace while preserving non-structural
  // surface features on those walls.
  if (type === 'bay') {
    const target = oeEditTarget();
    for (const face of ['front', 'back']) {
      if (Array.isArray(oeOpenings[face])) {
        setWallFeaturesForFace(target, face, oeOpenings[face]);
      }
    }
    regenerate();
  }
  oeRender();
}
