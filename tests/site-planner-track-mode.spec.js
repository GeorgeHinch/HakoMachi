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
});
