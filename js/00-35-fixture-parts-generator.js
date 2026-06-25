'use strict';

/* =====================================================================
   FIXTURE PARTS GENERATOR
   ===================================================================== */
/* Produce laser-cut sheets for fixtures placed on the building, using a
 * HYBRID grouping strategy:
 *   • Default-sized instances of a style share ONE sheet per material
 *     (the common case — most users keep style defaults).
 *   • Any instance the user has resized splits off into its OWN sheet
 *     matching that exact size. Three custom-sized instances of the same
 *     style at the same size still share a sheet; they only split when
 *     their dimensions differ.
 *
 * The grouping happens in `tallyFixtures`, which produces an array of
 * { style, w, h, count, isDefault } groups. This generator iterates that
 * list, scales each piece's natural-coordinate dimensions to the group's
 * w/h, and emits one part per (group × material) combination.
 *
 * No spares — exact count only. Re-cutting later is easy if needed.
 *
 * Piece dimensions scale proportionally: the meter dial, the AC vent
 * strip, the chochin cap all grow with the parent fixture. Etched
 * features are produced at the SCALED piece size, so featureGenerators
 * see the right dimensions and adapt density correctly.
 */

function downspoutHasScupperBox(cfg, face, styleKey) {
  if (styleKey !== 'downspout') return false;
  if (!cfg) return false;
  if (cfg.roofStyle === 'parapet') return true;
  if (cfg.roofStyle === 'parapet_gable') {
    return face ? wallHasParapet(cfg, face) : true;
  }
  return false;
}

function downspoutScupperLocalSpec(totalW, totalH) {
  const spW = Math.max(0.4, Number(totalW) || 0.8);
  const spH = Math.max(4, Number(totalH) || 16);

  // Physical model dimensions for the roof-line rainwater collector box.
  // Keep these in actual mm and mark the generated pieces absoluteSize so
  // a full-height downspout (for example 0.8×46mm) does not stretch the box
  // parts vertically into meaningless strips.
  const boxW  = Math.max(3.8, Math.min(7.0, spW * 4.8 + 1.6));
  const boxH  = Math.max(3.6, Math.min(5.2, spH * 0.085 + 1.0));
  const sideW = Math.max(0.55, Math.min(0.9, boxW * 0.14));
  const floorH = Math.max(0.65, Math.min(1.0, boxH * 0.20));
  const lipH = Math.max(0.55, Math.min(0.9, boxH * 0.18));
  const throatW = Math.max(0.9, Math.min(boxW - 1.5, spW * 1.6));
  const throatH = Math.max(0.65, Math.min(boxH - 1.8, 1.1));
  const boxX  = (spW - boxW) / 2;
  const boxY  = 0;
  const throatX = boxX + (boxW - throatW) / 2;
  const throatY = boxY + boxH - floorH - throatH - 0.25;
  return { spW, spH, boxW, boxH, sideW, floorH, lipH, throatW, throatH, boxX, boxY, throatX, throatY };
}

function downspoutScupperRoofLineY(cfg, face) {
  if (!downspoutHasScupperBox(cfg, face, 'downspout')) return null;
  const p = Math.max(0, Number(cfg && cfg.parapetHeight) || 0);
  // In wall/card coordinates y=0 is the top of the wall/parapet. The roof deck
  // / gutter line sits at the bottom of the parapet band. For the current wall
  // model that is exactly parapetHeight from the top.
  return p;
}

function downspoutScupperWallHoleY(cfg, face, fixtureY, sc) {
  const fallback = (Number(fixtureY) || 0) + (sc ? Number(sc.throatY) || 0 : 0);
  if (!sc) return fallback;

  const roofLineY = downspoutScupperRoofLineY(cfg, face);
  if (roofLineY == null || !Number.isFinite(roofLineY)) return fallback;

  // Put the scupper opening through the parapet at the roof line: the bottom
  // of the opening aligns to the roof deck/gutter line instead of hanging below
  // it with the downspout's decorative collector-box geometry.
  const H = Math.max(0, wallBodyHeightFromConfig(cfg));
  const y = roofLineY - Number(sc.throatH || 0);
  return Math.max(0, Math.min(Math.max(0, H - Number(sc.throatH || 0)), y));
}

function downspoutScupperWallBoxY(cfg, face, fixtureY, sc) {
  if (!sc) return Number(fixtureY) || 0;
  const fallback = (Number(fixtureY) || 0) + (Number(sc.boxY) || 0);
  const holeY = downspoutScupperWallHoleY(cfg, face, fixtureY, sc);
  if (!Number.isFinite(holeY)) return fallback;
  // Preserve the scupper piece's internal hole-to-box relationship by moving
  // the box marker together with the roof-line throat.
  const boxY = holeY - Number(sc.throatY || 0);
  return Math.max(0, boxY);
}


function effectiveFixturePieces(cfg, face, styleKey, instW, instH, forceScupper = null) {
  const style = FIXTURE_STYLES[styleKey];
  if (!style) return [];
  const base = (style.pieces || []).map(p => ({ ...p }));
  const useScupper = (forceScupper == null)
    ? downspoutHasScupperBox(cfg, face, styleKey)
    : !!forceScupper;
  if (!useScupper) return base;

  const s = downspoutScupperLocalSpec(instW != null ? instW : style.width,
                                      instH != null ? instH : style.height);
  const label = 'scupper collector box';
  const extras = [
    // Back/face plate. The central throat is the wall/core opening into the
    // downspout. Cut this first; stack the other strips over it to build depth.
    {
      material: 'cladding', panelFill: '#9b9b92', frameColor: '#4a4a44',
      width: s.boxW, height: s.boxH, offsetX: s.boxX, offsetY: s.boxY,
      absoluteSize: true, partLabel: label + ' back plate',
      innerCut: { x: s.boxW / 2 - s.throatW / 2, y: s.throatY - s.boxY, w: s.throatW, h: s.throatH },
      features: [
        { type: 'rail', x1: 0.25, y1: 0.25, x2: s.boxW - 0.25, y2: 0.25 },
        { type: 'rail', x1: 0.25, y1: s.boxH - 0.25, x2: s.boxW - 0.25, y2: s.boxH - 0.25 },
      ],
    },
    // Front rim frame: same outside, larger open center so it reads as a box
    // mouth rather than a solid plaque.
    {
      material: 'cladding', panelFill: '#8f8f86', frameColor: '#4a4a44',
      width: s.boxW, height: s.boxH, offsetX: s.boxX, offsetY: s.boxY,
      absoluteSize: true, partLabel: label + ' front rim',
      innerCut: { x: s.sideW, y: 0.55, w: s.boxW - 2 * s.sideW, h: s.boxH - s.floorH - 0.95 },
    },
    // Side cheeks and bottom floor, stacked as strips to create real depth.
    { material: 'cladding', panelFill: '#7b7b73', frameColor: '#4a4a44',
      width: s.sideW, height: s.boxH, absoluteSize: true, partLabel: label + ' left cheek' },
    { material: 'cladding', panelFill: '#7b7b73', frameColor: '#4a4a44',
      width: s.sideW, height: s.boxH, absoluteSize: true, partLabel: label + ' right cheek' },
    { material: 'cladding', panelFill: '#7b7b73', frameColor: '#4a4a44',
      width: s.boxW, height: s.floorH, absoluteSize: true, partLabel: label + ' bottom floor' },
    { material: 'cladding', panelFill: '#6f6f68', frameColor: '#4a4a44',
      width: Math.max(s.throatW + 0.8, s.boxW * 0.55), height: s.lipH, absoluteSize: true, partLabel: label + ' lower lip' },
  ];
  return extras.concat(base);
}

