const { expect, test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

function readSelectedDetailController() {
  return fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'sidebar-selected-detail-controller.js'), 'utf8');
}

test.describe('Site Planner module split contracts', () => {
  test('canvas hover previews are wired through their renderer module', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const renderer = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'canvas-hover-preview-renderer.js'), 'utf8');

    expect(source).toContain("import { createCanvasHoverPreviewRenderer } from './site-planner/canvas-hover-preview-renderer.js';");
    expect(source).toContain('const { drawHoverPreview } = createCanvasHoverPreviewRenderer({');
    expect(source).not.toContain('function drawHoverPreview(){');
    expect(renderer).toContain('export function createCanvasHoverPreviewRenderer');
    expect(renderer).toContain('githubPlacementPreviewPolygon(placement, placement.previewPoint, mmToPx)');
    expect(renderer).toContain('const hoverPreview = state.hoverPreview;');
  });

  test('group selection affordances are wired through their controller module', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'group-selection-controller.js'), 'utf8');

    expect(source).toContain("import { createGroupSelectionController } from './site-planner/group-selection-controller.js';");
    expect(source).toContain('} = createGroupSelectionController({');
    expect(source).not.toContain('function groupSelectionPointCloud(');
    expect(source).not.toContain('function drawGroupSelectionAffordance(){');
    expect(controller).toContain('export function createGroupSelectionController');
    expect(controller).toContain('function hitGroupRotationHandle');
    expect(controller).toContain('function drawGroupSelectionAffordance');
  });

  test('rail-crossing detail controls are wired through their sidebar module', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const detail = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'sidebar-rail-crossing-detail.js'), 'utf8');

    expect(source).toContain("import { renderRailCrossingDetail } from './site-planner/sidebar-rail-crossing-detail.js';");
    expect(source).toContain("import { createSidebarSelectedDetailController } from './site-planner/sidebar-selected-detail-controller.js';");
    expect(readSelectedDetailController()).toContain('} if(railCrossing){renderRailCrossingDetail({');
    expect(source).not.toContain('const updateRailCrossingOverride=patch=>');
    expect(detail).toContain('export function renderRailCrossingDetail');
    expect(detail).toContain('railCrossingSurveyTemplate');
    expect(detail).toContain('railCrossingRegistrationMarks');
  });

  test('track detail controls are wired through their sidebar module', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const detail = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'sidebar-track-detail.js'), 'utf8');

    expect(source).toContain("import { renderTrackDetail } from './site-planner/sidebar-track-detail.js';");
    expect(readSelectedDetailController()).toContain('} if(track){renderTrackDetail({');
    expect(source).not.toContain('const bindTrack=(id,fn)=>');
    expect(detail).toContain('export function renderTrackDetail');
    expect(detail).toContain('deleteTrackPoint');
    expect(detail).toContain('syncTrackMetrics(track)');
  });

  test('benchwork detail controls are wired through their sidebar module', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const detail = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'sidebar-benchwork-detail.js'), 'utf8');

    expect(source).toContain("import { renderBenchworkDetail } from './site-planner/sidebar-benchwork-detail.js';");
    expect(readSelectedDetailController()).toContain('} if(bench){renderBenchworkDetail({');
    expect(source).not.toContain('const bindBench=(id,fn)=>');
    expect(detail).toContain('export function renderBenchworkDetail');
    expect(detail).toContain("getElement('clearBenchCurves').onclick");
    expect(detail).toContain("getElement('deleteBench').onclick");
  });

  test('streetlight detail controls are wired through their sidebar module', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const detail = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'sidebar-streetlight-detail.js'), 'utf8');

    expect(source).toContain("import { renderStreetlightDetail } from './site-planner/sidebar-streetlight-detail.js';");
    expect(readSelectedDetailController()).toContain('} if(light){renderStreetlightDetail({');
    expect(source).not.toContain("$('dupSl').onclick=()=>");
    expect(detail).toContain('export function renderStreetlightDetail');
    expect(detail).toContain("installAdaptiveDegreeStepping(getElement('slRot'))");
    expect(detail).toContain("getElement('dupSl').onclick");
  });

  test('fabric detail controls are wired through their sidebar module', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const detail = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'sidebar-fabric-detail.js'), 'utf8');

    expect(source).toContain("import { renderFabricDetail } from './site-planner/sidebar-fabric-detail.js';");
    expect(readSelectedDetailController()).toContain('} else if(fabric){renderFabricDetail({');
    expect(source).not.toContain('const bindFabric=(id,fn)=>');
    expect(detail).toContain('export function renderFabricDetail');
    expect(detail).toContain('generateFabricForRegion(fabricRegion, { confirmReplace: true })');
    expect(detail).toContain("getElement('deleteFabricRegion').onclick");
  });

  test('STL detail controls are wired through their sidebar module', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const detail = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'sidebar-stl-detail.js'), 'utf8');

    expect(source).toContain("import { renderStlDetail } from './site-planner/sidebar-stl-detail.js';");
    expect(readSelectedDetailController()).toContain('} else if(stl){renderStlDetail({');
    expect(source).not.toContain('const bindStl=(id,fn)=>');
    expect(detail).toContain('export function renderStlDetail');
    expect(detail).toContain("data-stl-source-download");
    expect(detail).toContain('attachSourceFileToStlObject(stlObject, file)');
  });

  test('road feature detail controls are wired through their sidebar module', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const detail = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'sidebar-road-feature-detail.js'), 'utf8');

    expect(source).toContain("import { renderRoadFeatureDetail } from './site-planner/sidebar-road-feature-detail.js';");
    expect(readSelectedDetailController()).toContain('} if(roadFeature){renderRoadFeatureDetail({');
    expect(detail).toContain('export function renderRoadFeatureDetail');
    expect(detail).toContain('applyRoadMarkingPreset(roadFeature');
    expect(detail).toContain('setPhysicalGrateMode(roadFeature');
    expect(detail).toContain('setRoadMarkingOutputMode(roadFeature');
  });

  test('road detail controls are wired through their sidebar module', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const detail = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'sidebar-road-detail.js'), 'utf8');

    expect(source).toContain("import { renderRoadDetail } from './site-planner/sidebar-road-detail.js';");
    expect(readSelectedDetailController()).toContain('} if(road){renderRoadDetail({');
    expect(detail).toContain('export function renderRoadDetail');
    expect(detail).toContain('roadIntersectionMarkingControls.bindFeatureToggles()');
    expect(detail).toContain('roadSystem.realignRoadMarkingsForRoad(road.id)');
  });

  test('track item detail controls are wired through their sidebar module', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const detail = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'sidebar-track-accessory-detail.js'), 'utf8');

    expect(source).toContain("import { renderTrackAccessoryDetail } from './site-planner/sidebar-track-accessory-detail.js';");
    expect(readSelectedDetailController()).toContain('if(trackAccessory){renderTrackAccessoryDetail({');
    expect(detail).toContain('export function renderTrackAccessoryDetail');
    expect(detail).toContain('nearestTrackEndpointAnchor');
    expect(detail).toContain('attachTrackAccessoryToAnchor(trackAccessory, anchor)');
    expect(detail).toContain('syncTracksConnectedToTrackSwitch(trackAccessory)');
  });

  test('track switch endpoint connection behavior lives in its dedicated controller', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'track-switch-connection-controller.js'), 'utf8');

    expect(source).toContain("import { createTrackSwitchConnectionController } from './site-planner/track-switch-connection-controller.js';");
    expect(source).toContain('function ensureTrackSwitchConnectionController()');
    expect(controller).toContain('export function createTrackSwitchConnectionController');
    expect(controller).toContain('function snapTrackSwitchToEndpoint');
    expect(controller).toContain('function syncTracksConnectedToTrackSwitch');
  });

  test('track accessory anchoring lives outside the Site Planner monolith', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'track-accessory-anchor-controller.js'), 'utf8');

    expect(source).toContain("import { createTrackAccessoryAnchorController } from './site-planner/track-accessory-anchor-controller.js';");
    expect(source).toContain('function ensureTrackAccessoryAnchorController()');
    expect(controller).toContain('export function createTrackAccessoryAnchorController');
    expect(controller).toContain('function nearestTrackAccessoryAnchor');
    expect(controller).toContain('function refreshTrackAccessoryAnchor');
  });

  test('auto-catenary placement retains standard spacing and avoids duplicate poles', async () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controllerSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'catenary-auto-placement-controller.js'), 'utf8');
    const { createCatenaryAutoPlacementController } = await import('../js/site-planner/catenary-auto-placement-controller.js');
    const state = {
      pxPerMm: 1,
      tracks: [{ id: 'track_1', pointsPx: [{ x: 0, y: 0 }, { x: 95, y: 0 }] }],
      trackAccessories: [],
    };
    let nextId = 0;
    const controller = createCatenaryAutoPlacementController({
      state,
      catenarySpacingModelMm: 30,
      catenaryPrototypeSpacingM: 30,
      mmToPx: value => value,
      normalizeTrack: track => track,
      normalizeTrackAccessory: item => item,
      sampledTrackSegments: () => ({ total: 95 }),
      trackPointAtDistance: (trackId, distance) => ({
        trackId,
        point: { x: distance, y: 0 },
        normal: { x: 0, y: 1 },
        pathDistancePx: distance,
        angleDeg: 0,
      }),
      nearestTrackAccessoryAnchor: () => null,
      trackAccessorySnapDistance: () => 56,
      attachTrackAccessoryToAnchor: (item, anchor) => {
        item.trackId = anchor.trackId;
        item.trackAnchor = { trackId: anchor.trackId, pathDistancePx: anchor.pathDistancePx, offsetPx: 0 };
        return true;
      },
      trackAccessoryPreset: () => ({ label: 'Catenary Pole', color: '#aaa', defaultNotes: 'test' }),
      uid: () => `pole_${++nextId}`,
      fmt: value => String(value),
      hitTrack: () => state.tracks[0],
      clearBuildingSelection: () => {},
      syncAll: () => {},
      showStatusHint: () => {},
    });

    expect(source).toContain("import { createCatenaryAutoPlacementController } from './site-planner/catenary-auto-placement-controller.js';");
    expect(source).toContain('function ensureCatenaryAutoPlacementController()');
    expect(controllerSource).toContain('export function createCatenaryAutoPlacementController');
    expect(controller.applyCatenaryToTrack('track_1')).toMatchObject({ created: 4, skipped: 0, spacingModelMm: 30 });
    expect(state.trackAccessories.map(item => item.trackAnchor.pathDistancePx)).toEqual([0, 30, 60, 95]);
    expect(controller.applyCatenaryToTrack('track_1')).toMatchObject({ created: 0, skipped: 4 });
  });

  test('track task setup and Track-mode actions live in a dedicated controller', async () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controllerSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'track-tool-task-controller.js'), 'utf8');
    const { createTrackToolTaskController } = await import('../js/site-planner/track-tool-task-controller.js');
    const catenaryButton = { dataset: { trackAction: 'catenaryAutoSection' } };
    const state = { trackTask: null, catenarySectionDraft: { pending: true } };
    const events = [];
    const statusHint = { textContent: '' };
    const controller = createTrackToolTaskController({
      state,
      documentRef: { querySelectorAll: selector => selector === '[data-track-action]' ? [catenaryButton] : [] },
      windowRef: { matchMedia: () => ({ matches: false }) },
      getElement: id => id === 'statusHint' ? statusHint : null,
      setWorkspaceMode: (...args) => events.push(['workspace', ...args]),
      setActiveTool: (...args) => events.push(['tool', ...args]),
      renderSelected: () => events.push(['selected']),
      draw: () => events.push(['draw']),
      setSidebarOpen: value => events.push(['sidebar', value]),
      updateWorkspaceModeUi: () => events.push(['ui']),
      trackAccessoryLabel: action => action,
      isTrackAccessoryAction: () => false,
      isCatenaryAutoSectionAction: action => action === 'catenaryAutoSection',
      fmt: value => String(value),
      catenarySpacingModelMm: 30,
      catenaryPrototypeSpacingM: 30,
    });

    expect(source).toContain("import { createTrackToolTaskController } from './site-planner/track-tool-task-controller.js';");
    expect(source).toContain('trackToolTaskController.bindTrackActionControls();');
    expect(source).not.toContain('function beginCatenaryAutoSection(){');
    expect(controllerSource).toContain('export function createTrackToolTaskController');
    expect(controllerSource).toContain('function beginTrackAccessoryPlacement');
    expect(controllerSource).toContain('function beginCatenaryAutoSection');

    controller.bindTrackActionControls();
    catenaryButton.onclick();

    expect(state.trackTask).toBe('catenaryAutoSection');
    expect(state.catenarySectionDraft).toBeNull();
    expect(events).toContainEqual(['tool', 'select', { preserveTrackTask: true }]);
    expect(events).toContainEqual(['sidebar', true]);
    expect(statusHint.textContent).toContain('30 mm spacing');
  });

  test('road task setup and Road-mode actions live in a dedicated controller', async () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controllerSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'road-tool-task-controller.js'), 'utf8');
    const { createRoadToolTaskController } = await import('../js/site-planner/road-tool-task-controller.js');
    const modeButton = { dataset: { roadModeTool: 'outline' } };
    const intersectionsButton = { dataset: { roadAction: 'intersections' } };
    const state = { roadMode: 'centerline', roadTask: null, roadExportPreview: false, selectedRoadId: null };
    const events = [];
    const statusHint = { textContent: '' };
    const controller = createRoadToolTaskController({
      state,
      documentRef: {
        querySelectorAll: selector => selector === '[data-road-mode-tool]'
          ? [modeButton]
          : selector === '[data-road-action]' ? [intersectionsButton] : [],
      },
      getElement: id => id === 'statusHint' ? statusHint : null,
      setWorkspaceMode: (...args) => events.push(['workspace', ...args]),
      setActiveTool: (...args) => events.push(['tool', ...args]),
      updateRoadToolButton: () => events.push(['road-button']),
      roadSystem: { generatedRoadIntersections: () => events.push(['intersections']) },
      renderSelected: () => events.push(['selected']),
      draw: () => events.push(['draw']),
      setSidebarOpen: value => events.push(['sidebar', value]),
      updateWorkspaceModeUi: () => events.push(['ui']),
      setRoadExportPreview: () => events.push(['preview']),
      openRoadExportReview: () => events.push(['export']),
    });

    expect(source).toContain("import { createRoadToolTaskController } from './site-planner/road-tool-task-controller.js';");
    expect(source).toContain('roadToolTaskController.bindRoadToolControls();');
    expect(source).not.toContain("document.querySelectorAll('[data-road-action]').forEach(btn=>btn.onclick=()=>{");
    expect(controllerSource).toContain('export function createRoadToolTaskController');
    expect(controllerSource).toContain('function bindRoadToolControls');

    controller.bindRoadToolControls();
    modeButton.onclick();
    intersectionsButton.onclick();

    expect(state.roadMode).toBe('outline');
    expect(state.roadTask).toBe('intersections');
    expect(events).toContainEqual(['tool', 'road']);
    expect(events).toContainEqual(['tool', 'select', { preserveRoadTask: true }]);
    expect(events).toContainEqual(['intersections']);
    expect(events).toContainEqual(['sidebar', true]);
    expect(statusHint.textContent).toContain('Select a road');
  });

  test('canvas keyboard shortcuts and selection deletion live in a dedicated controller', async () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controllerSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-canvas-keyboard-controller.js'), 'utf8');
    const { createSiteCanvasKeyboardController } = await import('../js/site-planner/site-canvas-keyboard-controller.js');
    const listeners = new Map();
    const events = [];
    const state = { selectedRoadId: 'road_1', buildings: [] };
    const noop = () => {};
    const controller = createSiteCanvasKeyboardController({
      state,
      windowRef: { addEventListener: (type, handler) => listeners.set(type, handler) },
      hideContextMenu: noop,
      cancelGithubBuildingPlacement: () => false,
      renderSelected: noop,
      draw: noop,
      deleteSelectedAnnotation: noop,
      deleteSelectedRoadFeature: noop,
      deleteSelectedStreetlight: noop,
      deleteSelectedRoad: () => events.push('road'),
      currentSelectedBuildingIds: () => [],
      deleteSelectedTrackAccessory: noop,
      deleteSelectedTrackPoint: noop,
      deleteSelectedTrack: noop,
      deleteSelectedStlObject: noop,
      deleteSelectedBenchwork: noop,
      deleteSelectedFabricRegion: noop,
      clearBuildingSelection: noop,
      syncAll: noop,
      undo: noop,
      redo: noop,
      copySelectedFootprint: () => false,
      copySelectedSiteObject: () => false,
      pasteSiteObjectFromClipboard: noop,
      pasteFootprintFromClipboard: noop,
      finishPolygon: noop,
      finishBenchworkOutline: noop,
      finishRoadOutline: noop,
      finishRoadCenterline: noop,
      finishTrack: noop,
    });

    expect(source).toContain("import { createSiteCanvasKeyboardController } from './site-planner/site-canvas-keyboard-controller.js';");
    expect(source).toContain('siteCanvasKeyboardController.bindKeyboardShortcuts();');
    expect(source).not.toContain("window.addEventListener('keydown', e=>{");
    expect(controllerSource).toContain('export function createSiteCanvasKeyboardController');
    expect(controllerSource).toContain('function deleteCurrentSelection');
    expect(controllerSource).toContain('function bindKeyboardShortcuts');

    controller.bindKeyboardShortcuts();
    let prevented = false;
    listeners.get('keydown')({ key: 'Delete', target: null, preventDefault: () => { prevented = true; } });

    expect(events).toEqual(['road']);
    expect(prevented).toBe(true);
  });

  test('canvas pointer completion and double-click drafts live in a dedicated controller', async () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controllerSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-canvas-pointer-finish-controller.js'), 'utf8');
    const { createSiteCanvasPointerFinishController } = await import('../js/site-planner/site-canvas-pointer-finish-controller.js');
    const events = [];
    const state = {
      pointers: new Map([[7, { x: 1, y: 1 }]]),
      drag: { type: 'rect', pointerId: 7, preview: { id: 'building_1' } },
      buildings: [],
      view: { scale: 1 },
      roads: [],
    };
    const noop = () => {};
    const controller = createSiteCanvasPointerFinishController({
      state,
      canvas: { classList: { remove: name => events.push(`remove:${name}`) } },
      clearCanvasBrowserSelection: () => events.push('clear-browser'),
      clearLongPress: () => events.push('clear-press'),
      draw: noop,
      setBuildingSelection: (...args) => events.push(['select-buildings', ...args]),
      renderList: noop,
      renderSelected: noop,
      updateHandoff: noop,
      selectionRectFromPoints: noop,
      buildingsInSelectionRect: () => [],
      setSelectedSiteObjects: noop,
      clearBuildingSelection: noop,
      clearSelectedSiteObjects: noop,
      dist: () => 10,
      renderRoads: noop,
      selected: () => null,
      buildingFootprintChanged: () => false,
      confirmProtectedBuildingResize: async () => true,
      cloneSitePlannerValue: value => value,
      restoreBuildingSnapshot: noop,
      syncAll: () => events.push('sync'),
      screenToWorld: noop,
      hitRoad: () => null,
      renderStreetlights: noop,
      finishRoadCenterline: noop,
      finishRoadOutline: noop,
      finishTrack: noop,
    });

    expect(source).toContain("import { createSiteCanvasPointerFinishController } from './site-planner/site-canvas-pointer-finish-controller.js';");
    expect(source).toContain("canvas.addEventListener('pointerup', siteCanvasPointerFinishController.finishPointer);");
    expect(source).not.toContain('async function finishPointer(e){');
    expect(controllerSource).toContain('export function createSiteCanvasPointerFinishController');
    expect(controllerSource).toContain('async function finishPointer');
    expect(controllerSource).toContain('function handleCanvasDoubleClick');

    await controller.finishPointer({ pointerId: 7 });

    expect(state.pointers.has(7)).toBe(false);
    expect(state.buildings).toEqual([{ id: 'building_1' }]);
    expect(state.drag).toBeNull();
    expect(events).toContainEqual(['select-buildings', ['building_1'], 'building_1']);
    expect(events).toContain('sync');
  });

  test('idle canvas hover state lives in a dedicated controller', async () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controllerSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-canvas-hover-controller.js'), 'utf8');
    const { createSiteCanvasHoverController } = await import('../js/site-planner/site-canvas-hover-controller.js');
    const state = {};
    let draws = 0;
    const noHit = () => null;
    const controller = createSiteCanvasHoverController({
      state,
      draw: () => { draws += 1; },
      hitStreetlight: noHit,
      selectedRoad: noHit,
      hitRoadOutlineSegment: noHit,
      hitRoadCenterlineSegment: noHit,
      hitBenchworkSegment: noHit,
      selectedBenchwork: noHit,
      hitBenchwork: noHit,
      hitRoad: noHit,
      hitTrackAccessory: noHit,
      hitTrack: noHit,
      selectedTrack: noHit,
      hitTrackSegment: noHit,
      hitStlObject: noHit,
      hitTest: noHit,
      selected: noHit,
      handleAt: noHit,
    });

    expect(source).toContain("import { createSiteCanvasHoverController } from './site-planner/site-canvas-hover-controller.js';");
    expect(source).toContain('siteCanvasHoverController.handleIdlePointerMove(e,p)');
    expect(source).not.toContain('const hoverL=hitStreetlight(p,e.pointerType);');
    expect(controllerSource).toContain('export function createSiteCanvasHoverController');
    expect(controllerSource).toContain('function handleIdlePointerMove');

    expect(controller.handleIdlePointerMove({ pointerType: 'mouse', buttons: 0 }, { x: 12, y: 18 })).toBe(true);
    expect(state.hoverPreview).toBeNull();
    expect(state.hoverRoadId).toBeNull();
    expect(draws).toBe(1);
  });

  test('active canvas drag mutation lives in a dedicated controller', async () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controllerSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-canvas-pointer-move-controller.js'), 'utf8');
    const { createSiteCanvasPointerMoveController } = await import('../js/site-planner/site-canvas-pointer-move-controller.js');
    const building = { id: 'building_1', padType: 'rect', x: 10, y: 20 };
    const state = {
      drag: { type: 'move', start: { x: 10, y: 20 }, orig: { id: 'building_1', padType: 'rect', x: 10, y: 20 } },
      buildings: [building],
    };
    const metrics = [];
    const controller = createSiteCanvasPointerMoveController({
      state,
      syncBuildingMetrics: item => metrics.push(item.id),
    });

    expect(source).toContain("import { createSiteCanvasPointerMoveController } from './site-planner/site-canvas-pointer-move-controller.js';");
    expect(source).toContain('siteCanvasPointerMoveController.handleActivePointerMove(e,p);');
    expect(source).not.toContain('const d=state.drag;');
    expect(controllerSource).toContain('export function createSiteCanvasPointerMoveController');
    expect(controllerSource).toContain('function handleActivePointerMove');
    expect(controllerSource).toContain("else if(d.type==='moveTrackAccessory')");
    expect(controllerSource).toContain("else if(d.type==='roadPoint')");

    controller.handleActivePointerMove({ pointerType: 'mouse' }, { x: 34, y: 51 });

    expect(building).toMatchObject({ x: 34, y: 51 });
    expect(metrics).toEqual(['building_1']);
  });

  test('canvas pointer-down routing lives in a dedicated controller', async () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controllerSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-canvas-pointer-down-controller.js'), 'utf8');
    const { createSiteCanvasPointerDownController } = await import('../js/site-planner/site-canvas-pointer-down-controller.js');
    const events = [];
    const state = { pointers: new Map(), drag: null };
    const controller = createSiteCanvasPointerDownController({
      state,
      canvas: {
        setPointerCapture: pointerId => events.push(['capture', pointerId]),
        classList: { add: name => events.push(['class', name]) },
      },
      clearCanvasBrowserSelection: () => events.push('clear-browser'),
      hideContextMenu: () => events.push('hide-menu'),
      pointerSnapshot: () => ({ x: 1, y: 2 }),
      startPanFromPointer: () => { state.drag = {}; },
    });

    expect(source).toContain("import { createSiteCanvasPointerDownController } from './site-planner/site-canvas-pointer-down-controller.js';");
    expect(source).toContain("canvas.addEventListener('pointerdown', e=>siteCanvasPointerDownController.handlePointerDown(e), {passive:false});");
    expect(source).not.toContain("canvas.addEventListener('pointerdown', e=>{");
    expect(controllerSource).toContain('export function createSiteCanvasPointerDownController');
    expect(controllerSource).toContain('function handlePointerDown');
    expect(controllerSource).toContain('if(state.tool===\'track\')');
    expect(controllerSource).toContain('if(state.tool===\'road\')');

    let prevented = false;
    controller.handlePointerDown({ pointerId: 9, button: 2, buttons: 2, clientX: 40, clientY: 60, preventDefault: () => { prevented = true; } });

    expect(prevented).toBe(true);
    expect(state.pointers.get(9)).toEqual({ x: 1, y: 2 });
    expect(state.drag).toMatchObject({ rightButtonPan: true, moved: false, startClient: { x: 40, y: 60 } });
    expect(events).toEqual(expect.arrayContaining([['capture', 9], ['class', 'panning']]));
  });

  test('page-level controls live in a dedicated controller', async () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controllerSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-page-controls-controller.js'), 'utf8');
    const { createSitePageControlsController } = await import('../js/site-planner/site-page-controls-controller.js');
    const controls = new Map();
    const createControl = () => ({
      classList: { toggle: (...args) => events.push(['toggle', ...args]) },
      addEventListener: (type, handler) => { controls.get('loadFile').listeners[type] = handler; },
      listeners: {},
      textContent: '',
    });
    const events = [];
    for (const id of ['opacity', 'inputMode', 'snapBtn', 'saveBtn', 'githubSaveBtn', 'mobileSaveBtn']) controls.set(id, createControl());
    const state = { annotations: [], inputMode: 'mouse', snapOn: false, view: {}, roadExportPreview: false };
    const controller = createSitePageControlsController({
      state,
      getElement: id => controls.get(id) || null,
      installTooltips: () => events.push('tooltips'),
      installReferenceImageImport: () => events.push('image-import'),
      draw: () => events.push('draw'),
      modelKnownMm: () => 0,
      dist: () => 0,
      showStatusHint: () => {},
      confirmFn: () => true,
      syncAll: () => {},
      renderSelected: () => {},
      markDirty: () => {},
      fitImage: () => {},
      clearCacheAndReset: () => {},
      openGithubSettings: () => {},
      openGithubSitePlans: () => {},
      openGithubBuildings: () => {},
      saveCurrentSitePlan: () => events.push('save-current'),
      saveSitePlanToGithub: options => events.push(['save-github', options]),
      undo: () => {}, redo: () => {}, deleteSelectedAnnotation: () => {},
      isLikelyStlFile: () => false, importStlAsSiteObject: async () => {},
      openImportProgressModal: () => {}, isSiteBundlePackageFile: () => false, setImportProgress: () => {},
      loadSitePlanBundle: async () => {}, loadProjectJsonObject: async () => {},
      finishImportProgress: () => {}, failImportProgress: () => {},
      setRoadExportPreview: () => {}, openRoadExportReview: () => {}, downloadText: () => {},
      csvExport: () => '', svgExport: () => '', exportSelectedSeed: () => {},
      updatePrimarySaveUi: () => events.push('save-ui'),
    });

    expect(source).toContain("import { createSitePageControlsController } from './site-planner/site-page-controls-controller.js';");
    expect(source).toContain('sitePageControlsController.bindPageControls();');
    expect(source).not.toContain("$('inputMode').onchange=e=>");
    expect(controllerSource).toContain('export function createSitePageControlsController');
    expect(controllerSource).toContain('function bindReferenceImageControls');
    expect(controllerSource).toContain('function bindProjectControls');

    controller.bindPageControls();
    controls.get('inputMode').onchange({ target: { value: 'pencil' } });
    controls.get('snapBtn').onclick();
    controls.get('saveBtn').onclick();
    controls.get('githubSaveBtn').onclick();

    expect(state.inputMode).toBe('pencil');
    expect(state.snapOn).toBe(true);
    expect(events).toEqual(expect.arrayContaining(['tooltips', 'image-import', 'save-ui', 'save-current', ['save-github', { reuseCurrent: true }], ['toggle', 'active', true]]));
  });

  test('track accessory placement and interaction live outside the Site Planner monolith', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'track-accessory-interaction-controller.js'), 'utf8');

    expect(source).toContain("import { createTrackAccessoryInteractionController } from './site-planner/track-accessory-interaction-controller.js';");
    expect(source).toContain('function ensureTrackAccessoryInteractionController()');
    expect(controller).toContain('export function createTrackAccessoryInteractionController');
    expect(controller).toContain('function placeTrackAccessory');
    expect(controller).toContain('function hitTrackAccessoryRotationHandle');
    expect(controller).toContain('function deleteSelectedTrackAccessory');
  });

  test('road intersection detail controls are wired through their sidebar module', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const detail = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'sidebar-road-intersection-detail.js'), 'utf8');

    expect(source).toContain("import { renderRoadIntersectionDetail } from './site-planner/sidebar-road-intersection-detail.js';");
    expect(readSelectedDetailController()).toContain('} if(roadIntersection){renderRoadIntersectionDetail({');
    expect(detail).toContain('export function renderRoadIntersectionDetail');
    expect(detail).toContain('roadSystem.setRoadIntersectionOverride');
    expect(detail).toContain('roadSystem.clearRoadIntersectionOverride');
  });

  test('multi-building detail controls are wired through their sidebar module', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const detail = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'sidebar-multi-building-detail.js'), 'utf8');

    expect(source).toContain("import { renderMultiBuildingDetail } from './site-planner/sidebar-multi-building-detail.js';");
    expect(readSelectedDetailController()).toContain('renderMultiBuildingDetail({');
    expect(source).not.toContain("$('clearMultiB').onclick=()=>");
    expect(detail).toContain('export function renderMultiBuildingDetail');
    expect(detail).toContain("getElement('deleteMultiB').onclick");
  });

  test('annotation detail controls are wired through their sidebar module', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const detail = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'sidebar-annotation-detail.js'), 'utf8');

    expect(source).toContain("import { renderAnnotationDetail } from './site-planner/sidebar-annotation-detail.js';");
    expect(readSelectedDetailController()).toContain('renderAnnotationDetail({ annotation: note');
    expect(detail).toContain('export function renderAnnotationDetail');
    expect(detail).toContain("getElement('delNoteB')");
  });

  test('building detail controls are wired through their sidebar module', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const detail = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'sidebar-building-detail.js'), 'utf8');

    expect(source).toContain("import { renderBuildingDetail } from './site-planner/sidebar-building-detail.js';");
    expect(readSelectedDetailController()).toContain('renderBuildingDetail({');
    expect(source).not.toContain("const bind=(id,fn)=>{const e=$(id)");
    expect(detail).toContain('export function renderBuildingDetail');
    expect(detail).toContain('attachHakoFileToSelectedBuilding');
    expect(detail).toContain('openBuildingInHakoMachi(building)');
    expect(detail).toContain('copyHakoSeedForBuilding(building)');
  });

  test('sidebar drill-in behavior is wired through a shared detail controller', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'sidebar-detail-controller.js'), 'utf8');

    expect(source).toContain("import { createSidebarDetailController } from './site-planner/sidebar-detail-controller.js';");
    expect(source).toContain('sidebarDetailController=createSidebarDetailController({');
    expect(source).toContain('sidebarDetailController?.applySidebarDrillIn();');
    expect(source).toContain('closeSidebarBuildingOverflow:()=>sidebarDetailController?.closeBuildingOverflow()');
    expect(source).not.toContain('function bindSidebarBuildingOverflowActions()');
    expect(controller).toContain('export function createSidebarDetailController');
    expect(controller).toContain('function clearDetailSelection()');
    expect(controller).toContain('function bindBuildingOverflowActions()');
    expect(controller).toContain('function applySidebarDrillIn()');
    expect(controller).toContain('return { applySidebarDrillIn, closeBuildingOverflow };');
  });

  test('canvas drag geometry and gesture helpers are wired through their controller', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-canvas-gesture-controller.js'), 'utf8');

    expect(source).toContain("import { createSiteCanvasGestureController } from './site-planner/site-canvas-gesture-controller.js';");
    expect(source).toContain('} = createSiteCanvasGestureController({');
    expect(source).not.toContain('function resizeRectFromCorner(');
    expect(source).not.toContain('function startPinchIfNeeded()');
    expect(controller).toContain('export function createSiteCanvasGestureController');
    expect(controller).toContain('function resizeRectFromCorner(');
    expect(controller).toContain('function scalePolygonFromCornerDrag(');
    expect(controller).toContain('function startPinchIfNeeded()');
    expect(controller).toContain('function updatePinch()');
  });

  test('reference-image import and drop behavior is wired through the existing UI controller', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'reference-image-ui.js'), 'utf8');
    const pageControls = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-page-controls-controller.js'), 'utf8');

    expect(source).toContain('installReferenceImageImport,');
    expect(source).toContain('sitePageControlsController.bindPageControls();');
    expect(source).not.toContain('async function loadReferenceImage(file)');
    expect(source).not.toContain('async function handleEmptyImageDrop(file)');
    expect(controller).toContain('async function loadReferenceImage(file)');
    expect(controller).toContain('function installReferenceImageImport()');
    expect(controller).toContain('pageHakoImportFileFromDataTransfer(event.dataTransfer)');
    expect(pageControls).toContain('installReferenceImageImport();');
  });

  test('cache reset behavior is wired through the Site Planner reset controller', () => {
    const source=fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller=fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-reset-controller.js'), 'utf8');

    expect(source).toContain("import { createSiteResetController } from './site-planner/site-reset-controller.js';");
    expect(source).toContain('const { clearCacheAndReset } = createSiteResetController({');
    expect(source).not.toContain('async function clearCacheAndReset(){');
    expect(controller).toContain('export function createSiteResetController');
    expect(controller).toContain("resetHistory('reset');");
    expect(controller).toContain("updateAutosaveStatus('Autosave: cleared');");
  });

  test('sidebar input binding stays shared across standard object panels', async () => {
    const binder = await import('../js/site-planner/sidebar-input-binding.js');
    const files = ['sidebar-benchwork-detail.js', 'sidebar-fabric-detail.js', 'sidebar-stl-detail.js', 'sidebar-streetlight-detail.js', 'sidebar-track-detail.js'];

    files.forEach(file => {
      const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', file), 'utf8');
      expect(source).toContain("import { createSidebarInputBinder } from './sidebar-input-binding.js';");
      expect(source).toContain('const { bindInput } = createSidebarInputBinder({');
    });

    const element = { type: 'checkbox', checked: true, value: 'ignored', oninput: null };
    let received = null;
    let refreshes = 0;
    const { bindInput } = binder.createSidebarInputBinder({
      getElement: id => id === 'enabled' ? element : null,
      afterInput: () => { refreshes += 1; },
    });
    bindInput('enabled', value => { received = value; });
    element.oninput();
    expect(received).toBe(true);
    expect(refreshes).toBe(1);
  });

  test('flex-track 2D rendering is wired through its renderer module', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const renderer = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'track-renderer-2d.js'), 'utf8');

    expect(source).toContain("import { createTrackRenderer2D } from './site-planner/track-renderer-2d.js';");
    expect(source).toContain('trackRenderer2D=createTrackRenderer2D({');
    expect(source).toContain('function drawTrack(raw){ return ensureTrackRenderer2D().drawTrack(raw); }');
    expect(source).not.toContain("drawTrackModelPath(path,t.roadbedColor||TRACK_PROFILE_DEFAULTS.roadbedColor");
    expect(renderer).toContain('export function createTrackRenderer2D');
    expect(renderer).toContain('trackTieSegments(track).forEach');
    expect(renderer).toContain("drawRoadGeneratedPath(path, 'rgba(200,74,58,.45)', 1, [4, 4])");
    expect(renderer).toContain('state.hoverTrackSegment.trackId === track.id');
  });

  test('rail-crossing 2D rendering is wired through its renderer module', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const renderer = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'rail-crossing-renderer-2d.js'), 'utf8');

    expect(source).toContain("import { createRailCrossingRenderer2D } from './site-planner/rail-crossing-renderer-2d.js';");
    expect(source).toContain('railCrossingRenderer2D=createRailCrossingRenderer2D({ctx,state,drawLabel,generatedRailCrossings,railCrossingInfillPanels});');
    expect(source).toContain('return ensureRailCrossingRenderer2D().drawGeneratedRailCrossings();');
    expect(source).not.toContain('function drawRailCrossingPanelTexture');
    expect(source).not.toContain('function drawRailCrossingIndicator');
    expect(renderer).toContain('export function createRailCrossingRenderer2D');
    expect(renderer).toContain('function drawRailCrossingPanelTexture');
    expect(renderer).toContain('function drawRailCrossingIndicator');
    expect(renderer).toContain('function drawGeneratedRailCrossings');
  });

  test('generated intersection marking controls live outside the site planner monolith', async () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controllerSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'road-intersection-marking-controls.js'), 'utf8');
    const { createRoadIntersectionMarkingControls } = await import('../js/site-planner/road-intersection-marking-controls.js');

    expect(source).toContain("import { createRoadIntersectionMarkingControls } from './site-planner/road-intersection-marking-controls.js';");
    expect(source).toContain('roadIntersectionMarkingControls = createRoadIntersectionMarkingControls({');
    expect(source).not.toContain('function selectedRoadIntersectionArmSettings');
    expect(source).not.toContain('function roadIntersectionFeatureControlsHtml');
    expect(controllerSource).toContain('export function createRoadIntersectionMarkingControls');
    expect(controllerSource).toContain('function selectedRoadIntersectionFeatureRows');

    const generated = [{
      overrideKey: 'node:a',
      arms: [{ roadId: 'road_1', endpoint: 'start' }],
      stopBars: [{ roadId: 'road_1', endpoint: 'start', laneSide: 'left' }],
      tactilePavers: [{ roadId: 'road_1', endpoint: 'start', side: 'near' }],
      crosswalks: [{ roadId: 'road_1', endpoint: 'start' }],
      curbReturns: [],
    }];
    const patches = [];
    const featureToggles = [];
    let syncCount = 0;
    const elements = {
      roadIntersectionStopBars: { checked: false, onchange: null },
      clearRoadIntersectionArmOverrides: { onclick: null },
    };
    const featureToggle = {
      checked: false,
      dataset: {
        intersectionKey: 'node:a',
        armKey: 'road_1:start',
        featureKey: 'stopBar:road_1:start:left',
      },
      onchange: null,
    };
    const controller = createRoadIntersectionMarkingControls({
      state: { roadIntersectionOverrides: {} },
      roadSystem: {
        generatedRoadIntersections: () => generated,
        rawGeneratedRoadIntersections: () => generated,
        setRoadIntersectionArmOverrides: (roadId, patch) => patches.push({ roadId, patch }),
        setRoadIntersectionFeatureOverride: (...args) => featureToggles.push(args),
        clearRoadIntersectionArmOverrides: roadId => patches.push({ roadId, clear: true }),
      },
      escapeAttr: value => String(value).replace(/"/g, '&quot;'),
      escapeHtml: value => String(value).replace(/</g, '&lt;'),
      syncAll: () => { syncCount += 1; },
      doc: {
        getElementById: id => elements[id] || null,
        querySelectorAll: selector => (selector === '.roadIntersectionFeatureToggle' ? [featureToggle] : []),
      },
    });

    const html = controller.controlsHtml('road_1');
    expect(html).toContain('Intersection markings');
    expect(html).toContain('Stop bars on this road');
    expect(html).toContain('data-feature-key="stopBar:road_1:start:left"');

    controller.bindArmCheckbox('roadIntersectionStopBars', 'road_1', 'stopBarEnabled');
    elements.roadIntersectionStopBars.onchange();
    controller.bindFeatureToggles();
    featureToggle.onchange();
    controller.bindClearArmOverrides('road_1');
    elements.clearRoadIntersectionArmOverrides.onclick();

    expect(patches).toEqual([
      { roadId: 'road_1', patch: { stopBarEnabled: false } },
      { roadId: 'road_1', clear: true },
    ]);
    expect(featureToggles).toEqual([['node:a', 'road_1:start', 'stopBar:road_1:start:left', false]]);
    expect(syncCount).toBe(3);
  });

  test('toolbar tooltip behavior is wired through the tooltip controller', async () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controllerSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'tool-tooltip-controller.js'), 'utf8');
    const { createToolTooltipController } = await import('../js/site-planner/tool-tooltip-controller.js');

    expect(source).toContain("import { createToolTooltipController } from './site-planner/tool-tooltip-controller.js';");
    expect(source).toContain('} = createToolTooltipController({clamp});');
    expect(source).not.toContain('function ensureToolTooltip()');
    expect(source).not.toContain('function showToolTooltip(el, opts={})');

    expect(controllerSource).toContain('export function createToolTooltipController');
    expect(controllerSource).toContain('function installTooltips()');

    const listeners = {};
    const classNames = new Set();
    const tooltip = {
      id: '',
      className: '',
      textContent: '',
      offsetWidth: 80,
      offsetHeight: 20,
      style: {},
      attrs: {},
      classList: {
        add: value => classNames.add(value),
        remove: value => classNames.delete(value),
        contains: value => classNames.has(value),
      },
      setAttribute(name, value) {
        this.attrs[name] = value;
      },
    };
    const button = {
      title: '',
      textContent: '',
      attrs: { 'aria-label': 'Select tool' },
      listeners,
      getAttribute(name) {
        return this.attrs[name];
      },
      addEventListener(type, handler) {
        this.listeners[type] = handler;
      },
      getBoundingClientRect() {
        return { right: 20, top: 10, height: 24 };
      },
    };
    const doc = {
      body: { appendChild: el => { doc.appended = el; } },
      appended: null,
      createElement: () => tooltip,
      querySelectorAll: selector => (selector === '.toolbar button[aria-label]' ? [button] : []),
    };
    const win = {
      innerWidth: 300,
      innerHeight: 200,
      addEventListener(type, handler) {
        listeners[`window:${type}`] = handler;
      },
    };

    const controller = createToolTooltipController({
      doc,
      win,
      clamp: (value, min, max) => Math.max(min, Math.min(max, value)),
    });
    controller.installTooltips();
    listeners.pointerenter();

    expect(doc.appended).toBe(tooltip);
    expect(tooltip.id).toBe('toolTooltip');
    expect(tooltip.textContent).toBe('Select tool');
    expect(tooltip.attrs['aria-hidden']).toBe('false');
    expect(classNames.has('visible')).toBe(true);
    expect(tooltip.style.left).toBe('28px');

    listeners.pointerleave();
    expect(tooltip.attrs['aria-hidden']).toBe('true');
    expect(classNames.has('visible')).toBe(false);
  });

  test('toolbar variant buttons are wired through the variant controller', async () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controllerSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'tool-variant-controller.js'), 'utf8');
    const { createToolVariantController, roadModeLabel } = await import('../js/site-planner/tool-variant-controller.js');

    expect(source).toContain("import { createToolVariantController } from './site-planner/tool-variant-controller.js';");
    expect(source).toContain('const toolVariantController = createToolVariantController({');
    expect(source).toContain('toolVariantController.installToolVariantControls();');
    expect(source).not.toContain('function updateRoadToolButton()');
    expect(source).not.toContain('function trackSwitchToolTask()');

    expect(controllerSource).toContain('export function createToolVariantController');
    expect(controllerSource).toContain('function updateRoadToolButton()');
    expect(controllerSource).toContain('function installToolVariantControls()');
    expect(roadModeLabel('marking')).toBe('Road Marking');
    expect(roadModeLabel('outline')).toBe('Road Outline');

    const classNames = new Set();
    const makeElement = () => ({
      dataset: {},
      textContent: '',
      title: '',
      attrs: {},
      listeners: {},
      classList: {
        toggle: (name, on) => (on ? classNames.add(name) : classNames.delete(name)),
      },
      setAttribute(name, value) {
        this.attrs[name] = value;
      },
      addEventListener(type, handler) {
        this.listeners[type] = handler;
      },
    });
    const elements = {
      roadToolBtn: makeElement(),
      roadToolIcon: makeElement(),
      roadToolLabel: makeElement(),
    };
    const roadMenuButton = makeElement();
    roadMenuButton.dataset.roadMode = 'marking';
    const state = { roadMode: 'marking', workspaceMode: 'road', trackTask: null };
    let iconName = '';
    let workspaceUpdates = 0;
    const controller = createToolVariantController({
      state,
      getElement: id => elements[id] || null,
      doc: {
        querySelectorAll: selector => (selector === '#roadToolMenu button' ? [roadMenuButton] : []),
        addEventListener: () => {},
      },
      win: { addEventListener: () => {} },
      setIcon: (_el, name) => { iconName = name; },
      hydrateIcons: () => {},
      toggleToolFlyout: () => {},
      hideToolFlyouts: () => {},
      setActiveTool: () => {},
      beginTrackAccessoryPlacement: () => {},
      beginCatenaryAutoSection: () => {},
      isCatenaryAutoSectionAction: action => action === 'catenaryAutoSection',
      updateWorkspaceModeUi: () => { workspaceUpdates += 1; },
    });

    controller.updateRoadToolButton();

    expect(elements.roadToolLabel.textContent).toBe('Road Marking');
    expect(elements.roadToolBtn.attrs['aria-label']).toBe('Road Marking');
    expect(elements.roadToolIcon.dataset.icon).toBe('roadMarking');
    expect(iconName).toBe('roadMarking');
    expect(classNames.has('active')).toBe(true);
    expect(workspaceUpdates).toBe(1);
  });

  test('workspace mode and active tool behavior is wired through its controller', async () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controllerSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'workspace-mode-controller.js'), 'utf8');
    const {
      createWorkspaceModeController,
      normalizeWorkspaceMode,
    } = await import('../js/site-planner/workspace-mode-controller.js');

    expect(source).toContain("import { createWorkspaceModeController } from './site-planner/workspace-mode-controller.js';");
    expect(source).toContain('} = createWorkspaceModeController({');
    expect(source).not.toContain('function maybeFinishActiveRoadDraft');
    expect(source).not.toContain('function setWorkspaceMode(mode, opts={})');

    expect(controllerSource).toContain('export function createWorkspaceModeController');
    expect(controllerSource).toContain('function setActiveTool(tool, opts = {})');
    expect(normalizeWorkspaceMode('road')).toBe('road');
    expect(normalizeWorkspaceMode('track')).toBe('track');
    expect(normalizeWorkspaceMode('bogus')).toBe('layout');

    const classNames = new Map();
    const makeButton = dataset => ({
      dataset,
      classList: {
        toggle(name, on) {
          classNames.set(`${dataset.tool || dataset.roadModeTool || dataset.roadAction || dataset.trackAction}:${name}`, !!on);
        },
      },
    });
    const selectButton = makeButton({ tool: 'select' });
    const roadButton = makeButton({ roadModeTool: 'centerline' });
    const exportPreviewButton = makeButton({ roadAction: 'exportPreview' });
    const trackDrawButton = makeButton({ trackAction: 'draw' });
    const appClasses = new Map();
    const app = { classList: { toggle: (name, on) => appClasses.set(name, !!on) } };
    const picker = { value: 'layout' };
    const previewBtn = { title: '', attrs: {}, setAttribute(name, value) { this.attrs[name] = value; } };
    const doc = {
      querySelector: selector => (selector === '.sitePlannerApp' ? app : null),
      querySelectorAll: selector => {
        if (selector === '.toolbtn') return [selectButton, roadButton, exportPreviewButton, trackDrawButton];
        if (selector === '[data-road-mode-tool]') return [roadButton];
        if (selector === '[data-road-action]') return [exportPreviewButton];
        if (selector === '[data-track-action]') return [trackDrawButton];
        return [];
      },
    };
    const state = {
      tool: 'road',
      workspaceMode: 'road',
      roadMode: 'centerline',
      roadTask: 'intersections',
      roadDraft: [{ x: 0, y: 0 }, { x: 10, y: 0 }],
      trackTask: 'draw',
      trackDraft: [],
      roadExportPreview: true,
      catenarySectionDraft: { active: true },
      drag: { type: 'move' },
    };
    let finishedRoad = 0;
    let hiddenFlyouts = 0;
    let synced = 0;
    const controller = createWorkspaceModeController({
      state,
      getElement: id => (id === 'workspaceMode' ? picker : id === 'roadCutPreviewModeBtn' ? previewBtn : null),
      doc,
      finishRoadCenterline: () => { finishedRoad += 1; state.roadDraft = []; },
      finishRoadOutline: () => {},
      finishTrack: () => {},
      hideToolFlyouts: () => { hiddenFlyouts += 1; },
      updateToolButtons: {
        updateTrackSwitchToolButton: () => {},
        updateTrackBufferToolButton: () => {},
        updateCatenaryToolButton: () => {},
      },
      updateStatus: () => {},
      draw: () => {},
      syncAll: () => { synced += 1; },
    });

    controller.setActiveTool('select');

    expect(finishedRoad).toBe(1);
    expect(state.tool).toBe('select');
    expect(state.roadTask).toBe(null);
    expect(state.trackTask).toBe(null);
    expect(state.catenarySectionDraft).toBe(null);
    expect(state.drag).toBe(null);
    expect(hiddenFlyouts).toBe(1);
    expect(synced).toBe(1);
    expect(classNames.get('select:active')).toBe(true);

    controller.setWorkspaceMode('track', { preserveTrackTask: true });
    expect(state.workspaceMode).toBe('track');
    expect(picker.value).toBe('track');
    expect(appClasses.get('trackWorkspace')).toBe(true);
    expect(previewBtn.attrs['aria-label']).toBe('Cut preview on');
  });

  test('generic canvas drawing helpers are wired through the drawing controller', async () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controllerSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'canvas-drawing-utils.js'), 'utf8');
    const { createCanvasDrawingController } = await import('../js/site-planner/canvas-drawing-utils.js');

    expect(source).toContain("import { createCanvasDrawingController } from './site-planner/canvas-drawing-utils.js';");
    expect(source).toContain('} = createCanvasDrawingController({');
    expect(source).not.toContain('function drawGrid()');
    expect(source).not.toContain('function drawSelectionMarquee()');

    expect(controllerSource).toContain('export function createCanvasDrawingController');
    expect(controllerSource).toContain('function drawGrid()');
    expect(controllerSource).toContain('function drawLine(line, color, label)');

    const calls = [];
    const ctx = {
      save: () => calls.push(['save']),
      restore: () => calls.push(['restore']),
      beginPath: () => calls.push(['beginPath']),
      moveTo: (x, y) => calls.push(['moveTo', x, y]),
      lineTo: (x, y) => calls.push(['lineTo', x, y]),
      stroke: () => calls.push(['stroke']),
      fill: () => calls.push(['fill']),
      fillRect: (x, y, w, h) => calls.push(['fillRect', x, y, w, h]),
      strokeRect: (x, y, w, h) => calls.push(['strokeRect', x, y, w, h]),
      fillText: (text, x, y) => calls.push(['fillText', text, x, y]),
      arc: (x, y, r) => calls.push(['arc', x, y, r]),
      setLineDash: value => calls.push(['setLineDash', value]),
      measureText: text => ({ width: text.length * 6 }),
      set font(value) { calls.push(['font', value]); },
      set fillStyle(value) { calls.push(['fillStyle', value]); },
      set strokeStyle(value) { calls.push(['strokeStyle', value]); },
      set lineWidth(value) { calls.push(['lineWidth', value]); },
    };
    const canvas = {
      getBoundingClientRect: () => ({ left: 0, top: 0, right: 100, bottom: 80 }),
    };
    const state = {
      pxPerMm: 2,
      view: { scale: 1 },
      drag: { type: 'marquee', start: { x: 5, y: 4 }, end: { x: 25, y: 14 } },
    };
    const controller = createCanvasDrawingController({
      canvas,
      ctx,
      state,
      mmToPx: mm => mm * state.pxPerMm,
      screenToWorld: event => ({ x: event.clientX, y: event.clientY }),
      selectionRectFromPoints: (a, b) => ({
        x: Math.min(a.x, b.x),
        y: Math.min(a.y, b.y),
        w: Math.abs(a.x - b.x),
        h: Math.abs(a.y - b.y),
      }),
    });

    controller.drawLabel('Depot', { x: 10, y: 20 });
    controller.drawLine({ x1: 0, y1: 0, x2: 20, y2: 10 }, '#123456', 'measure');
    controller.drawSelectionMarquee();
    controller.drawGrid();

    expect(calls).toEqual(expect.arrayContaining([
      ['fillText', 'Depot', 14, 15],
      ['moveTo', 0, 0],
      ['lineTo', 20, 10],
      ['strokeRect', 5, 4, 20, 10],
    ]));
    expect(calls.some(call => call[0] === 'setLineDash')).toBe(true);
    expect(calls.filter(call => call[0] === 'stroke').length).toBeGreaterThan(1);
  });

  test('building generator handoff behavior is wired through the handoff controller', async () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controllerSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'hako-handoff-controller.js'), 'utf8');
    const resizeProtectionSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'building-resize-protection.js'), 'utf8');
    const pointerFinishSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-canvas-pointer-finish-controller.js'), 'utf8');
    const lifecycleSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-runtime-lifecycle-controller.js'), 'utf8');
    const detailSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'sidebar-building-detail.js'), 'utf8');
    const { createHakoHandoffController } = await import('../js/site-planner/hako-handoff-controller.js');

    expect(source).toContain("import { createHakoHandoffController } from './site-planner/hako-handoff-controller.js';");
    expect(source).toContain("import { createBuildingResizeProtectionController } from './site-planner/building-resize-protection.js';");
    expect(source).toContain('} = createHakoHandoffController({');
    expect(source).toContain('} = createBuildingResizeProtectionController({');
    expect(lifecycleSource).toContain('await applySitePlannerBuildingUpdate(payload)');
    expect(source).toContain('confirmBuildingResize: (building, details={}) => confirmProtectedBuildingResize');
    expect(source).toContain("import { renderBuildingDetail } from './site-planner/sidebar-building-detail.js';");
    expect(detailSource).toContain("applySelectedBuildingDimensionInput(building, 'width', width.value, width)");
    expect(pointerFinishSource).toContain("drag.type === 'rectCorner' || drag.type === 'polyPoint'");
    expect(source).not.toContain('function sitePlannerBuildingUpdatePayload(data)');
    expect(source).not.toContain('function ensureBuildingResizeConfirmModal');

    expect(controllerSource).toContain('export function createHakoHandoffController');
    expect(controllerSource).toContain('function makeSeed(b)');
    expect(controllerSource).toContain('async function applySitePlannerBuildingUpdate(raw, opts = {})');
    expect(controllerSource).toContain('async function processQueuedSitePlannerBuildingUpdate()');
    expect(resizeProtectionSource).toContain('export function createBuildingResizeProtectionController');
    expect(resizeProtectionSource).toContain('<button type="button" id="buildingResizeCancel">Cancel</button>');
    expect(resizeProtectionSource).toContain('<button type="button" id="buildingResizeReplace" class="primary">Replace</button>');
    expect(resizeProtectionSource).toContain('async function confirmProtectedBuildingResize');

    const state = {
      projectName: 'Akiba Module',
      buildings: [{
        id: 'b1',
        name: 'Corner Shop',
        padType: 'rect',
        category: 'commercial',
        state: 'notStarted',
        x: 100,
        y: 120,
        widthMm: 20,
        depthMm: 12,
        widthPx: 200,
        depthPx: 120,
        rotationDeg: 0,
      }],
    };
    const statusHint = { textContent: '' };
    const selectedIds = [];
    const controller = createHakoHandoffController({
      state,
      autosaveKey: 'autosave-key',
      buildingUpdateKey: 'building-update-key',
      getElement: () => null,
      selected: () => state.buildings[0],
      normalizeBuilding: building => building,
      syncBuildingMetrics: building => building,
      deriveFootprintFromHakoConfig: cfg => ({ padType: 'rect', widthMm: cfg.width, depthMm: cfg.depth }),
      buildingCenter: building => ({ x: building.x, y: building.y }),
      mmToPx: value => value * 10,
      rad: degrees => degrees * Math.PI / 180,
      slug: value => String(value).toLowerCase().replace(/\s+/g, '-'),
      setBuildingSelection: ids => selectedIds.splice(0, selectedIds.length, ...ids),
      syncAll: () => {},
      statusHintElement: () => statusHint,
    });

    const seed = controller.makeSeed(state.buildings[0]);
    expect(seed.sitePlannerHandoff.sitePlan.name).toBe('Akiba Module');
    expect(seed.sitePlannerHandoff.building.plannerId).toBe('b1');
    expect(seed.footprint).toEqual({ type: 'rect', widthMm: 20, depthMm: 12, rotationDeg: 0 });

    const result = await controller.applySitePlannerBuildingUpdate({
      payload: {
        schema: 'hakomachi.building-update',
        buildingId: 'b1',
        buildingName: 'Updated Corner Shop',
        hakoConfig: { buildingName: 'Updated Corner Shop', width: 26, depth: 14 },
        updatedAt: '2026-07-06T00:00:00.000Z',
      },
    });

    expect(result).toEqual({ buildingId: 'b1', buildingName: 'Corner Shop' });
    expect(state.buildings[0].state).toBe('inProgress');
    expect(state.buildings[0].hakoFile.fileName).toBe('updated-corner-shop.hako');
    expect(state.buildings[0].widthPx).toBe(260);
    expect(state.buildings[0].depthPx).toBe(140);
    expect(selectedIds).toEqual(['b1']);
    expect(statusHint.textContent).toBe('Updated Corner Shop from Building Generator.');
  });

  test('building generator handoff can cancel resizing an attached building', async () => {
    const { createHakoHandoffController } = await import('../js/site-planner/hako-handoff-controller.js');
    const makeState = () => ({
      projectName: 'Akiba Module',
      buildings: [{
        id: 'b1',
        name: 'Corner Shop',
        padType: 'rect',
        category: 'commercial',
        state: 'inProgress',
        x: 100,
        y: 120,
        widthMm: 20,
        depthMm: 12,
        widthPx: 200,
        depthPx: 120,
        rotationDeg: 0,
        hakoFile: {
          fileName: 'corner-shop.hako',
          parsedConfig: { buildingName: 'Corner Shop', width: 20, depth: 12 },
        },
        hakoFileId: 'corner-shop.hako',
      }],
    });
    const makeController = (state, confirmBuildingResize, statusHint = { textContent: '' }) => createHakoHandoffController({
      state,
      autosaveKey: 'autosave-key',
      buildingUpdateKey: 'building-update-key',
      getElement: () => null,
      selected: () => state.buildings[0],
      normalizeBuilding: building => building,
      syncBuildingMetrics: building => {
        building.widthMm = building.widthPx / 10;
        building.depthMm = building.depthPx / 10;
        return building;
      },
      deriveFootprintFromHakoConfig: cfg => ({ padType: 'rect', widthMm: cfg.width, depthMm: cfg.depth }),
      buildingCenter: building => ({ x: building.x, y: building.y }),
      mmToPx: value => value * 10,
      rad: degrees => degrees * Math.PI / 180,
      slug: value => String(value).toLowerCase().replace(/\s+/g, '-'),
      setBuildingSelection: () => {},
      syncAll: () => {},
      statusHintElement: () => statusHint,
      confirmBuildingResize,
    });
    const updatePayload = {
      schema: 'hakomachi.building-update',
      buildingId: 'b1',
      buildingName: 'Updated Corner Shop',
      hakoConfig: { buildingName: 'Updated Corner Shop', width: 30, depth: 18 },
      updatedAt: '2026-07-06T00:00:00.000Z',
    };

    const canceledStatus = { textContent: '' };
    const canceledState = makeState();
    const canceledCalls = [];
    const canceled = await makeController(canceledState, (_building, details) => {
      canceledCalls.push(details);
      return false;
    }, canceledStatus).applySitePlannerBuildingUpdate(updatePayload);

    expect(canceled).toBe(false);
    expect(canceledCalls).toHaveLength(1);
    expect(canceledCalls[0]).toMatchObject({
      source: 'building-generator-update',
      fileName: 'updated-corner-shop.hako',
      currentSize: { widthMm: 20, depthMm: 12 },
      incomingSize: { widthMm: 30, depthMm: 18 },
    });
    expect(canceledState.buildings[0].hakoFile.fileName).toBe('corner-shop.hako');
    expect(canceledState.buildings[0].widthPx).toBe(200);
    expect(canceledState.buildings[0].depthPx).toBe(120);
    expect(canceledStatus.textContent).toBe('Canceled update for Corner Shop.');

    const confirmedState = makeState();
    const confirmed = await makeController(confirmedState, () => true).applySitePlannerBuildingUpdate(updatePayload);
    expect(confirmed).toEqual({ buildingId: 'b1', buildingName: 'Corner Shop' });
    expect(confirmedState.buildings[0].hakoFile.fileName).toBe('updated-corner-shop.hako');
    expect(confirmedState.buildings[0].widthPx).toBe(300);
    expect(confirmedState.buildings[0].depthPx).toBe(180);

    const returnedState = makeState();
    const returnedCalls = [];
    const returned = await makeController(returnedState, (_building, details) => {
      returnedCalls.push(details);
      return false;
    }).applySitePlannerBuildingUpdate({ ...updatePayload, returnToSitePlanner: true });
    expect(returned).toEqual({ buildingId: 'b1', buildingName: 'Corner Shop' });
    expect(returnedCalls).toHaveLength(0);
    expect(returnedState.buildings[0].hakoFile.fileName).toBe('updated-corner-shop.hako');
    expect(returnedState.buildings[0].widthPx).toBe(300);
    expect(returnedState.buildings[0].depthPx).toBe(180);
  });

  test('GitHub building library previews are wired through a dedicated renderer module', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const renderer = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'github-building-preview-renderer.js'), 'utf8');

    expect(source).toContain("import { createGithubBuildingPreviewRenderer } from './site-planner/github-building-preview-renderer.js';");
    expect(source).toContain('function ensureGithubBuildingPreviewRenderer()');
    expect(source).toContain('return ensureGithubBuildingPreviewRenderer().githubBuildingPreviewConfig(record, parsedConfig)');
    expect(source).toContain('return ensureGithubBuildingPreviewRenderer().renderGithubBuildingStill(target, cfg, label)');
    expect(source).toContain('return ensureGithubBuildingPreviewRenderer().upgradeGithubBuildingPreviewFromHako(settings, record, target)');
    expect(source).not.toContain('function disposeGithubPreviewObject(obj)');
    expect(renderer).toContain('function githubBuildingPreviewConfig(record, parsedConfig = null)');
    expect(renderer).toContain('function disposeGithubPreviewObject(obj)');
    expect(renderer).toContain('sharedRenderer.buildBuildingPreviewGroup(cfg, { includeStlOverlay: false })');
    expect(renderer).toContain("target.textContent = '3D preview unavailable'");
    expect(renderer).toContain('renderer?.forceContextLoss?.()');
    expect(renderer).toContain('const file = await readGithubFile(settings, path)');
  });

  test('road paint stencil specs preserve custom feature dimensions and stay off the road-deck engrave layer', async () => {
    const { paintStencilExportSpec } = await import('../js/site-planner/road-asset-export-specs.js');
    const { roadMarkingPresetByKey } = await import('../js/site-planner/road-marking-presets.js');
    const { roadAssetSvgExport } = await import('../js/site-planner/export-utils.js');
    const { svgFabricationAttrs, svgFeatureTransform, svgPathFromPoly } = await import('../js/site-planner/svg-export-utils.js');

    const normalizeRoadFeature = feature => ({ ...feature });
    const feature = {
      id: 'paint-stop-1',
      kind: 'marking',
      name: 'Custom stop stencil',
      markingPreset: 'stopLine',
      outputMode: 'paintStencil',
      stencilMaterialId: 'masking-film',
      widthPx: 60,
      depthPx: 10,
      x: 42,
      y: 24,
    };
    const markingPresetByKey = roadMarkingPresetByKey;
    const spec = paintStencilExportSpec(feature, 0, { normalizeRoadFeature, markingPresetByKey, pxPerMm: 10 });

    expect(spec.materialId).toBe('masking-film');
    expect(spec.preset.widthMm).toBe(6);
    expect(spec.preset.depthMm).toBe(1);
    expect(spec.preset.exportLayer).toBe('paintStencilCut');

    const roadSvg = roadAssetSvgExport({
      data: { roads: [], seams: [] },
      roadFeatures: [feature],
      width: 100,
      height: 80,
    }, {
      JP_ROAD_MARKING_STANDARD_ID: 'jp-urban',
      SVG_OP: { ENGRAVE: 'engrave', CUT_RETAINED: 'cut-retained', CUT_SCRAP: 'cut-scrap' },
      SVG_ENGRAVE: '#2271b1',
      SVG_RETAINED_CUT: '#d33',
      SVG_SCRAP_CUT: '#178a3b',
      escapeAttr: value => String(value ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
      escapeHtml: value => String(value ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
      markingPresetByKey,
      normalizeRoadFeature,
      polygonCenter: () => ({ x: 0, y: 0 }),
      svgFabricationAttrs,
      svgFeatureTransform,
      svgPathFromPoly,
    });

    expect(roadSvg).toContain('<g id="roadMarkingEtch"');
    expect(roadSvg).not.toContain('Custom stop stencil');
    expect(roadSvg).not.toContain('paint-stop-1');
  });

  test('road markings auto-orient from the nearest road tangent when placed', async () => {
    const { createRoadFeatureEditorController } = await import('../js/site-planner/road-feature-editor.js');
    const { rebuildRoadGeometry } = await import('../js/site-planner/road-geometry.js');
    const {
      applyRoadHatchPreset,
      applyRoadMarkingPreset,
      hatchPresetByKey,
      markingPresetByKey,
    } = await import('../js/site-planner/road-preset-utils.js');

    const state = {
      pxPerMm: 10,
      view: { scale: 1 },
      roads: [{
        id: 'road-1',
        mode: 'centerline',
        pointsPx: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
        widthPx: 30,
      }, {
        id: 'road-2',
        mode: 'centerline',
        pointsPx: [{ x: 160, y: 0 }, { x: 160, y: 100 }],
        widthPx: 30,
      }],
      roadFeatures: [],
      lastRoadMarkingPreset: 'stopLine',
    };
    const normalizeRoad = road => rebuildRoadGeometry(road);
    state.roads.forEach(normalizeRoad);
    const controller = createRoadFeatureEditorController({
      state,
      uid: prefix => `${prefix}-${state.roadFeatures.length + 1}`,
      mmToPx: value => value * 10,
      pxToMm: value => value / 10,
      roadPresetScaleContext: () => ({ pxPerMm: 10 }),
      normalizeRoad,
      applyRoadHatchPreset,
      applyRoadMarkingPreset,
      hatchPresetByKey,
      markingPresetByKey,
      defaultMarkingStandardId: 'jp-urban',
      syncAll: () => {},
    });

    const stopLine = controller.placeRoadFeature({ x: 50, y: 0 }, 'marking');
    expect(stopLine.rotationDeg).toBe(90);
    expect(stopLine.orientationMode).toBe('perpendicular');
    expect(stopLine.autoAlignedToRoad).toBe(true);

    state.lastRoadMarkingPreset = 'laneDashedCenter';
    const laneLine = controller.placeRoadFeature({ x: 60, y: 0 }, 'marking');
    expect(laneLine.rotationDeg).toBe(0);
    expect(laneLine.orientationMode).toBe('parallel');

    state.roads[0].pointsPx = [{ x: 0, y: 0 }, { x: 0, y: 100 }];
    normalizeRoad(state.roads[0]);
    laneLine.x = 0;
    laneLine.y = 60;
    expect(controller.alignRoadMarkingToRoad(laneLine)).toBe(true);
    expect(laneLine.rotationDeg).toBe(90);

    laneLine.x = 150;
    laneLine.y = 40;
    laneLine.orientationMode = 'manual';
    laneLine.rotationDeg = 17;
    controller.moveRoadFeature(laneLine, 10, 0);
    expect(laneLine.roadId).toBe('road-2');
    expect(laneLine.rotationDeg).toBe(17);
    expect(laneLine.orientationMode).toBe('manual');
    expect(controller.alignRoadMarkingToRoad(laneLine, { force: true })).toBe(true);
    expect(laneLine.orientationMode).toBe('parallel');
    expect(laneLine.rotationDeg).toBe(90);
  });

  test('road markings fit their cross-road axis to the selected road width', async () => {
    const { createRoadFeatureEditorController } = await import('../js/site-planner/road-feature-editor.js');
    const { rebuildRoadGeometry } = await import('../js/site-planner/road-geometry.js');
    const {
      applyRoadHatchPreset,
      applyRoadMarkingPreset,
      hatchPresetByKey,
      markingPresetByKey,
    } = await import('../js/site-planner/road-preset-utils.js');

    const state = {
      pxPerMm: 10,
      view: { scale: 1 },
      roads: [{
        id: 'narrow-road',
        mode: 'centerline',
        pointsPx: [{ x: 0, y: 0 }, { x: 120, y: 0 }],
        widthPx: 40,
      }],
      roadFeatures: [],
      lastRoadMarkingPreset: 'stopLine',
    };
    const normalizeRoad = road => rebuildRoadGeometry(road);
    normalizeRoad(state.roads[0]);
    const controller = createRoadFeatureEditorController({
      state,
      uid: prefix => `${prefix}-${state.roadFeatures.length + 1}`,
      mmToPx: value => value * 10,
      pxToMm: value => value / 10,
      roadPresetScaleContext: () => ({ pxPerMm: 10 }),
      normalizeRoad,
      applyRoadHatchPreset,
      applyRoadMarkingPreset,
      hatchPresetByKey,
      markingPresetByKey,
      defaultMarkingStandardId: 'jp-urban',
      syncAll: () => {},
    });

    const stopLine = controller.placeRoadFeature({ x: 40, y: 0 }, 'marking');
    expect(stopLine.widthMm).toBeCloseTo(3.6, 5);
    expect(stopLine.widthPx).toBeCloseTo(36, 5);
    expect(stopLine.depthMm).toBeCloseTo(0.45, 5);
    expect(stopLine.roadFitMode).toBe('road-bounds');
    expect(stopLine.roadFitAxis).toBe('width');

    state.lastRoadMarkingPreset = 'laneDashedCenter';
    const laneDash = controller.placeRoadFeature({ x: 60, y: 0 }, 'marking');
    expect(laneDash.widthMm).toBeCloseTo(9, 5);
    expect(laneDash.depthMm).toBeCloseTo(0.28, 5);
    expect(laneDash.roadFitMode).toBeUndefined();

    laneDash.depthMm = 3;
    laneDash.depthPx = 30;
    expect(controller.fitRoadMarkingToRoad(laneDash)).toBe(true);
    expect(laneDash.depthMm).toBeCloseTo(1.52, 5);
    expect(laneDash.depthPx).toBeCloseTo(15.2, 5);
    expect(laneDash.roadFitAxis).toBe('depth');

    stopLine.widthMm = 9;
    stopLine.widthPx = 90;
    expect(controller.fitRoadMarkingsForRoad('narrow-road')).toBe(1);
    expect(stopLine.widthMm).toBeCloseTo(3.6, 5);
    stopLine.rotationDeg = 0;
    expect(controller.realignRoadMarkingsForRoad('narrow-road')).toBe(2);
    expect(stopLine.rotationDeg).toBe(90);
  });

  test('sidewalk polygons are segmented away from crossing road surfaces', async () => {
    const {
      clippedRoadSidewalkPolygons,
      lineIntersection,
      rebuildRoadGeometry,
      roadSidewalkPolygons,
    } = await import('../js/site-planner/road-geometry.js');
    const { pointInPoly } = await import('../js/site-planner/geometry.js');
    const mainRoad = {
      id: 'main',
      mode: 'centerline',
      pointsPx: [{ x: 0, y: 0 }, { x: 120, y: 0 }],
      widthPx: 20,
      sidewalkSide: 'both',
      sidewalkWidthPx: 8,
    };
    const crossingRoad = {
      id: 'crossing',
      mode: 'centerline',
      pointsPx: [{ x: 60, y: -50 }, { x: 60, y: 50 }],
      widthPx: 24,
      sidewalkSide: 'none',
      sidewalkWidthPx: 0,
    };
    rebuildRoadGeometry(mainRoad);
    rebuildRoadGeometry(crossingRoad);

    const base = roadSidewalkPolygons(mainRoad);
    const clipped = clippedRoadSidewalkPolygons(mainRoad, [mainRoad, crossingRoad]);
    const intersects = (poly, clip) => {
      if (poly.some(point => pointInPoly(point, clip))) return true;
      if (clip.some(point => pointInPoly(point, poly))) return true;
      for (let i = 0; i < poly.length; i++) {
        for (let j = 0; j < clip.length; j++) {
          if (lineIntersection(poly[i], poly[(i + 1) % poly.length], clip[j], clip[(j + 1) % clip.length])) return true;
        }
      }
      return false;
    };

    expect(base).toHaveLength(2);
    expect(clipped.length).toBeGreaterThan(2);
    expect(clipped.every(sidewalk => !intersects(sidewalk.polygon, crossingRoad.roadPolygonPx))).toBe(true);
    expect(clipped.some(sidewalk => sidewalk.side === 'left')).toBe(true);
    expect(clipped.some(sidewalk => sidewalk.side === 'right')).toBe(true);
  });

  test('sidewalk intersections generate corner patches for cross, T, and angled roads', async () => {
    const {
      clippedRoadSidewalkPolygons,
      rebuildRoadGeometry,
    } = await import('../js/site-planner/road-geometry.js');
    const { pointInPoly } = await import('../js/site-planner/geometry.js');

    const centroid = polygon => polygon.reduce((sum, point) => ({
      x: sum.x + point.x / polygon.length,
      y: sum.y + point.y / polygon.length,
    }), { x: 0, y: 0 });
    const area = polygon => Math.abs(polygon.reduce((sum, point, index) => {
      const next = polygon[(index + 1) % polygon.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0) / 2);
    const rebuildAll = roads => {
      roads.forEach(rebuildRoadGeometry);
      roads.forEach(road => { road.sidewalkPolygonsPx = clippedRoadSidewalkPolygons(road, roads); });
      return roads;
    };
    const allCorners = roads => roads.flatMap(road => road.sidewalkPolygonsPx || []).filter(sidewalk => sidewalk.kind === 'intersectionSidewalkCorner');
    const roadSurfaceContainsCentroid = (roads, sidewalk) => roads.some(road => pointInPoly(centroid(sidewalk.polygon), road.roadPolygonPx || []));

    const crossRoads = rebuildAll([
      { id: 'cross-main', mode: 'centerline', pointsPx: [{ x: -80, y: 0 }, { x: 80, y: 0 }], widthPx: 20, sidewalkSide: 'both', sidewalkWidthPx: 8 },
      { id: 'cross-side', mode: 'centerline', pointsPx: [{ x: 0, y: -80 }, { x: 0, y: 80 }], widthPx: 20, sidewalkSide: 'both', sidewalkWidthPx: 8 },
    ]);
    const crossCorners = allCorners(crossRoads);
    expect(crossCorners.length).toBeGreaterThanOrEqual(4);
    expect(crossCorners.every(sidewalk => area(sidewalk.polygon) > 0.5)).toBe(true);
    expect(crossCorners.every(sidewalk => !roadSurfaceContainsCentroid(crossRoads, sidewalk))).toBe(true);

    const tRoads = rebuildAll([
      { id: 't-main', mode: 'centerline', pointsPx: [{ x: -90, y: 0 }, { x: 90, y: 0 }], widthPx: 22, sidewalkSide: 'both', sidewalkWidthPx: 8 },
      { id: 't-stem', mode: 'centerline', pointsPx: [{ x: 0, y: 0 }, { x: 0, y: 80 }], widthPx: 20, sidewalkSide: 'both', sidewalkWidthPx: 8 },
    ]);
    const firstAverageX = allCorners(tRoads).reduce((sum, sidewalk) => sum + centroid(sidewalk.polygon).x, 0) / allCorners(tRoads).length;
    expect(allCorners(tRoads).some(sidewalk => sidewalk.fromRoadId === 't-main' && sidewalk.toRoadId === 't-main')).toBe(true);
    tRoads[1].pointsPx = [{ x: 30, y: 0 }, { x: 30, y: 80 }];
    rebuildAll(tRoads);
    const movedAverageX = allCorners(tRoads).reduce((sum, sidewalk) => sum + centroid(sidewalk.polygon).x, 0) / allCorners(tRoads).length;
    expect(movedAverageX).toBeGreaterThan(firstAverageX + 10);

    const angledRoads = rebuildAll([
      { id: 'angled-main', mode: 'centerline', pointsPx: [{ x: -80, y: 0 }, { x: 80, y: 0 }], widthPx: 20, sidewalkSide: 'both', sidewalkWidthPx: 8 },
      { id: 'angled-diagonal', mode: 'centerline', pointsPx: [{ x: -65, y: -45 }, { x: 65, y: 45 }], widthPx: 20, sidewalkSide: 'both', sidewalkWidthPx: 8 },
    ]);
    const angledCorners = allCorners(angledRoads);
    expect(angledCorners.length).toBeGreaterThanOrEqual(4);
    expect(angledCorners.every(sidewalk => sidewalk.polygon.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)))).toBe(true);
    expect(angledCorners.every(sidewalk => area(sidewalk.polygon) > 0.5)).toBe(true);
    expect(angledCorners.every(sidewalk => sidewalk.polygon.length > 4)).toBe(true);
  });

  test('road asset SVG exports the same generated sidewalk intersection pieces as the canvas model', async () => {
    const {
      clippedRoadSidewalkPolygons,
      rebuildRoadGeometry,
    } = await import('../js/site-planner/road-geometry.js');
    const { polygonCenter } = await import('../js/site-planner/geometry.js');
    const { roadAssetSvgExport } = await import('../js/site-planner/export-utils.js');
    const { svgFabricationAttrs, svgFeatureTransform, svgPathFromPoly } = await import('../js/site-planner/svg-export-utils.js');
    const roads = [
      { id: 'svg-main', name: 'Main', mode: 'centerline', pointsPx: [{ x: -80, y: 0 }, { x: 80, y: 0 }], widthPx: 20, sidewalkSide: 'both', sidewalkWidthPx: 8 },
      { id: 'svg-cross', name: 'Cross', mode: 'centerline', pointsPx: [{ x: 0, y: -80 }, { x: 0, y: 80 }], widthPx: 20, sidewalkSide: 'both', sidewalkWidthPx: 8 },
    ];
    roads.forEach(rebuildRoadGeometry);
    roads.forEach(road => { road.sidewalkPolygonsPx = clippedRoadSidewalkPolygons(road, roads); });
    const sidewalkCount = roads.reduce((sum, road) => sum + (road.sidewalkPolygonsPx || []).length, 0);
    const cornerCount = roads.reduce((sum, road) => sum + (road.sidewalkPolygonsPx || []).filter(sidewalk => sidewalk.kind === 'intersectionSidewalkCorner').length, 0);

    const svg = roadAssetSvgExport({
      data: { roads, seams: [] },
      roadFeatures: [],
      width: 120,
      height: 120,
    }, {
      JP_ROAD_MARKING_STANDARD_ID: 'jp-urban',
      SVG_OP: { ENGRAVE: 'engrave', CUT_RETAINED: 'cut-retained', CUT_SCRAP: 'cut-scrap' },
      SVG_ENGRAVE: '#2271b1',
      SVG_RETAINED_CUT: '#d33',
      SVG_SCRAP_CUT: '#178a3b',
      escapeAttr: value => String(value ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
      escapeHtml: value => String(value ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
      markingPresetByKey: () => ({}),
      normalizeRoadFeature: feature => ({ ...feature }),
      polygonCenter,
      svgFabricationAttrs,
      svgFeatureTransform,
      svgPathFromPoly,
    });

    expect(cornerCount).toBeGreaterThanOrEqual(4);
    expect(svg.match(/_sidewalk_\d+"/g) || []).toHaveLength(sidewalkCount);
  });

  test('generated intersection stop bars default to Japanese left-hand inbound lanes', async () => {
    const { buildIntersectionNode } = await import('../js/site-planner/road-intersections.js');
    const { renderIntersectionSvgElements, serializeIntersectionStopBars } = await import('../js/site-planner/road-intersection-svg-export.js');
    const cluster = {
      center: { x: 0, y: 0 },
      arms: [
        { roadId: 'east-road', endpoint: 'start', point: { x: 0, y: 0 }, widthPx: 40, sidewalkWidthPx: 0, tangent: 0 },
        { roadId: 'west-road', endpoint: 'end', point: { x: 0, y: 0 }, widthPx: 40, sidewalkWidthPx: 0, tangent: Math.PI },
      ],
    };

    const leftHandNode = buildIntersectionNode(cluster, 0, { drivingSide: 'left' });
    const leftHandStop = leftHandNode.stopBars.find(stopBar => stopBar.roadId === 'east-road');
    expect(leftHandStop.laneScope).toBe('inboundLane');
    expect(leftHandStop.laneSide).toBe('left');
    expect(leftHandStop.widthPx).toBeLessThan(40);
    expect(leftHandStop.center.y).toBeGreaterThan(leftHandNode.center.y);

    const rightHandNode = buildIntersectionNode(cluster, 0, { drivingSide: 'right' });
    const rightHandStop = rightHandNode.stopBars.find(stopBar => stopBar.roadId === 'east-road');
    expect(rightHandStop.laneSide).toBe('right');
    expect(rightHandStop.center.y).toBeLessThan(rightHandNode.center.y);

    const fullWidthNode = buildIntersectionNode(cluster, 0, { drivingSide: 'left', stopBarLaneScope: 'fullRoad' });
    const fullWidthStop = fullWidthNode.stopBars.find(stopBar => stopBar.roadId === 'east-road');
    expect(fullWidthStop.laneSide).toBe('both');
    expect(fullWidthStop.widthPx).toBeGreaterThan(30);
    expect(fullWidthStop.center.y).toBeCloseTo(fullWidthNode.center.y, 5);

    const records = serializeIntersectionStopBars(leftHandNode);
    expect(records.find(record => record.roadId === 'east-road').laneSide).toBe('left');
    expect(renderIntersectionSvgElements(records)).toContain('data-lane-side="left"');
    expect(renderIntersectionSvgElements(records)).toContain('data-driving-side="left"');
  });

  test('generated intersection stop bars stay inside their owning road polygon', async () => {
    const { pointInPoly } = await import('../js/site-planner/geometry.js');
    const { buildIntersectionNode } = await import('../js/site-planner/road-intersections.js');
    const eastRoad = {
      id: 'east-road',
      roadPolygonPx: [{ x: 40, y: -20 }, { x: 92, y: -20 }, { x: 92, y: 0 }, { x: 40, y: 0 }],
    };
    const westRoad = {
      id: 'west-road',
      roadPolygonPx: [{ x: -92, y: -20 }, { x: -40, y: -20 }, { x: -40, y: 0 }, { x: -92, y: 0 }],
    };
    const cluster = {
      center: { x: 0, y: 0 },
      arms: [
        { road: eastRoad, roadId: 'east-road', endpoint: 'start', point: { x: 0, y: 0 }, widthPx: 40, sidewalkWidthPx: 0, tangent: 0 },
        { road: westRoad, roadId: 'west-road', endpoint: 'end', point: { x: 0, y: 0 }, widthPx: 40, sidewalkWidthPx: 0, tangent: Math.PI },
      ],
    };

    const node = buildIntersectionNode(cluster, 0, { drivingSide: 'left' });
    const eastStop = node.stopBars.find(stopBar => stopBar.roadId === 'east-road');
    const westStop = node.stopBars.find(stopBar => stopBar.roadId === 'west-road');

    expect(eastStop.laneSide).toBe('right');
    expect(eastStop.corners.every(point => pointInPoly(point, eastRoad.roadPolygonPx))).toBe(true);
    expect(westStop.corners.every(point => pointInPoly(point, westRoad.roadPolygonPx))).toBe(true);
  });

  test('generated intersection markings can be disabled at individual feature level', async () => {
    const { buildIntersectionNode } = await import('../js/site-planner/road-intersections.js');
    const {
      applyIntersectionOverrides,
      intersectionFeatureKey,
      setArmFeatureOverride,
    } = await import('../js/site-planner/road-intersection-overrides.js');
    const { serializeIntersectionStopBars } = await import('../js/site-planner/road-intersection-svg-export.js');
    const cluster = {
      center: { x: 0, y: 0 },
      arms: [
        { roadId: 'east-road', endpoint: 'start', point: { x: 0, y: 0 }, widthPx: 40, sidewalkWidthPx: 0, tangent: 0 },
        { roadId: 'west-road', endpoint: 'end', point: { x: 0, y: 0 }, widthPx: 40, sidewalkWidthPx: 0, tangent: Math.PI },
      ],
    };
    const node = buildIntersectionNode(cluster, 0, { drivingSide: 'left' });
    const eastStop = node.stopBars.find(stopBar => stopBar.roadId === 'east-road');
    const eastStopKey = intersectionFeatureKey('stopBar', eastStop, node.stopBars.indexOf(eastStop));

    const overrides = setArmFeatureOverride({}, node, 'east-road:start', eastStopKey, false);
    const [filtered] = applyIntersectionOverrides([node], overrides);

    expect(filtered.stopBars.some(stopBar => stopBar.roadId === 'east-road')).toBe(false);
    expect(filtered.stopBars.some(stopBar => stopBar.roadId === 'west-road')).toBe(true);
    expect(serializeIntersectionStopBars(filtered).some(record => record.roadId === 'east-road')).toBe(false);

    const restoredOverrides = setArmFeatureOverride(overrides, node, 'east-road:start', eastStopKey, true);
    const [restored] = applyIntersectionOverrides([node], restoredOverrides);
    expect(restored.stopBars.some(stopBar => stopBar.roadId === 'east-road')).toBe(true);
  });

  test('generated intersection nodes preserve editable object-level overrides', async () => {
    const { buildIntersectionNode } = await import('../js/site-planner/road-intersections.js');
    const {
      applyIntersectionOverrides,
      normalizeIntersectionOverride,
      removeIntersectionOverride,
      upsertIntersectionOverride,
    } = await import('../js/site-planner/road-intersection-overrides.js');
    const cluster = {
      center: { x: 0, y: 0 },
      arms: [
        { roadId: 'east-road', endpoint: 'start', point: { x: 0, y: 0 }, widthPx: 40, sidewalkWidthPx: 12, tangent: 0 },
        { roadId: 'west-road', endpoint: 'end', point: { x: 0, y: 0 }, widthPx: 40, sidewalkWidthPx: 12, tangent: Math.PI },
        { roadId: 'north-road', endpoint: 'start', point: { x: 0, y: 0 }, widthPx: 32, sidewalkWidthPx: 10, tangent: Math.PI * 1.5 },
      ],
    };
    const node = buildIntersectionNode(cluster, 0, { drivingSide: 'left' });

    const overrides = upsertIntersectionOverride({}, node, {
      label: 'Ekimae junction',
      intersectionType: 't-junction',
      mergeMode: 'keep-arms',
      laneBreakMode: 'break-at-node',
      locked: true,
      manualOverride: true,
      crosswalksEnabled: false,
      stopBarsEnabled: false,
      curbRadiusPx: 18,
      notes: 'Disable markings near rail crossing.',
    });
    const normalized = normalizeIntersectionOverride(Object.values(overrides)[0]);
    const [filtered] = applyIntersectionOverrides([node], overrides);

    expect(normalized.label).toBe('Ekimae junction');
    expect(normalized.intersectionType).toBe('t-junction');
    expect(normalized.mergeMode).toBe('keep-arms');
    expect(normalized.locked).toBe(true);
    expect(filtered.label).toBe('Ekimae junction');
    expect(filtered.displayType).toBe('t-junction');
    expect(filtered.curbRadiusPx).toBe(18);
    expect(filtered.crosswalks).toHaveLength(0);
    expect(filtered.stopBars).toHaveLength(0);
    expect(filtered.tactilePavers.length).toBeGreaterThan(0);
    expect(Object.keys(removeIntersectionOverride(overrides, node))).toHaveLength(0);
  });

  test('site planner exposes generated road intersections as selectable right-pane details', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const sidebarSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'sidebar-object-model.js'), 'utf8');
    const rendererSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'road-intersection-preview-renderer.js'), 'utf8');
    const detailSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'sidebar-road-intersection-detail.js'), 'utf8');

    expect(source).toContain('function selectedRoadIntersection()');
    expect(source).toContain('function hitGeneratedRoadIntersection');
    expect(source).toContain("import { renderRoadIntersectionDetail } from './site-planner/sidebar-road-intersection-detail.js';");
    expect(readSelectedDetailController()).toContain('} if(roadIntersection){renderRoadIntersectionDetail({');
    expect(detailSource).toContain('Road intersection selected');
    expect(detailSource).toContain('roadSystem.setRoadIntersectionOverride');
    expect(detailSource).toContain('roadSystem.clearRoadIntersectionOverride');
    expect(source).toContain('selectedIntersectionKey:state.selectedRoadIntersectionId');
    expect(sidebarSource).toContain("roadIntersection: 'Road Intersection'");
    expect(rendererSource).toContain('selectedNodeFill');
  });

  test('generated tactile pavers stay on sidewalk-bearing road arms', async () => {
    const { buildIntersectionNode } = await import('../js/site-planner/road-intersections.js');
    const cluster = {
      center: { x: 0, y: 0 },
      arms: [
        { roadId: 'east-sidewalk-road', endpoint: 'start', point: { x: 0, y: 0 }, widthPx: 40, sidewalkWidthPx: 16, tangent: 0 },
        { roadId: 'west-sidewalk-road', endpoint: 'end', point: { x: 0, y: 0 }, widthPx: 40, sidewalkWidthPx: 16, tangent: Math.PI },
        { roadId: 'north-no-sidewalk-road', endpoint: 'start', point: { x: 0, y: 0 }, widthPx: 40, sidewalkWidthPx: 0, tangent: Math.PI * 1.5 },
      ],
    };

    const node = buildIntersectionNode(cluster, 0, { drivingSide: 'left' });
    const paversByRoad = node.tactilePavers.reduce((counts, paver) => {
      counts[paver.roadId] = (counts[paver.roadId] || 0) + 1;
      return counts;
    }, {});

    expect(paversByRoad['east-sidewalk-road']).toBe(2);
    expect(paversByRoad['west-sidewalk-road']).toBe(2);
    expect(paversByRoad['north-no-sidewalk-road']).toBeUndefined();

    const eastPavers = node.tactilePavers.filter(paver => paver.roadId === 'east-sidewalk-road');
    eastPavers.forEach(paver => {
      const xs = paver.corners.map(point => point.x);
      const ys = paver.corners.map(point => point.y);
      expect(Math.abs(Math.abs(paver.center.y) - 28)).toBeLessThan(0.01);
      expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(Math.max(...ys) - Math.min(...ys));
    });
  });

  test('track switch 3D renderer uses flex-track colors and flat roadbed segments', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const renderer = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-3d-track-accessory-renderer.js'), 'utf8');

    expect(source).toContain("import { createSite3DTrackAccessoryRenderer } from './site-planner/site-3d-track-accessory-renderer.js';");
    expect(renderer).toContain('trackProfileDefaults.railColor');
    expect(renderer).toContain('trackProfileDefaults.tieColor');
    expect(renderer).toContain('trackProfileDefaults.roadbedHeightMm');
    expect(renderer).toContain('const railBase = sleeperBase + sleeperHeight');
    expect(renderer).toContain('const switchTieSpacing =');
    expect(renderer).toContain('trackProfileDefaults.tieSpacingMm');
    expect(renderer).toContain('trackSwitchMainPathPoints');
    expect(renderer).toContain('const addMainTieStations =');
    expect(renderer).toContain('const branchLength = polylineLength(branch)');
    expect(renderer).toContain('const station = pointAtPolylineDistance(branch, d)');
    expect(renderer).toContain('const addDivergingTurnoutTieStations =');
    expect(renderer).toContain('Tomix switch main roadbed');
    expect(renderer).toContain('Tomix switch main tie');
    expect(renderer).toContain('Tomix switch diverging turnout tie');
    expect(renderer).toContain('addLocalSegment(branch[i], branch[i + 1]');
    expect(renderer).not.toContain('addTiePathByDistance(branch');
    expect(renderer).not.toContain('Tomix switch curve tie');
    expect(renderer).not.toContain('i+=3');
    expect(renderer).not.toContain('geom.roadbedWidth/2');
  });

  test('crossing equipment track items route to dedicated 3D model builders', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const renderer = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-3d-track-accessory-renderer.js'), 'utf8');

    expect(source).not.toContain('function buildSite3DCrossingSignalItem');
    expect(source).not.toContain('function buildSite3DCrossingArmItem');
    expect(source).not.toContain('function buildSite3DIntrusionDetectorItem');
    expect(source).not.toContain('buildFallbackTrackAccessoryItem');
    expect(renderer).toContain('Japanese crossing buck diagonal plate A');
    expect(renderer).toContain('Japanese crossing striped barrier arm');
    expect(renderer).toContain("crossA.rotation.z = rad(36)");
    expect(renderer).toContain("crossB.rotation.z = rad(-36)");
    expect(renderer).toContain('Crossing arm direction indicator panel');
    expect(renderer).toContain("stripe.rotation.z = rad(-28)");
    expect(renderer).toContain('HB-type level crossing obstruction detector grey sensor housing');
    expect(renderer).toContain('HB-type intrusion detector obstruction detection beam');
    expect(renderer).toContain('addDetectorHead();');
    expect(renderer).not.toContain('addDetectorHead(-8,1)');
    expect(renderer).not.toContain('addDetectorHead(8,-1)');
    expect(renderer).toContain("item.kind === 'signal' || item.kind === 'occupancyLight'");
    expect(renderer).toContain('buildCrossingSignalItem(item, bounds)');
    expect(renderer).toContain("item.kind === 'crossingArm'");
    expect(renderer).toContain('buildCrossingArmItem(item, bounds)');
    expect(renderer).toContain("item.kind === 'intrusionDetector'");
    expect(renderer).toContain('buildIntrusionDetectorItem(item, bounds)');
  });

  test('site planner 3D building rendering is wired through its renderer module', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const renderer = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-3d-building-renderer.js'), 'utf8');

    expect(source).toContain("import { createSite3DBuildingRenderer } from './site-planner/site-3d-building-renderer.js';");
    expect(source).toContain('site3DBuildingRenderer=createSite3DBuildingRenderer({');
    expect(source).toContain('function buildSite3DSelectionHelper(b,bounds,opts={})');
    expect(source).toContain('function buildSite3DBuildingGroup(b,bounds)');
    expect(source).not.toContain('function site3DWindowColumns');
    expect(source).not.toContain('function addSite3DFacadeDetails');
    expect(source).not.toContain('function buildSite3DMassing');
    expect(renderer).toContain('export function createSite3DBuildingRenderer');
    expect(renderer).toContain('function buildMassing');
    expect(renderer).toContain('function addFacadeDetails');
    expect(renderer).toContain('sharedRenderer.buildBuildingPreviewGroup');
  });

  test('site planner 3D building config normalization is wired through its controller module', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-3d-building-config.js'), 'utf8');

    expect(source).toContain("import { createSite3DBuildingConfigController } from './site-planner/site-3d-building-config.js';");
    expect(source).toContain('function ensureSite3DBuildingConfigController()');
    expect(source).toContain('return ensureSite3DBuildingConfigController().site3DBuildingFootprintMm(b)');
    expect(source).toContain('return ensureSite3DBuildingConfigController().site3DNormalizeBuildingConfig(b,cfg)');
    expect(source).not.toContain('function site3DTypeDefaults(type,fabricType)');
    expect(source).not.toContain('function site3DGeneratorModelBaseRotationDeg(b,cfg)');
    expect(controller).toContain('function site3DApplyPlannerDimensions(b, cfg)');
    expect(controller).toContain('function site3DGeneratorModelBaseRotationDeg(b, cfg)');
    expect(controller).toContain('function site3DTypeDefaults(type, fabricType)');
    expect(controller).toContain("cfg.windowStyle = cfg.windowStyle || cfg.windows?.style || seed?.windowStyle || (defaults.commercial ? 'storefront' : 'industrial_small')");
    expect(controller).toContain('site3DGeneratorModelOriginOffset');
    expect(controller).toContain('site3DGeneratorModelRotationY');
  });

  test('Hako building footprint and trim geometry is wired through its controller module', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'hako-building-geometry-controller.js'), 'utf8');

    expect(source).toContain("import { createHakoBuildingGeometryController } from './site-planner/hako-building-geometry-controller.js';");
    expect(source).toContain('function ensureHakoBuildingGeometryController()');
    expect(source).toContain('return ensureHakoBuildingGeometryController().visibleBuildingPolygons(b)');
    expect(source).toContain('return ensureHakoBuildingGeometryController().hakoDisplayTrimPolylinesMm(b)');
    expect(source).not.toContain('function hakoWingBoundsMm(cfg,wing)');
    expect(source).not.toContain('function resolveHakoLayoutCut(cut,cfg)');
    expect(source).not.toContain('function arcSampleMm(it)');
    expect(controller).toContain('function hakoWingBoundsMm(cfg, wing)');
    expect(controller).toContain('function resolveHakoLayoutCut(cut, cfg)');
    expect(controller).toContain('function clipHakoPolygonByLayoutCuts(poly, cuts, cfg)');
    expect(controller).toContain('clipPolygonByHalfPlane(out, a, z');
    expect(controller).toContain('function hakoDisplayTrimPolylinesMm(b)');
    expect(controller).toContain("targetId: hakoCutTargetId(cut)");
  });

  test('2D building footprint rendering is wired through its renderer module', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const renderer = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-building-renderer-2d.js'), 'utf8');

    expect(source).toContain("import { createSiteBuildingRenderer2D } from './site-planner/site-building-renderer-2d.js';");
    expect(source).toContain('const { drawBuilding } = createSiteBuildingRenderer2D({');
    expect(source).not.toContain('function drawBuilding(b)');
    expect(renderer).toContain('function drawBuilding(building)');
    expect(renderer).toContain('function drawHakoTrimLines(building, strong = false)');
    expect(renderer).toContain('function drawRotateAffordance(building, points)');
  });

  test('site planner 3D base and reference image rendering is wired through its renderer module', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const renderer = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-3d-base-renderer.js'), 'utf8');

    expect(source).toContain("import { createSite3DBaseRenderer } from './site-planner/site-3d-base-renderer.js';");
    expect(source).toContain('function ensureSite3DBaseRenderer()');
    expect(source).toContain('return ensureSite3DBaseRenderer().buildSite3DBase(bounds,baseT)');
    expect(source).toContain('return ensureSite3DBaseRenderer().buildSite3DReferenceImage(bounds)');
    expect(source).not.toContain('function site3DReferenceImageMaskPaths()');
    expect(source).not.toContain('function buildSite3DReferenceTexture(w,h)');
    expect(renderer).toContain('Negative-thickness rectangular site base');
    expect(renderer).toContain('Negative-thickness benchwork site base');
    expect(renderer).toContain('function site3DReferenceImageMaskPaths()');
    expect(renderer).toContain('function buildSite3DReferenceTexture(w, h)');
    expect(renderer).toContain('ctx.clip()');
    expect(renderer).toContain("mesh.name = '3D reference image plane'");
    expect(renderer).toContain('mesh.renderOrder = referenceImageRenderOrder');
  });

  test('site planner 3D objects carry selection tags and route clicks to property panes', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const roadRenderer = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-3d-road-renderer.js'), 'utf8');
    const trackRenderer = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-3d-track-renderer.js'), 'utf8');
    const meshUtils = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-3d-mesh-utils.js'), 'utf8');
    const tagging = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-3d-object-tagging.js'), 'utf8');
    const interactionController = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-3d-interaction-controller.js'), 'utf8');
    expect(source).toContain("import { createSite3DObjectTagging } from './site-planner/site-3d-object-tagging.js';");
    expect(source).toContain('} = createSite3DObjectTagging({ THREE, trackAccessoryLabel });');
    expect(source).not.toContain('function tagSite3DBuilding');
    expect(tagging).toContain('`sitePlanner${prefix}Id`');
    expect(tagging).toContain("tagObject(object, road, 'Road', 'Road')");
    expect(tagging).toContain("tagObject(object, track, 'Track', 'Track')");
    expect(tagging).toContain('sitePlannerTrackAccessoryPickProxy');
    expect(roadRenderer).toContain('tagSite3DRoadObject(site3DAddFlatPolygon');
    expect(source).toContain("import { createSite3DTrackRenderer } from './site-planner/site-3d-track-renderer.js';");
    expect(source).toContain("import { createSite3DMeshUtils } from './site-planner/site-3d-mesh-utils.js';");
    expect(source).toContain("import { createSite3DInteractionController } from './site-planner/site-3d-interaction-controller.js';");
    expect(source).toContain('site3DInteractionController=createSite3DInteractionController({');
    expect(source).toContain('function handleSite3DPointerUp(event){ return ensureSite3DInteractionController().handleSite3DPointerUp(event); }');
    expect(trackRenderer).toContain('tagSite3DTrackObject(site3DAddRaisedPolygon');
    expect(trackRenderer).toContain('tagSite3DTrackObject(site3DAddBoxSegments');
    expect(meshUtils).toContain('function site3DAddFlatPolygon');
    expect(meshUtils).toContain('function site3DAddEdges');
    expect(source).not.toContain("return {type:'trackAccessory'");
    expect(interactionController).toContain("return { type: 'trackAccessory'");
    expect(interactionController).toContain("return { type: 'roadFeature'");
    expect(interactionController).toContain("return { type: 'stlObject'");
    expect(interactionController).toContain("return { type: 'building'");
    expect(interactionController).toContain("return { type: 'track'");
    expect(interactionController).toContain("return { type: 'road'");
    expect(interactionController).toContain('state.selectedRoadFeatureId = feature.id');
    expect(interactionController).toContain('updateSite3D({ preserveCamera: true })');
  });

  test('site planner STL 3D object rendering is wired through its renderer module', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const renderer = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-3d-stl-renderer.js'), 'utf8');

    expect(source).toContain("import { createSite3DStlRenderer } from './site-planner/site-3d-stl-renderer.js';");
    expect(source).toContain('function ensureSite3DStlRenderer()');
    expect(source).toContain('return ensureSite3DStlRenderer().buildSite3DStlObjectGroup(raw,bounds)');
    expect(source).not.toContain('function site3DStlGeometry(obj, targetW, targetH, targetD)');
    expect(source).not.toContain('mesh.userData.sitePlannerStlActualMesh=true');
    expect(renderer).toContain('function site3DStlGeometry(obj, targetW, targetH, targetD)');
    expect(renderer).toContain("obj.asset.renderFallbackReason = 'mesh-too-large'");
    expect(renderer).toContain("obj.asset.renderFallbackReason = 'parse-failed'");
    expect(renderer).toContain('mesh.userData.sitePlannerStlActualMesh = true');
    expect(renderer).toContain("group.name = obj.name || 'STL site object proxy'");
    expect(renderer).toContain('return tagSite3DStlObject(group, obj)');
  });

  test('site planner 3D refreshes preserve camera during property syncs', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const sceneController = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-3d-scene-controller.js'), 'utf8');
    const lifecycleController = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-3d-lifecycle-controller.js'), 'utf8');
    const syncStart = source.indexOf('function syncAll(opts = {})');
    const syncEnd = source.indexOf('function syncSelectedBuildingLive');
    const syncAll = source.slice(syncStart, syncEnd);

    expect(syncAll).toContain("if(state.viewMode==='3d') updateSite3D({preserveCamera:true})");
    expect(syncAll).not.toContain('updateSite3D();');
    expect(lifecycleController).toContain('updateSite3D({ preserveCamera: site3d.initialized })');
    expect(lifecycleController).not.toContain('updateSite3D();');
    expect(source).toContain("import { createSite3DSceneController } from './site-planner/site-3d-scene-controller.js';");
    expect(source).toContain('site3DSceneController=createSite3DSceneController({');
    expect(source).toContain('function updateSite3D(options={}){ return ensureSite3DSceneController().updateSite3D(options); }');
    expect(sceneController).toContain('const hadCamera = !!(site3d.initialized && site3d.camera)');
    expect(sceneController).toContain('options.preserveCamera !== false && hadCamera');
    expect(sceneController).toContain('if (!restoreSite3DCameraSnapshot(cameraSnapshot))');
  });

  test('site object selection and clipboard behavior is wired through its controller', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-object-selection-controller.js'), 'utf8');

    expect(source).toContain("import { createSiteObjectSelectionController } from './site-planner/site-object-selection-controller.js';");
    expect(source).toContain('siteObjectSelectionController=createSiteObjectSelectionController({');
    expect(source).toContain('function handleSiteObjectPointerHit(type,item,e,p){return ensureSiteObjectSelectionController().handleSiteObjectPointerHit(type,item,e,p);}');
    expect(controller).toContain('export const SITE_OBJECT_CLIPBOARD_TYPES');
    expect(controller).toContain('function copySelectedSiteObject()');
    expect(controller).toContain('function pasteSiteObjectFromClipboard()');
    expect(controller).toContain('function applySiteObjectMoveFromOrig(type, orig, dx, dy');
    expect(controller).toContain('function handleSiteObjectPointerHit(type, item, e, p)');
    expect(source).not.toContain('const SITE_OBJECT_MOVE_TYPES = new Set');
  });

  test('site planner object browser and list rows are wired through a sidebar controller', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'sidebar-object-browser-controller.js'), 'utf8');

    expect(source).toContain("import { createSidebarObjectBrowserController } from './site-planner/sidebar-object-browser-controller.js';");
    expect(source).toContain('sidebarObjectBrowserController=createSidebarObjectBrowserController({');
    expect(source).toContain('function renderObjectBrowser(){');
    expect(source).toContain('function renderStreetlights(){');
    expect(source).toContain('function renderList(){');
    expect(source).not.toContain('function makeObjectListRow');
    expect(source).not.toContain('function bindTrackAccessoryFilterMenu');
    expect(source).not.toContain('function closeTrackAccessoryFilterMenu');
    expect(controller).toContain('export function createSidebarObjectBrowserController');
    expect(controller).toContain('function makeObjectListRow');
    expect(controller).toContain('function renderObjectBrowser');
    expect(controller).toContain('function bindTrackAccessoryFilterMenu');
    expect(controller).toContain('trackAccessoryMatchesObjectFilter(item, trackAccessoryFilter)');
    expect(controller).toContain('renderSelected();');
  });

  test('site planner existing-object pointer hit sequence is wired through its controller', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-pointer-interaction-controller.js'), 'utf8');

    expect(source).toContain("import { createSitePointerInteractionController } from './site-planner/site-pointer-interaction-controller.js';");
    expect(source).toContain('sitePointerInteractionController=createSitePointerInteractionController({');
    expect(source).toContain('function startExistingObjectInteraction(e,p){');
    expect(source).not.toContain('function hasActivePointDraft');
    expect(source).not.toContain("const railCrossingHit=hitGeneratedRailCrossing(p,e.pointerType)");
    expect(controller).toContain('export function createSitePointerInteractionController');
    expect(controller).toContain('function hasActivePointDraft');
    expect(controller).toContain('function startExistingObjectInteraction');
    expect(controller).toContain("return handleSiteObjectPointerHit('trackAccessory'");
    expect(controller).toContain("return handleSiteObjectPointerHit('building'");
    expect(controller).toContain('const fabricHit = hitFabricRegion(p)');
  });

  test('site planner project serialization is wired through its persistence controller', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-project-persistence-controller.js'), 'utf8');

    expect(source).toContain("import { createSiteProjectPersistenceController } from './site-planner/site-project-persistence-controller.js';");
    expect(source).toContain("import { createSiteHistoryController } from './site-planner/site-history-controller.js';");
    expect(source).toContain('siteProjectPersistenceController=createSiteProjectPersistenceController({');
    expect(source).toContain('function historySnapshot(){');
    expect(source).toContain('} = createSiteHistoryController({');
    expect(source).toContain('function makeProjectPayload(opts={}){');
    expect(source).toContain('function projectJson(opts={}){');
    expect(source).not.toContain('function applyHistorySnapshot(');
    expect(source).not.toContain("app:'HakoMachi Site Planner'");
    expect(source).not.toContain('const manifestAssetPaths=new Set');
    expect(controller).toContain('export function createSiteProjectPersistenceController');
    expect(controller).toContain('function historySnapshot()');
    expect(controller).toContain('function makeProjectPayload');
    expect(controller).toContain('function projectJson');
    expect(controller).toContain("schema: 'hakomachi.site-assets'");
    expect(controller).toContain('imageMetaForProject(state.imageMeta');

    const historyController = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-history-controller.js'), 'utf8');
    expect(historyController).toContain('export function createSiteHistoryController');
    expect(historyController).toContain('function applyHistorySnapshot(');
    expect(historyController).toContain('function undo()');
    expect(historyController).toContain('function redo()');
  });

  test('local site bundle save and load workflows are wired through their controller', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-project-bundle-controller.js'), 'utf8');

    expect(source).toContain("import { createSiteProjectBundleController } from './site-planner/site-project-bundle-controller.js';");
    expect(source).toContain('const { saveSitePlanBundle, loadProjectJsonObject, loadSitePlanBundle } = createSiteProjectBundleController({');
    expect(source).not.toContain('function loadProject(p, opts={}){');
    expect(source).not.toContain('async function loadSitePlanBundle(file){');
    expect(controller).toContain('export function createSiteProjectBundleController');
    expect(controller).toContain("zip.file('hakomachi-site.hako-site.json', projectText)");
    expect(controller).toContain("await diagnostics.measure('hydrate bundled assets'");
    expect(controller).toContain('return { saveSitePlanBundle, loadProjectJsonObject, loadSitePlanBundle };');
  });

  test('project application and image restoration are wired through their controller', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-project-load-controller.js'), 'utf8');

    expect(source).toContain("import { createSiteProjectLoadController } from './site-planner/site-project-load-controller.js';");
    expect(source).toContain('siteProjectLoadController=createSiteProjectLoadController({');
    expect(source).toContain('function loadProject(project, opts={}){ return ensureSiteProjectLoadController().loadProject(project, opts); }');
    expect(source).not.toContain('async function saveSitePlanBundle(){');
    expect(controller).toContain('export function createSiteProjectLoadController');
    expect(controller).toContain('function loadProject(project, opts = {})');
    expect(controller).toContain('scaleLoadedPixelGeometry(state, loadedW / savedW, loadedH / savedH)');
    expect(controller).toContain("resetHistory(opts.fromAutosave ? 'autosave restored' : 'project loaded')");
  });

  test('building project normalization and legacy footprint recovery are wired through their controller', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-building-project-controller.js'), 'utf8');

    expect(source).toContain("import { createSiteBuildingProjectController } from './site-planner/site-building-project-controller.js';");
    expect(source).toContain('siteBuildingProjectController=createSiteBuildingProjectController({');
    expect(source).toContain('function normalizeBuilding(building){ return ensureSiteBuildingProjectController().normalizeBuilding(building); }');
    expect(source).toContain('function collectProjectBuildings(project){ return ensureSiteBuildingProjectController().collectProjectBuildings(project); }');
    expect(source).not.toContain('function savedBuildingPointsPx(raw){');
    expect(controller).toContain('function normalizeBuilding(building)');
    expect(controller).toContain('function savedBuildingPointsPx(raw)');
    expect(controller).toContain("source = 'fabricRegions.*.buildingPads';");
    expect(controller).toContain('function footprintLoadMessage(project, loadedCount, source)');
  });

