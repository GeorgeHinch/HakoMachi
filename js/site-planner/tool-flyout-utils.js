export function createToolFlyoutController({getElement, clamp, doc=document, win=window}){
  function hideToolFlyouts(){
    doc.querySelectorAll('.toolFlyout').forEach(menu=>menu.classList.remove('open'));
  }

  function positionToolFlyout(menu, anchor){
    if(!menu || !anchor) return;
    // Open as a fixed popover so it is not clipped by the toolbar or canvas grid.
    menu.classList.add('open');
    menu.style.left='0px';
    menu.style.top='0px';
    const ar=anchor.getBoundingClientRect();
    const mr=menu.getBoundingClientRect();
    const gap=8;
    let left=ar.right + gap;
    let top=ar.top;
    if(left + mr.width > win.innerWidth - gap) left = Math.max(gap, ar.left - mr.width - gap);
    top = clamp(top, gap, Math.max(gap, win.innerHeight - mr.height - gap));
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
  }

  function toggleToolFlyout(menuId, anchor){
    const menu=getElement(menuId);
    if(!menu) return;
    const shouldOpen=!menu.classList.contains('open');
    hideToolFlyouts();
    if(shouldOpen) positionToolFlyout(menu, anchor);
  }

  return {
    hideToolFlyouts,
    positionToolFlyout,
    toggleToolFlyout,
  };
}
