# Road Feature Migration Helper

This document describes:

- `js/site-planner/road-feature-migration.js`

It normalizes older/ad-hoc road marking and hatch feature objects into the new preset/material-role model.

## Basic usage

```js
import { migrateRoadFeatures } from './site-planner/road-feature-migration.js';

state.roadFeatures = migrateRoadFeatures(state.roadFeatures, activeMaterialProfile.library);
```

## What it migrates

Marking aliases:

- `stop` -> `stopLine`
- `crosswalk` / `zebra` -> `zebraCrosswalk`
- `bicycle` -> `bicycleCrossing`
- `arrow` / `straightArrow` -> `laneArrowStraight`
- `leftArrow` -> `laneArrowLeft`
- `rightArrow` -> `laneArrowRight`
- `tomare` -> `stopTextTomare`
- `diamond` -> `diamondWarning`
- `chevron` -> `chevronBuffer`
- `safety` -> `safetyZoneBox`

Hatch aliases:

- `manhole` / `round` -> `round600`
- `largeManhole` -> `round900`
- `drain` / `rectDrain` -> `rectDrainSmall`
- `grate` / `trench` -> `rectDrainLong`

## Codex wiring recommendation

1. Use this helper during project load/import only.
2. Do not run it continuously on every render.
3. After migration, save using the normal project save path.
4. Show a non-blocking status message with `roadFeatureMigrationSummary()` if any features changed.

## Existing code to remove after integration

After this is wired, remove duplicated migration/alias code from `site-planner.js` or any ad-hoc import path that maps older road marking strings by hand.

## Verification checklist

- Old stop/crosswalk/arrow features map to preset keys.
- Old manhole/drain features map to hatch presets.
- Material roles are applied after preset migration.
- Unknown features are returned unchanged.
- Migration runs on load/import, not during every draw frame.
