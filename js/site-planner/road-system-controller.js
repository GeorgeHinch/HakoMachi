import { createRoadAdapterController } from './road-adapter-controller.js';
import { createRoadDeleteController } from './road-delete-controller.js';
import { createRoadDraftController } from './road-draft-controller.js';
import { createRoadExportController } from './road-export.js';
import { createRoadFeatureEditorController } from './road-feature-editor.js';
import { hitRoadCenterlineSegment, hitRoadPoint } from './road-geometry.js';
import { drawRoadIntersections } from './road-intersection-preview-renderer.js';
import { serializeRoadIntersections } from './road-intersection-svg-export.js';
import { buildRoadIntersections, intersectionSummary } from './road-intersections.js';
import { createRoadModelController } from './road-model.js';
import { createRoadRenderer2dController } from './road-renderer-2d.js';

export function createRoadSystemController(deps) {
  const viewScale = () => deps.state?.view?.scale || 1;
  const hitOptions = pointerType => ({ pointerType, viewScale: viewScale() });

  const model = createRoadModelController({
    ...deps,
    hitRoadPoint: (point, road, pointerType) => hitRoadPoint(point, road, hitOptions(pointerType)),
    hitRoadCenterlineSegment: (point, road, pointerType) => hitRoadCenterlineSegment(point, road, hitOptions(pointerType)),
  });

  const adapter = createRoadAdapterController({
    state: deps.state,
    normalizeRoad: model.normalizeRoad,
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

  const draft = createRoadDraftController({
    state: deps.state,
    createRoadCenterlineFromPoints: model.createRoadCenterlineFromPoints,
    createRoadOutlineFromPoints: model.createRoadOutlineFromPoints,
    clearBuildingSelection: deps.clearBuildingSelection,
    syncAll: deps.syncAll,
  });

  const deletion = createRoadDeleteController({
    state: deps.state,
    syncAll: deps.syncAll,
  });

  function generatedRoadIntersections(options = {}) {
    if (deps.state.roadIntersectionDetails === false) {
      deps.state.generatedRoadIntersections = [];
      return [];
    }
    const intersections = buildRoadIntersections(deps.state.roads, {
      normalizeRoad: model.normalizeRoad,
      ...options,
    });
    deps.state.generatedRoadIntersections = intersections;
    return intersections;
  }

  function drawGeneratedRoadIntersections(options = {}) {
    if (!deps.ctx || deps.state.roadIntersectionDetails === false) return null;
    const intersections = generatedRoadIntersections(options);
    return drawRoadIntersections(deps.ctx, intersections, {
      viewScale: deps.state.view?.scale || 1,
      showLabels: false,
      ...options,
    });
  }

  function generatedRoadIntersectionSvgRecords(options = {}) {
    return serializeRoadIntersections(generatedRoadIntersections(options), options);
  }

  return {
    ...model,
    ...adapter,
    ...features,
    ...renderer,
    ...exporter,
    ...draft,
    ...deletion,
    drawGeneratedRoadIntersections,
    generatedRoadIntersectionSvgRecords,
    generatedRoadIntersections,
    intersectionSummary,
  };
}
