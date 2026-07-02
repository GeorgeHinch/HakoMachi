export function installTopMenus({
  getElement,
  closeSidebarBuildingOverflow,
  doc=document,
  menuIds=['exportMenu','settingsMenu','overflowMenu'],
  buttonMenus=[
    ['exportMenuBtn','exportMenu'],
    ['settingsBtn','settingsMenu'],
    ['overflowBtn','overflowMenu'],
  ],
}){
  const closeTopMenus = except => {
    menuIds.forEach(id=>{
      const menu=getElement(id);
      if(!menu || menu===except) return;
      menu.classList.remove('open');
      menu.closest('.menuWrap')?.classList.remove('menuOpen');
    });
  };

  const toggleTopMenu = id => {
    const menu=getElement(id);
    if(!menu) return;
    const willOpen=!menu.classList.contains('open');
    closeTopMenus(willOpen?menu:null);
    menu.classList.toggle('open', willOpen);
    menu.closest('.menuWrap')?.classList.toggle('menuOpen', willOpen);
  };

  const wireMenuButton = (btnId, menuId) => {
    const btn=getElement(btnId), menu=getElement(menuId);
    if(!btn || !menu) return;
    btn.addEventListener('click', e=>{
      e.preventDefault();
      e.stopPropagation();
      toggleTopMenu(menuId);
    });
    menu.addEventListener('click', e=>{
      // Labels that open file pickers need the click to complete before closing.
      const target=e.target.closest('button,label');
      if(target) setTimeout(()=>closeTopMenus(), 0);
    });
  };

  buttonMenus.forEach(([btnId, menuId])=>wireMenuButton(btnId, menuId));
  doc.addEventListener('pointerdown', e=>{
    if(e.target.closest('.menuWrap')) return;
    if(!e.target.closest('.sidebarOverflowWrap')) closeSidebarBuildingOverflow();
    closeTopMenus();
  });
  doc.addEventListener('keydown', e=>{
    if(e.key==='Escape'){
      closeTopMenus();
      closeSidebarBuildingOverflow();
    }
  });

  return {closeTopMenus, toggleTopMenu};
}
