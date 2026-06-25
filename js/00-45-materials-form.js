'use strict';

/* ===================================================================
   MATERIALS FORM
   =================================================================== */

/** Return a safe folder name from any string */
function sanitiseFolderName(str) {
  return (str || 'misc').trim().replace(/[/\\:*?"<>|]/g, '_').replace(/\s+/g, '_') || 'misc';
}

/** Look up (or create) a material entry by id */
function getMaterial(id) {
  return MaterialRegistry.get(id, CONFIG);
}

function materialLibraryPayload() {
  return {
    type: 'hakomachi_material_library',
    version: 1,
    exportedAt: new Date().toISOString(),
    materials: JSON.parse(JSON.stringify(CONFIG.materials || [])),
    claddingMaterials: JSON.parse(JSON.stringify(CONFIG.claddingMaterials || {})),
  };
}

function normaliseImportedMaterialLibrary(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('File is not a material library JSON object.');
  }

  // Accept either the explicit library wrapper or a raw object with the two
  // relevant fields. This makes hand-edited libraries easy to recover.
  const materials = Array.isArray(data.materials) ? data.materials : null;
  if (!materials || materials.length === 0) {
    throw new Error('Material library has no materials array.');
  }

  const used = new Set();
  const cleanMaterials = materials.map((m, idx) => {
    if (!m || typeof m !== 'object') throw new Error(`Material ${idx + 1} is invalid.`);
    let id = String(m.id || '').trim();
    if (!id) id = 'mat_' + Date.now() + '_' + idx;
    id = id.replace(/[^a-zA-Z0-9_-]/g, '_');
    if (used.has(id)) {
      let n = 2;
      const base = id;
      while (used.has(`${base}_${n}`)) n++;
      id = `${base}_${n}`;
    }
    used.add(id);

    const out = {
      id,
      name: String(m.name || id).trim() || id,
    };

    const thickness = parseFloat(m.thickness);
    if (isFinite(thickness) && thickness > 0) out.thickness = thickness;

    const maxWidthMm = parseFloat(m.maxWidthMm != null ? m.maxWidthMm : m.maxW);
    const maxHeightMm = parseFloat(m.maxHeightMm != null ? m.maxHeightMm : m.maxH);
    out.maxWidthMm = isFinite(maxWidthMm) && maxWidthMm > 0 ? maxWidthMm : 304.8;
    out.maxHeightMm = isFinite(maxHeightMm) && maxHeightMm > 0 ? maxHeightMm : 304.8;

    out.sizeUnit = m.sizeUnit === 'in' ? 'in' : 'mm';
    out.colour = normaliseHexColour(m.colour || m.color, '#aaaaaa');

    return out;
  });

  const validIds = new Set(cleanMaterials.map(m => m.id));
  const cleanCladdingMaterials = {};
  const incomingCladding = (data.claddingMaterials && typeof data.claddingMaterials === 'object')
    ? data.claddingMaterials
    : {};
  for (const [styleKey, matId] of Object.entries(incomingCladding)) {
    if (CLADDING_STYLES[styleKey] && validIds.has(matId)) {
      cleanCladdingMaterials[styleKey] = matId;
    }
  }

  return { materials: cleanMaterials, claddingMaterials: cleanCladdingMaterials };
}

function applyMaterialLibrary(library) {
  CONFIG.materials = library.materials;
  CONFIG.claddingMaterials = library.claddingMaterials || {};

  // Keep derived legacy thickness fields synchronized with the material
  // registry so old generation paths and newer registry paths agree.
  CONFIG.coreThickness     = (CONFIG.materials.find(m => m.id === 'core')    ?.thickness) || CONFIG.coreThickness || 1.5;
  CONFIG.claddingThickness = (CONFIG.materials.find(m => m.id === 'cladding')?.thickness) || CONFIG.claddingThickness || 0.28;

  // Remove per-part overrides that reference materials no longer present in
  // the imported library. This avoids invisible "orphan" material folders.
  const validIds = new Set(CONFIG.materials.map(m => m.id));
  if (CONFIG.partMaterials) {
    for (const [partId, matId] of Object.entries(CONFIG.partMaterials)) {
      if (matId !== '__unassigned__' && !validIds.has(matId)) {
        CONFIG.partMaterials[partId] = '__unassigned__';
      }
    }
  }

  renderMaterialsForm();
  if (lastParts) renderPartsOutput(lastParts);
  regenerate();
}

function exportMaterialLibrary() {
  const payload = materialLibraryPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `hakomachi_material_library_${new Date().toISOString().slice(0, 10)}.hakomaterial`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  flashMessage('Material library downloaded.', 'ok');
}

function importMaterialLibraryFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      const library = normaliseImportedMaterialLibrary(data);
      applyMaterialLibrary(library);
      flashMessage(`Imported ${library.materials.length} material${library.materials.length === 1 ? '' : 's'}.`, 'ok');
    } catch (err) {
      flashMessage('Material library import failed: ' + err.message, 'err');
    }
  };
  reader.onerror = () => flashMessage('Material library file read error.', 'err');
  reader.readAsText(file);
}