test('building import attachment and GitHub placement are wired through their controller', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-building-placement-controller.js'), 'utf8');

    expect(source).toContain("import { createSiteBuildingPlacementController } from './site-planner/site-building-placement-controller.js';");
    expect(source).toContain('siteBuildingPlacementController=createSiteBuildingPlacementController({');
    expect(source).toContain('function createBuildingFromImportedHako(fileName, text, parsed){ return ensureSiteBuildingPlacementController().createBuildingFromImportedHako(fileName, text, parsed); }');
    expect(source).toContain('function placeGithubBuildingAt(center){ return ensureSiteBuildingPlacementController().placeGithubBuildingAt(center); }');
    expect(source).not.toContain('function storeHakoFileOnBuilding(b, fileName, text, parsed, opts={}){');
    expect(controller).toContain('function storeHakoFileOnBuilding(building, fileName, text, parsed, options = {})');
    expect(controller).toContain('function createBuildingFromImportedHako(fileName, text, parsed)');
    expect(controller).toContain('function armGithubBuildingPlacement(record)');
    expect(controller).toContain('function placeGithubBuildingAt(center)');
  });

  test('Site Planner autosave lifecycle is wired through its controller', () => {
    const source=fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller=fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-autosave-controller.js'), 'utf8');

    expect(source).toContain("import { createSiteAutosaveController } from './site-planner/site-autosave-controller.js';");
    expect(source).toContain('} = createSiteAutosaveController({');
    expect(source).not.toContain('function writeAutosave(){');
    expect(source).not.toContain('function scheduleAutosave(){');
    expect(controller).toContain('export function createSiteAutosaveController');
    expect(controller).toContain("updateAutosaveStatus('Autosave: geometry saved, image too large');");
    expect(controller).toContain('function markManualSaveComplete(){');
  });

  test('Site Planner 3D UI controls are wired through their controller', () => {
    const source=fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller=fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-3d-ui-controller.js'), 'utf8');

    expect(source).toContain("import { createSite3DUiController } from './site-planner/site-3d-ui-controller.js';");
    expect(source).toContain('} = createSite3DUiController({');
    expect(source).not.toContain('function applySite3DSettings(');
    expect(source).not.toContain('function bindSite3DButtons(){');
    expect(controller).toContain('export function createSite3DUiController');
    expect(controller).toContain('function syncSite3DControls(){');
    expect(controller).toContain("markDirty('3d reference image opacity',{history:false});");
  });

  test('Site Planner 3D renderer lifecycle is wired through its controller', () => {
    const source=fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller=fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-3d-lifecycle-controller.js'), 'utf8');

    expect(source).toContain("import { createSite3DLifecycleController } from './site-planner/site-3d-lifecycle-controller.js';");
    expect(source).toContain('site3DLifecycleController=createSite3DLifecycleController({');
    expect(source).toContain('function initSite3D(){ return ensureSite3DLifecycleController().initSite3D(); }');
    expect(source).toContain('function setSite3DMode(on){ return ensureSite3DLifecycleController().setSite3DMode(on); }');
    expect(source).not.toContain('function ensureSite3dView(){');
    expect(controller).toContain('function ensureSite3dView()');
    expect(controller).toContain('function initSite3D()');
    expect(controller).toContain('function resizeSite3D()');
    expect(controller).toContain('function setSite3DMode(on)');
  });

  test('GitHub save-source state is wired through its Site Planner controller', () => {
    const source=fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller=fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'github-site-source-controller.js'), 'utf8');

    expect(source).toContain("import { createGithubSiteSourceController } from './site-planner/github-site-source-controller.js';");
    expect(source).toContain('} = createGithubSiteSourceController({');
    expect(source).not.toContain('function activeGithubSiteSource(){');
    expect(source).not.toContain('function updatePrimarySaveUi(){');
    expect(controller).toContain('export function createGithubSiteSourceController');
    expect(controller).toContain("button.dataset.saveSource=source?'github':'local-package';");
    expect(controller).toContain('function githubSiteSourceFromProject(project){');
  });

  test('GitHub site asset save and load helpers are wired through their controller', () => {
    const source=fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller=fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'github-site-asset-controller.js'), 'utf8');

    expect(source).toContain("import { createGithubSiteAssetController } from './site-planner/github-site-asset-controller.js';");
    expect(source).toContain('} = createGithubSiteAssetController({');
    expect(source).not.toContain('async function saveGithubImageAsset(');
    expect(source).not.toContain('async function resolveProjectStlAssetsFromGithub(');
    expect(controller).toContain('export function createGithubSiteAssetController');
    expect(controller).toContain('async function saveGithubHakoAssets');
    expect(controller).toContain('async function resolveProjectImageFromGithub');
    expect(controller).toContain("setGithubProgress(4,8,'Writing STL site objects...'");
  });

  test('GitHub site save orchestration is wired through its controller', () => {
    const source=fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller=fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'github-site-save-controller.js'), 'utf8');

    expect(source).toContain("import { createGithubSiteSaveController } from './site-planner/github-site-save-controller.js';");
    expect(source).toContain('const {saveSitePlanToGithub}=createGithubSiteSaveController({');
    expect(source).not.toContain('async function saveSitePlanToGithub(options={}){');
    expect(controller).toContain('export function createGithubSiteSaveController');
    expect(controller).toContain("const reuseCurrent=!!(options.reuseCurrent&&current?.id&&current?.name&&current?.path);");
    expect(controller).toContain("setGithubProgress(8,8,'Save complete.','Saved '+path);");
  });

  test('GitHub site load orchestration is wired through its controller', () => {
    const source=fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller=fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'github-site-load-controller.js'), 'utf8');

    expect(source).toContain("import { createGithubSiteLoadController } from './site-planner/github-site-load-controller.js';");
    expect(source).toContain('const {loadSitePlanFromGithub}=createGithubSiteLoadController({');
    expect(source).not.toContain('async function loadSitePlanFromGithub(record){');
    expect(controller).toContain('export function createGithubSiteLoadController');
    expect(controller).toContain("diagnostics.measure('resolve STL assets'");
    expect(controller).toContain('loadProject(project,{fromFile:true});');
    expect(controller).toContain("showStatusHint(message,'warning');");
  });

  test('Tomix track accessories fall back to the flex-track gauge scale', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const scaleHelpers = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'track-accessory-geometry.js'), 'utf8');

    expect(source).toContain("import { createTrackAccessoryGeometry } from './site-planner/track-accessory-geometry.js';");
    expect(scaleHelpers).toContain('trackProfileDefaults.gaugeMm');
    expect(scaleHelpers).toContain('return 10 /');
    expect(scaleHelpers).not.toContain('return 0.32');
  });

  test('track switch labels are anchored away from the rotation handle', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const renderer2d = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'track-accessory-renderer-2d.js'), 'utf8');
    const interactionController = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'track-accessory-interaction-controller.js'), 'utf8');

    expect(source).toContain('return ensureTrackAccessoryInteractionController().trackAccessoryLabelPoint(item);');
    expect(interactionController).toContain('isTrackSwitchAccessoryKind');
    expect(interactionController).toContain('maxY + 24 * scale');
    expect(renderer2d).toContain('drawLabel(item.name || trackAccessoryLabel(item.kind), trackAccessoryLabelPoint(item))');
    expect(renderer2d).not.toContain('drawLabel(item.name||trackAccessoryLabel(item.kind),{x:item.x+12*scale,y:item.y-12*scale})');
  });

  test('track switch diverging ties are spaced by curve distance', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const renderer2d = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'track-accessory-renderer-2d.js'), 'utf8');

    expect(source).toContain('function pointAtPolylineDistance');
    expect(source).toContain('function polylineLength');
    expect(renderer2d).toContain('const branchLength = polylineLength(branch)');
    expect(renderer2d).toContain('const station = pointAtPolylineDistance(branch, d)');
    expect(renderer2d).not.toContain('for(let i=3;i<branch.length;i+=3)');
  });

  test('benchwork outline behavior is wired through the benchwork controller', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'benchwork-controller.js'), 'utf8');
    const projectLoadController = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-project-load-controller.js'), 'utf8');

    expect(source).toContain("import { createBenchworkController } from './site-planner/benchwork-controller.js';");
    expect(source).toContain('} = createBenchworkController({');
    expect(source).toContain('normalizeBenchworkOutline,');
    expect(source).toContain('drawBenchwork,');
    expect(source).toContain('benchworkPathSamples: benchworkSamples');
    expect(projectLoadController).toContain('state.benchworkOutlines = loadedBenchworks.map(normalizeBenchworkOutline);');

    expect(controller).toContain('export function createBenchworkController');
    expect(controller).toContain('function normalizeBenchworkOutline(bw)');
    expect(controller).toContain('function hitBenchworkSegment');
    expect(controller).toContain('function drawBenchwork(bw)');
    expect(controller).toContain('function finishBenchworkOutline');
  });

  test('Hako import drop zones are wired through the Hako drop controller', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'hako-drop-ui.js'), 'utf8');

    expect(source).toContain("import { createHakoDropController } from './site-planner/hako-drop-ui.js';");
    expect(source).toContain('installHakoImportDropzone,');
    expect(source).not.toContain('function installHakoImportDropzone(box)');
    expect(controller).toContain('function installHakoImportDropzone(box)');
    expect(controller).toContain("class=\"hakoImportDropzone\"");
  });

  test('freehand annotation behavior is wired through the annotation controller', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'annotation-controller.js'), 'utf8');
    const pageControls = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-page-controls-controller.js'), 'utf8');

    expect(source).toContain("import { createAnnotationController } from './site-planner/annotation-controller.js';");
    expect(source).toContain('} = createAnnotationController({');
    expect(source).toContain('hitAnnotation,');
    expect(source).toContain('drawAnnotations,');
    expect(source).toContain('sitePageControlsController.bindPageControls();');

    expect(controller).toContain('export function createAnnotationController');
    expect(controller).toContain('function hitAnnotation');
    expect(controller).toContain('function startAnnotationStroke');
    expect(controller).toContain('function drawAnnotations');
    expect(pageControls).toContain("markDirty('annotations cleared');");
  });

  test('streetlight model behavior is wired through the streetlight controller', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'streetlight-controller.js'), 'utf8');
    const renderer = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-canvas-renderer.js'), 'utf8');

    expect(source).toContain("import { createStreetlightController } from './site-planner/streetlight-controller.js';");
    expect(source).toContain('} = createStreetlightController({');
    expect(source).toContain('normalizeStreetlight,');
    expect(source).toContain('placeStreetlight,');
    expect(renderer).toContain('state.streetlights.forEach(drawStreetlight);');

    expect(controller).toContain('export function createStreetlightController');
    expect(controller).toContain('function normalizeStreetlight(l)');
    expect(controller).toContain('function hitStreetlight');
    expect(controller).toContain('function placeStreetlight');
  });

  test('context menu behavior is wired through the context menu controller', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'context-menu-controller.js'), 'utf8');

    expect(source).toContain("import { createContextMenuController } from './site-planner/context-menu-controller.js';");
    expect(source).toContain('} = createContextMenuController({');
    expect(source).toContain('showContextMenuForPointerEvent(e, screenToWorld(e));');

    expect(controller).toContain('export function createContextMenuController');
    expect(controller).toContain('function showContextMenu(screenX, screenY, target)');
    expect(controller).toContain('function contextTargetAt');
    expect(controller).toContain('function showContextMenuForPointerEvent');
  });

  test('fabric fill behavior is wired through the fabric controller', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'fabric-controller.js'), 'utf8');
    const projectLoadController = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-project-load-controller.js'), 'utf8');

    expect(source).toContain("import { createFabricController } from './site-planner/fabric-controller.js';");
    expect(source).toContain('fabricController = createFabricController({');
    expect(source).toContain('if(fabricController) fabricController.initFabricControls();');
    expect(source).toContain('generateFabricForRegion,');
    expect(projectLoadController).toContain('state.fabricRegions = (project.fabricRegions || []).map(normalizeFabricRegion);');

    expect(controller).toContain('export function createFabricController');
    expect(controller).toContain('function normalizeFabricRegion(region)');
    expect(controller).toContain('function generateFabricForRegion');
    expect(controller).toContain('function initFabricControls');
  });

  test('road asset export review packaging is wired through its controller', async () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'road-asset-export-controller.js'), 'utf8');
    const {
      generatedRoadRecordIncludedForExport,
      reviewedRoadExportIds,
      roadFeatureIncludedForExport,
    } = await import('../js/site-planner/road-asset-export-controller.js');

    expect(source).toContain("import { createRoadAssetExportController } from './site-planner/road-asset-export-controller.js';");
    expect(source).toContain('roadAssetExporter = createRoadAssetExportController({');
    expect(source).toContain('onExport: review => roadAssetExporter.downloadRoadAssetExport(review),');
    expect(source).not.toContain('function svgRoadAssetExport(review={})');
    expect(source).not.toContain('function downloadRoadAssetExport(review={})');

    expect(controller).toContain('export function createRoadAssetExportController');
    expect(controller).toContain('function svgRoadAssetExport(review = {})');
    expect(controller).toContain('async function downloadRoadAssetExport(review = {})');

    const selectedIds = reviewedRoadExportIds({ includedRoadIds: ['road_keep', 'missing'] }, {
      roads: [{ id: 'road_keep' }, { id: 'road_skip' }],
    });
    expect(Array.from(selectedIds)).toEqual(['road_keep']);
    expect(roadFeatureIncludedForExport({ roadId: 'road_keep' }, selectedIds)).toBe(true);
    expect(roadFeatureIncludedForExport({ roadId: 'road_skip' }, selectedIds)).toBe(false);
    expect(roadFeatureIncludedForExport({ type: 'floating-label' }, selectedIds)).toBe(true);
    expect(generatedRoadRecordIncludedForExport({ roadId: 'road_skip' }, selectedIds)).toBe(false);
  });

  test('rail crossings generate crossing panels, infill, and SVG export records', async () => {
    const {
      RAIL_CROSSING_CENTER_CLEARANCE_MM,
      buildRailCrossingInfillPanels,
      buildRailCrossings,
      railCrossingSvgRecords,
    } = await import('../js/site-planner/rail-crossing-generator.js');
    const { roadCenterlineSamples } = await import('../js/site-planner/road-geometry.js');
    const { createTrackController } = await import('../js/site-planner/track-controller.js');
    const { roadAssetSvgExport } = await import('../js/site-planner/export-utils.js');
    const { svgFabricationAttrs, svgFeatureTransform, svgPathFromPoly } = await import('../js/site-planner/svg-export-utils.js');
    const { polygonCenter } = await import('../js/site-planner/geometry.js');

    const state = { view: { scale: 1 }, pxPerMm: 2, tracks: [] };
    let idCount = 0;
    const trackController = createTrackController({
      state,
      defaults: {
        gaugeMm: 9,
        railWidthMm: 0.8,
        railHeightMm: 0.6,
        tieSpacingMm: 4,
        tieLengthMm: 18,
        tieWidthMm: 2,
        roadbedWidthMm: 19,
        roadbedHeightMm: 2,
        roadbedShoulderMm: 4,
        railColor: '#4b4438',
        tieColor: '#8a6f43',
        roadbedColor: '#b8b2a1',
        roadbedTopColor: '#d8d2bf',
      },
      uid: prefix => `${prefix}_${++idCount}`,
      mmToPx: mm => mm * state.pxPerMm,
      pxToMm: px => px / state.pxPerMm,
      dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
      distanceToSegment: () => 999,
      closestPointOnSegment: () => null,
      quadPoint: (a, c, b, t) => {
        const mt = 1 - t;
        return { x: mt * mt * a.x + 2 * mt * t * c.x + t * t * b.x, y: mt * mt * a.y + 2 * mt * t * c.y + t * t * b.y };
      },
      clearBuildingSelection: () => {},
      syncAll: () => {},
      getExternalTrackConnectionPoints: () => [],
    });

    const roads = [
      { id: 'road_1', name: 'Crossing road', mode: 'centerline', pointsPx: [{ x: 0, y: 100 }, { x: 260, y: 100 }], curvesPx: [], widthPx: 48 },
    ];
    const tracks = [
      trackController.normalizeTrack({ id: 'track_1', name: 'Track 1', pointsPx: [{ x: 100, y: 20 }, { x: 100, y: 180 }], gaugeMm: 9, gaugePx: 18, railWidthPx: 1.6 }),
      trackController.normalizeTrack({ id: 'track_2', name: 'Track 2', pointsPx: [{ x: 145, y: 20 }, { x: 145, y: 180 }], gaugeMm: 9, gaugePx: 18, railWidthPx: 1.6 }),
    ];

    const crossings = buildRailCrossings({
      roads,
      tracks,
      roadCenterlineSamples,
      trackPathSamples: trackController.trackPathSamples,
      pxPerMm: state.pxPerMm,
      overrides: { 'road_1:track_1:100': { railArcOffsetMm: 1.5 } },
    });

    expect(crossings).toHaveLength(2);
    expect(crossings[0].panels).toHaveLength(3);
    expect(crossings[0].centerWidthPx).toBeCloseTo(RAIL_CROSSING_CENTER_CLEARANCE_MM * state.pxPerMm, 4);
    expect(crossings[0].railArcOffsetMm).toBeCloseTo(1.5, 4);
    expect(crossings[0].engraves.length).toBeGreaterThan(6);

    const infill = buildRailCrossingInfillPanels(crossings, { roadWidthPxById: { road_1: 48 } });
    expect(infill).toHaveLength(1);

    const records = railCrossingSvgRecords(crossings, { infillPanels: infill });
    expect(records.filter(record => record.layer === 'railCrossingCut')).toHaveLength(7);
    expect(records.some(record => record.layer === 'railCrossingPlateEngrave')).toBe(true);

    const svg = roadAssetSvgExport({
      data: { roads: [{ ...roads[0], roadPolygonPx: [{ x: 0, y: 76 }, { x: 260, y: 76 }, { x: 260, y: 124 }, { x: 0, y: 124 }], sidewalkPolygonsPx: [] }], seams: [] },
      roadFeatures: [],
      generatedRailCrossingRecords: records,
      width: 260,
      height: 200,
    }, {
      JP_ROAD_MARKING_STANDARD_ID: 'jp-road-markings-v1',
      SVG_OP: { CUT_RETAINED: 'cut-retained', CUT_SCRAP: 'cut-scrap', ENGRAVE: 'engrave' },
      SVG_ENGRAVE: '#0000ff',
      SVG_RETAINED_CUT: '#ff0000',
      SVG_SCRAP_CUT: '#00aa00',
      escapeAttr: value => String(value).replace(/"/g, '&quot;'),
      escapeHtml: value => String(value),
      normalizeRoadFeature: value => value,
      polygonCenter,
      svgFabricationAttrs,
      svgFeatureTransform,
      svgPathFromPoly,
    });

    expect(svg).toContain('id="railCrossingCut"');
    expect(svg).toContain('id="railCrossingPlateEngrave"');
    expect(svg).toContain('data-panel-kind="center"');
    expect(svg).toContain('data-panel-kind="betweenTracks"');
  });

  test('rail crossing inserts render above normal track in the 2D planner', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const renderer = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-canvas-renderer.js'), 'utf8');
    const drawStart = renderer.indexOf('function drawNow');
    const drawEnd = renderer.indexOf('function fitImage', drawStart);
    const drawNow = renderer.slice(drawStart, drawEnd);

    expect(source).toContain("import { createSiteCanvasRenderer } from './site-planner/site-canvas-renderer.js';");
    expect(source).toContain('const { drawNow, fitImage } = createSiteCanvasRenderer({');
    expect(source).not.toContain('function drawNow()');
    const roadLayerIndex = drawNow.indexOf('drawRoadLayer()');
    const trackLayerIndex = drawNow.indexOf('(state.tracks || []).forEach(drawTrack)');
    const railCrossingIndex = drawNow.indexOf('drawGeneratedRailCrossings()');
    const accessoryLayerIndex = drawNow.indexOf('(state.trackAccessories || []).forEach(drawTrackAccessory)');

    expect(roadLayerIndex).toBeGreaterThanOrEqual(0);
    expect(trackLayerIndex).toBeGreaterThan(roadLayerIndex);
    expect(railCrossingIndex).toBeGreaterThan(trackLayerIndex);
    expect(accessoryLayerIndex).toBeGreaterThan(railCrossingIndex);
  });

  test('rail crossing panels use gunmetal preview styling with clipped texture', () => {
    const renderer = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'rail-crossing-renderer-2d.js'), 'utf8');
    const helperStart = renderer.indexOf('function drawRailCrossingPanelTexture');
    const drawStart = renderer.indexOf('function drawRailCrossingPanel(panel', helperStart);
    const drawEnd = renderer.indexOf('function drawRailCrossingIndicator', drawStart);
    const textureHelper = renderer.slice(helperStart, drawStart);
    const drawPanel = renderer.slice(drawStart, drawEnd);

    expect(textureHelper).toContain('ctx.clip()');
    expect(textureHelper).toContain("rgba(220,229,232,.25)");
    expect(textureHelper).toContain("rgba(31,39,45,.42)");
    expect(drawPanel).toContain("rgba(73,83,91,.88)");
    expect(drawPanel).toContain("'#29333a'");
    expect(drawPanel).not.toContain("rgba(236,224,190,.76)");
  });

  test('rail crossing survey templates export fit-check guides and reuse measured geometry', async () => {
    const {
      buildRailCrossings,
      railCrossingSvgRecords,
    } = await import('../js/site-planner/rail-crossing-generator.js');
    const { roadCenterlineSamples } = await import('../js/site-planner/road-geometry.js');
    const { createTrackController } = await import('../js/site-planner/track-controller.js');
    const { roadAssetSvgExport } = await import('../js/site-planner/export-utils.js');
    const { svgFabricationAttrs, svgFeatureTransform, svgPathFromPoly } = await import('../js/site-planner/svg-export-utils.js');
    const { polygonCenter } = await import('../js/site-planner/geometry.js');

    const state = { view: { scale: 1 }, pxPerMm: 2, tracks: [] };
    const trackController = createTrackController({
      state,
      defaults: {
        gaugeMm: 9,
        railWidthMm: 0.8,
        railHeightMm: 0.6,
        tieSpacingMm: 4,
        tieLengthMm: 18,
        tieWidthMm: 2,
        roadbedWidthMm: 19,
        roadbedHeightMm: 2,
        roadbedShoulderMm: 4,
        railColor: '#4b4438',
        tieColor: '#8a6f43',
        roadbedColor: '#b8b2a1',
        roadbedTopColor: '#d8d2bf',
      },
      uid: prefix => `${prefix}_1`,
      mmToPx: mm => mm * state.pxPerMm,
      pxToMm: px => px / state.pxPerMm,
      dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
      distanceToSegment: () => 999,
      closestPointOnSegment: () => null,
      quadPoint: (a, c, b, t) => {
        const mt = 1 - t;
        return { x: mt * mt * a.x + 2 * mt * t * c.x + t * t * b.x, y: mt * mt * a.y + 2 * mt * t * c.y + t * t * b.y };
      },
      clearBuildingSelection: () => {},
      syncAll: () => {},
      getExternalTrackConnectionPoints: () => [],
    });

    const roads = [
      { id: 'road_fit', name: 'Measured road', mode: 'centerline', pointsPx: [{ x: 20, y: 100 }, { x: 240, y: 100 }], curvesPx: [], widthPx: 48 },
    ];
    const tracks = [
      trackController.normalizeTrack({ id: 'track_fit', name: 'Installed track', pointsPx: [{ x: 120, y: 20 }, { x: 120, y: 180 }], gaugeMm: 9, gaugePx: 18, railWidthPx: 1.6 }),
    ];

    const crossings = buildRailCrossings({
      roads,
      tracks,
      roadCenterlineSamples,
      trackPathSamples: trackController.trackPathSamples,
      pxPerMm: state.pxPerMm,
      overrides: {
        'road_fit:track_fit:100': {
          surveyTemplateEnabled: true,
          roadAngleOffsetDeg: 5,
          trackAngleOffsetDeg: -2,
          crossingOffsetMm: 0.5,
          roadWidthMm: 28,
          flangewayMm: 1.4,
          trimGuideEnabled: true,
          registrationMarksEnabled: true,
        },
      },
    });

    expect(crossings).toHaveLength(1);
    expect(crossings[0].surveyTemplateEnabled).toBe(true);
    expect(crossings[0].roadWidthMm).toBeCloseTo(28, 3);
    expect(crossings[0].flangewayMm).toBeCloseTo(1.4, 3);
    expect(crossings[0].crossingAngleDeg).toBeCloseTo(83, 1);
    expect(crossings[0].point.y).toBeCloseTo(101, 1);

    const records = railCrossingSvgRecords(crossings);
    expect(records.some(record => record.layer === 'railCrossingSurveyCut' && record.operation === 'cutRetained')).toBe(true);
    expect(records.filter(record => record.layer === 'railCrossingSurveySlotCut' && record.operation === 'cutScrap')).toHaveLength(2);
    expect(records.some(record => record.layer === 'railCrossingSurveyEngrave' && record.type === 'railCrossingSurveyRoadCenterline')).toBe(true);
    expect(records.some(record => record.layer === 'railCrossingSurveyEngrave' && record.type === 'railCrossingSurveyFlangewayGuide')).toBe(true);
    const angleLabel = records.find(record => record.type === 'railCrossingSurveyAngleLabel');
    expect(angleLabel).toBeTruthy();
    expect(Number.parseFloat(angleLabel.text)).toBeCloseTo(crossings[0].crossingAngleDeg, 1);

    const svg = roadAssetSvgExport({
      data: { roads: [{ ...roads[0], roadPolygonPx: [{ x: 20, y: 76 }, { x: 240, y: 76 }, { x: 240, y: 124 }, { x: 20, y: 124 }], sidewalkPolygonsPx: [] }], seams: [] },
      roadFeatures: [],
      generatedRailCrossingRecords: records,
      width: 260,
      height: 200,
    }, {
      JP_ROAD_MARKING_STANDARD_ID: 'jp-road-markings-v1',
      SVG_OP: { CUT_RETAINED: 'cut-retained', CUT_SCRAP: 'cut-scrap', ENGRAVE: 'engrave' },
      SVG_ENGRAVE: '#0000ff',
      SVG_RETAINED_CUT: '#ff0000',
      SVG_SCRAP_CUT: '#00aa00',
      escapeAttr: value => String(value).replace(/"/g, '&quot;'),
      escapeHtml: value => String(value),
      normalizeRoadFeature: value => value,
      polygonCenter,
      svgFabricationAttrs,
      svgFeatureTransform,
      svgPathFromPoly,
    });

    expect(svg).toContain('id="railCrossingSurveyCut"');
    expect(svg).toContain('id="railCrossingSurveySlotCut"');
    expect(svg).toContain('id="railCrossingSurveyEngrave"');
    expect(svg).toContain('data-feature-type="railCrossingSurveyAngleLabel"');
  });
});

