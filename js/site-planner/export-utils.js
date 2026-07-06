function csvCell(value){
  return '"'+String(value).replaceAll('"','""')+'"';
}

export function buildingCsvExport(buildings, {normalizeBuilding}){
  const rows=[['id','name','state','type','category','widthMm','depthMm','areaMm2','rotationDeg','hakoFile','notes']];
  buildings.forEach(raw=>{
    const b=normalizeBuilding(raw);
    rows.push([b.id,b.name,b.state,b.padType,b.category,b.widthMm||'',b.depthMm||'',b.derived?.areaMm2||'',b.rotationDeg||0,b.hakoFile?.fileName||'',b.notes||'']);
  });
  return rows.map(r=>r.map(csvCell).join(',')).join('\n');
}

export function svgRoadMarkingFeature(f, deps){
  const {SVG_OP, SVG_ENGRAVE, escapeAttr, escapeHtml, markingPresetByKey, normalizeRoadFeature, svgFabricationAttrs, svgFeatureTransform}=deps;
  normalizeRoadFeature(f);
  const w=f.widthPx||24,h=f.depthPx||6,x=f.x,y=f.y,c=SVG_ENGRAVE,tr=svgFeatureTransform(f),draw=f.markingDraw||markingPresetByKey(f.markingPreset||f.markingType).draw;
  const attrs=svgFabricationAttrs(SVG_OP.ENGRAVE,'roadMarkingEtch',`data-jp-name="${escapeAttr(f.jpName||'')}"`);
  if(draw==='crosswalk'){
    const stripes=5,gap=w/(stripes+1),stripeW=Math.max(.8,gap*.38); let out='';
    const crosswalkAttrs=svgFabricationAttrs(SVG_OP.ENGRAVE,'roadMarkingEtch',`data-jp-name="${escapeAttr(f.jpName||'横断歩道')}"`);
    for(let i=0;i<stripes;i++) out+=`<rect x="${x-w/2+gap*(i+1)-stripeW/2}" y="${y-h/2}" width="${stripeW}" height="${h}" transform="${tr}" fill="none" stroke="${c}" stroke-width="0.12" ${crosswalkAttrs}/>`;
    return out;
  }
  if(draw==='diamond') return `<polygon points="${x},${y-h/2} ${x+w/2},${y} ${x},${y+h/2} ${x-w/2},${y}" transform="${tr}" fill="none" stroke="${c}" stroke-width="0.12" ${attrs}/>`;
  if(draw==='arrow') return `<path d="M ${x} ${y-h/2} L ${x+w/2} ${y-h*.05} L ${x+w*.18} ${y-h*.05} L ${x+w*.18} ${y+h/2} L ${x-w*.18} ${y+h/2} L ${x-w*.18} ${y-h*.05} L ${x-w/2} ${y-h*.05} Z" transform="${tr}" fill="none" stroke="${c}" stroke-width="0.12" ${attrs}/>`;
  if(draw==='speedNumber') return `<text x="${x}" y="${y}" transform="${tr}" text-anchor="middle" dominant-baseline="middle" font-size="${Math.max(4,h*1.15)}" fill="none" stroke="${c}" stroke-width="0.08" ${svgFabricationAttrs(SVG_OP.ENGRAVE,'roadMarkingEtch',`data-jp-name="${escapeAttr(f.jpName||'速度表示')}"`)}>${escapeHtml(f.text||'30')}</text>`;
  return `<rect x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" transform="${tr}" fill="none" stroke="${c}" stroke-width="0.12" ${attrs}/>`;
}

