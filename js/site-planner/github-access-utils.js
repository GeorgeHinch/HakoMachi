export function createGithubDataAccess(githubData, currentSiteKey, storage=globalThis.localStorage){
  function getGithubSettings(){
    return githubData.getSettings();
  }

  function setGithubSettings(next){
    githubData.saveSettings(next);
  }

  function getCurrentGithubSite(){
    try{return JSON.parse(storage.getItem(currentSiteKey)||'null')||null;}catch(_err){return null;}
  }

  function setCurrentGithubSite(value){
    storage.setItem(currentSiteKey, JSON.stringify(value));
  }

  function requireGithubSettings(settings){
    githubData.assertSettings(settings);
  }

  async function readGithubFile(settings, path){
    return githubData.readGithubFile(settings, path);
  }

  async function writeGithubFile(settings, path, text, message){
    return githubData.writeGithubFile(settings, path, text, message);
  }

  async function readGithubBase64File(settings, path){
    return githubData.readGithubBase64File(settings, path);
  }

  async function writeGithubBase64File(settings, path, contentBase64, message){
    return githubData.writeGithubBase64File(settings, path, contentBase64, message);
  }

  async function loadGithubLibrary(settings){
    return githubData.loadLibrary(settings);
  }

  return {
    getGithubSettings,
    setGithubSettings,
    getCurrentGithubSite,
    setCurrentGithubSite,
    requireGithubSettings,
    readGithubFile,
    writeGithubFile,
    readGithubBase64File,
    writeGithubBase64File,
    loadGithubLibrary,
  };
}
