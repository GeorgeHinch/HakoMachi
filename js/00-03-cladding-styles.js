'use strict';

/* =====================================================================
   CLADDING STYLES
   Each defines how to add etched detail to a cladding panel.
   Dimensions are in mm at 1:150 N-scale (real-world dim ÷ 150).
   
   Pattern types:
     'lines'         — simple horizontal/vertical seam grid (panel siding)
     'offset_courses'— brick/stone with staggered horizontal courses
     'diagonal_grid' — namako-kabe diagonal tile pattern
     'tile_overlap'  — kawara roof-tile-like overlapping wave pattern
   ===================================================================== */
const CLADDING_STYLES = {
  // ---- Modern industrial / commercial ----
  alc_panel: {
    label: 'ALC panel (vertical, 4mm wide)',
    description: 'Autoclaved Lightweight Concrete panels. Real size 600×3000mm. Most common on Japanese factories, warehouses, commercial buildings. Vertical orientation, narrow joint lines.',
    pattern: 'lines',
    seamSpacing: { vertical: 4, horizontal: 20 },  // 600mm wide × 3000mm tall at 1:150
    notes: 'Vertical primary seams every ~4mm; faint horizontal lines mark panel ends every ~20mm.',
  },
  alc_panel_horizontal: {
    label: 'ALC panel (horizontal, 4mm tall)',
    description: 'Same 600×3000mm ALC panels as the standard vertical variant, but laid flat. Horizontal courses every ~4mm with faint vertical lines every ~20mm where each panel ends. Common on small commercial and modern residential — the rotated layout reads quite differently from vertical ALC and gives the building a stretched, low-slung feel.',
    pattern: 'lines',
    seamSpacing: { vertical: 20, horizontal: 4 },
    notes: 'Horizontal primary seams every ~4mm; faint vertical lines mark panel ends every ~20mm. Swap with alc_panel for a different visual rhythm without changing material.',
  },
  alc_panel_wide: {
    label: 'ALC panel (wide 1200mm)',
    description: 'Wider 1200×3000mm ALC panels used on big-box retail, logistics centres, and modern large-format warehouses. Verticals spaced every ~8mm instead of 4mm gives a cleaner, more spacious read — fewer joints across a long elevation. Same material as standard ALC, different module size.',
    pattern: 'lines',
    seamSpacing: { vertical: 8, horizontal: 20 },
    notes: 'Double-width ALC. Use on long elevations where the standard 4mm seams would look too busy.',
  },
  alc_panel_bolted: {
    label: 'ALC panel (exposed fasteners)',
    description: 'ALC with visible corner-bolt fasteners — heavier industrial spec used on factories, silos, and steel-frame warehouses where the panels are bolted through to the structural frame rather than concealed-fastened. Small etched dots mark each panel-corner intersection.',
    pattern: 'lines',
    seamSpacing: { vertical: 4, horizontal: 20 },
    boltDots: true,
    boltSize: 0.55,
    notes: 'Standard 4mm ALC seams plus a small + tick at each panel corner representing the visible fastener. Bolts approach laser-etch resolution at 1:150 — they show as compact crosses rather than round dots, which still reads as "exposed-fastener industrial" without needing higher resolution than the laser can cleanly produce.',
  },
  alc_panel_ribbed: {
    label: 'ALC panel (decorative ribs)',
    description: 'Mid-grade commercial ALC with shallow decorative vertical grooves between each pair of panel seams. The grooves divide each 600mm panel into three narrower visual bands without changing the actual panel module. Common on storefronts and small office buildings.',
    pattern: 'lines',
    seamSpacing: { vertical: 4, horizontal: 20 },
    verticalSubdivide: 3,
    notes: 'Three decorative ribs etched within each ALC panel. Reads finer than plain ALC at the same panel spacing — gives a more refined commercial look without the busyness of corrugated metal.',
  },
  ribbed_metal_wide: {
    label: 'Ribbed metal panel (wide)',
    description: 'Industrial sandwich panel with bold vertical ribs every ~150-200mm real (1-1.3mm at scale). Modern factories, large warehouses.',
    pattern: 'lines',
    seamSpacing: { vertical: 1.3, horizontal: null },
    notes: 'Bold vertical ribs only.',
  },
  ribbed_metal_wide_fasteners: {
    label: 'Ribbed metal panel (wide + fasteners)',
    description: 'Wide vertical ribbed metal with exposed screw/bolt fasteners set in offset rows, inspired by older industrial corrugated wall panels. The marks are small diagonal etched ticks placed between ribs rather than on top of the rib lines.',
    pattern: 'lines',
    seamSpacing: { vertical: 1.3, horizontal: null },
    metalFasteners: true,
    fastenerSpacingY: 12,
    fastenerSpacingX: 13,
    fastenerOffsetRows: true,
    fastenerTickSize: 0.55,
    notes: 'Wide metal ribs plus staggered exposed-fastener ticks. More legible than tiny dots at N scale.',
  },
  standing_seam_metal: {
    label: 'Standing-seam metal roof',
    description: 'Long flat metal sheets joined by raised vertical seams every ~400-500mm real (~3mm at scale). Common on residential, light-commercial, and shop roofs across Japan. Pairs naturally with the flat-overhang roof style.',
    pattern: 'lines',
    seamSpacing: { vertical: 3, horizontal: null },
    notes: 'Single bold seam direction. For a flat roof seen from above the seam direction is just visual — pick whichever orientation reads better with the building proportions.',
  },
  ribbed_metal_narrow: {
    label: 'Ribbed metal panel (narrow)',
    description: 'Tighter vertical metal ribs every ~75mm real (0.5mm at scale). Older or lighter-duty industrial.',
    pattern: 'lines',
    seamSpacing: { vertical: 0.5, horizontal: null },
    notes: 'Fine vertical ribs. Spacing approaches laser resolution; verify on test cut.',
  },
  cement_siding_lap: {
    label: 'Cement lap siding',
    description: 'Horizontal cement-fiber siding (Nichiha-style). Real course height ~455mm = 3mm at scale. Common on small commercial and modern residential.',
    pattern: 'lines',
    seamSpacing: { vertical: null, horizontal: 3 },
    notes: 'Horizontal courses only.',
  },
  galvalume_vertical: {
    label: 'Galvalume vertical (residential metal)',
    description: 'Galvalume (zinc-aluminium-coated steel) sheets installed vertically with narrow seams every ~450mm = 3mm at scale. Modern residential and small commercial — the dominant cladding on contemporary Japanese houses since the early 2000s. Sits between standing-seam roof (wider seams) and ribbed metal (denser ribs) in the metal-cladding family.',
    pattern: 'lines',
    seamSpacing: { vertical: 3, horizontal: null },
    notes: 'Vertical metal seams only. Pairs visually with metal-roof and flat-overhang styles.',
  },
  fluted_concrete: {
    label: 'Fluted concrete (vertical ribs)',
    description: 'Bold vertical concrete flutes / channels every ~750mm = 5mm at scale. Distinctive on 1960s-70s civic buildings, parking structures, brutalist commercial. Heavy-grain rhythm that contrasts strongly with smooth precast.',
    pattern: 'lines',
    seamSpacing: { vertical: 5, horizontal: null },
    notes: 'Wide vertical ribs only. Use on government / civic / parking buildings for a period brutalist read.',
  },
  mosaic_tile: {
    label: 'Mosaic tile (50mm)',
    description: 'Small 50×50mm ceramic mosaic tiles in a tight grid — the classic 1970s-80s commercial-bathhouse-older-shop look, also seen on entry plinths of mid-century apartments. Grid at ~0.5mm sits at the edge of laser-etch resolution at 1:150; the result reads as a fine texture rather than individually-distinguishable tiles, which matches how it looks at viewing distance anyway.',
    pattern: 'lines',
    seamSpacing: { vertical: 0.5, horizontal: 0.5 },
    notes: 'Fine 0.5mm grid — at the edge of laser resolution. Test-cut a small swatch before committing to a full elevation; you may need to thin the etch line or widen to 0.6mm depending on your laser and material combination.',
  },
  concrete_panel_large: {
    label: 'Concrete panel (large)',
    description: 'Pre-cast concrete panels with grid joints. Real 3×3m panels = 20×20mm grid. Office buildings, modern retail.',
    pattern: 'lines',
    seamSpacing: { vertical: 20, horizontal: 20 },
  },
  concrete_panel_small: {
    label: 'Concrete panel (small)',
    description: 'Smaller pre-cast panels in 1.5×1.5m grid (10×10mm at scale). Office façades, parking structures.',
    pattern: 'lines',
    seamSpacing: { vertical: 10, horizontal: 10 },
  },

  // ---- Traditional / residential ----
  yakisugi: {
    label: 'Yakisugi (charred cedar planks)',
    description: 'Traditional charred-cedar siding. Real plank width ~150-180mm = 1-1.2mm at scale. Vertical orientation. Tea houses, traditional shops, modern accent walls.',
    pattern: 'lines',
    seamSpacing: { vertical: 1.2, horizontal: null },
    notes: 'Tightly-spaced vertical plank seams.',
  },
  board_batten: {
    label: 'Board and batten (押縁張り)',
    description: 'Vertical wood boards joined edge-to-edge with raised batten strips covering each joint. The battens read as paired etched lines marking each batten\'s left and right edge — a distinctive doubled-rhythm look that\'s hard to confuse with plain plank siding. Traditional storehouses (kura), country houses, modern accent walls and some contemporary architect-designed residences.',
    pattern: 'board_batten',
    boardWidth: 2.0,     // ~300mm board at 1:150
    battenWidth: 0.6,    // ~90mm batten at 1:150 — exaggerated to be visible at scale; real battens (~50mm = 0.3mm) would etch as a single line and lose the doubled-line character that defines this cladding type
    // Swatch-only hint for the editor's popover preview — the actual
    // pattern is emitted by the `board_batten` branch in
    // generateCladdingPattern using boardWidth/battenWidth above. The
    // simple swatch can only draw evenly-spaced lines, so we use the
    // cycle (board + batten) as the vertical spacing — close enough to
    // "looks like vertical wood siding" for the picker thumbnail.
    seamSpacing: { vertical: 2.6, horizontal: null },
    notes: 'Battens slightly oversized at 1:150 so the paired lines read as two distinct etches rather than merging. The cycle (board + batten) is what matches the real-world rhythm.',
  },
  namako_kabe: {
    label: 'Namako-kabe (diagonal tile)',
    description: 'Traditional diagonal tile pattern with raised plaster joints. Real ~225mm square tiles = 1.5mm. Storehouses (kura), historic merchant buildings.',
    pattern: 'diagonal_grid',
    tileSize: 1.5,
  },
  hira_gawara_wall: {
    label: 'Hira-gawara wall (square tile)',
    description: 'Flat square clay-tile wall cladding — distinct from the overlapping ridged kawara roof tile. Tiles laid edge-to-edge in a regular grid, ~265mm = 1.8mm at scale. Used on temple foundations, traditional commercial buildings, and some refined residential plinths. The square grid reads quite differently from offset stone courses.',
    pattern: 'lines',
    seamSpacing: { vertical: 1.8, horizontal: 1.8 },
    notes: 'Wall cladding, NOT roof — use kawara_tile for overlapping ridged roof tile.',
  },
  kawara_tile: {
    label: 'Kawara (roof tile)',
    description: 'Traditional clay roof tiles, used on roof CLADDING ONLY. Real ~265×305mm = 1.8×2mm. Houses, temples, shrines.',
    pattern: 'tile_overlap',
    tileW: 1.8, tileH: 2.0,
    notes: 'Use on roof cladding piece, not walls.',
  },
  corrugated_metal_overlap: {
    label: 'Corrugated metal (overlapping sheets)',
    description: 'Galvanized corrugated metal roofing in overlapping sheets — the classic "tin roof" look seen on industrial sheds, agricultural buildings, and weathered tropical residences. Sheets ~750×1800mm real (5×12mm at 1:150), each with fine vertical corrugation ridges; adjacent rows offset half a sheet width so the lap joints stagger like brickwork.',
    pattern: 'corrugated_overlap',
    sheetW: 5, sheetH: 12,
    corrugationSpacing: 0.7,
    offsetFraction: 0.5,
    // For the editor's mini-swatch preview only — the actual etched pattern
    // is emitted by the `corrugated_overlap` branch in generateCladdingPattern,
    // which uses sheetW/sheetH/corrugationSpacing/offsetFraction above.
    // seamSpacing here just gives the popover swatch a sane "dense vertical
    // lines + a few horizontals" sketch so the style reads as ribbed-metal
    // ish in the picker; without it the swatch would draw as a plain
    // rectangle.
    seamSpacing: { vertical: 0.7, horizontal: 12 },
    notes: 'Roof cladding style — pairs naturally with slanted or gabled roofs. Corrugation spacing is at the edge of laser-etch resolution at 1:150; verify on a sample cut and widen the spacing if ridges blur together.',
  },

  // ---- Stone & brick ----
  brick_course: {
    label: 'Brick (running bond)',
    description: 'Standard Japanese brick: 210×60mm = 1.4×0.4mm at scale. Pattern is etched only (individual bricks too small to cut). Banks, post offices, station buildings.',
    pattern: 'offset_courses',
    courseW: 1.4, courseH: 0.4,
    offsetFraction: 0.5,
  },
  stone_ashlar_small: {
    label: 'Stone ashlar (small course)',
    description: 'Small dressed stone blocks ~300×200mm = 2×1.3mm. Government buildings, older banks, retaining walls.',
    pattern: 'offset_courses',
    courseW: 2.0, courseH: 1.3,
    offsetFraction: 0.5,
  },
  stone_ashlar_large: {
    label: 'Stone ashlar (large course)',
    description: 'Large rusticated stone blocks ~600×400mm = 4×2.7mm. Civic landmarks, monumental architecture.',
    pattern: 'offset_courses',
    courseW: 4.0, courseH: 2.7,
    offsetFraction: 0.5,
  },
  stone_random_rubble: {
    label: 'Stone rubble (random)',
    description: 'Irregular rubble masonry. Stone walls, agricultural buildings, retaining walls.',
    pattern: 'random_rubble',
    avgSize: 2.5,
  },

  // ---- Plain ----
  smooth: {
    label: 'Smooth (no detail)',
    description: 'Plain cladding with no etched detail. Use for stucco/render walls, painted surfaces.',
    pattern: 'lines',
    seamSpacing: { vertical: null, horizontal: null },
  },
};
