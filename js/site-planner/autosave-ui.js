export function createAutosaveUiController({state, getElement}){
  function updateAutosaveStatus(message){
    const el=getElement('statusAutosave');
    if(!el) return;
    if(message){
      el.textContent=message;
      return;
    }
    if(state.dirty) el.textContent='Autosave: pending';
    else if(state.lastAutosaveAt) el.textContent='Autosave: '+new Date(state.lastAutosaveAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    else el.textContent='Autosave: ready';
  }

  return {updateAutosaveStatus};
}