function downspoutRooflineTopY(cfg, plan, face, styleKey) {
  if (!cfg || !plan || styleKey !== 'downspout') return 0;
  if (cfg.roofStyle === 'parapet') return Number(plan.parapetH) || 0;
  if (cfg.roofStyle === 'parapet_gable' && wallHasParapet(cfg, face)) {
    return Number(plan.parapetH) || 0;
  }
  return 0;
}

function generateFixtureParts(cfg, fixtureGroups) {

  const parts = [];

  for (const group of (fixtureGroups || [])) {
    if (!group || group.count <= 0) continue;
    const style = FIXTURE_STYLES[group.style];
    if (!style) continue;
    const fixturePieces = effectiveFixturePieces(cfg, null, group.style, group.w, group.h, group.scupper);
    // Etched and cutout placements don't produce separate cut pieces:
    //   • etched  → features land on the cladding panel
    //   • cutout  → hole cut through both cladding and core, no insert
    if (style.placement === 'etched' || style.placement === 'cutout') continue;

    const totalInstances = group.count;  // no spares
    const scaleX = group.w / style.width;
    const scaleY = group.h / style.height;

    // Group this style's pieces by material so we emit one sheet per material.
    // Use `fixturePieces`, not `style.pieces`: fixturePieces may include
    // generated add-on layers such as parapet scupper/gutter boxes.
    const piecesByMaterial = {};
    for (const piece of fixturePieces) {
      const mat = piece.material || 'cladding';
      if (!piecesByMaterial[mat]) piecesByMaterial[mat] = [];
      piecesByMaterial[mat].push(piece);
    }

    for (const [material, pieceList] of Object.entries(piecesByMaterial)) {
      // Replicate this material's pieces × instance count for layout
      const all = [];
      for (let n = 0; n < totalInstances; n++) {
        for (const piece of pieceList) all.push(piece);
      }

      // Each piece's cut dimensions = its natural width/height × scale.
      // Pieces without explicit dimensions take the full fixture footprint.
      const allDims = all.map(piece => ({
        w: ((piece.width  != null) ? piece.width  : style.width)  * (piece.absoluteSize ? 1 : scaleX),
        h: ((piece.height != null) ? piece.height : style.height) * (piece.absoluteSize ? 1 : scaleY),
      }));
      const cellW = Math.max(...allDims.map(d => d.w));
      const cellH = Math.max(...allDims.map(d => d.h));
      const gutter = 3;
      const cols   = Math.max(2, Math.floor((250 - gutter) / (cellW + gutter)));
      const rows   = Math.ceil(all.length / cols);
      const sheetW = cols * (cellW + gutter) + gutter;
      const sheetH = rows * (cellH + gutter) + gutter;

      const rects = [];
      const lines = [];
      const paths = [];
      // Tile geometry — ONE instance's pieces laid out in a single row at
      // (0,0). The parts panel uses this as a thumbnail so the user sees
      // a single fixture instead of the whole tiled cut sheet.
      const tileRects = [];
      const tileLines = [];
      const tilePaths = [];
      let tileCursor = 0;
      let tileMaxH = 0;

      // Helper: render piece outline + etched features into the given
      // arrays at the given (ox, oy). Used by both the sheet layout below
      // and the single-instance tile geometry.
      function emitPiece(piece, pw, ph, ox, oy, outRects, outLines, outPaths) {
        if (piece.shape === 'circle') {
          const cx  = ox + pw / 2;
          const cy  = oy + ph / 2;
          const rad = pw / 2;
          const d   = `M ${(cx - rad).toFixed(3)},${cy.toFixed(3)}`
                    + ` A ${rad.toFixed(3)},${rad.toFixed(3)} 0 1,1 ${(cx + rad).toFixed(3)},${cy.toFixed(3)}`
                    + ` A ${rad.toFixed(3)},${rad.toFixed(3)} 0 1,1 ${(cx - rad).toFixed(3)},${cy.toFixed(3)} Z`;
          outPaths.push({ type: 'cut', d, compensateKerf: false });
        } else {
          outRects.push({ type: 'cut', x: ox, y: oy, w: pw, h: ph, compensateKerf: false });
        }
        if (piece.innerCut) {
          const ic = piece.innerCut;
          const ix = ox + ((ic.x != null) ? ic.x : ((ic.xRatio || 0) * pw));
          const iy = oy + ((ic.y != null) ? ic.y : ((ic.yRatio || 0) * ph));
          const iw = (ic.w != null) ? ic.w : ((ic.wRatio || 0.5) * pw);
          const ih = (ic.h != null) ? ic.h : ((ic.hRatio || 0.5) * ph);
          if (ic.shape === 'circle') {
            const cx = ix + iw / 2, cy = iy + ih / 2;
            const rx = iw / 2, ry = ih / 2;
            const d = `M ${(cx - rx).toFixed(3)},${cy.toFixed(3)}`
                    + ` A ${rx.toFixed(3)},${ry.toFixed(3)} 0 1,1 ${(cx + rx).toFixed(3)},${cy.toFixed(3)}`
                    + ` A ${rx.toFixed(3)},${ry.toFixed(3)} 0 1,1 ${(cx - rx).toFixed(3)},${cy.toFixed(3)} Z`;
            outPaths.push({ type: 'cut', d, compensateKerf: false });
          } else {
            outRects.push({ type: 'cut', x: ix, y: iy, w: iw, h: ih, compensateKerf: false });
          }
        }
        const pieceFeatures = piece.featureGenerator
          ? piece.featureGenerator(pw, ph)
          : (piece.features || []);
        if (pieceFeatures.length) {
          const shapes = doorFeatureShapes({ width: pw, height: ph, features: pieceFeatures });
          for (const sh of shapes) {
            if (sh.type === 'rect') {
              const x1 = ox + sh.x, y1 = oy + sh.y;
              const x2 = ox + sh.x + sh.w, y2 = oy + sh.y + sh.h;
              outLines.push({ type: 'etch', x1, y1, x2, y2: y1 });
              outLines.push({ type: 'etch', x1: x2, y1, x2, y2 });
              outLines.push({ type: 'etch', x1: x2, y1: y2, x2: x1, y2 });
              outLines.push({ type: 'etch', x1, y1: y2, x2: x1, y2: y1 });
            } else if (sh.type === 'line') {
              outLines.push({ type: 'etch',
                x1: ox + sh.x1, y1: oy + sh.y1,
                x2: ox + sh.x2, y2: oy + sh.y2 });
            } else if (sh.type === 'circle') {
              const cx = ox + sh.cx, cy = oy + sh.cy, rad = sh.r;
              const N = 12;
              let px = cx + rad, py = cy;
              for (let j = 1; j <= N; j++) {
                const a = (j / N) * 2 * Math.PI;
                const nx = cx + Math.cos(a) * rad;
                const ny = cy + Math.sin(a) * rad;
                outLines.push({ type: 'etch', x1: px, y1: py, x2: nx, y2: ny });
                px = nx; py = ny;
              }
            }
          }
        }
      }

      for (let i = 0; i < all.length; i++) {
        const piece = all[i];
        const pw = allDims[i].w, ph = allDims[i].h;
        const c = i % cols;
        const r = Math.floor(i / cols);
        const ox = gutter + c * (cellW + gutter);
        const oy = gutter + r * (cellH + gutter);
        emitPiece(piece, pw, ph, ox, oy, rects, lines, paths);

        // Capture the first instance's pieces for the tile geometry, laid
        // out in a single horizontal strip at y=0 (gutter between pieces).
        if (i < pieceList.length) {
          emitPiece(piece, pw, ph, tileCursor, 0, tileRects, tileLines, tilePaths);
          tileCursor += pw + gutter;
          tileMaxH = Math.max(tileMaxH, ph);
        }
      }

      const pcCount = pieceList.length;
      const scupperLabel = group.scupper ? ' · scupper box' : '';
      const matLabel = material === 'cladding' ? '' : ` · ${material}`;
      let breakdown;
      if (group.isDefault) {
        breakdown = (pcCount > 1)
          ? `${pcCount} pieces × ${group.count}`
          : `${group.count}`;
      } else {
        // Custom-sized — make this clear in the sheet header so the laser
        // operator knows it isn't the same size as the default-sized sheet
        // of the same style.
        const dimsStr = `${group.w.toFixed(1)}×${group.h.toFixed(1)}`;
        breakdown = (pcCount > 1)
          ? `${pcCount} pieces × ${group.count} · custom ${dimsStr}mm`
          : `${group.count} · custom ${dimsStr}mm`;
      }
      // Sanitize dims into the id so part records stay unique-keyable
      const dimSuffix = group.isDefault ? '' : `_${group.w.toFixed(1)}x${group.h.toFixed(1)}`.replace(/\./g, '_');
      const scupperIdSuffix = group.scupper ? '_scupper_box' : '';
      const idSuffix = scupperIdSuffix + dimSuffix;
      const tileW = Math.max(0, tileCursor - gutter); // remove trailing gutter
      const tileH = tileMaxH;
      parts.push({
        id: 'fixture_' + group.style + '_' + material + idSuffix,
        name: `Fixture — ${style.label}${scupperLabel} (${breakdown}${matLabel})`,
        material: material,
        bboxW: sheetW, bboxH: sheetH,
        bboxOffsetX: 0, bboxOffsetY: 0,
        paths: paths, rects: rects, lines: lines,
        tileCount: totalInstances,
        tileGeom: {
          bboxW: tileW, bboxH: tileH,
          bboxOffsetX: 0, bboxOffsetY: 0,
          paths: tilePaths, rects: tileRects, lines: tileLines,
        },
      });
    }
  }
  return parts;
}

