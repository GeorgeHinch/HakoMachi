import { appKeyForPath, navigationTargetForHref } from './hakomachi-tool-registry.js';

const ANALYTICS_CONFIG = Object.freeze({
  provider: 'google-analytics',
  measurementId: 'G-EVTQYBFJXS',
  productionHosts: Object.freeze([
    'georgehinch.github.io'
  ]),
  disableStorageKey: 'hakomachiAnalyticsDisabled'
});

const SAFE_PARAM_KEYS = new Set([
  'app',
  'page',
  'feature',
  'action',
  'target',
  'mode',
  'source',
  'surface',
  'tool',
  'generator',
  'status',
  'language'
]);

const SAFE_ID_EVENTS = Object.freeze({
  saveBtn: ['hm_save', { feature: 'save', action: 'local_save' }],
  exportBtn: ['hm_export', { feature: 'building_export', action: 'download' }],
  exportConfigBtn: ['hm_export', { feature: 'building_settings', action: 'download_hako' }],
  svgBtn: ['hm_export', { feature: 'site_svg', action: 'download' }],
  roadAssetSvgBtn: ['hm_export', { feature: 'road_assets_svg', action: 'download' }],
  mobileRoadAssetSvgBtn: ['hm_export', { feature: 'road_assets_svg', action: 'download' }],
  githubSaveBtn: ['hm_github', { feature: 'site_plan', action: 'save' }],
  githubLoadBtn: ['hm_github', { feature: 'site_plan', action: 'load' }],
  githubSettingsBtn: ['hm_github', { feature: 'settings', action: 'open' }],
  githubBuildingsBtn: ['hm_github', { feature: 'footprint_library', action: 'open' }],
  generateFabricBtn: ['hm_generate', { feature: 'fabric_area', action: 'generate' }],
  openingEditorBtn: ['hm_editor', { feature: 'openings', action: 'open' }],
  view2dCanvasBtn: ['hm_view_mode', { feature: 'site_planner', mode: '2d', action: 'switch' }],
  view3dCanvasBtn: ['hm_view_mode', { feature: 'site_planner', mode: '3d', action: 'switch' }],
  site3dImageVisible: ['hm_view_mode', { feature: 'site_3d_reference_image', action: 'toggle' }],
  site3dImageOpacity: ['hm_view_mode', { feature: 'site_3d_reference_image', action: 'opacity_change' }],
  jumpPreview: ['hm_view', { feature: 'utility_preview', action: 'jump' }],
  openSvgPreview: ['hm_view', { feature: 'utility_svg_preview', action: 'open' }],
  downloadSvg: ['hm_export', { feature: 'utility_svg', action: 'download' }],
  downloadSettings: ['hm_export', { feature: 'utility_settings', action: 'download' }],
  refreshPreview: ['hm_generate', { feature: 'utility_preview', action: 'refresh' }],
  downloadCombinedSvg: ['hm_export', { feature: 'utility_combined_svg', action: 'download' }],
  downloadPartZip: ['hm_export', { feature: 'utility_part_zip', action: 'download' }],
  downloadBtn: ['hm_export', { feature: 'utility_svg', action: 'download' }],
  copyBtn: ['hm_export', { feature: 'utility_svg', action: 'copy' }],
  saveProfileBtn: ['hm_save', { feature: 'material_profile', action: 'browser_save' }],
  saveGithubSettingsBtn: ['hm_github', { feature: 'material_settings', action: 'save' }],
  saveGithubBtn: ['hm_github', { feature: 'material_profile', action: 'save' }],
  loadGithubBtn: ['hm_github', { feature: 'material_profile', action: 'load' }],
  addMaterialBtn: ['hm_editor', { feature: 'material_profile', action: 'add_material' }],
  languageSelect: ['hm_language', { feature: 'language', action: 'change' }]
});

function storageValue(key) {
  try {
    return window.localStorage?.getItem(key) || window.sessionStorage?.getItem(key) || '';
  } catch (error) {
    return '';
  }
}

function urlFlag(name) {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has(name)) return params.get(name) || '1';
    if (window.location.hash.includes(name)) return '1';
  } catch (error) {
    return '';
  }
  return '';
}

function isAutomatedBrowser() {
  const win = window;
  return Boolean(
    navigator.webdriver ||
    win.__playwright ||
    win.__pw ||
    win.Playwright ||
    win.__TAURI_INTERNALS__
  );
}

function isLocalContext() {
  const host = window.location.hostname;
  return (
    window.location.protocol === 'file:' ||
    !host ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1'
  );
}

function productionHostMatches() {
  return ANALYTICS_CONFIG.productionHosts.includes(window.location.hostname);
}

function disabledReason() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return 'non_browser';
  if (window.__HAKOMACHI_DISABLE_ANALYTICS__) return 'window_override';
  if (isAutomatedBrowser()) return 'automated_browser';
  if (urlFlag('hm_analytics') === '0' || urlFlag('analytics') === '0') return 'url_disabled';
  if (/^(1|true|yes)$/i.test(storageValue(ANALYTICS_CONFIG.disableStorageKey))) return 'storage_disabled';
  if (isLocalContext()) return 'local_context';
  if (!productionHostMatches() && urlFlag('hm_analytics') !== '1') return 'non_production_host';
  return '';
}

