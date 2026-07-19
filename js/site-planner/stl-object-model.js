export function createStlObjectModelController({
  state,
  uid,
  slug,
  rad,
  ctx,
  fmt,
  mmToPx,
  visibleWorldCenter,
  transformedRect,
  pointInPoly,
  polyEdgeDistance,
  lockedHitTolerance,
  isSiteObjectSelected,
  setSingleSiteObjectSelection,
  drawLabel,
  refreshSelection,
  syncAll,
}){
  function normalizeStlObject(obj){
    if(!obj) return obj;
    obj.id=obj.id||uid('stl');
    obj.type='stl';
    obj.name=obj.name||obj.fileName||`STL Object ${state.stlObjects.length+1}`;
    obj.x=Number.isFinite(Number(obj.x))?Number(obj.x):visibleWorldCenter().x;
    obj.y=Number.isFinite(Number(obj.y))?Number(obj.y):visibleWorldCenter().y;
    obj.rotationDeg=Number.isFinite(Number(obj.rotationDeg))?Number(obj.rotationDeg):0;
    obj.scale=Number.isFinite(Number(obj.scale))&&Number(obj.scale)>0?Number(obj.scale):1;
    obj.widthMm=Number.isFinite(Number(obj.widthMm))&&Number(obj.widthMm)>0?Number(obj.widthMm):20;
    obj.depthMm=Number.isFinite(Number(obj.depthMm))&&Number(obj.depthMm)>0?Number(obj.depthMm):20;
    obj.heightMm=Number.isFinite(Number(obj.heightMm))&&Number(obj.heightMm)>0?Number(obj.heightMm):8;
    obj.widthPx=state.pxPerMm?mmToPx(obj.widthMm*obj.scale):(Number(obj.widthPx)||obj.widthMm*obj.scale);
    obj.depthPx=state.pxPerMm?mmToPx(obj.depthMm*obj.scale):(Number(obj.depthPx)||obj.depthMm*obj.scale);
    obj.color=obj.color||'#496a78';
    obj.locked=!!obj.locked;
    obj.hidden=!!obj.hidden;
    obj.notes=obj.notes||'';
    obj.asset=obj.asset&&typeof obj.asset==='object'?obj.asset:{};
    obj.asset.kind='stl';
    obj.asset.fileName=obj.asset.fileName||obj.fileName||`${slug(obj.name)}.stl`;
    obj.asset.mimeType=obj.asset.mimeType||'model/stl';
    obj.bounds=obj.bounds&&typeof obj.bounds==='object'?obj.bounds:{};
    obj.sourceAssets=Array.isArray(obj.sourceAssets)?obj.sourceAssets.map(source=>{
      const src=source&&typeof source==='object'?source:{};
      src.id=src.id||uid('src');
      src.kind='stl-source';
      src.fileName=src.fileName||src.name||'source-file';
      src.name=src.name||src.fileName;
      src.mimeType=src.mimeType||'application/octet-stream';
      src.importedAt=src.importedAt||new Date().toISOString();
      return src;
    }):[];
    return obj;
  }

  function stlObjectRect(obj){
    return transformedRect({x:obj.x,y:obj.y,widthPx:obj.widthPx,depthPx:obj.depthPx,rotationDeg:obj.rotationDeg});
  }

  function pointInStlObject(point,obj,pointerType='mouse'){
    obj=normalizeStlObject(obj);
    if(!obj || obj.hidden) return false;
    const pts=stlObjectRect(obj);
    if(!obj.locked) return pointInPoly(point,pts);
    return polyEdgeDistance(point,pts)<=lockedHitTolerance(pointerType);
  }

  function hitStlObject(point,pointerType='mouse'){
    for(let i=(state.stlObjects||[]).length-1;i>=0;i--){
      const obj=normalizeStlObject(state.stlObjects[i]);
      if(pointInStlObject(point,obj,pointerType)) return obj;
    }
    return null;
  }

  function selectedStlObject(){
    return (state.stlObjects||[]).find(obj=>obj.id===state.selectedStlObjectId)||null;
  }

  function drawStlObject(raw){
    const obj=normalizeStlObject(raw);
    if(!obj || obj.hidden || !ctx) return;
    const selected=obj.id===state.selectedStlObjectId || isSiteObjectSelected('stlObject',obj.id);
    const hovered=obj.id===state.hoverStlObjectId;
    const pts=stlObjectRect(obj);
    ctx.save();
    ctx.lineWidth=(selected?3:(hovered?3:2))/state.view.scale;
    ctx.strokeStyle=selected?'#0f766e':(hovered?'#2a64aa':obj.color||'#496a78');
    ctx.fillStyle=hovered&&!selected?'rgba(42,100,170,.16)':((obj.color||'#496a78')+'2b');
    ctx.setLineDash([8/state.view.scale,5/state.view.scale]);
    ctx.beginPath();
    pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.translate(obj.x,obj.y);
    ctx.rotate(rad(obj.rotationDeg||0));
    ctx.strokeStyle='rgba(73,106,120,.65)';
    ctx.lineWidth=1.2/state.view.scale;
    ctx.beginPath();
    ctx.moveTo(-obj.widthPx*.35,0); ctx.lineTo(obj.widthPx*.35,0);
    ctx.moveTo(0,-obj.depthPx*.35); ctx.lineTo(0,obj.depthPx*.35);
    ctx.stroke();
    ctx.restore();
    if(selected||hovered) drawLabel(`${obj.name||'STL Object'} · ${fmt(obj.widthMm*obj.scale)}×${fmt(obj.depthMm*obj.scale)}mm`,{x:obj.x+8/state.view.scale,y:obj.y-8/state.view.scale});
  }

  function deleteSelectedStlObject(){
    const id=state.selectedStlObjectId;
    if(!id) return false;
    state.stlObjects=(state.stlObjects||[]).filter(obj=>obj.id!==id);
    state.selectedStlObjectId=null;
    syncAll();
    return true;
  }

  function selectStlObject(obj){
    if(!obj) return false;
    setSingleSiteObjectSelection('stlObject',obj.id);
    refreshSelection();
    return true;
  }

  return {
    normalizeStlObject,
    stlObjectRect,
    pointInStlObject,
    hitStlObject,
    selectedStlObject,
    drawStlObject,
    deleteSelectedStlObject,
    selectStlObject,
  };
}
