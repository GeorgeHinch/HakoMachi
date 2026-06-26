'use strict';

/* Building Generator config persistence, .hako import/export, and handoff imports. */

/* Persistent storage — uses browser localStorage so it works in any browser, 
   not just the artifact sandbox. */
const STORAGE_KEY = 'n_scale_building_generator_config';

function savePreset() {
  try {
    upgradeConfigToCurrentStorage(CONFIG);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializableCurrentConfig(CONFIG)));
    flashMessage('Preset saved to browser cache.', 'ok');
  } catch (e) {
    flashMessage('Save failed: ' + e.message, 'err');
  }
}

function loadPreset() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      const warnings = applyLoadedConfig(data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializableCurrentConfig(CONFIG)));
      writeForm();
      regenerate();
      if (warnings.length) {
        flashMessage('Loaded with warnings: ' + warnings.join(' '), 'warn');
      } else {
        flashMessage('Preset loaded from browser cache.', 'ok');
      }
    } else {
      flashMessage('No saved preset found.', 'warn');
    }
  } catch (e) {
    flashMessage('Load failed: ' + e.message, 'err');
  }
}

function clearPreset() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    flashMessage('Browser cache cleared.', 'ok');
  } catch (e) {
    flashMessage('Clear failed: ' + e.message, 'err');
  }
}

/* Export current config as a downloadable .hako file (JSON inside) */
function exportConfigFile() {
  readForm();
  upgradeConfigToCurrentStorage(CONFIG);
  const json = JSON.stringify(serializableCurrentConfig(CONFIG), null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const typeName = CONFIG.buildingType || 'building';
  a.download = `building_${typeName}_${CONFIG.width}x${CONFIG.depth}x${CONFIG.height}.hako`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  flashMessage('Settings file downloaded.', 'ok');
}

/* Import a .hako (or legacy .json) settings file picked by the user.
   Both are JSON internally — same payload, different extension. */
function importConfigFile(file) {
  if (!file) return;
  const name = (file.name || '').toLowerCase();
  const looksLikeConfig = /\.(hako|hakoseed|hakoplan|json)$/i.test(name) || file.type === 'application/json' || file.type === '';
  if (!looksLikeConfig) {
    flashMessage('Drop a .hako, .hakoseed, .hakoplan, or .json settings/seed file.', 'warn');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      const warnings = applyLoadedConfig(data);
      writeForm();
      regenerate();
      if (warnings.length) {
        flashMessage('Imported with warnings: ' + warnings.join(' '), 'warn');
      } else {
        flashMessage('Settings imported from file.', 'ok');
      }
    } catch (err) {
      flashMessage('Import failed: ' + err.message, 'err');
    }
  };
  reader.onerror = () => flashMessage('File read error.', 'err');
  reader.readAsText(file);
}


function decodeHakoPayloadString(raw) {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  const attempts = [s];
  try { attempts.push(decodeURIComponent(s)); } catch (e) {}

  for (const a of attempts.slice()) {
    const dataMatch = String(a).match(/^data:application\/json[^,]*,(.*)$/i);
    if (dataMatch) attempts.push(dataMatch[1]);
    if (/^[A-Za-z0-9_\-+/=]+$/.test(a) && a.length > 8) {
      try {
        let b64 = a.replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        attempts.push(atob(b64));
      } catch (e) {}
    }
  }
  for (const candidate of attempts) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (e) {}
  }
  return null;
}

function importHakoPayloadObject(payload, sourceLabel = 'payload') {
  try {
    if (!payload || typeof payload !== 'object') throw new Error('Payload is not an object.');
    const type = String(payload.type || payload.action || payload.event || '').toLowerCase();
    let data = payload;
    if (payload.buildingSeed && typeof payload.buildingSeed === 'object') data = payload.buildingSeed;
    else if (payload.selectedBuildingSeed && typeof payload.selectedBuildingSeed === 'object') data = payload.selectedBuildingSeed;
    else if (payload.hakoSeed && typeof payload.hakoSeed === 'object') data = payload.hakoSeed;
    else if (payload.hakoseed && typeof payload.hakoseed === 'object') data = payload.hakoseed;
    else if (payload.hakoMachiSeed && typeof payload.hakoMachiSeed === 'object') data = payload.hakoMachiSeed;
    else if (payload.sitePlanSeed && typeof payload.sitePlanSeed === 'object') data = payload.sitePlanSeed;
    else if (payload.payload && typeof payload.payload === 'object' && (type.includes('hako') || type.includes('open') || type.includes('building'))) data = payload.payload;
    else if (payload.data && typeof payload.data === 'object' && (type.includes('hako') || type.includes('open') || type.includes('building'))) data = payload.data;

    const warnings = applyLoadedConfig(data);
    writeForm();
    regenerate();
    flashMessage(warnings.length ? `Imported ${sourceLabel} with warnings: ${warnings.join(' ')}` : `Imported ${sourceLabel}.`, warnings.length ? 'warn' : 'ok');
    return true;
  } catch (err) {
    flashMessage(`Import failed from ${sourceLabel}: ${err.message}`, 'err');
    return false;
  }
}

function importHakoPayloadString(raw, sourceLabel = 'URL payload') {
  const data = decodeHakoPayloadString(raw);
  if (!data) return false;
  return importHakoPayloadObject(data, sourceLabel);
}

