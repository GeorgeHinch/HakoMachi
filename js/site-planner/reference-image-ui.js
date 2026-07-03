import { approxDataUrlBytes, formatBytes } from '../shared/browser-utils.js';

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

  function updateImagePortableStatus(extraMessage){
    const el=getElement('imagePortableStatus');
    if(!el) return;
    if(extraMessage){
      el.textContent=extraMessage;
      return;
    }
    if(!state.imageMeta){
      el.textContent='Portable save: no image.';
      return;
    }
    const bytes=approxDataUrlBytes(state.imageMeta.dataUrl);
    if(state.imageMeta.dataUrl){
      el.textContent=`Portable save: embeds original ${state.imageMeta.naturalWidthPx||'?'} × ${state.imageMeta.naturalHeightPx||'?'} px image (${formatBytes(bytes)}).`;
    } else {
      el.textContent='Portable save: image is not embedded yet. Re-import the image before saving for cross-browser portability.';
    }
  }

  return {
    updateEmptyImageOverlay,
    setImageStatus,
    updateImagePortableStatus,
  };
}
