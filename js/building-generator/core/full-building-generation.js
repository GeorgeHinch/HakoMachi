/* =====================================================================
   FULL BUILDING GENERATION
   Combines all parts into a list.
   ===================================================================== */
import { clipPolygonByLayoutCuts, generateLayoutCutSolidBackParts, layoutCutsActive } from './layout-cut-geometry.js?v=hm-assets-20260804-2';


export function htmlEscapeInline(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function layoutReferencePrintIsGeneratedPart(part) {
  const hay = `${(part && part.id) || ''} ${(part && part.name) || ''}`.toLowerCase();
  return hay.includes('building_layout_reference') ||
         hay.includes('layout_reference_print') ||
         hay.includes('building layout reference') ||
         hay.includes('reference print');
}

export function referencePrintBlocksForConfig(cfg) {
  const blocks = [{
    label: 'Main',
    cfg,
    x: 0,
    y: 0,
    w: Math.max(1, Number(cfg && cfg.width) || 1),
    d: Math.max(1, Number(cfg && cfg.depth) || 1),
    fill: '#d8cdbb',
  }];

  if (Array.isArray(cfg && cfg.wings) && typeof weWingBounds === 'function' && typeof buildWingCfg === 'function') {
    for (let i = 0; i < cfg.wings.length; i++) {
      const wing = cfg.wings[i];
      let b = null;
      let wCfg = null;
      try { b = weWingBounds(cfg, wing); } catch (_) {}
      try { wCfg = buildWingCfg(cfg, wing); } catch (_) {}
      if (!b || !wCfg) continue;
      blocks.push({
        label: 'Wing ' + (i + 1),
        cfg: wCfg,
        x: Number(b.x) || 0,
        y: Number(b.y) || 0,
        w: Math.max(1, Number(b.w) || Number(wCfg.width) || 1),
        d: Math.max(1, Number(b.d) || Number(wCfg.depth) || 1),
        fill: (typeof WING_COLOURS !== 'undefined' && WING_COLOURS[i % WING_COLOURS.length]) || '#d8cdbb',
      });
    }
  }
  return blocks;
}

export function referencePrintBounds(blocks) {
  const minX = Math.min(...blocks.map(b => b.x));
  const minY = Math.min(...blocks.map(b => b.y));
  const maxX = Math.max(...blocks.map(b => b.x + b.w));
  const maxY = Math.max(...blocks.map(b => b.y + b.d));
  return { minX, minY, maxX, maxY, w: Math.max(1, maxX - minX), d: Math.max(1, maxY - minY) };
}

function referencePrintRectPolygon(block) {
  return [
    { x: block.x, y: block.y },
    { x: block.x + block.w, y: block.y },
    { x: block.x + block.w, y: block.y + block.d },
    { x: block.x, y: block.y + block.d },
  ];
}

function referencePrintClippedPolygon(block, cfg) {
  const poly = referencePrintRectPolygon(block);
  if (!layoutCutsActive(cfg)) return poly;
  const clipped = clipPolygonByLayoutCuts(poly, cfg.layoutCuts, cfg);
  return clipped && clipped.length >= 3 ? clipped : poly;
}

function referencePrintPolygonBounds(poly) {
  const xs = (poly || []).map(p => p.x);
  const ys = (poly || []).map(p => p.y);
  const minX = Math.min(...xs), minY = Math.min(...ys), maxX = Math.max(...xs), maxY = Math.max(...ys);
  return { minX, minY, maxX, maxY, w: Math.max(1, maxX - minX), d: Math.max(1, maxY - minY) };
}

function referencePrintPolygonCenter(poly, block) {
  if (!poly || !poly.length) return { x: block.x + block.w / 2, y: block.y + block.d / 2 };
  return poly.reduce((acc, p) => ({ x: acc.x + p.x / poly.length, y: acc.y + p.y / poly.length }), { x: 0, y: 0 });
}

export function referencePrintStructuralFeatures(blockCfg, face) {
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

export function createBuildingLayoutReferencePrintPart(cfg, plan) {
  const blocks = referencePrintBlocksForConfig(cfg || {});
  for (const blk of blocks) blk.poly = referencePrintClippedPolygon(blk, cfg || {});
  const clippedBounds = blocks.map(blk => referencePrintPolygonBounds(blk.poly || referencePrintRectPolygon(blk)));
  const b = {
    minX: Math.min(...clippedBounds.map(x => x.minX)),
    minY: Math.min(...clippedBounds.map(x => x.minY)),
    maxX: Math.max(...clippedBounds.map(x => x.maxX)),
    maxY: Math.max(...clippedBounds.map(x => x.maxY)),
  };
  b.w = Math.max(1, b.maxX - b.minX);
  b.d = Math.max(1, b.maxY - b.minY);
  const margin = 10;
  const titleH = 25;
  const legendH = 15;
  const pageW = Math.max(90, b.w + margin * 2 + 10);
  const pageH = Math.max(78, titleH + b.d + legendH + margin * 2 + 8);
  const mapX = (pageW - b.w) / 2;
  const mapY = titleH + margin;
  const f = v => Number(v || 0).toFixed(3).replace(/\.000$/, '');
  const px = x => mapX + Number(x) - b.minX;
  // Keep the printed reference in the same front-up orientation as the Shape
  // Editor so layout cuts read on the same side in every building view.
  const py = y => mapY + Number(y) - b.minY;
  const frontY = blk => py(blk.y);
  const backY = blk => py(blk.y + blk.d);
  const leftX = blk => px(blk.x);
  const rightX = blk => px(blk.x + blk.w);
  const markerColour = type => type === 'window' ? '#78baf3' : (type === 'bay' ? '#7c55df' : '#efa257');
  const markerT = type => type === 'bay' ? 4.0 : (type === 'door' ? 3.2 : 2.5);
  let svg = '';

  svg += `<rect x="0" y="0" width="${f(pageW)}" height="${f(pageH)}" fill="#fffdf8"/>`;
  svg += `<text x="${f(pageW / 2)}" y="9" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="5" font-weight="700" fill="#2a2a28">Building layout reference</text>`;
  svg += `<text x="${f(pageW / 2)}" y="15" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="2.7" fill="#8a8277">Footprint with window / door / bay positions</text>`;
  svg += `<text x="${f(pageW / 2)}" y="21" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="3.2" fill="#777">Front</text>`;
  svg += `<text x="${f(pageW / 2)}" y="${f(mapY + b.d + 8)}" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="3.2" fill="#777">Back</text>`;
  svg += `<text x="${f(mapX - 5)}" y="${f(mapY + b.d / 2 + 1)}" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="3.2" fill="#777">W</text>`;
  svg += `<text x="${f(mapX + b.w + 5)}" y="${f(mapY + b.d / 2 + 1)}" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="3.2" fill="#777">E</text>`;

  for (const blk of blocks) {
    const poly = blk.poly || referencePrintRectPolygon(blk);
    const pts = poly.map(p => `${f(px(p.x))},${f(py(p.y))}`).join(' ');
    const center = referencePrintPolygonCenter(poly, blk);
    svg += `<polygon points="${pts}" fill="${blk.fill}" fill-opacity="0.72" stroke="#3a332a" stroke-width="0.28"/>`;
    svg += `<text x="${f(px(center.x))}" y="${f(py(center.y) + 1)}" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-size="3" fill="#7a6e60">${htmlEscapeInline(blk.label)}</text>`;
  }

  function marker(x, y, w, h, type, label) {
    if (!(w > 0 && h > 0)) return;
    const col = markerColour(type);
    svg += `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${col}" fill-opacity="0.95" stroke="${col}" stroke-width="0.18"><title>${htmlEscapeInline(label)}</title></rect>`;
  }

  for (const blk of blocks) {
    for (const face of ['back', 'front', 'west', 'east']) {
      for (const op of referencePrintStructuralFeatures(blk.cfg, face)) {
        const along = Math.max(1, Number(op.w) || 1);
        const t = markerT(op.type);
        const ox = Number(op.x) || 0;
        if (face === 'back') {
          marker(leftX(blk) + ox, backY(blk) + 1.5, along, t, op.type, `${blk.label} ${face} ${op.type}`);
        } else if (face === 'front') {
          marker(leftX(blk) + ox, frontY(blk) - 3, along, t, op.type, `${blk.label} ${face} ${op.type}`);
        } else if (face === 'east') {
          // East wall-local x is measured from the back edge.
          marker(rightX(blk) + 1.5, backY(blk) - ox - along, t, along, op.type, `${blk.label} ${face} ${op.type}`);
        } else {
          // West wall-local x is measured from the front edge.
          marker(leftX(blk) - 3, frontY(blk) + ox, t, along, op.type, `${blk.label} ${face} ${op.type}`);
        }
      }
    }
  }

  const legY = pageH - 9;
  const legX = Math.max(8, pageW / 2 - 27);
  const legend = [['Window', '#78baf3'], ['Door', '#efa257'], ['Bay', '#7c55df']];
  for (let i = 0; i < legend.length; i++) {
    const x = legX + i * 22;
    svg += `<rect x="${f(x)}" y="${f(legY - 3)}" width="4" height="3" fill="${legend[i][1]}"/>`;
    svg += `<text x="${f(x + 5.5)}" y="${f(legY - 0.6)}" font-family="system-ui,-apple-system,sans-serif" font-size="2.7" fill="#555">${legend[i][0]}</text>`;
  }
  svg += `<text x="${f(pageW - 4)}" y="${f(pageH - 2.5)}" text-anchor="end" font-family="system-ui,-apple-system,sans-serif" font-size="2.4" fill="#999">front-up plan view</text>`;

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
    svgContent: svg,
    assemblyNote: 'Print at 100% for a flat reference showing the overall building footprint and the placement of windows, doors, and bay openings. This matches the front-up Shape Editor orientation.',
    meta: { area: 'general', role: 'printed_detail' },
  });
}

