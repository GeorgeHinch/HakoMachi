export function createGroupSelectionController({
  ctx,
  state,
  dist,
  buildingPoints,
  stlObjectRect,
  normalizeStlObject,
  currentSelectedMovableSiteObjects,
  matchMedia = globalThis.matchMedia,
}) {
  function groupSelectionPointCloud(entries = currentSelectedMovableSiteObjects()) {
    const points = [];
    (entries || []).forEach(entry => {
      const item = entry?.item;
      if (!item) return;
      if (entry.type === 'building') points.push(...buildingPoints(item));
      else if (entry.type === 'stlObject') points.push(...stlObjectRect(normalizeStlObject(item)));
      else if (entry.type === 'road' || entry.type === 'track' || entry.type === 'benchwork' || entry.type === 'fabric') {
        (item.pointsPx || []).forEach(point => point && points.push(point));
        (item.curvesPx || []).forEach(point => point && points.push(point));
      } else if (entry.type === 'roadFeature' || entry.type === 'streetlight' || entry.type === 'trackAccessory') {
        points.push({ x: Number(item.x) || 0, y: Number(item.y) || 0 });
      }
    });
    return points.filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
  }

  function groupSelectionBounds(entries = currentSelectedMovableSiteObjects()) {
    if ((entries || []).length < 2) return null;
    const points = groupSelectionPointCloud(entries);
    if (!points.length) return null;
    const xs = points.map(point => point.x);
    const ys = points.map(point => point.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const pad = 10 / state.view.scale;
    return {
      minX: minX - pad,
      maxX: maxX + pad,
      minY: minY - pad,
      maxY: maxY + pad,
      center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
    };
  }

  function groupRotationHandlePoint(bounds = groupSelectionBounds()) {
    if (!bounds) return null;
    return { x: bounds.center.x, y: bounds.minY - 30 / state.view.scale };
  }

  function hitGroupRotationHandle(point, pointerType = 'mouse') {
    const entries = currentSelectedMovableSiteObjects();
    if (entries.length < 2) return null;
    const bounds = groupSelectionBounds(entries);
    const handle = groupRotationHandlePoint(bounds);
    if (!bounds || !handle) return null;
    const coarse = pointerType === 'pen' || pointerType === 'touch' || matchMedia?.('(pointer: coarse)').matches;
    const tolerance = (coarse ? 22 : 13) / state.view.scale;
    return dist(point, handle) <= tolerance ? { entries, bounds, handle } : null;
  }

  function drawGroupSelectionAffordance() {
    const entries = currentSelectedMovableSiteObjects();
    if (entries.length < 2) return;
    const bounds = groupSelectionBounds(entries);
    const handle = groupRotationHandlePoint(bounds);
    if (!bounds || !handle) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(15,118,110,.68)';
    ctx.fillStyle = 'rgba(15,118,110,.12)';
    ctx.lineWidth = 2 / state.view.scale;
    ctx.setLineDash([7 / state.view.scale, 6 / state.view.scale]);
    ctx.strokeRect(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(bounds.center.x, bounds.minY);
    ctx.lineTo(handle.x, handle.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(handle.x, handle.y, 9 / state.view.scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.font = `${13 / state.view.scale}px system-ui`;
    ctx.fillStyle = '#0f766e';
    ctx.fillText('R', handle.x - 4 / state.view.scale, handle.y + 5 / state.view.scale);
    ctx.restore();
  }

  return {
    groupSelectionPointCloud,
    groupSelectionBounds,
    groupRotationHandlePoint,
    hitGroupRotationHandle,
    drawGroupSelectionAffordance,
  };
}
