const TOOL_REGISTRY = Object.freeze([
  Object.freeze({
    key: 'landing',
    appKey: 'landing',
    path: 'index.html',
    canonicalPath: '',
    group: 'core',
    label: 'HakoMachi',
    shortLabel: 'Home',
    seoTitle: 'HakoMachi - Japanese N Gauge Laser-Cut Modeling Tools',
    seoDescription: 'HakoMachi is a browser-based toolkit for planning Japanese N gauge streetscapes and generating 1:150 laser-cut buildings, railings, shelves, crates, and scenic details.',
    shortDescription: 'Plan a Japanese N-scale streetscape, then generate laser-cut buildings for it.',
    landing: false,
  }),
  Object.freeze({
    key: 'sitePlanner',
    appKey: 'site_planner',
    path: 'site-planner.html',
    group: 'primary',
    label: 'Site Planner',
    seoTitle: 'HakoMachi Site Planner - Japanese N Gauge Streetscape Layout Tool',
    seoDescription: 'Plan Japanese N gauge streetscapes before cutting: place roads, sidewalks, benchwork, traced pads, and HakoMachi building metadata on a reference image.',
    shortDescription: 'Lay out roads, sidewalks, benchwork, traced pads, and building metadata before committing parts to material.',
    landing: true,
    landingOrder: 10,
  }),
  Object.freeze({
    key: 'buildingGenerator',
    appKey: 'building_generator',
    path: 'building-generator.html',
    group: 'primary',
    label: 'Building Generator',
    seoTitle: 'HakoMachi Building Generator - Japanese N Gauge Laser-Cut Buildings',
    seoDescription: 'Design Japanese-style 1:150 laser-cut buildings for N gauge model railway layouts, then export SVG cut sheets for assembly.',
    shortDescription: 'Design individual 1:150 buildings and export sorted SVG cut sheets with tongue-and-slot joinery.',
    landing: true,
    landingOrder: 20,
  }),
  Object.freeze({
    key: 'industrialShelfGenerator',
    appKey: 'utility_industrial_shelf',
    path: 'utils/industrial-shelf-generator.html',
    group: 'utility',
    label: 'Industrial Shelf Generator',
    seoTitle: 'HakoMachi Industrial Shelf Generator - 1:150 Laser-Cut Utility Details',
    seoDescription: 'Generate 1:150 laser-cut industrial shelves, cabinets, lockers, and utility box detail parts for HakoMachi and N gauge model scenes.',
    shortDescription: 'Create laser-cut shelving, cabinets, lockers, and utility box detail parts.',
    landing: true,
    landingOrder: 110,
  }),
  Object.freeze({
    key: 'materialManager',
    appKey: 'utility_material_manager',
    path: 'utils/material-manager.html',
    group: 'utility',
    label: 'Material Manager',
    seoTitle: 'HakoMachi Material Manager',
    seoDescription: 'Manage reusable stock material profiles for HakoMachi generator assignments, laser sheet sizing, material colors, cladding routing, and GitHub data sync.',
    shortDescription: 'Manage reusable stock material profiles for generator assignments, sheet sizing, and GitHub data sync.',
    landing: true,
    landingOrder: 120,
  }),
  Object.freeze({
    key: 'safetyRailingGenerator',
    appKey: 'utility_safety_railing',
    path: 'utils/safety-railing-generator.html',
    group: 'utility',
    label: 'Safety Railing Generator',
    seoTitle: 'HakoMachi Safety Railing Generator - 1:150 Laser-Cut Railings',
    seoDescription: 'Generate flat SVG safety railing runs with tab-and-slot bases for 1:150 Japanese N gauge industrial and rooftop scenes.',
    shortDescription: 'Generate flat SVG railing runs with tab-and-slot base joinery.',
    landing: true,
    landingOrder: 130,
  }),
  Object.freeze({
    key: 'woodenCrateGenerator',
    appKey: 'utility_wooden_crate',
    path: 'utils/wooden-crate-generator.html',
    group: 'utility',
    label: 'Wooden Crate Generator',
    seoTitle: 'HakoMachi Wooden Crate Generator - 1:150 Laser-Cut Crates',
    seoDescription: 'Generate 1:150 laser-cut wooden crate parts with structural cores, etched plank cladding, raised bracing, and SVG export.',
    shortDescription: 'Build 1:150 crate parts with structural cores, plank cladding, and raised bracing.',
    landing: true,
    landingOrder: 140,
  }),
]);

const byPath = new Map();
const byAppKey = new Map();
TOOL_REGISTRY.forEach(tool => {
  byAppKey.set(tool.appKey, tool);
  [tool.path, tool.canonicalPath].filter(Boolean).forEach(path => {
    const normalized = normalizeToolPath(path);
    byPath.set(normalized, tool);
    byPath.set(filenameFromPath(normalized), tool);
  });
});

export function normalizeToolPath(path) {
  const clean = String(path || '')
    .replace(/^https?:\/\/[^/]+\//, '')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '');
  return clean || 'index.html';
}

export function filenameFromPath(path) {
  const clean = normalizeToolPath(path);
  return clean.split('/').pop() || 'index.html';
}

export function toolForPath(path) {
  const clean = normalizeToolPath(path);
  if (byPath.has(clean)) return byPath.get(clean);
  const filename = filenameFromPath(clean);
  return byPath.get(filename) || null;
}

export function toolForAppKey(appKey) {
  return byAppKey.get(String(appKey || '')) || null;
}

export function appKeyForPath(path, fallback = 'landing') {
  return toolForPath(path)?.appKey || fallback;
}

export function navigationTargetForHref(href) {
  if (!href || String(href).startsWith('#')) return '';
  return toolForPath(href)?.appKey || '';
}

export function landingTools(group = null) {
  return TOOL_REGISTRY
    .filter(tool => tool.landing && (!group || tool.group === group))
    .slice()
    .sort((a, b) => (a.landingOrder || 0) - (b.landingOrder || 0));
}

export function canonicalHrefForTool(tool, baseUrl = 'https://georgehinch.github.io/HakoMachi/') {
  if (!tool) return '';
  const base = String(baseUrl || '').replace(/\/?$/, '/');
  const path = tool.canonicalPath != null ? tool.canonicalPath : tool.path;
  return new URL(path || '.', base).href;
}

export function seoMetadataForTool(tool, baseUrl) {
  if (!tool) return null;
  return {
    title: tool.seoTitle || tool.label,
    description: tool.seoDescription || tool.shortDescription || '',
    canonicalUrl: canonicalHrefForTool(tool, baseUrl),
  };
}

export function seoMetadataForPath(path, baseUrl) {
  return seoMetadataForTool(toolForPath(path), baseUrl);
}

export { TOOL_REGISTRY as HAKOMACHI_TOOL_REGISTRY };

export default TOOL_REGISTRY;
