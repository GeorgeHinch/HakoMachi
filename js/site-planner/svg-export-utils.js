import { svgFabricationClass } from '../shared/svg-fabrication-colors.js';

export function svgPathFromPoly(poly) {
  return (poly || []).map(p => `${p.x},${p.y}`).join(' ');
}

export function svgFeatureTransform(feature) {
  return `rotate(${feature.rotationDeg || 0} ${feature.x} ${feature.y})`;
}

export function svgFabricationAttrs(operation, layer, extra = '') {
  return `class="${svgFabricationClass(operation)}" data-operation="${operation}" data-layer="${layer}"${extra ? ` ${extra}` : ''}`;
}
