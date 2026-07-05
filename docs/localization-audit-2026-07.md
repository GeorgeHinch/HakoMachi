# HakoMachi Localization Audit — 2026-07-05

Issue: #125 / HM-BACKLOG-067

## Scope

This audit covers the user-facing localization gaps called out in #125 and the files that are currently safest to inspect with the GitHub connector:

- `index.html`
- `js/i18n/landing.js`
- `site-planner.html`
- `utils/wooden-crate-generator.html`

The goal is to identify visible text, accessibility labels, button labels, status messages, hints, and descriptions that should be represented in the English/Japanese language system.

## Current language system observations

- The landing page uses `data-i18n` and `js/i18n/landing.js` for its primary copy.
- Material Manager landing translations were added in PR #193, so the original `index.html` evidence item from #125 is resolved for the runtime-rendered landing cards.
- A broad shared localization system for utility pages is not yet present.
- Site Planner uses a language selector in the app, but `site-planner.html` still contains many static English labels in markup and status defaults.

## Recommended phasing

Do not attempt to localize every utility and the full Site Planner in one PR. The safer path is:

1. Landing page cleanup and regression checks.
2. Site Planner shell and high-visibility panels.
3. Site Planner status strings and JS-generated panel text.
4. Utility-page shared localization helper.
5. Utility pages one at a time, starting with Wooden Crate Generator because #125 names it directly.

## Findings by file

### `index.html`

Status: mostly addressed by PR #193.

Remaining checks:

- The static fallback Material Manager card in `index.html` still has hard-coded text in the no-JS fallback markup:
  - `Material Manager`
  - `Manage reusable stock material profiles for generator assignments, sheet sizing, and GitHub data sync.`
- Runtime cards are now generated from `js/shared/hakomachi-tool-registry.js` and `js/i18n/landing.js`, but static fallback markup should either:
  - receive `data-i18n` attributes, or
  - be regenerated from the registry in a future static build step.

Suggested keys:

- `materialManagerTitle`
- `materialManagerDescription`

These keys already exist in `js/i18n/landing.js` after PR #193.

### `site-planner.html`

Status: large incomplete localization surface.

High-priority visible strings in the inspected markup include:

- Fabric controls:
  - `Seed`
  - `Average floors`
  - `Max floors`
  - `Generate Pads In Drawn Region`
  - `Clear Draft`
  - `Draw a polygon around an area, then generate. The Site Planner creates editable BuildingPads with HakoSeed metadata; HakoMachi still generates the actual laser-cut building geometry.`
- Selection panel:
  - `Selected Item`
  - `No building selected.`
- Bottom status bar defaults:
  - `Tool: Select`
  - `Calibration: unset`
  - `Zoom: 100%`
  - `Mouse: —`
  - `Tip: import an image, draw a calibration line, then trace pads.`
  - `Autosave: ready`

Recommended key groups:

```js
sitePlanner.fabric.seed
sitePlanner.fabric.averageFloors
sitePlanner.fabric.maxFloors
sitePlanner.fabric.generatePads
sitePlanner.fabric.clearDraft
sitePlanner.fabric.drawHint
sitePlanner.selection.title
sitePlanner.selection.empty
sitePlanner.status.toolSelect
sitePlanner.status.calibrationUnset
sitePlanner.status.zoomDefault
sitePlanner.status.mouseEmpty
sitePlanner.status.startTip
sitePlanner.status.autosaveReady
```

Follow-up audit should scan the full `site-planner.html` and `js/site-planner/main.js` for additional hard-coded text in:

- Calibration controls
- Image import controls
- Road controls
- Road asset export controls
- Benchwork controls
- Fabric type labels/descriptions
- Annotation controls
- GitHub data panels
- Generated selected-item property panels
- Error/status hints
- `aria-label`, `title`, and button text

### `utils/wooden-crate-generator.html`

Status: almost entirely hard-coded.

Visible headings and descriptions:

- `1:150 Wooden Crate Laser-Cut Generator`
- `Generates a three-layer crate: a slotted structural core, etched plank cladding, and raised support bracing. Enter the finished outside crate dimensions; the tool subtracts the cladding and bracing layers from the core so the assembled crate stays the requested size.`
- `HakoMachi`
- `Laser-cut SVG preview`
- `Rendered part thumbnails`
- `Shows a visual render of every generated piece so you can check the core box parts, etched skins, and raised brace layers without opening the SVG separately.`
- `3D preview`

