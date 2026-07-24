export function createSiteCanvasPathRenderer({ ctx, state }) {
  function drawPoly(points, fill = true, stroke = true) {
    if (!Array.isArray(points) || points.length < 2) return;
    ctx.beginPath();
    points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    if (points.length > 2) ctx.closePath();
    if (fill && points.length > 2) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function drawRoadGeneratedPath(path, stroke, width = 1.4, dash = null) {
    if (!Array.isArray(path) || path.length < 2) return;
    ctx.save();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width / state.view.scale;
    if (dash) ctx.setLineDash(dash.map(value => value / state.view.scale));
    ctx.beginPath();
    path.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.stroke();
    ctx.restore();
  }

  function drawTrackModelPath(path, stroke, width = 1.4, alpha = 1) {
    if (!Array.isArray(path) || path.length < 2) return;
    ctx.save();
    ctx.strokeStyle = stroke;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    path.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.stroke();
    ctx.restore();
  }

  return Object.freeze({ drawPoly, drawRoadGeneratedPath, drawTrackModelPath });
}
