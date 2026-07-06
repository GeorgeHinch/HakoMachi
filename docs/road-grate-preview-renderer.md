# Physical Grate Preview Renderer

This document describes:

- `js/site-planner/road-grate-preview-renderer.js`

It draws generated physical drainage grate insert geometry on a canvas for preview/debug use.

## Basic usage

```js
import { drawPhysicalGrateInsert } from './site-planner/road-grate-preview-renderer.js';

drawPhysicalGrateInsert(ctx, { key: 'squareStormGrate' }, {
  x: feature.x,
  y: feature.y,
  angle: feature.angle,
  materialLibrary: activeMaterialProfile.library,
});
```

## Drawn elements

- road deck opening
- grate deck and folded support tabs
- see-through slots
- score/fold lines
- optional assembly guides

## Codex wiring recommendation

1. Use this in a debug/preview pass for physical drain features.
2. Draw it near the existing road hatch/manhole preview code.
3. Keep it separate from production road marking rendering; this is for physical insert parts.
4. Use returned draw counts for a debug status panel.

## Existing code to remove after integration

If Codex creates temporary physical-grate preview drawing code inside `site-planner.js`, replace it with this module before finalizing.

## Verification checklist

- Rectangular drain preview shows opening, slots, tabs, and scores.
- Square storm grate preview shows grid cuts.
- Manhole cover preview shows circular opening and etched details.
- `showGuides: false` hides guide geometry.
