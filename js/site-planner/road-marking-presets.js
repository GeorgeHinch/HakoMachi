const DEFAULT_STANDARD = 'jp-urban';

const ROAD_MARKING_PRESETS = Object.freeze([
  {
    key: 'stopLine',
    standard: DEFAULT_STANDARD,
    category: 'intersection-control',
    label: 'Stop line',
    jpName: '停止線',
    description: 'Single transverse stop bar placed before an intersection or crossing.',
    draw: 'bar',
    widthMm: 7.2,
    depthMm: 0.45,
    color: '#f7f2df',
    exportLayer: 'roadMarkingEtch',
  },
  {
    key: 'zebraCrosswalk',
    standard: DEFAULT_STANDARD,
    category: 'crosswalk',
    label: 'Zebra crosswalk',
    jpName: '横断歩道',
    description: 'Japanese-style zebra crossing made from repeated transverse stripes.',
    draw: 'crosswalk',
    widthMm: 9.0,
    depthMm: 3.0,
    stripeCount: 5,
    color: '#f7f2df',
    exportLayer: 'roadMarkingEtch',
  },
  {
    key: 'bicycleCrossing',
    standard: DEFAULT_STANDARD,
    category: 'crosswalk',
    label: 'Bicycle crossing',
    jpName: '自転車横断帯',
    description: 'Parallel bicycle crossing guide lines beside a pedestrian crossing.',
    draw: 'bicycleCrossing',
    widthMm: 9.0,
    depthMm: 2.1,
    color: '#f7f2df',
    exportLayer: 'roadMarkingEtch',
  },
  {
    key: 'laneArrowStraight',
    standard: DEFAULT_STANDARD,
    category: 'lane-arrow',
    label: 'Straight arrow',
    jpName: '直進矢印',
    description: 'Lane arrow for straight-through traffic.',
    draw: 'arrowStraight',
    widthMm: 2.8,
    depthMm: 7.5,
    color: '#f7f2df',
    exportLayer: 'roadMarkingEtch',
  },
  {
    key: 'laneArrowLeft',
    standard: DEFAULT_STANDARD,
    category: 'lane-arrow',
    label: 'Left-turn arrow',
    jpName: '左折矢印',
    description: 'Lane arrow for left-turn traffic.',
    draw: 'arrowLeft',
    widthMm: 5.4,
    depthMm: 6.6,
    color: '#f7f2df',
    exportLayer: 'roadMarkingEtch',
  },
  {
    key: 'laneArrowRight',
    standard: DEFAULT_STANDARD,
    category: 'lane-arrow',
    label: 'Right-turn arrow',
    jpName: '右折矢印',
    description: 'Lane arrow for right-turn traffic.',
    draw: 'arrowRight',
    widthMm: 5.4,
    depthMm: 6.6,
    color: '#f7f2df',
    exportLayer: 'roadMarkingEtch',
  },
  {
    key: 'laneArrowStraightLeft',
    standard: DEFAULT_STANDARD,
    category: 'lane-arrow',
    label: 'Straight/left arrow',
    jpName: '直進左折矢印',
    description: 'Combined lane arrow for straight-through and left-turn traffic.',
    draw: 'arrowStraightLeft',
    widthMm: 5.8,
    depthMm: 7.5,
    color: '#f7f2df',
    exportLayer: 'roadMarkingEtch',
  },
  {
    key: 'laneArrowStraightRight',
    standard: DEFAULT_STANDARD,
    category: 'lane-arrow',
    label: 'Straight/right arrow',
    jpName: '直進右折矢印',
    description: 'Combined lane arrow for straight-through and right-turn traffic.',
    draw: 'arrowStraightRight',
    widthMm: 5.8,
    depthMm: 7.5,
    color: '#f7f2df',
    exportLayer: 'roadMarkingEtch',
  },
  {
    key: 'speed30',
    standard: DEFAULT_STANDARD,
    category: 'road-text',
    label: 'Speed 30',
    jpName: '速度30',
    description: 'Road-surface speed marking with the number 30.',
    draw: 'speedNumber',
    text: '30',
    widthMm: 3.6,
    depthMm: 5.8,
    color: '#f7f2df',
    exportLayer: 'roadMarkingEtch',
  },
  {
    key: 'speed40',
    standard: DEFAULT_STANDARD,
    category: 'road-text',
    label: 'Speed 40',
    jpName: '速度40',
    description: 'Road-surface speed marking with the number 40.',
    draw: 'speedNumber',
    text: '40',
    widthMm: 3.6,
    depthMm: 5.8,
    color: '#f7f2df',
    exportLayer: 'roadMarkingEtch',
  },
  {
    key: 'stopTextTomare',
    standard: DEFAULT_STANDARD,
    category: 'road-text',
    label: '止まれ text',
    jpName: '止まれ',
    description: 'Japanese stop text marking for small roads and crossings.',
    draw: 'roadText',
    text: '止まれ',
    widthMm: 4.8,
    depthMm: 7.0,
    color: '#f7f2df',
    exportLayer: 'roadMarkingEtch',
  },
  {
    key: 'noParkingCurbDash',
    standard: DEFAULT_STANDARD,
    category: 'curb-marking',
    label: 'No-parking curb dashes',
    jpName: '駐車禁止破線',
    description: 'Short curb-side dash markings for no-parking or restricted-edge detail.',
    draw: 'curbDash',
    widthMm: 8.5,
    depthMm: 0.35,
    dashCount: 4,
    color: '#f7c84a',
    exportLayer: 'roadMarkingEtch',
  },
  {
    key: 'laneDashedCenter',
    standard: DEFAULT_STANDARD,
    category: 'lane-line',
    label: 'Dashed center line',
    jpName: '中央線破線',
    description: 'Short dashed centerline segment for road lane separation.',
    draw: 'dashedLine',
    widthMm: 9.0,
    depthMm: 0.28,
    dashCount: 3,
    color: '#f7f2df',
    exportLayer: 'roadMarkingEtch',
  },
  {
    key: 'laneSolidCenter',
    standard: DEFAULT_STANDARD,
    category: 'lane-line',
    label: 'Solid center line',
    jpName: '中央線実線',
    description: 'Solid lane divider segment.',
    draw: 'solidLine',
    widthMm: 9.0,
    depthMm: 0.28,
    color: '#f7f2df',
    exportLayer: 'roadMarkingEtch',
  },
  {
    key: 'diamondWarning',
    standard: DEFAULT_STANDARD,
    category: 'warning',
    label: 'Diamond warning',
    jpName: '前方横断歩道予告',
    description: 'Diamond-style warning marking often used ahead of crossings.',
    draw: 'diamond',
    widthMm: 3.8,
    depthMm: 6.4,
    color: '#f7f2df',
    exportLayer: 'roadMarkingEtch',
  },
  {
    key: 'chevronBuffer',
    standard: DEFAULT_STANDARD,
    category: 'buffer-zone',
    label: 'Chevron buffer',
    jpName: '導流帯',
    description: 'Hatched/chevron buffer zone for channelized painted islands.',
    draw: 'chevronZone',
    widthMm: 9.5,
    depthMm: 4.0,
    color: '#f7f2df',
    exportLayer: 'roadMarkingEtch',
  },
  {
    key: 'safetyZoneBox',
    standard: DEFAULT_STANDARD,
    category: 'buffer-zone',
    label: 'Safety zone box',
    jpName: '安全地帯',
    description: 'Boxed safety-zone marking for tram/road island style details.',
    draw: 'safetyZone',
    widthMm: 9.5,
    depthMm: 3.2,
    color: '#f7f2df',
    exportLayer: 'roadMarkingEtch',
  },
]);

