import '../building-generator-runtime.js?v=es-module-runtime-1';
import { previewModules } from './preview/index.js?v=3d-shared-preview-2';

window.HakoMachiBuildingGenerator = Object.freeze({
  ...(window.HakoMachiBuildingGenerator || {}),
  runtime: window.HakoMachiBuildingGeneratorRuntime,
  preview: previewModules,
});

document.documentElement.dataset.buildingGeneratorModule = 'ready';
document.documentElement.dataset.buildingGeneratorPreviewModules = String(Object.keys(previewModules).length);

window.dispatchEvent(new CustomEvent('hakomachi:building-generator-module-ready', {
  detail: window.HakoMachiBuildingGenerator,
}));

if (previewModules.threePreview?.buildHakoMachiBuildingPreviewGroup) {
  for (const name of [
    'get3DWallOpenings',
    'getBlankedWindows3D',
    'get3DWallProfileForFace',
    'doorOpeningAs3DBayDoor',
    'normaliseHexColour',
    'materialDefinitionForId',
    'materialColourHex',
    'materialColourNumber',
    'claddingMaterialIdForStyle',
    'claddingColourHexForStyle',
    'shadeHexColour',
    'rgbaFromHex',
  ]) {
    if (previewModules.threePreview[name]) globalThis[name] = previewModules.threePreview[name];
  }

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
window.startHakoMachiBuildingGeneratorRuntime?.();
