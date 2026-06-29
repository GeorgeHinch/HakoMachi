# Building Generator Runtime Breakdown

This is the working file plan for shrinking `js/building-generator-runtime.js`
from a compatibility bundle into a thin application shell.

## Target Shape

`js/building-generator-runtime.js` should become a transitional wrapper only:

- import the extracted modules
- publish the remaining legacy global surface needed by inline handlers
- call the explicit bootstrap/startup function
- contain no generator algorithms, UI rendering, persistence, or preview logic

The existing module folders remain the ownership boundaries:

- `js/building-generator/data/` owns static data tables.
- `js/building-generator/core/` owns geometry, model, generation, serialization,
  materials, and export data.
- `js/building-generator/ui/` owns DOM controls, editors, and event binding.
- `js/building-generator/wing/` owns multi-block building and wing editing.
- `js/building-generator/preview/` owns Three.js preview rendering.
- `js/shared/building-preview-renderer.js` owns the cross-page generated
  building preview API consumed by both Building Generator and Site Planner.
- `js/building-generator/app/` should be added for page bootstrap,
  persistence wiring, and cross-module orchestration.
- Each module folder exposes a local `index.js` for discoverable imports.

## Proposed Files

Status: these files have been created as ES module scaffolds. They are not
wired into `js/building-generator-runtime.js` yet; code should move into them
in the extraction order below.

The `app`, `core`, `ui`, and `preview` folder indexes expose these scaffolds so
future imports can use folder-level boundaries during extraction.

### `js/building-generator/app/bootstrap.js`

Owns startup order and page lifecycle.

Move:

- `startHakoMachiBuildingGeneratorRuntime`
- DOM ready startup hooks
- calls to initialize dropdowns, materials, editors, preview, persistence, and
  first render
- `window.HakoMachiBuildingGeneratorRuntime` publication once the public surface
  has been assembled from imports

Must not own:

- generator algorithms
- SVG/STL export construction
- editor internals
- direct GitHub save/load implementation

### `js/building-generator/app/github-persistence.js`

Owns GitHub building save/load integration for the Building Generator page.

Move:

- current GitHub data settings menu injection
- building record construction
- `saveCurrentBuildingToGithub`
- GitHub settings modal open/close/save behavior
- runtime wiring to `js/shared/github-data.js`

Keep shared GitHub API code in `js/shared/github-data.js`.

### `js/building-generator/core/config-serialization.js`

Owns the stored shape of building configs.

Move:

- `serializableCurrentConfig`
- `upgradeConfigToCurrentStorage`
- legacy config migration helpers that are not already isolated in
  `core/legacy-hako-import.js`
- import/export JSON normalization helpers

Consumers:

- preset storage
- GitHub persistence
- site planner building import
- tests/runtime checks

### `js/building-generator/core/preset-storage.js`

Owns local browser preset persistence.

Move:

- `STORAGE_KEY`
- `savePreset`
- `loadPreset`
- `clearPreset`
- localStorage error handling

Must depend on `core/config-serialization.js`, not directly on UI code.

### `js/building-generator/core/export-pipeline.js`

Owns non-DOM export orchestration.

Move:

- `generateBuilding` export assembly dependencies that are not already in
  `core/full-building-generation.js`
- ZIP/export data preparation
- filename and part bundle assembly
- reusable SVG/STL export helpers that can run without page DOM

Must not own:

- click handlers
- status text
- preview rendering

### `js/building-generator/ui/form-controller.js`

Owns the main form as a UI boundary.

Move:

- `readForm`
- `writeForm`
- `initDropdowns`
- control value coercion
- form change listeners
- UI-to-config mapping

Must import core data/model helpers instead of reading global constants.

### `js/building-generator/ui/output-controller.js`

Owns generated output rendering in the page.

Move:

- `regenerate`
- `renderPartsOutput`
- `partToSvg`
- `partToPreviewSvg`
- download/copy button handlers
- DOM status/error rendering for generated parts

Must call `core/export-pipeline.js` for export data instead of building that
data inline.

### `js/building-generator/ui/materials-controller.js`

Owns material form startup and UI events.

Move:

- `renderMaterialsForm`
- `initMaterialsForm`
- material UI event handlers currently left in the runtime bundle

Keep material data/model logic in:

- `core/material-registry.js`
- `core/materials-form.js`

### `js/building-generator/preview/controller.js`

Owns Building Generator page preview wiring.

Move:

- preview canvas lookup
- render loop start/stop for the Building Generator page
- hooks from `regenerate` or config changes into `preview/three-preview.js`

Keep reusable Three.js mesh creation in `preview/three-preview.js`, and keep
the cross-page public renderer contract in
`js/shared/building-preview-renderer.js`.

### `js/building-generator/app/runtime-surface.js`

Owns the temporary legacy public API.

Move:

- `HakoMachiRuntimeGlobals`
- `startHakoMachiBuildingGeneratorRuntime` export/publication mapping once
  bootstrap is extracted

This file should shrink over time as inline handlers and global consumers are
removed.

## Extraction Order

1. `app/github-persistence.js`
   - Low algorithm risk.
   - Already imports shared GitHub helpers.
   - Clear page-level ownership.

2. `core/config-serialization.js` and `core/preset-storage.js`
   - Creates a clean persistence model boundary before more UI work moves.
   - Supports future Site Planner building import/render reuse.

3. `ui/form-controller.js`
   - Gives all config reads/writes one boundary.
   - Reduces hidden coupling from UI controls to generation code.

4. `core/export-pipeline.js`
   - Separates generated data from DOM rendering.
   - Makes output behavior easier to test without a browser.

5. `ui/output-controller.js`
   - Moves `regenerate` and generated-part DOM rendering out of the runtime
     wrapper.

6. `ui/materials-controller.js`
   - Completes material UI ownership after form/output boundaries exist.

7. `preview/controller.js`
   - Leaves `preview/three-preview.js` as the reusable mesh/rendering engine.
   - Leaves `js/shared/building-preview-renderer.js` as the cross-page renderer
     API.
   - Keeps page-specific preview startup separate.

8. `app/bootstrap.js` and `app/runtime-surface.js`
   - Final shell extraction after dependencies are explicit.
   - At this point `js/building-generator-runtime.js` should be only a
     compatibility import wrapper.

## Validation Per Batch

For each extraction batch:

- `node --check` every changed module
- `node tools/runtime_check.js`
- load `building-generator.html` locally and check for console errors
- verify a generated building still renders parts and 3D preview
- verify saving/loading a preset still round-trips the current config

For batches that affect shared preview/config behavior:

- load `site-planner.html`
- verify placed buildings still use the shared 3D preview path
- verify no Building Generator UI modules are imported by Site Planner
