export function zipFileForPath(zip, path){
  if(!zip || !path) return null;
  const assetName=String(path).replace(/^\/+/,'');
  return zip.file(assetName) || zip.file(assetName.split('/').pop());
}

export function findSiteBundleProjectName(zip){
  const names=Object.keys(zip.files).filter(name=>!zip.files[name].dir);
  return names.find(name=>/\.hako-site\.json$/i.test(name))
    || names.find(name=>/(^|\/)hakomachi-site\.json$/i.test(name))
    || names.find(name=>/\.json$/i.test(name))
    || null;
}

export function isSiteBundlePackageFile(file){
  const name=String(file?.name || '');
  const type=String(file?.type || '');
  return /\.hako-site$/i.test(name)
    || /\.zip$/i.test(name)
    || /zip/i.test(type);
}

export async function hydrateBundledImageAsset(payload, zip, {dataUrlFromBase64, cacheImageAsset}){
  const asset=payload.image?.asset;
  if(!asset?.path || payload.image?.dataUrl) return;
  const assetFile=zipFileForPath(zip, asset.path);
  if(!assetFile) return;
  const b64=await assetFile.async('base64');
  payload.image.dataUrl=dataUrlFromBase64(asset.mimeType, b64);
  payload.image.asset=asset;
  cacheImageAsset(asset, payload.image.dataUrl);
}

export async function hydrateBundledHakoAssets(payload, zip, {hakoFileText}){
  const buildings=Array.isArray(payload.buildings) ? payload.buildings : [];
  for(const b of buildings){
    const hakoAsset=b?.hakoFile;
    if(hakoAsset?.path && !hakoFileText(b)){
      const assetFile=zipFileForPath(zip, hakoAsset.path);
      if(assetFile){
        const text=await assetFile.async('string');
        let parsed=null;
        try{ parsed=JSON.parse(text); }catch(_err){}
        b.hakoFile={...hakoAsset,dataText:text,parsedConfig:parsed,unavailable:false};
        if(parsed && !b.hakoConfig) b.hakoConfig=parsed;
      } else {
        b.hakoFile={...hakoAsset,unavailable:true};
      }
    }
  }
}

export async function hydrateBundledStlAssets(payload, zip){
  const stlObjects=Array.isArray(payload.stlObjects) ? payload.stlObjects : [];
  for(const obj of stlObjects){
    const stlAsset=obj?.asset;
    if(stlAsset?.path && !stlAsset.dataBase64){
      const assetFile=zipFileForPath(zip, stlAsset.path);
      if(assetFile){
        const b64=await assetFile.async('base64');
        obj.asset={...stlAsset,dataBase64:b64,unavailable:false};
      } else {
        obj.asset={...stlAsset,unavailable:true};
      }
    }
    const sources=Array.isArray(obj.sourceAssets) ? obj.sourceAssets : [];
    for(const source of sources){
      if(!source?.path || source.dataBase64) continue;
      const sourceFile=zipFileForPath(zip, source.path);
      if(sourceFile){
        const b64=await sourceFile.async('base64');
        Object.assign(source,{dataBase64:b64,unavailable:false});
      } else {
        Object.assign(source,{unavailable:true});
      }
    }
  }
}

export async function hydrateSiteBundleAssets(payload, zip, deps){
  await hydrateBundledImageAsset(payload, zip, deps);
  await hydrateBundledHakoAssets(payload, zip, deps);
  await hydrateBundledStlAssets(payload, zip);
}
