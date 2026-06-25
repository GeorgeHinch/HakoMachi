'use strict';

/* =====================================================================
   WALL FEATURE ACCESSORS — CURRENT MODEL
   ===================================================================== */

function wallFeaturesForFace(cfg, face, opts = {}) {
  if (!cfg) return [];
  const wf = ensureWallFeatureMap(cfg);
  if (Array.isArray(wf[face])) {
    return opts.clone === false ? wf[face] : wf[face].map(cloneWallFeature);
  }
  return [];
}

function wallFaceIsManual(cfg, face) {
  // In wallFeatures, `null` means auto/live defaults. An array means the user
  // has taken manual control of that face. Importantly, an EMPTY array is a
  // valid manual state: "this wall intentionally has no manually placed
  // openings/items". Do not collapse it to null or the wall will regenerate
  // its default windows/doors after the last item is deleted.
  if (!cfg) return false;
  const wf = ensureWallFeatureMap(cfg);
  return Array.isArray(wf[face]);
}

function wallHasManualFeatures(cfg, face) {
  return wallFaceIsManual(cfg, face);
}

function structuralWallFeaturesForFace(cfg, face) {
  const base = wallFeaturesForFace(cfg, face)
    .filter(op => op && !WALL_FEATURE_SURFACE_TYPES.has(op.type));
  const railOps = embeddedRailBayOpsForFace(cfg, face);
  return railOps.length ? base.concat(railOps) : base;
}
