export function createRoadDeleteController({
  state,
  syncAll = () => {},
}) {
  function deleteSelectedRoad() {
    if (!state.selectedRoadId) return false;
    const selectedRoadId = state.selectedRoadId;
    state.roads = state.roads.filter(road => road.id !== selectedRoadId);
    state.roadFeatures = state.roadFeatures.filter(feature => feature.roadId !== selectedRoadId);
    state.roadOutlineEditId = null;
    state.selectedRoadId = null;
    syncAll();
    return true;
  }

  function deleteRoadById(roadId) {
    if (!roadId) return false;
    const before = state.roads.length;
    state.roads = state.roads.filter(road => road.id !== roadId);
    state.roadFeatures = state.roadFeatures.filter(feature => feature.roadId !== roadId);
    if (state.selectedRoadId === roadId) state.selectedRoadId = null;
    if (state.roadOutlineEditId === roadId) state.roadOutlineEditId = null;
    if (state.roads.length !== before) {
      syncAll();
      return true;
    }
    return false;
  }

  return {
    deleteRoadById,
    deleteSelectedRoad,
  };
}
