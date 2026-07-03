import { clamp, polygonCenter } from './geometry.js';
import { lineIntersection, pathTotalLength, pointAtPathDistance, roadCenterlineSamples, sidewalkTotalWidthPx } from './road-geometry.js';
import { isNearJunctionPoint, roadJunctionPoints } from './road-network.js';

export function createRoadExportController({
  state,
  ctx = null,
  mmToPx,
  dist,
  normalizeRoad,
  normalizeBenchworkOutline,
  benchworkPathSamples,
  drawLabel = () => {},
  updateRoadExportBadge = () => {},
  syncAll = () => {},
}) {
  function benchworkBoundaryDistances(path) {
    const hits = [];
    if (!path?.length) return hits;
    for (const rawBenchwork of (state.benchworkOutlines || [])) {
      const benchwork = normalizeBenchworkOutline(rawBenchwork);
      const outline = benchworkPathSamples(benchwork, 10);
      if (outline.length < 2) continue;
      let accumulated = 0;
      for (let roadIndex = 1; roadIndex < path.length; roadIndex++) {
        const a = path[roadIndex - 1];
        const b = path[roadIndex];
        const segmentLength = dist(a, b);
        for (let outlineIndex = 1; outlineIndex < outline.length; outlineIndex++) {
          const hit = lineIntersection(a, b, outline[outlineIndex - 1], outline[outlineIndex]);
          if (hit) hits.push({ distance: accumulated + dist(a, hit), point: hit, source: 'benchwork' });
        }
        accumulated += segmentLength;
      }
    }
    return hits;
  }

  function roadSeamLineAt(road, path, distance, options = {}) {
    const hit = pointAtPathDistance(path, distance);
    if (!hit) return null;
    const half = (road.widthPx || 20) / 2 + sidewalkTotalWidthPx(road) + 3;
    const angle = hit.tangent + Math.PI / 2;
    return {
      roadId: road.id,
      x: hit.point.x,
      y: hit.point.y,
      x1: hit.point.x + Math.cos(angle) * half,
      y1: hit.point.y + Math.sin(angle) * half,
      x2: hit.point.x - Math.cos(angle) * half,
      y2: hit.point.y - Math.sin(angle) * half,
      distance,
      source: options.source || 'length',
    };
  }

  function outlineSeams(road, maxPiecePx) {
    const polygon = road.roadPolygonPx || [];
    if (polygon.length < 3) return [];
    const xs = polygon.map(point => point.x);
    const ys = polygon.map(point => point.y);
    const bounds = {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const seams = [];
    if (Math.max(width, height) <= maxPiecePx * 1.15) return seams;
    if (width >= height) {
      const count = Math.floor(width / maxPiecePx);
      for (let index = 1; index <= count; index++) {
        const x = bounds.minX + index * width / (count + 1);
        seams.push({ roadId: road.id, x, y: (bounds.minY + bounds.maxY) / 2, x1: x, y1: bounds.minY, x2: x, y2: bounds.maxY, source: 'outline' });
      }
    } else {
      const count = Math.floor(height / maxPiecePx);
      for (let index = 1; index <= count; index++) {
        const y = bounds.minY + index * height / (count + 1);
        seams.push({ roadId: road.id, x: (bounds.minX + bounds.maxX) / 2, y, x1: bounds.minX, y1: y, x2: bounds.maxX, y2: y, source: 'outline' });
      }
    }
    return seams;
  }

  function generateRoadExportData() {
    syncAll();
    const maxPiecePx = Math.max(12, mmToPx(state.roadExportSettings?.maxPieceMm || 120));
    const avoidPx = Math.max(4, mmToPx(state.roadExportSettings?.avoidJunctionMm || 18));
    const minPiecePx = Math.max(4, mmToPx(state.roadExportSettings?.minPieceMm || 35));
    const junctions = roadJunctionPoints(state.roads, { normalizeRoad, selectedRoadId: state.selectedRoadId });
    const roads = [];
    const seams = [];
    (state.roads || []).forEach(rawRoad => {
      const road = normalizeRoad(rawRoad);
      if (road.hidden) return;
      const record = {
        id: road.id,
        name: road.name || 'Road',
        mode: road.mode,
        roadPolygonPx: road.roadPolygonPx || [],
        sidewalkPolygonsPx: road.sidewalkPolygonsPx || [],
        seams: [],
      };
      if (road.mode === 'centerline') {
        const path = roadCenterlineSamples(road, 20);
        const total = pathTotalLength(path);
        const candidates = [];
        if (total > maxPiecePx * 1.15) {
          const count = Math.floor(total / maxPiecePx);
          for (let index = 1; index <= count; index++) candidates.push({ distance: index * total / (count + 1), source: 'length' });
        }
        benchworkBoundaryDistances(path)
          .filter(hit => hit.distance > minPiecePx && hit.distance < total - minPiecePx)
          .forEach(hit => candidates.push({ distance: hit.distance, source: 'benchwork' }));
        candidates.sort((a, b) => a.distance - b.distance);
        const used = [];
        for (const candidate of candidates) {
          let distance = candidate.distance;
          let hit = pointAtPathDistance(path, distance);
          if (!hit) continue;
          let tries = 0;
          while (isNearJunctionPoint(hit.point, junctions, avoidPx) && tries < 12) {
            distance += avoidPx * (tries % 2 ? -1 : 1) * (Math.floor(tries / 2) + 1);
            distance = clamp(distance, minPiecePx, total - minPiecePx);
            hit = pointAtPathDistance(path, distance);
            tries++;
          }
          if (!hit || isNearJunctionPoint(hit.point, junctions, avoidPx)) continue;
          if (used.some(value => Math.abs(value - distance) < minPiecePx)) continue;
          const seam = roadSeamLineAt(road, path, distance, { source: candidate.source });
          if (seam) {
            used.push(distance);
            record.seams.push(seam);
            seams.push(seam);
          }
        }
      } else {
        record.seams = outlineSeams(road, maxPiecePx);
        seams.push(...record.seams);
      }
      roads.push(record);
    });
    return { roads, seams, junctions, maxPiecePx, avoidPx };
  }

  function drawRoadExportPreview() {
    if (!ctx || !state.roadExportPreview) return;
    const data = generateRoadExportData();
    ctx.save();
    ctx.lineWidth = 2.2 / state.view.scale;
    ctx.setLineDash([8 / state.view.scale, 5 / state.view.scale]);
    data.seams.forEach((seam, index) => {
      ctx.strokeStyle = seam.source === 'benchwork' ? '#0f766e' : '#c84a3a';
      ctx.beginPath();
      ctx.moveTo(seam.x1, seam.y1);
      ctx.lineTo(seam.x2, seam.y2);
      ctx.stroke();
      drawLabel(`R${index + 1}`, { x: seam.x + 4 / state.view.scale, y: seam.y - 4 / state.view.scale });
    });
    ctx.setLineDash([]);
    data.roads.forEach((road, index) => {
      const polygon = road.roadPolygonPx || [];
      if (!polygon.length) return;
      const center = polygonCenter(polygon);
      drawLabel(`${road.name || `Road ${index + 1}`} · ${Math.max(1, (road.seams || []).length + 1)} pcs`, { x: center.x + 6 / state.view.scale, y: center.y - 8 / state.view.scale });
    });
    ctx.restore();
    updateRoadExportBadge(data);
  }

  return {
    benchworkBoundaryDistances,
    drawRoadExportPreview,
    generateRoadExportData,
    outlineSeams,
    roadSeamLineAt,
  };
}
