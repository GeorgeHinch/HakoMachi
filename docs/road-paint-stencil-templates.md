# Road Paint Stencil Templates

This document describes:

- `js/site-planner/road-paint-stencil-templates.js`

It generates inverse paint masks for road markings. Instead of treating paint colors as zero-thickness materials, markings can become physical stencil templates cut from real stock or masking material.

## Concept

For a marking such as a stop line, crosswalk, arrow, diamond, or road text:

1. Generate the marking geometry with `road-marking-shapes.js`.
2. Create a surrounding stencil frame from real material.
3. Cut the marking shape out of that frame as an opening.
4. Place the stencil on the road surface.
5. Paint through the opening.

This keeps Material Manager focused on real laser-cut stock.

## Basic usage

```js
import { buildRoadPaintStencilTemplate } from './site-planner/road-paint-stencil-templates.js';

const stencil = buildRoadPaintStencilTemplate('zebraCrosswalk', {
  x: 0,
  y: 0,
  angle: 0,
}, {
  marginMm: 2,
  materialRole: 'stencilStock',
});
```

## Output layers

- `paintStencilCut`: outer stencil frame plus inverse marking openings
- `paintStencilGuide`: optional bridge/keepout guide geometry

## Material model

Stencil templates should reference **real stock** such as:

- thin cardstock
- masking film
- acetate
- low-tack stencil sheet

They should not create zero-thickness material profiles.

Suggested feature fields:

```js
{
  kind: 'marking',
  markingPreset: 'zebraCrosswalk',
  outputMode: 'paintStencil',
  stencilMaterialId: 'masking-film-010',
  stencilSpec: {
    marginMm: 2,
    bridgeMm: 0.35
  }
}
```

## Codex wiring recommendation

1. Keep road marking visual styles separate from Material Manager stock.
2. Add an output mode for markings:
   - `etch` / existing visual marking export
   - `paintStencil` / physical inverse template
3. For stencil mode, call `buildRoadPaintStencilTemplate()` instead of exporting paint color as a material.
4. Route stencil output to the selected real stock material.
5. Use guide records to warn when a marking has islands that need bridges.

## Existing code to remove after integration

Remove or replace any code that tries to seed road paint colors into Material Manager as zero-thickness materials:

- `roadMarkingWhite` as a stock material
- `roadMarkingYellow` as a stock material
- `roadTactileYellow` as a stock material
- `roadCurbGuide` as a stock material

Those should be style/operation roles or stencil output settings. Only physical insert stock and actual stencil stock belong in Material Manager.

## Verification checklist

- Stop line produces a stencil frame with one rectangular opening.
- Crosswalk produces multiple stripe openings.
- Lane arrows produce inverse arrow openings.
- Text markings are represented as text cutouts or converted to paths by Codex later.
- Stencil output is routed to real stencil material stock.
- Zero-thickness paint roles are not added to Material Manager.