function openMaterialLibraryImportPicker() {
  let input = document.getElementById('materialLibraryImportFile');
  if (!input) {
    input = document.createElement('input');
    input.type = 'file';
    input.id = 'materialLibraryImportFile';
    input.accept = '.hakomaterial,.json,application/json';
    input.style.display = 'none';
    input.addEventListener('change', e => {
      const f = e.target.files && e.target.files[0];
      if (f) importMaterialLibraryFile(f);
      input.value = '';
    });
    document.body.appendChild(input);
  }
  input.click();
}

function initMaterialsForm() {
  renderMaterialsForm();
}

function renderMaterialsForm() {
  const container = document.getElementById('materialsFormContent');
  if (!container) return;
  container.innerHTML = '';

  const PALETTE = ['#c8b89a','#8ec2a0','#9abcda','#e0a870','#c09ac0','#a8c880','#d09090','#90b8d0'];

  // ---- Material library import/export ----
  const libraryRow = document.createElement('div');
  libraryRow.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:0 0 8px 0;';
  const exportLibBtn = document.createElement('button');
  exportLibBtn.type = 'button';
  exportLibBtn.textContent = '⬇ Download material library';
  exportLibBtn.title = 'Download material names, colors, thicknesses, sheet sizes, and cladding-style material assignments.';
  exportLibBtn.style.cssText = 'font-size:11px;padding:5px 6px;cursor:pointer;border:1px solid var(--border);border-radius:3px;background:#fff;';
  exportLibBtn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); exportMaterialLibrary(); });
  const importLibBtn = document.createElement('button');
  importLibBtn.type = 'button';
  importLibBtn.textContent = '⬆ Import material library';
  importLibBtn.title = 'Replace the current material library from a .hakomaterial or JSON file.';
  importLibBtn.style.cssText = 'font-size:11px;padding:5px 6px;cursor:pointer;border:1px solid var(--border);border-radius:3px;background:#fff;';
  importLibBtn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); openMaterialLibraryImportPicker(); });
  libraryRow.appendChild(exportLibBtn);
  libraryRow.appendChild(importLibBtn);
  container.appendChild(libraryRow);

  const libraryHint = document.createElement('div');
  libraryHint.className = 'small';
  libraryHint.style.cssText = 'margin:-3px 0 8px;color:var(--muted);';
  libraryHint.textContent = 'Libraries include materials plus cladding-style material assignments. Per-part overrides stay with the building file.';
  container.appendChild(libraryHint);

  // ---- Material list ----
  for (let i = 0; i < MaterialRegistry.list(CONFIG).length; i++) {
    const mat = MaterialRegistry.list(CONFIG)[i];
    if (!mat.colour) mat.colour = PALETTE[i % PALETTE.length];

    const row = document.createElement('div');
    row.style.cssText = 'display:grid;grid-template-columns:26px 1fr 60px auto;gap:4px;align-items:center;margin-bottom:5px;';

    // Colour swatch
    const swatch = document.createElement('input');
    swatch.type = 'color';
    swatch.value = mat.colour || '#aaaaaa';
    swatch.style.cssText = 'width:26px;height:26px;padding:1px;border:1px solid var(--border);border-radius:3px;cursor:pointer;';
    swatch.title = t('mat_swatchTitle');
    swatch.addEventListener('input', () => {
      mat.colour = swatch.value;
      if (lastParts) renderPartsOutput(lastParts);
      if (threeScene) updateThreePreview(CONFIG);
    });
    swatch.addEventListener('change', e => { e.stopPropagation(); regenerate(); });
    row.appendChild(swatch);

    // Name input
    const inp = document.createElement('input');
    inp.type = 'text'; inp.value = mat.name;
    inp.placeholder = t('mat_namePh');
    inp.style.cssText = 'padding:4px 6px;font-size:11px;border:1px solid var(--border);border-radius:3px;min-width:0;';
    inp.title = t('mat_nameTitle');
    inp.addEventListener('input', e => e.stopPropagation());
    inp.addEventListener('change', e => { e.stopPropagation(); CONFIG.materials[i].name = inp.value.trim() || mat.id; renderPartsOutput(lastParts); });
    row.appendChild(inp);

    // Thickness input (mm)
    const thick = document.createElement('input');
    thick.type = 'number';
    thick.value = mat.thickness != null ? mat.thickness : '';
    thick.placeholder = 'mm';
    thick.min = '0.01'; thick.max = '20'; thick.step = '0.01';
    thick.title = 'Sheet thickness in mm — used for joint depth and part grouping';
    thick.style.cssText = 'padding:4px 4px;font-size:11px;border:1px solid var(--border);border-radius:3px;text-align:right;min-width:0;';
    thick.addEventListener('input', e => e.stopPropagation());
    thick.addEventListener('change', e => {
      e.stopPropagation();
      const v = parseFloat(thick.value);
      CONFIG.materials[i].thickness = isNaN(v) ? undefined : v;
      // Sync the derived flat fields so generation uses the new value immediately
      CONFIG.coreThickness     = (CONFIG.materials.find(m=>m.id==='core')    ?.thickness) || 1.5;
      CONFIG.claddingThickness = (CONFIG.materials.find(m=>m.id==='cladding')?.thickness) || 0.28;
      regenerate();
    });
    row.appendChild(thick);

    const delCell = document.createElement('div');
    const del = document.createElement('button');
    del.textContent = '✕';
    del.title = t('mat_delTitle');
    del.style.cssText = 'padding:3px 6px;font-size:10px;cursor:pointer;border:1px solid #ccc;border-radius:3px;background:#fff;';
    del.addEventListener('click', () => {
      const deletedId = CONFIG.materials[i].id;
      // Reassign any parts currently using this material to unassigned
      if (lastParts) {
        for (const p of lastParts) {
          if (effectiveMat(p.id, p.material) === deletedId) {
            MaterialRegistry.setPartMaterial(p.id, '__unassigned__', CONFIG);
          }
        }
      }
      CONFIG.materials.splice(i, 1);
      renderMaterialsForm();
      if (lastParts) renderPartsOutput(lastParts);
    });
    delCell.appendChild(del);
    row.appendChild(delCell);
    container.appendChild(row);

    // Maximum sheet size. Values are stored internally in millimetres, but
    // the unit selector lets the user type inches and have them converted
    // automatically. Panelization uses the effective area after the 1/4 in
    // safety border is removed from every edge.
    if (mat.maxWidthMm == null) mat.maxWidthMm = 304.8;
    if (mat.maxHeightMm == null) mat.maxHeightMm = 304.8;
    if (!mat.sizeUnit) mat.sizeUnit = 'mm';
    const unit = mat.sizeUnit === 'in' ? 'in' : 'mm';
    const fmtSize = v => unit === 'in' ? (v / 25.4).toFixed(3).replace(/\.?0+$/, '') : Number(v).toFixed(1).replace(/\.0$/, '');
    const parseSize = v => {
      const n = parseFloat(v);
      if (!isFinite(n) || n <= 0) return undefined;
      return unit === 'in' ? n * 25.4 : n;
    };

    const sizeRow = document.createElement('div');
    sizeRow.style.cssText = 'display:grid;grid-template-columns:26px 1fr 1fr 46px;gap:4px;align-items:center;margin:-2px 0 8px 0;';
    const sizeLabel = document.createElement('div');
    sizeLabel.textContent = 'Sheet';
    sizeLabel.style.cssText = 'font-size:9px;color:var(--muted);text-transform:uppercase;';
    sizeRow.appendChild(sizeLabel);

    const sizeW = document.createElement('input');
    sizeW.type = 'number';
    sizeW.min = '0.1'; sizeW.step = unit === 'in' ? '0.125' : '1';
    sizeW.value = fmtSize(mat.maxWidthMm);
    sizeW.title = 'Maximum material width. Stored as mm; inch entries convert to mm.';
    sizeW.style.cssText = 'padding:3px 4px;font-size:10px;border:1px solid var(--border);border-radius:3px;text-align:right;min-width:0;';
    sizeRow.appendChild(sizeW);

    const sizeH = document.createElement('input');
    sizeH.type = 'number';
    sizeH.min = '0.1'; sizeH.step = unit === 'in' ? '0.125' : '1';
    sizeH.value = fmtSize(mat.maxHeightMm);
    sizeH.title = 'Maximum material height. Stored as mm; inch entries convert to mm.';
    sizeH.style.cssText = 'padding:3px 4px;font-size:10px;border:1px solid var(--border);border-radius:3px;text-align:right;min-width:0;';
    sizeRow.appendChild(sizeH);

    const unitSel = document.createElement('select');
    unitSel.style.cssText = 'padding:3px 2px;font-size:10px;border:1px solid var(--border);border-radius:3px;';
    for (const u of ['mm', 'in']) {
      const opt = document.createElement('option');
      opt.value = u; opt.textContent = u;
      if (unit === u) opt.selected = true;
      unitSel.appendChild(opt);
    }
    sizeRow.appendChild(unitSel);

    function commitSizeInputs() {
      const wv = parseSize(sizeW.value);
      const hv = parseSize(sizeH.value);
      if (wv != null) mat.maxWidthMm = wv;
      if (hv != null) mat.maxHeightMm = hv;
      regenerate();
    }
    sizeW.addEventListener('input', e => e.stopPropagation());
    sizeH.addEventListener('input', e => e.stopPropagation());
    sizeW.addEventListener('change', e => { e.stopPropagation(); commitSizeInputs(); });
    sizeH.addEventListener('change', e => { e.stopPropagation(); commitSizeInputs(); });
    unitSel.addEventListener('change', e => {
      e.stopPropagation();
      mat.sizeUnit = unitSel.value;
      renderMaterialsForm();
    });

    container.appendChild(sizeRow);
  }

  const sizeNote = document.createElement('div');
  sizeNote.className = 'small';
  sizeNote.style.cssText = 'margin:4px 0 8px;color:var(--muted);';
  sizeNote.textContent = 'Max sheet sizes are stored in mm. The generator treats each sheet as 12.7mm smaller in width and height, leaving a 1/4in safety border on every edge.';
  container.appendChild(sizeNote);

  // Column header hint
  const hdr = document.createElement('div');
  hdr.style.cssText = 'display:grid;grid-template-columns:26px 1fr 60px auto;gap:4px;font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px;';
  hdr.innerHTML = '<span></span><span>Name</span><span style="text-align:right">Thick.</span><span></span>';
  container.insertBefore(hdr, container.firstChild);

  // Add-material button
  const addBtn = document.createElement('button');
  addBtn.textContent = t('mat_addBtn');
  addBtn.style.cssText = 'font-size:11px;padding:4px 8px;cursor:pointer;border:1px dashed #aaa;border-radius:3px;background:#f5f5f0;width:100%;margin-top:2px;';
  addBtn.addEventListener('click', () => {
    CONFIG.materials.push({
      id: 'mat_' + Date.now(),
      name: t('mat_newName'),
      thickness: undefined,
      maxWidthMm: 304.8,
      maxHeightMm: 304.8,
      sizeUnit: 'mm',
      colour: PALETTE[CONFIG.materials.length % PALETTE.length],
    });
    renderMaterialsForm();
  });
  container.appendChild(addBtn);

  // ---- Cladding style → material assignment ----
  const claddingStylesInUse = new Set([
    CONFIG.claddingStyle,
    CONFIG.firstFloorCladdingStyleEnabled && CONFIG.firstFloorCladdingStyle,
    ...(CONFIG.wings || []).map(w => w.claddingStyle),
  ].filter(Boolean));

  if (claddingStylesInUse.size > 0) {
    const clHdr = document.createElement('div');
    clHdr.style.cssText = 'font-size:11px;font-weight:600;margin:10px 0 4px;border-top:1px solid var(--border);padding-top:8px;';
    clHdr.textContent = t('mat_clHdr');
    container.appendChild(clHdr);

    const hint = document.createElement('div');
    hint.className = 'small';
    hint.style.marginBottom = '6px';
    hint.textContent = t('mat_clHint');
    container.appendChild(hint);

    for (const styleKey of claddingStylesInUse) {
      const spec = CLADDING_STYLES[styleKey];
      if (!spec) continue;

      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:5px;';

      const nameLbl = document.createElement('span');
      nameLbl.textContent = spec.label || styleKey;
      nameLbl.style.cssText = 'font-size:11px;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      row.appendChild(nameLbl);

      const sel = document.createElement('select');
      sel.style.cssText = 'font-size:11px;padding:2px 4px;border:1px solid var(--border);border-radius:3px;flex-shrink:0;max-width:130px;';
      for (const mat of CONFIG.materials) {
        const opt = document.createElement('option');
        opt.value = mat.id; opt.textContent = mat.name;
        if ((CONFIG.claddingMaterials[styleKey] || 'cladding') === mat.id) opt.selected = true;
        sel.appendChild(opt);
      }
      sel.addEventListener('change', () => { CONFIG.claddingMaterials[styleKey] = sel.value; });
      row.appendChild(sel);
      container.appendChild(row);
    }
  }
}

