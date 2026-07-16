export function normalizeWorkspaceMode(mode) {
  return mode === 'road' || mode === 'track' ? mode : 'layout';
}

export function createWorkspaceModeController({
  state,
  getElement,
  doc = document,
  finishRoadCenterline,
  finishRoadOutline,
  finishTrack,
  hideToolFlyouts,
  updateToolButtons,
  updateStatus,
  draw,
  syncAll,
}) {
  const $ = getElement;

  function maybeFinishActiveRoadDraft(nextTool) {
    if (state.tool !== 'road' || nextTool === 'road' || !Array.isArray(state.roadDraft) || state.roadDraft.length === 0) return;
    if (state.roadMode === 'outline') {
      if (state.roadDraft.length >= 3) finishRoadOutline();
      else state.roadDraft = [];
    } else {
      if (state.roadDraft.length >= 2) finishRoadCenterline();
      else state.roadDraft = [];
    }
  }

  function maybeFinishActiveTrackDraft(nextTool) {
    if (state.tool !== 'track' || nextTool === 'track' || !Array.isArray(state.trackDraft) || state.trackDraft.length === 0) return;
    if (state.trackDraft.length >= 2) finishTrack();
    else {
      state.trackDraft = [];
      state.trackDraftConnections = [];
      state.trackDraftExtension = null;
    }
  }

  function updateWorkspaceModeUi() {
    const mode = normalizeWorkspaceMode(state.workspaceMode);
    state.workspaceMode = mode;
    const app = doc.querySelector('.sitePlannerApp');
    if (app) {
      app.classList.toggle('roadWorkspace', mode === 'road');
      app.classList.toggle('trackWorkspace', mode === 'track');
    }
    const picker = $('workspaceMode');
    if (picker && picker.value !== mode) picker.value = mode;
    doc.querySelectorAll('[data-road-mode-tool]').forEach(btn => {
      btn.classList.toggle('active', mode === 'road' && state.tool === 'road' && state.roadMode === btn.dataset.roadModeTool);
    });
    doc.querySelectorAll('[data-road-action]').forEach(btn => {
      const action = btn.dataset.roadAction;
      const active = (action === 'intersections' && mode === 'road' && state.roadTask === 'intersections')
        || (action === 'exportPreview' && state.roadExportPreview);
      btn.classList.toggle('active', active);
      btn.classList.toggle('roadActionActive', active && action === 'exportPreview');
    });
    doc.querySelectorAll('[data-track-action]').forEach(btn => {
      const action = btn.dataset.trackAction;
      const active = (action === 'draw' && mode === 'track' && state.tool === 'track' && !state.trackTask)
        || (mode === 'track' && state.trackTask === action);
      btn.classList.toggle('active', active);
    });
    updateToolButtons.updateTrackSwitchToolButton();
    updateToolButtons.updateTrackBufferToolButton();
    updateToolButtons.updateCatenaryToolButton();
    const previewBtn = $('roadCutPreviewModeBtn');
    if (previewBtn) {
      const label = 'Cut preview ' + (state.roadExportPreview ? 'on' : 'off');
      previewBtn.title = label;
      previewBtn.setAttribute('aria-label', label);
    }
  }

  function setWorkspaceMode(mode, opts = {}) {
    state.workspaceMode = normalizeWorkspaceMode(mode);
    if (state.workspaceMode === 'road' && !['select', 'pan', 'road'].includes(state.tool)) {
      setActiveTool('select', { preserveRoadTask: true });
    } else if (state.workspaceMode === 'track' && !['select', 'pan', 'track'].includes(state.tool)) {
      setActiveTool('select', { preserveTrackTask: true });
    } else if (!opts.preserveRoadTask && state.workspaceMode !== 'road') {
      state.roadTask = null;
    }
    if (!opts.preserveTrackTask && state.workspaceMode !== 'track') {
      state.trackTask = null;
      state.catenarySectionDraft = null;
    }
    updateWorkspaceModeUi();
    updateStatus();
    draw();
  }

  function setActiveTool(tool, opts = {}) {
    if (!tool) return;
    maybeFinishActiveRoadDraft(tool);
    maybeFinishActiveTrackDraft(tool);
    state.tool = tool;
    if (!opts.preserveRoadTask) state.roadTask = null;
    if (!opts.preserveTrackTask) {
      state.trackTask = null;
      state.catenarySectionDraft = null;
    }
    doc.querySelectorAll('.toolbtn').forEach(btn => {
      if (btn.dataset.roadModeTool || btn.dataset.roadAction || btn.dataset.trackAction) return;
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });
    state.drag = null;
    hideToolFlyouts();
    updateWorkspaceModeUi();
    syncAll();
  }

  return {
    setActiveTool,
    setWorkspaceMode,
    updateWorkspaceModeUi,
  };
}
