import { dataTransferHasFile as defaultDataTransferHasFile, hakoFileFromDataTransfer as defaultHakoFileFromDataTransfer, pageHakoImportFileFromDataTransfer as defaultPageHakoImportFileFromDataTransfer } from './file-import-utils.js';
import { stlFileFromDataTransfer as defaultStlFileFromDataTransfer } from './stl-utils.js';

export function createHakoDropController({
  document,
  dataTransferHasFile=defaultDataTransferHasFile,
  hakoFileFromDataTransfer=defaultHakoFileFromDataTransfer,
  pageHakoImportFileFromDataTransfer=defaultPageHakoImportFileFromDataTransfer,
  stlFileFromDataTransfer=defaultStlFileFromDataTransfer,
  selected,
  currentSelectedBuildingIds,
  importHakoAsBuilding,
  importStlAsSiteObject,
  attachHakoFileToSelectedBuilding,
  failImportProgress,
}){
  function installWholePageHakoDrop(){
    if(document.body?.dataset.hakoPageDropInstalled) return;
    if(document.body) document.body.dataset.hakoPageDropInstalled='true';
    const overlay=document.createElement('div');
    overlay.className='sitePlannerPageDropOverlay';
    overlay.innerHTML='<div><strong>Import file</strong><span>Drop .hako, .hakoseed, .hakoplan, compatible JSON, or .stl here</span></div>';
    document.body.appendChild(overlay);
    let dragDepth=0;
    const clear=()=>{dragDepth=0; overlay.classList.remove('active');};
    const hasUnhandledFile=ev=>!ev.defaultPrevented && dataTransferHasFile(ev.dataTransfer);
    document.addEventListener('dragenter', ev=>{
      if(!hasUnhandledFile(ev)) return;
      dragDepth++;
      ev.preventDefault();
      overlay.classList.add('active');
      if(ev.dataTransfer) ev.dataTransfer.dropEffect='copy';
    });
    document.addEventListener('dragover', ev=>{
      if(!hasUnhandledFile(ev)) return;
      ev.preventDefault();
      overlay.classList.add('active');
      if(ev.dataTransfer) ev.dataTransfer.dropEffect='copy';
    });
    document.addEventListener('dragleave', ev=>{
      if(!dataTransferHasFile(ev.dataTransfer)) return;
      dragDepth=Math.max(0,dragDepth-1);
      if(dragDepth===0 || ev.target===document || ev.target===document.documentElement) clear();
    });
    document.addEventListener('drop', ev=>{
      if(!hasUnhandledFile(ev)) return;
      ev.preventDefault();
      clear();
      const stl=stlFileFromDataTransfer(ev.dataTransfer);
      if(stl){ importStlAsSiteObject(stl); return; }
      const file=pageHakoImportFileFromDataTransfer(ev.dataTransfer);
      if(!file){
        failImportProgress('Unsupported file type.','Drop a .hako, .hakoseed, .hakoplan, compatible JSON building file, or .stl site object.');
        return;
      }
      importHakoAsBuilding(file);
    });
    document.addEventListener('dragend', clear);
  }

  function installSelectedHakoSidebarDrop(){
    const sidebar=document.querySelector('.sidebar');
    if(!sidebar || sidebar.dataset.hakoAttachDropInstalled) return;
    sidebar.dataset.hakoAttachDropInstalled='true';
    const canAttach=()=>!!selected() && currentSelectedBuildingIds().length===1;
    const clearDragState=()=>sidebar.classList.remove('hakoAttachDragover');
    ['dragenter','dragover'].forEach(type=>sidebar.addEventListener(type, ev=>{
      if(!canAttach() || !dataTransferHasFile(ev.dataTransfer)) return;
      ev.preventDefault();
      sidebar.classList.add('hakoAttachDragover');
      if(ev.dataTransfer) ev.dataTransfer.dropEffect='copy';
    }));
    ['dragleave','dragend'].forEach(type=>sidebar.addEventListener(type, ev=>{
      if(type==='dragleave' && sidebar.contains(ev.relatedTarget)) return;
      clearDragState();
    }));
    sidebar.addEventListener('drop', ev=>{
      if(!canAttach() || !dataTransferHasFile(ev.dataTransfer)) return;
      ev.preventDefault();
      clearDragState();
      const file=hakoFileFromDataTransfer(ev.dataTransfer);
      if(!file){
        failImportProgress('Unsupported file type.','Drop a .hako or JSON building file to attach it to the selected footprint.');
        return;
      }
      attachHakoFileToSelectedBuilding(file,{source:'selected-building-drop'});
    });
  }

  return {
    installWholePageHakoDrop,
    installSelectedHakoSidebarDrop,
  };
}
