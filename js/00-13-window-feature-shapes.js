'use strict';

/* =====================================================================
   WINDOW FEATURE SHAPES
   Mirrors the door system: WINDOW_STYLES carries semantic data (mullion type,
   colours); windowFeatureShapes() turns that into low-level geometric
   primitives ({type:'line'|'rect'|...}); emitWindowShapesSvg() renders them
   inline; the laser-output generator uses the same primitives to drive etches
   and cuts on the frame piece. One data source, three consumers — the
   toolbox icon, the editor canvas, and the physical frame stay in sync.
   ===================================================================== */

/* Cell-count helpers — picked from window dimensions so the lattice adapts
 * to custom-sized windows. Returns at least the minimum count. */
function _renjiBarCount(W) {
  // bars ~0.4mm thick with ~0.5mm gap → 0.9mm pitch, 0.5mm end margin each side
  return Math.max(3, Math.min(12, Math.floor((W - 1.0) / 0.9)));
}
function _ranmaBarCount(W) {
  // ranma bars are slightly more spread out (~1.0mm pitch)
  return Math.max(5, Math.min(24, Math.floor((W - 1.0) / 1.0)));
}
function _mushikoSlitCount(W) {
  // Slits are 1.0mm wide with ≥1.2mm plaster between (kerf-safe).
  // Total = N*1.0 + (N+1)*1.2 ≤ W  ⇒  N ≤ (W-1.2)/2.2
  return Math.max(2, Math.floor((W - 1.2) / 2.2));
}
function _shojiCellCount(W, H) {
  return {
    cols: Math.max(2, Math.round(W / 2.7)),
    rows: Math.max(2, Math.round(H / 2.7)),
  };
}

/* Returns an array of {type, ...} primitives describing the visible lattice /
 * bars / kumiko etched on the window's external frame piece. Coordinates are
 * in window-local mm, origin at top-left of the visible aperture.
 *
 *   line   → {type:'line', x1, y1, x2, y2, thick?}
 *   rect   → {type:'rect', x, y, w, h, tint?}      (etched outline)
 *
 * NOTE: mushiko_slits are NOT returned here — they're real cut-throughs and
 * are handled by panesForMullion in layoutDividerFrame.
 */
function windowFeatureShapes(spec, W, H) {
  if (!spec || !spec.mullion) return [];
  const out = [];
  const m = spec.mullion;

  if (m === 'renji_vertical') {
    // Vertical wooden bars, etched. Bars sit just inside the frame edge.
    const n = _renjiBarCount(W);
    const inset = 0.5;
    const usable = W - inset * 2;
    const pitch  = usable / (n + 1);
    for (let i = 1; i <= n; i++) {
      const x = inset + i * pitch;
      out.push({ type: 'line', x1: x, y1: 0.3, x2: x, y2: H - 0.3, thick: true });
    }
    return out;
  }

  if (m === 'ranma_lattice') {
    // Like renji_vertical but tighter spacing for transom proportions.
    const n = _ranmaBarCount(W);
    const inset = 0.4;
    const usable = W - inset * 2;
    const pitch  = usable / (n + 1);
    for (let i = 1; i <= n; i++) {
      const x = inset + i * pitch;
      out.push({ type: 'line', x1: x, y1: 0.25, x2: x, y2: H - 0.25 });
    }
    return out;
  }

  if (m === 'shoji_grid') {
    // Fine kumiko grid — cell count picked from W & H.
    const { cols, rows } = _shojiCellCount(W, H);
    const inset = 0.25;
    const usableW = W - inset * 2, usableH = H - inset * 2;
    // Vertical kumiko (between columns)
    for (let c = 1; c < cols; c++) {
      const x = inset + (c / cols) * usableW;
      out.push({ type: 'line', x1: x, y1: inset, x2: x, y2: H - inset });
    }
    // Horizontal kumiko
    for (let r = 1; r < rows; r++) {
      const y = inset + (r / rows) * usableH;
      out.push({ type: 'line', x1: inset, y1: y, x2: W - inset, y2: y });
    }
    return out;
  }

  if (m === 'yukimi_split') {
    // Top half = shoji kumiko (etched), bottom half = clear pane (no etching).
    // A thicker horizontal "meeting rail" line marks the split.
    const splitY = H * 0.55;
    const inset = 0.25;
    const usableW = W - inset * 2;
    const usableH = splitY - inset;
    // Meeting rail (thicker etch line)
    out.push({ type: 'line', x1: 0, y1: splitY, x2: W, y2: splitY, thick: true });
    // Kumiko in the top half — generator picks counts based on top-half size
    const { cols, rows } = _shojiCellCount(W, splitY);
    for (let c = 1; c < cols; c++) {
      const x = inset + (c / cols) * usableW;
      out.push({ type: 'line', x1: x, y1: inset, x2: x, y2: splitY });
    }
    for (let r = 1; r < rows; r++) {
      const y = inset + (r / rows) * usableH;
      out.push({ type: 'line', x1: inset, y1: y, x2: W - inset, y2: y });
    }
    return out;
  }

  // Other mullion types (vertical_1, grid_2x2, etc.) — no etched features;
  // their mullion bars are real retained material in the divider frame.
  return [];
}

