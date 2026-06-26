# HakoMachi Site Planner CSS split

This utility is still a monolithic HTML file, but the shared CSS split has started.

## Shared files

- `../css/hakomachi-shared.css` — HakoMachi-wide primitives: theme tokens, base typography, buttons, fields, rows, cards/sections, dropdowns, badges, hidden file inputs, and small status text.
- `../css/site-planner.css` — Site Planner-specific adapter: grid shell, top bar, toolbar, canvas, sidebar, bottom status bar, map/card selection states, tool flyouts, empty image overlay, and responsive planner layout.

## Target load order

When `site-planner.html` is split from inline CSS, the static head should load:

```html
<link rel="stylesheet" href="css/hakomachi-shared.css">
<link rel="stylesheet" href="css/site-planner.css">
```

Do not inject these links at runtime. The Site Planner should use static stylesheet links once the monolithic HTML is replaced or safely edited as a full source file.

## Class-sharing rules

Prefer shared classes for generic UI:

- `.field`
- `.row`
- `.row3`
- `.actions`
- `.buttons`
- `.section`
- `.small`
- `.muted`
- `.warning`
- `.okText`
- `.pill`
- `.chip`
- `.statusBadge`
- `.dropdownMenu`
- `.menuItem`
- `.hiddenFile`
- `.app-logo`

Keep planner-only geometry/layout classes in `../css/site-planner.css`:

- `.sitePlannerApp` / planner `.app` grid sizing
- `.top`, `.toolbar`, `.canvasWrap`, `.sidebar`, `.bottom`
- `.toolbtn`, `.toolFlyout`, `.toolVariantTrigger`
- `.buildingItem`, `.padCard`, `.fabricCard`, `.constraintCard`
- `.emptyImageOverlay`, `.emptyImageCard`
- planner map/canvas/context-menu states

## Next refactor step

Create a static split version of the planner HTML that removes the first inline `<style>` block and links the two CSS files above. After that, move the inline JavaScript into `site-planner.js` in small chunks so the Site Planner can share common modules with the main HakoMachi app.
