import '../building-generator-runtime.js?v=es-module-runtime-4';
import {
  buildingPreviewRenderer,
  installBuildingPreviewGlobal,
  previewModules,
} from './preview/index.js?v=shared-building-preview-30';

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

let buildingPreviewRefreshTimer = null;
function scheduleBuildingPreviewRefresh(delayMs = 0) {
  if (buildingPreviewRefreshTimer != null) {
    window.clearTimeout?.(buildingPreviewRefreshTimer);
  }
  buildingPreviewRefreshTimer = window.setTimeout?.(() => {
    buildingPreviewRefreshTimer = null;
    refreshBuildingPreview();
  }, delayMs);
}

window.addEventListener('hakomachi:building-generator-regenerated', event => {
  try {
    const config = event.detail?.config
      || window.HakoMachiBuildingGeneratorRuntime?.CONFIG
      || window.CONFIG;
    previewModules.threePreview?.setThreePreviewConfig?.(config);
  } catch (_) {
    /* The scheduled refresh below will report real preview errors. */
  }
  scheduleBuildingPreviewRefresh(0);
});

document.querySelector('.controls')?.addEventListener('input', () => {
  scheduleBuildingPreviewRefresh(380);
}, true);

document.querySelector('.controls')?.addEventListener('change', () => {
  scheduleBuildingPreviewRefresh(380);
}, true);

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
scheduleBuildingPreviewRefresh(0);
window.setTimeout?.(refreshBuildingPreview, 250);