Fieldsets and labels:

- `Finished outside dimensions`
- `Width X, mm`
- `Depth Y, mm`
- `Height Z, mm`
- `Material thickness, mm`
- `Slot clearance, mm`
- `Structural tongue/groove core`
- `Tab width target, mm`
- `Min edge margin, mm`
- `Draw assembly labels`
- `Wood cladding`
- `Plank spacing, mm`
- `Random plank breaks`
- `Detail`
- `Etch nail dots`
- `Etch crate labels`
- `Raised bracing layer`
- `Brace strip width, mm`
- `Diagonal pattern`
- `X brace`
- `Z brace`
- `Border only`
- `Show top crate braces`
- `Sheet layout`
- `Part spacing, mm`
- `Stroke width, mm`

Buttons:

- `Show preview`
- `Open SVG preview`
- `Download SVG`
- `Download settings JSON`
- `Reset defaults`

Legend/hint/readout text:

- `red = retained through cut`
- `blue = score/placement engrave`
- `blue dashed/dots/text = engrave`
- `Construction assumption: front/back outer skins cover the crate ends; side/top/bottom skins are inset by the two outside layers so corners do not double-stack beyond the requested finished size.`
- `Preview is loading.`

Recommended key groups:

```js
woodenCrate.title
woodenCrate.subtitle
woodenCrate.homeLink
woodenCrate.sections.finishedDimensions
woodenCrate.fields.widthX
woodenCrate.fields.depthY
woodenCrate.fields.heightZ
woodenCrate.fields.materialThickness
woodenCrate.fields.slotClearance
woodenCrate.sections.core
woodenCrate.fields.tabWidthTarget
woodenCrate.fields.minEdgeMargin
woodenCrate.fields.drawAssemblyLabels
woodenCrate.sections.cladding
woodenCrate.fields.plankSpacing
woodenCrate.fields.randomPlankBreaks
woodenCrate.sections.detail
woodenCrate.fields.etchNailDots
woodenCrate.fields.etchCrateLabels
woodenCrate.sections.bracing
woodenCrate.fields.braceStripWidth
woodenCrate.fields.diagonalPattern
woodenCrate.options.xBrace
woodenCrate.options.zBrace
woodenCrate.options.borderOnly
woodenCrate.fields.showTopCrateBraces
woodenCrate.sections.sheetLayout
woodenCrate.fields.partSpacing
woodenCrate.fields.strokeWidth
woodenCrate.actions.showPreview
woodenCrate.actions.openSvgPreview
woodenCrate.actions.downloadSvg
woodenCrate.actions.downloadSettings
woodenCrate.actions.resetDefaults
woodenCrate.legend.cut
woodenCrate.legend.score
woodenCrate.legend.etch
woodenCrate.hints.constructionAssumption
woodenCrate.preview.svgTitle
woodenCrate.preview.loading
woodenCrate.preview.renderTitle
woodenCrate.preview.renderIntro
woodenCrate.preview.threeDTitle
```

## Accessibility and generated text to include in follow-up

For each page, include:

- `aria-label`
- `title`
- placeholder text
- select option labels
- canvas/preview fallback text
- status messages generated from JS
- error strings
- export/download filenames only if user-visible in the UI

## Implementation recommendation

Add a shared utility-page language helper rather than duplicating the landing-specific implementation. Suggested shape:

```js
applyHakoMachiTranslations({
  dictionaries,
  languageSelect,
  root: document,
  attributes: ['textContent', 'aria-label', 'title', 'placeholder']
});
```

Markup can then use:

```html
<span data-i18n="woodenCrate.actions.downloadSvg">Download SVG</span>
<button data-i18n="woodenCrate.actions.resetDefaults">Reset defaults</button>
<input data-i18n-aria-label="woodenCrate.fields.widthX">
```

## Acceptance status

This audit satisfies the first acceptance criterion of #125:

- Produce a list of visible hard-coded strings that should be localized.

Remaining acceptance criteria require follow-up implementation PRs:

- Decide whether to localize all utility pages now or phase by page.
- Add translation keys for missing text and update markup/JS.
- Include accessibility labels, button titles, and status messages in implementation, not only visible headings.
