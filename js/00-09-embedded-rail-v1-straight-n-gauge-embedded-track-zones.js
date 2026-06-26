'use strict';

/* =====================================================================
   EMBEDDED RAIL V1 — straight N-gauge embedded track zones
   ---------------------------------------------------------------------
   This feature is intentionally modelled as a floor-zone recipe rather than
   as generic objects that slot through the floor. Trusses/supports remain
   etch-only. The existing hole feature remains the only ordinary through-cut;
   holes are blocked from rail safety zones and, when valid, cut all generated
   rail stack layers.
   ===================================================================== */
const EMBEDDED_RAIL_DEFAULT_PROFILE = {
  label: 'N gauge Code 80 starter profile',
  gaugeInsideRailsMm: 9.0,
  railCode: 80,
  railHeightMm: 2.03,
  totalTrackHeightMm: 3.0,
  sleeperWidthMm: 16.0,
  outsideRailWidthMm: 10.8,
  betweenRailsInsertWidthMm: 7.2,
  flangeSideClearanceMm: 0.9,
  safetyMarginMm: 2.0,
  bayOpeningWidthMm: 27,
  bayOpeningHeightMm: 45,
};
function embeddedRailProfile(z) {
  return { ...EMBEDDED_RAIL_DEFAULT_PROFILE, ...((z && z.trackProfile) || {}) };
}
function embeddedRailsForCfg(cfg) {
  return (cfg && Array.isArray(cfg.embeddedRails)) ? cfg.embeddedRails.filter(z => z && z.w > 1 && z.h > 1) : [];
}
function embeddedRailOrientation(z) {
  // 'auto' keeps the editor simple: the rail runs along the rectangle's long axis.
  // Users can override the direction from the floor-editor top bar when needed.
  const raw = z && z.orientation;
  if (raw === 'ns' || raw === 'ew') return raw;
  return ((z && Number(z.w) || 0) >= ((z && Number(z.h)) || 0)) ? 'ew' : 'ns';
}
function embeddedRailOrientationLabel(z) {
  const eff = embeddedRailOrientation(z);
  const raw = (z && z.orientation) || 'auto';
  if (raw === 'auto' || raw == null) return `Auto ${eff.toUpperCase()}`;
  return eff.toUpperCase();
}
function embeddedRailSafetyRect(z) {
  const pr = embeddedRailProfile(z);
  const o = embeddedRailOrientation(z);
  const margin = pr.safetyMarginMm || 2;
  if (o === 'ew') {
    const cy = z.y + z.h / 2 + (z.trackOffset || 0);
    const band = pr.sleeperWidthMm + 2 * margin;
    return { x: z.x, y: cy - band / 2, w: z.w, h: band };
  }
  const cx = z.x + z.w / 2 + (z.trackOffset || 0);
  const band = pr.sleeperWidthMm + 2 * margin;
  return { x: cx - band / 2, y: z.y, w: band, h: z.h };
}
function rectsOverlap(a, b, pad = 0) {
  return !!(a && b && a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y);
}
function floorHoleBBox(h) {
  if (!h) return null;
  if (h.shape === 'circle') {
    const d = h.d || 3;
    return { x: h.x - d / 2, y: h.y - d / 2, w: d, h: d };
  }
  return { x: h.x - (h.w || 5) / 2, y: h.y - (h.h || 5) / 2, w: h.w || 5, h: h.h || 5 };
}
function floorHoleOverlapsEmbeddedRailSafety(h, cfg) {
  const hb = floorHoleBBox(h);
  return embeddedRailsForCfg(cfg).some(z => rectsOverlap(hb, embeddedRailSafetyRect(z), 0));
}
function embeddedRailValidationWarnings(cfg) {
  const out = [];
  const rails = embeddedRailsForCfg(cfg);
  if (!rails.length) return out;
  const matT = cfg.coreThickness || 1.5;
  const bcW = (cfg.width || 80) - 2 * matT;
  const bcH = (cfg.depth || 80) - 2 * matT;
  rails.forEach((z, i) => {
    const label = `Embedded rail #${i + 1}`;
        if (z.x < -0.01 || z.y < -0.01 || z.x + z.w > bcW + 0.01 || z.y + z.h > bcH + 0.01) {
      out.push(`${label}: zone extends outside the interior floor footprint.`);
    }
    const sr = embeddedRailSafetyRect(z);
    for (const h of (cfg.floorHoles || [])) {
      if (rectsOverlap(floorHoleBBox(h), sr, 0)) {
        out.push(`${label}: a floor hole overlaps the protected track safety zone and will be skipped for placement/export safety.`);
        break;
      }
    }
  });
  return out;
}
function embeddedRailBayWallWidthForFace(cfg, face) {
  const matT = (cfg && cfg.coreThickness) || 1.5;
  if (face === 'east' || face === 'west') return Math.max(0, ((cfg && cfg.depth) || 80) - 2 * matT);
  return (cfg && cfg.width) || 80;
}
function embeddedRailSvgMirrorsFace(face) {
  // Rail-generated bay openings use the same floor-plan physical coordinate
  // in the SVG/export wall sheets. The floor editor and 3D preview are the
  // source of truth for rail centerline position; mirroring here made the
  // SVG bay holes appear on the opposite side from both. Any required visual
  // face mirroring is handled by the wall/SVG renderer itself, not by the
  // embedded-rail bay generator.
  return false;
}
function embeddedRailPhysicalXToWallLocal(cfg, face, x, w) {
  const wallW = embeddedRailBayWallWidthForFace(cfg, face);
  if (embeddedRailSvgMirrorsFace(face)) return Math.max(0, Math.min(wallW - w, wallW - x - w));
  return Math.max(0, Math.min(wallW - w, x));
}
function embeddedRailWallLocalXToPhysical(cfg, face, x, w) {
  const wallW = embeddedRailBayWallWidthForFace(cfg, face);
  if (embeddedRailSvgMirrorsFace(face)) return Math.max(0, Math.min(wallW - w, wallW - x - w));
  return Math.max(0, Math.min(wallW - w, x));
}
function embeddedRailBayOpsForFace(cfg, face, opts = {}) {
  const rails = embeddedRailsForCfg(cfg);
  if (!rails.length) return [];
  const H = wallBodyHeightFromConfig(cfg) || 60;
  const matT = cfg.coreThickness || 1.5;
  const bcW = (cfg.width || 80) - 2 * matT;
  const bcH = (cfg.depth || 80) - 2 * matT;
  const coordSpace = opts.coordSpace || opts.space || 'svg';
  const ops = [];
  for (let railIdx = 0; railIdx < rails.length; railIdx++) {
    const z = rails[railIdx];
    const o = embeddedRailOrientation(z);
    const pr = embeddedRailProfile(z);
    const bayW = pr.bayOpeningWidthMm || 27;
    const bayH = pr.bayOpeningHeightMm || 45;
    let x = 0, through = false, hit = false;
    if (o === 'ns') {
      const trackXInterior = z.x + z.w / 2 + (z.trackOffset || 0);
      // Physical coordinate: model west-to-east, matching the floor editor.
      x = Math.max(0, Math.min((cfg.width || bcW) - bayW, matT + trackXInterior - bayW / 2));
      const touchesFront = z.y <= 0.5;
      const touchesBack  = z.y + z.h >= bcH - 0.5;
      through = touchesFront && touchesBack;
      hit = (face === 'front' && touchesFront) || (face === 'back' && touchesBack);
    } else {
      // Physical coordinate along the side wall's depth axis.
      const trackYInterior = z.y + z.h / 2 + (z.trackOffset || 0);
      x = Math.max(0, Math.min((cfg.depth || bcH) - bayW, matT + trackYInterior - bayW / 2));
      const touchesWest = z.x <= 0.5;
      const touchesEast = z.x + z.w >= bcW - 0.5;
      through = touchesWest && touchesEast;
      hit = (face === 'west' && touchesWest) || (face === 'east' && touchesEast);
    }
    if (hit) {
      const wallLocalX = (coordSpace === 'physical') ? x : embeddedRailPhysicalXToWallLocal(cfg, face, x, bayW);
      ops.push({
        type: 'bay', style: through ? 'through' : 'side',
        x: wallLocalX, y: Math.max(0, H - bayH), w: bayW, h: Math.min(bayH, H),
        doorStyle: 'none', doorPercentOpen: 0,
        _embeddedRail: true,
        _embeddedRailIndex: railIdx,
        _embeddedRailFace: face,
        _embeddedRailCoordSpace: coordSpace,
      });
    }
  }
  return ops;
}
