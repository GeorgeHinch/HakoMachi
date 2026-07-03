import { arrayBufferToBase64 as defaultArrayBufferToBase64 } from '../shared/browser-utils.js';
import { isLikelyStlFile as defaultIsLikelyStlFile, parseStlBounds as defaultParseStlBounds } from './stl-utils.js';

export function createStlImportController({
  state,
  uid,
  visibleWorldCenter,
  normalizeStlObject,
  clearPlanObjectSelection,
  setSidebarObjectType,
  syncAll,
  openImportProgressModal,
  setImportProgress,
  finishImportProgress,
  failImportProgress,
  arrayBufferToBase64=defaultArrayBufferToBase64,
  isLikelyStlFile=defaultIsLikelyStlFile,
  parseStlBounds=defaultParseStlBounds,
}){
  async function importStlAsSiteObject(file){
    if(!file) return;
    if(!isLikelyStlFile(file)){ failImportProgress('Unsupported file type.','Drop or choose a .stl file to place it as a site object.'); return; }
    openImportProgressModal('Import STL object','Reading STL...',`Reading ${file.name||'site object.stl'}.`);
    try{
      const buffer=await file.arrayBuffer();
      setImportProgress(2,4,'Measuring STL bounds...','Finding the footprint size for placement.');
      const bounds=parseStlBounds(buffer);
      const center=visibleWorldCenter();
      setImportProgress(3,4,'Placing site object...','Creating a selectable Site Planner object.');
      const obj=normalizeStlObject({
        id:uid('stl'),
        name:String(file.name||'STL Object').replace(/\.stl$/i,'') || 'STL Object',
        x:center.x,
        y:center.y,
        rotationDeg:0,
        scale:1,
        widthMm:bounds.width,
        depthMm:bounds.depth,
        heightMm:bounds.height,
        color:'#496a78',
        locked:false,
        hidden:false,
        notes:'Imported STL site object. The planner renders the STL geometry in 3D when the asset is available, with a footprint/proxy fallback.',
        bounds,
        asset:{
          kind:'stl',
          fileName:file.name||'site-object.stl',
          mimeType:file.type||'model/stl',
          sizeBytes:file.size||buffer.byteLength,
          importedAt:new Date().toISOString(),
          dataBase64:arrayBufferToBase64(buffer)
        }
      });
      state.stlObjects=state.stlObjects||[];
      state.stlObjects.push(obj);
      clearPlanObjectSelection();
      state.selectedStlObjectId=obj.id;
      setSidebarObjectType('siteObjects');
      syncAll();
      finishImportProgress('STL object imported.',`${obj.name} is selected on the plan.`);
    }catch(err){
      failImportProgress('Could not import STL.', err?.message||'The browser could not read that STL file.');
    }
  }

  async function attachSourceFileToStlObject(obj, file){
    if(!obj || !file) return;
    normalizeStlObject(obj);
    const buffer=await file.arrayBuffer();
    const source={
      id:uid('src'),
      kind:'stl-source',
      name:file.name||'source-file',
      fileName:file.name||'source-file',
      mimeType:file.type||'application/octet-stream',
      sizeBytes:file.size||buffer.byteLength,
      importedAt:new Date().toISOString(),
      dataBase64:arrayBufferToBase64(buffer)
    };
    obj.sourceAssets=obj.sourceAssets||[];
    obj.sourceAssets.push(source);
    syncAll();
  }

  return {
    importStlAsSiteObject,
    attachSourceFileToStlObject,
  };
}
