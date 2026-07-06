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
