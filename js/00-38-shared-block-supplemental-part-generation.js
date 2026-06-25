'use strict';

/* =====================================================================
   SHARED BLOCK SUPPLEMENTAL PART GENERATION
   ---------------------------------------------------------------------
   Main and wing generation used to append optional/detail parts through
   separate ad-hoc lists. That caused "works for main, missing with wings"
   bugs such as ridge caps not appearing in multi-block exports. This helper
   is now the single place that emits block-level supplemental parts.
   ===================================================================== */

function addBlockSupplementalPartIdentity(parts, ctx) {
  if (!ctx) return parts || [];
  const suffix = blockPartIdSuffix(ctx);
  const prefix = blockPartNamePrefix(ctx);
  for (const p of (parts || [])) {
    if (!p) continue;
    if (ctx.kind === 'wing') {
      if (suffix && !String(p.id || '').endsWith(suffix)) p.id = String(p.id || 'part') + suffix;
      if (prefix && !String(p.name || '').startsWith(prefix)) p.name = prefix + (p.name || p.id || 'Part');
    }
    normalizePartMetadata(p, {
      scope: ctx.kind === 'wing' ? 'wing' : 'main',
      wingIndex: ctx.kind === 'wing' ? ctx.wingIndex : null,
    });
  }
  return parts || [];
}

function generateBlockSupplementalParts(ctx, partsSoFar, opts = {}) {
  const cfg = ctx.cfg;
  const plan = ctx.plan;
  const existing = Array.isArray(partsSoFar) ? partsSoFar : [];
  const parts = [];

  const include = (key, def = true) => opts[key] !== false && def;
  const push = list => {
    if (!list) return;
    if (Array.isArray(list)) parts.push(...list.filter(Boolean));
    else parts.push(list);
  };

  // Bay door panels should exist before trim/shield calculations that may
  // inspect current parts.
  if (include('bayDoors')) push(generateBayDoorParts(cfg, plan));

  // Trim / corner / roof-detail parts.
  if (include('trim')) push(generateTrimStrips(cfg, plan, existing.concat(parts)));
  if (include('cornerTrim')) push(generateCornerTrim(cfg, plan));
  if (include('ridgeCap')) push(generateParapetCap(cfg, plan));
  if (include('soffitCladding')) push(generateSoffitCladding(cfg, plan));
  if (include('roofFasciaTrim')) push(generateRoofFasciaTrim(cfg, plan));

  // Block-local add-ons.
  if (include('groundFloorOffset', ctx.kind === 'main')) push(generateGroundFloorOffsetParts(cfg, plan));
  if (include('rooftopMechRoom', ctx.kind === 'main')) push(generateRooftopMechRoom(cfg, plan));
  if (include('awnings')) push(generateAwningParts(cfg, plan));
  if (include('balconies')) push(generateBalconyParts(cfg, plan));
  if (include('billboards', ctx.kind === 'main')) push(generateBillboardParts(cfg));
  if (include('rooftopShield', ctx.kind === 'main')) push(generateRooftopShieldParts(cfg, plan, existing.concat(parts)));

  return addBlockSupplementalPartIdentity(parts, ctx);
}

/* =====================================================================
   PATCH — FLAT ROOF SLOT COUNT MATCH
   ---------------------------------------------------------------------
   Loaded after the roof generator split.  These overrides keep flat and
   flat-overhang roof slot rows locked to the same three roof tongues that
   generateFrontBackWall()/generateSideWall() create for non-parapet roofs.
   ===================================================================== */

