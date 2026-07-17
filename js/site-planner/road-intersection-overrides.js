const OVERRIDE_SCHEMA_VERSION = 1;

const DEFAULT_INTERSECTION_OVERRIDE = Object.freeze({
  enabled: true,
  label: '',
  intersectionType: 'auto',
  mergeMode: 'auto',
  laneBreakMode: 'auto',
  manualOverride: false,
  locked: false,
  crosswalksEnabled: true,
  stopBarsEnabled: true,
  tactilePaversEnabled: true,
  curbGuidesEnabled: true,
  curbRadiusPx: null,
  sidewalkBulbRadiusPx: null,
  crosswalkOffsetPx: null,
  stopBarOffsetPx: null,
  notes: '',
});

const DEFAULT_ARM_OVERRIDE = Object.freeze({
  enabled: true,
  crosswalkEnabled: true,
  stopBarEnabled: true,
  tactilePaversEnabled: true,
  curbGuideEnabled: true,
  disabledFeatureKeys: [],
  crosswalkOffsetPx: null,
  stopBarOffsetPx: null,
  tactileOffsetPx: null,
  notes: '',
});

function stableNumber(value, precision = 1) {
  const number = Number(value) || 0;
  return Number(number.toFixed(precision)).toString().replace(/\./g, '_').replace(/-/g, 'n');
}

function cleanText(value) {
  return String(value || '').trim().slice(0, 240);
}

function cleanKey(value) {
  return String(value || '').trim().slice(0, 180);
}

function cleanKeyList(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(cleanKey).filter(Boolean))];
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function bool(value, fallback = true) {
  return typeof value === 'boolean' ? value : fallback;
}

function option(value, allowed, fallback = 'auto') {
  const clean = cleanKey(value);
  return allowed.includes(clean) ? clean : fallback;
}

export function roadArmKey(arm) {
  if (!arm) return '';
  return [arm.roadId || 'road', arm.endpoint || 'arm'].join(':');
}

export function intersectionFeatureKey(type, feature = {}, index = 0) {
  const featureType = cleanKey(type || feature.kind || feature.type || 'feature');
  const roadId = cleanKey(feature.roadId || feature.fromRoadId || 'road');
  const endpoint = cleanKey(feature.endpoint || feature.fromEndpoint || 'arm');
  let suffix = '';
  if (featureType === 'stopBar') suffix = cleanKey(feature.laneSide || feature.laneScope || index);
  else if (featureType === 'tactilePaver') suffix = cleanKey(feature.side || feature.sideSign || index);
  else if (featureType === 'curbGuide') suffix = cleanKey(`${feature.toRoadId || 'next'}:${feature.toEndpoint || index}`);
  else suffix = cleanKey(index);
  return [featureType, roadId, endpoint, suffix].filter(Boolean).join(':');
}

export function intersectionSignature(intersection) {
  if (!intersection) return '';
  const armKeys = (intersection.arms || []).map(roadArmKey).sort().join('|');
  return [intersection.type || 'intersection', armKeys].filter(Boolean).join('::');
}

export function intersectionOverrideKey(intersection) {
  if (!intersection) return '';
  const signature = intersectionSignature(intersection);
  if (signature) return signature;
  const center = intersection.center || intersection;
  return `${intersection.type || 'intersection'}::${stableNumber(center.x)}:${stableNumber(center.y)}`;
}

