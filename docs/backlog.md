# Feature Backlog

This backlog captures HakoMachi feature ideas as agent-ready work items. Add new items under the most relevant group, keep their IDs stable, and avoid renumbering existing entries.

## How to Use This Backlog

- Capture the user's feature first, then lightly normalize the wording so it is implementation-friendly.
- Group related features together rather than keeping a purely chronological queue.
- Use the next stable ID in sequence, for example `HM-BACKLOG-038`.
- Keep status to one of: `Proposed`, `Ready`, `In Progress`, `Blocked`, `Done`.
- When a backlog item has a GitHub issue, keep its `GitHub Issue` field updated with the issue URL.
- When an agent starts, blocks, or finishes a backlog item, update both the Markdown status and the linked GitHub issue during the same task.
- Keep GitHub issues open for `Proposed`, `Ready`, `In Progress`, and `Blocked`; close the issue as completed when the Markdown status becomes `Done`.
- If a feature is too broad, split it into smaller items and add a parent note.
- If the feature intent is unclear, ask one focused question before adding the item.

## Entry Template

```md
### HM-BACKLOG-000: Feature title

- Status: Proposed
- Group: UI and workflow
- Priority: Untriaged
- GitHub Issue: TBD
- Goal: What user-facing outcome this feature should create.
- Notes: Any raw user context or constraints.
- Acceptance Criteria:
  - Observable behavior that proves the feature works.
- Agent Starting Points:
  - Likely files, modules, or docs to inspect first.
- Dependencies:
  - Other backlog items or technical prerequisites, if known.
```

## Building Generation

### HM-BACKLOG-007: Fix interior wall floor and orientation placement

- Status: Proposed
- Group: Building generation
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/11
- Goal: Make interior wall placement generate geometry on the intended floor and in the orientation shown in the floor editor.
- Notes: User observed interior walls generating on the wrong floor and wrong orientation; floor spots did not appear to match the intended wall locations.
- Acceptance Criteria:
  - Interior walls placed on a specific floor tab generate only for that floor unless explicitly configured otherwise.
  - Generated wall parts match the editor preview orientation and position.
  - Floor slots, holes, or etched placement guides line up with the generated wall parts.
  - Regression coverage or a manual fixture verifies at least two floors and both horizontal and vertical wall orientations.
- Agent Starting Points:
  - `js/building-generator/ui/internal-wall-editor.js`
  - `js/building-generator/core/interior-wall-cladding.js`
  - `js/building-generator/core/full-building-generation.js`
- Dependencies:
  - None.

### HM-BACKLOG-008: Support angled front building corners

- Status: Proposed
- Group: Building generation
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/12
- Goal: Allow buildings to have angled front corners while keeping the floor plate square and preserving valid tab/slot joinery.
- Notes: The implementation must shorten tabs so they do not extend beyond the edges of the walls they bridge. The feature needs to be integrated into existing editors rather than only exposed as raw config.
- Acceptance Criteria:
  - Users can enable and configure angled front corners from the existing building editing workflow.
  - Front, side, cladding, trim, and roof-adjacent generated parts reflect the angled corners.
  - Floor plates remain square unless a later backlog item explicitly changes that behavior.
  - Tabs, tongues, and slots are clipped or shortened so no connector extends past its receiving wall edge.
  - Opening editor and 3D preview represent the angled front-corner geometry consistently enough to avoid placing openings into missing wall area.
- Agent Starting Points:
  - `building-generator.html`
  - `js/building-generator/ui/ui.js`
  - `js/building-generator/core/full-building-generation.js`
- Dependencies:
  - May interact with `HM-BACKLOG-006` if engraved labels depend on updated wall identities.

### HM-BACKLOG-010: Fix gabled roof core panel fit at eaves

- Status: Proposed
- Group: Building generation
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/14
- Goal: Make gabled roof core panels meet cleanly and fit the wall/eave geometry without unintended overlap or malformed bottom-edge intersections.
- Notes: User observed that a building with a gabled roof did not appear to have panels fitting together appropriately. There seemed to be weird generated overlap instead of the core panels butting up against each other at the bottom edge.
- Acceptance Criteria:
  - Gabled roof core panels meet cleanly at the ridge and bottom/eave edges for both east-west and north-south ridge directions.
  - Roof panels butt or overlap only where intentionally designed; no accidental generated overlap appears at the bottom edge.
  - Generated SVG roof panel geometry matches the 3D preview/export interpretation closely enough to diagnose fit visually before cutting.
  - Roof overhang, core thickness, roof pitch, fascia trim, soffit cladding, and roof cladding remain compatible with the corrected panel geometry.
  - Regression coverage or documented manual fixtures cover at least one small and one larger gabled-roof building.
- Agent Starting Points:
  - `js/building-generator/core/roof-generator.js`
  - `js/building-generator/core/roof-fascia-trim.js`
  - `js/building-generator/core/stl-export-config.js`
- Dependencies:
  - None.

### HM-BACKLOG-011: Add solid back cladding for straight or angled sliced buildings

- Status: Proposed
- Group: Building generation
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/15
- Goal: Let sliced buildings be finished with a solid black back piece instead of leaving the sliced side open for viewing into the model.
- Notes: User wants sliced buildings to optionally have a solid back. This depends on angled-wall support. Arc-cut/sliced edges should not get this feature because an arced blank wall is likely impractical to fabricate. The wall opened to the cut edge should get a black cladding piece that covers the exposed opening edge to edge.
- Acceptance Criteria:
  - Straight and angled layout-cut/sliced buildings can opt into a solid back treatment.
  - The generated back piece is black cladding and covers the opened cut edge from edge to edge.
  - Arc-cut/sliced edges are excluded or clearly disabled for this feature.
  - The solid-back option does not interfere with existing open/interior-visible sliced building behavior when disabled.
  - Generated SVG/export output includes the black cladding piece with clear part naming and material routing.
  - 3D preview or assembly output makes it clear when a sliced building is closed with a solid back.
- Agent Starting Points:
  - `js/building-generator/core/layout-cut-geometry.js`
  - `js/building-generator/core/segmented-wall-exposure.js`
  - `js/building-generator/core/full-building-generation.js`
- Dependencies:
  - Depends on `HM-BACKLOG-008` for angled wall/corner support.

### HM-BACKLOG-013: Allow wings to extend past attachment face edges

- Status: Proposed
- Group: Building generation
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/17
- Goal: Let building-generator wings attach to part of a main building side while extending beyond one or both ends of that side, instead of requiring the wing footprint to stay fully square/aligned within the attachment face.
- Notes: User wants wings that do not have to be perfectly square to the existing edges. Example: a wing could start in the center of a side but extend further past the edge. This implies wing offset/span handling should allow partial overlap with the main face and overhang beyond the main footprint edge, while still generating valid walls, floors, roof, cladding, and connection geometry.
- Acceptance Criteria:
  - Wing editor allows a wing's attachment span to extend past the start or end of the selected main face when intentionally configured.
  - Generated geometry supports negative or over-extended wing offsets without clipping, invalid slots, or missing walls.
  - Connection wall/opening behavior is correct for the portion of the wing that overlaps the main wall, while overhanging portions generate their own exterior side/back geometry.
  - Floors, roofs, cladding, trims, trusses, and 3D preview reflect the overhanging wing footprint.
  - Existing fully-contained rectangular wings continue to generate exactly as before.
  - Manual or automated fixtures cover at least one side-attached wing that starts near the center of a main wall and extends beyond a main-building corner.
- Agent Starting Points:
  - `js/building-generator/wing/wing-system.js`
  - `js/building-generator/ui/billboard-ui.js`
  - `js/building-generator/wing/main-block.js`
- Dependencies:
  - May interact with `HM-BACKLOG-008` if overhanging wing corners require angled wall/corner treatment later.

