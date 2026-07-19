export function createSidebarDetailController({
  state,
  getElement,
  hydrateIcons,
  activeDetailKind,
  detailTitle,
  sidebarTypeForDetailKind,
  currentSelectedBuildingIds,
  setSidebarObjectType,
  clearPlanObjectSelection,
  hideContextMenu,
  renderList,
  renderRoads,
  renderStreetlights,
  refreshSelection,
  updateHandoff,
  draw,
  selected,
  duplicateBuildingFootprint,
  clearBuildingSelection,
  syncAll,
  setSidebarOpen,
  doc=document,
  win=window,
}){
  let activeDetailKey=null;

  function closeBuildingOverflow(){
    const menu=getElement('sidebarBuildingOverflowMenu');
    const wrap=getElement('sidebarOverflowWrap');
    const button=getElement('sidebarOverflowBtn');
    menu?.classList.remove('open');
    wrap?.classList.remove('menuOpen');
    button?.setAttribute('aria-expanded','false');
  }

  function clearDetailSelection(){
    const returnType=sidebarTypeForDetailKind(activeDetailKind());
    if(returnType) setSidebarObjectType(returnType);
    closeBuildingOverflow();
    clearPlanObjectSelection();
    hideContextMenu();
    renderList();
    renderRoads();
    renderStreetlights();
    refreshSelection();
    updateHandoff();
    draw();
  }

  function bindBuildingOverflowActions(){
    const building=selected();
    if(!building) return;
    const input=getElement('hakoFileInput');
    const replace=getElement('sidebarReplaceHakoB');
    const remove=getElement('sidebarRemoveHakoB');
    const duplicate=getElement('sidebarDuplicateB');
    const hide=getElement('sidebarHideB');
    const lock=getElement('sidebarLockB');
    const del=getElement('sidebarDeleteB');
    if(replace) replace.onclick=()=>{closeBuildingOverflow(); input?.click();};
    if(remove){
      remove.disabled=!building.hakoFile;
      remove.onclick=()=>{
        closeBuildingOverflow();
        if(!building.hakoFile) return;
        if(!confirm('Remove the stored .hako file from this building?')) return;
        building.hakoFile=null;
        building.hakoFileId=null;
        building.hakoConfig=null;
        syncAll();
      };
    }
    if(duplicate) duplicate.onclick=()=>{closeBuildingOverflow(); duplicateBuildingFootprint(building);};
    if(hide) hide.onclick=()=>{closeBuildingOverflow(); building.hidden=!building.hidden; syncAll();};
    if(lock) lock.onclick=()=>{closeBuildingOverflow(); building.locked=!building.locked; syncAll();};
    if(del) del.onclick=()=>{
      closeBuildingOverflow();
      state.buildings=state.buildings.filter(item=>item.id!==building.id);
      clearBuildingSelection();
      syncAll();
    };
  }

  function bindDetailToolbarControls(kind){
    const toolbar=getElement('sidebarDetailToolbar');
    const back=getElement('sidebarBackBtn');
    if(back) back.onclick=clearDetailSelection;
    if(toolbar) hydrateIcons(toolbar);
    if(kind!=='building') return;
    const overflowButton=getElement('sidebarOverflowBtn');
    const overflowMenu=getElement('sidebarBuildingOverflowMenu');
    const overflowWrap=getElement('sidebarOverflowWrap');
    if(!overflowButton || !overflowMenu || !overflowWrap) return;
    overflowButton.onclick=event=>{
      event.preventDefault();
      event.stopPropagation();
      const open=!overflowMenu.classList.contains('open');
      closeBuildingOverflow();
      overflowMenu.classList.toggle('open',open);
      overflowWrap.classList.toggle('menuOpen',open);
      overflowButton.setAttribute('aria-expanded',String(open));
    };
    overflowMenu.onclick=event=>event.stopPropagation();
    bindBuildingOverflowActions();
  }

  function applySidebarDrillIn(){
    const sidebar=doc.querySelector('.sidebar');
    if(!sidebar) return;
    const sections=[...sidebar.children].filter(element=>element.classList&&element.classList.contains('section'));
    let detailSection=getElement('selectedPanel')?.closest('.section') || sections.find(section=>section.dataset.detailPanel==='true');
    if(!detailSection){
      detailSection=sections.find(section=>{
        const heading=section.querySelector('h3');
        return heading && heading.textContent.trim()==='Selected Building';
      });
    }
    if(!detailSection) return;
    detailSection.dataset.detailPanel='true';
    const kind=activeDetailKind();
    const detailKey=kind ? `${kind}:${state.selectedId||state.selectedRoadId||state.selectedRoadFeatureId||state.selectedRoadIntersectionId||state.selectedTrackId||state.selectedTrackAccessoryId||state.selectedBenchworkId||state.selectedStreetlightId||state.selectedFabricId||state.selectedStlObjectId||state.selectedAnnotationId||state.selectedRailCrossingId||currentSelectedBuildingIds().join(',')}` : null;
    const heading=detailSection.querySelector('h3');
    const existingToolbars=[...sidebar.querySelectorAll('#sidebarDetailToolbar, .sidebarDetailToolbar')];
    let toolbar=existingToolbars[0] || null;
    existingToolbars.slice(1).forEach(element=>element.remove());
    if(kind){
      sections.forEach(section=>{ section.style.display=(section===detailSection) ? '' : 'none'; });
      detailSection.classList.add('detailMode');
      if(heading) heading.textContent=detailTitle(kind);
      if(!toolbar){
        toolbar=doc.createElement('div');
        toolbar.id='sidebarDetailToolbar';
        toolbar.className='sidebarDetailToolbar';
      }
      toolbar.innerHTML=`
        <button id="sidebarBackBtn" type="button" class="sidebarBackBtn" aria-label="Back to lists"><span data-icon="arrowLeft"></span><span>Back</span></button>
        ${kind==='building'?`<div id="sidebarOverflowWrap" class="sidebarOverflowWrap">
          <button id="sidebarOverflowBtn" type="button" class="sidebarOverflowBtn" aria-label="Building actions" title="Building actions" aria-haspopup="true" aria-expanded="false"><span data-icon="moreVertical"></span></button>
          <div id="sidebarBuildingOverflowMenu" class="dropdownMenu right sidebarOverflowMenu" role="menu">
            <button id="sidebarReplaceHakoB" type="button">Replace .hako file</button>
            <button id="sidebarRemoveHakoB" type="button" class="danger" ${selected()?.hakoFile?'':'disabled'}>Remove .hako file</button>
            <div class="overflow-sep"></div>
            <button id="sidebarDuplicateB" type="button">Duplicate</button>
            <button id="sidebarHideB" type="button">${selected()?.hidden?'Show':'Hide'}</button>
            <button id="sidebarLockB" type="button">${selected()?.locked?'Unlock':'Lock'}</button>
            <div class="overflow-sep"></div>
            <button id="sidebarDeleteB" type="button" class="danger">Delete</button>
          </div>
        </div>`:''}`;
      if(toolbar.parentElement!==detailSection || toolbar.nextElementSibling!==heading){
        detailSection.insertBefore(toolbar, heading || detailSection.firstChild);
      }
      if(detailKey && detailKey!==activeDetailKey) sidebar.scrollTop=0;
      activeDetailKey=detailKey;
      bindDetailToolbarControls(kind);
      if(win.matchMedia && win.matchMedia('(max-width:900px)').matches && !state.sidebarOpen){
        setSidebarOpen(true);
      }
      return;
    }
    sections.forEach(section=>{ section.style.display=''; });
    detailSection.style.display='none';
    detailSection.classList.remove('detailMode');
    if(heading) heading.textContent='Selected Item';
    closeBuildingOverflow();
    if(toolbar) toolbar.remove();
    activeDetailKey=null;
  }

  return { applySidebarDrillIn, closeBuildingOverflow };
}
