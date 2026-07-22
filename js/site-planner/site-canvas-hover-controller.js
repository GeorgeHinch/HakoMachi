export function createSiteCanvasHoverController({
  state,
  draw,
  hitStreetlight,
  selectedRoad,
  hitRoadOutlineSegment,
  hitRoadCenterlineSegment,
  hitBenchworkSegment,
  selectedBenchwork,
  hitBenchwork,
  hitRoad,
  hitTrackAccessory,
  hitTrack,
  selectedTrack,
  hitTrackSegment,
  hitStlObject,
  hitTest,
  selected,
  handleAt,
}) {
  function handleIdlePointerMove(event, point) {
    if (state.githubBuildingPlacement) {
      state.githubBuildingPlacement.previewPoint = point;
      state.hoverPreview = null;
      draw();
      return true;
    }
    const hoverStreetlight = hitStreetlight(point, event.pointerType);
    state.hoverStreetlightId = hoverStreetlight ? hoverStreetlight.id : null;
    const hoverSelectedRoad = state.selectedRoadId && !hoverStreetlight ? selectedRoad() : null;
    const hoverRoadCurve = hoverSelectedRoad
      ? (hoverSelectedRoad.mode === 'outline'
        ? (state.roadOutlineEditId === hoverSelectedRoad.id ? hitRoadOutlineSegment(point, hoverSelectedRoad, event.pointerType) : null)
        : hitRoadCenterlineSegment(point, hoverSelectedRoad, event.pointerType))
      : null;
    state.hoverRoadSegment = hoverRoadCurve ? { roadId: state.selectedRoadId, index: hoverRoadCurve.index } : null;
    const hoverBenchCurve = state.selectedBenchworkId && !hoverStreetlight && !hoverRoadCurve ? hitBenchworkSegment(point, selectedBenchwork(), event.pointerType) : null;
    state.hoverBenchworkSegment = hoverBenchCurve ? { benchworkId: state.selectedBenchworkId, index: hoverBenchCurve.index } : null;
    const hoverBenchwork = hoverStreetlight || hoverRoadCurve || hoverBenchCurve ? (hoverBenchCurve ? selectedBenchwork() : null) : hitBenchwork(point);
    state.hoverBenchworkId = hoverBenchwork ? hoverBenchwork.id : null;
    const hoverRoad = hoverStreetlight || hoverBenchwork ? null : hitRoad(point);
    state.hoverRoadId = hoverRoad ? hoverRoad.id : (hoverRoadCurve ? state.selectedRoadId : null);
    const hoverAccessory = hoverStreetlight || hoverBenchwork || hoverRoad ? null : hitTrackAccessory(point, event.pointerType);
    state.hoverTrackAccessoryId = hoverAccessory ? hoverAccessory.id : null;
    const hoverTrack = hoverStreetlight || hoverBenchwork || hoverRoad || hoverAccessory ? null : hitTrack(point, event.pointerType);
    state.hoverTrackId = hoverTrack ? hoverTrack.id : null;
    const hoverSelectedTrack = state.selectedTrackId && !hoverStreetlight && !hoverBenchwork && !hoverRoad ? selectedTrack() : null;
    const hoverTrackCurve = hoverSelectedTrack ? hitTrackSegment(point, hoverSelectedTrack, event.pointerType) : null;
    state.hoverTrackSegment = hoverTrackCurve ? { trackId: state.selectedTrackId, index: hoverTrackCurve.index } : null;
    const hoverStlObject = hoverStreetlight || hoverBenchwork || hoverRoad || hoverAccessory || hoverTrack ? null : hitStlObject(point, event.pointerType);
    state.hoverStlObjectId = hoverStlObject ? hoverStlObject.id : null;
    const hoverBuilding = hoverStreetlight || hoverBenchwork || hoverRoad || hoverAccessory || hoverTrack || hoverStlObject ? null : hitTest(point);
    state.hoverBuildingId = hoverBuilding ? hoverBuilding.id : null;
    if (event.pointerType === 'pen' && event.buttons === 0) {
      const building = selected() || hoverBuilding;
      const handle = building ? handleAt(point, building, event.pointerType) : null;
      state.hoverPreview = { point, kind: handle ? 'handle' : 'cursor', label: handle ? handle.type.replace(/([A-Z])/g, ' $1') : 'Pencil' };
    } else if (event.pointerType !== 'pen') state.hoverPreview = null;
    draw();
    return true;
  }

  return Object.freeze({ handleIdlePointerMove });
}
