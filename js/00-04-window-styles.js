'use strict';

/* =====================================================================
   WINDOW STYLES
   Each style has its own intrinsic dimensions and mullion (panel-divider) pattern.
   Mullions are etched lines on the cladding (cosmetic), NOT cuts on the frame.
   ===================================================================== */
const WINDOW_STYLES = {
  industrial_small: {
    label: 'Industrial small (vertical mullion)',
    description: 'Small rectangular window with single vertical bar. Common on factory walls.',
    baseW: 8, baseH: 5,
    mullion: 'vertical_1',  // 1 vertical mullion = 2 panes
  },
  industrial_tall: {
    label: 'Industrial tall (vertical mullion)',
    description: 'Tall narrow window with vertical bar. Stairwells and utility spaces.',
    baseW: 6, baseH: 12,
    mullion: 'vertical_1',
  },
  office_grid_2x2: {
    label: 'Office 2×2 grid',
    description: 'Square window with cross mullion making four panes. Mid-rise office buildings.',
    baseW: 10, baseH: 10,
    mullion: 'grid_2x2',
  },
  office_grid_3x2: {
    label: 'Office 3×2 grid',
    description: 'Wide window with three vertical and one horizontal mullion (six panes).',
    baseW: 15, baseH: 10,
    mullion: 'grid_3x2',
  },
  storefront: {
    label: 'Storefront (clear, no mullion)',
    description: 'Large clear shop window. No internal divider.',
    baseW: 16, baseH: 10,
    mullion: 'none',
  },
  ribbon: {
    label: 'Ribbon strip',
    description: 'Long thin horizontal strip across multiple bays. Modern factories and offices.',
    baseW: 30, baseH: 4,
    mullion: 'vertical_many',  // multiple vertical mullions
  },
  industrial_slider_3: {
    label: 'Industrial slider band (3-panel)',
    description: 'Wide industrial steel/aluminum sash window with three vertical bays and a low horizontal meeting rail, similar to older factory slider windows.',
    baseW: 18, baseH: 7,
    mullion: 'industrial_slider_3',
    frameColor: '#7a8085',
    paneFill: 'rgba(176,205,228,0.82)',
  },
  industrial_slider_4: {
    label: 'Industrial slider band (4-panel)',
    description: 'Factory-style horizontal slider window with four vertical bays and a low horizontal rail, matching common industrial sheet-metal buildings.',
    baseW: 24, baseH: 8,
    mullion: 'industrial_slider_4',
    frameColor: '#7a8085',
    paneFill: 'rgba(176,205,228,0.82)',
  },
  industrial_slider_6: {
    label: 'Industrial slider band (6-panel)',
    description: 'Extra-wide industrial sash band with six vertical bays and a low horizontal meeting rail for warehouse and mill facades.',
    baseW: 36, baseH: 8,
    mullion: 'industrial_slider_6',
    frameColor: '#7a8085',
    paneFill: 'rgba(176,205,228,0.82)',
  },
  factory_square: {
    label: 'Factory square (4-pane)',
    description: 'Small square window with cross mullion. Older factories, mostly upper floors.',
    baseW: 6, baseH: 6,
    mullion: 'grid_2x2',
  },
  vertical_strip: {
    label: 'Vertical strip',
    description: 'Tall narrow window without mullion. Stairwells, lift shafts.',
    baseW: 4, baseH: 16,
    mullion: 'none',
  },

  /* ---- Japanese window types ----
   * `frameColor` / `paneFill` are preview-rendering hints used by the toolbox
   * icon and editor canvas so the on-screen appearance matches the laser-cut
   * material. They do not change what gets cut — the actual frame piece is
   * still cladding (or `frameMaterial` if specified, e.g. plaster for mushiko).
   * `mullion` values trigger Japanese-specific lattice generators inside
   * `windowFeatureShapes` (etched bars / kumiko) or `panesForMullion`
   * (real cut-through slits for mushiko). */
  renji_mado: {
    label: 'Renji-mado (連子窓)',
    description: 'Dense vertical wooden bars over a single fixed pane. Machiya shops, alleys.',
    baseW: 9, baseH: 7,
    mullion: 'renji_vertical',
    frameColor: '#6a4a2a',
    paneFill:   'rgba(248,232,200,0.85)',
  },
  mushiko_mado: {
    label: 'Mushiko-mado (虫籠窓)',
    description: 'Thick plaster grille with narrow cut-through slits. Upper floors of historic machiya.',
    baseW: 10, baseH: 4,
    mullion: 'mushiko_slits',
    frameColor: '#5a4a3a',
    paneFill:   'rgba(232,224,208,0.95)',
    frameMaterial: 'plaster',
  },
  shoji_grid: {
    label: 'Shoji-grid (障子)',
    description: 'Fine kumiko lattice over a single warm-tinted pane. Traditional residences and tea houses.',
    baseW: 8, baseH: 11,
    mullion: 'shoji_grid',
    frameColor: '#6a4a2a',
    paneFill:   'rgba(252,245,225,0.92)',
  },
  ranma_lattice: {
    label: 'Ranma (欄間)',
    description: 'Decorative transom band with fine vertical lattice. Above doorways and in upper-wall bands.',
    baseW: 14, baseH: 3,
    mullion: 'ranma_lattice',
    frameColor: '#6a4a2a',
    paneFill:   'rgba(248,232,200,0.85)',
  },
  yukimi_shoji: {
    label: 'Yukimi-shoji (雪見障子)',
    description: 'Upper half gridded shoji, lower half clear glass — "snow-viewing" window.',
    baseW: 7, baseH: 11,
    mullion: 'yukimi_split',
    frameColor: '#6a4a2a',
    paneFill:   'rgba(252,245,225,0.92)',  // top half (paper); bottom half is clear glass
  },
  renji_tall: {
    label: 'Renji-tall (縦連子)',
    description: 'Tall narrow renji variant. Stairwell-height vertical lattice on machiya side walls.',
    baseW: 5, baseH: 13,
    mullion: 'renji_vertical',
    frameColor: '#6a4a2a',
    paneFill:   'rgba(248,232,200,0.85)',
  },

  /* ---- Blanked windows ----
   * Two no-glass variants for facade detail without a real opening:
   *   • blanked_etched   — NO cut anywhere; cladding gets an etched rectangle
   *                        (with a faint sash cross) at the window's location.
   *                        Use for painted/faux windows or alley-side walls
   *                        where you want to indicate "window space" without
   *                        cutting through to the interior.
   *   • blanked_filled   — Cladding + core are cut as usual, but instead of
   *                        glass + frames, a single opaque blanking panel
   *                        (cladding material, sized to fit the core hole)
   *                        sits behind the cladding. Reads as a solid darker
   *                        rectangle from outside — like a boarded-up or
   *                        bricked-in window.
   * Both use placement: 'etched' / 'blanked' which the wall + parts
   * generators check; existing 'opening' styles need no flag (default). */
  blanked_etched: {
    label: 'Blanked (etched on cladding)',
    description: 'Faux/painted window — etched outline + sash cross on the cladding. No cut, no glass. Use for blank walls that need visual rhythm.',
    baseW: 8, baseH: 10,
    mullion: 'none',
    placement: 'etched',
    frameColor: '#2a1808',
    paneFill: 'rgba(60,55,48,0.4)',  // editor preview only — darker patch with no transparency
  },

  blanked_filled: {
    label: 'Blanked (filled behind cladding)',
    description: 'Window opening cut as usual, but filled with a solid blanking panel behind the cladding (no glass, no frame). Reads as a boarded-up window from outside.',
    baseW: 8, baseH: 10,
    mullion: 'none',
    placement: 'blanked',
    frameColor: '#2a1808',
    paneFill: 'rgba(50,42,32,0.92)',  // editor preview — opaque dark fill
  },
};

