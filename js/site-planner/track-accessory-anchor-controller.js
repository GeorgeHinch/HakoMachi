export function createTrackAccessoryAnchorController({
  state,
  normalizeTrack,
  normalizeTrackAccessory,
  isCatenaryAccessoryKind,
  isTrackBufferAccessoryKind,
  trackPathSamples,
  resolveTrackEndpointAnchor,
  clamp,
  closestPointOnSegment,
  deg,
}) {
  function trackAccessorySnapDistance() {
    return 56 / state.view.scale;
  }

  function sampledTrackSegments(track, perCurve = 20) {
    const path = trackPathSamples(track, perCurve);
    const segments = [];
    let cumulative = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
      if (!(len > 0)) continue;
      segments.push({ a, b, dx, dy, len, start: cumulative });
      cumulative += len;
    }
    return { path, segments, total: cumulative };
  }

  function trackPointAtDistance(trackId, pathDistancePx) {
    const track = (state.tracks || []).map(normalizeTrack).find(item => item.id === trackId);
    if (!track || track.hidden || (track.pointsPx || []).length < 2) return null;
    const sampled = sampledTrackSegments(track, 24);
    if (!sampled.segments.length) return null;
    const target = clamp(Number(pathDistancePx) || 0, 0, sampled.total);
    let segment = sampled.segments[sampled.segments.length - 1];
    for (const candidate of sampled.segments) {
      if (target <= candidate.start + candidate.len) {
        segment = candidate;
        break;
      }
    }
    const local = segment.len ? clamp((target - segment.start) / segment.len, 0, 1) : 0;
    const point = { x: segment.a.x + segment.dx * local, y: segment.a.y + segment.dy * local };
    const tangent = { x: segment.dx / segment.len, y: segment.dy / segment.len };
    const normal = { x: -tangent.y, y: tangent.x };
    return { trackId: track.id, point, tangent, normal, pathDistancePx: target, angleDeg: deg(Math.atan2(tangent.y, tangent.x)) };
  }

  function nearestTrackAccessoryAnchor(point, options = {}) {
    let best = null;
    (state.tracks || []).map(normalizeTrack).forEach(track => {
      if (options.trackId && track.id !== options.trackId) return;
      if (track.hidden || (track.pointsPx || []).length < 2) return;
      const sampled = sampledTrackSegments(track, 24);
      sampled.segments.forEach(segment => {
        const hit = closestPointOnSegment(point, segment.a, segment.b);
        const anchorPoint = hit.point;
        const distance = hit.distance;
        if (!best || distance < best.distance) {
          const local = Number.isFinite(Number(hit.t))
            ? hit.t
            : (segment.len ? clamp(((anchorPoint.x - segment.a.x) * segment.dx + (anchorPoint.y - segment.a.y) * segment.dy) / (segment.len * segment.len), 0, 1) : 0);
          const tangent = { x: segment.dx / segment.len, y: segment.dy / segment.len };
          const normal = { x: -tangent.y, y: tangent.x };
          best = {
            trackId: track.id,
            point: anchorPoint,
            distance,
            tangent,
            normal,
            pathDistancePx: segment.start + segment.len * local,
            offsetPx: (point.x - anchorPoint.x) * normal.x + (point.y - anchorPoint.y) * normal.y,
            angleDeg: deg(Math.atan2(tangent.y, tangent.x)),
          };
        }
      });
    });
    return best;
  }

  function attachTrackAccessoryToAnchor(item, anchor, options = {}) {
    if (!item || !anchor) return false;
    const snapToTrack = options.snapToTrack !== false;
    const offsetPx = snapToTrack ? 0 : (Number.isFinite(Number(anchor.offsetPx)) ? Number(anchor.offsetPx) : 0);
    item.trackId = anchor.trackId;
    item.trackAnchor = { trackId: anchor.trackId, pathDistancePx: anchor.pathDistancePx, offsetPx };
    item.autoOrientToTrack = isCatenaryAccessoryKind(item.kind);
    item.x = anchor.point.x + (anchor.normal?.x || 0) * offsetPx;
    item.y = anchor.point.y + (anchor.normal?.y || 0) * offsetPx;
    item.rotationDeg = anchor.angleDeg;
    return true;
  }

  function resolveTrackAccessoryAnchor(item) {
    if (!item || !isCatenaryAccessoryKind(item.kind) || item.autoOrientToTrack === false || !item.trackId) return null;
    let anchor = null;
    if (item.trackAnchor && item.trackAnchor.trackId === item.trackId && Number.isFinite(Number(item.trackAnchor.pathDistancePx))) {
      anchor = trackPointAtDistance(item.trackId, item.trackAnchor.pathDistancePx);
      if (anchor) anchor.offsetPx = Number(item.trackAnchor.offsetPx) || 0;
    }
    if (!anchor) {
      anchor = nearestTrackAccessoryAnchor({ x: item.x, y: item.y }, { trackId: item.trackId });
      if (anchor) item.trackAnchor = { trackId: anchor.trackId, pathDistancePx: anchor.pathDistancePx, offsetPx: 0 };
    }
    if (!anchor) return null;
    const offsetPx = Number(anchor.offsetPx) || 0;
    return {
      ...anchor,
      point: {
        x: anchor.point.x + (anchor.normal?.x || 0) * offsetPx,
        y: anchor.point.y + (anchor.normal?.y || 0) * offsetPx,
      },
      offsetPx,
    };
  }

  function refreshTrackAccessoryAnchor(item) {
    normalizeTrackAccessory(item);
    if (isTrackBufferAccessoryKind(item.kind) && item.trackAnchor?.trackId && item.trackAnchor?.endpointKey) {
      const endpoint = resolveTrackEndpointAnchor(item.trackAnchor.trackId, item.trackAnchor.endpointKey);
      if (!endpoint) return false;
      item.trackId = endpoint.trackId;
      item.x = endpoint.point.x;
      item.y = endpoint.point.y;
      item.rotationDeg = endpoint.angleDeg;
      item.trackAnchor = { trackId: endpoint.trackId, endpointKey: endpoint.endpointKey, pointIndex: endpoint.pointIndex, pathDistancePx: null, offsetPx: 0 };
      return true;
    }
    const anchor = resolveTrackAccessoryAnchor(item);
    if (!anchor) return false;
    item.x = anchor.point.x;
    item.y = anchor.point.y;
    item.rotationDeg = anchor.angleDeg;
    return true;
  }

  function refreshAnchoredTrackAccessories() {
    (state.trackAccessories || []).forEach(item => refreshTrackAccessoryAnchor(item));
  }

  return Object.freeze({
    trackAccessorySnapDistance,
    sampledTrackSegments,
    trackPointAtDistance,
    nearestTrackAccessoryAnchor,
    attachTrackAccessoryToAnchor,
    resolveTrackAccessoryAnchor,
    refreshTrackAccessoryAnchor,
    refreshAnchoredTrackAccessories,
  });
}
