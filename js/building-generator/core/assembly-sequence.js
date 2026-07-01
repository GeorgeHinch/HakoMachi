export const ASSEMBLY_SEQUENCE_SCHEMA = 'hakomachi.assembly-sequence';
export const ASSEMBLY_SEQUENCE_SCHEMA_VERSION = 1;

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

const PHASES = Object.freeze([
  { id: 'base-floors', order: 10, title: 'Base and floor panels' },
  { id: 'exterior-core', order: 20, title: 'Exterior core walls' },
  { id: 'interior-core', order: 30, title: 'Interior walls and inter-floor panels' },
  { id: 'wing-connections', order: 40, title: 'Wing connections' },
  { id: 'roof-trusses', order: 50, title: 'Roof, parapets, and trusses' },
  { id: 'cladding', order: 60, title: 'Cladding layers' },
  { id: 'trim', order: 70, title: 'Trim and caps' },
  { id: 'details', order: 80, title: 'Details and fixtures' },
  { id: 'review', order: 90, title: 'Review unsupported parts' },
]);

const PHASE_BY_ID = new Map(PHASES.map(phase => [phase.id, phase]));

const DETAIL_ROLES = new Set([
  'window_glass',
  'window_backing',
  'window_inner_frame',
  'window_outer_frame',
  'window_dividers',
  'window_blanking',
  'door_insert',
  'door_glass',
  'door_detail',
  'fixture',
  'awning',
  'balcony',
  'shutter',
  'printed_detail',
  'billboard',
  'skylight',
  'skylight_plexi',
  'skylight_curb',
  'skylight_cap',
]);

function partBlockKey(part) {
  if (!part || part.scope !== 'wing') return 'main';
  return `wing-${Number.isFinite(Number(part.wingIndex)) ? Number(part.wingIndex) + 1 : 'unknown'}`;
}

function partPhaseId(part, incomingRelationships = []) {
  const role = String(part?.role || 'general');
  if (role === 'floor_panel' || role === 'base_panel' || role === 'foundation_panel') return 'base-floors';
  if (role === 'core_wall') return part.area === 'interior' ? 'interior-core' : 'exterior-core';
  if (role === 'interior_wall' || role === 'interior_partition' || role === 'interfloor_panel' || role === 'interior_floor') return 'interior-core';
  if (incomingRelationships.some(rel => rel.type === 'wing-to-main')) return 'wing-connections';
  if (role === 'roof_panel' || role === 'parapet_panel' || role === 'truss' || role === 'truss_support') return 'roof-trusses';
  if (role === 'exterior_cladding' || role === 'interior_cladding' || role === 'cladding_patch' || role === 'roof_cladding') return 'cladding';
  if (role === 'trim' || role === 'ridge_cap' || role === 'fascia' || role === 'soffit') return 'trim';
  if (DETAIL_ROLES.has(role)) return 'details';
  return 'review';
}

function phaseForPart(part, incomingRelationships) {
  return PHASE_BY_ID.get(partPhaseId(part, incomingRelationships)) || PHASE_BY_ID.get('review');
}

function stablePartSort(a, b) {
  return String(a.scope || '').localeCompare(String(b.scope || ''))
    || Number(a.wingIndex ?? -1) - Number(b.wingIndex ?? -1)
    || String(a.role || '').localeCompare(String(b.role || ''))
    || String(a.area || '').localeCompare(String(b.area || ''))
    || String(a.exportRef?.path || '').localeCompare(String(b.exportRef?.path || ''))
    || String(a.id || '').localeCompare(String(b.id || ''));
}

function stepGroupKey(part, phase, incomingRelationships) {
  const block = partBlockKey(part);
  const role = String(part.role || 'general');
  const area = DETAIL_ROLES.has(role) ? 'details' : String(part.area || 'general');
  const relationshipTag = incomingRelationships.some(rel => rel.type === 'wing-to-main') ? 'join' : 'parts';
  return [phase.id, block, role, area, relationshipTag].join('|');
}

