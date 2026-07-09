const { expect, test } = require('@playwright/test');

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
    await canvasClick(page, 260, 140);

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
    await canvasClick(page, 260, 140);

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

  test('auto-fills a selected track section with scaled catenary poles', async ({ page }) => {
    await page.goto('/site-planner.html', { waitUntil: 'domcontentloaded' });
    await importBlankPlan(page);

    await page.selectOption('#workspaceMode', 'track');
    await page.click('#trackDrawModeBtn');
    await canvasClick(page, 90, 260);
    await canvasClick(page, 780, 260);
    await canvasClick(page, 780, 260);

    await page.click('#catenaryVariantBtn');
    await page.click('#catenaryToolMenu [data-catenary-kind="catenaryAutoSection"]');
    await expect(page.locator('#statusTool')).toContainText('Auto catenary section');

    await canvasClick(page, 100, 260);
    await expect(page.locator('#statusHint')).toContainText('started');
    await canvasClick(page, 760, 260);

    await expect(page.locator('#selectedPanel')).toContainText('Track item selected');
    await expect(page.locator('#selectedPanel')).toContainText('Single-side Catenary Pole');
    await expect(page.locator('#trackItemAutoOrient')).toBeChecked();
    await expect(page.locator('#statusHint')).toContainText('Added');
    const objectBrowserText = await page.locator('#objectBrowser').innerText();
    expect(objectBrowserText).toMatch(/Track Items[\s\S]*[3-9]/);
  });
});
