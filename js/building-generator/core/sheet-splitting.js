/* =====================================================================
   SHEET-SIZE WALL SPLITTING / PANELIZATION
   ---------------------------------------------------------------------
   Oversized wall-core and wall-cladding parts are split after the normal
   generator has produced complete wall geometry. This keeps all openings,
   cladding patterns, asymmetric tab keying, rail-bay cutouts, and wing/main
   relief geometry in their original wall coordinate system; the splitter then
   makes sheet-sized windowed segments and adds interior splice plates for core
   walls.
   ===================================================================== */


export function partLocalBounds(part) {
  const ox = Number(part && part.bboxOffsetX) || 0;
  const oy = Number(part && part.bboxOffsetY) || 0;
  const w = Number(part && part.bboxW) || 0;
  const h = Number(part && part.bboxH) || 0;
  return { minX: -ox, minY: -oy, maxX: w - ox, maxY: h - oy, w, h };
}

export function rectLooksLikePartOuterBoundary(part, r) {
  if (!part || !r) return false;
  const b = partLocalBounds(part);
  const x = Number(r.x), y = Number(r.y), w = Number(r.w), h = Number(r.h);
  if (![x, y, w, h].every(Number.isFinite)) return false;
  const tol = 0.08;
  return Math.abs(x - b.minX) <= tol &&
         Math.abs(y - b.minY) <= tol &&
         Math.abs((x + w) - b.maxX) <= tol &&
         Math.abs((y + h) - b.maxY) <= tol;
}

export function pathBoundsForDiscardCheck(d) {
  try {
    const pts = parseSvgPathToPoints(d);
    if (!pts || pts.length < 2) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }
    if (![minX, minY, maxX, maxY].every(Number.isFinite)) return null;
    return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
  } catch (e) {
    return null;
  }
}

export function pathLooksLikePartOuterBoundary(part, p) {
  if (!part || !p || !p.d) return false;
  const b = partLocalBounds(part);
  const pb = pathBoundsForDiscardCheck(p.d);
  if (!pb) return false;
  const tol = 0.12;
  return Math.abs(pb.minX - b.minX) <= tol &&
         Math.abs(pb.minY - b.minY) <= tol &&
         Math.abs(pb.maxX - b.maxX) <= tol &&
         Math.abs(pb.maxY - b.maxY) <= tol;
}

export function partRoleUsesDisposableCutColor(part) {
  normalizePartMetadata(part);
  const role = part && part.meta && part.meta.role;
  return [
    'core_wall',
    'exterior_cladding',
    'interior_cladding',
    'floor_panel',
    'interfloor_panel',
    'roof_panel',
  ].includes(role);
}

export function partIsFixtureOrDetailLike(part) {
  normalizePartMetadata(part);
  const role = String((part && part.meta && part.meta.role) || '').toLowerCase();
  const id = String((part && part.id) || '').toLowerCase();
  const name = String((part && part.name) || '').toLowerCase();
  const material = String((part && part.material) || '').toLowerCase();

  return role.includes('fixture') ||
         role.includes('printed') ||
         role.includes('sign') ||
         role.includes('surface_feature') ||
         id.includes('fixture') ||
         id.includes('meter') ||
         id.includes('vent') ||
         id.includes('louver') ||
         id.includes('duct') ||
         id.includes('cabinet') ||
         id.includes('ladder') ||
         id.includes('platform_bracket') ||
         name.includes('fixture') ||
         name.includes('meter') ||
         name.includes('vent') ||
         name.includes('louver') ||
         name.includes('duct') ||
         name.includes('cabinet') ||
         name.includes('ladder') ||
         name.includes('platform bracket') ||
         material === 'printed';
}