export function roadAssetSvgExport({data, roadFeatures, generatedIntersectionRecords = [], width, height}, deps){
  const {JP_ROAD_MARKING_STANDARD_ID, SVG_OP, SVG_ENGRAVE, SVG_RETAINED_CUT, SVG_SCRAP_CUT, escapeAttr, escapeHtml, normalizeRoadFeature, polygonCenter, svgFabricationAttrs, svgFeatureTransform, svgPathFromPoly}=deps;
  const roadSurfaces=[], sidewalkSurfaces=[], seamCuts=[], curbEtches=[], markingEtches=[], hatchCuts=[], labels=[];
  data.roads.forEach((r,ri)=>{
    if((r.roadPolygonPx||[]).length) roadSurfaces.push(`<polygon id="${escapeAttr(r.id)}_surface" points="${svgPathFromPoly(r.roadPolygonPx)}" fill="none" stroke="${SVG_RETAINED_CUT}" stroke-width="0.1" ${svgFabricationAttrs(SVG_OP.CUT_RETAINED,'roadSurfaceCut')}/>`);
    (r.sidewalkPolygonsPx||[]).forEach((sw,si)=>{ if((sw.polygon||[]).length) sidewalkSurfaces.push(`<polygon id="${escapeAttr(r.id)}_sidewalk_${si}" points="${svgPathFromPoly(sw.polygon)}" fill="none" stroke="${SVG_RETAINED_CUT}" stroke-width="0.1" ${svgFabricationAttrs(SVG_OP.CUT_RETAINED,'sidewalkSurfaceCut')}/>`); });
    (r.roadPolygonPx||[]).forEach((p,i,arr)=>{const q=arr[(i+1)%arr.length]; if(q) curbEtches.push(`<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" stroke="${SVG_ENGRAVE}" stroke-width="0.08" ${svgFabricationAttrs(SVG_OP.ENGRAVE,'curbEtch')}/>`);});
    const c=polygonCenter(r.roadPolygonPx||[]); labels.push(`<text x="${c.x}" y="${c.y}" font-size="8" fill="${SVG_ENGRAVE}" ${svgFabricationAttrs(SVG_OP.ENGRAVE,'labels')}>${escapeHtml(r.name||('Road '+(ri+1)))}</text>`);
  });
  (roadFeatures||[]).forEach(raw=>{const f=normalizeRoadFeature(raw); if(f.hidden) return; if(f.kind==='manhole'){ if(f.hatchShape==='circle') hatchCuts.push(`<circle cx="${f.x}" cy="${f.y}" r="${(f.diameterPx||18)/2}" fill="none" stroke="${SVG_SCRAP_CUT}" stroke-width="0.1" ${svgFabricationAttrs(SVG_OP.CUT_SCRAP,'roadHatchCut',`data-name="${escapeAttr(f.name||'Manhole')}"`)}/>`); else hatchCuts.push(`<rect x="${f.x-(f.widthPx||20)/2}" y="${f.y-(f.depthPx||10)/2}" width="${f.widthPx||20}" height="${f.depthPx||10}" transform="${svgFeatureTransform(f)}" fill="none" stroke="${SVG_SCRAP_CUT}" stroke-width="0.1" ${svgFabricationAttrs(SVG_OP.CUT_SCRAP,'roadHatchCut',`data-name="${escapeAttr(f.name||'Hatch')}"`)}/>`);} else {markingEtches.push(svgRoadMarkingFeature(f, deps));}});
  generatedIntersectionRecords.forEach((record,index)=>{
    if(!record?.d) return;
    const layer=record.layer||'roadMarkingEtch';
    const attrs=svgFabricationAttrs(SVG_OP.ENGRAVE,layer,`data-intersection-id="${escapeAttr(record.intersectionId||'')}" data-road-id="${escapeAttr(record.roadId||'')}" data-feature-type="${escapeAttr(record.type||'intersection')}" data-generated-index="${index}"`);
    const target=layer==='curbEtch'||layer==='roadCurbGuide'?curbEtches:markingEtches;
    target.push(`<path d="${escapeAttr(record.d)}" fill="none" stroke="${SVG_ENGRAVE}" stroke-width="0.1" ${attrs}/>`);
  });
  data.seams.forEach((s,i)=>{seamCuts.push(`<line id="seam_${i+1}" x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="${SVG_RETAINED_CUT}" stroke-width="0.1" ${svgFabricationAttrs(SVG_OP.CUT_RETAINED,'seamCut')}/>`); labels.push(`<text x="${s.x+3}" y="${s.y-3}" font-size="6" fill="${SVG_ENGRAVE}" ${svgFabricationAttrs(SVG_OP.ENGRAVE,'labels')}>S-${i+1}</text>`);});
  const style=`<style>\n.svg-cut-retained{stroke:${SVG_RETAINED_CUT};fill:none}.svg-cut-scrap{stroke:${SVG_SCRAP_CUT};fill:none}.svg-engrave{stroke:${SVG_ENGRAVE};fill:none}\n</style>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}">\n<title>HakoMachi Road Asset Export</title>\n<desc>Road surfaces, sidewalk surfaces, seam cuts, hatch cuts, Japanese road-marking etches, curb etches, and labels. Red is retained through-cut, green is scrap through-cut, and blue is engrave/score. Units follow Site Planner image-pixel coordinate space; use the project calibration for model-mm conversion.</desc>\n${style}\n<g id="roadSurfaceCut">${roadSurfaces.join('\n')}</g>\n<g id="sidewalkSurfaceCut">${sidewalkSurfaces.join('\n')}</g>\n<g id="roadHatchCut">${hatchCuts.join('\n')}</g>\n<g id="roadMarkingEtch" data-standard="${JP_ROAD_MARKING_STANDARD_ID}">${markingEtches.join('\n')}</g>\n<g id="seamCut">${seamCuts.join('\n')}</g>\n<g id="curbEtch">${curbEtches.join('\n')}</g>\n<g id="labels">${labels.join('\n')}</g>\n</svg>`;
}