/* Cut pass-through holes through the core panel for any cutout-placement
 * fixtures on the given face. Square pass-throughs add rect cuts; round
 * ones add SVG arc paths. The hole is cut at the EXACT fixture size — no
 * +1mm tolerance like a window, because pass-throughs don't have a frame
 * insert to slide through; wires go through the bare opening.
 *
 * @param rects     core panel rect array (mutated)
 * @param paths     core panel path array (mutated — for circular cuts)
 * @param cfg       full config
 * @param face      'front' | 'back' | 'east' | 'west'
 * @param xMirror   optional fn(x, w) → mirroredX for the east-side wall
 */

function fixtureThroughHoleSpec(style, fW, fH) {
  const th = style && style.throughHole;
  if (!th) return null;
  const x = (th.x != null) ? Number(th.x) : ((Number(th.xRatio) || 0) * fW);
  const y = (th.y != null) ? Number(th.y) : ((Number(th.yRatio) || 0) * fH);
  const w = (th.w != null) ? Number(th.w) : ((Number(th.wRatio) || 0.5) * fW);
  const h = (th.h != null) ? Number(th.h) : ((Number(th.hRatio) || 0.5) * fH);
  return { shape: th.shape || 'rect', x, y, w, h };
}

function addFixtureThroughHoleGeometry(rects, paths, x, y, w, h, spec) {
  if (!spec) return;
  const hx = x + spec.x, hy = y + spec.y;
  if (spec.shape === 'circle') {
    const cx = hx + spec.w / 2, cy = hy + spec.h / 2;
    const rx = spec.w / 2, ry = spec.h / 2;
    const d = `M ${(cx - rx).toFixed(3)},${cy.toFixed(3)}`
            + ` A ${rx.toFixed(3)},${ry.toFixed(3)} 0 1,1 ${(cx + rx).toFixed(3)},${cy.toFixed(3)}`
            + ` A ${rx.toFixed(3)},${ry.toFixed(3)} 0 1,1 ${(cx - rx).toFixed(3)},${cy.toFixed(3)} Z`;
    paths.push({ type: 'cut', d, compensateKerf: false });
  } else {
    rects.push({ type: 'cut', x: hx, y: hy, w: spec.w, h: spec.h, compensateKerf: false });
  }
}

function cutFixtureHolesInCore(rects, paths, cfg, face, xMirror) {
  const fxs = surfaceWallFeaturesForFace(cfg, face, 'fixture');
  for (const fx of fxs) {
    const style = FIXTURE_STYLES[fx.style];
    if (!style) continue;
    const w = Number(fx.w) || style.width;
    const h = Number(fx.h) || style.height;
    const xRaw = Number(fx.x) || 0;
    const yRaw = Number(fx.y) || 0;
    const x = xMirror ? xMirror(xRaw, w) : xRaw;

    if (downspoutHasScupperBox(cfg, face, fx.style)) {
      const sc = downspoutScupperLocalSpec(w, h);
      rects.push({
        type: 'cut',
        x: x + sc.throatX,
        y: downspoutScupperWallHoleY(cfg, face, yRaw, sc),
        w: sc.throatW,
        h: sc.throatH,
        compensateKerf: false,
      });
      continue;
    }

    if (style.throughCore) {
      const th = fixtureThroughHoleSpec(style, w, h);
      addFixtureThroughHoleGeometry(rects, paths, x, yRaw, w, h, th);
      continue;
    }

    if (style.placement !== 'cutout') continue;
    const piece0 = style.pieces && style.pieces[0];
    if (piece0 && piece0.shape === 'circle') {
      const cx = x + w / 2, cy = yRaw + h / 2;
      const rx = w / 2,     ry = h / 2;
      // Use one-radius arc when w≈h, ellipse arc otherwise.
      const sameR = Math.abs(rx - ry) < 0.05;
      const d = sameR
        ? (`M ${(cx - rx).toFixed(3)},${cy.toFixed(3)}`
          + ` A ${rx.toFixed(3)},${rx.toFixed(3)} 0 1,1 ${(cx + rx).toFixed(3)},${cy.toFixed(3)}`
          + ` A ${rx.toFixed(3)},${rx.toFixed(3)} 0 1,1 ${(cx - rx).toFixed(3)},${cy.toFixed(3)} Z`)
        : (`M ${(cx - rx).toFixed(3)},${cy.toFixed(3)}`
          + ` A ${rx.toFixed(3)},${ry.toFixed(3)} 0 1,1 ${(cx + rx).toFixed(3)},${cy.toFixed(3)}`
          + ` A ${rx.toFixed(3)},${ry.toFixed(3)} 0 1,1 ${(cx - rx).toFixed(3)},${cy.toFixed(3)} Z`);
      paths.push({ type: 'cut', d, compensateKerf: false });
    } else {
      rects.push({ type: 'cut', x: x, y: yRaw, w: w, h: h, compensateKerf: false });
    }
  }
}

