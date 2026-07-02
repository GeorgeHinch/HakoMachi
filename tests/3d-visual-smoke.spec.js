const { expect, test } = require('@playwright/test');
const zlib = require('zlib');

const SITE_AUTOSAVE_KEY = 'hakomachiSitePlannerAutosave_v1';
const SITE_AUTOSAVE_META_KEY = 'hakomachiSitePlannerAutosaveMeta_v1';

async function sampledCanvasStats(locator) {
  return pngStats(await locator.screenshot());
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : (pb <= pc ? b : c);
}

function pngStats(buffer) {
  const decoded = decodePng(buffer);
  if (!decoded) {
    return { width: 0, height: 0, sampled: 0, uniqueColors: 0, nonEmpty: false };
  }
  const { width, height, bpp, pixels, stride } = decoded;
  const points = [];
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 36; x++) {
      points.push([(x + 0.5) / 36, (y + 0.5) / 24]);
    }
  }
  const colors = new Set();
  let nonEmpty = false;
  for (const [rx, ry] of points) {
    const x = Math.max(0, Math.min(width - 1, Math.floor(width * rx)));
    const y = Math.max(0, Math.min(height - 1, Math.floor(height * ry)));
    const index = y * stride + x * bpp;
    const r = pixels[index];
    const g = pixels[index + 1];
    const b = pixels[index + 2];
    const a = bpp === 4 ? pixels[index + 3] : 255;
    colors.add(`${r},${g},${b},${a}`);
    if (a && (r || g || b)) nonEmpty = true;
  }
  return { width, height, sampled: points.length, uniqueColors: colors.size, nonEmpty };
}

function countPixels(buffer, predicate) {
  const decoded = decodePng(buffer);
  if (!decoded) return { count: 0, total: 0, ratio: 0 };
  const { width, height, bpp, pixels, stride } = decoded;
  let count = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * stride + x * bpp;
      const pixel = {
        r: pixels[index],
        g: pixels[index + 1],
        b: pixels[index + 2],
        a: bpp === 4 ? pixels[index + 3] : 255,
      };
      if (predicate(pixel)) count++;
    }
  }
  const total = width * height;
  return { count, total, ratio: total ? count / total : 0 };
}

function decodePng(buffer) {
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += length + 12;
  }

  const bpp = colorType === 6 ? 4 : (colorType === 2 ? 3 : 0);
  if (!width || !height || bitDepth !== 8 || !bpp) {
    return null;
  }

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  const pixels = Buffer.alloc(stride * height);
  let rawOffset = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[rawOffset++];
    const row = pixels.subarray(y * stride, (y + 1) * stride);
    const prev = y ? pixels.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const left = x >= bpp ? row[x - bpp] : 0;
      const up = prev ? prev[x] : 0;
      const upLeft = prev && x >= bpp ? prev[x - bpp] : 0;
      const value = raw[rawOffset++];
      if (filter === 0) row[x] = value;
      else if (filter === 1) row[x] = (value + left) & 255;
      else if (filter === 2) row[x] = (value + up) & 255;
      else if (filter === 3) row[x] = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) row[x] = (value + paeth(left, up, upLeft)) & 255;
    }
  }
  return { width, height, bpp, pixels, stride };
}

