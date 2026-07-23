export function createSiteToolControlsController({
  state,
  documentRef,
  windowRef,
  getElement,
  createWorkspaceModeController,
  createRoadToolTaskController,
  createTrackToolTaskController,
  createToolVariantController,
  finishRoadCenterline,
  finishRoadOutline,
  finishTrack,
  hideToolFlyouts,
  updateStatus,
  draw,
  syncAll,
  roadSystem,
  renderSelected,
  setSidebarOpen,
  setRoadExportPreview,
  openRoadExportReview,
  trackAccessoryLabel,
  isTrackAccessoryAction,
  isCatenaryAutoSectionAction,
  fmt,
  catenarySpacingModelMm,
  catenaryPrototypeSpacingM,
  setIcon,
  hydrateIcons,
  toggleToolFlyout,
}) {
  let updateRoadToolButton = () => {};
  let updateTrackSwitchToolButton = () => {};
  let updateTrackBufferToolButton = () => {};
  let updateCatenaryToolButton = () => {};
  let updateStreetlightToolButton = () => {};
  const {
    setActiveTool,
    setWorkspaceMode,
    updateWorkspaceModeUi,
  } = createWorkspaceModeController({
    state,
    getElement,
    finishRoadCenterline,
    finishRoadOutline,
    finishTrack,
    hideToolFlyouts,
    updateToolButtons: {
      updateTrackSwitchToolButton: () => updateTrackSwitchToolButton(),
      updateTrackBufferToolButton: () => updateTrackBufferToolButton(),
      updateCatenaryToolButton: () => updateCatenaryToolButton(),
    },
    updateStatus,
    draw,
    syncAll,
  });

  documentRef.querySelectorAll('.toolbtn[data-tool]:not([data-road-mode-tool]):not([data-track-action])')
    .forEach(button => { button.onclick = () => setActiveTool(button.dataset.tool); });
  getElement('workspaceMode')?.addEventListener('change', e => setWorkspaceMode(e.target.value));

  const roadToolTaskController = createRoadToolTaskController({
    state,
    documentRef,
    getElement,
    setWorkspaceMode,
    setActiveTool,
    updateRoadToolButton,
    roadSystem,
    renderSelected,
    draw,
    setSidebarOpen,
    updateWorkspaceModeUi,
    setRoadExportPreview,
    openRoadExportReview,
  });
  roadToolTaskController.bindRoadToolControls();

  const trackToolTaskController = createTrackToolTaskController({
    state,
    documentRef,
    windowRef,
    getElement,
    setWorkspaceMode,
    setActiveTool,
    renderSelected,
    draw,
    setSidebarOpen,
    updateWorkspaceModeUi,
    trackAccessoryLabel,
    isTrackAccessoryAction,
    isCatenaryAutoSectionAction,
    fmt,
    catenarySpacingModelMm,
    catenaryPrototypeSpacingM,
  });
  const { beginTrackAccessoryPlacement, beginCatenaryAutoSection } = trackToolTaskController;
  trackToolTaskController.bindTrackActionControls();

  const toolVariantController = createToolVariantController({
    state,
    getElement,
    setIcon,
    hydrateIcons,
    toggleToolFlyout,
    hideToolFlyouts,
    setActiveTool,
    beginTrackAccessoryPlacement,
    beginCatenaryAutoSection,
    isCatenaryAutoSectionAction,
    updateWorkspaceModeUi,
  });
  ({
    updateRoadToolButton,
    updateStreetlightToolButton,
    updateTrackSwitchToolButton,
    updateTrackBufferToolButton,
    updateCatenaryToolButton,
  } = toolVariantController);
  toolVariantController.installToolVariantControls();
  return Object.freeze({ setActiveTool, setWorkspaceMode, updateWorkspaceModeUi });
}
