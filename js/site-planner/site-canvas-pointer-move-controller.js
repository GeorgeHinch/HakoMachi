export function createSiteCanvasPointerMoveController({
  state,
  addRectFromDrag,
  snapActive,
  createRoadCenterline,
  addAnnotationPoint,
  applySiteObjectMoveFromOrig,
  applySiteObjectRotationFromOrig,
  finalizeMovedSiteObject,
  rotationSnapAngle,
  deg,
  isTrackSwitchAccessoryKind,
  snapTrackSwitchToEndpoint,
  normalizeTrackAccessory,
  syncTracksConnectedToTrackSwitch,
  nearestTrackAccessoryAnchor,
  trackAccessorySnapDistance,
  isCatenaryAccessoryKind,
  attachTrackAccessoryToAnchor,
  normalizeStlObject,
  normalizeBenchworkOutline,
  syncRoadMetrics,
  syncTrackMetrics,
  syncTrackEndpointToSwitchConnection,
  syncConnectedTrackEndpoint,
  snapTrackPointForConnection,
  moveTrackPointWithAdjacentCurves,
  setTrackEndpointConnection,
  snapRoadPointForConnection,
  setRoadEndpointConnection,
  normalizeRoad,
  normalizeTrackCurves,
  syncBuildingMetrics,
  selected,
  shiftScaleActive,
  scalePolygonFromCornerDrag,
  resizeRectFromCorner,
  buildingCenter,
  rad,
}) {
  function handleActivePointerMove(e, p) {
    const d=state.drag;
    if(d.type==='pan'){
      state.view.x=d.vx+(e.clientX-d.sx);
      state.view.y=d.vy+(e.clientY-d.sy);
      if(d.rightButtonPan && d.startClient && Math.hypot(e.clientX-d.startClient.x,e.clientY-d.startClient.y)>3){
        d.moved=true;
        state.suppressNextContextMenu=true;
      }
    }
    else if(d.type==='calibrate'){state.calibrationLine={x1:d.start.x,y1:d.start.y,x2:p.x,y2:p.y}; state.lastCalibrationLine=state.calibrationLine;}
    else if(d.type==='measure'){state.measureLine={x1:d.start.x,y1:d.start.y,x2:p.x,y2:p.y};}
    else if(d.type==='rect'){d.end=p; d.preview=addRectFromDrag(d.start,p,snapActive(e));}
    else if(d.type==='roadCenterline'){d.end=p; d.preview=createRoadCenterline(d.start,p);}
    else if(d.type==='annotate'){addAnnotationPoint(e,p);}
    else if(d.type==='moveSiteObjects'||d.type==='moveSiteObject'){const dx=p.x-d.start.x,dy=p.y-d.start.y; (d.entries||[]).forEach(entry=>applySiteObjectMoveFromOrig(entry.type,entry.orig,dx,dy,entry.dragOrigin?p:null,entry.snapSourceEndpoint)); (d.entries||[]).forEach(entry=>finalizeMovedSiteObject(entry.type,entry.orig));}
    else if(d.type==='rotateSiteObjects'){const angleDelta=rotationSnapAngle(deg(Math.atan2(p.y-d.center.y,p.x-d.center.x)-(d.startAngle||0)),e); (d.entries||[]).forEach(entry=>applySiteObjectRotationFromOrig(entry.type,entry.orig,d.center,angleDelta)); (d.entries||[]).forEach(entry=>finalizeMovedSiteObject(entry.type,entry.orig));}
    else if(d.type==='moveStreetlight'){const l=state.streetlights.find(x=>x.id===d.orig.id); const dx=p.x-d.start.x,dy=p.y-d.start.y; if(l&&!l.locked){l.x=d.orig.x+dx; l.y=d.orig.y+dy;}}
    else if(d.type==='moveTrackAccessory'){const item=(state.trackAccessories||[]).find(x=>x.id===d.orig.id); const dx=p.x-d.start.x,dy=p.y-d.start.y; if(item&&!item.locked){item.x=d.orig.x+dx; item.y=d.orig.y+dy; if(Number.isFinite(Number(d.orig.rotationDeg))) item.rotationDeg=Number(d.orig.rotationDeg); if(isTrackSwitchAccessoryKind(item.kind)){if(!snapTrackSwitchToEndpoint(item,p)){item.trackAnchor=null; item.trackId=null; normalizeTrackAccessory(item); syncTracksConnectedToTrackSwitch(item);}} else {const anchor=nearestTrackAccessoryAnchor({x:item.x,y:item.y}); if(anchor && anchor.distance<=trackAccessorySnapDistance()){if(isCatenaryAccessoryKind(item.kind)) attachTrackAccessoryToAnchor(item,anchor); else item.trackId=anchor.trackId;} else if(isCatenaryAccessoryKind(item.kind)){item.trackId=null; item.trackAnchor=null; item.autoOrientToTrack=false;} normalizeTrackAccessory(item);}}}
    else if(d.type==='rotateTrackAccessory'){const item=(state.trackAccessories||[]).find(x=>x.id===d.orig.id); if(item&&!item.locked){const angleDelta=deg(Math.atan2(p.y-d.center.y,p.x-d.center.x)-(d.startAngle||0)); item.rotationDeg=(Number(d.origRotation)||0)+angleDelta; if(isCatenaryAccessoryKind(item.kind)){item.autoOrientToTrack=false; item.trackAnchor=null;} normalizeTrackAccessory(item); if(isTrackSwitchAccessoryKind(item.kind)) syncTracksConnectedToTrackSwitch(item);}}
    else if(d.type==='moveStlObject'){const obj=(state.stlObjects||[]).find(x=>x.id===d.orig.id); const dx=p.x-d.start.x,dy=p.y-d.start.y; if(obj&&!obj.locked){obj.x=d.orig.x+dx; obj.y=d.orig.y+dy; normalizeStlObject(obj);}}
    else if(d.type==='moveBenchwork'){const bw=state.benchworkOutlines.find(x=>x.id===d.orig.id); const dx=p.x-d.start.x,dy=p.y-d.start.y; if(bw&&!bw.locked){bw.pointsPx=d.orig.pointsPx.map(q=>({x:q.x+dx,y:q.y+dy})); bw.curvesPx=(d.orig.curvesPx||[]).map(c=>c?{x:c.x+dx,y:c.y+dy}:null); normalizeBenchworkOutline(bw);}}
    else if(d.type==='benchworkCurve'){const bw=state.benchworkOutlines.find(x=>x.id===d.orig.id); if(bw&&!bw.locked){normalizeBenchworkOutline(bw); const i=d.segmentIndex; const a=bw.pointsPx[i], b=bw.pointsPx[(i+1)%bw.pointsPx.length]; if(a&&b){bw.curvesPx[i]={x:2*p.x-(a.x+b.x)/2,y:2*p.y-(a.y+b.y)/2}; normalizeBenchworkOutline(bw);}}}
    else if(d.type==='moveRoad'){const r=state.roads.find(x=>x.id===d.orig.id); const dx=p.x-d.start.x,dy=p.y-d.start.y; if(r&&!r.locked){r.pointsPx=d.orig.pointsPx.map(q=>({x:q.x+dx,y:q.y+dy})); r.curvesPx=(d.orig.curvesPx||[]).map(c=>c?{x:c.x+dx,y:c.y+dy}:null); syncRoadMetrics(r);}}
    else if(d.type==='moveTrack'){const t=(state.tracks||[]).find(x=>x.id===d.orig.id); const dx=p.x-d.start.x,dy=p.y-d.start.y; if(t&&!t.locked){t.pointsPx=d.orig.pointsPx.map(q=>({x:q.x+dx,y:q.y+dy})); t.curvesPx=(d.orig.curvesPx||[]).map(c=>c?{x:c.x+dx,y:c.y+dy}:null); syncTrackMetrics(t); syncTrackEndpointToSwitchConnection(t,0); syncTrackEndpointToSwitchConnection(t,t.pointsPx.length-1); syncConnectedTrackEndpoint(t,0,t.pointsPx[0]); syncConnectedTrackEndpoint(t,t.pointsPx.length-1,t.pointsPx[t.pointsPx.length-1]);}}
    else if(d.type==='trackPoint'){
      const t=(state.tracks||[]).find(x=>x.id===d.orig.id);
      if(t&&!t.locked){
        const dx=p.x-d.start.x, dy=p.y-d.start.y, i=d.pointIndex;
        let target={x:d.orig.pointsPx[i].x+dx,y:d.orig.pointsPx[i].y+dy};
        const isEndpoint=i===0 || i===(d.orig.pointsPx.length-1);
        const snap=isEndpoint ? snapTrackPointForConnection(target,t.id,e.pointerType) : {x:target.x,y:target.y,connection:null};
        if(isEndpoint && snap.connection) target={x:snap.x,y:snap.y};
        moveTrackPointWithAdjacentCurves(t,i,target);
        if(isEndpoint) setTrackEndpointConnection(t,i,snap);
        if(isEndpoint && !syncTrackEndpointToSwitchConnection(t,i)) syncConnectedTrackEndpoint(t,i,target);
      }
    }
    else if(d.type==='roadPoint'){
      const r=state.roads.find(x=>x.id===d.orig.id);
      if(r&&!r.locked){
        const dx=p.x-d.start.x, dy=p.y-d.start.y, i=d.pointIndex;
        let target={x:d.orig.pointsPx[i].x+dx,y:d.orig.pointsPx[i].y+dy};
        const isEndpoint = r.mode!=='outline' && (i===0 || i===(d.orig.pointsPx.length-1));
        const snap=isEndpoint ? snapRoadPointForConnection(target,r.id,e.pointerType) : {x:target.x,y:target.y,connection:null};
        if(isEndpoint && snap.connection) target={x:snap.x,y:snap.y};
        r.pointsPx=d.orig.pointsPx.map((q,idx)=>idx===i?{x:target.x,y:target.y}:{x:q.x,y:q.y});
        const adjDx=target.x-d.orig.pointsPx[i].x, adjDy=target.y-d.orig.pointsPx[i].y;
        const n=d.orig.pointsPx.length;
        r.curvesPx=(d.orig.curvesPx||[]).map((c,idx)=>{
          if(!c) return null;
          const adjacent = r.mode==='outline' ? (idx===i || idx===(i-1+n)%n) : (idx===i || idx===i-1);
          // Keep adjacent curved segment handles attached to the moved point so
          // existing curves do not snap/bulge unexpectedly while editing a point.
          return adjacent ? {x:c.x+adjDx,y:c.y+adjDy} : {x:c.x,y:c.y};
        });
        if(isEndpoint) setRoadEndpointConnection(r,i,snap);
        syncRoadMetrics(r);
      }
    }
    else if(d.type==='roadCurve'){
      const r=state.roads.find(x=>x.id===d.orig.id);
      if(r&&!r.locked){
        normalizeRoad(r);
        const i=d.segmentIndex;
        const a=r.pointsPx[i], b=r.mode==='outline'?r.pointsPx[(i+1)%r.pointsPx.length]:r.pointsPx[i+1];
        if(a&&b){r.curvesPx[i]={x:2*p.x-(a.x+b.x)/2,y:2*p.y-(a.y+b.y)/2}; syncRoadMetrics(r);}
      }
    }
    else if(d.type==='trackCurve'){
      const t=(state.tracks||[]).find(x=>x.id===d.orig.id);
      if(t&&!t.locked){
        normalizeTrackCurves(t);
        const i=d.segmentIndex;
        const a=t.pointsPx[i], b=t.pointsPx[i+1];
        if(a&&b){t.curvesPx[i]={x:2*p.x-(a.x+b.x)/2,y:2*p.y-(a.y+b.y)/2}; syncTrackMetrics(t);}
      }
    }
    else if(d.type==='marquee'){d.end=p;}
    else if(d.type==='moveMany'){const dx=p.x-d.start.x,dy=p.y-d.start.y; (d.origs||[]).forEach(orig=>{const b=state.buildings.find(x=>x.id===orig.id); if(b&&!b.locked){if(b.padType==='rect'){b.x=orig.x+dx; b.y=orig.y+dy;} else b.pointsPx=orig.pointsPx.map(q=>({x:q.x+dx,y:q.y+dy})); syncBuildingMetrics(b);}});}
    else if(d.type==='move'){const b=state.buildings.find(x=>x.id===d.orig.id); const dx=p.x-d.start.x,dy=p.y-d.start.y; if(b&&!b.locked){if(b.padType==='rect'){b.x=d.orig.x+dx; b.y=d.orig.y+dy;} else b.pointsPx=d.orig.pointsPx.map(q=>({x:q.x+dx,y:q.y+dy})); syncBuildingMetrics(b);}}
    else if(d.type==='polyPoint'){const b=selected(); if(b&&!b.locked){if(shiftScaleActive(e)) scalePolygonFromCornerDrag(b,d.orig,d.index,p); else {b.pointsPx[d.index]=p; syncBuildingMetrics(b);}}}
    else if(d.type==='rectCorner'){const b=selected(), o=d.orig; if(b&&!b.locked){resizeRectFromCorner(b,o,d.index,p,{proportional:shiftScaleActive(e),square:!!state.snapOn});}}
    else if(d.type==='rotate'){
      const b=selected();
      if(b&&!b.locked){
        const c=d.center||buildingCenter(b);
        const delta=deg(Math.atan2(p.y-c.y,p.x-c.x)-(d.startAngle||0));
        let next=(d.origRotation||0)+delta;
        next=rotationSnapAngle(next,e);
        if(b.padType==='rect'){
          b.rotationDeg=next;
        } else {
          const actualDelta=rad(next-(d.origRotation||0));
          const ca=Math.cos(actualDelta), sa=Math.sin(actualDelta);
          b.pointsPx=(d.orig.pointsPx||[]).map(q=>({x:c.x+(q.x-c.x)*ca-(q.y-c.y)*sa,y:c.y+(q.x-c.x)*sa+(q.y-c.y)*ca}));
          b.rotationDeg=next;
        }
        syncBuildingMetrics(b);
      }
    }

  }

  return Object.freeze({ handleActivePointerMove });
}
