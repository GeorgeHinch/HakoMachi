export const HAKOMACHI_SITE_URL = 'https://georgehinch.github.io/HakoMachi/';
export const HAKOMACHI_SITE_NAME = 'HakoMachi';

function absoluteUrl(path = '') {
  return new URL(path, HAKOMACHI_SITE_URL).href;
}

function upsertMeta(selector, attrs) {
  const doc = globalThis.document;
  if (!doc?.head) return null;
  let node = doc.head.querySelector(selector);
  if (!node) {
    node = doc.createElement('meta');
    doc.head.appendChild(node);
  }
  Object.entries(attrs).forEach(([key, value]) => {
    if (value !== undefined && value !== null) node.setAttribute(key, String(value));
  });
  return node;
}

function upsertLink(selector, attrs) {
  const doc = globalThis.document;
  if (!doc?.head) return null;
  let node = doc.head.querySelector(selector);
  if (!node) {
    node = doc.createElement('link');
    doc.head.appendChild(node);
  }
  Object.entries(attrs).forEach(([key, value]) => {
    if (value !== undefined && value !== null) node.setAttribute(key, String(value));
  });
  return node;
}

function upsertJsonLd(id, data) {
  const doc = globalThis.document;
  if (!doc?.head || !data) return null;
  let node = doc.head.querySelector(`script#${id}`);
  if (!node) {
    node = doc.createElement('script');
    node.id = id;
    node.type = 'application/ld+json';
    doc.head.appendChild(node);
  }
  node.textContent = JSON.stringify(data);
  return node;
}

export function installHakoMachiSeo({
  title,
  description,
  path = '',
  image = 'img/HakoMachi_Hero.jpg',
  type = 'website',
  keywords = [],
  jsonLd = null,
} = {}) {
  const doc = globalThis.document;
  if (!doc?.head) return;

  const resolvedTitle = title || HAKOMACHI_SITE_NAME;
  const resolvedDescription = description || 'Generate laser-cut buildings for Japanese N gauge model railways. 日本型Nゲージ鉄道模型向けにレーザーカット建物を作成できます。';
  const canonicalUrl = absoluteUrl(path);
  const imageUrl = absoluteUrl(image);

  doc.title = resolvedTitle;

  upsertLink('link[rel="canonical"]', { rel: 'canonical', href: canonicalUrl });
  upsertMeta('meta[name="description"]', { name: 'description', content: resolvedDescription });
  upsertMeta('meta[name="robots"]', { name: 'robots', content: 'index, follow' });
  upsertMeta('meta[name="theme-color"]', { name: 'theme-color', content: '#c8493a' });
  upsertMeta('meta[name="author"]', { name: 'author', content: 'HakoMachi' });
  if (keywords.length) {
    upsertMeta('meta[name="keywords"]', { name: 'keywords', content: keywords.join(', ') });
  }

  upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: HAKOMACHI_SITE_NAME });
  upsertMeta('meta[property="og:type"]', { property: 'og:type', content: type });
  upsertMeta('meta[property="og:locale"]', { property: 'og:locale', content: 'en_US' });
  upsertMeta('meta[property="og:locale:alternate"]', { property: 'og:locale:alternate', content: 'ja_JP' });
  upsertMeta('meta[property="og:title"]', { property: 'og:title', content: resolvedTitle });
  upsertMeta('meta[property="og:description"]', { property: 'og:description', content: resolvedDescription });
  upsertMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl });
  upsertMeta('meta[property="og:image"]', { property: 'og:image', content: imageUrl });

  upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
  upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: resolvedTitle });
  upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: resolvedDescription });
  upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: imageUrl });

  upsertJsonLd('hakomachi-seo-jsonld', jsonLd || {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: resolvedTitle,
    description: resolvedDescription,
    url: canonicalUrl,
    inLanguage: ['en', 'ja'],
    applicationCategory: 'DesignApplication',
    operatingSystem: 'Any modern web browser',
  });
}
