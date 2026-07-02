# GitHub Datastore Guide

HakoMachi can use a GitHub repository as a private datastore for Site Planner
projects, building files, reference images, and site-local assets. This gives a
layout project a durable history outside the browser cache while still allowing
local ZIP downloads when you want an offline package.

## Why Use A Datastore Repository

Use a GitHub datastore when you want:

- Version history for site plans and building files.
- A shared place for Site Planner saves across browsers or machines.
- Separate storage for large assets such as reference images, attached `.hako`
  files, and imported STL objects.
- A reviewable record of what changed between saves.

The datastore is project data, not app source code. It can be a private
repository.

## Create The Repository

1. In GitHub, create a new repository for HakoMachi save data.
2. Keep it private unless you intentionally want the saved layout data public.
3. Add a README if you want a visible project note, but it is not required.
4. Keep the default branch as `main` unless you have a reason to use another
   branch.

Recommended repository layout:

```text
library.json
site-plans/
  my-layout.hako-site.json
  my-layout/
    assets/
      reference-image.png
      buildings/
        station.hako
        shop-row.hako
      stl/
        vending-machine.stl
        sources/
          vending-machine.scad
```

The exact site ID folder is generated from the saved site name. Asset filenames
are slugged from the original file/building names and get numeric suffixes when
needed.

## Authorize HakoMachi

The Site Planner currently connects through the GitHub data settings dialog.

1. Open Site Planner.
2. Open the GitHub menu.
3. Choose `GitHub data settings`.
4. Enter:
   - `Private data repo`: `owner/repository`, for example
     `GeorgeHinch/hakomachi_savedata`.
   - `Branch`: usually `main`.
   - `Fine-grained token`: a GitHub token for this data repository.
   - `Footprint library path`: usually `library.json`.
   - `Site plan files directory`: usually `site-plans`.

Use a fine-grained personal access token scoped only to the datastore
repository. It needs repository Contents read/write access. Do not commit tokens
to this repository, paste them into project files, or share them in public
issues. HakoMachi stores the token only in the current browser.

## Save And Load

`Save site plan to GitHub` writes:

- The main `.hako-site.json` project file.
- Reference image assets outside the main JSON.
- Attached building `.hako` files under `assets/buildings/`.
- STL model assets under `assets/stl/`.
- STL source files under `assets/stl/sources/`.
- The shared library index, so the plan appears in GitHub load lists.

`Load site plan from GitHub` reads the site plan JSON, then resolves referenced
assets from their stored paths. If an asset is missing, the rest of the site plan
still loads. The affected object shows an unavailable or fallback state where
the UI has enough metadata to do so.

Local browser autosave is separate. It protects in-progress edits in the current
browser, but it is not the same as publishing the project back to GitHub.

## Local Files And ZIPs

The local Save button downloads a ZIP package. The package mirrors the GitHub
asset split:

- `hakomachi-site.hako-site.json`
- `assets/`
- `assets/buildings/`
- `assets/stl/`
- `assets/stl/sources/`
- `manifest.json`

Use this ZIP when you want a portable snapshot. Use GitHub save when you want
the shared datastore and version history updated.

## Naming And Version History

- Use stable, descriptive site names such as `Kanda Station Block` or
  `Showa Shopping Street`.
- Keep one active branch, usually `main`, for day-to-day saves.
- Use branches only when you intentionally want an experimental copy of the
  datastore.
- Avoid renaming site folders or asset files by hand unless you also update the
  references in the `.hako-site.json` file.
- If multiple people save to the same branch at the same time, load the latest
  project before continuing so you do not overwrite someone else's newer data.

## Troubleshooting

Missing permissions:
Make sure the token is fine-grained for the datastore repository and has
Contents read/write access.

Disconnected account or expired token:
Create a new token in GitHub, then replace the token in GitHub data settings.

Incorrect repository path:
Use `owner/repository`, not a full GitHub URL.

Incorrect branch:
Confirm the branch exists in the datastore repository and matches the Site
Planner setting.

Missing asset after load:
Check the asset path in the site plan JSON and confirm the file exists in the
repository. Restore the missing file or re-save the object from HakoMachi.

Stale browser cache:
Use the app's cache reset option only after saving or downloading anything you
need to keep.

Merge conflicts or accidental overwrites:
Use GitHub history to inspect the affected `.hako-site.json` or asset file. If
needed, restore a previous version from GitHub, then reload the plan in
HakoMachi.

Large saves feel slow:
The app stores large files as separate assets and skips unchanged base64 assets
where possible. First saves after importing images, `.hako` files, or STL files
will still take longer than metadata-only edits.
