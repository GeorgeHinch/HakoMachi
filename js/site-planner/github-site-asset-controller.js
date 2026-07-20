export function createGithubSiteAssetController({
  state,
  defaultSiteDir,
  dataUrlInfo,
  githubImageAssetPath,
  imageAssetReference,
  setGithubProgress,
  writeGithubBase64File,
  cacheImageAsset,
  normalizeBuilding,
  hakoFileText,
  uniqueHakoAssetFileName,
  githubHakoAssetPath,
  hakoFileAssetReference,
  textToBase64,
  normalizeStlObject,
  uniqueStlAssetFileName,
  githubStlAssetPath,
  stlAssetReference,
  uniqueStlSourceAssetFileName,
  githubStlSourceAssetPath,
  stlSourceAssetReference,
  cachedImageAsset,
  setGithubStatus,
  readGithubBase64File,
  dataUrlFromBase64,
  base64ToText,
}){
  async function saveGithubImageAsset(settings,siteId,siteName){
    const dataUrl=state.imageMeta?.dataUrl;
    if(!dataUrl) return state.imageMeta?.asset||null;
    const info=dataUrlInfo(dataUrl);
    if(!info?.isBase64||!info.data) return state.imageMeta?.asset||null;
    const path=githubImageAssetPath(settings,defaultSiteDir,siteId,state.imageMeta);
    const asset=imageAssetReference(path,state.imageMeta,dataUrl,state.image);
    setGithubProgress(2,8,'Writing reference image asset...',`Saving ${asset.name} outside the main site file.`);
    await writeGithubBase64File(settings,path,info.data,`Save HakoMachi site image asset: ${siteName}`);
    state.imageMeta.asset=asset;
    cacheImageAsset(asset,dataUrl);
    return asset;
  }

  async function saveGithubHakoAssets(settings,siteId,siteName){
    const usedNames=new Set();
    const hakoAssets=[];
    for(let i=0;i<state.buildings.length;i++){
      const building=normalizeBuilding(state.buildings[i],i);
      const text=hakoFileText(building);
      if(!building.hakoFile||!text) continue;
      const fileName=uniqueHakoAssetFileName(building,usedNames);
      const path=githubHakoAssetPath(settings,defaultSiteDir,siteId,fileName);
      const asset=hakoFileAssetReference(path,building,text);
      setGithubProgress(3,8,'Writing building files...',`Saving ${asset.name} (${i+1} of ${state.buildings.length}) outside the main site file.`);
      await writeGithubBase64File(settings,path,textToBase64(text),`Save HakoMachi building asset: ${siteName}`);
      building.hakoFile={...(building.hakoFile||{}),...asset,dataText:text,parsedConfig:building.hakoFile?.parsedConfig||building.hakoConfig||null,unavailable:false};
      building.hakoFileId=asset.path;
      hakoAssets.push({role:'building-hako',asset,text,buildingId:building.id});
    }
    if(!hakoAssets.length) setGithubProgress(3,8,'No building files to write.','The site plan does not currently include attached building .hako files.');
    return hakoAssets;
  }

  async function saveGithubStlAssets(settings,siteId,siteName){
    const usedModelNames=new Set();
    const usedSourceNames=new Set();
    const stlAssets=[];
    const stlObjects=state.stlObjects||[];
    for(let i=0;i<stlObjects.length;i++){
      const object=normalizeStlObject(stlObjects[i]);
      const dataBase64=object?.asset?.dataBase64;
      if(dataBase64){
        const fileName=uniqueStlAssetFileName(object,usedModelNames);
        const path=githubStlAssetPath(settings,defaultSiteDir,siteId,fileName);
        const asset=stlAssetReference(path,object,dataBase64);
        setGithubProgress(4,8,'Writing STL site objects...',`Saving ${asset.name} (${i+1} of ${stlObjects.length}) outside the main site file.`);
        await writeGithubBase64File(settings,path,dataBase64,`Save HakoMachi site STL asset: ${siteName}`);
        object.asset={...(object.asset||{}),...asset,dataBase64};
        stlAssets.push({role:'model',asset,dataBase64,objectId:object.id});
      }
      for(const source of (object.sourceAssets||[])){
        if(!source?.dataBase64) continue;
        const fileName=uniqueStlSourceAssetFileName(source,usedSourceNames);
        const path=githubStlSourceAssetPath(settings,defaultSiteDir,siteId,fileName);
        const asset=stlSourceAssetReference(path,object,source,source.dataBase64);
        setGithubProgress(4,8,'Writing STL source files...',`Saving ${asset.name} (${i+1} of ${stlObjects.length}) outside the main site file.`);
        await writeGithubBase64File(settings,path,source.dataBase64,`Save HakoMachi site STL source asset: ${siteName}`);
        Object.assign(source,asset,{dataBase64:source.dataBase64});
        stlAssets.push({role:'source',asset,dataBase64:source.dataBase64,objectId:object.id,sourceAssetId:source.id});
      }
    }
    if(!stlAssets.length) setGithubProgress(4,8,'No STL assets to write.','The site plan does not currently include embedded STL or source files.');
    return stlAssets;
  }

  async function resolveProjectImageFromGithub(project,settings){
    const asset=project?.image?.asset;
    if(!asset?.path||project.image?.dataUrl) return project;
    const cached=cachedImageAsset(asset);
    if(cached){
      project.image.dataUrl=cached;
      return project;
    }
    setGithubStatus('Loading referenced image asset...');
    try{
      const file=await readGithubBase64File(settings,asset.path);
      if(file?.contentBase64){
        project.image.dataUrl=dataUrlFromBase64(asset.mimeType,file.contentBase64);
        cacheImageAsset(asset,project.image.dataUrl);
      }else{
        project.image.assetLoadError='The referenced image asset was empty or unavailable.';
        setGithubStatus('Referenced image asset could not be loaded.');
      }
    }catch(error){
      project.image.assetLoadError=error?.message||'The referenced image asset could not be loaded.';
      setGithubStatus('Referenced image asset could not be loaded.');
    }
    return project;
  }

  async function resolveProjectHakoAssetsFromGithub(project,settings){
    const buildings=Array.isArray(project?.buildings)?project.buildings:[];
    for(const building of buildings){
      const asset=building?.hakoFile;
      if(!asset?.path||hakoFileText(building)) continue;
      setGithubStatus('Loading referenced building file...');
      const file=await readGithubBase64File(settings,asset.path);
      if(file?.contentBase64){
        const text=base64ToText(file.contentBase64);
        let parsed=null;
        try{parsed=JSON.parse(text);}catch(_error){}
        building.hakoFile={...asset,dataText:text,parsedConfig:parsed,unavailable:false};
        if(parsed&&!building.hakoConfig) building.hakoConfig=parsed;
      }else{
        building.hakoFile={...asset,unavailable:true};
      }
    }
    return project;
  }

  async function resolveProjectStlAssetsFromGithub(project,settings){
    const stlObjects=Array.isArray(project?.stlObjects)?project.stlObjects:[];
    for(const object of stlObjects){
      const asset=object?.asset;
      if(asset?.path&&!asset.dataBase64){
        setGithubStatus('Loading referenced STL asset...');
        const file=await readGithubBase64File(settings,asset.path);
        object.asset=file?.contentBase64?{...asset,dataBase64:file.contentBase64}:{...asset,unavailable:true};
      }
      for(const source of (Array.isArray(object.sourceAssets)?object.sourceAssets:[])){
        if(!source?.path||source.dataBase64) continue;
        setGithubStatus('Loading referenced STL source asset...');
        const file=await readGithubBase64File(settings,source.path);
        Object.assign(source,file?.contentBase64?{dataBase64:file.contentBase64,unavailable:false}:{unavailable:true});
      }
    }
    return project;
  }

  return {
    saveGithubImageAsset,
    saveGithubHakoAssets,
    saveGithubStlAssets,
    resolveProjectImageFromGithub,
    resolveProjectHakoAssetsFromGithub,
    resolveProjectStlAssetsFromGithub,
  };
}