export function partIsWindowOrDoorFrameLike(part) {
  normalizePartMetadata(part);
  const role = String((part && part.meta && part.meta.role) || '').toLowerCase();
  const id = String((part && part.id) || '').toLowerCase();
  const name = String((part && part.name) || '').toLowerCase();

  // These are retained outline parts with internal apertures that are waste:
  // window trim rings, inner frames, divider frames, door inserts/frames,
  // skylight frames, shutter/slat frames, etc. Fixture/detail/printed pieces
  // are deliberately excluded so their decorative sub-outlines stay red.
  if (partIsFixtureOrDetailLike(part)) return false;

  return role.includes('window') || role.includes('door') || role.includes('frame') ||
         id.includes('frame') || id.includes('window') || id.includes('door') ||
         id.includes('skylight') || id.includes('shutter') ||
         name.includes('frame') || name.includes('window') || name.includes('door') ||
         name.includes('skylight') || name.includes('shutter');
}

export function partMayHaveGreenDiscardInteriors(part) {
  return partRoleUsesDisposableCutColor(part) || partIsWindowOrDoorFrameLike(part);
}

export function cutOpExplicitlyDiscarded(op) {
  if (!op) return false;
  const t = String(op.type || '').toLowerCase();
  return !!(op.discard || op.dropOut || op.disposable || op.isDiscard ||
            t === 'discard' || t === 'discard_cut' || t === 'dropout' || t === 'drop_out');
}

export function cutOpExplicitlyStructural(op) {
  if (!op) return false;
  const t = String(op.type || '').toLowerCase();
  return !!(op.structural || op.outer || op.keep || op.keepPiece ||
            t === 'outer' || t === 'outline' || t === 'structural_cut');
}

export function cutOpIsCutLike(op) {
  const t = String((op && op.type) || '').toLowerCase();
  return t === 'cut' || t === 'hole' || t === 'opening' ||
         t === 'discard' || t === 'discard_cut' || t === 'dropout' || t === 'drop_out' ||
         t === 'outer' || t === 'outline' || t === 'structural_cut';
}

export function cutOpBounds(op, kind) {
  if (!op) return null;
  if (kind === 'rect') {
    const x = Number(op.x), y = Number(op.y), w = Number(op.w), h = Number(op.h);
    if (![x, y, w, h].every(Number.isFinite)) return null;
    return { minX: x, minY: y, maxX: x + w, maxY: y + h, w, h };
  }
  if (kind === 'path' && op.d) return pathBoundsForDiscardCheck(op.d);
  return null;
}

export function boundsStrictlyContain(outer, inner, tol = 0.05) {
  if (!outer || !inner) return false;
  const outerW = outer.maxX - outer.minX;
  const outerH = outer.maxY - outer.minY;
  const innerW = inner.maxX - inner.minX;
  const innerH = inner.maxY - inner.minY;
  if (outerW <= innerW + tol || outerH <= innerH + tol) return false;
  return outer.minX <= inner.minX + tol &&
         outer.minY <= inner.minY + tol &&
         outer.maxX >= inner.maxX - tol &&
         outer.maxY >= inner.maxY - tol;
}

export function cutOpIsInsideAnotherCut(part, op, kind, index) {
  if (!part || !op) return false;
  const b = cutOpBounds(op, kind);
  if (!b) return false;

  const paths = (part.paths || []);
  for (let i = 0; i < paths.length; i++) {
    if (kind === 'path' && i === index) continue;
    const p = paths[i];
    if (!cutOpIsCutLike(p) || cutOpExplicitlyDiscarded(p)) continue;
    const pb = cutOpBounds(p, 'path');
    if (boundsStrictlyContain(pb, b)) return true;
  }

  const rects = (part.rects || []);
  for (let i = 0; i < rects.length; i++) {
    if (kind === 'rect' && i === index) continue;
    const r = rects[i];
    if (!cutOpIsCutLike(r) || cutOpExplicitlyDiscarded(r)) continue;
    const rb = cutOpBounds(r, 'rect');
    if (boundsStrictlyContain(rb, b)) return true;
  }

  return false;
}

