const DEFAULT_STYLES = Object.freeze({
  crosswalkFill: 'rgba(247, 242, 223, 0.88)',
  crosswalkStroke: 'rgba(247, 242, 223, 0.98)',
  stopBarFill: 'rgba(247, 242, 223, 0.95)',
  stopBarStroke: 'rgba(247, 242, 223, 1)',
  tactileFill: 'rgba(216, 185, 90, 0.55)',
  tactileStroke: 'rgba(140, 106, 47, 0.85)',
  curbGuideStroke: 'rgba(138, 118, 95, 0.75)',
  nodeFill: 'rgba(200, 74, 58, 0.22)',
  nodeStroke: 'rgba(200, 74, 58, 0.75)',
  labelFill: 'rgba(255, 253, 247, 0.92)',
  labelStroke: 'rgba(112, 96, 72, 0.38)',
  labelText: '#3d3024',
});

function finitePoint(point) {
  return point && Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y));
}

function mergedOptions(options = {}) {
  return {
    viewScale: 1,
    showNodes: true,
    showLabels: false,
    showCurbGuides: true,
    showCrosswalks: true,
    showStopBars: true,
    showTactilePavers: true,
    styles: {},
    ...options,
  };
}

function styles(options) {
  return { ...DEFAULT_STYLES, ...(options.styles || {}) };
}

