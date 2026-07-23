import { createGithubSiteAssetController } from './github-site-asset-controller.js';
import { createGithubSiteLoadController } from './github-site-load-controller.js';
import { createGithubSiteSaveController } from './github-site-save-controller.js';
import { createGithubLibraryUiController } from './github-library-ui-controller.js';
import { createSiteProjectBundleController } from './site-project-bundle-controller.js';
import { createSiteProjectLoadController } from './site-project-load-controller.js';

export function createSiteProjectWorkflowFacade({
  githubAssets,
  githubSave,
  githubLoad,
  githubLibrary,
  bundle,
  projectLoad,
  activeGithubSiteSource,
}) {
  let projectLoadController = null;

  function ensureProjectLoadController() {
    if (!projectLoadController) projectLoadController = createSiteProjectLoadController(projectLoad);
    return projectLoadController;
  }

  function loadProject(project, options = {}) {
    return ensureProjectLoadController().loadProject(project, options);
  }

  const assets = createGithubSiteAssetController(githubAssets);
  const { saveSitePlanBundle, loadProjectJsonObject, loadSitePlanBundle } = createSiteProjectBundleController({
    ...bundle,
    loadProject,
  });
  const { loadSitePlanFromGithub } = createGithubSiteLoadController({
    ...githubLoad,
    ...assets,
    loadProject,
  });
  const githubLibraryUiController = createGithubLibraryUiController({
    ...githubLibrary,
    loadSitePlanFromGithub,
  });

  function openGithubSettings() {
    return githubLibraryUiController.openGithubSettings();
  }

  function openGithubSitePlans() {
    return githubLibraryUiController.openGithubSitePlans();
  }

  function openGithubBuildings() {
    return githubLibraryUiController.openGithubBuildings();
  }

  const { saveSitePlanToGithub } = createGithubSiteSaveController({
    ...githubSave,
    ...assets,
    openGithubSettings,
  });

  function saveCurrentSitePlan() {
    if (activeGithubSiteSource()) return saveSitePlanToGithub({ reuseCurrent: true });
    return saveSitePlanBundle();
  }

  return Object.freeze({
    loadProject,
    loadProjectJsonObject,
    loadSitePlanBundle,
    openGithubSettings,
    openGithubSitePlans,
    openGithubBuildings,
    saveCurrentSitePlan,
    saveSitePlanToGithub,
  });
}