const ROAD_HATCH_PRESETS = Object.freeze([
  {
    key: 'round600',
    standard: DEFAULT_STANDARD,
    category: 'utility-cover',
    label: 'Round 600 mm cover',
    jpName: '丸形マンホール 600',
    description: 'Common round utility/manhole cover.',
    shape: 'circle',
    diameterMm: 4.0,
    color: '#3a2b1e',
    exportLayer: 'roadHatchCut',
  },
  {
    key: 'round900',
    standard: DEFAULT_STANDARD,
    category: 'utility-cover',
    label: 'Round 900 mm cover',
    jpName: '丸形マンホール 900',
    description: 'Larger round maintenance cover for main streets.',
    shape: 'circle',
    diameterMm: 6.0,
    color: '#3a2b1e',
    exportLayer: 'roadHatchCut',
  },
  {
    key: 'rectDrainSmall',
    standard: DEFAULT_STANDARD,
    category: 'drain',
    label: 'Small rectangular drain',
    jpName: '角形側溝蓋 小',
    description: 'Small curb or alley drain cover.',
    shape: 'rect',
    widthMm: 4.0,
    depthMm: 2.0,
    color: '#3a2b1e',
    exportLayer: 'roadHatchCut',
  },
  {
    key: 'rectDrainLong',
    standard: DEFAULT_STANDARD,
    category: 'drain',
    label: 'Long drainage grate',
    jpName: '長形排水グレーチング',
    description: 'Long grating cover for curb drainage or industrial streets.',
    shape: 'rect',
    widthMm: 8.0,
    depthMm: 1.6,
    color: '#3a2b1e',
    exportLayer: 'roadHatchCut',
  },
]);

function clonePreset(preset) {
  return Object.freeze({ ...preset });
}

const ROAD_MARKING_PRESET_ALIASES = Object.freeze({
  busStopBox: 'safetyZoneBox',
  centerLineWhite: 'laneSolidCenter',
  centerLineYellow: 'laneSolidCenter',
  crosswalkAdvanceDiamond: 'diamondWarning',
  directionArrow: 'laneArrowStraight',
  edgeLine: 'laneSolidCenter',
  laneBoundaryDashed: 'laneDashedCenter',
  laneBoundarySolid: 'laneSolidCenter',
  noStoppingParkingCurbSolid: 'laneSolidCenter',
  obstructionChevron: 'chevronBuffer',
  speedNumber30: 'speed30',
});

const ROAD_HATCH_PRESET_ALIASES = Object.freeze({
  drain450x600: 'rectDrainLong',
});

