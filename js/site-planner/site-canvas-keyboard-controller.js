export function createSiteCanvasKeyboardController({
  state,
  windowRef,
  hideContextMenu,
  cancelGithubBuildingPlacement,
  renderSelected,
  draw,
  deleteSelectedAnnotation,
  deleteSelectedRoadFeature,
  deleteSelectedStreetlight,
  deleteSelectedRoad,
  currentSelectedBuildingIds,
  deleteSelectedTrackAccessory,
  deleteSelectedTrackPoint,
  deleteSelectedTrack,
  deleteSelectedStlObject,
  deleteSelectedBenchwork,
  deleteSelectedFabricRegion,
  clearBuildingSelection,
  syncAll,
  undo,
  redo,
  copySelectedFootprint,
  copySelectedSiteObject,
  pasteSiteObjectFromClipboard,
  pasteFootprintFromClipboard,
  finishPolygon,
  finishBenchworkOutline,
  finishRoadOutline,
  finishRoadCenterline,
  finishTrack,
}) {
  function deleteCurrentSelection() {
    if (state.selectedAnnotationId) { deleteSelectedAnnotation(); return true; }
    if (state.selectedRoadFeatureId) { deleteSelectedRoadFeature(); return true; }
    if (state.selectedStreetlightId) { deleteSelectedStreetlight(); return true; }
    if (state.selectedRoadId) { deleteSelectedRoad(); return true; }
    if (state.selectedTrackAccessoryId && !state.selectedId && !currentSelectedBuildingIds().length && !state.selectedRoadId && !state.selectedTrackId && !state.selectedRoadFeatureId && !state.selectedStreetlightId && !state.selectedBenchworkId && !state.selectedFabricId && !state.selectedStlObjectId && !state.selectedAnnotationId) { deleteSelectedTrackAccessory(); return true; }
    if (state.selectedTrackId && Number.isInteger(state.selectedTrackPointIndex)) { deleteSelectedTrackPoint(); return true; }
    if (state.selectedTrackId) { deleteSelectedTrack(); return true; }
    if (state.selectedStlObjectId) { deleteSelectedStlObject(); return true; }
    if (state.selectedBenchworkId) { deleteSelectedBenchwork(); return true; }
    if (state.selectedFabricId) { deleteSelectedFabricRegion(); return true; }
    const ids = currentSelectedBuildingIds();
    if (ids.length) {
      state.buildings = state.buildings.filter(building => !ids.includes(building.id));
      clearBuildingSelection();
      syncAll();
      return true;
    }
    return false;
  }

  function bindKeyboardShortcuts() {
    windowRef.addEventListener('keydown', event => {
      if (event.key === 'Shift') state.shiftKeyDown = true;
      const target = event.target;
      if (target && target.matches && target.matches('input,textarea,select,[contenteditable="true"]')) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === 'c') {
        if (currentSelectedBuildingIds().length) {
          event.preventDefault();
          if (copySelectedFootprint()) state.objectClipboardType = 'footprint';
          renderSelected();
        } else if (copySelectedSiteObject()) {
          event.preventDefault();
          renderSelected();
        }
        return;
      }
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === 'v') {
        if (state.objectClipboardType === 'siteObject' && state.siteObjectClipboard) {
          event.preventDefault();
          pasteSiteObjectFromClipboard();
        } else if (state.footprintClipboard) {
          event.preventDefault();
          pasteFootprintFromClipboard();
        }
        return;
      }
      if (event.key === 'Enter' && state.tool === 'polygon') finishPolygon();
      if (event.key === 'Enter' && state.tool === 'benchwork') finishBenchworkOutline();
      if (event.key === 'Enter' && state.tool === 'road' && state.roadMode === 'outline') finishRoadOutline();
      if (event.key === 'Enter' && state.tool === 'road' && state.roadMode === 'centerline') finishRoadCenterline();
      if (event.key === 'Enter' && state.tool === 'track') finishTrack();
      if (event.key === 'Backspace' && state.tool === 'polygon' && state.polygonDraft.length) { state.polygonDraft.pop(); draw(); return; }
      if (event.key === 'Backspace' && state.tool === 'benchwork' && state.benchworkDraft.length) { state.benchworkDraft.pop(); draw(); return; }
      if (event.key === 'Backspace' && state.tool === 'track' && state.trackDraft.length) {
        state.trackDraft.pop();
        state.trackDraftConnections?.pop?.();
        if (!state.trackDraft.length) state.trackDraftExtension = null;
        draw();
        return;
      }
      if (event.key === 'Escape') {
        hideContextMenu();
        if (cancelGithubBuildingPlacement()) { event.preventDefault(); return; }
        state.hoverPreview = null;
        state.trackDraft = [];
        state.trackDraftConnections = [];
        state.trackDraftExtension = null;
        state.selectedAnnotationId = null;
        state.selectedFabricId = null;
        state.selectedStlObjectId = null;
        if (state.roadOutlineEditId) state.roadOutlineEditId = null;
        renderSelected();
        draw();
        return;
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && deleteCurrentSelection()) event.preventDefault();
    });
    windowRef.addEventListener('keyup', event => {
      if (event.key === 'Shift' || !event.shiftKey) state.shiftKeyDown = false;
    });
    windowRef.addEventListener('blur', () => { state.shiftKeyDown = false; });
  }

  return Object.freeze({ deleteCurrentSelection, bindKeyboardShortcuts });
}