## Site Planner

### HM-BACKLOG-003: Render road outlines in the Site Planner 3D view

- Status: Proposed
- Group: Site planner
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/7
- Goal: Show traced roads in the Site Planner 3D view as thin, low-profile surfaces or outlines so their location is visible relative to buildings.
- Notes: Roads should have minimal thickness but clearly show where they run. Existing 2D road geometry includes road polygons, centerlines, sidewalks, junctions, and road features.
- Acceptance Criteria:
  - Switching to 3D view displays existing road outlines or road surfaces on the site base.
  - Road geometry has minimal height/thickness and does not visually compete with building masses.
  - Centerline and outline roads both render in 3D using their generated road polygon data.
  - Existing 2D road drawing, editing, and road asset SVG export behavior remain unchanged.
- Agent Starting Points:
  - `js/site-planner.js`
  - `site-planner.html`
  - `css/site-planner.css`
- Dependencies:
  - None.

### HM-BACKLOG-004: Place buildings from the GitHub footprint selector

- Status: Proposed
- Group: Site planner
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/8
- Goal: Let users place a building footprint from the existing GitHub footprint library directly onto the plan with a live outline preview.
- Notes: The current footprint selector appears to offer only “Copy path,” which is not useful because there is no clear paste flow for placing the footprint. Desired behavior: click a place button, see an outline of the building, then click a location to drop it.
- Acceptance Criteria:
  - Footprint library records provide a `Place` action instead of or alongside `Copy path`.
  - Choosing `Place` arms a placement mode and shows a live outline preview on the site plan canvas.
  - Clicking the canvas creates a new building footprint at that location using the selected library record’s dimensions/config metadata.
  - Placement can be canceled without creating a footprint.
  - The placed footprint can then be selected, moved, edited, saved, and opened like other site planner buildings.
- Agent Starting Points:
  - `js/site-planner.js`
  - `site-planner.html`
  - `js/building-generator-runtime.js`
- Dependencies:
  - None.

### HM-BACKLOG-005: Select and delete fabric areas in Site Planner

- Status: Proposed
- Group: Site planner
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/9
- Goal: Make fabric regions first-class selectable objects that can be selected, inspected, and deleted from the Site Planner.
- Notes: Site Planner currently draws fabric regions and tracks `selectedFabricId`, but the user cannot reliably select or delete fabric areas.
- Acceptance Criteria:
  - Clicking a fabric area selects it without accidentally selecting generated building pads above it unless the building is the intended target.
  - Selected fabric areas show properties in the side panel.
  - Delete/Backspace and a visible Delete button remove the selected fabric area.
  - Deleting a fabric area has clear behavior for generated pads: either remove generated pads with confirmation or preserve them after detaching from the region.
  - Save/load preserves fabric region selection-relevant data without corrupting existing projects.
- Agent Starting Points:
  - `js/site-planner.js`
  - `site-planner.html`
  - `css/site-planner.css`
- Dependencies:
  - Clarify generated-pad delete-vs-detach behavior before implementation if not obvious from nearby code.

### HM-BACKLOG-009: Make fabric areas generate usable planned building pads

- Status: Proposed
- Group: Site planner
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/13
- Goal: Complete the fabric-area workflow so drawn fabric regions expose useful properties and reliably generate building pads from those settings.
- Notes: User reports fabric areas seem to have no properties and generate nothing. Current code includes fabric presets, density/randomness/floor controls, seeds, region storage, and `generateFabricFromDraft`, so this should be treated as finishing and debugging an intended workflow rather than inventing a brand-new feature.
- Acceptance Criteria:
  - Selecting a fabric area shows editable properties including preset/type, density, randomness, seed, average floors, and max floors.
  - Generating fabric creates visible building pads inside the selected/drawn region using the chosen properties.
  - Generated pads store enough metadata to trace them back to the fabric region and produce HakoSeed-style building hints.
  - Re-generating a fabric area has predictable behavior for prior generated pads, such as replace-with-confirmation or update-in-place.
  - Save/load preserves fabric regions, properties, and generated pad relationships.
- Agent Starting Points:
  - `js/site-planner.js`
  - `site-planner.html`
  - `js/site-planner/presets.js`
- Dependencies:
  - Coordinate behavior with `HM-BACKLOG-005` so selection, deletion, and regeneration rules do not conflict.

### HM-BACKLOG-014: Place STL assets as Site Planner objects

- Status: Proposed
- Group: Site planner
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/18
- Goal: Allow users to drop an STL onto the Site Planner as a placeable site object with its own footprint, metadata, GitHub storage, and downloadable source assets.
- Notes: User wants STL objects to behave like first-class site-plan objects rather than Hako building footprints. When uploaded to GitHub, the STL should be stored as a separate reference in its own directory. The record should include structured metadata and support attaching an original creation file such as an OpenSCAD `.scad` file or Blender file. Like regular Hako building files, there should be an option to download either the STL or the creation/source file.
- Acceptance Criteria:
  - Users can drop or import an `.stl` into Site Planner and place it on the plan with a footprint, position, rotation, scale, and optional height metadata.
  - STL site objects are selectable, movable, deletable, saved, loaded, and shown in the relevant object/property lists without being treated as Hako building footprints.
  - GitHub save/upload stores STL assets under a dedicated directory separate from site plans and building `.hako` files.
  - Each STL asset record includes structured metadata: stable ID, display name, footprint/dimensions, source file references, file paths, timestamps, and any notes/tags needed for reuse.
  - Users can optionally attach a source/creation file, such as `.scad`, `.blend`, or another supported script/model source, to the same asset record.
  - Users can download the stored STL and, when present, download the associated source/creation file from the Site Planner UI.
  - Loading a site plan with referenced STL assets handles missing GitHub files gracefully and clearly reports unavailable assets.
  - 3D Site Planner view renders a useful representation of placed STL objects, either using the STL geometry or a clear fallback footprint/proxy.
- Agent Starting Points:
  - `js/site-planner.js`
  - `site-planner.html`
  - `js/shared/github-data.js`
- Dependencies:
  - Coordinate with `HM-BACKLOG-003` if STL object rendering shares the Site Planner 3D scene work.

### HM-BACKLOG-017: Move layout image controls into Site Planner 3D view

- Status: Proposed
- Group: Site planner
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/21
- Goal: Make the Site Planner 3D view easier to control by using a static benchwork/base depth and moving layout-image visibility/transparency controls into the 3D view instead of unrelated right-pane areas.
- Notes: User noted there is no need to define benchwork depth in the Site Planner 3D view; it can be static. The 3D view should have controls to toggle the layout/reference image on or off and adjust its transparency. This should allow those image controls to be removed from unrelated right-pane areas.
- Acceptance Criteria:
  - The Site Planner 3D view uses a sensible static benchwork/base thickness or depth without asking the user to define benchwork depth as a normal workflow setting.
  - 3D view includes a clear toggle for showing/hiding the layout/reference image on the 3D base.
  - 3D view includes a transparency/opacity control for the layout/reference image when it is visible.
  - The image visibility/transparency controls affect the 3D view without breaking the existing 2D reference image workflow.
  - Unrelated right-pane/sidebar areas no longer carry 3D-only layout image controls.
  - Save/load preserves any user-facing 3D image visibility/transparency settings if they are intended to be project-specific.
  - Desktop and mobile layouts keep these controls accessible without crowding the canvas toolbar.
- Agent Starting Points:
  - `site-planner.html`
  - `js/site-planner.js`
  - `css/site-planner.css`
  - Existing 3D toolbar controls around `site3dBaseThickness`.
  - Existing image opacity controls around `opacity` / `imageOpacity`.
  - Existing 3D base code around `buildSite3DBase()` and `site3DBenchworkFootprintsMm()`.
