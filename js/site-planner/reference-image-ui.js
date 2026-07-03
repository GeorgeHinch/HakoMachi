export function createReferenceImageUiController({state, getElement}){
  function updateEmptyImageOverlay(){
    const overlay=getElement('emptyImageOverlay');
    if(!overlay) return;
    const show=!state.image && state.viewMode!=='3d';
    overlay.classList.toggle('visible', show);
    overlay.setAttribute('aria-hidden', show ? 'false' : 'true');
  }

  function setImageStatus(message, kind='muted'){
    const el=getElement('imageImportStatus');
    if(!el) return;
    el.className='small '+kind;
    el.textContent=message;
  }

  return {
    updateEmptyImageOverlay,
    setImageStatus,
  };
}
