import { buildRoadMarkingShapes } from './road-marking-shapes.js';

const DEFAULT_STENCIL = Object.freeze({
  marginMm: 2,
  bridgeMm: 0.35,
  minFrameMm: 1.2,
  materialRole: 'stencilStock',
  materialId: 'stencil-stock',
  exportLayer: 'paintStencilCut',
  guideLayer: 'paintStencilGuide',
});

const DEFAULT_SHEET = Object.freeze({
  widthMm: 180,
  heightMm: 120,
  marginMm: 6,
  gapMm: 5,
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
    materialId: opts.materialId,
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
    materialId: opts.materialId,
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

function templateFromSpec(spec, index, options = {}) {
  if (spec?.layers) return spec;
  const preset = spec?.preset || spec?.presetKey || spec || 'stopLine';
  const transform = spec?.transform || {};
  const template = buildRoadPaintStencilTemplate(preset, transform, {
    ...options,
    ...(spec?.options || {}),
    materialId: spec?.materialId || spec?.stencilMaterialId || options.materialId || DEFAULT_STENCIL.materialId,
  });
  template.id = spec?.id || `paint-stencil-${index + 1}`;
  template.label = spec?.label || template.presetKey || `Paint stencil ${index + 1}`;
  template.rotationDeg = Number(spec?.rotationDeg) || 0;
  return template;
}

function layoutTemplates(templates = [], sheet = {}) {
  const s = { ...DEFAULT_SHEET, ...sheet };
  let x = s.marginMm;
  let y = s.marginMm;
  let rowHeight = 0;
  return templates.map(template => {
    const frame = template.frame || { x: 0, y: 0, width: 10, height: 10 };
    if (x + frame.width > s.widthMm - s.marginMm && x > s.marginMm) {
      x = s.marginMm;
      y += rowHeight + s.gapMm;
      rowHeight = 0;
    }
    const placed = { template, offset: { x: x - frame.x, y: y - frame.y } };
    x += frame.width + s.gapMm;
    rowHeight = Math.max(rowHeight, frame.height);
    return placed;
  });
}

function styleForStencilRecord(record) {
  if (record.type === 'frameCut') return 'fill="none" stroke="#d33" stroke-width="0.08" data-operation="cut-retained"';
  if (record.type === 'bridgeKeepout') return 'fill="none" stroke="#2271b1" stroke-width="0.06" stroke-dasharray="0.8 0.5" data-operation="engrave"';
  return 'fill="none" stroke="#178a3b" stroke-width="0.08" data-operation="cut-scrap"';
}

function stencilRecordElement(record, offset) {
  const transform = `translate(${offset.x} ${offset.y})`;
  const style = styleForStencilRecord(record);
  if (record.type === 'textCutout') {
    const rotate = `rotate(${(record.angle || 0) * 180 / Math.PI} ${record.x} ${record.y})`;
    return `<text x="${record.x}" y="${record.y}" transform="${escapeAttr(`${transform} ${rotate}`)}" text-anchor="middle" dominant-baseline="middle" font-size="${Math.max(2, Number(record.depthMm) || 4)}" ${style} data-layer="${escapeAttr(record.layer)}">${escapeAttr(record.text)}</text>`;
  }
  return `<path d="${escapeAttr(record.d || '')}" transform="${escapeAttr(transform)}" ${style} data-layer="${escapeAttr(record.layer)}" data-record-type="${escapeAttr(record.type)}"/>`;
}

export function serializePaintStencilSheetSvg(stencilSpecs = [], options = {}) {
  const sheet = { ...DEFAULT_SHEET, ...(options.sheet || {}) };
  const templates = stencilSpecs.map((spec, index) => templateFromSpec(spec, index, options)).filter(template => template?.frame);
  const body = layoutTemplates(templates, sheet).map(({ template, offset }) => {
    const records = [
      ...(template.layers?.paintStencilCut || []),
      ...(options.includeGuides ? (template.layers?.paintStencilGuide || []) : []),
    ];
    const label = `<text x="${offset.x + template.frame.x}" y="${offset.y + template.frame.y - 1.5}" font-size="2.4" fill="#2271b1" data-operation="engrave">${escapeAttr(template.label || template.id || template.presetKey || 'Paint stencil')}</text>`;
    return `<g id="${escapeAttr(template.id || template.presetKey || '')}" data-label="${escapeAttr(template.label || '')}" data-preset="${escapeAttr(template.presetKey || '')}" data-material-id="${escapeAttr(template.materialId || DEFAULT_STENCIL.materialId)}">${label}${records.map(record => stencilRecordElement(record, offset)).join('')}</g>`;
  }).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${sheet.widthMm}mm" height="${sheet.heightMm}mm" viewBox="0 0 ${sheet.widthMm} ${sheet.heightMm}">\n<title>HakoMachi Road Paint Stencils</title>\n<desc>Red is retained stencil frame cut, green is scrap opening cut, and blue is engrave/guide.</desc>\n${body}\n</svg>`;
}

export function serializePaintStencilSheetsByMaterial(stencilSpecs = [], options = {}) {
  const templates = stencilSpecs.map((spec, index) => templateFromSpec(spec, index, options));
  const byMaterial = templates.reduce((groups, template) => {
    const materialId = template.materialId || template.frame?.materialId || DEFAULT_STENCIL.materialId;
    if (!groups[materialId]) groups[materialId] = [];
    groups[materialId].push(template);
    return groups;
  }, {});
  return Object.entries(byMaterial).map(([materialId, templatesForMaterial]) => ({
    materialId,
    svg: serializePaintStencilSheetSvg(templatesForMaterial, options),
    templates: templatesForMaterial,
  }));
}

export function buildRoadPaintStencilTemplates(presets = [], transformForPreset = () => ({}), options = {}) {
  return presets.map((preset, index) => buildRoadPaintStencilTemplate(preset, transformForPreset(preset, index), options));
}

export { DEFAULT_STENCIL as DEFAULT_PAINT_STENCIL_TEMPLATE, DEFAULT_SHEET as DEFAULT_PAINT_STENCIL_SHEET };
