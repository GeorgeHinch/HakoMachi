(function(){
  'use strict';

  const ICONS = {
    select:'<svg viewBox="0 0 24 24"><path d="M4 3l9 18 2.1-7.1L22 12 4 3z"/></svg>',
    pencil:'<svg viewBox="0 0 24 24"><path d="M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20z"/><path d="M13.5 7.5l3 3"/></svg>',
    edit:'<svg viewBox="0 0 24 24"><path d="M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20z"/><path d="M13.5 7.5l3 3"/></svg>',
    shape:'<svg viewBox="0 0 24 24"><path d="M12 3l8 6-3 10H7L4 9l8-6z"/><path d="M8.5 9.5h7"/><path d="M8.5 14.5h7"/></svg>',
    download:'<svg viewBox="0 0 24 24"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/></svg>',
    upload:'<svg viewBox="0 0 24 24"><path d="M12 21V9"/><path d="M7 14l5-5 5 5"/><path d="M5 4h14"/></svg>',
    save:'<svg viewBox="0 0 24 24"><path d="M5 4h12l2 2v14H5z"/><path d="M8 4v6h8V4"/><path d="M8 20v-6h8v6"/></svg>',
    load:'<svg viewBox="0 0 24 24"><path d="M4 6h6l2 2h8v10a2 2 0 0 1-2 2H4z"/><path d="M12 11v6"/><path d="M9.5 14.5L12 17l2.5-2.5"/></svg>',
    trash:'<svg viewBox="0 0 24 24"><path d="M4 7h16"/><path d="M9 7V5h6v2"/><path d="M7 7l1 14h8l1-14"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>',
    reset:'<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.3-5.7"/><path d="M4 5v5h5"/></svg>',
    more:'<svg viewBox="0 0 24 24"><circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/></svg>',
    mirror:'<svg viewBox="0 0 24 24"><path d="M12 4v16"/><path d="M5 7l5 3v4l-5 3z"/><path d="M19 7l-5 3v4l5 3z"/></svg>',
    language:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18"/><path d="M12 3a14 14 0 0 0 0 18"/></svg>',
    link:'<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1"/></svg>',
    check:'<svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6"/></svg>',
    close:'<svg viewBox="0 0 24 24"><path d="M6 6l12 12"/><path d="M18 6L6 18"/></svg>',
    erase:'<svg viewBox="0 0 24 24"><path d="M4 15l9-9a2 2 0 0 1 2.8 0l2.2 2.2a2 2 0 0 1 0 2.8l-8 8H4z"/><path d="M12 19h8"/><path d="M10 9l5 5"/></svg>',
    plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14"/><path d="M5 12h14"/></svg>',
    minus:'<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
    zoomIn:'<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/><path d="M10.5 7.5v6"/><path d="M7.5 10.5h6"/></svg>',
    zoomOut:'<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/><path d="M7.5 10.5h6"/></svg>',
    cladding:'<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><path d="M4 11h16"/><path d="M9 5v14"/><path d="M15 5v14"/><path d="M9 11l6 8"/></svg>',
    copy:'<svg viewBox="0 0 24 24"><rect x="8" y="8" width="11" height="11" rx="1"/><path d="M5 15H4V4h11v1"/></svg>',
    paste:'<svg viewBox="0 0 24 24"><path d="M8 4h8l1 3H7z"/><path d="M7 6H5v14h14V6h-2"/><path d="M9 13h6"/><path d="M12 10v6"/></svg>',
    magic:'<svg viewBox="0 0 24 24"><path d="M4 20L19 5"/><path d="M14 5l5 5"/><path d="M6 4v3"/><path d="M4.5 5.5h3"/><path d="M18 16v3"/><path d="M16.5 17.5h3"/></svg>',
    circle:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/></svg>',
    square:'<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="1"/></svg>',
    rail:'<svg viewBox="0 0 24 24"><path d="M8 4v16"/><path d="M16 4v16"/><path d="M5 7h14"/><path d="M5 12h14"/><path d="M5 17h14"/></svg>',
    factory:'<svg viewBox="0 0 24 24"><path d="M4 20V9l5 3V9l5 3V6h6v14z"/><path d="M7 16h2"/><path d="M12 16h2"/><path d="M17 16h2"/></svg>',
    billboard:'<svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="9" rx="1"/><path d="M8 20v-7"/><path d="M16 20v-7"/><path d="M6 20h12"/></svg>',
    box:'<svg viewBox="0 0 24 24"><path d="M4 7l8-4 8 4-8 4z"/><path d="M4 7v10l8 4 8-4V7"/><path d="M12 11v10"/></svg>',
    skylight:'<svg viewBox="0 0 24 24"><path d="M4 17l4-10h8l4 10z"/><path d="M8 7l8 10"/><path d="M16 7L8 17"/><path d="M12 4v2"/><path d="M20 5l-2 2"/><path d="M4 5l2 2"/></svg>',
    shieldWall:'<svg viewBox="0 0 24 24"><path d="M5 19V7l7-3 7 3v12"/><path d="M5 10h14"/><path d="M8 19V9"/><path d="M16 19V9"/><path d="M8 14l8-4"/><path d="M8 10l8 4"/></svg>',
    building:'<svg viewBox="0 0 24 24"><path d="M5 20V5h10v15"/><path d="M15 9h4v11"/><path d="M8 8h2"/><path d="M8 12h2"/><path d="M8 16h2"/></svg>'
  };

  function icon(key, cls){
    const svg = ICONS[key] || '';
    return svg ? svg.replace('<svg ', '<svg class="' + (cls || 'hakoIconSvg') + '" aria-hidden="true" focusable="false" ') : '';
  }

  function setIcon(el, key){
    if (el) el.innerHTML = icon(key);
  }

  function hydrate(root){
    (root || document).querySelectorAll('[data-icon]').forEach(el => setIcon(el, el.dataset.icon));
  }

  window.HakoMachiIcons = { icon, setIcon, hydrate, icons: ICONS };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => hydrate(document));
  } else {
    hydrate(document);
  }
})();
