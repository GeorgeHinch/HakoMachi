import { createHakoMachiLogger } from '../shared/hakomachi-diagnostics.js';

const logger = createHakoMachiLogger('Utility 3D Preview');

const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const ORBIT_URL = 'https://cdn.jsdelivr.net/npm/three@0.128/examples/js/controls/OrbitControls.js';

let threePromise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = Array.from(document.scripts).find(script => script.src === src);
    if (existing) {
      if (existing.dataset.loaded === 'true') resolve();
      else existing.addEventListener('load', resolve, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.utility3d = 'true';
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error('Could not load 3D preview runtime.'));
    document.head.appendChild(script);
  });
}

function loadThree() {
  if (!threePromise) {
    threePromise = (async () => {
      if (!window.THREE) await loadScript(THREE_URL);
      if (!window.THREE?.OrbitControls) await loadScript(ORBIT_URL);
      return window.THREE;
    })();
  }
  return threePromise;
}

function box3FromObject(object, THREE) {
  const box = new THREE.Box3().setFromObject(object);
  if (!Number.isFinite(box.min.x) || !Number.isFinite(box.max.x)) {
    box.set(new THREE.Vector3(-10, -10, -10), new THREE.Vector3(10, 10, 10));
  }
  return box;
}

function material(THREE, color, opacity = 1, roughness = 0.72) {
  const transparent = opacity < 1;
  return new THREE.MeshStandardMaterial({
    color,
    opacity,
    transparent,
    depthTest: true,
    depthWrite: !transparent,
    roughness,
    metalness: 0.03,
    side: THREE.DoubleSide,
  });
}

function makeBox(THREE, spec = {}) {
  const w = Math.max(0.01, spec.w ?? 1);
  const h = Math.max(0.01, spec.h ?? 1);
  const d = Math.max(0.01, spec.d ?? 1);
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    material(THREE, spec.color || 0xc8b89a, spec.opacity ?? 1, spec.roughness ?? 0.72)
  );
  mesh.position.set(spec.x || 0, spec.y || 0, spec.z || 0);
  if (spec.rotation) mesh.rotation.set(spec.rotation.x || 0, spec.rotation.y || 0, spec.rotation.z || 0);
  return mesh;
}

function makeCylinderBetween(THREE, start, end, radius, color) {
  const a = new THREE.Vector3(start.x, start.y, start.z);
  const b = new THREE.Vector3(end.x, end.y, end.z);
  const delta = new THREE.Vector3().subVectors(b, a);
  const len = Math.max(0.01, delta.length());
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(Math.max(0.01, radius), Math.max(0.01, radius), len, 10),
    material(THREE, color || 0x9a6a36, 1, 0.65)
  );
  mesh.position.copy(a).addScaledVector(delta, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return mesh;
}

export function createUtility3dPreview(host, options = {}) {
  if (!host) {
    return {
      setModel() {},
      resize() {},
      dispose() {},
    };
  }

  const state = {
    THREE: null,
    renderer: null,
    scene: null,
    camera: null,
    controls: null,
    model: null,
    frameId: null,
    pendingFactory: null,
    resizeObserver: null,
  };

  host.classList.add('utility3dHost');
  host.innerHTML = '<div class="utility3dCanvas"></div><div class="utility3dStatus">3D preview loading.</div>';
  const canvasHost = host.querySelector('.utility3dCanvas');
  const status = host.querySelector('.utility3dStatus');

  function setStatus(text, tone = '') {
    status.textContent = text || '';
    status.dataset.tone = tone;
  }

  function render() {
    if (!state.renderer || !state.scene || !state.camera) return;
    state.renderer.render(state.scene, state.camera);
  }

  function animate() {
    if (!state.renderer) return;
    state.frameId = requestAnimationFrame(animate);
    if (state.controls) state.controls.update();
    render();
  }

  function resize() {
    if (!state.renderer || !state.camera) return;
    const rect = canvasHost.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    const w = Math.max(120, Math.floor(rect.width || hostRect.width || host.clientWidth || 120));
    const h = Math.max(220, Math.floor(rect.height || 320));
    state.renderer.setSize(w, h, false);
    state.camera.aspect = w / h;
    state.camera.updateProjectionMatrix();
    render();
  }

  function frameModel() {
    const THREE = state.THREE;
    const target = state.model || state.scene;
    const box = box3FromObject(target, THREE);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 10);
    const distance = maxDim * 1.8;
    state.camera.position.set(center.x + distance * 0.9, center.y + distance * 0.65, center.z + distance);
    state.camera.near = Math.max(0.25, maxDim / 800);
    state.camera.far = Math.max(600, maxDim * 8);
    state.camera.lookAt(center);
    state.camera.updateProjectionMatrix();
    if (state.controls) {
      state.controls.target.copy(center);
      state.controls.update();
    }
  }

  function installScene(THREE) {
    state.THREE = THREE;
    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(options.background || 0xf7f6f2);
    state.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 2000);
    state.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
    state.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    canvasHost.replaceChildren(state.renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x93836d, 0.85);
    state.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(80, 120, 90);
    state.scene.add(key);
    const fill = new THREE.DirectionalLight(0xfff2de, 0.35);
    fill.position.set(-80, 70, -110);
    state.scene.add(fill);

    const grid = new THREE.GridHelper(160, 16, 0xd5d0c7, 0xe7e2d8);
    grid.position.y = -0.02;
    state.scene.add(grid);

    if (THREE.OrbitControls) {
      state.controls = new THREE.OrbitControls(state.camera, state.renderer.domElement);
      state.controls.enableDamping = true;
      state.controls.dampingFactor = 0.08;
      state.controls.screenSpacePanning = false;
      state.controls.addEventListener('change', render);
    }
    if (typeof ResizeObserver !== 'undefined') {
      state.resizeObserver = new ResizeObserver(() => resize());
      state.resizeObserver.observe(host);
      state.resizeObserver.observe(canvasHost);
    }
    window.addEventListener('resize', resize);
    resize();
    animate();
  }

  async function ensureReady() {
    if (state.THREE) return state.THREE;
    const THREE = await loadThree();
    installScene(THREE);
    return THREE;
  }

  async function setModel(factory) {
    state.pendingFactory = factory;
    try {
      const THREE = await ensureReady();
      if (state.pendingFactory !== factory) return;
      if (state.model) {
        state.scene.remove(state.model);
        state.model.traverse?.(node => {
          node.geometry?.dispose?.();
          if (Array.isArray(node.material)) node.material.forEach(m => m.dispose?.());
          else node.material?.dispose?.();
        });
      }
      const helpers = {
        box: spec => makeBox(THREE, spec),
        cylinderBetween: (start, end, radius, color) => makeCylinderBetween(THREE, start, end, radius, color),
        material: (color, opacity, roughness) => material(THREE, color, opacity, roughness),
      };
      state.model = factory(THREE, helpers) || new THREE.Group();
      state.scene.add(state.model);
      frameModel();
      resize();
      setStatus(options.readyText || '3D preview ready.', 'ok');
    } catch (err) {
      setStatus(err?.message || '3D preview could not be rendered.', 'error');
      logger.error('3D preview could not be rendered.', err);
    }
  }

  return {
    setModel,
    resize,
    dispose() {
      if (state.frameId) cancelAnimationFrame(state.frameId);
      state.resizeObserver?.disconnect?.();
      window.removeEventListener('resize', resize);
      state.controls?.dispose?.();
      state.renderer?.dispose?.();
      canvasHost.replaceChildren();
    },
  };
}
