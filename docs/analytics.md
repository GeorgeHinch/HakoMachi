# HakoMachi Analytics

HakoMachi uses a small shared analytics wrapper at `js/shared/hakomachi-analytics.js`.

- Provider: Google Analytics / Google tag
- Measurement ID: `G-EVTQYBFJXS`
- Source of truth for the ID: `HAKOMACHI_ANALYTICS_CONFIG.measurementId`

## Privacy Boundary

Analytics events are limited to high-level usage signals:

- page/tool views
- navigation between major tools
- 2D/3D view switching
- export/download actions
- GitHub save/load/settings actions
- generator/editor actions such as preview refresh or opening an editor

Events must not include model geometry, project contents, pasted SVG data, file names, GitHub tokens, repository settings, free-form user text, or other personal data. The wrapper only forwards a small allowlist of parameter keys and normalizes values into short tokens.

## Suppression Rules

Analytics is disabled automatically when any of these are true:

- the page is loaded from `file://`
- the hostname is `localhost`, `127.0.0.1`, `::1`, or blank
- the browser reports automation through `navigator.webdriver`
- the page has `?hm_analytics=0` or `?analytics=0`
- `window.__HAKOMACHI_DISABLE_ANALYTICS__` is set before the module runs
- `localStorage.hakomachiAnalyticsDisabled` or `sessionStorage.hakomachiAnalyticsDisabled` is `1`, `true`, or `yes`
- the page is not running on the configured production host, unless `?hm_analytics=1` is present

Automated browser suppression wins over the non-production opt-in, so Playwright runs stay silent even if a URL includes `?hm_analytics=1`.

## Verification

In local development or Playwright, the browser should report:

```js
window.HakoMachiAnalytics.enabled === false
document.documentElement.dataset.hakomachiAnalytics === 'disabled'
document.querySelector('script[data-hakomachi-analytics="google-tag"]') === null
```

On the deployed GitHub Pages host, analytics should load without blocking app behavior if the Google tag script is unavailable.
