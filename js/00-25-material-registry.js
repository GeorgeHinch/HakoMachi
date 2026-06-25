'use strict';

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

/* Safe wall/floor editor toolbox sizing: widen the toolbox and prevent the
 * toolbox container itself from becoming a sideways scroller, but do not clip
 * every child card/preview/label. The canvas area remains scrollable. */
(function installSafeEditorToolboxSizingCss() {
  const styleId = 'hakomachi-editor-toolbox-safe-sizing';
  if (document.getElementById(styleId)) return;
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    #openingEditorModal .oe-toolbox,
    #iwModal .oe-toolbox {
      width: 136px !important;
      min-width: 136px !important;
      max-width: 136px !important;
      flex: 0 0 136px !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      overscroll-behavior-x: none;
      touch-action: pan-y;
    }
    #openingEditorModal .oe-body,
    #iwModal .oe-body,
    #openingEditorModal .oe-dialog,
    #iwModal .oe-dialog {
      min-width: 0;
      max-width: 100%;
      overflow-x: hidden;
    }
    #openingEditorModal .oe-canvas-area,
    #iwModal .oe-canvas-area {
      min-width: 0;
      overflow: auto;
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
})();
