# Page And Tool Registry

HakoMachi page metadata lives in `js/shared/hakomachi-tool-registry.js`.

The registry is the source of truth for:

- page path
- analytics app key
- display label
- page group (`core`, `primary`, or `utility`)
- landing-page short description
- SEO title
- SEO description
- canonical URL path

The landing page renders its tool cards from the registry. Analytics also uses the registry for app detection and navigation targets, so adding a tool should not require separate analytics mappings.

## Static SEO Duplication

HTML `<head>` metadata still has to exist in each page because crawlers and social preview bots may not execute client-side JavaScript. That means `<title>`, description, canonical, Open Graph, Twitter, and JSON-LD metadata remain duplicated in HTML.

When metadata changes, update the registry first, then update the matching static HTML head tags. `npm run check` includes a regression test that compares the static tags against the registry.
