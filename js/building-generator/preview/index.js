import {
  buildingPreviewRenderer,
  installBuildingPreviewGlobal,
  threePreview,
} from '../../shared/building-preview-renderer.js?v=shared-building-preview-27';
import * as controller from './controller.js';

export const installPreviewLegacyBehavior = threePreview.installThreePreviewLegacyBehavior;
export { buildingPreviewRenderer, installBuildingPreviewGlobal };

export const previewModules = Object.freeze({
  buildingPreviewRenderer,
  threePreview,
  controller,
  installLegacyBehavior: installPreviewLegacyBehavior,
});
