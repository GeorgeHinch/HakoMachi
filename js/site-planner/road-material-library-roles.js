const ROAD_MATERIAL_ROLE_ALIASES = Object.freeze({
  roadMarkingWhite: Object.freeze(['road-marking-white', 'road_marking_white', 'marking-white', 'paint-white', 'white-paint', 'white']),
  roadMarkingYellow: Object.freeze(['road-marking-yellow', 'road_marking_yellow', 'marking-yellow', 'paint-yellow', 'yellow-paint', 'yellow']),
  roadHatchDark: Object.freeze(['road-hatch-dark', 'road_hatch_dark', 'hatch-dark', 'manhole', 'utility-cover', 'dark-cover', 'dark']),
  roadTactileYellow: Object.freeze(['road-tactile-yellow', 'road_tactile_yellow', 'tactile-yellow', 'tactile-paving', 'warning-tile']),
  roadCurbGuide: Object.freeze(['road-curb-guide', 'road_curb_guide', 'curb-guide', 'guide-etch']),
  stencilStock: Object.freeze(['stencil-stock', 'stencil_stock', 'masking-film', 'masking', 'acetate', 'cardstock', 'stencil-sheet']),
});

const DEFAULT_ROLE_FALLBACKS = Object.freeze({
  roadMarkingWhite: Object.freeze({ id: 'road-marking-white', name: 'Road marking white', colour: '#f7f2df', thickness: 0, virtual: true }),
  roadMarkingYellow: Object.freeze({ id: 'road-marking-yellow', name: 'Road marking yellow', colour: '#f7c84a', thickness: 0, virtual: true }),
  roadHatchDark: Object.freeze({ id: 'road-hatch-dark', name: 'Road hatch/grate stock', colour: '#3a2b1e', thickness: 0.2, physical: true }),
  roadTactileYellow: Object.freeze({ id: 'road-tactile-yellow', name: 'Road tactile yellow', colour: '#d8b95a', thickness: 0, virtual: true }),
  roadCurbGuide: Object.freeze({ id: 'road-curb-guide', name: 'Road curb guide', colour: '#8a765f', thickness: 0, virtual: true }),
  stencilStock: Object.freeze({ id: 'stencil-stock', name: 'Paint stencil stock', colour: '#d7d2c4', thickness: 0.1, physical: true }),
});

const PHYSICAL_ROAD_MATERIAL_ROLES = Object.freeze(['roadHatchDark', 'stencilStock']);

function cleanToken(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function materialList(materialLibraryOrProfile = {}) {
  const library = materialLibraryOrProfile.library || materialLibraryOrProfile;
  return Array.isArray(library.materials) ? library.materials : [];
}

function materialMatchesRole(material, role) {
  if (!material || !role) return false;
  const aliases = new Set([role, ...(ROAD_MATERIAL_ROLE_ALIASES[role] || [])].map(cleanToken));
  const tokens = [
    material.id,
    material.name,
    material.role,
    material.materialRole,
    material.usage,
    ...(Array.isArray(material.tags) ? material.tags : []),
  ].map(cleanToken).filter(Boolean);
  return tokens.some(token => aliases.has(token));
}

export function roadMaterialRoleForPreset(preset = {}) {
  if (preset.materialRole) return preset.materialRole;
  if (preset.outputMode === 'paintStencil' || preset.cutBehavior === 'paintStencil') return 'stencilStock';
  if (preset.materialId) return preset.materialId;
  if (preset.key === 'noParkingCurbDash' || preset.color === '#f7c84a') return 'roadMarkingYellow';
  if (preset.exportLayer === 'roadHatchCut' || preset.kind === 'manhole' || preset.hatchPreset) return 'roadHatchDark';
  if (preset.exportLayer === 'roadTactileEtch' || preset.kind === 'tactile') return 'roadTactileYellow';
  if (preset.exportLayer === 'roadCurbGuide' || preset.kind === 'curbGuide') return 'roadCurbGuide';
  return 'roadMarkingWhite';
}

export function findRoadMaterial(materialLibraryOrProfile, roleOrId) {
  const role = String(roleOrId || '').trim();
  const materials = materialList(materialLibraryOrProfile);
  const byExactId = materials.find(material => cleanToken(material.id) === cleanToken(role));
  if (byExactId) return byExactId;
  const byRole = materials.find(material => materialMatchesRole(material, role));
  if (byRole) return byRole;
  return DEFAULT_ROLE_FALLBACKS[role] || null;
}

export function resolveRoadPresetMaterial(preset = {}, materialLibraryOrProfile = {}) {
  const role = roadMaterialRoleForPreset(preset);
  const material = findRoadMaterial(materialLibraryOrProfile, preset.materialId || role);
  return {
    materialRole: role,
    materialId: material?.id || preset.materialId || role,
    materialName: material?.name || preset.materialName || role,
    material,
    color: material?.colour || material?.color || preset.color || '#f7f2df',
    thicknessMm: Number(material?.thickness) || 0,
    exportLayer: preset.exportLayer,
  };
}

export function applyRoadMaterialToFeature(feature = {}, materialLibraryOrProfile = {}) {
  const resolved = resolveRoadPresetMaterial(feature, materialLibraryOrProfile);
  return {
    ...feature,
    materialRole: resolved.materialRole,
    materialId: resolved.materialId,
    materialName: resolved.materialName,
    materialThicknessMm: resolved.thicknessMm,
    color: resolved.color,
  };
}

export function roadMaterialRoleSelectOptions(options = {}) {
  const roles = options.includeStyleRoles ? Object.keys(ROAD_MATERIAL_ROLE_ALIASES) : PHYSICAL_ROAD_MATERIAL_ROLES;
  return roles.map(role => ({
    value: role,
    label: DEFAULT_ROLE_FALLBACKS[role]?.name || role,
    fallbackColor: DEFAULT_ROLE_FALLBACKS[role]?.colour || '#aaaaaa',
    aliases: ROAD_MATERIAL_ROLE_ALIASES[role],
  }));
}

export function roadMaterialLibraryCoverage(materialLibraryOrProfile = {}) {
  return roadMaterialRoleSelectOptions().map(option => {
    const material = findRoadMaterial(materialLibraryOrProfile, option.value);
    return {
      role: option.value,
      label: option.label,
      materialId: material?.id || '',
      materialName: material?.name || '',
      color: material?.colour || material?.color || option.fallbackColor,
      fallback: Boolean(material?.virtual),
    };
  });
}

export { DEFAULT_ROLE_FALLBACKS as ROAD_MATERIAL_ROLE_FALLBACKS, PHYSICAL_ROAD_MATERIAL_ROLES, ROAD_MATERIAL_ROLE_ALIASES };
