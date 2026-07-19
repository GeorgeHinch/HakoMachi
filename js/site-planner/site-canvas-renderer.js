export function createSiteCanvasRenderer(deps) {
  const {
    canvas,
    state,
    ctx,
    fmt,
    pxToMm,
    dist,
    drawGrid,
    drawAnnotations,
    drawLine,
    drawBenchwork,
    drawRoadLayer,
    drawTrack,
    drawGeneratedRailCrossings,
    drawTrackAccessory,
    drawFabricRegion,
    drawBuilding,
    drawStlObject,
    drawStreetlight,
    createRoadCenterlineFromPoints,
    drawRoad,
    normalizeTrack,
    drawFabricDraft,
    drawGroupSelectionAffordance,
    drawSelectionMarquee,
    drawHoverPreview,
    updateEmptyImageOverlay,
    updateStatus,
    draw,
  } = deps;

  function drawRoadDraft() {
    if (!state.roadDraft.length) return;
    ctx.save();
    ctx.strokeStyle = '#6f6a5e';
    ctx.fillStyle = 'rgba(111,106,94,.18)';
    ctx.lineWidth = 3 / state.view.scale;
    if (state.roadMode === 'centerline' && state.roadDraft.length >= 2) {
      const temp = createRoadCenterlineFromPoints(state.roadDraft);
      temp.id = 'road_draft';
      drawRoad(temp);
    } else {
      ctx.beginPath();
      state.roadDraft.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
      ctx.stroke();
    }
    state.roadDraft.forEach(point => { ctx.beginPath(); ctx.arc(point.x, point.y, 4 / state.view.scale, 0, Math.PI * 2); ctx.fill(); });
    ctx.restore();
  }

  function drawTrackDraft() {
    if (!state.trackDraft?.length) return;
    ctx.save();
    const temp = normalizeTrack({ id: 'track_draft', name: 'Track preview', pointsPx: state.trackDraft.slice(), gaugeMm: 9, tieSpacingMm: 4, color: '#4b4438', tieColor: '#8a6f43' });
    drawTrack(temp);
    ctx.fillStyle = 'rgba(75,68,56,.20)';
    state.trackDraft.forEach(point => { ctx.beginPath(); ctx.arc(point.x, point.y, 4 / state.view.scale, 0, Math.PI * 2); ctx.fill(); });
    ctx.restore();
  }

  function drawBenchworkDraft() {
    if (!state.benchworkDraft.length) return;
    ctx.save();
    ctx.strokeStyle = '#2f6f4e';
    ctx.fillStyle = 'rgba(47,111,78,.12)';
    ctx.lineWidth = 3 / state.view.scale;
    ctx.setLineDash([8 / state.view.scale, 6 / state.view.scale]);
    ctx.beginPath();
    state.benchworkDraft.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.stroke();
    ctx.setLineDash([]);
    state.benchworkDraft.forEach(point => { ctx.beginPath(); ctx.arc(point.x, point.y, 4 / state.view.scale, 0, Math.PI * 2); ctx.fill(); });
    ctx.restore();
  }

  function drawBuildingDraft() {
    if (!state.polygonDraft.length) return;
    ctx.save();
    ctx.strokeStyle = '#7c5f3f';
    ctx.fillStyle = 'rgba(124,95,63,.20)';
    ctx.lineWidth = 3 / state.view.scale;
    ctx.beginPath();
    state.polygonDraft.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.stroke();
    state.polygonDraft.forEach(point => { ctx.beginPath(); ctx.arc(point.x, point.y, 4 / state.view.scale, 0, Math.PI * 2); ctx.fill(); });
    ctx.restore();
  }

  function drawNow() {
    const rect = canvas.getBoundingClientRect();
    const dpr = globalThis.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.save();
    ctx.translate(state.view.x, state.view.y);
    ctx.scale(state.view.scale, state.view.scale);
    drawGrid();
    if (state.image) {
      ctx.save();
      ctx.globalAlpha = state.imageOpacity;
      ctx.drawImage(state.image, 0, 0);
      ctx.restore();
    }
    drawAnnotations();
    const calLabel = (state.calibrationLine && state.pxPerMm) ? `${fmt(pxToMm(dist({ x: state.calibrationLine.x1, y: state.calibrationLine.y1 }, { x: state.calibrationLine.x2, y: state.calibrationLine.y2 })))} mm` : 'calibration';
    drawLine(state.calibrationLine, '#b8672d', calLabel);
    const measureLabel = (state.measureLine && state.pxPerMm) ? `${fmt(pxToMm(dist({ x: state.measureLine.x1, y: state.measureLine.y1 }, { x: state.measureLine.x2, y: state.measureLine.y2 })))} mm` : 'measure';
    drawLine(state.measureLine, '#3f7a50', measureLabel);
    state.benchworkOutlines.forEach(drawBenchwork);
    drawRoadLayer();
    (state.tracks || []).forEach(drawTrack);
    drawGeneratedRailCrossings();
    (state.trackAccessories || []).forEach(drawTrackAccessory);
    (state.fabricRegions || []).forEach(drawFabricRegion);
    state.buildings.forEach(drawBuilding);
    (state.stlObjects || []).forEach(drawStlObject);
    state.streetlights.forEach(drawStreetlight);
    drawRoadDraft();
    drawTrackDraft();
    drawBenchworkDraft();
    drawFabricDraft();
    drawBuildingDraft();
    if (state.drag?.preview) {
      if (state.drag.type === 'roadCenterline') drawRoad(state.drag.preview);
      else drawBuilding(state.drag.preview);
    }
    drawGroupSelectionAffordance();
    drawSelectionMarquee();
    drawHoverPreview();
    ctx.restore();
    updateEmptyImageOverlay();
    updateStatus();
  }

  function fitImage() {
    const rect = canvas.getBoundingClientRect();
    if (!state.image) {
      state.view = { x: rect.width / 2, y: rect.height / 2, scale: 1 };
      draw();
      return;
    }
    const scale = Math.min(rect.width / state.image.width, rect.height / state.image.height) * 0.9;
    state.view.scale = scale;
    state.view.x = (rect.width - state.image.width * scale) / 2;
    state.view.y = (rect.height - state.image.height * scale) / 2;
    draw();
  }

  return { drawNow, fitImage };
}