- Dependencies:
  - Coordinate with `HM-BACKLOG-016` so right-pane cleanup does not conflict with the planned drill-down navigation.

### HM-BACKLOG-018: Support whole-page .hako drop import in Site Planner

- Status: Proposed
- Group: Site planner
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/22
- Goal: Let users drop a `.hako` building file anywhere on the Site Planner page/canvas to import it as a placeable building footprint, matching the broad drop behavior planned for STL objects.
- Notes: User requested that dropping a `.hako` file on the whole page should import it as well, similar to the STL drop behavior already described. Local inspection shows `.hako` import currently exists through a specific import dropzone and selected-building/sidebar attachment flow, but page-level dropping is not the primary behavior.
- Acceptance Criteria:
  - Dropping a `.hako`, `.hakoseed`, `.hakoplan`, or compatible JSON building file on the general Site Planner page/canvas imports it as a new building footprint.
  - The imported footprint uses existing `.hako` parsing behavior, including derived footprint dimensions/polygon, attached `.hako` metadata, trim lines, and naming where available.
  - Existing narrower drop targets keep their intended behavior, such as dropping on the selected-building attachment area to attach/replace that selected footprint's `.hako` file.
  - Page-level drag feedback clearly communicates that the file can be dropped to import a building.
  - Unsupported file drops show a clear message and do not corrupt the current plan.
  - The behavior does not interfere with reference-image import, `.hako-site.json` project load, or the future STL object drop flow.
- Agent Starting Points:
  - `js/site-planner.js`
  - `site-planner.html`
  - `css/site-planner.css`
  - Existing `.hako` helpers: `importHakoAsBuilding()`, `createBuildingFromImportedHako()`, `attachHakoFileToSelectedBuilding()`, `hakoFileFromDataTransfer()`.
  - Existing import dropzone around `importHakoAsBuildingDropzone`.
  - Existing empty-image drag/drop flow around `installEmptyImageDrop()`.
- Dependencies:
  - Coordinate with `HM-BACKLOG-014` so page-level drop routing handles `.hako` building imports and `.stl` site-object imports consistently.

### HM-BACKLOG-037: Split Site Planner background images into separate asset files

- Status: Proposed
- Group: Site planner
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/41
- Goal: Move Site Planner reference/background images out of the main `.hako-site.json` save data and into separate asset files so GitHub saves are smaller and faster, while project downloads still include everything needed to restore the plan.
- Notes: User requested splitting the background image out of the main Hako site save data and into its own asset folder. When downloading a site save file, it should be grouped in a zip with all other data files stored in the repo. When loading a page, the save file should reference the image location so the app can pull it the first time if it is not cached. This may break the current save structure, so existing saved data may need migration. Local inspection found the Site Planner currently stores image metadata and embedded `dataUrl` through `projectJson()` / `projectPayload()`, while GitHub save writes a single `.hako-site.json` path. Autosave already has fallback behavior for oversized embedded images, which is useful context. Do not store credentials, temporary keys, or tokens in repo data or backlog notes; any migration against user GitHub data should be a controlled one-time maintenance task with user approval.
- Acceptance Criteria:
  - The main `.hako-site.json` no longer embeds the full background/reference image data by default.
  - Imported reference images are written to a stable asset location, such as a project-specific folder under the Site Planner GitHub data directory.
  - The site save JSON stores structured image reference metadata, including path/URL, mime type, original filename, dimensions, byte size/hash if available, and enough cache information to reload the image.
  - GitHub save uploads or updates the referenced image asset only when needed, avoiding repeated full-image writes when the image has not changed.
  - Loading a Site Planner project resolves the referenced image from local cache when available, and fetches it from the stored asset location when not cached.
  - Loading old embedded-image `.hako-site.json` files still works and can migrate or re-save into the new asset-reference structure.
  - Downloading a site save creates a zip bundle containing the main `.hako-site.json`, referenced asset files, and any other project data files needed to restore the plan offline.
  - Loading from a zip bundle restores the project and image without requiring GitHub access.
  - Autosave/local cache behavior remains reliable for geometry even when the image asset is large or temporarily unavailable.
  - The UI communicates image loading/missing-asset states clearly without losing plan geometry.
  - GitHub library records identify the main project JSON and any related asset folder/path enough for agents and future tools to manage the data.
  - Migration is documented or scripted so existing user saves can be converted safely without hand-editing JSON.
- Agent Starting Points:
  - `site-planner.html`
  - `js/site-planner.js` around `imageMetaForProject`, `projectPayload`, `projectJson`, `loadProject`, `saveSitePlanToGithub`, and `download`.
  - `js/site-planner/state.js`
  - `js/shared/github-data.js`
  - Site Planner GitHub library/settings helpers around site plan records and data paths.
  - Existing autosave metadata around `imageEmbedded`, `imageTooLargeForAutosave`, and image portable status.
  - Add or reuse a zip library/path if the project already has one for downloads.
- Dependencies:
  - Coordinate with `HM-BACKLOG-002` so save progress can show separate JSON and image-asset upload steps.
  - Coordinate with `HM-BACKLOG-031` so file import/load feedback handles zip bundles and remote image fetches consistently.
  - Coordinate with `HM-BACKLOG-014` if STL/site-object assets introduce a shared asset-folder model.

## Export and Fabrication

### HM-BACKLOG-006: Engrave orientation and part labels on core SVG pieces

- Status: Proposed
- Group: Export and fabrication
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/10
- Goal: Add blue engrave labels to core building pieces so builders can identify part numbers and orientation during assembly without marking visible finished surfaces.
- Notes: Labels should only be added to core-piece SVG exports that will not be seen after assembly. Use the existing blue engrave color. Avoid labeling visible cladding, windows, doors, detail parts, or exterior-facing surfaces.
- Acceptance Criteria:
  - Core wall, floor, roof, and hidden structural pieces include a readable engraved label with part identity and orientation where applicable.
  - Labels export on the engrave/score layer using the project’s blue engrave convention.
  - Visible finish pieces and decorative cladding do not receive assembly labels.
  - Labels do not overlap tabs, slots, openings, or cut lines on representative small and large buildings.
- Agent Starting Points:
  - `js/building-generator/core/full-building-generation.js`
  - `js/building-generator/core/roof-generator.js`
  - `js/building-generator/core/part-metadata.js`
- Dependencies:
  - None.

### HM-BACKLOG-012: Fix reversed 3D preview files in downloads

- Status: Proposed
- Group: Export and fabrication
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/16
- Goal: Ensure the 3D preview files generated as part of the download match the actual assembled model orientation instead of appearing reversed or mirrored.
- Notes: User observed that the 3D preview files generated during download seem to mainly be reversed from the actual model. This likely affects the generated STL preview/download artifact rather than only the live Three.js material preview.
- Acceptance Criteria:
  - Downloaded 3D preview files match the actual model's left/right, front/back, and wall-feature orientation.
  - The downloaded preview geometry agrees with the live preview for representative buildings with asymmetric openings, doors, cladding, and roof direction.
  - Existing intentional wall-local mirroring for fabrication remains intact; the fix must not break laser-cut SVG orientation or assembly joinery.
  - At least one asymmetric test or manual fixture verifies front/back, east/west, and roof orientation in the downloaded 3D preview artifact.
  - Any coordinate-system conversion between SVG/export, STL generation, and Three.js preview is documented near the affected code.
- Agent Starting Points:
  - `js/building-generator/core/stl-export-config.js`
  - `js/building-generator/preview/three-preview.js`
  - `js/building-generator/core/output-controller.js`
- Dependencies:
  - May interact with `HM-BACKLOG-010` if gabled-roof STL/preview geometry also needs orientation correction.

### HM-BACKLOG-025: Fix duplicate site/layout plans in Building Generator printed paper output