export function normalizeIntersectionOverride(override = {}) {
  return {
    schemaVersion: OVERRIDE_SCHEMA_VERSION,
    key: String(override.key || ''),
    enabled: bool(override.enabled, DEFAULT_INTERSECTION_OVERRIDE.enabled),
    label: cleanText(override.label || override.name),
    intersectionType: option(override.intersectionType || override.type, ['auto', 'corner', 't-junction', 'cross-junction', 'multi-junction', 'straight-join', 'service', 'driveway']),
    mergeMode: option(override.mergeMode, ['auto', 'blend', 'miter', 'keep-arms']),
    laneBreakMode: option(override.laneBreakMode, ['auto', 'continuous', 'break-at-node']),
    manualOverride: bool(override.manualOverride, DEFAULT_INTERSECTION_OVERRIDE.manualOverride),
    locked: bool(override.locked, DEFAULT_INTERSECTION_OVERRIDE.locked),
    crosswalksEnabled: bool(override.crosswalksEnabled, DEFAULT_INTERSECTION_OVERRIDE.crosswalksEnabled),
    stopBarsEnabled: bool(override.stopBarsEnabled, DEFAULT_INTERSECTION_OVERRIDE.stopBarsEnabled),
    tactilePaversEnabled: bool(override.tactilePaversEnabled, DEFAULT_INTERSECTION_OVERRIDE.tactilePaversEnabled),
    curbGuidesEnabled: bool(override.curbGuidesEnabled, DEFAULT_INTERSECTION_OVERRIDE.curbGuidesEnabled),
    curbRadiusPx: finiteOrNull(override.curbRadiusPx),
    sidewalkBulbRadiusPx: finiteOrNull(override.sidewalkBulbRadiusPx),
    crosswalkOffsetPx: finiteOrNull(override.crosswalkOffsetPx),
    stopBarOffsetPx: finiteOrNull(override.stopBarOffsetPx),
    notes: cleanText(override.notes),
    arms: normalizeArmOverrides(override.arms),
  };
}

export function normalizeArmOverride(override = {}) {
  return {
    key: String(override.key || ''),
    enabled: bool(override.enabled, DEFAULT_ARM_OVERRIDE.enabled),
    crosswalkEnabled: bool(override.crosswalkEnabled, DEFAULT_ARM_OVERRIDE.crosswalkEnabled),
    stopBarEnabled: bool(override.stopBarEnabled, DEFAULT_ARM_OVERRIDE.stopBarEnabled),
    tactilePaversEnabled: bool(override.tactilePaversEnabled, DEFAULT_ARM_OVERRIDE.tactilePaversEnabled),
    curbGuideEnabled: bool(override.curbGuideEnabled, DEFAULT_ARM_OVERRIDE.curbGuideEnabled),
    disabledFeatureKeys: cleanKeyList(override.disabledFeatureKeys || override.disabledFeatures),
    crosswalkOffsetPx: finiteOrNull(override.crosswalkOffsetPx),
    stopBarOffsetPx: finiteOrNull(override.stopBarOffsetPx),
    tactileOffsetPx: finiteOrNull(override.tactileOffsetPx),
    notes: cleanText(override.notes),
  };
}

export function normalizeArmOverrides(overrides = {}) {
  if (Array.isArray(overrides)) {
    return overrides.reduce((map, override) => {
      const normalized = normalizeArmOverride(override);
      if (normalized.key) map[normalized.key] = normalized;
      return map;
    }, {});
  }
  return Object.entries(overrides || {}).reduce((map, [key, override]) => {
    const normalized = normalizeArmOverride({ ...override, key: override?.key || key });
    if (normalized.key) map[normalized.key] = normalized;
    return map;
  }, {});
}

export function normalizeIntersectionOverrideMap(overrides = {}) {
  if (Array.isArray(overrides)) {
    return overrides.reduce((map, override) => {
      const normalized = normalizeIntersectionOverride(override);
      if (normalized.key) map[normalized.key] = normalized;
      return map;
    }, {});
  }
  return Object.entries(overrides || {}).reduce((map, [key, override]) => {
    const normalized = normalizeIntersectionOverride({ ...override, key: override?.key || key });
    if (normalized.key) map[normalized.key] = normalized;
    return map;
  }, {});
}

export function createDefaultIntersectionOverride(intersection) {
  return normalizeIntersectionOverride({
    ...DEFAULT_INTERSECTION_OVERRIDE,
    key: intersectionOverrideKey(intersection),
  });
}