test('GitHub settings and library list presentation are wired through their controller', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
  const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'github-library-ui-controller.js'), 'utf8');

  expect(source).toContain("import { createGithubLibraryUiController } from './site-planner/github-library-ui-controller.js';");
  expect(source).toContain('const githubLibraryUiController = createGithubLibraryUiController({');
  expect(source).toContain('function openGithubSettings(){ return githubLibraryUiController.openGithubSettings(); }');
  expect(source).toContain('function openGithubSitePlans(){ return githubLibraryUiController.openGithubSitePlans(); }');
  expect(source).toContain('function openGithubBuildings(){ return githubLibraryUiController.openGithubBuildings(); }');
  expect(source).not.toContain("function openGithubSettings(){\n    const settings=getGithubSettings();");
  expect(controller).toContain('export function createGithubLibraryUiController({');
  expect(controller).toContain('function openGithubSettings()');
  expect(controller).toContain('async function openGithubSitePlans()');
  expect(controller).toContain('async function openGithubBuildings()');
});

test('Site Planner startup and cross-window lifecycle are wired through their controller', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
  const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-runtime-lifecycle-controller.js'), 'utf8');

  expect(source).toContain("import { createSiteRuntimeLifecycleController } from './site-planner/site-runtime-lifecycle-controller.js';");
  expect(source).toContain('const siteRuntimeLifecycleController = createSiteRuntimeLifecycleController({');
  expect(source).toContain('siteRuntimeLifecycleController.bindWindowLifecycle();');
  expect(source).toContain('siteRuntimeLifecycleController.boot();');
  expect(source).not.toContain('function restoreAutosaveIfAvailable(){');
  expect(controller).toContain('function restoreAutosaveIfAvailable()');
  expect(controller).toContain("windowRef.addEventListener('beforeunload'");
  expect(controller).toContain("windowRef.addEventListener('message'");
  expect(controller).toContain("windowRef.addEventListener('storage'");
  expect(controller).toContain('function boot()');
});

test('track accessory browser filters are wired through their model module', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
  const model = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'track-accessory-browser-model.js'), 'utf8');

  expect(source).toContain("import { createTrackAccessoryBrowserModel } from './site-planner/track-accessory-browser-model.js';");
  expect(source).toContain('const trackAccessoryBrowserModel = createTrackAccessoryBrowserModel({ state, normalizeTrackAccessory });');
  expect(source).toContain('function trackAccessoryFilterCounts(){ return trackAccessoryBrowserModel.trackAccessoryFilterCounts(); }');
  expect(source).not.toContain('const TRACK_ACCESSORY_OBJECT_FILTERS = Object.freeze([');
  expect(model).toContain('export const TRACK_ACCESSORY_OBJECT_FILTERS = Object.freeze([');
  expect(model).toContain('function trackAccessoryFilterCounts()');
});