export function geometryStrokeColor(part, op, kind, index) {
  const type = String((op && op.type) || '').toLowerCase();

  if (type === 'etch') return COLOR_ETCH;
  if (cutOpExplicitlyDiscarded(op)) return COLOR_DISCARD_CUT;
  if (cutOpExplicitlyStructural(op)) return COLOR_CUT;

  // Hard rule: fixtures/details are kept objects. Their normal cut geometry is
  // never green, even when a fixture tile contains multiple nested rectangles.
  // Green only appears here if the operation explicitly opted into discard.
  if (partIsFixtureOrDetailLike(part)) return COLOR_CUT;

  if (cutOpIsCutLike(op)) {
    const mayHaveDiscardInteriors = partMayHaveGreenDiscardInteriors(part);
    if (!mayHaveDiscardInteriors) return COLOR_CUT;

    // Green is only for geometry that is physically inside another retained
    // cut outline on the same sheet. This fixes full exported tiled frame
    // sheets: every tile's outer frame outline stays red, while each tile's
    // inner aperture/dropout turns green. The previous index-based rule worked
    // for preview tiles but made later tile outlines green in the exported SVG.
    if (kind === 'rect' && rectLooksLikePartOuterBoundary(part, op)) return COLOR_CUT;
    return cutOpIsInsideAnotherCut(part, op, kind, index) ? COLOR_DISCARD_CUT : COLOR_CUT;
  }

  return COLOR_ETCH;
}

export function partRawGeometrySvg(part, options = {}) {
  const strokeW = options.strokeMm || 0.05;
  const kerf = options.kerf || 0;
  const isPrinted = part && part.material === 'printed';
  let svg = '';

  const renderCore = () => {
    let out = '';
    if (part && part.svgContent) out += part.svgContent;
    for (let i = 0; i < ((part && part.paths) || []).length; i++) {
      const p = ((part && part.paths) || [])[i];
      const color = geometryStrokeColor(part, p, 'path', i);
      out += `<path d="${p.d}" fill="none" stroke="${color}" stroke-width="${strokeW}"/>`;
    }
    for (let i = 0; i < ((part && part.rects) || []).length; i++) {
      const r = ((part && part.rects) || [])[i];
      const color = geometryStrokeColor(part, r, 'rect', i);
      let { x, y, w, h } = r;
      if (r.compensateKerf && kerf) {
        const exp = -kerf;
        x -= exp; y -= exp; w += 2 * exp; h += 2 * exp;
      }
      out += `<rect x="${Number(x).toFixed(3)}" y="${Number(y).toFixed(3)}" width="${Number(w).toFixed(3)}" height="${Number(h).toFixed(3)}" fill="none" stroke="${color}" stroke-width="${strokeW}"/>`;
    }
    for (const l of ((part && part.lines) || [])) {
      const isCrop = isPrinted && l.isCrop;
      const color = isCrop ? '#000' : ((l.type === 'cut') ? COLOR_CUT : COLOR_ETCH);
      const sw = isCrop ? (strokeW * 1.5) : strokeW;
      out += `<line x1="${Number(l.x1).toFixed(3)}" y1="${Number(l.y1).toFixed(3)}" x2="${Number(l.x2).toFixed(3)}" y2="${Number(l.y2).toFixed(3)}" stroke="${color}" stroke-width="${sw}"/>`;
    }
    return out;
  };

  if (part && part.mirrorX) {
    const minX = -(part.bboxOffsetX || 0);
    const maxX = (part.bboxW || 0) - (part.bboxOffsetX || 0);
    const mirrorT = minX + maxX;
    svg += `<g transform="translate(${mirrorT.toFixed(3)},0) scale(-1,1)">`;
    svg += renderCore();
    svg += `</g>`;
  } else {
    svg += renderCore();
  }
  return svg;
}

export function sheetSplitCandidateRole(part) {
  normalizePartMetadata(part);
  const role = (part.meta && part.meta.role) || inferPartRole(part);
  return [
    'core_wall',
    'exterior_cladding',
    'interior_cladding',
    // Horizontal structural panels also need sheet-size panelization. These
    // are the pieces that square the building and carry wall/interior slots:
    // ground floors, inter-floor ceilings, and roof deck/core panels.
    'floor_panel',
    'interfloor_panel',
    'roof_panel',
  ].includes(role);
}

export function sheetSplitNeedsSplicePlates(role) {
  return ['core_wall', 'floor_panel', 'interfloor_panel', 'roof_panel'].includes(role);
}

