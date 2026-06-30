'use strict';

const HAKOMACHI_MATERIAL_PROFILES_KEY = 'hakomachi_material_profiles_v1';

function normaliseHexColour(raw, fallback = '#cccccc') {
  if (!raw || typeof raw !== 'string') return fallback;
  let s = raw.trim();
  if (!s) return fallback;
  if (s[0] !== '#') s = '#' + s;
  if (/^#[0-9a-f]{3}$/i.test(s)) {
    return '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3];
  }
  if (/^#[0-9a-f]{6}$/i.test(s)) return s;
  return fallback;
}

function defaultMaterialDefinitions() {
  return [
    { id: 'core',     name: '1.5mm Plywood',      thickness: 1.5,  colour: '#c8b89a', maxWidthMm: 304.8, maxHeightMm: 304.8, sizeUnit: 'mm' },
    { id: 'cladding', name: '0.28mm Basswood',     thickness: 0.28, colour: '#9abcda', maxWidthMm: 304.8, maxHeightMm: 304.8, sizeUnit: 'mm' },
    { id: 'window',   name: '0.5mm Clear PVC',     thickness: 0.5,  colour: '#b8ddf0', maxWidthMm: 304.8, maxHeightMm: 304.8, sizeUnit: 'mm' },
    { id: 'backing',  name: '0.28mm Black Card',   thickness: 0.28, colour: '#444444', maxWidthMm: 304.8, maxHeightMm: 304.8, sizeUnit: 'mm' },
    { id: 'plaster',  name: '0.28mm Plaster Card', thickness: 0.28, colour: '#e8e0d0', maxWidthMm: 304.8, maxHeightMm: 304.8, sizeUnit: 'mm' },
    { id: 'printed',  name: 'Printed Paper',       thickness: 0.20, colour: '#f1df72', maxWidthMm: 304.8, maxHeightMm: 304.8, sizeUnit: 'mm' },
  ];
}

/* =====================================================================
   MATERIAL REGISTRY
   ---------------------------------------------------------------------
   Single access point for material metadata used by export folders,
   sheet-size checks, part reassignment, cladding-style routing, preview
   badges, and 3D material colours. Older helper names remain below as
   compatibility wrappers so the rest of the code can migrate gradually.
   ===================================================================== */

const MaterialRegistry = {
  cfg(cfg = CONFIG) {
    if (!cfg.materials) cfg.materials = [];
    if (!cfg.partMaterials) cfg.partMaterials = {};
    if (!cfg.claddingMaterials) cfg.claddingMaterials = {};
    return cfg;
  },

  list(cfg = CONFIG) {
    cfg = this.cfg(cfg);
    return cfg.materials;
  },

  get(id, cfg = CONFIG, fallback = true) {
    cfg = this.cfg(cfg);
    const mat = cfg.materials.find(m => m.id === id);
    return mat || (fallback ? { id, name: id } : null);
  },

  has(id, cfg = CONFIG) {
    return !!this.get(id, cfg, false);
  },

  label(id, cfg = CONFIG) {
    const m = this.get(id, cfg);
    const t = m && m.thickness != null ? ` — ${m.thickness} mm` : '';
    return ((m && m.name) || id || 'material') + t;
  },

  folderName(id, cfg = CONFIG) {
    const m = this.get(id, cfg);
    return sanitiseFolderName((m && m.name) || id || 'misc');
  },

  colorHex(id, cfg = CONFIG, fallback = '#cccccc') {
    const m = this.get(id, cfg, false);
    return normaliseHexColour(m && (m.colour || m.color), fallback);
  },

  colorNumber(id, cfg = CONFIG, fallback = 0xcccccc) {
    const hex = this.colorHex(id, cfg, '#' + Number(fallback || 0).toString(16).padStart(6, '0'));
    return parseInt(hex.slice(1), 16);
  },

  thickness(id, cfg = CONFIG, fallback = null) {
    const m = this.get(id, cfg, false);
    const v = m ? Number(m.thickness) : NaN;
    return isFinite(v) && v > 0 ? v : fallback;
  },

  sheetSizeMm(id, cfg = CONFIG) {
    const m = this.get(id, cfg, false);
    if (!m) return null;
    const w = parseFloat(m.maxWidthMm != null ? m.maxWidthMm : m.maxW);
    const h = parseFloat(m.maxHeightMm != null ? m.maxHeightMm : m.maxH);
    if (!isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) return null;
    return { w, h };
  },

  effectiveSheetSizeMm(id, cfg = CONFIG) {
    const raw = this.sheetSizeMm(id, cfg);
    if (!raw) return null;
    return {
      w: Math.max(0, raw.w - 2 * LASER_SAFETY_EDGE_BUFFER_MM),
      h: Math.max(0, raw.h - 2 * LASER_SAFETY_EDGE_BUFFER_MM),
    };
  },

  partMaterial(partOrId, defaultMat = 'core', cfg = CONFIG) {
    cfg = this.cfg(cfg);
    const partId = (partOrId && typeof partOrId === 'object') ? partOrId.id : partOrId;
    const def = (partOrId && typeof partOrId === 'object') ? (partOrId.material || defaultMat) : defaultMat;
    return (cfg.partMaterials || {})[partId] || def || 'core';
  },

  setPartMaterial(partId, matId, cfg = CONFIG) {
    cfg = this.cfg(cfg);
    cfg.partMaterials[partId] = matId;
  },

  partFits(part, materialId = null, cfg = CONFIG) {
    const matId = materialId || this.partMaterial(part, part && part.material, cfg);
    const max = this.effectiveSheetSizeMm(matId, cfg);
    if (!max || !part) return true;
    const w = part.bboxW || 0;
    const h = part.bboxH || 0;
    return (w <= max.w + 0.01 && h <= max.h + 0.01)
        || (h <= max.w + 0.01 && w <= max.h + 0.01);
  },

  claddingMaterialId(styleKey, cfg = CONFIG) {
    cfg = this.cfg(cfg);
    return (styleKey && cfg.claddingMaterials && cfg.claddingMaterials[styleKey]) || 'cladding';
  },

  claddingColorHex(styleKey, cfg = CONFIG, fallback = '#cbbfa3') {
    return this.colorHex(this.claddingMaterialId(styleKey, cfg), cfg, fallback);
  },

  threeMaterial(id, cfg = CONFIG, opts = {}, fallback = 0xcccccc) {
    const params = {
      color: opts.color != null ? opts.color : this.colorNumber(id, cfg, fallback),
      roughness: opts.roughness != null ? opts.roughness : 0.82,
      metalness: opts.metalness != null ? opts.metalness : 0.0,
    };
    if (opts.transparent != null) params.transparent = opts.transparent;
    if (opts.opacity != null) params.opacity = opts.opacity;
    if (opts.side != null) params.side = opts.side;
    if (opts.map != null) params.map = opts.map;
    return new THREE.MeshStandardMaterial(params);
  },

  threeCladdingMaterial(styleKey, cfg = CONFIG, opts = {}, fallback = 0xc9b89b) {
    return this.threeMaterial(this.claddingMaterialId(styleKey || (cfg && cfg.claddingStyle), cfg), cfg, opts, fallback);
  },

  profilePayload(cfg = (typeof CONFIG !== 'undefined' ? CONFIG : null), meta = {}) {
    const source = cfg || {};
    return {
      type: 'hakomachi_material_library',
      schema: 'hakomachi.material-profile',
      version: 1,
      schemaVersion: 1,
      id: meta.id || source.materialProfileId || '',
      name: meta.name || source.materialProfileName || 'Material profile',
      exportedAt: new Date().toISOString(),
      materials: JSON.parse(JSON.stringify(Array.isArray(source.materials) ? source.materials : defaultMaterialDefinitions())),
      claddingMaterials: JSON.parse(JSON.stringify(source.claddingMaterials || {})),
    };
  },

  normalizeProfilePayload(data) {
    if (!data || typeof data !== 'object') {
      throw new Error('File is not a material library JSON object.');
    }

    const materials = Array.isArray(data.materials) ? data.materials : null;
    if (!materials || materials.length === 0) {
      throw new Error('Material library has no materials array.');
    }

    const used = new Set();
    const cleanMaterials = materials.map((m, idx) => {
      if (!m || typeof m !== 'object') throw new Error('Material ' + (idx + 1) + ' is invalid.');
      let id = String(m.id || '').trim();
      if (!id) id = 'mat_' + Date.now() + '_' + idx;
      id = id.replace(/[^a-zA-Z0-9_-]/g, '_');
      if (used.has(id)) {
        let n = 2;
        const base = id;
        while (used.has(base + '_' + n)) n++;
        id = base + '_' + n;
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

      const stockQty = parseFloat(m.stockQty);
      if (isFinite(stockQty) && stockQty >= 0) out.stockQty = stockQty;
      if (m.stockUnit != null) out.stockUnit = String(m.stockUnit).trim().slice(0, 24);
      if (m.notes != null) out.notes = String(m.notes).trim().slice(0, 500);

      return out;
    });

    const validIds = new Set(cleanMaterials.map(m => m.id));
    const cleanCladdingMaterials = {};
    const incomingCladding = (data.claddingMaterials && typeof data.claddingMaterials === 'object')
      ? data.claddingMaterials
      : {};
    for (const [styleKey, matId] of Object.entries(incomingCladding)) {
      const styleOk = typeof CLADDING_STYLES === 'undefined' || !!CLADDING_STYLES[styleKey];
      if (styleOk && validIds.has(matId)) cleanCladdingMaterials[styleKey] = matId;
    }

    return {
      type: 'hakomachi_material_library',
      schema: 'hakomachi.material-profile',
      version: 1,
      schemaVersion: 1,
      id: String(data.id || '').trim(),
      name: String(data.name || 'Material profile').trim() || 'Material profile',
      exportedAt: data.exportedAt || new Date().toISOString(),
      materials: cleanMaterials,
      claddingMaterials: cleanCladdingMaterials,
    };
  },

  applyProfileToConfig(profile, cfg = CONFIG) {
    const library = this.normalizeProfilePayload(profile);
    cfg.materials = library.materials;
    cfg.claddingMaterials = library.claddingMaterials || {};
    cfg.materialProfileId = library.id || cfg.materialProfileId || '';
    cfg.materialProfileName = library.name || cfg.materialProfileName || '';

    cfg.coreThickness = (cfg.materials.find(m => m.id === 'core')?.thickness) || cfg.coreThickness || 1.5;
    cfg.claddingThickness = (cfg.materials.find(m => m.id === 'cladding')?.thickness) || cfg.claddingThickness || 0.28;

    const validIds = new Set(cfg.materials.map(m => m.id));
    if (cfg.partMaterials) {
      for (const [partId, matId] of Object.entries(cfg.partMaterials)) {
        if (matId !== '__unassigned__' && !validIds.has(matId)) cfg.partMaterials[partId] = '__unassigned__';
      }
    }
    return library;
  },

  loadLocalProfiles() {
    try {
      const raw = JSON.parse(localStorage.getItem(HAKOMACHI_MATERIAL_PROFILES_KEY) || '[]');
      return Array.isArray(raw) ? raw.map(p => this.normalizeStoredProfile(p)).filter(Boolean) : [];
    } catch (_) {
      return [];
    }
  },

  saveLocalProfiles(profiles) {
    const clean = (Array.isArray(profiles) ? profiles : [])
      .map(p => this.normalizeStoredProfile(p))
      .filter(Boolean)
      .sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)));
    localStorage.setItem(HAKOMACHI_MATERIAL_PROFILES_KEY, JSON.stringify(clean));
    return clean;
  },

  normalizeStoredProfile(profile) {
    if (!profile || typeof profile !== 'object') return null;
    const library = this.normalizeProfilePayload(profile.library || profile);
    const id = String(profile.id || library.id || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_') || ('materials_' + Date.now());
    const now = new Date().toISOString();
    library.id = id;
    library.name = String(profile.name || library.name || id).trim() || id;
    return {
      id,
      name: library.name,
      library,
      updatedAt: profile.updatedAt || now,
      createdAt: profile.createdAt || profile.updatedAt || now,
      github: profile.github || null,
    };
  },

  upsertLocalProfile(profile) {
    const clean = this.normalizeStoredProfile(profile);
    const profiles = this.loadLocalProfiles();
    const index = profiles.findIndex(p => p.id === clean.id);
    clean.updatedAt = new Date().toISOString();
    if (index >= 0) {
      clean.createdAt = profiles[index].createdAt || clean.createdAt;
      profiles[index] = clean;
    } else {
      profiles.push(clean);
    }
    this.saveLocalProfiles(profiles);
    return clean;
  },

  deleteLocalProfile(id) {
    const next = this.loadLocalProfiles().filter(p => p.id !== id);
    this.saveLocalProfiles(next);
    return next;
  },

  profileRecord(profile, path) {
    const p = this.normalizeStoredProfile(profile);
    const now = new Date().toISOString();
    const mats = p.library.materials || [];
    return {
      kind: 'materialProfile',
      recordType: 'hakomachi-material-profile',
      schemaVersion: 1,
      id: p.id,
      name: p.name,
      path,
      paths: { materialProfile: path },
      app: 'hakomachi-material-manager',
      materialCount: mats.length,
      tags: mats.map(m => m.name).filter(Boolean).slice(0, 12),
      updatedAt: now,
      createdAt: p.createdAt || now,
    };
  },

  githubProfilePath(settings, profileId) {
    const githubData = window.HakoMachiGithubDataShared;
    if (!githubData) throw new Error('HakoMachi GitHub data helpers did not load.');
    const dir = githubData.cleanRepoPath((settings && settings.materialsDir) || githubData.DEFAULT_MATERIALS_DIR || 'materials');
    const slug = githubData.slugify(profileId || 'material-profile', 'material-profile');
    return githubData.cleanRepoPath(dir + '/' + slug + '.hakomaterial');
  },

  async saveProfileToGithub(profile, settings = null) {
    const githubData = window.HakoMachiGithubDataShared;
    if (!githubData) throw new Error('HakoMachi GitHub data helpers did not load.');
    const s = settings || githubData.getSettings();
    githubData.assertSettings(s);
    const clean = this.normalizeStoredProfile(profile);
    const path = this.githubProfilePath(s, clean.id);
    clean.library.id = clean.id;
    clean.library.name = clean.name;
    await githubData.writeGithubFile(
      s,
      path,
      JSON.stringify(clean.library, null, 2) + '\n',
      'Save HakoMachi material profile: ' + clean.name,
    );
    const library = await githubData.loadLibrary(s);
    githubData.upsertRecord(library, 'materialProfiles', this.profileRecord(clean, path));
    await githubData.writeGithubFile(
      s,
      s.libraryPath || githubData.DEFAULT_LIBRARY_PATH,
      JSON.stringify(library, null, 2) + '\n',
      'Update HakoMachi material profile library: ' + clean.name,
    );
    clean.github = { repoFullName: s.repoFullName, branch: s.branch || 'main', path, libraryPath: s.libraryPath || githubData.DEFAULT_LIBRARY_PATH };
    this.upsertLocalProfile(clean);
    return clean;
  },

  async loadGithubProfileRecords(settings = null) {
    const githubData = window.HakoMachiGithubDataShared;
    if (!githubData) throw new Error('HakoMachi GitHub data helpers did not load.');
    const s = settings || githubData.getSettings();
    githubData.assertSettings(s);
    const library = await githubData.loadLibrary(s);
    return ((library.records && library.records.materialProfiles) || []).slice()
      .sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)));
  },

  async readGithubProfile(record, settings = null) {
    const githubData = window.HakoMachiGithubDataShared;
    if (!githubData) throw new Error('HakoMachi GitHub data helpers did not load.');
    const s = settings || githubData.getSettings();
    githubData.assertSettings(s);
    const path = record && (record.path || (record.paths && record.paths.materialProfile));
    if (!path) throw new Error('Material profile record has no path.');
    const file = await githubData.readGithubFile(s, path);
    if (!file) throw new Error('Material profile file was not found: ' + path);
    const profile = this.normalizeStoredProfile(JSON.parse(file.text));
    profile.github = { repoFullName: s.repoFullName, branch: s.branch || 'main', path, libraryPath: s.libraryPath || githubData.DEFAULT_LIBRARY_PATH };
    return profile;
  },
};

