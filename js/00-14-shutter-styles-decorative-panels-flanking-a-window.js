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

/* Additional wall fixture catalog entries that are defined after the shared
 * feature vocabulary is available but before the editor/toolbox and fixture
 * part generator load. Kept as static source data; no DOM/runtime HTML patching.
 */
if (typeof FIXTURE_STYLES !== 'undefined') {
  FIXTURE_STYLES.exterior_light = {
    label: 'Exterior light',
    description: 'Wall light with a rectangular pass-through for an LED. Exports a core U-shaped spacer/cradle plus a thin cladding cap for the outside face.',
    width: 9.5,
    height: 8.1,
    depthTier: 'medium',
    throughCore: true,
    throughHole: { shape: 'rect', xRatio: 0.35, yRatio: 0.41, wRatio: 0.30, hRatio: 0.59 },
    pieces: [
      {
        material: 'core',
        panelFill: '#cfcfc7',
        frameColor: '#4a4a44',
        // The center cut reaches the bottom edge, making an upside-down U
        // around the LED opening. The matching wall through-hole is cut from
        // the core and cladding panels where the fixture is placed.
        innerCut: { shape: 'rect', xRatio: 0.35, yRatio: 0.41, wRatio: 0.30, hRatio: 0.59 },
        features: [
          { type: 'panel', x1: 0.5, y1: 0.5, x2: 9.0, y2: 7.6 },
        ],
      },
      {
        material: 'cladding',
        panelFill: '#f2eee2',
        frameColor: '#5a5044',
        features: [
          { type: 'panel', x1: 0.5, y1: 0.5, x2: 9.0, y2: 7.6 },
          { type: 'stud', cx: 4.75, cy: 5.25, r: 0.65 },
        ],
      },
    ],
  };

  if (typeof STYLE_I18N_JA !== 'undefined') {
    STYLE_I18N_JA.FIXTURE_STYLES = STYLE_I18N_JA.FIXTURE_STYLES || {};
    STYLE_I18N_JA.FIXTURE_STYLES.exterior_light = {
      label: '外灯',
      description: 'LED用の貫通穴を持つ壁面ライト。コア材の逆U字スペーサーと外側用の薄い外装キャップを出力します。',
    };
  }
}
