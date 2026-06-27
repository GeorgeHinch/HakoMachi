/* ===========================================================================
 * TRUSS BEARING TABS
 *
 * When column supports are enabled, the bottom chord at each bearing gets
 * two downward tabs that drop into matching notches in the column's back
 * flange and end cap. Both tabs are matT-thick (truss material thickness),
 * tabDepth deep, with a gap between them at the column web's x range —
 * the web is co-planar with the truss, so the gap lets the truss and the
 * web coexist without overlapping in 3D space.
 *
 * Tab geometry at the left bearing (x increases away from the bearing
 * wall):
 *     ─────────  ← bottom chord (truss outline edge at y=h)
 *    │A│ ░░░ │B│
 *    │A│      │B│ ← tab A passes through back flange notch;
 *    │A│      │B│   tab B passes through end cap notch;
 *    └─┘      └─┘   ░░░ = gap above the web (web is co-planar)
 *
 *    0 ┼ matT     matT+webDepth ┼ matT*2+webDepth
 *
 * The right bearing is the mirror.
 *
 * The injection is a post-processing pass on the truss geometry's
 * outline polygon. All three truss generators (Fink, MonoPitch,
 * ParallelChord) start their outline with a `(0, h) → (L, h)` bottom
 * chord edge, so this helper assumes that pattern and modifies the
 * first two vertices' span to weave the tabs into the outline. CCW
 * winding (y-down) is preserved.
 * =========================================================================== */
export function injectTrussBearingTabs(geom, matT, webDepth, tabDepth, columnType) {
  const outline = geom.outline;
  if (!outline || outline.length < 3) return null;
  const v0 = outline[0];
  const v1 = outline[1];
  // Required pattern: outline starts with horizontal bottom-chord edge
  // from (0, h) to (L, h). Bail out (return original geom unchanged)
  // if the truss generator's output doesn't match — better than emitting
  // a malformed polygon.
  if (Math.abs(v0.x) > 1e-6 || Math.abs(v1.y - v0.y) > 1e-6 || v1.x <= v0.x) return geom;
  const h = v0.y;
  const L = v1.x;
  const type = columnType === 't' ? 't' : 'i';
  const footprintDepth = (type === 't') ? (matT + webDepth) : (matT * 2 + webDepth);
  // Sanity: the chord must be wide enough that the two end tab clusters
  // don't overlap in the middle. Need 2 × footprintDepth < L with a
  // small clearance for the central chord run. Falls back gracefully —
  // tabs aren't injected on impossibly small trusses; user gets a plain
  // truss + a column that has notches but nothing to fit into them, which
  // is at least obvious during dry-fit assembly.
  if (footprintDepth * 2 + 2 > L) return geom;

  // Tab boundaries (CCW winding, y-down: walking rightward along the
  // bottom edge of the truss, +y is "outward" away from the polygon
  // interior — the tabs jut downward).
  if (type === 't') {
    // T-beam: one wall-side flange plus one perpendicular web. The truss
    // gets a single tab at each bearing for the back flange, then a clear
    // chord run over the web area. No room-side/end-cap tab is emitted.
    const lb0 = 0;
    const lb1 = matT;
    const lc0 = matT + webDepth;
    const rc0 = L - matT - webDepth;
    const rb0 = L - matT;
    const rb1 = L;
    const newOutline = [
      v0,
      { x: lb0, y: h + tabDepth },
      { x: lb1, y: h + tabDepth },
      { x: lb1, y: h },
      // Chord run over the left web, long centre span, then right web.
      { x: lc0, y: h },
      { x: rc0, y: h },
      { x: rb0, y: h },
      { x: rb0, y: h + tabDepth },
      { x: rb1, y: h + tabDepth },
      v1,
      ...outline.slice(2),
    ];
    return { ...geom, outline: newOutline };
  }

  // I-beam: two tabs at each bearing, one for the back flange and one
  // for the outer end cap, separated by a gap over the perpendicular web.
  const lb0 = 0;
  const lb1 = matT;
  const lc0 = matT + webDepth;
  const lc1 = matT * 2 + webDepth;
  const rc0 = L - matT * 2 - webDepth;
  const rc1 = L - matT - webDepth;
  const rb0 = L - matT;
  const rb1 = L;

  const newOutline = [
    v0,  // (0, h)  — left bearing corner
    // Left tab A — drops into the back-flange notch on the wall side.
    { x: lb0, y: h + tabDepth },
    { x: lb1, y: h + tabDepth },
    { x: lb1, y: h },
    // Chord run over the column web (web is co-planar; nothing in this gap).
    { x: lc0, y: h },
    // Left tab B — drops into the end-cap notch on the room side.
    { x: lc0, y: h + tabDepth },
    { x: lc1, y: h + tabDepth },
    { x: lc1, y: h },
    // Long central chord run from the left column to the right column.
    { x: rc0, y: h },
    // Right tab B — mirror of left tab B.
    { x: rc0, y: h + tabDepth },
    { x: rc1, y: h + tabDepth },
    { x: rc1, y: h },
    // Chord run over the right column's web.
    { x: rb0, y: h },
    // Right tab A — mirror of left tab A.
    { x: rb0, y: h + tabDepth },
    { x: rb1, y: h + tabDepth },
    v1,  // (L, h) — right bearing corner
    ...outline.slice(2),
  ];
  return { ...geom, outline: newOutline };
}
