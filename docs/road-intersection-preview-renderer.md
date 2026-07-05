# Road Intersection Preview Renderer

This document describes the pure canvas preview helper added in:

- `js/site-planner/road-intersection-preview-renderer.js`

It is designed to render the output of `road-intersections.js` without touching Site Planner state directly.

## Purpose

Draw generated intersection detail overlays on the existing Site Planner 2D canvas:

- crosswalk stripes
- stop bars
- tactile paving rectangles
- curb return guide arcs
- intersection nodes
- optional labels

## Basic usage

```js
import { buildRoadIntersections } from './site-planner/road-intersections.js';
import { drawRoadIntersections } from './site-planner/road-intersection-preview-renderer.js';

const intersections = buildRoadIntersections(state.roads, { normalizeRoad });
const counts = drawRoadIntersections(ctx, intersections, {
  viewScale: state.view.scale,
  showLabels: false,
  showCurbGuides: true,
});
```

## Options

```js
{
  viewScale: 1,
  showNodes: true,
  showLabels: false,
  showCurbGuides: true,
  showCrosswalks: true,
  showStopBars: true,
  showTactilePavers: true,
  styles: {
    crosswalkFill: 'rgba(247, 242, 223, 0.88)',
    crosswalkStroke: 'rgba(247, 242, 223, 0.98)',
    stopBarFill: 'rgba(247, 242, 223, 0.95)',
    stopBarStroke: 'rgba(247, 242, 223, 1)',
    tactileFill: 'rgba(216, 185, 90, 0.55)',
    tactileStroke: 'rgba(140, 106, 47, 0.85)',
    curbGuideStroke: 'rgba(138, 118, 95, 0.75)',
    nodeFill: 'rgba(200, 74, 58, 0.22)',
    nodeStroke: 'rgba(200, 74, 58, 0.75)',
    labelFill: 'rgba(255, 253, 247, 0.92)',
    labelStroke: 'rgba(112, 96, 72, 0.38)',
    labelText: '#3d3024',
  }
}
```

## Return value

`drawRoadIntersections()` returns draw counts that can be displayed in debug/status UI:

```js
{
  intersections: 3,
  curbGuides: 8,
  tactilePavers: 12,
  crosswalkStripes: 24,
  stopBars: 6,
  nodes: 3,
  labels: 0
}
```

## Codex wiring steps

After PR #197 is merged:

1. Import the engine and renderer into the Site Planner 2D rendering path.
2. Generate derived intersections after road geometry is normalized/rebuilt.
3. In the road overlay draw pass, call:

```js
drawRoadIntersections(ctx, state.generatedRoadIntersections, {
  viewScale: state.view.scale,
  showLabels: state.debugRoadIntersections,
  showCurbGuides: state.debugRoadIntersections || state.showRoadCurbGuides,
});
```

4. Add a global UI toggle first:

- `Show automatic intersection details`

5. Later add debug toggles:

- `Show intersection nodes`
- `Show curb guides`
- `Show intersection labels`

## Suggested draw order

Draw after road surfaces and sidewalks, before selected-road handles:

1. road surfaces
2. sidewalks
3. generated intersection details
4. road centerlines / edit handles
5. selected item overlays

This keeps markings visible but does not hide editing handles.

## Verification checklist

- T-junction: crosswalks/stop bars align with each arm.
- Four-way: generated details appear on all arms.
- Sidewalk roads: tactile paving appears near crosswalk edges.
- Roads without sidewalks: tactile paving does not appear.
- Curb guide arcs are visible only when enabled.
- Labels are off by default.
- Zooming keeps strokes visually reasonable through `viewScale`.
