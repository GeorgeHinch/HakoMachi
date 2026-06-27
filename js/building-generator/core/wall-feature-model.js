/* =====================================================================
   UNIFIED WALL FEATURE MODEL
   ---------------------------------------------------------------------
   Transitional refactor layer. Older .hako files store wall objects across
   several parallel buckets:
     manualOpenings, manualAwnings, manualBalconies, manualFixtures,
     manualCladdingOverrides, manualPrintedItems

   The new runtime model exposes those as one per-face array:
     cfg.wallFeatures.front = [{ type:'window'|'door'|'fixture'|..., ... }]

   To keep backwards compatibility, helpers below always synchronize writes
   back into the legacy buckets. Existing code can move over gradually by
   reading `wallFeaturesForFace(...)` instead of each bucket directly.
   ===================================================================== */

export const WALL_FACE_KEYS = ['front', 'back', 'east', 'west'];
export const WALL_FEATURE_SURFACE_TYPES = new Set([
  'awning',
  'balcony',
  'fixture',
  'cladding_override',
  'printed_item',
]);

export function emptyWallFeatureMap(fill = null) {
  return { front: fill, back: fill, east: fill, west: fill };
}

export function ensureWallFeatureMap(cfg) {
  if (!cfg.wallFeatures) cfg.wallFeatures = emptyWallFeatureMap(null);
  for (const f of WALL_FACE_KEYS) {
    if (!(f in cfg.wallFeatures)) cfg.wallFeatures[f] = null;
  }
  return cfg.wallFeatures;
}

export function cloneWallFeature(op) {
  return op ? JSON.parse(JSON.stringify(op)) : op;
}
