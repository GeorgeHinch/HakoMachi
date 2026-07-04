export function createRoadDraftController({
  state,
  createRoadCenterlineFromPoints,
  createRoadOutlineFromPoints,
  clearBuildingSelection = () => {},
  syncAll = () => {},
}) {
  function selectCreatedRoad(road) {
    state.selectedRoadId = road.id;
    clearBuildingSelection();
    state.selectedStreetlightId = null;
    state.selectedBenchworkId = null;
    state.selectedAnnotationId = null;
    state.roadDraft = [];
    syncAll();
    return road;
  }

  function finishRoadCenterline() {
    if (!state.roadDraft || state.roadDraft.length < 2) return null;
    const road = createRoadCenterlineFromPoints(state.roadDraft);
    state.roads.push(road);
    return selectCreatedRoad(road);
  }

  function finishRoadOutline() {
    if (!state.roadDraft || state.roadDraft.length < 3) return null;
    const road = createRoadOutlineFromPoints(state.roadDraft);
    state.roads.push(road);
    return selectCreatedRoad(road);
  }

  function clearRoadDraft() {
    state.roadDraft = [];
  }

  return {
    clearRoadDraft,
    finishRoadCenterline,
    finishRoadOutline,
  };
}
