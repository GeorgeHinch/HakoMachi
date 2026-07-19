const fs = require('fs');
const path = require('path');
const { expect, test } = require('@playwright/test');

const root = path.resolve(__dirname, '..');

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

test.describe('3D material depth regression contracts', () => {
  test('Site Planner cork roadbed is an opaque depth-writing surface', () => {
    const renderer = readRepoFile('js/site-planner/site-3d-track-renderer.js');
    const match = renderer.match(/const roadbedMat = new THREE\.MeshStandardMaterial\((\{[^;]+?\})\);/s);

    expect(match, 'roadbed material definition exists').not.toBeNull();
    const material = match[1].replace(/\s/g, '');

    expect(material).toContain('transparent:false');
    expect(material).toContain('opacity:1');
    expect(material).toContain('depthTest:true');
    expect(material).toContain('depthWrite:true');
  });

  test('Site Planner 3D track uses raised solids for roadbed, sleepers, and rails', () => {
    const source = readRepoFile('js/site-planner.js');
    const renderer = readRepoFile('js/site-planner/site-3d-track-renderer.js');
    const meshUtils = readRepoFile('js/site-planner/site-3d-mesh-utils.js');

    expect(source).toContain("import { createSite3DMeshUtils } from './site-planner/site-3d-mesh-utils.js';");
    expect(meshUtils).toContain('function site3DAddRaisedPolygon');
    expect(meshUtils).toContain('new THREE.InstancedMesh');
    expect(source).toContain("import { createSite3DTrackRenderer } from './site-planner/site-3d-track-renderer.js';");
    expect(renderer).toContain('sleeper solids');
    expect(renderer).toContain('rail A solids');
    expect(renderer).toContain('rail B solids');
    expect(renderer).not.toContain('const railMat = new THREE.LineBasicMaterial');
    expect(renderer).not.toContain('const tieMat = new THREE.LineBasicMaterial');
  });

  test('Site Planner 3D road meshes use mode-aware benchwork-clipped display polygons', () => {
    const source = readRepoFile('js/site-planner.js');
    const roadRenderer = readRepoFile('js/site-planner/site-3d-road-renderer.js');
    const bounds = source.match(/function site3DBounds\(\)\{([\s\S]+?)function disposeSite3DObject/);

    expect(source).toContain("import { createSite3DRoadRenderer } from './site-planner/site-3d-road-renderer.js';");
    expect(source).toContain('function buildSite3DRoadGroup(bounds)');
    expect(source).toContain('createSite3DRoadRenderer({');
    expect(bounds, '3D bounds builder exists').not.toBeNull();
    expect(source).toContain("function shouldClipRoadsToBenchwork()");
    expect(source).toContain("return state.workspaceMode!=='road'");
    expect(roadRenderer).toContain('roadDisplayPolygons(road, { perCurve: 32, clipToBenchwork: shouldClipRoadsToBenchwork() })');
    expect(roadRenderer).not.toContain('site3DAddFlatPolygon(group,r.roadPolygonPx||[]');
    expect(bounds[1]).toContain('roadDisplayPolygons(r,{perCurve:32,clipToBenchwork:shouldClipRoadsToBenchwork()})');
  });

  test('Site Planner 3D road markings and fixtures render above road surfaces', () => {
    const source = readRepoFile('js/site-planner.js');
    const roadRenderer = readRepoFile('js/site-planner/site-3d-road-renderer.js');
    const overlayMaterial = roadRenderer.match(/function roadOverlayMaterial\(color, fallback, options = \{\}\) \{([\s\S]+?)function roadOverlayLineMaterial/);

    expect(source).toContain("import { createSite3DRoadRenderer } from './site-planner/site-3d-road-renderer.js';");
    expect(overlayMaterial, '3D road overlay material helper exists').not.toBeNull();
    expect(roadRenderer).toContain("import { buildRoadMarkingShapes } from './road-marking-shapes.js';");
    expect(roadRenderer).toContain('addGeneratedRoadIntersections(group)');
    expect(roadRenderer).toContain('addRoadFeatures(group)');
    expect(roadRenderer).toContain('buildRoadMarkingShapes(preset, { x: feature.x, y: feature.y, angle: rad(feature.rotationDeg || 0) })');
    expect(roadRenderer).toContain('tagSite3DRoadFeatureObject(mesh, feature)');
    expect(overlayMaterial[1]).toContain('depthWrite: false');
    expect(overlayMaterial[1]).toContain('polygonOffset: true');
  });

  test('3D preview cameras derive near and far planes from scene bounds', () => {
    const sitePlanner = readRepoFile('js/site-planner.js');
    const sitePlannerSceneController = readRepoFile('js/site-planner/site-3d-scene-controller.js');
    const buildingPreview = readRepoFile('js/building-generator/preview/three-preview.js');
    const utilityPreview = readRepoFile('js/utilities/utility-3d-preview.js');

    expect(sitePlanner).toContain("import { createSite3DSceneController } from './site-planner/site-3d-scene-controller.js';");
    expect(sitePlannerSceneController).toContain('site3d.camera.near = Math.max(.25, radius / 1000)');
    expect(sitePlannerSceneController).toContain('site3d.camera.far = Math.max(800, radius * 8)');
    expect(buildingPreview).toContain('threeCamera.near = Math.max(0.25, maxDim / 700)');
    expect(buildingPreview).toContain('threeCamera.far = Math.max(1000, maxDim * 7)');
    expect(utilityPreview).toContain('state.camera.near = Math.max(0.25, maxDim / 800)');
    expect(utilityPreview).toContain('state.camera.far = Math.max(600, maxDim * 8)');
  });

  test('Site Planner 3D image controls preserve the active camera', () => {
    const source = readRepoFile('js/site-planner.js');
    const imageVisibleHandler = source.match(/imageVisible\.onchange=\(\)=>\{([\s\S]+?)markDirty\('3d reference image visibility'/);
    const imageOpacityHandler = source.match(/imageOpacity\.oninput=\(\)=>\{([\s\S]+?)markDirty\('3d reference image opacity'/);

    expect(imageVisibleHandler, 'image visibility handler exists').not.toBeNull();
    expect(imageOpacityHandler, 'image opacity handler exists').not.toBeNull();
    expect(imageVisibleHandler[1]).toContain('updateSite3D({preserveCamera:true})');
    expect(imageOpacityHandler[1]).toContain('updateSite3D({preserveCamera:true})');
  });

  test('utility 3D solid material defaults keep depth writes enabled', () => {
    const source = readRepoFile('js/utilities/utility-3d-preview.js');

    expect(source).toContain('const transparent = opacity < 1');
    expect(source).toContain('transparent,');
    expect(source).toContain('depthTest: true');
    expect(source).toContain('depthWrite: !transparent');
  });
});
