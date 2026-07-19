export function createSiteHistoryController({
  state,
  getElement,
  logger,
  historySnapshot,
  normalizeTrack,
  normalizeTrackAccessory,
  migrateLoadedRoadFeatures,
  normalizeDrivingSide,
  syncAll,
  updateImagePortableStatus,
  setImageStatus,
  markDirty,
  ImageCtor=Image,
}){
  function updateHistoryButtons(){
    const canUndo=state.historyIndex>0;
    const canRedo=state.historyIndex>=0 && state.historyIndex<state.history.length-1;
    ['undoBtn','mobileUndoBtn'].forEach(id=>{
      const button=getElement(id);
      if(!button) return;
      button.disabled=!canUndo;
      button.setAttribute('aria-disabled',String(!canUndo));
    });
    ['redoBtn','mobileRedoBtn'].forEach(id=>{
      const button=getElement(id);
      if(!button) return;
      button.disabled=!canRedo;
      button.setAttribute('aria-disabled',String(!canRedo));
    });
  }

  function pushHistorySnapshot(_label=''){
    if(state.historySuppressed) return;
    const snapshot=historySnapshot();
    if(state.historyIndex>=0 && state.history[state.historyIndex]===snapshot){
      updateHistoryButtons();
      return;
    }
    if(state.historyIndex<state.history.length-1) state.history=state.history.slice(0,state.historyIndex+1);
    state.history.push(snapshot);
    const maximum=80;
    if(state.history.length>maximum) state.history.splice(0,state.history.length-maximum);
    state.historyIndex=state.history.length-1;
    updateHistoryButtons();
  }

  function resetHistory(label=''){
    state.history=[];
    state.historyIndex=-1;
    pushHistorySnapshot(label);
  }

  function applyHistorySnapshot(snapshot){
    let data;
    try{
      data=JSON.parse(snapshot);
    }catch(error){
      logger.warn('Could not restore undo state:', error);
      return;
    }
    state.historySuppressed=true;
    const oldDataUrl=state.imageMeta?.dataUrl || null;
    const newDataUrl=data.imageMeta?.dataUrl || null;
    state.imageMeta=data.imageMeta||null;
    state.imageOpacity=Number.isFinite(Number(data.imageOpacity))?Number(data.imageOpacity):.75;
    state.imageLocked=data.imageLocked!==false;
    state.pxPerMm=data.pxPerMm||null;
    state.calibrationLine=data.calibrationLine||null;
    state.lastCalibrationLine=data.lastCalibrationLine||state.calibrationLine||null;
    state.buildings=Array.isArray(data.buildings)?structuredClone(data.buildings):[];
    state.roads=Array.isArray(data.roads)?structuredClone(data.roads):[];
    state.tracks=(Array.isArray(data.tracks)?structuredClone(data.tracks):[]).map(normalizeTrack);
    state.trackAccessories=(Array.isArray(data.trackAccessories)?structuredClone(data.trackAccessories):[]).map(normalizeTrackAccessory);
    state.roadFeatures=migrateLoadedRoadFeatures(data.roadFeatures);
    state.roadDrivingSide=normalizeDrivingSide(data.roadDrivingSide);
    state.roadIntersectionDetails=data.roadIntersectionDetails!==false;
    state.roadIntersectionOverrides=data.roadIntersectionOverrides&&typeof data.roadIntersectionOverrides==='object'?structuredClone(data.roadIntersectionOverrides):{};
    state.generatedRoadIntersections=[];
    state.railCrossingOverrides=data.railCrossingOverrides&&typeof data.railCrossingOverrides==='object'?structuredClone(data.railCrossingOverrides):{};
    state.generatedRailCrossings=[];
    state.stlObjects=Array.isArray(data.stlObjects)?structuredClone(data.stlObjects):[];
    state.benchworkOutlines=Array.isArray(data.benchworkOutlines)?structuredClone(data.benchworkOutlines):[];
    state.fabricRegions=Array.isArray(data.fabricRegions)?structuredClone(data.fabricRegions):[];
    state.streetlights=Array.isArray(data.streetlights)?structuredClone(data.streetlights):[];
    state.annotations=Array.isArray(data.annotations)?structuredClone(data.annotations):[];
    state.selectedId=data.selectedId||null;
    state.selectedIds=Array.isArray(data.selectedIds)?data.selectedIds.slice():[];
    state.selectedSiteObjects=Array.isArray(data.selectedSiteObjects)?data.selectedSiteObjects.map(selection=>({type:selection.type,id:selection.id})).filter(selection=>selection.type&&selection.id):[];
    state.selectedRoadId=data.selectedRoadId||null;
    state.selectedRoadIntersectionId=data.selectedRoadIntersectionId||null;
    state.selectedRailCrossingId=data.selectedRailCrossingId||null;
    state.selectedTrackId=data.selectedTrackId||null;
    state.selectedTrackPointIndex=Number.isInteger(data.selectedTrackPointIndex)?data.selectedTrackPointIndex:null;
    state.selectedTrackAccessoryId=data.selectedTrackAccessoryId||null;
    state.selectedStlObjectId=data.selectedStlObjectId||null;
    state.selectedBenchworkId=data.selectedBenchworkId||null;
    state.selectedFabricId=data.selectedFabricId||null;
    state.selectedStreetlightId=data.selectedStreetlightId||null;
    state.selectedAnnotationId=data.selectedAnnotationId||null;
    state.measureLine=data.measureLine||null;
    const opacity=getElement('opacity');
    if(opacity) opacity.value=String(state.imageOpacity);
    const imageLockButton=getElement('imageLockBtn');
    if(imageLockButton) imageLockButton.textContent=state.imageLocked?'Locked':'Unlocked';
    const finish=()=>{
      syncAll({skipDirty:true});
      updateImagePortableStatus();
      updateHistoryButtons();
      state.historySuppressed=false;
      markDirty('undo redo',{history:false});
    };
    if(newDataUrl && newDataUrl!==oldDataUrl){
      const image=new ImageCtor();
      image.onload=()=>{state.image=image; finish();};
      image.onerror=()=>{
        state.image=null;
        setImageStatus('Undo/redo restored image metadata, but the embedded image could not be decoded.','warning');
        finish();
      };
      image.src=newDataUrl;
      return;
    }
    if(!newDataUrl) state.image=null;
    finish();
  }

  function undo(){
    if(state.historyIndex<=0) return false;
    state.historyIndex--;
    applyHistorySnapshot(state.history[state.historyIndex]);
    return true;
  }

  function redo(){
    if(state.historyIndex<0 || state.historyIndex>=state.history.length-1) return false;
    state.historyIndex++;
    applyHistorySnapshot(state.history[state.historyIndex]);
    return true;
  }

  return { updateHistoryButtons, pushHistorySnapshot, resetHistory, undo, redo };
}
