import { rad } from './geometry.js';
import { nearestPointOnRoadPath } from './road-geometry.js';
import { roadSurfaceAtPoint } from './road-network.js';

export function createRoadFeatureEditorController({
  state,
  uid,
  mmToPx,
  pxToMm,
  roadPresetScaleContext,
  normalizeRoad,
  applyRoadHatchPreset,
  applyRoadMarkingPreset,
  hatchPresetByKey,
  markingPresetByKey,
  defaultMarkingStandardId,
  clearBuildingSelection = () => {},
  setStatusHint = () => {},
  syncAll = () => {},
}) {
  function normalizeRoadFeature(feature) {
    if (!feature) return feature;
    feature.id = feature.id || uid('roadFeature');
    feature.kind = feature.kind || feature.type || 'manhole';
    feature.x = Number(feature.x) || 0;
    feature.y = Number(feature.y) || 0;
    feature.rotationDeg = Number(feature.rotationDeg) || 0;
    feature.roadId = feature.roadId || null;
    feature.hidden = !!feature.hidden;
    feature.locked = !!feature.locked;
    if (feature.kind === 'manhole') {
      feature.name = feature.name || 'Manhole / Hatch';
      feature.hatchPreset = feature.hatchPreset || 'round600';
      feature.hatchShape = feature.hatchShape || hatchPresetByKey(feature.hatchPreset).shape || 'circle';
      if (!Number.isFinite(Number(feature.diameterMm)) && !Number.isFinite(Number(feature.widthMm))) applyRoadHatchPreset(feature, feature.hatchPreset, roadPresetScaleContext());
      feature.diameterMm = Number.isFinite(Number(feature.diameterMm)) ? Number(feature.diameterMm) : (hatchPresetByKey(feature.hatchPreset).diameterMm || 3);
      feature.widthMm = Number.isFinite(Number(feature.widthMm)) ? Number(feature.widthMm) : (hatchPresetByKey(feature.hatchPreset).widthMm || 4);
      feature.depthMm = Number.isFinite(Number(feature.depthMm)) ? Number(feature.depthMm) : (hatchPresetByKey(feature.hatchPreset).depthMm || 3);
      feature.cutThrough = true;
      feature.exportLayer = 'roadHatchCut';
      feature.color = feature.color || '#3a2b1e';
    } else {
      feature.kind = 'marking';
      feature.name = feature.name || 'Road Marking';
      feature.markingPreset = feature.markingPreset || feature.markingType || 'stopLine';
      const preset = markingPresetByKey(feature.markingPreset);
      feature.markingType = feature.markingType || preset.key;
      feature.markingDraw = feature.markingDraw || preset.draw;
      feature.standard = feature.standard || defaultMarkingStandardId;
      feature.jpName = feature.jpName || preset.jpName;
      feature.markingCategory = feature.markingCategory || preset.category;
      feature.orientationMode = feature.orientationMode || preset.orientationMode || 'parallel';
      feature.laneScope = feature.laneScope || preset.laneScope || 'singleLane';
      feature.widthMm = Number.isFinite(Number(feature.widthMm)) ? Number(feature.widthMm) : preset.widthMm;
      feature.depthMm = Number.isFinite(Number(feature.depthMm)) ? Number(feature.depthMm) : preset.depthMm;
      feature.color = feature.color || preset.color || '#f7f2df';
      if (preset.text && !feature.text) feature.text = preset.text;
      feature.outputMode = feature.outputMode || (feature.cutBehavior === 'paintStencil' ? 'paintStencil' : 'etch');
      if (feature.outputMode === 'paintStencil') {
        feature.visualOnly = false;
        feature.cutBehavior = 'paintStencil';
        feature.exportLayer = 'paintStencilCut';
        feature.stencilMaterialId = feature.stencilMaterialId || 'stencil-stock';
        feature.stencilSpec = {
          marginMm: Number(feature.stencilSpec?.marginMm) || 2,
          bridgeMm: Number.isFinite(Number(feature.stencilSpec?.bridgeMm)) ? Number(feature.stencilSpec.bridgeMm) : 0.35,
        };
      } else {
        feature.visualOnly = true;
        feature.cutBehavior = 'etchOnly';
        feature.exportLayer = 'roadMarkingEtch';
      }
    }
    if (state.pxPerMm) {
      feature.xMm = pxToMm(feature.x);
      feature.yMm = pxToMm(feature.y);
      feature.diameterPx = mmToPx(feature.diameterMm || 3);
      feature.widthPx = mmToPx(feature.widthMm || 4);
      feature.depthPx = mmToPx(feature.depthMm || 1);
    } else {
      feature.diameterPx = Number.isFinite(Number(feature.diameterPx)) ? Number(feature.diameterPx) : 18;
      feature.widthPx = Number.isFinite(Number(feature.widthPx)) ? Number(feature.widthPx) : 30;
      feature.depthPx = Number.isFinite(Number(feature.depthPx)) ? Number(feature.depthPx) : 6;
    }
    return feature;
  }

  function normalizeAngleDeg(value) {
    const n = ((Number(value) % 360) + 360) % 360;
    return n > 180 ? n - 360 : n;
  }

  function roadMarkingRotationFromTangent(feature, tangentRad) {
    const preset = markingPresetByKey(feature.markingPreset || feature.markingType);
    const mode = feature.orientationMode || preset.orientationMode || 'parallel';
    const tangentDeg = tangentRad * 180 / Math.PI;
    if (mode === 'fixed' || mode === 'manual') return Number(feature.rotationDeg) || 0;
    if (mode === 'perpendicular' || mode === 'directional') return normalizeAngleDeg(tangentDeg + 90);
    return normalizeAngleDeg(tangentDeg);
  }

  function positiveNumber(...values) {
    for (const value of values) {
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return null;
  }

  function syncRoadMarkingDimension(feature, key, valueMm) {
    const pxKey = key === 'widthMm' ? 'widthPx' : 'depthPx';
    feature[key] = valueMm;
    feature[pxKey] = state.pxPerMm ? mmToPx(valueMm) : valueMm;
  }

  function roadMarkingRoadWidthMm(road) {
    return positiveNumber(
      road?.widthMm,
      state.pxPerMm && road ? pxToMm(road.widthPx) : null,
      road?.widthPx,
    );
  }

  function fitRoadMarkingToRoad(feature) {
    if (!feature || feature.kind !== 'marking') return false;
    const road = state.roads.find(item => item.id === feature.roadId) || roadSurfaceAtPoint(feature, state.roads, { normalizeRoad });
    if (!road) return false;
    normalizeRoad(road);
    const roadWidthMm = roadMarkingRoadWidthMm(road);
    if (!roadWidthMm) return false;

    const preset = markingPresetByKey(feature.markingPreset || feature.markingType);
    const mode = feature.orientationMode || preset.orientationMode || 'parallel';
    const crossAxisKey = mode === 'parallel' ? 'depthMm' : 'widthMm';
    const currentMm = positiveNumber(feature[crossAxisKey], preset[crossAxisKey]);
    if (!currentMm) return false;

    const maxCrossAxisMm = Math.max(0.25, roadWidthMm * (mode === 'parallel' ? 0.38 : 0.9));
    if (currentMm <= maxCrossAxisMm) return false;

    syncRoadMarkingDimension(feature, crossAxisKey, maxCrossAxisMm);
    feature.roadFitMode = 'road-bounds';
    feature.roadFitAxis = crossAxisKey === 'widthMm' ? 'width' : 'depth';
    feature.roadFitRoadWidthMm = roadWidthMm;
    return true;
  }

  function alignRoadMarkingToRoad(feature) {
    if (!feature || feature.kind !== 'marking') return false;
    const road = state.roads.find(item => item.id === feature.roadId) || roadSurfaceAtPoint(feature, state.roads, { normalizeRoad });
    if (!road) return false;
    const nearest = nearestPointOnRoadPath(feature, normalizeRoad(road), false);
    if (!nearest || !Number.isFinite(Number(nearest.tangent))) return false;
    feature.rotationDeg = roadMarkingRotationFromTangent(feature, nearest.tangent);
    feature.autoAlignedToRoad = true;
    feature.roadAlignmentMode = feature.orientationMode || markingPresetByKey(feature.markingPreset || feature.markingType).orientationMode || 'parallel';
    return true;
  }

  function selectedRoadFeature() {
    return state.roadFeatures.find(feature => feature.id === state.selectedRoadFeatureId) || null;
  }

  function clearRoadFeatureSelection() {
    state.selectedRoadFeatureId = null;
  }

  function hitRoadFeature(point, pointerType = 'mouse') {
    const tolerance = (pointerType === 'touch' ? 14 : 9) / state.view.scale;
    for (let index = state.roadFeatures.length - 1; index >= 0; index--) {
      const feature = normalizeRoadFeature(state.roadFeatures[index]);
      if (feature.hidden) continue;
      const angle = rad(feature.rotationDeg || 0);
      const cos = Math.cos(-angle);
      const sin = Math.sin(-angle);
      const dx = point.x - feature.x;
      const dy = point.y - feature.y;
      const lx = dx * cos - dy * sin;
      const ly = dx * sin + dy * cos;
      if (feature.kind === 'manhole' && feature.hatchShape === 'circle') {
        if (Math.hypot(lx, ly) <= (feature.diameterPx || 18) / 2 + tolerance) return feature;
      } else {
        const halfWidth = (feature.widthPx || 20) / 2 + tolerance;
        const halfDepth = (feature.depthPx || 8) / 2 + tolerance;
        if (Math.abs(lx) <= halfWidth && Math.abs(ly) <= halfDepth) return feature;
      }
    }
    return null;
  }

  function placeRoadFeature(point, kind) {
    const road = roadSurfaceAtPoint(point, state.roads, { normalizeRoad });
    if (!road) {
      setStatusHint('Place road items on a generated road surface.');
      return null;
    }
    const feature = normalizeRoadFeature({ id: uid('roadFeature'), kind, roadId: road.id, x: point.x, y: point.y, rotationDeg: 0 });
    if (kind === 'marking') {
      applyRoadMarkingPreset(feature, state.lastRoadMarkingPreset || 'stopLine', roadPresetScaleContext());
      fitRoadMarkingToRoad(feature);
      alignRoadMarkingToRoad(feature);
    }
    if (kind === 'manhole') applyRoadHatchPreset(feature, state.lastRoadHatchPreset || 'round600', roadPresetScaleContext());
    state.roadFeatures.push(feature);
    state.selectedRoadFeatureId = feature.id;
    state.selectedRoadId = null;
    clearBuildingSelection();
    state.selectedStreetlightId = null;
    state.selectedBenchworkId = null;
    state.selectedAnnotationId = null;
    syncAll();
    return feature;
  }

  function moveRoadFeature(feature, dx, dy) {
    if (!feature || feature.locked) return;
    feature.x += dx;
    feature.y += dy;
    normalizeRoadFeature(feature);
  }

  function deleteSelectedRoadFeature() {
    if (!state.selectedRoadFeatureId) return false;
    state.roadFeatures = state.roadFeatures.filter(feature => feature.id !== state.selectedRoadFeatureId);
    state.selectedRoadFeatureId = null;
    syncAll();
    return true;
  }

  return {
    clearRoadFeatureSelection,
    deleteSelectedRoadFeature,
    hitRoadFeature,
    alignRoadMarkingToRoad,
    fitRoadMarkingToRoad,
    moveRoadFeature,
    normalizeRoadFeature,
    placeRoadFeature,
    selectedRoadFeature,
  };
}
