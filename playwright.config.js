const port = Number(process.env.HAKOMACHI_TEST_PORT || 4173);
const projectGroups = {
  chromium: [
    {
      name: 'desktop-chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1366, height: 900 },
      },
    },
    {
      name: 'tablet-chromium',
      testMatch: [
        '**/core-workflows.spec.js',
        '**/short-viewport.spec.js',
        '**/3d-visual-smoke.spec.js',
      ],
      use: {
        browserName: 'chromium',
        viewport: { width: 834, height: 1112 },
        hasTouch: true,
      },
    },
    {
      name: 'mobile-chromium',
      testMatch: [
        '**/core-workflows.spec.js',
        '**/short-viewport.spec.js',
        '**/3d-visual-smoke.spec.js',
      ],
      use: {
        browserName: 'chromium',
        viewport: { width: 390, height: 640 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  firefox: [
    {
      name: 'desktop-firefox',
      use: {
        browserName: 'firefox',
        viewport: { width: 1366, height: 900 },
        headless: false,
        // Ensure Linux CI can expose software WebGL through its Xvfb display.
        firefoxUserPrefs: {
          'webgl.disabled': false,
          'webgl.force-enabled': true,
        },
      },
    },
  ],
  webkit: [
    {
      name: 'desktop-webkit',
      use: {
        browserName: 'webkit',
        viewport: { width: 1366, height: 900 },
      },
    },
  ],
};
const requestedProjectGroups = (process.env.HAKOMACHI_PLAYWRIGHT_PROJECTS || 'chromium')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);
const unknownProjectGroups = requestedProjectGroups.filter(group => !projectGroups[group]);
if (unknownProjectGroups.length) {
  throw new Error(`Unknown HAKOMACHI_PLAYWRIGHT_PROJECTS value: ${unknownProjectGroups.join(', ')}`);
}
const requestedWorkers = Number(process.env.HAKOMACHI_PLAYWRIGHT_WORKERS);

module.exports = {
  testDir: './tests',
  timeout: 60000,
  fullyParallel: true,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: requestedProjectGroups.flatMap(group => projectGroups[group]),
  // Keep WebGL-heavy non-Chromium lanes deterministic on hosted runners.
  workers: Number.isFinite(requestedWorkers) && requestedWorkers > 0 ? requestedWorkers : undefined,
  webServer: {
    command: `node tools/static_server.js ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
};
