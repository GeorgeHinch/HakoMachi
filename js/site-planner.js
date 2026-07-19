import githubData from './shared/github-data.js?v=hm-assets-20260717-1';
import { base64ToArrayBuffer, base64ToText, dataUrlFromBase64, dataUrlInfo, downloadBase64, downloadBlob, downloadText, escapeAttr, escapeHtml, formatBytes, installCanvasGestureBoundary, installThreeRenderCanvas, textToBase64 } from './shared/browser-utils.js';
import { createHakoMachiLogger } from './shared/hakomachi-diagnostics.js';
import { SVG_FABRICATION_OPERATIONS, svgFabricationColor } from './shared/svg-fabrication-colors.js';
import { createAutosaveUiController } from './site-planner/autosave-ui.js';
import { createBuildingResizeProtectionController } from './site-planner/building-resize-protection.js';
import { createBuildingSelectionController } from './site-planner/building-selection-utils.js';
import { createCanvasDrawingController } from './site-planner/canvas-drawing-utils.js';
import { createCanvasHoverPreviewRenderer } from './site-planner/canvas-hover-preview-renderer.js';
import { createGroupSelectionController } from './site-planner/group-selection-controller.js';
import { createSiteBuildingRenderer2D } from './site-planner/site-building-renderer-2d.js';
import { createSiteCanvasRenderer } from './site-planner/site-canvas-renderer.js';
import { createContextMenuController } from './site-planner/context-menu-controller.js';
import { buildingCsvExport, sitePlanSvgExport } from './site-planner/export-utils.js';
import { createAnnotationController } from './site-planner/annotation-controller.js';
import { createFabricController } from './site-planner/fabric-controller.js';
import { dataTransferHasFile, isSupportedImageFile, pageHakoImportFileFromDataTransfer, readFileAsDataURL } from './site-planner/file-import-utils.js';
import { createFootprintClipboardController } from './site-planner/footprint-clipboard-controller.js';
import { cacheImageAsset, cachedImageAsset, githubHakoAssetPath, githubImageAssetPath, githubSiteAssetFolderPath, githubStlAssetPath, githubStlSourceAssetPath, hakoFileAssetReference, imageAssetFileName, imageAssetReference, imageMetaForProject, stlAssetReference, stlSourceAssetReference, uniqueHakoAssetFileName, uniqueStlAssetFileName, uniqueStlSourceAssetFileName } from './site-planner/github-asset-paths.js';
import { createBenchworkController } from './site-planner/benchwork-controller.js';
import { createGithubDataAccess } from './site-planner/github-access-utils.js';
import { githubPlacementPreviewPolygon, githubRecordPlacementShape } from './site-planner/github-building-placement-utils.js';
import { createGithubBuildingPreviewRenderer } from './site-planner/github-building-preview-renderer.js';
import { createGithubModalController } from './site-planner/github-modal-utils.js';
import { githubProjectName, githubSiteRecord, isGithubContentsMetadata, normalizeGithubLibrary, normalizeLoadedSitePlanPayload, upsertGithubSitePlan } from './site-planner/github-site-library.js';
import { createHakoBuildingGeometryController } from './site-planner/hako-building-geometry-controller.js';
import { createHakoDropController } from './site-planner/hako-drop-ui.js';
import { collectArrayFields, deriveFootprintFromHakoConfig, extractHakoTrimLinesMm } from './site-planner/hako-footprint-utils.js';
import { createHakoHandoffController } from './site-planner/hako-handoff-controller.js';
import { createHakoFileController } from './site-planner/hako-file-utils.js';
import { createHakoImportController } from './site-planner/hako-import-controller.js';
import { hydrateIcons, setIcon } from './site-planner/icons.js';
import { installAdaptiveDegreeStepping } from './site-planner/input-stepping.js';
import { findSiteBundleProjectName, hydrateSiteBundleAssets, isSiteBundlePackageFile } from './site-planner/project-bundle-utils.js';
import { buildLocalHakoBundleAssets, buildLocalImageBundleAsset, buildLocalStlBundleAssets } from './site-planner/project-bundle-save-utils.js';
import { byteLength as diagnosticByteLength, createPersistenceDiagnostics, summarizePersistenceAssets } from './site-planner/persistence-diagnostics.js';
import { AUTOSAVE_KEY, AUTOSAVE_META_KEY, GITHUB_CURRENT_KEY, createInitialState } from './site-planner/state.js';
import { bboxOverlaps, clamp, closestPointOnSegment, deg, dist, distanceToSegment, fmt, pointInPoly, polygonArea, polygonCenter, rad, rectLocal, selectionRectFromPoints, transformedRect, uid } from './site-planner/geometry.js';
import { createImportProgressController } from './site-planner/import-progress-modal.js';
import { BUILDING_STATES, FABRIC_PRESETS, JP_ROAD_MARKING_STANDARD_ID, ROAD_WIDTH_PRESETS, SIDEWALK_WIDTH_PRESETS, TRACK_PROFILE_DEFAULTS } from './site-planner/presets.js';
import { loadAlignmentMessage, restoreProjectView, savedImageDimensions, scaleLoadedPixelGeometry } from './site-planner/project-load-utils.js';
import { createReferenceImageUiController } from './site-planner/reference-image-ui.js';
import { drainageGrateFamilyOptions, grateFamilyPresetByKey } from './site-planner/road-drainage-grate-inserts.js';
import { normalizeIntersectionOverride, roadArmKey } from './site-planner/road-intersection-overrides.js';
import { createRoadSystemController } from './site-planner/road-system-controller.js';
import { createRoadAssetExportController } from './site-planner/road-asset-export-controller.js';
import { createRoadExportReviewController } from './site-planner/road-export-review-panel.js';
import { createRoadIntersectionMarkingControls } from './site-planner/road-intersection-marking-controls.js';
import { migrateRoadFeatures } from './site-planner/road-feature-migration.js';
import { createRoadPresetApplicationController } from './site-planner/road-preset-application-utils.js';
import { applyRoadHatchPreset, applyRoadMarkingPreset, hatchOptionsHtml, hatchPresetByKey, markingOptionsHtml, markingPresetByKey, presetModelMm, presetOptionsHtml, roadPresetByKey, sidewalkPresetByKey } from './site-planner/road-preset-utils.js';
import { RAIL_CROSSING_CENTER_CLEARANCE_MM, buildRailCrossingInfillPanels, buildRailCrossings, hitRailCrossing, normalizeRailCrossingOverride, railCrossingOverrideKey, railCrossingSvgRecords } from './site-planner/rail-crossing-generator.js';
import { createRailCrossingRenderer2D } from './site-planner/rail-crossing-renderer-2d.js';
import { createScaleInputController } from './site-planner/scale-input-utils.js';
import { activeSidebarDetailKindForState, activeSidebarDetailTitle as sidebarDetailTitle, sidebarTypeForDetailKind } from './site-planner/sidebar-object-model.js';
import { createSidebarObjectBrowserController } from './site-planner/sidebar-object-browser-controller.js';
import { renderRailCrossingDetail } from './site-planner/sidebar-rail-crossing-detail.js';
import { renderRoadFeatureDetail } from './site-planner/sidebar-road-feature-detail.js';
import { renderRoadDetail } from './site-planner/sidebar-road-detail.js';
import { renderRoadIntersectionDetail } from './site-planner/sidebar-road-intersection-detail.js';
import { renderBenchworkDetail } from './site-planner/sidebar-benchwork-detail.js';
import { renderFabricDetail } from './site-planner/sidebar-fabric-detail.js';
import { renderStlDetail } from './site-planner/sidebar-stl-detail.js';
import { renderStreetlightDetail } from './site-planner/sidebar-streetlight-detail.js';
import { renderTrackDetail } from './site-planner/sidebar-track-detail.js';
import { renderTrackAccessoryDetail } from './site-planner/sidebar-track-accessory-detail.js';
import { createSite3DBaseRenderer } from './site-planner/site-3d-base-renderer.js';
import { createSite3DBuildingConfigController } from './site-planner/site-3d-building-config.js';
import { createSite3DTrackAccessoryRenderer } from './site-planner/site-3d-track-accessory-renderer.js';
import { createSite3DBuildingRenderer } from './site-planner/site-3d-building-renderer.js';
import { createSite3DMeshUtils } from './site-planner/site-3d-mesh-utils.js';
import { createSite3DObjectTagging } from './site-planner/site-3d-object-tagging.js';
import { createSite3DInteractionController } from './site-planner/site-3d-interaction-controller.js';
import { createSite3DRoadRenderer } from './site-planner/site-3d-road-renderer.js';
import { createSite3DSceneController } from './site-planner/site-3d-scene-controller.js';
import { createSite3DSceneUtils } from './site-planner/site-3d-scene-utils.js';
import { createSite3DTrackRenderer } from './site-planner/site-3d-track-renderer.js';
import { createSite3DStlRenderer } from './site-planner/site-3d-stl-renderer.js';
import { createSiteObjectSelectionController } from './site-planner/site-object-selection-controller.js';
import { createSitePointerInteractionController } from './site-planner/site-pointer-interaction-controller.js';
import { createSiteProjectPersistenceController } from './site-planner/site-project-persistence-controller.js';
import { createSidebarUiController } from './site-planner/sidebar-ui.js';
import { createStatusUiController } from './site-planner/status-ui.js';
import { createStreetlightController } from './site-planner/streetlight-controller.js';
import { createStlImportController } from './site-planner/stl-import-controller.js';
import { createStlObjectModelController } from './site-planner/stl-object-model.js';
import { boundsFromVertices, estimateStlTriangleCount, isLikelyStlFile, parseStlVertices } from './site-planner/stl-utils.js';
import { svgFabricationAttrs, svgFeatureTransform, svgPathFromPoly } from './site-planner/svg-export-utils.js';
import { createTrackAccessoryGeometry } from './site-planner/track-accessory-geometry.js';
import { createTrackAccessoryRenderer2D } from './site-planner/track-accessory-renderer-2d.js';
import { createTrackRenderer2D } from './site-planner/track-renderer-2d.js';
import { installTopMenus } from './site-planner/top-menu-utils.js';
import { createTrackController } from './site-planner/track-controller.js';
import { createToolFlyoutController } from './site-planner/tool-flyout-utils.js';
import { createToolTooltipController } from './site-planner/tool-tooltip-controller.js';
import { createToolVariantController } from './site-planner/tool-variant-controller.js';
import { createViewTransformController } from './site-planner/view-transform-utils.js';
import { createWorkspaceModeController } from './site-planner/workspace-mode-controller.js';
import { clipPolygonByHalfPlane } from './building-generator/core/layout-cut-geometry.js?v=hm-assets-20260717-1';