/** Emit SVG markup for window-local shapes. Mirrors emitDoorShapesSvg.
 *  `s` is the input→output unit scale. `ox/oy` translate origin. */
function emitWindowShapesSvg(shapes, ox, oy, s, opts) {
  opts = opts || {};
  const stroke  = opts.stroke      || '#2a64aa';
  const sw      = (opts.strokeWidth      != null) ? opts.strokeWidth      : 0.18;
  const swThick = (opts.thickStrokeWidth != null) ? opts.thickStrokeWidth : sw * 1.8;
  const pe      = opts.pointerEvents ? '' : ' pointer-events="none"';

  let svg = '';
  for (const sh of shapes) {
    if (sh.type === 'line') {
      const x1 = (ox + sh.x1 * s).toFixed(2);
      const y1 = (oy + sh.y1 * s).toFixed(2);
      const x2 = (ox + sh.x2 * s).toFixed(2);
      const y2 = (oy + sh.y2 * s).toFixed(2);
      const w  = sh.thick ? swThick : sw;
      svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="square"${pe}/>`;
    } else if (sh.type === 'rect') {
      const x = (ox + sh.x * s).toFixed(2);
      const y = (oy + sh.y * s).toFixed(2);
      const w = (sh.w * s).toFixed(2);
      const h = (sh.h * s).toFixed(2);
      const fill = sh.tint ? (opts.tintFill || 'rgba(0,0,0,0.18)') : 'none';
      svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${pe}/>`;
    }
  }
  return svg;
}

/* For mushiko_mado, slit rects are real cut-throughs (not etches). This
 * helper computes their geometry (window-local coords, inset from frame edge)
 * so the toolbox preview, editor canvas, and laser-output plaster frame all
 * agree on where the slits are. */
function mushikoSlitRects(W, H) {
  const n = _mushikoSlitCount(W);
  const slitW = 1.0;
  const gap = (W - n * slitW) / (n + 1);
  const inset = Math.max(0.5, H * 0.18);  // top/bottom plaster margin
  const slitH = H - inset * 2;
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({
      x: gap + i * (slitW + gap),
      y: inset,
      w: slitW,
      h: slitH,
    });
  }
  return out;
}

/* Build the inline SVG body for a window preview. Used by the toolbox card
 * and the editor canvas so both show the actual visual pattern. The same
 * three sources of geometric truth are consulted as for the laser output:
 *   - style.mullion=mushiko_slits → slit rects via mushikoSlitRects()
 *   - style.mullion=yukimi_split  → top paper + bottom clear glass
 *   - other Japanese lattices     → windowFeatureShapes() (etched lines)
 *   - Western mullions            → drawn as thick lines (retained material
 *                                   in the divider frame at laser time)
 * Output coordinates use the spec's mm units (caller wraps in viewBox or
 * <g transform> as needed).
 */