- Status: Proposed
- Group: Export and fabrication
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/29
- Goal: Ensure the Building Generator printed-paper output produces one clear site/layout reference plan, not two similar but slightly different site-plan prints.
- Notes: User observed that the printed paper section of a building currently generates two site plans, and it is unclear why they both exist or why they differ slightly. Local inspection points to printed-paper output and layout-reference generation paths, including `generatePrintedSheets()`, `replaceBuildingLayoutReferencePrintPart()`, and `renderBuildingFootprintMap()` / `Building layout reference print`. The implementation should determine whether one duplicate is obsolete, whether two different concepts are being conflated, or whether split/runtime output paths are diverging.
- Acceptance Criteria:
  - Generated Building Generator output shows at most one printed-paper site/layout reference plan for a building unless the user explicitly enables multiple distinct reference sheets.
  - The remaining layout reference has a clear name and purpose so it is not confused with a Site Planner project plan.
  - If two different printed plans are genuinely needed, they are visibly distinct, documented in the UI/manifest, and not near-duplicates.
  - The printed-paper section does not contain slightly different duplicate footprint/site-plan graphics for the same building.
  - Downloaded/exported artifacts match the on-screen printed-paper preview.
  - Representative buildings with simple rectangles, wings, bays, and openings are checked so the fix does not remove useful placement/reference information.
- Agent Starting Points:
  - `js/building-generator/core/full-building-generation.js`
  - `js/building-generator/core/part-generators.js`
  - `js/building-generator/ui/opening-editor-floor-bands.js`
  - `js/building-generator-runtime.js`
  - Search for `generatePrintedSheets`, `replaceBuildingLayoutReferencePrintPart`, `renderBuildingFootprintMap`, and `Building layout reference print`.
- Dependencies:
  - Coordinate with `HM-BACKLOG-024` only if removing the stats block changes the surrounding preview layout, but this item should preserve printed-paper generation behavior aside from the duplicate reference plans.

### HM-BACKLOG-034: Fix wooden crate SVG preview and laser color conventions

- Status: Proposed
- Group: Export and fabrication
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/38
- Goal: Make the wooden crate generator show usable SVG previews and align its SVG/export colors with HakoMachi's standard laser-cutting color conventions.
- Notes: User reported that the crate generator does not show SVGs, and it colors all parts in ways that do not resemble the color schema used for cutting the rest of the pieces. Local inspection found the utility at `utils/wooden-crate-generator.html` with logic in `js/utilities/wooden-crate-generator.js`. The tool currently defines its own color variables and preview classes, including black cut lines, blue score lines, and brown etch/label visuals. Other HakoMachi exports should be checked for the canonical laser colors, especially red through-cut and blue engrave/score behavior.
- Acceptance Criteria:
  - The wooden crate generator displays the generated SVG preview in the page after load and after settings changes.
  - The open-preview and download buttons produce visible SVG content that matches the on-page preview geometry.
  - The SVG/export color scheme matches the HakoMachi laser-cutting convention used by the main Building Generator and other utilities.
  - Through-cut geometry uses the standard cut color.
  - Engrave, score, nail, label, and placement geometry use the standard engrave/score color or another documented project convention, without introducing unrelated brown decorative colors into cut files.
  - Rendered thumbnails remain useful for visual inspection, but they do not obscure or contradict the true SVG cutting/engraving colors.
  - The legend/readout text is updated to match the actual colors and operations.
  - Desktop and mobile preview containers show the SVG without collapsing, clipping the whole sheet, or leaving a blank preview area.
- Agent Starting Points:
  - `utils/wooden-crate-generator.html`
  - `js/utilities/wooden-crate-generator.js`
  - `css/utilities.css`
  - `css/hakomachi-shared.css`
  - Compare with Building Generator SVG output/color constants and another working utility export.
- Dependencies:
  - Coordinate with any documented laser color convention used by the Building Generator before changing export colors.

### HM-BACKLOG-035: Add 3D object previews to utility generator pages

- Status: Proposed
- Group: Export and fabrication
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/39
- Goal: Add a bottom-of-page 3D preview to utility generator pages so users can inspect the assembled object those utilities generate, similar to the Building Generator 3D preview experience.
- Notes: User requested generating a 3D preview of the objects built in the utils pages, located at the bottom of the page like the Building Generator preview. This should apply first to utility pages that generate physical objects or parts, such as the wooden crate, safety railing, and industrial shelf generators. The feature should reuse or adapt the existing HakoMachi/Building Generator Three.js preview patterns where practical, while keeping utility-specific geometry lightweight.
- Acceptance Criteria:
  - Utility pages that generate physical objects have a bottom-of-page 3D preview region below the existing 2D/SVG previews.
  - The 3D preview updates when generator settings change, matching the current generated object dimensions and major structural features.
  - The preview uses a familiar interaction pattern from the Building Generator: orbit/drag, zoom, responsive sizing, nonblank render, and a sensible initial camera angle.
  - The preview is visually consistent across utility pages and does not feel like a separate app bolted on underneath.
  - Utility pages without meaningful object geometry are not forced to show an empty or misleading 3D preview.
  - The implementation reuses shared preview helpers/components where practical rather than duplicating large Three.js setup on every utility page.
  - The page still performs acceptably on desktop and mobile; failures show a quiet inline fallback instead of breaking the utility.
  - Representative utility pages are manually verified with at least one default object and one changed configuration.
- Agent Starting Points:
  - `utils/wooden-crate-generator.html`
  - `utils/safety-railing-generator.html`
  - `utils/industrial-shelf-generator.html`
  - `js/utilities/wooden-crate-generator.js`
  - `js/utilities/safety-railing-generator.js`
  - `js/utilities/industrial-shelf-generator.js`
  - `css/utilities.css`
  - `js/building-generator/preview/three-preview.js`
  - `js/building-generator/preview/index.js`
  - `js/shared/building-preview-renderer.js`
- Dependencies:
  - Coordinate with `HM-BACKLOG-034` for the crate generator preview/color cleanup if the crate is one of the first utility pages to receive 3D preview support.
  - Coordinate with any existing Three.js/shared preview renderer assumptions from the Building Generator before extracting reusable utility-preview behavior.

### HM-BACKLOG-036: Standardize SVG generation colors across all pages

- Status: Proposed
- Group: Export and fabrication
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/40
- Goal: Make every SVG-generating page use the same three-color fabrication convention: blue for engraves, red for tabbed retained cuts, and green for untabbed discard/scrap cuts.
- Notes: User requested that all pages support three color themes for SVG generation. Blue is for engraves: features engraved onto an object but not cut through. Red is for cuts with tabs: objects fully cut out but held in place on the final sheet, basically all pieces that will be kept. Green is for cuts without tabs: scrap pieces, internal cutouts, or pieces that do not serve a purpose and can safely be thrown away. Local inspection shows existing SVG generators use mixed color conventions. Some utilities already use red/blue, the wooden crate generator uses black/blue/brown, and the Building Generator has many part/path type producers that likely need a shared operation taxonomy before colors can be made reliable.
- Acceptance Criteria:
  - A single documented SVG operation color convention exists and is referenced by all SVG-producing pages.
  - Blue is used only for engrave/score geometry that marks a surface but does not cut through.
  - Red is used for through-cut geometry that belongs to retained parts, including tabbed outer boundaries and keepable pieces held on the sheet.
  - Green is used for through-cut geometry that creates discard/scrap, such as internal waste cutouts or pieces that are not intended to be kept.
  - Building Generator SVG exports, Site Planner SVG exports, and utility SVG generators use the same colors and legend language.
  - Preview SVGs and downloaded SVG files agree on operation colors, even if preview stroke widths are thicker for visibility.
  - Each generator classifies internal cutouts explicitly enough that future agents can tell whether a cut is retained red or scrap green.
  - Existing blue engrave behavior for labels, nail marks, score lines, placement marks, and surface-only details remains intact.
  - Existing cutting geometry, dimensions, tabs, slots, and kerf behavior are unchanged except for color/operation classification.
  - Representative exports from the Building Generator, Site Planner, wooden crate, safety railing, and industrial shelf utilities are manually checked.
