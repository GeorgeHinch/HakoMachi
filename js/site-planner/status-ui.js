export function createStatusUiController({
  state,
  getElement,
  fmt,
  activeSidebarDetailKind,
  initFabricControls,
}){
  function setText(id, text){
    const el=getElement(id);
    if(el) el.textContent=text;
  }

  function setSectionVisible(section, visible){
    if(!section) return;
    section.classList.toggle('is-hidden', !visible);
    section.style.display = visible ? '' : 'none';
  }

  function updateStatus(){
    const calibrationSection=getElement('calibrationSection');
    setSectionVisible(calibrationSection, state.tool==='calibrate');
    const fabricSection=getElement('fabricSection');
    setSectionVisible(fabricSection, state.tool==='fabric' && !activeSidebarDetailKind());
    initFabricControls();
    const roadModeLabel = state.roadMode === 'outline' ? 'Road outline' : state.roadMode === 'manhole' ? 'Road detail cutout' : state.roadMode === 'marking' ? 'Road etching / marking' : 'Road centerline';
    const roadTaskLabel = state.roadTask === 'intersections' ? 'Intersection controls' : state.roadTask === 'exportPreview' ? 'Cut preview' : state.roadTask === 'exportAssets' ? 'Road asset export' : null;
    const trackTaskLabel = state.trackTask === 'edit' ? 'Track edit' : state.trackTask === 'connect' ? 'Endpoint connections' : state.trackTask === 'sensor' ? 'Under-track sensor' : state.trackTask === 'signal' ? 'Signal location' : state.trackTask === 'crossingArm' ? 'Crossing arm location' : state.trackTask === 'intrusionDetector' ? 'Intrusion detector' : state.trackTask === 'occupancyLight' ? 'Blinking occupancy lights' : state.trackTask === 'trackSwitchLeft' ? 'Left-hand track switch' : state.trackTask === 'trackSwitchRight' ? 'Right-hand track switch' : state.trackTask === 'trackSwitchTomix1279Left' ? 'Tomix 1279 left curved switch' : state.trackTask === 'trackSwitchTomix1278Right' ? 'Tomix 1278 right curved switch' : state.trackTask === 'trackBufferTomix1428' ? 'Tomix 1428 buffer stop' : state.trackTask === 'trackBufferTomix1428Catenary' ? 'Tomix 1428 catenary terminal buffer' : state.trackTask === 'catenarySingleSide' ? 'Single-side catenary pole' : state.trackTask === 'catenaryDoublePortal' ? 'Double-track catenary portal' : state.trackTask === 'catenaryAutoSection' ? 'Auto catenary section' : null;
    const toolLabel = state.workspaceMode === 'track'
      ? `Mode: Track Editing · ${trackTaskLabel || (state.tool === 'track' ? 'Draw track' : state.tool)}`
      : state.workspaceMode === 'road'
      ? `Mode: Road Editing · ${roadTaskLabel || (state.tool === 'road' ? roadModeLabel : state.tool)}`
      : 'Tool: '+state.tool;
    setText('statusTool', toolLabel);
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
    if(state.workspaceMode==='road' && state.tool==='select' && state.roadTask!=='intersections') hints.push('Road Editing mode: select roads or road details, then use the road tools in the left rail.');
    if(state.workspaceMode==='road' && state.roadTask==='intersections') hints.push('Intersection controls: select a road and use the properties pane to toggle crosswalks, stop bars, tactile pavers, and curb guide marks.');
    if(state.workspaceMode==='road' && state.roadExportPreview) hints.push('Cut preview is on: retained road pieces, stencil cuts, and engraving output are shown for checking before export.');
    if(state.tool==='track') hints.push('Track: click connected points to sketch approximate physical track alignment. Press Enter or double-click to finish; this is planning context, not a fabrication export.');
    if(state.workspaceMode==='track' && state.tool==='select' && !state.trackTask) hints.push('Track Editing mode: select tracks or choose a track tool from the left rail.');
    if(state.workspaceMode==='track' && state.trackTask==='edit') hints.push('Track edit: select a track, then drag points or bend a highlighted segment to curve it.');
    if(state.workspaceMode==='track' && state.trackTask==='connect') hints.push('Endpoint connections: select a track and drag an endpoint near another track endpoint to snap them together.');
    if(state.workspaceMode==='track' && state.trackTask==='sensor') hints.push('Under-track sensor: click near a track to place a sensor marker beneath the nearest rail alignment.');
    if(state.workspaceMode==='track' && state.trackTask==='signal') hints.push('Signal location: click near the track to mark a signal placement.');
    if(state.workspaceMode==='track' && state.trackTask==='crossingArm') hints.push('Crossing arm location: click near a road or track crossing to mark the arm placement.');
    if(state.workspaceMode==='track' && state.trackTask==='intrusionDetector') hints.push('Intrusion detector: click near a level crossing to mark the detection object location.');
    if(state.workspaceMode==='track' && state.trackTask==='occupancyLight') hints.push('Blinking occupancy lights: click near a level crossing to mark warning lights driven by occupancy detection.');
    if(state.workspaceMode==='track' && (state.trackTask==='trackSwitchLeft' || state.trackTask==='trackSwitchRight' || state.trackTask==='trackSwitchTomix1279Left' || state.trackTask==='trackSwitchTomix1278Right')) hints.push('Track switch: click near track to place a turnout marker. Select it and drag the rotation handle to orient it.');
    if(state.workspaceMode==='track' && (state.trackTask==='trackBufferTomix1428' || state.trackTask==='trackBufferTomix1428Catenary')) hints.push('Buffer stop: click near a track endpoint to place a Tomix 1428 style end buffer. Select it to toggle the catenary end terminal.');
    if(state.workspaceMode==='track' && state.trackTask==='catenarySingleSide') hints.push('Single-side catenary pole: click near a track to place a side mast with an outreach arm.');
    if(state.workspaceMode==='track' && state.trackTask==='catenaryDoublePortal') hints.push('Double-track catenary portal: click between or beside tracks to place a two-pole gantry.');
    if(state.workspaceMode==='track' && state.trackTask==='catenaryAutoSection') hints.push('Auto catenary section: click a start point and end point on the same track to fill that section with auto-oriented catenary poles.');
    if(state.tool==='streetlight') hints.push(state.streetlightMode==='anchored'?'Anchored Streetlight: click to place a pole with sidewalk cut-hole or street-edge bulb mount metadata.':'Streetlight: click to place a free-standing streetlight marker.');
    if(state.tool==='fabric') hints.push('Urban Fabric Fill: click connected points around an area, then click near the first point or press Enter. Choose a fabric preset and generate pads with HakoSeed metadata.');
    setText('hint', hints.join(' '));
  }

  return {updateStatus};
}
