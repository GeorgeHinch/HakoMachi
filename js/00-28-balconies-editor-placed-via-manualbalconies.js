'use strict';

/* =====================================================================
   BALCONIES  (editor-placed via manualBalconies)
   Internal: recessed into the building — railing face + side divider walls
             that have tongue tabs for floor/ceiling slots.
             If the balcony is flush with a building side wall it wraps
             around to form an L-shape; a corner support beam is added.
   External: projecting floor slab (3-layer card like awnings) + railings.
   ===================================================================== */
function generateBalconyParts(cfg, plan) {
  const matT = cfg.coreThickness || 1.5;
  const parts = [];

  function railingLines(W, H) {
    const ls = [];
    const bal = 3;
    for (let x = bal; x < W; x += bal)
      ls.push({ type: 'etch', x1: x, y1: 0.8, x2: x, y2: H - 0.8 });
    ls.push({ type: 'etch', x1: 0, y1: 0.8,     x2: W, y2: 0.8 });
    ls.push({ type: 'etch', x1: 0, y1: H - 0.8, x2: W, y2: H - 0.8 });
    return ls;
  }

  for (const face of ['front', 'back', 'east', 'west']) {
    const balconies = surfaceWallFeaturesForFace(cfg, face, 'balcony');
    const wallW = (face === 'front' || face === 'back') ? plan.fbWidth : plan.sideLen;

    balconies.forEach((b, i) => {
      const W = Number(b.w) || 0, D = Number(b.d) || 0, H = Number(b.h) || 0;
      if (W <= 0 || D <= 0 || H <= 0) return;
      const x = Number(b.x) || 0;
      const id   = `balcony_${face}_${i}`;
      const grp  = `Balcony ${i + 1} — ${face} wall (${b.balconyType})`;

      const touchL = x <= BALCONY_TOUCH_MARGIN;
      const touchR = (x + W) >= (wallW - BALCONY_TOUCH_MARGIN);
      const isL    = (touchL || touchR) && b.balconyType === 'internal';

      if (b.balconyType === 'internal') {
        // Count parts for sequencing
        const nSides = (touchL ? 0 : 1) + (touchR ? 0 : 1);
        const total  = 1 + nSides + (isL ? 2 : 0);
        let seq = 0;
        const s = () => `[${++seq}/${total}] `;

        // 1 — Front railing
        parts.push({
          id: id + '_rail', name: `${grp} — ${s()}Front railing`,
          assemblyNote: 'Glue flush with wall face opening. Etch lines are baluster detail, face outward.',
          material: 'cladding',
          bboxW: W, bboxH: H, bboxOffsetX: 0, bboxOffsetY: 0,
          paths: [{ type: 'cut', d: rectPath(0, 0, W, H) }],
          rects: [], lines: railingLines(W, H),
        });

        // 2/3 — Side divider walls with tongue tabs
        function sideDivider(side) {
          const tabX = D / 2 - matT / 2;
          const path = [
            `M 0,0`,
            `L ${tabX},0`, `L ${tabX},-${matT}`,
            `L ${tabX + matT},-${matT}`, `L ${tabX + matT},0`,
            `L ${D},0`, `L ${D},${H}`,
            `L ${tabX + matT},${H}`, `L ${tabX + matT},${H + matT}`,
            `L ${tabX},${H + matT}`, `L ${tabX},${H}`,
            `L 0,${H} Z`,
          ].join(' ');
          return {
            id: id + '_' + side, name: `${grp} — ${s()}${side.charAt(0).toUpperCase()+side.slice(1)} side wall`,
            assemblyNote: `Runs perpendicular into the building. Top tab slots into ceiling panel slot, bottom tab into floor panel slot. Cut matching ${matT}×${matT} mm slots in floor/ceiling at this position.`,
            material: 'core',
            bboxW: D, bboxH: H + 2 * matT, bboxOffsetX: 0, bboxOffsetY: matT,
            paths: [{ type: 'cut', d: path }],
            rects: [], lines: [],
          };
        }
        if (!touchL) parts.push(sideDivider('left'));
        if (!touchR) parts.push(sideDivider('right'));

        // L-shape extras
        if (isL) {
          const side = touchL ? 'left' : 'right';
          const beamSz = matT * 2;
          parts.push({
            id: id + '_beam', name: `${grp} — ${s()}Corner support beam`,
            assemblyNote: `Vertical post at the outer corner of the L-shape void (${side} end). Two identical pieces cut — glue face-to-face to form a ${beamSz}×${beamSz} mm square post.`,
            material: 'core',
            bboxW: beamSz, bboxH: H, bboxOffsetX: 0, bboxOffsetY: 0,
            paths: [{ type: 'cut', d: rectPath(0, 0, beamSz, H) }],
            rects: [], lines: [],
          });
          parts.push({
            id: id + '_wrap', name: `${grp} — ${s()}Wrap railing (${side} face)`,
            assemblyNote: `Perpendicular railing on the ${side} side face of the building. Etch lines face outward. Glue inner edge to the corner beam, outer edge flush with the side wall face.`,
            material: 'cladding',
            bboxW: D, bboxH: H, bboxOffsetX: 0, bboxOffsetY: 0,
            paths: [{ type: 'cut', d: rectPath(0, 0, D, H) }],
            rects: [], lines: railingLines(D, H),
          });
        }

      } else {
        // External balcony
        const railH = Math.max(3, H - 1.5);
        const nSides = (touchL ? 0 : 1) + (touchR ? 0 : 1);
        const total  = 3 + 1 + nSides + nSides; // 3 slab layers + front rail + side rails + posts
        let seq = 0;
        const s = () => `[${++seq}/${total}] `;

        // Floor slab — 3 layers
        function slabLines(mirrorX) {
          const ls = [];
          for (let sy = 3; sy < D; sy += 3)
            ls.push({ type: 'etch', x1: mirrorX ? W : 0, y1: sy, x2: mirrorX ? 0 : W, y2: sy });
          return ls;
        }
        function slabSupportMarks() {
          const ls = [];
          const n = Math.max(2, Math.round(W / 12));
          for (let m = 1; m <= n; m++) {
            const mx = W * m / (n + 1);
            ls.push({ type: 'etch', x1: mx - 1.5, y1: D - 0.5, x2: mx + 1.5, y2: D - 0.5 });
            ls.push({ type: 'etch', x1: mx, y1: D - 3, x2: mx, y2: D });
          }
          ls.push({ type: 'etch', x1: 0, y1: 0.8, x2: W, y2: 0.8 });
          return ls;
        }
        for (const [suffix, lnes, lname, note] of [
          ['face', slabLines(false),  'Floor slab — ① top layer',
           'Etch lines face upward (deck surface). Glue onto the core layer.'],
          ['core', [],                'Floor slab — ② middle layer',
           'Plain structural layer. Sandwiched between face and base. Glue tabs at wall edge slot into the building\'s floor panel.'],
          ['base', [...slabLines(true), ...slabSupportMarks()], 'Floor slab — ③ bottom layer',
           'Etch lines and support marks face downward (hidden). Glue support-mark positions to ① and ②. Wall edge tabs slot into building floor panel.'],
        ]) {
          parts.push({
            id: id + '_slab_' + suffix, name: `${grp} — ${s()}${lname}`,
            assemblyNote: note,
            material: 'cladding',
            bboxW: W, bboxH: D, bboxOffsetX: 0, bboxOffsetY: 0,
            paths: [{ type: 'cut', d: rectPath(0, 0, W, D) }],
            rects: [], lines: lnes,
          });
        }

        // Railings
        parts.push({
          id: id + '_rail_front', name: `${grp} — ${s()}Front railing`,
          assemblyNote: 'Outer edge of balcony. Etch (balusters) faces outward. Bottom edge sits on floor slab, corner tabs slot into the corner posts.',
          material: 'cladding',
          bboxW: W, bboxH: railH, bboxOffsetX: 0, bboxOffsetY: 0,
          paths: [{ type: 'cut', d: rectPath(0, 0, W, railH) }],
          rects: [], lines: railingLines(W, railH),
        });
        if (!touchL) parts.push({
          id: id + '_rail_left', name: `${grp} — ${s()}Left side railing`,
          assemblyNote: 'Left side edge. Etch faces left. Slots between left corner post and wall face.',
          material: 'cladding',
          bboxW: D, bboxH: railH, bboxOffsetX: 0, bboxOffsetY: 0,
          paths: [{ type: 'cut', d: rectPath(0, 0, D, railH) }],
          rects: [], lines: railingLines(D, railH),
        });
        if (!touchR) parts.push({
          id: id + '_rail_right', name: `${grp} — ${s()}Right side railing`,
          assemblyNote: 'Right side edge. Etch faces right. Slots between right corner post and wall face.',
          material: 'cladding',
          bboxW: D, bboxH: railH, bboxOffsetX: 0, bboxOffsetY: 0,
          paths: [{ type: 'cut', d: rectPath(0, 0, D, railH) }],
          rects: [], lines: railingLines(D, railH),
        });
        const postW = matT * 2;
        if (!touchL) parts.push({
          id: id + '_post_l', name: `${grp} — ${s()}Left corner post`,
          assemblyNote: `Outer-left vertical post. Two identical pieces — glue face-to-face into a ${postW}×${postW} mm square column. Front and side railings butt against it.`,
          material: 'core', bboxW: postW, bboxH: H, bboxOffsetX: 0, bboxOffsetY: 0,
          paths: [{ type: 'cut', d: rectPath(0, 0, postW, H) }], rects: [], lines: [],
        });
        if (!touchR) parts.push({
          id: id + '_post_r', name: `${grp} — ${s()}Right corner post`,
          assemblyNote: `Outer-right vertical post. Two identical pieces — glue face-to-face into a ${postW}×${postW} mm square column. Front and side railings butt against it.`,
          material: 'core', bboxW: postW, bboxH: H, bboxOffsetX: 0, bboxOffsetY: 0,
          paths: [{ type: 'cut', d: rectPath(0, 0, postW, H) }], rects: [], lines: [],
        });
      }
    });
  }
  return parts;
}
