export function createHakoFileController({
  slug,
  formatBytes,
  escapeHtml,
  selectedBuilding,
  summaryElement,
}){
  function hakoFileText(building){
    if(!building?.hakoFile) return '';
    if(typeof building.hakoFile.dataText==='string' && building.hakoFile.dataText) return building.hakoFile.dataText;
    const cfg=building.hakoFile.parsedConfig || building.hakoConfig;
    return cfg && typeof cfg==='object' ? JSON.stringify(cfg,null,2) : '';
  }

  function hakoFileSummary(building){
    if(!building || !building.hakoFile) return 'No completed .hako file stored.';
    const size=Number(building.hakoFile.sizeBytes||0);
    const sizeText=size ? formatBytes(size) : 'unknown size';
    const date=building.hakoFile.importedAt ? new Date(building.hakoFile.importedAt).toLocaleString() : 'unknown date';
    const stateText=building.hakoFile.unavailable?' · asset unavailable':(building.hakoFile.path&&!hakoFileText(building)?' · referenced asset':'');
    return `${escapeHtml(building.hakoFile.fileName||'building.hako')} · ${sizeText} · ${date}${stateText}`;
  }

  function hasAttachedHakoFile(building){
    return !!building?.hakoFile;
  }

  function renameAttachedHakoFileForBuilding(building){
    if(!building?.hakoFile) return false;
    const fileName=`${slug(building.name||'building')}.hako`;
    building.hakoFile.fileName=fileName;
    building.hakoFile.name=fileName;
    building.hakoFileId=fileName;
    const summary=summaryElement();
    if(summary && selectedBuilding()?.id===building.id) summary.innerHTML=hakoFileSummary(building);
    return true;
  }

  return {
    hakoFileSummary,
    hasAttachedHakoFile,
    hakoFileText,
    renameAttachedHakoFileForBuilding,
  };
}
