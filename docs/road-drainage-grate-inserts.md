# Physical Road Drainage Grate Inserts

This document describes the laser-cut insert generator added in:

- `js/site-planner/road-drainage-grate-inserts.js`

It models drainage grates and covers as real insert parts, not just visual hatch markings.

## Concept

A drainage grate can be made as a small physical insert that sits flush with the road surface:

1. Cut an opening through the road/deck material.
2. Cut a grate insert from thin material.
3. Cut see-through slots through the grate deck where appropriate.
4. Score fold lines along the support tabs.
5. Fold the tabs downward so the part forms an upside-down U.
6. Drop the insert into the road opening so the top deck sits level with the road surface.

This allows grates to be actually see-through while the folded tabs hold them up from below. Manhole covers can use the same insert/fold support concept but use etched details instead of through-slots.

## Supported grate families

Use `drainageGrateFamilyOptions()` to populate a UI selector.

Available family presets:

| Key | Family | Use |
| --- | --- | --- |
| `rectangularDrain` | `rectangular-drain` | Small rectangular drain/grate |
| `longCurbTrench` | `curb-trench` | Long curb-side trench grate |
| `squareStormGrate` | `square-storm-grate` | Square storm drain with grid cuts |
| `heavyDutyIndustrial` | `industrial-grate` | Heavier frame grate for service/industrial roads |
| `curbInletTopGrate` | `curb-inlet` | Top grate plus front curb inlet mouth slot |
| `etchedManholeCover` | `manhole-cover` | Round manhole cover insert with etched rings/cross detail |

## Basic usage

```js
import {
  buildDrainageGrateInsert,
  drainageGrateFamilyOptions,
  drainageGrateSvgPaths,
} from './site-planner/road-drainage-grate-inserts.js';

const grate = buildDrainageGrateInsert({
  key: 'longCurbTrench',
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
| `grateScore` | Fold score lines and etched surface detail |
| `grateGuide` | Non-cut assembly/preview guides |

## Default geometry

Base dimensions for the rectangular drain family:

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
  supportStyle: 'folded-u',
  slotPattern: 'parallel'
}
```

Family presets override these dimensions for longer, square, heavier, inlet, or round insert forms.

## Material library support

The grate resolves materials through `road-material-library-roles.js`.

Default roles:

- grate insert: `roadHatchDark`
- road surface: `core`

If a project material profile defines a matching material, the insert uses that material metadata. If not, virtual fallback materials are used so preview/export still works.

Suggested material profile entry:

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
feature.grateInsertSpec = { key: 'squareStormGrate' };
```

2. For drain presets such as `rectDrainSmall` and `rectDrainLong`, expose a toggle:

- `Visual only`
- `Physical see-through insert`

3. Add a family selector using:

```js
drainageGrateFamilyOptions()
```

4. When physical mode is enabled, call:

```js
const insert = buildDrainageGrateInsert(feature.grateInsertSpec, activeMaterialProfile.library);
```

5. Add `insert.layers.roadDeckCut` to the road surface cut sheet.
6. Add `insert.layers.grateCut` and `insert.layers.grateScore` to the grate material cut sheet.
7. Keep `insert.layers.grateGuide` preview-only unless a debug/export guide mode is enabled.

## Assembly note

The folded tabs are intentionally on the underside. They should fold down from the visible grate deck, creating an upside-down U profile that supports the insert from below the road surface.

For round manhole covers, the insert can be used flat or with the support tabs folded down when a through-opening is desired.

## Verification checklist

- Road deck opening is slightly larger than the insert by clearance.
- Rectangular/trench/square/industrial/curb-inlet grates have through-slots, not just etch lines.
- Manhole cover has etched details and a round road opening.
- Fold score lines align with the support tabs.
- Folded tabs are long enough to support the insert below the road surface.
- Grate/cover top sits flush in the road opening.
- Grate material resolves from the active material profile when available.
- Export separates road deck cuts from grate material cuts.
