export function createBuildingInteractionModel({ state, visibleBuildingPolygons, pointInPoly, buildingPoints, buildingCenter, distanceToSegment, dist, matchMediaFn }) {
  function isCoarsePointer(pointerType) {
    return pointerType === 'pen' || pointerType === 'touch' || matchMediaFn('(pointer: coarse)').matches;
  }

  function pointInBuilding(point, building) {
    if (building.hidden) return false;
    return visibleBuildingPolygons(building).some(points => points.length >= 3 && pointInPoly(point, points));
  }

  function polyEdgeDistance(point, points) {
    if (!points || points.length < 2) return Infinity;
    let best = Infinity;
    for (let index = 0; index < points.length; index++) {
      best = Math.min(best, distanceToSegment(point, points[index], points[(index + 1) % points.length]));
    }
    return best;
  }

  function lockedHitTolerance(pointerType = 'mouse') {
    return (isCoarsePointer(pointerType) ? 18 : 9) / state.view.scale;
  }

  function hitBuildingSelectable(point, building, pointerType = 'mouse') {
    if (!building || building.hidden) return false;
    if (!building.locked) return pointInBuilding(point, building);
    const points = buildingPoints(building);
    return !!points?.length && polyEdgeDistance(point, points) <= lockedHitTolerance(pointerType);
  }

  function hitTest(point, pointerType = 'mouse') {
    for (let index = state.buildings.length - 1; index >= 0; index--) {
      if (hitBuildingSelectable(point, state.buildings[index], pointerType)) return state.buildings[index];
    }
    return null;
  }

  function rotateHandlePoint(building) {
    const points = buildingPoints(building);
    if (!points.length) return buildingCenter(building);
    const center = buildingCenter(building);
    let top = points[0];
    points.forEach(point => { if (point.y < top.y) top = point; });
    const radius = Math.max(28 / state.view.scale, Math.max(...points.map(point => dist(center, point))) + 22 / state.view.scale);
    const angle = Math.atan2(top.y - center.y, top.x - center.x) - Math.PI / 10;
    return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
  }

  function rotationZoneHit(point, building, pointerType = 'mouse') {
    const points = buildingPoints(building);
    if (!points.length) return false;
    const nearMin = (isCoarsePointer(pointerType) ? 8 : 5) / state.view.scale;
    const nearMax = (isCoarsePointer(pointerType) ? 42 : 30) / state.view.scale;
    return !pointInPoly(point, points) && polyEdgeDistance(point, points) >= nearMin && polyEdgeDistance(point, points) <= nearMax;
  }

  function handleAt(point, building, pointerType = 'mouse') {
    if (!building || building.locked) return null;
    const size = (isCoarsePointer(pointerType) ? 18 : 9) / state.view.scale;
    const points = buildingPoints(building);
    const type = building.padType === 'polygon' ? 'polyPoint' : 'rectCorner';
    for (let index = 0; index < points.length; index++) if (dist(point, points[index]) < size) return { type, index };
    if (dist(point, rotateHandlePoint(building)) < size * 1.5 || rotationZoneHit(point, building, pointerType)) return { type: 'rotate' };
    return null;
  }

  return Object.freeze({ pointInBuilding, lockedHitTolerance, hitBuildingSelectable, hitTest, polyEdgeDistance, rotateHandlePoint, rotationZoneHit, handleAt });
}
