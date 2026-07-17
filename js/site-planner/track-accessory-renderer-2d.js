export function createTrackAccessoryRenderer2D({
  ctx,
  state,
  rad,
  drawLabel,
  isSiteObjectSelected,
  normalizeTrackAccessory,
  refreshTrackAccessoryAnchor,
  isTrackSwitchAccessoryKind,
  isTrackBufferAccessoryKind,
  trackAccessoryPreset,
  trackAccessoryLabel,
  trackSwitchDirection,
  trackSwitchGeometryPx,
  trackSwitchCurvePoints,
  offsetTrackPath,
  polylineLength,
  pointAtPolylineDistance,
  trackBufferGeometryPx,
  trackBufferHasCatenaryTerminal,
  trackAccessoryRotationHandleLocal,
  trackAccessoryLabelPoint,
}) {
  function drawTrackSwitchPolyline(points) {
    if (!points || !points.length) return;
    ctx.beginPath();
    points.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.stroke();
  }

  function drawTrackAccessory(raw) {
    const item = normalizeTrackAccessory(raw);
    refreshTrackAccessoryAnchor(item);
    if (item.hidden) return;
    const selected = item.id === state.selectedTrackAccessoryId || isSiteObjectSelected('trackAccessory', item.id);
    const hovered = item.id === state.hoverTrackAccessoryId;
    const color = selected ? '#c84a3a' : (hovered ? '#d79631' : item.color || trackAccessoryPreset(item.kind).color);
    const scale = 1 / state.view.scale;
    ctx.save();
    ctx.translate(item.x, item.y);
    ctx.rotate(rad(item.rotationDeg || 0));
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.lineWidth = (selected ? 2.5 : 1.8) * scale;
    if (item.kind === 'catenarySingleSide') {
      ctx.beginPath(); ctx.rect(-15 * scale, -8 * scale, 8 * scale, 16 * scale); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-11 * scale, 8 * scale); ctx.lineTo(-11 * scale, -18 * scale);
      ctx.moveTo(-15 * scale, -18 * scale); ctx.lineTo(-7 * scale, -18 * scale);
      ctx.moveTo(-11 * scale, -10 * scale); ctx.lineTo(16 * scale, -10 * scale);
      ctx.moveTo(-7 * scale, -10 * scale); ctx.lineTo(10 * scale, 2 * scale);
      ctx.moveTo(2 * scale, 2 * scale); ctx.lineTo(18 * scale, 2 * scale);
      ctx.moveTo(10 * scale, 2 * scale); ctx.lineTo(16 * scale, -10 * scale);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(13 * scale, 4 * scale, 1.5 * scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (item.kind === 'catenaryDoublePortal') {
      ctx.beginPath(); ctx.rect(-19 * scale, -6 * scale, 7 * scale, 12 * scale); ctx.rect(12 * scale, -6 * scale, 7 * scale, 12 * scale); ctx.fill(); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-15 * scale, 6 * scale); ctx.lineTo(-15 * scale, -18 * scale);
      ctx.moveTo(15 * scale, 6 * scale); ctx.lineTo(15 * scale, -18 * scale);
      ctx.moveTo(-18 * scale, -18 * scale); ctx.lineTo(18 * scale, -18 * scale);
      ctx.moveTo(-18 * scale, -12 * scale); ctx.lineTo(18 * scale, -12 * scale);
      ctx.moveTo(-15 * scale, -12 * scale); ctx.lineTo(-9 * scale, -18 * scale);
      ctx.moveTo(-9 * scale, -12 * scale); ctx.lineTo(-3 * scale, -18 * scale);
      ctx.moveTo(-3 * scale, -12 * scale); ctx.lineTo(3 * scale, -18 * scale);
      ctx.moveTo(3 * scale, -12 * scale); ctx.lineTo(9 * scale, -18 * scale);
      ctx.moveTo(9 * scale, -12 * scale); ctx.lineTo(15 * scale, -18 * scale);
      ctx.moveTo(-6 * scale, -8 * scale); ctx.lineTo(-6 * scale, -12 * scale);
      ctx.moveTo(6 * scale, -8 * scale); ctx.lineTo(6 * scale, -12 * scale);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(-6 * scale, -7 * scale, 1.3 * scale, 0, Math.PI * 2); ctx.arc(6 * scale, -7 * scale, 1.3 * scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (isTrackSwitchAccessoryKind(item.kind)) {
      const dir = trackSwitchDirection(item.kind);
      const geom = trackSwitchGeometryPx(item);
      const branch = trackSwitchCurvePoints(geom, dir, 22);
      const branchRailA = offsetTrackPath(branch, geom.gauge / 2);
      const branchRailB = offsetTrackPath(branch, -geom.gauge / 2);
      ctx.save();
      ctx.strokeStyle = 'rgba(199,176,132,.72)';
      ctx.lineWidth = Math.max(geom.roadbedWidth, 10 * scale);
      drawTrackSwitchPolyline([{ x: -geom.halfLength, y: 0 }, { x: geom.halfLength, y: 0 }]);
      drawTrackSwitchPolyline(branch);
      ctx.strokeStyle = 'rgba(138,111,67,.82)';
      ctx.lineWidth = Math.max(geom.tieWidth, 1.2 * scale);
      const tieHalf = Math.max(geom.tieLength / 2, geom.gauge / 2 + 3 * scale);
      const switchTieSpacing = Math.max(geom.tieSpacing, 3 * scale);
      for (let x = -geom.halfLength; x <= geom.halfLength + .01; x += switchTieSpacing) {
        ctx.beginPath(); ctx.moveTo(x, -tieHalf); ctx.lineTo(x, tieHalf); ctx.stroke();
      }
      const branchLength = polylineLength(branch);
      for (let d = switchTieSpacing * 1.25; d <= branchLength - switchTieSpacing * .35; d += switchTieSpacing) {
        const station = pointAtPolylineDistance(branch, d);
        if (!station) continue;
        const p = station.point, nx = -station.tangent.y, ny = station.tangent.x;
        ctx.beginPath();
        ctx.moveTo(p.x - nx * tieHalf, p.y - ny * tieHalf);
        ctx.lineTo(p.x + nx * tieHalf, p.y + ny * tieHalf);
        ctx.stroke();
      }
      ctx.strokeStyle = '#4b4438';
      ctx.lineWidth = Math.max(geom.railWidth, 1.2 * scale);
      drawTrackSwitchPolyline([{ x: -geom.halfLength, y: -geom.gauge / 2 }, { x: geom.halfLength, y: -geom.gauge / 2 }]);
      drawTrackSwitchPolyline([{ x: -geom.halfLength, y: geom.gauge / 2 }, { x: geom.halfLength, y: geom.gauge / 2 }]);
      drawTrackSwitchPolyline(branchRailA);
      drawTrackSwitchPolyline(branchRailB);
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.4 * scale, geom.railWidth * .9);
      ctx.beginPath();
      ctx.moveTo(-geom.halfLength + geom.length * .34, 0);
      ctx.lineTo(-geom.halfLength + geom.length * .52, dir * geom.offset * .42);
      ctx.stroke();
      ctx.restore();
      ctx.beginPath(); ctx.arc(geom.halfLength, 0, 2.8 * scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(branch[branch.length - 1].x, branch[branch.length - 1].y, 2.8 * scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(-geom.halfLength, 0, 2.8 * scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (isTrackBufferAccessoryKind(item.kind)) {
      const geom = trackBufferGeometryPx(item);
      const halfW = geom.width / 2;
      ctx.save();
      ctx.strokeStyle = 'rgba(199,176,132,.82)';
      ctx.lineWidth = Math.max(geom.width, 10 * scale);
      ctx.beginPath(); ctx.moveTo(-geom.length * .35, 0); ctx.lineTo(geom.length, 0); ctx.stroke();
      ctx.strokeStyle = 'rgba(138,111,67,.85)';
      ctx.lineWidth = Math.max(1.2 * scale, geom.width * .08);
      for (let x = -geom.length * .25; x < geom.length * .82; x += Math.max(geom.tieSpacing, 3 * scale)) {
        ctx.beginPath(); ctx.moveTo(x, -halfW * .42); ctx.lineTo(x, halfW * .42); ctx.stroke();
      }
      ctx.strokeStyle = '#4b4438';
      ctx.lineWidth = Math.max(1.2 * scale, geom.railWidth);
      ctx.beginPath();
      ctx.moveTo(-geom.length * .35, -geom.gauge / 2); ctx.lineTo(geom.length * .8, -geom.gauge / 2);
      ctx.moveTo(-geom.length * .35, geom.gauge / 2); ctx.lineTo(geom.length * .8, geom.gauge / 2);
      ctx.stroke();
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2 * scale, geom.railWidth * 1.8);
      ctx.beginPath();
      ctx.moveTo(geom.length * .78, -halfW * .48); ctx.lineTo(geom.length * .78, halfW * .48);
      ctx.moveTo(geom.length * .96, -halfW * .5); ctx.lineTo(geom.length * .96, halfW * .5);
      ctx.moveTo(geom.length * .78, -halfW * .48); ctx.lineTo(geom.length * .96, -halfW * .5);
      ctx.moveTo(geom.length * .78, halfW * .48); ctx.lineTo(geom.length * .96, halfW * .5);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,250,240,.92)';
      ctx.beginPath(); ctx.rect(geom.length * .72, -halfW * .56, geom.length * .3, halfW * 1.12); ctx.fill(); ctx.stroke();
      if (trackBufferHasCatenaryTerminal(item)) {
        const towerX = geom.length * .55;
        const towerY = -halfW - 7 * scale;
        const h = 28 * scale;
        const w = 6 * scale;
        ctx.strokeStyle = '#6f6a5e';
        ctx.lineWidth = 1.6 * scale;
        ctx.beginPath();
        ctx.rect(towerX - w / 2, towerY - h, w, h);
        ctx.moveTo(towerX - w / 2, towerY - h * .78); ctx.lineTo(towerX + w / 2, towerY - h * .58);
        ctx.moveTo(towerX + w / 2, towerY - h * .58); ctx.lineTo(towerX - w / 2, towerY - h * .38);
        ctx.moveTo(towerX - w / 2, towerY - h * .38); ctx.lineTo(towerX + w / 2, towerY - h * .18);
        ctx.moveTo(towerX, towerY - h * .68); ctx.lineTo(towerX - 10 * scale, towerY - h * .62);
        ctx.moveTo(towerX, towerY - h * .48); ctx.lineTo(towerX - 10 * scale, towerY - h * .42);
        ctx.stroke();
      }
      ctx.restore();
    } else if (item.kind === 'signal') {
      ctx.beginPath(); ctx.moveTo(0, 10 * scale); ctx.lineTo(0, -10 * scale); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -12 * scale, 5 * scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-7 * scale, 12 * scale); ctx.lineTo(7 * scale, 12 * scale); ctx.stroke();
    } else if (item.kind === 'intrusionDetector') {
      ctx.beginPath(); ctx.rect(-9 * scale, -7 * scale, 18 * scale, 14 * scale); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-5 * scale, -10 * scale); ctx.lineTo(0, -15 * scale); ctx.lineTo(5 * scale, -10 * scale); ctx.stroke();
      ctx.beginPath(); ctx.arc(-4 * scale, 0, 2 * scale, 0, Math.PI * 2); ctx.arc(4 * scale, 0, 2 * scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else if (item.kind === 'occupancyLight') {
      ctx.beginPath(); ctx.moveTo(0, 12 * scale); ctx.lineTo(0, -10 * scale); ctx.stroke();
      ctx.beginPath(); ctx.arc(-5 * scale, -12 * scale, 4.5 * scale, 0, Math.PI * 2); ctx.arc(5 * scale, -12 * scale, 4.5 * scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-9 * scale, -17 * scale); ctx.lineTo(-13 * scale, -21 * scale); ctx.moveTo(9 * scale, -17 * scale); ctx.lineTo(13 * scale, -21 * scale); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-7 * scale, 13 * scale); ctx.lineTo(7 * scale, 13 * scale); ctx.stroke();
    } else if (item.kind === 'crossingArm') {
      ctx.beginPath(); ctx.moveTo(-12 * scale, 0); ctx.lineTo(14 * scale, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-10 * scale, -5 * scale); ctx.lineTo(-5 * scale, 5 * scale); ctx.moveTo(-1 * scale, -5 * scale); ctx.lineTo(4 * scale, 5 * scale); ctx.moveTo(8 * scale, -5 * scale); ctx.lineTo(13 * scale, 5 * scale); ctx.stroke();
      ctx.beginPath(); ctx.arc(-14 * scale, 0, 4 * scale, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.rect(-8 * scale, -5 * scale, 16 * scale, 10 * scale); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, 5 * scale); ctx.lineTo(0, 13 * scale); ctx.moveTo(-5 * scale, 13 * scale); ctx.lineTo(5 * scale, 13 * scale); ctx.stroke();
    }
    if (selected || hovered) {
      ctx.setLineDash([4 * scale, 3 * scale]);
      ctx.strokeStyle = 'rgba(200,74,58,.45)';
      if (isTrackSwitchAccessoryKind(item.kind)) {
        const geom = trackSwitchGeometryPx(item);
        const dir = trackSwitchDirection(item.kind);
        const minY = dir < 0 ? -geom.offset - geom.roadbedWidth / 2 : -geom.roadbedWidth / 2;
        const maxY = dir < 0 ? geom.roadbedWidth / 2 : geom.offset + geom.roadbedWidth / 2;
        ctx.strokeRect(-geom.halfLength - 4 * scale, minY - 4 * scale, geom.length + 8 * scale, (maxY - minY) + 8 * scale);
      } else if (isTrackBufferAccessoryKind(item.kind)) {
        const geom = trackBufferGeometryPx(item);
        ctx.strokeRect(-geom.length * .35 - 4 * scale, -geom.width * .58 - 4 * scale, geom.length * 1.4 + 8 * scale, geom.width * 1.16 + 8 * scale);
      } else {
        const boxSize = 36;
        ctx.strokeRect(-boxSize / 2 * scale, -boxSize / 2 * scale, boxSize * scale, boxSize * scale);
      }
      if (selected && !item.locked) {
        ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(75,68,56,.75)';
        ctx.fillStyle = '#fffaf0';
        const handleLocal = trackAccessoryRotationHandleLocal(item);
        const stemStartY = isTrackSwitchAccessoryKind(item.kind)
          ? (trackSwitchDirection(item.kind) < 0
              ? -trackSwitchGeometryPx(item).offset - trackSwitchGeometryPx(item).roadbedWidth / 2 - 4 * scale
              : -trackSwitchGeometryPx(item).roadbedWidth / 2 - 4 * scale)
          : -18 * scale;
        ctx.beginPath();
        ctx.moveTo(0, stemStartY);
        ctx.lineTo(handleLocal.x, handleLocal.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(handleLocal.x, handleLocal.y, 6.8 * scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.font = `${11 * scale}px system-ui`;
        ctx.fillStyle = '#4b4438';
        ctx.fillText('rot', handleLocal.x - 6 * scale, handleLocal.y + 4 * scale);
      }
    }
    ctx.restore();
    if (selected || hovered) drawLabel(item.name || trackAccessoryLabel(item.kind), trackAccessoryLabelPoint(item));
  }

  return { drawTrackAccessory };
}
