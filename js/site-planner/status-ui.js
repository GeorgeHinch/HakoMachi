export function createStatusUiController({
  state,
  getElement,
  fmt,
  activeSidebarDetailKind,
  initFabricControls,
  isLikelyIPad,
}){
  function setText(id, text){
    const el=getElement(id);
    if(el) el.textContent=text;
  }

  function updateStatus(){
    const calibrationSection=getElement('calibrationSection');
    if(calibrationSection) calibrationSection.style.display = state.tool==='calibrate' ? '' : 'none';
    const fabricSection=getElement('fabricSection');
    if(fabricSection) fabricSection.style.display = (state.tool==='fabric' && !activeSidebarDetailKind()) ? '' : 'none';
    initFabricControls();
    const ipadInputSection=getElement('ipadInputSection');
    if(ipadInputSection) ipadInputSection.style.display = isLikelyIPad() ? '' : 'none';
    setText('statusTool', 'Tool: '+state.tool);
    setText('statusZoom', 'Zoom: '+Math.round(state.view.scale*100)+'%');
    setText('statusScale', state.pxPerMm ? `Calibration: ${fmt(state.pxPerMm)} px/mm` : 'Calibration: unset');
    const scaleStatus=getElement('scaleStatus');
    if(scaleStatus){
      scaleStatus.className='small '+(state.pxPerMm?'okText':'warning');
      scaleStatus.textContent=state.pxPerMm ? `Calibrated: ${fmt(state.pxPerMm)} px/mm` : 'Not calibrated. Draw a calibration line.';
    }
    const hints=[];
    if(!state.image) hints.push('Import a reference image first.');
    if(!state.pxPerMm) hints.push('Draw a calibration line over a known physical output dimension, enter its value in mm or inches, then Apply Last Line.');
    if(state.tool==='polygon') hints.push('Click points. Click near first point or press Enter to close. Backspace removes last point.');
    if(state.tool==='rect') hints.push('Drag from one corner to the opposite corner to create a rectangle. Hold Shift or turn Snap on to force square/angle snapping. Near-square drags also snap.');
    if(state.tool==='select') hints.push('Drag empty space to box-select multiple footprints. Drag selected pads to move them. Drag corner handles to resize a single selected footprint. Use Cmd/Ctrl+C and Cmd/Ctrl+V to copy/paste selected building footprints. Tap annotation strokes to select them; press Delete/Backspace or use Delete Selected Note to remove. Pencil edits geometry; finger pans when Pencil mode is active. Long-press a pad, point, or note for edit actions.');
    if(state.tool==='annotate') hints.push('Annotate mode: draw freehand notes with Pencil/mouse. Pencil pressure changes stroke width when supported. Notes export with the site project but do not affect HakoSeed geometry.');
    if(state.tool==='benchwork') hints.push('Benchwork Outline: click points around the layout edge, then click near the first point or press Enter to close. Select an outline, then hover/drag an edge segment to curve it. Future exports can trim roads, scenery, and other layout parts to this boundary.');
    if(state.tool==='road') hints.push(state.roadMode==='outline'?'Road Outline: click points around the road surface, then click near the first point or press Enter to close.':state.roadMode==='manhole'?'Manhole / Hatch: click on a road surface to place a cut-through mounting hole.':state.roadMode==='marking'?'Road Marking: click on a road surface to place a visual road marking.':'Road Centerline: click connected points to draw the centerline. Press Enter or double-click to finish. Hover between points and drag to curve a selected road segment; adjust road and sidewalk width in the properties pane.');
    if(state.tool==='track') hints.push('Track: click connected points to sketch approximate rails. Press Enter or double-click to finish; the Site Planner generates twin rails and ties for planning context.');
    if(state.tool==='streetlight') hints.push(state.streetlightMode==='anchored'?'Anchored Streetlight: click to place a pole with sidewalk cut-hole or street-edge bulb mount metadata.':'Streetlight: click to place a free-standing streetlight marker.');
    if(state.tool==='fabric') hints.push('Urban Fabric Fill: click connected points around an area, then click near the first point or press Enter. Choose a fabric preset and generate pads with HakoSeed metadata.');
    setText('hint', hints.join(' '));
  }

  return {updateStatus};
}
