# Cache-Busting Strategy

HakoMachi is deployed as a static GitHub Pages site without a build step. Runtime HTML and JavaScript files may use `?v=` query strings to force browsers to pick up changed assets, but every runtime reference must use the same shared asset version token.

## Standard

- Use one token across all runtime `.html` and `.js` references.
- Use a release-shaped token such as `hm-assets-20260717-1`.
- Do not use feature names or stale implementation names in `?v=` values.
- Update the token when deploying changes that need to invalidate browser caches across pages or module graphs.

## Updating The Token

Run:

```sh
npm run cache:version -- hm-assets-YYYYMMDD-N
```

Then run:

```sh
npm run check
```

The normal check fails if runtime HTML or JavaScript files contain more than one `?v=` token.
