const { expect, test } = require('@playwright/test');

const AUTOSAVE_KEY = 'hakomachiSitePlannerAutosave_v1';

async function importBlankPlan(page) {
  await page.setInputFiles('#imageFile', {
    name: 'blank-plan.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#f8f6f1"/></svg>'),
  });
  await expect(page.locator('#emptyImageOverlay')).toBeHidden();
}

async function canvasClick(page, relX, relY) {
  const box = await page.locator('#canvas').boundingBox();
  await page.mouse.click(box.x + relX, box.y + relY);
}

async function autosavePayload(page) {
  await page.waitForFunction(key => !!localStorage.getItem(key), AUTOSAVE_KEY);
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)), AUTOSAVE_KEY);
}

test.describe('site planner track editing workspace', () => {
  test('keeps input and Pencil settings in the top settings menu', async ({ page }) => {
    await page.goto('/site-planner.html', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#ipadInputSection')).toHaveCount(0);

    await page.click('#settingsBtn');
    await expect(page.locator('#inputSettingsSection')).toBeVisible();
    await expect(page.locator('#inputMode')).toBeVisible();
    await expect(page.locator('#snapBtn')).toBeVisible();
    await expect(page.locator('#deleteAnnotationBtn')).toBeVisible();
    await expect(page.locator('#clearAnnotationsBtn')).toBeVisible();

    await page.selectOption('#inputMode', 'mouseTrackpad');
    await expect(page.locator('#inputMode')).toHaveValue('mouseTrackpad');

    await page.click('#snapBtn');
    await expect(page.locator('#snapBtn')).toHaveText('Snap: On');
    await expect(page.locator('#snapBtn')).toHaveClass(/active/);
  });

  test('switches the left rail to track-specific tools', async ({ page }) => {
    await page.goto('/site-planner.html', { waitUntil: 'domcontentloaded' });

    await expect(page.locator('#workspaceMode')).toHaveValue('layout');
    await expect(page.locator('[data-tool="rect"]')).toBeVisible();
    await expect(page.locator('#trackDrawModeBtn')).toBeHidden();

    await page.selectOption('#workspaceMode', 'track');

    await expect(page.locator('.sitePlannerApp')).toHaveClass(/trackWorkspace/);
    await expect(page.locator('[data-tool="rect"]')).toBeHidden();
    await expect(page.locator('#roadCenterlineModeBtn')).toBeHidden();
    await expect(page.locator('#trackDrawModeBtn')).toBeVisible();
    await expect(page.locator('#trackEditModeBtn')).toBeVisible();
    await expect(page.locator('#trackConnectModeBtn')).toBeVisible();
    await expect(page.locator('#trackSensorModeBtn')).toBeVisible();
    await expect(page.locator('#trackSignalModeBtn')).toBeVisible();
    await expect(page.locator('#trackCrossingArmModeBtn')).toBeVisible();
    await expect(page.locator('#trackIntrusionDetectorModeBtn')).toBeVisible();
    await expect(page.locator('#trackOccupancyLightModeBtn')).toBeVisible();
    await expect(page.locator('#trackSwitchToolBtn')).toBeVisible();
    await expect(page.locator('#trackBufferToolBtn')).toBeVisible();
    await expect(page.locator('#catenaryToolBtn')).toBeVisible();

    await page.click('#trackDrawModeBtn');
    await expect(page.locator('#trackDrawModeBtn')).toHaveClass(/active/);
    await expect(page.locator('#statusTool')).toContainText('Draw track');

    await page.click('#trackSensorModeBtn');
    await expect(page.locator('#trackSensorModeBtn')).toHaveClass(/active/);
    await expect(page.locator('#statusTool')).toContainText('Under-track sensor');

    await page.click('#trackIntrusionDetectorModeBtn');
    await expect(page.locator('#trackIntrusionDetectorModeBtn')).toHaveClass(/active/);
    await expect(page.locator('#statusTool')).toContainText('Intrusion detector');

    await page.click('#trackOccupancyLightModeBtn');
    await expect(page.locator('#trackOccupancyLightModeBtn')).toHaveClass(/active/);
    await expect(page.locator('#statusTool')).toContainText('Blinking occupancy lights');

    await page.click('#trackSwitchVariantBtn');
    await expect(page.locator('#trackSwitchToolMenu')).toHaveClass(/open/);
    await page.click('#trackSwitchToolMenu [data-track-switch-kind="trackSwitchRight"]');
    await expect(page.locator('#trackSwitchToolBtn')).toHaveClass(/active/);
    await expect(page.locator('#trackSwitchToolLabel')).toHaveText('Right Switch');
    await expect(page.locator('#statusTool')).toContainText('Right-hand track switch');

    await page.click('#trackBufferVariantBtn');
    await expect(page.locator('#trackBufferToolMenu')).toHaveClass(/open/);
    await page.click('#trackBufferToolMenu [data-track-buffer-kind="trackBufferTomix1428Catenary"]');
    await expect(page.locator('#trackBufferToolBtn')).toHaveClass(/active/);
    await expect(page.locator('#trackBufferToolLabel')).toHaveText('Buffer + Terminal');
    await expect(page.locator('#statusTool')).toContainText('Tomix 1428 catenary terminal buffer');

    await page.click('#catenaryVariantBtn');
    await expect(page.locator('#catenaryToolMenu')).toHaveClass(/open/);
    await page.click('#catenaryToolMenu [data-catenary-kind="catenaryDoublePortal"]');
    await expect(page.locator('#catenaryToolBtn')).toHaveClass(/active/);
    await expect(page.locator('#catenaryToolLabel')).toHaveText('Catenary Portal');
    await expect(page.locator('#statusTool')).toContainText('Double-track catenary portal');

    await page.click('#catenaryVariantBtn');
    await page.click('#catenaryToolMenu [data-catenary-kind="catenaryAutoSection"]');
    await expect(page.locator('#catenaryToolBtn')).toHaveClass(/active/);
    await expect(page.locator('#catenaryToolLabel')).toHaveText('Auto Catenary');
    await expect(page.locator('#statusTool')).toContainText('Auto catenary section');
  });

  test('shows toolbar tooltips for hover and touch-style presses', async ({ page }) => {
    await page.goto('/site-planner.html', { waitUntil: 'domcontentloaded' });

    await page.selectOption('#workspaceMode', 'track');

    await page.locator('#trackSignalModeBtn').hover();
    await expect(page.locator('#toolTooltip')).toHaveText('Signal location');
    await expect(page.locator('#toolTooltip')).toHaveClass(/visible/);

    await page.dispatchEvent('#trackOccupancyLightModeBtn', 'pointerdown', {
      bubbles: true,
      pointerType: 'touch',
      pointerId: 21,
      isPrimary: true,
    });
    await expect(page.locator('#toolTooltip')).toHaveText('Blinking occupancy lights');
    await expect(page.locator('#toolTooltip')).toHaveClass(/visible/);
  });

  test('places an under-track sensor marker from track mode', async ({ page }) => {
    await page.goto('/site-planner.html', { waitUntil: 'domcontentloaded' });
    await importBlankPlan(page);

    await page.selectOption('#workspaceMode', 'track');
    await page.click('#trackDrawModeBtn');
    await canvasClick(page, 120, 140);
    await canvasClick(page, 260, 140);
    await page.keyboard.press('Enter');

    const sidebarToggle = page.locator('#sidebarToggle[aria-expanded="true"]');
    if (await sidebarToggle.count()) await sidebarToggle.click();
    await page.locator('#trackSensorModeBtn').click({ force: true });
    await expect(page.locator('#statusTool')).toContainText('Under-track sensor');
    await canvasClick(page, 190, 140);

    await expect(page.locator('#selectedPanel')).toContainText('Track item selected');
    await expect(page.locator('#selectedPanel')).toContainText('Under-track Sensor');
    await expect(page.locator('#objectBrowser')).toContainText('Track Items');
  });

  test('places and rotates a right-hand track switch marker', async ({ page }) => {
    await page.goto('/site-planner.html', { waitUntil: 'domcontentloaded' });
    await importBlankPlan(page);

    await page.selectOption('#workspaceMode', 'track');
    await page.click('#trackDrawModeBtn');
    await canvasClick(page, 120, 140);
    await canvasClick(page, 260, 140);
    await page.keyboard.press('Enter');

    const sidebarToggle = page.locator('#sidebarToggle[aria-expanded="true"]');
    if (await sidebarToggle.count() && await sidebarToggle.isVisible()) await sidebarToggle.click();
    await page.click('#trackSwitchVariantBtn');
    await page.click('#trackSwitchToolMenu [data-track-switch-kind="trackSwitchRight"]');
    await expect(page.locator('#statusTool')).toContainText('Right-hand track switch');
    await canvasClick(page, 190, 140);

    await expect(page.locator('#selectedPanel')).toContainText('Track item selected');
    await expect(page.locator('#selectedPanel')).toContainText('Right-hand Track Switch');
    await expect(page.locator('#trackItemKind')).toHaveValue('trackSwitchRight');
    await expect(page.locator('#trackItemNotes')).toHaveValue(/Tomix PR541-15/);
    const initialRotation = Number(await page.locator('#trackItemRot').inputValue());

    const box = await page.locator('#canvas').boundingBox();
    await page.mouse.move(box.x + 190, box.y + 106);
    await page.mouse.down();
    await page.mouse.move(box.x + 224, box.y + 140, { steps: 6 });
    await page.mouse.up();

    const rotated = Number(await page.locator('#trackItemRot').inputValue());
    expect(Math.abs(rotated - initialRotation)).toBeGreaterThan(20);
    await expect(page.locator('#objectBrowser')).toContainText('Track Items');

    await page.locator('#trackItemRot').fill('12');
    await page.locator('#trackItemRot').focus();
    await page.locator('#trackItemRot').evaluate(input => {
      input.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, shiftKey: true }));
      input.stepUp();
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await expect(page.locator('#trackItemRot')).toHaveValue('20');

    await page.click('#view3dCanvasBtn');
    await expect(page.locator('.canvasWrap')).toHaveClass(/view3d/);
    const site3dCanvas = page.locator('#site3dView canvas');
    await expect(site3dCanvas).toBeVisible();
    await page.waitForTimeout(250);
    const previewScreenshot = await site3dCanvas.screenshot();
    expect(previewScreenshot.length).toBeGreaterThan(1000);
    const hasRenderedPixels = await site3dCanvas.evaluate(canvas => {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl || gl.drawingBufferWidth < 2 || gl.drawingBufferHeight < 2) return false;
      const width = Math.min(80, gl.drawingBufferWidth);
      const height = Math.min(80, gl.drawingBufferHeight);
      const x = Math.max(0, Math.floor((gl.drawingBufferWidth - width) / 2));
      const y = Math.max(0, Math.floor((gl.drawingBufferHeight - height) / 2));
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] && (pixels[i] !== 236 || pixels[i + 1] !== 236 || pixels[i + 2] !== 230)) return true;
      }
      return false;
    });
    expect(hasRenderedPixels).toBe(true);
  });

  test('places a Tomix 1428 buffer stop with catenary terminal at a track endpoint', async ({ page }) => {
    await page.goto('/site-planner.html', { waitUntil: 'domcontentloaded' });
    await importBlankPlan(page);

    await page.selectOption('#workspaceMode', 'track');
    await page.click('#trackDrawModeBtn');
    await canvasClick(page, 120, 140);
    await canvasClick(page, 260, 140);
    await page.keyboard.press('Enter');

    const sidebarToggle = page.locator('#sidebarToggle[aria-expanded="true"]');
    if (await sidebarToggle.count() && await sidebarToggle.isVisible()) await sidebarToggle.click();
    await page.click('#trackBufferVariantBtn');
    await page.click('#trackBufferToolMenu [data-track-buffer-kind="trackBufferTomix1428Catenary"]');
    await expect(page.locator('#statusTool')).toContainText('Tomix 1428 catenary terminal buffer');
    await canvasClick(page, 260, 140);

    await expect(page.locator('#selectedPanel')).toContainText('Track item selected');
    await expect(page.locator('#selectedPanel')).toContainText('Tomix 1428 Buffer');
    await expect(page.locator('#trackItemKind')).toHaveValue('trackBufferTomix1428Catenary');
    await expect(page.locator('#trackItemCatenaryTerminal')).toBeChecked();
    const rotation = Number(await page.locator('#trackItemRot').inputValue());
    expect(rotation).toBeCloseTo(0, 0);
    await page.waitForFunction(key => {
      const payload = JSON.parse(localStorage.getItem(key) || '{}');
      return (payload.trackAccessories || []).some(item => item.kind === 'trackBufferTomix1428Catenary');
    }, AUTOSAVE_KEY);
    const payload = await autosavePayload(page);
    const buffer = payload.trackAccessories.find(item => item.kind === 'trackBufferTomix1428' || item.kind === 'trackBufferTomix1428Catenary');
    const track = payload.tracks[0];
    const endpoint = track.pointsPx[track.pointsPx.length - 1];
    expect(buffer.trackAnchor).toMatchObject({ endpointKey: 'end' });
    expect(buffer.x).toBeCloseTo(endpoint.x, 1);
    expect(buffer.y).toBeCloseTo(endpoint.y, 1);

    await page.click('#view3dCanvasBtn');
    await expect(page.locator('.canvasWrap')).toHaveClass(/view3d/);
    const site3dCanvas = page.locator('#site3dView canvas');
    await expect(site3dCanvas).toBeVisible();
    await page.waitForTimeout(250);
    const previewScreenshot = await site3dCanvas.screenshot();
    expect(previewScreenshot.length).toBeGreaterThan(1000);
    const hasRenderedPixels = await site3dCanvas.evaluate(canvas => {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl || gl.drawingBufferWidth < 2 || gl.drawingBufferHeight < 2) return false;
      const width = Math.min(80, gl.drawingBufferWidth);
      const height = Math.min(80, gl.drawingBufferHeight);
      const x = Math.max(0, Math.floor((gl.drawingBufferWidth - width) / 2));
      const y = Math.max(0, Math.floor((gl.drawingBufferHeight - height) / 2));
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] && (pixels[i] !== 236 || pixels[i + 1] !== 236 || pixels[i + 2] !== 230)) return true;
      }
      return false;
    });
    expect(hasRenderedPixels).toBe(true);

    await page.click('#view2dCanvasBtn');
    await page.click('#trackItemCatenaryTerminal');
    await expect(page.locator('#trackItemCatenaryTerminal')).not.toBeChecked();
  });

  test('places a double-track catenary portal and shows it in the 3D preview', async ({ page }) => {
    await page.goto('/site-planner.html', { waitUntil: 'domcontentloaded' });
    await importBlankPlan(page);

    await page.selectOption('#workspaceMode', 'track');
    await page.click('#trackDrawModeBtn');
    await canvasClick(page, 130, 180);
    await canvasClick(page, 300, 260);
    await canvasClick(page, 300, 260);

    await page.click('#catenaryVariantBtn');
    await page.click('#catenaryToolMenu [data-catenary-kind="catenaryDoublePortal"]');
    await expect(page.locator('#statusTool')).toContainText('Double-track catenary portal');
    await canvasClick(page, 215, 220);

    await expect(page.locator('#selectedPanel')).toContainText('Track item selected');
    await expect(page.locator('#selectedPanel')).toContainText('Double-track Catenary Portal');
    await expect(page.locator('#trackItemAutoOrient')).toBeChecked();
    await expect(page.locator('#objectBrowser')).toContainText('Track Items');
    const rotationDeg = Number(await page.locator('#trackItemRot').inputValue());
    expect(rotationDeg).toBeGreaterThan(24);
    expect(rotationDeg).toBeLessThan(26);

    const sidebarToggle = page.locator('#sidebarToggle[aria-expanded="true"]');
    if (await sidebarToggle.count() && await sidebarToggle.isVisible()) await sidebarToggle.click();
    await page.click('#view3dCanvasBtn');
    await expect(page.locator('.canvasWrap')).toHaveClass(/view3d/);
    const site3dCanvas = page.locator('#site3dView canvas');
    await expect(site3dCanvas).toBeVisible();
    await page.waitForTimeout(250);
    const previewScreenshot = await site3dCanvas.screenshot();
    expect(previewScreenshot.length).toBeGreaterThan(1000);
    const hasRenderedPixels = await site3dCanvas.evaluate(canvas => {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl || gl.drawingBufferWidth < 2 || gl.drawingBufferHeight < 2) return false;
      const width = Math.min(80, gl.drawingBufferWidth);
      const height = Math.min(80, gl.drawingBufferHeight);
      const x = Math.max(0, Math.floor((gl.drawingBufferWidth - width) / 2));
      const y = Math.max(0, Math.floor((gl.drawingBufferHeight - height) / 2));
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] && (pixels[i] !== 236 || pixels[i + 1] !== 236 || pixels[i + 2] !== 230)) return true;
      }
      return false;
    });
    expect(hasRenderedPixels).toBe(true);
  });

  test('selects a track item from the 3D preview and applies property edits', async ({ page }) => {
    await page.goto('/site-planner.html', { waitUntil: 'domcontentloaded' });
    await importBlankPlan(page);

    await page.selectOption('#workspaceMode', 'track');
    await page.click('#trackDrawModeBtn');
    await canvasClick(page, 280, 300);
    await canvasClick(page, 520, 300);
    await page.keyboard.press('Enter');

    const sidebarToggle = page.locator('#sidebarToggle[aria-expanded="true"]');
    if (await sidebarToggle.count() && await sidebarToggle.isVisible()) await sidebarToggle.click();
    await page.click('#catenaryVariantBtn');
    await page.click('#catenaryToolMenu [data-catenary-kind="catenarySingleSide"]');
    await canvasClick(page, 400, 300);
    await expect(page.locator('#selectedPanel')).toContainText('Track item selected');
    await page.click('#sidebarBackBtn');

    await page.click('#view3dCanvasBtn');
    await expect(page.locator('.canvasWrap')).toHaveClass(/view3d/);
    const site3dCanvas = page.locator('#site3dView canvas');
    await expect(site3dCanvas).toBeVisible();
    await page.waitForTimeout(300);
    const box = await site3dCanvas.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.42);

    await expect(page.locator('#selectedPanel')).toContainText('Track item selected');
    await expect(page.locator('#selectedPanel')).toContainText('Single-side Catenary Pole');
    const before = await site3dCanvas.screenshot();
    await page.locator('#trackItemRot').fill('90');
    await page.waitForFunction(key => {
      const payload = JSON.parse(localStorage.getItem(key) || '{}');
      return (payload.trackAccessories || []).some(item => item.kind === 'catenarySingleSide' && Math.abs((Number(item.rotationDeg) || 0) - 90) < 0.01);
    }, AUTOSAVE_KEY);
    await page.waitForTimeout(250);
    const after = await site3dCanvas.screenshot();
    expect(Buffer.compare(before, after)).not.toBe(0);
  });

  test('renders crossing signal, crossing arm, and detector track items in the 3D preview', async ({ page }) => {
    await page.goto('/site-planner.html', { waitUntil: 'domcontentloaded' });
    await importBlankPlan(page);

    await page.selectOption('#workspaceMode', 'track');
    await page.click('#trackDrawModeBtn');
    await canvasClick(page, 120, 220);
    await canvasClick(page, 520, 220);
    await page.keyboard.press('Enter');

    const sidebarToggle = page.locator('#sidebarToggle[aria-expanded="true"]');
    if (await sidebarToggle.count() && await sidebarToggle.isVisible()) await sidebarToggle.click();
    await page.click('#trackSignalModeBtn', { force: true });
    await canvasClick(page, 190, 198);
    await page.click('#trackCrossingArmModeBtn', { force: true });
    await canvasClick(page, 250, 198);
    await page.click('#trackIntrusionDetectorModeBtn', { force: true });
    await canvasClick(page, 310, 198);
    await page.click('#trackOccupancyLightModeBtn', { force: true });
    await canvasClick(page, 370, 198);

    await page.waitForFunction(key => {
      const payload = JSON.parse(localStorage.getItem(key) || '{}');
      const kinds = new Set((payload.trackAccessories || []).map(item => item.kind));
      return ['signal', 'crossingArm', 'intrusionDetector', 'occupancyLight'].every(kind => kinds.has(kind));
    }, AUTOSAVE_KEY);

    await page.click('#view3dCanvasBtn');
    await expect(page.locator('.canvasWrap')).toHaveClass(/view3d/);
    const site3dCanvas = page.locator('#site3dView canvas');
    await expect(site3dCanvas).toBeVisible();
    await page.waitForTimeout(300);
    const previewScreenshot = await site3dCanvas.screenshot();
    expect(previewScreenshot.length).toBeGreaterThan(1000);
    const hasRenderedPixels = await site3dCanvas.evaluate(canvas => {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl || gl.drawingBufferWidth < 2 || gl.drawingBufferHeight < 2) return false;
      const width = Math.min(100, gl.drawingBufferWidth);
      const height = Math.min(100, gl.drawingBufferHeight);
      const x = Math.max(0, Math.floor((gl.drawingBufferWidth - width) / 2));
      const y = Math.max(0, Math.floor((gl.drawingBufferHeight - height) / 2));
      const pixels = new Uint8Array(width * height * 4);
      gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] && (pixels[i] !== 236 || pixels[i + 1] !== 236 || pixels[i + 2] !== 230)) return true;
      }
      return false;
    });
    expect(hasRenderedPixels).toBe(true);
  });

  test('auto-fills a selected track spline with scaled catenary poles', async ({ page }) => {
    await page.goto('/site-planner.html', { waitUntil: 'domcontentloaded' });
    await importBlankPlan(page);

    await page.selectOption('#workspaceMode', 'track');
    await page.click('#trackDrawModeBtn');
    await canvasClick(page, 90, 260);
    await canvasClick(page, 780, 260);
    await page.keyboard.press('Enter');

    await page.click('#catenaryVariantBtn');
    await page.click('#catenaryToolMenu [data-catenary-kind="catenaryAutoSection"]');
    await expect(page.locator('#statusTool')).toContainText('Auto catenary section');

    await canvasClick(page, 450, 260);

    await expect(page.locator('#selectedPanel')).toContainText('Track item selected');
    await expect(page.locator('#selectedPanel')).toContainText('Single-side Catenary Pole');
    await expect(page.locator('#trackItemAutoOrient')).toBeChecked();
    await expect(page.locator('#statusHint')).toContainText('Added');
    await expect(page.locator('#statusHint')).toContainText('200.0 mm spacing');
    await expect(page.locator('#statusHint')).toContainText('30 m prototype');
    const objectBrowserText = await page.locator('#objectBrowser').innerText();
    expect(objectBrowserText).toMatch(/Track Items[\s\S]*[4-9]/);

    await page.click('#sidebarBackBtn');
    await expect(page.locator('#objectBrowserTitle')).toHaveText('Track Items');
    await expect(page.locator('#objectBrowser')).toContainText('Single-side Catenary Pole');
    await expect(page.locator('#selectedPanel')).toBeHidden();
  });
});
