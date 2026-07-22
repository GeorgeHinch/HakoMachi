export function createRoadToolTaskController({
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
}) {
  function bindRoadToolControls() {
    documentRef.querySelectorAll('[data-road-mode-tool]').forEach(btn => {
      btn.onclick = () => {
        state.roadMode = btn.dataset.roadModeTool || 'centerline';
        updateRoadToolButton();
        setWorkspaceMode('road', { preserveRoadTask: true });
        setActiveTool('road');
      };
    });

    documentRef.querySelectorAll('[data-road-action]').forEach(btn => {
      btn.onclick = () => {
        const action = btn.dataset.roadAction;
        setWorkspaceMode('road', { preserveRoadTask: true });
        if (action === 'intersections') {
          state.roadTask = 'intersections';
          state.roadIntersectionDetails = true;
          setActiveTool('select', { preserveRoadTask: true });
          roadSystem.generatedRoadIntersections();
          renderSelected();
          draw();
          setSidebarOpen(true);
          const hint = getElement('statusHint');
          if (hint) hint.textContent = state.selectedRoadId ? 'Intersection controls are open for the selected road.' : 'Select a road to adjust its automatic intersection markings.';
          updateWorkspaceModeUi();
          return;
        }
        if (action === 'exportPreview') {
          state.roadTask = 'exportPreview';
          setRoadExportPreview(!state.roadExportPreview);
          updateWorkspaceModeUi();
          return;
        }
        if (action === 'exportAssets') openRoadExportReview();
      };
    });
  }

  return Object.freeze({ bindRoadToolControls });
}
