export function createSitePageControlsController({
  state,
  getElement,
  installTooltips,
  installReferenceImageImport,
  draw,
  modelKnownMm,
  dist,
  showStatusHint,
  confirmFn,
  syncAll,
  renderSelected,
  markDirty,
  fitImage,
  clearCacheAndReset,
  openGithubSettings,
  openGithubSitePlans,
  openGithubBuildings,
  saveCurrentSitePlan,
  saveSitePlanToGithub,
  undo,
  redo,
  deleteSelectedAnnotation,
  isLikelyStlFile,
  importStlAsSiteObject,
  openImportProgressModal,
  isSiteBundlePackageFile,
  setImportProgress,
  loadSitePlanBundle,
  loadProjectJsonObject,
  finishImportProgress,
  failImportProgress,
  setRoadExportPreview,
  openRoadExportReview,
  downloadText,
  csvExport,
  svgExport,
  exportSelectedSeed,
  updatePrimarySaveUi,
}) {
  const element = id => getElement(id);
  const bindClick = (id, handler) => {
    const control = element(id);
    if (control) control.onclick = handler;
  };

  function bindReferenceImageControls() {
    installTooltips();
    installReferenceImageImport();
    const opacity = element('opacity');
    if (opacity) opacity.oninput = e => {
      state.imageOpacity = parseFloat(e.target.value);
      if (state.imageMeta) state.imageMeta.opacity = state.imageOpacity;
      draw();
    };
    bindClick('imageLockBtn', () => {
      state.imageLocked = !state.imageLocked;
      const lockButton = element('imageLockBtn');
      lockButton.textContent = state.imageLocked ? 'Locked' : 'Unlocked';
    });
    bindClick('applyScaleBtn', () => {
      const line = state.lastCalibrationLine || state.calibrationLine;
      if (!line) return showStatusHint('Draw a calibration line first.', 'warning');
      const known = modelKnownMm();
      const length = dist({ x: line.x1, y: line.y1 }, { x: line.x2, y: line.y2 });
      if (known <= 0 || length <= 0) return showStatusHint('Calibration length must be greater than zero.', 'warning');
      const nextPxPerMm = length / known;
      if (state.pxPerMm && Math.abs(state.pxPerMm - nextPxPerMm) > 1e-9) {
        const accepted = confirmFn('Change calibration?\n\nThis will update all real millimeter values derived from the image, including building dimensions, road widths, sidewalk widths, streetlight sizes, and exported coordinates. Pixel positions on the image will stay in place, but measured values will change.');
        if (!accepted) return;
      }
      state.pxPerMm = nextPxPerMm;
      state.calibrationLine = line;
      syncAll();
    });
    bindClick('clearScaleBtn', () => {
      if (state.pxPerMm && !confirmFn('Clear calibration?\n\nThis will remove calibrated millimeter measurements until you recalibrate. Existing image-space geometry will remain in place.')) return;
      state.pxPerMm = null;
      syncAll();
    });
  }

  function bindProjectControls() {
    const inputMode = element('inputMode');
    if (inputMode) inputMode.onchange = e => { state.inputMode = e.target.value; draw(); };
    bindClick('snapBtn', () => {
      state.snapOn = !state.snapOn;
      const snapButton = element('snapBtn');
      snapButton.classList.toggle('active', state.snapOn);
      snapButton.textContent = state.snapOn ? 'Snap: On' : 'Snap: Off';
      draw();
    });
    bindClick('deleteAnnotationBtn', deleteSelectedAnnotation);
    bindClick('clearAnnotationsBtn', () => {
      if (state.annotations.length && !confirmFn('Clear all freehand annotation notes?')) return;
      state.annotations = [];
      state.selectedAnnotationId = null;
      renderSelected();
      draw();
      markDirty('annotations cleared');
    });
    bindClick('fitBtn', () => { fitImage(); markDirty('view changed', { history: false }); });
    bindClick('resetBtn', () => { state.view = { x: 40, y: 40, scale: 1 }; draw(); markDirty('view changed', { history: false }); });
    bindClick('clearCacheBtn', clearCacheAndReset);
    bindClick('clearCachePanelBtn', clearCacheAndReset);

    bindClick('githubSettingsBtn', openGithubSettings);
    bindClick('githubSaveBtn', () => saveSitePlanToGithub({ reuseCurrent: true }));
    bindClick('githubLoadBtn', openGithubSitePlans);
    bindClick('githubBuildingsBtn', openGithubBuildings);
    bindClick('mobileGithubSettingsBtn', openGithubSettings);
    bindClick('mobileGithubSaveBtn', () => saveSitePlanToGithub({ reuseCurrent: true }));
    bindClick('mobileGithubLoadBtn', openGithubSitePlans);
    bindClick('mobileGithubBuildingsBtn', openGithubBuildings);
    bindClick('saveBtn', saveCurrentSitePlan);
    bindClick('mobileSaveBtn', saveCurrentSitePlan);
    bindClick('undoBtn', undo);
    bindClick('redoBtn', redo);
    bindClick('mobileUndoBtn', undo);
    bindClick('mobileRedoBtn', redo);

    const loadFile = element('loadFile');
    if (loadFile) loadFile.addEventListener('change', async e => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (isLikelyStlFile(file)) {
        await importStlAsSiteObject(file);
        e.target.value = '';
        return;
      }
      openImportProgressModal('Import site plan', 'Reading file...', `Reading ${file.name || 'site plan file'}.`);
      try {
        const isPackage = isSiteBundlePackageFile(file);
        setImportProgress(2, 4, 'Validating site plan...', 'Checking the project JSON and save format.');
        if (isPackage) {
          setImportProgress(3, 4, 'Applying package...', 'Restoring the site plan and bundled reference image assets.');
          await loadSitePlanBundle(file);
        } else {
          const text = await file.text();
          const project = JSON.parse(text);
          setImportProgress(3, 4, 'Applying site plan...', 'Restoring the canvas, image metadata, and placed objects.');
          await loadProjectJsonObject(project, { fromFile: true });
        }
        finishImportProgress('Site plan imported.', `${file.name || 'Project file'} has been loaded.`);
      } catch (err) {
        failImportProgress('Could not load project.', err.message);
      }
      e.target.value = '';
    });

    bindClick('roadExportPreviewBtn', () => setRoadExportPreview(!state.roadExportPreview));
    bindClick('mobileRoadExportPreviewBtn', () => setRoadExportPreview(!state.roadExportPreview));
    bindClick('roadAssetSvgBtn', openRoadExportReview);
    bindClick('mobileRoadAssetSvgBtn', openRoadExportReview);
    bindClick('csvBtn', () => downloadText(csvExport(), 'hakomachi-building-pads.csv', 'text/csv'));
    bindClick('svgBtn', () => downloadText(svgExport(), 'hakomachi-site.svg', 'image/svg+xml'));
    bindClick('seedBtn', exportSelectedSeed);
    bindClick('mobileCsvBtn', () => downloadText(csvExport(), 'hakomachi-building-pads.csv', 'text/csv'));
    bindClick('mobileSeedBtn', exportSelectedSeed);
    updatePrimarySaveUi();
  }

  function bindPageControls() {
    bindReferenceImageControls();
    bindProjectControls();
  }

  return Object.freeze({ bindPageControls });
}
