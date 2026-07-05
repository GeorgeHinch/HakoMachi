# Road Intersection Engine

This document describes the pure intersection geometry module added in:

- `js/site-planner/road-intersections.js`

The module is intentionally not wired into `site-planner.js` yet. It is designed so Codex can connect it later without inventing the road/intersection geometry model.

## Purpose

Generate intersection metadata and detail placement geometry from existing centerline roads:

- intersection nodes
- dead-end / straight / corner / T / cross / multi-junction classification
- curb return metadata
- sidewalk bulb radii
- crosswalk rectangles and stripe rectangles
- stop bars
- tactile paving rectangles

## Inputs

`buildRoadIntersections(roads, options)` expects normalized Site Planner road objects with at least:

```js
{
  id: 'road_1',
  mode: 'centerline',
  hidden: false,
  widthPx: 48,
  sidewalkSide: 'both',
  sidewalkWidthPx: 10,
  pointsPx: [{ x: 0, y: 0 }, { x: 100, y: 0 }],
  curvesPx: []
}
```

The function accepts an optional `normalizeRoad` callback so Codex can pass the existing Site Planner road normalizer:

```js
const intersections = buildRoadIntersections(state.roads, {
  normalizeRoad,
  clusterPx: 18,
  endpointSnapPx: 8,
});
```

## Output shape

Each returned intersection node has this shape:

```js
{
  id: 'intersection_1',
  type: 't-junction',
  x: 120,
  y: 80,
  center: { x: 120, y: 80 },
  arms: [
    {
      roadId: 'road_1',
      endpoint: 'end',
      pointIndex: 1,
      point: { x: 120, y: 80 },
      widthPx: 48,
      sidewalkWidthPx: 10,
      tangent: 3.14
    }
  ],
  maxRoadWidthPx: 48,
  maxSidewalkWidthPx: 10,
  curbRadiusPx: 40.8,
  sidewalkBulbRadiusPx: 56.3,
  curbReturns: [],
  crosswalks: [],
  stopBars: [],
  tactilePavers: []
}
```

## Integration points

### Rendering

Use `buildRoadIntersections(state.roads, { normalizeRoad })` before drawing road overlays.

Suggested rendering behavior:

- Draw `curbReturns` as preview arcs or construction handles.
- Draw `crosswalks[].stripes[].corners` as white/etch rectangles.
- Draw `stopBars[].corners` as white/etch rectangles.
- Draw `tactilePavers[].corners` as yellow/tan/etch rectangles.

### Export

For SVG export, convert rectangle `corners` arrays to paths:

```js
function polygonPath(points) {
  return `M ${points[0].x} ${points[0].y} ` +
    points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ') +
    ' Z';
}
```

Recommended export layers:

- `roadMarkingEtch` for crosswalk stripes and stop bars
- `roadTactileEtch` or `roadMarkingEtch` for tactile paving
- optional `roadCurbGuide` for curb return guides

### Editing UI

Start read-only/generated:

1. Add a road detail setting such as `state.roadIntersectionDetails = true`.
2. Draw generated details as overlay elements.
3. Later add per-intersection overrides:
   - disable generated crosswalks
   - disable stop bars
   - curb radius override
   - crosswalk offset override
   - tactile paving enabled/disabled

## Suggested Codex wiring order

1. Import `buildRoadIntersections` into the current Site Planner road rendering path.
2. Generate intersections after roads are normalized and road geometry is rebuilt.
3. Draw generated crosswalk/stop-bar/tactile rectangles as preview overlays.
4. Add the same generated geometry to SVG export.
5. Add UI toggles and per-node overrides.
6. Add tests for T-junction, cross-junction, and curved endpoint behavior.

## Notes

- This module is pure and does not mutate `state`.
- It reuses existing `road-geometry.js` helpers.
- It intentionally returns geometry rather than drawing directly, so it can power preview, SVG export, and future interactive editing from the same data.
