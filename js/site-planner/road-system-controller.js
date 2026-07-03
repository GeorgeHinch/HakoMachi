import { createRoadExportController } from './road-export.js';
import { createRoadFeatureEditorController } from './road-feature-editor.js';
import { hitRoadCenterlineSegment, hitRoadOutlineSegment, hitRoadPoint, nearestPointOnRoadPath, rebuildRoadGeometry, roadCenterlineSamples, roadEdgePaths, roadHasSidewalk, roadOutlineSamples, roadSidewalkPolygons } from './road-geometry.js';
import { createRoadModelController } from './road-model.js';
import { findRoadConnectionSnap, roadEndpointJunctions, roadJunctionPoints, roadSurfaceAtPoint, setRoadEndpointConnection, snapRoadPointForConnection } from './road-network.js';
import { createRoadRenderer2dController } from './road-renderer-2d.js';

export function createRoadSystemController(deps) {
  const viewScale = () => deps.state?.view?.scale || 1;
  const hitOptions = pointerType => ({ pointerType, viewScale: viewScale() });

  const model = createRoadModelController({
    ...deps,
    hitRoadPoint: (point, road, pointerType) => hitRoadPoint(point, road, hitOptions(pointerType)),
    hitRoadCenterlineSegment: (point, road, pointerType) => hitRoadCenterlineSegment(point, road, hitOptions(pointerType)),
  });

  const features = createRoadFeatureEditorController({
    ...deps,
    normalizeRoad: model.normalizeRoad,
  });

  const renderer = createRoadRenderer2dController({
    ...deps,
    normalizeRoad: model.normalizeRoad,
    normalizeRoadFeature: features.normalizeRoadFeature,
  });

  const exporter = createRoadExportController({
    ...deps,
    normalizeRoad: model.normalizeRoad,
  });

  function finishRoadCenterline() {
    const state = deps.state;
    if (state.roadDraft.length < 2) return;
    const road = model.createRoadCenterlineFromPoints(state.roadDraft);
    state.roads.push(road);
    state.selectedRoadId = road.id;
    deps.clearBuildingSelection?.();
    state.selectedStreetlightId = null;
    state.selectedBenchworkId = null;
    state.selectedAnnotationId = null;
    state.roadDraft = [];
    deps.syncAll?.();
  }

  function finishRoadOutline() {
    const state = deps.state;
    if (state.roadDraft.length < 3) return;
    const road = model.createRoadOutlineFromPoints(state.roadDraft);
    state.roads.push(road);
    state.selectedRoadId = road.id;
    deps.clearBuildingSelection?.();
    state.selectedStreetlightId = null;
    state.selectedBenchworkId = null;
    state.selectedAnnotationId = null;
    state.roadDraft = [];
    deps.syncAll?.();
  }

  function deleteSelectedRoad() {
    const state = deps.state;
    if (!state.selectedRoadId) return false;
    state.roads = state.roads.filter(road => road.id !== state.selectedRoadId);
    state.roadFeatures = state.roadFeatures.filter(feature => feature.roadId !== state.selectedRoadId);
    state.roadOutlineEditId = null;
    state.selectedRoadId = null;
    deps.syncAll?.();
    return true;
  }

  return {
    ...model,
    ...features,
    ...renderer,
    ...exporter,
    deleteSelectedRoad,
    finishRoadCenterline,
    finishRoadOutline,
    findRoadConnectionSnap: (point, excludeRoadId = null, pointerType = 'mouse') => findRoadConnectionSnap(point, deps.state.roads, { excludeRoadId, pointerType, viewScale: viewScale(), normalizeRoad: model.normalizeRoad }),
    hitRoadCenterlineSegment: (point, road, pointerType = 'mouse') => hitRoadCenterlineSegment(point, road, hitOptions(pointerType)),
    hitRoadOutlineSegment: (point, road, pointerType = 'mouse') => hitRoadOutlineSegment(point, road, hitOptions(pointerType)),
    hitRoadPoint: (point, road, pointerType = 'mouse') => hitRoadPoint(point, road, hitOptions(pointerType)),
    nearestPointOnRoadPath,
    rebuildRoadGeometry,
    roadCenterlineSamples,
    roadEdgePaths,
    roadEndpointJunctions: () => roadEndpointJunctions(deps.state.roads, { normalizeRoad: model.normalizeRoad, selectedRoadId: deps.state.selectedRoadId }),
    roadHasSidewalk,
    roadJunctionPoints: () => roadJunctionPoints(deps.state.roads, { normalizeRoad: model.normalizeRoad, selectedRoadId: deps.state.selectedRoadId }),
    roadOutlineSamples,
    roadSidewalkPolygons,
    roadSurfaceAtPoint: point => roadSurfaceAtPoint(point, deps.state.roads, { normalizeRoad: model.normalizeRoad }),
    setRoadEndpointConnection,
    snapRoadPointForConnection: (point, excludeRoadId = null, pointerType = 'mouse') => snapRoadPointForConnection(point, deps.state.roads, { excludeRoadId, pointerType, viewScale: viewScale(), normalizeRoad: model.normalizeRoad }),
  };
}
