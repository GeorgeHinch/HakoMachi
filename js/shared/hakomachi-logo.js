export function installHakoMachiLogoReplay(root = document) {
  root.querySelectorAll('.app-logo').forEach(logo => {
    if (logo.dataset.hakomachiLogoReplay === 'installed') return;
    logo.dataset.hakomachiLogoReplay = 'installed';
    const replay = () => {
      logo.querySelectorAll('animate').forEach(animation => {
        try { animation.beginElement(); } catch (_) {}
      });
    };
    logo.addEventListener('mouseenter', replay);
    logo.addEventListener('focus', replay);
  });
}

export function registerHakoMachiLogoPlaceholders(root = document) {
  root.querySelectorAll('[data-hakomachi-logo-placeholder]').forEach(node => {
    node.setAttribute('role', node.getAttribute('role') || 'img');
    node.setAttribute('aria-label', node.getAttribute('aria-label') || 'HakoMachi');
    node.classList.add('app-logo-placeholder');
  });
}

export function initHakoMachiLogo(root = document) {
  registerHakoMachiLogoPlaceholders(root);
  installHakoMachiLogoReplay(root);
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initHakoMachiLogo(), { once: true });
  } else {
    initHakoMachiLogo();
  }
}
