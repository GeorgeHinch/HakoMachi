export function significantDecimalPlaces(text) {
  const raw = String(text ?? '').trim();
  const match = raw.match(/^-?\d*\.([0-9]+)/);
  return match ? match[1].replace(/0+$/, '').length : 0;
}

export function formatAdaptiveStepValue(value, decimals) {
  const factor = 10 ** Math.max(0, decimals);
  const rounded = Math.round((Number(value) || 0) * factor) / factor;
  return decimals > 0 ? rounded.toFixed(decimals) : String(Math.round(rounded));
}

export function adaptiveSteppedNumber(rawValue, direction, largeStep = false) {
  const current = Number(rawValue);
  const value = Number.isFinite(current) ? current : 0;
  const decimals = significantDecimalPlaces(rawValue);
  const baseStep = 10 ** (-decimals);
  if (!largeStep) return { value: value + direction * baseStep, decimals };
  const coarseStep = baseStep * 10;
  const epsilon = coarseStep * 1e-8;
  const next = direction > 0
    ? (Math.floor((value + epsilon) / coarseStep) + 1) * coarseStep
    : (Math.ceil((value - epsilon) / coarseStep) - 1) * coarseStep;
  return { value: next, decimals: Math.max(0, decimals - 1) };
}

let adaptiveShiftPressed = false;
let adaptiveShiftTrackingDocument = null;

function installAdaptiveShiftTracking(doc) {
  if (!doc || adaptiveShiftTrackingDocument === doc) return;
  adaptiveShiftTrackingDocument = doc;
  doc.addEventListener('keydown', ev => {
    if (ev.key === 'Shift' || ev.shiftKey) adaptiveShiftPressed = true;
  }, true);
  doc.addEventListener('keyup', ev => {
    if (ev.key === 'Shift' || !ev.shiftKey) adaptiveShiftPressed = false;
  }, true);
  doc.defaultView?.addEventListener?.('blur', () => {
    adaptiveShiftPressed = false;
  });
}

export function installAdaptiveDegreeStepping(input) {
  if (!input || input.dataset.adaptiveDegreeStepping) return;
  input.dataset.adaptiveDegreeStepping = 'true';
  installAdaptiveShiftTracking(input.ownerDocument || document);
  let lastValue = input.value;
  let keyboardStepping = false;
  let largeNativeStepUntil = 0;
  const rememberLargeNativeStep = ev => {
    if (ev.shiftKey) largeNativeStepUntil = Date.now() + 750;
  };
  const refreshNativeStep = () => {
    const decimals = significantDecimalPlaces(input.value);
    input.step = String(10 ** (-decimals));
  };
  input.addEventListener('focus', refreshNativeStep);
  input.addEventListener('pointerdown', rememberLargeNativeStep, true);
  input.addEventListener('mousedown', rememberLargeNativeStep, true);
  input.addEventListener('wheel', rememberLargeNativeStep, true);
  input.addEventListener('input', () => {
    if (!keyboardStepping && (adaptiveShiftPressed || Date.now() < largeNativeStepUntil)) {
      const previous = Number(lastValue);
      const current = Number(input.value);
      const baseStep = 10 ** (-significantDecimalPlaces(lastValue));
      const delta = current - previous;
      if (Number.isFinite(previous) && Number.isFinite(current) && Math.abs(Math.abs(delta) - baseStep) <= baseStep * 1e-6) {
        const next = adaptiveSteppedNumber(lastValue, delta > 0 ? 1 : -1, true);
        input.value = formatAdaptiveStepValue(next.value, next.decimals);
      }
    }
    refreshNativeStep();
    lastValue = input.value;
  }, true);
  input.addEventListener('keydown', ev => {
    if (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return;
    ev.preventDefault();
    const next = adaptiveSteppedNumber(input.value, ev.key === 'ArrowUp' ? 1 : -1, ev.shiftKey);
    keyboardStepping = true;
    input.value = formatAdaptiveStepValue(next.value, next.decimals);
    refreshNativeStep();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    keyboardStepping = false;
    lastValue = input.value;
  });
  refreshNativeStep();
  lastValue = input.value;
}
