export function collectPreviewLayoutCuts(cfg) {
  if (!cfg || typeof cfg !== 'object') return [];
  const paths = [
    cfg.layoutCuts,
    cfg.shapeCuts,
    cfg.cutLines,
    cfg.trimLines,
    cfg.shapeEditor?.layoutCuts,
    cfg.shapeEditor?.cutLines,
    cfg.geometry?.layoutCuts,
    cfg.building?.layoutCuts,
    cfg.sitePlannerSeed?.layoutCuts,
    cfg.sitePlannerSeed?.shapeEditor?.layoutCuts,
    cfg.sitePlannerSeed?.shapeEditor?.cutLines,
    cfg.hakoSeed?.layoutCuts,
    cfg.hakoSeed?.shapeEditor?.layoutCuts,
    cfg.hakoSeed?.shapeEditor?.cutLines,
    cfg.seed?.layoutCuts,
    cfg.seed?.shapeEditor?.layoutCuts,
    cfg.seed?.shapeEditor?.cutLines,
  ];
  const out = [];
  const seen = new Set();
  for (const value of paths) {
    if (!Array.isArray(value)) continue;
    for (const cut of value) {
      if (!cut || cut.enabled === false) continue;
      const type = String(cut.type || cut.kind || 'line').toLowerCase();
      if (type !== 'line' && type !== 'arc') continue;
      const key = cut.id || JSON.stringify([type, cut.x1, cut.y1, cut.x2, cut.y2, cut.cx, cut.cy, cut.keepSide]);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ...cut, type });
    }
  }
  return out;
}

export function previewLayoutCutsActive(cfg) {
  return collectPreviewLayoutCuts(cfg).length > 0;
}