function setupHakoSiteSeedReceivers() {
  window.addEventListener('message', (e) => {
    const d = e && e.data;
    if (!d || typeof d !== 'object') return;
    const type = String(d.type || d.action || d.event || '').toLowerCase();
    const hasPayload = !!(d.buildingSeed || d.selectedBuildingSeed || d.hakoSeed || d.hakoseed || d.hakoMachiSeed || d.sitePlanSeed || d.payload || d.data);
    const looksOpen = type.includes('hakomachi') || type.includes('hako') || type.includes('open') || type.includes('buildingseed');
    if (!hasPayload && !looksOpen && !isLikelyHakoMachiSitePlanSeed(d)) return;
    importHakoPayloadObject(d, 'site planner message');
  });

  const keys = ['buildingSeed','selectedBuildingSeed','hakoSeed','hakoseed','hakoMachiSeed','sitePlanSeed','payload','data','config'];
  const tryParams = (params, source) => {
    for (const k of keys) {
      const v = params.get(k);
      if (v && importHakoPayloadString(v, source + ' ' + k)) return true;
    }
    return false;
  };

  try {
    const q = new URLSearchParams(window.location.search || '');
    if (tryParams(q, 'URL query')) return;
  } catch (e) {}

  try {
    const hash = (window.location.hash || '').replace(/^#/, '');
    if (hash) {
      if (hash === 'sitePlannerSeed' || hash === 'hakomachiSitePlannerSeed') {
        const raw = localStorage.getItem('hakomachiSitePlannerSeed') || sessionStorage.getItem('hakomachiSitePlannerSeed');
        if (raw && importHakoPayloadString(raw, 'Site Planner localStorage handoff')) {
          localStorage.removeItem('hakomachiSitePlannerSeed');
          sessionStorage.removeItem('hakomachiSitePlannerSeed');
          return;
        }
      }
      if (hash.trim().startsWith('{') || /^[A-Za-z0-9_\-+/=]+$/.test(hash.trim())) {
        if (importHakoPayloadString(hash, 'URL hash')) return;
      }
      const hp = new URLSearchParams(hash);
      if (tryParams(hp, 'URL hash')) return;
    }
  } catch (e) {}

  for (const store of [sessionStorage, localStorage]) {
    try {
      const raw = store.getItem('hakomachiSitePlannerSeed')
               || store.getItem('hakomachi_open_payload')
               || store.getItem('hakomachi_building_seed');
      if (raw && importHakoPayloadString(raw, store === sessionStorage ? 'sessionStorage handoff' : 'localStorage handoff')) {
        store.removeItem('hakomachiSitePlannerSeed');
        store.removeItem('hakomachi_open_payload');
        store.removeItem('hakomachi_building_seed');
        return;
      }
    } catch (e) {}
  }
}



function setupHakoDragDropImport() {
  const dropZone = document.getElementById('previewDropZone') || document.querySelector('.preview');
  const overlay = document.getElementById('hakoDropOverlay');
  if (!dropZone || !overlay) return;

  let dragDepth = 0;
  const hasConfigFile = (dt) => {
    if (!dt) return false;
    const items = Array.from(dt.items || []);
    if (items.length) {
      return items.some(item => item.kind === 'file');
    }
    const files = Array.from(dt.files || []);
    return files.length > 0;
  };

  const show = () => {
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
  };
  const hide = () => {
    dragDepth = 0;
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
  };

  ['dragenter', 'dragover'].forEach(type => {
    dropZone.addEventListener(type, (e) => {
      if (!hasConfigFile(e.dataTransfer)) return;
      e.preventDefault();
      e.stopPropagation();
      if (type === 'dragenter') dragDepth++;
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      show();
    });
  });

  dropZone.addEventListener('dragleave', (e) => {
    if (!hasConfigFile(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) hide();
  });

  dropZone.addEventListener('drop', (e) => {
    if (!hasConfigFile(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files || []);
    hide();
    const file = files.find(f => /\.(hako|hakoseed|hakoplan|json)$/i.test(f.name || '')) || files[0];
    if (!file) return;
    importConfigFile(file);
  });

  // Prevent the browser from navigating away if the user misses the preview
  // panel by a few pixels while dropping a .hako file.
  window.addEventListener('dragover', (e) => {
    if (hasConfigFile(e.dataTransfer)) e.preventDefault();
  });
  window.addEventListener('drop', (e) => {
    if (!hasConfigFile(e.dataTransfer)) return;
    if (dropZone.contains(e.target)) return;
    e.preventDefault();
    hide();
    const files = Array.from(e.dataTransfer.files || []);
    const file = files.find(f => /\.(hako|hakoseed|hakoplan|json)$/i.test(f.name || ''));
    if (file) importConfigFile(file);
    else flashMessage('Drop a .hako, .hakoseed, .hakoplan, or .json file to import.', 'warn');
  });
}

/* Try to auto-load a saved preset on startup. Silent if none exists. */
function tryAutoLoadPreset() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      applyLoadedConfig(data);
      // Rewrite the cache once in the current storage format so future loads
      // no longer carry legacy manual* buckets.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializableCurrentConfig(CONFIG)));
      return true;
    }
  } catch (e) {
    // Ignore — fall back to defaults
  }
  return false;
}
