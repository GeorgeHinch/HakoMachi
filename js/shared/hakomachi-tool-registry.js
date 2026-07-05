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
    description: 'HakoMachi is a browser-based toolkit for planning Japanese N gauge streetscapes and generating 1:150 laser-cut buildings, railings, shelves, crates, and scenic details.',
    landing: false,
  }),
  Object.freeze({
    key: 'sitePlanner',
    appKey: 'site_planner',
    path: 'site-planner.html',
    group: 'primary',
    label: 'Site Planner',
    seoTitle: 'HakoMachi Site Planner',
    description: 'Lay out roads, sidewalks, benchwork, traced pads, and building metadata before committing parts to material.',
    landing: true,
    landingOrder: 10,
  }),
  Object.freeze({
    key: 'buildingGenerator',
    appKey: 'building_generator',
    path: 'building-generator.html',
    group: 'primary',
    label: 'Building Generator',
    seoTitle: 'HakoMachi Building Generator',
    description: 'Design individual 1:150 buildings and export sorted SVG cut sheets with tongue-and-slot joinery.',
    landing: true,
    landingOrder: 20,
  }),
  Object.freeze({
    key: 'industrialShelfGenerator',
    appKey: 'utility_industrial_shelf',
    path: 'utils/industrial-shelf-generator.html',
    group: 'utility',
    label: 'Industrial Shelf Generator',
    seoTitle: 'HakoMachi Industrial Shelf Generator',
    description: 'Create laser-cut shelving, cabinets, lockers, and utility box detail parts.',
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
    description: 'Manage reusable stock material profiles for generator assignments, sheet sizing, and GitHub data sync.',
    landing: true,
    landingOrder: 120,
  }),
  Object.freeze({
    key: 'safetyRailingGenerator',
    appKey: 'utility_safety_railing',
    path: 'utils/safety-railing-generator.html',
    group: 'utility',
    label: 'Safety Railing Generator',
    seoTitle: 'HakoMachi Safety Railing Generator',
    description: 'Generate flat SVG railing runs with tab-and-slot base joinery.',
    landing: true,
    landingOrder: 130,
  }),
  Object.freeze({
    key: 'woodenCrateGenerator',
    appKey: 'utility_wooden_crate',
    path: 'utils/wooden-crate-generator.html',
    group: 'utility',
    label: 'Wooden Crate Generator',
    seoTitle: 'HakoMachi Wooden Crate Generator',
    description: 'Build 1:150 crate parts with structural cores, plank cladding, and raised bracing.',
    landing: true,
    landingOrder: 140,
  }),
]);

const byPath = new Map();
const byAppKey = new Map();
TOOL_REGISTRY.forEach(tool => {
  byAppKey.set(tool.appKey, tool);
  [tool.path, tool.canonicalPath].filter(Boolean).forEach(path => {
    byPath.set(normalizeToolPath(path), tool);
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

export { TOOL_REGISTRY as HAKOMACHI_TOOL_REGISTRY };

export default TOOL_REGISTRY;
