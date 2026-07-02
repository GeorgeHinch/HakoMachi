# 3D Rendering QA

Use this note when checking depth, opacity, and z-fighting regressions across HakoMachi 3D views.

## Automated Coverage

- `tests/3d-material-regression.spec.js` checks source-level material contracts for opaque solid surfaces, overlay/depth handling, and near/far camera bounds.
- `tests/3d-visual-smoke.spec.js` opens live pages and samples rendered WebGL pixels to catch blank, fully transparent, or single-color 3D canvas failures.
- The Site Planner smoke fixture includes benchwork, multiple solid buildings, a road, and curved track roadbed.
- The Building Generator smoke fixture checks that the default solid building preview renders with multiple visible colors.
- Utility smoke fixtures check the safety railing, industrial shelf, and wooden crate 3D previews.

## Manual Visual Checklist

1. Site Planner: load a large reference image, enable 3D, and confirm solid benchwork and buildings hide the image where they overlap.
2. Site Planner: include roads, road markings, and track/cork roadbed; confirm overlays sit on top without flickering or bleeding through buildings.
3. Site Planner: toggle the 3D image overlay off/on and move opacity through low, medium, and high values.
4. Building Generator: check simple rectangular, multi-story, winged, and gabled-roof buildings in the 3D preview.
5. Utility pages: for deeper visual QA beyond the automated nonblank checks, rotate safety railing, industrial shelf, and wooden crate previews and confirm their solids remain opaque without flicker.

## Expected Result

Solid model geometry should use opaque depth-writing materials. Intentional overlays can be transparent, but they should not make unrelated solid objects appear see-through.
