export function createFootprintClipboardController({
  state,
  currentSelectedBuildingIds,
  selected,
  uid,
  normalizeBuilding,
  syncBuildingMetrics,
  setBuildingSelection,
  syncAll,
  updateStatus,
  now=()=>new Date().toISOString(),
}){
  function buildingFootprintClipboardPayload(building){
    if(!building) return null;
    const payload=structuredClone(building);
    payload.hakoFile=null;
    payload.hakoFileId=null;
    payload.hakoConfig=null;
    payload.copiedFromId=building.id;
    payload.copiedAt=now();
    return payload;
  }

  function copySelectedFootprint(){
    const ids=currentSelectedBuildingIds();
    const selectedBuildings=ids.map(id=>state.buildings.find(building=>building.id===id)).filter(Boolean);
    if(!selectedBuildings.length) return false;
    state.footprintClipboard = selectedBuildings.length===1
      ? buildingFootprintClipboardPayload(selectedBuildings[0])
      : {multi:true, buildings:selectedBuildings.map(buildingFootprintClipboardPayload), copiedAt:now()};
    state.pasteOffsetCount=0;
    updateStatus();
    return true;
  }

  function pasteFootprintFromClipboard(){
    const src=state.footprintClipboard;
    if(!src) return false;
    const sources=src.multi && Array.isArray(src.buildings) ? src.buildings : [src];
    const n=++state.pasteOffsetCount;
    const off=18*n;
    const pastedIds=[];
    sources.forEach((item,idx)=>{
      const copy=structuredClone(item);
      copy.id=uid('bldg');
      const baseName=(copy.name||'Building').replace(/ copy(?: \d+)?$/i,'');
      copy.name=baseName+' copy';
      copy.state=copy.state||'notStarted';
      copy.hakoFile=null;
      copy.hakoFileId=null;
      copy.hakoConfig=null;
      copy.hidden=false;
      const dx=off + idx*10, dy=off + idx*10;
      if(copy.padType==='rect'){
        copy.x=(Number(copy.x)||0)+dx;
        copy.y=(Number(copy.y)||0)+dy;
      } else if(Array.isArray(copy.pointsPx)) {
        copy.pointsPx=copy.pointsPx.map(point=>({x:(Number(point.x)||0)+dx,y:(Number(point.y)||0)+dy}));
      }
      normalizeBuilding(copy);
      syncBuildingMetrics(copy);
      state.buildings.push(copy);
      pastedIds.push(copy.id);
    });
    setBuildingSelection(pastedIds, pastedIds.length===1?pastedIds[0]:null);
    syncAll();
    return true;
  }

  function duplicateBuildingFootprint(building){
    if(!building) return null;
    state.footprintClipboard=buildingFootprintClipboardPayload(building);
    state.pasteOffsetCount=0;
    pasteFootprintFromClipboard();
    return selected();
  }

  return {
    buildingFootprintClipboardPayload,
    copySelectedFootprint,
    pasteFootprintFromClipboard,
    duplicateBuildingFootprint,
  };
}