export function createDefaultArmOverride(arm) {
  return normalizeArmOverride({
    ...DEFAULT_ARM_OVERRIDE,
    key: roadArmKey(arm),
  });
}

function withOverrideOffsets(feature, armOverride, intersectionOverride) {
  if (!feature) return feature;
  const next = { ...feature };
  if (feature.kind === 'crosswalk' || feature.stripes) {
    next.offsetPx = armOverride?.crosswalkOffsetPx ?? intersectionOverride?.crosswalkOffsetPx ?? feature.offsetPx ?? null;
  }
  if (feature.kind === 'stopBar' || feature.corners) {
    next.offsetPx = armOverride?.stopBarOffsetPx ?? intersectionOverride?.stopBarOffsetPx ?? feature.offsetPx ?? null;
  }
  return next;
}

function armOverrideFor(intersectionOverride, roadId, endpoint) {
  if (!intersectionOverride) return null;
  const exact = `${roadId}:${endpoint}`;
  if (intersectionOverride.arms?.[exact]) return intersectionOverride.arms[exact];
  const roadWide = Object.values(intersectionOverride.arms || {}).find(override => override.key?.startsWith(`${roadId}:`));
  return roadWide || null;
}

function featureDisabled(armOverride, type, feature, index) {
  if (!armOverride) return false;
  const key = feature.featureKey || intersectionFeatureKey(type, feature, index);
  return (armOverride.disabledFeatureKeys || []).includes(key);
}

function withFeatureKey(feature, type, index) {
  const next = { ...feature, kind: feature.kind || type };
  next.featureKey = intersectionFeatureKey(type, next, index);
  return next;
}

export function applyIntersectionOverride(intersection, overrides = {}) {
  if (!intersection) return intersection;
  const overrideMap = normalizeIntersectionOverrideMap(overrides);
  const key = intersectionOverrideKey(intersection);
  const override = overrideMap[key];
  if (!override) return { ...intersection, overrideKey: key, override: null };
  if (!override.enabled) {
    return {
      ...intersection,
      overrideKey: key,
      override,
      label: override.label || intersection.label || '',
      displayType: override.intersectionType !== 'auto' ? override.intersectionType : intersection.type,
      mergeMode: override.mergeMode,
      laneBreakMode: override.laneBreakMode,
      manualOverride: override.manualOverride,
      locked: override.locked,
      disabled: true,
      curbReturns: [],
      crosswalks: [],
      stopBars: [],
      tactilePavers: [],
    };
  }
  const next = {
    ...intersection,
    overrideKey: key,
    override,
    label: override.label || intersection.label || '',
    displayType: override.intersectionType !== 'auto' ? override.intersectionType : intersection.type,
    mergeMode: override.mergeMode,
    laneBreakMode: override.laneBreakMode,
    manualOverride: override.manualOverride,
    locked: override.locked,
    curbRadiusPx: override.curbRadiusPx ?? intersection.curbRadiusPx,
    sidewalkBulbRadiusPx: override.sidewalkBulbRadiusPx ?? intersection.sidewalkBulbRadiusPx,
  };
  next.crosswalks = override.crosswalksEnabled
    ? (intersection.crosswalks || []).map((feature, index) => withFeatureKey(feature, 'crosswalk', index)).filter((feature, index) => {
        const armOverride = armOverrideFor(override, feature.roadId, feature.endpoint);
        return armOverride?.enabled !== false && armOverride?.crosswalkEnabled !== false && !featureDisabled(armOverride, 'crosswalk', feature, index);
      }).map(feature => withOverrideOffsets({ ...feature, kind: 'crosswalk' }, armOverrideFor(override, feature.roadId, feature.endpoint), override))
    : [];
  next.stopBars = override.stopBarsEnabled
    ? (intersection.stopBars || []).map((feature, index) => withFeatureKey(feature, 'stopBar', index)).filter((feature, index) => {
        const armOverride = armOverrideFor(override, feature.roadId, feature.endpoint);
        return armOverride?.enabled !== false && armOverride?.stopBarEnabled !== false && !featureDisabled(armOverride, 'stopBar', feature, index);
      }).map(feature => withOverrideOffsets({ ...feature, kind: 'stopBar' }, armOverrideFor(override, feature.roadId, feature.endpoint), override))
    : [];
  next.tactilePavers = override.tactilePaversEnabled
    ? (intersection.tactilePavers || []).map((feature, index) => withFeatureKey(feature, 'tactilePaver', index)).filter((feature, index) => {
        const armOverride = armOverrideFor(override, feature.roadId, feature.endpoint);
        return armOverride?.enabled !== false && armOverride?.tactilePaversEnabled !== false && !featureDisabled(armOverride, 'tactilePaver', feature, index);
      })
    : [];
  next.curbReturns = override.curbGuidesEnabled
    ? (intersection.curbReturns || []).map((feature, index) => withFeatureKey(feature, 'curbGuide', index)).filter((feature, index) => {
        const armOverride = armOverrideFor(override, feature.fromRoadId, feature.fromEndpoint);
        return armOverride?.enabled !== false && armOverride?.curbGuideEnabled !== false && !featureDisabled(armOverride, 'curbGuide', feature, index);
      })
    : [];
  return next;
}