- Agent Starting Points:
  - `js/building-generator/core/full-building-generation.js`
  - `js/building-generator/core/part-generators.js`
  - `js/building-generator/core/part-metadata.js`
  - `js/building-generator/core/layout-cut-geometry.js`
  - `js/building-generator-runtime.js`
  - `js/site-planner.js`
  - `utils/wooden-crate-generator.html`
  - `js/utilities/wooden-crate-generator.js`
  - `utils/safety-railing-generator.html`
  - `js/utilities/safety-railing-generator.js`
  - `utils/industrial-shelf-generator.html`
  - `js/utilities/industrial-shelf-generator.js`
  - `css/hakomachi-shared.css`
  - `css/utilities.css`
- Dependencies:
  - Coordinate with `HM-BACKLOG-034` because the wooden crate generator already needs SVG preview and laser color cleanup.
  - Coordinate with `HM-BACKLOG-006` so engraved core labels continue to use the blue engrave convention.
  - This may benefit from a small shared SVG color/operation helper before updating every generator.

## UI and Workflow

### HM-BACKLOG-002: Show progress while saving site plans to GitHub

- Status: Proposed
- Group: UI and workflow
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/6
- Goal: Give users clear progress feedback while a site plan is being saved to GitHub.
- Notes: The save modal should include a progress bar with estimated completion and a text blurb underneath showing the current action. The modal should auto-close when saving completes unless there is an error.
- Acceptance Criteria:
  - Clicking "Save site plan to GitHub" opens a modal with a visible progress bar and current-action text.
  - Progress advances through the major save steps: preparing project, writing the site plan file, loading/updating the library index, writing the library index, and completion.
  - On successful save, the modal shows completion briefly and then closes automatically.
  - On error, the modal remains open with the failure message and does not auto-close.
  - Desktop and mobile GitHub save buttons use the same progress behavior.
- Agent Starting Points:
  - `js/site-planner.js`
  - `site-planner.html`
  - `css/site-planner.css`
- Dependencies:
  - None.

### HM-BACKLOG-015: Clarify or remove the Site Planner HakoMachi handoff panel

- Status: Done
- Group: UI and workflow
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/19
- Goal: Make the black HakoMachi handoff panel at the bottom of the Site Planner right column understandable and useful, or hide/remove it if it is only developer-facing noise.
- Notes: User noted that the "hakomachi handoff" black box at the bottom of the right column is unclear. Local inspection points to `handoffPreview` in `site-planner.html`, populated by `updateHandoff()` / `makeSeed()` in `js/site-planner.js` as a JSON preview for the selected building handoff.
- Acceptance Criteria:
  - The Site Planner no longer shows an unlabeled black/code-style box whose purpose is unclear.
  - If the handoff preview remains visible, it has a clear user-facing label, explanation, and relevant actions such as copy, export, or open in the building generator.
  - If the preview is developer-only, it is hidden behind an explicit debug/developer control or removed from the normal user workflow.
  - Empty and no-selection states do not leave a confusing blank black box in the right column.
  - Any changed UI works on desktop and narrow/mobile layouts without overlapping controls.
- Agent Starting Points:
  - `site-planner.html`
  - `js/site-planner.js`
  - `css/site-planner.css`
- Dependencies:
  - None known.

### HM-BACKLOG-016: Add drill-down navigation for crowded Site Planner right pane

- Status: Proposed
- Group: UI and workflow
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/20
- Goal: Reduce scrolling in the Site Planner right pane by replacing always-expanded object lists with a drill-down navigation flow organized by object type.
- Notes: User noted that the right pane can quickly fill with content and require a lot of scrolling. Suggested a top-level card for each item type currently present on the plan. Clicking an item-type card drills into that type's list, and selecting a specific building/object continues one level deeper into its details. A back button at the top should show the current type/view label.
- Acceptance Criteria:
  - The Site Planner right pane starts with a compact top-level overview of object types that exist on the current plan, such as buildings, roads, road features, fabric areas, benchwork, streetlights, annotations, and future STL/site objects where applicable.
  - Clicking an object-type card opens a focused list for that type using the same useful card information currently shown in the top-level lists.
  - Selecting an individual object opens its detail/properties view one level deeper without losing the ability to go back to the object-type list and then back to the overview.
  - The current canvas selection stays synchronized with the sidebar drill-down state, including objects selected directly on the canvas.
  - Empty object types are hidden or clearly disabled so the top-level overview stays compact.
  - The layout works on desktop and mobile without excessive nested scrolling or overlapping controls.
- Agent Starting Points:
  - `site-planner.html`
  - `js/site-planner.js`
  - `css/site-planner.css`
  - Existing sidebar functions around `renderList()`, `renderSelectedCore()`, and `syncSidebarDetailMode()`.
- Dependencies:
  - Coordinate with `HM-BACKLOG-005` and `HM-BACKLOG-009` so fabric areas appear in the new object-type navigation once selectable/useful.

### HM-BACKLOG-019: Create themed segmented toggle component for 2D/3D view selector

- Status: Done
- Group: UI and workflow
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/23
- Goal: Replace the current blue-highlight 2D/3D view selector with a reusable themed segmented-toggle style where the options read as one grouped control and a moving selection indicator shows the active mode.
- Notes: User noted that the toggle at the top of the Site Planner page between 2D and 3D has a blue highlight state that does not match the app theme. Desired behavior is a component style for selectors like this: visually merged segments with the grouping moving/sliding to show which option is selected.
- Acceptance Criteria:
  - The Site Planner 2D/3D view toggle no longer uses the mismatched blue active highlight.
  - The 2D and 3D options render as a single grouped segmented control rather than separate buttons that only share proximity.
  - The active state uses HakoMachi theme tokens/colors and includes a moving or sliding selected indicator when switching modes.
  - The component style is reusable for future two-option or small segmented selectors without hard-coding only the 2D/3D labels.
  - Keyboard focus, hover, active, and disabled states remain clear and accessible.
  - The control works cleanly on desktop and mobile without text clipping, layout shift, or overlap with nearby 3D toolbar controls.
  - Existing view switching behavior remains unchanged.
- Agent Starting Points:
  - `site-planner.html`
  - `css/site-planner.css`
  - `js/site-planner.js`
  - Existing 2D/3D toggle markup around `site3dSegment`, `site3dFabBtn`, `view2dCanvasBtn`, and `view3dCanvasBtn`.
  - Existing view-mode active-state updates around `setViewMode()` / `bindSite3DButtons()`.
- Dependencies:
  - Coordinate visually with `HM-BACKLOG-017` if the 3D toolbar gains layout-image controls in the same area.

### HM-BACKLOG-020: Standardize context menu alignment and item layout

- Status: Done
- Group: UI and workflow
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/24
- Goal: Make all HakoMachi context menus and dropdown menus visually consistent by using left-aligned menu items, consistent icon treatment, and shared spacing/alignment rules.
- Notes: User noted that context menus are inconsistent: some have icons, some do not, some are center-aligned, and some are left-aligned. The desired outcome is a more unified menu component/pattern rather than one-off styling per menu.
- Acceptance Criteria:
  - All context menu and dropdown menu item labels are left-aligned.
  - Menu items use a consistent layout whether or not an icon is present, such as a reserved icon column or a clearly documented no-icon variant.
  - Canvas context menus, toolbar dropdowns, tool flyouts, sidebar overflow menus, and mobile overflow menus follow the same spacing, alignment, hover, active, disabled, and danger-state conventions.
  - Existing icons are kept only where they add clarity; icon presence does not shift text alignment unpredictably between menu items.
  - The shared menu styling lives in the most appropriate common CSS layer, with Site Planner-specific overrides minimized.
  - Menus remain keyboard/focus accessible and usable on desktop and mobile.
  - Existing menu actions continue to work unchanged.
