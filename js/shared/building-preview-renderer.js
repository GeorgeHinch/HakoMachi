import * as data from '../building-generator/data/index.js?v=shared-building-preview-24';
import { coreModules } from '../building-generator/core/index.js?v=shared-building-preview-24';
import * as materialRegistry from '../building-generator/core/material-registry.js?v=shared-building-preview-24';
import * as stlExportConfig from '../building-generator/core/stl-export-config.js';
import { wingModules } from '../building-generator/wing/index.js';

function publishModuleDependencies(root, moduleNamespace) {
  for (const [name, value] of Object.entries(moduleNamespace || {})) {
    if (value !== undefined && root[name] === undefined) {
      root[name] = value;
    }
  }
}

function publishPreviewDependencies(root = globalThis) {
  publishModuleDependencies(root, data);
  for (const moduleNamespace of Object.values(coreModules)) publishModuleDependencies(root, moduleNamespace);
  publishModuleDependencies(root, materialRegistry);
  publishModuleDependencies(root, stlExportConfig);
  for (const moduleNamespace of Object.values(wingModules)) publishModuleDependencies(root, moduleNamespace);

  const documentElement = root.document?.documentElement || globalThis.document?.documentElement;
  if (documentElement) {
    documentElement.dataset.hakomachiPreview3dDependencies = 'ready';
  }
}

publishPreviewDependencies(globalThis);

const threePreview = await import('../building-generator/preview/three-preview.js?v=shared-building-preview-24');

const buildBuildingPreviewGroup = threePreview.buildHakoMachiBuildingPreviewGroup;
const buildGeneratedStlPreviewGroup = threePreview.buildGeneratedStlPreviewGroup;
const applyLayoutCutClippingToGroup = threePreview.applyLayoutCutClippingToGroup;

const buildingPreviewRenderer = Object.freeze({
  buildBuildingPreviewGroup,
  buildGeneratedStlPreviewGroup,
  applyLayoutCutClippingToGroup,
  helpers: threePreview,
});

function installBuildingPreviewGlobal(root = globalThis) {
  if (!root) return buildingPreviewRenderer;

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
  applyLayoutCutClippingToGroup,
  installBuildingPreviewGlobal,
  publishPreviewDependencies,
  threePreview,
};
