const runtimeSurfaceBoundary = Object.freeze({
  id: 'building-generator/app/runtime-surface',
  owns: Object.freeze([
    'temporary legacy public API',
    'global compatibility mapping',
    'runtime surface reduction tracking',
  ]),
});

function createRuntimeSurface(dependencies = {}) {
  return Object.freeze({
    dependencies,
    boundary: runtimeSurfaceBoundary,
  });
}

export {
  runtimeSurfaceBoundary,
  createRuntimeSurface,
};
