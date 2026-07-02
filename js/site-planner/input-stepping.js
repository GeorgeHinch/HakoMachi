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

export function installAdaptiveDegreeStepping(input) {
  if (!input || input.dataset.adaptiveDegreeStepping) return;
  input.dataset.adaptiveDegreeStepping = 'true';
  const refreshNativeStep = () => {
    const decimals = significantDecimalPlaces(input.value);
    input.step = String(10 ** (-decimals));
  };
  input.addEventListener('focus', refreshNativeStep);
  input.addEventListener('input', refreshNativeStep);
  input.addEventListener('keydown', ev => {
    if (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return;
    ev.preventDefault();
    const next = adaptiveSteppedNumber(input.value, ev.key === 'ArrowUp' ? 1 : -1, ev.shiftKey);
    input.value = formatAdaptiveStepValue(next.value, next.decimals);
    refreshNativeStep();
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  refreshNativeStep();
}
