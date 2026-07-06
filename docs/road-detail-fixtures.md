# Road Detail Fixture Library

This document describes:

- `fixtures/road-detail-fixtures.json`

The fixture file contains small road layouts for testing generated road intersections, road markings, physical grate inserts, preview rendering, and SVG export wiring.

## Fixtures

- `t_junction_sidewalks`
- `cross_junction_no_sidewalks`
- `corner_with_drain`
- `curb_trench_grate`
- `marking_presets`

## Codex wiring recommendation

Use these fixtures as smoke-test layouts when wiring the road modules into `site-planner.js`:

1. Load fixture roads into a temporary state object.
2. Run `buildRoadIntersections()`.
3. Apply overrides if present.
4. Render preview overlays.
5. Serialize intersection markings.
6. Serialize physical grate inserts.
7. Compare generated counts with each fixture's `expected` object.

## Existing code to remove after integration

No existing runtime code needs to be removed for these fixtures. If Codex creates ad-hoc inline fixtures during implementation, replace them with this shared fixture file before finalizing.

## Verification checklist

- T-junction detects a T-junction and tactile paving.
- Cross-junction detects a cross-junction and no tactile paving without sidewalks.
- Corner fixture detects a corner and one physical drain.
- Trench fixture generates one long curb trench insert.
- Marking sampler generates four marking shapes.
