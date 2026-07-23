import { drainageGrateFamilyOptions, grateFamilyPresetByKey } from './road-drainage-grate-inserts.js';
import { migrateRoadFeatures } from './road-feature-migration.js';

export function createRoadFeatureConfigController({ state, mmToPx, escapeAttr, escapeHtml, normalizeRoadFeature }) {
  function migrateLoadedRoadFeatures(features) {
    return migrateRoadFeatures(Array.isArray(features) ? structuredClone(features) : [], {}, { pxPerMm: state.pxPerMm }).map(normalizeRoadFeature);
  }

  function grateFamilyOptionsHtml(selectedKey) {
    const selected = grateFamilyPresetByKey(selectedKey || 'rectangularDrain').key;
    return drainageGrateFamilyOptions().map(option => `<option value="${escapeAttr(option.value)}" ${option.value === selected ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('');
  }

  function applyPhysicalGrateFamily(feature, key) {
    const preset = grateFamilyPresetByKey(key || feature.grateInsertSpec?.key || 'rectangularDrain');
    feature.physicalInsert = 'foldedDrainageGrateInsert';
    feature.grateInsertSpec = {
      ...(feature.grateInsertSpec || {}),
      key: preset.key, widthMm: preset.widthMm, depthMm: preset.depthMm,
      diameterMm: preset.diameterMm, shape: preset.shape,
    };
    feature.hatchShape = preset.shape === 'circle' ? 'circle' : 'rect';
    if (preset.shape === 'circle') {
      feature.diameterMm = preset.diameterMm || preset.widthMm;
      if (state.pxPerMm) feature.diameterPx = mmToPx(feature.diameterMm);
    } else {
      feature.widthMm = preset.widthMm;
      feature.depthMm = preset.depthMm;
      if (state.pxPerMm) {
        feature.widthPx = mmToPx(feature.widthMm);
        feature.depthPx = mmToPx(feature.depthMm);
      }
    }
    return feature;
  }

  function syncPhysicalGrateSpecDimensions(feature) {
    if (feature.physicalInsert !== 'foldedDrainageGrateInsert') return feature;
    feature.grateInsertSpec = feature.grateInsertSpec || { key: feature.hatchShape === 'circle' ? 'etchedManholeCover' : 'rectangularDrain' };
    if (feature.hatchShape === 'circle') {
      feature.grateInsertSpec.shape = 'circle';
      feature.grateInsertSpec.diameterMm = feature.diameterMm;
      feature.grateInsertSpec.widthMm = feature.diameterMm;
      feature.grateInsertSpec.depthMm = feature.diameterMm;
    } else {
      feature.grateInsertSpec.shape = 'rect';
      feature.grateInsertSpec.widthMm = feature.widthMm;
      feature.grateInsertSpec.depthMm = feature.depthMm;
    }
    return feature;
  }

  function setPhysicalGrateMode(feature, enabled) {
    if (enabled) return applyPhysicalGrateFamily(feature, feature.grateInsertSpec?.key || (feature.hatchShape === 'circle' ? 'etchedManholeCover' : 'rectangularDrain'));
    delete feature.physicalInsert;
    delete feature.grateInsertSpec;
    return feature;
  }

  function setRoadMarkingOutputMode(feature, mode) {
    feature.outputMode = mode === 'paintStencil' ? 'paintStencil' : 'etch';
    if (feature.outputMode === 'paintStencil') {
      feature.visualOnly = false;
      feature.cutBehavior = 'paintStencil';
      feature.exportLayer = 'paintStencilCut';
      feature.stencilMaterialId = feature.stencilMaterialId || 'stencil-stock';
      feature.stencilSpec = feature.stencilSpec || { marginMm: 2, bridgeMm: 0.35 };
    } else {
      feature.visualOnly = true;
      feature.cutBehavior = 'etchOnly';
      feature.exportLayer = 'roadMarkingEtch';
    }
    return feature;
  }

  function normalizeDrivingSide(value) {
    return value === 'right' ? 'right' : 'left';
  }

  return Object.freeze({
    migrateLoadedRoadFeatures,
    grateFamilyOptionsHtml,
    applyPhysicalGrateFamily,
    syncPhysicalGrateSpecDimensions,
    setPhysicalGrateMode,
    setRoadMarkingOutputMode,
    normalizeDrivingSide,
  });
}
