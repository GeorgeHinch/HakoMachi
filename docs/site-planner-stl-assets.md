# Site Planner STL Asset Schema

Site Planner STL objects are site-plan-local records. They are not a reusable
global asset library. A saved plan keeps placement metadata in the site plan JSON
and stores the heavy STL/source files as package or GitHub datastore assets.

## Placement Record

Each STL site object is stored in `stlObjects` and normalized by
`normalizeStlObject` in `js/site-planner.js`.

Required placement fields:

- `id`: stable site-object ID.
- `type`: `stl`.
- `name`: display name shown in the Site Planner.
- `x`, `y`: plan position in image/canvas coordinates.
- `rotationDeg`: plan rotation.
- `scale`: object scale multiplier.
- `widthMm`, `depthMm`, `heightMm`: planner dimensions used for footprint,
  selection, proxy rendering, and scaling the STL mesh.
- `widthPx`, `depthPx`: derived footprint dimensions for the current site
  calibration.
- `color`, `locked`, `hidden`, `notes`: UI and planning metadata.
- `bounds`: parsed STL bounds with `format`, `vertexCount`, min/max axes, and
  measured width/depth/height.
- `asset`: renderable STL file asset reference.
- `sourceAssets`: optional source/creation-file references.

The placement record is enough to keep a selectable footprint/proxy available
when the referenced STL asset cannot be loaded.

## Renderable STL Asset

The renderable STL file is stored under `asset` on the placement record. When
saved to GitHub or a local `.hako-site` package, large binary data is moved out of the main
site JSON and represented with a reference shaped by `stlAssetReference`.

Asset fields:

- `schema`: `hakomachi.site-stl-asset`.
- `schemaVersion`: current schema version, starting at `1`.
- `kind`: `stl`.
- `path`: package or GitHub datastore path, for example
  `assets/stl/site-object.stl`.
- `sourceObjectId`: owning STL site-object ID.
- `name`: display name.
- `fileName`: original or generated STL filename.
- `mimeType`: usually `model/stl`.
- `byteLength`: decoded asset size.
- `hash`: simple content hash used for cache keys and change detection.
- `dataBase64`: optional in-memory or portable embedded payload. GitHub saves
  remove this from the main JSON after writing the asset file.
- `unavailable`: optional load-state flag used when a referenced asset is
  missing or inaccessible.
- `renderFallbackReason`: optional UI hint for proxy rendering, such as
  `asset-missing`, `asset-unavailable`, `mesh-too-large`, or `parse-failed`.

## Source Assets

`sourceAssets` holds optional creation/source files such as `.scad`, `.blend`,
scripts, or related model files. These are not rendered as STL geometry.

Source asset fields:

- `schema`: `hakomachi.site-stl-source-asset`.
- `schemaVersion`: current schema version, starting at `1`.
- `kind`: `stl-source`.
- `id` / `sourceAssetId`: stable attachment ID.
- `path`: package or GitHub datastore path, for example
  `assets/stl/sources/source-file.scad`.
- `sourceObjectId`: owning STL site-object ID.
- `name`, `fileName`, `mimeType`, `byteLength`, `hash`.
- `importedAt`: attachment timestamp.
- `dataBase64`: optional in-memory or portable embedded payload. GitHub saves
  remove this from the main JSON after writing the asset file.
- `unavailable`: optional load-state flag for missing referenced source files.

## Save Formats

Local `.hako-site` packages store:

- `hakomachi-site.hako-site.json`
- `assets/stl/*.stl`
- `assets/stl/sources/*`
- `manifest.json` with all referenced assets

GitHub-backed saves store STL files under the configured Site Planner datastore:

- `<sitePlansDir>/<siteId>/assets/stl/*.stl`
- `<sitePlansDir>/<siteId>/assets/stl/sources/*`

The shared GitHub base64 writer skips unchanged assets when the stored content
hash/content matches, so unchanged STL files are not recommitted.

## Future Extension

A future reusable/global STL library can add separate library records that point
to the same asset schema. Site Planner placement should remain local and should
reference the library record or asset instead of becoming the global source of
truth.
