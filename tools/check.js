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