export function replaceBuildingLayoutReferencePrintPart(parts, cfg, plan) {
  if (!Array.isArray(parts)) return;
  for (let i = parts.length - 1; i >= 0; i--) {
    if (layoutReferencePrintIsGeneratedPart(parts[i])) parts.splice(i, 1);
  }
  parts.push(createBuildingLayoutReferencePrintPart(cfg, plan));
}

export function generateBuilding(cfg) {
  upgradeConfigToCurrentStorage(cfg);
  // Route to the multi-block generator whenever wings are present.
  if ((cfg.wings || []).length > 0) {
    const wingResult = generateBuildingWithWings(cfg);
    replaceBuildingLayoutReferencePrintPart(wingResult.parts, cfg, wingResult.plan);
    return wingResult;
  }

  const plan = buildEdgePlans(cfg);
  const parts = [];
  parts.push(generateSideWall(cfg, plan, 'E'));
  parts.push(generateSideWall(cfg, plan, 'W'));
  parts.push(generateFrontBackWall(cfg, plan, 'front'));
  parts.push(generateFrontBackWall(cfg, plan, 'back'));
  const roofResult = generateRoof(cfg, plan);
  if (Array.isArray(roofResult)) parts.push(...roofResult); else parts.push(roofResult);
  addPartsToList(parts, generateMergedFloor(cfg, plan));

  // Inter-floor core panels (one per interFloorYs entry)
  const interFloorParts = generateInterFloorPanels(cfg, plan);
  parts.push(...interFloorParts);
  parts.push(...generateEmbeddedRailParts(cfg, plan));

  // Cladding — when first-floor cladding override is enabled, produce two panels per wall (upper + ground).
  // Otherwise produce one full panel per wall.
  if (hasSplitCladding(cfg)) {
    for (const which of ['front', 'back', 'east', 'west']) {
      parts.push(generateCladdingPanel(cfg, plan, which, 'upper'));
      parts.push(generateCladdingPanel(cfg, plan, which, 'ground'));
    }
  } else {
    parts.push(generateCladdingPanel(cfg, plan, 'front'));
    parts.push(generateCladdingPanel(cfg, plan, 'back'));
    parts.push(generateCladdingPanel(cfg, plan, 'east'));
    parts.push(generateCladdingPanel(cfg, plan, 'west'));
  }

  // Interior cladding panels — one per perimeter wall when the toggle is on.
  for (const which of ['front', 'back', 'east', 'west']) {
    const ips = generateInteriorCladdingPanel(cfg, plan, which);
    if (Array.isArray(ips)) parts.push(...ips);
    else if (ips) parts.push(ips);
  }

  // Inner parapet cladding (parapet roofs only — opt-out via setting).
  parts.push(...generateInnerParapetCladding(cfg, plan));

  // Shared block-level optional/detail parts.
  const mainBlockCtx = makeBlockContext(cfg, { cfg, plan, suffix: '', label: 'Main' });
  parts.push(...generateBlockSupplementalParts(mainBlockCtx, parts, {
    groundFloorOffset: false,
    rooftopMechRoom: false,
    billboards: false,
    rooftopShield: false,
  }));

  // Truss panels (core) + X-bracing strips (cladding).
  const mainLayoutCropCtx = { rootCfg: cfg, toWorld: p => ({ x: p.x, y: p.y }) };
  parts.push(...generateTrussesForBlock(cfg, plan, '', '', mainLayoutCropCtx));
  parts.push(...generateXBracesForBlock(cfg, plan, '', ''));

  // Vertical column supports + floor etchings marking each footprint.
  const colSup_main = generateColumnSupportsForBlock(cfg, plan, '', '', mainLayoutCropCtx);
  parts.push(...colSup_main.parts);
  applyColumnFloorEtchings(parts, colSup_main.etches);

  // Remaining shared block-level supplemental parts that intentionally stay after trusses/column markings.
  parts.push(...generateBlockSupplementalParts(mainBlockCtx, parts, {
    bayDoors: false,
    trim: false,
    cornerTrim: false,
    ridgeCap: false,
    soffitCladding: false,
    roofFasciaTrim: false,
  }));

  // Cladding roof (parapet/flat only — slanted and gabled emit their own textured cladding panels via generateRoof).
  if (cfg.roofStyle === 'parapet' || cfg.roofStyle === 'flat' || cfg.roofStyle === 'flat_overhang') {
    const cT = cfg.claddingThickness;
    let rW, rH;
    if (cfg.roofStyle === 'parapet') {
      rW = plan.fbWidth - 2 * plan.matT;
      rH = cfg.depth - 2 * plan.matT;
    } else if (cfg.roofStyle === 'flat_overhang') {
      const O = Math.max(0, cfg.roofOverhang || 5);
      rW = plan.fbWidth + 2 * O;
      rH = cfg.depth + 2 * O;
    } else {
      rW = plan.fbWidth + 2 * cT;
      rH = cfg.depth + 2 * cT;
    }
    const roofStyleKey  = cfg.roofCladdingStyle || cfg.claddingStyle;
    const roofStyleSpec = CLADDING_STYLES[roofStyleKey];
    const roofLines = roofStyleSpec
      ? generateCladdingPattern(roofStyleSpec, 0, 0, rW, rH, [], null)
          .map(seg => ({ type: 'etch', x1: seg.x1, y1: seg.y1, x2: seg.x2, y2: seg.y2 }))
      : [];
    let equipOffsetX = 0;
    let equipOffsetY = 0;
    if (cfg.roofStyle === 'flat') {
      equipOffsetX = cT;
      equipOffsetY = cT;
    } else if (cfg.roofStyle === 'flat_overhang') {
      const O = Math.max(0, cfg.roofOverhang || 5);
      equipOffsetX = O;
      equipOffsetY = O;
    }
    roofLines.push(...rooftopEquipmentEtchLines(plan, equipOffsetX, equipOffsetY));
    parts.push({
      id: 'cladding_roof',
      name: 'Cladding Roof',
      material: 'cladding',
      bboxW: rW, bboxH: rH,
      bboxOffsetX: 0, bboxOffsetY: 0,
      paths: [{ type: 'cut', d: rectPath(0, 0, rW, rH) }],
      rects: [],
      lines: roofLines,
    });
  }

  let totalWindows = 0;
  let upperWindows = 0;
  let groundWindows = 0;
  let blankedUpper = 0;
  let blankedGround = 0;
  let totalDoors = 0;
  const doorTallies = {};
  const allWindowSpecs = [];
  const allBlankedSpecs = [];
  const allDoorSpecs = [];
  for (const p of parts) {
    if (!p) continue;
    const clippedWindows = clipOpeningSpecsForLayoutCut(p, p.windowSpecs || [], cfg, 1.0);
    const clippedBlanked = clipOpeningSpecsForLayoutCut(p, p.blankedSpecs || [], cfg, 1.0);
    const clippedDoors   = clipOpeningSpecsForLayoutCut(p, p.doorSpecs   || [], cfg, 1.0);

    if (clippedWindows.length) {
      allWindowSpecs.push(...clippedWindows);
      totalWindows += clippedWindows.length;
      upperWindows += clippedWindows.filter(w => !w.isGround).length;
      groundWindows += clippedWindows.filter(w => !!w.isGround).length;
    } else if (!p.windowSpecs || p.windowSpecs.length === 0) {
      if (p.windows) totalWindows += p.windows;
      if (p.upperWindows) upperWindows += p.upperWindows;
      if (p.groundWindows) groundWindows += p.groundWindows;
    }

    if (clippedBlanked.length) {
      allBlankedSpecs.push(...clippedBlanked);
      blankedUpper += clippedBlanked.filter(w => !w.isGround).length;
      blankedGround += clippedBlanked.filter(w => !!w.isGround).length;
    } else if (!p.blankedSpecs || p.blankedSpecs.length === 0) {
      if (p.blankedUpper) blankedUpper += p.blankedUpper;
      if (p.blankedGround) blankedGround += p.blankedGround;
    }

    if (clippedDoors.length) {
      allDoorSpecs.push(...clippedDoors);
      totalDoors += clippedDoors.length;
      mergeTallies(doorTallies, tallyDoorSpecs(clippedDoors));
    } else if (!p.doorSpecs || p.doorSpecs.length === 0) {
      if (p.doors) totalDoors += p.doors;
      mergeTallies(doorTallies, p.doorStyleTallies || {});
    }
  }

  const windowParts = (allWindowSpecs.length > 0)
    ? generateWindowPartsFromSpecs(cfg, allWindowSpecs)
    : generateWindowParts(cfg, upperWindows, groundWindows);
  parts.push(...windowParts);
  const blankedParts = (allBlankedSpecs.length > 0)
    ? generateBlankedWindowPanelsFromSpecs(cfg, allBlankedSpecs)
    : generateBlankedWindowPanels(cfg, blankedUpper, blankedGround);
  parts.push(...blankedParts);

  const doorParts = allDoorSpecs.length > 0
    ? generateDoorInsertsFromSpecs(cfg, allDoorSpecs)
    : generateDoorInserts(cfg, doorTallies);
  parts.push(...doorParts);

  // Fixtures (surface-mounted vents, meters, signs, lanterns, etc.).
  parts.push(...generateFixtureParts(cfg, tallyFixtures(cfg)));
  parts.push(...generateShutterParts(cfg, tallyShutters(cfg)));
  parts.push(...generateCladdingOverrideParts(cfg, tallyCladdingOverrides(cfg, plan)));
  parts.push(...generateSkylightParts(cfg, tallySkylights(cfg)));
  parts.push(...generatePrintedSheets(cfg, tallyPrintedItems(cfg)));
  replaceBuildingLayoutReferencePrintPart(parts, cfg, plan);

  parts.push(...generateInternalWallParts(cfg, plan));
  injectInternalWallSlots(parts, cfg, plan);

  parts.push(...generateLayoutCutSolidBackParts(cfg, plan));
  applyLayoutCutsToGeneratedParts(cfg, parts);

  normalizePartsMetadata(parts);
  return { parts, plan, totalWindows, upperWindows, groundWindows, totalDoors };
}

