const previewControllerBoundary = Object.freeze({
  id: 'building-generator/preview/controller',
  owns: Object.freeze([
    'Building Generator preview canvas wiring',
    'preview render lifecycle',
    'page-specific preview refresh hooks',
  ]),
});

function createPreviewController(dependencies = {}) {
  return Object.freeze({
    dependencies,
    boundary: previewControllerBoundary,
  });
}

export {
  previewControllerBoundary,
  createPreviewController,
};
