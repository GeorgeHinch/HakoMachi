export function createTrackRenderer2D({
  ctx,
  state,
  trackProfileDefaults,
  normalizeTrack,
  isSiteObjectSelected,
  trackPathSamples,
  trackProfilePx,
  offsetTrackPath,
  drawTrackModelPath,
  trackTieSegments,
  drawRoadGeneratedPath,
  polygonCenter,
  drawLabel,
  fmt,
}) {
  function drawTrack(raw) {
    const track = normalizeTrack(raw);
    if (!track || track.hidden || (track.pointsPx || []).length < 2) return;
    const selected = track.id === state.selectedTrackId || isSiteObjectSelected('track', track.id);
    const hovered = track.id === state.hoverTrackId;
    const path = trackPathSamples(track);
    const profile = trackProfilePx(track);
    const railOffset = profile.gauge / 2;
    const left = offsetTrackPath(path, railOffset);
    const right = offsetTrackPath(path, -railOffset);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    drawTrackModelPath(path, track.roadbedColor || trackProfileDefaults.roadbedColor, profile.roadbedWidth, .72);
    drawTrackModelPath(path, track.roadbedTopColor || trackProfileDefaults.roadbedTopColor, profile.roadbedTopWidth, .84);
    trackTieSegments(track).forEach(segment => {
      ctx.strokeStyle = track.tieColor || '#8a6f43';
      ctx.lineWidth = profile.tieWidth;
      ctx.beginPath();
      ctx.moveTo(segment.a.x, segment.a.y);
      ctx.lineTo(segment.b.x, segment.b.y);
      ctx.stroke();
    });
    const railColor = selected ? '#c84a3a' : (hovered ? '#d79631' : track.color || '#4b4438');
    const railWidth = selected ? profile.railWidth * 1.6 : profile.railWidth;
    drawTrackModelPath(left, railColor, railWidth);
    drawTrackModelPath(right, railColor, railWidth);
    if (selected || hovered) {
      drawRoadGeneratedPath(path, 'rgba(200,74,58,.45)', 1, [4, 4]);
      if (selected) {
        ctx.fillStyle = '#fff7ed';
        ctx.strokeStyle = '#c84a3a';
        ctx.lineWidth = 2 / state.view.scale;
        (track.pointsPx || []).forEach((point, index) => {
          const activePoint = Number.isInteger(state.selectedTrackPointIndex) && state.selectedTrackPointIndex === index;
          ctx.beginPath();
          ctx.arc(point.x, point.y, (activePoint ? 7 : 5) / state.view.scale, 0, Math.PI * 2);
          ctx.fillStyle = activePoint ? '#c84a3a' : '#fff7ed';
          ctx.strokeStyle = activePoint ? '#ffffff' : '#c84a3a';
          ctx.fill();
          ctx.stroke();
        });
        (track.curvesPx || []).forEach((curve, index) => {
          if (!curve) return;
          const start = track.pointsPx[index];
          const end = track.pointsPx[index + 1];
          if (!start || !end) return;
          ctx.save();
          ctx.strokeStyle = 'rgba(200,74,58,.42)';
          ctx.lineWidth = 1 / state.view.scale;
          ctx.setLineDash([3 / state.view.scale, 4 / state.view.scale]);
          ctx.beginPath();
          ctx.moveTo(start.x, start.y);
          ctx.lineTo(curve.x, curve.y);
          ctx.lineTo(end.x, end.y);
          ctx.stroke();
          ctx.restore();
          ctx.beginPath();
          ctx.arc(curve.x, curve.y, 5 / state.view.scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
        if (state.hoverTrackSegment && state.hoverTrackSegment.trackId === track.id) {
          const index = state.hoverTrackSegment.index;
          const start = track.pointsPx[index];
          const end = track.pointsPx[index + 1];
          const curve = track.curvesPx?.[index];
          if (start && end) {
            ctx.save();
            ctx.strokeStyle = '#d79631';
            ctx.lineWidth = 5 / state.view.scale;
            ctx.globalAlpha = .65;
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            if (curve) ctx.quadraticCurveTo(curve.x, curve.y, end.x, end.y);
            else ctx.lineTo(end.x, end.y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
      const center = polygonCenter(path);
      drawLabel(`${track.name || 'Track'} · ${fmt(track.gaugeMm || 9)} mm gauge`, { x: center.x + 8 / state.view.scale, y: center.y - 8 / state.view.scale });
    }
    ctx.restore();
  }

  return { drawTrack };
}
