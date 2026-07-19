export function renderFabricDetail({
  fabricRegion,
  panel,
  state,
  getElement,
  fmt,
  escapeAttr,
  escapeHtml,
  fabricPresets,
  syncAll,
  normalizeFabricRegion,
  generateFabricForRegion,
  deleteSelectedFabricRegion,
}) {
  normalizeFabricRegion(fabricRegion);
  const presetOptions = Object.entries(fabricPresets).map(([key, preset]) =>
    `<option value="${key}" ${key === fabricRegion.fabricType ? 'selected' : ''}>${escapeHtml(preset.label)}</option>`
  ).join('');
  const padCount = state.buildings.filter(building => building.fabricRegionId === fabricRegion.id).length;
  panel.innerHTML = `
    <b>${escapeHtml(fabricRegion.name || 'Fabric Region')} selected</b>
    <label>Name</label><input id="fabricNameSel" value="${escapeAttr(fabricRegion.name || '')}">
    <label>Fabric preset</label><select id="fabricPresetSel">${presetOptions}</select>
    <div class="row"><div><label>Density</label><input id="fabricDensitySel" type="range" min="0.4" max="1.6" step="0.1" value="${fmt(fabricRegion.density)}"></div><div><label>Randomness</label><input id="fabricRandomnessSel" type="range" min="0" max="1" step="0.05" value="${fmt(fabricRegion.randomness)}"></div></div>
    <div class="row"><div><label>Seed</label><input id="fabricSeedSel" type="number" step="1" value="${fmt(fabricRegion.seed)}"></div><div><label>Color</label><input id="fabricColorSel" type="color" value="${fabricRegion.color || '#7c5f3f'}"></div></div>
    <div class="row"><div><label>Average floors</label><input id="fabricAvgFloorsSel" type="number" min="1" max="12" step="1" value="${fmt(fabricRegion.averageFloorCount)}"></div><div><label>Max floors</label><input id="fabricMaxFloorsSel" type="number" min="1" max="16" step="1" value="${fmt(fabricRegion.maxFloorCount)}"></div></div>
    <div class="small muted" style="margin-top:6px">${padCount} generated pad${padCount === 1 ? '' : 's'} currently reference this region. Deleting the region keeps those pads and detaches them.</div>
    <div class="buttons" style="margin-top:8px"><button id="generateFabricRegion" class="primary">${padCount ? 'Regenerate Pads' : 'Generate Pads'}</button><button id="deleteFabricRegion" class="danger">Delete Fabric Region</button></div>`;

  const bindFabric = (id, update) => {
    const element = getElement(id);
    if (!element) return;
    element.oninput = () => {
      update(element.value);
      normalizeFabricRegion(fabricRegion);
      syncAll();
    };
  };
  bindFabric('fabricNameSel', value => fabricRegion.name = value);
  bindFabric('fabricDensitySel', value => fabricRegion.density = Math.max(.4, Math.min(1.6, parseFloat(value) || 1)));
  bindFabric('fabricRandomnessSel', value => fabricRegion.randomness = Math.max(0, Math.min(1, parseFloat(value) || 0)));
  bindFabric('fabricSeedSel', value => fabricRegion.seed = parseInt(value) || 101);
  bindFabric('fabricColorSel', value => fabricRegion.color = value);
  bindFabric('fabricAvgFloorsSel', value => fabricRegion.averageFloorCount = Math.max(1, parseInt(value) || 1));
  bindFabric('fabricMaxFloorsSel', value => fabricRegion.maxFloorCount = Math.max(1, parseInt(value) || 1));
  const preset = getElement('fabricPresetSel'); if (preset) preset.onchange = () => { fabricRegion.fabricType = preset.value; state.fabricPreset = preset.value; syncAll(); };
  getElement('generateFabricRegion').onclick = () => generateFabricForRegion(fabricRegion, { confirmReplace: true });
  getElement('deleteFabricRegion').onclick = deleteSelectedFabricRegion;
}