function normalizeKey(key) {
  return String(key || '').trim();
}

function byKey(list) {
  return list.reduce((map, preset) => {
    map[preset.key] = clonePreset(preset);
    return map;
  }, {});
}

export const ROAD_MARKING_PRESET_BY_KEY = Object.freeze(byKey(ROAD_MARKING_PRESETS));
export const ROAD_HATCH_PRESET_BY_KEY = Object.freeze(byKey(ROAD_HATCH_PRESETS));

export function roadMarkingPresetByKey(key, fallback = 'stopLine') {
  const normalized = normalizeKey(key);
  return ROAD_MARKING_PRESET_BY_KEY[normalized] || ROAD_MARKING_PRESET_BY_KEY[ROAD_MARKING_PRESET_ALIASES[normalized]] || ROAD_MARKING_PRESET_BY_KEY[fallback] || ROAD_MARKING_PRESETS[0];
}

export function roadHatchPresetByKey(key, fallback = 'round600') {
  const normalized = normalizeKey(key);
  return ROAD_HATCH_PRESET_BY_KEY[normalized] || ROAD_HATCH_PRESET_BY_KEY[ROAD_HATCH_PRESET_ALIASES[normalized]] || ROAD_HATCH_PRESET_BY_KEY[fallback] || ROAD_HATCH_PRESETS[0];
}

export function roadMarkingPresetsByCategory() {
  return ROAD_MARKING_PRESETS.reduce((groups, preset) => {
    if (!groups[preset.category]) groups[preset.category] = [];
    groups[preset.category].push(clonePreset(preset));
    return groups;
  }, {});
}

export function roadHatchPresetsByCategory() {
  return ROAD_HATCH_PRESETS.reduce((groups, preset) => {
    if (!groups[preset.category]) groups[preset.category] = [];
    groups[preset.category].push(clonePreset(preset));
    return groups;
  }, {});
}

export function roadMarkingSelectOptions() {
  return ROAD_MARKING_PRESETS.map(preset => ({
    value: preset.key,
    label: preset.label,
    jpName: preset.jpName,
    category: preset.category,
  }));
}

export function roadHatchSelectOptions() {
  return ROAD_HATCH_PRESETS.map(preset => ({
    value: preset.key,
    label: preset.label,
    jpName: preset.jpName,
    category: preset.category,
  }));
}

export function applyRoadMarkingPresetData(feature = {}, key, scaleContext = {}) {
  const preset = roadMarkingPresetByKey(key);
  const scale = Number(scaleContext.scale || scaleContext.pxPerMm || 1) || 1;
  const outputMode = feature.outputMode || (feature.cutBehavior === 'paintStencil' ? 'paintStencil' : 'etch');
  return {
    ...feature,
    kind: 'marking',
    markingPreset: preset.key,
    markingType: preset.key,
    markingDraw: preset.draw,
    markingCategory: preset.category,
    name: feature.name || preset.label,
    label: preset.label,
    jpName: preset.jpName,
    standard: preset.standard,
    text: preset.text || feature.text || '',
    widthMm: preset.widthMm,
    depthMm: preset.depthMm,
    widthPx: preset.widthMm * scale,
    depthPx: preset.depthMm * scale,
    color: preset.color,
    outputMode,
    stencilMaterialId: feature.stencilMaterialId || 'stencil-stock',
    stencilSpec: feature.stencilSpec,
    exportLayer: outputMode === 'paintStencil' ? 'paintStencilCut' : preset.exportLayer,
    visualOnly: outputMode !== 'paintStencil',
    cutBehavior: outputMode === 'paintStencil' ? 'paintStencil' : 'etchOnly',
  };
}

export function applyRoadHatchPresetData(feature = {}, key, scaleContext = {}) {
  const preset = roadHatchPresetByKey(key);
  const scale = Number(scaleContext.scale || scaleContext.pxPerMm || 1) || 1;
  return {
    ...feature,
    kind: 'manhole',
    hatchPreset: preset.key,
    hatchShape: preset.shape,
    name: feature.name || preset.label,
    label: preset.label,
    jpName: preset.jpName,
    standard: preset.standard,
    diameterMm: preset.diameterMm ?? feature.diameterMm,
    widthMm: preset.widthMm ?? feature.widthMm,
    depthMm: preset.depthMm ?? feature.depthMm,
    diameterPx: preset.diameterMm ? preset.diameterMm * scale : feature.diameterPx,
    widthPx: preset.widthMm ? preset.widthMm * scale : feature.widthPx,
    depthPx: preset.depthMm ? preset.depthMm * scale : feature.depthPx,
    color: preset.color,
    exportLayer: preset.exportLayer,
    cutThrough: true,
  };
}

export function roadMarkingPresetSummary() {
  const categories = roadMarkingPresetsByCategory();
  return Object.keys(categories).sort().map(category => ({
    category,
    count: categories[category].length,
    keys: categories[category].map(preset => preset.key),
  }));
}

export { ROAD_HATCH_PRESETS, ROAD_MARKING_PRESETS, DEFAULT_STANDARD as ROAD_MARKING_DEFAULT_STANDARD };
