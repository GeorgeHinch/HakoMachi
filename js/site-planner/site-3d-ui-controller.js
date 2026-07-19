export function createSite3DUiController({
  state,
  getElement,
  clamp,
  defaultImageOpacity,
  setSite3DMode,
  updateSite3D,
  markDirty,
}){
  function applySite3DSettings(raw=state.site3d){
    const opacity=Number(raw?.imageOpacity);
    state.site3d={
      imageVisible:raw?.imageVisible!==false,
      imageOpacity:clamp(Number.isFinite(opacity)?opacity:defaultImageOpacity,0,1),
    };
    return state.site3d;
  }

  function syncSite3DControls(){
    const settings=applySite3DSettings();
    const imageVisible=getElement('site3dImageVisible');
    const imageOpacity=getElement('site3dImageOpacity');
    if(imageVisible) imageVisible.checked=settings.imageVisible;
    if(imageOpacity) imageOpacity.value=String(settings.imageOpacity);
  }

  function bindSite3DButtons(){
    const view2d=getElement('view2dCanvasBtn');
    const view3d=getElement('view3dCanvasBtn');
    if(view2d&&!view2d.dataset.site3dBound){
      view2d.dataset.site3dBound='1';
      view2d.onclick=()=>setSite3DMode(false);
    }
    if(view3d&&!view3d.dataset.site3dBound){
      view3d.dataset.site3dBound='1';
      view3d.onclick=()=>setSite3DMode(true);
    }
    const imageVisible=getElement('site3dImageVisible');
    const imageOpacity=getElement('site3dImageOpacity');
    if(imageVisible&&!imageVisible.dataset.site3dBound){
      imageVisible.dataset.site3dBound='1';
      imageVisible.onchange=()=>{
        state.site3d=state.site3d||{};
        state.site3d.imageVisible=!!imageVisible.checked;
        updateSite3D({preserveCamera:true});
        markDirty('3d reference image visibility',{history:false});
      };
    }
    if(imageOpacity&&!imageOpacity.dataset.site3dBound){
      imageOpacity.dataset.site3dBound='1';
      imageOpacity.oninput=()=>{
        state.site3d=state.site3d||{};
        state.site3d.imageOpacity=clamp(parseFloat(imageOpacity.value)||0,0,1);
        updateSite3D({preserveCamera:true});
        markDirty('3d reference image opacity',{history:false});
      };
    }
    syncSite3DControls();
  }

  return { applySite3DSettings, syncSite3DControls, bindSite3DButtons };
}
