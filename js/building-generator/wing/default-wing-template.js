/* ---- Default wing template ---- */
export function newWing(face, mainW, mainD) {
  const alongFace = (face === 'east' || face === 'west') ? mainD : mainW;
  const span = Math.round(Math.min(alongFace, Math.max(20, alongFace * 0.6)));
  const offset = Math.round((alongFace - span) / 2);
  return {
    id: 'w' + Date.now(),
    face,
    offset,
    span,
    depth: 40,
    floors: 1,
    connection: 'wall',
    windowDensity: null,
    claddingStyle: null,
    // Roof overrides — null means "inherit from main building"
    roofStyle: null,
    parapetHeight: null,
    roofPitch: null,
    roofRidgeDirection: null,
    roofSlopeDirection: null,
    frontDoorCount: 0,
    backDoorCount: 0,
    sideDoorCount: 0,
    doorStyle: null,
    manualOpenings: { front: null, back: null, east: null, west: null },
  };
}

/* ---- Wing height (with optional explicit override) ----
   By default a wing inherits the main building's first-floor and standard
   floor heights, and its total height is computed from its floor count.
   This keeps the floors aligned with the main block — essential for the
   'open' connection mode where the wing and main interiors share floor
   bands.

   If wing.height is set to a positive number, that value is used directly
   as the wing's total height instead. This breaks floor alignment with
   the main building, so it's intended for 'wall' connections (where the
   wing is sealed off from the main interior) — used for things like a
   shorter mechanical penthouse, a taller atrium wing, or any wing where
   the main building's floor rhythm doesn't fit visually. buildWingCfg
   scales the wing's per-floor heights proportionally so its own floor
   bands still divide the override evenly. */
export function wingHeight(cfg, wing) {
  if (wing.height && wing.height > 0) return wing.height;
  const floorH = (cfg.floorHeight && cfg.floorHeight > 0) ? cfg.floorHeight : 30;
  const firstH = (cfg.firstFloorHeightEnabled && cfg.firstFloorHeight && cfg.firstFloorHeight > 0)
    ? cfg.firstFloorHeight
    : floorH;
  const fcount = (wing.floors && wing.floors > 0) ? wing.floors : 1;
  return firstH + (fcount - 1) * floorH;
}

