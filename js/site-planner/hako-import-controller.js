import { deriveFootprintFromHakoConfig, sizeFromDerivedHakoFootprint } from './hako-footprint-utils.js';

export function createHakoImportController({
  selected,
  selectedFootprintSizeMm,
  footprintSizesMatch,
  confirmSelectedHakoSizeMismatch,
  storeHakoFileOnBuilding,
  createBuildingFromImportedHako,
  slug,
  openImportProgressModal,
  setImportProgress,
  finishImportProgress,
  failImportProgress,
  FileReaderCtor=globalThis.FileReader,
}){
  function attachHakoFileToSelectedBuilding(file, opts={}){
    const building=selected();
    if(!building){ failImportProgress('Select a building first.','Choose one footprint, then attach the .hako file again.'); return; }
    if(!file) return;
    openImportProgressModal('Attach building file','Reading file...',`Reading ${file.name||'building file'}.`);
    if(!/\.(hako|hakoseed|hakoplan|json)$/i.test(file.name||'')){
      failImportProgress('Unsupported file type.','Drop a .hako, .hakoseed, .hakoplan, or JSON building file.');
      return;
    }
    const reader=new FileReaderCtor();
    reader.onerror=()=>failImportProgress('Could not read file.','The browser could not read that .hako file.');
    reader.onload=ev=>{
      const text=String(ev.target.result||'');
      setImportProgress(2,4,'Validating building file...','Checking the JSON and footprint dimensions.');
      let parsed=null;
      try{ parsed=JSON.parse(text); }
      catch(_err){ failImportProgress('Invalid building file.','That .hako file was not valid JSON, so its footprint size could not be checked.'); return; }
      const derived=deriveFootprintFromHakoConfig(parsed||{});
      const incomingSize=sizeFromDerivedHakoFootprint(derived);
      if(!incomingSize){
        failImportProgress('Missing footprint data.','Could not find a usable footprint, width/depth, or polygon size in that .hako file.');
        return;
      }
      const currentSize=selectedFootprintSizeMm(building);
      const resizeFootprint=!footprintSizesMatch(currentSize, incomingSize);
      if(resizeFootprint){
        setImportProgress(3,4,'Confirming footprint resize...','The incoming building size differs from the selected footprint.');
        if(!confirmSelectedHakoSizeMismatch(building, currentSize, incomingSize, file.name||'building.hako')){
          finishImportProgress('Import canceled.','No changes were made to the selected footprint.',650);
          return;
        }
      }
      setImportProgress(3,4,'Applying building file...',`Attaching ${file.name||'building.hako'} to the selected footprint.`);
      storeHakoFileOnBuilding(building, file.name||`${slug(building.name||'building')}.hako`, text, parsed, {
        source:opts.source||'selected-building-upload',
        resizeFootprint,
      });
      finishImportProgress('Building file attached.',`${file.name||'building.hako'} is linked to ${building.name||'the selected footprint'}.`);
    };
    reader.readAsText(file);
  }

  function importHakoAsBuilding(file){
    if(!file) return;
    openImportProgressModal('Import building footprint','Reading file...',`Reading ${file.name||'building file'}.`);
    const reader=new FileReaderCtor();
    reader.onerror=()=>failImportProgress('Could not read file.','The browser could not read that .hako file.');
    reader.onload=ev=>{
      const text=String(ev.target.result||'');
      setImportProgress(2,4,'Validating building file...','Checking the JSON and deriving a footprint.');
      let parsed=null;
      try{ parsed=JSON.parse(text); }
      catch(_err){ failImportProgress('Invalid building file.','That .hako file was not valid JSON, so a footprint could not be derived.'); return; }
      if(!deriveFootprintFromHakoConfig(parsed||{})){
        failImportProgress('Missing footprint data.','Could not find a footprint, width/depth, or polygon in that .hako file.');
        return;
      }
      setImportProgress(3,4,'Placing footprint...','Creating a Site Planner footprint from the imported building.');
      const building=createBuildingFromImportedHako(file.name||'building.hako', text, parsed);
      if(!building){ failImportProgress('Import failed.','The file could not be converted into a Site Planner footprint.'); return; }
      finishImportProgress('Building footprint imported.',`${building.name||'Imported building'} is selected on the plan.`);
    };
    reader.readAsText(file);
  }

  return {
    attachHakoFileToSelectedBuilding,
    importHakoAsBuilding,
  };
}