function buildWindowSvgBody(style, w, h, opts) {
  opts = opts || {};
  const frameColor = (style && style.frameColor) || (opts.stroke || '#2a64aa');
  const paneFill   = (style && style.paneFill)   || 'rgba(160,205,245,0.85)';
  const sw         = (opts.strokeWidth != null) ? opts.strokeWidth : 0.3;
  const swThick    = sw * 1.6;
  let svg = '';

  // --- Blanked variants: no real glass; show as painted/boarded panel ---
  if (style && (style.placement === 'etched' || style.placement === 'blanked')) {
    const isEtched = style.placement === 'etched';
    if (isEtched) {
      // Etched-on-cladding — no cut. Dashed outline + a faint sash cross to
      // show "this is a faux window, won't actually have an opening".
      svg += `<rect x="0.2" y="0.2" width="${(w-0.4).toFixed(2)}" height="${(h-0.4).toFixed(2)}"`
           + ` fill="rgba(60,55,48,0.18)" stroke="${frameColor}"`
           + ` stroke-width="${sw}" stroke-dasharray="0.8 0.5"/>`;
      if (w > 4 && h > 4) {
        svg += `<line x1="${(w/2).toFixed(2)}" y1="0.4" x2="${(w/2).toFixed(2)}" y2="${(h-0.4).toFixed(2)}"`
             + ` stroke="${frameColor}" stroke-width="${(sw*0.7).toFixed(3)}" stroke-dasharray="0.6 0.4"/>`;
        svg += `<line x1="0.4" y1="${(h/2).toFixed(2)}" x2="${(w-0.4).toFixed(2)}" y2="${(h/2).toFixed(2)}"`
             + ` stroke="${frameColor}" stroke-width="${(sw*0.7).toFixed(3)}" stroke-dasharray="0.6 0.4"/>`;
      }
    } else {
      // Blanked filled — solid opaque dark panel that fills the hole, no
      // transparency. Reads as boarded-up / bricked-in from outside.
      svg += `<rect x="0.2" y="0.2" width="${(w-0.4).toFixed(2)}" height="${(h-0.4).toFixed(2)}"`
           + ` fill="${paneFill}" stroke="${frameColor}" stroke-width="${sw}"/>`;
      // Subtle "boards" hint — a few horizontal etch lines
      const bandCount = Math.max(2, Math.min(5, Math.floor(h / 2.5)));
      for (let i = 1; i < bandCount; i++) {
        const y = (h * i / bandCount).toFixed(2);
        svg += `<line x1="0.4" y1="${y}" x2="${(w-0.4).toFixed(2)}" y2="${y}"`
             + ` stroke="rgba(0,0,0,0.25)" stroke-width="${(sw*0.5).toFixed(3)}"/>`;
      }
    }
    return svg;
  }

  // --- mushiko: plaster body with dark cut-through slits ---
  if (style && style.mullion === 'mushiko_slits') {
    svg += `<rect x="0.2" y="0.2" width="${(w-0.4).toFixed(2)}" height="${(h-0.4).toFixed(2)}"`
         + ` fill="${paneFill}" stroke="${frameColor}" stroke-width="${sw}"/>`;
    // Inner recess line
    const inX = Math.min(0.7, w * 0.07), inY = Math.min(0.5, h * 0.12);
    svg += `<rect x="${inX.toFixed(2)}" y="${inY.toFixed(2)}"`
         + ` width="${(w-inX*2).toFixed(2)}" height="${(h-inY*2).toFixed(2)}"`
         + ` fill="none" stroke="${frameColor}" stroke-width="${(sw*0.5).toFixed(3)}" opacity="0.6"/>`;
    for (const s of mushikoSlitRects(w, h)) {
      svg += `<rect x="${s.x.toFixed(2)}" y="${s.y.toFixed(2)}"`
           + ` width="${s.w.toFixed(2)}" height="${s.h.toFixed(2)}" fill="#3a3028"/>`;
    }
    return svg;
  }

  // --- yukimi: split (top paper-tinted, bottom clear glass) ---
  if (style && style.mullion === 'yukimi_split') {
    const splitY = h * 0.55;
    svg += `<rect x="0.2" y="0.2" width="${(w-0.4).toFixed(2)}" height="${(splitY-0.2).toFixed(2)}"`
         + ` fill="${paneFill}" stroke="${frameColor}" stroke-width="${sw}"/>`;
    svg += `<rect x="0.2" y="${splitY.toFixed(2)}" width="${(w-0.4).toFixed(2)}" height="${(h-splitY-0.2).toFixed(2)}"`
         + ` fill="rgba(160,205,245,0.85)" stroke="${frameColor}" stroke-width="${sw}"/>`;
    // Etched kumiko + meeting rail from the same shape source as the laser output
    const shapes = windowFeatureShapes(style, w, h);
    svg += emitWindowShapesSvg(shapes, 0, 0, 1, {
      stroke: frameColor, strokeWidth: sw * 0.6, thickStrokeWidth: swThick,
    });
    return svg;
  }

  // --- standard pane background ---
  svg += `<rect x="0.2" y="0.2" width="${(w-0.4).toFixed(2)}" height="${(h-0.4).toFixed(2)}"`
       + ` fill="${paneFill}" stroke="${frameColor}" stroke-width="${sw}"/>`;

  // --- Western mullions (retained material in divider frame at laser time;
  //     drawn here as thick lines so the preview matches the visible bars) ---
  if (style && style.mullion) {
    const m = style.mullion;
    if (m === 'vertical_1') {
      svg += `<line x1="${(w/2).toFixed(2)}" y1="0.3" x2="${(w/2).toFixed(2)}" y2="${(h-0.3).toFixed(2)}"`
           + ` stroke="${frameColor}" stroke-width="${swThick}"/>`;
    } else if (m === 'vertical_many') {
      const n = Math.max(3, Math.min(5, Math.floor(w / 6)));
      for (let i = 1; i < n; i++) {
        const x = (w / n) * i;
        svg += `<line x1="${x.toFixed(2)}" y1="0.3" x2="${x.toFixed(2)}" y2="${(h-0.3).toFixed(2)}"`
             + ` stroke="${frameColor}" stroke-width="${swThick}"/>`;
      }
    } else if (m === 'grid_2x2') {
      svg += `<line x1="${(w/2).toFixed(2)}" y1="0.3" x2="${(w/2).toFixed(2)}" y2="${(h-0.3).toFixed(2)}"`
           + ` stroke="${frameColor}" stroke-width="${swThick}"/>`;
      svg += `<line x1="0.3" y1="${(h/2).toFixed(2)}" x2="${(w-0.3).toFixed(2)}" y2="${(h/2).toFixed(2)}"`
           + ` stroke="${frameColor}" stroke-width="${swThick}"/>`;
    } else if (m === 'grid_3x2') {
      svg += `<line x1="${(w/3).toFixed(2)}" y1="0.3" x2="${(w/3).toFixed(2)}" y2="${(h-0.3).toFixed(2)}"`
           + ` stroke="${frameColor}" stroke-width="${swThick}"/>`;
      svg += `<line x1="${(2*w/3).toFixed(2)}" y1="0.3" x2="${(2*w/3).toFixed(2)}" y2="${(h-0.3).toFixed(2)}"`
           + ` stroke="${frameColor}" stroke-width="${swThick}"/>`;
      svg += `<line x1="0.3" y1="${(h/2).toFixed(2)}" x2="${(w-0.3).toFixed(2)}" y2="${(h/2).toFixed(2)}"`
           + ` stroke="${frameColor}" stroke-width="${swThick}"/>`;
    } else if (m === 'industrial_slider_3' || m === 'industrial_slider_4' || m === 'industrial_slider_6') {
      const cols = (m === 'industrial_slider_3') ? 3 : (m === 'industrial_slider_4') ? 4 : 6;
      for (let i = 1; i < cols; i++) {
        const x = (w / cols) * i;
        svg += `<line x1="${x.toFixed(2)}" y1="0.3" x2="${x.toFixed(2)}" y2="${(h-0.3).toFixed(2)}"`
             + ` stroke="${frameColor}" stroke-width="${swThick}"/>`;
      }
      const splitY = h * 0.68;
      svg += `<line x1="0.3" y1="${splitY.toFixed(2)}" x2="${(w-0.3).toFixed(2)}" y2="${splitY.toFixed(2)}"`
           + ` stroke="${frameColor}" stroke-width="${swThick}"/>`;
    }
  }

  // --- Japanese etched lattices (renji, ranma, shoji) ---
  const shapes = style ? windowFeatureShapes(style, w, h) : [];
  if (shapes.length) {
    svg += emitWindowShapesSvg(shapes, 0, 0, 1, {
      stroke: frameColor,
      strokeWidth: sw * 0.6,
      thickStrokeWidth: swThick * 0.8,
    });
  }

  return svg;
}
