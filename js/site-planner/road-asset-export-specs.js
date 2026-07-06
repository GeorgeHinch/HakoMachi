function positiveNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function featureDimensionMm(raw, normalized, mmKey, pxKey, fallbackMm, pxPerMm = 0) {
  const rawMm = positiveNumber(raw?.[mmKey]);
  if (rawMm) return rawMm;
  const normalizedMm = positiveNumber(normalized?.[mmKey]);
  const rawPx = positiveNumber(raw?.[pxKey]);
  if (rawPx && positiveNumber(pxPerMm)) return rawPx / pxPerMm;
  if (normalizedMm) return normalizedMm;
  if (rawPx) return rawPx;
  return positiveNumber(fallbackMm, 1);
}

export function physicalGrateExportSpec(raw, index, deps = {}) {
  const { normalizeRoadFeature = feature => feature } = deps;
  const f = normalizeRoadFeature(raw);
  if (!f || f.hidden || f.kind !== 'manhole' || f.physicalInsert !== 'foldedDrainageGrateInsert') return null;
  const spec = {
    ...(f.grateInsertSpec || {}),
    id: f.id || `road-grate-${index + 1}`,
    label: f.name || `Road grate ${index + 1}`,
    key: f.grateInsertSpec?.key || (f.hatchShape === 'circle' ? 'etchedManholeCover' : 'rectangularDrain'),
  };
  if (f.hatchShape === 'circle') {
    spec.shape = 'circle';
    spec.diameterMm = positiveNumber(f.diameterMm, positiveNumber(spec.diameterMm, positiveNumber(spec.widthMm, 4)));
    spec.widthMm = spec.diameterMm;
    spec.depthMm = spec.diameterMm;
  } else {
    spec.shape = spec.shape === 'circle' ? 'rect' : spec.shape;
    spec.widthMm = positiveNumber(f.widthMm, positiveNumber(spec.widthMm, 4));
    spec.depthMm = positiveNumber(f.depthMm, positiveNumber(spec.depthMm, 2));
  }
  return spec;
}

export function physicalGrateExportSpecs(roadFeatures = [], deps = {}) {
  return (roadFeatures || []).map((feature, index) => physicalGrateExportSpec(feature, index, deps)).filter(Boolean);
}

export function paintStencilExportSpec(raw, index, deps = {}) {
  const {
    markingPresetByKey = () => ({}),
    normalizeRoadFeature = feature => feature,
    pxPerMm = 0,
  } = deps;
  const f = normalizeRoadFeature(raw);
  if (!f || f.hidden || f.kind !== 'marking' || (f.outputMode !== 'paintStencil' && f.cutBehavior !== 'paintStencil')) return null;
  const preset = markingPresetByKey(f.markingPreset || f.markingType);
  return {
    id: f.id || `road-paint-stencil-${index + 1}`,
    label: f.name || preset.label || `Road paint stencil ${index + 1}`,
    materialId: f.stencilMaterialId || 'stencil-stock',
    rotationDeg: Number(f.rotationDeg) || 0,
    preset: {
      ...preset,
      ...f,
      key: preset.key,
      widthMm: featureDimensionMm(raw, f, 'widthMm', 'widthPx', preset.widthMm, pxPerMm),
      depthMm: featureDimensionMm(raw, f, 'depthMm', 'depthPx', preset.depthMm, pxPerMm),
      exportLayer: 'paintStencilCut',
    },
    transform: { x: 0, y: 0, angle: 0 },
    options: {
      ...(f.stencilSpec || {}),
      materialId: f.stencilMaterialId || 'stencil-stock',
      materialRole: 'stencilStock',
    },
  };
}

export function paintStencilExportSpecs(roadFeatures = [], deps = {}) {
  return (roadFeatures || []).map((feature, index) => paintStencilExportSpec(feature, index, deps)).filter(Boolean);
}
