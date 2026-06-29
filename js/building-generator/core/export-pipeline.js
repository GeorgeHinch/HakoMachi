const exportPipelineBoundary = Object.freeze({
  id: 'building-generator/core/export-pipeline',
  owns: Object.freeze([
    'export data assembly',
    'part bundle preparation',
    'DOM-free SVG/STL export orchestration',
  ]),
});

function createExportPipeline(dependencies = {}) {
  return Object.freeze({
    dependencies,
    boundary: exportPipelineBoundary,
  });
}

export {
  exportPipelineBoundary,
  createExportPipeline,
};
