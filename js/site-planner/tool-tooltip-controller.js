export function createToolTooltipController({
  doc = document,
  win = window,
  clamp,
}) {
  let tooltip = null;
  let tooltipTimer = null;

  function ensureToolTooltip() {
    if (tooltip) return tooltip;
    tooltip = doc.createElement('div');
    tooltip.id = 'toolTooltip';
    tooltip.className = 'toolTooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.setAttribute('aria-hidden', 'true');
    doc.body.appendChild(tooltip);
    return tooltip;
  }

  function toolTooltipText(el) {
    return el?.getAttribute('aria-label') || el?.title || el?.textContent?.trim() || '';
  }

  function hideToolTooltip() {
    clearTimeout(tooltipTimer);
    if (!tooltip) return;
    tooltip.classList.remove('visible');
    tooltip.setAttribute('aria-hidden', 'true');
  }

  function showToolTooltip(el, opts = {}) {
    if (!el) return;
    const text = toolTooltipText(el);
    if (!text) return;
    const tip = ensureToolTooltip();
    clearTimeout(tooltipTimer);
    tip.textContent = text;
    tip.setAttribute('aria-hidden', 'false');
    tip.classList.add('visible');
    const rect = el.getBoundingClientRect();
    const margin = 8;
    const left = Math.min(win.innerWidth - margin - tip.offsetWidth, rect.right + 8);
    const top = clamp(
      rect.top + rect.height / 2,
      margin + tip.offsetHeight / 2,
      win.innerHeight - margin - tip.offsetHeight / 2,
    );
    tip.style.left = Math.max(margin, left) + 'px';
    tip.style.top = top + 'px';
    if (opts.autoHideMs) tooltipTimer = setTimeout(hideToolTooltip, opts.autoHideMs);
  }

  function installTooltips() {
    doc.querySelectorAll('.toolbar button[aria-label]').forEach(btn => {
      btn.addEventListener('pointerenter', () => showToolTooltip(btn));
      btn.addEventListener('pointerleave', hideToolTooltip);
      btn.addEventListener('focus', () => showToolTooltip(btn));
      btn.addEventListener('blur', hideToolTooltip);
      btn.addEventListener('pointerdown', event => {
        if (event.pointerType === 'touch' || event.pointerType === 'pen') {
          showToolTooltip(btn, { autoHideMs: 1600 });
        }
      });
      btn.addEventListener('contextmenu', hideToolTooltip);
    });
    win.addEventListener('resize', hideToolTooltip);
    win.addEventListener('scroll', hideToolTooltip, true);
  }

  return {
    hideToolTooltip,
    installTooltips,
    showToolTooltip,
  };
}
