import '../building-generator-runtime.js?v=hm-assets-20260804-6';
import {
  buildingPreviewRenderer,
  installBuildingPreviewGlobal,
  previewModules,
} from './preview/index.js?v=hm-assets-20260804-6';
import { createHakoMachiLogger } from '../shared/hakomachi-diagnostics.js';

const logger = createHakoMachiLogger('Building Generator');

window.HakoMachiBuildingGenerator = Object.freeze({
  ...(window.HakoMachiBuildingGenerator || {}),
  runtime: window.HakoMachiBuildingGeneratorRuntime,
  preview: previewModules,
});

document.documentElement.dataset.buildingGeneratorModule = 'ready';
document.documentElement.dataset.buildingGeneratorPreviewModules = String(Object.keys(previewModules).length);

window.dispatchEvent(new CustomEvent('hakomachi:building-generator-module-ready', {
  detail: window.HakoMachiBuildingGenerator,
}));

function refreshBuildingPreview() {
  try {
    const config = window.HakoMachiBuildingGeneratorRuntime?.CONFIG
      || globalThis.HakoMachiBuildingGeneratorRuntime?.CONFIG
      || window.CONFIG
      || globalThis.CONFIG;
    previewModules.threePreview?.setThreePreviewConfig?.(config);
    previewModules.threePreview?.updateThreePreview?.(config);
  } catch (err) {
    logger.error('3D preview refresh error:', err);
  }
}

let buildingPreviewRefreshTimer = null;
function scheduleBuildingPreviewRefresh(delayMs = 0) {
  if (buildingPreviewRefreshTimer != null) {
    window.clearTimeout?.(buildingPreviewRefreshTimer);
  }
  buildingPreviewRefreshTimer = window.setTimeout?.(() => {
    buildingPreviewRefreshTimer = null;
    refreshBuildingPreview();
  }, delayMs);
}

window.addEventListener('hakomachi:building-generator-regenerated', event => {
  try {
    const config = event.detail?.config
      || window.HakoMachiBuildingGeneratorRuntime?.CONFIG
      || window.CONFIG;
    previewModules.threePreview?.setThreePreviewConfig?.(config);
  } catch (_) {
    /* The scheduled refresh below will report real preview errors. */
  }
  scheduleBuildingPreviewRefresh(0);
});

const SITE_PLANNER_BUILDING_UPDATE_KEY = 'hakomachiSitePlannerBuildingUpdate_v1';

