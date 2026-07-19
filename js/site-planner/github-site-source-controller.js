export function createGithubSiteSourceController({
  getCurrentGithubSite,
  setCurrentGithubSite,
  getElement,
  slug,
  githubProjectName,
}){
  function githubSiteSourceFromProject(project){
    const cloud=project?.hakomachiCloud;
    if(!cloud||cloud.kind!=='sitePlan'||!cloud.path) return null;
    return {
      id:cloud.id||slug(cloud.name||project.projectName||'site-plan'),
      name:cloud.name||project.projectName||githubProjectName(project),
      path:cloud.path,
    };
  }

  function activeGithubSiteSource(){
    const current=getCurrentGithubSite();
    if(!current?.path||!current?.id||!current?.name) return null;
    return current;
  }

  function updatePrimarySaveUi(){
    const source=activeGithubSiteSource();
    const label=source?'Save to GitHub':'Save .hako-site';
    const title=source
      ?`Save changes back to ${source.path}`
      :'Download the current site plan as a .hako-site package.';
    ['saveBtn','mobileSaveBtn'].forEach(id=>{
      const button=getElement(id);
      if(!button) return;
      button.textContent=label;
      button.title=title;
      button.dataset.saveSource=source?'github':'local-package';
    });
  }

  function rememberGithubSiteSource(source){
    setCurrentGithubSite(source||null);
    updatePrimarySaveUi();
  }

  return {
    activeGithubSiteSource,
    githubSiteSourceFromProject,
    rememberGithubSiteSource,
    updatePrimarySaveUi,
  };
}
