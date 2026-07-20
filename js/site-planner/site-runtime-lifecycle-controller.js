export function createSiteRuntimeLifecycleController({
  state,
  windowRef,
  localStorageRef,
  sessionStorageRef,
  autosaveKey,
  autosaveMetaKey,
  buildingUpdateKey,
  logger,
  loadProject,
  writeAutosave,
  sitePlannerBuildingUpdatePayload,
  applySitePlannerBuildingUpdate,
  acknowledgeSitePlannerBuildingUpdate,
  bindSite3DButtons,
  installWholePageHakoDrop,
  installSelectedHakoSidebarDrop,
  resize,
  rememberGithubSiteSource,
  syncAll,
  fitImage,
  resetHistory,
  updateHistoryButtons,
  processQueuedSitePlannerBuildingUpdate,
}) {
  function restoreAutosaveIfAvailable() {
    try {
      const raw = localStorageRef.getItem(autosaveKey);
      if (!raw) return false;
      const metaRaw = localStorageRef.getItem(autosaveMetaKey);
      const meta = metaRaw ? JSON.parse(metaRaw) : {};
      const payload = JSON.parse(raw);
      state.autosaveRestored = true;
      loadProject(payload, { fromAutosave: true, dirtySinceManualSave: !!meta.dirtySinceManualSave });
      return true;
    } catch (err) {
      logger.warn('Could not restore autosave:', err);
      return false;
    }
  }

  function bindWindowLifecycle() {
    windowRef.addEventListener('beforeunload', (event) => {
      if (state.dirty) writeAutosave();
      if (state.dirtySinceManualSave) {
        event.preventDefault();
        event.returnValue = '';
        return '';
      }
    });

    windowRef.addEventListener('message', async (event) => {
      if (event.origin && event.origin !== windowRef.location.origin) return;
      const payload = sitePlannerBuildingUpdatePayload(event.data);
      const result = await applySitePlannerBuildingUpdate(payload);
      if (!result) return;
      try {
        localStorageRef.removeItem(buildingUpdateKey);
        sessionStorageRef.removeItem(buildingUpdateKey);
      } catch (_err) {}
      acknowledgeSitePlannerBuildingUpdate(event.source, event.origin, result);
      if (payload?.returnToSitePlanner) {
        try {
          windowRef.focus();
        } catch (_err) {}
      }
    });

    windowRef.addEventListener('storage', async (event) => {
      if (event.key !== buildingUpdateKey || !event.newValue) return;
      try {
        const payload = JSON.parse(event.newValue);
        if (await applySitePlannerBuildingUpdate(payload)) {
          localStorageRef.removeItem(buildingUpdateKey);
        }
      } catch (err) {
        logger.warn('Could not apply building update from storage:', err);
      }
    });
  }

  function boot() {
    bindSite3DButtons();
    installWholePageHakoDrop();
    installSelectedHakoSidebarDrop();
    resize();
    const restored = restoreAutosaveIfAvailable();
    state.autosaveReady = true;
    if (!restored) {
      rememberGithubSiteSource(null);
      syncAll({ skipDirty: true });
      fitImage();
      resetHistory('initial');
      writeAutosave();
    } else {
      updateHistoryButtons();
    }
    setTimeout(() => {
      processQueuedSitePlannerBuildingUpdate();
    }, 0);
  }

  return { restoreAutosaveIfAvailable, bindWindowLifecycle, boot };
}
