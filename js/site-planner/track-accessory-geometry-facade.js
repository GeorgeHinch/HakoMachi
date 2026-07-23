export function createTrackAccessoryGeometryFacade({ getGeometry, getRenderer, ctx }) {
  const geometry = () => getGeometry();

  function trackAccessoryPreset(kind) { return geometry().trackAccessoryPreset(kind); }
  function trackAccessoryLabel(kind) { return geometry().trackAccessoryLabel(kind); }
  function isTrackAccessoryAction(action) { return geometry().isTrackAccessoryAction(action); }
  function isCatenaryAccessoryKind(kind) { return geometry().isCatenaryAccessoryKind(kind); }
  function isTrackSwitchAccessoryKind(kind) { return geometry().isTrackSwitchAccessoryKind(kind); }
  function isTrackBufferAccessoryKind(kind) { return geometry().isTrackBufferAccessoryKind(kind); }
  function trackBufferHasCatenaryTerminal(item) { return geometry().trackBufferHasCatenaryTerminal(item); }
  function defaultTrackAccessoryPxPerMm() { return geometry().defaultTrackAccessoryPxPerMm(); }
  function trackAccessoryPxPerMm(item) { return geometry().trackAccessoryPxPerMm(item); }
  function trackBufferPxPerMm(item) { return geometry().trackBufferPxPerMm(item); }
  function tomixBufferGeometry(scale = 1) { return geometry().tomixBufferGeometry(scale); }
  function trackBufferGeometryPx(item) { return geometry().trackBufferGeometryPx(item); }
  function trackBufferGeometrySite3D(item) { return geometry().trackBufferGeometrySite3D(item); }
  function trackSwitchDirection(kind) { return geometry().trackSwitchDirection(kind); }
  function trackSwitchPxPerMm(item) { return geometry().trackSwitchPxPerMm(item); }
  function tomixTurnoutGeometry(scale = 1) { return geometry().tomixTurnoutGeometry(scale); }
  function trackSwitchGeometryPx(item) { return geometry().trackSwitchGeometryPx(item); }
  function trackSwitchGeometrySite3D(item) { return geometry().trackSwitchGeometrySite3D(item); }
  function trackSwitchEndpointDefinitions(item) { return geometry().trackSwitchEndpointDefinitions(item); }
  function trackSwitchCurvePoints(layout, direction, steps = 18) { return geometry().trackSwitchCurvePoints(layout, direction, steps); }
  function trackSwitchMainPathPoints(layout, direction, steps = 18) { return geometry().trackSwitchMainPathPoints(layout, direction, steps); }
  function pointAtPolylineDistance(path, distance) { return geometry().pointAtPolylineDistance(path, distance); }
  function polylineLength(path) { return geometry().polylineLength(path); }
  function transformTrackSwitchLocalPoint(item, local) { return geometry().transformTrackSwitchLocalPoint(item, local); }
  function trackSwitchEndpointPoints(item) { return geometry().trackSwitchEndpointPoints(item); }
  function rotatePoint(point, angleDeg) { return geometry().rotatePoint(point, angleDeg); }
  function normalizeAngleDeltaDeg(value) { return geometry().normalizeAngleDeltaDeg(value); }
  function normalizeTrackAccessory(raw = {}) { return geometry().normalizeTrackAccessory(raw); }

  function drawTrackSwitchPolyline(points) {
    const renderer = getRenderer();
    if (renderer) return renderer.drawTrackSwitchPolyline?.(points);
    if (!points || !points.length) return;
    ctx.beginPath();
    points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.stroke();
  }

  return Object.freeze({
    trackAccessoryPreset,
    trackAccessoryLabel,
    isTrackAccessoryAction,
    isCatenaryAccessoryKind,
    isTrackSwitchAccessoryKind,
    isTrackBufferAccessoryKind,
    trackBufferHasCatenaryTerminal,
    defaultTrackAccessoryPxPerMm,
    trackAccessoryPxPerMm,
    trackBufferPxPerMm,
    tomixBufferGeometry,
    trackBufferGeometryPx,
    trackBufferGeometrySite3D,
    trackSwitchDirection,
    trackSwitchPxPerMm,
    tomixTurnoutGeometry,
    trackSwitchGeometryPx,
    trackSwitchGeometrySite3D,
    trackSwitchEndpointDefinitions,
    trackSwitchCurvePoints,
    trackSwitchMainPathPoints,
    pointAtPolylineDistance,
    polylineLength,
    drawTrackSwitchPolyline,
    transformTrackSwitchLocalPoint,
    trackSwitchEndpointPoints,
    rotatePoint,
    normalizeAngleDeltaDeg,
    normalizeTrackAccessory,
  });
}