export function sheetSplitCount(lengthMm, maxMm, minSegMm) {
  if (!maxMm || lengthMm <= maxMm + 0.01) return 1;
  let n = Math.ceil(lengthMm / maxMm);
  // Avoid a tiny final segment by balancing the count. If a balanced segment
  // would be smaller than the minimum, reduce the count only when it still fits.
  while (n > 1 && (lengthMm / n) < minSegMm && (lengthMm / (n - 1)) <= maxMm + 0.01) n--;
  return Math.max(1, n);
}

export function sheetSplitBoundaries(lengthMm, maxMm, minSegMm, staggerMm = 0) {
  const n = sheetSplitCount(lengthMm, maxMm, minSegMm);
  if (n <= 1) return [0, lengthMm];
  const out = [0];
  const nominal = lengthMm / n;
  for (let i = 1; i < n; i++) {
    let b = nominal * i;
    if (staggerMm && Math.abs(staggerMm) > 0.01) {
      b += (i % 2 ? 1 : -1) * Math.min(Math.abs(staggerMm), nominal * 0.25) * Math.sign(staggerMm);
    }
    const minB = out[out.length - 1] + minSegMm;
    const maxB = lengthMm - (n - i) * minSegMm;
    b = Math.max(minB, Math.min(maxB, b));
    // Keep every segment under the sheet max. If the stagger pushed this cut
    // too far, pull it back to a legal position.
    b = Math.min(b, out[out.length - 1] + maxMm);
    out.push(b);
  }
  out.push(lengthMm);
  return out;
}

export function sheetSplitFeatureRectsForAxis(part, axis) {
  // Candidate keep-out zones for sheet split lines. These are through-cuts
  // and visible feature openings; splitting through them makes windows/doors
  // look broken across segment boundaries. Best effort only: if there is no
  // legal place to move the split, we keep the original balanced split.
  const rects = [];
  function addRect(r) {
    if (!r) return;
    const x = Number(r.x), y = Number(r.y), w = Number(r.w), h = Number(r.h);
    if (![x, y, w, h].every(Number.isFinite) || w <= 0.05 || h <= 0.05) return;
    rects.push({ x, y, w, h });
  }
  for (const r of (part.rects || [])) {
    if (!r) continue;
    const typ = String(r.type || 'cut').toLowerCase();
    // Keep out of through-cuts and explicit opening marks. Etch-only detail
    // lines are allowed to cross a split.
    if (typ === 'cut' || typ === 'hole' || typ === 'opening' || typ === 'discard' || typ === 'discard_cut' || typ === 'dropout' || typ === 'drop_out') addRect(r);
  }
  // Some wall/cladding parts keep wall-frame opening metadata for trim and
  // downstream logic. Include it when it appears to share this part's local
  // coordinate frame.
  for (const o of ((part.meta && part.meta.wallOpenings) || part.wallOpenings || [])) {
    addRect(o);
  }
  return rects;
}

export function sheetSplitBoundaryHitsFeature(boundary, rects, axis, pad = 1.25) {
  for (const r of rects) {
    const a0 = axis === 'x' ? r.x - pad : r.y - pad;
    const a1 = axis === 'x' ? r.x + r.w + pad : r.y + r.h + pad;
    if (boundary > a0 && boundary < a1) return r;
  }
  return null;
}

export function sheetSplitAdjustedBoundaryCandidate(raw, rect, axis, prev, next, minSeg, maxSeg) {
  const pad = 1.25;
  const a0 = axis === 'x' ? rect.x : rect.y;
  const a1 = axis === 'x' ? rect.x + rect.w : rect.y + rect.h;
  const candidates = [a0 - pad, a1 + pad]
    .filter(v => Number.isFinite(v))
    .filter(v => v > prev + minSeg && v < next - minSeg)
    .filter(v => !maxSeg || (v - prev <= maxSeg + 0.01 && next - v <= maxSeg + 0.01));
  if (!candidates.length) return raw;
  candidates.sort((a, b) => Math.abs(a - raw) - Math.abs(b - raw));
  return candidates[0];
}

