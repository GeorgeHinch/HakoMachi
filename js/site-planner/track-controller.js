export function createTrackController(deps) {
  const {
    state,
    defaults,
    uid,
    mmToPx,
    pxToMm,
    dist,
    distanceToSegment,
    closestPointOnSegment,
    quadPoint,
    clearBuildingSelection,
    syncAll,
    getExternalTrackConnectionPoints = () => [],
  } = deps;

  function pointerTolerance(pointerType = 'mouse', coarsePx = 18, finePx = 10) {
    const coarse = pointerType === 'pen' || pointerType === 'touch' || matchMedia('(pointer: coarse)').matches;
    return (coarse ? coarsePx : finePx) / state.view.scale;
  }

  function normalizeTrack(t) {
    if (!t) return t;
    t.id = t.id || uid('track');
    t.type = 'track';
    t.name = t.name || `Track ${state.tracks.length + 1}`;
    t.pointsPx = Array.isArray(t.pointsPx) ? t.pointsPx.map(p => ({ x: Number(p.x) || 0, y: Number(p.y) || 0 })) : [];
    t.gaugeMm = Number.isFinite(Number(t.gaugeMm)) ? Number(t.gaugeMm) : defaults.gaugeMm;
    t.railWidthMm = Number.isFinite(Number(t.railWidthMm)) ? Number(t.railWidthMm) : defaults.railWidthMm;
    t.railHeightMm = Number.isFinite(Number(t.railHeightMm)) ? Number(t.railHeightMm) : defaults.railHeightMm;
    t.tieSpacingMm = Number.isFinite(Number(t.tieSpacingMm)) ? Number(t.tieSpacingMm) : defaults.tieSpacingMm;
    t.tieLengthMm = Number.isFinite(Number(t.tieLengthMm)) ? Number(t.tieLengthMm) : defaults.tieLengthMm;
    t.tieWidthMm = Number.isFinite(Number(t.tieWidthMm)) ? Number(t.tieWidthMm) : defaults.tieWidthMm;
    t.roadbedWidthMm = Number.isFinite(Number(t.roadbedWidthMm)) ? Number(t.roadbedWidthMm) : defaults.roadbedWidthMm;
    t.roadbedHeightMm = Number.isFinite(Number(t.roadbedHeightMm)) ? Number(t.roadbedHeightMm) : defaults.roadbedHeightMm;
    t.roadbedShoulderMm = Number.isFinite(Number(t.roadbedShoulderMm)) ? Number(t.roadbedShoulderMm) : defaults.roadbedShoulderMm;
    t.gaugePx = Number.isFinite(Number(t.gaugePx)) ? Number(t.gaugePx) : (state.pxPerMm ? mmToPx(t.gaugeMm) : 10);
    t.tieSpacingPx = Number.isFinite(Number(t.tieSpacingPx)) ? Number(t.tieSpacingPx) : (state.pxPerMm ? mmToPx(t.tieSpacingMm) : 14);
    t.railWidthPx = Number.isFinite(Number(t.railWidthPx)) ? Number(t.railWidthPx) : (state.pxPerMm ? mmToPx(t.railWidthMm) : 1.2);
    t.tieLengthPx = Number.isFinite(Number(t.tieLengthPx)) ? Number(t.tieLengthPx) : (state.pxPerMm ? mmToPx(t.tieLengthMm) : 18);
    t.tieWidthPx = Number.isFinite(Number(t.tieWidthPx)) ? Number(t.tieWidthPx) : (state.pxPerMm ? mmToPx(t.tieWidthMm) : 2);
    t.roadbedWidthPx = Number.isFinite(Number(t.roadbedWidthPx)) ? Number(t.roadbedWidthPx) : (state.pxPerMm ? mmToPx(t.roadbedWidthMm) : 24);
    t.roadbedShoulderPx = Number.isFinite(Number(t.roadbedShoulderPx)) ? Number(t.roadbedShoulderPx) : (state.pxPerMm ? mmToPx(t.roadbedShoulderMm) : 4);
    t.color = t.color || defaults.railColor;
    t.tieColor = t.tieColor || defaults.tieColor;
    t.roadbedColor = t.roadbedColor || defaults.roadbedColor;
    t.roadbedTopColor = t.roadbedTopColor || defaults.roadbedTopColor;
    t.endpointConnections = (t.endpointConnections && typeof t.endpointConnections === 'object') ? t.endpointConnections : {};
    t.locked = !!t.locked;
    t.hidden = !!t.hidden;
    normalizeTrackCurves(t);
    return t;
  }

  function syncTrackMetrics(t) {
    normalizeTrack(t);
    if (state.pxPerMm) {
      t.gaugeMm = pxToMm(t.gaugePx || 0);
      t.railWidthMm = pxToMm(t.railWidthPx || 0);
      t.tieSpacingMm = pxToMm(t.tieSpacingPx || 0);
      t.tieLengthMm = pxToMm(t.tieLengthPx || 0);
      t.tieWidthMm = pxToMm(t.tieWidthPx || 0);
      t.roadbedWidthMm = pxToMm(t.roadbedWidthPx || 0);
      t.roadbedShoulderMm = pxToMm(t.roadbedShoulderPx || 0);
      t.pointsMm = (t.pointsPx || []).map(p => ({ x: pxToMm(p.x), y: pxToMm(p.y) }));
      t.curvesMm = (t.curvesPx || []).map(c => c ? { x: pxToMm(c.x), y: pxToMm(c.y) } : null);
    }
    return t;
  }

  function normalizeTrackCurves(t) {
    const n = Math.max(0, (t.pointsPx || []).length - 1);
    const src = Array.isArray(t.curvesPx)
      ? t.curvesPx
      : (Array.isArray(t.curves)
        ? t.curves
        : (Array.isArray(t.curvesMm) && state.pxPerMm ? t.curvesMm.map(c => c ? { x: mmToPx(c.x), y: mmToPx(c.y) } : null) : []));
    t.curvesPx = [];
    for (let i = 0; i < n; i++) {
      const c = src[i];
      t.curvesPx[i] = c && Number.isFinite(Number(c.x)) && Number.isFinite(Number(c.y)) ? { x: Number(c.x), y: Number(c.y) } : null;
    }
    return t.curvesPx;
  }

  function trackProfilePx(t) {
    normalizeTrack(t);
    return {
      gauge: t.gaugePx || mmToPx(defaults.gaugeMm),
      railWidth: Math.max(.5, t.railWidthPx || mmToPx(defaults.railWidthMm)),
      tieSpacing: Math.max(2, t.tieSpacingPx || mmToPx(defaults.tieSpacingMm)),
      tieLength: Math.max(t.gaugePx || 9, t.tieLengthPx || mmToPx(defaults.tieLengthMm)),
      tieWidth: Math.max(.8, t.tieWidthPx || mmToPx(defaults.tieWidthMm)),
      roadbedWidth: Math.max((t.tieLengthPx || 0) + 2, t.roadbedWidthPx || mmToPx(defaults.roadbedWidthMm)),
      roadbedTopWidth: Math.max(t.gaugePx || 9, (t.roadbedWidthPx || mmToPx(defaults.roadbedWidthMm)) - 2 * (t.roadbedShoulderPx || mmToPx(defaults.roadbedShoulderMm))),
    };
  }

  function trackPathSamples(t, perCurve = 14) {
    normalizeTrack(t);
    const pts = t.pointsPx || [];
    if (pts.length < 2) return pts;
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], c = t.curvesPx?.[i];
      if (i === 0) out.push({ x: a.x, y: a.y });
      if (c) {
        for (let k = 1; k <= perCurve; k++) out.push(quadPoint(a, c, b, k / perCurve));
      } else {
        out.push({ x: b.x, y: b.y });
      }
    }
    return out;
  }

  function offsetTrackPath(path, offsetPx) {
    if (!Array.isArray(path) || path.length < 2) return [];
    return path.map((p, i) => {
      const prev = path[Math.max(0, i - 1)], next = path[Math.min(path.length - 1, i + 1)];
      const dx = next.x - prev.x, dy = next.y - prev.y, len = Math.hypot(dx, dy) || 1;
      return { x: p.x - dy / len * offsetPx, y: p.y + dx / len * offsetPx };
    });
  }

  function trackTieSegments(t) {
    t = normalizeTrack(t);
    const path = trackPathSamples(t);
    const profile = trackProfilePx(t);
    const spacing = profile.tieSpacing;
    const half = profile.tieLength / 2;
    const ties = [];
    let carry = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1], dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
      if (!len) continue;
      let d = i === 0 ? 0 : spacing - carry;
      while (d <= len) {
        const x = a.x + dx * (d / len), y = a.y + dy * (d / len);
        const nx = -dy / len, ny = dx / len;
        ties.push({ a: { x: x - nx * half, y: y - ny * half }, b: { x: x + nx * half, y: y + ny * half } });
        d += spacing;
      }
      carry = (len + carry) % spacing;
    }
    return ties;
  }

  function selectedTrack() { return (state.tracks || []).find(t => t.id === state.selectedTrackId) || null; }

  function hitTrackPoint(p, t, pointerType = 'mouse') {
    if (!t || !Array.isArray(t.pointsPx) || !t.pointsPx.length) return null;
    const tol = pointerTolerance(pointerType, 18, 11);
    let best = { distance: Infinity, index: -1 };
    t.pointsPx.forEach((pt, i) => {
      const d = dist(p, pt);
      if (d < best.distance) best = { distance: d, index: i };
    });
    return best.distance <= tol ? best : null;
  }

  function hitTrackSegment(p, t, pointerType = 'mouse') {
    if (!t || !Array.isArray(t.pointsPx) || t.pointsPx.length < 2) return null;
    const tol = pointerTolerance(pointerType);
    normalizeTrackCurves(t);
    let best = { distance: Infinity, index: -1 };
    for (let i = 0; i < t.pointsPx.length - 1; i++) {
      const a = t.pointsPx[i], b = t.pointsPx[i + 1], c = t.curvesPx?.[i];
      if (c) {
        let prev = a;
        for (let k = 1; k <= 16; k++) {
          const cur = quadPoint(a, c, b, k / 16);
          const d = distanceToSegment(p, prev, cur);
          if (d < best.distance) best = { distance: d, index: i };
          prev = cur;
        }
      } else {
        const d = distanceToSegment(p, a, b);
        if (d < best.distance) best = { distance: d, index: i };
      }
    }
    return best.distance <= tol ? best : null;
  }

  function nearestPointOnTrackPath(p, track, includeEndpoints = true) {
    if (!track || track.hidden) return null;
    const samples = trackPathSamples(track, 20);
    if (!samples || samples.length < 2) return null;
    let best = { distance: Infinity, point: null, trackId: track.id, kind: 'segment' };
    if (includeEndpoints && track.pointsPx?.length) {
      [0, track.pointsPx.length - 1].forEach(idx => {
        const ep = track.pointsPx[idx];
        const d = dist(p, ep);
        if (d < best.distance) best = { distance: d, point: { x: ep.x, y: ep.y }, trackId: track.id, kind: idx === 0 ? 'endpointStart' : 'endpointEnd', pointIndex: idx };
      });
    }
    for (let i = 0; i < samples.length - 1; i++) {
      const hit = closestPointOnSegment(p, samples[i], samples[i + 1]);
      if (hit.distance < best.distance) best = { distance: hit.distance, point: hit.point, trackId: track.id, kind: 'segment' };
    }
    return best.point ? best : null;
  }

  function findTrackConnectionSnap(p, excludeTrackId = null, pointerType = 'mouse') {
    const tol = pointerTolerance(pointerType, 20, 14);
    let best = null;
    (state.tracks || []).forEach(raw => {
      const t = normalizeTrack(raw);
      if (t.id === excludeTrackId || t.hidden) return;
      const hit = nearestPointOnTrackPath(p, t, true);
      if (hit && hit.distance <= tol && (!best || hit.distance < best.distance)) best = hit;
    });
    (getExternalTrackConnectionPoints() || []).forEach(endpoint => {
      if (!endpoint || endpoint.hidden || !endpoint.point) return;
      const distance = dist(p, endpoint.point);
      if (distance <= tol && (!best || distance < best.distance)) {
        best = {
          ...endpoint,
          distance,
          point: { x: endpoint.point.x, y: endpoint.point.y },
          kind: endpoint.kind || 'externalEndpoint',
        };
      }
    });
    return best;
  }

  function snapTrackPointForConnection(p, excludeTrackId = null, pointerType = 'mouse') {
    const hit = findTrackConnectionSnap(p, excludeTrackId, pointerType);
    if (!hit) return { x: p.x, y: p.y, connection: null };
    const connection = hit.trackAccessoryId
      ? { trackAccessoryId: hit.trackAccessoryId, kind: hit.kind, endpoint: hit.endpoint || null }
      : { trackId: hit.trackId, kind: hit.kind, pointIndex: hit.pointIndex ?? null };
    return { x: hit.point.x, y: hit.point.y, connection };
  }

  function setTrackEndpointConnection(t, index, snap) {
    if (!t || !snap || !Number.isInteger(index)) return;
    t.endpointConnections = t.endpointConnections || {};
    const key = index === 0 ? 'start' : (index === (t.pointsPx?.length || 0) - 1 ? 'end' : null);
    if (!key) return;
    if (snap.connection) t.endpointConnections[key] = snap.connection;
    else delete t.endpointConnections[key];
  }

  function trackEndpointKey(t, index) {
    if (!t || !Number.isInteger(index)) return null;
    return index === 0 ? 'start' : (index === (t.pointsPx?.length || 0) - 1 ? 'end' : null);
  }

  function trackConnectionEndpointIndex(t, connection) {
    if (!t || !connection) return null;
    if (connection.kind === 'endpointStart') return 0;
    if (connection.kind === 'endpointEnd') return Math.max(0, (t.pointsPx?.length || 1) - 1);
    if (Number.isInteger(connection.pointIndex)) {
      const idx = connection.pointIndex;
      if (idx === 0 || idx === (t.pointsPx?.length || 0) - 1) return idx;
    }
    return null;
  }

  function moveTrackPointWithAdjacentCurves(t, index, target) {
    if (!t || !Array.isArray(t.pointsPx) || !t.pointsPx[index] || !target) return null;
    normalizeTrackCurves(t);
    const old = t.pointsPx[index];
    const dx = target.x - old.x, dy = target.y - old.y;
    t.pointsPx = t.pointsPx.map((q, idx) => idx === index ? { x: target.x, y: target.y } : { x: q.x, y: q.y });
    t.curvesPx = (t.curvesPx || []).map((c, idx) => {
      if (!c) return null;
      const adjacent = idx === index || idx === index - 1;
      return adjacent ? { x: c.x + dx, y: c.y + dy } : { x: c.x, y: c.y };
    });
    syncTrackMetrics(t);
    return { dx, dy };
  }

  function syncConnectedTrackEndpoint(sourceTrack, sourceIndex, target) {
    const key = trackEndpointKey(sourceTrack, sourceIndex);
    const connection = key ? sourceTrack?.endpointConnections?.[key] : null;
    if (!connection || !target) return;
    const other = (state.tracks || []).find(item => item.id === connection.trackId);
    if (!other || other.id === sourceTrack.id || other.locked) return;
    const otherIndex = trackConnectionEndpointIndex(other, connection);
    if (!Number.isInteger(otherIndex) || !other.pointsPx?.[otherIndex]) return;
    moveTrackPointWithAdjacentCurves(other, otherIndex, target);
    other.endpointConnections = other.endpointConnections || {};
    const otherKey = trackEndpointKey(other, otherIndex);
    if (otherKey) {
      other.endpointConnections[otherKey] = {
        trackId: sourceTrack.id,
        kind: sourceIndex === 0 ? 'endpointStart' : 'endpointEnd',
        pointIndex: sourceIndex,
      };
    }
    syncTrackMetrics(other);
  }

  function hitTrack(p, pointerType = 'mouse') {
    const tol = pointerTolerance(pointerType);
    for (let i = (state.tracks || []).length - 1; i >= 0; i--) {
      const t = normalizeTrack(state.tracks[i]);
      if (t.hidden) continue;
      const path = trackPathSamples(t);
      if (hitTrackPoint(p, t, pointerType) || hitTrackSegment(p, t, pointerType)) return t;
      for (let j = 0; j < path.length - 1; j++) {
        if (distanceToSegment(p, path[j], path[j + 1]) <= tol) return t;
      }
    }
    return null;
  }

  function moveTrack(t, dx, dy) {
    if (!t || t.locked) return;
    t.pointsPx = (t.pointsPx || []).map(p => ({ x: p.x + dx, y: p.y + dy }));
    t.curvesPx = (t.curvesPx || []).map(c => c ? { x: c.x + dx, y: c.y + dy } : null);
    syncTrackMetrics(t);
  }

  function deleteSelectedTrack() {
    if (!state.selectedTrackId) return false;
    state.tracks = (state.tracks || []).filter(t => t.id !== state.selectedTrackId);
    state.selectedTrackId = null;
    syncAll();
    return true;
  }

  function finishTrack() {
    if (!state.trackDraft || state.trackDraft.length < 2) return;
    const extension = state.trackDraftExtension;
    if (extension && (extension.kind === 'endpointStart' || extension.kind === 'endpointEnd')) {
      const existing = (state.tracks || []).find(track => track.id === extension.trackId);
      if (existing && !existing.locked) {
        normalizeTrack(existing);
        const additions = state.trackDraft.slice(1).map(point => ({ x: point.x, y: point.y }));
        const conns = state.trackDraftConnections || [];
        const outerConnection = conns[state.trackDraft.length - 1]?.connection || null;
        if (extension.kind === 'endpointStart') {
          existing.pointsPx = additions.slice().reverse().concat(existing.pointsPx || []);
          existing.curvesPx = additions.map(() => null).concat(existing.curvesPx || []);
          existing.endpointConnections = existing.endpointConnections || {};
          delete existing.endpointConnections.start;
          if (outerConnection) existing.endpointConnections.start = outerConnection;
        } else {
          existing.pointsPx = (existing.pointsPx || []).concat(additions);
          existing.curvesPx = (existing.curvesPx || []).concat(additions.map(() => null));
          existing.endpointConnections = existing.endpointConnections || {};
          delete existing.endpointConnections.end;
          if (outerConnection) existing.endpointConnections.end = outerConnection;
        }
        syncTrackMetrics(existing);
        clearBuildingSelection();
        state.selectedRoadId = null;
        state.selectedRoadFeatureId = null;
        state.selectedBenchworkId = null;
        state.selectedStreetlightId = null;
        state.selectedAnnotationId = null;
        state.selectedFabricId = null;
        state.selectedTrackId = existing.id;
        state.trackDraft = [];
        state.trackDraftConnections = [];
        state.trackDraftExtension = null;
        syncAll();
        return;
      }
    }
    const t = normalizeTrack({
      id: uid('track'),
      name: `Track ${state.tracks.length + 1}`,
      pointsPx: state.trackDraft.slice(),
      curvesPx: [],
      gaugeMm: defaults.gaugeMm,
      tieSpacingMm: defaults.tieSpacingMm,
      color: defaults.railColor,
      tieColor: defaults.tieColor,
      roadbedColor: defaults.roadbedColor,
      roadbedTopColor: defaults.roadbedTopColor,
    });
    const conns = state.trackDraftConnections || [];
    t.endpointConnections = {};
    if (conns[0]?.connection) t.endpointConnections.start = conns[0].connection;
    if (conns[state.trackDraft.length - 1]?.connection) t.endpointConnections.end = conns[state.trackDraft.length - 1].connection;
    syncTrackMetrics(t);
    state.tracks.push(t);
    clearBuildingSelection();
    state.selectedRoadId = null;
    state.selectedRoadFeatureId = null;
    state.selectedBenchworkId = null;
    state.selectedStreetlightId = null;
    state.selectedAnnotationId = null;
    state.selectedFabricId = null;
    state.selectedTrackId = t.id;
    state.trackDraft = [];
    state.trackDraftConnections = [];
    state.trackDraftExtension = null;
    syncAll();
  }

  return {
    normalizeTrack,
    syncTrackMetrics,
    normalizeTrackCurves,
    trackProfilePx,
    trackPathSamples,
    offsetTrackPath,
    trackTieSegments,
    selectedTrack,
    hitTrackPoint,
    hitTrackSegment,
    nearestPointOnTrackPath,
    findTrackConnectionSnap,
    snapTrackPointForConnection,
    setTrackEndpointConnection,
    trackEndpointKey,
    trackConnectionEndpointIndex,
    moveTrackPointWithAdjacentCurves,
    syncConnectedTrackEndpoint,
    hitTrack,
    moveTrack,
    deleteSelectedTrack,
    finishTrack,
  };
}
