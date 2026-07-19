import { createSidebarInputBinder } from './sidebar-input-binding.js';

export function renderStlDetail({
  stlObject,
  panel,
  getElement,
  fmt,
  escapeAttr,
  escapeHtml,
  slug,
  syncAll,
  normalizeStlObject,
  installAdaptiveDegreeStepping,
  attachSourceFileToStlObject,
  downloadBase64,
  deleteSelectedStlObject,
}) {
  normalizeStlObject(stlObject);
  const fallbackLabels = {
    'asset-unavailable': 'asset unavailable',
    'asset-missing': 'proxy fallback',
    'mesh-too-large': 'proxy fallback: large STL',
    'parse-failed': 'proxy fallback: unreadable STL',
  };
  const assetStatus = stlObject.asset?.renderFallbackReason
    ? ` · ${fallbackLabels[stlObject.asset.renderFallbackReason] || 'proxy fallback'}`
    : (stlObject.asset?.unavailable ? ' · asset unavailable' : (!stlObject.asset?.dataBase64 && stlObject.asset?.path ? ' · referenced asset' : ''));
  const sourceList = (stlObject.sourceAssets || []).map((source, index) => `
    <div class="listItem compact">
      <div><b>${escapeHtml(source.name || source.fileName || 'Source file')}</b><br><span class="small muted">${escapeHtml(source.fileName || 'source file')}${source.unavailable ? ' · unavailable' : (!source.dataBase64 && source.path ? ' · referenced asset' : '')}</span></div>
      <div class="buttons"><button data-stl-source-download="${index}" ${source.dataBase64 ? '' : 'disabled'}>Download</button><button data-stl-source-delete="${index}" class="danger">Remove</button></div>
    </div>`).join('') || '<div class="small muted">No source file attached.</div>';
  panel.innerHTML = `
    <b>${escapeHtml(stlObject.name || 'STL Object')} selected</b>
    <label>Name</label><input id="stlName" value="${escapeAttr(stlObject.name || '')}">
    <div class="row"><div><label>Rotation °</label><input id="stlRot" type="number" step="1" value="${fmt(stlObject.rotationDeg || 0)}"></div><div><label>Scale</label><input id="stlScale" type="number" min="0.01" step="0.01" value="${fmt(stlObject.scale || 1)}"></div></div>
    <div class="row"><div><label>Width mm</label><input id="stlW" type="number" min="0.1" step="0.1" value="${fmt(stlObject.widthMm || 0)}"></div><div><label>Depth mm</label><input id="stlD" type="number" min="0.1" step="0.1" value="${fmt(stlObject.depthMm || 0)}"></div></div>
    <div class="row"><div><label>Height mm</label><input id="stlH" type="number" min="0.1" step="0.1" value="${fmt(stlObject.heightMm || 0)}"></div><div><label>Color</label><input id="stlColor" type="color" value="${stlObject.color || '#496a78'}"></div></div>
    <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="stlLocked" type="checkbox" ${stlObject.locked ? 'checked' : ''}> <span>Lock object</span></label>
    <label>Notes</label><textarea id="stlNotes" rows="3">${escapeHtml(stlObject.notes || '')}</textarea>
    <div class="small muted" style="margin-top:6px">File: ${escapeHtml(stlObject.asset?.fileName || 'STL asset')} · ${escapeHtml(stlObject.bounds?.format || 'unknown')} bounds${escapeHtml(assetStatus)} · renders as STL geometry when available.</div>
    <label>Source files</label>
    <div>${sourceList}</div>
    <input id="stlSourceFileInput" class="hiddenFile" type="file" accept=".scad,.blend,.py,.js,.json,.txt,.obj,.dae,.3mf">
    <div class="buttons" style="margin-top:8px"><button id="attachStlSourceFile">Attach Source</button><button id="downloadStlObject" ${stlObject.asset?.dataBase64 ? '' : 'disabled'}>Download STL</button><button id="deleteStlObject" class="danger">Delete Object</button></div>`;

  const updateDimensions = () => { normalizeStlObject(stlObject); syncAll(); };
  const { bindInput } = createSidebarInputBinder({ getElement, afterInput: updateDimensions });
  bindInput('stlName', value => stlObject.name = value);
  bindInput('stlRot', value => stlObject.rotationDeg = parseFloat(value) || 0);
  bindInput('stlScale', value => stlObject.scale = Math.max(.01, parseFloat(value) || 1));
  bindInput('stlW', value => stlObject.widthMm = Math.max(.1, parseFloat(value) || .1));
  bindInput('stlD', value => stlObject.depthMm = Math.max(.1, parseFloat(value) || .1));
  bindInput('stlH', value => stlObject.heightMm = Math.max(.1, parseFloat(value) || .1));
  bindInput('stlColor', value => stlObject.color = value);
  bindInput('stlLocked', value => stlObject.locked = !!value);
  bindInput('stlNotes', value => stlObject.notes = value);
  installAdaptiveDegreeStepping(getElement('stlRot'));
  getElement('attachStlSourceFile').onclick = () => getElement('stlSourceFileInput')?.click();
  getElement('stlSourceFileInput').onchange = async event => {
    const file = event.target.files && event.target.files[0];
    if (file) await attachSourceFileToStlObject(stlObject, file);
    event.target.value = '';
  };
  panel.querySelectorAll('[data-stl-source-download]').forEach(button => {
    button.onclick = () => {
      const source = (stlObject.sourceAssets || [])[Number(button.dataset.stlSourceDownload)];
      if (source) downloadBase64(source.dataBase64, source.fileName || source.name || 'source-file', source.mimeType || 'application/octet-stream');
    };
  });
  panel.querySelectorAll('[data-stl-source-delete]').forEach(button => {
    button.onclick = () => {
      const index = Number(button.dataset.stlSourceDelete);
      stlObject.sourceAssets = (stlObject.sourceAssets || []).filter((_source, sourceIndex) => sourceIndex !== index);
      syncAll();
    };
  });
  getElement('downloadStlObject').onclick = () => downloadBase64(stlObject.asset?.dataBase64, stlObject.asset?.fileName || `${slug(stlObject.name || 'site-object')}.stl`, stlObject.asset?.mimeType || 'model/stl');
  getElement('deleteStlObject').onclick = deleteSelectedStlObject;
}