export function partToSvg(part, options) {
  options = options || {};
  // Convert mm dimensions to SVG. Use mm as the SVG user units directly
  // (set width/height with 'mm' suffix). viewBox = 0 to bboxW x bboxH
  // with bbox offsets to handle tongues/protrusions.
  const padding = 1; // mm of padding around the part for clean edges
  const vbX = -part.bboxOffsetX - padding;
  const vbY = -part.bboxOffsetY - padding;
  const vbW = part.bboxW + 2 * padding;
  const vbH = part.bboxH + 2 * padding;
  const strokeW = options.strokeMm || 0.05;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" `
    + `width="${vbW.toFixed(3)}mm" height="${vbH.toFixed(3)}mm" `
    + `viewBox="${vbX.toFixed(3)} ${vbY.toFixed(3)} ${vbW.toFixed(3)} ${vbH.toFixed(3)}">`;

  svg += partRawGeometrySvg(part, { strokeMm: strokeW, kerf: options.kerf || 0, assemblyLabels: options.assemblyLabels });
  svg += `</svg>`;
  return svg;
}

/* Render a small preview SVG (with thicker strokes for visibility).
 * When a part carries a single-tile preview geometry (via `tileGeom`) — as
 * laid out by layoutPanes / layoutSingleApFrames / layoutDividerFrame /
 * generateDoorInserts / generateShutterParts / generateCladdingOverrideParts /
 * generateSkylightParts / generatePrintedSheets / generateFixtureParts for
 * multi-copy sheets — render just that one tile so the UI shows one copy +
 * a "Cut ×N" badge instead of a tiled grid. The downloadable SVG still
 * uses the full tiled layout via partToSvg directly. */
