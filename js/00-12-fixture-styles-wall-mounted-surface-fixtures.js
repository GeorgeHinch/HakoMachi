'use strict';

/* =====================================================================
   FIXTURE STYLES  — wall-mounted surface fixtures
   =====================================================================
   Each fixture is a small accessory glued onto the cladding face:
   vents, meters, signs, lanterns, etc. Unlike doors and windows, fixtures
   don't cut through the wall; they sit on top of it.

   Each entry has a `pieces: [...]` array of stacked layers. Order is
   bottom-to-top — the first piece is glued to the cladding, the rest are
   glued in turn on top of it. Multiple identical base layers create
   visible depth (a "double-base" mini-split AC stands 3 layers proud of
   the wall). Smaller pieces (offsetX/offsetY/width/height) become accent
   details — meter dial circles, vent slot strips, sign inset panels.

   Tier convention (depthTier):
     deep    → 3+ base layers (banners, AC heads, lanterns, kanban)
     medium  → 2 base layers + detail (meters, plaques, mailboxes)
     shallow → 1 layer (vents, downspouts, noren, sudare)

   Per-piece keys:
     material   — laser-cut material id (defaults to 'cladding')
     panelFill  — preview/editor fill colour
     frameColor — preview/editor stroke colour
     shape      — 'rect' (default) or 'circle'
     offsetX, offsetY, width, height — piece bounds within the fixture
                                       (defaults to full fixture footprint)
     features   — etched detail primitives (same vocab as doors:
                  rail, panel, stud, ironBand, plankSeams, etc.)

   Top-level keys:
     placement  — 'layered' (default) | 'etched' | 'cutout'
                  'layered' fixtures have their pieces cut from material
                  sheets and glued on top of the cladding (depth tiers
                  shallow/medium/deep control how proud they sit).
                  'etched' fixtures don't produce any cut pieces at all —
                  their features are engraved DIRECTLY onto the cladding
                  panel where the user places them. Use for flat painted
                  markings: emergency-hatch outlines, hazard stripes,
                  address numbers, etc.
                  'cutout' fixtures cut a clean hole through BOTH the
                  cladding and the core at the same size (no insert).
                  Use for wiring pass-throughs, LED light openings, etc.
     depthTier  — 'flush' | 'shallow' | 'medium' | 'deep'
                  'flush' implies placement: 'etched' or 'cutout' (no
                  projection at all).
*/
const FIXTURE_STYLES = {

  /* ---- TIER 0: flush — etched OR cutout (no projection from the wall) ---- */

  passthrough_circle: {
    label: 'Pass-through (round)',
    description: 'Round hole through cladding AND core. For wiring, LED leads, plumbing. Set diameter via W; H matches.',
    width: 3, height: 3,
    placement: 'cutout',
    depthTier: 'flush',
    pieces: [
      {
        // The piece is the cut. shape:'circle' makes both cladding and core
        // get a circular cut at this position. material/colour fields are
        // only used for editor preview tinting (dark to read as a hole).
        shape: 'circle',
        material: 'cladding',
        panelFill: '#1a1814',
        frameColor: '#000000',
        features: [],
      },
    ],
  },

  passthrough_square: {
    label: 'Pass-through (square)',
    description: 'Square hole through cladding AND core. For wiring, LED leads, plumbing.',
    width: 3, height: 3,
    placement: 'cutout',
    depthTier: 'flush',
    pieces: [
      {
        // Default rect shape → square/rectangular cut at the fixture's bbox.
        material: 'cladding',
        panelFill: '#1a1814',
        frameColor: '#000000',
        features: [],
      },
    ],
  },

  emergency_hatch: {
    label: 'Emergency escape hatch',
    description: 'Engraved hatch outline with beacon and warning triangle. Etched on the cladding — no parts.',
    width: 6, height: 11,
    placement: 'etched',
    depthTier: 'flush',
    toolboxSection: 'doors',  // lives in FIXTURE_STYLES (etched behavior) but
                              // shows up under Doors in the toolbox where users
                              // naturally look for door-like building elements.
    pieces: [
      {
        // For etched placement the piece body is never drawn or cut. The
        // features below become etch lines on the cladding panel at the
        // fixture's position. material/panelFill/frameColor are used only
        // for editor preview tinting.
        material: 'cladding',
        panelFill: 'transparent',
        frameColor: '#c8323a',
        features: [
          // Beacon — small filled circle at top centre (the red dome light)
          { type: 'stud', cx: 3.0, cy: 0.85, r: 0.5 },
          // Inverted warning triangle (▼) — 3 lines forming the outline
          { type: 'rail', x1: 2.3, y1: 2.2, x2: 3.7, y2: 2.2 },
          { type: 'rail', x1: 2.3, y1: 2.2, x2: 3.0, y2: 3.2 },
          { type: 'rail', x1: 3.7, y1: 2.2, x2: 3.0, y2: 3.2 },
          // Hatch panel — outer outline + inner recessed edge for depth
          { type: 'panel', x1: 0.4, y1: 3.7, x2: 5.6, y2: 10.7 },
          { type: 'panel', x1: 0.7, y1: 4.0, x2: 5.3, y2: 10.4 },
          // Small triangle marker INSIDE the hatch (the directional indicator
          // painted on the door itself) — matches the building photo
          { type: 'rail', x1: 2.65, y1: 4.3, x2: 3.35, y2: 4.3 },
          { type: 'rail', x1: 2.65, y1: 4.3, x2: 3.0,  y2: 4.85 },
          { type: 'rail', x1: 3.35, y1: 4.3, x2: 3.0,  y2: 4.85 },
        ],
      },
    ],
  },

  /* ---- TIER 3: shallow, single-layer ---- */

  vent_louvered: {
    label: 'Louvered vent',
    description: 'Rectangular HVAC louver. Extractor/intake on commercial walls. Louver count adapts to height.',
    width: 6, height: 4,
    depthTier: 'shallow',
    pieces: [
      {
        material: 'cladding', panelFill: '#bdbdb5', frameColor: '#4a4a44',
        // Horizontal louvers ~0.6 mm apart with a small top/bottom margin.
        // Wider/taller vents get more louvers automatically.
        featureGenerator: (w, h) => {
          const margin = 0.5;
          const targetPitch = 0.6;
          const usable = Math.max(0, h - 2 * margin);
          const count = Math.max(2, Math.round(usable / targetPitch) + 1);
          const pitch = usable / (count - 1);
          const louvers = [];
          for (let i = 0; i < count; i++) {
            const y = margin + i * pitch;
            louvers.push({ type: 'rail', x1: 0.5, y1: y, x2: w - 0.5, y2: y });
          }
          return louvers;
        },
      },
    ],
  },

  vent_round: {
    label: 'Round extractor vent',
    description: 'Bathroom / kitchen exhaust outlet. Cut as a small disc.',
    width: 3, height: 3,
    depthTier: 'shallow',
    pieces: [
      {
        material: 'cladding', panelFill: '#d8d8d0', frameColor: '#4a4a44',
        shape: 'circle',
        features: [
          { type: 'rail', x1: 0.45, y1: 1.5, x2: 2.55, y2: 1.5 },
          { type: 'rail', x1: 1.5,  y1: 0.45, x2: 1.5, y2: 2.55 },
        ],
      },
    ],
  },

  downspout: {
    label: 'Downspout',
    description: 'Vertical drainpipe with bracket bands. Auto-sizes to the full wall height when placed. On parapet and parapet-gable roofs it terminates into a small scupper box at the roof line; on other roofs it behaves like a normal eaves downspout. Width is still user-tunable.',
    width: 0.8, height: 16,
    depthTier: 'shallow',
    resizable: 'height',
    // When dropped, this fixture's height is overridden to the wall's full
    // baseH and its y is pinned to 0 so the pipe spans top-to-bottom. The
    // toolbox card's H input is locked to "auto" to reflect that.
    fullHeight: true,
    pieces: [
      {
        material: 'cladding', panelFill: '#5a4a3a', frameColor: '#2a2218',
        // Bracket bands distributed evenly along the pipe's actual height,
        // ~6 mm apart. Stretch the pipe and more bands appear in pace.
        featureGenerator: (w, h) => {
          const targetPitch = 6;
          const margin = 1.5;
          const usable = Math.max(0, h - 2 * margin);
          const count = Math.max(1, Math.round(usable / targetPitch));
          const pitch = usable / count;
          const bands = [];
          for (let i = 0; i < count; i++) {
            const yCenter = margin + i * pitch + pitch / 2;
            bands.push({ type: 'ironBand', x1: 0, y1: yCenter - 0.2, x2: w, y2: yCenter + 0.2 });
          }
          return bands;
        },
      },
    ],
  },

  noren: {
    label: 'Noren (暖簾)',
    description: 'Split cloth curtain above a shop entrance. Signals open shop.',
    width: 8, height: 4,
    depthTier: 'shallow',
    pieces: [
      {
        material: 'cladding', panelFill: '#1f4a8c', frameColor: '#0a2a5a',
        features: [
          // Top rod
          { type: 'rail', x1: 0.2, y1: 0.2, x2: 7.8, y2: 0.2, thick: true },
          // Vertical splits between panels (etched as visual hint)
          { type: 'rail', x1: 2.0, y1: 0.3, x2: 2.0, y2: 4.0 },
          { type: 'rail', x1: 3.8, y1: 0.3, x2: 3.8, y2: 4.0 },
          { type: 'rail', x1: 5.6, y1: 0.3, x2: 5.6, y2: 4.0 },
          // Character/decoration mid-stripe per panel
          { type: 'rail', x1: 0.5, y1: 1.8, x2: 1.8, y2: 1.8, thick: true },
          { type: 'rail', x1: 2.3, y1: 1.8, x2: 3.6, y2: 1.8, thick: true },
          { type: 'rail', x1: 4.1, y1: 1.8, x2: 5.4, y2: 1.8, thick: true },
          { type: 'rail', x1: 5.9, y1: 1.8, x2: 7.2, y2: 1.8, thick: true },
        ],
      },
    ],
  },

  sudare: {
    label: 'Sudare (簾)',
    description: 'Rolled bamboo blind in front of a window. Summer / traditional.',
    width: 8, height: 6,
    depthTier: 'shallow',
    pieces: [
      {
        material: 'cladding', panelFill: 'rgba(186,148,98,0.85)', frameColor: '#5a4a32',
        features: [
          // Top dowel rod
          { type: 'ironBand', x1: 0.2, y1: 0.2, x2: 7.8, y2: 0.5 },
          // Many horizontal bamboo lines (count auto-picked)
          { type: 'horizontalRails', x1: 0.3, y1: 0.7, x2: 7.7, y2: 5.8, spacing: 0.45 },
        ],
      },
    ],
  },

  address_plate: {
    label: 'Address plate',
    description: 'Small numbered plate near an entrance.',
    width: 2.4, height: 1.2,
    depthTier: 'shallow',
    pieces: [
      {
        material: 'plaster', panelFill: '#f5f0e2', frameColor: '#3a3024',
        features: [
          { type: 'rail', x1: 0.55, y1: 0.65, x2: 1.85, y2: 0.65, thick: true },
        ],
      },
    ],
  },

  conduit_box: {
    label: 'Conduit / junction box',
    description: 'Small electrical box with top/bottom cable entries.',
    width: 2, height: 2.5,
    depthTier: 'shallow',
    pieces: [
      {
        material: 'cladding', panelFill: '#9a8a6a', frameColor: '#3a2818',
        features: [
          { type: 'panel', x1: 0.35, y1: 0.4, x2: 1.65, y2: 2.1 },
          // Cable entries
          { type: 'rail', x1: 1.0, y1: 0,    x2: 1.0, y2: 0.15, thick: true },
          { type: 'rail', x1: 1.0, y1: 2.35, x2: 1.0, y2: 2.5,  thick: true },
        ],
      },
    ],
  },

  /* ---- TIER 2: medium depth, 2 base layers + detail ---- */

  electric_meter: {
    label: 'Electric meter',
    description: 'Grey housing with white circular dial. 2 base + dial circle.',
    width: 3.5, height: 4.5,
    depthTier: 'medium',
    pieces: [
      // Base layer 1 — plain grey (extra depth)
      { material: 'cladding', panelFill: '#c0c0b8', frameColor: '#3a3a34', features: [] },
      // Base layer 2 — grey with breaker box etched
      {
        material: 'cladding', panelFill: '#c0c0b8', frameColor: '#3a3a34',
        features: [
          { type: 'panel', x1: 0.5, y1: 3.2, x2: 3.0, y2: 4.0 },
          { type: 'rail',  x1: 0.7, y1: 3.45, x2: 2.8, y2: 3.45 },
          { type: 'rail',  x1: 0.7, y1: 3.75, x2: 2.8, y2: 3.75 },
        ],
      },
      // Top accent — white dial circle
      {
        material: 'plaster', panelFill: '#f5f5ee', frameColor: '#3a3a34',
        shape: 'circle',
        offsetX: 0.9, offsetY: 0.7, width: 1.7, height: 1.7,
        features: [
          // Needle pointing up
          { type: 'rail', x1: 0.85, y1: 0.2, x2: 0.85, y2: 0.85, thick: true },
        ],
      },
    ],
  },

  gas_meter: {
    label: 'Gas meter',
    description: 'Cream housing with two dial windows and label panel.',
    width: 4.5, height: 5.5,
    depthTier: 'medium',
    pieces: [
      // Base layer 1 — plain cream (extra depth)
      { material: 'cladding', panelFill: '#d8c8a8', frameColor: '#5a4632', features: [] },
      // Base layer 2 — cream with label panel etched
      {
        material: 'cladding', panelFill: '#d8c8a8', frameColor: '#5a4632',
        features: [
          { type: 'panel', x1: 0.7, y1: 3.4, x2: 3.8, y2: 4.7 },
          { type: 'rail',  x1: 0.9, y1: 3.85, x2: 3.6, y2: 3.85 },
          { type: 'rail',  x1: 0.9, y1: 4.25, x2: 3.6, y2: 4.25 },
        ],
      },
      // Top accent — left dial circle
      {
        material: 'plaster', panelFill: '#f5f0e2', frameColor: '#5a4632',
        shape: 'circle',
        offsetX: 0.65, offsetY: 0.9, width: 1.3, height: 1.3,
        features: [],
      },
      // Top accent — right dial circle
      {
        material: 'plaster', panelFill: '#f5f0e2', frameColor: '#5a4632',
        shape: 'circle',
        offsetX: 2.55, offsetY: 0.9, width: 1.3, height: 1.3,
        features: [],
      },
    ],
  },

  sign_wall_plaque: {
    label: 'Wall sign / plaque',
    description: 'Dark backing with lighter inset panel. Generic shopfront sign.',
    width: 10, height: 3.5,
    depthTier: 'medium',
    pieces: [
      // Base layer 1 — plain dark (extra depth)
      { material: 'cladding', panelFill: '#3a2818', frameColor: '#1a1208', features: [] },
      // Base layer 2 — dark with subtle border etched
      {
        material: 'cladding', panelFill: '#3a2818', frameColor: '#1a1208',
        features: [
          { type: 'panel', x1: 0.4, y1: 0.3, x2: 9.6, y2: 3.2 },
        ],
      },
      // Top accent — lighter cream inset panel
      {
        material: 'plaster', panelFill: '#d8c8a0', frameColor: '#5a4632',
        offsetX: 0.6, offsetY: 0.5, width: 8.8, height: 2.5,
        features: [
          // Title-band placeholder
          { type: 'rail', x1: 1.5, y1: 1.25, x2: 7.3, y2: 1.25, thick: true },
        ],
      },
    ],
  },

  mailbox_jp: {
    label: 'Mailbox (郵便受け)',
    description: 'Red wall-mounted Japanese postbox with horizontal slot.',
    width: 2.4, height: 3,
    depthTier: 'medium',
    pieces: [
      // Base layer 1 — plain red (extra depth)
      { material: 'cladding', panelFill: '#9a4a3a', frameColor: '#3a1a0e', features: [] },
      // Base layer 2 — red with details
      {
        material: 'cladding', panelFill: '#9a4a3a', frameColor: '#3a1a0e',
        features: [
          // Top lid line
          { type: 'rail', x1: 0.2, y1: 1.05, x2: 2.2, y2: 1.05, thick: true },
          // Mail slot
          { type: 'panel', x1: 0.45, y1: 1.45, x2: 1.95, y2: 1.65 },
          // Lock/handle plate
          { type: 'panel', x1: 0.95, y1: 2.1, x2: 1.45, y2: 2.6 },
        ],
      },
    ],
  },

  /* ---- TIER 1: deep, 3+ base layers + detail/accent ---- */

  mini_split_ac: {
    label: 'Mini-split AC head',
    description: 'Wall-mounted AC head. 2 white base + grey vent strip. Louvers adapt to size.',
    width: 9, height: 3.5,
    depthTier: 'deep',
    pieces: [
      // Base 1 — plain white
      { material: 'cladding', panelFill: '#e8e8e0', frameColor: '#6a6660', features: [] },
      // Base 2 — white with panel outline + adaptive louver lines + LED.
      // Panel occupies the lower ~55% of the AC; louvers fill the panel.
      {
        material: 'cladding', panelFill: '#e8e8e0', frameColor: '#6a6660',
        featureGenerator: (w, h) => {
          const panelX1 = w * 0.045, panelX2 = w * 0.955;
          const panelY1 = h * 0.44,  panelY2 = h * 0.89;
          const features = [
            { type: 'panel', x1: panelX1, y1: panelY1, x2: panelX2, y2: panelY2 },
            { type: 'stud',  cx: w * 0.89, cy: h * 0.37, r: 0.15 },
          ];
          // Adaptive louver density — ~0.4 mm pitch
          const louverPitch = 0.4;
          const louverMargin = 0.2;
          const louverUsable = Math.max(0, (panelY2 - panelY1) - 2 * louverMargin);
          const count = Math.max(2, Math.round(louverUsable / louverPitch) + 1);
          const pitch = louverUsable / (count - 1);
          for (let i = 0; i < count; i++) {
            const y = panelY1 + louverMargin + i * pitch;
            features.push({ type: 'rail', x1: w * 0.055, y1: y, x2: w * 0.945, y2: y });
          }
          return features;
        },
      },
      // Top accent — grey vent slot strip
      {
        material: 'cladding', panelFill: '#a0a098', frameColor: '#3a3a34',
        offsetX: 0.5, offsetY: 0.5, width: 8.0, height: 0.7,
        features: [],
      },
    ],
  },

  sign_vertical_banner: {
    label: 'Vertical banner (縦看板)',
    description: 'Tall narrow signboard sticking perpendicular from the wall. Very proud. Panel count adapts to height.',
    width: 2, height: 14,
    depthTier: 'deep',
    pieces: [
      // Base 1 — plain red
      { material: 'cladding', panelFill: '#c8242a', frameColor: '#5a0a0e', features: [] },
      // Base 2 — plain red (extra depth)
      { material: 'cladding', panelFill: '#c8242a', frameColor: '#5a0a0e', features: [] },
      // Base 3 — red with stacked text-panel boxes etched (count adaptive)
      {
        material: 'cladding', panelFill: '#c8242a', frameColor: '#5a0a0e',
        featureGenerator: (w, h) => {
          const margin = 0.5;
          const gap = 0.3;
          const targetPanelH = 0.95;
          const cell = targetPanelH + gap;
          const usable = Math.max(0, h - 2 * margin);
          const count = Math.max(2, Math.round(usable / cell));
          const panelH = Math.max(0.5, (usable - (count - 1) * gap) / count);
          const panels = [];
          const innerX1 = w * 0.18;
          const innerX2 = w * 0.82;
          for (let i = 0; i < count; i++) {
            const y1 = margin + i * (panelH + gap);
            const y2 = y1 + panelH;
            panels.push({ type: 'panel', x1: innerX1, y1, x2: innerX2, y2 });
          }
          return panels;
        },
      },
    ],
  },

  lantern_chochin: {
    label: 'Chochin lantern (提灯)',
    description: 'Hanging paper lantern, golden-orange with red ribbing and dark caps. Ribs adapt to height.',
    width: 2.4, height: 3.5,
    depthTier: 'deep',
    pieces: [
      // Base 1 — plain yellow body
      { material: 'cladding', panelFill: '#e8c248', frameColor: '#9a3a18', features: [] },
      // Base 2 — yellow body with horizontal ribbing (count adapts to height)
      {
        material: 'cladding', panelFill: '#e8c248', frameColor: '#9a3a18',
        featureGenerator: (w, h) => {
          // Ribs in the central ~70% of the height (clear of the cap zones)
          const topClear    = h * 0.20;
          const bottomClear = h * 0.85;
          const usable = Math.max(0, bottomClear - topClear);
          const targetPitch = 0.5;
          const count = Math.max(2, Math.round(usable / targetPitch));
          const pitch = usable / count;
          const ribs = [];
          for (let i = 1; i < count; i++) {
            const y = topClear + i * pitch;
            ribs.push({ type: 'rail', x1: 0.2, y1: y, x2: w - 0.2, y2: y });
          }
          return ribs;
        },
      },
      // Top accent — top cap (dark)
      {
        material: 'backing', panelFill: '#3a2818', frameColor: '#1a1208',
        offsetX: 0.65, offsetY: 0.35, width: 1.1, height: 0.25,
        features: [],
      },
      // Top accent — bottom cap (dark)
      {
        material: 'backing', panelFill: '#3a2818', frameColor: '#1a1208',
        offsetX: 0.65, offsetY: 2.9, width: 1.1, height: 0.25,
        features: [],
      },
    ],
  },

  sign_kanban: {
    label: 'Kanban (看板)',
    description: 'Traditional wooden shop signboard. Chunky and proud.',
    width: 8, height: 4,
    depthTier: 'deep',
    pieces: [
      // Base 1 — plain wood
      { material: 'cladding', panelFill: 'rgba(186,148,98,0.95)', frameColor: '#3a2410', features: [] },
      // Base 2 — plain wood (extra depth)
      { material: 'cladding', panelFill: 'rgba(186,148,98,0.95)', frameColor: '#3a2410', features: [] },
      // Base 3 — wood with frame and calligraphy stripes
      {
        material: 'cladding', panelFill: 'rgba(186,148,98,0.95)', frameColor: '#3a2410',
        features: [
          { type: 'panel', x1: 0.6, y1: 0.55, x2: 7.4, y2: 3.45 },
          { type: 'rail',  x1: 1.5, y1: 1.8, x2: 6.5, y2: 1.8, thick: true },
          { type: 'rail',  x1: 1.5, y1: 2.4, x2: 6.5, y2: 2.4 },
        ],
      },
    ],
  },

  /* ---- INDUSTRIAL FIXTURES: non-opening wall features / glue-on details ---- */

  louver_bank_industrial: {
    label: 'Louver bank',
    description: 'Large industrial louver bank. Glue-on cladding piece with dense horizontal louvers; does not cut the core.',
    width: 18, height: 10,
    depthTier: 'medium',
    toolboxSection: 'industrial_fixtures',
    pieces: [
      { material: 'cladding', panelFill: '#b8bab3', frameColor: '#424640', features: [] },
      {
        material: 'cladding', panelFill: '#c7c9c0', frameColor: '#424640',
        featureGenerator: (w, h) => {
          const out = [
            { type: 'panel', x1: 0.5, y1: 0.5, x2: w - 0.5, y2: h - 0.5 },
          ];
          const margin = 1.1;
          const usable = Math.max(0.5, h - 2 * margin);
          const count = Math.max(5, Math.round(usable / 0.7));
          for (let i = 0; i < count; i++) {
            const y = margin + (i + 0.5) * (usable / count);
            out.push({ type: 'rail', x1: 1.0, y1: y, x2: w - 1.0, y2: y, thick: true });
          }
          return out;
        },
      },
    ],
  },

  large_vent_grille: {
    label: 'Large vent grille',
    description: 'Large square/rectangular ventilation grille. Glue-on layer with grid etching; no core cut.',
    width: 14, height: 12,
    depthTier: 'medium',
    toolboxSection: 'industrial_fixtures',
    pieces: [
      {
        material: 'cladding', panelFill: '#aeb2ad', frameColor: '#3e433f',
        featureGenerator: (w, h) => [
          { type: 'panel', x1: 0.5, y1: 0.5, x2: w - 0.5, y2: h - 0.5 },
          { type: 'latticeGrid', x1: 1.0, y1: 1.0, x2: w - 1.0, y2: h - 1.0, targetCell: 2.0 },
        ],
      },
      {
        material: 'cladding', panelFill: '#777d78', frameColor: '#333733',
        offsetX: 1.0, offsetY: 1.0, width: 12, height: 10,
        featureGenerator: (w, h) => [
          { type: 'horizontalRails', x1: 0.4, y1: 0.6, x2: w - 0.4, y2: h - 0.6, spacing: 0.9 },
        ],
      },
    ],
  },

  pipe_penetration_ring: {
    label: 'Pipe penetration ring',
    description: 'Through-wall pipe opening with a glue-on circular flange ring. This is explicitly marked as a through-penetration and cuts cladding + core.',
    width: 7, height: 7,
    depthTier: 'medium',
    toolboxSection: 'industrial_fixtures',
    throughCore: true,
    throughHole: { shape: 'circle', xRatio: 0.28, yRatio: 0.28, wRatio: 0.44, hRatio: 0.44 },
    pieces: [
      {
        material: 'cladding', panelFill: '#9aa0a0', frameColor: '#333838',
        shape: 'circle',
        innerCut: { shape: 'circle', xRatio: 0.28, yRatio: 0.28, wRatio: 0.44, hRatio: 0.44 },
        features: [
          { type: 'stud', cx: 3.5, cy: 0.8, r: 0.18 },
          { type: 'stud', cx: 6.2, cy: 3.5, r: 0.18 },
          { type: 'stud', cx: 3.5, cy: 6.2, r: 0.18 },
          { type: 'stud', cx: 0.8, cy: 3.5, r: 0.18 },
        ],
      },
      {
        material: 'cladding', panelFill: '#6f7777', frameColor: '#303535',
        shape: 'circle', offsetX: 2.15, offsetY: 2.15, width: 2.7, height: 2.7,
        innerCut: { shape: 'circle', xRatio: 0.22, yRatio: 0.22, wRatio: 0.56, hRatio: 0.56 },
        features: [],
      },
    ],
  },

  cable_tray_wall: {
    label: 'Cable tray',
    description: 'Wall-mounted cable tray / conduit rack. Glue-on long strip with cross-rungs; no core cut.',
    width: 28, height: 3,
    depthTier: 'medium',
    toolboxSection: 'industrial_fixtures',
    pieces: [
      { material: 'cladding', panelFill: '#8f938d', frameColor: '#363a36', features: [] },
      {
        material: 'cladding', panelFill: '#a4a8a1', frameColor: '#363a36',
        featureGenerator: (w, h) => {
          const out = [
            { type: 'rail', x1: 0.3, y1: 0.55, x2: w - 0.3, y2: 0.55, thick: true },
            { type: 'rail', x1: 0.3, y1: h - 0.55, x2: w - 0.3, y2: h - 0.55, thick: true },
          ];
          const count = Math.max(5, Math.round(w / 3));
          for (let i = 1; i < count; i++) {
            const x = (i / count) * w;
            out.push({ type: 'rail', x1: x, y1: 0.6, x2: x, y2: h - 0.6 });
          }
          return out;
        },
      },
    ],
  },

  exterior_electrical_cabinet: {
    label: 'Electrical cabinet',
    description: 'Exterior wall-mounted industrial electrical/control cabinet with door seams, handle, vents, and warning plate.',
    width: 9, height: 13,
    depthTier: 'deep',
    toolboxSection: 'industrial_fixtures',
    pieces: [
      { material: 'cladding', panelFill: '#b9beb8', frameColor: '#3c423d', features: [] },
      { material: 'cladding', panelFill: '#b9beb8', frameColor: '#3c423d', features: [] },
      {
        material: 'cladding', panelFill: '#cbd0c8', frameColor: '#3c423d',
        featureGenerator: (w, h) => [
          { type: 'panel', x1: 0.5, y1: 0.5, x2: w - 0.5, y2: h - 0.5 },
          { type: 'rail', x1: w * 0.5, y1: 0.7, x2: w * 0.5, y2: h - 0.7 },
          { type: 'handle', x1: w - 1.5, y1: h * 0.44, x2: w - 1.5, y2: h * 0.58 },
          { type: 'horizontalRails', x1: 1.0, y1: h - 3.0, x2: w - 1.0, y2: h - 1.2, spacing: 0.55 },
          { type: 'panel', x1: 1.0, y1: 1.1, x2: 3.4, y2: 2.3 },
        ],
      },
    ],
  },

  dust_collector_box: {
    label: 'Dust collector box',
    description: 'Boxy wall-mounted dust collector / filter housing. Laser-cut as stacked cladding layers with grille lines.',
    width: 13, height: 11,
    depthTier: 'deep',
    toolboxSection: 'industrial_fixtures',
    pieces: [
      { material: 'cladding', panelFill: '#9a968c', frameColor: '#3c3831', features: [] },
      { material: 'cladding', panelFill: '#9a968c', frameColor: '#3c3831', features: [] },
      {
        material: 'cladding', panelFill: '#b2ada1', frameColor: '#3c3831',
        featureGenerator: (w, h) => [
          { type: 'panel', x1: 0.7, y1: 0.7, x2: w - 0.7, y2: h - 0.7 },
          { type: 'horizontalRails', x1: 1.1, y1: 1.4, x2: w - 1.1, y2: h * 0.55, spacing: 0.75 },
          { type: 'panel', x1: w * 0.32, y1: h * 0.68, x2: w * 0.68, y2: h - 1.0 },
        ],
      },
      {
        material: 'cladding', panelFill: '#6f6a61', frameColor: '#302d28',
        offsetX: 4.0, offsetY: 8.0, width: 5.0, height: 2.0,
        features: [],
      },
    ],
  },

  wall_mounted_duct: {
    label: 'Wall duct',
    description: 'Rectangular wall-mounted duct run with band clamps. Glue-on strip; no wall cut by default.',
    width: 22, height: 4.5,
    depthTier: 'deep',
    toolboxSection: 'industrial_fixtures',
    pieces: [
      { material: 'cladding', panelFill: '#8e958f', frameColor: '#303632', features: [] },
      { material: 'cladding', panelFill: '#8e958f', frameColor: '#303632', features: [] },
      {
        material: 'cladding', panelFill: '#a9b0aa', frameColor: '#303632',
        featureGenerator: (w, h) => {
          const out = [
            { type: 'panel', x1: 0.4, y1: 0.5, x2: w - 0.4, y2: h - 0.5 },
            { type: 'rail', x1: 0.5, y1: h * 0.35, x2: w - 0.5, y2: h * 0.35 },
            { type: 'rail', x1: 0.5, y1: h * 0.65, x2: w - 0.5, y2: h * 0.65 },
          ];
          const bands = Math.max(3, Math.round(w / 6));
          for (let i = 1; i < bands; i++) {
            const x = (i / bands) * w;
            out.push({ type: 'ironBand', x1: x - 0.18, y1: 0.2, x2: x + 0.18, y2: h - 0.2 });
          }
          return out;
        },
      },
    ],
  },

  ladder_strip: {
    label: 'Ladder strip',
    description: 'Flat wall ladder strip with side rails and rungs. Laser-cut as glue-on/etched layers; no core cut.',
    width: 4, height: 24,
    depthTier: 'medium',
    toolboxSection: 'industrial_fixtures',
    pieces: [
      {
        material: 'cladding', panelFill: '#707872', frameColor: '#252b27',
        featureGenerator: (w, h) => {
          const out = [
            { type: 'rail', x1: 0.8, y1: 0.2, x2: 0.8, y2: h - 0.2, thick: true },
            { type: 'rail', x1: w - 0.8, y1: 0.2, x2: w - 0.8, y2: h - 0.2, thick: true },
          ];
          const count = Math.max(5, Math.round(h / 2.6));
          for (let i = 1; i < count; i++) {
            const y = (i / count) * h;
            out.push({ type: 'rail', x1: 0.8, y1: y, x2: w - 0.8, y2: y, thick: true });
          }
          return out;
        },
      },
    ],
  },

  safety_cage: {
    label: 'Safety cage',
    description: 'Ladder safety cage overlay. Laser-cut as flat cage ribs; best as suggestive relief, not a true round cage.',
    width: 8, height: 24,
    depthTier: 'deep',
    toolboxSection: 'industrial_fixtures',
    laserCaveat: 'A true cylindrical safety cage is not practical in flat laser-cut sheet; this generates a flat relief approximation.',
    pieces: [
      {
        material: 'cladding', panelFill: 'rgba(110,118,112,0.55)', frameColor: '#28302b',
        featureGenerator: (w, h) => {
          const out = [
            { type: 'rail', x1: w * 0.28, y1: 0.2, x2: w * 0.28, y2: h - 0.2, thick: true },
            { type: 'rail', x1: w * 0.72, y1: 0.2, x2: w * 0.72, y2: h - 0.2, thick: true },
            { type: 'rail', x1: w * 0.5, y1: 0.4, x2: w * 0.5, y2: h - 0.4 },
          ];
          const hoops = Math.max(4, Math.round(h / 5));
          for (let i = 1; i < hoops; i++) {
            const y = (i / hoops) * h;
            out.push({ type: 'rail', x1: 0.4, y1: y, x2: w - 0.4, y2: y, thick: true });
          }
          return out;
        },
      },
      {
        material: 'cladding', panelFill: 'rgba(120,128,122,0.4)', frameColor: '#28302b',
        offsetX: 1.0, offsetY: 1.0, width: 6.0, height: 22.0,
        featureGenerator: (w, h) => [
          { type: 'latticeVertical', x1: 0.5, y1: 0.2, x2: w - 0.5, y2: h - 0.2 },
        ],
      },
    ],
  },

  service_platform_brackets: {
    label: 'Platform brackets',
    description: 'Pair of triangular wall brackets for a small service platform. Glue-on detail; no wall cut.',
    width: 12, height: 6,
    depthTier: 'medium',
    toolboxSection: 'industrial_fixtures',
    pieces: [
      {
        material: 'cladding', panelFill: '#6d746e', frameColor: '#242a26',
        features: [
          { type: 'rail', x1: 1.0, y1: 1.0, x2: 1.0, y2: 5.2, thick: true },
          { type: 'rail', x1: 1.0, y1: 5.2, x2: 5.0, y2: 1.0, thick: true },
          { type: 'rail', x1: 1.0, y1: 1.0, x2: 5.0, y2: 1.0, thick: true },
          { type: 'rail', x1: 7.0, y1: 1.0, x2: 7.0, y2: 5.2, thick: true },
          { type: 'rail', x1: 7.0, y1: 5.2, x2: 11.0, y2: 1.0, thick: true },
          { type: 'rail', x1: 7.0, y1: 1.0, x2: 11.0, y2: 1.0, thick: true },
        ],
      },
    ],
  },

};

