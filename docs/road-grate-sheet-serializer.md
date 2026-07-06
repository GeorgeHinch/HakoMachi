# Physical Grate SVG Sheet Serializer

This document describes:

- `js/site-planner/road-grate-sheet-serializer.js`

It serializes physical drainage grate inserts from `road-drainage-grate-inserts.js` into SVG cut sheets.

## Basic usage

```js
import { serializeGrateInsertSheetSvg } from './site-planner/road-grate-sheet-serializer.js';

const svg = serializeGrateInsertSheetSvg([
  { key: 'rectangularDrain' },
  { key: 'longCurbTrench' },
  { key: 'squareStormGrate' },
], {
  materialLibrary: activeMaterialProfile.library,
  sheet: { widthMm: 180, heightMm: 120, marginMm: 6, gapMm: 4 },
});
```

## Output

The serializer emits a complete SVG string with layer groups:

- `roadDeckCut`
- `grateCut`
- `grateScore`
- `grateGuide`

It can also group SVG sheets by resolved material ID:

```js
serializeGrateInsertSheetsByMaterial(grateSpecs, { materialLibrary })
```

## Codex wiring recommendation

1. Use this serializer in the road asset export path after physical grate features are generated.
2. Keep `roadDeckCut` geometry with the road/deck material sheet.
3. Send `grateCut` and `grateScore` to the resolved grate material sheet.
4. Keep `grateGuide` out of production export unless debug guides are enabled.
5. Remove any future ad-hoc SVG construction for grate inserts once this module is wired.

## Existing code to remove after integration

There should not currently be physical grate sheet code in `site-planner.js`. If Codex adds temporary local serializers while wiring #203, replace them with this module before finalizing.

## Verification checklist

- Multiple grate families are arranged with margins/gaps.
- Cut and score layers are separated.
- Material grouping uses resolved material IDs.
- SVG output can be downloaded directly.
- Road deck cuts are not accidentally mixed with grate material cut lines unless intentionally requested.
