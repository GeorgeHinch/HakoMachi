export function createGithubBuildingPreviewRenderer({
  THREE,
  uid,
  positiveNumber,
  site3DNormalizeBuildingConfig,
  readGithubFile,
}) {
  function githubBuildingPreviewConfig(record, parsedConfig = null) {
    const footprint = record?.footprint || {};
    const cfg = structuredClone(parsedConfig || record?.hakoConfig || record?.config || record?.hakoSeed || {});
    if (!cfg || typeof cfg !== 'object') return null;
    if (!cfg.footprint && footprint && typeof footprint === 'object') cfg.footprint = structuredClone(footprint);
    const b = {
      id: record?.id || uid('github_bldg'),
      name: record?.name || record?.id || 'Building',
      category: (record?.tags && record.tags[0]) || record?.category || cfg.buildingType || 'building',
      padType: footprint?.type === 'polygon' ? 'polygon' : 'rect',
      widthMm: positiveNumber(footprint.widthMm, footprint.width, cfg.width, cfg.widthMm, cfg.dimensions?.width, cfg.dimensions?.widthMm) || 28,
      depthMm: positiveNumber(footprint.depthMm, footprint.depth, cfg.depth, cfg.depthMm, cfg.dimensions?.depth, cfg.dimensions?.depthMm) || 24,
      heightMm: positiveNumber(footprint.heightMm, record?.heightMm, cfg.height, cfg.heightMm),
      floorCount: positiveNumber(record?.summary?.floors, record?.floorCount, cfg.floorCount, cfg.floors),
      hakoSeed: record?.hakoSeed || null,
    };
    return site3DNormalizeBuildingConfig(b, cfg);
  }

  function disposeGithubPreviewObject(obj) {
    if (!obj) return;
    obj.traverse?.(child => {
      child.geometry?.dispose?.();
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.filter(Boolean).forEach(mat => {
        Object.values(mat).forEach(v => {
          if (v && v.isTexture) v.dispose?.();
        });
        mat.dispose?.();
      });
    });
  }

  function renderGithubBuildingStill(target, cfg, label = '3D building preview') {
    if (!target) return false;
    target.textContent = '';
    if (typeof THREE === 'undefined') {
      target.textContent = '3D unavailable';
      return false;
    }
    const sharedRenderer = window.HakoMachiBuildingPreviewRenderer || globalThis.HakoMachiBuildingPreviewRenderer;
    if (!cfg || !sharedRenderer?.buildBuildingPreviewGroup) {
      target.textContent = 'Preview loading';
      return false;
    }
    let renderer = null;
    let group = null;
    try {
      const width = 240;
      const height = 150;
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      renderer.localClippingEnabled = true;
      renderer.setPixelRatio(1);
      renderer.setSize(width, height, false);
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf2f1ea);
      const camera = new THREE.PerspectiveCamera(38, width / height, .1, 5000);
      scene.add(new THREE.HemisphereLight(0xffffff, 0xb8b1a4, .86));
      const key = new THREE.DirectionalLight(0xffffff, .62);
      key.position.set(110, 160, 120);
      scene.add(key);
      group = sharedRenderer.buildBuildingPreviewGroup(cfg, { includeStlOverlay: false });
      scene.add(group);
      const box = new THREE.Box3().setFromObject(group);
      if (box.isEmpty()) throw new Error('empty preview bounds');
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z, 1);
      const dist = Math.max(70, maxDim * 1.75);
      camera.position.set(center.x + dist * .72, center.y + Math.max(size.y * .55, 35), center.z + dist * .82);
      camera.lookAt(center);
      camera.near = Math.max(.25, maxDim / 700);
      camera.far = Math.max(800, maxDim * 7);
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      const img = document.createElement('img');
      img.alt = label;
      img.src = renderer.domElement.toDataURL('image/png');
      target.appendChild(img);
      return true;
    } catch (err) {
      target.textContent = '3D preview unavailable';
      target.title = err && err.message ? err.message : String(err || 'Preview unavailable');
      return false;
    } finally {
      disposeGithubPreviewObject(group);
      renderer?.dispose?.();
      renderer?.forceContextLoss?.();
    }
  }

  async function upgradeGithubBuildingPreviewFromHako(settings, record, target) {
    const path = record?.path || record?.paths?.hako || '';
    if (!path || !target) return;
    try {
      const file = await readGithubFile(settings, path);
      if (!file?.text) return;
      const parsed = JSON.parse(file.text);
      const cfg = githubBuildingPreviewConfig(record, parsed);
      renderGithubBuildingStill(target, cfg, record?.name || record?.id || '3D building preview');
    } catch (err) {
      target.title = 'Could not load .hako preview: ' + (err?.message || err);
    }
  }

  return {
    githubBuildingPreviewConfig,
    renderGithubBuildingStill,
    upgradeGithubBuildingPreviewFromHako,
  };
}