function tallyFixtures(cfg) {
  const groups = new Map();
  for (const face of ['front', 'back', 'east', 'west']) {
    for (const f of surfaceWallFeaturesForFace(cfg, face, 'fixture')) {
      if (!f.style) continue;
      const style = FIXTURE_STYLES[f.style];
      if (!style) continue;
      const w = Number(f.w) || style.width;
      const h = Number(f.h) || style.height;
      // Bucket key — round to 0.1mm so float-jitter on close-but-not-equal
      // sizes still collapses correctly.
      const scupper = downspoutHasScupperBox(cfg, face, f.style);
      const key = `${f.style}|${w.toFixed(1)}|${h.toFixed(1)}|S${scupper ? 1 : 0}`;
      const existing = groups.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        const isDefault = Math.abs(w - style.width)  < 0.05 &&
                          Math.abs(h - style.height) < 0.05;
        groups.set(key, { style: f.style, w, h, count: 1, isDefault, scupper });
      }
    }
  }
  return Array.from(groups.values());
}

/* Walk windows that have `hasShutters: true` and tally pairs by
 * (shutterStyle, shutterW, shutterH). Each window contributes 2 pieces
 * (one left + one right, but identical for symmetric patterns), so
 * `count` here is pairs — the cut sheet generator emits 2 × count cuts.
 */
function tallyShutters(cfg) {
  const groups = new Map();
  for (const face of ['front', 'back', 'east', 'west']) {
    for (const op of structuralWallFeaturesForFace(cfg, face)) {
      if (op.type !== 'window' || !op.hasShutters) continue;
      const styleKey = op.shutterStyle || 'louvered';
      if (!SHUTTER_STYLES[styleKey]) continue;
      const sw = Math.max(2, op.w * SHUTTER_W_RATIO);
      const sh = op.h;
      const key = `${styleKey}|${sw.toFixed(1)}|${sh.toFixed(1)}`;
      const existing = groups.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        groups.set(key, { style: styleKey, w: sw, h: sh, count: 1 });
      }
    }
  }
  return Array.from(groups.values());
}

/* Produce laser-cut sheets for shutters. One sheet per (shutter style ×
 * shutter dimensions). Each window contributes 2 identical pieces — left
 * and right shutters use the same physical part. Cut from cladding. */
function generateShutterParts(cfg, shutterGroups) {
  const parts = [];
  for (const group of (shutterGroups || [])) {
    if (!group || group.count <= 0) continue;
    const style = SHUTTER_STYLES[group.style];
    if (!style) continue;

    const totalPieces = group.count * 2;  // 2 pieces per pair, no spares
    const pw = group.w, ph = group.h;
    const gutter = 3;
    const cellW = pw, cellH = ph;
    const cols = Math.max(2, Math.floor((250 - gutter) / (cellW + gutter)));
    const rows = Math.ceil(totalPieces / cols);
    const sheetW = cols * (cellW + gutter) + gutter;
    const sheetH = rows * (cellH + gutter) + gutter;

    const rects = [];
    const lines = [];

    for (let i = 0; i < totalPieces; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const ox = gutter + c * (cellW + gutter);
      const oy = gutter + r * (cellH + gutter);
      rects.push({ type: 'cut', structural: true, x: ox, y: oy, w: pw, h: ph, compensateKerf: false });

      // Etched detail features
      const features = style.featureGenerator ? style.featureGenerator(pw, ph) : (style.features || []);
      if (features.length) {
        const shapes = doorFeatureShapes({ width: pw, height: ph, features });
        for (const sh of shapes) {
          if (sh.type === 'rect') {
            const x1 = ox + sh.x, y1 = oy + sh.y;
            const x2 = ox + sh.x + sh.w, y2 = oy + sh.y + sh.h;
            lines.push({ type: 'etch', x1, y1, x2, y2: y1 });
            lines.push({ type: 'etch', x1: x2, y1, x2, y2 });
            lines.push({ type: 'etch', x1: x2, y1: y2, x2: x1, y2 });
            lines.push({ type: 'etch', x1, y1: y2, x2: x1, y2: y1 });
          } else if (sh.type === 'line') {
            lines.push({ type: 'etch',
              x1: ox + sh.x1, y1: oy + sh.y1,
              x2: ox + sh.x2, y2: oy + sh.y2 });
          } else if (sh.type === 'circle') {
            const cx = ox + sh.cx, cy = oy + sh.cy, rad = sh.r;
            const N = 12;
            let px = cx + rad, py = cy;
            for (let j = 1; j <= N; j++) {
              const a = (j / N) * 2 * Math.PI;
              const nx = cx + Math.cos(a) * rad;
              const ny = cy + Math.sin(a) * rad;
              lines.push({ type: 'etch', x1: px, y1: py, x2: nx, y2: ny });
              px = nx; py = ny;
            }
          }
        }
      }
    }

    const dimsTag = `${pw.toFixed(1)}×${ph.toFixed(1)}mm`;
    // Sanitize dims for the id
    const idSuffix = `_${pw.toFixed(1)}x${ph.toFixed(1)}`.replace(/\./g, '_');
    // Single-tile preview geometry — one shutter piece with its etched
    // detail, so the parts panel shows one + "Cut ×N" instead of every
    // single shutter on the tiled cut sheet.
    const tileRects = [{ type: 'cut', structural: true, x: 0, y: 0, w: pw, h: ph, compensateKerf: false }];
    const tileLines = [];
    {
      const features = style.featureGenerator ? style.featureGenerator(pw, ph) : (style.features || []);
      if (features.length) {
        const shapes = doorFeatureShapes({ width: pw, height: ph, features });
        for (const sh of shapes) {
          if (sh.type === 'rect') {
            const x1 = sh.x, y1 = sh.y;
            const x2 = sh.x + sh.w, y2 = sh.y + sh.h;
            tileLines.push({ type: 'etch', x1, y1, x2, y2: y1 });
            tileLines.push({ type: 'etch', x1: x2, y1, x2, y2 });
            tileLines.push({ type: 'etch', x1: x2, y1: y2, x2: x1, y2 });
            tileLines.push({ type: 'etch', x1, y1: y2, x2: x1, y2: y1 });
          } else if (sh.type === 'line') {
            tileLines.push({ type: 'etch', x1: sh.x1, y1: sh.y1, x2: sh.x2, y2: sh.y2 });
          } else if (sh.type === 'circle') {
            const cx = sh.cx, cy = sh.cy, rad = sh.r;
            const N = 12;
            let px = cx + rad, py = cy;
            for (let j = 1; j <= N; j++) {
              const a = (j / N) * 2 * Math.PI;
              const nx = cx + Math.cos(a) * rad;
              const ny = cy + Math.sin(a) * rad;
              tileLines.push({ type: 'etch', x1: px, y1: py, x2: nx, y2: ny });
              px = nx; py = ny;
            }
          }
        }
      }
    }
    parts.push({
      id: 'shutter_' + group.style + idSuffix,
      name: `Shutter — ${style.label} (${group.count} pair${group.count > 1 ? 's' : ''} × 2 pcs · ${dimsTag})`,
      material: 'cladding',
      bboxW: sheetW, bboxH: sheetH,
      bboxOffsetX: 0, bboxOffsetY: 0,
      paths: [], rects: rects, lines: lines,
      tileCount: totalPieces,
      tileGeom: {
        bboxW: pw, bboxH: ph,
        bboxOffsetX: 0, bboxOffsetY: 0,
        paths: [], rects: tileRects, lines: tileLines,
      },
    });
  }
  return parts;
}

