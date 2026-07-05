# Road Material Library Roles

Road marking, hatch, tactile, and curb-guide presets should not be hard-coded to one visual color forever. They should be able to resolve against the HakoMachi material library.

This support is provided by:

- `js/site-planner/road-material-library-roles.js`

## Why this exists

The material manager stores reusable material profiles in the GitHub data library under `records.materialProfiles`. Each material profile has a `library.materials` list with material IDs, names, colors, thicknesses, sheet sizes, and stock metadata.

Road details are often visual/etch-only rather than cut-through sheet material, but they still need consistent material/color routing for:

- preview color
- SVG export layer routing
- future print/paint/decal sheets
- stock/material reporting
- user customization

## Supported material roles

| Role | Default material ID | Purpose |
| --- | --- | --- |
| `roadMarkingWhite` | `road-marking-white` | White road paint / etch markings |
| `roadMarkingYellow` | `road-marking-yellow` | Yellow curb/no-parking markings |
| `roadHatchDark` | `road-hatch-dark` | Manholes, drains, utility covers |
| `roadTactileYellow` | `road-tactile-yellow` | Tactile paving / warning tile markings |
| `roadCurbGuide` | `road-curb-guide` | Curb return guide/etch preview material |

## Matching rules

`findRoadMaterial(materialLibraryOrProfile, role)` searches `library.materials` using:

- exact material ID
- `role`
- `materialRole`
- `usage`
- `tags`
- material name aliases

Example material entry:

```json
{
  "id": "road-marking-white",
  "name": "Road marking white paint",
  "colour": "#f7f2df",
  "thickness": 0,
  "role": "roadMarkingWhite",
  "tags": ["road", "marking", "white"]
}
```

If no match exists, the resolver returns a virtual fallback material so the UI/export can still work.

## Basic usage

```js
import {
  resolveRoadPresetMaterial,
  applyRoadMaterialToFeature,
  roadMaterialLibraryCoverage,
} from './site-planner/road-material-library-roles.js';

const materialInfo = resolveRoadPresetMaterial(markingPreset, currentMaterialProfile.library);

const feature = applyRoadMaterialToFeature(markingFeature, currentMaterialProfile.library);
```

Output includes:

```js
{
  materialRole: 'roadMarkingWhite',
  materialId: 'road-marking-white',
  materialName: 'Road marking white paint',
  color: '#f7f2df',
  thicknessMm: 0,
  material: { ... }
}
```

## Codex wiring recommendation

1. Keep the road marking preset registry as metadata-only.
2. When creating or updating a road marking/hatch feature, call:

```js
applyRoadMaterialToFeature(feature, activeMaterialProfile.library)
```

3. When rendering/exporting, prefer:

- `feature.materialId`
- `feature.materialRole`
- `feature.color`
- `feature.materialThicknessMm`

4. Add road material role defaults to new material profiles, or provide a button in Material Manager:

- `Add road detail materials`

5. Add a coverage/debug card using:

```js
roadMaterialLibraryCoverage(activeMaterialProfile.library)
```

This can show whether each road role is backed by a real material profile or using a fallback.

## Notes

- `thickness: 0` is valid for visual/etch/decal-style materials.
- If road details later need physical cut material, users can set a non-zero thickness on those material profiles.
- This resolver intentionally works with both a raw material library and a stored material profile wrapper with a `.library` field.
