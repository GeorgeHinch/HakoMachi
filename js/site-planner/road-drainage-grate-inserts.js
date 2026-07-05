import { resolveRoadPresetMaterial } from './road-material-library-roles.js';

const DEFAULT_GRATE_INSERT = Object.freeze({
  key: 'foldedDrainageGrateInsert',
  label: 'Folded drainage grate insert',
  materialRole: 'roadHatchDark',
  roadSurfaceMaterialRole: 'core',
  widthMm: 8,
  depthMm: 2,
  materialThicknessMm: 0.28,
  roadSurfaceThicknessMm: 1.5,
  clearanceMm: 0.08,
  tabWidthMm: 0.75,
  tabDepthMm: 1.5,
  tabInsetMm: 0.45,
  railWidthMm: 0.18,
  slatWidthMm: 0.18,
  slatGapMm: 0.32,
  endFrameMm: 0.25,
  foldScoreOffsetMm: 0,
  supportStyle: 'folded-u',
});

function num(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rect(x, y, width, height, meta = {}) {
  return { type: 'rect', x, y, width, height, ...meta };
}

function line(x1, y1, x2, y2, meta = {}) {
  return { type: 'line', x1, y1, x2, y2, ...meta };
}

function pathFromRect(part) {
  return `M ${part.x} ${part.y} L ${part.x + part.width} ${part.y} L ${part.x + part.width} ${part.y + part.height} L ${part.x} ${part.y + part.height} Z`;
}

export function normalizeDrainageGrateInsertSpec(spec = {}) {
  const normalized = {
    ...DEFAULT_GRATE_INSERT,
    ...spec,
  };
  normalized.widthMm = Math.max(1, num(normalized.widthMm, DEFAULT_GRATE_INSERT.widthMm));
  normalized.depthMm = Math.max(0.5, num(normalized.depthMm, DEFAULT_GRATE_INSERT.depthMm));
  normalized.materialThicknessMm = Math.max(0.01, num(normalized.materialThicknessMm, DEFAULT_GRATE_INSERT.materialThicknessMm));
  normalized.roadSurfaceThicknessMm = Math.max(0.01, num(normalized.roadSurfaceThicknessMm, DEFAULT_GRATE_INSERT.roadSurfaceThicknessMm));
  normalized.clearanceMm = Math.max(0, num(normalized.clearanceMm, DEFAULT_GRATE_INSERT.clearanceMm));
  normalized.tabWidthMm = clamp(num(normalized.tabWidthMm, DEFAULT_GRATE_INSERT.tabWidthMm), normalized.materialThicknessMm, normalized.depthMm * 0.8);
  normalized.tabDepthMm = Math.max(normalized.materialThicknessMm, num(normalized.tabDepthMm, normalized.roadSurfaceThicknessMm));
  normalized.tabInsetMm = clamp(num(normalized.tabInsetMm, DEFAULT_GRATE_INSERT.tabInsetMm), 0, normalized.widthMm / 3);
  normalized.railWidthMm = clamp(num(normalized.railWidthMm, DEFAULT_GRATE_INSERT.railWidthMm), 0.05, normalized.depthMm / 3);
  normalized.slatWidthMm = clamp(num(normalized.slatWidthMm, DEFAULT_GRATE_INSERT.slatWidthMm), 0.05, normalized.depthMm / 2);
  normalized.slatGapMm = Math.max(0.05, num(normalized.slatGapMm, DEFAULT_GRATE_INSERT.slatGapMm));
  normalized.endFrameMm = clamp(num(normalized.endFrameMm, DEFAULT_GRATE_INSERT.endFrameMm), 0.05, normalized.widthMm / 4);
  return normalized;
}

export function drainageGrateOpening(spec = {}) {
  const s = normalizeDrainageGrateInsertSpec(spec);
  return rect(0, 0, s.widthMm + s.clearanceMm * 2, s.depthMm + s.clearanceMm * 2, {
    id: 'road-opening',
    layer: 'roadDeckCut',
    cutThrough: true,
    description: 'Cut this opening in the road surface. The insert grate sits flush in this gap.',
  });
}

export function drainageGrateInsertOutline(spec = {}) {
  const s = normalizeDrainageGrateInsertSpec(spec);
  const deck = rect(0, 0, s.widthMm, s.depthMm, {
    id: 'grate-deck',
    layer: 'grateCut',
    cutThrough: true,
    materialRole: s.materialRole,
  });
  const leftTab = rect(s.tabInsetMm, s.depthMm, s.tabWidthMm, s.tabDepthMm, {
    id: 'left-fold-tab',
    layer: 'grateCut',
    cutThrough: true,
    materialRole: s.materialRole,
    foldDirection: 'down',
  });
  const rightTab = rect(s.widthMm - s.tabInsetMm - s.tabWidthMm, s.depthMm, s.tabWidthMm, s.tabDepthMm, {
    id: 'right-fold-tab',
    layer: 'grateCut',
    cutThrough: true,
    materialRole: s.materialRole,
    foldDirection: 'down',
  });
  return { deck, tabs: [leftTab, rightTab] };
}

export function drainageGrateFoldScores(spec = {}) {
  const s = normalizeDrainageGrateInsertSpec(spec);
  return [
    line(s.tabInsetMm, s.depthMm + s.foldScoreOffsetMm, s.tabInsetMm + s.tabWidthMm, s.depthMm + s.foldScoreOffsetMm, {
      id: 'left-tab-fold-score',
      layer: 'grateScore',
      score: true,
      materialRole: s.materialRole,
    }),
    line(s.widthMm - s.tabInsetMm - s.tabWidthMm, s.depthMm + s.foldScoreOffsetMm, s.widthMm - s.tabInsetMm, s.depthMm + s.foldScoreOffsetMm, {
      id: 'right-tab-fold-score',
      layer: 'grateScore',
      score: true,
      materialRole: s.materialRole,
    }),
  ];
}

export function drainageGrateSeeThroughCuts(spec = {}) {
  const s = normalizeDrainageGrateInsertSpec(spec);
  const cuts = [];
  const interiorX = s.endFrameMm;
  const interiorWidth = Math.max(0, s.widthMm - s.endFrameMm * 2);
  const interiorY = s.railWidthMm;
  const interiorHeight = Math.max(0, s.depthMm - s.railWidthMm * 2);
  const pitch = s.slatWidthMm + s.slatGapMm;
  const count = Math.max(1, Math.floor((interiorWidth + s.slatGapMm) / pitch));
  const used = count * s.slatWidthMm + Math.max(0, count - 1) * s.slatGapMm;
  const startX = interiorX + Math.max(0, (interiorWidth - used) / 2);
  for (let i = 0; i < count; i += 1) {
    const x = startX + i * pitch;
    cuts.push(rect(x, interiorY, s.slatWidthMm, interiorHeight, {
      id: `grate-slot-${i + 1}`,
      layer: 'grateCut',
      cutThrough: true,
      materialRole: s.materialRole,
      description: 'See-through grate slot cutout.',
    }));
  }
  return cuts;
}

export function drainageGrateAssemblyGuides(spec = {}) {
  const s = normalizeDrainageGrateInsertSpec(spec);
  return [
    line(0, s.depthMm, s.widthMm, s.depthMm, {
      id: 'fold-line-guide',
      layer: 'grateGuide',
      guide: true,
      description: 'Fold both support tabs down along this edge so the insert forms an upside-down U support under the road surface.',
    }),
    rect(0, 0, s.widthMm, s.depthMm, {
      id: 'flush-top-guide',
      layer: 'grateGuide',
      guide: true,
      description: 'Visible top grate should sit level with the road surface opening.',
    }),
  ];
}

export function buildDrainageGrateInsert(spec = {}, materialLibraryOrProfile = {}) {
  const s = normalizeDrainageGrateInsertSpec(spec);
  const grateMaterial = resolveRoadPresetMaterial({ materialRole: s.materialRole, color: '#3a2b1e' }, materialLibraryOrProfile);
  const roadSurfaceMaterial = resolveRoadPresetMaterial({ materialRole: s.roadSurfaceMaterialRole, color: '#8b8175' }, materialLibraryOrProfile);
  const outline = drainageGrateInsertOutline(s);
  const opening = drainageGrateOpening(s);
  const scoreLines = drainageGrateFoldScores(s);
  const grateCuts = drainageGrateSeeThroughCuts(s);
  const guides = drainageGrateAssemblyGuides(s);
  return {
    schema: 'hakomachi.road-drainage-grate-insert',
    schemaVersion: 1,
    spec: s,
    materials: {
      grate: grateMaterial,
      roadSurface: roadSurfaceMaterial,
    },
    roadOpening: opening,
    insert: {
      deck: outline.deck,
      tabs: outline.tabs,
      scoreLines,
      seeThroughCuts: grateCuts,
      guides,
    },
    layers: {
      roadDeckCut: [opening],
      grateCut: [outline.deck, ...outline.tabs, ...grateCuts],
      grateScore: scoreLines,
      grateGuide: guides,
    },
    assembly: [
      'Cut the rectangular opening through the road surface material.',
      'Cut the grate insert from the selected grate material.',
      'Cut the see-through slots in the grate deck.',
      'Score the fold lines at the bottom edge of the grate deck.',
      'Fold both side tabs down to form an upside-down U support.',
      'Drop the grate into the road opening so the top deck sits flush with the road surface.',
    ],
  };
}

export function drainageGrateSvgPaths(grateInsert) {
  const data = grateInsert?.layers ? grateInsert : buildDrainageGrateInsert(grateInsert || {});
  return Object.entries(data.layers || {}).reduce((paths, [layer, parts]) => {
    paths[layer] = (parts || []).map(part => {
      if (part.type === 'rect') return { ...part, d: pathFromRect(part) };
      if (part.type === 'line') return { ...part, d: `M ${part.x1} ${part.y1} L ${part.x2} ${part.y2}` };
      return part;
    });
    return paths;
  }, {});
}

export { DEFAULT_GRATE_INSERT };
