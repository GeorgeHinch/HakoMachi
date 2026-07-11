export function createFabricController(deps) {
  const {
    state,
    ctx,
    presets,
    getElement,
    escapeHtml,
    uid,
    colors,
    fmt,
    polygonCenter,
    pointInPoly,
    drawLabel,
    clearBuildingSelection,
    setBuildingSelection,
    syncBuildingMetrics,
    syncAll,
    renderList,
    renderRoads,
    renderStreetlights,
    renderSelected,
    updateHandoff,
    draw,
    showStatusHint = () => {},
  } = deps;

  function lcg(seed) {
    let s = (Number(seed) || 1) >>> 0;
    return function nextRandom() {
      s = (1664525 * s + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function rr(rng, a, b) {
    return a + (b - a) * rng();
  }

  function pick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)] || arr[0];
  }

  function fabricPreset() {
    return presets[state.fabricPreset] || presets.localMixedUseFabric;
  }

  function fabricValue(id, fallback) {
    const el = getElement(id);
    const value = el ? parseFloat(el.value) : NaN;
    return Number.isFinite(value) ? value : fallback;
  }

  function fabricRegionCenter(region) {
    return polygonCenter(region.polygon || []);
  }

  function normalizeFabricRegion(region) {
    region.id = region.id || uid('fabric');
    region.name = region.name || `Fabric Region ${state.fabricRegions.length + 1}`;
    region.fabricType = region.fabricType || state.fabricPreset || 'localMixedUseFabric';
    region.polygon = region.polygon || region.pointsPx || [];
    region.color = region.color || '#7c5f3f';
    region.seed = Number.isFinite(Number(region.seed)) ? Number(region.seed) : 101;
    region.density = Number.isFinite(Number(region.density)) ? Number(region.density) : 1;
    region.randomness = Number.isFinite(Number(region.randomness)) ? Number(region.randomness) : .45;
    region.averageFloorCount = Number.isFinite(Number(region.averageFloorCount)) ? Number(region.averageFloorCount) : 3;
    region.maxFloorCount = Number.isFinite(Number(region.maxFloorCount)) ? Number(region.maxFloorCount) : 6;
    region.generatedPadIds = Array.isArray(region.generatedPadIds) ? region.generatedPadIds : [];
    return region;
  }

  function selectedFabric() {
    return state.fabricRegions.find(region => region.id === state.selectedFabricId) || null;
  }

  function hitFabricRegion(point) {
    for (let i = state.fabricRegions.length - 1; i >= 0; i--) {
      const region = normalizeFabricRegion(state.fabricRegions[i]);
      if ((region.polygon || []).length >= 3 && pointInPoly(point, region.polygon)) return region;
    }
    return null;
  }

  function selectFabricRegion(region) {
    if (!region) return false;
    clearBuildingSelection();
    state.selectedRoadId = null;
    state.selectedRoadFeatureId = null;
    state.selectedTrackId = null;
    state.selectedBenchworkId = null;
    state.selectedStreetlightId = null;
    state.selectedAnnotationId = null;
    state.selectedFabricId = region.id;
    renderList();
    renderRoads();
    renderStreetlights();
    renderSelected();
    updateHandoff();
    draw();
    return true;
  }

  function deleteSelectedFabricRegion() {
    const id = state.selectedFabricId;
    if (!id) return false;
    state.fabricRegions = state.fabricRegions.filter(region => region.id !== id);
    state.buildings.forEach(building => {
      if (building.fabricRegionId !== id) return;
      delete building.fabricRegionId;
      if (building.hakoSeed?.styleHints?.fabricRegionId === id) delete building.hakoSeed.styleHints.fabricRegionId;
    });
    state.selectedFabricId = null;
    syncAll();
    return true;
  }

  function drawFabricRegion(region) {
    region = normalizeFabricRegion(region);
    if (!region.polygon.length) return;
    ctx.save();
    const selected = region.id === state.selectedFabricId || (state.selectedSiteObjects || []).some(sel => sel.type === 'fabric' && sel.id === region.id);
    ctx.lineWidth = (selected ? 3 : 2) / state.view.scale;
    ctx.strokeStyle = selected ? '#0f766e' : '#7c5f3f';
    ctx.fillStyle = 'rgba(124,95,63,.08)';
    ctx.setLineDash([7 / state.view.scale, 5 / state.view.scale]);
    ctx.beginPath();
    region.polygon.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    if (selected) {
      drawLabel(`${presets[region.fabricType]?.label || region.fabricType} · ${region.generatedPadIds?.length || 0} pads`, fabricRegionCenter(region));
    }
    ctx.restore();
  }

  function drawFabricDraft() {
    if (!state.fabricDraft.length) return;
    ctx.save();
    ctx.strokeStyle = '#7c5f3f';
    ctx.fillStyle = 'rgba(124,95,63,.12)';
    ctx.lineWidth = 3 / state.view.scale;
    ctx.setLineDash([8 / state.view.scale, 6 / state.view.scale]);
    ctx.beginPath();
    state.fabricDraft.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.stroke();
    if (state.fabricDraft.length >= 3) {
      ctx.closePath();
      ctx.fill();
    }
    ctx.setLineDash([]);
    state.fabricDraft.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4 / state.view.scale, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function finishFabricRegion() {
    if (state.fabricDraft.length < 3) return null;
    const region = normalizeFabricRegion({
      id: uid('fabric'),
      name: `Fabric Region ${state.fabricRegions.length + 1}`,
      fabricType: state.fabricPreset || 'localMixedUseFabric',
      polygon: state.fabricDraft.slice(),
      density: fabricValue('fabricDensity', 1),
      randomness: fabricValue('fabricRandomness', .45),
      averageFloorCount: fabricValue('fabricAvgFloors', 3),
      maxFloorCount: fabricValue('fabricMaxFloors', 6),
      seed: fabricValue('fabricSeed', 101),
      generatedPadIds: [],
    });
    state.fabricRegions.push(region);
    clearBuildingSelection();
    state.selectedRoadId = null;
    state.selectedRoadFeatureId = null;
    state.selectedBenchworkId = null;
    state.selectedStreetlightId = null;
    state.selectedAnnotationId = null;
    state.selectedFabricId = region.id;
    state.fabricDraft = [];
    syncAll();
    return region;
  }

  function rectInsidePoly(cx, cy, width, height, poly) {
    const corners = [
      { x: cx - width / 2, y: cy - height / 2 },
      { x: cx + width / 2, y: cy - height / 2 },
      { x: cx + width / 2, y: cy + height / 2 },
      { x: cx - width / 2, y: cy + height / 2 },
    ];
    return corners.every(point => pointInPoly(point, poly));
  }

  function fabricLotRole(cx, cy, bb, index) {
    const edge = Math.min(cx - bb.minX, bb.maxX - cx, cy - bb.minY, bb.maxY - cy);
    const corner = (cx - bb.minX < 30 || bb.maxX - cx < 30) && (cy - bb.minY < 30 || bb.maxY - cy < 30);
    if (corner) return 'corner';
    if (edge < 35) return index % 3 === 0 ? 'sideStreet' : 'mainStreet';
    return index % 4 === 0 ? 'alley' : 'interior';
  }

  function fabricFrontageType(role) {
    return role === 'alley' || role === 'interior' ? 'alleyFrontage' : (role === 'corner' ? 'mainStreetFrontage' : 'mainStreetFrontage');
  }

  function makeFabricHakoSeed(building, region, preset, role, buildingType, floorCount) {
    syncBuildingMetrics(building);
    return {
      schemaVersion: 1,
      source: 'HakoMachi Site Planner',
      kind: 'HakoSeed',
      name: building.name,
      footprint: { type: 'rect', widthMm: building.widthMm || 0, depthMm: building.depthMm || 0, rotationDeg: building.rotationDeg || 0 },
      floorCount,
      materialProfileId: 'defaultChipboard',
      buildingType,
      fabricHints: {
        fabricType: region.fabricType,
        lotRole: role,
        frontageType: fabricFrontageType(role),
        signageIntensity: preset.signage,
        commercialIntensity: preset.commercial,
        ageWeathering: 0.45,
        detailIntensity: preset.detail,
      },
      styleHints: { generatedBy: 'urbanFabricFill', fabricRegionId: region.id, density: region.density, randomness: region.randomness },
    };
  }

  function generatedPadsForRegion(region) {
    if (!region) return [];
    const ids = new Set(region.generatedPadIds || []);
    return state.buildings.filter(building => building.fabricRegionId === region.id || ids.has(building.id));
  }

  function removeGeneratedPadsForRegion(region) {
    if (!region) return;
    const removeIds = new Set(generatedPadsForRegion(region).map(building => building.id));
    if (!removeIds.size) return;
    state.buildings = state.buildings.filter(building => !removeIds.has(building.id));
    region.generatedPadIds = [];
  }

  function generateFabricForRegion(region, opts = {}) {
    if (!region) { showStatusHint('Draw or select a Fabric Fill region first.', 'warning'); return; }
    region = normalizeFabricRegion(region);
    const rng = lcg(region.seed);
    const poly = region.polygon;
    if (!Array.isArray(poly) || poly.length < 3) { showStatusHint('Fabric region needs at least three points.', 'warning'); return; }
    const existing = generatedPadsForRegion(region);
    if (existing.length) {
      const ok = !opts.confirmReplace || confirm(`Replace ${existing.length} generated pad${existing.length === 1 ? '' : 's'} for this fabric region?`);
      if (!ok) return;
    }
    const preset = presets[region.fabricType] || fabricPreset();
    const xs = poly.map(point => point.x), ys = poly.map(point => point.y);
    const bb = { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
    const scale = state.pxPerMm || 1;
    const wRange = preset.lotW.map(value => value * scale), dRange = preset.depth.map(value => value * scale);
    const created = [];
    let y = bb.minY;
    let index = 0;
    while (y < bb.maxY && index < 600) {
      const rowDepth = rr(rng, dRange[0], dRange[1]) * (1 + (rng() - .5) * region.randomness * .5);
      let x = bb.minX;
      while (x < bb.maxX && index < 600) {
        const lotW = rr(rng, wRange[0], wRange[1]) * (1 + (rng() - .5) * region.randomness * .7) / Math.max(.35, region.density);
        const gap = (preset === presets.industrialServiceFabric ? rr(rng, 1, 4) : rr(rng, 0, 1.2)) * scale;
        const cx = x + lotW / 2, cy = y + rowDepth / 2;
        if (rectInsidePoly(cx, cy, Math.max(4, lotW - gap), Math.max(4, rowDepth - gap), poly)) {
          const role = fabricLotRole(cx, cy, bb, index);
          const type = pick(rng, preset.types);
          const floorBase = pick(rng, preset.floors);
          const floorCount = Math.max(1, Math.min(region.maxFloorCount, Math.round((floorBase + region.averageFloorCount) / 2 + (rng() - .5) * region.randomness * 3)));
          const building = {
            id: uid('bldg'),
            name: `${preset.label} ${created.length + 1}`,
            padType: 'rect',
            x: cx,
            y: cy,
            widthPx: Math.max(4, lotW - gap),
            depthPx: Math.max(4, rowDepth - gap),
            rotationDeg: 0,
            category: type,
            color: colors[(state.buildings.length + created.length) % colors.length],
            hidden: false,
            locked: false,
            state: 'notStarted',
            notes: `Generated from ${preset.label}. Role: ${role}.`,
            fabricRegionId: region.id,
            lotRole: role,
            frontageType: fabricFrontageType(role),
            suggestedBuildingType: type,
            floorCount,
            detailIntensity: preset.detail,
            hakoConfig: null,
            hakoFile: null,
            hakoFileId: null,
          };
          syncBuildingMetrics(building);
          building.hakoSeed = makeFabricHakoSeed(building, region, preset, role, type, floorCount);
          created.push(building);
        }
        x += lotW;
        index++;
      }
      y += rowDepth;
    }
    if (!created.length) { showStatusHint('No pads fit inside this region. Try a larger region, higher density, or smaller scale.', 'warning'); return; }
    if (existing.length) removeGeneratedPadsForRegion(region);
    state.buildings.push(...created);
    region.generatedPadIds = created.map(building => building.id);
    setBuildingSelection(created.map(building => building.id), created.length === 1 ? created[0].id : null);
    syncAll();
  }

  function generateFabricFromDraft() {
    let region = state.selectedFabricId ? state.fabricRegions.find(item => item.id === state.selectedFabricId) : null;
    if (state.fabricDraft.length >= 3) region = finishFabricRegion();
    if (!region) { showStatusHint('Draw a Fabric Fill region first.', 'warning'); return; }
    region = normalizeFabricRegion(region);
    region.density = fabricValue('fabricDensity', region.density);
    region.randomness = fabricValue('fabricRandomness', region.randomness);
    region.averageFloorCount = fabricValue('fabricAvgFloors', region.averageFloorCount);
    region.maxFloorCount = fabricValue('fabricMaxFloors', region.maxFloorCount);
    region.seed = fabricValue('fabricSeed', region.seed);
    generateFabricForRegion(region, { confirmReplace: true });
  }

  function initFabricControls() {
    const sel = getElement('fabricPreset');
    if (sel && !sel.options.length) {
      sel.innerHTML = Object.entries(presets).map(([key, preset]) => `<option value="${key}">${escapeHtml(preset.label)}</option>`).join('');
      sel.value = state.fabricPreset || 'localMixedUseFabric';
      sel.onchange = () => { state.fabricPreset = sel.value; };
    }
    const bind = (id, fn) => {
      const el = getElement(id);
      if (el && !el.dataset.fabricBound) {
        el.dataset.fabricBound = '1';
        el.oninput = () => fn(el.value);
      }
    };
    bind('fabricPreset', value => { state.fabricPreset = value; });
    const gen = getElement('generateFabricBtn');
    if (gen && !gen.dataset.fabricBound) {
      gen.dataset.fabricBound = '1';
      gen.onclick = () => { generateFabricFromDraft(); };
    }
    const clear = getElement('clearFabricDraftBtn');
    if (clear && !clear.dataset.fabricBound) {
      clear.dataset.fabricBound = '1';
      clear.onclick = () => { state.fabricDraft = []; draw(); };
    }
  }

  return {
    initFabricControls,
    normalizeFabricRegion,
    selectedFabric,
    hitFabricRegion,
    selectFabricRegion,
    deleteSelectedFabricRegion,
    drawFabricRegion,
    drawFabricDraft,
    finishFabricRegion,
    generateFabricForRegion,
    generateFabricFromDraft,
  };
}
