export function createSiteCanvasPointerDownController({
  state,
  canvas,
  clearCanvasBrowserSelection,
  hideContextMenu,
  pointerSnapshot,
  startPanFromPointer,
  startPinchIfNeeded,
  screenToWorld,
  selected,
  isGeometryPointer,
  placeGithubBuildingAt,
  hitGeneratedRailCrossing,
  selectRailCrossing,
  hitRoadFeature,
  handleSiteObjectPointerHit,
  placeRoadFeature,
  hitGroupRotationHandle,
  isCatenaryAutoSectionAction,
  handleCatenaryAutoTrackClick,
  isTrackAccessoryAction,
  hitTrackAccessoryRotationHandle,
  selectTrackAccessory,
  hitTrackAccessory,
  placeTrackAccessory,
  startExistingObjectInteraction,
  startAnnotationStroke,
  selectedBenchwork,
  hitBenchworkSegment,
  hitBenchwork,
  clearBuildingSelection,
  renderRoads,
  renderList,
  renderStreetlights,
  renderSelected,
  draw,
  dist,
  finishBenchworkOutline,
  hitRoad,
  selectedRoad,
  hitRoadPoint,
  hitRoadOutlineSegment,
  hitRoadCenterlineSegment,
  snapRoadPointForConnection,
  finishRoadCenterline,
  finishRoadOutline,
  snapTrackPointForConnection,
  beginTrackContinuationFromSnap,
  selectedTrack,
  hitTrackPoint,
  hitTrackSegment,
  hitTrack,
  finishTrack,
  finishFabricRegion,
  finishPolygon,
  placeStreetlight,
  beginLongPress,
  hitStreetlight,
  hitStlObject,
  hitAnnotation,
  updateHandoff,
  handleAt,
  buildingCenter,
  hitTest,
  hitFabricRegion,
  currentSelectedBuildingIds,
}) {
  function handlePointerDown(e) {
    e.preventDefault(); clearCanvasBrowserSelection(); hideContextMenu();
    canvas.setPointerCapture(e.pointerId);
    state.pointers.set(e.pointerId,pointerSnapshot(e));
    if(e.button===2 || (e.buttons & 2)){
      startPanFromPointer(e);
      state.drag.rightButtonPan=true;
      state.drag.moved=false;
      state.drag.startClient={x:e.clientX,y:e.clientY};
      state.suppressNextContextMenu=false;
      canvas.classList.add('panning');
      return;
    }
    if(e.pointerType==='touch' && startPinchIfNeeded()) return;
    const p=screenToWorld(e); const b=selected();
    if(state.githubBuildingPlacement && isGeometryPointer(e)){ placeGithubBuildingAt(p); return; }
    if(state.tool==='pan' || !isGeometryPointer(e)){startPanFromPointer(e); return;}
    if(state.tool==='road' && (state.roadMode==='manhole' || state.roadMode==='marking')){
      const crossingHit=hitGeneratedRailCrossing(p,e.pointerType);
      if(crossingHit){selectRailCrossing(crossingHit); return;}
      const featureHit=hitRoadFeature(p,e.pointerType);
      if(featureHit){handleSiteObjectPointerHit('roadFeature',featureHit,e,p); return;}
      if(placeRoadFeature(p,state.roadMode==='manhole'?'manhole':'marking')) return;
      return;
    }
    const groupRotateHit=hitGroupRotationHandle(p,e.pointerType);
    if(groupRotateHit){
      state.drag={
        type:'rotateSiteObjects',
        pointerId:e.pointerId,
        center:groupRotateHit.bounds.center,
        startAngle:Math.atan2(p.y-groupRotateHit.bounds.center.y,p.x-groupRotateHit.bounds.center.x),
        entries:groupRotateHit.entries
          .filter(entry=>entry.item&&!entry.item.locked)
          .map(entry=>({type:entry.type,orig:structuredClone(entry.item)})),
      };
      if(!state.drag.entries.length) state.drag=null;
      return;
    }
    if(state.workspaceMode==='track' && isCatenaryAutoSectionAction(state.trackTask)){
      handleCatenaryAutoTrackClick(p,e.pointerType);
      return;
    }
    if(state.workspaceMode==='track' && isTrackAccessoryAction(state.trackTask)){
      const rotateHit=hitTrackAccessoryRotationHandle(p,e.pointerType);
      if(rotateHit){selectTrackAccessory(rotateHit); state.drag={type:'rotateTrackAccessory',pointerId:e.pointerId,center:{x:rotateHit.x,y:rotateHit.y},startAngle:Math.atan2(p.y-rotateHit.y,p.x-rotateHit.x),origRotation:Number(rotateHit.rotationDeg)||0,orig:structuredClone(rotateHit)}; return;}
      const itemHit=hitTrackAccessory(p,e.pointerType);
      if(itemHit){handleSiteObjectPointerHit('trackAccessory',itemHit,e,p); return;}
      placeTrackAccessory(p,state.trackTask);
      return;
    }
    // Existing objects should remain editable regardless of the active drawing tool.
    // Drawing a new object only starts from empty canvas space. Active point-drafts
    // (polygon/road/benchwork) keep their click-to-add behavior until finished.
    if(startExistingObjectInteraction(e,p)) return;
    if(state.tool==='calibrate'||state.tool==='measure'){state.drag={type:state.tool,pointerId:e.pointerId,start:p,end:p}; return;}
    if(state.tool==='annotate'){startAnnotationStroke(e,p); return;}
    if(state.tool==='benchwork'){
      const selectedBenchCurveHit=state.selectedBenchworkId && !state.benchworkDraft.length ? hitBenchworkSegment(p, selectedBenchwork(), e.pointerType) : null;
      if(selectedBenchCurveHit){
        const bw=selectedBenchwork();
        if(bw && !bw.locked){ state.drag={type:'benchworkCurve',pointerId:e.pointerId,start:p,orig:structuredClone(bw),segmentIndex:selectedBenchCurveHit.index}; }
        return;
      }
      const existingBenchHit=!state.benchworkDraft.length ? hitBenchwork(p,e.pointerType) : null;
      if(existingBenchHit){
        clearBuildingSelection(); state.selectedRoadId=null; state.selectedStreetlightId=null; state.selectedAnnotationId=null; state.selectedBenchworkId=existingBenchHit.id;
        renderRoads(); renderList(); renderStreetlights(); renderSelected(); draw();
        if(!existingBenchHit.locked) state.drag={type:'moveBenchwork',pointerId:e.pointerId,start:p,orig:structuredClone(existingBenchHit)};
        return;
      }
      if(state.benchworkDraft.length && dist(p,state.benchworkDraft[0])<18/state.view.scale && state.benchworkDraft.length>=3){finishBenchworkOutline();}
      else state.benchworkDraft.push(p);
      draw(); return;
    }
    if(state.tool==='road'){
      const existingRoadHit=hitRoad(p,e.pointerType);
      // Point handles must win over segment curve handles. Otherwise clicking an endpoint
      // can be interpreted as grabbing the adjacent segment and forcing a bend.
      const selectedRoadForEdit=state.selectedRoadId ? selectedRoad() : null;
      const outlineEditing=selectedRoadForEdit && selectedRoadForEdit.mode==='outline' && state.roadOutlineEditId===selectedRoadForEdit.id;
      const selectedPointHit=selectedRoadForEdit && (selectedRoadForEdit.mode!=='outline' || outlineEditing) ? hitRoadPoint(p, selectedRoadForEdit, e.pointerType) : null;
      if(selectedPointHit){
        const r=selectedRoadForEdit;
        if(r && !r.locked){ state.drag={type:'roadPoint',pointerId:e.pointerId,start:p,orig:structuredClone(r),pointIndex:selectedPointHit.index}; }
        return;
      }
      const selectedCurveHit=selectedRoadForEdit ? (selectedRoadForEdit.mode==='outline' ? (outlineEditing ? hitRoadOutlineSegment(p, selectedRoadForEdit, e.pointerType) : null) : hitRoadCenterlineSegment(p, selectedRoadForEdit, e.pointerType)) : null;
      if(selectedCurveHit){
        const r=selectedRoadForEdit;
        if(r && !r.locked){ state.drag={type:'roadCurve',pointerId:e.pointerId,start:p,orig:structuredClone(r),segmentIndex:selectedCurveHit.index}; }
        return;
      }
      if(existingRoadHit){
        state.selectedRoadId=existingRoadHit.id;
        if(existingRoadHit.mode!=='outline') state.roadOutlineEditId=null;
        clearBuildingSelection();
        state.selectedStreetlightId=null;
        state.selectedAnnotationId=null;
        renderRoads(); renderList(); renderStreetlights(); renderSelected(); draw();
        if(!existingRoadHit.locked) state.drag={type:'moveRoad',pointerId:e.pointerId,start:p,orig:structuredClone(existingRoadHit)};
        return;
      }
      if(state.roadMode==='centerline'){
        const snap=snapRoadPointForConnection(p,null,e.pointerType);
        const np=snap.connection ? snap : {x:p.x,y:p.y};
        if(state.roadDraft.length && dist(np,state.roadDraft[state.roadDraft.length-1])<8/state.view.scale && state.roadDraft.length>=2){ finishRoadCenterline(); }
        else { state.roadDraft.push({x:np.x,y:np.y}); draw(); }
        return;
      }
      if(state.roadMode==='outline'){
        if(state.roadDraft.length && dist(p,state.roadDraft[0])<18/state.view.scale && state.roadDraft.length>=3){finishRoadOutline();}
        else state.roadDraft.push(p);
        draw(); return;
      }
    }
    if(state.tool==='track'){
      if(!state.trackDraft.length){
        const continuationSnap=snapTrackPointForConnection(p,null,e.pointerType);
        if(continuationSnap.connection && (continuationSnap.connection.kind==='endpointStart' || continuationSnap.connection.kind==='endpointEnd')){
          beginTrackContinuationFromSnap(continuationSnap);
          return;
        }
      }
      const selectedTrackForEdit=state.selectedTrackId ? selectedTrack() : null;
      const selectedTrackPoint=selectedTrackForEdit ? hitTrackPoint(p, selectedTrackForEdit, e.pointerType) : null;
      if(selectedTrackPoint){
        const t=selectedTrackForEdit;
        state.selectedTrackPointIndex=selectedTrackPoint.index;
        renderSelected();
        if(t&&!t.locked){ state.drag={type:'trackPoint',pointerId:e.pointerId,start:p,orig:structuredClone(t),pointIndex:selectedTrackPoint.index}; }
        return;
      }
      const selectedTrackCurve=selectedTrackForEdit ? hitTrackSegment(p, selectedTrackForEdit, e.pointerType) : null;
      if(selectedTrackCurve){
        const t=selectedTrackForEdit;
        if(t&&!t.locked){ state.drag={type:'trackCurve',pointerId:e.pointerId,start:p,orig:structuredClone(t),segmentIndex:selectedTrackCurve.index}; }
        return;
      }
      const snap=snapTrackPointForConnection(p,state.trackDraftExtension?.trackId||null,e.pointerType);
      const np=snap.connection ? snap : {x:p.x,y:p.y,connection:null};
      if(state.trackDraft.length && dist(np,state.trackDraft[state.trackDraft.length-1])<8/state.view.scale && state.trackDraft.length>=2){ finishTrack(); }
      else {
        state.trackDraft.push({x:np.x,y:np.y});
        state.trackDraftConnections=state.trackDraftConnections||[];
        state.trackDraftConnections[state.trackDraft.length-1]={connection:np.connection};
      }
      draw(); return;
    }
    if(state.tool==='fabric'){
      if(state.fabricDraft.length && dist(p,state.fabricDraft[0])<18/state.view.scale && state.fabricDraft.length>=3){finishFabricRegion();}
      else state.fabricDraft.push(p);
      draw(); return;
    }
    if(state.tool==='streetlight'){placeStreetlight(p); return;}
    if(state.tool==='rect'){state.drag={type:'rect',pointerId:e.pointerId,start:p,end:p,preview:null}; return;}
    if(state.tool==='fabric'){
      if(e.key==='Enter' && state.fabricDraft.length>=3){e.preventDefault(); finishFabricRegion(); return;}
      if(e.key==='Backspace' && state.fabricDraft.length){e.preventDefault(); state.fabricDraft.pop(); draw(); return;}
    }
    if(state.tool==='polygon'){
      if(state.polygonDraft.length && dist(p,state.polygonDraft[0])<18/state.view.scale && state.polygonDraft.length>=3){finishPolygon();}
      else state.polygonDraft.push(p);
      draw(); return;
    }
    if(state.tool==='select'){
      beginLongPress(e,p);
      const rotateHit=hitTrackAccessoryRotationHandle(p,e.pointerType);
      if(rotateHit){selectTrackAccessory(rotateHit); state.drag={type:'rotateTrackAccessory',pointerId:e.pointerId,center:{x:rotateHit.x,y:rotateHit.y},startAngle:Math.atan2(p.y-rotateHit.y,p.x-rotateHit.x),origRotation:Number(rotateHit.rotationDeg)||0,orig:structuredClone(rotateHit)}; return;}
      const itemHit=hitTrackAccessory(p,e.pointerType);
      if(itemHit){handleSiteObjectPointerHit('trackAccessory',itemHit,e,p); return;}
      const lightHit=hitStreetlight(p,e.pointerType);
      if(lightHit){handleSiteObjectPointerHit('streetlight',lightHit,e,p); return;}
      const benchCurveHit=state.selectedBenchworkId ? hitBenchworkSegment(p, selectedBenchwork(), e.pointerType) : null;
      if(benchCurveHit){ const bw=selectedBenchwork(); if(bw&&!bw.locked){ state.drag={type:'benchworkCurve',pointerId:e.pointerId,start:p,orig:structuredClone(bw),segmentIndex:benchCurveHit.index}; return; } }
      const benchHit=hitBenchwork(p,e.pointerType);
      if(benchHit){handleSiteObjectPointerHit('benchwork',benchHit,e,p); return;}
      const selectRoadForEdit=state.selectedRoadId ? selectedRoad() : null;
      const selectOutlineEditing=selectRoadForEdit && selectRoadForEdit.mode==='outline' && state.roadOutlineEditId===selectRoadForEdit.id;
      const roadPointHit=selectRoadForEdit && (selectRoadForEdit.mode!=='outline' || selectOutlineEditing) ? hitRoadPoint(p, selectRoadForEdit, e.pointerType) : null;
      if(roadPointHit){ const r=selectRoadForEdit; if(r&&!r.locked){ state.drag={type:'roadPoint',pointerId:e.pointerId,start:p,orig:structuredClone(r),pointIndex:roadPointHit.index}; return; } }
      const roadCurveHit=selectRoadForEdit ? (selectRoadForEdit.mode==='outline' ? (selectOutlineEditing ? hitRoadOutlineSegment(p, selectRoadForEdit, e.pointerType) : null) : hitRoadCenterlineSegment(p, selectRoadForEdit, e.pointerType)) : null;
      if(roadCurveHit){ const r=selectRoadForEdit; if(r&&!r.locked){ state.drag={type:'roadCurve',pointerId:e.pointerId,start:p,orig:structuredClone(r),segmentIndex:roadCurveHit.index}; return; } }
      const roadHit=hitRoad(p,e.pointerType);
      if(roadHit){if(roadHit.mode!=='outline') state.roadOutlineEditId=null; handleSiteObjectPointerHit('road',roadHit,e,p); return;}
      const trackHit=hitTrack(p,e.pointerType);
      const selectTrackForEdit=state.selectedTrackId ? selectedTrack() : null;
      const trackPointHit=selectTrackForEdit ? hitTrackPoint(p, selectTrackForEdit, e.pointerType) : null;
      if(trackPointHit){ const t=selectTrackForEdit; state.selectedTrackPointIndex=trackPointHit.index; renderSelected(); if(t&&!t.locked){ state.drag={type:'trackPoint',pointerId:e.pointerId,start:p,orig:structuredClone(t),pointIndex:trackPointHit.index}; } return; }
      const trackCurveHit=selectTrackForEdit ? hitTrackSegment(p, selectTrackForEdit, e.pointerType) : null;
      if(trackCurveHit){ const t=selectTrackForEdit; if(t&&!t.locked){ state.drag={type:'trackCurve',pointerId:e.pointerId,start:p,orig:structuredClone(t),segmentIndex:trackCurveHit.index}; return; } }
      if(trackHit){handleSiteObjectPointerHit('track',trackHit,e,p); return;}
      const stlHit=hitStlObject(p,e.pointerType);
      if(stlHit){handleSiteObjectPointerHit('stlObject',stlHit,e,p); return;}
      const note=hitAnnotation(p,e.pointerType);
      if(note){
        state.selectedAnnotationId=note.id;
        state.selectedId=null; state.selectedStlObjectId=null; state.selectedStreetlightId=null; state.selectedFabricId=null;
        renderList(); renderSelected(); updateHandoff(); draw();
        return;
      }
      const h=handleAt(p,b,e.pointerType);
      if(h){
        const drag={type:h.type,pointerId:e.pointerId,index:h.index,start:p,orig:structuredClone(b)};
        if(h.type==='rotate'){
          drag.center=buildingCenter(b);
          drag.startAngle=Math.atan2(p.y-drag.center.y,p.x-drag.center.x);
          drag.origRotation=Number(b.rotationDeg)||0;
        }
        state.drag=drag;
        return;
      }
      const hit=hitTest(p,e.pointerType);
      if(hit){
        handleSiteObjectPointerHit('building',hit,e,p);
      }
      else if(handleSiteObjectPointerHit('fabric',hitFabricRegion(p),e,p)){
        return;
      }
      else {
        state.drag={type:'marquee',pointerId:e.pointerId,start:p,end:p,additive:!!(e.shiftKey||e.metaKey||e.ctrlKey),baseIds:currentSelectedBuildingIds()};
      }
      draw();
    }

  }

  return Object.freeze({ handlePointerDown });
}
