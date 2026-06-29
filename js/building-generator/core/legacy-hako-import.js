/* =====================================================================
   LEGACY .HAKO IMPORT + HEALING BLOCK
   ---------------------------------------------------------------------
   REMOVE-LATER ISOLATION:
   Everything in this section exists only to support older .hako files and
   the older parallel manual* buckets:
     manualOpenings, manualAwnings, manualBalconies, manualFixtures,
     manualCladdingOverrides, manualPrintedItems

   Current code should use wallFeaturesForFace(...) and
   setWallFeaturesForFace(...). When legacy support is no longer needed,
   this block is the part to remove/replace with no-op migration.
   ===================================================================== */

export function roofStyleHasParapet(roofStyle) {
  return roofStyle === 'parapet' || roofStyle === 'parapet_gable';
}

export function effectiveParapetHeightFromConfig(cfg) {
  if (!cfg) return 0;
  const roofStyle = cfg.roofStyle || 'flat';
  return roofStyleHasParapet(roofStyle) ? Math.max(0, Number(cfg.parapetHeight) || 0) : 0;
}

export function configHeightIncludesParapet(cfg) {
  return !!(cfg && cfg.heightIncludesParapet);
}

export function wallBodyHeightFromConfig(cfg) {
  if (!cfg) return 1;
  const total = Math.max(1, Number(cfg.height) || 1);
  const p = effectiveParapetHeightFromConfig(cfg);
  return Math.max(1, total - p);
}

export function migrateHeightToIncludeParapet(cfg) {
  if (!cfg || typeof cfg !== 'object') return cfg;
  if (cfg.heightIncludesParapet === true) return cfg;
  const p = effectiveParapetHeightFromConfig(cfg);
  cfg.height = Math.max(1, Number(cfg.height) || 1) + p;
  cfg.heightIncludesParapet = true;
  return cfg;
}

export const LegacyHakoImportAndHealing = {
  readFaceFeatures(cfg, face) {
    const out = [];

    const openings = (cfg && cfg.manualOpenings) ? cfg.manualOpenings[face] : null;
    if (Array.isArray(openings)) {
      for (const op of openings) out.push(cloneWallFeature(op));
    }

    const awnings = ((cfg && cfg.manualAwnings) || {})[face] || [];
    for (const a of awnings) out.push({
      type: 'awning', x: a.x, y: a.y, w: a.w, h: (a.h != null ? a.h : a.d), d: a.d,
      style: a.style,
    });

    const balconies = ((cfg && cfg.manualBalconies) || {})[face] || [];
    for (const b of balconies) out.push({
      type: 'balcony', x: b.x, y: b.y, w: b.w, h: b.h, d: b.d,
      balconyType: b.balconyType,
    });

    const fixtures = ((cfg && cfg.manualFixtures) || {})[face] || [];
    for (const f of fixtures) out.push({
      type: 'fixture', x: f.x, y: f.y, w: f.w, h: f.h, style: f.style,
    });

    const overrides = ((cfg && cfg.manualCladdingOverrides) || {})[face] || [];
    for (const ov of overrides) out.push({
      type: 'cladding_override',
      x: ov.x, y: ov.y, w: ov.w, h: ov.h,
      claddingStyle: ov.claddingStyle,
      layered: !!ov.layered,
      styleParams: ov.styleParams ? { ...ov.styleParams } : undefined,
    });

    const printed = ((cfg && cfg.manualPrintedItems) || {})[face] || [];
    for (const p of printed) out.push({
      type: 'printed_item', x: p.x, y: p.y, w: p.w, h: p.h, style: p.style,
    });

    return out;
  },

  syncLegacyBuckets(cfg, face, features) {
    const ops = (features || []).map(cloneWallFeature);

    if (!cfg.manualOpenings) cfg.manualOpenings = emptyWallFeatureMap(null);
    if (!cfg.manualAwnings) cfg.manualAwnings = emptyWallFeatureMap([]);
    if (!cfg.manualBalconies) cfg.manualBalconies = emptyWallFeatureMap([]);
    if (!cfg.manualFixtures) cfg.manualFixtures = emptyWallFeatureMap([]);
    if (!cfg.manualCladdingOverrides) cfg.manualCladdingOverrides = emptyWallFeatureMap([]);
    if (!cfg.manualPrintedItems) cfg.manualPrintedItems = emptyWallFeatureMap([]);

    const structural = ops.filter(op => op && !WALL_FEATURE_SURFACE_TYPES.has(op.type));
    cfg.manualOpenings[face] = structural.length ? structural : null;

    cfg.manualAwnings[face] = ops
      .filter(op => op && op.type === 'awning')
      .map(op => ({ x: op.x, y: op.y, w: op.w, d: (op.d != null ? op.d : op.h), ...(op.style ? { style: op.style } : {}) }));

    cfg.manualBalconies[face] = ops
      .filter(op => op && op.type === 'balcony')
      .map(op => ({ x: op.x, y: op.y, w: op.w, h: op.h, d: op.d, balconyType: op.balconyType }));

    cfg.manualFixtures[face] = ops
      .filter(op => op && op.type === 'fixture')
      .map(op => ({ x: op.x, y: op.y, w: op.w, h: op.h, style: op.style }));

    cfg.manualCladdingOverrides[face] = ops
      .filter(op => op && op.type === 'cladding_override')
      .map(op => ({
        x: op.x, y: op.y, w: op.w, h: op.h,
        claddingStyle: op.claddingStyle,
        layered: !!op.layered,
        ...(op.styleParams ? { styleParams: { ...op.styleParams } } : {}),
      }));

    cfg.manualPrintedItems[face] = ops
      .filter(op => op && op.type === 'printed_item')
      .map(op => ({ x: op.x, y: op.y, w: op.w, h: op.h, style: op.style }));
  },

  healLinkedThroughBay(cfg) {
    if (!cfg || !cfg.wallFeatures) return;

    const front = Array.isArray(cfg.wallFeatures.front) ? cfg.wallFeatures.front : [];
    const back  = Array.isArray(cfg.wallFeatures.back)  ? cfg.wallFeatures.back  : [];
    const frontBay = front.find(op => op && op.type === 'bay' && op.style === 'through');
    const backBay  = back.find(op => op && op.type === 'bay' && op.style === 'through');

    // Legacy files can contain only the front half of a through-bay. Older
    // plan-generation code was defensive enough to cut the rear wall anyway,
    // but the editor/3D surface rendering reads the per-wall feature list, so
    // the rear half appeared missing or out of sync after the wallFeatures
    // migration. Heal that orphan here without touching non-bay features.
    const makePartner = src => ({
      type: 'bay',
      x: src.x, y: src.y,
      w: src.w, h: src.h,
      style: 'through',
      doorStyle: src.doorStyle || 'none',
      doorPercentOpen: src.doorPercentOpen || 0,
    });

    if (frontBay && !backBay) {
      cfg.wallFeatures.back = [...back.filter(op => !(op && op.type === 'bay')), makePartner(frontBay)];
    } else if (backBay && !frontBay) {
      cfg.wallFeatures.front = [...front.filter(op => !(op && op.type === 'bay')), makePartner(backBay)];
    } else if (frontBay && backBay) {
      // Front is canonical for through-bay dimensions/position. Keep both
      // halves in lock-step on load, but preserve other front/back items.
      Object.assign(backBay, makePartner(frontBay));
    }
  },

  migrate(cfg) {
    if (!cfg) return cfg;
    ensureWallFeatureMap(cfg);

    for (const face of WALL_FACE_KEYS) {
      if (!Array.isArray(cfg.wallFeatures[face])) {
        const legacy = this.readFaceFeatures(cfg, face);
        if (legacy.length) cfg.wallFeatures[face] = legacy;
      }
    }

    this.healLinkedThroughBay(cfg);

    for (const face of WALL_FACE_KEYS) {
      if (Array.isArray(cfg.wallFeatures[face])) {
        this.syncLegacyBuckets(cfg, face, cfg.wallFeatures[face]);
      }
    }
    return cfg;
  },
};

