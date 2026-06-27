export const ICONS = {
  road: '<svg viewBox="0 0 24 24"><path d="M4 19l4-14"/><path d="M16 5l4 14"/><path d="M12 8v-2"/><path d="M12 13v-2"/><path d="M12 18v-2"/></svg>',
  select: '<svg viewBox="0 0 24 24"><path d="M4 3l9 18 2.1-7.1L22 12 4 3z"/></svg>',
  pan: '<svg viewBox="0 0 24 24"><path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12"/><path d="M11 12V5.5a1.5 1.5 0 0 1 3 0V12"/><path d="M14 12V7.5a1.5 1.5 0 0 1 3 0V13"/><path d="M17 13v-2.5a1.5 1.5 0 0 1 3 0V15c0 4-2.4 7-7 7h-1.8c-2.2 0-3.9-.9-5.1-2.5L3 15.5a1.7 1.7 0 0 1 2.6-2.1L8 16"/></svg>',
  ruler: '<svg viewBox="0 0 24 24"><path d="M3 17l14-14 4 4L7 21l-4-4z"/><path d="M14 6l2 2"/><path d="M11 9l2 2"/><path d="M8 12l2 2"/><path d="M5 15l2 2"/></svg>',
  rectangle: '<svg viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="12" rx="1"/></svg>',
  polygon: '<svg viewBox="0 0 24 24"><path d="M12 3l8 6-3 10H7L4 9l8-6z"/></svg>',
  measure: '<svg viewBox="0 0 24 24"><path d="M4 12h16"/><path d="M8 8l-4 4 4 4"/><path d="M16 8l4 4-4 4"/><path d="M4 5v14"/><path d="M20 5v14"/></svg>',
  pencil: '<svg viewBox="0 0 24 24"><path d="M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20z"/><path d="M13.5 7.5l3 3"/></svg>',
  benchwork: '<svg viewBox="0 0 24 24"><path d="M5 5h14v14H5z" stroke-dasharray="3 2"/><path d="M9 3H3v6"/><path d="M15 3h6v6"/><path d="M21 15v6h-6"/><path d="M9 21H3v-6"/></svg>',
  roadCenterline: '<svg viewBox="0 0 24 24"><path d="M4 19l4-14"/><path d="M16 5l4 14"/><path d="M12 8v-2"/><path d="M12 13v-2"/><path d="M12 18v-2"/></svg>',
  roadOutline: '<svg viewBox="0 0 24 24"><path d="M4 19l4-14"/><path d="M16 5l4 14"/><path d="M12 8v-2"/><path d="M12 13v-2"/><path d="M12 18v-2"/></svg>',
  fabric: '<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><path d="M4 11h16"/><path d="M9 5v14"/><path d="M15 5v14"/><path d="M9 11l6 8"/></svg>',
  manhole: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><path d="M7 10h10"/><path d="M7 14h10"/><path d="M10 5v14"/><path d="M14 5v14"/></svg>',
  roadMarking: '<svg viewBox="0 0 24 24"><path d="M5 19h14"/><path d="M8 15h8"/><path d="M10 11h4"/><path d="M12 5v4"/><path d="M9 8l3-3 3 3"/></svg>',
  lamp: '<svg viewBox="0 0 24 24"><path d="M7 22h8"/><path d="M11 22V8"/><path d="M11 8h6l2 3"/><path d="M17 8v5"/><path d="M14 13h6"/><path d="M16 16h2"/></svg>',
  lampAnchored: '<svg viewBox="0 0 24 24"><path d="M7 22h8"/><path d="M11 22V8"/><path d="M11 8h6l2 3"/><path d="M17 8v5"/><path d="M14 13h6"/><circle cx="11" cy="22" r="2"/><path d="M4 22h14"/></svg>',
};

export function setIcon(el, key) {
  if (el) el.innerHTML = ICONS[key] || '';
}

export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => setIcon(el, el.dataset.icon));
}
