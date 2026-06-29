import * as threePreview from './three-preview.js?v=3d-shared-preview-2';

export const installPreviewLegacyBehavior = threePreview.installThreePreviewLegacyBehavior;

export const previewModules = Object.freeze({
  threePreview,
  installLegacyBehavior: installPreviewLegacyBehavior,
});
