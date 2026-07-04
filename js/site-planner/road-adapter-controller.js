import { hitRoadCenterlineSegment, hitRoadOutlineSegment, hitRoadPoint, nearestPointOnRoadPath, rebuildRoadGeometry, roadCenterlineSamples, roadEdgePaths, roadHasSidewalk, roadOutlineSamples, roadSidewalkPolygons } from './road-geometry.js';
import { findRoadConnectionSnap, roadEndpointJunctions, roadJunctionPoints, roadSurfaceAtPoint, setRoadEndpointConnection, snapRoadPointForConnection } from './road-network.js';

export function createRoadAdapterController({
  state,
  normalizeRoad,
}) {
  const viewScale = () => state?.view?.scale || 1;
  const hitOptions = pointerType => ({ pointerType, viewScale: viewScale() });

  return {
    findRoadConnectionSnap: (point, excludeRoadId = null, pointerType = 'mouse') => findRoadConnectionSnap(point, state.roads, { excludeRoadId, pointerType, viewScale: viewScale(), normalizeRoad }),
    hitRoadCenterlineSegment: (point, road, pointerType = 'mouse') => hitRoadCenterlineSegment(point, road, hitOptions(pointerType)),
    hitRoadOutlineSegment: (point, road, pointerType = 'mouse') => hitRoadOutlineSegment(point, road, hitOptions(pointerType)),
    hitRoadPoint: (point, road, pointerType = 'mouse') => hitRoadPoint(point, road, hitOptions(pointerType)),
    nearestPointOnRoadPath,
    rebuildRoadGeometry,
    roadCenterlineSamples,
    roadEdgePaths,
    roadEndpointJunctions: () => roadEndpointJunctions(state.roads, { normalizeRoad, selectedRoadId: state.selectedRoadId }),
    roadHasSidewalk,
    roadJunctionPoints: () => roadJunctionPoints(state.roads, { normalizeRoad, selectedRoadId: state.selectedRoadId }),
    roadOutlineSamples,
    roadSidewalkPolygons,
    roadSurfaceAtPoint: point => roadSurfaceAtPoint(point, state.roads, { normalizeRoad }),
    setRoadEndpointConnection,
    snapRoadPointForConnection: (point, excludeRoadId = null, pointerType = 'mouse') => snapRoadPointForConnection(point, state.roads, { excludeRoadId, pointerType, viewScale: viewScale(), normalizeRoad }),
  };
}
