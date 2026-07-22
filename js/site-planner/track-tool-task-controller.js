export function createTrackToolTaskController({
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
}) {
  function beginTrackAccessoryPlacement(action) {
    state.trackTask = action;
    state.catenarySectionDraft = null;
    setWorkspaceMode('track', { preserveTrackTask: true });
    setActiveTool('select', { preserveTrackTask: true });
    renderSelected();
    draw();
    setSidebarOpen(!(windowRef.matchMedia && windowRef.matchMedia('(max-width: 700px)').matches));
    const hint = getElement('statusHint');
    if (hint) hint.textContent = `${trackAccessoryLabel(action)} placement is active. Click near track to place a marker.`;
    updateWorkspaceModeUi();
  }

  function beginCatenaryAutoSection() {
    state.trackTask = 'catenaryAutoSection';
    state.catenarySectionDraft = null;
    setWorkspaceMode('track', { preserveTrackTask: true });
    setActiveTool('select', { preserveTrackTask: true });
    renderSelected();
    draw();
    setSidebarOpen(!(windowRef.matchMedia && windowRef.matchMedia('(max-width: 700px)').matches));
    const hint = getElement('statusHint');
    if (hint) hint.textContent = `Auto catenary section is active. Click the start and end points on one track; poles use ${fmt(catenarySpacingModelMm)} mm spacing (${catenaryPrototypeSpacingM} m prototype at Japanese N scale).`;
    updateWorkspaceModeUi();
  }

  function bindTrackActionControls() {
    documentRef.querySelectorAll('[data-track-action]').forEach(btn => {
      btn.onclick = () => {
        const action = btn.dataset.trackAction;
        setWorkspaceMode('track', { preserveTrackTask: true });
        if (action === 'draw') {
          state.trackTask = null;
          setActiveTool('track');
          return;
        }
        if (action === 'edit' || action === 'connect') {
          state.trackTask = action;
          setActiveTool('select', { preserveTrackTask: true });
          renderSelected();
          draw();
          setSidebarOpen(true);
          const hint = getElement('statusHint');
          if (hint) hint.textContent = action === 'connect'
            ? 'Endpoint connection editing is active. Select a track and drag an endpoint near another endpoint to snap them together.'
            : 'Track editing is active. Select a track, then drag points or bend a highlighted segment.';
          updateWorkspaceModeUi();
          return;
        }
        if (isTrackAccessoryAction(action)) {
          beginTrackAccessoryPlacement(action);
          return;
        }
        if (isCatenaryAutoSectionAction(action)) beginCatenaryAutoSection();
      };
    });
  }

  return Object.freeze({
    beginTrackAccessoryPlacement,
    beginCatenaryAutoSection,
    bindTrackActionControls,
  });
}