// Compatibility wrappers retained for older call sites.
function materialSheetSizeMm(materialId) {
  return MaterialRegistry.sheetSizeMm(materialId);
}

function materialEffectiveSheetSizeMm(materialId) {
  return MaterialRegistry.effectiveSheetSizeMm(materialId);
}

function partFitsMaterial(part, materialId) {
  return MaterialRegistry.partFits(part, materialId || (part && part.material));
}

function floorPartExceedsMaterial(part, materialId) {
  return !MaterialRegistry.partFits(part, materialId || 'core');
}

function material3DForCladdingStyle(cfg, styleKey, opts = {}, fallback = 0xc9b89b) {
  return MaterialRegistry.threeCladdingMaterial(styleKey || (cfg && cfg.claddingStyle), cfg || CONFIG, opts, fallback);
}

function addPartsToList(parts, maybePartOrList) {
  if (!maybePartOrList) return;
  if (Array.isArray(maybePartOrList)) parts.push(...maybePartOrList.filter(Boolean));
  else parts.push(maybePartOrList);
}

/* ---------------------------------------------------------------------
   3D preview failure guard
   ---------------------------------------------------------------------
   The live material preview is a large renderer with many optional feature
   systems. If one of those systems throws, the scene used to show only the
   grid. This wrapper is installed after the Three.js preview function exists;
   it catches rebuild errors, displays the error in the preview note, and draws
   a simple massing box so the preview area is never silently blank.
   --------------------------------------------------------------------- */
