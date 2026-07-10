const { expect, test } = require('@playwright/test');

const AUTOSAVE_KEY = 'hakomachiSitePlannerAutosave_v1';
const AUTOSAVE_META_KEY = 'hakomachiSitePlannerAutosaveMeta_v1';

function blankProject(overrides = {}) {
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

async function loadProject(page, project) {
  await page.goto('/site-planner.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ key, metaKey, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
    localStorage.setItem(metaKey, JSON.stringify({ savedAt: value.savedAt, dirtySinceManualSave: true }));
  }, { key: AUTOSAVE_KEY, metaKey: AUTOSAVE_META_KEY, value: project });
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#canvas').waitFor({ state: 'visible' });
  await expect(page.locator('#emptyImageOverlay')).toBeHidden({ timeout: 10000 });
}

async function copyPasteSelected(page, collectionName) {
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+C' : 'Control+C');
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+V' : 'Control+V');
  await page.waitForFunction(({ key, collectionName }) => {
    const payload = JSON.parse(localStorage.getItem(key) || '{}');
    return (payload[collectionName] || []).length === 2;
  }, { key: AUTOSAVE_KEY, collectionName });
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)), AUTOSAVE_KEY);
}

async function clickWorldPoint(page, point, options = {}) {
  const box = await page.locator('#canvas').boundingBox();
  expect(box).not.toBeNull();
  const view = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).view || { x: 0, y: 0, scale: 1 }, AUTOSAVE_KEY);
  const scale = Number(view.scale) || 1;
  await page.locator('#canvas').click({
    position: {
      x: (Number(view.x) || 0) + point.x * scale,
      y: (Number(view.y) || 0) + point.y * scale,
    },
    ...options,
  });
}

async function dragWorldPoint(page, from, to, steps = 8) {
  const box = await page.locator('#canvas').boundingBox();
  expect(box).not.toBeNull();
  const view = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).view || { x: 0, y: 0, scale: 1 }, AUTOSAVE_KEY);
  const scale = Number(view.scale) || 1;
  const sx = point => box.x + (Number(view.x) || 0) + point.x * scale;
  const sy = point => box.y + (Number(view.y) || 0) + point.y * scale;
  await page.mouse.move(sx(from), sy(from));
  await page.mouse.down();
  await page.mouse.move(sx(to), sy(to), { steps });
  await page.mouse.up();
}

