const { expect, test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('Site Planner module split contracts', () => {
  test('building generator handoff behavior is wired through the handoff controller', async () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controllerSource = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'hako-handoff-controller.js'), 'utf8');
    const { createHakoHandoffController } = await import('../js/site-planner/hako-handoff-controller.js');

    expect(source).toContain("import { createHakoHandoffController } from './site-planner/hako-handoff-controller.js';");
    expect(source).toContain('} = createHakoHandoffController({');
    expect(source).toContain('applySitePlannerBuildingUpdate(payload)');
    expect(source).not.toContain('function sitePlannerBuildingUpdatePayload(data)');

    expect(controllerSource).toContain('export function createHakoHandoffController');
    expect(controllerSource).toContain('function makeSeed(b)');
    expect(controllerSource).toContain('function applySitePlannerBuildingUpdate(raw, opts = {})');
    expect(controllerSource).toContain('function processQueuedSitePlannerBuildingUpdate()');

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

    const result = controller.applySitePlannerBuildingUpdate({
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

  test('benchwork outline behavior is wired through the benchwork controller', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'benchwork-controller.js'), 'utf8');

    expect(source).toContain("import { createBenchworkController } from './site-planner/benchwork-controller.js';");
    expect(source).toContain('} = createBenchworkController({');
    expect(source).toContain('normalizeBenchworkOutline,');
    expect(source).toContain('benchworkPathSamples: benchworkSamples');
    expect(source).toContain('state.benchworkOutlines=loadedBenchworks.map(normalizeBenchworkOutline);');

    expect(controller).toContain('export function createBenchworkController');
    expect(controller).toContain('function normalizeBenchworkOutline(bw)');
    expect(controller).toContain('function hitBenchworkSegment');
    expect(controller).toContain('function finishBenchworkOutline');
  });

  test('freehand annotation behavior is wired through the annotation controller', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'annotation-controller.js'), 'utf8');

    expect(source).toContain("import { createAnnotationController } from './site-planner/annotation-controller.js';");
    expect(source).toContain('} = createAnnotationController({');
    expect(source).toContain('hitAnnotation,');
    expect(source).toContain('drawAnnotations,');
    expect(source).toContain("markDirty('annotations cleared');");

    expect(controller).toContain('export function createAnnotationController');
    expect(controller).toContain('function hitAnnotation');
    expect(controller).toContain('function startAnnotationStroke');
    expect(controller).toContain('function drawAnnotations');
  });

  test('streetlight model behavior is wired through the streetlight controller', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'streetlight-controller.js'), 'utf8');

    expect(source).toContain("import { createStreetlightController } from './site-planner/streetlight-controller.js';");
    expect(source).toContain('} = createStreetlightController({');
    expect(source).toContain('normalizeStreetlight,');
    expect(source).toContain('placeStreetlight,');
    expect(source).toContain('state.streetlights.forEach(drawStreetlight);');

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

    expect(source).toContain("import { createFabricController } from './site-planner/fabric-controller.js';");
    expect(source).toContain('fabricController = createFabricController({');
    expect(source).toContain('if(fabricController) fabricController.initFabricControls();');
    expect(source).toContain('generateFabricForRegion,');
    expect(source).toContain('state.fabricRegions=(p.fabricRegions||[]).map(normalizeFabricRegion);');

    expect(controller).toContain('export function createFabricController');
    expect(controller).toContain('function normalizeFabricRegion(region)');
    expect(controller).toContain('function generateFabricForRegion');
    expect(controller).toContain('function initFabricControls');
  });
});