(function installLiveThreePreviewGuardFromMaterialRegistry() {
  let attempts = 0;

  function ready() {
    return typeof updateThreePreview === 'function' &&
           typeof initThreePreview === 'function' &&
           typeof THREE !== 'undefined';
  }

  function setPreviewNote(message, isError = false) {
    const note = document.getElementById('threePreviewModeNote');
    if (!note) return;
    note.textContent = message;
    note.style.color = isError ? '#9a2b20' : '';
    note.style.fontWeight = isError ? '600' : '';
  }

  function fallbackBoxDimensions(cfg) {
    const c = cfg || (typeof CONFIG !== 'undefined' ? CONFIG : {}) || {};
    const w = Math.max(1, Number(c.width) || 80);
    const d = Math.max(1, Number(c.depth) || 80);
    let h = Math.max(1, Number(c.height) || 60);
    try {
      if (typeof wallBodyHeightFromConfig === 'function') h = Math.max(1, Number(wallBodyHeightFromConfig(c)) || h);
    } catch (_) {}
    return { w, d, h };
  }

  function renderFallbackPreview(cfg, err) {
    try {
      if (!threeScene) initThreePreview();
      if (!threeScene || typeof THREE === 'undefined') return;

      if (buildingMesh) {
        threeScene.remove(buildingMesh);
        buildingMesh = null;
      }

      const { w, d, h } = fallbackBoxDimensions(cfg);
      const group = new THREE.Group();
      group.name = 'Fallback 3D Preview';

      const wallMat = new THREE.MeshStandardMaterial({
        color: 0xc9b89b,
        roughness: 0.85,
        metalness: 0.0,
        transparent: true,
        opacity: 0.88,
      });
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      box.position.set(0, h / 2, 0);
      group.add(box);

      const edgeMat = new THREE.LineBasicMaterial({ color: 0x554433, transparent: true, opacity: 0.7 });
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry, 20), edgeMat);
      edges.position.copy(box.position);
      group.add(edges);

      const roofT = Math.max(0.5, Math.min(2, h * 0.03));
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x6f6f6f, roughness: 0.9, metalness: 0.0 });
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w, roofT, d), roofMat);
      roof.position.set(0, h + roofT / 2, 0);
      group.add(roof);

      buildingMesh = group;
      threeScene.add(group);

      if (threeControls && threeControls.target) {
        threeControls.target.set(0, h / 2, 0);
        threeControls.update();
      }
      if (threeCamera) {
        const span = Math.max(w, d, h, 1);
        threeCamera.position.set(span * 1.35, span * 1.0, span * 1.35);
        threeCamera.lookAt(0, h / 2, 0);
      }
      if (threeRenderer && threeScene && threeCamera) threeRenderer.render(threeScene, threeCamera);

      const errText = err && (err.message || String(err));
      setPreviewNote('3D preview fell back to massing view. Error: ' + (errText || 'unknown preview error'), true);
      console.error('Live 3D preview failed; fallback massing view rendered:', err);
    } catch (fallbackErr) {
      setPreviewNote('3D preview failed and fallback also failed: ' + (fallbackErr && (fallbackErr.message || String(fallbackErr))), true);
      console.error('Live 3D preview fallback failed:', fallbackErr);
    }
  }

  function requestPostInstallPreviewRebuild() {
    const rebuild = () => {
      try {
        if (typeof CONFIG !== 'undefined' && typeof updateThreePreview === 'function') {
          updateThreePreview(CONFIG);
        }
      } catch (err) {
        console.warn('Post-install 3D preview rebuild failed:', err);
      }
    };
    setTimeout(rebuild, 0);
    setTimeout(rebuild, 150);
    setTimeout(rebuild, 500);
  }

  function installWhenReady() {
    if (!ready()) {
      if (attempts++ < 120) setTimeout(installWhenReady, 50);
      return;
    }
    if (updateThreePreview.__guardedFallbackInstalled) return;

    const originalUpdateThreePreview = updateThreePreview;
    updateThreePreview = function guardedUpdateThreePreview(cfg) {
      try {
        const result = originalUpdateThreePreview.apply(this, arguments);
        if (!buildingMesh || !threeScene || !buildingMesh.parent) {
          renderFallbackPreview(cfg || (typeof CONFIG !== 'undefined' ? CONFIG : null), new Error('Preview rebuild completed without adding buildingMesh'));
        } else {
          const useStl = (typeof threePreviewUseStlGeometry !== 'undefined') && threePreviewUseStlGeometry;
          setPreviewNote(useStl
            ? 'Designed/material preview with translucent generated-STL overlay.'
            : 'Designed/material preview. Enable overlay to compare preview_3d.stl geometry.', false);
        }
        return result;
      } catch (err) {
        renderFallbackPreview(cfg || (typeof CONFIG !== 'undefined' ? CONFIG : null), err);
        return null;
      }
    };
    updateThreePreview.__guardedFallbackInstalled = true;
    requestPostInstallPreviewRebuild();
  }

  installWhenReady();
})();

