const { expect, test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test.describe('HTML code health contracts', () => {
  test('material manager page-level styles live in an external stylesheet', async ({ page }) => {
    const html = readRepoFile('utils/material-manager.html');
    const css = readRepoFile('css/material-manager.css');

    expect(html).toContain('<link rel="stylesheet" href="../css/material-manager.css" />');
    expect(html).not.toContain('<style>');
    expect(html).not.toContain('style="');
    expect(css).toContain('.material-manager .manager-main');
    expect(css).toContain('.material-manager .material-section-heading');

    await page.goto('/utils/material-manager.html', { waitUntil: 'networkidle' });
    const gridTemplate = await page.locator('.manager-main').evaluate(el => getComputedStyle(el).gridTemplateColumns);
    const headingMargin = await page.locator('.flush-heading').evaluate(el => getComputedStyle(el).marginTop);

    expect(gridTemplate).not.toBe('none');
    expect(headingMargin).toBe('0px');
  });
});