/* Walk unified printed wall features across all walls and bucket by
 * (style, w-to-0.1mm, h-to-0.1mm). Each printed item is one piece on a
 * printed sheet — no spares, but multiple items of the same design
 * collapse onto a single sheet for printing efficiency. */
function tallyPrintedItems(cfg) {
  const groups = new Map();
  for (const face of ['front', 'back', 'east', 'west']) {
    for (const it of surfaceWallFeaturesForFace(cfg, face, 'printed_item')) {
      if (!it.style || !PRINTED_STYLES[it.style]) continue;
      const w = Number(it.w) || 0;
      const h = Number(it.h) || 0;
      if (w <= 0 || h <= 0) continue;
      const key = `${it.style}|${w.toFixed(1)}|${h.toFixed(1)}`;
      const existing = groups.get(key);
      if (existing) existing.count += 1;
      else groups.set(key, { style: it.style, w, h, count: 1 });
    }
  }
  return Array.from(groups.values());
}

/* Produce printed sheets for all printed items grouped by style+size.
 * Output sheets carry material: 'printed' so the UI can render them as
 * full-colour artwork rather than just cut/etch lines. Each item on the
 * sheet is surrounded by L-shaped crop marks just outside the artwork
 * indicating where the user should cut.
 *
 * Unlike laser sheets, the rendered output for these is full-colour SVG
 * embedded in a `svgContent` field — `partToSvg` reads that field and
 * passes it through verbatim. */
function generatePrintedSheets(cfg, printedGroups) {
  const parts = [];
  const PAGE_W = 200;       // mm — fits comfortably on A4 (210mm wide)
  const GUTTER = 4;         // mm between crop-mark carrier tiles
  const CROP_LEN = 2.5;     // mm length of each crop-mark arm
  const CROP_GAP = 0.6;     // mm gap between artwork trim edge and crop mark
  const CROP_WIDTH = 0.1;   // mm crop-mark stroke
  const CROP_MARGIN = CROP_LEN + CROP_GAP + 0.8; // waste margin that CONTAINS the marks

  function pushFunctionalCropMarks(lines, x0, y0, w, h) {
    const x1 = x0 + w;
    const y1 = y0 + h;
    const gp = CROP_GAP;
    const ln = CROP_LEN;

    // Functional crop marks align with the TRUE trim edges:
    //   horizontal arms sit on y = top/bottom trim line
    //   vertical arms sit on x = left/right trim line
    // but stop short of the artwork by CROP_GAP. This is the standard
    // print workflow: the marks live in the waste margin and point to the
    // exact cut line instead of floating diagonally outside the object.
    // Top-left
    lines.push({ type: 'cut', x1: x0 - gp - ln, y1: y0, x2: x0 - gp, y2: y0, isCrop: true });
    lines.push({ type: 'cut', x1: x0, y1: y0 - gp - ln, x2: x0, y2: y0 - gp, isCrop: true });
    // Top-right
    lines.push({ type: 'cut', x1: x1 + gp, y1: y0, x2: x1 + gp + ln, y2: y0, isCrop: true });
    lines.push({ type: 'cut', x1: x1, y1: y0 - gp - ln, x2: x1, y2: y0 - gp, isCrop: true });
    // Bottom-left
    lines.push({ type: 'cut', x1: x0 - gp - ln, y1: y1, x2: x0 - gp, y2: y1, isCrop: true });
    lines.push({ type: 'cut', x1: x0, y1: y1 + gp, x2: x0, y2: y1 + gp + ln, isCrop: true });
    // Bottom-right
    lines.push({ type: 'cut', x1: x1 + gp, y1: y1, x2: x1 + gp + ln, y2: y1, isCrop: true });
    lines.push({ type: 'cut', x1: x1, y1: y1 + gp, x2: x1, y2: y1 + gp + ln, isCrop: true });
  }

  for (const group of (printedGroups || [])) {
    if (!group || group.count <= 0) continue;
    const style = PRINTED_STYLES[group.style];
    if (!style) continue;

    const w = group.w, h = group.h;
    const tileW = w + 2 * CROP_MARGIN;
    const tileH = h + 2 * CROP_MARGIN;

    // How many fit per row. Each tile includes a waste/crop-mark margin, so
    // crop marks are part of the printable carrier area instead of sitting
    // outside the object's exported bbox.
    const cellW = tileW + GUTTER;
    const cellH = tileH + GUTTER;
    const cols = Math.max(1, Math.floor((PAGE_W - GUTTER) / cellW));
    const rows = Math.ceil(group.count / cols);
    const sheetW = Math.min(PAGE_W, cols * cellW + GUTTER);
    const sheetH = rows * cellH + GUTTER;

    // Build the printed sheet SVG body — full-colour artwork plus crop marks.
    let body = '';
    const rects = [];
    const lines = [];

    for (let i = 0; i < group.count; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const tileX = GUTTER + c * cellW;
      const tileY = GUTTER + r * cellH;
      const ox = tileX + CROP_MARGIN;
      const oy = tileY + CROP_MARGIN;

      // The artwork itself — transform-translate so the style's designSvg
      // generates art in its local (0..w, 0..h) space. The surrounding
      // CROP_MARGIN is deliberate waste paper/sticker material.
      body += `<g transform="translate(${ox.toFixed(2)} ${oy.toFixed(2)})">`
            + buildPrintedSvgBody(style, w, h)
            + `</g>`;

      pushFunctionalCropMarks(lines, ox, oy, w, h);
    }

    // Single-tile preview: include the same waste margin, artwork offset,
    // and edge-aligned crop marks. No negative coordinates, so the preview
    // and exported tile accurately show how the marks are meant to be used.
    const tileBody = `<g transform="translate(${CROP_MARGIN.toFixed(2)} ${CROP_MARGIN.toFixed(2)})">`
                   + buildPrintedSvgBody(style, w, h)
                   + `</g>`;
    const tileLinesArr = [];
    pushFunctionalCropMarks(tileLinesArr, CROP_MARGIN, CROP_MARGIN, w, h);

    parts.push({
      id: 'printed_' + group.style + `_${w.toFixed(1)}x${h.toFixed(1)}`.replace(/\./g, '_'),
      name: `Printed sheet — ${style.label} (${group.count}× · ${w.toFixed(1)}×${h.toFixed(1)}mm artwork, crop-margin carrier)`,
      material: 'printed',
      bboxW: sheetW, bboxH: sheetH,
      bboxOffsetX: 0, bboxOffsetY: 0,
      paths: [], rects: rects, lines: lines,
      svgContent: body,
      assemblyNote: 'Print at 100% scale. Crop marks now sit inside a waste margin and align to the true artwork trim edges; cut along the imaginary rectangle connecting the crop-mark arms, then glue to the building face.',
      tileCount: group.count,
      tileGeom: {
        bboxW: tileW, bboxH: tileH,
        bboxOffsetX: 0, bboxOffsetY: 0,
        paths: [], rects: [], lines: tileLinesArr,
        svgContent: tileBody,
      },
    });
  }
  return parts;
}


