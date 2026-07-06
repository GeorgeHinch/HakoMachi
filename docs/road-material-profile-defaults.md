# Road Material Profile Defaults

This document describes:

- `js/site-planner/road-material-profile-defaults.js`

It provides helper functions for adding physical road-detail stock to an existing HakoMachi material profile.

## Materials added

The helper seeds real cuttable stock entries for the physical road roles defined in `road-material-library-roles.js`:

- `roadHatchDark`
- `stencilStock`

Paint and guide roles such as `roadMarkingWhite`, `roadMarkingYellow`, `roadTactileYellow`, and `roadCurbGuide` remain style/output fallbacks. They are not inserted into Material Manager as zero-thickness stock.

## Basic usage

```js
import { addRoadDetailMaterialsToLibrary } from './site-planner/road-material-profile-defaults.js';

const result = addRoadDetailMaterialsToLibrary(activeMaterialProfile.library, {
  maxWidthMm: 304.8,
  maxHeightMm: 304.8,
});

console.log(result.added);
console.log(result.coverage);
```

## Codex wiring recommendation

1. Add a Material Manager button:

- `Add physical road stock`

2. When clicked, call `addRoadDetailMaterialsToLibrary(currentProfile.library)`.
3. Re-render materials and profile summary.
4. Save the material profile as usual.
5. Use `roadDetailMaterialSummary()` for a coverage/debug card.

## Existing code to remove after integration

No existing code must be removed immediately. If Codex adds local duplicate seed arrays in Material Manager, replace them with this module before finalizing.

## Verification checklist

- Existing materials are not duplicated.
- New materials include role/materialRole/usage/tags.
- Physical road stock coverage switches from fallback to profile-backed.
- Paint style roles are not added as stock materials.
- Material Manager can edit colors/thicknesses after seeding.
