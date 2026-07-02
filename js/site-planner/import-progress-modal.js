export function createImportProgressController() {
  let closeTimer = null;
  let lastFocus = null;

  const $ = id => document.getElementById(id);

  function ensureImportProgressModal() {
    let modal = $('hakoImportProgressModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'hakoImportProgressModal';
    modal.className = 'hakoProgressModal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'hakoImportProgressTitle');
    modal.innerHTML = `
      <div class="hakoProgressCard" tabindex="-1">
        <h2 id="hakoImportProgressTitle">Import file</h2>
        <div id="hakoImportProgress" class="hakoProgress" role="progressbar" aria-label="Import progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <div class="hakoProgressTrack"><div id="hakoImportProgressFill" class="hakoProgressFill"></div></div>
          <div class="hakoProgressSummary"><b id="hakoImportProgressLabel">Preparing import...</b><span id="hakoImportProgressPercent">0%</span></div>
          <div id="hakoImportProgressDetail" class="hakoProgressDetail" aria-live="polite">Waiting for the selected file.</div>
        </div>
        <div class="hakoProgressActions"><button type="button" id="hakoImportProgressClose">Close</button></div>
      </div>`;
    const close = () => closeImportProgressModal();
    modal.addEventListener('click', ev => { if (ev.target === modal && modal.dataset.locked !== 'true') close(); });
    modal.querySelector('#hakoImportProgressClose')?.addEventListener('click', close);
    document.addEventListener('keydown', ev => {
      if (ev.key === 'Escape' && modal.classList.contains('open') && modal.dataset.locked !== 'true') close();
    });
    document.body.appendChild(modal);
    return modal;
  }

  function openImportProgressModal(title = 'Import file', label = 'Preparing import...', detail = 'Waiting for the selected file.') {
    const modal = ensureImportProgressModal();
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    lastFocus = document.activeElement;
    modal.dataset.locked = 'true';
    $('hakoImportProgressTitle').textContent = title;
    $('hakoImportProgressClose').style.display = 'none';
    modal.classList.add('open');
    setImportProgress(0, 4, label, detail);
    modal.querySelector('.hakoProgressCard')?.focus?.();
    return modal;
  }

  function setImportProgress(step, total, label, detail) {
    const safeTotal = Math.max(1, total || 1);
    const pct = Math.max(0, Math.min(100, Math.round((Math.max(0, step || 0) / safeTotal) * 100)));
    const progress = $('hakoImportProgress');
    if (progress) progress.setAttribute('aria-valuenow', String(pct));
    if ($('hakoImportProgressFill')) $('hakoImportProgressFill').style.width = pct + '%';
    if ($('hakoImportProgressPercent')) $('hakoImportProgressPercent').textContent = pct + '%';
    if ($('hakoImportProgressLabel')) $('hakoImportProgressLabel').textContent = label || 'Working...';
    if ($('hakoImportProgressDetail')) $('hakoImportProgressDetail').textContent = detail || '';
  }

  function closeImportProgressModal() {
    const modal = $('hakoImportProgressModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.dataset.locked = 'false';
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    lastFocus?.focus?.();
    lastFocus = null;
  }

  function finishImportProgress(label, detail, delay = 900) {
    const modal = ensureImportProgressModal();
    modal.dataset.locked = 'false';
    setImportProgress(4, 4, label || 'Import complete.', detail || 'The file has been applied.');
    $('hakoImportProgressClose').style.display = '';
    closeTimer = setTimeout(closeImportProgressModal, delay);
  }

  function failImportProgress(label, detail) {
    const modal = ensureImportProgressModal();
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    modal.dataset.locked = 'false';
    modal.classList.add('open');
    setImportProgress(0, 4, label || 'Import failed.', detail || 'Check the file and try again.');
    $('hakoImportProgressClose').style.display = '';
  }

  return {
    openImportProgressModal,
    setImportProgress,
    closeImportProgressModal,
    finishImportProgress,
    failImportProgress,
  };
}
