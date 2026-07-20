export function createGithubLibraryUiController({
  getElement,
  getGithubSettings,
  setGithubSettings,
  requireGithubSettings,
  openGithubModal,
  closeGithubModal,
  setGithubStatus,
  loadGithubLibrary,
  normalizeGithubLibrary,
  escapeAttr,
  escapeHtml,
  windowRef,
  documentRef,
  loadSitePlanFromGithub,
  armGithubBuildingPlacement,
  renderGithubBuildingStill,
  githubBuildingPreviewConfig,
  upgradeGithubBuildingPreviewFromHako,
  promptFn,
}) {
  function openGithubSettings() {
    const settings = getGithubSettings();
    openGithubModal('GitHub data repository', `
      <div class="field"><label>Private data repo</label><input id="gdRepo" value="${escapeAttr(settings.repoFullName)}" placeholder="GeorgeHinch/hakomachi_savedata"><div class="small">Use owner/repo. The repo can be private.</div></div>
      <div class="field"><label>Branch</label><input id="gdBranch" value="${escapeAttr(settings.branch)}"></div>
      <div class="field"><label>Fine-grained token</label><input id="gdToken" type="password" value="${escapeAttr(settings.token)}"><div class="small">Stored only in this browser. Needs Contents read/write on the data repo.</div></div>
      <div class="field"><label>Footprint library path</label><input id="gdLibrary" value="${escapeAttr(settings.libraryPath)}"></div>
      <div class="field"><label>Site plan files directory</label><input id="gdSites" value="${escapeAttr(settings.sitePlansDir)}"></div>
    `, [
      {
        label: 'Save settings',
        cls: 'primary',
        onClick: () => {
          setGithubSettings({
            repoFullName: getElement('gdRepo').value,
            branch: getElement('gdBranch').value,
            token: getElement('gdToken').value,
            libraryPath: getElement('gdLibrary').value,
            sitePlansDir: getElement('gdSites').value,
          });
          setGithubStatus('Settings saved.');
        },
      },
      { label: 'Datastore guide', onClick: () => windowRef.open('docs/github-datastore.md', '_blank', 'noopener') },
      { label: 'Close', onClick: closeGithubModal },
    ]);
  }

  async function openGithubSitePlans() {
    try {
      const settings = getGithubSettings();
      try {
        requireGithubSettings(settings);
      } catch (err) {
        openGithubSettings();
        setGithubStatus(err.message);
        return;
      }
      openGithubModal('GitHub site plans', '<div class="small">Loading...</div>', [{ label: 'Close', onClick: closeGithubModal }]);
      const library = await loadGithubLibrary(settings);
      const records = normalizeGithubLibrary(library).records.sitePlans;
      const body = getElement('githubDataBody');
      if (!records.length) {
        body.innerHTML = '<div class="small">No saved site plans yet.</div>';
        return;
      }
      body.innerHTML = '<div class="small">Choose a saved site plan from the shared HakoMachi library.</div>';
      records.forEach((record) => {
        const row = documentRef.createElement('div');
        row.className = 'githubDataRecord';
        const summary = record.summary || {};
        row.innerHTML = `<div><b>${escapeHtml(record.name || record.id)}</b><small>${escapeHtml(record.path || '')}</small><small>${summary.buildings || 0} buildings / ${summary.roads || 0} roads / ${summary.tracks || 0} tracks / ${escapeHtml(record.updatedAt || '')}</small></div>`;
        const button = documentRef.createElement('button');
        button.type = 'button';
        button.textContent = 'Load';
        button.onclick = () => loadSitePlanFromGithub(record);
        row.appendChild(button);
        body.appendChild(row);
      });
    } catch (err) {
      openGithubModal('GitHub site plans', `<div class="warning">${escapeHtml(err.message || err)}</div>`, [{ label: 'Close', onClick: closeGithubModal }]);
    }
  }

  async function openGithubBuildings() {
    try {
      const settings = getGithubSettings();
      try {
        requireGithubSettings(settings);
      } catch (err) {
        openGithubSettings();
        setGithubStatus(err.message);
        return;
      }
      openGithubModal('GitHub building footprints', '<div class="small">Loading...</div>', [{ label: 'Close', onClick: closeGithubModal }]);
      const library = await loadGithubLibrary(settings);
      const records = normalizeGithubLibrary(library).records.buildings;
      const body = getElement('githubDataBody');
      if (!records.length) {
        body.innerHTML = '<div class="small">No saved building footprints yet.</div>';
        return;
      }
      body.innerHTML = '<div class="small">Shared footprint records with generated 3D still previews. Cards load from the saved .hako file when available.</div>';
      records.forEach((record) => {
        const footprint = record.footprint || {};
        const path = record.path || record.paths?.hako || '';
        const row = documentRef.createElement('div');
        row.className = 'githubDataRecord githubBuildingRecord';
        const preview = documentRef.createElement('div');
        preview.className = 'githubBuildingPreview';
        preview.textContent = 'Rendering preview...';
        const info = documentRef.createElement('div');
        info.className = 'githubBuildingInfo';
        info.innerHTML = `<b>${escapeHtml(record.name || record.id)}</b><small>${escapeHtml(path)}</small><small>${Number(footprint.widthMm || 0).toFixed(1)} x ${Number(footprint.depthMm || 0).toFixed(1)} mm</small>`;
        const actions = documentRef.createElement('div');
        actions.className = 'githubBuildingActions';
        const placeButton = documentRef.createElement('button');
        placeButton.type = 'button';
        placeButton.textContent = 'Place';
        placeButton.onclick = () => armGithubBuildingPlacement(record);
        const button = documentRef.createElement('button');
        button.type = 'button';
        button.textContent = 'Copy path';
        button.onclick = () => promptFn('Building .hako path', path);
        actions.appendChild(placeButton);
        actions.appendChild(button);
        row.appendChild(preview);
        row.appendChild(info);
        row.appendChild(actions);
        body.appendChild(row);
        renderGithubBuildingStill(preview, githubBuildingPreviewConfig(record), record.name || record.id || '3D building preview');
        upgradeGithubBuildingPreviewFromHako(settings, record, preview);
      });
    } catch (err) {
      openGithubModal('GitHub building footprints', `<div class="warning">${escapeHtml(err.message || err)}</div>`, [{ label: 'Close', onClick: closeGithubModal }]);
    }
  }

  return { openGithubSettings, openGithubSitePlans, openGithubBuildings };
}
