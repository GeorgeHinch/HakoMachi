import { fmt, polygonCenter, rad } from './geometry.js';
import { roadEdgePaths } from './road-geometry.js';
import { roadEndpointJunctions } from './road-network.js';

export function createRoadRenderer2dController({
  ctx,
  state,
  normalizeRoad,
  normalizeRoadFeature,
  markingPresetByKey,
  drawLabel,
  drawPoly,
  drawGeneratedPath,
}) {
  function drawRoadMarkingShape(feature) {
    const width = feature.widthPx || 30;
    const depth = feature.depthPx || 6;
    const draw = feature.markingDraw || markingPresetByKey(feature.markingPreset || feature.markingType).draw;
    if (draw === 'crosswalk') {
      const stripes = 5;
      const gap = width / (stripes + 1);
      const stripeWidth = Math.max(1.5 / state.view.scale, gap * 0.38);
      for (let index = 0; index < stripes; index++) ctx.fillRect(-width / 2 + gap * (index + 1) - stripeWidth / 2, -depth / 2, stripeWidth, depth);
    } else if (draw === 'bicycleCrossing') {
      ctx.lineWidth = Math.max(0.8 / state.view.scale, depth * 0.12);
      ctx.strokeRect(-width / 2, -depth / 2, width, depth);
      ctx.beginPath();
      ctx.moveTo(-width / 2, -depth * 0.12);
      ctx.lineTo(width / 2, -depth * 0.12);
      ctx.moveTo(-width / 2, depth * 0.12);
      ctx.lineTo(width / 2, depth * 0.12);
      ctx.stroke();
    } else if (draw === 'diamond') {
      ctx.beginPath();
      ctx.moveTo(0, -depth / 2);
      ctx.lineTo(width / 2, 0);
      ctx.lineTo(0, depth / 2);
      ctx.lineTo(-width / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (draw === 'arrow') {
      ctx.beginPath();
      ctx.moveTo(0, -depth / 2);
      ctx.lineTo(width / 2, -depth * 0.05);
      ctx.lineTo(width * 0.18, -depth * 0.05);
      ctx.lineTo(width * 0.18, depth / 2);
      ctx.lineTo(-width * 0.18, depth / 2);
      ctx.lineTo(-width * 0.18, -depth * 0.05);
      ctx.lineTo(-width / 2, -depth * 0.05);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (draw === 'dashedLine' || draw === 'curbDash') {
      const segments = draw === 'curbDash' ? 4 : 3;
      const segmentWidth = width / (segments * 2 - 1);
      for (let index = 0; index < segments; index++) ctx.fillRect(-width / 2 + index * segmentWidth * 2, -depth / 2, segmentWidth, depth);
    } else if (draw === 'chevronZone') {
      ctx.lineWidth = Math.max(1 / state.view.scale, depth * 0.08);
      ctx.strokeRect(-width / 2, -depth / 2, width, depth);
      const count = 5;
      for (let index = 0; index < count; index++) {
        const x = -width / 2 + (index + 0.5) * width / count;
        ctx.beginPath();
        ctx.moveTo(x - width / count * 0.35, depth / 2);
        ctx.lineTo(x + width / count * 0.35, -depth / 2);
        ctx.stroke();
      }
    } else if (draw === 'safetyZone') {
      ctx.lineWidth = Math.max(1 / state.view.scale, depth * 0.08);
      ctx.strokeRect(-width / 2, -depth / 2, width, depth);
      ctx.beginPath();
      ctx.moveTo(-width / 2, 0);
      ctx.lineTo(width / 2, 0);
      ctx.stroke();
      const count = 4;
      for (let index = 0; index < count; index++) {
        const x = -width / 2 + (index + 0.5) * width / count;
        ctx.beginPath();
        ctx.moveTo(x - width / count * 0.25, depth / 2);
        ctx.lineTo(x + width / count * 0.25, -depth / 2);
        ctx.stroke();
      }
    } else if (draw === 'box') {
      ctx.lineWidth = Math.max(1 / state.view.scale, depth * 0.10);
      ctx.strokeRect(-width / 2, -depth / 2, width, depth);
      ctx.beginPath();
      ctx.moveTo(-width / 2, -depth * 0.15);
      ctx.lineTo(width / 2, -depth * 0.15);
      ctx.moveTo(-width / 2, depth * 0.15);
      ctx.lineTo(width / 2, depth * 0.15);
      ctx.stroke();
    } else if (draw === 'speedNumber') {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${Math.max(6, depth * 1.15)}px system-ui, sans-serif`;
      ctx.fillText(feature.text || '30', 0, 0);
      ctx.restore();
    } else {
      ctx.fillRect(-width / 2, -depth / 2, width, depth);
      ctx.strokeRect(-width / 2, -depth / 2, width, depth);
    }
  }

  function drawRoadFeature(rawFeature) {
    const feature = normalizeRoadFeature(rawFeature);
    if (!feature || feature.hidden) return;
    const selected = feature.id === state.selectedRoadFeatureId;
    const hovered = feature.id === state.hoverRoadFeatureId;
    ctx.save();
    ctx.translate(feature.x, feature.y);
    ctx.rotate(rad(feature.rotationDeg || 0));
    ctx.lineWidth = (selected || hovered ? 2.5 : 1.5) / state.view.scale;
    if (feature.kind === 'manhole') {
      ctx.strokeStyle = selected ? '#d95f24' : (feature.color || '#3a2b1e');
      ctx.fillStyle = 'rgba(58,43,30,.18)';
      if (feature.hatchShape === 'circle') {
        const radius = (feature.diameterPx || 18) / 2;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-radius * 0.65, 0);
        ctx.lineTo(radius * 0.65, 0);
        ctx.moveTo(0, -radius * 0.65);
        ctx.lineTo(0, radius * 0.65);
        ctx.stroke();
      } else {
        const width = feature.widthPx || 24;
        const depth = feature.depthPx || 18;
        ctx.beginPath();
        ctx.rect(-width / 2, -depth / 2, width, depth);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-width / 2, depth / 2);
        ctx.lineTo(width / 2, -depth / 2);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = selected ? '#d95f24' : (feature.color || '#f7f2df');
      ctx.fillStyle = feature.color || '#f7f2df';
      drawRoadMarkingShape(feature);
    }
    if (selected) {
      ctx.setLineDash([4 / state.view.scale, 3 / state.view.scale]);
      ctx.strokeStyle = '#d95f24';
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(feature.widthPx || 0, feature.depthPx || 0, feature.diameterPx || 0) / 2 + 6 / state.view.scale, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRoadJunctions() {
    const junctions = roadEndpointJunctions(state.roads, { normalizeRoad, selectedRoadId: state.selectedRoadId });
    if (!junctions.length) return;
    ctx.save();
    junctions.forEach(junction => {
      const roadRadius = Math.max(4 / state.view.scale, junction.radius);
      if (junction.hasSidewalkBulb) {
        ctx.fillStyle = 'rgba(226,214,188,.84)';
        ctx.strokeStyle = junction.selected ? '#c84a3a' : 'rgba(154,140,105,.85)';
        ctx.lineWidth = (junction.selected ? 1.8 : 1.1) / state.view.scale;
        ctx.beginPath();
        ctx.arc(junction.x, junction.y, Math.max(roadRadius + 2 / state.view.scale, junction.sidewalkRadius), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = junction.selected ? 'rgba(200,74,58,.30)' : 'rgba(111,106,94,.52)';
      ctx.strokeStyle = junction.selected ? '#c84a3a' : 'rgba(70,68,62,.82)';
      ctx.lineWidth = (junction.selected ? 2.2 : 1.4) / state.view.scale;
      ctx.beginPath();
      ctx.arc(junction.x, junction.y, roadRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = junction.selected ? '#c84a3a' : '#6f6a5e';
      ctx.beginPath();
      ctx.arc(junction.x, junction.y, 3.5 / state.view.scale, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  function drawRoad(rawRoad) {
    const road = normalizeRoad(rawRoad);
    if (!road || road.hidden) return;
    const selected = road.id === state.selectedRoadId;
    const hovered = road.id === state.hoverRoadId;
    const roadPolygon = road.roadPolygonPx || [];
    ctx.save();
    for (const sidewalk of (road.sidewalkPolygonsPx || [])) {
      ctx.fillStyle = 'rgba(226,214,188,.72)';
      ctx.strokeStyle = selected ? '#c84a3a' : '#b9aa86';
      ctx.lineWidth = (selected ? 2.2 : 1.4) / state.view.scale;
      drawPoly(sidewalk.polygon, true);
    }
    ctx.fillStyle = selected ? 'rgba(200,74,58,.26)' : (hovered ? 'rgba(111,106,94,.46)' : 'rgba(111,106,94,.36)');
    ctx.strokeStyle = selected ? '#c84a3a' : (hovered ? '#2a64aa' : '#6f6a5e');
    ctx.lineWidth = (selected || hovered ? 3 : 2.2) / state.view.scale;
    drawPoly(roadPolygon, true);
    if (road.mode === 'centerline' && road.pointsPx?.length >= 2) {
      const edges = roadEdgePaths(road);
      drawGeneratedPath(edges.left, selected ? '#c84a3a' : 'rgba(70,68,62,.75)', selected ? 2.2 : 1.4);
      drawGeneratedPath(edges.right, selected ? '#c84a3a' : 'rgba(70,68,62,.75)', selected ? 2.2 : 1.4);
      for (const sidewalk of (road.sidewalkPolygonsPx || [])) {
        const polygon = sidewalk.polygon || [];
        if (polygon.length >= 2) drawGeneratedPath(polygon.concat([polygon[0]]), selected ? '#c84a3a' : 'rgba(154,140,105,.75)', selected ? 1.8 : 1.1);
      }
      ctx.strokeStyle = selected ? 'rgba(42,42,40,.85)' : 'rgba(42,42,40,.45)';
      ctx.lineWidth = (selected ? 1.6 : 1.15) / state.view.scale;
      ctx.setLineDash([6 / state.view.scale, 5 / state.view.scale]);
      ctx.beginPath();
      road.pointsPx.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else {
          const curve = road.curvesPx?.[index - 1];
          if (curve) ctx.quadraticCurveTo(curve.x, curve.y, point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();
      ctx.setLineDash([]);
      if (selected || hovered) {
        ctx.fillStyle = selected ? '#c84a3a' : '#2a64aa';
        road.pointsPx.forEach(point => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 4 / state.view.scale, 0, Math.PI * 2);
          ctx.fill();
        });
        if (road.curvesPx) {
          ctx.strokeStyle = 'rgba(200,74,58,.42)';
          ctx.lineWidth = 1 / state.view.scale;
          ctx.setLineDash([3 / state.view.scale, 4 / state.view.scale]);
          road.curvesPx.forEach((curve, index) => {
            if (!curve) return;
            const a = road.pointsPx[index];
            const b = road.pointsPx[index + 1];
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(curve.x, curve.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          });
          ctx.setLineDash([]);
          ctx.fillStyle = '#fff';
          ctx.strokeStyle = '#c84a3a';
          ctx.lineWidth = 2 / state.view.scale;
          road.curvesPx.forEach(curve => {
            if (!curve) return;
            ctx.beginPath();
            ctx.arc(curve.x, curve.y, 5 / state.view.scale, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          });
        }
        if (state.hoverRoadSegment && state.hoverRoadSegment.roadId === road.id) {
          const index = state.hoverRoadSegment.index;
          const a = road.pointsPx[index];
          const b = road.pointsPx[index + 1];
          const curve = road.curvesPx?.[index];
          ctx.save();
          ctx.strokeStyle = '#d79631';
          ctx.lineWidth = 5 / state.view.scale;
          ctx.globalAlpha = 0.65;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          if (curve) ctx.quadraticCurveTo(curve.x, curve.y, b.x, b.y);
          else ctx.lineTo(b.x, b.y);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
    if (road.mode === 'outline' && (selected || hovered)) {
      const editing = selected && state.roadOutlineEditId === road.id;
      if (editing) {
        ctx.fillStyle = '#fff7ed';
        ctx.strokeStyle = '#c84a3a';
        ctx.lineWidth = 2 / state.view.scale;
        (road.pointsPx || []).forEach(point => {
          ctx.beginPath();
          ctx.arc(point.x, point.y, 5 / state.view.scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
        (road.curvesPx || []).forEach((curve, index) => {
          if (!curve) return;
          const a = road.pointsPx[index];
          const b = road.pointsPx[(index + 1) % road.pointsPx.length];
          ctx.save();
          ctx.strokeStyle = 'rgba(200,74,58,.42)';
          ctx.lineWidth = 1 / state.view.scale;
          ctx.setLineDash([3 / state.view.scale, 4 / state.view.scale]);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(curve.x, curve.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          ctx.restore();
          ctx.beginPath();
          ctx.arc(curve.x, curve.y, 5 / state.view.scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        });
        if (state.hoverRoadSegment && state.hoverRoadSegment.roadId === road.id) {
          const index = state.hoverRoadSegment.index;
          const a = road.pointsPx[index];
          const b = road.pointsPx[(index + 1) % road.pointsPx.length];
          const curve = road.curvesPx?.[index];
          ctx.save();
          ctx.strokeStyle = '#d79631';
          ctx.lineWidth = 6 / state.view.scale;
          ctx.globalAlpha = 0.65;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          if (curve) ctx.quadraticCurveTo(curve.x, curve.y, b.x, b.y);
          else ctx.lineTo(b.x, b.y);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
    if (selected || hovered) {
      const center = polygonCenter(roadPolygon || road.pointsPx || []);
      const extra = road.mode === 'centerline' ? ` · ${fmt(road.widthMm)} mm` : (state.roadOutlineEditId === road.id ? ' · editing outline' : '');
      drawLabel(`${road.name || 'Road'}${extra}`, { x: center.x + 8 / state.view.scale, y: center.y - 8 / state.view.scale });
    }
    ctx.restore();
  }

  return {
    drawRoad,
    drawRoadFeature,
    drawRoadJunctions,
    drawRoadMarkingShape,
  };
}
