import githubData from './shared/github-data.js?v=hm-assets-20260717-1';
import { base64ToArrayBuffer, base64ToText, dataUrlFromBase64, dataUrlInfo, downloadBase64, downloadBlob, downloadText, escapeAttr, escapeHtml, formatBytes, installCanvasGestureBoundary, installThreeRenderCanvas, textToBase64 } from './shared/browser-utils.js';
import { createHakoMachiLogger } from './shared/hakomachi-diagnostics.js';
import { SVG_FABRICATION_OPERATIONS, svgFabricationColor } from './shared/svg-fabrication-colors.js';
import { createAutosaveUiController } from './site-planner/autosave-ui.js';
import { createSiteAutosaveController } from './site-planner/site-autosave-controller.js';
import { createBuildingResizeProtectionController } from './site-planner/building-resize-protection.js';
import { createBuildingSelectionController } from './site-planner/building-selection-utils.js';
import { createCanvasDrawingController } from './site-planner/canvas-drawing-utils.js';
import { createCatenaryAutoPlacementController } from './site-planner/catenary-auto-placement-controller.js';
import { createRoadToolTaskController } from './site-planner/road-tool-task-controller.js';
import { createTrackToolTaskController } from './site-planner/track-tool-task-controller.js';
import { createCanvasHoverPreviewRenderer } from './site-planner/canvas-hover-preview-renderer.js';
import { createGroupSelectionController } from './site-planner/group-selection-controller.js';
import { createSiteBuildingRenderer2D } from './site-planner/site-building-renderer-2d.js';
import { createSiteBuildingPlacementController } from './site-planner/site-building-placement-controller.js';
import { createSiteCanvasRenderer } from './site-planner/site-canvas-renderer.js';
import { createSiteCanvasGestureController } from './site-planner/site-canvas-gesture-controller.js';
import { createSiteCanvasHoverController } from './site-planner/site-canvas-hover-controller.js';
import { createSiteCanvasKeyboardController } from './site-planner/site-canvas-keyboard-controller.js';
import { createSiteCanvasPointerMoveController } from './site-planner/site-canvas-pointer-move-controller.js';
import { createSiteCanvasPointerDownController } from './site-planner/site-canvas-pointer-down-controller.js';
import { createSiteCanvasPointerFinishController } from './site-planner/site-canvas-pointer-finish-controller.js';
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
import { createGithubSiteAssetController } from './site-planner/github-site-asset-controller.js';
import { createGithubSiteLoadController } from './site-planner/github-site-load-controller.js';
import { createGithubSiteSaveController } from './site-planner/github-site-save-controller.js';
import { createGithubSiteSourceController } from './site-planner/github-site-source-controller.js';
import { githubPlacementPreviewPolygon, githubRecordPlacementShape } from './site-planner/github-building-placement-utils.js';
import { createGithubBuildingPreviewRenderer } from './site-planner/github-building-preview-renderer.js';
import { createGithubLibraryUiController } from './site-planner/github-library-ui-controller.js';
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
import { createSidebarDetailController } from './site-planner/sidebar-detail-controller.js';
import { createSidebarObjectBrowserController } from './site-planner/sidebar-object-browser-controller.js';
import { createSidebarSelectedDetailController } from './site-planner/sidebar-selected-detail-controller.js';
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
import { createSite3DBaseRenderer } from './site-planner/site-3d-base-renderer.js';
import { createSite3DBuildingConfigController } from './site-planner/site-3d-building-config.js';
import { createSite3DUiController } from './site-planner/site-3d-ui-controller.js';
import { createSite3DTrackAccessoryRenderer } from './site-planner/site-3d-track-accessory-renderer.js';
import { createSite3DBuildingRenderer } from './site-planner/site-3d-building-renderer.js';
import { createSite3DMeshUtils } from './site-planner/site-3d-mesh-utils.js';
import { createSite3DObjectTagging } from './site-planner/site-3d-object-tagging.js';
import { createSite3DInteractionController } from './site-planner/site-3d-interaction-controller.js';
import { createSite3DLifecycleController } from './site-planner/site-3d-lifecycle-controller.js';
import { createSite3DRoadRenderer } from './site-planner/site-3d-road-renderer.js';
import { createSite3DSceneController } from './site-planner/site-3d-scene-controller.js';
import { createSite3DSceneUtils } from './site-planner/site-3d-scene-utils.js';
import { createSite3DTrackRenderer } from './site-planner/site-3d-track-renderer.js';
import { createSite3DStlRenderer } from './site-planner/site-3d-stl-renderer.js';
import { createSiteBuildingProjectController } from './site-planner/site-building-project-controller.js';
import { createSiteObjectSelectionController } from './site-planner/site-object-selection-controller.js';
import { createSitePointerInteractionController } from './site-planner/site-pointer-interaction-controller.js';
import { createSiteProjectPersistenceController } from './site-planner/site-project-persistence-controller.js';
import { createSiteProjectBundleController } from './site-planner/site-project-bundle-controller.js';
import { createSiteProjectLoadController } from './site-planner/site-project-load-controller.js';
import { createSiteRuntimeLifecycleController } from './site-planner/site-runtime-lifecycle-controller.js';
import { createSidebarUiController } from './site-planner/sidebar-ui.js';
import { createStatusUiController } from './site-planner/status-ui.js';
import { createStreetlightController } from './site-planner/streetlight-controller.js';
import { createStlImportController } from './site-planner/stl-import-controller.js';
import { createStlObjectModelController } from './site-planner/stl-object-model.js';
import { boundsFromVertices, estimateStlTriangleCount, isLikelyStlFile, parseStlVertices } from './site-planner/stl-utils.js';
import { svgFabricationAttrs, svgFeatureTransform, svgPathFromPoly } from './site-planner/svg-export-utils.js';
import { createTrackAccessoryGeometry } from './site-planner/track-accessory-geometry.js';
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
  let site3DBaseRenderer = null;
  let site3DTrackAccessoryRenderer = null;
  let site3DBuildingRenderer = null;
  let site3DStlRenderer = null;
  let githubBuildingPreviewRenderer = null;
  let siteObjectSelectionController = null;
  let sidebarObjectBrowserController = null;
  let sidebarSelectedDetailController = null;
  let sidebarDetailController = null;
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
  const trackAccessoryBrowserModel = createTrackAccessoryBrowserModel({ state, normalizeTrackAccessory });
  function trackAccessoryObjectFilterDefinition(key='all'){ return trackAccessoryBrowserModel.trackAccessoryObjectFilterDefinition(key); }
  function trackAccessoryMatchesObjectFilter(item, filterKey='all'){ return trackAccessoryBrowserModel.trackAccessoryMatchesObjectFilter(item, filterKey); }
  function trackAccessoryFilterCounts(){ return trackAccessoryBrowserModel.trackAccessoryFilterCounts(); }
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

  function activeSidebarDetailKind(){
    return activeSidebarDetailKindForState(state,currentSelectedBuildingIds());
  }
  function activeSidebarDetailTitle(kind){
    return sidebarDetailTitle(kind);
  }
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
  function renderSelected(){
    renderObjectBrowser();
    renderSelectedCore();
    sidebarDetailController?.applySidebarDrillIn();
  }

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
  const roadToolTaskController = createRoadToolTaskController({
    state,
    documentRef: document,
    getElement: $,
    setWorkspaceMode,
    setActiveTool,
    updateRoadToolButton,
    roadSystem,
    renderSelected,
    draw,
    setSidebarOpen,
    updateWorkspaceModeUi,
    setRoadExportPreview,
    openRoadExportReview,
  });
  roadToolTaskController.bindRoadToolControls();
  const trackToolTaskController = createTrackToolTaskController({
    state,
    documentRef: document,
    windowRef: window,
    getElement: $,
    setWorkspaceMode,
    setActiveTool,
    renderSelected,
    draw,
    setSidebarOpen,
    updateWorkspaceModeUi,
    trackAccessoryLabel,
    isTrackAccessoryAction,
    isCatenaryAutoSectionAction,
    fmt,
    catenarySpacingModelMm: CATENARY_SPACING_MODEL_MM,
    catenaryPrototypeSpacingM: CATENARY_PROTOTYPE_SPACING_M,
  });
  const { beginTrackAccessoryPlacement, beginCatenaryAutoSection } = trackToolTaskController;
  trackToolTaskController.bindTrackActionControls();

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
  installReferenceImageImport();
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
    saveGithubImageAsset,
    saveGithubHakoAssets,
    saveGithubStlAssets,
    resolveProjectImageFromGithub,
    resolveProjectHakoAssetsFromGithub,
    resolveProjectStlAssetsFromGithub,
  } = createGithubSiteAssetController({
    state,
    defaultSiteDir:GITHUB_DEFAULT_SITE_DIR,
    dataUrlInfo,
    githubImageAssetPath,
    imageAssetReference,
    setGithubProgress,
    writeGithubBase64File,
    cacheImageAsset,
    normalizeBuilding,
    hakoFileText,
    uniqueHakoAssetFileName,
    githubHakoAssetPath,
    hakoFileAssetReference,
    textToBase64,
    normalizeStlObject,
    uniqueStlAssetFileName,
    githubStlAssetPath,
    stlAssetReference,
    uniqueStlSourceAssetFileName,
    githubStlSourceAssetPath,
    stlSourceAssetReference,
    cachedImageAsset,
    setGithubStatus,
    readGithubBase64File,
    dataUrlFromBase64,
    base64ToText,
  });
  const {saveSitePlanToGithub}=createGithubSiteSaveController({
    defaultSiteDir:GITHUB_DEFAULT_SITE_DIR,
    createPersistenceDiagnostics,
    getGithubSettings,
    requireGithubSettings,
    openGithubSettings,
    setGithubStatus,
    getCurrentGithubSite,
    projectJson,
    githubProjectName,
    prompt,
    openGithubSaveProgressModal,
    setGithubProgress,
    slug,
    cleanRepoPath:githubData.cleanRepoPath,
    saveGithubImageAsset,
    saveGithubHakoAssets,
    saveGithubStlAssets,
    summarizePersistenceAssets,
    githubSiteAssetFolderPath,
    diagnosticByteLength,
    writeGithubFile,
    loadGithubLibrary,
    upsertGithubSitePlan,
    githubSiteRecord,
    rememberGithubSiteSource,
    markManualSaveComplete,
    closeGithubModal,
  });
  const {loadSitePlanFromGithub}=createGithubSiteLoadController({
    createPersistenceDiagnostics,
    getGithubSettings,
    requireGithubSettings,
    setGithubStatus,
    readGithubFile,
    diagnosticByteLength,
    isGithubContentsMetadata,
    normalizeLoadedSitePlanPayload,
    resolveProjectImageFromGithub,
    resolveProjectHakoAssetsFromGithub,
    resolveProjectStlAssetsFromGithub,
    loadProject,
    rememberGithubSiteSource,
    closeGithubModal,
    showStatusHint,
  });
  const githubLibraryUiController = createGithubLibraryUiController({
    getElement: $, getGithubSettings, setGithubSettings, requireGithubSettings, openGithubModal, closeGithubModal, setGithubStatus,
    loadGithubLibrary, normalizeGithubLibrary, escapeAttr, escapeHtml, windowRef: window, documentRef: document,
    loadSitePlanFromGithub, armGithubBuildingPlacement, renderGithubBuildingStill, githubBuildingPreviewConfig,
    upgradeGithubBuildingPreviewFromHako, promptFn: prompt,
  });
  function openGithubSettings(){ return githubLibraryUiController.openGithubSettings(); }
  function openGithubSitePlans(){ return githubLibraryUiController.openGithubSitePlans(); }
  function openGithubBuildings(){ return githubLibraryUiController.openGithubBuildings(); }
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
  const { saveSitePlanBundle, loadProjectJsonObject, loadSitePlanBundle } = createSiteProjectBundleController({
    windowRef:window,state,createPersistenceDiagnostics,buildLocalImageBundleAsset,buildLocalHakoBundleAssets,buildLocalStlBundleAssets,
    cachedImageAsset,imageAssetReference,imageAssetFileName,dataUrlInfo,normalizeBuilding,hakoFileText,uniqueHakoAssetFileName,hakoFileAssetReference,
    normalizeStlObject,uniqueStlAssetFileName,stlAssetReference,uniqueStlSourceAssetFileName,stlSourceAssetReference,projectJson,
    summarizePersistenceAssets,cacheImageAsset,downloadBlob,markManualSaveComplete,showStatusHint,normalizeLoadedSitePlanPayload,loadProject,
    rememberGithubSiteSource,githubSiteSourceFromProject,findSiteBundleProjectName,diagnosticByteLength,hydrateSiteBundleAssets,dataUrlFromBase64,
  });
  let siteProjectLoadController=null;
  function ensureSiteProjectLoadController(){
    if(!siteProjectLoadController){
      siteProjectLoadController=createSiteProjectLoadController({
        windowRef:window,documentRef:document,state,canvas,getElement:$,setAutosaveSuppressed:value=>{autosaveSuppressed=value;},
        restoreProjectView,applySite3DSettings,syncSite3DControls,wrap,collectProjectBuildings,footprintLoadMessage,savedImageDimensions,
        normalizeRoad,normalizeTrack,normalizeTrackAccessory,migrateLoadedRoadFeatures,normalizeDrivingSide,normalizeStlObject,normalizeBenchworkOutline,
        normalizeFabricRegion,normalizeStreetlight,clearBuildingSelection,setImageStatus,updateImagePortableStatus,scaleLoadedPixelGeometry,
        loadAlignmentMessage,fitImage,syncAll,resetHistory,updateAutosaveStatus,
      });
    }
    return siteProjectLoadController;
  }
  function loadProject(project, opts={}){ return ensureSiteProjectLoadController().loadProject(project, opts); }
  function csvExport(){syncAll(); return buildingCsvExport(state.buildings, {normalizeBuilding});}

  function svgExport(){
    syncAll();
    const w=state.image?.width||1200,h=state.image?.height||800;
    return sitePlanSvgExport({state, width:w, height:h, tracksSvg:''}, {buildingCenter, escapeHtml, mmToPx, normalizeBenchworkOutline, normalizeRoad, normalizeRoadFeature, normalizeStreetlight, polygonCenter, visibleBuildingPolygons});
  }
  function slug(s){return githubData.slugify(s, 'building');}

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
