'use strict';

/* =====================================================================
   FULL BUILDING GENERATION
   Combines all parts into a list.
   ===================================================================== */
function generateBuilding(cfg) {
  upgradeConfigToCurrentStorage(cfg);
  // Route to the multi-block generator whenever wings are present
  if ((cfg.wings || []).length > 0) return generateBuildingWithWings(cfg);

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

  // Cladding
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

  // Interior cladding panels — one per perimeter wall when the
  // interiorCladding toggle is on. Independent style + matching wall_x
  // opening positions so the inside cutout aligns with the wall's hole
  // (which the exterior already aligns with). Returns null when the
  // feature is off; filter to keep the build flow clean.
  for (const which of ['front', 'back', 'east', 'west']) {
    const ips = generateInteriorCladdingPanel(cfg, plan, which);
    if (Array.isArray(ips)) parts.push(...ips);
    else if (ips) parts.push(ips);
  }

  // Inner parapet cladding (parapet roofs only — opt-out via setting).
  parts.push(...generateInnerParapetCladding(cfg, plan));

  // Shared block-level optional/detail parts. This mirrors the same helper
  // used by the multi-block/wing path so ridge caps, soffits, fascia,
  // bay doors, awnings, balconies, etc. are emitted consistently.
  const mainBlockCtx = makeBlockContext(cfg, { cfg, plan, suffix: '', label: 'Main' });
  parts.push(...generateBlockSupplementalParts(mainBlockCtx, parts, {
    // Ground-floor offset, rooftop mech, billboards and shield are added
    // later in this single-block path to preserve the old ordering around
    // trusses/column footprint etching.
    groundFloorOffset: false,
    rooftopMechRoom: false,
    billboards: false,
    rooftopShield: false,
  }));

  // Truss panels (core) + X-bracing strips (cladding). The truss
  // generator picks Fink for gabled, mono-pitch Pratt for slanted, or
  // parallel-chord Pratt for flat/parapet, and emits one panel per
  // spaced position along the block's length. X-bracing strips, if
  // any walls are flagged, glue diagonally on those walls — separate
  // pieces so they can sit on top of the wall cladding without
  // interfering with the core tongues.
  const mainLayoutCropCtx = { rootCfg: cfg, toWorld: p => ({ x: p.x, y: p.y }) };
  parts.push(...generateTrussesForBlock(cfg, plan, '', '', mainLayoutCropCtx));
  parts.push(...generateXBracesForBlock(cfg, plan, '', ''));

  // Vertical column supports (3-piece I-beam at every truss bearing
  // point) + floor etchings marking each footprint. The etchings are
  // applied to the floor part as etch-mode line segments — they cut
  // visible registration marks into the floor without removing
  // material so the user can lay each column down at assembly time.
  const colSup_main = generateColumnSupportsForBlock(cfg, plan, '', '', mainLayoutCropCtx);
  parts.push(...colSup_main.parts);
  applyColumnFloorEtchings(parts, colSup_main.etches);

  // Remaining shared block-level supplemental parts that intentionally stay
  // after trusses/column floor markings in the single-block path.
  parts.push(...generateBlockSupplementalParts(mainBlockCtx, parts, {
    bayDoors: false,
    trim: false,
    cornerTrim: false,
    ridgeCap: false,
    soffitCladding: false,
    roofFasciaTrim: false,
  }));

  // Cladding roof (parapet/flat only — slanted and gabled emit their own
  // textured cladding panels via generateRoof). Apply the roof cladding
  // pattern so the user's choice in the topbar / left panel actually
  // shows up on the laser-cut layer. Without this etching the parapet /
  // flat cladding roof was just a blank rectangle and changing the roof
  // cladding style appeared to do nothing.
  if (cfg.roofStyle === 'parapet' || cfg.roofStyle === 'flat' || cfg.roofStyle === 'flat_overhang') {
    const cT = cfg.claddingThickness;
    let rW, rH;
    if (cfg.roofStyle === 'parapet') {
      // Parapet roof sits recessed inside the walls (the parapet wall extends
      // above the roof). Cladding fits WITHIN the walls — interior dimensions
      // = outer dim minus a wall thickness on each side. Matches the roof
      // core piece (fbWidth - 2*matT × sideLen).
      rW = plan.fbWidth - 2 * plan.matT;
      rH = cfg.depth    - 2 * plan.matT;
    } else if (cfg.roofStyle === 'flat_overhang') {
      // Flat with overhang — the cladding covers the entire oversized
      // core including the eave projection on every side. Matches the
      // dimensions of the roof core part exactly so the metal-look
      // pattern wraps to the outer edge with no exposed core showing.
      const O = Math.max(0, cfg.roofOverhang || 5);
      rW = plan.fbWidth + 2 * O;
      rH = cfg.depth    + 2 * O;
    } else {
      // Flat roof sits ON TOP of the walls. Cladding spans the outer footprint
      // plus the usual cT overhang on each side.
      rW = plan.fbWidth + 2 * cT;
      rH = cfg.depth    + 2 * cT;
    }
    // Etch the configured roof cladding pattern. Falls back to the wall
    // cladding style if no roof-specific style is set (preserves the
    // pre-roof-cladding behaviour for older configs).
    const roofStyleKey  = cfg.roofCladdingStyle || cfg.claddingStyle;
    const roofStyleSpec = CLADDING_STYLES[roofStyleKey];
    const roofLines = roofStyleSpec
      ? generateCladdingPattern(roofStyleSpec, 0, 0, rW, rH, [], null)
          .map(seg => ({ type: 'etch', x1: seg.x1, y1: seg.y1, x2: seg.x2, y2: seg.y2 }))
      : [];
    let equipOffsetX = 0;
    let equipOffsetY = 0;
    if (cfg.roofStyle === 'flat') {
      // Flat roof cladding overhangs the core by cladding thickness on all sides.
      equipOffsetX = cT;
      equipOffsetY = cT;
    } else if (cfg.roofStyle === 'flat_overhang') {
      // Editor/equipment coords are in the building footprint frame; overhang
      // cladding includes the eave projection around that footprint.
      const O = Math.max(0, cfg.roofOverhang || 5);
      equipOffsetX = O;
      equipOffsetY = O;
    } else {
      // Recessed/parapet roof cladding is already in the interior roof frame.
      equipOffsetX = 0;
      equipOffsetY = 0;
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

  // Window/door counts (use the cladding-side counts for actual counts since both core+cladding 
  // get the same count, and window parts only need to match window count)
  let totalWindows = 0;
  let upperWindows = 0;
  let groundWindows = 0;
  let blankedUpper = 0;
  let blankedGround = 0;
  let totalDoors = 0;
  // Per-style door tallies — different walls may have different mixes when
  // the user places doors via the openings editor.
  const doorTallies = {};
  // Per-window dimension records collected across all cladding parts. The
  // glass/backing/frame generator groups these by (w, h, style) and emits a
  // separately-sized set per group — see generateWindowPartsFromSpecs.
  const allWindowSpecs = [];
  const allBlankedSpecs = [];
  const allDoorSpecs = [];
  for (const p of parts) {
    if (!p) continue;
    // Window/door metadata can live on any cladding panel material. When a
    // cladding style is routed to a custom material folder, p.material is no
    // longer literally "cladding"; the previous guard skipped its metadata,
    // so glass/frame/divider/door insert cut sheets were never emitted.
    //
    // Layout cuts can shorten a wall/cladding panel after openings were
    // generated. Clip child window/door specs against the retained wall span
    // now, so a partially cut window creates matching partial glass/frame/
    // divider pieces and a partially cut door creates a matching partial
    // insert, instead of exporting the full original child piece.
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
  // Spec-driven generation when wall parts reported per-window specs (the
  // normal case); fall back to the legacy count-only path when no specs are
  // available (defensive, for any cladding code that hasn't been updated to
  // emit windowSpecs yet).
  const windowParts = (allWindowSpecs.length > 0)
    ? generateWindowPartsFromSpecs(cfg, allWindowSpecs)
    : generateWindowParts(cfg, upperWindows, groundWindows);
  parts.push(...windowParts);
  // Blanking panels for windows with placement: 'blanked' — same spec-vs-
  // count split as above.
  const blankedParts = (allBlankedSpecs.length > 0)
    ? generateBlankedWindowPanelsFromSpecs(cfg, allBlankedSpecs)
    : generateBlankedWindowPanels(cfg, blankedUpper, blankedGround);
  parts.push(...blankedParts);

  const doorParts = allDoorSpecs.length > 0
    ? generateDoorInsertsFromSpecs(cfg, allDoorSpecs)
    : generateDoorInserts(cfg, doorTallies);
  parts.push(...doorParts);

  // Fixtures (surface-mounted vents, meters, signs, lanterns, etc.).
  // Tally is read from wallFeatures, the current wall-object store.
  parts.push(...generateFixtureParts(cfg, tallyFixtures(cfg)));
  parts.push(...generateShutterParts(cfg, tallyShutters(cfg)));
  parts.push(...generateCladdingOverrideParts(cfg, tallyCladdingOverrides(cfg, plan)));
  parts.push(...generateSkylightParts(cfg, tallySkylights(cfg)));
  parts.push(...generatePrintedSheets(cfg, tallyPrintedItems(cfg)));

  parts.push(...generateInternalWallParts(cfg, plan));
  injectInternalWallSlots(parts, cfg, plan);

  applyLayoutCutsToGeneratedParts(cfg, parts);

  normalizePartsMetadata(parts);
  return { parts, plan, totalWindows, upperWindows, groundWindows, totalDoors };
}

function partToSvg(part, options) {
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

  svg += partRawGeometrySvg(part, { strokeMm: strokeW, kerf: options.kerf || 0 });
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
function partToPreviewSvg(part) {
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
    return partToSvg(tilePart, { strokeMm: 0.2, kerf: 0 });
  }
  return partToSvg(part, { strokeMm: 0.2, kerf: 0 });
}