/* Window size SCALE — multiplies the style's intrinsic size */
const WINDOW_SCALES = {
  small: 0.75,
  default: 1.0,
  large: 1.4,
  xlarge: 1.8,
};

/* ---- Awning styles: w=wall width, d=depth (projection outward) ---- */
const AWNING_STYLES = {
  narrow:    { label: 'Narrow',    baseW: 14, baseD: 7  },
  standard:  { label: 'Standard',  baseW: 22, baseD: 10 },
  wide:      { label: 'Wide',      baseW: 32, baseD: 12 },
  shopfront: { label: 'Shopfront', baseW: 42, baseD: 14 },
};
// Visual height of awning in the wall editor (mm, represents projection in face view)
const AWNING_DISP_H = 4;

/* ---- Balcony styles: w = width along face, d = depth, h = opening height ---- */
const BALCONY_STYLES = {
  int_s: { label: 'Internal S',  baseW: 18, baseD: 8,  baseH: 8,  balconyType: 'internal' },
  int_m: { label: 'Internal M',  baseW: 28, baseD: 12, baseH: 10, balconyType: 'internal' },
  int_l: { label: 'Internal L',  baseW: 40, baseD: 16, baseH: 10, balconyType: 'internal' },
  ext_s: { label: 'External S',  baseW: 18, baseD: 8,  baseH: 6,  balconyType: 'external' },
  ext_m: { label: 'External M',  baseW: 28, baseD: 12, baseH: 8,  balconyType: 'external' },
  ext_l: { label: 'External L',  baseW: 40, baseD: 16, baseH: 10, balconyType: 'external' },
};
const BALCONY_TOUCH_MARGIN = 1.5; // mm — closeness to side wall that triggers L-shape