function cloneJson(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function currentGeneratorConfigForPlanner() {
  const runtime = window.HakoMachiBuildingGeneratorRuntime || globalThis.HakoMachiBuildingGeneratorRuntime;
  const config = runtime?.CONFIG || window.CONFIG || globalThis.CONFIG;
  if (!config) throw new Error('Building config is not available yet.');
  runtime?.readForm?.();
  runtime?.upgradeConfigToCurrentStorage?.(config);
  return runtime?.serializableCurrentConfig
    ? runtime.serializableCurrentConfig(config)
    : cloneJson(config);
}

function plannerHandoffFromConfig(config) {
  const handoff = config?.hakomachiHandoff || config?.sitePlannerHandoff || null;
  const source = config?.sitePlanSeedSource || {};
  const building = handoff?.building || {};
  return {
    plannerId: building.plannerId || handoff?.buildingId || source.sourceId || null,
    name: building.name || config?.buildingName || null,
    sitePlan: handoff?.sitePlan || null,
  };
}

function currentGeneratorConfigForPlannerHandoff() {
  return window.HakoMachiBuildingGeneratorRuntime?.CONFIG
    || globalThis.HakoMachiBuildingGeneratorRuntime?.CONFIG
    || window.CONFIG
    || globalThis.CONFIG
    || null;
}

function hasSitePlannerHandoff(config) {
  return !!(
    config?.hakomachiHandoff
    || config?.sitePlannerHandoff
    || config?.sitePlanSeedSource?.sourceId
  );
}

function showBridgeStatus(text, kind = 'ok') {
  const flash = window.HakoMachiBuildingGeneratorRuntime?.flashMessage || globalThis.flashMessage;
  if (typeof flash === 'function') {
    flash(text, kind);
    return;
  }
  const box = document.getElementById('warnings');
  if (!box) return;
  const cls = kind === 'err' ? 'warn' : kind === 'ok' ? 'ok-msg' : 'warn';
  const div = document.createElement('div');
  div.className = cls;
  div.textContent = text;
  box.replaceChildren(div);
}

function makeSitePlannerBuildingUpdate() {
  const hakoConfig = currentGeneratorConfigForPlanner();
  const handoff = plannerHandoffFromConfig(hakoConfig);
  return {
    type: 'hakomachi:site-planner-building-update',
    schema: 'hakomachi.building-update',
    schemaVersion: 1,
    source: 'HakoMachi Building Generator',
    targetPlannerBuildingId: handoff.plannerId,
    buildingName: hakoConfig.buildingName || handoff.name || null,
    sitePlan: handoff.sitePlan,
    footprint: {
      widthMm: Number(hakoConfig.width) || null,
      depthMm: Number(hakoConfig.depth) || null,
    },
    hakoConfig,
    updatedAt: new Date().toISOString(),
  };
}

function focusSitePlannerWindow(plannerWindow) {
  try {
    plannerWindow?.focus?.();
    return true;
  } catch (_err) {
    return false;
  }
}

function closeGeneratorAfterPlannerUpdate(plannerWindow, buildingName) {
  if (plannerWindow) focusSitePlannerWindow(plannerWindow);
  window.setTimeout?.(() => {
    try {
      window.close();
    } catch (_err) {
      /* Some browsers keep manually opened tabs alive. */
    }
    window.setTimeout?.(() => {
      if (!window.closed) {
        if (plannerWindow) focusSitePlannerWindow(plannerWindow);
        showBridgeStatus(`Site Planner updated ${buildingName || 'building'}. You can close this tab.`, 'ok');
      }
    }, 250);
  }, 80);
}

function pushCurrentBuildingToSitePlanner() {
  try {
    const payload = makeSitePlannerBuildingUpdate();
    if (!payload.targetPlannerBuildingId) {
      showBridgeStatus('This building was not opened from a Site Planner footprint, so there is no planner building to update.', 'warn');
      return;
    }
    payload.returnToSitePlanner = true;
    const opener = window.opener && !window.opener.closed ? window.opener : null;
    const targetOrigin = window.location.origin && window.location.origin !== 'null' ? window.location.origin : '*';
    if (opener) {
      opener.postMessage(payload, targetOrigin);
      focusSitePlannerWindow(opener);
      window.setTimeout?.(() => focusSitePlannerWindow(opener), 120);
      showBridgeStatus('Sent update. Returning after Site Planner refreshes.', 'ok');
    } else {
      localStorage.setItem(SITE_PLANNER_BUILDING_UPDATE_KEY, JSON.stringify(payload));
      window.open('site-planner.html#buildingUpdate', '_blank');
      showBridgeStatus('Queued update and opened Site Planner.', 'ok');
    }
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    showBridgeStatus('Push to Site Planner failed: ' + message, 'err');
  }
}

function bindSitePlannerTitleReturnButton() {
  const btn = document.getElementById('sitePlannerTitleReturnBtn');
  if (!btn || btn.dataset.sitePlannerReturnBound === '1') return;
  btn.dataset.sitePlannerReturnBound = '1';
  btn.addEventListener('click', pushCurrentBuildingToSitePlanner);
}

let sitePlannerTitleReturnObserver = null;
function installSitePlannerTitleReturnButton() {
  const config = currentGeneratorConfigForPlannerHandoff();
  if (!hasSitePlannerHandoff(config)) return;
  bindSitePlannerTitleReturnButton();
  if (sitePlannerTitleReturnObserver) return;
  const titlePanel = document.getElementById('buildingTitlePanel');
  if (!titlePanel || typeof MutationObserver !== 'function') return;
  sitePlannerTitleReturnObserver = new MutationObserver(bindSitePlannerTitleReturnButton);
  sitePlannerTitleReturnObserver.observe(titlePanel, { childList: true, subtree: true });
}

window.addEventListener('message', event => {
  if (event.origin && event.origin !== window.location.origin) return;
  const data = event.data || {};
  if (data.type !== 'hakomachi:site-planner-building-update-applied') return;
  const opener = window.opener && !window.opener.closed ? window.opener : null;
  closeGeneratorAfterPlannerUpdate(opener, data.buildingName);
});

function installSitePlannerPushButton() {
  installSitePlannerTitleReturnButton();
}

window.addEventListener('hakomachi:building-generator-regenerated', installSitePlannerTitleReturnButton);

document.querySelector('.controls')?.addEventListener('input', () => {
  scheduleBuildingPreviewRefresh(380);
}, true);

document.querySelector('.controls')?.addEventListener('change', () => {
  scheduleBuildingPreviewRefresh(380);
}, true);

if (buildingPreviewRenderer?.buildBuildingPreviewGroup) {
  for (const name of [
    'get3DWallOpenings',
    'getBlankedWindows3D',
    'get3DWallProfileForFace',
    'doorOpeningAs3DBayDoor',
    'normaliseHexColour',
    'materialDefinitionForId',
    'materialColourHex',
    'materialColourNumber',
    'claddingMaterialIdForStyle',
    'claddingColourHexForStyle',
    'shadeHexColour',
    'rgbaFromHex',
  ]) {
    if (previewModules.threePreview[name]) globalThis[name] = previewModules.threePreview[name];
  }

  window.HakoMachiBuildingPreviewRenderer = buildingPreviewRenderer;
  globalThis.HakoMachiBuildingPreviewRenderer = buildingPreviewRenderer;
  document.documentElement.dataset.hakomachiPreview3d = 'ready';
  installBuildingPreviewGlobal?.(globalThis);
}

previewModules.installLegacyBehavior?.({ root: window });
window.startHakoMachiBuildingGeneratorRuntime?.();
installSitePlannerPushButton();
scheduleBuildingPreviewRefresh(0);
window.setTimeout?.(refreshBuildingPreview, 250);
