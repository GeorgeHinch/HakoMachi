# Road Intersection SVG Export Serializer

This document describes the pure SVG serialization helper added in:

- `js/site-planner/road-intersection-svg-export.js`

It is designed to sit between the road intersection engine and the existing Site Planner SVG export flow.

## Purpose

Convert generated intersection geometry into export-ready SVG path records.

Supported generated detail types:

- crosswalk stripes
- stop bars
- tactile paving rectangles
- optional curb return guide arcs

## Basic usage

```js
import { buildRoadIntersections } from './site-planner/road-intersections.js';
import {
  serializeRoadIntersections,
  groupIntersectionSvgRecordsByLayer,
  renderIntersectionSvgGroups,
} from './site-planner/road-intersection-svg-export.js';

const intersections = buildRoadIntersections(state.roads, { normalizeRoad });
const records = serializeRoadIntersections(intersections, {
  includeCurbGuides: false,
});
const groups = groupIntersectionSvgRecordsByLayer(records);
```

## Record shape

Each serializer output record is plain data:

```js
{
  type: 'crosswalkStripe',
  layer: 'roadMarkingEtch',
  intersectionId: 'intersection_1',
  roadId: 'road_1',
  endpoint: 'end',
  index: '0.2',
  d: 'M 10 10 L 20 10 L 20 14 L 10 14 Z',
  style: {
    fill: '#f7f2df',
    stroke: '#f7f2df',
    'stroke-width': 0.15
  }
}
```

## Recommended layer mapping

Defaults:

- crosswalk stripes -> `roadMarkingEtch`
- stop bars -> `roadMarkingEtch`
- tactile paving -> `roadTactileEtch`
- curb guides -> `roadCurbGuide`

Override with:

```js
const records = serializeRoadIntersections(intersections, {
  layerNames: {
    crosswalk: 'roadMarkingEtch',
    stopBar: 'roadMarkingEtch',
    tactile: 'roadMarkingEtch',
    curbGuide: 'roadCurbGuide',
  },
});
```

## Styling

The serializer includes default preview/export styles. Existing export code can ignore them and map only by `layer` and `d` if preferred.

Override styles with:

```js
const records = serializeRoadIntersections(intersections, {
  styles: {
    crosswalk: { fill: '#ffffff', stroke: 'none' },
    stopBar: { fill: '#ffffff', stroke: 'none' },
    tactile: { fill: '#d8b95a', stroke: '#8c6a2f', 'stroke-width': 0.2 },
    curbGuide: { fill: 'none', stroke: '#888', 'stroke-dasharray': '2 1' },
  },
});
```

## String rendering helpers

For simple export integration:

```js
const svg = renderIntersectionSvgGroups(records);
```

This produces grouped SVG path elements:

```html
<g id="roadMarkingEtch" data-layer="roadMarkingEtch">
  <path d="..." data-road-id="road_1" data-intersection-id="intersection_1" />
</g>
```

For existing export builders that already create layers, prefer consuming the record data directly instead of injecting strings.

## Codex wiring steps

1. Generate intersections in the road asset export path:

```js
const intersections = buildRoadIntersections(state.roads, { normalizeRoad });
```

2. Serialize generated markings:

```js
const records = serializeRoadIntersections(intersections, {
  includeCurbGuides: false,
});
```

3. Add each record to the existing SVG export layer for `record.layer`.

4. For laser-cut semantics, treat:
   - `roadMarkingEtch` as visual/etch marking geometry
   - `roadTactileEtch` as visual/etch tactile marking geometry
   - `roadCurbGuide` as preview-only or disabled by default

5. Add a global setting before export:

```js
if (state.roadIntersectionDetails) {
  // serialize and export generated details
}
```

## Verification checklist

- T-junction exports crosswalk stripes and stop bars.
- Cross-junction exports markings on each arm.
- Tactile paving only appears when sidewalks exist.
- SVG export layer grouping matches existing road asset conventions.
- Export does not mutate or save generated geometry into project data.
- Curb guide export is disabled unless intentionally enabled.
