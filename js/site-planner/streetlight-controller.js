export function createStreetlightController(deps) {
  const {
    state,
    uid,
    rad,
    ctx,
    dist,
    mmToPx,
    clearBuildingSelection,
    isSiteObjectSelected,
    drawLabel,
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

  function drawStreetlight(l) {
    l = normalizeStreetlight(l);
    const selected = l.id === state.selectedStreetlightId || isSiteObjectSelected('streetlight', l.id);
    const hovered = l.id === state.hoverStreetlightId;
    const armPx = Math.max(10, state.pxPerMm ? mmToPx(l.armLengthMm || 3.5) : 14) / state.view.scale;
    const a = rad(l.rotationDeg || 0);
    ctx.save();
    ctx.translate(l.x, l.y); ctx.rotate(a);
    const isAnchored = l.mode === 'anchored';
    ctx.lineWidth = (selected ? 3 : 2) / state.view.scale;
    ctx.strokeStyle = selected ? '#0f766e' : (isAnchored ? '#c84a3a' : '#2a64aa');
    ctx.fillStyle = isAnchored ? 'rgba(200,74,58,.18)' : 'rgba(42,100,170,.16)';
    if (isAnchored) {
      const mount = l.anchor?.mountMode || 'sidewalkCutHole';
      const diaMm = mount === 'roadEdgeBulbMount' ? (l.anchor?.bulbMountDiameterMm || 3) : (l.anchor?.cutHoleDiameterMm || 1.2);
      const mr = Math.max(4, state.pxPerMm ? mmToPx(diaMm / 2) : 6) / state.view.scale;
      ctx.beginPath(); ctx.arc(0, 0, mr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      if (mount === 'sidewalkCutHole') {
        ctx.beginPath(); ctx.moveTo(-mr * .65, 0); ctx.lineTo(mr * .65, 0); ctx.moveTo(0, -mr * .65); ctx.lineTo(0, mr * .65); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(0, 0, mr * 1.45, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.fillStyle = l.color || '#c84a3a'; ctx.strokeStyle = selected ? '#0f766e' : '#3a2b1e';
    ctx.lineWidth = 1.5 / state.view.scale;
    ctx.beginPath(); ctx.arc(0, 0, 4 / state.view.scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -armPx * 1.2); ctx.lineTo(armPx, -armPx * 1.2); ctx.stroke();
    if (l.type === 'doubleArm') { ctx.beginPath(); ctx.moveTo(0, -armPx * 1.2); ctx.lineTo(-armPx, -armPx * 1.2); ctx.stroke(); }
    ctx.fillStyle = '#f7d87a'; ctx.beginPath(); ctx.arc(armPx, -armPx * 1.2, 3 / state.view.scale, 0, Math.PI * 2); ctx.fill();
    if (l.type === 'doubleArm') { ctx.beginPath(); ctx.arc(-armPx, -armPx * 1.2, 3 / state.view.scale, 0, Math.PI * 2); ctx.fill(); }
    if (selected || hovered) {
      ctx.strokeStyle = 'rgba(15,118,110,.9)';
      ctx.lineWidth = 1.25 / state.view.scale;
      ctx.strokeRect(-12 / state.view.scale, -armPx * 1.2 - 9 / state.view.scale, Math.max(24 / state.view.scale, armPx + 18 / state.view.scale), armPx * 1.2 + 20 / state.view.scale);
    }
    ctx.restore();
    if (selected || hovered) drawLabel(`${l.name || 'Streetlight'}${l.mode === 'anchored' ? ' · anchored' : ''}`, { x: l.x + 8 / state.view.scale, y: l.y - 8 / state.view.scale });
  }

  return {
    normalizeStreetlight,
    hitStreetlight,
    selectedStreetlight,
    deleteSelectedStreetlight,
    placeStreetlight,
    duplicateStreetlight,
    drawStreetlight,
  };
}
