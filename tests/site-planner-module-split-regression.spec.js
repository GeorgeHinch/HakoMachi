const { expect, test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('Site Planner module split contracts', () => {
  test('benchwork outline behavior is wired through the benchwork controller', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'benchwork-controller.js'), 'utf8');

    expect(source).toContain("import { createBenchworkController } from './site-planner/benchwork-controller.js';");
    expect(source).toContain('} = createBenchworkController({');
    expect(source).toContain('normalizeBenchworkOutline,');
    expect(source).toContain('benchworkPathSamples: benchworkSamples');
    expect(source).toContain('state.benchworkOutlines=loadedBenchworks.map(normalizeBenchworkOutline);');

    expect(controller).toContain('export function createBenchworkController');
    expect(controller).toContain('function normalizeBenchworkOutline(bw)');
    expect(controller).toContain('function hitBenchworkSegment');
    expect(controller).toContain('function finishBenchworkOutline');
  });

  test('freehand annotation behavior is wired through the annotation controller', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'annotation-controller.js'), 'utf8');

    expect(source).toContain("import { createAnnotationController } from './site-planner/annotation-controller.js';");
    expect(source).toContain('} = createAnnotationController({');
    expect(source).toContain('hitAnnotation,');
    expect(source).toContain('drawAnnotations,');
    expect(source).toContain("markDirty('annotations cleared');");

    expect(controller).toContain('export function createAnnotationController');
    expect(controller).toContain('function hitAnnotation');
    expect(controller).toContain('function startAnnotationStroke');
    expect(controller).toContain('function drawAnnotations');
  });

  test('streetlight model behavior is wired through the streetlight controller', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const controller = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'streetlight-controller.js'), 'utf8');

    expect(source).toContain("import { createStreetlightController } from './site-planner/streetlight-controller.js';");
    expect(source).toContain('} = createStreetlightController({');
    expect(source).toContain('normalizeStreetlight,');
    expect(source).toContain('placeStreetlight,');
    expect(source).toContain('state.streetlights.forEach(drawStreetlight);');

    expect(controller).toContain('export function createStreetlightController');
    expect(controller).toContain('function normalizeStreetlight(l)');
    expect(controller).toContain('function hitStreetlight');
    expect(controller).toContain('function placeStreetlight');
  });
});