/* ---- Bay styles ----
 * A bay is a ground-floor opening that cuts the wall(s) up to a fixed height.
 * 'side': cuts only the wall it sits on
 * 'through': cuts BOTH the front and back walls at the same X (drive-through)
 *
 * Bays live in cfg.manualOpenings just like windows/doors — type='bay' with
 * a 'style' field. They are bottom-anchored (y = H - h) and only valid on
 * front/back walls. Only one bay per building; 'through' must sit on front.
 */
const BAY_STYLES = {
  side:    { label: 'Side bay',           baseW: 50, baseH: 24, description: 'Single-wall ground-floor opening (a doorway-sized cut)' },
  through: { label: 'Through bay',        baseW: 50, baseH: 24, description: 'Drive-through opening — cuts both the front and back walls' },
};

/* Bay door styles — the panel that closes a bay opening when the user wants
 * the bay to look like a real warehouse / shop / garage door rather than a
 * bare hole. Each entry's `etchFn(w, h)` returns an array of features that
 * the bay-door-parts generator stamps onto a single cut rectangle sized to
 * the (possibly partially-retracted) visible door area. The cut layer glues
 * to the INSIDE face of the core panel, behind the bay opening, so the door
 * sits one matT deeper than the cladding — this small recess gives the bay
 * visible depth and reads convincingly as a real door rather than a stuck-on
 * decoration.
 *
 * Features use the same { type: 'line' | 'rect' | 'circle', ... } vocabulary
 * as fixture/door features (consumed by doorFeatureShapes), in coords local
 * to the panel (0..w, 0..h, y growing downward).
 *
 * `direction` controls how the panel shrinks when partially open:
 *   • 'overhead': door retracts UPWARD into a ceiling track — the visible
 *     piece is the BOTTOM portion of the original (it's what's still hanging
 *     in front of the opening as the door rolls up). Roller / sectional /
 *     paneled / tilt_up all behave this way.
 *   • 'side': door slides sideways — visible piece is the LEFT portion of
 *     the original. Slatted (Japanese shop shutters) use this.
 */