export function applyIntersectionOverrides(intersections = [], overrides = {}) {
  const overrideMap = normalizeIntersectionOverrideMap(overrides);
  return (intersections || []).map(intersection => applyIntersectionOverride(intersection, overrideMap));
}

export function upsertIntersectionOverride(overrides = {}, intersection, patch = {}) {
  const map = normalizeIntersectionOverrideMap(overrides);
  const key = intersectionOverrideKey(intersection);
  const current = map[key] || createDefaultIntersectionOverride(intersection);
  map[key] = normalizeIntersectionOverride({ ...current, ...patch, key });
  return map;
}

export function upsertArmOverride(overrides = {}, intersection, arm, patch = {}) {
  const map = normalizeIntersectionOverrideMap(overrides);
  const intersectionKey = intersectionOverrideKey(intersection);
  const currentIntersection = map[intersectionKey] || createDefaultIntersectionOverride(intersection);
  const armKey = roadArmKey(arm);
  const currentArm = currentIntersection.arms?.[armKey] || createDefaultArmOverride(arm);
  map[intersectionKey] = normalizeIntersectionOverride({
    ...currentIntersection,
    arms: {
      ...(currentIntersection.arms || {}),
      [armKey]: normalizeArmOverride({ ...currentArm, ...patch, key: armKey }),
    },
  });
  return map;
}

export function setArmFeatureOverride(overrides = {}, intersectionOrKey, armOrKey, featureKey, enabled = true) {
  const key = cleanKey(featureKey);
  if (!key) return normalizeIntersectionOverrideMap(overrides);
  const map = normalizeIntersectionOverrideMap(overrides);
  const intersectionKey = typeof intersectionOrKey === 'string' ? intersectionOrKey : intersectionOverrideKey(intersectionOrKey);
  const armKey = typeof armOrKey === 'string' ? armOrKey : roadArmKey(armOrKey);
  const currentIntersection = map[intersectionKey] || normalizeIntersectionOverride({ ...DEFAULT_INTERSECTION_OVERRIDE, key: intersectionKey });
  const currentArm = currentIntersection.arms?.[armKey] || normalizeArmOverride({ ...DEFAULT_ARM_OVERRIDE, key: armKey });
  const disabled = new Set(currentArm.disabledFeatureKeys || []);
  if (enabled) disabled.delete(key);
  else disabled.add(key);
  map[intersectionKey] = normalizeIntersectionOverride({
    ...currentIntersection,
    arms: {
      ...(currentIntersection.arms || {}),
      [armKey]: normalizeArmOverride({ ...currentArm, disabledFeatureKeys: [...disabled], key: armKey }),
    },
  });
  return map;
}

