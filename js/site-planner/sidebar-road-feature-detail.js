import { createSidebarInputBinder } from './sidebar-input-binding.js';

export function renderRoadFeatureDetail({
  roadFeature,
  panel,
  state,
  getElement,
  fmt,
  escapeAttr,
  escapeHtml,
  mmToPx,
  syncAll,
  normalizeRoadFeature,
  installAdaptiveDegreeStepping,
  hatchOptionsHtml,
  markingOptionsHtml,
  markingPresetByKey,
  grateFamilyOptionsHtml,
  syncPhysicalGrateSpecDimensions,
  applyRoadHatchPreset,
  applyRoadMarkingPreset,
  roadPresetScaleContext,
  setPhysicalGrateMode,
  applyPhysicalGrateFamily,
  setRoadMarkingOutputMode,
  fitRoadMarkingToRoad,
  alignRoadMarkingToRoad,
  deleteSelectedRoadFeature,
}) {
  normalizeRoadFeature(roadFeature);
  panel.innerHTML = `
    <b>${roadFeature.kind === 'manhole' ? 'Manhole / Hatch' : 'Japanese road marking'} selected</b>
    <label>Name</label><input id="rfName" value="${escapeAttr(roadFeature.name || 'Road item')}">
    ${roadFeature.kind === 'manhole' ? `<label>Hatch preset</label><select id="rfHatchPreset">${hatchOptionsHtml(roadFeature.hatchPreset)}</select>
    <label>Shape</label><select id="rfShape"><option value="circle">Round cut hole</option><option value="rect">Rectangular cut hole</option></select>
    <label>Physical insert</label><select id="rfPhysicalInsert"><option value="">Visual / cut opening only</option><option value="foldedDrainageGrateInsert">Physical see-through insert</option></select>
    <label>Grate family</label><select id="rfGrateFamily">${grateFamilyOptionsHtml(roadFeature.grateInsertSpec?.key)}</select>
    <div class="row"><div><label>Diameter mm</label><input id="rfDia" type="number" step="0.1" value="${fmt(roadFeature.diameterMm || 0)}"></div><div><label>Rotation °</label><input id="rfRot" type="number" step="1" value="${fmt(roadFeature.rotationDeg || 0)}"></div></div>
    <div class="row"><div><label>Width mm</label><input id="rfW" type="number" step="0.1" value="${fmt(roadFeature.widthMm || 0)}"></div><div><label>Depth mm</label><input id="rfD" type="number" step="0.1" value="${fmt(roadFeature.depthMm || 0)}"></div></div>
    <div class="small muted">Exports as <code>roadHatchCut</code> for mounting separate printed or detailed hatch/manhole pieces.</div>` : `<label>Japanese marking preset</label><select id="rfMarkingPreset">${markingOptionsHtml(roadFeature.markingPreset || roadFeature.markingType)}</select>
    <div class="small muted" style="margin:4px 0">${escapeHtml(roadFeature.jpName || '')} · ${escapeHtml(roadFeature.markingCategory || '')}</div>
    <label>Output</label><select id="rfMarkingOutput"><option value="etch">Etch / visual on road deck</option><option value="paintStencil">Paint stencil sheet</option></select>
    <div id="rfStencilOptions" style="display:${roadFeature.outputMode === 'paintStencil' ? 'block' : 'none'}">
      <label>Stencil stock material ID</label><input id="rfStencilMaterialId" value="${escapeAttr(roadFeature.stencilMaterialId || 'stencil-stock')}">
      <div class="row"><div><label>Frame margin mm</label><input id="rfStencilMargin" type="number" min="0" step="0.1" value="${fmt(roadFeature.stencilSpec?.marginMm ?? 2)}"></div><div><label>Bridge guide mm</label><input id="rfStencilBridge" type="number" min="0" step="0.05" value="${fmt(roadFeature.stencilSpec?.bridgeMm ?? .35)}"></div></div>
    </div>
    <label>Orientation mode</label><select id="rfOrientationMode"><option value="parallel">Parallel to road</option><option value="perpendicular">Perpendicular to road</option><option value="directional">Directional marking</option><option value="fixed">Fixed angle</option><option value="manual">Manual override</option></select>
    <div class="row"><div><label>Width mm</label><input id="rfW" type="number" step="0.1" value="${fmt(roadFeature.widthMm || 0)}"></div><div><label>Depth mm</label><input id="rfD" type="number" step="0.1" value="${fmt(roadFeature.depthMm || 0)}"></div></div>
    <div class="row"><div><label>Rotation °</label><input id="rfRot" type="number" step="1" value="${fmt(roadFeature.rotationDeg || 0)}"></div><div><label>Color</label><input id="rfColor" type="color" value="${roadFeature.color || '#f7f2df'}"></div></div>
    <div class="buttons" style="margin-top:8px"><button id="realignRoadMarking" type="button">Realign to Road</button><button id="fitRoadMarking" type="button">Fit to Road</button></div>
    <div class="small muted">Etch mode exports <code>roadMarkingEtch</code>. Paint stencil mode exports a separate inverse stencil sheet from real stock.</div>`}
    <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="rfLocked" type="checkbox" ${roadFeature.locked ? 'checked' : ''}> <span>Lock item</span></label>
    <div class="buttons" style="margin-top:8px"><button id="deleteRoadFeature" class="danger">Delete Item</button></div>`;

  const { bindInput } = createSidebarInputBinder({ getElement, afterInput: () => { normalizeRoadFeature(roadFeature); syncAll(); } });
  bindInput('rfName', value => roadFeature.name = value);
  bindInput('rfRot', value => {
    roadFeature.rotationDeg = parseFloat(value) || 0;
    if (roadFeature.kind === 'marking') { roadFeature.orientationMode = 'manual'; roadFeature.autoAlignedToRoad = false; }
  });
  bindInput('rfLocked', value => roadFeature.locked = !!value);
  bindInput('rfColor', value => roadFeature.color = value);
  installAdaptiveDegreeStepping(getElement('rfRot'));
  bindInput('rfDia', value => { roadFeature.diameterMm = parseFloat(value) || 0; roadFeature.diameterPx = state.pxPerMm ? mmToPx(roadFeature.diameterMm) : roadFeature.diameterPx; syncPhysicalGrateSpecDimensions(roadFeature); });
  bindInput('rfW', value => { roadFeature.widthMm = parseFloat(value) || 0; roadFeature.widthPx = state.pxPerMm ? mmToPx(roadFeature.widthMm) : roadFeature.widthPx; syncPhysicalGrateSpecDimensions(roadFeature); });
  bindInput('rfD', value => { roadFeature.depthMm = parseFloat(value) || 0; roadFeature.depthPx = state.pxPerMm ? mmToPx(roadFeature.depthMm) : roadFeature.depthPx; syncPhysicalGrateSpecDimensions(roadFeature); });
  const hatchPreset = getElement('rfHatchPreset'); if (hatchPreset) hatchPreset.onchange = () => { state.lastRoadHatchPreset = hatchPreset.value; applyRoadHatchPreset(roadFeature, hatchPreset.value, roadPresetScaleContext()); syncAll(); };
  const shape = getElement('rfShape'); if (shape) { shape.value = roadFeature.hatchShape || 'circle'; shape.onchange = () => { roadFeature.hatchShape = shape.value; syncPhysicalGrateSpecDimensions(roadFeature); syncAll(); }; }
  const physicalInsert = getElement('rfPhysicalInsert'); if (physicalInsert) { physicalInsert.value = roadFeature.physicalInsert || ''; physicalInsert.onchange = () => { setPhysicalGrateMode(roadFeature, !!physicalInsert.value); syncAll(); }; }
  const grateFamily = getElement('rfGrateFamily'); if (grateFamily) { grateFamily.disabled = !roadFeature.physicalInsert; grateFamily.onchange = () => { applyPhysicalGrateFamily(roadFeature, grateFamily.value); syncAll(); }; }
  const markingPreset = getElement('rfMarkingPreset'); if (markingPreset) markingPreset.onchange = () => { state.lastRoadMarkingPreset = markingPreset.value; applyRoadMarkingPreset(roadFeature, markingPreset.value, roadPresetScaleContext()); fitRoadMarkingToRoad(roadFeature); alignRoadMarkingToRoad(roadFeature); syncAll(); };
  const orientation = getElement('rfOrientationMode'); if (orientation) { orientation.value = roadFeature.orientationMode || markingPresetByKey(roadFeature.markingPreset || roadFeature.markingType).orientationMode || 'parallel'; orientation.onchange = () => { roadFeature.orientationMode = orientation.value; if (orientation.value !== 'manual' && orientation.value !== 'fixed') alignRoadMarkingToRoad(roadFeature); syncAll(); }; }
  const realign = getElement('realignRoadMarking'); if (realign) realign.onclick = () => { if (alignRoadMarkingToRoad(roadFeature, { force: true })) syncAll(); };
  const fit = getElement('fitRoadMarking'); if (fit) fit.onclick = () => { if (fitRoadMarkingToRoad(roadFeature)) syncAll(); };
  const output = getElement('rfMarkingOutput'); if (output) { output.value = roadFeature.outputMode === 'paintStencil' ? 'paintStencil' : 'etch'; output.onchange = () => { setRoadMarkingOutputMode(roadFeature, output.value); syncAll(); }; }
  bindInput('rfStencilMaterialId', value => { roadFeature.stencilMaterialId = value || 'stencil-stock'; setRoadMarkingOutputMode(roadFeature, 'paintStencil'); });
  bindInput('rfStencilMargin', value => { roadFeature.stencilSpec = { ...(roadFeature.stencilSpec || {}), marginMm: Math.max(0, parseFloat(value) || 0) }; setRoadMarkingOutputMode(roadFeature, 'paintStencil'); });
  bindInput('rfStencilBridge', value => { roadFeature.stencilSpec = { ...(roadFeature.stencilSpec || {}), bridgeMm: Math.max(0, parseFloat(value) || 0) }; setRoadMarkingOutputMode(roadFeature, 'paintStencil'); });
  getElement('deleteRoadFeature').onclick = deleteSelectedRoadFeature;
}
