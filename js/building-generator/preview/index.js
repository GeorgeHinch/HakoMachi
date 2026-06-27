import * as threePreview from './three-preview.js';

export const installPreviewLegacyBehavior = threePreview.installThreePreviewLegacyBehavior;

export const previewModules = Object.freeze({
  threePreview,
  installLegacyBehavior: installPreviewLegacyBehavior,
});
