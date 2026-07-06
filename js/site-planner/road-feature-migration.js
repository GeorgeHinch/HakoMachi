import { applyRoadHatchPresetData, applyRoadMarkingPresetData, roadHatchPresetByKey, roadMarkingPresetByKey } from './road-marking-presets.js';
import { applyRoadMaterialToFeature } from './road-material-library-roles.js';

const MARKING_ALIAS = Object.freeze({
  stop: 'stopLine',
  stopLine: 'stopLine',
  crosswalk: 'zebraCrosswalk',
  zebra: 'zebraCrosswalk',
  bicycle: 'bicycleCrossing',
  arrow: 'laneArrowStraight',
  straightArrow: 'laneArrowStraight',
  leftArrow: 'laneArrowLeft',
  rightArrow: 'laneArrowRight',
  speed30: 'speed30',
  speed40: 'speed40',
  tomare: 'stopTextTomare',
  diamond: 'diamondWarning',
  chevron: 'chevronBuffer',
  safety: 'safetyZoneBox',
});

const HATCH_ALIAS = Object.freeze({
  manhole: 'round600',
  round: 'round600',
  round600: 'round600',
  largeManhole: 'round900',
  drain: 'rectDrainSmall',
  rectDrain: 'rectDrainSmall',
  grate: 'rectDrainLong',
  trench: 'rectDrainLong',
});

function cleanKey(value) {
  return String(value || '').trim();
}

function inferMarkingPreset(feature = {}) {
  return cleanKey(feature.markingPreset || feature.markingType || MARKING_ALIAS[feature.type] || MARKING_ALIAS[feature.kind] || feature.preset) || 'stopLine';
}

function inferHatchPreset(feature = {}) {
  return cleanKey(feature.hatchPreset || feature.hatchType || HATCH_ALIAS[feature.type] || HATCH_ALIAS[feature.kind] || feature.preset) || 'round600';
}

function featureScaleContext(feature = {}, scaleContext = {}) {
  const rawScale = scaleContext.pxPerMm || scaleContext.scale || feature.pxPerMm || feature.scale;
  const pxPerMm = Number(rawScale);
  return {
    hasScale: Number.isFinite(pxPerMm) && pxPerMm > 0,
    pxPerMm: Number.isFinite(pxPerMm) && pxPerMm > 0 ? pxPerMm : 1,
  };
}

export function migrateRoadMarkingFeature(feature = {}, materialLibraryOrProfile = {}, scaleContext = {}) {
  const presetKey = inferMarkingPreset(feature);
  const preset = roadMarkingPresetByKey(presetKey);
  const scale = featureScaleContext(feature, scaleContext);
  const migrated = applyRoadMarkingPresetData(feature, preset.key, scale);
  if (!scale.hasScale) {
    if (Number.isFinite(Number(feature.widthPx))) migrated.widthPx = Number(feature.widthPx);
    if (Number.isFinite(Number(feature.depthPx))) migrated.depthPx = Number(feature.depthPx);
  }
  return applyRoadMaterialToFeature({
    ...migrated,
    migration: { from: feature.markingType || feature.type || feature.preset || '', to: preset.key },
  }, materialLibraryOrProfile);
}

export function migrateRoadHatchFeature(feature = {}, materialLibraryOrProfile = {}, scaleContext = {}) {
  const presetKey = inferHatchPreset(feature);
  const preset = roadHatchPresetByKey(presetKey);
  const scale = featureScaleContext(feature, scaleContext);
  const migrated = applyRoadHatchPresetData(feature, preset.key, scale);
  if (!scale.hasScale) {
    if (Number.isFinite(Number(feature.diameterPx))) migrated.diameterPx = Number(feature.diameterPx);
    if (Number.isFinite(Number(feature.widthPx))) migrated.widthPx = Number(feature.widthPx);
    if (Number.isFinite(Number(feature.depthPx))) migrated.depthPx = Number(feature.depthPx);
  }
  return applyRoadMaterialToFeature({
    ...migrated,
    migration: { from: feature.hatchType || feature.type || feature.preset || '', to: preset.key },
  }, materialLibraryOrProfile);
}

export function migrateRoadFeature(feature = {}, materialLibraryOrProfile = {}, scaleContext = {}) {
  const kind = String(feature.kind || feature.type || '').toLowerCase();
  if (kind.includes('mark') || feature.markingPreset || feature.markingType) return migrateRoadMarkingFeature(feature, materialLibraryOrProfile, scaleContext);
  if (kind.includes('manhole') || kind.includes('hatch') || kind.includes('drain') || feature.hatchPreset || feature.hatchType) return migrateRoadHatchFeature(feature, materialLibraryOrProfile, scaleContext);
  return feature;
}

export function migrateRoadFeatures(features = [], materialLibraryOrProfile = {}, scaleContext = {}) {
  return (features || []).map(feature => migrateRoadFeature(feature, materialLibraryOrProfile, scaleContext));
}

export function roadFeatureMigrationSummary(before = [], after = []) {
  const migrated = after.filter(feature => feature.migration).length;
  return {
    total: after.length,
    migrated,
    unchanged: Math.max(0, after.length - migrated),
    markingFeatures: after.filter(feature => feature.kind === 'marking').length,
    hatchFeatures: after.filter(feature => feature.kind === 'manhole').length,
  };
}

export { HATCH_ALIAS as ROAD_HATCH_MIGRATION_ALIASES, MARKING_ALIAS as ROAD_MARKING_MIGRATION_ALIASES };
