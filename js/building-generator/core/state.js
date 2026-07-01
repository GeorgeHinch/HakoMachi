/* =====================================================================
   STATE
   ===================================================================== */
export let CONFIG = {
  buildingType: 'industrial_loading',
  buildingName: null,
  width: 80, depth: 80, height: 120,
  heightIncludesParapet: true,
  wallExposureZones: [],
  heightMode: 'absolute', floorCount: 4, floorHeight: 30,
  claddingStyle: 'alc_panel',
  // Roof cladding style — independent from wall cladding so a building can
  // have, say, yakisugi walls with a kawara roof (very common in traditional
  // Japanese architecture). Used by generateRoofCladdingPanel and
  // generateGabledRoofCladding; falls back to claddingStyle if unset (which
  // matches the pre-roof-cladding behaviour).
  roofCladdingStyle: 'concrete_panel_small',
  // Interior wall cladding (opt-in). When enabled, a second cladding panel
  // is produced for each of the four perimeter walls, glued to the INSIDE
  // face. Holes for windows + doors are placed at the same wall_x as the
  // wall core so the inside cutout aligns with the same physical hole the
  // exterior cladding cut for. Style is independent — choose a smooth
  // interior finish (cement_siding_lap, alc_panel) regardless of what the
  // exterior shows. Falls back to the exterior style if `interiorCladdingStyle`
  // is null. Defaults off so existing builds don't sprout extra parts.
  interiorCladding: false,
  interiorCladdingStyle: null,
  windowStyle: 'industrial_small',
  windowScale: 'default',
  windowDensity: 'sparse',
  // First-floor (ground floor) overrides — height and window style independently toggleable
  firstFloorHeightEnabled: false,
  firstFloorHeight: 35,
  firstFloorWindowStyleEnabled: false,
  firstFloorWindowStyle: 'storefront',
  firstFloorWindowScale: 'default',
  firstFloorCladdingStyleEnabled: false,
  firstFloorCladdingStyle: 'cement_siding_lap',
  // Ground-floor depth offset (extension forward / recess from upper floors)
  groundFloorOffsetEnabled: false,
  groundFloorOffsetAmount: 10,        // mm, positive = extends forward, negative = recessed
  // Rooftop mechanical room (penthouse for HVAC, elevator overrun, etc.)
  rooftopMechRoom: false,
  rooftopMechRoomWidth: 25,
  rooftopMechRoomDepth: 20,
  rooftopMechRoomHeight: 18,
  rooftopMechRoomXOffset: 0,    // offset from roof CENTER in width direction (negative = west)
  rooftopMechRoomYOffset: 10,   // offset from roof CENTER in depth direction (positive = back)
  // Rooftop equipment counts. Each entry corresponds to a key in ROOFTOP_EQUIPMENT.
  rooftopEquipment: { ac_small: 0, ac_large: 0, cooling_tower: 0, water_tank_round: 0, water_tank_square: 0, mushroom_vent: 0, elec_cabinet: 0, antenna_mast: 0 },
  roofStyle: 'parapet',
  parapetHeight: 2,
  parapetInnerCladding: true,
  roofPitch: 10,
  roofRidgeDirection: 'ew',    // gabled: 'ew' (east-west ridge) or 'ns' (north-south ridge)
  roofSlopeDirection: 'back',  // slanted: which side is high ('front','back','east','west')
  roofOverhangFB: 0,           // mm overhang beyond front / back walls
  roofOverhangEW: 0,           // mm overhang beyond east / west walls
  // For the 'flat_overhang' roof style only — one symmetric value
  // applied to all four sides. The roof core extends past every wall
  // by this amount and the metal cladding above covers the full
  // oversized footprint.
  roofOverhang: 5,
  roofOverhangLinked: true,    // keep FB and EW in sync
  doorStyle: 'single',
  frontDoorCount: 0, backDoorCount: 0, sideDoorCount: 1,
  // Trim strips along top/bottom of building
  trimTop: false, trimBottom: false, trimBelt: false,
  trimHeight: 2, trimOverhang: 0.28,
  // Corner trim — narrow 3 mm strips that wrap each building corner with
  // a centred fold line, covering the exposed cladding edges where two
  // adjacent faces meet.
  cornerTrim: false,
  // Parapet cap — narrow 3 mm strips that fold over each parapet wall's
  // top edge (or each plain-gabled wall's triangular peak), hiding the
  // exposed core-material edge that the regular cladding doesn't cover.
  parapetCap: false,
  // Soffit cladding — flat cladding pieces sized to the underside of
  // each eave overhang, covering the bare core material visible from
  // below. Applies to flat_overhang (all 4 sides) and gabled roofs
  // (the 2 eave sides under the current ridge direction).
  soffitCladding: false,
  // Roof fascia trim — 3 mm-wide trim strips following the roof's
  // perimeter (the panel edges), hiding exposed core material there.
  // For gabled: a chevron piece outlining each gable peak's V-shape
  // (the "triangle on each gable") plus a straight strip along each
  // eave (the "end cap"). For slanted: a parallelogram per
  // slanted-top wall, with vertical short ends so the wall's top
  // edge looks flat-finished rather than tapering inward.
  roofFasciaTrim: false,
  // Inter-floor core panels
  floorPanels: false,
  lastWallSide: 'back',
  // Donut/ring floor mode: keep the exterior floor perimeter and wall slots,
  // but cut a centered rectangular wire-access opening out of the slab.
  // This is useful for buildings without interiors where lighting wires need
  // an easy path up through the structure.
  floorOutlineOpening: false,
  floorOutlineBorderMm: 8,
  floorOutlineOpeningOnInterFloors: false,
  // Sheet splitting / panelization. Oversized wall core and cladding parts
  // are split into sheet-sized segments, with core-wall splice plates emitted
  // to bridge the joints from the interior side. Material max sheet sizes are
  // read from the Materials panel; effective area subtracts the 1/4in sheet
  // safety border already used by MaterialRegistry.
  sheetSplitEnabled: true,
  sheetSplitMinSegmentMm: 40,
  sheetSplitSpliceWidthMm: 16,
  sheetSplitStaggerCladdingMm: 24,
  coreThickness: 1.5,
  claddingThickness: 0.28,
  // Exterior cladding skirt. Enabled by default: wall cladding panels extend
  // below the wall bottom by one core/floor thickness so they cover the
  // exposed edge of the floor piece. This is exterior-only; interior cladding
  // stays flush to the wall height.
  claddingExtendsToFloorBottom: true,
  tongueWidth: 15,
  // Assembly keying: when a wall face has asymmetric manual features or cladding overlays,
  // shift that wall's bottom tongues slightly so it cannot be installed reversed.
  asymmetricWallKeying: true,
  kerfComp: -0.005,
  // Extra handling margin around surface-mounted cut pieces such as solid
  // door inserts. The generated part is oversized by this amount per side
  // and gets an etched true-fit outline for trimming.
  surfaceFeatureTrimOffset: 0.75,
  // Manual opening overrides per wall. null = use auto-placement; array = editor-placed openings.
  // Each entry: { type: 'window'|'door'|'bay', x, y, w, h, ... } in wall-local mm
  // coords (y=0 at top). The default seeds a through-bay across front/back to
  // match the initial industrial building type. Bay height (24) is deliberately
  // less than the default first-floor band (30) so there's a visible strip of
  // wall material above the bay before the inter-floor panel.
  manualOpenings: {
    front: [{ type: 'bay', style: 'through', x: 15, y: 96, w: 50, h: 24 }],
    back:  [{ type: 'bay', style: 'through', x: 15, y: 96, w: 50, h: 24 }],
    east: null, west: null,
  },
  // Awnings placed via the opening editor. Stored separately so wall generators never see them.
  // Each entry: { x, y, w, d } where d = projection depth outward in mm.
  manualAwnings:  { front: [],  back: [],  east: [],  west: []  },
  manualBalconies:{ front: [],  back: [],  east: [],  west: []  },
  manualFixtures: { front: [],  back: [],  east: [],  west: []  },
  manualCladdingOverrides: { front: [], back: [], east: [], west: [] },
  manualPrintedItems: { front: [], back: [], east: [], west: [] },
  // Unified wall feature model. Existing .hako files are still supported:
  // when this is absent, runtime helpers synthesize it from the older
  // manualOpenings/manualFixtures/manualPrintedItems/etc. buckets.
  // New editor commits write both this unified model and the legacy buckets.
  wallFeatures: { front: null, back: null, east: null, west: null },
  partLevels: {},
  partMaterials: {},
  internalWalls: {},       // { floorIdx: [{ x1,y1,x2,y2 }] }  interior mm coords
  rooftopItems:  [],        // [{ type, x,y,w,d, h?, label? }]   on-roof placements
  floorHoles:    [],        // [{ shape:'circle'|'square', x,y,d? | w?,h? }]  cut-outs in floor/inter-floor panels
  // Embedded straight N-gauge rail zones drawn in the floor editor. Coordinates
  // are interior floor-plan mm (same frame as floorHoles): x/y = top-left of
  // the raised paved/embedded-track rectangle, w/h = zone size. V1 supports
  // straight N/S track through front/back walls; E/W geometry is stored for
  // preview/calibration but side-wall bay cuts are intentionally not emitted yet.
  embeddedRails: [],        // [{ x,y,w,h,orientation:'auto'|'ns'|'ew', trackOffset?, trackProfile? }]
  roofHoles:     [],        // same format, applied to the roof panel
  // Skylights: rectangular roof openings with a layered curb assembly.
  // Each entry: { x, y, w, h } where (x, y) is the CENTRE of the roof hole
  // in mm, and (w, h) is the hole size. The generated parts are: plexi
  // pane = hole + 1.5mm overlap on every side; core curb frame around that
  // pane; top cap = same outside size as the pane with a centred hole.
  skylights:     [],
  // Awnings: array of {face, x, w, depth, angle} — x and w in wall-local mm (0=left edge)
  awnings: [],
  // Rooftop billboards: array of {type:'single'|'square', face, x, w, height, postHeight}
  billboards: [],
  // Rooftop equipment shielding wall (Japanese kakoui / penthouse screen).
  // Always uses the X-braced structural design: 1.5 mm framed bays with
  // diagonal cross-bracing as the core, plus a separate 0.28 mm
  // louvered cladding layer that glues on top. `edges` is the per-side
  // enable map (Shield Wall tool toggles individual edges). `bounds`
  // overrides `offset` once the user drags the outline — stored in
  // iw-coords (inside-of-building plan frame). When null,
  // getShieldBounds() falls back to an offset-based inset rectangle.
  rooftopShield: { enabled: false, style: 'braced', height: 8, offset: 3,
                   braceThickness: 0.7,
                   bounds: null,
                   edges: { front: true, back: true, east: true, west: true } },
  // Truss system. When enabled, each block (main + each wing with its own
  // trusses object) emits N flat truss panels cut from core material plus
  // optional X-bracing strips cut from cladding. Style is picked from the
  // block's roofStyle:
  //   gabled  → Fink (W-pattern), pitch and span from the roof
  //   slanted → mono-pitch Pratt (one chord sloped, one horizontal)
  //   flat / parapet / parapet_gable → Pratt parallel-chord truss
  // `spacing` is the centre-to-centre distance between truss positions
  // along the spacing axis. `axis` chooses which way the trusses run
  // (their span direction); null = auto-pick (perpendicular to roof ridge
  // for gabled, perpendicular to the longer footprint dimension otherwise).
  // `chordW` is the visible width of each truss member on the laser sheet
  // (real-world scale is ~150 mm chord at 1:150 = 1 mm — too thin to cut
  // cleanly; the default 4 mm reads well at N-scale viewing distance).
  // `xBraceEnabled` toggles automatic crossed-diagonal wall braces on the
  // truss-bearing walls. `xBraceWalls` is kept only for old .hako compatibility.
  // `supports` is the toggle for the vertical column-support system.
  // `supportColumnType` chooses the cross-section: 'i' = back flange +
  // web + end cap (deeper I-beam), 't' = back flange + web only (shallower
  // T-beam). `supportDepth` is how far the web sticks out perpendicular
  // from the wall (mm), and `supportFlangeW` is the width of the wall-side
  // flange (and the end cap for I-beams) along the wall axis. Defaults at
  // 4 × 4 mm produce a column that reads as structural at N-scale viewing
  // without overpowering the surrounding wall etch detail.
  trusses: { enabled: false, spacing: 30, axis: null, chordW: 2,
             xBraceEnabled: false, xBraceW: 1.0, xBraceWalls: [],
             supports: false, supportColumnType: 'i', supportDepth: 4, supportFlangeW: 4 },
  // Multi-block wings. Each wing attaches to one face of the main block.
  // face: 'front'|'back'|'east'|'west' — which face of the main block it extends from
  // offset: mm from the "start" corner along that face (0 = flush)
  // span:   mm of the wing along the attachment face
  // depth:  mm the wing extends outward
  // height: wall height mm (null = same as main); connection: 'wall'|'open'
  wings: [],
  // Layout cut masks: non-destructive export crops drawn in the Shape Editor.
  // The full building remains visible for design context, but floor/roof sheet
  // geometry is clipped to the kept side of each cut at export/preview time.
  // Cut coords are in global top-down plan mm, same as the shape editor:
  // main block occupies x=0..width, y=0..depth; wings extend outside that box.
  // Line cut: {id,type:'line',x1,y1,x2,y2,keepSide:'left'|'right',solidBack?:boolean}
  // Arc cut:  {id,type:'arc', x1,y1,x2,y2,cx,cy,keepSide:'left'|'right'} where
  //           cx/cy is a quadratic Bezier control point.
  layoutCuts: [],
  // Named material definitions — each becomes a subfolder in the ZIP export.
  // 'id' matches part.material values; 'name' is the human-readable label/folder name.
  materials: [
    { id: 'core',     name: '1.5mm Plywood',          thickness: 1.5,  colour: '#c8b89a', maxWidthMm: 304.8, maxHeightMm: 304.8, sizeUnit: 'mm' },
    { id: 'cladding', name: '0.28mm Basswood',         thickness: 0.28, colour: '#9abcda', maxWidthMm: 304.8, maxHeightMm: 304.8, sizeUnit: 'mm' },
    { id: 'window',   name: '0.5mm Clear PVC',         thickness: 0.5,  colour: '#b8ddf0', maxWidthMm: 304.8, maxHeightMm: 304.8, sizeUnit: 'mm' },
    { id: 'backing',  name: '0.28mm Black Card',       thickness: 0.28, colour: '#444444', maxWidthMm: 304.8, maxHeightMm: 304.8, sizeUnit: 'mm' },
    { id: 'plaster',  name: '0.28mm Plaster Card',     thickness: 0.28, colour: '#e8e0d0', maxWidthMm: 304.8, maxHeightMm: 304.8, sizeUnit: 'mm' },
    { id: 'printed',  name: 'Printed Paper',           thickness: 0.20, colour: '#f1df72', maxWidthMm: 304.8, maxHeightMm: 304.8, sizeUnit: 'mm' },
  ],
  // Per-cladding-style material override: { claddingStyleKey → materials[].id }
  // Any key not listed here defaults to 'cladding'.
  claddingMaterials: {},
};

/* Fixture library post-load normalization.
 * Pipe penetration rings are a single washer-shaped flange. The inner circle is
 * the through-cut/waste opening through the flange, cladding, and core — not a
 * separate centre insert or second stack layer.
 */
if (typeof FIXTURE_STYLES !== 'undefined' && FIXTURE_STYLES.pipe_penetration_ring) {
  FIXTURE_STYLES.pipe_penetration_ring.description =
    'Single-layer through-wall pipe flange. The inner circle is the cut-out/waste hole through the flange, cladding, and core; there is no separate center insert to stack.';
  FIXTURE_STYLES.pipe_penetration_ring.depthTier = 'shallow';
  FIXTURE_STYLES.pipe_penetration_ring.pieces = [
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
  ];
}
