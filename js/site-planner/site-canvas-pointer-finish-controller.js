export function createSiteCanvasPointerFinishController({
  state,
  canvas,
  clearCanvasBrowserSelection,
  clearLongPress,
  draw,
  setBuildingSelection,
  renderList,
  renderSelected,
  updateHandoff,
  selectionRectFromPoints,
  buildingsInSelectionRect,
  setSelectedSiteObjects,
  clearBuildingSelection,
  clearSelectedSiteObjects,
  dist,
  renderRoads,
  selected,
  buildingFootprintChanged,
  confirmProtectedBuildingResize,
  cloneSitePlannerValue,
  restoreBuildingSnapshot,
  syncAll,
  screenToWorld,
  hitRoad,
  renderStreetlights,
  finishRoadCenterline,
  finishRoadOutline,
  finishTrack,
}) {
  async function finishPointer(event) {
    clearCanvasBrowserSelection();
    clearLongPress();
    state.pointers.delete(event.pointerId);
    if (state.drag?.type === 'pinch') {
      state.pinch = null;
      state.drag = null;
      draw();
      return;
    }
    if (!state.drag) return;
    if (state.drag.pointerId !== undefined && state.drag.pointerId !== event.pointerId) return;
    const drag = state.drag;
    if (drag.type === 'rect' && drag.preview) {
      state.buildings.push(drag.preview);
      setBuildingSelection([drag.preview.id], drag.preview.id);
      renderList();
      renderSelected();
      updateHandoff();
    }
    if (drag.type === 'marquee') {
      const rect = selectionRectFromPoints(drag.start, drag.end || drag.start);
      if (Math.max(rect.w, rect.h) > 5 / state.view.scale) {
        const hits = buildingsInSelectionRect(rect);
        const ids = drag.additive ? [...new Set([...(drag.baseIds || []), ...hits])] : hits;
        setBuildingSelection(ids, ids.length === 1 ? ids[0] : null);
        setSelectedSiteObjects(ids.map(id => ({ type: 'building', id })));
      } else if (!drag.additive) {
        clearBuildingSelection();
        clearSelectedSiteObjects();
        state.selectedAnnotationId = null;
        state.selectedStreetlightId = null;
        state.selectedRoadId = null;
        state.selectedBenchworkId = null;
        state.selectedFabricId = null;
        state.selectedStlObjectId = null;
      }
      renderList();
      renderSelected();
      updateHandoff();
    }
    if (drag.type === 'roadCenterline' && drag.preview && dist(drag.start, drag.end) > 4) {
      state.roads.push(drag.preview);
      state.selectedRoadId = drag.preview.id;
      clearBuildingSelection();
      state.selectedStreetlightId = null;
      state.selectedBenchworkId = null;
      state.selectedAnnotationId = null;
      renderRoads();
      renderSelected();
    }
    if (drag.type === 'pan' && drag.rightButtonPan && drag.moved) state.suppressNextContextMenu = true;
    if (drag.type === 'rectCorner' || drag.type === 'polyPoint') {
      const building = selected();
      if (building && drag.orig && buildingFootprintChanged(drag.orig, building) && !await confirmProtectedBuildingResize(building, { before: drag.orig, after: cloneSitePlannerValue(building) })) {
        restoreBuildingSnapshot(building, drag.orig);
        canvas.classList.remove('panning');
        state.drag = null;
        syncAll({ skipDirty: true });
        return;
      }
    }
    canvas.classList.remove('panning');
    state.drag = null;
    syncAll();
  }

  function handleCanvasDoubleClick(event) {
    const point = screenToWorld(event);
    const road = hitRoad(point, 'mouse');
    if (road && road.mode === 'outline') {
      event.preventDefault();
      state.selectedRoadId = road.id;
      state.roadOutlineEditId = road.id;
      clearBuildingSelection();
      state.selectedStreetlightId = null;
      state.selectedBenchworkId = null;
      state.selectedAnnotationId = null;
      renderRoads();
      renderList();
      renderStreetlights();
      renderSelected();
      draw();
      return;
    }
    if (state.tool === 'road' && state.roadMode === 'centerline' && state.roadDraft.length >= 2) {
      event.preventDefault();
      finishRoadCenterline();
    }
    if (state.tool === 'road' && state.roadMode === 'outline' && state.roadDraft.length >= 3) {
      event.preventDefault();
      finishRoadOutline();
    }
    if (state.tool === 'track' && state.trackDraft.length >= 2) {
      event.preventDefault();
      finishTrack();
    }
  }

  return Object.freeze({ finishPointer, handleCanvasDoubleClick });
}