export function trackSvgExport(tracks, deps){
  const {TRACK_PROFILE_DEFAULTS, escapeAttr, normalizeTrack, offsetTrackPath, trackPathSamples, trackProfilePx, trackTieSegments}=deps;
  const pathAttr=pts=>pts.map(p=>`${p.x},${p.y}`).join(' ');
  return (tracks||[]).map(raw=>{
    const t=normalizeTrack(raw);
    if(t.hidden || (t.pointsPx||[]).length<2) return '';
    const path=trackPathSamples(t,18);
    const profile=trackProfilePx(t);
    const railOffset=profile.gauge/2;
    const roadbed=`<polyline points="${pathAttr(path)}" fill="none" stroke="${escapeAttr(t.roadbedColor||TRACK_PROFILE_DEFAULTS.roadbedColor)}" stroke-width="${profile.roadbedWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="0.72"/><polyline points="${pathAttr(path)}" fill="none" stroke="${escapeAttr(t.roadbedTopColor||TRACK_PROFILE_DEFAULTS.roadbedTopColor)}" stroke-width="${profile.roadbedTopWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="0.84"/>`;
    const rails=[offsetTrackPath(path,railOffset),offsetTrackPath(path,-railOffset)]
      .map(pts=>`<polyline points="${pathAttr(pts)}" fill="none" stroke="${escapeAttr(t.color||'#4b4438')}" stroke-width="${profile.railWidth}" stroke-linecap="round" stroke-linejoin="round"/>`)
      .join('');
    const ties=trackTieSegments(t).map(seg=>`<line x1="${seg.a.x}" y1="${seg.a.y}" x2="${seg.b.x}" y2="${seg.b.y}" stroke="${escapeAttr(t.tieColor||'#8a6f43')}" stroke-width="${profile.tieWidth}" stroke-linecap="round"/>`).join('');
    return `<g data-type="track" data-name="${escapeAttr(t.name||'Track')}" data-profile="${escapeAttr(TRACK_PROFILE_DEFAULTS.reference)}">${roadbed}${ties}${rails}</g>`;
  }).join('\n');
}

