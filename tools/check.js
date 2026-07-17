const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const args = new Set(process.argv.slice(2));
const syntaxOnly = args.has('--syntax-only');
const includeBrowser = args.has('--browser');

const SKIPPED_DIRS = new Set([
  '.git',
  'node_modules',
  '.playwright',
  'playwright-report',
  'test-results',
]);
const CACHE_VERSION_SKIPPED_DIRS = new Set([...SKIPPED_DIRS, 'docs', 'tools', 'tests']);

function relative(filePath) {
  return path.relative(root, filePath).replace(/\\/g, '/');
}

function collectJavaScriptFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIPPED_DIRS.has(entry.name)) continue;
      collectJavaScriptFiles(path.join(dir, entry.name), files);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

function collectCacheVersionFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (CACHE_VERSION_SKIPPED_DIRS.has(entry.name)) continue;
      collectCacheVersionFiles(path.join(dir, entry.name), files);
      continue;
    }

    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (ext === '.html' || ext === '.js') files.push(path.join(dir, entry.name));
  }
  return files;
}

function run(label, command, commandArgs, options = {}) {
  process.stdout.write(`\n== ${label} ==\n`);
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit',
    shell: false,
    ...options,
  });

  if (result.error) {
    process.stderr.write(`${label} failed to start: ${result.error.message}\n`);
    return false;
  }
  if (result.status !== 0) {
    process.stderr.write(`${label} failed with exit code ${result.status}.\n`);
    return false;
  }
  return true;
}

function runCacheVersionCheck() {
  process.stdout.write('\n== cache-busting versions ==\n');
  const found = new Map();
  for (const file of collectCacheVersionFiles(root)) {
    const text = fs.readFileSync(file, 'utf8');
    const matches = text.matchAll(/\?v=([A-Za-z0-9._-]+)/g);
    for (const match of matches) {
      const version = match[1];
      if (!found.has(version)) found.set(version, []);
      found.get(version).push(relative(file));
    }
  }

  if (!found.size) {
    process.stdout.write('No cache-busting query strings found.\n');
    return true;
  }
  if (found.size > 1) {
    process.stderr.write('Expected one shared ?v= token across runtime HTML and JS files.\n');
    for (const [version, files] of found.entries()) {
      process.stderr.write(`  ${version}: ${[...new Set(files)].join(', ')}\n`);
    }
    process.stderr.write('Run: node tools/update-cache-version.js <version-token>\n');
    return false;
  }

  const [version] = found.keys();
  process.stdout.write(`Shared asset version: ${version}\n`);
  return true;
}

function runSyntaxChecks() {
  const files = collectJavaScriptFiles(root).sort((a, b) => relative(a).localeCompare(relative(b)));
  process.stdout.write(`\n== JavaScript syntax (${files.length} files) ==\n`);

  for (const file of files) {
    const label = relative(file);
    const result = spawnSync(process.execPath, ['--check', file], {
      cwd: root,
      encoding: 'utf8',
      stdio: 'pipe',
      shell: false,
    });

    if (result.status !== 0 || result.error) {
      process.stderr.write(`\n${label}\n`);
      if (result.error) process.stderr.write(`${result.error.message}\n`);
      if (result.stdout) process.stderr.write(result.stdout);
      if (result.stderr) process.stderr.write(result.stderr);
      return false;
    }
  }

  process.stdout.write('All JavaScript files passed node --check.\n');
  return true;
}

let ok = runSyntaxChecks();

if (ok && !syntaxOnly) {
  ok = runCacheVersionCheck();
}

if (ok && !syntaxOnly) {
  ok = run('i18n checks', process.execPath, [path.join('tools', 'i18n', 'check.js')]);
}

if (ok && !syntaxOnly) {
  ok = run('runtime check', process.execPath, [path.join('tools', 'runtime_check.js')]);
}

if (ok && includeBrowser) {
  ok = run('Playwright browser checks', process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'check:browser']);
}

if (!ok) process.exit(1);

process.stdout.write('\nHakoMachi checks passed.\n');
