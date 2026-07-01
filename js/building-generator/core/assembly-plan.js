import {
  exportPartFileStem,
  normalizePartsMetadata,
  normalisePartArea,
  normalisePartRole,
  sanitiseFileName,
} from './part-metadata.js';
import { generateBuilding } from './full-building-generation.js';

export const ASSEMBLY_PLAN_SCHEMA = 'hakomachi.assembly-plan';
export const ASSEMBLY_PLAN_SCHEMA_VERSION = 1;

function cloneJson(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function stableStringify(value) {
  if (value == null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + stableStringify(value[key])).join(',') + '}';
}

function simpleHash(text) {
  let hash = 2166136261;
  const value = String(text || '');
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function uniqueId(base, used) {
  const clean = sanitiseFileName(base || 'part').toLowerCase();
  let id = clean || 'part';
  let n = 2;
  while (used.has(id)) {
    id = `${clean || 'part'}_${String(n).padStart(2, '0')}`;
    n++;
  }
  used.add(id);
  return id;
}

function exportRefForPart(part, usedPaths) {
  if (part && part._exportPath) {
    const path = String(part._exportPath);
    const slash = path.lastIndexOf('/');
    return {
      format: 'svg',
      material: slash >= 0 ? path.slice(0, slash) : sanitiseFileName(part.material || 'misc'),
      fileName: slash >= 0 ? path.slice(slash + 1) : path,
      path,
    };
  }
  const material = sanitiseFileName(part.material || 'misc');
  const stem = exportPartFileStem(part);
  let fileName = `${stem}.svg`;
  let path = `${material}/${fileName}`;
  let n = 2;
  while (usedPaths.has(path)) {
    fileName = `${stem}__${String(n).padStart(2, '0')}.svg`;
    path = `${material}/${fileName}`;
    n++;
  }
  usedPaths.add(path);
  return { format: 'svg', material, fileName, path };
}

function partRecord(part, index, usedIds, usedPaths) {
  const meta = part.meta || {};
  const role = normalisePartRole(meta.role || 'general') || 'general';
  const area = normalisePartArea(meta.area || 'general') || 'general';
  const scope = meta.scope === 'wing' ? 'wing' : 'main';
  const wingIndex = scope === 'wing' && meta.wingIndex != null ? Number(meta.wingIndex) : null;
  const stableBase = part.id || `${scope}_${area}_${role}_${index + 1}`;
  return {
    id: uniqueId(stableBase, usedIds),
    sourcePartId: part.id || null,
    name: part.name || part.id || 'Part',
    role,
    area,
    scope,
    wingIndex,
    material: part.material || 'misc',
    dimensionsMm: {
      width: Number(part.bboxW) || 0,
      height: Number(part.bboxH) || 0,
      offsetX: Number(part.bboxOffsetX) || 0,
      offsetY: Number(part.bboxOffsetY) || 0,
    },
    exportRef: exportRefForPart(part, usedPaths),
    operationCounts: {
      paths: Array.isArray(part.paths) ? part.paths.length : 0,
      rects: Array.isArray(part.rects) ? part.rects.length : 0,
      lines: Array.isArray(part.lines) ? part.lines.length : 0,
    },
    metadata: cloneJson(meta),
    assemblyNote: part.assemblyNote || null,
  };
}

function relationshipId(type, fromId, toId, used) {
  return uniqueId(`${type}_${fromId}_to_${toId}`, used);
}

function addRelationship(list, used, type, fromPart, toPart, confidence, notes) {
  if (!fromPart || !toPart || fromPart.id === toPart.id) return;
  list.push({
    id: relationshipId(type, fromPart.id, toPart.id, used),
    type,
    fromPartId: fromPart.id,
    toPartId: toPart.id,
    confidence,
    notes: notes || '',
  });
}

function sameBlock(a, b) {
  return a && b && a.scope === b.scope && (a.wingIndex ?? null) === (b.wingIndex ?? null);
}

function findFirst(parts, predicate) {
  return parts.find(predicate) || null;
}

function addInferredRelationships(parts, cfg, warnings) {
  const relationships = [];
  const used = new Set();
  const coreWalls = parts.filter(p => p.role === 'core_wall');
  const floorPanels = parts.filter(p => p.role === 'floor_panel' || p.role === 'interfloor_panel');
  const roofPanels = parts.filter(p => p.role === 'roof_panel' || p.role === 'parapet_panel');
  const cladding = parts.filter(p => ['exterior_cladding', 'interior_cladding', 'cladding_patch'].includes(p.role));
  const roofCladding = parts.filter(p => p.role === 'roof_cladding' || p.role === 'ridge_cap' || p.role === 'trim');
  const detailParts = parts.filter(p => ['window_glass', 'window_backing', 'window_inner_frame', 'window_outer_frame', 'window_dividers', 'window_blanking', 'door_insert', 'door_glass', 'door_detail', 'fixture', 'awning', 'balcony', 'shutter', 'printed_detail', 'billboard', 'skylight', 'skylight_plexi', 'skylight_curb', 'skylight_cap'].includes(p.role));

  for (const wall of coreWalls) {
    for (const floor of floorPanels.filter(p => sameBlock(p, wall))) {
      addRelationship(relationships, used, 'floor-to-wall', floor, wall, 'inferred', 'Floor/inter-floor tabs or slots relate this panel to the block core walls.');
    }
    for (const roof of roofPanels.filter(p => sameBlock(p, wall))) {
      addRelationship(relationships, used, 'wall-to-roof', wall, roof, 'inferred', 'Roof panels sit on or slot to the same block core walls.');
    }
  }

  for (const clad of cladding) {
    const target = findFirst(coreWalls, p => sameBlock(p, clad) && (p.area === clad.area || clad.area === 'general')) || findFirst(coreWalls, p => sameBlock(p, clad));
    if (target) addRelationship(relationships, used, 'cladding-to-core', clad, target, 'inferred', 'Cladding role and wall area map this panel back to a core wall.');
    else warnings.push({ code: 'assembly.missingCoreForCladding', severity: 'warning', partId: clad.id, message: `No matching core wall found for ${clad.name}.` });
  }

  for (const clad of roofCladding) {
    const target = findFirst(roofPanels, p => sameBlock(p, clad)) || findFirst(coreWalls, p => sameBlock(p, clad));
    if (target) addRelationship(relationships, used, 'cladding-to-core', clad, target, 'inferred', 'Roof cladding/trim is associated with the roof or nearest core block.');
  }

  for (const detail of detailParts) {
    const target = findFirst(parts, p => sameBlock(p, detail) && p.area === detail.area && ['exterior_cladding', 'interior_cladding', 'core_wall', 'roof_panel'].includes(p.role))
      || findFirst(parts, p => sameBlock(p, detail) && ['exterior_cladding', 'core_wall', 'roof_panel'].includes(p.role));
    if (target) addRelationship(relationships, used, 'detail-to-parent', detail, target, 'inferred', 'Detail part is associated by block and area metadata.');
  }

  const wings = Array.isArray(cfg && cfg.wings) ? cfg.wings : [];
  for (let i = 0; i < wings.length; i++) {
    const wingParts = parts.filter(p => p.scope === 'wing' && p.wingIndex === i);
    const mainFloor = findFirst(parts, p => p.scope === 'main' && (p.role === 'floor_panel' || p.role === 'interfloor_panel'));
    const wingFloor = findFirst(wingParts, p => p.role === 'floor_panel' || p.role === 'interfloor_panel') || wingParts[0];
    if (wingFloor && mainFloor) {
      addRelationship(relationships, used, 'wing-to-main', wingFloor, mainFloor, 'inferred', `Wing ${i + 1} attaches to the main block.`);
    }
  }

  return relationships.sort((a, b) => a.id.localeCompare(b.id));
}

function materialLayers(parts) {
  const groups = new Map();
  for (const part of parts) {
    const key = part.material || 'misc';
    if (!groups.has(key)) groups.set(key, { id: key, partIds: [], roles: new Set() });
    const group = groups.get(key);
    group.partIds.push(part.id);
    group.roles.add(part.role);
  }
  return Array.from(groups.values())
    .map(group => ({ id: group.id, partIds: group.partIds.sort(), roles: Array.from(group.roles).sort() }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

function collectWarnings(parts, sourceParts) {
  const warnings = [];
  sourceParts.forEach((part, index) => {
    const rec = parts[index];
    if (!part.id) warnings.push({ code: 'assembly.missingPartId', severity: 'warning', partId: rec.id, message: `${rec.name} has no source part id; a deterministic fallback id was assigned.` });
    if (!part.name) warnings.push({ code: 'assembly.missingPartName', severity: 'warning', partId: rec.id, message: `${rec.id} has no source part name.` });
    if (!part.material) warnings.push({ code: 'assembly.missingMaterial', severity: 'warning', partId: rec.id, message: `${rec.name} has no material id.` });
    if (!rec.dimensionsMm.width || !rec.dimensionsMm.height) warnings.push({ code: 'assembly.emptyPartBounds', severity: 'warning', partId: rec.id, message: `${rec.name} has incomplete bounding dimensions.` });
    if (rec.role === 'general') warnings.push({ code: 'assembly.ambiguousRole', severity: 'info', partId: rec.id, message: `${rec.name} has a general role; assembly sequencing may need richer metadata.` });
  });
  return warnings;
}

export function createAssemblyPlan(input = {}) {
  const cfg = cloneJson(input.config || {});
  const generation = input.generation || {};
  const sourceParts = normalizePartsMetadata(cloneJson(generation.parts || []));
  const usedIds = new Set();
  const usedPaths = new Set();
  const unsortedParts = sourceParts.map((part, index) => partRecord(part, index, usedIds, usedPaths));
  const warnings = collectWarnings(unsortedParts, sourceParts);
  const parts = unsortedParts.sort((a, b) => a.exportRef.path.localeCompare(b.exportRef.path) || a.id.localeCompare(b.id));
  const relationships = addInferredRelationships(parts, cfg, warnings);
  return {
    schema: ASSEMBLY_PLAN_SCHEMA,
    schemaVersion: ASSEMBLY_PLAN_SCHEMA_VERSION,
    generator: 'HakoMachi Building Generator',
    deterministicKey: simpleHash(stableStringify({ config: cfg, parts: parts.map(p => [p.id, p.exportRef.path, p.role, p.area, p.material]) })),
    source: {
      kind: input.sourceKind || 'generated-building',
      buildingType: cfg.buildingType || null,
      buildingName: cfg.buildingName || cfg.name || null,
      dimensionsMm: {
        width: Number(cfg.width) || null,
        depth: Number(cfg.depth) || null,
        height: Number(cfg.height) || null,
      },
    },
    parts,
    materialLayers: materialLayers(parts),
    relationships,
    warnings: warnings.sort((a, b) => `${a.code}:${a.partId || ''}`.localeCompare(`${b.code}:${b.partId || ''}`)),
  };
}

export function createAssemblyPlanFromConfig(config, opts = {}) {
  const cfg = cloneJson(config || {});
  const generation = opts.generation || generateBuilding(cfg);
  return createAssemblyPlan({ config: cfg, generation, sourceKind: opts.sourceKind || 'hako-config' });
}
