export function createSite3DLifecycleController({
  windowRef,
  documentRef,
  state,
  site3d,
  THREE,
  canvas,
  wrap,
  getElement,
  logger,
  installThreeRenderCanvas,
  handleSite3DPointerUp,
  renderSite3D,
  updateEmptyImageOverlay,
  updateSite3D,
  draw,
}) {
  function ensureSite3dView() {
    let view = getElement('site3dView');
    if (view) return view;
    view = documentRef.createElement('div');
    view.id = 'site3dView';
    view.className = 'site3dView';
    view.setAttribute('aria-label', '3D site view');
    wrap.insertBefore(view, canvas.nextSibling);
    return view;
  }

  function initSite3D() {
    if (site3d.initialized) return true;
    site3d.view = ensureSite3dView();
    if (typeof THREE === 'undefined') {
      logger.warn('3D view unavailable: Three.js did not load.');
      return false;
    }
    site3d.scene = new THREE.Scene();
    site3d.scene.background = new THREE.Color(0xecece6);
    site3d.camera = new THREE.PerspectiveCamera(45, 1, .1, 5000);
    site3d.raycaster = new THREE.Raycaster();
    site3d.pointer = new THREE.Vector2();
    site3d.renderer = new THREE.WebGLRenderer({ antialias: true });
    site3d.renderer.localClippingEnabled = true;
    site3d.renderer.setPixelRatio(Math.min(windowRef.devicePixelRatio || 1, 2));
    site3d.renderer.domElement.draggable = false;
    site3d.renderer.domElement.addEventListener('selectstart', event => event.preventDefault());
    site3d.renderer.domElement.addEventListener('dragstart', event => event.preventDefault());
    site3d.renderer.domElement.addEventListener('pointerdown', event => {
      site3d.pointerDown = { x: event.clientX, y: event.clientY };
    });
    site3d.renderer.domElement.addEventListener('pointerup', handleSite3DPointerUp);
    site3d.view.appendChild(site3d.renderer.domElement);
    installThreeRenderCanvas(site3d.view, site3d.renderer.domElement);
    const ambient = new THREE.AmbientLight(0xffffff, .72);
    const directional = new THREE.DirectionalLight(0xffffff, .82);
    directional.position.set(160, 220, 140);
    site3d.scene.add(ambient, directional);
    site3d.root = new THREE.Group();
    site3d.scene.add(site3d.root);
    if (THREE.OrbitControls) {
      site3d.controls = new THREE.OrbitControls(site3d.camera, site3d.renderer.domElement);
      site3d.controls.enableDamping = false;
      site3d.controls.addEventListener('change', renderSite3D);
    }
    site3d.initialized = true;
    resizeSite3D();
    return true;
  }

  function resizeSite3D() {
    if (!site3d.initialized || !site3d.renderer || !site3d.camera) return;
    const bounds = (site3d.view || ensureSite3dView()).getBoundingClientRect();
    const width = Math.max(1, Math.floor(bounds.width));
    const height = Math.max(1, Math.floor(bounds.height));
    site3d.camera.aspect = width / height;
    site3d.camera.updateProjectionMatrix();
    site3d.renderer.setSize(width, height, false);
    renderSite3D();
  }

  function setSite3DMode(on) {
    state.viewMode = on ? '3d' : '2d';
    wrap.classList.toggle('view3d', state.viewMode === '3d');
    documentRef.querySelector('.sitePlannerApp')?.classList.toggle('view3d', state.viewMode === '3d');
    getElement('view2dCanvasBtn')?.classList.toggle('active', state.viewMode !== '3d');
    getElement('view3dCanvasBtn')?.classList.toggle('active', state.viewMode === '3d');
    updateEmptyImageOverlay();
    if (state.viewMode === '3d') updateSite3D({ preserveCamera: site3d.initialized });
    else draw();
  }

  documentRef.addEventListener('selectstart', event => {
    if (state.viewMode === '3d' && event.target?.closest?.('.canvasWrap')) event.preventDefault();
  });

  return { initSite3D, resizeSite3D, setSite3DMode };
}
