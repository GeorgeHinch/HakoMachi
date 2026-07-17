const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const nextVersion = process.argv[2];

if (!nextVersion || !/^[A-Za-z0-9._-]+$/.test(nextVersion)) {
  process.stderr.write('Usage: node tools/update-cache-version.js <version-token>\n');
  process.stderr.write('Use only letters, numbers, dots, underscores, or hyphens.\n');
  process.exit(1);
}

const SKIPPED_DIRS = new Set([
  '.git',
  'node_modules',
  '.playwright',
  'playwright-report',
  'docs',
  'tools',
  'test-results',
  'tests',
]);

function collectRuntimeFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIPPED_DIRS.has(entry.name)) continue;
      collectRuntimeFiles(path.join(dir, entry.name), files);
      continue;
    }
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (ext === '.html' || ext === '.js') files.push(path.join(dir, entry.name));
  }
  return files;
}

let changed = 0;
for (const file of collectRuntimeFiles(root)) {
  const original = fs.readFileSync(file, 'utf8');
  const updated = original.replace(/\?v=[A-Za-z0-9._-]+/g, `?v=${nextVersion}`);
  if (updated === original) continue;
  fs.writeFileSync(file, updated);
  changed += 1;
  process.stdout.write(`updated ${path.relative(root, file).replace(/\\/g, '/')}\n`);
}

process.stdout.write(`Cache version set to ${nextVersion} in ${changed} file${changed === 1 ? '' : 's'}.\n`);
