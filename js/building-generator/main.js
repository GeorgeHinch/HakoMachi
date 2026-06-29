import '../building-generator-runtime.js?v=es-module-runtime-1';
import {
  buildingPreviewRenderer,
  installBuildingPreviewGlobal,
  previewModules,
} from './preview/index.js?v=shared-building-preview-24';

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

function refreshBuildingPreview() {
  try {
    const config = window.HakoMachiBuildingGeneratorRuntime?.CONFIG
      || globalThis.HakoMachiBuildingGeneratorRuntime?.CONFIG
      || window.CONFIG
      || globalThis.CONFIG;
    previewModules.threePreview?.setThreePreviewConfig?.(config);
    previewModules.threePreview?.updateThreePreview?.(config);
  } catch (err) {
    console.error('3D preview refresh error:', err);
  }
}

if (buildingPreviewRenderer?.buildBuildingPreviewGroup) {
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

  window.HakoMachiBuildingPreviewRenderer = buildingPreviewRenderer;
  globalThis.HakoMachiBuildingPreviewRenderer = buildingPreviewRenderer;
  document.documentElement.dataset.hakomachiPreview3d = 'ready';
  installBuildingPreviewGlobal?.(globalThis);
}

previewModules.installLegacyBehavior?.({ root: window });
window.startHakoMachiBuildingGeneratorRuntime?.();
window.setTimeout?.(refreshBuildingPreview, 0);
window.setTimeout?.(refreshBuildingPreview, 250);
