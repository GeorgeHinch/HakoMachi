const formControllerBoundary = Object.freeze({
  id: 'building-generator/ui/form-controller',
  owns: Object.freeze([
    'main form reads',
    'main form writes',
    'form event binding',
  ]),
});

function createFormController(dependencies = {}) {
  return Object.freeze({
    dependencies,
    boundary: formControllerBoundary,
  });
}

export {
  formControllerBoundary,
  createFormController,
};