function drawPolygon(ctx, points = [], fill, stroke, lineWidth = 1) {
  const clean = points.filter(finitePoint);
  if (clean.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(clean[0].x, clean[0].y);
  clean.slice(1).forEach(point => ctx.lineTo(point.x, point.y));
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function drawCircle(ctx, center, radius, fill, stroke, lineWidth = 1) {
  if (!finitePoint(center) || !Number.isFinite(Number(radius))) return;
  ctx.beginPath();
  ctx.arc(center.x, center.y, Math.max(0, radius), 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function drawCurbGuide(ctx, guide, style, viewScale) {
  if (!guide?.center || !Number.isFinite(Number(guide.radiusPx))) return;
  const radius = Math.max(0, Number(guide.radiusPx) || 0);
  if (!radius) return;
  ctx.save();
  ctx.strokeStyle = style.curbGuideStroke;
  ctx.lineWidth = 1.2 / viewScale;
  ctx.setLineDash([5 / viewScale, 3 / viewScale]);
  ctx.beginPath();
  ctx.arc(guide.center.x, guide.center.y, radius, guide.startAngle || 0, guide.endAngle || 0);
  ctx.stroke();
  ctx.restore();
}

export function drawIntersectionCrosswalks(ctx, intersection, options = {}) {
  const opts = mergedOptions(options);
  if (!opts.showCrosswalks) return 0;
  const style = styles(opts);
  let count = 0;
  (intersection.crosswalks || []).forEach(crosswalk => {
    (crosswalk.stripes || []).forEach(stripe => {
      drawPolygon(ctx, stripe.corners, style.crosswalkFill, style.crosswalkStroke, 0.55 / opts.viewScale);
      count += 1;
    });
  });
  return count;
}

export function drawIntersectionStopBars(ctx, intersection, options = {}) {
  const opts = mergedOptions(options);
  if (!opts.showStopBars) return 0;
  const style = styles(opts);
  let count = 0;
  (intersection.stopBars || []).forEach(stopBar => {
    drawPolygon(ctx, stopBar.corners, style.stopBarFill, style.stopBarStroke, 0.55 / opts.viewScale);
    count += 1;
  });
  return count;
}

export function drawIntersectionTactilePavers(ctx, intersection, options = {}) {
  const opts = mergedOptions(options);
  if (!opts.showTactilePavers) return 0;
  const style = styles(opts);
  let count = 0;
  (intersection.tactilePavers || []).forEach(paver => {
    drawPolygon(ctx, paver.corners, style.tactileFill, style.tactileStroke, 0.75 / opts.viewScale);
    count += 1;
  });
  return count;
}

export function drawIntersectionCurbGuides(ctx, intersection, options = {}) {
  const opts = mergedOptions(options);
  if (!opts.showCurbGuides) return 0;
  const style = styles(opts);
  let count = 0;
  (intersection.curbReturns || []).forEach(guide => {
    drawCurbGuide(ctx, guide, style, opts.viewScale);
    count += 1;
  });
  return count;
}

export function drawIntersectionNode(ctx, intersection, options = {}) {
  const opts = mergedOptions(options);
  if (!opts.showNodes) return 0;
  const style = styles(opts);
  const radius = Math.max(3 / opts.viewScale, Math.min(12 / opts.viewScale, (intersection.maxRoadWidthPx || 24) * 0.12));
  drawCircle(ctx, intersection.center || intersection, radius, style.nodeFill, style.nodeStroke, 1.2 / opts.viewScale);
  return 1;
}

export function drawIntersectionLabel(ctx, intersection, options = {}) {
  const opts = mergedOptions(options);
  if (!opts.showLabels || !finitePoint(intersection.center || intersection)) return 0;
  const style = styles(opts);
  const center = intersection.center || intersection;
  const text = `${intersection.type || 'intersection'} · ${(intersection.arms || []).length} arms`;
  ctx.save();
  ctx.font = `${Math.max(10, 12 / opts.viewScale)}px system-ui, sans-serif`;
  const paddingX = 5 / opts.viewScale;
  const paddingY = 3 / opts.viewScale;
  const metrics = ctx.measureText(text);
  const x = center.x + 8 / opts.viewScale;
  const y = center.y - 8 / opts.viewScale;
  const width = metrics.width + paddingX * 2;
  const height = 15 / opts.viewScale + paddingY * 2;
  ctx.fillStyle = style.labelFill;
  ctx.strokeStyle = style.labelStroke;
  ctx.lineWidth = 1 / opts.viewScale;
  ctx.beginPath();
  ctx.roundRect?.(x, y - height, width, height, 5 / opts.viewScale);
  if (!ctx.roundRect) ctx.rect(x, y - height, width, height);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = style.labelText;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + paddingX, y - height / 2);
  ctx.restore();
  return 1;
}

export function drawRoadIntersection(ctx, intersection, options = {}) {
  const opts = mergedOptions(options);
  const counts = {
    curbGuides: drawIntersectionCurbGuides(ctx, intersection, opts),
    tactilePavers: drawIntersectionTactilePavers(ctx, intersection, opts),
    crosswalkStripes: drawIntersectionCrosswalks(ctx, intersection, opts),
    stopBars: drawIntersectionStopBars(ctx, intersection, opts),
    nodes: drawIntersectionNode(ctx, intersection, opts),
    labels: drawIntersectionLabel(ctx, intersection, opts),
  };
  return counts;
}

export function drawRoadIntersections(ctx, intersections = [], options = {}) {
  const opts = mergedOptions(options);
  const total = {
    intersections: 0,
    curbGuides: 0,
    tactilePavers: 0,
    crosswalkStripes: 0,
    stopBars: 0,
    nodes: 0,
    labels: 0,
  };
  ctx.save();
  intersections.forEach(intersection => {
    const counts = drawRoadIntersection(ctx, intersection, opts);
    total.intersections += 1;
    Object.keys(counts).forEach(key => { total[key] += counts[key] || 0; });
  });
  ctx.restore();
  return total;
}

export function createRoadIntersectionPreviewRenderer(defaultOptions = {}) {
  return {
    drawRoadIntersection: (ctx, intersection, options = {}) => drawRoadIntersection(ctx, intersection, { ...defaultOptions, ...options }),
    drawRoadIntersections: (ctx, intersections, options = {}) => drawRoadIntersections(ctx, intersections, { ...defaultOptions, ...options }),
    drawIntersectionCrosswalks,
    drawIntersectionStopBars,
    drawIntersectionTactilePavers,
    drawIntersectionCurbGuides,
    drawIntersectionNode,
    drawIntersectionLabel,
  };
}
