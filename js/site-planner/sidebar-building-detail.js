import { createSidebarInputBinder } from './sidebar-input-binding.js';

export function renderBuildingDetail({
  building,
  panel,
  getElement,
  fmt,
  escapeAttr,
  escapeHtml,
  slug,
  syncAll,
  syncBuildingMetrics,
  syncSelectedBuildingLive,
  site3DBuildingHeightMm,
  site3DBuildingConfig,
  site3DBuildingElevationMm,
  hakoFileSummary,
  hakoFileText,
  renameAttachedHakoFileForBuilding,
  installAdaptiveDegreeStepping,
  applySelectedBuildingDimensionInput,
  attachHakoFileToSelectedBuilding,
  downloadText,
  openBuildingInHakoMachi,
  copyHakoSeedForBuilding,
  transformedRect,
}) {
  syncBuildingMetrics(building);
  panel.innerHTML = `
    <label>Name</label><input id="selName" value="${escapeAttr(building.name || '')}">
    <div class="row"><div><label>Status</label><select id="selState"><option value="notStarted">Not Started</option><option value="inProgress">In Progress</option><option value="awaitingConstruction">Awaiting Construction</option><option value="complete">Complete</option></select></div><div><label>Color</label><input id="selColor" type="color" value="${building.color || '#d79631'}"></div></div>
    <div class="row"><div><label>Category</label><input id="selCat" value="${escapeAttr(building.category || 'industrial')}"></div><div><label>Type</label><input value="${building.padType}" disabled></div></div>
    <div class="row"><div><label>Rotation °</label><input id="selRot" type="number" step="0.1" value="${fmt(building.rotationDeg || 0)}"></div><div><label>Stored file</label><input value="${building.hakoFile ? '.hako attached' : 'none'}" disabled></div></div>
    ${building.padType === 'rect' ? `<div class="row"><div><label>Width mm</label><input id="selW" type="number" step="0.1" value="${fmt(building.widthMm)}"></div><div><label>Depth mm</label><input id="selD" type="number" step="0.1" value="${fmt(building.depthMm)}"></div></div>` : `<div class="small"><span class="pill">Area ${fmt(building.derived?.areaMm2 || 0)} mm²</span><span class="pill">Bounds ${fmt(building.derived?.boundingWidthMm || 0)}×${fmt(building.derived?.boundingDepthMm || 0)} mm</span></div>`}
    <div class="row"><div><label>3D height mm</label><input id="sel3dHeight" type="number" min="0.1" step="0.1" value="${fmt(site3DBuildingHeightMm(building, site3DBuildingConfig(building)))}"></div><div><label>Base elevation mm</label><input id="sel3dElevation" type="number" step="0.1" value="${fmt(site3DBuildingElevationMm(building))}"></div></div>
    <div class="buttons" style="margin:10px 0 8px"><button id="copySeedB">Copy HakoSeed</button></div>
    <div class="small muted" style="margin:-2px 0 8px">Creates a HakoSeed payload for this building and opens <code>building-generator.html#sitePlannerSeed</code>.</div>
    <label>Completed .hako file</label>
    <div id="hakoFileSummaryB" class="codebox" style="margin:4px 0 6px;white-space:normal">${hakoFileSummary(building)}</div>
    <input id="hakoFileInput" type="file" accept=".hako,.json,application/json" style="display:none">
    <div class="buttons" style="margin-bottom:8px"><button id="downloadHakoB" ${hakoFileText(building) ? '' : 'disabled'}>Download .hako</button></div>
    <div class="small muted" style="margin:-4px 0 8px">Drop a .hako anywhere in this sidebar to attach it to this footprint.</div>
    <label>Notes</label><textarea id="selNotes" rows="3">${escapeHtml(building.notes || '')}</textarea>
    ${building.padType === 'rect' ? '<div class="buttons" style="margin-top:8px"><button id="polyB">Convert to Polygon</button></div>' : ''}
    <div class="buttons sitePlannerPrimaryActionRow"><button id="openSelectedHakoB" class="primary sitePlannerPrimaryAction">Open in HakoMachi</button></div>`;
  const { bindInput } = createSidebarInputBinder({ getElement, afterInput: () => syncSelectedBuildingLive(building) });
  bindInput('selName', value => { building.name = value; renameAttachedHakoFileForBuilding(building); });
  bindInput('selCat', value => building.category = value);
  bindInput('selColor', value => building.color = value);
  bindInput('selRot', value => building.rotationDeg = parseFloat(value) || 0);
  bindInput('sel3dHeight', value => building.plannerHeightMm = Math.max(.1, parseFloat(value) || .1));
  bindInput('sel3dElevation', value => building.baseElevationMm = parseFloat(value) || 0);
  bindInput('selNotes', value => building.notes = value);
  installAdaptiveDegreeStepping(getElement('selRot'));
  const buildingState = getElement('selState'); if (buildingState) { buildingState.value = building.state || 'notStarted'; buildingState.onchange = event => { building.state = event.target.value; syncAll(); }; }
  const width = getElement('selW'); const depth = getElement('selD');
  if (width) width.onchange = () => applySelectedBuildingDimensionInput(building, 'width', width.value, width);
  if (depth) depth.onchange = () => applySelectedBuildingDimensionInput(building, 'depth', depth.value, depth);
  const hakoInput = getElement('hakoFileInput'); if (hakoInput) hakoInput.onchange = event => { const file = event.target.files && event.target.files[0]; if (file) attachHakoFileToSelectedBuilding(file, { source: 'selected-building-picker' }); event.target.value = ''; };
  const download = getElement('downloadHakoB'); if (download) download.onclick = () => { const text = hakoFileText(building); if (!text) return; downloadText(text, building.hakoFile?.fileName || `${slug(building.name)}.hako`, building.hakoFile?.mimeType || 'application/json'); };
  const open = getElement('openSelectedHakoB'); if (open) open.onclick = () => openBuildingInHakoMachi(building);
  const copy = getElement('copySeedB'); if (copy) copy.onclick = () => copyHakoSeedForBuilding(building);
  const polygon = getElement('polyB'); if (polygon) polygon.onclick = () => { building.padType = 'polygon'; building.pointsPx = transformedRect(building); delete building.widthPx; delete building.depthPx; syncAll(); };
}
