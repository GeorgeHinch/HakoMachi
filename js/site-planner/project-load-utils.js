export function scalePointLike(pt, sx, sy){
  if(!pt || typeof pt!=='object') return pt;
  if(Number.isFinite(Number(pt.x))) pt.x=Number(pt.x)*sx;
  if(Number.isFinite(Number(pt.y))) pt.y=Number(pt.y)*sy;
  if(Number.isFinite(Number(pt.x1))) pt.x1=Number(pt.x1)*sx;
  if(Number.isFinite(Number(pt.y1))) pt.y1=Number(pt.y1)*sy;
  if(Number.isFinite(Number(pt.x2))) pt.x2=Number(pt.x2)*sx;
  if(Number.isFinite(Number(pt.y2))) pt.y2=Number(pt.y2)*sy;
  return pt;
}

export function scalePointArray(arr, sx, sy){
  if(!Array.isArray(arr)) return arr;
  arr.forEach(p=>scalePointLike(p,sx,sy));
  return arr;
}

export function scaleLoadedPixelGeometry(state, sx, sy){
  if(!Number.isFinite(sx)||!Number.isFinite(sy)||sx<=0||sy<=0) return;
  if(Math.abs(sx-1)<1e-9 && Math.abs(sy-1)<1e-9) return;
  const avg=(sx+sy)/2;
  state.buildings.forEach(b=>{
    if(b.padType==='rect'){
      if(Number.isFinite(Number(b.x))) b.x=Number(b.x)*sx;
      if(Number.isFinite(Number(b.y))) b.y=Number(b.y)*sy;
      if(Number.isFinite(Number(b.widthPx))) b.widthPx=Number(b.widthPx)*sx;
      if(Number.isFinite(Number(b.depthPx))) b.depthPx=Number(b.depthPx)*sy;
    }
    scalePointArray(b.pointsPx, sx, sy);
  });
  state.roads.forEach(r=>{
    scalePointArray(r.pointsPx, sx, sy);
    scalePointArray(r.roadPolygonPx, sx, sy);
    (r.sidewalkPolygonsPx||[]).forEach(sw=>scalePointArray(sw.polygon, sx, sy));
    if(Number.isFinite(Number(r.widthPx))) r.widthPx=Number(r.widthPx)*avg;
    if(Number.isFinite(Number(r.sidewalkWidthPx))) r.sidewalkWidthPx=Number(r.sidewalkWidthPx)*avg;
  });
  state.benchworkOutlines.forEach(bw=>{scalePointArray(bw.pointsPx, sx, sy); scalePointArray(bw.curvesPx, sx, sy);});
  (state.stlObjects||[]).forEach(obj=>{
    if(Number.isFinite(Number(obj.x))) obj.x=Number(obj.x)*sx;
    if(Number.isFinite(Number(obj.y))) obj.y=Number(obj.y)*sy;
    if(Number.isFinite(Number(obj.widthPx))) obj.widthPx=Number(obj.widthPx)*sx;
    if(Number.isFinite(Number(obj.depthPx))) obj.depthPx=Number(obj.depthPx)*sy;
  });
  state.streetlights.forEach(l=>scalePointLike(l,sx,sy));
  state.annotations.forEach(st=>scalePointArray(st.points, sx, sy));
  if(state.calibrationLine) scalePointLike(state.calibrationLine, sx, sy);
  if(state.measureLine) scalePointLike(state.measureLine, sx, sy);
  if(state.pxPerMm) state.pxPerMm *= avg;
}

export function savedImageDimensions(project){
  const img=project?.image||{};
  const cs=project?.coordinateSystem||{};
  const w=Number(img.naturalWidthPx ?? img.widthPx ?? img.width ?? cs.imageWidthPx);
  const h=Number(img.naturalHeightPx ?? img.heightPx ?? img.height ?? cs.imageHeightPx);
  return {w:Number.isFinite(w)?w:null,h:Number.isFinite(h)?h:null};
}

export function restoreProjectView(project, currentViewport){
  if(!project?.view) return null;
  const view={x:Number(project.view.x)||0,y:Number(project.view.y)||0,scale:Number(project.view.scale)||1};
  const cv=project.canvasViewport||project.viewport||project.savedCanvasViewport;
  const sw=Number(cv?.widthPx ?? cv?.width);
  const sh=Number(cv?.heightPx ?? cv?.height);
  if(Number.isFinite(sw)&&Number.isFinite(sh)&&sw>0&&sh>0&&currentViewport.width>0&&currentViewport.height>0){
    const savedCenterWorld={x:(sw/2-view.x)/view.scale,y:(sh/2-view.y)/view.scale};
    return {x:currentViewport.width/2-savedCenterWorld.x*view.scale,y:currentViewport.height/2-savedCenterWorld.y*view.scale,scale:view.scale};
  }
  return view;
}

export function loadAlignmentMessage(buildingCount, savedW, savedH, loadedW, loadedH, changed){
  const thing=buildingCount===1?'footprint':'footprints';
  if(changed) return `Loaded image ${loadedW} \u00d7 ${loadedH}px; remapped ${buildingCount} building ${thing} from saved ${savedW} \u00d7 ${savedH}px image coordinates.`;
  return `Loaded image ${loadedW} \u00d7 ${loadedH}px and restored ${buildingCount} building ${thing} in image-pixel coordinates.`;
}
