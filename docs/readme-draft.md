# HakoMachi

> README draft for review. This file is not the live GitHub README and should
> not replace `README.md` until the project owner explicitly approves it.

HakoMachi is a browser-based toolkit for planning Japanese N gauge
streetscapes and generating 1:150 laser-cut model-building parts. It combines
a site planning canvas, a building generator, and focused utility generators so
layout planning, building design, fabrication exports, and saved project data
can stay connected.

The project is aimed at mixed-medium model railway work: laser-cut buildings
and scenic parts, road and sidewalk fabrication assets, imported STL details,
and GitHub-backed project storage for layouts that should survive beyond the
browser cache.

## Current Tools

### Site Planner

`site-planner.html` is the layout-level planning workspace. It supports:

- Importing a reference image and calibrating image pixels to model scale.
- Drawing and editing building pads, traced footprints, fabric areas, notes,
  benchwork outlines, roads, sidewalks, and track paths.
- Switching between layout, road editing, and track editing work modes.
- Road asset workflows for roads, sidewalks, generated intersections,
  individual road markings, hatches, drainage/grate inserts, rail crossings,
  stencils, and SVG road-asset export.
- Track planning objects for flex track, Tomix-style turnouts, buffer stops,
  catenary poles, sensors, signals, crossing arms, occupancy lights, and
  intrusion detector markers.
- 2D and 3D preview modes for checking the site plan, reference image,
  buildings, roads, tracks, placed objects, and benchwork context.
- Local `.hako-site` saves and GitHub datastore saves for site plans, reference images,
  attached `.hako` files, imported STL files, and STL source files.

The Site Planner is still under active development. Some behaviors, especially
road-detail generation, track accessory modeling, and generated intersection
editing, should be treated as evolving fabrication workflows rather than final
manufacturing specifications.

### Building Generator

`building-generator.html` designs individual 1:150 buildings and exports
fabrication files. It supports:

- Configurable Japanese building presets, dimensions, floor counts, roof
  styles, ground-floor variation, cladding, materials, and detail options.
- Manual facade editing for windows, doors, shutters, awnings, balconies,
  fixtures, cladding overrides, and printed wall objects.
- Rectangular and angled-front-corner building footprints, with 3D preview and
  generated SVG output.
- Roof, parapet, ridge-cap, fascia, soffit, rooftop-equipment, billboard,
  interior-wall, embedded-rail, and assembly-guide workflows.
- `.hako` save files for reusable building configuration.
- Sorted SVG cut sheets with material assignments, retained cuts, scrap cuts,
  engraves, labels, tabs, slots, and assembly metadata.
- STL and 3D preview support for generated details where available.
- GitHub-backed save/load integration when used with the datastore workflow.

The Building Generator remains a transitional codebase: modern ES modules are
being introduced around an older compatibility runtime. See
[`docs/building-generator-runtime-breakdown.md`](building-generator-runtime-breakdown.md)
for the refactor direction.

### Utilities

The landing page currently links to these utility generators:

- `utils/industrial-shelf-generator.html`: shelving, cabinets, lockers, and
  utility-box detail parts.
- `utils/material-manager.html`: reusable stock-material profiles for sheet
  sizing, material assignments, and data sync.
- `utils/safety-railing-generator.html`: flat railing runs with tab-and-slot
  base joinery.
- `utils/wooden-crate-generator.html`: 1:150 crate parts with cores, plank
  cladding, bracing, SVG output, and 3D preview.

Additional utility concepts such as road detailing helpers, facade tools,
under-viaduct details, and STL preview helpers are represented in backlog or
partial implementation work. They should not be described as stable unless a
page exists and is linked from the app.

## Fabrication Output

HakoMachi exports SVGs using a shared fabrication color taxonomy:

| Operation | Color | Meaning |
| --- | --- | --- |
| Engrave / score | Blue `#0000ff` | Surface marks that do not cut through material, including labels, fold lines, panel seams, and placement guides. |
| Retained through-cut | Red `#ff0000` | Through-cuts for pieces intended to stay with the model. |
| Scrap through-cut | Green `#008000` | Through-cuts for waste openings, slots, voids, and discard pieces. |

See [`docs/svg-fabrication-colors.md`](svg-fabrication-colors.md) for the
source-of-truth rules and SVG metadata guidance.

## Saving Projects

HakoMachi has two save directions:

- Local downloads: `.hako-site` packages for portable site snapshots and ZIP packages for fabrication files.
- GitHub datastore saves: project data stored in a separate GitHub repository
  with version history and separate asset files.

The GitHub datastore workflow is documented in
[`docs/github-datastore.md`](github-datastore.md). It stores the main site plan
JSON separately from reference images, attached building files, STL assets, and
STL source files so large assets do not bloat the main save file.

## Repository Structure

```text
index.html                         Landing page and tool hub
site-planner.html                  Site Planner app shell
building-generator.html            Building Generator app shell
utils/                             Focused utility generator pages
css/                               Shared, app, and utility stylesheets
js/shared/                         Shared browser, analytics, SVG, logo, and data helpers
js/site-planner.js                 Site Planner top-level compatibility controller
js/site-planner/                   Extracted Site Planner modules
js/building-generator-runtime.js   Legacy Building Generator compatibility runtime
js/building-generator/             Modular Building Generator implementation
docs/                              Workflow, fabrication, datastore, and refactor notes
tests/                             Playwright and regression coverage
tools/                             Local validation scripts
```

## Development

Install dependencies:

```sh
npm install
```

Run the standard validation pass:

```sh
npm run check
```

Run syntax-only validation:

```sh
npm run check:syntax
```

Run browser regression coverage:

```sh
npm run check:full
```

If Playwright browsers are missing:

```sh
npm run check:browser:install
```

## Agent Notes

- Prefer small, behavior-preserving refactors. The Site Planner and Building
  Generator both have active module-split work in progress.
- Use `npm run check` for syntax, i18n, and runtime checks before pushing.
- Use Playwright for browser and visual checks when UI, canvas, SVG, or 3D
  behavior changes.
- Do not overwrite `README.md` with this draft until the project owner approves
  the replacement.
- Keep GitHub issues as the source of truth for backlog state.

## Current Limitations And Active Work

- Some code paths still bridge older page-global behavior and newer ES modules.
- Site Planner road, intersection, rail-crossing, track accessory, and 3D
  object workflows are actively evolving.
- Localization is incomplete across utility pages and some app panels.
- Cache-busting strings and page metadata still have manual pieces that are
  candidates for future cleanup.
- Utility-page CSS and some modal display-state patterns still need cleanup.

For the current implementation queue, use GitHub issues rather than
`docs/backlog.md`.
