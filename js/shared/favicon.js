import { HAKOMACHI_SITE_URL } from './seo.js';

export const HAKOMACHI_FAVICON_PATH = new URL('assets/hakomachi-house-favicon.svg', HAKOMACHI_SITE_URL).href;

export function installHakoMachiFavicon(path = HAKOMACHI_FAVICON_PATH) {
  const doc = globalThis.document;
  if (!doc?.head) return;
  const link = doc.querySelector('link[rel~="icon"]') || doc.createElement('link');
  link.rel = 'icon';
  link.type = 'image/svg+xml';
  link.href = path;
  if (!link.parentNode) doc.head.appendChild(link);
}
