export function createGithubModalController({getElement, doc=document}){
  function closeGithubModal(){
    doc.getElementById('githubDataPlannerModal')?.classList.remove('open');
  }

  function openGithubModal(title, body, actions=[]){
    let modal=doc.getElementById('githubDataPlannerModal');
    if(!modal){
      modal=doc.createElement('div');
      modal.id='githubDataPlannerModal';
      modal.className='githubDataModal';
      modal.innerHTML='<div class="githubDataCard"><h2 id="githubDataTitle"></h2><div id="githubDataBody"></div><div id="githubDataStatus" class="githubDataStatus"></div><div id="githubDataActions" class="githubDataActions"></div></div>';
      modal.addEventListener('click', event=>{if(event.target===modal) closeGithubModal();});
      doc.body.appendChild(modal);
    }
    getElement('githubDataTitle').textContent=title;
    getElement('githubDataBody').innerHTML=body||'';
    getElement('githubDataStatus').textContent='';
    const actionBox=getElement('githubDataActions');
    actionBox.innerHTML='';
    actions.forEach(action=>{
      const button=doc.createElement('button');
      button.type='button';
      button.textContent=action.label;
      if(action.cls) button.className=action.cls;
      button.onclick=action.onClick;
      actionBox.appendChild(button);
    });
    modal.classList.add('open');
    return modal;
  }

  function setGithubStatus(message){
    const el=getElement('githubDataStatus');
    if(el) el.textContent=message||'';
  }

  function setGithubProgress(step,total,label,detail){
    const progressEl=getElement('githubProgress');
    const fillEl=getElement('githubProgressFill');
    const percentEl=getElement('githubProgressPercent');
    const labelEl=getElement('githubProgressLabel');
    const detailEl=getElement('githubProgressDetail');
    const safeTotal=Math.max(1,total||1);
    const percent=Math.max(0,Math.min(100,Math.round((Math.max(0,step||0)/safeTotal)*100)));
    if(progressEl) progressEl.setAttribute('aria-valuenow', String(percent));
    if(fillEl) fillEl.style.width=percent+'%';
    if(percentEl) percentEl.textContent=percent+'%';
    if(labelEl) labelEl.textContent=label||'Working...';
    if(detailEl) detailEl.textContent=detail||'';
    setGithubStatus(label||'');
  }

  function openGithubSaveProgressModal(){
    openGithubModal('Save site plan to GitHub', `
      <div id="githubProgress" class="githubProgress" role="progressbar" aria-label="GitHub save progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <div class="githubProgressTrack"><div id="githubProgressFill" class="githubProgressFill"></div></div>
        <div class="githubProgressSummary"><b id="githubProgressLabel">Preparing save...</b><span id="githubProgressPercent">0%</span></div>
        <div id="githubProgressDetail" class="githubProgressDetail">Building the site plan payload.</div>
      </div>
    `, [{label:'Close', onClick:closeGithubModal}]);
    setGithubProgress(0,8,'Preparing save...','Building the site plan payload.');
  }

  return {
    openGithubModal,
    closeGithubModal,
    setGithubStatus,
    setGithubProgress,
    openGithubSaveProgressModal,
  };
}
