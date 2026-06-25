'use strict';

/* =====================================================================
   AWNINGS
   Each awning is a rectangular sloped canopy above a door or window.
   Parts: 1 rectangular top panel + 2 triangular side brackets.
   face: which wall face; x/w: position along that wall in wall-local mm;
   depth: how far the awning projects outward; angle: slope (degrees, default 20).
   ===================================================================== */
function generateAwningParts(cfg, plan) {
  const matT = cfg.coreThickness || 1.5;
  const parts = [];

  // ── Legacy cfg.awnings (sloped top panel + triangular side brackets) ──
  (cfg.awnings || []).forEach((aw, i) => {
    const depth = aw.depth || 15;
    const angle = aw.angle || 20;
    const slopeLen = depth / Math.cos(angle * Math.PI / 180);
    const sideH = depth * Math.tan(angle * Math.PI / 180);
    const id = `awning_${i}`;
    parts.push({
      id: id + '_top', name: `Awning ${i+1} — top panel`,
      material: 'cladding',
      bboxW: aw.w, bboxH: slopeLen, bboxOffsetX: 0, bboxOffsetY: 0,
      paths: [{ type: 'cut', d: rectPath(0, 0, aw.w, slopeLen) }],
      rects: [], lines: [],
    });
    const triPath = `M 0,0 L ${slopeLen},0 L ${slopeLen},${sideH} Z`;
    for (const side of ['left', 'right']) {
      parts.push({
        id: id + '_' + side, name: `Awning ${i+1} — ${side} bracket`,
        material: 'core',
        bboxW: slopeLen, bboxH: sideH + matT, bboxOffsetX: 0, bboxOffsetY: 0,
        paths: [{ type: 'cut', d: triPath }],
        rects: [], lines: [],
      });
    }
  });

  // ── Editor-placed awnings: three layers of 0.28 mm card stock ──
  //   Layer 1 – Face  (top, stripe etch visible from outside)
  //   Layer 2 – Core  (middle, structural)
  //   Layer 3 – Base  (bottom, mirrored stripe etch + support-glue guides)
  for (const face of ['front', 'back', 'east', 'west']) {
    const awnings = surfaceWallFeaturesForFace(cfg, face, 'awning');
    awnings.forEach((aw, i) => {
      const W = aw.w, D = aw.d;   // width (along wall), depth (projection outward)
      const id = `awning_${face}_${i}`;
      const lbl = `Awning — ${face} wall #${i + 1}`;
      const stripePitch = 3; // mm between vertical etch stripes

      // Vertical etch stripes running along D, spaced every stripePitch across W
      function stripes(mirrorX = false) {
        const ls = [];
        for (let x = stripePitch; x < W; x += stripePitch) {
          const ex = mirrorX ? W - x : x;
          ls.push({ type: 'etch', x1: ex, y1: 0, x2: ex, y2: D });
        }
        return ls;
      }

      // Support-glue guide marks for the base layer (outer edge = y=D)
      function supportMarks() {
        const ls = [];
        const n = Math.max(2, Math.round(W / 12)); // one mark per ~12mm
        for (let m = 1; m <= n; m++) {
          const mx = W * m / (n + 1);
          ls.push({ type: 'etch', x1: mx - 1.5, y1: D - 0.5, x2: mx + 1.5, y2: D - 0.5 }); // horiz tick
          ls.push({ type: 'etch', x1: mx, y1: D - 3,   x2: mx, y2: D });                      // vert tick
        }
        // Fold / attachment score line along the wall-attach edge (y ≈ 0.5)
        ls.push({ type: 'etch', x1: 0, y1: 0.8, x2: W, y2: 0.8 });
        return ls;
      }

      // Layer 1: Face — stripe etch on top face, cut border
      parts.push({
        id: id + '_face', name: `${lbl} — Face (top layer, stripe side out)`,
        material: 'cladding',
        bboxW: W, bboxH: D, bboxOffsetX: 0, bboxOffsetY: 0,
        paths: [{ type: 'cut', d: rectPath(0, 0, W, D) }],
        rects: [], lines: stripes(false),
      });

      // Layer 2: Core — plain structural layer
      parts.push({
        id: id + '_core', name: `${lbl} — Core (middle layer)`,
        material: 'cladding',
        bboxW: W, bboxH: D, bboxOffsetX: 0, bboxOffsetY: 0,
        paths: [{ type: 'cut', d: rectPath(0, 0, W, D) }],
        rects: [], lines: [],
      });

      // Layer 3: Base — mirrored stripes + support-glue marks (etch side faces inward when assembled)
      parts.push({
        id: id + '_base', name: `${lbl} — Base (bottom layer, glue-guide side down)`,
        material: 'cladding',
        bboxW: W, bboxH: D, bboxOffsetX: 0, bboxOffsetY: 0,
        paths: [{ type: 'cut', d: rectPath(0, 0, W, D) }],
        rects: [], lines: [...stripes(true), ...supportMarks()],
      });
    });
  }

  return parts;
}