- Agent Starting Points:
  - `css/hakomachi-shared.css`
  - `css/site-planner.css`
  - `site-planner.html`
  - `js/site-planner.js`
  - Existing selectors around `.dropdownMenu`, `.menuItem`, `.contextMenu`, `.toolFlyout`, and `.sidebarOverflowMenu`.
  - Existing context-menu rendering around `showContextMenu()`.
- Dependencies:
  - Coordinate visually with `HM-BACKLOG-019` if segmented controls and menu components share updated UI tokens.

### HM-BACKLOG-021: Remove floating Site Planner canvas status overlay

- Status: Done
- Group: UI and workflow
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/25
- Goal: Remove the floating text status overlay from inside the Site Planner canvas/3D view so the work area stays visually clean and focused on the layout.
- Notes: User said the floating status bar inside the Site Planner canvas is not needed: text such as the current view, number of buildings, or similar status details feels like a useless feature. Local inspection points to the `site3dStatus` overlay created in `ensureSite3dView()`, styled by `.site3dStatus`, and updated through `setSite3DStatus()`.
- Acceptance Criteria:
  - The Site Planner canvas/3D view no longer shows a floating status text box for view name, building count, generator-preview count, base-source text, or similar informational summaries.
  - Removing the overlay does not break 2D/3D view switching or Three.js initialization.
  - Critical failure messages, such as Three.js not loading, are still surfaced in an appropriate non-intrusive place or through an existing app-level message pattern.
  - Canvas controls and layout remain correctly positioned after the overlay is removed.
  - Any now-unused overlay CSS/DOM/update code is removed or simplified so future agents do not keep maintaining dead UI.
- Agent Starting Points:
  - `js/site-planner.js`
  - `css/site-planner.css`
  - Existing overlay creation in `ensureSite3dView()`.
  - Existing status helper `setSite3DStatus()`.
  - Existing status update near `updateSite3D()`.
- Dependencies:
  - Coordinate visually with `HM-BACKLOG-017` and `HM-BACKLOG-019` because they also affect controls inside or near the Site Planner canvas toolbar.

### HM-BACKLOG-022: Remove copy/paste buttons from Site Planner building detail card

- Status: Done
- Group: UI and workflow
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/26
- Goal: Simplify the Site Planner right-hand building detail card by removing physical Copy and Paste buttons, relying on existing keyboard shortcuts for footprint copy/paste.
- Notes: User noted that copy/paste is already supported through keyboard interactions, so the right-hand building card does not need dedicated physical buttons. Local inspection shows Copy/Paste buttons in the selected-building detail card and multi-building selection card, while keyboard shortcuts still call the existing copy/paste helpers separately.
- Acceptance Criteria:
  - The selected building detail card in the right pane no longer shows `Copy` or `Paste` buttons for footprint copy/paste.
  - The multi-building selected card no longer shows physical `Copy` or `Paste` buttons unless a distinct non-keyboard workflow is intentionally retained and justified.
  - Keyboard copy/paste shortcuts for selected footprints continue to work unchanged.
  - Any remaining building-card actions stay clear and useful, such as Open in HakoMachi, Copy HakoSeed, Convert to Polygon, Delete, or overflow-menu actions where applicable.
  - Empty/disabled paste button states are removed with the buttons, so the right pane feels less cluttered.
  - No unrelated copy actions are removed, such as Copy HakoSeed or Copy path in the GitHub library, unless intentionally handled by a separate backlog item.
- Agent Starting Points:
  - `js/site-planner.js`
  - `site-planner.html`
  - Existing selected-panel rendering in `renderSelectedCore()`.
  - Existing footprint helpers `copySelectedFootprint()` and `pasteFootprintFromClipboard()`.
  - Existing keyboard shortcut handling around copy/paste events.
- Dependencies:
  - Coordinate with `HM-BACKLOG-016` because the right-pane drill-down redesign may also touch the selected building card.

### HM-BACKLOG-023: Move Open in HakoMachi to bottom full-width primary action

- Status: Done
- Group: UI and workflow
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/27
- Goal: Make the selected-building right-pane card hierarchy clearer by moving the `Open in HakoMachi` action to the bottom of the card as a full-width primary button.
- Notes: User requested moving the "Open in HakoMachi" button to the bottom of the right card in the Site Planner/Site Builder. As the primary action, it should appear below the content and take the whole width of the area. Local inspection shows it currently renders near the top of the selected-building detail card beside `Copy HakoSeed` in `renderSelectedCore()`.
- Acceptance Criteria:
  - In the selected building detail card, `Open in HakoMachi` appears below the building properties/content rather than near the top action row.
  - The button is styled as the primary action for the card and spans the available content width.
  - Secondary actions such as `Copy HakoSeed`, `Download .hako`, or `Convert to Polygon` remain visually secondary and do not compete with the primary action.
  - The moved button still opens the selected building in HakoMachi with the same behavior as before.
  - The layout works on desktop and mobile without overflow, clipping, or awkward button stacking.
  - This change should remain compatible with the planned removal of copy/paste buttons from the same card.
- Agent Starting Points:
  - `js/site-planner.js`
  - `css/site-planner.css`
  - Existing selected-building card rendering in `renderSelectedCore()`.
  - Existing `openSelectedHakoB` wiring and `openBuildingInHakoMachi()`.
- Dependencies:
  - Coordinate with `HM-BACKLOG-022`, since both items simplify the selected-building right-pane card.
  - Coordinate with `HM-BACKLOG-016` if the right-pane drill-down redesign changes where the selected-building detail card is rendered.

### HM-BACKLOG-024: Remove stats block from Building Generator preview

- Status: Done
- Group: UI and workflow
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/28
- Goal: Remove the stats block from the top of the Building Generator preview area so the interface focuses on useful controls and generated output.
- Notes: User said the stats at the top of the Building Generator are not useful information. Local inspection shows a `#stats` element in `building-generator.html` above `#output`, with generated stats such as building footprint, real-world size, core parts, cladding parts, windows, and doors rendered from the building generator runtime/internal-wall editor paths.
- Acceptance Criteria:
  - The Building Generator no longer shows the top stats section above the generated output/preview.
  - Building name or other genuinely useful project identity information is preserved elsewhere only if it is still needed for orientation.
  - Removing the stats UI does not remove calculations that are still required for generated parts, exports, manifests, previews, or validation.
  - Related DOM/CSS/update code for the Building Generator stats block is removed or simplified so no empty stats container remains.
  - Utility pages that use their own `stats` elements are not affected by this cleanup.
  - The preview area layout still looks clean on desktop and mobile after the stats block is removed.
- Agent Starting Points:
  - `building-generator.html`
  - `js/building-generator-runtime.js`
  - `js/building-generator/ui/internal-wall-editor.js`
  - Generated stats rendering around `document.getElementById('stats')`.
  - `css/hakomachi.css` if any stats-specific spacing or preview-section styling needs cleanup.
- Dependencies:
  - None known.

### HM-BACKLOG-026: Add Save and return action to Building Generator title card for Site Planner handoff