export function sitePlanSvgExport({state, width, height, tracksSvg}, deps){
  const {
    buildingCenter,
    escapeHtml,
    mmToPx,
    normalizeBenchworkOutline,
    normalizeRoad,
    normalizeRoadFeature,
    normalizeStreetlight,
    polygonCenter,
    visibleBuildingPolygons,
  }=deps;
  const img=state.imageMeta?.dataUrl?`<image href="${state.imageMeta.dataUrl}" x="0" y="0" width="${width}" height="${height}" opacity="${state.imageOpacity}"/>`:'';
  const notes=state.annotations.map(st=>`<polyline points="${(st.points||[]).map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="${st.color||'#6f4326'}" stroke-width="${st.baseWidth||2.2}" stroke-linecap="round" stroke-linejoin="round"/>`).join('\n');
  const benchworks=state.benchworkOutlines.map(bw=>{
    normalizeBenchworkOutline(bw);
    const pts=bw.pointsPx||[];
    if(pts.length<2) return '';
    let d=`M ${pts[0].x} ${pts[0].y}`;
    for(let i=0;i<pts.length;i++){
      const b=pts[(i+1)%pts.length], c=bw.curvesPx?.[i];
      d += c ? ` Q ${c.x} ${c.y} ${b.x} ${b.y}` : ` L ${b.x} ${b.y}`;
    }
    d+=' Z';
    return `<path d="${d}" fill="rgba(47,111,78,.05)" stroke="${bw.color||'#2f6f4e'}" stroke-width="3" stroke-dasharray="9 7"/>`;
  }).join('\n');
  const roads=state.roads.map(r=>{
    normalizeRoad(r);
    const side=(r.sidewalkPolygonsPx||[]).map(sw=>`<polygon points="${(sw.polygon||[]).map(p=>`${p.x},${p.y}`).join(' ')}" fill="rgba(226,214,188,.62)" stroke="#b9aa86" stroke-width="1"/>`).join('');
    const road=`<polygon points="${(r.roadPolygonPx||[]).map(p=>`${p.x},${p.y}`).join(' ')}" fill="rgba(111,106,94,.26)" stroke="#6f6a5e" stroke-width="2"/>`;
    return side+road;
  }).join('\n');
  const roadItems=(state.roadFeatures||[]).map(f=>{
    normalizeRoadFeature(f);
    if(f.kind==='manhole'){
      return f.hatchShape==='circle'
        ? `<circle cx="${f.x}" cy="${f.y}" r="${(f.diameterPx||18)/2}" fill="rgba(58,43,30,.18)" stroke="#3a2b1e" stroke-width="1"/>`
        : `<rect x="${f.x-(f.widthPx||20)/2}" y="${f.y-(f.depthPx||10)/2}" width="${f.widthPx||20}" height="${f.depthPx||10}" transform="rotate(${f.rotationDeg||0} ${f.x} ${f.y})" fill="rgba(58,43,30,.18)" stroke="#3a2b1e" stroke-width="1"/>`;
    }
    return `<rect x="${f.x-(f.widthPx||24)/2}" y="${f.y-(f.depthPx||6)/2}" width="${f.widthPx||24}" height="${f.depthPx||6}" transform="rotate(${f.rotationDeg||0} ${f.x} ${f.y})" fill="${f.color||'#f7f2df'}" stroke="none"/>`;
  }).join('\n');
  const lights=state.streetlights.map(l=>{
    normalizeStreetlight(l);
    const r=(state.pxPerMm?mmToPx((l.mode==='anchored'?(l.anchor?.mountMode==='roadEdgeBulbMount'?(l.anchor?.bulbMountDiameterMm||3):(l.anchor?.cutHoleDiameterMm||1.2)):(l.poleDiameterMm||.45))/2):3);
    return `<circle cx="${l.x}" cy="${l.y}" r="${Math.max(2,r)}" fill="${l.color||'#c84a3a'}" stroke="#3a2b1e" stroke-width="1"/><text x="${l.x+5}" y="${l.y-5}" font-size="10" fill="#3a2b1e">${escapeHtml(l.name||'Streetlight')}</text>`;
  }).join('\n');
  const pads=state.buildings.map(b=>{
    const polys=visibleBuildingPolygons(b);
    const allPts=polys.flat();
    const c=allPts.length?polygonCenter(allPts):buildingCenter(b);
    const shapes=polys.map(poly=>`<polygon points="${poly.map(p=>`${p.x},${p.y}`).join(' ')}" fill="${b.color}33" stroke="${b.color}" stroke-width="3"/>`).join('');
    return `${shapes}<text x="${c.x+5}" y="${c.y-5}" font-size="12" fill="white">${escapeHtml(b.name)}</text>`;
  }).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${img}${notes}${benchworks}${roads}${tracksSvg}${roadItems}${pads}${lights}</svg>`;
}
