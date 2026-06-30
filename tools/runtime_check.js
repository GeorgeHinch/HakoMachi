const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const SCRIPT_RE = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const ATTR_RE = /([:\w-]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g;
const HTML_RE = /\.html?$/i;

function toRepoPath(file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

function listHtmlFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listHtmlFiles(full, out);
    else if (HTML_RE.test(entry.name)) out.push(full);
  }
  return out.sort((a, b) => toRepoPath(a).localeCompare(toRepoPath(b)));
}

function parseAttrs(raw) {
  const attrs = {};
  String(raw || '').replace(ATTR_RE, (_, name, value) => {
    attrs[name.toLowerCase()] = value ? value.replace(/^['"]|['"]$/g, '') : '';
    return '';
  });
  return attrs;
}

function parseScripts(html) {
  const scripts = [];
  let match;
  while ((match = SCRIPT_RE.exec(html))) {
    const attrs = parseAttrs(match[1]);
    scripts.push({ attrs, body: match[2] || '' });
  }
  return scripts;
}

function scriptType(attrs) {
  return String(attrs.type || '').trim().toLowerCase();
}

function isClassicScript(attrs) {
  const type = scriptType(attrs);
  return !type || [
    'text/javascript',
    'application/javascript',
    'application/ecmascript',
    'text/ecmascript',
  ].includes(type);
}

function isRemoteSrc(src) {
  return /^(?:[a-z]+:)?\/\//i.test(src);
}

function resolveLocalSrc(pageFile, src) {
  const clean = String(src || '').split(/[?#]/, 1)[0];
  if (!clean || isRemoteSrc(clean)) return null;
  return path.resolve(path.dirname(pageFile), clean);
}

function dummy() {
  return new Proxy(function () {}, {
    get: (target, prop) => (prop === 'then' ? undefined : dummy()),
    apply: () => dummy(),
    construct: () => dummy(),
    set: () => true,
  });
}

function createElement(tagName = 'div') {
  const attrs = {};
  const listeners = new Map();
  const node = {
    tagName: String(tagName).toUpperCase(),
    nodeName: String(tagName).toUpperCase(),
    nodeType: 1,
    style: {},
    dataset: {},
    children: [],
    childNodes: [],
    parentNode: null,
    parentElement: null,
    className: '',
    id: '',
    value: '0',
    checked: false,
    disabled: false,
    selected: false,
    type: '',
    name: '',
    href: '',
    download: '',
    options: [],
    width: 300,
    height: 150,
    offsetWidth: 300,
    offsetHeight: 150,
    innerHTML: '',
    textContent: '',
    classList: {
      add() {},
      remove() {},
      toggle() { return false; },
      contains() { return false; },
    },
    appendChild(child) {
      if (child && typeof child === 'object') {
        child.parentNode = node;
        child.parentElement = node;
        node.children.push(child);
        node.childNodes.push(child);
      }
      return child;
    },
    append(...children) {
      children.forEach(child => node.appendChild(child));
    },
    insertBefore(child, before) {
      if (child && typeof child === 'object') {
        child.parentNode = node;
        child.parentElement = node;
        const index = node.childNodes.indexOf(before);
        if (index >= 0) {
          node.childNodes.splice(index, 0, child);
          node.children.splice(Math.min(index, node.children.length), 0, child);
        } else {
          node.children.push(child);
          node.childNodes.push(child);
        }
      }
      return child;
    },
    remove() {},
    removeChild(child) {
      node.children = node.children.filter(item => item !== child);
      node.childNodes = node.childNodes.filter(item => item !== child);
      return child;
    },
    setAttribute(name, value) {
      attrs[name] = String(value);
      if (name === 'id') node.id = String(value);
      if (name === 'class') node.className = String(value);
      if (name === 'value') node.value = String(value);
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
    },
    hasAttribute(name) {
      return Object.prototype.hasOwnProperty.call(attrs, name);
    },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    removeEventListener() {},
    dispatchEvent(event) {
      for (const fn of listeners.get(event.type) || []) {
        if (typeof fn === 'function') fn.call(node, event);
      }
      return true;
    },
    querySelector() { return createElement(); },
    querySelectorAll() { return []; },
    closest() { return null; },
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 300, height: 150, right: 300, bottom: 150 };
    },
    getBBox() {
      return { x: 0, y: 0, width: 300, height: 150 };
    },
    getContext() {
      return dummy();
    },
    toDataURL() { return 'data:image/png;base64,'; },
    click() {},
    focus() {},
    blur() {},
    select() {},
    scrollIntoView() {},
  };
  Object.defineProperties(node, {
    firstChild: { get() { return node.childNodes[0] || null; } },
    firstElementChild: { get() { return node.children[0] || null; } },
    lastChild: { get() { return node.childNodes[node.childNodes.length - 1] || null; } },
    lastElementChild: { get() { return node.children[node.children.length - 1] || null; } },
  });
  return node;
}

function createRuntimeContext(pageFile, html) {
  const ids = new Map();
  const listeners = new Map();
  const timeouts = [];

  String(html).replace(/\bid\s*=\s*["']([^"']+)["']/gi, (_, id) => {
    const el = createElement();
    el.id = id;
    el.parentElement = createElement();
    el.parentNode = el.parentElement;
    ids.set(id, el);
    return '';
  });

  const documentElement = createElement('html');
  const body = createElement('body');
  const document = {
    readyState: 'loading',
    body,
    documentElement,
    createElement(tag) { return createElement(tag); },
    createElementNS(namespace, tag) { return createElement(tag); },
    createTextNode(text) {
      return { nodeType: 3, textContent: String(text), parentNode: null };
    },
    getElementById(id) {
      if (!ids.has(id)) {
        const el = createElement();
        el.id = id;
        el.parentElement = createElement();
        el.parentNode = el.parentElement;
        ids.set(id, el);
      }
      return ids.get(id);
    },
    querySelector() { return createElement(); },
    querySelectorAll() { return []; },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    removeEventListener() {},
    dispatchEvent(event) {
      for (const fn of listeners.get(event.type) || []) {
        if (typeof fn === 'function') fn.call(document, event);
      }
      return true;
    },
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
    sessionStorage: localStorage,
    navigator: {
      language: 'en-US',
      languages: ['en-US', 'en'],
      userAgent: 'HakoMachi runtime_check',
      maxTouchPoints: 0,
      clipboard: { writeText() { return Promise.resolve(); } },
    },
    devicePixelRatio: 1,
    location: {
      href: `file://${pageFile.replace(/\\/g, '/')}`,
      hash: '',
      search: '',
      pathname: `/${toRepoPath(pageFile)}`,
      assign() {},
      replace() {},
    },
    history: { pushState() {}, replaceState() {}, back() {} },
    setTimeout(fn) {
      if (typeof fn === 'function') timeouts.push(fn);
      return timeouts.length;
    },
    clearTimeout() {},
    setInterval() { return 1; },
    clearInterval() {},
    alert() {},
    confirm() { return true; },
    prompt() { return null; },
    Blob: class {
      constructor(parts = [], options = {}) {
        this.parts = parts;
        this.type = options.type || '';
      }
    },
    URL: {
      createObjectURL() { return 'blob:runtime-check'; },
      revokeObjectURL() {},
    },
    FileReader: class {},
    DOMParser: class { parseFromString() { return document; } },
    XMLSerializer: class { serializeToString() { return ''; } },
    Event: class {
      constructor(type) { this.type = type; }
    },
    MouseEvent: class {
      constructor(type) { this.type = type; }
    },
    requestAnimationFrame(fn) {
      if (typeof fn === 'function') timeouts.push(() => fn(0));
      return timeouts.length;
    },
    cancelAnimationFrame() {},
    performance: { now() { return 0; } },
    THREE: dummy(),
    JSZip: dummy(),
    SVGElement: class {},
    HTMLElement: class {},
    Image: class {},
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(fn);
    },
    removeEventListener() {},
    dispatchEvent(event) {
      for (const fn of listeners.get(event.type) || []) {
        if (typeof fn === 'function') fn.call(context, event);
      }
      return true;
    },
    open() { return null; },
    fetch() { return Promise.reject(new Error('fetch is unavailable in runtime_check')); },
    __fireEvent(type) {
      const event = { type, target: document, currentTarget: document, preventDefault() {}, stopPropagation() {} };
      document.readyState = type === 'DOMContentLoaded' ? 'interactive' : document.readyState;
      document.dispatchEvent(event);
      context.dispatchEvent(event);
      if (type === 'load') document.readyState = 'complete';
    },
    __flushTimers(limit = 100) {
      for (let i = 0; i < limit && timeouts.length; i += 1) {
        const fn = timeouts.shift();
        fn();
      }
    },
  };
  context.window = context;
  context.globalThis = context;
  context.self = context;
  return context;
}

function runScript(context, code, filename) {
  vm.runInContext(code, context, { filename });
}

function runBuildingSmoke(context) {
  if (typeof context.generateBuilding !== 'function') return null;
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
    throw new Error(`Missing globals: ${missing.join(', ')}`);
  }

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
  return parts.length;
}

