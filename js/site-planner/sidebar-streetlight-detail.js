import { createSidebarInputBinder } from './sidebar-input-binding.js';

export function renderStreetlightDetail({
  streetlight,
  panel,
  getElement,
  fmt,
  escapeAttr,
  escapeHtml,
  syncAll,
  normalizeStreetlight,
  installAdaptiveDegreeStepping,
  duplicateStreetlight,
  deleteSelectedStreetlight,
}) {
  normalizeStreetlight(streetlight);
  panel.innerHTML = `
    <b>${streetlight.mode === 'anchored' ? 'Anchored Streetlight' : 'Streetlight'} selected</b>
    <label>Name</label><input id="slName" value="${escapeAttr(streetlight.name || '')}">
    <div class="row"><div><label>Type</label><select id="slType"><option value="singleArm">Single arm</option><option value="doubleArm">Double arm</option><option value="poleOnly">Pole only</option></select></div><div><label>Color</label><input id="slColor" type="color" value="${streetlight.color || '#c84a3a'}"></div></div>
    <div class="row"><div><label>Height mm</label><input id="slHeight" type="number" step="0.1" value="${fmt(streetlight.heightMm)}"></div><div><label>Arm mm</label><input id="slArm" type="number" step="0.1" value="${fmt(streetlight.armLengthMm)}"></div></div>
    <div class="row"><div><label>Rotation °</label><input id="slRot" type="number" step="1" value="${fmt(streetlight.rotationDeg || 0)}"></div><div><label>Light radius mm</label><input id="slRadius" type="number" step="0.1" value="${fmt(streetlight.lightRadiusMm)}"></div></div>
    ${streetlight.mode === 'anchored' ? `<h3 style="margin-top:10px">Anchor / future export</h3>
    <label>Mount mode</label><select id="slMount"><option value="sidewalkCutHole">Sidewalk cut-through hole</option><option value="roadEdgeBulbMount">Street-edge bulb mount</option><option value="auto">Auto-detect later</option></select>
    <div class="row"><div><label>Cut hole Ø mm</label><input id="slCutDia" type="number" step="0.1" value="${fmt(streetlight.anchor.cutHoleDiameterMm)}"></div><div><label>Bulb Ø mm</label><input id="slBulbDia" type="number" step="0.1" value="${fmt(streetlight.anchor.bulbMountDiameterMm)}"></div></div>
    <div class="row"><div><label>Edge offset mm</label><input id="slEdgeOffset" type="number" step="0.1" value="${fmt(streetlight.anchor.edgeOffsetMm)}"></div><div><label>Sidewalk side</label><select id="slSide"><option value="auto">Auto</option><option value="left">Left</option><option value="right">Right</option></select></div></div>
    <label style="display:flex;align-items:center;gap:6px;margin-top:6px"><input id="slLockEdge" type="checkbox" ${streetlight.anchor.lockToRoadEdge ? 'checked' : ''}> Lock to road edge when road geometry is available</label>
    <div class="small muted" style="margin-top:6px">Sidewalk mode is intended to export as a through-hole in the sidewalk layer. Street-edge mode stores a bulb mount for roads without sidewalks.</div>` : ''}
    <label>Notes</label><textarea id="slNotes" rows="3">${escapeHtml(streetlight.notes || '')}</textarea>
    <div class="buttons" style="margin-top:8px"><button id="dupSl">Duplicate</button><button id="lockSl">${streetlight.locked ? 'Unlock' : 'Lock'}</button><button id="delSl" class="danger">Delete</button></div>`;

  const { bindInput } = createSidebarInputBinder({ getElement, afterInput: syncAll });
  bindInput('slName', value => streetlight.name = value);
  bindInput('slColor', value => streetlight.color = value);
  bindInput('slHeight', value => streetlight.heightMm = parseFloat(value) || 0);
  bindInput('slArm', value => streetlight.armLengthMm = parseFloat(value) || 0);
  bindInput('slRot', value => streetlight.rotationDeg = parseFloat(value) || 0);
  bindInput('slRadius', value => streetlight.lightRadiusMm = parseFloat(value) || 0);
  bindInput('slNotes', value => streetlight.notes = value);
  installAdaptiveDegreeStepping(getElement('slRot'));
  const type = getElement('slType'); if (type) { type.value = streetlight.type; type.onchange = event => { streetlight.type = event.target.value; syncAll(); }; }
  const mount = getElement('slMount'); if (mount) { mount.value = streetlight.anchor.mountMode; mount.onchange = event => { streetlight.anchor.mountMode = event.target.value; syncAll(); }; }
  const side = getElement('slSide'); if (side) { side.value = streetlight.anchor.sidewalkSide; side.onchange = event => { streetlight.anchor.sidewalkSide = event.target.value; syncAll(); }; }
  bindInput('slCutDia', value => streetlight.anchor.cutHoleDiameterMm = parseFloat(value) || 0);
  bindInput('slBulbDia', value => streetlight.anchor.bulbMountDiameterMm = parseFloat(value) || 0);
  bindInput('slEdgeOffset', value => streetlight.anchor.edgeOffsetMm = parseFloat(value) || 0);
  bindInput('slLockEdge', value => streetlight.anchor.lockToRoadEdge = !!value);
  getElement('dupSl').onclick = () => { duplicateStreetlight(streetlight); syncAll(); };
  getElement('lockSl').onclick = () => { streetlight.locked = !streetlight.locked; syncAll(); };
  getElement('delSl').onclick = deleteSelectedStreetlight;
}
