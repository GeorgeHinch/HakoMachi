const { expect, test } = require('@playwright/test');

const AUTOSAVE_KEY = 'hakomachiSitePlannerAutosave_v1';
const AUTOSAVE_META_KEY = 'hakomachiSitePlannerAutosaveMeta_v1';
const GITHUB_CURRENT_KEY = 'hakomachi_site_planner_github_current_v1';
const GITHUB_SETTINGS_KEY = 'hakomachi_github_data_settings_v1';

function base64Json(value) {
  return Buffer.from(JSON.stringify(value, null, 2) + '\n').toString('base64');
}

test.describe('site planner GitHub save source', () => {
  test('primary Save reuses the current GitHub site without asking for a name', async ({ page }) => {
    const writes = [];
    await page.route('https://api.github.com/repos/owner/repo/contents/**', async route => {
      const url = new URL(route.request().url());
      const path = decodeURIComponent(url.pathname.split('/contents/')[1] || '');
      if (route.request().method() === 'PUT') {
        writes.push({ path, body: JSON.parse(route.request().postData() || '{}') });
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: { path, sha: 'new-sha' } }) });
        return;
      }
      const payload = path === 'footprints/library.json'
        ? { schema: 'hakomachi.data-library', schemaVersion: 1, records: { buildings: [], sitePlans: [], materialProfiles: [] } }
        : { stale: true };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ name: path.split('/').pop(), path, sha: `${path}-sha`, encoding: 'base64', content: base64Json(payload) }),
      });
    });

    await page.goto('/site-planner.html', { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ autosaveKey, metaKey, currentKey, settingsKey }) => {
      const project = {
        app: 'HakoMachi Site Planner',
        version: 80,
        portableProject: true,
        savedAt: new Date().toISOString(),
        projectName: 'Cloud Plan',
        coordinateSystem: { type: 'imagePixels', origin: 'topLeft', imageWidthPx: 900, imageHeightPx: 600 },
        image: null,
        imageOpacity: 0.75,
        imageLocked: true,
        scale: { calibrated: false, pxPerMm: null, calibrationLine: null, units: 'mm' },
        buildings: [{ id: 'building_1', name: 'Shop', padType: 'rect', x: 100, y: 120, widthPx: 80, depthPx: 50 }],
        roads: [],
        roadFeatures: [],
        stlObjects: [],
        benchworkOutlines: [],
        fabricRegions: [],
        streetlights: [],
        annotations: [],
        tracks: [],
        trackAccessories: [],
      };
      localStorage.setItem(autosaveKey, JSON.stringify(project));
      localStorage.setItem(metaKey, JSON.stringify({ savedAt: project.savedAt, dirtySinceManualSave: true }));
      localStorage.setItem(currentKey, JSON.stringify({ id: 'cloud-plan', name: 'Cloud Plan', path: 'site-plans/cloud-plan.hako-site.json' }));
      localStorage.setItem(settingsKey, JSON.stringify({
        repoFullName: 'owner/repo',
        branch: 'main',
        token: 'test-token',
        libraryPath: 'footprints/library.json',
        sitePlansDir: 'site-plans',
      }));
    }, { autosaveKey: AUTOSAVE_KEY, metaKey: AUTOSAVE_META_KEY, currentKey: GITHUB_CURRENT_KEY, settingsKey: GITHUB_SETTINGS_KEY });
    await page.reload({ waitUntil: 'networkidle' });
    await page.evaluate(() => {
      window.__promptCalled = false;
      window.prompt = () => {
        window.__promptCalled = true;
        return 'Should not be used';
      };
    });

    await expect(page.locator('#saveBtn')).toHaveText('Save to GitHub');
    await page.locator('#saveBtn').click();

    await expect.poll(() => writes.some(write => write.path === 'site-plans/cloud-plan.hako-site.json')).toBe(true);
    expect(await page.evaluate(() => window.__promptCalled)).toBe(false);
    const siteWrite = writes.find(write => write.path === 'site-plans/cloud-plan.hako-site.json');
    expect(siteWrite.body.message).toBe('Save HakoMachi site plan: Cloud Plan');
    const savedProject = JSON.parse(Buffer.from(siteWrite.body.content, 'base64').toString('utf8'));
    expect(savedProject.hakomachiCloud.path).toBe('site-plans/cloud-plan.hako-site.json');
    expect(savedProject.hakomachiCloud.name).toBe('Cloud Plan');
  });
});