function checkModuleSyntax(file) {
  const result = spawnSync(process.execPath, ['--check', file], {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || '').trim();
    throw new Error(`Module syntax check failed for ${toRepoPath(file)}${detail ? `\n${detail}` : ''}`);
  }
}

function moduleImports(code) {
  const imports = [];
  const patterns = [
    /\bimport\s+(?:[^'"]+\s+from\s+)?["']([^"']+)["']/g,
    /\bexport\s+[^'"]*\s+from\s+["']([^"']+)["']/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(code))) imports.push(match[1]);
  }
  return imports;
}

function resolveModuleImport(fromFile, specifier) {
  const clean = String(specifier || '').split(/[?#]/, 1)[0];
  if (!clean.startsWith('.')) return null;
  const base = path.resolve(path.dirname(fromFile), clean);
  const candidates = [base, `${base}.js`, path.join(base, 'index.js')];
  return candidates.find(candidate => fs.existsSync(candidate)) || base;
}

function checkModuleGraph(entryFile, checked = new Set()) {
  const real = fs.realpathSync(entryFile);
  if (checked.has(real)) return;
  checked.add(real);
  if (!fs.existsSync(entryFile)) throw new Error(`Missing module file: ${toRepoPath(entryFile)}`);
  const code = fs.readFileSync(entryFile, 'utf8');
  checkModuleSyntax(entryFile);
  for (const specifier of moduleImports(code)) {
    const imported = resolveModuleImport(entryFile, specifier);
    if (imported) checkModuleGraph(imported, checked);
  }
}

function checkPage(pageFile) {
  const pageLabel = toRepoPath(pageFile);
  const html = fs.readFileSync(pageFile, 'utf8');
  const scripts = parseScripts(html);
  const context = createRuntimeContext(pageFile, html);
  vm.createContext(context);

  let classicCount = 0;
  let moduleCount = 0;

  for (const [index, script] of scripts.entries()) {
    const type = scriptType(script.attrs);
    const srcFile = resolveLocalSrc(pageFile, script.attrs.src);

    if (script.attrs.src && !srcFile) continue;
    if (srcFile && !fs.existsSync(srcFile)) {
      throw new Error(`${pageLabel}: missing script ${script.attrs.src}`);
    }

    if (type === 'module') {
      if (srcFile) checkModuleGraph(srcFile);
      moduleCount += 1;
      continue;
    }

    if (!isClassicScript(script.attrs)) continue;

    const filename = srcFile
      ? toRepoPath(srcFile)
      : `${pageLabel} inline script #${index + 1}`;
    const code = srcFile ? fs.readFileSync(srcFile, 'utf8') : script.body;
    runScript(context, code, filename);
    classicCount += 1;
  }

  context.__fireEvent('DOMContentLoaded');
  context.__fireEvent('load');
  context.__flushTimers();

  const partsCount = runBuildingSmoke(context);
  return { pageLabel, classicCount, moduleCount, partsCount };
}

const failures = [];
const results = [];

for (const pageFile of listHtmlFiles(root)) {
  try {
    results.push(checkPage(pageFile));
  } catch (err) {
    failures.push({ page: toRepoPath(pageFile), err });
  }
}

for (const result of results) {
  const scriptSummary = `${result.classicCount} classic script${result.classicCount === 1 ? '' : 's'}, ${result.moduleCount} module script${result.moduleCount === 1 ? '' : 's'}`;
  const buildSummary = result.partsCount == null ? '' : `; generateBuilding parts: ${result.partsCount}`;
  console.log(`runtime ok: ${result.pageLabel} (${scriptSummary}${buildSummary})`);
}

if (failures.length) {
  for (const failure of failures) {
    console.error(`runtime check failed: ${failure.page}`);
    console.error(failure.err && failure.err.stack ? failure.err.stack : failure.err);
  }
  process.exit(1);
}
