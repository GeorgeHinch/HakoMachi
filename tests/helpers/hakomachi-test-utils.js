const fs = require('fs');

const SITE_AUTOSAVE_KEY = 'hakomachiSitePlannerAutosave_v1';
const SITE_AUTOSAVE_META_KEY = 'hakomachiSitePlannerAutosaveMeta_v1';

function installConsoleErrorTracker(page) {
  const errors = [];
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', error => {
    errors.push(error.message || String(error));
  });
  return errors;
}

async function expectNoConsoleErrors(errors, allow = []) {
  const unexpected = errors.filter(error => !allow.some(pattern => pattern.test(error)));
  if (unexpected.length) {
    throw new Error(`Unexpected browser errors:\n${unexpected.join('\n')}`);
  }
}

function blankSitePlannerProject(overrides = {}) {
  const savedAt = new Date().toISOString();
  return {
    app: 'HakoMachi Site Planner',
    version: 86,
    portableProject: true,
    savedAt,
    coordinateSystem: { type: 'imagePixels', origin: 'topLeft', imageWidthPx: 640, imageHeightPx: 420 },
    image: null,
    imageMeta: null,
    view: { x: 0, y: 0, scale: 1 },
    site3d: { imageVisible: false, imageOpacity: 0.45 },
    scale: { calibrated: true, pxPerMm: 2, calibrationLine: null, units: 'mm' },
    buildings: [],
    roads: [],
    tracks: [],
    trackAccessories: [],
    benchworkOutlines: [],
    roadFeatures: [],
    stlObjects: [],
    fabricRegions: [],
    streetlights: [],
    annotations: [],
    ...overrides,
  };
}

async function seedSitePlannerAutosave(page, project) {
  await page.addInitScript(({ key, metaKey, value }) => {
    localStorage.setItem(key, JSON.stringify(value));
    localStorage.setItem(metaKey, JSON.stringify({ savedAt: value.savedAt, dirtySinceManualSave: true }));
  }, { key: SITE_AUTOSAVE_KEY, metaKey: SITE_AUTOSAVE_META_KEY, value: project });
}

async function readSitePlannerAutosave(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{}'), SITE_AUTOSAVE_KEY);
}

async function downloadText(download) {
  const filePath = await download.path();
  return fs.readFileSync(filePath, 'utf8');
}

module.exports = {
  SITE_AUTOSAVE_KEY,
  SITE_AUTOSAVE_META_KEY,
  blankSitePlannerProject,
  downloadText,
  expectNoConsoleErrors,
  installConsoleErrorTracker,
  readSitePlannerAutosave,
  seedSitePlannerAutosave,
};
