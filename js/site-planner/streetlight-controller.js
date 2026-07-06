export function createStreetlightController(deps) {
  const {
    state,
    uid,
    dist,
    clearBuildingSelection,
    syncAll,
  } = deps;

  function normalizeStreetlight(l) {
    if (!l) return l;
    l.kind = l.kind || 'streetlight';
    l.mode = l.mode || 'free';
    l.name = l.name || (l.mode === 'anchored' ? 'Anchored Streetlight' : 'Streetlight');
    l.x = Number.isFinite(l.x) ? l.x : 0;
    l.y = Number.isFinite(l.y) ? l.y : 0;
    l.rotationDeg = Number.isFinite(l.rotationDeg) ? l.rotationDeg : 0;
    l.heightMm = Number.isFinite(l.heightMm) ? l.heightMm : 8;
    l.armLengthMm = Number.isFinite(l.armLengthMm) ? l.armLengthMm : 3.5;
    l.lightRadiusMm = Number.isFinite(l.lightRadiusMm) ? l.lightRadiusMm : 2;
    l.poleDiameterMm = Number.isFinite(l.poleDiameterMm) ? l.poleDiameterMm : 0.45;
    l.type = l.type || 'singleArm';
    l.color = l.color || '#c84a3a';
    l.locked = !!l.locked;
    l.anchor = l.anchor || {};
    l.anchor.mountMode = l.anchor.mountMode || (l.mode === 'anchored' ? 'sidewalkCutHole' : 'free');
    l.anchor.cutHoleDiameterMm = Number.isFinite(l.anchor.cutHoleDiameterMm) ? l.anchor.cutHoleDiameterMm : 1.2;
    l.anchor.bulbMountDiameterMm = Number.isFinite(l.anchor.bulbMountDiameterMm) ? l.anchor.bulbMountDiameterMm : 3.0;
    l.anchor.edgeOffsetMm = Number.isFinite(l.anchor.edgeOffsetMm) ? l.anchor.edgeOffsetMm : 0.5;
    l.anchor.lockToRoadEdge = !!l.anchor.lockToRoadEdge;
    l.anchor.targetRoadId = l.anchor.targetRoadId || null;
    l.anchor.sidewalkSide = l.anchor.sidewalkSide || 'auto';
    return l;
  }

  function hitStreetlight(p, pointerType = 'mouse') {
    const coarse = pointerType === 'pen' || pointerType === 'touch' || matchMedia('(pointer: coarse)').matches;
    const tol = (coarse ? 18 : 10) / state.view.scale;
    for (let i = state.streetlights.length - 1; i >= 0; i--) {
      const l = normalizeStreetlight(state.streetlights[i]);
      if (dist(p, l) < tol) return l;
    }
    return null;
  }

  function selectedStreetlight() {
    return state.streetlights.find(l => l.id === state.selectedStreetlightId) || null;
  }

  function deleteSelectedStreetlight() {
    if (!state.selectedStreetlightId) return false;
    const before = state.streetlights.length;
    state.streetlights = state.streetlights.filter(l => l.id !== state.selectedStreetlightId);
    state.selectedStreetlightId = null;
    if (before !== state.streetlights.length) {
      syncAll();
      return true;
    }
    return false;
  }

  function placeStreetlight(p) {
    const anchored = state.streetlightMode === 'anchored';
    const l = normalizeStreetlight({
      id: uid('light'),
      kind: 'streetlight',
      mode: anchored ? 'anchored' : 'free',
      name: (anchored ? 'Anchored Streetlight ' : 'Streetlight ') + (state.streetlights.length + 1),
      x: p.x,
      y: p.y,
      type: 'singleArm',
      heightMm: 8,
      armLengthMm: 3.5,
      rotationDeg: 0,
      lightRadiusMm: 2,
      poleDiameterMm: .45,
      color: '#c84a3a',
      locked: false,
      notes: '',
      anchor: anchored
        ? { mountMode: 'sidewalkCutHole', cutHoleDiameterMm: 1.2, bulbMountDiameterMm: 3.0, edgeOffsetMm: .5, lockToRoadEdge: false, targetRoadId: null, sidewalkSide: 'auto' }
        : { mountMode: 'free' },
    });
    state.streetlights.push(l);
    state.selectedStreetlightId = l.id;
    clearBuildingSelection();
    state.selectedAnnotationId = null;
    syncAll();
  }

  function duplicateStreetlight(l) {
    const c = structuredClone(normalizeStreetlight(l));
    c.id = uid('light');
    c.name = (c.name || 'Streetlight') + ' copy';
    c.x += 16;
    c.y += 16;
    state.streetlights.push(c);
    state.selectedStreetlightId = c.id;
    clearBuildingSelection();
    state.selectedAnnotationId = null;
    return c;
  }

  return {
    normalizeStreetlight,
    hitStreetlight,
    selectedStreetlight,
    deleteSelectedStreetlight,
    placeStreetlight,
    duplicateStreetlight,
  };
}
