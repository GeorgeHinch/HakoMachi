/* Shared local-browser GitHub data repository helpers for HakoMachi tools. */

export const SETTINGS_KEY = 'hakomachi_github_data_settings_v1';
export const DEFAULT_LIBRARY_PATH = 'footprints/library.json';
export const DEFAULT_BUILDINGS_DIR = 'buildings';
export const DEFAULT_SITE_PLANS_DIR = 'site-plans';

export function cleanRepoPath(path) {
  return String(path || '')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '');
}

export function slugify(input, fallback = 'hakomachi-building') {
  const slug = String(input || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || fallback;
}

export function getSettings() {
  let raw = {};
  try {
    raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') || {};
  } catch (_) {}
  return {
    repoFullName: String(raw.repoFullName || '').trim(),
    branch: String(raw.branch || 'main').trim() || 'main',
    token: String(raw.token || '').trim(),
    libraryPath: cleanRepoPath(raw.libraryPath || DEFAULT_LIBRARY_PATH),
    buildingsDir: cleanRepoPath(raw.buildingsDir || DEFAULT_BUILDINGS_DIR),
    sitePlansDir: cleanRepoPath(raw.sitePlansDir || DEFAULT_SITE_PLANS_DIR),
  };
}

export function saveSettings(next) {
  const current = getSettings();
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    repoFullName: String(next.repoFullName || '').trim(),
    branch: String(next.branch || 'main').trim() || 'main',
    token: String(next.token || '').trim(),
    libraryPath: cleanRepoPath(next.libraryPath || DEFAULT_LIBRARY_PATH),
    buildingsDir: cleanRepoPath(next.buildingsDir || current.buildingsDir || DEFAULT_BUILDINGS_DIR),
    sitePlansDir: cleanRepoPath(next.sitePlansDir || current.sitePlansDir || DEFAULT_SITE_PLANS_DIR),
  }));
}

function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(String(str));
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function base64ToUtf8(b64) {
  const bin = atob(String(b64 || '').replace(/\s+/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function assertSettings(settings, message = 'Add GitHub data settings first.') {
  if (!settings || !settings.repoFullName || !settings.repoFullName.includes('/') || !settings.token) {
    throw new Error(message);
  }
}

export async function githubRequest(settings, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      Authorization: 'Bearer ' + settings.token,
      ...(options.headers || {}),
    },
  });
  if (response.status === 404 && options.allow404) return null;
  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json();
      detail = body && body.message ? ': ' + body.message : '';
    } catch (_) {
      try { detail = ': ' + await response.text(); } catch (__) {}
    }
    throw new Error('GitHub API ' + response.status + detail);
  }
  return response.json();
}

async function githubTextRequest(settings, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/vnd.github.raw',
      'X-GitHub-Api-Version': '2022-11-28',
      Authorization: 'Bearer ' + settings.token,
      ...(options.headers || {}),
    },
  });
  if (response.status === 404 && options.allow404) return null;
  if (!response.ok) {
    let detail = '';
    try { detail = ': ' + await response.text(); } catch (_) {}
    throw new Error('GitHub API ' + response.status + detail);
  }
  return response.text();
}

export function contentsUrl(settings, path) {
  const repo = encodeURIComponent(settings.repoFullName).replace('%2F', '/');
  const cleanPath = cleanRepoPath(path).split('/').map(encodeURIComponent).join('/');
  return 'https://api.github.com/repos/' + repo + '/contents/' + cleanPath;
}

export async function readGithubFile(settings, path) {
  const url = contentsUrl(settings, path) + '?ref=' + encodeURIComponent(settings.branch || 'main');
  const data = await githubRequest(settings, url, { method: 'GET', allow404: true });
  if (!data) return null;
  let text = '';
  if (data.content && data.encoding === 'base64') {
    text = base64ToUtf8(data.content || '');
  } else if (data.content) {
    text = String(data.content || '');
  } else {
    text = await githubTextRequest(settings, url, { method: 'GET', allow404: true });
    if (text == null) return null;
  }
  return {
    sha: data.sha,
    text,
  };
}

export async function writeGithubFile(settings, path, text, message) {
  const current = await readGithubFile(settings, path);
  const body = {
    message,
    content: utf8ToBase64(text),
    branch: settings.branch || 'main',
  };
  if (current && current.sha) body.sha = current.sha;
  return githubRequest(settings, contentsUrl(settings, path), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function defaultLibrary() {
  return {
    schema: 'hakomachi.data-library',
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    records: {
      buildings: [],
      sitePlans: [],
    },
  };
}

export function normalizeLibrary(library) {
  const lib = library && typeof library === 'object' ? library : defaultLibrary();
  lib.schema = lib.schema || 'hakomachi.data-library';
  lib.schemaVersion = Math.max(1, Number(lib.schemaVersion) || 1);
  if (!lib.records || typeof lib.records !== 'object') lib.records = {};
  if (!Array.isArray(lib.records.buildings)) lib.records.buildings = [];
  if (!Array.isArray(lib.records.sitePlans)) lib.records.sitePlans = [];
  return lib;
}

export async function loadLibrary(settings) {
  const file = await readGithubFile(settings, settings.libraryPath || DEFAULT_LIBRARY_PATH);
  if (!file) return defaultLibrary();
  try {
    return normalizeLibrary(JSON.parse(file.text));
  } catch (err) {
    throw new Error('Could not parse footprint library JSON: ' + (err && err.message ? err.message : err));
  }
}

export function upsertRecord(library, recordType, record) {
  const lib = normalizeLibrary(library);
  if (!Array.isArray(lib.records[recordType])) lib.records[recordType] = [];
  const records = lib.records[recordType];
  const index = records.findIndex(item => item && item.id === record.id);
  if (index >= 0) {
    record.createdAt = records[index].createdAt || record.createdAt;
    records[index] = { ...records[index], ...record };
  } else {
    records.push(record);
  }
  records.sort((a, b) => String(a.name || a.id).localeCompare(String(b.name || b.id)));
  lib.updatedAt = new Date().toISOString();
  return lib;
}

const githubData = Object.freeze({
  SETTINGS_KEY,
  DEFAULT_LIBRARY_PATH,
  DEFAULT_BUILDINGS_DIR,
  DEFAULT_SITE_PLANS_DIR,
  cleanRepoPath,
  slugify,
  getSettings,
  saveSettings,
  assertSettings,
  githubRequest,
  contentsUrl,
  readGithubFile,
  writeGithubFile,
  defaultLibrary,
  normalizeLibrary,
  loadLibrary,
  upsertRecord,
});

export default githubData;
