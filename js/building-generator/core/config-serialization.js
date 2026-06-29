const configSerializationBoundary = Object.freeze({
  id: 'building-generator/core/config-serialization',
  owns: Object.freeze([
    'stored config shape',
    'config upgrade normalization',
    'import/export config serialization',
  ]),
});

function createConfigSerializationService(dependencies = {}) {
  return Object.freeze({
    dependencies,
    boundary: configSerializationBoundary,
  });
}

export {
  configSerializationBoundary,
  createConfigSerializationService,
};
