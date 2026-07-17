import {
  buildingPreviewRenderer,
  installBuildingPreviewGlobal,
  threePreview,
} from '../../shared/building-preview-renderer.js?v=hm-assets-20260717-1';
import * as controller from './controller.js';

export const installPreviewLegacyBehavior = threePreview.installThreePreviewLegacyBehavior;
export { buildingPreviewRenderer, installBuildingPreviewGlobal };

export const previewModules = Object.freeze({
  buildingPreviewRenderer,
  threePreview,
  controller,
  installLegacyBehavior: installPreviewLegacyBehavior,
});
