const { expect, test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('Site Planner STL model split contracts', () => {
  test('STL canvas behavior stays in the STL object model module', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner.js'), 'utf8');
    const model = fs.readFileSync(path.join(__dirname, '..', 'js', 'site-planner', 'stl-object-model.js'), 'utf8');

    expect(source).toContain("import { createStlObjectModelController } from './site-planner/stl-object-model.js';");
    expect(source).toContain('drawStlObject,');
    expect(source).toContain('selectedStlObject,');
    expect(source).not.toContain('function drawStlObject(raw)');
    expect(source).not.toContain('function deleteSelectedStlObject()');
    expect(source).not.toContain('function selectStlObject(obj)');
    expect(model).toContain('function drawStlObject(raw)');
    expect(model).toContain("isSiteObjectSelected('stlObject',obj.id)");
    expect(model).toContain('function selectedStlObject()');
    expect(model).toContain('function deleteSelectedStlObject()');
    expect(model).toContain('function selectStlObject(obj)');
    expect(model).toContain('drawLabel(');
  });
});
