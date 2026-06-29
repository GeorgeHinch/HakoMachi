import '../building-generator/preview/site-planner-dependencies.js';
import * as threePreview from '../building-generator/preview/three-preview.js?v=3d-shared-preview-2';

const buildBuildingPreviewGroup = threePreview.buildHakoMachiBuildingPreviewGroup;
const buildGeneratedStlPreviewGroup = threePreview.buildGeneratedStlPreviewGroup;

const buildingPreviewRenderer = Object.freeze({
  buildBuildingPreviewGroup,
  buildGeneratedStlPreviewGroup,
  helpers: threePreview,
});

function installBuildingPreviewGlobal(root = globalThis) {
  if (!root) return buildingPreviewRenderer;

  const legacyPreviewApi = {
    ...(root.HakoMachiPreview3D || {}),
    buildBuildingPreviewGroup,
    buildGeneratedStlPreviewGroup,
  };

  root.HakoMachiPreview3D = legacyPreviewApi;
  root.HakoMachiBuildingPreviewRenderer = buildingPreviewRenderer;

  const documentElement = root.document?.documentElement || globalThis.document?.documentElement;
  if (documentElement) {
    documentElement.dataset.hakomachiBuildingPreviewRenderer = 'ready';
  }

  const eventTarget = root.window || root;
  if (typeof eventTarget.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
    eventTarget.dispatchEvent(new CustomEvent('hakomachi:building-preview-renderer-ready', {
      detail: buildingPreviewRenderer,
    }));
  }

  return buildingPreviewRenderer;
}

if (typeof globalThis !== 'undefined') {
  installBuildingPreviewGlobal(globalThis);
}

export {
  buildingPreviewRenderer,
  buildBuildingPreviewGroup,
  buildGeneratedStlPreviewGroup,
  installBuildingPreviewGlobal,
  threePreview,
};
