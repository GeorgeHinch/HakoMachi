'use strict';

/* =====================================================================
   BILLBOARDS
   type='single': one vertical panel on two posts, faces one direction.
   type='square':  4-sided cube sign on a centre post.
   ===================================================================== */
function generateBillboardParts(cfg) {
  if (!cfg.billboards || cfg.billboards.length === 0) return [];
  const matT = cfg.coreThickness || 1.5;
  const mW   = Math.max(1.4, matT * 1.05);  // structural member width
  const parts = [];

  // ── Lattice panel helper ────────────────────────────────────────────────────
  // Generates triangular void cut-paths that leave diagonal brace strips as solid
  // material — matching real laser-cut N-scale billboard kits.
  // useXBrace: true = X pattern (4 triangles per bay), false = alternating single diagonal
  function latticePaths(panW, panH, nHRails, nVDivs, useXBrace) {
    const f = v => +v.toFixed(4);
    const tri = (...pts) => 'M' + pts.map(([x,y]) => `${f(x)},${f(y)}`).join(' L') + ' Z';

    function buildBands(total, nDiv) {
      const inner = total - 2 * mW;
      const bayLen = (inner - nDiv * mW) / (nDiv + 1);
      const bands = [{ solid:true, a:0, b:mW }];
      for (let i = 0; i < nDiv + 1; i++) {
        const s = mW + i * (bayLen + mW);
        bands.push({ solid:false, a:s, b:s + bayLen });
        if (i < nDiv) bands.push({ solid:true, a:s+bayLen, b:s+bayLen+mW });
      }
      bands.push({ solid:true, a:total-mW, b:total });
      return bands;
    }

    const hBands = buildBands(panH, nHRails);
    const vBands = buildBands(panW, nVDivs);
    const cutPaths = [`M0,0 H${f(panW)} V${f(panH)} H0 Z`]; // outer cut
    let bayN = 0;

    for (const vb of vBands.filter(b => !b.solid)) {
      for (const hb of hBands.filter(b => !b.solid)) {
        const x1=vb.a, x2=vb.b, y1=hb.a, y2=hb.b;
        const cx=(x1+x2)/2, cy=(y1+y2)/2;
        const m = mW * 0.55; // inset for strip width

        if (useXBrace) {
          // X-brace: 4 triangular voids, solid X strip remains
          cutPaths.push(tri([x1+m,y1],[x2-m,y1],[cx,cy]));        // top void
          cutPaths.push(tri([x1+m,y2],[x2-m,y2],[cx,cy]));        // bottom void
          cutPaths.push(tri([x1,y1+m],[x1,y2-m],[cx,cy]));        // left void
          cutPaths.push(tri([x2,y1+m],[x2,y2-m],[cx,cy]));        // right void
        } else {
          // Alternating single diagonal — Pratt truss pattern
          if (bayN % 2 === 0) {
            // Brace TL→BR: cut upper-right and lower-left voids
            cutPaths.push(tri([x1+m,y1],[x2,y1],[x2,y2-m]));
            cutPaths.push(tri([x1,y1+m],[x1,y2],[x2-m,y2]));
          } else {
            // Brace TR→BL: cut upper-left and lower-right voids
            cutPaths.push(tri([x1,y1],[x2-m,y1],[x1,y2-m]));
            cutPaths.push(tri([x2,y1+m],[x2,y2],[x1+m,y2]));
          }
        }
        bayN++;
      }
    }
    return {
      paths: cutPaths.map(d => ({ type:'cut', d })),
      lines: [],
    };
  }

  function slot(x, y, w, h) {
    return { type:'cut', x, y, w, h, compensateKerf:true };
  }

  cfg.billboards.forEach((bb, i) => {
    const bbW   = bb.w         || 30;
    const bbH   = bb.height    || 20;
    const postH = bb.postHeight || 15;
    const id    = `billboard_${i}`;
    const pfx   = `Billboard ${i+1}`;

    if (bb.type === 'square') {
      // Tower footprint = bbW * 0.65
      const tW = bbW * 0.65;
      // Aim for roughly square bays: use floor(postH / bayTarget) rails
      const nH = Math.max(3, Math.round(postH / (tW * 0.5 / 3))) ;
      const nV = 1;

      const { paths:lp, lines:ll } = latticePaths(tW, postH, nH, nV, false);
      // Centre cross-lap slot (top half for one panel, lower half for cross partner)
      const slotH = postH / 2;
      const faceRects = [
        slot(tW/2 - mW/2, 0,     mW, slotH),
        slot(tW/2 - mW/2, slotH, mW, slotH),
      ];

      for (let s = 0; s < 4; s++) {
        parts.push({
          id:`${id}_tower_face_${s}`,
          name:`${pfx} — tower face (×4 identical)`,
          material:'core',
          bboxW:tW, bboxH:postH,
          bboxOffsetX:0, bboxOffsetY:0,
          assemblyNote:`4 identical panels cross-lapped at corners to form square tower. Cut ×4.`,
          paths:lp, rects:faceRects, lines:ll,
        });
      }

      for (let s = 0; s < 4; s++) {
        parts.push({
          id:`${id}_sign_face_${s}`,
          name:`${pfx} — sign face (×4 identical)`,
          material:'cladding',
          bboxW:bbW, bboxH:bbH,
          bboxOffsetX:0, bboxOffsetY:0,
          assemblyNote:`Glue to each face of the assembled tower. Cut ×4.`,
          paths:[{ type:'cut', d:`M0,0 H${bbW} V${bbH} H0 Z` }],
          rects:[], lines:[],
        });
      }

    } else {
      // Sign face
      parts.push({
        id:`${id}_face`,
        name:`${pfx} — sign face`,
        material:'cladding',
        bboxW:bbW, bboxH:bbH,
        bboxOffsetX:0, bboxOffsetY:0,
        assemblyNote:'Front sign panel — print/paint ad then glue to frame.',
        paths:[{ type:'cut', d:`M0,0 H${bbW} V${bbH} H0 Z` }],
        rects:[], lines:[],
      });

      // Two A-frame support panels (front + back)
      const baseW  = bbW + bbW * 0.56;
      const splay  = (baseW - bbW) / 2;
      const f4 = v => v.toFixed(4);
      const nH = Math.max(3, Math.round(postH / 7));
      const { paths:ap, lines:al } = latticePaths(baseW, postH, nH, 1, false);

      // Replace outer rect path with trapezoid
      const trapPath = `M${f4(splay)},0 H${f4(splay+bbW)} L${f4(baseW)},${f4(postH)} H0 Z`;
      const supportPaths = [
        { type:'cut', d:trapPath },
        ...ap.slice(1),  // inner voids (skip outer rect)
      ];

      for (let p = 0; p < 2; p++) {
        parts.push({
          id:`${id}_support_${p}`,
          name:`${pfx} — A-frame support (×2 identical)`,
          material:'core',
          bboxW:baseW, bboxH:postH,
          bboxOffsetX:0, bboxOffsetY:0,
          assemblyNote:`Front and back support frames — stand parallel, sign panel glues between. Cut ×2.`,
          paths:supportPaths,
          rects:[], lines:al,
        });
      }
    }
  });

  return parts;
}

