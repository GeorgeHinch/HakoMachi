import { buildRoadMarkingShapes } from './road-marking-shapes.js';

const DEFAULT_STENCIL = Object.freeze({
  marginMm: 2,
  bridgeMm: 0.35,
  minFrameMm: 1.2,
  materialRole: 'stencilStock',
  exportLayer: 'paintStencilCut',
  guideLayer: 'paintStencilGuide',
});

function num(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function bbox(points = []) {
  if (!points.length) return { x: 0, y: 0, width: 0, height: 0 };
  const minX = Math.min(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxX = Math.max(...points.map(p => p.x));
  const maxY = Math.max(...points.map(p => p.y));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function unionBounds(shapes = []) {
  const boxes = shapes.filter(shape => shape.points?.length).map(shape => bbox(shape.points));
  if (!boxes.length) return { x: -5, y: -5, width: 10, height: 10 };
  const minX = Math.min(...boxes.map(box => box.x));
  const minY = Math.min(...boxes.map(box => box.y));
  const maxX = Math.max(...boxes.map(box => box.x + box.width));
  const maxY = Math.max(...boxes.map(box => box.y + box.height));
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function rectPath(x, y, w, h) {
  return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;
}

function escapeAttr(value) {
  return String(value ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function shapeCutoutRecord(shape, index, options) {
  if (shape.type === 'text') {
    return {
      id: `paint-open-text-${index + 1}`,
      type: 'textCutout',
      layer: options.exportLayer,
      text: shape.text,
      x: shape.x,
      y: shape.y,
      angle: shape.angle || 0,
      widthMm: shape.widthMm,
      depthMm: shape.depthMm,
      description: 'Text stencil cutout. Codex may convert to paths before final laser export.',
    };
  }
  return {
    id: `paint-open-${index + 1}`,
    type: 'pathCutout',
    layer: options.exportLayer,
    d: shape.d,
    sourceType: shape.type,
    presetKey: shape.presetKey,
  };
}

function stencilBridgeRecords(bounds, options) {
  const bridge = Math.max(0, num(options.bridgeMm, DEFAULT_STENCIL.bridgeMm));
  if (!bridge) return [];
  const y = bounds.y + bounds.height / 2 - bridge / 2;
  return [
    {
      id: 'stencil-center-bridge-left',
      type: 'bridgeKeepout',
      layer: options.guideLayer,
      d: rectPath(bounds.x, y, bounds.width, bridge),
      description: 'Optional bridge guide to keep stencil islands connected when needed.',
    },
  ];
}

export function buildRoadPaintStencilTemplate(presetOrKey, transform = {}, options = {}) {
  const opts = { ...DEFAULT_STENCIL, ...options };
  const shapes = buildRoadMarkingShapes(presetOrKey, transform);
  const bounds = unionBounds(shapes);
  const margin = Math.max(num(opts.marginMm, DEFAULT_STENCIL.marginMm), num(opts.minFrameMm, DEFAULT_STENCIL.minFrameMm));
  const frame = {
    id: 'paint-stencil-frame',
    type: 'frameCut',
    layer: opts.exportLayer,
    materialRole: opts.materialRole,
    x: bounds.x - margin,
    y: bounds.y - margin,
    width: bounds.width + margin * 2,
    height: bounds.height + margin * 2,
  };
  frame.d = rectPath(frame.x, frame.y, frame.width, frame.height);
  const cutouts = shapes.map((shape, index) => shapeCutoutRecord(shape, index, opts));
  const guides = stencilBridgeRecords(bounds, opts);
  return {
    schema: 'hakomachi.road-paint-stencil-template',
    schemaVersion: 1,
    presetKey: typeof presetOrKey === 'string' ? presetOrKey : presetOrKey?.key,
    materialRole: opts.materialRole,
    operation: 'paint-stencil',
    frame,
    cutouts,
    guides,
    layers: {
      [opts.exportLayer]: [frame, ...cutouts],
      [opts.guideLayer]: guides,
    },
    notes: [
      'Cut the outer stencil frame from real thin stock or masking material.',
      'Cut the marking shapes as inverse openings through the stencil.',
      'Place the stencil on the road surface and paint through the openings.',
      'Use guide/bridge records to decide whether islands need bridges before cutting.',
    ],
  };
}

export function stencilTemplateSvgRecords(template) {
  const data = template?.layers ? template : buildRoadPaintStencilTemplate(template || 'stopLine');
  return Object.entries(data.layers || {}).flatMap(([layer, records]) => (records || []).map(record => ({ ...record, layer })));
}

export function renderStencilTemplateSvg(templateOrSpec, options = {}) {
  const template = templateOrSpec?.layers ? templateOrSpec : buildRoadPaintStencilTemplate(templateOrSpec, {}, options);
  const records = stencilTemplateSvgRecords(template);
  const frame = template.frame;
  const pad = 2;
  const viewBox = `${frame.x - pad} ${frame.y - pad} ${frame.width + pad * 2} ${frame.height + pad * 2}`;
  const body = records.map(record => {
    if (record.type === 'textCutout') {
      return `<text x="${record.x}" y="${record.y}" transform="rotate(${(record.angle || 0) * 180 / Math.PI} ${record.x} ${record.y})" data-layer="${escapeAttr(record.layer)}">${escapeAttr(record.text)}</text>`;
    }
    return `<path d="${escapeAttr(record.d)}" data-layer="${escapeAttr(record.layer)}"/>`;
  }).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`;
}

export function buildRoadPaintStencilTemplates(presets = [], transformForPreset = () => ({}), options = {}) {
  return presets.map((preset, index) => buildRoadPaintStencilTemplate(preset, transformForPreset(preset, index), options));
}

export { DEFAULT_STENCIL as DEFAULT_PAINT_STENCIL_TEMPLATE };