export function removeIntersectionOverride(overrides = {}, intersectionOrKey) {
  const map = normalizeIntersectionOverrideMap(overrides);
  const key = typeof intersectionOrKey === 'string' ? intersectionOrKey : intersectionOverrideKey(intersectionOrKey);
  delete map[key];
  return map;
}

export function removeArmOverride(overrides = {}, intersectionOrKey, armOrKey) {
  const map = normalizeIntersectionOverrideMap(overrides);
  const intersectionKey = typeof intersectionOrKey === 'string' ? intersectionOrKey : intersectionOverrideKey(intersectionOrKey);
  const armKey = typeof armOrKey === 'string' ? armOrKey : roadArmKey(armOrKey);
  if (!map[intersectionKey]) return map;
  const arms = { ...(map[intersectionKey].arms || {}) };
  delete arms[armKey];
  map[intersectionKey] = normalizeIntersectionOverride({ ...map[intersectionKey], arms });
  return map;
}

export function pruneStaleIntersectionOverrides(overrides = {}, intersections = []) {
  const map = normalizeIntersectionOverrideMap(overrides);
  const validIntersectionKeys = new Set((intersections || []).map(intersectionOverrideKey));
  const pruned = {};
  (intersections || []).forEach(intersection => {
    const key = intersectionOverrideKey(intersection);
    const override = map[key];
    if (!override || !validIntersectionKeys.has(key)) return;
    const validArmKeys = new Set((intersection.arms || []).map(roadArmKey));
    const arms = Object.entries(override.arms || {}).reduce((armMap, [armKey, armOverride]) => {
      if (validArmKeys.has(armKey)) armMap[armKey] = armOverride;
      return armMap;
    }, {});
    pruned[key] = normalizeIntersectionOverride({ ...override, arms });
  });
  return pruned;
}

export function intersectionOverrideStats(overrides = {}) {
  const map = normalizeIntersectionOverrideMap(overrides);
  return Object.values(map).reduce((stats, override) => {
    stats.intersections += 1;
    if (override.enabled === false) stats.disabledIntersections += 1;
    stats.armOverrides += Object.keys(override.arms || {}).length;
    return stats;
  }, { intersections: 0, disabledIntersections: 0, armOverrides: 0 });
}

export function createRoadIntersectionOverrideController(initialOverrides = {}) {
  let overrides = normalizeIntersectionOverrideMap(initialOverrides);
  return {
    getOverrides: () => overrides,
    setOverrides: next => { overrides = normalizeIntersectionOverrideMap(next); return overrides; },
    apply: intersections => applyIntersectionOverrides(intersections, overrides),
    upsertIntersection: (intersection, patch) => { overrides = upsertIntersectionOverride(overrides, intersection, patch); return overrides; },
    upsertArm: (intersection, arm, patch) => { overrides = upsertArmOverride(overrides, intersection, arm, patch); return overrides; },
    setArmFeature: (intersectionOrKey, armOrKey, featureKey, enabled) => { overrides = setArmFeatureOverride(overrides, intersectionOrKey, armOrKey, featureKey, enabled); return overrides; },
    removeIntersection: intersectionOrKey => { overrides = removeIntersectionOverride(overrides, intersectionOrKey); return overrides; },
    removeArm: (intersectionOrKey, armOrKey) => { overrides = removeArmOverride(overrides, intersectionOrKey, armOrKey); return overrides; },
    prune: intersections => { overrides = pruneStaleIntersectionOverrides(overrides, intersections); return overrides; },
    stats: () => intersectionOverrideStats(overrides),
  };
}

export { DEFAULT_ARM_OVERRIDE, DEFAULT_INTERSECTION_OVERRIDE, OVERRIDE_SCHEMA_VERSION };