/* Walk CONFIG.manualCladdingOverrides across all walls and bucket by
 * (claddingStyle, w-to-0.1mm, h-to-0.1mm). Each override = exactly one
 * cut piece (no spares — these are big bespoke patches), so the count
 * field is just how many identical patches a single sheet should emit. */
function claddingOverrideFixtureMarksForPiece(cfg, face, ovPanel, toCladX) {
  const marks = [];
  for (const fx of surfaceWallFeaturesForFace(cfg, face, 'fixture')) {
    const style = FIXTURE_STYLES[fx.style];
    if (!style) continue;
    const fw = Number(fx.w) || style.width;
    const fh = Number(fx.h) || style.height;
    const fx1 = toCladX(Number(fx.x) || 0, fw);
    const fy1 = Number(fx.y) || 0;
    const fx2 = fx1 + fw;
    const fy2 = fy1 + fh;

    const ix1 = Math.max(fx1, ovPanel.x);
    const iy1 = Math.max(fy1, ovPanel.y);
    const ix2 = Math.min(fx2, ovPanel.x + ovPanel.w);
    const iy2 = Math.min(fy2, ovPanel.y + ovPanel.h);
    if (ix2 <= ix1 + 0.001 || iy2 <= iy1 + 0.001) continue;

    // Only transfer marks that are essentially fully inside the replaced patch.
    const area = Math.max(0.001, fw * fh);
    if (((ix2 - ix1) * (iy2 - iy1)) < area * 0.98) continue;

    marks.push({
      x: fx1 - ovPanel.x,
      y: fy1 - ovPanel.y,
      w: fw,
      h: fh,
      style: fx.style,
    });
  }
  return marks;
}

function emitFixtureMarkerEtchesOnOverride(lines, mark, ox, oy) {
  const style = FIXTURE_STYLES[mark.style];
  if (!style) return;
  const tickLen = Math.max(0.55, Math.min(1.4, Math.min(mark.w, mark.h) * 0.25));
  const x1 = ox + mark.x, y1 = oy + mark.y, x2 = x1 + mark.w, y2 = y1 + mark.h;

  // Same bracket/tick idiom as fixture positioning marks on base cladding.
  lines.push({ type: 'etch', x1, y1, x2: x1 + tickLen, y2: y1 });
  lines.push({ type: 'etch', x1, y1, x2: x1, y2: y1 + tickLen });
  lines.push({ type: 'etch', x1: x2, y1, x2: x2 - tickLen, y2: y1 });
  lines.push({ type: 'etch', x1: x2, y1, x2, y2: y1 + tickLen });
  lines.push({ type: 'etch', x1, y1: y2, x2: x1 + tickLen, y2 });
  lines.push({ type: 'etch', x1, y1: y2, x2: x1, y2: y2 - tickLen });
  lines.push({ type: 'etch', x1: x2, y1: y2, x2: x2 - tickLen, y2 });
  lines.push({ type: 'etch', x1: x2, y1: y2, x2, y2: y2 - tickLen });

  // A small center mark helps align small meters/vents after the override has
  // replaced the original base cladding.
  lines.push({ type: 'etch', x1: (x1 + x2) / 2 - 0.25, y1: (y1 + y2) / 2, x2: (x1 + x2) / 2 + 0.25, y2: (y1 + y2) / 2 });
  lines.push({ type: 'etch', x1: (x1 + x2) / 2, y1: (y1 + y2) / 2 - 0.25, x2: (x1 + x2) / 2, y2: (y1 + y2) / 2 + 0.25 });
}

