'use strict';

/* =====================================================================
   LIVE THREE.JS PREVIEW GUARD
   ---------------------------------------------------------------------
   The main material/design preview is intentionally detailed and touches many
   optional feature systems. If one optional subsystem throws, the old behavior
   left users with only the grid and no visible error. This guard wraps the
   preview rebuild so the panel always shows either the real preview or a simple
   fallback massing box with the runtime error shown in the preview note.
   ===================================================================== */
(function installLiveThreePreviewGuard() {
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

      const wallMat = new THREE.MeshStandardMaterial({ color: 0xc9b89b, roughness: 0.85, metalness: 0.0, transparent: true, opacity: 0.86 });
      const edgeMat = new THREE.LineBasicMaterial({ color: 0x554433, transparent: true, opacity: 0.65 });
      const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      box.position.set(0, h / 2, 0);
      group.add(box);

      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry, 20), edgeMat);
      edges.position.copy(box.position);
      group.add(edges);

      const roofMat = new THREE.MeshStandardMaterial({ color: 0x6f6f6f, roughness: 0.9, metalness: 0.0 });
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w, Math.max(0.5, Math.min(2, h * 0.03)), d), roofMat);
      roof.position.set(0, h + Math.max(0.25, Math.min(1, h * 0.015)), 0);
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
        // If the original returned without throwing but still left no building
        // group, render a diagnostic massing preview instead of a silent grid.
        if (!buildingMesh || !threeScene || !buildingMesh.parent) {
          renderFallbackPreview(cfg || (typeof CONFIG !== 'undefined' ? CONFIG : null), new Error('Preview rebuild completed without adding buildingMesh'));
        } else {
          setPreviewNote(threePreviewUseStlGeometry
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
  }

  installWhenReady();
})();
