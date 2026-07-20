export function createSiteProjectBundleController({
  windowRef,
  state,
  createPersistenceDiagnostics,
  buildLocalImageBundleAsset,
  buildLocalHakoBundleAssets,
  buildLocalStlBundleAssets,
  cachedImageAsset,
  imageAssetReference,
  imageAssetFileName,
  dataUrlInfo,
  normalizeBuilding,
  hakoFileText,
  uniqueHakoAssetFileName,
  hakoFileAssetReference,
  normalizeStlObject,
  uniqueStlAssetFileName,
  stlAssetReference,
  uniqueStlSourceAssetFileName,
  stlSourceAssetReference,
  projectJson,
  summarizePersistenceAssets,
  cacheImageAsset,
  downloadBlob,
  markManualSaveComplete,
  showStatusHint,
  normalizeLoadedSitePlanPayload,
  loadProject,
  rememberGithubSiteSource,
  githubSiteSourceFromProject,
  findSiteBundleProjectName,
  diagnosticByteLength,
  hydrateSiteBundleAssets,
  dataUrlFromBase64,
}) {
  async function saveSitePlanBundle() {
    if (!windowRef.JSZip) {
      showStatusHint('HakoMachi package support is still loading. Try again in a moment.', 'warning');
      return;
    }
    const diagnostics = createPersistenceDiagnostics('local HakoMachi site package save');
    const bundleImage = buildLocalImageBundleAsset(state, { cachedImageAsset, imageAssetReference, imageAssetFileName, dataUrlInfo });
    const hakoAssets = buildLocalHakoBundleAssets(state.buildings, { normalizeBuilding, hakoFileText, uniqueHakoAssetFileName, hakoFileAssetReference });
    const stlAssets = buildLocalStlBundleAssets(state.stlObjects, { normalizeStlObject, uniqueStlAssetFileName, stlAssetReference, uniqueStlSourceAssetFileName, stlSourceAssetReference });
    const project = projectJson({ includeImageDataUrl: false, imageAsset: bundleImage?.asset || null, hakoAssets, stlAssets });
    const projectText = JSON.stringify(project, null, 2) + '\n';
    diagnostics.mark('assets collected', summarizePersistenceAssets({ imageAsset: bundleImage, hakoAssets, stlAssets, projectText }));
    const zip = new windowRef.JSZip();
    zip.file('hakomachi-site.hako-site.json', projectText);
    if (bundleImage?.asset && bundleImage?.info) {
      if (bundleImage.info.isBase64) zip.file(bundleImage.asset.path, bundleImage.info.data, { base64: true });
      else zip.file(bundleImage.asset.path, decodeURIComponent(bundleImage.info.data));
      cacheImageAsset(bundleImage.asset, bundleImage.dataUrl);
    }
    hakoAssets.forEach(entry => {
      if (entry.asset?.path && entry.text) zip.file(entry.asset.path, entry.text);
    });
    stlAssets.forEach(entry => {
      if (entry.asset?.path && entry.dataBase64) zip.file(entry.asset.path, entry.dataBase64, { base64: true });
    });
    zip.file('manifest.json', JSON.stringify({
      schema: 'hakomachi.site-bundle',
      schemaVersion: 1,
      project: 'hakomachi-site.hako-site.json',
      assets: [...(bundleImage?.asset ? [bundleImage.asset] : []), ...hakoAssets.map(entry => entry.asset), ...stlAssets.map(entry => entry.asset)],
    }, null, 2) + '\n');
    const blob = await diagnostics.measure('generate package blob', () => zip.generateAsync({ type: 'blob' }));
    diagnostics.finish({ status: 'saved', packageBytes: blob.size });
    downloadBlob(blob, 'hakomachi-site.hako-site');
    markManualSaveComplete();
  }

  async function loadProjectJsonObject(project, opts = {}) {
    const normalized = normalizeLoadedSitePlanPayload(project);
    const payload = normalized.payload;
    loadProject(payload, opts);
    if (!opts.fromAutosave && !opts.preserveGithubSource) rememberGithubSiteSource(githubSiteSourceFromProject(payload));
    return payload;
  }

  async function loadSitePlanBundle(file) {
    const diagnostics = createPersistenceDiagnostics('local HakoMachi site package load', { fileName: file?.name, fileBytes: file?.size || 0 });
    if (!windowRef.JSZip) throw new Error('HakoMachi package support is still loading. Try again in a moment.');
    const zip = await diagnostics.measure('read package file', () => windowRef.JSZip.loadAsync(file));
    const projectName = findSiteBundleProjectName(zip);
    if (!projectName) throw new Error('No .hako-site.json project file was found in the package.');
    const projectText = await diagnostics.measure('read project JSON', () => zip.file(projectName).async('string'));
    diagnostics.mark('project JSON received', { projectName, bytes: diagnosticByteLength(projectText) });
    const project = JSON.parse(projectText);
    const normalized = normalizeLoadedSitePlanPayload(project);
    const payload = normalized.payload;
    await diagnostics.measure('hydrate bundled assets', () => hydrateSiteBundleAssets(payload, zip, { dataUrlFromBase64, cacheImageAsset, hakoFileText }));
    diagnostics.mark('payload ready', {
      buildings: (payload.buildings || []).length,
      stlObjects: (payload.stlObjects || []).length,
      manifestAssets: (payload.assetManifest?.assets || []).length,
    });
    loadProject(payload, { fromFile: true });
    rememberGithubSiteSource(githubSiteSourceFromProject(payload));
    diagnostics.finish({ status: 'loaded' });
    return payload;
  }

  return { saveSitePlanBundle, loadProjectJsonObject, loadSitePlanBundle };
}
