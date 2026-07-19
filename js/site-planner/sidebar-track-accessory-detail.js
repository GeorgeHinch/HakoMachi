import { createSidebarInputBinder } from './sidebar-input-binding.js';

export function renderTrackAccessoryDetail({
  trackAccessory,
  panel,
  getElement,
  fmt,
  escapeAttr,
  escapeHtml,
  syncAll,
  normalizeTrackAccessory,
  trackAccessoryLabel,
  trackAccessoryPreset,
  isCatenaryAccessoryKind,
  isTrackSwitchAccessoryKind,
  isTrackBufferAccessoryKind,
  trackBufferHasCatenaryTerminal,
  syncTracksConnectedToTrackSwitch,
  nearestTrackAccessoryAnchor,
  nearestTrackEndpointAnchor,
  attachTrackAccessoryToAnchor,
  installAdaptiveDegreeStepping,
  deleteSelectedTrackAccessory,
}) {
  normalizeTrackAccessory(trackAccessory);
  panel.innerHTML = `
    <b>Track item selected</b>
    <label>Name</label><input id="trackItemName" value="${escapeAttr(trackAccessory.name || trackAccessoryLabel(trackAccessory.kind))}">
    <label>Type</label><select id="trackItemKind"><option value="sensor">Under-track Sensor</option><option value="signal">Signal Location</option><option value="crossingArm">Crossing Arm</option><option value="intrusionDetector">Intrusion Detector</option><option value="occupancyLight">Blinking Occupancy Lights</option><option value="trackSwitchLeft">Left-hand Track Switch</option><option value="trackSwitchRight">Right-hand Track Switch</option><option value="trackSwitchTomix1279Left">Tomix 1279 Left Curved Switch</option><option value="trackSwitchTomix1278Right">Tomix 1278 Right Curved Switch</option><option value="trackBufferTomix1428">Tomix 1428 Buffer Stop</option><option value="trackBufferTomix1428Catenary">Tomix 1428 Buffer + Catenary Terminal</option><option value="catenarySingleSide">Single-side Catenary Pole</option><option value="catenaryDoublePortal">Double-track Catenary Portal</option></select>
    <div class="row"><div><label>X px</label><input id="trackItemX" type="number" step="1" value="${fmt(trackAccessory.x || 0)}"></div><div><label>Y px</label><input id="trackItemY" type="number" step="1" value="${fmt(trackAccessory.y || 0)}"></div></div>
    <div class="row"><div><label>Rotation °</label><input id="trackItemRot" type="number" step="1" value="${fmt(trackAccessory.rotationDeg || 0)}"></div><div><label>Color</label><input id="trackItemColor" type="color" value="${trackAccessory.color || trackAccessoryPreset(trackAccessory.kind).color}"></div></div>
    ${isCatenaryAccessoryKind(trackAccessory.kind) ? `<label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="trackItemAutoOrient" type="checkbox" ${trackAccessory.autoOrientToTrack !== false && trackAccessory.trackId ? 'checked' : ''}> <span>Attach and auto-orient to track</span></label>` : ''}
    ${isTrackBufferAccessoryKind(trackAccessory.kind) ? `<label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="trackItemCatenaryTerminal" type="checkbox" ${trackBufferHasCatenaryTerminal(trackAccessory) ? 'checked' : ''}> <span>Show catenary end terminal</span></label>` : ''}
    <label>Notes</label><textarea id="trackItemNotes" rows="3">${escapeHtml(trackAccessory.notes || '')}</textarea>
    <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="trackItemLocked" type="checkbox" ${trackAccessory.locked ? 'checked' : ''}> <span>Lock item</span></label>
    <div class="buttons" style="margin-top:8px"><button id="trackItemSnap">Snap to Nearest Track</button><button id="deleteTrackItem" class="danger">Delete Item</button></div>
    <div class="small muted" style="margin-top:8px">Track items mark placement for sensors, signals, crossing arms, catenary poles, switches, buffer stops, and level crossing detection around physical track. Tomix-style switches expose heel, straight, and diverging endpoints for flex-track snapping. Buffer stops prefer track endpoints and can show a catenary terminal. They are saved with the site plan but are not exported as track parts.</div>`;
  const kind = getElement('trackItemKind'); if (kind) kind.onchange = () => { trackAccessory.kind = kind.value; const preset = trackAccessoryPreset(trackAccessory.kind); trackAccessory.color = trackAccessory.color || preset.color; trackAccessory.name = trackAccessory.name || preset.label; if (trackAccessory.kind === 'trackBufferTomix1428Catenary') trackAccessory.catenaryEndTerminal = true; normalizeTrackAccessory(trackAccessory); if (isTrackSwitchAccessoryKind(trackAccessory.kind)) syncTracksConnectedToTrackSwitch(trackAccessory); syncAll(); };
  if (kind) kind.value = trackAccessory.kind;
  const { bindInput } = createSidebarInputBinder({ getElement, afterInput: () => { normalizeTrackAccessory(trackAccessory); syncAll(); } });
  bindInput('trackItemName', value => trackAccessory.name = value);
  bindInput('trackItemX', value => { trackAccessory.x = parseFloat(value) || 0; trackAccessory.trackAnchor = null; if (isTrackSwitchAccessoryKind(trackAccessory.kind)) syncTracksConnectedToTrackSwitch(trackAccessory); });
  bindInput('trackItemY', value => { trackAccessory.y = parseFloat(value) || 0; trackAccessory.trackAnchor = null; if (isTrackSwitchAccessoryKind(trackAccessory.kind)) syncTracksConnectedToTrackSwitch(trackAccessory); });
  bindInput('trackItemRot', value => { trackAccessory.rotationDeg = parseFloat(value) || 0; trackAccessory.autoOrientToTrack = false; if (isTrackSwitchAccessoryKind(trackAccessory.kind)) syncTracksConnectedToTrackSwitch(trackAccessory); });
  bindInput('trackItemColor', value => trackAccessory.color = value);
  bindInput('trackItemNotes', value => trackAccessory.notes = value);
  bindInput('trackItemLocked', value => trackAccessory.locked = !!value);
  bindInput('trackItemAutoOrient', value => { trackAccessory.autoOrientToTrack = !!value; if (trackAccessory.autoOrientToTrack) { const anchor = nearestTrackAccessoryAnchor({ x: trackAccessory.x, y: trackAccessory.y }, { trackId: trackAccessory.trackId }); if (anchor) attachTrackAccessoryToAnchor(trackAccessory, anchor); else trackAccessory.autoOrientToTrack = false; } });
  bindInput('trackItemCatenaryTerminal', value => { trackAccessory.catenaryEndTerminal = !!value; if (trackAccessory.kind === 'trackBufferTomix1428Catenary' && !value) trackAccessory.kind = 'trackBufferTomix1428'; });
  installAdaptiveDegreeStepping(getElement('trackItemRot'));
  const snap = getElement('trackItemSnap'); if (snap) snap.onclick = () => { const anchor = isTrackBufferAccessoryKind(trackAccessory.kind) ? nearestTrackEndpointAnchor({ x: trackAccessory.x, y: trackAccessory.y }) : nearestTrackAccessoryAnchor({ x: trackAccessory.x, y: trackAccessory.y }); if (anchor) { if (isCatenaryAccessoryKind(trackAccessory.kind)) attachTrackAccessoryToAnchor(trackAccessory, anchor); else { trackAccessory.x = anchor.point.x; trackAccessory.y = anchor.point.y; trackAccessory.rotationDeg = anchor.angleDeg; trackAccessory.trackId = anchor.trackId; if (isTrackBufferAccessoryKind(trackAccessory.kind)) trackAccessory.trackAnchor = { trackId: anchor.trackId, endpointKey: anchor.endpointKey, pointIndex: anchor.pointIndex, pathDistancePx: null, offsetPx: 0 }; } syncAll(); } };
  getElement('deleteTrackItem').onclick = deleteSelectedTrackAccessory;
}
