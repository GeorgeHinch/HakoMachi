export function createRailCrossingRenderer2D({
  ctx,
  state,
  drawLabel,
  generatedRailCrossings,
  railCrossingInfillPanels,
}) {
  function traceRailCrossingPanelPath(points) {
    ctx.beginPath();
    points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.closePath();
  }

  function drawRailCrossingPanelTexture(points, selected = false) {
    const xs = points.map(point => point.x);
    const ys = points.map(point => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const span = Math.max(maxX - minX, maxY - minY, 1);
    const spacing = Math.max(4 / state.view.scale, span * .12);
    ctx.save();
    traceRailCrossingPanelPath(points);
    ctx.clip();
    ctx.strokeStyle = selected ? 'rgba(255,247,237,.34)' : 'rgba(220,229,232,.25)';
    ctx.lineWidth = .75 / state.view.scale;
    for (let x = minX - span; x <= maxX + span; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, maxY + spacing);
      ctx.lineTo(x + span + spacing, minY - spacing);
      ctx.stroke();
    }
    ctx.strokeStyle = selected ? 'rgba(95,34,26,.45)' : 'rgba(31,39,45,.42)';
    ctx.lineWidth = .45 / state.view.scale;
    for (let x = minX - span + spacing * .5; x <= maxX + span; x += spacing * 2) {
      ctx.beginPath();
      ctx.moveTo(x, minY - spacing);
      ctx.lineTo(x + span + spacing, maxY + spacing);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRailCrossingPanel(panel, selected = false) {
    const points = panel.polygon || [];
    if (points.length < 3) return;
    ctx.save();
    ctx.fillStyle = selected ? 'rgba(95,77,72,.92)' : 'rgba(73,83,91,.88)';
    ctx.strokeStyle = selected ? '#c84a3a' : '#29333a';
    ctx.lineWidth = (selected ? 2 : 1) / state.view.scale;
    traceRailCrossingPanelPath(points);
    ctx.fill();
    drawRailCrossingPanelTexture(points, selected);
    traceRailCrossingPanelPath(points);
    ctx.stroke();
    ctx.restore();
  }

  function drawRailCrossingIndicator(crossing, selected = false) {
    if (!crossing?.point) return;
    const radius = Math.max((selected ? 5 : 3) / state.view.scale, Math.min((selected ? 16 : 12) / state.view.scale, (crossing.roadWidthPx || 24) * (selected ? .18 : .12)));
    const roadHalf = Math.max(radius * 1.45, 8 / state.view.scale);
    const trackHalf = Math.max(radius * 1.25, 7 / state.view.scale);
    ctx.save();
    ctx.fillStyle = selected ? 'rgba(255,247,237,.94)' : 'rgba(200,74,58,.22)';
    ctx.strokeStyle = selected ? '#c84a3a' : 'rgba(200,74,58,.75)';
    ctx.lineWidth = (selected ? 2 : 1.2) / state.view.scale;
    ctx.beginPath();
    ctx.arc(crossing.point.x, crossing.point.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.lineCap = 'round';
    ctx.strokeStyle = selected ? '#6f3f2f' : 'rgba(58,43,30,.7)';
    ctx.lineWidth = 1.1 / state.view.scale;
    const roadVector = crossing.roadVector || { x: 1, y: 0 };
    const trackVector = crossing.trackVector || { x: 0, y: 1 };
    ctx.beginPath();
    ctx.moveTo(crossing.point.x - roadVector.x * roadHalf, crossing.point.y - roadVector.y * roadHalf);
    ctx.lineTo(crossing.point.x + roadVector.x * roadHalf, crossing.point.y + roadVector.y * roadHalf);
    ctx.moveTo(crossing.point.x - trackVector.x * trackHalf, crossing.point.y - trackVector.y * trackHalf);
    ctx.lineTo(crossing.point.x + trackVector.x * trackHalf, crossing.point.y + trackVector.y * trackHalf);
    ctx.stroke();
    ctx.restore();
  }

  function drawGeneratedRailCrossings() {
    const crossings = generatedRailCrossings();
    const selectedId = state.selectedRailCrossingId;
    railCrossingInfillPanels(crossings).forEach(panel => drawRailCrossingPanel(panel));
    crossings.forEach(crossing => {
      if (crossing.enabled === false) return;
      const selected = selectedId && (selectedId === crossing.id || selectedId === crossing.key);
      (crossing.panels || []).forEach(panel => drawRailCrossingPanel(panel, selected));
      ctx.save();
      ctx.strokeStyle = selected ? '#fff7ed' : 'rgba(222,231,234,.62)';
      ctx.lineWidth = .7 / state.view.scale;
      (crossing.engraves || []).forEach(line => {
        ctx.beginPath();
        ctx.moveTo(line.a.x, line.a.y);
        ctx.lineTo(line.b.x, line.b.y);
        ctx.stroke();
      });
      ctx.restore();
      drawRailCrossingIndicator(crossing, selected);
      if (selected) drawLabel(`Rail crossing · ${crossing.trackName}`, { x: crossing.point.x + 8 / state.view.scale, y: crossing.point.y - 8 / state.view.scale });
    });
  }

  return { drawGeneratedRailCrossings };
}
