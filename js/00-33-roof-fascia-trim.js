'use strict';

/* =====================================================================
   ROOF FASCIA TRIM
   =====================================================================
   3 mm-wide trim strips that follow the roof's perimeter, hiding the
   exposed core material at the panel edges (the rake, eave, and
   slanted-top edges). Each style of roof gets a different trim shape:

     • gabled — per gable wall, a CHEVRON-shaped polygon that outlines
       the V of the gable peak (the "triangle on each gable"). The
       chevron is a constant-width strip running along both rake
       slopes, with the inner edges truncated at the eave line so it
       doesn't extend below the wall body. Plus, per eave, a STRAIGHT
       strip that runs along the full eave (the "end cap" — caps the
       open bottom of the chevron and the panel's exposed eave edge).
     • slanted — per slanted-top wall, a PARALLELOGRAM polygon that
       follows the slanted top edge. The long sides are parallel and
       slanted at the slope angle; the short ends are VERTICAL ("flat
       end"), not perpendicular to the slope. This keeps the trim
       from tapering to a point at the wall corners, so the slant
       reads as a finished cap rather than a tapered cut.

   Trim width is hardcoded at 3 mm regardless of matT — the user
   asked for this dimension specifically. (The parapet cap, by
   contrast, uses 2·matT to fold over the wall thickness; fascia trim
   is a flat overlay, not a folded cap, so its width is independent.)
*/
function generateRoofFasciaTrim(cfg, plan) {
  if (!cfg.roofFasciaTrim) return [];
  const trimW = 3;

  // Build a part from a polygon's vertex list. The bbox dimensions
  // are the polygon's extent, used by the parts-panel layout.
  const mkPart = (id, label, poly, bboxW, bboxH) => {
    const d = poly.map((v, i) => `${i === 0 ? 'M' : 'L'} ${v[0]},${v[1]}`).join(' ') + ' Z';
    return {
      id: 'fascia_trim_' + id,
      name: label,
      material: 'cladding',
      bboxW: bboxW, bboxH: bboxH,
      bboxOffsetX: 0, bboxOffsetY: 0,
      paths: [{ type: 'cut', d: d }],
      rects: [],
      lines: [],
    };
  };

  const parts = [];

  if (cfg.roofStyle === 'gabled') {
    const pitch    = cfg.roofPitch || 10;
    const ridgeDir = cfg.roofRidgeDirection || 'ew';
    const ewRidge  = (ridgeDir === 'ew');

    // One connected V-shaped gable fascia per gable end. The previous fix
    // used two separate rake-strip paths, which avoided self-intersection but
    // left a visible split at the peak. This builds a single non-crossing
    // polygon around the roof-edge polyline: left eave → ridge → right eave,
    // then back along the underside offset. The underside offset has a
    // deliberate bevel/miter at the ridge so the V remains one piece without
    // producing the old bowtie geometry.
    const W        = ewRidge ? cfg.depth : cfg.width;
    const halfSpan = W / 2;

    function makeConnectedGableFasciaPart(face) {
      const leftEave  = { x: 0,        y: 0 };
      const ridge     = { x: halfSpan, y: pitch };
      const rightEave = { x: W,        y: 0 };

      function undersideOffset(a, b) {
        const dx = b.x - a.x, dy = b.y - a.y;
        const L = Math.max(0.001, Math.hypot(dx, dy));
        return { x: -dy / L * trimW, y: dx / L * trimW };
      }

      const offL = undersideOffset(leftEave, ridge);
      const offR = undersideOffset(ridge, rightEave);

      // Two points around the inside of the peak create a small mitered
      // notch/gusset rather than crossing the two underside offsets.
      const innerRidgeL = { x: ridge.x + offL.x, y: ridge.y + offL.y };
      const innerRidgeR = { x: ridge.x + offR.x, y: ridge.y + offR.y };
      const innerLeft   = { x: leftEave.x + offL.x,  y: leftEave.y + offL.y };
      const innerRight  = { x: rightEave.x + offR.x, y: rightEave.y + offR.y };

      const poly = [
        leftEave,
        ridge,
        rightEave,
        innerRight,
        innerRidgeR,
        innerRidgeL,
        innerLeft,
      ];

      const minX = Math.min(...poly.map(p => p.x));
      const minY = Math.min(...poly.map(p => p.y));
      const maxX = Math.max(...poly.map(p => p.x));
      const maxY = Math.max(...poly.map(p => p.y));
      const d = poly.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(p.x - minX).toFixed(3)},${(p.y - minY).toFixed(3)}`).join(' ') + ' Z';

      return {
        id: `fascia_trim_gable_${face}`,
        name: `${face[0].toUpperCase() + face.slice(1)} gable fascia trim (connected V)`,
        material: 'cladding',
        bboxW: maxX - minX,
        bboxH: maxY - minY,
        bboxOffsetX: 0,
        bboxOffsetY: 0,
        paths: [{ type: 'cut', d }],
        rects: [],
        lines: [],
        assemblyNote: 'One connected V-shaped fascia piece for the gable end. Glue along both sloped gable roof edges; the peak has a small mitered inner bevel to avoid self-crossing geometry.'
      };
    }

    const gableFaces = ewRidge ? ['east', 'west'] : ['front', 'back'];
    for (const face of gableFaces) parts.push(makeConnectedGableFasciaPart(face));

    // Mitered eave-cap strips — one per eave, running the full eave
    // length including verge overhangs. Both ends are cut on a miter so they
    // visually meet the connected V gable fascia at the lower corners rather
    // than reading as plain straight-ended strips.
    const ohVerge = ewRidge ? (cfg.roofOverhangEW || 0) : (cfg.roofOverhangFB || 0);
    const eaveLen = (ewRidge ? cfg.width : cfg.depth) + 2 * ohVerge;
    const eaveMiter = Math.min(Math.max(trimW * 0.9, 1), eaveLen / 4);
    const miteredEave = [
      [eaveMiter, 0],
      [eaveLen - eaveMiter, 0],
      [eaveLen, trimW],
      [0, trimW],
    ];
    const eaveFaces = ewRidge ? ['front', 'back'] : ['east', 'west'];
    for (const face of eaveFaces) {
      parts.push(mkPart(`straight_${face}`,
                        `${face[0].toUpperCase() + face.slice(1)} eave fascia trim (mitered end cap)`,
                        miteredEave, eaveLen, trimW));
    }
    return parts;
  }

  if (cfg.roofStyle === 'slanted') {
    const pitch     = cfg.roofPitch || 10;
    const slopeDir  = cfg.roofSlopeDirection || 'back';
    const isFBSlope = (slopeDir === 'front' || slopeDir === 'back');
    // dimAlong is the building dimension in the slope direction —
    // the wall's slanted top runs across this distance, with one
    // corner at y = pitch (high) and the other at y = 0 (low).
    const dimAlong  = isFBSlope ? cfg.depth : cfg.width;

    // Parallelogram polygon — 4 vertices.
    //   • Top edge: from (0, pitch + trimW) down to (dimAlong, trimW)
    //     — this is the wall's slanted top edge, shifted up by trimW
    //     in our normalized layout where y >= 0.
    //   • Bottom edge: parallel slanted, from (0, pitch) down to
    //     (dimAlong, 0) — offset by trimW vertically downward.
    //   • Left/right short ends: VERTICAL (constant x). Length trimW.
    //
    // The short ends are vertical (not perpendicular to the slope) so
    // the trim's ends look "flat" — they match the wall's vertical
    // edges at each corner instead of tapering to a point. The
    // perpendicular-to-slope thickness is trimW · cos θ (slightly
    // less than trimW for shallow slopes), but the vertical height
    // is exactly trimW so the trim reads as a clean horizontal band
    // when viewed from a distance.
    const parallelogram = [
      [0, pitch + trimW],   // top-left (high corner, top edge)
      [dimAlong, trimW],    // top-right (low corner, top edge)
      [dimAlong, 0],        // bottom-right (low corner, bottom edge)
      [0, pitch],           // bottom-left (high corner, bottom edge)
    ];
    const bboxW = dimAlong;
    const bboxH = pitch + trimW;

    const sideFaces = isFBSlope ? ['east', 'west'] : ['front', 'back'];
    for (const face of sideFaces) {
      parts.push(mkPart(`parallelogram_${face}`,
                        `${face[0].toUpperCase() + face.slice(1)} wall slant fascia trim (parallelogram)`,
                        parallelogram, bboxW, bboxH));
    }
    return parts;
  }

  return [];
}
