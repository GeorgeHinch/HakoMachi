const fs = require('fs');
const path = require('path');
const { expect, test } = require('@playwright/test');

const root = path.resolve(__dirname, '..');

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test.describe('3D material depth regression contracts', () => {
  test('Site Planner cork roadbed is an opaque depth-writing surface', () => {
    const source = readRepoFile('js/site-planner.js');
    const match = source.match(/const roadbedMat=new THREE\.MeshStandardMaterial\((\{[^;]+?\})\);/s);

    expect(match, 'roadbed material definition exists').not.toBeNull();
    const material = match[1];

    expect(material).toContain('transparent:false');
    expect(material).toContain('opacity:1');
    expect(material).toContain('depthTest:true');
    expect(material).toContain('depthWrite:true');
  });

  test('3D preview cameras derive near and far planes from scene bounds', () => {
    const sitePlanner = readRepoFile('js/site-planner.js');
    const buildingPreview = readRepoFile('js/building-generator/preview/three-preview.js');
    const utilityPreview = readRepoFile('js/utilities/utility-3d-preview.js');

    expect(sitePlanner).toContain('site3d.camera.near=Math.max(.25,radius/1000)');
    expect(sitePlanner).toContain('site3d.camera.far=Math.max(800,radius*8)');
    expect(buildingPreview).toContain('threeCamera.near = Math.max(0.25, maxDim / 700)');
    expect(buildingPreview).toContain('threeCamera.far = Math.max(1000, maxDim * 7)');
    expect(utilityPreview).toContain('state.camera.near = Math.max(0.25, maxDim / 800)');
    expect(utilityPreview).toContain('state.camera.far = Math.max(600, maxDim * 8)');
  });

  test('utility 3D solid material defaults keep depth writes enabled', () => {
    const source = readRepoFile('js/utilities/utility-3d-preview.js');

    expect(source).toContain('const transparent = opacity < 1');
    expect(source).toContain('transparent,');
    expect(source).toContain('depthTest: true');
    expect(source).toContain('depthWrite: !transparent');
  });
});