export function sheetSplitAvoidFeatureBoundaries(bounds, part, axis, minSeg, maxSeg) {
  if (!bounds || bounds.length <= 2) return bounds;
  const rects = sheetSplitFeatureRectsForAxis(part, axis);
  if (!rects.length) return bounds;

  const out = bounds.slice();
  for (let i = 1; i < out.length - 1; i++) {
    let b = out[i];
    for (let iter = 0; iter < 8; iter++) {
      const hit = sheetSplitBoundaryHitsFeature(b, rects, axis, 1.25);
      if (!hit) break;
      const prev = out[i - 1];
      const next = out[i + 1];
      const moved = sheetSplitAdjustedBoundaryCandidate(b, hit, axis, prev, next, minSeg, maxSeg);
      if (Math.abs(moved - b) < 0.001) break;
      b = moved;
    }
    // Do not allow the fixup to break ordering or sheet constraints.
    if (b > out[i - 1] + minSeg && b < out[i + 1] - minSeg &&
        (!maxSeg || (b - out[i - 1] <= maxSeg + 0.01 && out[i + 1] - b <= maxSeg + 0.01))) {
      out[i] = b;
    }
  }
  return out;
}


export function svgPathLooksClosed(d) {
  return /[Zz]\s*$/.test(String(d || '').trim());
}

export function translatePathPointsToLocal(pts, x0, y0) {
  return (pts || []).map(p => ({ x: p.x - x0, y: p.y - y0 }));
}

export function clippedSegmentPathsToBox(x1, y1, x2, y2, x0, y0, x1b, y1b) {
  const boxPoly = [
    { x: x0,  y: y0  },
    { x: x1b, y: y0  },
    { x: x1b, y: y1b },
    { x: x0,  y: y1b },
  ];
  const pieces = clipSegmentToPolygonPieces(x1, y1, x2, y2, boxPoly);
  return pieces.map(s => `M ${(s.x1 - x0).toFixed(3)},${(s.y1 - y0).toFixed(3)} L ${(s.x2 - x0).toFixed(3)},${(s.y2 - y0).toFixed(3)}`);
}

