export function createCatenaryAutoPlacementController({
  state,
  catenarySpacingModelMm,
  catenaryPrototypeSpacingM,
  mmToPx,
  normalizeTrack,
  normalizeTrackAccessory,
  sampledTrackSegments,
  trackPointAtDistance,
  nearestTrackAccessoryAnchor,
  trackAccessorySnapDistance,
  attachTrackAccessoryToAnchor,
  trackAccessoryPreset,
  uid,
  fmt,
  hitTrack,
  clearBuildingSelection,
  syncAll,
  showStatusHint,
}) {
  function catenarySpacingPxForTrack(trackId) {
    if (state.pxPerMm) return Math.max(1, mmToPx(catenarySpacingModelMm));
    const track = (state.tracks || []).map(normalizeTrack).find(item => item.id === trackId);
    const gaugePx = Number(track?.gaugePx);
    const gaugeMm = Number(track?.gaugeMm);
    if (Number.isFinite(gaugePx) && gaugePx > 0 && Number.isFinite(gaugeMm) && gaugeMm > 0) {
      return Math.max(1, catenarySpacingModelMm * gaugePx / gaugeMm);
    }
    return catenarySpacingModelMm;
  }

  function catenaryAtTrackDistance(trackId, pathDistancePx, kind = 'catenarySingleSide') {
    const spacingPx = catenarySpacingPxForTrack(trackId);
    const duplicateTolerance = Math.max(4, Math.min(18, spacingPx * .12));
    return (state.trackAccessories || []).map(normalizeTrackAccessory).some(item => {
      if (item.hidden || item.kind !== kind || item.trackId !== trackId) return false;
      const existing = Number(item.trackAnchor?.pathDistancePx);
      return Number.isFinite(existing) && Math.abs(existing - pathDistancePx) <= duplicateTolerance;
    });
  }

  function createAnchoredCatenaryAt(trackId, pathDistancePx, kind = 'catenarySingleSide') {
    const anchor = trackPointAtDistance(trackId, pathDistancePx);
    if (!anchor) return null;
    const preset = trackAccessoryPreset(kind);
    const accessory = normalizeTrackAccessory({
      id: uid('trackItem'),
      kind,
      name: `${preset.label} ${(state.trackAccessories || []).length + 1}`,
      x: anchor.point.x,
      y: anchor.point.y,
      rotationDeg: anchor.angleDeg,
      trackId,
      autoOrientToTrack: true,
      color: preset.color,
      notes: preset.defaultNotes,
    });
    attachTrackAccessoryToAnchor(accessory, anchor);
    return accessory;
  }

  function applyCatenarySection(startAnchor, endAnchor, kind = 'catenarySingleSide') {
    if (!startAnchor || !endAnchor || startAnchor.trackId !== endAnchor.trackId) return { created: 0, skipped: 0 };
    const trackId = startAnchor.trackId;
    const spacingPx = catenarySpacingPxForTrack(trackId);
    const start = Math.min(startAnchor.pathDistancePx, endAnchor.pathDistancePx);
    const end = Math.max(startAnchor.pathDistancePx, endAnchor.pathDistancePx);
    if (!(end - start > 1)) return { created: 0, skipped: 0 };
    const distances = [start];
    for (let distance = start + spacingPx; distance < end - spacingPx * .25; distance += spacingPx) distances.push(distance);
    distances.push(end);
    state.trackAccessories = state.trackAccessories || [];
    let created = 0;
    let skipped = 0;
    let last = null;
    distances.forEach(distance => {
      if (last !== null && Math.abs(distance - last) < 4) return;
      last = distance;
      if (catenaryAtTrackDistance(trackId, distance, kind)) {
        skipped++;
        return;
      }
      const accessory = createAnchoredCatenaryAt(trackId, distance, kind);
      if (!accessory) return;
      state.trackAccessories.push(accessory);
      state.selectedTrackId = null;
      state.selectedTrackPointIndex = null;
      state.selectedTrackAccessoryId = accessory.id;
      created++;
    });
    return { created, skipped, spacingPx, spacingModelMm: catenarySpacingModelMm };
  }

  function catenarySectionResultText(result) {
    return `Added ${result.created} catenary pole${result.created === 1 ? '' : 's'} at ${fmt(catenarySpacingModelMm)} mm spacing (${catenaryPrototypeSpacingM} m prototype at Japanese N scale).${result.skipped ? ` Skipped ${result.skipped} existing pole${result.skipped === 1 ? '' : 's'}.` : ''}`;
  }

  function applyCatenaryToTrack(trackId, kind = 'catenarySingleSide') {
    const track = (state.tracks || []).map(normalizeTrack).find(item => item.id === trackId);
    if (!track || track.hidden || (track.pointsPx || []).length < 2) return { created: 0, skipped: 0 };
    const sampled = sampledTrackSegments(track, 24);
    if (!(sampled.total > 1)) return { created: 0, skipped: 0 };
    return applyCatenarySection(trackPointAtDistance(track.id, 0), trackPointAtDistance(track.id, sampled.total), kind);
  }

  function handleCatenaryAutoTrackClick(point, pointerType = 'mouse') {
    const trackHit = hitTrack(point, pointerType);
    const anchor = trackHit ? null : nearestTrackAccessoryAnchor(point);
    const trackId = trackHit?.id || (anchor && anchor.distance <= trackAccessorySnapDistance() ? anchor.trackId : null);
    if (!trackId) {
      showStatusHint?.('Click a track spline to auto place catenary along its full length.');
      return false;
    }
    clearBuildingSelection();
    state.selectedTrackId = trackId;
    state.selectedTrackPointIndex = null;
    state.selectedRoadId = null;
    state.selectedRoadFeatureId = null;
    state.selectedBenchworkId = null;
    state.selectedStreetlightId = null;
    state.selectedAnnotationId = null;
    state.selectedFabricId = null;
    state.catenarySectionDraft = null;
    const result = applyCatenaryToTrack(trackId, 'catenarySingleSide');
    syncAll();
    showStatusHint?.(catenarySectionResultText(result));
    return true;
  }

  return Object.freeze({
    catenarySpacingPxForTrack,
    catenaryAtTrackDistance,
    createAnchoredCatenaryAt,
    applyCatenarySection,
    catenarySectionResultText,
    applyCatenaryToTrack,
    handleCatenaryAutoTrackClick,
  });
}
