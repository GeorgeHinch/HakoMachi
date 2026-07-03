export function createBuildingSelectionController({
  state,
  bboxOverlaps,
  transformedRect,
}){
  function selected(){
    return state.buildings.find(building=>building.id===state.selectedId)||null;
  }

  function currentSelectedBuildingIds(){
    const ids=Array.isArray(state.selectedIds)?state.selectedIds.filter(Boolean):[];
    if(state.selectedId && !ids.includes(state.selectedId)) return [state.selectedId];
    return [...new Set(ids)].filter(id=>state.buildings.some(building=>building.id===id));
  }

  function clearBuildingSelection(){
    state.selectedId=null;
    state.selectedIds=[];
    state.selectedFabricId=null;
    state.selectedTrackId=null;
    state.selectedStlObjectId=null;
  }

  function setBuildingSelection(ids, primaryId=null){
    const valid=[...new Set((ids||[]).filter(id=>state.buildings.some(building=>building.id===id)))];
    state.selectedIds=valid;
    state.selectedId=primaryId || (valid.length===1 ? valid[0] : null);
    state.selectedRoadId=null;
    state.selectedRoadFeatureId=null;
    state.selectedTrackId=null;
    state.selectedBenchworkId=null;
    state.selectedStreetlightId=null;
    state.selectedAnnotationId=null;
    state.selectedFabricId=null;
    state.selectedStlObjectId=null;
  }

  function reassertCanvasBuildingSelection(id){
    const ids=currentSelectedBuildingIds();
    setBuildingSelection(ids.includes(id) ? ids : [id], id);
  }

  function isBuildingSelected(id){
    return currentSelectedBuildingIds().includes(id);
  }

  function toggleBuildingSelection(id){
    const ids=currentSelectedBuildingIds();
    if(ids.includes(id)) setBuildingSelection(ids.filter(x=>x!==id));
    else setBuildingSelection([...ids,id], ids.length?null:id);
  }

  function buildingBBox(building){
    const pts=building.padType==='rect'?transformedRect(building):(building.pointsPx||[]);
    if(!pts.length) return {x:0,y:0,w:0,h:0};
    const xs=pts.map(point=>point.x), ys=pts.map(point=>point.y);
    return {x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};
  }

  function buildingsInSelectionRect(rect){
    return state.buildings.filter(building=>!building.hidden && bboxOverlaps(rect,buildingBBox(building))).map(building=>building.id);
  }

  return {
    selected,
    currentSelectedBuildingIds,
    clearBuildingSelection,
    setBuildingSelection,
    reassertCanvasBuildingSelection,
    isBuildingSelected,
    toggleBuildingSelection,
    buildingBBox,
    buildingsInSelectionRect,
  };
}
