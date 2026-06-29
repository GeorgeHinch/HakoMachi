import * as U from '../shared/browser-utils.js';

const $ = id => U.byId(id);

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

  function settings() {
    return U.readFormSettings(ids);
  }

  function setSettings(nextSettings) {
    U.applyFormSettings(ids, nextSettings);
    render();
  }

  function line(x1, y1, x2, y2, cls = 'cut', extra = '') {
    return U.svgLine(x1, y1, x2, y2, { class: cls }, extra);
  }

  function rect(x, y, w, h, cls = 'cut', extra = '') {
    return U.svgRect(x, y, w, h, { class: cls }, extra);
  }

  function text(x, y, value, cls = 'label', size = 1.8) {
    return U.svgText(x, y, value, {
      class: cls,
      'font-size': size,
      'font-family': 'Arial',
      fill: '#5d4327'
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
    ].forEach(p => place(p[0], p[1], p[2], 'core', () => corePanel(p[3])));

    const insetD = Math.max(1, s.outerD - 4 * s.matT);
    [
      ['Cladding front', s.outerW, s.outerH, 0],
      ['Cladding back', s.outerW, s.outerH, 1],
      ['Cladding left', insetD, s.outerH, 2],
      ['Cladding right', insetD, s.outerH, 3],
      ['Cladding top', s.outerW, insetD, 4],
      ['Cladding bottom', s.outerW, insetD, 5]
    ].forEach(p => place(p[0], p[1], p[2], 'skin', () => skinPanel(p[3])));

    [
      ['Brace front', s.outerW, s.outerH],
      ['Brace back', s.outerW, s.outerH],
      ['Brace left', insetD, s.outerH],
      ['Brace right', insetD, s.outerH]
    ].forEach(p => place(p[0], p[1], p[2], 'brace', () => bracePanel()));

    if (s.topBrace) place('Brace top', s.outerW, insetD, 'brace', () => bracePanel());

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
      let out = rect(p.x, p.y, p.w, p.h, 'score');
      out += braceLines(p.x, p.y, p.w, p.h, s, 'cut');
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
    out += `<circle class="etch" cx="${(lx + lw * 0.80).toFixed(3)}" cy="${(ly + lh * 0.74).toFixed(3)}" r="${(Math.min(lw, lh) * 0.18).toFixed(3)}"/>`;
    return out;
  }

  function braceLines(x, y, w, h, s, cls) {
    const bw = Math.min(s.braceW, Math.min(w, h) / 3);
    let out = '';
    const edge = (x1, y1, x2, y2) => {
      out += line(x1, y1, x2, y2, cls, `stroke-width="${bw.toFixed(3)}" stroke-linecap="square"`);
    };
    edge(x + bw / 2, y + bw / 2, x + w - bw / 2, y + bw / 2);
    edge(x + bw / 2, y + h - bw / 2, x + w - bw / 2, y + h - bw / 2);
    edge(x + bw / 2, y + bw / 2, x + bw / 2, y + h - bw / 2);
    edge(x + w - bw / 2, y + bw / 2, x + w - bw / 2, y + h - bw / 2);
    edge(x + w / 2, y + bw / 2, x + w / 2, y + h - bw / 2);
    if (s.diag !== 'none') {
      edge(x + bw, y + bw, x + w - bw, y + h - bw);
      if (s.diag === 'x') edge(x + w - bw, y + bw, x + bw, y + h - bw);
    }
    return out;
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
    return pts.map(p => `<circle class="etch" cx="${p[0].toFixed(3)}" cy="${p[1].toFixed(3)}" r="${r}"/>`).join('');
  }

  function makeSvg(s, preview = false) {
    const L = layout(s);
    const heightAttr = preview ? '' : ` height="${L.sheetH.toFixed(2)}mm"`;
    let body = '';
    L.parts.forEach(p => {
      body += p.fn(p, s);
      if (s.labels) body += text(p.x, p.y - 1.1, p.name, 'label', 1.5);
    });
    return `<svg${preview ? ' class="previewSvg"' : ''} xmlns="http://www.w3.org/2000/svg" width="${preview ? '100%' : L.sheetW.toFixed(2) + 'mm'}"${heightAttr} viewBox="0 0 ${L.sheetW.toFixed(2)} ${L.sheetH.toFixed(2)}" data-sheet-width-mm="${L.sheetW.toFixed(2)}" data-sheet-height-mm="${L.sheetH.toFixed(2)}" preserveAspectRatio="xMinYMin meet"><style>.cut{fill:none;stroke:#111;stroke-width:${s.strokeW};vector-effect:non-scaling-stroke}.score{fill:none;stroke:#1b66d1;stroke-width:${s.strokeW};stroke-dasharray:.75 .55;vector-effect:non-scaling-stroke}.etch{fill:none;stroke:#a76015;stroke-width:${s.strokeW};stroke-dasharray:.45 .45;vector-effect:non-scaling-stroke}.label{paint-order:stroke;stroke:white;stroke-width:.35;font-family:Arial;fill:#5d4327}</style><rect x="0" y="0" width="${L.sheetW.toFixed(2)}" height="${L.sheetH.toFixed(2)}" fill="white"/>${body}</svg>`;
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
    const bw = Math.min(s.braceW, Math.min(w, h) / 4);
    let out = '';
    function strip(rx, ry, rw, rh, angle = 0) {
      const cx = rx + rw / 2;
      const cy = ry + rh / 2;
      out += `<rect x="${rx.toFixed(3)}" y="${ry.toFixed(3)}" width="${Math.max(0, rw).toFixed(3)}" height="${Math.max(0, rh).toFixed(3)}" fill="#b77a32" stroke="#6b421e" stroke-width=".07" vector-effect="non-scaling-stroke" transform="rotate(${angle.toFixed(3)} ${cx.toFixed(3)} ${cy.toFixed(3)})"/>`;
    }
    strip(x, y, w, bw);
    strip(x, y + h - bw, w, bw);
    strip(x, y, bw, h);
    strip(x + w - bw, y, bw, h);
    strip(x + w / 2 - bw / 2, y, bw, h);
    if (s.diag !== 'none') {
      const len = Math.sqrt(w * w + h * h);
      const angle = Math.atan2(h, w) * 180 / Math.PI;
      strip(x + w / 2 - len / 2, y + h / 2 - bw / 2, len, bw, angle);
      if (s.diag === 'x') strip(x + w / 2 - len / 2, y + h / 2 - bw / 2, len, bw, -angle);
    }
    return out;
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
          .replaceAll('class="etch"', 'stroke="#80512b" fill="none" stroke-width=".05" vector-effect="non-scaling-stroke"')
          .replaceAll('<line', '<line stroke="#80512b" stroke-width=".05" vector-effect="non-scaling-stroke"');
      }
    }
    if (part.kind === 'brace') {
      body += thumbRect(pad, pad, w, h, '#f3d79c', '#c9a15f', 0.06);
      body += thumbWood(pad + 0.25, pad + 0.25, w - 0.5, h - 0.5, s, w > h ? 'h' : 'v');
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

  function render() {
    try {
      const s = settings();
      const L = layout(s);
      $('svgHost').innerHTML = '<div class="previewScroller">' + makeSvg(s, true) + '</div>';
      $('renderHost').innerHTML = renderParts(s);
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
