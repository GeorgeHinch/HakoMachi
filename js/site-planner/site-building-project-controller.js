export function createSiteBuildingProjectController({
  state,
  buildingStates,
  extractHakoTrimLinesMm,
  uid,
  colors,
  mmToPx,
}) {
  function buildingStateLabel(value) {
    return buildingStates[value] || buildingStates.notStarted;
  }

  function normalizeBuilding(building) {
    if (!building) return building;
    if (!building.state) building.state = 'notStarted';
    if (building.state === 'todo' || building.state === 'planned' || building.state === 'new') building.state = 'notStarted';
    if (building.state === 'awaiting' || building.state === 'readyToBuild') building.state = 'awaitingConstruction';
    if (!buildingStates[building.state]) building.state = 'notStarted';
    if (!('hakoFile' in building)) building.hakoFile = null;
    if (building.hakoFile && !building.hakoFile.fileName && building.hakoFile.name) building.hakoFile.fileName = building.hakoFile.name;
    if (building.hakoFile && !building.hakoFile.importedAt) building.hakoFile.importedAt = new Date().toISOString();
    if (building.hakoFile) building.hakoFileId = building.hakoFile.path || building.hakoFile.fileName || building.hakoFileId || null;
    if (!Array.isArray(building.hakoTrimLinesMm) && building.hakoConfig) {
      const trim = extractHakoTrimLinesMm(building.hakoConfig);
      if (trim.length) {
        building.hakoTrimLinesMm = trim;
        building.showHakoTrimLines = true;
      }
    }
    return building;
  }

  function pointFromAny(raw) {
    if (!raw) return null;
    if (Array.isArray(raw) && raw.length >= 2) {
      const x = Number(raw[0]);
      const y = Number(raw[1]);
      return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
    }
    const x = Number(raw.x ?? raw.pxX ?? raw.xPx ?? raw.left);
    const y = Number(raw.y ?? raw.pxY ?? raw.yPx ?? raw.top);
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
    const xMm = Number(raw.xMm ?? raw.mmX ?? raw.modelX ?? raw.modelMmX);
    const yMm = Number(raw.yMm ?? raw.mmY ?? raw.modelY ?? raw.modelMmY);
    if (Number.isFinite(xMm) && Number.isFinite(yMm) && state.pxPerMm) return { x: mmToPx(xMm), y: mmToPx(yMm) };
    return null;
  }

  function pointsFromAny(raw) {
    if (!raw) return null;
    const candidates = [raw.pointsPx, raw.polygonPx, raw.polygon, raw.points, raw.footprint?.pointsPx, raw.footprint?.polygon, raw.footprint?.points, raw.hakoSeed?.footprint?.pointsPx, raw.hakoSeed?.footprint?.polygon, raw.hakoSeed?.footprint];
    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        const points = candidate.map(pointFromAny).filter(Boolean);
        if (points.length >= 3) return points;
      }
    }
    return null;
  }

  // Saved Site Planner building footprints are stored in image-pixel space.
  // Keep this separate from the .hako import point parser, which may read model-mm fields.
  function savedBuildingPointsPx(raw) {
    if (!raw) return null;
    const parsePxPoint = point => {
      if (!point) return null;
      if (Array.isArray(point) && point.length >= 2) {
        const x = Number(point[0]);
        const y = Number(point[1]);
        return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
      }
      const x = Number(point.x ?? point.pxX ?? point.xPx ?? point.left);
      const y = Number(point.y ?? point.pxY ?? point.yPx ?? point.top);
      return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
    };
    const pixelCandidates = [
      raw.pointsPx,
      raw.polygonPx,
      raw.footprint?.pointsPx,
      raw.footprint?.polygonPx,
      raw.hakoSeed?.footprint?.pointsPx,
      raw.hakoSeed?.footprint?.polygonPx,
    ];
    for (const candidate of pixelCandidates) {
      if (Array.isArray(candidate)) {
        const points = candidate.map(parsePxPoint).filter(Boolean);
        if (points.length >= 3) return points;
      }
    }
    const parseMmPoint = point => {
      if (!point || !state.pxPerMm) return null;
      if (Array.isArray(point) && point.length >= 2) {
        const x = Number(point[0]);
        const y = Number(point[1]);
        return Number.isFinite(x) && Number.isFinite(y) ? { x: mmToPx(x), y: mmToPx(y) } : null;
      }
      const x = Number(point.xMm ?? point.mmX ?? point.modelX ?? point.modelMmX ?? point.x);
      const y = Number(point.yMm ?? point.mmY ?? point.modelY ?? point.modelMmY ?? point.y);
      return Number.isFinite(x) && Number.isFinite(y) ? { x: mmToPx(x), y: mmToPx(y) } : null;
    };
    const millimeterCandidates = [
      raw.pointsMm,
      raw.polygonMm,
      raw.footprint?.pointsMm,
      raw.footprint?.polygonMm,
      raw.hakoSeed?.footprint?.pointsMm,
      raw.hakoSeed?.footprint?.polygonMm,
    ];
    for (const candidate of millimeterCandidates) {
      if (Array.isArray(candidate)) {
        const points = candidate.map(parseMmPoint).filter(Boolean);
        if (points.length >= 3) return points;
      }
    }
    return null;
  }

  function normalizeLoadedBuilding(raw, index = 0) {
    if (!raw || typeof raw !== 'object') return null;
    const building = { ...raw };
    building.id = building.id || building.buildingId || building.padId || uid('bldg');
    building.name = building.name || building.buildingName || building.label || `Building ${index + 1}`;
    building.category = building.category || 'industrial';
    building.color = building.color || colors[index % colors.length];
    building.hidden = !!building.hidden;
    building.locked = !!building.locked;
    building.rotationDeg = Number.isFinite(Number(building.rotationDeg)) ? Number(building.rotationDeg) : 0;
    building.state = building.state || building.buildingState || 'notStarted';
    building.notes = building.notes || '';
    if (!('hakoFile' in building)) building.hakoFile = building.completedHakoFile || building.hako || null;

    const points = savedBuildingPointsPx(raw);
    const wantsPolygon = building.padType === 'polygon' || raw.type === 'polygon' || raw.kind === 'BuildingPad' || !!points;
    if (wantsPolygon && points) {
      building.padType = 'polygon';
      building.pointsPx = points;
    } else {
      building.padType = 'rect';
      const centerX = Number(building.x ?? building.cx ?? building.centerX ?? raw.position?.x ?? raw.center?.x);
      const centerY = Number(building.y ?? building.cy ?? building.centerY ?? raw.position?.y ?? raw.center?.y);
      building.x = Number.isFinite(centerX) ? centerX : 0;
      building.y = Number.isFinite(centerY) ? centerY : 0;
      const widthPx = Number(building.widthPx ?? building.wPx ?? raw.sizePx?.w ?? raw.sizePx?.width);
      const depthPx = Number(building.depthPx ?? building.heightPx ?? building.hPx ?? raw.sizePx?.h ?? raw.sizePx?.height);
      const widthMm = Number(building.widthMm ?? raw.width ?? raw.w ?? raw.sizeMm?.w ?? raw.sizeMm?.width);
      const depthMm = Number(building.depthMm ?? raw.depth ?? raw.heightMm ?? raw.h ?? raw.sizeMm?.h ?? raw.sizeMm?.depth ?? raw.sizeMm?.height);
      building.widthPx = Number.isFinite(widthPx) ? widthPx : (Number.isFinite(widthMm) && state.pxPerMm ? mmToPx(widthMm) : Math.max(20, Number(building.widthPx) || 40));
      building.depthPx = Number.isFinite(depthPx) ? depthPx : (Number.isFinite(depthMm) && state.pxPerMm ? mmToPx(depthMm) : Math.max(20, Number(building.depthPx) || 40));
    }
    return normalizeBuilding(building);
  }

  function collectProjectBuildings(project) {
    const sources = [
      ['buildings', project?.buildings],
      ['buildingPads', project?.buildingPads],
      ['pads', project?.pads],
      ['lots', project?.lots],
      ['site.buildings', project?.site?.buildings],
      ['site.buildingPads', project?.site?.buildingPads],
    ];
    let source = 'none';
    let buildings = [];
    for (const [name, value] of sources) {
      if (Array.isArray(value) && value.length) {
        source = name;
        buildings = value;
        break;
      }
    }
    if (!buildings.length && Array.isArray(project?.fabricRegions)) {
      const nested = [];
      project.fabricRegions.forEach(region => {
        if (Array.isArray(region.buildingPads)) nested.push(...region.buildingPads.map(building => ({ ...building, fabricRegionId: building.fabricRegionId || region.id })));
        if (Array.isArray(region.pads)) nested.push(...region.pads.map(building => ({ ...building, fabricRegionId: building.fabricRegionId || region.id })));
      });
      if (nested.length) {
        source = 'fabricRegions.*.buildingPads';
        buildings = nested;
      }
    }
    return { source, buildings: buildings.map((building, index) => normalizeLoadedBuilding(building, index)).filter(Boolean) };
  }

  function projectShapeFields(project) {
    if (!project || typeof project !== 'object') return String(project ?? 'empty');
    return Object.keys(project).slice(0, 12).join(', ') || 'none';
  }

  function footprintLoadMessage(project, loadedCount, source) {
    if (loadedCount > 0) {
      if (source && source !== 'buildings') return `Loaded ${loadedCount} building footprint${loadedCount === 1 ? '' : 's'} from legacy field ${source}.`;
      return '';
    }
    if (Array.isArray(project?.buildings) && project.buildings.length === 0) {
      return 'Project loaded, but this saved file contains 0 building footprints. Its buildings array is empty, so there are no pads to restore.';
    }
    return `Project loaded, but no supported building footprint data was found. Fields found: ${projectShapeFields(project)}.`;
  }

  return { buildingStateLabel, normalizeBuilding, collectProjectBuildings, footprintLoadMessage };
}