(function installBackWall3DPreviewOrientationFix() {
  let tries = 0;
  function ready() {
    return typeof updateThreePreview === 'function' && typeof buildEdgePlans === 'function';
  }
  function mirrorList(list, wallW) {
    if (!Array.isArray(list) || !(wallW > 0)) return list;
    return list.map(item => {
      if (!item || typeof item !== 'object') return item;
      const x = Number(item.x), w = Number(item.w);
      if (!isFinite(x) || !isFinite(w)) return item;
      return { ...item, x: wallW - x - w };
    });
  }
  function wallW(blockCfg, blockPlan, face) {
    if (face === 'front' || face === 'back') return Number(blockPlan && blockPlan.fbWidth) || Number(blockCfg && blockCfg.width) || 0;
    return Number(blockPlan && blockPlan.sideLen) || Number(blockCfg && blockCfg.depth) || 0;
  }
  function planFor(blockCfg) {
    try { return buildEdgePlans(blockCfg); } catch (_) { return null; }
  }
  function install() {
    if (!ready()) {
      if (tries++ < 120) setTimeout(install, 50);
      return;
    }
    if (updateThreePreview.__backWall3DOrientationFix) return;
    const originalUpdate = updateThreePreview;
    updateThreePreview = function backWallAlignedUpdateThreePreview(cfg) {
      const restore = [];
      try {
        if (typeof get3DWallOpenings === 'function') {
          const original = get3DWallOpenings;
          get3DWallOpenings = function(blockCfg, blockPlan, face) {
            const out = original.apply(this, arguments);
            return face === 'back' ? mirrorList(out, wallW(blockCfg, blockPlan, face)) : out;
          };
          restore.push(() => { get3DWallOpenings = original; });
        }
        if (typeof getBlankedWindows3D === 'function') {
          const original = getBlankedWindows3D;
          getBlankedWindows3D = function(blockCfg, face) {
            const out = original.apply(this, arguments);
            const p = face === 'back' ? planFor(blockCfg) : null;
            return face === 'back' ? mirrorList(out, wallW(blockCfg, p, face)) : out;
          };
          restore.push(() => { getBlankedWindows3D = original; });
        }
        if (typeof surfaceWallFeaturesForFace === 'function') {
          const original = surfaceWallFeaturesForFace;
          surfaceWallFeaturesForFace = function(blockCfg, face, type) {
            const out = original.apply(this, arguments);
            const p = face === 'back' ? planFor(blockCfg) : null;
            return face === 'back' ? mirrorList(out, wallW(blockCfg, p, face)) : out;
          };
          restore.push(() => { surfaceWallFeaturesForFace = original; });
        }
        if (typeof structuralWallFeaturesForFace === 'function') {
          const original = structuralWallFeaturesForFace;
          structuralWallFeaturesForFace = function(blockCfg, face) {
            const out = original.apply(this, arguments);
            const p = face === 'back' ? planFor(blockCfg) : null;
            return face === 'back' ? mirrorList(out, wallW(blockCfg, p, face)) : out;
          };
          restore.push(() => { structuralWallFeaturesForFace = original; });
        }
        return originalUpdate.apply(this, arguments);
      } finally {
        while (restore.length) {
          try { restore.pop()(); } catch (_) {}
        }
      }
    };
    updateThreePreview.__backWall3DOrientationFix = true;
  }
  install();
})();

document.addEventListener('DOMContentLoaded', init);