(() => {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const wrap = canvas.parentElement;
  const $ = id => document.getElementById(id);
  const logger = createHakoMachiLogger('Site Planner');
  canvas.setAttribute('draggable', 'false');
  function clearCanvasBrowserSelection(){
    try {
      const selection=window.getSelection&&window.getSelection();
      if(selection && !selection.isCollapsed) selection.removeAllRanges();
    } catch (_err) {}
  }
  ['selectstart','dragstart'].forEach(type=>{
    wrap.addEventListener(type, e=>{
      e.preventDefault();
      clearCanvasBrowserSelection();
    });
  });
  function ensureSite3dView(){
    let view = $('site3dView');
    if(view) return view;
    view = document.createElement('div');
    view.id = 'site3dView';
    view.className = 'site3dView';
    view.setAttribute('aria-label', '3D site view');
    wrap.insertBefore(view, canvas.nextSibling);
    return view;
  }
  const state = createInitialState();
  const GITHUB_DEFAULT_LIBRARY = githubData.DEFAULT_LIBRARY_PATH;
  const GITHUB_DEFAULT_SITE_DIR = githubData.DEFAULT_SITE_PLANS_DIR;
  const SITE_PLANNER_SEED_KEY = 'hakomachiSitePlannerSeed';
  const SITE_PLANNER_BUILDING_UPDATE_KEY = 'hakomachiSitePlannerBuildingUpdate_v1';
  const SITE3D_BASE_THICKNESS_MM = 4;
  const SITE3D_DEFAULT_IMAGE_OPACITY = 0.45;
  const CATENARY_PROTOTYPE_SPACING_M = 30;
  const CATENARY_JAPANESE_N_SCALE = 150;
  const CATENARY_SPACING_MODEL_MM = CATENARY_PROTOTYPE_SPACING_M * 1000 / CATENARY_JAPANESE_N_SCALE;
  const TOMIX_TURNOUT_RADIUS_MM = 541;
  const TOMIX_TURNOUT_ANGLE_DEG = 15;
  const TOMIX_TURNOUT_ANGLE_RAD = TOMIX_TURNOUT_ANGLE_DEG * Math.PI / 180;
  const TOMIX_TURNOUT_LENGTH_MM = TOMIX_TURNOUT_RADIUS_MM * Math.sin(TOMIX_TURNOUT_ANGLE_RAD);
  const TOMIX_TURNOUT_OFFSET_MM = TOMIX_TURNOUT_RADIUS_MM * (1 - Math.cos(TOMIX_TURNOUT_ANGLE_RAD));
  const TOMIX_CURVED_TURNOUT_OUTER_RADIUS_MM = 317;
  const TOMIX_CURVED_TURNOUT_INNER_RADIUS_MM = 280;
  const TOMIX_CURVED_TURNOUT_ANGLE_DEG = 45;
  const TOMIX_CURVED_TURNOUT_ANGLE_RAD = TOMIX_CURVED_TURNOUT_ANGLE_DEG * Math.PI / 180;
  const TOMIX_TURNOUT_GAUGE_MM = 9;
  const TOMIX_TURNOUT_ROADBED_WIDTH_MM = 18.5;
  const TOMIX_TURNOUT_TIE_LENGTH_MM = 18;
  const TOMIX_TURNOUT_TIE_WIDTH_MM = 2;
  const TOMIX_TURNOUT_TIE_SPACING_MM = 8;
  const TOMIX_TURNOUT_RAIL_WIDTH_MM = 0.8;
  const TOMIX_1428_BUFFER_LENGTH_MM = 22;
  const TOMIX_1428_BUFFER_WIDTH_MM = 18.5;
  const TOMIX_1428_BUFFER_TIE_SPACING_MM = 5;
  const TOMIX_1428_BUFFER_TERMINAL_HEIGHT_MM = 48;
  const SVG_OP = SVG_FABRICATION_OPERATIONS;
  const SVG_RETAINED_CUT = svgFabricationColor(SVG_OP.CUT_RETAINED);
  const SVG_SCRAP_CUT = svgFabricationColor(SVG_OP.CUT_SCRAP);
  const SVG_ENGRAVE = svgFabricationColor(SVG_OP.ENGRAVE);
  const TRACK_ACCESSORY_PRESETS = Object.freeze({
    sensor: { label: 'Under-track Sensor', color: '#2f6f7e', defaultNotes: 'Placed beneath physical track alignment.' },
    signal: { label: 'Signal Location', color: '#b8672d', defaultNotes: 'Signal placement marker.' },
    crossingArm: { label: 'Crossing Arm', color: '#c84a3a', defaultNotes: 'Crossing arm placement marker.' },
    intrusionDetector: { label: 'Intrusion Detector', color: '#7b5aa6', defaultNotes: 'Level crossing intrusion detection marker.' },
    occupancyLight: { label: 'Blinking Occupancy Lights', color: '#c84a3a', defaultNotes: 'Blinking occupancy detection lights for level crossing status.' },
    trackSwitchLeft: { label: 'Left-hand Track Switch', color: '#4b4438', defaultNotes: 'Tomix PL541-15 style left-hand turnout marker: 541 mm radius, 15 degree diverging route.' },
    trackSwitchRight: { label: 'Right-hand Track Switch', color: '#4b4438', defaultNotes: 'Tomix PR541-15 style right-hand turnout marker: 541 mm radius, 15 degree diverging route.' },
    trackSwitchTomix1279Left: { label: 'Tomix 1279 Left Curved Switch', color: '#4b4438', defaultNotes: 'Tomix 1279 N-CPL317/280-45 left curved turnout marker: 317 mm outer curve, 280 mm inner diverging curve, 45 degree routes.' },
    trackSwitchTomix1278Right: { label: 'Tomix 1278 Right Curved Switch', color: '#4b4438', defaultNotes: 'Tomix 1278 N-CPR317/280-45 right curved turnout marker: 317 mm outer curve, 280 mm inner diverging curve, 45 degree routes.' },
    trackBufferTomix1428: { label: 'Tomix 1428 Buffer Stop', color: '#6f6a5e', defaultNotes: 'Tomix 1428 style end-of-track buffer stop marker.' },
    trackBufferTomix1428Catenary: { label: 'Tomix 1428 Buffer + Catenary Terminal', color: '#6f6a5e', defaultNotes: 'Tomix 1428 style buffer stop marker with catenary end terminal enabled.' },
    catenarySingleSide: { label: 'Single-side Catenary Pole', color: '#f2f0e8', defaultNotes: 'Single-track catenary pole with one side mast and outreach arm.' },
    catenaryDoublePortal: { label: 'Double-track Catenary Portal', color: '#f2f0e8', defaultNotes: 'Double-track catenary gantry with poles on both sides.' },
  });
  let autosaveTimer = null;
  let autosaveSuppressed = false;
  let renderQueued = false;
  let activeSidebarDetailKey = null;
  let roadSystem = null;
  let roadAssetExporter = null;
  let roadExportReview = null;
  let roadIntersectionMarkingControls = null;
  let hakoBuildingGeometryController = null;
  let trackAccessoryGeometry = null;
  let trackAccessoryRenderer2D = null;
  let site3DBuildingConfigController = null;
  let site3DBaseRenderer = null;
  let site3DTrackAccessoryRenderer = null;
  let site3DBuildingRenderer = null;
  let site3DStlRenderer = null;
  let githubBuildingPreviewRenderer = null;
  let siteObjectSelectionController = null;
  let sidebarObjectBrowserController = null;
  let sitePointerInteractionController = null;
  let siteProjectPersistenceController = null;
  let updateRoadToolButton = () => {};
  let updateStreetlightToolButton = () => {};
  let updateTrackSwitchToolButton = () => {};
  let updateTrackBufferToolButton = () => {};
  let updateCatenaryToolButton = () => {};
  let updateWorkspaceModeUi = () => {};
  let setWorkspaceMode = () => {};
  let setActiveTool = () => {};
  let drawGrid = () => {};
  let drawLabel = () => {};
  let drawLine = () => {};
  let drawSelectionMarquee = () => {};
  let fabricController = null;
  const colors = ['#d79631','#b8672d','#0f766e','#7c5f3f','#8b5a2b','#5f7f54','#9b6b44','#496a78'];
  function initFabricControls(){
    if(fabricController) fabricController.initFabricControls();
  }
  const {
    openImportProgressModal,
    setImportProgress,
    finishImportProgress,
    failImportProgress,
  } = createImportProgressController();
  const {
    getGithubSettings,
    setGithubSettings,
    getCurrentGithubSite,
    setCurrentGithubSite,
    requireGithubSettings,
    readGithubFile,
    writeGithubFile,
    readGithubBase64File,
    writeGithubBase64File,
    loadGithubLibrary,
  } = createGithubDataAccess(githubData, GITHUB_CURRENT_KEY);
  const {
    openGithubModal,
    closeGithubModal,
    setGithubStatus,
    setGithubProgress,
    openGithubSaveProgressModal,
  } = createGithubModalController({getElement:$});
  const {
    hideToolFlyouts,
    toggleToolFlyout,
  } = createToolFlyoutController({getElement:$, clamp});
  const {
    installTooltips,
  } = createToolTooltipController({clamp});
  const {
    updateEmptyImageOverlay,
    setImageStatus,
    updateImagePortableStatus,
  } = createReferenceImageUiController({state, getElement:$});
  const {
    updateAutosaveStatus,
  } = createAutosaveUiController({state, getElement:$});
  const {
    updateStatus,
  } = createStatusUiController({
    state,
    getElement:$,
    fmt,
    activeSidebarDetailKind,
    initFabricControls,
  });
  function showStatusHint(message, tone=''){
    const hint=$('statusHint');
    if(!hint) return;
    hint.textContent=message||'';
    if(tone) hint.dataset.tone=tone;
    else delete hint.dataset.tone;
  }
  const { currentScaleDivisor, modelKnownMm } = createScaleInputController({getElement:$});
  const {
    screenToWorld,
    setCanvasZoomAtClientPoint,
    zoomCanvasAtClientPoint,
  } = createViewTransformController({canvas, state, clamp, draw:()=>draw()});
  ({
    drawGrid,
    drawLabel,
    drawLine,
    drawSelectionMarquee,
  } = createCanvasDrawingController({
    canvas,
    ctx,
    state,
    mmToPx,
    screenToWorld,
    selectionRectFromPoints,
  }));
  const {
    setSidebarOpen,
    installSidebarToggle,
  } = createSidebarUiController({state, getElement:$, scheduleResize:()=>setTimeout(resize, 0)});
  const {
    roadPresetScaleContext,
    applyRoadWidthPreset,
    applySidewalkWidthPreset,
  } = createRoadPresetApplicationController({state, mmToPx, currentScaleDivisor, rebuildRoadGeometry});
  const {
    normalizeStlObject,
    stlObjectRect,
    hitStlObject,
    selectedStlObject,
    drawStlObject,
    deleteSelectedStlObject,
    selectStlObject,
  } = createStlObjectModelController({
    state,
    uid,
    slug,
    rad,
    ctx,
    fmt,
    mmToPx,
    visibleWorldCenter,
    transformedRect,
    pointInPoly,
    polyEdgeDistance,
    lockedHitTolerance,
    isSiteObjectSelected,
    setSingleSiteObjectSelection,
    drawLabel: (...args) => drawLabel(...args),
    refreshSelection: () => {renderList(); renderRoads(); renderStreetlights(); renderSelected(); updateHandoff(); draw();},
    syncAll,
  });
  function resize(){const r=wrap.getBoundingClientRect(); const dpr=devicePixelRatio||1; canvas.width=Math.max(1,Math.floor(r.width*dpr)); canvas.height=Math.max(1,Math.floor(r.height*dpr)); ctx.setTransform(dpr,0,0,dpr,0,0); draw(); resizeSite3D();}
  window.addEventListener('resize', resize);
  installSidebarToggle();
  function mmToPx(mm){return state.pxPerMm? mm*state.pxPerMm : mm;}
  function pxToMm(px){return state.pxPerMm? px/state.pxPerMm : px;}
  function pointInBuilding(p,b){if(b.hidden) return false; return visibleBuildingPolygons(b).some(pts=>pts.length>=3 && pointInPoly(p,pts));}
  function lockedHitTolerance(pointerType='mouse'){
    const coarse=(pointerType==='pen'||pointerType==='touch'||matchMedia('(pointer: coarse)').matches);
    return (coarse?18:9)/state.view.scale;
  }
  function hitBuildingSelectable(p,b,pointerType='mouse'){
    if(!b || b.hidden) return false;
    if(!b.locked) return pointInBuilding(p,b);
    const pts=buildingPoints(b);
    if(!pts || pts.length<2) return false;
    return polyEdgeDistance(p,pts) <= lockedHitTolerance(pointerType);
  }
  function hitTest(p,pointerType='mouse'){for(let i=state.buildings.length-1;i>=0;i--){const b=state.buildings[i]; if(hitBuildingSelectable(p,b,pointerType)) return b;} return null;}


  function normalizeRoad(r){
    return roadSystem.normalizeRoad(r);
  }
  function syncRoadMetrics(r){
    return roadSystem.syncRoadMetrics(r);
  }
  function quadPoint(a,c,b,t){
    const mt=1-t;
    return {x:mt*mt*a.x+2*mt*t*c.x+t*t*b.x, y:mt*mt*a.y+2*mt*t*c.y+t*t*b.y};
  }
  function roadCenterlineSamples(r, perCurve=14){
    return roadSystem.roadCenterlineSamples(r, perCurve);
  }
  function roadOutlineSamples(r, perCurve=14){
    return roadSystem.roadOutlineSamples(r, perCurve);
  }
  function offsetPathPolygon(path, offsetPx){
    if(!Array.isArray(path) || path.length<2 || !Number.isFinite(offsetPx) || Math.abs(offsetPx)<0.001) return [];
    const side=(sign)=>path.map((p,i)=>{
      const prev=path[Math.max(0,i-1)], next=path[Math.min(path.length-1,i+1)];
      let dx=next.x-prev.x, dy=next.y-prev.y, len=Math.hypot(dx,dy)||1;
      const nx=-dy/len, ny=dx/len;
      return {x:p.x+nx*offsetPx*sign,y:p.y+ny*offsetPx*sign};
    });
    const left=side(1), right=side(-1).reverse();
    return left.concat(right);
  }
  function roadSidewalkPolygons(r){
    return roadSystem.roadSidewalkPolygons(r);
  }
  function rebuildRoadGeometry(r){
    return roadSystem.rebuildRoadGeometry(r);
  }
  function hitRoadCenterlineSegment(p,r,pointerType='mouse'){
    return roadSystem.hitRoadCenterlineSegment(p, r, pointerType);
  }
  function hitRoadOutlineSegment(p,r,pointerType='mouse'){
    return roadSystem.hitRoadOutlineSegment(p, r, pointerType);
  }
  function hitRoadPoint(p,r,pointerType='mouse'){
    return roadSystem.hitRoadPoint(p, r, pointerType);
  }

  function nearestPointOnRoadPath(p, road, includeEndpoints=true){
    return roadSystem.nearestPointOnRoadPath(p, road, includeEndpoints);
  }
  function findRoadConnectionSnap(p, excludeRoadId=null, pointerType='mouse'){
    return roadSystem.findRoadConnectionSnap(p, excludeRoadId, pointerType);
  }
  function snapRoadPointForConnection(p, excludeRoadId=null, pointerType='mouse'){
    return roadSystem.snapRoadPointForConnection(p, excludeRoadId, pointerType);
  }
  function setRoadEndpointConnection(r, index, snap){
    return roadSystem.setRoadEndpointConnection(r, index, snap);
  }
  function selectedRoad(){return roadSystem.selectedRoad();}
  function hitRoad(p,pointerType='mouse'){
    return roadSystem.hitRoad(p, pointerType);
  }
  function moveRoad(r, dx, dy){
    return roadSystem.moveRoad(r, dx, dy);
  }
  function deleteSelectedRoad(){
    return roadSystem.deleteSelectedRoad();
  }
  function normalizeRoadFeature(f){
    return roadSystem.normalizeRoadFeature(f);
  }
  function migrateLoadedRoadFeatures(features){
    return migrateRoadFeatures(Array.isArray(features) ? structuredClone(features) : [], {}, { pxPerMm: state.pxPerMm }).map(normalizeRoadFeature);
  }
  function grateFamilyOptionsHtml(selectedKey){
    const selected=grateFamilyPresetByKey(selectedKey||'rectangularDrain').key;
    return drainageGrateFamilyOptions().map(option=>`<option value="${escapeAttr(option.value)}" ${option.value===selected?'selected':''}>${escapeHtml(option.label)}</option>`).join('');
  }
  function applyPhysicalGrateFamily(feature, key){
    const preset=grateFamilyPresetByKey(key||feature.grateInsertSpec?.key||'rectangularDrain');
    feature.physicalInsert='foldedDrainageGrateInsert';
    feature.grateInsertSpec={
      ...(feature.grateInsertSpec||{}),
      key:preset.key,
      widthMm:preset.widthMm,
      depthMm:preset.depthMm,
      diameterMm:preset.diameterMm,
      shape:preset.shape,
    };
    feature.hatchShape=preset.shape==='circle'?'circle':'rect';
    if(preset.shape==='circle'){
      feature.diameterMm=preset.diameterMm||preset.widthMm;
      if(state.pxPerMm) feature.diameterPx=mmToPx(feature.diameterMm);
    } else {
      feature.widthMm=preset.widthMm;
      feature.depthMm=preset.depthMm;
      if(state.pxPerMm){feature.widthPx=mmToPx(feature.widthMm); feature.depthPx=mmToPx(feature.depthMm);}
    }
    return feature;
  }
  function syncPhysicalGrateSpecDimensions(feature){
    if(feature.physicalInsert!=='foldedDrainageGrateInsert') return feature;
    feature.grateInsertSpec=feature.grateInsertSpec||{key:feature.hatchShape==='circle'?'etchedManholeCover':'rectangularDrain'};
    if(feature.hatchShape==='circle'){
      feature.grateInsertSpec.shape='circle';
      feature.grateInsertSpec.diameterMm=feature.diameterMm;
      feature.grateInsertSpec.widthMm=feature.diameterMm;
      feature.grateInsertSpec.depthMm=feature.diameterMm;
    } else {
      feature.grateInsertSpec.shape='rect';
      feature.grateInsertSpec.widthMm=feature.widthMm;
      feature.grateInsertSpec.depthMm=feature.depthMm;
    }
    return feature;
  }
  function setPhysicalGrateMode(feature, enabled){
    if(enabled) return applyPhysicalGrateFamily(feature, feature.grateInsertSpec?.key || (feature.hatchShape==='circle'?'etchedManholeCover':'rectangularDrain'));
    delete feature.physicalInsert;
    delete feature.grateInsertSpec;
    return feature;
  }
  function setRoadMarkingOutputMode(feature, mode){
    feature.outputMode=mode==='paintStencil'?'paintStencil':'etch';
    if(feature.outputMode==='paintStencil'){
      feature.visualOnly=false;
      feature.cutBehavior='paintStencil';
      feature.exportLayer='paintStencilCut';
      feature.stencilMaterialId=feature.stencilMaterialId||'stencil-stock';
      feature.stencilSpec=feature.stencilSpec||{marginMm:2, bridgeMm:0.35};
    } else {
      feature.visualOnly=true;
      feature.cutBehavior='etchOnly';
      feature.exportLayer='roadMarkingEtch';
    }
    return feature;
  }
  function normalizeDrivingSide(value){
    return value === 'right' ? 'right' : 'left';
  }
  function selectedRoadFeature(){return roadSystem.selectedRoadFeature();}
  function clearRoadFeatureSelection(){return roadSystem.clearRoadFeatureSelection();}
  function roadSurfaceAtPoint(p){
    return roadSystem.roadSurfaceAtPoint(p);
  }
  function hitRoadFeature(p,pointerType='mouse'){
    return roadSystem.hitRoadFeature(p, pointerType);
  }
  function placeRoadFeature(p,kind){
    return roadSystem.placeRoadFeature(p, kind);
  }
  function moveRoadFeature(f,dx,dy){ return roadSystem.moveRoadFeature(f, dx, dy); }
  function alignRoadMarkingToRoad(f){ return roadSystem.alignRoadMarkingToRoad(f); }
  function fitRoadMarkingToRoad(f){ return roadSystem.fitRoadMarkingToRoad(f); }
  function deleteSelectedRoadFeature(){
    return roadSystem.deleteSelectedRoadFeature();
  }

  function drawRoadMarkingShape(f){
    return roadSystem.drawRoadMarkingShape(f);
  }

  function drawRoadFeature(raw){
    return roadSystem.drawRoadFeature(raw);
  }
  function createRoadCenterlineFromPoints(points){
    return roadSystem.createRoadCenterlineFromPoints(points);
  }
  function createRoadCenterline(a,b){ return createRoadCenterlineFromPoints([a,b]); }
  function finishRoadCenterline(){
    return roadSystem.finishRoadCenterline();
  }
  function finishRoadOutline(){
    return roadSystem.finishRoadOutline();
  }

  function drawPoly(pts, fill=true, stroke=true){
    if(!Array.isArray(pts) || pts.length<2) return;
    ctx.beginPath();
    pts.forEach((p,i)=>{
      if(i===0) ctx.moveTo(p.x,p.y);
      else ctx.lineTo(p.x,p.y);
    });
    if(pts.length>2) ctx.closePath();
    if(fill && pts.length>2) ctx.fill();
    if(stroke) ctx.stroke();
  }

  function drawRoadGeneratedPath(path, stroke, width=1.4, dash=null){
    if(!Array.isArray(path) || path.length<2) return;
    ctx.save();
    ctx.strokeStyle=stroke;
    ctx.lineWidth=width/state.view.scale;
    if(dash) ctx.setLineDash(dash.map(v=>v/state.view.scale));
    ctx.beginPath();
    path.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    ctx.stroke();
    ctx.restore();
  }
  function drawTrackModelPath(path, stroke, width=1.4, alpha=1){
    if(!Array.isArray(path) || path.length<2) return;
    ctx.save();
    ctx.strokeStyle=stroke;
    ctx.globalAlpha=alpha;
    ctx.lineWidth=width;
    ctx.lineCap='round';
    ctx.lineJoin='round';
    ctx.beginPath();
    path.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    ctx.stroke();
    ctx.restore();
  }
  function roadEdgePaths(r){
    return roadSystem.roadEdgePaths(r);
  }

  function roadHasSidewalk(r){
    return roadSystem.roadHasSidewalk(r);
  }
  function roadEndpointJunctions(){
    return roadSystem.roadEndpointJunctions();
  }
  function benchworkBoundaryDistances(path){
    return roadSystem.benchworkBoundaryDistances(path);
  }
  function roadJunctionPoints(){return roadSystem.roadJunctionPoints();}
  function sidewalkTotalWidthPx(r){
    return roadSystem.sidewalkTotalWidthPx(r);
  }
  function roadSeamLineAt(r, path, d, opts={}){
    return roadSystem.roadSeamLineAt(r, path, d, opts);
  }
  function outlineSeams(r,maxPiecePx){
    return roadSystem.outlineSeams(r, maxPiecePx);
  }
  function generateRoadExportData(){
    return roadSystem.generateRoadExportData();
  }
  function drawRoadExportPreview(){
    return roadSystem.drawRoadExportPreview();
  }
  function updateRoadExportBadge(data){
    const el=$('roadExportBadge'); if(!el) return;
    if(!state.roadExportPreview){el.style.display='none'; return;}
    el.style.display='block';
    el.innerHTML=`<b>Road Export Preview</b>${data.roads.length} roads · ${data.seams.length} seam cuts<br><span class="muted">Seams avoid junction bulbs and use benchwork crossings where found.</span>`;
  }
  function setRoadExportPreview(on){
    state.roadExportPreview=!!on;
    ['roadExportPreviewBtn','mobileRoadExportPreviewBtn'].forEach(id=>{const b=$(id); if(b) b.textContent='Road Export Preview: '+(state.roadExportPreview?'On':'Off');});
    updateWorkspaceModeUi();
    draw();
  }
  function openRoadExportReview(){
    state.roadTask='exportAssets';
    setWorkspaceMode('road', {preserveRoadTask: true});
    updateWorkspaceModeUi();
    roadExportReview?.open();
  }
  function drawRoadJunctions(){
    return roadSystem.drawRoadJunctions();
  }
  function drawGeneratedRoadIntersections(){
    return roadSystem.drawGeneratedRoadIntersections({selectedIntersectionKey:state.selectedRoadIntersectionId});
  }
  function drawRoad(r){
    return roadSystem.drawRoad(r);
  }
  function benchworkClipPolygons(perCurve=24){
    return (state.benchworkOutlines||[])
      .map(raw=>normalizeBenchworkOutline(raw))
      .filter(bw=>bw && !bw.hidden)
      .map(bw=>benchworkSamples(bw,perCurve))
      .filter(poly=>poly.length>=3);
  }
  function withRoadBenchworkClip(drawFn){
    const clips=state.workspaceMode==='road' ? [] : benchworkClipPolygons(24);
    if(!clips.length){ drawFn(); return; }
    ctx.save();
    ctx.beginPath();
    clips.forEach(poly=>{
      poly.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
      ctx.closePath();
    });
    ctx.clip();
    drawFn();
    ctx.restore();
  }
  function drawRoadLayer(){
    withRoadBenchworkClip(()=>{
      state.roads.forEach(drawRoad);
      drawRoadJunctions();
      drawGeneratedRoadIntersections();
      (state.roadFeatures||[]).forEach(drawRoadFeature);
      drawRoadExportPreview();
    });
  }
  function signedAreaForClip(poly){
    return (poly||[]).reduce((sum,p,i,arr)=>{
      const q=arr[(i+1)%arr.length]||p;
      return sum + p.x*q.y - q.x*p.y;
    },0)/2;
  }
  function clipPolygonToEdge(subject,a,b,keepLeft=true){
    if(!Array.isArray(subject) || subject.length<3) return [];
    const out=[];
    const inside=p=>{
      const cross=(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x);
      return keepLeft ? cross>=-0.001 : cross<=0.001;
    };
    const intersection=(p,q)=>{
      const dx=q.x-p.x, dy=q.y-p.y;
      const ex=b.x-a.x, ey=b.y-a.y;
      const denom=dx*ey-dy*ex;
      if(Math.abs(denom)<1e-9) return q;
      const t=((a.x-p.x)*ey-(a.y-p.y)*ex)/denom;
      return {x:p.x+dx*t,y:p.y+dy*t};
    };
    for(let i=0;i<subject.length;i++){
      const cur=subject[i], prev=subject[(i+subject.length-1)%subject.length];
      const curInside=inside(cur), prevInside=inside(prev);
      if(curInside){
        if(!prevInside) out.push(intersection(prev,cur));
        out.push(cur);
      } else if(prevInside){
        out.push(intersection(prev,cur));
      }
    }
    return out.filter((p,i,arr)=>i===0 || dist(p,arr[i-1])>0.01);
  }
  function isConvexPolygon(poly){
    if(!Array.isArray(poly) || poly.length<3) return false;
    let sign=0;
    for(let i=0;i<poly.length;i++){
      const a=poly[i], b=poly[(i+1)%poly.length], c=poly[(i+2)%poly.length];
      const cross=(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);
      if(Math.abs(cross)<0.001) continue;
      const next=Math.sign(cross);
      if(sign && next!==sign) return false;
      sign=next;
    }
    return true;
  }
  function clipPolygonToBenchwork(poly, opts={}){
    if(!Array.isArray(poly) || poly.length<3) return [];
    const clips=benchworkClipPolygons(opts.perCurve||24);
    if(!clips.length) return [poly];
    const out=[];
    let convexClipCount=0;
    clips.forEach(rawClip=>{
      if(!isConvexPolygon(rawClip)) return;
      convexClipCount++;
      const clip=signedAreaForClip(rawClip)<0 ? rawClip.slice().reverse() : rawClip.slice();
      let clipped=poly.slice();
      for(let i=0;i<clip.length && clipped.length>=3;i++){
        clipped=clipPolygonToEdge(clipped,clip[i],clip[(i+1)%clip.length],true);
      }
      if(clipped.length>=3 && Math.abs(signedAreaForClip(clipped))>.5) out.push(clipped);
    });
    if(!convexClipCount) return [poly];
    return out;
  }
  function roadDisplayPolygons(road, opts={}){
    const clip=opts.clipToBenchwork!==false;
    const roadPolygons=clip ? clipPolygonToBenchwork(road.roadPolygonPx||[],opts) : [road.roadPolygonPx||[]].filter(poly=>poly.length>=3);
    const sidewalkPolygons=[];
    (road.sidewalkPolygonsPx||[]).forEach((sw,idx)=>{
      const polys=clip ? clipPolygonToBenchwork(sw.polygon||[],opts) : [sw.polygon||[]].filter(poly=>poly.length>=3);
      polys.forEach((polygon,pieceIndex)=>sidewalkPolygons.push({...sw, polygon, sourceIndex:idx, pieceIndex}));
    });
    return {roadPolygons, sidewalkPolygons};
  }
  function shouldClipRoadsToBenchwork(){
    return state.workspaceMode!=='road';
  }
  function generatedRailCrossings(){
    const crossings=buildRailCrossings({
      roads:(state.roads||[]).map(normalizeRoad),
      tracks:(state.tracks||[]).map(normalizeTrack),
      roadCenterlineSamples,
      trackPathSamples,
      pxPerMm:state.pxPerMm,
      overrides:state.railCrossingOverrides||{},
    });
    state.generatedRailCrossings=crossings;
    return crossings;
  }
  function railCrossingInfillPanels(crossings=generatedRailCrossings()){
    const roadWidthPxById={};
    (state.roads||[]).forEach(raw=>{const road=normalizeRoad(raw); roadWidthPxById[road.id]=road.widthPx||24;});
    return buildRailCrossingInfillPanels(crossings,{roadWidthPxById});
  }
  function roadIntersectionKey(intersection){
    return intersection?.overrideKey || intersection?.id || '';
  }
  function generatedRoadIntersections(){
    return roadSystem.generatedRoadIntersections();
  }
  function selectedRoadIntersection(){
    const id=state.selectedRoadIntersectionId;
    if(!id) return null;
    if(selectedSiteObjectCount() || state.selectedId || currentSelectedBuildingIds().length || state.selectedAnnotationId || state.selectedRoadFeatureId || state.selectedRoadId || state.selectedTrackId || state.selectedTrackAccessoryId || state.selectedBenchworkId || state.selectedStreetlightId || state.selectedFabricId || state.selectedStlObjectId || state.selectedRailCrossingId) return null;
    return generatedRoadIntersections().find(intersection=>roadIntersectionKey(intersection)===id) || null;
  }
  function selectRoadIntersection(intersection){
    if(!intersection) return false;
    clearBuildingSelection();
    clearSelectedSiteObjects();
    state.selectedRoadId=null;
    state.selectedRoadFeatureId=null;
    state.selectedTrackId=null;
    state.selectedTrackPointIndex=null;
    state.selectedTrackAccessoryId=null;
    state.selectedBenchworkId=null;
    state.selectedStreetlightId=null;
    state.selectedAnnotationId=null;
    state.selectedFabricId=null;
    state.selectedStlObjectId=null;
    state.selectedRailCrossingId=null;
    state.selectedRoadIntersectionId=roadIntersectionKey(intersection);
    renderList(); renderRoads(); renderStreetlights(); renderSelected(); draw();
    return true;
  }
  function hitGeneratedRoadIntersection(p,pointerType='mouse'){
    if(state.roadIntersectionDetails===false) return null;
    const coarse=pointerType==='touch';
    const baseTol=(coarse?18:10)/state.view.scale;
    let best=null;
    generatedRoadIntersections().forEach(intersection=>{
      const center=intersection.center||intersection;
      if(!center) return;
      const tol=Math.max(baseTol, Math.min(24/state.view.scale, (intersection.maxRoadWidthPx||24)*.32));
      const distance=dist(p,center);
      if(distance<=tol && (!best || distance<best.distance)) best={intersection,distance};
    });
    return best?.intersection || null;
  }
  function selectedRailCrossing(){
    const id=state.selectedRailCrossingId;
    if(!id) return null;
    if(selectedSiteObjectCount() || state.selectedId || currentSelectedBuildingIds().length || state.selectedAnnotationId || state.selectedRoadFeatureId || state.selectedRoadId || state.selectedTrackId || state.selectedTrackAccessoryId || state.selectedBenchworkId || state.selectedStreetlightId || state.selectedFabricId || state.selectedStlObjectId || state.selectedRoadIntersectionId) return null;
    return generatedRailCrossings().find(crossing=>crossing.id===id || crossing.key===id) || null;
  }
  function selectRailCrossing(crossing){
    if(!crossing) return false;
    clearBuildingSelection();
    clearSelectedSiteObjects();
    state.selectedRoadId=null;
    state.selectedRoadFeatureId=null;
    state.selectedTrackId=null;
    state.selectedTrackPointIndex=null;
    state.selectedTrackAccessoryId=null;
    state.selectedBenchworkId=null;
    state.selectedStreetlightId=null;
    state.selectedAnnotationId=null;
    state.selectedFabricId=null;
    state.selectedStlObjectId=null;
    state.selectedRoadIntersectionId=null;
    state.selectedRailCrossingId=crossing.key||crossing.id;
    renderList(); renderRoads(); renderStreetlights(); renderSelected(); draw();
    return true;
  }
  function hitGeneratedRailCrossing(p,pointerType='mouse'){
    const tol=(pointerType==='touch'?18:10)/state.view.scale;
    return hitRailCrossing(p,generatedRailCrossings(),tol);
  }
  let railCrossingRenderer2D=null;
  function ensureRailCrossingRenderer2D(){
    if(!railCrossingRenderer2D){
      railCrossingRenderer2D=createRailCrossingRenderer2D({ctx,state,drawLabel,generatedRailCrossings,railCrossingInfillPanels});
    }
    return railCrossingRenderer2D;
  }
  function drawGeneratedRailCrossings(){
    return ensureRailCrossingRenderer2D().drawGeneratedRailCrossings();
  }
  let trackRenderer2D=null;
  function ensureTrackRenderer2D(){
    if(!trackRenderer2D){
      trackRenderer2D=createTrackRenderer2D({
        ctx,state,trackProfileDefaults:TRACK_PROFILE_DEFAULTS,normalizeTrack,isSiteObjectSelected,trackPathSamples,trackProfilePx,
        offsetTrackPath,drawTrackModelPath,trackTieSegments,drawRoadGeneratedPath,polygonCenter,drawLabel,fmt,
      });
    }
    return trackRenderer2D;
  }
  function drawTrack(raw){ return ensureTrackRenderer2D().drawTrack(raw); }
  function trackAccessoryPreset(kind){
    return trackAccessoryGeometry.trackAccessoryPreset(kind);
  }
  function trackAccessoryLabel(kind){
    return trackAccessoryGeometry.trackAccessoryLabel(kind);
  }
  const TRACK_ACCESSORY_OBJECT_FILTERS = Object.freeze([
    { key: 'all', label: 'All track items', kinds: null },
    { key: 'sensors', label: 'Sensors', kinds: ['sensor'] },
    { key: 'signals', label: 'Signals', kinds: ['signal', 'occupancyLight'] },
    { key: 'crossings', label: 'Crossing equipment', kinds: ['crossingArm', 'intrusionDetector'] },
    { key: 'catenary', label: 'Catenary', kinds: ['catenarySingleSide', 'catenaryDoublePortal'] },
    { key: 'switches', label: 'Switches', kinds: ['trackSwitchLeft', 'trackSwitchRight', 'trackSwitchTomix1279Left', 'trackSwitchTomix1278Right'] },
    { key: 'buffers', label: 'Buffer stops', kinds: ['trackBufferTomix1428', 'trackBufferTomix1428Catenary'] },
  ]);
  function trackAccessoryObjectFilterDefinition(key='all'){
    return TRACK_ACCESSORY_OBJECT_FILTERS.find(filter=>filter.key===key) || TRACK_ACCESSORY_OBJECT_FILTERS[0];
  }
  function trackAccessoryMatchesObjectFilter(item, filterKey='all'){
    const filter=trackAccessoryObjectFilterDefinition(filterKey);
    return !filter.kinds || filter.kinds.includes(item?.kind);
  }
  function trackAccessoryFilterCounts(){
    const items=(state.trackAccessories||[]).map(normalizeTrackAccessory);
    return TRACK_ACCESSORY_OBJECT_FILTERS.map(filter=>({
      ...filter,
      count: filter.kinds ? items.filter(item=>filter.kinds.includes(item.kind)).length : items.length,
    }));
  }
  function isTrackAccessoryAction(action){
    return trackAccessoryGeometry.isTrackAccessoryAction(action);
  }
  function isCatenaryAccessoryKind(kind){
    return trackAccessoryGeometry.isCatenaryAccessoryKind(kind);
  }
  function isTrackSwitchAccessoryKind(kind){
    return trackAccessoryGeometry.isTrackSwitchAccessoryKind(kind);
  }
  function isTrackBufferAccessoryKind(kind){
    return trackAccessoryGeometry.isTrackBufferAccessoryKind(kind);
  }
  function trackBufferHasCatenaryTerminal(item){
    return trackAccessoryGeometry.trackBufferHasCatenaryTerminal(item);
  }
  function defaultTrackAccessoryPxPerMm(){
    return trackAccessoryGeometry.defaultTrackAccessoryPxPerMm();
  }
  function trackAccessoryPxPerMm(item){
    return trackAccessoryGeometry.trackAccessoryPxPerMm(item);
  }
  function trackBufferPxPerMm(item){
    return trackAccessoryGeometry.trackBufferPxPerMm(item);
  }
  function tomixBufferGeometry(scale=1){
    return trackAccessoryGeometry.tomixBufferGeometry(scale);
  }
  function trackBufferGeometryPx(item){
    return trackAccessoryGeometry.trackBufferGeometryPx(item);
  }
  function trackBufferGeometrySite3D(item){
    return trackAccessoryGeometry.trackBufferGeometrySite3D(item);
  }
  function trackSwitchDirection(kind){
    return trackAccessoryGeometry.trackSwitchDirection(kind);
  }
  function trackSwitchPxPerMm(item){
    return trackAccessoryGeometry.trackSwitchPxPerMm(item);
  }
  function tomixTurnoutGeometry(scale=1){
    return trackAccessoryGeometry.tomixTurnoutGeometry(scale);
  }
  function trackSwitchGeometryPx(item){
    return trackAccessoryGeometry.trackSwitchGeometryPx(item);
  }
  function trackSwitchGeometrySite3D(item){
    return trackAccessoryGeometry.trackSwitchGeometrySite3D(item);
  }
  function trackSwitchEndpointDefinitions(item){
    return trackAccessoryGeometry.trackSwitchEndpointDefinitions(item);
  }
  function trackSwitchCurvePoints(geom, dir, steps=18){
    return trackAccessoryGeometry.trackSwitchCurvePoints(geom, dir, steps);
  }
  function trackSwitchMainPathPoints(geom, dir, steps=18){
    return trackAccessoryGeometry.trackSwitchMainPathPoints(geom, dir, steps);
  }
  function pointAtPolylineDistance(path,distance){
    return trackAccessoryGeometry.pointAtPolylineDistance(path, distance);
  }
  function polylineLength(path){
    return trackAccessoryGeometry.polylineLength(path);
  }
  function drawTrackSwitchPolyline(points){
    if(trackAccessoryRenderer2D) return trackAccessoryRenderer2D.drawTrackSwitchPolyline?.(points);
    if(!points || !points.length) return;
    ctx.beginPath();
    points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    ctx.stroke();
  }
  function transformTrackSwitchLocalPoint(item, local){
    return trackAccessoryGeometry.transformTrackSwitchLocalPoint(item, local);
  }
  function trackSwitchEndpointPoints(item){
    return trackAccessoryGeometry.trackSwitchEndpointPoints(item);
  }
  function allTrackSwitchConnectionPoints(){
    return (state.trackAccessories||[])
      .map(normalizeTrackAccessory)
      .filter(item=>isTrackSwitchAccessoryKind(item.kind) && !item.hidden)
      .flatMap(trackSwitchEndpointPoints);
  }
  function nearestTrackSwitchEndpoint(p, excludeTrackAccessoryId=null){
    let best=null;
    allTrackSwitchConnectionPoints().forEach(endpoint=>{
      if(excludeTrackAccessoryId && endpoint.trackAccessoryId===excludeTrackAccessoryId) return;
      const distance=dist(p,endpoint.point);
      if(!best || distance<best.distance) best={...endpoint,distance};
    });
    return best;
  }
  function draggedTrackSwitchEndpointName(item,p){
    if(!item || !p || !isTrackSwitchAccessoryKind(item.kind)) return null;
    let best=null;
    trackSwitchEndpointPoints(item).forEach(endpoint=>{
      const distance=dist(p,endpoint.point);
      if(!best || distance<best.distance) best={endpoint,distance};
    });
    return best && best.distance<=trackAccessorySnapDistance() ? best.endpoint.endpoint : null;
  }
  function rotatePoint(point, angleDeg){
    return trackAccessoryGeometry.rotatePoint(point, angleDeg);
  }
  function normalizeAngleDeltaDeg(value){
    let out=((Number(value)||0)+180)%360;
    if(out<0) out+=360;
    return out-180;
  }
  function trackSwitchEndpointOutwardAngleDeg(endpointName, angleDeg){
    const base=Number(angleDeg)||0;
    return endpointName==='heel' ? base+180 : base;
  }
  function trackSwitchSnapRotationDeg(item,sourceEndpointName,targetEndpoint){
    const sourceDef=trackSwitchEndpointDefinitions(item).find(endpoint=>endpoint.endpoint===sourceEndpointName);
    if(!sourceDef || !targetEndpoint) return null;
    const sourceOutward=trackSwitchEndpointOutwardAngleDeg(sourceDef.endpoint,sourceDef.angleDeg);
    const targetOutward=trackSwitchEndpointOutwardAngleDeg(targetEndpoint.endpoint,targetEndpoint.angleDeg);
    return targetOutward+180-sourceOutward;
  }
  function alignTrackSwitchEndpointToTarget(item, sourceEndpointName, targetEndpoint){
    const sourceDef=trackSwitchEndpointDefinitions(item).find(endpoint=>endpoint.endpoint===sourceEndpointName);
    if(!sourceDef || !targetEndpoint?.point) return false;
    const rotationDeg=trackSwitchSnapRotationDeg(item,sourceEndpointName,targetEndpoint);
    if(!Number.isFinite(rotationDeg)) return false;
    const normalizedRotationDeg=normalizeAngleDeltaDeg(rotationDeg);
    const rotatedLocal=rotatePoint(sourceDef.local,normalizedRotationDeg);
    item.rotationDeg=normalizedRotationDeg;
    item.x=targetEndpoint.point.x-rotatedLocal.x;
    item.y=targetEndpoint.point.y-rotatedLocal.y;
    item.trackId=null;
    item.trackAnchor={
      kind:'trackSwitchEndpoint',
      trackAccessoryId:targetEndpoint.trackAccessoryId,
      endpoint:targetEndpoint.endpoint,
      sourceEndpoint:sourceEndpointName,
    };
    normalizeTrackAccessory(item);
    syncTracksConnectedToTrackSwitch(item);
    return true;
  }
  function nearestSwitchEndpointPair(item, pointerPoint=null, preferredSourceEndpoint=null){
    if(!item || !isTrackSwitchAccessoryKind(item.kind)) return null;
    let sourceEndpoints=trackSwitchEndpointPoints(item);
    if(preferredSourceEndpoint){
      const preferred=sourceEndpoints.find(endpoint=>endpoint.endpoint===preferredSourceEndpoint);
      if(preferred) sourceEndpoints=[preferred];
    }
    const targetEndpoints=allTrackSwitchConnectionPoints().filter(endpoint=>endpoint.trackAccessoryId!==item.id);
    const snapDistance=trackAccessorySnapDistance();
    let best=null;
    const currentAnchor=item.trackAnchor?.kind==='trackSwitchEndpoint' ? item.trackAnchor : null;
    sourceEndpoints.forEach(source=>{
      targetEndpoints.forEach(target=>{
        const distance=dist(source.point,target.point);
        const pointerDistance=pointerPoint ? dist(pointerPoint,target.point) : 0;
        const snapRotation=trackSwitchSnapRotationDeg(item,source.endpoint,target);
        const currentRotation=Number(item.rotationDeg)||0;
        const rotationDelta=Math.abs(normalizeAngleDeltaDeg((snapRotation ?? currentRotation)-currentRotation));
        const sameAnchor=currentAnchor
          && currentAnchor.sourceEndpoint===source.endpoint
          && currentAnchor.trackAccessoryId===target.trackAccessoryId
          && currentAnchor.endpoint===target.endpoint;
        const score=distance
          + (pointerPoint ? pointerDistance*.15 : 0)
          + rotationDelta*.18
          - (sameAnchor ? snapDistance*.35 : 0);
        const candidate={source,target,distance,pointerDistance,rotationDelta,score};
        if(pointerPoint && distance>snapDistance) return;
        if(!best || candidate.score<best.score || (Math.abs(candidate.score-best.score)<.001 && distance<best.distance)) best=candidate;
      });
    });
    return best;
  }
  function snapTrackSwitchToEndpoint(item, pointerPoint=null, preferredSourceEndpoint=null){
    const pointerSourceEndpoint=draggedTrackSwitchEndpointName(item,pointerPoint);
    const pair=nearestSwitchEndpointPair(item,pointerPoint,preferredSourceEndpoint||pointerSourceEndpoint);
    if(!pair || pair.distance>trackAccessorySnapDistance()) return false;
    if(!alignTrackSwitchEndpointToTarget(item,pair.source.endpoint,pair.target)) return false;
    const hint=$('statusHint');
    if(hint) hint.textContent=`Switch ${pair.source.label.toLowerCase()} snapped to ${pair.target.label.toLowerCase()} endpoint and matched its turnout angle.`;
    return true;
  }
  function resolveTrackSwitchConnection(connection){
    if(!connection || connection.kind!=='trackSwitchEndpoint' || !connection.trackAccessoryId) return null;
    const item=(state.trackAccessories||[]).map(normalizeTrackAccessory).find(accessory=>accessory.id===connection.trackAccessoryId);
    if(!item || item.hidden || !isTrackSwitchAccessoryKind(item.kind)) return null;
    return trackSwitchEndpointPoints(item).find(endpoint=>endpoint.endpoint===connection.endpoint) || null;
  }
  function syncTracksConnectedToTrackSwitch(item){
    if(!item || !isTrackSwitchAccessoryKind(item.kind)) return;
    (state.tracks||[]).forEach(track=>{
      if(!track || track.locked) return;
      normalizeTrack(track);
      ['start','end'].forEach(key=>{
        const connection=track.endpointConnections?.[key];
        if(!connection || connection.kind!=='trackSwitchEndpoint' || connection.trackAccessoryId!==item.id) return;
        const endpoint=resolveTrackSwitchConnection(connection);
        const index=key==='start' ? 0 : Math.max(0,(track.pointsPx||[]).length-1);
        if(endpoint && track.pointsPx?.[index]) moveTrackPointWithAdjacentCurves(track,index,endpoint.point);
      });
    });
  }
  function syncTrackEndpointToSwitchConnection(track,index){
    const key=trackEndpointKey(track,index);
    const connection=key ? track?.endpointConnections?.[key] : null;
    const endpoint=resolveTrackSwitchConnection(connection);
    if(!endpoint || !track?.pointsPx?.[index]) return false;
    moveTrackPointWithAdjacentCurves(track,index,endpoint.point);
    return true;
  }
  function nearestTrackEndpointAnchor(p,options={}){
    let best=null;
    (state.tracks||[]).map(normalizeTrack).forEach(t=>{
      if(options.trackId && t.id!==options.trackId) return;
      if(t.hidden || (t.pointsPx||[]).length<2) return;
      const endpoints=[
        {endpointKey:'start',point:t.pointsPx[0],neighbor:t.pointsPx[1],pointIndex:0},
        {endpointKey:'end',point:t.pointsPx[t.pointsPx.length-1],neighbor:t.pointsPx[t.pointsPx.length-2],pointIndex:t.pointsPx.length-1},
      ];
      endpoints.forEach(endpoint=>{
        const distance=dist(p,endpoint.point);
        if(!best || distance<best.distance){
          best={
            trackId:t.id,
            point:{x:endpoint.point.x,y:endpoint.point.y},
            distance,
            endpointKey:endpoint.endpointKey,
            pointIndex:endpoint.pointIndex,
            angleDeg:deg(Math.atan2(endpoint.point.y-endpoint.neighbor.y,endpoint.point.x-endpoint.neighbor.x)),
          };
        }
      });
    });
    return best;
  }
  function resolveTrackEndpointAnchor(trackId,endpointKey){
    const t=(state.tracks||[]).map(normalizeTrack).find(track=>track.id===trackId);
    if(!t || t.hidden || (t.pointsPx||[]).length<2) return null;
    const start=endpointKey==='start';
    const point=start ? t.pointsPx[0] : t.pointsPx[t.pointsPx.length-1];
    const neighbor=start ? t.pointsPx[1] : t.pointsPx[t.pointsPx.length-2];
    return {
      trackId:t.id,
      point:{x:point.x,y:point.y},
      endpointKey:start?'start':'end',
      pointIndex:start?0:t.pointsPx.length-1,
      angleDeg:deg(Math.atan2(point.y-neighbor.y,point.x-neighbor.x)),
      distance:0,
    };
  }
  function isCatenaryAutoSectionAction(action){
    return action==='catenaryAutoSection';
  }
  function normalizeTrackAccessory(raw={}){
    return trackAccessoryGeometry.normalizeTrackAccessory(raw);
  }
  function selectedTrackAccessory(){
    return (state.trackAccessories||[]).find(x=>x.id===state.selectedTrackAccessoryId) || null;
  }
  function ensureSiteObjectSelectionController(){
    if(!siteObjectSelectionController){
      siteObjectSelectionController=createSiteObjectSelectionController({
        state,
        uid,
        isBuildingSelected,
        clearBuildingSelection,
        setBuildingSelection,
        selectedAnnotation,
        selectedRoadFeature,
        selectedStreetlight,
        selectedRoad,
        selectedTrackAccessory,
        selectedTrack,
        selectedStlObject,
        selectedBenchwork,
        selectedFabric,
        normalizeRoadFeature,
        normalizeStreetlight,
        normalizeRoad,
        normalizeTrackAccessory,
        normalizeTrack,
        normalizeStlObject,
        normalizeBenchworkOutline,
        normalizeFabricRegion,
        syncBuildingMetrics,
        moveRoadFeature,
        isTrackSwitchAccessoryKind,
        snapTrackSwitchToEndpoint,
        syncTracksConnectedToTrackSwitch,
        nearestTrackAccessoryAnchor,
        trackAccessorySnapDistance,
        isCatenaryAccessoryKind,
        attachTrackAccessoryToAnchor,
        syncRoadMetrics,
        syncTrackMetrics,
        syncTrackEndpointToSwitchConnection,
        syncConnectedTrackEndpoint,
        draggedTrackSwitchEndpointName,
        clearPlanObjectSelection,
        syncAll,
        refreshUi:()=>{renderList(); renderRoads(); renderStreetlights(); renderSelected(); updateHandoff(); draw();},
      });
    }
    return siteObjectSelectionController;
  }
  function siteObjectKey(type,id){return ensureSiteObjectSelectionController().siteObjectKey(type,id);}
  function normalizeSelectedSiteObjects(){return ensureSiteObjectSelectionController().normalizeSelectedSiteObjects();}
  function selectedSiteObjectCount(){return ensureSiteObjectSelectionController().selectedSiteObjectCount();}
  function isSiteObjectSelected(type,id){return ensureSiteObjectSelectionController().isSiteObjectSelected(type,id);}
  function clearSelectedSiteObjects(){return ensureSiteObjectSelectionController().clearSelectedSiteObjects();}
  function setSelectedSiteObjects(selection){return ensureSiteObjectSelectionController().setSelectedSiteObjects(selection);}
  function siteObjectBySelection(sel){return ensureSiteObjectSelectionController().siteObjectBySelection(sel);}
  function currentSelectedMovableSiteObjects(){return ensureSiteObjectSelectionController().currentSelectedMovableSiteObjects();}
  function applySiteObjectRotationFromOrig(type,orig,center,deltaDeg){return ensureSiteObjectSelectionController().applySiteObjectRotationFromOrig(type,orig,center,deltaDeg);}
  function applyPrimarySiteObjectSelection(type,id,opts={}){return ensureSiteObjectSelectionController().applyPrimarySiteObjectSelection(type,id,opts);}
  function setSingleSiteObjectSelection(type,id){return ensureSiteObjectSelectionController().setSingleSiteObjectSelection(type,id);}
  function toggleSiteObjectSelection(type,id){return ensureSiteObjectSelectionController().toggleSiteObjectSelection(type,id);}
  function offsetPointArray(points,dx,dy){return ensureSiteObjectSelectionController().offsetPointArray(points,dx,dy);}
  function selectedSiteObjectForClipboard(){return ensureSiteObjectSelectionController().selectedSiteObjectForClipboard();}
  function normalizeSiteObjectForClipboard(type,item){return ensureSiteObjectSelectionController().normalizeSiteObjectForClipboard(type,item);}
  function clearCopiedSiteObjectRelationships(type,payload){return ensureSiteObjectSelectionController().clearCopiedSiteObjectRelationships(type,payload);}
  function siteObjectClipboardPayload(type,item){return ensureSiteObjectSelectionController().siteObjectClipboardPayload(type,item);}
  function copySelectedSiteObject(){return ensureSiteObjectSelectionController().copySelectedSiteObject();}
  function preparePastedSiteObject(type,src){return ensureSiteObjectSelectionController().preparePastedSiteObject(type,src);}
  function selectPastedSiteObject(type,item){return ensureSiteObjectSelectionController().selectPastedSiteObject(type,item);}
  function pasteSiteObjectFromClipboard(){return ensureSiteObjectSelectionController().pasteSiteObjectFromClipboard();}
  function copySelectedTrackAccessory(){return ensureSiteObjectSelectionController().copySelectedTrackAccessory();}
  function pasteTrackAccessoryFromClipboard(){return ensureSiteObjectSelectionController().pasteTrackAccessoryFromClipboard();}
  function applySiteObjectMoveFromOrig(type,orig,dx,dy,pointerPoint=null,preferredSourceEndpoint=null){return ensureSiteObjectSelectionController().applySiteObjectMoveFromOrig(type,orig,dx,dy,pointerPoint,preferredSourceEndpoint);}
  function finalizeMovedSiteObject(type,orig){return ensureSiteObjectSelectionController().finalizeMovedSiteObject(type,orig);}
  function startSiteObjectMoveDrag(type,item,e,p){return ensureSiteObjectSelectionController().startSiteObjectMoveDrag(type,item,e,p);}
  function handleSiteObjectPointerHit(type,item,e,p){return ensureSiteObjectSelectionController().handleSiteObjectPointerHit(type,item,e,p);}
  function trackAccessorySnapDistance(){
    return 56/state.view.scale;
  }
  function sampledTrackSegments(t, perCurve=20){
    const path=trackPathSamples(t,perCurve);
    const segments=[];
    let cumulative=0;
    for(let i=0;i<path.length-1;i++){
      const a=path[i], b=path[i+1];
      const dx=b.x-a.x, dy=b.y-a.y, len=Math.hypot(dx,dy);
      if(!(len>0)) continue;
      segments.push({a,b,dx,dy,len,start:cumulative});
      cumulative+=len;
    }
    return {path,segments,total:cumulative};
  }
  function trackPointAtDistance(trackId,pathDistancePx){
    const t=(state.tracks||[]).map(normalizeTrack).find(track=>track.id===trackId);
    if(!t || t.hidden || (t.pointsPx||[]).length<2) return null;
    const sampled=sampledTrackSegments(t,24);
    if(!sampled.segments.length) return null;
    const target=clamp(Number(pathDistancePx)||0,0,sampled.total);
    let seg=sampled.segments[sampled.segments.length-1];
    for(const candidate of sampled.segments){
      if(target<=candidate.start+candidate.len){seg=candidate; break;}
    }
    const local=seg.len ? clamp((target-seg.start)/seg.len,0,1) : 0;
    const point={x:seg.a.x+seg.dx*local,y:seg.a.y+seg.dy*local};
    const tangent={x:seg.dx/seg.len,y:seg.dy/seg.len};
    const normal={x:-tangent.y,y:tangent.x};
    return {trackId:t.id,point,tangent,normal,pathDistancePx:target,angleDeg:deg(Math.atan2(tangent.y,tangent.x))};
  }
  function nearestTrackAccessoryAnchor(p,options={}){
    let best=null;
    (state.tracks||[]).map(normalizeTrack).forEach(t=>{
      if(options.trackId && t.id!==options.trackId) return;
      if(t.hidden || (t.pointsPx||[]).length<2) return;
      const sampled=sampledTrackSegments(t,24);
      sampled.segments.forEach(seg=>{
        const a=seg.a, b=seg.b;
        const hit=closestPointOnSegment(p,a,b);
        const point=hit.point;
        const distance=hit.distance;
        if(!best || distance<best.distance){
          const local=Number.isFinite(Number(hit.t)) ? hit.t : (seg.len ? clamp(((point.x-a.x)*seg.dx+(point.y-a.y)*seg.dy)/(seg.len*seg.len),0,1) : 0);
          const tangent={x:seg.dx/seg.len,y:seg.dy/seg.len};
          const normal={x:-tangent.y,y:tangent.x};
          best={
            trackId:t.id,
            point,
            distance,
            tangent,
            normal,
            pathDistancePx:seg.start+seg.len*local,
            offsetPx:(p.x-point.x)*normal.x+(p.y-point.y)*normal.y,
            angleDeg:deg(Math.atan2(tangent.y,tangent.x)),
          };
        }
      });
    });
    return best;
  }
  function attachTrackAccessoryToAnchor(item,anchor,options={}){
    if(!item || !anchor) return false;
    const snapToTrack=options.snapToTrack!==false;
    const offsetPx=snapToTrack ? 0 : (Number.isFinite(Number(anchor.offsetPx)) ? Number(anchor.offsetPx) : 0);
    item.trackId=anchor.trackId;
    item.trackAnchor={trackId:anchor.trackId,pathDistancePx:anchor.pathDistancePx,offsetPx};
    item.autoOrientToTrack=isCatenaryAccessoryKind(item.kind);
    item.x=anchor.point.x+(anchor.normal?.x||0)*offsetPx;
    item.y=anchor.point.y+(anchor.normal?.y||0)*offsetPx;
    item.rotationDeg=anchor.angleDeg;
    return true;
  }
  function resolveTrackAccessoryAnchor(item){
    if(!item || !isCatenaryAccessoryKind(item.kind) || item.autoOrientToTrack===false || !item.trackId) return null;
    let anchor=null;
    if(item.trackAnchor && item.trackAnchor.trackId===item.trackId && Number.isFinite(Number(item.trackAnchor.pathDistancePx))){
      anchor=trackPointAtDistance(item.trackId,item.trackAnchor.pathDistancePx);
      if(anchor) anchor.offsetPx=Number(item.trackAnchor.offsetPx)||0;
    }
    if(!anchor){
      anchor=nearestTrackAccessoryAnchor({x:item.x,y:item.y},{trackId:item.trackId});
      if(anchor) item.trackAnchor={trackId:anchor.trackId,pathDistancePx:anchor.pathDistancePx,offsetPx:0};
    }
    if(!anchor) return null;
    const offsetPx=Number(anchor.offsetPx)||0;
    return {
      ...anchor,
      point:{x:anchor.point.x+(anchor.normal?.x||0)*offsetPx,y:anchor.point.y+(anchor.normal?.y||0)*offsetPx},
      offsetPx,
    };
  }
  function refreshTrackAccessoryAnchor(item){
    normalizeTrackAccessory(item);
    if(isTrackBufferAccessoryKind(item.kind) && item.trackAnchor?.trackId && item.trackAnchor?.endpointKey){
      const endpoint=resolveTrackEndpointAnchor(item.trackAnchor.trackId,item.trackAnchor.endpointKey);
      if(!endpoint) return false;
      item.trackId=endpoint.trackId;
      item.x=endpoint.point.x;
      item.y=endpoint.point.y;
      item.rotationDeg=endpoint.angleDeg;
      item.trackAnchor={trackId:endpoint.trackId,endpointKey:endpoint.endpointKey,pointIndex:endpoint.pointIndex,pathDistancePx:null,offsetPx:0};
      return true;
    }
    const anchor=resolveTrackAccessoryAnchor(item);
    if(!anchor) return false;
    item.x=anchor.point.x;
    item.y=anchor.point.y;
    item.rotationDeg=anchor.angleDeg;
    return true;
  }
  function refreshAnchoredTrackAccessories(){
    (state.trackAccessories||[]).forEach(item=>refreshTrackAccessoryAnchor(item));
  }
  function catenarySpacingPxForTrack(trackId){
    if(state.pxPerMm) return Math.max(1, mmToPx(CATENARY_SPACING_MODEL_MM));
    const track=(state.tracks||[]).map(normalizeTrack).find(t=>t.id===trackId);
    const gaugePx=Number(track?.gaugePx);
    const gaugeMm=Number(track?.gaugeMm);
    if(Number.isFinite(gaugePx) && gaugePx>0 && Number.isFinite(gaugeMm) && gaugeMm>0){
      return Math.max(1, CATENARY_SPACING_MODEL_MM * gaugePx / gaugeMm);
    }
    return CATENARY_SPACING_MODEL_MM;
  }
  function catenaryAtTrackDistance(trackId,pathDistancePx,kind='catenarySingleSide'){
    const spacingPx=catenarySpacingPxForTrack(trackId);
    const duplicateTolerance=Math.max(4,Math.min(18,spacingPx*.12));
    return (state.trackAccessories||[]).map(normalizeTrackAccessory).some(item=>{
      if(item.hidden || item.kind!==kind || item.trackId!==trackId) return false;
      const existing=Number(item.trackAnchor?.pathDistancePx);
      return Number.isFinite(existing) && Math.abs(existing-pathDistancePx)<=duplicateTolerance;
    });
  }
  function createAnchoredCatenaryAt(trackId,pathDistancePx,kind='catenarySingleSide'){
    const anchor=trackPointAtDistance(trackId,pathDistancePx);
    if(!anchor) return null;
    const preset=trackAccessoryPreset(kind);
    const accessory=normalizeTrackAccessory({
      id:uid('trackItem'),
      kind,
      name:`${preset.label} ${(state.trackAccessories||[]).length+1}`,
      x:anchor.point.x,
      y:anchor.point.y,
      rotationDeg:anchor.angleDeg,
      trackId,
      autoOrientToTrack:true,
      color:preset.color,
      notes:preset.defaultNotes,
    });
    attachTrackAccessoryToAnchor(accessory,anchor);
    return accessory;
  }
  function applyCatenarySection(startAnchor,endAnchor,kind='catenarySingleSide'){
    if(!startAnchor || !endAnchor || startAnchor.trackId!==endAnchor.trackId) return {created:0, skipped:0};
    const trackId=startAnchor.trackId;
    const spacingPx=catenarySpacingPxForTrack(trackId);
    const start=Math.min(startAnchor.pathDistancePx,endAnchor.pathDistancePx);
    const end=Math.max(startAnchor.pathDistancePx,endAnchor.pathDistancePx);
    const length=end-start;
    if(!(length>1)) return {created:0, skipped:0};
    const distances=[start];
    for(let d=start+spacingPx; d<end-spacingPx*.25; d+=spacingPx) distances.push(d);
    distances.push(end);
    state.trackAccessories=state.trackAccessories||[];
    let created=0, skipped=0, last=null;
    distances.forEach(distance=>{
      if(last!==null && Math.abs(distance-last)<4) return;
      last=distance;
      if(catenaryAtTrackDistance(trackId,distance,kind)){ skipped++; return; }
      const accessory=createAnchoredCatenaryAt(trackId,distance,kind);
      if(!accessory) return;
      state.trackAccessories.push(accessory);
      state.selectedTrackId=null;
      state.selectedTrackPointIndex=null;
      state.selectedTrackAccessoryId=accessory.id;
      created++;
    });
    return {created, skipped, spacingPx, spacingModelMm:CATENARY_SPACING_MODEL_MM};
  }
  function catenarySectionResultText(result){
    return `Added ${result.created} catenary pole${result.created===1?'':'s'} at ${fmt(CATENARY_SPACING_MODEL_MM)} mm spacing (${CATENARY_PROTOTYPE_SPACING_M} m prototype at Japanese N scale).${result.skipped?` Skipped ${result.skipped} existing pole${result.skipped===1?'':'s'}.`:''}`;
  }
  function applyCatenaryToTrack(trackId,kind='catenarySingleSide'){
    const t=(state.tracks||[]).map(normalizeTrack).find(track=>track.id===trackId);
    if(!t || t.hidden || (t.pointsPx||[]).length<2) return {created:0, skipped:0};
    const sampled=sampledTrackSegments(t,24);
    if(!(sampled.total>1)) return {created:0, skipped:0};
    const start=trackPointAtDistance(t.id,0);
    const end=trackPointAtDistance(t.id,sampled.total);
    return applyCatenarySection(start,end,kind);
  }
  function handleCatenaryAutoTrackClick(p,pointerType='mouse'){
    const trackHit=hitTrack(p,pointerType);
    const anchor=trackHit ? null : nearestTrackAccessoryAnchor(p);
    const trackId=trackHit?.id || (anchor && anchor.distance<=trackAccessorySnapDistance() ? anchor.trackId : null);
    const hint=$('statusHint');
    if(!trackId){
      if(hint) hint.textContent='Click a track spline to auto place catenary along its full length.';
      return false;
    }
    clearBuildingSelection();
    state.selectedTrackId=trackId;
    state.selectedTrackPointIndex=null;
    state.selectedRoadId=null;
    state.selectedRoadFeatureId=null;
    state.selectedBenchworkId=null;
    state.selectedStreetlightId=null;
    state.selectedAnnotationId=null;
    state.selectedFabricId=null;
    state.catenarySectionDraft=null;
    const result=applyCatenaryToTrack(trackId,'catenarySingleSide');
    syncAll();
    if(hint) hint.textContent=catenarySectionResultText(result);
    return true;
  }
  function beginTrackContinuationFromSnap(snap){
    const connection=snap?.connection;
    if(!connection || (connection.kind!=='endpointStart' && connection.kind!=='endpointEnd')) return false;
    state.trackDraft=[{x:snap.x,y:snap.y}];
    state.trackDraftConnections=[{connection:null}];
    state.trackDraftExtension={...connection};
    clearBuildingSelection();
    state.selectedRoadId=null;
    state.selectedRoadFeatureId=null;
    state.selectedBenchworkId=null;
    state.selectedStreetlightId=null;
    state.selectedAnnotationId=null;
    state.selectedFabricId=null;
    state.selectedStlObjectId=null;
    state.selectedTrackId=connection.trackId;
    state.selectedTrackPointIndex=null;
    const hint=$('statusHint');
    if(hint) hint.textContent='Track continuation started from the existing endpoint. Click more points, then press Enter or double-click to finish.';
    renderList();
    renderSelected();
    draw();
    return true;
  }
  function placeTrackAccessory(p,kind){
    const preset=trackAccessoryPreset(kind);
    const maxSnap=trackAccessorySnapDistance();
    const switchEndpointAnchor=isTrackSwitchAccessoryKind(kind) ? nearestTrackSwitchEndpoint(p) : null;
    const switchEndpointSnapped=!!(switchEndpointAnchor && switchEndpointAnchor.distance<=maxSnap);
    const anchor=switchEndpointSnapped ? switchEndpointAnchor : (isTrackBufferAccessoryKind(kind) ? nearestTrackEndpointAnchor(p) : nearestTrackAccessoryAnchor(p));
    const snapped=anchor && anchor.distance<=maxSnap;
    const point=snapped ? anchor.point : p;
    const accessory=normalizeTrackAccessory({
      id:uid('trackItem'),
      kind,
      name:`${preset.label} ${(state.trackAccessories||[]).length+1}`,
      x:point.x,
      y:point.y,
      rotationDeg:snapped ? anchor.angleDeg : 0,
      trackId:snapped ? anchor.trackId : null,
      autoOrientToTrack:snapped && isCatenaryAccessoryKind(kind),
      color:preset.color,
      catenaryEndTerminal:kind==='trackBufferTomix1428Catenary',
      notes:preset.defaultNotes,
    });
    if(switchEndpointSnapped) alignTrackSwitchEndpointToTarget(accessory,'heel',switchEndpointAnchor);
    if(snapped && isCatenaryAccessoryKind(kind)) attachTrackAccessoryToAnchor(accessory,anchor);
    if(snapped && isTrackBufferAccessoryKind(kind)) accessory.trackAnchor={trackId:anchor.trackId,endpointKey:anchor.endpointKey,pointIndex:anchor.pointIndex,pathDistancePx:null,offsetPx:0};
    state.trackAccessories=state.trackAccessories||[];
    state.trackAccessories.push(accessory);
    selectTrackAccessory(accessory, {skipSync:true});
    syncAll();
    $('statusHint').textContent=switchEndpointSnapped ? `${preset.label} heel snapped to switch endpoint and matched its turnout angle.` : (snapped ? `${preset.label} attached to nearest track endpoint.` : `${preset.label} placed.`);
    return accessory;
  }
  function hitTrackAccessory(p,pointerType='mouse'){
    const tol=(pointerType==='touch'?18:13)/state.view.scale;
    let best=null;
    (state.trackAccessories||[]).map(normalizeTrackAccessory).forEach(item=>{
      refreshTrackAccessoryAnchor(item);
      if(item.hidden) return;
      let d=dist(p,{x:item.x,y:item.y});
      let itemTol=tol;
      if(isTrackSwitchAccessoryKind(item.kind)){
        const geom=trackSwitchGeometryPx(item);
        const a=rad(-(Number(item.rotationDeg)||0));
        const dx=p.x-item.x, dy=p.y-item.y;
        const lx=dx*Math.cos(a)-dy*Math.sin(a);
        const ly=dx*Math.sin(a)+dy*Math.cos(a);
        const maxOffset=Math.max(Math.abs(geom.offset||0),Math.abs(geom.mainOffset||0));
        const verticalMin=-geom.roadbedWidth/2-tol;
        const verticalMax=maxOffset+geom.roadbedWidth/2+tol;
        const dir=trackSwitchDirection(item.kind);
        const yMin=dir<0 ? -verticalMax : verticalMin;
        const yMax=dir<0 ? -verticalMin : verticalMax;
        if(lx>=-geom.halfLength-tol && lx<=geom.halfLength+tol && ly>=yMin && ly<=yMax) d=0;
        itemTol=Math.max(tol,Math.min(36/state.view.scale,geom.length/4));
      } else if(isTrackBufferAccessoryKind(item.kind)){
        const geom=trackBufferGeometryPx(item);
        const a=rad(-(Number(item.rotationDeg)||0));
        const dx=p.x-item.x, dy=p.y-item.y;
        const lx=dx*Math.cos(a)-dy*Math.sin(a);
        const ly=dx*Math.sin(a)+dy*Math.cos(a);
        if(lx>=-geom.length*.35-tol && lx<=geom.length+tol && Math.abs(ly)<=geom.width*.55+tol) d=0;
        itemTol=Math.max(tol,Math.min(28/state.view.scale,geom.length));
      }
      if(d<=itemTol && (!best || d<best.distance)) best={...item,distance:d};
    });
    return best;
  }
  function trackAccessoryRotationHandlePoint(item){
    if(!item) return null;
    const a=rad(Number(item.rotationDeg)||0);
    const local=trackAccessoryRotationHandleLocal(item);
    return {
      x:item.x+local.x*Math.cos(a)-local.y*Math.sin(a),
      y:item.y+local.x*Math.sin(a)+local.y*Math.cos(a),
    };
  }
  function trackAccessoryRotationHandleLocal(item){
    const scale=1/state.view.scale;
    if(isTrackSwitchAccessoryKind(item?.kind)){
      const geom=trackSwitchGeometryPx(item);
      const dir=trackSwitchDirection(item.kind);
      const maxOffset=Math.max(Math.abs(geom.offset||0),Math.abs(geom.mainOffset||0));
      const minY=dir<0 ? -maxOffset-geom.roadbedWidth/2 : -geom.roadbedWidth/2;
      return {x:0,y:minY-28*scale};
    }
    return {x:0,y:-34*scale};
  }
  function hitTrackAccessoryRotationHandle(p,pointerType='mouse'){
    const item=selectedTrackAccessory();
    if(!item || item.hidden || item.locked) return null;
    const handle=trackAccessoryRotationHandlePoint(item);
    if(!handle) return null;
    const tol=(pointerType==='touch'?20:12)/state.view.scale;
    return dist(p,handle)<=tol ? item : null;
  }
  function trackAccessoryLabelPoint(item){
    const scale=1/state.view.scale;
    if(!isTrackSwitchAccessoryKind(item?.kind)) return {x:item.x+12*scale,y:item.y-12*scale};
    const geom=trackSwitchGeometryPx(item);
    const dir=trackSwitchDirection(item.kind);
    const maxOffset=Math.max(Math.abs(geom.offset||0),Math.abs(geom.mainOffset||0));
    const maxY=dir<0 ? geom.roadbedWidth/2 : maxOffset+geom.roadbedWidth/2;
    const local={x:-geom.halfLength,y:maxY+24*scale};
    const a=rad(Number(item.rotationDeg)||0);
    return {
      x:item.x+local.x*Math.cos(a)-local.y*Math.sin(a),
      y:item.y+local.x*Math.sin(a)+local.y*Math.cos(a),
    };
  }
  function selectTrackAccessory(item, opts={}){
    if(!item) return false;
    setSingleSiteObjectSelection('trackAccessory',item.id);
    if(!opts.skipSync){
      renderList(); renderRoads(); renderStreetlights(); renderSelected(); updateHandoff(); draw();
    }
    return true;
  }
  function deleteSelectedTrackAccessory(){
    if(!state.selectedTrackAccessoryId) return false;
    const removedId=state.selectedTrackAccessoryId;
    state.trackAccessories=(state.trackAccessories||[]).filter(x=>x.id!==state.selectedTrackAccessoryId);
    (state.tracks||[]).forEach(track=>{
      if(!track?.endpointConnections) return;
      ['start','end'].forEach(key=>{
        if(track.endpointConnections[key]?.trackAccessoryId===removedId) delete track.endpointConnections[key];
      });
    });
    state.selectedTrackAccessoryId=null;
    syncAll();
    return true;
  }
  function drawTrackAccessory(raw){
    return trackAccessoryRenderer2D.drawTrackAccessory(raw);
  }
  function renderRoads(){
    renderObjectBrowser();
    const box=$('roadList'); if(!box) return;
    if(!state.roads.length){box.innerHTML='<div class="small muted">No roads yet.</div>'; return;}
    box.innerHTML='';
    state.roads.forEach(raw=>{const r=normalizeRoad(raw); const el=document.createElement('div'); el.className='buildingItem '+(r.id===state.selectedRoadId?'selected':''); el.innerHTML=`<span class="swatch" style="background:${r.color||'#6f6a5e'}"></span><div><b>${escapeHtml(r.name||'Road')}</b><br><span class="small muted">${r.mode==='outline'?'outline':'centerline'}${r.sidewalkSide&&r.sidewalkSide!=='none'?' · sidewalk '+r.sidewalkSide:''}${r.locked?' · locked':''}</span></div><span class="pill">${r.mode==='centerline'?fmt(r.widthMm||0)+'mm':'poly'}</span>`; el.onclick=()=>{state.selectedRoadId=r.id; clearBuildingSelection(); state.selectedStreetlightId=null; state.selectedBenchworkId=null; state.selectedAnnotationId=null; renderRoads(); renderList(); renderStreetlights(); renderSelected(); draw();}; box.appendChild(el);});
  }

  function buildingPoints(b){return b.padType==='rect'?transformedRect(b):(b.pointsPx||[]);}
  function buildingCenter(b){return b.padType==='rect'?{x:b.x,y:b.y}:polygonCenter(b.pointsPx||[]);}
  function ensureHakoBuildingGeometryController(){
    if(!hakoBuildingGeometryController){
      hakoBuildingGeometryController=createHakoBuildingGeometryController({
        state,
        clamp,
        collectArrayFields,
        clipPolygonByHalfPlane,
        buildingPoints,
        buildingCenter,
        mmToPx,
        pxToMm,
        rad,
      });
    }
    return hakoBuildingGeometryController;
  }
  function hakoBlockPolygonsMm(cfg){return ensureHakoBuildingGeometryController().hakoBlockPolygonsMm(cfg);}
  function hakoFootprintRotationDeg(b){return ensureHakoBuildingGeometryController().hakoFootprintRotationDeg(b);}
  function hakoCutTargetId(cut){return ensureHakoBuildingGeometryController().hakoCutTargetId(cut);}
  function sampleHakoLayoutCutSegments(cut,cfg){return ensureHakoBuildingGeometryController().sampleHakoLayoutCutSegments(cut,cfg);}
  function clipHakoPolygonByLayoutCuts(poly,cuts,cfg){return ensureHakoBuildingGeometryController().clipHakoPolygonByLayoutCuts(poly,cuts,cfg);}
  function activeHakoLayoutCuts(b){return ensureHakoBuildingGeometryController().activeHakoLayoutCuts(b);}
  function hakoLocalMmToWorld(b,p){return ensureHakoBuildingGeometryController().hakoLocalMmToWorld(b,p);}
  function hakoWorldToLocalMm(b,p){return ensureHakoBuildingGeometryController().hakoWorldToLocalMm(b,p);}
  function visibleBuildingPolygons(b){return ensureHakoBuildingGeometryController().visibleBuildingPolygons(b);}
  function visibleBuildingPoints(b){return ensureHakoBuildingGeometryController().visibleBuildingPoints(b);}
  function polyEdgeDistance(p,pts){
    if(!pts||pts.length<2) return Infinity;
    let best=Infinity;
    for(let i=0;i<pts.length;i++) best=Math.min(best,distanceToSegment(p,pts[i],pts[(i+1)%pts.length]));
    return best;
  }
  function rotateHandlePoint(b){
    const pts=buildingPoints(b); if(!pts.length) return buildingCenter(b);
    const c=buildingCenter(b);
    let top=pts[0];
    pts.forEach(q=>{if(q.y<top.y) top=q;});
    const r=Math.max(28/state.view.scale, Math.max(...pts.map(q=>dist(c,q)))+22/state.view.scale);
    const ang=Math.atan2(top.y-c.y, top.x-c.x)-Math.PI/10;
    return {x:c.x+Math.cos(ang)*r,y:c.y+Math.sin(ang)*r};
  }
  function rotationZoneHit(p,b,pointerType='mouse'){
    const pts=buildingPoints(b); if(!pts.length) return false;
    const coarse=(pointerType==='pen'||pointerType==='touch'||matchMedia('(pointer: coarse)').matches);
    const nearMin=(coarse?8:5)/state.view.scale;
    const nearMax=(coarse?42:30)/state.view.scale;
    const d=polyEdgeDistance(p,pts);
    const inside=pointInPoly(p,pts);
    return !inside && d>=nearMin && d<=nearMax;
  }
  function handleAt(p,b,pointerType='mouse'){
    if(!b || b.locked) return null;
    const coarse=(pointerType==='pen'||pointerType==='touch'||matchMedia('(pointer: coarse)').matches);
    const s=(coarse?18:9)/state.view.scale;
    const pts=buildingPoints(b);
    if(b.padType==='polygon'){
      for(let i=0;i<pts.length;i++) if(dist(p,pts[i])<s) return {type:'polyPoint', index:i};
    } else {
      for(let i=0;i<pts.length;i++) if(dist(p,pts[i])<s) return {type:'rectCorner', index:i};
    }
    const rot=rotateHandlePoint(b);
    if(dist(p,rot)<s*1.5 || rotationZoneHit(p,b,pointerType)) return {type:'rotate'};
    return null;
  }
  function buildingStateLabel(value){return BUILDING_STATES[value] || BUILDING_STATES.notStarted;}
  function normalizeBuilding(b){
    if(!b) return b;
    if(!b.state) b.state='notStarted';
    if(b.state==='todo' || b.state==='planned' || b.state==='new') b.state='notStarted';
    if(b.state==='awaiting' || b.state==='readyToBuild') b.state='awaitingConstruction';
    if(!BUILDING_STATES[b.state]) b.state='notStarted';
    if(!('hakoFile' in b)) b.hakoFile=null;
    if(b.hakoFile && !b.hakoFile.fileName && b.hakoFile.name) b.hakoFile.fileName=b.hakoFile.name;
    if(b.hakoFile && !b.hakoFile.importedAt) b.hakoFile.importedAt=new Date().toISOString();
    if(b.hakoFile) b.hakoFileId=b.hakoFile.path || b.hakoFile.fileName || b.hakoFileId || null;
    if(!Array.isArray(b.hakoTrimLinesMm) && b.hakoConfig){
      const trim=extractHakoTrimLinesMm(b.hakoConfig);
      if(trim.length){ b.hakoTrimLinesMm=trim; b.showHakoTrimLines=true; }
    }
    return b;
  }
  const {
    buildingFootprintChanged,
    cloneSitePlannerValue,
    confirmProtectedBuildingResize,
    restoreBuildingSnapshot,
  } = createBuildingResizeProtectionController({
    document,
    escapeHtml,
    fmt,
    showStatusHint,
    buildingStateLabel,
    normalizeBuilding,
    syncBuildingMetrics,
  });
  async function applySelectedBuildingDimensionInput(b, dimension, rawValue, inputEl){
    if(!b || b.padType!=='rect' || !state.pxPerMm) return;
    const before=cloneSitePlannerValue(b);
    const after=cloneSitePlannerValue(b);
    const mm=Math.max(.1,parseFloat(rawValue)||.1);
    if(dimension==='width') after.widthPx=mmToPx(mm);
    else after.depthPx=mmToPx(mm);
    syncBuildingMetrics(after);
    if(!await confirmProtectedBuildingResize(b,{before,after})){
      if(inputEl) inputEl.value=fmt(dimension==='width'?b.widthMm:b.depthMm);
      syncAll({skipDirty:true});
      return;
    }
    if(dimension==='width') b.widthPx=after.widthPx;
    else b.depthPx=after.depthPx;
    syncSelectedBuildingLive(b);
  }
  function pointFromAny(raw){
    if(!raw) return null;
    if(Array.isArray(raw) && raw.length>=2){
      const x=Number(raw[0]), y=Number(raw[1]);
      return Number.isFinite(x)&&Number.isFinite(y)?{x,y}:null;
    }
    const x=Number(raw.x ?? raw.pxX ?? raw.xPx ?? raw.left);
    const y=Number(raw.y ?? raw.pxY ?? raw.yPx ?? raw.top);
    if(Number.isFinite(x)&&Number.isFinite(y)) return {x,y};
    const xm=Number(raw.xMm ?? raw.mmX ?? raw.modelX ?? raw.modelMmX);
    const ym=Number(raw.yMm ?? raw.mmY ?? raw.modelY ?? raw.modelMmY);
    if(Number.isFinite(xm)&&Number.isFinite(ym)&&state.pxPerMm) return {x:mmToPx(xm),y:mmToPx(ym)};
    return null;
  }
  function pointsFromAny(raw){
    if(!raw) return null;
    const candidates=[raw.pointsPx, raw.polygonPx, raw.polygon, raw.points, raw.footprint?.pointsPx, raw.footprint?.polygon, raw.footprint?.points, raw.hakoSeed?.footprint?.pointsPx, raw.hakoSeed?.footprint?.polygon, raw.hakoSeed?.footprint];
    for(const c of candidates){
      if(Array.isArray(c)){
        const pts=c.map(pointFromAny).filter(Boolean);
        if(pts.length>=3) return pts;
      }
    }
    return null;
  }

  // Saved Site Planner building footprints are stored in image-pixel space.
  // Keep this separate from the .hako import point parser, which may read model-mm
  // footprint fields. A previous duplicate pointsFromAny() declaration caused saved
  // pointsMm to be preferred over pointsPx on load, making footprints too large and
  // shifted away from the reference image.
  function savedBuildingPointsPx(raw){
    if(!raw) return null;
    const parsePxPoint = p=>{
      if(!p) return null;
      if(Array.isArray(p) && p.length>=2){
        const x=Number(p[0]), y=Number(p[1]);
        return Number.isFinite(x)&&Number.isFinite(y)?{x,y}:null;
      }
      const x=Number(p.x ?? p.pxX ?? p.xPx ?? p.left);
      const y=Number(p.y ?? p.pxY ?? p.yPx ?? p.top);
      return Number.isFinite(x)&&Number.isFinite(y)?{x,y}:null;
    };
    const pixelCandidates=[
      raw.pointsPx,
      raw.polygonPx,
      raw.footprint?.pointsPx,
      raw.footprint?.polygonPx,
      raw.hakoSeed?.footprint?.pointsPx,
      raw.hakoSeed?.footprint?.polygonPx
    ];
    for(const c of pixelCandidates){
      if(Array.isArray(c)){
        const pts=c.map(parsePxPoint).filter(Boolean);
        if(pts.length>=3) return pts;
      }
    }
    // Only use mm coordinates as a legacy fallback when no pixel-space geometry exists.
    const parseMmPoint = p=>{
      if(!p || !state.pxPerMm) return null;
      if(Array.isArray(p) && p.length>=2){
        const x=Number(p[0]), y=Number(p[1]);
        return Number.isFinite(x)&&Number.isFinite(y)?{x:mmToPx(x),y:mmToPx(y)}:null;
      }
      const x=Number(p.xMm ?? p.mmX ?? p.modelX ?? p.modelMmX ?? p.x);
      const y=Number(p.yMm ?? p.mmY ?? p.modelY ?? p.modelMmY ?? p.y);
      return Number.isFinite(x)&&Number.isFinite(y)?{x:mmToPx(x),y:mmToPx(y)}:null;
    };
    const mmCandidates=[
      raw.pointsMm,
      raw.polygonMm,
      raw.footprint?.pointsMm,
      raw.footprint?.polygonMm,
      raw.hakoSeed?.footprint?.pointsMm,
      raw.hakoSeed?.footprint?.polygonMm
    ];
    for(const c of mmCandidates){
      if(Array.isArray(c)){
        const pts=c.map(parseMmPoint).filter(Boolean);
        if(pts.length>=3) return pts;
      }
    }
    return null;
  }

  function normalizeLoadedBuilding(raw, index=0){
    if(!raw || typeof raw!=='object') return null;
    const b={...raw};
    b.id=b.id || b.buildingId || b.padId || uid('bldg');
    b.name=b.name || b.buildingName || b.label || `Building ${index+1}`;
    b.category=b.category || 'industrial';
    b.color=b.color || colors[index%colors.length];
    b.hidden=!!b.hidden;
    b.locked=!!b.locked;
    b.rotationDeg=Number.isFinite(Number(b.rotationDeg))?Number(b.rotationDeg):0;
    b.state=b.state || b.buildingState || 'notStarted';
    b.notes=b.notes || '';
    if(!('hakoFile' in b)) b.hakoFile=b.completedHakoFile || b.hako || null;

    const pts=savedBuildingPointsPx(raw);
    const wantsPolygon = b.padType==='polygon' || raw.type==='polygon' || raw.kind==='BuildingPad' || !!pts;
    if(wantsPolygon && pts){
      b.padType='polygon';
      b.pointsPx=pts;
    } else {
      b.padType='rect';
      const cx=Number(b.x ?? b.cx ?? b.centerX ?? raw.position?.x ?? raw.center?.x);
      const cy=Number(b.y ?? b.cy ?? b.centerY ?? raw.position?.y ?? raw.center?.y);
      b.x=Number.isFinite(cx)?cx:0;
      b.y=Number.isFinite(cy)?cy:0;
      const wp=Number(b.widthPx ?? b.wPx ?? raw.sizePx?.w ?? raw.sizePx?.width);
      const hp=Number(b.depthPx ?? b.heightPx ?? b.hPx ?? raw.sizePx?.h ?? raw.sizePx?.height);
      const wm=Number(b.widthMm ?? raw.width ?? raw.w ?? raw.sizeMm?.w ?? raw.sizeMm?.width);
      const dm=Number(b.depthMm ?? raw.depth ?? raw.heightMm ?? raw.h ?? raw.sizeMm?.h ?? raw.sizeMm?.depth ?? raw.sizeMm?.height);
      b.widthPx=Number.isFinite(wp)?wp:(Number.isFinite(wm)&&state.pxPerMm?mmToPx(wm):Math.max(20, Number(b.widthPx)||40));
      b.depthPx=Number.isFinite(hp)?hp:(Number.isFinite(dm)&&state.pxPerMm?mmToPx(dm):Math.max(20, Number(b.depthPx)||40));
    }
    normalizeBuilding(b);
    return b;
  }
  function collectProjectBuildings(p){
    const sources=[
      ['buildings', p?.buildings],
      ['buildingPads', p?.buildingPads],
      ['pads', p?.pads],
      ['lots', p?.lots],
      ['site.buildings', p?.site?.buildings],
      ['site.buildingPads', p?.site?.buildingPads]
    ];
    let source='none';
    let arr=[];
    for(const [name,val] of sources){
      if(Array.isArray(val) && val.length){source=name; arr=val; break;}
    }
    if(!arr.length && Array.isArray(p?.fabricRegions)){
      const nested=[];
      p.fabricRegions.forEach(r=>{
        if(Array.isArray(r.buildingPads)) nested.push(...r.buildingPads.map(b=>({...b, fabricRegionId:b.fabricRegionId||r.id})));
        if(Array.isArray(r.pads)) nested.push(...r.pads.map(b=>({...b, fabricRegionId:b.fabricRegionId||r.id})));
      });
      if(nested.length){source='fabricRegions.*.buildingPads'; arr=nested;}
    }
    return {source, buildings:arr.map((b,i)=>normalizeLoadedBuilding(b,i)).filter(Boolean)};
  }
  function projectShapeFields(p){
    if(!p || typeof p!=='object') return String(p ?? 'empty');
    return Object.keys(p).slice(0,12).join(', ') || 'none';
  }
  function footprintLoadMessage(p, loadedCount, source){
    if(loadedCount>0){
      if(source && source!=='buildings') return `Loaded ${loadedCount} building footprint${loadedCount===1?'':'s'} from legacy field ${source}.`;
      return '';
    }
    if(Array.isArray(p?.buildings) && p.buildings.length===0){
      return 'Project loaded, but this saved file contains 0 building footprints. Its buildings array is empty, so there are no pads to restore.';
    }
    return `Project loaded, but no supported building footprint data was found. Fields found: ${projectShapeFields(p)}.`;
  }
  const {
    selected,
    currentSelectedBuildingIds,
    clearBuildingSelection,
    setBuildingSelection,
    reassertCanvasBuildingSelection,
    isBuildingSelected,
    toggleBuildingSelection,
    buildingsInSelectionRect,
  } = createBuildingSelectionController({
    state,
    bboxOverlaps,
    transformedRect,
  });
  const {
    updateHandoff,
    makeSeed,
    sitePlannerBuildingUpdatePayload,
    applyHakoConfigToPlannerFootprint,
    applySitePlannerBuildingUpdate,
    acknowledgeSitePlannerBuildingUpdate,
    processQueuedSitePlannerBuildingUpdate,
  } = createHakoHandoffController({
    state,
    autosaveKey: AUTOSAVE_KEY,
    buildingUpdateKey: SITE_PLANNER_BUILDING_UPDATE_KEY,
    getElement: $,
    selected,
    normalizeBuilding,
    syncBuildingMetrics,
    deriveFootprintFromHakoConfig,
    buildingCenter,
    mmToPx,
    rad,
    slug,
    setBuildingSelection,
    syncAll,
    statusHintElement: () => $('statusHint'),
    confirmBuildingResize: (building, details={}) => confirmProtectedBuildingResize(building,{...details,changed:true}),
  });
  const {
    normalizeBenchworkOutline,
    benchworkSamples,
    hitBenchworkSegment,
    selectedBenchwork,
    benchworkCenter,
    drawBenchwork,
    hitBenchwork,
    finishBenchworkOutline,
    deleteSelectedBenchwork,
  } = createBenchworkController({
    state,
    uid,
    pxToMm,
    quadPoint,
    distanceToSegment,
    pointInPoly,
    polygonCenter,
    ctx,
    clearBuildingSelection,
    isSiteObjectSelected,
    drawLabel: (...args) => drawLabel(...args),
    syncAll,
  });
  const {
    hitAnnotation,
    selectedAnnotation,
    deleteSelectedAnnotation,
    startAnnotationStroke,
    addAnnotationPoint,
    drawAnnotations,
  } = createAnnotationController({
    state,
    ctx,
    uid,
    dist,
    distanceToSegment,
    renderList,
    renderSelected,
    draw,
    markDirty,
  });
  const {
    normalizeStreetlight,
    hitStreetlight,
    selectedStreetlight,
    deleteSelectedStreetlight,
    placeStreetlight,
    duplicateStreetlight,
    drawStreetlight,
  } = createStreetlightController({
    state,
    uid,
    rad,
    ctx,
    dist,
    mmToPx,
    clearBuildingSelection,
    isSiteObjectSelected,
    drawLabel: (...args) => drawLabel(...args),
    syncAll,
  });
  const {
    clearLongPress,
    hideContextMenu,
    showContextMenu,
    contextTargetAt,
    handleContextAction,
    beginLongPress,
    moveCancelsLongPress,
    showContextMenuForPointerEvent,
  } = createContextMenuController({
    state,
    getElement: $,
    wrap,
    clamp,
    clearBuildingSelection,
    renderList,
    renderStreetlights,
    renderSelected,
    updateHandoff,
    draw,
    syncAll,
    markDirty,
    hitAnnotation,
    selectedStreetlight,
    hitStreetlight,
    selectedStlObject,
    hitStlObject,
    selected,
    hitTest,
    handleAt,
    duplicateStreetlight,
    transformedRect,
    syncBuildingMetrics,
  });
  fabricController = createFabricController({
    state,
    ctx,
    presets: FABRIC_PRESETS,
    getElement: $,
    escapeHtml,
    uid,
    colors,
    fmt,
    polygonCenter,
    pointInPoly,
    drawLabel,
    clearBuildingSelection,
    setBuildingSelection,
    syncBuildingMetrics,
    syncAll,
    renderList,
    renderRoads,
    renderStreetlights,
    renderSelected,
    updateHandoff,
    draw,
    showStatusHint,
  });
  const {
    normalizeFabricRegion,
    selectedFabric,
    hitFabricRegion,
    selectFabricRegion,
    deleteSelectedFabricRegion,
    drawFabricRegion,
    drawFabricDraft,
    finishFabricRegion,
    generateFabricForRegion,
    generateFabricFromDraft,
  } = fabricController;
  const {
    normalizeTrack,
    syncTrackMetrics,
    normalizeTrackCurves,
    trackProfilePx,
    trackPathSamples,
    offsetTrackPath,
    trackTieSegments,
    selectedTrack,
    hitTrackPoint,
    hitTrackSegment,
    nearestPointOnTrackPath,
    findTrackConnectionSnap,
    snapTrackPointForConnection,
    setTrackEndpointConnection,
    trackEndpointKey,
    trackConnectionEndpointIndex,
    moveTrackPointWithAdjacentCurves,
    syncConnectedTrackEndpoint,
    hitTrack,
    moveTrack,
    deleteSelectedTrack,
    deleteSelectedTrackPoint,
    finishTrack,
  } = createTrackController({
    state,
    defaults: TRACK_PROFILE_DEFAULTS,
    uid,
    mmToPx,
    pxToMm,
    dist,
    distanceToSegment,
    closestPointOnSegment,
    quadPoint,
    clearBuildingSelection,
    syncAll,
    getExternalTrackConnectionPoints: allTrackSwitchConnectionPoints,
  });
  trackAccessoryGeometry = createTrackAccessoryGeometry({
    state,
    presets: TRACK_ACCESSORY_PRESETS,
    trackProfileDefaults: TRACK_PROFILE_DEFAULTS,
    constants: {
      TOMIX_TURNOUT_RADIUS_MM,
      TOMIX_TURNOUT_ANGLE_DEG,
      TOMIX_TURNOUT_ANGLE_RAD,
      TOMIX_TURNOUT_LENGTH_MM,
      TOMIX_TURNOUT_OFFSET_MM,
      TOMIX_TURNOUT_GAUGE_MM,
      TOMIX_TURNOUT_ROADBED_WIDTH_MM,
      TOMIX_TURNOUT_TIE_LENGTH_MM,
      TOMIX_TURNOUT_TIE_WIDTH_MM,
      TOMIX_TURNOUT_TIE_SPACING_MM,
      TOMIX_TURNOUT_RAIL_WIDTH_MM,
      TOMIX_CURVED_TURNOUT_OUTER_RADIUS_MM,
      TOMIX_CURVED_TURNOUT_INNER_RADIUS_MM,
      TOMIX_CURVED_TURNOUT_ANGLE_DEG,
      TOMIX_CURVED_TURNOUT_ANGLE_RAD,
      TOMIX_1428_BUFFER_LENGTH_MM,
      TOMIX_1428_BUFFER_WIDTH_MM,
      TOMIX_1428_BUFFER_TIE_SPACING_MM,
      TOMIX_1428_BUFFER_TERMINAL_HEIGHT_MM,
    },
    normalizeTrack,
    dist,
    rad,
    deg,
    uid,
  });
  trackAccessoryRenderer2D = createTrackAccessoryRenderer2D({
    ctx,
    state,
    rad,
    drawLabel,
    isSiteObjectSelected,
    normalizeTrackAccessory,
    refreshTrackAccessoryAnchor,
    isTrackSwitchAccessoryKind,
    isTrackBufferAccessoryKind,
    trackAccessoryPreset,
    trackAccessoryLabel,
    trackSwitchDirection,
    trackSwitchGeometryPx,
    trackSwitchCurvePoints,
    trackSwitchMainPathPoints,
    offsetTrackPath,
    polylineLength,
    pointAtPolylineDistance,
    trackBufferGeometryPx,
    trackBufferHasCatenaryTerminal,
    trackAccessoryRotationHandleLocal,
    trackAccessoryLabelPoint,
  });
  roadSystem = createRoadSystemController({
    state,
    ctx,
    uid,
    mmToPx,
    pxToMm,
    currentScaleDivisor,
    presetModelMm,
    roadPresetByKey,
    sidewalkPresetByKey,
    hatchPresetByKey,
    markingPresetByKey,
    defaultMarkingStandardId: JP_ROAD_MARKING_STANDARD_ID,
    roadPresetScaleContext,
    applyRoadHatchPreset,
    applyRoadMarkingPreset,
    clearBuildingSelection,
    lockedHitTolerance,
    polyEdgeDistance,
    normalizeBenchworkOutline,
    benchworkPathSamples: benchworkSamples,
    drawLabel,
    drawPoly,
    drawGeneratedPath: drawRoadGeneratedPath,
    updateRoadExportBadge,
    setStatusHint: showStatusHint,
    syncAll,
    dist,
  });
  roadIntersectionMarkingControls = createRoadIntersectionMarkingControls({
    state,
    roadSystem,
    escapeAttr,
    escapeHtml,
    syncAll,
  });
  roadAssetExporter = createRoadAssetExportController({
    state,
    generateRoadExportData,
    generatedRailCrossings,
    railCrossingInfillPanels,
    roadSystem,
    railCrossingSvgRecords,
    fabricationDeps: {
      JP_ROAD_MARKING_STANDARD_ID,
      SVG_OP,
      SVG_ENGRAVE,
      SVG_RETAINED_CUT,
      SVG_SCRAP_CUT,
      escapeAttr,
      escapeHtml,
      markingPresetByKey,
      normalizeRoadFeature,
      polygonCenter,
      svgFabricationAttrs,
      svgFeatureTransform,
      svgPathFromPoly,
    },
    normalizeRoadFeature,
    markingPresetByKey,
    downloadText,
    downloadBlob,
    slugify: value => slug(value),
  });
  roadExportReview = createRoadExportReviewController({
    state,
    canvasWrap: wrap,
    generateRoadExportData,
    onExport: review => roadAssetExporter.downloadRoadAssetExport(review),
    setStatusHint: showStatusHint,
  });

  const {
    hakoFileSummary,
    hasAttachedHakoFile,
    hakoFileText,
    renameAttachedHakoFileForBuilding,
  } = createHakoFileController({
    slug,
    formatBytes,
    escapeHtml,
    selectedBuilding: selected,
    summaryElement: ()=>$('hakoFileSummaryB'),
  });

  function visibleWorldCenter(){
    const r=canvas.getBoundingClientRect();
    return {x:(r.width/2-state.view.x)/state.view.scale, y:(r.height/2-state.view.y)/state.view.scale};
  }

  function selectedFootprintSizeMm(b){
    if(!b) return null;
    syncBuildingMetrics(b);
    if(b.padType==='rect'){
      const widthMm=positiveNumber(b.widthMm, state.pxPerMm ? pxToMm(b.widthPx) : null);
      const depthMm=positiveNumber(b.depthMm, state.pxPerMm ? pxToMm(b.depthPx) : null);
      return widthMm && depthMm ? {widthMm, depthMm, source:'footprint'} : null;
    }
    const widthMm=positiveNumber(b.derived?.boundingWidthMm);
    const depthMm=positiveNumber(b.derived?.boundingDepthMm);
    return widthMm && depthMm ? {widthMm, depthMm, source:'footprint bounds'} : null;
  }

  function footprintSizesMatch(currentSize, incomingSize){
    if(!currentSize || !incomingSize) return false;
    const widthTol=Math.max(0.5, Math.max(currentSize.widthMm, incomingSize.widthMm)*0.01);
    const depthTol=Math.max(0.5, Math.max(currentSize.depthMm, incomingSize.depthMm)*0.01);
    return Math.abs(currentSize.widthMm-incomingSize.widthMm)<=widthTol && Math.abs(currentSize.depthMm-incomingSize.depthMm)<=depthTol;
  }

  function formatFootprintSize(size){
    return size ? `${fmt(size.widthMm)} x ${fmt(size.depthMm)} mm` : 'unknown size';
  }

  function storeHakoFileOnBuilding(b, fileName, text, parsed, opts={}){
    const derived=deriveFootprintFromHakoConfig(parsed||{});
    b.hakoConfig=structuredClone(parsed);
    b.hakoFile={
      fileName:fileName||`${slug(b.name||'building')}.hako`,
      mimeType:'application/json',
      sizeBytes:text.length,
      importedAt:new Date().toISOString(),
      dataText:text,
      parsedConfig:structuredClone(parsed),
      source:opts.source||'selected-building-upload',
    };
    b.hakoFileId=b.hakoFile.fileName;
    if(derived?.trimLinesMm?.length){
      b.hakoTrimLinesMm=derived.trimLinesMm;
      b.showHakoTrimLines=true;
    } else {
      delete b.hakoTrimLinesMm;
    }
    if(opts.resizeFootprint) applyHakoConfigToPlannerFootprint(b, parsed);
    delete b.plannerHeightMm;
    if(b.state==='notStarted') b.state='inProgress';
    normalizeBuilding(b);
    syncBuildingMetrics(b);
    syncAll();
    $('statusHint').textContent=`Attached ${b.hakoFile.fileName} to ${b.name||'building'}${opts.resizeFootprint?' and resized the footprint':''}.`;
  }

  function confirmSelectedHakoSizeMismatch(b, currentSize, incomingSize, fileName){
    const currentText=formatFootprintSize(currentSize);
    const incomingText=formatFootprintSize(incomingSize);
    return confirm(`The dropped .hako file does not match the selected footprint size.\n\nSelected footprint: ${currentText}\nDropped building: ${incomingText}\n\nClick OK to upload "${fileName}" and resize the selected footprint to the .hako size.\nClick Cancel to discard the upload.`);
  }

  function createBuildingFromImportedHako(fileName, text, parsed){
    const derived=deriveFootprintFromHakoConfig(parsed||{});
    if(!derived){
      showStatusHint('Could not find a footprint, width/depth, or polygon in that .hako file.', 'warning');
      return null;
    }
    const center=visibleWorldCenter();
    const baseName=(parsed && (parsed.name||parsed.buildingName||parsed.title||parsed.projectName)) || (fileName||'Imported Building').replace(/\.(hako|json)$/i,'');
    const b={
      id:uid('bldg'), name:baseName,
      category:(parsed && (parsed.buildingType||parsed.type||parsed.category)) || 'imported',
      color:colors[state.buildings.length%colors.length], hidden:false, locked:false,
      state:'complete', notes:`Imported from an existing .hako file${derived.source?` (${derived.source})`:''}.`,
      hakoConfig:parsed||null,
      hakoFile:{fileName:fileName||`${slug(baseName)}.hako`,mimeType:'application/json',sizeBytes:text.length,importedAt:new Date().toISOString(),dataText:text,parsedConfig:parsed||null},
      hakoFileId:fileName||`${slug(baseName)}.hako`,
    };
    if(derived.trimLinesMm && derived.trimLinesMm.length){
      b.hakoTrimLinesMm=derived.trimLinesMm;
      b.showHakoTrimLines=true;
    }
    if(derived.padType==='polygon' && derived.pointsMm){
      const ptsMm=derived.pointsMm;
      const xs=ptsMm.map(p=>p.x), ys=ptsMm.map(p=>p.y);
      const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys);
      const cx=(minX+maxX)/2, cy=(minY+maxY)/2;
      b.hakoGeometryOriginMm={x:cx,y:cy};
      b.padType='polygon';
      b.pointsPx=ptsMm.map(p=>({x:center.x+mmToPx(p.x-cx), y:center.y+mmToPx(p.y-cy)}));
      b.rotationDeg=0;
    } else {
      b.padType='rect'; b.x=center.x; b.y=center.y;
      b.widthPx=mmToPx(derived.widthMm||20); b.depthPx=mmToPx(derived.depthMm||20); b.rotationDeg=0;
      b.hakoGeometryOriginMm={x:(derived.widthMm||20)/2,y:(derived.depthMm||20)/2};
    }
    normalizeBuilding(b); syncBuildingMetrics(b);
    state.buildings.push(b); setBuildingSelection([b.id], b.id);
    syncAll();
    return b;
  }

  function armGithubBuildingPlacement(record){
    const shape=githubRecordPlacementShape(record);
    if(!shape){ showStatusHint('This library record does not include enough footprint data to place it.', 'warning'); return; }
    state.githubBuildingPlacement={
      record:structuredClone(record),
      derived:shape.derived,
      cfg:shape.cfg,
      origin:shape.origin,
      previewPoint:visibleWorldCenter()
    };
    state.tool='select';
    closeGithubModal();
    $('statusHint').textContent=`Click the site plan to place ${record?.name||record?.id||'building footprint'}. Press Escape to cancel.`;
    draw();
  }

  function cancelGithubBuildingPlacement(){
    if(!state.githubBuildingPlacement) return false;
    state.githubBuildingPlacement=null;
    $('statusHint').textContent='Building placement canceled.';
    draw();
    return true;
  }

  function placeGithubBuildingAt(center){
    const placement=state.githubBuildingPlacement;
    if(!placement) return false;
    const record=placement.record||{};
    const path=record.path||record.paths?.hako||'';
    const d=placement.derived||{};
    const cfg=placement.cfg && Object.keys(placement.cfg).length ? structuredClone(placement.cfg) : null;
    const b={
      id:uid('bldg'),
      name:record.name||record.id||'Library Building',
      category:(record.tags&&record.tags[0])||record.category||cfg?.buildingType||'library',
      color:colors[state.buildings.length%colors.length],
      hidden:false,
      locked:false,
      state:'notStarted',
      notes:`Placed from GitHub building footprint library${path?`: ${path}`:''}.`,
      hakoConfig:cfg,
      hakoSeed:record.hakoSeed||cfg?.hakoSeed||null,
      hakoFile:null,
      hakoFileId:path||null,
      githubLibraryRecord:{id:record.id||null,path:path||null,placedAt:new Date().toISOString()}
    };
    if(d.trimLinesMm?.length){ b.hakoTrimLinesMm=d.trimLinesMm; b.showHakoTrimLines=true; }
    if(d.padType==='polygon' && Array.isArray(d.pointsMm) && d.pointsMm.length>=3){
      b.padType='polygon';
      b.pointsPx=githubPlacementPreviewPolygon(placement, center, mmToPx);
      b.rotationDeg=0;
      b.hakoGeometryOriginMm=placement.origin;
    } else {
      b.padType='rect';
      b.x=center.x;
      b.y=center.y;
      b.widthPx=mmToPx(d.widthMm||20);
      b.depthPx=mmToPx(d.depthMm||20);
      b.rotationDeg=0;
      b.hakoGeometryOriginMm={x:(d.widthMm||20)/2,y:(d.depthMm||20)/2};
    }
    normalizeBuilding(b);
    syncBuildingMetrics(b);
    state.buildings.push(b);
    setBuildingSelection([b.id], b.id);
    state.githubBuildingPlacement=null;
    syncAll();
    $('statusHint').textContent=`Placed ${b.name}.`;
    return true;
  }

  const {
    attachHakoFileToSelectedBuilding,
    importHakoAsBuilding,
  } = createHakoImportController({
    selected,
    selectedFootprintSizeMm,
    footprintSizesMatch,
    confirmSelectedHakoSizeMismatch,
    storeHakoFileOnBuilding,
    createBuildingFromImportedHako,
    slug,
    openImportProgressModal,
    setImportProgress,
    finishImportProgress,
    failImportProgress,
  });

  const {
    importStlAsSiteObject,
    attachSourceFileToStlObject,
  } = createStlImportController({
    state,
    uid,
    visibleWorldCenter,
    normalizeStlObject,
    clearPlanObjectSelection,
    setSidebarObjectType,
    syncAll,
    openImportProgressModal,
    setImportProgress,
    finishImportProgress,
    failImportProgress,
  });

  const {
    installWholePageHakoDrop,
    installSelectedHakoSidebarDrop,
    installHakoImportDropzone,
  } = createHakoDropController({
    document,
    selected,
    currentSelectedBuildingIds,
    importHakoAsBuilding,
    importStlAsSiteObject,
    attachHakoFileToSelectedBuilding,
    failImportProgress,
  });

  const {
    copySelectedFootprint,
    pasteFootprintFromClipboard,
    duplicateBuildingFootprint,
  } = createFootprintClipboardController({
    state,
    currentSelectedBuildingIds,
    selected,
    uid,
    normalizeBuilding,
    syncBuildingMetrics,
    setBuildingSelection,
    syncAll,
    updateStatus,
  });

  function syncBuildingMetrics(b){ if(!state.pxPerMm) return b; if(b.padType==='rect'){b.widthMm=pxToMm(b.widthPx); b.depthMm=pxToMm(b.depthPx); b.pointsPx=transformedRect(b); b.pointsMm=b.pointsPx.map(p=>({x:pxToMm(p.x),y:pxToMm(p.y)}));} else {b.pointsMm=b.pointsPx.map(p=>({x:pxToMm(p.x),y:pxToMm(p.y)})); b.derived={areaMm2:pxToMm(Math.sqrt(polygonArea(b.pointsPx)))**2, boundingWidthMm:pxToMm(Math.max(...b.pointsPx.map(p=>p.x))-Math.min(...b.pointsPx.map(p=>p.x))), boundingDepthMm:pxToMm(Math.max(...b.pointsPx.map(p=>p.y))-Math.min(...b.pointsPx.map(p=>p.y))), rotationDeg:b.rotationDeg||0};} return b; }
  function syncAll(opts = {}){
    state.buildings.forEach(syncBuildingMetrics);
    state.roads.forEach(syncRoadMetrics);
    const intersections=roadSystem.generatedRoadIntersections();
    if(state.selectedRoadIntersectionId && !intersections.some(intersection=>roadIntersectionKey(intersection)===state.selectedRoadIntersectionId)) state.selectedRoadIntersectionId=null;
    state.tracks=(state.tracks||[]).map(syncTrackMetrics);
    state.trackAccessories=(state.trackAccessories||[]).map(normalizeTrackAccessory);
    refreshAnchoredTrackAccessories();
    state.roadFeatures=(state.roadFeatures||[]).map(normalizeRoadFeature);
    generatedRailCrossings();
    state.stlObjects=(state.stlObjects||[]).map(normalizeStlObject);
    state.benchworkOutlines.forEach(normalizeBenchworkOutline);
    state.fabricRegions.forEach(normalizeFabricRegion);
    state.streetlights.forEach(normalizeStreetlight);
    renderList();
    renderRoads();
    renderStreetlights();
    renderSelected();
    updateHandoff();
    draw();
    if(state.viewMode==='3d') updateSite3D({preserveCamera:true});
    if(!opts.skipDirty) markDirty('project change');
  }
  function syncSelectedBuildingLive(b){
    if(!b) return;
    syncBuildingMetrics(b);
    renderList();
    updateHandoff();
    draw();
    updateSite3D({preserveCamera:true});
    markDirty('building field change');
  }


  const site3d = {
    view:null, scene:null, camera:null, renderer:null, controls:null,
    root:null, raycaster:null, pointer:null, pointerDown:null, hoverHelper:null, bounds:null, initialized:false
  };
  function applySite3DSettings(raw=state.site3d){
    const opacity=Number(raw?.imageOpacity);
    state.site3d={
      imageVisible: raw?.imageVisible !== false,
      imageOpacity: clamp(Number.isFinite(opacity) ? opacity : SITE3D_DEFAULT_IMAGE_OPACITY, 0, 1)
    };
    return state.site3d;
  }
  function syncSite3DControls(){
    const settings=applySite3DSettings();
    const imageVisible=$('site3dImageVisible');
    const imageOpacity=$('site3dImageOpacity');
    if(imageVisible) imageVisible.checked=settings.imageVisible;
    if(imageOpacity) imageOpacity.value=String(settings.imageOpacity);
  }
  function site3DScale(v){ return state.pxPerMm ? pxToMm(v) : v; }
  function positiveNumber(...values){ for(const v of values){ const n=Number(v); if(Number.isFinite(n) && n>0) return n; } return null; }
  function ensureSite3DBuildingConfigController(){
    if(!site3DBuildingConfigController){
      site3DBuildingConfigController=createSite3DBuildingConfigController({
        transformedRect,
        buildingCenter,
        site3DScale,
        positiveNumber,
        hasAttachedHakoFile,
        hakoFootprintRotationDeg,
      });
    }
    return site3DBuildingConfigController;
  }
  function site3DBuildingFootprintMm(b){ return ensureSite3DBuildingConfigController().site3DBuildingFootprintMm(b); }
  function site3DBuildingCenterMm(b){ return ensureSite3DBuildingConfigController().site3DBuildingCenterMm(b); }
  function site3DFloorCount(b,cfg){ return ensureSite3DBuildingConfigController().site3DFloorCount(b,cfg); }
  function site3DFloorHeightMm(b,cfg){ return ensureSite3DBuildingConfigController().site3DFloorHeightMm(b,cfg); }
  function site3DBuildingHeightMm(b,cfg){ return ensureSite3DBuildingConfigController().site3DBuildingHeightMm(b,cfg); }
  function site3DBuildingElevationMm(b){ return ensureSite3DBuildingConfigController().site3DBuildingElevationMm(b); }
  function site3DBuildingConfig(b){ return ensureSite3DBuildingConfigController().site3DBuildingConfig(b); }
  function site3DGeneratorBuildingConfig(b){ return ensureSite3DBuildingConfigController().site3DGeneratorBuildingConfig(b); }
  function site3DGeneratorModelOriginOffset(b,cfg){ return ensureSite3DBuildingConfigController().site3DGeneratorModelOriginOffset(b,cfg); }
  function site3DGeneratorModelRotationY(b,cfg){ return ensureSite3DBuildingConfigController().site3DGeneratorModelRotationY(b,cfg); }
  function site3DNormalizeBuildingConfig(b,cfg){ return ensureSite3DBuildingConfigController().site3DNormalizeBuildingConfig(b,cfg); }
  const { site3DBenchworkFootprintsMm, site3DBounds, disposeSite3DObject, site3DPlannerRotationY } = createSite3DSceneUtils({
    state,site3DScale,normalizeBenchworkOutline,benchworkSamples,normalizeRoad,syncRoadMetrics,roadDisplayPolygons,shouldClipRoadsToBenchwork,
    normalizeTrack,trackPathSamples,normalizeTrackAccessory,refreshTrackAccessoryAnchor,normalizeBuilding,site3DBuildingFootprintMm,normalizeStlObject,stlObjectRect,
  });
  const {
    tagSite3DBuilding,
    tagSite3DStlObject,
    tagSite3DTrackAccessory,
    tagSite3DRoadObject,
    tagSite3DTrackObject,
    tagSite3DRoadFeatureObject,
  } = createSite3DObjectTagging({ THREE, trackAccessoryLabel });
  function signedArea2D(pts){
    return pts.reduce((sum,p,i)=>{
      const q=pts[(i+1)%pts.length];
      return sum + p.x*q.y - q.x*p.y;
    },0)/2;
  }
  const {
    site3DMaterial,
    site3DAddEdges,
    site3DAddFlatPolygon,
    site3DAddRaisedPolygon,
    site3DAddBoxSegments,
    site3DBox,
    site3DBeam,
  } = createSite3DMeshUtils({
    THREE,
    dist,
    site3DScale,
    signedArea2D,
    getBounds: () => site3d.bounds,
  });
  function ensureSite3DBaseRenderer(){
    if(!site3DBaseRenderer){
      site3DBaseRenderer=createSite3DBaseRenderer({
        THREE,
        state,
        signedArea2D,
        site3DScale,
        site3DBenchworkFootprintsMm,
        normalizeBenchworkOutline,
        benchworkSamples,
        applySite3DSettings,
      });
    }
    return site3DBaseRenderer;
  }
  function buildSite3DBase(bounds,baseT){
    return ensureSite3DBaseRenderer().buildSite3DBase(bounds,baseT);
  }
  function buildSite3DReferenceImage(bounds){
    return ensureSite3DBaseRenderer().buildSite3DReferenceImage(bounds);
  }
  function buildSite3DRoadGroup(bounds){
    return createSite3DRoadRenderer({
      THREE,
      state,
      normalizeRoad,
      syncRoadMetrics,
      roadDisplayPolygons,
      shouldClipRoadsToBenchwork,
      clipPolygonToBenchwork,
      site3DAddFlatPolygon,
      normalizeRoadFeature,
      isSiteObjectSelected,
      tagSite3DRoadObject,
      tagSite3DRoadFeatureObject,
      roadSystem,
      markingPresetByKey,
      rad,
    }).buildSite3DRoadGroup(bounds);
  }
  function buildSite3DTrackGroup(bounds){
    return createSite3DTrackRenderer({
      THREE,
      state,
      trackProfileDefaults: TRACK_PROFILE_DEFAULTS,
      positiveNumber,
      site3DScale,
      normalizeTrack,
      trackPathSamples,
      trackProfilePx,
      offsetPathPolygon,
      site3DAddRaisedPolygon,
      trackTieSegments,
      tagSite3DTrackObject,
      offsetTrackPath,
      site3DAddBoxSegments,
    }).buildSite3DTrackGroup(bounds);
  }
  function ensureSite3DBuildingRenderer(){
    if(!site3DBuildingRenderer){
      site3DBuildingRenderer=createSite3DBuildingRenderer({
        THREE,
        logger,
        site3DScale,
        site3DMaterial,
        site3DBox,
        site3DAddEdges,
        site3DBuildingFootprintMm,
        site3DBuildingCenterMm,
        site3DBuildingConfig,
        site3DGeneratorBuildingConfig,
        site3DBuildingHeightMm,
        site3DFloorCount,
        site3DBuildingElevationMm,
        site3DPlannerRotationY,
        site3DGeneratorModelOriginOffset,
        site3DGeneratorModelRotationY,
        visibleBuildingPolygons,
        tagSite3DBuilding,
        positiveNumber,
      });
    }
    return site3DBuildingRenderer;
  }
  function buildSite3DSelectionHelper(b,bounds,opts={}){
    return ensureSite3DBuildingRenderer().buildSite3DSelectionHelper(b,bounds,opts);
  }
  function buildSite3DBuildingGroup(b,bounds){
    return ensureSite3DBuildingRenderer().buildSite3DBuildingGroup(b,bounds);
  }
  function ensureSite3DTrackAccessoryRenderer(){
    if(!site3DTrackAccessoryRenderer){
      site3DTrackAccessoryRenderer=createSite3DTrackAccessoryRenderer({
        THREE,
        state,
        trackProfileDefaults: TRACK_PROFILE_DEFAULTS,
        rad,
        clamp,
        site3DScale,
        site3DAddEdges,
        site3DBox,
        site3DBeam,
        isSiteObjectSelected,
        tagSite3DTrackAccessory,
        refreshTrackAccessoryAnchor,
        normalizeTrackAccessory,
        trackAccessoryLabel,
        isCatenaryAccessoryKind,
        isTrackSwitchAccessoryKind,
        isTrackBufferAccessoryKind,
        trackBufferHasCatenaryTerminal,
        trackSwitchDirection,
        trackSwitchGeometrySite3D,
        trackSwitchCurvePoints,
        trackSwitchMainPathPoints,
        polylineLength,
        pointAtPolylineDistance,
        offsetTrackPath,
        trackBufferGeometrySite3D,
      });
    }
    return site3DTrackAccessoryRenderer;
  }
  function buildSite3DCatenaryItem(item,bounds){
    return ensureSite3DTrackAccessoryRenderer().buildSite3DCatenaryItem(item,bounds);
  }
  function buildSite3DTrackSwitchItem(item,bounds){
    return ensureSite3DTrackAccessoryRenderer().buildSite3DTrackSwitchItem(item,bounds);
  }
  function buildSite3DTrackBufferItem(item,bounds){
    return ensureSite3DTrackAccessoryRenderer().buildSite3DTrackBufferItem(item,bounds);
  }
  function buildSite3DTrackAccessoryGroup(bounds){
    return ensureSite3DTrackAccessoryRenderer().buildSite3DTrackAccessoryGroup(bounds);
  }
  function ensureSite3DStlRenderer(){
    if(!site3DStlRenderer){
      site3DStlRenderer=createSite3DStlRenderer({
        THREE,
        logger,
        base64ToArrayBuffer,
        boundsFromVertices,
        estimateStlTriangleCount,
        parseStlVertices,
        normalizeStlObject,
        site3DScale,
        mmToPx,
        site3DMaterial,
        tagSite3DStlObject,
      });
    }
    return site3DStlRenderer;
  }
  function buildSite3DStlObjectGroup(raw,bounds){
    return ensureSite3DStlRenderer().buildSite3DStlObjectGroup(raw,bounds);
  }
  function ensureGithubBuildingPreviewRenderer(){
    if(!githubBuildingPreviewRenderer){
      githubBuildingPreviewRenderer=createGithubBuildingPreviewRenderer({
        THREE,
        uid,
        positiveNumber,
        site3DNormalizeBuildingConfig,
        readGithubFile,
      });
    }
    return githubBuildingPreviewRenderer;
  }
  function githubBuildingPreviewConfig(record, parsedConfig=null){
    return ensureGithubBuildingPreviewRenderer().githubBuildingPreviewConfig(record, parsedConfig);
  }
  function renderGithubBuildingStill(target, cfg, label='3D building preview'){
    return ensureGithubBuildingPreviewRenderer().renderGithubBuildingStill(target, cfg, label);
  }
  async function upgradeGithubBuildingPreviewFromHako(settings, record, target){
    return ensureGithubBuildingPreviewRenderer().upgradeGithubBuildingPreviewFromHako(settings, record, target);
  }
  function initSite3D(){
    if(site3d.initialized) return true;
    site3d.view=ensureSite3dView();
    if(typeof THREE==='undefined'){ logger.warn('3D view unavailable: Three.js did not load.'); return false; }
    site3d.scene=new THREE.Scene();
    site3d.scene.background=new THREE.Color(0xecece6);
    site3d.camera=new THREE.PerspectiveCamera(45,1,.1,5000);
    site3d.raycaster=new THREE.Raycaster();
    site3d.pointer=new THREE.Vector2();
    site3d.renderer=new THREE.WebGLRenderer({antialias:true});
    site3d.renderer.localClippingEnabled=true;
    site3d.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    site3d.renderer.domElement.draggable=false;
    site3d.renderer.domElement.addEventListener('selectstart', e=>e.preventDefault());
    site3d.renderer.domElement.addEventListener('dragstart', e=>e.preventDefault());
    site3d.renderer.domElement.addEventListener('pointerdown', e=>{ site3d.pointerDown={x:e.clientX,y:e.clientY}; });
    site3d.renderer.domElement.addEventListener('pointerup', handleSite3DPointerUp);
    site3d.view.appendChild(site3d.renderer.domElement);
    installThreeRenderCanvas(site3d.view,site3d.renderer.domElement);
    const ambient=new THREE.AmbientLight(0xffffff,.72);
    const dir=new THREE.DirectionalLight(0xffffff,.82);
    dir.position.set(160,220,140);
    site3d.scene.add(ambient,dir);
    site3d.root=new THREE.Group();
    site3d.scene.add(site3d.root);
    if(THREE.OrbitControls){
      site3d.controls=new THREE.OrbitControls(site3d.camera,site3d.renderer.domElement);
      site3d.controls.enableDamping=false;
      site3d.controls.addEventListener('change',renderSite3D);
    }
    site3d.initialized=true;
    resizeSite3D();
    return true;
  }
  document.addEventListener('selectstart', e=>{
    if(state.viewMode==='3d' && e.target?.closest?.('.canvasWrap')) e.preventDefault();
  });
  function resizeSite3D(){
    if(!site3d.initialized || !site3d.renderer || !site3d.camera) return;
    const r=(site3d.view||ensureSite3dView()).getBoundingClientRect();
    const w=Math.max(1,Math.floor(r.width)), h=Math.max(1,Math.floor(r.height));
    site3d.camera.aspect=w/h;
    site3d.camera.updateProjectionMatrix();
    site3d.renderer.setSize(w,h,false);
    renderSite3D();
  }
  let site3DInteractionController=null;
  function ensureSite3DInteractionController(){
    if(!site3DInteractionController){
      site3DInteractionController=createSite3DInteractionController({
        state,site3d,disposeSite3DObject,buildSite3DSelectionHelper,normalizeBuilding,
        selectTrackAccessory,clearPlanObjectSelection,selectStlObject,setBuildingSelection,
        renderList,renderRoads,renderStreetlights,renderSelected,updateHandoff,updateSite3D,setSidebarOpen,
      });
    }
    return site3DInteractionController;
  }
  function renderSite3D(){ return ensureSite3DInteractionController().renderSite3D(); }
  function clearSite3DHoverIndicator(){ return ensureSite3DInteractionController().clearSite3DHoverIndicator(); }
  function updateSite3DHoverIndicator(){ return ensureSite3DInteractionController().updateSite3DHoverIndicator(); }
  function site3DCameraSnapshot(){ return ensureSite3DInteractionController().site3DCameraSnapshot(); }
  function restoreSite3DCameraSnapshot(snapshot){ return ensureSite3DInteractionController().restoreSite3DCameraSnapshot(snapshot); }
  function site3DHitSelectionData(object){ return ensureSite3DInteractionController().site3DHitSelectionData(object); }
  function selectSite3DHit(selection){ return ensureSite3DInteractionController().selectSite3DHit(selection); }
  function handleSite3DPointerUp(event){ return ensureSite3DInteractionController().handleSite3DPointerUp(event); }
  let site3DSceneController=null;
  function ensureSite3DSceneController(){
    if(!site3DSceneController){
      site3DSceneController=createSite3DSceneController({
        THREE,state,site3d,baseThicknessMm:SITE3D_BASE_THICKNESS_MM,initSite3D,
        site3DCameraSnapshot,clearSite3DHoverIndicator,disposeSite3DObject,site3DBounds,site3DBenchworkFootprintsMm,
        buildSite3DBase,buildSite3DReferenceImage,buildSite3DRoadGroup,buildSite3DTrackGroup,buildSite3DTrackAccessoryGroup,
        normalizeBuilding,syncBuildingMetrics,buildSite3DBuildingGroup,tagSite3DBuilding,isBuildingSelected,buildSite3DSelectionHelper,
        normalizeStlObject,buildSite3DStlObjectGroup,restoreSite3DCameraSnapshot,updateSite3DHoverIndicator,renderSite3D,
      });
    }
    return site3DSceneController;
  }
  function updateSite3D(options={}){ return ensureSite3DSceneController().updateSite3D(options); }
  function setSite3DMode(on){
    state.viewMode=on?'3d':'2d';
    wrap.classList.toggle('view3d',state.viewMode==='3d');
    document.querySelector('.sitePlannerApp')?.classList.toggle('view3d',state.viewMode==='3d');
    $('view2dCanvasBtn')?.classList.toggle('active',state.viewMode!=='3d');
    $('view3dCanvasBtn')?.classList.toggle('active',state.viewMode==='3d');
    updateEmptyImageOverlay();
    if(state.viewMode==='3d') updateSite3D({preserveCamera:site3d.initialized});
    else draw();
  }
  function bindSite3DButtons(){
    const view2d=$('view2dCanvasBtn');
    const view3d=$('view3dCanvasBtn');
    if(view2d && !view2d.dataset.site3dBound){ view2d.dataset.site3dBound='1'; view2d.onclick=()=>setSite3DMode(false); }
    if(view3d && !view3d.dataset.site3dBound){ view3d.dataset.site3dBound='1'; view3d.onclick=()=>setSite3DMode(true); }
    const imageVisible=$('site3dImageVisible');
    const imageOpacity=$('site3dImageOpacity');
    if(imageVisible && !imageVisible.dataset.site3dBound){
      imageVisible.dataset.site3dBound='1';
      imageVisible.onchange=()=>{
        state.site3d=state.site3d||{};
        state.site3d.imageVisible=!!imageVisible.checked;
        updateSite3D({preserveCamera:true});
        markDirty('3d reference image visibility', {history:false});
      };
    }
    if(imageOpacity && !imageOpacity.dataset.site3dBound){
      imageOpacity.dataset.site3dBound='1';
      imageOpacity.oninput=()=>{
        state.site3d=state.site3d||{};
        state.site3d.imageOpacity=clamp(parseFloat(imageOpacity.value)||0,0,1);
        updateSite3D({preserveCamera:true});
        markDirty('3d reference image opacity', {history:false});
      };
    }
    syncSite3DControls();
  }
  function ensureSiteProjectPersistenceController(){
    if(!siteProjectPersistenceController){
      siteProjectPersistenceController=createSiteProjectPersistenceController({
        state,
        canvas,
        normalizeBuilding,
        syncBuildingMetrics,
        normalizeBenchworkOutline,
        normalizeFabricRegion,
        normalizeStreetlight,
        normalizeStlObject,
        normalizeDrivingSide,
        imageMetaForProject,
        updateImagePortableStatus,
        formatBytes,
      });
    }
    return siteProjectPersistenceController;
  }
  function historySnapshot(){
    return ensureSiteProjectPersistenceController().historySnapshot();
  }
  function updateHistoryButtons(){
    const canUndo=state.historyIndex>0;
    const canRedo=state.historyIndex>=0 && state.historyIndex<state.history.length-1;
    ['undoBtn','mobileUndoBtn'].forEach(id=>{const b=$(id); if(b){b.disabled=!canUndo; b.setAttribute('aria-disabled', String(!canUndo));}});
    ['redoBtn','mobileRedoBtn'].forEach(id=>{const b=$(id); if(b){b.disabled=!canRedo; b.setAttribute('aria-disabled', String(!canRedo));}});
  }
  function pushHistorySnapshot(_label=''){
    if(state.historySuppressed) return;
    const snap=historySnapshot();
    if(state.historyIndex>=0 && state.history[state.historyIndex]===snap){ updateHistoryButtons(); return; }
    if(state.historyIndex<state.history.length-1) state.history=state.history.slice(0,state.historyIndex+1);
    state.history.push(snap);
    const max=80;
    if(state.history.length>max) state.history.splice(0,state.history.length-max);
    state.historyIndex=state.history.length-1;
    updateHistoryButtons();
  }
  function resetHistory(_label=''){
    state.history=[];
    state.historyIndex=-1;
    pushHistorySnapshot(_label);
  }
  function applyHistorySnapshot(snap){
    let data;
    try{ data=JSON.parse(snap); }catch(err){ logger.warn('Could not restore undo state:', err); return; }
    state.historySuppressed=true;
    const oldDataUrl=state.imageMeta?.dataUrl || null;
    const newDataUrl=data.imageMeta?.dataUrl || null;
    state.imageMeta=data.imageMeta||null;
    state.imageOpacity=Number.isFinite(Number(data.imageOpacity))?Number(data.imageOpacity):.75;
    state.imageLocked=data.imageLocked!==false;
    state.pxPerMm=data.pxPerMm||null;
    state.calibrationLine=data.calibrationLine||null;
    state.lastCalibrationLine=data.lastCalibrationLine||state.calibrationLine||null;
    state.buildings=Array.isArray(data.buildings)?structuredClone(data.buildings):[];
    state.roads=Array.isArray(data.roads)?structuredClone(data.roads):[];
    state.tracks=(Array.isArray(data.tracks)?structuredClone(data.tracks):[]).map(normalizeTrack);
    state.trackAccessories=(Array.isArray(data.trackAccessories)?structuredClone(data.trackAccessories):[]).map(normalizeTrackAccessory);
    state.roadFeatures=migrateLoadedRoadFeatures(data.roadFeatures);
    state.roadDrivingSide=normalizeDrivingSide(data.roadDrivingSide);
    state.roadIntersectionDetails=data.roadIntersectionDetails!==false;
    state.roadIntersectionOverrides=data.roadIntersectionOverrides&&typeof data.roadIntersectionOverrides==='object'?structuredClone(data.roadIntersectionOverrides):{};
    state.generatedRoadIntersections=[];
    state.railCrossingOverrides=data.railCrossingOverrides&&typeof data.railCrossingOverrides==='object'?structuredClone(data.railCrossingOverrides):{};
    state.generatedRailCrossings=[];
    state.stlObjects=Array.isArray(data.stlObjects)?structuredClone(data.stlObjects):[];
    state.benchworkOutlines=Array.isArray(data.benchworkOutlines)?structuredClone(data.benchworkOutlines):[];
    state.fabricRegions=Array.isArray(data.fabricRegions)?structuredClone(data.fabricRegions):[];
    state.streetlights=Array.isArray(data.streetlights)?structuredClone(data.streetlights):[];
    state.annotations=Array.isArray(data.annotations)?structuredClone(data.annotations):[];
    state.selectedId=data.selectedId||null;
    state.selectedIds=Array.isArray(data.selectedIds)?data.selectedIds.slice():[];
    state.selectedSiteObjects=Array.isArray(data.selectedSiteObjects)?data.selectedSiteObjects.map(sel=>({type:sel.type,id:sel.id})).filter(sel=>sel.type&&sel.id):[];
    state.selectedRoadId=data.selectedRoadId||null;
    state.selectedRoadIntersectionId=data.selectedRoadIntersectionId||null;
    state.selectedRailCrossingId=data.selectedRailCrossingId||null;
    state.selectedTrackId=data.selectedTrackId||null;
    state.selectedTrackPointIndex=Number.isInteger(data.selectedTrackPointIndex)?data.selectedTrackPointIndex:null;
    state.selectedTrackAccessoryId=data.selectedTrackAccessoryId||null;
    state.selectedStlObjectId=data.selectedStlObjectId||null;
    state.selectedBenchworkId=data.selectedBenchworkId||null;
    state.selectedFabricId=data.selectedFabricId||null;
    state.selectedStreetlightId=data.selectedStreetlightId||null;
    state.selectedAnnotationId=data.selectedAnnotationId||null;
    state.measureLine=data.measureLine||null;
    if($('opacity')) $('opacity').value=String(state.imageOpacity);
    if($('imageLockBtn')) $('imageLockBtn').textContent=state.imageLocked?'Locked':'Unlocked';
    const finish=()=>{
      syncAll({skipDirty:true});
      updateImagePortableStatus();
      updateHistoryButtons();
      state.historySuppressed=false;
      markDirty('undo redo', {history:false});
    };
    if(newDataUrl && newDataUrl!==oldDataUrl){
      const img=new Image();
      img.onload=()=>{state.image=img; finish();};
      img.onerror=()=>{state.image=null; setImageStatus('Undo/redo restored image metadata, but the embedded image could not be decoded.', 'warning'); finish();};
      img.src=newDataUrl;
    } else {
      if(!newDataUrl) state.image=null;
      finish();
    }
  }
  function undo(){
    if(state.historyIndex<=0) return false;
    state.historyIndex--;
    applyHistorySnapshot(state.history[state.historyIndex]);
    return true;
  }
  function redo(){
    if(state.historyIndex<0 || state.historyIndex>=state.history.length-1) return false;
    state.historyIndex++;
    applyHistorySnapshot(state.history[state.historyIndex]);
    return true;
  }

  function markDirty(_reason='', opts={}){
    if(opts.history!==false && !state.historySuppressed) pushHistorySnapshot(_reason);
    if(!state.autosaveReady || autosaveSuppressed) return;
    state.dirty=true;
    state.dirtySinceManualSave=true;
    updateAutosaveStatus();
    scheduleAutosave();
  }
  function scheduleAutosave(){
    clearTimeout(autosaveTimer);
    autosaveTimer=setTimeout(writeAutosave, 450);
  }
  function makeProjectPayload(opts={}){
    return ensureSiteProjectPersistenceController().makeProjectPayload(opts);
  }
  function writeAutosave(){
    if(!state.autosaveReady) return;
    clearTimeout(autosaveTimer);
    autosaveTimer=null;
    try{
      let payload=makeProjectPayload({includeImageDataUrl:true});
      const meta={savedAt:payload.savedAt, dirtySinceManualSave:!!state.dirtySinceManualSave, imageEmbedded:!!payload.image?.dataUrl, imageBytes:payload.image?.dataUrlByteLength||0};
      try{
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(payload));
        localStorage.setItem(AUTOSAVE_META_KEY, JSON.stringify(meta));
        updateImagePortableStatus();
      }catch(storageErr){
        // Browser localStorage is often too small for large reference images.
        // Keep geometry safe in this browser by retrying without the image,
        // while portable .hako-site.json saves still embed the full original.
        if(payload.image?.dataUrl){
          payload=makeProjectPayload({includeImageDataUrl:false});
          const fallbackMeta={savedAt:payload.savedAt, dirtySinceManualSave:!!state.dirtySinceManualSave, imageEmbedded:false, imageTooLargeForAutosave:true, imageBytes:meta.imageBytes};
          localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(payload));
          localStorage.setItem(AUTOSAVE_META_KEY, JSON.stringify(fallbackMeta));
          updateAutosaveStatus('Autosave: geometry saved, image too large');
          updateImagePortableStatus('Portable save: embeds original image; autosave kept geometry only because browser cache is too small.');
        } else {
          throw storageErr;
        }
      }
      state.dirty=false;
      state.lastAutosaveAt=Date.now();
      if(!(payload.image && !payload.image.dataUrl && state.imageMeta?.dataUrl)) updateAutosaveStatus();
    }catch(err){
      logger.warn('Autosave failed:', err);
      updateAutosaveStatus('Autosave: failed');
    }
  }
  function markManualSaveComplete(){
    state.dirty=false;
    state.dirtySinceManualSave=false;
    writeAutosave();
    updateAutosaveStatus('Autosave: saved');
    setTimeout(()=>updateAutosaveStatus(), 1200);
  }


  const { drawHoverPreview } = createCanvasHoverPreviewRenderer({
    ctx,
    state,
    mmToPx,
    drawLabel,
    githubPlacementPreviewPolygon,
  });

  const {
    groupSelectionPointCloud,
    groupSelectionBounds,
    groupRotationHandlePoint,
    hitGroupRotationHandle,
    drawGroupSelectionAffordance,
  } = createGroupSelectionController({
    ctx,
    state,
    dist,
    buildingPoints,
    stlObjectRect,
    normalizeStlObject,
    currentSelectedMovableSiteObjects,
  });

  function hakoDisplayTrimPolylinesMm(b){return ensureHakoBuildingGeometryController().hakoDisplayTrimPolylinesMm(b);}
  const { drawBuilding } = createSiteBuildingRenderer2D({
    state,
    ctx,
    dist,
    fmt,
    polygonCenter,
    buildingCenter,
    rotateHandlePoint,
    hakoDisplayTrimPolylinesMm,
    hakoLocalMmToWorld,
    syncBuildingMetrics,
    visibleBuildingPolygons,
    isSiteObjectSelected,
    currentSelectedBuildingIds,
    drawLabel: (...args) => drawLabel(...args),
  });
  const { drawNow, fitImage } = createSiteCanvasRenderer({
    canvas,
    state,
    ctx,
    fmt,
    pxToMm,
    dist,
    drawGrid,
    drawAnnotations,
    drawLine,
    drawBenchwork,
    drawRoadLayer,
    drawTrack,
    drawGeneratedRailCrossings,
    drawTrackAccessory,
    drawFabricRegion,
    drawBuilding,
    drawStlObject,
    drawStreetlight,
    createRoadCenterlineFromPoints,
    drawRoad,
    normalizeTrack,
    drawFabricDraft,
    drawGroupSelectionAffordance,
    drawSelectionMarquee,
    drawHoverPreview,
    updateEmptyImageOverlay,
    updateStatus,
    draw: () => draw(),
  });
  function draw(){
    if(renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      if(state.viewMode==='3d') updateSite3D({preserveCamera:true});
      else drawNow();
    });
  }

  function clearPlanObjectSelection(){
    clearBuildingSelection();
    clearSelectedSiteObjects();
    state.selectedRoadId=null;
    state.selectedRoadFeatureId=null;
    state.selectedTrackId=null;
    state.selectedTrackAccessoryId=null;
    state.selectedBenchworkId=null;
    state.selectedStreetlightId=null;
    state.selectedFabricId=null;
    state.selectedAnnotationId=null;
    state.selectedStlObjectId=null;
    state.selectedRoadIntersectionId=null;
    state.selectedRailCrossingId=null;
  }
  function ensureSidebarObjectBrowserController(){
    if(!sidebarObjectBrowserController){
      sidebarObjectBrowserController=createSidebarObjectBrowserController({
        state,
        getElement:$,
        escapeHtml,
        escapeAttr,
        fmt,
        hydrateIcons,
        installHakoImportDropzone,
        normalizeBuilding,
        normalizeRoad,
        normalizeTrack,
        normalizeTrackAccessory,
        normalizeRoadFeature,
        normalizeBenchworkOutline,
        normalizeStreetlight,
        normalizeFabricRegion,
        normalizeStlObject,
        buildingStateLabel,
        trackAccessoryPreset,
        trackAccessoryLabel,
        trackAccessoryFilterCounts,
        trackAccessoryMatchesObjectFilter,
        isBuildingSelected,
        setSingleSiteObjectSelection,
        toggleSiteObjectSelection,
        updateSite3DHoverIndicator,
        renderSelected,
        updateHandoff,
        draw,
        fabricPresets:FABRIC_PRESETS,
      });
    }
    return sidebarObjectBrowserController;
  }
  function setSidebarObjectType(value){
    ensureSidebarObjectBrowserController().setActiveType(value);
  }
  function renderObjectBrowser(){
    ensureSidebarObjectBrowserController().renderObjectBrowser();
  }
  function renderStreetlights(){
    ensureSidebarObjectBrowserController().renderStreetlights();
  }
  function renderList(){
    ensureSidebarObjectBrowserController().renderList();
  }
  function renderSelectedCore(){const b=selected(), box=$('selectedPanel'); const note=selectedAnnotation(); const roadIntersection=selectedRoadIntersection(); const railCrossing=selectedRailCrossing(); const roadFeature=selectedRoadFeature(); const road=selectedRoad(); const track=selectedTrack(); const bench=selectedBenchwork(); const light=selectedStreetlight(); const fabric=selectedFabric(); const stl=selectedStlObject(); const selIds=currentSelectedBuildingIds(); const trackAccessory=(!b && !selIds.length && !note && !roadIntersection && !railCrossing && !roadFeature && !road && !track && !bench && !light && !fabric && !stl) ? selectedTrackAccessory() : null; if(!b && selIds.length>1){ box.innerHTML=`<b>${selIds.length} buildings selected</b><br><span class="small muted">Drag any selected footprint to move the whole selection. Use keyboard shortcuts to copy/paste selected building footprints.</span><div class="buttons" style="margin-top:8px"><button id="clearMultiB">Clear Selection</button><button id="deleteMultiB" class="danger">Delete Selected</button></div>`; $('clearMultiB').onclick=()=>{clearBuildingSelection(); syncAll();}; $('deleteMultiB').onclick=()=>{state.buildings=state.buildings.filter(x=>!selIds.includes(x.id)); clearBuildingSelection(); syncAll();}; return;} if(!b){if(trackAccessory){renderTrackAccessoryDetail({
        trackAccessory,
        panel: box,
        getElement: $,
        fmt,
        escapeAttr,
        escapeHtml,
        syncAll,
        normalizeTrackAccessory,
        trackAccessoryLabel,
        trackAccessoryPreset,
        isCatenaryAccessoryKind,
        isTrackSwitchAccessoryKind,
        isTrackBufferAccessoryKind,
        trackBufferHasCatenaryTerminal,
        syncTracksConnectedToTrackSwitch,
        nearestTrackAccessoryAnchor,
        nearestTrackEndpointAnchor,
        attachTrackAccessoryToAnchor,
        installAdaptiveDegreeStepping,
        deleteSelectedTrackAccessory,
      });
      return;
    } if(roadIntersection){renderRoadIntersectionDetail({
      roadIntersection,
      panel: box,
      state,
      getElement: $,
      fmt,
      escapeAttr,
      escapeHtml,
      syncAll,
      roadSystem,
      roadIntersectionKey,
      normalizeIntersectionOverride,
      roadArmKey,
    });
      return;
    } if(railCrossing){renderRailCrossingDetail({
      railCrossing,
      panel: box,
      state,
      getElement: $,
      fmt,
      escapeHtml,
      syncAll,
      installAdaptiveDegreeStepping,
      railCrossingOverrideKey,
      normalizeRailCrossingOverride,
      centerClearanceMm: RAIL_CROSSING_CENTER_CLEARANCE_MM,
    });
      return;
    } if(roadFeature){renderRoadFeatureDetail({
      roadFeature,
      panel: box,
      state,
      getElement: $,
      fmt,
      escapeAttr,
      escapeHtml,
      mmToPx,
      syncAll,
      normalizeRoadFeature,
      installAdaptiveDegreeStepping,
      hatchOptionsHtml,
      markingOptionsHtml,
      markingPresetByKey,
      grateFamilyOptionsHtml,
      syncPhysicalGrateSpecDimensions,
      applyRoadHatchPreset,
      applyRoadMarkingPreset,
      roadPresetScaleContext,
      setPhysicalGrateMode,
      applyPhysicalGrateFamily,
      setRoadMarkingOutputMode,
      fitRoadMarkingToRoad,
      alignRoadMarkingToRoad,
      deleteSelectedRoadFeature,
    });
      return;
    } if(road){renderRoadDetail({
      road,
      panel: box,
      state,
      getElement: $,
      fmt,
      escapeAttr,
      mmToPx,
      syncAll,
      normalizeRoad,
      syncRoadMetrics,
      roadWidthPresets: ROAD_WIDTH_PRESETS,
      sidewalkWidthPresets: SIDEWALK_WIDTH_PRESETS,
      presetOptionsHtml,
      currentScaleDivisor,
      applyRoadWidthPreset,
      applySidewalkWidthPreset,
      normalizeDrivingSide,
      roadIntersectionMarkingControls,
      roadSystem,
      showStatusHint,
      deleteSelectedRoad,
    });
      return;
    } if(track){renderTrackDetail({
      track,
      panel: box,
      state,
      getElement: $,
      fmt,
      escapeAttr,
      mmToPx,
      syncAll,
      normalizeTrack,
      syncTrackMetrics,
      deleteSelectedTrackPoint,
      deleteSelectedTrack,
    });
      return;
    } if(bench){renderBenchworkDetail({
      benchwork: bench,
      panel: box,
      getElement: $,
      escapeAttr,
      escapeHtml,
      syncAll,
      normalizeBenchworkOutline,
      deleteSelectedBenchwork,
    });
      return;
    } if(light){renderStreetlightDetail({
      streetlight: light,
      panel: box,
      getElement: $,
      fmt,
      escapeAttr,
      escapeHtml,
      syncAll,
      normalizeStreetlight,
      installAdaptiveDegreeStepping,
      duplicateStreetlight,
      deleteSelectedStreetlight,
    });
    } else if(fabric){renderFabricDetail({
      fabricRegion: fabric,
      panel: box,
      state,
      getElement: $,
      fmt,
      escapeAttr,
      escapeHtml,
      fabricPresets: FABRIC_PRESETS,
      syncAll,
      normalizeFabricRegion,
      generateFabricForRegion,
      deleteSelectedFabricRegion,
    });
    } else if(stl){renderStlDetail({
      stlObject: stl,
      panel: box,
      getElement: $,
      fmt,
      escapeAttr,
      escapeHtml,
      slug,
      syncAll,
      normalizeStlObject,
      installAdaptiveDegreeStepping,
      attachSourceFileToStlObject,
      downloadBase64,
      deleteSelectedStlObject,
    });
    } else if(note){const pts=note.points||[]; box.innerHTML=`<b>Annotation selected</b><br><span class="small muted">${pts.length} points</span><div class="buttons" style="margin-top:8px"><button id="delNoteB" class="danger">Delete Annotation</button></div>`; const del=$('delNoteB'); if(del) del.onclick=deleteSelectedAnnotation;} else box.innerHTML='No building selected.'; const btn=$('deleteAnnotationBtn'); if(btn) btn.disabled=!note; return;} if($('deleteAnnotationBtn')) $('deleteAnnotationBtn').disabled=true; syncBuildingMetrics(b); box.innerHTML=`
    <label>Name</label><input id="selName" value="${escapeAttr(b.name||'')}">
    <div class="row"><div><label>Status</label><select id="selState"><option value="notStarted">Not Started</option><option value="inProgress">In Progress</option><option value="awaitingConstruction">Awaiting Construction</option><option value="complete">Complete</option></select></div><div><label>Color</label><input id="selColor" type="color" value="${b.color||'#d79631'}"></div></div>
    <div class="row"><div><label>Category</label><input id="selCat" value="${escapeAttr(b.category||'industrial')}"></div><div><label>Type</label><input value="${b.padType}" disabled></div></div>
    <div class="row"><div><label>Rotation °</label><input id="selRot" type="number" step="0.1" value="${fmt(b.rotationDeg||0)}"></div><div><label>Stored file</label><input value="${b.hakoFile?'.hako attached':'none'}" disabled></div></div>
    ${b.padType==='rect'?`<div class="row"><div><label>Width mm</label><input id="selW" type="number" step="0.1" value="${fmt(b.widthMm)}"></div><div><label>Depth mm</label><input id="selD" type="number" step="0.1" value="${fmt(b.depthMm)}"></div></div>`:`<div class="small"><span class="pill">Area ${fmt(b.derived?.areaMm2||0)} mm²</span><span class="pill">Bounds ${fmt(b.derived?.boundingWidthMm||0)}×${fmt(b.derived?.boundingDepthMm||0)} mm</span></div>`}
    <div class="row"><div><label>3D height mm</label><input id="sel3dHeight" type="number" min="0.1" step="0.1" value="${fmt(site3DBuildingHeightMm(b,site3DBuildingConfig(b)))}"></div><div><label>Base elevation mm</label><input id="sel3dElevation" type="number" step="0.1" value="${fmt(site3DBuildingElevationMm(b))}"></div></div>
    <div class="buttons" style="margin:10px 0 8px"><button id="copySeedB">Copy HakoSeed</button></div>
    <div class="small muted" style="margin:-2px 0 8px">Creates a HakoSeed payload for this building and opens <code>building-generator.html#sitePlannerSeed</code>.</div>
    <label>Completed .hako file</label>
    <div id="hakoFileSummaryB" class="codebox" style="margin:4px 0 6px;white-space:normal">${hakoFileSummary(b)}</div>
    <input id="hakoFileInput" type="file" accept=".hako,.json,application/json" style="display:none">
    <div class="buttons" style="margin-bottom:8px"><button id="downloadHakoB" ${hakoFileText(b)?'':'disabled'}>Download .hako</button></div>
    <div class="small muted" style="margin:-4px 0 8px">Drop a .hako anywhere in this sidebar to attach it to this footprint.</div>
    <label>Notes</label><textarea id="selNotes" rows="3">${escapeHtml(b.notes||'')}</textarea>
    ${b.padType==='rect'?'<div class="buttons" style="margin-top:8px"><button id="polyB">Convert to Polygon</button></div>':''}
    <div class="buttons sitePlannerPrimaryActionRow"><button id="openSelectedHakoB" class="primary sitePlannerPrimaryAction">Open in HakoMachi</button></div>`;
    const bind=(id,fn)=>{const e=$(id); if(e)e.oninput=()=>{fn(e.value); syncSelectedBuildingLive(b);};};
    bind('selName',v=>{b.name=v; renameAttachedHakoFileForBuilding(b);}); bind('selCat',v=>b.category=v); bind('selColor',v=>b.color=v); bind('selRot',v=>b.rotationDeg=parseFloat(v)||0); bind('sel3dHeight',v=>b.plannerHeightMm=Math.max(.1,parseFloat(v)||.1)); bind('sel3dElevation',v=>b.baseElevationMm=parseFloat(v)||0); bind('selNotes',v=>b.notes=v);
    installAdaptiveDegreeStepping($('selRot'));
    const stateSel=$('selState'); if(stateSel){stateSel.value=b.state||'notStarted'; stateSel.onchange=e=>{b.state=e.target.value; syncAll();};}
    const selW=$('selW'), selD=$('selD');
    if(selW) selW.onchange=()=>applySelectedBuildingDimensionInput(b,'width',selW.value,selW);
    if(selD) selD.onchange=()=>applySelectedBuildingDimensionInput(b,'depth',selD.value,selD);
    const hakoInput=$('hakoFileInput');
    if(hakoInput) hakoInput.onchange=e=>{const f=e.target.files&&e.target.files[0]; if(f) attachHakoFileToSelectedBuilding(f,{source:'selected-building-picker'}); e.target.value='';};
    if($('downloadHakoB')) $('downloadHakoB').onclick=()=>{const text=hakoFileText(b); if(!text)return; downloadText(text, b.hakoFile?.fileName||`${slug(b.name)}.hako`, b.hakoFile?.mimeType||'application/json');};
    if($('openSelectedHakoB')) $('openSelectedHakoB').onclick=()=>openBuildingInHakoMachi(b);
    if($('copySeedB')) $('copySeedB').onclick=()=>copyHakoSeedForBuilding(b);
    const poly=$('polyB'); if(poly) poly.onclick=()=>{b.padType='polygon'; b.pointsPx=transformedRect(b); delete b.widthPx; delete b.depthPx; syncAll();};
  }

  function activeSidebarDetailKind(){
    return activeSidebarDetailKindForState(state,currentSelectedBuildingIds());
  }
  function activeSidebarDetailTitle(kind){
    return sidebarDetailTitle(kind);
  }
  function clearSidebarDetailSelection(){
    const returnType=sidebarTypeForDetailKind(activeSidebarDetailKind());
    if(returnType) setSidebarObjectType(returnType);
    closeSidebarBuildingOverflow();
    clearPlanObjectSelection();
    hideContextMenu();
    renderList();
    renderRoads();
    renderStreetlights();
    renderSelected();
    updateHandoff();
    draw();
  }
  function closeSidebarBuildingOverflow(){
    const menu=$('sidebarBuildingOverflowMenu');
    const wrap=$('sidebarOverflowWrap');
    const btn=$('sidebarOverflowBtn');
    menu?.classList.remove('open');
    wrap?.classList.remove('menuOpen');
    btn?.setAttribute('aria-expanded','false');
  }
  function bindSidebarBuildingOverflowActions(){
    const b=selected();
    if(!b) return;
    const input=$('hakoFileInput');
    const replace=$('sidebarReplaceHakoB');
    const remove=$('sidebarRemoveHakoB');
    const duplicate=$('sidebarDuplicateB');
    const hide=$('sidebarHideB');
    const lock=$('sidebarLockB');
    const del=$('sidebarDeleteB');
    if(replace) replace.onclick=()=>{closeSidebarBuildingOverflow(); input?.click();};
    if(remove){
      remove.disabled=!b.hakoFile;
      remove.onclick=()=>{
        closeSidebarBuildingOverflow();
        if(!b.hakoFile) return;
        if(!confirm('Remove the stored .hako file from this building?')) return;
        b.hakoFile=null;
        b.hakoFileId=null;
        b.hakoConfig=null;
        syncAll();
      };
    }
    if(duplicate) duplicate.onclick=()=>{closeSidebarBuildingOverflow(); duplicateBuildingFootprint(b);};
    if(hide) hide.onclick=()=>{closeSidebarBuildingOverflow(); b.hidden=!b.hidden; syncAll();};
    if(lock) lock.onclick=()=>{closeSidebarBuildingOverflow(); b.locked=!b.locked; syncAll();};
    if(del) del.onclick=()=>{
      closeSidebarBuildingOverflow();
      state.buildings=state.buildings.filter(x=>x.id!==b.id);
      clearBuildingSelection();
      syncAll();
    };
  }
  function bindSidebarDetailToolbarControls(kind){
    const toolbar=$('sidebarDetailToolbar');
    const back=$('sidebarBackBtn');
    if(back) back.onclick=clearSidebarDetailSelection;
    if(toolbar) hydrateIcons(toolbar);
    if(kind==='building'){
      const overflowBtn=$('sidebarOverflowBtn');
      const overflowMenu=$('sidebarBuildingOverflowMenu');
      const overflowWrap=$('sidebarOverflowWrap');
      if(overflowBtn && overflowMenu && overflowWrap){
        overflowBtn.onclick=e=>{
          e.preventDefault();
          e.stopPropagation();
          const open=!overflowMenu.classList.contains('open');
          closeSidebarBuildingOverflow();
          overflowMenu.classList.toggle('open',open);
          overflowWrap.classList.toggle('menuOpen',open);
          overflowBtn.setAttribute('aria-expanded',String(open));
        };
        overflowMenu.onclick=e=>e.stopPropagation();
        bindSidebarBuildingOverflowActions();
      }
    }
  }
  function applySidebarDrillIn(){
    const sidebar=document.querySelector('.sidebar');
    if(!sidebar) return;
    const sections=[...sidebar.children].filter(el=>el.classList&&el.classList.contains('section'));
    let detailSection=$('selectedPanel')?.closest('.section') || sections.find(sec=>sec.dataset.detailPanel==='true');
    if(!detailSection){
      detailSection=sections.find(sec=>{
        const h=sec.querySelector('h3');
        return h && h.textContent.trim()==='Selected Building';
      });
    }
    if(!detailSection) return;
    detailSection.dataset.detailPanel='true';
    const kind=activeSidebarDetailKind();
    const detailKey=kind ? `${kind}:${state.selectedId||state.selectedRoadId||state.selectedRoadFeatureId||state.selectedRoadIntersectionId||state.selectedTrackId||state.selectedTrackAccessoryId||state.selectedBenchworkId||state.selectedStreetlightId||state.selectedFabricId||state.selectedStlObjectId||state.selectedAnnotationId||state.selectedRailCrossingId||currentSelectedBuildingIds().join(',')}` : null;
    const h3=detailSection.querySelector('h3');
    const existingToolbars=[...sidebar.querySelectorAll('#sidebarDetailToolbar, .sidebarDetailToolbar')];
    let toolbar=existingToolbars[0] || null;
    existingToolbars.slice(1).forEach(el=>el.remove());
    if(kind){
      sections.forEach(sec=>{ sec.style.display = (sec===detailSection) ? '' : 'none'; });
      detailSection.classList.add('detailMode');
      if(h3) h3.textContent=activeSidebarDetailTitle(kind);
      if(!toolbar){
        toolbar=document.createElement('div');
        toolbar.id='sidebarDetailToolbar';
        toolbar.className='sidebarDetailToolbar';
      }
      toolbar.innerHTML=`
        <button id="sidebarBackBtn" type="button" class="sidebarBackBtn" aria-label="Back to lists"><span data-icon="arrowLeft"></span><span>Back</span></button>
        ${kind==='building'?`<div id="sidebarOverflowWrap" class="sidebarOverflowWrap">
          <button id="sidebarOverflowBtn" type="button" class="sidebarOverflowBtn" aria-label="Building actions" title="Building actions" aria-haspopup="true" aria-expanded="false"><span data-icon="moreVertical"></span></button>
          <div id="sidebarBuildingOverflowMenu" class="dropdownMenu right sidebarOverflowMenu" role="menu">
            <button id="sidebarReplaceHakoB" type="button">Replace .hako file</button>
            <button id="sidebarRemoveHakoB" type="button" class="danger" ${selected()?.hakoFile?'':'disabled'}>Remove .hako file</button>
            <div class="overflow-sep"></div>
            <button id="sidebarDuplicateB" type="button">Duplicate</button>
            <button id="sidebarHideB" type="button">${selected()?.hidden?'Show':'Hide'}</button>
            <button id="sidebarLockB" type="button">${selected()?.locked?'Unlock':'Lock'}</button>
            <div class="overflow-sep"></div>
            <button id="sidebarDeleteB" type="button" class="danger">Delete</button>
          </div>
        </div>`:''}`;
      if(toolbar.parentElement!==detailSection || toolbar.nextElementSibling!==h3){
        detailSection.insertBefore(toolbar, h3 || detailSection.firstChild);
      }
      const back=$('sidebarBackBtn');
      back.onclick=clearSidebarDetailSelection;
      if(detailKey && detailKey!==activeSidebarDetailKey){
        sidebar.scrollTop=0;
      }
      activeSidebarDetailKey=detailKey;
      bindSidebarDetailToolbarControls(kind);
      if(window.matchMedia && window.matchMedia('(max-width:900px)').matches && !state.sidebarOpen){
        setSidebarOpen(true);
      }
    } else {
      sections.forEach(sec=>{ sec.style.display=''; });
      detailSection.style.display='none';
      detailSection.classList.remove('detailMode');
      if(h3) h3.textContent='Selected Item';
      closeSidebarBuildingOverflow();
      if(toolbar) toolbar.remove();
      activeSidebarDetailKey=null;
    }
  }
  function renderSelected(){
    renderObjectBrowser();
    renderSelectedCore();
    applySidebarDrillIn();
  }

  function isNearSquare(w,h){const m=Math.max(w,h); return m>0 && Math.abs(w-h)/m<0.06;}
  function signedSquareCorner(start,end){const dx=end.x-start.x, dy=end.y-start.y; const side=Math.max(Math.abs(dx),Math.abs(dy),4); return {x:start.x+(dx<0?-side:side), y:start.y+(dy<0?-side:side)};}
  function addRectFromDrag(start,end,shift){
    let p2=end;
    let w=Math.abs(p2.x-start.x), h=Math.abs(p2.y-start.y);
    if(shift || isNearSquare(w,h)){p2=signedSquareCorner(start,end); w=Math.abs(p2.x-start.x); h=Math.abs(p2.y-start.y);}
    const b={id:uid('bldg'),name:`Building ${state.buildings.length+1}`,padType:'rect',x:(start.x+p2.x)/2,y:(start.y+p2.y)/2,widthPx:Math.max(4,w),depthPx:Math.max(4,h),rotationDeg:0,category:'industrial',color:colors[state.buildings.length%colors.length],hidden:false,locked:false,state:'notStarted',notes:'',hakoConfig:null,hakoFile:null,hakoFileId:null};
    syncBuildingMetrics(b); return b;
  }
  function resizeRectFromCorner(b, orig, cornerIndex, worldPoint, opts={}){
    const pts=transformedRect(orig);
    const anchor=pts[(cornerIndex+2)%4];
    const a=rad(orig.rotationDeg||0), ux={x:Math.cos(a),y:Math.sin(a)}, uy={x:-Math.sin(a),y:Math.cos(a)};
    const sx=[-1,1,1,-1][cornerIndex], sy=[-1,-1,1,1][cornerIndex];
    const dx=worldPoint.x-anchor.x, dy=worldPoint.y-anchor.y;
    let w=Math.max(4, sx*(dx*ux.x+dy*ux.y));
    let h=Math.max(4, sy*(dx*uy.x+dy*uy.y));
    if(opts.proportional){
      const ow=Math.max(4, Number(orig.widthPx)||w);
      const oh=Math.max(4, Number(orig.depthPx)||h);
      const scale=Math.max(w/ow,h/oh,4/ow,4/oh);
      w=ow*scale;
      h=oh*scale;
    }
    if(opts.square || (!opts.proportional && isNearSquare(w,h))){const side=Math.max(w,h); w=side; h=side;}
    const center={x:anchor.x + sx*ux.x*w/2 + sy*uy.x*h/2, y:anchor.y + sx*ux.y*w/2 + sy*uy.y*h/2};
    b.x=center.x; b.y=center.y; b.widthPx=w; b.depthPx=h; b.rotationDeg=orig.rotationDeg||0; syncBuildingMetrics(b);
  }
  function scalePolygonFromCornerDrag(b, orig, cornerIndex, worldPoint){
    const pts=orig.pointsPx||[];
    const source=pts[cornerIndex];
    if(!source || pts.length<3){b.pointsPx=pts.map(q=>({...q})); syncBuildingMetrics(b); return;}
    const center=polygonCenter(pts);
    const base=dist(source,center);
    if(!(base>.01)){b.pointsPx=pts.map(q=>({...q})); syncBuildingMetrics(b); return;}
    const scale=Math.max(.05,dist(worldPoint,center)/base);
    b.pointsPx=pts.map(q=>({x:center.x+(q.x-center.x)*scale,y:center.y+(q.y-center.y)*scale}));
    syncBuildingMetrics(b);
  }
  function snapAngle(a){const snaps=[-180,-165,-150,-135,-120,-105,-90,-75,-60,-45,-30,-15,0,15,30,45,60,75,90,105,120,135,150,165,180]; return snaps.reduce((best,x)=>Math.abs(x-a)<Math.abs(best-a)?x:best,0);}
  function snapAngleStep(a, step=45){
    const n=((a%360)+360)%360;
    let snapped=Math.round(n/step)*step;
    if(snapped>180) snapped-=360;
    if(snapped===180 && a<0) snapped=-180;
    return snapped;
  }
  function rotationSnapAngle(a,e){
    if(e && e.shiftKey) return snapAngleStep(a,45);
    if(state.snapOn) return snapAngle(a);
    return a;
  }
  function shiftScaleActive(e){return !!(e?.shiftKey || state.shiftKeyDown);}
  function snapActive(e){return !!(state.snapOn || (e && e.shiftKey));}
  function isGeometryPointer(e){
    if(state.workspaceMode==='track' && isTrackAccessoryAction(state.trackTask)) return true;
    if(state.inputMode==='penDrawFingerPan') return e.pointerType!=='touch';
    if(state.inputMode==='penOnly') return e.pointerType==='pen' || e.pointerType==='mouse';
    if(state.inputMode==='touchDraw') return true;
    if(state.inputMode==='mouseTrackpad') return e.pointerType==='mouse';
    return true;
  }
  function startPanFromPointer(e){state.drag={type:'pan',pointerId:e.pointerId,sx:e.clientX,sy:e.clientY,vx:state.view.x,vy:state.view.y};}
  function pointerSnapshot(e){return {id:e.pointerId,x:e.clientX,y:e.clientY,type:e.pointerType};}
  function activeTouchPointers(){return [...state.pointers.values()].filter(p=>p.type==='touch');}
  function startPinchIfNeeded(){
    const touches=activeTouchPointers();
    if(touches.length<2) return false;
    const a=touches[0], b=touches[1];
    const cx=(a.x+b.x)/2, cy=(a.y+b.y)/2;
    const r=canvas.getBoundingClientRect();
    const world={x:(cx-r.left-state.view.x)/state.view.scale,y:(cy-r.top-state.view.y)/state.view.scale};
    state.pinch={ids:[a.id,b.id],startDist:Math.hypot(a.x-b.x,a.y-b.y),startScale:state.view.scale,startView:{...state.view},center:{x:cx,y:cy},world};
    state.drag={type:'pinch'};
    return true;
  }
  function updatePinch(){
    if(!state.pinch) return false;
    const a=state.pointers.get(state.pinch.ids[0]), b=state.pointers.get(state.pinch.ids[1]);
    if(!a||!b) return false;
    const cx=(a.x+b.x)/2, cy=(a.y+b.y)/2;
    const d=Math.max(1,Math.hypot(a.x-b.x,a.y-b.y));
    state.view.scale=clamp(state.pinch.startScale*(d/Math.max(1,state.pinch.startDist)),.05,20);
    const r=canvas.getBoundingClientRect();
    state.view.x=(cx-r.left)-state.pinch.world.x*state.view.scale;
    state.view.y=(cy-r.top)-state.pinch.world.y*state.view.scale;
    return true;
  }

  function ensureSitePointerInteractionController(){
    if(!sitePointerInteractionController){
      sitePointerInteractionController=createSitePointerInteractionController({
        state,
        beginLongPress,
        hitTrackAccessoryRotationHandle,
        selectTrackAccessory,
        hitTrackAccessory,
        handleSiteObjectPointerHit,
        hitRoadFeature,
        hitGeneratedRailCrossing,
        selectRailCrossing,
        hitStreetlight,
        selectedRoad,
        hitRoadPoint,
        hitRoadOutlineSegment,
        hitRoadCenterlineSegment,
        hitGeneratedRoadIntersection,
        selectRoadIntersection,
        hitRoad,
        hitTrack,
        selectedTrack,
        hitTrackPoint,
        hitTrackSegment,
        hitStlObject,
        selectedBenchwork,
        hitBenchworkSegment,
        hitBenchwork,
        hitAnnotation,
        renderList,
        renderSelected,
        updateHandoff,
        draw,
        selected,
        handleAt,
        buildingCenter,
        hitTest,
        hitFabricRegion,
      });
    }
    return sitePointerInteractionController;
  }
  function startExistingObjectInteraction(e,p){
    return ensureSitePointerInteractionController().startExistingObjectInteraction(e,p);
  }

  canvas.addEventListener('pointerdown', e=>{
    e.preventDefault(); clearCanvasBrowserSelection(); hideContextMenu();
    canvas.setPointerCapture(e.pointerId);
    state.pointers.set(e.pointerId,pointerSnapshot(e));
    if(e.button===2 || (e.buttons & 2)){
      startPanFromPointer(e);
      state.drag.rightButtonPan=true;
      state.drag.moved=false;
      state.drag.startClient={x:e.clientX,y:e.clientY};
      state.suppressNextContextMenu=false;
      canvas.classList.add('panning');
      return;
    }
    if(e.pointerType==='touch' && startPinchIfNeeded()) return;
    const p=screenToWorld(e); const b=selected();
    if(state.githubBuildingPlacement && isGeometryPointer(e)){ placeGithubBuildingAt(p); return; }
    if(state.tool==='pan' || !isGeometryPointer(e)){startPanFromPointer(e); return;}
    if(state.tool==='road' && (state.roadMode==='manhole' || state.roadMode==='marking')){
      const crossingHit=hitGeneratedRailCrossing(p,e.pointerType);
      if(crossingHit){selectRailCrossing(crossingHit); return;}
      const featureHit=hitRoadFeature(p,e.pointerType);
      if(featureHit){handleSiteObjectPointerHit('roadFeature',featureHit,e,p); return;}
      if(placeRoadFeature(p,state.roadMode==='manhole'?'manhole':'marking')) return;
      return;
    }
    const groupRotateHit=hitGroupRotationHandle(p,e.pointerType);
    if(groupRotateHit){
      state.drag={
        type:'rotateSiteObjects',
        pointerId:e.pointerId,
        center:groupRotateHit.bounds.center,
        startAngle:Math.atan2(p.y-groupRotateHit.bounds.center.y,p.x-groupRotateHit.bounds.center.x),
        entries:groupRotateHit.entries
          .filter(entry=>entry.item&&!entry.item.locked)
          .map(entry=>({type:entry.type,orig:structuredClone(entry.item)})),
      };
      if(!state.drag.entries.length) state.drag=null;
      return;
    }
    if(state.workspaceMode==='track' && isCatenaryAutoSectionAction(state.trackTask)){
      handleCatenaryAutoTrackClick(p,e.pointerType);
      return;
    }
    if(state.workspaceMode==='track' && isTrackAccessoryAction(state.trackTask)){
      const rotateHit=hitTrackAccessoryRotationHandle(p,e.pointerType);
      if(rotateHit){selectTrackAccessory(rotateHit); state.drag={type:'rotateTrackAccessory',pointerId:e.pointerId,center:{x:rotateHit.x,y:rotateHit.y},startAngle:Math.atan2(p.y-rotateHit.y,p.x-rotateHit.x),origRotation:Number(rotateHit.rotationDeg)||0,orig:structuredClone(rotateHit)}; return;}
      const itemHit=hitTrackAccessory(p,e.pointerType);
      if(itemHit){handleSiteObjectPointerHit('trackAccessory',itemHit,e,p); return;}
      placeTrackAccessory(p,state.trackTask);
      return;
    }
    // Existing objects should remain editable regardless of the active drawing tool.
    // Drawing a new object only starts from empty canvas space. Active point-drafts
    // (polygon/road/benchwork) keep their click-to-add behavior until finished.
    if(startExistingObjectInteraction(e,p)) return;
    if(state.tool==='calibrate'||state.tool==='measure'){state.drag={type:state.tool,pointerId:e.pointerId,start:p,end:p}; return;}
    if(state.tool==='annotate'){startAnnotationStroke(e,p); return;}
    if(state.tool==='benchwork'){
      const selectedBenchCurveHit=state.selectedBenchworkId && !state.benchworkDraft.length ? hitBenchworkSegment(p, selectedBenchwork(), e.pointerType) : null;
      if(selectedBenchCurveHit){
        const bw=selectedBenchwork();
        if(bw && !bw.locked){ state.drag={type:'benchworkCurve',pointerId:e.pointerId,start:p,orig:structuredClone(bw),segmentIndex:selectedBenchCurveHit.index}; }
        return;
      }
      const existingBenchHit=!state.benchworkDraft.length ? hitBenchwork(p,e.pointerType) : null;
      if(existingBenchHit){
        clearBuildingSelection(); state.selectedRoadId=null; state.selectedStreetlightId=null; state.selectedAnnotationId=null; state.selectedBenchworkId=existingBenchHit.id;
        renderRoads(); renderList(); renderStreetlights(); renderSelected(); draw();
        if(!existingBenchHit.locked) state.drag={type:'moveBenchwork',pointerId:e.pointerId,start:p,orig:structuredClone(existingBenchHit)};
        return;
      }
      if(state.benchworkDraft.length && dist(p,state.benchworkDraft[0])<18/state.view.scale && state.benchworkDraft.length>=3){finishBenchworkOutline();}
      else state.benchworkDraft.push(p);
      draw(); return;
    }
    if(state.tool==='road'){
      const existingRoadHit=hitRoad(p,e.pointerType);
      // Point handles must win over segment curve handles. Otherwise clicking an endpoint
      // can be interpreted as grabbing the adjacent segment and forcing a bend.
      const selectedRoadForEdit=state.selectedRoadId ? selectedRoad() : null;
      const outlineEditing=selectedRoadForEdit && selectedRoadForEdit.mode==='outline' && state.roadOutlineEditId===selectedRoadForEdit.id;
      const selectedPointHit=selectedRoadForEdit && (selectedRoadForEdit.mode!=='outline' || outlineEditing) ? hitRoadPoint(p, selectedRoadForEdit, e.pointerType) : null;
      if(selectedPointHit){
        const r=selectedRoadForEdit;
        if(r && !r.locked){ state.drag={type:'roadPoint',pointerId:e.pointerId,start:p,orig:structuredClone(r),pointIndex:selectedPointHit.index}; }
        return;
      }
      const selectedCurveHit=selectedRoadForEdit ? (selectedRoadForEdit.mode==='outline' ? (outlineEditing ? hitRoadOutlineSegment(p, selectedRoadForEdit, e.pointerType) : null) : hitRoadCenterlineSegment(p, selectedRoadForEdit, e.pointerType)) : null;
      if(selectedCurveHit){
        const r=selectedRoadForEdit;
        if(r && !r.locked){ state.drag={type:'roadCurve',pointerId:e.pointerId,start:p,orig:structuredClone(r),segmentIndex:selectedCurveHit.index}; }
        return;
      }
      if(existingRoadHit){
        state.selectedRoadId=existingRoadHit.id;
        if(existingRoadHit.mode!=='outline') state.roadOutlineEditId=null;
        clearBuildingSelection();
        state.selectedStreetlightId=null;
        state.selectedAnnotationId=null;
        renderRoads(); renderList(); renderStreetlights(); renderSelected(); draw();
        if(!existingRoadHit.locked) state.drag={type:'moveRoad',pointerId:e.pointerId,start:p,orig:structuredClone(existingRoadHit)};
        return;
      }
      if(state.roadMode==='centerline'){
        const snap=snapRoadPointForConnection(p,null,e.pointerType);
        const np=snap.connection ? snap : {x:p.x,y:p.y};
        if(state.roadDraft.length && dist(np,state.roadDraft[state.roadDraft.length-1])<8/state.view.scale && state.roadDraft.length>=2){ finishRoadCenterline(); }
        else { state.roadDraft.push({x:np.x,y:np.y}); draw(); }
        return;
      }
      if(state.roadMode==='outline'){
        if(state.roadDraft.length && dist(p,state.roadDraft[0])<18/state.view.scale && state.roadDraft.length>=3){finishRoadOutline();}
        else state.roadDraft.push(p);
        draw(); return;
      }
    }
    if(state.tool==='track'){
      if(!state.trackDraft.length){
        const continuationSnap=snapTrackPointForConnection(p,null,e.pointerType);
        if(continuationSnap.connection && (continuationSnap.connection.kind==='endpointStart' || continuationSnap.connection.kind==='endpointEnd')){
          beginTrackContinuationFromSnap(continuationSnap);
          return;
        }
      }
      const selectedTrackForEdit=state.selectedTrackId ? selectedTrack() : null;
      const selectedTrackPoint=selectedTrackForEdit ? hitTrackPoint(p, selectedTrackForEdit, e.pointerType) : null;
      if(selectedTrackPoint){
        const t=selectedTrackForEdit;
        state.selectedTrackPointIndex=selectedTrackPoint.index;
        renderSelected();
        if(t&&!t.locked){ state.drag={type:'trackPoint',pointerId:e.pointerId,start:p,orig:structuredClone(t),pointIndex:selectedTrackPoint.index}; }
        return;
      }
      const selectedTrackCurve=selectedTrackForEdit ? hitTrackSegment(p, selectedTrackForEdit, e.pointerType) : null;
      if(selectedTrackCurve){
        const t=selectedTrackForEdit;
        if(t&&!t.locked){ state.drag={type:'trackCurve',pointerId:e.pointerId,start:p,orig:structuredClone(t),segmentIndex:selectedTrackCurve.index}; }
        return;
      }
      const snap=snapTrackPointForConnection(p,state.trackDraftExtension?.trackId||null,e.pointerType);
      const np=snap.connection ? snap : {x:p.x,y:p.y,connection:null};
      if(state.trackDraft.length && dist(np,state.trackDraft[state.trackDraft.length-1])<8/state.view.scale && state.trackDraft.length>=2){ finishTrack(); }
      else {
        state.trackDraft.push({x:np.x,y:np.y});
        state.trackDraftConnections=state.trackDraftConnections||[];
        state.trackDraftConnections[state.trackDraft.length-1]={connection:np.connection};
      }
      draw(); return;
    }
    if(state.tool==='fabric'){
      if(state.fabricDraft.length && dist(p,state.fabricDraft[0])<18/state.view.scale && state.fabricDraft.length>=3){finishFabricRegion();}
      else state.fabricDraft.push(p);
      draw(); return;
    }
    if(state.tool==='streetlight'){placeStreetlight(p); return;}
    if(state.tool==='rect'){state.drag={type:'rect',pointerId:e.pointerId,start:p,end:p,preview:null}; return;}
    if(state.tool==='fabric'){
      if(e.key==='Enter' && state.fabricDraft.length>=3){e.preventDefault(); finishFabricRegion(); return;}
      if(e.key==='Backspace' && state.fabricDraft.length){e.preventDefault(); state.fabricDraft.pop(); draw(); return;}
    }
    if(state.tool==='polygon'){
      if(state.polygonDraft.length && dist(p,state.polygonDraft[0])<18/state.view.scale && state.polygonDraft.length>=3){finishPolygon();}
      else state.polygonDraft.push(p);
      draw(); return;
    }
    if(state.tool==='select'){
      beginLongPress(e,p);
      const rotateHit=hitTrackAccessoryRotationHandle(p,e.pointerType);
      if(rotateHit){selectTrackAccessory(rotateHit); state.drag={type:'rotateTrackAccessory',pointerId:e.pointerId,center:{x:rotateHit.x,y:rotateHit.y},startAngle:Math.atan2(p.y-rotateHit.y,p.x-rotateHit.x),origRotation:Number(rotateHit.rotationDeg)||0,orig:structuredClone(rotateHit)}; return;}
      const itemHit=hitTrackAccessory(p,e.pointerType);
      if(itemHit){handleSiteObjectPointerHit('trackAccessory',itemHit,e,p); return;}
      const lightHit=hitStreetlight(p,e.pointerType);
      if(lightHit){handleSiteObjectPointerHit('streetlight',lightHit,e,p); return;}
      const benchCurveHit=state.selectedBenchworkId ? hitBenchworkSegment(p, selectedBenchwork(), e.pointerType) : null;
      if(benchCurveHit){ const bw=selectedBenchwork(); if(bw&&!bw.locked){ state.drag={type:'benchworkCurve',pointerId:e.pointerId,start:p,orig:structuredClone(bw),segmentIndex:benchCurveHit.index}; return; } }
      const benchHit=hitBenchwork(p,e.pointerType);
      if(benchHit){handleSiteObjectPointerHit('benchwork',benchHit,e,p); return;}
      const selectRoadForEdit=state.selectedRoadId ? selectedRoad() : null;
      const selectOutlineEditing=selectRoadForEdit && selectRoadForEdit.mode==='outline' && state.roadOutlineEditId===selectRoadForEdit.id;
      const roadPointHit=selectRoadForEdit && (selectRoadForEdit.mode!=='outline' || selectOutlineEditing) ? hitRoadPoint(p, selectRoadForEdit, e.pointerType) : null;
      if(roadPointHit){ const r=selectRoadForEdit; if(r&&!r.locked){ state.drag={type:'roadPoint',pointerId:e.pointerId,start:p,orig:structuredClone(r),pointIndex:roadPointHit.index}; return; } }
      const roadCurveHit=selectRoadForEdit ? (selectRoadForEdit.mode==='outline' ? (selectOutlineEditing ? hitRoadOutlineSegment(p, selectRoadForEdit, e.pointerType) : null) : hitRoadCenterlineSegment(p, selectRoadForEdit, e.pointerType)) : null;
      if(roadCurveHit){ const r=selectRoadForEdit; if(r&&!r.locked){ state.drag={type:'roadCurve',pointerId:e.pointerId,start:p,orig:structuredClone(r),segmentIndex:roadCurveHit.index}; return; } }
      const roadHit=hitRoad(p,e.pointerType);
      if(roadHit){if(roadHit.mode!=='outline') state.roadOutlineEditId=null; handleSiteObjectPointerHit('road',roadHit,e,p); return;}
      const trackHit=hitTrack(p,e.pointerType);
      const selectTrackForEdit=state.selectedTrackId ? selectedTrack() : null;
      const trackPointHit=selectTrackForEdit ? hitTrackPoint(p, selectTrackForEdit, e.pointerType) : null;
      if(trackPointHit){ const t=selectTrackForEdit; state.selectedTrackPointIndex=trackPointHit.index; renderSelected(); if(t&&!t.locked){ state.drag={type:'trackPoint',pointerId:e.pointerId,start:p,orig:structuredClone(t),pointIndex:trackPointHit.index}; } return; }
      const trackCurveHit=selectTrackForEdit ? hitTrackSegment(p, selectTrackForEdit, e.pointerType) : null;
      if(trackCurveHit){ const t=selectTrackForEdit; if(t&&!t.locked){ state.drag={type:'trackCurve',pointerId:e.pointerId,start:p,orig:structuredClone(t),segmentIndex:trackCurveHit.index}; return; } }
      if(trackHit){handleSiteObjectPointerHit('track',trackHit,e,p); return;}
      const stlHit=hitStlObject(p,e.pointerType);
      if(stlHit){handleSiteObjectPointerHit('stlObject',stlHit,e,p); return;}
      const note=hitAnnotation(p,e.pointerType);
      if(note){
        state.selectedAnnotationId=note.id;
        state.selectedId=null; state.selectedStlObjectId=null; state.selectedStreetlightId=null; state.selectedFabricId=null;
        renderList(); renderSelected(); updateHandoff(); draw();
        return;
      }
      const h=handleAt(p,b,e.pointerType);
      if(h){
        const drag={type:h.type,pointerId:e.pointerId,index:h.index,start:p,orig:structuredClone(b)};
        if(h.type==='rotate'){
          drag.center=buildingCenter(b);
          drag.startAngle=Math.atan2(p.y-drag.center.y,p.x-drag.center.x);
          drag.origRotation=Number(b.rotationDeg)||0;
        }
        state.drag=drag;
        return;
      }
      const hit=hitTest(p,e.pointerType);
      if(hit){
        handleSiteObjectPointerHit('building',hit,e,p);
      }
      else if(handleSiteObjectPointerHit('fabric',hitFabricRegion(p),e,p)){
        return;
      }
      else {
        state.drag={type:'marquee',pointerId:e.pointerId,start:p,end:p,additive:!!(e.shiftKey||e.metaKey||e.ctrlKey),baseIds:currentSelectedBuildingIds()};
      }
      draw();
    }
  }, {passive:false});
  canvas.addEventListener('pointermove', e=>{
    if(state.pointers.has(e.pointerId)) state.pointers.set(e.pointerId,pointerSnapshot(e));
    moveCancelsLongPress(e);
    const p=screenToWorld(e); $('statusMouse').textContent=state.pxPerMm?`Pointer: ${fmt(pxToMm(p.x))}, ${fmt(pxToMm(p.y))} mm (${e.pointerType})`:`Pointer: ${fmt(p.x)}, ${fmt(p.y)} px (${e.pointerType})`;
    if(state.drag?.type==='pinch'){e.preventDefault(); updatePinch(); draw(); return;}
    if(!state.drag){
      if(state.githubBuildingPlacement){
        state.githubBuildingPlacement.previewPoint=p;
        state.hoverPreview=null;
        draw();
        return;
      }
      const hoverL=hitStreetlight(p,e.pointerType);
      state.hoverStreetlightId=hoverL ? hoverL.id : null;
      const hoverSelectedRoad=(state.selectedRoadId && !hoverL) ? selectedRoad() : null;
      const hoverCurve=hoverSelectedRoad ? (hoverSelectedRoad.mode==='outline' ? (state.roadOutlineEditId===hoverSelectedRoad.id ? hitRoadOutlineSegment(p, hoverSelectedRoad, e.pointerType) : null) : hitRoadCenterlineSegment(p, hoverSelectedRoad, e.pointerType)) : null;
      state.hoverRoadSegment=hoverCurve?{roadId:state.selectedRoadId,index:hoverCurve.index}:null;
      const hoverBenchCurve=(state.selectedBenchworkId && !hoverL && !hoverCurve) ? hitBenchworkSegment(p, selectedBenchwork(), e.pointerType) : null;
      state.hoverBenchworkSegment=hoverBenchCurve?{benchworkId:state.selectedBenchworkId,index:hoverBenchCurve.index}:null;
      const hoverBW=(hoverL||hoverCurve||hoverBenchCurve) ? (hoverBenchCurve?selectedBenchwork():null) : hitBenchwork(p);
      state.hoverBenchworkId=hoverBW ? hoverBW.id : null;
      const hoverR=(hoverL||hoverBW) ? null : hitRoad(p);
      state.hoverRoadId=hoverR ? hoverR.id : (hoverCurve?state.selectedRoadId:null);
      const hoverItem=(hoverL||hoverBW||hoverR) ? null : hitTrackAccessory(p,e.pointerType);
      state.hoverTrackAccessoryId=hoverItem ? hoverItem.id : null;
      const hoverT=(hoverL||hoverBW||hoverR||hoverItem) ? null : hitTrack(p,e.pointerType);
      state.hoverTrackId=hoverT ? hoverT.id : null;
      const hoverSelectedTrack=state.selectedTrackId && !hoverL && !hoverBW && !hoverR ? selectedTrack() : null;
      const hoverTrackCurve=hoverSelectedTrack ? hitTrackSegment(p, hoverSelectedTrack, e.pointerType) : null;
      state.hoverTrackSegment=hoverTrackCurve?{trackId:state.selectedTrackId,index:hoverTrackCurve.index}:null;
      const hoverStl=(hoverL||hoverBW||hoverR||hoverItem||hoverT) ? null : hitStlObject(p,e.pointerType);
      state.hoverStlObjectId=hoverStl ? hoverStl.id : null;
      const hoverB=(hoverL||hoverBW||hoverR||hoverItem||hoverT||hoverStl) ? null : hitTest(p);
      state.hoverBuildingId=hoverB ? hoverB.id : null;
      if(e.pointerType==='pen' && e.buttons===0){
        const hb=selected()||hoverB, hh=hb?handleAt(p,hb,e.pointerType):null;
        state.hoverPreview={point:p,kind:hh?'handle':'cursor',label:hh?hh.type.replace(/([A-Z])/g,' $1'):'Pencil'};
      } else if(e.pointerType!=='pen') state.hoverPreview=null;
      draw(); return;
    }
    if(state.drag.pointerId!==undefined && state.drag.pointerId!==e.pointerId) return;
    e.preventDefault();
    const d=state.drag;
    if(d.type==='pan'){
      state.view.x=d.vx+(e.clientX-d.sx);
      state.view.y=d.vy+(e.clientY-d.sy);
      if(d.rightButtonPan && d.startClient && Math.hypot(e.clientX-d.startClient.x,e.clientY-d.startClient.y)>3){
        d.moved=true;
        state.suppressNextContextMenu=true;
      }
    }
    else if(d.type==='calibrate'){state.calibrationLine={x1:d.start.x,y1:d.start.y,x2:p.x,y2:p.y}; state.lastCalibrationLine=state.calibrationLine;}
    else if(d.type==='measure'){state.measureLine={x1:d.start.x,y1:d.start.y,x2:p.x,y2:p.y};}
    else if(d.type==='rect'){d.end=p; d.preview=addRectFromDrag(d.start,p,snapActive(e));}
    else if(d.type==='roadCenterline'){d.end=p; d.preview=createRoadCenterline(d.start,p);}
    else if(d.type==='annotate'){addAnnotationPoint(e,p);}
    else if(d.type==='moveSiteObjects'||d.type==='moveSiteObject'){const dx=p.x-d.start.x,dy=p.y-d.start.y; (d.entries||[]).forEach(entry=>applySiteObjectMoveFromOrig(entry.type,entry.orig,dx,dy,entry.dragOrigin?p:null,entry.snapSourceEndpoint)); (d.entries||[]).forEach(entry=>finalizeMovedSiteObject(entry.type,entry.orig));}
    else if(d.type==='rotateSiteObjects'){const angleDelta=rotationSnapAngle(deg(Math.atan2(p.y-d.center.y,p.x-d.center.x)-(d.startAngle||0)),e); (d.entries||[]).forEach(entry=>applySiteObjectRotationFromOrig(entry.type,entry.orig,d.center,angleDelta)); (d.entries||[]).forEach(entry=>finalizeMovedSiteObject(entry.type,entry.orig));}
    else if(d.type==='moveStreetlight'){const l=state.streetlights.find(x=>x.id===d.orig.id); const dx=p.x-d.start.x,dy=p.y-d.start.y; if(l&&!l.locked){l.x=d.orig.x+dx; l.y=d.orig.y+dy;}}
    else if(d.type==='moveTrackAccessory'){const item=(state.trackAccessories||[]).find(x=>x.id===d.orig.id); const dx=p.x-d.start.x,dy=p.y-d.start.y; if(item&&!item.locked){item.x=d.orig.x+dx; item.y=d.orig.y+dy; if(Number.isFinite(Number(d.orig.rotationDeg))) item.rotationDeg=Number(d.orig.rotationDeg); if(isTrackSwitchAccessoryKind(item.kind)){if(!snapTrackSwitchToEndpoint(item,p)){item.trackAnchor=null; item.trackId=null; normalizeTrackAccessory(item); syncTracksConnectedToTrackSwitch(item);}} else {const anchor=nearestTrackAccessoryAnchor({x:item.x,y:item.y}); if(anchor && anchor.distance<=trackAccessorySnapDistance()){if(isCatenaryAccessoryKind(item.kind)) attachTrackAccessoryToAnchor(item,anchor); else item.trackId=anchor.trackId;} else if(isCatenaryAccessoryKind(item.kind)){item.trackId=null; item.trackAnchor=null; item.autoOrientToTrack=false;} normalizeTrackAccessory(item);}}}
    else if(d.type==='rotateTrackAccessory'){const item=(state.trackAccessories||[]).find(x=>x.id===d.orig.id); if(item&&!item.locked){const angleDelta=deg(Math.atan2(p.y-d.center.y,p.x-d.center.x)-(d.startAngle||0)); item.rotationDeg=(Number(d.origRotation)||0)+angleDelta; if(isCatenaryAccessoryKind(item.kind)){item.autoOrientToTrack=false; item.trackAnchor=null;} normalizeTrackAccessory(item); if(isTrackSwitchAccessoryKind(item.kind)) syncTracksConnectedToTrackSwitch(item);}}
    else if(d.type==='moveStlObject'){const obj=(state.stlObjects||[]).find(x=>x.id===d.orig.id); const dx=p.x-d.start.x,dy=p.y-d.start.y; if(obj&&!obj.locked){obj.x=d.orig.x+dx; obj.y=d.orig.y+dy; normalizeStlObject(obj);}}
    else if(d.type==='moveBenchwork'){const bw=state.benchworkOutlines.find(x=>x.id===d.orig.id); const dx=p.x-d.start.x,dy=p.y-d.start.y; if(bw&&!bw.locked){bw.pointsPx=d.orig.pointsPx.map(q=>({x:q.x+dx,y:q.y+dy})); bw.curvesPx=(d.orig.curvesPx||[]).map(c=>c?{x:c.x+dx,y:c.y+dy}:null); normalizeBenchworkOutline(bw);}}
    else if(d.type==='benchworkCurve'){const bw=state.benchworkOutlines.find(x=>x.id===d.orig.id); if(bw&&!bw.locked){normalizeBenchworkOutline(bw); const i=d.segmentIndex; const a=bw.pointsPx[i], b=bw.pointsPx[(i+1)%bw.pointsPx.length]; if(a&&b){bw.curvesPx[i]={x:2*p.x-(a.x+b.x)/2,y:2*p.y-(a.y+b.y)/2}; normalizeBenchworkOutline(bw);}}}
    else if(d.type==='moveRoad'){const r=state.roads.find(x=>x.id===d.orig.id); const dx=p.x-d.start.x,dy=p.y-d.start.y; if(r&&!r.locked){r.pointsPx=d.orig.pointsPx.map(q=>({x:q.x+dx,y:q.y+dy})); r.curvesPx=(d.orig.curvesPx||[]).map(c=>c?{x:c.x+dx,y:c.y+dy}:null); syncRoadMetrics(r);}}
    else if(d.type==='moveTrack'){const t=(state.tracks||[]).find(x=>x.id===d.orig.id); const dx=p.x-d.start.x,dy=p.y-d.start.y; if(t&&!t.locked){t.pointsPx=d.orig.pointsPx.map(q=>({x:q.x+dx,y:q.y+dy})); t.curvesPx=(d.orig.curvesPx||[]).map(c=>c?{x:c.x+dx,y:c.y+dy}:null); syncTrackMetrics(t); syncTrackEndpointToSwitchConnection(t,0); syncTrackEndpointToSwitchConnection(t,t.pointsPx.length-1); syncConnectedTrackEndpoint(t,0,t.pointsPx[0]); syncConnectedTrackEndpoint(t,t.pointsPx.length-1,t.pointsPx[t.pointsPx.length-1]);}}
    else if(d.type==='trackPoint'){
      const t=(state.tracks||[]).find(x=>x.id===d.orig.id);
      if(t&&!t.locked){
        const dx=p.x-d.start.x, dy=p.y-d.start.y, i=d.pointIndex;
        let target={x:d.orig.pointsPx[i].x+dx,y:d.orig.pointsPx[i].y+dy};
        const isEndpoint=i===0 || i===(d.orig.pointsPx.length-1);
        const snap=isEndpoint ? snapTrackPointForConnection(target,t.id,e.pointerType) : {x:target.x,y:target.y,connection:null};
        if(isEndpoint && snap.connection) target={x:snap.x,y:snap.y};
        moveTrackPointWithAdjacentCurves(t,i,target);
        if(isEndpoint) setTrackEndpointConnection(t,i,snap);
        if(isEndpoint && !syncTrackEndpointToSwitchConnection(t,i)) syncConnectedTrackEndpoint(t,i,target);
      }
    }
    else if(d.type==='roadPoint'){
      const r=state.roads.find(x=>x.id===d.orig.id);
      if(r&&!r.locked){
        const dx=p.x-d.start.x, dy=p.y-d.start.y, i=d.pointIndex;
        let target={x:d.orig.pointsPx[i].x+dx,y:d.orig.pointsPx[i].y+dy};
        const isEndpoint = r.mode!=='outline' && (i===0 || i===(d.orig.pointsPx.length-1));
        const snap=isEndpoint ? snapRoadPointForConnection(target,r.id,e.pointerType) : {x:target.x,y:target.y,connection:null};
        if(isEndpoint && snap.connection) target={x:snap.x,y:snap.y};
        r.pointsPx=d.orig.pointsPx.map((q,idx)=>idx===i?{x:target.x,y:target.y}:{x:q.x,y:q.y});
        const adjDx=target.x-d.orig.pointsPx[i].x, adjDy=target.y-d.orig.pointsPx[i].y;
        const n=d.orig.pointsPx.length;
        r.curvesPx=(d.orig.curvesPx||[]).map((c,idx)=>{
          if(!c) return null;
          const adjacent = r.mode==='outline' ? (idx===i || idx===(i-1+n)%n) : (idx===i || idx===i-1);
          // Keep adjacent curved segment handles attached to the moved point so
          // existing curves do not snap/bulge unexpectedly while editing a point.
          return adjacent ? {x:c.x+adjDx,y:c.y+adjDy} : {x:c.x,y:c.y};
        });
        if(isEndpoint) setRoadEndpointConnection(r,i,snap);
        syncRoadMetrics(r);
      }
    }
    else if(d.type==='roadCurve'){
      const r=state.roads.find(x=>x.id===d.orig.id);
      if(r&&!r.locked){
        normalizeRoad(r);
        const i=d.segmentIndex;
        const a=r.pointsPx[i], b=r.mode==='outline'?r.pointsPx[(i+1)%r.pointsPx.length]:r.pointsPx[i+1];
        if(a&&b){r.curvesPx[i]={x:2*p.x-(a.x+b.x)/2,y:2*p.y-(a.y+b.y)/2}; syncRoadMetrics(r);}
      }
    }
    else if(d.type==='trackCurve'){
      const t=(state.tracks||[]).find(x=>x.id===d.orig.id);
      if(t&&!t.locked){
        normalizeTrackCurves(t);
        const i=d.segmentIndex;
        const a=t.pointsPx[i], b=t.pointsPx[i+1];
        if(a&&b){t.curvesPx[i]={x:2*p.x-(a.x+b.x)/2,y:2*p.y-(a.y+b.y)/2}; syncTrackMetrics(t);}
      }
    }
    else if(d.type==='marquee'){d.end=p;}
    else if(d.type==='moveMany'){const dx=p.x-d.start.x,dy=p.y-d.start.y; (d.origs||[]).forEach(orig=>{const b=state.buildings.find(x=>x.id===orig.id); if(b&&!b.locked){if(b.padType==='rect'){b.x=orig.x+dx; b.y=orig.y+dy;} else b.pointsPx=orig.pointsPx.map(q=>({x:q.x+dx,y:q.y+dy})); syncBuildingMetrics(b);}});}
    else if(d.type==='move'){const b=state.buildings.find(x=>x.id===d.orig.id); const dx=p.x-d.start.x,dy=p.y-d.start.y; if(b&&!b.locked){if(b.padType==='rect'){b.x=d.orig.x+dx; b.y=d.orig.y+dy;} else b.pointsPx=d.orig.pointsPx.map(q=>({x:q.x+dx,y:q.y+dy})); syncBuildingMetrics(b);}}
    else if(d.type==='polyPoint'){const b=selected(); if(b&&!b.locked){if(shiftScaleActive(e)) scalePolygonFromCornerDrag(b,d.orig,d.index,p); else {b.pointsPx[d.index]=p; syncBuildingMetrics(b);}}}
    else if(d.type==='rectCorner'){const b=selected(), o=d.orig; if(b&&!b.locked){resizeRectFromCorner(b,o,d.index,p,{proportional:shiftScaleActive(e),square:!!state.snapOn});}}
    else if(d.type==='rotate'){
      const b=selected();
      if(b&&!b.locked){
        const c=d.center||buildingCenter(b);
        const delta=deg(Math.atan2(p.y-c.y,p.x-c.x)-(d.startAngle||0));
        let next=(d.origRotation||0)+delta;
        next=rotationSnapAngle(next,e);
        if(b.padType==='rect'){
          b.rotationDeg=next;
        } else {
          const actualDelta=rad(next-(d.origRotation||0));
          const ca=Math.cos(actualDelta), sa=Math.sin(actualDelta);
          b.pointsPx=(d.orig.pointsPx||[]).map(q=>({x:c.x+(q.x-c.x)*ca-(q.y-c.y)*sa,y:c.y+(q.x-c.x)*sa+(q.y-c.y)*ca}));
          b.rotationDeg=next;
        }
        syncBuildingMetrics(b);
      }
    }
    draw();
  }, {passive:false});
  async function finishPointer(e){
    clearCanvasBrowserSelection();
    clearLongPress();
    state.pointers.delete(e.pointerId);
    if(state.drag?.type==='pinch'){state.pinch=null; state.drag=null; draw(); return;}
    if(!state.drag)return;
    if(state.drag.pointerId!==undefined && state.drag.pointerId!==e.pointerId) return;
    const d=state.drag;
    if(d.type==='rect'&&d.preview){state.buildings.push(d.preview); setBuildingSelection([d.preview.id], d.preview.id); renderList(); renderSelected(); updateHandoff();}
    if(d.type==='marquee'){const r=selectionRectFromPoints(d.start,d.end||d.start); if(Math.max(r.w,r.h)>5/state.view.scale){const hits=buildingsInSelectionRect(r); const ids=d.additive?[...new Set([...(d.baseIds||[]),...hits])]:hits; setBuildingSelection(ids, ids.length===1?ids[0]:null); setSelectedSiteObjects(ids.map(id=>({type:'building',id})));} else if(!d.additive){clearBuildingSelection(); clearSelectedSiteObjects(); state.selectedAnnotationId=null; state.selectedStreetlightId=null; state.selectedRoadId=null; state.selectedBenchworkId=null; state.selectedFabricId=null; state.selectedStlObjectId=null;} renderList(); renderSelected(); updateHandoff();}
    if(d.type==='roadCenterline'&&d.preview&&dist(d.start,d.end)>4){state.roads.push(d.preview); state.selectedRoadId=d.preview.id; clearBuildingSelection(); state.selectedStreetlightId=null; state.selectedBenchworkId=null; state.selectedAnnotationId=null; renderRoads(); renderSelected();}
    if(d.type==='pan' && d.rightButtonPan && d.moved){state.suppressNextContextMenu=true;}
    if(d.type==='rectCorner' || d.type==='polyPoint'){
      const b=selected();
      if(b && d.orig && buildingFootprintChanged(d.orig,b) && !await confirmProtectedBuildingResize(b,{before:d.orig,after:cloneSitePlannerValue(b)})){
        restoreBuildingSnapshot(b,d.orig);
        canvas.classList.remove('panning');
        state.drag=null;
        syncAll({skipDirty:true});
        return;
      }
    }
    canvas.classList.remove('panning');
    state.drag=null; syncAll();
  }
  canvas.addEventListener('pointerup', finishPointer);
  canvas.addEventListener('pointercancel', finishPointer);
  canvas.addEventListener('dblclick', e=>{
    const p=screenToWorld(e);
    const road=hitRoad(p,'mouse');
    if(road && road.mode==='outline'){
      e.preventDefault();
      state.selectedRoadId=road.id;
      state.roadOutlineEditId=road.id;
      clearBuildingSelection(); state.selectedStreetlightId=null; state.selectedBenchworkId=null; state.selectedAnnotationId=null;
      renderRoads(); renderList(); renderStreetlights(); renderSelected(); draw();
      return;
    }
    if(state.tool==='road' && state.roadMode==='centerline' && state.roadDraft.length>=2){ e.preventDefault(); finishRoadCenterline(); }
    if(state.tool==='road' && state.roadMode==='outline' && state.roadDraft.length>=3){ e.preventDefault(); finishRoadOutline(); }
    if(state.tool==='track' && state.trackDraft.length>=2){ e.preventDefault(); finishTrack(); }
  });
  canvas.addEventListener('contextmenu', e=>{
    e.preventDefault();
    if(state.suppressNextContextMenu){state.suppressNextContextMenu=false; hideContextMenu(); return;}
    hideContextMenu();
    showContextMenuForPointerEvent(e, screenToWorld(e));
  });
  installCanvasGestureBoundary({
    surface:wrap,
    canvas,
    stopGesturePropagation:true,
    shouldHandle:()=>state.viewMode!=='3d',
    onPinchWheel:(e,p)=>{ zoomCanvasAtClientPoint(p.x,p.y,e.deltaY); return true; },
    onGestureStart:()=>({startScale:state.view.scale}),
    onGestureChange:(e,p,gesture)=>setCanvasZoomAtClientPoint(p.x,p.y,gesture.startScale*(Number(e.scale)||1))
  });
  canvas.addEventListener('wheel', e=>{e.preventDefault(); zoomCanvasAtClientPoint(e.clientX,e.clientY,e.deltaY);},{passive:false});
  function deleteCurrentSelection(){
    if(state.selectedAnnotationId){ deleteSelectedAnnotation(); return true; }
    if(state.selectedRoadFeatureId){ deleteSelectedRoadFeature(); return true; }
    if(state.selectedStreetlightId){ deleteSelectedStreetlight(); return true; }
    if(state.selectedRoadId){ deleteSelectedRoad(); return true; }
    if(state.selectedTrackAccessoryId && !state.selectedId && !currentSelectedBuildingIds().length && !state.selectedRoadId && !state.selectedTrackId && !state.selectedRoadFeatureId && !state.selectedStreetlightId && !state.selectedBenchworkId && !state.selectedFabricId && !state.selectedStlObjectId && !state.selectedAnnotationId){ deleteSelectedTrackAccessory(); return true; }
    if(state.selectedTrackId && Number.isInteger(state.selectedTrackPointIndex)){ deleteSelectedTrackPoint(); return true; }
    if(state.selectedTrackId){ deleteSelectedTrack(); return true; }
    if(state.selectedStlObjectId){ deleteSelectedStlObject(); return true; }
    if(state.selectedBenchworkId){ deleteSelectedBenchwork(); return true; }
    if(state.selectedFabricId){ deleteSelectedFabricRegion(); return true; }
    const ids=currentSelectedBuildingIds();
    if(ids.length){
      state.buildings=state.buildings.filter(b=>!ids.includes(b.id));
      clearBuildingSelection();
      syncAll();
      return true;
    }
    return false;
  }
  window.addEventListener('keydown', e=>{
    if(e.key==='Shift') state.shiftKeyDown=true;
    const target=e.target;
    if(target && target.matches && target.matches('input,textarea,select,[contenteditable="true"]')) return;
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){
      e.preventDefault();
      if(e.shiftKey) redo(); else undo();
      return;
    }
    if((e.metaKey||e.ctrlKey)&&!e.shiftKey&&e.key.toLowerCase()==='y'){
      e.preventDefault();
      redo();
      return;
    }
    if((e.metaKey||e.ctrlKey)&&!e.shiftKey&&e.key.toLowerCase()==='c'){
      if(currentSelectedBuildingIds().length){e.preventDefault(); if(copySelectedFootprint()) state.objectClipboardType='footprint'; renderSelected();}
      else if(copySelectedSiteObject()){e.preventDefault(); renderSelected();}
      return;
    }
    if((e.metaKey||e.ctrlKey)&&!e.shiftKey&&e.key.toLowerCase()==='v'){
      if(state.objectClipboardType==='siteObject' && state.siteObjectClipboard){e.preventDefault(); pasteSiteObjectFromClipboard();}
      else if(state.footprintClipboard){e.preventDefault(); pasteFootprintFromClipboard();}
      return;
    }
    if(e.key==='Enter'&&state.tool==='polygon') finishPolygon();
    if(e.key==='Enter'&&state.tool==='benchwork') finishBenchworkOutline();
    if(e.key==='Enter'&&state.tool==='road'&&state.roadMode==='outline') finishRoadOutline();
    if(e.key==='Enter'&&state.tool==='road'&&state.roadMode==='centerline') finishRoadCenterline();
    if(e.key==='Enter'&&state.tool==='track') finishTrack();
    if(e.key==='Backspace'&&state.tool==='polygon'&&state.polygonDraft.length){state.polygonDraft.pop(); draw(); return;}
    if(e.key==='Backspace'&&state.tool==='benchwork'&&state.benchworkDraft.length){state.benchworkDraft.pop(); draw(); return;}
    if(e.key==='Backspace'&&state.tool==='track'&&state.trackDraft.length){state.trackDraft.pop(); state.trackDraftConnections?.pop?.(); if(!state.trackDraft.length) state.trackDraftExtension=null; draw(); return;}
    if(e.key==='Escape'){
      hideContextMenu();
      if(cancelGithubBuildingPlacement()){ e.preventDefault(); return; }
      state.hoverPreview=null;
      state.trackDraft=[];
      state.trackDraftConnections=[];
      state.trackDraftExtension=null;
      state.selectedAnnotationId=null;
      state.selectedFabricId=null;
      state.selectedStlObjectId=null;
      if(state.roadOutlineEditId) state.roadOutlineEditId=null;
      renderSelected();
      draw();
      return;
    }
    if(e.key==='Delete'||e.key==='Backspace'){
      if(deleteCurrentSelection()) e.preventDefault();
    }
  });
  window.addEventListener('keyup', e=>{
    if(e.key==='Shift' || !e.shiftKey) state.shiftKeyDown=false;
  });
  window.addEventListener('blur', ()=>{state.shiftKeyDown=false;});
  function finishPolygon(){if(state.polygonDraft.length<3) return; const b={id:uid('bldg'),name:`Building ${state.buildings.length+1}`,padType:'polygon',pointsPx:state.polygonDraft.slice(),rotationDeg:0,category:'industrial',color:colors[state.buildings.length%colors.length],hidden:false,locked:false,state:'notStarted',notes:'',hakoConfig:null,hakoFile:null,hakoFileId:null}; syncBuildingMetrics(b); state.buildings.push(b); setBuildingSelection([b.id], b.id); state.polygonDraft=[]; syncAll();}
  ({
    setActiveTool,
    setWorkspaceMode,
    updateWorkspaceModeUi,
  } = createWorkspaceModeController({
    state,
    getElement: $,
    finishRoadCenterline,
    finishRoadOutline,
    finishTrack,
    hideToolFlyouts,
    updateToolButtons: {
      updateTrackSwitchToolButton: () => updateTrackSwitchToolButton(),
      updateTrackBufferToolButton: () => updateTrackBufferToolButton(),
      updateCatenaryToolButton: () => updateCatenaryToolButton(),
    },
    updateStatus,
    draw,
    syncAll,
  }));
  document.querySelectorAll('.toolbtn[data-tool]:not([data-road-mode-tool]):not([data-track-action])').forEach(btn=>btn.onclick=()=>setActiveTool(btn.dataset.tool));
  $('workspaceMode')?.addEventListener('change', e=>setWorkspaceMode(e.target.value));
  document.querySelectorAll('[data-road-mode-tool]').forEach(btn=>btn.onclick=()=>{
    state.roadMode=btn.dataset.roadModeTool||'centerline';
    updateRoadToolButton();
    setWorkspaceMode('road', {preserveRoadTask: true});
    setActiveTool('road');
  });
  document.querySelectorAll('[data-road-action]').forEach(btn=>btn.onclick=()=>{
    const action=btn.dataset.roadAction;
    setWorkspaceMode('road', {preserveRoadTask: true});
    if(action==='intersections'){
      state.roadTask='intersections';
      state.roadIntersectionDetails=true;
      setActiveTool('select', {preserveRoadTask: true});
      roadSystem.generatedRoadIntersections();
      renderSelected();
      draw();
      setSidebarOpen(true);
      const hint=$('statusHint');
      if(hint) hint.textContent=state.selectedRoadId ? 'Intersection controls are open for the selected road.' : 'Select a road to adjust its automatic intersection markings.';
      updateWorkspaceModeUi();
      return;
    }
    if(action==='exportPreview'){
      state.roadTask='exportPreview';
      setRoadExportPreview(!state.roadExportPreview);
      updateWorkspaceModeUi();
      return;
    }
    if(action==='exportAssets'){
      openRoadExportReview();
    }
  });
  function beginTrackAccessoryPlacement(action){
    state.trackTask=action;
    state.catenarySectionDraft=null;
    setWorkspaceMode('track', {preserveTrackTask: true});
    setActiveTool('select', {preserveTrackTask: true});
    renderSelected();
    draw();
    if(window.matchMedia && window.matchMedia('(max-width: 700px)').matches) setSidebarOpen(false);
    else setSidebarOpen(true);
    const hint=$('statusHint');
    if(hint) hint.textContent=`${trackAccessoryLabel(action)} placement is active. Click near track to place a marker.`;
    updateWorkspaceModeUi();
  }
  function beginCatenaryAutoSection(){
    state.trackTask='catenaryAutoSection';
    state.catenarySectionDraft=null;
    setWorkspaceMode('track', {preserveTrackTask: true});
    setActiveTool('select', {preserveTrackTask: true});
    renderSelected();
    draw();
    if(window.matchMedia && window.matchMedia('(max-width: 700px)').matches) setSidebarOpen(false);
    else setSidebarOpen(true);
    const hint=$('statusHint');
    if(hint) hint.textContent=`Auto catenary section is active. Click the start and end points on one track; poles use ${fmt(CATENARY_SPACING_MODEL_MM)} mm spacing (${CATENARY_PROTOTYPE_SPACING_M} m prototype at Japanese N scale).`;
    updateWorkspaceModeUi();
  }
  document.querySelectorAll('[data-track-action]').forEach(btn=>btn.onclick=()=>{
    const action=btn.dataset.trackAction;
    setWorkspaceMode('track', {preserveTrackTask: true});
    if(action==='draw'){
      state.trackTask=null;
      setActiveTool('track');
      return;
    }
    if(action==='edit' || action==='connect'){
      state.trackTask=action;
      setActiveTool('select', {preserveTrackTask: true});
      renderSelected();
      draw();
      setSidebarOpen(true);
      const hint=$('statusHint');
      if(hint) hint.textContent=action==='connect'
        ? 'Endpoint connection editing is active. Select a track and drag an endpoint near another endpoint to snap them together.'
        : 'Track editing is active. Select a track, then drag points or bend a highlighted segment.';
      updateWorkspaceModeUi();
      return;
    }
    if(isTrackAccessoryAction(action)){
      beginTrackAccessoryPlacement(action);
      return;
    }
    if(isCatenaryAutoSectionAction(action)){
      beginCatenaryAutoSection();
      return;
    }
  });

  const toolVariantController = createToolVariantController({
    state,
    getElement: $,
    setIcon,
    hydrateIcons,
    toggleToolFlyout,
    hideToolFlyouts,
    setActiveTool,
    beginTrackAccessoryPlacement,
    beginCatenaryAutoSection,
    isCatenaryAutoSectionAction,
    updateWorkspaceModeUi,
  });
  ({
    updateRoadToolButton,
    updateStreetlightToolButton,
    updateTrackSwitchToolButton,
    updateTrackBufferToolButton,
    updateCatenaryToolButton,
  } = toolVariantController);
  toolVariantController.installToolVariantControls();
  installTooltips();
  async function loadReferenceImage(file){
    if(!file) return;
    openImportProgressModal('Import reference image','Reading image...',`Loading ${file.name||'reference image'}.`);
    setImageStatus(`Loading ${file.name}…`);
    const objectUrl=URL.createObjectURL(file);
    let dataUrl=null;
    try{
      const img=new Image();
      const loaded=new Promise((resolve,reject)=>{
        img.onload=()=>resolve();
        img.onerror=()=>reject(new Error('The browser could not decode this image. Try PNG, JPG, WEBP, or a simple SVG.'));
      });
      img.src=objectUrl;
      await loaded;
      setImportProgress(2,4,'Decoding image...','Preparing the reference layer for the canvas.');
      if(img.decode){
        try{ await img.decode(); } catch(_err){}
      }
      setImportProgress(3,4,'Embedding image data...','Preparing a portable copy when the browser allows it.');
      try{ dataUrl=await readFileAsDataURL(file); }
      catch(_err){ dataUrl=null; }
      state.image=img;
      state.imageMeta={
        name:file.name,
        mimeType:file.type || (dataUrl && (dataUrl.match(/^data:([^;]+);/)||[])[1]) || 'application/octet-stream',
        dataUrl:dataUrl,
        objectUrlUsed:true,
        naturalWidthPx:img.naturalWidth||img.width,
        naturalHeightPx:img.naturalHeight||img.height,
        opacity:state.imageOpacity,
        rotationDeg:0
      };
      resize();
      fitImage();
      syncAll();
      setImageStatus(`Loaded ${file.name} (${state.imageMeta.naturalWidthPx} × ${state.imageMeta.naturalHeightPx}px).`, 'okText');
      updateImagePortableStatus();
      updateEmptyImageOverlay();
      finishImportProgress('Reference image imported.',`${file.name||'Reference image'} is ready on the canvas.`);
      logger.info('Image loaded', state.imageMeta);
    }catch(err){
      logger.error('Image import failed', err);
      setImageStatus(err.message || 'Image import failed.', 'warning');
      failImportProgress('Image import failed.', err.message || 'The image could not be loaded.');
      URL.revokeObjectURL(objectUrl);
    }
  }
  $('imageFile').addEventListener('change', async e=>{
    const f=e.target.files && e.target.files[0];
    e.target.value='';
    await loadReferenceImage(f);
  });

  async function handleEmptyImageDrop(file){
    if(!file) return;
    if(!isSupportedImageFile(file)){
      failImportProgress('Unsupported image type.','Drop a PNG, JPG, SVG, or WEBP image here. Use Load for .hako-site package or .hako-site.json project files.');
      return;
    }
    await loadReferenceImage(file);
  }

  const emptyImageOverlay=$('emptyImageOverlay');
  const emptyImageCard=$('emptyImageCard');
  if(emptyImageOverlay){
    ['dragenter','dragover'].forEach(type=>emptyImageOverlay.addEventListener(type, e=>{
      if(pageHakoImportFileFromDataTransfer(e.dataTransfer)) return;
      if(!state.image){
        e.preventDefault();
        e.stopPropagation();
        emptyImageCard?.classList.add('dragOver');
      }
    }));
    ['dragleave','dragend'].forEach(type=>emptyImageOverlay.addEventListener(type, e=>{
      emptyImageCard?.classList.remove('dragOver');
    }));
    emptyImageOverlay.addEventListener('drop', async e=>{
      if(pageHakoImportFileFromDataTransfer(e.dataTransfer)) return;
      if(!state.image){
        e.preventDefault();
        e.stopPropagation();
        emptyImageCard?.classList.remove('dragOver');
        const file=e.dataTransfer?.files?.[0];
        await handleEmptyImageDrop(file);
      }
    });
  }
  updateEmptyImageOverlay();
  if($('opacity')) $('opacity').oninput=e=>{state.imageOpacity=parseFloat(e.target.value); if(state.imageMeta)state.imageMeta.opacity=state.imageOpacity; draw();};
  if($('imageLockBtn')) $('imageLockBtn').onclick=()=>{state.imageLocked=!state.imageLocked; $('imageLockBtn').textContent=state.imageLocked?'Locked':'Unlocked';};
  $('applyScaleBtn').onclick=()=>{
    const line=state.lastCalibrationLine||state.calibrationLine;
    if(!line) return showStatusHint('Draw a calibration line first.', 'warning');
    const known=modelKnownMm();
    const len=dist({x:line.x1,y:line.y1},{x:line.x2,y:line.y2});
    if(known<=0||len<=0) return showStatusHint('Calibration length must be greater than zero.', 'warning');
    const nextPxPerMm=len/known;
    if(state.pxPerMm && Math.abs(state.pxPerMm-nextPxPerMm)>1e-9){
      const ok=confirm('Change calibration?\n\nThis will update all real millimeter values derived from the image, including building dimensions, road widths, sidewalk widths, streetlight sizes, and exported coordinates. Pixel positions on the image will stay in place, but measured values will change.');
      if(!ok) return;
    }
    state.pxPerMm=nextPxPerMm;
    state.calibrationLine=line;
    syncAll();
  };
  $('clearScaleBtn').onclick=()=>{
    if(state.pxPerMm){
      const ok=confirm('Clear calibration?\n\nThis will remove calibrated millimeter measurements until you recalibrate. Existing image-space geometry will remain in place.');
      if(!ok) return;
    }
    state.pxPerMm=null;
    syncAll();
  };

  async function clearCacheAndReset(){
    const ok = confirm('Clear HakoMachi Site Planner cache and reset to the default blank state?\n\nThis clears the current in-memory project, the HakoMachi handoff seed, and planner-related browser storage. Download/save your .hako-site package first if you want to keep it.');
    if(!ok) return;
    try{
      const keysToRemove=[];
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i);
        if(key && /hakomachi|hakoMachi|sitePlanner|site-planner/i.test(key)) keysToRemove.push(key);
      }
      keysToRemove.forEach(key=>localStorage.removeItem(key));
      const sessionKeys=[];
      for(let i=0;i<sessionStorage.length;i++){
        const key=sessionStorage.key(i);
        if(key && /hakomachi|hakoMachi|sitePlanner|site-planner/i.test(key)) sessionKeys.push(key);
      }
      sessionKeys.forEach(key=>sessionStorage.removeItem(key));
      if('caches' in window){
        const cacheNames=await caches.keys();
        await Promise.all(cacheNames.filter(name=>/hakomachi|hakoMachi|sitePlanner|site-planner/i.test(name)).map(name=>caches.delete(name)));
      }
    }catch(err){
      logger.warn('Cache clearing was partially blocked:', err);
    }
    state.tool='select';
    state.image=null;
    state.imageMeta=null;
    state.imageOpacity=.75;
    state.imageLocked=true;
    state.view={x:40,y:40,scale:1};
    state.viewMode='2d';
    applySite3DSettings({});
    syncSite3DControls();
    wrap.classList.remove('view3d');
    document.querySelector('.sitePlannerApp')?.classList.remove('view3d');
    state.pxPerMm=null;
    state.calibrationLine=null;
    state.lastCalibrationLine=null;
    state.buildings=[];
    state.tracks=[];
    state.selectedTrackId=null;
    state.selectedTrackPointIndex=null;
    state.hoverTrackId=null;
    state.trackAccessories=[];
    state.selectedTrackAccessoryId=null;
    state.hoverTrackAccessoryId=null;
    state.trackDraft=[];
    state.trackDraftConnections=[];
    state.trackDraftExtension=null;
    state.selectedId=null;
    state.drag=null;
    state.hover=null;
    state.polygonDraft=[];
    state.measureLine=null;
    state.annotations=[];
    state.selectedAnnotationId=null;
    state.roadDrivingSide='left';
    state.selectedFabricId=null;
    state.streetlights=[];
    state.selectedStreetlightId=null;
    state.hoverStreetlightId=null;
    state.hoverPreview=null;
    clearLongPress(); hideContextMenu();
    state.projectName='hakomachi-site';
    state.inputMode='penDrawFingerPan';
    state.snapOn=false;
    state.pointers=new Map();
    state.pinch=null;
    if($('opacity')) $('opacity').value='0.75';
    if($('imageLockBtn')) $('imageLockBtn').textContent='Locked';
    updateImagePortableStatus();
    $('imageFile').value='';
    $('loadFile').value='';
    document.querySelectorAll('.toolbtn').forEach(b=>b.classList.toggle('active', b.dataset.tool==='select'));
    state.dirty=false;
    state.dirtySinceManualSave=false;
    state.autosaveRestored=false;
    rememberGithubSiteSource(null);
    resetHistory('reset');
    setImageStatus('Cache cleared. Planner reset to default blank state.', 'okText');
    syncAll({skipDirty:true});
    updateAutosaveStatus('Autosave: cleared');
  }

  installTopMenus({getElement:$, closeSidebarBuildingOverflow});
  function exportSelectedSeed(){
    const b=selected();
    if(!b) return showStatusHint('Select a building first.', 'warning');
    downloadText(JSON.stringify(makeSeed(b),null,2),`${slug(b.name)}-hakomachi-seed.json`,'application/json');
  }
  function openGithubSettings(){
    const settings=getGithubSettings();
    openGithubModal('GitHub data repository', `
      <div class="field"><label>Private data repo</label><input id="gdRepo" value="${escapeAttr(settings.repoFullName)}" placeholder="GeorgeHinch/hakomachi_savedata"><div class="small">Use owner/repo. The repo can be private.</div></div>
      <div class="field"><label>Branch</label><input id="gdBranch" value="${escapeAttr(settings.branch)}"></div>
      <div class="field"><label>Fine-grained token</label><input id="gdToken" type="password" value="${escapeAttr(settings.token)}"><div class="small">Stored only in this browser. Needs Contents read/write on the data repo.</div></div>
      <div class="field"><label>Footprint library path</label><input id="gdLibrary" value="${escapeAttr(settings.libraryPath)}"></div>
      <div class="field"><label>Site plan files directory</label><input id="gdSites" value="${escapeAttr(settings.sitePlansDir)}"></div>
    `, [
      {label:'Save settings', cls:'primary', onClick:()=>{
        setGithubSettings({
          repoFullName:$('gdRepo').value,
          branch:$('gdBranch').value,
          token:$('gdToken').value,
          libraryPath:$('gdLibrary').value,
          sitePlansDir:$('gdSites').value
        });
        setGithubStatus('Settings saved.');
      }},
      {label:'Datastore guide', onClick:()=>window.open('docs/github-datastore.md','_blank','noopener')},
      {label:'Close', onClick:closeGithubModal}
    ]);
  }
  function githubSiteSourceFromProject(project){
    const cloud=project?.hakomachiCloud;
    if(!cloud || cloud.kind!=='sitePlan' || !cloud.path) return null;
    return {
      id:cloud.id || slug(cloud.name || project.projectName || 'site-plan'),
      name:cloud.name || project.projectName || githubProjectName(project),
      path:cloud.path,
    };
  }
  function activeGithubSiteSource(){
    const current=getCurrentGithubSite();
    if(!current?.path || !current?.id || !current?.name) return null;
    return current;
  }
  function rememberGithubSiteSource(source){
    setCurrentGithubSite(source || null);
    updatePrimarySaveUi();
  }
  function updatePrimarySaveUi(){
    const source=activeGithubSiteSource();
    const label=source ? 'Save to GitHub' : 'Save .hako-site';
    const title=source
      ? `Save changes back to ${source.path}`
      : 'Download the current site plan as a .hako-site package.';
    ['saveBtn','mobileSaveBtn'].forEach(id=>{
      const btn=$(id);
      if(!btn) return;
      btn.textContent=label;
      btn.title=title;
      btn.dataset.saveSource=source ? 'github' : 'local-package';
    });
  }
  async function saveGithubImageAsset(settings, siteId, siteName){
    const dataUrl=state.imageMeta?.dataUrl;
    if(!dataUrl) return state.imageMeta?.asset || null;
    const info=dataUrlInfo(dataUrl);
    if(!info?.isBase64 || !info.data) return state.imageMeta?.asset || null;
    const path=githubImageAssetPath(settings, GITHUB_DEFAULT_SITE_DIR, siteId, state.imageMeta);
    const asset=imageAssetReference(path, state.imageMeta, dataUrl, state.image);
    setGithubProgress(2,8,'Writing reference image asset...',`Saving ${asset.name} outside the main site file.`);
    await writeGithubBase64File(settings, path, info.data, `Save HakoMachi site image asset: ${siteName}`);
    state.imageMeta.asset=asset;
    cacheImageAsset(asset, dataUrl);
    return asset;
  }
  async function saveGithubHakoAssets(settings, siteId, siteName){
    const usedNames=new Set();
    const hakoAssets=[];
    for(let i=0;i<state.buildings.length;i++){
      const b=normalizeBuilding(state.buildings[i],i);
      const text=hakoFileText(b);
      if(!b.hakoFile || !text) continue;
      const fileName=uniqueHakoAssetFileName(b, usedNames);
      const path=githubHakoAssetPath(settings, GITHUB_DEFAULT_SITE_DIR, siteId, fileName);
      const asset=hakoFileAssetReference(path, b, text);
      setGithubProgress(3,8,'Writing building files...',`Saving ${asset.name} (${i+1} of ${state.buildings.length}) outside the main site file.`);
      await writeGithubBase64File(settings, path, textToBase64(text), `Save HakoMachi building asset: ${siteName}`);
      b.hakoFile={...(b.hakoFile||{}),...asset,dataText:text,parsedConfig:b.hakoFile?.parsedConfig||b.hakoConfig||null,unavailable:false};
      b.hakoFileId=asset.path;
      hakoAssets.push({role:'building-hako',asset,text,buildingId:b.id});
    }
    if(!hakoAssets.length) setGithubProgress(3,8,'No building files to write.','The site plan does not currently include attached building .hako files.');
    return hakoAssets;
  }
  async function saveGithubStlAssets(settings, siteId, siteName){
    const usedModelNames=new Set();
    const usedSourceNames=new Set();
    const stlAssets=[];
    const stlObjects=state.stlObjects||[];
    for(let i=0;i<stlObjects.length;i++){
      const obj=normalizeStlObject(stlObjects[i]);
      const dataBase64=obj?.asset?.dataBase64;
      if(dataBase64){
        const fileName=uniqueStlAssetFileName(obj, usedModelNames);
        const path=githubStlAssetPath(settings, GITHUB_DEFAULT_SITE_DIR, siteId, fileName);
        const asset=stlAssetReference(path, obj, dataBase64);
        setGithubProgress(4,8,'Writing STL site objects...',`Saving ${asset.name} (${i+1} of ${stlObjects.length}) outside the main site file.`);
        await writeGithubBase64File(settings, path, dataBase64, `Save HakoMachi site STL asset: ${siteName}`);
        obj.asset={...(obj.asset||{}),...asset,dataBase64};
        stlAssets.push({role:'model',asset,dataBase64,objectId:obj.id});
      }
      for(const source of (obj.sourceAssets||[])){
        if(!source?.dataBase64) continue;
        const fileName=uniqueStlSourceAssetFileName(source, usedSourceNames);
        const path=githubStlSourceAssetPath(settings, GITHUB_DEFAULT_SITE_DIR, siteId, fileName);
        const asset=stlSourceAssetReference(path, obj, source, source.dataBase64);
        setGithubProgress(4,8,'Writing STL source files...',`Saving ${asset.name} (${i+1} of ${stlObjects.length}) outside the main site file.`);
        await writeGithubBase64File(settings, path, source.dataBase64, `Save HakoMachi site STL source asset: ${siteName}`);
        Object.assign(source, asset, {dataBase64:source.dataBase64});
        stlAssets.push({role:'source',asset,dataBase64:source.dataBase64,objectId:obj.id,sourceAssetId:source.id});
      }
    }
    if(!stlAssets.length) setGithubProgress(4,8,'No STL assets to write.','The site plan does not currently include embedded STL or source files.');
    return stlAssets;
  }
  async function resolveProjectImageFromGithub(project, settings){
    const asset=project?.image?.asset;
    if(!asset?.path || project.image?.dataUrl) return project;
    const cached=cachedImageAsset(asset);
    if(cached){
      project.image.dataUrl=cached;
      return project;
    }
    setGithubStatus('Loading referenced image asset...');
    try{
      const file=await readGithubBase64File(settings, asset.path);
      if(file?.contentBase64){
        project.image.dataUrl=dataUrlFromBase64(asset.mimeType, file.contentBase64);
        cacheImageAsset(asset, project.image.dataUrl);
      } else {
        project.image.assetLoadError='The referenced image asset was empty or unavailable.';
        setGithubStatus('Referenced image asset could not be loaded.');
      }
    }catch(err){
      project.image.assetLoadError=err?.message || 'The referenced image asset could not be loaded.';
      setGithubStatus('Referenced image asset could not be loaded.');
    }
    return project;
  }
  async function resolveProjectHakoAssetsFromGithub(project, settings){
    const buildings=Array.isArray(project?.buildings) ? project.buildings : [];
    for(const b of buildings){
      const asset=b?.hakoFile;
      if(!asset?.path || hakoFileText(b)) continue;
      setGithubStatus('Loading referenced building file...');
      const file=await readGithubBase64File(settings, asset.path);
      if(file?.contentBase64){
        const text=base64ToText(file.contentBase64);
        let parsed=null;
        try{ parsed=JSON.parse(text); }catch(_err){}
        b.hakoFile={...asset,dataText:text,parsedConfig:parsed,unavailable:false};
        if(parsed && !b.hakoConfig) b.hakoConfig=parsed;
      } else {
        b.hakoFile={...asset,unavailable:true};
      }
    }
    return project;
  }
  async function resolveProjectStlAssetsFromGithub(project, settings){
    const stlObjects=Array.isArray(project?.stlObjects) ? project.stlObjects : [];
    for(const obj of stlObjects){
      const asset=obj?.asset;
      if(asset?.path && !asset.dataBase64){
        setGithubStatus('Loading referenced STL asset...');
        const file=await readGithubBase64File(settings, asset.path);
        if(file?.contentBase64){
          obj.asset={...asset,dataBase64:file.contentBase64};
        } else {
          obj.asset={...asset,unavailable:true};
        }
      }
      for(const source of (Array.isArray(obj.sourceAssets) ? obj.sourceAssets : [])){
        if(!source?.path || source.dataBase64) continue;
        setGithubStatus('Loading referenced STL source asset...');
        const file=await readGithubBase64File(settings, source.path);
        if(file?.contentBase64){
          Object.assign(source,{dataBase64:file.contentBase64,unavailable:false});
        } else {
          Object.assign(source,{unavailable:true});
        }
      }
    }
    return project;
  }
  async function saveSitePlanToGithub(options={}){
    const diagnostics=createPersistenceDiagnostics('GitHub site save');
    try{
      const settings=getGithubSettings();
      try{requireGithubSettings(settings);}catch(err){openGithubSettings(); setGithubStatus(err.message); return;}
      const current=getCurrentGithubSite();
      const projectForName=projectJson({includeImageDataUrl:false});
      const defaultName=current?.name || githubProjectName(projectForName);
      const reuseCurrent=!!(options.reuseCurrent && current?.id && current?.name && current?.path);
      const name=reuseCurrent ? current.name : prompt('Site plan name for GitHub save', defaultName);
      if(!name) return;
      openGithubSaveProgressModal();
      setGithubProgress(1,8,'Preparing project...',reuseCurrent ? `Saving back to ${current.path}.` : 'Finalizing the site plan name and GitHub file path.');
      const id=reuseCurrent ? current.id : ((current && current.name===defaultName && current.id) ? current.id : slug(name));
      const path=reuseCurrent ? current.path : ((current && current.name===defaultName && current.path) ? current.path : githubData.cleanRepoPath(`${settings.sitePlansDir}/${id}.hako-site.json`));
      diagnostics.mark('save target selected', {name, path});
      const imageAsset=await diagnostics.measure('write image asset', () => saveGithubImageAsset(settings, id, name));
      if(!imageAsset) setGithubProgress(2,8,'No reference image asset to write.','The site plan does not currently use a background image.');
      const hakoAssets=await diagnostics.measure('write building assets', () => saveGithubHakoAssets(settings, id, name));
      const stlAssets=await diagnostics.measure('write STL assets', () => saveGithubStlAssets(settings, id, name));
      const project=projectJson({includeImageDataUrl:false, imageAsset, hakoAssets, stlAssets});
      const payloadText=JSON.stringify(project,null,2)+'\n';
      diagnostics.mark('site plan payload serialized', {
        ...summarizePersistenceAssets({imageAsset:imageAsset ? {asset:imageAsset} : null, hakoAssets, stlAssets, projectText:payloadText}),
      });
      project.projectName=name;
      project.hakomachiCloud={
        schema:'hakomachi.cloud-ref',
        schemaVersion:1,
        kind:'sitePlan',
        id,
        name,
        path,
        assetFolder:githubSiteAssetFolderPath(settings, GITHUB_DEFAULT_SITE_DIR, id),
        savedAt:new Date().toISOString()
      };
      setGithubProgress(5,8,'Writing site plan file...','Saving the current plan JSON with references to separate assets.');
      const projectText=JSON.stringify(project,null,2)+'\n';
      diagnostics.mark('cloud metadata attached', {projectBytes:diagnosticByteLength(projectText)});
      await diagnostics.measure('write site plan JSON', () => writeGithubFile(settings, path, projectText, `Save HakoMachi site plan: ${name}`), {bytes:diagnosticByteLength(projectText)});
      setGithubProgress(6,8,'Updating library index...','Loading the shared index so this plan appears in GitHub lists.');
      const library=await diagnostics.measure('load library index', () => loadGithubLibrary(settings));
      upsertGithubSitePlan(library, githubSiteRecord(id, name, path, project));
      setGithubProgress(7,8,'Writing library index...','Saving the updated site plan list.');
      const libraryText=JSON.stringify(library,null,2)+'\n';
      await diagnostics.measure('write library index', () => writeGithubFile(settings, settings.libraryPath, libraryText, `Update HakoMachi site plan library: ${name}`), {bytes:diagnosticByteLength(libraryText)});
      rememberGithubSiteSource({id,name,path});
      markManualSaveComplete();
      setGithubProgress(8,8,'Save complete.','Saved '+path);
      diagnostics.finish({status:'saved', name, path});
      setTimeout(()=>closeGithubModal(), 900);
    }catch(err){
      diagnostics.finish({status:'failed', error:err?.message||String(err)});
      setGithubProgress(0,8,'GitHub save failed.', String(err.message||err));
    }
  }
  async function loadSitePlanFromGithub(record){
    const diagnostics=createPersistenceDiagnostics('GitHub site load', {path:record?.path, name:record?.name});
    try{
      const settings=getGithubSettings();
      requireGithubSettings(settings);
      setGithubStatus('Loading '+record.path+'...');
      const file=await diagnostics.measure('read site plan JSON', () => readGithubFile(settings, record.path));
      if(!file) throw new Error('Missing file: '+record.path);
      const text=String(file.text||'');
      diagnostics.mark('site plan JSON received', {bytes:diagnosticByteLength(text)});
      if(!text.trim()) throw new Error('GitHub file is empty or could not be read: '+record.path);
      let project;
      try{
        project=JSON.parse(text);
      }catch(err){
        throw new Error(`Could not parse ${record.path} as JSON (${text.length} bytes): ${err.message||err}`);
      }
      if(isGithubContentsMetadata(project)){
        throw new Error(`GitHub returned file metadata instead of site-plan content for ${record.path}. Refresh the page and try again; if it repeats, the saved file may need to be re-saved from HakoMachi.`);
      }
      const normalized=normalizeLoadedSitePlanPayload(project);
      project=normalized.payload;
      if(normalized.source!=='top-level'){
        setGithubStatus(`Loaded site-plan payload from ${normalized.source}.`);
      }
      await diagnostics.measure('resolve image assets', () => resolveProjectImageFromGithub(project, settings));
      await diagnostics.measure('resolve building assets', () => resolveProjectHakoAssetsFromGithub(project, settings));
      await diagnostics.measure('resolve STL assets', () => resolveProjectStlAssetsFromGithub(project, settings));
      diagnostics.mark('payload ready', {
        buildings:(project.buildings||[]).length,
        stlObjects:(project.stlObjects||[]).length,
        manifestAssets:(project.assetManifest?.assets||[]).length,
      });
      loadProject(project, {fromFile:true});
      diagnostics.finish({status:'loaded'});
      rememberGithubSiteSource({id:record.id, name:record.name, path:record.path});
      closeGithubModal();
    }catch(err){
      diagnostics.finish({status:'failed', error:err?.message||String(err)});
      setGithubStatus('GitHub load failed: '+(err.message||err));
      showStatusHint('GitHub load failed: '+(err.message||err), 'warning');
    }
  }
  async function openGithubSitePlans(){
    try{
      const settings=getGithubSettings();
      try{requireGithubSettings(settings);}catch(err){openGithubSettings(); setGithubStatus(err.message); return;}
      openGithubModal('GitHub site plans', '<div class="small">Loading...</div>', [{label:'Close', onClick:closeGithubModal}]);
      const library=await loadGithubLibrary(settings);
      const records=normalizeGithubLibrary(library).records.sitePlans;
      const body=$('githubDataBody');
      if(!records.length){
        body.innerHTML='<div class="small">No saved site plans yet.</div>';
        return;
      }
      body.innerHTML='<div class="small">Choose a saved site plan from the shared HakoMachi library.</div>';
      records.forEach(record=>{
        const row=document.createElement('div');
        row.className='githubDataRecord';
        const summary=record.summary||{};
        row.innerHTML=`<div><b>${escapeHtml(record.name||record.id)}</b><small>${escapeHtml(record.path||'')}</small><small>${summary.buildings||0} buildings / ${summary.roads||0} roads / ${summary.tracks||0} tracks / ${escapeHtml(record.updatedAt||'')}</small></div>`;
        const button=document.createElement('button');
        button.type='button';
        button.textContent='Load';
        button.onclick=()=>loadSitePlanFromGithub(record);
        row.appendChild(button);
        body.appendChild(row);
      });
    }catch(err){
      openGithubModal('GitHub site plans', `<div class="warning">${escapeHtml(err.message||err)}</div>`, [{label:'Close', onClick:closeGithubModal}]);
    }
  }
  async function openGithubBuildings(){
    try{
      const settings=getGithubSettings();
      try{requireGithubSettings(settings);}catch(err){openGithubSettings(); setGithubStatus(err.message); return;}
      openGithubModal('GitHub building footprints', '<div class="small">Loading...</div>', [{label:'Close', onClick:closeGithubModal}]);
      const library=await loadGithubLibrary(settings);
      const records=normalizeGithubLibrary(library).records.buildings;
      const body=$('githubDataBody');
      if(!records.length){
        body.innerHTML='<div class="small">No saved building footprints yet.</div>';
        return;
      }
      body.innerHTML='<div class="small">Shared footprint records with generated 3D still previews. Cards load from the saved .hako file when available.</div>';
      records.forEach(record=>{
        const footprint=record.footprint||{};
        const path=record.path||record.paths?.hako||'';
        const row=document.createElement('div');
        row.className='githubDataRecord githubBuildingRecord';
        const preview=document.createElement('div');
        preview.className='githubBuildingPreview';
        preview.textContent='Rendering preview...';
        const info=document.createElement('div');
        info.className='githubBuildingInfo';
        info.innerHTML=`<b>${escapeHtml(record.name||record.id)}</b><small>${escapeHtml(path)}</small><small>${Number(footprint.widthMm||0).toFixed(1)} x ${Number(footprint.depthMm||0).toFixed(1)} mm</small>`;
        const actions=document.createElement('div');
        actions.className='githubBuildingActions';
        const placeButton=document.createElement('button');
        placeButton.type='button';
        placeButton.textContent='Place';
        placeButton.onclick=()=>armGithubBuildingPlacement(record);
        const button=document.createElement('button');
        button.type='button';
        button.textContent='Copy path';
        button.onclick=()=>prompt('Building .hako path', path);
        actions.appendChild(placeButton);
        actions.appendChild(button);
        row.appendChild(preview);
        row.appendChild(info);
        row.appendChild(actions);
        body.appendChild(row);
        renderGithubBuildingStill(preview, githubBuildingPreviewConfig(record), record.name||record.id||'3D building preview');
        upgradeGithubBuildingPreviewFromHako(settings, record, preview);
      });
    }catch(err){
      openGithubModal('GitHub building footprints', `<div class="warning">${escapeHtml(err.message||err)}</div>`, [{label:'Close', onClick:closeGithubModal}]);
    }
  }
  $('inputMode').onchange=e=>{state.inputMode=e.target.value; draw();};
  $('snapBtn').onclick=()=>{state.snapOn=!state.snapOn; $('snapBtn').classList.toggle('active', state.snapOn); $('snapBtn').textContent=state.snapOn?'Snap: On':'Snap: Off'; draw();};
  $('deleteAnnotationBtn').onclick=deleteSelectedAnnotation;
  $('clearAnnotationsBtn').onclick=()=>{if(state.annotations.length && !confirm('Clear all freehand annotation notes?')) return; state.annotations=[]; state.selectedAnnotationId=null; renderSelected(); draw(); markDirty('annotations cleared');};
  $('fitBtn').onclick=()=>{fitImage(); markDirty('view changed', {history:false});}; $('resetBtn').onclick=()=>{state.view={x:40,y:40,scale:1}; draw(); markDirty('view changed', {history:false});}; $('clearCacheBtn').onclick=clearCacheAndReset; if($('clearCachePanelBtn')) $('clearCachePanelBtn').onclick=clearCacheAndReset;
  function saveCurrentSitePlan(){
    if(activeGithubSiteSource()) return saveSitePlanToGithub({reuseCurrent:true});
    return saveSitePlanBundle();
  }
  $('githubSettingsBtn').onclick=openGithubSettings;
  $('githubSaveBtn').onclick=()=>saveSitePlanToGithub({reuseCurrent:true});
  $('githubLoadBtn').onclick=openGithubSitePlans;
  $('githubBuildingsBtn').onclick=openGithubBuildings;
  if($('mobileGithubSettingsBtn')) $('mobileGithubSettingsBtn').onclick=openGithubSettings;
  if($('mobileGithubSaveBtn')) $('mobileGithubSaveBtn').onclick=()=>saveSitePlanToGithub({reuseCurrent:true});
  if($('mobileGithubLoadBtn')) $('mobileGithubLoadBtn').onclick=openGithubSitePlans;
  if($('mobileGithubBuildingsBtn')) $('mobileGithubBuildingsBtn').onclick=openGithubBuildings;
  $('saveBtn').onclick=()=>saveCurrentSitePlan();
  if($('undoBtn')) $('undoBtn').onclick=()=>undo();
  if($('redoBtn')) $('redoBtn').onclick=()=>redo();
  if($('mobileUndoBtn')) $('mobileUndoBtn').onclick=()=>undo();
  if($('mobileRedoBtn')) $('mobileRedoBtn').onclick=()=>redo();
  $('loadFile').addEventListener('change', async e=>{
    const f=e.target.files && e.target.files[0];
    if(!f) return;
    if(isLikelyStlFile(f)){
      await importStlAsSiteObject(f);
      e.target.value='';
      return;
    }
    openImportProgressModal('Import site plan','Reading file...',`Reading ${f.name||'site plan file'}.`);
    try{
      const isPackage=isSiteBundlePackageFile(f);
      setImportProgress(2,4,'Validating site plan...','Checking the project JSON and save format.');
      if(isPackage){
        setImportProgress(3,4,'Applying package...','Restoring the site plan and bundled reference image assets.');
        await loadSitePlanBundle(f);
      } else {
        const text=await f.text();
        const project=JSON.parse(text);
        setImportProgress(3,4,'Applying site plan...','Restoring the canvas, image metadata, and placed objects.');
        await loadProjectJsonObject(project, {fromFile:true});
      }
      finishImportProgress('Site plan imported.',`${f.name||'Project file'} has been loaded.`);
    }
    catch(err){failImportProgress('Could not load project.', err.message);}
    e.target.value='';
  });
  if($('roadExportPreviewBtn')) $('roadExportPreviewBtn').onclick=()=>setRoadExportPreview(!state.roadExportPreview);
  if($('mobileRoadExportPreviewBtn')) $('mobileRoadExportPreviewBtn').onclick=()=>setRoadExportPreview(!state.roadExportPreview);
  if($('roadAssetSvgBtn')) $('roadAssetSvgBtn').onclick=openRoadExportReview;
  if($('mobileRoadAssetSvgBtn')) $('mobileRoadAssetSvgBtn').onclick=openRoadExportReview;
  $('csvBtn').onclick=()=>downloadText(csvExport(),'hakomachi-building-pads.csv','text/csv');
  $('svgBtn').onclick=()=>downloadText(svgExport(),'hakomachi-site.svg','image/svg+xml');
  $('seedBtn').onclick=exportSelectedSeed;
  if($('mobileSaveBtn')) $('mobileSaveBtn').onclick=()=>saveCurrentSitePlan();
  if($('mobileCsvBtn')) $('mobileCsvBtn').onclick=()=>downloadText(csvExport(),'hakomachi-building-pads.csv','text/csv');
  if($('mobileSeedBtn')) $('mobileSeedBtn').onclick=exportSelectedSeed;
  updatePrimarySaveUi();
  function openBuildingInHakoMachi(building){
    const b=building || selected();
    if(!b) return showStatusHint('Select a building first.', 'warning');
    const seed=makeSeed(b);
    localStorage.setItem(SITE_PLANNER_SEED_KEY,JSON.stringify(seed));
    sessionStorage.setItem(SITE_PLANNER_SEED_KEY,JSON.stringify(seed));
    const child=window.open('building-generator.html#sitePlannerSeed','_blank');
    const targetOrigin=window.location.origin && window.location.origin !== 'null' ? window.location.origin : '*';
    setTimeout(()=>{ try{ child?.postMessage?.({type:'hakomachi:open-building-seed',buildingSeed:seed}, targetOrigin); }catch(_err){} }, 650);
  }
  async function copyHakoSeedForBuilding(building){
    const b=building || selected();
    if(!b) return showStatusHint('Select a building first.', 'warning');
    const text=JSON.stringify(makeSeed(b),null,2);
    try{
      await navigator.clipboard.writeText(text);
      $('statusHint').textContent='Copied HakoSeed for '+(b.name||'building');
    }catch(_err){
      prompt('Copy HakoSeed', text);
    }
  }
  const legacyOpenBtn=$('openHakoBtn');
  if(legacyOpenBtn) legacyOpenBtn.onclick=()=>openBuildingInHakoMachi();
  function projectJson(opts={}){
    return ensureSiteProjectPersistenceController().projectJson(opts);
  }
  async function saveSitePlanBundle(){
    if(!window.JSZip){
      showStatusHint('HakoMachi package support is still loading. Try again in a moment.', 'warning');
      return;
    }
    const diagnostics=createPersistenceDiagnostics('local HakoMachi site package save');
    const bundleImage=buildLocalImageBundleAsset(state, {cachedImageAsset, imageAssetReference, imageAssetFileName, dataUrlInfo});
    const hakoAssets=buildLocalHakoBundleAssets(state.buildings, {normalizeBuilding, hakoFileText, uniqueHakoAssetFileName, hakoFileAssetReference});
    const stlAssets=buildLocalStlBundleAssets(state.stlObjects, {normalizeStlObject, uniqueStlAssetFileName, stlAssetReference, uniqueStlSourceAssetFileName, stlSourceAssetReference});
    const project=projectJson({includeImageDataUrl:false,imageAsset:bundleImage?.asset||null,hakoAssets,stlAssets});
    const projectText=JSON.stringify(project,null,2)+'\n';
    diagnostics.mark('assets collected', summarizePersistenceAssets({
      imageAsset:bundleImage,
      hakoAssets,
      stlAssets,
      projectText,
    }));
    const zip=new JSZip();
    zip.file('hakomachi-site.hako-site.json', projectText);
    if(bundleImage?.asset && bundleImage?.info){
      if(bundleImage.info.isBase64) zip.file(bundleImage.asset.path, bundleImage.info.data, {base64:true});
      else zip.file(bundleImage.asset.path, decodeURIComponent(bundleImage.info.data));
      cacheImageAsset(bundleImage.asset, bundleImage.dataUrl);
    }
    hakoAssets.forEach(entry=>{
      if(entry.asset?.path && entry.text) zip.file(entry.asset.path, entry.text);
    });
    stlAssets.forEach(entry=>{
      if(entry.asset?.path && entry.dataBase64) zip.file(entry.asset.path, entry.dataBase64, {base64:true});
    });
    zip.file('manifest.json', JSON.stringify({
      schema:'hakomachi.site-bundle',
      schemaVersion:1,
      project:'hakomachi-site.hako-site.json',
      assets:[...(bundleImage?.asset ? [bundleImage.asset] : []), ...hakoAssets.map(entry=>entry.asset), ...stlAssets.map(entry=>entry.asset)]
    }, null, 2)+'\n');
    const blob=await diagnostics.measure('generate package blob', () => zip.generateAsync({type:'blob'}));
    diagnostics.finish({status:'saved', packageBytes:blob.size});
    downloadBlob(blob,'hakomachi-site.hako-site');
    markManualSaveComplete();
  }
  async function loadProjectJsonObject(project, opts={}){
    const normalized=normalizeLoadedSitePlanPayload(project);
    const payload=normalized.payload;
    loadProject(payload, opts);
    if(!opts.fromAutosave && !opts.preserveGithubSource) rememberGithubSiteSource(githubSiteSourceFromProject(payload));
    return payload;
  }
  async function loadSitePlanBundle(file){
    const diagnostics=createPersistenceDiagnostics('local HakoMachi site package load', {fileName:file?.name, fileBytes:file?.size||0});
    if(!window.JSZip) throw new Error('HakoMachi package support is still loading. Try again in a moment.');
    const zip=await diagnostics.measure('read package file', () => JSZip.loadAsync(file));
    const projectName=findSiteBundleProjectName(zip);
    if(!projectName) throw new Error('No .hako-site.json project file was found in the package.');
    const projectText=await diagnostics.measure('read project JSON', () => zip.file(projectName).async('string'));
    diagnostics.mark('project JSON received', {projectName, bytes:diagnosticByteLength(projectText)});
    const project=JSON.parse(projectText);
    const normalized=normalizeLoadedSitePlanPayload(project);
    const payload=normalized.payload;
    await diagnostics.measure('hydrate bundled assets', () => hydrateSiteBundleAssets(payload, zip, {dataUrlFromBase64, cacheImageAsset, hakoFileText}));
    diagnostics.mark('payload ready', {
      buildings:(payload.buildings||[]).length,
      stlObjects:(payload.stlObjects||[]).length,
      manifestAssets:(payload.assetManifest?.assets||[]).length,
    });
    loadProject(payload, {fromFile:true});
    rememberGithubSiteSource(githubSiteSourceFromProject(payload));
    diagnostics.finish({status:'loaded'});
    return payload;
  }
  function loadProject(p, opts={}){
    autosaveSuppressed=true;
    state.image=null;
    state.imageMeta=p.image||null;
    state.imageOpacity=Number.isFinite(p.imageOpacity)?p.imageOpacity:(state.imageMeta?.opacity ?? state.imageOpacity ?? .75);
    state.imageLocked=p.imageLocked ?? state.imageLocked ?? true;
    state.view=restoreProjectView(p, canvas.getBoundingClientRect()) || state.view;
    state.viewMode='2d';
    applySite3DSettings(p.site3d||{});
    syncSite3DControls();
    wrap.classList.remove('view3d');
    document.querySelector('.sitePlannerApp')?.classList.remove('view3d');
    state.pxPerMm=p.scale?.pxPerMm||null;
    state.calibrationLine=p.scale?.calibrationLine||null;
    state.lastCalibrationLine=state.calibrationLine;
    const loadedBuildingSet=collectProjectBuildings(p);
    state.buildings=loadedBuildingSet.buildings;
    const loadFootprintMessage=footprintLoadMessage(p, state.buildings.length, loadedBuildingSet.source);
    const savedDims=savedImageDimensions(p);
    const loadedRoads = Array.isArray(p.roads) ? p.roads : (Array.isArray(p.siteConstraints) ? p.siteConstraints.filter(c=>c&&c.type==='road') : []);
    state.roads=loadedRoads.map(normalizeRoad);
    state.tracks=(Array.isArray(p.tracks)?p.tracks:[]).map(normalizeTrack);
    state.trackAccessories=(Array.isArray(p.trackAccessories)?p.trackAccessories:[]).map(normalizeTrackAccessory);
    state.roadFeatures=migrateLoadedRoadFeatures(p.roadFeatures);
    state.roadDrivingSide=normalizeDrivingSide(p.roadDrivingSide);
    state.roadIntersectionDetails=p.roadIntersectionDetails!==false;
    state.roadIntersectionOverrides=p.roadIntersectionOverrides&&typeof p.roadIntersectionOverrides==='object'?structuredClone(p.roadIntersectionOverrides):{};
    state.generatedRoadIntersections=[];
    state.railCrossingOverrides=p.railCrossingOverrides&&typeof p.railCrossingOverrides==='object'?structuredClone(p.railCrossingOverrides):{};
    state.generatedRailCrossings=[];
    const loadedStlObjects = Array.isArray(p.stlObjects) ? p.stlObjects : (Array.isArray(p.siteObjects) ? p.siteObjects.filter(o=>o&&(o.type==='stl'||o.type==='stlObject'||o.kind==='stl')) : (Array.isArray(p.siteConstraints) ? p.siteConstraints.filter(o=>o&&(o.type==='stlObject'||o.type==='stl'||o.kind==='stl')) : []));
    state.stlObjects=loadedStlObjects.map(normalizeStlObject);
    const loadedBenchworks = Array.isArray(p.benchworkOutlines) ? p.benchworkOutlines : (Array.isArray(p.siteConstraints) ? p.siteConstraints.filter(c=>c&&(c.type==='benchworkOutline'||c.type==='benchwork'||c.constraintType==='benchworkOutline')) : []);
    state.benchworkOutlines=loadedBenchworks.map(normalizeBenchworkOutline);
    state.fabricRegions=(p.fabricRegions||[]).map(normalizeFabricRegion);
    state.streetlights=(p.streetlights||[]).map(normalizeStreetlight);
    state.annotations=p.annotations||[];
    clearBuildingSelection();
    state.selectedRoadId=null;
    state.selectedRoadIntersectionId=null;
    state.selectedTrackId=null;
    state.selectedTrackPointIndex=null;
    state.selectedTrackAccessoryId=null;
    state.selectedRailCrossingId=null;
    state.selectedStlObjectId=null;
    state.selectedBenchworkId=null;
    state.selectedStreetlightId=null;
    state.selectedAnnotationId=null;
    if($('opacity')) $('opacity').value=String(state.imageOpacity);
    if($('imageLockBtn')) $('imageLockBtn').textContent=state.imageLocked?'Locked':'Unlocked';
    if(state.imageMeta?.dataUrl){
      const img=new Image();
      img.onload=()=>{
        state.image=img;
        const loadedW=img.naturalWidth||img.width;
        const loadedH=img.naturalHeight||img.height;
        const savedW=savedDims.w || state.imageMeta.naturalWidthPx;
        const savedH=savedDims.h || state.imageMeta.naturalHeightPx;
        let geometryRemapped=false;
        if(savedW && savedH && (loadedW!==savedW || loadedH!==savedH)){
          scaleLoadedPixelGeometry(state, loadedW/savedW, loadedH/savedH);
          geometryRemapped=true;
          setImageStatus(loadAlignmentMessage(state.buildings.length,savedW,savedH,loadedW,loadedH,true), 'warning');
          updateImagePortableStatus('Portable image warning: loaded pixel dimensions differed from saved metadata, so planner geometry was remapped to the restored image.');
        } else {
          setImageStatus(loadAlignmentMessage(state.buildings.length,savedW||loadedW,savedH||loadedH,loadedW,loadedH,false), 'okText');
          state.imageMeta.naturalWidthPx=loadedW;
          state.imageMeta.naturalHeightPx=loadedH;
          state.imageMeta.pixelDimensionsVerifiedOnLoad=true;
          updateImagePortableStatus();
        }
        if(loadFootprintMessage && state.buildings.length===0) setImageStatus(loadFootprintMessage, 'warning');
        if(!p.view) fitImage();
        syncAll({skipDirty:true});
        autosaveSuppressed=false;
        resetHistory(opts.fromAutosave?'autosave restored':'project loaded');
      };
      img.onerror=()=>{
        setImageStatus('Project loaded, but the embedded image could not be decoded.', 'warning');
        updateImagePortableStatus('Portable image error: embedded image could not be decoded.');
        if(loadFootprintMessage) setImageStatus(loadFootprintMessage, 'warning');
        autosaveSuppressed=false;
        syncAll({skipDirty:true});
        resetHistory(opts.fromAutosave?'autosave restored':'project loaded');
      };
      img.src=state.imageMeta.dataUrl;
    } else {
      if(state.imageMeta){
        if(state.imageMeta.assetLoadError){
          setImageStatus(`Referenced image asset could not be loaded: ${state.imageMeta.assetLoadError}`, 'warning');
          updateImagePortableStatus('Portable image warning: referenced image asset could not be loaded.');
        } else {
          setImageStatus('Project loaded without embedded image data. Re-import the original image to see the reference layer.', 'warning');
          updateImagePortableStatus('Portable save warning: this project has image metadata but no embedded image data.');
        }
      } else {
        setImageStatus('No image loaded.', 'muted');
        updateImagePortableStatus();
      }
      if(loadFootprintMessage) setImageStatus(loadFootprintMessage, 'warning');
      syncAll({skipDirty:true});
      autosaveSuppressed=false;
      resetHistory(opts.fromAutosave?'autosave restored':'project loaded');
    }
    state.dirty=false;
    state.dirtySinceManualSave=!!opts.dirtySinceManualSave;
    updateAutosaveStatus(opts.fromAutosave?'Autosave: restored':'Autosave: loaded');
    setTimeout(()=>updateAutosaveStatus(), 1200);
  }
  function csvExport(){syncAll(); return buildingCsvExport(state.buildings, {normalizeBuilding});}

  function svgExport(){
    syncAll();
    const w=state.image?.width||1200,h=state.image?.height||800;
    return sitePlanSvgExport({state, width:w, height:h, tracksSvg:''}, {buildingCenter, escapeHtml, mmToPx, normalizeBenchworkOutline, normalizeRoad, normalizeRoadFeature, normalizeStreetlight, polygonCenter, visibleBuildingPolygons});
  }
  function slug(s){return githubData.slugify(s, 'building');}

  function restoreAutosaveIfAvailable(){
    try{
      const raw=localStorage.getItem(AUTOSAVE_KEY);
      if(!raw) return false;
      const metaRaw=localStorage.getItem(AUTOSAVE_META_KEY);
      const meta=metaRaw?JSON.parse(metaRaw):{};
      const payload=JSON.parse(raw);
      state.autosaveRestored=true;
      loadProject(payload, {fromAutosave:true, dirtySinceManualSave:!!meta.dirtySinceManualSave});
      return true;
    }catch(err){
      logger.warn('Could not restore autosave:', err);
      return false;
    }
  }
  window.addEventListener('beforeunload', e=>{
    if(state.dirty) writeAutosave();
    if(state.dirtySinceManualSave){
      e.preventDefault();
      e.returnValue='';
      return '';
    }
  });

  window.addEventListener('message', async e=>{
    if(e.origin && e.origin !== window.location.origin) return;
    const payload=sitePlannerBuildingUpdatePayload(e.data);
    const result=await applySitePlannerBuildingUpdate(payload);
    if(result){
      try{
        localStorage.removeItem(SITE_PLANNER_BUILDING_UPDATE_KEY);
        sessionStorage.removeItem(SITE_PLANNER_BUILDING_UPDATE_KEY);
      }catch(_err){}
      acknowledgeSitePlannerBuildingUpdate(e.source, e.origin, result);
      if(payload?.returnToSitePlanner){
        try{ window.focus(); }catch(_err){}
      }
    }
  });
  window.addEventListener('storage', async e=>{
    if(e.key===SITE_PLANNER_BUILDING_UPDATE_KEY && e.newValue){
      try{
        const payload=JSON.parse(e.newValue);
        if(await applySitePlannerBuildingUpdate(payload)){
          localStorage.removeItem(SITE_PLANNER_BUILDING_UPDATE_KEY);
        }
      }catch(err){
        logger.warn('Could not apply building update from storage:', err);
      }
    }
  });

  bindSite3DButtons();
  installWholePageHakoDrop();
  installSelectedHakoSidebarDrop();
  resize();
  const restored=restoreAutosaveIfAvailable();
  state.autosaveReady=true;
  if(!restored){rememberGithubSiteSource(null); syncAll({skipDirty:true}); fitImage(); resetHistory('initial'); writeAutosave();}
  else { updateHistoryButtons(); }
  setTimeout(()=>{ processQueuedSitePlannerBuildingUpdate(); }, 0);
})();
