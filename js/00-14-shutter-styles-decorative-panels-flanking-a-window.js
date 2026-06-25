'use strict';

/* =====================================================================
   SHUTTER STYLES — decorative panels flanking a window
   =====================================================================
   Each window opening can opt into a pair of shutters via the
   `hasShutters` + `shutterStyle` fields on its op. Shutters are NOT
   structural — they sit on top of the cladding next to the window like
   layered fixtures. Each window with shutters produces 2 identical cut
   pieces (one for each side); the laser sheets group by (style, size).

   Each entry provides:
     label, description — UI strings
     panelFill, frameColor — editor/preview hints
     featureGenerator(w, h) — etch primitives that adapt to actual size

   Shutter dimensions are derived from the window:
     shutterW = max(2, window.w * SHUTTER_W_RATIO)  // default ratio 0.5
     shutterH = window.h
*/
const SHUTTER_W_RATIO = 0.5;   // shutter width as fraction of window width

const SHUTTER_STYLES = {
  louvered: {
    label: 'Louvered',
    description: 'Classic colonial shutters with horizontal slats.',
    panelFill: '#5a3a22', frameColor: '#2a1808',
    featureGenerator: (w, h) => {
      const margin = 0.45;
      const targetPitch = 0.55;
      const usable = Math.max(0, h - 2 * margin);
      const count = Math.max(3, Math.round(usable / targetPitch));
      const pitch = usable / count;
      const out = [];
      for (let i = 0; i <= count; i++) {
        const y = margin + i * pitch;
        out.push({ type: 'rail', x1: 0.3, y1: y, x2: w - 0.3, y2: y });
      }
      return out;
    },
  },
  raised_panel: {
    label: 'Raised panel',
    description: 'Formal shutters with two stacked rectangular raised panels.',
    panelFill: '#6a4a2a', frameColor: '#2a1808',
    featureGenerator: (w, h) => {
      const inset = Math.max(0.3, Math.min(0.6, w * 0.08));
      const mid = h * 0.5;
      const gap = 0.25;
      return [
        // Upper panel
        { type: 'panel', x1: inset, y1: inset, x2: w - inset, y2: mid - gap },
        // Lower panel
        { type: 'panel', x1: inset, y1: mid + gap, x2: w - inset, y2: h - inset },
      ];
    },
  },
  board_batten: {
    label: 'Board & batten',
    description: 'Rustic vertical planks held together by horizontal battens (top, middle, bottom).',
    panelFill: '#7a5a3a', frameColor: '#3a2410',
    featureGenerator: (w, h) => {
      const out = [];
      // 3 vertical plank seams
      const boards = 3;
      for (let i = 1; i < boards; i++) {
        const x = (w / boards) * i;
        out.push({ type: 'rail', x1: x, y1: 0.2, x2: x, y2: h - 0.2 });
      }
      // 3 horizontal battens — top, middle, bottom (thicker stroke)
      const battenY = [0.7, h * 0.5, h - 0.7];
      for (const y of battenY) {
        out.push({ type: 'rail', x1: 0, y1: y, x2: w, y2: y, thick: true });
      }
      return out;
    },
  },
  cross_buck: {
    label: 'Cross-buck (Z-pattern)',
    description: 'Country style with a top rail, bottom rail, and a diagonal brace forming a Z.',
    panelFill: '#7a5a3a', frameColor: '#3a2410',
    featureGenerator: (w, h) => {
      const inset = 0.3;
      return [
        // Top rail
        { type: 'rail', x1: inset, y1: h * 0.22, x2: w - inset, y2: h * 0.22, thick: true },
        // Bottom rail
        { type: 'rail', x1: inset, y1: h * 0.78, x2: w - inset, y2: h * 0.78, thick: true },
        // Diagonal brace (from bottom-left to top-right)
        { type: 'rail', x1: inset, y1: h * 0.78, x2: w - inset, y2: h * 0.22, thick: true },
      ];
    },
  },
  plain: {
    label: 'Plain',
    description: 'Simple solid panel — minimalist or to be painted with custom decoration.',
    panelFill: '#5a3a22', frameColor: '#2a1808',
    featureGenerator: (w, h) => [],
  },
};

