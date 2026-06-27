/* =====================================================================
   SHARED BLOCK SUPPLEMENTAL PART GENERATION
   ---------------------------------------------------------------------
   Main and wing generation used to append optional/detail parts through
   separate ad-hoc lists. That caused "works for main, missing with wings"
   bugs such as ridge caps not appearing in multi-block exports. This helper
   is now the single place that emits block-level supplemental parts.
   ===================================================================== */

export function addBlockSupplementalPartIdentity(parts, ctx) {
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

export function generateBlockSupplementalParts(ctx, partsSoFar, opts = {}) {
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
