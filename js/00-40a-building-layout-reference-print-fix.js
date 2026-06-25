'use strict';

/* =====================================================================
   BUILDING LAYOUT REFERENCE PRINT ORIENTATION FIX
   ---------------------------------------------------------------------
   The printable footprint/reference sheet is an assembly aid, so it must use
   the same top-down plan convention as the floor editor: west is left, east is
   right, north/back is at the top, and south/front is at the bottom. Wall sheet
   views can be mirrored for laser assembly reasons; this reference print should
   not inherit those wall-sheet mirrors.
   ===================================================================== */
(function installBuildingLayoutReferencePrintFix() {
  if (typeof generateBuilding !== 'function' || generateBuilding.__layoutReferencePrintFix) return;

  const originalGenerateBuilding = generateBuilding;

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmt(v) {
    return Number(v || 0).toFixed(3).replace(/\.000$/, '');
  }

  function partIsLayoutReferencePrint(part) {
    const hay = `${part && part.id || ''} ${part && part.name || ''}`.toLowerCase();
    return hay.includes('building_layout_reference') ||
           hay.includes('layout_reference_print') ||
           hay.includes('building layout reference') ||
           hay.includes('reference print');
  }

  function blockListForReferencePrint(cfg) {
    const blocks = [{
      id: 'main', label: 'Main', colour: '#d8cdbb', stroke: '#3a332a',
      cfg,
      x: 0, y: 0,
      w: Number(cfg && cfg.width) || 1,
      d: Number(cfg && cfg.depth) || 1,
    }];

    if (Array.isArray(cfg && cfg.wings) && typeof weWingBounds === 'function' && typeof buildWingCfg === 'function') {
      for (let i = 0; i < cfg.wings.length; i++) {
        const wing = cfg.wings[i];
        if (!wing) continue;
        let b = null;
        try { b = weWingBounds(cfg, wing); } catch (_) { b = null; }
        if (!b) continue;
        let wCfg = null;
        try { wCfg = buildWingCfg(cfg, wing); } catch (_) { wCfg = null; }
        if (!wCfg) continue;
        blocks.push({
          id: wing.id || ('wing' + i),
          label: 'Wing ' + (i + 1),
          colour: (typeof WING_COLOURS !== 'undefined' && WING_COLOURS[i % WING_COLOURS.length]) || '#d8cdbb',
          stroke: '#3a332a',
          cfg: wCfg,
          x: Number(b.x) || 0,
          y: Number(b.y) || 0,
          w: Number(b.w) || Number(wCfg.width) || 1,
          d: Number(b.d) || Number(wCfg.depth) || 1,
        });
      }
    }
    return blocks;
  }

  function boundsOfBlocks(blocks) {
    const b = { minX: 0, minY: 0, maxX: 1, maxY: 1 };
    if (!blocks.length) return { ...b, w: 1, d: 1 };
    b.minX = Math.min(...blocks.map(x => x.x));
    b.minY = Math.min(...blocks.map(x => x.y));
    b.maxX = Math.max(...blocks.map(x => x.x + x.w));
    b.maxY = Math.max(...blocks.map(x => x.y + x.d));
    b.w = Math.max(1, b.maxX - b.minX);
    b.d = Math.max(1, b.maxY - b.minY);
    return b;
  }

  function faceFeatures(blockCfg, face) {
    try {
      if (typeof structuralWallFeaturesForFace === 'function') {
        return (structuralWallFeaturesForFace(blockCfg, face) || [])
          .filter(op => op && ['window', 'door', 'bay'].includes(op.type));
      }
    } catch (_) {}
    try {
      if (typeof manualStructuralOps === 'function') {
        return (manualStructuralOps(blockCfg, face) || [])
          .filter(op => op && ['window', 'door', 'bay'].includes(op.type));
      }
    } catch (_) {}
    return [];
  }

  function markerColour(type) {
    if (type === 'window') return '#78baf3';
    if (type === 'bay') return '#7c55df';
    return '#efa257';
  }

  function markerHeight(type) {
    if (type === 'bay') return 4.0;
    if (type === 'door') return 3.2;
    return 2.5;
  }

  function makeBuildingLayoutReferencePrintPart(cfg, plan) {
    const blocks = blockListForReferencePrint(cfg || {});
    const bounds = boundsOfBlocks(blocks);
    const margin = 10;
    const titleH = 25;
    const legendH = 15;
    const noteGap = 1.5;
    const mapW = bounds.w;
    const mapH = bounds.d;
    const pageW = Math.max(90, mapW + margin * 2 + 10);
    const pageH = Math.max(78, titleH + mapH + legendH + margin * 2 + 8);
    const mapX = (pageW - mapW) / 2;
    const mapY = titleH + margin;
    const edgeOut = 3.0;
    const wallStroke = 0.28;

    function px(x) { return mapX + (Number(x) - bounds.minX); }
    // App floor-plan y=0 is south/front. Printed reference y=0 is top, so
    // invert Y for a normal map view with north/back at the top.
    function py(y) { return mapY + (bounds.maxY - Number(y)); }
    function blockTopY(b) { return py(b.y + b.d); }
    function blockBottomY(b) { return py(b.y); }
    function blockLeftX(b) { return px(b.x); }
    function blockRightX(b) { return px(b.x + b.w); }

    let body = '';
    body += `<rect x="0" y="0" width="${fmt(pageW)}" height="${fmt(pageH)}" fill="#fffdf8"/>`;
    body += `<text x="${fmt(pageW / 2)}" y="9" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="5" font-weight="700" fill="#2a2a28">Building layout reference</text>`;
    body += `<text x="${fmt(pageW / 2)}" y="15" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="2.7" fill="#8a8277">Footprint with window / door / bay positions</text>`;
    body += `<text x="${fmt(pageW / 2)}" y="21" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="3.2" fill="#777">N</text>`;
    body += `<text x="${fmt(pageW / 2)}" y="${fmt(mapY + mapH + 8)}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="3.2" fill="#777">S</text>`;
    body += `<text x="${fmt(mapX - 5)}" y="${fmt(mapY + mapH / 2 + 1)}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="3.2" fill="#777">W</text>`;
    body += `<text x="${fmt(mapX + mapW + 5)}" y="${fmt(mapY + mapH / 2 + 1)}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="3.2" fill="#777">E</text>`;

    for (const b of blocks) {
      const x = blockLeftX(b);
      const y = blockTopY(b);
      body += `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(b.w)}" height="${fmt(b.d)}" rx="0.4" fill="${b.colour}" fill-opacity="0.72" stroke="${b.stroke}" stroke-width="${wallStroke}"/>`;
      body += `<text x="${fmt(x + b.w / 2)}" y="${fmt(y + b.d / 2 + 1)}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="3" fill="#7a6e60">${esc(b.label)}</text>`;
    }

    function emitMarker(x, y, mw, mh, type, label) {
      if (!(mw > 0 && mh > 0)) return;
      const fill = markerColour(type);
      body += `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(mw)}" height="${fmt(mh)}" fill="${fill}" fill-opacity="0.95" stroke="${fill}" stroke-width="0.18">`;
      body += `<title>${esc(label || type)}</title></rect>`;
    }

    for (const b of blocks) {
      for (const face of ['back', 'front', 'west', 'east']) {
        const ops = faceFeatures(b.cfg, face);
        for (const op of ops) {
          const type = op.type;
          const along = Math.max(1, Number(op.w) || 1);
          const thick = markerHeight(type);
          if (face === 'back') {
            // North/top edge. Use wall-local x directly in the world-plan frame;
            // do not mirror from the flat wall-sheet/elevation view.
            const x = blockLeftX(b) + (Number(op.x) || 0);
            const y = blockTopY(b) - edgeOut;
            emitMarker(x, y, along, thick, type, `${b.label} ${face} ${type}`);
          } else if (face === 'front') {
            // South/bottom edge.
            const x = blockLeftX(b) + (Number(op.x) || 0);
            const y = blockBottomY(b) + noteGap;
            emitMarker(x, y, along, thick, type, `${b.label} ${face} ${type}`);
          } else if (face === 'east') {
            // East/right side. East wall-local x is conventionally measured from
            // north/top, so convert to the printed Y-down map frame.
            const y = blockTopY(b) + (Number(op.x) || 0);
            const x = blockRightX(b) + noteGap;
            emitMarker(x, y, thick, along, type, `${b.label} ${face} ${type}`);
          } else if (face === 'west') {
            // West/left side. West wall-local x is conventionally measured from
            // south/front in the side-wall sheet, so invert it for north-up plan.
            const y = blockBottomY(b) - (Number(op.x) || 0) - along;
            const x = blockLeftX(b) - edgeOut;
            emitMarker(x, y, thick, along, type, `${b.label} ${face} ${type}`);
          }
        }
      }
    }

    const legY = pageH - 9;
    const legX = Math.max(8, pageW / 2 - 27);
    const legend = [
      ['Window', '#78baf3'],
      ['Door',   '#efa257'],
      ['Bay',    '#7c55df'],
    ];
    for (let i = 0; i < legend.length; i++) {
      const x = legX + i * 22;
      body += `<rect x="${fmt(x)}" y="${fmt(legY - 3)}" width="4" height="3" fill="${legend[i][1]}"/>`;
      body += `<text x="${fmt(x + 5.5)}" y="${fmt(legY - 0.6)}" font-family="system-ui, -apple-system, sans-serif" font-size="2.7" fill="#555">${legend[i][0]}</text>`;
    }

    body += `<text x="${fmt(pageW - 4)}" y="${fmt(pageH - 2.5)}" text-anchor="end" font-family="system-ui, -apple-system, sans-serif" font-size="2.4" fill="#999">plan view, not wall-sheet mirror</text>`;

    return normalizePartMetadata({
      id: 'building_layout_reference_print',
      name: 'Building Layout Reference Print',
      material: 'printed',
      bboxW: pageW,
      bboxH: pageH,
      bboxOffsetX: 0,
      bboxOffsetY: 0,
      paths: [],
      rects: [],
      lines: [],
      svgContent: body,
      assemblyNote: 'Print at 100% for a flat reference showing the overall building footprint and the placement of windows, doors, and bay openings. This is a north-up plan view, not a mirrored wall-sheet view.',
      meta: { area: 'general', role: 'printed_detail' },
    });
  }

  function replaceLayoutReferencePrint(result, cfg) {
    if (!result || !Array.isArray(result.parts)) return result;
    for (let i = result.parts.length - 1; i >= 0; i--) {
      if (partIsLayoutReferencePrint(result.parts[i])) result.parts.splice(i, 1);
    }
    result.parts.push(makeBuildingLayoutReferencePrintPart(cfg || CONFIG, result.plan || null));
    if (typeof normalizePartsMetadata === 'function') normalizePartsMetadata(result.parts);
    return result;
  }

  generateBuilding = function generateBuildingWithPlanReferencePrint(cfg) {
    const result = originalGenerateBuilding.apply(this, arguments);
    try { return replaceLayoutReferencePrint(result, cfg || CONFIG); }
    catch (err) {
      console.warn('Building layout reference print replacement failed:', err);
      return result;
    }
  };
  generateBuilding.__layoutReferencePrintFix = true;
})();
