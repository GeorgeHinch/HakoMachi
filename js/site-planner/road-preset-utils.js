import { escapeHtml } from '../shared/browser-utils.js';
import {
  JP_ROAD_MARKING_STANDARD_ID,
  ROAD_HATCH_PRESETS,
  ROAD_MARKING_PRESETS,
  ROAD_WIDTH_PRESETS,
  SIDEWALK_WIDTH_PRESETS,
} from './presets.js';
import { fmt } from './geometry.js';

export function markingPresetByKey(key) {
  return ROAD_MARKING_PRESETS.find(preset => preset.key === key) || ROAD_MARKING_PRESETS[0];
}

export function hatchPresetByKey(key) {
  return ROAD_HATCH_PRESETS.find(preset => preset.key === key) || ROAD_HATCH_PRESETS[0];
}

export function markingOptionsHtml(selectedKey) {
  return ROAD_MARKING_PRESETS.map(preset => `<option value="${preset.key}" ${preset.key === (selectedKey || 'stopLine') ? 'selected' : ''}>${escapeHtml(preset.label)} / ${escapeHtml(preset.jpName)}</option>`).join('');
}

export function hatchOptionsHtml(selectedKey) {
  return ROAD_HATCH_PRESETS.map(preset => `<option value="${preset.key}" ${preset.key === (selectedKey || 'round600') ? 'selected' : ''}>${escapeHtml(preset.label)}</option>`).join('');
}

export function applyRoadMarkingPreset(feature, key, scaleContext = {}) {
  const preset = markingPresetByKey(key);
  feature.markingPreset = preset.key;
  feature.markingType = preset.key;
  feature.markingDraw = preset.draw;
  feature.standard = JP_ROAD_MARKING_STANDARD_ID;
  feature.jpName = preset.jpName;
  feature.markingCategory = preset.category;
  feature.cutBehavior = 'etchOnly';
  feature.exportLayer = 'roadMarkingEtch';
  feature.widthMm = preset.widthMm;
  feature.depthMm = preset.depthMm;
  feature.color = preset.color || '#f7f2df';
  if (preset.text) feature.text = preset.text;
  if (scaleContext.pxPerMm && scaleContext.mmToPx) {
    feature.widthPx = scaleContext.mmToPx(feature.widthMm);
    feature.depthPx = scaleContext.mmToPx(feature.depthMm);
  }
  return feature;
}

export function applyRoadHatchPreset(feature, key, scaleContext = {}) {
  const preset = hatchPresetByKey(key);
  feature.hatchPreset = preset.key;
  feature.jpName = preset.jpName;
  feature.hatchShape = preset.shape;
  feature.cutThrough = true;
  feature.exportLayer = 'roadHatchCut';
  if (preset.shape === 'circle') {
    feature.diameterMm = preset.diameterMm;
  } else {
    feature.widthMm = preset.widthMm;
    feature.depthMm = preset.depthMm;
  }
  if (scaleContext.pxPerMm && scaleContext.mmToPx) {
    feature.diameterPx = scaleContext.mmToPx(feature.diameterMm || 3);
    feature.widthPx = scaleContext.mmToPx(feature.widthMm || 4);
    feature.depthPx = scaleContext.mmToPx(feature.depthMm || 3);
  }
  return feature;
}

export function presetModelMm(preset, scaleDivisor = 150) {
  return preset && Number.isFinite(Number(preset.realM)) ? (Number(preset.realM) * 1000 / scaleDivisor) : null;
}

export function formatPresetLabel(preset, scaleDivisor = 150) {
  if (!preset || preset.key === 'custom') return preset ? preset.label : 'Custom / override';
  const mm = presetModelMm(preset, scaleDivisor);
  return `${preset.label} — ${preset.realM.toFixed(1)} m real (${fmt(mm)} mm @ 1:${scaleDivisor})`;
}

export function presetOptionsHtml(presets, selectedKey, scaleDivisor = 150) {
  return presets.map(preset => `<option value="${preset.key}" ${preset.key === (selectedKey || 'custom') ? 'selected' : ''}>${escapeHtml(formatPresetLabel(preset, scaleDivisor))}</option>`).join('');
}

export function roadPresetByKey(key) {
  return ROAD_WIDTH_PRESETS.find(preset => preset.key === key) || ROAD_WIDTH_PRESETS[0];
}

export function sidewalkPresetByKey(key) {
  return SIDEWALK_WIDTH_PRESETS.find(preset => preset.key === key) || SIDEWALK_WIDTH_PRESETS[0];
}
