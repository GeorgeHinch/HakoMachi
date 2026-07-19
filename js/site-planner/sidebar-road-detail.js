import { createSidebarInputBinder } from './sidebar-input-binding.js';

export function renderRoadDetail({
  road,
  panel,
  state,
  getElement,
  fmt,
  escapeAttr,
  mmToPx,
  syncAll,
  normalizeRoad,
  syncRoadMetrics,
  roadWidthPresets,
  sidewalkWidthPresets,
  presetOptionsHtml,
  currentScaleDivisor,
  applyRoadWidthPreset,
  applySidewalkWidthPreset,
  normalizeDrivingSide,
  roadIntersectionMarkingControls,
  roadSystem,
  showStatusHint,
  deleteSelectedRoad,
}) {
  normalizeRoad(road);
  const roadPresetKey = road.roadWidthPreset || 'custom';
  const sidewalkPresetKey = road.sidewalkWidthPreset || 'custom';
  const showRoadOverride = road.mode !== 'outline' && roadPresetKey === 'custom';
  const showSidewalkOverride = road.mode !== 'outline' && sidewalkPresetKey === 'custom';
  const roadMarkingCount = (state.roadFeatures || []).filter(feature => feature?.kind === 'marking' && feature.roadId === road.id).length;
  panel.innerHTML = `
    <b>${road.mode === 'outline' ? 'Road outline' : 'Road centerline'} selected</b>
    <label>Name</label><input id="roadName" value="${escapeAttr(road.name || 'Road')}">
    <label>Road width preset</label><select id="roadWidthPreset" ${road.mode === 'outline' ? 'disabled' : ''}>${presetOptionsHtml(roadWidthPresets, roadPresetKey, currentScaleDivisor())}</select>
    <div id="roadWidthOverrideWrap" style="display:${showRoadOverride ? 'block' : 'none'}"><label>Width override (mm)</label><input id="roadWidth" type="number" step="0.1" value="${fmt(road.widthMm || 0)}" ${road.mode === 'outline' ? 'disabled' : ''}></div>
    <label>Sidewalk</label><select id="roadSidewalk" ${road.mode === 'outline' ? 'disabled' : ''}><option value="none">None</option><option value="left">Left</option><option value="right">Right</option><option value="both">Both sides</option></select>
    <label>Sidewalk width preset</label><select id="roadSidewalkPreset" ${road.mode === 'outline' ? 'disabled' : ''}>${presetOptionsHtml(sidewalkWidthPresets, sidewalkPresetKey, currentScaleDivisor())}</select>
    <div id="roadSidewalkOverrideWrap" style="display:${showSidewalkOverride ? 'block' : 'none'}"><label>Sidewalk width override (mm)</label><input id="roadSidewalkWidth" type="number" step="0.1" value="${fmt(road.sidewalkWidthMm || 0)}" ${road.mode === 'outline' ? 'disabled' : ''}></div>
    <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="roadLocked" type="checkbox" ${road.locked ? 'checked' : ''}> <span>Lock road</span></label>
    <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="roadIntersectionDetails" type="checkbox" ${state.roadIntersectionDetails !== false ? 'checked' : ''}> <span>Show automatic intersection markings</span></label>
    <label>Driving side</label><select id="roadDrivingSide"><option value="left">Left-hand traffic (Japan)</option><option value="right">Right-hand traffic</option></select>
    ${roadIntersectionMarkingControls.controlsHtml(road.id)}
    <div class="buttons" style="margin-top:8px"><button id="realignRoadMarkingsForRoad" type="button" ${roadMarkingCount ? '' : 'disabled'}>Realign Road Markings</button><button id="fitRoadMarkingsForRoad" type="button" ${roadMarkingCount ? '' : 'disabled'}>Fit Road Markings</button></div>
    <div class="small muted">${roadMarkingCount} road marking${roadMarkingCount === 1 ? '' : 's'} attached to this road.</div>
    <div class="buttons" style="margin-top:8px"><button id="regenRoad">Regenerate road geometry</button><button id="deleteRoad" class="danger">Delete Road</button></div>
    <div class="small muted" style="margin-top:8px">Presets are common real-world widths converted to physical output millimeters using the calibration scale divisor. Choose <b>Custom / override</b> to show manual width fields. Centerlines can be polyline paths; hover a selected segment and drag to bend it into a curve. Laser-cut road export is not enabled yet.</div>`;

  getElement('roadSidewalk').value = road.sidewalkSide || 'none';
  const { bindInput } = createSidebarInputBinder({ getElement, afterInput: () => { syncRoadMetrics(road); syncAll(); } });
  bindInput('roadName', value => road.name = value);
  bindInput('roadWidthPreset', value => applyRoadWidthPreset(road, value));
  bindInput('roadWidth', value => { road.roadWidthPreset = 'custom'; road.widthMm = parseFloat(value) || 0; road.widthPx = state.pxPerMm ? mmToPx(road.widthMm) : road.widthPx; });
  bindInput('roadSidewalk', value => road.sidewalkSide = value);
  bindInput('roadSidewalkPreset', value => applySidewalkWidthPreset(road, value));
  bindInput('roadSidewalkWidth', value => { road.sidewalkWidthPreset = 'custom'; road.sidewalkWidthMm = parseFloat(value) || 0; road.sidewalkWidthPx = state.pxPerMm ? mmToPx(road.sidewalkWidthMm) : road.sidewalkWidthPx; });
  bindInput('roadLocked', value => road.locked = !!value);
  bindInput('roadIntersectionDetails', value => state.roadIntersectionDetails = !!value);
  const drivingSide = getElement('roadDrivingSide'); if (drivingSide) { drivingSide.value = normalizeDrivingSide(state.roadDrivingSide); drivingSide.onchange = () => { state.roadDrivingSide = normalizeDrivingSide(drivingSide.value); syncAll(); }; }
  roadIntersectionMarkingControls.bindArmCheckbox('roadIntersectionCrosswalks', road.id, 'crosswalkEnabled');
  roadIntersectionMarkingControls.bindArmCheckbox('roadIntersectionStopBars', road.id, 'stopBarEnabled');
  roadIntersectionMarkingControls.bindArmCheckbox('roadIntersectionTactile', road.id, 'tactilePaversEnabled');
  roadIntersectionMarkingControls.bindArmCheckbox('roadIntersectionCurbGuides', road.id, 'curbGuideEnabled');
  roadIntersectionMarkingControls.bindFeatureToggles();
  const realign = getElement('realignRoadMarkingsForRoad'); if (realign) realign.onclick = () => { const updated = roadSystem.realignRoadMarkingsForRoad(road.id); showStatusHint(`Realigned ${updated} road marking${updated === 1 ? '' : 's'} on ${road.name || 'road'}.`); syncAll(); };
  const fit = getElement('fitRoadMarkingsForRoad'); if (fit) fit.onclick = () => { const updated = roadSystem.fitRoadMarkingsForRoad(road.id); showStatusHint(`Fit ${updated} road marking${updated === 1 ? '' : 's'} to ${road.name || 'road'} bounds.`); syncAll(); };
  roadIntersectionMarkingControls.bindClearArmOverrides(road.id);
  getElement('regenRoad').onclick = () => syncAll();
  getElement('deleteRoad').onclick = deleteSelectedRoad;
}
