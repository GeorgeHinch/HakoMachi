export const SITE_OBJECT_CLIPBOARD_TYPES = Object.freeze({
  annotation: { collection: 'annotations', selectedId: 'selectedAnnotationId', prefix: 'note' },
  roadFeature: { collection: 'roadFeatures', selectedId: 'selectedRoadFeatureId', prefix: 'roadFeature' },
  streetlight: { collection: 'streetlights', selectedId: 'selectedStreetlightId', prefix: 'light' },
  road: { collection: 'roads', selectedId: 'selectedRoadId', prefix: 'road' },
  trackAccessory: { collection: 'trackAccessories', selectedId: 'selectedTrackAccessoryId', prefix: 'trackItem' },
  track: { collection: 'tracks', selectedId: 'selectedTrackId', prefix: 'track' },
  stlObject: { collection: 'stlObjects', selectedId: 'selectedStlObjectId', prefix: 'stl' },
  benchwork: { collection: 'benchworkOutlines', selectedId: 'selectedBenchworkId', prefix: 'benchwork' },
  fabric: { collection: 'fabricRegions', selectedId: 'selectedFabricId', prefix: 'fabric' },
});

const SITE_OBJECT_MOVE_TYPES = new Set(['building', 'roadFeature', 'streetlight', 'road', 'trackAccessory', 'track', 'stlObject', 'benchwork', 'fabric']);

