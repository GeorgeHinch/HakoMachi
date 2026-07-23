import {
  buildRailCrossingInfillPanels,
  buildRailCrossings,
  hitRailCrossing,
} from './rail-crossing-generator.js';
import { createRailCrossingRenderer2D } from './rail-crossing-renderer-2d.js';

export function createSiteRoadCrossingController({
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
}) {
  function benchworkClipPolygons(perCurve = 24) {
    return (state.benchworkOutlines || [])
      .map(raw => normalizeBenchworkOutline(raw))
      .filter(outline => outline && !outline.hidden)
      .map(outline => benchworkSamples(outline, perCurve))
      .filter(polygon => polygon.length >= 3);
  }

  function withRoadBenchworkClip(drawFn) {
    const clips = state.workspaceMode === 'road' ? [] : benchworkClipPolygons(24);
    if (!clips.length) {
      drawFn();
      return;
    }
    ctx.save();
    ctx.beginPath();
    clips.forEach(polygon => {
      polygon.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
      ctx.closePath();
    });
    ctx.clip();
    drawFn();
    ctx.restore();
  }

  function drawRoadJunctions() {
    return roadSystem.drawRoadJunctions();
  }

  function drawGeneratedRoadIntersections() {
    return roadSystem.drawGeneratedRoadIntersections({ selectedIntersectionKey: state.selectedRoadIntersectionId });
  }

  function drawRoad(road) {
    return roadSystem.drawRoad(road);
  }

  function drawRoadLayer() {
    withRoadBenchworkClip(() => {
      state.roads.forEach(drawRoad);
      drawRoadJunctions();
      drawGeneratedRoadIntersections();
      (state.roadFeatures || []).forEach(drawRoadFeature);
      drawRoadExportPreview();
    });
  }

  function signedAreaForClip(polygon) {
    return (polygon || []).reduce((sum, point, index, points) => {
      const next = points[(index + 1) % points.length] || point;
      return sum + point.x * next.y - next.x * point.y;
    }, 0) / 2;
  }

  function clipPolygonToEdge(subject, a, b, keepLeft = true) {
    if (!Array.isArray(subject) || subject.length < 3) return [];
    const output = [];
    const inside = point => {
      const cross = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x);
      return keepLeft ? cross >= -0.001 : cross <= 0.001;
    };
    const intersection = (point, next) => {
      const dx = next.x - point.x;
      const dy = next.y - point.y;
      const edgeX = b.x - a.x;
      const edgeY = b.y - a.y;
      const denominator = dx * edgeY - dy * edgeX;
      if (Math.abs(denominator) < 1e-9) return next;
      const t = ((a.x - point.x) * edgeY - (a.y - point.y) * edgeX) / denominator;
      return { x: point.x + dx * t, y: point.y + dy * t };
    };
    for (let index = 0; index < subject.length; index++) {
      const current = subject[index];
      const previous = subject[(index + subject.length - 1) % subject.length];
      const currentInside = inside(current);
      const previousInside = inside(previous);
      if (currentInside) {
        if (!previousInside) output.push(intersection(previous, current));
        output.push(current);
      } else if (previousInside) {
        output.push(intersection(previous, current));
      }
    }
    return output.filter((point, index, points) => index === 0 || dist(point, points[index - 1]) > 0.01);
  }

  function isConvexPolygon(polygon) {
    if (!Array.isArray(polygon) || polygon.length < 3) return false;
    let sign = 0;
    for (let index = 0; index < polygon.length; index++) {
      const a = polygon[index];
      const b = polygon[(index + 1) % polygon.length];
      const c = polygon[(index + 2) % polygon.length];
      const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
      if (Math.abs(cross) < 0.001) continue;
      const nextSign = Math.sign(cross);
      if (sign && nextSign !== sign) return false;
      sign = nextSign;
    }
    return true;
  }

  function clipPolygonToBenchwork(polygon, options = {}) {
    if (!Array.isArray(polygon) || polygon.length < 3) return [];
    const clips = benchworkClipPolygons(options.perCurve || 24);
    if (!clips.length) return [polygon];
    const output = [];
    let convexClipCount = 0;
    clips.forEach(rawClip => {
      if (!isConvexPolygon(rawClip)) return;
      convexClipCount++;
      const clip = signedAreaForClip(rawClip) < 0 ? rawClip.slice().reverse() : rawClip.slice();
      let clipped = polygon.slice();
      for (let index = 0; index < clip.length && clipped.length >= 3; index++) {
        clipped = clipPolygonToEdge(clipped, clip[index], clip[(index + 1) % clip.length], true);
      }
      if (clipped.length >= 3 && Math.abs(signedAreaForClip(clipped)) > 0.5) output.push(clipped);
    });
    return convexClipCount ? output : [polygon];
  }

  function roadDisplayPolygons(road, options = {}) {
    const clip = options.clipToBenchwork !== false;
    const roadPolygons = clip
      ? clipPolygonToBenchwork(road.roadPolygonPx || [], options)
      : [road.roadPolygonPx || []].filter(polygon => polygon.length >= 3);
    const sidewalkPolygons = [];
    (road.sidewalkPolygonsPx || []).forEach((sidewalk, sourceIndex) => {
      const polygons = clip
        ? clipPolygonToBenchwork(sidewalk.polygon || [], options)
        : [sidewalk.polygon || []].filter(polygon => polygon.length >= 3);
      polygons.forEach((polygon, pieceIndex) => sidewalkPolygons.push({ ...sidewalk, polygon, sourceIndex, pieceIndex }));
    });
    return { roadPolygons, sidewalkPolygons };
  }

  function shouldClipRoadsToBenchwork() {
    return state.workspaceMode !== 'road';
  }

  function generatedRailCrossings() {
    const crossings = buildRailCrossings({
      roads: (state.roads || []).map(normalizeRoad),
      tracks: (state.tracks || []).map(normalizeTrack),
      roadCenterlineSamples,
      trackPathSamples,
      pxPerMm: state.pxPerMm,
      overrides: state.railCrossingOverrides || {},
    });
    state.generatedRailCrossings = crossings;
    return crossings;
  }

  function railCrossingInfillPanels(crossings = generatedRailCrossings()) {
    const roadWidthPxById = {};
    (state.roads || []).forEach(raw => {
      const road = normalizeRoad(raw);
      roadWidthPxById[road.id] = road.widthPx || 24;
    });
    return buildRailCrossingInfillPanels(crossings, { roadWidthPxById });
  }

  function roadIntersectionKey(intersection) {
    return intersection?.overrideKey || intersection?.id || '';
  }

  function generatedRoadIntersections() {
    return roadSystem.generatedRoadIntersections();
  }

  function hasOtherSelection(excludedSelectionId) {
    return selectedSiteObjectCount()
      || state.selectedId
      || currentSelectedBuildingIds().length
      || state.selectedAnnotationId
      || state.selectedRoadFeatureId
      || state.selectedRoadId
      || state.selectedTrackId
      || state.selectedTrackAccessoryId
      || state.selectedBenchworkId
      || state.selectedStreetlightId
      || state.selectedFabricId
      || state.selectedStlObjectId
      || (excludedSelectionId === 'roadIntersection' ? state.selectedRailCrossingId : state.selectedRoadIntersectionId);
  }

  function selectedRoadIntersection() {
    const id = state.selectedRoadIntersectionId;
    if (!id || hasOtherSelection('roadIntersection')) return null;
    return generatedRoadIntersections().find(intersection => roadIntersectionKey(intersection) === id) || null;
  }

  function clearRoadAndRailSelection() {
    clearBuildingSelection();
    clearSelectedSiteObjects();
    state.selectedRoadId = null;
    state.selectedRoadFeatureId = null;
    state.selectedTrackId = null;
    state.selectedTrackPointIndex = null;
    state.selectedTrackAccessoryId = null;
    state.selectedBenchworkId = null;
    state.selectedStreetlightId = null;
    state.selectedAnnotationId = null;
    state.selectedFabricId = null;
    state.selectedStlObjectId = null;
  }

  function refreshRoadAndRailSelection() {
    renderList();
    renderRoads();
    renderStreetlights();
    renderSelected();
    draw();
  }

  function selectRoadIntersection(intersection) {
    if (!intersection) return false;
    clearRoadAndRailSelection();
    state.selectedRailCrossingId = null;
    state.selectedRoadIntersectionId = roadIntersectionKey(intersection);
    refreshRoadAndRailSelection();
    return true;
  }

  function hitGeneratedRoadIntersection(point, pointerType = 'mouse') {
    if (state.roadIntersectionDetails === false) return null;
    const baseTolerance = (pointerType === 'touch' ? 18 : 10) / state.view.scale;
    let best = null;
    generatedRoadIntersections().forEach(intersection => {
      const center = intersection.center || intersection;
      if (!center) return;
      const tolerance = Math.max(baseTolerance, Math.min(24 / state.view.scale, (intersection.maxRoadWidthPx || 24) * 0.32));
      const distance = dist(point, center);
      if (distance <= tolerance && (!best || distance < best.distance)) best = { intersection, distance };
    });
    return best?.intersection || null;
  }

  function selectedRailCrossing() {
    const id = state.selectedRailCrossingId;
    if (!id || hasOtherSelection('railCrossing')) return null;
    return generatedRailCrossings().find(crossing => crossing.id === id || crossing.key === id) || null;
  }

  function selectRailCrossing(crossing) {
    if (!crossing) return false;
    clearRoadAndRailSelection();
    state.selectedRoadIntersectionId = null;
    state.selectedRailCrossingId = crossing.key || crossing.id;
    refreshRoadAndRailSelection();
    return true;
  }

  function hitGeneratedRailCrossing(point, pointerType = 'mouse') {
    const tolerance = (pointerType === 'touch' ? 18 : 10) / state.view.scale;
    return hitRailCrossing(point, generatedRailCrossings(), tolerance);
  }

  let railCrossingRenderer2D = null;
  function ensureRailCrossingRenderer2D() {
    if (!railCrossingRenderer2D) {
      railCrossingRenderer2D = createRailCrossingRenderer2D({ ctx, state, drawLabel, generatedRailCrossings, railCrossingInfillPanels });
    }
    return railCrossingRenderer2D;
  }

  function drawGeneratedRailCrossings() {
    return ensureRailCrossingRenderer2D().drawGeneratedRailCrossings();
  }

  return Object.freeze({
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
  });
}
