/* =====================================================================
   LAYOUT CUT / EXPORT CROP GEOMETRY
   =====================================================================
   V1 supports straight/angled cuts and arc cuts. A cut is drawn in global
   top-down plan coordinates in the Shape Editor. The full building remains
   visible in the editor; generated sheet parts that live in top-down plan
   space (floor + flat/parapet roof sheets) are clipped to the kept side.

   Arc cuts are approximated as a sequence of short line segments and clipped
   as the intersection of their half-planes. That makes the exported laser
   path a clean polyline rather than a true SVG arc, which is more robust for
   laser software and adequate at N-scale.
*/
export function layoutCutsActive(cfg) {
  return Array.isArray(cfg && cfg.layoutCuts) && cfg.layoutCuts.some(c => c && c.enabled !== false);
}


export function clampMm(v, min, max, fallback) {
  v = Number(v);
  if (!isFinite(v)) v = (fallback != null ? fallback : min);
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

export function measuredArcTargetInfo(cfg, cut) {
  cfg = cfg || CONFIG;
  const targetId = (cut && cut.targetId) || 'main';
  if (targetId !== 'main') {
    const wing = ((cfg && cfg.wings) || []).find(w => w.id === targetId);
    if (wing) {
      return {
        kind: 'wing',
        id: wing.id,
        wing,
        bounds: weWingBounds(cfg, wing),
        label: 'Wing ' + (((cfg.wings || []).indexOf(wing) + 1) || ''),
      };
    }
  }
  return {
    kind: 'main',
    id: 'main',
    wing: null,
    bounds: { x: 0, y: 0, w: Number(cfg.width) || 0, d: Number(cfg.depth) || 0 },
    label: 'Main',
  };
}

export function resolveMeasuredArcCut(cut, cfg) {
  if (!cut || cut.type !== 'arc' || cut.positionMode !== 'measured') return cut;
  cfg = cfg || CONFIG;
  const info = measuredArcTargetInfo(cfg, cut);
  const b = info.bounds || { x: 0, y: 0, w: 0, d: 0 };
  let p1, p2, maxOffset;

  if (info.kind === 'wing' && info.wing) {
    const wing = info.wing;
    maxOffset = Math.max(0, Number(wing.depth) || 0);
    const a = clampMm(cut.startOffset, 0, maxOffset, Math.min(20, maxOffset));
    const e = clampMm(cut.endOffset,   0, maxOffset, Math.min(20, maxOffset));
    // For wings, offsets are measured AWAY from the connection edge to the
    // main body. The two arc endpoints land on the wing's two side edges.
    if (wing.face === 'east') {
      p1 = { x: (Number(cfg.width) || 0) + a, y: wing.offset };
      p2 = { x: (Number(cfg.width) || 0) + e, y: wing.offset + wing.span };
    } else if (wing.face === 'west') {
      p1 = { x: 0 - a, y: wing.offset };
      p2 = { x: 0 - e, y: wing.offset + wing.span };
    } else if (wing.face === 'front') {
      p1 = { x: wing.offset, y: 0 - a };
      p2 = { x: wing.offset + wing.span, y: 0 - e };
    } else { // back
      p1 = { x: wing.offset, y: (Number(cfg.depth) || 0) + a };
      p2 = { x: wing.offset + wing.span, y: (Number(cfg.depth) || 0) + e };
    }
  } else {
    const edge = cut.referenceEdge || 'back';
    maxOffset = (edge === 'front' || edge === 'back') ? Math.max(0, b.d) : Math.max(0, b.w);
    const a = clampMm(cut.startOffset, 0, maxOffset, Math.min(20, maxOffset));
    const e = clampMm(cut.endOffset,   0, maxOffset, Math.min(20, maxOffset));
    // For the main block, offsets are measured INWARD from the chosen edge.
    if (edge === 'front') {
      p1 = { x: b.x,       y: b.y + a };
      p2 = { x: b.x + b.w, y: b.y + e };
    } else if (edge === 'back') {
      p1 = { x: b.x,       y: b.y + b.d - a };
      p2 = { x: b.x + b.w, y: b.y + b.d - e };
    } else if (edge === 'east') {
      p1 = { x: b.x + b.w - a, y: b.y };
      p2 = { x: b.x + b.w - e, y: b.y + b.d };
    } else { // west
      p1 = { x: b.x + a, y: b.y };
      p2 = { x: b.x + e, y: b.y + b.d };
    }
  }

  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const len = Math.max(0.0001, Math.hypot(dx, dy));
  const bulge = Number(cut.bulge);
  const bAmt = isFinite(bulge) ? bulge : 20;
  const side = (Number(cut.bulgeSide) < 0) ? -1 : 1;
  const nx = -dy / len, ny = dx / len;
  const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  return {
    ...cut,
    x1: p1.x,
    y1: p1.y,
    x2: p2.x,
    y2: p2.y,
    cx: mid.x + nx * bAmt * side,
    cy: mid.y + ny * bAmt * side,
    _measuredResolved: true,
  };
}

export function resolveLayoutCutGeometry(cut, cfg) {
  return resolveMeasuredArcCut(cut, cfg || CONFIG);
}

export function updateMeasuredArcCutGeometry(cut, cfg) {
  if (!cut || cut.type !== 'arc' || cut.positionMode !== 'measured') return;
  const r = resolveMeasuredArcCut(cut, cfg || CONFIG);
  cut.x1 = r.x1; cut.y1 = r.y1;
  cut.x2 = r.x2; cut.y2 = r.y2;
  cut.cx = r.cx; cut.cy = r.cy;
}

export function refreshMeasuredLayoutCuts(cfg) {
  for (const cut of ((cfg && cfg.layoutCuts) || [])) updateMeasuredArcCutGeometry(cut, cfg);
}

export function parseSvgPathToPoints(d) {
  if (!d || typeof d !== 'string') return [];
  const toks = d.match(/[AaCcHhLlMmQqSsTtVvZz]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g) || [];
  let i = 0, cmd = null, x = 0, y = 0, sx = 0, sy = 0;
  const pts = [];
  function isCmd(t) { return /^[A-Za-z]$/.test(t); }
  function num() { return parseFloat(toks[i++]); }
  while (i < toks.length) {
    if (isCmd(toks[i])) cmd = toks[i++];
    if (!cmd) break;
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    if (C === 'M') {
      if (i + 1 >= toks.length) break;
      x = num(); y = num();
      if (rel) { x += sx; y += sy; }
      sx = x; sy = y;
      pts.push({ x, y });
      cmd = rel ? 'l' : 'L';
    } else if (C === 'L') {
      if (i + 1 >= toks.length) break;
      let nx = num(), ny = num();
      if (rel) { nx += x; ny += y; }
      x = nx; y = ny; pts.push({ x, y });
    } else if (C === 'H') {
      if (i >= toks.length) break;
      let nx = num(); if (rel) nx += x;
      x = nx; pts.push({ x, y });
    } else if (C === 'V') {
      if (i >= toks.length) break;
      let ny = num(); if (rel) ny += y;
      y = ny; pts.push({ x, y });
    } else if (C === 'A') {
      // Elliptical arc support is needed for round pass-through / fixture
      // holes. Without this, sheet-split physical cropping saw only the
      // first M point of paths like "M ... A ... A ... Z" and dropped the
      // circular hole from split wall segments.
      if (i + 6 >= toks.length) break;
      let rx = Math.abs(num()), ry = Math.abs(num());
      const phiDeg = num();
      const largeArc = !!num();
      const sweep = !!num();
      let nx = num(), ny = num();
      if (rel) { nx += x; ny += y; }

      if (rx < 1e-9 || ry < 1e-9) {
        x = nx; y = ny; pts.push({ x, y });
      } else {
        const phi = phiDeg * Math.PI / 180;
        const cosPhi = Math.cos(phi), sinPhi = Math.sin(phi);
        const dx2 = (x - nx) / 2;
        const dy2 = (y - ny) / 2;
        let x1p = cosPhi * dx2 + sinPhi * dy2;
        let y1p = -sinPhi * dx2 + cosPhi * dy2;

        // Ensure radii are large enough per SVG spec.
        const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
        if (lam > 1) {
          const s = Math.sqrt(lam);
          rx *= s; ry *= s;
        }

        const sign = (largeArc === sweep) ? -1 : 1;
        const denom = (rx * rx * y1p * y1p) + (ry * ry * x1p * x1p);
        const factor = denom <= 1e-12 ? 0 : sign * Math.sqrt(Math.max(0,
          ((rx * rx * ry * ry) - (rx * rx * y1p * y1p) - (ry * ry * x1p * x1p)) / denom
        ));
        const cxp = factor * (rx * y1p / ry);
        const cyp = factor * (-ry * x1p / rx);

        const cx = cosPhi * cxp - sinPhi * cyp + (x + nx) / 2;
        const cy = sinPhi * cxp + cosPhi * cyp + (y + ny) / 2;

        function angleBetween(ux, uy, vx, vy) {
          const dot = ux * vx + uy * vy;
          const det = ux * vy - uy * vx;
          return Math.atan2(det, dot);
        }
        const ux = (x1p - cxp) / rx;
        const uy = (y1p - cyp) / ry;
        const vx = (-x1p - cxp) / rx;
        const vy = (-y1p - cyp) / ry;
        let theta1 = angleBetween(1, 0, ux, uy);
        let dtheta = angleBetween(ux, uy, vx, vy);
        if (!sweep && dtheta > 0) dtheta -= 2 * Math.PI;
        if (sweep && dtheta < 0) dtheta += 2 * Math.PI;

        const steps = Math.max(8, Math.min(48, Math.ceil(Math.abs(dtheta) / (Math.PI / 12))));
        for (let s = 1; s <= steps; s++) {
          const t = theta1 + dtheta * (s / steps);
          const px = cx + cosPhi * rx * Math.cos(t) - sinPhi * ry * Math.sin(t);
          const py = cy + sinPhi * rx * Math.cos(t) + cosPhi * ry * Math.sin(t);
          pts.push({ x: px, y: py });
        }
        x = nx; y = ny;
      }
    } else if (C === 'Z') {
      if (pts.length && (Math.abs(pts[0].x - x) > 1e-6 || Math.abs(pts[0].y - y) > 1e-6)) {
        x = sx; y = sy; pts.push({ x, y });
      }
    } else {
      // Unsupported curves inside generated part paths are rare here. Stop
      // rather than guessing; callers will skip clipping if too few points.
      break;
    }
  }
  if (pts.length > 1) {
    const a = pts[0], b = pts[pts.length - 1];
    if (Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6) pts.pop();
  }
  return pts;
}

export function pointsToSvgPath(pts) {
  if (!pts || pts.length < 3) return '';
  const f = v => Number(v).toFixed(3);
  let d = `M ${f(pts[0].x)},${f(pts[0].y)}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${f(pts[i].x)},${f(pts[i].y)}`;
  return d + ' Z';
}

export function layoutLineSide(a, b, p) {
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
}

export function lineSegmentInfiniteLineIntersection(p1, p2, a, b) {
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const lx = b.x - a.x, ly = b.y - a.y;
  const den = dx * ly - dy * lx;
  if (Math.abs(den) < 1e-9) return { x: p2.x, y: p2.y };
  const t = ((a.x - p1.x) * ly - (a.y - p1.y) * lx) / den;
  return { x: p1.x + t * dx, y: p1.y + t * dy };
}

export function clipPolygonByHalfPlane(poly, a, b, keepSide) {
  if (!poly || poly.length < 3) return [];
  const keepLeft = keepSide !== 'right';
  const inside = p => keepLeft ? layoutLineSide(a, b, p) >= -1e-7 : layoutLineSide(a, b, p) <= 1e-7;
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i];
    const prev = poly[(i + poly.length - 1) % poly.length];
    const curIn = inside(cur), prevIn = inside(prev);
    if (curIn) {
      if (!prevIn) out.push(lineSegmentInfiniteLineIntersection(prev, cur, a, b));
      out.push(cur);
    } else if (prevIn) {
      out.push(lineSegmentInfiniteLineIntersection(prev, cur, a, b));
    }
  }
  // Remove tiny duplicate runs that can appear when the cut lands exactly on
  // an existing vertex.
  const clean = [];
  for (const p of out) {
    const q = clean[clean.length - 1];
    if (!q || Math.hypot(p.x - q.x, p.y - q.y) > 0.001) clean.push(p);
  }
  if (clean.length > 2) {
    const a0 = clean[0], z = clean[clean.length - 1];
    if (Math.hypot(a0.x - z.x, a0.y - z.y) < 0.001) clean.pop();
  }
  return clean;
}