/* Build an inline SVG body for a shutter style at given dimensions. Used
 * by the topbar dropdown previews, the editor canvas, and (via shared
 * coords) the laser cut sheet. Mirrors buildFixtureSvgBody's pattern. */
function buildShutterSvgBody(style, w, h, opts) {
  if (!style) return '';
  opts = opts || {};
  const sw      = (opts.strokeWidth      != null) ? opts.strokeWidth      : 0.18;
  const swThick = (opts.thickStrokeWidth != null) ? opts.thickStrokeWidth : 0.3;
  const fill    = style.panelFill  || '#5a3a22';
  const stroke  = style.frameColor || '#2a1808';

  let svg = `<rect x="0" y="0" width="${w.toFixed(2)}" height="${h.toFixed(2)}"`
          + ` fill="${fill}" stroke="${stroke}" stroke-width="${sw.toFixed(3)}"/>`;
  const features = style.featureGenerator ? style.featureGenerator(w, h) : (style.features || []);
  if (features.length) {
    const shapes = doorFeatureShapes({ width: w, height: h, features });
    svg += emitDoorShapesSvg(shapes, 0, 0, 1, {
      stroke: stroke, knobFill: stroke,
      strokeWidth: sw, thickStrokeWidth: swThick,
      pointerEvents: opts.pointerEvents,
    });
  }
  return svg;
}

/* Compute shutter dimensions for a given window op. Returns null if the
 * window doesn't have shutters enabled or has invalid dimensions. */
function getShutterDimsForWindow(op) {
  if (!op || op.type !== 'window' || !op.hasShutters) return null;
  const w = Math.max(2, op.w * SHUTTER_W_RATIO);
  const h = op.h;
  return { w, h };
}

const EXTERIOR_LIGHT_SVG_W = 9.5;
const EXTERIOR_LIGHT_SVG_H = 8.09;
// Source SVG coordinate space is only used for proportions. Physical model
// defaults are explicit millimetres for N-scale laser cutting.
const EXTERIOR_LIGHT_DEFAULT_W = 3.0;
const EXTERIOR_LIGHT_DEFAULT_H = 2.5;

function exteriorLightRoundedCapPath(w, h, ox = 0, oy = 0) {
  const x0 = ox + w * (0.50 / EXTERIOR_LIGHT_SVG_W);
  const x1 = ox + w * (9.00 / EXTERIOR_LIGHT_SVG_W);
  const y0 = oy + h * (0.50 / EXTERIOR_LIGHT_SVG_H);
  const y1 = oy + h * (7.59 / EXTERIOR_LIGHT_SVG_H);
  const rX = w * (1.38 / EXTERIOR_LIGHT_SVG_W);
  const rY = h * (1.38 / EXTERIOR_LIGHT_SVG_H);
  return `M ${x1.toFixed(3)},${y1.toFixed(3)}`
    + ` V ${(y0 + rY).toFixed(3)}`
    + ` Q ${x1.toFixed(3)},${y0.toFixed(3)} ${(x1 - rX).toFixed(3)},${y0.toFixed(3)}`
    + ` H ${(x0 + rX).toFixed(3)}`
    + ` Q ${x0.toFixed(3)},${y0.toFixed(3)} ${x0.toFixed(3)},${(y0 + rY).toFixed(3)}`
    + ` V ${y1.toFixed(3)}`
    + ` H ${x1.toFixed(3)} Z`;
}

function exteriorLightCoreUPath(w, h, ox = 0, oy = 0) {
  const x0 = ox + w * (0.50 / EXTERIOR_LIGHT_SVG_W);
  const x1 = ox + w * (9.00 / EXTERIOR_LIGHT_SVG_W);
  const y0 = oy + h * (0.50 / EXTERIOR_LIGHT_SVG_H);
  const y1 = oy + h * (7.59 / EXTERIOR_LIGHT_SVG_H);
  const rX = w * (1.38 / EXTERIOR_LIGHT_SVG_W);
  const rY = h * (1.38 / EXTERIOR_LIGHT_SVG_H);
  const ix0 = ox + w * (3.33 / EXTERIOR_LIGHT_SVG_W);
  const ix1 = ox + w * (6.16 / EXTERIOR_LIGHT_SVG_W);
  const iy0 = oy + h * (3.33 / EXTERIOR_LIGHT_SVG_H);
  return `M ${(x1 - rX).toFixed(3)},${y0.toFixed(3)}`
    + ` H ${(x0 + rX).toFixed(3)}`
    + ` Q ${x0.toFixed(3)},${y0.toFixed(3)} ${x0.toFixed(3)},${(y0 + rY).toFixed(3)}`
    + ` V ${y1.toFixed(3)}`
    + ` H ${ix0.toFixed(3)}`
    + ` V ${iy0.toFixed(3)}`
    + ` H ${ix1.toFixed(3)}`
    + ` V ${y1.toFixed(3)}`
    + ` H ${x1.toFixed(3)}`
    + ` V ${(y0 + rY).toFixed(3)}`
    + ` Q ${x1.toFixed(3)},${y0.toFixed(3)} ${(x1 - rX).toFixed(3)},${y0.toFixed(3)} Z`;
}