/* Remove toolbox styles injected by previous broken builds, then install a
 * narrow v2 fix. Do not apply blanket max-width/overflow rules to toolbox
 * descendants: that hid SVG previews and labels on iPad. */
(function installEditorToolboxVerticalScrollV2() {
  for (const id of ['hakomachi-editor-toolbox-overflow-fix', 'hakomachi-editor-toolbox-safe-sizing']) {
    const el = document.getElementById(id);
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  const styleId = 'hakomachi-editor-toolbox-vertical-scroll-v2';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      #openingEditorModal .oe-dialog,
      #iwModal .oe-dialog,
      #openingEditorModal .oe-body,
      #iwModal .oe-body {
        min-width: 0;
        overflow-x: hidden;
      }
      #openingEditorModal .oe-toolbox,
      #iwModal .oe-toolbox {
        width: 156px;
        min-width: 156px;
        flex: 0 0 156px;
        overflow-y: auto;
        overflow-x: hidden;
        overscroll-behavior-x: none;
        overscroll-behavior-y: contain;
        touch-action: pan-y;
        -webkit-overflow-scrolling: touch;
      }
      #openingEditorModal .oe-canvas-area,
      #iwModal .oe-canvas-area {
        min-width: 0;
        overflow: auto;
      }
      #openingEditorModal .oe-toolbox svg,
      #iwModal .oe-toolbox svg {
        max-width: 100%;
        flex-shrink: 0;
      }
      #openingEditorModal .oe-toolbox-item-label,
      #iwModal .oe-toolbox-item-label,
      #openingEditorModal .oe-toolbox-item-dim,
      #iwModal .oe-toolbox-item-dim {
        overflow-wrap: anywhere;
        word-break: break-word;
      }
    `;
    document.head.appendChild(style);
  }

  function clampNonCanvasHorizontalScroll() {
    const activeRoots = ['openingEditorModal', 'iwModal']
      .map(id => document.getElementById(id))
      .filter(el => el && getComputedStyle(el).display !== 'none');
    for (const root of activeRoots) {
      const els = [root, root.querySelector('.oe-dialog'), root.querySelector('.oe-body'), root.querySelector('.oe-toolbox')];
      for (const el of els) {
        if (el && el.scrollLeft) el.scrollLeft = 0;
      }
    }
  }

  document.addEventListener('scroll', clampNonCanvasHorizontalScroll, true);
  document.addEventListener('touchend', clampNonCanvasHorizontalScroll, true);
  window.addEventListener('resize', clampNonCanvasHorizontalScroll);
})();

/* 3D fixture layer thickness correction.
 * The legacy 3D preview deliberately exaggerated surface fixture layers with a
 * hard-coded 1.1mm depth so they were easy to see. That made laser-cut side
 * fixtures look like arbitrary blocks sticking out from the building. Keep the
 * renderer path intact, then collapse those exact 1.1mm fixture-layer meshes to
 * the actual cladding material thickness and restack them at that thickness.
 * This affects wall fixture preview geometry only; exported SVG/STL data is not
 * changed here.
 */
(function installFixtureMaterialThickness3DPreviewPatch() {
  let attempts = 0;
  const NOMINAL_FIXTURE_T = 1.1;
  const NOMINAL_INNER_CUT_T = NOMINAL_FIXTURE_T * 0.18;

  function ready() {
    return typeof updateThreePreview === 'function' &&
           typeof THREE !== 'undefined' &&
           typeof MaterialRegistry !== 'undefined';
  }

  function layerThicknessForPreview(cfg) {
    const c = cfg || (typeof CONFIG !== 'undefined' ? CONFIG : {}) || {};
    const matT = MaterialRegistry.thickness('cladding', c, null);
    const fallback = Number(c.claddingThickness) || 0.28;
    return Math.max(0.05, Math.min(3, Number(matT) || fallback));
  }

  function closeEnough(a, b, eps = 0.004) {
    return Math.abs((Number(a) || 0) - b) <= eps;
  }

  function replaceBoxDepth(mesh, depth) {
    const p = mesh && mesh.geometry && mesh.geometry.parameters;
    if (!p) return;
    try { mesh.geometry.dispose(); } catch (_) {}
    mesh.geometry = new THREE.BoxGeometry(p.width, p.height, depth, p.widthSegments, p.heightSegments, p.depthSegments);
  }

  function replaceCylinderHeight(mesh, height) {
    const p = mesh && mesh.geometry && mesh.geometry.parameters;
    if (!p) return;
    try { mesh.geometry.dispose(); } catch (_) {}
    mesh.geometry = new THREE.CylinderGeometry(
      p.radiusTop,
      p.radiusBottom,
      height,
      p.radialSegments,
      p.heightSegments,
      p.openEnded,
      p.thetaStart,
      p.thetaLength
    );
  }

  function adjust3DFixtureLayerThickness(cfg) {
    if (typeof buildingMesh === 'undefined' || !buildingMesh) return;
    const layerT = layerThicknessForPreview(cfg);
    const innerCutT = Math.max(0.02, layerT * 0.18);
    const innerCutOut = Math.max(0.02, layerT * 0.11);

    buildingMesh.traverse(obj => {
      if (!obj || !obj.isMesh || !obj.geometry || !obj.geometry.parameters || !obj.position) return;
      const p = obj.geometry.parameters;
      const z = Number(obj.position.z);
      if (!(z < -0.15)) return;

      const isWallFacingCylinder = obj.rotation && Math.abs(Math.abs(obj.rotation.x) - Math.PI / 2) < 0.02;

      if (p.depth != null && closeEnough(p.depth, NOMINAL_FIXTURE_T)) {
        const layerIndex = Math.max(0, Math.round((Math.abs(z) - NOMINAL_FIXTURE_T / 2) / NOMINAL_FIXTURE_T));
        replaceBoxDepth(obj, layerT);
        obj.position.z = -(layerIndex * layerT + layerT / 2);
        return;
      }

      if (p.height != null && closeEnough(p.height, NOMINAL_FIXTURE_T) && isWallFacingCylinder) {
        const layerIndex = Math.max(0, Math.round((Math.abs(z) - NOMINAL_FIXTURE_T / 2) / NOMINAL_FIXTURE_T));
        replaceCylinderHeight(obj, layerT);
        obj.position.z = -(layerIndex * layerT + layerT / 2);
        return;
      }

      if (p.depth != null && closeEnough(p.depth, NOMINAL_INNER_CUT_T, 0.01)) {
        const layerIndex = Math.max(0, Math.round((Math.abs(z) - (NOMINAL_FIXTURE_T / 2 + NOMINAL_FIXTURE_T * 0.11)) / NOMINAL_FIXTURE_T));
        replaceBoxDepth(obj, innerCutT);
        obj.position.z = -(layerIndex * layerT + layerT + innerCutOut);
        return;
      }

      if (p.height != null && closeEnough(p.height, NOMINAL_INNER_CUT_T, 0.01) && isWallFacingCylinder) {
        const layerIndex = Math.max(0, Math.round((Math.abs(z) - (NOMINAL_FIXTURE_T / 2 + NOMINAL_FIXTURE_T * 0.11)) / NOMINAL_FIXTURE_T));
        replaceCylinderHeight(obj, innerCutT);
        obj.position.z = -(layerIndex * layerT + layerT + innerCutOut);
      }
    });
  }

  function installWhenReady() {
    if (!ready()) {
      if (attempts++ < 120) setTimeout(installWhenReady, 50);
      return;
    }
    if (updateThreePreview.__fixtureMaterialThicknessPatch) return;

    const previousUpdateThreePreview = updateThreePreview;
    updateThreePreview = function fixtureMaterialThicknessPreviewUpdate(cfg) {
      const result = previousUpdateThreePreview.apply(this, arguments);
      try {
        adjust3DFixtureLayerThickness(cfg || (typeof CONFIG !== 'undefined' ? CONFIG : null));
      } catch (err) {
        console.warn('3D fixture material-thickness adjustment failed:', err);
      }
      return result;
    };
    updateThreePreview.__fixtureMaterialThicknessPatch = true;

    setTimeout(() => {
      try {
        if (typeof CONFIG !== 'undefined') updateThreePreview(CONFIG);
      } catch (err) {
        console.warn('Post-install fixture material-thickness preview rebuild failed:', err);
      }
    }, 100);
  }

  installWhenReady();
})();