- Status: Done
- Group: UI and workflow
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/30
- Goal: When a building is opened from the Site Planner, show a primary `Save and return to Site Planner` action inside the Building Generator right-side title card.
- Notes: User requested that if a building is opened from the Site Planner, the title card on the right should include a primary action button to save and return to the site plan tool. Local inspection shows an existing Site Planner bridge in `js/building-generator/main.js`, including `pushCurrentBuildingToSitePlanner()`, `makeSitePlannerBuildingUpdate()`, and an overflow-menu button labeled `Push, Close & Return`. The new work should place that workflow in the title card and make it the obvious primary action when handoff metadata exists.
- Acceptance Criteria:
  - When the current Building Generator config includes Site Planner handoff metadata, the right-side building title card shows a full-width primary button labeled clearly, such as `Save and return to Site Planner`.
  - Clicking the button sends the current building config back to the originating Site Planner footprint using the existing building-update bridge behavior.
  - After a successful update, the workflow returns focus to the Site Planner and closes the generator tab when the browser allows it, matching existing bridge behavior.
  - The button does not appear for standalone buildings that were not opened from the Site Planner, or appears disabled with a clear non-intrusive explanation if that is the chosen pattern.
  - The existing overflow-menu push/return action is removed, demoted, or kept only if it does not create duplicate/confusing primary actions.
  - The title card remains clean after `HM-BACKLOG-024` removes stats from the same area.
  - Errors, missing planner IDs, or blocked tab-close behavior show a clear status message without losing user changes.
- Agent Starting Points:
  - `js/building-generator/main.js`
  - `js/building-generator/ui/internal-wall-editor.js`
  - `js/building-generator-runtime.js`
  - `css/hakomachi.css`
  - Existing title-card rendering around `renderBuildingNameHtml()` / `buildingTitleCard`.
  - Existing bridge functions: `plannerHandoffFromConfig()`, `pushCurrentBuildingToSitePlanner()`, and `installSitePlannerPushButton()`.
- Dependencies:
  - Coordinate with `HM-BACKLOG-024` because removing the stats block may change where the title card is rendered.
  - Coordinate with `HM-BACKLOG-023` for consistent primary action placement between Site Planner and Building Generator detail cards.

### HM-BACKLOG-027: Explore acrylic floating config rail visual style

- Status: Proposed
- Group: UI and workflow
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/31
- Goal: Explore a more visually sophisticated configuration-panel treatment by restyling the Building Generator left config rail as a floating acrylic-like card instead of a flat box attached to the page edge.
- Notes: User is not fully committed to the direction yet, but suspects the Building Generator could feel more refined if the left-hand config bar used transparent/acrylic styling and floated above the page. If successful, this visual language could be shared with similar configuration panels on utility pages.
- Acceptance Criteria:
  - A prototype or implemented style makes the Building Generator left config panel feel like a floating card above the page rather than a hard-attached side box.
  - The treatment uses restrained acrylic/glass-like styling, such as subtle translucency, backdrop blur where supported, border, and shadow, while preserving the HakoMachi theme colors.
  - Readability, contrast, scrolling, sticky actions, and form usability remain strong over the page background.
  - The panel still behaves correctly on desktop, narrow/mobile layouts, and long configuration forms without awkward clipping or hidden controls.
  - The design is documented or structured as a reusable config-panel pattern that can be evaluated for utility pages.
  - At least one utility-page config panel is reviewed as a candidate for the shared style, but utility pages are not restyled wholesale unless the pattern proves suitable.
  - The implementation avoids decorative excess and keeps dense operational controls easy to scan.
- Agent Starting Points:
  - `building-generator.html`
  - `css/hakomachi.css`
  - `css/hakomachi-shared.css`
  - `css/utilities.css`
  - Utility pages using `.utility-page .controls` or `main > .panel:first-child`.
  - Building Generator left panel selectors around `.controls`, `.controls-scroll`, and `.sticky-actions`.
- Dependencies:
  - Coordinate visually with `HM-BACKLOG-019` and `HM-BACKLOG-020` if shared UI tokens for segmented controls and menus are updated.
  - Coordinate with `HM-BACKLOG-024` and `HM-BACKLOG-026` because those items affect the Building Generator right-side title/preview area and the overall page balance.

### HM-BACKLOG-028: Remove repeated HakoMachi title from landing page card

- Status: Done
- Group: UI and workflow
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/32
- Goal: Remove the repeated `HakoMachi` text at the top of the landing page body card because the logo immediately above already provides the brand name.
- Notes: User noted that the `HakoMachi` text at the top of the body card repeats the logo above. Local inspection shows the SVG landing logo includes `HakoMachi`, and the card header repeats it as `h1#landingTitle` in `index.html` with `data-i18n="title"`.
- Acceptance Criteria:
  - The landing page body card no longer displays a repeated `HakoMachi` title directly under the logo.
  - The landing page still has a clear accessible page/card label, using an appropriate hidden heading, aria label, or revised heading structure if needed.
  - The subtitle and tool cards remain visually balanced after the title is removed.
  - English and Japanese landing-page translation keys are cleaned up or left only if still used for accessibility.
  - SEO metadata, document title, OpenGraph/Twitter metadata, and the visible logo text remain unchanged.
  - Desktop and mobile landing layouts still have polished spacing after the repeated title is removed.
- Agent Starting Points:
  - `index.html`
  - `css/landing.css`
  - `js/i18n/landing.js`
  - Existing landing markup around `.landing-logo`, `.landing-card`, `landingTitle`, and `.landing-header`.
- Dependencies:
  - None known.

### HM-BACKLOG-029: Explore acrylic elevation treatment for landing page main card

- Status: Proposed
- Group: UI and workflow
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/33
- Goal: Explore applying a restrained acrylic/elevated visual treatment to the landing page main card so it feels more polished while staying consistent with HakoMachi's practical tool-first UI.
- Notes: User suggested the landing page main card may be another place to introduce acrylic-like elevations. This relates to the visual language exploration in `HM-BACKLOG-027`, but the target surface is specifically the landing page body/main card. Current styling uses `.landing-card` layered on top of shared `.hako-card`, which is intentionally flat: white background, 1px border, 4px radius, no shadow.
- Acceptance Criteria:
  - A prototype or implemented treatment gives the landing page main card subtle elevation compared with the page background.
  - The treatment uses restrained acrylic/glass-like styling, such as soft translucency, backdrop blur where supported, border, and/or shadow, without making the card feel decorative or noisy.
  - The logo, subtitle, tool cards, utility links, and language switcher remain readable and visually balanced.
  - The landing card still works cleanly on desktop and mobile, including small screens where excessive shadow/transparency could feel cramped.
  - The pattern is structured so it can be evaluated as part of a shared HakoMachi visual language rather than being an isolated landing-page hack.
  - If the treatment does not improve clarity or polish, the implementation should be easy to revert or leave as a documented design experiment.
- Agent Starting Points:
  - `index.html`
  - `css/landing.css`
  - `css/hakomachi-shared.css`
  - Existing selectors around `.landing-shell`, `.landing-card`, and `.hako-card`.
- Dependencies:
  - Coordinate with `HM-BACKLOG-027` so acrylic/elevation styling for the landing card and config rail feels like one visual language.
  - Coordinate with `HM-BACKLOG-028` because removing the repeated landing title changes the main card's spacing and visual balance.

### HM-BACKLOG-031: Add branded import/upload modal for file imports

