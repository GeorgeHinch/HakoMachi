/* =====================================================================
   CANVAS TOP TOOLBAR  –  tools, align, distribute
   ===================================================================== */

/* ---- OpeningEditorTopbar implementation ---- */
export function oeTopbarPopulateImpl() {
  const bar = document.getElementById('oeTopbar');
  if (!bar) return;
  bar.innerHTML = '';

  const OPP = { front: 'back', back: 'front', east: 'west', west: 'east' };
  const hasSelection = oeSelectedSet.size > 0;
  const hasMulti     = oeSelectedSet.size >= 2;
  const hasFour      = oeSelectedSet.size >= 3;  // need ≥3 to distribute meaningfully

  const tb = editorTopbarKit(bar);
  const sep = () => tb.sep();
  const label = t => tb.label(t);

  function btn(id, html, title, onClick, disabledWhen, activeWhen) {
    return tb.button({ id, html, title, onClick, disabled: !!disabledWhen, active: !!activeWhen });
  }
  function iconLabel(icon, label) {
    const iconHtml = window.HakoMachiIcons ? window.HakoMachiIcons.icon(icon) : '';
    return iconHtml + (label ? ' ' + label : '');
  }

  btn(
    'oeToggleExposureZones',
    'Zones',
    'Show or hide segmented wall exposure overlays',
    () => {
      oeShowExposureZones = !oeShowExposureZones;
      oePopulateTopbar();
      oeRender();
    },
    false,
    oeShowExposureZones
  );
  label('Exposure');

  btn(
    'oeMobilePanBtn',
    'Pan',
    'Touch/Pencil pan mode. Turn on when you want one-finger/Pencil drag to move the canvas instead of editing openings.',
    () => {
      oeMobilePanMode = !oeMobilePanMode;
      oePopulateTopbar();
      oeRender();
    },
    false,
    oeMobilePanMode
  );
  label('iPad');


  // ---- Sync floating action bar button states ----
  oeUpdateFloatingActionBarState();

  // ---- Wall ops ----
  label('Wall');
  const oppLabel = OPP[oeWall] || '—';
  btn('oeMirrorBtn', iconLabel('mirror', `→${oppLabel}`), `Mirror this wall's openings to the ${oppLabel} wall (reflected)`,
    oeMirrorToOpposite);

  sep();

  // ---- Edit (copy/paste) ----
  label('Edit');
  const copyDisabled = oeSelectedSet.size === 0;
  const pasteDisabled = oeClipboard.length === 0;
  btn('oeCopyBtn',
      iconLabel('copy', 'Copy'),
      copyDisabled ? 'Copy selected items (select something first)' : `Copy ${oeSelectedSet.size} selected item${oeSelectedSet.size > 1 ? 's' : ''} (Ctrl+C / Cmd+C)`,
      oeCopy, copyDisabled);
  btn('oePasteBtn',
      iconLabel('paste', 'Paste'),
      pasteDisabled ? 'Paste from clipboard (copy something first)' : `Paste ${oeClipboard.length} item${oeClipboard.length > 1 ? 's' : ''}${oeClipboardSourceWall && oeClipboardSourceWall !== oeWall ? ' from ' + oeClipboardSourceWall : ''} (Ctrl+V / Cmd+V)`,
      oePaste, pasteDisabled);
  btn('oeDeleteTopbarBtn',
      iconLabel('trash', hasSelection ? `Delete${oeSelectedSet.size > 1 ? ' ' + oeSelectedSet.size : ''}` : 'Delete'),
      hasSelection ? `Delete ${oeSelectedSet.size} selected item${oeSelectedSet.size > 1 ? 's' : ''}` : 'Delete selected item',
      oeDeleteSelectedItems, !hasSelection);

  sep();

  // ---- Placement grid ----
  editorAddGridControls(bar, {
    title: 'Grid',
    enabled: oeGrid.enabled,
    toggle: true,
    onToggle: () => {
      oeGrid.enabled = !oeGrid.enabled;
      oeSyncLegacySnapGrid();
      oePopulateToolbox();
      oePopulateTopbar();
      oeRender();
    },
    xStep: {
      title: 'Grid X spacing in mm',
      value: oeGrid.xStep, step: 0.5, min: 0.1, max: 100, width: 42,
      onChange: v => { oeGrid.xStep = v; oeGrid.enabled = true; oeSyncLegacySnapGrid(); oePopulateToolbox(); oeRender(); },
    },
    yStep: {
      title: 'Grid Y spacing in mm',
      value: oeGrid.yStep, step: 0.5, min: 0.1, max: 100, width: 42,
      onChange: v => { oeGrid.yStep = v; oeGrid.enabled = true; oeSyncLegacySnapGrid(); oePopulateToolbox(); oeRender(); },
    },
    xOrigin: {
      title: 'Grid X origin/offset in mm',
      value: oeGrid.xOrigin, step: 0.5, min: -500, max: 500, width: 44,
      onChange: v => { oeGrid.xOrigin = v; oeRender(); },
    },
    yOrigin: {
      title: 'Grid Y origin/offset in mm, measured up from the bottom edge',
      value: oeGrid.yOrigin, step: 0.5, min: -500, max: 500, width: 44,
      onChange: v => { oeGrid.yOrigin = v; oeRender(); },
    },
    anchor: {
      title: 'Which point of each object snaps to grid intersections. Coordinates are measured from the wall bottom-left.',
      value: oeGrid.anchor === 'topLeft' ? 'bottomLeft' : (oeGrid.anchor || 'center'),
      options: [
        { value: 'center', label: 'Snap centre' },
        { value: 'bottomLeft', label: 'Snap lower-left' },
      ],
      onChange: v => { oeGrid.anchor = v; oePopulateTopbar(); oeRender(); },
    },
  });

  sep();

  // ---- Shared align/distribute group ----
  editorAddAlignmentGroup(bar, {
    alignCount: oeSelectedSet.size,
    distributeCount: oeSelectedSet.size,
    onAlign: mode => oeAlignMode(mode),
    onDistribute: axis => axis === 'h' ? oeDistributeHorizontal() : oeDistributeVertical(),
    addSeparator: true,
  });

  sep();

  // ---- Legacy space-row ----
  label('Row');
  btn('oeDistBtn', '⇔ Space', 'Evenly space all windows on the same floor band as the selected window',
    oeDistributeRow, !hasSelection);

  // ---- Selected opening anchor point + size ----
  sep();
  label('Point');

  if (hasSelection) {
    const primaryIdx = [...oeSelectedSet][0];
    const primaryOp  = (oeOpenings[oeWall] || [])[primaryIdx];

    if (primaryOp) {
      // Anchor point position. The point is either the object's centre or
      // top-left corner depending on the Grid anchor control above. Editing
      // X/Y moves the full selection by the same delta as the primary item.
      const anchorPt = oeOpMeasurePoint(primaryOp);
      const posWrap = document.createElement('span');
      posWrap.style.cssText = 'display:inline-flex;align-items:center;gap:3px;';
      function addPosInput(axis, value) {
        const lab = document.createElement('span');
        lab.className = 'oe-topbar-label';
        lab.textContent = axis.toUpperCase();
        const inp = document.createElement('input');
        inp.type = 'number';
        inp.step = '0.5';
        inp.value = value.toFixed(1);
        inp.className = 'oe-sel-size-input';
        inp.style.width = '54px';
        inp.title = `${axis.toUpperCase()} coordinate of the selected object's ${oeGrid.anchor === 'center' ? 'centre' : 'lower-left'} grid point, measured from the wall bottom-left`;
        function applyPos() {
          const xNow = parseFloat(posWrap.querySelector('[data-axis=x]').value);
          const yNow = parseFloat(posWrap.querySelector('[data-axis=y]').value);
          if (!isFinite(xNow) || !isFinite(yNow)) return;
          oeMoveSelectionAnchorTo(xNow, yNow);
          oePopulateTopbar();
        }
        inp.dataset.axis = axis;
        inp.addEventListener('change', applyPos);
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); applyPos(); } });
        inp.addEventListener('keydown', e => e.stopPropagation(), true);
        posWrap.appendChild(lab);
        posWrap.appendChild(inp);
      }
      addPosInput('x', anchorPt.x);
      addPosInput('y', anchorPt.y);
      bar.appendChild(posWrap);

      sep();
      label('Size');

      // Multi-select badge
      if (oeSelectedSet.size > 1) {
        const badge = document.createElement('span');
        badge.style.cssText = 'font-size:9px;color:var(--muted);white-space:nowrap;';
        badge.textContent = `(${oeSelectedSet.size} items)`;
        bar.appendChild(badge);
      }

      // Doors are immutable in size after placement (their dimensions come
      // from the door style's canonical values, and resizing produces ugly
      // distortions). The inputs are disabled-and-tooltipped to communicate
      // this; if a multi-selection mixes doors with other types the resize
      // path silently skips door entries.
      const primaryIsDoor = primaryOp.type === 'door';

      // W input
      const wWrap = document.createElement('span'); wWrap.style.cssText = 'display:inline-flex;align-items:center;gap:2px;';
      const wLbl = document.createElement('span'); wLbl.className = 'oe-topbar-label'; wLbl.textContent = 'W';
      const wInp = document.createElement('input');
      wInp.type = 'number'; wInp.min = '1'; wInp.max = '500'; wInp.step = '0.5';
      wInp.value = primaryOp.w.toFixed(1);
      wInp.className = 'oe-sel-size-input';
      wInp.title = primaryIsDoor
        ? 'Doors keep their canonical size — replace with a different door style to change dimensions'
        : 'Width of selected opening(s) in mm';
      if (primaryIsDoor) { wInp.disabled = true; wInp.style.opacity = '0.55'; }
      wWrap.appendChild(wLbl); wWrap.appendChild(wInp);
      bar.appendChild(wWrap);

      // H / D input (height for windows/doors, depth for awnings)
      const hWrap = document.createElement('span'); hWrap.style.cssText = 'display:inline-flex;align-items:center;gap:2px;';
      const hLbl = document.createElement('span'); hLbl.className = 'oe-topbar-label';
      hLbl.textContent = primaryOp.type === 'awning' ? 'D' : 'H';
      const hInp = document.createElement('input');
      hInp.type = 'number'; hInp.min = '1'; hInp.max = '500'; hInp.step = '0.5';
      hInp.value = primaryOp.h.toFixed(1);
      hInp.className = 'oe-sel-size-input';
      hInp.title = primaryIsDoor
        ? 'Doors keep their canonical size — replace with a different door style to change dimensions'
        : (primaryOp.type === 'awning'
            ? 'Depth of awning (projection from wall) in mm'
            : 'Height of selected opening(s) in mm');
      if (primaryIsDoor) { hInp.disabled = true; hInp.style.opacity = '0.55'; }
      hWrap.appendChild(hLbl); hWrap.appendChild(hInp);
      bar.appendChild(hWrap);

      // Apply size changes to all selected openings
      function applySelSize() {
        const newW = parseFloat(wInp.value);
        const newH = parseFloat(hInp.value);
        if (!newW || !newH || newW <= 0 || newH <= 0) return;
        const { W: wallW, H: wallH } = oeGetWallDims(oeWall);
        const ops = oeOpenings[oeWall] || [];
        for (const i of oeSelectedSet) {
          const op = ops[i];
          if (!op) continue;
          // Doors are immutable in size — skip them even in mixed-type
          // multi-selections so the user can still resize the windows in a
          // window+door multi-select without distorting the door.
          if (op.type === 'door') continue;
          // Capture the door's CURRENT bottom (which is sitting on some floor
          // surface) before resizing, so we can re-anchor it after.
          const oldBottom = op.y + op.h;
          op.w = Math.max(1, Math.min(wallW - op.x, newW));
          op.h = Math.max(1, Math.min(wallH, newH));
          // Clamp X so opening still fits within wall width after resize
          op.x = Math.max(0, Math.min(wallW - op.w, op.x));
          // Doors keep their bottom on the same floor; awnings just clamp y; windows stay in their band; fixtures and overrides float freely.
          if (op.type === 'door') op.y = Math.max(0, oldBottom - op.h);
          else if (op.type === 'awning') op.y = Math.max(0, Math.min(wallH - AWNING_DISP_H, op.y));
          else if (op.type === 'balcony') op.y = Math.max(0, Math.min(wallH - op.h, op.y));
          else if (op.type === 'fixture') op.y = Math.max(0, Math.min(wallH - op.h, op.y));
          else if (op.type === 'cladding_override') op.y = Math.max(0, Math.min(wallH - op.h, op.y));
          else if (op.type === 'printed_item') op.y = Math.max(0, Math.min(wallH - op.h, op.y));
          else {
            const bands = oeGetFloorBands(oeWall);
            const bi = oeYToBand(bands, op.y + op.h / 2);
            if (bi >= 0) {
              const b = bands[bi];
              op.y = Math.max(b.yTop + 1, Math.min(b.yBottom - op.h - 1, op.y));
            }
          }
        }
        oeCommit();
        oeRender();
      }

      wInp.addEventListener('change', applySelSize);
      hInp.addEventListener('change', applySelSize);
      // Enter key applies too
      wInp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); applySelSize(); } });
      hInp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); applySelSize(); } });
      // Stop keyboard shortcuts from firing while editing size
      wInp.addEventListener('keydown', e => e.stopPropagation(), true);
      hInp.addEventListener('keydown', e => e.stopPropagation(), true);

      // ---- Shutters (only for windows) ----
      if (primaryOp.type === 'window') {
        sep();
        label('Shutters');

        const shutterToggle = document.createElement('button');
        shutterToggle.id = 'oeShutterToggle';
        shutterToggle.className = 'oe-tb-btn';
        shutterToggle.title = 'Toggle decorative shutters flanking the selected window(s)';

        function syncToggleVisual() {
          const on = !!primaryOp.hasShutters;
          shutterToggle.classList.toggle('tb-active', on);
          shutterToggle.textContent = on ? '☑ On' : '☐ Off';
        }
        syncToggleVisual();
        shutterToggle.addEventListener('click', () => {
          const turnOn = !primaryOp.hasShutters;
          for (const i of oeSelectedSet) {
            const op = (oeOpenings[oeWall] || [])[i];
            if (!op || op.type !== 'window') continue;
            op.hasShutters = turnOn;
            if (turnOn && !op.shutterStyle) op.shutterStyle = 'louvered';
          }
          oePopulateTopbar();
          oeRender();
          oeCommit();
        });
        bar.appendChild(shutterToggle);

        // Style dropdown — only visible / enabled when shutters are on.
        // Custom popover with SVG previews of each style (native <select>
        // can't show inline visuals).
        const styleWrap = document.createElement('span');
        styleWrap.style.cssText = 'position:relative;display:inline-flex;align-items:center;gap:4px;';
        if (!primaryOp.hasShutters) styleWrap.style.opacity = '0.4';

        const styleBtn = document.createElement('button');
        styleBtn.className = 'oe-tb-btn';
        styleBtn.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:2px 8px;';
        styleBtn.disabled = !primaryOp.hasShutters;
        styleBtn.title = 'Choose shutter style';

        function refreshStyleBtn() {
          const curKey = primaryOp.shutterStyle || 'louvered';
          const curStyle = SHUTTER_STYLES[curKey] || SHUTTER_STYLES.louvered;
          const previewW = 14, previewH = 22;
          styleBtn.innerHTML = `<svg width="${previewW}" height="${previewH}" viewBox="0 0 4 6" style="display:block">${buildShutterSvgBody(curStyle, 4, 6, { strokeWidth: 0.25 })}</svg>`
                            + `<span style="font-size:10px;">${curStyle.label}</span>`
                            + `<span style="font-size:9px;color:var(--muted);">▼</span>`;
        }
        refreshStyleBtn();

        const popover = document.createElement('div');
        popover.className = 'oe-shutter-popover';
        // Same overflow-escape pattern as the cladding popover — see
        // the comment there for the full explanation. Short version:
        // .oe-topbar has overflow-x:auto, which the CSS spec promotes
        // to overflow-y:auto too, which clips absolute-positioned
        // children that extend past the topbar's bottom. Fixed
        // positioning escapes that clip.
        popover.style.cssText =
          'position:fixed;z-index:1000;background:var(--surface, #fff);'
          + 'border:1px solid var(--border, #ccc);border-radius:6px;padding:6px;display:none;'
          + 'box-shadow:0 4px 12px rgba(0,0,0,0.15);min-width:140px;';

        for (const [key, st] of Object.entries(SHUTTER_STYLES)) {
          const opt = document.createElement('div');
          opt.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 6px;cursor:pointer;border-radius:3px;';
          opt.addEventListener('mouseenter', () => opt.style.background = 'rgba(0,0,0,0.06)');
          opt.addEventListener('mouseleave', () => opt.style.background = '');
          const previewW = 18, previewH = 28;
          opt.innerHTML = `<svg width="${previewW}" height="${previewH}" viewBox="0 0 4 6" style="display:block;flex-shrink:0;">${buildShutterSvgBody(st, 4, 6, { strokeWidth: 0.25 })}</svg>`
                       + `<span style="font-size:11px;">${st.label}</span>`;
          opt.addEventListener('click', () => {
            for (const i of oeSelectedSet) {
              const op = (oeOpenings[oeWall] || [])[i];
              if (!op || op.type !== 'window') continue;
              op.shutterStyle = key;
              if (!op.hasShutters) op.hasShutters = true;
            }
            popover.style.display = 'none';
            refreshStyleBtn();
            oeRender();
            oeCommit();
          });
          popover.appendChild(opt);
        }

        styleBtn.addEventListener('click', e => {
          e.stopPropagation();
          if (styleBtn.disabled) return;
          if (popover.style.display === 'none') {
            // Pin the popover under the button — see cladding popover
            // open handler for the same logic. The shutter popover is
            // narrower (min-width 140px) and aligned to the button's
            // LEFT edge rather than its right.
            const rect = styleBtn.getBoundingClientRect();
            popover.style.top  = (rect.bottom + 4) + 'px';
            popover.style.left = Math.max(8, rect.left) + 'px';
            popover.style.right = 'auto';
            popover.style.display = 'block';
          } else {
            popover.style.display = 'none';
          }
        });
        // Close popover on outside click
        document.addEventListener('click', () => { popover.style.display = 'none'; }, { once: true });

        styleWrap.appendChild(styleBtn);
        styleWrap.appendChild(popover);
        bar.appendChild(styleWrap);
      }

      // ---- Cladding override style picker (only for cladding_override ops) ----
      // Same custom-popover pattern as shutters: a button showing the current
      // style label, click to open a popover listing every CLADDING_STYLES
      // entry. Applies to all selected overrides simultaneously.
      if (primaryOp.type === 'cladding_override') {
        sep();
        label('Style');

        const cladWrap = document.createElement('span');
        cladWrap.style.cssText = 'position:relative;display:inline-flex;align-items:center;gap:4px;';

        const cladBtn = document.createElement('button');
        cladBtn.className = 'oe-tb-btn';
        cladBtn.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:2px 8px;max-width:240px;';
        cladBtn.title = 'Choose secondary cladding style for this region';

        function refreshCladBtn() {
          const curKey = primaryOp.claddingStyle || oeDefaultOverrideCladdingStyle();
          const curStyle = CLADDING_STYLES[curKey] || CLADDING_STYLES[Object.keys(CLADDING_STYLES)[0]];
          // Small inline preview swatch — generate 4 etched pattern lines
          // from the style to suggest its character.
          const previewW = 18, previewH = 14;
          let swatch = `<rect x="0" y="0" width="20" height="16" fill="#d4c8ad"/>`;
          if (curStyle && curStyle.seamSpacing) {
            const ss = curStyle.seamSpacing;
            if (ss.horizontal) {
              const n = Math.max(2, Math.min(5, Math.round(16 / (ss.horizontal * 0.8))));
              for (let k = 1; k < n; k++) {
                const y = (16 / n) * k;
                swatch += `<line x1="1" y1="${y.toFixed(1)}" x2="19" y2="${y.toFixed(1)}" stroke="#8a7a5c" stroke-width="0.5"/>`;
              }
            }
            if (ss.vertical) {
              const n = Math.max(2, Math.min(5, Math.round(20 / (ss.vertical * 0.8))));
              for (let k = 1; k < n; k++) {
                const x = (20 / n) * k;
                swatch += `<line x1="${x.toFixed(1)}" y1="1" x2="${x.toFixed(1)}" y2="15" stroke="#8a7a5c" stroke-width="0.5"/>`;
              }
            }
          }
          swatch += `<rect x="0" y="0" width="20" height="16" fill="none" stroke="#5a4a32" stroke-width="0.6"/>`;
          const labelText = (curStyle ? curStyle.label : curKey).replace(/\(.*?\)/g, '').trim();
          cladBtn.innerHTML = `<svg width="${previewW}" height="${previewH}" viewBox="0 0 20 16" style="display:block;flex-shrink:0;">${swatch}</svg>`
                          + `<span style="font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${labelText}</span>`
                          + `<span style="font-size:9px;color:var(--muted);">▼</span>`;
        }
        refreshCladBtn();

        const cladPop = document.createElement('div');
        cladPop.className = 'oe-cladding-popover';
        // `position: fixed` rather than absolute is intentional. The
        // topbar (.oe-topbar) has `overflow-x: auto`, and per the CSS
        // spec when one axis is non-visible the other is computed to
        // `auto` too — so the topbar effectively has `overflow-y: auto`
        // as well. An absolute-positioned popover that extends below
        // the topbar would be clipped by that overflow, leaving the
        // popover invisible even though display:block was set. Fixed
        // positioning takes the popover out of the overflow-clipped
        // ancestor chain and pins it to the viewport. We compute the
        // top/left in the open-toggle handler below from the button's
        // bounding rect at click time.
        cladPop.style.cssText =
          'position:fixed;z-index:1000;background:var(--surface, #fff);'
          + 'border:1px solid var(--border, #ccc);border-radius:6px;padding:6px;display:none;'
          + 'box-shadow:0 4px 12px rgba(0,0,0,0.15);min-width:220px;max-height:320px;overflow-y:auto;';

        for (const [key, st] of Object.entries(CLADDING_STYLES)) {
          const opt = document.createElement('div');
          opt.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px 6px;cursor:pointer;border-radius:3px;';
          opt.addEventListener('mouseenter', () => opt.style.background = 'rgba(0,0,0,0.06)');
          opt.addEventListener('mouseleave', () => opt.style.background = '');
          // Build mini swatch per style
          let swatch = `<rect x="0" y="0" width="24" height="18" fill="#d4c8ad"/>`;
          if (st.seamSpacing) {
            const ss = st.seamSpacing;
            if (ss.horizontal) {
              const n = Math.max(2, Math.min(6, Math.round(18 / (ss.horizontal * 0.8))));
              for (let k = 1; k < n; k++) {
                const y = (18 / n) * k;
                swatch += `<line x1="1" y1="${y.toFixed(1)}" x2="23" y2="${y.toFixed(1)}" stroke="#7a6a4c" stroke-width="0.6"/>`;
              }
            }
            if (ss.vertical) {
              const n = Math.max(2, Math.min(6, Math.round(24 / (ss.vertical * 0.8))));
              for (let k = 1; k < n; k++) {
                const x = (24 / n) * k;
                swatch += `<line x1="${x.toFixed(1)}" y1="1" x2="${x.toFixed(1)}" y2="17" stroke="#7a6a4c" stroke-width="0.6"/>`;
              }
            }
          }
          swatch += `<rect x="0" y="0" width="24" height="18" fill="none" stroke="#5a4a32" stroke-width="0.6"/>`;
          opt.innerHTML = `<svg width="26" height="20" viewBox="0 0 24 18" style="display:block;flex-shrink:0;">${swatch}</svg>`
                       + `<span style="font-size:11px;">${st.label}</span>`;
          opt.addEventListener('click', () => {
            // The new style — needed both for the loop body and for
            // deciding whether to keep / discard any per-override
            // styleParams the user dialled in for the previous style.
            const newStyle = CLADDING_STYLES[key];
            const newPattern = newStyle && newStyle.pattern;
            for (const i of oeSelectedSet) {
              const op = (oeOpenings[oeWall] || [])[i];
              if (!op || op.type !== 'cladding_override') continue;
              op.claddingStyle = key;
              // Drop styleParams when switching to a style that doesn't
              // consume them (anything other than the corrugated_overlap
              // pattern at the moment). effectiveCladdingStyle would
              // already ignore them silently, but clearing them here
              // keeps the saved data clean and prevents stale params
              // surfacing if the user later flips the override back to
              // corrugated.
              if (newPattern !== 'corrugated_overlap' && op.styleParams) {
                delete op.styleParams;
              }
            }
            cladPop.style.display = 'none';
            refreshCladBtn();
            // Repopulate the whole topbar — the corrugated params section
            // appears only when the override's style has the
            // corrugated_overlap pattern, so a style change has to
            // re-evaluate that visibility. Without this refresh the
            // params section would either linger after switching away
            // from corrugated, or fail to appear after switching TO it.
            oePopulateTopbar();
            oeRender();
            oeCommit();
          });
          cladPop.appendChild(opt);
        }

        cladBtn.addEventListener('click', e => {
          e.stopPropagation();
          if (cladPop.style.display === 'none') {
            // Position the popover just below the button. Because the
            // popover is position:fixed (see comment on cladPop above),
            // its coordinates are viewport-relative — read the button's
            // bounding rect at click time and pin the popover's top to
            // (button bottom + 4px), its right edge to the button's
            // right edge so it grows leftward. Clamping the left to
            // ≥ 8 prevents it from sliding off-screen when the button
            // sits near the left side of the viewport (narrow windows /
            // small popovers don't trigger this, but a 240-wide
            // popover near x=100 would).
            const rect = cladBtn.getBoundingClientRect();
            cladPop.style.top  = (rect.bottom + 4) + 'px';
            const popMinWidth = 240;
            const leftPref = rect.right - popMinWidth;
            cladPop.style.left = Math.max(8, leftPref) + 'px';
            cladPop.style.right = 'auto';
            cladPop.style.display = 'block';
          } else {
            cladPop.style.display = 'none';
          }
        });
        document.addEventListener('click', () => { cladPop.style.display = 'none'; }, { once: true });

        cladWrap.appendChild(cladBtn);
        cladWrap.appendChild(cladPop);
        bar.appendChild(cladWrap);

        // ---- Mount mode (flush vs layered) ----
        // Mirrors the layered-fixture idiom: cladding overrides default to
        // "flush" (the base cladding gets a rectangular hole cut, the
        // override piece slots in coplanar). Toggling to "layered" stops
        // cutting the hole and instead etches L-bracket alignment marks
        // at the override's corners so the user can position the patch
        // accurately as a glue-on-top layer. The base cladding pattern is
        // suppressed under the override in both modes — in flush mode
        // because the hole removes it, in layered mode because the
        // override piece covers it.
        sep();
        label('Mount');

        const mountToggle = document.createElement('button');
        mountToggle.id = 'oeOverrideMountToggle';
        mountToggle.className = 'oe-tb-btn';
        mountToggle.title = 'Toggle between flush (cut a hole, piece slots in) and layered (alignment marks only, piece glued on top)';

        function syncMountVisual() {
          const on = !!primaryOp.layered;
          mountToggle.classList.toggle('tb-active', on);
          mountToggle.textContent = on ? '▣ Layered' : '⬚ Flush';
        }
        syncMountVisual();
        mountToggle.addEventListener('click', () => {
          const turnOn = !primaryOp.layered;
          for (const i of oeSelectedSet) {
            const op = (oeOpenings[oeWall] || [])[i];
            if (!op || op.type !== 'cladding_override') continue;
            op.layered = turnOn;
          }
          oePopulateTopbar();
          oeRender();
          oeCommit();
        });
        bar.appendChild(mountToggle);

        // ---- Corrugated metal style parameters (only when the override
        // uses the corrugated_metal_overlap style) ----
        // Lets the user tune the corrugated cladding per override right
        // from the topbar — useful because the same building can have a
        // tightly-corrugated wall patch AND a coarser corrugated roof
        // patch, and the user shouldn't have to commit either choice
        // globally to try them. Four params:
        //   sheetW              mm — sheet width in the brick-stagger layout
        //   sheetH              mm — sheet height (= row height)
        //   corrugationSpacing  mm — vertical ridge pitch
        //   offsetFraction      0..1 — how far adjacent rows stagger
        // Values are stored on op.styleParams; absent values fall back
        // to the CLADDING_STYLES.corrugated_metal_overlap defaults via
        // effectiveCladdingStyle() at render time.
        const curCladKey = primaryOp.claddingStyle || oeDefaultOverrideCladdingStyle();
        const curCladStyle = CLADDING_STYLES[curCladKey];
        if (curCladStyle && curCladStyle.pattern === 'corrugated_overlap') {
          sep();
          label('Corrugated');

          // Build one small number input per parameter. Each input
          // mutates op.styleParams on every selected cladding_override
          // (creating the object on first touch) and triggers a regen
          // so the laser preview, 3D view, and the editor's wall
          // pattern all re-render with the new values.
          function makeParamInput(field, displayLabel, step, min, max, unit) {
            const wrap = document.createElement('span');
            wrap.style.cssText = 'display:inline-flex;align-items:center;gap:3px;margin-left:6px;';
            const lab = document.createElement('span');
            lab.className = 'oe-topbar-label';
            lab.textContent = displayLabel;
            const inp = document.createElement('input');
            inp.type = 'number';
            inp.min = min.toString(); inp.max = max.toString(); inp.step = step.toString();
            const current = (primaryOp.styleParams && primaryOp.styleParams[field] != null)
              ? primaryOp.styleParams[field]
              : curCladStyle[field];
            inp.value = current != null ? current.toString() : '';
            inp.className = 'oe-sel-size-input';
            inp.style.width = '46px';
            inp.title = `Corrugated metal — ${displayLabel.toLowerCase()} (${min}–${max}${unit})`;
            function applyParam() {
              const v = Math.max(min, Math.min(max, parseFloat(inp.value) || min));
              inp.value = v.toString();
              for (const i of oeSelectedSet) {
                const op = (oeOpenings[oeWall] || [])[i];
                if (!op || op.type !== 'cladding_override') continue;
                if (!op.styleParams) op.styleParams = {};
                op.styleParams[field] = v;
              }
              oeCommit();
              oeRender();
              regenerate();
            }
            inp.addEventListener('change', applyParam);
            inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); applyParam(); } });
            inp.addEventListener('keydown', e => e.stopPropagation(), true);
            wrap.appendChild(lab);
            wrap.appendChild(inp);
            if (unit) {
              const u = document.createElement('span');
              u.className = 'oe-topbar-label';
              u.textContent = unit;
              wrap.appendChild(u);
            }
            bar.appendChild(wrap);
          }
          makeParamInput('sheetW',             'Sheet W',     0.5, 1,    20,   'mm');
          makeParamInput('sheetH',             'Sheet H',     0.5, 2,    40,   'mm');
          makeParamInput('corrugationSpacing', 'Ridge',       0.1, 0.3,  3.0,  'mm');
          makeParamInput('offsetFraction',     'Stagger',     0.05, 0,   1,    '');
        }
      }

      // ---- Bay door (only for bay ops) ----
      // A bay can host a "door" overlay — a thin cut piece glued to the
      // INSIDE face of the core panel behind the bay opening, giving the
      // illusion of depth (cladding hole → empty matT → recessed door
      // panel). Two controls: style (none / roller / paneled / etc.) and
      // percent open. When percent open > 0, the door is treated as
      // partially retracted and the cut piece shrinks accordingly.
      //
      // Implementation note: we use plain native <select> + <input> here
      // rather than the custom-popover pattern shutters and cladding use,
      // because native form controls don't get clipped by the topbar's
      // overflow-x:auto and don't fight with the editor's keyboard or
      // outside-click handlers. The trade-off is no inline SVG previews
      // in the dropdown — descriptive labels do the work instead.
      if (primaryOp.type === 'bay') {
        sep();
        label('Bay door');

        // Helper — mirror a single field to the through-bay's partner
        // entry on the opposite wall (no-op for side bays) so the front
        // and back panels of a drive-through stay consistent. Also
        // persists the partner change to CONFIG.manualOpenings since
        // oeCommit only writes the current wall.
        function syncBayField(field, value) {
          if (primaryOp.style !== 'through') return;
          const otherWall = (oeWall === 'front') ? 'back' : 'front';
          const otherOps = oeOpenings[otherWall] || [];
          for (const otherOp of otherOps) {
            if (otherOp && otherOp.type === 'bay') otherOp[field] = value;
          }
          const structural = otherOps.filter(op =>
            op.type !== 'awning' && op.type !== 'balcony' &&
            op.type !== 'fixture' && op.type !== 'cladding_override' &&
            op.type !== 'printed_item');
          if (!CONFIG.manualOpenings) CONFIG.manualOpenings = { front: null, back: null, east: null, west: null };
          CONFIG.manualOpenings[otherWall] = structural.length > 0 ? structural : null;
        }

        // Style picker — native <select>.
        const styleSel = document.createElement('select');
        styleSel.className = 'oe-tb-btn';
        styleSel.style.cssText = 'padding:2px 4px;font-size:11px;height:24px;';
        styleSel.title = 'Choose bay door style';
        for (const [key, st] of Object.entries(BAY_DOOR_STYLES)) {
          const opt = document.createElement('option');
          opt.value = key;
          opt.textContent = st.label;
          styleSel.appendChild(opt);
        }
        styleSel.value = primaryOp.doorStyle || 'none';
        styleSel.addEventListener('change', () => {
          const key = styleSel.value;
          for (const i of oeSelectedSet) {
            const op = (oeOpenings[oeWall] || [])[i];
            if (!op || op.type !== 'bay') continue;
            op.doorStyle = key;
          }
          syncBayField('doorStyle', key);
          oeCommit();
          oeRender();
          regenerate();
        });
        // Block editor keyboard shortcuts (delete, etc.) while the
        // dropdown has focus.
        styleSel.addEventListener('keydown', e => e.stopPropagation(), true);
        bar.appendChild(styleSel);

        // Percent-open input — number 0–100, disabled when style is 'none'.
        const openWrap = document.createElement('span');
        openWrap.style.cssText = 'display:inline-flex;align-items:center;gap:3px;margin-left:4px;';
        const openLbl = document.createElement('span');
        openLbl.className = 'oe-topbar-label';
        openLbl.textContent = 'Open';
        const openInp = document.createElement('input');
        openInp.type = 'number'; openInp.min = '0'; openInp.max = '100'; openInp.step = '5';
        openInp.value = (primaryOp.doorPercentOpen != null ? primaryOp.doorPercentOpen : 0).toString();
        openInp.className = 'oe-sel-size-input';
        openInp.style.width = '52px';
        const openPct = document.createElement('span');
        openPct.className = 'oe-topbar-label';
        openPct.textContent = '%';

        // Disable the number input when the door style is 'none' — no
        // panel to open/close. Re-enabled the instant a real style is
        // chosen.
        const isNone = (primaryOp.doorStyle || 'none') === 'none';
        openInp.disabled = isNone;
        openInp.style.opacity = isNone ? '0.4' : '1';
        openInp.title = isNone
          ? 'Set a door style first to control how open the door is'
          : '% open (0 = closed, 100 = fully retracted)';

        function applyOpenPct() {
          const v = Math.max(0, Math.min(100, parseFloat(openInp.value) || 0));
          openInp.value = v.toString();
          for (const i of oeSelectedSet) {
            const op = (oeOpenings[oeWall] || [])[i];
            if (!op || op.type !== 'bay') continue;
            op.doorPercentOpen = v;
          }
          syncBayField('doorPercentOpen', v);
          oeCommit();
          oeRender();
          regenerate();
        }
        openInp.addEventListener('change', applyOpenPct);
        openInp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); applyOpenPct(); } });
        openInp.addEventListener('keydown', e => e.stopPropagation(), true);

        openWrap.appendChild(openLbl);
        openWrap.appendChild(openInp);
        openWrap.appendChild(openPct);
        bar.appendChild(openWrap);
      }
    }
  } else {
    // Nothing selected — show greyed placeholder
    const ph = document.createElement('span');
    ph.style.cssText = 'font-size:10px;color:var(--muted);font-style:italic;white-space:nowrap;';
    ph.textContent = 'select an opening';
    bar.appendChild(ph);
  }
}

/* -- Icon helpers -- */
