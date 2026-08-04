/* =====================================================================
   WALL FEATURE ACCESSORS — CURRENT MODEL
   ===================================================================== */

import { wallBodyHeightFromConfig } from './legacy-hako-import.js?v=hm-assets-20260804-9';
import { embeddedRailOrientation, embeddedRailProfile, embeddedRailsForCfg } from './layout-cut-geometry.js?v=hm-assets-20260804-9';

export function wallFeaturesForFace(cfg, face, opts = {}) {
  if (!cfg) return [];
  const wf = ensureWallFeatureMap(cfg);
  if (Array.isArray(wf[face])) {
    return opts.clone === false ? wf[face] : wf[face].map(cloneWallFeature);
  }
  return [];
}

export function wallFaceIsManual(cfg, face) {
  // In wallFeatures, `null` means auto/live defaults. An array means the user
  // has taken manual control of that face. Importantly, an EMPTY array is a
  // valid manual state: "this wall intentionally has no manually placed
  // openings/items". Do not collapse it to null or the wall will regenerate
  // its default windows/doors after the last item is deleted.
  if (!cfg) return false;
  const wf = ensureWallFeatureMap(cfg);
  return Array.isArray(wf[face]);
}

export function wallHasManualFeatures(cfg, face) {
  return wallFaceIsManual(cfg, face);
}

export function structuralWallFeaturesForFace(cfg, face) {
  const base = wallFeaturesForFace(cfg, face)
    .filter(op => op && !WALL_FEATURE_SURFACE_TYPES.has(op.type));
  const railOps = embeddedRailBayOpsForFace(cfg, face);
  return railOps.length ? base.concat(railOps) : base;
}

export function surfaceWallFeaturesForFace(cfg, face, type) {
  return wallFeaturesForFace(cfg, face).filter(op => op && op.type === type);
}

export function embeddedRailBayWallWidthForFace(cfg, face) {
  const matT = (cfg && cfg.coreThickness) || 1.5;
  if (face === 'east' || face === 'west') return Math.max(0, ((cfg && cfg.depth) || 80) - 2 * matT);
  return (cfg && cfg.width) || 80;
}

export function embeddedRailSvgMirrorsFace(face) {
  return false;
}

export function embeddedRailPhysicalXToWallLocal(cfg, face, x, w) {
  const wallW = embeddedRailBayWallWidthForFace(cfg, face);
  if (embeddedRailSvgMirrorsFace(face)) return Math.max(0, Math.min(wallW - w, wallW - x - w));
  return Math.max(0, Math.min(wallW - w, x));
}

export function embeddedRailWallLocalXToPhysical(cfg, face, x, w) {
  const wallW = embeddedRailBayWallWidthForFace(cfg, face);
  if (embeddedRailSvgMirrorsFace(face)) return Math.max(0, Math.min(wallW - w, wallW - x - w));
  return Math.max(0, Math.min(wallW - w, x));
}

export function embeddedRailBayOpsForFace(cfg, face, opts = {}) {
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
    let x = 0;
    let through = false;
    let hit = false;
    if (o === 'ns') {
      const trackXInterior = z.x + z.w / 2 + (z.trackOffset || 0);
      x = Math.max(0, Math.min((cfg.width || bcW) - bayW, matT + trackXInterior - bayW / 2));
      const touchesFront = z.y <= 0.5;
      const touchesBack  = z.y + z.h >= bcH - 0.5;
      through = touchesFront && touchesBack;
      hit = (face === 'front' && touchesFront) || (face === 'back' && touchesBack);
    } else {
      const trackYInterior = z.y + z.h / 2 + (z.trackOffset || 0);
      x = Math.max(0, Math.min((cfg.depth || bcH) - bayW, matT + trackYInterior - bayW / 2));
      const touchesWest = z.x <= 0.5;
      const touchesEast = z.x + z.w >= bcW - 0.5;
      through = touchesWest && touchesEast;
      hit = (face === 'west' && touchesWest) || (face === 'east' && touchesEast);
    }
    if (hit) {
      const wallLocalX = coordSpace === 'physical' ? x : embeddedRailPhysicalXToWallLocal(cfg, face, x, bayW);
      ops.push({
        type: 'bay',
        style: through ? 'through' : 'side',
        x: wallLocalX,
        y: Math.max(0, H - bayH),
        w: bayW,
        h: Math.min(bayH, H),
        doorStyle: 'none',
        doorPercentOpen: 0,
        _embeddedRail: true,
        _embeddedRailIndex: railIdx,
        _embeddedRailFace: face,
        _embeddedRailCoordSpace: coordSpace,
      });
    }
  }
  return ops;
}

export function findBayOnFace(cfg, face) {
  return structuralWallFeaturesForFace(cfg, face).find(op => op && op.type === 'bay') || null;
}

export function manualStructuralOps(cfg, face) {
  if (!cfg) return null;
  const wf = ensureWallFeatureMap(cfg);
  if (Array.isArray(wf[face])) {
    return wf[face].filter(op => op && (op.type === 'window' || op.type === 'door' || op.type === 'bay'));
  }
  return null;
}

export function resolveBay(cfg, fbWidth) {
  const frontBay = findBayOnFace(cfg, 'front');
  const backBay  = findBayOnFace(cfg, 'back');
  const frontThrough = !!(frontBay && frontBay.style === 'through');
  const backThrough  = !!(backBay  && backBay.style  === 'through');
  const hasFrontBay = !!frontBay || backThrough;
  const hasBackBay  = !!backBay  || frontThrough;

  if (!hasFrontBay && !hasBackBay) {
    return {
      hasFrontBay: false,
      hasBackBay: false,
      bayXStart: 0,
      bayXEnd: 0,
      bayWidth: 0,
      bayHeight: 0,
    };
  }

  const src = frontBay || backBay;
  const bayWidth  = src.w;
  const bayHeight = src.h;
  const bayXStart = src.x;
  const bayXEnd   = bayXStart + bayWidth;
  const bayIsThrough = frontThrough || backThrough;
  const frontBayXStart = frontBay ? frontBay.x : bayXStart;
  const frontBayXEnd   = frontBay ? frontBay.x + frontBay.w : bayXEnd;
  const backBayXStart  = backBay  ? backBay.x  : bayXStart;
  const backBayXEnd    = backBay  ? backBay.x + backBay.w : bayXEnd;

  return {
    hasFrontBay,
    hasBackBay,
    bayXStart,
    bayXEnd,
    bayWidth,
    bayHeight,
    bayIsThrough,
    frontBayXStart,
    frontBayXEnd,
    backBayXStart,
    backBayXEnd,
  };
}

export function planBayXFor(plan, which) {
  if (which === 'front' && Number.isFinite(plan.frontBayXStart) && Number.isFinite(plan.frontBayXEnd)) {
    return { bayXStart: plan.frontBayXStart, bayXEnd: plan.frontBayXEnd };
  }
  if (which === 'back' && Number.isFinite(plan.backBayXStart) && Number.isFinite(plan.backBayXEnd)) {
    return { bayXStart: plan.backBayXStart, bayXEnd: plan.backBayXEnd };
  }
  return { bayXStart: plan.bayXStart, bayXEnd: plan.bayXEnd };
}
