const DEFAULT_LAYER_NAMES = Object.freeze({
  crosswalk: 'roadMarkingEtch',
  stopBar: 'roadMarkingEtch',
  tactile: 'roadTactileEtch',
  curbGuide: 'roadCurbGuide',
});

function finitePoint(point) {
  return point && Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y));
}

function fmt(value, precision = 3) {
  const number = Number(value) || 0;
  return Number(number.toFixed(precision)).toString();
}

export function polygonPath(points = []) {
  const clean = points.filter(finitePoint);
  if (!clean.length) return '';
  return `M ${fmt(clean[0].x)} ${fmt(clean[0].y)} ${clean.slice(1).map(point => `L ${fmt(point.x)} ${fmt(point.y)}`).join(' ')} Z`;
}

export function linePath(a, b) {
  if (!finitePoint(a) || !finitePoint(b)) return '';
  return `M ${fmt(a.x)} ${fmt(a.y)} L ${fmt(b.x)} ${fmt(b.y)}`;
}

export function arcGuidePath(guide) {
  if (!guide || !finitePoint(guide.center) || !Number.isFinite(Number(guide.radiusPx))) return '';
  const radius = Math.max(0, Number(guide.radiusPx) || 0);
  if (!radius) return '';
  const start = Number(guide.startAngle) || 0;
  const end = Number(guide.endAngle) || 0;
  const p1 = {
    x: guide.center.x + Math.cos(start) * radius,
    y: guide.center.y + Math.sin(start) * radius,
  };
  const p2 = {
    x: guide.center.x + Math.cos(end) * radius,
    y: guide.center.y + Math.sin(end) * radius,
  };
  const delta = Math.abs(end - start);
  const largeArc = delta > Math.PI ? 1 : 0;
  return `M ${fmt(p1.x)} ${fmt(p1.y)} A ${fmt(radius)} ${fmt(radius)} 0 ${largeArc} 1 ${fmt(p2.x)} ${fmt(p2.y)}`;
}

function svgStyle(style = {}) {
  return Object.entries(style)
    .filter(([, value]) => value != null && value !== '')
    .map(([key, value]) => `${key}="${String(value).replace(/"/g, '&quot;')}"`)
    .join(' ');
}

function makeElement(record, options = {}) {
  const includeStyle = options.includeStyle !== false;
  const attrs = {
    d: record.d,
    'data-road-id': record.roadId || '',
    'data-intersection-id': record.intersectionId || '',
    'data-feature-type': record.type || '',
    'data-layer': record.layer || '',
    'data-lane-side': record.laneSide || '',
    'data-lane-scope': record.laneScope || '',
    'data-driving-side': record.drivingSide || '',
    ...(includeStyle ? record.style : {}),
  };
  const attrText = svgStyle(attrs);
  return `<path ${attrText}/>`;
}

function addRecord(records, record) {
  if (!record?.d) return;
  records.push(record);
}

function defaultStyleFor(type) {
  if (type === 'tactile') {
    return { fill: '#d8b95a', stroke: '#8c6a2f', 'stroke-width': 0.25 };
  }
  if (type === 'curbGuide') {
    return { fill: 'none', stroke: '#8a765f', 'stroke-width': 0.2, 'stroke-dasharray': '2 1' };
  }
  return { fill: '#f7f2df', stroke: '#f7f2df', 'stroke-width': 0.15 };
}

export function serializeIntersectionCrosswalks(intersection, options = {}) {
  const layer = options.layerNames?.crosswalk || DEFAULT_LAYER_NAMES.crosswalk;
  const style = { ...defaultStyleFor('crosswalk'), ...(options.styles?.crosswalk || {}) };
  const records = [];
  (intersection.crosswalks || []).forEach((crosswalk, crosswalkIndex) => {
    (crosswalk.stripes || []).forEach((stripe, stripeIndex) => {
      addRecord(records, {
        type: 'crosswalkStripe',
        layer,
        intersectionId: intersection.id,
        roadId: crosswalk.roadId,
        endpoint: crosswalk.endpoint,
        index: `${crosswalkIndex}.${stripeIndex}`,
        d: polygonPath(stripe.corners),
        style,
      });
    });
  });
  return records;
}

