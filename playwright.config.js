const port = Number(process.env.HAKOMACHI_TEST_PORT || 4173);

module.exports = {
  testDir: './tests',
  timeout: 30000,
  fullyParallel: true,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 390, height: 640 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `node tools/static_server.js ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 10000,
  },
};
