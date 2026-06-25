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

function scaleFixtureFeatureForPiece(feature, sx, sy) {
  const f = { ...(feature || {}) };
  const scaleX = Number.isFinite(sx) ? sx : 1;
  const scaleY = Number.isFinite(sy) ? sy : 1;
  const scaleR = (scaleX + scaleY) / 2;

  for (const key of ['x', 'x1', 'x2', 'cx', 'w']) {
    if (f[key] != null && Number.isFinite(Number(f[key]))) f[key] = Number(f[key]) * scaleX;
  }
  for (const key of ['y', 'y1', 'y2', 'cy', 'h']) {
    if (f[key] != null && Number.isFinite(Number(f[key]))) f[key] = Number(f[key]) * scaleY;
  }
  if (f.r != null && Number.isFinite(Number(f.r))) f.r = Number(f.r) * scaleR;

  // For rail-density helpers, keep count explicit if present but scale any
  // authored spacing so resized static-feature fixtures preserve their visual
  // rhythm instead of leaving accent marks at the original size.
  if (f.spacing != null && Number.isFinite(Number(f.spacing))) f.spacing = Number(f.spacing) * scaleY;
  if (f.targetCell != null && Number.isFinite(Number(f.targetCell))) f.targetCell = Number(f.targetCell) * scaleR;
  return f;
}

function scaleFixtureFeaturesForPiece(features, naturalW, naturalH, actualW, actualH) {
  if (!Array.isArray(features) || !features.length) return [];
  const sourceW = Math.max(0.0001, Number(naturalW) || Number(actualW) || 1);
  const sourceH = Math.max(0.0001, Number(naturalH) || Number(actualH) || 1);
  const sx = (Number(actualW) || sourceW) / sourceW;
  const sy = (Number(actualH) || sourceH) / sourceH;
  if (Math.abs(sx - 1) < 1e-9 && Math.abs(sy - 1) < 1e-9) return features;
  return features.map(f => scaleFixtureFeatureForPiece(f, sx, sy));
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
        const naturalW = (piece.width  != null) ? piece.width  : style.width;
        const naturalH = (piece.height != null) ? piece.height : style.height;
        const pieceFeatures = piece.featureGenerator
          ? piece.featureGenerator(pw, ph)
          : scaleFixtureFeaturesForPiece(piece.features || [], naturalW, naturalH, pw, ph);
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
  const hx = x + spec.x;
  const hy = y + spec.y;
  const hw = spec.w;
  const hh = spec.h;
  if (spec.shape === 'circle') {
    const cx = hx + hw / 2;
    const cy = hy + hh / 2;
    const rx = hw / 2, ry = hh / 2;
    const d = `M ${(cx - rx).toFixed(3)},${cy.toFixed(3)}`
            + ` A ${rx.toFixed(3)},${ry.toFixed(3)} 0 1,1 ${(cx + rx).toFixed(3)},${cy.toFixed(3)}`
            + ` A ${rx.toFixed(3)},${ry.toFixed(3)} 0 1,1 ${(cx - rx).toFixed(3)},${cy.toFixed(3)} Z`;
    paths.push({ type: 'cut', d, compensateKerf: true });
  } else {
    rects.push({ type: 'cut', x: hx, y: hy, w: hw, h: hh, compensateKerf: true });
  }
}

function addFixtureThroughHolesToWall(rects, paths, cfg, face, xMirror) {
  const features = wallFeaturesForFace(cfg, face);
  for (const f of (features || [])) {
    if (!f || f.type !== 'fixture') continue;
    const style = FIXTURE_STYLES[f.style];
    if (!style || !style.throughCore) continue;
    const fW = (f.w != null) ? f.w : (style.width || 1);
    const fH = (f.h != null) ? f.h : (style.height || 1);
    const x = xMirror ? xMirror(f.x, fW) : f.x;
    const y = f.y;
    const spec = fixtureThroughHoleSpec(style, fW, fH);
    addFixtureThroughHoleGeometry(rects, paths, x, y, fW, fH, spec);
  }
}

function addFixtureThroughHolesToCladding(rects, paths, cfg, face, xMirror, shiftX = 0, shiftY = 0, opts = {}) {
  const features = wallFeaturesForFace(cfg, face);
  for (const f of (features || [])) {
    if (!f || f.type !== 'fixture') continue;
    const style = FIXTURE_STYLES[f.style];
    if (!style || !style.throughCore) continue;
    const fW = (f.w != null) ? f.w : (style.width || 1);
    const fH = (f.h != null) ? f.h : (style.height || 1);
    const rawX = xMirror ? xMirror(f.x, fW) : f.x;
    const rawY = f.y;

    // Fixture pass-through holes must line up with the *retained* cladding
    // piece geometry after panel splitting/cropping. Some cladding export
    // paths work in retained local coordinates and others work in original
    // wall coordinates, so this helper accepts an explicit shift. When
    // opts.retainLocal=true, subtract the retained piece origin. When false,
    // keep legacy original-wall coordinates.
    const x = rawX - shiftX;
    const y = rawY - shiftY;
    const spec = fixtureThroughHoleSpec(style, fW, fH);
    addFixtureThroughHoleGeometry(rects, paths, x, y, fW, fH, spec);
  }
}

