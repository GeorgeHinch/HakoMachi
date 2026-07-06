import { buildDrainageGrateInsert } from './road-drainage-grate-inserts.js';

const DEFAULT_STYLE = Object.freeze({
  roadCutFill: 'rgba(220, 220, 220, 0.35)',
  roadCutStroke: 'rgba(70, 70, 70, 0.8)',
  grateFill: 'rgba(40, 36, 32, 0.9)',
  grateStroke: 'rgba(0, 0, 0, 0.95)',
  slotFill: 'rgba(255, 255, 255, 0.85)',
  scoreStroke: 'rgba(220, 40, 40, 0.9)',
  guideStroke: 'rgba(60, 90, 170, 0.75)',
});

function drawRect(ctx, part, style) {
  ctx.beginPath();
  ctx.rect(part.x, part.y, part.width, part.height);
  if (style.fill) {
    ctx.fillStyle = style.fill;
    ctx.fill();
  }
  if (style.stroke) {
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.lineWidth || 0.2;
    ctx.stroke();
  }
}

function drawCircle(ctx, part, style) {
  ctx.beginPath();
  ctx.arc(part.cx, part.cy, part.r, 0, Math.PI * 2);
  if (style.fill) {
    ctx.fillStyle = style.fill;
    ctx.fill();
  }
  if (style.stroke) {
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.lineWidth || 0.2;
    ctx.stroke();
  }
}

function drawLine(ctx, part, style) {
  ctx.beginPath();
  ctx.moveTo(part.x1, part.y1);
  ctx.lineTo(part.x2, part.y2);
  ctx.strokeStyle = style.stroke;
  ctx.lineWidth = style.lineWidth || 0.15;
  if (style.dash) ctx.setLineDash(style.dash);
  ctx.stroke();
  if (style.dash) ctx.setLineDash([]);
}

function drawPart(ctx, part, style) {
  if (part.type === 'rect') drawRect(ctx, part, style);
  else if (part.type === 'circle') drawCircle(ctx, part, style);
  else if (part.type === 'line') drawLine(ctx, part, style);
}

export function drawPhysicalGrateInsert(ctx, grateOrSpec, options = {}) {
  const insert = grateOrSpec?.layers ? grateOrSpec : buildDrainageGrateInsert(grateOrSpec || {}, options.materialLibrary || {});
  const style = { ...DEFAULT_STYLE, ...(options.styles || {}) };
  const counts = { roadOpenings: 0, grateCuts: 0, scores: 0, guides: 0 };
  ctx.save();
  if (options.x || options.y || options.angle) {
    ctx.translate(options.x || 0, options.y || 0);
    ctx.rotate(options.angle || 0);
  }
  (insert.layers.roadDeckCut || []).forEach(part => { drawPart(ctx, part, { fill: style.roadCutFill, stroke: style.roadCutStroke, lineWidth: 0.18 }); counts.roadOpenings += 1; });
  (insert.layers.grateCut || []).forEach((part, index) => {
    const isSlot = String(part.id || '').includes('slot');
    drawPart(ctx, part, { fill: isSlot ? style.slotFill : style.grateFill, stroke: style.grateStroke, lineWidth: 0.14 });
    counts.grateCuts += 1;
  });
  (insert.layers.grateScore || []).forEach(part => { drawPart(ctx, part, { stroke: style.scoreStroke, lineWidth: 0.12, dash: [0.5, 0.35] }); counts.scores += 1; });
  if (options.showGuides !== false) {
    (insert.layers.grateGuide || []).forEach(part => { drawPart(ctx, part, { stroke: style.guideStroke, lineWidth: 0.1, dash: [0.4, 0.3] }); counts.guides += 1; });
  }
  ctx.restore();
  return counts;
}

export function drawPhysicalGrateInserts(ctx, grates = [], options = {}) {
  return grates.reduce((total, grate) => {
    const counts = drawPhysicalGrateInsert(ctx, grate, options);
    Object.keys(counts).forEach(key => { total[key] = (total[key] || 0) + counts[key]; });
    total.inserts = (total.inserts || 0) + 1;
    return total;
  }, { inserts: 0, roadOpenings: 0, grateCuts: 0, scores: 0, guides: 0 });
}

export function createPhysicalGratePreviewRenderer(defaultOptions = {}) {
  return {
    drawPhysicalGrateInsert: (ctx, grate, options = {}) => drawPhysicalGrateInsert(ctx, grate, { ...defaultOptions, ...options }),
    drawPhysicalGrateInserts: (ctx, grates, options = {}) => drawPhysicalGrateInserts(ctx, grates, { ...defaultOptions, ...options }),
  };
}
