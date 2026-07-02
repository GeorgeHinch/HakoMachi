export const ASSEMBLY_ILLUSTRATIONS_SCHEMA = 'hakomachi.assembly-illustrations';
export const ASSEMBLY_ILLUSTRATIONS_SCHEMA_VERSION = 1;

const VIEWBOX = Object.freeze({ width: 720, height: 420 });
const CAMERA = Object.freeze({
  projection: 'orthographic-diagram',
  orientation: 'front-top-stable',
  viewBox: `0 0 ${VIEWBOX.width} ${VIEWBOX.height}`,
  scaleStrategy: 'role-area-layout-v1',
});

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

function esc(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function titleCase(value) {
  return String(value || 'part').replace(/[_-]+/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
}

function shortLabel(value, limit = 24) {
  const text = String(value || '').trim();
  return text.length <= limit ? text : text.slice(0, limit - 1).trimEnd() + '...';
}

function readableToken(value) {
  return titleCase(String(value || '').replace(/^core_/, '').replace(/^exterior_/, ''));
}

function orientationLabel(part) {
  const areaMap = {
    front: 'Front face',
    back: 'Back face',
    east: 'Right face',
    right: 'Right face',
    west: 'Left face',
    left: 'Left face',
    roof: 'Roof',
    floor: 'Floor plate',
    interior: 'Interior',
  };
  const parts = [];
  const area = String(part?.area || '');
  const role = String(part?.role || '');
  if (areaMap[area]) parts.push(areaMap[area]);
  else if (area && area !== 'general') parts.push(readableToken(area));
  else if (role) parts.push(readableToken(role));
  if (part?.scope === 'wing') {
    const n = Number.isFinite(Number(part.wingIndex)) ? Number(part.wingIndex) + 1 : null;
    parts.push(n ? `Wing ${n}` : 'Wing');
  }
  return parts.filter(Boolean).join(' · ');
}

function relationshipLabel(rel) {
  if (!rel) return '';
  const type = readableToken(rel.type || 'joint');
  const note = shortLabel(rel.notes || '', 42);
  return note ? `${type}: ${note}` : type;
}

function relationshipMap(plan) {
  return new Map((Array.isArray(plan?.relationships) ? plan.relationships : []).map(rel => [rel.id, rel]));
}

function calloutDetailLines(part, step, plan, relationshipsById) {
  const lines = [];
  const orientation = orientationLabel(part);
  if (orientation) lines.push(orientation);
  const material = part?.exportRef?.material || part?.material;
  if (material) lines.push(`Sheet: ${material}`);

  const stepRelationships = (Array.isArray(step?.relationshipIds) ? step.relationshipIds : [])
    .map(id => relationshipsById.get(id))
    .filter(rel => rel && (rel.fromPartId === part?.id || rel.toPartId === part?.id));
  if (stepRelationships[0]) lines.push(relationshipLabel(stepRelationships[0]));

  if (part?.assemblyNote) lines.push(`Note: ${shortLabel(part.assemblyNote, 46)}`);
  return lines.filter(Boolean).slice(0, 4);
}

function phaseColor(phase) {
  const colors = {
    'base-floors': '#5b8a72',
    'exterior-core': '#2a64aa',
    'interior-core': '#7c66a8',
    'wing-connections': '#94633d',
    'roof-trusses': '#8a5b4f',
    cladding: '#b85b3d',
    trim: '#4e7e91',
    details: '#7a6a2f',
    review: '#767676',
  };
  return colors[phase] || '#2a64aa';
}

function stepPartIds(step) {
  if (!step) return [];
  if (Array.isArray(step.partIds)) return step.partIds.slice();
  return (Array.isArray(step.parts) ? step.parts : []).map(part => part.partId).filter(Boolean);
}

function completedIdsBefore(steps, stepIndex) {
  const ids = [];
  for (let i = 0; i < stepIndex; i++) ids.push(...stepPartIds(steps[i]));
  return Array.from(new Set(ids));
}

function visualSize(part) {
  const dims = part?.dimensionsMm || {};
  const role = String(part?.role || '');
  const w = Number(dims.width) || 34;
  const h = Number(dims.height) || 22;
  const baseW = Math.max(28, Math.min(170, w * 1.35));
  const baseH = Math.max(14, Math.min(105, h * 1.15));
  if (role.includes('wall') || role.includes('cladding')) return { w: Math.max(baseW, 80), h: Math.max(14, Math.min(76, baseH)) };
  if (role.includes('floor') || role.includes('roof')) return { w: Math.max(baseW, 96), h: Math.max(34, Math.min(100, baseH * 0.72)) };
  if (role.includes('window') || role.includes('door') || role.includes('detail') || role.includes('fixture')) return { w: Math.max(28, Math.min(64, baseW * 0.45)), h: Math.max(18, Math.min(48, baseH * 0.55)) };
  return { w: baseW, h: baseH };
}

function wingOffset(part) {
  if (part?.scope !== 'wing') return { x: 0, y: 0 };
  const idx = Number.isFinite(Number(part.wingIndex)) ? Number(part.wingIndex) : 0;
  const direction = idx % 2 === 0 ? 1 : -1;
  return { x: direction * (120 + Math.floor(idx / 2) * 55), y: 32 + Math.floor(idx / 2) * 28 };
}

function areaAnchor(part, index) {
  const area = String(part?.area || 'general');
  const role = String(part?.role || 'general');
  let anchor = { x: 360, y: 210 };
  if (area === 'floor' || role.includes('floor')) anchor = { x: 360, y: 245 };
  else if (area === 'front') anchor = { x: 360, y: 318 };
  else if (area === 'back') anchor = { x: 360, y: 112 };
  else if (area === 'east' || area === 'right') anchor = { x: 525, y: 214 };
  else if (area === 'west' || area === 'left') anchor = { x: 195, y: 214 };
  else if (area === 'roof' || role.includes('roof') || role.includes('truss')) anchor = { x: 360, y: 82 };
  else if (area === 'interior' || role.includes('interior')) anchor = { x: 360, y: 205 };
  else if (role.includes('window') || role.includes('door') || role.includes('detail') || role.includes('fixture')) {
    anchor = { x: 260 + (index % 5) * 50, y: 152 + Math.floor(index / 5) * 44 };
  }

  if (role.includes('cladding')) {
    if (area === 'front') anchor.y += 30;
    else if (area === 'back') anchor.y -= 30;
    else if (area === 'east' || area === 'right') anchor.x += 38;
    else if (area === 'west' || area === 'left') anchor.x -= 38;
    else anchor.y += 26;
  }

  const wing = wingOffset(part);
  return { x: Math.max(72, Math.min(610, anchor.x + wing.x)), y: Math.max(58, Math.min(350, anchor.y + wing.y)) };
}

function partVisual(part, index, status) {
  const size = visualSize(part);
  const anchor = areaAnchor(part, index);
  const lift = status === 'current' ? -10 : 0;
  return {
    partId: part.id,
    label: shortLabel(part.name || part.id),
    x: Math.round(anchor.x - size.w / 2),
    y: Math.round(anchor.y - size.h / 2 + lift),
    width: Math.round(size.w),
    height: Math.round(size.h),
    status,
    role: part.role || 'part',
    area: part.area || 'general',
    material: part.material || part.exportRef?.material || 'misc',
  };
}

function calloutsForCurrent(visuals) {
  return visuals.filter(visual => visual.status === 'current').map((visual, index) => ({
    partId: visual.partId,
    label: `${index + 1}. ${visual.label}`,
    detailLines: visual.detailLines || [],
    x: 545,
    y: 90 + index * 52,
    targetX: visual.x + visual.width / 2,
    targetY: visual.y + visual.height / 2,
  }));
}

function renderSvg({ step, order, completedIds, currentIds, visuals, callouts, plan }) {
  const color = phaseColor(step?.phase);
  const buildingName = plan?.source?.buildingName || plan?.source?.buildingType || 'HakoMachi building';
  const rects = visuals.map(visual => {
    if (visual.status === 'completed') {
      return `<g opacity="0.34"><rect x="${visual.x}" y="${visual.y}" width="${visual.width}" height="${visual.height}" rx="4" fill="#d8d5ca" stroke="#817b6d" stroke-width="1.2"/><text x="${visual.x + visual.width / 2}" y="${visual.y + visual.height / 2 + 4}" text-anchor="middle" font-size="10" fill="#5e594f">${esc(visual.label)}</text></g>`;
    }
    return `<g><rect x="${visual.x}" y="${visual.y}" width="${visual.width}" height="${visual.height}" rx="5" fill="${color}" stroke="#183552" stroke-width="2"/><rect x="${visual.x - 4}" y="${visual.y - 4}" width="${visual.width + 8}" height="${visual.height + 8}" rx="7" fill="none" stroke="${color}" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${visual.x + visual.width / 2}" y="${visual.y + visual.height / 2 + 4}" text-anchor="middle" font-size="10" font-weight="700" fill="#fff">${esc(visual.label)}</text></g>`;
  }).join('');
  const calloutMarkup = callouts.map(callout => {
    const detail = (Array.isArray(callout.detailLines) ? callout.detailLines : [])
      .map((line, i) => `<tspan x="${callout.x}" dy="${i === 0 ? 14 : 12}" font-size="9" font-weight="400" fill="#6e6a60">${esc(line)}</tspan>`)
      .join('');
    return `<g><path d="M${callout.x - 12},${callout.y - 4} L${callout.targetX.toFixed(1)},${callout.targetY.toFixed(1)}" fill="none" stroke="${color}" stroke-width="1.2" stroke-dasharray="4 3"/><circle cx="${callout.targetX.toFixed(1)}" cy="${callout.targetY.toFixed(1)}" r="3" fill="${color}"/><text x="${callout.x}" y="${callout.y}" font-size="12" font-weight="700" fill="#222">${esc(callout.label)}${detail}</text></g>`;
  }).join('');
  const note = currentIds.length > 1 ? `${currentIds.length} new parts highlighted` : '1 new part highlighted';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${CAMERA.viewBox}" role="img" aria-label="${esc(step?.title || 'Assembly step illustration')}">
  <rect width="${VIEWBOX.width}" height="${VIEWBOX.height}" fill="#faf9f4"/>
  <rect x="28" y="48" width="490" height="322" rx="8" fill="#f0eee7" stroke="#d5d0c2"/>
  <path d="M195,318 L360,112 L525,318 Z" fill="none" stroke="#d0c9bb" stroke-width="1" stroke-dasharray="6 5"/>
  <text x="42" y="28" font-size="14" font-weight="700" fill="#222">Step ${order}: ${esc(step?.title || 'Assembly step')}</text>
  <text x="42" y="44" font-size="10" fill="#6e6a60">${esc(buildingName)} - ${esc(titleCase(step?.phase || 'assembly'))}</text>
  <text x="54" y="345" font-size="10" fill="#777">front</text>
  <text x="54" y="77" font-size="10" fill="#777">back</text>
  <text x="498" y="214" font-size="10" fill="#777">right</text>
  <text x="178" y="214" font-size="10" fill="#777">left</text>
  ${rects}
  <rect x="532" y="56" width="158" height="302" rx="8" fill="#fff" stroke="#ddd7ca"/>
  <text x="548" y="76" font-size="12" font-weight="700" fill="#222">Current parts</text>
  ${calloutMarkup}
  <text x="548" y="344" font-size="10" fill="#6e6a60">${completedIds.length} completed - ${esc(note)}</text>
</svg>`;
}

function stepIllustration(plan, sequence, step, index, partMap) {
  const steps = Array.isArray(sequence?.steps) ? sequence.steps : [];
  const completedIds = completedIdsBefore(steps, index);
  const currentIds = stepPartIds(step);
  const visibleIds = Array.from(new Set(completedIds.concat(currentIds)));
  const relationshipsById = relationshipMap(plan);
  const visuals = visibleIds.map((partId, visualIndex) => {
    const part = partMap.get(partId);
    if (!part) return null;
    const visual = partVisual(part, visualIndex, currentIds.includes(partId) ? 'current' : 'completed');
    if (visual.status === 'current') visual.detailLines = calloutDetailLines(part, step, plan, relationshipsById);
    return visual;
  }).filter(Boolean);
  const callouts = calloutsForCurrent(visuals);
  return {
    stepId: step.id,
    order: step.order || index + 1,
    phase: step.phase || 'assembly',
    camera: cloneJson(CAMERA),
    completedPartIds: completedIds,
    currentPartIds: currentIds,
    futurePartIds: steps.slice(index + 1).flatMap(stepPartIds),
    callouts,
    visualParts: visuals,
    svg: renderSvg({ step, order: step.order || index + 1, completedIds, currentIds, visuals, callouts, plan }),
  };
}

export function createAssemblyStepIllustrations(plan = {}, sequence = plan.sequence || {}, opts = {}) {
  const steps = Array.isArray(sequence?.steps) ? sequence.steps : [];
  const partMap = new Map((Array.isArray(plan?.parts) ? plan.parts : []).map(part => [part.id, part]));
  const warnings = [];
  if (!steps.length) warnings.push({ code: 'assembly.illustrationsNoSteps', severity: 'warning', message: 'No assembly sequence steps were available for illustration rendering.' });
  if (!partMap.size) warnings.push({ code: 'assembly.illustrationsNoParts', severity: 'warning', message: 'No assembly parts were available for illustration rendering.' });
  for (const step of steps) {
    for (const partId of stepPartIds(step)) {
      if (!partMap.has(partId)) warnings.push({ code: 'assembly.illustrationsMissingPart', severity: 'warning', stepId: step.id, partId, message: `Step ${step.id || step.order || '?'} references missing part ${partId}.` });
    }
  }
  const illustrations = steps.map((step, index) => stepIllustration(plan, sequence, step, index, partMap));
  return {
    schema: ASSEMBLY_ILLUSTRATIONS_SCHEMA,
    schemaVersion: ASSEMBLY_ILLUSTRATIONS_SCHEMA_VERSION,
    deterministicKey: simpleHash(stableStringify({
      planKey: plan.deterministicKey || null,
      sequenceKey: sequence.deterministicKey || null,
      steps: illustrations.map(item => [item.stepId, item.currentPartIds, item.completedPartIds]),
      mode: opts.mode || 'default',
    })),
    strategy: 'role-area-svg-panels-v1',
    camera: cloneJson(CAMERA),
    steps: illustrations,
    warnings: warnings.sort((a, b) => `${a.code}:${a.stepId || ''}:${a.partId || ''}`.localeCompare(`${b.code}:${b.stepId || ''}:${b.partId || ''}`)),
  };
}