export function serializeIntersectionStopBars(intersection, options = {}) {
  const layer = options.layerNames?.stopBar || DEFAULT_LAYER_NAMES.stopBar;
  const style = { ...defaultStyleFor('stopBar'), ...(options.styles?.stopBar || {}) };
  return (intersection.stopBars || []).map((stopBar, index) => ({
    type: 'stopBar',
    layer,
    intersectionId: intersection.id,
    roadId: stopBar.roadId,
    endpoint: stopBar.endpoint,
    index,
    laneSide: stopBar.laneSide,
    laneScope: stopBar.laneScope,
    drivingSide: stopBar.drivingSide,
    d: polygonPath(stopBar.corners),
    style,
  })).filter(record => record.d);
}

export function serializeIntersectionTactilePavers(intersection, options = {}) {
  const layer = options.layerNames?.tactile || DEFAULT_LAYER_NAMES.tactile;
  const style = { ...defaultStyleFor('tactile'), ...(options.styles?.tactile || {}) };
  return (intersection.tactilePavers || []).map((paver, index) => ({
    type: 'tactilePaver',
    layer,
    intersectionId: intersection.id,
    roadId: paver.roadId,
    endpoint: paver.endpoint,
    index,
    d: polygonPath(paver.corners),
    style,
  })).filter(record => record.d);
}

export function serializeIntersectionCurbGuides(intersection, options = {}) {
  if (options.includeCurbGuides === false) return [];
  const layer = options.layerNames?.curbGuide || DEFAULT_LAYER_NAMES.curbGuide;
  const style = { ...defaultStyleFor('curbGuide'), ...(options.styles?.curbGuide || {}) };
  return (intersection.curbReturns || []).map((guide, index) => ({
    type: 'curbGuide',
    layer,
    intersectionId: intersection.id,
    roadId: guide.fromRoadId,
    endpoint: guide.fromEndpoint,
    index,
    d: arcGuidePath(guide),
    style,
  })).filter(record => record.d);
}

export function serializeRoadIntersection(intersection, options = {}) {
  return [
    ...serializeIntersectionCrosswalks(intersection, options),
    ...serializeIntersectionStopBars(intersection, options),
    ...serializeIntersectionTactilePavers(intersection, options),
    ...serializeIntersectionCurbGuides(intersection, options),
  ];
}

export function serializeRoadIntersections(intersections = [], options = {}) {
  return intersections.flatMap(intersection => serializeRoadIntersection(intersection, options));
}

export function groupIntersectionSvgRecordsByLayer(records = []) {
  return records.reduce((groups, record) => {
    const layer = record.layer || 'roadMarkingEtch';
    if (!groups[layer]) groups[layer] = [];
    groups[layer].push(record);
    return groups;
  }, {});
}

export function renderIntersectionSvgElements(records = [], options = {}) {
  return records.map(record => makeElement(record, options)).join('\n');
}

export function renderIntersectionSvgGroups(records = [], options = {}) {
  const groups = groupIntersectionSvgRecordsByLayer(records);
  return Object.entries(groups).map(([layer, layerRecords]) => {
    const body = renderIntersectionSvgElements(layerRecords, options);
    return `<g id="${layer}" data-layer="${layer}">\n${body}\n</g>`;
  }).join('\n');
}

export function createRoadIntersectionSvgSerializer(options = {}) {
  return {
    polygonPath,
    linePath,
    arcGuidePath,
    serializeRoadIntersection: intersection => serializeRoadIntersection(intersection, options),
    serializeRoadIntersections: intersections => serializeRoadIntersections(intersections, options),
    groupIntersectionSvgRecordsByLayer,
    renderIntersectionSvgElements: records => renderIntersectionSvgElements(records, options),
    renderIntersectionSvgGroups: records => renderIntersectionSvgGroups(records, options),
  };
}
