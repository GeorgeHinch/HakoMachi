export function createCanvasDrawingController({
  canvas,
  ctx,
  state,
  mmToPx,
  screenToWorld,
  selectionRectFromPoints,
}) {
  function drawGrid() {
    if (!state.pxPerMm) return;
    const stepMm = state.view.scale * state.pxPerMm > 30
      ? 10
      : state.view.scale * state.pxPerMm > 8
        ? 25
        : 50;
    const step = mmToPx(stepMm);
    const rect = canvas.getBoundingClientRect();
    const min = screenToWorld({ clientX: rect.left, clientY: rect.top });
    const max = screenToWorld({ clientX: rect.right, clientY: rect.bottom });
    ctx.save();
    ctx.strokeStyle = 'rgba(107,81,57,.18)';
    ctx.lineWidth = 1 / state.view.scale;
    for (let x = Math.floor(min.x / step) * step; x < max.x; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, min.y);
      ctx.lineTo(x, max.y);
      ctx.stroke();
    }
    for (let y = Math.floor(min.y / step) * step; y < max.y; y += step) {
      ctx.beginPath();
      ctx.moveTo(min.x, y);
      ctx.lineTo(max.x, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawLabel(text, point) {
    ctx.save();
    ctx.font = `${12 / state.view.scale}px system-ui`;
    const width = ctx.measureText(text).width + 8 / state.view.scale;
    const height = 18 / state.view.scale;
    ctx.fillStyle = 'rgba(49,35,24,.88)';
    ctx.fillRect(point.x, point.y - height, width, height);
    ctx.fillStyle = '#fff7ed';
    ctx.fillText(text, point.x + 4 / state.view.scale, point.y - 5 / state.view.scale);
    ctx.restore();
  }

  function drawLine(line, color, label) {
    if (!line) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3 / state.view.scale;
    ctx.beginPath();
    ctx.moveTo(line.x1, line.y1);
    ctx.lineTo(line.x2, line.y2);
    ctx.stroke();
    ctx.fillStyle = color;
    [{ x: line.x1, y: line.y1 }, { x: line.x2, y: line.y2 }].forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4 / state.view.scale, 0, Math.PI * 2);
      ctx.fill();
    });
    if (label) drawLabel(label, { x: (line.x1 + line.x2) / 2, y: (line.y1 + line.y2) / 2 });
    ctx.restore();
  }

  function drawSelectionMarquee() {
    if (!state.drag || state.drag.type !== 'marquee') return;
    const rect = selectionRectFromPoints(state.drag.start, state.drag.end || state.drag.start);
    ctx.save();
    ctx.fillStyle = 'rgba(42,100,170,.12)';
    ctx.strokeStyle = '#2a64aa';
    ctx.lineWidth = 1.5 / state.view.scale;
    ctx.setLineDash([6 / state.view.scale, 4 / state.view.scale]);
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  }

  return {
    drawGrid,
    drawLabel,
    drawLine,
    drawSelectionMarquee,
  };
}
