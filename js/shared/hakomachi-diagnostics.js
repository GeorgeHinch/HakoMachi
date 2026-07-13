const DIAGNOSTICS_SETTING = 'hakomachiDiagnostics';

function diagnosticsMode() {
  try {
    const params = new URLSearchParams(globalThis.location?.search || '');
    if (params.has('hmDiagnostics')) return params.get('hmDiagnostics') || 'debug';
  } catch (_err) {
    /* Fall through to localStorage. */
  }
  try {
    return globalThis.localStorage?.getItem(DIAGNOSTICS_SETTING) || '';
  } catch (_err) {
    return '';
  }
}

function shouldLog(level) {
  const mode = String(diagnosticsMode()).toLowerCase();
  if (mode === 'silent' || mode === 'off') return false;
  if (level === 'debug' || level === 'info') return mode === 'debug' || mode === 'verbose';
  return true;
}

function prefix(scope) {
  return scope ? `[HakoMachi ${scope}]` : '[HakoMachi]';
}

export function createHakoMachiLogger(scope = '') {
  const label = prefix(scope);
  return Object.freeze({
    debug(message, ...details) {
      if (shouldLog('debug')) console.debug(label, message, ...details);
    },
    info(message, ...details) {
      if (shouldLog('info')) console.info(label, message, ...details);
    },
    warn(message, ...details) {
      if (shouldLog('warn')) console.warn(label, message, ...details);
    },
    error(message, ...details) {
      if (shouldLog('error')) console.error(label, message, ...details);
    },
  });
}

export const HakoMachiDiagnostics = Object.freeze({
  createLogger: createHakoMachiLogger,
  mode: diagnosticsMode,
});

globalThis.HakoMachiDiagnostics = HakoMachiDiagnostics;
