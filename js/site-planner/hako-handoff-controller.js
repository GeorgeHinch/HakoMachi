function clone(value) {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

import { createHakoMachiLogger } from '../shared/hakomachi-diagnostics.js';

const logger = createHakoMachiLogger('Site Planner');

export function createHakoHandoffController({
  state,
  autosaveKey,
  buildingUpdateKey,
  getElement,
  selected,
  normalizeBuilding,
  syncBuildingMetrics,
  deriveFootprintFromHakoConfig,
  buildingCenter,
  mmToPx,
  rad,
  slug,
  setBuildingSelection,
  syncAll,
  statusHintElement = () => null,
  confirmBuildingResize = null,
  windowRef = window,
  localStorageRef = localStorage,
  sessionStorageRef = sessionStorage,
  navigatorRef = navigator,
  promptFn = prompt,
  showStatusHint = () => {},
}) {
  function plannerHandoffForBuilding(b) {
    return {
      schema: 'hakomachi.building-handoff',
      schemaVersion: 1,
      mode: 'planner-to-generator',
      sitePlan: {
        name: state.projectName || 'hakomachi-site',
        autosaveKey,
      },
      building: {
        plannerId: b.id,
        name: b.name || null,
        rotationDeg: Number(b.rotationDeg) || 0,
        hakoFileId: b.hakoFileId || null,
        placementLocked: true,
      },
      openedAt: new Date().toISOString(),
    };
  }

  function attachPlannerHandoff(seed, b) {
    const handoff = plannerHandoffForBuilding(b);
    seed.sitePlannerHandoff = handoff;
    seed.hakomachiHandoff = handoff;
    seed.linkedHakoConfig = b.hakoConfig || b.hakoFile?.parsedConfig || null;
    return seed;
  }

  function makeAttachedHakoSeed(b) {
    const storedConfig = b.hakoFile?.parsedConfig || b.hakoConfig || null;
    if (!storedConfig || typeof storedConfig !== 'object') return null;
    const seed = clone(storedConfig);
    const handoff = plannerHandoffForBuilding(b);
    seed.sitePlannerHandoff = handoff;
    seed.hakomachiHandoff = handoff;
    seed.sitePlanSeedSource = {
      generator: 'HakoMachi Site Planner',
      sourceId: b.id,
      sourceMode: 'attached-hako-file',
      hakoFileId: b.hakoFileId || b.hakoFile?.fileName || null,
      sourceFileName: b.hakoFile?.fileName || null,
    };
    seed.buildingId = b.id;
    seed.hakoFileId = b.hakoFileId || b.hakoFile?.fileName || null;
    if (b.name && !seed.buildingName) seed.buildingName = b.name;
    return seed;
  }

  function makeSeed(b) {
    normalizeBuilding(b);
    syncBuildingMetrics(b);
    const attachedSeed = makeAttachedHakoSeed(b);
    if (attachedSeed) return attachedSeed;
    if (b.hakoSeed) {
      const seed = clone(b.hakoSeed);
      seed.buildingId = b.id;
      seed.name = b.name;
      seed.state = b.state || 'notStarted';
      seed.hakoFileId = b.hakoFileId || null;
      seed.units = 'mm';
      seed.hakoUnits = 'model_mm';
      return attachPlannerHandoff(seed, b);
    }
    const seed = {
      source: 'HakoMachi Site Planner',
      version: 1,
      projectName: state.projectName || 'hakomachi-site',
      buildingId: b.id,
      name: b.name,
      padType: b.padType,
      category: b.category,
      state: b.state || 'notStarted',
      hakoFileId: b.hakoFileId || null,
      rotationDeg: b.rotationDeg || 0,
      notes: b.notes || '',
      units: 'mm',
      hakoUnits: 'model_mm',
      seedMode: 'generated-from-footprint',
    };
    if (b.padType === 'rect') {
      Object.assign(seed, { widthMm: b.widthMm, depthMm: b.depthMm, footprint: { type: 'rect', widthMm: b.widthMm, depthMm: b.depthMm, rotationDeg: b.rotationDeg || 0 } });
    } else {
      const xs = b.pointsMm.map(p => p.x);
      const ys = b.pointsMm.map(p => p.y);
      Object.assign(seed, { footprint: { type: 'polygon', pointsMm: b.pointsMm }, boundingRectMm: { widthMm: Math.max(...xs) - Math.min(...xs), depthMm: Math.max(...ys) - Math.min(...ys) }, warning: 'Polygon footprints should be refined with HakoMachi shape editor/cut lines if arbitrary polygon cores are not yet supported.' });
    }
    seed.fabricHints = b.fabricHints || undefined;
    seed.styleHints = b.styleHints || undefined;
    return attachPlannerHandoff(seed, b);
  }

  function updateHandoff() {
    const preview = getElement('handoffPreview');
    if (!preview) return;
    const b = selected();
    preview.textContent = b ? JSON.stringify(makeSeed(b), null, 2) : '';
  }

  function openBuildingInHakoMachi(building = null) {
    const b = building || selected();
    if (!b) { showStatusHint('Select a building first.', 'warning'); return false; }
    const seed = makeSeed(b);
    localStorageRef.setItem('hakomachiSitePlannerSeed', JSON.stringify(seed));
    sessionStorageRef.setItem('hakomachiSitePlannerSeed', JSON.stringify(seed));
    const child = windowRef.open('building-generator.html#sitePlannerSeed', '_blank');
    const targetOrigin = windowRef.location.origin && windowRef.location.origin !== 'null' ? windowRef.location.origin : '*';
    setTimeout(() => { try { child?.postMessage?.({ type: 'hakomachi:open-building-seed', buildingSeed: seed }, targetOrigin); } catch (_err) {} }, 650);
    return true;
  }

  async function copyHakoSeedForBuilding(building = null) {
    const b = building || selected();
    if (!b) { showStatusHint('Select a building first.', 'warning'); return false; }
    const text = JSON.stringify(makeSeed(b), null, 2);
    try {
      await navigatorRef.clipboard.writeText(text);
      const statusHint = statusHintElement();
      if (statusHint) statusHint.textContent = 'Copied HakoSeed for ' + (b.name || 'building');
    } catch (_err) {
      promptFn('Copy HakoSeed', text);
    }
    return true;
  }

  function sitePlannerBuildingUpdatePayload(data) {
    if (!data || typeof data !== 'object') return null;
    const type = String(data.type || data.action || data.event || '').toLowerCase();
    const schema = String(data.schema || '').toLowerCase();
    if (type.includes('site-planner-building-update') || schema === 'hakomachi.building-update') return data;
    if (data.payload && typeof data.payload === 'object') return sitePlannerBuildingUpdatePayload(data.payload);
    if (data.data && typeof data.data === 'object') return sitePlannerBuildingUpdatePayload(data.data);
    return null;
  }

  function pointsMmToPlacedPx(pointsMm, center, rotationDeg) {
    if (!Array.isArray(pointsMm) || pointsMm.length < 3) return null;
    const xs = pointsMm.map(p => Number(p.x));
    const ys = pointsMm.map(p => Number(p.y));
    if (xs.some(v => !Number.isFinite(v)) || ys.some(v => !Number.isFinite(v))) return null;
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const a = rad(rotationDeg || 0);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    return pointsMm.map(p => {
      const x = mmToPx(Number(p.x) - cx);
      const y = mmToPx(Number(p.y) - cy);
      return { x: center.x + x * ca - y * sa, y: center.y + x * sa + y * ca };
    });
  }

  function applyHakoConfigToPlannerFootprint(b, cfg) {
    const derived = deriveFootprintFromHakoConfig(cfg || {});
    if (!derived) return;
    const center = buildingCenter(b);
    if (derived.trimLinesMm && derived.trimLinesMm.length) {
      b.hakoTrimLinesMm = derived.trimLinesMm;
      b.showHakoTrimLines = true;
    }
    if (derived.padType === 'rect' && derived.widthMm && derived.depthMm) {
      b.padType = 'rect';
      b.x = center.x;
      b.y = center.y;
      b.widthPx = mmToPx(derived.widthMm);
      b.depthPx = mmToPx(derived.depthMm);
      b.hakoGeometryOriginMm = { x: derived.widthMm / 2, y: derived.depthMm / 2 };
      delete b.pointsPx;
      delete b.pointsMm;
    } else if (derived.padType === 'polygon' && derived.pointsMm) {
      const pointsPx = pointsMmToPlacedPx(derived.pointsMm, center, b.rotationDeg || 0);
      if (pointsPx) {
        b.padType = 'polygon';
        b.pointsPx = pointsPx;
        b.hakoGeometryOriginMm = null;
        delete b.widthPx;
        delete b.depthPx;
      }
    }
  }

  async function applySitePlannerBuildingUpdate(raw, opts = {}) {
    const payload = sitePlannerBuildingUpdatePayload(raw);
    if (!payload) return false;
    const cfg = payload.hakoConfig || payload.config || payload.buildingConfig || payload.hako;
    if (!cfg || typeof cfg !== 'object') return false;
    const targetId = payload.targetPlannerBuildingId || payload.buildingId || payload.plannerBuildingId || cfg.hakomachiHandoff?.building?.plannerId || cfg.sitePlanSeedSource?.sourceId;
    const b = state.buildings.find(item => item.id === targetId) || (opts.allowSelectedFallback ? selected() : null);
    if (!b) return false;
    const updatedAt = payload.updatedAt || new Date().toISOString();
    const name = payload.buildingName || cfg.buildingName || b.name || 'building';
    const fileName = `${slug(name)}.hako`;
    const currentSize = currentBuildingFootprintSizeMm(b);
    const incomingSize = hakoConfigFootprintSizeMm(cfg);
    const isIntentionalGeneratorReturn = payload.returnToSitePlanner === true;
    if (!isIntentionalGeneratorReturn && currentSize && incomingSize && !footprintSizesMatch(currentSize, incomingSize)) {
      const ok = typeof confirmBuildingResize === 'function'
        ? await confirmBuildingResize(b, {
          source: 'building-generator-update',
          fileName,
          currentSize,
          incomingSize,
          buildingName: name,
          payload,
        })
        : true;
      if (!ok) {
        const statusHint = statusHintElement();
        if (statusHint) statusHint.textContent = `Canceled update for ${b.name || name || 'building'}.`;
        return false;
      }
    }
    const dataText = JSON.stringify(cfg, null, 2);
    b.hakoConfig = clone(cfg);
    b.hakoFile = {
      fileName,
      mimeType: 'application/json',
      sizeBytes: dataText.length,
      importedAt: updatedAt,
      dataText,
      parsedConfig: clone(cfg),
      source: 'building-generator-push',
    };
    b.hakoFileId = fileName;
    b.hakomachiHandoff = payload.sitePlannerHandoff || payload.hakomachiHandoff || cfg.hakomachiHandoff || null;
    delete b.plannerHeightMm;
    if (b.state === 'notStarted') b.state = 'inProgress';
    applyHakoConfigToPlannerFootprint(b, cfg);
    normalizeBuilding(b);
    syncBuildingMetrics(b);
    setBuildingSelection([b.id], b.id);
    syncAll();
    const statusHint = statusHintElement();
    if (statusHint) statusHint.textContent = `Updated ${b.name || 'building'} from Building Generator.`;
    return { buildingId: b.id, buildingName: b.name || name || 'building' };
  }

  function currentBuildingFootprintSizeMm(b) {
    if (!b) return null;
    syncBuildingMetrics(b);
    if (b.padType === 'rect') {
      const widthMm = Number(b.widthMm);
      const depthMm = Number(b.depthMm);
      return widthMm > 0 && depthMm > 0 ? { widthMm, depthMm, source: 'current footprint' } : null;
    }
    const derived = b.derived || {};
    const widthMm = Number(derived.boundingWidthMm);
    const depthMm = Number(derived.boundingDepthMm);
    return widthMm > 0 && depthMm > 0 ? { widthMm, depthMm, source: 'current footprint bounds' } : null;
  }

  function hakoConfigFootprintSizeMm(cfg) {
    const derived = deriveFootprintFromHakoConfig(cfg || {});
    if (!derived) return null;
    if (derived.widthMm && derived.depthMm) {
      return { widthMm: Number(derived.widthMm), depthMm: Number(derived.depthMm), source: derived.source || 'hako config' };
    }
    if (Array.isArray(derived.pointsMm) && derived.pointsMm.length >= 3) {
      const xs = derived.pointsMm.map(p => Number(p.x)).filter(Number.isFinite);
      const ys = derived.pointsMm.map(p => Number(p.y)).filter(Number.isFinite);
      if (xs.length && ys.length) {
        return { widthMm: Math.max(...xs) - Math.min(...xs), depthMm: Math.max(...ys) - Math.min(...ys), source: derived.source || 'hako footprint bounds' };
      }
    }
    return null;
  }

  function footprintSizesMatch(a, b) {
    if (!a || !b) return true;
    const widthTol = Math.max(0.5, Math.max(Number(a.widthMm) || 0, Number(b.widthMm) || 0) * 0.01);
    const depthTol = Math.max(0.5, Math.max(Number(a.depthMm) || 0, Number(b.depthMm) || 0) * 0.01);
    return Math.abs((Number(a.widthMm) || 0) - (Number(b.widthMm) || 0)) <= widthTol
      && Math.abs((Number(a.depthMm) || 0) - (Number(b.depthMm) || 0)) <= depthTol;
  }

  function acknowledgeSitePlannerBuildingUpdate(sourceWindow, origin, result) {
    if (!sourceWindow || !result) return;
    const targetOrigin = origin && origin !== 'null' ? origin : '*';
    try {
      sourceWindow.postMessage({
        type: 'hakomachi:site-planner-building-update-applied',
        schema: 'hakomachi.building-update-ack',
        schemaVersion: 1,
        buildingId: result.buildingId,
        buildingName: result.buildingName,
        appliedAt: new Date().toISOString(),
      }, targetOrigin);
    } catch (_err) {}
  }

  async function processQueuedSitePlannerBuildingUpdate() {
    let raw = null;
    try { raw = localStorage.getItem(buildingUpdateKey) || sessionStorage.getItem(buildingUpdateKey); } catch (_err) {}
    if (!raw) return false;
    try {
      const payload = JSON.parse(raw);
      const ok = await applySitePlannerBuildingUpdate(payload);
      if (ok) {
        localStorage.removeItem(buildingUpdateKey);
        sessionStorage.removeItem(buildingUpdateKey);
      }
      return ok;
    } catch (err) {
      logger.warn('Could not apply queued building update:', err);
      return false;
    }
  }

  return {
    acknowledgeSitePlannerBuildingUpdate,
    applyHakoConfigToPlannerFootprint,
    applySitePlannerBuildingUpdate,
    attachPlannerHandoff,
    makeAttachedHakoSeed,
    makeSeed,
    openBuildingInHakoMachi,
    copyHakoSeedForBuilding,
    plannerHandoffForBuilding,
    pointsMmToPlacedPx,
    processQueuedSitePlannerBuildingUpdate,
    sitePlannerBuildingUpdatePayload,
    updateHandoff,
  };
}
