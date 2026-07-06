import * as githubData from '../shared/github-data.js';
import { CLADDING_STYLES } from '../building-generator/data/cladding-styles.js';
import { MaterialRegistry } from '../building-generator/core/material-registry.js';
import { addRoadDetailMaterialsToLibrary, roadDetailMaterialSummary } from '../site-planner/road-material-profile-defaults.js';

window.HakoMachiGithubDataShared = githubData;

function initMaterialManager() {
  const $ = id => document.getElementById(id);
  const HANDOFF_KEY = 'hakomachi_material_profile_handoff_v1';

  let currentProfile = MaterialRegistry.normalizeStoredProfile({
    id: 'default-materials',
    name: 'Default materials',
    library: MaterialRegistry.profilePayload(null, { id: 'default-materials', name: 'Default materials' }),
  });
  let githubRecords = [];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
    }[c]));
  }

  function slug(s) {
    const githubData = window.HakoMachiGithubDataShared;
    return githubData
      ? githubData.slugify(s, 'material-profile')
      : String(s || 'material-profile').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'material-profile';
  }

  function status(text, kind) {
    const el = $('status');
    el.textContent = text || '';
    el.className = 'status small ' + (kind === 'err' ? 'warning' : kind === 'ok' ? 'okText' : '');
  }

  function library() {
    currentProfile.library.name = $('profileName').value.trim() || currentProfile.name || 'Material profile';
    currentProfile.name = currentProfile.library.name;
    currentProfile.library.id = currentProfile.id;
    return currentProfile.library;
  }

  function setCurrentProfile(profile) {
    currentProfile = MaterialRegistry.normalizeStoredProfile(profile);
    render();
  }

  function materialOptions(selectedId) {
    return (currentProfile.library.materials || [])
      .map(m => `<option value="${esc(m.id)}"${m.id === selectedId ? ' selected' : ''}>${esc(m.name || m.id)}</option>`)
      .join('');
  }

  function displaySize(mat, key) {
    const v = Number(mat[key]) || 304.8;
    return mat.sizeUnit === 'in'
      ? (v / 25.4).toFixed(3).replace(/\.?0+$/, '')
      : v.toFixed(1).replace(/\.0$/, '');
  }

  function parseSize(value, unit) {
    const n = parseFloat(value);
    if (!isFinite(n) || n <= 0) return null;
    return unit === 'in' ? n * 25.4 : n;
  }

  function renderProfileSelect() {
    const profiles = MaterialRegistry.loadLocalProfiles();
    $('profileSelect').innerHTML = profiles.length
      ? profiles.map(p => `<option value="${esc(p.id)}"${p.id === currentProfile.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('')
      : '<option value="">No saved browser profiles</option>';
  }

  function renderMaterials() {
    const mats = currentProfile.library.materials || [];
    $('materialsList').innerHTML = mats.map((m, i) => `
      <article class="material-card" data-index="${i}">
        <div class="material-head">
          <div class="field"><label>Color</label><input class="swatch-block" data-field="colour" type="color" value="${esc(m.colour || '#aaaaaa')}"></div>
          <div class="field"><label>Name</label><input data-field="name" value="${esc(m.name || '')}"></div>
          <div class="field"><label>Material ID</label><input data-field="id" value="${esc(m.id || '')}"></div>
          <button class="danger secondary" data-action="delete-material" type="button">Delete</button>
        </div>
        <div class="material-grid">
          <div class="field"><label>Thickness mm</label><input data-field="thickness" type="number" min="0" step="0.01" value="${esc(m.thickness == null ? '' : m.thickness)}"></div>
          <div class="field"><label>Sheet width</label><input data-field="maxWidth" type="number" min="0.1" step="${m.sizeUnit === 'in' ? '0.125' : '1'}" value="${esc(displaySize(m, 'maxWidthMm'))}"></div>
          <div class="field"><label>Sheet height</label><input data-field="maxHeight" type="number" min="0.1" step="${m.sizeUnit === 'in' ? '0.125' : '1'}" value="${esc(displaySize(m, 'maxHeightMm'))}"></div>
          <div class="field"><label>Unit</label><select data-field="sizeUnit"><option value="mm"${m.sizeUnit !== 'in' ? ' selected' : ''}>mm</option><option value="in"${m.sizeUnit === 'in' ? ' selected' : ''}>in</option></select></div>
          <div class="field"><label>In stock</label><input data-field="stockQty" type="number" min="0" step="1" value="${esc(m.stockQty == null ? '' : m.stockQty)}"></div>
          <div class="field"><label>Stock unit</label><input data-field="stockUnit" placeholder="sheets" value="${esc(m.stockUnit || '')}"></div>
          <div class="field material-notes"><label>Notes</label><textarea data-field="notes" rows="2">${esc(m.notes || '')}</textarea></div>
        </div>
      </article>`).join('');
  }

  function renderCladdingRoutes() {
    const mats = currentProfile.library.materials || [];
    if (!mats.length) {
      $('claddingRoutes').innerHTML = '<div class="small">Add at least one material before assigning cladding styles.</div>';
      return;
    }
    const routes = currentProfile.library.claddingMaterials || {};
    $('claddingRoutes').innerHTML = Object.entries(CLADDING_STYLES).map(([key, spec]) => {
      const selected = routes[key] || 'cladding';
      return `<label class="cladding-row" data-style="${esc(key)}"><span><b>${esc(spec.label || key)}</b><span class="small">${esc(key)}</span></span><select data-cladding="${esc(key)}"><option value="">Default cladding</option>${materialOptions(selected)}</select></label>`;
    }).join('');
  }

  function renderSummary() {
    const mats = currentProfile.library.materials || [];
    const core = mats.find(m => m.id === 'core');
    const clad = mats.find(m => m.id === 'cladding');
    const routed = Object.keys(currentProfile.library.claddingMaterials || {}).length;
    const stock = mats.reduce((sum, m) => sum + (Number(m.stockQty) || 0), 0);
    const roadSummary = roadDetailMaterialSummary(currentProfile.library);
    const roadProfileCount = roadSummary.filter(row => row.status === 'profile').length;
    const roadMissingCount = Math.max(0, roadSummary.length - roadProfileCount);
    $('summary').innerHTML = [
      ['Materials', mats.length],
      ['Core thickness', core && core.thickness ? core.thickness + ' mm' : 'Fallback 1.5 mm'],
      ['Cladding thickness', clad && clad.thickness ? clad.thickness + ' mm' : 'Fallback 0.28 mm'],
      ['Cladding routes', routed],
      ['Stock entries', stock ? stock + ' total' : 'Not counted'],
      ['Road detail materials', roadMissingCount ? `${roadProfileCount}/${roadSummary.length} assigned` : 'Ready'],
    ].map(row => `<div class="summary-card"><b>${esc(row[0])}</b><span class="small">${esc(row[1])}</span></div>`).join('');
  }

  function renderGithubRecords() {
    $('githubRecords').innerHTML = githubRecords.length
      ? githubRecords.map((r, i) => `<div class="github-record"><div><b>${esc(r.name || r.id)}</b><div class="small">${esc(r.path || '')}</div></div><button class="secondary" data-github-index="${i}" type="button">Load</button></div>`).join('')
      : '';
  }

  function renderGithubSettings() {
    const githubData = window.HakoMachiGithubDataShared;
    const s = githubData.getSettings();
    $('githubRepo').value = s.repoFullName || '';
    $('githubBranch').value = s.branch || 'main';
    $('githubToken').value = s.token || '';
    $('githubLibraryPath').value = s.libraryPath || githubData.DEFAULT_LIBRARY_PATH;
    $('githubMaterialsDir').value = s.materialsDir || githubData.DEFAULT_MATERIALS_DIR || 'materials';
  }

  function render() {
    $('profileName').value = currentProfile.name || '';
    renderProfileSelect();
    renderMaterials();
    renderCladdingRoutes();
    renderSummary();
    renderGithubRecords();
  }

  function saveBrowserProfile() {
    const name = $('profileName').value.trim() || currentProfile.name || 'Material profile';
    if (!currentProfile.id || currentProfile.id === 'default-materials') currentProfile.id = slug(name);
    const saved = MaterialRegistry.upsertLocalProfile({
      id: currentProfile.id,
      name,
      library: library(),
      github: currentProfile.github,
    });
    setCurrentProfile(saved);
    status('Saved browser profile: ' + saved.name, 'ok');
    return saved;
  }

  function download(name, mime, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: mime }));
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 1000);
  }

  function bindMaterialList() {
    $('materialsList').addEventListener('input', event => {
      const card = event.target.closest('.material-card');
      if (!card) return;
      const mat = currentProfile.library.materials[Number(card.dataset.index)];
      const field = event.target.dataset.field;
      if (!mat || !field) return;

      if (field === 'id') {
        const oldId = mat.id;
        mat.id = event.target.value.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || oldId;
        if (oldId !== mat.id) {
          for (const [style, materialId] of Object.entries(currentProfile.library.claddingMaterials || {})) {
            if (materialId === oldId) currentProfile.library.claddingMaterials[style] = mat.id;
          }
        }
      } else if (field === 'maxWidth' || field === 'maxHeight') {
        const parsed = parseSize(event.target.value, mat.sizeUnit === 'in' ? 'in' : 'mm');
        if (parsed != null) mat[field === 'maxWidth' ? 'maxWidthMm' : 'maxHeightMm'] = parsed;
      } else if (field === 'thickness' || field === 'stockQty') {
        const parsed = parseFloat(event.target.value);
        if (isFinite(parsed) && parsed >= 0) mat[field] = parsed;
        else delete mat[field];
      } else {
        mat[field] = event.target.value;
      }

      renderSummary();
      if (field === 'id' || field === 'name') renderCladdingRoutes();
    });

    $('materialsList').addEventListener('change', event => {
      const card = event.target.closest('.material-card');
      if (!card) return;
      const mat = currentProfile.library.materials[Number(card.dataset.index)];
      if (!mat) return;
      if (event.target.dataset.field === 'sizeUnit') {
        mat.sizeUnit = event.target.value === 'in' ? 'in' : 'mm';
        renderMaterials();
      }
    });

    $('materialsList').addEventListener('click', event => {
      const btn = event.target.closest('[data-action="delete-material"]');
      if (!btn) return;
      const card = btn.closest('.material-card');
      const i = Number(card.dataset.index);
      const mat = currentProfile.library.materials[i];
      if (!mat) return;
      currentProfile.library.materials.splice(i, 1);
      for (const [style, matId] of Object.entries(currentProfile.library.claddingMaterials || {})) {
        if (matId === mat.id) delete currentProfile.library.claddingMaterials[style];
      }
      render();
    });
  }

  function bindStaticControls() {
    $('claddingRoutes').addEventListener('change', event => {
      const style = event.target.dataset.cladding;
      if (!style) return;
      if (!currentProfile.library.claddingMaterials) currentProfile.library.claddingMaterials = {};
      if (event.target.value) currentProfile.library.claddingMaterials[style] = event.target.value;
      else delete currentProfile.library.claddingMaterials[style];
      renderSummary();
    });

    $('addMaterialBtn').addEventListener('click', () => {
      currentProfile.library.materials.push({
        id: 'mat_' + Date.now(),
        name: 'New material',
        colour: '#a8c880',
        thickness: 0.5,
        maxWidthMm: 304.8,
        maxHeightMm: 304.8,
        sizeUnit: 'mm',
        stockQty: 1,
        stockUnit: 'sheets',
      });
      render();
    });

    $('addRoadDetailsBtn').addEventListener('click', () => {
      const result = addRoadDetailMaterialsToLibrary(currentProfile.library);
      render();
      status(result.added.length ? `Added ${result.added.length} road detail materials.` : 'Road detail materials are already present.', 'ok');
    });

    $('newProfileBtn').addEventListener('click', () => {
      const name = prompt('New material profile name', 'My materials');
      if (!name) return;
      setCurrentProfile({
        id: slug(name),
        name,
        library: MaterialRegistry.profilePayload(null, { id: slug(name), name }),
      });
      status('Started new profile.', 'ok');
    });

    $('saveProfileBtn').addEventListener('click', saveBrowserProfile);
    $('loadProfileBtn').addEventListener('click', () => {
      const profile = MaterialRegistry.loadLocalProfiles().find(p => p.id === $('profileSelect').value);
      if (profile) {
        setCurrentProfile(profile);
        status('Loaded browser profile: ' + profile.name, 'ok');
      }
    });

    $('deleteProfileBtn').addEventListener('click', () => {
      if (!currentProfile.id || !confirm('Delete this browser material profile?')) return;
      MaterialRegistry.deleteLocalProfile(currentProfile.id);
      const profiles = MaterialRegistry.loadLocalProfiles();
      setCurrentProfile(profiles[0] || {
        id: 'default-materials',
        name: 'Default materials',
        library: MaterialRegistry.profilePayload(null, { id: 'default-materials', name: 'Default materials' }),
      });
      status('Deleted browser profile.', 'ok');
    });

    $('useInGeneratorBtn').addEventListener('click', () => {
      const saved = saveBrowserProfile();
      localStorage.setItem(HANDOFF_KEY, JSON.stringify(saved));
      status('Profile queued for the building generator.', 'ok');
      window.open('../building-generator.html#materialProfile=' + encodeURIComponent(saved.id), '_blank');
    });

    $('exportBtn').addEventListener('click', () => {
      const lib = MaterialRegistry.normalizeProfilePayload(library());
      download((slug(lib.name) || 'material-profile') + '.hakomaterial', 'application/json', JSON.stringify(lib, null, 2) + '\n');
      status('Exported material profile.', 'ok');
    });

    $('importBtn').addEventListener('click', () => $('importFile').click());
    $('importFile').addEventListener('change', event => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const parsed = JSON.parse(e.target.result);
          const profile = MaterialRegistry.normalizeStoredProfile(parsed);
          setCurrentProfile(profile);
          status('Imported material profile: ' + profile.name, 'ok');
        } catch (err) {
          status('Import failed: ' + (err.message || err), 'err');
        }
      };
      reader.onerror = () => status('File read error.', 'err');
      reader.readAsText(file);
      event.target.value = '';
    });
  }

  function bindGithubControls() {
    $('saveGithubSettingsBtn').addEventListener('click', () => {
      const githubData = window.HakoMachiGithubDataShared;
      githubData.saveSettings({
        repoFullName: $('githubRepo').value,
        branch: $('githubBranch').value,
        token: $('githubToken').value,
        libraryPath: $('githubLibraryPath').value,
        materialsDir: $('githubMaterialsDir').value,
      });
      status('GitHub data settings saved in this browser.', 'ok');
    });

    $('saveGithubBtn').addEventListener('click', async () => {
      try {
        const saved = saveBrowserProfile();
        status('Saving profile to GitHub...');
        const cloud = await MaterialRegistry.saveProfileToGithub(saved);
        setCurrentProfile(cloud);
        status('Saved profile to GitHub: ' + cloud.github.path, 'ok');
      } catch (err) {
        status('GitHub save failed: ' + (err.message || err), 'err');
      }
    });

    $('loadGithubBtn').addEventListener('click', async () => {
      try {
        status('Loading GitHub material profiles...');
        githubRecords = await MaterialRegistry.loadGithubProfileRecords();
        renderGithubRecords();
        status(githubRecords.length ? 'Loaded GitHub profile index.' : 'No GitHub material profiles found.', 'ok');
      } catch (err) {
        status('GitHub load failed: ' + (err.message || err), 'err');
      }
    });

    $('githubRecords').addEventListener('click', async event => {
      const btn = event.target.closest('[data-github-index]');
      if (!btn) return;
      try {
        status('Reading GitHub material profile...');
        const profile = await MaterialRegistry.readGithubProfile(githubRecords[Number(btn.dataset.githubIndex)]);
        MaterialRegistry.upsertLocalProfile(profile);
        setCurrentProfile(profile);
        status('Loaded GitHub profile: ' + profile.name, 'ok');
      } catch (err) {
        status('GitHub profile read failed: ' + (err.message || err), 'err');
      }
    });
  }

  function init() {
    bindMaterialList();
    bindStaticControls();
    bindGithubControls();
    renderGithubSettings();
    const profiles = MaterialRegistry.loadLocalProfiles();
    if (profiles[0]) currentProfile = profiles[0];
    render();
  }

  init();
}

initMaterialManager();
