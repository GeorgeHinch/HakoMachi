import { MaterialRegistry, normaliseHexColour as normaliseMaterialHexColour } from '../core/material-registry.js?v=hm-assets-20260804-13';

export function normaliseHexColour(raw, fallback = '#cccccc') {
  return normaliseMaterialHexColour(raw, fallback);
}

export function shadeHexColour(hex, factor = 0.75) {
  const h = normaliseHexColour(hex, '#cccccc').slice(1);
  const r = Math.max(0, Math.min(255, Math.round(parseInt(h.slice(0, 2), 16) * factor)));
  const g = Math.max(0, Math.min(255, Math.round(parseInt(h.slice(2, 4), 16) * factor)));
  const b = Math.max(0, Math.min(255, Math.round(parseInt(h.slice(4, 6), 16) * factor)));
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

export function rgbaFromHex(hex, alpha = 1) {
  const h = normaliseHexColour(hex, '#000000').slice(1);
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function svgDataUri(svg) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
    .replace(/%20/g, ' ')
    .replace(/%3D/g, '=')
    .replace(/%3A/g, ':')
    .replace(/%2F/g, '/');
}

export function createPreviewMaterialHelpers(resolveConfig) {
  const getConfig = typeof resolveConfig === 'function' ? resolveConfig : cfg => cfg;

  return Object.freeze({
    normaliseHexColour,
    shadeHexColour,
    rgbaFromHex,
    svgDataUri,
    materialDefinitionForId(cfg, materialId) {
      return MaterialRegistry.get(materialId, getConfig(cfg), false);
    },
    materialColourHex(cfg, materialId, fallback = '#cccccc') {
      return MaterialRegistry.colorHex(materialId, getConfig(cfg), fallback);
    },
    materialColourNumber(cfg, materialId, fallback = 0xcccccc) {
      return MaterialRegistry.colorNumber(materialId, getConfig(cfg), fallback);
    },
    claddingMaterialIdForStyle(cfg, styleKey) {
      return MaterialRegistry.claddingMaterialId(styleKey, getConfig(cfg));
    },
    claddingColourHexForStyle(cfg, styleKey, fallback = '#cbbfa3') {
      return MaterialRegistry.claddingColorHex(styleKey, getConfig(cfg), fallback);
    },
    material3DForId(cfg, materialId, opts = {}, fallback = 0xcccccc) {
      return MaterialRegistry.threeMaterial(materialId, getConfig(cfg), opts, fallback);
    },
  });
}
