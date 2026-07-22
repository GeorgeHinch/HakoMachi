export function createTrackAccessoryInteractionController({
  state,
  normalizeTrackAccessory,
  isTrackSwitchAccessoryKind,
  isTrackBufferAccessoryKind,
  isCatenaryAccessoryKind,
  trackAccessoryPreset,
  trackAccessorySnapDistance,
  nearestTrackSwitchEndpoint,
  nearestTrackEndpointAnchor,
  nearestTrackAccessoryAnchor,
  alignTrackSwitchEndpointToTarget,
  attachTrackAccessoryToAnchor,
  refreshTrackAccessoryAnchor,
  trackSwitchGeometryPx,
  trackBufferGeometryPx,
  trackSwitchDirection,
  selectedTrackAccessory,
  setSingleSiteObjectSelection,
  syncAll,
  refreshUi,
  showStatusHint,
  uid,
  dist,
  rad,
}) {
  function selectTrackAccessory(item, options = {}) {
    if (!item) return false;
    setSingleSiteObjectSelection('trackAccessory', item.id);
    if (!options.skipSync) refreshUi();
    return true;
  }

  function placeTrackAccessory(point, kind) {
    const preset = trackAccessoryPreset(kind);
    const maxSnap = trackAccessorySnapDistance();
    const switchEndpointAnchor = isTrackSwitchAccessoryKind(kind) ? nearestTrackSwitchEndpoint(point) : null;
    const switchEndpointSnapped = !!(switchEndpointAnchor && switchEndpointAnchor.distance <= maxSnap);
    const anchor = switchEndpointSnapped
      ? switchEndpointAnchor
      : (isTrackBufferAccessoryKind(kind) ? nearestTrackEndpointAnchor(point) : nearestTrackAccessoryAnchor(point));
    const snapped = anchor && anchor.distance <= maxSnap;
    const accessoryPoint = snapped ? anchor.point : point;
    const accessory = normalizeTrackAccessory({
      id: uid('trackItem'),
      kind,
      name: `${preset.label} ${(state.trackAccessories || []).length + 1}`,
      x: accessoryPoint.x,
      y: accessoryPoint.y,
      rotationDeg: snapped ? anchor.angleDeg : 0,
      trackId: snapped ? anchor.trackId : null,
      autoOrientToTrack: snapped && isCatenaryAccessoryKind(kind),
      color: preset.color,
      catenaryEndTerminal: kind === 'trackBufferTomix1428Catenary',
      notes: preset.defaultNotes,
    });
    if (switchEndpointSnapped) alignTrackSwitchEndpointToTarget(accessory, 'heel', switchEndpointAnchor);
    if (snapped && isCatenaryAccessoryKind(kind)) attachTrackAccessoryToAnchor(accessory, anchor);
    if (snapped && isTrackBufferAccessoryKind(kind)) {
      accessory.trackAnchor = {
        trackId: anchor.trackId,
        endpointKey: anchor.endpointKey,
        pointIndex: anchor.pointIndex,
        pathDistancePx: null,
        offsetPx: 0,
      };
    }
    state.trackAccessories = state.trackAccessories || [];
    state.trackAccessories.push(accessory);
    selectTrackAccessory(accessory, { skipSync: true });
    syncAll();
    showStatusHint?.(switchEndpointSnapped
      ? `${preset.label} heel snapped to switch endpoint and matched its turnout angle.`
      : (snapped ? `${preset.label} attached to nearest track endpoint.` : `${preset.label} placed.`));
    return accessory;
  }

  function hitTrackAccessory(point, pointerType = 'mouse') {
    const tolerance = (pointerType === 'touch' ? 18 : 13) / state.view.scale;
    let best = null;
    (state.trackAccessories || []).map(normalizeTrackAccessory).forEach(item => {
      refreshTrackAccessoryAnchor(item);
      if (item.hidden) return;
      let distance = dist(point, { x: item.x, y: item.y });
      let itemTolerance = tolerance;
      if (isTrackSwitchAccessoryKind(item.kind)) {
        const geometry = trackSwitchGeometryPx(item);
        const angle = rad(-(Number(item.rotationDeg) || 0));
        const dx = point.x - item.x, dy = point.y - item.y;
        const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
        const localY = dx * Math.sin(angle) + dy * Math.cos(angle);
        const maxOffset = Math.max(Math.abs(geometry.offset || 0), Math.abs(geometry.mainOffset || 0));
        const verticalMin = -geometry.roadbedWidth / 2 - tolerance;
        const verticalMax = maxOffset + geometry.roadbedWidth / 2 + tolerance;
        const direction = trackSwitchDirection(item.kind);
        const yMin = direction < 0 ? -verticalMax : verticalMin;
        const yMax = direction < 0 ? -verticalMin : verticalMax;
        if (localX >= -geometry.halfLength - tolerance && localX <= geometry.halfLength + tolerance && localY >= yMin && localY <= yMax) distance = 0;
        itemTolerance = Math.max(tolerance, Math.min(36 / state.view.scale, geometry.length / 4));
      } else if (isTrackBufferAccessoryKind(item.kind)) {
        const geometry = trackBufferGeometryPx(item);
        const angle = rad(-(Number(item.rotationDeg) || 0));
        const dx = point.x - item.x, dy = point.y - item.y;
        const localX = dx * Math.cos(angle) - dy * Math.sin(angle);
        const localY = dx * Math.sin(angle) + dy * Math.cos(angle);
        if (localX >= -geometry.length * .35 - tolerance && localX <= geometry.length + tolerance && Math.abs(localY) <= geometry.width * .55 + tolerance) distance = 0;
        itemTolerance = Math.max(tolerance, Math.min(28 / state.view.scale, geometry.length));
      }
      if (distance <= itemTolerance && (!best || distance < best.distance)) best = { ...item, distance };
    });
    return best;
  }

  function trackAccessoryRotationHandleLocal(item) {
    const scale = 1 / state.view.scale;
    if (isTrackSwitchAccessoryKind(item?.kind)) {
      const geometry = trackSwitchGeometryPx(item);
      const direction = trackSwitchDirection(item.kind);
      const maxOffset = Math.max(Math.abs(geometry.offset || 0), Math.abs(geometry.mainOffset || 0));
      const minY = direction < 0 ? -maxOffset - geometry.roadbedWidth / 2 : -geometry.roadbedWidth / 2;
      return { x: 0, y: minY - 28 * scale };
    }
    return { x: 0, y: -34 * scale };
  }

  function trackAccessoryRotationHandlePoint(item) {
    if (!item) return null;
    const angle = rad(Number(item.rotationDeg) || 0);
    const local = trackAccessoryRotationHandleLocal(item);
    return {
      x: item.x + local.x * Math.cos(angle) - local.y * Math.sin(angle),
      y: item.y + local.x * Math.sin(angle) + local.y * Math.cos(angle),
    };
  }

  function hitTrackAccessoryRotationHandle(point, pointerType = 'mouse') {
    const item = selectedTrackAccessory();
    if (!item || item.hidden || item.locked) return null;
    const handle = trackAccessoryRotationHandlePoint(item);
    if (!handle) return null;
    const tolerance = (pointerType === 'touch' ? 20 : 12) / state.view.scale;
    return dist(point, handle) <= tolerance ? item : null;
  }

  function trackAccessoryLabelPoint(item) {
    const scale = 1 / state.view.scale;
    if (!isTrackSwitchAccessoryKind(item?.kind)) return { x: item.x + 12 * scale, y: item.y - 12 * scale };
    const geometry = trackSwitchGeometryPx(item);
    const direction = trackSwitchDirection(item.kind);
    const maxOffset = Math.max(Math.abs(geometry.offset || 0), Math.abs(geometry.mainOffset || 0));
    const maxY = direction < 0 ? geometry.roadbedWidth / 2 : maxOffset + geometry.roadbedWidth / 2;
    const local = { x: -geometry.halfLength, y: maxY + 24 * scale };
    const angle = rad(Number(item.rotationDeg) || 0);
    return {
      x: item.x + local.x * Math.cos(angle) - local.y * Math.sin(angle),
      y: item.y + local.x * Math.sin(angle) + local.y * Math.cos(angle),
    };
  }

  function deleteSelectedTrackAccessory() {
    if (!state.selectedTrackAccessoryId) return false;
    const removedId = state.selectedTrackAccessoryId;
    state.trackAccessories = (state.trackAccessories || []).filter(item => item.id !== removedId);
    (state.tracks || []).forEach(track => {
      if (!track?.endpointConnections) return;
      ['start', 'end'].forEach(key => {
        if (track.endpointConnections[key]?.trackAccessoryId === removedId) delete track.endpointConnections[key];
      });
    });
    state.selectedTrackAccessoryId = null;
    syncAll();
    return true;
  }

  return Object.freeze({
    selectTrackAccessory,
    placeTrackAccessory,
    hitTrackAccessory,
    trackAccessoryRotationHandleLocal,
    trackAccessoryRotationHandlePoint,
    hitTrackAccessoryRotationHandle,
    trackAccessoryLabelPoint,
    deleteSelectedTrackAccessory,
  });
}