export function partToPreviewSvg(part) {
  if (part && part.tileGeom) {
    // Build a transient "single-tile" part inheriting id/name/material but
    // with the preview geometry. mirrorX (used for the west side wall) is
    // intentionally NOT carried — tiled sheets don't use it. svgContent on
    // printed sheets carries the full-colour artwork; pass through a
    // single-tile variant from the tileGeom so the preview still shows
    // the design (just one copy of it) instead of cropping a corner of
    // the full-sheet artwork.
    const tilePart = normalizePartMetadata({
      id: part.id,
      name: part.name,
      material: part.material,
      meta: { ...(part.meta || {}), previewTileFrom: part.id },
      bboxW: part.tileGeom.bboxW,
      bboxH: part.tileGeom.bboxH,
      bboxOffsetX: part.tileGeom.bboxOffsetX || 0,
      bboxOffsetY: part.tileGeom.bboxOffsetY || 0,
      paths: (part.tileGeom.paths || []).map(p => ({ ...p })),
      rects: (part.tileGeom.rects || []).map(r => ({ ...r })),
      lines: (part.tileGeom.lines || []).map(l => ({ ...l })),
      svgContent: part.tileGeom.svgContent || undefined,
    });
    return partToSvg(tilePart, { strokeMm: 0.2, kerf: 0, assemblyLabels: false });
  }
  return partToSvg(part, { strokeMm: 0.2, kerf: 0, assemblyLabels: false });
}
