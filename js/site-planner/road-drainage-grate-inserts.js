import { resolveRoadPresetMaterial } from './road-material-library-roles.js';

const DEFAULT_GRATE_INSERT = Object.freeze({
  key: 'foldedDrainageGrateInsert',
  label: 'Folded drainage grate insert',
  family: 'rectangular-drain',
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
  slotPattern: 'parallel',
});

const GRATE_FAMILY_PRESETS = Object.freeze({
  rectangularDrain: Object.freeze({
    ...DEFAULT_GRATE_INSERT,
    key: 'rectangularDrain',
    label: 'Rectangular folded drainage grate',
    family: 'rectangular-drain',
    widthMm: 8,
    depthMm: 2,
    slotPattern: 'parallel',
  }),
  longCurbTrench: Object.freeze({
    ...DEFAULT_GRATE_INSERT,
    key: 'longCurbTrench',
    label: 'Long curb trench grate',
    family: 'curb-trench',
    widthMm: 22,
    depthMm: 2.2,
    tabWidthMm: 1.2,
    tabInsetMm: 1.1,
    railWidthMm: 0.22,
    slatWidthMm: 0.16,
    slatGapMm: 0.34,
    endFrameMm: 0.35,
    slotPattern: 'parallel',
  }),
  squareStormGrate: Object.freeze({
    ...DEFAULT_GRATE_INSERT,
    key: 'squareStormGrate',
    label: 'Square storm drain grate',
    family: 'square-storm-grate',
    widthMm: 5.2,
    depthMm: 5.2,
    tabWidthMm: 0.95,
    tabInsetMm: 0.55,
    railWidthMm: 0.25,
    slatWidthMm: 0.16,
    slatGapMm: 0.32,
    endFrameMm: 0.35,
    slotPattern: 'grid',
  }),
  heavyDutyIndustrial: Object.freeze({
    ...DEFAULT_GRATE_INSERT,
    key: 'heavyDutyIndustrial',
    label: 'Heavy-duty industrial grate',
    family: 'industrial-grate',
    widthMm: 10,
    depthMm: 4,
    tabWidthMm: 1.2,
    tabInsetMm: 0.75,
    railWidthMm: 0.32,
    slatWidthMm: 0.22,
    slatGapMm: 0.42,
    endFrameMm: 0.45,
    slotPattern: 'heavy-parallel',
  }),
  curbInletTopGrate: Object.freeze({
    ...DEFAULT_GRATE_INSERT,
    key: 'curbInletTopGrate',
    label: 'Curb inlet with top grate',
    family: 'curb-inlet',
    widthMm: 9,
    depthMm: 3.2,
    tabWidthMm: 0.9,
    tabInsetMm: 0.55,
    railWidthMm: 0.22,
    slatWidthMm: 0.16,
    slatGapMm: 0.36,
    endFrameMm: 0.35,
    slotPattern: 'curb-inlet',
    inletLipDepthMm: 0.7,
    inletSlotHeightMm: 0.42,
  }),
  etchedManholeCover: Object.freeze({
    ...DEFAULT_GRATE_INSERT,
    key: 'etchedManholeCover',
    label: 'Etched round manhole cover insert',
    family: 'manhole-cover',
    shape: 'circle',
    diameterMm: 4.8,
    widthMm: 4.8,
    depthMm: 4.8,
    tabWidthMm: 0.9,
    tabInsetMm: 0.45,
    railWidthMm: 0.16,
    slatWidthMm: 0.14,
    slatGapMm: 0.36,
    endFrameMm: 0.25,
    slotPattern: 'etched-manhole',
    supportStyle: 'flat-or-folded',
  }),
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

function circle(cx, cy, r, meta = {}) {
  return { type: 'circle', cx, cy, r, ...meta };
}

function path(d, meta = {}) {
  return { type: 'path', d, ...meta };
}

function pathFromRect(part) {
  return `M ${part.x} ${part.y} L ${part.x + part.width} ${part.y} L ${part.x + part.width} ${part.y + part.height} L ${part.x} ${part.y + part.height} Z`;
}

function pathFromCircle(part) {
  const r = part.r;
  return `M ${part.cx - r} ${part.cy} A ${r} ${r} 0 1 0 ${part.cx + r} ${part.cy} A ${r} ${r} 0 1 0 ${part.cx - r} ${part.cy}`;
}

export function grateFamilyPresetByKey(key = 'rectangularDrain') {
  return GRATE_FAMILY_PRESETS[key] || GRATE_FAMILY_PRESETS.rectangularDrain;
}

export function drainageGrateFamilyOptions() {
  return Object.values(GRATE_FAMILY_PRESETS).map(preset => ({
    value: preset.key,
    label: preset.label,
    family: preset.family,
    widthMm: preset.widthMm,
    depthMm: preset.depthMm,
    slotPattern: preset.slotPattern,
  }));
}

export function normalizeDrainageGrateInsertSpec(spec = {}) {
  const preset = grateFamilyPresetByKey(spec.key || spec.familyKey || spec.grateFamily || spec.preset);
  const normalized = {
    ...preset,
    ...spec,
  };
  normalized.widthMm = Math.max(1, num(normalized.widthMm, preset.widthMm || DEFAULT_GRATE_INSERT.widthMm));
  normalized.depthMm = Math.max(0.5, num(normalized.depthMm, preset.depthMm || DEFAULT_GRATE_INSERT.depthMm));
  normalized.diameterMm = Math.max(1, num(normalized.diameterMm, normalized.widthMm));
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
  normalized.inletLipDepthMm = Math.max(0.1, num(normalized.inletLipDepthMm, 0.7));
  normalized.inletSlotHeightMm = Math.max(0.08, num(normalized.inletSlotHeightMm, 0.42));
  return normalized;
}

export function drainageGrateOpening(spec = {}) {
  const s = normalizeDrainageGrateInsertSpec(spec);
  if (s.shape === 'circle') {
    const r = s.diameterMm / 2 + s.clearanceMm;
    return circle(r, r, r, {
      id: 'road-opening',
      layer: 'roadDeckCut',
      cutThrough: true,
      description: 'Cut this round opening in the road surface. The insert sits flush in this gap.',
    });
  }
  return rect(0, 0, s.widthMm + s.clearanceMm * 2, s.depthMm + s.clearanceMm * 2, {
    id: 'road-opening',
    layer: 'roadDeckCut',
    cutThrough: true,
    description: 'Cut this opening in the road surface. The insert grate sits flush in this gap.',
  });
}

export function drainageGrateInsertOutline(spec = {}) {
  const s = normalizeDrainageGrateInsertSpec(spec);
  const deck = s.shape === 'circle'
    ? circle(s.diameterMm / 2, s.diameterMm / 2, s.diameterMm / 2, {
        id: 'grate-deck',
        layer: 'grateCut',
        cutThrough: true,
        materialRole: s.materialRole,
      })
    : rect(0, 0, s.widthMm, s.depthMm, {
        id: 'grate-deck',
        layer: 'grateCut',
        cutThrough: true,
        materialRole: s.materialRole,
      });
  const tabY = s.shape === 'circle' ? s.diameterMm : s.depthMm;
  const usableWidth = s.shape === 'circle' ? s.diameterMm : s.widthMm;
  const leftTab = rect(s.tabInsetMm, tabY, s.tabWidthMm, s.tabDepthMm, {
    id: 'left-fold-tab',
    layer: 'grateCut',
    cutThrough: true,
    materialRole: s.materialRole,
    foldDirection: 'down',
  });
  const rightTab = rect(usableWidth - s.tabInsetMm - s.tabWidthMm, tabY, s.tabWidthMm, s.tabDepthMm, {
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
  const y = (s.shape === 'circle' ? s.diameterMm : s.depthMm) + s.foldScoreOffsetMm;
  const usableWidth = s.shape === 'circle' ? s.diameterMm : s.widthMm;
  return [
    line(s.tabInsetMm, y, s.tabInsetMm + s.tabWidthMm, y, {
      id: 'left-tab-fold-score',
      layer: 'grateScore',
      score: true,
      materialRole: s.materialRole,
    }),
    line(usableWidth - s.tabInsetMm - s.tabWidthMm, y, usableWidth - s.tabInsetMm, y, {
      id: 'right-tab-fold-score',
      layer: 'grateScore',
      score: true,
      materialRole: s.materialRole,
    }),
  ];
}

function parallelSlots(s) {
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

function gridSlots(s) {
  const vertical = parallelSlots(s);
  const horizontal = [];
  const interiorX = s.railWidthMm;
  const interiorWidth = Math.max(0, s.widthMm - s.railWidthMm * 2);
  const interiorY = s.endFrameMm;
  const interiorHeight = Math.max(0, s.depthMm - s.endFrameMm * 2);
  const pitch = s.slatWidthMm + s.slatGapMm;
  const count = Math.max(1, Math.floor((interiorHeight + s.slatGapMm) / pitch));
  const used = count * s.slatWidthMm + Math.max(0, count - 1) * s.slatGapMm;
  const startY = interiorY + Math.max(0, (interiorHeight - used) / 2);
  for (let i = 0; i < count; i += 1) {
    const y = startY + i * pitch;
    horizontal.push(rect(interiorX, y, interiorWidth, s.slatWidthMm, {
      id: `grate-cross-slot-${i + 1}`,
      layer: 'grateCut',
      cutThrough: true,
      materialRole: s.materialRole,
      description: 'See-through cross grate slot cutout.',
    }));
  }
  return [...vertical, ...horizontal];
}

function curbInletCuts(s) {
  return [
    ...parallelSlots(s),
    rect(s.endFrameMm, s.depthMm - s.inletLipDepthMm, s.widthMm - s.endFrameMm * 2, s.inletSlotHeightMm, {
      id: 'curb-inlet-mouth-slot',
      layer: 'grateCut',
      cutThrough: true,
      materialRole: s.materialRole,
      description: 'Front curb inlet mouth cut through the grate face.',
    }),
  ];
}

function manholeEtch(s) {
  const r = s.diameterMm / 2;
  return [
    circle(r, r, r * 0.72, {
      id: 'manhole-inner-ring-etch',
      layer: 'grateScore',
      score: true,
      materialRole: s.materialRole,
    }),
    line(r * 0.42, r, r * 1.58, r, {
      id: 'manhole-horizontal-etch',
      layer: 'grateScore',
      score: true,
      materialRole: s.materialRole,
    }),
    line(r, r * 0.42, r, r * 1.58, {
      id: 'manhole-vertical-etch',
      layer: 'grateScore',
      score: true,
      materialRole: s.materialRole,
    }),
  ];
}

export function drainageGrateSeeThroughCuts(spec = {}) {
  const s = normalizeDrainageGrateInsertSpec(spec);
  if (s.slotPattern === 'grid') return gridSlots(s);
  if (s.slotPattern === 'curb-inlet') return curbInletCuts(s);
  if (s.slotPattern === 'etched-manhole') return [];
  return parallelSlots(s);
}

export function drainageGrateAssemblyGuides(spec = {}) {
  const s = normalizeDrainageGrateInsertSpec(spec);
  const y = s.shape === 'circle' ? s.diameterMm : s.depthMm;
  const usableWidth = s.shape === 'circle' ? s.diameterMm : s.widthMm;
  return [
    line(0, y, usableWidth, y, {
      id: 'fold-line-guide',
      layer: 'grateGuide',
      guide: true,
      description: 'Fold both support tabs down along this edge so the insert forms an upside-down U support under the road surface.',
    }),
    s.shape === 'circle'
      ? circle(s.diameterMm / 2, s.diameterMm / 2, s.diameterMm / 2, {
          id: 'flush-top-guide',
          layer: 'grateGuide',
          guide: true,
          description: 'Visible cover should sit level with the road surface opening.',
        })
      : rect(0, 0, s.widthMm, s.depthMm, {
          id: 'flush-top-guide',
          layer: 'grateGuide',
          guide: true,
          description: 'Visible top grate should sit level with the road surface opening.',
        }),
  ];
}

export function drainageGrateEtchDetails(spec = {}) {
  const s = normalizeDrainageGrateInsertSpec(spec);
  if (s.slotPattern === 'etched-manhole') return manholeEtch(s);
  if (s.slotPattern === 'heavy-parallel') {
    return [
      line(s.endFrameMm, s.depthMm / 2, s.widthMm - s.endFrameMm, s.depthMm / 2, {
        id: 'industrial-center-rib-etch',
        layer: 'grateScore',
        score: true,
        materialRole: s.materialRole,
      }),
    ];
  }
  return [];
}

export function buildDrainageGrateInsert(spec = {}, materialLibraryOrProfile = {}) {
  const s = normalizeDrainageGrateInsertSpec(spec);
  const grateMaterial = resolveRoadPresetMaterial({ materialRole: s.materialRole, color: '#3a2b1e' }, materialLibraryOrProfile);
  const roadSurfaceMaterial = resolveRoadPresetMaterial({ materialRole: s.roadSurfaceMaterialRole, color: '#8b8175' }, materialLibraryOrProfile);
  const outline = drainageGrateInsertOutline(s);
  const opening = drainageGrateOpening(s);
  const foldScores = drainageGrateFoldScores(s);
  const grateCuts = drainageGrateSeeThroughCuts(s);
  const etchDetails = drainageGrateEtchDetails(s);
  const scoreLines = [...foldScores, ...etchDetails];
  const guides = drainageGrateAssemblyGuides(s);
  return {
    schema: 'hakomachi.road-drainage-grate-insert',
    schemaVersion: 2,
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
      'Cut the road-surface opening from the road deck material.',
      'Cut the grate insert from the selected grate material.',
      s.slotPattern === 'etched-manhole' ? 'Score the manhole cover detail lines.' : 'Cut the see-through slots in the grate deck.',
      'Score the fold lines at the bottom edge of the grate deck.',
      'Fold both side tabs down to form an upside-down U support.',
      'Drop the insert into the road opening so the top deck sits flush with the road surface.',
    ],
  };
}

export function drainageGrateSvgPaths(grateInsert) {
  const data = grateInsert?.layers ? grateInsert : buildDrainageGrateInsert(grateInsert || {});
  return Object.entries(data.layers || {}).reduce((paths, [layer, parts]) => {
    paths[layer] = (parts || []).map(part => {
      if (part.type === 'rect') return { ...part, d: pathFromRect(part) };
      if (part.type === 'circle') return { ...part, d: pathFromCircle(part) };
      if (part.type === 'line') return { ...part, d: `M ${part.x1} ${part.y1} L ${part.x2} ${part.y2}` };
      if (part.type === 'path') return part;
      return part;
    });
    return paths;
  }, {});
}

export { DEFAULT_GRATE_INSERT, GRATE_FAMILY_PRESETS };
