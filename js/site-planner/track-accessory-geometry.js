export function createTrackAccessoryGeometry({
  state,
  presets,
  trackProfileDefaults,
  constants,
  normalizeTrack,
  dist,
  rad,
  deg,
  uid,
}) {
  const {
    TOMIX_TURNOUT_RADIUS_MM,
    TOMIX_TURNOUT_ANGLE_DEG,
    TOMIX_TURNOUT_ANGLE_RAD,
    TOMIX_TURNOUT_LENGTH_MM,
    TOMIX_TURNOUT_OFFSET_MM,
    TOMIX_TURNOUT_GAUGE_MM,
    TOMIX_TURNOUT_ROADBED_WIDTH_MM,
    TOMIX_TURNOUT_TIE_LENGTH_MM,
    TOMIX_TURNOUT_TIE_WIDTH_MM,
    TOMIX_TURNOUT_TIE_SPACING_MM,
    TOMIX_TURNOUT_RAIL_WIDTH_MM,
    TOMIX_1428_BUFFER_LENGTH_MM,
    TOMIX_1428_BUFFER_WIDTH_MM,
    TOMIX_1428_BUFFER_TIE_SPACING_MM,
    TOMIX_1428_BUFFER_TERMINAL_HEIGHT_MM,
  } = constants;

  function trackAccessoryPreset(kind) {
    return presets[kind] || presets.sensor;
  }

  function trackAccessoryLabel(kind) {
    return trackAccessoryPreset(kind).label;
  }

  function isTrackAccessoryAction(action) {
    return !!presets[action];
  }

  function isCatenaryAccessoryKind(kind) {
    return kind === 'catenarySingleSide' || kind === 'catenaryDoublePortal';
  }

  function isTrackSwitchAccessoryKind(kind) {
    return kind === 'trackSwitchLeft' || kind === 'trackSwitchRight';
  }

  function isTrackBufferAccessoryKind(kind) {
    return kind === 'trackBufferTomix1428' || kind === 'trackBufferTomix1428Catenary';
  }

  function trackBufferHasCatenaryTerminal(item) {
    return item?.kind === 'trackBufferTomix1428Catenary' || !!item?.catenaryEndTerminal;
  }

  function defaultTrackAccessoryPxPerMm() {
    return 10 / Math.max(.1, trackProfileDefaults.gaugeMm || TOMIX_TURNOUT_GAUGE_MM);
  }

  function trackAccessoryPxPerMm(item) {
    if (state.pxPerMm) return state.pxPerMm;
    const trackId = item?.trackId || item?.trackAnchor?.trackId;
    const track = trackId ? (state.tracks || []).map(normalizeTrack).find(t => t.id === trackId) : null;
    const gaugePx = Number(track?.gaugePx);
    const gaugeMm = Number(track?.gaugeMm);
    if (Number.isFinite(gaugePx) && gaugePx > 0 && Number.isFinite(gaugeMm) && gaugeMm > 0) return gaugePx / gaugeMm;
    return defaultTrackAccessoryPxPerMm();
  }

  function trackBufferPxPerMm(item) {
    return trackAccessoryPxPerMm(item);
  }

  function tomixBufferGeometry(scale = 1) {
    return {
      length: TOMIX_1428_BUFFER_LENGTH_MM * scale,
      width: TOMIX_1428_BUFFER_WIDTH_MM * scale,
      gauge: TOMIX_TURNOUT_GAUGE_MM * scale,
      tieSpacing: TOMIX_1428_BUFFER_TIE_SPACING_MM * scale,
      terminalHeight: TOMIX_1428_BUFFER_TERMINAL_HEIGHT_MM * scale,
      railWidth: TOMIX_TURNOUT_RAIL_WIDTH_MM * scale,
    };
  }

  function trackBufferGeometryPx(item) {
    return tomixBufferGeometry(trackBufferPxPerMm(item));
  }

  function trackBufferGeometrySite3D(item) {
    return tomixBufferGeometry(state.pxPerMm ? 1 : trackBufferPxPerMm(item));
  }

  function trackSwitchDirection(kind) {
    return kind === 'trackSwitchLeft' ? -1 : 1;
  }

  function trackSwitchPxPerMm(item) {
    return trackAccessoryPxPerMm(item);
  }

  function tomixTurnoutGeometry(scale = 1) {
    const length = TOMIX_TURNOUT_LENGTH_MM * scale;
    const radius = TOMIX_TURNOUT_RADIUS_MM * scale;
    const offset = TOMIX_TURNOUT_OFFSET_MM * scale;
    return {
      radius,
      angleDeg: TOMIX_TURNOUT_ANGLE_DEG,
      angleRad: TOMIX_TURNOUT_ANGLE_RAD,
      length,
      halfLength: length / 2,
      offset,
      gauge: TOMIX_TURNOUT_GAUGE_MM * scale,
      roadbedWidth: TOMIX_TURNOUT_ROADBED_WIDTH_MM * scale,
      tieLength: TOMIX_TURNOUT_TIE_LENGTH_MM * scale,
      tieWidth: TOMIX_TURNOUT_TIE_WIDTH_MM * scale,
      tieSpacing: TOMIX_TURNOUT_TIE_SPACING_MM * scale,
      railWidth: TOMIX_TURNOUT_RAIL_WIDTH_MM * scale,
    };
  }

  function trackSwitchGeometryPx(item) {
    return tomixTurnoutGeometry(trackSwitchPxPerMm(item));
  }

  function trackSwitchGeometrySite3D(item) {
    return tomixTurnoutGeometry(state.pxPerMm ? 1 : trackSwitchPxPerMm(item));
  }

  function trackSwitchEndpointDefinitions(item) {
    if (!item || !isTrackSwitchAccessoryKind(item.kind)) return [];
    const geom = trackSwitchGeometryPx(item);
    const dir = trackSwitchDirection(item.kind);
    return [
      { endpoint: 'heel', label: 'Heel', local: { x: -geom.halfLength, y: 0 }, angleDeg: 0 },
      { endpoint: 'straight', label: 'Straight', local: { x: geom.halfLength, y: 0 }, angleDeg: 0 },
      { endpoint: 'diverging', label: 'Diverging', local: { x: geom.halfLength, y: dir * geom.offset }, angleDeg: dir * TOMIX_TURNOUT_ANGLE_DEG },
    ];
  }

  function trackSwitchCurvePoints(geom, dir, steps = 18) {
    const points = [];
    for (let i = 0; i <= steps; i++) {
      const a = geom.angleRad * i / steps;
      points.push({ x: -geom.halfLength + geom.radius * Math.sin(a), y: dir * geom.radius * (1 - Math.cos(a)) });
    }
    return points;
  }

  function pointAtPolylineDistance(path, distance) {
    const clean = (path || []).filter(point => point && Number.isFinite(point.x) && Number.isFinite(point.y));
    if (!clean.length) return null;
    let remaining = Math.max(0, Number(distance) || 0);
    for (let i = 1; i < clean.length; i++) {
      const a = clean[i - 1], b = clean[i];
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      if (len <= .001) continue;
      if (remaining <= len) {
        const t = remaining / len;
        return { point: { x: a.x + dx * t, y: a.y + dy * t }, tangent: { x: dx / len, y: dy / len }, distance };
      }
      remaining -= len;
    }
    const prev = clean[Math.max(0, clean.length - 2)], last = clean[clean.length - 1];
    const dx = last.x - prev.x, dy = last.y - prev.y, len = Math.hypot(dx, dy) || 1;
    return { point: last, tangent: { x: dx / len, y: dy / len }, distance };
  }

  function polylineLength(path) {
    return (path || []).reduce((total, point, index, arr) => {
      if (!index) return total;
      const prev = arr[index - 1];
      return total + dist(prev, point);
    }, 0);
  }

  function transformTrackSwitchLocalPoint(item, local) {
    const a = rad(Number(item?.rotationDeg) || 0);
    return {
      x: (Number(item?.x) || 0) + local.x * Math.cos(a) - local.y * Math.sin(a),
      y: (Number(item?.y) || 0) + local.x * Math.sin(a) + local.y * Math.cos(a),
    };
  }

  function trackSwitchEndpointPoints(item) {
    if (!item || !isTrackSwitchAccessoryKind(item.kind)) return [];
    return trackSwitchEndpointDefinitions(item).map(endpoint => ({
      ...endpoint,
      point: transformTrackSwitchLocalPoint(item, endpoint.local),
      angleDeg: (Number(item.rotationDeg) || 0) + endpoint.angleDeg,
      trackAccessoryId: item.id,
      kind: 'trackSwitchEndpoint',
      hidden: item.hidden,
    }));
  }

  function rotatePoint(point, angleDeg) {
    const a = rad(angleDeg);
    return { x: point.x * Math.cos(a) - point.y * Math.sin(a), y: point.x * Math.sin(a) + point.y * Math.cos(a) };
  }

  function normalizeTrackAccessory(raw = {}) {
    const kind = presets[raw.kind] ? raw.kind : 'sensor';
    const preset = trackAccessoryPreset(kind);
    raw.type = 'trackAccessory';
    raw.kind = kind;
    raw.id = raw.id || uid('trackItem');
    raw.name = raw.name || preset.label;
    raw.x = Number.isFinite(Number(raw.x)) ? Number(raw.x) : 0;
    raw.y = Number.isFinite(Number(raw.y)) ? Number(raw.y) : 0;
    raw.rotationDeg = Number.isFinite(Number(raw.rotationDeg)) ? Number(raw.rotationDeg) : 0;
    raw.trackId = raw.trackId || null;
    raw.autoOrientToTrack = isCatenaryAccessoryKind(kind) ? (raw.autoOrientToTrack !== false && !!raw.trackId) : !!raw.autoOrientToTrack;
    if (raw.trackAnchor && typeof raw.trackAnchor === 'object') {
      raw.trackAnchor = {
        trackId: raw.trackAnchor.trackId || raw.trackId || null,
        pathDistancePx: Number.isFinite(Number(raw.trackAnchor.pathDistancePx)) ? Number(raw.trackAnchor.pathDistancePx) : null,
        offsetPx: Number.isFinite(Number(raw.trackAnchor.offsetPx)) ? Number(raw.trackAnchor.offsetPx) : 0,
        endpointKey: raw.trackAnchor.endpointKey === 'start' || raw.trackAnchor.endpointKey === 'end' ? raw.trackAnchor.endpointKey : null,
        pointIndex: Number.isInteger(raw.trackAnchor.pointIndex) ? raw.trackAnchor.pointIndex : null,
        kind: raw.trackAnchor.kind === 'trackSwitchEndpoint' ? 'trackSwitchEndpoint' : null,
        trackAccessoryId: raw.trackAnchor.trackAccessoryId || null,
        endpoint: raw.trackAnchor.endpoint || null,
        sourceEndpoint: raw.trackAnchor.sourceEndpoint || null,
      };
    } else {
      raw.trackAnchor = null;
    }
    raw.color = raw.color || preset.color;
    raw.catenaryEndTerminal = isTrackBufferAccessoryKind(kind) ? (kind === 'trackBufferTomix1428Catenary' || !!raw.catenaryEndTerminal) : !!raw.catenaryEndTerminal;
    raw.locked = !!raw.locked;
    raw.hidden = !!raw.hidden;
    raw.notes = raw.notes || preset.defaultNotes || '';
    return raw;
  }

  return {
    defaultTrackAccessoryPxPerMm,
    isCatenaryAccessoryKind,
    isTrackAccessoryAction,
    isTrackBufferAccessoryKind,
    isTrackSwitchAccessoryKind,
    normalizeTrackAccessory,
    pointAtPolylineDistance,
    polylineLength,
    rotatePoint,
    trackAccessoryLabel,
    trackAccessoryPreset,
    trackAccessoryPxPerMm,
    trackBufferGeometryPx,
    trackBufferGeometrySite3D,
    trackBufferHasCatenaryTerminal,
    trackBufferPxPerMm,
    trackSwitchCurvePoints,
    trackSwitchDirection,
    trackSwitchEndpointDefinitions,
    trackSwitchEndpointPoints,
    trackSwitchGeometryPx,
    trackSwitchGeometrySite3D,
    trackSwitchPxPerMm,
    tomixBufferGeometry,
    tomixTurnoutGeometry,
    transformTrackSwitchLocalPoint,
  };
}
