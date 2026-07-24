export function createRoadExportUiController({ state, getElement, updateWorkspaceModeUi, draw, setWorkspaceMode, getRoadExportReview }) {
  function updateRoadExportBadge(data) {
    const element = getElement('roadExportBadge');
    if (!element) return;
    if (!state.roadExportPreview) {
      element.style.display = 'none';
      return;
    }
    element.style.display = 'block';
    element.innerHTML = `<b>Road Export Preview</b>${data.roads.length} roads · ${data.seams.length} seam cuts<br><span class="muted">Seams avoid junction bulbs and use benchwork crossings where found.</span>`;
  }

  function setRoadExportPreview(on) {
    state.roadExportPreview = !!on;
    ['roadExportPreviewBtn', 'mobileRoadExportPreviewBtn'].forEach(id => {
      const button = getElement(id);
      if (button) button.textContent = 'Road Export Preview: ' + (state.roadExportPreview ? 'On' : 'Off');
    });
    updateWorkspaceModeUi();
    draw();
  }

  function openRoadExportReview() {
    state.roadTask = 'exportAssets';
    setWorkspaceMode('road', { preserveRoadTask: true });
    updateWorkspaceModeUi();
    getRoadExportReview()?.open();
  }

  return Object.freeze({ updateRoadExportBadge, setRoadExportPreview, openRoadExportReview });
}
