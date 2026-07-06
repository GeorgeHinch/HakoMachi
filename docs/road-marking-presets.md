# Road Marking Preset Registry

This document describes the expanded preset registry added in:

- `js/site-planner/road-marking-presets.js`

The module is intentionally not wired into `site-planner.js` yet. It gives Codex a single source of truth for road marking and road hatch presets.

## Preset groups

### Intersection control

- `stopLine` / 停止線

### Crosswalks

- `zebraCrosswalk` / 横断歩道
- `bicycleCrossing` / 自転車横断帯

### Lane arrows

- `laneArrowStraight` / 直進矢印
- `laneArrowLeft` / 左折矢印
- `laneArrowRight` / 右折矢印
- `laneArrowStraightLeft` / 直進左折矢印
- `laneArrowStraightRight` / 直進右折矢印

### Road text

- `speed30` / 速度30
- `speed40` / 速度40
- `stopTextTomare` / 止まれ

### Curb and lane line markings

- `noParkingCurbDash` / 駐車禁止破線
- `laneDashedCenter` / 中央線破線
- `laneSolidCenter` / 中央線実線

### Warning and buffer markings

- `diamondWarning` / 前方横断歩道予告
- `chevronBuffer` / 導流帯
- `safetyZoneBox` / 安全地帯

### Hatches / covers

- `round600` / 丸形マンホール 600
- `round900` / 丸形マンホール 900
- `rectDrainSmall` / 角形側溝蓋 小
- `rectDrainLong` / 長形排水グレーチング

## Basic usage

```js
import {
  roadMarkingPresetByKey,
  roadHatchPresetByKey,
  roadMarkingSelectOptions,
  roadHatchSelectOptions,
  applyRoadMarkingPresetData,
  applyRoadHatchPresetData,
} from './site-planner/road-marking-presets.js';
```

### Build UI options

```js
const markingOptions = roadMarkingSelectOptions();
const hatchOptions = roadHatchSelectOptions();
```

Each option has:

```js
{
  value: 'zebraCrosswalk',
  label: 'Zebra crosswalk',
  jpName: '横断歩道',
  category: 'crosswalk'
}
```

### Apply to a road marking feature

```js
const feature = applyRoadMarkingPresetData(existingFeature, 'laneArrowStraight', {
  pxPerMm: state.pxPerMm
});
```

The result is compatible with the existing road feature model:

```js
{
  kind: 'marking',
  markingPreset: 'laneArrowStraight',
  markingType: 'laneArrowStraight',
  markingDraw: 'arrowStraight',
  markingCategory: 'lane-arrow',
  widthMm: 2.8,
  depthMm: 7.5,
  widthPx: 2.8 * pxPerMm,
  depthPx: 7.5 * pxPerMm,
  exportLayer: 'roadMarkingEtch',
  visualOnly: true,
  cutBehavior: 'etchOnly'
}
```

### Apply to a hatch/manhole feature

```js
const hatch = applyRoadHatchPresetData(existingFeature, 'rectDrainLong', {
  pxPerMm: state.pxPerMm
});
```

## Codex wiring recommendation

1. Replace duplicated inline marking/hatch preset arrays with imports from `road-marking-presets.js`.
2. Keep existing functions such as `markingPresetByKey`, `hatchPresetByKey`, `applyRoadMarkingPreset`, and `applyRoadHatchPreset` as thin wrappers if that avoids a large app patch.
3. Update road feature editor dropdowns to use:

```js
roadMarkingSelectOptions()
roadHatchSelectOptions()
```

4. Update 2D renderer support for new `draw` values:
   - `arrowStraight`
   - `arrowLeft`
   - `arrowRight`
   - `arrowStraightLeft`
   - `arrowStraightRight`
   - `roadText`
   - `solidLine`

5. Existing draw values already represented in earlier renderers:
   - `bar`
   - `crosswalk`
   - `bicycleCrossing`
   - `dashedLine`
   - `curbDash`
   - `speedNumber`
   - `diamond`
   - `chevronZone`
   - `safetyZone`

6. Add i18n display later using `label` and `jpName` from the preset metadata.

## Notes

- Dimensions are model/preview defaults intended for N-scale visual layout, not legal construction specifications.
- Presets are metadata-only; no project state migration is required.
- Export layers match the existing road asset naming conventions.

## Verification checklist

- Road marking dropdown can show all new presets grouped by category.
- Existing road markings still load using their saved `markingPreset` keys.
- Existing hatch/manhole features still load using their saved `hatchPreset` keys.
- New presets export to `roadMarkingEtch` or `roadHatchCut` as expected.
- Japanese display names are available for future localized UI.