/* ---- Build a per-wing cfg by overriding main cfg dimensions ---- */
export function buildWingCfg(cfg, wing) {
  const h = wingHeight(cfg, wing);
  const fcount = (wing.floors && wing.floors > 0) ? wing.floors : 1;
  // For any face attachment:
  //   "width" in buildEdgePlans = the wing's front/back wall dimension = wing.span
  //   "depth" in buildEdgePlans = the wing's side wall dimension     = wing.depth
  // Roof overrides: each may be null (inherit from main cfg) or a wing-specific value.

  // Floor heights: by default a wing inherits the main's per-floor and
  // first-floor heights so its floor bands align with the main's (open
  // connections rely on this). When wing.height is set as an explicit
  // override, the wing's TOTAL height no longer matches what the main's
  // floor heights would produce — so we scale the wing's own floor heights
  // proportionally to keep its band-count = floor-count math consistent.
  // The first-floor-taller proportion (if main has it enabled) is preserved
  // through the scale. Open connections to a height-overridden wing will
  // look misaligned at floor levels — by design; the wall-connection mode
  // is the intended use for overrides.
  const mainFloorH = (cfg.floorHeight && cfg.floorHeight > 0) ? cfg.floorHeight : 30;
  const mainFirstH = (cfg.firstFloorHeightEnabled && cfg.firstFloorHeight && cfg.firstFloorHeight > 0)
    ? cfg.firstFloorHeight
    : mainFloorH;
  const inheritedTotal = mainFirstH + (fcount - 1) * mainFloorH;
  const overrideActive = !!(wing.height && wing.height > 0
                            && Math.abs(wing.height - inheritedTotal) > 0.01);
  const scale = overrideActive ? (h / inheritedTotal) : 1;
  const wingFloorH = mainFloorH * scale;
  const wingFirstH = mainFirstH * scale;
  const mainConnectionWallHeight = (() => {
    try {
      const mp = buildEdgePlans(cfg);
      return Math.max(0, Number(mp && mp.H) || Number(cfg.height) || 0);
    } catch (e) {
      return Math.max(0, Number(cfg.height) || 0);
    }
  })();

  return Object.assign({}, cfg, {
    width:  wing.span,
    depth:  wing.depth,
    height: h,
    floors:     fcount,
    floorCount: fcount,    // buildEdgePlans reads floorCount, not floors
    // Override floor heights only when wing.height is an explicit override;
    // otherwise inherit cfg's via Object.assign (no override = identity).
    ...(overrideActive ? {
      floorHeight: wingFloorH,
      firstFloorHeight: wingFirstH,
      firstFloorHeightEnabled: true,
    } : {}),
    claddingStyle: wing.claddingStyle || cfg.claddingStyle,
    // Wing-specific roof cladding style. Falls back to main's
    // roofCladdingStyle when blank (= "inherit"), and that in turn falls
    // back to claddingStyle at the point of use (see generateRoof's
    // `cfg.roofCladdingStyle || cfg.claddingStyle` pattern). Without this
    // override, every wing inherited the main's roof cladding via the
    // base `...cfg` spread, with no way to set a different one even
    // through hand-edited .hako files.
    roofCladdingStyle: wing.roofCladdingStyle || cfg.roofCladdingStyle,
    // Wing-specific interior cladding: enable/disable per-wing, and an
    // optional style override (null = follow main's interiorCladdingStyle
    // → which itself falls back to claddingStyle in the generator). Both
    // values fall back to main when the wing hasn't set them, mirroring
    // the roof-cladding-style pattern above.
    interiorCladding:      (wing.interiorCladding      != null) ? wing.interiorCladding      : cfg.interiorCladding,
    interiorCladdingStyle: (wing.interiorCladdingStyle != null) ? wing.interiorCladdingStyle : cfg.interiorCladdingStyle,
    windowDensity: wing.windowDensity || cfg.windowDensity,
    roofStyle:          wing.roofStyle          || cfg.roofStyle,
    parapetHeight:      (wing.parapetHeight     != null) ? wing.parapetHeight     : cfg.parapetHeight,
    roofPitch:          (wing.roofPitch         != null) ? wing.roofPitch         : cfg.roofPitch,
    roofRidgeDirection: wing.roofRidgeDirection || cfg.roofRidgeDirection,
    roofSlopeDirection: wing.roofSlopeDirection || cfg.roofSlopeDirection,
    frontDoorCount: wing.frontDoorCount || 0,
    backDoorCount:  wing.backDoorCount  || 0,
    sideDoorCount:  wing.sideDoorCount  || 0,
    doorStyle: wing.doorStyle || cfg.doorStyle,
    // Per-wing wall features live only in the current wallFeatures store.
    // Legacy manual* buckets are converted once during import/load and then
    // stripped so main-building placements cannot leak into wings.
    wallFeatures:            wing.wallFeatures            || { front: null, back: null, east: null, west: null },

    // Wing generation omits the connection-face core wall and tabs the wing's
    // side walls directly into the main wall. Side-wall panel length therefore
    // loses only the far/outer wall thickness, not both front+back wall
    // thicknesses. generateSideWall reads this to add one material thickness
    // back to the side-wall run.
    _omitConnectionWall: true,
    // Side-wall cladding on a wing starts at the main-wall connection seam.
    // The main wall already carries exterior cladding at that seam, so the
    // wing's side cladding needs a small connection-end relief equal to the
    // MAIN cladding thickness. Store the root values on the derived wing cfg
    // so generateCladdingPanel can trim only the contact strip without shifting
    // windows/doors/etched detail along the rest of the panel.
    _connectionMainCladdingThickness: Math.max(0, Number(cfg.claddingThickness) || 0),
    _connectionMainWallHeight: mainConnectionWallHeight,
    // Per-wing truss settings. Defaults to disabled for each wing so the
    // user can opt in independently. Without this override, Object.assign
    // would carry main's `trusses` block into every wing, surprising users
    // who enabled trusses on main with auto-generated trusses on each
    // wing too (the wing's span+depth dimensions may not produce sensible
    // truss geometry without their own tuning). null = disabled inherit;
    // an explicit object on the wing fully overrides.
    trusses: wing.trusses || { enabled: false, spacing: 30, axis: null, chordW: 2,
                                xBraceEnabled: false, xBraceW: 1.0, xBraceWalls: [],
                                supports: false, supportColumnType: 'i', supportDepth: 4, supportFlangeW: 4 },
    // Per-wing rooftop / floor / skylight / roof-hole collections. Same
    // bug class as the wall manualOpenings leakage: without these
    // overrides, Object.assign carries the MAIN's skylights/rooftopItems
    // at MAIN-frame coordinates into the wing's cfg, where the wing's
    // roof generator interprets them at wing-local coords — landing
    // nonsensically or extending past the wing footprint. The wing now
    // carries its own arrays (populated via the IW editor in wing mode),
    // and main's placements stay on main.
    skylights:    wing.skylights    || [],
    roofHoles:    wing.roofHoles    || [],
    floorHoles:   wing.floorHoles   || [],
    // Embedded rail zones are floor-local. Do NOT inherit the main building's
    // embeddedRails into wing cfgs: the 3D preview and wing wall generators
    // interpret any inherited zones in wing-local coordinates, which creates
    // phantom bay openings in wing walls. A wing only gets rail zones that were
    // explicitly placed while editing that wing's floor.
    embeddedRails: wing.embeddedRails || [],
    rooftopItems: wing.rooftopItems || [],
    wings: [],           // wings don't nest in V1
  });
}

/* Returns which wall face of the wing IS the connection to the main block.
   In the wing's local building coordinate system (width=span along face, depth=outward),
   y=0 is always the connection face, so the 'front' wall is always the connection. */