// Compatibility names used by the rest of the app. These are intentionally
// thin wrappers so the whole legacy block can be removed later in one place.
export function legacyWallFeaturesForFace(cfg, face) {
  return LegacyHakoImportAndHealing.readFaceFeatures(cfg, face);
}

export function syncLegacyWallFeatureBuckets(cfg, face, features) {
  // No-op by design. The app now uses wallFeatures as the only write path.
  // Legacy manual* buckets are consumed once on import/load and are not kept
  // in sync going forward.
}

export function repairLinkedThroughBayFeatures(cfg) {
  return LegacyHakoImportAndHealing.healLinkedThroughBay(cfg);
}

export function stripLegacyWallBuckets(cfg) {
  if (!cfg || typeof cfg !== 'object') return cfg;
  delete cfg.manualOpenings;
  delete cfg.manualAwnings;
  delete cfg.manualBalconies;
  delete cfg.manualFixtures;
  delete cfg.manualCladdingOverrides;
  delete cfg.manualPrintedItems;
  return cfg;
}

export function convertLegacyWallBucketsToWallFeaturesOnce(cfg) {
  if (!cfg || typeof cfg !== 'object') return cfg;
  ensureWallFeatureMap(cfg);

  for (const face of WALL_FACE_KEYS) {
    if (!Array.isArray(cfg.wallFeatures[face])) {
      const legacy = LegacyHakoImportAndHealing.readFaceFeatures(cfg, face);
      cfg.wallFeatures[face] = legacy.length ? legacy : null;
    }
  }

  LegacyHakoImportAndHealing.healLinkedThroughBay(cfg);
  stripLegacyWallBuckets(cfg);
  cfg.storageVersion = Math.max(Number(cfg.storageVersion) || 0, 2);
  return cfg;
}

export function ensurePrintedMaterialDefinition(cfg) {
  if (!cfg || !Array.isArray(cfg.materials)) return;
  if (cfg.materials.some(m => m && m.id === 'printed')) return;
  cfg.materials.push({
    id: 'printed',
    name: 'Printed Paper',
    thickness: 0.20,
    colour: '#f1df72',
    maxWidthMm: 304.8,
    maxHeightMm: 304.8,
    sizeUnit: 'mm',
  });
}

export function upgradeConfigToCurrentStorage(cfg) {
  if (!cfg || typeof cfg !== 'object') return cfg;
  migrateHeightToIncludeParapet(cfg);
  normalizeSegmentedWallExposureZones(cfg);
  convertLegacyWallBucketsToWallFeaturesOnce(cfg);
  ensurePrintedMaterialDefinition(cfg);
  for (const wing of (cfg.wings || [])) {
    convertLegacyWallBucketsToWallFeaturesOnce(wing);
  }
  return cfg;
}

export function migrateLegacyWallFeatures(cfg) {
  // Transitional name retained for old call sites. It now performs a one-time
  // conversion into wallFeatures and removes legacy manual* buckets instead of
  // keeping both stores synchronized.
  return upgradeConfigToCurrentStorage(cfg);
}

export function serializableCurrentConfig(cfg) {
  const copy = JSON.parse(JSON.stringify(cfg || {}));
  upgradeConfigToCurrentStorage(copy);
  stripLegacyWallBuckets(copy);
  for (const wing of (copy.wings || [])) stripLegacyWallBuckets(wing);
  copy.storageVersion = Math.max(Number(copy.storageVersion) || 0, 2);
  return copy;
}