function detectAppName() {
  return appKeyForPath(window.location.pathname, 'landing');
}

function cleanToken(value, fallback = 'unknown') {
  const cleaned = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  return cleaned || fallback;
}

function cleanParams(params) {
  const output = {};
  Object.entries(params || {}).forEach(([key, value]) => {
    if (!SAFE_PARAM_KEYS.has(key)) return;
    if (typeof value === 'boolean') {
      output[key] = value ? 'true' : 'false';
      return;
    }
    if (typeof value === 'number') {
      output[key] = Number.isFinite(value) ? value : 0;
      return;
    }
    output[key] = cleanToken(value);
  });
  output.app = output.app || detectAppName();
  output.page = output.page || cleanToken(window.location.pathname.split('/').pop() || 'index');
  return output;
}

function injectGoogleTag(measurementId) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag() {
    window.dataLayer.push(arguments);
  };

  const existing = document.querySelector('script[data-hakomachi-analytics="google-tag"]');
  if (!existing) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.dataset.hakomachiAnalytics = 'google-tag';
    document.head.appendChild(script);
  }

  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: true
  });
}

function hrefTarget(element) {
  const href = element.getAttribute('href') || '';
  return navigationTargetForHref(href);
}

function eventForElement(element) {
  if (!element) return null;
  const explicit = element.getAttribute('data-analytics-event');
  if (explicit) {
    return [cleanToken(explicit, 'hm_action'), {
      feature: element.getAttribute('data-analytics-feature') || 'custom',
      action: element.getAttribute('data-analytics-action') || 'click',
      target: element.getAttribute('data-analytics-target') || ''
    }];
  }

  if (element.id && SAFE_ID_EVENTS[element.id]) return SAFE_ID_EVENTS[element.id];

  if (element.matches('a[href]')) {
    const target = hrefTarget(element);
    if (target) return ['hm_navigation', { feature: 'navigation', action: 'open', target }];
  }

  const id = cleanToken(element.id || element.name || '');
  if (!id) return null;
  if (id.includes('github')) return ['hm_github', { feature: 'github', action: 'open' }];
  if (id.includes('download') || id.includes('export') || id.includes('svg')) return ['hm_export', { feature: 'export', action: 'download' }];
  if (id.includes('generate') || id.includes('refreshpreview')) return ['hm_generate', { feature: 'generator', action: 'generate' }];
  if (id.includes('view2d')) return ['hm_view_mode', { feature: 'view', mode: '2d', action: 'switch' }];
  if (id.includes('view3d')) return ['hm_view_mode', { feature: 'view', mode: '3d', action: 'switch' }];
  return null;
}

function installDelegatedTracking(api) {
  document.addEventListener('click', (event) => {
    const element = event.target?.closest?.('[data-analytics-event], a[href], button, label[for]');
    const spec = eventForElement(element);
    if (!spec) return;
    api.track(spec[0], spec[1]);
  }, { passive: true });

  document.addEventListener('change', (event) => {
    const element = event.target;
    if (!element?.id) return;
    if (element.id === 'languageSelect') {
      api.track('hm_language', { feature: 'language', action: 'change', language: element.value });
      return;
    }
    if (element.id === 'site3dImageVisible') {
      api.track('hm_view_mode', { feature: 'site_3d_reference_image', action: 'toggle', status: element.checked ? 'enabled' : 'disabled' });
      return;
    }
    if (element.id === 'site3dImageOpacity') {
      api.track('hm_view_mode', { feature: 'site_3d_reference_image', action: 'opacity_change' });
    }
  }, { passive: true });
}

function createAnalyticsApi() {
  const reason = disabledReason();
  const enabled = !reason;

  const api = {
    enabled,
    reason,
    config: {
      provider: ANALYTICS_CONFIG.provider,
      measurementId: ANALYTICS_CONFIG.measurementId
    },
    track(eventName, params = {}) {
      if (!enabled || typeof window.gtag !== 'function') return false;
      const safeName = cleanToken(eventName, 'hm_action').slice(0, 40);
      window.gtag('event', safeName, cleanParams(params));
      return true;
    }
  };

  document.documentElement.dataset.hakomachiAnalytics = enabled ? 'enabled' : 'disabled';
  document.documentElement.dataset.hakomachiAnalyticsReason = reason || 'enabled';
  window.HakoMachiAnalytics = api;

  if (enabled) {
    injectGoogleTag(ANALYTICS_CONFIG.measurementId);
    api.track('hm_app_view', { feature: 'app', action: 'view', app: detectAppName() });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => installDelegatedTracking(api), { once: true });
  } else {
    installDelegatedTracking(api);
  }

  return api;
}

const HakoMachiAnalytics = createAnalyticsApi();

export {
  ANALYTICS_CONFIG as HAKOMACHI_ANALYTICS_CONFIG,
  HakoMachiAnalytics
};
