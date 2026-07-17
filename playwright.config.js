const port = Number(process.env.HAKOMACHI_TEST_PORT || 4173);

module.exports = {
  testDir: './tests',
  timeout: 60000,
  fullyParallel: true,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
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
  webServer: {
    command: `node tools/static_server.js ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
};
