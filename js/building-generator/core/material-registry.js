/* =====================================================================
   MATERIAL REGISTRY
   ---------------------------------------------------------------------
   Single access point for material metadata used by export folders,
   sheet-size checks, part reassignment, cladding-style routing, preview
   badges, and 3D material colours. Older helper names remain below as
   compatibility wrappers so the rest of the code can migrate gradually.
   ===================================================================== */

export const MaterialRegistry = {
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
export function materialSheetSizeMm(materialId) {
  return MaterialRegistry.sheetSizeMm(materialId);
}

export function materialEffectiveSheetSizeMm(materialId) {
  return MaterialRegistry.effectiveSheetSizeMm(materialId);
}

export function partFitsMaterial(part, materialId) {
  return MaterialRegistry.partFits(part, materialId || (part && part.material));
}

export function floorPartExceedsMaterial(part, materialId) {
  return !MaterialRegistry.partFits(part, materialId || 'core');
}

export function material3DForCladdingStyle(cfg, styleKey, opts = {}, fallback = 0xc9b89b) {
  return MaterialRegistry.threeCladdingMaterial(styleKey || (cfg && cfg.claddingStyle), cfg || CONFIG, opts, fallback);
}

export function addPartsToList(parts, maybePartOrList) {
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
