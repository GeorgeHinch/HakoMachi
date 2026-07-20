export function createGithubSiteSaveController({
  defaultSiteDir,
  createPersistenceDiagnostics,
  getGithubSettings,
  requireGithubSettings,
  openGithubSettings,
  setGithubStatus,
  getCurrentGithubSite,
  projectJson,
  githubProjectName,
  prompt,
  openGithubSaveProgressModal,
  setGithubProgress,
  slug,
  cleanRepoPath,
  saveGithubImageAsset,
  saveGithubHakoAssets,
  saveGithubStlAssets,
  summarizePersistenceAssets,
  githubSiteAssetFolderPath,
  diagnosticByteLength,
  writeGithubFile,
  loadGithubLibrary,
  upsertGithubSitePlan,
  githubSiteRecord,
  rememberGithubSiteSource,
  markManualSaveComplete,
  closeGithubModal,
  setTimeoutFn=setTimeout,
}){
  async function saveSitePlanToGithub(options={}){
    const diagnostics=createPersistenceDiagnostics('GitHub site save');
    try{
      const settings=getGithubSettings();
      try{requireGithubSettings(settings);}catch(error){openGithubSettings();setGithubStatus(error.message);return;}
      const current=getCurrentGithubSite();
      const projectForName=projectJson({includeImageDataUrl:false});
      const defaultName=current?.name||githubProjectName(projectForName);
      const reuseCurrent=!!(options.reuseCurrent&&current?.id&&current?.name&&current?.path);
      const name=reuseCurrent?current.name:prompt('Site plan name for GitHub save',defaultName);
      if(!name) return;
      openGithubSaveProgressModal();
      setGithubProgress(1,8,'Preparing project...',reuseCurrent?`Saving back to ${current.path}.`:'Finalizing the site plan name and GitHub file path.');
      const id=reuseCurrent?current.id:((current&&current.name===defaultName&&current.id)?current.id:slug(name));
      const path=reuseCurrent?current.path:((current&&current.name===defaultName&&current.path)?current.path:cleanRepoPath(`${settings.sitePlansDir}/${id}.hako-site.json`));
      diagnostics.mark('save target selected',{name,path});
      const imageAsset=await diagnostics.measure('write image asset',()=>saveGithubImageAsset(settings,id,name));
      if(!imageAsset) setGithubProgress(2,8,'No reference image asset to write.','The site plan does not currently use a background image.');
      const hakoAssets=await diagnostics.measure('write building assets',()=>saveGithubHakoAssets(settings,id,name));
      const stlAssets=await diagnostics.measure('write STL assets',()=>saveGithubStlAssets(settings,id,name));
      const project=projectJson({includeImageDataUrl:false,imageAsset,hakoAssets,stlAssets});
      const payloadText=JSON.stringify(project,null,2)+'\n';
      diagnostics.mark('site plan payload serialized',{
        ...summarizePersistenceAssets({imageAsset:imageAsset?{asset:imageAsset}:null,hakoAssets,stlAssets,projectText:payloadText}),
      });
      project.projectName=name;
      project.hakomachiCloud={
        schema:'hakomachi.cloud-ref',
        schemaVersion:1,
        kind:'sitePlan',
        id,
        name,
        path,
        assetFolder:githubSiteAssetFolderPath(settings,defaultSiteDir,id),
        savedAt:new Date().toISOString(),
      };
      setGithubProgress(5,8,'Writing site plan file...','Saving the current plan JSON with references to separate assets.');
      const projectText=JSON.stringify(project,null,2)+'\n';
      diagnostics.mark('cloud metadata attached',{projectBytes:diagnosticByteLength(projectText)});
      await diagnostics.measure('write site plan JSON',()=>writeGithubFile(settings,path,projectText,`Save HakoMachi site plan: ${name}`),{bytes:diagnosticByteLength(projectText)});
      setGithubProgress(6,8,'Updating library index...','Loading the shared index so this plan appears in GitHub lists.');
      const library=await diagnostics.measure('load library index',()=>loadGithubLibrary(settings));
      upsertGithubSitePlan(library,githubSiteRecord(id,name,path,project));
      setGithubProgress(7,8,'Writing library index...','Saving the updated site plan list.');
      const libraryText=JSON.stringify(library,null,2)+'\n';
      await diagnostics.measure('write library index',()=>writeGithubFile(settings,settings.libraryPath,libraryText,`Update HakoMachi site plan library: ${name}`),{bytes:diagnosticByteLength(libraryText)});
      rememberGithubSiteSource({id,name,path});
      markManualSaveComplete();
      setGithubProgress(8,8,'Save complete.','Saved '+path);
      diagnostics.finish({status:'saved',name,path});
      setTimeoutFn(()=>closeGithubModal(),900);
    }catch(error){
      diagnostics.finish({status:'failed',error:error?.message||String(error)});
      setGithubProgress(0,8,'GitHub save failed.',String(error.message||error));
    }
  }

  return {saveSitePlanToGithub};
}
