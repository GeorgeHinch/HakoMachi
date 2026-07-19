export function createSite3DBuildingConfigController({
  transformedRect,
  buildingCenter,
  site3DScale,
  positiveNumber,
  hasAttachedHakoFile,
  hakoFootprintRotationDeg,
}) {
  function site3DBuildingFootprintMm(b) {
    const pts = (b.padType === 'rect' ? transformedRect(b) : (b.pointsPx || []))
      .map(p => ({ x: site3DScale(p.x), y: site3DScale(p.y) }));
    return pts.length >= 3 ? pts : null;
  }

  function site3DBuildingCenterMm(b) {
    const c = buildingCenter(b);
    return { x: site3DScale(c.x), y: site3DScale(c.y) };
  }

  function site3DFloorCount(b, cfg) {
    const seed = b.hakoSeed || cfg?.hakoSeed || cfg?.sitePlannerSeed || cfg?.seed || null;
    const n = positiveNumber(b.floorCount, cfg?.floorCount, cfg?.floors, cfg?.levels, seed?.floorCount, seed?.floors, seed?.levels);
    return Math.max(1, Math.min(24, Math.round(n || 2)));
  }

  function site3DFloorHeightMm(b, cfg) {
    const seed = b.hakoSeed || cfg?.hakoSeed || cfg?.sitePlannerSeed || cfg?.seed || null;
    const v = positiveNumber(cfg?.floorHeight, cfg?.floorHeightMm, seed?.floorHeight, seed?.floorHeightMm);
    return Math.max(4, Math.min(40, v || 12));
  }

  function site3DBuildingHeightMm(b, cfg) {
    const byFloors = site3DFloorCount(b, cfg) * site3DFloorHeightMm(b, cfg);
    if (hasAttachedHakoFile(b)) {
      return positiveNumber(cfg?.height, cfg?.heightMm, cfg?.dimensions?.height, cfg?.dimensions?.heightMm, byFloors, b.heightMm, 24) || 24;
    }
    return positiveNumber(b.plannerHeightMm, b.heightMm, cfg?.height, cfg?.heightMm, cfg?.dimensions?.height, cfg?.dimensions?.heightMm, byFloors, 24) || 24;
  }

  function site3DBuildingElevationMm(b) {
    return positiveNumber(b.baseElevationMm, b.elevationMm, b.siteElevationMm, 0) || 0;
  }

  function site3DApplyPlannerDimensions(b, cfg) {
    const h = site3DBuildingHeightMm(b, cfg);
    if (h) cfg.height = h;
    if (b.padType === 'rect') {
      const w = positiveNumber(b.widthMm);
      const d = positiveNumber(b.depthMm);
      if (w) cfg.width = w;
      if (d) cfg.depth = d;
    }
    return cfg;
  }

  function site3DBuildingConfig(b) {
    const raw = b.hakoConfig || b.hakoFile?.parsedConfig || b.hakoSeed || null;
    if (!raw || typeof raw !== 'object') return null;
    const cfg = site3DNormalizeBuildingConfig(b, structuredClone(raw));
    return site3DApplyPlannerDimensions(b, cfg);
  }

  function site3DGeneratorBuildingConfig(b) {
    const raw = b.hakoConfig || b.hakoFile?.parsedConfig || null;
    if (!raw || typeof raw !== 'object') return null;
    const cfg = site3DNormalizeBuildingConfig(b, structuredClone(raw));
    return site3DApplyPlannerDimensions(b, cfg);
  }

  function site3DLongestFootprintEdgeAngleDeg(b) {
    const pts = site3DBuildingFootprintMm(b);
    if (!pts || pts.length < 2) return null;
    let bestLen = -1;
    let bestAngle = null;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const q = pts[(i + 1) % pts.length];
      const dx = q.x - p.x;
      const dy = q.y - p.y;
      const len = Math.hypot(dx, dy);
      if (len > bestLen) {
        bestLen = len;
        bestAngle = Math.atan2(dy, dx) * 180 / Math.PI;
      }
    }
    return bestAngle;
  }

  function site3DAlignAxisAngleDeg(angle, preferred) {
    let next = Number(angle);
    const target = Number(preferred);
    if (!Number.isFinite(next) || !Number.isFinite(target)) return next;
    while (next - target > 90) next -= 180;
    while (next - target <= -90) next += 180;
    return next;
  }

  function site3DExplicitModelRotationDeg(b, cfg) {
    const values = [
      b?.site3dModelRotationDeg,
      b?.hakoModelRotationDeg,
      b?.site3d?.modelRotationDeg,
      cfg?.site3dModelRotationDeg,
      cfg?.hakoModelRotationDeg,
      cfg?.site3d?.modelRotationDeg,
    ];
    for (const value of values) {
      const n = Number(value);
      if (Number.isFinite(n)) return n;
    }
    return null;
  }

  function site3DGeneratorModelBaseRotationDeg(b, cfg) {
    const explicit = site3DExplicitModelRotationDeg(b, cfg);
    if (Number.isFinite(explicit)) return explicit;
    const hakoFootprintAngle = hakoFootprintRotationDeg(b);
    if (b?.hakoConfig && b?.padType !== 'rect' && Number.isFinite(hakoFootprintAngle)) return hakoFootprintAngle;
    if (b?.padType === 'polygon') {
      const edgeAngle = site3DLongestFootprintEdgeAngleDeg(b);
      const modelW = positiveNumber(cfg?.width, cfg?.widthMm, cfg?.dimensions?.width, cfg?.dimensions?.widthMm);
      const modelD = positiveNumber(cfg?.depth, cfg?.depthMm, cfg?.dimensions?.depth, cfg?.dimensions?.depthMm);
      if (Number.isFinite(edgeAngle) && modelW && modelD) {
        return site3DAlignAxisAngleDeg(modelD > modelW * 1.05 ? edgeAngle + 90 : edgeAngle, 0);
      }
    }
    return 0;
  }

  function site3DGeneratorModelRotationY(b, cfg) {
    const plannerDeg = Number(b?.rotationDeg) || 0;
    const baseDeg = site3DGeneratorModelBaseRotationDeg(b, cfg);
    return -(plannerDeg + baseDeg) * Math.PI / 180;
  }

  function site3DGeneratorModelOriginOffset(b, cfg) {
    const origin = b?.hakoGeometryOriginMm;
    const w = positiveNumber(cfg?.width, cfg?.widthMm, cfg?.dimensions?.width, cfg?.dimensions?.widthMm);
    const d = positiveNumber(cfg?.depth, cfg?.depthMm, cfg?.dimensions?.depth, cfg?.dimensions?.depthMm);
    const ox = Number(origin?.x);
    const oy = Number(origin?.y);
    if (!w || !d || !Number.isFinite(ox) || !Number.isFinite(oy)) return null;
    return { x: ox - w / 2, z: oy - d / 2 };
  }

  function site3DTypeDefaults(type, fabricType) {
    const key = String(type || '').toLowerCase();
    const fabric = String(fabricType || '').toLowerCase();
    if (key.includes('house') || key.includes('residential') || fabric.includes('residential')) return { floorHeight: 9, roofStyle: 'gabled', windowDensity: 'normal', commercial: false, roofColor: 0x6f5d52 };
    if (key.includes('zakkyo') || key.includes('commercial') || key.includes('tenant') || fabric.includes('commercial') || fabric.includes('station')) return { floorHeight: 11, roofStyle: 'parapet', windowDensity: 'dense', commercial: true, roofColor: 0x565656 };
    if (key.includes('office') || key.includes('apartment') || key.includes('mixed')) return { floorHeight: 11, roofStyle: 'parapet', windowDensity: 'normal', commercial: false, roofColor: 0x5f6466 };
    if (key.includes('warehouse') || key.includes('workshop') || key.includes('industrial') || key.includes('service')) return { floorHeight: 13, roofStyle: 'parapet_gable', windowDensity: 'sparse', commercial: false, roofColor: 0x4f5558 };
    return { floorHeight: 12, roofStyle: 'parapet', windowDensity: 'normal', commercial: false, roofColor: 0x5f6466 };
  }

  function site3DNormalizeBuildingConfig(b, cfg) {
    const seed = (cfg?.kind === 'HakoSeed' || cfg?.source === 'HakoMachi Site Planner' || cfg?.footprint || cfg?.fabricHints) ? cfg : (b.hakoSeed || null);
    const fabricType = seed?.fabricHints?.fabricType || b.fabricType || b.fabricRegionId || '';
    const type = cfg.buildingType || seed?.buildingType || b.suggestedBuildingType || b.category || 'building';
    const defaults = site3DTypeDefaults(type, fabricType);
    cfg.buildingType = type;
    cfg.width = positiveNumber(cfg.width, cfg.widthMm, cfg.dimensions?.width, cfg.dimensions?.widthMm, seed?.width, seed?.widthMm, seed?.footprint?.width, seed?.footprint?.widthMm, b.widthMm) || 28;
    cfg.depth = positiveNumber(cfg.depth, cfg.depthMm, cfg.dimensions?.depth, cfg.dimensions?.depthMm, seed?.depth, seed?.depthMm, seed?.footprint?.depth, seed?.footprint?.depthMm, b.depthMm) || 24;
    cfg.floorCount = site3DFloorCount(b, { ...cfg, ...seed });
    cfg.floorHeight = positiveNumber(cfg.floorHeight, cfg.floorHeightMm, seed?.floorHeight, seed?.floorHeightMm, defaults.floorHeight) || defaults.floorHeight;
    cfg.height = positiveNumber(cfg.height, cfg.heightMm, seed?.height, seed?.heightMm, cfg.floorCount * cfg.floorHeight, b.heightMm, b.plannerHeightMm) || cfg.floorCount * cfg.floorHeight;
    cfg.roofStyle = cfg.roofStyle || cfg.roof?.style || seed?.roofStyle || defaults.roofStyle;
    cfg.windowDensity = cfg.windowDensity || cfg.windows?.density || seed?.windowDensity || defaults.windowDensity;
    cfg.windowStyle = cfg.windowStyle || cfg.windows?.style || seed?.windowStyle || (defaults.commercial ? 'storefront' : 'industrial_small');
    cfg.doorStyle = cfg.doorStyle || cfg.doors?.style || seed?.doorStyle || (defaults.commercial ? 'glass_storefront' : 'industrial_metal');
    cfg.commercialIntensity = positiveNumber(seed?.fabricHints?.commercialIntensity, cfg.commercialIntensity, defaults.commercial ? 0.8 : 0.2) || 0.2;
    cfg.signageIntensity = positiveNumber(seed?.fabricHints?.signageIntensity, cfg.signageIntensity, defaults.commercial ? 0.55 : 0.12) || 0.12;
    cfg.roofColor = cfg.roofColor || defaults.roofColor;
    return cfg;
  }

  return {
    site3DBuildingFootprintMm,
    site3DBuildingCenterMm,
    site3DFloorCount,
    site3DFloorHeightMm,
    site3DBuildingHeightMm,
    site3DBuildingElevationMm,
    site3DBuildingConfig,
    site3DGeneratorBuildingConfig,
    site3DGeneratorModelOriginOffset,
    site3DGeneratorModelRotationY,
    site3DNormalizeBuildingConfig,
  };
}