test.describe('Site Planner object clipboard', () => {
  test('canvas surface cancels native browser selection and drag selection', async ({ page }) => {
    await loadProject(page, blankProject());

    const styles = await page.locator('.canvasWrap').evaluate(wrap => {
      const canvas = wrap.querySelector('#canvas');
      const wrapStyle = getComputedStyle(wrap);
      const canvasStyle = getComputedStyle(canvas);
      return {
        wrapUserSelect: wrapStyle.userSelect,
        canvasUserSelect: canvasStyle.userSelect,
        canvasDraggable: canvas.getAttribute('draggable'),
      };
    });
    expect(styles.wrapUserSelect).toBe('none');
    expect(styles.canvasUserSelect).toBe('none');
    expect(styles.canvasDraggable).toBe('false');

    const eventResults = await page.evaluate(() => {
      const canvas = document.getElementById('canvas');
      const selectEvent = new Event('selectstart', { bubbles: true, cancelable: true });
      const dragEvent = new Event('dragstart', { bubbles: true, cancelable: true });
      return {
        selectCanceled: !canvas.dispatchEvent(selectEvent),
        dragCanceled: !canvas.dispatchEvent(dragEvent),
      };
    });
    expect(eventResults.selectCanceled).toBe(true);
    expect(eventResults.dragCanceled).toBe(true);
  });

  test('generated rail crossings are selectable and expose rail arc controls', async ({ page }) => {
    await loadProject(page, blankProject({
      scale: { calibrated: true, pxPerMm: 2, calibrationLine: null, units: 'mm' },
      roads: [
        { id: 'road_1', name: 'Crossing road', mode: 'centerline', pointsPx: [{ x: 40, y: 140 }, { x: 260, y: 140 }], curvesPx: [], widthPx: 48, widthMm: 24 },
      ],
      tracks: [
        { id: 'track_1', name: 'Main track', pointsPx: [{ x: 140, y: 40 }, { x: 140, y: 240 }], gaugeMm: 9, gaugePx: 18, railWidthPx: 1.6, tieSpacingPx: 8 },
      ],
    }));

    await clickWorldPoint(page, { x: 140, y: 140 });
    await expect(page.locator('#selectedPanel')).toContainText('Rail crossing selected');
    await expect(page.locator('#selectedPanel')).toContainText('6.7');
    await page.locator('#railCrossingArc').fill('2.5');

    await page.waitForFunction(key => {
      const payload = JSON.parse(localStorage.getItem(key) || '{}');
      return Object.values(payload.railCrossingOverrides || {}).some(value => Math.abs((Number(value.railArcOffsetMm) || 0) - 2.5) < 0.01);
    }, AUTOSAVE_KEY);
  });

  test('track item object browser filters by sub-object type', async ({ page }) => {
    await loadProject(page, blankProject({
      trackAccessories: [
        { id: 'sensor_1', kind: 'sensor', name: 'Sensor A', x: 120, y: 120 },
        { id: 'signal_1', kind: 'signal', name: 'Signal A', x: 160, y: 120 },
        { id: 'occ_1', kind: 'occupancyLight', name: 'Occupancy Lights A', x: 200, y: 120 },
        { id: 'cat_1', kind: 'catenarySingleSide', name: 'Catenary Pole A', x: 240, y: 120, trackId: 'track_1' },
        { id: 'cat_2', kind: 'catenaryDoublePortal', name: 'Catenary Portal A', x: 280, y: 120, trackId: 'track_1' },
        { id: 'switch_1', kind: 'trackSwitchRight', name: 'Switch A', x: 320, y: 120 },
      ],
    }));

    await page.getByRole('button', { name: /Track Items/ }).click();
    await expect(page.locator('#objectBrowserTitle')).toHaveText('Track Items');
    await expect(page.locator('.objectBrowserToolbarRight')).toContainText('6 items');
    await expect(page.locator('#objectBrowser')).toContainText('Sensor A');
    await expect(page.locator('#objectBrowser')).toContainText('Catenary Pole A');

    await page.click('#trackItemFilterBtn');
    await page.click('[data-track-item-filter="catenary"]');
    await expect(page.locator('.objectBrowserToolbarRight')).toContainText('2 of 6 items');
    await expect(page.locator('#trackItemFilterBtn')).toHaveClass(/active/);
    await expect(page.locator('#objectBrowser')).toContainText('Catenary Pole A');
    await expect(page.locator('#objectBrowser')).toContainText('Catenary Portal A');
    await expect(page.locator('#objectBrowser')).not.toContainText('Sensor A');
    await page.getByText('Catenary Pole A').click();
    await expect(page.locator('#selectedPanel')).toContainText('Track item selected');
    await expect(page.locator('#trackItemKind')).toHaveValue('catenarySingleSide');

    await page.click('#sidebarBackBtn');
    await expect(page.locator('#objectBrowserTitle')).toHaveText('Track Items');
    await expect(page.locator('#objectBrowser')).toContainText('Catenary Pole A');
    await expect(page.locator('#objectBrowser')).not.toContainText('Sensor A');

    await page.click('#trackItemFilterBtn');
    await page.click('[data-track-item-filter="sensors"]');
    await expect(page.locator('.objectBrowserToolbarRight')).toContainText('1 of 6 items');
    await expect(page.locator('#objectBrowser')).toContainText('Sensor A');
    await expect(page.locator('#objectBrowser')).not.toContainText('Catenary Pole A');
  });

  test('shift-selected canvas objects move together as a group', async ({ page }) => {
    await loadProject(page, blankProject({
      buildings: [
        { id: 'building_1', name: 'Shop', padType: 'rect', x: 320, y: 220, widthPx: 60, depthPx: 40, color: '#d79631' },
      ],
      trackAccessories: [
        { id: 'sensor_1', kind: 'sensor', name: 'Sensor A', x: 120, y: 140 },
        { id: 'signal_1', kind: 'signal', name: 'Signal A', x: 200, y: 140 },
      ],
    }));

    await clickWorldPoint(page, { x: 120, y: 140 }, { modifiers: ['Shift'] });
    await clickWorldPoint(page, { x: 200, y: 140 }, { modifiers: ['Shift'] });
    await clickWorldPoint(page, { x: 320, y: 220 }, { modifiers: ['Shift'] });
    await dragWorldPoint(page, { x: 120, y: 140 }, { x: 150, y: 170 });

    await page.waitForFunction(key => {
      const payload = JSON.parse(localStorage.getItem(key) || '{}');
      const sensor = (payload.trackAccessories || []).find(item => item.id === 'sensor_1');
      const signal = (payload.trackAccessories || []).find(item => item.id === 'signal_1');
      const building = (payload.buildings || []).find(item => item.id === 'building_1');
      return Math.abs((sensor?.x || 0) - 150) < 0.5
        && Math.abs((sensor?.y || 0) - 170) < 0.5
        && Math.abs((signal?.x || 0) - 230) < 0.5
        && Math.abs((signal?.y || 0) - 170) < 0.5
        && Math.abs((building?.x || 0) - 350) < 0.5
        && Math.abs((building?.y || 0) - 250) < 0.5;
    }, AUTOSAVE_KEY);
  });

  test('selected placed objects copy and paste as fresh offset objects', async ({ page }) => {
    test.setTimeout(90000);
    const cases = [
      {
        collection: 'roadFeatures',
        project: blankProject({
          selectedRoadFeatureId: 'rf_1',
          roadFeatures: [{ id: 'rf_1', kind: 'marking', name: 'Stop bar', x: 100, y: 120, rotationDeg: 12, roadId: 'road_1' }],
        }),
        click: { x: 100, y: 120 },
        assertCopy(copy) {
          expect(copy.name).toBe('Stop bar copy');
          expect(copy.x).toBeCloseTo(118, 0);
          expect(copy.y).toBeCloseTo(138, 0);
          expect(copy.roadId).toBeNull();
        },
      },
      {
        collection: 'roads',
        project: blankProject({
          selectedRoadId: 'road_1',
          roads: [{ id: 'road_1', name: 'Main road', mode: 'centerline', pointsPx: [{ x: 100, y: 200 }, { x: 220, y: 200 }], curvesPx: [{ x: 160, y: 180 }], endpointConnections: { start: { roadId: 'other' } } }],
        }),
        click: { x: 150, y: 200 },
        assertCopy(copy) {
          expect(copy.name).toBe('Main road copy');
          expect(copy.pointsPx[0]).toMatchObject({ x: 118, y: 218 });
          expect(copy.curvesPx[0]).toMatchObject({ x: 178, y: 198 });
          expect(copy.endpointConnections).toEqual({});
        },
      },
      {
        collection: 'tracks',
        project: blankProject({
          selectedTrackId: 'track_1',
          tracks: [{ id: 'track_1', name: 'Track A', pointsPx: [{ x: 100, y: 260 }, { x: 220, y: 280 }], curvesPx: [{ x: 160, y: 250 }], endpointConnections: { end: { trackId: 'other' } } }],
        }),
        click: { x: 150, y: 260 },
        assertCopy(copy) {
          expect(copy.name).toBe('Track A copy');
          expect(copy.pointsPx[0]).toMatchObject({ x: 118, y: 278 });
          expect(copy.curvesPx[0]).toMatchObject({ x: 178, y: 268 });
          expect(copy.endpointConnections).toEqual({});
        },
      },
      {
        collection: 'trackAccessories',
        project: blankProject({
          selectedTrackAccessoryId: 'switch_1',
          trackAccessories: [{ id: 'switch_1', kind: 'trackSwitchRight', name: 'Switch', x: 300, y: 220, rotationDeg: 15, trackId: 'track_1', trackAnchor: { trackId: 'track_1' } }],
        }),
        click: { x: 300, y: 220 },
        assertCopy(copy) {
          expect(copy.name).toBe('Switch copy');
          expect(copy.x).toBeCloseTo(318, 0);
          expect(copy.y).toBeCloseTo(238, 0);
          expect(copy.trackId).toBeNull();
          expect(copy.trackAnchor).toBeNull();
        },
      },
      {
        collection: 'benchworkOutlines',
        project: blankProject({
          selectedBenchworkId: 'bench_1',
          benchworkOutlines: [{ id: 'bench_1', name: 'Bench', pointsPx: [{ x: 80, y: 80 }, { x: 180, y: 80 }, { x: 180, y: 160 }], curvesPx: [null, { x: 190, y: 120 }, null] }],
        }),
        click: { x: 150, y: 100 },
        assertCopy(copy) {
          expect(copy.name).toBe('Bench copy');
          expect(copy.pointsPx[0]).toMatchObject({ x: 98, y: 98 });
          expect(copy.curvesPx[1]).toMatchObject({ x: 208, y: 138 });
        },
      },
      {
        collection: 'fabricRegions',
        project: blankProject({
          selectedFabricId: 'fabric_1',
          fabricRegions: [{ id: 'fabric_1', name: 'Fabric block', polygon: [{ x: 240, y: 80 }, { x: 320, y: 80 }, { x: 320, y: 140 }], generatedPadIds: ['bldg_1'] }],
        }),
        click: { x: 300, y: 100 },
        assertCopy(copy) {
          expect(copy.name).toBe('Fabric block copy');
          expect(copy.polygon[0]).toMatchObject({ x: 258, y: 98 });
          expect(copy.generatedPadIds).toEqual([]);
        },
      },
      {
        collection: 'streetlights',
        project: blankProject({
          selectedStreetlightId: 'light_1',
          streetlights: [{ id: 'light_1', name: 'Streetlight', x: 400, y: 160, mode: 'anchored', anchor: { targetRoadId: 'road_1', lockToRoadEdge: true } }],
        }),
        click: { x: 400, y: 160 },
        assertCopy(copy) {
          expect(copy.name).toBe('Streetlight copy');
          expect(copy.x).toBeCloseTo(418, 0);
          expect(copy.y).toBeCloseTo(178, 0);
          expect(copy.anchor.targetRoadId).toBeNull();
          expect(copy.anchor.lockToRoadEdge).toBe(false);
        },
      },
      {
        collection: 'stlObjects',
        project: blankProject({
          selectedStlObjectId: 'stl_1',
          stlObjects: [{ id: 'stl_1', name: 'Utility pole', x: 500, y: 160, widthMm: 10, depthMm: 10, heightMm: 30, asset: { fileName: 'pole.stl', dataBase64: 'AA==' } }],
        }),
        click: { x: 500, y: 160 },
        assertCopy(copy) {
          expect(copy.name).toBe('Utility pole copy');
          expect(copy.x).toBeCloseTo(518, 0);
          expect(copy.y).toBeCloseTo(178, 0);
          expect(copy.asset.fileName).toBe('pole.stl');
        },
      },
      {
        collection: 'annotations',
        project: blankProject({
          selectedAnnotationId: 'note_1',
          annotations: [{ id: 'note_1', points: [{ x: 600, y: 100, pressure: 0.5 }, { x: 630, y: 120, pressure: 0.6 }], color: '#6f4326', baseWidth: 2.2 }],
        }),
        click: { x: 615, y: 110 },
        assertCopy(copy) {
          expect(copy.points[0]).toMatchObject({ x: 618, y: 118, pressure: 0.5 });
          expect(copy.points[1]).toMatchObject({ x: 648, y: 138, pressure: 0.6 });
        },
      },
    ];

    for (const item of cases) {
      await test.step(item.collection, async () => {
        await loadProject(page, item.project);
        await clickWorldPoint(page, item.click);
        const payload = await copyPasteSelected(page, item.collection);
        const copy = payload[item.collection].find(entry => !String(entry.id).endsWith('_1'));
        expect(copy).toBeTruthy();
        expect(copy.id).not.toBe(item.project[item.collection][0].id);
        expect(copy.hidden).toBe(false);
        expect(copy.locked).toBe(false);
        item.assertCopy(copy);
      });
    }
  });
});
