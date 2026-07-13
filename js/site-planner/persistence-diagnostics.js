const DIAGNOSTIC_FLAG = 'hakomachiPersistenceDiagnostics';

function now() {
  return globalThis.performance?.now ? globalThis.performance.now() : Date.now();
}

export function byteLength(value) {
  if (value == null) return 0;
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text).length;
  return unescape(encodeURIComponent(text)).length;
}

export function base64ByteLength(value) {
  if (!value) return 0;
  const text = String(value).replace(/\s/g, '');
  const padding = text.endsWith('==') ? 2 : text.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor(text.length * 3 / 4) - padding);
}

export function formatDiagnosticBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(2)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
}

function diagnosticsEnabled() {
  try {
    const params = new URLSearchParams(globalThis.location?.search || '');
    if (params.has('hmDebugPersistence')) return true;
  } catch (_err) {
    /* Fall through to localStorage. */
  }
  try {
    return globalThis.localStorage?.getItem(DIAGNOSTIC_FLAG) === '1';
  } catch (_err) {
    return false;
  }
}

export function summarizePersistenceAssets({ imageAsset, hakoAssets = [], stlAssets = [], projectText = '' } = {}) {
  const imageBytes = imageAsset?.info?.isBase64 ? base64ByteLength(imageAsset.info.data) : byteLength(imageAsset?.info?.data || '');
  const hakoBytes = hakoAssets.reduce((total, entry) => total + byteLength(entry.text || ''), 0);
  const stlBytes = stlAssets.reduce((total, entry) => total + base64ByteLength(entry.dataBase64 || ''), 0);
  const projectBytes = byteLength(projectText);
  return {
    projectBytes,
    imageBytes,
    hakoBytes,
    stlBytes,
    totalKnownBytes: projectBytes + imageBytes + hakoBytes + stlBytes,
    hakoAssetCount: hakoAssets.length,
    stlAssetCount: stlAssets.length,
    hasImageAsset: !!imageAsset?.asset,
  };
}

export function createPersistenceDiagnostics(label, context = {}) {
  const enabled = diagnosticsEnabled();
  const startedAt = now();
  const stages = [];

  function mark(stage, details = {}) {
    if (!enabled) return;
    stages.push({
      stage,
      elapsedMs: +(now() - startedAt).toFixed(1),
      ...details,
    });
  }

  async function measure(stage, fn, details = {}) {
    if (!enabled) return fn();
    const stageStart = now();
    try {
      const value = await fn();
      stages.push({
        stage,
        durationMs: +(now() - stageStart).toFixed(1),
        elapsedMs: +(now() - startedAt).toFixed(1),
        ...details,
      });
      return value;
    } catch (err) {
      stages.push({
        stage,
        failed: true,
        durationMs: +(now() - stageStart).toFixed(1),
        elapsedMs: +(now() - startedAt).toFixed(1),
        error: err?.message || String(err),
        ...details,
      });
      throw err;
    }
  }

  function finish(details = {}) {
    if (!enabled) return;
    const totalMs = +(now() - startedAt).toFixed(1);
    const payload = { ...context, ...details, totalMs, stages };
    try {
      console.groupCollapsed(`[HakoMachi persistence] ${label} (${totalMs} ms)`);
      console.log(payload);
      console.table(stages);
      console.groupEnd();
    } catch (_err) {
      console.log('[HakoMachi persistence]', label, payload);
    }
  }

  return { enabled, mark, measure, finish };
}
