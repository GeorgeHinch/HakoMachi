import githubData from './shared/github-data.js?v=hm-assets-20260804-1';
import { base64ToArrayBuffer, base64ToText, dataUrlFromBase64, dataUrlInfo, downloadBase64, downloadBlob, downloadText, escapeAttr, escapeHtml, formatBytes, installCanvasGestureBoundary, installThreeRenderCanvas, textToBase64 } from './shared/browser-utils.js';
import { createHakoMachiLogger } from './shared/hakomachi-diagnostics.js';
import { SVG_FABRICATION_OPERATIONS, svgFabricationColor } from './shared/svg-fabrication-colors.js';
import { createAutosaveUiController } from './site-planner/autosave-ui.js';
import { createSiteAutosaveController } from './site-planner/site-autosave-controller.js';
import { createBuildingResizeProtectionController } from './site-planner/building-resize-protection.js';
import { createBuildingSelectionController } from './site-planner/building-selection-utils.js';
import { createBuildingInteractionModel } from './site-planner/building-interaction-model.js';
import { createCanvasDrawingController } from './site-planner/canvas-drawing-utils.js';
import { createCatenaryAutoPlacementController } from './site-planner/catenary-auto-placement-controller.js';
import { createRoadToolTaskController } from './site-planner/road-tool-task-controller.js';
import { createTrackToolTaskController } from './site-planner/track-tool-task-controller.js';
import { createCanvasHoverPreviewRenderer } from './site-planner/canvas-hover-preview-renderer.js';
import { createGroupSelectionController } from './site-planner/group-selection-controller.js';
import { createSiteBuildingRenderer2D } from './site-planner/site-building-renderer-2d.js';
import { createSiteBuildingPlacementController } from './site-planner/site-building-placement-controller.js';
import { createSiteCanvasRenderer } from './site-planner/site-canvas-renderer.js';
import { createSiteCanvasPathRenderer } from './site-planner/site-canvas-path-renderer.js';
import { createSiteCanvasGestureController } from './site-planner/site-canvas-gesture-controller.js';
import { createSiteCanvasHoverController } from './site-planner/site-canvas-hover-controller.js';
import { createSiteCanvasKeyboardController } from './site-planner/site-canvas-keyboard-controller.js';
import { createSiteCanvasPointerMoveController } from './site-planner/site-canvas-pointer-move-controller.js';
import { createSiteCanvasPointerDownController } from './site-planner/site-canvas-pointer-down-controller.js';
import { createSiteCanvasPointerFinishController } from './site-planner/site-canvas-pointer-finish-controller.js';
import { createSitePageControlsController } from './site-planner/site-page-controls-controller.js';
import { createSiteToolControlsController } from './site-planner/site-tool-controls-controller.js';
import { createSiteHistoryController } from './site-planner/site-history-controller.js';
import { createSiteResetController } from './site-planner/site-reset-controller.js';
import { createContextMenuController } from './site-planner/context-menu-controller.js';
import { buildingCsvExport, sitePlanSvgExport } from './site-planner/export-utils.js';
import { createAnnotationController } from './site-planner/annotation-controller.js';
import { createFabricController } from './site-planner/fabric-controller.js';
import { dataTransferHasFile, isSupportedImageFile, pageHakoImportFileFromDataTransfer, readFileAsDataURL } from './site-planner/file-import-utils.js';
import { createFootprintClipboardController } from './site-planner/footprint-clipboard-controller.js';
import { cacheImageAsset, cachedImageAsset, githubHakoAssetPath, githubImageAssetPath, githubSiteAssetFolderPath, githubStlAssetPath, githubStlSourceAssetPath, hakoFileAssetReference, imageAssetFileName, imageAssetReference, imageMetaForProject, stlAssetReference, stlSourceAssetReference, uniqueHakoAssetFileName, uniqueStlAssetFileName, uniqueStlSourceAssetFileName } from './site-planner/github-asset-paths.js';
import { createBenchworkController } from './site-planner/benchwork-controller.js';
import { createGithubDataAccess } from './site-planner/github-access-utils.js';
import { createGithubSiteSourceController } from './site-planner/github-site-source-controller.js';
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
import { normalizeIntersectionOverride, roadArmKey } from './site-planner/road-intersection-overrides.js';
import { createRoadSystemController } from './site-planner/road-system-controller.js';
import { createRoadAssetExportController } from './site-planner/road-asset-export-controller.js';
import { createRoadExportReviewController } from './site-planner/road-export-review-panel.js';
import { createRoadExportUiController } from './site-planner/road-export-ui-controller.js';
import { createRoadIntersectionMarkingControls } from './site-planner/road-intersection-marking-controls.js';
import { createRoadFeatureConfigController } from './site-planner/road-feature-config-controller.js';
import { createRoadPresetApplicationController } from './site-planner/road-preset-application-utils.js';
import { applyRoadHatchPreset, applyRoadMarkingPreset, hatchOptionsHtml, hatchPresetByKey, markingOptionsHtml, markingPresetByKey, presetModelMm, presetOptionsHtml, roadPresetByKey, sidewalkPresetByKey } from './site-planner/road-preset-utils.js';
import { RAIL_CROSSING_CENTER_CLEARANCE_MM, normalizeRailCrossingOverride, railCrossingOverrideKey, railCrossingSvgRecords } from './site-planner/rail-crossing-generator.js';
import { createSiteRoadCrossingController } from './site-planner/site-road-crossing-controller.js';
import { createScaleInputController } from './site-planner/scale-input-utils.js';
import { activeSidebarDetailKindForState, activeSidebarDetailTitle as sidebarDetailTitle, sidebarTypeForDetailKind } from './site-planner/sidebar-object-model.js';
import { createSidebarDetailController } from './site-planner/sidebar-detail-controller.js';
import { createSidebarObjectBrowserController } from './site-planner/sidebar-object-browser-controller.js';
import { createSidebarSelectedDetailController } from './site-planner/sidebar-selected-detail-controller.js';
import { createSiteSidebarSelectionFacade } from './site-planner/site-sidebar-selection-facade.js';
import { renderRailCrossingDetail } from './site-planner/sidebar-rail-crossing-detail.js';
import { renderRoadFeatureDetail } from './site-planner/sidebar-road-feature-detail.js';
import { renderRoadDetail } from './site-planner/sidebar-road-detail.js';
import { renderRoadIntersectionDetail } from './site-planner/sidebar-road-intersection-detail.js';
import { renderMultiBuildingDetail } from './site-planner/sidebar-multi-building-detail.js';
import { renderAnnotationDetail } from './site-planner/sidebar-annotation-detail.js';
import { renderBuildingDetail } from './site-planner/sidebar-building-detail.js';
import { renderBenchworkDetail } from './site-planner/sidebar-benchwork-detail.js';
import { renderFabricDetail } from './site-planner/sidebar-fabric-detail.js';
import { renderStlDetail } from './site-planner/sidebar-stl-detail.js';
import { renderStreetlightDetail } from './site-planner/sidebar-streetlight-detail.js';
import { renderTrackDetail } from './site-planner/sidebar-track-detail.js';
import { renderTrackAccessoryDetail } from './site-planner/sidebar-track-accessory-detail.js';
import { createSite3DBuildingConfigController } from './site-planner/site-3d-building-config.js';
import { createSite3DUiController } from './site-planner/site-3d-ui-controller.js';
import { createSite3DMeshUtils } from './site-planner/site-3d-mesh-utils.js';
import { createSite3DObjectTagging } from './site-planner/site-3d-object-tagging.js';
import { createSite3DInteractionController } from './site-planner/site-3d-interaction-controller.js';
import { createSite3DLifecycleController } from './site-planner/site-3d-lifecycle-controller.js';
import { createSite3DSceneController } from './site-planner/site-3d-scene-controller.js';
import { createSite3DSceneUtils } from './site-planner/site-3d-scene-utils.js';
import { createSite3DRendererFacade } from './site-planner/site-3d-renderer-facade.js';
import { createSiteBuildingProjectController } from './site-planner/site-building-project-controller.js';
import { createSiteObjectSelectionController } from './site-planner/site-object-selection-controller.js';
import { createSitePointerInteractionController } from './site-planner/site-pointer-interaction-controller.js';
import { createSiteProjectPersistenceController } from './site-planner/site-project-persistence-controller.js';
import { createSiteProjectWorkflowFacade } from './site-planner/site-project-workflow-facade.js';
import { createSiteRuntimeLifecycleController } from './site-planner/site-runtime-lifecycle-controller.js';
import { createSidebarUiController } from './site-planner/sidebar-ui.js';
import { createStatusUiController } from './site-planner/status-ui.js';
import { createStreetlightController } from './site-planner/streetlight-controller.js';
import { createStlImportController } from './site-planner/stl-import-controller.js';
import { createStlObjectModelController } from './site-planner/stl-object-model.js';
import { boundsFromVertices, estimateStlTriangleCount, isLikelyStlFile, parseStlVertices } from './site-planner/stl-utils.js';
import { svgFabricationAttrs, svgFeatureTransform, svgPathFromPoly } from './site-planner/svg-export-utils.js';
import { createTrackAccessoryGeometry } from './site-planner/track-accessory-geometry.js';
import { createTrackAccessoryGeometryFacade } from './site-planner/track-accessory-geometry-facade.js';
import { createTrackAccessoryBrowserModel } from './site-planner/track-accessory-browser-model.js';
import { createTrackAccessoryRenderer2D } from './site-planner/track-accessory-renderer-2d.js';
import { createTrackAccessoryAnchorController } from './site-planner/track-accessory-anchor-controller.js';
import { createTrackAccessoryInteractionController } from './site-planner/track-accessory-interaction-controller.js';
import { createTrackSwitchConnectionController } from './site-planner/track-switch-connection-controller.js';
import { createTrackRenderer2D } from './site-planner/track-renderer-2d.js';
import { installTopMenus } from './site-planner/top-menu-utils.js';
import { createTrackController } from './site-planner/track-controller.js';
import { createToolFlyoutController } from './site-planner/tool-flyout-utils.js';
import { createToolTooltipController } from './site-planner/tool-tooltip-controller.js';
import { createToolVariantController } from './site-planner/tool-variant-controller.js';
import { createViewTransformController } from './site-planner/view-transform-utils.js';
import { createWorkspaceModeController } from './site-planner/workspace-mode-controller.js';
import { clipPolygonByHalfPlane } from './building-generator/core/layout-cut-geometry.js?v=hm-assets-20260804-1';

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
  let roadSystem = null;
  let roadAssetExporter = null;
  let roadExportReview = null;
  let roadIntersectionMarkingControls = null;
  let hakoBuildingGeometryController = null;
  let trackAccessoryGeometry = null;
  let trackAccessoryRenderer2D = null;
  let trackAccessoryAnchorController = null;
  let catenaryAutoPlacementController = null;
  let trackAccessoryInteractionController = null;
  let trackSwitchConnectionController = null;
  let site3DBuildingConfigController = null;
  let githubBuildingPreviewRenderer = null;
  let siteObjectSelectionController = null;
  let sidebarObjectBrowserController = null;
  let sidebarSelectedDetailController = null;
  let sidebarDetailController = null;
  let sitePointerInteractionController = null;
  let siteProjectPersistenceController = null;
  let updateWorkspaceModeUi = () => {};
  let setWorkspaceMode = () => {};
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
    activeGithubSiteSource,
    githubSiteSourceFromProject,
    rememberGithubSiteSource,
    updatePrimarySaveUi,
  } = createGithubSiteSourceController({
    getCurrentGithubSite,
    setCurrentGithubSite,
    getElement:$,
    slug,
    githubProjectName,
  });
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
    installReferenceImageImport,
  } = createReferenceImageUiController({
    state,
    getElement:$,
    readFileAsDataURL,
    isSupportedImageFile,
    pageHakoImportFileFromDataTransfer,
    openImportProgressModal,
    setImportProgress,
    finishImportProgress,
    failImportProgress,
    resize,
    fitImage:()=>fitImage(),
    syncAll,
    logger,
  });
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
    pointInBuilding,
    lockedHitTolerance,
    hitBuildingSelectable,
    hitTest,
    polyEdgeDistance,
    rotateHandlePoint,
    rotationZoneHit,
    handleAt,
  } = createBuildingInteractionModel({
    state,
    visibleBuildingPolygons,
    pointInPoly,
    buildingPoints,
    buildingCenter,
    distanceToSegment,
    dist,
    matchMediaFn: matchMedia,
  });
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
  const {
    migrateLoadedRoadFeatures,
    grateFamilyOptionsHtml,
    applyPhysicalGrateFamily,
    syncPhysicalGrateSpecDimensions,
    setPhysicalGrateMode,
    setRoadMarkingOutputMode,
    normalizeDrivingSide,
  } = createRoadFeatureConfigController({
    state,
    mmToPx,
    escapeAttr,
    escapeHtml,
    normalizeRoadFeature,
  });
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

  const { drawPoly, drawRoadGeneratedPath, drawTrackModelPath } = createSiteCanvasPathRenderer({ ctx, state });
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
  const { updateRoadExportBadge, setRoadExportPreview, openRoadExportReview } = createRoadExportUiController({
    state,getElement:$,updateWorkspaceModeUi:()=>updateWorkspaceModeUi(),draw,
    setWorkspaceMode:(...args)=>setWorkspaceMode(...args),getRoadExportReview:()=>roadExportReview,
  });
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
  function trackAccessoryObjectFilterDefinition(key='all'){ return trackAccessoryBrowserModel.trackAccessoryObjectFilterDefinition(key); }
  function trackAccessoryMatchesObjectFilter(item, filterKey='all'){ return trackAccessoryBrowserModel.trackAccessoryMatchesObjectFilter(item, filterKey); }
  function trackAccessoryFilterCounts(){ return trackAccessoryBrowserModel.trackAccessoryFilterCounts(); }
  function ensureTrackSwitchConnectionController(){
    if(!trackSwitchConnectionController){
      trackSwitchConnectionController=createTrackSwitchConnectionController({
        state,
        normalizeTrackAccessory,
        normalizeTrack,
        isTrackSwitchAccessoryKind,
        trackSwitchEndpointPoints,
        trackSwitchEndpointDefinitions,
        trackAccessorySnapDistance,
        rotatePoint,
        normalizeAngleDeltaDeg,
        dist,
        moveTrackPointWithAdjacentCurves,
        trackEndpointKey,
        showStatusHint,
      });
    }
    return trackSwitchConnectionController;
  }
  function allTrackSwitchConnectionPoints(){
    return ensureTrackSwitchConnectionController().allTrackSwitchConnectionPoints();
  }
  function nearestTrackSwitchEndpoint(p, excludeTrackAccessoryId=null){
    return ensureTrackSwitchConnectionController().nearestTrackSwitchEndpoint(p,excludeTrackAccessoryId);
  }
  function draggedTrackSwitchEndpointName(item,p){
    return ensureTrackSwitchConnectionController().draggedTrackSwitchEndpointName(item,p);
  }
  function rotatePoint(point, angleDeg){
    return trackAccessoryGeometry.rotatePoint(point, angleDeg);
  }
  function normalizeAngleDeltaDeg(value){
    return trackAccessoryGeometry.normalizeAngleDeltaDeg(value);
  }
  function trackSwitchEndpointOutwardAngleDeg(endpointName, angleDeg){
    return ensureTrackSwitchConnectionController().trackSwitchEndpointOutwardAngleDeg(endpointName,angleDeg);
  }
  function trackSwitchSnapRotationDeg(item,sourceEndpointName,targetEndpoint){
    return ensureTrackSwitchConnectionController().trackSwitchSnapRotationDeg(item,sourceEndpointName,targetEndpoint);
  }
  function alignTrackSwitchEndpointToTarget(item, sourceEndpointName, targetEndpoint){
    return ensureTrackSwitchConnectionController().alignTrackSwitchEndpointToTarget(item,sourceEndpointName,targetEndpoint);
  }
  function nearestSwitchEndpointPair(item, pointerPoint=null, preferredSourceEndpoint=null){
    return ensureTrackSwitchConnectionController().nearestSwitchEndpointPair(item,pointerPoint,preferredSourceEndpoint);
  }
  function snapTrackSwitchToEndpoint(item, pointerPoint=null, preferredSourceEndpoint=null){
    return ensureTrackSwitchConnectionController().snapTrackSwitchToEndpoint(item,pointerPoint,preferredSourceEndpoint);
  }
  function resolveTrackSwitchConnection(connection){
    return ensureTrackSwitchConnectionController().resolveTrackSwitchConnection(connection);
  }
  function syncTracksConnectedToTrackSwitch(item){
    return ensureTrackSwitchConnectionController().syncTracksConnectedToTrackSwitch(item);
  }
  function syncTrackEndpointToSwitchConnection(track,index){
    return ensureTrackSwitchConnectionController().syncTrackEndpointToSwitchConnection(track,index);
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
  function ensureTrackAccessoryAnchorController(){
    if(!trackAccessoryAnchorController){
      trackAccessoryAnchorController=createTrackAccessoryAnchorController({
        state,
        normalizeTrack,
        normalizeTrackAccessory,
        isCatenaryAccessoryKind,
        isTrackBufferAccessoryKind,
        trackPathSamples,
        resolveTrackEndpointAnchor,
        clamp,
        closestPointOnSegment,
        deg,
      });
    }
    return trackAccessoryAnchorController;
  }
  function trackAccessorySnapDistance(){
    return ensureTrackAccessoryAnchorController().trackAccessorySnapDistance();
  }
  function sampledTrackSegments(t, perCurve=20){
    return ensureTrackAccessoryAnchorController().sampledTrackSegments(t,perCurve);
  }
  function trackPointAtDistance(trackId,pathDistancePx){
    return ensureTrackAccessoryAnchorController().trackPointAtDistance(trackId,pathDistancePx);
  }
  function nearestTrackAccessoryAnchor(p,options={}){
    return ensureTrackAccessoryAnchorController().nearestTrackAccessoryAnchor(p,options);
  }
  function attachTrackAccessoryToAnchor(item,anchor,options={}){
    return ensureTrackAccessoryAnchorController().attachTrackAccessoryToAnchor(item,anchor,options);
  }
  function resolveTrackAccessoryAnchor(item){
    return ensureTrackAccessoryAnchorController().resolveTrackAccessoryAnchor(item);
  }
  function refreshTrackAccessoryAnchor(item){
    return ensureTrackAccessoryAnchorController().refreshTrackAccessoryAnchor(item);
  }
  function refreshAnchoredTrackAccessories(){
    return ensureTrackAccessoryAnchorController().refreshAnchoredTrackAccessories();
  }
  function ensureCatenaryAutoPlacementController(){
    if(!catenaryAutoPlacementController){
      catenaryAutoPlacementController=createCatenaryAutoPlacementController({
        state,
        catenarySpacingModelMm:CATENARY_SPACING_MODEL_MM,
        catenaryPrototypeSpacingM:CATENARY_PROTOTYPE_SPACING_M,
        mmToPx,
        normalizeTrack,
        normalizeTrackAccessory,
        sampledTrackSegments,
        trackPointAtDistance,
        nearestTrackAccessoryAnchor,
        trackAccessorySnapDistance,
        attachTrackAccessoryToAnchor,
        trackAccessoryPreset,
        uid,
        fmt,
        hitTrack,
        clearBuildingSelection,
        syncAll,
        showStatusHint,
      });
    }
    return catenaryAutoPlacementController;
  }
  function catenarySpacingPxForTrack(trackId){
    return ensureCatenaryAutoPlacementController().catenarySpacingPxForTrack(trackId);
  }
  function catenaryAtTrackDistance(trackId,pathDistancePx,kind='catenarySingleSide'){
    return ensureCatenaryAutoPlacementController().catenaryAtTrackDistance(trackId,pathDistancePx,kind);
  }
  function createAnchoredCatenaryAt(trackId,pathDistancePx,kind='catenarySingleSide'){
    return ensureCatenaryAutoPlacementController().createAnchoredCatenaryAt(trackId,pathDistancePx,kind);
  }
  function applyCatenarySection(startAnchor,endAnchor,kind='catenarySingleSide'){
    return ensureCatenaryAutoPlacementController().applyCatenarySection(startAnchor,endAnchor,kind);
  }
  function catenarySectionResultText(result){
    return ensureCatenaryAutoPlacementController().catenarySectionResultText(result);
  }
  function applyCatenaryToTrack(trackId,kind='catenarySingleSide'){
    return ensureCatenaryAutoPlacementController().applyCatenaryToTrack(trackId,kind);
  }
  function handleCatenaryAutoTrackClick(p,pointerType='mouse'){
    return ensureCatenaryAutoPlacementController().handleCatenaryAutoTrackClick(p,pointerType);
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
  function ensureTrackAccessoryInteractionController(){
    if(!trackAccessoryInteractionController){
      trackAccessoryInteractionController=createTrackAccessoryInteractionController({
        state,
        normalizeTrackAccessory,
        isTrackSwitchAccessoryKind,
        isTrackBufferAccessoryKind,
        isCatenaryAccessoryKind,
        trackAccessoryPreset,
        trackAccessorySnapDistance,
        nearestTrackSwitchEndpoint,
        nearestTrackEndpointAnchor,
        nearestTrackAccessoryAnchor,
        alignTrackSwitchEndpointToTarget,
        attachTrackAccessoryToAnchor,
        refreshTrackAccessoryAnchor,
        trackSwitchGeometryPx,
        trackBufferGeometryPx,
        trackSwitchDirection,
        selectedTrackAccessory,
        setSingleSiteObjectSelection,
        syncAll,
        refreshUi:()=>{renderList(); renderRoads(); renderStreetlights(); renderSelected(); updateHandoff(); draw();},
        showStatusHint,
        uid,
        dist,
        rad,
      });
    }
    return trackAccessoryInteractionController;
  }
  function placeTrackAccessory(p,kind){
    return ensureTrackAccessoryInteractionController().placeTrackAccessory(p,kind);
  }
  function hitTrackAccessory(p,pointerType='mouse'){
    return ensureTrackAccessoryInteractionController().hitTrackAccessory(p,pointerType);
  }
  function trackAccessoryRotationHandlePoint(item){
    return ensureTrackAccessoryInteractionController().trackAccessoryRotationHandlePoint(item);
  }
  function trackAccessoryRotationHandleLocal(item){
    return ensureTrackAccessoryInteractionController().trackAccessoryRotationHandleLocal(item);
  }
  function hitTrackAccessoryRotationHandle(p,pointerType='mouse'){
    return ensureTrackAccessoryInteractionController().hitTrackAccessoryRotationHandle(p,pointerType);
  }
  function trackAccessoryLabelPoint(item){
    return ensureTrackAccessoryInteractionController().trackAccessoryLabelPoint(item);
  }
  function selectTrackAccessory(item, opts={}){
    return ensureTrackAccessoryInteractionController().selectTrackAccessory(item,opts);
  }
  function deleteSelectedTrackAccessory(){
    return ensureTrackAccessoryInteractionController().deleteSelectedTrackAccessory();
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
  let siteBuildingProjectController=null;
  function ensureSiteBuildingProjectController(){
    if(!siteBuildingProjectController){
      siteBuildingProjectController=createSiteBuildingProjectController({
        state,buildingStates:BUILDING_STATES,extractHakoTrimLinesMm,uid,colors,mmToPx,
      });
    }
    return siteBuildingProjectController;
  }
  function buildingStateLabel(value){ return ensureSiteBuildingProjectController().buildingStateLabel(value); }
  function normalizeBuilding(building){ return ensureSiteBuildingProjectController().normalizeBuilding(building); }
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
  function collectProjectBuildings(project){ return ensureSiteBuildingProjectController().collectProjectBuildings(project); }
  function footprintLoadMessage(project, loadedCount, source){ return ensureSiteBuildingProjectController().footprintLoadMessage(project, loadedCount, source); }
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
    openBuildingInHakoMachi,
    copyHakoSeedForBuilding,
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
    windowRef: window,
    localStorageRef: localStorage,
    sessionStorageRef: sessionStorage,
    navigatorRef: navigator,
    promptFn: prompt,
    showStatusHint,
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
  const {
    trackAccessoryPreset,
    trackAccessoryLabel,
    isTrackAccessoryAction,
    isCatenaryAccessoryKind,
    isTrackSwitchAccessoryKind,
    isTrackBufferAccessoryKind,
    trackBufferHasCatenaryTerminal,
    defaultTrackAccessoryPxPerMm,
    trackAccessoryPxPerMm,
    trackBufferPxPerMm,
    tomixBufferGeometry,
    trackBufferGeometryPx,
    trackBufferGeometrySite3D,
    trackSwitchDirection,
    trackSwitchPxPerMm,
    tomixTurnoutGeometry,
    trackSwitchGeometryPx,
    trackSwitchGeometrySite3D,
    trackSwitchEndpointDefinitions,
    trackSwitchCurvePoints,
    trackSwitchMainPathPoints,
    pointAtPolylineDistance,
    polylineLength,
    drawTrackSwitchPolyline,
    transformTrackSwitchLocalPoint,
    trackSwitchEndpointPoints,
    normalizeTrackAccessory,
  } = createTrackAccessoryGeometryFacade({
    getGeometry: () => trackAccessoryGeometry,
    getRenderer: () => trackAccessoryRenderer2D,
    ctx,
  });
  const trackAccessoryBrowserModel = createTrackAccessoryBrowserModel({ state, normalizeTrackAccessory });
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
  const {
    benchworkClipPolygons,
    withRoadBenchworkClip,
    drawRoadJunctions,
    drawGeneratedRoadIntersections,
    drawRoad,
    drawRoadLayer,
    clipPolygonToBenchwork,
    roadDisplayPolygons,
    shouldClipRoadsToBenchwork,
    generatedRailCrossings,
    railCrossingInfillPanels,
    roadIntersectionKey,
    generatedRoadIntersections,
    selectedRoadIntersection,
    selectRoadIntersection,
    hitGeneratedRoadIntersection,
    selectedRailCrossing,
    selectRailCrossing,
    hitGeneratedRailCrossing,
    drawGeneratedRailCrossings,
  } = createSiteRoadCrossingController({
    state,
    ctx,
    dist,
    normalizeBenchworkOutline,
    benchworkSamples,
    normalizeRoad,
    normalizeTrack,
    roadCenterlineSamples,
    trackPathSamples,
    roadSystem,
    drawRoadFeature,
    drawRoadExportPreview,
    selectedSiteObjectCount,
    currentSelectedBuildingIds,
    clearBuildingSelection,
    clearSelectedSiteObjects,
    renderList,
    renderRoads,
    renderStreetlights,
    renderSelected,
    draw,
    drawLabel,
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

  let siteBuildingPlacementController=null;
  function ensureSiteBuildingPlacementController(){
    if(!siteBuildingPlacementController){
      siteBuildingPlacementController=createSiteBuildingPlacementController({
        state,canvas,getElement:$,uid,colors,slug,fmt,mmToPx,pxToMm,positiveNumber,deriveFootprintFromHakoConfig,
        applyHakoConfigToPlannerFootprint,githubRecordPlacementShape,githubPlacementPreviewPolygon,normalizeBuilding,
        syncBuildingMetrics,setBuildingSelection,syncAll,closeGithubModal,showStatusHint,draw,
      });
    }
    return siteBuildingPlacementController;
  }
  function visibleWorldCenter(){ return ensureSiteBuildingPlacementController().visibleWorldCenter(); }
  function selectedFootprintSizeMm(building){ return ensureSiteBuildingPlacementController().selectedFootprintSizeMm(building); }
  function footprintSizesMatch(currentSize, incomingSize){ return ensureSiteBuildingPlacementController().footprintSizesMatch(currentSize, incomingSize); }
  function storeHakoFileOnBuilding(building, fileName, text, parsed, options={}){ return ensureSiteBuildingPlacementController().storeHakoFileOnBuilding(building, fileName, text, parsed, options); }
  function confirmSelectedHakoSizeMismatch(building, currentSize, incomingSize, fileName){ return ensureSiteBuildingPlacementController().confirmSelectedHakoSizeMismatch(building, currentSize, incomingSize, fileName); }
  function createBuildingFromImportedHako(fileName, text, parsed){ return ensureSiteBuildingPlacementController().createBuildingFromImportedHako(fileName, text, parsed); }
  function armGithubBuildingPlacement(record){ return ensureSiteBuildingPlacementController().armGithubBuildingPlacement(record); }
  function cancelGithubBuildingPlacement(){ return ensureSiteBuildingPlacementController().cancelGithubBuildingPlacement(); }
  function placeGithubBuildingAt(center){ return ensureSiteBuildingPlacementController().placeGithubBuildingAt(center); }

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
  const {
    buildSite3DBase,
    buildSite3DReferenceImage,
    buildSite3DRoadGroup,
    buildSite3DTrackGroup,
    buildSite3DSelectionHelper,
    buildSite3DBuildingGroup,
    buildSite3DCatenaryItem,
    buildSite3DTrackSwitchItem,
    buildSite3DTrackBufferItem,
    buildSite3DTrackAccessoryGroup,
    buildSite3DStlObjectGroup,
  } = createSite3DRendererFacade({
    base: {
      THREE, state, signedArea2D, site3DScale, site3DBenchworkFootprintsMm,
      normalizeBenchworkOutline, benchworkSamples,
      applySite3DSettings: (...args) => applySite3DSettings(...args),
    },
    road: {
      THREE, state, normalizeRoad, syncRoadMetrics, roadDisplayPolygons,
      shouldClipRoadsToBenchwork, clipPolygonToBenchwork, site3DAddFlatPolygon,
      normalizeRoadFeature, isSiteObjectSelected, tagSite3DRoadObject,
      tagSite3DRoadFeatureObject, roadSystem, markingPresetByKey, rad,
    },
    track: {
      THREE, state, trackProfileDefaults: TRACK_PROFILE_DEFAULTS, positiveNumber,
      site3DScale, normalizeTrack, trackPathSamples, trackProfilePx,
      offsetPathPolygon, site3DAddRaisedPolygon, trackTieSegments,
      tagSite3DTrackObject, offsetTrackPath, site3DAddBoxSegments,
    },
    building: {
      THREE, logger, site3DScale, site3DMaterial, site3DBox, site3DAddEdges,
      site3DBuildingFootprintMm, site3DBuildingCenterMm, site3DBuildingConfig,
      site3DGeneratorBuildingConfig, site3DBuildingHeightMm, site3DFloorCount,
      site3DBuildingElevationMm, site3DPlannerRotationY,
      site3DGeneratorModelOriginOffset, site3DGeneratorModelRotationY,
      visibleBuildingPolygons, tagSite3DBuilding, positiveNumber,
    },
    trackAccessories: {
      THREE, state, trackProfileDefaults: TRACK_PROFILE_DEFAULTS, rad, clamp,
      site3DScale, site3DAddEdges, site3DBox, site3DBeam, isSiteObjectSelected,
      tagSite3DTrackAccessory, refreshTrackAccessoryAnchor, normalizeTrackAccessory,
      trackAccessoryLabel, isCatenaryAccessoryKind, isTrackSwitchAccessoryKind,
      isTrackBufferAccessoryKind, trackBufferHasCatenaryTerminal,
      trackSwitchDirection, trackSwitchGeometrySite3D, trackSwitchCurvePoints,
      trackSwitchMainPathPoints, polylineLength, pointAtPolylineDistance,
      offsetTrackPath, trackBufferGeometrySite3D,
    },
    stl: {
      THREE, logger, base64ToArrayBuffer, boundsFromVertices,
      estimateStlTriangleCount, parseStlVertices, normalizeStlObject,
      site3DScale, mmToPx, site3DMaterial, tagSite3DStlObject,
    },
  });
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
  let site3DLifecycleController=null;
  function ensureSite3DLifecycleController(){
    if(!site3DLifecycleController){
      site3DLifecycleController=createSite3DLifecycleController({
        windowRef:window,documentRef:document,state,site3d,THREE,canvas,wrap,getElement:$,logger,installThreeRenderCanvas,
        handleSite3DPointerUp,renderSite3D,updateEmptyImageOverlay,updateSite3D,draw,
      });
    }
    return site3DLifecycleController;
  }
  function initSite3D(){ return ensureSite3DLifecycleController().initSite3D(); }
  function resizeSite3D(){ return ensureSite3DLifecycleController().resizeSite3D(); }
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
  function setSite3DMode(on){ return ensureSite3DLifecycleController().setSite3DMode(on); }
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
  const {
    updateHistoryButtons,
    pushHistorySnapshot,
    resetHistory,
    undo,
    redo,
  } = createSiteHistoryController({
    state,
    getElement:$,
    logger,
    historySnapshot,
    normalizeTrack,
    normalizeTrackAccessory,
    migrateLoadedRoadFeatures,
    normalizeDrivingSide,
    syncAll,
    updateImagePortableStatus,
    setImageStatus,
    markDirty,
  });

  function markDirty(reason='', opts={}){
    if(opts.history!==false && !state.historySuppressed) pushHistorySnapshot(reason);
    if(!state.autosaveReady || autosaveSuppressed) return;
    state.dirty=true;
    state.dirtySinceManualSave=true;
    updateAutosaveStatus();
    scheduleAutosave();
  }

  function makeProjectPayload(opts={}){
    return ensureSiteProjectPersistenceController().makeProjectPayload(opts);
  }
  const {
    scheduleAutosave,
    writeAutosave,
    markManualSaveComplete,
  } = createSiteAutosaveController({
    state,
    autosaveKey:AUTOSAVE_KEY,
    autosaveMetaKey:AUTOSAVE_META_KEY,
    getTimer:()=>autosaveTimer,
    setTimer:value=>autosaveTimer=value,
    makeProjectPayload,
    localStorage,
    logger,
    updateImagePortableStatus,
    updateAutosaveStatus,
  });
  const {
    applySite3DSettings,
    syncSite3DControls,
    bindSite3DButtons,
  } = createSite3DUiController({
    state,
    getElement:$,
    clamp,
    defaultImageOpacity:SITE3D_DEFAULT_IMAGE_OPACITY,
    setSite3DMode,
    updateSite3D,
    markDirty,
  });


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

  let sidebarSelectionFacade=null;
  function clearPlanObjectSelection(){ return sidebarSelectionFacade.clearPlanObjectSelection(); }
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
  function ensureSidebarSelectedDetailController(){
    if(!sidebarSelectedDetailController){
      sidebarSelectedDetailController=createSidebarSelectedDetailController({
        selected,
        getElement:$,
        selectedAnnotation,
        selectedRoadIntersection,
        selectedRailCrossing,
        selectedRoadFeature,
        selectedRoad,
        selectedTrack,
        selectedBenchwork,
        selectedStreetlight,
        selectedFabric,
        selectedStlObject,
        currentSelectedBuildingIds,
        selectedTrackAccessory,
        renderMultiBuildingDetail,
        state,
        clearBuildingSelection,
        syncAll,
        renderTrackAccessoryDetail,
        fmt,
        escapeAttr,
        escapeHtml,
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
        renderRoadIntersectionDetail,
        roadSystem,
        roadIntersectionKey,
        normalizeIntersectionOverride,
        roadArmKey,
        renderRailCrossingDetail,
        railCrossingOverrideKey,
        normalizeRailCrossingOverride,
        RAIL_CROSSING_CENTER_CLEARANCE_MM,
        renderRoadFeatureDetail,
        mmToPx,
        normalizeRoadFeature,
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
        renderRoadDetail,
        normalizeRoad,
        syncRoadMetrics,
        ROAD_WIDTH_PRESETS,
        SIDEWALK_WIDTH_PRESETS,
        presetOptionsHtml,
        currentScaleDivisor,
        applyRoadWidthPreset,
        applySidewalkWidthPreset,
        normalizeDrivingSide,
        roadIntersectionMarkingControls,
        showStatusHint,
        deleteSelectedRoad,
        renderTrackDetail,
        normalizeTrack,
        syncTrackMetrics,
        deleteSelectedTrackPoint,
        deleteSelectedTrack,
        renderBenchworkDetail,
        normalizeBenchworkOutline,
        deleteSelectedBenchwork,
        renderStreetlightDetail,
        normalizeStreetlight,
        duplicateStreetlight,
        deleteSelectedStreetlight,
        renderFabricDetail,
        FABRIC_PRESETS,
        normalizeFabricRegion,
        generateFabricForRegion,
        deleteSelectedFabricRegion,
        renderStlDetail,
        slug,
        normalizeStlObject,
        attachSourceFileToStlObject,
        downloadBase64,
        deleteSelectedStlObject,
        renderAnnotationDetail,
        deleteSelectedAnnotation,
        renderBuildingDetail,
        syncBuildingMetrics,
        syncSelectedBuildingLive,
        site3DBuildingHeightMm,
        site3DBuildingConfig,
        site3DBuildingElevationMm,
        hakoFileSummary,
        hakoFileText,
        renameAttachedHakoFileForBuilding,
        applySelectedBuildingDimensionInput,
        attachHakoFileToSelectedBuilding,
        downloadText,
        openBuildingInHakoMachi,
        copyHakoSeedForBuilding,
        transformedRect,
      });
    }
    return sidebarSelectedDetailController;
  }
  function renderSelectedCore(){
    return ensureSidebarSelectedDetailController().renderSelectedCore();
  }

  function activeSidebarDetailKind(){ return sidebarSelectionFacade.activeSidebarDetailKind(); }
  function activeSidebarDetailTitle(kind){ return sidebarSelectionFacade.activeSidebarDetailTitle(kind); }
  sidebarDetailController=createSidebarDetailController({
    state,
    getElement:$,
    hydrateIcons,
    activeDetailKind:activeSidebarDetailKind,
    detailTitle:activeSidebarDetailTitle,
    sidebarTypeForDetailKind,
    currentSelectedBuildingIds,
    setSidebarObjectType,
    clearPlanObjectSelection,
    hideContextMenu,
    renderList,
    renderRoads,
    renderStreetlights,
    refreshSelection:renderSelected,
    updateHandoff,
    draw,
    selected,
    duplicateBuildingFootprint,
    clearBuildingSelection,
    syncAll,
    setSidebarOpen,
  });
  sidebarSelectionFacade=createSiteSidebarSelectionFacade({
    state,clearBuildingSelection,clearSelectedSiteObjects,currentSelectedBuildingIds,
    activeSidebarDetailKindForState,sidebarDetailTitle,renderObjectBrowser,renderSelectedCore,
    applySidebarDrillIn:()=>sidebarDetailController?.applySidebarDrillIn(),
  });
  function renderSelected(){ return sidebarSelectionFacade.renderSelected(); }

  const {
    addRectFromDrag,
    resizeRectFromCorner,
    scalePolygonFromCornerDrag,
    rotationSnapAngle,
    shiftScaleActive,
    snapActive,
    isGeometryPointer,
    startPanFromPointer,
    pointerSnapshot,
    startPinchIfNeeded,
    updatePinch,
  } = createSiteCanvasGestureController({
    state,
    canvas,
    uid,
    colors,
    transformedRect,
    rad,
    polygonCenter,
    dist,
    clamp,
    syncBuildingMetrics,
    isTrackAccessoryAction,
  });

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
  const siteCanvasHoverController = createSiteCanvasHoverController({
    state,
    draw,
    hitStreetlight,
    selectedRoad,
    hitRoadOutlineSegment,
    hitRoadCenterlineSegment,
    hitBenchworkSegment,
    selectedBenchwork,
    hitBenchwork,
    hitRoad,
    hitTrackAccessory,
    hitTrack,
    selectedTrack,
    hitTrackSegment,
    hitStlObject,
    hitTest,
    selected,
    handleAt,
  });

  const siteCanvasPointerMoveController=createSiteCanvasPointerMoveController({
    state,
    addRectFromDrag,
    snapActive,
    createRoadCenterline,
    addAnnotationPoint,
    applySiteObjectMoveFromOrig,
    applySiteObjectRotationFromOrig,
    finalizeMovedSiteObject,
    rotationSnapAngle,
    deg,
    isTrackSwitchAccessoryKind,
    snapTrackSwitchToEndpoint,
    normalizeTrackAccessory,
    syncTracksConnectedToTrackSwitch,
    nearestTrackAccessoryAnchor,
    trackAccessorySnapDistance,
    isCatenaryAccessoryKind,
    attachTrackAccessoryToAnchor,
    normalizeStlObject,
    normalizeBenchworkOutline,
    syncRoadMetrics,
    syncTrackMetrics,
    syncTrackEndpointToSwitchConnection,
    syncConnectedTrackEndpoint,
    snapTrackPointForConnection,
    moveTrackPointWithAdjacentCurves,
    setTrackEndpointConnection,
    snapRoadPointForConnection,
    setRoadEndpointConnection,
    normalizeRoad,
    normalizeTrackCurves,
    syncBuildingMetrics,
    selected,
    shiftScaleActive,
    scalePolygonFromCornerDrag,
    resizeRectFromCorner,
    buildingCenter,
    rad,
  });
  const siteCanvasPointerDownController=createSiteCanvasPointerDownController({
    state,
    canvas,
    clearCanvasBrowserSelection,
    hideContextMenu,
    pointerSnapshot,
    startPanFromPointer,
    startPinchIfNeeded,
    screenToWorld,
    selected,
    isGeometryPointer,
    placeGithubBuildingAt,
    hitGeneratedRailCrossing,
    selectRailCrossing,
    hitRoadFeature,
    handleSiteObjectPointerHit,
    placeRoadFeature,
    hitGroupRotationHandle,
    isCatenaryAutoSectionAction,
    handleCatenaryAutoTrackClick,
    isTrackAccessoryAction,
    hitTrackAccessoryRotationHandle,
    selectTrackAccessory,
    hitTrackAccessory,
    placeTrackAccessory,
    startExistingObjectInteraction,
    startAnnotationStroke,
    selectedBenchwork,
    hitBenchworkSegment,
    hitBenchwork,
    clearBuildingSelection,
    renderRoads,
    renderList,
    renderStreetlights,
    renderSelected,
    draw,
    dist,
    finishBenchworkOutline,
    hitRoad,
    selectedRoad,
    hitRoadPoint,
    hitRoadOutlineSegment,
    hitRoadCenterlineSegment,
    snapRoadPointForConnection,
    finishRoadCenterline,
    finishRoadOutline,
    snapTrackPointForConnection,
    beginTrackContinuationFromSnap,
    selectedTrack,
    hitTrackPoint,
    hitTrackSegment,
    hitTrack,
    finishTrack,
    finishFabricRegion,
    finishPolygon,
    placeStreetlight,
    beginLongPress,
    hitStreetlight,
    hitStlObject,
    hitAnnotation,
    updateHandoff,
    handleAt,
    buildingCenter,
    hitTest,
    hitFabricRegion,
    currentSelectedBuildingIds,
  });
  canvas.addEventListener('pointerdown', e=>siteCanvasPointerDownController.handlePointerDown(e), {passive:false});
  canvas.addEventListener('pointermove', e=>{
    if(state.pointers.has(e.pointerId)) state.pointers.set(e.pointerId,pointerSnapshot(e));
    moveCancelsLongPress(e);
    const p=screenToWorld(e); $('statusMouse').textContent=state.pxPerMm?`Pointer: ${fmt(pxToMm(p.x))}, ${fmt(pxToMm(p.y))} mm (${e.pointerType})`:`Pointer: ${fmt(p.x)}, ${fmt(p.y)} px (${e.pointerType})`;
    if(state.drag?.type==='pinch'){e.preventDefault(); updatePinch(); draw(); return;}
    if(!state.drag && siteCanvasHoverController.handleIdlePointerMove(e,p)) return;
    if(state.drag.pointerId!==undefined && state.drag.pointerId!==e.pointerId) return;
    e.preventDefault();
    siteCanvasPointerMoveController.handleActivePointerMove(e,p);
    draw();
  }, {passive:false});
  const siteCanvasPointerFinishController = createSiteCanvasPointerFinishController({
    state,
    canvas,
    clearCanvasBrowserSelection,
    clearLongPress,
    draw,
    setBuildingSelection,
    renderList,
    renderSelected,
    updateHandoff,
    selectionRectFromPoints,
    buildingsInSelectionRect,
    setSelectedSiteObjects,
    clearBuildingSelection,
    clearSelectedSiteObjects,
    dist,
    renderRoads,
    selected,
    buildingFootprintChanged,
    confirmProtectedBuildingResize,
    cloneSitePlannerValue,
    restoreBuildingSnapshot,
    syncAll,
    screenToWorld,
    hitRoad,
    renderStreetlights,
    finishRoadCenterline,
    finishRoadOutline,
    finishTrack,
  });
  canvas.addEventListener('pointerup', siteCanvasPointerFinishController.finishPointer);
  canvas.addEventListener('pointercancel', siteCanvasPointerFinishController.finishPointer);
  canvas.addEventListener('dblclick', siteCanvasPointerFinishController.handleCanvasDoubleClick);
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
  const siteCanvasKeyboardController = createSiteCanvasKeyboardController({
    state,
    windowRef: window,
    hideContextMenu,
    cancelGithubBuildingPlacement,
    renderSelected,
    draw,
    deleteSelectedAnnotation,
    deleteSelectedRoadFeature,
    deleteSelectedStreetlight,
    deleteSelectedRoad,
    currentSelectedBuildingIds,
    deleteSelectedTrackAccessory,
    deleteSelectedTrackPoint,
    deleteSelectedTrack,
    deleteSelectedStlObject,
    deleteSelectedBenchwork,
    deleteSelectedFabricRegion,
    clearBuildingSelection,
    syncAll,
    undo,
    redo,
    copySelectedFootprint,
    copySelectedSiteObject,
    pasteSiteObjectFromClipboard,
    pasteFootprintFromClipboard,
    finishPolygon,
    finishBenchworkOutline,
    finishRoadOutline,
    finishRoadCenterline,
    finishTrack,
  });
  siteCanvasKeyboardController.bindKeyboardShortcuts();
  function finishPolygon(){if(state.polygonDraft.length<3) return; const b={id:uid('bldg'),name:`Building ${state.buildings.length+1}`,padType:'polygon',pointsPx:state.polygonDraft.slice(),rotationDeg:0,category:'industrial',color:colors[state.buildings.length%colors.length],hidden:false,locked:false,state:'notStarted',notes:'',hakoConfig:null,hakoFile:null,hakoFileId:null}; syncBuildingMetrics(b); state.buildings.push(b); setBuildingSelection([b.id], b.id); state.polygonDraft=[]; syncAll();}
  const siteToolControlsController = createSiteToolControlsController({
    state,
    documentRef: document,
    windowRef: window,
    getElement: $,
    createWorkspaceModeController,
    createRoadToolTaskController,
    createTrackToolTaskController,
    createToolVariantController,
    finishRoadCenterline,
    finishRoadOutline,
    finishTrack,
    hideToolFlyouts,
    updateStatus,
    draw,
    syncAll,
    roadSystem,
    renderSelected,
    setSidebarOpen,
    setRoadExportPreview,
    openRoadExportReview,
    trackAccessoryLabel,
    isTrackAccessoryAction,
    isCatenaryAutoSectionAction,
    fmt,
    catenarySpacingModelMm: CATENARY_SPACING_MODEL_MM,
    catenaryPrototypeSpacingM: CATENARY_PROTOTYPE_SPACING_M,
    setIcon,
    hydrateIcons,
    toggleToolFlyout,
  });
  ({ setWorkspaceMode, updateWorkspaceModeUi } = siteToolControlsController);

  const { clearCacheAndReset } = createSiteResetController({
    state,
    getElement:$,
    logger,
    document,
    window,
    localStorage,
    sessionStorage,
    caches,
    wrap,
    applySite3DSettings,
    syncSite3DControls,
    clearLongPress,
    hideContextMenu,
    updateImagePortableStatus,
    rememberGithubSiteSource,
    resetHistory,
    setImageStatus,
    syncAll,
    updateAutosaveStatus,
  });

  installTopMenus({getElement:$, closeSidebarBuildingOverflow:()=>sidebarDetailController?.closeBuildingOverflow()});
  function exportSelectedSeed(){
    const b=selected();
    if(!b) return showStatusHint('Select a building first.', 'warning');
    downloadText(JSON.stringify(makeSeed(b),null,2),`${slug(b.name)}-hakomachi-seed.json`,'application/json');
  }
  const {
    loadProject,
    loadProjectJsonObject,
    loadSitePlanBundle,
    openGithubSettings,
    openGithubSitePlans,
    openGithubBuildings,
    saveCurrentSitePlan,
    saveSitePlanToGithub,
  } = createSiteProjectWorkflowFacade({
    githubAssets: {
      state, defaultSiteDir:GITHUB_DEFAULT_SITE_DIR, dataUrlInfo, githubImageAssetPath,
      imageAssetReference, setGithubProgress, writeGithubBase64File, cacheImageAsset,
      normalizeBuilding, hakoFileText, uniqueHakoAssetFileName, githubHakoAssetPath,
      hakoFileAssetReference, textToBase64, normalizeStlObject, uniqueStlAssetFileName,
      githubStlAssetPath, stlAssetReference, uniqueStlSourceAssetFileName,
      githubStlSourceAssetPath, stlSourceAssetReference, cachedImageAsset,
      setGithubStatus, readGithubBase64File, dataUrlFromBase64, base64ToText,
    },
    githubSave: {
      defaultSiteDir:GITHUB_DEFAULT_SITE_DIR, createPersistenceDiagnostics,
      getGithubSettings, requireGithubSettings, setGithubStatus, getCurrentGithubSite,
      projectJson, githubProjectName, prompt, openGithubSaveProgressModal,
      setGithubProgress, slug, cleanRepoPath:githubData.cleanRepoPath,
      summarizePersistenceAssets, githubSiteAssetFolderPath, diagnosticByteLength,
      writeGithubFile, loadGithubLibrary, upsertGithubSitePlan, githubSiteRecord,
      rememberGithubSiteSource, markManualSaveComplete, closeGithubModal,
    },
    githubLoad: {
      createPersistenceDiagnostics, getGithubSettings, requireGithubSettings,
      setGithubStatus, readGithubFile, diagnosticByteLength, isGithubContentsMetadata,
      normalizeLoadedSitePlanPayload, rememberGithubSiteSource, closeGithubModal,
      showStatusHint,
    },
    githubLibrary: {
      getElement: $, getGithubSettings, setGithubSettings, requireGithubSettings,
      openGithubModal, closeGithubModal, setGithubStatus, loadGithubLibrary,
      normalizeGithubLibrary, escapeAttr, escapeHtml, windowRef: window,
      documentRef: document, armGithubBuildingPlacement, renderGithubBuildingStill,
      githubBuildingPreviewConfig, upgradeGithubBuildingPreviewFromHako,
      promptFn: prompt,
    },
    bundle: {
      windowRef:window, state, createPersistenceDiagnostics, buildLocalImageBundleAsset,
      buildLocalHakoBundleAssets, buildLocalStlBundleAssets, cachedImageAsset,
      imageAssetReference, imageAssetFileName, dataUrlInfo, normalizeBuilding,
      hakoFileText, uniqueHakoAssetFileName, hakoFileAssetReference,
      normalizeStlObject, uniqueStlAssetFileName, stlAssetReference,
      uniqueStlSourceAssetFileName, stlSourceAssetReference, projectJson,
      summarizePersistenceAssets, cacheImageAsset, downloadBlob, markManualSaveComplete,
      showStatusHint, normalizeLoadedSitePlanPayload, rememberGithubSiteSource,
      githubSiteSourceFromProject, findSiteBundleProjectName, diagnosticByteLength,
      hydrateSiteBundleAssets, dataUrlFromBase64,
    },
    projectLoad: {
      windowRef:window, documentRef:document, state, canvas, getElement:$,
      setAutosaveSuppressed:value=>{autosaveSuppressed=value;}, restoreProjectView,
      applySite3DSettings, syncSite3DControls, wrap, collectProjectBuildings,
      footprintLoadMessage, savedImageDimensions, normalizeRoad, normalizeTrack,
      normalizeTrackAccessory, migrateLoadedRoadFeatures, normalizeDrivingSide,
      normalizeStlObject, normalizeBenchworkOutline, normalizeFabricRegion,
      normalizeStreetlight, clearBuildingSelection, setImageStatus,
      updateImagePortableStatus, scaleLoadedPixelGeometry, loadAlignmentMessage,
      fitImage, syncAll, resetHistory, updateAutosaveStatus,
    },
    activeGithubSiteSource,
  });
  const legacyOpenBtn=$('openHakoBtn');
  if(legacyOpenBtn) legacyOpenBtn.onclick=()=>openBuildingInHakoMachi();
  function projectJson(opts={}){
    return ensureSiteProjectPersistenceController().projectJson(opts);
  }
  function csvExport(){syncAll(); return buildingCsvExport(state.buildings, {normalizeBuilding});}

  function svgExport(){
    syncAll();
    const w=state.image?.width||1200,h=state.image?.height||800;
    return sitePlanSvgExport({state, width:w, height:h, tracksSvg:''}, {buildingCenter, escapeHtml, mmToPx, normalizeBenchworkOutline, normalizeRoad, normalizeRoadFeature, normalizeStreetlight, polygonCenter, visibleBuildingPolygons});
  }
  function slug(s){return githubData.slugify(s, 'building');}

  const sitePageControlsController = createSitePageControlsController({
    state,
    getElement: $,
    installTooltips,
    installReferenceImageImport,
    draw,
    modelKnownMm,
    dist,
    showStatusHint,
    confirmFn: confirm,
    syncAll,
    renderSelected,
    markDirty,
    fitImage,
    clearCacheAndReset,
    openGithubSettings,
    openGithubSitePlans,
    openGithubBuildings,
    saveCurrentSitePlan,
    saveSitePlanToGithub,
    undo,
    redo,
    deleteSelectedAnnotation,
    isLikelyStlFile,
    importStlAsSiteObject,
    openImportProgressModal,
    isSiteBundlePackageFile,
    setImportProgress,
    loadSitePlanBundle,
    loadProjectJsonObject,
    finishImportProgress,
    failImportProgress,
    setRoadExportPreview,
    openRoadExportReview,
    downloadText,
    csvExport,
    svgExport,
    exportSelectedSeed,
    updatePrimarySaveUi,
  });
  sitePageControlsController.bindPageControls();

  const siteRuntimeLifecycleController = createSiteRuntimeLifecycleController({
    state, windowRef: window, localStorageRef: localStorage, sessionStorageRef: sessionStorage,
    autosaveKey: AUTOSAVE_KEY, autosaveMetaKey: AUTOSAVE_META_KEY, buildingUpdateKey: SITE_PLANNER_BUILDING_UPDATE_KEY, logger,
    loadProject, writeAutosave, sitePlannerBuildingUpdatePayload, applySitePlannerBuildingUpdate, acknowledgeSitePlannerBuildingUpdate,
    bindSite3DButtons, installWholePageHakoDrop, installSelectedHakoSidebarDrop, resize, rememberGithubSiteSource, syncAll, fitImage,
    resetHistory, updateHistoryButtons, processQueuedSitePlannerBuildingUpdate,
  });
  siteRuntimeLifecycleController.bindWindowLifecycle();
  siteRuntimeLifecycleController.boot();
})();
