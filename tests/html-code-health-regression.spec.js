const { expect, test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

function attrValue(attrs, name) {
  const match = attrs.match(new RegExp(`${name}=["']([^"']+)["']`));
  return match ? match[1] : '';
}

function titleFromHtml(html) {
  return html.match(/<title>([^<]+)<\/title>/i)?.[1] || '';
}

function metaContent(html, selector) {
  const tagMatch = html.match(new RegExp(`<meta\\s+([^>]*${selector}[^>]*)>`, 'i'));
  return tagMatch ? attrValue(tagMatch[1], 'content') : '';
}

function canonicalHref(html) {
  const tagMatch = html.match(/<link\s+([^>]*rel=["']canonical["'][^>]*)>/i);
  return tagMatch ? attrValue(tagMatch[1], 'href') : '';
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

  test('page and tool metadata stays aligned with the shared registry', async () => {
    const landingSource = readRepoFile('js/landing/main.js');
    const analyticsSource = readRepoFile('js/shared/hakomachi-analytics.js');
    const {
      HAKOMACHI_TOOL_REGISTRY,
      appKeyForPath,
      landingTools,
      navigationTargetForHref,
      seoMetadataForTool,
    } = await import('../js/shared/hakomachi-tool-registry.js');

    expect(landingSource).toContain("from '../shared/hakomachi-tool-registry.js'");
    expect(analyticsSource).toContain("from './hakomachi-tool-registry.js'");
    expect(landingTools('primary').map(tool => tool.key)).toEqual(['sitePlanner', 'buildingGenerator']);
    expect(landingTools('utility').map(tool => tool.key)).toEqual([
      'industrialShelfGenerator',
      'materialManager',
      'safetyRailingGenerator',
      'woodenCrateGenerator',
    ]);
    expect(appKeyForPath('/HakoMachi/utils/material-manager.html')).toBe('utility_material_manager');
    expect(navigationTargetForHref('utils/wooden-crate-generator.html')).toBe('utility_wooden_crate');

    for (const tool of HAKOMACHI_TOOL_REGISTRY) {
      expect(tool.path).toBeTruthy();
      expect(tool.appKey).toMatch(/^[a-z0-9_]+$/);
      expect(tool.group).toMatch(/^(core|primary|utility)$/);
      expect(tool.label).toBeTruthy();
      expect(tool.seoTitle).toBeTruthy();
      expect(tool.seoDescription).toBeTruthy();
      if (tool.landing) expect(tool.shortDescription).toBeTruthy();

      const html = readRepoFile(tool.path);
      const seo = seoMetadataForTool(tool);
      expect(titleFromHtml(html)).toBe(seo.title);
      expect(metaContent(html, 'name=["\\\']description["\\\']')).toBe(seo.description);
      expect(canonicalHref(html)).toBe(seo.canonicalUrl);
      expect(metaContent(html, 'property=["\\\']og:title["\\\']')).toBe(seo.title);
      expect(metaContent(html, 'property=["\\\']og:description["\\\']')).toBe(seo.description);
      expect(metaContent(html, 'name=["\\\']twitter:title["\\\']')).toBe(seo.title);
      expect(metaContent(html, 'name=["\\\']twitter:description["\\\']')).toBe(seo.description);
    }
  });
});
