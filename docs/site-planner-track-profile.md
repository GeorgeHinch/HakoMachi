# Site Planner Track Profile

The Site Planner track tool renders planning track as N-scale flex track on cork
roadbed. The constants live in `TRACK_PROFILE_DEFAULTS` in `js/site-planner.js`
and are copied onto each track record by `normalizeTrack`.

## Default Model Measurements

- Rail gauge: `9 mm`.
- Rail visual width: `0.55 mm`.
- Rail visual height: `0.8 mm`.
- Tie spacing: `4 mm`.
- Tie length: `16 mm`.
- Tie width: `1.3 mm`.
- Cork roadbed width: `19 mm`.
- Cork roadbed height: `2.5 mm`.
- Cork shoulder/bevel allowance: `3.5 mm` on each side.

## Measurement Basis

The rail gauge follows N gauge: `9 mm` between rails.

The roadbed width uses a rounded `3/4 in` N-scale cork roadbed reference:
`0.75 in * 25.4 = 19.05 mm`, stored as `19 mm` for editable model units.

The roadbed height and shoulder values are HakoMachi's default fabrication
baseline rather than a locked manufacturer profile. Different cork strips and
foam roadbeds vary, so each track record stores the dimensions explicitly and
the UI exposes gauge/tie spacing for later adjustment. Future controls can
surface the full roadbed profile without changing the saved schema.

## Rendering Rules

- 2D preview draws the roadbed under twin rails and repeated ties along the
  sampled centerline.
- 3D preview draws the cork roadbed as an opaque solid surface so it writes
  depth correctly.
- Rails, ties, outlines, and selection affordances may remain overlay-style
  lines because they are visual details rather than large solid surfaces.
- Joined/curved tracks save their centerline points, curve handles, endpoint
  connections, and copied profile measurements with the site plan.
