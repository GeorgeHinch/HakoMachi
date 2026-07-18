const { expect, test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const AUTOSAVE_KEY = 'hakomachiSitePlannerAutosave_v1';
const AUTOSAVE_META_KEY = 'hakomachiSitePlannerAutosaveMeta_v1';

async function loadPlanner(page) {
  await page.goto('/site-planner.html', { waitUntil: 'networkidle' });
  await page.locator('#canvas').waitFor({ state: 'visible' });
}

async function importTinyReferenceImage(page) {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="#f7f4ec"/></svg>';
  await page.locator('#imageFile').setInputFiles({
    name: 'track-test-plan.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(svg),
  });
  await expect(page.locator('#emptyImageOverlay')).toBeHidden({ timeout: 10000 });
}

async function autosavePayload(page) {
  await page.waitForFunction(key => {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    try {
      return !!JSON.parse(raw);
    } catch (_err) {
      return false;
    }
  }, AUTOSAVE_KEY);
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)), AUTOSAVE_KEY);
}

async function waitForTrackGeometry(page, trackId, expected) {
  await page.waitForFunction(({ key, trackId, expected }) => {
    const raw = localStorage.getItem(key);
    if (!raw) return false;
    const payload = JSON.parse(raw);
    const track = (payload.tracks || []).find(item => item.id === trackId);
    if (!track) return false;
    const near = (a, b) => Math.abs(Number(a) - Number(b)) < 0.75;
    if (expected.point0 && !near(track.pointsPx?.[0]?.x, expected.point0.x)) return false;
    if (expected.point0 && !near(track.pointsPx?.[0]?.y, expected.point0.y)) return false;
    if (expected.point1 && !near(track.pointsPx?.[1]?.x, expected.point1.x)) return false;
    if (expected.point1 && !near(track.pointsPx?.[1]?.y, expected.point1.y)) return false;
    if (expected.curve0 && !near(track.curvesPx?.[0]?.x, expected.curve0.x)) return false;
    if (expected.curve0 && !near(track.curvesPx?.[0]?.y, expected.curve0.y)) return false;
    return true;
  }, { key: AUTOSAVE_KEY, trackId, expected });
}

async function waitForTracksGeometry(page, expectedById) {
  for (const [trackId, expected] of Object.entries(expectedById)) {
    await waitForTrackGeometry(page, trackId, expected);
  }
}

async function dragWorldPoint(page, from, to, steps = 6) {
  const box = await page.locator('#canvas').boundingBox();
  expect(box).not.toBeNull();
  const view = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).view || { x: 0, y: 0, scale: 1 }, AUTOSAVE_KEY);
  const sx = point => box.x + (Number(view.x) || 0) + point.x * (Number(view.scale) || 1);
  const sy = point => box.y + (Number(view.y) || 0) + point.y * (Number(view.scale) || 1);
  await page.mouse.move(sx(from), sy(from));
  await page.mouse.down();
  await page.mouse.move(sx(to), sy(to), { steps });
  await page.mouse.up();
}

async function clickWorldPoint(page, point) {
  const box = await page.locator('#canvas').boundingBox();
  expect(box).not.toBeNull();
  const view = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).view || { x: 0, y: 0, scale: 1 }, AUTOSAVE_KEY);
  const scale = Number(view.scale) || 1;
  await page.locator('#canvas').click({
    position: {
      x: (Number(view.x) || 0) + point.x * scale,
      y: (Number(view.y) || 0) + point.y * scale,
    },
  });
}

async function activateLayoutTrackTool(page) {
  await page.locator('[data-tool="track"][data-workspace="layout"]').click();
}

function tomixSwitchFixtureEndpoints(x = 300, y = 220) {
  const defaultFlexTrackPxPerMm = 10 / 9;
  const length = 541 * Math.sin(15 * Math.PI / 180) * defaultFlexTrackPxPerMm;
  const offset = 541 * (1 - Math.cos(15 * Math.PI / 180)) * defaultFlexTrackPxPerMm;
  return {
    heel: { x: x - length / 2, y },
    straight: { x: x + length / 2, y },
    diverging: { x: x + length / 2, y: y + offset },
  };
}

function rotatedPoint(center, point, rotationDeg) {
  const angle = rotationDeg * Math.PI / 180;
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * Math.cos(angle) - dy * Math.sin(angle),
    y: center.y + dx * Math.sin(angle) + dy * Math.cos(angle),
  };
}

function tomixSwitchFixtureEndpointsRotated(x = 300, y = 220, rotationDeg = 0) {
  const endpoints = tomixSwitchFixtureEndpoints(x, y);
  const center = { x, y };
  return Object.fromEntries(Object.entries(endpoints).map(([key, point]) => [key, rotatedPoint(center, point, rotationDeg)]));
}

