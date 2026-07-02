export function buildLocalImageBundleAsset(state, {cachedImageAsset, imageAssetReference, imageAssetFileName, dataUrlInfo}){
  const dataUrl=state.imageMeta?.dataUrl || cachedImageAsset(state.imageMeta?.asset);
  if(!dataUrl) return null;
  const asset=imageAssetReference('assets/'+imageAssetFileName(state.imageMeta), state.imageMeta, dataUrl, state.image);
  return {asset,dataUrl,info:dataUrlInfo(dataUrl)};
}

export function buildLocalHakoBundleAssets(buildings, {normalizeBuilding, hakoFileText, uniqueHakoAssetFileName, hakoFileAssetReference}){
  const usedNames=new Set();
  return buildings.flatMap(raw=>{
    const b=normalizeBuilding(raw);
    const text=hakoFileText(b);
    if(!b.hakoFile || !text) return [];
    const fileName=uniqueHakoAssetFileName(b, usedNames);
    const asset=hakoFileAssetReference(`assets/buildings/${fileName}`, b, text);
    return [{role:'building-hako',asset,text,buildingId:b.id}];
  });
}

export function buildLocalStlBundleAssets(stlObjects, {normalizeStlObject, uniqueStlAssetFileName, stlAssetReference, uniqueStlSourceAssetFileName, stlSourceAssetReference}){
  const usedModelNames=new Set();
  const usedSourceNames=new Set();
  return (stlObjects||[]).flatMap(raw=>{
    const obj=normalizeStlObject(raw);
    const entries=[];
    const dataBase64=obj?.asset?.dataBase64;
    if(dataBase64){
      const fileName=uniqueStlAssetFileName(obj, usedModelNames);
      const asset=stlAssetReference(`assets/stl/${fileName}`, obj, dataBase64);
      entries.push({role:'model',asset,dataBase64,objectId:obj.id});
    }
    (obj.sourceAssets||[]).forEach(source=>{
      if(!source?.dataBase64) return;
      const fileName=uniqueStlSourceAssetFileName(source, usedSourceNames);
      const asset=stlSourceAssetReference(`assets/stl/sources/${fileName}`, obj, source, source.dataBase64);
      entries.push({role:'source',asset,dataBase64:source.dataBase64,objectId:obj.id,sourceAssetId:source.id});
    });
    return entries;
  }).filter(Boolean);
}
