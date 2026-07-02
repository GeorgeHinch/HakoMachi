function csvCell(value){
  return '"'+String(value).replaceAll('"','""')+'"';
}

export function buildingCsvExport(buildings, {normalizeBuilding}){
  const rows=[['id','name','state','type','category','widthMm','depthMm','areaMm2','rotationDeg','hakoFile','notes']];
  buildings.forEach(raw=>{
    const b=normalizeBuilding(raw);
    rows.push([b.id,b.name,b.state,b.padType,b.category,b.widthMm||'',b.depthMm||'',b.derived?.areaMm2||'',b.rotationDeg||0,b.hakoFile?.fileName||'',b.notes||'']);
  });
  return rows.map(r=>r.map(csvCell).join(',')).join('\n');
}
