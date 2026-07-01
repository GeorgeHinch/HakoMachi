/* =====================================================================
   PRINTED ITEMS LIBRARY
   These items are NOT laser-cut. They get printed on paper (or sticker
   stock) on a regular inkjet/laser printer, hand-cut along crop marks,
   and glued onto the model by the user.

   Each entry defines:
     label, description     — UI strings
     width, height          — default size in mm
     designSvg(w, h)        — returns inline SVG for the printed design at
                              the given dimensions. Used in the toolbox
                              preview, editor canvas, 3D plate texture,
                              AND the printed-sheet output. One source of
                              truth for the artwork.
   ===================================================================== */
/* Original polygon/path bodies extracted from the supplied Buffer-Large.svg
 * and Buffer-Small.svg artwork files. The polygons are positioned in their
 * original Adobe Illustrator coordinates (bbox starts at the bb_x/bb_y noted
 * in each PRINTED_STYLES entry), and the designSvg function below transforms
 * them into the printed item's local 0..w × 0..h frame via a single
 * `transform="scale(sx,sy) translate(-bb_x,-bb_y)"` wrapper. CSS class
 * references in the source SVGs have already been resolved to explicit
 * fill attributes so the bodies stand alone without a <style> block. */
export const BUFFER_LARGE_BODY = `<polygon fill="#fada10" points="393.2 301 394 301.5 395.2 302.3 396 302.7 396.4 303 398.1 304.1 398.7 304.5 398.8 306.2 397.9 305.7 396.3 304.7 394.9 303.8 394.4 303.5 393.2 302.7 393.2 301.1 393.2 301"/><polygon fill="#f9da10" points="393.2 297.8 393.6 298 394.8 298.8 395.9 299.5 396.2 299.7 397.6 300.6 398.7 301.2 398.7 302.9 398.2 302.6 396.9 301.7 395.8 301 394.4 300.2 393.2 299.4 393.2 297.9 393.2 297.8"/><path fill="#f9da10" d="M393.3,310.6s0,0,0,0l1.8,1.1.9.6.6.4,1.2.7,1,.6v1.4s0,0,0,0l-.6-.3-1.2-.8-1.2-.8-1.8-1.1-.7-.4v-1.6Z"/><path fill="#fada10" d="M393.2,304.3s0,0,.1,0l1.3.8,1.3.8s0,0,0,0l1.3.8,1.4.9v1.5s-1-.6-1-.6l-1.6-1-1-.6-.6-.4-1.3-.8s0,0-.1,0c0,0,0,0,0,0v-1.5Z"/><path fill="#fada10" d="M393.3,307.5l1.7,1,1.1.7c.1.1.3.2.5.3l1.2.8,1,.6v1.5s-.9-.6-.9-.6l-1.7-1.1-1.2-.7-.7-.4c-.4-.2-.7-.5-1.1-.7v-1.5s0,0,0,0Z"/><path fill="#fad90c" d="M395.7,296.2c0,0,.2.1.3.2l1.3.8,1.3.8v1.4s0,0,0,0c0,0,0,0,0,0l-1.2-.8-1.3-.8h-.1c0,0-1.4-1-1.4-1l-1.3-.8h2.4Z"/><path fill="#050807" d="M393.2,296.2v1.6s.5.3.5.3l1.2.8,1.1.7.3.2,1.4.9,1.1.7v-1.6s0,0,0,0l-1.2-.8-1.3-.8h-.1c0,0-1.4-1-1.4-1l-1.3-.8s0,0-.1,0Z"/><polygon fill="#050807" points="393.2 301 394 301.5 395.2 302.3 396 302.7 396.4 303 398.1 304.1 398.7 304.5 398.7 302.9 398.2 302.6 396.9 301.7 395.8 301 394.4 300.2 393.2 299.4 393.2 301"/><path fill="#151514" d="M393.2,304.3s0,0,.1,0l1.3.8,1.3.8s0,0,0,0l1.3.8,1.4.9v-1.6s-.8-.5-.8-.5l-1.6-1-1.5-.9-.5-.3-1.2-.7v1.6Z"/><path fill="#151514" d="M393.3,307.5h0s1.7,1.1,1.7,1.1l1.1.7c.1.1.3.2.5.3l1.2.8,1,.6v-1.6s-1-.6-1-.6l-1.6-1-1-.6-.6-.4-1.3-.8s0,0-.1,0v1.6Z"/><path fill="#151514" d="M393.3,310.6s0,0,0,0l1.8,1.1.9.6.6.4,1.2.7,1,.6v-1.6s-.9-.6-.9-.6l-1.7-1.1-1.2-.7-.7-.4c-.4-.2-.7-.5-1.1-.7v1.6Z"/><path fill="#fadb19" d="M393.3,313.7s0,0,.1,0l1.3.8,1.4.9s0,0,0,0l.8.5h-2.4s0,0,0,0h0s-1-.7-1-.7c0,0-.1,0-.2,0,0,0,0,0,0,0v-1.5Z"/><path fill="#040807" d="M393.3,313.7s0,0,.1,0l1.3.8,1.4.9s0,0,0,0l.8.5h1.8s0-.5,0-.5l-.6-.3-1.2-.8-1.2-.8-1.8-1.1-.7-.4v1.6Z"/><path fill="#050807" d="M395.7,296.2h2.5s.4.3.4.3v1.6s-1.3-.8-1.3-.8l-1.3-.8c-.1,0-.3-.1-.3-.2Z"/><path fill="#212120" d="M393.3,315.2c0,0,.1,0,.2,0l1,.7h0s0,0,0,0h-1.3s0-.8,0-.8Z"/><path fill="#f6db27" d="M398.7,296.5l-.4-.3h.4c0,0,0,.2,0,.3Z"/>`;
export const BUFFER_SMALL_BODY = `<polygon fill="#fada10" points="384.7 354.8 385.5 355.6 386.7 356.6 387.4 357.3 387.8 357.7 389.6 359.2 390.2 359.8 390.2 362.2 389.4 361.5 387.8 360.1 386.4 358.8 385.9 358.3 384.7 357.3 384.7 355 384.7 354.8"/><polygon fill="#f9da10" points="384.7 350.2 385.1 350.6 386.3 351.6 387.4 352.6 387.7 352.9 389.1 354.2 390.2 355.1 390.2 357.5 389.7 357 388.3 355.9 387.3 354.9 385.9 353.6 384.7 352.5 384.6 350.3 384.7 350.2"/><path fill="#f9da10" d="M384.7,368.5c0,0,0,0,0,0l1.8,1.6.9.8.6.5,1.2,1.1,1,.9v2s0,.1,0,.1l-.6-.5-1.2-1.1-1.2-1.1-1.8-1.6-.7-.6v-2.2Z"/><path fill="#fada10" d="M384.7,359.5c0,0,0,0,.1.1l1.3,1.2,1.3,1.2s0,0,0,0l1.3,1.2,1.4,1.2v2.2s-1-.9-1-.9l-1.6-1.4-1-.9-.6-.5-1.3-1.2s0,0-.1,0c0,0,0,0,0,0v-2.2Z"/><path fill="#fada10" d="M384.8,364.1l1.7,1.5,1.1.9c.1.2.3.3.5.5l1.2,1.1,1,.9v2.2s-.9-.8-.9-.8l-1.7-1.5-1.2-1-.7-.6c-.4-.3-.7-.7-1.1-1v-2.1s0,0,0,0Z"/><path fill="#fad90c" d="M387.1,348c0,.1.2.2.3.3l1.3,1.2,1.3,1.2v2.1s0,0,0,0c0,0,0,0,0,0l-1.2-1.1-1.3-1.1h-.1c0,0-1.4-1.4-1.4-1.4l-1.3-1.2h2.4Z"/><path fill="#050807" d="M384.6,348v2.2s.5.4.5.4l1.2,1.1,1.1,1,.3.3,1.4,1.3,1.1.9v-2.3s0,0,0,0l-1.2-1.1-1.3-1.1h-.1c0,0-1.4-1.4-1.4-1.4l-1.3-1.2s0,0-.1,0Z"/><polygon fill="#050807" points="384.7 354.8 385.5 355.6 386.7 356.6 387.4 357.3 387.8 357.7 389.6 359.2 390.2 359.8 390.2 357.5 389.7 357 388.3 355.9 387.3 354.9 385.9 353.6 384.7 352.5 384.7 354.8"/><path fill="#151514" d="M384.7,359.5c0,0,0,0,.1.1l1.3,1.2,1.3,1.2s0,0,0,0l1.3,1.2,1.4,1.2v-2.3s-.8-.7-.8-.7l-1.6-1.4-1.5-1.3-.5-.5-1.2-1v2.3Z"/><path fill="#151514" d="M384.7,364h0s1.7,1.5,1.7,1.5l1.1.9c.1.2.3.3.5.5l1.2,1.1,1,.9v-2.3s-1-.9-1-.9l-1.6-1.4-1-.9-.6-.5-1.3-1.2s0,0-.1,0v2.3Z"/><path fill="#151514" d="M384.7,368.5c0,0,0,0,0,0l1.8,1.6.9.8.6.5,1.2,1.1,1,.9v-2.3s-.9-.8-.9-.8l-1.7-1.5-1.2-1-.7-.6c-.4-.3-.7-.7-1.1-1v2.2Z"/><path fill="#fadb19" d="M384.8,372.9c0,0,0,0,.1.1l1.3,1.2,1.4,1.3s0,0,0,0l.8.8h-2.4s0,0,0,0h0s-1-1-1-1c0,0-.1-.1-.2-.1,0,0,0,0,0,0v-2.2Z"/><path fill="#040807" d="M384.8,372.9c0,0,0,0,.1.1l1.3,1.2,1.4,1.3s0,0,0,0l.8.8h1.8s0-.7,0-.7l-.6-.5-1.2-1.1-1.2-1.1-1.8-1.6-.7-.6v2.2Z"/><path fill="#050807" d="M387.1,348h2.5s.4.4.4.4v2.3s-1.3-1.2-1.3-1.2l-1.3-1.2c-.1-.1-.3-.2-.3-.3Z"/><path fill="#212120" d="M384.8,375.1c0,0,.1,0,.2.1l1,.9h0s0,0,0,0h-1.3s0-1.2,0-1.2Z"/><path fill="#f6db27" d="M390.1,348.3l-.4-.4h.4c0,.1,0,.3,0,.4Z"/>`;

