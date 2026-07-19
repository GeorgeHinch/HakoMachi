export function createSiteResetController({
  state,
  getElement,
  logger,
  document,
  window,
  localStorage,
  sessionStorage,
  caches,
  wrap,
  applySite3DSettings,
  syncSite3DControls,
  clearLongPress,
  hideContextMenu,
  updateImagePortableStatus,
  rememberGithubSiteSource,
  resetHistory,
  setImageStatus,
  syncAll,
  updateAutosaveStatus,
  confirm=globalThis.confirm,
}){
  async function clearCacheAndReset(){
    const ok=confirm('Clear HakoMachi Site Planner cache and reset to the default blank state?\n\nThis clears the current in-memory project, the HakoMachi handoff seed, and planner-related browser storage. Download/save your .hako-site package first if you want to keep it.');
    if(!ok) return;
    try{
      const keysToRemove=[];
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i);
        if(key && /hakomachi|hakoMachi|sitePlanner|site-planner/i.test(key)) keysToRemove.push(key);
      }
      keysToRemove.forEach(key=>localStorage.removeItem(key));
      const sessionKeys=[];
      for(let i=0;i<sessionStorage.length;i++){
        const key=sessionStorage.key(i);
        if(key && /hakomachi|hakoMachi|sitePlanner|site-planner/i.test(key)) sessionKeys.push(key);
      }
      sessionKeys.forEach(key=>sessionStorage.removeItem(key));
      if('caches' in window){
        const cacheNames=await caches.keys();
        await Promise.all(cacheNames.filter(name=>/hakomachi|hakoMachi|sitePlanner|site-planner/i.test(name)).map(name=>caches.delete(name)));
      }
    }catch(error){
      logger.warn('Cache clearing was partially blocked:', error);
    }
    state.tool='select';
    state.image=null;
    state.imageMeta=null;
    state.imageOpacity=.75;
    state.imageLocked=true;
    state.view={x:40,y:40,scale:1};
    state.viewMode='2d';
    applySite3DSettings({});
    syncSite3DControls();
    wrap.classList.remove('view3d');
    document.querySelector('.sitePlannerApp')?.classList.remove('view3d');
    state.pxPerMm=null;
    state.calibrationLine=null;
    state.lastCalibrationLine=null;
    state.buildings=[];
    state.tracks=[];
    state.selectedTrackId=null;
    state.selectedTrackPointIndex=null;
    state.hoverTrackId=null;
    state.trackAccessories=[];
    state.selectedTrackAccessoryId=null;
    state.hoverTrackAccessoryId=null;
    state.trackDraft=[];
    state.trackDraftConnections=[];
    state.trackDraftExtension=null;
    state.selectedId=null;
    state.drag=null;
    state.hover=null;
    state.polygonDraft=[];
    state.measureLine=null;
    state.annotations=[];
    state.selectedAnnotationId=null;
    state.roadDrivingSide='left';
    state.selectedFabricId=null;
    state.streetlights=[];
    state.selectedStreetlightId=null;
    state.hoverStreetlightId=null;
    state.hoverPreview=null;
    clearLongPress();
    hideContextMenu();
    state.projectName='hakomachi-site';
    state.inputMode='penDrawFingerPan';
    state.snapOn=false;
    state.pointers=new Map();
    state.pinch=null;
    const opacity=getElement('opacity');
    if(opacity) opacity.value='0.75';
    const imageLockButton=getElement('imageLockBtn');
    if(imageLockButton) imageLockButton.textContent='Locked';
    updateImagePortableStatus();
    const imageFile=getElement('imageFile');
    if(imageFile) imageFile.value='';
    const loadFile=getElement('loadFile');
    if(loadFile) loadFile.value='';
    document.querySelectorAll('.toolbtn').forEach(button=>button.classList.toggle('active', button.dataset.tool==='select'));
    state.dirty=false;
    state.dirtySinceManualSave=false;
    state.autosaveRestored=false;
    rememberGithubSiteSource(null);
    resetHistory('reset');
    setImageStatus('Cache cleared. Planner reset to default blank state.', 'okText');
    syncAll({skipDirty:true});
    updateAutosaveStatus('Autosave: cleared');
  }

  return { clearCacheAndReset };
}
