const bootstrapBoundary = Object.freeze({
  id: 'building-generator/app/bootstrap',
  owns: Object.freeze([
    'startup order',
    'page lifecycle',
    'runtime readiness publication',
  ]),
});

function createBootstrapController(dependencies = {}) {
  return Object.freeze({
    dependencies,
    boundary: bootstrapBoundary,
  });
}

export {
  bootstrapBoundary,
  createBootstrapController,
};
