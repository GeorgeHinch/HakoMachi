# 3D Rendering QA

Use this checklist when changing Three.js materials, overlay planes, or camera framing.

## Depth And Transparency

- Site Planner: load a large calibrated layout image, enable the 3D reference image, add benchwork, roads, road markings, and several buildings. Confirm solid benchwork and building faces hide the image and roads behind them.
- Site Planner: toggle the reference image opacity between low and high values. Confirm it remains a ground/reference overlay and does not bleed through opaque building walls.
- Site Planner: orbit close to road edges, sidewalks, tracks, and building bases. Confirm there is no flickering striping from coplanar surfaces.
- Building Generator: preview a multi-floor building with roof equipment, inset floors, glass, and interior/floor guides. Confirm walls, roofs, and solid equipment render opaque while intentional glass/guide transparency still works.
- Utility pages: preview crates, shelves, and railings. Confirm opaque generated parts write depth correctly and intentional ghost/interior previews remain readable.

## Expected Material Rules

- Solid meshes should use `transparent: false`, `opacity: 1`, `depthTest: true`, and `depthWrite: true`.
- Intentional overlays, guides, decals, and reference images may be transparent, but should keep `depthTest: true`, avoid depth writes, and use explicit offsets or render ordering.
- Camera `near` and `far` planes should be set from scene bounds so large scenes do not lose depth precision.
