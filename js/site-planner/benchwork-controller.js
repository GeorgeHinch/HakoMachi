export function createBenchworkController(deps) {
  const {
    state,
    uid,
    pxToMm,
    quadPoint,
    distanceToSegment,
    pointInPoly,
    polygonCenter,
    ctx,
    clearBuildingSelection,
    isSiteObjectSelected,
    drawLabel,
    syncAll,
  } = deps;

  function normalizeBenchworkCurves(bw) {
    const n = Math.max(0, (bw?.pointsPx || []).length);
    const src = Array.isArray(bw?.curvesPx) ? bw.curvesPx : (Array.isArray(bw?.curves) ? bw.curves : []);
    bw.curvesPx = [];
    for (let i = 0; i < n; i++) {
      const c = src[i];
      bw.curvesPx[i] = c && Number.isFinite(Number(c.x)) && Number.isFinite(Number(c.y)) ? { x: Number(c.x), y: Number(c.y) } : null;
    }
    return bw.curvesPx;
  }

  function normalizeBenchworkOutline(bw) {
    if (!bw) return bw;
    bw.id = bw.id || uid('benchwork');
    bw.name = bw.name || `Benchwork Outline ${state.benchworkOutlines.length + 1}`;
    bw.pointsPx = Array.isArray(bw.pointsPx) ? bw.pointsPx.map(p => ({ x: Number(p.x) || 0, y: Number(p.y) || 0 })) : [];
    if (!bw.pointsPx.length && Array.isArray(bw.polygon)) bw.pointsPx = bw.polygon.map(p => ({ x: Number(p.x) || 0, y: Number(p.y) || 0 }));
    normalizeBenchworkCurves(bw);
    bw.color = bw.color || '#2f6f4e';
    bw.hidden = !!bw.hidden;
    bw.locked = !!bw.locked;
    bw.notes = bw.notes || '';
    if (state.pxPerMm) {
      bw.pointsMm = bw.pointsPx.map(p => ({ x: pxToMm(p.x), y: pxToMm(p.y) }));
      bw.curvesMm = (bw.curvesPx || []).map(c => c ? { x: pxToMm(c.x), y: pxToMm(c.y) } : null);
    }
    return bw;
  }

  function benchworkSamples(bw, perCurve = 18) {
    normalizeBenchworkOutline(bw);
    const pts = bw.pointsPx || [];
    if (pts.length < 2) return pts.slice();
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], c = bw.curvesPx?.[i];
      if (i === 0) out.push({ x: a.x, y: a.y });
      if (c) {
        for (let k = 1; k <= perCurve; k++) out.push(quadPoint(a, c, b, k / perCurve));
      } else {
        out.push({ x: b.x, y: b.y });
      }
    }
    return out;
  }

  function hitBenchworkSegment(p, bw, pointerType = 'mouse') {
    if (!bw || !Array.isArray(bw.pointsPx) || bw.pointsPx.length < 2) return null;
    normalizeBenchworkOutline(bw);
    const coarse = pointerType === 'pen' || pointerType === 'touch' || matchMedia('(pointer: coarse)').matches;
    const tol = (coarse ? 18 : 10) / state.view.scale;
    let best = { distance: Infinity, index: -1 };
    for (let i = 0; i < bw.pointsPx.length; i++) {
      const a = bw.pointsPx[i], b = bw.pointsPx[(i + 1) % bw.pointsPx.length], c = bw.curvesPx?.[i];
      if (c) {
        let prev = a;
        for (let k = 1; k <= 18; k++) {
          const cur = quadPoint(a, c, b, k / 18);
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

  function selectedBenchwork() {
    return state.benchworkOutlines.find(b => b.id === state.selectedBenchworkId) || null;
  }

  function benchworkCenter(bw) {
    return polygonCenter((bw && bw.pointsPx) || []);
  }

  function drawBenchworkPath(bw) {
    const pts = bw.pointsPx || [];
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 0; i < pts.length; i++) {
      const b = pts[(i + 1) % pts.length], c = bw.curvesPx?.[i];
      if (c) ctx.quadraticCurveTo(c.x, c.y, b.x, b.y);
      else ctx.lineTo(b.x, b.y);
    }
  }

  function drawBenchwork(bw) {
    if (!bw || bw.hidden || !Array.isArray(bw.pointsPx) || bw.pointsPx.length < 2) return;
    normalizeBenchworkOutline(bw);
    const selected = bw.id === state.selectedBenchworkId || isSiteObjectSelected('benchwork', bw.id);
    const hovered = bw.id === state.hoverBenchworkId;
    ctx.save();
    ctx.lineWidth = (selected ? 5 : (hovered ? 4 : 3)) / state.view.scale;
    ctx.strokeStyle = selected ? '#0f766e' : (hovered ? '#2a64aa' : (bw.color || '#2f6f4e'));
    ctx.fillStyle = 'rgba(47,111,78,.045)';
    ctx.setLineDash(selected ? [12 / state.view.scale, 7 / state.view.scale] : [9 / state.view.scale, 7 / state.view.scale]);
    drawBenchworkPath(bw);
    if (bw.pointsPx.length >= 3) ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    if (selected) {
      ctx.fillStyle = '#fff7ed'; ctx.strokeStyle = '#0f766e'; ctx.lineWidth = 2 / state.view.scale;
      bw.pointsPx.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 5 / state.view.scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });
      (bw.curvesPx || []).forEach((c, i) => {
        if (!c) return;
        const a = bw.pointsPx[i], b = bw.pointsPx[(i + 1) % bw.pointsPx.length];
        ctx.save(); ctx.strokeStyle = 'rgba(15,118,110,.45)'; ctx.setLineDash([4 / state.view.scale, 4 / state.view.scale]);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(c.x, c.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore();
        ctx.beginPath(); ctx.arc(c.x, c.y, 5 / state.view.scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });
      if (state.hoverBenchworkSegment && state.hoverBenchworkSegment.benchworkId === bw.id) {
        const i = state.hoverBenchworkSegment.index, a = bw.pointsPx[i], b = bw.pointsPx[(i + 1) % bw.pointsPx.length], c = bw.curvesPx?.[i];
        ctx.save(); ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 7 / state.view.scale; ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(a.x, a.y);
        if (c) ctx.quadraticCurveTo(c.x, c.y, b.x, b.y); else ctx.lineTo(b.x, b.y);
        ctx.stroke(); ctx.restore();
      }
      const c = benchworkCenter(bw);
      drawLabel('Benchwork outline / trim boundary', { x: c.x + 8 / state.view.scale, y: c.y - 8 / state.view.scale });
    }
    ctx.restore();
  }

  function hitBenchwork(p, pointerType = 'mouse') {
    for (let i = state.benchworkOutlines.length - 1; i >= 0; i--) {
      const bw = normalizeBenchworkOutline(state.benchworkOutlines[i]);
      if (bw.hidden) continue;
      const segmentHit = hitBenchworkSegment(p, bw, pointerType);
      if (bw.locked) {
        if (segmentHit) return bw;
        continue;
      }
      const samples = benchworkSamples(bw);
      if (samples.length >= 3 && pointInPoly(p, samples)) return bw;
      if (segmentHit) return bw;
    }
    return null;
  }

  function moveBenchwork(bw, dx, dy) {
    if (!bw || bw.locked) return;
    bw.pointsPx = (bw.pointsPx || []).map(p => ({ x: p.x + dx, y: p.y + dy }));
    bw.curvesPx = (bw.curvesPx || []).map(c => c ? { x: c.x + dx, y: c.y + dy } : null);
    normalizeBenchworkOutline(bw);
  }

  function finishBenchworkOutline() {
    if (state.benchworkDraft.length < 3) return;
    const bw = normalizeBenchworkOutline({
      id: uid('benchwork'),
      name: `Benchwork Outline ${state.benchworkOutlines.length + 1}`,
      pointsPx: state.benchworkDraft.slice(),
      curvesPx: [],
      color: '#2f6f4e',
      locked: false,
      hidden: false,
      notes: 'Anything outside this boundary is intended to be trimmed during future layout export.',
    });
    state.benchworkOutlines.push(bw);
    clearBuildingSelection();
    state.selectedRoadId = null;
    state.selectedStreetlightId = null;
    state.selectedAnnotationId = null;
    state.selectedBenchworkId = bw.id;
    state.benchworkDraft = [];
    syncAll();
  }

  function deleteSelectedBenchwork() {
    if (!state.selectedBenchworkId) return false;
    state.benchworkOutlines = state.benchworkOutlines.filter(b => b.id !== state.selectedBenchworkId);
    state.selectedBenchworkId = null;
    syncAll();
    return true;
  }

  return {
    normalizeBenchworkCurves,
    normalizeBenchworkOutline,
    benchworkSamples,
    hitBenchworkSegment,
    selectedBenchwork,
    benchworkCenter,
    drawBenchwork,
    hitBenchwork,
    moveBenchwork,
    finishBenchworkOutline,
    deleteSelectedBenchwork,
  };
}