export function createSiteObjectSelectionController(deps) {
  const {
    state,
    uid,
    isBuildingSelected,
    clearBuildingSelection,
    setBuildingSelection,
    selectedAnnotation,
    selectedRoadFeature,
    selectedStreetlight,
    selectedRoad,
    selectedTrackAccessory,
    selectedTrack,
    selectedStlObject,
    selectedBenchwork,
    selectedFabric,
    normalizeRoadFeature,
    normalizeStreetlight,
    normalizeRoad,
    normalizeTrackAccessory,
    normalizeTrack,
    normalizeStlObject,
    normalizeBenchworkOutline,
    normalizeFabricRegion,
    syncBuildingMetrics,
    moveRoadFeature,
    isTrackSwitchAccessoryKind,
    snapTrackSwitchToEndpoint,
    syncTracksConnectedToTrackSwitch,
    nearestTrackAccessoryAnchor,
    trackAccessorySnapDistance,
    isCatenaryAccessoryKind,
    attachTrackAccessoryToAnchor,
    syncRoadMetrics,
    syncTrackMetrics,
    syncTrackEndpointToSwitchConnection,
    syncConnectedTrackEndpoint,
    draggedTrackSwitchEndpointName,
    clearPlanObjectSelection,
    syncAll,
    refreshUi,
  } = deps;

  function siteObjectKey(type, id) {
    return `${type}:${id}`;
  }

  function normalizeSelectedSiteObjects() {
    const seen = new Set();
    state.selectedSiteObjects = (Array.isArray(state.selectedSiteObjects) ? state.selectedSiteObjects : [])
      .filter(sel => sel && typeof sel.type === 'string' && sel.id)
      .filter(sel => {
        const key = siteObjectKey(sel.type, sel.id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    return state.selectedSiteObjects;
  }

  function selectedSiteObjectCount() {
    return normalizeSelectedSiteObjects().length;
  }

  function isSiteObjectSelected(type, id) {
    if (type === 'building') return isBuildingSelected(id) || normalizeSelectedSiteObjects().some(sel => sel.type === 'building' && sel.id === id);
    return normalizeSelectedSiteObjects().some(sel => sel.type === type && sel.id === id);
  }

  function clearSelectedSiteObjects() {
    state.selectedSiteObjects = [];
  }

  function setSelectedSiteObjects(selection) {
    const seen = new Set();
    state.selectedSiteObjects = (selection || [])
      .filter(sel => sel && sel.type && sel.id)
      .filter(sel => {
        const key = siteObjectKey(sel.type, sel.id);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(sel => ({ type: sel.type, id: sel.id }));
  }

  function siteObjectBySelection(sel) {
    if (!sel?.type || !sel.id) return null;
    if (sel.type === 'building') return state.buildings.find(item => item.id === sel.id) || null;
    const meta = SITE_OBJECT_CLIPBOARD_TYPES[sel.type];
    return meta ? (state[meta.collection] || []).find(item => item.id === sel.id) || null : null;
  }

  function currentSelectedMovableSiteObjects() {
    return normalizeSelectedSiteObjects()
      .filter(sel => SITE_OBJECT_MOVE_TYPES.has(sel.type))
      .map(sel => ({ type: sel.type, item: siteObjectBySelection(sel) }))
      .filter(entry => entry.item && !entry.item.locked);
  }

  function applyPrimarySiteObjectSelection(type, id, { preserveGroup = false } = {}) {
    if (!preserveGroup) clearSelectedSiteObjects();
    if (type !== 'building') clearBuildingSelection();
    Object.values(SITE_OBJECT_CLIPBOARD_TYPES).forEach(meta => { state[meta.selectedId] = null; });
    state.selectedTrackPointIndex = null;
    state.selectedRoadIntersectionId = null;
    state.selectedRailCrossingId = null;
    if (type === 'building') setBuildingSelection([id], id);
    else {
      const meta = SITE_OBJECT_CLIPBOARD_TYPES[type];
      if (meta) state[meta.selectedId] = id;
    }
  }

  function setSingleSiteObjectSelection(type, id) {
    applyPrimarySiteObjectSelection(type, id);
    setSelectedSiteObjects([{ type, id }]);
  }

  function toggleSiteObjectSelection(type, id) {
    const current = normalizeSelectedSiteObjects().slice();
    const key = siteObjectKey(type, id);
    const filtered = current.filter(sel => siteObjectKey(sel.type, sel.id) !== key);
    if (filtered.length === current.length) filtered.push({ type, id });
    setSelectedSiteObjects(filtered);
    if (type === 'building') {
      const buildingIds = state.selectedSiteObjects.filter(sel => sel.type === 'building').map(sel => sel.id);
      setBuildingSelection(buildingIds, buildingIds.includes(id) ? id : (buildingIds[0] || null));
    } else if (filtered.some(sel => sel.type === type && sel.id === id)) {
      applyPrimarySiteObjectSelection(type, id, { preserveGroup: true });
    } else {
      const fallback = state.selectedSiteObjects[state.selectedSiteObjects.length - 1];
      if (fallback) applyPrimarySiteObjectSelection(fallback.type, fallback.id, { preserveGroup: true });
      else clearPlanObjectSelection();
    }
    return true;
  }

  function offsetPointArray(points, dx, dy) {
    return Array.isArray(points) ? points.map(point => point ? { ...point, x: (Number(point.x) || 0) + dx, y: (Number(point.y) || 0) + dy } : point) : points;
  }

  function selectedSiteObjectForClipboard() {
    if (state.selectedAnnotationId) return { type: 'annotation', item: selectedAnnotation() };
    if (state.selectedRoadFeatureId) return { type: 'roadFeature', item: selectedRoadFeature() };
    if (state.selectedStreetlightId) return { type: 'streetlight', item: selectedStreetlight() };
    if (state.selectedRoadId) return { type: 'road', item: selectedRoad() };
    if (state.selectedTrackAccessoryId) return { type: 'trackAccessory', item: selectedTrackAccessory() };
    if (state.selectedTrackId) return { type: 'track', item: selectedTrack() };
    if (state.selectedStlObjectId) return { type: 'stlObject', item: selectedStlObject() };
    if (state.selectedBenchworkId) return { type: 'benchwork', item: selectedBenchwork() };
    if (state.selectedFabricId) return { type: 'fabric', item: selectedFabric() };
    return null;
  }

  function normalizeSiteObjectForClipboard(type, item) {
    if (type === 'roadFeature') return normalizeRoadFeature(item);
    if (type === 'streetlight') return normalizeStreetlight(item);
    if (type === 'road') return normalizeRoad(item);
    if (type === 'trackAccessory') return normalizeTrackAccessory(item);
    if (type === 'track') return normalizeTrack(item);
    if (type === 'stlObject') return normalizeStlObject(item);
    if (type === 'benchwork') return normalizeBenchworkOutline(item);
    if (type === 'fabric') return normalizeFabricRegion(item);
    return item;
  }

  function clearCopiedSiteObjectRelationships(type, payload) {
    if (type === 'roadFeature') {
      payload.roadId = null;
      payload.autoAlignedToRoad = false;
    } else if (type === 'streetlight') {
      if (payload.anchor) {
        payload.anchor = { ...payload.anchor, targetRoadId: null, lockToRoadEdge: false };
      }
    } else if (type === 'road') {
      payload.endpointConnections = {};
      delete payload.roadPolygonPx;
      delete payload.sidewalkPolygonsPx;
    } else if (type === 'trackAccessory') {
      payload.trackId = null;
      payload.trackAnchor = null;
      payload.autoOrientToTrack = false;
    } else if (type === 'track') {
      payload.endpointConnections = {};
    } else if (type === 'fabric') {
      payload.generatedPadIds = [];
    }
    return payload;
  }

  function siteObjectClipboardPayload(type, item) {
    if (!type || !item || !SITE_OBJECT_CLIPBOARD_TYPES[type]) return null;
    const normalized = normalizeSiteObjectForClipboard(type, item);
    const payload = structuredClone(normalized);
    payload.copiedFromId = item.id;
    payload.copiedAt = new Date().toISOString();
    clearCopiedSiteObjectRelationships(type, payload);
    return payload;
  }

  function copySelectedSiteObject() {
    const selection = selectedSiteObjectForClipboard();
    if (!selection?.item) return false;
    state.siteObjectClipboard = { type: selection.type, item: siteObjectClipboardPayload(selection.type, selection.item) };
    state.siteObjectPasteOffsetCount = 0;
    state.objectClipboardType = 'siteObject';
    return true;
  }

  function preparePastedSiteObject(type, src) {
    const meta = SITE_OBJECT_CLIPBOARD_TYPES[type];
    if (!meta || !src) return null;
    const copy = structuredClone(src);
    const n = ++state.siteObjectPasteOffsetCount;
    const off = 18 * n;
    copy.id = uid(meta.prefix);
    if (copy.name) {
      const baseName = String(copy.name).replace(/ copy(?: \d+)?$/i, '');
      copy.name = baseName + ' copy';
    }
    copy.hidden = false;
    copy.locked = false;
    if (Number.isFinite(Number(copy.x))) copy.x = Number(copy.x) + off;
    if (Number.isFinite(Number(copy.y))) copy.y = Number(copy.y) + off;
    copy.pointsPx = offsetPointArray(copy.pointsPx, off, off);
    copy.curvesPx = offsetPointArray(copy.curvesPx, off, off);
    copy.polygon = offsetPointArray(copy.polygon, off, off);
    copy.points = offsetPointArray(copy.points, off, off);
    clearCopiedSiteObjectRelationships(type, copy);
    normalizeSiteObjectForClipboard(type, copy);
    return copy;
  }

  function selectPastedSiteObject(type, item) {
    setSingleSiteObjectSelection(type, item.id);
  }

  function pasteSiteObjectFromClipboard() {
    const src = state.siteObjectClipboard;
    const type = src?.type;
    const meta = SITE_OBJECT_CLIPBOARD_TYPES[type];
    if (!meta || !src.item) return false;
    const copy = preparePastedSiteObject(type, src.item);
    if (!copy) return false;
    state[meta.collection] = state[meta.collection] || [];
    state[meta.collection].push(copy);
    selectPastedSiteObject(type, copy);
    syncAll();
    return true;
  }

  function copySelectedTrackAccessory() {
    return !!(state.selectedTrackAccessoryId && copySelectedSiteObject());
  }

  function pasteTrackAccessoryFromClipboard() {
    return state.siteObjectClipboard?.type === 'trackAccessory' && pasteSiteObjectFromClipboard();
  }

  function applySiteObjectMoveFromOrig(type, orig, dx, dy, pointerPoint = null, preferredSourceEndpoint = null) {
    if (!orig || !SITE_OBJECT_MOVE_TYPES.has(type)) return;
    if (type === 'building') {
      const b = state.buildings.find(x => x.id === orig.id);
      if (b && !b.locked) {
        if (b.padType === 'rect') { b.x = orig.x + dx; b.y = orig.y + dy; }
        else b.pointsPx = (orig.pointsPx || []).map(q => ({ x: q.x + dx, y: q.y + dy }));
        syncBuildingMetrics(b);
      }
      return;
    }
    if (type === 'streetlight') {
      const l = state.streetlights.find(x => x.id === orig.id);
      if (l && !l.locked) { l.x = orig.x + dx; l.y = orig.y + dy; }
      return;
    }
    if (type === 'trackAccessory') {
      const item = (state.trackAccessories || []).find(x => x.id === orig.id);
      if (item && !item.locked) {
        item.x = orig.x + dx;
        item.y = orig.y + dy;
        if (Number.isFinite(Number(orig.rotationDeg))) item.rotationDeg = Number(orig.rotationDeg);
        if (isTrackSwitchAccessoryKind(item.kind)) {
          if (!snapTrackSwitchToEndpoint(item, pointerPoint, preferredSourceEndpoint)) {
            item.trackAnchor = null;
            item.trackId = null;
            normalizeTrackAccessory(item);
            syncTracksConnectedToTrackSwitch(item);
          }
        } else {
          const anchor = nearestTrackAccessoryAnchor({ x: item.x, y: item.y });
          if (anchor && anchor.distance <= trackAccessorySnapDistance()) {
            if (isCatenaryAccessoryKind(item.kind)) attachTrackAccessoryToAnchor(item, anchor);
            else item.trackId = anchor.trackId;
          } else if (isCatenaryAccessoryKind(item.kind)) {
            item.trackId = null;
            item.trackAnchor = null;
            item.autoOrientToTrack = false;
          }
          normalizeTrackAccessory(item);
        }
      }
      return;
    }
    if (type === 'stlObject') {
      const obj = (state.stlObjects || []).find(x => x.id === orig.id);
      if (obj && !obj.locked) { obj.x = orig.x + dx; obj.y = orig.y + dy; normalizeStlObject(obj); }
      return;
    }
    if (type === 'benchwork') {
      const bw = state.benchworkOutlines.find(x => x.id === orig.id);
      if (bw && !bw.locked) {
        bw.pointsPx = (orig.pointsPx || []).map(q => ({ x: q.x + dx, y: q.y + dy }));
        bw.curvesPx = (orig.curvesPx || []).map(c => c ? { x: c.x + dx, y: c.y + dy } : null);
        normalizeBenchworkOutline(bw);
      }
      return;
    }
    if (type === 'road') {
      const r = state.roads.find(x => x.id === orig.id);
      if (r && !r.locked) {
        r.pointsPx = (orig.pointsPx || []).map(q => ({ x: q.x + dx, y: q.y + dy }));
        r.curvesPx = (orig.curvesPx || []).map(c => c ? { x: c.x + dx, y: c.y + dy } : null);
        syncRoadMetrics(r);
      }
      return;
    }
    if (type === 'track') {
      const t = (state.tracks || []).find(x => x.id === orig.id);
      if (t && !t.locked) {
        t.pointsPx = (orig.pointsPx || []).map(q => ({ x: q.x + dx, y: q.y + dy }));
        t.curvesPx = (orig.curvesPx || []).map(c => c ? { x: c.x + dx, y: c.y + dy } : null);
        syncTrackMetrics(t);
      }
      return;
    }
    if (type === 'roadFeature') {
      const f = (state.roadFeatures || []).find(x => x.id === orig.id);
      if (f && !f.locked) moveRoadFeature(f, dx, dy);
      return;
    }
    if (type === 'fabric') {
      const fabric = (state.fabricRegions || []).find(x => x.id === orig.id);
      if (fabric && !fabric.locked) {
        fabric.pointsPx = (orig.pointsPx || []).map(q => ({ x: q.x + dx, y: q.y + dy }));
        fabric.curvesPx = (orig.curvesPx || []).map(c => c ? { x: c.x + dx, y: c.y + dy } : null);
        normalizeFabricRegion(fabric);
      }
    }
  }

  function finalizeMovedSiteObject(type, orig) {
    if (type === 'track') {
      const t = (state.tracks || []).find(x => x.id === orig.id);
      if (t?.pointsPx?.length) {
        syncTrackEndpointToSwitchConnection(t, 0);
        syncTrackEndpointToSwitchConnection(t, t.pointsPx.length - 1);
        syncConnectedTrackEndpoint(t, 0, t.pointsPx[0]);
        syncConnectedTrackEndpoint(t, t.pointsPx.length - 1, t.pointsPx[t.pointsPx.length - 1]);
      }
    } else if (type === 'trackAccessory') {
      const item = (state.trackAccessories || []).find(x => x.id === orig.id);
      if (item && isTrackSwitchAccessoryKind(item.kind)) syncTracksConnectedToTrackSwitch(item);
    }
  }

  function startSiteObjectMoveDrag(type, item, e, p) {
    const selected = isSiteObjectSelected(type, item.id);
    if (!selected) setSingleSiteObjectSelection(type, item.id);
    else applyPrimarySiteObjectSelection(type, item.id, { preserveGroup: true });
    const movable = currentSelectedMovableSiteObjects();
    const entries = (selected && movable.length > 1 ? movable : [{ type, item }])
      .filter(entry => entry.item && !entry.item.locked)
      .map(entry => ({
        type: entry.type,
        orig: structuredClone(entry.item),
        dragOrigin: entry.type === type && entry.item.id === item.id,
        snapSourceEndpoint: entry.type === type && entry.item.id === item.id ? draggedTrackSwitchEndpointName(entry.item, p) : null,
      }));
    if (entries.length) {
      state.drag = { type: entries.length > 1 ? 'moveSiteObjects' : 'moveSiteObject', pointerId: e.pointerId, start: p, entries };
    }
    return true;
  }

  function handleSiteObjectPointerHit(type, item, e, p) {
    if (!item) return false;
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      toggleSiteObjectSelection(type, item.id);
      refreshUi();
      return true;
    }
    startSiteObjectMoveDrag(type, item, e, p);
    refreshUi();
    return true;
  }

  return {
    applyPrimarySiteObjectSelection,
    applySiteObjectMoveFromOrig,
    clearCopiedSiteObjectRelationships,
    clearSelectedSiteObjects,
    copySelectedSiteObject,
    copySelectedTrackAccessory,
    currentSelectedMovableSiteObjects,
    finalizeMovedSiteObject,
    handleSiteObjectPointerHit,
    isSiteObjectSelected,
    normalizeSelectedSiteObjects,
    normalizeSiteObjectForClipboard,
    offsetPointArray,
    pasteSiteObjectFromClipboard,
    pasteTrackAccessoryFromClipboard,
    preparePastedSiteObject,
    selectedSiteObjectCount,
    selectedSiteObjectForClipboard,
    selectPastedSiteObject,
    setSelectedSiteObjects,
    setSingleSiteObjectSelection,
    siteObjectBySelection,
    siteObjectClipboardPayload,
    siteObjectKey,
    startSiteObjectMoveDrag,
    toggleSiteObjectSelection,
  };
}
