export function createSidebarUiController({state, getElement, doc=document, scheduleResize=()=>{}}){
  function setSidebarOpen(open){
    state.sidebarOpen = !!open;
    doc.querySelector('.app')?.classList.toggle('sidebar-open', state.sidebarOpen);
    const button = getElement('sidebarToggle');
    if(button){
      button.textContent = state.sidebarOpen ? '›' : '‹';
      button.title = state.sidebarOpen ? 'Close properties panel' : 'Open properties panel';
      button.setAttribute('aria-label', button.title);
      button.setAttribute('aria-expanded', String(state.sidebarOpen));
    }
    scheduleResize();
  }

  function installSidebarToggle(){
    getElement('sidebarToggle')?.addEventListener('click', ()=>setSidebarOpen(!state.sidebarOpen));
  }

  return {
    setSidebarOpen,
    installSidebarToggle,
  };
}
