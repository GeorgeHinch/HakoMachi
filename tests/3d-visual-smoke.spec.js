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
    return { width, height, sampled: 0, uniqueColors: 0, nonEmpty: false };
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

  const points = [
    [0.18, 0.18], [0.35, 0.22], [0.52, 0.28], [0.72, 0.34],
    [0.24, 0.55], [0.48, 0.58], [0.68, 0.62], [0.84, 0.76],
  ];
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
});
