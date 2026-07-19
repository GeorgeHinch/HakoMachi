import { approxDataUrlBytes, formatBytes } from '../shared/browser-utils.js';

export function createReferenceImageUiController({
  state,
  getElement,
  readFileAsDataURL,
  isSupportedImageFile,
  pageHakoImportFileFromDataTransfer,
  openImportProgressModal,
  setImportProgress,
  finishImportProgress,
  failImportProgress,
  resize,
  fitImage,
  syncAll,
  logger,
  urlApi=URL,
  ImageCtor=Image,
}){
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

  async function loadReferenceImage(file){
    if(!file) return;
    openImportProgressModal('Import reference image','Reading image...',`Loading ${file.name||'reference image'}.`);
    setImageStatus(`Loading ${file.name}…`);
    const objectUrl=urlApi.createObjectURL(file);
    let dataUrl=null;
    try{
      const image=new ImageCtor();
      const loaded=new Promise((resolve,reject)=>{
        image.onload=()=>resolve();
        image.onerror=()=>reject(new Error('The browser could not decode this image. Try PNG, JPG, WEBP, or a simple SVG.'));
      });
      image.src=objectUrl;
      await loaded;
      setImportProgress(2,4,'Decoding image...','Preparing the reference layer for the canvas.');
      if(image.decode){
        try{ await image.decode(); }catch(_error){}
      }
      setImportProgress(3,4,'Embedding image data...','Preparing a portable copy when the browser allows it.');
      try{ dataUrl=await readFileAsDataURL(file); }catch(_error){ dataUrl=null; }
      state.image=image;
      state.imageMeta={
        name:file.name,
        mimeType:file.type || (dataUrl && (dataUrl.match(/^data:([^;]+);/)||[])[1]) || 'application/octet-stream',
        dataUrl,
        objectUrlUsed:true,
        naturalWidthPx:image.naturalWidth||image.width,
        naturalHeightPx:image.naturalHeight||image.height,
        opacity:state.imageOpacity,
        rotationDeg:0,
      };
      resize();
      fitImage();
      syncAll();
      setImageStatus(`Loaded ${file.name} (${state.imageMeta.naturalWidthPx} × ${state.imageMeta.naturalHeightPx}px).`,'okText');
      updateImagePortableStatus();
      updateEmptyImageOverlay();
      finishImportProgress('Reference image imported.',`${file.name||'Reference image'} is ready on the canvas.`);
      logger.info('Image loaded',state.imageMeta);
    }catch(error){
      logger.error('Image import failed',error);
      setImageStatus(error.message || 'Image import failed.','warning');
      failImportProgress('Image import failed.',error.message || 'The image could not be loaded.');
      urlApi.revokeObjectURL(objectUrl);
    }
  }

  async function handleEmptyImageDrop(file){
    if(!file) return;
    if(!isSupportedImageFile(file)){
      failImportProgress('Unsupported image type.','Drop a PNG, JPG, SVG, or WEBP image here. Use Load for .hako-site package or .hako-site.json project files.');
      return;
    }
    await loadReferenceImage(file);
  }

  function installReferenceImageImport(){
    const input=getElement('imageFile');
    if(input){
      input.addEventListener('change',async event=>{
        const file=event.target.files && event.target.files[0];
        event.target.value='';
        await loadReferenceImage(file);
      });
    }
    const overlay=getElement('emptyImageOverlay');
    const card=getElement('emptyImageCard');
    if(overlay){
      ['dragenter','dragover'].forEach(type=>overlay.addEventListener(type,event=>{
        if(pageHakoImportFileFromDataTransfer(event.dataTransfer)) return;
        if(!state.image){
          event.preventDefault();
          event.stopPropagation();
          card?.classList.add('dragOver');
        }
      }));
      ['dragleave','dragend'].forEach(type=>overlay.addEventListener(type,()=>card?.classList.remove('dragOver')));
      overlay.addEventListener('drop',async event=>{
        if(pageHakoImportFileFromDataTransfer(event.dataTransfer)) return;
        if(!state.image){
          event.preventDefault();
          event.stopPropagation();
          card?.classList.remove('dragOver');
          await handleEmptyImageDrop(event.dataTransfer?.files?.[0]);
        }
      });
    }
    updateEmptyImageOverlay();
  }

  return {
    updateEmptyImageOverlay,
    setImageStatus,
    updateImagePortableStatus,
    loadReferenceImage,
    installReferenceImageImport,
  };
}