function tallyCladdingOverrides(cfg, plan) {
  // Compute the same edge-flush extensions as the cladding panel
  // generator — when an override sits flush against a wall edge, its
  // cut is extended out to the cladding panel's edge (cT for FB, matT
  // for sides). The piece we slot into that cut has to match those
  // wider dimensions or it won't fill the hole. Same flush detection,
  // same shift values: this is the "piece side" of the per-override
  // extension stored on the cut side in generateCladdingPanel.
  //
  // We also collect per-override CUTOUTS: rectangular holes in the
  // override piece where windows/doors pass through the wall behind
  // it. Without these, the override piece would block the openings
  // it's glued over. Reads from structural wall features (the structural-op
  // store the editor writes through the unified model); auto-generated windows on walls the
  // user hasn't touched in the editor aren't included, but in
  // practice any wall the user dropped a cladding patch onto has
  // already been opened in the editor — which materialises auto
  // openings into wallFeatures/manualOpenings — so this catches what the user
  // expects to see.
  //
  // `plan` is optional only for backwards compatibility — callers
  // should pass it. Without it we fall back to no extensions (legacy
  // behaviour), which still produces correct piece-to-cut alignment
  // when patches don't sit flush against any edge.
  const cT = (cfg && cfg.claddingThickness > 0) ? cfg.claddingThickness : 0.28;
  const fbWidth = plan ? plan.fbWidth : 0;
  const sideLen = plan ? plan.sideLen : 0;
  const matT    = plan ? plan.matT    : 0;
  const groups = new Map();
  for (const face of ['front', 'back', 'east', 'west']) {
    const isFB       = (face === 'front' || face === 'back');
    const wallWidth  = isFB ? fbWidth : sideLen;
    const shift      = isFB ? cT      : matT;
    // Wall's structural openings — windows and doors only. Bays are
    // excluded: a bay is bottom-anchored and occupies a large region,
    // and the editor enforces bays + cladding patches on the same
    // wall don't intersect in any sensible workflow. If a user does
    // overlap them, they get the patch covering the bay opening — a
    // visible bug they'll fix manually, not a silent miscut.
    const wallOps = structuralWallFeaturesForFace(cfg, face).filter(op =>
      op && (op.type === 'window' || op.type === 'door'));

    // Convert wall-local stored X into the same cladding-panel X coordinate
    // used by generateCladdingPanel(). This is essential for east side walls:
    // their cladding panels are mirrored in the SVG/card, so raw wall X would
    // place override-piece window/door cutouts backwards.
    const panelWidth = isFB ? (fbWidth + 2 * cT) : (wallWidth + 2 * matT);
    const toCladX = (rawX, rawW) => {
      if (isFB) return (Number(rawX) || 0) + cT;
      return (face === 'east')
        ? ((wallWidth - (Number(rawX) || 0) - (Number(rawW) || 0)) + matT)
        : ((Number(rawX) || 0) + matT);
    };

    for (const ov of surfaceWallFeaturesForFace(cfg, face, 'cladding_override')) {
      if (!ov.claddingStyle) continue;
      const w = Number(ov.w) || 0;
      const h = Number(ov.h) || 0;
      if (w <= 0 || h <= 0) continue;

      const rawX = Number(ov.x) || 0;
      const rawY = Number(ov.y) || 0;
      const ovCladX = toCladX(rawX, w);

      // Convert a wall-editor override into the exact cladding-panel span it
      // replaces. The editor works in wall-body coordinates, but the laser
      // cladding panel includes extra corner/overlap strips: cT on front/back
      // and matT on side walls. If the user drags the override to a wall edge,
      // the replacement piece must grow through that overlap to the true
      // cladding panel edge. East is mirrored, so raw x=0 maps to the RIGHT
      // panel edge and raw x+w=wallWidth maps to the LEFT panel edge.
      const rawTouchesStart = wallWidth > 0 && rawX <= 0.001;
      const rawTouchesEnd   = wallWidth > 0 && (rawX + w) >= (wallWidth - 0.001);
      let panelStart = ovCladX;
      let panelEnd = ovCladX + w;
      if (isFB || face === 'west') {
        if (rawTouchesStart) panelStart = 0;
        if (rawTouchesEnd) panelEnd = panelWidth;
      } else if (face === 'east') {
        if (rawTouchesEnd) panelStart = 0;
        if (rawTouchesStart) panelEnd = panelWidth;
      }
      panelStart = Math.max(0, Math.min(panelWidth, panelStart));
      panelEnd = Math.max(0, Math.min(panelWidth, panelEnd));

      const bottomExt = (cfg && cfg.claddingExtendsToFloorBottom && wallWidth > 0 && (rawY + h) >= (wallBodyHeightFromConfig(cfg) - 0.02))
        ? Math.max(0, Number(cfg.coreThickness || matT || 0))
        : 0;
      const effectiveW = Math.max(0, panelEnd - panelStart);
      const effectiveH = h + bottomExt;
      const ovPanel = {
        x: panelStart,
        y: rawY,
        w: effectiveW,
        h: effectiveH,
      };

      // Cutouts in PIECE-LOCAL coords. Intersect windows/doors in cladding
      // panel coordinates, not raw wall coordinates, so east-side override
      // replacement pieces match the rendered east cladding orientation.
      const cutouts = [];
      for (const op of wallOps) {
        const opW = Number(op.w) || 0;
        const opH = Number(op.h) || 0;
        const opX = toCladX(op.x, opW);
        const opY = Number(op.y) || 0;
        const ix1 = Math.max(opX,        ovPanel.x);
        const iy1 = Math.max(opY,        ovPanel.y);
        const ix2 = Math.min(opX + opW,  ovPanel.x + ovPanel.w);
        const iy2 = Math.min(opY + opH,  ovPanel.y + ovPanel.h);
        if (ix2 <= ix1 + 0.001 || iy2 <= iy1 + 0.001) continue;
        cutouts.push({
          x: ix1 - ovPanel.x,
          y: iy1 - ovPanel.y,
          w: ix2 - ix1,
          h: iy2 - iy1,
        });
      }
      const fixtureMarks = claddingOverrideFixtureMarksForPiece(cfg, face, ovPanel, toCladX);

      // Stable order so the group key is deterministic regardless of
      // the source op array order.
      cutouts.sort((a, b) => (a.y - b.y) || (a.x - b.x));
      fixtureMarks.sort((a, b) => (a.y - b.y) || (a.x - b.x) || String(a.style).localeCompare(String(b.style)));
      const cutoutsKey = cutouts
        .map(c => `${c.x.toFixed(2)},${c.y.toFixed(2)},${c.w.toFixed(2)},${c.h.toFixed(2)}`)
        .join(';');
      const fixtureMarksKey = fixtureMarks
        .map(m => `${m.style}:${m.x.toFixed(2)},${m.y.toFixed(2)},${m.w.toFixed(2)},${m.h.toFixed(2)}`)
        .join(';');

      // Group key includes the per-override styleParams when present so
      // two overrides of the same cladding style and dimensions but with
      // different parameter tweaks (e.g. corrugated metal at different
      // sheet sizes) end up on separate laser sheets with the appropriate
      // pattern variant on each. Legacy ops without styleParams use the
      // empty-string suffix and group together exactly as before. The
      // effective dimensions are what's keyed (and emitted) so that
      // patches with different flush configurations get separate sheets
      // sized to fill their respective holes. The cutoutsKey is the last
      // segment so patches with different window/door overlaps end up on
      // distinct sheets — each piece has the cutouts it specifically
      // needs.
      const paramKey = ov.styleParams ? JSON.stringify(ov.styleParams) : '';
      const key = `${ov.claddingStyle}|${effectiveW.toFixed(2)}|${effectiveH.toFixed(2)}|${paramKey}|${cutoutsKey}|${fixtureMarksKey}`;
      const existing = groups.get(key);
      if (existing) existing.count += 1;
      else groups.set(key, {
        claddingStyle: ov.claddingStyle,
        styleParams: ov.styleParams ? { ...ov.styleParams } : null,
        w: effectiveW, h: effectiveH, count: 1,
        cutouts,
        fixtureMarks,
      });
    }
  }
  return Array.from(groups.values());
}

/* Returns a CLADDING_STYLES entry merged with per-override styleParams,
 * if any. For styles that don't consume styleParams (anything other
 * than the corrugated_overlap pattern at the moment), or when
 * styleParams is null/undefined, the base style spec is returned
 * unchanged. This keeps the override piece's etched pattern in sync
 * with whatever sheet dimensions / corrugation density the user
 * dialled in for that specific override via the wall-editor topbar. */