/* Additional wall fixture catalog entries that are defined after the shared
 * feature vocabulary is available but before the editor/toolbox and fixture
 * part generator load. Kept as static source data; no DOM/runtime HTML patching.
 */
if (typeof FIXTURE_STYLES !== 'undefined') {
  FIXTURE_STYLES.exterior_light = {
    label: 'Exterior light',
    description: 'Wall light with a rectangular pass-through for an LED. Exports a rounded-top core U-shaped spacer/cradle plus a matching filled cladding cap.',
    width: EXTERIOR_LIGHT_DEFAULT_W,
    height: EXTERIOR_LIGHT_DEFAULT_H,
    depthTier: 'medium',
    toolboxSection: 'passthroughs',
    throughCore: true,
    throughHole: { shape: 'rect', xRatio: 3.33 / EXTERIOR_LIGHT_SVG_W, yRatio: 3.33 / EXTERIOR_LIGHT_SVG_H, wRatio: 2.83 / EXTERIOR_LIGHT_SVG_W, hRatio: 4.25 / EXTERIOR_LIGHT_SVG_H },
    pieces: [
      {
        material: 'core',
        panelFill: '#cfcfc7',
        frameColor: '#4a4a44',
        pathGenerator: exteriorLightCoreUPath,
        features: [],
      },
      {
        material: 'cladding',
        panelFill: '#f2eee2',
        frameColor: '#5a5044',
        pathGenerator: exteriorLightRoundedCapPath,
        features: [],
      },
    ],
  };

  if (typeof STYLE_I18N_JA !== 'undefined') {
    STYLE_I18N_JA.FIXTURE_STYLES = STYLE_I18N_JA.FIXTURE_STYLES || {};
    STYLE_I18N_JA.FIXTURE_STYLES.exterior_light = {
      label: '外灯',
      description: 'LED用の貫通穴を持つ壁面ライト。丸みのあるコア材の逆U字スペーサーと、同形状で中央が塞がった外装キャップを出力します。',
    };
  }
}

if (typeof buildFixtureSvgBody === 'function' && !buildFixtureSvgBody.__supportsPathPieces) {
  const baseBuildFixtureSvgBody = buildFixtureSvgBody;
  buildFixtureSvgBody = function buildFixtureSvgBodyWithPathPieces(style, w, h, opts) {
    if (!style || !Array.isArray(style.pieces) || !style.pieces.some(p => typeof p.pathGenerator === 'function')) {
      return baseBuildFixtureSvgBody(style, w, h, opts);
    }
    opts = opts || {};
    const sx = w / style.width;
    const sy = h / style.height;
    const sw = (opts.strokeWidth != null) ? opts.strokeWidth : 0.18;
    let svg = '';
    for (const piece of style.pieces) {
      const px = (piece.offsetX != null) ? piece.offsetX : 0;
      const py = (piece.offsetY != null) ? piece.offsetY : 0;
      const pw = (piece.width != null) ? piece.width : style.width - px;
      const ph = (piece.height != null) ? piece.height : style.height - py;
      const d = piece.pathGenerator(pw * sx, ph * sy, px * sx, py * sy);
      const fill = piece.panelFill || '#bdbdb5';
      const stroke = piece.frameColor || '#3a3a34';
      svg += `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw.toFixed(3)}"/>`;
    }
    return svg;
  };
  buildFixtureSvgBody.__supportsPathPieces = true;
}