export function sampleLayoutCutSegments(cut, cfg) {
  cut = resolveLayoutCutGeometry(cut, cfg || CONFIG);
  if (!cut || cut.enabled === false) return [];
  if (cut.type !== 'arc') {
    return [[{ x: +cut.x1, y: +cut.y1 }, { x: +cut.x2, y: +cut.y2 }]];
  }
  const p0 = { x: +cut.x1, y: +cut.y1 };
  const p1 = { x: +cut.cx, y: +cut.cy };
  const p2 = { x: +cut.x2, y: +cut.y2 };
  const pts = [];
  const N = 24;
  for (let i = 0; i <= N; i++) {
    const t = i / N, mt = 1 - t;
    pts.push({
      x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
      y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
    });
  }
  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    if (Math.hypot(pts[i+1].x - pts[i].x, pts[i+1].y - pts[i].y) > 0.001) segs.push([pts[i], pts[i+1]]);
  }
  return segs;
}

export function clipPolygonByLayoutCuts(poly, cuts, cfg) {
  let out = (poly || []).map(p => ({ x: p.x, y: p.y }));
  for (const cut of (cuts || [])) {
    if (!cut || cut.enabled === false) continue;
    const segs = sampleLayoutCutSegments(cut, cfg || CONFIG);
    for (const [a, b] of segs) {
      out = clipPolygonByHalfPlane(out, a, b, cut.keepSide === 'right' ? 'right' : 'left');
      if (out.length < 3) return [];
    }
  }
  return out;
}