function effectiveCladdingStyle(baseStyle, styleParams) {
  if (!baseStyle) return null;
  if (!styleParams || baseStyle.pattern !== 'corrugated_overlap') return baseStyle;
  return {
    ...baseStyle,
    sheetW: styleParams.sheetW != null ? styleParams.sheetW : baseStyle.sheetW,
    sheetH: styleParams.sheetH != null ? styleParams.sheetH : baseStyle.sheetH,
    corrugationSpacing: styleParams.corrugationSpacing != null ? styleParams.corrugationSpacing : baseStyle.corrugationSpacing,
    offsetFraction: styleParams.offsetFraction != null ? styleParams.offsetFraction : baseStyle.offsetFraction,
  };
}

/* Generate four thin cladding strips that wrap the INSIDE face of the
 * parapet (the band of wall material that extends above the roof deck on
 * a parapet-style roof). Without these, the parapet shows its bare core
 * material on the inside whenever the viewer angle catches it from above
 * the roof — adding the inner strips makes the parapet look properly clad
 * on both sides, matching what a real building's parapet wall looks like.
 *
 * Geometry per face (in the cladding's local frame):
 *   • front/back: width = fbWidth − 2·matT  (between the two side walls'
 *     inside faces — the front/back wall's inside-X span)
 *   • east/west:  width = sideLen           (between the front and back
 *     walls' inside faces — already accounts for matT on each end)
 *   • height: parapetH (the band of wall above the deck top)
 *
 * Each strip is a single flat rectangle cut from cladding material, with
 * the configured cladding pattern etched onto its face. The strips have
 * no overhangs and no openings — they butt-join at the inside corners.
 * Returns [] when the roof isn't a parapet, when parapetH ≤ 0, or when
 * the user has opted out via cfg.parapetInnerCladding === false. */

/* Clip a 2D line segment to the interior of one of two mirror-image
 * right triangles inscribed in a halfSpan × pitch bounding rectangle:
 *
 *   mirror=false  →  vertices (0,0), (halfSpan,0), (halfSpan,pitch)
 *                    Right angle at (halfSpan,0). Hypotenuse runs from
 *                    (0,0) to (halfSpan,pitch) — the LOWER-LEFT-to-
 *                    UPPER-RIGHT diagonal. The triangle is the
 *                    RIGHT half of the rectangle (taller on the right).
 *
 *   mirror=true   →  vertices (0,0), (halfSpan,0), (0,pitch)
 *                    Right angle at (0,0). Hypotenuse runs from
 *                    (halfSpan,0) to (0,pitch) — the LOWER-RIGHT-to-
 *                    UPPER-LEFT diagonal. The triangle is the LEFT
 *                    half (taller on the left). Mirror image of the
 *                    above across the vertical x = halfSpan/2.
 *
 * These are the two shapes a parapet_gable inner-cladding triangle can
 * take so each piece glues directly to its slope without the user
 * having to flip the cardstock (which would put the etched face
 * against the wall, hiding the pattern).
 *
 * Uses iterative half-plane clipping: each of the triangle's three
 * edges defines a "keep" half-plane. For each plane we compute the
 * signed distance from the two endpoints to the boundary — positive
 * = inside, negative = outside. Three cases:
 *   • both inside  → leave segment unchanged, continue to next plane
 *   • both outside → discard the segment entirely (returns null)
 *   • mixed        → clip at the boundary by interpolating between
 *                    the endpoints using t = d1 / (d1 − d2), and
 *                    replace whichever endpoint was outside
 *
 * After three passes the segment is either fully inside the triangle
 * or has been discarded. Returns the (possibly trimmed) segment as an
 * {x1, y1, x2, y2} object, or null if the segment never entered the
 * triangle in the first place. */
function clipSegmentToTriangle(x1, y1, x2, y2, halfSpan, pitch, mirror) {
  // Half-plane signed-distance functions, positive inside the triangle.
  // For shape A: top edge (y≥0), right edge (x≤halfSpan), hypotenuse
  //   y ≤ pitch·x/halfSpan  ⇔  pitch·x − halfSpan·y ≥ 0
  // For shape B (mirrored across x=halfSpan/2): top edge (y≥0), LEFT
  //   edge (x≥0), hypotenuse y ≤ pitch·(halfSpan−x)/halfSpan  ⇔
  //   halfSpan·pitch − pitch·x − halfSpan·y ≥ 0
  const planes = mirror
    ? [
        (x, y) => y,
        (x, y) => x,
        (x, y) => halfSpan * pitch - pitch * x - halfSpan * y,
      ]
    : [
        (x, y) => y,
        (x, y) => halfSpan - x,
        (x, y) => pitch * x - halfSpan * y,
      ];
  for (const dist of planes) {
    const d1 = dist(x1, y1);
    const d2 = dist(x2, y2);
    if (d1 < 0 && d2 < 0) return null;
    if (d1 >= 0 && d2 >= 0) continue;
    const t = d1 / (d1 - d2);
    const nx = x1 + t * (x2 - x1);
    const ny = y1 + t * (y2 - y1);
    if (d1 < 0) { x1 = nx; y1 = ny; }
    else        { x2 = nx; y2 = ny; }
  }
  return { x1, y1, x2, y2 };
}

/* Clip a line segment to an arbitrary convex polygon.
 * Used for gable-end cladding: the cladding pattern is generated over the
 * full bounding rectangle, then trimmed back to the pentagonal wall outline
 * so vertical ribs / panel seams continue cleanly into the triangular gable
 * instead of stopping at the eave line.
 *
 * `poly` is an array of {x,y} points around the polygon. The function auto-
 * detects clockwise vs counter-clockwise winding and keeps the correct side
 * of each edge. Returns the clipped segment, or null when the segment misses
 * the polygon entirely. */
function clipSegmentToConvexPolygon(x1, y1, x2, y2, poly) {
  if (!Array.isArray(poly) || poly.length < 3) return { x1, y1, x2, y2 };
  const EPS = 1e-6;

  // Signed polygon area: + for one winding, - for the other. We do not care
  // which screen-space direction it represents; we only need consistency so
  // the half-plane test keeps the inside of every edge.
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    area += a.x * b.y - b.x * a.y;
  }
  const winding = area >= 0 ? 1 : -1;

  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const ex = b.x - a.x, ey = b.y - a.y;
    // Signed distance-like value to the edge's half-plane. Multiplying by
    // winding makes "inside" positive for either polygon orientation.
    const dist = (x, y) => winding * (ex * (y - a.y) - ey * (x - a.x));
    const d1 = dist(x1, y1);
    const d2 = dist(x2, y2);
    if (d1 < -EPS && d2 < -EPS) return null;
    if (d1 >= -EPS && d2 >= -EPS) continue;
    const t = d1 / (d1 - d2);
    const nx = x1 + t * (x2 - x1);
    const ny = y1 + t * (y2 - y1);
    if (d1 < -EPS) { x1 = nx; y1 = ny; }
    else           { x2 = nx; y2 = ny; }
  }
  if (Math.hypot(x2 - x1, y2 - y1) < 0.01) return null;
  return { x1, y1, x2, y2 };
}
