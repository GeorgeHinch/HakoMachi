export function createStlObjectModelController({
  state,
  uid,
  slug,
  mmToPx,
  visibleWorldCenter,
  transformedRect,
  pointInPoly,
  polyEdgeDistance,
  lockedHitTolerance,
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

  return {
    normalizeStlObject,
    stlObjectRect,
    pointInStlObject,
    hitStlObject,
  };
}
