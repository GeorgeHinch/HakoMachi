import * as data from './data/index.js';
import { coreModules } from './core/index.js';
import { uiModules } from './ui/index.js';
import { wingModules } from './wing/index.js';
import { previewModules } from './preview/index.js?v=3d-shared-preview-2';

window.HakoMachiBuildingGenerator = Object.freeze({
  ...(window.HakoMachiBuildingGenerator || {}),
  data,
  core: coreModules,
  ui: uiModules,
  wing: wingModules,
  preview: previewModules,
});

document.documentElement.dataset.buildingGeneratorModule = 'ready';
document.documentElement.dataset.buildingGeneratorDataKeys = String(Object.keys(data).length);
document.documentElement.dataset.buildingGeneratorCoreModules = String(Object.keys(coreModules).length);
document.documentElement.dataset.buildingGeneratorUiModules = String(Object.keys(uiModules).length);
document.documentElement.dataset.buildingGeneratorWingModules = String(Object.keys(wingModules).length);
document.documentElement.dataset.buildingGeneratorPreviewModules = String(Object.keys(previewModules).length);

window.dispatchEvent(new CustomEvent('hakomachi:building-generator-module-ready', {
  detail: window.HakoMachiBuildingGenerator,
}));

if (previewModules.threePreview?.buildHakoMachiBuildingPreviewGroup) {
  const previewApi = {
    ...(window.HakoMachiPreview3D || {}),
    buildBuildingPreviewGroup: previewModules.threePreview.buildHakoMachiBuildingPreviewGroup,
    buildGeneratedStlPreviewGroup: previewModules.threePreview.buildGeneratedStlPreviewGroup,
  };
  window.HakoMachiPreview3D = previewApi;
  globalThis.HakoMachiPreview3D = previewApi;
  document.documentElement.dataset.hakomachiPreview3d = 'ready';
}

previewModules.installLegacyBehavior?.({ root: window });
