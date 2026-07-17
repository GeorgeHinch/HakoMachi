import githubData from './shared/github-data.js?v=site2d-layout-cut-clipping-4';
import { base64ToArrayBuffer, base64ToText, dataUrlFromBase64, dataUrlInfo, downloadBase64, downloadBlob, downloadText, escapeAttr, escapeHtml, formatBytes, installCanvasGestureBoundary, installThreeRenderCanvas, textToBase64 } from './shared/browser-utils.js';
import { createHakoMachiLogger } from './shared/hakomachi-diagnostics.js';
import { SVG_FABRICATION_OPERATIONS, svgFabricationColor } from './shared/svg-fabrication-colors.js';
import { createAutosaveUiController } from './site-planner/autosave-ui.js';
import { createBuildingSelectionController } from './site-planner/building-selection-utils.js';
import { createCanvasDrawingController } from './site-planner/canvas-drawing-utils.js';
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
import { createGithubModalController } from './site-planner/github-modal-utils.js';
import { githubProjectName, githubSiteRecord, isGithubContentsMetadata, normalizeGithubLibrary, normalizeLoadedSitePlanPayload, upsertGithubSitePlan } from './site-planner/github-site-library.js';
import { createHakoDropController } from './site-planner/hako-drop-ui.js';
import { collectArrayFields, deriveFootprintFromHakoConfig, extractHakoTrimLinesMm } from './site-planner/hako-footprint-utils.js';
import { createHakoHandoffController } from './site-planner/hako-handoff-controller.js';
import { createHakoFileController } from './site-planner/hako-file-utils.js';
import { createHakoImportController } from './site-planner/hako-import-controller.js';
import { hydrateIcons, setIcon } from './site-planner/icons.js';
import { installAdaptiveDegreeStepping } from './site-planner/input-stepping.js';
import { findSiteBundleProjectName, hydrateSiteBundleAssets } from './site-planner/project-bundle-utils.js';
import { buildLocalHakoBundleAssets, buildLocalImageBundleAsset, buildLocalStlBundleAssets } from './site-planner/project-bundle-save-utils.js';
import { byteLength as diagnosticByteLength, createPersistenceDiagnostics, summarizePersistenceAssets } from './site-planner/persistence-diagnostics.js';
import { AUTOSAVE_KEY, AUTOSAVE_META_KEY, GITHUB_CURRENT_KEY, createInitialState } from './site-planner/state.js';
import { bboxOverlaps, clamp, closestPointOnSegment, deg, dist, distanceToSegment, fmt, pointInPoly, polygonArea, polygonCenter, rad, rectLocal, selectionRectFromPoints, transformedRect, uid } from './site-planner/geometry.js';
import { createImportProgressController } from './site-planner/import-progress-modal.js';
import { BUILDING_STATES, FABRIC_PRESETS, JP_ROAD_MARKING_STANDARD_ID, ROAD_WIDTH_PRESETS, SIDEWALK_WIDTH_PRESETS, TRACK_PROFILE_DEFAULTS } from './site-planner/presets.js';
import { loadAlignmentMessage, restoreProjectView, savedImageDimensions, scaleLoadedPixelGeometry } from './site-planner/project-load-utils.js';
import { createReferenceImageUiController } from './site-planner/reference-image-ui.js';
import { drainageGrateFamilyOptions, grateFamilyPresetByKey } from './site-planner/road-drainage-grate-inserts.js';
import { intersectionFeatureKey, normalizeIntersectionOverride, roadArmKey } from './site-planner/road-intersection-overrides.js';
import { createRoadSystemController } from './site-planner/road-system-controller.js';
import { createRoadAssetExportController } from './site-planner/road-asset-export-controller.js';
import { createRoadExportReviewController } from './site-planner/road-export-review-panel.js';
import { migrateRoadFeatures } from './site-planner/road-feature-migration.js';
import { createRoadPresetApplicationController } from './site-planner/road-preset-application-utils.js';
import { applyRoadHatchPreset, applyRoadMarkingPreset, hatchOptionsHtml, hatchPresetByKey, markingOptionsHtml, markingPresetByKey, presetModelMm, presetOptionsHtml, roadPresetByKey, sidewalkPresetByKey } from './site-planner/road-preset-utils.js';
import { buildRoadMarkingShapes } from './site-planner/road-marking-shapes.js';
import { RAIL_CROSSING_CENTER_CLEARANCE_MM, buildRailCrossingInfillPanels, buildRailCrossings, hitRailCrossing, normalizeRailCrossingOverride, railCrossingOverrideKey, railCrossingSvgRecords } from './site-planner/rail-crossing-generator.js';
import { createScaleInputController } from './site-planner/scale-input-utils.js';
import { activeSidebarDetailKindForState, activeSidebarDetailTitle as sidebarDetailTitle, sidebarObjectsForType as objectsForSidebarType, sidebarObjectSelected, sidebarObjectTypeMetaForState, sidebarObjectTypesForState, sidebarTypeForDetailKind } from './site-planner/sidebar-object-model.js';
import { createSidebarUiController } from './site-planner/sidebar-ui.js';
import { createStatusUiController } from './site-planner/status-ui.js';
import { createStreetlightController } from './site-planner/streetlight-controller.js';
import { createStlImportController } from './site-planner/stl-import-controller.js';
import { createStlObjectModelController } from './site-planner/stl-object-model.js';
import { boundsFromVertices, estimateStlTriangleCount, isLikelyStlFile, parseStlVertices } from './site-planner/stl-utils.js';
import { svgFabricationAttrs, svgFeatureTransform, svgPathFromPoly } from './site-planner/svg-export-utils.js';
import { installTopMenus } from './site-planner/top-menu-utils.js';
import { createTrackController } from './site-planner/track-controller.js';
import { createToolFlyoutController } from './site-planner/tool-flyout-utils.js';
import { createToolTooltipController } from './site-planner/tool-tooltip-controller.js';
import { createToolVariantController } from './site-planner/tool-variant-controller.js';
import { createViewTransformController } from './site-planner/view-transform-utils.js';
import { createWorkspaceModeController } from './site-planner/workspace-mode-controller.js';
import { clipPolygonByHalfPlane } from './building-generator/core/layout-cut-geometry.js?v=shared-building-preview-26';

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
  const SITE3D_REFERENCE_IMAGE_Y_MM = 0.045;
  const SITE3D_REFERENCE_IMAGE_RENDER_ORDER = 20;
  const SITE3D_STL_MAX_TRIANGLES = 50000;
  const CATENARY_PROTOTYPE_SPACING_M = 30;
  const CATENARY_JAPANESE_N_SCALE = 150;
  const CATENARY_SPACING_MODEL_MM = CATENARY_PROTOTYPE_SPACING_M * 1000 / CATENARY_JAPANESE_N_SCALE;
  const TOMIX_TURNOUT_RADIUS_MM = 541;
  const TOMIX_TURNOUT_ANGLE_DEG = 15;
  const TOMIX_TURNOUT_ANGLE_RAD = TOMIX_TURNOUT_ANGLE_DEG * Math.PI / 180;
  const TOMIX_TURNOUT_LENGTH_MM = TOMIX_TURNOUT_RADIUS_MM * Math.sin(TOMIX_TURNOUT_ANGLE_RAD);
  const TOMIX_TURNOUT_OFFSET_MM = TOMIX_TURNOUT_RADIUS_MM * (1 - Math.cos(TOMIX_TURNOUT_ANGLE_RAD));
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
    trackBufferTomix1428: { label: 'Tomix 1428 Buffer Stop', color: '#6f6a5e', defaultNotes: 'Tomix 1428 style end-of-track buffer stop marker.' },
    trackBufferTomix1428Catenary: { label: 'Tomix 1428 Buffer + Catenary Terminal', color: '#6f6a5e', defaultNotes: 'Tomix 1428 style buffer stop marker with catenary end terminal enabled.' },
    catenarySingleSide: { label: 'Single-side Catenary Pole', color: '#f2f0e8', defaultNotes: 'Single-track catenary pole with one side mast and outreach arm.' },
    catenaryDoublePortal: { label: 'Double-track Catenary Portal', color: '#f2f0e8', defaultNotes: 'Double-track catenary gantry with poles on both sides.' },
  });
  let autosaveTimer = null;
  let autosaveSuppressed = false;
  let renderQueued = false;
  let activeSidebarDetailKey = null;
  let sidebarObjectType = null;
  let trackAccessoryObjectFilter = 'all';
  let roadSystem = null;
  let roadAssetExporter = null;
  let roadExportReview = null;
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
  } = createStlObjectModelController({
    state,
    uid,
    slug,
    mmToPx,
    visibleWorldCenter,
    transformedRect,
    pointInPoly,
    polyEdgeDistance,
    lockedHitTolerance,
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


  function drawBenchworkPath(bw){
    const pts=bw.pointsPx||[];
    if(pts.length<2) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x,pts[0].y);
    for(let i=0;i<pts.length;i++){
      const b=pts[(i+1)%pts.length], c=bw.curvesPx?.[i];
      if(c) ctx.quadraticCurveTo(c.x,c.y,b.x,b.y);
      else ctx.lineTo(b.x,b.y);
    }
  }
  function drawBenchwork(bw){
    if(!bw || bw.hidden || !Array.isArray(bw.pointsPx) || bw.pointsPx.length<2) return;
    normalizeBenchworkOutline(bw);
    const selected=bw.id===state.selectedBenchworkId || isSiteObjectSelected('benchwork',bw.id), hovered=bw.id===state.hoverBenchworkId;
    ctx.save();
    ctx.lineWidth=(selected?5:(hovered?4:3))/state.view.scale;
    ctx.strokeStyle=selected?'#0f766e':(hovered?'#2a64aa':(bw.color||'#2f6f4e'));
    ctx.fillStyle='rgba(47,111,78,.045)';
    ctx.setLineDash(selected?[12/state.view.scale,7/state.view.scale]:[9/state.view.scale,7/state.view.scale]);
    drawBenchworkPath(bw);
    if(bw.pointsPx.length>=3){ctx.fill();}
    ctx.stroke();
    ctx.setLineDash([]);
    if(selected){
      ctx.fillStyle='#fff7ed'; ctx.strokeStyle='#0f766e'; ctx.lineWidth=2/state.view.scale;
      bw.pointsPx.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,5/state.view.scale,0,Math.PI*2);ctx.fill();ctx.stroke();});
      (bw.curvesPx||[]).forEach((c,i)=>{ if(!c) return; const a=bw.pointsPx[i], b=bw.pointsPx[(i+1)%bw.pointsPx.length]; ctx.save(); ctx.strokeStyle='rgba(15,118,110,.45)'; ctx.setLineDash([4/state.view.scale,4/state.view.scale]); ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(c.x,c.y); ctx.lineTo(b.x,b.y); ctx.stroke(); ctx.restore(); ctx.beginPath(); ctx.arc(c.x,c.y,5/state.view.scale,0,Math.PI*2); ctx.fill(); ctx.stroke(); });
      if(state.hoverBenchworkSegment && state.hoverBenchworkSegment.benchworkId===bw.id){
        const i=state.hoverBenchworkSegment.index, a=bw.pointsPx[i], b=bw.pointsPx[(i+1)%bw.pointsPx.length], c=bw.curvesPx?.[i];
        ctx.save(); ctx.strokeStyle='#f59e0b'; ctx.lineWidth=7/state.view.scale; ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(a.x,a.y); if(c) ctx.quadraticCurveTo(c.x,c.y,b.x,b.y); else ctx.lineTo(b.x,b.y); ctx.stroke(); ctx.restore();
      }
      const c=benchworkCenter(bw); drawLabel('Benchwork outline / trim boundary', {x:c.x+8/state.view.scale,y:c.y-8/state.view.scale});
    }
    ctx.restore();
  }
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
  function roadArmOverrideKey(arm){
    return [arm?.roadId||'road', arm?.endpoint||'arm'].join(':');
  }
  function selectedRoadIntersectionArmSettings(roadId){
    const intersections=roadSystem.generatedRoadIntersections();
    const overrides=state.roadIntersectionOverrides||{};
    const settings={count:0,crosswalkEnabled:true,stopBarEnabled:true,tactilePaversEnabled:true,curbGuideEnabled:true};
    intersections.forEach(intersection=>{
      (intersection.arms||[]).filter(arm=>arm.roadId===roadId).forEach(arm=>{
        settings.count+=1;
        const override=overrides[intersection.overrideKey]?.arms?.[roadArmOverrideKey(arm)];
        ['crosswalkEnabled','stopBarEnabled','tactilePaversEnabled','curbGuideEnabled'].forEach(key=>{
          if(override?.[key]===false) settings[key]=false;
        });
      });
    });
    return settings;
  }
  function intersectionArmOverride(intersectionKey, armKey){
    return (state.roadIntersectionOverrides||{})[intersectionKey]?.arms?.[armKey] || null;
  }
  function intersectionFeatureParentEnabled(override, type){
    if(override?.enabled===false) return false;
    if(type==='crosswalk') return override?.crosswalkEnabled!==false;
    if(type==='stopBar') return override?.stopBarEnabled!==false;
    if(type==='tactilePaver') return override?.tactilePaversEnabled!==false;
    if(type==='curbGuide') return override?.curbGuideEnabled!==false;
    return true;
  }
  function roadIntersectionFeatureLabel(type, feature, index){
    const endpoint=feature.endpoint||feature.fromEndpoint||'arm';
    if(type==='stopBar') return `Stop bar · ${endpoint}${feature.laneSide?` · ${feature.laneSide}`:''}`;
    if(type==='crosswalk') return `Crosswalk · ${endpoint}`;
    if(type==='tactilePaver') return `Tactile paver · ${endpoint}${feature.side?` · ${feature.side}`:` · ${index+1}`}`;
    if(type==='curbGuide') return `Curb guide · ${endpoint}`;
    return `Marking · ${endpoint}`;
  }
  function selectedRoadIntersectionFeatureRows(roadId){
    const intersections=roadSystem.rawGeneratedRoadIntersections();
    const rows=[];
    const pushFeature=(intersection, type, feature, index)=>{
      const armRoadId=feature.roadId||feature.fromRoadId;
      const endpoint=feature.endpoint||feature.fromEndpoint;
      if(armRoadId!==roadId) return;
      const armKey=[armRoadId||'road',endpoint||'arm'].join(':');
      const featureWithKind={...feature,kind:type};
      const featureKey=intersectionFeatureKey(type,featureWithKind,index);
      const override=intersectionArmOverride(intersection.overrideKey,armKey);
      const parentEnabled=intersectionFeatureParentEnabled(override,type);
      const disabled=(override?.disabledFeatureKeys||[]).includes(featureKey);
      rows.push({
        intersectionKey:intersection.overrideKey,
        armKey,
        featureKey,
        label:roadIntersectionFeatureLabel(type,feature,index),
        checked:parentEnabled && !disabled,
        disabled:parentEnabled?'':'disabled',
      });
    };
    intersections.forEach(intersection=>{
      (intersection.crosswalks||[]).forEach((feature,index)=>pushFeature(intersection,'crosswalk',feature,index));
      (intersection.stopBars||[]).forEach((feature,index)=>pushFeature(intersection,'stopBar',feature,index));
      (intersection.tactilePavers||[]).forEach((feature,index)=>pushFeature(intersection,'tactilePaver',feature,index));
      (intersection.curbReturns||[]).forEach((feature,index)=>pushFeature(intersection,'curbGuide',feature,index));
    });
    return rows;
  }
  function roadIntersectionFeatureControlsHtml(roadId){
    const rows=selectedRoadIntersectionFeatureRows(roadId);
    if(!rows.length) return '<div class="small muted" style="margin-top:8px">No individual generated markings touch this road yet.</div>';
    return `<div class="small muted" style="margin-top:8px">Individual generated markings</div>
      <div class="roadIntersectionFeatureList" style="display:grid;gap:5px;margin-top:5px">
        ${rows.map(row=>`<label class="checkboxRow" style="display:flex;align-items:center;gap:8px"><input class="roadIntersectionFeatureToggle" type="checkbox" data-intersection-key="${escapeAttr(row.intersectionKey)}" data-arm-key="${escapeAttr(row.armKey)}" data-feature-key="${escapeAttr(row.featureKey)}" ${row.checked?'checked':''} ${row.disabled}> <span>${escapeHtml(row.label)}</span></label>`).join('')}
      </div>`;
  }
  function roadIntersectionArmControlsHtml(roadId){
    const s=selectedRoadIntersectionArmSettings(roadId);
    const disabled=s.count?'':'disabled';
    return `<div class="section" style="margin-top:10px">
      <h3 style="margin:0 0 4px">Intersection markings</h3>
      <div class="small muted">${s.count?`${s.count} selected-road intersection arm${s.count===1?'':'s'} detected.`:'No generated intersections touch this road yet.'}</div>
      <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:6px"><input id="roadIntersectionCrosswalks" type="checkbox" ${s.crosswalkEnabled?'checked':''} ${disabled}> <span>Crosswalks on this road</span></label>
      <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:6px"><input id="roadIntersectionStopBars" type="checkbox" ${s.stopBarEnabled?'checked':''} ${disabled}> <span>Stop bars on this road</span></label>
      <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:6px"><input id="roadIntersectionTactile" type="checkbox" ${s.tactilePaversEnabled?'checked':''} ${disabled}> <span>Tactile pavers on this road</span></label>
      <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:6px"><input id="roadIntersectionCurbGuides" type="checkbox" ${s.curbGuideEnabled?'checked':''} ${disabled}> <span>Curb guide marks on this road</span></label>
      ${roadIntersectionFeatureControlsHtml(roadId)}
      <button id="clearRoadIntersectionArmOverrides" class="secondary" type="button" style="margin-top:8px" ${disabled}>Reset selected-road overrides</button>
    </div>`;
  }
  function bindRoadIntersectionArmCheckbox(id, roadId, key){
    const el=$(id);
    if(!el) return;
    el.onchange=()=>{
      roadSystem.setRoadIntersectionArmOverrides(roadId,{[key]:!!el.checked});
      syncAll();
    };
  }
  function bindRoadIntersectionFeatureToggles(){
    document.querySelectorAll('.roadIntersectionFeatureToggle').forEach(el=>{
      el.onchange=()=>{
        roadSystem.setRoadIntersectionFeatureOverride(el.dataset.intersectionKey,el.dataset.armKey,el.dataset.featureKey,!!el.checked);
        syncAll();
      };
    });
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
  function drawRailCrossingPanel(panel,crossing,selected=false){
    const pts=panel.polygon||[];
    if(pts.length<3) return;
    ctx.save();
    ctx.fillStyle=selected?'rgba(200,74,58,.26)':'rgba(236,224,190,.76)';
    ctx.strokeStyle=selected?'#c84a3a':'#8f7b55';
    ctx.lineWidth=(selected?2:1)/state.view.scale;
    ctx.beginPath();
    pts.forEach((point,index)=>index?ctx.lineTo(point.x,point.y):ctx.moveTo(point.x,point.y));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  function drawRailCrossingIndicator(crossing,selected=false){
    if(!crossing?.point) return;
    const radius=Math.max((selected?5:3)/state.view.scale,Math.min((selected?16:12)/state.view.scale,(crossing.roadWidthPx||24)*(selected?0.18:0.12)));
    const roadHalf=Math.max(radius*1.45,8/state.view.scale);
    const trackHalf=Math.max(radius*1.25,7/state.view.scale);
    ctx.save();
    ctx.fillStyle=selected?'rgba(255,247,237,.94)':'rgba(200,74,58,.22)';
    ctx.strokeStyle=selected?'#c84a3a':'rgba(200,74,58,.75)';
    ctx.lineWidth=(selected?2:1.2)/state.view.scale;
    ctx.beginPath();
    ctx.arc(crossing.point.x,crossing.point.y,radius,0,Math.PI*2);
    ctx.fill();
    ctx.stroke();
    ctx.lineCap='round';
    ctx.strokeStyle=selected?'#6f3f2f':'rgba(58,43,30,.7)';
    ctx.lineWidth=1.1/state.view.scale;
    const roadVector=crossing.roadVector||{x:1,y:0};
    const trackVector=crossing.trackVector||{x:0,y:1};
    ctx.beginPath();
    ctx.moveTo(crossing.point.x-roadVector.x*roadHalf,crossing.point.y-roadVector.y*roadHalf);
    ctx.lineTo(crossing.point.x+roadVector.x*roadHalf,crossing.point.y+roadVector.y*roadHalf);
    ctx.moveTo(crossing.point.x-trackVector.x*trackHalf,crossing.point.y-trackVector.y*trackHalf);
    ctx.lineTo(crossing.point.x+trackVector.x*trackHalf,crossing.point.y+trackVector.y*trackHalf);
    ctx.stroke();
    ctx.restore();
  }
  function drawGeneratedRailCrossings(){
    const crossings=generatedRailCrossings();
    const selectedId=state.selectedRailCrossingId;
    const infill=railCrossingInfillPanels(crossings);
    infill.forEach(panel=>drawRailCrossingPanel(panel,{id:panel.id},false));
    crossings.forEach(crossing=>{
      if(crossing.enabled===false) return;
      const selected=selectedId && (selectedId===crossing.id || selectedId===crossing.key);
      (crossing.panels||[]).forEach(panel=>drawRailCrossingPanel(panel,crossing,selected));
      ctx.save();
      ctx.strokeStyle=selected?'#c84a3a':'rgba(58,43,30,.42)';
      ctx.lineWidth=.7/state.view.scale;
      (crossing.engraves||[]).forEach(line=>{
        ctx.beginPath(); ctx.moveTo(line.a.x,line.a.y); ctx.lineTo(line.b.x,line.b.y); ctx.stroke();
      });
      ctx.restore();
      drawRailCrossingIndicator(crossing,selected);
      if(selected){
        drawLabel(`Rail crossing · ${crossing.trackName}`,{x:crossing.point.x+8/state.view.scale,y:crossing.point.y-8/state.view.scale});
      }
    });
  }
  function drawTrack(raw){
    const t=normalizeTrack(raw); if(!t || t.hidden || (t.pointsPx||[]).length<2) return;
    const selected=t.id===state.selectedTrackId || isSiteObjectSelected('track',t.id), hovered=t.id===state.hoverTrackId;
    const path=trackPathSamples(t);
    const profile=trackProfilePx(t);
    const railOffset=profile.gauge/2;
    const left=offsetTrackPath(path,railOffset);
    const right=offsetTrackPath(path,-railOffset);
    ctx.save();
    ctx.lineCap='round';
    ctx.lineJoin='round';
    drawTrackModelPath(path,t.roadbedColor||TRACK_PROFILE_DEFAULTS.roadbedColor,profile.roadbedWidth,.72);
    drawTrackModelPath(path,t.roadbedTopColor||TRACK_PROFILE_DEFAULTS.roadbedTopColor,profile.roadbedTopWidth,.84);
    trackTieSegments(t).forEach(seg=>{
      ctx.strokeStyle=t.tieColor||'#8a6f43';
      ctx.lineWidth=profile.tieWidth;
      ctx.beginPath();
      ctx.moveTo(seg.a.x,seg.a.y);
      ctx.lineTo(seg.b.x,seg.b.y);
      ctx.stroke();
    });
    drawTrackModelPath(left, selected?'#c84a3a':(hovered?'#d79631':t.color||'#4b4438'), selected?profile.railWidth*1.6:profile.railWidth);
    drawTrackModelPath(right, selected?'#c84a3a':(hovered?'#d79631':t.color||'#4b4438'), selected?profile.railWidth*1.6:profile.railWidth);
    if(selected||hovered){
      drawRoadGeneratedPath(path,'rgba(200,74,58,.45)',1,[4,4]);
      if(selected){
        ctx.fillStyle='#fff7ed';
        ctx.strokeStyle='#c84a3a';
        ctx.lineWidth=2/state.view.scale;
        (t.pointsPx||[]).forEach(pt=>{ctx.beginPath();ctx.arc(pt.x,pt.y,5/state.view.scale,0,Math.PI*2);ctx.fill();ctx.stroke();});
        (t.curvesPx||[]).forEach((c,i)=>{
          if(!c) return;
          const a=t.pointsPx[i], b=t.pointsPx[i+1];
          if(!a||!b) return;
          ctx.save();
          ctx.strokeStyle='rgba(200,74,58,.42)';
          ctx.lineWidth=1/state.view.scale;
          ctx.setLineDash([3/state.view.scale,4/state.view.scale]);
          ctx.beginPath();
          ctx.moveTo(a.x,a.y);
          ctx.lineTo(c.x,c.y);
          ctx.lineTo(b.x,b.y);
          ctx.stroke();
          ctx.restore();
          ctx.beginPath();
          ctx.arc(c.x,c.y,5/state.view.scale,0,Math.PI*2);
          ctx.fill();
          ctx.stroke();
        });
        if(state.hoverTrackSegment && state.hoverTrackSegment.trackId===t.id){
          const i=state.hoverTrackSegment.index, a=t.pointsPx[i], b=t.pointsPx[i+1], c=t.curvesPx?.[i];
          if(a&&b){
            ctx.save();
            ctx.strokeStyle='#d79631';
            ctx.lineWidth=5/state.view.scale;
            ctx.globalAlpha=.65;
            ctx.beginPath();
            ctx.moveTo(a.x,a.y);
            if(c) ctx.quadraticCurveTo(c.x,c.y,b.x,b.y);
            else ctx.lineTo(b.x,b.y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
      const c=polygonCenter(path);
      drawLabel(`${t.name||'Track'} · ${fmt(t.gaugeMm||9)} mm gauge`,{x:c.x+8/state.view.scale,y:c.y-8/state.view.scale});
    }
    ctx.restore();
  }
  function trackAccessoryPreset(kind){
    return TRACK_ACCESSORY_PRESETS[kind] || TRACK_ACCESSORY_PRESETS.sensor;
  }
  function trackAccessoryLabel(kind){
    return trackAccessoryPreset(kind).label;
  }
  const TRACK_ACCESSORY_OBJECT_FILTERS = Object.freeze([
    { key: 'all', label: 'All track items', kinds: null },
    { key: 'sensors', label: 'Sensors', kinds: ['sensor'] },
    { key: 'signals', label: 'Signals', kinds: ['signal', 'occupancyLight'] },
    { key: 'crossings', label: 'Crossing equipment', kinds: ['crossingArm', 'intrusionDetector'] },
    { key: 'catenary', label: 'Catenary', kinds: ['catenarySingleSide', 'catenaryDoublePortal'] },
    { key: 'switches', label: 'Switches', kinds: ['trackSwitchLeft', 'trackSwitchRight'] },
    { key: 'buffers', label: 'Buffer stops', kinds: ['trackBufferTomix1428', 'trackBufferTomix1428Catenary'] },
  ]);
  function trackAccessoryObjectFilterDefinition(key=trackAccessoryObjectFilter){
    return TRACK_ACCESSORY_OBJECT_FILTERS.find(filter=>filter.key===key) || TRACK_ACCESSORY_OBJECT_FILTERS[0];
  }
  function trackAccessoryMatchesObjectFilter(item, filterKey=trackAccessoryObjectFilter){
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
    return !!TRACK_ACCESSORY_PRESETS[action];
  }
  function isCatenaryAccessoryKind(kind){
    return kind==='catenarySingleSide' || kind==='catenaryDoublePortal';
  }
  function isTrackSwitchAccessoryKind(kind){
    return kind==='trackSwitchLeft' || kind==='trackSwitchRight';
  }
  function isTrackBufferAccessoryKind(kind){
    return kind==='trackBufferTomix1428' || kind==='trackBufferTomix1428Catenary';
  }
  function trackBufferHasCatenaryTerminal(item){
    return item?.kind==='trackBufferTomix1428Catenary' || !!item?.catenaryEndTerminal;
  }
  function defaultTrackAccessoryPxPerMm(){
    return 10 / Math.max(.1, TRACK_PROFILE_DEFAULTS.gaugeMm || TOMIX_TURNOUT_GAUGE_MM);
  }
  function trackAccessoryPxPerMm(item){
    if(state.pxPerMm) return state.pxPerMm;
    const trackId=item?.trackId || item?.trackAnchor?.trackId;
    const track=trackId ? (state.tracks||[]).map(normalizeTrack).find(t=>t.id===trackId) : null;
    const gaugePx=Number(track?.gaugePx);
    const gaugeMm=Number(track?.gaugeMm);
    if(Number.isFinite(gaugePx) && gaugePx>0 && Number.isFinite(gaugeMm) && gaugeMm>0) return gaugePx/gaugeMm;
    return defaultTrackAccessoryPxPerMm();
  }
  function trackBufferPxPerMm(item){
    return trackAccessoryPxPerMm(item);
  }
  function tomixBufferGeometry(scale=1){
    return {
      length:TOMIX_1428_BUFFER_LENGTH_MM*scale,
      width:TOMIX_1428_BUFFER_WIDTH_MM*scale,
      gauge:TOMIX_TURNOUT_GAUGE_MM*scale,
      tieSpacing:TOMIX_1428_BUFFER_TIE_SPACING_MM*scale,
      terminalHeight:TOMIX_1428_BUFFER_TERMINAL_HEIGHT_MM*scale,
      railWidth:TOMIX_TURNOUT_RAIL_WIDTH_MM*scale,
    };
  }
  function trackBufferGeometryPx(item){
    return tomixBufferGeometry(trackBufferPxPerMm(item));
  }
  function trackBufferGeometrySite3D(item){
    return tomixBufferGeometry(state.pxPerMm ? 1 : trackBufferPxPerMm(item));
  }
  function trackSwitchDirection(kind){
    return kind==='trackSwitchLeft' ? -1 : 1;
  }
  function trackSwitchPxPerMm(item){
    return trackAccessoryPxPerMm(item);
  }
  function tomixTurnoutGeometry(scale=1){
    const length=TOMIX_TURNOUT_LENGTH_MM*scale;
    const radius=TOMIX_TURNOUT_RADIUS_MM*scale;
    const offset=TOMIX_TURNOUT_OFFSET_MM*scale;
    return {
      radius,
      angleDeg:TOMIX_TURNOUT_ANGLE_DEG,
      angleRad:TOMIX_TURNOUT_ANGLE_RAD,
      length,
      halfLength:length/2,
      offset,
      gauge:TOMIX_TURNOUT_GAUGE_MM*scale,
      roadbedWidth:TOMIX_TURNOUT_ROADBED_WIDTH_MM*scale,
      tieLength:TOMIX_TURNOUT_TIE_LENGTH_MM*scale,
      tieWidth:TOMIX_TURNOUT_TIE_WIDTH_MM*scale,
      tieSpacing:TOMIX_TURNOUT_TIE_SPACING_MM*scale,
      railWidth:TOMIX_TURNOUT_RAIL_WIDTH_MM*scale,
    };
  }
  function trackSwitchGeometryPx(item){
    return tomixTurnoutGeometry(trackSwitchPxPerMm(item));
  }
  function trackSwitchGeometrySite3D(item){
    return tomixTurnoutGeometry(state.pxPerMm ? 1 : trackSwitchPxPerMm(item));
  }
  function trackSwitchEndpointDefinitions(item){
    if(!item || !isTrackSwitchAccessoryKind(item.kind)) return [];
    const geom=trackSwitchGeometryPx(item);
    const dir=trackSwitchDirection(item.kind);
    return [
      {endpoint:'heel',label:'Heel',local:{x:-geom.halfLength,y:0},angleDeg:0},
      {endpoint:'straight',label:'Straight',local:{x:geom.halfLength,y:0},angleDeg:0},
      {endpoint:'diverging',label:'Diverging',local:{x:geom.halfLength,y:dir*geom.offset},angleDeg:dir*TOMIX_TURNOUT_ANGLE_DEG},
    ];
  }
  function trackSwitchCurvePoints(geom, dir, steps=18){
    const points=[];
    for(let i=0;i<=steps;i++){
      const a=geom.angleRad*i/steps;
      points.push({x:-geom.halfLength+geom.radius*Math.sin(a),y:dir*geom.radius*(1-Math.cos(a))});
    }
    return points;
  }
  function drawTrackSwitchPolyline(points){
    if(!points || !points.length) return;
    ctx.beginPath();
    points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    ctx.stroke();
  }
  function transformTrackSwitchLocalPoint(item, local){
    const a=rad(Number(item?.rotationDeg)||0);
    return {
      x:(Number(item?.x)||0)+local.x*Math.cos(a)-local.y*Math.sin(a),
      y:(Number(item?.y)||0)+local.x*Math.sin(a)+local.y*Math.cos(a),
    };
  }
  function trackSwitchEndpointPoints(item){
    if(!item || !isTrackSwitchAccessoryKind(item.kind)) return [];
    return trackSwitchEndpointDefinitions(item).map(endpoint=>({
      ...endpoint,
      point: transformTrackSwitchLocalPoint(item, endpoint.local),
      angleDeg: (Number(item.rotationDeg)||0)+endpoint.angleDeg,
      trackAccessoryId: item.id,
      kind: 'trackSwitchEndpoint',
      hidden: item.hidden,
    }));
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
    const a=rad(angleDeg);
    return {x:point.x*Math.cos(a)-point.y*Math.sin(a),y:point.x*Math.sin(a)+point.y*Math.cos(a)};
  }
  function alignTrackSwitchEndpointToTarget(item, sourceEndpointName, targetEndpoint){
    const sourceDef=trackSwitchEndpointDefinitions(item).find(endpoint=>endpoint.endpoint===sourceEndpointName);
    if(!sourceDef || !targetEndpoint?.point) return false;
    const rotationDeg=(Number(targetEndpoint.angleDeg)||0)-sourceDef.angleDeg;
    const rotatedLocal=rotatePoint(sourceDef.local,rotationDeg);
    item.rotationDeg=rotationDeg;
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
    sourceEndpoints.forEach(source=>{
      targetEndpoints.forEach(target=>{
        const distance=dist(source.point,target.point);
        const pointerDistance=pointerPoint ? dist(pointerPoint,target.point) : 0;
        const candidate={source,target,distance,pointerDistance};
        if(pointerPoint && distance>snapDistance) return;
        if(!best
          || (pointerPoint && (pointerDistance<best.pointerDistance || (Math.abs(pointerDistance-best.pointerDistance)<.001 && distance<best.distance)))
          || (!pointerPoint && distance<best.distance)) best=candidate;
      });
    });
    return best;
  }
  function snapTrackSwitchToEndpoint(item, pointerPoint=null, preferredSourceEndpoint=null){
    const pointerSourceEndpoint=draggedTrackSwitchEndpointName(item,pointerPoint);
    const pair=nearestSwitchEndpointPair(item,pointerPoint,pointerSourceEndpoint||preferredSourceEndpoint);
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
    const kind=TRACK_ACCESSORY_PRESETS[raw.kind] ? raw.kind : 'sensor';
    const preset=trackAccessoryPreset(kind);
    raw.type='trackAccessory';
    raw.kind=kind;
    raw.id=raw.id||uid('trackItem');
    raw.name=raw.name||preset.label;
    raw.x=Number.isFinite(Number(raw.x))?Number(raw.x):0;
    raw.y=Number.isFinite(Number(raw.y))?Number(raw.y):0;
    raw.rotationDeg=Number.isFinite(Number(raw.rotationDeg))?Number(raw.rotationDeg):0;
    raw.trackId=raw.trackId||null;
    raw.autoOrientToTrack=isCatenaryAccessoryKind(kind) ? (raw.autoOrientToTrack!==false && !!raw.trackId) : !!raw.autoOrientToTrack;
    if(raw.trackAnchor && typeof raw.trackAnchor==='object'){
      raw.trackAnchor={
        trackId: raw.trackAnchor.trackId || raw.trackId || null,
        pathDistancePx: Number.isFinite(Number(raw.trackAnchor.pathDistancePx)) ? Number(raw.trackAnchor.pathDistancePx) : null,
        offsetPx: Number.isFinite(Number(raw.trackAnchor.offsetPx)) ? Number(raw.trackAnchor.offsetPx) : 0,
        endpointKey: raw.trackAnchor.endpointKey === 'start' || raw.trackAnchor.endpointKey === 'end' ? raw.trackAnchor.endpointKey : null,
        pointIndex: Number.isInteger(raw.trackAnchor.pointIndex) ? raw.trackAnchor.pointIndex : null,
        kind: raw.trackAnchor.kind === 'trackSwitchEndpoint' ? 'trackSwitchEndpoint' : null,
        trackAccessoryId: raw.trackAnchor.trackAccessoryId || null,
        endpoint: raw.trackAnchor.endpoint || null,
        sourceEndpoint: raw.trackAnchor.sourceEndpoint || null,
      };
    } else {
      raw.trackAnchor=null;
    }
    raw.color=raw.color||preset.color;
    raw.catenaryEndTerminal=isTrackBufferAccessoryKind(kind) ? (kind==='trackBufferTomix1428Catenary' || !!raw.catenaryEndTerminal) : !!raw.catenaryEndTerminal;
    raw.locked=!!raw.locked;
    raw.hidden=!!raw.hidden;
    raw.notes=raw.notes||preset.defaultNotes||'';
    return raw;
  }
  function selectedTrackAccessory(){
    return (state.trackAccessories||[]).find(x=>x.id===state.selectedTrackAccessoryId) || null;
  }
  const SITE_OBJECT_CLIPBOARD_TYPES = Object.freeze({
    annotation: { collection:'annotations', selectedId:'selectedAnnotationId', prefix:'note' },
    roadFeature: { collection:'roadFeatures', selectedId:'selectedRoadFeatureId', prefix:'roadFeature' },
    streetlight: { collection:'streetlights', selectedId:'selectedStreetlightId', prefix:'light' },
    road: { collection:'roads', selectedId:'selectedRoadId', prefix:'road' },
    trackAccessory: { collection:'trackAccessories', selectedId:'selectedTrackAccessoryId', prefix:'trackItem' },
    track: { collection:'tracks', selectedId:'selectedTrackId', prefix:'track' },
    stlObject: { collection:'stlObjects', selectedId:'selectedStlObjectId', prefix:'stl' },
    benchwork: { collection:'benchworkOutlines', selectedId:'selectedBenchworkId', prefix:'benchwork' },
    fabric: { collection:'fabricRegions', selectedId:'selectedFabricId', prefix:'fabric' },
  });
  const SITE_OBJECT_MOVE_TYPES = new Set(['building','roadFeature','streetlight','road','trackAccessory','track','stlObject','benchwork','fabric']);
  function siteObjectKey(type,id){return `${type}:${id}`;}
  function normalizeSelectedSiteObjects(){
    const seen=new Set();
    state.selectedSiteObjects=(Array.isArray(state.selectedSiteObjects)?state.selectedSiteObjects:[])
      .filter(sel=>sel && typeof sel.type==='string' && sel.id)
      .filter(sel=>{
        const key=siteObjectKey(sel.type,sel.id);
        if(seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    return state.selectedSiteObjects;
  }
  function selectedSiteObjectCount(){
    return normalizeSelectedSiteObjects().length;
  }
  function isSiteObjectSelected(type,id){
    if(type==='building') return isBuildingSelected(id) || normalizeSelectedSiteObjects().some(sel=>sel.type==='building' && sel.id===id);
    return normalizeSelectedSiteObjects().some(sel=>sel.type===type && sel.id===id);
  }
  function clearSelectedSiteObjects(){
    state.selectedSiteObjects=[];
  }
  function setSelectedSiteObjects(selection){
    const seen=new Set();
    state.selectedSiteObjects=(selection||[])
      .filter(sel=>sel && sel.type && sel.id)
      .filter(sel=>{
        const key=siteObjectKey(sel.type,sel.id);
        if(seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(sel=>({type:sel.type,id:sel.id}));
  }
  function siteObjectBySelection(sel){
    if(!sel?.type || !sel.id) return null;
    if(sel.type==='building') return state.buildings.find(item=>item.id===sel.id)||null;
    const meta=SITE_OBJECT_CLIPBOARD_TYPES[sel.type];
    return meta ? (state[meta.collection]||[]).find(item=>item.id===sel.id)||null : null;
  }
  function currentSelectedMovableSiteObjects(){
    return normalizeSelectedSiteObjects()
      .filter(sel=>SITE_OBJECT_MOVE_TYPES.has(sel.type))
      .map(sel=>({type:sel.type,item:siteObjectBySelection(sel)}))
      .filter(entry=>entry.item && !entry.item.locked);
  }
  function applyPrimarySiteObjectSelection(type,id,{preserveGroup=false}={}){
    if(!preserveGroup) clearSelectedSiteObjects();
    if(type!=='building') clearBuildingSelection();
    Object.values(SITE_OBJECT_CLIPBOARD_TYPES).forEach(meta=>{ state[meta.selectedId]=null; });
    state.selectedRoadIntersectionId=null;
    state.selectedRailCrossingId=null;
    if(type==='building') setBuildingSelection([id],id);
    else {
      const meta=SITE_OBJECT_CLIPBOARD_TYPES[type];
      if(meta) state[meta.selectedId]=id;
    }
  }
  function setSingleSiteObjectSelection(type,id){
    applyPrimarySiteObjectSelection(type,id);
    setSelectedSiteObjects([{type,id}]);
  }
  function toggleSiteObjectSelection(type,id){
    const current=normalizeSelectedSiteObjects().slice();
    const key=siteObjectKey(type,id);
    const filtered=current.filter(sel=>siteObjectKey(sel.type,sel.id)!==key);
    if(filtered.length===current.length) filtered.push({type,id});
    setSelectedSiteObjects(filtered);
    if(type==='building'){
      const buildingIds=state.selectedSiteObjects.filter(sel=>sel.type==='building').map(sel=>sel.id);
      setBuildingSelection(buildingIds,buildingIds.includes(id)?id:(buildingIds[0]||null));
    } else if(filtered.some(sel=>sel.type===type && sel.id===id)) {
      applyPrimarySiteObjectSelection(type,id,{preserveGroup:true});
    } else {
      const fallback=state.selectedSiteObjects[state.selectedSiteObjects.length-1];
      if(fallback) applyPrimarySiteObjectSelection(fallback.type,fallback.id,{preserveGroup:true});
      else clearPlanObjectSelection();
    }
    return true;
  }
  function offsetPointArray(points, dx, dy){
    return Array.isArray(points) ? points.map(point=>point?{...point,x:(Number(point.x)||0)+dx,y:(Number(point.y)||0)+dy}:point) : points;
  }
  function selectedSiteObjectForClipboard(){
    if(state.selectedAnnotationId) return {type:'annotation', item:selectedAnnotation()};
    if(state.selectedRoadFeatureId) return {type:'roadFeature', item:selectedRoadFeature()};
    if(state.selectedStreetlightId) return {type:'streetlight', item:selectedStreetlight()};
    if(state.selectedRoadId) return {type:'road', item:selectedRoad()};
    if(state.selectedTrackAccessoryId) return {type:'trackAccessory', item:selectedTrackAccessory()};
    if(state.selectedTrackId) return {type:'track', item:selectedTrack()};
    if(state.selectedStlObjectId) return {type:'stlObject', item:selectedStlObject()};
    if(state.selectedBenchworkId) return {type:'benchwork', item:selectedBenchwork()};
    if(state.selectedFabricId) return {type:'fabric', item:selectedFabric()};
    return null;
  }
  function normalizeSiteObjectForClipboard(type,item){
    if(type==='roadFeature') return normalizeRoadFeature(item);
    if(type==='streetlight') return normalizeStreetlight(item);
    if(type==='road') return normalizeRoad(item);
    if(type==='trackAccessory') return normalizeTrackAccessory(item);
    if(type==='track') return normalizeTrack(item);
    if(type==='stlObject') return normalizeStlObject(item);
    if(type==='benchwork') return normalizeBenchworkOutline(item);
    if(type==='fabric') return normalizeFabricRegion(item);
    return item;
  }
  function clearCopiedSiteObjectRelationships(type,payload){
    if(type==='roadFeature'){
      payload.roadId=null;
      payload.autoAlignedToRoad=false;
    } else if(type==='streetlight'){
      if(payload.anchor){
        payload.anchor={...payload.anchor,targetRoadId:null,lockToRoadEdge:false};
      }
    } else if(type==='road'){
      payload.endpointConnections={};
      delete payload.roadPolygonPx;
      delete payload.sidewalkPolygonsPx;
    } else if(type==='trackAccessory'){
      payload.trackId=null;
      payload.trackAnchor=null;
      payload.autoOrientToTrack=false;
    } else if(type==='track'){
      payload.endpointConnections={};
    } else if(type==='fabric'){
      payload.generatedPadIds=[];
    }
    return payload;
  }
  function siteObjectClipboardPayload(type,item){
    if(!type || !item || !SITE_OBJECT_CLIPBOARD_TYPES[type]) return null;
    const normalized=normalizeSiteObjectForClipboard(type,item);
    const payload=structuredClone(normalized);
    payload.copiedFromId=item.id;
    payload.copiedAt=new Date().toISOString();
    clearCopiedSiteObjectRelationships(type,payload);
    return payload;
  }
  function copySelectedSiteObject(){
    const selection=selectedSiteObjectForClipboard();
    if(!selection?.item) return false;
    state.siteObjectClipboard={type:selection.type,item:siteObjectClipboardPayload(selection.type,selection.item)};
    state.siteObjectPasteOffsetCount=0;
    state.objectClipboardType='siteObject';
    return true;
  }
  function preparePastedSiteObject(type,src){
    const meta=SITE_OBJECT_CLIPBOARD_TYPES[type];
    if(!meta || !src) return null;
    const copy=structuredClone(src);
    const n=++state.siteObjectPasteOffsetCount;
    const off=18*n;
    copy.id=uid(meta.prefix);
    if(copy.name){
      const baseName=String(copy.name).replace(/ copy(?: \d+)?$/i,'');
      copy.name=baseName+' copy';
    }
    copy.hidden=false;
    copy.locked=false;
    if(Number.isFinite(Number(copy.x))) copy.x=Number(copy.x)+off;
    if(Number.isFinite(Number(copy.y))) copy.y=Number(copy.y)+off;
    copy.pointsPx=offsetPointArray(copy.pointsPx,off,off);
    copy.curvesPx=offsetPointArray(copy.curvesPx,off,off);
    copy.polygon=offsetPointArray(copy.polygon,off,off);
    copy.points=offsetPointArray(copy.points,off,off);
    clearCopiedSiteObjectRelationships(type,copy);
    normalizeSiteObjectForClipboard(type,copy);
    return copy;
  }
  function selectPastedSiteObject(type,item){
    setSingleSiteObjectSelection(type,item.id);
  }
  function pasteSiteObjectFromClipboard(){
    const src=state.siteObjectClipboard;
    const type=src?.type;
    const meta=SITE_OBJECT_CLIPBOARD_TYPES[type];
    if(!meta || !src.item) return false;
    const copy=preparePastedSiteObject(type,src.item);
    if(!copy) return false;
    state[meta.collection]=state[meta.collection]||[];
    state[meta.collection].push(copy);
    selectPastedSiteObject(type,copy);
    syncAll();
    return true;
  }
  function copySelectedTrackAccessory(){
    return !!(state.selectedTrackAccessoryId && copySelectedSiteObject());
  }
  function pasteTrackAccessoryFromClipboard(){
    return state.siteObjectClipboard?.type==='trackAccessory' && pasteSiteObjectFromClipboard();
  }
  function applySiteObjectMoveFromOrig(type,orig,dx,dy,pointerPoint=null,preferredSourceEndpoint=null){
    if(!orig || !SITE_OBJECT_MOVE_TYPES.has(type)) return;
    if(type==='building'){
      const b=state.buildings.find(x=>x.id===orig.id);
      if(b&&!b.locked){
        if(b.padType==='rect'){b.x=orig.x+dx; b.y=orig.y+dy;}
        else b.pointsPx=(orig.pointsPx||[]).map(q=>({x:q.x+dx,y:q.y+dy}));
        syncBuildingMetrics(b);
      }
      return;
    }
    if(type==='streetlight'){
      const l=state.streetlights.find(x=>x.id===orig.id);
      if(l&&!l.locked){l.x=orig.x+dx; l.y=orig.y+dy;}
      return;
    }
    if(type==='trackAccessory'){
      const item=(state.trackAccessories||[]).find(x=>x.id===orig.id);
      if(item&&!item.locked){
        item.x=orig.x+dx;
        item.y=orig.y+dy;
        if(isTrackSwitchAccessoryKind(item.kind)){
          if(!snapTrackSwitchToEndpoint(item,pointerPoint,preferredSourceEndpoint)){
            item.trackAnchor=null;
            item.trackId=null;
            normalizeTrackAccessory(item);
            syncTracksConnectedToTrackSwitch(item);
          }
        } else {
          const anchor=nearestTrackAccessoryAnchor({x:item.x,y:item.y});
          if(anchor && anchor.distance<=trackAccessorySnapDistance()){
            if(isCatenaryAccessoryKind(item.kind)) attachTrackAccessoryToAnchor(item,anchor);
            else item.trackId=anchor.trackId;
          } else if(isCatenaryAccessoryKind(item.kind)){
            item.trackId=null;
            item.trackAnchor=null;
            item.autoOrientToTrack=false;
          }
          normalizeTrackAccessory(item);
        }
      }
      return;
    }
    if(type==='stlObject'){
      const obj=(state.stlObjects||[]).find(x=>x.id===orig.id);
      if(obj&&!obj.locked){obj.x=orig.x+dx; obj.y=orig.y+dy; normalizeStlObject(obj);}
      return;
    }
    if(type==='benchwork'){
      const bw=state.benchworkOutlines.find(x=>x.id===orig.id);
      if(bw&&!bw.locked){
        bw.pointsPx=(orig.pointsPx||[]).map(q=>({x:q.x+dx,y:q.y+dy}));
        bw.curvesPx=(orig.curvesPx||[]).map(c=>c?{x:c.x+dx,y:c.y+dy}:null);
        normalizeBenchworkOutline(bw);
      }
      return;
    }
    if(type==='road'){
      const r=state.roads.find(x=>x.id===orig.id);
      if(r&&!r.locked){
        r.pointsPx=(orig.pointsPx||[]).map(q=>({x:q.x+dx,y:q.y+dy}));
        r.curvesPx=(orig.curvesPx||[]).map(c=>c?{x:c.x+dx,y:c.y+dy}:null);
        syncRoadMetrics(r);
      }
      return;
    }
    if(type==='track'){
      const t=(state.tracks||[]).find(x=>x.id===orig.id);
      if(t&&!t.locked){
        t.pointsPx=(orig.pointsPx||[]).map(q=>({x:q.x+dx,y:q.y+dy}));
        t.curvesPx=(orig.curvesPx||[]).map(c=>c?{x:c.x+dx,y:c.y+dy}:null);
        syncTrackMetrics(t);
      }
      return;
    }
    if(type==='roadFeature'){
      const f=(state.roadFeatures||[]).find(x=>x.id===orig.id);
      if(f&&!f.locked) moveRoadFeature(f,dx,dy);
      return;
    }
    if(type==='fabric'){
      const fabric=(state.fabricRegions||[]).find(x=>x.id===orig.id);
      if(fabric&&!fabric.locked){
        fabric.pointsPx=(orig.pointsPx||[]).map(q=>({x:q.x+dx,y:q.y+dy}));
        fabric.curvesPx=(orig.curvesPx||[]).map(c=>c?{x:c.x+dx,y:c.y+dy}:null);
        normalizeFabricRegion(fabric);
      }
    }
  }
  function finalizeMovedSiteObject(type,orig){
    if(type==='track'){
      const t=(state.tracks||[]).find(x=>x.id===orig.id);
      if(t?.pointsPx?.length){
        syncTrackEndpointToSwitchConnection(t,0);
        syncTrackEndpointToSwitchConnection(t,t.pointsPx.length-1);
        syncConnectedTrackEndpoint(t,0,t.pointsPx[0]);
        syncConnectedTrackEndpoint(t,t.pointsPx.length-1,t.pointsPx[t.pointsPx.length-1]);
      }
    } else if(type==='trackAccessory'){
      const item=(state.trackAccessories||[]).find(x=>x.id===orig.id);
      if(item && isTrackSwitchAccessoryKind(item.kind)) syncTracksConnectedToTrackSwitch(item);
    }
  }
  function startSiteObjectMoveDrag(type,item,e,p){
    const selected=isSiteObjectSelected(type,item.id);
    if(!selected) setSingleSiteObjectSelection(type,item.id);
    else applyPrimarySiteObjectSelection(type,item.id,{preserveGroup:true});
    const movable=currentSelectedMovableSiteObjects();
    const entries=(selected && movable.length>1 ? movable : [{type,item}])
      .filter(entry=>entry.item && !entry.item.locked)
      .map(entry=>({
        type:entry.type,
        orig:structuredClone(entry.item),
        dragOrigin:entry.type===type && entry.item.id===item.id,
        snapSourceEndpoint:entry.type===type && entry.item.id===item.id ? draggedTrackSwitchEndpointName(entry.item,p) : null,
      }));
    if(entries.length){
      state.drag={type:entries.length>1?'moveSiteObjects':'moveSiteObject',pointerId:e.pointerId,start:p,entries};
    }
    return true;
  }
  function handleSiteObjectPointerHit(type,item,e,p){
    if(!item) return false;
    if(e.shiftKey || e.metaKey || e.ctrlKey){
      toggleSiteObjectSelection(type,item.id);
      renderList(); renderRoads(); renderStreetlights(); renderSelected(); updateHandoff(); draw();
      return true;
    }
    startSiteObjectMoveDrag(type,item,e,p);
    renderList(); renderRoads(); renderStreetlights(); renderSelected(); updateHandoff(); draw();
    return true;
  }
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
        const verticalMin=-geom.roadbedWidth/2-tol;
        const verticalMax=geom.offset+geom.roadbedWidth/2+tol;
        const yMin=item.kind==='trackSwitchLeft' ? -verticalMax : verticalMin;
        const yMax=item.kind==='trackSwitchLeft' ? -verticalMin : verticalMax;
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
      const minY=dir<0 ? -geom.offset-geom.roadbedWidth/2 : -geom.roadbedWidth/2;
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
    const maxY=dir<0 ? geom.roadbedWidth/2 : geom.offset+geom.roadbedWidth/2;
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
    const item=normalizeTrackAccessory(raw);
    refreshTrackAccessoryAnchor(item);
    if(item.hidden) return;
    const selected=item.id===state.selectedTrackAccessoryId || isSiteObjectSelected('trackAccessory',item.id);
    const hovered=item.id===state.hoverTrackAccessoryId;
    const color=selected?'#c84a3a':(hovered?'#d79631':item.color||trackAccessoryPreset(item.kind).color);
    const scale=1/state.view.scale;
    ctx.save();
    ctx.translate(item.x,item.y);
    ctx.rotate(rad(item.rotationDeg||0));
    ctx.lineCap='round';
    ctx.lineJoin='round';
    ctx.strokeStyle=color;
    ctx.fillStyle='rgba(255,255,255,.92)';
    ctx.lineWidth=(selected?2.5:1.8)*scale;
    if(item.kind==='catenarySingleSide'){
      ctx.beginPath(); ctx.rect(-15*scale,-8*scale,8*scale,16*scale); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-11*scale,8*scale); ctx.lineTo(-11*scale,-18*scale);
      ctx.moveTo(-15*scale,-18*scale); ctx.lineTo(-7*scale,-18*scale);
      ctx.moveTo(-11*scale,-10*scale); ctx.lineTo(16*scale,-10*scale);
      ctx.moveTo(-7*scale,-10*scale); ctx.lineTo(10*scale,2*scale);
      ctx.moveTo(2*scale,2*scale); ctx.lineTo(18*scale,2*scale);
      ctx.moveTo(10*scale,2*scale); ctx.lineTo(16*scale,-10*scale);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(13*scale,4*scale,1.5*scale,0,Math.PI*2); ctx.fill(); ctx.stroke();
    } else if(item.kind==='catenaryDoublePortal'){
      ctx.beginPath(); ctx.rect(-19*scale,-6*scale,7*scale,12*scale); ctx.rect(12*scale,-6*scale,7*scale,12*scale); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-15*scale,6*scale); ctx.lineTo(-15*scale,-18*scale);
      ctx.moveTo(15*scale,6*scale); ctx.lineTo(15*scale,-18*scale);
      ctx.moveTo(-18*scale,-18*scale); ctx.lineTo(18*scale,-18*scale);
      ctx.moveTo(-18*scale,-12*scale); ctx.lineTo(18*scale,-12*scale);
      ctx.moveTo(-15*scale,-12*scale); ctx.lineTo(-9*scale,-18*scale);
      ctx.moveTo(-9*scale,-12*scale); ctx.lineTo(-3*scale,-18*scale);
      ctx.moveTo(-3*scale,-12*scale); ctx.lineTo(3*scale,-18*scale);
      ctx.moveTo(3*scale,-12*scale); ctx.lineTo(9*scale,-18*scale);
      ctx.moveTo(9*scale,-12*scale); ctx.lineTo(15*scale,-18*scale);
      ctx.moveTo(-6*scale,-8*scale); ctx.lineTo(-6*scale,-12*scale);
      ctx.moveTo(6*scale,-8*scale); ctx.lineTo(6*scale,-12*scale);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(-6*scale,-7*scale,1.3*scale,0,Math.PI*2); ctx.arc(6*scale,-7*scale,1.3*scale,0,Math.PI*2); ctx.fill(); ctx.stroke();
    } else if(isTrackSwitchAccessoryKind(item.kind)){
      const dir=trackSwitchDirection(item.kind);
      const geom=trackSwitchGeometryPx(item);
      const branch=trackSwitchCurvePoints(geom,dir,22);
      const branchRailA=offsetTrackPath(branch,geom.gauge/2);
      const branchRailB=offsetTrackPath(branch,-geom.gauge/2);
      ctx.save();
      ctx.strokeStyle='rgba(199,176,132,.72)';
      ctx.lineWidth=Math.max(geom.roadbedWidth,10*scale);
      drawTrackSwitchPolyline([{x:-geom.halfLength,y:0},{x:geom.halfLength,y:0}]);
      drawTrackSwitchPolyline(branch);
      ctx.strokeStyle='rgba(138,111,67,.82)';
      ctx.lineWidth=Math.max(geom.tieWidth,1.2*scale);
      const tieHalf=Math.max(geom.tieLength/2,geom.gauge/2+3*scale);
      for(let x=-geom.halfLength; x<=geom.halfLength+.01; x+=Math.max(geom.tieSpacing,3*scale)){
        ctx.beginPath(); ctx.moveTo(x,-tieHalf); ctx.lineTo(x,tieHalf); ctx.stroke();
      }
      for(let i=3;i<branch.length;i+=3){
        const p=branch[i], prev=branch[Math.max(0,i-1)], next=branch[Math.min(branch.length-1,i+1)];
        const dx=next.x-prev.x, dy=next.y-prev.y, len=Math.hypot(dx,dy)||1;
        const nx=-dy/len, ny=dx/len;
        ctx.beginPath();
        ctx.moveTo(p.x-nx*tieHalf,p.y-ny*tieHalf);
        ctx.lineTo(p.x+nx*tieHalf,p.y+ny*tieHalf);
        ctx.stroke();
      }
      ctx.strokeStyle='#4b4438';
      ctx.lineWidth=Math.max(geom.railWidth,1.2*scale);
      drawTrackSwitchPolyline([{x:-geom.halfLength,y:-geom.gauge/2},{x:geom.halfLength,y:-geom.gauge/2}]);
      drawTrackSwitchPolyline([{x:-geom.halfLength,y:geom.gauge/2},{x:geom.halfLength,y:geom.gauge/2}]);
      drawTrackSwitchPolyline(branchRailA);
      drawTrackSwitchPolyline(branchRailB);
      ctx.strokeStyle=color;
      ctx.lineWidth=Math.max(1.4*scale,geom.railWidth*.9);
      ctx.beginPath();
      ctx.moveTo(-geom.halfLength+geom.length*.34,0);
      ctx.lineTo(-geom.halfLength+geom.length*.52,dir*geom.offset*.42);
      ctx.stroke();
      ctx.restore();
      ctx.beginPath(); ctx.arc(geom.halfLength,0,2.8*scale,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(branch[branch.length-1].x,branch[branch.length-1].y,2.8*scale,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(-geom.halfLength,0,2.8*scale,0,Math.PI*2); ctx.fill(); ctx.stroke();
    } else if(isTrackBufferAccessoryKind(item.kind)){
      const geom=trackBufferGeometryPx(item);
      const halfW=geom.width/2;
      ctx.save();
      ctx.strokeStyle='rgba(199,176,132,.82)';
      ctx.lineWidth=Math.max(geom.width,10*scale);
      ctx.beginPath(); ctx.moveTo(-geom.length*.35,0); ctx.lineTo(geom.length,0); ctx.stroke();
      ctx.strokeStyle='rgba(138,111,67,.85)';
      ctx.lineWidth=Math.max(1.2*scale,geom.width*.08);
      for(let x=-geom.length*.25; x<geom.length*.82; x+=Math.max(geom.tieSpacing,3*scale)){
        ctx.beginPath(); ctx.moveTo(x,-halfW*.42); ctx.lineTo(x,halfW*.42); ctx.stroke();
      }
      ctx.strokeStyle='#4b4438';
      ctx.lineWidth=Math.max(1.2*scale,geom.railWidth);
      ctx.beginPath();
      ctx.moveTo(-geom.length*.35,-geom.gauge/2); ctx.lineTo(geom.length*.8,-geom.gauge/2);
      ctx.moveTo(-geom.length*.35,geom.gauge/2); ctx.lineTo(geom.length*.8,geom.gauge/2);
      ctx.stroke();
      ctx.strokeStyle=color;
      ctx.lineWidth=Math.max(2*scale,geom.railWidth*1.8);
      ctx.beginPath();
      ctx.moveTo(geom.length*.78,-halfW*.48); ctx.lineTo(geom.length*.78,halfW*.48);
      ctx.moveTo(geom.length*.96,-halfW*.5); ctx.lineTo(geom.length*.96,halfW*.5);
      ctx.moveTo(geom.length*.78,-halfW*.48); ctx.lineTo(geom.length*.96,-halfW*.5);
      ctx.moveTo(geom.length*.78,halfW*.48); ctx.lineTo(geom.length*.96,halfW*.5);
      ctx.stroke();
      ctx.fillStyle='rgba(255,250,240,.92)';
      ctx.beginPath(); ctx.rect(geom.length*.72,-halfW*.56,geom.length*.3,halfW*1.12); ctx.fill(); ctx.stroke();
      if(trackBufferHasCatenaryTerminal(item)){
        const towerX=geom.length*.55;
        const towerY=-halfW-7*scale;
        const h=28*scale;
        const w=6*scale;
        ctx.strokeStyle='#6f6a5e';
        ctx.lineWidth=1.6*scale;
        ctx.beginPath();
        ctx.rect(towerX-w/2,towerY-h,w,h);
        ctx.moveTo(towerX-w/2,towerY-h*.78); ctx.lineTo(towerX+w/2,towerY-h*.58);
        ctx.moveTo(towerX+w/2,towerY-h*.58); ctx.lineTo(towerX-w/2,towerY-h*.38);
        ctx.moveTo(towerX-w/2,towerY-h*.38); ctx.lineTo(towerX+w/2,towerY-h*.18);
        ctx.moveTo(towerX,towerY-h*.68); ctx.lineTo(towerX-10*scale,towerY-h*.62);
        ctx.moveTo(towerX,towerY-h*.48); ctx.lineTo(towerX-10*scale,towerY-h*.42);
        ctx.stroke();
      }
      ctx.restore();
    } else if(item.kind==='signal'){
      ctx.beginPath(); ctx.moveTo(0,10*scale); ctx.lineTo(0,-10*scale); ctx.stroke();
      ctx.beginPath(); ctx.arc(0,-12*scale,5*scale,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-7*scale,12*scale); ctx.lineTo(7*scale,12*scale); ctx.stroke();
    } else if(item.kind==='intrusionDetector'){
      ctx.beginPath(); ctx.rect(-9*scale,-7*scale,18*scale,14*scale); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5*scale,-10*scale); ctx.lineTo(0,-15*scale); ctx.lineTo(5*scale,-10*scale); ctx.stroke();
      ctx.beginPath(); ctx.arc(-4*scale,0,2*scale,0,Math.PI*2); ctx.arc(4*scale,0,2*scale,0,Math.PI*2); ctx.fill(); ctx.stroke();
    } else if(item.kind==='occupancyLight'){
      ctx.beginPath(); ctx.moveTo(0,12*scale); ctx.lineTo(0,-10*scale); ctx.stroke();
      ctx.beginPath(); ctx.arc(-5*scale,-12*scale,4.5*scale,0,Math.PI*2); ctx.arc(5*scale,-12*scale,4.5*scale,0,Math.PI*2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-9*scale,-17*scale); ctx.lineTo(-13*scale,-21*scale); ctx.moveTo(9*scale,-17*scale); ctx.lineTo(13*scale,-21*scale); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-7*scale,13*scale); ctx.lineTo(7*scale,13*scale); ctx.stroke();
    } else if(item.kind==='crossingArm'){
      ctx.beginPath(); ctx.moveTo(-12*scale,0); ctx.lineTo(14*scale,0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-10*scale,-5*scale); ctx.lineTo(-5*scale,5*scale); ctx.moveTo(-1*scale,-5*scale); ctx.lineTo(4*scale,5*scale); ctx.moveTo(8*scale,-5*scale); ctx.lineTo(13*scale,5*scale); ctx.stroke();
      ctx.beginPath(); ctx.arc(-14*scale,0,4*scale,0,Math.PI*2); ctx.fill(); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.rect(-8*scale,-5*scale,16*scale,10*scale); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,5*scale); ctx.lineTo(0,13*scale); ctx.moveTo(-5*scale,13*scale); ctx.lineTo(5*scale,13*scale); ctx.stroke();
    }
    if(selected||hovered){
      ctx.setLineDash([4*scale,3*scale]);
      ctx.strokeStyle='rgba(200,74,58,.45)';
      if(isTrackSwitchAccessoryKind(item.kind)){
        const geom=trackSwitchGeometryPx(item);
        const dir=trackSwitchDirection(item.kind);
        const minY=dir<0 ? -geom.offset-geom.roadbedWidth/2 : -geom.roadbedWidth/2;
        const maxY=dir<0 ? geom.roadbedWidth/2 : geom.offset+geom.roadbedWidth/2;
        ctx.strokeRect(-geom.halfLength-4*scale,minY-4*scale,geom.length+8*scale,(maxY-minY)+8*scale);
      } else if(isTrackBufferAccessoryKind(item.kind)){
        const geom=trackBufferGeometryPx(item);
        ctx.strokeRect(-geom.length*.35-4*scale,-geom.width*.58-4*scale,geom.length*1.4+8*scale,geom.width*1.16+8*scale);
      } else {
        const boxSize=36;
        ctx.strokeRect(-boxSize/2*scale,-boxSize/2*scale,boxSize*scale,boxSize*scale);
      }
      if(selected && !item.locked){
        ctx.setLineDash([]);
        ctx.strokeStyle='rgba(75,68,56,.75)';
        ctx.fillStyle='#fffaf0';
        const handleLocal=trackAccessoryRotationHandleLocal(item);
        const stemStartY=isTrackSwitchAccessoryKind(item.kind)
          ? (trackSwitchDirection(item.kind)<0
              ? -trackSwitchGeometryPx(item).offset-trackSwitchGeometryPx(item).roadbedWidth/2-4*scale
              : -trackSwitchGeometryPx(item).roadbedWidth/2-4*scale)
          : -18*scale;
        ctx.beginPath();
        ctx.moveTo(0,stemStartY);
        ctx.lineTo(handleLocal.x,handleLocal.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(handleLocal.x,handleLocal.y,6.8*scale,0,Math.PI*2);
        ctx.fill();
        ctx.stroke();
        ctx.font=`${11*scale}px system-ui`;
        ctx.fillStyle='#4b4438';
        ctx.fillText('↻',handleLocal.x-4*scale,handleLocal.y+4*scale);
      }
    }
    ctx.restore();
    if(selected||hovered) drawLabel(item.name||trackAccessoryLabel(item.kind),trackAccessoryLabelPoint(item));
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
  function hakoRectPolygonMm(x,y,w,d){return [{x,y},{x:x+w,y},{x:x+w,y:y+d},{x,y:y+d}];}
  function hakoWingBoundsMm(cfg,wing){
    if(!cfg || !wing) return null;
    const width=Number(cfg.width)||0, depth=Number(cfg.depth)||0;
    const span=Number(wing.span)||0, wingDepth=Number(wing.depth)||0, offset=Number(wing.offset)||0;
    if(!(span>0) || !(wingDepth>0)) return null;
    const face=String(wing.face||'').toLowerCase();
    if(face==='east'||face==='right') return {x:width,y:offset,w:wingDepth,d:span};
    if(face==='west'||face==='left') return {x:-wingDepth,y:offset,w:wingDepth,d:span};
    if(face==='front') return {x:offset,y:-wingDepth,w:span,d:wingDepth};
    if(face==='back'||face==='rear') return {x:offset,y:depth,w:span,d:wingDepth};
    return null;
  }
  function hakoBlockPolygonsMm(cfg){
    if(!cfg || typeof cfg!=='object') return [];
    const width=Number(cfg.width)||Number(cfg.widthMm)||0, depth=Number(cfg.depth)||Number(cfg.depthMm)||0;
    if(!(width>0) || !(depth>0)) return [];
    const blocks=[{id:'main', poly:hakoRectPolygonMm(0,0,width,depth)}];
    (Array.isArray(cfg.wings)?cfg.wings:[]).forEach((wing,i)=>{
      const b=hakoWingBoundsMm(cfg,wing);
      if(b) blocks.push({id:wing.id||`wing_${i+1}`, poly:hakoRectPolygonMm(b.x,b.y,b.w,b.d)});
    });
    return blocks;
  }
  function normalizeAngleDeg180(value){
    let out=Number(value)||0;
    while(out>180) out-=360;
    while(out<=-180) out+=360;
    return out;
  }
  function hakoLongestEdgeAngleDeg(polys){
    let bestLen=-1, bestAngle=null;
    (polys||[]).forEach(poly=>{
      if(!Array.isArray(poly) || poly.length<2) return;
      for(let i=0;i<poly.length;i++){
        const p=poly[i], q=poly[(i+1)%poly.length];
        const dx=q.x-p.x, dy=q.y-p.y;
        const len=Math.hypot(dx,dy);
        if(len>bestLen){
          bestLen=len;
          bestAngle=Math.atan2(dy,dx)*180/Math.PI;
        }
      }
    });
    return bestAngle;
  }
  function hakoFootprintRotationDeg(b){
    if(!b || !b.hakoConfig || !state.pxPerMm) return Number(b?.rotationDeg)||0;
    if(b.padType==='rect') return Number(b.rotationDeg)||0;
    const localPolys=hakoBlockPolygonsMm(b.hakoConfig).map(block=>block.poly);
    const localAngle=hakoLongestEdgeAngleDeg(localPolys);
    const siteAngle=hakoLongestEdgeAngleDeg([buildingPoints(b)]);
    if(Number.isFinite(localAngle) && Number.isFinite(siteAngle)){
      return normalizeAngleDeg180(siteAngle-localAngle);
    }
    return Number(b.rotationDeg)||0;
  }
  function hakoCutTargetId(cut){return (cut && cut.targetId) ? String(cut.targetId) : 'main';}
  function hakoCutTargetBoundsMm(cfg,cut){
    const target=hakoCutTargetId(cut);
    if(target!=='main'){
      const wing=(Array.isArray(cfg?.wings)?cfg.wings:[]).find(w=>String(w.id||'')===target);
      const bounds=hakoWingBoundsMm(cfg,wing);
      if(bounds) return {kind:'wing', wing, ...bounds};
    }
    return {kind:'main', x:0, y:0, w:Number(cfg?.width)||0, d:Number(cfg?.depth)||0};
  }
  function resolveHakoLayoutCut(cut,cfg){
    if(!cut || cut.type!=='arc' || cut.positionMode!=='measured') return cut;
    const b=hakoCutTargetBoundsMm(cfg,cut);
    let p1,p2,maxOffset;
    if(b.kind==='wing' && b.wing){
      const wing=b.wing;
      maxOffset=Math.max(0,Number(wing.depth)||0);
      const a=clamp(Number(cut.startOffset)||0,0,maxOffset);
      const e=clamp(Number(cut.endOffset)||0,0,maxOffset);
      const width=Number(cfg.width)||0, depth=Number(cfg.depth)||0;
      if(wing.face==='east'){p1={x:width+a,y:wing.offset}; p2={x:width+e,y:wing.offset+wing.span};}
      else if(wing.face==='west'){p1={x:0-a,y:wing.offset}; p2={x:0-e,y:wing.offset+wing.span};}
      else if(wing.face==='front'){p1={x:wing.offset,y:0-a}; p2={x:wing.offset+wing.span,y:0-e};}
      else {p1={x:wing.offset,y:depth+a}; p2={x:wing.offset+wing.span,y:depth+e};}
    }else{
      const edge=cut.referenceEdge||'back';
      maxOffset=(edge==='front'||edge==='back')?Math.max(0,b.d):Math.max(0,b.w);
      const a=clamp(Number(cut.startOffset)||0,0,maxOffset);
      const e=clamp(Number(cut.endOffset)||0,0,maxOffset);
      if(edge==='front'){p1={x:b.x,y:b.y+a}; p2={x:b.x+b.w,y:b.y+e};}
      else if(edge==='back'){p1={x:b.x,y:b.y+b.d-a}; p2={x:b.x+b.w,y:b.y+b.d-e};}
      else if(edge==='east'){p1={x:b.x+b.w-a,y:b.y}; p2={x:b.x+b.w-e,y:b.y+b.d};}
      else {p1={x:b.x+a,y:b.y}; p2={x:b.x+e,y:b.y+b.d};}
    }
    const dx=p2.x-p1.x, dy=p2.y-p1.y, len=Math.max(0.0001,Math.hypot(dx,dy));
    const bulge=Number.isFinite(Number(cut.bulge))?Number(cut.bulge):20;
    const side=Number(cut.bulgeSide)<0?-1:1;
    const nx=-dy/len, ny=dx/len;
    const mid={x:(p1.x+p2.x)/2,y:(p1.y+p2.y)/2};
    return {...cut,x1:p1.x,y1:p1.y,x2:p2.x,y2:p2.y,cx:mid.x+nx*bulge*side,cy:mid.y+ny*bulge*side,_measuredResolved:true};
  }
  function sampleHakoLayoutCutSegments(cut,cfg){
    cut=resolveHakoLayoutCut(cut,cfg);
    if(!cut || cut.enabled===false) return [];
    if(cut.type!=='arc') return [[{x:+cut.x1,y:+cut.y1},{x:+cut.x2,y:+cut.y2}]];
    const p0={x:+cut.x1,y:+cut.y1}, p1={x:+cut.cx,y:+cut.cy}, p2={x:+cut.x2,y:+cut.y2};
    const pts=[];
    for(let i=0;i<=24;i++){
      const t=i/24, mt=1-t;
      pts.push({x:mt*mt*p0.x+2*mt*t*p1.x+t*t*p2.x,y:mt*mt*p0.y+2*mt*t*p1.y+t*t*p2.y});
    }
    const segs=[];
    for(let i=0;i<pts.length-1;i++) if(Math.hypot(pts[i+1].x-pts[i].x,pts[i+1].y-pts[i].y)>0.001) segs.push([pts[i],pts[i+1]]);
    return segs;
  }
  function clipHakoPolygonByLayoutCuts(poly,cuts,cfg){
    let out=(poly||[]).map(p=>({x:p.x,y:p.y}));
    (cuts||[]).forEach(cut=>{
      sampleHakoLayoutCutSegments(cut,cfg).forEach(([a,z])=>{
        if(out.length<3) return;
        out=clipPolygonByHalfPlane(out,a,z,cut.keepSide==='right'?'right':'left');
      });
    });
    return out;
  }
  function activeHakoLayoutCuts(b){
    if(!b || !b.hakoConfig) return [];
    return collectArrayFields(b.hakoConfig,[
      ['layoutCuts'], ['shapeCuts'], ['shapeEditor','layoutCuts'], ['geometry','layoutCuts'], ['building','layoutCuts']
    ]).filter(c=>c && c.enabled!==false);
  }
  function visibleBuildingPolygons(b){
    const base=buildingPoints(b).map(p=>({x:p.x,y:p.y}));
    if(base.length<3 || !state.pxPerMm || !b || !b.hakoConfig) return base.length>=3?[base]:[];
    const cuts=activeHakoLayoutCuts(b);
    const hasTargetedCuts=cuts.some(c=>hakoCutTargetId(c)!=='main');
    const blocks=hasTargetedCuts ? hakoBlockPolygonsMm(b.hakoConfig) : [];
    if(!blocks.length){
      let out=base;
      const mainCuts=cuts.filter(c=>hakoCutTargetId(c)==='main');
      if(mainCuts.length){
        const localBase=base.map(p=>hakoWorldToLocalMm(b,p));
        const clipped=clipHakoPolygonByLayoutCuts(localBase,mainCuts,b.hakoConfig);
        if(clipped && clipped.length>=3) out=clipped.map(p=>hakoLocalMmToWorld(b,p));
      }
      return out.length>=3?[out]:[base];
    }
    const polys=[];
    blocks.forEach(block=>{
      let poly=block.poly.map(p=>({x:p.x,y:p.y}));
      const blockCuts=cuts.filter(c=>hakoCutTargetId(c)===block.id);
      if(blockCuts.length) poly=clipHakoPolygonByLayoutCuts(poly,blockCuts,b.hakoConfig);
      if(poly && poly.length>=3) polys.push(poly.map(p=>hakoLocalMmToWorld(b,p)));
    });
    return polys.length ? polys : [base];
  }
  function visibleBuildingPoints(b){
    return visibleBuildingPolygons(b).flat();
  }
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
  function cloneSitePlannerValue(value){
    return typeof structuredClone==='function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  }
  function buildingHasProtectedWork(b){
    if(!b) return false;
    if(b.hakoFile || b.completedHakoFile || b.hakoFileId || b.hakoConfig || b.linkedHakoConfig) return true;
    if(b.githubLibraryRecord || b.hakomachiHandoff || b.sitePlannerHandoff) return true;
    if(b.hakoSeed && Object.keys(b.hakoSeed).length) return true;
    return !!(b.state && b.state!=='notStarted');
  }
  function buildingResizeProtectionSummary(b){
    if(b?.hakoFile?.fileName) return `attached file ${b.hakoFile.fileName}`;
    if(b?.hakoFileId) return `linked file ${b.hakoFileId}`;
    if(b?.githubLibraryRecord?.path) return `GitHub library file ${b.githubLibraryRecord.path}`;
    if(b?.hakoConfig || b?.linkedHakoConfig) return 'existing generated building settings';
    if(b?.hakoSeed) return 'existing generated building seed';
    if(b?.state && b.state!=='notStarted') return `status ${buildingStateLabel(b.state)}`;
    return 'existing building work';
  }
  function buildingFootprintChanged(before, after){
    if(!before || !after) return false;
    if(before.padType!==after.padType) return true;
    if(before.padType==='rect'){
      const bw=Number(before.widthPx)||0, bd=Number(before.depthPx)||0;
      const aw=Number(after.widthPx)||0, ad=Number(after.depthPx)||0;
      return Math.abs(bw-aw)>.01 || Math.abs(bd-ad)>.01;
    }
    const a=Array.isArray(before.pointsPx)?before.pointsPx:[];
    const b=Array.isArray(after.pointsPx)?after.pointsPx:[];
    if(a.length!==b.length) return true;
    return a.some((p,i)=>Math.abs((Number(p.x)||0)-(Number(b[i].x)||0))>.01 || Math.abs((Number(p.y)||0)-(Number(b[i].y)||0))>.01);
  }
  function restoreBuildingSnapshot(target, snapshot){
    if(!target || !snapshot) return;
    Object.keys(target).forEach(key=>delete target[key]);
    Object.assign(target, cloneSitePlannerValue(snapshot));
    normalizeBuilding(target);
    syncBuildingMetrics(target);
  }
  function formatFootprintSize(size){
    return size && Number(size.widthMm)>0 && Number(size.depthMm)>0
      ? `${fmt(size.widthMm)} x ${fmt(size.depthMm)} mm`
      : 'unknown size';
  }
  function ensureBuildingResizeConfirmModal(){
    let modal=document.getElementById('buildingResizeConfirmModal');
    if(modal) return modal;
    modal=document.createElement('div');
    modal.id='buildingResizeConfirmModal';
    modal.className='hakoProgressModal buildingResizeConfirmModal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-labelledby','buildingResizeConfirmTitle');
    modal.innerHTML=`
      <div class="hakoProgressCard buildingResizeConfirmCard" tabindex="-1">
        <h2 id="buildingResizeConfirmTitle">Replace building geometry?</h2>
        <p id="buildingResizeConfirmSummary" class="buildingResizeConfirmSummary"></p>
        <div id="buildingResizeConfirmDetails" class="buildingResizeConfirmDetails"></div>
        <div class="githubDataActions buildingResizeConfirmActions">
          <button type="button" id="buildingResizeCancel">Cancel</button>
          <button type="button" id="buildingResizeReplace" class="primary">Replace</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    return modal;
  }
  function showBuildingResizeConfirmModal({title, summary, detailsHtml}){
    const modal=ensureBuildingResizeConfirmModal();
    const card=modal.querySelector('.buildingResizeConfirmCard');
    const titleEl=modal.querySelector('#buildingResizeConfirmTitle');
    const summaryEl=modal.querySelector('#buildingResizeConfirmSummary');
    const detailsEl=modal.querySelector('#buildingResizeConfirmDetails');
    const cancelBtn=modal.querySelector('#buildingResizeCancel');
    const replaceBtn=modal.querySelector('#buildingResizeReplace');
    if(titleEl) titleEl.textContent=title || 'Replace building geometry?';
    if(summaryEl) summaryEl.textContent=summary || '';
    if(detailsEl) detailsEl.innerHTML=detailsHtml || '';
    modal.classList.add('open');
    return new Promise(resolve=>{
      let settled=false;
      const cleanup=(value)=>{
        if(settled) return;
        settled=true;
        modal.classList.remove('open');
        cancelBtn?.removeEventListener('click',onCancel);
        replaceBtn?.removeEventListener('click',onReplace);
        modal.removeEventListener('click',onOverlay);
        document.removeEventListener('keydown',onKey);
        resolve(value);
      };
      const onCancel=()=>cleanup(false);
      const onReplace=()=>cleanup(true);
      const onOverlay=ev=>{ if(ev.target===modal) cleanup(false); };
      const onKey=ev=>{ if(ev.key==='Escape') cleanup(false); };
      cancelBtn?.addEventListener('click',onCancel);
      replaceBtn?.addEventListener('click',onReplace);
      modal.addEventListener('click',onOverlay);
      document.addEventListener('keydown',onKey);
      setTimeout(()=>replaceBtn?.focus?.() || card?.focus?.(),0);
    });
  }
  async function confirmProtectedBuildingResize(b, opts={}){
    if(!buildingHasProtectedWork(b)) return true;
    if(opts.before && opts.after && !buildingFootprintChanged(opts.before, opts.after)) return true;
    const currentText=opts.currentSize ? formatFootprintSize(opts.currentSize) : null;
    const incomingText=opts.incomingSize ? formatFootprintSize(opts.incomingSize) : null;
    let detailsHtml='';
    if(currentText && incomingText){
      detailsHtml+=`<dl><div><dt>Current footprint</dt><dd>${escapeHtml(currentText)}</dd></div><div><dt>New footprint</dt><dd>${escapeHtml(incomingText)}</dd></div></dl>`;
    }
    if(opts.fileName) detailsHtml+=`<div class="small muted">File to replace: ${escapeHtml(opts.fileName)}</div>`;
    const ok=await showBuildingResizeConfirmModal({
      title:`Resize ${b.name||'building'}?`,
      summary:`This building has ${buildingResizeProtectionSummary(b)}. Replacing will update the existing file or generated geometry for this footprint.`,
      detailsHtml,
    });
    if(!ok) showStatusHint(`Resize canceled for ${b.name||'building'}.`, 'warning');
    return ok;
  }
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
    clearBuildingSelection,
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
  } = createStreetlightController({
    state,
    uid,
    dist,
    clearBuildingSelection,
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
    setSidebarObjectType: value=>{sidebarObjectType=value;},
    syncAll,
    openImportProgressModal,
    setImportProgress,
    finishImportProgress,
    failImportProgress,
  });

  const {
    installWholePageHakoDrop,
    installSelectedHakoSidebarDrop,
  } = createHakoDropController({
    document,
    selected,
    currentSelectedBuildingIds,
    importHakoAsBuilding,
    importStlAsSiteObject,
    attachHakoFileToSelectedBuilding,
    failImportProgress,
  });

  function selectedStlObject(){return (state.stlObjects||[]).find(obj=>obj.id===state.selectedStlObjectId)||null;}
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
  function site3DBuildingFootprintMm(b){ const pts=(b.padType==='rect'?transformedRect(b):(b.pointsPx||[])).map(p=>({x:site3DScale(p.x), y:site3DScale(p.y)})); return pts.length>=3 ? pts : null; }
  function site3DBuildingCenterMm(b){ const c=buildingCenter(b); return {x:site3DScale(c.x), y:site3DScale(c.y)}; }
  function site3DFloorCount(b,cfg){
    const seed=b.hakoSeed||cfg?.hakoSeed||cfg?.sitePlannerSeed||cfg?.seed||null;
    const n=positiveNumber(b.floorCount,cfg?.floorCount,cfg?.floors,cfg?.levels,seed?.floorCount,seed?.floors,seed?.levels);
    return Math.max(1,Math.min(24,Math.round(n||2)));
  }
  function site3DFloorHeightMm(b,cfg){
    const seed=b.hakoSeed||cfg?.hakoSeed||cfg?.sitePlannerSeed||cfg?.seed||null;
    const v=positiveNumber(cfg?.floorHeight,cfg?.floorHeightMm,seed?.floorHeight,seed?.floorHeightMm);
    return Math.max(4,Math.min(40,v||12));
  }
  function site3DBuildingHeightMm(b,cfg){
    const byFloors=site3DFloorCount(b,cfg)*site3DFloorHeightMm(b,cfg);
    if(hasAttachedHakoFile(b)){
      return positiveNumber(cfg?.height,cfg?.heightMm,cfg?.dimensions?.height,cfg?.dimensions?.heightMm,byFloors,b.heightMm,24) || 24;
    }
    return positiveNumber(b.plannerHeightMm,b.heightMm,cfg?.height,cfg?.heightMm,cfg?.dimensions?.height,cfg?.dimensions?.heightMm,byFloors,24) || 24;
  }
  function site3DBuildingElevationMm(b){ return positiveNumber(b.baseElevationMm,b.elevationMm,b.siteElevationMm,0) || 0; }
  function site3DBenchworkFootprintsMm(){
    return (state.benchworkOutlines||[]).map(raw=>{
      const bw=normalizeBenchworkOutline(raw);
      if(!bw || bw.hidden) return null;
      const pts=benchworkSamples(bw,24).map(p=>({x:site3DScale(p.x), y:site3DScale(p.y)}));
      return pts.length>=3 ? pts : null;
    }).filter(Boolean);
  }
  function site3DApplyPlannerDimensions(b,cfg){
    const h=site3DBuildingHeightMm(b,cfg);
    if(h) cfg.height=h;
    if(b.padType==='rect'){
      const w=positiveNumber(b.widthMm), d=positiveNumber(b.depthMm);
      if(w) cfg.width=w;
      if(d) cfg.depth=d;
    }
    return cfg;
  }
  function site3DBuildingConfig(b){
    const raw=b.hakoConfig || b.hakoFile?.parsedConfig || b.hakoSeed || null;
    if(!raw || typeof raw!=='object') return null;
    const cfg=site3DNormalizeBuildingConfig(b, structuredClone(raw));
    return site3DApplyPlannerDimensions(b,cfg);
  }
  function site3DGeneratorBuildingConfig(b){
    const raw=b.hakoConfig || b.hakoFile?.parsedConfig || null;
    if(!raw || typeof raw!=='object') return null;
    const cfg=site3DNormalizeBuildingConfig(b, structuredClone(raw));
    return site3DApplyPlannerDimensions(b,cfg);
  }
  function site3DBounds(){
    const xs=[], ys=[];
    if(state.image || state.imageMeta){
      const w=Number(state.image?.naturalWidth||state.image?.width||state.imageMeta?.naturalWidthPx);
      const h=Number(state.image?.naturalHeight||state.image?.height||state.imageMeta?.naturalHeightPx);
      if(Number.isFinite(w)&&Number.isFinite(h)&&w>0&&h>0){ xs.push(0,site3DScale(w)); ys.push(0,site3DScale(h)); }
    }
    site3DBenchworkFootprintsMm().forEach(pts=>pts.forEach(p=>{ xs.push(p.x); ys.push(p.y); }));
    state.roads.forEach(raw=>{
      const r=normalizeRoad(raw);
      syncRoadMetrics(r);
      const add=pt=>{ xs.push(site3DScale(pt.x)); ys.push(site3DScale(pt.y)); };
      const display=roadDisplayPolygons(r,{perCurve:32,clipToBenchwork:shouldClipRoadsToBenchwork()});
      display.roadPolygons.forEach(poly=>poly.forEach(add));
      display.sidewalkPolygons.forEach(sw=>(sw.polygon||[]).forEach(add));
    });
    (state.tracks||[]).forEach(raw=>{
      const t=normalizeTrack(raw);
      if(t.hidden) return;
      trackPathSamples(t,18).forEach(p=>{ xs.push(site3DScale(p.x)); ys.push(site3DScale(p.y)); });
    });
    (state.trackAccessories||[]).forEach(raw=>{
      const item=normalizeTrackAccessory(raw);
      refreshTrackAccessoryAnchor(item);
      if(item.hidden) return;
      xs.push(site3DScale(item.x));
      ys.push(site3DScale(item.y));
    });
    state.buildings.forEach(raw=>{
      const b=normalizeBuilding(raw);
      if(b.hidden) return;
      const pts=site3DBuildingFootprintMm(b);
      if(pts) pts.forEach(p=>{ xs.push(p.x); ys.push(p.y); });
    });
    (state.stlObjects||[]).forEach(raw=>{
      const obj=normalizeStlObject(raw);
      if(obj.hidden) return;
      stlObjectRect(obj).forEach(p=>{ xs.push(site3DScale(p.x)); ys.push(site3DScale(p.y)); });
    });
    if(!xs.length || !ys.length) return {minX:-60,maxX:60,minY:-40,maxY:40,width:120,depth:80,cx:0,cy:0};
    const width=Math.max(...xs)-Math.min(...xs), depth=Math.max(...ys)-Math.min(...ys);
    const pad=Math.max(8,Math.min(60,Math.max(width,depth)*.06));
    const minX=Math.min(...xs)-pad, maxX=Math.max(...xs)+pad, minY=Math.min(...ys)-pad, maxY=Math.max(...ys)+pad;
    return {minX,maxX,minY,maxY,width:Math.max(1,maxX-minX),depth:Math.max(1,maxY-minY),cx:(minX+maxX)/2,cy:(minY+maxY)/2};
  }
  function disposeSite3DObject(obj){
    if(!obj) return;
    obj.traverse?.(child=>{
      child.geometry?.dispose?.();
      const mats=Array.isArray(child.material)?child.material:[child.material];
      mats.filter(Boolean).forEach(mat=>{
        Object.values(mat).forEach(v=>{ if(v && v.isTexture) v.dispose?.(); });
        mat.dispose?.();
      });
    });
  }
  function tagSite3DBuilding(group,b){
    if(!group || !b) return group;
    group.userData.sitePlannerBuildingId=b.id;
    group.userData.sitePlannerBuildingName=b.name||'Building';
    group.traverse?.(child=>{
      child.userData=child.userData||{};
      child.userData.sitePlannerBuildingId=b.id;
      child.userData.sitePlannerBuildingName=b.name||'Building';
    });
    return group;
  }
  function tagSite3DStlObject(group,obj){
    if(!group || !obj) return group;
    group.userData.sitePlannerStlObjectId=obj.id;
    group.userData.sitePlannerStlObjectName=obj.name||'STL Object';
    group.traverse?.(child=>{
      child.userData=child.userData||{};
      child.userData.sitePlannerStlObjectId=obj.id;
      child.userData.sitePlannerStlObjectName=obj.name||'STL Object';
    });
    return group;
  }
  function site3DMaterial(color,fallback=0xd7b56d,opts={}){
    let c;
    try{ c=new THREE.Color(color || fallback); }catch(_err){ c=new THREE.Color(fallback); }
    const opacity=opts.opacity ?? 1;
    const transparent=opts.transparent ?? opacity<1;
    return new THREE.MeshStandardMaterial({color:c,roughness:.82,metalness:0,opacity,transparent,depthTest:opts.depthTest ?? true,depthWrite:opts.depthWrite ?? !transparent,...opts});
  }
  function site3DPlannerRotationY(b, opts={}){
    if(opts.geometryAlreadyInSiteCoordinates && b?.padType==='polygon') return 0;
    return -(Number(b?.rotationDeg)||0)*Math.PI/180;
  }
  function site3DLongestFootprintEdgeAngleDeg(b){
    const pts=site3DBuildingFootprintMm(b);
    if(!pts || pts.length<2) return null;
    let bestLen=-1;
    let bestAngle=null;
    for(let i=0;i<pts.length;i++){
      const p=pts[i], q=pts[(i+1)%pts.length];
      const dx=q.x-p.x, dy=q.y-p.y;
      const len=Math.hypot(dx,dy);
      if(len>bestLen){
        bestLen=len;
        bestAngle=Math.atan2(dy,dx)*180/Math.PI;
      }
    }
    return bestAngle;
  }
  function site3DAlignAxisAngleDeg(angle, preferred){
    let next=Number(angle);
    const target=Number(preferred);
    if(!Number.isFinite(next) || !Number.isFinite(target)) return next;
    while(next-target>90) next-=180;
    while(next-target<=-90) next+=180;
    return next;
  }
  function site3DExplicitModelRotationDeg(b,cfg){
    const values=[
      b?.site3dModelRotationDeg,
      b?.hakoModelRotationDeg,
      b?.site3d?.modelRotationDeg,
      cfg?.site3dModelRotationDeg,
      cfg?.hakoModelRotationDeg,
      cfg?.site3d?.modelRotationDeg
    ];
    for(const value of values){
      const n=Number(value);
      if(Number.isFinite(n)) return n;
    }
    return null;
  }
  function site3DGeneratorModelBaseRotationDeg(b,cfg){
    const explicit=site3DExplicitModelRotationDeg(b,cfg);
    if(Number.isFinite(explicit)) return explicit;
    const hakoFootprintAngle=hakoFootprintRotationDeg(b);
    if(b?.hakoConfig && b?.padType!=='rect' && Number.isFinite(hakoFootprintAngle)) return hakoFootprintAngle;
    if(b?.padType==='polygon'){
      const edgeAngle=site3DLongestFootprintEdgeAngleDeg(b);
      const modelW=positiveNumber(cfg?.width,cfg?.widthMm,cfg?.dimensions?.width,cfg?.dimensions?.widthMm);
      const modelD=positiveNumber(cfg?.depth,cfg?.depthMm,cfg?.dimensions?.depth,cfg?.dimensions?.depthMm);
      if(Number.isFinite(edgeAngle) && modelW && modelD){
        return site3DAlignAxisAngleDeg(modelD>modelW*1.05 ? edgeAngle+90 : edgeAngle, 0);
      }
    }
    return 0;
  }
  function site3DGeneratorModelRotationY(b,cfg){
    const plannerDeg=Number(b?.rotationDeg)||0;
    const baseDeg=site3DGeneratorModelBaseRotationDeg(b,cfg);
    return -(plannerDeg+baseDeg)*Math.PI/180;
  }
  function site3DGeneratorModelOriginOffset(b,cfg){
    const origin=b?.hakoGeometryOriginMm;
    const w=positiveNumber(cfg?.width,cfg?.widthMm,cfg?.dimensions?.width,cfg?.dimensions?.widthMm);
    const d=positiveNumber(cfg?.depth,cfg?.depthMm,cfg?.dimensions?.depth,cfg?.dimensions?.depthMm);
    const ox=Number(origin?.x), oy=Number(origin?.y);
    if(!w || !d || !Number.isFinite(ox) || !Number.isFinite(oy)) return null;
    return {x:ox-w/2,z:oy-d/2};
  }
  function site3DTypeDefaults(type,fabricType){
    const key=String(type||'').toLowerCase();
    const fabric=String(fabricType||'').toLowerCase();
    if(key.includes('house')||key.includes('residential')||fabric.includes('residential')) return {floorHeight:9,roofStyle:'gabled',windowDensity:'normal',commercial:false,roofColor:0x6f5d52};
    if(key.includes('zakkyo')||key.includes('commercial')||key.includes('tenant')||fabric.includes('commercial')||fabric.includes('station')) return {floorHeight:11,roofStyle:'parapet',windowDensity:'dense',commercial:true,roofColor:0x565656};
    if(key.includes('office')||key.includes('apartment')||key.includes('mixed')) return {floorHeight:11,roofStyle:'parapet',windowDensity:'normal',commercial:false,roofColor:0x5f6466};
    if(key.includes('warehouse')||key.includes('workshop')||key.includes('industrial')||key.includes('service')) return {floorHeight:13,roofStyle:'parapet_gable',windowDensity:'sparse',commercial:false,roofColor:0x4f5558};
    return {floorHeight:12,roofStyle:'parapet',windowDensity:'normal',commercial:false,roofColor:0x5f6466};
  }
  function site3DNormalizeBuildingConfig(b,cfg){
    const seed=(cfg?.kind==='HakoSeed'||cfg?.source==='HakoMachi Site Planner'||cfg?.footprint||cfg?.fabricHints) ? cfg : (b.hakoSeed||null);
    const fabricType=seed?.fabricHints?.fabricType||b.fabricType||b.fabricRegionId||'';
    const type=cfg.buildingType||seed?.buildingType||b.suggestedBuildingType||b.category||'building';
    const defaults=site3DTypeDefaults(type,fabricType);
    cfg.buildingType=type;
    cfg.width=positiveNumber(cfg.width,cfg.widthMm,cfg.dimensions?.width,cfg.dimensions?.widthMm,seed?.width,seed?.widthMm,seed?.footprint?.width,seed?.footprint?.widthMm,b.widthMm) || 28;
    cfg.depth=positiveNumber(cfg.depth,cfg.depthMm,cfg.dimensions?.depth,cfg.dimensions?.depthMm,seed?.depth,seed?.depthMm,seed?.footprint?.depth,seed?.footprint?.depthMm,b.depthMm) || 24;
    cfg.floorCount=site3DFloorCount(b,{...cfg,...seed});
    cfg.floorHeight=positiveNumber(cfg.floorHeight,cfg.floorHeightMm,seed?.floorHeight,seed?.floorHeightMm,defaults.floorHeight) || defaults.floorHeight;
    cfg.height=positiveNumber(cfg.height,cfg.heightMm,seed?.height,seed?.heightMm,cfg.floorCount*cfg.floorHeight,b.heightMm,b.plannerHeightMm) || cfg.floorCount*cfg.floorHeight;
    cfg.roofStyle=cfg.roofStyle||cfg.roof?.style||seed?.roofStyle||defaults.roofStyle;
    cfg.windowDensity=cfg.windowDensity||cfg.windows?.density||seed?.windowDensity||defaults.windowDensity;
    cfg.windowStyle=cfg.windowStyle||cfg.windows?.style||seed?.windowStyle||(defaults.commercial?'storefront':'industrial_small');
    cfg.doorStyle=cfg.doorStyle||cfg.doors?.style||seed?.doorStyle||(defaults.commercial?'glass_storefront':'industrial_metal');
    cfg.commercialIntensity=positiveNumber(seed?.fabricHints?.commercialIntensity,cfg.commercialIntensity,defaults.commercial?0.8:0.2) || 0.2;
    cfg.signageIntensity=positiveNumber(seed?.fabricHints?.signageIntensity,cfg.signageIntensity,defaults.commercial?0.55:0.12) || 0.12;
    cfg.roofColor=cfg.roofColor||defaults.roofColor;
    return cfg;
  }
  function signedArea2D(pts){
    return pts.reduce((sum,p,i)=>{
      const q=pts[(i+1)%pts.length];
      return sum + p.x*q.y - q.x*p.y;
    },0)/2;
  }
  function buildSite3DBase(bounds,baseT){
    const mat=new THREE.MeshStandardMaterial({color:0xcab98d,roughness:.9,metalness:0,side:THREE.DoubleSide,transparent:false,opacity:1,depthTest:true,depthWrite:true});
    const benchworks=site3DBenchworkFootprintsMm();
    if(!benchworks.length){
      const base=new THREE.Mesh(new THREE.BoxGeometry(bounds.width,baseT,bounds.depth),mat);
      base.name='Negative-thickness rectangular site base';
      base.position.y=-baseT/2;
      return base;
    }
    const group=new THREE.Group();
    group.name='Negative-thickness benchwork site base';
    benchworks.forEach((pts,idx)=>{
      const ordered=signedArea2D(pts)<0 ? pts.slice().reverse() : pts.slice();
      const shape=new THREE.Shape();
      ordered.forEach((p,i)=>{
        const x=p.x-bounds.cx;
        const y=p.y-bounds.cy;
        if(i===0) shape.moveTo(x,y);
        else shape.lineTo(x,y);
      });
      shape.closePath();
      const geo=new THREE.ExtrudeGeometry(shape,{depth:baseT,bevelEnabled:false});
      geo.rotateX(Math.PI/2);
      const mesh=new THREE.Mesh(geo,mat);
      mesh.name=`Benchwork base ${idx+1}`;
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry,30),new THREE.LineBasicMaterial({color:0x8a6f43,transparent:true,opacity:.6})));
      group.add(mesh);
    });
    return group;
  }
  function site3DReferenceImageMaskPaths(){
    return (state.benchworkOutlines||[]).map(raw=>{
      const bw=normalizeBenchworkOutline(raw);
      if(!bw || bw.hidden) return null;
      const pts=benchworkSamples(bw,24);
      return pts.length>=3 ? pts : null;
    }).filter(Boolean);
  }
  function buildSite3DReferenceTexture(w,h){
    const masks=site3DReferenceImageMaskPaths();
    if(!masks.length){
      const tex=new THREE.Texture(state.image);
      tex.needsUpdate=true;
      return tex;
    }
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(w));
    canvas.height=Math.max(1,Math.round(h));
    const ctx=canvas.getContext('2d');
    if(!ctx){
      const tex=new THREE.Texture(state.image);
      tex.needsUpdate=true;
      return tex;
    }
    masks.forEach(pts=>{
      ctx.save();
      ctx.beginPath();
      pts.forEach((p,i)=>{
        if(i===0) ctx.moveTo(p.x,p.y);
        else ctx.lineTo(p.x,p.y);
      });
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(state.image,0,0,w,h);
      ctx.restore();
    });
    const tex=(typeof THREE.CanvasTexture==='function') ? new THREE.CanvasTexture(canvas) : new THREE.Texture(canvas);
    tex.needsUpdate=true;
    return tex;
  }
  function buildSite3DReferenceImage(bounds){
    const settings=applySite3DSettings();
    if(!settings.imageVisible || !state.image) return null;
    const w=Number(state.image.naturalWidth||state.image.width||state.imageMeta?.naturalWidthPx);
    const h=Number(state.image.naturalHeight||state.image.height||state.imageMeta?.naturalHeightPx);
    if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0) return null;
    const tex=buildSite3DReferenceTexture(w,h);
    tex.flipY=false;
    tex.needsUpdate=true;
    tex.minFilter=THREE.LinearFilter;
    tex.magFilter=THREE.LinearFilter;
    if(THREE.SRGBColorSpace) tex.colorSpace=THREE.SRGBColorSpace;
    const mat=new THREE.MeshBasicMaterial({
      map:tex,
      transparent:true,
      opacity:settings.imageOpacity,
      side:THREE.DoubleSide,
      depthTest:true,
      depthWrite:false,
      polygonOffset:true,
      polygonOffsetFactor:-1,
      polygonOffsetUnits:-1
    });
    const width=site3DScale(w);
    const depth=site3DScale(h);
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,depth),mat);
    mesh.name='3D reference image plane';
    mesh.rotation.x=Math.PI/2;
    mesh.position.set(width/2-bounds.cx,SITE3D_REFERENCE_IMAGE_Y_MM,depth/2-bounds.cy);
    mesh.renderOrder=SITE3D_REFERENCE_IMAGE_RENDER_ORDER;
    return mesh;
  }
  function site3DAddFlatPolygon(group, pts, mat, outlineMat, name, y=.07){
    if(!pts || pts.length<3) return null;
    const ordered=signedArea2D(pts)<0 ? pts.slice().reverse() : pts.slice();
    const shape=new THREE.Shape();
    ordered.forEach((p,i)=>{
      const x=site3DScale(p.x)-site3d.bounds.cx;
      const z=site3DScale(p.y)-site3d.bounds.cy;
      if(i===0) shape.moveTo(x,z);
      else shape.lineTo(x,z);
    });
    shape.closePath();
    const geo=new THREE.ShapeGeometry(shape);
    geo.rotateX(Math.PI/2);
    const mesh=new THREE.Mesh(geo,mat);
    mesh.name=name;
    mesh.position.y=y;
    group.add(mesh);

    const verts=[];
    ordered.forEach((p,i)=>{
      const q=ordered[(i+1)%ordered.length];
      verts.push(
        site3DScale(p.x)-site3d.bounds.cx, y+.025, site3DScale(p.y)-site3d.bounds.cy,
        site3DScale(q.x)-site3d.bounds.cx, y+.025, site3DScale(q.y)-site3d.bounds.cy
      );
    });
    const edgeGeo=new THREE.BufferGeometry();
    edgeGeo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
    const edge=new THREE.LineSegments(edgeGeo,outlineMat);
    edge.name=`${name} outline`;
    group.add(edge);
    return mesh;
  }
  function site3DAddRaisedPolygon(group, pts, mat, outlineMat, name, topY=.2, height=.15){
    if(!pts || pts.length<3) return null;
    const ordered=signedArea2D(pts)<0 ? pts.slice().reverse() : pts.slice();
    const shape=new THREE.Shape();
    ordered.forEach((p,i)=>{
      const x=site3DScale(p.x)-site3d.bounds.cx;
      const z=site3DScale(p.y)-site3d.bounds.cy;
      if(i===0) shape.moveTo(x,z);
      else shape.lineTo(x,z);
    });
    shape.closePath();
    const geo=new THREE.ExtrudeGeometry(shape,{depth:Math.max(.02,height),bevelEnabled:false});
    geo.rotateX(Math.PI/2);
    const mesh=new THREE.Mesh(geo,mat);
    mesh.name=name;
    mesh.position.y=topY;
    group.add(mesh);
    if(outlineMat) site3DAddEdges(mesh,outlineMat.color?.getHex?.() ?? 0x8f7b55,outlineMat.opacity ?? .45);
    return mesh;
  }
  function site3DTrackProfileMm(t,profile){
    return {
      gauge:Math.max(.1,site3DScale(profile.gauge)),
      railWidth:Math.max(.08,site3DScale(profile.railWidth)),
      railHeight:Math.max(.08,positiveNumber(t.railHeightMm,TRACK_PROFILE_DEFAULTS.railHeightMm) || TRACK_PROFILE_DEFAULTS.railHeightMm),
      tieLength:Math.max(.5,site3DScale(profile.tieLength)),
      tieWidth:Math.max(.12,site3DScale(profile.tieWidth)),
      roadbedHeight:Math.max(.12,positiveNumber(t.roadbedHeightMm,TRACK_PROFILE_DEFAULTS.roadbedHeightMm) || TRACK_PROFILE_DEFAULTS.roadbedHeightMm)
    };
  }
  function site3DAddBoxSegments(group,segments,mat,name,width,height,baseY,bounds){
    const valid=(segments||[]).filter(seg=>seg?.a&&seg?.b&&dist(seg.a,seg.b)>0);
    if(!valid.length) return null;
    const geo=new THREE.BoxGeometry(1,1,1);
    const mesh=new THREE.InstancedMesh(geo,mat,valid.length);
    const matrix=new THREE.Matrix4();
    const quat=new THREE.Quaternion();
    const pos=new THREE.Vector3();
    const scale=new THREE.Vector3();
    const up=new THREE.Vector3(0,1,0);
    valid.forEach((seg,idx)=>{
      const dx=site3DScale(seg.b.x-seg.a.x);
      const dz=site3DScale(seg.b.y-seg.a.y);
      const length=Math.max(.05,Math.hypot(dx,dz));
      const angle=Math.atan2(dz,dx);
      pos.set(site3DScale((seg.a.x+seg.b.x)/2)-bounds.cx,baseY+height/2,site3DScale((seg.a.y+seg.b.y)/2)-bounds.cy);
      quat.setFromAxisAngle(up,-angle);
      scale.set(length,height,width);
      matrix.compose(pos,quat,scale);
      mesh.setMatrixAt(idx,matrix);
    });
    mesh.instanceMatrix.needsUpdate=true;
    mesh.name=name;
    group.add(mesh);
    return mesh;
  }
  function site3DRoadOverlayPolygons(polygons){
    const valid=(polygons||[]).filter(poly=>Array.isArray(poly)&&poly.length>=3);
    if(!shouldClipRoadsToBenchwork()) return valid;
    return valid.flatMap(poly=>clipPolygonToBenchwork(poly,{perCurve:24}));
  }
  function site3DColorMaterial(color, fallback, options={}){
    return new THREE.MeshBasicMaterial({
      color:color||fallback,
      side:THREE.DoubleSide,
      transparent:false,
      opacity:1,
      depthTest:true,
      depthWrite:false,
      polygonOffset:true,
      polygonOffsetFactor:options.polygonOffsetFactor ?? -6,
      polygonOffsetUnits:options.polygonOffsetUnits ?? -6
    });
  }
  function site3DLineMaterial(color, opacity=.96){
    return new THREE.LineBasicMaterial({color:color||0xf7f2df,transparent:true,opacity,depthTest:true,depthWrite:false});
  }
  function roadFeatureWorldMarkingPolygons(feature){
    const width=feature.widthPx||30;
    const depth=feature.depthPx||6;
    const preset={
      ...markingPresetByKey(feature.markingPreset||feature.markingType),
      ...feature,
      widthMm:width,
      depthMm:depth
    };
    return buildRoadMarkingShapes(preset,{x:feature.x,y:feature.y,angle:rad(feature.rotationDeg||0)})
      .filter(shape=>shape.type!=='text')
      .map(shape=>shape.points||[])
      .filter(poly=>poly.length>=3);
  }
  function roadFeatureWorldFixturePolygons(feature){
    if(feature.kind!=='manhole') return [];
    const angle=rad(feature.rotationDeg||0);
    const transformPoint=p=>{
      const c=Math.cos(angle), s=Math.sin(angle);
      return {x:feature.x+p.x*c-p.y*s,y:feature.y+p.x*s+p.y*c};
    };
    if(feature.hatchShape==='circle'){
      const radius=(feature.diameterPx||feature.widthPx||18)/2;
      return [Array.from({length:32},(_,i)=>{
        const a=i/32*Math.PI*2;
        return {x:feature.x+Math.cos(a)*radius,y:feature.y+Math.sin(a)*radius};
      })];
    }
    const w=(feature.widthPx||24)/2;
    const d=(feature.depthPx||18)/2;
    return [[{x:-w,y:-d},{x:w,y:-d},{x:w,y:d},{x:-w,y:d}].map(transformPoint)];
  }
  function addSite3DRoadOverlayPolygons(group,polygons,mat,lineMat,name,y,tagFn){
    site3DRoadOverlayPolygons(polygons).forEach((polygon,idx)=>{
      const mesh=site3DAddFlatPolygon(group,polygon,mat,lineMat,`${name} ${idx+1}`,y);
      tagFn?.(mesh);
    });
  }
  function addSite3DRoadFeatures(group){
    (state.roadFeatures||[]).forEach(raw=>{
      const feature=normalizeRoadFeature(raw);
      if(!feature || feature.hidden) return;
      const selected=feature.id===state.selectedRoadFeatureId || isSiteObjectSelected('roadFeature',feature.id);
      const color=selected?'#d95f24':(feature.color||(feature.kind==='manhole'?'#3a2b1e':'#f7f2df'));
      const mat=site3DColorMaterial(color,feature.kind==='manhole'?0x3a2b1e:0xf7f2df);
      const lineMat=site3DLineMaterial(selected?0xd95f24:(feature.kind==='manhole'?0x1d1712:0xf7f2df),selected?1:.92);
      const polygons=feature.kind==='manhole' ? roadFeatureWorldFixturePolygons(feature) : roadFeatureWorldMarkingPolygons(feature);
      addSite3DRoadOverlayPolygons(group,polygons,mat,lineMat,feature.name||'Road item',.17,mesh=>tagSite3DRoadFeatureObject(mesh,feature));
    });
  }
  function addSite3DGeneratedRoadIntersections(group){
    const whiteMat=site3DColorMaterial(0xf7f2df,0xf7f2df,{polygonOffsetFactor:-7,polygonOffsetUnits:-7});
    const whiteLineMat=site3DLineMaterial(0xf7f2df,.96);
    const tactileMat=site3DColorMaterial(0xd8b95a,0xd8b95a,{polygonOffsetFactor:-8,polygonOffsetUnits:-8});
    const tactileLineMat=site3DLineMaterial(0x8c6a2f,.92);
    roadSystem.generatedRoadIntersections().forEach(intersection=>{
      (intersection.crosswalks||[]).forEach((crosswalk,crosswalkIndex)=>{
        (crosswalk.stripes||[]).forEach((stripe,stripeIndex)=>{
          addSite3DRoadOverlayPolygons(group,[stripe.corners||[]],whiteMat,whiteLineMat,`Generated crosswalk stripe ${crosswalkIndex+1}.${stripeIndex+1}`,.18);
        });
      });
      (intersection.stopBars||[]).forEach((stopBar,idx)=>{
        addSite3DRoadOverlayPolygons(group,[stopBar.corners||[]],whiteMat,whiteLineMat,`Generated stop bar ${idx+1}`,.181);
      });
      (intersection.tactilePavers||[]).forEach((paver,idx)=>{
        addSite3DRoadOverlayPolygons(group,[paver.corners||[]],tactileMat,tactileLineMat,`Generated tactile paver ${idx+1}`,.19);
      });
    });
  }
  function buildSite3DRoadGroup(bounds){
    const group=new THREE.Group();
    group.name='Site Planner roads';
    const roadMat=new THREE.MeshStandardMaterial({color:0x6f6a5e,roughness:.92,metalness:0,transparent:false,opacity:1,depthTest:true,depthWrite:true,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
    const sidewalkMat=new THREE.MeshStandardMaterial({color:0xd9ceb4,roughness:.9,metalness:0,transparent:false,opacity:1,depthTest:true,depthWrite:true,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
    const roadLineMat=new THREE.LineBasicMaterial({color:0x4d4a42,transparent:true,opacity:.72});
    const sidewalkLineMat=new THREE.LineBasicMaterial({color:0x9d8d6a,transparent:true,opacity:.62});
    state.roads.forEach(raw=>{
      const r=normalizeRoad(raw);
      syncRoadMetrics(r);
      const display=roadDisplayPolygons(r,{perCurve:32,clipToBenchwork:shouldClipRoadsToBenchwork()});
      display.roadPolygons.forEach((polygon,idx)=>{
        tagSite3DRoadObject(site3DAddFlatPolygon(group,polygon,roadMat,roadLineMat,`${r.name||'Road'} surface ${idx+1}`,.08),r);
      });
      display.sidewalkPolygons.forEach((sw,idx)=>{
        tagSite3DRoadObject(site3DAddFlatPolygon(group,sw.polygon||[],sidewalkMat,sidewalkLineMat,`${r.name||'Road'} sidewalk ${idx+1}`,.09),r);
      });
    });
    addSite3DGeneratedRoadIntersections(group);
    addSite3DRoadFeatures(group);
    return group.children.length ? group : null;
  }
  function buildSite3DTrackGroup(bounds){
    const group=new THREE.Group();
    group.name='Site Planner tracks';
    const roadbedMat=new THREE.MeshStandardMaterial({color:0xc7b084,roughness:.96,metalness:0,transparent:false,opacity:1,depthTest:true,depthWrite:true,side:THREE.DoubleSide});
    const roadbedLineMat=new THREE.LineBasicMaterial({color:0x8f7b55,transparent:true,opacity:.62});
    const railMat=new THREE.MeshStandardMaterial({color:0x34312b,roughness:.42,metalness:.18,transparent:false,opacity:1,depthTest:true,depthWrite:true});
    const tieMat=new THREE.MeshStandardMaterial({color:0x8a6f43,roughness:.82,metalness:0,transparent:false,opacity:1,depthTest:true,depthWrite:true});
    (state.tracks||[]).forEach(raw=>{
      const t=normalizeTrack(raw);
      if(t.hidden || (t.pointsPx||[]).length<2) return;
      const path=trackPathSamples(t,18);
      const profile=trackProfilePx(t);
      const profileMm=site3DTrackProfileMm(t,profile);
      const railOffset=profile.gauge/2;
      const roadbedPoly=offsetPathPolygon(path,profile.roadbedWidth/2);
      const roadbedTop=profileMm.roadbedHeight;
      const sleeperBase=roadbedTop+.03;
      const sleeperHeight=Math.max(.08,Math.min(.32,profileMm.roadbedHeight*.16));
      const railBase=sleeperBase+sleeperHeight;
      tagSite3DTrackObject(site3DAddRaisedPolygon(group,roadbedPoly,roadbedMat,roadbedLineMat,`${t.name||'Track'} raised cork roadbed`,roadbedTop,profileMm.roadbedHeight),t);
      tagSite3DTrackObject(site3DAddBoxSegments(group,trackTieSegments(t),tieMat,`${t.name||'Track'} sleeper solids`,profileMm.tieWidth,sleeperHeight,sleeperBase,bounds),t);
      const railPathA=offsetTrackPath(path,railOffset);
      const railPathB=offsetTrackPath(path,-railOffset);
      const railSegmentsA=railPathA.slice(1).map((p,i)=>({a:railPathA[i],b:p}));
      const railSegmentsB=railPathB.slice(1).map((p,i)=>({a:railPathB[i],b:p}));
      tagSite3DTrackObject(site3DAddBoxSegments(group,railSegmentsA,railMat,`${t.name||'Track'} rail A solids`,profileMm.railWidth,profileMm.railHeight,railBase,bounds),t);
      tagSite3DTrackObject(site3DAddBoxSegments(group,railSegmentsB,railMat,`${t.name||'Track'} rail B solids`,profileMm.railWidth,profileMm.railHeight,railBase,bounds),t);
    });
    return group.children.length ? group : null;
  }
  function site3DAddEdges(mesh,color=0x4b3828,opacity=.45){
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry,30),new THREE.LineBasicMaterial({color,transparent:true,opacity})));
    return mesh;
  }
  function site3DBox(w,h,d,mat,x,y,z){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(Math.max(.05,w),Math.max(.05,h),Math.max(.05,d)),mat);
    mesh.position.set(x||0,y||0,z||0);
    return mesh;
  }
  function site3DBeam(group,a,b,radius,mat,name='Catenary beam'){
    const start=new THREE.Vector3(a.x,a.y,a.z);
    const end=new THREE.Vector3(b.x,b.y,b.z);
    const delta=end.clone().sub(start);
    const len=delta.length();
    if(!(len>.01)) return null;
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,len,8),mat);
    mesh.name=name;
    mesh.position.copy(start.add(end).multiplyScalar(.5));
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());
    group.add(mesh);
    return mesh;
  }
  function tagSite3DTrackAccessory(group,item){
    if(!group || !item) return group;
    if(!group.userData?.sitePlannerTrackAccessoryPickProxy){
      const pickMat=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.001,depthWrite:false});
      const pick=new THREE.Mesh(new THREE.BoxGeometry(30,36,30),pickMat);
      pick.name=`${item.name||trackAccessoryLabel(item.kind)} 3D pick volume`;
      pick.position.y=18;
      pick.userData.sitePlannerTrackAccessoryPickProxy=true;
      group.add(pick);
    }
    group.userData.sitePlannerTrackAccessoryId=item.id;
    group.userData.sitePlannerTrackAccessoryName=item.name||trackAccessoryLabel(item.kind);
    group.traverse?.(child=>{
      child.userData=child.userData||{};
      child.userData.sitePlannerTrackAccessoryId=item.id;
      child.userData.sitePlannerTrackAccessoryName=item.name||trackAccessoryLabel(item.kind);
    });
    return group;
  }
  function tagSite3DRoadObject(object,road){
    if(!object || !road) return object;
    object.userData=object.userData||{};
    object.userData.sitePlannerRoadId=road.id;
    object.userData.sitePlannerRoadName=road.name||'Road';
    object.traverse?.(child=>{
      child.userData=child.userData||{};
      child.userData.sitePlannerRoadId=road.id;
      child.userData.sitePlannerRoadName=road.name||'Road';
    });
    return object;
  }
  function tagSite3DTrackObject(object,track){
    if(!object || !track) return object;
    object.userData=object.userData||{};
    object.userData.sitePlannerTrackId=track.id;
    object.userData.sitePlannerTrackName=track.name||'Track';
    object.traverse?.(child=>{
      child.userData=child.userData||{};
      child.userData.sitePlannerTrackId=track.id;
      child.userData.sitePlannerTrackName=track.name||'Track';
    });
    return object;
  }
  function tagSite3DRoadFeatureObject(object,feature){
    if(!object || !feature) return object;
    object.userData=object.userData||{};
    object.userData.sitePlannerRoadFeatureId=feature.id;
    object.userData.sitePlannerRoadFeatureName=feature.name||'Road item';
    object.traverse?.(child=>{
      child.userData=child.userData||{};
      child.userData.sitePlannerRoadFeatureId=feature.id;
      child.userData.sitePlannerRoadFeatureName=feature.name||'Road item';
    });
    return object;
  }
  function buildSite3DCatenaryItem(item,bounds){
    refreshTrackAccessoryAnchor(item);
    const selected=item.id===state.selectedTrackAccessoryId || isSiteObjectSelected('trackAccessory',item.id);
    const material=new THREE.MeshStandardMaterial({
      color:selected?0xc8493a:0xf2f0e8,
      roughness:.72,
      metalness:.02,
      transparent:false,
      opacity:1,
      depthTest:true,
      depthWrite:true,
    });
    const detailMat=new THREE.MeshStandardMaterial({color:selected?0x8f2f24:0xd8d3c5,roughness:.78,metalness:.02});
    const group=new THREE.Group();
    group.name=item.name||trackAccessoryLabel(item.kind);
    group.position.set(site3DScale(item.x)-bounds.cx,0,site3DScale(item.y)-bounds.cy);
    group.rotation.y=-rad(item.rotationDeg||0);
    const addBox=(w,h,d,x,y,z,mat=material)=>group.add(site3DAddEdges(site3DBox(w,h,d,mat,x,y,z),0x9b9485,.28));
    const addInsulator=(x,y,z)=>addBox(.7,1.4,.7,x,y,z,detailMat);
    if(item.kind==='catenaryDoublePortal'){
      const poleZ=13.5;
      const height=28;
      addBox(5,.45,4.2,0,.23,-poleZ);
      addBox(5,.45,4.2,0,.23,poleZ);
      addBox(.9,height,.9,0,height/2,-poleZ);
      addBox(.9,height,.9,0,height/2,poleZ);
      site3DBeam(group,{x:0,y:height,z:-poleZ},{x:0,y:height,z:poleZ},.32,material,'Catenary portal top chord');
      site3DBeam(group,{x:0,y:height-4,z:-poleZ},{x:0,y:height-4,z:poleZ},.24,material,'Catenary portal lower chord');
      [-8,-3,3,8].forEach((z,i)=>{
        site3DBeam(group,{x:0,y:height-4,z},{x:0,y:height,z:z+(i%2===0?4:-4)},.18,material,'Catenary portal truss brace');
      });
      site3DBeam(group,{x:0,y:19,z:-poleZ},{x:0,y:height-4,z:-7},.22,material,'Catenary left brace');
      site3DBeam(group,{x:0,y:19,z:poleZ},{x:0,y:height-4,z:7},.22,material,'Catenary right brace');
      addInsulator(0,height-6,-5.2);
      addInsulator(0,height-6,5.2);
    } else {
      const poleZ=-11;
      const height=28;
      addBox(5,.45,4.2,0,.23,poleZ);
      addBox(.9,height,.9,0,height/2,poleZ);
      site3DBeam(group,{x:0,y:height-3,z:poleZ},{x:0,y:height-3,z:10},.3,material,'Single-side catenary outreach');
      site3DBeam(group,{x:0,y:height-10,z:poleZ},{x:0,y:height-3,z:7},.22,material,'Single-side catenary brace');
      site3DBeam(group,{x:0,y:height-8,z:-4},{x:0,y:height-8,z:12},.18,material,'Single-side contact wire guide');
      site3DBeam(group,{x:0,y:height-3,z:7},{x:0,y:height-8,z:12},.16,material,'Single-side catenary hanger');
      addBox(5,.45,.7,0,height+1,poleZ);
      addInsulator(0,height-7,8);
    }
    return tagSite3DTrackAccessory(group,item);
  }
  function buildSite3DTrackSwitchItem(item,bounds){
    refreshTrackAccessoryAnchor(item);
    const railMat=new THREE.MeshStandardMaterial({color:TRACK_PROFILE_DEFAULTS.railColor||'#3b3832',roughness:.48,metalness:.12});
    const tieMat=new THREE.MeshStandardMaterial({color:TRACK_PROFILE_DEFAULTS.tieColor||'#8a6f43',roughness:.84,metalness:0});
    const baseMat=new THREE.MeshStandardMaterial({color:TRACK_PROFILE_DEFAULTS.roadbedTopColor||TRACK_PROFILE_DEFAULTS.roadbedColor||'#c7b084',roughness:.95,metalness:0});
    const group=new THREE.Group();
    group.name=item.name||trackAccessoryLabel(item.kind);
    group.position.set(site3DScale(item.x)-bounds.cx,0,site3DScale(item.y)-bounds.cy);
    group.rotation.y=-rad(item.rotationDeg||0);
    const dir=trackSwitchDirection(item.kind);
    const geom=trackSwitchGeometrySite3D(item);
    const roadbedHeight=Math.max(.12,TRACK_PROFILE_DEFAULTS.roadbedHeightMm||2.5);
    const sleeperHeight=Math.max(.08,Math.min(.32,roadbedHeight*.16));
    const sleeperBase=roadbedHeight+.03;
    const railHeight=Math.max(.08,TRACK_PROFILE_DEFAULTS.railHeightMm||.8);
    const railBase=sleeperBase+sleeperHeight;
    const scale=geom.gauge/Math.max(.1,TOMIX_TURNOUT_GAUGE_MM);
    const switchTieSpacing=Math.max(1.5*scale,Math.min(geom.tieSpacing,(TRACK_PROFILE_DEFAULTS.tieSpacingMm||4)*scale));
    const branch=trackSwitchCurvePoints(geom,dir,24);
    const branchRailA=offsetTrackPath(branch,geom.gauge/2);
    const branchRailB=offsetTrackPath(branch,-geom.gauge/2);
    const addLocalSegment=(a,b,width,height,baseY,mat,name)=>{
      const dx=b.x-a.x, dz=b.y-a.y;
      const length=Math.hypot(dx,dz);
      if(!(length>.01)) return null;
      const mesh=site3DAddEdges(site3DBox(length,height,width,mat,(a.x+b.x)/2,baseY+height/2,(a.y+b.y)/2),0x5f5140,.18);
      mesh.name=name;
      mesh.rotation.y=-Math.atan2(dz,dx);
      group.add(mesh);
      return mesh;
    };
    const addRailPath=(points,name)=>{
      for(let i=0;i<points.length-1;i++){
        addLocalSegment(points[i],points[i+1],Math.max(.08,geom.railWidth),railHeight,railBase,railMat,name);
      }
    };
    const addTie=(p,nx,ny,name)=>{
      const half=Math.max(geom.tieLength/2,geom.gauge/2+2);
      addLocalSegment({x:p.x-nx*half,y:p.y-ny*half},{x:p.x+nx*half,y:p.y+ny*half},Math.max(.12,geom.tieWidth),sleeperHeight,sleeperBase,tieMat,name);
    };
    const addStraightTieStations=(points,name)=>{
      const a=points[0], b=points[1];
      const dx=b.x-a.x, dy=b.y-a.y, len=Math.hypot(dx,dy);
      if(!(len>.01)) return;
      for(let d=0; d<=len+.001; d+=switchTieSpacing){
        const p={x:a.x+dx*(d/len),y:a.y+dy*(d/len)};
        addTie(p,-dy/len,dx/len,name);
      }
    };
    const branchPointAtX=x=>{
      const ratio=clamp((x+geom.halfLength)/Math.max(.1,geom.radius),0,Math.sin(geom.angleRad));
      const a=Math.asin(ratio);
      return {x,y:dir*geom.radius*(1-Math.cos(a))};
    };
    const addDivergingTurnoutTieStations=()=>{
      const minSeparation=Math.max(geom.gauge*.42,2.4*scale);
      for(let x=-geom.halfLength+switchTieSpacing*.5; x<=geom.halfLength+.001; x+=switchTieSpacing){
        const p=branchPointAtX(x);
        if(Math.abs(p.y)<minSeparation) continue;
        addTie(p,0,1,'Tomix switch diverging turnout tie');
      }
    };
    group.add(site3DAddEdges(site3DBox(geom.length,roadbedHeight,geom.roadbedWidth,baseMat,0,roadbedHeight/2,0),0x8f7b55,.35));
    for(let i=0;i<branch.length-1;i++){
      addLocalSegment(branch[i],branch[i+1],Math.max(.5,geom.roadbedWidth),roadbedHeight,0,baseMat,'Tomix switch curved roadbed');
    }
    addStraightTieStations([{x:-geom.halfLength,y:0},{x:geom.halfLength,y:0}],'Tomix switch straight tie');
    addDivergingTurnoutTieStations();
    addRailPath([{x:-geom.halfLength,y:-geom.gauge/2},{x:geom.halfLength,y:-geom.gauge/2}],'Tomix switch straight rail A');
    addRailPath([{x:-geom.halfLength,y:geom.gauge/2},{x:geom.halfLength,y:geom.gauge/2}],'Tomix switch straight rail B');
    addRailPath(branchRailA,'Tomix switch diverging rail A');
    addRailPath(branchRailB,'Tomix switch diverging rail B');
    addLocalSegment({x:-geom.halfLength+geom.length*.34,y:0},{x:-geom.halfLength+geom.length*.52,y:dir*geom.offset*.42},Math.max(.08,geom.railWidth*.72),Math.max(.08,railHeight*.7),railBase,railMat,'Tomix switch point blade');
    return tagSite3DTrackAccessory(group,item);
  }
  function buildSite3DTrackBufferItem(item,bounds){
    refreshTrackAccessoryAnchor(item);
    const selected=item.id===state.selectedTrackAccessoryId || isSiteObjectSelected('trackAccessory',item.id);
    const railMat=new THREE.MeshStandardMaterial({color:selected?0xc8493a:0x34312b,roughness:.48,metalness:.12});
    const tieMat=new THREE.MeshStandardMaterial({color:0x8a6f43,roughness:.84,metalness:0});
    const baseMat=new THREE.MeshStandardMaterial({color:0xc7b084,roughness:.95,metalness:0});
    const bufferMat=new THREE.MeshStandardMaterial({color:selected?0xc8493a:0x6f6a5e,roughness:.76,metalness:.02});
    const terminalMat=new THREE.MeshStandardMaterial({color:0x8a8a86,roughness:.72,metalness:.04});
    const group=new THREE.Group();
    group.name=item.name||trackAccessoryLabel(item.kind);
    group.position.set(site3DScale(item.x)-bounds.cx,0,site3DScale(item.y)-bounds.cy);
    group.rotation.y=-rad(item.rotationDeg||0);
    const geom=trackBufferGeometrySite3D(item);
    const halfW=geom.width/2;
    group.add(site3DAddEdges(site3DBox(geom.length*1.35,.34,geom.width,baseMat,geom.length*.32,.12,0),0x8f7b55,.35));
    for(let x=-geom.length*.25; x<geom.length*.82; x+=Math.max(geom.tieSpacing,2)){
      group.add(site3DBox(Math.max(.35,geom.tieSpacing*.15),.34,geom.width*.86,tieMat,x,.45,0));
    }
    site3DBeam(group,{x:-geom.length*.35,y:.85,z:-geom.gauge/2},{x:geom.length*.78,y:.85,z:-geom.gauge/2},Math.max(.1,geom.railWidth/2),railMat,'Buffer rail A');
    site3DBeam(group,{x:-geom.length*.35,y:.85,z:geom.gauge/2},{x:geom.length*.78,y:.85,z:geom.gauge/2},Math.max(.1,geom.railWidth/2),railMat,'Buffer rail B');
    group.add(site3DAddEdges(site3DBox(geom.length*.22,2.4,geom.width*.88,bufferMat,geom.length*.88,1.4,0),0x4b4438,.4));
    group.add(site3DAddEdges(site3DBox(geom.length*.34,.6,geom.width*.96,bufferMat,geom.length*.82,2.8,0),0x4b4438,.4));
    group.add(site3DBox(geom.length*.22,.35,geom.width*.22,bufferMat,geom.length*.64,1.05,-geom.gauge/2));
    group.add(site3DBox(geom.length*.22,.35,geom.width*.22,bufferMat,geom.length*.64,1.05,geom.gauge/2));
    if(trackBufferHasCatenaryTerminal(item)){
      const x=geom.length*.55;
      const z=-halfW-4;
      const h=Math.max(22,geom.terminalHeight);
      const w=4.4;
      const addTerminalBeam=(a,b,r=.16,name='Catenary terminal truss')=>site3DBeam(group,a,b,r,terminalMat,name);
      group.add(site3DAddEdges(site3DBox(7,.65,5,terminalMat,x,.35,z),0x6f6a5e,.35));
      addTerminalBeam({x:x-w/2,y:.8,z},{x:x-w/2,y:h,z},.22,'Terminal side post');
      addTerminalBeam({x:x+w/2,y:.8,z},{x:x+w/2,y:h,z},.22,'Terminal side post');
      addTerminalBeam({x:x-w/2,y:h,z},{x:x+w/2,y:h,z},.2,'Terminal top brace');
      for(let y=6;y<h-4;y+=7){
        addTerminalBeam({x:x-w/2,y,z},{x:x+w/2,y:y+4,z},.13,'Terminal diagonal brace');
        addTerminalBeam({x:x+w/2,y:y+4,z},{x:x-w/2,y:y+8,z},.13,'Terminal diagonal brace');
      }
      addTerminalBeam({x,y:h*.72,z},{x:x-12,y:h*.68,z:z+1.5},.14,'Terminal wire arm');
      addTerminalBeam({x,y:h*.52,z},{x:x-11,y:h*.48,z:z+1.5},.14,'Terminal wire arm');
      group.add(site3DBox(.9,.9,.9,terminalMat,x-12,h*.68,z+1.5));
      group.add(site3DBox(.9,.9,.9,terminalMat,x-11,h*.48,z+1.5));
    }
    return tagSite3DTrackAccessory(group,item);
  }
  function buildSite3DCrossingSignalItem(item,bounds){
    const selected=item.id===state.selectedTrackAccessoryId || isSiteObjectSelected('trackAccessory',item.id);
    const yellowMat=new THREE.MeshStandardMaterial({color:selected?0xc8493a:0xf0b82f,roughness:.78,metalness:.02});
    const blackMat=new THREE.MeshStandardMaterial({color:0x23201c,roughness:.72,metalness:.04});
    const redMat=new THREE.MeshStandardMaterial({color:0xd52522,emissive:0x4a0504,roughness:.38,metalness:.02});
    const lensOffMat=new THREE.MeshStandardMaterial({color:0x3a1715,roughness:.48,metalness:.02});
    const metalMat=new THREE.MeshStandardMaterial({color:0x6f6a5e,roughness:.68,metalness:.08});
    const group=new THREE.Group();
    group.name=item.name||trackAccessoryLabel(item.kind);
    group.position.set(site3DScale(item.x)-bounds.cx,0,site3DScale(item.y)-bounds.cy);
    group.rotation.y=-rad(item.rotationDeg||0);
    const addBox=(w,h,d,x,y,z,mat=yellowMat,edge=0x4b4438)=>{
      const mesh=site3DAddEdges(site3DBox(w,h,d,mat,x,y,z),edge,.32);
      group.add(mesh);
      return mesh;
    };
    const addStripe=(x,y,z,rotation=0)=>{const stripe=site3DBox(1.3,.08,7.6,blackMat,x,y,z); stripe.rotation.y=rotation; group.add(stripe);};
    addBox(6,.5,5,0,.25,0,metalMat,0x4b4438);
    addBox(.85,24,.85,0,12,0,yellowMat,0x3a2b1e);
    for(let y=4;y<22;y+=5.2) addBox(.92,2.3,.92,0,y,0,blackMat,0x1d1712);
    [-4.1,4.1].forEach((z,index)=>{
      const head=addBox(2.8,3.2,2.2,0,13.5,z,blackMat,0x1d1712);
      head.name=`${group.name} red warning lamp housing ${index+1}`;
      const lens=new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.05,.22,18),index===0||item.kind==='occupancyLight'?redMat:lensOffMat);
      lens.name=`${group.name} red warning lamp lens ${index+1}`;
      lens.rotation.x=Math.PI/2;
      lens.position.set(0,13.5,z-1.16);
      group.add(lens);
      const hood=site3DBox(.42,.42,1.5,0,15.15,z-1.4,blackMat);
      hood.name='Crossing lamp hood';
      group.add(hood);
    });
    if(item.kind==='occupancyLight'){
      addBox(3,3,1.4,0,8.7,-4.2,redMat,0x641b16);
      addBox(3,3,1.4,0,8.7,4.2,redMat,0x641b16);
    }
    const crossA=addBox(2.4,.42,18,0,23.2,0,yellowMat,0x3a2b1e);
    const crossB=addBox(2.4,.42,18,0,23.2,0,yellowMat,0x3a2b1e);
    crossA.name='Japanese crossing buck diagonal plate A';
    crossB.name='Japanese crossing buck diagonal plate B';
    crossA.rotation.x=rad(36);
    crossB.rotation.x=rad(-36);
    [-6,0,6].forEach(z=>addStripe(0,23.45,z,0));
    tagSite3DTrackAccessory(group,item);
    return group;
  }
  function buildSite3DCrossingArmItem(item,bounds){
    const selected=item.id===state.selectedTrackAccessoryId || isSiteObjectSelected('trackAccessory',item.id);
    const yellowMat=new THREE.MeshStandardMaterial({color:selected?0xc8493a:0xf0b82f,roughness:.78,metalness:.02});
    const blackMat=new THREE.MeshStandardMaterial({color:0x23201c,roughness:.72,metalness:.04});
    const redMat=new THREE.MeshStandardMaterial({color:0xd52522,emissive:0x4a0504,roughness:.38,metalness:.02});
    const metalMat=new THREE.MeshStandardMaterial({color:0x6f6a5e,roughness:.72,metalness:.08});
    const group=new THREE.Group();
    group.name=item.name||trackAccessoryLabel(item.kind);
    group.position.set(site3DScale(item.x)-bounds.cx,0,site3DScale(item.y)-bounds.cy);
    group.rotation.y=-rad(item.rotationDeg||0);
    const addBox=(w,h,d,x,y,z,mat=yellowMat,edge=0x4b4438)=>{
      const mesh=site3DAddEdges(site3DBox(w,h,d,mat,x,y,z),edge,.32);
      group.add(mesh);
      return mesh;
    };
    addBox(6,.55,5,0,.28,0,metalMat,0x4b4438);
    addBox(1,17,1,0,8.8,0,yellowMat,0x3a2b1e);
    [4.2,9.4,14.6].forEach(y=>addBox(1.08,2.4,1.08,0,y,0,blackMat,0x1d1712));
    addBox(4.8,3.2,3.2,0,8.5,-2.9,blackMat,0x1d1712);
    const boomY=13.4;
    const boom=addBox(39,.68,.68,20,boomY,0,yellowMat,0x3a2b1e);
    boom.name='Japanese crossing striped barrier arm';
    for(let x=4;x<39;x+=7){
      const stripe=site3DBox(2.4,.74,.74,0,0,0,blackMat);
      stripe.name='Barrier arm black stripe';
      stripe.position.set(x,boomY+.01,0);
      stripe.rotation.z=rad(18);
      group.add(stripe);
    }
    [-3.6,3.6].forEach(z=>{
      const lamp=new THREE.Mesh(new THREE.CylinderGeometry(.95,.95,.24,18),redMat);
      lamp.rotation.x=Math.PI/2;
      lamp.position.set(0,11.8,z);
      lamp.name='Crossing arm red warning lens';
      group.add(lamp);
      addBox(2.5,2.5,1.4,0,11.8,z,blackMat,0x1d1712);
    });
    const crossA=addBox(13,.38,2.2,0,18.8,-1.72,yellowMat,0x3a2b1e);
    const crossB=addBox(13,.38,2.2,0,18.8,-1.72,yellowMat,0x3a2b1e);
    crossA.name='Crossing arm crossbuck diagonal plate A';
    crossB.name='Crossing arm crossbuck diagonal plate B';
    crossA.rotation.z=rad(36);
    crossB.rotation.z=rad(-36);
    const directionPanel=addBox(7.8,1.65,.32,0,16.55,-1.9,yellowMat,0x3a2b1e);
    directionPanel.name='Crossing arm direction indicator panel';
    [-1.6,1.6].forEach(x=>{
      const stripe=addBox(3.4,.28,.36,x,16.55,-2.1,blackMat,0x1d1712);
      stripe.name='Crossing arm direction indicator stripe';
      stripe.rotation.z=rad(-28);
    });
    return tagSite3DTrackAccessory(group,item);
  }
  function buildSite3DIntrusionDetectorItem(item,bounds){
    const selected=item.id===state.selectedTrackAccessoryId || isSiteObjectSelected('trackAccessory',item.id);
    const baseMat=new THREE.MeshStandardMaterial({color:selected?0xc8493a:0x7d807e,roughness:.72,metalness:.08});
    const housingMat=new THREE.MeshStandardMaterial({color:selected?0xd96250:0xa6aaa8,roughness:.66,metalness:.06});
    const darkMat=new THREE.MeshStandardMaterial({color:0x222629,roughness:.55,metalness:.04});
    const glassMat=new THREE.MeshStandardMaterial({color:0x263b48,roughness:.2,metalness:.02,transparent:true,opacity:.78});
    const beamMat=new THREE.MeshBasicMaterial({color:0x72a6bd,transparent:true,opacity:selected ? .45 : .24});
    const group=new THREE.Group();
    group.name=item.name||trackAccessoryLabel(item.kind);
    group.position.set(site3DScale(item.x)-bounds.cx,0,site3DScale(item.y)-bounds.cy);
    group.rotation.y=-rad(item.rotationDeg||0);
    const addBox=(w,h,d,x,y,z,mat=housingMat,edge=0x4b4438)=>{
      const mesh=site3DAddEdges(site3DBox(w,h,d,mat,x,y,z),edge,.32);
      group.add(mesh);
      return mesh;
    };
    const faceDir=-1;
    const addDetectorHead=()=>{
      const z=0;
      addBox(5.6,.45,4.4,0,.23,z,baseMat,0x4b4438).name='HB-type intrusion detector low concrete plinth';
      addBox(3.6,1.8,3.2,0,1.35,z,baseMat,0x4b4438).name='HB-type intrusion detector short grey pedestal';
      const body=addBox(5.2,3.4,3.8,0,3.9,z,housingMat,0x4b4438);
      body.name='HB-type level crossing obstruction detector grey sensor housing';
      const face=addBox(4.1,2.45,.32,0,3.95,z+(faceDir*2.08),darkMat,0x151719);
      face.name='HB-type intrusion detector dark sensor face';
      [-1.25,1.25].forEach(x=>{
        const lens=new THREE.Mesh(new THREE.CylinderGeometry(.48,.48,.2,18),glassMat);
        lens.name='HB-type intrusion detector optical sensor lens';
        lens.rotation.x=Math.PI/2;
        lens.position.set(x,4.05,z+(faceDir*2.28));
        group.add(lens);
      });
      const hood=addBox(5.6,.28,1.2,0,5.55,z+(faceDir*1.72),housingMat,0x4b4438);
      hood.name='HB-type intrusion detector shallow rain hood';
      const rear=addBox(3.2,1.4,.24,0,3.9,z-(faceDir*2.03),darkMat,0x151719);
      rear.name='HB-type intrusion detector rear service panel';
    };
    addDetectorHead();
    const beamGeo=new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0,4.05,faceDir*2.55),
      new THREE.Vector3(0,4.05,faceDir*14)
    ]);
    const beam=new THREE.Line(beamGeo,beamMat);
    beam.name='HB-type intrusion detector obstruction detection beam';
    group.add(beam);
    const cable=site3DBeam(group,{x:-2.15,y:.48,z:0},{x:-2.15,y:3.05,z:0},.08,darkMat,'HB-type intrusion detector conduit');
    cable.name='HB-type intrusion detector conduit';
    return tagSite3DTrackAccessory(group,item);
  }
  function buildSite3DTrackAccessoryGroup(bounds){
    const group=new THREE.Group();
    group.name='Site Planner track items';
    (state.trackAccessories||[]).forEach(raw=>{
      const item=normalizeTrackAccessory(raw);
      if(item.hidden) return;
      const accessory=isCatenaryAccessoryKind(item.kind)
        ? buildSite3DCatenaryItem(item,bounds)
        : isTrackSwitchAccessoryKind(item.kind)
        ? buildSite3DTrackSwitchItem(item,bounds)
        : isTrackBufferAccessoryKind(item.kind)
        ? buildSite3DTrackBufferItem(item,bounds)
        : item.kind==='signal' || item.kind==='occupancyLight'
        ? buildSite3DCrossingSignalItem(item,bounds)
        : item.kind==='crossingArm'
        ? buildSite3DCrossingArmItem(item,bounds)
        : item.kind==='intrusionDetector'
        ? buildSite3DIntrusionDetectorItem(item,bounds)
        : null;
      if(accessory) group.add(accessory);
    });
    return group.children.length ? group : null;
  }
  function site3DWindowColumns(width,density){
    const d=String(density||'normal');
    if(d==='none') return 0;
    if(d==='sparse') return Math.max(1,Math.floor(width/22));
    if(d==='dense') return Math.max(3,Math.floor(width/9));
    return Math.max(2,Math.floor(width/14));
  }
  function site3DGabledRoof(width,depth,roofH,mat,ridgeDirection='ew'){
    const ew=ridgeDirection!=='ns';
    const x0=-width/2, x1=width/2, z0=-depth/2, z1=depth/2;
    const verts=ew
      ? [[x0,0,z0],[x1,0,z0],[x0,0,z1],[x1,0,z1],[x0,roofH,0],[x1,roofH,0]]
      : [[x0,0,z0],[x0,0,z1],[x1,0,z0],[x1,0,z1],[0,roofH,z0],[0,roofH,z1]];
    const faces=ew
      ? [0,1,5, 0,5,4, 2,4,5, 2,5,3, 0,2,3, 0,3,1, 0,4,2, 1,3,5]
      : [0,4,5, 0,5,1, 2,3,5, 2,5,4, 0,2,4, 1,5,3, 0,1,3, 0,3,2];
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(verts.flat(),3));
    geo.setIndex(faces);
    geo.computeVertexNormals();
    return site3DAddEdges(new THREE.Mesh(geo,mat),0x3d332b,.45);
  }
  function site3DSlopedRoof(width,depth,roofH,mat){
    const x0=-width/2, x1=width/2, z0=-depth/2, z1=depth/2;
    const verts=[[x0,0,z0],[x1,0,z0],[x0,roofH,z1],[x1,roofH,z1],[x0,-.6,z0],[x1,-.6,z0],[x0,roofH-.6,z1],[x1,roofH-.6,z1]];
    const faces=[0,1,3,0,3,2,4,6,7,4,7,5,0,4,5,0,5,1,2,3,7,2,7,6,0,2,6,0,6,4,1,5,7,1,7,3];
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(verts.flat(),3));
    geo.setIndex(faces);
    geo.computeVertexNormals();
    return site3DAddEdges(new THREE.Mesh(geo,mat),0x3d332b,.45);
  }
  function addSite3DFacadeDetails(group,bounds,profile,box){
    const {w,d,height,floors,floorH}=profile;
    const wallDetailMat=new THREE.MeshStandardMaterial({color:0xf4ead5,roughness:.76,metalness:0});
    const glassMat=new THREE.MeshStandardMaterial({color:0x6d9fbd,roughness:.25,metalness:.05,transparent:true,opacity:.74});
    const darkGlassMat=new THREE.MeshStandardMaterial({color:0x315267,roughness:.28,metalness:.08,transparent:true,opacity:.82});
    const doorMat=new THREE.MeshStandardMaterial({color:0x5f4d3f,roughness:.8,metalness:.02});
    const signMat=new THREE.MeshStandardMaterial({color:0xc8493a,roughness:.65,metalness:0});
    const trimMat=new THREE.MeshStandardMaterial({color:0x6d604f,roughness:.8,metalness:0});
    const frontZ=-d/2-.08, backZ=d/2+.08, rightX=w/2+.08, leftX=-w/2-.08;
    for(let i=1;i<floors;i++){
      const y=Math.min(height-.6,i*floorH);
      group.add(site3DBox(w+.6,.28,.16,trimMat,0,y,frontZ));
      group.add(site3DBox(w+.6,.28,.16,trimMat,0,y,backZ));
      group.add(site3DBox(.16,.28,d+.6,trimMat,leftX,y,0));
      group.add(site3DBox(.16,.28,d+.6,trimMat,rightX,y,0));
    }
    const cols=site3DWindowColumns(w,profile.windowDensity);
    const sideCols=Math.max(1,Math.min(4,site3DWindowColumns(d,profile.windowDensity)-1));
    const winW=Math.max(2.4,Math.min(7,w/(cols*2.2||3)));
    const winH=Math.max(2.4,Math.min(5.5,floorH*.42));
    const addWindow=(x,y,z,side=false,mat=glassMat)=>{
      const mesh=side?site3DBox(.18,winH,winW,mat,x,y,z):site3DBox(winW,winH,.18,mat,x,y,z);
      group.add(mesh);
    };
    for(let floor=0;floor<floors;floor++){
      const y=Math.min(height-winH*.55,(floor+.56)*floorH);
      const first=floor===0;
      if(first && profile.commercial){
        const panelW=Math.max(5,Math.min(12,w/4));
        [-1,0,1].forEach(n=>group.add(site3DBox(panelW,Math.min(7,floorH*.58),.2,darkGlassMat,n*panelW*1.12,Math.min(floorH*.45,4.6),frontZ)));
      } else if(cols){
        for(let c=0;c<cols;c++){
          const x=-w/2+(c+1)*w/(cols+1);
          addWindow(x,y,frontZ,false,glassMat);
          addWindow(x,y,backZ,false,glassMat);
        }
      }
      if(floor>0 || !profile.commercial){
        for(let c=0;c<sideCols;c++){
          const z=-d/2+(c+1)*d/(sideCols+1);
          addWindow(leftX,y,z,true,glassMat);
          addWindow(rightX,y,z,true,glassMat);
        }
      }
    }
    group.add(site3DBox(Math.min(7,w*.22),Math.min(7,floorH*.62),.22,doorMat,-w*.22,Math.min(floorH*.34,3.4),frontZ-.04));
    if(profile.industrial){
      group.add(site3DBox(Math.min(14,w*.36),Math.min(9,floorH*.7),.24,doorMat,w*.22,Math.min(floorH*.38,4.2),frontZ-.05));
    }
    if(profile.signage>.25){
      const signW=Math.min(w*.62,Math.max(8,w*.35));
      group.add(site3DBox(signW,Math.min(3.2,floorH*.26),.24,signMat,0,Math.min(height-.8,Math.max(floorH*.78,8)),frontZ-.1));
    }
    const roofMat=new THREE.MeshStandardMaterial({color:profile.roofColor,roughness:.9,metalness:0});
    const roofStyle=String(profile.roofStyle||'parapet');
    if(roofStyle.includes('gable')){
      const roof=site3DGabledRoof(w+2,d+2,Math.max(3,Math.min(10,Math.min(w,d)*.18)),roofMat,profile.roofRidgeDirection);
      roof.position.y=height;
      group.add(roof);
    } else if(roofStyle.includes('slant')){
      const roof=site3DSlopedRoof(w+2,d+2,Math.max(2.5,Math.min(8,Math.min(w,d)*.12)),roofMat);
      roof.position.y=height;
      group.add(roof);
    } else {
      group.add(site3DBox(w+1,.6,d+1,roofMat,0,height+.3,0));
      if(roofStyle.includes('parapet')){
        const ph=Math.max(1.2,Math.min(4,profile.floorH*.22));
        group.add(site3DBox(w+1,ph,.7,roofMat,0,height+ph/2,-d/2));
        group.add(site3DBox(w+1,ph,.7,roofMat,0,height+ph/2,d/2));
        group.add(site3DBox(.7,ph,d+1,roofMat,-w/2,height+ph/2,0));
        group.add(site3DBox(.7,ph,d+1,roofMat,w/2,height+ph/2,0));
      }
    }
    if(profile.industrial || profile.commercial){
      group.add(site3DBox(Math.min(8,w*.18),2.2,Math.min(7,d*.18),trimMat,-w*.22,height+1.5,d*.18));
      group.add(site3DBox(Math.min(5,w*.12),1.3,Math.min(4,d*.12),trimMat,w*.18,height+1.05,-d*.12));
    }
  }
  function buildSite3DMassing(b,bounds){
    const pts=site3DBuildingFootprintMm(b);
    const center=site3DBuildingCenterMm(b);
    const cfg=site3DBuildingConfig(b);
    const height=site3DBuildingHeightMm(b,cfg);
    const mat=site3DMaterial(b.color,0xd79631);
    let mesh;
    let detailBox=null;
    if(pts && pts.length>=3 && b.padType==='polygon'){
      const shape=new THREE.Shape();
      pts.forEach((p,i)=>{ const x=p.x-center.x, y=-(p.y-center.y); if(i===0) shape.moveTo(x,y); else shape.lineTo(x,y); });
      shape.closePath();
      const geo=new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false});
      geo.rotateX(-Math.PI/2);
      mesh=new THREE.Mesh(geo,mat);
      const xs=pts.map(p=>p.x), ys=pts.map(p=>p.y);
      detailBox={w:Math.max(...xs)-Math.min(...xs),d:Math.max(...ys)-Math.min(...ys)};
    } else {
      const w=positiveNumber(b.widthMm,pts&&Math.max(...pts.map(p=>p.x))-Math.min(...pts.map(p=>p.x)),20) || 20;
      const d=positiveNumber(b.depthMm,pts&&Math.max(...pts.map(p=>p.y))-Math.min(...pts.map(p=>p.y)),20) || 20;
      mesh=new THREE.Mesh(new THREE.BoxGeometry(w,height,d),mat);
      mesh.position.y=height/2;
      detailBox={w,d};
    }
    site3DAddEdges(mesh,0x4b3828,.55);
    const group=new THREE.Group();
    group.name=b.name||'Building massing';
    group.userData.sitePlannerDetailedFallback=true;
    group.add(mesh);
    const profile={
      w:Math.max(4,detailBox?.w||cfg?.width||20),
      d:Math.max(4,detailBox?.d||cfg?.depth||20),
      height,
      floors:site3DFloorCount(b,cfg),
      floorH:Math.max(4,Math.min(40,height/Math.max(1,site3DFloorCount(b,cfg)))),
      roofStyle:cfg?.roofStyle||'parapet',
      roofRidgeDirection:cfg?.roofRidgeDirection||'ew',
      roofColor:cfg?.roofColor||0x5f6466,
      windowDensity:cfg?.windowDensity||'normal',
      commercial:Number(cfg?.commercialIntensity||0)>0.5 || /shop|commercial|zakkyo|tenant/i.test(String(cfg?.buildingType||b.category||'')),
      industrial:/warehouse|industrial|workshop|service/i.test(String(cfg?.buildingType||b.category||'')),
      signage:Number(cfg?.signageIntensity||0)
    };
    if(b.padType!=='polygon') addSite3DFacadeDetails(group,bounds,profile,detailBox);
    group.position.set(center.x-bounds.cx,site3DBuildingElevationMm(b),center.y-bounds.cy);
    group.rotation.y=site3DPlannerRotationY(b,{geometryAlreadyInSiteCoordinates:b.padType==='polygon'});
    return group;
  }
  function buildSite3DSelectionHelper(b,bounds,opts={}){
    const cfg=site3DGeneratorBuildingConfig(b) || site3DBuildingConfig(b) || {};
    const yOffset=Number(opts.yOffset)||0;
    const y0=site3DBuildingElevationMm(b)+yOffset;
    const y1=y0+site3DBuildingHeightMm(b,cfg);
    const verts=[];
    visibleBuildingPolygons(b).forEach(poly=>{
      if(!Array.isArray(poly) || poly.length<3) return;
      const pts=poly.map(p=>({x:site3DScale(p.x)-bounds.cx,z:site3DScale(p.y)-bounds.cy}));
      for(let i=0;i<pts.length;i++){
        const a=pts[i], z=pts[(i+1)%pts.length];
        verts.push(a.x,y0,a.z,z.x,y0,z.z);
        verts.push(a.x,y1,a.z,z.x,y1,z.z);
        verts.push(a.x,y0,a.z,a.x,y1,a.z);
      }
    });
    if(!verts.length) return null;
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
    const mat=new THREE.LineBasicMaterial({color:opts.color ?? 0x0f766e,transparent:true,opacity:opts.opacity ?? .95});
    const helper=new THREE.LineSegments(geo,mat);
    helper.userData.sitePlannerSelectionHelper=!opts.hover;
    helper.userData.sitePlannerHoverHelper=!!opts.hover;
    return helper;
  }
  function buildSite3DBuildingGroup(b,bounds){
    const cfg=site3DGeneratorBuildingConfig(b);
    const center=site3DBuildingCenterMm(b);
    const sharedRenderer=window.HakoMachiBuildingPreviewRenderer || globalThis.HakoMachiBuildingPreviewRenderer;
    if(cfg && sharedRenderer?.buildBuildingPreviewGroup){
      try{
        const group=sharedRenderer.buildBuildingPreviewGroup(cfg,{includeStlOverlay:false});
        const wrapper=new THREE.Group();
        wrapper.name=b.name||'HakoMachi building';
        wrapper.userData.sitePlannerGeneratorPreview=true;
        group.name=`${wrapper.name} preview`;
        const originOffset=site3DGeneratorModelOriginOffset(b,cfg);
        if(originOffset) group.position.set(-originOffset.x,0,-originOffset.z);
        wrapper.add(group);
        tagSite3DBuilding(wrapper,b);
        wrapper.position.set(center.x-bounds.cx,site3DBuildingElevationMm(b),center.y-bounds.cy);
        wrapper.rotation.y=site3DGeneratorModelRotationY(b,cfg);
        wrapper.updateMatrixWorld(true);
        sharedRenderer.applyLayoutCutClippingToGroup?.(group,cfg,group.matrixWorld);
        return wrapper;
      }catch(err){ logger.warn('3D generated building fallback:',err); }
    }
    return buildSite3DMassing(b,bounds);
  }
  function site3DStlGeometry(obj, targetW, targetH, targetD){
    const dataBase64=obj?.asset?.dataBase64;
    if(obj?.asset) delete obj.asset.renderFallbackReason;
    if(!dataBase64 || typeof THREE==='undefined'){
      if(obj?.asset) obj.asset.renderFallbackReason=obj.asset?.unavailable?'asset-unavailable':'asset-missing';
      return null;
    }
    try{
      const buffer=base64ToArrayBuffer(dataBase64);
      const triangleCount=estimateStlTriangleCount(buffer);
      if(triangleCount>SITE3D_STL_MAX_TRIANGLES){
        if(obj?.asset) obj.asset.renderFallbackReason='mesh-too-large';
        return null;
      }
      const vertices=parseStlVertices(buffer);
      if(vertices.length<3){
        if(obj?.asset) obj.asset.renderFallbackReason='parse-failed';
        return null;
      }
      const vertexCount=vertices.length - (vertices.length%3);
      if(vertexCount<3){
        if(obj?.asset) obj.asset.renderFallbackReason='parse-failed';
        return null;
      }
      const bounds=obj.bounds&&obj.bounds.vertexCount?obj.bounds:boundsFromVertices(vertices,'stl');
      const rawW=Math.max(.0001,Number(bounds.width)||1);
      const rawD=Math.max(.0001,Number(bounds.depth)||1);
      const rawH=Math.max(.0001,Number(bounds.height)||1);
      const cx=(Number(bounds.minX)+Number(bounds.maxX))/2 || 0;
      const cy=(Number(bounds.minY)+Number(bounds.maxY))/2 || 0;
      const minZ=Number(bounds.minZ)||0;
      const sx=targetW/rawW;
      const sy=targetH/rawH;
      const sz=targetD/rawD;
      const positions=[];
      vertices.slice(0,vertexCount).forEach(v=>{
        positions.push((v.x-cx)*sx,(v.z-minZ)*sy,(v.y-cy)*sz);
      });
      const geo=new THREE.BufferGeometry();
      geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      geo.computeVertexNormals();
      geo.computeBoundingBox();
      geo.computeBoundingSphere();
      return geo;
    }catch(err){
      logger.warn('STL 3D mesh fallback:',err);
      return null;
    }
  }
  function buildSite3DStlObjectGroup(raw,bounds){
    const obj=normalizeStlObject(raw);
    if(!obj || obj.hidden) return null;
    const w=Math.max(.5,site3DScale(obj.widthPx||mmToPx(obj.widthMm*obj.scale||1)));
    const d=Math.max(.5,site3DScale(obj.depthPx||mmToPx(obj.depthMm*obj.scale||1)));
    const h=Math.max(.5,Number(obj.heightMm||8)*(Number(obj.scale)||1));
    const group=new THREE.Group();
    const geometry=site3DStlGeometry(obj,w,h,d);
    if(geometry){
      group.name=obj.name||'STL site object';
      const mesh=new THREE.Mesh(geometry,site3DMaterial(obj.color,0x496a78,{transparent:false,opacity:1,side:THREE.DoubleSide}));
      mesh.userData.sitePlannerStlActualMesh=true;
      group.add(mesh);
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry,30),new THREE.LineBasicMaterial({color:0x24424d,transparent:true,opacity:.34})));
    } else {
      group.name=obj.name||'STL site object proxy';
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),site3DMaterial(obj.color,0x496a78,{transparent:false,opacity:1}));
      mesh.position.y=h/2;
      group.add(mesh);
      const edgeGeo=new THREE.EdgesGeometry(mesh.geometry);
      const edges=new THREE.LineSegments(edgeGeo,new THREE.LineBasicMaterial({color:0x24424d,transparent:true,opacity:.62}));
      edges.position.copy(mesh.position);
      group.add(edges);
    }
    group.position.set(site3DScale(obj.x)-bounds.cx,0,site3DScale(obj.y)-bounds.cy);
    group.rotation.y=-(Number(obj.rotationDeg)||0)*Math.PI/180;
    return tagSite3DStlObject(group,obj);
  }
  function githubBuildingPreviewConfig(record, parsedConfig=null){
    const footprint=record?.footprint||{};
    const cfg=structuredClone(parsedConfig || record?.hakoConfig || record?.config || record?.hakoSeed || {});
    if(!cfg || typeof cfg!=='object') return null;
    if(!cfg.footprint && footprint && typeof footprint==='object') cfg.footprint=structuredClone(footprint);
    const b={
      id:record?.id||uid('github_bldg'),
      name:record?.name||record?.id||'Building',
      category:(record?.tags&&record.tags[0])||record?.category||cfg.buildingType||'building',
      padType:footprint?.type==='polygon'?'polygon':'rect',
      widthMm:positiveNumber(footprint.widthMm,footprint.width,cfg.width,cfg.widthMm,cfg.dimensions?.width,cfg.dimensions?.widthMm) || 28,
      depthMm:positiveNumber(footprint.depthMm,footprint.depth,cfg.depth,cfg.depthMm,cfg.dimensions?.depth,cfg.dimensions?.depthMm) || 24,
      heightMm:positiveNumber(footprint.heightMm,record?.heightMm,cfg.height,cfg.heightMm),
      floorCount:positiveNumber(record?.summary?.floors,record?.floorCount,cfg.floorCount,cfg.floors),
      hakoSeed:record?.hakoSeed||null
    };
    return site3DNormalizeBuildingConfig(b,cfg);
  }
  function disposeGithubPreviewObject(obj){
    if(!obj) return;
    obj.traverse?.(child=>{
      child.geometry?.dispose?.();
      const mats=Array.isArray(child.material)?child.material:[child.material];
      mats.filter(Boolean).forEach(mat=>{
        Object.values(mat).forEach(v=>{ if(v && v.isTexture) v.dispose?.(); });
        mat.dispose?.();
      });
    });
  }
  function renderGithubBuildingStill(target, cfg, label='3D building preview'){
    if(!target) return false;
    target.textContent='';
    if(typeof THREE==='undefined'){
      target.textContent='3D unavailable';
      return false;
    }
    const sharedRenderer=window.HakoMachiBuildingPreviewRenderer || globalThis.HakoMachiBuildingPreviewRenderer;
    if(!cfg || !sharedRenderer?.buildBuildingPreviewGroup){
      target.textContent='Preview loading';
      return false;
    }
    let renderer=null, group=null;
    try{
      const width=240, height=150;
      renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
      renderer.localClippingEnabled=true;
      renderer.setPixelRatio(1);
      renderer.setSize(width,height,false);
      const scene=new THREE.Scene();
      scene.background=new THREE.Color(0xf2f1ea);
      const camera=new THREE.PerspectiveCamera(38,width/height,.1,5000);
      scene.add(new THREE.HemisphereLight(0xffffff,0xb8b1a4,.86));
      const key=new THREE.DirectionalLight(0xffffff,.62);
      key.position.set(110,160,120);
      scene.add(key);
      group=sharedRenderer.buildBuildingPreviewGroup(cfg,{includeStlOverlay:false});
      scene.add(group);
      const box=new THREE.Box3().setFromObject(group);
      if(box.isEmpty()) throw new Error('empty preview bounds');
      const center=box.getCenter(new THREE.Vector3());
      const size=box.getSize(new THREE.Vector3());
      const maxDim=Math.max(size.x,size.y,size.z,1);
      const dist=Math.max(70,maxDim*1.75);
      camera.position.set(center.x+dist*.72,center.y+Math.max(size.y*.55,35),center.z+dist*.82);
      camera.lookAt(center);
      camera.near=Math.max(.25,maxDim/700);
      camera.far=Math.max(800,maxDim*7);
      camera.updateProjectionMatrix();
      renderer.render(scene,camera);
      const img=document.createElement('img');
      img.alt=label;
      img.src=renderer.domElement.toDataURL('image/png');
      target.appendChild(img);
      return true;
    }catch(err){
      target.textContent='3D preview unavailable';
      target.title=err && err.message ? err.message : String(err||'Preview unavailable');
      return false;
    }finally{
      disposeGithubPreviewObject(group);
      renderer?.dispose?.();
      renderer?.forceContextLoss?.();
    }
  }
  async function upgradeGithubBuildingPreviewFromHako(settings, record, target){
    const path=record?.path||record?.paths?.hako||'';
    if(!path || !target) return;
    try{
      const file=await readGithubFile(settings,path);
      if(!file?.text) return;
      const parsed=JSON.parse(file.text);
      const cfg=githubBuildingPreviewConfig(record,parsed);
      renderGithubBuildingStill(target,cfg,record?.name||record?.id||'3D building preview');
    }catch(err){
      target.title='Could not load .hako preview: '+(err?.message||err);
    }
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
  function renderSite3D(){ if(site3d.renderer && site3d.scene && site3d.camera) site3d.renderer.render(site3d.scene,site3d.camera); }
  function clearSite3DHoverIndicator(){
    if(!site3d.hoverHelper) return false;
    site3d.root?.remove?.(site3d.hoverHelper);
    disposeSite3DObject(site3d.hoverHelper);
    site3d.hoverHelper=null;
    return true;
  }
  function updateSite3DHoverIndicator(){
    if(state.viewMode!=='3d' || !site3d.root || !site3d.bounds) return;
    clearSite3DHoverIndicator();
    const b=state.buildings.find(item=>item.id===state.hoverBuildingId && !item.hidden);
    if(b){
      const helper=buildSite3DSelectionHelper(normalizeBuilding(b),site3d.bounds,{
        hover:true,
        color:0xd79631,
        opacity:.62,
        yOffset:.08,
      });
      if(helper){
        helper.name='Hovered building outline';
        site3d.hoverHelper=helper;
        site3d.root.add(helper);
      }
    }
    renderSite3D();
  }
  function site3DCameraSnapshot(){
    if(!site3d.camera) return null;
    return {
      position: site3d.camera.position.clone(),
      quaternion: site3d.camera.quaternion.clone(),
      zoom: site3d.camera.zoom,
      target: site3d.controls?.target?.clone?.() || null
    };
  }
  function restoreSite3DCameraSnapshot(snapshot){
    if(!snapshot || !site3d.camera) return false;
    site3d.camera.position.copy(snapshot.position);
    site3d.camera.quaternion.copy(snapshot.quaternion);
    site3d.camera.zoom=snapshot.zoom;
    site3d.camera.updateProjectionMatrix();
    if(site3d.controls && snapshot.target){
      site3d.controls.target.copy(snapshot.target);
      site3d.controls.update();
    }
    return true;
  }
  function site3DHitSelectionData(object){
    const data=object?.userData||{};
    if(data.sitePlannerSelectionHelper || data.sitePlannerHoverHelper) return null;
    if(data.sitePlannerTrackAccessoryId) return {type:'trackAccessory',id:data.sitePlannerTrackAccessoryId};
    if(data.sitePlannerRoadFeatureId) return {type:'roadFeature',id:data.sitePlannerRoadFeatureId};
    if(data.sitePlannerStlObjectId) return {type:'stlObject',id:data.sitePlannerStlObjectId};
    if(data.sitePlannerBuildingId) return {type:'building',id:data.sitePlannerBuildingId};
    if(data.sitePlannerTrackId) return {type:'track',id:data.sitePlannerTrackId};
    if(data.sitePlannerRoadId) return {type:'road',id:data.sitePlannerRoadId};
    return null;
  }
  function selectSite3DHit(selection){
    if(!selection?.id) return false;
    if(selection.type==='trackAccessory'){
      const item=(state.trackAccessories||[]).find(accessory=>accessory.id===selection.id);
      if(!item) return false;
      selectTrackAccessory(item,{skipSync:true});
    } else if(selection.type==='roadFeature'){
      const feature=(state.roadFeatures||[]).find(item=>item.id===selection.id);
      if(!feature) return false;
      clearPlanObjectSelection();
      state.selectedRoadFeatureId=feature.id;
    } else if(selection.type==='stlObject'){
      const obj=(state.stlObjects||[]).find(item=>item.id===selection.id);
      if(!obj) return false;
      selectStlObject(obj);
    } else if(selection.type==='building'){
      const b=state.buildings.find(item=>item.id===selection.id);
      if(!b) return false;
      clearPlanObjectSelection();
      setBuildingSelection([selection.id],selection.id);
    } else if(selection.type==='track'){
      const track=(state.tracks||[]).find(item=>item.id===selection.id);
      if(!track) return false;
      clearPlanObjectSelection();
      state.selectedTrackId=track.id;
    } else if(selection.type==='road'){
      const road=(state.roads||[]).find(item=>item.id===selection.id);
      if(!road) return false;
      clearPlanObjectSelection();
      state.selectedRoadId=road.id;
      if(road.mode!=='outline') state.roadOutlineEditId=null;
    } else {
      return false;
    }
    renderList();
    renderRoads();
    renderStreetlights();
    renderSelected();
    updateHandoff();
    updateSite3D({preserveCamera:true});
    setSidebarOpen(true);
    return true;
  }
  function handleSite3DPointerUp(e){
    if(state.viewMode!=='3d' || !site3d.raycaster || !site3d.pointer || !site3d.camera || !site3d.renderer) return;
    if(e.button != null && e.button !== 0) return;
    const start=site3d.pointerDown;
    site3d.pointerDown=null;
    if(start && Math.hypot(e.clientX-start.x,e.clientY-start.y)>6) return;
    const rect=site3d.renderer.domElement.getBoundingClientRect();
    if(!rect.width || !rect.height) return;
    site3d.pointer.x=((e.clientX-rect.left)/rect.width)*2-1;
    site3d.pointer.y=-(((e.clientY-rect.top)/rect.height)*2-1);
    site3d.raycaster.setFromCamera(site3d.pointer,site3d.camera);
    const hits=site3d.raycaster.intersectObjects(site3d.root?.children||[],true);
    const selection=hits.map(hit=>site3DHitSelectionData(hit.object)).find(Boolean);
    selectSite3DHit(selection);
  }
  function updateSite3D(options={}){
    if(state.viewMode!=='3d') return;
    const hadCamera=!!(site3d.initialized && site3d.camera);
    if(!initSite3D()) return;
    const shouldPreserveCamera=options.preserveCamera===true || (options.preserveCamera!==false && hadCamera);
    const cameraSnapshot=shouldPreserveCamera ? site3DCameraSnapshot() : null;
    clearSite3DHoverIndicator();
    while(site3d.root.children.length){ const child=site3d.root.children.pop(); disposeSite3DObject(child); }
    const bounds=site3DBounds();
    site3d.bounds=bounds;
    const baseT=SITE3D_BASE_THICKNESS_MM;
    const benchworkBaseCount=site3DBenchworkFootprintsMm().length;
    const base=buildSite3DBase(bounds,baseT);
    site3d.root.add(base);
    const referenceImage=buildSite3DReferenceImage(bounds);
    if(referenceImage) site3d.root.add(referenceImage);
    const roads=buildSite3DRoadGroup(bounds);
    if(roads) site3d.root.add(roads);
    const tracks=buildSite3DTrackGroup(bounds);
    if(tracks) site3d.root.add(tracks);
    const trackItems=buildSite3DTrackAccessoryGroup(bounds);
    if(trackItems) site3d.root.add(trackItems);
    if(!benchworkBaseCount){
      const grid=new THREE.GridHelper(Math.max(bounds.width,bounds.depth),20,0x8a7f66,0xcfc5aa);
      grid.position.y=.015;
      site3d.root.add(grid);
    }
    state.buildings.forEach(raw=>{
      const b=normalizeBuilding(raw);
      syncBuildingMetrics(b);
      if(b.hidden) return;
      const g=buildSite3DBuildingGroup(b,bounds);
      if(g){
        tagSite3DBuilding(g,b);
        site3d.root.add(g);
        if(isBuildingSelected(b.id)){
          const helper=buildSite3DSelectionHelper(b,bounds);
          if(helper) site3d.root.add(helper);
        }
      }
    });
    (state.stlObjects||[]).forEach(raw=>{
      const obj=normalizeStlObject(raw);
      if(obj.hidden) return;
      const g=buildSite3DStlObjectGroup(obj,bounds);
      if(g){
        site3d.root.add(g);
        if(obj.id===state.selectedStlObjectId){
          const helper=buildSite3DStlObjectGroup({...obj,color:'#0f766e'},bounds);
          if(helper){
            helper.name='Selected STL object outline';
            helper.traverse?.(child=>{ if(child.material){ child.material.transparent=true; child.material.opacity=child.isMesh ? .12 : .95; } });
            site3d.root.add(helper);
          }
        }
      }
    });
    const radius=Math.max(bounds.width,bounds.depth,60);
    site3d.camera.near=Math.max(.25,radius/1000);
    site3d.camera.far=Math.max(800,radius*8);
    if(!restoreSite3DCameraSnapshot(cameraSnapshot)){
      site3d.camera.position.set(radius*.72,Math.max(70,radius*.58),radius*.82);
      site3d.camera.updateProjectionMatrix();
      if(site3d.controls){ site3d.controls.target.set(0,0,0); site3d.controls.update(); }
      else site3d.camera.lookAt(0,0,0);
    }
    updateSite3DHoverIndicator();
    renderSite3D();
  }
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


  function historySnapshot(){
    return JSON.stringify({
      imageMeta: state.imageMeta,
      imageOpacity: state.imageOpacity,
      imageLocked: state.imageLocked,
      pxPerMm: state.pxPerMm,
      calibrationLine: state.calibrationLine,
      lastCalibrationLine: state.lastCalibrationLine,
      buildings: state.buildings,
      roads: state.roads,
      tracks: state.tracks||[],
      trackAccessories: state.trackAccessories||[],
      roadFeatures: state.roadFeatures,
      roadDrivingSide: normalizeDrivingSide(state.roadDrivingSide),
      roadIntersectionDetails: state.roadIntersectionDetails,
      roadIntersectionOverrides: state.roadIntersectionOverrides||{},
      railCrossingOverrides: state.railCrossingOverrides||{},
      stlObjects: state.stlObjects||[],
      benchworkOutlines: state.benchworkOutlines,
      fabricRegions: state.fabricRegions,
      streetlights: state.streetlights,
      annotations: state.annotations,
      selectedId: state.selectedId,
      selectedIds: state.selectedIds,
      selectedSiteObjects: state.selectedSiteObjects||[],
      selectedRoadId: state.selectedRoadId,
      selectedRoadIntersectionId: state.selectedRoadIntersectionId,
      selectedRailCrossingId: state.selectedRailCrossingId,
      selectedTrackId: state.selectedTrackId,
      selectedTrackAccessoryId: state.selectedTrackAccessoryId,
      selectedStlObjectId: state.selectedStlObjectId,
      selectedBenchworkId: state.selectedBenchworkId,
      selectedFabricId: state.selectedFabricId,
      selectedStreetlightId: state.selectedStreetlightId,
      selectedAnnotationId: state.selectedAnnotationId,
      measureLine: state.measureLine
    });
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
    state.buildings=state.buildings.map(normalizeBuilding);
    state.buildings.forEach(syncBuildingMetrics);
    state.benchworkOutlines.forEach(normalizeBenchworkOutline);
    state.fabricRegions.forEach(normalizeFabricRegion);
    state.streetlights.forEach(normalizeStreetlight);
    state.stlObjects=(state.stlObjects||[]).map(normalizeStlObject);
    const includeImageDataUrl = opts.includeImageDataUrl !== false;
    return {
      app:'HakoMachi Site Planner',
      version:80,
      savedAt:new Date().toISOString(),
      portableProject:true,
      coordinateSystem:{type:'imagePixels', origin:'topLeft', imageWidthPx:state.image?.naturalWidth||state.image?.width||state.imageMeta?.naturalWidthPx||null, imageHeightPx:state.image?.naturalHeight||state.image?.height||state.imageMeta?.naturalHeightPx||null},
      canvasViewport:(()=>{const r=canvas.getBoundingClientRect(); return {widthPx:r.width,heightPx:r.height};})(),
      image:imageMetaForProject(state.imageMeta, state.image, {includeDataUrl:includeImageDataUrl}),
      view:state.view,
      site3d:state.site3d,
      imageOpacity:state.imageOpacity,
      imageLocked:state.imageLocked,
      scale:{calibrated:!!state.pxPerMm,pxPerMm:state.pxPerMm,calibrationLine:state.calibrationLine,units:'mm'},
      buildings:state.buildings,
      roads:state.roads,
      tracks:state.tracks||[],
      trackAccessories:state.trackAccessories||[],
      roadFeatures:state.roadFeatures,
      roadDrivingSide:normalizeDrivingSide(state.roadDrivingSide),
      roadIntersectionDetails:state.roadIntersectionDetails!==false,
      roadIntersectionOverrides:state.roadIntersectionOverrides||{},
      railCrossingOverrides:state.railCrossingOverrides||{},
      stlObjects:state.stlObjects||[],
      benchworkOutlines:state.benchworkOutlines,
      fabricRegions:state.fabricRegions,
      siteConstraints:[...state.roads.map(r=>({...r,type:'road'})), ...state.benchworkOutlines.map(b=>({...b,type:'benchworkOutline'})), ...(state.stlObjects||[]).map(o=>({...o,type:'stlObject'}))],
      streetlights:state.streetlights,
      annotations:state.annotations
    };
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


  function drawHoverPreview(){
    const placement=state.githubBuildingPlacement;
    if(placement?.previewPoint){
      const poly=githubPlacementPreviewPolygon(placement, placement.previewPoint, mmToPx);
      if(poly.length>=3){
        ctx.save();
        ctx.strokeStyle='rgba(15,118,110,.95)';
        ctx.fillStyle='rgba(15,118,110,.14)';
        ctx.lineWidth=2/state.view.scale;
        ctx.setLineDash([7/state.view.scale,5/state.view.scale]);
        ctx.beginPath();
        poly.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        drawLabel(`Place ${placement.record?.name||placement.record?.id||'building'}`,{x:placement.previewPoint.x+10/state.view.scale,y:placement.previewPoint.y-10/state.view.scale});
        ctx.restore();
      }
    }
    const hp=state.hoverPreview; if(!hp) return;
    ctx.save();
    ctx.strokeStyle='rgba(15,118,110,.85)'; ctx.fillStyle='rgba(15,118,110,.16)'; ctx.lineWidth=1.5/state.view.scale;
    ctx.beginPath(); ctx.arc(hp.point.x,hp.point.y,(hp.kind==='handle'?12:7)/state.view.scale,0,Math.PI*2); ctx.fill(); ctx.stroke();
    if(hp.label) drawLabel(hp.label,{x:hp.point.x+10/state.view.scale,y:hp.point.y-10/state.view.scale});
    ctx.restore();
  }

  function drawRotateAffordance(b,pts){
    const c=buildingCenter(b);
    const rot=rotateHandlePoint(b);
    const radius=Math.max(...pts.map(q=>dist(c,q)))+18/state.view.scale;
    ctx.save();
    ctx.strokeStyle='rgba(15,118,110,.55)';
    ctx.fillStyle='rgba(15,118,110,.14)';
    ctx.lineWidth=2/state.view.scale;
    ctx.setLineDash([7/state.view.scale,6/state.view.scale]);
    ctx.beginPath(); ctx.arc(c.x,c.y,radius,0,Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(c.x,c.y); ctx.lineTo(rot.x,rot.y); ctx.stroke();
    ctx.beginPath(); ctx.arc(rot.x,rot.y,9/state.view.scale,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.font=`${13/state.view.scale}px system-ui`; ctx.fillStyle='#0f766e'; ctx.fillText('↻',rot.x-4/state.view.scale,rot.y+5/state.view.scale);
    ctx.restore();
  }
  function hakoLocalMmToWorld(b,p){
    const c=buildingCenter(b);
    const origin=b.hakoGeometryOriginMm || {x:0,y:0};
    const dx=mmToPx(Number(p.x||0)-Number(origin.x||0));
    const dy=mmToPx(Number(p.y||0)-Number(origin.y||0));
    const a=rad(hakoFootprintRotationDeg(b)), ca=Math.cos(a), sa=Math.sin(a);
    return {x:c.x+dx*ca-dy*sa,y:c.y+dx*sa+dy*ca};
  }
  function hakoWorldToLocalMm(b,p){
    const c=buildingCenter(b);
    const origin=b.hakoGeometryOriginMm || {x:0,y:0};
    const dx=Number(p.x||0)-c.x;
    const dy=Number(p.y||0)-c.y;
    const a=rad(hakoFootprintRotationDeg(b)), ca=Math.cos(a), sa=Math.sin(a);
    return {
      x:Number(origin.x||0)+pxToMm(dx*ca+dy*sa),
      y:Number(origin.y||0)+pxToMm(-dx*sa+dy*ca)
    };
  }
  function arcSampleMm(it){
    const r=Math.hypot(it.x1-it.cx,it.y1-it.cy);
    if(!Number.isFinite(r)||r<=0) return [{x:it.x1,y:it.y1},{x:it.x2,y:it.y2}];
    const a1=Math.atan2(it.y1-it.cy,it.x1-it.cx);
    const a2=Math.atan2(it.y2-it.cy,it.x2-it.cx);
    let delta=a2-a1;
    while(delta>Math.PI) delta-=Math.PI*2;
    while(delta<-Math.PI) delta+=Math.PI*2;
    const side=Number(it.bulgeSide||1);
    if(side<0 && delta>0) delta-=Math.PI*2;
    if(side>0 && delta<0) delta+=Math.PI*2;
    const steps=Math.max(8,Math.ceil(Math.abs(delta)/(Math.PI/18)));
    const pts=[];
    for(let i=0;i<=steps;i++){
      const a=a1+delta*(i/steps);
      pts.push({x:it.cx+Math.cos(a)*r,y:it.cy+Math.sin(a)*r});
    }
    return pts;
  }
  function hakoDisplayTrimPolylinesMm(b){
    if(!b || !state.pxPerMm) return [];
    const cuts=activeHakoLayoutCuts(b);
    if(cuts.length && b.hakoConfig){
      return cuts.map(cut=>{
        const pts=[];
        sampleHakoLayoutCutSegments(cut,b.hakoConfig).forEach(seg=>{
          if(!seg || seg.length<2) return;
          if(!pts.length) pts.push(seg[0]);
          pts.push(seg[1]);
        });
        return {points:pts,label:cut.name||cut.id||'trim',targetId:hakoCutTargetId(cut)};
      }).filter(it=>it.points.length>=2);
    }
    return (Array.isArray(b.hakoTrimLinesMm)?b.hakoTrimLinesMm:[]).map(it=>({
      points:(it.type==='arc') ? arcSampleMm(it) : [{x:it.x1,y:it.y1},{x:it.x2,y:it.y2}],
      label:it.label||'trim'
    })).filter(it=>it.points.length>=2);
  }
  function drawHakoTrimLines(b,strong=false){
    const trimLines=hakoDisplayTrimPolylinesMm(b);
    if(!b || b.showHakoTrimLines===false || !trimLines.length || !state.pxPerMm) return;
    ctx.save();
    ctx.strokeStyle=strong?'#d95f24':'rgba(217,95,36,.65)';
    ctx.lineWidth=(strong?2.4:1.6)/state.view.scale;
    ctx.setLineDash([8/state.view.scale,5/state.view.scale]);
    trimLines.forEach(it=>{
      const pts=it.points;
      if(!pts.length) return;
      ctx.beginPath();
      pts.forEach((p,i)=>{const q=hakoLocalMmToWorld(b,p); i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});
      ctx.stroke();
      if(strong){
        const a=hakoLocalMmToWorld(b,pts[0]), z=hakoLocalMmToWorld(b,pts[pts.length-1]);
        ctx.setLineDash([]);
        ctx.fillStyle='#d95f24';
        [a,z].forEach(q=>{ctx.beginPath();ctx.arc(q.x,q.y,3.5/state.view.scale,0,Math.PI*2);ctx.fill();});
        ctx.setLineDash([8/state.view.scale,5/state.view.scale]);
      }
    });
    ctx.restore();
  }

  function drawBuilding(b){ if(b.hidden) return; syncBuildingMetrics(b); ctx.save(); const isSelected=isSiteObjectSelected('building',b.id), isHovered=b.id===state.hoverBuildingId; ctx.lineWidth=(isSelected?4:(isHovered?4:3))/state.view.scale; ctx.strokeStyle=isSelected?'#0f766e':(isHovered?'#2a64aa':b.color); ctx.fillStyle=isHovered&&!isSelected?'rgba(42,100,170,.18)':((b.color||'#d79631')+'33'); const polys=visibleBuildingPolygons(b); const pts=polys.flat(); polys.forEach(poly=>{if(poly.length<3) return; ctx.beginPath(); poly.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)); ctx.closePath(); ctx.fill(); ctx.stroke();});
    if((isSelected || isHovered) && hakoDisplayTrimPolylinesMm(b).length) drawHakoTrimLines(b,isSelected);
    if(isSelected || isHovered){ const c=b.padType==='rect'?{x:b.x,y:b.y}:polygonCenter(pts); const trimCount=hakoDisplayTrimPolylinesMm(b).length; const trimNote=trimCount?` · ${trimCount} trim line${trimCount===1?'':'s'}`:''; drawLabel(`${b.name||'Building'} ${b.padType==='rect'&&state.pxPerMm?`${fmt(b.widthMm)}×${fmt(b.depthMm)}mm`:''}${trimNote}`,{x:c.x+6/state.view.scale,y:c.y-6/state.view.scale}); }
    if(isSelected && currentSelectedBuildingIds().length===1 && !b.locked){ ctx.fillStyle='#0f766e'; pts.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,5/state.view.scale,0,Math.PI*2);ctx.fill()}); drawRotateAffordance(b,pts); }
    ctx.restore(); }
  function drawStlObject(raw){
    const obj=normalizeStlObject(raw);
    if(!obj || obj.hidden) return;
    const selected=obj.id===state.selectedStlObjectId || isSiteObjectSelected('stlObject',obj.id), hovered=obj.id===state.hoverStlObjectId;
    const pts=stlObjectRect(obj);
    ctx.save();
    ctx.lineWidth=(selected?3:(hovered?3:2))/state.view.scale;
    ctx.strokeStyle=selected?'#0f766e':(hovered?'#2a64aa':obj.color||'#496a78');
    ctx.fillStyle=hovered&&!selected?'rgba(42,100,170,.16)':((obj.color||'#496a78')+'2b');
    ctx.setLineDash([8/state.view.scale,5/state.view.scale]);
    ctx.beginPath();
    pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.translate(obj.x,obj.y);
    ctx.rotate(rad(obj.rotationDeg||0));
    ctx.strokeStyle='rgba(73,106,120,.65)';
    ctx.lineWidth=1.2/state.view.scale;
    ctx.beginPath();
    ctx.moveTo(-obj.widthPx*.35,0); ctx.lineTo(obj.widthPx*.35,0);
    ctx.moveTo(0,-obj.depthPx*.35); ctx.lineTo(0,obj.depthPx*.35);
    ctx.stroke();
    ctx.restore();
    if(selected||hovered) drawLabel(`${obj.name||'STL Object'} · ${fmt(obj.widthMm*obj.scale)}×${fmt(obj.depthMm*obj.scale)}mm`,{x:obj.x+8/state.view.scale,y:obj.y-8/state.view.scale});
  }
  function drawStreetlight(l){
    l=normalizeStreetlight(l);
    const selected=l.id===state.selectedStreetlightId || isSiteObjectSelected('streetlight',l.id), hovered=l.id===state.hoverStreetlightId;
    const r=Math.max(5, state.pxPerMm ? mmToPx(l.lightRadiusMm||2) : 8)/state.view.scale;
    const armPx=Math.max(10, state.pxPerMm ? mmToPx(l.armLengthMm||3.5) : 14)/state.view.scale;
    const a=rad(l.rotationDeg||0);
    ctx.save();
    ctx.translate(l.x,l.y); ctx.rotate(a);
    const isAnchored=l.mode==='anchored';
    ctx.lineWidth=(selected?3:2)/state.view.scale;
    ctx.strokeStyle=selected?'#0f766e':(isAnchored?'#c84a3a':'#2a64aa');
    ctx.fillStyle=isAnchored?'rgba(200,74,58,.18)':'rgba(42,100,170,.16)';
    // future export footprint / mount marker
    if(isAnchored){
      const mount=l.anchor?.mountMode||'sidewalkCutHole';
      const diaMm=mount==='roadEdgeBulbMount'?(l.anchor?.bulbMountDiameterMm||3):(l.anchor?.cutHoleDiameterMm||1.2);
      const mr=Math.max(4,state.pxPerMm?mmToPx(diaMm/2):6)/state.view.scale;
      ctx.beginPath(); ctx.arc(0,0,mr,0,Math.PI*2); ctx.fill(); ctx.stroke();
      if(mount==='sidewalkCutHole'){
        ctx.beginPath(); ctx.moveTo(-mr*.65,0); ctx.lineTo(mr*.65,0); ctx.moveTo(0,-mr*.65); ctx.lineTo(0,mr*.65); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(0,0,mr*1.45,0,Math.PI*2); ctx.stroke();
      }
    }
    ctx.fillStyle=l.color||'#c84a3a'; ctx.strokeStyle=selected?'#0f766e':'#3a2b1e';
    ctx.lineWidth=1.5/state.view.scale;
    ctx.beginPath(); ctx.arc(0,0,4/state.view.scale,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-armPx*1.2); ctx.lineTo(armPx,-armPx*1.2); ctx.stroke();
    if(l.type==='doubleArm'){ctx.beginPath(); ctx.moveTo(0,-armPx*1.2); ctx.lineTo(-armPx,-armPx*1.2); ctx.stroke();}
    ctx.fillStyle='#f7d87a'; ctx.beginPath(); ctx.arc(armPx,-armPx*1.2,3/state.view.scale,0,Math.PI*2); ctx.fill();
    if(l.type==='doubleArm'){ctx.beginPath(); ctx.arc(-armPx,-armPx*1.2,3/state.view.scale,0,Math.PI*2); ctx.fill();}
    if(selected||hovered){ctx.strokeStyle='rgba(15,118,110,.9)'; ctx.lineWidth=1.25/state.view.scale; ctx.strokeRect(-12/state.view.scale,-armPx*1.2-9/state.view.scale,Math.max(24/state.view.scale,armPx+18/state.view.scale),armPx*1.2+20/state.view.scale);}
    ctx.restore();
    if(selected||hovered) drawLabel(`${l.name||'Streetlight'}${l.mode==='anchored'?' · anchored':''}`,{x:l.x+8/state.view.scale,y:l.y-8/state.view.scale});
  }
  function deleteSelectedStlObject(){
    const id=state.selectedStlObjectId;
    if(!id) return false;
    state.stlObjects=(state.stlObjects||[]).filter(obj=>obj.id!==id);
    state.selectedStlObjectId=null;
    syncAll();
    return true;
  }
  function selectStlObject(obj){
    if(!obj) return false;
    setSingleSiteObjectSelection('stlObject',obj.id);
    renderList(); renderRoads(); renderStreetlights(); renderSelected(); updateHandoff(); draw();
    return true;
  }
  function draw(){
    if(renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      if(state.viewMode==='3d') updateSite3D({preserveCamera:true});
      else drawNow();
    });
  }
  function drawNow(){const r=canvas.getBoundingClientRect(); const dpr=devicePixelRatio||1; ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,r.width,r.height); ctx.save(); ctx.translate(state.view.x,state.view.y); ctx.scale(state.view.scale,state.view.scale); drawGrid(); if(state.image){ctx.save();ctx.globalAlpha=state.imageOpacity;ctx.drawImage(state.image,0,0);ctx.restore();} drawAnnotations(); const calLabel=(state.calibrationLine&&state.pxPerMm)?`${fmt(pxToMm(dist({x:state.calibrationLine.x1,y:state.calibrationLine.y1},{x:state.calibrationLine.x2,y:state.calibrationLine.y2})))} mm`:'calibration'; drawLine(state.calibrationLine,'#b8672d',calLabel); const measureLabel=(state.measureLine&&state.pxPerMm)?`${fmt(pxToMm(dist({x:state.measureLine.x1,y:state.measureLine.y1},{x:state.measureLine.x2,y:state.measureLine.y2})))} mm`:'measure'; drawLine(state.measureLine,'#3f7a50',measureLabel); state.benchworkOutlines.forEach(drawBenchwork); drawRoadLayer(); drawGeneratedRailCrossings(); (state.tracks||[]).forEach(drawTrack); (state.trackAccessories||[]).forEach(drawTrackAccessory); (state.fabricRegions||[]).forEach(drawFabricRegion); state.buildings.forEach(drawBuilding); (state.stlObjects||[]).forEach(drawStlObject); state.streetlights.forEach(drawStreetlight); if(state.roadDraft.length){ctx.save();ctx.strokeStyle='#6f6a5e';ctx.fillStyle='rgba(111,106,94,.18)';ctx.lineWidth=3/state.view.scale;if(state.roadMode==='centerline'&&state.roadDraft.length>=2){const temp=createRoadCenterlineFromPoints(state.roadDraft); temp.id='road_draft'; drawRoad(temp);} else {ctx.beginPath();state.roadDraft.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();}state.roadDraft.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,4/state.view.scale,0,Math.PI*2);ctx.fill()});ctx.restore();} if(state.trackDraft&&state.trackDraft.length){ctx.save();const temp=normalizeTrack({id:'track_draft',name:'Track preview',pointsPx:state.trackDraft.slice(),gaugeMm:9,tieSpacingMm:4,color:'#4b4438',tieColor:'#8a6f43'}); drawTrack(temp); ctx.fillStyle='rgba(75,68,56,.20)'; state.trackDraft.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,4/state.view.scale,0,Math.PI*2);ctx.fill()});ctx.restore();} if(state.benchworkDraft.length){ctx.save();ctx.strokeStyle='#2f6f4e';ctx.fillStyle='rgba(47,111,78,.12)';ctx.lineWidth=3/state.view.scale;ctx.setLineDash([8/state.view.scale,6/state.view.scale]);ctx.beginPath();state.benchworkDraft.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.setLineDash([]);state.benchworkDraft.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,4/state.view.scale,0,Math.PI*2);ctx.fill()});ctx.restore();} drawFabricDraft(); if(state.polygonDraft.length){ctx.save();ctx.strokeStyle='#7c5f3f';ctx.fillStyle='rgba(124,95,63,.20)';ctx.lineWidth=3/state.view.scale;ctx.beginPath();state.polygonDraft.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();state.polygonDraft.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,4/state.view.scale,0,Math.PI*2);ctx.fill()});ctx.restore();} if(state.drag&&state.drag.preview){ if(state.drag.type==='roadCenterline') drawRoad(state.drag.preview); else drawBuilding(state.drag.preview); } drawSelectionMarquee(); drawHoverPreview(); ctx.restore(); updateEmptyImageOverlay(); updateStatus();}
  function fitImage(){const r=canvas.getBoundingClientRect(); if(!state.image){state.view={x:r.width/2,y:r.height/2,scale:1}; draw(); return;} const s=Math.min(r.width/state.image.width,r.height/state.image.height)*.9; state.view.scale=s; state.view.x=(r.width-state.image.width*s)/2; state.view.y=(r.height-state.image.height*s)/2; draw();}

  function sidebarObjectTypes(){
    return sidebarObjectTypesForState(state);
  }
  function sidebarObjectTypeMeta(type){
    return sidebarObjectTypes().find(t=>t.key===type) || sidebarObjectTypeMetaForState(state,type);
  }
  function installHakoImportDropzone(box){
    if(!box) return;
    const actions=document.createElement('div');
    actions.className='buildingListActions';
    actions.innerHTML=`
      <div id="importHakoAsBuildingDropzone" class="hakoImportDropzone" role="button" tabindex="0" title="Click to choose a .hako file, or drag one here to create a draggable footprint.">
        <b>Import existing .hako as footprint</b>
        <span class="small muted">Click or drop .hako / .json here</span>
        <input id="importHakoBuildingFile" class="hiddenFile" type="file" accept=".hako,.hakoseed,.hakoplan,.json,application/json">
      </div>`;
    box.appendChild(actions);
    const drop=$('importHakoAsBuildingDropzone');
    const input=$('importHakoBuildingFile');
    if(drop && input){
      const pick=()=>input.click();
      drop.onclick=(ev)=>{ if(ev.target!==input) pick(); };
      drop.onkeydown=(ev)=>{ if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); pick(); } };
      input.onchange=e=>{const f=e.target.files&&e.target.files[0]; if(f) importHakoAsBuilding(f); e.target.value='';};
      ['dragenter','dragover'].forEach(type=>drop.addEventListener(type, ev=>{ev.preventDefault(); ev.stopPropagation(); drop.classList.add('dragover');}));
      ['dragleave','drop'].forEach(type=>drop.addEventListener(type, ev=>{ev.preventDefault(); ev.stopPropagation(); if(type==='dragleave' && drop.contains(ev.relatedTarget)) return; drop.classList.remove('dragover');}));
      drop.addEventListener('drop', ev=>{const files=Array.from(ev.dataTransfer&&ev.dataTransfer.files||[]); const f=files.find(file=>/\.(hako|hakoseed|hakoplan|json)$/i.test(file.name||''))||files[0]; if(f){ if(selected() && currentSelectedBuildingIds().length===1) attachHakoFileToSelectedBuilding(f,{source:'selected-building-drop'}); else importHakoAsBuilding(f); }});
    }
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
  function selectSidebarObject(type,id,ev=null){
    sidebarObjectType=type;
    const siteTypeBySidebarType={roads:'road',tracks:'track',trackAccessories:'trackAccessory',roadFeatures:'roadFeature',benchwork:'benchwork',streetlights:'streetlight',fabric:'fabric',annotations:'annotation',siteObjects:'stlObject'};
    if(type==='buildings'){
      if(ev && (ev.shiftKey || ev.metaKey || ev.ctrlKey)) toggleSiteObjectSelection('building',id);
      else setSingleSiteObjectSelection('building',id);
    } else {
      const siteType=siteTypeBySidebarType[type];
      if(siteType){
        if(ev && (ev.shiftKey || ev.metaKey || ev.ctrlKey)) toggleSiteObjectSelection(siteType,id);
        else setSingleSiteObjectSelection(siteType,id);
      }
    }
    renderObjectBrowser();
    renderSelected();
    updateHandoff();
    draw();
  }
  function objectRowSelected(type,id){
    return sidebarObjectSelected(state,type,id,isBuildingSelected);
  }
  function makeObjectListRow(type,raw){
    const el=document.createElement('div');
    const selectedClass=objectRowSelected(type,raw.id)?'selected':'';
    el.className='buildingItem '+selectedClass;
    el.tabIndex=0;
    if(type==='buildings'){
      const b=normalizeBuilding(raw);
      const hakoBadge=b.hakoFile?'<span class="pill buildingFileBadge">.hako</span>':'';
      const metric=b.padType==='rect'?`${fmt(b.widthMm)}×${fmt(b.depthMm)}`:fmt(b.derived?.areaMm2||0)+' mm²';
      el.innerHTML=`<span class="swatch" style="background:${b.color}"></span><div class="buildingInfo"><span class="buildingName" title="${escapeAttr(b.name||'Building')}">${escapeHtml(b.name||'Building')}</span><span class="small muted buildingMeta">${buildingStateLabel(b.state)} · ${b.padType}${b.hidden?' · hidden':''}${b.locked?' · locked':''}</span></div><span class="pill buildingMetric" title="${escapeAttr(metric)}">${metric}</span>${hakoBadge}`;
      const setCardHover=on=>{
        state.hoverBuildingId=on ? b.id : (state.hoverBuildingId===b.id ? null : state.hoverBuildingId);
        el.classList.toggle('sidebarHover',on);
        draw();
        updateSite3DHoverIndicator();
      };
      el.onmouseenter=()=>setCardHover(true);
      el.onmouseleave=()=>setCardHover(false);
      el.onfocus=()=>setCardHover(true);
      el.onblur=()=>setCardHover(false);
      el.onclick=ev=>selectSidebarObject('buildings',b.id,ev);
      el.onkeydown=ev=>{ if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); selectSidebarObject('buildings',b.id,ev); } };
      return el;
    }
    if(type==='roads'){
      const r=normalizeRoad(raw);
      el.innerHTML=`<span class="swatch" style="background:${r.color||'#6f6a5e'}"></span><div><b>${escapeHtml(r.name||'Road')}</b><br><span class="small muted">${r.mode==='outline'?'outline':'centerline'}${r.sidewalkSide&&r.sidewalkSide!=='none'?' · sidewalk '+r.sidewalkSide:''}${r.locked?' · locked':''}</span></div><span class="pill">${r.mode==='centerline'?fmt(r.widthMm||0)+'mm':'poly'}</span>`;
    } else if(type==='tracks'){
      const t=normalizeTrack(raw);
      el.innerHTML=`<span class="swatch" style="background:${t.color||'#4b4438'}"></span><div><b>${escapeHtml(t.name||'Track')}</b><br><span class="small muted">${(t.pointsPx||[]).length} points${t.locked?' · locked':''}</span></div><span class="pill">${fmt(t.gaugeMm||9)}mm</span>`;
    } else if(type==='trackAccessories'){
      const item=normalizeTrackAccessory(raw);
      el.innerHTML=`<span class="swatch" style="background:${item.color||trackAccessoryPreset(item.kind).color}"></span><div><b>${escapeHtml(item.name||trackAccessoryLabel(item.kind))}</b><br><span class="small muted">${escapeHtml(trackAccessoryLabel(item.kind))}${item.trackId?' · track attached':''}${item.autoOrientToTrack?' · auto-oriented':''}${item.locked?' · locked':''}</span></div><span class="pill">marker</span>`;
    } else if(type==='roadFeatures'){
      const f=normalizeRoadFeature(raw);
      const title=f.name || (f.kind==='manhole'?'Manhole / Hatch':'Road marking');
      const metric=f.kind==='manhole'?(f.hatchShape==='circle'?fmt(f.diameterMm||0)+'mm':`${fmt(f.widthMm||0)}×${fmt(f.depthMm||0)}`):`${fmt(f.widthMm||0)}×${fmt(f.depthMm||0)}`;
      el.innerHTML=`<span class="swatch" style="background:${f.color||'#3a2b1e'}"></span><div><b>${escapeHtml(title)}</b><br><span class="small muted">${f.kind==='manhole'?'hatch':'marking'}${f.locked?' · locked':''}</span></div><span class="pill">${metric}</span>`;
    } else if(type==='benchwork'){
      const bw=normalizeBenchworkOutline(raw);
      el.innerHTML=`<span class="swatch" style="background:${bw.color||'#2f6f4e'}"></span><div><b>${escapeHtml(bw.name||'Benchwork Outline')}</b><br><span class="small muted">${(bw.pointsPx||[]).length} points${bw.locked?' · locked':''}</span></div><span class="pill">outline</span>`;
    } else if(type==='streetlights'){
      const l=normalizeStreetlight(raw);
      el.innerHTML=`<span class="streetlight-swatch" style="background:${l.color||'#c84a3a'}"></span><div><b>${escapeHtml(l.name||'Streetlight')}</b><br><span class="small muted">${l.mode==='anchored'?'anchored · ':''}${l.type||'singleArm'}${l.locked?' · locked':''}</span></div><span class="pill">${fmt(l.heightMm||0)}mm</span>`;
    } else if(type==='fabric'){
      const f=normalizeFabricRegion(raw);
      const generated=state.buildings.filter(b=>b.fabricRegionId===f.id).length;
      el.innerHTML=`<span class="swatch" style="background:${f.color||'#7c5f3f'}"></span><div><b>${escapeHtml(f.name||'Fabric Region')}</b><br><span class="small muted">${escapeHtml(FABRIC_PRESETS[f.fabricType]?.label||f.fabricType||'fabric')} · ${generated} pad${generated===1?'':'s'}</span></div><span class="pill">${(f.polygon||[]).length} pts</span>`;
    } else if(type==='annotations'){
      const note=raw;
      el.innerHTML=`<span class="swatch" style="background:${note.color||'#6f4326'}"></span><div><b>${escapeHtml(note.name||'Annotation')}</b><br><span class="small muted">${(note.points||[]).length} points</span></div><span class="pill">note</span>`;
    } else if(type==='siteObjects'){
      const obj=normalizeStlObject(raw);
      el.innerHTML=`<span class="swatch" style="background:${obj.color||'#496a78'}"></span><div><b>${escapeHtml(obj.name||'STL Object')}</b><br><span class="small muted">${escapeHtml(obj.asset?.fileName||'STL asset')}${obj.locked?' · locked':''}${obj.hidden?' · hidden':''}</span></div><span class="pill">${fmt(obj.widthMm*obj.scale)}×${fmt(obj.depthMm*obj.scale)}mm</span>`;
    }
    el.onclick=ev=>selectSidebarObject(type,raw.id,ev);
    el.onkeydown=ev=>{ if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); selectSidebarObject(type,raw.id,ev); } };
    return el;
  }
  function sidebarObjectsForType(type){
    const objects=objectsForSidebarType(state,type);
    if(type==='trackAccessories'){
      return objects.map(normalizeTrackAccessory).filter(item=>trackAccessoryMatchesObjectFilter(item));
    }
    return objects;
  }
  function trackAccessoryObjectFilterSummary(total, visible){
    if(trackAccessoryObjectFilter==='all') return `${total} item${total===1?'':'s'}`;
    return `${visible} of ${total} item${total===1?'':'s'}`;
  }
  function closeTrackAccessoryFilterMenu(){
    const menu=$('trackItemFilterMenu');
    const wrap=$('trackItemFilterWrap');
    const btn=$('trackItemFilterBtn');
    menu?.classList.remove('open');
    wrap?.classList.remove('menuOpen');
    btn?.setAttribute('aria-expanded','false');
  }
  function bindTrackAccessoryFilterMenu(){
    const btn=$('trackItemFilterBtn');
    const menu=$('trackItemFilterMenu');
    const wrap=$('trackItemFilterWrap');
    if(!btn || !menu || !wrap) return;
    btn.onclick=e=>{
      e.preventDefault();
      e.stopPropagation();
      const open=!menu.classList.contains('open');
      closeTrackAccessoryFilterMenu();
      menu.classList.toggle('open',open);
      wrap.classList.toggle('menuOpen',open);
      btn.setAttribute('aria-expanded',String(open));
    };
    menu.onclick=e=>e.stopPropagation();
    menu.querySelectorAll('[data-track-item-filter]').forEach(option=>{
      option.onclick=()=>{
        trackAccessoryObjectFilter=option.dataset.trackItemFilter||'all';
        closeTrackAccessoryFilterMenu();
        renderObjectBrowser();
      };
    });
  }
  function renderObjectBrowser(){
    const box=$('objectBrowser');
    if(!box) return;
    const title=$('objectBrowserTitle');
    box.innerHTML='';
    const activeTypes=sidebarObjectTypes();
    if(sidebarObjectType && !sidebarObjectTypeMeta(sidebarObjectType)?.count) sidebarObjectType=null;
    if(!sidebarObjectType){
      if(title) title.textContent='Plan Objects';
      if(!activeTypes.length){
        const empty=document.createElement('div');
        empty.className='objectBrowserEmpty small muted';
        empty.textContent='No plan objects yet.';
        box.appendChild(empty);
        installHakoImportDropzone(box);
        return;
      }
      const grid=document.createElement('div');
      grid.className='objectTypeGrid';
      activeTypes.forEach(type=>{
        const card=document.createElement('button');
        card.type='button';
        card.className='objectTypeCard';
        card.innerHTML=`<span class="objectTypeSwatch" style="background:${type.color}"></span><span class="objectTypeText"><b>${escapeHtml(type.label)}</b><span>${escapeHtml(type.hint)}</span></span><span class="pill">${type.count}</span>`;
        card.onclick=()=>{sidebarObjectType=type.key; renderObjectBrowser();};
        grid.appendChild(card);
      });
      box.appendChild(grid);
      if(!state.buildings.length) installHakoImportDropzone(box);
      return;
    }
    const meta=sidebarObjectTypeMeta(sidebarObjectType);
    if(title) title.textContent=meta?.label || 'Plan Objects';
    const toolbar=document.createElement('div');
    toolbar.className='objectBrowserToolbar';
    const objects=sidebarObjectsForType(sidebarObjectType);
    const totalCount=meta?.count||0;
    const visibleCount=objects.length;
    const countText=sidebarObjectType==='trackAccessories'
      ? trackAccessoryObjectFilterSummary(totalCount,visibleCount)
      : `${totalCount} item${totalCount===1?'':'s'}`;
    const filterControls=sidebarObjectType==='trackAccessories' ? `
      <div id="trackItemFilterWrap" class="objectBrowserFilterWrap">
        <button id="trackItemFilterBtn" type="button" class="sidebarOverflowBtn objectBrowserFilterBtn ${trackAccessoryObjectFilter==='all'?'':'active'}" aria-label="Filter track items" title="Filter track items" aria-haspopup="true" aria-expanded="false"><span data-icon="filter"></span></button>
        <div id="trackItemFilterMenu" class="dropdownMenu right objectBrowserFilterMenu" role="menu">
          ${trackAccessoryFilterCounts().map(filter=>`<button type="button" role="menuitemradio" aria-checked="${filter.key===trackAccessoryObjectFilter?'true':'false'}" class="${filter.key===trackAccessoryObjectFilter?'active':''}" data-track-item-filter="${filter.key}"><span>${escapeHtml(filter.label)}</span><span class="pill">${filter.count}</span></button>`).join('')}
        </div>
      </div>` : '';
    toolbar.innerHTML=`<button id="objectBrowserBackBtn" type="button" class="sidebarBackBtn"><span data-icon="arrowLeft"></span><span>Back</span></button><div class="objectBrowserToolbarRight"><span class="small muted">${countText}</span>${filterControls}</div>`;
    box.appendChild(toolbar);
    const back=$('objectBrowserBackBtn');
    if(back) back.onclick=()=>{closeTrackAccessoryFilterMenu(); sidebarObjectType=null; renderObjectBrowser();};
    bindTrackAccessoryFilterMenu();
    if(!objects.length){
      const empty=document.createElement('div');
      empty.className='objectBrowserEmpty small muted';
      empty.textContent=sidebarObjectType==='trackAccessories' && trackAccessoryObjectFilter!=='all' ? 'No track items match this filter.' : 'No items in this group.';
      box.appendChild(empty);
    } else {
      objects.forEach(obj=>box.appendChild(makeObjectListRow(sidebarObjectType,obj)));
    }
    if(sidebarObjectType==='buildings') installHakoImportDropzone(box);
    hydrateIcons(box);
  }

  function renderStreetlights(){
    renderObjectBrowser();
    const box=$('streetlightList'); if(!box) return;
    if(!state.streetlights.length){box.innerHTML='<div class="small muted">No streetlights yet.</div>'; return;}
    box.innerHTML='';
    state.streetlights.forEach(raw=>{const l=normalizeStreetlight(raw); const el=document.createElement('div'); el.className='buildingItem '+(l.id===state.selectedStreetlightId?'selected':''); el.innerHTML=`<span class="streetlight-swatch" style="background:${l.color||'#c84a3a'}"></span><div><b>${escapeHtml(l.name||'Streetlight')}</b><br><span class="small muted">${l.mode==='anchored'?'anchored · ':''}${l.type||'singleArm'}${l.locked?' · locked':''}</span></div><span class="pill">${fmt(l.heightMm||0)}mm</span>`; el.onclick=()=>{state.selectedStreetlightId=l.id; clearBuildingSelection(); state.selectedAnnotationId=null; renderList(); renderStreetlights(); renderSelected(); updateHandoff(); draw();}; box.appendChild(el);});
  }

  function renderList(){
    renderObjectBrowser();
    const box=$('buildingList');
    if(!box) return;
    box.innerHTML='';
    if(!state.buildings.length){
      const empty=document.createElement('div');
      empty.className='small muted';
      empty.textContent='No building pads yet.';
      box.appendChild(empty);
    } else {
      state.buildings.forEach(raw=>box.appendChild(makeObjectListRow('buildings',raw)));
    }
    installHakoImportDropzone(box);
  }
  function renderSelectedCore(){const b=selected(), box=$('selectedPanel'); const note=selectedAnnotation(); const roadIntersection=selectedRoadIntersection(); const railCrossing=selectedRailCrossing(); const roadFeature=selectedRoadFeature(); const road=selectedRoad(); const track=selectedTrack(); const bench=selectedBenchwork(); const light=selectedStreetlight(); const fabric=selectedFabric(); const stl=selectedStlObject(); const selIds=currentSelectedBuildingIds(); const trackAccessory=(!b && !selIds.length && !note && !roadIntersection && !railCrossing && !roadFeature && !road && !track && !bench && !light && !fabric && !stl) ? selectedTrackAccessory() : null; if(!b && selIds.length>1){ box.innerHTML=`<b>${selIds.length} buildings selected</b><br><span class="small muted">Drag any selected footprint to move the whole selection. Use keyboard shortcuts to copy/paste selected building footprints.</span><div class="buttons" style="margin-top:8px"><button id="clearMultiB">Clear Selection</button><button id="deleteMultiB" class="danger">Delete Selected</button></div>`; $('clearMultiB').onclick=()=>{clearBuildingSelection(); syncAll();}; $('deleteMultiB').onclick=()=>{state.buildings=state.buildings.filter(x=>!selIds.includes(x.id)); clearBuildingSelection(); syncAll();}; return;} if(!b){if(trackAccessory){normalizeTrackAccessory(trackAccessory); box.innerHTML=`
      <b>Track item selected</b>
      <label>Name</label><input id="trackItemName" value="${escapeAttr(trackAccessory.name||trackAccessoryLabel(trackAccessory.kind))}">
      <label>Type</label><select id="trackItemKind"><option value="sensor">Under-track Sensor</option><option value="signal">Signal Location</option><option value="crossingArm">Crossing Arm</option><option value="intrusionDetector">Intrusion Detector</option><option value="occupancyLight">Blinking Occupancy Lights</option><option value="trackSwitchLeft">Left-hand Track Switch</option><option value="trackSwitchRight">Right-hand Track Switch</option><option value="trackBufferTomix1428">Tomix 1428 Buffer Stop</option><option value="trackBufferTomix1428Catenary">Tomix 1428 Buffer + Catenary Terminal</option><option value="catenarySingleSide">Single-side Catenary Pole</option><option value="catenaryDoublePortal">Double-track Catenary Portal</option></select>
      <div class="row"><div><label>X px</label><input id="trackItemX" type="number" step="1" value="${fmt(trackAccessory.x||0)}"></div><div><label>Y px</label><input id="trackItemY" type="number" step="1" value="${fmt(trackAccessory.y||0)}"></div></div>
      <div class="row"><div><label>Rotation °</label><input id="trackItemRot" type="number" step="1" value="${fmt(trackAccessory.rotationDeg||0)}"></div><div><label>Color</label><input id="trackItemColor" type="color" value="${trackAccessory.color||trackAccessoryPreset(trackAccessory.kind).color}"></div></div>
      ${isCatenaryAccessoryKind(trackAccessory.kind)?`<label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="trackItemAutoOrient" type="checkbox" ${trackAccessory.autoOrientToTrack!==false&&trackAccessory.trackId?'checked':''}> <span>Attach and auto-orient to track</span></label>`:''}
      ${isTrackBufferAccessoryKind(trackAccessory.kind)?`<label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="trackItemCatenaryTerminal" type="checkbox" ${trackBufferHasCatenaryTerminal(trackAccessory)?'checked':''}> <span>Show catenary end terminal</span></label>`:''}
      <label>Notes</label><textarea id="trackItemNotes" rows="3">${escapeHtml(trackAccessory.notes||'')}</textarea>
      <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="trackItemLocked" type="checkbox" ${trackAccessory.locked?'checked':''}> <span>Lock item</span></label>
      <div class="buttons" style="margin-top:8px"><button id="trackItemSnap">Snap to Nearest Track</button><button id="deleteTrackItem" class="danger">Delete Item</button></div>
      <div class="small muted" style="margin-top:8px">Track items mark placement for sensors, signals, crossing arms, catenary poles, switches, buffer stops, and level crossing detection around physical track. Tomix-style switches expose heel, straight, and diverging endpoints for flex-track snapping. Buffer stops prefer track endpoints and can show a catenary terminal. They are saved with the site plan but are not exported as track parts.</div>`;
      const kind=$('trackItemKind'); if(kind){kind.value=trackAccessory.kind; kind.onchange=()=>{trackAccessory.kind=kind.value; const preset=trackAccessoryPreset(trackAccessory.kind); trackAccessory.color=trackAccessory.color||preset.color; trackAccessory.name=trackAccessory.name||preset.label; if(trackAccessory.kind==='trackBufferTomix1428Catenary') trackAccessory.catenaryEndTerminal=true; normalizeTrackAccessory(trackAccessory); if(isTrackSwitchAccessoryKind(trackAccessory.kind)) syncTracksConnectedToTrackSwitch(trackAccessory); syncAll();};}
      const bindTrackItem=(id,fn)=>{const el=$(id); if(el) el.oninput=()=>{fn(el.type==='checkbox'?el.checked:el.value); normalizeTrackAccessory(trackAccessory); syncAll();};};
      bindTrackItem('trackItemName',v=>trackAccessory.name=v); bindTrackItem('trackItemX',v=>{trackAccessory.x=parseFloat(v)||0; trackAccessory.trackAnchor=null; if(isTrackSwitchAccessoryKind(trackAccessory.kind)) syncTracksConnectedToTrackSwitch(trackAccessory);}); bindTrackItem('trackItemY',v=>{trackAccessory.y=parseFloat(v)||0; trackAccessory.trackAnchor=null; if(isTrackSwitchAccessoryKind(trackAccessory.kind)) syncTracksConnectedToTrackSwitch(trackAccessory);}); bindTrackItem('trackItemRot',v=>{trackAccessory.rotationDeg=parseFloat(v)||0; trackAccessory.autoOrientToTrack=false; if(isTrackSwitchAccessoryKind(trackAccessory.kind)) syncTracksConnectedToTrackSwitch(trackAccessory);}); bindTrackItem('trackItemColor',v=>trackAccessory.color=v); bindTrackItem('trackItemNotes',v=>trackAccessory.notes=v); bindTrackItem('trackItemLocked',v=>trackAccessory.locked=!!v);
      bindTrackItem('trackItemAutoOrient',v=>{trackAccessory.autoOrientToTrack=!!v; if(trackAccessory.autoOrientToTrack){const anchor=nearestTrackAccessoryAnchor({x:trackAccessory.x,y:trackAccessory.y},{trackId:trackAccessory.trackId}); if(anchor) attachTrackAccessoryToAnchor(trackAccessory,anchor); else trackAccessory.autoOrientToTrack=false;}});
      bindTrackItem('trackItemCatenaryTerminal',v=>{trackAccessory.catenaryEndTerminal=!!v; if(trackAccessory.kind==='trackBufferTomix1428Catenary' && !v) trackAccessory.kind='trackBufferTomix1428';});
      installAdaptiveDegreeStepping($('trackItemRot'));
      const snapBtn=$('trackItemSnap'); if(snapBtn) snapBtn.onclick=()=>{const anchor=isTrackBufferAccessoryKind(trackAccessory.kind)?nearestTrackEndpointAnchor({x:trackAccessory.x,y:trackAccessory.y}):nearestTrackAccessoryAnchor({x:trackAccessory.x,y:trackAccessory.y}); if(anchor){if(isCatenaryAccessoryKind(trackAccessory.kind)) attachTrackAccessoryToAnchor(trackAccessory,anchor); else {trackAccessory.x=anchor.point.x; trackAccessory.y=anchor.point.y; trackAccessory.rotationDeg=anchor.angleDeg; trackAccessory.trackId=anchor.trackId; if(isTrackBufferAccessoryKind(trackAccessory.kind)) trackAccessory.trackAnchor={trackId:anchor.trackId,endpointKey:anchor.endpointKey,pointIndex:anchor.pointIndex,pathDistancePx:null,offsetPx:0};} syncAll();}};
      $('deleteTrackItem').onclick=deleteSelectedTrackAccessory;
      return;
    } if(roadIntersection){const intersectionKey=roadIntersectionKey(roadIntersection); const override=normalizeIntersectionOverride((state.roadIntersectionOverrides||{})[intersectionKey]); const generatedType=roadIntersection.type||'intersection'; const arms=(roadIntersection.arms||[]).map(arm=>`${roadArmKey(arm)}${arm.roadName?` · ${arm.roadName}`:''}`); box.innerHTML=`
      <b>Road intersection selected</b>
      <div class="small muted" style="margin:4px 0 8px">${escapeHtml(generatedType)} · ${(roadIntersection.arms||[]).length} connected arm${(roadIntersection.arms||[]).length===1?'':'s'}</div>
      <label>Name</label><input id="roadIntersectionName" value="${escapeAttr(override.label||roadIntersection.label||'')}">
      <label>Type hint</label><select id="roadIntersectionType"><option value="auto">Auto generated</option><option value="corner">Corner</option><option value="t-junction">T-junction</option><option value="cross-junction">Cross junction</option><option value="multi-junction">Multi junction</option><option value="straight-join">Straight join</option><option value="service">Service road</option><option value="driveway">Driveway</option></select>
      <label>Merge mode</label><select id="roadIntersectionMerge"><option value="auto">Auto blend</option><option value="blend">Blend corners</option><option value="miter">Miter corners</option><option value="keep-arms">Keep road arms separate</option></select>
      <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="roadIntersectionEnabled" type="checkbox" ${override.enabled?'checked':''}> <span>Generate intersection geometry and markings</span></label>
      <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="roadIntersectionLocked" type="checkbox" ${override.locked?'checked':''}> <span>Lock generated settings</span></label>
      <div class="row"><div><label>Corner radius px</label><input id="roadIntersectionCurbRadius" type="number" step="1" value="${override.curbRadiusPx==null?'':fmt(override.curbRadiusPx)}"></div><div><label>Sidewalk bulb px</label><input id="roadIntersectionSidewalkRadius" type="number" step="1" value="${override.sidewalkBulbRadiusPx==null?'':fmt(override.sidewalkBulbRadiusPx)}"></div></div>
      <div class="section" style="margin-top:10px">
        <h3 style="margin:0 0 4px">Generated markings</h3>
        <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:6px"><input id="roadIntersectionCrosswalksAll" type="checkbox" ${override.crosswalksEnabled?'checked':''}> <span>Crosswalks</span></label>
        <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:6px"><input id="roadIntersectionStopBarsAll" type="checkbox" ${override.stopBarsEnabled?'checked':''}> <span>Stop bars</span></label>
        <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:6px"><input id="roadIntersectionTactileAll" type="checkbox" ${override.tactilePaversEnabled?'checked':''}> <span>Tactile pavers</span></label>
        <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:6px"><input id="roadIntersectionCurbGuidesAll" type="checkbox" ${override.curbGuidesEnabled?'checked':''}> <span>Curb guides</span></label>
      </div>
      <label>Connected arms</label><div class="small muted" style="display:grid;gap:3px">${arms.length?arms.map(label=>`<span>${escapeHtml(label)}</span>`).join(''):'<span>No connected road arms.</span>'}</div>
      <label>Notes</label><textarea id="roadIntersectionNotes" rows="3">${escapeHtml(override.notes||'')}</textarea>
      <div class="buttons" style="margin-top:8px"><button id="resetRoadIntersectionOverride" type="button">Reset Intersection</button></div>
      <div class="small muted" style="margin-top:8px">Intersection nodes are generated from connected road endpoints. Use this panel to keep the generated node but adjust the markings and output behavior for this specific junction.</div>`;
      const updateRoadIntersectionOverride=patch=>{roadSystem.setRoadIntersectionOverride(roadIntersection,patch); state.selectedRoadIntersectionId=intersectionKey; syncAll();};
      const bindIntersection=(id,fn)=>{const el=$(id); if(el) el.oninput=()=>updateRoadIntersectionOverride(fn(el));};
      const type=$('roadIntersectionType'); if(type){type.value=override.intersectionType||'auto'; type.onchange=()=>updateRoadIntersectionOverride({intersectionType:type.value});}
      const merge=$('roadIntersectionMerge'); if(merge){merge.value=override.mergeMode||'auto'; merge.onchange=()=>updateRoadIntersectionOverride({mergeMode:merge.value});}
      bindIntersection('roadIntersectionName',el=>({label:el.value}));
      bindIntersection('roadIntersectionEnabled',el=>({enabled:!!el.checked}));
      bindIntersection('roadIntersectionLocked',el=>({locked:!!el.checked}));
      bindIntersection('roadIntersectionCrosswalksAll',el=>({crosswalksEnabled:!!el.checked}));
      bindIntersection('roadIntersectionStopBarsAll',el=>({stopBarsEnabled:!!el.checked}));
      bindIntersection('roadIntersectionTactileAll',el=>({tactilePaversEnabled:!!el.checked}));
      bindIntersection('roadIntersectionCurbGuidesAll',el=>({curbGuidesEnabled:!!el.checked}));
      bindIntersection('roadIntersectionCurbRadius',el=>({curbRadiusPx:el.value===''?null:Math.max(0,parseFloat(el.value)||0)}));
      bindIntersection('roadIntersectionSidewalkRadius',el=>({sidewalkBulbRadiusPx:el.value===''?null:Math.max(0,parseFloat(el.value)||0)}));
      bindIntersection('roadIntersectionNotes',el=>({notes:el.value}));
      const reset=$('resetRoadIntersectionOverride'); if(reset) reset.onclick=()=>{roadSystem.clearRoadIntersectionOverride(roadIntersection); state.selectedRoadIntersectionId=intersectionKey; syncAll();};
      return;
    } if(railCrossing){const overrideKey=railCrossingOverrideKey(railCrossing); const override=normalizeRailCrossingOverride((state.railCrossingOverrides||{})[overrideKey]); box.innerHTML=`
      <b>Rail crossing selected</b>
      <div class="small muted" style="margin:4px 0 8px">${escapeHtml(railCrossing.roadName)} crossing ${escapeHtml(railCrossing.trackName)}</div>
      <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="railCrossingEnabled" type="checkbox" ${override.enabled?'checked':''}> <span>Generate crossing cut pieces</span></label>
      <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="railCrossingSurveyTemplate" type="checkbox" ${override.surveyTemplateEnabled?'checked':''}> <span>Generate survey / test-fit template</span></label>
      <div class="row"><div><label>Rail arc offset mm</label><input id="railCrossingArc" type="number" step="0.1" value="${fmt(override.railArcOffsetMm||0)}"></div><div><label>Crossing offset mm</label><input id="railCrossingOffset" type="number" step="0.1" value="${fmt(override.crossingOffsetMm||0)}"></div></div>
      <div class="row"><div><label>Road angle adjust °</label><input id="railCrossingRoadAngleOffset" type="number" step="0.1" value="${fmt(override.roadAngleOffsetDeg||0)}"></div><div><label>Track angle adjust °</label><input id="railCrossingTrackAngleOffset" type="number" step="0.1" value="${fmt(override.trackAngleOffsetDeg||0)}"></div></div>
      <div class="row"><div><label>Road width override mm</label><input id="railCrossingRoadWidth" type="number" step="0.1" placeholder="${fmt(railCrossing.roadWidthMm||0)}" value="${override.roadWidthMm?fmt(override.roadWidthMm):''}"></div><div><label>Flangeway guide mm</label><input id="railCrossingFlangeway" type="number" min="0.2" step="0.1" value="${fmt(override.flangewayMm||1.2)}"></div></div>
      <div class="row"><div><label>Center clearance mm</label><input value="${fmt(RAIL_CROSSING_CENTER_CLEARANCE_MM)}" disabled></div><div><label>Crossing angle °</label><input value="${fmt(railCrossing.crossingAngleDeg||0)}" disabled></div></div>
      <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="railCrossingTrimGuides" type="checkbox" ${override.trimGuideEnabled?'checked':''}> <span>Template trim guides ±0.5 / ±1.0 mm</span></label>
      <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:6px"><input id="railCrossingRegistrationMarks" type="checkbox" ${override.registrationMarksEnabled?'checked':''}> <span>Template registration marks</span></label>
      <div class="small muted" style="margin-top:8px">Survey templates export lightweight fit-check pieces with rail slots, road/track centerlines, road edges, flangeway guides, angle text, trim guides, and registration marks. The same angle, offset, road-width, flangeway, and arc values are reused by the final retained crossing inserts.</div>`;
      const updateRailCrossingOverride=patch=>{state.railCrossingOverrides=state.railCrossingOverrides||{}; state.railCrossingOverrides[overrideKey]=normalizeRailCrossingOverride({...override,...(state.railCrossingOverrides[overrideKey]||{}),...patch}); state.selectedRailCrossingId=overrideKey; syncAll();};
      const enabled=$('railCrossingEnabled'); if(enabled) enabled.onchange=()=>updateRailCrossingOverride({enabled:!!enabled.checked});
      const survey=$('railCrossingSurveyTemplate'); if(survey) survey.onchange=()=>updateRailCrossingOverride({surveyTemplateEnabled:!!survey.checked});
      const arc=$('railCrossingArc'); if(arc) arc.oninput=()=>updateRailCrossingOverride({railArcOffsetMm:parseFloat(arc.value)||0});
      const offset=$('railCrossingOffset'); if(offset) offset.oninput=()=>updateRailCrossingOverride({crossingOffsetMm:parseFloat(offset.value)||0});
      const roadAngle=$('railCrossingRoadAngleOffset'); if(roadAngle){installAdaptiveDegreeStepping(roadAngle); roadAngle.oninput=()=>updateRailCrossingOverride({roadAngleOffsetDeg:parseFloat(roadAngle.value)||0});}
      const trackAngle=$('railCrossingTrackAngleOffset'); if(trackAngle){installAdaptiveDegreeStepping(trackAngle); trackAngle.oninput=()=>updateRailCrossingOverride({trackAngleOffsetDeg:parseFloat(trackAngle.value)||0});}
      const roadWidth=$('railCrossingRoadWidth'); if(roadWidth) roadWidth.oninput=()=>updateRailCrossingOverride({roadWidthMm:roadWidth.value===''?null:Math.max(1,parseFloat(roadWidth.value)||0)});
      const flangeway=$('railCrossingFlangeway'); if(flangeway) flangeway.oninput=()=>updateRailCrossingOverride({flangewayMm:Math.max(.2,parseFloat(flangeway.value)||1.2)});
      const trimGuides=$('railCrossingTrimGuides'); if(trimGuides) trimGuides.onchange=()=>updateRailCrossingOverride({trimGuideEnabled:!!trimGuides.checked});
      const registration=$('railCrossingRegistrationMarks'); if(registration) registration.onchange=()=>updateRailCrossingOverride({registrationMarksEnabled:!!registration.checked});
      return;
    } if(roadFeature){normalizeRoadFeature(roadFeature); box.innerHTML=`
      <b>${roadFeature.kind==='manhole'?'Manhole / Hatch':'Japanese road marking'} selected</b>
      <label>Name</label><input id="rfName" value="${escapeAttr(roadFeature.name||'Road item')}">
      ${roadFeature.kind==='manhole'?`<label>Hatch preset</label><select id="rfHatchPreset">${hatchOptionsHtml(roadFeature.hatchPreset)}</select>
      <label>Shape</label><select id="rfShape"><option value="circle">Round cut hole</option><option value="rect">Rectangular cut hole</option></select>
      <label>Physical insert</label><select id="rfPhysicalInsert"><option value="">Visual / cut opening only</option><option value="foldedDrainageGrateInsert">Physical see-through insert</option></select>
      <label>Grate family</label><select id="rfGrateFamily">${grateFamilyOptionsHtml(roadFeature.grateInsertSpec?.key)}</select>
      <div class="row"><div><label>Diameter mm</label><input id="rfDia" type="number" step="0.1" value="${fmt(roadFeature.diameterMm||0)}"></div><div><label>Rotation °</label><input id="rfRot" type="number" step="1" value="${fmt(roadFeature.rotationDeg||0)}"></div></div>
      <div class="row"><div><label>Width mm</label><input id="rfW" type="number" step="0.1" value="${fmt(roadFeature.widthMm||0)}"></div><div><label>Depth mm</label><input id="rfD" type="number" step="0.1" value="${fmt(roadFeature.depthMm||0)}"></div></div>
      <div class="small muted">Exports as <code>roadHatchCut</code> for mounting separate printed or detailed hatch/manhole pieces.</div>`:`<label>Japanese marking preset</label><select id="rfMarkingPreset">${markingOptionsHtml(roadFeature.markingPreset||roadFeature.markingType)}</select>
      <div class="small muted" style="margin:4px 0">${escapeHtml(roadFeature.jpName||'')} · ${escapeHtml(roadFeature.markingCategory||'')}</div>
      <label>Output</label><select id="rfMarkingOutput"><option value="etch">Etch / visual on road deck</option><option value="paintStencil">Paint stencil sheet</option></select>
      <div id="rfStencilOptions" style="display:${roadFeature.outputMode==='paintStencil'?'block':'none'}">
        <label>Stencil stock material ID</label><input id="rfStencilMaterialId" value="${escapeAttr(roadFeature.stencilMaterialId||'stencil-stock')}">
        <div class="row"><div><label>Frame margin mm</label><input id="rfStencilMargin" type="number" min="0" step="0.1" value="${fmt(roadFeature.stencilSpec?.marginMm??2)}"></div><div><label>Bridge guide mm</label><input id="rfStencilBridge" type="number" min="0" step="0.05" value="${fmt(roadFeature.stencilSpec?.bridgeMm??0.35)}"></div></div>
      </div>
      <div class="row"><div><label>Width mm</label><input id="rfW" type="number" step="0.1" value="${fmt(roadFeature.widthMm||0)}"></div><div><label>Depth mm</label><input id="rfD" type="number" step="0.1" value="${fmt(roadFeature.depthMm||0)}"></div></div>
      <div class="row"><div><label>Rotation °</label><input id="rfRot" type="number" step="1" value="${fmt(roadFeature.rotationDeg||0)}"></div><div><label>Color</label><input id="rfColor" type="color" value="${roadFeature.color||'#f7f2df'}"></div></div>
      <div class="buttons" style="margin-top:8px"><button id="realignRoadMarking" type="button">Realign to Road</button><button id="fitRoadMarking" type="button">Fit to Road</button></div>
      <div class="small muted">Etch mode exports <code>roadMarkingEtch</code>. Paint stencil mode exports a separate inverse stencil sheet from real stock.</div>`}
      <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="rfLocked" type="checkbox" ${roadFeature.locked?'checked':''}> <span>Lock item</span></label>
      <div class="buttons" style="margin-top:8px"><button id="deleteRoadFeature" class="danger">Delete Item</button></div>`;
      const bindRF=(id,fn)=>{const el=$(id); if(el) el.oninput=()=>{fn(el.type==='checkbox'?el.checked:el.value); normalizeRoadFeature(roadFeature); syncAll();};};
      bindRF('rfName',v=>roadFeature.name=v); bindRF('rfRot',v=>roadFeature.rotationDeg=parseFloat(v)||0); bindRF('rfLocked',v=>roadFeature.locked=!!v); bindRF('rfColor',v=>roadFeature.color=v);
      installAdaptiveDegreeStepping($('rfRot'));
      bindRF('rfDia',v=>{roadFeature.diameterMm=parseFloat(v)||0; roadFeature.diameterPx=state.pxPerMm?mmToPx(roadFeature.diameterMm):roadFeature.diameterPx; syncPhysicalGrateSpecDimensions(roadFeature);});
      bindRF('rfW',v=>{roadFeature.widthMm=parseFloat(v)||0; roadFeature.widthPx=state.pxPerMm?mmToPx(roadFeature.widthMm):roadFeature.widthPx; syncPhysicalGrateSpecDimensions(roadFeature);});
      bindRF('rfD',v=>{roadFeature.depthMm=parseFloat(v)||0; roadFeature.depthPx=state.pxPerMm?mmToPx(roadFeature.depthMm):roadFeature.depthPx; syncPhysicalGrateSpecDimensions(roadFeature);});
      const hp=$('rfHatchPreset'); if(hp) hp.onchange=()=>{state.lastRoadHatchPreset=hp.value; applyRoadHatchPreset(roadFeature,hp.value,roadPresetScaleContext()); syncAll();};
      const sh=$('rfShape'); if(sh){sh.value=roadFeature.hatchShape||'circle'; sh.onchange=()=>{roadFeature.hatchShape=sh.value; syncPhysicalGrateSpecDimensions(roadFeature); syncAll();};}
      const pi=$('rfPhysicalInsert'); if(pi){pi.value=roadFeature.physicalInsert||''; pi.onchange=()=>{setPhysicalGrateMode(roadFeature,!!pi.value); syncAll();};}
      const gf=$('rfGrateFamily'); if(gf){gf.disabled=!roadFeature.physicalInsert; gf.onchange=()=>{applyPhysicalGrateFamily(roadFeature,gf.value); syncAll();};}
      const mp=$('rfMarkingPreset'); if(mp) mp.onchange=()=>{state.lastRoadMarkingPreset=mp.value; applyRoadMarkingPreset(roadFeature,mp.value,roadPresetScaleContext()); fitRoadMarkingToRoad(roadFeature); alignRoadMarkingToRoad(roadFeature); syncAll();};
      const realign=$('realignRoadMarking'); if(realign) realign.onclick=()=>{if(alignRoadMarkingToRoad(roadFeature)) syncAll();};
      const fitMarking=$('fitRoadMarking'); if(fitMarking) fitMarking.onclick=()=>{if(fitRoadMarkingToRoad(roadFeature)) syncAll();};
      const mo=$('rfMarkingOutput'); if(mo){mo.value=roadFeature.outputMode==='paintStencil'?'paintStencil':'etch'; mo.onchange=()=>{setRoadMarkingOutputMode(roadFeature,mo.value); syncAll();};}
      bindRF('rfStencilMaterialId',v=>{roadFeature.stencilMaterialId=v||'stencil-stock'; setRoadMarkingOutputMode(roadFeature,'paintStencil');});
      bindRF('rfStencilMargin',v=>{roadFeature.stencilSpec={...(roadFeature.stencilSpec||{}),marginMm:Math.max(0,parseFloat(v)||0)}; setRoadMarkingOutputMode(roadFeature,'paintStencil');});
      bindRF('rfStencilBridge',v=>{roadFeature.stencilSpec={...(roadFeature.stencilSpec||{}),bridgeMm:Math.max(0,parseFloat(v)||0)}; setRoadMarkingOutputMode(roadFeature,'paintStencil');});
      $('deleteRoadFeature').onclick=deleteSelectedRoadFeature;
      return;
    } if(road){normalizeRoad(road); const roadPresetKey=road.roadWidthPreset||'custom'; const sidewalkPresetKey=road.sidewalkWidthPreset||'custom'; const showRoadOverride=road.mode!=='outline' && roadPresetKey==='custom'; const showSidewalkOverride=road.mode!=='outline' && sidewalkPresetKey==='custom'; box.innerHTML=`
      <b>${road.mode==='outline'?'Road outline':'Road centerline'} selected</b>
      <label>Name</label><input id="roadName" value="${escapeAttr(road.name||'Road')}">
      <label>Road width preset</label><select id="roadWidthPreset" ${road.mode==='outline'?'disabled':''}>${presetOptionsHtml(ROAD_WIDTH_PRESETS, roadPresetKey, currentScaleDivisor())}</select>
      <div id="roadWidthOverrideWrap" style="display:${showRoadOverride?'block':'none'}"><label>Width override (mm)</label><input id="roadWidth" type="number" step="0.1" value="${fmt(road.widthMm||0)}" ${road.mode==='outline'?'disabled':''}></div>
      <label>Sidewalk</label><select id="roadSidewalk" ${road.mode==='outline'?'disabled':''}><option value="none">None</option><option value="left">Left</option><option value="right">Right</option><option value="both">Both sides</option></select>
      <label>Sidewalk width preset</label><select id="roadSidewalkPreset" ${road.mode==='outline'?'disabled':''}>${presetOptionsHtml(SIDEWALK_WIDTH_PRESETS, sidewalkPresetKey, currentScaleDivisor())}</select>
      <div id="roadSidewalkOverrideWrap" style="display:${showSidewalkOverride?'block':'none'}"><label>Sidewalk width override (mm)</label><input id="roadSidewalkWidth" type="number" step="0.1" value="${fmt(road.sidewalkWidthMm||0)}" ${road.mode==='outline'?'disabled':''}></div>
      <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="roadLocked" type="checkbox" ${road.locked?'checked':''}> <span>Lock road</span></label>
      <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="roadIntersectionDetails" type="checkbox" ${state.roadIntersectionDetails!==false?'checked':''}> <span>Show automatic intersection markings</span></label>
      <label>Driving side</label><select id="roadDrivingSide"><option value="left">Left-hand traffic (Japan)</option><option value="right">Right-hand traffic</option></select>
      ${roadIntersectionArmControlsHtml(road.id)}
      <div class="buttons" style="margin-top:8px"><button id="regenRoad">Regenerate road geometry</button><button id="deleteRoad" class="danger">Delete Road</button></div>
      <div class="small muted" style="margin-top:8px">Presets are common real-world widths converted to physical output millimeters using the calibration scale divisor. Choose <b>Custom / override</b> to show manual width fields. Centerlines can be polyline paths; hover a selected segment and drag to bend it into a curve. Laser-cut road export is not enabled yet.</div>`;
      const sel=$('roadSidewalk'); if(sel) sel.value=road.sidewalkSide||'none';
      const bindRoad=(id,fn)=>{const el=$(id); if(el) el.oninput=e=>{fn(el.type==='checkbox'?el.checked:el.value); syncRoadMetrics(road); syncAll();};};
      bindRoad('roadName',v=>road.name=v);
      bindRoad('roadWidthPreset',v=>{applyRoadWidthPreset(road,v);});
      bindRoad('roadWidth',v=>{road.roadWidthPreset='custom'; road.widthMm=parseFloat(v)||0; road.widthPx=state.pxPerMm?mmToPx(road.widthMm):road.widthPx;});
      bindRoad('roadSidewalk',v=>road.sidewalkSide=v);
      bindRoad('roadSidewalkPreset',v=>{applySidewalkWidthPreset(road,v);});
      bindRoad('roadSidewalkWidth',v=>{road.sidewalkWidthPreset='custom'; road.sidewalkWidthMm=parseFloat(v)||0; road.sidewalkWidthPx=state.pxPerMm?mmToPx(road.sidewalkWidthMm):road.sidewalkWidthPx;});
      bindRoad('roadLocked',v=>road.locked=!!v);
      bindRoad('roadIntersectionDetails',v=>{state.roadIntersectionDetails=!!v;});
      const roadDrivingSide=$('roadDrivingSide'); if(roadDrivingSide){roadDrivingSide.value=normalizeDrivingSide(state.roadDrivingSide); roadDrivingSide.onchange=()=>{state.roadDrivingSide=normalizeDrivingSide(roadDrivingSide.value); syncAll();};}
      bindRoadIntersectionArmCheckbox('roadIntersectionCrosswalks',road.id,'crosswalkEnabled');
      bindRoadIntersectionArmCheckbox('roadIntersectionStopBars',road.id,'stopBarEnabled');
      bindRoadIntersectionArmCheckbox('roadIntersectionTactile',road.id,'tactilePaversEnabled');
      bindRoadIntersectionArmCheckbox('roadIntersectionCurbGuides',road.id,'curbGuideEnabled');
      bindRoadIntersectionFeatureToggles();
      const clearIntersectionOverrides=$('clearRoadIntersectionArmOverrides');
      if(clearIntersectionOverrides) clearIntersectionOverrides.onclick=()=>{roadSystem.clearRoadIntersectionArmOverrides(road.id); syncAll();};
      $('regenRoad').onclick=()=>syncAll(); $('deleteRoad').onclick=deleteSelectedRoad;
      return;
    } if(track){normalizeTrack(track); box.innerHTML=`
      <b>Track selected</b>
      <label>Name</label><input id="trackName" value="${escapeAttr(track.name||'Track')}">
      <div class="row"><div><label>Gauge mm</label><input id="trackGauge" type="number" step="0.1" value="${fmt(track.gaugeMm||9)}"></div><div><label>Tie spacing mm</label><input id="trackTieSpacing" type="number" step="0.1" value="${fmt(track.tieSpacingMm||4)}"></div></div>
      <div class="row"><div><label>Rail color</label><input id="trackColor" type="color" value="${track.color||'#4b4438'}"></div><div><label>Tie color</label><input id="trackTieColor" type="color" value="${track.tieColor||'#8a6f43'}"></div></div>
      <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="trackLocked" type="checkbox" ${track.locked?'checked':''}> <span>Lock track</span></label>
      <div class="buttons" style="margin-top:8px"><button id="deleteTrack" class="danger">Delete Track</button></div>
      <div class="small muted" style="margin-top:8px">Approximate planning track: twin rails and ties are drawn as site context for a physical track product. Track paths are not exported as fabricated parts.</div>`;
      const bindTrack=(id,fn)=>{const el=$(id); if(el) el.oninput=()=>{fn(el.type==='checkbox'?el.checked:el.value); syncTrackMetrics(track); syncAll();};};
      bindTrack('trackName',v=>track.name=v);
      bindTrack('trackGauge',v=>{track.gaugeMm=parseFloat(v)||9; track.gaugePx=state.pxPerMm?mmToPx(track.gaugeMm):track.gaugePx;});
      bindTrack('trackTieSpacing',v=>{track.tieSpacingMm=parseFloat(v)||4; track.tieSpacingPx=state.pxPerMm?mmToPx(track.tieSpacingMm):track.tieSpacingPx;});
      bindTrack('trackColor',v=>track.color=v);
      bindTrack('trackTieColor',v=>track.tieColor=v);
      bindTrack('trackLocked',v=>track.locked=!!v);
      $('deleteTrack').onclick=deleteSelectedTrack;
      return;
    } if(bench){normalizeBenchworkOutline(bench); box.innerHTML=`
      <b>Benchwork outline selected</b>
      <label>Name</label><input id="benchName" value="${escapeAttr(bench.name||'Benchwork Outline')}">
      <div class="row"><div><label>Color</label><input id="benchColor" type="color" value="${bench.color||'#2f6f4e'}"></div><div><label>Points</label><input value="${(bench.pointsPx||[]).length}" disabled></div></div>
      <label style="display:flex;align-items:center;gap:6px;margin-top:6px"><input id="benchLocked" type="checkbox" ${bench.locked?'checked':''}> Locked</label>
      <label>Notes</label><textarea id="benchNotes" rows="3">${escapeHtml(bench.notes||'')}</textarea>
      <div class="buttons" style="margin-top:8px"><button id="clearBenchCurves">Clear Curves</button><button id="deleteBench" class="danger">Delete Benchwork</button></div>
      <div class="small muted" style="margin-top:8px">Hover an edge segment on the selected outline and drag to curve it. Anything beyond this boundary can be trimmed in future export stages.</div>`;
      const bindBench=(id,fn)=>{const el=$(id); if(el) el.oninput=()=>{fn(el.type==='checkbox'?el.checked:el.value); syncAll();};};
      bindBench('benchName',v=>bench.name=v); bindBench('benchColor',v=>bench.color=v); bindBench('benchLocked',v=>bench.locked=!!v); bindBench('benchNotes',v=>bench.notes=v);
      $('clearBenchCurves').onclick=()=>{bench.curvesPx=(bench.pointsPx||[]).map(()=>null); syncAll();};
      $('deleteBench').onclick=deleteSelectedBenchwork;
      return;
    } if(light){normalizeStreetlight(light); box.innerHTML=`
      <b>${light.mode==='anchored'?'Anchored Streetlight':'Streetlight'} selected</b>
      <label>Name</label><input id="slName" value="${escapeAttr(light.name||'')}">
      <div class="row"><div><label>Type</label><select id="slType"><option value="singleArm">Single arm</option><option value="doubleArm">Double arm</option><option value="poleOnly">Pole only</option></select></div><div><label>Color</label><input id="slColor" type="color" value="${light.color||'#c84a3a'}"></div></div>
      <div class="row"><div><label>Height mm</label><input id="slHeight" type="number" step="0.1" value="${fmt(light.heightMm)}"></div><div><label>Arm mm</label><input id="slArm" type="number" step="0.1" value="${fmt(light.armLengthMm)}"></div></div>
      <div class="row"><div><label>Rotation °</label><input id="slRot" type="number" step="1" value="${fmt(light.rotationDeg||0)}"></div><div><label>Light radius mm</label><input id="slRadius" type="number" step="0.1" value="${fmt(light.lightRadiusMm)}"></div></div>
      ${light.mode==='anchored'?`<h3 style="margin-top:10px">Anchor / future export</h3>
      <label>Mount mode</label><select id="slMount"><option value="sidewalkCutHole">Sidewalk cut-through hole</option><option value="roadEdgeBulbMount">Street-edge bulb mount</option><option value="auto">Auto-detect later</option></select>
      <div class="row"><div><label>Cut hole Ø mm</label><input id="slCutDia" type="number" step="0.1" value="${fmt(light.anchor.cutHoleDiameterMm)}"></div><div><label>Bulb Ø mm</label><input id="slBulbDia" type="number" step="0.1" value="${fmt(light.anchor.bulbMountDiameterMm)}"></div></div>
      <div class="row"><div><label>Edge offset mm</label><input id="slEdgeOffset" type="number" step="0.1" value="${fmt(light.anchor.edgeOffsetMm)}"></div><div><label>Sidewalk side</label><select id="slSide"><option value="auto">Auto</option><option value="left">Left</option><option value="right">Right</option></select></div></div>
      <label style="display:flex;align-items:center;gap:6px;margin-top:6px"><input id="slLockEdge" type="checkbox" ${light.anchor.lockToRoadEdge?'checked':''}> Lock to road edge when road geometry is available</label>
      <div class="small muted" style="margin-top:6px">Sidewalk mode is intended to export as a through-hole in the sidewalk layer. Street-edge mode stores a bulb mount for roads without sidewalks.</div>`:''}
      <label>Notes</label><textarea id="slNotes" rows="3">${escapeHtml(light.notes||'')}</textarea>
      <div class="buttons" style="margin-top:8px"><button id="dupSl">Duplicate</button><button id="lockSl">${light.locked?'Unlock':'Lock'}</button><button id="delSl" class="danger">Delete</button></div>`;
      const bind=(id,fn)=>{const e=$(id); if(e)e.oninput=()=>{fn(e.type==='checkbox'?e.checked:e.value); syncAll();};};
      bind('slName',v=>light.name=v); bind('slColor',v=>light.color=v); bind('slHeight',v=>light.heightMm=parseFloat(v)||0); bind('slArm',v=>light.armLengthMm=parseFloat(v)||0); bind('slRot',v=>light.rotationDeg=parseFloat(v)||0); bind('slRadius',v=>light.lightRadiusMm=parseFloat(v)||0); bind('slNotes',v=>light.notes=v);
      installAdaptiveDegreeStepping($('slRot'));
      const slType=$('slType'); if(slType){slType.value=light.type; slType.onchange=e=>{light.type=e.target.value; syncAll();};}
      const slMount=$('slMount'); if(slMount){slMount.value=light.anchor.mountMode; slMount.onchange=e=>{light.anchor.mountMode=e.target.value; syncAll();};}
      const slSide=$('slSide'); if(slSide){slSide.value=light.anchor.sidewalkSide; slSide.onchange=e=>{light.anchor.sidewalkSide=e.target.value; syncAll();};}
      bind('slCutDia',v=>light.anchor.cutHoleDiameterMm=parseFloat(v)||0); bind('slBulbDia',v=>light.anchor.bulbMountDiameterMm=parseFloat(v)||0); bind('slEdgeOffset',v=>light.anchor.edgeOffsetMm=parseFloat(v)||0); bind('slLockEdge',v=>light.anchor.lockToRoadEdge=!!v);
      $('dupSl').onclick=()=>{duplicateStreetlight(light); syncAll();}; $('lockSl').onclick=()=>{light.locked=!light.locked; syncAll();}; $('delSl').onclick=deleteSelectedStreetlight;
    } else if(fabric){normalizeFabricRegion(fabric); const presetOptions=Object.entries(FABRIC_PRESETS).map(([key,p])=>`<option value="${key}" ${key===fabric.fabricType?'selected':''}>${escapeHtml(p.label)}</option>`).join(''); const padCount=state.buildings.filter(x=>x.fabricRegionId===fabric.id).length; box.innerHTML=`
      <b>${escapeHtml(fabric.name||'Fabric Region')} selected</b>
      <label>Name</label><input id="fabricNameSel" value="${escapeAttr(fabric.name||'')}">
      <label>Fabric preset</label><select id="fabricPresetSel">${presetOptions}</select>
      <div class="row"><div><label>Density</label><input id="fabricDensitySel" type="range" min="0.4" max="1.6" step="0.1" value="${fmt(fabric.density)}"></div><div><label>Randomness</label><input id="fabricRandomnessSel" type="range" min="0" max="1" step="0.05" value="${fmt(fabric.randomness)}"></div></div>
      <div class="row"><div><label>Seed</label><input id="fabricSeedSel" type="number" step="1" value="${fmt(fabric.seed)}"></div><div><label>Color</label><input id="fabricColorSel" type="color" value="${fabric.color||'#7c5f3f'}"></div></div>
      <div class="row"><div><label>Average floors</label><input id="fabricAvgFloorsSel" type="number" min="1" max="12" step="1" value="${fmt(fabric.averageFloorCount)}"></div><div><label>Max floors</label><input id="fabricMaxFloorsSel" type="number" min="1" max="16" step="1" value="${fmt(fabric.maxFloorCount)}"></div></div>
      <div class="small muted" style="margin-top:6px">${padCount} generated pad${padCount===1?'':'s'} currently reference this region. Deleting the region keeps those pads and detaches them.</div>
      <div class="buttons" style="margin-top:8px"><button id="generateFabricRegion" class="primary">${padCount?'Regenerate Pads':'Generate Pads'}</button><button id="deleteFabricRegion" class="danger">Delete Fabric Region</button></div>`;
      const bindFabric=(id,fn)=>{const el=$(id); if(el) el.oninput=()=>{fn(el.value); normalizeFabricRegion(fabric); syncAll();};};
      bindFabric('fabricNameSel',v=>fabric.name=v);
      bindFabric('fabricDensitySel',v=>fabric.density=Math.max(.4,Math.min(1.6,parseFloat(v)||1)));
      bindFabric('fabricRandomnessSel',v=>fabric.randomness=Math.max(0,Math.min(1,parseFloat(v)||0)));
      bindFabric('fabricSeedSel',v=>fabric.seed=parseInt(v)||101);
      bindFabric('fabricColorSel',v=>fabric.color=v);
      bindFabric('fabricAvgFloorsSel',v=>fabric.averageFloorCount=Math.max(1,parseInt(v)||1));
      bindFabric('fabricMaxFloorsSel',v=>fabric.maxFloorCount=Math.max(1,parseInt(v)||1));
      const fp=$('fabricPresetSel'); if(fp) fp.onchange=()=>{fabric.fabricType=fp.value; state.fabricPreset=fp.value; syncAll();};
      $('generateFabricRegion').onclick=()=>generateFabricForRegion(fabric,{confirmReplace:true});
      $('deleteFabricRegion').onclick=deleteSelectedFabricRegion;
    } else if(stl){normalizeStlObject(stl); const stlFallbackLabels={'asset-unavailable':'asset unavailable','asset-missing':'proxy fallback','mesh-too-large':'proxy fallback: large STL','parse-failed':'proxy fallback: unreadable STL'}; const stlAssetStatus=stl.asset?.renderFallbackReason?` · ${stlFallbackLabels[stl.asset.renderFallbackReason]||'proxy fallback'}`:(stl.asset?.unavailable?' · asset unavailable':(!stl.asset?.dataBase64&&stl.asset?.path?' · referenced asset':'')); const sourceList=(stl.sourceAssets||[]).map((source,idx)=>`
      <div class="listItem compact">
        <div><b>${escapeHtml(source.name||source.fileName||'Source file')}</b><br><span class="small muted">${escapeHtml(source.fileName||'source file')}${source.unavailable?' · unavailable':(!source.dataBase64&&source.path?' · referenced asset':'')}</span></div>
        <div class="buttons"><button data-stl-source-download="${idx}" ${source.dataBase64?'':'disabled'}>Download</button><button data-stl-source-delete="${idx}" class="danger">Remove</button></div>
      </div>`).join('') || '<div class="small muted">No source file attached.</div>'; box.innerHTML=`
      <b>${escapeHtml(stl.name||'STL Object')} selected</b>
      <label>Name</label><input id="stlName" value="${escapeAttr(stl.name||'')}">
      <div class="row"><div><label>Rotation °</label><input id="stlRot" type="number" step="1" value="${fmt(stl.rotationDeg||0)}"></div><div><label>Scale</label><input id="stlScale" type="number" min="0.01" step="0.01" value="${fmt(stl.scale||1)}"></div></div>
      <div class="row"><div><label>Width mm</label><input id="stlW" type="number" min="0.1" step="0.1" value="${fmt(stl.widthMm||0)}"></div><div><label>Depth mm</label><input id="stlD" type="number" min="0.1" step="0.1" value="${fmt(stl.depthMm||0)}"></div></div>
      <div class="row"><div><label>Height mm</label><input id="stlH" type="number" min="0.1" step="0.1" value="${fmt(stl.heightMm||0)}"></div><div><label>Color</label><input id="stlColor" type="color" value="${stl.color||'#496a78'}"></div></div>
      <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="stlLocked" type="checkbox" ${stl.locked?'checked':''}> <span>Lock object</span></label>
      <label>Notes</label><textarea id="stlNotes" rows="3">${escapeHtml(stl.notes||'')}</textarea>
      <div class="small muted" style="margin-top:6px">File: ${escapeHtml(stl.asset?.fileName||'STL asset')} · ${escapeHtml(stl.bounds?.format||'unknown')} bounds${escapeHtml(stlAssetStatus)} · renders as STL geometry when available.</div>
      <label>Source files</label>
      <div>${sourceList}</div>
      <input id="stlSourceFileInput" class="hiddenFile" type="file" accept=".scad,.blend,.py,.js,.json,.txt,.obj,.dae,.3mf">
      <div class="buttons" style="margin-top:8px"><button id="attachStlSourceFile">Attach Source</button><button id="downloadStlObject" ${stl.asset?.dataBase64?'':'disabled'}>Download STL</button><button id="deleteStlObject" class="danger">Delete Object</button></div>`;
      const updateDims=()=>{normalizeStlObject(stl); syncAll();};
      const bindStl=(id,fn)=>{const el=$(id); if(el) el.oninput=()=>{fn(el.type==='checkbox'?el.checked:el.value); updateDims();};};
      bindStl('stlName',v=>stl.name=v);
      bindStl('stlRot',v=>stl.rotationDeg=parseFloat(v)||0);
      bindStl('stlScale',v=>stl.scale=Math.max(.01,parseFloat(v)||1));
      bindStl('stlW',v=>stl.widthMm=Math.max(.1,parseFloat(v)||.1));
      bindStl('stlD',v=>stl.depthMm=Math.max(.1,parseFloat(v)||.1));
      bindStl('stlH',v=>stl.heightMm=Math.max(.1,parseFloat(v)||.1));
      bindStl('stlColor',v=>stl.color=v);
      bindStl('stlLocked',v=>stl.locked=!!v);
      bindStl('stlNotes',v=>stl.notes=v);
      installAdaptiveDegreeStepping($('stlRot'));
      $('attachStlSourceFile').onclick=()=>$('stlSourceFileInput')?.click();
      $('stlSourceFileInput').onchange=async e=>{
        const f=e.target.files&&e.target.files[0];
        if(f) await attachSourceFileToStlObject(stl,f);
        e.target.value='';
      };
      box.querySelectorAll('[data-stl-source-download]').forEach(btn=>{
        btn.onclick=()=>{
          const source=(stl.sourceAssets||[])[Number(btn.dataset.stlSourceDownload)];
          if(source) downloadBase64(source.dataBase64, source.fileName||source.name||'source-file', source.mimeType||'application/octet-stream');
        };
      });
      box.querySelectorAll('[data-stl-source-delete]').forEach(btn=>{
        btn.onclick=()=>{
          const idx=Number(btn.dataset.stlSourceDelete);
          stl.sourceAssets=(stl.sourceAssets||[]).filter((_source,i)=>i!==idx);
          syncAll();
        };
      });
      $('downloadStlObject').onclick=()=>downloadBase64(stl.asset?.dataBase64, stl.asset?.fileName||`${slug(stl.name||'site-object')}.stl`, stl.asset?.mimeType||'model/stl');
      $('deleteStlObject').onclick=deleteSelectedStlObject;
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
    if(returnType) sidebarObjectType=returnType;
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

  function hasActivePointDraft(){
    return (state.roadDraft && state.roadDraft.length) || (state.trackDraft && state.trackDraft.length) || (state.benchworkDraft && state.benchworkDraft.length) || (state.polygonDraft && state.polygonDraft.length);
  }
  function startExistingObjectInteraction(e,p){
    if(hasActivePointDraft()) return false;
    beginLongPress(e,p);
    if(state.tool!=='track'){
      const trackAccessoryRotateHit=hitTrackAccessoryRotationHandle(p,e.pointerType);
      if(trackAccessoryRotateHit){
        selectTrackAccessory(trackAccessoryRotateHit);
        state.drag={
          type:'rotateTrackAccessory',
          pointerId:e.pointerId,
          center:{x:trackAccessoryRotateHit.x,y:trackAccessoryRotateHit.y},
          startAngle:Math.atan2(p.y-trackAccessoryRotateHit.y,p.x-trackAccessoryRotateHit.x),
          origRotation:Number(trackAccessoryRotateHit.rotationDeg)||0,
          orig:structuredClone(trackAccessoryRotateHit),
        };
        return true;
      }
      const trackAccessoryHit=hitTrackAccessory(p,e.pointerType);
      if(trackAccessoryHit){
        return handleSiteObjectPointerHit('trackAccessory',trackAccessoryHit,e,p);
      }
    }
    const roadFeatureHit=hitRoadFeature(p,e.pointerType);
    if(roadFeatureHit){
      return handleSiteObjectPointerHit('roadFeature',roadFeatureHit,e,p);
    }
    const railCrossingHit=hitGeneratedRailCrossing(p,e.pointerType);
    if(railCrossingHit) return selectRailCrossing(railCrossingHit);
    const lightHit=hitStreetlight(p,e.pointerType);
    if(lightHit){
      return handleSiteObjectPointerHit('streetlight',lightHit,e,p);
    }
    const srForRoadEdit=state.selectedRoadId ? selectedRoad() : null;
    const roadOutlineEditing=srForRoadEdit && srForRoadEdit.mode==='outline' && state.roadOutlineEditId===srForRoadEdit.id;
    const roadPointHit=srForRoadEdit && (srForRoadEdit.mode!=='outline' || roadOutlineEditing) ? hitRoadPoint(p, srForRoadEdit, e.pointerType) : null;
    if(roadPointHit){ const r=srForRoadEdit; if(r&&!r.locked){ state.drag={type:'roadPoint',pointerId:e.pointerId,start:p,orig:structuredClone(r),pointIndex:roadPointHit.index}; } return true; }
    const roadCurveHit=srForRoadEdit ? (srForRoadEdit.mode==='outline' ? (roadOutlineEditing ? hitRoadOutlineSegment(p, srForRoadEdit, e.pointerType) : null) : hitRoadCenterlineSegment(p, srForRoadEdit, e.pointerType)) : null;
    if(roadCurveHit){ const r=srForRoadEdit; if(r&&!r.locked){ state.drag={type:'roadCurve',pointerId:e.pointerId,start:p,orig:structuredClone(r),segmentIndex:roadCurveHit.index}; } return true; }
    const roadIntersectionHit=hitGeneratedRoadIntersection(p,e.pointerType);
    if(roadIntersectionHit) return selectRoadIntersection(roadIntersectionHit);
    const roadHit=hitRoad(p,e.pointerType);
    if(roadHit){
      if(roadHit.mode!=='outline') state.roadOutlineEditId=null;
      return handleSiteObjectPointerHit('road',roadHit,e,p);
    }
    const trackHit=hitTrack(p,e.pointerType);
    const selectedTrackForEdit=state.selectedTrackId ? selectedTrack() : null;
    if(state.tool==='track' && !selectedTrackForEdit) return false;
    const trackPointHit=selectedTrackForEdit && !trackHit?.locked ? hitTrackPoint(p, selectedTrackForEdit, e.pointerType) : null;
    if(trackPointHit){
      const t=selectedTrackForEdit;
      if(t&&!t.locked){ state.drag={type:'trackPoint',pointerId:e.pointerId,start:p,orig:structuredClone(t),pointIndex:trackPointHit.index}; }
      return true;
    }
    const trackCurveHit=selectedTrackForEdit ? hitTrackSegment(p, selectedTrackForEdit, e.pointerType) : null;
    if(trackCurveHit){
      const t=selectedTrackForEdit;
      if(t&&!t.locked){ state.drag={type:'trackCurve',pointerId:e.pointerId,start:p,orig:structuredClone(t),segmentIndex:trackCurveHit.index}; }
      return true;
    }
    if(trackHit){
      return handleSiteObjectPointerHit('track',trackHit,e,p);
    }
    const stlHit=hitStlObject(p,e.pointerType);
    if(stlHit){
      return handleSiteObjectPointerHit('stlObject',stlHit,e,p);
    }
    const benchCurveHit=state.selectedBenchworkId ? hitBenchworkSegment(p, selectedBenchwork(), e.pointerType) : null;
    if(benchCurveHit){ const bw=selectedBenchwork(); if(bw&&!bw.locked){ state.drag={type:'benchworkCurve',pointerId:e.pointerId,start:p,orig:structuredClone(bw),segmentIndex:benchCurveHit.index}; } return true; }
    const benchHit=hitBenchwork(p,e.pointerType);
    if(benchHit){
      return handleSiteObjectPointerHit('benchwork',benchHit,e,p);
    }
    const note=hitAnnotation(p,e.pointerType);
    if(note){
      state.selectedAnnotationId=note.id;
      state.selectedId=null; state.selectedStlObjectId=null; state.selectedStreetlightId=null; state.selectedRoadId=null; state.selectedBenchworkId=null; state.selectedFabricId=null;
      renderList(); renderSelected(); updateHandoff(); draw();
      return true;
    }
    const b=selected();
    const h=handleAt(p,b,e.pointerType);
    if(h){
      const drag={type:h.type,pointerId:e.pointerId,index:h.index,start:p,orig:structuredClone(b)};
      if(h.type==='rotate'){
        drag.center=buildingCenter(b);
        drag.startAngle=Math.atan2(p.y-drag.center.y,p.x-drag.center.x);
        drag.origRotation=Number(b.rotationDeg)||0;
      }
      state.drag=drag;
      return true;
    }
    const hit=hitTest(p,e.pointerType);
    if(hit){
      return handleSiteObjectPointerHit('building',hit,e,p);
    }
    const fabricHit=hitFabricRegion(p);
    if(fabricHit) return handleSiteObjectPointerHit('fabric',fabricHit,e,p);
    return false;
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
      if(trackPointHit){ const t=selectTrackForEdit; if(t&&!t.locked){ state.drag={type:'trackPoint',pointerId:e.pointerId,start:p,orig:structuredClone(t),pointIndex:trackPointHit.index}; return; } }
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
    else if(d.type==='moveStreetlight'){const l=state.streetlights.find(x=>x.id===d.orig.id); const dx=p.x-d.start.x,dy=p.y-d.start.y; if(l&&!l.locked){l.x=d.orig.x+dx; l.y=d.orig.y+dy;}}
    else if(d.type==='moveTrackAccessory'){const item=(state.trackAccessories||[]).find(x=>x.id===d.orig.id); const dx=p.x-d.start.x,dy=p.y-d.start.y; if(item&&!item.locked){item.x=d.orig.x+dx; item.y=d.orig.y+dy; if(isTrackSwitchAccessoryKind(item.kind)){if(!snapTrackSwitchToEndpoint(item,p)){item.trackAnchor=null; item.trackId=null; normalizeTrackAccessory(item); syncTracksConnectedToTrackSwitch(item);}} else {const anchor=nearestTrackAccessoryAnchor({x:item.x,y:item.y}); if(anchor && anchor.distance<=trackAccessorySnapDistance()){if(isCatenaryAccessoryKind(item.kind)) attachTrackAccessoryToAnchor(item,anchor); else item.trackId=anchor.trackId;} else if(isCatenaryAccessoryKind(item.kind)){item.trackId=null; item.trackAnchor=null; item.autoOrientToTrack=false;} normalizeTrackAccessory(item);}}}
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
      failImportProgress('Unsupported image type.','Drop a PNG, JPG, SVG, or WEBP image here. Use Load for .hako-site.json project files.');
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
    const ok = confirm('Clear HakoMachi Site Planner cache and reset to the default blank state?\n\nThis clears the current in-memory project, the HakoMachi handoff seed, and planner-related browser storage. Download/save your .hako-site.json first if you want to keep it.');
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
  async function saveSitePlanToGithub(){
    const diagnostics=createPersistenceDiagnostics('GitHub site save');
    try{
      const settings=getGithubSettings();
      try{requireGithubSettings(settings);}catch(err){openGithubSettings(); setGithubStatus(err.message); return;}
      const current=getCurrentGithubSite();
      const projectForName=projectJson({includeImageDataUrl:false});
      const defaultName=current?.name || githubProjectName(projectForName);
      const name=prompt('Site plan name for GitHub save', defaultName);
      if(!name) return;
      openGithubSaveProgressModal();
      setGithubProgress(1,8,'Preparing project...','Finalizing the site plan name and GitHub file path.');
      const id=(current && current.name===defaultName && current.id) ? current.id : slug(name);
      const path=(current && current.name===defaultName && current.path) ? current.path : githubData.cleanRepoPath(`${settings.sitePlansDir}/${id}.hako-site.json`);
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
      setCurrentGithubSite({id,name,path});
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
      setCurrentGithubSite({id:record.id, name:record.name, path:record.path});
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
  $('githubSettingsBtn').onclick=openGithubSettings;
  $('githubSaveBtn').onclick=saveSitePlanToGithub;
  $('githubLoadBtn').onclick=openGithubSitePlans;
  $('githubBuildingsBtn').onclick=openGithubBuildings;
  if($('mobileGithubSettingsBtn')) $('mobileGithubSettingsBtn').onclick=openGithubSettings;
  if($('mobileGithubSaveBtn')) $('mobileGithubSaveBtn').onclick=saveSitePlanToGithub;
  if($('mobileGithubLoadBtn')) $('mobileGithubLoadBtn').onclick=openGithubSitePlans;
  if($('mobileGithubBuildingsBtn')) $('mobileGithubBuildingsBtn').onclick=openGithubBuildings;
  $('saveBtn').onclick=()=>saveSitePlanBundle();
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
      const isZip=/\.zip$/i.test(f.name||'') || /zip/i.test(f.type||'');
      setImportProgress(2,4,'Validating site plan...','Checking the project JSON and save format.');
      if(isZip){
        setImportProgress(3,4,'Applying bundle...','Restoring the site plan and bundled reference image assets.');
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
  if($('mobileSaveBtn')) $('mobileSaveBtn').onclick=()=>saveSitePlanBundle();
  if($('mobileCsvBtn')) $('mobileCsvBtn').onclick=()=>downloadText(csvExport(),'hakomachi-building-pads.csv','text/csv');
  if($('mobileSeedBtn')) $('mobileSeedBtn').onclick=exportSelectedSeed;
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
    const includeImageDataUrl=opts.includeImageDataUrl === true;
    const payload=makeProjectPayload({includeImageDataUrl});
    const manifestAssets=[];
    const manifestAssetPaths=new Set();
    function addManifestAsset(asset){
      if(!asset?.path) return;
      const key=String(asset.path);
      if(manifestAssetPaths.has(key)) return;
      manifestAssetPaths.add(key);
      manifestAssets.push(asset);
    }
    if(opts.imageAsset && payload.image){
      payload.image.asset=opts.imageAsset;
      addManifestAsset(opts.imageAsset);
    }
    if(Array.isArray(opts.hakoAssets)){
      const byBuildingId=new Map(opts.hakoAssets.map(entry=>[entry.buildingId,entry.asset]));
      payload.buildings=(payload.buildings||[]).map(raw=>{
        const b=structuredClone(raw);
        const asset=byBuildingId.get(b.id);
        if(asset && b.hakoFile){
          b.hakoFile={...(b.hakoFile||{}),...asset};
          delete b.hakoFile.dataText;
          delete b.hakoFile.parsedConfig;
          delete b.hakoFile.unavailable;
          delete b.hakoConfig;
        }
        addManifestAsset(b.hakoFile);
        return b;
      });
    }
    if(Array.isArray(opts.stlAssets)){
      const byId=new Map(opts.stlAssets.filter(entry=>entry.role!=='source').map(entry=>[entry.objectId,entry.asset]));
      const sourceById=new Map(opts.stlAssets.filter(entry=>entry.role==='source').map(entry=>[`${entry.objectId}|${entry.sourceAssetId}`,entry.asset]));
      payload.stlObjects=(payload.stlObjects||[]).map(raw=>{
        const obj=structuredClone(raw);
        const asset=byId.get(obj.id);
        if(asset){
          obj.asset={...(obj.asset||{}),...asset};
          delete obj.asset.dataBase64;
        }
        addManifestAsset(obj.asset);
        obj.sourceAssets=Array.isArray(obj.sourceAssets)?obj.sourceAssets.map(rawSource=>{
          const source=structuredClone(rawSource);
          const sourceAsset=sourceById.get(`${obj.id}|${source.id}`);
          if(sourceAsset){
            Object.assign(source, sourceAsset);
            delete source.dataBase64;
          }
          addManifestAsset(source);
          return source;
        }):[];
        return obj;
      });
    }
    if(manifestAssets.length){
      payload.assetManifest={
        schema:'hakomachi.site-assets',
        schemaVersion:1,
        assets:manifestAssets
      };
    }
    if(payload.image?.dataUrl){
      updateImagePortableStatus(`Portable save: embedded original ${payload.image.naturalWidthPx||'?'} × ${payload.image.naturalHeightPx||'?'} px image (${formatBytes(payload.image.dataUrlByteLength||0)}).`);
    } else if(opts.imageAsset){
      updateImagePortableStatus(`Portable save: reference image stored separately as ${opts.imageAsset.path}.`);
    } else if(state.imageMeta){
      updateImagePortableStatus('Portable save warning: no embedded image data. Re-import the image before sharing this file.');
    }
    return payload;
  }
  async function saveSitePlanBundle(){
    if(!window.JSZip){
      showStatusHint('ZIP support is still loading. Try again in a moment.', 'warning');
      return;
    }
    const diagnostics=createPersistenceDiagnostics('local ZIP save');
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
    const blob=await diagnostics.measure('generate ZIP blob', () => zip.generateAsync({type:'blob'}));
    diagnostics.finish({status:'saved', zipBytes:blob.size});
    downloadBlob(blob,'hakomachi-site.zip');
    markManualSaveComplete();
  }
  async function loadProjectJsonObject(project, opts={}){
    const normalized=normalizeLoadedSitePlanPayload(project);
    const payload=normalized.payload;
    loadProject(payload, opts);
    return payload;
  }
  async function loadSitePlanBundle(file){
    const diagnostics=createPersistenceDiagnostics('local ZIP load', {fileName:file?.name, fileBytes:file?.size||0});
    if(!window.JSZip) throw new Error('ZIP support is still loading. Try again in a moment.');
    const zip=await diagnostics.measure('read ZIP file', () => JSZip.loadAsync(file));
    const projectName=findSiteBundleProjectName(zip);
    if(!projectName) throw new Error('No .hako-site.json project file was found in the ZIP.');
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
  if(!restored){syncAll({skipDirty:true}); fitImage(); resetHistory('initial'); writeAutosave();}
  else { updateHistoryButtons(); }
  setTimeout(()=>{ processQueuedSitePlannerBuildingUpdate(); }, 0);
})();
