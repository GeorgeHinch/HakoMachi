# HakoMachi Docs

This directory holds project documentation that is useful beyond a single commit.

## Structure

- `changelog.md` records notable user-facing fixes, compatibility changes, and release-level notes.
- `backlog.md` documents that GitHub Issues are the source of truth for feature tracking.
- `github-datastore.md` explains how to use a GitHub repository as a private HakoMachi datastore.
- `svg-fabrication-colors.md` defines the shared SVG fabrication operation names and laser colors.
- `site-planner-stl-assets.md` defines the Site Planner STL placement and asset metadata schema.
- `dev/` holds active implementation notes, migration plans, and contributor-facing technical notes.
- `decisions/` is reserved for durable architecture or product decisions when the reasoning needs to be preserved.

## What belongs elsewhere

- Put project overview, screenshots, and basic usage in the root `README.md`.
- Put short fix details in the commit message or pull request description.
- Add a docs file only when the information will help future development, debugging, or release tracking.
