# Site Planner Image Assets

The Site Planner save format keeps large reference images outside the main `.hako-site.json` payload.

## Local Downloads

- The Save button downloads `hakomachi-site.hako-site`.
- The `.hako-site` package is a ZIP-backed container that contains `hakomachi-site.hako-site.json`.
- If the plan has a background/reference image, the image is stored under `assets/`.
- The project JSON stores `image.asset` metadata with the image path, MIME type, dimensions, byte length, and a stable hash.
- Legacy `.hako-site.json` files with embedded `image.dataUrl` still load.

## GitHub Saves

- The main site plan remains at the configured site-plan path, for example `site-plans/my-layout.hako-site.json`.
- Background images are written as binary assets at `site-plans/<site-id>/assets/<image-name>`.
- The GitHub library index stores the site plan path and any related asset paths in `paths.assets`.
- Loading a GitHub site plan resolves `image.asset.path` and restores the image data into the local editor session.

## Agent Notes

- New save paths should prefer external `image.asset` references over embedded `image.dataUrl`.
- Do not renumber or rewrite old saved data. The loader supports both the legacy embedded shape and the external asset shape.
- If changing the asset layout, update both local package load/save and GitHub load/save together.
