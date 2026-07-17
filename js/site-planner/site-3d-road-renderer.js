import { buildRoadMarkingShapes } from './road-marking-shapes.js';

export function createSite3DRoadRenderer({
  THREE,
  state,
  normalizeRoad,
  syncRoadMetrics,
  roadDisplayPolygons,
  shouldClipRoadsToBenchwork,
  clipPolygonToBenchwork,
  site3DAddFlatPolygon,
  normalizeRoadFeature,
  isSiteObjectSelected,
  tagSite3DRoadObject,
  tagSite3DRoadFeatureObject,
  roadSystem,
  markingPresetByKey,
  rad,
}) {
  function roadOverlayPolygons(polygons) {
    const valid = (polygons || []).filter(poly => Array.isArray(poly) && poly.length >= 3);
    if (!shouldClipRoadsToBenchwork()) return valid;
    return valid.flatMap(poly => clipPolygonToBenchwork(poly, { perCurve: 24 }));
  }

  function roadOverlayMaterial(color, fallback, options = {}) {
    return new THREE.MeshBasicMaterial({
      color: color || fallback,
      side: THREE.DoubleSide,
      transparent: false,
      opacity: 1,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: options.polygonOffsetFactor ?? -6,
      polygonOffsetUnits: options.polygonOffsetUnits ?? -6,
    });
  }

  function roadOverlayLineMaterial(color, opacity = 0.96) {
    return new THREE.LineBasicMaterial({
      color: color || 0xf7f2df,
      transparent: true,
      opacity,
      depthTest: true,
      depthWrite: false,
    });
  }

  function roadFeatureWorldMarkingPolygons(feature) {
    const width = feature.widthPx || 30;
    const depth = feature.depthPx || 6;
    const preset = {
      ...markingPresetByKey(feature.markingPreset || feature.markingType),
      ...feature,
      widthMm: width,
      depthMm: depth,
    };
    return buildRoadMarkingShapes(preset, { x: feature.x, y: feature.y, angle: rad(feature.rotationDeg || 0) })
      .filter(shape => shape.type !== 'text')
      .map(shape => shape.points || [])
      .filter(poly => poly.length >= 3);
  }

  function roadFeatureWorldFixturePolygons(feature) {
    if (feature.kind !== 'manhole') return [];
    const angle = rad(feature.rotationDeg || 0);
    const transformPoint = point => {
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      return { x: feature.x + point.x * c - point.y * s, y: feature.y + point.x * s + point.y * c };
    };
    if (feature.hatchShape === 'circle') {
      const radius = (feature.diameterPx || feature.widthPx || 18) / 2;
      return [Array.from({ length: 32 }, (_, index) => {
        const a = index / 32 * Math.PI * 2;
        return { x: feature.x + Math.cos(a) * radius, y: feature.y + Math.sin(a) * radius };
      })];
    }
    const w = (feature.widthPx || 24) / 2;
    const d = (feature.depthPx || 18) / 2;
    return [[{ x: -w, y: -d }, { x: w, y: -d }, { x: w, y: d }, { x: -w, y: d }].map(transformPoint)];
  }

  function addRoadOverlayPolygons(group, polygons, material, lineMaterial, name, y, tagFn) {
    roadOverlayPolygons(polygons).forEach((polygon, index) => {
      const mesh = site3DAddFlatPolygon(group, polygon, material, lineMaterial, `${name} ${index + 1}`, y);
      tagFn?.(mesh);
    });
  }

  function addRoadFeatures(group) {
    (state.roadFeatures || []).forEach(raw => {
      const feature = normalizeRoadFeature(raw);
      if (!feature || feature.hidden) return;
      const selected = feature.id === state.selectedRoadFeatureId || isSiteObjectSelected('roadFeature', feature.id);
      const color = selected ? '#d95f24' : (feature.color || (feature.kind === 'manhole' ? '#3a2b1e' : '#f7f2df'));
      const material = roadOverlayMaterial(color, feature.kind === 'manhole' ? 0x3a2b1e : 0xf7f2df);
      const lineMaterial = roadOverlayLineMaterial(selected ? 0xd95f24 : (feature.kind === 'manhole' ? 0x1d1712 : 0xf7f2df), selected ? 1 : 0.92);
      const polygons = feature.kind === 'manhole' ? roadFeatureWorldFixturePolygons(feature) : roadFeatureWorldMarkingPolygons(feature);
      addRoadOverlayPolygons(group, polygons, material, lineMaterial, feature.name || 'Road item', 0.17, mesh => tagSite3DRoadFeatureObject(mesh, feature));
    });
  }

  function addGeneratedRoadIntersections(group) {
    const whiteMaterial = roadOverlayMaterial(0xf7f2df, 0xf7f2df, { polygonOffsetFactor: -7, polygonOffsetUnits: -7 });
    const whiteLineMaterial = roadOverlayLineMaterial(0xf7f2df, 0.96);
    const tactileMaterial = roadOverlayMaterial(0xd8b95a, 0xd8b95a, { polygonOffsetFactor: -8, polygonOffsetUnits: -8 });
    const tactileLineMaterial = roadOverlayLineMaterial(0x8c6a2f, 0.92);
    roadSystem.generatedRoadIntersections().forEach(intersection => {
      (intersection.crosswalks || []).forEach((crosswalk, crosswalkIndex) => {
        (crosswalk.stripes || []).forEach((stripe, stripeIndex) => {
          addRoadOverlayPolygons(group, [stripe.corners || []], whiteMaterial, whiteLineMaterial, `Generated crosswalk stripe ${crosswalkIndex + 1}.${stripeIndex + 1}`, 0.18);
        });
      });
      (intersection.stopBars || []).forEach((stopBar, index) => {
        addRoadOverlayPolygons(group, [stopBar.corners || []], whiteMaterial, whiteLineMaterial, `Generated stop bar ${index + 1}`, 0.181);
      });
      (intersection.tactilePavers || []).forEach((paver, index) => {
        addRoadOverlayPolygons(group, [paver.corners || []], tactileMaterial, tactileLineMaterial, `Generated tactile paver ${index + 1}`, 0.19);
      });
    });
  }

  function buildSite3DRoadGroup() {
    const group = new THREE.Group();
    group.name = 'Site Planner roads';
    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x6f6a5e, roughness: 0.92, metalness: 0, transparent: false, opacity: 1, depthTest: true, depthWrite: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    const sidewalkMaterial = new THREE.MeshStandardMaterial({ color: 0xd9ceb4, roughness: 0.9, metalness: 0, transparent: false, opacity: 1, depthTest: true, depthWrite: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    const roadLineMaterial = new THREE.LineBasicMaterial({ color: 0x4d4a42, transparent: true, opacity: 0.72 });
    const sidewalkLineMaterial = new THREE.LineBasicMaterial({ color: 0x9d8d6a, transparent: true, opacity: 0.62 });
    state.roads.forEach(raw => {
      const road = normalizeRoad(raw);
      syncRoadMetrics(road);
      const display = roadDisplayPolygons(road, { perCurve: 32, clipToBenchwork: shouldClipRoadsToBenchwork() });
      display.roadPolygons.forEach((polygon, index) => {
        tagSite3DRoadObject(site3DAddFlatPolygon(group, polygon, roadMaterial, roadLineMaterial, `${road.name || 'Road'} surface ${index + 1}`, 0.08), road);
      });
      display.sidewalkPolygons.forEach((sidewalk, index) => {
        tagSite3DRoadObject(site3DAddFlatPolygon(group, sidewalk.polygon || [], sidewalkMaterial, sidewalkLineMaterial, `${road.name || 'Road'} sidewalk ${index + 1}`, 0.09), road);
      });
    });
    addGeneratedRoadIntersections(group);
    addRoadFeatures(group);
    return group.children.length ? group : null;
  }

  return {
    addGeneratedRoadIntersections,
    addRoadFeatures,
    buildSite3DRoadGroup,
    roadFeatureWorldFixturePolygons,
    roadFeatureWorldMarkingPolygons,
    roadOverlayMaterial,
  };
}
