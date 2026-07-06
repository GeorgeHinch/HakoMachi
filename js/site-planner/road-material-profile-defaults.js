import { PHYSICAL_ROAD_MATERIAL_ROLES, ROAD_MATERIAL_ROLE_FALLBACKS, roadMaterialLibraryCoverage } from './road-material-library-roles.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function materialList(profileOrLibrary = {}) {
  const library = profileOrLibrary.library || profileOrLibrary;
  if (!Array.isArray(library.materials)) library.materials = [];
  return library.materials;
}

function materialExists(materials, id) {
  return materials.some(material => String(material.id || '') === String(id || ''));
}

export function defaultRoadDetailMaterials() {
  return PHYSICAL_ROAD_MATERIAL_ROLES.map(role => ({
    ...clone(ROAD_MATERIAL_ROLE_FALLBACKS[role]),
    role,
    materialRole: role,
    usage: role,
    tags: ['road', 'detail', role],
    virtual: false,
    stockQty: ROAD_MATERIAL_ROLE_FALLBACKS[role].stockQty ?? 0,
    stockUnit: ROAD_MATERIAL_ROLE_FALLBACKS[role].stockUnit || 'sheets',
  }));
}

export function defaultRoadStyleMaterials() {
  return Object.entries(ROAD_MATERIAL_ROLE_FALLBACKS).filter(([, material]) => material.virtual).map(([role, material]) => ({
    ...clone(material),
    role,
    materialRole: role,
    usage: role,
    tags: ['road', 'detail', role],
    virtual: true,
    stockQty: material.stockQty ?? 0,
    stockUnit: material.stockUnit || 'sheets',
  }));
}

export function addRoadDetailMaterialsToLibrary(profileOrLibrary = {}, options = {}) {
  const library = profileOrLibrary.library || profileOrLibrary;
  if (!Array.isArray(library.materials)) library.materials = [];
  const materials = materialList(library);
  const added = [];
  defaultRoadDetailMaterials().forEach(material => {
    if (materialExists(materials, material.id)) return;
    const next = {
      ...material,
      thickness: options.thicknessByRole?.[material.role] ?? material.thickness ?? 0,
      maxWidthMm: options.maxWidthMm ?? material.maxWidthMm ?? 304.8,
      maxHeightMm: options.maxHeightMm ?? material.maxHeightMm ?? 304.8,
      sizeUnit: options.sizeUnit || material.sizeUnit || 'mm',
    };
    materials.push(next);
    added.push(next);
  });
  return { library, added, coverage: roadMaterialLibraryCoverage(library) };
}

export function ensureRoadDetailMaterials(profileOrLibrary = {}, options = {}) {
  return addRoadDetailMaterialsToLibrary(profileOrLibrary, options).library;
}

export function roadDetailMaterialSummary(profileOrLibrary = {}) {
  return roadMaterialLibraryCoverage(profileOrLibrary).map(row => ({
    role: row.role,
    materialId: row.materialId,
    materialName: row.materialName,
    color: row.color,
    status: row.fallback ? 'fallback' : 'profile',
  }));
}
