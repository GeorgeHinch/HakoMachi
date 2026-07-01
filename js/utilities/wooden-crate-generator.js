import * as U from './shared.js';
import { createUtility3dPreview } from './utility-3d-preview.js';

const $ = id => U.byId(id);
const SVG_OP = U.SVG_FABRICATION_OPERATIONS;
const COLOR_CUT = U.svgFabricationColor(SVG_OP.CUT_RETAINED);
const COLOR_ENGRAVE = U.svgFabricationColor(SVG_OP.ENGRAVE);

function operationForClass(cls) {
  return cls === 'cut' ? SVG_OP.CUT_RETAINED : SVG_OP.ENGRAVE;
}

  const ids = [
    'outerW',
    'outerD',
    'outerH',
    'matT',
    'clearance',
    'tabW',
    'edgeMargin',
    'labels',
    'plank',
    'breaks',
    'nails',
    'crateLabels',
    'braceW',
    'diag',
    'topBrace',
    'partGap',
    'strokeW'
  ];

  const defaults = {
    outerW: 28,
    outerD: 18,
    outerH: 16,
    matT: 0.28,
    clearance: 0.04,
    tabW: 3,
    edgeMargin: 1,
    labels: true,
    plank: 1.6,
    breaks: true,
    nails: true,
    crateLabels: true,
    braceW: 1.1,
    diag: 'x',
    topBrace: true,
    partGap: 5,
    strokeW: 0.05
  };

  const crate3d = createUtility3dPreview($('crate3dPreview'), { readyText: '3D crate preview ready.' });

  function settings() {
    return U.readFormSettings(ids);
  }

  function setSettings(nextSettings) {
    U.applyFormSettings(ids, nextSettings);
    render();
  }

  function line(x1, y1, x2, y2, cls = 'cut', extra = '') {
    return U.svgLine(x1, y1, x2, y2, { class: cls, 'data-operation': operationForClass(cls) }, extra);
  }

  function rect(x, y, w, h, cls = 'cut', extra = '') {
    return U.svgRect(x, y, w, h, { class: cls, 'data-operation': operationForClass(cls) }, extra);
  }

  function pathFromPoints(points) {
    return points.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(3)} ${p.y.toFixed(3)}`).join(' ') + ' Z';
  }

  function cutPath(d, extra = '') {
    return `<path class="cut" data-operation="${SVG_OP.CUT_RETAINED}" d="${d}" ${extra}/>`;
  }

  function text(x, y, value, cls = 'label', size = 1.8) {
    return U.svgText(x, y, value, {
      class: cls,
      'data-operation': SVG_OP.ENGRAVE,
      'font-size': size,
      'font-family': 'Arial',
      fill: COLOR_ENGRAVE
    });
  }

  function tabsForEdge(len, s) {
    const margin = Math.min(Math.max(0.2, s.edgeMargin), Math.max(0.2, len * 0.2));
    const usable = Math.max(0, len - 2 * margin);
    const n = Math.max(1, Math.round(usable / Math.max(0.6, s.tabW)));
    const gap = usable / n;
    const tabs = [];
    for (let i = 0; i < n; i++) {
      const w = Math.min(s.tabW, gap * 0.72);
      tabs.push({ a: margin + i * gap + (gap - w) / 2, w });
    }
    return tabs;
  }

  function layout(s) {
    const outerLayer = 2 * s.matT;
    const coreW = s.outerW - 2 * outerLayer;
    const coreD = s.outerD - 2 * outerLayer;
    const coreH = s.outerH - 2 * outerLayer;
    const warn = [];
    if (coreW < 4 || coreD < 4 || coreH < 4) {
      warn.push('Crate is too small for the selected layer thickness. Increase dimensions or reduce material thickness.');
    }

    const gap = s.partGap;
    const parts = [];
    let x = gap;
    let y = gap;
    let rowH = 0;

    function add(name, px, py, w, h, kind, fn) {
      parts.push({ name, x: px, y: py, w, h, kind, fn });
    }

    function place(name, w, h, kind, fn) {
      if (x + w + gap > Math.max(140, s.outerW * 5.2)) {
        x = gap;
        y += rowH + gap;
        rowH = 0;
      }
      add(name, x, y, w, h, kind, fn);
      x += w + gap;
      rowH = Math.max(rowH, h);
    }

    [
      ['Core front', coreW, coreH, 'front'],
      ['Core back', coreW, coreH, 'front'],
      ['Core left', coreD, coreH, 'side'],
      ['Core right', coreD, coreH, 'side'],
      ['Core top', coreW, coreD, 'topbottom'],
      ['Core bottom', coreW, coreD, 'topbottom']
    ].forEach(p => place(p[0], p[1], p[2], 'core', corePanel(p[3])));

    const insetD = Math.max(1, s.outerD - 4 * s.matT);
    [
      ['Cladding front', s.outerW, s.outerH, 0],
      ['Cladding back', s.outerW, s.outerH, 1],
      ['Cladding left', insetD, s.outerH, 2],
      ['Cladding right', insetD, s.outerH, 3],
      ['Cladding top', s.outerW, insetD, 4],
      ['Cladding bottom', s.outerW, insetD, 5]
    ].forEach(p => place(p[0], p[1], p[2], 'skin', skinPanel(p[3])));

    [
      ['Brace front', s.outerW, s.outerH],
      ['Brace back', s.outerW, s.outerH],
      ['Brace left', insetD, s.outerH],
      ['Brace right', insetD, s.outerH]
    ].forEach(p => place(p[0], p[1], p[2], 'brace', bracePanel()));

    if (s.topBrace) place('Brace top', s.outerW, insetD, 'brace', bracePanel());

    return {
      parts,
      sheetW: Math.max(...parts.map(p => p.x + p.w)) + gap,
      sheetH: y + rowH + gap,
      coreW,
      coreD,
      coreH,
      outerLayer,
      warn
    };
  }

  function corePanel(mode) {
    return function(p, s) {
      let out = rect(p.x, p.y, p.w, p.h, 'cut');
      out += woodgrain(p.x, p.y, p.w, p.h, s, p.w > p.h ? 'h' : 'v');
      const sd = s.matT + s.clearance;

      if (mode === 'front' || mode === 'topbottom') {
        tabsForEdge(p.w, s).forEach(t => {
          out += rect(p.x + t.a, p.y, t.w, sd, 'cut');
          out += rect(p.x + t.a, p.y + p.h - sd, t.w, sd, 'cut');
        });
      }
      if (mode === 'front' || mode === 'side' || mode === 'topbottom') {
        tabsForEdge(p.h, s).forEach(t => {
          out += rect(p.x, p.y + t.a, sd, t.w, 'cut');
          out += rect(p.x + p.w - sd, p.y + t.a, sd, t.w, 'cut');
        });
      }
      return out;
    };
  }

  function skinPanel(variant) {
    return function(p, s) {
      let out = rect(p.x, p.y, p.w, p.h, 'cut');
      out += woodgrain(p.x, p.y, p.w, p.h, s, p.w > p.h ? 'h' : 'v');
      if (s.crateLabels) out += crateLabel(p.x, p.y, p.w, p.h, variant);
      return out;
    };
  }

  function bracePanel() {
    return function(p, s) {
      let out = '';
      out += braceShapes(p.x, p.y, p.w, p.h, s);
      if (s.nails) out += nails(p.x, p.y, p.w, p.h, s);
      return out;
    };
  }

  function woodgrain(x, y, w, h, s, dir) {
    let out = '';
    const sp = Math.max(0.35, s.plank);
    if (dir === 'v') {
      for (let xx = x + sp; xx < x + w - 0.05; xx += sp) out += line(xx, y, xx, y + h, 'etch');
      if (s.breaks) {
        for (let yy = y + sp * 1.5; yy < y + h - sp; yy += sp * 2) {
          out += line(x + 0.35, yy, x + w - 0.35, yy, 'etch');
        }
      }
    } else {
      for (let yy = y + sp; yy < y + h - 0.05; yy += sp) out += line(x, yy, x + w, yy, 'etch');
      if (s.breaks) {
        for (let xx = x + sp * 1.5; xx < x + w - sp; xx += sp * 2) {
          out += line(xx, y + 0.35, xx, y + h - 0.35, 'etch');
        }
      }
    }
    return out;
  }

  function crateLabel(x, y, w, h, variant) {
    if (w < 6 || h < 5) return '';
    const lw = Math.min(Math.max(w * 0.24, 2.4), 5.2);
    const lh = Math.min(Math.max(h * 0.18, 1.5), 3.4);
    const lx = x + w - lw - Math.max(0.7, w * 0.08);
    const ly = y + Math.max(0.8, h * 0.1);
    let out = rect(lx, ly, lw, lh, 'etch');
    for (let i = 1; i <= 3; i++) {
      out += line(lx + lw * 0.13, ly + lh * i / 4, lx + lw * (variant % 2 ? 0.72 : 0.84) - i * 0.08, ly + lh * i / 4, 'etch');
    }
    for (let i = 0; i < 8; i++) {
      const xx = lx + lw * 0.12 + lw * 0.42 * i / 8;
      out += line(xx, ly + lh * 0.70, xx, ly + lh * (i % 3 === 0 ? 0.88 : 0.82), 'etch');
    }
      out += `<circle class="etch" data-operation="${SVG_OP.ENGRAVE}" cx="${(lx + lw * 0.80).toFixed(3)}" cy="${(ly + lh * 0.74).toFixed(3)}" r="${(Math.min(lw, lh) * 0.18).toFixed(3)}"/>`;
    return out;
  }

  function rectPoly(x, y, w, h) {
    return [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h }
    ];
  }

  function polygonArea(points) {
    let sum = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i];
      const b = points[(i + 1) % points.length];
      sum += a.x * b.y - b.x * a.y;
    }
    return sum / 2;
  }

  function signedLineDistance(p, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    return ((p.x - a.x) * dy - (p.y - a.y) * dx) / len;
  }

  function clipPolygonByLineDistance(poly, a, b, threshold, keepGreater) {
    if (!poly.length) return [];
    const out = [];
    const eps = 0.000001;
    const inside = value => keepGreater ? value >= threshold - eps : value <= threshold + eps;
    for (let i = 0; i < poly.length; i++) {
      const cur = poly[i];
      const prev = poly[(i + poly.length - 1) % poly.length];
      const curDist = signedLineDistance(cur, a, b);
      const prevDist = signedLineDistance(prev, a, b);
      const curInside = inside(curDist);
      const prevInside = inside(prevDist);
      if (curInside !== prevInside) {
        const denom = curDist - prevDist;
        const t = Math.abs(denom) < eps ? 0 : (threshold - prevDist) / denom;
        out.push({
          x: prev.x + (cur.x - prev.x) * t,
          y: prev.y + (cur.y - prev.y) * t
        });
      }
      if (curInside) out.push(cur);
    }
    return out;
  }

  function keepValidPolygons(polys) {
    return polys.filter(poly => poly.length >= 3 && Math.abs(polygonArea(poly)) > 0.0001);
  }

  function splitHolesAroundStrip(holes, a, b, halfWidth) {
    const next = [];
    holes.forEach(poly => {
      next.push(
        clipPolygonByLineDistance(poly, a, b, halfWidth, true),
        clipPolygonByLineDistance(poly, a, b, -halfWidth, false)
      );
    });
    return keepValidPolygons(next);
  }

  function braceHolePolygons(x, y, w, h, s) {
    const bw = Math.max(0.05, Math.min(s.braceW, Math.min(w, h) / 3));
    const innerX0 = x + bw;
    const innerX1 = x + w - bw;
    const innerY0 = y + bw;
    const innerY1 = y + h - bw;
    const centerX0 = x + w / 2 - bw / 2;
    const centerX1 = x + w / 2 + bw / 2;
    let holes = keepValidPolygons([
      rectPoly(innerX0, innerY0, Math.max(0, centerX0 - innerX0), Math.max(0, innerY1 - innerY0)),
      rectPoly(centerX1, innerY0, Math.max(0, innerX1 - centerX1), Math.max(0, innerY1 - innerY0))
    ]);

    if (s.diag !== 'none') {
      holes = splitHolesAroundStrip(
        holes,
        { x: innerX0, y: innerY0 },
        { x: innerX1, y: innerY1 },
        bw / 2
      );
      if (s.diag === 'x') {
        holes = splitHolesAroundStrip(
          holes,
          { x: innerX1, y: innerY0 },
          { x: innerX0, y: innerY1 },
          bw / 2
        );
      }
    }
    return holes;
  }

  function braceCompoundPathD(x, y, w, h, s) {
    const outer = rectPoly(x, y, w, h);
    const holes = braceHolePolygons(x, y, w, h, s);
    return [outer, ...holes].map(pathFromPoints).join(' ');
  }

  function braceShapes(x, y, w, h, s) {
    return cutPath(braceCompoundPathD(x, y, w, h, s), 'fill-rule="evenodd"');
  }

  function nails(x, y, w, h, s) {
    const r = 0.11;
    const pts = [
      [x + s.braceW * 0.5, y + s.braceW * 0.5],
      [x + w - s.braceW * 0.5, y + s.braceW * 0.5],
      [x + s.braceW * 0.5, y + h - s.braceW * 0.5],
      [x + w - s.braceW * 0.5, y + h - s.braceW * 0.5],
      [x + w / 2, y + s.braceW * 0.5],
      [x + w / 2, y + h - s.braceW * 0.5]
    ];
    return pts.map(p => `<circle class="etch" data-operation="${SVG_OP.ENGRAVE}" cx="${p[0].toFixed(3)}" cy="${p[1].toFixed(3)}" r="${r}"/>`).join('');
  }

  function makeSvg(s, preview = false) {
    const L = layout(s);
    const heightAttr = preview ? '' : ` height="${L.sheetH.toFixed(2)}mm"`;
    let body = '';
    L.parts.forEach(p => {
      body += p.fn(p, s);
      if (s.labels) body += text(p.x, p.y - 1.1, p.name, 'label', 1.5);
    });
    return `<svg${preview ? ' class="previewSvg"' : ''} xmlns="http://www.w3.org/2000/svg" width="${preview ? '100%' : L.sheetW.toFixed(2) + 'mm'}"${heightAttr} viewBox="0 0 ${L.sheetW.toFixed(2)} ${L.sheetH.toFixed(2)}" data-sheet-width-mm="${L.sheetW.toFixed(2)}" data-sheet-height-mm="${L.sheetH.toFixed(2)}" preserveAspectRatio="xMinYMin meet"><style>.cut{fill:none;stroke:${COLOR_CUT};stroke-width:${s.strokeW};vector-effect:non-scaling-stroke}.score{fill:none;stroke:${COLOR_ENGRAVE};stroke-width:${s.strokeW};stroke-dasharray:.75 .55;vector-effect:non-scaling-stroke}.etch{fill:none;stroke:${COLOR_ENGRAVE};stroke-width:${s.strokeW};stroke-dasharray:.45 .45;vector-effect:non-scaling-stroke}.label{font-family:Arial;fill:${COLOR_ENGRAVE};stroke:none}</style><rect x="0" y="0" width="${L.sheetW.toFixed(2)}" height="${L.sheetH.toFixed(2)}" fill="white"/>${body}</svg>`;
  }

  function partSpecs(s) {
    const L = layout(s);
    const d = Math.max(1, s.outerD - 4 * s.matT);
    const specs = [
      ['Core front', 'core', L.coreW, L.coreH, 'front'],
      ['Core back', 'core', L.coreW, L.coreH, 'front'],
      ['Core left', 'core', L.coreD, L.coreH, 'side'],
      ['Core right', 'core', L.coreD, L.coreH, 'side'],
      ['Core top', 'core', L.coreW, L.coreD, 'topbottom'],
      ['Core bottom', 'core', L.coreW, L.coreD, 'topbottom'],
      ['Cladding front', 'skin', s.outerW, s.outerH, 0],
      ['Cladding back', 'skin', s.outerW, s.outerH, 1],
      ['Cladding left', 'skin', d, s.outerH, 2],
      ['Cladding right', 'skin', d, s.outerH, 3],
      ['Cladding top', 'skin', s.outerW, d, 4],
      ['Cladding bottom', 'skin', s.outerW, d, 5],
      ['Brace front', 'brace', s.outerW, s.outerH],
      ['Brace back', 'brace', s.outerW, s.outerH],
      ['Brace left', 'brace', d, s.outerH],
      ['Brace right', 'brace', d, s.outerH]
    ];
    if (s.topBrace) specs.push(['Brace top', 'brace', s.outerW, d]);
    return specs.map(p => ({ name: p[0], kind: p[1], w: Math.max(1, p[2]), h: Math.max(1, p[3]), mode: p[4] }));
  }

  function thumbLine(x1, y1, x2, y2, color = '#8b5a25', sw = 0.08, dash = '') {
    return `<line x1="${x1.toFixed(3)}" y1="${y1.toFixed(3)}" x2="${x2.toFixed(3)}" y2="${y2.toFixed(3)}" stroke="${color}" stroke-width="${sw}" ${dash ? `stroke-dasharray="${dash}"` : ''} vector-effect="non-scaling-stroke"/>`;
  }

  function thumbRect(x, y, w, h, fill, stroke = '#6b4b26', sw = 0.08, extra = '') {
    return `<rect x="${x.toFixed(3)}" y="${y.toFixed(3)}" width="${Math.max(0, w).toFixed(3)}" height="${Math.max(0, h).toFixed(3)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" vector-effect="non-scaling-stroke" ${extra}/>`;
  }

  function thumbWood(x, y, w, h, s, dir) {
    let out = '';
    const sp = Math.max(0.4, s.plank);
    if (dir === 'v') {
      for (let xx = x + sp; xx < x + w - 0.05; xx += sp) out += thumbLine(xx, y, xx, y + h);
      for (let yy = y + sp * 2; yy < y + h - sp; yy += sp * 2) out += thumbLine(x + 0.5, yy, x + w - 0.5, yy, '#c08a47', 0.045, '0.35 0.3');
    } else {
      for (let yy = y + sp; yy < y + h - 0.05; yy += sp) out += thumbLine(x, yy, x + w, yy);
      for (let xx = x + sp * 2; xx < x + w - sp; xx += sp * 2) out += thumbLine(xx, y + 0.5, xx, y + h - 0.5, '#c08a47', 0.045, '0.35 0.3');
    }
    return out;
  }

  function thumbBrace(x, y, w, h, s) {
    return `<path d="${braceCompoundPathD(x, y, w, h, s)}" fill="#b77a32" fill-rule="evenodd" stroke="#6b421e" stroke-width=".07" vector-effect="non-scaling-stroke"/>`;
  }

  function partSvg(part, s) {
    const pad = 1.4;
    const w = part.w;
    const h = part.h;
    const vw = w + pad * 2;
    const vh = h + pad * 2;
    let body = '';

    if (part.kind === 'core') {
      body += thumbRect(pad, pad, w, h, '#efd49c');
      body += thumbWood(pad + 0.2, pad + 0.2, w - 0.4, h - 0.4, s, w > h ? 'h' : 'v');
    }
    if (part.kind === 'skin') {
      body += thumbRect(pad, pad, w, h, '#e8c47e');
      body += thumbWood(pad + 0.25, pad + 0.25, w - 0.5, h - 0.5, s, w > h ? 'h' : 'v');
      if (s.crateLabels) {
        body += crateLabel(pad + 0.25, pad + 0.25, w - 0.5, h - 0.5, Number(part.mode) || 0)
          .replaceAll('class="etch"', `stroke="${COLOR_ENGRAVE}" fill="none" stroke-width=".05" vector-effect="non-scaling-stroke"`)
          .replaceAll('<line', `<line stroke="${COLOR_ENGRAVE}" stroke-width=".05" vector-effect="non-scaling-stroke"`);
      }
    }
    if (part.kind === 'brace') {
      body += thumbBrace(pad, pad, w, h, s);
      if (s.nails) {
        [
          [pad + s.braceW * 0.5, pad + s.braceW * 0.5],
          [pad + w - s.braceW * 0.5, pad + s.braceW * 0.5],
          [pad + s.braceW * 0.5, pad + h - s.braceW * 0.5],
          [pad + w - s.braceW * 0.5, pad + h - s.braceW * 0.5],
          [pad + w / 2, pad + s.braceW * 0.5],
          [pad + w / 2, pad + h - s.braceW * 0.5]
        ].forEach(p => {
          body += `<circle cx="${p[0].toFixed(3)}" cy="${p[1].toFixed(3)}" r=".09" fill="#5f3c1b"/>`;
        });
      }
    }
    return `<svg class="partThumb" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw.toFixed(2)} ${vh.toFixed(2)}" preserveAspectRatio="xMidYMid meet"><rect x="0" y="0" width="${vw.toFixed(2)}" height="${vh.toFixed(2)}" fill="#fffaf0"/>${body}</svg>`;
  }

  function renderParts(s) {
    return partSpecs(s)
      .map(p => `<div class="partCard"><h3>${U.escapeHtml(p.name)} <small>${p.w.toFixed(1)}&times;${p.h.toFixed(1)} mm</small></h3>${partSvg(p, s)}</div>`)
      .join('');
  }

  function addCrateFaceBraces(group, THREE, box, s, face, sign) {
    const W = s.outerW;
    const D = s.outerD;
    const H = s.outerH;
    const t = Math.max(0.08, s.matT);
    const bw = Math.max(0.25, Math.min(s.braceW, Math.min(W, D, H) / 3));
    const zFace = sign * (D / 2 + t * 1.5);
    const xFace = sign * (W / 2 + t * 1.5);
    const wood = 0xb97835;
    function add(mesh) { group.add(mesh); }
    if (face === 'frontBack') {
      add(box({ w: W, h: bw, d: t, x: 0, y: bw / 2, z: zFace, color: wood }));
      add(box({ w: W, h: bw, d: t, x: 0, y: H - bw / 2, z: zFace, color: wood }));
      add(box({ w: bw, h: H, d: t, x: -W / 2 + bw / 2, y: H / 2, z: zFace, color: wood }));
      add(box({ w: bw, h: H, d: t, x: W / 2 - bw / 2, y: H / 2, z: zFace, color: wood }));
      add(box({ w: bw, h: H, d: t, x: 0, y: H / 2, z: zFace, color: wood }));
      if (s.diag !== 'none') {
        const len = Math.hypot(W - bw * 2, H - bw * 2);
        const angle = Math.atan2(H - bw * 2, W - bw * 2);
        add(box({ w: len, h: bw, d: t, x: 0, y: H / 2, z: zFace + sign * t * 0.1, color: wood, rotation: { z: angle } }));
        if (s.diag === 'x') add(box({ w: len, h: bw, d: t, x: 0, y: H / 2, z: zFace + sign * t * 0.2, color: wood, rotation: { z: -angle } }));
      }
    } else if (face === 'side') {
      add(box({ w: t, h: bw, d: D, x: xFace, y: bw / 2, z: 0, color: wood }));
      add(box({ w: t, h: bw, d: D, x: xFace, y: H - bw / 2, z: 0, color: wood }));
      add(box({ w: t, h: H, d: bw, x: xFace, y: H / 2, z: -D / 2 + bw / 2, color: wood }));
      add(box({ w: t, h: H, d: bw, x: xFace, y: H / 2, z: D / 2 - bw / 2, color: wood }));
      add(box({ w: t, h: H, d: bw, x: xFace, y: H / 2, z: 0, color: wood }));
      if (s.diag !== 'none') {
        const len = Math.hypot(D - bw * 2, H - bw * 2);
        const angle = Math.atan2(H - bw * 2, D - bw * 2);
        add(box({ w: t, h: bw, d: len, x: xFace + sign * t * 0.1, y: H / 2, z: 0, color: wood, rotation: { x: -angle } }));
        if (s.diag === 'x') add(box({ w: t, h: bw, d: len, x: xFace + sign * t * 0.2, y: H / 2, z: 0, color: wood, rotation: { x: angle } }));
      }
    }
  }

  function renderCrate3d(s) {
    crate3d.setModel((THREE, helpers) => {
      const group = new THREE.Group();
      const box = helpers.box;
      const W = Math.max(1, s.outerW);
      const D = Math.max(1, s.outerD);
      const H = Math.max(1, s.outerH);
      const t = Math.max(0.08, s.matT);
      const skin = 0xd8aa62;
      const core = 0xf0d8a1;
      group.add(box({ w: W - t * 2, h: H - t * 2, d: D - t * 2, x: 0, y: H / 2, z: 0, color: core, opacity: 0.34 }));
      group.add(box({ w: W, h: H, d: t, x: 0, y: H / 2, z: D / 2, color: skin, opacity: 0.88 }));
      group.add(box({ w: W, h: H, d: t, x: 0, y: H / 2, z: -D / 2, color: skin, opacity: 0.88 }));
      group.add(box({ w: t, h: H, d: D, x: -W / 2, y: H / 2, z: 0, color: skin, opacity: 0.88 }));
      group.add(box({ w: t, h: H, d: D, x: W / 2, y: H / 2, z: 0, color: skin, opacity: 0.88 }));
      group.add(box({ w: W, h: t, d: D, x: 0, y: H, z: 0, color: skin, opacity: 0.92 }));
      group.add(box({ w: W, h: t, d: D, x: 0, y: t / 2, z: 0, color: skin, opacity: 0.92 }));
      addCrateFaceBraces(group, THREE, box, s, 'frontBack', 1);
      addCrateFaceBraces(group, THREE, box, s, 'frontBack', -1);
      addCrateFaceBraces(group, THREE, box, s, 'side', 1);
      addCrateFaceBraces(group, THREE, box, s, 'side', -1);
      if (s.topBrace) {
        const bw = Math.max(0.25, Math.min(s.braceW, Math.min(W, D) / 3));
        const y = H + t * 1.5;
        group.add(box({ w: W, h: t, d: bw, x: 0, y, z: -D / 2 + bw / 2, color: 0xb97835 }));
        group.add(box({ w: W, h: t, d: bw, x: 0, y, z: D / 2 - bw / 2, color: 0xb97835 }));
        group.add(box({ w: bw, h: t, d: D, x: -W / 2 + bw / 2, y, z: 0, color: 0xb97835 }));
        group.add(box({ w: bw, h: t, d: D, x: W / 2 - bw / 2, y, z: 0, color: 0xb97835 }));
      }
      group.userData.previewKind = 'wooden-crate';
      return group;
    });
  }

  function render() {
    try {
      const s = settings();
      const L = layout(s);
      $('svgHost').innerHTML = '<div class="previewScroller">' + makeSvg(s, true) + '</div>';
      $('renderHost').innerHTML = renderParts(s);
      renderCrate3d(s);
      $('readout').innerHTML = (L.warn.length ? `<div class="bad">${L.warn.join('<br>')}</div>` : '') +
        `<b>Computed structural core outside:</b><br>${L.coreW.toFixed(2)} W &times; ${L.coreD.toFixed(2)} D &times; ${L.coreH.toFixed(2)} H mm<br>` +
        `<b>Outside layer allowance per side:</b> ${L.outerLayer.toFixed(2)} mm = cladding ${s.matT.toFixed(2)} + bracing ${s.matT.toFixed(2)}<br>` +
        `<b>SVG sheet:</b> ${L.sheetW.toFixed(1)} &times; ${L.sheetH.toFixed(1)} mm`;
    } catch (err) {
      $('svgHost').innerHTML = '<div class="readout bad">Preview render error: ' + U.escapeHtml(err.message || err) + '</div>';
      $('renderHost').innerHTML = '';
      console.error(err);
    }
  }

  function openSvgPreview() {
    U.openTextPreview(makeSvg(settings(), false), 'image/svg+xml');
  }

  function download(name, mime, content) {
    U.downloadText(content, name, mime);
  }

  $('jumpPreview').addEventListener('click', () => {
    document.querySelector('.canvasWrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('openSvgPreview').addEventListener('click', openSvgPreview);
  $('downloadSvg').addEventListener('click', () => download('wooden_crate_1_150_laser_parts.svg', 'image/svg+xml', makeSvg(settings(), false)));
  $('downloadSettings').addEventListener('click', () => U.downloadJson(settings(), 'wooden_crate_1_150_settings.json'));
  $('reset').addEventListener('click', () => setSettings(defaults));
  ids.forEach(id => $(id).addEventListener('input', render));
  render();
