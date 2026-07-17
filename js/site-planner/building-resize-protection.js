function cloneSitePlannerValue(value) {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

function buildingHasProtectedWork(b) {
  if (!b) return false;
  if (b.hakoFile || b.completedHakoFile || b.hakoFileId || b.hakoConfig || b.linkedHakoConfig) return true;
  if (b.githubLibraryRecord || b.hakomachiHandoff || b.sitePlannerHandoff) return true;
  if (b.hakoSeed && Object.keys(b.hakoSeed).length) return true;
  return !!(b.state && b.state !== 'notStarted');
}

function buildingFootprintChanged(before, after) {
  if (!before || !after) return false;
  if (before.padType !== after.padType) return true;
  if (before.padType === 'rect') {
    const bw = Number(before.widthPx) || 0;
    const bd = Number(before.depthPx) || 0;
    const aw = Number(after.widthPx) || 0;
    const ad = Number(after.depthPx) || 0;
    return Math.abs(bw - aw) > .01 || Math.abs(bd - ad) > .01;
  }
  const a = Array.isArray(before.pointsPx) ? before.pointsPx : [];
  const b = Array.isArray(after.pointsPx) ? after.pointsPx : [];
  if (a.length !== b.length) return true;
  return a.some((p, i) => Math.abs((Number(p.x) || 0) - (Number(b[i].x) || 0)) > .01 || Math.abs((Number(p.y) || 0) - (Number(b[i].y) || 0)) > .01);
}

function formatFootprintSize(size, fmt) {
  return size && Number(size.widthMm) > 0 && Number(size.depthMm) > 0
    ? `${fmt(size.widthMm)} x ${fmt(size.depthMm)} mm`
    : 'unknown size';
}

export function createBuildingResizeProtectionController({
  document,
  escapeHtml,
  fmt,
  showStatusHint,
  buildingStateLabel,
  normalizeBuilding,
  syncBuildingMetrics,
}) {
  function buildingResizeProtectionSummary(b) {
    if (b?.hakoFile?.fileName) return `attached file ${b.hakoFile.fileName}`;
    if (b?.hakoFileId) return `linked file ${b.hakoFileId}`;
    if (b?.githubLibraryRecord?.path) return `GitHub library file ${b.githubLibraryRecord.path}`;
    if (b?.hakoConfig || b?.linkedHakoConfig) return 'existing generated building settings';
    if (b?.hakoSeed) return 'existing generated building seed';
    if (b?.state && b.state !== 'notStarted') return `status ${buildingStateLabel(b.state)}`;
    return 'existing building work';
  }

  function restoreBuildingSnapshot(target, snapshot) {
    if (!target || !snapshot) return;
    Object.keys(target).forEach(key => delete target[key]);
    Object.assign(target, cloneSitePlannerValue(snapshot));
    normalizeBuilding(target);
    syncBuildingMetrics(target);
  }

  function ensureBuildingResizeConfirmModal() {
    let modal = document.getElementById('buildingResizeConfirmModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'buildingResizeConfirmModal';
    modal.className = 'hakoProgressModal buildingResizeConfirmModal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'buildingResizeConfirmTitle');
    modal.innerHTML = `
      <div class="hakoProgressCard buildingResizeConfirmCard" tabindex="-1">
        <h2 id="buildingResizeConfirmTitle">Replace building geometry?</h2>
        <p id="buildingResizeConfirmSummary" class="buildingResizeConfirmSummary"></p>
        <div id="buildingResizeConfirmDetails" class="buildingResizeConfirmDetails"></div>
        <div class="githubDataActions buildingResizeConfirmActions">
          <button type="button" id="buildingResizeCancel">Cancel</button>
          <button type="button" id="buildingResizeReplace" class="primary">Replace</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    return modal;
  }

  function showBuildingResizeConfirmModal({ title, summary, detailsHtml }) {
    const modal = ensureBuildingResizeConfirmModal();
    const card = modal.querySelector('.buildingResizeConfirmCard');
    const titleEl = modal.querySelector('#buildingResizeConfirmTitle');
    const summaryEl = modal.querySelector('#buildingResizeConfirmSummary');
    const detailsEl = modal.querySelector('#buildingResizeConfirmDetails');
    const cancelBtn = modal.querySelector('#buildingResizeCancel');
    const replaceBtn = modal.querySelector('#buildingResizeReplace');
    if (titleEl) titleEl.textContent = title || 'Replace building geometry?';
    if (summaryEl) summaryEl.textContent = summary || '';
    if (detailsEl) detailsEl.innerHTML = detailsHtml || '';
    modal.classList.add('open');
    return new Promise(resolve => {
      let settled = false;
      const cleanup = value => {
        if (settled) return;
        settled = true;
        modal.classList.remove('open');
        cancelBtn?.removeEventListener('click', onCancel);
        replaceBtn?.removeEventListener('click', onReplace);
        modal.removeEventListener('click', onOverlay);
        document.removeEventListener('keydown', onKey);
        resolve(value);
      };
      const onCancel = () => cleanup(false);
      const onReplace = () => cleanup(true);
      const onOverlay = ev => { if (ev.target === modal) cleanup(false); };
      const onKey = ev => { if (ev.key === 'Escape') cleanup(false); };
      cancelBtn?.addEventListener('click', onCancel);
      replaceBtn?.addEventListener('click', onReplace);
      modal.addEventListener('click', onOverlay);
      document.addEventListener('keydown', onKey);
      setTimeout(() => replaceBtn?.focus?.() || card?.focus?.(), 0);
    });
  }

  async function confirmProtectedBuildingResize(b, opts = {}) {
    if (!buildingHasProtectedWork(b)) return true;
    if (opts.before && opts.after && !buildingFootprintChanged(opts.before, opts.after)) return true;
    const currentText = opts.currentSize ? formatFootprintSize(opts.currentSize, fmt) : null;
    const incomingText = opts.incomingSize ? formatFootprintSize(opts.incomingSize, fmt) : null;
    let detailsHtml = '';
    if (currentText && incomingText) {
      detailsHtml += `<dl><div><dt>Current footprint</dt><dd>${escapeHtml(currentText)}</dd></div><div><dt>New footprint</dt><dd>${escapeHtml(incomingText)}</dd></div></dl>`;
    }
    if (opts.fileName) detailsHtml += `<div class="small muted">File to replace: ${escapeHtml(opts.fileName)}</div>`;
    const ok = await showBuildingResizeConfirmModal({
      title: `Resize ${b.name || 'building'}?`,
      summary: `This building has ${buildingResizeProtectionSummary(b)}. Replacing will update the existing file or generated geometry for this footprint.`,
      detailsHtml,
    });
    if (!ok) showStatusHint(`Resize canceled for ${b.name || 'building'}.`, 'warning');
    return ok;
  }

  return {
    buildingFootprintChanged,
    cloneSitePlannerValue,
    confirmProtectedBuildingResize,
    restoreBuildingSnapshot,
  };
}
