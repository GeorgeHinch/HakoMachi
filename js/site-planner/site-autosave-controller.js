export function createSiteAutosaveController({
  state,
  autosaveKey,
  autosaveMetaKey,
  getTimer,
  setTimer,
  makeProjectPayload,
  localStorage,
  logger,
  updateImagePortableStatus,
  updateAutosaveStatus,
  setTimeoutFn=setTimeout,
  clearTimeoutFn=clearTimeout,
}){
  function scheduleAutosave(){
    clearTimeoutFn(getTimer());
    setTimer(setTimeoutFn(writeAutosave, 450));
  }

  function writeAutosave(){
    if(!state.autosaveReady) return;
    clearTimeoutFn(getTimer());
    setTimer(null);
    try{
      let payload=makeProjectPayload({includeImageDataUrl:true});
      const meta={savedAt:payload.savedAt, dirtySinceManualSave:!!state.dirtySinceManualSave, imageEmbedded:!!payload.image?.dataUrl, imageBytes:payload.image?.dataUrlByteLength||0};
      try{
        localStorage.setItem(autosaveKey, JSON.stringify(payload));
        localStorage.setItem(autosaveMetaKey, JSON.stringify(meta));
        updateImagePortableStatus();
      }catch(storageError){
        // Browser localStorage is often too small for large reference images.
        // Preserve geometry in this browser by retrying without the image.
        if(payload.image?.dataUrl){
          payload=makeProjectPayload({includeImageDataUrl:false});
          const fallbackMeta={savedAt:payload.savedAt, dirtySinceManualSave:!!state.dirtySinceManualSave, imageEmbedded:false, imageTooLargeForAutosave:true, imageBytes:meta.imageBytes};
          localStorage.setItem(autosaveKey, JSON.stringify(payload));
          localStorage.setItem(autosaveMetaKey, JSON.stringify(fallbackMeta));
          updateAutosaveStatus('Autosave: geometry saved, image too large');
          updateImagePortableStatus('Portable save: embeds original image; autosave kept geometry only because browser cache is too small.');
        }else{
          throw storageError;
        }
      }
      state.dirty=false;
      state.lastAutosaveAt=Date.now();
      if(!(payload.image && !payload.image.dataUrl && state.imageMeta?.dataUrl)) updateAutosaveStatus();
    }catch(error){
      logger.warn('Autosave failed:', error);
      updateAutosaveStatus('Autosave: failed');
    }
  }

  function markManualSaveComplete(){
    state.dirty=false;
    state.dirtySinceManualSave=false;
    writeAutosave();
    updateAutosaveStatus('Autosave: saved');
    setTimeoutFn(()=>updateAutosaveStatus(), 1200);
  }

  return { scheduleAutosave, writeAutosave, markManualSaveComplete };
}
