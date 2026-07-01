/* =====================================================================
   PART FACTORY + METADATA
   ---------------------------------------------------------------------
   Transitional metadata layer. Most existing generators still return raw
   part objects, but everything now gets normalized into a consistent shape:
     part.meta.scope      = 'main' | 'wing'
     part.meta.wingIndex  = null | 0-based index
     part.meta.area       = front/back/east/west/roof/floor/...
     part.meta.role       = canonical role used by export filenames
   New generators should prefer createPart({...}) directly.
   ===================================================================== */

export const PART_ROLE_LABELS = {
  core_wall: 'Core_Wall',
  exterior_cladding: 'Exterior_Cladding',
  interior_cladding: 'Interior_Cladding',
  cladding_patch: 'Cladding_Patch',
  floor_panel: 'Floor_Panel',
  interfloor_panel: 'Interfloor_Panel',
  roof_panel: 'Roof_Panel',
  roof_cladding: 'Roof_Cladding',
  ridge_cap: 'Ridge_Cap',
  parapet_panel: 'Parapet_Panel',
  skylight: 'Skylight',
  skylight_plexi: 'Skylight_Plexi',
  skylight_curb: 'Skylight_Curb',
  skylight_cap: 'Skylight_Cap',
  window_glass: 'Window_Glass',
  window_backing: 'Window_Backing',
  window_inner_frame: 'Window_Inner_Frame',
  window_outer_frame: 'Window_Outer_Frame',
  window_dividers: 'Window_Dividers',
  window_blanking: 'Window_Blanking',
  door_insert: 'Door_Insert',
  door_glass: 'Door_Glass',
  door_detail: 'Door_Detail',
  truss: 'Truss',
  column_marks: 'Column_Marks',
  support: 'Support',
  trim: 'Trim',
  interior_wall: 'Interior_Wall',
  fixture: 'Fixture',
  awning: 'Awning',
  balcony: 'Balcony',
  shutter: 'Shutter',
  printed_detail: 'Printed_Detail',
  billboard: 'Billboard',
  general: 'General',
};

export const PART_AREA_LABELS = {
  front: 'Front',
  back: 'Back',
  east: 'East',
  west: 'West',
  roof: 'Roof',
  floor: 'Floor',
  interior_walls: 'Interior_Walls',
  structure: 'Structure',
  detail_parts: 'Detail_Parts',
  general: 'General',
};

