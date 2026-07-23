import { createSite3DBaseRenderer } from './site-3d-base-renderer.js';
import { createSite3DTrackAccessoryRenderer } from './site-3d-track-accessory-renderer.js';
import { createSite3DBuildingRenderer } from './site-3d-building-renderer.js';
import { createSite3DRoadRenderer } from './site-3d-road-renderer.js';
import { createSite3DTrackRenderer } from './site-3d-track-renderer.js';
import { createSite3DStlRenderer } from './site-3d-stl-renderer.js';

export function createSite3DRendererFacade({ base, road, track, building, trackAccessories, stl }) {
  let baseRenderer = null;
  let buildingRenderer = null;
  let trackAccessoryRenderer = null;
  let stlRenderer = null;

  function ensureBaseRenderer() {
    if (!baseRenderer) baseRenderer = createSite3DBaseRenderer(base);
    return baseRenderer;
  }

  function buildSite3DBase(bounds, baseThicknessMm) {
    return ensureBaseRenderer().buildSite3DBase(bounds, baseThicknessMm);
  }

  function buildSite3DReferenceImage(bounds) {
    return ensureBaseRenderer().buildSite3DReferenceImage(bounds);
  }

  function buildSite3DRoadGroup(bounds) {
    return createSite3DRoadRenderer(road).buildSite3DRoadGroup(bounds);
  }

  function buildSite3DTrackGroup(bounds) {
    return createSite3DTrackRenderer(track).buildSite3DTrackGroup(bounds);
  }

  function ensureBuildingRenderer() {
    if (!buildingRenderer) buildingRenderer = createSite3DBuildingRenderer(building);
    return buildingRenderer;
  }

  function buildSite3DSelectionHelper(buildingRecord, bounds, options = {}) {
    return ensureBuildingRenderer().buildSite3DSelectionHelper(buildingRecord, bounds, options);
  }

  function buildSite3DBuildingGroup(buildingRecord, bounds) {
    return ensureBuildingRenderer().buildSite3DBuildingGroup(buildingRecord, bounds);
  }

  function ensureTrackAccessoryRenderer() {
    if (!trackAccessoryRenderer) trackAccessoryRenderer = createSite3DTrackAccessoryRenderer(trackAccessories);
    return trackAccessoryRenderer;
  }

  function buildSite3DCatenaryItem(item, bounds) {
    return ensureTrackAccessoryRenderer().buildSite3DCatenaryItem(item, bounds);
  }

  function buildSite3DTrackSwitchItem(item, bounds) {
    return ensureTrackAccessoryRenderer().buildSite3DTrackSwitchItem(item, bounds);
  }

  function buildSite3DTrackBufferItem(item, bounds) {
    return ensureTrackAccessoryRenderer().buildSite3DTrackBufferItem(item, bounds);
  }

  function buildSite3DTrackAccessoryGroup(bounds) {
    return ensureTrackAccessoryRenderer().buildSite3DTrackAccessoryGroup(bounds);
  }

  function ensureStlRenderer() {
    if (!stlRenderer) stlRenderer = createSite3DStlRenderer(stl);
    return stlRenderer;
  }

  function buildSite3DStlObjectGroup(raw, bounds) {
    return ensureStlRenderer().buildSite3DStlObjectGroup(raw, bounds);
  }

  return Object.freeze({
    buildSite3DBase,
    buildSite3DReferenceImage,
    buildSite3DRoadGroup,
    buildSite3DTrackGroup,
    buildSite3DSelectionHelper,
    buildSite3DBuildingGroup,
    buildSite3DCatenaryItem,
    buildSite3DTrackSwitchItem,
    buildSite3DTrackBufferItem,
    buildSite3DTrackAccessoryGroup,
    buildSite3DStlObjectGroup,
  });
}
