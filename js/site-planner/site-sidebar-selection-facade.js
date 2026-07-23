export function createSiteSidebarSelectionFacade({
  state,
  clearBuildingSelection,
  clearSelectedSiteObjects,
  currentSelectedBuildingIds,
  activeSidebarDetailKindForState,
  sidebarDetailTitle,
  renderObjectBrowser,
  renderSelectedCore,
  applySidebarDrillIn,
}) {
  function clearPlanObjectSelection() {
    clearBuildingSelection();
    clearSelectedSiteObjects();
    state.selectedRoadId = null;
    state.selectedRoadFeatureId = null;
    state.selectedTrackId = null;
    state.selectedTrackAccessoryId = null;
    state.selectedBenchworkId = null;
    state.selectedStreetlightId = null;
    state.selectedFabricId = null;
    state.selectedAnnotationId = null;
    state.selectedStlObjectId = null;
    state.selectedRoadIntersectionId = null;
    state.selectedRailCrossingId = null;
  }

  function activeSidebarDetailKind() {
    return activeSidebarDetailKindForState(state, currentSelectedBuildingIds());
  }

  function activeSidebarDetailTitle(kind) {
    return sidebarDetailTitle(kind);
  }

  function renderSelected() {
    renderObjectBrowser();
    renderSelectedCore();
    applySidebarDrillIn();
  }

  return Object.freeze({ clearPlanObjectSelection, activeSidebarDetailKind, activeSidebarDetailTitle, renderSelected });
}
