const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'split-manifest.json'), 'utf8'));
const jsFiles = manifest.filter(entry => entry.type === 'js').map(entry => entry.path);

function dummy() {
  return new Proxy(function () {}, {
    get: (target, prop) => (prop === 'then' ? undefined : dummy()),
    apply: () => dummy(),
    construct: () => dummy(),
    set: () => true,
  });
}

function element() {
  return {
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    dataset: {},
    children: [],
    appendChild() {},
    append() {},
    remove() {},
    setAttribute() {},
    getAttribute() { return null; },
    addEventListener() {},
    removeEventListener() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100, right: 100, bottom: 100 }; },
    innerHTML: '',
    textContent: '',
    value: '',
    checked: false,
    disabled: false,
  };
}

const document = {
  readyState: 'complete',
  body: element(),
  documentElement: element(),
  createElement() { return element(); },
  createElementNS() { return element(); },
  getElementById() { return element(); },
  querySelector() { return element(); },
  querySelectorAll() { return []; },
  addEventListener() {},
  removeEventListener() {},
};

const localStorage = {
  _: {},
  getItem(key) { return this._[key] || null; },
  setItem(key, value) { this._[key] = String(value); },
  removeItem(key) { delete this._[key]; },
};

const context = {
  console,
  window: null,
  document,
  localStorage,
  navigator: { language: 'en-US', userAgent: '' },
  location: { hash: '', search: '' },
  setTimeout() { return 1; },
  clearTimeout() {},
  setInterval() { return 1; },
  clearInterval() {},
  alert() {},
  confirm() { return true; },
  prompt() { return null; },
  Blob: class {},
  URL: { createObjectURL() { return ''; }, revokeObjectURL() {} },
  FileReader: class {},
  DOMParser: class { parseFromString() { return document; } },
  XMLSerializer: class { serializeToString() { return ''; } },
  requestAnimationFrame(fn) { return setTimeout(fn, 0); },
  cancelAnimationFrame() {},
  performance: { now() { return 0; } },
  THREE: dummy(),
  JSZip: dummy(),
  SVGElement: class {},
  HTMLElement: class {},
  addEventListener() {},
  removeEventListener() {},
};
context.window = context;
context.globalThis = context;
context.self = context;

vm.createContext(context);

for (const file of jsFiles) {
  const code = fs.readFileSync(path.join(root, file), 'utf8');
  try {
    vm.runInContext(code, context, { filename: file });
  } catch (err) {
    console.error('Runtime load error in', file);
    console.error(err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

const requiredGlobals = [
  'generateBuilding',
  'tallyFixtures',
  'generateFixtureParts',
  'cutFixtureHolesInCore',
  'addFixtureThroughHolesToWall',
  'generateFlatRoof',
  'generateFlatOverhangRoof',
];
const missing = requiredGlobals.filter(name => typeof context[name] !== 'function');
if (missing.length) {
  console.error('Missing globals:', missing.join(', '));
  process.exit(2);
}

try {
  const cfg = vm.runInContext('JSON.parse(JSON.stringify(CONFIG))', context);
  cfg.wings = [];
  cfg.roofStyle = 'flat_overhang';
  cfg.width = 80;
  cfg.depth = 45.5;
  cfg.height = 25;
  cfg.floorCount = 1;
  const result = context.generateBuilding(cfg);
  const parts = Array.isArray(result) ? result : (result && result.parts);
  if (!Array.isArray(parts) || parts.length === 0) {
    throw new Error('generateBuilding returned no parts');
  }
  console.log('runtime load ok; required globals exist; generateBuilding parts:', parts.length);
} catch (err) {
  console.error('generateBuilding error:');
  console.error(err && err.stack ? err.stack : err);
  process.exit(3);
}
