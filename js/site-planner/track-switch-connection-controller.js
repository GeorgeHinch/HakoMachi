export function createTrackSwitchConnectionController({
  state,
  normalizeTrackAccessory,
  normalizeTrack,
  isTrackSwitchAccessoryKind,
  trackSwitchEndpointPoints,
  trackSwitchEndpointDefinitions,
  trackAccessorySnapDistance,
  rotatePoint,
  normalizeAngleDeltaDeg,
  dist,
  moveTrackPointWithAdjacentCurves,
  trackEndpointKey,
  showStatusHint,
}) {
  function allTrackSwitchConnectionPoints() {
    return (state.trackAccessories || [])
      .map(normalizeTrackAccessory)
      .filter(item => isTrackSwitchAccessoryKind(item.kind) && !item.hidden)
      .flatMap(trackSwitchEndpointPoints);
  }

  function nearestTrackSwitchEndpoint(point, excludeTrackAccessoryId = null) {
    let best = null;
    allTrackSwitchConnectionPoints().forEach(endpoint => {
      if (excludeTrackAccessoryId && endpoint.trackAccessoryId === excludeTrackAccessoryId) return;
      const distance = dist(point, endpoint.point);
      if (!best || distance < best.distance) best = { ...endpoint, distance };
    });
    return best;
  }

  function draggedTrackSwitchEndpointName(item, point) {
    if (!item || !point || !isTrackSwitchAccessoryKind(item.kind)) return null;
    let best = null;
    trackSwitchEndpointPoints(item).forEach(endpoint => {
      const distance = dist(point, endpoint.point);
      if (!best || distance < best.distance) best = { endpoint, distance };
    });
    return best && best.distance <= trackAccessorySnapDistance() ? best.endpoint.endpoint : null;
  }

  function trackSwitchEndpointOutwardAngleDeg(endpointName, angleDeg) {
    const base = Number(angleDeg) || 0;
    return endpointName === 'heel' ? base + 180 : base;
  }

  function trackSwitchSnapRotationDeg(item, sourceEndpointName, targetEndpoint) {
    const sourceDef = trackSwitchEndpointDefinitions(item).find(endpoint => endpoint.endpoint === sourceEndpointName);
    if (!sourceDef || !targetEndpoint) return null;
    const sourceOutward = trackSwitchEndpointOutwardAngleDeg(sourceDef.endpoint, sourceDef.angleDeg);
    const targetOutward = trackSwitchEndpointOutwardAngleDeg(targetEndpoint.endpoint, targetEndpoint.angleDeg);
    return targetOutward + 180 - sourceOutward;
  }

  function resolveTrackSwitchConnection(connection) {
    if (!connection || connection.kind !== 'trackSwitchEndpoint' || !connection.trackAccessoryId) return null;
    const item = (state.trackAccessories || [])
      .map(normalizeTrackAccessory)
      .find(accessory => accessory.id === connection.trackAccessoryId);
    if (!item || item.hidden || !isTrackSwitchAccessoryKind(item.kind)) return null;
    return trackSwitchEndpointPoints(item).find(endpoint => endpoint.endpoint === connection.endpoint) || null;
  }

  function syncTracksConnectedToTrackSwitch(item) {
    if (!item || !isTrackSwitchAccessoryKind(item.kind)) return;
    (state.tracks || []).forEach(track => {
      if (!track || track.locked) return;
      normalizeTrack(track);
      ['start', 'end'].forEach(key => {
        const connection = track.endpointConnections?.[key];
        if (!connection || connection.kind !== 'trackSwitchEndpoint' || connection.trackAccessoryId !== item.id) return;
        const endpoint = resolveTrackSwitchConnection(connection);
        const index = key === 'start' ? 0 : Math.max(0, (track.pointsPx || []).length - 1);
        if (endpoint && track.pointsPx?.[index]) moveTrackPointWithAdjacentCurves(track, index, endpoint.point);
      });
    });
  }

  function alignTrackSwitchEndpointToTarget(item, sourceEndpointName, targetEndpoint) {
    const sourceDef = trackSwitchEndpointDefinitions(item).find(endpoint => endpoint.endpoint === sourceEndpointName);
    if (!sourceDef || !targetEndpoint?.point) return false;
    const rotationDeg = trackSwitchSnapRotationDeg(item, sourceEndpointName, targetEndpoint);
    if (!Number.isFinite(rotationDeg)) return false;
    const normalizedRotationDeg = normalizeAngleDeltaDeg(rotationDeg);
    const rotatedLocal = rotatePoint(sourceDef.local, normalizedRotationDeg);
    item.rotationDeg = normalizedRotationDeg;
    item.x = targetEndpoint.point.x - rotatedLocal.x;
    item.y = targetEndpoint.point.y - rotatedLocal.y;
    item.trackId = null;
    item.trackAnchor = {
      kind: 'trackSwitchEndpoint',
      trackAccessoryId: targetEndpoint.trackAccessoryId,
      endpoint: targetEndpoint.endpoint,
      sourceEndpoint: sourceEndpointName,
    };
    normalizeTrackAccessory(item);
    syncTracksConnectedToTrackSwitch(item);
    return true;
  }

  function nearestSwitchEndpointPair(item, pointerPoint = null, preferredSourceEndpoint = null) {
    if (!item || !isTrackSwitchAccessoryKind(item.kind)) return null;
    let sourceEndpoints = trackSwitchEndpointPoints(item);
    if (preferredSourceEndpoint) {
      const preferred = sourceEndpoints.find(endpoint => endpoint.endpoint === preferredSourceEndpoint);
      if (preferred) sourceEndpoints = [preferred];
    }
    const targetEndpoints = allTrackSwitchConnectionPoints().filter(endpoint => endpoint.trackAccessoryId !== item.id);
    const snapDistance = trackAccessorySnapDistance();
    let best = null;
    const currentAnchor = item.trackAnchor?.kind === 'trackSwitchEndpoint' ? item.trackAnchor : null;
    sourceEndpoints.forEach(source => {
      targetEndpoints.forEach(target => {
        const distance = dist(source.point, target.point);
        const pointerDistance = pointerPoint ? dist(pointerPoint, target.point) : 0;
        const snapRotation = trackSwitchSnapRotationDeg(item, source.endpoint, target);
        const currentRotation = Number(item.rotationDeg) || 0;
        const rotationDelta = Math.abs(normalizeAngleDeltaDeg((snapRotation ?? currentRotation) - currentRotation));
        const sameAnchor = currentAnchor
          && currentAnchor.sourceEndpoint === source.endpoint
          && currentAnchor.trackAccessoryId === target.trackAccessoryId
          && currentAnchor.endpoint === target.endpoint;
        const score = distance
          + (pointerPoint ? pointerDistance * .15 : 0)
          + rotationDelta * .18
          - (sameAnchor ? snapDistance * .35 : 0);
        const candidate = { source, target, distance, pointerDistance, rotationDelta, score };
        if (pointerPoint && distance > snapDistance) return;
        if (!best || candidate.score < best.score || (Math.abs(candidate.score - best.score) < .001 && distance < best.distance)) best = candidate;
      });
    });
    return best;
  }

  function snapTrackSwitchToEndpoint(item, pointerPoint = null, preferredSourceEndpoint = null) {
    const pointerSourceEndpoint = draggedTrackSwitchEndpointName(item, pointerPoint);
    const pair = nearestSwitchEndpointPair(item, pointerPoint, preferredSourceEndpoint || pointerSourceEndpoint);
    if (!pair || pair.distance > trackAccessorySnapDistance()) return false;
    if (!alignTrackSwitchEndpointToTarget(item, pair.source.endpoint, pair.target)) return false;
    showStatusHint?.(`Switch ${pair.source.label.toLowerCase()} snapped to ${pair.target.label.toLowerCase()} endpoint and matched its turnout angle.`);
    return true;
  }

  function syncTrackEndpointToSwitchConnection(track, index) {
    const key = trackEndpointKey(track, index);
    const connection = key ? track?.endpointConnections?.[key] : null;
    const endpoint = resolveTrackSwitchConnection(connection);
    if (!endpoint || !track?.pointsPx?.[index]) return false;
    moveTrackPointWithAdjacentCurves(track, index, endpoint.point);
    return true;
  }

  return Object.freeze({
    allTrackSwitchConnectionPoints,
    nearestTrackSwitchEndpoint,
    draggedTrackSwitchEndpointName,
    trackSwitchEndpointOutwardAngleDeg,
    trackSwitchSnapRotationDeg,
    alignTrackSwitchEndpointToTarget,
    nearestSwitchEndpointPair,
    snapTrackSwitchToEndpoint,
    resolveTrackSwitchConnection,
    syncTracksConnectedToTrackSwitch,
    syncTrackEndpointToSwitchConnection,
  });
}