/* Normalize an edge's state into one or more (start, end) segments. The
 * edge state can be `false`/missing (no shield), `true` (full length, no
 * opening — legacy form, kept for backward compat), or an object
 * `{ start, end, opening }` where start/end define the shield's extent
 * along the edge (0..edgeLen) and opening is null or
 * `{ start, end }` carving a gap. Returns an array of segments. Each
 * segment also carries `leftAtCorner` / `rightAtCorner` flags so the
 * caller knows whether to emit corner-joinery tongues at that end
 * (corners are at edge-extents 0 and edgeLen). Tiny segments
 * (< 1 mm) are dropped so a degenerate resize/opening doesn't leak
 * micro-parts into the laser sheet.
 */
function shieldEdgeSegments(edgeState, edgeLen) {
  const EPS = 0.5;  // mm — anything smaller than this is treated as zero-length
  if (edgeState === false || edgeState == null) return [];
  if (edgeState === true) {
    return [{ start: 0, end: edgeLen, leftAtCorner: true, rightAtCorner: true }];
  }
  const segStart = Math.max(0, edgeState.start || 0);
  const segEnd   = Math.min(edgeLen, edgeState.end != null ? edgeState.end : edgeLen);
  if (segEnd <= segStart + EPS) return [];
  const leftAtCorner  = segStart < EPS;
  const rightAtCorner = segEnd   > edgeLen - EPS;
  if (!edgeState.opening) {
    return [{ start: segStart, end: segEnd, leftAtCorner, rightAtCorner }];
  }
  const oStart = Math.max(segStart, edgeState.opening.start || 0);
  const oEnd   = Math.min(segEnd,   edgeState.opening.end   != null ? edgeState.opening.end : oStart);
  if (oEnd <= oStart + EPS) {
    return [{ start: segStart, end: segEnd, leftAtCorner, rightAtCorner }];
  }
  // Split into two segments around the opening. Internal endpoints
  // (adjacent to the opening) are NEVER at a corner — only the two
  // outermost endpoints can be.
  const segs = [];
  if (oStart - segStart > EPS) {
    segs.push({ start: segStart, end: oStart, leftAtCorner, rightAtCorner: false });
  }
  if (segEnd - oEnd > EPS) {
    segs.push({ start: oEnd, end: segEnd, leftAtCorner: false, rightAtCorner });
  }
  return segs;
}

/* Compute the shield enclosure's bounding rectangle in iw-coords (the
 * inside-of-building plan-view frame: x=0 at the inside face of the
 * west wall, y=0 at the inside face of the south wall, max x at the
 * inside east face, max y at the inside north face).
 *
 * If `cfg.rooftopShield.bounds` is set (user dragged the outline), it's
 * used directly (with clamping to stay on the roof). Otherwise the
 * bounds default to a uniform inset by `cfg.rooftopShield.offset` from
 * all four roof edges — preserving the original "always anchored to
 * the perimeter" behaviour for any preset saved before bounds existed.
 *
 * Returns an object `{ x, y, w, h }` in iw-coords. The four shield
 * walls sit ALONG this rect's perimeter: F wall outer face at y=bounds.y,
 * B wall outer face at y=bounds.y+bounds.h, etc. So bounds.w and bounds.h
 * are the F/B and E/W wall lengths respectively.
 */
function getShieldBounds(cfg, plan) {
  const shield = cfg.rooftopShield;
  if (!shield) return null;
  const matT = cfg.coreThickness || 1.5;
  const offset = (typeof shield.offset === 'number') ? shield.offset : 3;
  const roofW = plan.fbWidth - 2 * matT;
  const roofD = plan.sideLen;
  const b = shield.bounds;
  if (b && Number.isFinite(b.x) && Number.isFinite(b.y)
        && Number.isFinite(b.w) && Number.isFinite(b.h)) {
    const x = Math.max(0, Math.min(roofW - 6, b.x));
    const y = Math.max(0, Math.min(roofD - 6, b.y));
    return {
      x, y,
      w: Math.max(6, Math.min(roofW - x, b.w)),
      h: Math.max(6, Math.min(roofD - y, b.h)),
    };
  }
  return {
    x: offset, y: offset,
    w: Math.max(6, roofW - 2 * offset),
    h: Math.max(6, roofD - 2 * offset),
  };
}
