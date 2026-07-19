export function renderMultiBuildingDetail({
  selectedIds,
  panel,
  state,
  getElement,
  clearBuildingSelection,
  syncAll,
}) {
  panel.innerHTML = `<b>${selectedIds.length} buildings selected</b><br><span class="small muted">Drag any selected footprint to move the whole selection. Use keyboard shortcuts to copy/paste selected building footprints.</span><div class="buttons" style="margin-top:8px"><button id="clearMultiB">Clear Selection</button><button id="deleteMultiB" class="danger">Delete Selected</button></div>`;
  getElement('clearMultiB').onclick = () => { clearBuildingSelection(); syncAll(); };
  getElement('deleteMultiB').onclick = () => {
    state.buildings = state.buildings.filter(building => !selectedIds.includes(building.id));
    clearBuildingSelection();
    syncAll();
  };
}
