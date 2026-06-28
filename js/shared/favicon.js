export const HAKOMACHI_FAVICON_PATH = 'assets/hakomachi-house-favicon.svg';

export function installHakoMachiFavicon(path = HAKOMACHI_FAVICON_PATH) {
  const doc = globalThis.document;
  if (!doc?.head) return;
  const link = doc.querySelector('link[rel~="icon"]') || doc.createElement('link');
  link.rel = 'icon';
  link.type = 'image/svg+xml';
  link.href = path;
  if (!link.parentNode) doc.head.appendChild(link);
}
