(() => {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const wrap = canvas.parentElement;
  const $ = id => document.getElementById(id);
  function ensureSite3dView(){
    let view = $('site3dView');
    if(view) return view;
    view = document.createElement('div');
    view.id = 'site3dView';
    view.className = 'site3dView';
    view.setAttribute('aria-label', '3D site view');
    view.innerHTML = '<div id="site3dStatus" class="site3dStatus">3D view</div>';
    wrap.insertBefore(view, canvas.nextSibling);
    return view;
  }
  function browserHakoMachiLanguage(){
    const languages = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'en'];
    return languages.some(lang => /^ja\b/i.test(lang)) ? 'ja' : 'en';
  }
  function activeHakoMachiLanguage(){
    let saved = null;
    try { saved = localStorage.getItem('hakomachi.lang') || localStorage.getItem('hakomachi_lang'); } catch(_err) {}
    return saved === 'en' || saved === 'ja' ? saved : browserHakoMachiLanguage();
  }
  document.documentElement.lang = activeHakoMachiLanguage();
  const ICONS={
    road:'<svg viewBox="0 0 24 24"><path d="M4 19l4-14"/><path d="M16 5l4 14"/><path d="M12 8v-2"/><path d="M12 13v-2"/><path d="M12 18v-2"/></svg>',
    select:'<svg viewBox="0 0 24 24"><path d="M4 3l9 18 2.1-7.1L22 12 4 3z"/></svg>',
    pan:'<svg viewBox="0 0 24 24"><path d="M8 13V6.5a1.5 1.5 0 0 1 3 0V12"/><path d="M11 12V5.5a1.5 1.5 0 0 1 3 0V12"/><path d="M14 12V7.5a1.5 1.5 0 0 1 3 0V13"/><path d="M17 13v-2.5a1.5 1.5 0 0 1 3 0V15c0 4-2.4 7-7 7h-1.8c-2.2 0-3.9-.9-5.1-2.5L3 15.5a1.7 1.7 0 0 1 2.6-2.1L8 16"/></svg>',
    ruler:'<svg viewBox="0 0 24 24"><path d="M3 17l14-14 4 4L7 21l-4-4z"/><path d="M14 6l2 2"/><path d="M11 9l2 2"/><path d="M8 12l2 2"/><path d="M5 15l2 2"/></svg>',
    rectangle:'<svg viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="12" rx="1"/></svg>',
    polygon:'<svg viewBox="0 0 24 24"><path d="M12 3l8 6-3 10H7L4 9l8-6z"/></svg>',
    measure:'<svg viewBox="0 0 24 24"><path d="M4 12h16"/><path d="M8 8l-4 4 4 4"/><path d="M16 8l4 4-4 4"/><path d="M4 5v14"/><path d="M20 5v14"/></svg>',
    pencil:'<svg viewBox="0 0 24 24"><path d="M4 20l4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20z"/><path d="M13.5 7.5l3 3"/></svg>',
    benchwork:'<svg viewBox="0 0 24 24"><path d="M5 5h14v14H5z" stroke-dasharray="3 2"/><path d="M9 3H3v6"/><path d="M15 3h6v6"/><path d="M21 15v6h-6"/><path d="M9 21H3v-6"/></svg>',
    roadCenterline:'<svg viewBox="0 0 24 24"><path d="M4 19l4-14"/><path d="M16 5l4 14"/><path d="M12 8v-2"/><path d="M12 13v-2"/><path d="M12 18v-2"/></svg>',
    roadOutline:'<svg viewBox="0 0 24 24"><path d="M4 19l4-14"/><path d="M16 5l4 14"/><path d="M12 8v-2"/><path d="M12 13v-2"/><path d="M12 18v-2"/></svg>',
    fabric:'<svg viewBox="0 0 24 24"><path d="M4 5h16v14H4z"/><path d="M4 11h16"/><path d="M9 5v14"/><path d="M15 5v14"/><path d="M9 11l6 8"/></svg>',
    manhole:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="7"/><path d="M7 10h10"/><path d="M7 14h10"/><path d="M10 5v14"/><path d="M14 5v14"/></svg>',
    roadMarking:'<svg viewBox="0 0 24 24"><path d="M5 19h14"/><path d="M8 15h8"/><path d="M10 11h4"/><path d="M12 5v4"/><path d="M9 8l3-3 3 3"/></svg>',
    lamp:'<svg viewBox="0 0 24 24"><path d="M7 22h8"/><path d="M11 22V8"/><path d="M11 8h6l2 3"/><path d="M17 8v5"/><path d="M14 13h6"/><path d="M16 16h2"/></svg>',
    lampAnchored:'<svg viewBox="0 0 24 24"><path d="M7 22h8"/><path d="M11 22V8"/><path d="M11 8h6l2 3"/><path d="M17 8v5"/><path d="M14 13h6"/><circle cx="11" cy="22" r="2"/><path d="M4 22h14"/></svg>'
  };
  function setIcon(el, key){ if(el) el.innerHTML = ICONS[key] || ''; }
  function hydrateIcons(root=document){ root.querySelectorAll('[data-icon]').forEach(el=>setIcon(el, el.dataset.icon)); }
  function isLikelyIPad(){
    const ua = navigator.userAgent || '';
    const platform = navigator.platform || '';
    const touch = navigator.maxTouchPoints || 0;
    return /iPad/i.test(ua) || (platform === 'MacIntel' && touch > 1);
  }
  const state = {
    tool:'select', image:null, imageMeta:null, imageOpacity:.75, imageLocked:true,
    view:{x:0,y:0,scale:1}, pxPerMm:null, calibrationLine:null, lastCalibrationLine:null,
    buildings:[], selectedId:null, selectedIds:[], hoverBuildingId:null, drag:null, hover:null, polygonDraft:[], measureLine:null, projectName:'hakomachi-site',
    roads:[], selectedRoadId:null, hoverRoadId:null, hoverRoadSegment:null, roadOutlineEditId:null, roadMode:'centerline', roadDraft:[],
    roadFeatures:[], selectedRoadFeatureId:null, hoverRoadFeatureId:null,
    benchworkOutlines:[], selectedBenchworkId:null, hoverBenchworkId:null, hoverBenchworkSegment:null, benchworkDraft:[],
    fabricRegions:[], selectedFabricId:null, fabricDraft:[], fabricPreset:'localMixedUseFabric',
    roadExportPreview:false, roadExportSettings:{maxPieceMm:120, avoidJunctionMm:18, minPieceMm:35},
    streetlights:[], selectedStreetlightId:null, hoverStreetlightId:null, streetlightMode:'free',
    footprintClipboard:null, pasteOffsetCount:0,
    inputMode:'penDrawFingerPan', snapOn:false, pointers:new Map(), pinch:null, annotations:[], selectedAnnotationId:null, hoverPreview:null, longPress:null, contextTarget:null, sidebarOpen:false, viewMode:'2d', site3d:{baseThicknessMm:4}, autosaveReady:false, autosaveRestored:false, dirty:false, dirtySinceManualSave:false, lastAutosaveAt:null,
    history:[], historyIndex:-1, historySuppressed:false
  };
  const AUTOSAVE_KEY = 'hakomachiSitePlannerAutosave_v1';
  const AUTOSAVE_META_KEY = 'hakomachiSitePlannerAutosaveMeta_v1';
  const githubData = window.HakoMachiGithubDataShared;
  if(!githubData) throw new Error('HakoMachi GitHub data helpers did not load.');
  const GITHUB_CURRENT_KEY = 'hakomachi_site_planner_github_current_v1';
  const GITHUB_DEFAULT_LIBRARY = githubData.DEFAULT_LIBRARY_PATH;
  const GITHUB_DEFAULT_SITE_DIR = githubData.DEFAULT_SITE_PLANS_DIR;
  let autosaveTimer = null;
  let autosaveSuppressed = false;
  let renderQueued = false;
  const colors = ['#d79631','#b8672d','#0f766e','#7c5f3f','#8b5a2b','#5f7f54','#9b6b44','#496a78'];
  const uid = p => p + '_' + Math.random().toString(36).slice(2,9);
  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const dist = (a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const rad = d=>d*Math.PI/180, deg=r=>r*180/Math.PI;
  const fmt = n => Number.isFinite(n) ? (Math.abs(n)>=100? n.toFixed(1): n.toFixed(2)).replace(/\.00$/,'') : '—';
  function resize(){const r=wrap.getBoundingClientRect(); const dpr=devicePixelRatio||1; canvas.width=Math.max(1,Math.floor(r.width*dpr)); canvas.height=Math.max(1,Math.floor(r.height*dpr)); ctx.setTransform(dpr,0,0,dpr,0,0); draw(); resizeSite3D();}
  window.addEventListener('resize', resize);
  function setSidebarOpen(open){
    state.sidebarOpen = !!open;
    document.querySelector('.app')?.classList.toggle('sidebar-open', state.sidebarOpen);
    const btn = $('sidebarToggle');
    if(btn){
      btn.textContent = state.sidebarOpen ? '›' : '‹';
      btn.title = state.sidebarOpen ? 'Close properties panel' : 'Open properties panel';
      btn.setAttribute('aria-label', btn.title);
      btn.setAttribute('aria-expanded', String(state.sidebarOpen));
    }
    setTimeout(resize, 0);
  }
  $('sidebarToggle')?.addEventListener('click', ()=>setSidebarOpen(!state.sidebarOpen));
  function screenToWorld(e){const r=canvas.getBoundingClientRect(); return {x:(e.clientX-r.left-state.view.x)/state.view.scale, y:(e.clientY-r.top-state.view.y)/state.view.scale};}
  function worldToScreen(p){return {x:p.x*state.view.scale+state.view.x,y:p.y*state.view.scale+state.view.y};}
  function mmToPx(mm){return state.pxPerMm? mm*state.pxPerMm : mm;}
  function pxToMm(px){return state.pxPerMm? px/state.pxPerMm : px;}
  function modelKnownMm(){let v=parseFloat($('knownValue').value)||0; const unit=$('knownUnit').value; const sc=parseFloat($('modelScale').value)||150; if(unit==='mm'||unit==='model_mm') return v; if(unit==='in'||unit==='model_in') return v*25.4; if(unit==='source_mm'||unit==='real_mm') return v/sc; if(unit==='source_m'||unit==='real_m') return v*1000/sc; if(unit==='source_ft'||unit==='real_ft') return v*304.8/sc; return v;}

  const ROAD_WIDTH_PRESETS = [
    {key:'custom', label:'Custom / override', realM:null},
    {key:'service_alley', label:'Service alley', realM:3.0},
    {key:'one_lane_local', label:'One-lane local road', realM:4.0},
    {key:'residential_street', label:'Residential street', realM:5.5},
    {key:'two_lane_local', label:'Two-lane local street', realM:6.0},
    {key:'collector_street', label:'Collector street', realM:7.0},
    {key:'main_street', label:'Main street', realM:9.0},
    {key:'industrial_service', label:'Industrial/service road', realM:10.5}
  ];
  const SIDEWALK_WIDTH_PRESETS = [
    {key:'custom', label:'Custom / override', realM:null},
    {key:'narrow', label:'Narrow sidewalk', realM:1.2},
    {key:'standard', label:'Standard sidewalk', realM:1.5},
    {key:'comfortable', label:'Comfortable sidewalk', realM:2.0},
    {key:'commercial', label:'Commercial sidewalk', realM:3.0},
    {key:'wide_plaza', label:'Wide sidewalk / plaza edge', realM:4.0}
  ];

  const JP_ROAD_MARKING_STANDARD_ID = 'JP_Order_on_Road_Signs_Road_Lines_and_Road_Surface_Markings_1960';
  const ROAD_MARKING_PRESETS = [
    {key:'stopLine', label:'Stop Line', jpName:'停止線', category:'regulatory', draw:'stopLine', widthMm:24, depthMm:.55, color:'#f7f2df'},
    {key:'zebraCrosswalk', label:'Zebra Crosswalk', jpName:'横断歩道', category:'roadSurfaceMarking', draw:'crosswalk', widthMm:28, depthMm:8, color:'#f7f2df'},
    {key:'bicycleCrossing', label:'Bicycle Crossing', jpName:'自転車横断帯', category:'roadSurfaceMarking', draw:'bicycleCrossing', widthMm:26, depthMm:6, color:'#f7f2df'},
    {key:'crosswalkAdvanceDiamond', label:'Crosswalk Advance Diamond', jpName:'横断歩道又は自転車横断帯あり', category:'indication', draw:'diamond', widthMm:5, depthMm:10, color:'#f7f2df'},
    {key:'laneBoundaryDashed', label:'Lane Boundary — Dashed White', jpName:'車両境界線', category:'roadLine', draw:'dashedLine', widthMm:22, depthMm:.35, color:'#f7f2df'},
    {key:'laneBoundarySolid', label:'Lane Boundary — Solid White', jpName:'車両境界線', category:'roadLine', draw:'solidLine', widthMm:22, depthMm:.35, color:'#f7f2df'},
    {key:'centerLineWhite', label:'Center Line — White', jpName:'中央線', category:'roadLine', draw:'solidLine', widthMm:24, depthMm:.4, color:'#f7f2df'},
    {key:'centerLineYellow', label:'Center Line — Yellow', jpName:'中央線（黄色）', category:'roadLine', draw:'solidLine', widthMm:24, depthMm:.45, color:'#ffd34d'},
    {key:'edgeLine', label:'Road Edge Line', jpName:'車道外側線', category:'roadLine', draw:'solidLine', widthMm:24, depthMm:.35, color:'#f7f2df'},
    {key:'directionArrow', label:'Direction Arrow', jpName:'進行方向', category:'indication', draw:'arrow', widthMm:8, depthMm:14, color:'#f7f2df'},
    {key:'channelizingZone', label:'Channelizing Zone', jpName:'導流帯', category:'indication', draw:'chevronZone', widthMm:20, depthMm:10, color:'#f7f2df'},
    {key:'safetyZone', label:'Safety Zone', jpName:'安全地帯', category:'indication', draw:'safetyZone', widthMm:18, depthMm:7, color:'#f7f2df'},
    {key:'obstructionChevron', label:'Obstruction / Safety-Zone Chevron', jpName:'安全地帯又は路上障害物に接近', category:'indication', draw:'chevronZone', widthMm:18, depthMm:8, color:'#f7f2df'},
    {key:'noParkingCurbDash', label:'No Parking Curb Dash', jpName:'駐車禁止系路側標示', category:'curbMarking', draw:'curbDash', widthMm:18, depthMm:.5, color:'#ffd34d'},
    {key:'noStoppingParkingCurbSolid', label:'No Stopping/Parking Curb Solid', jpName:'駐停車禁止系路側標示', category:'curbMarking', draw:'solidLine', widthMm:24, depthMm:.55, color:'#ffd34d'},
    {key:'busStopBox', label:'Bus Stop Box', jpName:'バス停留所標示', category:'scenic', draw:'box', widthMm:20, depthMm:6, color:'#f7f2df'},
    {key:'speedNumber30', label:'Speed Number 30', jpName:'速度表示 30', category:'scenic', draw:'speedNumber', widthMm:10, depthMm:6, color:'#f7f2df', text:'30'}
  ];
  const ROAD_HATCH_PRESETS = [
    {key:'round600', label:'Round manhole Ø600', jpName:'マンホール蓋', shape:'circle', diameterMm:4.0},
    {key:'round450', label:'Small round utility Ø450', jpName:'小型丸蓋', shape:'circle', diameterMm:3.0},
    {key:'square600', label:'Square hatch 600×600', jpName:'角型ハッチ', shape:'rect', widthMm:4.0, depthMm:4.0},
    {key:'rect600x900', label:'Rectangular utility hatch 600×900', jpName:'長方形ハッチ', shape:'rect', widthMm:4.0, depthMm:6.0},
    {key:'drain450x600', label:'Drain / grate 450×600', jpName:'側溝・排水桝', shape:'rect', widthMm:3.0, depthMm:4.0}
  ];
  function markingPresetByKey(key){ return ROAD_MARKING_PRESETS.find(p=>p.key===key) || ROAD_MARKING_PRESETS[0]; }
  function hatchPresetByKey(key){ return ROAD_HATCH_PRESETS.find(p=>p.key===key) || ROAD_HATCH_PRESETS[0]; }
  function markingOptionsHtml(selectedKey){ return ROAD_MARKING_PRESETS.map(p=>`<option value="${p.key}" ${p.key===(selectedKey||'stopLine')?'selected':''}>${escapeHtml(p.label)} / ${escapeHtml(p.jpName)}</option>`).join(''); }
  function hatchOptionsHtml(selectedKey){ return ROAD_HATCH_PRESETS.map(p=>`<option value="${p.key}" ${p.key===(selectedKey||'round600')?'selected':''}>${escapeHtml(p.label)}</option>`).join(''); }
  function applyRoadMarkingPreset(f,key){
    const p=markingPresetByKey(key);
    f.markingPreset=p.key; f.markingType=p.key; f.markingDraw=p.draw; f.standard=JP_ROAD_MARKING_STANDARD_ID; f.jpName=p.jpName; f.markingCategory=p.category; f.cutBehavior='etchOnly'; f.exportLayer='roadMarkingEtch';
    f.widthMm=p.widthMm; f.depthMm=p.depthMm; f.color=p.color||'#f7f2df'; if(p.text) f.text=p.text;
    if(state.pxPerMm){f.widthPx=mmToPx(f.widthMm); f.depthPx=mmToPx(f.depthMm);} return f;
  }
  function applyRoadHatchPreset(f,key){
    const p=hatchPresetByKey(key);
    f.hatchPreset=p.key; f.jpName=p.jpName; f.hatchShape=p.shape; f.cutThrough=true; f.exportLayer='roadHatchCut';
    if(p.shape==='circle'){f.diameterMm=p.diameterMm;}
    else {f.widthMm=p.widthMm; f.depthMm=p.depthMm;}
    if(state.pxPerMm){f.diameterPx=mmToPx(f.diameterMm||3); f.widthPx=mmToPx(f.widthMm||4); f.depthPx=mmToPx(f.depthMm||3);} return f;
  }

  function currentScaleDivisor(){ const el=$('modelScale'); const v=el ? parseFloat(el.value) : 150; return (Number.isFinite(v)&&v>0)?v:150; }
  function presetModelMm(preset){ return preset && Number.isFinite(Number(preset.realM)) ? (Number(preset.realM)*1000/currentScaleDivisor()) : null; }
  function formatPresetLabel(preset){
    if(!preset || preset.key==='custom') return preset ? preset.label : 'Custom / override';
    const mm=presetModelMm(preset);
    return `${preset.label} — ${preset.realM.toFixed(1)} m real (${fmt(mm)} mm @ 1:${currentScaleDivisor()})`;
  }
  function presetOptionsHtml(presets, selectedKey){
    return presets.map(p=>`<option value="${p.key}" ${p.key===(selectedKey||'custom')?'selected':''}>${escapeHtml(formatPresetLabel(p))}</option>`).join('');
  }
  function roadPresetByKey(key){ return ROAD_WIDTH_PRESETS.find(p=>p.key===key) || ROAD_WIDTH_PRESETS[0]; }
  function sidewalkPresetByKey(key){ return SIDEWALK_WIDTH_PRESETS.find(p=>p.key===key) || SIDEWALK_WIDTH_PRESETS[0]; }
  function applyRoadWidthPreset(road, key){
    road.roadWidthPreset = key || 'custom';
    const mm = presetModelMm(roadPresetByKey(key));
    if(mm!=null){ road.widthMm = mm; road.widthPx = state.pxPerMm ? mmToPx(mm) : (road.widthPx || mm); rebuildRoadGeometry(road); }
  }
  function applySidewalkWidthPreset(road, key){
    road.sidewalkWidthPreset = key || 'custom';
    const mm = presetModelMm(sidewalkPresetByKey(key));
    if(mm!=null){ road.sidewalkWidthMm = mm; road.sidewalkWidthPx = state.pxPerMm ? mmToPx(mm) : (road.sidewalkWidthPx || mm); rebuildRoadGeometry(road); }
  }
  function updateStatus(){
    const calibrationSection=$('calibrationSection');
    if(calibrationSection) calibrationSection.style.display = state.tool==='calibrate' ? '' : 'none';
    const fabricSection=$('fabricSection');
    if(fabricSection) fabricSection.style.display = state.tool==='fabric' ? '' : 'none';
    initFabricControls();
    const ipadInputSection=$('ipadInputSection');
    if(ipadInputSection) ipadInputSection.style.display = isLikelyIPad() ? '' : 'none';
    $('statusTool').textContent='Tool: '+state.tool;
    $('statusZoom').textContent='Zoom: '+Math.round(state.view.scale*100)+'%';
    $('statusScale').textContent=state.pxPerMm ? `Calibration: ${fmt(state.pxPerMm)} px/mm` : 'Calibration: unset';
    $('scaleStatus').className='small '+(state.pxPerMm?'okText':'warning');
    $('scaleStatus').textContent=state.pxPerMm ? `Calibrated: ${fmt(state.pxPerMm)} px/mm` : 'Not calibrated. Draw a calibration line.';
    const h=[];
    if(!state.image) h.push('Import a reference image first.');
    if(!state.pxPerMm) h.push('Draw a calibration line over a known physical output dimension, enter its value in mm or inches, then Apply Last Line.');
    if(state.tool==='polygon') h.push('Click points. Click near first point or press Enter to close. Backspace removes last point.');
    if(state.tool==='rect') h.push('Drag from one corner to the opposite corner to create a rectangle. Hold Shift or turn Snap on to force square/angle snapping. Near-square drags also snap.');
    if(state.tool==='select') h.push('Drag empty space to box-select multiple footprints. Drag selected pads to move them. Drag corner handles to resize a single selected footprint. Use Cmd/Ctrl+C and Cmd/Ctrl+V to copy/paste selected building footprints. Tap annotation strokes to select them; press Delete/Backspace or use Delete Selected Note to remove. Pencil edits geometry; finger pans when Pencil mode is active. Long-press a pad, point, or note for edit actions.');
    if(state.tool==='annotate') h.push('Annotate mode: draw freehand notes with Pencil/mouse. Pencil pressure changes stroke width when supported. Notes export with the site project but do not affect HakoSeed geometry.');
    if(state.tool==='benchwork') h.push('Benchwork Outline: click points around the layout edge, then click near the first point or press Enter to close. Select an outline, then hover/drag an edge segment to curve it. Future exports can trim roads, scenery, and other layout parts to this boundary.');
    if(state.tool==='road') h.push(state.roadMode==='outline'?'Road Outline: click points around the road surface, then click near the first point or press Enter to close.':state.roadMode==='manhole'?'Manhole / Hatch: click on a road surface to place a cut-through mounting hole.':state.roadMode==='marking'?'Road Marking: click on a road surface to place a visual road marking.':'Road Centerline: click connected points to draw the centerline. Press Enter or double-click to finish. Hover between points and drag to curve a selected road segment; adjust road and sidewalk width in the properties pane.');
    if(state.tool==='streetlight') h.push(state.streetlightMode==='anchored'?'Anchored Streetlight: click to place a pole with sidewalk cut-hole or street-edge bulb mount metadata.':'Streetlight: click to place a free-standing streetlight marker.');
    if(state.tool==='fabric') h.push('Urban Fabric Fill: click connected points around an area, then click near the first point or press Enter. Choose a fabric preset and generate pads with HakoSeed metadata.');
    if($('hint')) $('hint').textContent=h.join(' ');
  }
  function transformedRect(b){const c={x:b.x,y:b.y}, w=b.widthPx, h=b.depthPx, a=rad(b.rotationDeg||0), ca=Math.cos(a), sa=Math.sin(a); const local=[{x:-w/2,y:-h/2},{x:w/2,y:-h/2},{x:w/2,y:h/2},{x:-w/2,y:h/2}]; return local.map(p=>({x:c.x+p.x*ca-p.y*sa,y:c.y+p.x*sa+p.y*ca}));}
  function rectLocal(b,p){const a=rad(-(b.rotationDeg||0)), ca=Math.cos(a), sa=Math.sin(a), dx=p.x-b.x, dy=p.y-b.y; return {x:dx*ca-dy*sa,y:dx*sa+dy*ca};}
  function polygonCenter(pts){const n=pts.length||1; return pts.reduce((s,p)=>({x:s.x+p.x/n,y:s.y+p.y/n}),{x:0,y:0});}
  function polygonArea(pts){let s=0; for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length]; s+=a.x*b.y-b.x*a.y;} return Math.abs(s)/2;}
  function pointInPoly(p, pts){let inside=false; for(let i=0,j=pts.length-1;i<pts.length;j=i++){const a=pts[i],b=pts[j]; if(((a.y>p.y)!=(b.y>p.y))&&(p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)) inside=!inside;} return inside;}
  function pointInBuilding(p,b){if(b.hidden) return false; if(b.padType==='rect'){const l=rectLocal(b,p); return Math.abs(l.x)<=b.widthPx/2 && Math.abs(l.y)<=b.depthPx/2;} return pointInPoly(p,b.pointsPx);}
  function lockedHitTolerance(pointerType='mouse'){
    const coarse=(pointerType==='pen'||pointerType==='touch'||matchMedia('(pointer: coarse)').matches);
    return (coarse?18:9)/state.view.scale;
  }
  function hitBuildingSelectable(p,b,pointerType='mouse'){
    if(!b || b.hidden) return false;
    if(!b.locked) return pointInBuilding(p,b);
    const pts=buildingPoints(b);
    if(!pts || pts.length<2) return false;
    return polyEdgeDistance(p,pts) <= lockedHitTolerance(pointerType);
  }
  function hitTest(p,pointerType='mouse'){for(let i=state.buildings.length-1;i>=0;i--){const b=state.buildings[i]; if(hitBuildingSelectable(p,b,pointerType)) return b;} return null;}


  function normalizeBenchworkCurves(bw){
    const n=Math.max(0,(bw?.pointsPx||[]).length);
    const src=Array.isArray(bw?.curvesPx)?bw.curvesPx:(Array.isArray(bw?.curves)?bw.curves:[]);
    bw.curvesPx=[];
    for(let i=0;i<n;i++){
      const c=src[i];
      bw.curvesPx[i]=c&&Number.isFinite(Number(c.x))&&Number.isFinite(Number(c.y)) ? {x:Number(c.x),y:Number(c.y)} : null;
    }
    return bw.curvesPx;
  }
  function normalizeBenchworkOutline(bw){
    if(!bw) return bw;
    bw.id = bw.id || uid('benchwork');
    bw.name = bw.name || `Benchwork Outline ${state.benchworkOutlines.length+1}`;
    bw.pointsPx = Array.isArray(bw.pointsPx) ? bw.pointsPx.map(p=>({x:Number(p.x)||0,y:Number(p.y)||0})) : [];
    if(!bw.pointsPx.length && Array.isArray(bw.polygon)) bw.pointsPx = bw.polygon.map(p=>({x:Number(p.x)||0,y:Number(p.y)||0}));
    normalizeBenchworkCurves(bw);
    bw.color = bw.color || '#2f6f4e';
    bw.hidden = !!bw.hidden;
    bw.locked = !!bw.locked;
    bw.notes = bw.notes || '';
    if(state.pxPerMm){
      bw.pointsMm = bw.pointsPx.map(p=>({x:pxToMm(p.x), y:pxToMm(p.y)}));
      bw.curvesMm = (bw.curvesPx||[]).map(c=>c?{x:pxToMm(c.x),y:pxToMm(c.y)}:null);
    }
    return bw;
  }
  function benchworkSamples(bw, perCurve=18){
    normalizeBenchworkOutline(bw);
    const pts=bw.pointsPx||[];
    if(pts.length<2) return pts.slice();
    const out=[];
    for(let i=0;i<pts.length;i++){
      const a=pts[i], b=pts[(i+1)%pts.length], c=bw.curvesPx?.[i];
      if(i===0) out.push({x:a.x,y:a.y});
      if(c){
        for(let k=1;k<=perCurve;k++) out.push(quadPoint(a,c,b,k/perCurve));
      } else {
        out.push({x:b.x,y:b.y});
      }
    }
    return out;
  }
  function drawBenchworkPath(bw){
    const pts=bw.pointsPx||[];
    if(pts.length<2) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x,pts[0].y);
    for(let i=0;i<pts.length;i++){
      const b=pts[(i+1)%pts.length], c=bw.curvesPx?.[i];
      if(c) ctx.quadraticCurveTo(c.x,c.y,b.x,b.y);
      else ctx.lineTo(b.x,b.y);
    }
  }
  function hitBenchworkSegment(p,bw,pointerType='mouse'){
    if(!bw || !Array.isArray(bw.pointsPx) || bw.pointsPx.length<2) return null;
    normalizeBenchworkOutline(bw);
    const coarse=(pointerType==='pen'||pointerType==='touch'||matchMedia('(pointer: coarse)').matches);
    const tol=(coarse?18:10)/state.view.scale;
    let best={distance:Infinity,index:-1};
    for(let i=0;i<bw.pointsPx.length;i++){
      const a=bw.pointsPx[i], b=bw.pointsPx[(i+1)%bw.pointsPx.length], c=bw.curvesPx?.[i];
      if(c){
        let prev=a;
        for(let k=1;k<=18;k++){
          const cur=quadPoint(a,c,b,k/18);
          const d=distanceToSegment(p,prev,cur);
          if(d<best.distance) best={distance:d,index:i};
          prev=cur;
        }
      } else {
        const d=distanceToSegment(p,a,b);
        if(d<best.distance) best={distance:d,index:i};
      }
    }
    return best.distance<=tol ? best : null;
  }
  function selectedBenchwork(){return state.benchworkOutlines.find(b=>b.id===state.selectedBenchworkId)||null;}
  function benchworkCenter(bw){return polygonCenter((bw&&bw.pointsPx)||[]);}
  function drawBenchwork(bw){
    if(!bw || bw.hidden || !Array.isArray(bw.pointsPx) || bw.pointsPx.length<2) return;
    normalizeBenchworkOutline(bw);
    const selected=bw.id===state.selectedBenchworkId, hovered=bw.id===state.hoverBenchworkId;
    ctx.save();
    ctx.lineWidth=(selected?5:(hovered?4:3))/state.view.scale;
    ctx.strokeStyle=selected?'#0f766e':(hovered?'#2a64aa':(bw.color||'#2f6f4e'));
    ctx.fillStyle='rgba(47,111,78,.045)';
    ctx.setLineDash(selected?[12/state.view.scale,7/state.view.scale]:[9/state.view.scale,7/state.view.scale]);
    drawBenchworkPath(bw);
    if(bw.pointsPx.length>=3){ctx.fill();}
    ctx.stroke();
    ctx.setLineDash([]);
    if(selected){
      ctx.fillStyle='#fff7ed'; ctx.strokeStyle='#0f766e'; ctx.lineWidth=2/state.view.scale;
      bw.pointsPx.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,5/state.view.scale,0,Math.PI*2);ctx.fill();ctx.stroke();});
      (bw.curvesPx||[]).forEach((c,i)=>{ if(!c) return; const a=bw.pointsPx[i], b=bw.pointsPx[(i+1)%bw.pointsPx.length]; ctx.save(); ctx.strokeStyle='rgba(15,118,110,.45)'; ctx.setLineDash([4/state.view.scale,4/state.view.scale]); ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(c.x,c.y); ctx.lineTo(b.x,b.y); ctx.stroke(); ctx.restore(); ctx.beginPath(); ctx.arc(c.x,c.y,5/state.view.scale,0,Math.PI*2); ctx.fill(); ctx.stroke(); });
      if(state.hoverBenchworkSegment && state.hoverBenchworkSegment.benchworkId===bw.id){
        const i=state.hoverBenchworkSegment.index, a=bw.pointsPx[i], b=bw.pointsPx[(i+1)%bw.pointsPx.length], c=bw.curvesPx?.[i];
        ctx.save(); ctx.strokeStyle='#f59e0b'; ctx.lineWidth=7/state.view.scale; ctx.setLineDash([]); ctx.beginPath(); ctx.moveTo(a.x,a.y); if(c) ctx.quadraticCurveTo(c.x,c.y,b.x,b.y); else ctx.lineTo(b.x,b.y); ctx.stroke(); ctx.restore();
      }
      const c=benchworkCenter(bw); drawLabel('Benchwork outline / trim boundary', {x:c.x+8/state.view.scale,y:c.y-8/state.view.scale});
    }
    ctx.restore();
  }
  function hitBenchwork(p,pointerType='mouse'){
    for(let i=state.benchworkOutlines.length-1;i>=0;i--){
      const bw=normalizeBenchworkOutline(state.benchworkOutlines[i]);
      if(bw.hidden) continue;
      const segmentHit=hitBenchworkSegment(p,bw,pointerType);
      if(bw.locked){
        if(segmentHit) return bw;
        continue;
      }
      const samples=benchworkSamples(bw);
      if(samples.length>=3 && pointInPoly(p,samples)) return bw;
      if(segmentHit) return bw;
    }
    return null;
  }
  function moveBenchwork(bw,dx,dy){
    if(!bw || bw.locked) return;
    bw.pointsPx=(bw.pointsPx||[]).map(p=>({x:p.x+dx,y:p.y+dy}));
    bw.curvesPx=(bw.curvesPx||[]).map(c=>c?{x:c.x+dx,y:c.y+dy}:null);
    normalizeBenchworkOutline(bw);
  }
  function finishBenchworkOutline(){
    if(state.benchworkDraft.length<3) return;
    const bw=normalizeBenchworkOutline({id:uid('benchwork'),name:`Benchwork Outline ${state.benchworkOutlines.length+1}`,pointsPx:state.benchworkDraft.slice(),curvesPx:[],color:'#2f6f4e',locked:false,hidden:false,notes:'Anything outside this boundary is intended to be trimmed during future layout export.'});
    state.benchworkOutlines.push(bw);
    clearBuildingSelection(); state.selectedRoadId=null; state.selectedStreetlightId=null; state.selectedAnnotationId=null; state.selectedBenchworkId=bw.id;
    state.benchworkDraft=[];
    syncAll();
  }
  function deleteSelectedBenchwork(){
    if(!state.selectedBenchworkId) return false;
    state.benchworkOutlines=state.benchworkOutlines.filter(b=>b.id!==state.selectedBenchworkId);
    state.selectedBenchworkId=null;
    syncAll();
    return true;
  }
  function normalizeRoad(r){
    if(!r) return r;
    r.id = r.id || uid('road');
    r.name = r.name || (r.mode==='outline'?'Road Outline':'Road Centerline') + ' ' + (state.roads.length+1);
    r.mode = r.mode || r.roadMode || 'centerline';
    r.pointsPx = Array.isArray(r.pointsPx) ? r.pointsPx.map(p=>({x:Number(p.x)||0,y:Number(p.y)||0})) : [];
    if(!r.pointsPx.length && Array.isArray(r.polygon)) r.pointsPx = r.polygon.map(p=>({x:Number(p.x)||0,y:Number(p.y)||0}));
    r.roadWidthPreset = r.roadWidthPreset || r.widthPreset || 'two_lane_local';
    r.widthMm = Number.isFinite(Number(r.widthMm)) ? Number(r.widthMm) : (presetModelMm(roadPresetByKey(r.roadWidthPreset)) || 40);
    r.widthPx = Number.isFinite(Number(r.widthPx)) ? Number(r.widthPx) : (state.pxPerMm ? mmToPx(r.widthMm) : 48);
    r.sidewalkSide = r.sidewalkSide || 'none';
    r.sidewalkWidthPreset = r.sidewalkWidthPreset || r.sidewalkPreset || 'standard';
    r.sidewalkWidthMm = Number.isFinite(Number(r.sidewalkWidthMm)) ? Number(r.sidewalkWidthMm) : (presetModelMm(sidewalkPresetByKey(r.sidewalkWidthPreset)) || 10);
    r.sidewalkWidthPx = Number.isFinite(Number(r.sidewalkWidthPx)) ? Number(r.sidewalkWidthPx) : (state.pxPerMm ? mmToPx(r.sidewalkWidthMm) : 10);
    r.locked = !!r.locked;
    r.hidden = !!r.hidden;
    r.color = r.color || '#6f6a5e';
    normalizeRoadCurves(r);
    rebuildRoadGeometry(r);
    return r;
  }
  function syncRoadMetrics(r){
    if(!r) return r;
    if(state.pxPerMm){
      r.widthMm = pxToMm(r.widthPx || 0);
      r.sidewalkWidthMm = pxToMm(r.sidewalkWidthPx || 0);
      r.pointsMm = (r.pointsPx||[]).map(p=>({x:pxToMm(p.x), y:pxToMm(p.y)}));
      r.curvesMm = (r.curvesPx||[]).map(c=>c?{x:pxToMm(c.x),y:pxToMm(c.y)}:null);
    }
    rebuildRoadGeometry(r);
    return r;
  }
  function quadPoint(a,c,b,t){
    const mt=1-t;
    return {x:mt*mt*a.x+2*mt*t*c.x+t*t*b.x, y:mt*mt*a.y+2*mt*t*c.y+t*t*b.y};
  }
  function normalizeRoadCurves(r){
    const n=Math.max(0, r.mode==='outline' ? (r.pointsPx||[]).length : (r.pointsPx||[]).length-1);
    const src=Array.isArray(r.curvesPx)?r.curvesPx:(Array.isArray(r.curves)?r.curves:[]);
    r.curvesPx=[];
    for(let i=0;i<n;i++){
      const c=src[i];
      r.curvesPx[i]=c&&Number.isFinite(Number(c.x))&&Number.isFinite(Number(c.y)) ? {x:Number(c.x),y:Number(c.y)} : null;
    }
    return r.curvesPx;
  }
  function roadCenterlineSamples(r, perCurve=14){
    if(!r || !Array.isArray(r.pointsPx) || r.pointsPx.length<2) return [];
    normalizeRoadCurves(r);
    const out=[];
    for(let i=0;i<r.pointsPx.length-1;i++){
      const a=r.pointsPx[i], b=r.pointsPx[i+1], c=r.curvesPx?.[i];
      if(i===0) out.push({x:a.x,y:a.y});
      if(c){
        for(let k=1;k<=perCurve;k++) out.push(quadPoint(a,c,b,k/perCurve));
      } else {
        out.push({x:b.x,y:b.y});
      }
    }
    return out;
  }
  function roadOutlineSamples(r, perCurve=14){
    if(!r || !Array.isArray(r.pointsPx) || r.pointsPx.length<2) return [];
    normalizeRoadCurves(r);
    const pts=r.pointsPx;
    const out=[];
    for(let i=0;i<pts.length;i++){
      const a=pts[i], b=pts[(i+1)%pts.length], c=r.curvesPx?.[i];
      if(i===0) out.push({x:a.x,y:a.y});
      if(c){
        for(let k=1;k<=perCurve;k++) out.push(quadPoint(a,c,b,k/perCurve));
      } else {
        out.push({x:b.x,y:b.y});
      }
    }
    return out;
  }
  function offsetPathPolygon(path, offsetPx){
    if(!Array.isArray(path) || path.length<2 || !Number.isFinite(offsetPx) || Math.abs(offsetPx)<0.001) return [];
    const side=(sign)=>path.map((p,i)=>{
      const prev=path[Math.max(0,i-1)], next=path[Math.min(path.length-1,i+1)];
      let dx=next.x-prev.x, dy=next.y-prev.y, len=Math.hypot(dx,dy)||1;
      const nx=-dy/len, ny=dx/len;
      return {x:p.x+nx*offsetPx*sign,y:p.y+ny*offsetPx*sign};
    });
    const left=side(1), right=side(-1).reverse();
    return left.concat(right);
  }
  function roadOffsetPolygon(pointsOrRoad, widthPx){
    const path=Array.isArray(pointsOrRoad) ? pointsOrRoad : roadCenterlineSamples(pointsOrRoad);
    return offsetPathPolygon(path, (widthPx||20)/2);
  }
  function roadSidewalkPolygons(r){
    if(!r || r.mode!=='centerline' || !Array.isArray(r.pointsPx) || r.pointsPx.length<2) return [];
    const path=roadCenterlineSamples(r);
    const hw=(r.widthPx||20)/2, sw=(r.sidewalkWidthPx||0);
    const out=[];
    function strip(sign,label){
      const inner=offsetPathPolygon(path, hw*sign);
      const outer=offsetPathPolygon(path, (hw+sw)*sign);
      if(!inner.length||!outer.length) return null;
      const innerSide=inner.slice(0,path.length);
      const outerSide=outer.slice(0,path.length);
      return {side:label, polygon:innerSide.concat(outerSide.slice().reverse())};
    }
    if(sw>0 && (r.sidewalkSide==='left'||r.sidewalkSide==='both')){ const p=strip(1,'left'); if(p) out.push(p); }
    if(sw>0 && (r.sidewalkSide==='right'||r.sidewalkSide==='both')){ const p=strip(-1,'right'); if(p) out.push(p); }
    return out;
  }
  function rebuildRoadGeometry(r){
    if(!r) return r;
    if(r.mode==='outline'){
      normalizeRoadCurves(r);
      r.roadPolygonPx = roadOutlineSamples(r);
      r.sidewalkPolygonsPx = [];
    } else {
      normalizeRoadCurves(r);
      r.roadCenterlineSamplesPx = roadCenterlineSamples(r);
      r.roadPolygonPx = roadOffsetPolygon(r, r.widthPx||20);
      r.sidewalkPolygonsPx = roadSidewalkPolygons(r);
    }
    return r;
  }
  function hitRoadCenterlineSegment(p,r,pointerType='mouse'){
    if(!r || r.mode!=='centerline' || !Array.isArray(r.pointsPx) || r.pointsPx.length<2) return null;
    const coarse=(pointerType==='pen'||pointerType==='touch'||matchMedia('(pointer: coarse)').matches);
    const tol=(coarse?18:10)/state.view.scale;
    normalizeRoadCurves(r);
    let best={distance:Infinity,index:-1};
    for(let i=0;i<r.pointsPx.length-1;i++){
      const a=r.pointsPx[i], b=r.pointsPx[i+1], c=r.curvesPx?.[i];
      if(c){
        let prev=a;
        for(let k=1;k<=16;k++){
          const cur=quadPoint(a,c,b,k/16);
          const d=distanceToSegment(p,prev,cur);
          if(d<best.distance) best={distance:d,index:i};
          prev=cur;
        }
      } else {
        const d=distanceToSegment(p,a,b);
        if(d<best.distance) best={distance:d,index:i};
      }
    }
    return best.distance<=tol ? best : null;
  }
  function hitRoadOutlineSegment(p,r,pointerType='mouse'){
    if(!r || r.mode!=='outline' || !Array.isArray(r.pointsPx) || r.pointsPx.length<2) return null;
    const coarse=(pointerType==='pen'||pointerType==='touch'||matchMedia('(pointer: coarse)').matches);
    const tol=(coarse?18:10)/state.view.scale;
    normalizeRoadCurves(r);
    let best={distance:Infinity,index:-1};
    for(let i=0;i<r.pointsPx.length;i++){
      const a=r.pointsPx[i], b=r.pointsPx[(i+1)%r.pointsPx.length], c=r.curvesPx?.[i];
      if(c){
        let prev=a;
        for(let k=1;k<=16;k++){
          const cur=quadPoint(a,c,b,k/16);
          const d=distanceToSegment(p,prev,cur);
          if(d<best.distance) best={distance:d,index:i};
          prev=cur;
        }
      } else {
        const d=distanceToSegment(p,a,b);
        if(d<best.distance) best={distance:d,index:i};
      }
    }
    return best.distance<=tol ? best : null;
  }
  function hitRoadPoint(p,r,pointerType='mouse'){
    if(!r || !Array.isArray(r.pointsPx) || !r.pointsPx.length) return null;
    const coarse=(pointerType==='pen'||pointerType==='touch'||matchMedia('(pointer: coarse)').matches);
    const tol=(coarse?18:11)/state.view.scale;
    let best={distance:Infinity,index:-1};
    r.pointsPx.forEach((pt,i)=>{
      const d=dist(p,pt);
      if(d<best.distance) best={distance:d,index:i};
    });
    return best.distance<=tol ? best : null;
  }

  function closestPointOnSegment(p,a,b){
    const vx=b.x-a.x, vy=b.y-a.y;
    const len2=vx*vx+vy*vy;
    if(len2<=1e-9) return {point:{x:a.x,y:a.y}, t:0, distance:dist(p,a)};
    const t=clamp(((p.x-a.x)*vx+(p.y-a.y)*vy)/len2,0,1);
    const point={x:a.x+vx*t,y:a.y+vy*t};
    return {point,t,distance:dist(p,point)};
  }
  function nearestPointOnRoadPath(p, road, includeEndpoints=true){
    if(!road || road.hidden || road.mode!=='centerline') return null;
    const samples=roadCenterlineSamples(road, 20);
    if(!samples || samples.length<2) return null;
    let best={distance:Infinity, point:null, roadId:road.id, kind:'segment'};
    if(includeEndpoints && road.pointsPx?.length){
      [0, road.pointsPx.length-1].forEach(idx=>{
        const ep=road.pointsPx[idx];
        const d=dist(p,ep);
        if(d<best.distance) best={distance:d,point:{x:ep.x,y:ep.y},roadId:road.id,kind:idx===0?'endpointStart':'endpointEnd',pointIndex:idx};
      });
    }
    for(let i=0;i<samples.length-1;i++){
      const hit=closestPointOnSegment(p,samples[i],samples[i+1]);
      if(hit.distance<best.distance) best={distance:hit.distance,point:hit.point,roadId:road.id,kind:'segment'};
    }
    return best.point ? best : null;
  }
  function findRoadConnectionSnap(p, excludeRoadId=null, pointerType='mouse'){
    const coarse=(pointerType==='pen'||pointerType==='touch'||matchMedia('(pointer: coarse)').matches);
    const tol=(coarse?20:14)/state.view.scale;
    let best=null;
    state.roads.forEach(raw=>{
      const r=normalizeRoad(raw);
      if(r.id===excludeRoadId || r.hidden || r.mode!=='centerline') return;
      const hit=nearestPointOnRoadPath(p,r,true);
      if(hit && hit.distance<=tol && (!best || hit.distance<best.distance)) best=hit;
    });
    return best;
  }
  function snapRoadPointForConnection(p, excludeRoadId=null, pointerType='mouse'){
    const hit=findRoadConnectionSnap(p, excludeRoadId, pointerType);
    return hit ? {x:hit.point.x,y:hit.point.y, connection:{roadId:hit.roadId, kind:hit.kind, pointIndex:hit.pointIndex ?? null}} : {x:p.x,y:p.y, connection:null};
  }
  function setRoadEndpointConnection(r, index, snap){
    if(!r || !snap || !Number.isInteger(index)) return;
    r.endpointConnections = r.endpointConnections || {};
    const key = index===0 ? 'start' : (index===(r.pointsPx?.length||0)-1 ? 'end' : null);
    if(!key) return;
    if(snap.connection) r.endpointConnections[key]=snap.connection;
    else delete r.endpointConnections[key];
  }
  function selectedRoad(){return state.roads.find(r=>r.id===state.selectedRoadId)||null;}
  function hitRoad(p,pointerType='mouse'){
    for(let i=state.roads.length-1;i>=0;i--){
      const r=normalizeRoad(state.roads[i]);
      if(r.hidden) continue;
      if(r.locked){
        const tol=lockedHitTolerance(pointerType);
        if(hitRoadPoint(p,r,pointerType) || hitRoadCenterlineSegment(p,r,pointerType)) return r;
        if((r.roadPolygonPx||[]).length>=2 && polyEdgeDistance(p,r.roadPolygonPx)<=tol) return r;
        for(const sw of (r.sidewalkPolygonsPx||[])){
          if((sw.polygon||[]).length>=2 && polyEdgeDistance(p, sw.polygon)<=tol) return r;
        }
        continue;
      }
      if(pointInPoly(p, r.roadPolygonPx||[])) return r;
      for(const sw of (r.sidewalkPolygonsPx||[])) if(pointInPoly(p, sw.polygon||[])) return r;
    }
    return null;
  }
  function moveRoad(r, dx, dy){
    if(!r || r.locked) return;
    r.pointsPx = (r.pointsPx||[]).map(p=>({x:p.x+dx,y:p.y+dy}));
    r.curvesPx = (r.curvesPx||[]).map(c=>c?{x:c.x+dx,y:c.y+dy}:null);
    rebuildRoadGeometry(r);
    syncRoadMetrics(r);
  }
  function deleteSelectedRoad(){
    if(!state.selectedRoadId) return false;
    state.roads=state.roads.filter(r=>r.id!==state.selectedRoadId);
    state.roadFeatures=state.roadFeatures.filter(f=>f.roadId!==state.selectedRoadId);
    state.roadOutlineEditId=null;
    state.selectedRoadId=null;
    syncAll();
    return true;
  }
  function normalizeRoadFeature(f){
    if(!f) return f;
    f.id=f.id||uid('roadFeature');
    f.kind=f.kind||f.type||'manhole';
    f.x=Number(f.x)||0; f.y=Number(f.y)||0;
    f.rotationDeg=Number(f.rotationDeg)||0;
    f.roadId=f.roadId||null;
    f.hidden=!!f.hidden; f.locked=!!f.locked;
    if(f.kind==='manhole'){
      f.name=f.name||'Manhole / Hatch';
      f.hatchPreset=f.hatchPreset||'round600';
      f.hatchShape=f.hatchShape||hatchPresetByKey(f.hatchPreset).shape||'circle';
      if(!Number.isFinite(Number(f.diameterMm)) && !Number.isFinite(Number(f.widthMm))) applyRoadHatchPreset(f,f.hatchPreset);
      f.diameterMm=Number.isFinite(Number(f.diameterMm))?Number(f.diameterMm):(hatchPresetByKey(f.hatchPreset).diameterMm||3);
      f.widthMm=Number.isFinite(Number(f.widthMm))?Number(f.widthMm):(hatchPresetByKey(f.hatchPreset).widthMm||4);
      f.depthMm=Number.isFinite(Number(f.depthMm))?Number(f.depthMm):(hatchPresetByKey(f.hatchPreset).depthMm||3);
      f.cutThrough=true;
      f.exportLayer='roadHatchCut';
      f.color=f.color||'#3a2b1e';
    } else {
      f.kind='marking';
      f.name=f.name||'Road Marking';
      f.markingPreset=f.markingPreset||f.markingType||'stopLine';
      const mp=markingPresetByKey(f.markingPreset);
      f.markingType=f.markingType||mp.key;
      f.markingDraw=f.markingDraw||mp.draw;
      f.standard=f.standard||JP_ROAD_MARKING_STANDARD_ID;
      f.jpName=f.jpName||mp.jpName;
      f.markingCategory=f.markingCategory||mp.category;
      f.widthMm=Number.isFinite(Number(f.widthMm))?Number(f.widthMm):mp.widthMm;
      f.depthMm=Number.isFinite(Number(f.depthMm))?Number(f.depthMm):mp.depthMm;
      f.color=f.color||mp.color||'#f7f2df';
      if(mp.text && !f.text) f.text=mp.text;
      f.visualOnly=true;
      f.cutBehavior='etchOnly';
      f.exportLayer='roadMarkingEtch';
    }
    if(state.pxPerMm){
      f.xMm=pxToMm(f.x); f.yMm=pxToMm(f.y);
      f.diameterPx=mmToPx(f.diameterMm||3);
      f.widthPx=mmToPx(f.widthMm||4);
      f.depthPx=mmToPx(f.depthMm||1);
    } else {
      f.diameterPx=Number.isFinite(Number(f.diameterPx))?Number(f.diameterPx):18;
      f.widthPx=Number.isFinite(Number(f.widthPx))?Number(f.widthPx):30;
      f.depthPx=Number.isFinite(Number(f.depthPx))?Number(f.depthPx):6;
    }
    return f;
  }
  function selectedRoadFeature(){return state.roadFeatures.find(f=>f.id===state.selectedRoadFeatureId)||null;}
  function clearRoadFeatureSelection(){state.selectedRoadFeatureId=null;}
  function roadSurfaceAtPoint(p){
    for(let i=state.roads.length-1;i>=0;i--){
      const r=normalizeRoad(state.roads[i]);
      if(r.hidden) continue;
      if((r.roadPolygonPx||[]).length>=3 && pointInPoly(p,r.roadPolygonPx)) return r;
    }
    return null;
  }
  function hitRoadFeature(p,pointerType='mouse'){
    const tol=(pointerType==='touch'?14:9)/state.view.scale;
    for(let i=state.roadFeatures.length-1;i>=0;i--){
      const f=normalizeRoadFeature(state.roadFeatures[i]);
      if(f.hidden) continue;
      const a=rad(f.rotationDeg||0), ca=Math.cos(-a), sa=Math.sin(-a);
      const dx=p.x-f.x, dy=p.y-f.y;
      const lx=dx*ca-dy*sa, ly=dx*sa+dy*ca;
      if(f.kind==='manhole' && f.hatchShape==='circle'){
        if(Math.hypot(lx,ly) <= (f.diameterPx||18)/2 + tol) return f;
      } else {
        const hw=(f.widthPx||20)/2+tol, hh=(f.depthPx||8)/2+tol;
        if(Math.abs(lx)<=hw && Math.abs(ly)<=hh) return f;
      }
    }
    return null;
  }
  function placeRoadFeature(p,kind){
    const road=roadSurfaceAtPoint(p);
    if(!road){ setStatusHint('Place road items on a generated road surface.'); return null; }
    const f=normalizeRoadFeature({id:uid('roadFeature'),kind,roadId:road.id,x:p.x,y:p.y,rotationDeg:0});
    if(kind==='marking') applyRoadMarkingPreset(f, state.lastRoadMarkingPreset || 'stopLine');
    if(kind==='manhole') applyRoadHatchPreset(f, state.lastRoadHatchPreset || 'round600');
    state.roadFeatures.push(f);
    state.selectedRoadFeatureId=f.id;
    state.selectedRoadId=null; clearBuildingSelection(); state.selectedStreetlightId=null; state.selectedBenchworkId=null; state.selectedAnnotationId=null;
    syncAll();
    return f;
  }
  function moveRoadFeature(f,dx,dy){ if(!f||f.locked) return; f.x+=dx; f.y+=dy; normalizeRoadFeature(f); }
  function deleteSelectedRoadFeature(){
    if(!state.selectedRoadFeatureId) return false;
    state.roadFeatures=state.roadFeatures.filter(f=>f.id!==state.selectedRoadFeatureId);
    state.selectedRoadFeatureId=null;
    syncAll();
    return true;
  }

  function drawRoadMarkingShape(f){
    const w=f.widthPx||30, h=f.depthPx||6, draw=f.markingDraw||markingPresetByKey(f.markingPreset||f.markingType).draw;
    if(draw==='crosswalk'){
      const stripes=5, gap=w/(stripes+1), stripeW=Math.max(1.5/state.view.scale,gap*.38);
      for(let i=0;i<stripes;i++) ctx.fillRect(-w/2+gap*(i+1)-stripeW/2,-h/2,stripeW,h);
    } else if(draw==='bicycleCrossing'){
      ctx.lineWidth=Math.max(.8/state.view.scale,h*.12); ctx.strokeRect(-w/2,-h/2,w,h); ctx.beginPath(); ctx.moveTo(-w/2,-h*.12); ctx.lineTo(w/2,-h*.12); ctx.moveTo(-w/2,h*.12); ctx.lineTo(w/2,h*.12); ctx.stroke();
    } else if(draw==='diamond'){
      ctx.beginPath(); ctx.moveTo(0,-h/2); ctx.lineTo(w/2,0); ctx.lineTo(0,h/2); ctx.lineTo(-w/2,0); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if(draw==='arrow'){
      ctx.beginPath(); ctx.moveTo(0,-h/2); ctx.lineTo(w/2,-h*.05); ctx.lineTo(w*.18,-h*.05); ctx.lineTo(w*.18,h/2); ctx.lineTo(-w*.18,h/2); ctx.lineTo(-w*.18,-h*.05); ctx.lineTo(-w/2,-h*.05); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if(draw==='dashedLine' || draw==='curbDash'){
      const segs=draw==='curbDash'?4:3, segW=w/(segs*2-1);
      for(let i=0;i<segs;i++) ctx.fillRect(-w/2+i*segW*2,-h/2,segW,h);
    } else if(draw==='chevronZone'){
      ctx.lineWidth=Math.max(1/state.view.scale,h*.08); ctx.strokeRect(-w/2,-h/2,w,h); const n=5; for(let i=0;i<n;i++){const x=-w/2+(i+.5)*w/n; ctx.beginPath(); ctx.moveTo(x-w/n*.35,h/2); ctx.lineTo(x+w/n*.35,-h/2); ctx.stroke();}
    } else if(draw==='safetyZone'){
      ctx.lineWidth=Math.max(1/state.view.scale,h*.08); ctx.strokeRect(-w/2,-h/2,w,h); ctx.beginPath(); ctx.moveTo(-w/2,0); ctx.lineTo(w/2,0); ctx.stroke(); const n=4; for(let i=0;i<n;i++){const x=-w/2+(i+.5)*w/n; ctx.beginPath(); ctx.moveTo(x-w/n*.25,h/2); ctx.lineTo(x+w/n*.25,-h/2); ctx.stroke();}
    } else if(draw==='box'){
      ctx.lineWidth=Math.max(1/state.view.scale,h*.10); ctx.strokeRect(-w/2,-h/2,w,h); ctx.beginPath(); ctx.moveTo(-w/2,-h*.15); ctx.lineTo(w/2,-h*.15); ctx.moveTo(-w/2,h*.15); ctx.lineTo(w/2,h*.15); ctx.stroke();
    } else if(draw==='speedNumber'){
      ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.font=`${Math.max(6,h*1.15)}px system-ui, sans-serif`; ctx.fillText(f.text||'30',0,0); ctx.restore();
    } else {
      ctx.fillRect(-w/2,-h/2,w,h); ctx.strokeRect(-w/2,-h/2,w,h);
    }
  }

  function drawRoadFeature(raw){
    const f=normalizeRoadFeature(raw); if(!f||f.hidden) return;
    const selected=f.id===state.selectedRoadFeatureId, hovered=f.id===state.hoverRoadFeatureId;
    ctx.save(); ctx.translate(f.x,f.y); ctx.rotate(rad(f.rotationDeg||0));
    ctx.lineWidth=(selected||hovered?2.5:1.5)/state.view.scale;
    if(f.kind==='manhole'){
      ctx.strokeStyle=selected?'#d95f24':(f.color||'#3a2b1e'); ctx.fillStyle='rgba(58,43,30,.18)';
      if(f.hatchShape==='circle'){
        const r=(f.diameterPx||18)/2; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-r*.65,0); ctx.lineTo(r*.65,0); ctx.moveTo(0,-r*.65); ctx.lineTo(0,r*.65); ctx.stroke();
      } else {
        const w=f.widthPx||24, h=f.depthPx||18; ctx.beginPath(); ctx.rect(-w/2,-h/2,w,h); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-w/2,h/2); ctx.lineTo(w/2,-h/2); ctx.stroke();
      }
    } else {
      ctx.strokeStyle=selected?'#d95f24':(f.color||'#f7f2df'); ctx.fillStyle=f.color||'#f7f2df';
      drawRoadMarkingShape(f);
    }
    if(selected){ctx.setLineDash([4/state.view.scale,3/state.view.scale]); ctx.strokeStyle='#d95f24'; ctx.beginPath(); ctx.arc(0,0,Math.max(f.widthPx||0,f.depthPx||0,f.diameterPx||0)/2+6/state.view.scale,0,Math.PI*2); ctx.stroke();}
    ctx.restore();
  }
  function createRoadCenterlineFromPoints(points){
    const defaultRoadMm = presetModelMm(roadPresetByKey('two_lane_local')) || 40; const defaultSidewalkMm = presetModelMm(sidewalkPresetByKey('standard')) || 10;
    const r=normalizeRoad({id:uid('road'), name:`Road ${state.roads.length+1}`, mode:'centerline', pointsPx:(points||[]).map(p=>({x:p.x,y:p.y})), curvesPx:[], roadWidthPreset:'two_lane_local', widthMm:defaultRoadMm, widthPx:state.pxPerMm?mmToPx(defaultRoadMm):48, sidewalkSide:'none', sidewalkWidthPreset:'standard', sidewalkWidthMm:defaultSidewalkMm, sidewalkWidthPx:state.pxPerMm?mmToPx(defaultSidewalkMm):10, color:'#6f6a5e'});
    syncRoadMetrics(r);
    return r;
  }
  function createRoadCenterline(a,b){ return createRoadCenterlineFromPoints([a,b]); }
  function finishRoadCenterline(){
    if(state.roadDraft.length<2) return;
    const r=createRoadCenterlineFromPoints(state.roadDraft);
    state.roads.push(r); state.selectedRoadId=r.id; clearBuildingSelection(); state.selectedStreetlightId=null; state.selectedBenchworkId=null; state.selectedAnnotationId=null; state.roadDraft=[]; syncAll();
  }
  function finishRoadOutline(){
    if(state.roadDraft.length<3) return;
    const r=normalizeRoad({id:uid('road'), name:`Road Outline ${state.roads.length+1}`, mode:'outline', pointsPx:state.roadDraft.slice(), widthMm:0, widthPx:0, sidewalkSide:'none', sidewalkWidthMm:0, sidewalkWidthPx:0, color:'#6f6a5e'});
    state.roads.push(r); state.selectedRoadId=r.id; clearBuildingSelection(); state.selectedStreetlightId=null; state.selectedBenchworkId=null; state.selectedAnnotationId=null; state.roadDraft=[]; syncAll();
  }

  function drawPoly(pts, fill=true, stroke=true){
    if(!Array.isArray(pts) || pts.length<2) return;
    ctx.beginPath();
    pts.forEach((p,i)=>{
      if(i===0) ctx.moveTo(p.x,p.y);
      else ctx.lineTo(p.x,p.y);
    });
    if(pts.length>2) ctx.closePath();
    if(fill && pts.length>2) ctx.fill();
    if(stroke) ctx.stroke();
  }

  function drawRoadGeneratedPath(path, stroke, width=1.4, dash=null){
    if(!Array.isArray(path) || path.length<2) return;
    ctx.save();
    ctx.strokeStyle=stroke;
    ctx.lineWidth=width/state.view.scale;
    if(dash) ctx.setLineDash(dash.map(v=>v/state.view.scale));
    ctx.beginPath();
    path.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
    ctx.stroke();
    ctx.restore();
  }
  function roadEdgePaths(r){
    const path = r.roadCenterlineSamplesPx || roadCenterlineSamples(r);
    if(!Array.isArray(path) || path.length<2) return {left:[], right:[]};
    const hw=(r.widthPx||20)/2;
    const left=[], right=[];
    path.forEach((p,i)=>{
      const prev=path[Math.max(0,i-1)], next=path[Math.min(path.length-1,i+1)];
      let dx=next.x-prev.x, dy=next.y-prev.y, len=Math.hypot(dx,dy)||1;
      const nx=-dy/len, ny=dx/len;
      left.push({x:p.x+nx*hw,y:p.y+ny*hw});
      right.push({x:p.x-nx*hw,y:p.y-ny*hw});
    });
    return {left,right};
  }

  function roadHasSidewalk(r){
    return !!(r && r.mode==='centerline' && r.sidewalkSide && r.sidewalkSide!=='none' && Number(r.sidewalkWidthPx)>0);
  }
  function roadEndpointJunctions(){
    const out=[];
    const seen=new Set();
    state.roads.forEach(raw=>{
      const r=normalizeRoad(raw);
      if(r.hidden || r.mode!=='centerline' || !r.pointsPx || r.pointsPx.length<2) return;
      const endpoints=[{point:r.pointsPx[0], key:'start'}, {point:r.pointsPx[r.pointsPx.length-1], key:'end'}];
      endpoints.forEach(ep=>{
        let best=null;
        state.roads.forEach(otherRaw=>{
          const other=normalizeRoad(otherRaw);
          if(other.id===r.id || other.hidden || other.mode!=='centerline') return;
          const hit=nearestPointOnRoadPath(ep.point, other, true);
          const tol=Math.max(3, Math.min((r.widthPx||20),(other.widthPx||20))*0.35);
          if(hit && hit.distance<=tol && (!best || hit.distance<best.distance)) best={...hit, other};
        });
        if(best){
          const x=(ep.point.x+best.point.x)/2, y=(ep.point.y+best.point.y)/2;
          const k=`${Math.round(x*10)/10},${Math.round(y*10)/10}`;
          if(!seen.has(k)){
            seen.add(k);
            const roadRadius=Math.max((r.widthPx||20),(best.other?.widthPx||20))*0.58;
            const sw=Math.max(roadHasSidewalk(r)?(r.sidewalkWidthPx||0):0, roadHasSidewalk(best.other)?(best.other.sidewalkWidthPx||0):0);
            const hasSidewalkBulb=sw>0;
            out.push({
              x,y,
              radius:roadRadius,
              sidewalkRadius:hasSidewalkBulb ? roadRadius + sw : 0,
              sidewalkWidth:sw,
              hasSidewalkBulb,
              selected:r.id===state.selectedRoadId || best.other?.id===state.selectedRoadId
            });
          }
        }
      });
    });
    return out;
  }

  function pathTotalLength(path){let len=0; for(let i=1;i<(path||[]).length;i++) len+=dist(path[i-1],path[i]); return len;}
  function pointAtPathDistance(path, target){
    path=path||[]; if(!path.length) return null;
    if(target<=0) return {point:{...path[0]}, tangent:path[1]?Math.atan2(path[1].y-path[0].y,path[1].x-path[0].x):0, index:0};
    let acc=0;
    for(let i=1;i<path.length;i++){
      const a=path[i-1], b=path[i], seg=dist(a,b);
      if(acc+seg>=target){const t=seg?((target-acc)/seg):0; return {point:{x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}, tangent:Math.atan2(b.y-a.y,b.x-a.x), index:i-1};}
      acc+=seg;
    }
    const a=path[Math.max(0,path.length-2)], b=path[path.length-1];
    return {point:{...b}, tangent:a?Math.atan2(b.y-a.y,b.x-a.x):0, index:path.length-1};
  }
  function lineIntersection(a,b,c,d){
    const den=(a.x-b.x)*(c.y-d.y)-(a.y-b.y)*(c.x-d.x); if(Math.abs(den)<1e-9) return null;
    const px=((a.x*b.y-a.y*b.x)*(c.x-d.x)-(a.x-b.x)*(c.x*d.y-c.y*d.x))/den;
    const py=((a.x*b.y-a.y*b.x)*(c.y-d.y)-(a.y-b.y)*(c.x*d.y-c.y*d.x))/den;
    const within=(p,q,r)=>Math.min(p,q)-1e-6<=r&&r<=Math.max(p,q)+1e-6;
    if(within(a.x,b.x,px)&&within(a.y,b.y,py)&&within(c.x,d.x,px)&&within(c.y,d.y,py)) return {x:px,y:py};
    return null;
  }
  function benchworkBoundaryDistances(path){
    const hits=[]; if(!path?.length) return hits;
    for(const bwRaw of (state.benchworkOutlines||[])){
      const bw=normalizeBenchworkOutline(bwRaw); const pts=benchworkPathSamples(bw,10); if(pts.length<2) continue;
      let acc=0;
      for(let i=1;i<path.length;i++){
        const a=path[i-1], b=path[i], segLen=dist(a,b);
        for(let j=1;j<pts.length;j++){
          const hit=lineIntersection(a,b,pts[j-1],pts[j]);
          if(hit){ hits.push({distance:acc+dist(a,hit), point:hit, source:'benchwork'}); }
        }
        acc+=segLen;
      }
    }
    return hits;
  }
  function roadJunctionPoints(){return roadEndpointJunctions().map(j=>({x:j.x,y:j.y,radius:Math.max(j.radius||0,j.sidewalkRadius||0)}));}
  function isNearJunctionPoint(p, junctions, avoidPx){return (junctions||[]).some(j=>dist(p,j)<Math.max(avoidPx,j.radius||0));}
  function sidewalkTotalWidthPx(r){
    if(!roadHasSidewalk(r)) return 0;
    const sw=r.sidewalkWidthPx||0;
    if(r.sidewalkSide==='both') return sw*2;
    if(r.sidewalkSide==='left'||r.sidewalkSide==='right') return sw;
    return 0;
  }
  function roadSeamLineAt(r, path, d, opts={}){
    const hit=pointAtPathDistance(path,d); if(!hit) return null;
    const half=(r.widthPx||20)/2 + sidewalkTotalWidthPx(r) + 3;
    const a=hit.tangent+Math.PI/2;
    return {roadId:r.id, x:hit.point.x, y:hit.point.y, x1:hit.point.x+Math.cos(a)*half, y1:hit.point.y+Math.sin(a)*half, x2:hit.point.x-Math.cos(a)*half, y2:hit.point.y-Math.sin(a)*half, distance:d, source:opts.source||'length'};
  }
  function outlineSeams(r,maxPiecePx){
    const poly=r.roadPolygonPx||[]; if(poly.length<3) return [];
    const xs=poly.map(p=>p.x), ys=poly.map(p=>p.y); const bb={minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
    const w=bb.maxX-bb.minX, h=bb.maxY-bb.minY, seams=[];
    if(Math.max(w,h)<=maxPiecePx*1.15) return seams;
    if(w>=h){const count=Math.floor(w/maxPiecePx); for(let i=1;i<=count;i++){const x=bb.minX+i*w/(count+1); seams.push({roadId:r.id,x,y:(bb.minY+bb.maxY)/2,x1:x,y1:bb.minY,x2:x,y2:bb.maxY,source:'outline'});}}
    else {const count=Math.floor(h/maxPiecePx); for(let i=1;i<=count;i++){const y=bb.minY+i*h/(count+1); seams.push({roadId:r.id,x:(bb.minX+bb.maxX)/2,y,x1:bb.minX,y1:y,x2:bb.maxX,y2:y,source:'outline'});}}
    return seams;
  }
  function generateRoadExportData(){
    syncAll();
    const maxPiecePx=Math.max(12, mmToPx(state.roadExportSettings?.maxPieceMm||120));
    const avoidPx=Math.max(4, mmToPx(state.roadExportSettings?.avoidJunctionMm||18));
    const minPiecePx=Math.max(4, mmToPx(state.roadExportSettings?.minPieceMm||35));
    const junctions=roadJunctionPoints();
    const roads=[]; const seams=[];
    (state.roads||[]).forEach(raw=>{
      const r=normalizeRoad(raw); if(r.hidden) return;
      const roadRecord={id:r.id,name:r.name||'Road',mode:r.mode,roadPolygonPx:r.roadPolygonPx||[],sidewalkPolygonsPx:r.sidewalkPolygonsPx||[],seams:[]};
      if(r.mode==='centerline'){
        const path=roadCenterlineSamples(r,20); const total=pathTotalLength(path);
        const benchHits=benchworkBoundaryDistances(path).filter(h=>h.distance>minPiecePx&&h.distance<total-minPiecePx);
        const candidateDistances=[];
        if(total>maxPiecePx*1.15){const count=Math.floor(total/maxPiecePx); for(let i=1;i<=count;i++) candidateDistances.push({distance:i*total/(count+1), source:'length'});}
        benchHits.forEach(h=>candidateDistances.push({distance:h.distance, source:'benchwork'}));
        candidateDistances.sort((a,b)=>a.distance-b.distance);
        const used=[];
        for(const cand of candidateDistances){
          let d=cand.distance;
          let hit=pointAtPathDistance(path,d);
          if(!hit) continue;
          // Phase 3: avoid junction bulbs by sliding the seam a little along the road.
          let tries=0;
          while(isNearJunctionPoint(hit.point,junctions,avoidPx) && tries<12){d += avoidPx*(tries%2? -1:1) * (Math.floor(tries/2)+1); d=clamp(d,minPiecePx,total-minPiecePx); hit=pointAtPathDistance(path,d); tries++;}
          if(!hit || isNearJunctionPoint(hit.point,junctions,avoidPx)) continue;
          if(used.some(u=>Math.abs(u-d)<minPiecePx)) continue;
          const seam=roadSeamLineAt(r,path,d,{source:cand.source});
          if(seam){used.push(d); roadRecord.seams.push(seam); seams.push(seam);}
        }
      } else {
        roadRecord.seams=outlineSeams(r,maxPiecePx); seams.push(...roadRecord.seams);
      }
      roads.push(roadRecord);
    });
    return {roads,seams,junctions,maxPiecePx,avoidPx};
  }
  function drawRoadExportPreview(){
    if(!state.roadExportPreview) return;
    const data=generateRoadExportData();
    ctx.save();
    ctx.lineWidth=2.2/state.view.scale;
    ctx.setLineDash([8/state.view.scale,5/state.view.scale]);
    data.seams.forEach((s,i)=>{
      ctx.strokeStyle=s.source==='benchwork'?'#0f766e':'#c84a3a';
      ctx.beginPath(); ctx.moveTo(s.x1,s.y1); ctx.lineTo(s.x2,s.y2); ctx.stroke();
      drawLabel(`R${i+1}`,{x:s.x+4/state.view.scale,y:s.y-4/state.view.scale});
    });
    ctx.setLineDash([]);
    data.roads.forEach((r,idx)=>{
      const poly=r.roadPolygonPx||[]; if(!poly.length) return;
      const c=polygonCenter(poly); drawLabel(`${r.name||('Road '+(idx+1))} · ${Math.max(1,(r.seams||[]).length+1)} pcs`,{x:c.x+6/state.view.scale,y:c.y-8/state.view.scale});
    });
    ctx.restore();
    updateRoadExportBadge(data);
  }
  function updateRoadExportBadge(data){
    const el=$('roadExportBadge'); if(!el) return;
    if(!state.roadExportPreview){el.style.display='none'; return;}
    el.style.display='block';
    el.innerHTML=`<b>Road Export Preview</b>${data.roads.length} roads · ${data.seams.length} seam cuts<br><span class="muted">Seams avoid junction bulbs and use benchwork crossings where found.</span>`;
  }
  function setRoadExportPreview(on){
    state.roadExportPreview=!!on;
    ['roadExportPreviewBtn','mobileRoadExportPreviewBtn'].forEach(id=>{const b=$(id); if(b) b.textContent='Road Export Preview: '+(state.roadExportPreview?'On':'Off');});
    draw();
  }

  function drawRoadJunctions(){
    const junctions=roadEndpointJunctions();
    if(!junctions.length) return;
    ctx.save();
    junctions.forEach(j=>{
      const roadR=Math.max(4/state.view.scale,j.radius);
      if(j.hasSidewalkBulb){
        // Sidewalk corner bulbs: draw one rounded joined sidewalk mass around the
        // junction first, then repaint the road mouth through the middle. This
        // visually splits sidewalks back from the road while joining touching
        // sidewalk corners into one continuous crossing bulb.
        const bulbR=Math.max(roadR + 2/state.view.scale, j.sidewalkRadius);
        ctx.fillStyle='rgba(226,214,188,.84)';
        ctx.strokeStyle=j.selected?'#c84a3a':'rgba(154,140,105,.85)';
        ctx.lineWidth=(j.selected?1.8:1.1)/state.view.scale;
        ctx.beginPath();
        ctx.arc(j.x,j.y,bulbR,0,Math.PI*2);
        ctx.fill(); ctx.stroke();
      }
      ctx.fillStyle=j.selected?'rgba(200,74,58,.30)':'rgba(111,106,94,.52)';
      ctx.strokeStyle=j.selected?'#c84a3a':'rgba(70,68,62,.82)';
      ctx.lineWidth=(j.selected?2.2:1.4)/state.view.scale;
      ctx.beginPath();
      ctx.arc(j.x,j.y,roadR,0,Math.PI*2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle=j.selected?'#c84a3a':'#6f6a5e';
      ctx.beginPath();
      ctx.arc(j.x,j.y,3.5/state.view.scale,0,Math.PI*2);
      ctx.fill();
    });
    ctx.restore();
  }
  function drawRoad(r){
    r=normalizeRoad(r); if(r.hidden) return;
    const selected=r.id===state.selectedRoadId, hovered=r.id===state.hoverRoadId;
    const roadPoly=r.roadPolygonPx||[];
    ctx.save();

    // Generated sidewalk surfaces first, so the road surface sits cleanly on top.
    for(const sw of (r.sidewalkPolygonsPx||[])){
      ctx.fillStyle='rgba(226,214,188,.72)';
      ctx.strokeStyle=selected?'#c84a3a':'#b9aa86';
      ctx.lineWidth=(selected?2.2:1.4)/state.view.scale;
      drawPoly(sw.polygon, true);
    }

    // Generated road surface. Keep this visible even when the road is not selected;
    // the centerline remains an edit control, not the only visible road geometry.
    ctx.fillStyle=selected?'rgba(200,74,58,.26)':(hovered?'rgba(111,106,94,.46)':'rgba(111,106,94,.36)');
    ctx.strokeStyle=selected?'#c84a3a':(hovered?'#2a64aa':'#6f6a5e');
    ctx.lineWidth=(selected||hovered?3:2.2)/state.view.scale;
    drawPoly(roadPoly, true);

    if(r.mode==='centerline' && r.pointsPx?.length>=2){
      const edges=roadEdgePaths(r);
      // Draw explicit generated edge paths so completed roads read as road/sidewalk paths.
      drawRoadGeneratedPath(edges.left, selected?'#c84a3a':'rgba(70,68,62,.75)', selected?2.2:1.4);
      drawRoadGeneratedPath(edges.right, selected?'#c84a3a':'rgba(70,68,62,.75)', selected?2.2:1.4);
      for(const sw of (r.sidewalkPolygonsPx||[])){
        const poly=sw.polygon||[];
        if(poly.length>=2) drawRoadGeneratedPath(poly.concat([poly[0]]), selected?'#c84a3a':'rgba(154,140,105,.75)', selected?1.8:1.1);
      }

      // Editable centerline spline overlay.
      ctx.strokeStyle=selected?'rgba(42,42,40,.85)':'rgba(42,42,40,.45)';
      ctx.lineWidth=(selected?1.6:1.15)/state.view.scale;
      ctx.setLineDash([6/state.view.scale,5/state.view.scale]);
      ctx.beginPath();
      r.pointsPx.forEach((pt,i)=>{
        if(i===0) ctx.moveTo(pt.x,pt.y);
        else { const c=r.curvesPx?.[i-1]; if(c) ctx.quadraticCurveTo(c.x,c.y,pt.x,pt.y); else ctx.lineTo(pt.x,pt.y); }
      });
      ctx.stroke(); ctx.setLineDash([]);
      if(selected||hovered){
        ctx.fillStyle=selected?'#c84a3a':'#2a64aa';
        r.pointsPx.forEach(pt=>{ctx.beginPath();ctx.arc(pt.x,pt.y,4/state.view.scale,0,Math.PI*2);ctx.fill();});
        if(r.curvesPx){
          ctx.strokeStyle='rgba(200,74,58,.42)'; ctx.lineWidth=1/state.view.scale; ctx.setLineDash([3/state.view.scale,4/state.view.scale]);
          r.curvesPx.forEach((c,i)=>{ if(!c) return; const a=r.pointsPx[i], b=r.pointsPx[i+1]; ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(c.x,c.y); ctx.lineTo(b.x,b.y); ctx.stroke(); });
          ctx.setLineDash([]);
          ctx.fillStyle='#fff'; ctx.strokeStyle='#c84a3a'; ctx.lineWidth=2/state.view.scale;
          r.curvesPx.forEach(c=>{ if(!c) return; ctx.beginPath(); ctx.arc(c.x,c.y,5/state.view.scale,0,Math.PI*2); ctx.fill(); ctx.stroke(); });
        }
        if(state.hoverRoadSegment && state.hoverRoadSegment.roadId===r.id){
          const i=state.hoverRoadSegment.index, a=r.pointsPx[i], b=r.pointsPx[i+1], c=r.curvesPx?.[i];
          ctx.save(); ctx.strokeStyle='#d79631'; ctx.lineWidth=5/state.view.scale; ctx.globalAlpha=.65; ctx.beginPath(); ctx.moveTo(a.x,a.y); if(c) ctx.quadraticCurveTo(c.x,c.y,b.x,b.y); else ctx.lineTo(b.x,b.y); ctx.stroke(); ctx.restore();
        }
      }
    }
    if(r.mode==='outline' && (selected||hovered)){
      const edit = selected && state.roadOutlineEditId===r.id;
      if(edit){
        ctx.fillStyle='#fff7ed'; ctx.strokeStyle='#c84a3a'; ctx.lineWidth=2/state.view.scale;
        (r.pointsPx||[]).forEach(pt=>{ctx.beginPath();ctx.arc(pt.x,pt.y,5/state.view.scale,0,Math.PI*2);ctx.fill();ctx.stroke();});
        (r.curvesPx||[]).forEach((c,i)=>{ if(!c) return; const a=r.pointsPx[i], b=r.pointsPx[(i+1)%r.pointsPx.length]; ctx.save(); ctx.strokeStyle='rgba(200,74,58,.42)'; ctx.lineWidth=1/state.view.scale; ctx.setLineDash([3/state.view.scale,4/state.view.scale]); ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(c.x,c.y); ctx.lineTo(b.x,b.y); ctx.stroke(); ctx.restore(); ctx.beginPath(); ctx.arc(c.x,c.y,5/state.view.scale,0,Math.PI*2); ctx.fill(); ctx.stroke(); });
        if(state.hoverRoadSegment && state.hoverRoadSegment.roadId===r.id){
          const i=state.hoverRoadSegment.index, a=r.pointsPx[i], b=r.pointsPx[(i+1)%r.pointsPx.length], c=r.curvesPx?.[i];
          ctx.save(); ctx.strokeStyle='#d79631'; ctx.lineWidth=6/state.view.scale; ctx.globalAlpha=.65; ctx.beginPath(); ctx.moveTo(a.x,a.y); if(c) ctx.quadraticCurveTo(c.x,c.y,b.x,b.y); else ctx.lineTo(b.x,b.y); ctx.stroke(); ctx.restore();
        }
      }
    }
    if(selected||hovered){ const c=polygonCenter(roadPoly||r.pointsPx||[]); const extra=r.mode==='centerline'?' · '+fmt(r.widthMm)+' mm':(state.roadOutlineEditId===r.id?' · editing outline':''); drawLabel(`${r.name||'Road'}${extra}`,{x:c.x+8/state.view.scale,y:c.y-8/state.view.scale}); }
    ctx.restore();
  }
  function renderRoads(){
    const box=$('roadList'); if(!box) return;
    if(!state.roads.length){box.innerHTML='<div class="small muted">No roads yet.</div>'; return;}
    box.innerHTML='';
    state.roads.forEach(raw=>{const r=normalizeRoad(raw); const el=document.createElement('div'); el.className='buildingItem '+(r.id===state.selectedRoadId?'selected':''); el.innerHTML=`<span class="swatch" style="background:${r.color||'#6f6a5e'}"></span><div><b>${escapeHtml(r.name||'Road')}</b><br><span class="small muted">${r.mode==='outline'?'outline':'centerline'}${r.sidewalkSide&&r.sidewalkSide!=='none'?' · sidewalk '+r.sidewalkSide:''}${r.locked?' · locked':''}</span></div><span class="pill">${r.mode==='centerline'?fmt(r.widthMm||0)+'mm':'poly'}</span>`; el.onclick=()=>{state.selectedRoadId=r.id; clearBuildingSelection(); state.selectedStreetlightId=null; state.selectedBenchworkId=null; state.selectedAnnotationId=null; renderRoads(); renderList(); renderStreetlights(); renderSelected(); draw();}; box.appendChild(el);});
  }

  function hitStreetlight(p,pointerType='mouse'){
    const coarse=(pointerType==='pen'||pointerType==='touch'||matchMedia('(pointer: coarse)').matches);
    const tol=(coarse?18:10)/state.view.scale;
    for(let i=state.streetlights.length-1;i>=0;i--){
      const l=normalizeStreetlight(state.streetlights[i]);
      if(dist(p,l)<tol) return l;
    }
    return null;
  }

  function buildingPoints(b){return b.padType==='rect'?transformedRect(b):(b.pointsPx||[]);}
  function buildingCenter(b){return b.padType==='rect'?{x:b.x,y:b.y}:polygonCenter(b.pointsPx||[]);}
  function polyEdgeDistance(p,pts){
    if(!pts||pts.length<2) return Infinity;
    let best=Infinity;
    for(let i=0;i<pts.length;i++) best=Math.min(best,distanceToSegment(p,pts[i],pts[(i+1)%pts.length]));
    return best;
  }
  function rotateHandlePoint(b){
    const pts=buildingPoints(b); if(!pts.length) return buildingCenter(b);
    const c=buildingCenter(b);
    let top=pts[0];
    pts.forEach(q=>{if(q.y<top.y) top=q;});
    const r=Math.max(28/state.view.scale, Math.max(...pts.map(q=>dist(c,q)))+22/state.view.scale);
    const ang=Math.atan2(top.y-c.y, top.x-c.x)-Math.PI/10;
    return {x:c.x+Math.cos(ang)*r,y:c.y+Math.sin(ang)*r};
  }
  function rotationZoneHit(p,b,pointerType='mouse'){
    const pts=buildingPoints(b); if(!pts.length) return false;
    const coarse=(pointerType==='pen'||pointerType==='touch'||matchMedia('(pointer: coarse)').matches);
    const nearMin=(coarse?8:5)/state.view.scale;
    const nearMax=(coarse?42:30)/state.view.scale;
    const d=polyEdgeDistance(p,pts);
    const inside=pointInPoly(p,pts);
    return !inside && d>=nearMin && d<=nearMax;
  }
  function handleAt(p,b,pointerType='mouse'){
    if(!b || b.locked) return null;
    const coarse=(pointerType==='pen'||pointerType==='touch'||matchMedia('(pointer: coarse)').matches);
    const s=(coarse?18:9)/state.view.scale;
    const pts=buildingPoints(b);
    if(b.padType==='polygon'){
      for(let i=0;i<pts.length;i++) if(dist(p,pts[i])<s) return {type:'polyPoint', index:i};
    } else {
      for(let i=0;i<pts.length;i++) if(dist(p,pts[i])<s) return {type:'rectCorner', index:i};
    }
    const rot=rotateHandlePoint(b);
    if(dist(p,rot)<s*1.5 || rotationZoneHit(p,b,pointerType)) return {type:'rotate'};
    return null;
  }
  function distanceToSegment(p,a,b){
    const vx=b.x-a.x, vy=b.y-a.y;
    const len2=vx*vx+vy*vy;
    if(len2<=1e-9) return dist(p,a);
    const t=clamp(((p.x-a.x)*vx+(p.y-a.y)*vy)/len2,0,1);
    return Math.hypot(p.x-(a.x+vx*t),p.y-(a.y+vy*t));
  }
  function hitAnnotation(p,pointerType='mouse'){
    const coarse=(pointerType==='pen'||pointerType==='touch'||matchMedia('(pointer: coarse)').matches);
    const tol=(coarse?18:9)/state.view.scale;
    for(let si=state.annotations.length-1; si>=0; si--){
      const st=state.annotations[si], pts=st.points||[];
      if(pts.length<2) continue;
      for(let i=1;i<pts.length;i++){
        const a=pts[i-1], b=pts[i];
        const pr=((a.pressure||.5)+(b.pressure||.5))/2;
        const visual=((st.baseWidth||2.2)*(0.55+pr*1.45))/state.view.scale;
        if(distanceToSegment(p,a,b) <= tol + visual/2) return st;
      }
    }
    return null;
  }
  function selectedAnnotation(){return state.annotations.find(st=>st.id===state.selectedAnnotationId)||null;}
  function deleteSelectedAnnotation(){
    if(!state.selectedAnnotationId) return false;
    const before=state.annotations.length;
    state.annotations=state.annotations.filter(st=>st.id!==state.selectedAnnotationId);
    state.selectedAnnotationId=null;
    if(before!==state.annotations.length){renderSelected(); draw(); markDirty('annotation deleted'); return true;}
    return false;
  }

  function selectedStreetlight(){return state.streetlights.find(l=>l.id===state.selectedStreetlightId)||null;}
  function deleteSelectedStreetlight(){
    if(!state.selectedStreetlightId) return false;
    const before=state.streetlights.length;
    state.streetlights=state.streetlights.filter(l=>l.id!==state.selectedStreetlightId);
    state.selectedStreetlightId=null;
    if(before!==state.streetlights.length){syncAll(); return true;}
    return false;
  }
  function normalizeStreetlight(l){
    if(!l) return l;
    l.kind = l.kind || 'streetlight';
    l.mode = l.mode || 'free';
    l.name = l.name || (l.mode==='anchored'?'Anchored Streetlight':'Streetlight');
    l.x = Number.isFinite(l.x) ? l.x : 0;
    l.y = Number.isFinite(l.y) ? l.y : 0;
    l.rotationDeg = Number.isFinite(l.rotationDeg) ? l.rotationDeg : 0;
    l.heightMm = Number.isFinite(l.heightMm) ? l.heightMm : 8;
    l.armLengthMm = Number.isFinite(l.armLengthMm) ? l.armLengthMm : 3.5;
    l.lightRadiusMm = Number.isFinite(l.lightRadiusMm) ? l.lightRadiusMm : 2;
    l.poleDiameterMm = Number.isFinite(l.poleDiameterMm) ? l.poleDiameterMm : 0.45;
    l.type = l.type || 'singleArm';
    l.color = l.color || '#c84a3a';
    l.locked = !!l.locked;
    l.anchor = l.anchor || {};
    l.anchor.mountMode = l.anchor.mountMode || (l.mode==='anchored'?'sidewalkCutHole':'free');
    l.anchor.cutHoleDiameterMm = Number.isFinite(l.anchor.cutHoleDiameterMm) ? l.anchor.cutHoleDiameterMm : 1.2;
    l.anchor.bulbMountDiameterMm = Number.isFinite(l.anchor.bulbMountDiameterMm) ? l.anchor.bulbMountDiameterMm : 3.0;
    l.anchor.edgeOffsetMm = Number.isFinite(l.anchor.edgeOffsetMm) ? l.anchor.edgeOffsetMm : 0.5;
    l.anchor.lockToRoadEdge = !!l.anchor.lockToRoadEdge;
    l.anchor.targetRoadId = l.anchor.targetRoadId || null;
    l.anchor.sidewalkSide = l.anchor.sidewalkSide || 'auto';
    return l;
  }

  const BUILDING_STATES = {
    notStarted: 'Not Started',
    inProgress: 'In Progress',
    awaitingConstruction: 'Awaiting Construction',
    complete: 'Complete'
  };
  function buildingStateLabel(value){return BUILDING_STATES[value] || BUILDING_STATES.notStarted;}
  function normalizeBuilding(b){
    if(!b) return b;
    if(!b.state) b.state='notStarted';
    if(b.state==='todo' || b.state==='planned' || b.state==='new') b.state='notStarted';
    if(b.state==='awaiting' || b.state==='readyToBuild') b.state='awaitingConstruction';
    if(!BUILDING_STATES[b.state]) b.state='notStarted';
    if(!('hakoFile' in b)) b.hakoFile=null;
    if(b.hakoFile && !b.hakoFile.fileName && b.hakoFile.name) b.hakoFile.fileName=b.hakoFile.name;
    if(b.hakoFile && !b.hakoFile.importedAt) b.hakoFile.importedAt=new Date().toISOString();
    if(b.hakoFile) b.hakoFileId=b.hakoFile.fileName || b.hakoFileId || null;
    if(!Array.isArray(b.hakoTrimLinesMm) && b.hakoConfig){
      const trim=extractHakoTrimLinesMm(b.hakoConfig);
      if(trim.length){ b.hakoTrimLinesMm=trim; b.showHakoTrimLines=true; }
    }
    return b;
  }
  function pointFromAny(raw){
    if(!raw) return null;
    if(Array.isArray(raw) && raw.length>=2){
      const x=Number(raw[0]), y=Number(raw[1]);
      return Number.isFinite(x)&&Number.isFinite(y)?{x,y}:null;
    }
    const x=Number(raw.x ?? raw.pxX ?? raw.xPx ?? raw.left);
    const y=Number(raw.y ?? raw.pxY ?? raw.yPx ?? raw.top);
    if(Number.isFinite(x)&&Number.isFinite(y)) return {x,y};
    const xm=Number(raw.xMm ?? raw.mmX ?? raw.modelX ?? raw.modelMmX);
    const ym=Number(raw.yMm ?? raw.mmY ?? raw.modelY ?? raw.modelMmY);
    if(Number.isFinite(xm)&&Number.isFinite(ym)&&state.pxPerMm) return {x:mmToPx(xm),y:mmToPx(ym)};
    return null;
  }
  function pointsFromAny(raw){
    if(!raw) return null;
    const candidates=[raw.pointsPx, raw.polygonPx, raw.polygon, raw.points, raw.footprint?.pointsPx, raw.footprint?.polygon, raw.footprint?.points, raw.hakoSeed?.footprint?.pointsPx, raw.hakoSeed?.footprint?.polygon, raw.hakoSeed?.footprint];
    for(const c of candidates){
      if(Array.isArray(c)){
        const pts=c.map(pointFromAny).filter(Boolean);
        if(pts.length>=3) return pts;
      }
    }
    return null;
  }

  // Saved Site Planner building footprints are stored in image-pixel space.
  // Keep this separate from the .hako import point parser, which may read model-mm
  // footprint fields. A previous duplicate pointsFromAny() declaration caused saved
  // pointsMm to be preferred over pointsPx on load, making footprints too large and
  // shifted away from the reference image.
  function savedBuildingPointsPx(raw){
    if(!raw) return null;
    const parsePxPoint = p=>{
      if(!p) return null;
      if(Array.isArray(p) && p.length>=2){
        const x=Number(p[0]), y=Number(p[1]);
        return Number.isFinite(x)&&Number.isFinite(y)?{x,y}:null;
      }
      const x=Number(p.x ?? p.pxX ?? p.xPx ?? p.left);
      const y=Number(p.y ?? p.pxY ?? p.yPx ?? p.top);
      return Number.isFinite(x)&&Number.isFinite(y)?{x,y}:null;
    };
    const pixelCandidates=[
      raw.pointsPx,
      raw.polygonPx,
      raw.footprint?.pointsPx,
      raw.footprint?.polygonPx,
      raw.hakoSeed?.footprint?.pointsPx,
      raw.hakoSeed?.footprint?.polygonPx
    ];
    for(const c of pixelCandidates){
      if(Array.isArray(c)){
        const pts=c.map(parsePxPoint).filter(Boolean);
        if(pts.length>=3) return pts;
      }
    }
    // Only use mm coordinates as a legacy fallback when no pixel-space geometry exists.
    const parseMmPoint = p=>{
      if(!p || !state.pxPerMm) return null;
      if(Array.isArray(p) && p.length>=2){
        const x=Number(p[0]), y=Number(p[1]);
        return Number.isFinite(x)&&Number.isFinite(y)?{x:mmToPx(x),y:mmToPx(y)}:null;
      }
      const x=Number(p.xMm ?? p.mmX ?? p.modelX ?? p.modelMmX ?? p.x);
      const y=Number(p.yMm ?? p.mmY ?? p.modelY ?? p.modelMmY ?? p.y);
      return Number.isFinite(x)&&Number.isFinite(y)?{x:mmToPx(x),y:mmToPx(y)}:null;
    };
    const mmCandidates=[
      raw.pointsMm,
      raw.polygonMm,
      raw.footprint?.pointsMm,
      raw.footprint?.polygonMm,
      raw.hakoSeed?.footprint?.pointsMm,
      raw.hakoSeed?.footprint?.polygonMm
    ];
    for(const c of mmCandidates){
      if(Array.isArray(c)){
        const pts=c.map(parseMmPoint).filter(Boolean);
        if(pts.length>=3) return pts;
      }
    }
    return null;
  }

  function normalizeLoadedBuilding(raw, index=0){
    if(!raw || typeof raw!=='object') return null;
    const b={...raw};
    b.id=b.id || b.buildingId || b.padId || uid('bldg');
    b.name=b.name || b.buildingName || b.label || `Building ${index+1}`;
    b.category=b.category || 'industrial';
    b.color=b.color || colors[index%colors.length];
    b.hidden=!!b.hidden;
    b.locked=!!b.locked;
    b.rotationDeg=Number.isFinite(Number(b.rotationDeg))?Number(b.rotationDeg):0;
    b.state=b.state || b.buildingState || 'notStarted';
    b.notes=b.notes || '';
    if(!('hakoFile' in b)) b.hakoFile=b.completedHakoFile || b.hako || null;

    const pts=savedBuildingPointsPx(raw);
    const wantsPolygon = b.padType==='polygon' || raw.type==='polygon' || raw.kind==='BuildingPad' || !!pts;
    if(wantsPolygon && pts){
      b.padType='polygon';
      b.pointsPx=pts;
    } else {
      b.padType='rect';
      const cx=Number(b.x ?? b.cx ?? b.centerX ?? raw.position?.x ?? raw.center?.x);
      const cy=Number(b.y ?? b.cy ?? b.centerY ?? raw.position?.y ?? raw.center?.y);
      b.x=Number.isFinite(cx)?cx:0;
      b.y=Number.isFinite(cy)?cy:0;
      const wp=Number(b.widthPx ?? b.wPx ?? raw.sizePx?.w ?? raw.sizePx?.width);
      const hp=Number(b.depthPx ?? b.heightPx ?? b.hPx ?? raw.sizePx?.h ?? raw.sizePx?.height);
      const wm=Number(b.widthMm ?? raw.width ?? raw.w ?? raw.sizeMm?.w ?? raw.sizeMm?.width);
      const dm=Number(b.depthMm ?? raw.depth ?? raw.heightMm ?? raw.h ?? raw.sizeMm?.h ?? raw.sizeMm?.depth ?? raw.sizeMm?.height);
      b.widthPx=Number.isFinite(wp)?wp:(Number.isFinite(wm)&&state.pxPerMm?mmToPx(wm):Math.max(20, Number(b.widthPx)||40));
      b.depthPx=Number.isFinite(hp)?hp:(Number.isFinite(dm)&&state.pxPerMm?mmToPx(dm):Math.max(20, Number(b.depthPx)||40));
    }
    normalizeBuilding(b);
    return b;
  }
  function collectProjectBuildings(p){
    const sources=[
      ['buildings', p?.buildings],
      ['buildingPads', p?.buildingPads],
      ['pads', p?.pads],
      ['lots', p?.lots],
      ['site.buildings', p?.site?.buildings],
      ['site.buildingPads', p?.site?.buildingPads]
    ];
    let source='none';
    let arr=[];
    for(const [name,val] of sources){
      if(Array.isArray(val) && val.length){source=name; arr=val; break;}
    }
    if(!arr.length && Array.isArray(p?.fabricRegions)){
      const nested=[];
      p.fabricRegions.forEach(r=>{
        if(Array.isArray(r.buildingPads)) nested.push(...r.buildingPads.map(b=>({...b, fabricRegionId:b.fabricRegionId||r.id})));
        if(Array.isArray(r.pads)) nested.push(...r.pads.map(b=>({...b, fabricRegionId:b.fabricRegionId||r.id})));
      });
      if(nested.length){source='fabricRegions.*.buildingPads'; arr=nested;}
    }
    return {source, buildings:arr.map((b,i)=>normalizeLoadedBuilding(b,i)).filter(Boolean)};
  }
  function footprintLoadMessage(p, loadedCount, source){
    if(loadedCount>0){
      if(source && source!=='buildings') return `Loaded ${loadedCount} building footprint${loadedCount===1?'':'s'} from legacy field ${source}.`;
      return '';
    }
    if(Array.isArray(p?.buildings) && p.buildings.length===0){
      return 'Project loaded, but this saved file contains 0 building footprints. Its buildings array is empty, so there are no pads to restore.';
    }
    return 'Project loaded, but no supported building footprint data was found.';
  }
  function hakoFileSummary(b){
    if(!b || !b.hakoFile) return 'No completed .hako file stored.';
    const size=Number(b.hakoFile.sizeBytes||0);
    const sizeText=size ? formatBytes(size) : 'unknown size';
    const date=b.hakoFile.importedAt ? new Date(b.hakoFile.importedAt).toLocaleString() : 'unknown date';
    return `${escapeHtml(b.hakoFile.fileName||'building.hako')} · ${sizeText} · ${date}`;
  }

  function visibleWorldCenter(){
    const r=canvas.getBoundingClientRect();
    return {x:(r.width/2-state.view.x)/state.view.scale, y:(r.height/2-state.view.y)/state.view.scale};
  }

  function asNum(v){
    const n=Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function firstNum(...vals){
    for(const v of vals){
      const n=asNum(v);
      if(n!=null && n>0) return n;
    }
    return null;
  }

  function pointsFromAny(value){
    if(!value) return null;
    if(Array.isArray(value)){
      const pts=value.map(p=>Array.isArray(p)?{x:asNum(p[0]),y:asNum(p[1])}:{x:asNum(p.x??p.X??p.left),y:asNum(p.y??p.Y??p.top)}).filter(p=>p.x!=null&&p.y!=null);
      return pts.length>=3 ? pts : null;
    }
    return pointsFromAny(value.pointsMm||value.pointsPx||value.points||value.polygon||value.vertices);
  }

  function rectsToUnionPolygonMm(rects){
    rects=(rects||[]).map(r=>({
      x1:Math.min(asNum(r.x1),asNum(r.x2)), y1:Math.min(asNum(r.y1),asNum(r.y2)),
      x2:Math.max(asNum(r.x1),asNum(r.x2)), y2:Math.max(asNum(r.y1),asNum(r.y2))
    })).filter(r=>Number.isFinite(r.x1)&&Number.isFinite(r.y1)&&Number.isFinite(r.x2)&&Number.isFinite(r.y2)&&r.x2>r.x1&&r.y2>r.y1);
    if(!rects.length) return null;
    const xs=[...new Set(rects.flatMap(r=>[r.x1,r.x2]))].sort((a,b)=>a-b);
    const ys=[...new Set(rects.flatMap(r=>[r.y1,r.y2]))].sort((a,b)=>a-b);
    if(xs.length<2||ys.length<2) return null;
    const filled=new Set();
    for(let ix=0;ix<xs.length-1;ix++){
      for(let iy=0;iy<ys.length-1;iy++){
        const cx=(xs[ix]+xs[ix+1])/2, cy=(ys[iy]+ys[iy+1])/2;
        if(rects.some(r=>cx>=r.x1&&cx<=r.x2&&cy>=r.y1&&cy<=r.y2)) filled.add(`${ix},${iy}`);
      }
    }
    const edges=[];
    const has=(ix,iy)=>filled.has(`${ix},${iy}`);
    const add=(x1,y1,x2,y2)=>edges.push({x1,y1,x2,y2});
    for(const key of filled){
      const [ix,iy]=key.split(',').map(Number);
      if(!has(ix,iy-1)) add(xs[ix],ys[iy],xs[ix+1],ys[iy]);       // top/front
      if(!has(ix+1,iy)) add(xs[ix+1],ys[iy],xs[ix+1],ys[iy+1]);   // right
      if(!has(ix,iy+1)) add(xs[ix+1],ys[iy+1],xs[ix],ys[iy+1]);   // bottom/back
      if(!has(ix-1,iy)) add(xs[ix],ys[iy+1],xs[ix],ys[iy]);       // left
    }
    const keyOf=(x,y)=>`${Math.round(x*1000000)/1000000},${Math.round(y*1000000)/1000000}`;
    const outgoing=new Map();
    edges.forEach(e=>{
      const k=keyOf(e.x1,e.y1);
      if(!outgoing.has(k)) outgoing.set(k,[]);
      outgoing.get(k).push(e);
    });
    const start=edges.slice().sort((a,b)=>a.y1-b.y1||a.x1-b.x1)[0];
    if(!start) return null;
    const pts=[{x:start.x1,y:start.y1}];
    let cur=start, guard=0;
    const used=new Set();
    while(cur && guard++<edges.length+8){
      used.add(`${cur.x1},${cur.y1},${cur.x2},${cur.y2}`);
      const nextPt={x:cur.x2,y:cur.y2};
      pts.push(nextPt);
      if(keyOf(nextPt.x,nextPt.y)===keyOf(pts[0].x,pts[0].y)) break;
      const candidates=(outgoing.get(keyOf(nextPt.x,nextPt.y))||[]).filter(e=>!used.has(`${e.x1},${e.y1},${e.x2},${e.y2}`));
      cur=candidates[0]||null;
    }
    if(pts.length<4) return null;
    if(keyOf(pts[0].x,pts[0].y)===keyOf(pts[pts.length-1].x,pts[pts.length-1].y)) pts.pop();
    // Remove collinear points so the imported footprint is easier to edit.
    const cleaned=[];
    for(let i=0;i<pts.length;i++){
      const a=pts[(i-1+pts.length)%pts.length], b=pts[i], c=pts[(i+1)%pts.length];
      const collinear=(Math.abs(a.x-b.x)<1e-6&&Math.abs(b.x-c.x)<1e-6)||(Math.abs(a.y-b.y)<1e-6&&Math.abs(b.y-c.y)<1e-6);
      if(!collinear) cleaned.push(b);
    }
    return cleaned.length>=3 ? cleaned : pts;
  }

  function deriveCompositeHakoFootprintMm(cfg, width, depth){
    if(!width || !depth) return null;
    const rects=[{x1:0,y1:0,x2:width,y2:depth}];
    const wings=Array.isArray(cfg?.wings) ? cfg.wings : [];
    wings.forEach(w=>{
      if(!w || w.enabled===false) return;
      const face=String(w.face||'').toLowerCase();
      const off=asNum(w.offset) ?? 0;
      const span=firstNum(w.span, w.width, w.length);
      const wingDepth=firstNum(w.depth, w.projection, w.extend);
      if(!span || !wingDepth) return;
      if(face==='west'||face==='left'){
        rects.push({x1:-wingDepth,y1:off,x2:0,y2:off+span});
      }else if(face==='east'||face==='right'){
        rects.push({x1:width,y1:off,x2:width+wingDepth,y2:off+span});
      }else if(face==='front'){
        rects.push({x1:off,y1:-wingDepth,x2:off+span,y2:0});
      }else if(face==='back'||face==='rear'){
        rects.push({x1:off,y1:depth,x2:off+span,y2:depth+wingDepth});
      }
    });
    if(rects.length<=1) return null;
    return rectsToUnionPolygonMm(rects);
  }

  function collectArrayFields(root, paths){
    const out=[];
    const read=(obj,path)=>path.reduce((v,k)=>v&&v[k],obj);
    paths.forEach(path=>{
      const v=read(root,path);
      if(Array.isArray(v)) out.push(...v);
    });
    return out;
  }
  function extractHakoTrimLinesMm(cfg){
    if(!cfg || typeof cfg!=='object') return [];
    const cuts=collectArrayFields(cfg,[
      ['layoutCuts'], ['trimLines'], ['cutLines'], ['shapeCuts'], ['shapeEditor','layoutCuts'],
      ['shapeEditor','cutLines'], ['geometry','layoutCuts'], ['building','layoutCuts']
    ]);
    const items=[];
    cuts.forEach(c=>{
      if(!c || c.enabled===false) return;
      const type=String(c.type||c.kind||'line').toLowerCase();
      const x1=firstNum(c.x1,c.startX,c.fromX,c.start?.x,c.from?.x);
      const y1=firstNum(c.y1,c.startY,c.fromY,c.start?.y,c.from?.y);
      const x2=firstNum(c.x2,c.endX,c.toX,c.end?.x,c.to?.x);
      const y2=firstNum(c.y2,c.endY,c.toY,c.end?.y,c.to?.y);
      if(!Number.isFinite(x1)||!Number.isFinite(y1)||!Number.isFinite(x2)||!Number.isFinite(y2)) return;
      if(type==='arc' || Number.isFinite(Number(c.cx ?? c.centerX ?? c.center?.x))){
        const cx=firstNum(c.cx,c.centerX,c.center?.x);
        const cy=firstNum(c.cy,c.centerY,c.center?.y);
        if(Number.isFinite(cx)&&Number.isFinite(cy)){
          items.push({type:'arc',x1,y1,x2,y2,cx,cy,bulgeSide:firstNum(c.bulgeSide,c.side,c.direction) ?? 1,label:c.name||c.id||'trim'});
          return;
        }
      }
      items.push({type:'line',x1,y1,x2,y2,label:c.name||c.id||'trim'});
    });
    return items;
  }
  function hakoTrimExtentMm(items){
    if(!items||!items.length) return null;
    const xs=[], ys=[];
    items.forEach(it=>{
      ['x1','x2','cx'].forEach(k=>{ if(Number.isFinite(Number(it[k]))) xs.push(Number(it[k])); });
      ['y1','y2','cy'].forEach(k=>{ if(Number.isFinite(Number(it[k]))) ys.push(Number(it[k])); });
    });
    if(!xs.length||!ys.length) return null;
    return {minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
  }

  function deriveFootprintFromHakoConfig(cfg){
    if(!cfg || typeof cfg!=='object') return null;
    const trimLinesMm=extractHakoTrimLinesMm(cfg);
    const fp=cfg.footprint || cfg.hakoSeed?.footprint || cfg.sitePlannerSeed?.footprint || cfg.seed?.footprint || cfg.building?.footprint;
    const fpPts=pointsFromAny(fp);
    if(fpPts) return {padType:'polygon', pointsMm:fpPts, source:'explicit footprint', trimLinesMm};
    const directPts=pointsFromAny(cfg.pointsMm||cfg.polygonMm||cfg.polygon||cfg.footprintMm);
    if(directPts) return {padType:'polygon', pointsMm:directPts, source:'explicit polygon', trimLinesMm};
    const width=firstNum(cfg.widthMm, cfg.width, cfg.dimensions?.widthMm, cfg.dimensions?.width, cfg.settings?.widthMm, cfg.settings?.width, cfg.building?.widthMm, cfg.building?.width, cfg.hakoSeed?.widthMm, fp?.widthMm, fp?.width);
    const depth=firstNum(cfg.depthMm, cfg.depth, cfg.dimensions?.depthMm, cfg.dimensions?.depth, cfg.settings?.depthMm, cfg.settings?.depth, cfg.building?.depthMm, cfg.building?.depth, cfg.hakoSeed?.depthMm, fp?.depthMm, fp?.depth);
    const compositePts=deriveCompositeHakoFootprintMm(cfg, width, depth);
    if(compositePts) return {padType:'polygon', pointsMm:compositePts, source:'main + wings', trimLinesMm};
    if(width && depth) return {padType:'rect', widthMm:width, depthMm:depth, source:'main rectangle', trimLinesMm};
    return trimLinesMm.length ? {padType:'polygon', pointsMm:null, source:'trim lines only', trimLinesMm} : null;
  }

  function createBuildingFromImportedHako(fileName, text, parsed){
    const derived=deriveFootprintFromHakoConfig(parsed||{});
    if(!derived){
      alert('Could not find a footprint, width/depth, or polygon in that .hako file.');
      return null;
    }
    const center=visibleWorldCenter();
    const baseName=(parsed && (parsed.name||parsed.buildingName||parsed.title||parsed.projectName)) || (fileName||'Imported Building').replace(/\.(hako|json)$/i,'');
    const b={
      id:uid('bldg'), name:baseName,
      category:(parsed && (parsed.buildingType||parsed.type||parsed.category)) || 'imported',
      color:colors[state.buildings.length%colors.length], hidden:false, locked:false,
      state:'complete', notes:`Imported from an existing .hako file${derived.source?` (${derived.source})`:''}.`,
      hakoConfig:parsed||null,
      hakoFile:{fileName:fileName||`${slug(baseName)}.hako`,mimeType:'application/json',sizeBytes:text.length,importedAt:new Date().toISOString(),dataText:text,parsedConfig:parsed||null},
      hakoFileId:fileName||`${slug(baseName)}.hako`,
    };
    if(derived.trimLinesMm && derived.trimLinesMm.length){
      b.hakoTrimLinesMm=derived.trimLinesMm;
      b.showHakoTrimLines=true;
    }
    if(derived.padType==='polygon' && derived.pointsMm){
      const ptsMm=derived.pointsMm;
      const xs=ptsMm.map(p=>p.x), ys=ptsMm.map(p=>p.y);
      const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys);
      const cx=(minX+maxX)/2, cy=(minY+maxY)/2;
      b.hakoGeometryOriginMm={x:cx,y:cy};
      b.padType='polygon';
      b.pointsPx=ptsMm.map(p=>({x:center.x+mmToPx(p.x-cx), y:center.y+mmToPx(p.y-cy)}));
      b.rotationDeg=0;
    } else {
      b.padType='rect'; b.x=center.x; b.y=center.y;
      b.widthPx=mmToPx(derived.widthMm||20); b.depthPx=mmToPx(derived.depthMm||20); b.rotationDeg=0;
      b.hakoGeometryOriginMm={x:(derived.widthMm||20)/2,y:(derived.depthMm||20)/2};
    }
    normalizeBuilding(b); syncBuildingMetrics(b);
    state.buildings.push(b); setBuildingSelection([b.id], b.id);
    syncAll();
    return b;
  }

  function importHakoAsBuilding(file){
    if(!file) return;
    const reader=new FileReader();
    reader.onerror=()=>alert('Could not read that .hako file.');
    reader.onload=ev=>{
      const text=String(ev.target.result||'');
      let parsed=null;
      try{ parsed=JSON.parse(text); }
      catch(_err){ alert('That .hako file was not valid JSON, so I could not derive a footprint from it.'); return; }
      createBuildingFromImportedHako(file.name||'building.hako', text, parsed);
    };
    reader.readAsText(file);
  }
  function selected(){return state.buildings.find(b=>b.id===state.selectedId)||null;}
  function currentSelectedBuildingIds(){
    const ids=Array.isArray(state.selectedIds)?state.selectedIds.filter(Boolean):[];
    if(state.selectedId && !ids.includes(state.selectedId)) return [state.selectedId];
    return [...new Set(ids)].filter(id=>state.buildings.some(b=>b.id===id));
  }
  function clearBuildingSelection(){state.selectedId=null; state.selectedIds=[];}
  function setBuildingSelection(ids, primaryId=null){
    const valid=[...new Set((ids||[]).filter(id=>state.buildings.some(b=>b.id===id)))];
    state.selectedIds=valid;
    state.selectedId=primaryId || (valid.length===1 ? valid[0] : null);
    state.selectedRoadId=null; state.selectedBenchworkId=null; state.selectedStreetlightId=null; state.selectedBenchworkId=null; state.selectedAnnotationId=null;
  }
  function isBuildingSelected(id){return currentSelectedBuildingIds().includes(id);}
  function toggleBuildingSelection(id){
    const ids=currentSelectedBuildingIds();
    if(ids.includes(id)) setBuildingSelection(ids.filter(x=>x!==id));
    else setBuildingSelection([...ids,id], ids.length?null:id);
  }
  function selectionRectFromPoints(a,b){return {x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(a.x-b.x),h:Math.abs(a.y-b.y)};}
  function buildingBBox(b){
    const pts=b.padType==='rect'?transformedRect(b):(b.pointsPx||[]);
    if(!pts.length) return {x:0,y:0,w:0,h:0};
    const xs=pts.map(p=>p.x), ys=pts.map(p=>p.y);
    return {x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};
  }
  function bboxOverlaps(a,b){return a.x<=b.x+b.w && a.x+a.w>=b.x && a.y<=b.y+b.h && a.y+a.h>=b.y;}
  function buildingsInSelectionRect(rect){
    return state.buildings.filter(b=>!b.hidden && bboxOverlaps(rect,buildingBBox(b))).map(b=>b.id);
  }
  function drawSelectionMarquee(){
    if(!state.drag || state.drag.type!=='marquee') return;
    const r=selectionRectFromPoints(state.drag.start,state.drag.end||state.drag.start);
    ctx.save();
    ctx.fillStyle='rgba(42,100,170,.12)';
    ctx.strokeStyle='#2a64aa';
    ctx.lineWidth=1.5/state.view.scale;
    ctx.setLineDash([6/state.view.scale,4/state.view.scale]);
    ctx.fillRect(r.x,r.y,r.w,r.h);
    ctx.strokeRect(r.x,r.y,r.w,r.h);
    ctx.restore();
  }
  function buildingFootprintClipboardPayload(b){
    if(!b) return null;
    const payload=structuredClone(b);
    // Copy/paste is for site footprints, not the finished building design file.
    // Keep shape + planning metadata, but clear per-building completed .hako attachments
    // so pasted pads do not accidentally point to the wrong physical building file.
    payload.hakoFile=null;
    payload.hakoFileId=null;
    payload.hakoConfig=null;
    payload.copiedFromId=b.id;
    payload.copiedAt=new Date().toISOString();
    return payload;
  }
  function copySelectedFootprint(){
    const ids=currentSelectedBuildingIds();
    const selectedBuildings=ids.map(id=>state.buildings.find(b=>b.id===id)).filter(Boolean);
    if(!selectedBuildings.length) return false;
    state.footprintClipboard = selectedBuildings.length===1
      ? buildingFootprintClipboardPayload(selectedBuildings[0])
      : {multi:true, buildings:selectedBuildings.map(buildingFootprintClipboardPayload), copiedAt:new Date().toISOString()};
    state.pasteOffsetCount=0;
    updateStatus();
    return true;
  }
  function pasteFootprintFromClipboard(){
    const src=state.footprintClipboard;
    if(!src) return false;
    const sources=src.multi && Array.isArray(src.buildings) ? src.buildings : [src];
    const n=++state.pasteOffsetCount;
    const off=18*n;
    const pastedIds=[];
    sources.forEach((item,idx)=>{
      const copy=structuredClone(item);
      copy.id=uid('bldg');
      const baseName=(copy.name||'Building').replace(/ copy(?: \d+)?$/i,'');
      copy.name=baseName+' copy';
      copy.state=copy.state||'notStarted';
      copy.hakoFile=null;
      copy.hakoFileId=null;
      copy.hakoConfig=null;
      copy.hidden=false;
      const dx=off + idx*10, dy=off + idx*10;
      if(copy.padType==='rect'){
        copy.x=(Number(copy.x)||0)+dx;
        copy.y=(Number(copy.y)||0)+dy;
      } else if(Array.isArray(copy.pointsPx)) {
        copy.pointsPx=copy.pointsPx.map(p=>({x:(Number(p.x)||0)+dx,y:(Number(p.y)||0)+dy}));
      }
      normalizeBuilding(copy);
      syncBuildingMetrics(copy);
      state.buildings.push(copy);
      pastedIds.push(copy.id);
    });
    setBuildingSelection(pastedIds, pastedIds.length===1?pastedIds[0]:null);
    syncAll();
    return true;
  }
  function duplicateBuildingFootprint(b){
    if(!b) return null;
    state.footprintClipboard=buildingFootprintClipboardPayload(b);
    state.pasteOffsetCount=0;
    pasteFootprintFromClipboard();
    return selected();
  }
  function syncBuildingMetrics(b){ if(!state.pxPerMm) return b; if(b.padType==='rect'){b.widthMm=pxToMm(b.widthPx); b.depthMm=pxToMm(b.depthPx); b.pointsPx=transformedRect(b); b.pointsMm=b.pointsPx.map(p=>({x:pxToMm(p.x),y:pxToMm(p.y)}));} else {b.pointsMm=b.pointsPx.map(p=>({x:pxToMm(p.x),y:pxToMm(p.y)})); b.derived={areaMm2:pxToMm(Math.sqrt(polygonArea(b.pointsPx)))**2, boundingWidthMm:pxToMm(Math.max(...b.pointsPx.map(p=>p.x))-Math.min(...b.pointsPx.map(p=>p.x))), boundingDepthMm:pxToMm(Math.max(...b.pointsPx.map(p=>p.y))-Math.min(...b.pointsPx.map(p=>p.y))), rotationDeg:b.rotationDeg||0};} return b; }
  function syncAll(opts = {}){
    state.buildings.forEach(syncBuildingMetrics);
    state.roads.forEach(syncRoadMetrics);
    state.roadFeatures=(state.roadFeatures||[]).map(normalizeRoadFeature);
    state.benchworkOutlines.forEach(normalizeBenchworkOutline);
    state.fabricRegions.forEach(normalizeFabricRegion);
    state.streetlights.forEach(normalizeStreetlight);
    renderList();
    renderRoads();
    renderStreetlights();
    renderSelected();
    updateHandoff();
    draw();
    updateSite3D();
    if(!opts.skipDirty) markDirty('project change');
  }


  const site3d = {
    view:null, status:null, scene:null, camera:null, renderer:null, controls:null,
    root:null, initialized:false
  };
  function setSite3DStatus(message){ const el=site3d.status || $('site3dStatus'); if(el) el.textContent=message; }
  function site3DScale(v){ return state.pxPerMm ? pxToMm(v) : v; }
  function positiveNumber(...values){ for(const v of values){ const n=Number(v); if(Number.isFinite(n) && n>0) return n; } return null; }
  function site3DBuildingFootprintMm(b){ const pts=(b.padType==='rect'?transformedRect(b):(b.pointsPx||[])).map(p=>({x:site3DScale(p.x), y:site3DScale(p.y)})); return pts.length>=3 ? pts : null; }
  function site3DBuildingCenterMm(b){ const c=buildingCenter(b); return {x:site3DScale(c.x), y:site3DScale(c.y)}; }
  function site3DBuildingHeightMm(b,cfg){ const byFloors=Number.isFinite(Number(b.floorCount)) ? Number(b.floorCount)*18 : null; return positiveNumber(b.plannerHeightMm,b.heightMm,cfg?.height,cfg?.dimensions?.height,byFloors,24) || 24; }
  function site3DBuildingElevationMm(b){ return positiveNumber(b.baseElevationMm,b.elevationMm,b.siteElevationMm,0) || 0; }
  function site3DBuildingConfig(b){
    const raw=b.hakoConfig || b.hakoFile?.parsedConfig || null;
    if(!raw || typeof raw!=='object') return null;
    const cfg=structuredClone(raw);
    const h=site3DBuildingHeightMm(b,cfg);
    if(h) cfg.height=h;
    if(b.padType==='rect'){
      const w=positiveNumber(b.widthMm), d=positiveNumber(b.depthMm);
      if(w) cfg.width=w;
      if(d) cfg.depth=d;
    }
    return cfg;
  }
  function site3DBounds(){
    const xs=[], ys=[];
    if(state.image || state.imageMeta){
      const w=Number(state.image?.naturalWidth||state.image?.width||state.imageMeta?.naturalWidthPx);
      const h=Number(state.image?.naturalHeight||state.image?.height||state.imageMeta?.naturalHeightPx);
      if(Number.isFinite(w)&&Number.isFinite(h)&&w>0&&h>0){ xs.push(0,site3DScale(w)); ys.push(0,site3DScale(h)); }
    }
    state.buildings.forEach(raw=>{
      const b=normalizeBuilding(raw);
      if(b.hidden) return;
      const pts=site3DBuildingFootprintMm(b);
      if(pts) pts.forEach(p=>{ xs.push(p.x); ys.push(p.y); });
    });
    if(!xs.length || !ys.length) return {minX:-60,maxX:60,minY:-40,maxY:40,width:120,depth:80,cx:0,cy:0};
    const width=Math.max(...xs)-Math.min(...xs), depth=Math.max(...ys)-Math.min(...ys);
    const pad=Math.max(8,Math.min(60,Math.max(width,depth)*.06));
    const minX=Math.min(...xs)-pad, maxX=Math.max(...xs)+pad, minY=Math.min(...ys)-pad, maxY=Math.max(...ys)+pad;
    return {minX,maxX,minY,maxY,width:Math.max(1,maxX-minX),depth:Math.max(1,maxY-minY),cx:(minX+maxX)/2,cy:(minY+maxY)/2};
  }
  function disposeSite3DObject(obj){
    if(!obj) return;
    obj.traverse?.(child=>{
      child.geometry?.dispose?.();
      const mats=Array.isArray(child.material)?child.material:[child.material];
      mats.filter(Boolean).forEach(mat=>{
        Object.values(mat).forEach(v=>{ if(v && v.isTexture) v.dispose?.(); });
        mat.dispose?.();
      });
    });
  }
  function site3DMaterial(color,fallback=0xd7b56d,opts={}){
    let c;
    try{ c=new THREE.Color(color || fallback); }catch(_err){ c=new THREE.Color(fallback); }
    return new THREE.MeshStandardMaterial({color:c,roughness:.82,metalness:0,...opts});
  }
  function buildSite3DMassing(b,bounds){
    const pts=site3DBuildingFootprintMm(b);
    const center=site3DBuildingCenterMm(b);
    const height=site3DBuildingHeightMm(b,null);
    const mat=site3DMaterial(b.color,0xd79631);
    let mesh;
    if(pts && pts.length>=3 && b.padType==='polygon'){
      const shape=new THREE.Shape();
      pts.forEach((p,i)=>{ const x=p.x-center.x, y=-(p.y-center.y); if(i===0) shape.moveTo(x,y); else shape.lineTo(x,y); });
      shape.closePath();
      const geo=new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false});
      geo.rotateX(-Math.PI/2);
      mesh=new THREE.Mesh(geo,mat);
    } else {
      const w=positiveNumber(b.widthMm,pts&&Math.max(...pts.map(p=>p.x))-Math.min(...pts.map(p=>p.x)),20) || 20;
      const d=positiveNumber(b.depthMm,pts&&Math.max(...pts.map(p=>p.y))-Math.min(...pts.map(p=>p.y)),20) || 20;
      mesh=new THREE.Mesh(new THREE.BoxGeometry(w,height,d),mat);
      mesh.position.y=height/2;
    }
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry,30),new THREE.LineBasicMaterial({color:0x4b3828,transparent:true,opacity:.55})));
    const group=new THREE.Group();
    group.name=b.name||'Building massing';
    group.add(mesh);
    group.position.set(center.x-bounds.cx,site3DBuildingElevationMm(b),center.y-bounds.cy);
    group.rotation.y=-(Number(b.rotationDeg)||0)*Math.PI/180;
    return group;
  }
  function buildSite3DBuildingGroup(b,bounds){
    const cfg=site3DBuildingConfig(b);
    const center=site3DBuildingCenterMm(b);
    if(cfg && window.HakoMachiPreview3D?.buildBuildingPreviewGroup){
      try{
        const group=window.HakoMachiPreview3D.buildBuildingPreviewGroup(cfg,{includeStlOverlay:false});
        group.name=b.name||'HakoMachi building';
        group.position.set(center.x-bounds.cx,site3DBuildingElevationMm(b),center.y-bounds.cy);
        group.rotation.y=-(Number(b.rotationDeg)||0)*Math.PI/180;
        return group;
      }catch(err){ console.warn('[HakoMachi Site Planner] 3D generated building fallback:',err); }
    }
    return buildSite3DMassing(b,bounds);
  }
  function initSite3D(){
    if(site3d.initialized) return true;
    site3d.view=ensureSite3dView();
    site3d.status=$('site3dStatus');
    if(typeof THREE==='undefined'){ setSite3DStatus('3D view unavailable: Three.js did not load.'); return false; }
    site3d.scene=new THREE.Scene();
    site3d.scene.background=new THREE.Color(0xecece6);
    site3d.camera=new THREE.PerspectiveCamera(45,1,.1,5000);
    site3d.renderer=new THREE.WebGLRenderer({antialias:true});
    site3d.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    site3d.view.appendChild(site3d.renderer.domElement);
    const ambient=new THREE.AmbientLight(0xffffff,.72);
    const dir=new THREE.DirectionalLight(0xffffff,.82);
    dir.position.set(160,220,140);
    site3d.scene.add(ambient,dir);
    site3d.root=new THREE.Group();
    site3d.scene.add(site3d.root);
    if(THREE.OrbitControls){
      site3d.controls=new THREE.OrbitControls(site3d.camera,site3d.renderer.domElement);
      site3d.controls.enableDamping=false;
      site3d.controls.addEventListener('change',renderSite3D);
    }
    site3d.initialized=true;
    resizeSite3D();
    return true;
  }
  function resizeSite3D(){
    if(!site3d.initialized || !site3d.renderer || !site3d.camera) return;
    const r=(site3d.view||ensureSite3dView()).getBoundingClientRect();
    const w=Math.max(1,Math.floor(r.width)), h=Math.max(1,Math.floor(r.height));
    site3d.camera.aspect=w/h;
    site3d.camera.updateProjectionMatrix();
    site3d.renderer.setSize(w,h,false);
    renderSite3D();
  }
  function renderSite3D(){ if(site3d.renderer && site3d.scene && site3d.camera) site3d.renderer.render(site3d.scene,site3d.camera); }
  function updateSite3D(){
    if(state.viewMode!=='3d') return;
    if(!initSite3D()) return;
    while(site3d.root.children.length){ const child=site3d.root.children.pop(); disposeSite3DObject(child); }
    const bounds=site3DBounds();
    const baseT=Math.max(.1,Number(state.site3d?.baseThicknessMm)||4);
    const base=new THREE.Mesh(new THREE.BoxGeometry(bounds.width,baseT,bounds.depth),new THREE.MeshStandardMaterial({color:0xcab98d,roughness:.9,metalness:0}));
    base.name='Negative-thickness site base';
    base.position.y=-baseT/2;
    site3d.root.add(base);
    const grid=new THREE.GridHelper(Math.max(bounds.width,bounds.depth),20,0x8a7f66,0xcfc5aa);
    grid.position.y=.015;
    site3d.root.add(grid);
    let rendered=0, generated=0;
    state.buildings.forEach(raw=>{
      const b=normalizeBuilding(raw);
      syncBuildingMetrics(b);
      if(b.hidden) return;
      const g=buildSite3DBuildingGroup(b,bounds);
      if(g){ if(site3DBuildingConfig(b)) generated++; site3d.root.add(g); rendered++; }
    });
    const radius=Math.max(bounds.width,bounds.depth,60);
    site3d.camera.position.set(radius*.72,Math.max(70,radius*.58),radius*.82);
    site3d.camera.near=.1;
    site3d.camera.far=Math.max(5000,radius*12);
    site3d.camera.updateProjectionMatrix();
    if(site3d.controls){ site3d.controls.target.set(0,0,0); site3d.controls.update(); }
    else site3d.camera.lookAt(0,0,0);
    setSite3DStatus(`3D view: ${rendered} buildings, ${generated} generated from .hako. Base extends ${fmt(baseT)} mm below zero.`);
    renderSite3D();
  }
  function setSite3DMode(on){
    state.viewMode=on?'3d':'2d';
    wrap.classList.toggle('view3d',state.viewMode==='3d');
    document.querySelector('.sitePlannerApp')?.classList.toggle('view3d',state.viewMode==='3d');
    ['view3dBtn','mobileView3dBtn'].forEach(id=>{
      const btn=$(id);
      if(btn){ btn.classList.toggle('active',state.viewMode==='3d'); btn.textContent=state.viewMode==='3d'?'2D View':'3D View'; }
    });
    updateEmptyImageOverlay();
    if(state.viewMode==='3d') updateSite3D();
    else draw();
  }
  function bindSite3DButtons(){
    ['view3dBtn','mobileView3dBtn'].forEach(id=>{
      const btn=$(id);
      if(btn && !btn.dataset.site3dBound){
        btn.dataset.site3dBound='1';
        btn.onclick=()=>setSite3DMode(state.viewMode!=='3d');
      }
    });
    const baseInput=$('site3dBaseThickness');
    if(baseInput && !baseInput.dataset.site3dBound){
      baseInput.dataset.site3dBound='1';
      baseInput.value=String(state.site3d?.baseThicknessMm ?? 4);
      baseInput.oninput=()=>{
        state.site3d=state.site3d||{};
        state.site3d.baseThicknessMm=Math.max(.1,parseFloat(baseInput.value)||4);
        updateSite3D();
        markDirty('3d base thickness');
      };
    }
  }


  function historySnapshot(){
    return JSON.stringify({
      imageMeta: state.imageMeta,
      imageOpacity: state.imageOpacity,
      imageLocked: state.imageLocked,
      view: state.view,
      site3d: state.site3d,
      pxPerMm: state.pxPerMm,
      calibrationLine: state.calibrationLine,
      lastCalibrationLine: state.lastCalibrationLine,
      buildings: state.buildings,
      roads: state.roads,
      roadFeatures: state.roadFeatures,
      benchworkOutlines: state.benchworkOutlines,
      fabricRegions: state.fabricRegions,
      streetlights: state.streetlights,
      annotations: state.annotations,
      selectedId: state.selectedId,
      selectedIds: state.selectedIds,
      selectedRoadId: state.selectedRoadId,
      selectedBenchworkId: state.selectedBenchworkId,
      selectedStreetlightId: state.selectedStreetlightId,
      selectedAnnotationId: state.selectedAnnotationId,
      measureLine: state.measureLine
    });
  }
  function updateHistoryButtons(){
    const canUndo=state.historyIndex>0;
    const canRedo=state.historyIndex>=0 && state.historyIndex<state.history.length-1;
    ['undoBtn','mobileUndoBtn'].forEach(id=>{const b=$(id); if(b){b.disabled=!canUndo; b.setAttribute('aria-disabled', String(!canUndo));}});
    ['redoBtn','mobileRedoBtn'].forEach(id=>{const b=$(id); if(b){b.disabled=!canRedo; b.setAttribute('aria-disabled', String(!canRedo));}});
  }
  function pushHistorySnapshot(_label=''){
    if(state.historySuppressed) return;
    const snap=historySnapshot();
    if(state.historyIndex>=0 && state.history[state.historyIndex]===snap){ updateHistoryButtons(); return; }
    if(state.historyIndex<state.history.length-1) state.history=state.history.slice(0,state.historyIndex+1);
    state.history.push(snap);
    const max=80;
    if(state.history.length>max) state.history.splice(0,state.history.length-max);
    state.historyIndex=state.history.length-1;
    updateHistoryButtons();
  }
  function resetHistory(_label=''){
    state.history=[];
    state.historyIndex=-1;
    pushHistorySnapshot(_label);
  }
  function applyHistorySnapshot(snap){
    let data;
    try{ data=JSON.parse(snap); }catch(err){ console.warn('[HakoMachi Site Planner] Could not restore undo state:', err); return; }
    state.historySuppressed=true;
    const oldDataUrl=state.imageMeta?.dataUrl || null;
    const newDataUrl=data.imageMeta?.dataUrl || null;
    state.imageMeta=data.imageMeta||null;
    state.imageOpacity=Number.isFinite(Number(data.imageOpacity))?Number(data.imageOpacity):.75;
    state.imageLocked=data.imageLocked!==false;
    state.view=data.view||{x:40,y:40,scale:1};
    state.site3d={baseThicknessMm:4, ...(data.site3d||{})};
    if($('site3dBaseThickness')) $('site3dBaseThickness').value=String(state.site3d.baseThicknessMm ?? 4);
    state.pxPerMm=data.pxPerMm||null;
    state.calibrationLine=data.calibrationLine||null;
    state.lastCalibrationLine=data.lastCalibrationLine||state.calibrationLine||null;
    state.buildings=Array.isArray(data.buildings)?structuredClone(data.buildings):[];
    state.roads=Array.isArray(data.roads)?structuredClone(data.roads):[];
    state.roadFeatures=Array.isArray(data.roadFeatures)?structuredClone(data.roadFeatures):[];
    state.benchworkOutlines=Array.isArray(data.benchworkOutlines)?structuredClone(data.benchworkOutlines):[];
    state.fabricRegions=Array.isArray(data.fabricRegions)?structuredClone(data.fabricRegions):[];
    state.streetlights=Array.isArray(data.streetlights)?structuredClone(data.streetlights):[];
    state.annotations=Array.isArray(data.annotations)?structuredClone(data.annotations):[];
    state.selectedId=data.selectedId||null;
    state.selectedIds=Array.isArray(data.selectedIds)?data.selectedIds.slice():[];
    state.selectedRoadId=data.selectedRoadId||null;
    state.selectedBenchworkId=data.selectedBenchworkId||null;
    state.selectedStreetlightId=data.selectedStreetlightId||null;
    state.selectedAnnotationId=data.selectedAnnotationId||null;
    state.measureLine=data.measureLine||null;
    if($('opacity')) $('opacity').value=String(state.imageOpacity);
    if($('imageLockBtn')) $('imageLockBtn').textContent=state.imageLocked?'Locked':'Unlocked';
    const finish=()=>{
      syncAll({skipDirty:true});
      updateImagePortableStatus();
      updateHistoryButtons();
      state.historySuppressed=false;
      markDirty('undo redo');
    };
    if(newDataUrl && newDataUrl!==oldDataUrl){
      const img=new Image();
      img.onload=()=>{state.image=img; finish();};
      img.onerror=()=>{state.image=null; setImageStatus('Undo/redo restored image metadata, but the embedded image could not be decoded.', 'warning'); finish();};
      img.src=newDataUrl;
    } else {
      if(!newDataUrl) state.image=null;
      finish();
    }
  }
  function undo(){
    if(state.historyIndex<=0) return false;
    state.historyIndex--;
    applyHistorySnapshot(state.history[state.historyIndex]);
    return true;
  }
  function redo(){
    if(state.historyIndex<0 || state.historyIndex>=state.history.length-1) return false;
    state.historyIndex++;
    applyHistorySnapshot(state.history[state.historyIndex]);
    return true;
  }

  function updateAutosaveStatus(message){
    const el=$('statusAutosave');
    if(!el) return;
    if(message){ el.textContent=message; return; }
    if(state.dirty) el.textContent='Autosave: pending';
    else if(state.lastAutosaveAt) el.textContent='Autosave: '+new Date(state.lastAutosaveAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    else el.textContent='Autosave: ready';
  }
  function approxDataUrlBytes(dataUrl){
    if(!dataUrl || typeof dataUrl!=='string') return 0;
    const comma=dataUrl.indexOf(',');
    const b64=comma>=0?dataUrl.slice(comma+1):dataUrl;
    const padding=(b64.endsWith('==')?2:(b64.endsWith('=')?1:0));
    return Math.max(0, Math.floor(b64.length*3/4)-padding);
  }
  function formatBytes(bytes){
    if(!Number.isFinite(bytes) || bytes<=0) return '0 B';
    if(bytes<1024) return Math.round(bytes)+' B';
    if(bytes<1024*1024) return (bytes/1024).toFixed(1)+' KB';
    return (bytes/(1024*1024)).toFixed(1)+' MB';
  }
  function imageMetaForProject(opts={}){
    if(!state.imageMeta) return null;
    const includeDataUrl = opts.includeDataUrl !== false;
    const meta={...state.imageMeta};
    meta.name = meta.name || 'reference-image';
    meta.mimeType = meta.mimeType || (typeof meta.dataUrl==='string' ? (meta.dataUrl.match(/^data:([^;]+);/)||[])[1] : undefined) || 'application/octet-stream';
    meta.naturalWidthPx = Number.isFinite(meta.naturalWidthPx) ? meta.naturalWidthPx : (state.image?.naturalWidth || state.image?.width || null);
    meta.naturalHeightPx = Number.isFinite(meta.naturalHeightPx) ? meta.naturalHeightPx : (state.image?.naturalHeight || state.image?.height || null);
    meta.originalPixelDimensionsRequired = true;
    meta.dataUrlByteLength = approxDataUrlBytes(meta.dataUrl);
    meta.embeddedInProject = !!(includeDataUrl && meta.dataUrl);
    if(!includeDataUrl) delete meta.dataUrl;
    return meta;
  }
  function updateImagePortableStatus(extraMessage){
    const el=$('imagePortableStatus');
    if(!el) return;
    if(extraMessage){ el.textContent=extraMessage; return; }
    if(!state.imageMeta){ el.textContent='Portable save: no image.'; return; }
    const bytes=approxDataUrlBytes(state.imageMeta.dataUrl);
    if(state.imageMeta.dataUrl){
      el.textContent=`Portable save: embeds original ${state.imageMeta.naturalWidthPx||'?'} × ${state.imageMeta.naturalHeightPx||'?'} px image (${formatBytes(bytes)}).`;
    } else {
      el.textContent='Portable save: image is not embedded yet. Re-import the image before saving for cross-browser portability.';
    }
  }
  function markDirty(_reason=''){
    if(!state.historySuppressed) pushHistorySnapshot(_reason);
    if(!state.autosaveReady || autosaveSuppressed) return;
    state.dirty=true;
    state.dirtySinceManualSave=true;
    updateAutosaveStatus();
    scheduleAutosave();
  }
  function scheduleAutosave(){
    clearTimeout(autosaveTimer);
    autosaveTimer=setTimeout(writeAutosave, 450);
  }
  function makeProjectPayload(opts={}){
    state.buildings=state.buildings.map(normalizeBuilding);
    state.buildings.forEach(syncBuildingMetrics);
    state.benchworkOutlines.forEach(normalizeBenchworkOutline);
    state.fabricRegions.forEach(normalizeFabricRegion);
    state.streetlights.forEach(normalizeStreetlight);
    const includeImageDataUrl = opts.includeImageDataUrl !== false;
    return {
      app:'HakoMachi Site Planner',
      version:78,
      savedAt:new Date().toISOString(),
      portableProject:true,
      coordinateSystem:{type:'imagePixels', origin:'topLeft', imageWidthPx:state.image?.naturalWidth||state.image?.width||state.imageMeta?.naturalWidthPx||null, imageHeightPx:state.image?.naturalHeight||state.image?.height||state.imageMeta?.naturalHeightPx||null},
      canvasViewport:(()=>{const r=canvas.getBoundingClientRect(); return {widthPx:r.width,heightPx:r.height};})(),
      image:imageMetaForProject({includeDataUrl:includeImageDataUrl}),
      view:state.view,
      site3d:state.site3d,
      imageOpacity:state.imageOpacity,
      imageLocked:state.imageLocked,
      scale:{calibrated:!!state.pxPerMm,pxPerMm:state.pxPerMm,calibrationLine:state.calibrationLine,units:'mm'},
      buildings:state.buildings,
      roads:state.roads,
      roadFeatures:state.roadFeatures,
      benchworkOutlines:state.benchworkOutlines,
      fabricRegions:state.fabricRegions,
      siteConstraints:[...state.roads.map(r=>({...r,type:'road'})), ...state.benchworkOutlines.map(b=>({...b,type:'benchworkOutline'}))],
      streetlights:state.streetlights,
      annotations:state.annotations
    };
  }
  function writeAutosave(){
    if(!state.autosaveReady) return;
    clearTimeout(autosaveTimer);
    autosaveTimer=null;
    try{
      let payload=makeProjectPayload({includeImageDataUrl:true});
      const meta={savedAt:payload.savedAt, dirtySinceManualSave:!!state.dirtySinceManualSave, imageEmbedded:!!payload.image?.dataUrl, imageBytes:payload.image?.dataUrlByteLength||0};
      try{
        localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(payload));
        localStorage.setItem(AUTOSAVE_META_KEY, JSON.stringify(meta));
        updateImagePortableStatus();
      }catch(storageErr){
        // Browser localStorage is often too small for large reference images.
        // Keep geometry safe in this browser by retrying without the image,
        // while portable .hako-site.json saves still embed the full original.
        if(payload.image?.dataUrl){
          payload=makeProjectPayload({includeImageDataUrl:false});
          const fallbackMeta={savedAt:payload.savedAt, dirtySinceManualSave:!!state.dirtySinceManualSave, imageEmbedded:false, imageTooLargeForAutosave:true, imageBytes:meta.imageBytes};
          localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(payload));
          localStorage.setItem(AUTOSAVE_META_KEY, JSON.stringify(fallbackMeta));
          updateAutosaveStatus('Autosave: geometry saved, image too large');
          updateImagePortableStatus('Portable save: embeds original image; autosave kept geometry only because browser cache is too small.');
        } else {
          throw storageErr;
        }
      }
      state.dirty=false;
      state.lastAutosaveAt=Date.now();
      if(!(payload.image && !payload.image.dataUrl && state.imageMeta?.dataUrl)) updateAutosaveStatus();
    }catch(err){
      console.warn('[HakoMachi Site Planner] Autosave failed:', err);
      updateAutosaveStatus('Autosave: failed');
    }
  }
  function markManualSaveComplete(){
    state.dirty=false;
    state.dirtySinceManualSave=false;
    writeAutosave();
    updateAutosaveStatus('Autosave: saved');
    setTimeout(()=>updateAutosaveStatus(), 1200);
  }


  function clearLongPress(){
    if(state.longPress?.timer) clearTimeout(state.longPress.timer);
    state.longPress=null;
  }
  function hideContextMenu(){const m=$('contextMenu'); if(m) m.style.display='none'; state.contextTarget=null;}
  function showContextMenu(screenX,screenY,target){
    const m=$('contextMenu'); if(!m) return;
    state.contextTarget=target;
    if(target?.streetlight){
      state.selectedStreetlightId=target.streetlight.id; clearBuildingSelection(); state.selectedAnnotationId=null;
      m.innerHTML=`<button data-action="duplicateStreetlight">Duplicate Streetlight</button><button data-action="lockStreetlight">${target.streetlight.locked?'Unlock':'Lock'} Streetlight</button><button data-action="deleteStreetlight" class="dangerItem">Delete Streetlight</button>`;
      m.querySelectorAll('button').forEach(btn=>btn.onclick=()=>handleContextAction(btn.dataset.action));
      m.style.display='block';
      const wrapRect=wrap.getBoundingClientRect(); const mw=m.offsetWidth||210, mh=m.offsetHeight||120;
      m.style.left=clamp(screenX-wrapRect.left,8,wrapRect.width-mw-8)+'px';
      m.style.top=clamp(screenY-wrapRect.top,8,wrapRect.height-mh-8)+'px';
      renderList(); renderStreetlights(); renderSelected(); draw();
      return;
    }
    if(target?.annotation){
      m.innerHTML=`
        <button data-action="deleteAnnotation" class="dangerItem">Delete Annotation</button>
      `;
      m.querySelectorAll('button').forEach(btn=>btn.onclick=()=>handleContextAction(btn.dataset.action));
      m.style.display='block';
      const wrapRect=wrap.getBoundingClientRect();
      const mw=m.offsetWidth||190, mh=m.offsetHeight||80;
      m.style.left=clamp(screenX-wrapRect.left,8,wrapRect.width-mw-8)+'px';
      m.style.top=clamp(screenY-wrapRect.top,8,wrapRect.height-mh-8)+'px';
      return;
    }
    const b=target?.building;
    const hasPolyPoint=target?.handle?.type==='polyPoint';
    m.innerHTML=`
      <button data-action="lock">${b?.locked?'Unlock Pad':'Lock Pad'}</button>
      <button data-action="convert" ${b?.padType==='rect'?'':'disabled'}>Convert Rect to Polygon</button>
      <button data-action="deletePoint" ${hasPolyPoint?'':'disabled'}>Delete Point</button>
      <button data-action="deletePad" class="dangerItem">Delete Pad</button>
    `;
    m.querySelectorAll('button').forEach(btn=>btn.onclick=()=>handleContextAction(btn.dataset.action));
    m.style.display='block';
    const wrapRect=wrap.getBoundingClientRect();
    const mw=m.offsetWidth||190, mh=m.offsetHeight||150;
    m.style.left=clamp(screenX-wrapRect.left,8,wrapRect.width-mw-8)+'px';
    m.style.top=clamp(screenY-wrapRect.top,8,wrapRect.height-mh-8)+'px';
  }
  function contextTargetAt(worldPoint,pointerType='pen'){
    const note=hitAnnotation(worldPoint,pointerType);
    if(note) return {annotation:note,point:worldPoint};
    const sl=selectedStreetlight() || hitStreetlight(worldPoint,pointerType);
    if(sl) return {streetlight:sl,point:worldPoint};
    const b=selected() || hitTest(worldPoint);
    if(!b) return null;
    const h=handleAt(worldPoint,b,pointerType);
    return {building:b,handle:h,point:worldPoint};
  }
  function handleContextAction(action){
    const t=state.contextTarget, b=t?.building;
    if(action==='deleteStreetlight' && t?.streetlight){
      state.streetlights=state.streetlights.filter(l=>l.id!==t.streetlight.id);
      if(state.selectedStreetlightId===t.streetlight.id) state.selectedStreetlightId=null;
      hideContextMenu(); syncAll(); return;
    }
    if(action==='lockStreetlight' && t?.streetlight){t.streetlight.locked=!t.streetlight.locked; hideContextMenu(); syncAll(); return;}
    if(action==='duplicateStreetlight' && t?.streetlight){duplicateStreetlight(t.streetlight); hideContextMenu(); syncAll(); return;}
    if(action==='deleteAnnotation' && t?.annotation){
      state.annotations=state.annotations.filter(st=>st.id!==t.annotation.id);
      if(state.selectedAnnotationId===t.annotation.id) state.selectedAnnotationId=null;
      hideContextMenu(); renderSelected(); draw(); markDirty('annotation deleted'); return;
    }
    if(!b) return hideContextMenu();
    if(action==='lock'){b.locked=!b.locked;}
    if(action==='convert' && b.padType==='rect') convertRectToPoly(b);
    if(action==='deletePoint' && b.padType==='polygon' && t.handle?.type==='polyPoint' && b.pointsPx.length>3){b.pointsPx.splice(t.handle.index,1); syncBuildingMetrics(b);}
    if(action==='deletePad'){state.buildings=state.buildings.filter(x=>x.id!==b.id); if(state.selectedId===b.id) state.selectedId=null;}
    hideContextMenu(); syncAll();
  }
  function convertRectToPoly(b){
    const pts=transformedRect(b);
    b.padType='polygon'; b.pointsPx=pts; b.rotationDeg=0; delete b.widthPx; delete b.depthPx; delete b.widthMm; delete b.depthMm; syncBuildingMetrics(b);
  }
  function beginLongPress(e,worldPoint){
    clearLongPress();
    if(e.pointerType==='mouse') return;
    const target=contextTargetAt(worldPoint,e.pointerType);
    if(!target) return;
    state.longPress={pointerId:e.pointerId,start:{x:e.clientX,y:e.clientY},world:worldPoint,timer:setTimeout(()=>{
      if(!state.drag || state.drag.pointerId===e.pointerId){
        state.drag=null;
        state.selectedId=target.building.id;
        renderList(); renderSelected(); updateHandoff();
        showContextMenu(e.clientX,e.clientY,target);
        draw();
      }
    },620)};
  }
  function moveCancelsLongPress(e){
    if(!state.longPress || state.longPress.pointerId!==e.pointerId) return;
    if(Math.hypot(e.clientX-state.longPress.start.x,e.clientY-state.longPress.start.y)>8) clearLongPress();
  }
  function startAnnotationStroke(e,p){
    const pressure=(e.pressure && e.pressure>0 ? e.pressure : .5);
    const stroke={id:uid('note'),points:[{x:p.x,y:p.y,pressure}],color:'#6f4326',baseWidth:2.2};
    state.annotations.push(stroke);
    state.selectedAnnotationId=stroke.id; state.selectedId=null; renderList(); renderSelected();
    state.drag={type:'annotate',pointerId:e.pointerId,strokeId:stroke.id};
  }
  function addAnnotationPoint(e,p){
    const st=state.annotations.find(s=>s.id===state.drag?.strokeId); if(!st) return;
    const pressure=(e.pressure && e.pressure>0 ? e.pressure : .5);
    const last=st.points[st.points.length-1];
    if(!last || dist(last,p)>1.5/state.view.scale) st.points.push({x:p.x,y:p.y,pressure});
  }
  function drawAnnotations(){
    ctx.save(); ctx.lineCap='round'; ctx.lineJoin='round';
    state.annotations.forEach(st=>{
      const pts=st.points||[]; if(pts.length<2) return;
      const selected=st.id===state.selectedAnnotationId;
      if(selected){
        ctx.strokeStyle='rgba(200,74,58,.55)';
        for(let i=1;i<pts.length;i++){
          const a=pts[i-1], b=pts[i];
          const pr=((a.pressure||.5)+(b.pressure||.5))/2;
          ctx.lineWidth=((st.baseWidth||2.2)*(0.55+pr*1.45)+8)/state.view.scale;
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
        }
      }
      ctx.strokeStyle=st.color||'#6f4326';
      for(let i=1;i<pts.length;i++){
        const a=pts[i-1], b=pts[i];
        const pr=((a.pressure||.5)+(b.pressure||.5))/2;
        ctx.lineWidth=(st.baseWidth||2.2)*(0.55+pr*1.45)/state.view.scale;
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
      }
    });
    ctx.restore();
  }
  function drawHoverPreview(){
    const hp=state.hoverPreview; if(!hp) return;
    ctx.save();
    ctx.strokeStyle='rgba(15,118,110,.85)'; ctx.fillStyle='rgba(15,118,110,.16)'; ctx.lineWidth=1.5/state.view.scale;
    ctx.beginPath(); ctx.arc(hp.point.x,hp.point.y,(hp.kind==='handle'?12:7)/state.view.scale,0,Math.PI*2); ctx.fill(); ctx.stroke();
    if(hp.label) drawLabel(hp.label,{x:hp.point.x+10/state.view.scale,y:hp.point.y-10/state.view.scale});
    ctx.restore();
  }

  function drawGrid(){if(!state.pxPerMm) return; const stepMm = state.view.scale*state.pxPerMm>30?10: state.view.scale*state.pxPerMm>8?25:50; const step=mmToPx(stepMm); const r=canvas.getBoundingClientRect(); const min=screenToWorld({clientX:r.left,clientY:r.top}), max=screenToWorld({clientX:r.right,clientY:r.bottom}); ctx.save(); ctx.strokeStyle='rgba(107,81,57,.18)'; ctx.lineWidth=1/state.view.scale; for(let x=Math.floor(min.x/step)*step;x<max.x;x+=step){ctx.beginPath();ctx.moveTo(x,min.y);ctx.lineTo(x,max.y);ctx.stroke()} for(let y=Math.floor(min.y/step)*step;y<max.y;y+=step){ctx.beginPath();ctx.moveTo(min.x,y);ctx.lineTo(max.x,y);ctx.stroke()} ctx.restore();}
  function drawLabel(text,p){ctx.save(); ctx.font=`${12/state.view.scale}px system-ui`; const w=ctx.measureText(text).width+8/state.view.scale; const h=18/state.view.scale; ctx.fillStyle='rgba(49,35,24,.88)'; ctx.fillRect(p.x,p.y-h,w,h); ctx.fillStyle='#fff7ed'; ctx.fillText(text,p.x+4/state.view.scale,p.y-5/state.view.scale); ctx.restore();}
  function drawRotateAffordance(b,pts){
    const c=buildingCenter(b);
    const rot=rotateHandlePoint(b);
    const radius=Math.max(...pts.map(q=>dist(c,q)))+18/state.view.scale;
    ctx.save();
    ctx.strokeStyle='rgba(15,118,110,.55)';
    ctx.fillStyle='rgba(15,118,110,.14)';
    ctx.lineWidth=2/state.view.scale;
    ctx.setLineDash([7/state.view.scale,6/state.view.scale]);
    ctx.beginPath(); ctx.arc(c.x,c.y,radius,0,Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(c.x,c.y); ctx.lineTo(rot.x,rot.y); ctx.stroke();
    ctx.beginPath(); ctx.arc(rot.x,rot.y,9/state.view.scale,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.font=`${13/state.view.scale}px system-ui`; ctx.fillStyle='#0f766e'; ctx.fillText('↻',rot.x-4/state.view.scale,rot.y+5/state.view.scale);
    ctx.restore();
  }
  function hakoLocalMmToWorld(b,p){
    const c=buildingCenter(b);
    const origin=b.hakoGeometryOriginMm || {x:0,y:0};
    const dx=mmToPx(Number(p.x||0)-Number(origin.x||0));
    const dy=mmToPx(Number(p.y||0)-Number(origin.y||0));
    const a=rad(Number(b.rotationDeg)||0), ca=Math.cos(a), sa=Math.sin(a);
    return {x:c.x+dx*ca-dy*sa,y:c.y+dx*sa+dy*ca};
  }
  function arcSampleMm(it){
    const r=Math.hypot(it.x1-it.cx,it.y1-it.cy);
    if(!Number.isFinite(r)||r<=0) return [{x:it.x1,y:it.y1},{x:it.x2,y:it.y2}];
    const a1=Math.atan2(it.y1-it.cy,it.x1-it.cx);
    const a2=Math.atan2(it.y2-it.cy,it.x2-it.cx);
    let delta=a2-a1;
    while(delta>Math.PI) delta-=Math.PI*2;
    while(delta<-Math.PI) delta+=Math.PI*2;
    const side=Number(it.bulgeSide||1);
    if(side<0 && delta>0) delta-=Math.PI*2;
    if(side>0 && delta<0) delta+=Math.PI*2;
    const steps=Math.max(8,Math.ceil(Math.abs(delta)/(Math.PI/18)));
    const pts=[];
    for(let i=0;i<=steps;i++){
      const a=a1+delta*(i/steps);
      pts.push({x:it.cx+Math.cos(a)*r,y:it.cy+Math.sin(a)*r});
    }
    return pts;
  }
  function drawHakoTrimLines(b,strong=false){
    if(!b || b.showHakoTrimLines===false || !Array.isArray(b.hakoTrimLinesMm) || !b.hakoTrimLinesMm.length || !state.pxPerMm) return;
    ctx.save();
    ctx.strokeStyle=strong?'#d95f24':'rgba(217,95,36,.65)';
    ctx.lineWidth=(strong?2.4:1.6)/state.view.scale;
    ctx.setLineDash([8/state.view.scale,5/state.view.scale]);
    b.hakoTrimLinesMm.forEach(it=>{
      const pts=(it.type==='arc') ? arcSampleMm(it) : [{x:it.x1,y:it.y1},{x:it.x2,y:it.y2}];
      if(!pts.length) return;
      ctx.beginPath();
      pts.forEach((p,i)=>{const q=hakoLocalMmToWorld(b,p); i?ctx.lineTo(q.x,q.y):ctx.moveTo(q.x,q.y);});
      ctx.stroke();
      if(strong){
        const a=hakoLocalMmToWorld(b,pts[0]), z=hakoLocalMmToWorld(b,pts[pts.length-1]);
        ctx.setLineDash([]);
        ctx.fillStyle='#d95f24';
        [a,z].forEach(q=>{ctx.beginPath();ctx.arc(q.x,q.y,3.5/state.view.scale,0,Math.PI*2);ctx.fill();});
        ctx.setLineDash([8/state.view.scale,5/state.view.scale]);
      }
    });
    ctx.restore();
  }

  function drawBuilding(b){ if(b.hidden) return; syncBuildingMetrics(b); ctx.save(); const isSelected=isBuildingSelected(b.id), isHovered=b.id===state.hoverBuildingId; ctx.lineWidth=(isSelected?4:(isHovered?4:3))/state.view.scale; ctx.strokeStyle=isSelected?'#0f766e':(isHovered?'#2a64aa':b.color); ctx.fillStyle=isHovered&&!isSelected?'rgba(42,100,170,.18)':((b.color||'#d79631')+'33'); ctx.beginPath(); const pts=b.padType==='rect'?transformedRect(b):b.pointsPx; pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)); ctx.closePath(); ctx.fill(); ctx.stroke();
    if(b.hakoTrimLinesMm && (isSelected || isHovered)) drawHakoTrimLines(b,isSelected);
    if(isSelected || isHovered){ const c=b.padType==='rect'?{x:b.x,y:b.y}:polygonCenter(pts); const trimNote=(b.hakoTrimLinesMm&&b.hakoTrimLinesMm.length)?` · ${b.hakoTrimLinesMm.length} trim line${b.hakoTrimLinesMm.length===1?'':'s'}`:''; drawLabel(`${b.name||'Building'} ${b.padType==='rect'&&state.pxPerMm?`${fmt(b.widthMm)}×${fmt(b.depthMm)}mm`:''}${trimNote}`,{x:c.x+6/state.view.scale,y:c.y-6/state.view.scale}); }
    if(isSelected && currentSelectedBuildingIds().length===1 && !b.locked){ ctx.fillStyle='#0f766e'; pts.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,5/state.view.scale,0,Math.PI*2);ctx.fill()}); drawRotateAffordance(b,pts); }
    ctx.restore(); }
  function drawLine(line,color,label){ if(!line) return; ctx.save(); ctx.strokeStyle=color; ctx.lineWidth=3/state.view.scale; ctx.beginPath();ctx.moveTo(line.x1,line.y1);ctx.lineTo(line.x2,line.y2);ctx.stroke(); ctx.fillStyle=color; [{x:line.x1,y:line.y1},{x:line.x2,y:line.y2}].forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,4/state.view.scale,0,Math.PI*2);ctx.fill()}); if(label) drawLabel(label,{x:(line.x1+line.x2)/2,y:(line.y1+line.y2)/2}); ctx.restore();}

  function drawStreetlight(l){
    l=normalizeStreetlight(l);
    const selected=l.id===state.selectedStreetlightId, hovered=l.id===state.hoverStreetlightId;
    const r=Math.max(5, state.pxPerMm ? mmToPx(l.lightRadiusMm||2) : 8)/state.view.scale;
    const armPx=Math.max(10, state.pxPerMm ? mmToPx(l.armLengthMm||3.5) : 14)/state.view.scale;
    const a=rad(l.rotationDeg||0);
    ctx.save();
    ctx.translate(l.x,l.y); ctx.rotate(a);
    const isAnchored=l.mode==='anchored';
    ctx.lineWidth=(selected?3:2)/state.view.scale;
    ctx.strokeStyle=selected?'#0f766e':(isAnchored?'#c84a3a':'#2a64aa');
    ctx.fillStyle=isAnchored?'rgba(200,74,58,.18)':'rgba(42,100,170,.16)';
    // future export footprint / mount marker
    if(isAnchored){
      const mount=l.anchor?.mountMode||'sidewalkCutHole';
      const diaMm=mount==='roadEdgeBulbMount'?(l.anchor?.bulbMountDiameterMm||3):(l.anchor?.cutHoleDiameterMm||1.2);
      const mr=Math.max(4,state.pxPerMm?mmToPx(diaMm/2):6)/state.view.scale;
      ctx.beginPath(); ctx.arc(0,0,mr,0,Math.PI*2); ctx.fill(); ctx.stroke();
      if(mount==='sidewalkCutHole'){
        ctx.beginPath(); ctx.moveTo(-mr*.65,0); ctx.lineTo(mr*.65,0); ctx.moveTo(0,-mr*.65); ctx.lineTo(0,mr*.65); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(0,0,mr*1.45,0,Math.PI*2); ctx.stroke();
      }
    }
    ctx.fillStyle=l.color||'#c84a3a'; ctx.strokeStyle=selected?'#0f766e':'#3a2b1e';
    ctx.lineWidth=1.5/state.view.scale;
    ctx.beginPath(); ctx.arc(0,0,4/state.view.scale,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,-armPx*1.2); ctx.lineTo(armPx,-armPx*1.2); ctx.stroke();
    if(l.type==='doubleArm'){ctx.beginPath(); ctx.moveTo(0,-armPx*1.2); ctx.lineTo(-armPx,-armPx*1.2); ctx.stroke();}
    ctx.fillStyle='#f7d87a'; ctx.beginPath(); ctx.arc(armPx,-armPx*1.2,3/state.view.scale,0,Math.PI*2); ctx.fill();
    if(l.type==='doubleArm'){ctx.beginPath(); ctx.arc(-armPx,-armPx*1.2,3/state.view.scale,0,Math.PI*2); ctx.fill();}
    if(selected||hovered){ctx.strokeStyle='rgba(15,118,110,.9)'; ctx.lineWidth=1.25/state.view.scale; ctx.strokeRect(-12/state.view.scale,-armPx*1.2-9/state.view.scale,Math.max(24/state.view.scale,armPx+18/state.view.scale),armPx*1.2+20/state.view.scale);}
    ctx.restore();
    if(selected||hovered) drawLabel(`${l.name||'Streetlight'}${l.mode==='anchored'?' · anchored':''}`,{x:l.x+8/state.view.scale,y:l.y-8/state.view.scale});
  }
  function placeStreetlight(p){
    const anchored=state.streetlightMode==='anchored';
    const l=normalizeStreetlight({
      id:uid('light'), kind:'streetlight', mode:anchored?'anchored':'free',
      name:(anchored?'Anchored Streetlight ':'Streetlight ')+(state.streetlights.length+1),
      x:p.x,y:p.y,type:'singleArm',heightMm:8,armLengthMm:3.5,rotationDeg:0,lightRadiusMm:2,poleDiameterMm:.45,color:'#c84a3a',locked:false,notes:'',
      anchor: anchored ? {mountMode:'sidewalkCutHole', cutHoleDiameterMm:1.2, bulbMountDiameterMm:3.0, edgeOffsetMm:.5, lockToRoadEdge:false, targetRoadId:null, sidewalkSide:'auto'} : {mountMode:'free'}
    });
    state.streetlights.push(l); state.selectedStreetlightId=l.id; clearBuildingSelection(); state.selectedAnnotationId=null; syncAll();
  }
  function duplicateStreetlight(l){
    const c=structuredClone(normalizeStreetlight(l)); c.id=uid('light'); c.name=(c.name||'Streetlight')+' copy'; c.x+=16; c.y+=16; state.streetlights.push(c); state.selectedStreetlightId=c.id; clearBuildingSelection(); state.selectedAnnotationId=null; return c;
  }



  const FABRIC_PRESETS = {
    lowRiseResidentialFabric:{label:'Low-Rise Residential Fabric',types:['smallHouse','smallHouse','apartment','shopHouse'],floors:[1,2,3],lotW:[18,38],depth:[22,55],commercial:.12,signage:.12,detail:.35},
    localMixedUseFabric:{label:'Local Mixed-Use Fabric',types:['shopHouse','shopHouse','workshopHouse','apartment','restrainedZakkyo'],floors:[2,3,4],lotW:[22,45],depth:[30,70],commercial:.65,signage:.35,detail:.55},
    edgeEnclosedPocketFabric:{label:'Edge-Enclosed Pocket Fabric',types:['apartment','officeBlock','zakkyo','smallHouse','shopHouse'],floors:[2,3,5,6],lotW:[25,55],depth:[28,75],commercial:.45,signage:.35,detail:.55},
    stationCommercialStack:{label:'Station Commercial Stack',types:['zakkyo','officeBlock','stackedCommercialBuilding','shopHouse'],floors:[4,6,8,10],lotW:[18,36],depth:[35,85],commercial:.9,signage:.75,detail:.85},
    shopWorkshopStreet:{label:'Shop-Workshop Street',types:['workshopHouse','shopHouse','warehouse','smallOffice'],floors:[2,3,4,5],lotW:[28,60],depth:[35,90],commercial:.55,signage:.3,detail:.55},
    signHeavyCommercialCanyon:{label:'Sign-Heavy Commercial Canyon',types:['zakkyo','signCoveredTenantStack','stackedCommercialBuilding'],floors:[6,8,10,12],lotW:[16,34],depth:[42,95],commercial:1,signage:1,detail:1},
    midRiseMixedUseStreet:{label:'Mid-Rise Mixed-Use Street',types:['restrainedZakkyo','shopHouse','smallOffice','apartment'],floors:[3,4,5,6,8],lotW:[22,44],depth:[35,80],commercial:.65,signage:.45,detail:.7},
    perimeterLanewayBlock:{label:'Perimeter Laneway Block',types:['perimeterTenantBlock','alleyTenantCell','barAlleyUnit','tinyRestaurant'],floors:[1,2,3,6,8],lotW:[14,34],depth:[20,65],commercial:.9,signage:.65,detail:.9},
    underViaductInfill:{label:'Under-Viaduct Infill',types:['undertrackBay'],floors:[1,2],lotW:[18,28],depth:[18,42],commercial:.75,signage:.5,detail:.75},
    industrialServiceFabric:{label:'Industrial Service Fabric',types:['warehouse','workshopHouse','officeBlock','serviceBuilding'],floors:[1,2,3,4],lotW:[45,110],depth:[45,130],commercial:.25,signage:.15,detail:.45}
  };
  function initFabricControls(){
    const sel=$('fabricPreset'); if(sel && !sel.options.length){ sel.innerHTML=Object.entries(FABRIC_PRESETS).map(([k,p])=>`<option value="${k}">${escapeHtml(p.label)}</option>`).join(''); sel.value=state.fabricPreset||'localMixedUseFabric'; sel.onchange=()=>{state.fabricPreset=sel.value;}; }
    const bind=(id,fn)=>{const el=$(id); if(el && !el.dataset.fabricBound){el.dataset.fabricBound='1'; el.oninput=()=>fn(el.value);}};
    bind('fabricPreset',v=>state.fabricPreset=v);
    const gen=$('generateFabricBtn'); if(gen && !gen.dataset.fabricBound){gen.dataset.fabricBound='1'; gen.onclick=()=>{generateFabricFromDraft();};}
    const clear=$('clearFabricDraftBtn'); if(clear && !clear.dataset.fabricBound){clear.dataset.fabricBound='1'; clear.onclick=()=>{state.fabricDraft=[]; draw();};}
  }
  function lcg(seed){let s=(Number(seed)||1)>>>0; return function(){s=(1664525*s+1013904223)>>>0; return s/4294967296;};}
  function rr(rng,a,b){return a+(b-a)*rng();}
  function pick(rng,arr){return arr[Math.floor(rng()*arr.length)]||arr[0];}
  function fabricPreset(){return FABRIC_PRESETS[state.fabricPreset]||FABRIC_PRESETS.localMixedUseFabric;}
  function fabricValue(id, fallback){const el=$(id); const v=el?parseFloat(el.value):NaN; return Number.isFinite(v)?v:fallback;}
  function fabricRegionCenter(region){return polygonCenter(region.polygon||[]);}
  function normalizeFabricRegion(r){r.id=r.id||uid('fabric'); r.name=r.name||`Fabric Region ${state.fabricRegions.length+1}`; r.fabricType=r.fabricType||state.fabricPreset||'localMixedUseFabric'; r.polygon=r.polygon||r.pointsPx||[]; r.color=r.color||'#7c5f3f'; r.seed=Number.isFinite(Number(r.seed))?Number(r.seed):101; r.generatedPadIds=Array.isArray(r.generatedPadIds)?r.generatedPadIds:[]; return r;}
  function drawFabricRegion(region){region=normalizeFabricRegion(region); if(!region.polygon.length) return; ctx.save(); const selected=region.id===state.selectedFabricId; ctx.lineWidth=(selected?3:2)/state.view.scale; ctx.strokeStyle=selected?'#0f766e':'#7c5f3f'; ctx.fillStyle='rgba(124,95,63,.08)'; ctx.setLineDash([7/state.view.scale,5/state.view.scale]); ctx.beginPath(); region.polygon.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.setLineDash([]); if(selected){drawLabel(`${FABRIC_PRESETS[region.fabricType]?.label||region.fabricType} · ${region.generatedPadIds?.length||0} pads`, fabricRegionCenter(region));} ctx.restore();}
  function drawFabricDraft(){if(!state.fabricDraft.length) return; ctx.save(); ctx.strokeStyle='#7c5f3f'; ctx.fillStyle='rgba(124,95,63,.12)'; ctx.lineWidth=3/state.view.scale; ctx.setLineDash([8/state.view.scale,6/state.view.scale]); ctx.beginPath(); state.fabricDraft.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)); ctx.stroke(); if(state.fabricDraft.length>=3){ctx.closePath(); ctx.fill();} ctx.setLineDash([]); state.fabricDraft.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,4/state.view.scale,0,Math.PI*2);ctx.fill();}); ctx.restore();}
  function finishFabricRegion(){if(state.fabricDraft.length<3) return null; const region=normalizeFabricRegion({id:uid('fabric'), name:`Fabric Region ${state.fabricRegions.length+1}`, fabricType:state.fabricPreset||'localMixedUseFabric', polygon:state.fabricDraft.slice(), density:fabricValue('fabricDensity',1), randomness:fabricValue('fabricRandomness',.45), averageFloorCount:fabricValue('fabricAvgFloors',3), maxFloorCount:fabricValue('fabricMaxFloors',6), seed:fabricValue('fabricSeed',101), generatedPadIds:[]}); state.fabricRegions.push(region); state.selectedFabricId=region.id; state.fabricDraft=[]; syncAll(); return region;}
  function rectInsidePoly(cx,cy,w,h,poly){const corners=[{x:cx-w/2,y:cy-h/2},{x:cx+w/2,y:cy-h/2},{x:cx+w/2,y:cy+h/2},{x:cx-w/2,y:cy+h/2}]; return corners.every(p=>pointInPoly(p,poly));}
  function fabricLotRole(cx,cy,bb,idx){const edge=Math.min(cx-bb.minX,bb.maxX-cx,cy-bb.minY,bb.maxY-cy); const corner=(cx-bb.minX<30||bb.maxX-cx<30)&&(cy-bb.minY<30||bb.maxY-cy<30); if(corner) return 'corner'; if(edge<35) return idx%3===0?'sideStreet':'mainStreet'; return idx%4===0?'alley':'interior';}
  function fabricFrontageType(role){return role==='alley'||role==='interior'?'alleyFrontage':(role==='corner'?'mainStreetFrontage':'mainStreetFrontage');}
  function makeFabricHakoSeed(building, region, preset, role, buildingType, floorCount){syncBuildingMetrics(building); return {schemaVersion:1, source:'HakoMachi Site Planner', kind:'HakoSeed', name:building.name, footprint:{type:'rect', widthMm:building.widthMm||0, depthMm:building.depthMm||0, rotationDeg:building.rotationDeg||0}, floorCount, materialProfileId:'defaultChipboard', buildingType, fabricHints:{fabricType:region.fabricType, lotRole:role, frontageType:fabricFrontageType(role), signageIntensity:preset.signage, commercialIntensity:preset.commercial, ageWeathering:0.45, detailIntensity:preset.detail}, styleHints:{generatedBy:'urbanFabricFill', fabricRegionId:region.id, density:region.density, randomness:region.randomness}};}
  function generateFabricFromDraft(){
    let region=state.selectedFabricId ? state.fabricRegions.find(r=>r.id===state.selectedFabricId) : null;
    if(state.fabricDraft.length>=3) region=finishFabricRegion();
    if(!region){ alert('Draw a Fabric Fill region first.'); return; }
    region=normalizeFabricRegion(region);
    const preset=FABRIC_PRESETS[region.fabricType]||fabricPreset();
    region.density=fabricValue('fabricDensity', region.density||1);
    region.randomness=fabricValue('fabricRandomness', region.randomness||.45);
    region.averageFloorCount=fabricValue('fabricAvgFloors', region.averageFloorCount||3);
    region.maxFloorCount=fabricValue('fabricMaxFloors', region.maxFloorCount||6);
    region.seed=fabricValue('fabricSeed', region.seed||101);
    const rng=lcg(region.seed);
    const poly=region.polygon;
    const xs=poly.map(p=>p.x), ys=poly.map(p=>p.y);
    const bb={minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};
    const scale=state.pxPerMm||1;
    const wRange=preset.lotW.map(v=>v*scale), dRange=preset.depth.map(v=>v*scale);
    const created=[]; let y=bb.minY; let idx=0;
    while(y<bb.maxY && idx<600){
      const rowDepth=rr(rng,dRange[0],dRange[1])*(1+(rng()-.5)*region.randomness*.5);
      let x=bb.minX;
      while(x<bb.maxX && idx<600){
        const lotW=rr(rng,wRange[0],wRange[1])*(1+(rng()-.5)*region.randomness*.7)/Math.max(.35,region.density);
        const gap=(preset===FABRIC_PRESETS.industrialServiceFabric?rr(rng,1,4):rr(rng,0,1.2))*scale;
        const cx=x+lotW/2, cy=y+rowDepth/2;
        if(rectInsidePoly(cx,cy,Math.max(4,lotW-gap),Math.max(4,rowDepth-gap),poly)){
          const role=fabricLotRole(cx,cy,bb,idx);
          const type=pick(rng,preset.types);
          const floorBase=pick(rng,preset.floors);
          const floorCount=Math.max(1,Math.min(region.maxFloorCount, Math.round((floorBase+region.averageFloorCount)/2 + (rng()-.5)*region.randomness*3)));
          const b={id:uid('bldg'),name:`${preset.label} ${created.length+1}`,padType:'rect',x:cx,y:cy,widthPx:Math.max(4,lotW-gap),depthPx:Math.max(4,rowDepth-gap),rotationDeg:0,category:type,color:colors[(state.buildings.length+created.length)%colors.length],hidden:false,locked:false,state:'notStarted',notes:`Generated from ${preset.label}. Role: ${role}.`,fabricRegionId:region.id,lotRole:role,frontageType:fabricFrontageType(role),suggestedBuildingType:type,floorCount,detailIntensity:preset.detail,hakoConfig:null,hakoFile:null,hakoFileId:null};
          syncBuildingMetrics(b);
          b.hakoSeed=makeFabricHakoSeed(b,region,preset,role,type,floorCount);
          created.push(b);
        }
        x+=lotW;
        idx++;
      }
      y+=rowDepth;
    }
    if(!created.length){ alert('No pads fit inside this region. Try a larger region, higher density, or smaller scale.'); return; }
    state.buildings.push(...created);
    region.generatedPadIds=[...(region.generatedPadIds||[]), ...created.map(b=>b.id)];
    setBuildingSelection(created.map(b=>b.id), created.length===1?created[0].id:null);
    syncAll();
  }

  function draw(){
    if(renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => {
      renderQueued = false;
      drawNow();
    });
  }
  function drawNow(){const r=canvas.getBoundingClientRect(); const dpr=devicePixelRatio||1; ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,r.width,r.height); ctx.save(); ctx.translate(state.view.x,state.view.y); ctx.scale(state.view.scale,state.view.scale); drawGrid(); if(state.image){ctx.save();ctx.globalAlpha=state.imageOpacity;ctx.drawImage(state.image,0,0);ctx.restore();} drawAnnotations(); const calLabel=(state.calibrationLine&&state.pxPerMm)?`${fmt(pxToMm(dist({x:state.calibrationLine.x1,y:state.calibrationLine.y1},{x:state.calibrationLine.x2,y:state.calibrationLine.y2})))} mm`:'calibration'; drawLine(state.calibrationLine,'#b8672d',calLabel); const measureLabel=(state.measureLine&&state.pxPerMm)?`${fmt(pxToMm(dist({x:state.measureLine.x1,y:state.measureLine.y1},{x:state.measureLine.x2,y:state.measureLine.y2})))} mm`:'measure'; drawLine(state.measureLine,'#3f7a50',measureLabel); state.benchworkOutlines.forEach(drawBenchwork); state.roads.forEach(drawRoad); drawRoadJunctions(); (state.roadFeatures||[]).forEach(drawRoadFeature); drawRoadExportPreview(); (state.fabricRegions||[]).forEach(drawFabricRegion); state.buildings.forEach(drawBuilding); state.streetlights.forEach(drawStreetlight); if(state.roadDraft.length){ctx.save();ctx.strokeStyle='#6f6a5e';ctx.fillStyle='rgba(111,106,94,.18)';ctx.lineWidth=3/state.view.scale;if(state.roadMode==='centerline'&&state.roadDraft.length>=2){const temp=createRoadCenterlineFromPoints(state.roadDraft); temp.id='road_draft'; drawRoad(temp);} else {ctx.beginPath();state.roadDraft.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();}state.roadDraft.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,4/state.view.scale,0,Math.PI*2);ctx.fill()});ctx.restore();} if(state.benchworkDraft.length){ctx.save();ctx.strokeStyle='#2f6f4e';ctx.fillStyle='rgba(47,111,78,.12)';ctx.lineWidth=3/state.view.scale;ctx.setLineDash([8/state.view.scale,6/state.view.scale]);ctx.beginPath();state.benchworkDraft.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.setLineDash([]);state.benchworkDraft.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,4/state.view.scale,0,Math.PI*2);ctx.fill()});ctx.restore();} drawFabricDraft(); if(state.polygonDraft.length){ctx.save();ctx.strokeStyle='#7c5f3f';ctx.fillStyle='rgba(124,95,63,.20)';ctx.lineWidth=3/state.view.scale;ctx.beginPath();state.polygonDraft.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();state.polygonDraft.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,4/state.view.scale,0,Math.PI*2);ctx.fill()});ctx.restore();} if(state.drag&&state.drag.preview){ if(state.drag.type==='roadCenterline') drawRoad(state.drag.preview); else drawBuilding(state.drag.preview); } drawSelectionMarquee(); drawHoverPreview(); ctx.restore(); updateEmptyImageOverlay(); updateStatus();}
  function fitImage(){const r=canvas.getBoundingClientRect(); if(!state.image){state.view={x:r.width/2,y:r.height/2,scale:1}; draw(); return;} const s=Math.min(r.width/state.image.width,r.height/state.image.height)*.9; state.view.scale=s; state.view.x=(r.width-state.image.width*s)/2; state.view.y=(r.height-state.image.height*s)/2; draw();}

  function renderStreetlights(){
    const box=$('streetlightList'); if(!box) return;
    if(!state.streetlights.length){box.innerHTML='<div class="small muted">No streetlights yet.</div>'; return;}
    box.innerHTML='';
    state.streetlights.forEach(raw=>{const l=normalizeStreetlight(raw); const el=document.createElement('div'); el.className='buildingItem '+(l.id===state.selectedStreetlightId?'selected':''); el.innerHTML=`<span class="streetlight-swatch" style="background:${l.color||'#c84a3a'}"></span><div><b>${escapeHtml(l.name||'Streetlight')}</b><br><span class="small muted">${l.mode==='anchored'?'anchored · ':''}${l.type||'singleArm'}${l.locked?' · locked':''}</span></div><span class="pill">${fmt(l.heightMm||0)}mm</span>`; el.onclick=()=>{state.selectedStreetlightId=l.id; clearBuildingSelection(); state.selectedAnnotationId=null; renderList(); renderStreetlights(); renderSelected(); updateHandoff(); draw();}; box.appendChild(el);});
  }

  function renderList(){
    const box=$('buildingList');
    box.innerHTML='';
    if(!state.buildings.length){
      const empty=document.createElement('div');
      empty.className='small muted';
      empty.textContent='No building pads yet.';
      box.appendChild(empty);
    } else {
      state.buildings.forEach(raw=>{
        const b=normalizeBuilding(raw);
        const el=document.createElement('div');
        el.className='buildingItem '+(isBuildingSelected(b.id)?'selected':'');
        const hakoBadge=b.hakoFile?'<span class="pill buildingFileBadge">.hako</span>':'';
        const metric=b.padType==='rect'?`${fmt(b.widthMm)}×${fmt(b.depthMm)}`:fmt(b.derived?.areaMm2||0)+' mm²';
        el.innerHTML=`<span class="swatch" style="background:${b.color}"></span><div class="buildingInfo"><span class="buildingName" title="${escapeAttr(b.name||'Building')}">${escapeHtml(b.name||'Building')}</span><span class="small muted buildingMeta">${buildingStateLabel(b.state)} · ${b.padType}${b.hidden?' · hidden':''}${b.locked?' · locked':''}</span></div><span class="pill buildingMetric" title="${escapeAttr(metric)}">${metric}</span>${hakoBadge}`;
        el.onmouseenter=()=>{state.hoverBuildingId=b.id; el.classList.add('sidebarHover'); draw();};
        el.onmouseleave=()=>{if(state.hoverBuildingId===b.id) state.hoverBuildingId=null; el.classList.remove('sidebarHover'); draw();};
        el.onfocus=()=>{state.hoverBuildingId=b.id; el.classList.add('sidebarHover'); draw();};
        el.onblur=()=>{if(state.hoverBuildingId===b.id) state.hoverBuildingId=null; el.classList.remove('sidebarHover'); draw();};
        el.tabIndex=0;
        el.onclick=(ev)=>{ if(ev.shiftKey || ev.metaKey || ev.ctrlKey) toggleBuildingSelection(b.id); else setBuildingSelection([b.id], b.id); renderList(); renderSelected(); updateHandoff(); draw();};
        box.appendChild(el);
      });
    }
    const actions=document.createElement('div');
    actions.className='buttons buildingListActions';
    actions.style.marginTop='10px';
    actions.innerHTML=`
      <div id="importHakoAsBuildingDropzone" class="hakoImportDropzone" role="button" tabindex="0" title="Click to choose a .hako file, or drag one here to create a draggable footprint.">
        <b>Import existing .hako as footprint</b>
        <span class="small muted">Click or drop .hako / .json here</span>
        <input id="importHakoBuildingFile" class="hiddenFile" type="file" accept=".hako,.hakoseed,.hakoplan,.json,application/json">
      </div>`;
    box.appendChild(actions);
    const drop=$('importHakoAsBuildingDropzone');
    const input=$('importHakoBuildingFile');
    if(drop && input){
      const pick=()=>input.click();
      drop.onclick=(ev)=>{ if(ev.target!==input) pick(); };
      drop.onkeydown=(ev)=>{ if(ev.key==='Enter'||ev.key===' '){ ev.preventDefault(); pick(); } };
      input.onchange=e=>{const f=e.target.files&&e.target.files[0]; if(f) importHakoAsBuilding(f); e.target.value='';};
      ['dragenter','dragover'].forEach(type=>drop.addEventListener(type, ev=>{ev.preventDefault(); ev.stopPropagation(); drop.classList.add('dragover');}));
      ['dragleave','drop'].forEach(type=>drop.addEventListener(type, ev=>{ev.preventDefault(); ev.stopPropagation(); if(type==='dragleave' && drop.contains(ev.relatedTarget)) return; drop.classList.remove('dragover');}));
      drop.addEventListener('drop', ev=>{const files=Array.from(ev.dataTransfer&&ev.dataTransfer.files||[]); const f=files.find(file=>/\.(hako|hakoseed|hakoplan|json)$/i.test(file.name||''))||files[0]; if(f) importHakoAsBuilding(f);});
    }
  }
  function renderSelectedCore(){const b=selected(), box=$('selectedPanel'); const note=selectedAnnotation(); const roadFeature=selectedRoadFeature(); const road=selectedRoad(); const bench=selectedBenchwork(); const light=selectedStreetlight(); const selIds=currentSelectedBuildingIds(); if(!b && selIds.length>1){ box.innerHTML=`<b>${selIds.length} buildings selected</b><br><span class="small muted">Drag any selected footprint to move the whole selection. Use Copy/Paste or Delete to manage the selected set.</span><div class="buttons" style="margin-top:8px"><button id="copyMultiB">Copy</button><button id="pasteMultiB" ${state.footprintClipboard?'':'disabled'}>Paste</button><button id="clearMultiB">Clear Selection</button><button id="deleteMultiB" class="danger">Delete Selected</button></div>`; $('copyMultiB').onclick=()=>{copySelectedFootprint(); renderSelected();}; $('pasteMultiB').onclick=()=>pasteFootprintFromClipboard(); $('clearMultiB').onclick=()=>{clearBuildingSelection(); syncAll();}; $('deleteMultiB').onclick=()=>{state.buildings=state.buildings.filter(x=>!selIds.includes(x.id)); clearBuildingSelection(); syncAll();}; return;} if(!b){if(roadFeature){normalizeRoadFeature(roadFeature); box.innerHTML=`
      <b>${roadFeature.kind==='manhole'?'Manhole / Hatch':'Japanese road marking'} selected</b>
      <label>Name</label><input id="rfName" value="${escapeAttr(roadFeature.name||'Road item')}">
      ${roadFeature.kind==='manhole'?`<label>Hatch preset</label><select id="rfHatchPreset">${hatchOptionsHtml(roadFeature.hatchPreset)}</select>
      <label>Shape</label><select id="rfShape"><option value="circle">Round cut hole</option><option value="rect">Rectangular cut hole</option></select>
      <div class="row"><div><label>Diameter mm</label><input id="rfDia" type="number" step="0.1" value="${fmt(roadFeature.diameterMm||0)}"></div><div><label>Rotation °</label><input id="rfRot" type="number" step="1" value="${fmt(roadFeature.rotationDeg||0)}"></div></div>
      <div class="row"><div><label>Width mm</label><input id="rfW" type="number" step="0.1" value="${fmt(roadFeature.widthMm||0)}"></div><div><label>Depth mm</label><input id="rfD" type="number" step="0.1" value="${fmt(roadFeature.depthMm||0)}"></div></div>
      <div class="small muted">Exports as <code>roadHatchCut</code> for mounting separate printed or detailed hatch/manhole pieces.</div>`:`<label>Japanese marking preset</label><select id="rfMarkingPreset">${markingOptionsHtml(roadFeature.markingPreset||roadFeature.markingType)}</select>
      <div class="small muted" style="margin:4px 0">${escapeHtml(roadFeature.jpName||'')} · ${escapeHtml(roadFeature.markingCategory||'')} · etch/visual only</div>
      <div class="row"><div><label>Width mm</label><input id="rfW" type="number" step="0.1" value="${fmt(roadFeature.widthMm||0)}"></div><div><label>Depth mm</label><input id="rfD" type="number" step="0.1" value="${fmt(roadFeature.depthMm||0)}"></div></div>
      <div class="row"><div><label>Rotation °</label><input id="rfRot" type="number" step="1" value="${fmt(roadFeature.rotationDeg||0)}"></div><div><label>Color</label><input id="rfColor" type="color" value="${roadFeature.color||'#f7f2df'}"></div></div>
      <div class="small muted">Based on Japanese road marking categories from the 1960 Order; exported as <code>roadMarkingEtch</code>, not cut through.</div>`}
      <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="rfLocked" type="checkbox" ${roadFeature.locked?'checked':''}> <span>Lock item</span></label>
      <div class="buttons" style="margin-top:8px"><button id="deleteRoadFeature" class="danger">Delete Item</button></div>`;
      const bindRF=(id,fn)=>{const el=$(id); if(el) el.oninput=()=>{fn(el.type==='checkbox'?el.checked:el.value); normalizeRoadFeature(roadFeature); syncAll();};};
      bindRF('rfName',v=>roadFeature.name=v); bindRF('rfRot',v=>roadFeature.rotationDeg=parseFloat(v)||0); bindRF('rfLocked',v=>roadFeature.locked=!!v); bindRF('rfColor',v=>roadFeature.color=v);
      bindRF('rfDia',v=>{roadFeature.diameterMm=parseFloat(v)||0; roadFeature.diameterPx=state.pxPerMm?mmToPx(roadFeature.diameterMm):roadFeature.diameterPx;});
      bindRF('rfW',v=>{roadFeature.widthMm=parseFloat(v)||0; roadFeature.widthPx=state.pxPerMm?mmToPx(roadFeature.widthMm):roadFeature.widthPx;});
      bindRF('rfD',v=>{roadFeature.depthMm=parseFloat(v)||0; roadFeature.depthPx=state.pxPerMm?mmToPx(roadFeature.depthMm):roadFeature.depthPx;});
      const hp=$('rfHatchPreset'); if(hp) hp.onchange=()=>{state.lastRoadHatchPreset=hp.value; applyRoadHatchPreset(roadFeature,hp.value); syncAll();};
      const sh=$('rfShape'); if(sh){sh.value=roadFeature.hatchShape||'circle'; sh.onchange=()=>{roadFeature.hatchShape=sh.value; syncAll();};}
      const mp=$('rfMarkingPreset'); if(mp) mp.onchange=()=>{state.lastRoadMarkingPreset=mp.value; applyRoadMarkingPreset(roadFeature,mp.value); syncAll();};
      $('deleteRoadFeature').onclick=deleteSelectedRoadFeature;
      return;
    } if(road){normalizeRoad(road); const roadPresetKey=road.roadWidthPreset||'custom'; const sidewalkPresetKey=road.sidewalkWidthPreset||'custom'; const showRoadOverride=road.mode!=='outline' && roadPresetKey==='custom'; const showSidewalkOverride=road.mode!=='outline' && sidewalkPresetKey==='custom'; box.innerHTML=`
      <b>${road.mode==='outline'?'Road outline':'Road centerline'} selected</b>
      <label>Name</label><input id="roadName" value="${escapeAttr(road.name||'Road')}">
      <label>Road width preset</label><select id="roadWidthPreset" ${road.mode==='outline'?'disabled':''}>${presetOptionsHtml(ROAD_WIDTH_PRESETS, roadPresetKey)}</select>
      <div id="roadWidthOverrideWrap" style="display:${showRoadOverride?'block':'none'}"><label>Width override (mm)</label><input id="roadWidth" type="number" step="0.1" value="${fmt(road.widthMm||0)}" ${road.mode==='outline'?'disabled':''}></div>
      <label>Sidewalk</label><select id="roadSidewalk" ${road.mode==='outline'?'disabled':''}><option value="none">None</option><option value="left">Left</option><option value="right">Right</option><option value="both">Both sides</option></select>
      <label>Sidewalk width preset</label><select id="roadSidewalkPreset" ${road.mode==='outline'?'disabled':''}>${presetOptionsHtml(SIDEWALK_WIDTH_PRESETS, sidewalkPresetKey)}</select>
      <div id="roadSidewalkOverrideWrap" style="display:${showSidewalkOverride?'block':'none'}"><label>Sidewalk width override (mm)</label><input id="roadSidewalkWidth" type="number" step="0.1" value="${fmt(road.sidewalkWidthMm||0)}" ${road.mode==='outline'?'disabled':''}></div>
      <label class="checkboxRow" style="display:flex;align-items:center;gap:8px;margin-top:8px"><input id="roadLocked" type="checkbox" ${road.locked?'checked':''}> <span>Lock road</span></label>
      <div class="buttons" style="margin-top:8px"><button id="regenRoad">Regenerate road geometry</button><button id="deleteRoad" class="danger">Delete Road</button></div>
      <div class="small muted" style="margin-top:8px">Presets are common real-world widths converted to physical output millimeters using the calibration scale divisor. Choose <b>Custom / override</b> to show manual width fields. Centerlines can be polyline paths; hover a selected segment and drag to bend it into a curve. Laser-cut road export is not enabled yet.</div>`;
      const sel=$('roadSidewalk'); if(sel) sel.value=road.sidewalkSide||'none';
      const bindRoad=(id,fn)=>{const el=$(id); if(el) el.oninput=e=>{fn(el.type==='checkbox'?el.checked:el.value); syncRoadMetrics(road); syncAll();};};
      bindRoad('roadName',v=>road.name=v);
      bindRoad('roadWidthPreset',v=>{applyRoadWidthPreset(road,v);});
      bindRoad('roadWidth',v=>{road.roadWidthPreset='custom'; road.widthMm=parseFloat(v)||0; road.widthPx=state.pxPerMm?mmToPx(road.widthMm):road.widthPx;});
      bindRoad('roadSidewalk',v=>road.sidewalkSide=v);
      bindRoad('roadSidewalkPreset',v=>{applySidewalkWidthPreset(road,v);});
      bindRoad('roadSidewalkWidth',v=>{road.sidewalkWidthPreset='custom'; road.sidewalkWidthMm=parseFloat(v)||0; road.sidewalkWidthPx=state.pxPerMm?mmToPx(road.sidewalkWidthMm):road.sidewalkWidthPx;});
      bindRoad('roadLocked',v=>road.locked=!!v);
      $('regenRoad').onclick=()=>syncAll(); $('deleteRoad').onclick=deleteSelectedRoad;
      return;
    } if(bench){normalizeBenchworkOutline(bench); box.innerHTML=`
      <b>Benchwork outline selected</b>
      <label>Name</label><input id="benchName" value="${escapeAttr(bench.name||'Benchwork Outline')}">
      <div class="row"><div><label>Color</label><input id="benchColor" type="color" value="${bench.color||'#2f6f4e'}"></div><div><label>Points</label><input value="${(bench.pointsPx||[]).length}" disabled></div></div>
      <label style="display:flex;align-items:center;gap:6px;margin-top:6px"><input id="benchLocked" type="checkbox" ${bench.locked?'checked':''}> Locked</label>
      <label>Notes</label><textarea id="benchNotes" rows="3">${escapeHtml(bench.notes||'')}</textarea>
      <div class="buttons" style="margin-top:8px"><button id="clearBenchCurves">Clear Curves</button><button id="deleteBench" class="danger">Delete Benchwork</button></div>
      <div class="small muted" style="margin-top:8px">Hover an edge segment on the selected outline and drag to curve it. Anything beyond this boundary can be trimmed in future export stages.</div>`;
      const bindBench=(id,fn)=>{const el=$(id); if(el) el.oninput=()=>{fn(el.type==='checkbox'?el.checked:el.value); syncAll();};};
      bindBench('benchName',v=>bench.name=v); bindBench('benchColor',v=>bench.color=v); bindBench('benchLocked',v=>bench.locked=!!v); bindBench('benchNotes',v=>bench.notes=v);
      $('clearBenchCurves').onclick=()=>{bench.curvesPx=(bench.pointsPx||[]).map(()=>null); syncAll();};
      $('deleteBench').onclick=deleteSelectedBenchwork;
      return;
    } if(light){normalizeStreetlight(light); box.innerHTML=`
      <b>${light.mode==='anchored'?'Anchored Streetlight':'Streetlight'} selected</b>
      <label>Name</label><input id="slName" value="${escapeAttr(light.name||'')}">
      <div class="row"><div><label>Type</label><select id="slType"><option value="singleArm">Single arm</option><option value="doubleArm">Double arm</option><option value="poleOnly">Pole only</option></select></div><div><label>Color</label><input id="slColor" type="color" value="${light.color||'#c84a3a'}"></div></div>
      <div class="row"><div><label>Height mm</label><input id="slHeight" type="number" step="0.1" value="${fmt(light.heightMm)}"></div><div><label>Arm mm</label><input id="slArm" type="number" step="0.1" value="${fmt(light.armLengthMm)}"></div></div>
      <div class="row"><div><label>Rotation °</label><input id="slRot" type="number" step="1" value="${fmt(light.rotationDeg||0)}"></div><div><label>Light radius mm</label><input id="slRadius" type="number" step="0.1" value="${fmt(light.lightRadiusMm)}"></div></div>
      ${light.mode==='anchored'?`<h3 style="margin-top:10px">Anchor / future export</h3>
      <label>Mount mode</label><select id="slMount"><option value="sidewalkCutHole">Sidewalk cut-through hole</option><option value="roadEdgeBulbMount">Street-edge bulb mount</option><option value="auto">Auto-detect later</option></select>
      <div class="row"><div><label>Cut hole Ø mm</label><input id="slCutDia" type="number" step="0.1" value="${fmt(light.anchor.cutHoleDiameterMm)}"></div><div><label>Bulb Ø mm</label><input id="slBulbDia" type="number" step="0.1" value="${fmt(light.anchor.bulbMountDiameterMm)}"></div></div>
      <div class="row"><div><label>Edge offset mm</label><input id="slEdgeOffset" type="number" step="0.1" value="${fmt(light.anchor.edgeOffsetMm)}"></div><div><label>Sidewalk side</label><select id="slSide"><option value="auto">Auto</option><option value="left">Left</option><option value="right">Right</option></select></div></div>
      <label style="display:flex;align-items:center;gap:6px;margin-top:6px"><input id="slLockEdge" type="checkbox" ${light.anchor.lockToRoadEdge?'checked':''}> Lock to road edge when road geometry is available</label>
      <div class="small muted" style="margin-top:6px">Sidewalk mode is intended to export as a through-hole in the sidewalk layer. Street-edge mode stores a bulb mount for roads without sidewalks.</div>`:''}
      <label>Notes</label><textarea id="slNotes" rows="3">${escapeHtml(light.notes||'')}</textarea>
      <div class="buttons" style="margin-top:8px"><button id="dupSl">Duplicate</button><button id="lockSl">${light.locked?'Unlock':'Lock'}</button><button id="delSl" class="danger">Delete</button></div>`;
      const bind=(id,fn)=>{const e=$(id); if(e)e.oninput=()=>{fn(e.type==='checkbox'?e.checked:e.value); syncAll();};};
      bind('slName',v=>light.name=v); bind('slColor',v=>light.color=v); bind('slHeight',v=>light.heightMm=parseFloat(v)||0); bind('slArm',v=>light.armLengthMm=parseFloat(v)||0); bind('slRot',v=>light.rotationDeg=parseFloat(v)||0); bind('slRadius',v=>light.lightRadiusMm=parseFloat(v)||0); bind('slNotes',v=>light.notes=v);
      const slType=$('slType'); if(slType){slType.value=light.type; slType.onchange=e=>{light.type=e.target.value; syncAll();};}
      const slMount=$('slMount'); if(slMount){slMount.value=light.anchor.mountMode; slMount.onchange=e=>{light.anchor.mountMode=e.target.value; syncAll();};}
      const slSide=$('slSide'); if(slSide){slSide.value=light.anchor.sidewalkSide; slSide.onchange=e=>{light.anchor.sidewalkSide=e.target.value; syncAll();};}
      bind('slCutDia',v=>light.anchor.cutHoleDiameterMm=parseFloat(v)||0); bind('slBulbDia',v=>light.anchor.bulbMountDiameterMm=parseFloat(v)||0); bind('slEdgeOffset',v=>light.anchor.edgeOffsetMm=parseFloat(v)||0); bind('slLockEdge',v=>light.anchor.lockToRoadEdge=!!v);
      $('dupSl').onclick=()=>{duplicateStreetlight(light); syncAll();}; $('lockSl').onclick=()=>{light.locked=!light.locked; syncAll();}; $('delSl').onclick=deleteSelectedStreetlight;
    } else if(note){const pts=note.points||[]; box.innerHTML=`<b>Annotation selected</b><br><span class="small muted">${pts.length} points</span><div class="buttons" style="margin-top:8px"><button id="delNoteB" class="danger">Delete Annotation</button></div>`; const del=$('delNoteB'); if(del) del.onclick=deleteSelectedAnnotation;} else box.innerHTML='No building selected.'; const btn=$('deleteAnnotationBtn'); if(btn) btn.disabled=!note; return;} if($('deleteAnnotationBtn')) $('deleteAnnotationBtn').disabled=true; syncBuildingMetrics(b); box.innerHTML=`
    <label>Name</label><input id="selName" value="${escapeAttr(b.name||'')}">
    <div class="row"><div><label>Status</label><select id="selState"><option value="notStarted">Not Started</option><option value="inProgress">In Progress</option><option value="awaitingConstruction">Awaiting Construction</option><option value="complete">Complete</option></select></div><div><label>Color</label><input id="selColor" type="color" value="${b.color||'#d79631'}"></div></div>
    <div class="row"><div><label>Category</label><input id="selCat" value="${escapeAttr(b.category||'industrial')}"></div><div><label>Type</label><input value="${b.padType}" disabled></div></div>
    <div class="row"><div><label>Rotation °</label><input id="selRot" type="number" step="0.1" value="${fmt(b.rotationDeg||0)}"></div><div><label>Stored file</label><input value="${b.hakoFile?'.hako attached':'none'}" disabled></div></div>
    ${b.padType==='rect'?`<div class="row"><div><label>Width mm</label><input id="selW" type="number" step="0.1" value="${fmt(b.widthMm)}"></div><div><label>Depth mm</label><input id="selD" type="number" step="0.1" value="${fmt(b.depthMm)}"></div></div>`:`<div class="small"><span class="pill">Area ${fmt(b.derived?.areaMm2||0)} mm²</span><span class="pill">Bounds ${fmt(b.derived?.boundingWidthMm||0)}×${fmt(b.derived?.boundingDepthMm||0)} mm</span></div>`}
    <div class="row"><div><label>3D height mm</label><input id="sel3dHeight" type="number" min="0.1" step="0.1" value="${fmt(site3DBuildingHeightMm(b,site3DBuildingConfig(b)))}"></div><div><label>Base elevation mm</label><input id="sel3dElevation" type="number" step="0.1" value="${fmt(site3DBuildingElevationMm(b))}"></div></div>
    <div class="buttons" style="margin:10px 0 8px"><button id="openSelectedHakoB" class="ok">Open in HakoMachi</button><button id="copySeedB">Copy HakoSeed</button></div>
    <div class="small muted" style="margin:-2px 0 8px">Creates a HakoSeed payload for this building and opens <code>building-generator.html#sitePlannerSeed</code>.</div>
    <label>Completed .hako file</label>
    <div class="codebox" style="margin:4px 0 6px;white-space:normal">${hakoFileSummary(b)}</div>
    <input id="hakoFileInput" type="file" accept=".hako,.json,application/json" style="display:none">
    <div class="buttons" style="margin-bottom:8px"><button id="uploadHakoB">${b.hakoFile?'Replace .hako':'Upload .hako'}</button><button id="downloadHakoB" ${b.hakoFile?'':'disabled'}>Download .hako</button><button id="removeHakoB" class="danger" ${b.hakoFile?'':'disabled'}>Remove .hako</button></div>
    <label>Notes</label><textarea id="selNotes" rows="3">${escapeHtml(b.notes||'')}</textarea>
    <div class="buttons" style="margin-top:8px"><button id="copyB">Copy</button><button id="pasteB" ${state.footprintClipboard?'':'disabled'}>Paste</button><button id="dupB">Duplicate</button><button id="hideB">${b.hidden?'Show':'Hide'}</button><button id="lockB">${b.locked?'Unlock':'Lock'}</button>${b.padType==='rect'?'<button id="polyB">Convert to Polygon</button>':''}<button id="delB" class="danger">Delete</button></div>`;
    const bind=(id,fn)=>{const e=$(id); if(e)e.oninput=()=>{fn(e.value); syncAll();};};
    bind('selName',v=>b.name=v); bind('selCat',v=>b.category=v); bind('selColor',v=>b.color=v); bind('selRot',v=>b.rotationDeg=parseFloat(v)||0); bind('sel3dHeight',v=>b.plannerHeightMm=Math.max(.1,parseFloat(v)||.1)); bind('sel3dElevation',v=>b.baseElevationMm=parseFloat(v)||0); bind('selNotes',v=>b.notes=v);
    const stateSel=$('selState'); if(stateSel){stateSel.value=b.state||'notStarted'; stateSel.onchange=e=>{b.state=e.target.value; syncAll();};}
    bind('selW',v=>{if(state.pxPerMm)b.widthPx=mmToPx(Math.max(.1,parseFloat(v)||1));}); bind('selD',v=>{if(state.pxPerMm)b.depthPx=mmToPx(Math.max(.1,parseFloat(v)||1));});
    const hakoInput=$('hakoFileInput');
    if($('uploadHakoB')) $('uploadHakoB').onclick=()=>hakoInput && hakoInput.click();
    if(hakoInput) hakoInput.onchange=e=>{const f=e.target.files&&e.target.files[0]; if(!f)return; const reader=new FileReader(); reader.onerror=()=>alert('Could not read that .hako file.'); reader.onload=ev=>{const text=String(ev.target.result||''); let parsed=null; try{parsed=JSON.parse(text);}catch(_err){} b.hakoFile={fileName:f.name||`${slug(b.name)}.hako`,mimeType:f.type||'application/json',sizeBytes:f.size||text.length,importedAt:new Date().toISOString(),dataText:text,parsedConfig:parsed}; b.hakoFileId=b.hakoFile.fileName; if(parsed) b.hakoConfig=parsed; if(b.state==='notStarted') b.state='inProgress'; syncAll();}; reader.readAsText(f); e.target.value='';};
    if($('downloadHakoB')) $('downloadHakoB').onclick=()=>{if(!b.hakoFile)return; download(b.hakoFile.dataText||JSON.stringify(b.hakoFile.parsedConfig||b.hakoConfig||{},null,2), b.hakoFile.fileName||`${slug(b.name)}.hako`, b.hakoFile.mimeType||'application/json');};
    if($('removeHakoB')) $('removeHakoB').onclick=()=>{if(!b.hakoFile)return; if(!confirm('Remove the stored .hako file from this building?')) return; b.hakoFile=null; b.hakoFileId=null; syncAll();};
    if($('openSelectedHakoB')) $('openSelectedHakoB').onclick=()=>openBuildingInHakoMachi(b);
    if($('copySeedB')) $('copySeedB').onclick=()=>copyHakoSeedForBuilding(b);
    if($('copyB')) $('copyB').onclick=()=>{copySelectedFootprint(); renderSelected();};
    if($('pasteB')) $('pasteB').onclick=()=>pasteFootprintFromClipboard();
    $('dupB').onclick=()=>duplicateBuildingFootprint(b);
    $('hideB').onclick=()=>{b.hidden=!b.hidden; syncAll();}; $('lockB').onclick=()=>{b.locked=!b.locked; syncAll();}; $('delB').onclick=()=>{state.buildings=state.buildings.filter(x=>x.id!==b.id); state.selectedId=null; syncAll();};
    const poly=$('polyB'); if(poly) poly.onclick=()=>{b.padType='polygon'; b.pointsPx=transformedRect(b); delete b.widthPx; delete b.depthPx; syncAll();};
  }

  function activeSidebarDetailKind(){
    if(currentSelectedBuildingIds().length>1) return 'buildings';
    if(state.selectedId) return 'building';
    if(state.selectedBenchworkId) return 'benchwork';
    if(state.selectedRoadId) return 'road';
    if(state.selectedRoadFeatureId) return 'roadFeature';
    if(state.selectedStreetlightId) return 'streetlight';
    if(state.selectedAnnotationId) return 'annotation';
    return null;
  }
  function activeSidebarDetailTitle(kind){
    if(kind==='buildings') return 'Buildings';
    if(kind==='building') return 'Building';
    if(kind==='benchwork') return 'Benchwork';
    if(kind==='road') return 'Road';
    if(kind==='roadFeature') return 'Road Item';
    if(kind==='streetlight') return 'Streetlight';
    if(kind==='annotation') return 'Annotation';
    return 'Selected';
  }
  function clearSidebarDetailSelection(){
    clearBuildingSelection();
    state.selectedRoadId=null;
    state.selectedRoadFeatureId=null;
    state.selectedBenchworkId=null;
    state.selectedStreetlightId=null;
    state.selectedAnnotationId=null;
    hideContextMenu();
    renderList();
    renderRoads();
    renderStreetlights();
    renderSelected();
    updateHandoff();
    draw();
  }
  function applySidebarDrillIn(){
    const sidebar=document.querySelector('.sidebar');
    if(!sidebar) return;
    const sections=[...sidebar.querySelectorAll(':scope > .section')];
    let detailSection=sections.find(sec=>sec.dataset.detailPanel==='true');
    if(!detailSection){
      detailSection=sections.find(sec=>{
        const h=sec.querySelector('h3');
        return h && h.textContent.trim()==='Selected Building';
      });
      if(detailSection) detailSection.dataset.detailPanel='true';
    }
    if(!detailSection) return;
    const kind=activeSidebarDetailKind();
    const h3=detailSection.querySelector('h3');
    const existingBacks=[...sidebar.querySelectorAll('#sidebarBackBtn, .sidebarBackBtn')];
    let back=existingBacks[0] || null;
    existingBacks.slice(1).forEach(btn=>btn.remove());
    if(kind){
      sections.forEach(sec=>{ sec.style.display = (sec===detailSection) ? '' : 'none'; });
      detailSection.classList.add('detailMode');
      if(h3) h3.textContent=activeSidebarDetailTitle(kind);
      if(!back){
        back=document.createElement('button');
        back.id='sidebarBackBtn';
        back.type='button';
        back.textContent='Back';
        back.className='sidebarBackBtn';
      }
      back.onclick=clearSidebarDetailSelection;
      back.textContent='Back';
      back.className='sidebarBackBtn';
      if(back.parentElement!==sidebar || back.nextElementSibling!==detailSection){
        sidebar.insertBefore(back, detailSection);
      }
      back.style.display='inline-flex';
      if(window.matchMedia && window.matchMedia('(max-width:900px)').matches && !state.sidebarOpen){
        setSidebarOpen(true);
      }
    } else {
      sections.forEach(sec=>{ sec.style.display=''; });
      detailSection.style.display='none';
      detailSection.classList.remove('detailMode');
      if(h3) h3.textContent='Selected Building';
      if(back) back.remove();
    }
  }
  function renderSelected(){
    renderSelectedCore();
    applySidebarDrillIn();
  }

  function updateHandoff(){const b=selected(); $('handoffPreview').textContent=b? JSON.stringify(makeSeed(b),null,2):'';}
  function makeSeed(b){normalizeBuilding(b); syncBuildingMetrics(b); if(b.hakoSeed){const seed=structuredClone(b.hakoSeed); seed.buildingId=b.id; seed.name=b.name; seed.state=b.state||'notStarted'; seed.hakoFileId=b.hakoFileId||null; seed.units='mm'; seed.hakoUnits='model_mm'; return seed;} const seed={source:'HakoMachi Site Planner',version:1,buildingId:b.id,name:b.name,padType:b.padType,category:b.category,state:b.state||'notStarted',hakoFileId:b.hakoFileId||null,rotationDeg:b.rotationDeg||0,notes:b.notes||'',units:'mm',hakoUnits:'model_mm'}; if(b.padType==='rect'){Object.assign(seed,{widthMm:b.widthMm,depthMm:b.depthMm,footprint:{type:'rect',widthMm:b.widthMm,depthMm:b.depthMm,rotationDeg:b.rotationDeg||0}});} else {const xs=b.pointsMm.map(p=>p.x),ys=b.pointsMm.map(p=>p.y); Object.assign(seed,{footprint:{type:'polygon',pointsMm:b.pointsMm},boundingRectMm:{widthMm:Math.max(...xs)-Math.min(...xs),depthMm:Math.max(...ys)-Math.min(...ys)},warning:'Polygon footprints should be refined with HakoMachi shape editor/cut lines if arbitrary polygon cores are not yet supported.'});} seed.fabricHints=b.fabricHints||undefined; seed.styleHints=b.styleHints||undefined; seed.linkedHakoConfig=b.hakoConfig||null; return seed;}
  function isNearSquare(w,h){const m=Math.max(w,h); return m>0 && Math.abs(w-h)/m<0.06;}
  function signedSquareCorner(start,end){const dx=end.x-start.x, dy=end.y-start.y; const side=Math.max(Math.abs(dx),Math.abs(dy),4); return {x:start.x+(dx<0?-side:side), y:start.y+(dy<0?-side:side)};}
  function addRectFromDrag(start,end,shift){
    let p2=end;
    let w=Math.abs(p2.x-start.x), h=Math.abs(p2.y-start.y);
    if(shift || isNearSquare(w,h)){p2=signedSquareCorner(start,end); w=Math.abs(p2.x-start.x); h=Math.abs(p2.y-start.y);}
    const b={id:uid('bldg'),name:`Building ${state.buildings.length+1}`,padType:'rect',x:(start.x+p2.x)/2,y:(start.y+p2.y)/2,widthPx:Math.max(4,w),depthPx:Math.max(4,h),rotationDeg:0,category:'industrial',color:colors[state.buildings.length%colors.length],hidden:false,locked:false,state:'notStarted',notes:'',hakoConfig:null,hakoFile:null,hakoFileId:null};
    syncBuildingMetrics(b); return b;
  }
  function resizeRectFromCorner(b, orig, cornerIndex, worldPoint, square){
    const pts=transformedRect(orig);
    const anchor=pts[(cornerIndex+2)%4];
    const a=rad(orig.rotationDeg||0), ux={x:Math.cos(a),y:Math.sin(a)}, uy={x:-Math.sin(a),y:Math.cos(a)};
    const sx=[-1,1,1,-1][cornerIndex], sy=[-1,-1,1,1][cornerIndex];
    const dx=worldPoint.x-anchor.x, dy=worldPoint.y-anchor.y;
    let w=Math.max(4, sx*(dx*ux.x+dy*ux.y));
    let h=Math.max(4, sy*(dx*uy.x+dy*uy.y));
    if(square || isNearSquare(w,h)){const side=Math.max(w,h); w=side; h=side;}
    const center={x:anchor.x + sx*ux.x*w/2 + sy*uy.x*h/2, y:anchor.y + sx*ux.y*w/2 + sy*uy.y*h/2};
    b.x=center.x; b.y=center.y; b.widthPx=w; b.depthPx=h; b.rotationDeg=orig.rotationDeg||0; syncBuildingMetrics(b);
  }
  function snapAngle(a){const snaps=[-180,-165,-150,-135,-120,-105,-90,-75,-60,-45,-30,-15,0,15,30,45,60,75,90,105,120,135,150,165,180]; return snaps.reduce((best,x)=>Math.abs(x-a)<Math.abs(best-a)?x:best,0);}
  function snapAngleStep(a, step=45){
    const n=((a%360)+360)%360;
    let snapped=Math.round(n/step)*step;
    if(snapped>180) snapped-=360;
    if(snapped===180 && a<0) snapped=-180;
    return snapped;
  }
  function rotationSnapAngle(a,e){
    if(e && e.shiftKey) return snapAngleStep(a,45);
    if(state.snapOn) return snapAngle(a);
    return a;
  }
  function snapActive(e){return !!(state.snapOn || (e && e.shiftKey));}
  function isGeometryPointer(e){
    if(state.inputMode==='penDrawFingerPan') return e.pointerType!=='touch';
    if(state.inputMode==='penOnly') return e.pointerType==='pen' || e.pointerType==='mouse';
    if(state.inputMode==='touchDraw') return true;
    if(state.inputMode==='mouseTrackpad') return e.pointerType==='mouse';
    return true;
  }
  function startPanFromPointer(e){state.drag={type:'pan',pointerId:e.pointerId,sx:e.clientX,sy:e.clientY,vx:state.view.x,vy:state.view.y};}
  function pointerSnapshot(e){return {id:e.pointerId,x:e.clientX,y:e.clientY,type:e.pointerType};}
  function activeTouchPointers(){return [...state.pointers.values()].filter(p=>p.type==='touch');}
  function startPinchIfNeeded(){
    const touches=activeTouchPointers();
    if(touches.length<2) return false;
    const a=touches[0], b=touches[1];
    const cx=(a.x+b.x)/2, cy=(a.y+b.y)/2;
    const r=canvas.getBoundingClientRect();
    const world={x:(cx-r.left-state.view.x)/state.view.scale,y:(cy-r.top-state.view.y)/state.view.scale};
    state.pinch={ids:[a.id,b.id],startDist:Math.hypot(a.x-b.x,a.y-b.y),startScale:state.view.scale,startView:{...state.view},center:{x:cx,y:cy},world};
    state.drag={type:'pinch'};
    return true;
  }
  function updatePinch(){
    if(!state.pinch) return false;
    const a=state.pointers.get(state.pinch.ids[0]), b=state.pointers.get(state.pinch.ids[1]);
    if(!a||!b) return false;
    const cx=(a.x+b.x)/2, cy=(a.y+b.y)/2;
    const d=Math.max(1,Math.hypot(a.x-b.x,a.y-b.y));
    state.view.scale=clamp(state.pinch.startScale*(d/Math.max(1,state.pinch.startDist)),.05,20);
    const r=canvas.getBoundingClientRect();
    state.view.x=(cx-r.left)-state.pinch.world.x*state.view.scale;
    state.view.y=(cy-r.top)-state.pinch.world.y*state.view.scale;
    return true;
  }

  function hasActivePointDraft(){
    return (state.roadDraft && state.roadDraft.length) || (state.benchworkDraft && state.benchworkDraft.length) || (state.polygonDraft && state.polygonDraft.length);
  }
  function startExistingObjectInteraction(e,p){
    if(hasActivePointDraft()) return false;
    beginLongPress(e,p);
    const roadFeatureHit=hitRoadFeature(p,e.pointerType);
    if(roadFeatureHit){
      state.selectedRoadFeatureId=roadFeatureHit.id;
      state.selectedRoadId=null; state.selectedBenchworkId=null; state.selectedStreetlightId=null; clearBuildingSelection(); state.selectedAnnotationId=null;
      renderList(); renderRoads(); renderStreetlights(); renderSelected(); updateHandoff(); draw();
      if(!roadFeatureHit.locked) state.drag={type:'moveRoadFeature',pointerId:e.pointerId,start:p,orig:structuredClone(roadFeatureHit)};
      return true;
    }
    const lightHit=hitStreetlight(p,e.pointerType);
    if(lightHit){
      state.selectedStreetlightId=lightHit.id;
      state.selectedRoadId=null; state.selectedBenchworkId=null; clearBuildingSelection(); state.selectedAnnotationId=null;
      renderList(); renderRoads(); renderStreetlights(); renderSelected(); updateHandoff(); draw();
      if(!lightHit.locked) state.drag={type:'moveStreetlight',pointerId:e.pointerId,start:p,orig:structuredClone(lightHit)};
      return true;
    }
    const srForRoadEdit=state.selectedRoadId ? selectedRoad() : null;
    const roadOutlineEditing=srForRoadEdit && srForRoadEdit.mode==='outline' && state.roadOutlineEditId===srForRoadEdit.id;
    const roadPointHit=srForRoadEdit && (srForRoadEdit.mode!=='outline' || roadOutlineEditing) ? hitRoadPoint(p, srForRoadEdit, e.pointerType) : null;
    if(roadPointHit){ const r=srForRoadEdit; if(r&&!r.locked){ state.drag={type:'roadPoint',pointerId:e.pointerId,start:p,orig:structuredClone(r),pointIndex:roadPointHit.index}; } return true; }
    const roadCurveHit=srForRoadEdit ? (srForRoadEdit.mode==='outline' ? (roadOutlineEditing ? hitRoadOutlineSegment(p, srForRoadEdit, e.pointerType) : null) : hitRoadCenterlineSegment(p, srForRoadEdit, e.pointerType)) : null;
    if(roadCurveHit){ const r=srForRoadEdit; if(r&&!r.locked){ state.drag={type:'roadCurve',pointerId:e.pointerId,start:p,orig:structuredClone(r),segmentIndex:roadCurveHit.index}; } return true; }
    const roadHit=hitRoad(p,e.pointerType);
    if(roadHit){
      state.selectedRoadId=roadHit.id;
      if(roadHit.mode!=='outline') state.roadOutlineEditId=null;
      clearBuildingSelection(); state.selectedStreetlightId=null; state.selectedBenchworkId=null; state.selectedAnnotationId=null;
      renderRoads(); renderList(); renderStreetlights(); renderSelected(); draw();
      if(!roadHit.locked) state.drag={type:'moveRoad',pointerId:e.pointerId,start:p,orig:structuredClone(roadHit)};
      return true;
    }
    const benchCurveHit=state.selectedBenchworkId ? hitBenchworkSegment(p, selectedBenchwork(), e.pointerType) : null;
    if(benchCurveHit){ const bw=selectedBenchwork(); if(bw&&!bw.locked){ state.drag={type:'benchworkCurve',pointerId:e.pointerId,start:p,orig:structuredClone(bw),segmentIndex:benchCurveHit.index}; } return true; }
    const benchHit=hitBenchwork(p,e.pointerType);
    if(benchHit){
      clearBuildingSelection(); state.selectedRoadId=null; state.selectedStreetlightId=null; state.selectedAnnotationId=null; state.selectedBenchworkId=benchHit.id;
      renderList(); renderRoads(); renderStreetlights(); renderSelected(); draw();
      if(!benchHit.locked) state.drag={type:'moveBenchwork',pointerId:e.pointerId,start:p,orig:structuredClone(benchHit)};
      return true;
    }
    const note=hitAnnotation(p,e.pointerType);
    if(note){
      state.selectedAnnotationId=note.id;
      state.selectedId=null; state.selectedStreetlightId=null; state.selectedRoadId=null; state.selectedBenchworkId=null;
      renderList(); renderSelected(); updateHandoff(); draw();
      return true;
    }
    const b=selected();
    const h=handleAt(p,b,e.pointerType);
    if(h){
      const drag={type:h.type,pointerId:e.pointerId,index:h.index,start:p,orig:structuredClone(b)};
      if(h.type==='rotate'){
        drag.center=buildingCenter(b);
        drag.startAngle=Math.atan2(p.y-drag.center.y,p.x-drag.center.x);
        drag.origRotation=Number(b.rotationDeg)||0;
      }
      state.drag=drag;
      return true;
    }
    const hit=hitTest(p,e.pointerType);
    if(hit){
      state.selectedRoadId=null; state.selectedBenchworkId=null; state.selectedStreetlightId=null; state.selectedAnnotationId=null;
      if(e.shiftKey || e.metaKey || e.ctrlKey){ toggleBuildingSelection(hit.id); renderList(); renderSelected(); updateHandoff(); draw(); return true; }
      const already=isBuildingSelected(hit.id);
      if(!already) setBuildingSelection([hit.id], hit.id);
      renderList(); renderSelected(); updateHandoff();
      const ids=currentSelectedBuildingIds();
      const origs=ids.map(id=>state.buildings.find(x=>x.id===id)).filter(Boolean).map(x=>structuredClone(x));
      state.drag={type:ids.length>1?'moveMany':'move',pointerId:e.pointerId,start:p,orig:structuredClone(hit),origs};
      draw();
      return true;
    }
    return false;
  }

  canvas.addEventListener('pointerdown', e=>{
    e.preventDefault(); hideContextMenu();
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
    if(state.tool==='pan' || !isGeometryPointer(e)){startPanFromPointer(e); return;}
    if(state.tool==='road' && (state.roadMode==='manhole' || state.roadMode==='marking')){
      const featureHit=hitRoadFeature(p,e.pointerType);
      if(featureHit){state.selectedRoadFeatureId=featureHit.id; state.selectedRoadId=null; clearBuildingSelection(); state.selectedStreetlightId=null; state.selectedBenchworkId=null; state.selectedAnnotationId=null; renderSelected(); draw(); if(!featureHit.locked) state.drag={type:'moveRoadFeature',pointerId:e.pointerId,start:p,orig:structuredClone(featureHit)}; return;}
      if(placeRoadFeature(p,state.roadMode==='manhole'?'manhole':'marking')) return;
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
      const lightHit=hitStreetlight(p,e.pointerType);
      if(lightHit){state.selectedStreetlightId=lightHit.id; state.selectedRoadId=null; clearBuildingSelection(); state.selectedAnnotationId=null; renderList(); renderRoads(); renderStreetlights(); renderSelected(); updateHandoff(); draw(); if(!lightHit.locked) state.drag={type:'moveStreetlight',pointerId:e.pointerId,start:p,orig:structuredClone(lightHit)}; return;}
      const benchCurveHit=state.selectedBenchworkId ? hitBenchworkSegment(p, selectedBenchwork(), e.pointerType) : null;
      if(benchCurveHit){ const bw=selectedBenchwork(); if(bw&&!bw.locked){ state.drag={type:'benchworkCurve',pointerId:e.pointerId,start:p,orig:structuredClone(bw),segmentIndex:benchCurveHit.index}; return; } }
      const benchHit=hitBenchwork(p,e.pointerType);
      if(benchHit){clearBuildingSelection(); state.selectedRoadId=null; state.selectedStreetlightId=null; state.selectedAnnotationId=null; state.selectedBenchworkId=benchHit.id; renderList(); renderRoads(); renderStreetlights(); renderSelected(); draw(); if(!benchHit.locked) state.drag={type:'moveBenchwork',pointerId:e.pointerId,start:p,orig:structuredClone(benchHit)}; return;}
      const selectRoadForEdit=state.selectedRoadId ? selectedRoad() : null;
      const selectOutlineEditing=selectRoadForEdit && selectRoadForEdit.mode==='outline' && state.roadOutlineEditId===selectRoadForEdit.id;
      const roadPointHit=selectRoadForEdit && (selectRoadForEdit.mode!=='outline' || selectOutlineEditing) ? hitRoadPoint(p, selectRoadForEdit, e.pointerType) : null;
      if(roadPointHit){ const r=selectRoadForEdit; if(r&&!r.locked){ state.drag={type:'roadPoint',pointerId:e.pointerId,start:p,orig:structuredClone(r),pointIndex:roadPointHit.index}; return; } }
      const roadCurveHit=selectRoadForEdit ? (selectRoadForEdit.mode==='outline' ? (selectOutlineEditing ? hitRoadOutlineSegment(p, selectRoadForEdit, e.pointerType) : null) : hitRoadCenterlineSegment(p, selectRoadForEdit, e.pointerType)) : null;
      if(roadCurveHit){ const r=selectRoadForEdit; if(r&&!r.locked){ state.drag={type:'roadCurve',pointerId:e.pointerId,start:p,orig:structuredClone(r),segmentIndex:roadCurveHit.index}; return; } }
      const roadHit=hitRoad(p,e.pointerType);
      if(roadHit){state.selectedRoadId=roadHit.id; if(roadHit.mode!=='outline') state.roadOutlineEditId=null; clearBuildingSelection(); state.selectedStreetlightId=null; state.selectedBenchworkId=null; state.selectedAnnotationId=null; renderRoads(); renderList(); renderStreetlights(); renderSelected(); draw(); if(!roadHit.locked) state.drag={type:'moveRoad',pointerId:e.pointerId,start:p,orig:structuredClone(roadHit)}; return;}
      const note=hitAnnotation(p,e.pointerType);
      if(note){
        state.selectedAnnotationId=note.id;
        state.selectedId=null; state.selectedStreetlightId=null;
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
        if(e.shiftKey || e.metaKey || e.ctrlKey){ toggleBuildingSelection(hit.id); renderList(); renderSelected(); updateHandoff(); draw(); return; }
        const already=isBuildingSelected(hit.id);
        if(!already) setBuildingSelection([hit.id], hit.id);
        else { state.selectedRoadId=null; state.selectedBenchworkId=null; state.selectedStreetlightId=null; state.selectedBenchworkId=null; state.selectedAnnotationId=null; }
        renderList(); renderSelected(); updateHandoff();
        const ids=currentSelectedBuildingIds();
        const origs=ids.map(id=>state.buildings.find(x=>x.id===id)).filter(Boolean).map(x=>structuredClone(x));
        state.drag={type:ids.length>1?'moveMany':'move',pointerId:e.pointerId,start:p,orig:structuredClone(hit),origs};
      }
      else {
        state.drag={type:'marquee',pointerId:e.pointerId,start:p,end:p,additive:!!(e.shiftKey||e.metaKey||e.ctrlKey),baseIds:currentSelectedBuildingIds()};
      }
      draw();
    }
  }, {passive:false});
  canvas.addEventListener('pointermove', e=>{
    if(state.pointers.has(e.pointerId)) state.pointers.set(e.pointerId,pointerSnapshot(e));
    moveCancelsLongPress(e);
    const p=screenToWorld(e); $('statusMouse').textContent=state.pxPerMm?`Pointer: ${fmt(pxToMm(p.x))}, ${fmt(pxToMm(p.y))} mm (${e.pointerType})`:`Pointer: ${fmt(p.x)}, ${fmt(p.y)} px (${e.pointerType})`;
    if(state.drag?.type==='pinch'){e.preventDefault(); updatePinch(); draw(); return;}
    if(!state.drag){
      const hoverL=hitStreetlight(p,e.pointerType);
      state.hoverStreetlightId=hoverL ? hoverL.id : null;
      const hoverSelectedRoad=(state.selectedRoadId && !hoverL) ? selectedRoad() : null;
      const hoverCurve=hoverSelectedRoad ? (hoverSelectedRoad.mode==='outline' ? (state.roadOutlineEditId===hoverSelectedRoad.id ? hitRoadOutlineSegment(p, hoverSelectedRoad, e.pointerType) : null) : hitRoadCenterlineSegment(p, hoverSelectedRoad, e.pointerType)) : null;
      state.hoverRoadSegment=hoverCurve?{roadId:state.selectedRoadId,index:hoverCurve.index}:null;
      const hoverBenchCurve=(state.selectedBenchworkId && !hoverL && !hoverCurve) ? hitBenchworkSegment(p, selectedBenchwork(), e.pointerType) : null;
      state.hoverBenchworkSegment=hoverBenchCurve?{benchworkId:state.selectedBenchworkId,index:hoverBenchCurve.index}:null;
      const hoverBW=(hoverL||hoverCurve||hoverBenchCurve) ? (hoverBenchCurve?selectedBenchwork():null) : hitBenchwork(p);
      state.hoverBenchworkId=hoverBW ? hoverBW.id : null;
      const hoverR=(hoverL||hoverBW) ? null : hitRoad(p);
      state.hoverRoadId=hoverR ? hoverR.id : (hoverCurve?state.selectedRoadId:null);
      const hoverB=(hoverL||hoverBW||hoverR) ? null : hitTest(p);
      state.hoverBuildingId=hoverB ? hoverB.id : null;
      if(e.pointerType==='pen' && e.buttons===0){
        const hb=selected()||hoverB, hh=hb?handleAt(p,hb,e.pointerType):null;
        state.hoverPreview={point:p,kind:hh?'handle':'cursor',label:hh?hh.type.replace(/([A-Z])/g,' $1'):'Pencil'};
      } else if(e.pointerType!=='pen') state.hoverPreview=null;
      draw(); return;
    }
    if(state.drag.pointerId!==undefined && state.drag.pointerId!==e.pointerId) return;
    e.preventDefault();
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
    else if(d.type==='moveStreetlight'){const l=state.streetlights.find(x=>x.id===d.orig.id); const dx=p.x-d.start.x,dy=p.y-d.start.y; if(l&&!l.locked){l.x=d.orig.x+dx; l.y=d.orig.y+dy;}}
    else if(d.type==='moveBenchwork'){const bw=state.benchworkOutlines.find(x=>x.id===d.orig.id); const dx=p.x-d.start.x,dy=p.y-d.start.y; if(bw&&!bw.locked){bw.pointsPx=d.orig.pointsPx.map(q=>({x:q.x+dx,y:q.y+dy})); bw.curvesPx=(d.orig.curvesPx||[]).map(c=>c?{x:c.x+dx,y:c.y+dy}:null); normalizeBenchworkOutline(bw);}}
    else if(d.type==='benchworkCurve'){const bw=state.benchworkOutlines.find(x=>x.id===d.orig.id); if(bw&&!bw.locked){normalizeBenchworkOutline(bw); const i=d.segmentIndex; const a=bw.pointsPx[i], b=bw.pointsPx[(i+1)%bw.pointsPx.length]; if(a&&b){bw.curvesPx[i]={x:2*p.x-(a.x+b.x)/2,y:2*p.y-(a.y+b.y)/2}; normalizeBenchworkOutline(bw);}}}
    else if(d.type==='moveRoad'){const r=state.roads.find(x=>x.id===d.orig.id); const dx=p.x-d.start.x,dy=p.y-d.start.y; if(r&&!r.locked){r.pointsPx=d.orig.pointsPx.map(q=>({x:q.x+dx,y:q.y+dy})); r.curvesPx=(d.orig.curvesPx||[]).map(c=>c?{x:c.x+dx,y:c.y+dy}:null); syncRoadMetrics(r);}}
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
        normalizeRoadCurves(r);
        const i=d.segmentIndex;
        const a=r.pointsPx[i], b=r.mode==='outline'?r.pointsPx[(i+1)%r.pointsPx.length]:r.pointsPx[i+1];
        if(a&&b){r.curvesPx[i]={x:2*p.x-(a.x+b.x)/2,y:2*p.y-(a.y+b.y)/2}; syncRoadMetrics(r);}
      }
    }
    else if(d.type==='marquee'){d.end=p;}
    else if(d.type==='moveMany'){const dx=p.x-d.start.x,dy=p.y-d.start.y; (d.origs||[]).forEach(orig=>{const b=state.buildings.find(x=>x.id===orig.id); if(b&&!b.locked){if(b.padType==='rect'){b.x=orig.x+dx; b.y=orig.y+dy;} else b.pointsPx=orig.pointsPx.map(q=>({x:q.x+dx,y:q.y+dy})); syncBuildingMetrics(b);}});}
    else if(d.type==='move'){const b=state.buildings.find(x=>x.id===d.orig.id); const dx=p.x-d.start.x,dy=p.y-d.start.y; if(b&&!b.locked){if(b.padType==='rect'){b.x=d.orig.x+dx; b.y=d.orig.y+dy;} else b.pointsPx=d.orig.pointsPx.map(q=>({x:q.x+dx,y:q.y+dy})); syncBuildingMetrics(b);}}
    else if(d.type==='polyPoint'){const b=selected(); if(b&&!b.locked){b.pointsPx[d.index]=p; syncBuildingMetrics(b);}}
    else if(d.type==='rectCorner'){const b=selected(), o=d.orig; if(b&&!b.locked){resizeRectFromCorner(b,o,d.index,p,snapActive(e));}}
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
    draw();
  }, {passive:false});
  function finishPointer(e){
    clearLongPress();
    state.pointers.delete(e.pointerId);
    if(state.drag?.type==='pinch'){state.pinch=null; state.drag=null; draw(); return;}
    if(!state.drag)return;
    if(state.drag.pointerId!==undefined && state.drag.pointerId!==e.pointerId) return;
    const d=state.drag;
    if(d.type==='rect'&&d.preview){state.buildings.push(d.preview); setBuildingSelection([d.preview.id], d.preview.id); renderList(); renderSelected(); updateHandoff();}
    if(d.type==='marquee'){const r=selectionRectFromPoints(d.start,d.end||d.start); if(Math.max(r.w,r.h)>5/state.view.scale){const hits=buildingsInSelectionRect(r); setBuildingSelection(d.additive?[...new Set([...(d.baseIds||[]),...hits])]:hits, hits.length===1?hits[0]:null);} else if(!d.additive){clearBuildingSelection(); state.selectedAnnotationId=null; state.selectedStreetlightId=null; state.selectedRoadId=null; state.selectedBenchworkId=null;} renderList(); renderSelected(); updateHandoff();}
    if(d.type==='roadCenterline'&&d.preview&&dist(d.start,d.end)>4){state.roads.push(d.preview); state.selectedRoadId=d.preview.id; clearBuildingSelection(); state.selectedStreetlightId=null; state.selectedBenchworkId=null; state.selectedAnnotationId=null; renderRoads(); renderSelected();}
    if(d.type==='pan' && d.rightButtonPan && d.moved){state.suppressNextContextMenu=true;}
    canvas.classList.remove('panning');
    state.drag=null; syncAll();
  }
  canvas.addEventListener('pointerup', finishPointer);
  canvas.addEventListener('pointercancel', finishPointer);
  canvas.addEventListener('dblclick', e=>{
    const p=screenToWorld(e);
    const road=hitRoad(p,'mouse');
    if(road && road.mode==='outline'){
      e.preventDefault();
      state.selectedRoadId=road.id;
      state.roadOutlineEditId=road.id;
      clearBuildingSelection(); state.selectedStreetlightId=null; state.selectedBenchworkId=null; state.selectedAnnotationId=null;
      renderRoads(); renderList(); renderStreetlights(); renderSelected(); draw();
      return;
    }
    if(state.tool==='road' && state.roadMode==='centerline' && state.roadDraft.length>=2){ e.preventDefault(); finishRoadCenterline(); }
    if(state.tool==='road' && state.roadMode==='outline' && state.roadDraft.length>=3){ e.preventDefault(); finishRoadOutline(); }
  });
  canvas.addEventListener('contextmenu', e=>{
    e.preventDefault();
    if(state.suppressNextContextMenu){state.suppressNextContextMenu=false; hideContextMenu(); return;}
    hideContextMenu();
    const p=screenToWorld(e); const target=contextTargetAt(p,'mouse');
    if(target?.streetlight){
      state.selectedStreetlightId=target.streetlight.id; clearBuildingSelection(); state.selectedAnnotationId=null;
      m.innerHTML=`<button data-action="duplicateStreetlight">Duplicate Streetlight</button><button data-action="lockStreetlight">${target.streetlight.locked?'Unlock':'Lock'} Streetlight</button><button data-action="deleteStreetlight" class="dangerItem">Delete Streetlight</button>`;
      m.querySelectorAll('button').forEach(btn=>btn.onclick=()=>handleContextAction(btn.dataset.action));
      m.style.display='block';
      const wrapRect=wrap.getBoundingClientRect(); const mw=m.offsetWidth||210, mh=m.offsetHeight||120;
      m.style.left=clamp(screenX-wrapRect.left,8,wrapRect.width-mw-8)+'px';
      m.style.top=clamp(screenY-wrapRect.top,8,wrapRect.height-mh-8)+'px';
      renderList(); renderStreetlights(); renderSelected(); draw();
      return;
    }
    if(target?.annotation){state.selectedAnnotationId=target.annotation.id; state.selectedId=null; renderList(); renderSelected(); updateHandoff(); showContextMenu(e.clientX,e.clientY,target); draw();}
    else if(target?.building){state.selectedId=target.building.id; state.selectedAnnotationId=null; renderList(); renderSelected(); updateHandoff(); showContextMenu(e.clientX,e.clientY,target); draw();}
  });
  canvas.addEventListener('wheel', e=>{e.preventDefault(); const r=canvas.getBoundingClientRect(); const mouse={x:e.clientX-r.left,y:e.clientY-r.top}; const before=screenToWorld(e); const factor=e.deltaY<0?1.1:.9; state.view.scale=clamp(state.view.scale*factor,.05,20); state.view.x=mouse.x-before.x*state.view.scale; state.view.y=mouse.y-before.y*state.view.scale; draw();},{passive:false});
  function deleteCurrentSelection(){
    if(state.selectedAnnotationId){ deleteSelectedAnnotation(); return true; }
    if(state.selectedRoadFeatureId){ deleteSelectedRoadFeature(); return true; }
    if(state.selectedStreetlightId){ deleteSelectedStreetlight(); return true; }
    if(state.selectedRoadId){ deleteSelectedRoad(); return true; }
    if(state.selectedBenchworkId){ deleteSelectedBenchwork(); return true; }
    const ids=currentSelectedBuildingIds();
    if(ids.length){
      state.buildings=state.buildings.filter(b=>!ids.includes(b.id));
      clearBuildingSelection();
      syncAll();
      return true;
    }
    return false;
  }
  window.addEventListener('keydown', e=>{
    const target=e.target;
    if(target && target.matches && target.matches('input,textarea,select,[contenteditable="true"]')) return;
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){
      e.preventDefault();
      if(e.shiftKey) redo(); else undo();
      return;
    }
    if((e.metaKey||e.ctrlKey)&&!e.shiftKey&&e.key.toLowerCase()==='y'){
      e.preventDefault();
      redo();
      return;
    }
    if((e.metaKey||e.ctrlKey)&&!e.shiftKey&&e.key.toLowerCase()==='c'){
      if(currentSelectedBuildingIds().length){e.preventDefault(); copySelectedFootprint(); renderSelected();}
      return;
    }
    if((e.metaKey||e.ctrlKey)&&!e.shiftKey&&e.key.toLowerCase()==='v'){
      if(state.footprintClipboard){e.preventDefault(); pasteFootprintFromClipboard();}
      return;
    }
    if(e.key==='Enter'&&state.tool==='polygon') finishPolygon();
    if(e.key==='Enter'&&state.tool==='benchwork') finishBenchworkOutline();
    if(e.key==='Enter'&&state.tool==='road'&&state.roadMode==='outline') finishRoadOutline();
    if(e.key==='Enter'&&state.tool==='road'&&state.roadMode==='centerline') finishRoadCenterline();
    if(e.key==='Backspace'&&state.tool==='polygon'&&state.polygonDraft.length){state.polygonDraft.pop(); draw(); return;}
    if(e.key==='Backspace'&&state.tool==='benchwork'&&state.benchworkDraft.length){state.benchworkDraft.pop(); draw(); return;}
    if(e.key==='Escape'){
      hideContextMenu();
      state.hoverPreview=null;
      state.selectedAnnotationId=null;
      if(state.roadOutlineEditId) state.roadOutlineEditId=null;
      renderSelected();
      draw();
      return;
    }
    if(e.key==='Delete'||e.key==='Backspace'){
      if(deleteCurrentSelection()) e.preventDefault();
    }
  });
  function finishPolygon(){if(state.polygonDraft.length<3) return; const b={id:uid('bldg'),name:`Building ${state.buildings.length+1}`,padType:'polygon',pointsPx:state.polygonDraft.slice(),rotationDeg:0,category:'industrial',color:colors[state.buildings.length%colors.length],hidden:false,locked:false,state:'notStarted',notes:'',hakoConfig:null,hakoFile:null,hakoFileId:null}; syncBuildingMetrics(b); state.buildings.push(b); setBuildingSelection([b.id], b.id); state.polygonDraft=[]; syncAll();}
  function maybeFinishActiveRoadDraft(nextTool){
    if(state.tool !== 'road' || nextTool === 'road' || !Array.isArray(state.roadDraft) || state.roadDraft.length === 0) return;
    if(state.roadMode === 'outline'){
      if(state.roadDraft.length >= 3) finishRoadOutline();
      else state.roadDraft = [];
    } else {
      if(state.roadDraft.length >= 2) finishRoadCenterline();
      else state.roadDraft = [];
    }
  }
  function setActiveTool(tool){
    maybeFinishActiveRoadDraft(tool);
    document.querySelectorAll('.toolbtn').forEach(b=>b.classList.toggle('active', b.dataset.tool===tool));
    state.tool=tool; state.drag=null; hideToolFlyouts(); syncAll();
  }
  document.querySelectorAll('.toolbtn').forEach(btn=>btn.onclick=()=>setActiveTool(btn.dataset.tool));
  function hideToolFlyouts(){document.querySelectorAll('.toolFlyout').forEach(m=>m.classList.remove('open'));}
  function positionToolFlyout(menu, anchor){
    if(!menu || !anchor) return;
    // Open as a fixed popover so it is not laid out under the canvas or clipped by the toolbar/canvas grid.
    menu.classList.add('open');
    menu.style.left='0px';
    menu.style.top='0px';
    const ar=anchor.getBoundingClientRect();
    const mr=menu.getBoundingClientRect();
    const gap=8;
    let left=ar.right + gap;
    let top=ar.top;
    // If there is not enough room to the right, open to the left of the toolbar button.
    if(left + mr.width > window.innerWidth - gap) left = Math.max(gap, ar.left - mr.width - gap);
    // Keep it vertically inside the viewport.
    top = clamp(top, gap, Math.max(gap, window.innerHeight - mr.height - gap));
    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
  }
  function toggleToolFlyout(menuId, anchor){
    const menu=$(menuId);
    if(!menu) return;
    const shouldOpen=!menu.classList.contains('open');
    hideToolFlyouts();
    if(shouldOpen) positionToolFlyout(menu, anchor);
  }

  let roadToolPressTimer=null;
  function updateRoadToolButton(){
    const btn=$('roadToolBtn'), icon=$('roadToolIcon'), label=$('roadToolLabel');
    const title=state.roadMode==='outline'?'Road Outline':state.roadMode==='manhole'?'Manhole / Hatch':state.roadMode==='marking'?'Road Marking':'Road Centerline';
    if(label) label.textContent=title;
    if(btn){btn.title=title; btn.setAttribute('aria-label', title);}
    if(icon){icon.dataset.icon=state.roadMode==='manhole'?'manhole':state.roadMode==='marking'?'roadMarking':'road'; setIcon(icon,icon.dataset.icon);}
    document.querySelectorAll('#roadToolMenu button').forEach(b=>b.classList.toggle('active', b.dataset.roadMode===state.roadMode));
  }
  function showRoadToolMenu(anchor=$('roadToolGroup')||$('roadToolBtn')){toggleToolFlyout('roadToolMenu', anchor); updateRoadToolButton();}
  $('roadVariantBtn')?.addEventListener('click', e=>{e.preventDefault(); e.stopPropagation(); showRoadToolMenu($('roadToolGroup')||$('roadVariantBtn'));});
  $('roadToolBtn')?.addEventListener('pointerdown', e=>{clearTimeout(roadToolPressTimer); roadToolPressTimer=setTimeout(()=>showRoadToolMenu($('roadToolGroup')||$('roadToolBtn')), 420);});
  $('roadToolBtn')?.addEventListener('pointerup', ()=>clearTimeout(roadToolPressTimer));
  $('roadToolBtn')?.addEventListener('pointerleave', ()=>clearTimeout(roadToolPressTimer));
  $('roadToolBtn')?.addEventListener('contextmenu', e=>{e.preventDefault(); showRoadToolMenu($('roadToolGroup')||$('roadVariantBtn'));});
  document.querySelectorAll('#roadToolMenu button').forEach(btn=>btn.onclick=e=>{e.stopPropagation(); state.roadMode=btn.dataset.roadMode||'centerline'; updateRoadToolButton(); setActiveTool('road');});
  hydrateIcons();
  updateRoadToolButton();

  function updateStreetlightToolButton(){
    const icon=$('streetlightToolIcon'), label=$('streetlightToolLabel'), btn=$('streetlightToolBtn');
    const anchored=state.streetlightMode==='anchored';
    if(icon){ icon.dataset.icon=anchored?'lampAnchored':'lamp'; setIcon(icon, icon.dataset.icon); }
    if(label) label.textContent=anchored?'Anchored Streetlight':'Streetlight';
    if(btn){btn.title=anchored?'Anchored Streetlight':'Streetlight'; btn.setAttribute('aria-label', anchored?'Anchored Streetlight':'Streetlight');}
    document.querySelectorAll('#streetlightToolMenu button').forEach(b=>b.classList.toggle('active', b.dataset.streetlightMode===state.streetlightMode));
  }
  function showStreetlightToolMenu(anchor=$('streetlightToolGroup')||$('streetlightToolBtn')){toggleToolFlyout('streetlightToolMenu', anchor); updateStreetlightToolButton();}
  $('streetlightVariantBtn')?.addEventListener('click', e=>{e.preventDefault(); e.stopPropagation(); showStreetlightToolMenu($('streetlightToolGroup')||$('streetlightVariantBtn'));});
  let streetlightToolPressTimer=null;
  $('streetlightToolBtn')?.addEventListener('pointerdown', e=>{clearTimeout(streetlightToolPressTimer); streetlightToolPressTimer=setTimeout(()=>showStreetlightToolMenu($('streetlightToolGroup')||$('streetlightToolBtn')), 420);});
  $('streetlightToolBtn')?.addEventListener('pointerup', ()=>clearTimeout(streetlightToolPressTimer));
  $('streetlightToolBtn')?.addEventListener('pointercancel', ()=>clearTimeout(streetlightToolPressTimer));
  $('streetlightToolBtn')?.addEventListener('contextmenu', e=>{e.preventDefault(); showStreetlightToolMenu($('streetlightToolGroup')||$('streetlightVariantBtn'));});
  document.querySelectorAll('#streetlightToolMenu button').forEach(btn=>btn.onclick=e=>{e.stopPropagation(); state.streetlightMode=btn.dataset.streetlightMode||'free'; updateStreetlightToolButton(); setActiveTool('streetlight');});
  document.addEventListener('pointerdown', e=>{if(!e.target.closest('.toolGroup') && !e.target.closest('.toolFlyout')) hideToolFlyouts();});
  window.addEventListener('resize', hideToolFlyouts);
  window.addEventListener('scroll', hideToolFlyouts, true);
  updateStreetlightToolButton();
  function hasAnySiteGeometry(){
    return !!(state.buildings?.length || state.roads?.length || state.roadFeatures?.length || state.benchworkOutlines?.length || state.streetlights?.length || state.annotations?.length || state.fabricRegions?.length || state.siteConstraints?.length);
  }

  function updateEmptyImageOverlay(){
    const overlay=$('emptyImageOverlay');
    if(!overlay) return;
    const show=!state.image && state.viewMode!=='3d';
    overlay.classList.toggle('visible', show);
    overlay.setAttribute('aria-hidden', show ? 'false' : 'true');
  }

  function setImageStatus(message, kind='muted'){
    const el=$('imageImportStatus');
    if(!el) return;
    el.className='small '+kind;
    el.textContent=message;
  }
  function readFileAsDataURL(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=()=>reject(new Error('Could not read that image file.'));
      reader.onload=ev=>resolve(ev.target.result);
      reader.readAsDataURL(file);
    });
  }
  async function loadReferenceImage(file){
    if(!file) return;
    setImageStatus(`Loading ${file.name}…`);
    const objectUrl=URL.createObjectURL(file);
    let dataUrl=null;
    try{
      const img=new Image();
      const loaded=new Promise((resolve,reject)=>{
        img.onload=()=>resolve();
        img.onerror=()=>reject(new Error('The browser could not decode this image. Try PNG, JPG, WEBP, or a simple SVG.'));
      });
      img.src=objectUrl;
      await loaded;
      if(img.decode){
        try{ await img.decode(); } catch(_err){}
      }
      try{ dataUrl=await readFileAsDataURL(file); }
      catch(_err){ dataUrl=null; }
      state.image=img;
      state.imageMeta={
        name:file.name,
        mimeType:file.type || (dataUrl && (dataUrl.match(/^data:([^;]+);/)||[])[1]) || 'application/octet-stream',
        dataUrl:dataUrl,
        objectUrlUsed:true,
        naturalWidthPx:img.naturalWidth||img.width,
        naturalHeightPx:img.naturalHeight||img.height,
        opacity:state.imageOpacity,
        rotationDeg:0
      };
      resize();
      fitImage();
      syncAll();
      setImageStatus(`Loaded ${file.name} (${state.imageMeta.naturalWidthPx} × ${state.imageMeta.naturalHeightPx}px).`, 'okText');
      updateImagePortableStatus();
      updateEmptyImageOverlay();
      console.info('[HakoMachi Site Planner] image loaded', state.imageMeta);
    }catch(err){
      console.error('[HakoMachi Site Planner] image import failed', err);
      setImageStatus(err.message || 'Image import failed.', 'warning');
      alert(err.message || 'Image import failed.');
      URL.revokeObjectURL(objectUrl);
    }
  }
  $('imageFile').addEventListener('change', async e=>{
    const f=e.target.files && e.target.files[0];
    e.target.value='';
    await loadReferenceImage(f);
  });

  function isSupportedImageFile(file){
    if(!file) return false;
    const name=(file.name||'').toLowerCase();
    const type=(file.type||'').toLowerCase();
    return type.startsWith('image/') || /\.(png|jpe?g|svg|webp)$/i.test(name);
  }

  async function handleEmptyImageDrop(file){
    if(!file) return;
    if(!isSupportedImageFile(file)){
      alert('Drop a PNG, JPG, SVG, or WEBP image here. Use Load for .hako-site.json project files.');
      return;
    }
    await loadReferenceImage(file);
  }

  const emptyImageOverlay=$('emptyImageOverlay');
  const emptyImageCard=$('emptyImageCard');
  if(emptyImageOverlay){
    ['dragenter','dragover'].forEach(type=>emptyImageOverlay.addEventListener(type, e=>{
      if(!state.image){
        e.preventDefault();
        e.stopPropagation();
        emptyImageCard?.classList.add('dragOver');
      }
    }));
    ['dragleave','dragend'].forEach(type=>emptyImageOverlay.addEventListener(type, e=>{
      emptyImageCard?.classList.remove('dragOver');
    }));
    emptyImageOverlay.addEventListener('drop', async e=>{
      if(!state.image){
        e.preventDefault();
        e.stopPropagation();
        emptyImageCard?.classList.remove('dragOver');
        const file=e.dataTransfer?.files?.[0];
        await handleEmptyImageDrop(file);
      }
    });
  }
  updateEmptyImageOverlay();
  $('opacity').oninput=e=>{state.imageOpacity=parseFloat(e.target.value); if(state.imageMeta)state.imageMeta.opacity=state.imageOpacity; draw();}; $('imageLockBtn').onclick=()=>{state.imageLocked=!state.imageLocked; $('imageLockBtn').textContent=state.imageLocked?'Locked':'Unlocked';};
  $('applyScaleBtn').onclick=()=>{
    const line=state.lastCalibrationLine||state.calibrationLine;
    if(!line) return alert('Draw a calibration line first.');
    const known=modelKnownMm();
    const len=dist({x:line.x1,y:line.y1},{x:line.x2,y:line.y2});
    if(known<=0||len<=0) return alert('Calibration length must be greater than zero.');
    const nextPxPerMm=len/known;
    if(state.pxPerMm && Math.abs(state.pxPerMm-nextPxPerMm)>1e-9){
      const ok=confirm('Change calibration?\n\nThis will update all real millimeter values derived from the image, including building dimensions, road widths, sidewalk widths, streetlight sizes, and exported coordinates. Pixel positions on the image will stay in place, but measured values will change.');
      if(!ok) return;
    }
    state.pxPerMm=nextPxPerMm;
    state.calibrationLine=line;
    syncAll();
  };
  $('clearScaleBtn').onclick=()=>{
    if(state.pxPerMm){
      const ok=confirm('Clear calibration?\n\nThis will remove calibrated millimeter measurements until you recalibrate. Existing image-space geometry will remain in place.');
      if(!ok) return;
    }
    state.pxPerMm=null;
    syncAll();
  };

  async function clearCacheAndReset(){
    const ok = confirm('Clear HakoMachi Site Planner cache and reset to the default blank state?\n\nThis clears the current in-memory project, the HakoMachi handoff seed, and planner-related browser storage. Download/save your .hako-site.json first if you want to keep it.');
    if(!ok) return;
    try{
      const keysToRemove=[];
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i);
        if(key && /hakomachi|hakoMachi|sitePlanner|site-planner/i.test(key)) keysToRemove.push(key);
      }
      keysToRemove.forEach(key=>localStorage.removeItem(key));
      const sessionKeys=[];
      for(let i=0;i<sessionStorage.length;i++){
        const key=sessionStorage.key(i);
        if(key && /hakomachi|hakoMachi|sitePlanner|site-planner/i.test(key)) sessionKeys.push(key);
      }
      sessionKeys.forEach(key=>sessionStorage.removeItem(key));
      if('caches' in window){
        const cacheNames=await caches.keys();
        await Promise.all(cacheNames.filter(name=>/hakomachi|hakoMachi|sitePlanner|site-planner/i.test(name)).map(name=>caches.delete(name)));
      }
    }catch(err){
      console.warn('[HakoMachi Site Planner] Cache clearing was partially blocked:', err);
    }
    state.tool='select';
    state.image=null;
    state.imageMeta=null;
    state.imageOpacity=.75;
    state.imageLocked=true;
    state.view={x:40,y:40,scale:1};
    state.viewMode='2d';
    state.site3d={baseThicknessMm:4};
    if($('site3dBaseThickness')) $('site3dBaseThickness').value=String(state.site3d.baseThicknessMm);
    wrap.classList.remove('view3d');
    document.querySelector('.sitePlannerApp')?.classList.remove('view3d');
    state.pxPerMm=null;
    state.calibrationLine=null;
    state.lastCalibrationLine=null;
    state.buildings=[];
    state.selectedId=null;
    state.drag=null;
    state.hover=null;
    state.polygonDraft=[];
    state.measureLine=null;
    state.annotations=[];
    state.selectedAnnotationId=null;
    state.streetlights=[];
    state.selectedStreetlightId=null;
    state.hoverStreetlightId=null;
    state.hoverPreview=null;
    clearLongPress(); hideContextMenu();
    state.projectName='hakomachi-site';
    state.inputMode='penDrawFingerPan';
    state.snapOn=false;
    state.pointers=new Map();
    state.pinch=null;
    $('opacity').value='0.75';
    $('imageLockBtn').textContent='Locked';
    updateImagePortableStatus();
    $('imageFile').value='';
    $('loadFile').value='';
    document.querySelectorAll('.toolbtn').forEach(b=>b.classList.toggle('active', b.dataset.tool==='select'));
    state.dirty=false;
    state.dirtySinceManualSave=false;
    state.autosaveRestored=false;
    resetHistory('reset');
    setImageStatus('Cache cleared. Planner reset to default blank state.', 'okText');
    syncAll({skipDirty:true});
    updateAutosaveStatus('Autosave: cleared');
  }

  function closeTopMenus(except){
    ['exportMenu','settingsMenu','overflowMenu'].forEach(id=>{
      const menu=$(id);
      if(!menu || menu===except) return;
      menu.classList.remove('open');
      menu.closest('.menuWrap')?.classList.remove('menuOpen');
    });
  }
  function toggleTopMenu(id){
    const menu=$(id);
    if(!menu) return;
    const willOpen=!menu.classList.contains('open');
    closeTopMenus(willOpen?menu:null);
    menu.classList.toggle('open', willOpen);
    menu.closest('.menuWrap')?.classList.toggle('menuOpen', willOpen);
  }
  function wireMenuButton(btnId, menuId){
    const btn=$(btnId), menu=$(menuId);
    if(!btn || !menu) return;
    btn.addEventListener('click', e=>{
      e.preventDefault();
      e.stopPropagation();
      toggleTopMenu(menuId);
    });
    menu.addEventListener('click', e=>{
      // Labels that open file pickers need the click to complete, then the menu can close.
      const target=e.target.closest('button,label');
      if(target) setTimeout(()=>closeTopMenus(), 0);
    });
  }
  wireMenuButton('exportMenuBtn','exportMenu');
  wireMenuButton('settingsBtn','settingsMenu');
  wireMenuButton('overflowBtn','overflowMenu');
  document.addEventListener('pointerdown', e=>{
    if(e.target.closest('.menuWrap')) return;
    closeTopMenus();
  });
  document.addEventListener('keydown', e=>{
    if(e.key==='Escape') closeTopMenus();
  });
  function exportSelectedSeed(){
    const b=selected();
    if(!b) return alert('Select a building first.');
    download(JSON.stringify(makeSeed(b),null,2),`${slug(b.name)}-hakomachi-seed.json`,'application/json');
  }
  function getGithubSettings(){
    return githubData.getSettings();
  }
  function setGithubSettings(next){
    githubData.saveSettings(next);
  }
  function getCurrentGithubSite(){
    try{return JSON.parse(localStorage.getItem(GITHUB_CURRENT_KEY)||'null')||null;}catch(_err){return null;}
  }
  function setCurrentGithubSite(value){
    localStorage.setItem(GITHUB_CURRENT_KEY, JSON.stringify(value));
  }
  function requireGithubSettings(settings){
    githubData.assertSettings(settings);
  }
  async function readGithubFile(settings, path){
    return githubData.readGithubFile(settings, path);
  }
  async function writeGithubFile(settings, path, text, message){
    return githubData.writeGithubFile(settings, path, text, message);
  }
  async function loadGithubLibrary(settings){
    return githubData.loadLibrary(settings);
  }
  function normalizeGithubLibrary(library){
    return githubData.normalizeLibrary(library);
  }
  function upsertGithubSitePlan(library, record){
    return githubData.upsertRecord(library, 'sitePlans', record);
  }
  function githubProjectName(project){
    return project.hakomachiCloud?.name || project.projectName || (Array.isArray(project.buildings)&&project.buildings.length ? `HakoMachi site (${project.buildings.length} buildings)` : 'HakoMachi site');
  }
  function githubSiteRecord(id, name, path, project){
    const now=new Date().toISOString();
    return {
      kind:'sitePlan',
      recordType:'hakomachi-site-plan',
      schemaVersion:1,
      id,
      name,
      path,
      paths:{project:path},
      app:'hakomachi-site-planner',
      source:{format:'hako-site-json', version:project.version||null},
      summary:{
        buildings:project.buildings?.length||0,
        roads:project.roads?.length||0,
        benchworkOutlines:project.benchworkOutlines?.length||0,
        streetlights:project.streetlights?.length||0,
        imageEmbedded:!!project.image?.dataUrl,
        calibrated:!!project.scale?.calibrated
      },
      updatedAt:now,
      createdAt:now
    };
  }
  function openGithubModal(title, body, actions=[]){
    let modal=document.getElementById('githubDataPlannerModal');
    if(!modal){
      modal=document.createElement('div');
      modal.id='githubDataPlannerModal';
      modal.className='githubDataModal';
      modal.innerHTML='<div class="githubDataCard"><h2 id="githubDataTitle"></h2><div id="githubDataBody"></div><div id="githubDataStatus" class="githubDataStatus"></div><div id="githubDataActions" class="githubDataActions"></div></div>';
      modal.addEventListener('click', event=>{if(event.target===modal) closeGithubModal();});
      document.body.appendChild(modal);
    }
    $('githubDataTitle').textContent=title;
    $('githubDataBody').innerHTML=body||'';
    $('githubDataStatus').textContent='';
    const actionBox=$('githubDataActions');
    actionBox.innerHTML='';
    actions.forEach(action=>{
      const button=document.createElement('button');
      button.type='button';
      button.textContent=action.label;
      if(action.cls) button.className=action.cls;
      button.onclick=action.onClick;
      actionBox.appendChild(button);
    });
    modal.classList.add('open');
    return modal;
  }
  function closeGithubModal(){
    document.getElementById('githubDataPlannerModal')?.classList.remove('open');
  }
  function setGithubStatus(message){
    const el=$('githubDataStatus');
    if(el) el.textContent=message||'';
  }
  function openGithubSettings(){
    const settings=getGithubSettings();
    openGithubModal('GitHub data repository', `
      <div class="field"><label>Private data repo</label><input id="gdRepo" value="${escapeAttr(settings.repoFullName)}" placeholder="GeorgeHinch/hakomachi_savedata"><div class="small">Use owner/repo. The repo can be private.</div></div>
      <div class="field"><label>Branch</label><input id="gdBranch" value="${escapeAttr(settings.branch)}"></div>
      <div class="field"><label>Fine-grained token</label><input id="gdToken" type="password" value="${escapeAttr(settings.token)}"><div class="small">Stored only in this browser. Needs Contents read/write on the data repo.</div></div>
      <div class="field"><label>Footprint library path</label><input id="gdLibrary" value="${escapeAttr(settings.libraryPath)}"></div>
      <div class="field"><label>Site plan files directory</label><input id="gdSites" value="${escapeAttr(settings.sitePlansDir)}"></div>
    `, [
      {label:'Save settings', cls:'primary', onClick:()=>{
        setGithubSettings({
          repoFullName:$('gdRepo').value,
          branch:$('gdBranch').value,
          token:$('gdToken').value,
          libraryPath:$('gdLibrary').value,
          sitePlansDir:$('gdSites').value
        });
        setGithubStatus('Settings saved.');
      }},
      {label:'Close', onClick:closeGithubModal}
    ]);
  }
  async function saveSitePlanToGithub(){
    try{
      const settings=getGithubSettings();
      try{requireGithubSettings(settings);}catch(err){openGithubSettings(); setGithubStatus(err.message); return;}
      const current=getCurrentGithubSite();
      const project=projectJson();
      const defaultName=current?.name || githubProjectName(project);
      const name=prompt('Site plan name for GitHub save', defaultName);
      if(!name) return;
      const id=(current && current.name===defaultName && current.id) ? current.id : slug(name);
      const path=(current && current.name===defaultName && current.path) ? current.path : githubData.cleanRepoPath(`${settings.sitePlansDir}/${id}.hako-site.json`);
      project.projectName=name;
      project.hakomachiCloud={schema:'hakomachi.cloud-ref', schemaVersion:1, kind:'sitePlan', id, name, path, savedAt:new Date().toISOString()};
      openGithubModal('Save site plan to GitHub', '<div class="small">Preparing GitHub save...</div>', [{label:'Close', onClick:closeGithubModal}]);
      setGithubStatus('Saving site plan...');
      await writeGithubFile(settings, path, JSON.stringify(project,null,2)+'\n', `Save HakoMachi site plan: ${name}`);
      setGithubStatus('Updating library...');
      const library=await loadGithubLibrary(settings);
      upsertGithubSitePlan(library, githubSiteRecord(id, name, path, project));
      await writeGithubFile(settings, settings.libraryPath, JSON.stringify(library,null,2)+'\n', `Update HakoMachi site plan library: ${name}`);
      setCurrentGithubSite({id,name,path});
      markManualSaveComplete();
      setGithubStatus(`Saved ${path}`);
      $('githubDataBody').innerHTML=`<div class="okText">Saved site plan to GitHub.</div><div class="small">${escapeHtml(settings.repoFullName)}<br>${escapeHtml(path)}</div>`;
    }catch(err){
      setGithubStatus('GitHub save failed: '+(err.message||err));
      alert('GitHub save failed:\n\n'+(err.message||err));
    }
  }
  async function loadSitePlanFromGithub(record){
    try{
      const settings=getGithubSettings();
      requireGithubSettings(settings);
      setGithubStatus('Loading '+record.path+'...');
      const file=await readGithubFile(settings, record.path);
      if(!file) throw new Error('Missing file: '+record.path);
      loadProject(JSON.parse(file.text), {fromFile:true});
      setCurrentGithubSite({id:record.id, name:record.name, path:record.path});
      closeGithubModal();
    }catch(err){
      setGithubStatus('GitHub load failed: '+(err.message||err));
      alert('GitHub load failed:\n\n'+(err.message||err));
    }
  }
  async function openGithubSitePlans(){
    try{
      const settings=getGithubSettings();
      try{requireGithubSettings(settings);}catch(err){openGithubSettings(); setGithubStatus(err.message); return;}
      openGithubModal('GitHub site plans', '<div class="small">Loading...</div>', [{label:'Close', onClick:closeGithubModal}]);
      const library=await loadGithubLibrary(settings);
      const records=normalizeGithubLibrary(library).records.sitePlans;
      const body=$('githubDataBody');
      if(!records.length){
        body.innerHTML='<div class="small">No saved site plans yet.</div>';
        return;
      }
      body.innerHTML='<div class="small">Choose a saved site plan from the shared HakoMachi library.</div>';
      records.forEach(record=>{
        const row=document.createElement('div');
        row.className='githubDataRecord';
        const summary=record.summary||{};
        row.innerHTML=`<div><b>${escapeHtml(record.name||record.id)}</b><small>${escapeHtml(record.path||'')}</small><small>${summary.buildings||0} buildings / ${summary.roads||0} roads / ${escapeHtml(record.updatedAt||'')}</small></div>`;
        const button=document.createElement('button');
        button.type='button';
        button.textContent='Load';
        button.onclick=()=>loadSitePlanFromGithub(record);
        row.appendChild(button);
        body.appendChild(row);
      });
    }catch(err){
      openGithubModal('GitHub site plans', `<div class="warning">${escapeHtml(err.message||err)}</div>`, [{label:'Close', onClick:closeGithubModal}]);
    }
  }
  async function openGithubBuildings(){
    try{
      const settings=getGithubSettings();
      try{requireGithubSettings(settings);}catch(err){openGithubSettings(); setGithubStatus(err.message); return;}
      openGithubModal('GitHub building footprints', '<div class="small">Loading...</div>', [{label:'Close', onClick:closeGithubModal}]);
      const library=await loadGithubLibrary(settings);
      const records=normalizeGithubLibrary(library).records.buildings;
      const body=$('githubDataBody');
      if(!records.length){
        body.innerHTML='<div class="small">No saved building footprints yet.</div>';
        return;
      }
      body.innerHTML='<div class="small">Shared footprint records. Placement from this list can be added in a later native Site Planner pass.</div>';
      records.forEach(record=>{
        const footprint=record.footprint||{};
        const path=record.path||record.paths?.hako||'';
        const row=document.createElement('div');
        row.className='githubDataRecord';
        row.innerHTML=`<div><b>${escapeHtml(record.name||record.id)}</b><small>${escapeHtml(path)}</small><small>${Number(footprint.widthMm||0).toFixed(1)} x ${Number(footprint.depthMm||0).toFixed(1)} mm</small></div>`;
        const button=document.createElement('button');
        button.type='button';
        button.textContent='Copy path';
        button.onclick=()=>prompt('Building .hako path', path);
        row.appendChild(button);
        body.appendChild(row);
      });
    }catch(err){
      openGithubModal('GitHub building footprints', `<div class="warning">${escapeHtml(err.message||err)}</div>`, [{label:'Close', onClick:closeGithubModal}]);
    }
  }
  $('inputMode').onchange=e=>{state.inputMode=e.target.value; draw();};
  $('snapBtn').onclick=()=>{state.snapOn=!state.snapOn; $('snapBtn').classList.toggle('active', state.snapOn); $('snapBtn').textContent=state.snapOn?'Snap: On':'Snap: Off'; draw();};
  $('deleteAnnotationBtn').onclick=deleteSelectedAnnotation;
  $('clearAnnotationsBtn').onclick=()=>{if(state.annotations.length && !confirm('Clear all freehand annotation notes?')) return; state.annotations=[]; state.selectedAnnotationId=null; renderSelected(); draw(); markDirty('annotations cleared');};
  $('fitBtn').onclick=()=>{fitImage(); markDirty('view changed');}; $('resetBtn').onclick=()=>{state.view={x:40,y:40,scale:1}; draw(); markDirty('view changed');}; $('clearCacheBtn').onclick=clearCacheAndReset; if($('clearCachePanelBtn')) $('clearCachePanelBtn').onclick=clearCacheAndReset;
  $('githubSettingsBtn').onclick=openGithubSettings;
  $('githubSaveBtn').onclick=saveSitePlanToGithub;
  $('githubLoadBtn').onclick=openGithubSitePlans;
  $('githubBuildingsBtn').onclick=openGithubBuildings;
  if($('mobileGithubSettingsBtn')) $('mobileGithubSettingsBtn').onclick=openGithubSettings;
  if($('mobileGithubSaveBtn')) $('mobileGithubSaveBtn').onclick=saveSitePlanToGithub;
  if($('mobileGithubLoadBtn')) $('mobileGithubLoadBtn').onclick=openGithubSitePlans;
  if($('mobileGithubBuildingsBtn')) $('mobileGithubBuildingsBtn').onclick=openGithubBuildings;
  $('saveBtn').onclick=()=>{download(JSON.stringify(projectJson(),null,2),'hakomachi-site.hako-site.json','application/json'); markManualSaveComplete();};
  if($('undoBtn')) $('undoBtn').onclick=()=>undo();
  if($('redoBtn')) $('redoBtn').onclick=()=>redo();
  if($('mobileUndoBtn')) $('mobileUndoBtn').onclick=()=>undo();
  if($('mobileRedoBtn')) $('mobileRedoBtn').onclick=()=>redo();
  $('loadFile').addEventListener('change', e=>{
    const f=e.target.files && e.target.files[0];
    if(!f) return;
    const reader=new FileReader();
    reader.onerror=()=>alert('Could not read that project file.');
    reader.onload=ev=>{
      try{loadProject(JSON.parse(ev.target.result), {fromFile:true});}
      catch(err){alert('Could not load project JSON: '+err.message);}
      e.target.value='';
    };
    reader.readAsText(f);
  });
  if($('roadExportPreviewBtn')) $('roadExportPreviewBtn').onclick=()=>setRoadExportPreview(!state.roadExportPreview);
  if($('mobileRoadExportPreviewBtn')) $('mobileRoadExportPreviewBtn').onclick=()=>setRoadExportPreview(!state.roadExportPreview);
  if($('roadAssetSvgBtn')) $('roadAssetSvgBtn').onclick=()=>download(svgRoadAssetExport(),'hakomachi-road-assets.svg','image/svg+xml');
  if($('mobileRoadAssetSvgBtn')) $('mobileRoadAssetSvgBtn').onclick=()=>download(svgRoadAssetExport(),'hakomachi-road-assets.svg','image/svg+xml');
  $('csvBtn').onclick=()=>download(csvExport(),'hakomachi-building-pads.csv','text/csv');
  $('svgBtn').onclick=()=>download(svgExport(),'hakomachi-site.svg','image/svg+xml');
  $('seedBtn').onclick=exportSelectedSeed;
  if($('mobileSaveBtn')) $('mobileSaveBtn').onclick=()=>{download(JSON.stringify(projectJson(),null,2),'hakomachi-site.hako-site.json','application/json'); markManualSaveComplete();};
  if($('mobileCsvBtn')) $('mobileCsvBtn').onclick=()=>download(csvExport(),'hakomachi-building-pads.csv','text/csv');
  if($('mobileSeedBtn')) $('mobileSeedBtn').onclick=exportSelectedSeed;
  function openBuildingInHakoMachi(building){
    const b=building || selected();
    if(!b) return alert('Select a building first.');
    const seed=makeSeed(b);
    localStorage.setItem('hakomachiSitePlannerSeed',JSON.stringify(seed));
    window.open('building-generator.html#sitePlannerSeed','_blank');
  }
  async function copyHakoSeedForBuilding(building){
    const b=building || selected();
    if(!b) return alert('Select a building first.');
    const text=JSON.stringify(makeSeed(b),null,2);
    try{
      await navigator.clipboard.writeText(text);
      $('statusHint').textContent='Copied HakoSeed for '+(b.name||'building');
    }catch(_err){
      prompt('Copy HakoSeed', text);
    }
  }
  const legacyOpenBtn=$('openHakoBtn');
  if(legacyOpenBtn) legacyOpenBtn.onclick=()=>openBuildingInHakoMachi();
  function projectJson(){
    const payload=makeProjectPayload({includeImageDataUrl:true});
    if(payload.image?.dataUrl){
      updateImagePortableStatus(`Portable save: embedded original ${payload.image.naturalWidthPx||'?'} × ${payload.image.naturalHeightPx||'?'} px image (${formatBytes(payload.image.dataUrlByteLength||0)}).`);
    } else if(state.imageMeta){
      updateImagePortableStatus('Portable save warning: no embedded image data. Re-import the image before sharing this file.');
    }
    return payload;
  }
  function scalePointLike(pt, sx, sy){
    if(!pt || typeof pt!=='object') return pt;
    if(Number.isFinite(Number(pt.x))) pt.x=Number(pt.x)*sx;
    if(Number.isFinite(Number(pt.y))) pt.y=Number(pt.y)*sy;
    if(Number.isFinite(Number(pt.x1))) pt.x1=Number(pt.x1)*sx;
    if(Number.isFinite(Number(pt.y1))) pt.y1=Number(pt.y1)*sy;
    if(Number.isFinite(Number(pt.x2))) pt.x2=Number(pt.x2)*sx;
    if(Number.isFinite(Number(pt.y2))) pt.y2=Number(pt.y2)*sy;
    return pt;
  }
  function scalePointArray(arr, sx, sy){
    if(!Array.isArray(arr)) return arr;
    arr.forEach(p=>scalePointLike(p,sx,sy));
    return arr;
  }
  function scaleLoadedPixelGeometry(sx, sy){
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
    state.streetlights.forEach(l=>scalePointLike(l,sx,sy));
    state.annotations.forEach(st=>scalePointArray(st.points, sx, sy));
    if(state.calibrationLine) scalePointLike(state.calibrationLine, sx, sy);
    if(state.measureLine) scalePointLike(state.measureLine, sx, sy);
    if(state.pxPerMm) state.pxPerMm *= avg;
  }
  function savedImageDimensions(p){
    const img=p?.image||{};
    const cs=p?.coordinateSystem||{};
    const w=Number(img.naturalWidthPx ?? img.widthPx ?? img.width ?? cs.imageWidthPx);
    const h=Number(img.naturalHeightPx ?? img.heightPx ?? img.height ?? cs.imageHeightPx);
    return {w:Number.isFinite(w)?w:null,h:Number.isFinite(h)?h:null};
  }
  function restoreProjectView(p){
    const current=canvas.getBoundingClientRect();
    if(!p?.view) return null;
    const view={x:Number(p.view.x)||0,y:Number(p.view.y)||0,scale:Number(p.view.scale)||1};
    const cv=p.canvasViewport||p.viewport||p.savedCanvasViewport;
    const sw=Number(cv?.widthPx ?? cv?.width);
    const sh=Number(cv?.heightPx ?? cv?.height);
    if(Number.isFinite(sw)&&Number.isFinite(sh)&&sw>0&&sh>0&&current.width>0&&current.height>0){
      const savedCenterWorld={x:(sw/2-view.x)/view.scale,y:(sh/2-view.y)/view.scale};
      return {x:current.width/2-savedCenterWorld.x*view.scale,y:current.height/2-savedCenterWorld.y*view.scale,scale:view.scale};
    }
    return view;
  }
  function loadAlignmentMessage(savedW,savedH,loadedW,loadedH,changed){
    const n=state.buildings.length;
    const thing=n===1?'footprint':'footprints';
    if(changed) return `Loaded image ${loadedW} × ${loadedH}px; remapped ${n} building ${thing} from saved ${savedW} × ${savedH}px image coordinates.`;
    return `Loaded image ${loadedW} × ${loadedH}px and restored ${n} building ${thing} in image-pixel coordinates.`;
  }
  function loadProject(p, opts={}){
    autosaveSuppressed=true;
    state.image=null;
    state.imageMeta=p.image||null;
    state.imageOpacity=Number.isFinite(p.imageOpacity)?p.imageOpacity:(state.imageMeta?.opacity ?? state.imageOpacity ?? .75);
    state.imageLocked=p.imageLocked ?? state.imageLocked ?? true;
    state.view=restoreProjectView(p) || state.view;
    state.viewMode='2d';
    state.site3d={baseThicknessMm:4, ...(p.site3d||{})};
    if($('site3dBaseThickness')) $('site3dBaseThickness').value=String(state.site3d.baseThicknessMm ?? 4);
    wrap.classList.remove('view3d');
    document.querySelector('.sitePlannerApp')?.classList.remove('view3d');
    state.pxPerMm=p.scale?.pxPerMm||null;
    state.calibrationLine=p.scale?.calibrationLine||null;
    state.lastCalibrationLine=state.calibrationLine;
    const loadedBuildingSet=collectProjectBuildings(p);
    state.buildings=loadedBuildingSet.buildings;
    const loadFootprintMessage=footprintLoadMessage(p, state.buildings.length, loadedBuildingSet.source);
    const savedDims=savedImageDimensions(p);
    const loadedRoads = Array.isArray(p.roads) ? p.roads : (Array.isArray(p.siteConstraints) ? p.siteConstraints.filter(c=>c&&c.type==='road') : []);
    state.roads=loadedRoads.map(normalizeRoad);
    state.roadFeatures=(Array.isArray(p.roadFeatures)?p.roadFeatures:[]).map(normalizeRoadFeature);
    const loadedBenchworks = Array.isArray(p.benchworkOutlines) ? p.benchworkOutlines : (Array.isArray(p.siteConstraints) ? p.siteConstraints.filter(c=>c&&(c.type==='benchworkOutline'||c.type==='benchwork'||c.constraintType==='benchworkOutline')) : []);
    state.benchworkOutlines=loadedBenchworks.map(normalizeBenchworkOutline);
    state.fabricRegions=(p.fabricRegions||[]).map(normalizeFabricRegion);
    state.streetlights=(p.streetlights||[]).map(normalizeStreetlight);
    state.annotations=p.annotations||[];
    clearBuildingSelection();
    state.selectedRoadId=null;
    state.selectedBenchworkId=null;
    state.selectedStreetlightId=null;
    state.selectedAnnotationId=null;
    if($('opacity')) $('opacity').value=String(state.imageOpacity);
    if($('imageLockBtn')) $('imageLockBtn').textContent=state.imageLocked?'Locked':'Unlocked';
    if(state.imageMeta?.dataUrl){
      const img=new Image();
      img.onload=()=>{
        state.image=img;
        const loadedW=img.naturalWidth||img.width;
        const loadedH=img.naturalHeight||img.height;
        const savedW=savedDims.w || state.imageMeta.naturalWidthPx;
        const savedH=savedDims.h || state.imageMeta.naturalHeightPx;
        let geometryRemapped=false;
        if(savedW && savedH && (loadedW!==savedW || loadedH!==savedH)){
          scaleLoadedPixelGeometry(loadedW/savedW, loadedH/savedH);
          geometryRemapped=true;
          setImageStatus(loadAlignmentMessage(savedW,savedH,loadedW,loadedH,true), 'warning');
          updateImagePortableStatus('Portable image warning: loaded pixel dimensions differed from saved metadata, so planner geometry was remapped to the restored image.');
        } else {
          setImageStatus(loadAlignmentMessage(savedW||loadedW,savedH||loadedH,loadedW,loadedH,false), 'okText');
          state.imageMeta.naturalWidthPx=loadedW;
          state.imageMeta.naturalHeightPx=loadedH;
          state.imageMeta.pixelDimensionsVerifiedOnLoad=true;
          updateImagePortableStatus();
        }
        if(loadFootprintMessage && state.buildings.length===0) setImageStatus(loadFootprintMessage, 'warning');
        if(!p.view) fitImage();
        syncAll({skipDirty:true});
        autosaveSuppressed=false;
        resetHistory(opts.fromAutosave?'autosave restored':'project loaded');
      };
      img.onerror=()=>{
        setImageStatus('Project loaded, but the embedded image could not be decoded.', 'warning');
        updateImagePortableStatus('Portable image error: embedded image could not be decoded.');
        if(loadFootprintMessage) setImageStatus(loadFootprintMessage, 'warning');
        autosaveSuppressed=false;
        syncAll({skipDirty:true});
        resetHistory(opts.fromAutosave?'autosave restored':'project loaded');
      };
      img.src=state.imageMeta.dataUrl;
    } else {
      if(state.imageMeta){
        setImageStatus('Project loaded without embedded image data. Re-import the original image to see the reference layer.', 'warning');
        updateImagePortableStatus('Portable save warning: this project has image metadata but no embedded image data.');
      } else {
        setImageStatus('No image loaded.', 'muted');
        updateImagePortableStatus();
      }
      if(loadFootprintMessage) setImageStatus(loadFootprintMessage, 'warning');
      syncAll({skipDirty:true});
      autosaveSuppressed=false;
      resetHistory(opts.fromAutosave?'autosave restored':'project loaded');
    }
    state.dirty=false;
    state.dirtySinceManualSave=!!opts.dirtySinceManualSave;
    updateAutosaveStatus(opts.fromAutosave?'Autosave: restored':'Autosave: loaded');
    setTimeout(()=>updateAutosaveStatus(), 1200);
  }
  function csvExport(){syncAll(); const rows=[['id','name','state','type','category','widthMm','depthMm','areaMm2','rotationDeg','hakoFile','notes']]; state.buildings.forEach(raw=>{const b=normalizeBuilding(raw); rows.push([b.id,b.name,b.state,b.padType,b.category,b.widthMm||'',b.depthMm||'',b.derived?.areaMm2||'',b.rotationDeg||0,b.hakoFile?.fileName||'',b.notes||'']);}); return rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n');}

  function svgPathFromPoly(poly){return (poly||[]).map(p=>`${p.x},${p.y}`).join(' ');}
  function svgFeatureTransform(f){return `rotate(${f.rotationDeg||0} ${f.x} ${f.y})`;}
  function svgRoadMarkingFeature(f){
    normalizeRoadFeature(f); const w=f.widthPx||24,h=f.depthPx||6,x=f.x,y=f.y,c=f.color||'#f7f2df',tr=svgFeatureTransform(f),draw=f.markingDraw||markingPresetByKey(f.markingPreset||f.markingType).draw;
    if(draw==='crosswalk'){
      const stripes=5,gap=w/(stripes+1),stripeW=Math.max(.8,gap*.38); let out='';
      for(let i=0;i<stripes;i++) out+=`<rect x="${x-w/2+gap*(i+1)-stripeW/2}" y="${y-h/2}" width="${stripeW}" height="${h}" transform="${tr}" fill="none" stroke="${c}" stroke-width="0.12" data-layer="roadMarkingEtch" data-jp-name="${escapeAttr(f.jpName||'横断歩道')}"/>`;
      return out;
    }
    if(draw==='diamond') return `<polygon points="${x},${y-h/2} ${x+w/2},${y} ${x},${y+h/2} ${x-w/2},${y}" transform="${tr}" fill="none" stroke="${c}" stroke-width="0.12" data-layer="roadMarkingEtch" data-jp-name="${escapeAttr(f.jpName||'')}"/>`;
    if(draw==='arrow') return `<path d="M ${x} ${y-h/2} L ${x+w/2} ${y-h*.05} L ${x+w*.18} ${y-h*.05} L ${x+w*.18} ${y+h/2} L ${x-w*.18} ${y+h/2} L ${x-w*.18} ${y-h*.05} L ${x-w/2} ${y-h*.05} Z" transform="${tr}" fill="none" stroke="${c}" stroke-width="0.12" data-layer="roadMarkingEtch" data-jp-name="${escapeAttr(f.jpName||'')}"/>`;
    if(draw==='speedNumber') return `<text x="${x}" y="${y}" transform="${tr}" text-anchor="middle" dominant-baseline="middle" font-size="${Math.max(4,h*1.15)}" fill="none" stroke="${c}" stroke-width="0.08" data-layer="roadMarkingEtch" data-jp-name="${escapeAttr(f.jpName||'速度表示')}">${escapeHtml(f.text||'30')}</text>`;
    return `<rect x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" transform="${tr}" fill="none" stroke="${c}" stroke-width="0.12" data-layer="roadMarkingEtch" data-jp-name="${escapeAttr(f.jpName||'')}"/>`;
  }
  function svgRoadAssetExport(){
    const data=generateRoadExportData();
    const w=state.image?.width||1200,h=state.image?.height||800;
    const roadSurfaces=[], sidewalkSurfaces=[], seamCuts=[], curbEtches=[], markingEtches=[], hatchCuts=[], labels=[];
    data.roads.forEach((r,ri)=>{
      if((r.roadPolygonPx||[]).length) roadSurfaces.push(`<polygon id="${escapeAttr(r.id)}_surface" points="${svgPathFromPoly(r.roadPolygonPx)}" fill="none" stroke="#000" stroke-width="0.1" data-layer="roadSurfaceCut"/>`);
      (r.sidewalkPolygonsPx||[]).forEach((sw,si)=>{ if((sw.polygon||[]).length) sidewalkSurfaces.push(`<polygon id="${escapeAttr(r.id)}_sidewalk_${si}" points="${svgPathFromPoly(sw.polygon)}" fill="none" stroke="#000" stroke-width="0.1" data-layer="sidewalkSurfaceCut"/>`); });
      (r.roadPolygonPx||[]).forEach((p,i,arr)=>{const q=arr[(i+1)%arr.length]; if(q) curbEtches.push(`<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="#00f" stroke-width="0.08" data-layer="curbEtch"/>`);});
      const c=polygonCenter(r.roadPolygonPx||[]); labels.push(`<text x="${c.x}" y="${c.y}" font-size="8" fill="#080808" data-layer="labels">${escapeHtml(r.name||('Road '+(ri+1)))}</text>`);
    });
    (state.roadFeatures||[]).forEach(raw=>{const f=normalizeRoadFeature(raw); if(f.hidden) return; if(f.kind==='manhole'){ if(f.hatchShape==='circle') hatchCuts.push(`<circle cx="${f.x}" cy="${f.y}" r="${(f.diameterPx||18)/2}" fill="none" stroke="#000" stroke-width="0.1" data-layer="roadHatchCut" data-name="${escapeAttr(f.name||'Manhole')}"/>`); else hatchCuts.push(`<rect x="${f.x-(f.widthPx||20)/2}" y="${f.y-(f.depthPx||10)/2}" width="${f.widthPx||20}" height="${f.depthPx||10}" transform="${svgFeatureTransform(f)}" fill="none" stroke="#000" stroke-width="0.1" data-layer="roadHatchCut" data-name="${escapeAttr(f.name||'Hatch')}"/>`);} else {markingEtches.push(svgRoadMarkingFeature(f));}});
    data.seams.forEach((s,i)=>{seamCuts.push(`<line id="seam_${i+1}" x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="#f00" stroke-width="0.1" data-layer="seamCut"/>`); labels.push(`<text x="${s.x+3}" y="${s.y-3}" font-size="6" fill="#f00" data-layer="labels">S-${i+1}</text>`);});
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}mm" height="${h}mm" viewBox="0 0 ${w} ${h}">\n<title>HakoMachi Road Asset Export</title>\n<desc>Road surfaces, sidewalk surfaces, seam cuts, hatch cuts, Japanese road-marking etches, curb etches, and labels. Units follow Site Planner image-pixel coordinate space; use the project calibration for model-mm conversion.</desc>\n<g id="roadSurfaceCut">${roadSurfaces.join('\n')}</g>\n<g id="sidewalkSurfaceCut">${sidewalkSurfaces.join('\n')}</g>\n<g id="roadHatchCut">${hatchCuts.join('\n')}</g>\n<g id="roadMarkingEtch" data-standard="${JP_ROAD_MARKING_STANDARD_ID}">${markingEtches.join('\n')}</g>\n<g id="seamCut">${seamCuts.join('\n')}</g>\n<g id="curbEtch">${curbEtches.join('\n')}</g>\n<g id="labels">${labels.join('\n')}</g>\n</svg>`;
  }

  function svgExport(){syncAll(); const w=state.image?.width||1200,h=state.image?.height||800; const img=state.imageMeta?.dataUrl?`<image href="${state.imageMeta.dataUrl}" x="0" y="0" width="${w}" height="${h}" opacity="${state.imageOpacity}"/>`:''; const notes=state.annotations.map(st=>`<polyline points="${(st.points||[]).map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="${st.color||'#6f4326'}" stroke-width="${st.baseWidth||2.2}" stroke-linecap="round" stroke-linejoin="round"/>`).join('\n'); const benchworks=state.benchworkOutlines.map(bw=>{normalizeBenchworkOutline(bw); const pts=bw.pointsPx||[]; if(pts.length<2) return ''; let d=`M ${pts[0].x} ${pts[0].y}`; for(let i=0;i<pts.length;i++){const b=pts[(i+1)%pts.length], c=bw.curvesPx?.[i]; d += c ? ` Q ${c.x} ${c.y} ${b.x} ${b.y}` : ` L ${b.x} ${b.y}`;} d+=' Z'; return `<path d="${d}" fill="rgba(47,111,78,.05)" stroke="${bw.color||'#2f6f4e'}" stroke-width="3" stroke-dasharray="9 7"/>`;}).join('\n'); const roads=state.roads.map(r=>{normalizeRoad(r); const side=(r.sidewalkPolygonsPx||[]).map(sw=>`<polygon points="${(sw.polygon||[]).map(p=>`${p.x},${p.y}`).join(' ')}" fill="rgba(226,214,188,.62)" stroke="#b9aa86" stroke-width="1"/>`).join(''); const road=`<polygon points="${(r.roadPolygonPx||[]).map(p=>`${p.x},${p.y}`).join(' ')}" fill="rgba(111,106,94,.26)" stroke="#6f6a5e" stroke-width="2"/>`; return side+road;}).join('\n'); const roadItems=(state.roadFeatures||[]).map(f=>{normalizeRoadFeature(f); if(f.kind==='manhole'){return f.hatchShape==='circle'?`<circle cx="${f.x}" cy="${f.y}" r="${(f.diameterPx||18)/2}" fill="rgba(58,43,30,.18)" stroke="#3a2b1e" stroke-width="1"/>`:`<rect x="${f.x-(f.widthPx||20)/2}" y="${f.y-(f.depthPx||10)/2}" width="${f.widthPx||20}" height="${f.depthPx||10}" transform="rotate(${f.rotationDeg||0} ${f.x} ${f.y})" fill="rgba(58,43,30,.18)" stroke="#3a2b1e" stroke-width="1"/>`; } return `<rect x="${f.x-(f.widthPx||24)/2}" y="${f.y-(f.depthPx||6)/2}" width="${f.widthPx||24}" height="${f.depthPx||6}" transform="rotate(${f.rotationDeg||0} ${f.x} ${f.y})" fill="${f.color||'#f7f2df'}" stroke="none"/>`;}).join('\n'); const lights=state.streetlights.map(l=>{normalizeStreetlight(l); const r=(state.pxPerMm?mmToPx((l.mode==='anchored'?(l.anchor?.mountMode==='roadEdgeBulbMount'?(l.anchor?.bulbMountDiameterMm||3):(l.anchor?.cutHoleDiameterMm||1.2)):(l.poleDiameterMm||.45))/2):3); return `<circle cx="${l.x}" cy="${l.y}" r="${Math.max(2,r)}" fill="${l.color||'#c84a3a'}" stroke="#3a2b1e" stroke-width="1"/><text x="${l.x+5}" y="${l.y-5}" font-size="10" fill="#3a2b1e">${escapeHtml(l.name||'Streetlight')}</text>`;}).join('\n'); const pads=state.buildings.map(b=>{const pts=(b.padType==='rect'?transformedRect(b):b.pointsPx).map(p=>`${p.x},${p.y}`).join(' '); const c=b.padType==='rect'?{x:b.x,y:b.y}:polygonCenter(b.pointsPx); return `<polygon points="${pts}" fill="${b.color}33" stroke="${b.color}" stroke-width="3"/><text x="${c.x+5}" y="${c.y-5}" font-size="12" fill="white">${escapeHtml(b.name)}</text>`;}).join('\n'); return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${img}${notes}${benchworks}${roads}${roadItems}${pads}${lights}</svg>`;}
  function download(content,name,type){const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([content],{type})); a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  function escapeHtml(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));} function escapeAttr(s){return escapeHtml(s).replace(/'/g,'&#39;');} function slug(s){return githubData.slugify(s, 'building');}

  function restoreAutosaveIfAvailable(){
    try{
      const raw=localStorage.getItem(AUTOSAVE_KEY);
      if(!raw) return false;
      const metaRaw=localStorage.getItem(AUTOSAVE_META_KEY);
      const meta=metaRaw?JSON.parse(metaRaw):{};
      const payload=JSON.parse(raw);
      state.autosaveRestored=true;
      loadProject(payload, {fromAutosave:true, dirtySinceManualSave:!!meta.dirtySinceManualSave});
      return true;
    }catch(err){
      console.warn('[HakoMachi Site Planner] Could not restore autosave:', err);
      return false;
    }
  }
  window.addEventListener('beforeunload', e=>{
    if(state.dirty) writeAutosave();
    if(state.dirtySinceManualSave){
      e.preventDefault();
      e.returnValue='';
      return '';
    }
  });

  // HakoMachi animated logo: replay the SMIL build-on animation on hover,
  // matching the main HakoMachi editor behavior.
  const logoSvg = document.querySelector('svg.app-logo');
  if (logoSvg && typeof logoSvg.setCurrentTime === 'function') {
    const LOGO_ANIM_DURATION_MS = 2300;
    let lastTriggerTime = performance.now();
    logoSvg.addEventListener('mouseenter', () => {
      const now = performance.now();
      if (now - lastTriggerTime < LOGO_ANIM_DURATION_MS) return;
      lastTriggerTime = now;
      try { logoSvg.setCurrentTime(0); } catch (_) { /* older browsers */ }
    });
  }

  bindSite3DButtons();
  resize();
  const restored=restoreAutosaveIfAvailable();
  state.autosaveReady=true;
  if(!restored){syncAll({skipDirty:true}); fitImage(); resetHistory('initial'); writeAutosave();}
  else { updateHistoryButtons(); }
})();
