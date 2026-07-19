export function createSiteCanvasGestureController({
  state,
  canvas,
  uid,
  colors,
  transformedRect,
  rad,
  polygonCenter,
  dist,
  clamp,
  syncBuildingMetrics,
  isTrackAccessoryAction,
}){
  function isNearSquare(width,height){
    const maximum=Math.max(width,height);
    return maximum>0 && Math.abs(width-height)/maximum<0.06;
  }

  function signedSquareCorner(start,end){
    const dx=end.x-start.x;
    const dy=end.y-start.y;
    const side=Math.max(Math.abs(dx),Math.abs(dy),4);
    return {x:start.x+(dx<0?-side:side), y:start.y+(dy<0?-side:side)};
  }

  function addRectFromDrag(start,end,shift){
    let p2=end;
    let width=Math.abs(p2.x-start.x);
    let height=Math.abs(p2.y-start.y);
    if(shift || isNearSquare(width,height)){
      p2=signedSquareCorner(start,end);
      width=Math.abs(p2.x-start.x);
      height=Math.abs(p2.y-start.y);
    }
    const building={
      id:uid('bldg'),
      name:`Building ${state.buildings.length+1}`,
      padType:'rect',
      x:(start.x+p2.x)/2,
      y:(start.y+p2.y)/2,
      widthPx:Math.max(4,width),
      depthPx:Math.max(4,height),
      rotationDeg:0,
      category:'industrial',
      color:colors[state.buildings.length%colors.length],
      hidden:false,
      locked:false,
      state:'notStarted',
      notes:'',
      hakoConfig:null,
      hakoFile:null,
      hakoFileId:null,
    };
    syncBuildingMetrics(building);
    return building;
  }

  function resizeRectFromCorner(building, original, cornerIndex, worldPoint, options={}){
    const points=transformedRect(original);
    const anchor=points[(cornerIndex+2)%4];
    const angle=rad(original.rotationDeg||0);
    const xAxis={x:Math.cos(angle),y:Math.sin(angle)};
    const yAxis={x:-Math.sin(angle),y:Math.cos(angle)};
    const xSign=[-1,1,1,-1][cornerIndex];
    const ySign=[-1,-1,1,1][cornerIndex];
    const dx=worldPoint.x-anchor.x;
    const dy=worldPoint.y-anchor.y;
    let width=Math.max(4,xSign*(dx*xAxis.x+dy*xAxis.y));
    let height=Math.max(4,ySign*(dx*yAxis.x+dy*yAxis.y));
    if(options.proportional){
      const originalWidth=Math.max(4,Number(original.widthPx)||width);
      const originalHeight=Math.max(4,Number(original.depthPx)||height);
      const scale=Math.max(width/originalWidth,height/originalHeight,4/originalWidth,4/originalHeight);
      width=originalWidth*scale;
      height=originalHeight*scale;
    }
    if(options.square || (!options.proportional && isNearSquare(width,height))){
      const side=Math.max(width,height);
      width=side;
      height=side;
    }
    const center={
      x:anchor.x+xSign*xAxis.x*width/2+ySign*yAxis.x*height/2,
      y:anchor.y+xSign*xAxis.y*width/2+ySign*yAxis.y*height/2,
    };
    building.x=center.x;
    building.y=center.y;
    building.widthPx=width;
    building.depthPx=height;
    building.rotationDeg=original.rotationDeg||0;
    syncBuildingMetrics(building);
  }

  function scalePolygonFromCornerDrag(building, original, cornerIndex, worldPoint){
    const points=original.pointsPx||[];
    const source=points[cornerIndex];
    if(!source || points.length<3){
      building.pointsPx=points.map(point=>({...point}));
      syncBuildingMetrics(building);
      return;
    }
    const center=polygonCenter(points);
    const base=dist(source,center);
    if(!(base>.01)){
      building.pointsPx=points.map(point=>({...point}));
      syncBuildingMetrics(building);
      return;
    }
    const scale=Math.max(.05,dist(worldPoint,center)/base);
    building.pointsPx=points.map(point=>({
      x:center.x+(point.x-center.x)*scale,
      y:center.y+(point.y-center.y)*scale,
    }));
    syncBuildingMetrics(building);
  }

  function snapAngle(angle){
    const snaps=[-180,-165,-150,-135,-120,-105,-90,-75,-60,-45,-30,-15,0,15,30,45,60,75,90,105,120,135,150,165,180];
    return snaps.reduce((best,value)=>Math.abs(value-angle)<Math.abs(best-angle)?value:best,0);
  }

  function snapAngleStep(angle, step=45){
    const normalized=((angle%360)+360)%360;
    let snapped=Math.round(normalized/step)*step;
    if(snapped>180) snapped-=360;
    if(snapped===180 && angle<0) snapped=-180;
    return snapped;
  }

  function rotationSnapAngle(angle,event){
    if(event && event.shiftKey) return snapAngleStep(angle,45);
    if(state.snapOn) return snapAngle(angle);
    return angle;
  }

  function shiftScaleActive(event){
    return !!(event?.shiftKey || state.shiftKeyDown);
  }

  function snapActive(event){
    return !!(state.snapOn || (event && event.shiftKey));
  }

  function isGeometryPointer(event){
    if(state.workspaceMode==='track' && isTrackAccessoryAction(state.trackTask)) return true;
    if(state.inputMode==='penDrawFingerPan') return event.pointerType!=='touch';
    if(state.inputMode==='penOnly') return event.pointerType==='pen' || event.pointerType==='mouse';
    if(state.inputMode==='touchDraw') return true;
    if(state.inputMode==='mouseTrackpad') return event.pointerType==='mouse';
    return true;
  }

  function startPanFromPointer(event){
    state.drag={type:'pan',pointerId:event.pointerId,sx:event.clientX,sy:event.clientY,vx:state.view.x,vy:state.view.y};
  }

  function pointerSnapshot(event){
    return {id:event.pointerId,x:event.clientX,y:event.clientY,type:event.pointerType};
  }

  function activeTouchPointers(){
    return [...state.pointers.values()].filter(pointer=>pointer.type==='touch');
  }

  function startPinchIfNeeded(){
    const touches=activeTouchPointers();
    if(touches.length<2) return false;
    const first=touches[0];
    const second=touches[1];
    const centerX=(first.x+second.x)/2;
    const centerY=(first.y+second.y)/2;
    const bounds=canvas.getBoundingClientRect();
    const world={
      x:(centerX-bounds.left-state.view.x)/state.view.scale,
      y:(centerY-bounds.top-state.view.y)/state.view.scale,
    };
    state.pinch={
      ids:[first.id,second.id],
      startDist:Math.hypot(first.x-second.x,first.y-second.y),
      startScale:state.view.scale,
      startView:{...state.view},
      center:{x:centerX,y:centerY},
      world,
    };
    state.drag={type:'pinch'};
    return true;
  }

  function updatePinch(){
    if(!state.pinch) return false;
    const first=state.pointers.get(state.pinch.ids[0]);
    const second=state.pointers.get(state.pinch.ids[1]);
    if(!first || !second) return false;
    const centerX=(first.x+second.x)/2;
    const centerY=(first.y+second.y)/2;
    const distance=Math.max(1,Math.hypot(first.x-second.x,first.y-second.y));
    state.view.scale=clamp(state.pinch.startScale*(distance/Math.max(1,state.pinch.startDist)),.05,20);
    const bounds=canvas.getBoundingClientRect();
    state.view.x=(centerX-bounds.left)-state.pinch.world.x*state.view.scale;
    state.view.y=(centerY-bounds.top)-state.pinch.world.y*state.view.scale;
    return true;
  }

  return {
    addRectFromDrag,
    resizeRectFromCorner,
    scalePolygonFromCornerDrag,
    rotationSnapAngle,
    shiftScaleActive,
    snapActive,
    isGeometryPointer,
    startPanFromPointer,
    pointerSnapshot,
    startPinchIfNeeded,
    updatePinch,
  };
}
