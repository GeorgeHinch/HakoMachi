export function renderRoadIntersectionDetail({
  roadIntersection,
  panel,
  state,
  getElement,
  fmt,
  escapeAttr,
  escapeHtml,
  syncAll,
  roadSystem,
  roadIntersectionKey,
  normalizeIntersectionOverride,
  roadArmKey,
}) {
  const intersectionKey = roadIntersectionKey(roadIntersection);
  const override = normalizeIntersectionOverride((state.roadIntersectionOverrides || {})[intersectionKey]);
  const generatedType = roadIntersection.type || 'intersection';
  const arms = (roadIntersection.arms || []).map(arm => `${roadArmKey(arm)}${arm.roadName ? ` · ${arm.roadName}` : ''}`);
  panel.innerHTML = `
    <b>Road intersection selected</b>
    <div class="small muted" style="margin:4px 0 8px">${escapeHtml(generatedType)} · ${(roadIntersection.arms || []).length} connected arm${(roadIntersection.arms || []).length === 1 ? '' : 's'}</div>
    <label>Name</label><input id="roadIntersectionName" value="${escapeAttr(override.label || roadIntersection.label || '')}">
    <label>Type hint</label><select id="roadIntersectionType"><option value="auto">Auto generated</option><option value="corner">Corner</option><option value="t-junction">T-junction</option><option value="cross-junction">Cross junction</option><option value="multi-junction">Multi junction</option><option value="straight-join">Straight join</option><option value="service">Service road</option><option value="driveway">Driveway</option></select>
    <label>Merge mode</label><select id="roadIntersectionMerge"><option value="auto">Auto blend</option><option value="blend">Blend corners</option><option value="miter">Miter corners</option><option value="keep-arms">Keep road arms separate</option></select>
    <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="roadIntersectionEnabled" type="checkbox" ${override.enabled ? 'checked' : ''}> <span>Generate intersection geometry and markings</span></label>
    <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="roadIntersectionLocked" type="checkbox" ${override.locked ? 'checked' : ''}> <span>Lock generated settings</span></label>
    <div class="row"><div><label>Corner radius px</label><input id="roadIntersectionCurbRadius" type="number" step="1" value="${override.curbRadiusPx == null ? '' : fmt(override.curbRadiusPx)}"></div><div><label>Sidewalk bulb px</label><input id="roadIntersectionSidewalkRadius" type="number" step="1" value="${override.sidewalkBulbRadiusPx == null ? '' : fmt(override.sidewalkBulbRadiusPx)}"></div></div>
    <div class="section" style="margin-top:10px"><h3 style="margin:0 0 4px">Generated markings</h3>
      <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:6px"><input id="roadIntersectionCrosswalksAll" type="checkbox" ${override.crosswalksEnabled ? 'checked' : ''}> <span>Crosswalks</span></label>
      <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:6px"><input id="roadIntersectionStopBarsAll" type="checkbox" ${override.stopBarsEnabled ? 'checked' : ''}> <span>Stop bars</span></label>
      <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:6px"><input id="roadIntersectionTactileAll" type="checkbox" ${override.tactilePaversEnabled ? 'checked' : ''}> <span>Tactile pavers</span></label>
      <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:6px"><input id="roadIntersectionCurbGuidesAll" type="checkbox" ${override.curbGuidesEnabled ? 'checked' : ''}> <span>Curb guides</span></label>
    </div>
    <label>Connected arms</label><div class="small muted" style="display:grid;gap:3px">${arms.length ? arms.map(label => `<span>${escapeHtml(label)}</span>`).join('') : '<span>No connected road arms.</span>'}</div>
    <label>Notes</label><textarea id="roadIntersectionNotes" rows="3">${escapeHtml(override.notes || '')}</textarea>
    <div class="buttons" style="margin-top:8px"><button id="resetRoadIntersectionOverride" type="button">Reset Intersection</button></div>
    <div class="small muted" style="margin-top:8px">Intersection nodes are generated from connected road endpoints. Use this panel to keep the generated node but adjust the markings and output behavior for this specific junction.</div>`;
  const updateOverride = patch => { roadSystem.setRoadIntersectionOverride(roadIntersection, patch); state.selectedRoadIntersectionId = intersectionKey; syncAll(); };
  const bind = (id, update) => { const element = getElement(id); if (element) element.oninput = () => updateOverride(update(element)); };
  const type = getElement('roadIntersectionType'); if (type) { type.value = override.intersectionType || 'auto'; type.onchange = () => updateOverride({ intersectionType: type.value }); }
  const merge = getElement('roadIntersectionMerge'); if (merge) { merge.value = override.mergeMode || 'auto'; merge.onchange = () => updateOverride({ mergeMode: merge.value }); }
  bind('roadIntersectionName', element => ({ label: element.value }));
  bind('roadIntersectionEnabled', element => ({ enabled: !!element.checked }));
  bind('roadIntersectionLocked', element => ({ locked: !!element.checked }));
  bind('roadIntersectionCrosswalksAll', element => ({ crosswalksEnabled: !!element.checked }));
  bind('roadIntersectionStopBarsAll', element => ({ stopBarsEnabled: !!element.checked }));
  bind('roadIntersectionTactileAll', element => ({ tactilePaversEnabled: !!element.checked }));
  bind('roadIntersectionCurbGuidesAll', element => ({ curbGuidesEnabled: !!element.checked }));
  bind('roadIntersectionCurbRadius', element => ({ curbRadiusPx: element.value === '' ? null : Math.max(0, parseFloat(element.value) || 0) }));
  bind('roadIntersectionSidewalkRadius', element => ({ sidewalkBulbRadiusPx: element.value === '' ? null : Math.max(0, parseFloat(element.value) || 0) }));
  bind('roadIntersectionNotes', element => ({ notes: element.value }));
  const reset = getElement('resetRoadIntersectionOverride'); if (reset) reset.onclick = () => { roadSystem.clearRoadIntersectionOverride(roadIntersection); state.selectedRoadIntersectionId = intersectionKey; syncAll(); };
}
