'use strict';

/* =====================================================================
   RIDGE CAP
   =====================================================================
   A single narrow strip with an etched centre fold line, sized to cap
   the ROOF'S RIDGE — the line where the two slope panels meet at the
   apex of the roof's cross-section triangle. User folds along the
   etched centre line to match the dihedral angle of the roof (typically
   ~140° from flat for default pitch — i.e. open to the angle that
   leaves matT on each slope), then glues each half to the respective
   slope along the ridge seam.

   Length tracks the panel's `perpLen` (the along-ridge dimension):
     - parapet_gable: perpLen = building dim − 2·matT  (panel recessed
       inside the gable walls)
     - plain gabled:  perpLen = building dim + 2·ohVerge (panel extends
       past the gable walls by the verge overhang)
   Width is `2·matT` (1.5 mm + 1.5 mm at default thickness) so when
   folded each half lies matT-deep along its slope — matching the
   thickness of the slope panel's exposed edge it's hiding.
*/
function generateParapetCap(cfg, plan) {
  if (!cfg.parapetCap) return [];
  if (cfg.roofStyle !== 'parapet_gable' && cfg.roofStyle !== 'gabled') return [];

  const matT = cfg.coreThickness;
  const ridgeDir = (cfg.roofStyle === 'parapet_gable')
                   ? effectiveRidgeDir(cfg)
                   : (cfg.roofRidgeDirection || 'ew');
  const ewRidge = (ridgeDir === 'ew');

  let ridgeLen;
  if (cfg.roofStyle === 'parapet_gable') {
    ridgeLen = ewRidge ? (cfg.width - 2 * matT) : (cfg.depth - 2 * matT);
  } else {
    // Plain gabled: ridge extends with verge overhang. ohVerge depends
    // on ridge direction — overhangFB applies when slopes face F/B
    // (ridge ew), overhangEW when slopes face E/W (ridge ns).
    const ohVerge = ewRidge ? (cfg.roofOverhangEW || 0) : (cfg.roofOverhangFB || 0);
    ridgeLen = (ewRidge ? cfg.width : cfg.depth) + 2 * ohVerge;
  }

  const stripW = 2 * matT;
  const foldX  = matT;
  const gutter = 5;

  const rects = [{
    type: 'cut',
    x: gutter, y: gutter,
    w: stripW, h: ridgeLen,
    compensateKerf: false,
  }];
  const lines = [{
    type: 'etch',
    x1: gutter + foldX, y1: gutter,
    x2: gutter + foldX, y2: gutter + ridgeLen,
  }];

  return [createPart({
    id: 'ridge_cap',
    name: `Ridge cap — ${stripW.toFixed(1)} mm wide × ${ridgeLen.toFixed(1)} mm long`,
    material: 'cladding',
    bboxW: 2 * gutter + stripW,
    bboxH: 2 * gutter + ridgeLen,
    bboxOffsetX: 0, bboxOffsetY: 0,
    paths: [], rects, lines,
    meta: { area: 'roof', role: 'ridge_cap' },
    assemblyNote: `Score along the etched centre line and fold to match the roof's ridge angle (open to the dihedral of the two slopes — ~140° from flat for default pitch). Glue ${matT.toFixed(1)} mm of each half to the corresponding roof slope along the ridge seam, hiding the joint between the two panels.`
  })];
}
