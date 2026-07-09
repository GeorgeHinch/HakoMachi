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
    const start = source.indexOf('function buildSite3DTrackSwitchItem');
    const end = source.indexOf('function buildSite3DTrackBufferItem');
    const renderer = source.slice(start, end);

    expect(renderer).toContain('TRACK_PROFILE_DEFAULTS.railColor');
    expect(renderer).toContain('TRACK_PROFILE_DEFAULTS.tieColor');
    expect(renderer).toContain('TRACK_PROFILE_DEFAULTS.roadbedHeightMm');
    expect(renderer).toContain('const railBase=sleeperBase+sleeperHeight');
    expect(renderer).toContain('addLocalSegment(branch[i],branch[i+1]');
    expect(renderer).not.toContain('geom.roadbedWidth/2');
  });

  test('crossing equipment track items route to dedicated 3D model builders', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const start = source.indexOf('function buildSite3DCrossingSignalItem');
    const end = source.indexOf('function buildSite3DTrackAccessoryGroup');
    const renderer = source.slice(start, end);
    const switchboard = source.slice(end, source.indexOf('function site3DWindowColumns'));

    expect(renderer).toContain('Japanese crossing buck diagonal plate A');
    expect(renderer).toContain('Japanese crossing striped barrier arm');
    expect(renderer).toContain("crossA.rotation.z=rad(36)");
    expect(renderer).toContain("crossB.rotation.z=rad(-36)");
    expect(renderer).toContain('Crossing arm direction indicator panel');
    expect(renderer).toContain("stripe.rotation.z=rad(-28)");
    expect(renderer).toContain('HB-type level crossing obstruction detector grey sensor housing');
    expect(renderer).toContain('HB-type intrusion detector obstruction detection beam');
    expect(renderer).toContain('addDetectorHead();');
    expect(renderer).not.toContain('addDetectorHead(-8,1)');
    expect(renderer).not.toContain('addDetectorHead(8,-1)');
    expect(switchboard).toContain("item.kind==='signal' || item.kind==='occupancyLight'");
    expect(switchboard).toContain('buildSite3DCrossingSignalItem(item,bounds)');
    expect(switchboard).toContain("item.kind==='crossingArm'");
    expect(switchboard).toContain('buildSite3DCrossingArmItem(item,bounds)');
    expect(switchboard).toContain("item.kind==='intrusionDetector'");
    expect(switchboard).toContain('buildSite3DIntrusionDetectorItem(item,bounds)');
  });

  test('site planner 3D objects carry selection tags and route clicks to property panes', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const tagsStart = source.indexOf('function tagSite3DBuilding');
    const tagsEnd = source.indexOf('function buildSite3DCatenaryItem');
    const tagHelpers = source.slice(tagsStart, tagsEnd);
    const pickerStart = source.indexOf('function site3DHitSelectionData');
    const pickerEnd = source.indexOf('function updateSite3D(options={})');
    const picker = source.slice(pickerStart, pickerEnd);

    expect(tagHelpers).toContain('sitePlannerRoadId');
    expect(tagHelpers).toContain('sitePlannerTrackId');
    expect(source).toContain('tagSite3DRoadObject(site3DAddFlatPolygon');
    expect(source).toContain('tagSite3DTrackObject(site3DAddRaisedPolygon');
    expect(source).toContain('tagSite3DTrackObject(site3DAddBoxSegments');
    expect(picker).toContain("return {type:'trackAccessory'");
    expect(picker).toContain("return {type:'roadFeature'");
    expect(picker).toContain("return {type:'stlObject'");
    expect(picker).toContain("return {type:'building'");
    expect(picker).toContain("return {type:'track'");
    expect(picker).toContain("return {type:'road'");
    expect(picker).toContain('state.selectedRoadFeatureId=feature.id');
    expect(picker).toContain('updateSite3D({preserveCamera:true})');
  });

  test('site planner 3D refreshes preserve camera during property syncs', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const syncStart = source.indexOf('function syncAll(opts = {})');
    const syncEnd = source.indexOf('function syncSelectedBuildingLive');
    const syncAll = source.slice(syncStart, syncEnd);
    const updateStart = source.indexOf('function updateSite3D(options={})');
    const updateEnd = source.indexOf('function setSite3DMode');
    const updateSite3D = source.slice(updateStart, updateEnd);
    const modeStart = source.indexOf('function setSite3DMode(on)');
    const modeEnd = source.indexOf('function bindSite3DButtons');
    const setSite3DMode = source.slice(modeStart, modeEnd);

    expect(syncAll).toContain("if(state.viewMode==='3d') updateSite3D({preserveCamera:true})");
    expect(syncAll).not.toContain('updateSite3D();');
    expect(setSite3DMode).toContain("updateSite3D({preserveCamera:site3d.initialized})");
    expect(setSite3DMode).not.toContain('updateSite3D();');
    expect(updateSite3D).toContain('const hadCamera=!!(site3d.initialized && site3d.camera)');
    expect(updateSite3D).toContain('options.preserveCamera!==false && hadCamera');
  });

  test('Tomix track accessories fall back to the flex-track gauge scale', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const start = source.indexOf('function defaultTrackAccessoryPxPerMm');
    const end = source.indexOf('function tomixBufferGeometry');
    const scaleHelpers = source.slice(start, end);

    expect(scaleHelpers).toContain('TRACK_PROFILE_DEFAULTS.gaugeMm');
    expect(scaleHelpers).toContain('return 10 /');
    expect(scaleHelpers).not.toContain('return 0.32');
  });

  test('track switch labels are anchored away from the rotation handle', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const labelStart = source.indexOf('function trackAccessoryLabelPoint');
    const labelEnd = source.indexOf('function selectTrackAccessory');
    const labelHelper = source.slice(labelStart, labelEnd);
    const drawStart = source.indexOf('function drawTrackAccessory');
    const drawEnd = source.indexOf('function renderRoads');
    const drawHelper = source.slice(drawStart, drawEnd);

    expect(labelHelper).toContain('isTrackSwitchAccessoryKind');
    expect(labelHelper).toContain('maxY+24*scale');
    expect(drawHelper).toContain('drawLabel(item.name||trackAccessoryLabel(item.kind),trackAccessoryLabelPoint(item))');
    expect(drawHelper).not.toContain('drawLabel(item.name||trackAccessoryLabel(item.kind),{x:item.x+12*scale,y:item.y-12*scale})');
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
});
