export function createCanvasHoverPreviewRenderer({
  ctx,
  state,
  mmToPx,
  drawLabel,
  githubPlacementPreviewPolygon,
}) {
  function drawHoverPreview() {
    const placement = state.githubBuildingPlacement;
    if (placement?.previewPoint) {
      const polygon = githubPlacementPreviewPolygon(placement, placement.previewPoint, mmToPx);
      if (polygon.length >= 3) {
        ctx.save();
        ctx.strokeStyle = 'rgba(15,118,110,.95)';
        ctx.fillStyle = 'rgba(15,118,110,.14)';
        ctx.lineWidth = 2 / state.view.scale;
        ctx.setLineDash([7 / state.view.scale, 5 / state.view.scale]);
        ctx.beginPath();
        polygon.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        drawLabel(`Place ${placement.record?.name || placement.record?.id || 'building'}`, {
          x: placement.previewPoint.x + 10 / state.view.scale,
          y: placement.previewPoint.y - 10 / state.view.scale,
        });
        ctx.restore();
      }
    }

    const hoverPreview = state.hoverPreview;
    if (!hoverPreview) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(15,118,110,.85)';
    ctx.fillStyle = 'rgba(15,118,110,.16)';
    ctx.lineWidth = 1.5 / state.view.scale;
    ctx.beginPath();
    ctx.arc(hoverPreview.point.x, hoverPreview.point.y, (hoverPreview.kind === 'handle' ? 12 : 7) / state.view.scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (hoverPreview.label) {
      drawLabel(hoverPreview.label, {
        x: hoverPreview.point.x + 10 / state.view.scale,
        y: hoverPreview.point.y - 10 / state.view.scale,
      });
    }
    ctx.restore();
  }

  return { drawHoverPreview };
}