function titleCase(value) {
  return String(value || 'parts').replace(/[_-]+/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
}

function stepTitle(parts, phase) {
  const first = parts[0] || {};
  const block = partBlockKey(first) === 'main' ? 'Main block' : titleCase(partBlockKey(first));
  const role = titleCase(first.role || 'parts');
  if (phase.id === 'wing-connections') return `${block} connection`;
  if (parts.length > 1) return `${block}: ${role} group`;
  return `${block}: ${first.name || role}`;
}

function relationshipDirection(rel) {
  if (!rel) return null;
  if (rel.type === 'floor-to-wall') return { before: rel.fromPartId, after: rel.toPartId };
  if (rel.type === 'wall-to-roof') return { before: rel.fromPartId, after: rel.toPartId };
  if (rel.type === 'cladding-to-core') return { before: rel.toPartId, after: rel.fromPartId };
  if (rel.type === 'detail-to-parent') return { before: rel.toPartId, after: rel.fromPartId };
  if (rel.type === 'wing-to-main') return { before: rel.toPartId, after: rel.fromPartId };
  return null;
}

function deterministicStepId(index, phase, parts) {
  const seed = `${phase.id}:${parts.map(part => part.id).join(',')}`;
  return `assembly_step_${String(index + 1).padStart(3, '0')}_${simpleHash(seed)}`;
}

function topoSortSteps(steps, stepDeps, warnings) {
  const remaining = new Map(steps.map(step => [step.id, step]));
  const emitted = [];
  const emittedIds = new Set();
  while (remaining.size) {
    const ready = Array.from(remaining.values())
      .filter(step => Array.from(stepDeps.get(step.id) || []).every(dep => emittedIds.has(dep)))
      .sort((a, b) => a.phaseOrder - b.phaseOrder || a.sortKey.localeCompare(b.sortKey));
    if (!ready.length) {
      warnings.push({
        code: 'assembly.sequenceCycle',
        severity: 'warning',
        message: 'Assembly sequencing found circular or contradictory dependencies; remaining steps were emitted by phase order.',
      });
      emitted.push(...Array.from(remaining.values()).sort((a, b) => a.phaseOrder - b.phaseOrder || a.sortKey.localeCompare(b.sortKey)));
      break;
    }
    const next = ready[0];
    remaining.delete(next.id);
    emitted.push(next);
    emittedIds.add(next.id);
  }
  return emitted.map((step, index) => ({ ...step, order: index + 1 }));
}

export function createAssemblySequence(plan = {}) {
  const warnings = [];
  const parts = Array.isArray(plan.parts) ? cloneJson(plan.parts).sort(stablePartSort) : [];
  const relationships = Array.isArray(plan.relationships) ? cloneJson(plan.relationships) : [];
  const partById = new Map(parts.map(part => [part.id, part]));
  const incomingByPart = new Map();
  const relationshipIdsByStep = new Map();

  if (!parts.length) {
    warnings.push({ code: 'assembly.sequenceNoParts', severity: 'warning', message: 'No assembly parts were available to sequence.' });
  }

  for (const rel of relationships) {
    if (!partById.has(rel.fromPartId) || !partById.has(rel.toPartId)) {
      warnings.push({ code: 'assembly.sequenceMissingRelationshipPart', severity: 'warning', relationshipId: rel.id, message: `Relationship ${rel.id || rel.type || 'unknown'} references a missing part.` });
      continue;
    }
    const direction = relationshipDirection(rel);
    if (!direction) {
      warnings.push({ code: 'assembly.sequenceUnsupportedRelationship', severity: 'info', relationshipId: rel.id, message: `Relationship type ${rel.type || 'unknown'} is not yet sequenced explicitly.` });
      continue;
    }
    if (!incomingByPart.has(direction.after)) incomingByPart.set(direction.after, []);
    incomingByPart.get(direction.after).push(rel);
  }

  const groups = new Map();
  for (const part of parts) {
    const incoming = incomingByPart.get(part.id) || [];
    const phase = phaseForPart(part, incoming);
    const key = stepGroupKey(part, phase, incoming);
    if (!groups.has(key)) groups.set(key, { phase, parts: [] });
    groups.get(key).parts.push(part);
    if (phase.id === 'review') {
      warnings.push({ code: 'assembly.sequenceAmbiguousRole', severity: 'warning', partId: part.id, message: `${part.name || part.id} has role "${part.role || 'general'}"; manual assembly review may be needed.` });
    }
  }

  let provisionalSteps = Array.from(groups.values())
    .map(group => ({ ...group, parts: group.parts.sort(stablePartSort) }))
    .sort((a, b) => a.phase.order - b.phase.order || stablePartSort(a.parts[0], b.parts[0]));

  provisionalSteps = provisionalSteps.map((group, index) => {
    const step = {
      id: deterministicStepId(index, group.phase, group.parts),
      order: index + 1,
      phase: group.phase.id,
      phaseOrder: group.phase.order,
      title: stepTitle(group.parts, group.phase),
      summary: group.parts.length > 1 ? `Install ${group.parts.length} ${titleCase(group.parts[0].role || 'part')} parts.` : `Install ${group.parts[0]?.name || 'part'}.`,
      partIds: group.parts.map(part => part.id),
      parts: group.parts.map(part => ({
        partId: part.id,
        name: part.name || part.id,
        role: part.role || 'general',
        area: part.area || 'general',
        scope: part.scope || 'main',
        wingIndex: part.wingIndex ?? null,
        exportRef: cloneJson(part.exportRef || null),
      })),
      relationshipIds: [],
      dependsOnStepIds: [],
      sortKey: `${String(group.phase.order).padStart(3, '0')}:${group.parts.map(part => part.id).join(',')}`,
    };
    for (const part of group.parts) relationshipIdsByStep.set(part.id, step.id);
    return step;
  });

  const stepDeps = new Map(provisionalSteps.map(step => [step.id, new Set()]));
  const stepByPart = relationshipIdsByStep;
  for (const rel of relationships) {
    const direction = relationshipDirection(rel);
    if (!direction) continue;
    const beforeStep = stepByPart.get(direction.before);
    const afterStep = stepByPart.get(direction.after);
    if (!beforeStep || !afterStep || beforeStep === afterStep) continue;
    stepDeps.get(afterStep)?.add(beforeStep);
    const step = provisionalSteps.find(candidate => candidate.id === afterStep);
    if (step && rel.id) step.relationshipIds.push(rel.id);
  }

  const steps = topoSortSteps(provisionalSteps, stepDeps, warnings).map(step => {
    const dependsOnStepIds = Array.from(stepDeps.get(step.id) || []).sort();
    return {
      id: step.id,
      order: step.order,
      phase: step.phase,
      title: step.title,
      summary: step.summary,
      partIds: step.partIds,
      parts: step.parts,
      relationshipIds: Array.from(new Set(step.relationshipIds)).sort(),
      dependsOnStepIds,
    };
  });

  return {
    schema: ASSEMBLY_SEQUENCE_SCHEMA,
    schemaVersion: ASSEMBLY_SEQUENCE_SCHEMA_VERSION,
    deterministicKey: simpleHash(stableStringify({
      planKey: plan.deterministicKey || null,
      parts: parts.map(part => [part.id, part.role, part.area, part.scope, part.wingIndex, part.exportRef?.path || null]),
      relationships: relationships.map(rel => [rel.id, rel.type, rel.fromPartId, rel.toPartId]).sort(),
    })),
    strategy: 'phase-and-relationship-toposort-v1',
    steps,
    warnings: warnings.sort((a, b) => `${a.code}:${a.partId || a.relationshipId || ''}`.localeCompare(`${b.code}:${b.partId || b.relationshipId || ''}`)),
  };
}
