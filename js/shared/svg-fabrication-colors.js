export const SVG_FABRICATION_OPERATIONS = Object.freeze({
  ENGRAVE: 'engrave',
  CUT_RETAINED: 'cut-retained',
  CUT_SCRAP: 'cut-scrap',
});

export const SVG_FABRICATION_COLORS = Object.freeze({
  [SVG_FABRICATION_OPERATIONS.ENGRAVE]: '#0000ff',
  [SVG_FABRICATION_OPERATIONS.CUT_RETAINED]: '#ff0000',
  [SVG_FABRICATION_OPERATIONS.CUT_SCRAP]: '#008000',
});

export const SVG_FABRICATION_CLASSES = Object.freeze({
  [SVG_FABRICATION_OPERATIONS.ENGRAVE]: 'svg-engrave',
  [SVG_FABRICATION_OPERATIONS.CUT_RETAINED]: 'svg-cut-retained',
  [SVG_FABRICATION_OPERATIONS.CUT_SCRAP]: 'svg-cut-scrap',
});

export const SVG_FABRICATION_LABELS = Object.freeze({
  [SVG_FABRICATION_OPERATIONS.ENGRAVE]: 'Engrave / score',
  [SVG_FABRICATION_OPERATIONS.CUT_RETAINED]: 'Retained through-cut',
  [SVG_FABRICATION_OPERATIONS.CUT_SCRAP]: 'Scrap through-cut',
});

export const SVG_FABRICATION_DESCRIPTIONS = Object.freeze({
  [SVG_FABRICATION_OPERATIONS.ENGRAVE]: 'Surface marks that do not cut through the material.',
  [SVG_FABRICATION_OPERATIONS.CUT_RETAINED]: 'Through-cuts for pieces or outlines intended to stay with the final model.',
  [SVG_FABRICATION_OPERATIONS.CUT_SCRAP]: 'Through-cuts for waste openings, slots, voids, or discard pieces.',
});

export function svgFabricationColor(operation) {
  return SVG_FABRICATION_COLORS[operation] || SVG_FABRICATION_COLORS[SVG_FABRICATION_OPERATIONS.CUT_RETAINED];
}

export function svgFabricationClass(operation) {
  return SVG_FABRICATION_CLASSES[operation] || SVG_FABRICATION_CLASSES[SVG_FABRICATION_OPERATIONS.CUT_RETAINED];
}

export function svgFabricationLabel(operation) {
  return SVG_FABRICATION_LABELS[operation] || SVG_FABRICATION_LABELS[SVG_FABRICATION_OPERATIONS.CUT_RETAINED];
}

export function svgFabricationOperationDataAttrs(operation) {
  return {
    'data-operation': operation,
    class: svgFabricationClass(operation),
  };
}
