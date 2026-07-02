import { approxDataUrlBytes, base64ByteLength, dataUrlInfo, mimeExtension } from '../shared/browser-utils.js';
import githubData from '../shared/github-data.js';

export function simpleAssetHash(text) {
  const value = String(text || '');
  let h1 = 0xdeadbeef ^ value.length;
  let h2 = 0x41c6ce57 ^ value.length;
  for (let i = 0; i < value.length; i++) {
    const ch = value.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return ((h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0'));
}

export function imageAssetFileName(meta) {
  const name = meta?.name || 'reference-image';
  const base = githubData.slugify(String(name).replace(/\.[a-z0-9]{2,8}$/i, '') || 'reference-image', 'building');
  return `${base || 'reference-image'}.${mimeExtension(meta?.mimeType, name)}`;
}

export function imageAssetReference(path, meta, dataUrl, image = null) {
  const info = dataUrlInfo(dataUrl || meta?.dataUrl);
  return {
    schema: 'hakomachi.site-image-asset',
    schemaVersion: 1,
    path,
    name: meta?.name || 'reference-image',
    mimeType: meta?.mimeType || info?.mimeType || 'application/octet-stream',
    naturalWidthPx: meta?.naturalWidthPx || image?.naturalWidth || image?.width || null,
    naturalHeightPx: meta?.naturalHeightPx || image?.naturalHeight || image?.height || null,
    byteLength: info?.byteLength || approxDataUrlBytes(dataUrl || meta?.dataUrl),
    hash: info ? simpleAssetHash(info.data) : (meta?.asset?.hash || null),
  };
}

export function imageAssetCacheKey(asset) {
  if (!asset?.path) return null;
  return 'hakomachiSitePlannerImageAsset_v1:' + [asset.path, asset.hash || '', asset.byteLength || ''].join('|');
}

export function cacheImageAsset(asset, dataUrl) {
  const key = imageAssetCacheKey(asset);
  if (!key || !dataUrl) return;
  try { sessionStorage.setItem(key, dataUrl); } catch (_err) {}
  try { localStorage.setItem(key, dataUrl); } catch (_err) {}
}

export function cachedImageAsset(asset) {
  const key = imageAssetCacheKey(asset);
  if (!key) return null;
  try { return sessionStorage.getItem(key) || localStorage.getItem(key); } catch (_err) { return null; }
}

export function imageMetaForProject(imageMeta, image = null, opts = {}) {
  if (!imageMeta) return null;
  const includeDataUrl = opts.includeDataUrl !== false;
  const meta = { ...imageMeta };
  meta.name = meta.name || 'reference-image';
  meta.mimeType = meta.mimeType || (typeof meta.dataUrl === 'string' ? (meta.dataUrl.match(/^data:([^;]+);/) || [])[1] : undefined) || 'application/octet-stream';
  meta.naturalWidthPx = Number.isFinite(meta.naturalWidthPx) ? meta.naturalWidthPx : (image?.naturalWidth || image?.width || null);
  meta.naturalHeightPx = Number.isFinite(meta.naturalHeightPx) ? meta.naturalHeightPx : (image?.naturalHeight || image?.height || null);
  meta.originalPixelDimensionsRequired = true;
  meta.dataUrlByteLength = approxDataUrlBytes(meta.dataUrl);
  meta.embeddedInProject = !!(includeDataUrl && meta.dataUrl);
  if (opts.asset) meta.asset = opts.asset;
  if (!includeDataUrl) delete meta.dataUrl;
  return meta;
}

export function uniqueHakoAssetFileName(building, usedNames) {
  const sourceName = building?.hakoFile?.fileName || building?.hakoFileId || building?.name || 'building.hako';
  const base = githubData.slugify(String(sourceName).replace(/\.(hako|hakoseed|hakoplan|json)$/i, '') || building?.name || 'building', 'building');
  let fileName = `${base || 'building'}.hako`;
  let suffix = 2;
  while (usedNames.has(fileName.toLowerCase())) {
    fileName = `${base || 'building'}-${suffix}.hako`;
    suffix++;
  }
  usedNames.add(fileName.toLowerCase());
  return fileName;
}

export function hakoFileAssetReference(path, building, text) {
  const file = building?.hakoFile || {};
  return {
    schema: 'hakomachi.site-building-hako-asset',
    schemaVersion: 1,
    kind: 'building-hako',
    path,
    sourceBuildingId: building?.id || null,
    name: building?.name || file.fileName || 'Building',
    fileName: file.fileName || `${githubData.slugify(building?.name || 'building', 'building')}.hako`,
    mimeType: file.mimeType || 'application/json',
    byteLength: new TextEncoder().encode(String(text || '')).byteLength,
    hash: text ? simpleAssetHash(text) : (file.hash || null),
    importedAt: file.importedAt || null,
    source: file.source || null,
  };
}

export function uniqueStlAssetFileName(obj, usedNames) {
  const sourceName = obj?.asset?.fileName || obj?.fileName || obj?.name || 'site-object.stl';
  const base = githubData.slugify(String(sourceName).replace(/\.stl$/i, '') || obj?.name || 'site-object', 'building');
  let fileName = `${base || 'site-object'}.stl`;
  let suffix = 2;
  while (usedNames.has(fileName.toLowerCase())) {
    fileName = `${base || 'site-object'}-${suffix}.stl`;
    suffix++;
  }
  usedNames.add(fileName.toLowerCase());
  return fileName;
}

export function uniqueStlSourceAssetFileName(source, usedNames) {
  const rawName = String(source?.fileName || source?.name || 'source-file');
  const match = rawName.match(/\.([a-z0-9]{1,12})$/i);
  const ext = match ? `.${match[1].toLowerCase()}` : '.source';
  const rawBase = match ? rawName.slice(0, -match[0].length) : rawName;
  const base = githubData.slugify(rawBase || 'source-file', 'building') || 'source-file';
  let fileName = `${base}${ext}`;
  let suffix = 2;
  while (usedNames.has(fileName.toLowerCase())) {
    fileName = `${base}-${suffix}${ext}`;
    suffix++;
  }
  usedNames.add(fileName.toLowerCase());
  return fileName;
}

export function stlAssetReference(path, obj, dataBase64) {
  return {
    schema: 'hakomachi.site-stl-asset',
    schemaVersion: 1,
    kind: 'stl',
    path,
    sourceObjectId: obj?.id || null,
    name: obj?.name || obj?.asset?.fileName || 'STL Object',
    fileName: obj?.asset?.fileName || `${githubData.slugify(obj?.name || 'site-object', 'building')}.stl`,
    mimeType: obj?.asset?.mimeType || 'model/stl',
    byteLength: base64ByteLength(dataBase64),
    hash: dataBase64 ? simpleAssetHash(dataBase64) : (obj?.asset?.hash || null),
  };
}

export function stlSourceAssetReference(path, obj, source, dataBase64) {
  return {
    schema: 'hakomachi.site-stl-source-asset',
    schemaVersion: 1,
    kind: 'stl-source',
    path,
    sourceObjectId: obj?.id || null,
    sourceAssetId: source?.id || null,
    name: source?.name || source?.fileName || 'Source file',
    fileName: source?.fileName || source?.name || 'source-file',
    mimeType: source?.mimeType || 'application/octet-stream',
    byteLength: base64ByteLength(dataBase64),
    hash: dataBase64 ? simpleAssetHash(dataBase64) : (source?.hash || null),
    importedAt: source?.importedAt || null,
  };
}

export function githubSiteAssetFolderPath(settings, defaultSiteDir, siteId) {
  const root = githubData.cleanRepoPath(settings.sitePlansDir || defaultSiteDir);
  return githubData.cleanRepoPath(`${root}/${siteId}/assets`);
}

export function githubImageAssetPath(settings, defaultSiteDir, siteId, meta) {
  return githubData.cleanRepoPath(`${githubSiteAssetFolderPath(settings, defaultSiteDir, siteId)}/${imageAssetFileName(meta)}`);
}

export function githubHakoAssetPath(settings, defaultSiteDir, siteId, fileName) {
  return githubData.cleanRepoPath(`${githubSiteAssetFolderPath(settings, defaultSiteDir, siteId)}/buildings/${fileName}`);
}

export function githubStlAssetPath(settings, defaultSiteDir, siteId, fileName) {
  return githubData.cleanRepoPath(`${githubSiteAssetFolderPath(settings, defaultSiteDir, siteId)}/stl/${fileName}`);
}

export function githubStlSourceAssetPath(settings, defaultSiteDir, siteId, fileName) {
  return githubData.cleanRepoPath(`${githubSiteAssetFolderPath(settings, defaultSiteDir, siteId)}/stl/sources/${fileName}`);
}
