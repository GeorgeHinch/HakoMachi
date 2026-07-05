# Physical Road Drainage Grate Inserts

This document describes the laser-cut insert generator added in:

- `js/site-planner/road-drainage-grate-inserts.js`

It models drainage grates as real insert parts, not just visual hatch markings.

## Concept

A drainage grate can be made as a small physical insert that sits flush with the road surface:

1. Cut a rectangular opening through the road/deck material.
2. Cut a grate insert from thin material.
3. Cut see-through slots through the grate deck.
4. Score fold lines along the support tabs.
5. Fold the tabs downward so the part forms an upside-down U.
6. Drop the insert into the road opening so the top deck sits level with the road surface.

This allows the grate to be actually see-through while the folded tabs hold it up from below.

## Basic usage

```js
import { buildDrainageGrateInsert, drainageGrateSvgPaths } from './site-planner/road-drainage-grate-inserts.js';

const grate = buildDrainageGrateInsert({
  widthMm: 8,
  depthMm: 2,
  materialThicknessMm: 0.28,
  roadSurfaceThicknessMm: 1.5,
  clearanceMm: 0.08,
}, activeMaterialProfile.library);

const pathsByLayer = drainageGrateSvgPaths(grate);
```

## Output layers

The generated object includes these layers:

| Layer | Purpose |
| --- | --- |
| `roadDeckCut` | Opening to cut through the road surface |
| `grateCut` | Outer grate insert shape, support tabs, and see-through grate slots |
| `grateScore` | Fold score lines for support tabs |
| `grateGuide` | Non-cut assembly/preview guides |

## Default geometry

Default dimensions:

```js
{
  widthMm: 8,
  depthMm: 2,
  materialThicknessMm: 0.28,
  roadSurfaceThicknessMm: 1.5,
  clearanceMm: 0.08,
  tabWidthMm: 0.75,
  tabDepthMm: 1.5,
  tabInsetMm: 0.45,
  railWidthMm: 0.18,
  slatWidthMm: 0.18,
  slatGapMm: 0.32,
  endFrameMm: 0.25,
  supportStyle: 'folded-u'
}
```

## Material library support

The grate resolves materials through `road-material-library-roles.js`.

Default roles:

- grate insert: `roadHatchDark`
- road surface: `core`

If a project material profile defines a matching material, the insert uses that material metadata. If not, virtual fallback materials are used so preview/export still works.

Suggested material profile entries:

```json
{
  "id": "road-hatch-dark",
  "name": "Dark grate / manhole material",
  "colour": "#3a2b1e",
  "thickness": 0.28,
  "role": "roadHatchDark",
  "tags": ["road", "grate", "manhole"]
}
```

## Codex wiring recommendation

1. Add a physical hatch mode alongside existing visual hatch/manhole features:

```js
feature.physicalInsert = 'foldedDrainageGrateInsert';
```

2. For drain presets such as `rectDrainSmall` and `rectDrainLong`, expose a toggle:

- `Visual only`
- `Physical see-through insert`

3. When physical mode is enabled, call:

```js
const insert = buildDrainageGrateInsert(feature.grateInsertSpec, activeMaterialProfile.library);
```

4. Add `insert.layers.roadDeckCut` to the road surface cut sheet.
5. Add `insert.layers.grateCut` and `insert.layers.grateScore` to the grate material cut sheet.
6. Keep `insert.layers.grateGuide` preview-only unless a debug/export guide mode is enabled.

## Assembly note

The folded tabs are intentionally on the underside. They should fold down from the visible grate deck, creating an upside-down U profile that supports the insert from below the road surface.

## Verification checklist

- Road deck opening is slightly larger than the grate deck by clearance.
- Grate deck has through-slots, not just etch lines.
- Fold score lines align with the support tabs.
- Folded tabs are long enough to support the grate below the road surface.
- Grate top sits flush in the road opening.
- Grate material resolves from the active material profile when available.
- Export separates road deck cuts from grate material cuts.