(function installFlatRoofSlotCountMatchPatch() {
  function generateFlatRoofPatched(cfg, plan) {
    const { matT, tw, fbWidth } = plan;
    const rW = fbWidth;
    const rH = cfg.depth;
    const margin = Math.max(matT * 2, 5);

    const roofTongueCount = 3;
    const sideSlotLen = (cfg._omitConnectionWall ? (rH - matT) : (rH - 2 * matT));
    const topSlots = placeTongues(rW, tw, margin, [], roofTongueCount, tw / 2);
    const bottomSlots = topSlots;
    const sideSlots = placeTongues(sideSlotLen, tw, margin, [], roofTongueCount, tw / 2);

    const rects = [];
    const BLEED = 0.6;

    for (const s of topSlots) {
      rects.push({ type: 'cut', x: s.start, y: -BLEED, w: s.end - s.start, h: matT + BLEED, compensateKerf: true });
    }
    for (const s of bottomSlots) {
      rects.push({ type: 'cut', x: s.start, y: rH - matT, w: s.end - s.start, h: matT + BLEED, compensateKerf: true });
    }
    for (const s of sideSlots) {
      const yOff = cfg._omitConnectionWall ? 0 : matT;
      rects.push({ type: 'cut', x: -BLEED, y: yOff + s.start, w: matT + BLEED, h: s.end - s.start, compensateKerf: true });
    }
    for (const s of sideSlots) {
      const yOff = cfg._omitConnectionWall ? 0 : matT;
      rects.push({ type: 'cut', x: rW - matT, y: yOff + s.start, w: matT + BLEED, h: s.end - s.start, compensateKerf: true });
    }

    const perimeter = rectPath(0, 0, rW, rH);
    const lines = [];
    addRoofMechRoomAndEquipment(plan, cfg, rects, lines, /*roofIsRecessed=*/false);

    return {
      id: 'roof',
      name: 'Roof (flat, flush)',
      material: 'core',
      bboxW: rW,
      bboxH: rH,
      bboxOffsetX: 0,
      bboxOffsetY: 0,
      paths: [{ type: 'cut', d: perimeter }, ...holePathsForList(cfg.roofHoles), ...skylightHolePaths(cfg.skylights)],
      rects: rects,
      lines: lines,
    };
  }

  function generateFlatOverhangRoofPatched(cfg, plan) {
    const { matT, tw, fbWidth } = plan;
    const O = Math.max(0, cfg.roofOverhang || 5);
    const rW = fbWidth + 2 * O;
    const rH = cfg.depth + 2 * O;
    const margin = Math.max(matT * 2, 5);

    const roofTongueCount = 3;
    const sideSlotLen = (cfg._omitConnectionWall ? (cfg.depth - matT) : (cfg.depth - 2 * matT));
    const sideSlotOffset = cfg._omitConnectionWall ? 0 : matT;
    const topSlots = placeTongues(fbWidth, tw, margin, [], roofTongueCount, tw / 2);
    const sideSlots = placeTongues(sideSlotLen, tw, margin, [], roofTongueCount, tw / 2);

    const rects = [];
    const BLEED = 0.6;

    for (const s of topSlots) {
      rects.push({ type: 'cut', x: O + s.start, y: O - BLEED, w: s.end - s.start, h: matT + 2 * BLEED, compensateKerf: true });
    }
    for (const s of topSlots) {
      rects.push({ type: 'cut', x: O + s.start, y: O + cfg.depth - matT - BLEED, w: s.end - s.start, h: matT + 2 * BLEED, compensateKerf: true });
    }
    for (const s of sideSlots) {
      rects.push({ type: 'cut', x: O - BLEED, y: O + sideSlotOffset + s.start, w: matT + 2 * BLEED, h: s.end - s.start, compensateKerf: true });
    }
    for (const s of sideSlots) {
      rects.push({ type: 'cut', x: O + fbWidth - matT - BLEED, y: O + sideSlotOffset + s.start, w: matT + 2 * BLEED, h: s.end - s.start, compensateKerf: true });
    }

    const perimeter = rectPath(0, 0, rW, rH);
    const lines = [];
    addRoofMechRoomAndEquipment(plan, cfg, rects, lines, /*roofIsRecessed=*/false);

    return {
      id: 'roof',
      name: 'Roof (flat, ' + O + 'mm overhang)',
      material: 'core',
      bboxW: rW,
      bboxH: rH,
      bboxOffsetX: 0,
      bboxOffsetY: 0,
      paths: [{ type: 'cut', d: perimeter }, ...holePathsForList(cfg.roofHoles), ...skylightHolePaths(cfg.skylights)],
      rects: rects,
      lines: lines,
    };
  }

  window.generateFlatRoof = generateFlatRoofPatched;
  window.generateFlatOverhangRoof = generateFlatOverhangRoofPatched;
})();