export function normalisePartRole(role) {
  if (!role) return null;
  return String(role).trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function partRoleLabel(role) {
  const key = normalisePartRole(role);
  return PART_ROLE_LABELS[key] || sanitiseFileName(role || 'Part');
}

export function normalisePartArea(area) {
  if (!area) return null;
  return String(area).trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function partAreaLabel(area) {
  const key = normalisePartArea(area);
  return PART_AREA_LABELS[key] || sanitiseFileName(area || 'General');
}

export function createPart(spec = {}) {
  const p = {
    id: spec.id || ('part_' + Date.now()),
    name: spec.name || spec.id || 'Part',
    material: spec.material || 'core',
    bboxW: Number(spec.bboxW) || 0,
    bboxH: Number(spec.bboxH) || 0,
    bboxOffsetX: Number(spec.bboxOffsetX) || 0,
    bboxOffsetY: Number(spec.bboxOffsetY) || 0,
    paths: Array.isArray(spec.paths) ? spec.paths : [],
    rects: Array.isArray(spec.rects) ? spec.rects : [],
    lines: Array.isArray(spec.lines) ? spec.lines : [],
    meta: { ...(spec.meta || {}) },
  };

  // Preserve optional fields used by downstream render/export systems.
  for (const [k, v] of Object.entries(spec)) {
    if (!(k in p) && v !== undefined) p[k] = v;
  }

  return normalizePartMetadata(p, spec.meta || {});
}

export function inferPartArea(part) {
  const metaArea = part && part.meta && part.meta.area;
  if (metaArea) return normalisePartArea(metaArea);

  const id = ((part && part.id) || '').toLowerCase();
  const name = ((part && part.name) || '').toLowerCase();
  const wi = typeof wallFromPartId === 'function' ? wallFromPartId(id) : null;
  if (wi && wi.wall) return wi.wall;

  const lower = id + ' ' + name;
  if (lower.includes('roof') || lower.includes('skylight') || lower.includes('ridge cap')) return 'roof';
  if (lower.includes('floor')) return 'floor';
  if (lower.includes('internal wall') || lower.includes('iwall') || lower.includes('dividing')) return 'interior_walls';
  if (lower.includes('truss') || lower.includes('column') || lower.includes('support')) return 'structure';
  if (lower.includes('window') || lower.includes('door') || lower.includes('fixture') ||
      lower.includes('shutter') || lower.includes('printed') || lower.includes('awning') ||
      lower.includes('balcony') || lower.includes('billboard')) return 'detail_parts';
  return 'general';
}

export function inferPartRole(part) {
  const metaRole = part && part.meta && part.meta.role;
  if (metaRole) return normalisePartRole(metaRole);

  const id = ((part && part.id) || '').toLowerCase();
  const name = ((part && part.name) || '').toLowerCase();

  if (/^(front_wall|back_wall|side_wall_)/.test(id)) return 'core_wall';
  if (id.includes('interior_cladding')) return 'interior_cladding';
  if (id.includes('cladding') && name.includes('patch')) return 'cladding_patch';
  if (id.includes('cladding_roof') || id.includes('roof_cladding')) return 'roof_cladding';
  if (id.includes('cladding')) return 'exterior_cladding';

  if (id === 'floor' || id.startsWith('floor_')) return 'floor_panel';
  if (id.includes('inter_floor') || id.includes('interfloor')) return 'interfloor_panel';
  if (id.includes('ridge_cap') || name.includes('ridge cap')) return 'ridge_cap';
  if (id.includes('parapet')) return 'parapet_panel';
  if (id.includes('roof')) return 'roof_panel';

  if (id.includes('skylight')) {
    if (id.includes('plexi') || name.includes('plexi')) return 'skylight_plexi';
    if (id.includes('curb') || name.includes('curb')) return 'skylight_curb';
    if (id.includes('cap') || name.includes('cap')) return 'skylight_cap';
    return 'skylight';
  }

  if (id.includes('window_glass') || name.includes('window glass')) return 'window_glass';
  if (id.includes('window_back') || name.includes('window backing') || name.includes('black backing')) return 'window_backing';
  if (id.includes('window_inner') || name.includes('inner frame')) return 'window_inner_frame';
  if (id.includes('window_external') || name.includes('external frame')) return 'window_outer_frame';
  if (id.includes('window_divider') || name.includes('divider') || name.includes('mullion')) return 'window_dividers';
  if (id.includes('blank') && id.includes('window')) return 'window_blanking';

  if (id.includes('door_insert') || name.includes('door insert')) return 'door_insert';
  if (id.includes('door_glass') || name.includes('door glass')) return 'door_glass';
  if (id.includes('door')) return 'door_detail';

  if (id.includes('truss')) return 'truss';
  if (id.includes('column')) return 'column_marks';
  if (id.includes('support')) return 'support';
  if (id.includes('trim')) return 'trim';
  if (id.includes('internal_wall') || id.includes('iwall') || name.includes('internal wall') || name.includes('dividing wall')) return 'interior_wall';

  if (id.includes('fixture') || name.includes('fixture')) return 'fixture';
  if (id.includes('awning') || name.includes('awning')) return 'awning';
  if (id.includes('balcony') || name.includes('balcony')) return 'balcony';
  if (id.includes('shutter') || name.includes('shutter')) return 'shutter';
  if (id.includes('printed') || name.includes('printed')) return 'printed_detail';
  if (id.includes('billboard') || name.includes('billboard')) return 'billboard';

  return 'general';
}

export function inferPartScope(part) {
  const meta = (part && part.meta) || {};
  if (meta.scope) return meta.scope === 'wing' ? 'wing' : 'main';

  const id = ((part && part.id) || '');
  const name = ((part && part.name) || '');
  return (id.match(/_wing\d+/) || name.match(/\bWing\s+\d+\b/i)) ? 'wing' : 'main';
}

export function inferPartWingIndex(part) {
  const meta = (part && part.meta) || {};
  if (meta.wingIndex != null && isFinite(Number(meta.wingIndex))) return Number(meta.wingIndex);

  const id = ((part && part.id) || '');
  const name = ((part && part.name) || '');
  const idM = id.match(/_wing(\d+)/);
  if (idM) return parseInt(idM[1], 10);
  const nameM = name.match(/\bWing\s+(\d+)\b/i);
  if (nameM) return Math.max(0, parseInt(nameM[1], 10) - 1);
  return null;
}

export function normalizePartMetadata(part, extra = {}) {
  if (!part) return part;
  if (!part.meta) part.meta = {};
  Object.assign(part.meta, extra || {});

  const scope = inferPartScope(part);
  const wingIndex = inferPartWingIndex(part);
  part.meta.scope = scope;
  part.meta.wingIndex = scope === 'wing' ? wingIndex : null;
  part.meta.area = normalisePartArea(part.meta.area || inferPartArea(part));
  part.meta.role = normalisePartRole(part.meta.role || inferPartRole(part));

  if (!Array.isArray(part.paths)) part.paths = [];
  if (!Array.isArray(part.rects)) part.rects = [];
  if (!Array.isArray(part.lines)) part.lines = [];
  if (part.bboxOffsetX == null) part.bboxOffsetX = 0;
  if (part.bboxOffsetY == null) part.bboxOffsetY = 0;

  return part;
}

export function normalizePartsMetadata(parts) {
  for (const p of (parts || [])) normalizePartMetadata(p);
  return parts || [];
}

export function applyPartMeta(part, meta = {}) {
  return normalizePartMetadata(part, meta);
}

export function exportPartScopeInfo(part) {
  normalizePartMetadata(part);
  const meta = (part && part.meta) || {};
  if (meta.scope !== 'wing') {
    return { folder: '00_Main', label: 'Main', sortLabel: 'Main' };
  }
  const n = (meta.wingIndex != null ? Number(meta.wingIndex) + 1 : 1);
  const nn = String(n).padStart(2, '0');
  return {
    folder: `${nn}_Wing_${nn}`,
    label: `Wing_${nn}`,
    sortLabel: `Wing ${nn}`,
  };
}

export function exportPartWallInfo(part) {
  normalizePartMetadata(part);
  const area = normalisePartArea(part && part.meta && part.meta.area);
  const wallMap = {
    front: { label: 'Front', sort: '01_Front' },
    back:  { label: 'Back',  sort: '02_Back'  },
    east:  { label: 'East',  sort: '03_East'  },
    west:  { label: 'West',  sort: '04_West'  },
    roof:  { label: 'Roof',  sort: '05_Roof'  },
    floor: { label: 'Floor', sort: '06_Floor' },
    interior_walls: { label: 'Interior_Walls', sort: '07_Interior_Walls' },
    structure: { label: 'Structure', sort: '08_Structure' },
    detail_parts: { label: 'Detail_Parts', sort: '09_Detail_Parts' },
    general: { label: 'General', sort: '00_General' },
  };
  if (wallMap[area]) return wallMap[area];
  return { label: partAreaLabel(area), sort: '00_' + partAreaLabel(area) };
}

export function sanitiseFileName(str) {
  return (str || 'part')
    .trim()
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'part';
}

export function exportCleanPartName(str) {
  return (str || 'Part')
    // Remove common UI-only suffixes/notes so export names stay stable.
    .replace(/\s+—\s+layout cut\b/ig, '')
    .replace(/\s+\(\d+×.*?\)$/g, '')
    .replace(/\s+\(\d+\s*x.*?\)$/ig, '')
    .replace(/\s+\([^)]*trim offset[^)]*\)$/ig, '')
    .replace(/\s+\([^)]*slots into[^)]*\)$/ig, '')
    .replace(/\bWing\s+\d+\s+/ig, '')
    .replace(/\bMain\s+/ig, '')
    .replace(/\b(front|back|east|west)\s+/ig, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/* Canonical part-name mechanism for export filenames.
 * The filename already includes scope and wall/area:
 *   Main_Front_<PartName>.svg
 *   Wing_01_Roof_<PartName>.svg
 *
 * This helper makes <PartName> consistent and avoids duplicating scope/wall
 * text that may already be embedded in part.name from older generators.
 */
export function exportPartRoleInfo(part) {
  normalizePartMetadata(part);
  const role = part && part.meta && part.meta.role;
  return { label: partRoleLabel(role || 'general') };
}

export function exportPartFileStem(part) {
  const scope = exportPartScopeInfo(part);
  const wall = exportPartWallInfo(part);
  const role = exportPartRoleInfo(part);

  return [
    scope.label,
    wall.label,
    role.label,
  ].map(sanitiseFileName).filter(Boolean).join('_');
}

export function exportPartZipPath(part, folderForMat, usedPaths) {
  const scope = exportPartScopeInfo(part);
  const wall = exportPartWallInfo(part);

  // Honour per-part material reassignment from the parts panel.
  const matId = MaterialRegistry.partMaterial(part, part && part.material, CONFIG);
  const materialFolder = sanitiseFolderName(folderForMat(matId));
  // Required export convention:
  //   <MaterialFolder>/<Main|Wing_XX>_<Wall>_<CanonicalPartName>.svg
  let fileName = `${exportPartFileStem(part)}.svg`;
  let path = `${materialFolder}/${fileName}`;

  if (usedPaths[path]) {
    const base = fileName.replace(/\.svg$/i, '');
    let n = usedPaths[path] + 1;
    do {
      fileName = `${base}__${String(n).padStart(2, '0')}.svg`;
      path = `${materialFolder}/${fileName}`;
      n++;
    } while (usedPaths[path]);
    usedPaths[path] = 1;
  } else {
    usedPaths[path] = 1;
  }
  return path;
}

/* Export ZIP */
async function exportZip() {
  readForm();
  const result = generateBuilding(CONFIG);
  normalizePartsMetadata(result.parts);

  // Pre-flight: verify each tongue has a matching slot.
  const verify = verifyTongueSlotMatch(result.parts, result.plan.matT);
  if (verify.issues.length > 0) {
    console.warn('[HakoMachi] Tongue/slot consistency check reported issues during export:', verify.issues);
  }

  result.parts = applySheetSplittingToParts(result.parts, CONFIG);
  normalizePartsMetadata(result.parts);

  const zip = new JSZip();

  // Names for reimportable support files bundled in the ZIP.
  const hakoName = `building_${CONFIG.buildingType}_${CONFIG.width}x${CONFIG.depth}x${CONFIG.height}.hako`;
  const matLibName = `material_library_${CONFIG.buildingType}_${CONFIG.width}x${CONFIG.depth}x${CONFIG.height}.hakomaterial`;

  // Build a lookup: material id → sanitised top-level folder name.
  const matFolders = {};
  for (const mat of MaterialRegistry.list(CONFIG)) {
    matFolders[mat.id] = MaterialRegistry.folderName(mat.id, CONFIG);
  }
  // Guarantee common built-in keys even if they're missing from CONFIG.materials.
  if (!matFolders.core)     matFolders.core     = 'core';
  if (!matFolders.cladding) matFolders.cladding = 'cladding';
  if (!matFolders.window)   matFolders.window   = 'windows';
  if (!matFolders.backing)  matFolders.backing  = 'backing';
  if (!matFolders.printed)  matFolders.printed  = 'printed';

  const folderForMat = (matId) => matFolders[matId] || sanitiseFolderName(matId || 'misc');

  // SVG parts → one top-level folder per material:
  //   <MaterialFolder>/Main_Front_Core_Wall.svg
  //   <MaterialFolder>/Wing_01_Back_Exterior_Cladding.svg
  // If two files would collide, a numeric suffix is appended.
  const usedExportPaths = {};
  const exportRows = [];
  for (const part of result.parts) {
    const svg = partToSvg(part, { strokeMm: 0.05, kerf: CONFIG.kerfComp });
    const exportPath = exportPartZipPath(part, folderForMat, usedExportPaths);
    zip.file(exportPath, svg);
    part._exportPath = exportPath;
    exportRows.push({ part, exportPath });
  }

  // --- README manifest ---
  let manifest = `# HakoMachi — Output Manifest\n\n`;
  manifest += `Building type: ${BUILDING_TYPES[CONFIG.buildingType].label}\n`;
  manifest += `Outer dimensions: ${CONFIG.width} × ${CONFIG.depth} × ${CONFIG.height} mm\n`;
  manifest += `Real-world (1:150): ${(CONFIG.width*0.15).toFixed(1)} × ${(CONFIG.depth*0.15).toFixed(1)} × ${(CONFIG.height*0.15).toFixed(1)} m\n`;
  const splitCount = result.parts.filter(p => p && p.meta && p.meta.sheetSplit).length;
  if (splitCount) manifest += `Sheet-split wall segments: ${splitCount} (core-wall splits include interior splice plates where needed)\n`;
  manifest += `\n`;

  // Group parts by exported material folder for the manifest.
  const byFolder = {};
  for (const row of exportRows) {
    const folder = row.exportPath.split('/')[0];
    if (!byFolder[folder]) byFolder[folder] = [];
    byFolder[folder].push(row);
  }
  manifest += `## Parts by material folder\n\n`;
  manifest += `SVG files are exported as \`Material folder → Main/Wing_Wall_PartName.svg\`.\n\n`;
  for (const [folder, rows] of Object.entries(byFolder).sort()) {
    manifest += `### ${folder}/\n`;
    for (const row of rows.sort((a, b) => a.exportPath.localeCompare(b.exportPath))) {
      const p = row.part;
      const file = row.exportPath.split('/').pop();
      manifest += `- ${file} — ${p.name} (${p.bboxW.toFixed(1)} × ${p.bboxH.toFixed(1)} mm)\n`;
    }
    manifest += '\n';
  }
  manifest += `## Colour legend\n- Red (#ff0000): retained through-cut\n- Green (#00ff00): scrap / discard through-cut\n- Blue (#0000ff): score / etch only\n`;
  manifest += `\n## Reimport files\n`;
  manifest += `- Building settings: \`${hakoName}\`\n`;
  manifest += `- Material library: \`${matLibName}\`\n`;

  // Rooftop equipment STLs
  const equipReq = CONFIG.rooftopEquipment || {};
  const usedKeys = Object.keys(equipReq).filter(k => (equipReq[k] || 0) > 0 && ROOFTOP_EQUIPMENT[k]);
  if (usedKeys.length > 0) {
    manifest += `\n## Rooftop equipment (3D-printable STLs)\n`;
    const placed = result.plan.rooftopEquipPlacements || [];
    const placedByKey = {};
    for (const p of placed) placedByKey[p.key] = (placedByKey[p.key] || 0) + 1;
    for (const k of usedKeys) {
      const eq = ROOFTOP_EQUIPMENT[k];
      const requested = equipReq[k];
      const placedN = placedByKey[k] || 0;
      const note = (placedN < requested) ? ` ⚠ Only ${placedN} fit on the roof.` : '';
      manifest += `- **${eq.label}** — ${requested} requested${note}\n`;
      manifest += `  - File: \`equipment_${k}.stl\` (${eq.w}×${eq.d}×${eq.h}mm)\n`;
      manifest += `  - ${eq.description}\n`;
      const eqTris = generateEquipmentStl(k);
      if (eqTris) zip.folder('equipment').file('equipment_' + k + '.stl', eqTris.toBinaryStl());
    }
  }
  if (CONFIG.rooftopMechRoom && result.plan.mechRoom) {
    manifest += `\n## Rooftop mechanical room\nCore parts are under the appropriate Main/Wing roof or detail folders. Tongue-and-slot into the roof panel.\n`;
  }

  manifest += `\n## Settings\n` + JSON.stringify(CONFIG, null, 2);
  zip.file('README.md', manifest);

  // Bundle the project's settings as a .hako file so the user can re-import
  // it later via the three-dot menu's "Import settings" option. Same JSON
  // payload as exportConfigFile() writes; just placed inside the zip.
  zip.file(hakoName, JSON.stringify(serializableCurrentConfig(CONFIG), null, 2));

  // Bundle the material library too, so a ZIP contains both the building
  // design and the reusable material setup. This is the same payload as the
  // Materials panel's "Download material library" button.
  zip.file(matLibName, JSON.stringify(materialLibraryPayload(), null, 2));

  // ---- 3D preview STL ----
  try {
    const tris = generateBuildingStl(CONFIG);
    if (tris && tris.tris && tris.tris.length > 0) {
      zip.file('preview_3d.stl', tris.toBinaryStl());
    }
  } catch (e) {
    console.warn('STL generation failed, skipping:', e);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `building_${CONFIG.buildingType}_${CONFIG.width}x${CONFIG.depth}x${CONFIG.height}.zip`;
  a.click();
  URL.revokeObjectURL(a.href);
}
