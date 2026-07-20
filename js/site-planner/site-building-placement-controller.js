export function createSiteBuildingPlacementController({
  state,
  canvas,
  getElement,
  uid,
  colors,
  slug,
  fmt,
  mmToPx,
  pxToMm,
  positiveNumber,
  deriveFootprintFromHakoConfig,
  applyHakoConfigToPlannerFootprint,
  githubRecordPlacementShape,
  githubPlacementPreviewPolygon,
  normalizeBuilding,
  syncBuildingMetrics,
  setBuildingSelection,
  syncAll,
  closeGithubModal,
  showStatusHint,
  draw,
}) {
  function visibleWorldCenter() {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: (bounds.width / 2 - state.view.x) / state.view.scale,
      y: (bounds.height / 2 - state.view.y) / state.view.scale,
    };
  }

  function selectedFootprintSizeMm(building) {
    if (!building) return null;
    syncBuildingMetrics(building);
    if (building.padType === 'rect') {
      const widthMm = positiveNumber(building.widthMm, state.pxPerMm ? pxToMm(building.widthPx) : null);
      const depthMm = positiveNumber(building.depthMm, state.pxPerMm ? pxToMm(building.depthPx) : null);
      return widthMm && depthMm ? { widthMm, depthMm, source: 'footprint' } : null;
    }
    const widthMm = positiveNumber(building.derived?.boundingWidthMm);
    const depthMm = positiveNumber(building.derived?.boundingDepthMm);
    return widthMm && depthMm ? { widthMm, depthMm, source: 'footprint bounds' } : null;
  }

  function footprintSizesMatch(currentSize, incomingSize) {
    if (!currentSize || !incomingSize) return false;
    const widthTolerance = Math.max(.5, Math.max(currentSize.widthMm, incomingSize.widthMm) * .01);
    const depthTolerance = Math.max(.5, Math.max(currentSize.depthMm, incomingSize.depthMm) * .01);
    return Math.abs(currentSize.widthMm - incomingSize.widthMm) <= widthTolerance
      && Math.abs(currentSize.depthMm - incomingSize.depthMm) <= depthTolerance;
  }

  function formatFootprintSize(size) {
    return size ? `${fmt(size.widthMm)} x ${fmt(size.depthMm)} mm` : 'unknown size';
  }

  function storeHakoFileOnBuilding(building, fileName, text, parsed, options = {}) {
    const derived = deriveFootprintFromHakoConfig(parsed || {});
    building.hakoConfig = structuredClone(parsed);
    building.hakoFile = {
      fileName: fileName || `${slug(building.name || 'building')}.hako`,
      mimeType: 'application/json',
      sizeBytes: text.length,
      importedAt: new Date().toISOString(),
      dataText: text,
      parsedConfig: structuredClone(parsed),
      source: options.source || 'selected-building-upload',
    };
    building.hakoFileId = building.hakoFile.fileName;
    if (derived?.trimLinesMm?.length) {
      building.hakoTrimLinesMm = derived.trimLinesMm;
      building.showHakoTrimLines = true;
    } else {
      delete building.hakoTrimLinesMm;
    }
    if (options.resizeFootprint) applyHakoConfigToPlannerFootprint(building, parsed);
    delete building.plannerHeightMm;
    if (building.state === 'notStarted') building.state = 'inProgress';
    normalizeBuilding(building);
    syncBuildingMetrics(building);
    syncAll();
    getElement('statusHint').textContent = `Attached ${building.hakoFile.fileName} to ${building.name || 'building'}${options.resizeFootprint ? ' and resized the footprint' : ''}.`;
  }

  function confirmSelectedHakoSizeMismatch(building, currentSize, incomingSize, fileName) {
    const currentText = formatFootprintSize(currentSize);
    const incomingText = formatFootprintSize(incomingSize);
    return confirm(`The dropped .hako file does not match the selected footprint size.\n\nSelected footprint: ${currentText}\nDropped building: ${incomingText}\n\nClick OK to upload "${fileName}" and resize the selected footprint to the .hako size.\nClick Cancel to discard the upload.`);
  }

  function createBuildingFromImportedHako(fileName, text, parsed) {
    const derived = deriveFootprintFromHakoConfig(parsed || {});
    if (!derived) {
      showStatusHint('Could not find a footprint, width/depth, or polygon in that .hako file.', 'warning');
      return null;
    }
    const center = visibleWorldCenter();
    const baseName = (parsed && (parsed.name || parsed.buildingName || parsed.title || parsed.projectName)) || (fileName || 'Imported Building').replace(/\.(hako|json)$/i, '');
    const building = {
      id: uid('bldg'),
      name: baseName,
      category: (parsed && (parsed.buildingType || parsed.type || parsed.category)) || 'imported',
      color: colors[state.buildings.length % colors.length],
      hidden: false,
      locked: false,
      state: 'complete',
      notes: `Imported from an existing .hako file${derived.source ? ` (${derived.source})` : ''}.`,
      hakoConfig: parsed || null,
      hakoFile: { fileName: fileName || `${slug(baseName)}.hako`, mimeType: 'application/json', sizeBytes: text.length, importedAt: new Date().toISOString(), dataText: text, parsedConfig: parsed || null },
      hakoFileId: fileName || `${slug(baseName)}.hako`,
    };
    if (derived.trimLinesMm?.length) {
      building.hakoTrimLinesMm = derived.trimLinesMm;
      building.showHakoTrimLines = true;
    }
    if (derived.padType === 'polygon' && derived.pointsMm) {
      const pointsMm = derived.pointsMm;
      const xs = pointsMm.map(point => point.x);
      const ys = pointsMm.map(point => point.y);
      const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
      const centerY = (Math.min(...ys) + Math.max(...ys)) / 2;
      building.hakoGeometryOriginMm = { x: centerX, y: centerY };
      building.padType = 'polygon';
      building.pointsPx = pointsMm.map(point => ({ x: center.x + mmToPx(point.x - centerX), y: center.y + mmToPx(point.y - centerY) }));
      building.rotationDeg = 0;
    } else {
      building.padType = 'rect';
      building.x = center.x;
      building.y = center.y;
      building.widthPx = mmToPx(derived.widthMm || 20);
      building.depthPx = mmToPx(derived.depthMm || 20);
      building.rotationDeg = 0;
      building.hakoGeometryOriginMm = { x: (derived.widthMm || 20) / 2, y: (derived.depthMm || 20) / 2 };
    }
    normalizeBuilding(building);
    syncBuildingMetrics(building);
    state.buildings.push(building);
    setBuildingSelection([building.id], building.id);
    syncAll();
    return building;
  }

  function armGithubBuildingPlacement(record) {
    const shape = githubRecordPlacementShape(record);
    if (!shape) {
      showStatusHint('This library record does not include enough footprint data to place it.', 'warning');
      return;
    }
    state.githubBuildingPlacement = {
      record: structuredClone(record),
      derived: shape.derived,
      cfg: shape.cfg,
      origin: shape.origin,
      previewPoint: visibleWorldCenter(),
    };
    state.tool = 'select';
    closeGithubModal();
    getElement('statusHint').textContent = `Click the site plan to place ${record?.name || record?.id || 'building footprint'}. Press Escape to cancel.`;
    draw();
  }

  function cancelGithubBuildingPlacement() {
    if (!state.githubBuildingPlacement) return false;
    state.githubBuildingPlacement = null;
    getElement('statusHint').textContent = 'Building placement canceled.';
    draw();
    return true;
  }

  function placeGithubBuildingAt(center) {
    const placement = state.githubBuildingPlacement;
    if (!placement) return false;
    const record = placement.record || {};
    const path = record.path || record.paths?.hako || '';
    const derived = placement.derived || {};
    const config = placement.cfg && Object.keys(placement.cfg).length ? structuredClone(placement.cfg) : null;
    const building = {
      id: uid('bldg'),
      name: record.name || record.id || 'Library Building',
      category: (record.tags && record.tags[0]) || record.category || config?.buildingType || 'library',
      color: colors[state.buildings.length % colors.length],
      hidden: false,
      locked: false,
      state: 'notStarted',
      notes: `Placed from GitHub building footprint library${path ? `: ${path}` : ''}.`,
      hakoConfig: config,
      hakoSeed: record.hakoSeed || config?.hakoSeed || null,
      hakoFile: null,
      hakoFileId: path || null,
      githubLibraryRecord: { id: record.id || null, path: path || null, placedAt: new Date().toISOString() },
    };
    if (derived.trimLinesMm?.length) {
      building.hakoTrimLinesMm = derived.trimLinesMm;
      building.showHakoTrimLines = true;
    }
    if (derived.padType === 'polygon' && Array.isArray(derived.pointsMm) && derived.pointsMm.length >= 3) {
      building.padType = 'polygon';
      building.pointsPx = githubPlacementPreviewPolygon(placement, center, mmToPx);
      building.rotationDeg = 0;
      building.hakoGeometryOriginMm = placement.origin;
    } else {
      building.padType = 'rect';
      building.x = center.x;
      building.y = center.y;
      building.widthPx = mmToPx(derived.widthMm || 20);
      building.depthPx = mmToPx(derived.depthMm || 20);
      building.rotationDeg = 0;
      building.hakoGeometryOriginMm = { x: (derived.widthMm || 20) / 2, y: (derived.depthMm || 20) / 2 };
    }
    normalizeBuilding(building);
    syncBuildingMetrics(building);
    state.buildings.push(building);
    setBuildingSelection([building.id], building.id);
    state.githubBuildingPlacement = null;
    syncAll();
    getElement('statusHint').textContent = `Placed ${building.name}.`;
    return true;
  }

  return {
    visibleWorldCenter,
    selectedFootprintSizeMm,
    footprintSizesMatch,
    storeHakoFileOnBuilding,
    confirmSelectedHakoSizeMismatch,
    createBuildingFromImportedHako,
    armGithubBuildingPlacement,
    cancelGithubBuildingPlacement,
    placeGithubBuildingAt,
  };
}
