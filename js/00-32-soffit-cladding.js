'use strict';

/* =====================================================================
   SOFFIT CLADDING
   =====================================================================
   Flat cladding pieces sized to the underside of each eave overhang.
   When the roof projects past the walls, the BOTTOM face of that
   projection (the soffit) shows bare core material; this generator
   produces a cladding strip per eave side to cover it.

   Roof-style coverage:
     • flat_overhang: roof projects on all 4 sides. The soffit on each
       side is a horizontal strip — width = overhang amount on that
       side, length = wall dimension along that side. Up to 4 pieces.
     • gabled: roof projects on the EAVE sides only (FB sides under
       ridge-ew, EW sides under ridge-ns); the verge sides project
       too, but their "soffit" is just the underside of the tilted
       panel at the gable end — different geometry, deferred. The
       eave soffit is a strip in the PANEL plane, so its width is the
       overhang's SLOPE distance (ohEave / cos θ), not the horizontal
       projection. Length includes any verge extension so the soffit
       runs the full eave length.
     • flat / parapet / parapet_gable / slanted: no soffit (roof
       doesn't project past walls, or the slanted case isn't handled
       yet).

   The cladding pattern is etched on each strip using the same
   generator + line-mapping as the wall cladding so the soffit shows
   the same visible texture (panel seams, board lines, etc.) as the
   walls — the soffit reads as cladding, not as bare board.
*/
function generateSoffitCladding(cfg, plan) {
  if (!cfg.soffitCladding) return [];
  const styleKey  = cfg.claddingStyle;
  const styleSpec = CLADDING_STYLES[styleKey];
  const material  = (styleSpec && cfg.claddingMaterials && cfg.claddingMaterials[styleKey])
                  || 'cladding';

  const mkPiece = (id, label, w, h) => {
    let lines = [];
    if (styleSpec) {
      const segs = generateCladdingPattern(styleSpec, 0, 0, w, h, [], null);
      lines = segs.map(s => ({ type: 'etch', x1: s.x1, y1: s.y1, x2: s.x2, y2: s.y2 }));
    }
    return {
      id: 'cladding_soffit_' + id,
      name: label,
      material: material,
      bboxW: w, bboxH: h,
      bboxOffsetX: 0, bboxOffsetY: 0,
      paths: [{ type: 'cut', d: rectPath(0, 0, w, h) }],
      rects: [],
      lines: lines,
    };
  };

  const parts = [];

  if (cfg.roofStyle === 'flat_overhang') {
    // Both ohFB and ohEW are independent in flat_overhang. Each side
    // gets a strip of (wall_dim × overhang_amount). The corners
    // technically have two soffits overlapping — keep both strips at
    // wall_dim only (no corner extension) so the user can trim the
    // overlap themselves rather than the generator pre-deciding.
    const ohFB = cfg.roofOverhangFB || 0;
    const ohEW = cfg.roofOverhangEW || 0;
    if (ohFB > 0) {
      for (const face of ['front', 'back']) {
        parts.push(mkPiece(face, `${face[0].toUpperCase() + face.slice(1)} eave soffit cladding`,
                           cfg.width, ohFB));
      }
    }
    if (ohEW > 0) {
      for (const face of ['east', 'west']) {
        parts.push(mkPiece(face, `${face[0].toUpperCase() + face.slice(1)} eave soffit cladding`,
                           cfg.depth, ohEW));
      }
    }
    return parts;
  }

  if (cfg.roofStyle === 'gabled') {
    const pitch    = cfg.roofPitch || 10;
    const ridgeDir = cfg.roofRidgeDirection || 'ew';
    const ewRidge  = (ridgeDir === 'ew');
    const ohEave   = ewRidge ? (cfg.roofOverhangFB || 0) : (cfg.roofOverhangEW || 0);
    const ohVerge  = ewRidge ? (cfg.roofOverhangEW || 0) : (cfg.roofOverhangFB || 0);

    // halfSpan along the slope direction; slopeAngle θ is the panel's
    // tilt from horizontal. The eave overhang continues the panel
    // plane past the eave wall, so its underside is tilted too — the
    // soffit's actual extent along the panel is ohEave / cos θ.
    const halfSpan   = (ewRidge ? cfg.depth : cfg.width) / 2;
    const slopeAngle = Math.atan2(pitch, halfSpan);
    const ohEaveS    = ohEave / Math.cos(slopeAngle);
    const slantLen0  = Math.hypot(halfSpan, pitch);

    // Eave soffits: 2 pieces (one per eave wall). Length includes
    // verge extensions on each end so the corner regions (where the
    // eave overhang meets the verge overhang) are covered by the
    // eave strip — the verge strip stays clear of those corners to
    // avoid overlap.
    if (ohEave > 0) {
      const eaveLen   = (ewRidge ? cfg.width : cfg.depth) + 2 * ohVerge;
      const eaveFaces = ewRidge ? ['front', 'back'] : ['east', 'west'];
      for (const face of eaveFaces) {
        parts.push(mkPiece(face,
                           `${face[0].toUpperCase() + face.slice(1)} eave soffit cladding (slope distance)`,
                           eaveLen, ohEaveS));
      }
    }

    // Verge soffits: 4 pieces — one per (gable wall × slope panel)
    // combination, since each gable wall has the verge overhangs of
    // BOTH slope panels (the north and south panels for ridge ew),
    // and those two overhangs meet at the ridge with opposite tilts.
    // Each piece is a rectangle in its panel's plane: slantLen0 long
    // (ridge to eave wall, NOT including the eave-overhang extension —
    // that part is covered by the eave soffit's corner extension) by
    // ohVerge wide (horizontal projection past the gable wall, which
    // is parallel to the ridge so no slope conversion needed).
    // All four pieces are congruent rectangles, so they dedupe to a
    // single card × 4 in the parts panel.
    if (ohVerge > 0) {
      const vergeFaces = ewRidge ? ['east', 'west'] : ['front', 'back'];
      // Slope labels reflect which slope panel each piece glues to,
      // not the gable wall direction.
      const slopeLbls  = ewRidge ? ['south', 'north'] : ['west', 'east'];
      for (const face of vergeFaces) {
        for (const slope of slopeLbls) {
          parts.push(mkPiece(`${face}_${slope}`,
                             `${face[0].toUpperCase() + face.slice(1)} verge soffit cladding (${slope} slope)`,
                             slantLen0, ohVerge));
        }
      }
    }
    return parts;
  }

  if (cfg.roofStyle === 'slanted') {
    // Slanted (mono-pitch / shed) roof: one panel tilting from a HIGH
    // edge to a LOW edge. roofSlopeDirection picks which wall the
    // LOW edge sits over — 'front'/'back' for an N-S slope (slope
    // direction along depth), 'east'/'west' for an E-W slope (along
    // width).
    //
    // Overhang convention follows the gable mapping: roofOverhangFB
    // applies to front+back walls, roofOverhangEW to east+west, so
    // depending on slopeDirection one pair becomes the EAVE pair
    // (high+low along the slope) and the other becomes the SIDE pair
    // (perpendicular to the slope). The "side" walls have slanted
    // tops in 3D — overhangs there project horizontally past the
    // slanted wall edge.
    //
    // For slanted, BOTH the high and low ends of the slope direction
    // typically overhang by the same amount (whatever the user set
    // for ohFB or ohEW). The geometry of the high-side soffit and
    // the low-side soffit is identical in laser-flat form (same
    // dimensions); the difference is only in 3D orientation, which
    // doesn't matter for the cut piece. The two pieces dedupe to
    // one card × 2.
    const slopeDir   = cfg.roofSlopeDirection || 'back';
    const isFBSlope  = (slopeDir === 'front' || slopeDir === 'back');
    const ohEave     = isFBSlope ? (cfg.roofOverhangFB || 0) : (cfg.roofOverhangEW || 0);
    const ohSide     = isFBSlope ? (cfg.roofOverhangEW || 0) : (cfg.roofOverhangFB || 0);
    const pitch      = cfg.roofPitch || 10;
    const dimAlong   = isFBSlope ? cfg.depth : cfg.width;   // along slope direction
    const dimPerp    = isFBSlope ? cfg.width : cfg.depth;   // perpendicular to slope
    const slopeAngle = Math.atan2(pitch, dimAlong);
    const ohEaveS    = ohEave / Math.cos(slopeAngle);
    const slantLen0  = Math.hypot(dimAlong, pitch);

    // Eave-direction soffits (high + low ends of the slope): 2 pieces.
    // Length includes the side overhangs on each end so corners are
    // covered by the eave strips, mirroring the gabled convention.
    if (ohEave > 0) {
      const eaveLen   = dimPerp + 2 * ohSide;
      const eaveFaces = isFBSlope ? ['front', 'back'] : ['east', 'west'];
      for (const face of eaveFaces) {
        parts.push(mkPiece(face,
                           `${face[0].toUpperCase() + face.slice(1)} eave soffit cladding (slope distance)`,
                           eaveLen, ohEaveS));
      }
    }

    // Side-direction soffits (perpendicular to slope): 2 pieces.
    // Length = slantLen0 (ridge to eave in panel plane, no overhang
    // extension); width = ohSide (horizontal, no slope conversion
    // because the side overhang's edge is parallel to the slope
    // direction in the panel plane).
    if (ohSide > 0) {
      const sideFaces = isFBSlope ? ['east', 'west'] : ['front', 'back'];
      for (const face of sideFaces) {
        parts.push(mkPiece(face,
                           `${face[0].toUpperCase() + face.slice(1)} verge soffit cladding`,
                           slantLen0, ohSide));
      }
    }
    return parts;
  }

  return [];
}
