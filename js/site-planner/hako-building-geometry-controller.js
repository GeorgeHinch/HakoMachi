import {
  clipPolygonByLayoutCuts,
  sampleLayoutCutSegments,
} from '../building-generator/core/layout-cut-geometry.js?v=hm-assets-20260804-7';

export function createHakoBuildingGeometryController({
  state,
  collectArrayFields,
  buildingPoints,
  buildingCenter,
  mmToPx,
  pxToMm,
  rad,
}) {
  function hakoRectPolygonMm(x, y, w, d) {
    return [{ x, y }, { x: x + w, y }, { x: x + w, y: y + d }, { x, y: y + d }];
  }

  function hakoWingBoundsMm(cfg, wing) {
    if (!cfg || !wing) return null;
    const width = Number(cfg.width) || 0;
    const depth = Number(cfg.depth) || 0;
    const span = Number(wing.span) || 0;
    const wingDepth = Number(wing.depth) || 0;
    const offset = Number(wing.offset) || 0;
    if (!(span > 0) || !(wingDepth > 0)) return null;
    const face = String(wing.face || '').toLowerCase();
    if (face === 'east' || face === 'right') return { x: width, y: offset, w: wingDepth, d: span };
    if (face === 'west' || face === 'left') return { x: -wingDepth, y: offset, w: wingDepth, d: span };
    if (face === 'front') return { x: offset, y: -wingDepth, w: span, d: wingDepth };
    if (face === 'back' || face === 'rear') return { x: offset, y: depth, w: span, d: wingDepth };
    return null;
  }

  function hakoBlockPolygonsMm(cfg) {
    if (!cfg || typeof cfg !== 'object') return [];
    const width = Number(cfg.width) || Number(cfg.widthMm) || 0;
    const depth = Number(cfg.depth) || Number(cfg.depthMm) || 0;
    if (!(width > 0) || !(depth > 0)) return [];
    const blocks = [{ id: 'main', poly: hakoRectPolygonMm(0, 0, width, depth) }];
    (Array.isArray(cfg.wings) ? cfg.wings : []).forEach((wing, i) => {
      const b = hakoWingBoundsMm(cfg, wing);
      if (b) blocks.push({ id: wing.id || `wing_${i + 1}`, poly: hakoRectPolygonMm(b.x, b.y, b.w, b.d) });
    });
    return blocks;
  }

  function normalizeAngleDeg180(value) {
    let out = Number(value) || 0;
    while (out > 180) out -= 360;
    while (out <= -180) out += 360;
    return out;
  }

  function normalizeAxisAngleDeg(value) {
    let out = normalizeAngleDeg180(value);
    // A footprint edge is an axis, not a directional vector. Traversing the
    // same edge from its opposite end must not rotate the returned Hako model
    // by 180 degrees and mirror its layout-cut side.
    while (out > 90) out -= 180;
    while (out <= -90) out += 180;
    return out;
  }

  function hakoLongestEdgeAngleDeg(polys) {
    let bestLen = -1;
    let bestAngle = null;
    (polys || []).forEach(poly => {
      if (!Array.isArray(poly) || poly.length < 2) return;
      for (let i = 0; i < poly.length; i++) {
        const p = poly[i];
        const q = poly[(i + 1) % poly.length];
        const dx = q.x - p.x;
        const dy = q.y - p.y;
        const len = Math.hypot(dx, dy);
        if (len > bestLen) {
          bestLen = len;
          bestAngle = Math.atan2(dy, dx) * 180 / Math.PI;
        }
      }
    });
    return bestAngle;
  }

  function hakoFootprintRotationDeg(b) {
    if (!b || !b.hakoConfig || !state.pxPerMm) return Number(b?.rotationDeg) || 0;
    if (b.padType === 'rect') return Number(b.rotationDeg) || 0;
    const localPolys = hakoBlockPolygonsMm(b.hakoConfig).map(block => block.poly);
    const localAngle = hakoLongestEdgeAngleDeg(localPolys);
    const siteAngle = hakoLongestEdgeAngleDeg([buildingPoints(b)]);
    if (Number.isFinite(localAngle) && Number.isFinite(siteAngle)) {
      return normalizeAxisAngleDeg(siteAngle - localAngle);
    }
    return Number(b.rotationDeg) || 0;
  }

  function hakoCutTargetId(cut) {
    return (cut && cut.targetId) ? String(cut.targetId) : 'main';
  }

  function sampleHakoLayoutCutSegments(cut, cfg) {
    return sampleLayoutCutSegments(cut, cfg);
  }

  function clipHakoPolygonByLayoutCuts(poly, cuts, cfg) {
    return clipPolygonByLayoutCuts(poly, cuts, cfg);
  }

  function activeHakoLayoutCuts(b) {
    if (!b || !b.hakoConfig) return [];
    return collectArrayFields(b.hakoConfig, [
      ['layoutCuts'], ['shapeCuts'], ['shapeEditor', 'layoutCuts'], ['geometry', 'layoutCuts'], ['building', 'layoutCuts'],
    ]).filter(c => c && c.enabled !== false);
  }

  function hakoLocalMmToWorld(b, p) {
    const c = buildingCenter(b);
    const origin = b.hakoGeometryOriginMm || { x: 0, y: 0 };
    const dx = mmToPx(Number(p.x || 0) - Number(origin.x || 0));
    const dy = mmToPx(Number(p.y || 0) - Number(origin.y || 0));
    const a = rad(hakoFootprintRotationDeg(b));
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    return { x: c.x + dx * ca - dy * sa, y: c.y + dx * sa + dy * ca };
  }

  function hakoWorldToLocalMm(b, p) {
    const c = buildingCenter(b);
    const origin = b.hakoGeometryOriginMm || { x: 0, y: 0 };
    const dx = Number(p.x || 0) - c.x;
    const dy = Number(p.y || 0) - c.y;
    const a = rad(hakoFootprintRotationDeg(b));
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    return {
      x: Number(origin.x || 0) + pxToMm(dx * ca + dy * sa),
      y: Number(origin.y || 0) + pxToMm(-dx * sa + dy * ca),
    };
  }

  function visibleBuildingPolygons(b) {
    const base = buildingPoints(b).map(p => ({ x: p.x, y: p.y }));
    if (base.length < 3 || !state.pxPerMm || !b || !b.hakoConfig) return base.length >= 3 ? [base] : [];
    const cuts = activeHakoLayoutCuts(b);
    if (!cuts.length) return [base];

    // The generator crops every physical block with every active layout cut.
    // targetId identifies the Shape Editor control that owns a cut; it does
    // not limit the cut to that block. Treating a main cut as a crop of the
    // composite outline left attached wings square and could invert the
    // apparent retained side after a planner round trip.
    const blocks = hakoBlockPolygonsMm(b.hakoConfig);
    const hasSeparateBlocks = blocks.length > 1 && Array.isArray(b.hakoConfig.wings) && b.hakoConfig.wings.length > 0;
    if (!hasSeparateBlocks) {
      let out = base;
      const localBase = base.map(p => hakoWorldToLocalMm(b, p));
      const clipped = clipHakoPolygonByLayoutCuts(localBase, cuts, b.hakoConfig);
      if (clipped && clipped.length >= 3) out = clipped.map(p => hakoLocalMmToWorld(b, p));
      return out.length >= 3 ? [out] : [base];
    }
    const polys = [];
    blocks.forEach(block => {
      let poly = block.poly.map(p => ({ x: p.x, y: p.y }));
      poly = clipHakoPolygonByLayoutCuts(poly, cuts, b.hakoConfig);
      if (poly && poly.length >= 3) polys.push(poly.map(p => hakoLocalMmToWorld(b, p)));
    });
    return polys.length ? polys : [base];
  }

  function visibleBuildingPoints(b) {
    return visibleBuildingPolygons(b).flat();
  }

  function arcSampleMm(it) {
    const r = Math.hypot(it.x1 - it.cx, it.y1 - it.cy);
    if (!Number.isFinite(r) || r <= 0) return [{ x: it.x1, y: it.y1 }, { x: it.x2, y: it.y2 }];
    const a1 = Math.atan2(it.y1 - it.cy, it.x1 - it.cx);
    const a2 = Math.atan2(it.y2 - it.cy, it.x2 - it.cx);
    let delta = a2 - a1;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    const side = Number(it.bulgeSide || 1);
    if (side < 0 && delta > 0) delta -= Math.PI * 2;
    if (side > 0 && delta < 0) delta += Math.PI * 2;
    const steps = Math.max(8, Math.ceil(Math.abs(delta) / (Math.PI / 18)));
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const a = a1 + delta * (i / steps);
      pts.push({ x: it.cx + Math.cos(a) * r, y: it.cy + Math.sin(a) * r });
    }
    return pts;
  }

  function hakoDisplayTrimPolylinesMm(b) {
    if (!b || !state.pxPerMm) return [];
    const cuts = activeHakoLayoutCuts(b);
    if (cuts.length && b.hakoConfig) {
      return cuts.map(cut => {
        const pts = [];
        sampleHakoLayoutCutSegments(cut, b.hakoConfig).forEach(seg => {
          if (!seg || seg.length < 2) return;
          if (!pts.length) pts.push(seg[0]);
          pts.push(seg[1]);
        });
        return { points: pts, label: cut.name || cut.id || 'trim', targetId: hakoCutTargetId(cut) };
      }).filter(it => it.points.length >= 2);
    }
    return (Array.isArray(b.hakoTrimLinesMm) ? b.hakoTrimLinesMm : []).map(it => ({
      points: (it.type === 'arc') ? arcSampleMm(it) : [{ x: it.x1, y: it.y1 }, { x: it.x2, y: it.y2 }],
      label: it.label || 'trim',
    })).filter(it => it.points.length >= 2);
  }

  return {
    hakoBlockPolygonsMm,
    hakoFootprintRotationDeg,
    hakoCutTargetId,
    sampleHakoLayoutCutSegments,
    clipHakoPolygonByLayoutCuts,
    activeHakoLayoutCuts,
    hakoLocalMmToWorld,
    hakoWorldToLocalMm,
    visibleBuildingPolygons,
    visibleBuildingPoints,
    hakoDisplayTrimPolylinesMm,
  };
}
