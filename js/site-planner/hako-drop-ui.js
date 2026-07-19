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

  function installHakoImportDropzone(box){
    if(!box) return;
    const actions=document.createElement('div');
    actions.className='buildingListActions';
    actions.innerHTML=`
      <div id="importHakoAsBuildingDropzone" class="hakoImportDropzone" role="button" tabindex="0" title="Click to choose a .hako file, or drag one here to create a draggable footprint.">
        <b>Import existing .hako as footprint</b>
        <span class="small muted">Click or drop .hako / .json here</span>
        <input id="importHakoBuildingFile" class="hiddenFile" type="file" accept=".hako,.hakoseed,.hakoplan,.json,application/json">
      </div>`;
    box.appendChild(actions);
    const drop=document.getElementById('importHakoAsBuildingDropzone');
    const input=document.getElementById('importHakoBuildingFile');
    if(!drop || !input) return;
    const pick=()=>input.click();
    drop.onclick=ev=>{ if(ev.target!==input) pick(); };
    drop.onkeydown=ev=>{ if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); pick(); } };
    input.onchange=e=>{const f=e.target.files&&e.target.files[0]; if(f) importHakoAsBuilding(f); e.target.value='';};
    ['dragenter','dragover'].forEach(type=>drop.addEventListener(type, ev=>{ev.preventDefault(); ev.stopPropagation(); drop.classList.add('dragover');}));
    ['dragleave','drop'].forEach(type=>drop.addEventListener(type, ev=>{ev.preventDefault(); ev.stopPropagation(); if(type==='dragleave' && drop.contains(ev.relatedTarget)) return; drop.classList.remove('dragover');}));
    drop.addEventListener('drop', ev=>{
      const files=Array.from(ev.dataTransfer&&ev.dataTransfer.files||[]);
      const f=files.find(file=>/\.(hako|hakoseed|hakoplan|json)$/i.test(file.name||''))||files[0];
      if(!f) return;
      if(selected() && currentSelectedBuildingIds().length===1) attachHakoFileToSelectedBuilding(f,{source:'selected-building-drop'});
      else importHakoAsBuilding(f);
    });
  }

  return {
    installWholePageHakoDrop,
    installSelectedHakoSidebarDrop,
    installHakoImportDropzone,
  };
}
