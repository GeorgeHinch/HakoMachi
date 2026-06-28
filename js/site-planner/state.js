import { installHakoMachiFavicon } from '../shared/favicon.js';
import { installHakoMachiSeo } from '../shared/seo.js';

if (typeof globalThis !== 'undefined' && globalThis.document) {
  globalThis.document.title = 'HakoMachi - Site Planner';
}
installHakoMachiFavicon();
installHakoMachiSeo({
  title: 'HakoMachi - Site Planner',
  description: 'Plan where your HakoMachi buildings will sit on a Japanese N gauge model railway layout before cutting and assembly. レーザーカットする前に、HakoMachiで作成した建物を日本型Nゲージレイアウト上に配置して計画できます。',
  path: 'site-planner.html',
});

export const AUTOSAVE_KEY = 'hakomachiSitePlannerAutosave_v1';
export const AUTOSAVE_META_KEY = 'hakomachiSitePlannerAutosaveMeta_v1';
export const GITHUB_CURRENT_KEY = 'hakomachi_site_planner_github_current_v1';

export function createInitialState() {
  return {
    tool: 'select',
    image: null,
    imageMeta: null,
    imageOpacity: 0.75,
    imageLocked: true,
    view: { x: 0, y: 0, scale: 1 },
    pxPerMm: null,
    calibrationLine: null,
    lastCalibrationLine: null,
    buildings: [],
    selectedId: null,
    selectedIds: [],
    hoverBuildingId: null,
    drag: null,
    hover: null,
    polygonDraft: [],
    measureLine: null,
    projectName: 'hakomachi-site',
    roads: [],
    selectedRoadId: null,
    hoverRoadId: null,
    hoverRoadSegment: null,
    roadOutlineEditId: null,
    roadMode: 'centerline',
    roadDraft: [],
    roadFeatures: [],
    selectedRoadFeatureId: null,
    hoverRoadFeatureId: null,
    benchworkOutlines: [],
    selectedBenchworkId: null,
    hoverBenchworkId: null,
    hoverBenchworkSegment: null,
    benchworkDraft: [],
    fabricRegions: [],
    selectedFabricId: null,
    fabricDraft: [],
    fabricPreset: 'localMixedUseFabric',
    roadExportPreview: false,
    roadExportSettings: { maxPieceMm: 120, avoidJunctionMm: 18, minPieceMm: 35 },
    streetlights: [],
    selectedStreetlightId: null,
    hoverStreetlightId: null,
    streetlightMode: 'free',
    footprintClipboard: null,
    pasteOffsetCount: 0,
    inputMode: 'penDrawFingerPan',
    snapOn: false,
    pointers: new Map(),
    pinch: null,
    annotations: [],
    selectedAnnotationId: null,
    hoverPreview: null,
    longPress: null,
    contextTarget: null,
    sidebarOpen: false,
    autosaveReady: false,
    autosaveRestored: false,
    dirty: false,
    dirtySinceManualSave: false,
    lastAutosaveAt: null,
    history: [],
    historyIndex: -1,
    historySuppressed: false,
  };
}