function addDownspoutScupperThroughHolesToWall(rects, paths, cfg, face, xMirror) {
  if (!cfg) return;
  const features = wallFeaturesForFace(cfg, face);
  for (const f of (features || [])) {
    if (!f || f.type !== 'fixture' || f.style !== 'downspout') continue;
    if (!downspoutHasScupperBox(cfg, face, f.style)) continue;
    const style = FIXTURE_STYLES[f.style] || {};
    const fW = (f.w != null) ? f.w : (style.width || 1);
    const fH = (f.h != null) ? f.h : (style.height || 1);
    const x = xMirror ? xMirror(f.x, fW) : f.x;
    const sc = downspoutScupperLocalSpec(fW, fH);
    const holeX = x + sc.throatX;
    const holeY = downspoutScupperWallHoleY(cfg, face, f.y, sc);
    paths.push({
      type: 'cut',
      d: rectPath(holeX, holeY, sc.throatW, sc.throatH),
      compensateKerf: true,
    });
  }
}

function addDownspoutScupperThroughHolesToCladding(rects, paths, cfg, face, xMirror, shiftX = 0, shiftY = 0) {
  if (!cfg) return;
  const features = wallFeaturesForFace(cfg, face);
  for (const f of (features || [])) {
    if (!f || f.type !== 'fixture' || f.style !== 'downspout') continue;
    if (!downspoutHasScupperBox(cfg, face, f.style)) continue;
    const style = FIXTURE_STYLES[f.style] || {};
    const fW = (f.w != null) ? f.w : (style.width || 1);
    const fH = (f.h != null) ? f.h : (style.height || 1);
    const rawX = xMirror ? xMirror(f.x, fW) : f.x;
    const sc = downspoutScupperLocalSpec(fW, fH);
    const holeX = rawX + sc.throatX - shiftX;
    const holeY = downspoutScupperWallHoleY(cfg, face, f.y, sc) - shiftY;
    paths.push({
      type: 'cut',
      d: rectPath(holeX, holeY, sc.throatW, sc.throatH),
      compensateKerf: true,
    });
  }
}

function addDownspoutScupperMarksToCladding(lines, cfg, face, xMirror, shiftX = 0, shiftY = 0) {
  if (!cfg) return;
  const features = wallFeaturesForFace(cfg, face);
  for (const f of (features || [])) {
    if (!f || f.type !== 'fixture' || f.style !== 'downspout') continue;
    if (!downspoutHasScupperBox(cfg, face, f.style)) continue;
    const style = FIXTURE_STYLES[f.style] || {};
    const fW = (f.w != null) ? f.w : (style.width || 1);
    const fH = (f.h != null) ? f.h : (style.height || 1);
    const rawX = xMirror ? xMirror(f.x, fW) : f.x;
    const sc = downspoutScupperLocalSpec(fW, fH);
    const boxX = rawX + sc.boxX - shiftX;
    const boxY = downspoutScupperWallBoxY(cfg, face, f.y, sc) - shiftY;
    const throatX = rawX + sc.throatX - shiftX;
    const throatY = downspoutScupperWallHoleY(cfg, face, f.y, sc) - shiftY;
    lines.push({ type: 'etch', x1: boxX, y1: boxY, x2: boxX + sc.boxW, y2: boxY });
    lines.push({ type: 'etch', x1: boxX + sc.boxW, y1: boxY, x2: boxX + sc.boxW, y2: boxY + sc.boxH });
    lines.push({ type: 'etch', x1: boxX + sc.boxW, y1: boxY + sc.boxH, x2: boxX, y2: boxY + sc.boxH });
    lines.push({ type: 'etch', x1: boxX, y1: boxY + sc.boxH, x2: boxX, y2: boxY });
    lines.push({ type: 'etch', x1: throatX, y1: throatY, x2: throatX + sc.throatW, y2: throatY });
    lines.push({ type: 'etch', x1: throatX + sc.throatW, y1: throatY, x2: throatX + sc.throatW, y2: throatY + sc.throatH });
    lines.push({ type: 'etch', x1: throatX + sc.throatW, y1: throatY + sc.throatH, x2: throatX, y2: throatY + sc.throatH });
    lines.push({ type: 'etch', x1: throatX, y1: throatY + sc.throatH, x2: throatX, y2: throatY });
  }
}
