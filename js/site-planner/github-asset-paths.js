import { approxDataUrlBytes, dataUrlInfo, mimeExtension } from '../shared/browser-utils.js';
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
