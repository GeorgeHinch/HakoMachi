export function createGithubSiteLoadController({
  createPersistenceDiagnostics,
  getGithubSettings,
  requireGithubSettings,
  setGithubStatus,
  readGithubFile,
  diagnosticByteLength,
  isGithubContentsMetadata,
  normalizeLoadedSitePlanPayload,
  resolveProjectImageFromGithub,
  resolveProjectHakoAssetsFromGithub,
  resolveProjectStlAssetsFromGithub,
  loadProject,
  rememberGithubSiteSource,
  closeGithubModal,
  showStatusHint,
}){
  async function loadSitePlanFromGithub(record){
    const diagnostics=createPersistenceDiagnostics('GitHub site load',{path:record?.path,name:record?.name});
    try{
      const settings=getGithubSettings();
      requireGithubSettings(settings);
      setGithubStatus('Loading '+record.path+'...');
      const file=await diagnostics.measure('read site plan JSON',()=>readGithubFile(settings,record.path));
      if(!file) throw new Error('Missing file: '+record.path);
      const text=String(file.text||'');
      diagnostics.mark('site plan JSON received',{bytes:diagnosticByteLength(text)});
      if(!text.trim()) throw new Error('GitHub file is empty or could not be read: '+record.path);
      let project;
      try{
        project=JSON.parse(text);
      }catch(error){
        throw new Error(`Could not parse ${record.path} as JSON (${text.length} bytes): ${error.message||error}`);
      }
      if(isGithubContentsMetadata(project)){
        throw new Error(`GitHub returned file metadata instead of site-plan content for ${record.path}. Refresh the page and try again; if it repeats, the saved file may need to be re-saved from HakoMachi.`);
      }
      const normalized=normalizeLoadedSitePlanPayload(project);
      project=normalized.payload;
      if(normalized.source!=='top-level') setGithubStatus(`Loaded site-plan payload from ${normalized.source}.`);
      await diagnostics.measure('resolve image assets',()=>resolveProjectImageFromGithub(project,settings));
      await diagnostics.measure('resolve building assets',()=>resolveProjectHakoAssetsFromGithub(project,settings));
      await diagnostics.measure('resolve STL assets',()=>resolveProjectStlAssetsFromGithub(project,settings));
      diagnostics.mark('payload ready',{
        buildings:(project.buildings||[]).length,
        stlObjects:(project.stlObjects||[]).length,
        manifestAssets:(project.assetManifest?.assets||[]).length,
      });
      loadProject(project,{fromFile:true});
      diagnostics.finish({status:'loaded'});
      rememberGithubSiteSource({id:record.id,name:record.name,path:record.path});
      closeGithubModal();
    }catch(error){
      diagnostics.finish({status:'failed',error:error?.message||String(error)});
      const message='GitHub load failed: '+(error.message||error);
      setGithubStatus(message);
      showStatusHint(message,'warning');
    }
  }

  return {loadSitePlanFromGithub};
}
