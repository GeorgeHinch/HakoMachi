const OBJECT_TYPE_DEFINITIONS = Object.freeze([
  { key: 'buildings', label: 'Buildings', hint: 'Footprints and attached .hako files', color: '#d79631' },
  { key: 'roads', label: 'Roads', hint: 'Centerlines and outlines', color: '#6f6a5e' },
  { key: 'tracks', label: 'Tracks', hint: 'Approximate rail alignments', color: '#4b4438' },
  { key: 'trackAccessories', label: 'Track Items', hint: 'Sensors, signals, catenary, crossings, and detectors', color: '#2f6f7e' },
  { key: 'roadFeatures', label: 'Road Items', hint: 'Hatches and markings', color: '#3a2b1e' },
  { key: 'fabric', label: 'Fabric Areas', hint: 'Generated urban fabric regions', color: '#7c5f3f' },
  { key: 'benchwork', label: 'Benchwork', hint: 'Layout boundaries', color: '#2f6f4e' },
  { key: 'streetlights', label: 'Streetlights', hint: 'Streetlight objects and anchors', color: '#c84a3a' },
  { key: 'annotations', label: 'Annotations', hint: 'Freehand plan notes', color: '#6f4326' },
  { key: 'siteObjects', label: 'Site Objects', hint: 'Imported STL assets', color: '#496a78' },
]);

const DETAIL_KIND_TO_TYPE = Object.freeze({
  building: 'buildings',
  buildings: 'buildings',
  road: 'roads',
  track: 'tracks',
  trackAccessory: 'trackAccessories',
  roadFeature: 'roadFeatures',
  railCrossing: null,
  benchwork: 'benchwork',
  streetlight: 'streetlights',
  fabric: 'fabric',
  annotation: 'annotations',
  stlObject: 'siteObjects',
  siteObject: 'siteObjects',
});

const DETAIL_TITLES = Object.freeze({
  buildings: 'Buildings',
  building: 'Building',
  benchwork: 'Benchwork',
  road: 'Road',
  track: 'Track',
  trackAccessory: 'Track Item',
  roadFeature: 'Road Item',
  railCrossing: 'Rail Crossing',
  streetlight: 'Streetlight',
  fabric: 'Fabric Region',
  stlObject: 'Site Object',
  annotation: 'Annotation',
});

function collectionForType(state, type) {
  if (type === 'buildings') return state.buildings || [];
  if (type === 'roads') return state.roads || [];
  if (type === 'tracks') return state.tracks || [];
  if (type === 'trackAccessories') return state.trackAccessories || [];
  if (type === 'roadFeatures') return state.roadFeatures || [];
  if (type === 'benchwork') return state.benchworkOutlines || [];
  if (type === 'streetlights') return state.streetlights || [];
  if (type === 'fabric') return state.fabricRegions || [];
  if (type === 'annotations') return state.annotations || [];
  if (type === 'siteObjects') return state.stlObjects || [];
  return [];
}

function withCount(state, definition) {
  return {
    key: definition.key,
    label: definition.label,
    count: collectionForType(state, definition.key).length,
    hint: definition.hint,
    color: definition.color,
  };
}

export function sidebarObjectTypesForState(state) {
  return OBJECT_TYPE_DEFINITIONS.map(definition => withCount(state, definition)).filter(type => type.count > 0);
}

export function sidebarObjectTypeMetaForState(state, type) {
  const definition = OBJECT_TYPE_DEFINITIONS.find(item => item.key === type);
  return definition ? withCount(state, definition) : null;
}

export function sidebarTypeForDetailKind(kind) {
  return DETAIL_KIND_TO_TYPE[kind] || null;
}

export function sidebarObjectsForType(state, type) {
  return collectionForType(state, type);
}

export function sidebarObjectSelected(state, type, id, isBuildingSelected) {
  if (type === 'buildings') return isBuildingSelected(id);
  if (type === 'roads') return state.selectedRoadId === id;
  if (type === 'tracks') return state.selectedTrackId === id;
  if (type === 'trackAccessories') return state.selectedTrackAccessoryId === id;
  if (type === 'roadFeatures') return state.selectedRoadFeatureId === id;
  if (type === 'benchwork') return state.selectedBenchworkId === id;
  if (type === 'streetlights') return state.selectedStreetlightId === id;
  if (type === 'fabric') return state.selectedFabricId === id;
  if (type === 'annotations') return state.selectedAnnotationId === id;
  if (type === 'siteObjects') return state.selectedStlObjectId === id;
  return false;
}

export function activeSidebarDetailKindForState(state, selectedBuildingIds) {
  if ((selectedBuildingIds || []).length > 1) return 'buildings';
  if (state.selectedId) return 'building';
  if (state.selectedBenchworkId) return 'benchwork';
  if (state.selectedRoadId) return 'road';
  if (state.selectedTrackId) return 'track';
  if (state.selectedTrackAccessoryId) return 'trackAccessory';
  if (state.selectedRoadFeatureId) return 'roadFeature';
  if (state.selectedRailCrossingId) return 'railCrossing';
  if (state.selectedStreetlightId) return 'streetlight';
  if (state.selectedFabricId) return 'fabric';
  if (state.selectedStlObjectId) return 'stlObject';
  if (state.selectedAnnotationId) return 'annotation';
  return null;
}

export function activeSidebarDetailTitle(kind) {
  return DETAIL_TITLES[kind] || 'Selected';
}