function blankTrackProject(overrides = {}) {
  const svgDataUrl = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="#f7f4ec"/></svg>').toString('base64');
  return {
    app: 'HakoMachi Site Planner',
    version: 80,
    portableProject: true,
    savedAt: new Date().toISOString(),
    coordinateSystem: { type: 'imagePixels', origin: 'topLeft', imageWidthPx: 900, imageHeightPx: 600 },
    image: { mimeType: 'image/svg+xml', dataUrl: svgDataUrl, naturalWidthPx: 900, naturalHeightPx: 600, widthPx: 900, heightPx: 600 },
    view: { x: 0, y: 0, scale: 1 },
    site3d: { imageVisible: true, imageOpacity: 0.45 },
    imageOpacity: 0.75,
    imageLocked: true,
    scale: { calibrated: false, pxPerMm: null, calibrationLine: null, units: 'mm' },
    buildings: [],
    roads: [],
    roadFeatures: [],
    stlObjects: [],
    benchworkOutlines: [],
    fabricRegions: [],
    streetlights: [],
    annotations: [],
    tracks: [],
    trackAccessories: [],
    ...overrides,
  };
}

async function seedAutosave(page, project) {
  await page.addInitScript(({ key, metaKey, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
    localStorage.setItem(metaKey, JSON.stringify({ savedAt: value.savedAt, dirtySinceManualSave: true }));
  }, { key: AUTOSAVE_KEY, metaKey: AUTOSAVE_META_KEY, value: project });
}

test.describe('Site Planner track regressions', () => {
  test('history snapshots include track geometry through the track controller', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'track-controller.js'), 'utf8');
    const persistenceController = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-project-persistence-controller.js'), 'utf8');
    expect(source).toContain("import { createTrackController } from './site-planner/track-controller.js';");
    expect(source).toContain('} = createTrackController({');
    expect(source).toContain('createSiteProjectPersistenceController({');
    expect(persistenceController).toContain('tracks: state.tracks || []');
    expect(persistenceController).toContain('selectedTrackId: state.selectedTrackId');
    expect(source).toContain('state.tracks=(Array.isArray(data.tracks)?structuredClone(data.tracks):[]).map(normalizeTrack);');
    expect(source).toContain('state.selectedTrackId=data.selectedTrackId||null;');
    expect(controller).toContain('export function createTrackController');
    expect(controller).toContain('function normalizeTrack(t)');
    expect(controller).toContain('function syncConnectedTrackEndpoint');
  });

  test('drawn track path is saved through autosave', async ({ page }) => {
    await loadPlanner(page);
    await importTinyReferenceImage(page);

    await activateLayoutTrackTool(page);
    const box = await page.locator('#canvas').boundingBox();
    expect(box).not.toBeNull();

    await page.mouse.click(box.x + 220, box.y + 220);
    await page.mouse.click(box.x + 320, box.y + 245);
    await page.mouse.click(box.x + 420, box.y + 205);
    await page.keyboard.press('Enter');

    await page.waitForTimeout(700);
    const payload = await autosavePayload(page);
    expect(payload.tracks).toHaveLength(1);
    expect(payload.tracks[0].pointsPx.length).toBeGreaterThanOrEqual(2);
    expect(payload.tracks[0].gaugeMm).toBe(9);
    expect(payload.tracks[0].roadbedWidthMm).toBe(19);
  });

  test('new track endpoint snaps to an existing track segment while drawing', async ({ page }) => {
    const svgDataUrl = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="#f7f4ec"/></svg>').toString('base64');
    const project = {
      app: 'HakoMachi Site Planner',
      version: 80,
      portableProject: true,
      savedAt: new Date().toISOString(),
      coordinateSystem: { type: 'imagePixels', origin: 'topLeft', imageWidthPx: 900, imageHeightPx: 600 },
      image: { mimeType: 'image/svg+xml', dataUrl: svgDataUrl, naturalWidthPx: 900, naturalHeightPx: 600, widthPx: 900, heightPx: 600 },
      view: { x: 0, y: 0, scale: 1 },
      site3d: { imageVisible: true, imageOpacity: 0.45 },
      imageOpacity: 0.75,
      imageLocked: true,
      scale: { calibrated: false, pxPerMm: null, calibrationLine: null, units: 'mm' },
      buildings: [],
      roads: [],
      roadFeatures: [],
      stlObjects: [],
      benchworkOutlines: [],
      fabricRegions: [],
      streetlights: [],
      annotations: [],
      tracks: [
        { id: 'track_existing', name: 'Existing fixture', pointsPx: [{ x: 120, y: 220 }, { x: 250, y: 220 }], gaugeMm: 9, roadbedWidthMm: 19, tieSpacingMm: 4 },
      ],
    };

    await page.addInitScript(({ key, metaKey, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem(metaKey, JSON.stringify({ savedAt: value.savedAt, dirtySinceManualSave: true }));
    }, { key: AUTOSAVE_KEY, metaKey: AUTOSAVE_META_KEY, value: project });

    await loadPlanner(page);
    await expect(page.locator('#emptyImageOverlay')).toBeHidden({ timeout: 10000 });
    await activateLayoutTrackTool(page);
    await expect(page.locator('#statusTool')).toContainText(/track/i);

    await clickWorldPoint(page, { x: 190, y: 233 });
    await clickWorldPoint(page, { x: 320, y: 270 });
    await page.keyboard.press('Enter');

    await page.waitForTimeout(700);
    const payload = await autosavePayload(page);
    expect(payload.tracks).toHaveLength(2);
    const created = payload.tracks.find(track => track.id !== 'track_existing');
    expect(created).toBeTruthy();
    expect(created.pointsPx[0]).toMatchObject({ x: 190, y: 220 });
    expect(created.endpointConnections.start).toMatchObject({
      trackId: 'track_existing',
      kind: 'segment',
    });
  });

  test('track draw tool continues an existing endpoint as one path', async ({ page }) => {
    const svgDataUrl = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="#f7f4ec"/></svg>').toString('base64');
    const project = {
      app: 'HakoMachi Site Planner',
      version: 80,
      portableProject: true,
      savedAt: new Date().toISOString(),
      coordinateSystem: { type: 'imagePixels', origin: 'topLeft', imageWidthPx: 900, imageHeightPx: 600 },
      image: { mimeType: 'image/svg+xml', dataUrl: svgDataUrl, naturalWidthPx: 900, naturalHeightPx: 600, widthPx: 900, heightPx: 600 },
      view: { x: 0, y: 0, scale: 1 },
      site3d: { imageVisible: true, imageOpacity: 0.45 },
      imageOpacity: 0.75,
      imageLocked: true,
      scale: { calibrated: false, pxPerMm: null, calibrationLine: null, units: 'mm' },
      buildings: [],
      roads: [],
      roadFeatures: [],
      stlObjects: [],
      benchworkOutlines: [],
      fabricRegions: [],
      streetlights: [],
      annotations: [],
      tracks: [
        { id: 'track_existing', name: 'Existing fixture', pointsPx: [{ x: 120, y: 220 }, { x: 250, y: 220 }], gaugeMm: 9, roadbedWidthMm: 19, tieSpacingMm: 4 },
      ],
    };

    await page.addInitScript(({ key, metaKey, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem(metaKey, JSON.stringify({ savedAt: value.savedAt, dirtySinceManualSave: true }));
    }, { key: AUTOSAVE_KEY, metaKey: AUTOSAVE_META_KEY, value: project });

    await loadPlanner(page);
    await expect(page.locator('#emptyImageOverlay')).toBeHidden({ timeout: 10000 });
    await activateLayoutTrackTool(page);
    await expect(page.locator('#statusTool')).toContainText(/track/i);

    await clickWorldPoint(page, { x: 250, y: 220 });
    await expect(page.locator('#statusHint')).toContainText('continuation started');
    await clickWorldPoint(page, { x: 340, y: 260 });
    await page.keyboard.press('Enter');

    await page.waitForTimeout(700);
    const payload = await autosavePayload(page);
    expect(payload.tracks).toHaveLength(1);
    const extended = payload.tracks[0];
    expect(extended.id).toBe('track_existing');
    expect(extended.pointsPx).toHaveLength(3);
    expect(extended.pointsPx[0]).toMatchObject({ x: 120, y: 220 });
    expect(extended.pointsPx[1]).toMatchObject({ x: 250, y: 220 });
    expect(extended.pointsPx[2].x).toBeCloseTo(340, 1);
    expect(extended.pointsPx[2].y).toBeCloseTo(260, 1);
    await expect(page.locator('#selectedPanel')).toContainText('Track selected');
  });

  test('flex track snaps to Tomix switch heel, straight, and diverging endpoints', async ({ page }) => {
    const endpoints = tomixSwitchFixtureEndpoints();
    const project = blankTrackProject({
      trackAccessories: [
        { id: 'switch_1', kind: 'trackSwitchRight', name: 'Right turnout', x: 300, y: 220, rotationDeg: 0 },
      ],
    });

    await seedAutosave(page, project);
    await loadPlanner(page);
    await expect(page.locator('#emptyImageOverlay')).toBeHidden({ timeout: 10000 });
    await activateLayoutTrackTool(page);

    await clickWorldPoint(page, { x: endpoints.diverging.x + 2, y: endpoints.diverging.y + 1 });
    await clickWorldPoint(page, { x: 430, y: 285 });
    await page.keyboard.press('Enter');

    await page.waitForTimeout(700);
    const payload = await autosavePayload(page);
    expect(payload.tracks).toHaveLength(1);
    const created = payload.tracks[0];
    expect(created.pointsPx[0].x).toBeCloseTo(endpoints.diverging.x, 0);
    expect(created.pointsPx[0].y).toBeCloseTo(endpoints.diverging.y, 0);
    expect(created.endpointConnections.start).toMatchObject({
      trackAccessoryId: 'switch_1',
      kind: 'trackSwitchEndpoint',
      endpoint: 'diverging',
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('#canvas').waitFor({ state: 'visible' });
    await activateLayoutTrackTool(page);
    await clickWorldPoint(page, { x: endpoints.heel.x, y: endpoints.heel.y });
    await clickWorldPoint(page, { x: 210, y: 255 });
    await page.keyboard.press('Enter');

    await page.waitForTimeout(700);
    const heelPayload = await autosavePayload(page);
    const heelTrack = heelPayload.tracks.find(track => track.endpointConnections?.start?.endpoint === 'heel');
    expect(heelTrack).toBeTruthy();
    expect(heelTrack.endpointConnections.start).toMatchObject({
      trackAccessoryId: 'switch_1',
      kind: 'trackSwitchEndpoint',
      endpoint: 'heel',
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('#canvas').waitFor({ state: 'visible' });
    await activateLayoutTrackTool(page);
    await clickWorldPoint(page, { x: endpoints.straight.x, y: endpoints.straight.y });
    await clickWorldPoint(page, { x: 430, y: 220 });
    await page.keyboard.press('Enter');

    await page.waitForTimeout(700);
    const straightPayload = await autosavePayload(page);
    const straightTrack = straightPayload.tracks.find(track => track.endpointConnections?.start?.endpoint === 'straight');
    expect(straightTrack).toBeTruthy();
    expect(straightTrack.endpointConnections.start).toMatchObject({
      trackAccessoryId: 'switch_1',
      kind: 'trackSwitchEndpoint',
      endpoint: 'straight',
    });
  });

  test('switch endpoint snapping keeps the drag-start source leg stable', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    expect(source).toContain('const pointerSourceEndpoint=draggedTrackSwitchEndpointName(item,pointerPoint);');
    expect(source).toContain('nearestSwitchEndpointPair(item,pointerPoint,preferredSourceEndpoint||pointerSourceEndpoint)');
    expect(source).toContain('function trackSwitchEndpointOutwardAngleDeg');
    expect(source).toContain('rotationDelta*.18');
    const objectSelection = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-object-selection-controller.js'), 'utf8');
    expect(objectSelection).toContain('snapSourceEndpoint: entry.type === type && entry.item.id === item.id ? draggedTrackSwitchEndpointName(entry.item, p) : null');
    expect(objectSelection).toContain('snapTrackSwitchToEndpoint(item, pointerPoint, preferredSourceEndpoint)');
  });

  test('dragged switch endpoint snaps to another switch endpoint and matches its turnout angle', async ({ page }) => {
    const sourceEndpoints = tomixSwitchFixtureEndpoints();
    const secondCenter = { x: 520, y: 250 };
    const secondEndpoints = tomixSwitchFixtureEndpoints(secondCenter.x, secondCenter.y);
    const halfLength = secondCenter.x - secondEndpoints.heel.x;
    const target = sourceEndpoints.diverging;
    const project = blankTrackProject({
      selectedTrackAccessoryId: 'switch_2',
      trackAccessories: [
        { id: 'switch_1', kind: 'trackSwitchRight', name: 'Source turnout', x: 300, y: 220, rotationDeg: 0 },
        { id: 'switch_2', kind: 'trackSwitchRight', name: 'Dropped turnout', x: secondCenter.x, y: secondCenter.y, rotationDeg: 0 },
      ],
    });

    await seedAutosave(page, project);
    await loadPlanner(page);
    await expect(page.locator('#emptyImageOverlay')).toBeHidden({ timeout: 10000 });

    await dragWorldPoint(page, secondCenter, { x: target.x + halfLength, y: target.y }, 10);

    await page.waitForFunction(({ key }) => {
      const payload = JSON.parse(localStorage.getItem(key) || '{}');
      const moved = (payload.trackAccessories || []).find(item => item.id === 'switch_2');
      return moved && Math.abs((Number(moved.rotationDeg) || 0) - 15) < 0.75
        && moved.trackAnchor?.kind === 'trackSwitchEndpoint'
        && moved.trackAnchor?.trackAccessoryId === 'switch_1'
        && moved.trackAnchor?.endpoint === 'diverging'
        && moved.trackAnchor?.sourceEndpoint === 'heel';
    }, { key: AUTOSAVE_KEY });

    const payload = await autosavePayload(page);
    const moved = payload.trackAccessories.find(item => item.id === 'switch_2');
    expect(moved.rotationDeg).toBeCloseTo(15, 0);
    expect(moved.trackAnchor).toMatchObject({
      kind: 'trackSwitchEndpoint',
      trackAccessoryId: 'switch_1',
      endpoint: 'diverging',
      sourceEndpoint: 'heel',
    });
  });

  test('switch snapping allows any endpoint to connect to any other switch endpoint', async ({ page }) => {
    const targetCenter = { x: 300, y: 220 };
    const sourceCenter = { x: 560, y: 220 };
    const targetEndpoints = tomixSwitchFixtureEndpointsRotated(targetCenter.x, targetCenter.y, 180);
    const sourceEndpoints = tomixSwitchFixtureEndpoints(sourceCenter.x, sourceCenter.y);
    const project = blankTrackProject({
      selectedTrackAccessoryId: 'switch_2',
      trackAccessories: [
        { id: 'switch_1', kind: 'trackSwitchRight', name: 'Target turnout', x: targetCenter.x, y: targetCenter.y, rotationDeg: 180 },
        { id: 'switch_2', kind: 'trackSwitchRight', name: 'Dropped turnout', x: sourceCenter.x, y: sourceCenter.y, rotationDeg: 0 },
      ],
    });

    await seedAutosave(page, project);
    await loadPlanner(page);
    await expect(page.locator('#emptyImageOverlay')).toBeHidden({ timeout: 10000 });

    await dragWorldPoint(page, sourceEndpoints.straight, targetEndpoints.straight, 10);

    await page.waitForFunction(({ key }) => {
      const payload = JSON.parse(localStorage.getItem(key) || '{}');
      const moved = (payload.trackAccessories || []).find(item => item.id === 'switch_2');
      return moved && Math.abs(Number(moved.rotationDeg) || 0) < 0.75
        && moved.trackAnchor?.kind === 'trackSwitchEndpoint'
        && moved.trackAnchor?.trackAccessoryId === 'switch_1'
        && moved.trackAnchor?.endpoint === 'straight'
        && moved.trackAnchor?.sourceEndpoint === 'straight';
    }, { key: AUTOSAVE_KEY });

    const payload = await autosavePayload(page);
    const moved = payload.trackAccessories.find(item => item.id === 'switch_2');
    expect(moved.rotationDeg).toBeCloseTo(0, 0);
    expect(moved.trackAnchor).toMatchObject({
      kind: 'trackSwitchEndpoint',
      trackAccessoryId: 'switch_1',
      endpoint: 'straight',
      sourceEndpoint: 'straight',
    });
  });

  test('switch snapping prefers the dragged leg closest to the cursor', async ({ page }) => {
    const sourceEndpoints = tomixSwitchFixtureEndpoints();
    const secondCenter = { x: 520, y: 260 };
    const secondEndpoints = tomixSwitchFixtureEndpoints(secondCenter.x, secondCenter.y);
    const project = blankTrackProject({
      selectedTrackAccessoryId: 'switch_2',
      trackAccessories: [
        { id: 'switch_1', kind: 'trackSwitchRight', name: 'Source turnout', x: 300, y: 220, rotationDeg: 0 },
        { id: 'switch_2', kind: 'trackSwitchRight', name: 'Dropped turnout', x: secondCenter.x, y: secondCenter.y, rotationDeg: 0 },
      ],
    });

    await seedAutosave(page, project);
    await loadPlanner(page);
    await expect(page.locator('#emptyImageOverlay')).toBeHidden({ timeout: 10000 });

    await dragWorldPoint(page, secondEndpoints.diverging, sourceEndpoints.diverging, 10);

    await page.waitForFunction(({ key }) => {
      const payload = JSON.parse(localStorage.getItem(key) || '{}');
      const moved = (payload.trackAccessories || []).find(item => item.id === 'switch_2');
      return moved?.trackAnchor?.kind === 'trackSwitchEndpoint'
        && moved.trackAnchor.trackAccessoryId === 'switch_1'
        && moved.trackAnchor.endpoint === 'diverging'
        && moved.trackAnchor.sourceEndpoint === 'diverging';
    }, { key: AUTOSAVE_KEY });
  });

  test('selected track switches can be copied and pasted as fresh objects', async ({ page }) => {
    const project = blankTrackProject({
      selectedTrackAccessoryId: 'switch_1',
      trackAccessories: [
        {
          id: 'switch_1',
          kind: 'trackSwitchRight',
          name: 'Right turnout',
          x: 300,
          y: 220,
          rotationDeg: 15,
          trackId: 'track_existing',
          trackAnchor: {
            kind: 'trackSwitchEndpoint',
            trackAccessoryId: 'other_switch',
            endpoint: 'diverging',
            sourceEndpoint: 'heel',
          },
        },
      ],
    });

    await seedAutosave(page, project);
    await loadPlanner(page);
    await expect(page.locator('#emptyImageOverlay')).toBeHidden({ timeout: 10000 });
    await clickWorldPoint(page, { x: 300, y: 220 });
    await expect(page.locator('#selectedPanel')).toContainText('Track item selected');

    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+C' : 'Control+C');
    await page.keyboard.press(process.platform === 'darwin' ? 'Meta+V' : 'Control+V');

    await page.waitForFunction(({ key }) => {
      const payload = JSON.parse(localStorage.getItem(key) || '{}');
      const items = payload.trackAccessories || [];
      return items.length === 2 && items.some(item => item.id !== 'switch_1' && item.name === 'Right turnout copy');
    }, { key: AUTOSAVE_KEY });

    const payload = await autosavePayload(page);
    const copy = payload.trackAccessories.find(item => item.id !== 'switch_1');
    expect(copy).toBeTruthy();
    expect(copy.kind).toBe('trackSwitchRight');
    expect(copy.name).toBe('Right turnout copy');
    expect(copy.x).toBeCloseTo(318, 0);
    expect(copy.y).toBeCloseTo(238, 0);
    expect(copy.rotationDeg).toBeCloseTo(15, 0);
    expect(copy.trackId).toBeNull();
    expect(copy.trackAnchor).toBeNull();
    expect(copy.locked).toBe(false);
    await expect(page.locator('#trackItemName')).toHaveValue('Right turnout copy');
  });

  test('connected flex track endpoint follows a moved switch endpoint', async ({ page }) => {
    const endpoints = tomixSwitchFixtureEndpoints();
    const project = blankTrackProject({
      selectedTrackAccessoryId: 'switch_1',
      trackAccessories: [
        { id: 'switch_1', kind: 'trackSwitchRight', name: 'Right turnout', x: 300, y: 220, rotationDeg: 0 },
      ],
      tracks: [
        {
          id: 'track_from_switch',
          name: 'Flex from turnout',
          pointsPx: [endpoints.diverging, { x: 430, y: 285 }],
          gaugeMm: 9,
          roadbedWidthMm: 19,
          tieSpacingMm: 4,
          endpointConnections: {
            start: { trackAccessoryId: 'switch_1', kind: 'trackSwitchEndpoint', endpoint: 'diverging' },
          },
        },
      ],
    });

    await seedAutosave(page, project);
    await loadPlanner(page);
    await expect(page.locator('#emptyImageOverlay')).toBeHidden({ timeout: 10000 });
    await clickWorldPoint(page, { x: 300, y: 220 });
    await expect(page.locator('#selectedPanel')).toContainText('Track item selected');
    await expect(page.locator('#trackItemName')).toHaveValue('Right turnout');

    await page.locator('#trackItemX').fill('340');

    const moved = tomixSwitchFixtureEndpoints(340, 220);
    await page.waitForFunction(({ key, expected }) => {
      const payload = JSON.parse(localStorage.getItem(key) || '{}');
      const track = (payload.tracks || []).find(item => item.id === 'track_from_switch');
      if (!track) return false;
      return Math.abs(track.pointsPx?.[0]?.x - expected.x) < 0.75
        && Math.abs(track.pointsPx?.[0]?.y - expected.y) < 0.75;
    }, { key: AUTOSAVE_KEY, expected: moved.diverging });

    const payload = await autosavePayload(page);
    const track = payload.tracks.find(item => item.id === 'track_from_switch');
    expect(track.pointsPx[0].x).toBeCloseTo(moved.diverging.x, 0);
    expect(track.pointsPx[0].y).toBeCloseTo(moved.diverging.y, 0);
  });

  test('straight, curved, S-curve, and joined track fixtures round-trip through load/autosave', async ({ page }) => {
    const project = {
      app: 'HakoMachi Site Planner',
      version: 80,
      portableProject: true,
      savedAt: new Date().toISOString(),
      coordinateSystem: { type: 'imagePixels', origin: 'topLeft', imageWidthPx: 900, imageHeightPx: 600 },
      image: null,
      view: { x: 0, y: 0, scale: 1 },
      site3d: { imageVisible: true, imageOpacity: 0.45 },
      imageOpacity: 0.75,
      imageLocked: true,
      scale: { calibrated: false, pxPerMm: null, calibrationLine: null, units: 'mm' },
      buildings: [],
      roads: [],
      roadFeatures: [],
      stlObjects: [],
      benchworkOutlines: [],
      fabricRegions: [],
      streetlights: [],
      annotations: [],
      tracks: [
        { id: 'track_straight', name: 'Straight fixture', pointsPx: [{ x: 80, y: 120 }, { x: 260, y: 120 }], gaugeMm: 9, roadbedWidthMm: 19, tieSpacingMm: 4 },
        { id: 'track_curve', name: 'Curved fixture', pointsPx: [{ x: 80, y: 220 }, { x: 260, y: 220 }], curvesPx: [{ x: 170, y: 170 }], gaugeMm: 9, roadbedWidthMm: 19, tieSpacingMm: 4 },
        { id: 'track_s_curve', name: 'S-curve fixture', pointsPx: [{ x: 80, y: 340 }, { x: 200, y: 300 }, { x: 320, y: 340 }], curvesPx: [{ x: 140, y: 270 }, { x: 260, y: 370 }], gaugeMm: 9, roadbedWidthMm: 19, tieSpacingMm: 4 },
        { id: 'track_join_a', name: 'Joined A', pointsPx: [{ x: 400, y: 120 }, { x: 520, y: 120 }], endpointConnections: { end: { trackId: 'track_join_b', endpoint: 'start' } }, gaugeMm: 9, roadbedWidthMm: 19, tieSpacingMm: 4 },
        { id: 'track_join_b', name: 'Joined B', pointsPx: [{ x: 520, y: 120 }, { x: 620, y: 190 }], endpointConnections: { start: { trackId: 'track_join_a', endpoint: 'end' } }, gaugeMm: 9, roadbedWidthMm: 19, tieSpacingMm: 4 },
      ],
    };

    await page.addInitScript(({ key, metaKey, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem(metaKey, JSON.stringify({ savedAt: value.savedAt, dirtySinceManualSave: true }));
    }, { key: AUTOSAVE_KEY, metaKey: AUTOSAVE_META_KEY, value: project });

    await loadPlanner(page);
    await page.waitForTimeout(700);
    const payload = await autosavePayload(page);
    const byId = Object.fromEntries(payload.tracks.map(track => [track.id, track]));

    expect(payload.tracks).toHaveLength(5);
    expect(byId.track_straight.pointsPx).toHaveLength(2);
    expect(byId.track_curve.curvesPx.filter(Boolean)).toHaveLength(1);
    expect(byId.track_s_curve.curvesPx.filter(Boolean)).toHaveLength(2);
    expect(byId.track_join_a.endpointConnections.end).toMatchObject({ trackId: 'track_join_b', endpoint: 'start' });
    expect(byId.track_join_b.endpointConnections.start).toMatchObject({ trackId: 'track_join_a', endpoint: 'end' });
    for (const track of payload.tracks) {
      expect(track.gaugeMm).toBe(9);
      expect(track.roadbedWidthMm).toBe(19);
      expect(track.tieSpacingMm).toBe(4);
    }
  });

  test('track moves undo and redo', async ({ page }) => {
    const svgDataUrl = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="#f7f4ec"/></svg>').toString('base64');
    const project = {
      app: 'HakoMachi Site Planner',
      version: 80,
      portableProject: true,
      savedAt: new Date().toISOString(),
      coordinateSystem: { type: 'imagePixels', origin: 'topLeft', imageWidthPx: 900, imageHeightPx: 600 },
      image: {
        mimeType: 'image/svg+xml',
        dataUrl: svgDataUrl,
        naturalWidthPx: 900,
        naturalHeightPx: 600,
        widthPx: 900,
        heightPx: 600,
      },
      view: { x: 0, y: 0, scale: 1 },
      site3d: { imageVisible: true, imageOpacity: 0.45 },
      imageOpacity: 0.75,
      imageLocked: true,
      scale: { calibrated: false, pxPerMm: null, calibrationLine: null, units: 'mm' },
      buildings: [],
      roads: [],
      roadFeatures: [],
      stlObjects: [],
      benchworkOutlines: [],
      fabricRegions: [],
      streetlights: [],
      annotations: [],
      tracks: [
        { id: 'track_undo', name: 'Undo fixture', pointsPx: [{ x: 180, y: 220 }, { x: 420, y: 220 }], curvesPx: [{ x: 300, y: 150 }], gaugeMm: 9, roadbedWidthMm: 19, tieSpacingMm: 4 },
      ],
    };

    await page.addInitScript(({ key, metaKey, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem(metaKey, JSON.stringify({ savedAt: value.savedAt, dirtySinceManualSave: true }));
    }, { key: AUTOSAVE_KEY, metaKey: AUTOSAVE_META_KEY, value: project });

    await loadPlanner(page);
    await expect(page.locator('#emptyImageOverlay')).toBeHidden({ timeout: 10000 });
    await dragWorldPoint(page, { x: 300, y: 185 }, { x: 360, y: 215 });
    await waitForTrackGeometry(page, 'track_undo', {
      point0: { x: 240, y: 250 },
      point1: { x: 480, y: 250 },
      curve0: { x: 360, y: 180 },
    });

    await page.keyboard.press('Control+Z');
    await waitForTrackGeometry(page, 'track_undo', {
      point0: { x: 180, y: 220 },
      point1: { x: 420, y: 220 },
      curve0: { x: 300, y: 150 },
    });

    await page.keyboard.press('Control+Y');
    await waitForTrackGeometry(page, 'track_undo', {
      point0: { x: 240, y: 250 },
      point1: { x: 480, y: 250 },
      curve0: { x: 360, y: 180 },
    });
    await expect(page.locator('#selectedPanel')).toContainText('Track selected');
  });

  test('selected flex track endpoint deletion truncates the spline', async ({ page }) => {
    const project = blankTrackProject({
      selectedTrackId: 'track_trim',
      selectedTrackPointIndex: null,
      tracks: [
        {
          id: 'track_trim',
          name: 'Trimmable track',
          pointsPx: [{ x: 160, y: 220 }, { x: 260, y: 220 }, { x: 360, y: 260 }],
          curvesPx: [null, null],
          gaugeMm: 9,
          roadbedWidthMm: 19,
          tieSpacingMm: 4,
        },
      ],
    });

    await seedAutosave(page, project);
    await loadPlanner(page);
    await expect(page.locator('#emptyImageOverlay')).toBeHidden({ timeout: 10000 });

    await clickWorldPoint(page, { x: 260, y: 220 });
    await expect(page.locator('#selectedPanel')).toContainText('Track selected');
    await clickWorldPoint(page, { x: 160, y: 220 });
    await expect(page.locator('#selectedPanel')).toContainText('Point 1 of 3 selected');
    await page.keyboard.press('Delete');

    await page.waitForFunction(({ key }) => {
      const payload = JSON.parse(localStorage.getItem(key) || '{}');
      const track = (payload.tracks || []).find(item => item.id === 'track_trim');
      return track?.pointsPx?.length === 2
        && Math.abs(track.pointsPx[0].x - 260) < 0.75
        && Math.abs(track.pointsPx[0].y - 220) < 0.75;
    }, { key: AUTOSAVE_KEY });
  });

  test('selected flex track middle point deletion splits the spline', async ({ page }) => {
    const project = blankTrackProject({
      selectedTrackId: 'track_split',
      selectedTrackPointIndex: null,
      tracks: [
        {
          id: 'track_split',
          name: 'Splittable track',
          pointsPx: [{ x: 160, y: 220 }, { x: 260, y: 220 }, { x: 360, y: 260 }, { x: 460, y: 260 }],
          curvesPx: [null, null, null],
          gaugeMm: 9,
          roadbedWidthMm: 19,
          tieSpacingMm: 4,
        },
      ],
    });

    await seedAutosave(page, project);
    await loadPlanner(page);
    await expect(page.locator('#emptyImageOverlay')).toBeHidden({ timeout: 10000 });

    await clickWorldPoint(page, { x: 360, y: 260 });
    await expect(page.locator('#selectedPanel')).toContainText('Track selected');
    await clickWorldPoint(page, { x: 260, y: 220 });
    await expect(page.locator('#selectedPanel')).toContainText('Point 2 of 4 selected');
    await page.keyboard.press('Delete');

    await page.waitForFunction(({ key }) => {
      const payload = JSON.parse(localStorage.getItem(key) || '{}');
      const tracks = payload.tracks || [];
      const first = tracks.find(item => item.id === 'track_split');
      const second = tracks.find(item => item.id !== 'track_split' && item.name === 'Splittable track split');
      return tracks.length === 2
        && first?.pointsPx?.length === 2
        && second?.pointsPx?.length === 3
        && Math.abs(first.pointsPx[1].x - 260) < 0.75
        && Math.abs(second.pointsPx[0].x - 260) < 0.75;
    }, { key: AUTOSAVE_KEY });
  });

  test('joined endpoint follows connected track move through undo and redo', async ({ page }) => {
    const svgDataUrl = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="#f7f4ec"/></svg>').toString('base64');
    const project = {
      app: 'HakoMachi Site Planner',
      version: 80,
      portableProject: true,
      savedAt: new Date().toISOString(),
      coordinateSystem: { type: 'imagePixels', origin: 'topLeft', imageWidthPx: 900, imageHeightPx: 600 },
      image: { mimeType: 'image/svg+xml', dataUrl: svgDataUrl, naturalWidthPx: 900, naturalHeightPx: 600, widthPx: 900, heightPx: 600 },
      view: { x: 0, y: 0, scale: 1 },
      site3d: { imageVisible: true, imageOpacity: 0.45 },
      imageOpacity: 0.75,
      imageLocked: true,
      scale: { calibrated: false, pxPerMm: null, calibrationLine: null, units: 'mm' },
      buildings: [],
      roads: [],
      roadFeatures: [],
      stlObjects: [],
      benchworkOutlines: [],
      fabricRegions: [],
      streetlights: [],
      annotations: [],
      tracks: [
        { id: 'track_join_a', name: 'Joined A', pointsPx: [{ x: 180, y: 220 }, { x: 300, y: 220 }], endpointConnections: { end: { trackId: 'track_join_b', kind: 'endpointStart', pointIndex: 0 } }, gaugeMm: 9, roadbedWidthMm: 19, tieSpacingMm: 4 },
        { id: 'track_join_b', name: 'Joined B', pointsPx: [{ x: 300, y: 220 }, { x: 420, y: 260 }], endpointConnections: { start: { trackId: 'track_join_a', kind: 'endpointEnd', pointIndex: 1 } }, gaugeMm: 9, roadbedWidthMm: 19, tieSpacingMm: 4 },
      ],
    };

    await page.addInitScript(({ key, metaKey, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
      localStorage.setItem(metaKey, JSON.stringify({ savedAt: value.savedAt, dirtySinceManualSave: true }));
    }, { key: AUTOSAVE_KEY, metaKey: AUTOSAVE_META_KEY, value: project });

    await loadPlanner(page);
    await expect(page.locator('#emptyImageOverlay')).toBeHidden({ timeout: 10000 });

    await dragWorldPoint(page, { x: 240, y: 220 }, { x: 270, y: 240 });
    await waitForTracksGeometry(page, {
      track_join_a: { point0: { x: 210, y: 240 }, point1: { x: 330, y: 240 } },
      track_join_b: { point0: { x: 330, y: 240 }, point1: { x: 420, y: 260 } },
    });

    await page.keyboard.press('Control+Z');
    await waitForTracksGeometry(page, {
      track_join_a: { point0: { x: 180, y: 220 }, point1: { x: 300, y: 220 } },
      track_join_b: { point0: { x: 300, y: 220 }, point1: { x: 420, y: 260 } },
    });

    await page.keyboard.press('Control+Y');
    await waitForTracksGeometry(page, {
      track_join_a: { point0: { x: 210, y: 240 }, point1: { x: 330, y: 240 } },
      track_join_b: { point0: { x: 330, y: 240 }, point1: { x: 420, y: 260 } },
    });
  });
});
