export function createAnnotationController(deps) {
  const {
    state,
    ctx,
    uid,
    dist,
    distanceToSegment,
    renderList,
    renderSelected,
    draw,
    markDirty,
  } = deps;

  function hitAnnotation(p, pointerType = 'mouse') {
    const coarse = pointerType === 'pen' || pointerType === 'touch' || matchMedia('(pointer: coarse)').matches;
    const tol = (coarse ? 18 : 9) / state.view.scale;
    for (let si = state.annotations.length - 1; si >= 0; si--) {
      const st = state.annotations[si], pts = st.points || [];
      if (pts.length < 2) continue;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const pr = ((a.pressure || .5) + (b.pressure || .5)) / 2;
        const visual = ((st.baseWidth || 2.2) * (0.55 + pr * 1.45)) / state.view.scale;
        if (distanceToSegment(p, a, b) <= tol + visual / 2) return st;
      }
    }
    return null;
  }

  function selectedAnnotation() {
    return state.annotations.find(st => st.id === state.selectedAnnotationId) || null;
  }

  function deleteSelectedAnnotation() {
    if (!state.selectedAnnotationId) return false;
    const before = state.annotations.length;
    state.annotations = state.annotations.filter(st => st.id !== state.selectedAnnotationId);
    state.selectedAnnotationId = null;
    if (before !== state.annotations.length) {
      renderSelected();
      draw();
      markDirty('annotation deleted');
      return true;
    }
    return false;
  }

  function startAnnotationStroke(e, p) {
    const pressure = (e.pressure && e.pressure > 0 ? e.pressure : .5);
    const stroke = { id: uid('note'), points: [{ x: p.x, y: p.y, pressure }], color: '#6f4326', baseWidth: 2.2 };
    state.annotations.push(stroke);
    state.selectedAnnotationId = stroke.id;
    state.selectedId = null;
    state.selectedStlObjectId = null;
    renderList();
    renderSelected();
    state.drag = { type: 'annotate', pointerId: e.pointerId, strokeId: stroke.id };
  }

  function addAnnotationPoint(e, p) {
    const st = state.annotations.find(s => s.id === state.drag?.strokeId);
    if (!st) return;
    const pressure = (e.pressure && e.pressure > 0 ? e.pressure : .5);
    const last = st.points[st.points.length - 1];
    if (!last || dist(last, p) > 1.5 / state.view.scale) st.points.push({ x: p.x, y: p.y, pressure });
  }

  function drawAnnotations() {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    state.annotations.forEach(st => {
      const pts = st.points || [];
      if (pts.length < 2) return;
      const selected = st.id === state.selectedAnnotationId;
      if (selected) {
        ctx.strokeStyle = 'rgba(200,74,58,.55)';
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1], b = pts[i];
          const pr = ((a.pressure || .5) + (b.pressure || .5)) / 2;
          ctx.lineWidth = ((st.baseWidth || 2.2) * (0.55 + pr * 1.45) + 8) / state.view.scale;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      ctx.strokeStyle = st.color || '#6f4326';
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const pr = ((a.pressure || .5) + (b.pressure || .5)) / 2;
        ctx.lineWidth = (st.baseWidth || 2.2) * (0.55 + pr * 1.45) / state.view.scale;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  return {
    hitAnnotation,
    selectedAnnotation,
    deleteSelectedAnnotation,
    startAnnotationStroke,
    addAnnotationPoint,
    drawAnnotations,
  };
}
