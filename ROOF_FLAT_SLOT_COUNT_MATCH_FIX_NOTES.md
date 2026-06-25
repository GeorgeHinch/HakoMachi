# Flat roof slot count / wall tab match fix — 2026-06-24

Fixes a mismatch where flat and flat-overhang roof panels could generate fewer roof slots than the wall panels generated roof tabs.

## Problem

The front/back and side wall generators use three wall-top tongues for flat and flat-overhang roofs. The roof generator was deriving its slot count from wall length with `floor(length / 30)`, which could drop to two slots on smaller buildings. That left a third wall tab with no matching roof slot.

## Fix

- Flat roof slot rows now use the same three-position tongue layout as the wall generators.
- Flat-overhang roof slot rows now use the same three-position tongue layout as the wall generators.
- Flat-overhang side slot spans now account for omitted connection-wall cases with the same offset rule used by the flush flat roof.

## Cleanup

The flat/flat-overhang slot-count logic now lives in the canonical roof generator file. The temporary late-loaded override in `js/00-38-shared-block-supplemental-part-generation.js` has been removed.

## Files changed in the repo

- `js/00-24-roof-generator-split-by-roof-type.js`
- `js/00-38-shared-block-supplemental-part-generation.js`
- `split-manifest.json`
- `ROOF_FLAT_SLOT_COUNT_MATCH_FIX_NOTES.md`
- `CHANGED_FILES_MANIFEST.json`
