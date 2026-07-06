import { escapeHtml } from '../shared/browser-utils.js';
import {
  JP_ROAD_MARKING_STANDARD_ID,
  ROAD_WIDTH_PRESETS,
  SIDEWALK_WIDTH_PRESETS,
} from './presets.js';
import { fmt } from './geometry.js';
import {
  applyRoadHatchPresetData,
  applyRoadMarkingPresetData,
  roadHatchPresetByKey,
  roadHatchSelectOptions,
  roadMarkingPresetByKey,
  roadMarkingSelectOptions,
} from './road-marking-presets.js';

export function markingPresetByKey(key) {
  return roadMarkingPresetByKey(key);
}

export function hatchPresetByKey(key) {
  return roadHatchPresetByKey(key);
}

export function markingOptionsHtml(selectedKey) {
  const selected = markingPresetByKey(selectedKey || 'stopLine').key;
  return roadMarkingSelectOptions().map(option => `<option value="${option.value}" ${option.value === selected ? 'selected' : ''}>${escapeHtml(option.label)} / ${escapeHtml(option.jpName)}</option>`).join('');
}

export function hatchOptionsHtml(selectedKey) {
  const selected = hatchPresetByKey(selectedKey || 'round600').key;
  return roadHatchSelectOptions().map(option => `<option value="${option.value}" ${option.value === selected ? 'selected' : ''}>${escapeHtml(option.label)}</option>`).join('');
}

export function applyRoadMarkingPreset(feature, key, scaleContext = {}) {
  const next = applyRoadMarkingPresetData(feature, key, scaleContext);
  Object.assign(feature, next, { standard: next.standard || JP_ROAD_MARKING_STANDARD_ID });
  return feature;
}

export function applyRoadHatchPreset(feature, key, scaleContext = {}) {
  Object.assign(feature, applyRoadHatchPresetData(feature, key, scaleContext));
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
