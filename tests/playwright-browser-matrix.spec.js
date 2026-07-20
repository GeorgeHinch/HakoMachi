const fs = require('fs');
const path = require('path');
const { expect, test } = require('@playwright/test');

const root = path.resolve(__dirname, '..');
const readFile = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test.describe('cross-browser regression matrix', () => {
  test('Playwright projects keep Chromium local by default and expose Firefox and WebKit lanes', () => {
    const config = readFile('playwright.config.js');

    expect(config).toContain("const projectGroups = {");
    expect(config).toContain("firefox: [");
    expect(config).toContain("name: 'desktop-firefox'");
    expect(config).toContain("webkit: [");
    expect(config).toContain("name: 'desktop-webkit'");
    expect(config).toContain("process.env.HAKOMACHI_PLAYWRIGHT_PROJECTS || 'chromium'");
    expect(config).toContain('process.env.HAKOMACHI_PLAYWRIGHT_WORKERS');
  });

  test('GitHub Actions runs Firefox on Linux and WebKit on macOS', () => {
    const workflow = readFile('.github/workflows/playwright-regression.yml');

    expect(workflow).toContain('project-checks:');
    expect(workflow).toContain('needs: project-checks');
    expect(workflow).toContain('label: Firefox');
    expect(workflow).toContain('playwright_project_group: firefox');
    expect(workflow).toContain('playwright_workers: 1');
    expect(workflow).toContain('install_command: npx playwright install --with-deps firefox');
    expect(workflow).toContain('label: Safari WebKit');
    expect(workflow).toContain('os: macos-latest');
    expect(workflow).toContain('playwright_project_group: webkit');
    expect(workflow).toContain('install_command: npx playwright install webkit');
  });
});
