export function renderTrackDetail({
  track,
  panel,
  state,
  getElement,
  fmt,
  escapeAttr,
  mmToPx,
  syncAll,
  normalizeTrack,
  syncTrackMetrics,
  deleteSelectedTrackPoint,
  deleteSelectedTrack,
}) {
  normalizeTrack(track);
  const selectedPointIndex = Number.isInteger(state.selectedTrackPointIndex)
    && state.selectedTrackPointIndex >= 0
    && state.selectedTrackPointIndex < (track.pointsPx || []).length
    ? state.selectedTrackPointIndex
    : null;
  panel.innerHTML = `
    <b>Track selected</b>
    <label>Name</label><input id="trackName" value="${escapeAttr(track.name || 'Track')}">
    <div class="row"><div><label>Gauge mm</label><input id="trackGauge" type="number" step="0.1" value="${fmt(track.gaugeMm || 9)}"></div><div><label>Tie spacing mm</label><input id="trackTieSpacing" type="number" step="0.1" value="${fmt(track.tieSpacingMm || 4)}"></div></div>
    <div class="row"><div><label>Rail color</label><input id="trackColor" type="color" value="${track.color || '#4b4438'}"></div><div><label>Tie color</label><input id="trackTieColor" type="color" value="${track.tieColor || '#8a6f43'}"></div></div>
    <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="trackLocked" type="checkbox" ${track.locked ? 'checked' : ''}> <span>Lock track</span></label>
    ${selectedPointIndex !== null ? `<div class="small" style="margin-top:8px">Point ${selectedPointIndex + 1} of ${(track.pointsPx || []).length} selected. Deleting an end point truncates the track; deleting a middle point splits it.</div>` : ''}
    <div class="buttons" style="margin-top:8px">${selectedPointIndex !== null ? '<button id="deleteTrackPoint" class="danger">Delete Point</button>' : ''}<button id="deleteTrack" class="danger">Delete Track</button></div>
    <div class="small muted" style="margin-top:8px">Approximate planning track: twin rails and ties are drawn as site context for a physical track product. Track paths are not exported as fabricated parts.</div>`;

  const bindTrack = (id, update) => {
    const element = getElement(id);
    if (!element) return;
    element.oninput = () => {
      update(element.type === 'checkbox' ? element.checked : element.value);
      syncTrackMetrics(track);
      syncAll();
    };
  };
  bindTrack('trackName', value => track.name = value);
  bindTrack('trackGauge', value => {
    track.gaugeMm = parseFloat(value) || 9;
    track.gaugePx = state.pxPerMm ? mmToPx(track.gaugeMm) : track.gaugePx;
  });
  bindTrack('trackTieSpacing', value => {
    track.tieSpacingMm = parseFloat(value) || 4;
    track.tieSpacingPx = state.pxPerMm ? mmToPx(track.tieSpacingMm) : track.tieSpacingPx;
  });
  bindTrack('trackColor', value => track.color = value);
  bindTrack('trackTieColor', value => track.tieColor = value);
  bindTrack('trackLocked', value => track.locked = !!value);
  const deletePoint = getElement('deleteTrackPoint'); if (deletePoint) deletePoint.onclick = deleteSelectedTrackPoint;
  getElement('deleteTrack').onclick = deleteSelectedTrack;
}
