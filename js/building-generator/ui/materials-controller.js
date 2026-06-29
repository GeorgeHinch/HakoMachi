const materialsControllerBoundary = Object.freeze({
  id: 'building-generator/ui/materials-controller',
  owns: Object.freeze([
    'material form rendering',
    'material form startup',
    'material UI event binding',
  ]),
});

function createMaterialsController(dependencies = {}) {
  return Object.freeze({
    dependencies,
    boundary: materialsControllerBoundary,
  });
}

export {
  materialsControllerBoundary,
  createMaterialsController,
};