export function polygonBounds(poly) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of poly || []) {
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

export function pointInPolygon(pt, poly) {
  if (!poly || poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = ((yi > pt.y) !== (yj > pt.y)) &&
      (pt.x < (xj - xi) * (pt.y - yi) / ((yj - yi) || 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function pathCentroidApprox(d) {
  const pts = parseSvgPathToPoints(d);
  if (!pts.length) return null;
  let x = 0, y = 0;
  for (const p of pts) { x += p.x; y += p.y; }
  return { x: x / pts.length, y: y / pts.length };
}

export function shouldLayoutClipPart(part) {
  if (!part || !part.id) return false;
  // Top-down sheet parts only. Wall shortening / cut-face wall generation is
  // still a separate later phase, but this list now includes the wing-local
  // roof/floor pieces that Phase 1/2/4 introduced. Those wing parts carry a
  // _layoutClipTransform so their local SVG coordinates can be mapped into
  // the global shape-editor coordinate system before clipping.
  if (part._layoutClipTransform) return true;
  return part.id === 'floor'
      || part.id === 'floor_main_panelized'
      || String(part.id || '').startsWith('floor_split_wing_')
      || part.id === 'roof'
      || part.id === 'cladding_roof';
}

export function wingLocalToWorldPointForLayoutCut(cfg, tr, p) {
  const face = tr.face;
  const off = Number(tr.offset) || 0;
  const W = Number(tr.mainW != null ? tr.mainW : (cfg && cfg.width)) || 0;
  const D = Number(tr.mainD != null ? tr.mainD : (cfg && cfg.depth)) || 0;
  if (face === 'east')  return { x: W + p.y, y: off + p.x };
  if (face === 'west')  return { x: -p.y,    y: off + p.x };
  if (face === 'front') return { x: off + p.x, y: -p.y };
  // back
  return { x: off + p.x, y: D + p.y };
}

export function worldToWingLocalPointForLayoutCut(cfg, tr, p) {
  const face = tr.face;
  const off = Number(tr.offset) || 0;
  const W = Number(tr.mainW != null ? tr.mainW : (cfg && cfg.width)) || 0;
  const D = Number(tr.mainD != null ? tr.mainD : (cfg && cfg.depth)) || 0;
  if (face === 'east')  return { x: p.y - off, y: p.x - W };
  if (face === 'west')  return { x: p.y - off, y: -p.x };
  if (face === 'front') return { x: p.x - off, y: -p.y };
  // back
  return { x: p.x - off, y: p.y - D };
}

export function layoutCutTransformForPart(part, cfg) {
  cfg = cfg || CONFIG;
  const tr = part && part._layoutClipTransform;
  if (tr && tr.kind === 'wing') {
    const ox = Number(tr.localOffsetX) || 0;
    const oy = Number(tr.localOffsetY) || 0;
    return {
      toWorld: p => wingLocalToWorldPointForLayoutCut(cfg, tr, { x: p.x + ox, y: p.y + oy }),
      toLocal: p => {
        const q = worldToWingLocalPointForLayoutCut(cfg, tr, p);
        return { x: q.x - ox, y: q.y - oy };
      },
    };
  }
  if (tr && tr.kind === 'translate') {
    const dx = Number(tr.dx) || 0;
    const dy = Number(tr.dy) || 0;
    return {
      toWorld: p => ({ x: p.x + dx, y: p.y + dy }),
      toLocal: p => ({ x: p.x - dx, y: p.y - dy }),
    };
  }

  // Main-block top-down parts. The floor is already in shape-editor world
  // coordinates. Recessed parapet roofs are inset by core thickness; roof
  // cladding is generally cut slightly oversize, so shift it by cladding
  // thickness to make the crop line land in the same footprint frame.
  let dx = 0, dy = 0;
  if (part && part.id === 'roof' && cfg && cfg.roofStyle === 'parapet') {
    dx = Number(cfg.coreThickness) || 0;
    dy = Number(cfg.coreThickness) || 0;
  } else if (part && part.id === 'cladding_roof') {
    // Main roof cladding can be either an oversized cap (flat), an
    // overhang-sized panel (flat_overhang), or an interior recessed panel
    // (parapet). Map its local SVG coordinates into the same outer-footprint
    // coordinate frame used by the Shape Editor layout cuts.
    const cT = Number(cfg && cfg.claddingThickness) || 0;
    const matT = Number(cfg && cfg.coreThickness) || 0;
    if (cfg && cfg.roofStyle === 'parapet') {
      dx = matT;
      dy = matT;
    } else if (cfg && cfg.roofStyle === 'flat_overhang') {
      const O = Math.max(0, Number(cfg.roofOverhang) || 5);
      dx = -O;
      dy = -O;
    } else {
      dx = -cT;
      dy = -cT;
    }
  }
  return {
    toWorld: p => ({ x: p.x + dx, y: p.y + dy }),
    toLocal: p => ({ x: p.x - dx, y: p.y - dy }),
  };
}

export function layoutCutWingIndexFromPart(part) {
  const id = (part && part.id) || '';
  const m = id.match(/_wing(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

export function layoutCutWallFromPart(part) {
  const id = (part && part.id) || '';
  const wi = wallFromPartId(id);
  if (wi && wi.wall) return wi.wall;

  if (id.startsWith('interior_cladding_front')) return 'front';
  if (id.startsWith('interior_cladding_back')) return 'back';
  if (id.startsWith('interior_cladding_east')) return 'east';
  if (id.startsWith('interior_cladding_west')) return 'west';
  return null;
}

export function layoutCutPartWallKind(part) {
  const id = (part && part.id) || '';
  if (id === 'front_wall' || id === 'back_wall'
      || id.startsWith('front_wall_') || id.startsWith('back_wall_')
      || id === 'side_wall_east' || id === 'side_wall_west'
      || id.startsWith('side_wall_east_') || id.startsWith('side_wall_west_')) {
    return 'core';
  }
  if (id.startsWith('cladding_front') || id.startsWith('cladding_back')
      || id.startsWith('cladding_side_east') || id.startsWith('cladding_side_west')) {
    return 'exterior_cladding';
  }
  if (id.startsWith('interior_cladding_')) return 'interior_cladding';
  return null;
}

export function layoutCutWallClipSpec(part, cfg) {
  const wall = layoutCutWallFromPart(part);
  const kind = layoutCutPartWallKind(part);
  if (!wall || !kind) return null;

  const wingIndex = layoutCutWingIndexFromPart(part);
  const wing = (wingIndex != null && cfg && cfg.wings) ? cfg.wings[wingIndex] : null;
  const blockCfg = wing ? buildWingCfg(cfg, wing) : cfg;
  if (!blockCfg) return null;
  const blockPlan = buildEdgePlans(blockCfg);
  const matT = Number(blockPlan.matT || blockCfg.coreThickness || 1.5);
  const cT = Number(blockCfg.claddingThickness || 0);
  const width = Number(blockCfg.width || 0);
  const depth = Number(blockCfg.depth || 0);
  const sideLen = Math.max(0, Number(blockPlan.sideLen || (depth - 2 * matT)));
  const sideCoreSpan = sideLen + (blockCfg._omitConnectionWall ? matT : 0); // = wing depth - matT for omitted connection face

  // Convert this panel's local x-coordinate into the block's local footprint
  // coordinate system. The panel's y/height coordinate is intentionally not
  // used: layout cuts are top-down crop lines, so they shorten wall sheets
  // along their length but do not change their vertical height.
  function toBlockPoint(panelX) {
    let x, y;
    if (wall === 'front' || wall === 'back') {
      y = (wall === 'front') ? 0 : depth;
      if (kind === 'exterior_cladding') x = panelX - cT;         // FB cladding overhangs by cT
      else if (kind === 'interior_cladding') x = matT + panelX;  // interior panel starts inside side walls
      else x = panelX;                                           // core wall frame
    } else {
      // For front/back-attached wings, the two wing side faces are opposite
      // exterior views of the same outward run. In top-down wing-local space
      // the west side is x=0 and east side is x=width, but the generated
      // sheet/preview labels use the exterior side convention. Without this
      // front/back-wing correction, arc/line layout cuts shorten the opposite
      // side wall from the one the shape editor shows: the long side appears
      // where the short side should be. East/west-attached wings already use
      // the normal side-wall mapping.
      const fbWingSideFlip = !!(wing && (wing.face === 'front' || wing.face === 'back'));
      const effectiveWall = fbWingSideFlip
        ? (wall === 'west' ? 'east' : (wall === 'east' ? 'west' : wall))
        : wall;
      x = (effectiveWall === 'west') ? 0 : width;
      if (kind === 'exterior_cladding') {
        y = panelX;                                              // side cladding spans full outside depth
      } else if (kind === 'core' && blockCfg._omitConnectionWall) {
        // Wing side core walls tab directly into the main wall because the
        // wing connection-face wall is omitted. Their x=0 edge is the main
        // wall seam, not matT inside the wing footprint. Using matT+panelX
        // made layout-cut side walls one core thickness too short compared
        // with the main-wall slots and the matching exterior cladding.
        y = panelX;
      } else {
        y = matT + panelX;                                       // normal core/interior side wall span
      }
    }
    return { x, y };
  }

  function toWorld(panelX) {
    const p = toBlockPoint(panelX);
    if (wing) {
      return wingLocalToWorldPointForLayoutCut(cfg, {
        kind: 'wing',
        face: wing.face,
        offset: wing.offset,
        mainW: cfg.width,
        mainD: cfg.depth,
      }, p);
    }
    return p;
  }

  function footprintWorld() {
    const rectLocal = [
      { x: 0,     y: 0 },
      { x: width, y: 0 },
      { x: width, y: depth },
      { x: 0,     y: depth },
    ];
    if (wing) {
      const tr = { kind: 'wing', face: wing.face, offset: wing.offset, mainW: cfg.width, mainD: cfg.depth };
      return rectLocal.map(p => wingLocalToWorldPointForLayoutCut(cfg, tr, p));
    }
    return rectLocal;
  }

  // The retained interval must be measured along the wall BODY span, not
  // including edge tabs that protrude outside x=0 / x=bodyW. Using bboxW for
  // core walls causes layout cuts to clip off the connection-edge tabs that
  // are still needed to engage the main wall slots. Cladding keeps using the
  // actual part width because overhang material is part of the cladding sheet.
  let panelW;
  if (kind === 'core') {
    panelW = (wall === 'east' || wall === 'west') ? sideCoreSpan : width;
  } else if (kind === 'interior_cladding') {
    panelW = (wall === 'east' || wall === 'west') ? sideLen : Math.max(0, width - 2 * matT);
  } else {
    panelW = Number(part.bboxW || 0);
  }
  if (!(panelW > 0)) return null;

  return { wall, kind, wingIndex, panelW, matT, toWorld, footprintWorld };
}

export function segmentParamIntersections(a, b, c, d) {
  const out = [];
  const rx = b.x - a.x, ry = b.y - a.y;
  const sx = d.x - c.x, sy = d.y - c.y;
  const den = rx * sy - ry * sx;
  const qpx = c.x - a.x, qpy = c.y - a.y;
  const len2 = rx * rx + ry * ry || 1;
  if (Math.abs(den) < 1e-9) {
    // Parallel. If collinear, add the overlap endpoints projected onto AB.
    if (Math.abs(qpx * ry - qpy * rx) < 1e-7) {
      const t0 = ((c.x - a.x) * rx + (c.y - a.y) * ry) / len2;
      const t1 = ((d.x - a.x) * rx + (d.y - a.y) * ry) / len2;
      const lo = Math.max(0, Math.min(t0, t1));
      const hi = Math.min(1, Math.max(t0, t1));
      if (hi >= lo - 1e-9) {
        out.push(Math.max(0, Math.min(1, lo)));
        out.push(Math.max(0, Math.min(1, hi)));
      }
    }
    return out;
  }
  const t = (qpx * sy - qpy * sx) / den;
  const u = (qpx * ry - qpy * rx) / den;
  if (t >= -1e-9 && t <= 1 + 1e-9 && u >= -1e-9 && u <= 1 + 1e-9) {
    out.push(Math.max(0, Math.min(1, t)));
  }
  return out;
}

export function uniqueSortedParams(vals) {
  const a = vals.filter(v => isFinite(v)).map(v => Math.max(0, Math.min(1, v))).sort((x, y) => x - y);
  const out = [];
  for (const v of a) {
    if (!out.length || Math.abs(v - out[out.length - 1]) > 1e-5) out.push(v);
  }
  return out;
}

export function keptIntervalsOnSegmentInsidePolygon(a, b, poly) {
  if (!poly || poly.length < 3) return [];
  const params = [0, 1];
  for (let i = 0; i < poly.length; i++) {
    const c = poly[i], d = poly[(i + 1) % poly.length];
    params.push(...segmentParamIntersections(a, b, c, d));
  }
  const ts = uniqueSortedParams(params);
  const intervals = [];
  for (let i = 0; i < ts.length - 1; i++) {
    const t0 = ts[i], t1 = ts[i + 1];
    if (t1 - t0 < 1e-5) continue;
    const tm = (t0 + t1) / 2;
    const p = { x: a.x + (b.x - a.x) * tm, y: a.y + (b.y - a.y) * tm };
    if (pointInPolygonWithNudge(p, poly)) intervals.push([t0, t1]);
  }

  // If the segment lies nearly exactly on the kept polygon boundary, the
  // split params may contain only endpoints. Sample the midpoint as a guard.
  if (!intervals.length) {
    const p = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    if (pointInPolygonWithNudge(p, poly)) intervals.push([0, 1]);
  }
  return intervals;
}

export function clipLocalPolygonToXInterval(poly, x0, x1) {
  let out = (poly || []).map(p => ({ x: p.x, y: p.y }));
  if (out.length < 3) return [];
  // Keep x >= x0
  out = clipPolygonByHalfPlane(out, { x: x0, y: -1000000 }, { x: x0, y: 1000000 }, 'right');
  if (out.length < 3) return [];
  // Keep x <= x1
  out = clipPolygonByHalfPlane(out, { x: x1, y: -1000000 }, { x: x1, y: 1000000 }, 'left');
  return out;
}

export function clipRectToXInterval(r, x0, x1) {
  if (!r || typeof r.x !== 'number' || typeof r.w !== 'number') return r;
  const a = Math.max(x0, r.x);
  const b = Math.min(x1, r.x + r.w);
  if (b - a <= 0.01) return null;
  return { ...r, x: a, w: b - a };
}

export function clipLineToXInterval(l, x0, x1) {
  if (!l || typeof l.x1 !== 'number' || typeof l.x2 !== 'number') return l;
  let ax = l.x1, ay = l.y1, bx = l.x2, by = l.y2;
  if (Math.abs(bx - ax) < 1e-9) {
    return (ax >= x0 - 1e-7 && ax <= x1 + 1e-7) ? l : null;
  }
  let t0 = 0, t1 = 1;
  const dx = bx - ax;
  const tA = (x0 - ax) / dx;
  const tB = (x1 - ax) / dx;
  const lo = Math.min(tA, tB), hi = Math.max(tA, tB);
  t0 = Math.max(t0, lo);
  t1 = Math.min(t1, hi);
  if (t1 < t0 - 1e-9) return null;
  return {
    ...l,
    x1: ax + dx * t0,
    y1: ay + (by - ay) * t0,
    x2: ax + dx * t1,
    y2: ay + (by - ay) * t1,
  };
}

export function applyLayoutCutsToWallPart(part, cuts, cfg) {
  const spec = layoutCutWallClipSpec(part, cfg || CONFIG);
  if (!spec) return false;
  if (!Array.isArray(part.paths) || part.paths.length === 0) return false;
  const idx = part.paths.findIndex(p => p && p.type === 'cut' && p.d);
  if (idx < 0) return false;

  const footprint = spec.footprintWorld();
  const clippedFootprint = clipPolygonByLayoutCuts(footprint, cuts, cfg || CONFIG);
  if (!clippedFootprint || clippedFootprint.length < 3) { part._layoutCutOmit = true; return true; }

  const p0 = spec.toWorld(0);
  const p1 = spec.toWorld(spec.panelW);
  const intervals = keptIntervalsOnSegmentInsidePolygon(p0, p1, clippedFootprint);
  if (!intervals.length) { part._layoutCutOmit = true; return true; }

  // The kept footprint is convex under the current layout-cut model, so a
  // wall edge has one continuous kept interval. Merge defensively anyway.
  const t0 = Math.min(...intervals.map(r => r[0]));
  const t1 = Math.max(...intervals.map(r => r[1]));
  const x0 = Math.max(0, spec.panelW * t0);
  const x1 = Math.min(spec.panelW, spec.panelW * t1);
  if (x1 - x0 <= 0.01) { part._layoutCutOmit = true; return true; }

  // Nothing to crop.
  if (x0 <= 0.01 && x1 >= spec.panelW - 0.01) return true;

  const pts = parseSvgPathToPoints(part.paths[idx].d);
  if (pts.length >= 3) {
    // Preserve protruding edge tabs when the original wall edge is still part
    // of the retained interval. Only newly cut layout boundaries should be
    // straight vertical crop edges. This is especially important for wing side
    // walls: the main wall already has matching vertical slots, so clipping
    // the side-wall outline at x=0 removed the very tabs needed for assembly.
    const tabPad = (spec.kind === 'core') ? (Number(spec.matT) || 0) : 0;
    const clipX0 = (x0 <= 0.01) ? x0 - tabPad : x0;
    const clipX1 = (x1 >= spec.panelW - 0.01) ? x1 + tabPad : x1;
    const clipped = clipLocalPolygonToXInterval(pts, clipX0, clipX1);
    if (clipped.length < 3) { part._layoutCutOmit = true; return true; }
    part.paths[idx] = { ...part.paths[idx], d: pointsToSvgPath(clipped), _layoutClipped: true };
  }

  if (Array.isArray(part.rects)) {
    part.rects = part.rects
      .map(r => (r && r.type === 'cut') ? clipRectToXInterval(r, x0, x1) : r)
      .filter(Boolean);
  }
  if (Array.isArray(part.lines)) {
    part.lines = part.lines.map(l => clipLineToXInterval(l, x0, x1)).filter(Boolean);
  }

  const outlinePts = parseSvgPathToPoints(part.paths[idx].d);
  const b = polygonBounds(outlinePts);
  if (isFinite(b.w) && isFinite(b.h) && b.w > 0 && b.h > 0) {
    part.bboxW = b.w;
    part.bboxH = b.h;
    part.bboxOffsetX = -b.minX;
    part.bboxOffsetY = -b.minY;
    if (!/layout cut/.test(part.name || '')) part.name = (part.name || part.id) + ' — layout cut';
  }
  return true;
}

export function polygonIsConvex(poly) {
  if (!Array.isArray(poly) || poly.length < 4) return true;
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], c = poly[(i + 2) % poly.length];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < 1e-6) continue;
    const s = cross > 0 ? 1 : -1;
    if (!sign) sign = s;
    else if (sign !== s) return false;
  }
  return true;
}

export function applyLayoutCutsToPart(part, cuts, cfg) {
  if (!shouldLayoutClipPart(part)) return;
  if (!Array.isArray(part.paths) || part.paths.length === 0) return;
  const idx = part.paths.findIndex(p => p && p.type === 'cut' && p.d);
  if (idx < 0) return;

  const tx = layoutCutTransformForPart(part, cfg || CONFIG);
  const baseLocal = parseSvgPathToPoints(part.paths[idx].d);
  if (baseLocal.length < 3) return;

  // Layout cuts are authored in shape-editor/global floor-plan coordinates.
  // Convert this part's SVG-local outline into that frame before clipping,
  // then convert the clipped result back to the part's local SVG frame.
  const baseWorld = baseLocal.map(p => tx.toWorld(p));
  const clippedWorld = clipPolygonByLayoutCuts(baseWorld, cuts, cfg || CONFIG);
  if (clippedWorld.length < 3) { part._layoutCutOmit = true; return; }
  const clippedLocal = clippedWorld.map(p => tx.toLocal(p));
  part.paths[idx] = { ...part.paths[idx], d: pointsToSvgPath(clippedLocal), _layoutClipped: true };

  // Keep secondary holes only when their approximate centre remains inside
  // the clipped world polygon.
  part.paths = part.paths.filter((p, i) => {
    if (i === idx) return true;
    if (!p || p.type !== 'cut' || !p.d) return true;
    const c = pathCentroidApprox(p.d);
    return !c || pointInPolygon(tx.toWorld(c), clippedWorld);
  });

  if (Array.isArray(part.rects)) {
    part.rects = part.rects.filter(r => !r || r.type !== 'cut' || pointInPolygon(tx.toWorld({ x: r.x + r.w / 2, y: r.y + r.h / 2 }), clippedWorld));
  }

  // Etched cladding lines should not continue across the cropped-off area.
  // For convex clipped roof/cladding polygons, trim each segment exactly;
  // for non-convex floor outlines with slot notches, fall back to midpoint
  // filtering so we avoid producing invalid segment fragments.
  if (Array.isArray(part.lines)) {
    const convex = polygonIsConvex(clippedWorld);
    const newLines = [];
    for (const l of part.lines) {
      if (!l) continue;
      const aW = tx.toWorld({ x: l.x1, y: l.y1 });
      const bW = tx.toWorld({ x: l.x2, y: l.y2 });
      if (convex) {
        const seg = clipSegmentToConvexPolygon(aW.x, aW.y, bW.x, bW.y, clippedWorld);
        if (!seg) continue;
        const aL = tx.toLocal({ x: seg.x1, y: seg.y1 });
        const bL = tx.toLocal({ x: seg.x2, y: seg.y2 });
        newLines.push({ ...l, x1: aL.x, y1: aL.y, x2: bL.x, y2: bL.y });
      } else {
        const midW = { x: (aW.x + bW.x) / 2, y: (aW.y + bW.y) / 2 };
        if (pointInPolygon(midW, clippedWorld)) newLines.push(l);
      }
    }
    part.lines = newLines;
  }

  const b = polygonBounds(clippedLocal);
  if (isFinite(b.w) && isFinite(b.h) && b.w > 0 && b.h > 0) {
    part.bboxW = b.w;
    part.bboxH = b.h;
    part.bboxOffsetX = -b.minX;
    part.bboxOffsetY = -b.minY;
    if (!/layout cut/.test(part.name || '')) part.name = (part.name || part.id) + ' — layout cut';
  }
}

export function applyLayoutCutsToGeneratedParts(cfg, parts) {
  if (!layoutCutsActive(cfg) || !Array.isArray(parts)) return;
  refreshMeasuredLayoutCuts(cfg);
  const cuts = (cfg.layoutCuts || []).filter(c => c && c.enabled !== false);
  if (!cuts.length) return;
  for (const p of parts) {
    if (!applyLayoutCutsToWallPart(p, cuts, cfg)) applyLayoutCutsToPart(p, cuts, cfg);
  }
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i] && parts[i]._layoutCutOmit) parts.splice(i, 1);
  }
}

export function layoutCutRetainedXIntervalForPart(part, cfg) {
  if (!layoutCutsActive(cfg) || !part) return null;
  const spec = layoutCutWallClipSpec(part, cfg || CONFIG);
  if (!spec) return null;
  refreshMeasuredLayoutCuts(cfg || CONFIG);
  const cuts = ((cfg || CONFIG).layoutCuts || []).filter(c => c && c.enabled !== false);
  if (!cuts.length) return null;

  const footprint = spec.footprintWorld();
  const clippedFootprint = clipPolygonByLayoutCuts(footprint, cuts, cfg || CONFIG);
  if (!clippedFootprint || clippedFootprint.length < 3) {
    return { omit: true, x0: 0, x1: 0 };
  }

  const p0 = spec.toWorld(0);
  const p1 = spec.toWorld(spec.panelW);
  const intervals = keptIntervalsOnSegmentInsidePolygon(p0, p1, clippedFootprint);
  if (!intervals.length) return { omit: true, x0: 0, x1: 0 };

  const t0 = Math.min(...intervals.map(r => r[0]));
  const t1 = Math.max(...intervals.map(r => r[1]));
  const x0 = Math.max(0, spec.panelW * t0);
  const x1 = Math.min(spec.panelW, spec.panelW * t1);
  if (x1 - x0 <= 0.01) return { omit: true, x0: 0, x1: 0 };
  return { omit: false, x0, x1 };
}

export function clipOpeningSpecsForLayoutCut(part, specs, cfg, minW = 1.0) {
  if (!Array.isArray(specs) || specs.length === 0) return [];
  const interval = layoutCutRetainedXIntervalForPart(part, cfg || CONFIG);
  if (!interval) return specs.map(s => ({ ...s, partial: false, originalW: s.originalW || s.w, clipLeft: s.clipLeft || 0 }));
  if (interval.omit) return [];

  const out = [];
  for (const s of specs) {
    if (!s || !(s.w > 0) || !(s.h > 0)) continue;
    const sx0 = s.x != null ? s.x : 0;
    const sx1 = sx0 + s.w;
    const k0 = Math.max(sx0, interval.x0);
    const k1 = Math.min(sx1, interval.x1);
    const w = k1 - k0;
    if (w < minW) continue;
    const clipLeft = (s.clipLeft || 0) + (k0 - sx0);
    out.push({
      ...s,
      x: k0 - interval.x0,
      w,
      originalW: s.originalW || s.w,
      clipLeft,
      partial: Math.abs(w - (s.originalW || s.w)) > 0.01 || Math.abs(clipLeft) > 0.01,
    });
  }
  return out;
}

export function tallyDoorSpecs(doorSpecs) {
  const t = {};
  for (const d of (doorSpecs || [])) {
    const s = d && d.style;
    if (s && s !== 'none') t[s] = (t[s] || 0) + 1;
  }
  return t;
}

export function mergeTallies(dst, src) {
  for (const [s, n] of Object.entries(src || {})) dst[s] = (dst[s] || 0) + n;
  return dst;
}

export function slotCenterInOneOfRanges(slot, ranges) {
  const c = (slot.start + slot.end) / 2;
  return (ranges || []).some(r => c >= r[0] - 0.01 && c <= r[1] + 0.01);
}

export function halfWidthSlotSegment(slot, forWingPiece = false) {
  const a = Number(slot && slot.start) || 0;
  const b = Number(slot && slot.end) || 0;
  const mid = (a + b) / 2;

  // A split floor seam should NOT create half-depth slots: the wall tongue
  // material thickness is still full core thickness. Instead, split the
  // slot lengthwise. The main-floor piece gets one half of the wall tongue's
  // slot width, and the separated wing-floor piece gets the complementary
  // half. When the two floor pieces butt together, the wall sees one full
  // length slot with normal material-depth clearance.
  return forWingPiece
    ? { ...slot, start: mid, end: b, splitHalfWidthSlot: true }
    : { ...slot, start: a,   end: mid, splitHalfWidthSlot: true };
}

export function applyFloorSplitHalfWidthSlots(slots, ranges) {
  if (!ranges || ranges.length === 0) return slots || [];
  return (slots || [])
    .map(s => slotCenterInOneOfRanges(s, ranges) ? halfWidthSlotSegment(s, false) : s)
    .filter(s => (s.end - s.start) > 0.01);
}

export function floorSplitRangesByFace(cfg, matT, sideLen) {
  const out = { front: [], back: [], east: [], west: [] };
  for (const w of (cfg && cfg._floorSplitHalfSlots) || []) {
    if (!w || !out[w.face]) continue;
    if (w.face === 'east' || w.face === 'west') {
      out[w.face].push([
        Math.max(0, w.offset - matT),
        Math.min(sideLen, w.offset + w.span - matT),
      ]);
    } else {
      out[w.face].push([w.offset, w.offset + w.span]);
    }
  }
  return out;
}

export function sortedSlotsByStart(slots, reverse) {
  const a = [...(slots || [])];
  a.sort(reverse ? ((x, y) => y.start - x.start) : ((x, y) => x.start - y.start));
  return a;
}

export function floorSlotDepth(slot, matT) {
  return matT * ((slot && slot.depthFactor) || 1);
}

export function wingOuterDepth(wing) {
  return Math.max(0, Number(wing && wing.depth) || 0);
}

export function wingSideWallBodyLength(wing, matT) {
  // Wing side walls run from the main-wall connection seam to the inner face
  // of the far wing wall. Because the connection-face wall is omitted, only
  // the far wall thickness is removed from the outward depth.
  return Math.max(0, wingOuterDepth(wing) - (Number(matT) || 0));
}

export function mainFloorSeamSlotsForWing(cfg, plan, wing) {
  const { H, matT, tw, sideLen, fbWidth, bayXStart, bayXEnd, hasFrontBay, hasBackBay } = plan;
  const margin = Math.max(matT * 2, 5);
  const doorStyle = cfg.doorStyle;
  function doorForbiddenZones(wallDoors) {
    return bottomTongueForbiddenZones(wallDoors, cfg, H);
  }
  function getWallDoors(manualKey, edgeLen, wallH, count, hasBay) {
    const manual = manualStructuralOps(cfg, manualKey);
    if (manual) return manual.filter(o => o.type === 'door');
    if (count <= 0 || !doorStyle || doorStyle === 'none') return [];
    if (hasBay) return [];
    return computeDoors(edgeLen, wallH, { doorStyle, doorCount: count, hasOpening: false, bayXStart: 0, bayXEnd: 0 });
  }
  const frontDoors = getWallDoors('front', fbWidth, H, cfg.frontDoorCount || 0, hasFrontBay);
  const backDoors  = getWallDoors('back',  fbWidth, H, cfg.backDoorCount  || 0, hasBackBay);
  const eastDoors  = getWallDoors('east',  sideLen, H, cfg.sideDoorCount  || 0, false);
  const westDoors  = getWallDoors('west',  sideLen, H, cfg.sideDoorCount  || 0, false);

  // Use the same wall-local bay coordinates as generateFrontBackWall().
  // This matters for through-bays: the back wall's bay/tongue layout is
  // mirrored in wall-local space, and the floor slot exclusions must match
  // that wall part rather than reusing the front wall's canonical X range.
  const frontBaySlotX = planBayXFor(plan, 'front');
  const backBaySlotX  = planBayXFor(plan, 'back');
  const frontForbidden = [...(hasFrontBay ? [[frontBaySlotX.bayXStart, frontBaySlotX.bayXEnd]] : []), ...doorForbiddenZones(frontDoors)];
  const backForbidden  = [...(hasBackBay  ? [[backBaySlotX.bayXStart,  backBaySlotX.bayXEnd ]] : []), ...doorForbiddenZones(backDoors)];
  const eastForbidden  = doorForbiddenZones(eastDoors);
  const westForbidden  = doorForbiddenZones(westDoors);

  const frontSlots = mirrorSlotsAlongEdge(applyWallAssemblyKeyToTongues(
    placeTongues(fbWidth, tw, margin, frontForbidden, 3, tw / 2),
    fbWidth, cfg, 'front', frontForbidden, matT, tw, margin
  ), fbWidth);
  const backSlots  = applyWallAssemblyKeyToTongues(
    placeTongues(fbWidth, tw, margin, backForbidden,  3, tw / 2),
    fbWidth, cfg, 'back', backForbidden, matT, tw, margin
  );
  const eastSlots  = applyWallAssemblyKeyToTongues(
    placeTongues(sideLen, tw, margin, eastForbidden,  3, tw / 2),
    sideLen, cfg, 'east', eastForbidden, matT, tw, margin
  ).map(s => ({ start: matT + s.start, end: matT + s.end }));
  const westSlots  = applyWallAssemblyKeyToTongues(
    placeTongues(sideLen, tw, margin, westForbidden,  3, tw / 2),
    sideLen, cfg, 'west', westForbidden, matT, tw, margin
  ).map(s => ({ start: matT + s.start, end: matT + s.end }));

  const all = { front: frontSlots, back: backSlots, east: eastSlots, west: westSlots }[wing.face] || [];
  const r = [wing.offset, wing.offset + wing.span];
  return all
    .filter(s => {
      const c = (s.start + s.end) / 2;
      return c >= r[0] - 0.01 && c <= r[1] + 0.01;
    })
    .map(s => ({ start: Math.max(0, s.start - wing.offset), end: Math.min(wing.span, s.end - wing.offset) }))
    .filter(s => s.end - s.start > 0.01);
}

export function buildPanelizedWingFloorPart(cfg, plan, wing, index) {
  const matT = plan.matT;
  const tw = plan.tw;
  const margin = Math.max(matT * 2, 5);
  const W = wing.span;
  const H = wingOuterDepth(wing);
  const sideBodyLen = wingSideWallBodyLength(wing, matT);
  const seamSlots = (wing.connection === 'open')
    ? []
    : mainFloorSeamSlotsForWing(cfg, plan, wing).map(s => halfWidthSlotSegment(s, true));
  const farSlots  = placeTongues(W, tw, margin, [], 3, tw / 2);
  const sideSlots = placeTongues(sideBodyLen, tw, margin, [], 3, tw / 2);
  const fx = v => v.toFixed(3);
  let d = 'M 0,0';

  // Connection edge: complementary half-WIDTH, full-depth slots. The wall
  // tongue remains full material thickness; only its along-wall slot length
  // is split between the two floor pieces.
  let x = 0;
  for (const s of sortedSlotsByStart(seamSlots, false)) {
    if (s.start > x) d += ` L ${fx(s.start)},0`;
    d += ` L ${fx(s.start)},${fx(matT)} L ${fx(s.end)},${fx(matT)} L ${fx(s.end)},0`;
    x = s.end;
  }
  d += ` L ${fx(W)},0`;

  // Right side wall slots, full depth.
  let y = 0;
  for (const s of sortedSlotsByStart(sideSlots, false)) {
    const y1 = s.start, y2 = s.end;
    if (y1 > y) d += ` L ${fx(W)},${fx(y1)}`;
    d += ` L ${fx(W - matT)},${fx(y1)} L ${fx(W - matT)},${fx(y2)} L ${fx(W)},${fx(y2)}`;
    y = y2;
  }
  d += ` L ${fx(W)},${fx(H)}`;

  // Far edge slots, full depth.
  x = W;
  for (const s of sortedSlotsByStart(farSlots, true)) {
    if (s.end < x) d += ` L ${fx(s.end)},${fx(H)}`;
    d += ` L ${fx(s.end)},${fx(H - matT)} L ${fx(s.start)},${fx(H - matT)} L ${fx(s.start)},${fx(H)}`;
    x = s.start;
  }
  d += ` L 0,${fx(H)}`;

  // Left side wall slots, full depth.
  y = H;
  for (const s of sortedSlotsByStart(sideSlots, true)) {
    const y1 = s.start, y2 = s.end;
    if (y2 < y) d += ` L 0,${fx(y2)}`;
    d += ` L ${fx(matT)},${fx(y2)} L ${fx(matT)},${fx(y1)} L 0,${fx(y1)}`;
    y = y1;
  }
  d += ' L 0,0 Z';

  const faceLabel = wing.face.charAt(0).toUpperCase() + wing.face.slice(1);
  return {
    id: `floor_split_wing_${wing.id || index}`,
    name: `Floor split piece — ${faceLabel} wing (${W.toFixed(1)} × ${H.toFixed(1)}mm, half-width wall slots at join)`,
    material: 'core',
    bboxW: W,
    bboxH: H,
    bboxOffsetX: 0,
    bboxOffsetY: 0,
    paths: [{ type: 'cut', d }],
    rects: [],
    lines: [
      { type: 'etch', x1: 0, y1: matT, x2: W, y2: matT },
    ],
    _panelizedFloor: true,
    // This split wing floor is drawn in wing-local coordinates. Layout cuts
    // are authored in global Shape Editor coordinates, so give the cropper
    // the transform it needs to clip this piece. Without this, a material-size
    // split wing floor ignored arc/line layout cuts completely.
    _layoutClipTransform: {
      kind: 'wing',
      face: wing.face,
      offset: wing.offset,
      mainW: cfg.width,
      mainD: cfg.depth,
      localOffsetX: 0,
      localOffsetY: 0,
    },
  };
}

export function chooseFloorWingSplits(cfg, plan, wings) {
  // Try the least invasive split set first: split the largest extension,
  // then add more wings only if the main piece still exceeds the material.
  const sorted = [...wings].sort((a, b) => (wingOuterDepth(b) * b.span) - (wingOuterDepth(a) * a.span));
  const split = [];
  for (const w of sorted) {
    split.push(w);
    const splitIds = new Set(split.map(x => x.id));
    const remaining = wings.filter(x => !splitIds.has(x.id));
    const mainCfg = Object.assign({}, cfg, {
      wings: remaining,
      _floorSplitHalfSlots: split,
    });
    const mainPart = generateMergedFloorRaw(mainCfg, plan);
    mainPart.id = 'floor_main_panelized';
    mainPart.name = split.length === 1
      ? 'Floor split piece — main building (with matching half-width wall slots)'
      : `Floor split piece — main building (${split.length} wing joins with matching half-width wall slots)`;
    mainPart._panelizedFloor = true;

    const wingParts = split.map((wing, i) => buildPanelizedWingFloorPart(cfg, plan, wing, i + 1));
    const allParts = [mainPart, ...wingParts];
    if (allParts.every(p => partFitsMaterial(p, 'core'))) return { parts: allParts, splitWings: split };
  }
  return null;
}

/* Generate a floor part, panelizing wing floors only when the completed floor
 * exceeds the configured material sheet size. Wing splitting is deliberately
 * conditional: a merged floor that fits the material stays one piece. When a
 * split is needed, the split follows one or more wing connection seams and
 * creates complementary half-width, full-depth wall slots on the main-floor
 * piece and on each separated wing-floor piece. */
export function generateMergedFloor(cfg, plan) {
  const raw = generateMergedFloorRaw(cfg, plan);
  if (!floorPartExceedsMaterial(raw, 'core')) return raw;

  const wings = (cfg.wings || []).filter(Boolean);
  if (!wings.length) return raw;

  const split = chooseFloorWingSplits(cfg, plan, wings);
  if (!split || !split.parts || split.parts.length === 0) return raw;
  return split.parts;
}

/* Generate inter-floor core panels. These sit horizontally inside the building 
   at each interFloorY position. Each panel has tongues on 3 of 4 edges; the 
   4th edge (the lastWallSide direction) has no tongues — it just rests against 
   the inner face of the wall installed last.
   
   Local frame: x runs LEFT-RIGHT (matches west-east in the building),
                y runs TOP-BOTTOM (matches front-back).
                'top' edge of the panel (y=0) corresponds to the FRONT wall.
                'bottom' edge (y=bcH) corresponds to the BACK wall.
                'left' edge (x=0) corresponds to the WEST side wall.
                'right' edge (x=bcW) corresponds to the EAST side wall.
*/
/* ---- Cutout path helpers ---- */
export function holeCirPath(cx, cy, r) {
  // Full circle as a closed SVG path (two 180° arcs)
  const f = v => v.toFixed(3);
  return `M ${f(cx - r)},${f(cy)} A ${f(r)},${f(r)} 0 1 0 ${f(cx + r)},${f(cy)} A ${f(r)},${f(r)} 0 1 0 ${f(cx - r)},${f(cy)} Z`;
}
export function holeRectPath(cx, cy, w, h) {
  const [x, y] = [cx - w/2, cy - h/2];
  return `M ${x.toFixed(3)},${y.toFixed(3)} h ${w.toFixed(3)} v ${h.toFixed(3)} h ${(-w).toFixed(3)} Z`;
}
export function holePathsForList(holes) {
  return (holes || []).map(h => ({
    type: 'cut',
    d: h.shape === 'circle'
      ? holeCirPath(h.x, h.y, (h.d || 3) / 2)
      : holeRectPath(h.x, h.y, h.w || 5, h.h || 5),
  }));
}

/* Donut/ring floor helper. Returns a centered rectangular cut opening for
 * wire access, or null when the panel is too small. The opening is always
 * expressed in the same local coordinate frame as the supplied panel rect;
 * it does not shift wall slots, floor holes, etched guides, or any other
 * placed feature coordinates. */
export function floorOutlineOpeningRectFor(cfg, x, y, w, h, opts = {}) {
  if (!cfg || !cfg.floorOutlineOpening) return null;
  const borderRaw = Number(cfg.floorOutlineBorderMm);
  let border = Number.isFinite(borderRaw) ? borderRaw : 8;
  const minFrame = opts.minFrameMm || 3;
  const minOpening = opts.minOpeningMm || 8;
  border = Math.max(minFrame, border);
  const maxBorder = Math.min(w, h) / 2 - minOpening / 2;
  if (!Number.isFinite(maxBorder) || maxBorder < minFrame) return null;
  border = Math.min(border, maxBorder);
  const ow = w - 2 * border;
  const oh = h - 2 * border;
  if (ow < minOpening || oh < minOpening) return null;
  return { x: x + border, y: y + border, w: ow, h: oh, border };
}
export function floorOutlineOpeningPathsFor(cfg, x, y, w, h, opts = {}) {
  const r = floorOutlineOpeningRectFor(cfg, x, y, w, h, opts);
  return r ? [{ type: 'cut', d: rectPath(r.x, r.y, r.w, r.h), _label: 'floor-wire-access-opening' }] : [];
}


export function translatedHolePathsForRect(holes, rx, ry, rw, rh, cfg) {
  const out = [];
  for (const h of (holes || [])) {
    if (cfg && floorHoleOverlapsEmbeddedRailSafety(h, cfg)) continue;
    const hb = floorHoleBBox(h);
    if (!rectsOverlap(hb, { x: rx, y: ry, w: rw, h: rh }, 0)) continue;
    if (h.shape === 'circle') {
      out.push({ type: 'cut', d: holeCirPath(h.x - rx, h.y - ry, (h.d || 3) / 2) });
    } else {
      out.push({ type: 'cut', d: holeRectPath(h.x - rx, h.y - ry, h.w || 5, h.h || 5) });
    }
  }
  return out;
}
export function embeddedRailSlotPathLocal(z, widthAcrossTrack) {
  const o = embeddedRailOrientation(z);
  if (o === 'ew') {
    const cy = z.h / 2 + (z.trackOffset || 0);
    return rectPath(0, cy - widthAcrossTrack / 2, z.w, widthAcrossTrack);
  }
  const cx = z.w / 2 + (z.trackOffset || 0);
  return rectPath(cx - widthAcrossTrack / 2, 0, widthAcrossTrack, z.h);
}
export function embeddedRailGuideLinesLocal(z, widthAcrossTrack, type = 'etch') {
  const o = embeddedRailOrientation(z);
  if (o === 'ew') {
    const cy = z.h / 2 + (z.trackOffset || 0);
    return [
      { type, x1: 0, y1: cy - widthAcrossTrack / 2, x2: z.w, y2: cy - widthAcrossTrack / 2 },
      { type, x1: 0, y1: cy + widthAcrossTrack / 2, x2: z.w, y2: cy + widthAcrossTrack / 2 },
    ];
  }
  const cx = z.w / 2 + (z.trackOffset || 0);
  return [
    { type, x1: cx - widthAcrossTrack / 2, y1: 0, x2: cx - widthAcrossTrack / 2, y2: z.h },
    { type, x1: cx + widthAcrossTrack / 2, y1: 0, x2: cx + widthAcrossTrack / 2, y2: z.h },
  ];
}
export function generateEmbeddedRailParts(cfg, plan) {
  const rails = embeddedRailsForCfg(cfg);
  if (!rails.length) return [];
  const parts = [];
  const matT = cfg.coreThickness || 1.5;
  rails.forEach((z, i) => {
    const pr = embeddedRailProfile(z);
    const nameBase = `Embedded rail #${i + 1}`;
    const holes = translatedHolePathsForRect(cfg.floorHoles || [], z.x, z.y, z.w, z.h, cfg);
    parts.push({
      id: `embedded_rail_${i + 1}_riser`,
      name: `${nameBase} — 1.5mm riser layer to bring floor up to sleeper base`,
      material: 'core', bboxW: z.w, bboxH: z.h, bboxOffsetX: 0, bboxOffsetY: 0,
      paths: [{ type: 'cut', d: rectPath(0, 0, z.w, z.h) }, ...holes],
      rects: [],
      lines: embeddedRailGuideLinesLocal(z, pr.sleeperWidthMm, 'etch'),
    });
    parts.push({
      id: `embedded_rail_${i + 1}_sleeper_surround`,
      name: `${nameBase} — sleeper-height surround layer (track + sleeper cutout)`,
      material: 'core', bboxW: z.w, bboxH: z.h, bboxOffsetX: 0, bboxOffsetY: 0,
      paths: [{ type: 'cut', d: rectPath(0, 0, z.w, z.h) }, { type: 'cut', d: embeddedRailSlotPathLocal(z, pr.sleeperWidthMm) }, ...holes],
      rects: [],
      lines: embeddedRailGuideLinesLocal(z, pr.outsideRailWidthMm, 'etch'),
    });
    parts.push({
      id: `embedded_rail_${i + 1}_rail_surround`,
      name: `${nameBase} — rail-top surround layer (outside-rail cutout)`,
      material: 'core', bboxW: z.w, bboxH: z.h, bboxOffsetX: 0, bboxOffsetY: 0,
      paths: [{ type: 'cut', d: rectPath(0, 0, z.w, z.h) }, { type: 'cut', d: embeddedRailSlotPathLocal(z, pr.outsideRailWidthMm) }, ...holes],
      rects: [],
      lines: embeddedRailGuideLinesLocal(z, pr.betweenRailsInsertWidthMm, 'etch'),
    });
    const insertW = pr.betweenRailsInsertWidthMm || 7.2;
    const isEW = embeddedRailOrientation(z) === 'ew';
    parts.push({
      id: `embedded_rail_${i + 1}_between_rails_insert`,
      name: `${nameBase} — between-rails insert (${insertW.toFixed(1)}mm, flange clearance preserved)`,
      material: 'core',
      bboxW: isEW ? z.w : insertW,
      bboxH: isEW ? insertW : z.h,
      bboxOffsetX: 0, bboxOffsetY: 0,
      paths: [{ type: 'cut', d: rectPath(0, 0, isEW ? z.w : insertW, isEW ? insertW : z.h) }],
      rects: [], lines: [],
    });
    // Simple optional access stair/ramp cards when the raised zone is not the whole floor.
    const bcW = (cfg.width || plan.fbWidth || 80) - 2 * matT;
    const bcH = (cfg.depth || (plan.sideLen + 2 * matT) || 80) - 2 * matT;
    if (z.w < bcW - 1 || z.h < bcH - 1) {
      const stairW = Math.min(18, Math.max(10, embeddedRailOrientation(z) === 'ns' ? z.w : z.h));
      const stairD = 6;
      const treadLines = [];
      for (let t = 1; t < 4; t++) treadLines.push({ type:'etch', x1: 0, y1: (stairD * t) / 4, x2: stairW, y2: (stairD * t) / 4 });
      parts.push({
        id: `embedded_rail_${i + 1}_access_stairs_pair`,
        name: `${nameBase} — two access stair/ramp overlays for raised track platform`,
        material: 'core', bboxW: stairW, bboxH: stairD * 2 + 2, bboxOffsetX: 0, bboxOffsetY: 0,
        paths: [
          { type:'cut', d: rectPath(0, 0, stairW, stairD) },
          { type:'cut', d: rectPath(0, stairD + 2, stairW, stairD) },
        ],
        rects: [],
        lines: [...treadLines, ...treadLines.map(l => ({ ...l, y1: l.y1 + stairD + 2, y2: l.y2 + stairD + 2 }))],
      });
    }
  });
  return parts;
}

/* Skylight roof cuts — each skylight contributes ONE rectangular hole cut
 * through the roof core, sized to its (w, h). Position (x, y) is the centre
 * of the hole in roof-local coords; holeRectPath expects centre-x/centre-y. */
export function skylightHolePaths(skylights) {
  return (skylights || []).map(s => ({
    type: 'cut',
    d: holeRectPath(s.x, s.y, s.w || 10, s.h || 10),
  }));
}

export function generateInterFloorPanels(cfg, plan) {
  if (!plan.interFloorYs || plan.interFloorYs.length === 0) return [];
  const { matT, sideLen, fbWidth, lastWallSide } = plan;
  const bcW = fbWidth - 2 * matT;
  const bcH = sideLen;
  const ifTw = 6;
  const margin = 3;

  // All panels use identical tongue layout — no bay-specific forbidden zones.
  // The bay opening is capped in buildEdgePlans so it never reaches the panel Y,
  // meaning the panel slots always land in solid wall material.
  const frontTongues = (lastWallSide !== 'front')
    ? placeTongues(bcW, ifTw, margin, [], Math.max(2, Math.min(4, Math.floor(bcW / 25))), ifTw)
    : [];
  const backTongues = (lastWallSide !== 'back')
    ? placeTongues(bcW, ifTw, margin, [], Math.max(2, Math.min(4, Math.floor(bcW / 25))), ifTw)
    : [];
  const eastTongues = (lastWallSide !== 'east')
    ? placeTongues(bcH, ifTw, margin, [], Math.max(2, Math.min(3, Math.floor(bcH / 35))), ifTw)
    : [];
  const westTongues = (lastWallSide !== 'west')
    ? placeTongues(bcH, ifTw, margin, [], Math.max(2, Math.min(3, Math.floor(bcH / 35))), ifTw)
    : [];

  const parts = [];
  const sortedYs = [...plan.interFloorYs].sort((a, b) => a - b);
  for (let i = 0; i < sortedYs.length; i++) {
    const fy = sortedYs[i];
    const physicalFloorNum = sortedYs.length - i + 1;

    const spec = {
      width: bcW, height: bcH, matT, kerf: cfg.kerfComp,
      edges: {
        top:    { tongues: frontTongues, openings: [] },
        right:  { tongues: eastTongues,  openings: [] },
        bottom: { tongues: backTongues,  openings: [] },
        left:   { tongues: westTongues,  openings: [] },
      }
    };
    const perimeter = buildWallPath(spec);

    const tongueLeft   = (lastWallSide !== 'west')  ? matT : 0;
    const tongueRight  = (lastWallSide !== 'east')  ? matT : 0;
    const tongueTop    = (lastWallSide !== 'front') ? matT : 0;
    const tongueBottom = (lastWallSide !== 'back')  ? matT : 0;

    parts.push({
      id: 'inter_floor_panel_' + (i + 1),
      name: `Inter-floor panel #${i + 1} (Floor ${physicalFloorNum} ceiling, y=${fy.toFixed(1)})`,
      material: 'core',
      bboxW: bcW + tongueLeft + tongueRight,
      bboxH: bcH + tongueTop  + tongueBottom,
      bboxOffsetX: tongueLeft,
      bboxOffsetY: tongueTop,
      paths: [{ type: 'cut', d: perimeter }, ...(cfg.floorOutlineOpeningOnInterFloors ? floorOutlineOpeningPathsFor(cfg, 0, 0, bcW, bcH) : []), ...holePathsForList(cfg.floorHoles)],
      rects: [],
      lines: [],
    });
  }
  return parts;
}

/* Generate the ground-floor depth-offset sub-assembly. When the user enables 
   a ground-floor offset, the first floor either projects forward of the upper 
   floors (positive amount = extension) or sits behind them (negative = recess 
   under upper-floor overhang).
   
   This is modeled as a SEPARATE small sub-assembly that the user glues to the 
   front of the main building. The main building itself is unmodified (apart from 
   its bay opening, if any — which can pass through the extension/recess to the 
   building's interior if desired).
   
   Pieces produced (all are simple rectangles with no joinery — glue assembly):
     - 1 front wall (extension) or back wall (recess): full building width × firstFloorHeight
     - 2 side walls: |offset| × firstFloorHeight
     - 1 ceiling/roof: full building width × |offset|
     - Cladding pieces matching the above (one cT outside each face)
   
   The user assembles these into a small box and glues to the building front. */
export function generateGroundFloorOffsetParts(cfg, plan) {
  if (!cfg.groundFloorOffsetEnabled) return [];
  const offset = plan.groundFloorOffset;
  if (Math.abs(offset) < 0.5) return [];  // no meaningful offset
  
  const W = cfg.width;
  const offsetMag = Math.abs(offset);
  const firstH = plan.firstFloorHeight;
  const matT = cfg.coreThickness;
  const cT = cfg.claddingThickness;
  
  const isExtension = offset > 0;  // true = extends forward; false = recess
  const modeLabel = isExtension ? 'Extension (projects forward)' : 'Recess (under overhang)';
  const namePrefix = isExtension ? 'gfo_extension' : 'gfo_recess';
  const displayPrefix = isExtension ? 'Ground-floor extension' : 'Ground-floor recess';
  
  const parts = [];
  
  // Outer-facing wall of the sub-assembly:
  //   For extension: this is the FRONT wall of the projection (faces -Y in 3D)
  //   For recess: this is the BACK wall of the recess (the inner wall you see 
  //     when looking into the recess from outside, faces +Y in 3D)
  // Width = full building width, height = firstFloorHeight, simple rectangle.
  parts.push({
    id: namePrefix + '_outer_wall',
    name: displayPrefix + ' — outer wall (' + W + ' × ' + firstH + 'mm)',
    material: 'core',
    bboxW: W, bboxH: firstH,
    bboxOffsetX: 0, bboxOffsetY: 0,
    paths: [{ type: 'cut', d: rectPath(0, 0, W, firstH) }],
    rects: [], lines: [],
  });
  
  // Two side walls of the sub-assembly. Width = |offset|, height = firstFloorHeight.
  // East and west are identical, named separately for clarity in assembly.
  for (const sideName of ['east', 'west']) {
    parts.push({
      id: namePrefix + '_side_' + sideName,
      name: displayPrefix + ' — ' + sideName + ' side wall (' + offsetMag + ' × ' + firstH + 'mm)',
      material: 'core',
      bboxW: offsetMag, bboxH: firstH,
      bboxOffsetX: 0, bboxOffsetY: 0,
      paths: [{ type: 'cut', d: rectPath(0, 0, offsetMag, firstH) }],
      rects: [], lines: [],
    });
  }
  
  // Ceiling / roof of the sub-assembly. Sits horizontally at z = firstFloorHeight.
  // Size: building width × |offset|.
  parts.push({
    id: namePrefix + '_ceiling',
    name: displayPrefix + ' — ' + (isExtension ? 'roof/shelf' : 'overhang ceiling') + ' (' + W + ' × ' + offsetMag + 'mm)',
    material: 'core',
    bboxW: W, bboxH: offsetMag,
    bboxOffsetX: 0, bboxOffsetY: 0,
    paths: [{ type: 'cut', d: rectPath(0, 0, W, offsetMag) }],
    rects: [], lines: [],
  });
  
  // ---- Cladding pieces ----
  // For extension: cladding wraps the outside of the box (front, sides, top).
  // For recess: cladding goes on the INSIDE of the box (the surfaces visible from outside).
  // In both cases, cladding sits 1 cT outside the core face.
  // For the cladding panels we use the same convention as the main building: 
  // outer face has cladding glued to it, with cT overhang on adjacent corners.
  
  // Cladding for the outer wall: matches the wall + cT overhang on each side
  // (overhanging the side walls' cladding edges, just like main building).
  parts.push({
    id: namePrefix + '_cladding_outer',
    name: displayPrefix + ' — outer wall cladding',
    material: 'cladding',
    bboxW: W + 2 * cT, bboxH: firstH + cT,
    bboxOffsetX: 0, bboxOffsetY: 0,
    paths: [{ type: 'cut', d: rectPath(0, 0, W + 2 * cT, firstH + cT) }],
    rects: [], lines: [],
  });
  
  // Side wall cladding: sits between the outer wall's overhangs (so cT shorter on the front-back direction)
  for (const sideName of ['east', 'west']) {
    parts.push({
      id: namePrefix + '_cladding_side_' + sideName,
      name: displayPrefix + ' — ' + sideName + ' side cladding',
      material: 'cladding',
      bboxW: offsetMag, bboxH: firstH + cT,
      bboxOffsetX: 0, bboxOffsetY: 0,
      paths: [{ type: 'cut', d: rectPath(0, 0, offsetMag, firstH + cT) }],
      rects: [], lines: [],
    });
  }
  
  // Top cladding (extension only — recess ceiling is INSIDE the building so the 
  // visible "underside" of the upper-floor overhang gets a thin cladding panel)
  parts.push({
    id: namePrefix + '_cladding_top',
    name: displayPrefix + ' — ceiling cladding',
    material: 'cladding',
    bboxW: W + 2 * cT, bboxH: offsetMag,
    bboxOffsetX: 0, bboxOffsetY: 0,
    paths: [{ type: 'cut', d: rectPath(0, 0, W + 2 * cT, offsetMag) }],
    rects: [], lines: [],
  });
  
  return parts;
}

/* Generate horizontal trim strips. Top and/or bottom bands sit on top of the 
   cladding (one trim-thickness in front), with optional overhang past the cladding 
   edges so adjacent walls' trim meet cleanly at corners.
   
   Returns a single "trim sheet" part with all the strips laid out for cutting, 
   plus a per-strip annotation in the part name. */
/* Generate rooftop mechanical room parts. Returns an array of parts (4 walls + 
   1 roof + cladding pieces). Each wall has tongues on its BOTTOM edge that fit 
   into the slots cut in the main roof piece (created by addRoofMechRoomAndEquipment). */
export function generateRooftopMechRoom(cfg, plan) {
  if (!plan.mechRoom) return [];
  const mr = plan.mechRoom;
  const matT = cfg.coreThickness;
  const cT = cfg.claddingThickness;
  const tw = cfg.tongueWidth;
  const slotTw = 6;
  const margin = 2;
  
  const parts = [];
  
  // Front and back walls: width = mr.w, height = mr.h
  // East and west walls: width = mr.d, height = mr.h, sit BETWEEN front+back walls
  //   (so their length = mr.d - 2*matT, with tongues on left+right edges going into front+back)
  const fbW = mr.w;
  const sideW = mr.d - 2 * matT;
  
  // Bottom-edge tongues match the slots in the main roof
  const fbBottomTongues = placeTongues(fbW, slotTw, margin, [], 2, slotTw);
  const sideBottomTongues = placeTongues(sideW, slotTw, margin, [], 2, slotTw);
  
  // Vertical edges: front/back walls have slots on left+right edges to receive 
  // side-wall tongues. Side walls have tongues on left+right edges.
  const sideVTongueCount = Math.max(1, Math.min(2, Math.floor(mr.h / 12)));
  const verticalForbidden = [[0, 2], [mr.h - 2, mr.h]];
  const sideVTongues = placeTongues(mr.h, tw, 0.1, verticalForbidden, sideVTongueCount, tw / 2);
  
  // Build front wall
  function buildMechWall(label, isSide) {
    const wallW = isSide ? sideW : fbW;
    const wallH = mr.h;
    const bottomTongues = isSide ? sideBottomTongues : fbBottomTongues;
    const wallSpec = {
      width: wallW, height: wallH, matT, kerf: cfg.kerfComp,
      edges: {
        top: { tongues: [], openings: [] },
        right: { tongues: isSide ? sideVTongues : [], openings: isSide ? [] : sideVTongues },
        bottom: { tongues: bottomTongues, openings: [] },
        left: { tongues: isSide ? sideVTongues : [], openings: isSide ? [] : sideVTongues },
      }
    };
    return buildWallPath(wallSpec);
  }
  
  // Front
  parts.push({
    id: 'mechroom_front',
    name: 'Mech room — front wall',
    material: 'core',
    bboxW: fbW + 2 * matT,
    bboxH: mr.h + matT,
    bboxOffsetX: matT, bboxOffsetY: 0,
    paths: [{ type: 'cut', d: buildMechWall('front', false) }],
    rects: [], lines: [],
  });
  // Back
  parts.push({
    id: 'mechroom_back',
    name: 'Mech room — back wall',
    material: 'core',
    bboxW: fbW + 2 * matT,
    bboxH: mr.h + matT,
    bboxOffsetX: matT, bboxOffsetY: 0,
    paths: [{ type: 'cut', d: buildMechWall('back', false) }],
    rects: [], lines: [],
  });
  // East
  parts.push({
    id: 'mechroom_east',
    name: 'Mech room — east wall',
    material: 'core',
    bboxW: sideW + 2 * matT,
    bboxH: mr.h + matT,
    bboxOffsetX: matT, bboxOffsetY: 0,
    paths: [{ type: 'cut', d: buildMechWall('east', true) }],
    rects: [], lines: [],
  });
  // West
  parts.push({
    id: 'mechroom_west',
    name: 'Mech room — west wall',
    material: 'core',
    bboxW: sideW + 2 * matT,
    bboxH: mr.h + matT,
    bboxOffsetX: matT, bboxOffsetY: 0,
    paths: [{ type: 'cut', d: buildMechWall('west', true) }],
    rects: [], lines: [],
  });
  
  // Roof: simple rectangle, sized to the mech room footprint INTERIOR
  const mrRoofW = fbW - 2 * matT;
  const mrRoofH = sideW;
  parts.push({
    id: 'mechroom_roof',
    name: 'Mech room — roof',
    material: 'core',
    bboxW: mrRoofW, bboxH: mrRoofH,
    bboxOffsetX: 0, bboxOffsetY: 0,
    paths: [{ type: 'cut', d: rectPath(0, 0, mrRoofW, mrRoofH) }],
    rects: [], lines: [],
  });
  
  // Cladding: 4 walls + 1 roof. Use main building cladding style.
  // Front/back cladding overlaps side cladding (cT extra each side)
  parts.push({
    id: 'mechroom_cladding_front',
    name: 'Mech room — front cladding',
    material: 'cladding',
    bboxW: fbW + 2 * cT, bboxH: mr.h + cT,
    bboxOffsetX: 0, bboxOffsetY: 0,
    paths: [{ type: 'cut', d: rectPath(0, 0, fbW + 2 * cT, mr.h + cT) }],
    rects: [], lines: [],
  });
  parts.push({
    id: 'mechroom_cladding_back',
    name: 'Mech room — back cladding',
    material: 'cladding',
    bboxW: fbW + 2 * cT, bboxH: mr.h + cT,
    bboxOffsetX: 0, bboxOffsetY: 0,
    paths: [{ type: 'cut', d: rectPath(0, 0, fbW + 2 * cT, mr.h + cT) }],
    rects: [], lines: [],
  });
  parts.push({
    id: 'mechroom_cladding_east',
    name: 'Mech room — east cladding',
    material: 'cladding',
    bboxW: sideW, bboxH: mr.h + cT,
    bboxOffsetX: 0, bboxOffsetY: 0,
    paths: [{ type: 'cut', d: rectPath(0, 0, sideW, mr.h + cT) }],
    rects: [], lines: [],
  });
  parts.push({
    id: 'mechroom_cladding_west',
    name: 'Mech room — west cladding',
    material: 'cladding',
    bboxW: sideW, bboxH: mr.h + cT,
    bboxOffsetX: 0, bboxOffsetY: 0,
    paths: [{ type: 'cut', d: rectPath(0, 0, sideW, mr.h + cT) }],
    rects: [], lines: [],
  });
  parts.push({
    id: 'mechroom_cladding_roof',
    name: 'Mech room — roof cladding',
    material: 'cladding',
    bboxW: fbW + 2 * cT, bboxH: mr.d + 2 * cT,
    bboxOffsetX: 0, bboxOffsetY: 0,
    paths: [{ type: 'cut', d: rectPath(0, 0, fbW + 2 * cT, mr.d + 2 * cT) }],
    rects: [], lines: [],
  });
  
  return parts;
}
