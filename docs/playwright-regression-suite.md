# Playwright Regression Suite

The browser regression suite lives in `tests/` and runs against the local static server configured in `playwright.config.js`.

## Commands

- `npm run check:browser` runs the Playwright suite with the default reporter.
- `npm run check:browser:ci` runs the same suite with a compact line reporter for CI logs.
- `npm run check:full` runs syntax, runtime, i18n, and browser checks together.

## Coverage Areas

- Landing page navigation, language switching, and analytics suppression in automated/local contexts.
- Site Planner project restore, SVG/CSV/`.hako-site` package export/import, legacy `.zip` import, 3D view activation, and autosave preservation.
- Building Generator setting edits, `.hako` export, `.hako` import, SVG output, and live 3D preview readiness.
- Utility page SVG/settings export smoke coverage for reusable fabrication tools.
- Existing targeted regressions for 3D materials, site planner road and track tools, object clipboard behavior, module splitting, viewport sizing, assembly illustrations, and building bay rendering.

The desktop project runs the full interaction regression matrix. Tablet and mobile projects run the shared core workflows, short-viewport checks, and 3D smoke coverage so responsive layout regressions are covered without forcing desktop-only canvas interaction scripts through touch-first chrome.

## CI Artifacts

GitHub Actions runs `npm run check` and `npm run check:browser:ci` on pull requests and pushes to `main`. Playwright reports, traces, screenshots, and test result artifacts are uploaded when present so failures can be inspected without rerunning locally.
