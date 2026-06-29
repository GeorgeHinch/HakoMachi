import * as threePreview from './three-preview.js?v=3d-shared-preview-2';
import * as controller from './controller.js';

export const installPreviewLegacyBehavior = threePreview.installThreePreviewLegacyBehavior;

export const previewModules = Object.freeze({
  threePreview,
  controller,
  installLegacyBehavior: installPreviewLegacyBehavior,
});
