export function renderBenchworkDetail({
  benchwork,
  panel,
  getElement,
  escapeAttr,
  escapeHtml,
  syncAll,
  normalizeBenchworkOutline,
  deleteSelectedBenchwork,
}) {
  normalizeBenchworkOutline(benchwork);
  panel.innerHTML = `
    <b>Benchwork outline selected</b>
    <label>Name</label><input id="benchName" value="${escapeAttr(benchwork.name || 'Benchwork Outline')}">
    <div class="row"><div><label>Color</label><input id="benchColor" type="color" value="${benchwork.color || '#2f6f4e'}"></div><div><label>Points</label><input value="${(benchwork.pointsPx || []).length}" disabled></div></div>
    <label style="display:flex;align-items:center;gap:6px;margin-top:6px"><input id="benchLocked" type="checkbox" ${benchwork.locked ? 'checked' : ''}> Locked</label>
    <label>Notes</label><textarea id="benchNotes" rows="3">${escapeHtml(benchwork.notes || '')}</textarea>
    <div class="buttons" style="margin-top:8px"><button id="clearBenchCurves">Clear Curves</button><button id="deleteBench" class="danger">Delete Benchwork</button></div>
    <div class="small muted" style="margin-top:8px">Hover an edge segment on the selected outline and drag to curve it. Anything beyond this boundary can be trimmed in future export stages.</div>`;

  const bindBenchwork = (id, update) => {
    const element = getElement(id);
    if (!element) return;
    element.oninput = () => {
      update(element.type === 'checkbox' ? element.checked : element.value);
      syncAll();
    };
  };
  bindBenchwork('benchName', value => benchwork.name = value);
  bindBenchwork('benchColor', value => benchwork.color = value);
  bindBenchwork('benchLocked', value => benchwork.locked = !!value);
  bindBenchwork('benchNotes', value => benchwork.notes = value);
  getElement('clearBenchCurves').onclick = () => {
    benchwork.curvesPx = (benchwork.pointsPx || []).map(() => null);
    syncAll();
  };
  getElement('deleteBench').onclick = deleteSelectedBenchwork;
}
