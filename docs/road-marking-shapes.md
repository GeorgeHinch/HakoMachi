# Road Marking Shape Generator

This document describes the pure geometry helper added in:

- `js/site-planner/road-marking-shapes.js`

It converts road marking preset metadata from `road-marking-presets.js` into SVG/canvas-friendly geometry records.

## Supported draw types

- `bar`
- `solidLine`
- `dashedLine`
- `curbDash`
- `crosswalk`
- `bicycleCrossing`
- `arrowStraight`
- `arrowLeft`
- `arrowRight`
- `arrowStraightLeft`
- `arrowStraightRight`
- `diamond`
- `chevronZone`
- `safetyZone`
- `roadText`
- `speedNumber`

## Basic usage

```js
import {
  buildRoadMarkingShapes,
  buildRoadMarkingSvgRecords,
} from './site-planner/road-marking-shapes.js';

const shapes = buildRoadMarkingShapes('zebraCrosswalk', {
  x: 120,
  y: 80,
  angle: Math.PI / 2,
});

const records = buildRoadMarkingSvgRecords('laneArrowStraight', {
  x: 30,
  y: 40,
  angle: 0,
});
```

## Output shape

Polygon output:

```js
{
  type: 'crosswalkStripe',
  layer: 'roadMarkingEtch',
  presetKey: 'zebraCrosswalk',
  points: [{ x: 1, y: 2 }],
  d: 'M ... Z'
}
```

Text output:

```js
{
  type: 'text',
  text: '止まれ',
  x: 120,
  y: 80,
  angle: 1.5708,
  widthMm: 4.8,
  depthMm: 7,
  layer: 'roadMarkingEtch',
  presetKey: 'stopTextTomare'
}
```

## Codex wiring recommendation

1. Keep any existing inline rendering code temporarily as wrappers.
2. Replace duplicate per-marking shape logic with calls to `buildRoadMarkingShapes()`.
3. Use the same generated records for:
   - 2D canvas preview
   - road asset SVG export
   - generated marking hit boxes
4. For `text` records, Codex should map the record to the existing SVG text export or convert text to paths later.

## Existing code to remove after integration

Once this is wired, remove any duplicated shape construction code in `site-planner.js` or road rendering/export helpers for:

- crosswalk stripe rectangle loops
- dashed line segment loops
- stop-bar rectangle generation
- lane arrow polygon hard-coding
- diamond warning polygon hard-coding
- chevron/safety-zone local construction
- text marking ad-hoc sizing logic

## Verification checklist

- Zebra crosswalk creates repeated stripe records.
- Stop line creates one bar record.
- Dashed center line creates multiple dash records.
- Straight/left/right arrows create polygon records.
- Stop text / speed numbers create text records.
- Transform `{ x, y, angle }` correctly rotates and positions generated polygons.
- Output layers match `roadMarkingEtch` unless overridden by the preset.
