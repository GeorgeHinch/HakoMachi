const { expect, test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('Site Planner streetlight controller split contracts', () => {
  test('streetlight canvas behavior stays in the streetlight controller', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'streetlight-controller.js'), 'utf8');
    const canvasRenderer = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'site-canvas-renderer.js'), 'utf8');

    expect(source).toContain("import { createStreetlightController } from './site-planner/streetlight-controller.js';");
    expect(source).toContain('drawStreetlight,');
    expect(source).toContain("import { createSiteCanvasRenderer } from './site-planner/site-canvas-renderer.js';");
    expect(canvasRenderer).toContain('state.streetlights.forEach(drawStreetlight);');
    expect(source).not.toContain('function drawStreetlight(l)');
    expect(controller).toContain('function drawStreetlight(l)');
    expect(controller).toContain("isSiteObjectSelected('streetlight', l.id)");
    expect(controller).toContain("l.mode === 'anchored'");
    expect(controller).toContain('drawLabel(');
  });
});