- Status: Proposed
- Group: UI and workflow
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/35
- Goal: Replace browser/default-looking import and upload feedback with an in-app HakoMachi modal for importing `.hako` and other supported file types.
- Notes: User requested that importing a `.hako` file or other file type should use an uploading modal that resembles the app, rather than the one the browser provides, and should be visually consistent with the save progress modal. The native OS/browser file picker may still be needed for local file selection; this item focuses on the app-side feedback after a file is selected or dropped, including reading, validating, parsing/upgrading, applying, success, and error states. Likely surfaces include Site Planner `.hako`/project/image imports, Building Generator `.hako`/`.hakoseed`/`.hakoplan`/JSON imports, material library imports, and future STL/drop imports.
- Acceptance Criteria:
  - Import and drop flows show a branded HakoMachi modal after a file is selected or dropped instead of relying on default browser-looking progress or status UI.
  - Modal uses shared styling and the same progress/action text pattern as the save progress modal.
  - Modal shows the current action, such as reading file, validating, parsing/upgrading, applying to project/building/materials, and finishing.
  - Successful imports auto-close after completion.
  - Import errors keep the modal open and show a useful recovery message.
  - Picker-based imports and drag-and-drop imports share the same modal behavior.
  - Site Planner, Building Generator, and utility/material import surfaces continue to import the same supported file types.
  - Accessibility is handled with focus management, useful labels/live regions, and escape/cancel behavior where safe.
- Agent Starting Points:
  - `site-planner.html`
  - `js/site-planner.js`
  - `building-generator.html`
  - `js/building-generator/core/stl-export-config.js`
  - `js/building-generator/core/materials-form.js`
  - `utils/material-manager.html`
  - `css/hakomachi-shared.css`
  - `css/hakomachi.css`
  - `HM-BACKLOG-002` save progress modal plan.
- Dependencies:
  - Coordinate with `HM-BACKLOG-002` so save and import progress modals share one visual language or component.
  - Coordinate with `HM-BACKLOG-014` and `HM-BACKLOG-018` if STL or `.hako` drop/import routing changes at the same time.

### HM-BACKLOG-032: Fix Site Planner right-pane back button overlapping overflow menu

- Status: Done
- Group: UI and workflow
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/36
- Goal: Ensure the Site Planner right-column back button and overflow menu can both be used without the back button sitting on top of the opened menu.
- Notes: User reported that in the site editor, the back button added to the right-hand column sits on top of the overflow menu when it opens. Local inspection found the right-pane detail header/back button and building overflow menu generated in `js/site-planner.js`, with styling in `css/site-planner.css` around `.sidebarBackBtn`, `.sidebarOverflowWrap`, and `.sidebarOverflowMenu`.
- Acceptance Criteria:
  - Opening the right-column overflow menu shows the full menu above or away from the back button without overlap.
  - The back button remains visible and clickable when the menu is closed.
  - Menu layering, placement, and hit targets work for the building detail view and any other right-pane detail views that use the same header pattern.
  - Keyboard and focus behavior remains usable: opening the menu moves focus predictably, escape/outside click closes it, and tab order does not trap users behind overlapped elements.
  - The fix works at narrow and desktop widths, including when the right pane is scrollable.
  - The implementation does not introduce regressions to top-bar overflow menus or context menus.
- Agent Starting Points:
  - `js/site-planner.js` around `sidebarBackBtn`, `sidebarOverflowBtn`, `sidebarBuildingOverflowMenu`, and `clearSidebarDetailSelection`.
  - `css/site-planner.css` around `.sidebarBackBtn`, `.sidebarDetailHeader`, `.sidebarOverflowWrap`, `.sidebarOverflowMenu`, and related z-index/menu-open rules.
  - `site-planner.html` for top-level menu patterns that should not regress.
- Dependencies:
  - Related to `HM-BACKLOG-020` for broader context menu/menu consistency, but this overlap bug can be fixed independently.

### HM-BACKLOG-033: Remove stale download alert from Building Generator exports

- Status: Done
- Group: UI and workflow
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/37
- Goal: Remove the stale alert or error state shown during downloads so exporting a building does not interrupt the user with outdated early-development messaging.
- Notes: User requested removing the alert when downloading. It was useful early on, but now likely fails every time because it was not updated as features were added, and the user thinks it is probably safe to remove this error state fully. Local search found download-related warning/confirmation text in the Building Generator export path, especially `js/building-generator/core/part-metadata.js`, plus corresponding generated/runtime code in `js/building-generator-runtime.js`. Agents should verify the current alert/confirm source before editing so only the stale download-specific warning is removed, not unrelated import/GitHub error messages.
- Acceptance Criteria:
  - Downloading or exporting a generated building no longer shows the stale alert, confirm, or error state that blocks or warns every time.
  - The download still starts normally for ZIP, STL, `.hako`, and other existing building export buttons.
  - Legitimate download failures are still handled in a non-stale way, such as a concise inline status message or console error if appropriate.
  - Removing the alert does not suppress validation that is still required to prevent broken exports.
  - Generated download contents are unchanged except for the removed warning behavior.
  - Any generated bundle/runtime file is updated through the repo's normal build or source workflow if required.
- Agent Starting Points:
  - `js/building-generator/core/part-metadata.js`
  - `js/building-generator/core/stl-export-config.js`
  - `js/building-generator/ui/output-controller.js`
  - `js/building-generator-runtime.js`
  - Search for download-related `alert(`, `confirm(`, and stale warning text before editing.
- Dependencies:
  - None known.

## Internationalization

_No feature entries yet._

## Documentation and Maintenance

### HM-BACKLOG-030: Add privacy-conscious analytics with test/dev exclusion

- Status: Proposed
- Group: Documentation and maintenance
- Priority: Untriaged
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/34
- Goal: Add lightweight analytics, such as Google Analytics or another free/privacy-conscious option, so we can understand how many people use HakoMachi and which app areas/features are being used.
- Notes: User wants basic usage visibility across the app, including feature usage, while avoiding analytics capture during Playwright tests and similar automated/dev activity. Local inspection did not find an existing analytics implementation.
- Acceptance Criteria:
  - A free analytics option is selected and documented, with rationale for Google Analytics versus plausible alternatives such as Plausible, Umami, or another lightweight choice.
  - Analytics load only in appropriate deployed/production contexts and are disabled for local development, localhost/127.0.0.1, `file://` usage, automated tests, and Playwright-controlled sessions.
  - The implementation tracks high-level app/page usage across landing page, Site Planner, Building Generator, and utility pages.
  - Feature/event tracking captures useful non-sensitive actions such as opening major tools, switching 2D/3D view, starting exports/downloads, using GitHub save/load, opening editors, and generating parts.
  - Tracking avoids collecting model geometry, project contents, file names, GitHub tokens, personal data, or other sensitive user content.
  - The analytics wrapper fails safely if the provider is blocked or unavailable and never breaks app behavior.
  - There is a clear way for implementation/test agents to verify analytics suppression during Playwright or automated runs.
  - Any needed setup values, such as measurement ID or provider endpoint, are documented and isolated from code that should remain public-safe.
- Agent Starting Points:
  - `index.html`
  - `site-planner.html`
  - `building-generator.html`
  - Utility pages under `utils/`.
  - Shared JavaScript/CSS entry points where a small analytics wrapper could be loaded consistently.
  - Existing test/dev detection opportunities such as hostname checks, query/hash flags, storage flags, or Playwright globals.
- Dependencies:
  - Choose provider and measurement/project ID before enabling production tracking.
  - Coordinate with any future privacy/cookie notice work if the selected provider requires it.

### HM-BACKLOG-001: Create agent-ready feature backlog

- Status: Done
- Group: Documentation and maintenance
- Priority: High
- GitHub Issue: https://github.com/GeorgeHinch/HakoMachi/issues/5
- Goal: Provide a durable Markdown backlog where feature ideas can be grouped, normalized, and handed to agents for implementation.
- Notes: User requested a backlog that groups similar features and lets agents churn through them.
- Acceptance Criteria:
  - `docs/backlog.md` exists and describes how to add future feature entries.
  - The backlog includes stable IDs, simple statuses, groups, and an agent-ready entry template.
  - Future entries can be added without renumbering existing backlog items.
- Agent Starting Points:
  - `docs/backlog.md`
  - `docs/README.md`
- Dependencies:
  - None.