const BAY_DOOR_STYLES = {
  none: {
    label: 'None (open bay)',
    description: 'No door panel — the bay is left fully open. Default for new bays.',
  },
  roller: {
    label: 'Roller (corrugated)',
    description: 'Horizontal corrugated-metal slats every ~1 mm, like a warehouse or industrial roller shutter.',
    direction: 'overhead',
    etchFn: (w, h) => {
      // Horizontal slats at ~1 mm spacing (≈150 mm real at 1:150 scale,
      // matching a typical commercial roller slat). 0.6 mm minimum spacing
      // so very short visible doors still get at least two seams.
      const slatH = Math.max(0.6, Math.min(1.2, h / 8));
      const out = [];
      for (let y = slatH; y < h - 0.1; y += slatH) {
        out.push({ type: 'line', x1: 0.5, y1: y, x2: w - 0.5, y2: y });
      }
      // Small pull-handle box centred near the bottom of the door (visible
      // when the door is mostly closed; gracefully clips off when retracted
      // since the etch function only ever draws within the visible area).
      if (h > 6) {
        const hbW = Math.min(4, w * 0.25);
        const hbH = 0.8;
        const hbX = (w - hbW) / 2;
        const hbY = h - 1.6;
        if (hbY > 0) {
          out.push({ type: 'rect', x: hbX, y: hbY, w: hbW, h: hbH });
        }
      }
      return out;
    },
  },
  roller_personnel: {
    label: 'Roller + inset personnel door',
    description: 'Industrial roller shutter with a human-sized inset wicket/personnel door on one side. Common on warehouses where pedestrian access is needed without opening the full bay.',
    direction: 'overhead',
    etchFn: (w, h) => {
      const slatH = Math.max(0.6, Math.min(1.2, h / 8));
      const out = [];
      for (let y = slatH; y < h - 0.1; y += slatH) {
        out.push({ type: 'line', x1: 0.5, y1: y, x2: w - 0.5, y2: y });
      }
      const doorW = Math.min(Math.max(5.0, w * 0.22), Math.max(5.0, w * 0.32));
      const doorH = Math.min(h - 1.2, Math.max(10.5, h * 0.72));
      const inset = Math.max(0.6, w * 0.05);
      const dx = w - inset - doorW;
      const dy = h - doorH;
      out.push({ type: 'rect', x: dx, y: dy, w: doorW, h: doorH });
      out.push({ type: 'line', x1: dx + 0.6, y1: dy + 0.8, x2: dx + doorW - 0.6, y2: dy + 0.8 });
      out.push({ type: 'rect', x: dx + doorW * 0.58, y: dy + doorH * 0.47, w: Math.max(0.55, doorW * 0.14), h: Math.max(1.0, doorH * 0.09) });
      out.push({ type: 'line', x1: dx + doorW * 0.78, y1: dy + doorH * 0.36, x2: dx + doorW * 0.78, y2: dy + doorH * 0.64 });
      return out;
    },
  },
  paneled: {
    label: 'Paneled (garage)',
    description: 'Classic sectional garage door — three or four horizontal panels with a row of small windows near the top.',
    direction: 'overhead',
    etchFn: (w, h) => {
      // Pick panel count by height — taller doors get more panels.
      const nPanels = (h >= 18) ? 4 : (h >= 12) ? 3 : 2;
      const panelH = h / nPanels;
      const out = [];
      // Horizontal panel seams
      for (let i = 1; i < nPanels; i++) {
        const y = i * panelH;
        out.push({ type: 'line', x1: 0.4, y1: y, x2: w - 0.4, y2: y });
      }
      // Window row in the UPPER panel (when there's room — needs panelH ≥ 3)
      if (panelH >= 3 && w >= 8 && h >= 6) {
        const nWin = Math.max(2, Math.min(5, Math.round(w / 5)));
        const winW = w * 0.7 / nWin;
        const winH = Math.min(panelH * 0.55, 2.2);
        const totalWinW = nWin * winW + (nWin - 1) * (winW * 0.25);
        const startX = (w - totalWinW) / 2;
        const winY = (panelH - winH) / 2;
        for (let i = 0; i < nWin; i++) {
          const wx = startX + i * (winW + winW * 0.25);
          out.push({ type: 'rect', x: wx, y: winY, w: winW, h: winH });
        }
      }
      return out;
    },
  },
  sectional: {
    label: 'Sectional (no windows)',
    description: 'Horizontal sectional panels stacked head-to-toe, no glass. Cleaner than paneled — fits modern industrial buildings.',
    direction: 'overhead',
    etchFn: (w, h) => {
      const nPanels = (h >= 20) ? 5 : (h >= 14) ? 4 : 3;
      const panelH = h / nPanels;
      const out = [];
      for (let i = 1; i < nPanels; i++) {
        const y = i * panelH;
        out.push({ type: 'line', x1: 0.4, y1: y, x2: w - 0.4, y2: y });
      }
      // Subtle stipple — short vertical accent lines at the panel midpoints
      // to suggest the embossed ribs typical on sectional doors. Skip when
      // there's no room (very short panels).
      if (panelH >= 2 && w >= 6) {
        const nRibs = Math.max(2, Math.min(4, Math.floor(w / 4)));
        for (let i = 0; i < nPanels; i++) {
          const yMid = i * panelH + panelH * 0.5;
          for (let r = 1; r <= nRibs; r++) {
            const x = (w / (nRibs + 1)) * r;
            out.push({ type: 'line', x1: x, y1: yMid - panelH * 0.2, x2: x, y2: yMid + panelH * 0.2 });
          }
        }
      }
      return out;
    },
  },
  tilt_up: {
    label: 'Tilt-up (single slab)',
    description: 'One rigid slab that tilts up as a single piece. Etched diagonal brace and a central handle suggest the hardware.',
    direction: 'overhead',
    etchFn: (w, h) => {
      const out = [];
      // Outer inset rectangle — implied frame around the slab edge.
      const inset = Math.min(0.8, Math.min(w, h) * 0.08);
      out.push({ type: 'rect', x: inset, y: inset, w: w - 2 * inset, h: h - 2 * inset });
      // Diagonal brace (X-pattern) inside the frame — only when there's room.
      if (w > 6 && h > 6) {
        out.push({ type: 'line', x1: inset + 0.4, y1: inset + 0.4, x2: w - inset - 0.4, y2: h - inset - 0.4 });
        out.push({ type: 'line', x1: w - inset - 0.4, y1: inset + 0.4, x2: inset + 0.4, y2: h - inset - 0.4 });
      }
      // Handle near vertical centre
      if (w >= 6) {
        const hw = Math.min(2.5, w * 0.2);
        const hx = (w - hw) / 2;
        const hy = h * 0.55;
        out.push({ type: 'rect', x: hx, y: hy, w: hw, h: 0.6 });
      }
      return out;
    },
  },
  slatted: {
    label: 'Slatted (vertical, sliding)',
    description: 'Vertical wooden slats — traditional Japanese shop shutter (shitomi / amado). Slides sideways instead of rolling up.',
    direction: 'side',
    etchFn: (w, h) => {
      // Vertical slats at ~1 mm spacing.
      const slatW = Math.max(0.6, Math.min(1.0, w / 10));
      const out = [];
      for (let x = slatW; x < w - 0.1; x += slatW) {
        out.push({ type: 'line', x1: x, y1: 0.4, x2: x, y2: h - 0.4 });
      }
      // A single horizontal rail near the middle — classic on amado-style
      // shutters where boards are joined by a cross-brace.
      out.push({ type: 'line', x1: 0.4, y1: h * 0.5, x2: w - 0.4, y2: h * 0.5 });
      return out;
    },
  },
};