test.describe('3D visual smoke coverage', () => {
  test('Site Planner 3D renders a nonblank mixed scene', async ({ page }) => {
    const project = {
      app: 'HakoMachi Site Planner',
      version: 82,
      portableProject: true,
      savedAt: new Date().toISOString(),
      coordinateSystem: { type: 'imagePixels', origin: 'topLeft', imageWidthPx: 1000, imageHeightPx: 680 },
      image: null,
      imageMeta: { naturalWidthPx: 1000, naturalHeightPx: 680, mimeType: 'image/svg+xml' },
      view: { x: 0, y: 0, scale: 1 },
      site3d: { imageVisible: false, imageOpacity: 0.45 },
      scale: { calibrated: true, pxPerMm: 2, calibrationLine: null, units: 'mm' },
      buildings: [
        { id: 'b1', name: 'Solid shop', padType: 'rect', x: 210, y: 210, width: 150, height: 95, rotationDeg: 0, color: '#b8c2b4', plannerHeightMm: 52 },
        { id: 'b2', name: 'Tall block', padType: 'rect', x: 450, y: 260, width: 120, height: 120, rotationDeg: 14, color: '#d5b98f', plannerHeightMm: 86 },
        { id: 'b3', name: 'Corner pad', padType: 'polygon', points: [{ x: 650, y: 180 }, { x: 790, y: 210 }, { x: 745, y: 330 }, { x: 620, y: 305 }], color: '#a9bdd2', plannerHeightMm: 44 },
      ],
      roads: [
        { id: 'road1', mode: 'centerline', points: [{ x: 80, y: 500 }, { x: 920, y: 420 }], widthMm: 18, color: '#55514a' },
      ],
      tracks: [
        { id: 'track1', pointsPx: [{ x: 120, y: 120 }, { x: 360, y: 150 }, { x: 560, y: 110 }], curvesPx: [{ x: 250, y: 70 }, { x: 460, y: 190 }], gaugeMm: 9, roadbedWidthMm: 19, tieSpacingMm: 4 },
      ],
      benchworkOutlines: [
        { id: 'bench1', points: [{ x: 60, y: 60 }, { x: 940, y: 60 }, { x: 940, y: 610 }, { x: 60, y: 610 }] },
      ],
      roadFeatures: [],
      stlObjects: [],
      fabricRegions: [],
      streetlights: [],
      annotations: [],
    };

    await page.addInitScript(({ key, metaKey, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem(metaKey, JSON.stringify({ savedAt: value.savedAt, dirtySinceManualSave: true }));
    }, { key: SITE_AUTOSAVE_KEY, metaKey: SITE_AUTOSAVE_META_KEY, value: project });

    await page.goto('/site-planner.html', { waitUntil: 'networkidle' });
    await page.locator('#view3dCanvasBtn').click();
    const canvas = page.locator('#site3dView canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(300);

    const stats = await sampledCanvasStats(canvas);
    expect(stats.width).toBeGreaterThan(200);
    expect(stats.height).toBeGreaterThan(120);
    expect(stats.nonEmpty).toBe(true);
    expect(stats.uniqueColors).toBeGreaterThan(2);
  });

  test('Site Planner 3D keeps the reference image visible above the benchwork base', async ({ page }) => {
    const referenceSvg = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600">',
      '<rect width="900" height="600" fill="#ff00cc"/>',
      '<rect x="0" y="260" width="900" height="80" fill="#00d6ff"/>',
      '</svg>',
    ].join('');
    const svgDataUrl = 'data:image/svg+xml;base64,' + Buffer.from(referenceSvg).toString('base64');
    const project = {
      app: 'HakoMachi Site Planner',
      version: 82,
      portableProject: true,
      savedAt: new Date().toISOString(),
      coordinateSystem: { type: 'imagePixels', origin: 'topLeft', imageWidthPx: 900, imageHeightPx: 600 },
      image: { mimeType: 'image/svg+xml', dataUrl: svgDataUrl, naturalWidthPx: 900, naturalHeightPx: 600, widthPx: 900, heightPx: 600 },
      view: { x: 0, y: 0, scale: 1 },
      site3d: { imageVisible: true, imageOpacity: 1 },
      scale: { calibrated: true, pxPerMm: 2, calibrationLine: null, units: 'mm' },
      buildings: [],
      roads: [],
      tracks: [],
      benchworkOutlines: [
        { id: 'bench1', points: [{ x: 60, y: 60 }, { x: 840, y: 60 }, { x: 840, y: 540 }, { x: 60, y: 540 }] },
      ],
      roadFeatures: [],
      stlObjects: [],
      fabricRegions: [],
      streetlights: [],
      annotations: [],
    };

    await page.addInitScript(({ key, metaKey, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem(metaKey, JSON.stringify({ savedAt: value.savedAt, dirtySinceManualSave: true }));
    }, { key: SITE_AUTOSAVE_KEY, metaKey: SITE_AUTOSAVE_META_KEY, value: project });

    await page.goto('/site-planner.html', { waitUntil: 'networkidle' });
    await page.locator('#view3dCanvasBtn').click();
    const canvas = page.locator('#site3dView canvas').first();
    await expect(canvas).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    const magenta = countPixels(await canvas.screenshot(), ({ r, g, b, a }) => a > 200 && r > 170 && b > 120 && g < 120);
    expect(magenta.ratio).toBeGreaterThan(0.01);
  });

  test('Building Generator 3D preview renders a nonblank solid model', async ({ page }) => {
    await page.goto('/building-generator.html', { waitUntil: 'networkidle' });
    const canvas = page.locator('#threePreview canvas').first();
    await expect(canvas).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(300);

    const stats = await sampledCanvasStats(canvas);
    expect(stats.width).toBeGreaterThan(200);
    expect(stats.height).toBeGreaterThan(120);
    expect(stats.nonEmpty).toBe(true);
    expect(stats.uniqueColors).toBeGreaterThan(2);
  });

  for (const utility of [
    { path: '/utils/safety-railing-generator.html', host: '#railing3dPreview', status: /3D railing preview ready/i },
    { path: '/utils/industrial-shelf-generator.html', host: '#shelf3dPreview', status: /3D object preview ready/i },
    { path: '/utils/wooden-crate-generator.html', host: '#crate3dPreview', status: /3D crate preview ready/i },
  ]) {
    test(`${utility.path} utility 3D preview renders a nonblank object`, async ({ page }) => {
      await page.goto(utility.path, { waitUntil: 'networkidle' });
      await expect(page.locator(`${utility.host} .utility3dStatus`)).toContainText(utility.status, { timeout: 20000 });
      const canvas = page.locator(`${utility.host} canvas`).first();
      await expect(canvas).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(300);

      const stats = await sampledCanvasStats(canvas);
      expect(stats.width).toBeGreaterThan(200);
      expect(stats.height).toBeGreaterThan(120);
      expect(stats.nonEmpty).toBe(true);
      expect(stats.uniqueColors).toBeGreaterThan(2);
    });
  }
});
