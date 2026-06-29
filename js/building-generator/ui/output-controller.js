const outputControllerBoundary = Object.freeze({
  id: 'building-generator/ui/output-controller',
  owns: Object.freeze([
    'generated output rendering',
    'output download and copy handlers',
    'regeneration UI status',
  ]),
});

function createOutputController(dependencies = {}) {
  return Object.freeze({
    dependencies,
    boundary: outputControllerBoundary,
  });
}

export {
  outputControllerBoundary,
  createOutputController,
};