export function sheetSplitClipPartGeometryToBox(part, x0, x1, y0, y1, cfg) {
  // Produce real, sheet-sized SVG geometry instead of relying on <clipPath>.
  // Many laser workflows ignore clipPath when calculating cut extents, which
  // left exports as one oversized wall with a line down the middle. This
  // function converts the visible clipped geometry into actual cut/etch paths,
  // rects, and lines inside the segment's local 0,0 coordinate frame.
  const out = { paths: [], rects: [], lines: [] };
  const EPS = 1e-6;
  const addPath = (type, d) => {
    if (d && String(d).trim()) out.paths.push({ type: type || 'cut', d });
  };

  function translateSimplePathFallback(d, dx, dy) {
    // Best-effort translation for unsupported but wholly-contained paths.
    // It only rewrites coordinate pairs after common drawing commands; if it
    // cannot safely parse the path, it returns null and the path is skipped.
    try {
      return String(d).replace(/([ML])\s*(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (m, c, x, y) =>
        `${c} ${(Number(x) + dx).toFixed(3)},${(Number(y) + dy).toFixed(3)}`
      ).replace(/(A\s*-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?\s+[-+]?\d+(?:\.\d+)?\s+[01],\s*[01]\s+)(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g,
        (m, pre, x, y) => `${pre}${(Number(x) + dx).toFixed(3)},${(Number(y) + dy).toFixed(3)}`
      );
    } catch (e) {
      return null;
    }
  }

  function pathPointsBBox(pts) {
    if (!pts || !pts.length) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }
    return { minX, minY, maxX, maxY };
  }

  for (const p of ((part && part.paths) || [])) {
    if (!p || !p.d) continue;
    const pts = parseSvgPathToPoints(p.d);
    if (pts.length >= 3 && svgPathLooksClosed(p.d)) {
      const clipped = clipPolygonToRect(pts, x0, y0, x1, y1);
      if (clipped.length >= 3) {
        addPath(p.type || 'cut', pointsToSvgPath(translatePathPointsToLocal(clipped, x0, y0)));
      } else {
        // If a closed hole is wholly inside the segment but clipping became
        // numerically degenerate, keep the original translated geometry.
        const bb = pathPointsBBox(pts);
        if (bb && bb.minX >= x0 - EPS && bb.maxX <= x1 + EPS && bb.minY >= y0 - EPS && bb.maxY <= y1 + EPS) {
          const translated = translateSimplePathFallback(p.d, -x0, -y0);
          if (translated) addPath(p.type || 'cut', translated);
        }
      }
    } else if (pts.length >= 2) {
      for (let i = 0; i < pts.length - 1; i++) {
        for (const d of clippedSegmentPathsToBox(pts[i].x, pts[i].y, pts[i+1].x, pts[i+1].y, x0, y0, x1, y1)) addPath(p.type || 'cut', d);
      }
    }
  }

  for (const r of ((part && part.rects) || [])) {
    if (!r) continue;
    const rx0 = Number(r.x), ry0 = Number(r.y), rx1 = rx0 + Number(r.w), ry1 = ry0 + Number(r.h);
    if (![rx0, ry0, rx1, ry1].every(Number.isFinite)) continue;
    const cx0 = Math.max(rx0, x0), cy0 = Math.max(ry0, y0), cx1 = Math.min(rx1, x1), cy1 = Math.min(ry1, y1);
    if (cx1 - cx0 > EPS && cy1 - cy0 > EPS) {
      out.rects.push({ ...r, x: cx0 - x0, y: cy0 - y0, w: cx1 - cx0, h: cy1 - cy0 });
    }
  }

  const boxPoly = [
    { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 },
  ];
  for (const l of ((part && part.lines) || [])) {
    if (!l) continue;
    const pieces = clipSegmentToPolygonPieces(Number(l.x1), Number(l.y1), Number(l.x2), Number(l.y2), boxPoly);
    for (const s of pieces) {
      out.lines.push({ ...l, x1: s.x1 - x0, y1: s.y1 - y0, x2: s.x2 - x0, y2: s.y2 - y0 });
    }
  }

  return out;
}

export function makeSheetSplitSegmentPart(part, col, row, x0Local, x1Local, y0Local, y1Local, totalCols, totalRows, cfg) {
  const minX = -(part.bboxOffsetX || 0);
  const minY = -(part.bboxOffsetY || 0);
  const x0 = minX + x0Local;
  const x1 = minX + x1Local;
  const y0 = minY + y0Local;
  const y1 = minY + y1Local;
  const w = Math.max(0.01, x1 - x0);
  const h = Math.max(0.01, y1 - y0);
  const segN = (row * totalCols) + col + 1;
  const segTotal = totalCols * totalRows;
  const clippedGeom = sheetSplitClipPartGeometryToBox(part, x0, x1, y0, y1, cfg);
  const label = segTotal > 1 ? ` Segment ${segN} of ${segTotal}` : '';

  // Do NOT add a full rectangular boundary around every split segment.
  // That was cutting straight exterior edges over the original clipped wall
  // perimeter, which destroyed tabs/slots/notched wall edges on outer segments.
  //
  // The clipped source geometry already supplies the true exterior outline
  // wherever the segment touches the original part boundary. We only add cut
  // lines along edges that are created by the sheet split itself.
  const splitBoundaryPaths = [];
  if (col > 0) {
    splitBoundaryPaths.push({ type: 'cut', d: `M 0,0 L 0,${h.toFixed(3)}` });
  }
  if (col < totalCols - 1) {
    splitBoundaryPaths.push({ type: 'cut', d: `M ${w.toFixed(3)},0 L ${w.toFixed(3)},${h.toFixed(3)}` });
  }
  if (row > 0) {
    splitBoundaryPaths.push({ type: 'cut', d: `M 0,0 L ${w.toFixed(3)},0` });
  }
  if (row < totalRows - 1) {
    splitBoundaryPaths.push({ type: 'cut', d: `M 0,${h.toFixed(3)} L ${w.toFixed(3)},${h.toFixed(3)}` });
  }

  const sp = {
    id: `${part.id}_sheetseg_${segN}`,
    name: `${part.name || part.id}${label}`,
    material: part.material,
    bboxW: w,
    bboxH: h,
    bboxOffsetX: 0,
    bboxOffsetY: 0,
    paths: clippedGeom.paths.concat(splitBoundaryPaths),
    rects: clippedGeom.rects,
    // Do not add a generic segment marker line here. The clipped source
    // geometry is already enough to identify the piece, and the old marker
    // appeared as a stray horizontal blue line on many split cladding/floor
    // parts.
    lines: clippedGeom.lines,
    meta: {
      ...(part.meta || {}),
      sheetSplit: true,
      sheetSegment: segN,
      sheetSegmentTotal: segTotal,
      sheetCol: col + 1,
      sheetRow: row + 1,
      sheetCols: totalCols,
      sheetRows: totalRows,
      sourcePartId: part.id,
      // Used by display dedupe: sheet-split pieces from different walls or
      // different source parts must not collapse into "×2 identical copies"
      // merely because a clipped SVG wrapper has the same outer size.
      dedupeSourceKey: String(part.id || part.name || 'part'),
    },
    assemblyNote: `Sheet-split segment ${segN}/${segTotal}. This SVG contains real clipped cut/etch geometry for this segment, not a visual-only clip mask, so the exported piece fits on the selected material sheet.`,
  };
  return normalizePartMetadata(sp);
}

export function makeSheetSplitSplicePlate(part, splitAtLocal, index, cfg, maxAlong = null, axis = 'x') {
  normalizePartMetadata(part);
  const spliceW = Math.max(6, Math.min(40, Number(cfg.sheetSplitSpliceWidthMm) || 16));

  // axis='x': a vertical joint between left/right panel segments. Plate is
  // narrow × tall and may be segmented along Y.
  // axis='y': a horizontal joint between top/bottom panel segments. Plate is
  // wide × narrow and may be segmented along X.
  const sourceW = Math.max(4, Number(part.bboxW) || 0);
  const sourceH = Math.max(4, Number(part.bboxH) || 0);
  const alongLen = axis === 'y' ? sourceW : sourceH;
  const maxSegAlong = maxAlong && maxAlong > 0 ? maxAlong : alongLen;
  const minSeg = Math.max(20, Number(cfg.sheetSplitMinSegmentMm) || 40);
  const alongCuts = sheetSplitBoundaries(alongLen, maxSegAlong, minSeg, 0);
  const countAlong = alongCuts.length - 1;
  const out = [];

  const safeSourceId = String(part.id || 'part').replace(/[^A-Za-z0-9_]+/g, '_');
  const axisLabel = axis === 'y' ? 'Y' : 'X';
  const nameAxis = axis === 'y' ? 'horizontal' : 'vertical';

  for (let j = 0; j < alongCuts.length - 1; j++) {
    const segAlong = alongCuts[j+1] - alongCuts[j];

    const bboxW = axis === 'y' ? segAlong : spliceW;
    const bboxH = axis === 'y' ? spliceW : segAlong;
    const d = `M 0,0 L ${bboxW.toFixed(3)},0 L ${bboxW.toFixed(3)},${bboxH.toFixed(3)} L 0,${bboxH.toFixed(3)} Z`;

    const lines = axis === 'y'
      ? [
          { type: 'etch', x1: 1, y1: spliceW/2, x2: bboxW - 1, y2: spliceW/2 },
          { type: 'etch', x1: Math.min(6, bboxW/2), y1: 1, x2: Math.min(6, bboxW/2), y2: spliceW - 1 },
        ]
      : [
          { type: 'etch', x1: spliceW/2, y1: 1, x2: spliceW/2, y2: bboxH - 1 },
          { type: 'etch', x1: 1, y1: Math.min(6, bboxH/2), x2: spliceW - 1, y2: Math.min(6, bboxH/2) },
        ];

    out.push(normalizePartMetadata({
      id: `${safeSourceId}_splice_${axisLabel}_${index}_${j+1}`,
      name: `${part.name || part.id} ${axisLabel} ${nameAxis} splice plate ${index}${countAlong > 1 ? ' ' + (j+1) + '/' + countAlong : ''}`,
      material: 'core',
      bboxW,
      bboxH,
      bboxOffsetX: 0,
      bboxOffsetY: 0,
      paths: [{ type: 'cut', d }],
      rects: [],
      lines: lines.filter(l => l.x2 !== l.x1 || l.y2 !== l.y1),
      meta: {
        ...(part.meta || {}),
        role: 'splice_plate',
        area: 'structure',
        sourcePartId: part.id,
        splitAxis: axisLabel,
        splitIndex: index,
        splitAtLocal,
        spliceSegment: j + 1,
        spliceSegmentCount: countAlong,
      },
      assemblyNote: axis === 'y'
        ? `Glue this plate across the back/underside of ${part.name || part.id} horizontal split joint ${index}. The center etch marks the butt joint line.`
        : `Glue this plate across the back/inside of ${part.name || part.id} vertical split joint ${index}. The center etch marks the butt joint line.`,
    }));
  }
  return out;
}

export function splitPartForSheet(part, cfg) {
  normalizePartMetadata(part);
  if (!cfg || cfg.sheetSplitEnabled === false) return [part];
  if (!sheetSplitCandidateRole(part)) return [part];
  if (part.tileGeom || part.material === 'printed') return [part];

  const matId = MaterialRegistry.partMaterial(part, part.material, cfg);
  const max = MaterialRegistry.effectiveSheetSizeMm(matId, cfg);
  if (!max) return [part];
  const w = Number(part.bboxW) || 0;
  const h = Number(part.bboxH) || 0;
  if (w <= max.w + 0.01 && h <= max.h + 0.01) return [part];
  // If rotating the whole part would fit, leave it as one piece — the user can
  // rotate it in the laser layout/import step.
  if (h <= max.w + 0.01 && w <= max.h + 0.01) return [part];

  const minSeg = Math.max(10, Number(cfg.sheetSplitMinSegmentMm) || 40);
  const role = (part.meta && part.meta.role) || inferPartRole(part);
  const isCladding = role === 'exterior_cladding' || role === 'interior_cladding';
  const stagger = isCladding ? (Number(cfg.sheetSplitStaggerCladdingMm) || 24) : 0;
  let xs = sheetSplitBoundaries(w, max.w, minSeg, stagger);
  let ys = sheetSplitBoundaries(h, max.h, Math.min(minSeg, Math.max(10, h / 2)), 0);
  xs = sheetSplitAvoidFeatureBoundaries(xs, part, 'x', minSeg, max.w);
  ys = sheetSplitAvoidFeatureBoundaries(ys, part, 'y', Math.min(minSeg, Math.max(10, h / 2)), max.h);
  if (xs.length <= 2 && ys.length <= 2) return [part];

  const segs = [];
  const cols = xs.length - 1;
  const rows = ys.length - 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      segs.push(makeSheetSplitSegmentPart(part, c, r, xs[c], xs[c+1], ys[r], ys[r+1], cols, rows, cfg));
    }
  }

  if (sheetSplitNeedsSplicePlates(role)) {
    // X-boundary splice plates bridge left/right segments. For walls this is
    // the original interior backing plate behavior. For floors/ceilings/roof
    // decks these become underside/backing splice plates across the break cut.
    if (xs.length > 2) {
      for (let i = 1; i < xs.length - 1; i++) {
        segs.push(...makeSheetSplitSplicePlate(part, xs[i], i, cfg, max.h, 'x'));
      }
    }
    // Y-boundary splits need their own horizontal splice plates. The earlier
    // implementation reused a rotated virtual part and then rewrote IDs, which
    // could collapse or hide expected cards. Generate true Y-axis splice plates
    // directly so every floor/roof/wall joint has a unique card.
    if (ys.length > 2) {
      for (let j = 1; j < ys.length - 1; j++) {
        segs.push(...makeSheetSplitSplicePlate(part, ys[j], j, cfg, max.w, 'y'));
      }
    }
  }
  return segs;
}

export function applySheetSplittingToParts(parts, cfg) {
  normalizePartsMetadata(parts);
  if (!cfg || cfg.sheetSplitEnabled === false) return parts || [];
  const out = [];
  for (const p of (parts || [])) {
    const split = splitPartForSheet(p, cfg);
    out.push(...split.filter(Boolean));
  }
  return normalizePartsMetadata(out);
}