const svgNum = value => Number(value).toFixed(2);
const jpFont = 'Yu Gothic, Meiryo, sans-serif';

function safetyCross(cx, cy, size, color = '#0f8f61') {
  const arm = size * 0.26;
  return `<rect x="${svgNum(cx - size / 2)}" y="${svgNum(cy - arm / 2)}" width="${svgNum(size)}" height="${svgNum(arm)}" fill="${color}"/>`
       + `<rect x="${svgNum(cx - arm / 2)}" y="${svgNum(cy - size / 2)}" width="${svgNum(arm)}" height="${svgNum(size)}" fill="${color}"/>`;
}

export const PRINTED_STYLES = {
  movie_poster: {
    label: 'Movie poster',
    description: 'Small portrait poster for cinema marquees, lobby walls, or alley wheatpaste.',
    width: 5, height: 7,
    designSvg: (w, h) => {
      const cx = w / 2;
      return `<rect x="0" y="0" width="${w}" height="${h}" fill="#1a0a14"/>`
           + `<rect x="${(w*0.1).toFixed(2)}" y="${(h*0.1).toFixed(2)}" width="${(w*0.8).toFixed(2)}" height="${(h*0.55).toFixed(2)}" fill="#d4422a"/>`
           + `<circle cx="${cx.toFixed(2)}" cy="${(h*0.38).toFixed(2)}" r="${(w*0.18).toFixed(2)}" fill="#fcd34d" stroke="#7a1810" stroke-width="0.05"/>`
           + `<text x="${cx.toFixed(2)}" y="${(h*0.78).toFixed(2)}" font-family="serif" font-weight="bold" font-size="${(h*0.09).toFixed(2)}" fill="#fcd34d" text-anchor="middle">CINEMA</text>`
           + `<text x="${cx.toFixed(2)}" y="${(h*0.92).toFixed(2)}" font-family="sans-serif" font-size="${(h*0.05).toFixed(2)}" fill="#aaa" text-anchor="middle">NOW SHOWING</text>`;
    },
  },
  shop_sign: {
    label: 'Shop sign (horizontal)',
    description: 'Storefront sign with shop name. Glue over the door or above the shopfront.',
    width: 14, height: 3,
    designSvg: (w, h) => {
      return `<rect x="0" y="0" width="${w}" height="${h}" fill="#0a2a4a"/>`
           + `<rect x="0.1" y="0.1" width="${(w-0.2).toFixed(2)}" height="${(h-0.2).toFixed(2)}" fill="none" stroke="#fcd34d" stroke-width="0.1"/>`
           + `<text x="${(w/2).toFixed(2)}" y="${(h*0.68).toFixed(2)}" font-family="serif" font-weight="bold" font-size="${(h*0.55).toFixed(2)}" fill="#fcd34d" text-anchor="middle">★ MARKET ★</text>`;
    },
  },
  billboard_ad: {
    label: 'Billboard ad',
    description: 'Large rectangular ad for rooftop billboards or large gable walls.',
    width: 24, height: 12,
    designSvg: (w, h) => {
      return `<rect x="0" y="0" width="${w}" height="${h}" fill="#fff"/>`
           + `<rect x="0" y="0" width="${(w*0.45).toFixed(2)}" height="${h}" fill="#1862c5"/>`
           + `<text x="${(w*0.225).toFixed(2)}" y="${(h*0.55).toFixed(2)}" font-family="sans-serif" font-weight="900" font-size="${(h*0.35).toFixed(2)}" fill="#fff" text-anchor="middle">DRINK</text>`
           + `<text x="${(w*0.225).toFixed(2)}" y="${(h*0.82).toFixed(2)}" font-family="sans-serif" font-weight="900" font-size="${(h*0.18).toFixed(2)}" fill="#fcd34d" text-anchor="middle">★ COLA ★</text>`
           + `<text x="${(w*0.72).toFixed(2)}" y="${(h*0.48).toFixed(2)}" font-family="sans-serif" font-weight="bold" font-size="${(h*0.18).toFixed(2)}" fill="#1a1a1a" text-anchor="middle">Refreshes</text>`
           + `<text x="${(w*0.72).toFixed(2)}" y="${(h*0.72).toFixed(2)}" font-family="sans-serif" font-weight="bold" font-size="${(h*0.18).toFixed(2)}" fill="#d4422a" text-anchor="middle">EVERY SIP</text>`;
    },
  },
  safety_first_vertical: {
    label: 'Safety First sign (vertical)',
    description: 'Printable Japanese 安全第一 wall sign with green safety cross. Drag onto exterior walls or construction hoarding.',
    width: 6, height: 12,
    designSvg: (w, h) => {
      return `<rect x="0" y="0" width="${w}" height="${h}" fill="#fffdf6"/>`
           + `<rect x="${svgNum(w*0.05)}" y="${svgNum(h*0.04)}" width="${svgNum(w*0.9)}" height="${svgNum(h*0.92)}" fill="none" stroke="#171717" stroke-width="${svgNum(Math.max(0.08, Math.min(w,h)*0.025))}"/>`
           + safetyCross(w * 0.5, h * 0.22, Math.min(w, h) * 0.46)
           + `<text x="${svgNum(w*0.5)}" y="${svgNum(h*0.52)}" font-family="${jpFont}" font-weight="900" font-size="${svgNum(h*0.20)}" fill="#111" text-anchor="middle">安全</text>`
           + `<text x="${svgNum(w*0.5)}" y="${svgNum(h*0.72)}" font-family="${jpFont}" font-weight="900" font-size="${svgNum(h*0.20)}" fill="#111" text-anchor="middle">第一</text>`
           + `<text x="${svgNum(w*0.5)}" y="${svgNum(h*0.90)}" font-family="sans-serif" font-weight="700" font-size="${svgNum(h*0.055)}" fill="#111" text-anchor="middle">SAFETY FIRST</text>`;
    },
  },
  safety_first_horizontal: {
    label: 'Safety First sign (wide)',
    description: 'Printable horizontal 安全第一 wall sign for fence lines, warehouse facades, and construction scenes.',
    width: 18, height: 7,
    designSvg: (w, h) => {
      return `<rect x="0" y="0" width="${w}" height="${h}" fill="#fffdf6"/>`
           + `<rect x="${svgNum(w*0.025)}" y="${svgNum(h*0.06)}" width="${svgNum(w*0.95)}" height="${svgNum(h*0.88)}" fill="none" stroke="#171717" stroke-width="${svgNum(Math.max(0.08, h*0.025))}"/>`
           + safetyCross(w * 0.5, h * 0.36, Math.min(w, h) * 0.46)
           + `<text x="${svgNum(w*0.27)}" y="${svgNum(h*0.45)}" font-family="${jpFont}" font-weight="900" font-size="${svgNum(h*0.34)}" fill="#111" text-anchor="middle">安全</text>`
           + `<text x="${svgNum(w*0.73)}" y="${svgNum(h*0.45)}" font-family="${jpFont}" font-weight="900" font-size="${svgNum(h*0.34)}" fill="#111" text-anchor="middle">第一</text>`
           + `<text x="${svgNum(w*0.5)}" y="${svgNum(h*0.80)}" font-family="sans-serif" font-weight="700" font-size="${svgNum(h*0.12)}" fill="#111" text-anchor="middle">SAFETY FIRST</text>`;
    },
  },
  safety_first_split: {
    label: 'Safety First split panels',
    description: 'Printable four-panel 安 全 第 一 sign set for spacing across fences, shutters, or wide walls.',
    width: 20, height: 5,
    designSvg: (w, h) => {
      const chars = ['安', '全', '第', '一'];
      const gap = w * 0.035;
      const panelW = (w - gap * 5) / 4;
      let s = `<rect x="0" y="0" width="${w}" height="${h}" fill="#fffdf6" opacity="0.2"/>`;
      chars.forEach((ch, i) => {
        const x = gap + i * (panelW + gap);
        s += `<rect x="${svgNum(x)}" y="${svgNum(h*0.1)}" width="${svgNum(panelW)}" height="${svgNum(h*0.8)}" fill="#fff" stroke="#0f8f61" stroke-width="${svgNum(Math.max(0.08, h*0.025))}"/>`;
        s += `<text x="${svgNum(x + panelW/2)}" y="${svgNum(h*0.65)}" font-family="${jpFont}" font-weight="900" font-size="${svgNum(h*0.58)}" fill="#111" text-anchor="middle">${ch}</text>`;
      });
      return s;
    },
  },
  construction_worker_notice: {
    label: 'Construction worker notice',
    description: 'Original printable Japanese construction notice with helmeted worker and 工事中 text for wall mounting.',
    width: 10, height: 13,
    designSvg: (w, h) => {
      return `<rect x="0" y="0" width="${w}" height="${h}" fill="#f5c245"/>`
           + `<rect x="${svgNum(w*0.08)}" y="${svgNum(h*0.08)}" width="${svgNum(w*0.84)}" height="${svgNum(h*0.84)}" fill="#fffdf6" stroke="#26374a" stroke-width="${svgNum(Math.max(0.08, w*0.025))}"/>`
           + `<path d="M ${svgNum(w*0.22)} ${svgNum(h*0.33)} Q ${svgNum(w*0.35)} ${svgNum(h*0.16)} ${svgNum(w*0.49)} ${svgNum(h*0.33)} Z" fill="#f3d05f" stroke="#26374a" stroke-width="${svgNum(w*0.018)}"/>`
           + `<circle cx="${svgNum(w*0.35)}" cy="${svgNum(h*0.40)}" r="${svgNum(w*0.10)}" fill="#f2c6a0" stroke="#26374a" stroke-width="${svgNum(w*0.012)}"/>`
           + `<path d="M ${svgNum(w*0.24)} ${svgNum(h*0.55)} Q ${svgNum(w*0.35)} ${svgNum(h*0.68)} ${svgNum(w*0.46)} ${svgNum(h*0.55)}" fill="none" stroke="#26374a" stroke-width="${svgNum(w*0.035)}" stroke-linecap="round"/>`
           + `<rect x="${svgNum(w*0.27)}" y="${svgNum(h*0.53)}" width="${svgNum(w*0.17)}" height="${svgNum(h*0.20)}" rx="${svgNum(w*0.02)}" fill="#2f6fa8"/>`
           + `<line x1="${svgNum(w*0.27)}" y1="${svgNum(h*0.61)}" x2="${svgNum(w*0.17)}" y2="${svgNum(h*0.70)}" stroke="#2f6fa8" stroke-width="${svgNum(w*0.045)}" stroke-linecap="round"/>`
           + `<line x1="${svgNum(w*0.44)}" y1="${svgNum(h*0.61)}" x2="${svgNum(w*0.54)}" y2="${svgNum(h*0.70)}" stroke="#2f6fa8" stroke-width="${svgNum(w*0.045)}" stroke-linecap="round"/>`
           + `<text x="${svgNum(w*0.68)}" y="${svgNum(h*0.35)}" font-family="${jpFont}" font-weight="900" font-size="${svgNum(h*0.16)}" fill="#151515" text-anchor="middle">工事中</text>`
           + `<text x="${svgNum(w*0.68)}" y="${svgNum(h*0.54)}" font-family="${jpFont}" font-weight="700" font-size="${svgNum(h*0.065)}" fill="#151515" text-anchor="middle">ご協力</text>`
           + `<text x="${svgNum(w*0.68)}" y="${svgNum(h*0.65)}" font-family="${jpFont}" font-weight="700" font-size="${svgNum(h*0.065)}" fill="#151515" text-anchor="middle">お願いします</text>`;
    },
  },
  graffiti: {
    label: 'Graffiti tag',
    description: 'Colourful spray-painted tag for back-alley walls, train cars, abandoned buildings.',
    width: 9, height: 5,
    designSvg: (w, h) => {
      const colors = ['#e94560', '#06d6a0', '#ffd60a', '#118ab2'];
      let s = `<rect x="0" y="0" width="${w}" height="${h}" fill="rgba(255,255,255,0.05)"/>`;
      // Stylised letterforms via overlapping shapes
      const segW = w / 4;
      for (let i = 0; i < 4; i++) {
        const cx = segW * (i + 0.5);
        const cy = h * (0.4 + Math.sin(i) * 0.15);
        const r = Math.min(segW * 0.45, h * 0.4);
        s += `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r.toFixed(2)}" fill="${colors[i]}" opacity="0.85"/>`;
      }
      // Outline drips
      s += `<path d="M ${(w*0.1).toFixed(2)} ${(h*0.3).toFixed(2)} Q ${(w*0.3).toFixed(2)} ${(h*0.7).toFixed(2)}, ${(w*0.5).toFixed(2)} ${(h*0.45).toFixed(2)} T ${(w*0.9).toFixed(2)} ${(h*0.55).toFixed(2)}"`
        + ` fill="none" stroke="#1a1a1a" stroke-width="${(h*0.06).toFixed(2)}" stroke-linecap="round"/>`;
      return s;
    },
  },
  street_poster: {
    label: 'Street poster (small)',
    description: 'Small wheatpaste poster — band gigs, political slogans, lost-cat notices.',
    width: 3, height: 4.5,
    designSvg: (w, h) => {
      return `<rect x="0" y="0" width="${w}" height="${h}" fill="#fefce8"/>`
           + `<rect x="0.15" y="0.15" width="${(w-0.3).toFixed(2)}" height="${(h-0.3).toFixed(2)}" fill="none" stroke="#1a1a1a" stroke-width="0.08"/>`
           + `<text x="${(w/2).toFixed(2)}" y="${(h*0.28).toFixed(2)}" font-family="sans-serif" font-weight="900" font-size="${(h*0.13).toFixed(2)}" fill="#1a1a1a" text-anchor="middle">PUNK</text>`
           + `<text x="${(w/2).toFixed(2)}" y="${(h*0.43).toFixed(2)}" font-family="sans-serif" font-weight="900" font-size="${(h*0.13).toFixed(2)}" fill="#e94560" text-anchor="middle">NIGHT</text>`
           + `<line x1="${(w*0.2).toFixed(2)}" y1="${(h*0.5).toFixed(2)}" x2="${(w*0.8).toFixed(2)}" y2="${(h*0.5).toFixed(2)}" stroke="#1a1a1a" stroke-width="0.05"/>`
           + `<text x="${(w/2).toFixed(2)}" y="${(h*0.65).toFixed(2)}" font-family="sans-serif" font-size="${(h*0.07).toFixed(2)}" fill="#1a1a1a" text-anchor="middle">SAT 9PM</text>`
           + `<text x="${(w/2).toFixed(2)}" y="${(h*0.78).toFixed(2)}" font-family="sans-serif" font-size="${(h*0.06).toFixed(2)}" fill="#1a1a1a" text-anchor="middle">THE WAREHOUSE</text>`
           + `<text x="${(w/2).toFixed(2)}" y="${(h*0.9).toFixed(2)}" font-family="sans-serif" font-size="${(h*0.045).toFixed(2)}" fill="#777" text-anchor="middle">★ ALL AGES ★</text>`;
    },
  },
  banner: {
    label: 'Banner / flag',
    description: 'Vertical hanging banner — long narrow format for stadium fronts, building flags, festival signage.',
    width: 2, height: 10,
    designSvg: (w, h) => {
      return `<rect x="0" y="0" width="${w}" height="${(h*0.4).toFixed(2)}" fill="#d4422a"/>`
           + `<rect x="0" y="${(h*0.4).toFixed(2)}" width="${w}" height="${(h*0.6).toFixed(2)}" fill="#0a2a4a"/>`
           + `<text x="${(w/2).toFixed(2)}" y="${(h*0.18).toFixed(2)}" font-family="sans-serif" font-weight="900" font-size="${(w*0.5).toFixed(2)}" fill="#fcd34d" text-anchor="middle">SALE</text>`
           + `<text x="${(w/2).toFixed(2)}" y="${(h*0.32).toFixed(2)}" font-family="sans-serif" font-weight="900" font-size="${(w*0.5).toFixed(2)}" fill="#fcd34d" text-anchor="middle">★</text>`
           + `<text x="${(w/2).toFixed(2)}" y="${(h*0.6).toFixed(2)}" font-family="serif" font-weight="bold" font-size="${(w*0.35).toFixed(2)}" fill="#fff" text-anchor="middle">NEW</text>`
           + `<text x="${(w/2).toFixed(2)}" y="${(h*0.75).toFixed(2)}" font-family="serif" font-weight="bold" font-size="${(w*0.35).toFixed(2)}" fill="#fff" text-anchor="middle">SEASON</text>`
           + `<line x1="${(w*0.15).toFixed(2)}" y1="${(h*0.92).toFixed(2)}" x2="${(w*0.85).toFixed(2)}" y2="${(h*0.92).toFixed(2)}" stroke="#fcd34d" stroke-width="${(w*0.05).toFixed(2)}"/>`;
    },
  },
  buffer_large: {
    label: 'Safety bollard (large)',
    description: 'Yellow-and-black hazard-striped safety bollard, glued beside large bay/garage door openings to protect them from vehicle impact. The wider profile (often called a "loading-dock bumper" or 防護ポール in Japanese) suits truck bays and warehouse roll-up doors.',
    width: 3, height: 10,
    designSvg: (w, h) => {
      // Source artwork bbox: x ∈ [393.20, 398.80], y ∈ [296.20, 315.20]
      // Translate the bbox origin to (0,0) then scale to fit the printed
      // item's local frame. Original aspect is preserved when w/h match the
      // defaults; user-resizes stretch the bollard accordingly.
      const sx = w / 5.6, sy = h / 19.0;
      return `<g transform="scale(${sx.toFixed(4)},${sy.toFixed(4)}) translate(-393.20,-296.20)">${BUFFER_LARGE_BODY}</g>`;
    },
  },
  buffer_small: {
    label: 'Safety bollard (small)',
    description: 'Slimmer hazard-striped safety post for tighter spots beside narrower bay doors, pedestrian entries, or loading bay corners. Same yellow-and-black warning livery; lower visual mass than the large variant.',
    width: 2, height: 7,
    designSvg: (w, h) => {
      // Source artwork bbox: x ∈ [384.60, 390.20], y ∈ [348.00, 375.10]
      const sx = w / 5.6, sy = h / 27.1;
      return `<g transform="scale(${sx.toFixed(4)},${sy.toFixed(4)}) translate(-384.60,-348.00)">${BUFFER_SMALL_BODY}</g>`;
    },
  },
};

/* Build the inline SVG body for a printed item at the given dimensions.
 * Used by the toolbox card, editor canvas, and printed-sheet output so all
 * three show the same artwork. */
export function buildPrintedSvgBody(style, w, h) {
  if (!style || !style.designSvg) {
    return `<rect x="0" y="0" width="${w}" height="${h}" fill="#ddd" stroke="#888" stroke-width="0.1"/>`;
  }
  return style.designSvg(w, h);
}