/* Default fixture dimensions for a given style, mirroring getWindowDims().
 * Used by the toolbox card and editor when no custom size has been set. */
function getFixtureDims(styleKey) {
  const s = FIXTURE_STYLES[styleKey];
  if (!s) return { w: 4, h: 4 };
  return { w: s.width, h: s.height };
}

/* Build the inline SVG body for a fixture preview. Mirrors
 * buildDoorSvgBody / buildWindowSvgBody. Renders each piece bottom-to-top
 * (lower z-order first) with its own fill, stroke, and etched features.
 * Output coordinates are in target units; caller wraps in <svg viewBox> or
 * <g transform> as needed.
 */
function buildFixtureSvgBody(style, w, h, opts) {
  if (!style || !style.pieces || !style.pieces.length) return '';
  opts = opts || {};
  // Etched fixtures don't have visible piece bodies — they're pure engraving
  // on the cladding. The features ARE the visual, so skip body shapes and
  // only render features.
  const isEtched = style.placement === 'etched';
  const sx = w / style.width, sy = h / style.height;
  const sw       = (opts.strokeWidth      != null) ? opts.strokeWidth      : 0.18;
  const swThick  = (opts.thickStrokeWidth != null) ? opts.thickStrokeWidth : 0.3;
  let svg = '';

  for (const piece of style.pieces) {
    const px = (piece.offsetX != null) ? piece.offsetX : 0;
    const py = (piece.offsetY != null) ? piece.offsetY : 0;
    const pw = (piece.width  != null) ? piece.width  : style.width  - px;
    const ph = (piece.height != null) ? piece.height : style.height - py;
    const fill   = piece.panelFill  || '#bdbdb5';
    const stroke = piece.frameColor || '#3a3a34';

    // 1. Piece body (skipped for etched fixtures)
    if (!isEtched) {
      if (piece.shape === 'circle') {
        const cx = (px + pw / 2) * sx;
        const cy = (py + ph / 2) * sy;
        const r  = (pw / 2) * Math.min(sx, sy);
        svg += `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r.toFixed(2)}"`
             + ` fill="${fill}" stroke="${stroke}" stroke-width="${sw.toFixed(3)}"/>`;
      } else {
        svg += `<rect x="${(px * sx).toFixed(2)}" y="${(py * sy).toFixed(2)}"`
             + ` width="${(pw * sx).toFixed(2)}" height="${(ph * sy).toFixed(2)}"`
             + ` fill="${fill}" stroke="${stroke}" stroke-width="${sw.toFixed(3)}"/>`;
      }
    }

    // Optional internal cut preview, used by rings/flanges. In the physical
    // fixture sheet this becomes an actual cut path; here it is shown as a
    // dark/empty hole so the toolbox/editor icon matches the part.
    if (!isEtched && piece.innerCut) {
      const ic = piece.innerCut;
      const ix = px + ((ic.x != null) ? ic.x : ((ic.xRatio || 0) * pw));
      const iy = py + ((ic.y != null) ? ic.y : ((ic.yRatio || 0) * ph));
      const iw = (ic.w != null) ? ic.w : ((ic.wRatio || 0.5) * pw);
      const ih = (ic.h != null) ? ic.h : ((ic.hRatio || 0.5) * ph);
      if (ic.shape === 'circle') {
        const cx = (ix + iw / 2) * sx;
        const cy = (iy + ih / 2) * sy;
        const r  = Math.min(iw * sx, ih * sy) / 2;
        svg += `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r.toFixed(2)}" fill="#1a1814" stroke="${stroke}" stroke-width="${sw.toFixed(3)}"/>`;
      } else {
        svg += `<rect x="${(ix * sx).toFixed(2)}" y="${(iy * sy).toFixed(2)}" width="${(iw * sx).toFixed(2)}" height="${(ih * sy).toFixed(2)}" fill="#1a1814" stroke="${stroke}" stroke-width="${sw.toFixed(3)}"/>`;
      }
    }

    // 2. Etched features on this piece (coords in piece-local space).
    // featureGenerator(pw, ph) lets pieces produce density-adaptive etches —
    // bracket bands on a tall downspout, louvers on a wide vent, stacked
    // panels on a long banner. Static `features` are used when the etched
    // detail scales naturally with linear stretch.
    const pieceFeatures = piece.featureGenerator
      ? piece.featureGenerator(pw, ph)
      : (piece.features || []);
    if (pieceFeatures.length) {
      // Reuse doorFeatureShapes to expand the feature list — same vocabulary
      // (rail, panel, stud, ironBand, latticeVertical, horizontalRails…).
      const shapes = doorFeatureShapes({ width: pw, height: ph, features: pieceFeatures });
      if (shapes.length) {
        // Transform from piece-local mm to target SVG units, anchored at
        // the piece's top-left corner.
        const tx = (px * sx).toFixed(2), ty = (py * sy).toFixed(2);
        const scX = sx.toFixed(4),       scY = sy.toFixed(4);
        svg += `<g transform="translate(${tx} ${ty}) scale(${scX} ${scY})">`;
        svg += emitDoorShapesSvg(shapes, 0, 0, 1, {
          stroke: stroke,
          knobFill: stroke,
          strokeWidth: sw,
          thickStrokeWidth: swThick,
          pointerEvents: opts.pointerEvents,
        });
        svg += `</g>`;
      }
    }
  }
  return svg;
}
