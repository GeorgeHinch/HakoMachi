const presetStorageBoundary = Object.freeze({
  id: 'building-generator/core/preset-storage',
  owns: Object.freeze([
    'local preset persistence',
    'storage error handling',
    'preset config round trips',
  ]),
});

function createPresetStorageService(dependencies = {}) {
  return Object.freeze({
    dependencies,
    boundary: presetStorageBoundary,
  });
}

export {
  presetStorageBoundary,
  createPresetStorageService,
};
