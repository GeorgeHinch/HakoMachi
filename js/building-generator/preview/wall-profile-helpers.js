export function isPreviewGabledRoofStyle(roofStyle) {
  return roofStyle === 'gabled' || roofStyle === 'parapet_gable';
}

export function getPreviewEffectiveRidgeDir(cfg) {
  if ((cfg?.roofStyle || '') === 'parapet_gable') {
    const sides = cfg.parapetSides || 'all';
    if (sides === 'fb') return 'ns';
    if (sides === 'ew') return 'ew';
  }
  return cfg?.roofRidgeDirection || 'ew';
}

export function get3DWallProfileForFace(cfg, plan, face) {
  const H = plan.H;
  const roofStyle = cfg.roofStyle || 'parapet';
  const isFrontBack = (face === 'front' || face === 'back');
  const isSide = (face === 'east' || face === 'west');

  const isGabled = isPreviewGabledRoofStyle(roofStyle);
  const isSlanted = roofStyle === 'slanted';
  const ewRidge = getPreviewEffectiveRidgeDir(cfg) === 'ew';
  const pitch = cfg.roofPitch || 10;
  const slopeDir = cfg.roofSlopeDirection || 'back';
  const sltNsAxis = (slopeDir === 'back' || slopeDir === 'front');

  let wallH = H;
  let gablePitch = 0;
  let slantPitch = 0;

  if (isGabled) {
    if (isFrontBack && !ewRidge) gablePitch = pitch;
    if (isSide && ewRidge) gablePitch = pitch;
  }

  if (isSlanted) {
    if (isFrontBack) {
      if (sltNsAxis) {
        if ((face === 'front' && slopeDir === 'front') ||
            (face === 'back' && slopeDir === 'back')) {
          wallH = H + pitch;
        }
      } else {
        slantPitch = (slopeDir === 'east') ? +pitch : -pitch;
      }
    } else if (isSide) {
      if (!sltNsAxis) {
        if ((face === 'east' && slopeDir === 'east') ||
            (face === 'west' && slopeDir === 'west')) {
          wallH = H + pitch;
        }
      } else {
        if (face === 'east') slantPitch = (slopeDir === 'back') ? -pitch : +pitch;
        if (face === 'west') slantPitch = (slopeDir === 'back') ? +pitch : -pitch;
      }
    }
  }

  return {
    wallH,
    baseH: H,
    gablePitch,
    slantPitch,
    texH: wallH + gablePitch + Math.abs(slantPitch),
  };
}
