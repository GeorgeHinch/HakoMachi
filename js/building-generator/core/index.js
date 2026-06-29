import * as wallFeatureModel from './wall-feature-model.js';
import * as legacyHakoImport from './legacy-hako-import.js';
import * as wallFeatureAccessors from './wall-feature-accessors.js';
import * as i18n from './i18n.js';
import * as state from './state.js';
import * as geometryPrimitives from './geometry-primitives.js';
import * as partGenerators from './part-generators.js';
import * as segmentedWallExposure from './segmented-wall-exposure.js';
import * as trussSystem from './truss-system.js';
import * as trussBearingTabs from './truss-bearing-tabs.js';
import * as verticalTrussSupports from './vertical-truss-supports.js';
import * as roofGenerator from './roof-generator.js';
import * as layoutCutGeometry from './layout-cut-geometry.js';
import * as awnings from './awnings.js';
import * as balconies from './balconies.js';
import * as billboards from './billboards.js';
import * as rooftopShieldWall from './rooftop-shield-wall.js';
import * as ridgeCap from './ridge-cap.js';
import * as soffitCladding from './soffit-cladding.js';
import * as roofFasciaTrim from './roof-fascia-trim.js';
import * as windowParts from './window-parts.js';
import * as fixtureParts from './fixture-parts.js';
import * as interiorWallCladding from './interior-wall-cladding.js';
import * as skylights from './skylights.js';
import * as blockSupplementalParts from './block-supplemental-parts.js';
import * as sheetSplitting from './sheet-splitting.js';
import * as fullBuildingGeneration from './full-building-generation.js';
import * as partMetadata from './part-metadata.js';
import * as configSerialization from './config-serialization.js';
import * as presetStorage from './preset-storage.js';
import * as exportPipeline from './export-pipeline.js';

export {
  wallFeatureModel,
  legacyHakoImport,
  wallFeatureAccessors,
  i18n,
  state,
  geometryPrimitives,
  partGenerators,
  segmentedWallExposure,
  trussSystem,
  trussBearingTabs,
  verticalTrussSupports,
  roofGenerator,
  layoutCutGeometry,
  awnings,
  balconies,
  billboards,
  rooftopShieldWall,
  ridgeCap,
  soffitCladding,
  roofFasciaTrim,
  windowParts,
  fixtureParts,
  interiorWallCladding,
  skylights,
  blockSupplementalParts,
  sheetSplitting,
  fullBuildingGeneration,
  partMetadata,
  configSerialization,
  presetStorage,
  exportPipeline,
};

export const coreModules = Object.freeze({
  wallFeatureModel,
  legacyHakoImport,
  wallFeatureAccessors,
  i18n,
  state,
  geometryPrimitives,
  partGenerators,
  segmentedWallExposure,
  trussSystem,
  trussBearingTabs,
  verticalTrussSupports,
  roofGenerator,
  layoutCutGeometry,
  awnings,
  balconies,
  billboards,
  rooftopShieldWall,
  ridgeCap,
  soffitCladding,
  roofFasciaTrim,
  windowParts,
  fixtureParts,
  interiorWallCladding,
  skylights,
  blockSupplementalParts,
  sheetSplitting,
  fullBuildingGeneration,
  partMetadata,
  configSerialization,
  presetStorage,
  exportPipeline,
});
