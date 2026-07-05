# Road Intersection Override Model

This document describes the saved-data-safe override helper added in:

- `js/site-planner/road-intersection-overrides.js`

It is designed to sit between generated intersection geometry and future Site Planner UI controls.

## Purpose

Generated intersections should remain derived data. User choices should be saved as compact override records keyed to stable road/arm signatures.

Supported override behaviors:

- Disable an entire generated intersection.
- Disable crosswalks for an entire intersection.
- Disable stop bars for an entire intersection.
- Disable tactile paving for an entire intersection.
- Disable curb guide rendering for an entire intersection.
- Override curb radius metadata.
- Override sidewalk bulb radius metadata.
- Disable or adjust generated details per road arm.
- Prune stale overrides after roads are deleted or changed.

## Recommended saved state field

```js
state.roadIntersectionOverrides = {
  schemaVersion: 1,
  overrides: {
    't-junction::road_1:end|road_2:throughA|road_2:throughB': {
      schemaVersion: 1,
      key: 't-junction::road_1:end|road_2:throughA|road_2:throughB',
      enabled: true,
      crosswalksEnabled: true,
      stopBarsEnabled: true,
      tactilePaversEnabled: true,
      curbGuidesEnabled: true,
      curbRadiusPx: null,
      sidewalkBulbRadiusPx: null,
      arms: {
        'road_1:end': {
          key: 'road_1:end',
          crosswalkEnabled: false,
          stopBarEnabled: true,
          tactilePaversEnabled: true
        }
      }
    }
  }
};
```

The helper currently consumes either the nested `.overrides` object or a direct map, depending on how Codex chooses to store it.

## Basic usage

```js
import { buildRoadIntersections } from './site-planner/road-intersections.js';
import {
  applyIntersectionOverrides,
  upsertIntersectionOverride,
  upsertArmOverride,
  pruneStaleIntersectionOverrides,
} from './site-planner/road-intersection-overrides.js';

const generated = buildRoadIntersections(state.roads, { normalizeRoad });
const effective = applyIntersectionOverrides(generated, state.roadIntersectionOverrides?.overrides || {});

state.roadIntersectionOverrides.overrides = pruneStaleIntersectionOverrides(
  state.roadIntersectionOverrides.overrides,
  generated
);
```

## UI examples

Disable all details at a selected intersection:

```js
state.roadIntersectionOverrides.overrides = upsertIntersectionOverride(
  state.roadIntersectionOverrides.overrides,
  selectedIntersection,
  { enabled: false }
);
```

Disable crosswalk on one road arm:

```js
state.roadIntersectionOverrides.overrides = upsertArmOverride(
  state.roadIntersectionOverrides.overrides,
  selectedIntersection,
  selectedArm,
  { crosswalkEnabled: false }
);
```

Override curb radius:

```js
state.roadIntersectionOverrides.overrides = upsertIntersectionOverride(
  state.roadIntersectionOverrides.overrides,
  selectedIntersection,
  { curbRadiusPx: 28 }
);
```

## Recommended Codex wiring order

1. Add default project-state field:

```js
roadIntersectionOverrides: {
  schemaVersion: 1,
  overrides: {}
}
```

2. After generating intersections, apply overrides:

```js
const generated = buildRoadIntersections(state.roads, { normalizeRoad });
state.generatedRoadIntersections = applyIntersectionOverrides(
  generated,
  state.roadIntersectionOverrides?.overrides || {}
);
```

3. Render/export using `state.generatedRoadIntersections` after overrides are applied.

4. Add simple global/per-node UI later:
   - intersection enabled
   - crosswalks enabled
   - stop bars enabled
   - tactile paving enabled
   - curb guides enabled
   - curb radius

5. Add per-arm UI after selection support:
   - crosswalk enabled for this arm
   - stop bar enabled for this arm
   - tactile paving enabled for this arm

6. Prune stale overrides after road deletion or major road geometry edits.

## Notes

- Override keys are based on intersection type and road arm keys, not generated coordinates.
- Coordinate fallback exists only for unusual cases with missing arms.
- Overrides intentionally do not store generated polygon geometry.
- This keeps project files compact and allows future generator improvements to affect existing projects unless explicitly overridden.

## Verification checklist

- Disabling an intersection removes its generated details.
- Disabling crosswalks keeps stop bars/tactile settings independent.
- Disabling one arm crosswalk leaves other arms intact.
- Removing a road and pruning overrides removes stale entries.
- Saved project JSON remains small and does not duplicate generated polygons.
