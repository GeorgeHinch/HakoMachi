export function createSitePointerInteractionController({
  state,
  beginLongPress,
  hitTrackAccessoryRotationHandle,
  selectTrackAccessory,
  hitTrackAccessory,
  handleSiteObjectPointerHit,
  hitRoadFeature,
  hitGeneratedRailCrossing,
  selectRailCrossing,
  hitStreetlight,
  selectedRoad,
  hitRoadPoint,
  hitRoadOutlineSegment,
  hitRoadCenterlineSegment,
  hitGeneratedRoadIntersection,
  selectRoadIntersection,
  hitRoad,
  hitTrack,
  selectedTrack,
  hitTrackPoint,
  hitTrackSegment,
  hitStlObject,
  selectedBenchwork,
  hitBenchworkSegment,
  hitBenchwork,
  hitAnnotation,
  renderList,
  renderSelected,
  updateHandoff,
  draw,
  selected,
  handleAt,
  buildingCenter,
  hitTest,
  hitFabricRegion,
}) {
  function hasActivePointDraft() {
    return (state.roadDraft && state.roadDraft.length)
      || (state.trackDraft && state.trackDraft.length)
      || (state.benchworkDraft && state.benchworkDraft.length)
      || (state.polygonDraft && state.polygonDraft.length);
  }

  function startExistingObjectInteraction(e, p) {
    if (hasActivePointDraft()) return false;
    beginLongPress(e, p);
    if (state.tool !== 'track') {
      const trackAccessoryRotateHit = hitTrackAccessoryRotationHandle(p, e.pointerType);
      if (trackAccessoryRotateHit) {
        selectTrackAccessory(trackAccessoryRotateHit);
        state.drag = {
          type: 'rotateTrackAccessory',
          pointerId: e.pointerId,
          center: { x: trackAccessoryRotateHit.x, y: trackAccessoryRotateHit.y },
          startAngle: Math.atan2(p.y - trackAccessoryRotateHit.y, p.x - trackAccessoryRotateHit.x),
          origRotation: Number(trackAccessoryRotateHit.rotationDeg) || 0,
          orig: structuredClone(trackAccessoryRotateHit),
        };
        return true;
      }
      const trackAccessoryHit = hitTrackAccessory(p, e.pointerType);
      if (trackAccessoryHit) {
        return handleSiteObjectPointerHit('trackAccessory', trackAccessoryHit, e, p);
      }
    }
    const roadFeatureHit = hitRoadFeature(p, e.pointerType);
    if (roadFeatureHit) {
      return handleSiteObjectPointerHit('roadFeature', roadFeatureHit, e, p);
    }
    const railCrossingHit = hitGeneratedRailCrossing(p, e.pointerType);
    if (railCrossingHit) return selectRailCrossing(railCrossingHit);
    const lightHit = hitStreetlight(p, e.pointerType);
    if (lightHit) {
      return handleSiteObjectPointerHit('streetlight', lightHit, e, p);
    }
    const srForRoadEdit = state.selectedRoadId ? selectedRoad() : null;
    const roadOutlineEditing = srForRoadEdit && srForRoadEdit.mode === 'outline' && state.roadOutlineEditId === srForRoadEdit.id;
    const roadPointHit = srForRoadEdit && (srForRoadEdit.mode !== 'outline' || roadOutlineEditing) ? hitRoadPoint(p, srForRoadEdit, e.pointerType) : null;
    if (roadPointHit) {
      const r = srForRoadEdit;
      if (r && !r.locked) state.drag = { type: 'roadPoint', pointerId: e.pointerId, start: p, orig: structuredClone(r), pointIndex: roadPointHit.index };
      return true;
    }
    const roadCurveHit = srForRoadEdit ? (srForRoadEdit.mode === 'outline' ? (roadOutlineEditing ? hitRoadOutlineSegment(p, srForRoadEdit, e.pointerType) : null) : hitRoadCenterlineSegment(p, srForRoadEdit, e.pointerType)) : null;
    if (roadCurveHit) {
      const r = srForRoadEdit;
      if (r && !r.locked) state.drag = { type: 'roadCurve', pointerId: e.pointerId, start: p, orig: structuredClone(r), segmentIndex: roadCurveHit.index };
      return true;
    }
    const roadIntersectionHit = hitGeneratedRoadIntersection(p, e.pointerType);
    if (roadIntersectionHit) return selectRoadIntersection(roadIntersectionHit);
    const roadHit = hitRoad(p, e.pointerType);
    if (roadHit) {
      if (roadHit.mode !== 'outline') state.roadOutlineEditId = null;
      return handleSiteObjectPointerHit('road', roadHit, e, p);
    }
    const trackHit = hitTrack(p, e.pointerType);
    const selectedTrackForEdit = state.selectedTrackId ? selectedTrack() : null;
    if (state.tool === 'track' && !selectedTrackForEdit) return false;
    const trackPointHit = selectedTrackForEdit && !trackHit?.locked ? hitTrackPoint(p, selectedTrackForEdit, e.pointerType) : null;
    if (trackPointHit) {
      const t = selectedTrackForEdit;
      if (t && !t.locked) state.drag = { type: 'trackPoint', pointerId: e.pointerId, start: p, orig: structuredClone(t), pointIndex: trackPointHit.index };
      return true;
    }
    const trackCurveHit = selectedTrackForEdit ? hitTrackSegment(p, selectedTrackForEdit, e.pointerType) : null;
    if (trackCurveHit) {
      const t = selectedTrackForEdit;
      if (t && !t.locked) state.drag = { type: 'trackCurve', pointerId: e.pointerId, start: p, orig: structuredClone(t), segmentIndex: trackCurveHit.index };
      return true;
    }
    if (trackHit) {
      return handleSiteObjectPointerHit('track', trackHit, e, p);
    }
    const stlHit = hitStlObject(p, e.pointerType);
    if (stlHit) {
      return handleSiteObjectPointerHit('stlObject', stlHit, e, p);
    }
    const benchCurveHit = state.selectedBenchworkId ? hitBenchworkSegment(p, selectedBenchwork(), e.pointerType) : null;
    if (benchCurveHit) {
      const bw = selectedBenchwork();
      if (bw && !bw.locked) state.drag = { type: 'benchworkCurve', pointerId: e.pointerId, start: p, orig: structuredClone(bw), segmentIndex: benchCurveHit.index };
      return true;
    }
    const benchHit = hitBenchwork(p, e.pointerType);
    if (benchHit) {
      return handleSiteObjectPointerHit('benchwork', benchHit, e, p);
    }
    const note = hitAnnotation(p, e.pointerType);
    if (note) {
      state.selectedAnnotationId = note.id;
      state.selectedId = null;
      state.selectedStlObjectId = null;
      state.selectedStreetlightId = null;
      state.selectedRoadId = null;
      state.selectedBenchworkId = null;
      state.selectedFabricId = null;
      renderList();
      renderSelected();
      updateHandoff();
      draw();
      return true;
    }
    const b = selected();
    const h = handleAt(p, b, e.pointerType);
    if (h) {
      const drag = { type: h.type, pointerId: e.pointerId, index: h.index, start: p, orig: structuredClone(b) };
      if (h.type === 'rotate') {
        drag.center = buildingCenter(b);
        drag.startAngle = Math.atan2(p.y - drag.center.y, p.x - drag.center.x);
        drag.origRotation = Number(b.rotationDeg) || 0;
      }
      state.drag = drag;
      return true;
    }
    const hit = hitTest(p, e.pointerType);
    if (hit) {
      return handleSiteObjectPointerHit('building', hit, e, p);
    }
    const fabricHit = hitFabricRegion(p);
    if (fabricHit) return handleSiteObjectPointerHit('fabric', fabricHit, e, p);
    return false;
  }

  return {
    startExistingObjectInteraction,
  };
}
