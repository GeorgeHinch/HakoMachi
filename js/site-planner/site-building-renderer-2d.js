export function createSiteBuildingRenderer2D(deps) {
  const {
    state,
    ctx,
    dist,
    fmt,
    polygonCenter,
    buildingCenter,
    rotateHandlePoint,
    hakoDisplayTrimPolylinesMm,
    hakoLocalMmToWorld,
    syncBuildingMetrics,
    visibleBuildingPolygons,
    isSiteObjectSelected,
    currentSelectedBuildingIds,
    drawLabel,
  } = deps;

  function drawRotateAffordance(building, points) {
    const center = buildingCenter(building);
    const rotationHandle = rotateHandlePoint(building);
    const radius = Math.max(...points.map(point => dist(center, point))) + 18 / state.view.scale;
    ctx.save();
    ctx.strokeStyle = 'rgba(15,118,110,.55)';
    ctx.fillStyle = 'rgba(15,118,110,.14)';
    ctx.lineWidth = 2 / state.view.scale;
    ctx.setLineDash([7 / state.view.scale, 6 / state.view.scale]);
    ctx.beginPath(); ctx.arc(center.x, center.y, radius, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(center.x, center.y); ctx.lineTo(rotationHandle.x, rotationHandle.y); ctx.stroke();
    ctx.beginPath(); ctx.arc(rotationHandle.x, rotationHandle.y, 9 / state.view.scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.font = `${13 / state.view.scale}px system-ui`;
    ctx.fillStyle = '#0f766e';
    ctx.fillText('↻', rotationHandle.x - 4 / state.view.scale, rotationHandle.y + 5 / state.view.scale);
    ctx.restore();
  }

  function drawHakoTrimLines(building, strong = false) {
    const trimLines = hakoDisplayTrimPolylinesMm(building);
    if (!building || building.showHakoTrimLines === false || !trimLines.length || !state.pxPerMm) return;
    ctx.save();
    ctx.strokeStyle = strong ? '#d95f24' : 'rgba(217,95,36,.65)';
    ctx.lineWidth = (strong ? 2.4 : 1.6) / state.view.scale;
    ctx.setLineDash([8 / state.view.scale, 5 / state.view.scale]);
    trimLines.forEach(line => {
      const points = line.points;
      if (!points.length) return;
      ctx.beginPath();
      points.forEach((point, index) => {
        const world = hakoLocalMmToWorld(building, point);
        if (index) ctx.lineTo(world.x, world.y); else ctx.moveTo(world.x, world.y);
      });
      ctx.stroke();
      if (!strong) return;
      const first = hakoLocalMmToWorld(building, points[0]);
      const last = hakoLocalMmToWorld(building, points[points.length - 1]);
      ctx.setLineDash([]);
      ctx.fillStyle = '#d95f24';
      [first, last].forEach(point => { ctx.beginPath(); ctx.arc(point.x, point.y, 3.5 / state.view.scale, 0, Math.PI * 2); ctx.fill(); });
      ctx.setLineDash([8 / state.view.scale, 5 / state.view.scale]);
    });
    ctx.restore();
  }

  function drawBuilding(building) {
    if (building.hidden) return;
    syncBuildingMetrics(building);
    ctx.save();
    const selected = isSiteObjectSelected('building', building.id);
    const hovered = building.id === state.hoverBuildingId;
    ctx.lineWidth = (selected ? 4 : (hovered ? 4 : 3)) / state.view.scale;
    ctx.strokeStyle = selected ? '#0f766e' : (hovered ? '#2a64aa' : building.color);
    ctx.fillStyle = hovered && !selected ? 'rgba(42,100,170,.18)' : ((building.color || '#d79631') + '33');
    const polygons = visibleBuildingPolygons(building);
    const points = polygons.flat();
    polygons.forEach(polygon => {
      if (polygon.length < 3) return;
      ctx.beginPath();
      polygon.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
    const trimLines = hakoDisplayTrimPolylinesMm(building);
    if ((selected || hovered) && trimLines.length) drawHakoTrimLines(building, selected);
    if (selected || hovered) {
      const center = building.padType === 'rect' ? { x: building.x, y: building.y } : polygonCenter(points);
      const trimNote = trimLines.length ? ` · ${trimLines.length} trim line${trimLines.length === 1 ? '' : 's'}` : '';
      drawLabel(`${building.name || 'Building'} ${building.padType === 'rect' && state.pxPerMm ? `${fmt(building.widthMm)}×${fmt(building.depthMm)}mm` : ''}${trimNote}`, { x: center.x + 6 / state.view.scale, y: center.y - 6 / state.view.scale });
    }
    if (selected && currentSelectedBuildingIds().length === 1 && !building.locked) {
      ctx.fillStyle = '#0f766e';
      points.forEach(point => { ctx.beginPath(); ctx.arc(point.x, point.y, 5 / state.view.scale, 0, Math.PI * 2); ctx.fill(); });
      drawRotateAffordance(building, points);
    }
    ctx.restore();
  }

  return { drawBuilding };
}
