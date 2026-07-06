# Road Material Library Roles

Road marking, hatch, tactile, curb-guide, and stencil outputs should not be hard-coded to one visual color or stock forever. They should be able to resolve against the HakoMachi material library when they represent real physical stock, while paint colors can remain style/output roles.

This support is provided by:

- `js/site-planner/road-material-library-roles.js`

## Why this exists

The material manager stores reusable material profiles in the GitHub data library under `records.materialProfiles`. Each material profile has a `library.materials` list with material IDs, names, colors, thicknesses, sheet sizes, and stock metadata.

Road details are often visual/etch-only rather than cut-through sheet material, but they still need consistent role/color routing for:

- preview color
- SVG export layer routing
- future print/paint/decal sheets
- stock/material reporting when the output is physical
- user customization

## Supported material roles

| Role | Default material ID | Purpose |
| --- | --- | --- |
| `roadMarkingWhite` | `road-marking-white` | White road paint / etch markings |
| `roadMarkingYellow` | `road-marking-yellow` | Yellow curb/no-parking markings |
| `roadHatchDark` | `road-hatch-dark` | Manholes, drains, utility covers |
| `roadTactileYellow` | `road-tactile-yellow` | Tactile paving / warning tile markings |
| `roadCurbGuide` | `road-curb-guide` | Curb return guide/etch preview material |
| `stencilStock` | `stencil-stock` | Real stock for inverse paint stencil sheets |

`roadHatchDark` and `stencilStock` are physical roles seeded by Material Manager. Paint and guide roles are virtual fallbacks unless a workflow explicitly routes them to a real physical output.

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
  "id": "stencil-stock",
  "name": "Paint stencil stock",
  "colour": "#d7d2c4",
  "thickness": 0.1,
  "role": "stencilStock",
  "tags": ["road", "detail", "stencilStock"]
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
  materialRole: 'stencilStock',
  materialId: 'stencil-stock',
  materialName: 'Paint stencil stock',
  color: '#d7d2c4',
  thicknessMm: 0.1,
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

4. Add physical road stock defaults to new material profiles, or provide a button in Material Manager:

- `Add physical road stock`

5. Add a coverage/debug card using:

```js
roadMaterialLibraryCoverage(activeMaterialProfile.library)
```

This can show whether each physical road stock role is backed by a real material profile or using a fallback.

## Notes

- Visual/etch/decal-style roles can use virtual zero-thickness fallbacks without being saved as stock.
- If painted markings need physical output, use `paintStencil` and route to `stencilStock`.
- This resolver intentionally works with both a raw material library and a stored material profile wrapper with a `.library` field.
