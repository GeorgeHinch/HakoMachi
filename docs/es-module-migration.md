# ES Module Migration Checklist

This checklist tracks the remaining work to move HakoMachi away from load-order
dependent global scripts and toward explicit ES module imports.

## Current Module Entrypoints

1. `index.html`
   - Entrypoint: `js/landing/main.js`
   - Translations: `js/i18n/landing.js`

2. `utils/wooden-crate-generator.html`
   - Entrypoint: `js/utilities/wooden-crate-generator.js`
   - Shared helpers: `js/shared/browser-utils.js`

3. `utils/industrial-shelf-generator.html`
   - Entrypoint: `js/utilities/industrial-shelf-generator.js`
   - Shared helpers: `js/shared/browser-utils.js`

4. `utils/safety-railing-generator.html`
   - Entrypoint: `js/utilities/safety-railing-generator.js`
   - Shared helpers: `js/shared/browser-utils.js`

5. `site-planner.html`
   - Entrypoint: `js/site-planner/main.js`
   - Legacy side-effect module: `js/site-planner.js`
   - Shared GitHub helper: `js/shared/github-data.js`
   - Extracted modules:
     - `js/site-planner/state.js`
     - `js/site-planner/icons.js`
     - `js/site-planner/platform.js`
     - `js/site-planner/geometry.js`
     - `js/site-planner/presets.js`

6. `building-generator.html`
   - Shared GitHub helper: `js/shared/github-data.js`
   - Entrypoint: `js/building-generator/main.js`
   - Runtime module: `js/building-generator-runtime.js`
   - Data module index: `js/building-generator/data/index.js`
   - Core module index: `js/building-generator/core/index.js`
   - UI module index: `js/building-generator/ui/index.js`
   - Wing module index: `js/building-generator/wing/index.js`
   - Preview module index: `js/building-generator/preview/index.js`
   - Site Planner preview dependency shim:
     `js/building-generator/preview/site-planner-dependencies.js`

## Remaining Migration Batches

These batches keep related files together so each chunk can be tested before
moving to the next one.

### 1. Shared Browser Services

- Converted `js/hakomachi-github-data.js` to `js/shared/github-data.js` with
  named exports.
- Updated `site-planner.html`, `building-generator.html`, and their scripts to
  import GitHub data helpers instead of depending on script load order.
- Extended the runtime/module checks so shared browser services are covered.

Validation checkpoint:
- Syntax-check changed modules.
- Run `node tools/i18n/check.js`.
- Run `node tools/runtime_check.js`.
- Serve locally and request affected page/module URLs.

### 2. Site Planner Modules

- Split low-risk infrastructure out of `js/site-planner.js` into focused
  modules under `js/site-planner/`.
- Extracted:
  - `state.js`
  - `icons.js`
  - `platform.js`
  - `geometry.js`
  - `presets.js`
- Updated `js/site-planner.js` to import GitHub helpers directly from
  `js/shared/github-data.js`.
- Remaining planner internals still to split in later cleanup:
  - rendering
  - persistence/autosave
  - GitHub save/load UI
  - road/benchwork/fabric subsystem logic

Validation checkpoint:
- Syntax-check every `js/site-planner/*.js` module.
- Run `node tools/i18n/check.js`.
- Serve `site-planner.html` locally and verify module URLs resolve.

### 3. Building Generator Module Shell And Data

- Created `js/building-generator/main.js`.
- Added native ES module copies for low-risk data files:
  - `js/building-generator/data/constants.js`
  - `js/building-generator/data/building-types.js`
  - `js/building-generator/data/cladding-styles.js`
  - `js/building-generator/data/opening-styles.js`
  - `js/building-generator/data/door-styles.js`
  - `js/building-generator/data/fixture-styles.js`
  - `js/building-generator/data/printed-styles.js`
  - `js/building-generator/data/rooftop-equipment.js`
  - `js/building-generator/data/index.js`
- The Building Generator now loads through `js/building-generator/main.js`.
- The active runtime is bundled into `js/building-generator-runtime.js` so the
  former numbered stack shares one ES module scope.

Validation checkpoint:
- Syntax-check changed modules.
- Run `node tools/runtime_check.js`.
- Serve `building-generator.html` locally and verify module URLs resolve.

### 4. Building Generator Core Logic

- Added native ES module copies for the core generator stack under
  `js/building-generator/core/`.
- Added `js/building-generator/core/index.js` and exposed imported safe core
  modules through `window.HakoMachiBuildingGenerator.core`.
- Imported core module groups:
  - shared model/config helpers
  - geometry and SVG helpers
  - roof/floor generation helpers
  - part generators
  - sheet splitting and part metadata helpers
  - full building generation helpers
- Kept side-effect-heavy modules as module copies for focused imports:
  - `js/building-generator/core/material-registry.js`
  - `js/building-generator/core/materials-form.js`
  - `js/building-generator/core/stl-export-config.js`
- The numbered classic files have been removed from active loading and from the
  repository.

Validation checkpoint:
- Syntax-check changed modules.
- Run `node tools/runtime_check.js`.
- Generate a sample building through the runtime check path.
- Serve `building-generator.html` locally and verify the module shell reports
  the expected data/core module counts.

### 5. Building Generator UI, Preview, And Cleanup

- Added native ES module copies for UI/editor modules under
  `js/building-generator/ui/`.
- Added `js/building-generator/ui/index.js` and exposed the load-safe UI
  module namespaces through `window.HakoMachiBuildingGenerator.ui`.
- Added native ES module copies for multi-block/wing generation under
  `js/building-generator/wing/`.
- Added `js/building-generator/wing/index.js` and exposed the wing namespaces
  through `window.HakoMachiBuildingGenerator.wing`.
- Added a native Three.js preview module at
  `js/building-generator/preview/three-preview.js`.
- Moved preview startup behavior behind
  `installThreePreviewLegacyBehavior()` so importing the module no longer hooks
  `regenerate`, reads DOM/localStorage state, or registers window handlers.
- Added `js/building-generator/preview/index.js` and exposed the preview
  namespace plus the explicit legacy installer through
  `window.HakoMachiBuildingGenerator.preview`.
- Removed the old numbered live Three.js preview script from active pages; the
  module preview now owns Building Generator startup and exposes
  `window.HakoMachiPreview3D` for Site Planner building previews.
- Replaced the direct numbered generator script stack with the ES module
  runtime bundle `js/building-generator-runtime.js`.
- Added `js/building-generator/preview/site-planner-dependencies.js` so Site
  Planner can publish generator preview dependencies without loading the
  Building Generator UI runtime.
- Extended guardrails to recursively syntax-check the building-generator module
  tree.

Validation checkpoint:
- Syntax-check changed modules.
- Run `node tools/i18n/check.js`.
- Run `node tools/runtime_check.js`.
- Serve all top-level app pages locally.
- Verify the module shell reports the expected data/core/UI/wing/preview counts.
