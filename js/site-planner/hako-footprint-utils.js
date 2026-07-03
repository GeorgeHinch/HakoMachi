function asNum(value){
  const n=Number(value);
  return Number.isFinite(n) ? n : null;
}

export function firstNum(...values){
  for(const value of values){
    const n=asNum(value);
    if(n!=null && n>0) return n;
  }
  return null;
}

function pointsFromAny(value){
  if(!value) return null;
  if(Array.isArray(value)){
    const pts=value.map(point=>Array.isArray(point)
      ? {x:asNum(point[0]),y:asNum(point[1])}
      : {x:asNum(point.x??point.X??point.left),y:asNum(point.y??point.Y??point.top)}
    ).filter(point=>point.x!=null&&point.y!=null);
    return pts.length>=3 ? pts : null;
  }
  return pointsFromAny(value.pointsMm||value.pointsPx||value.points||value.polygon||value.vertices);
}

function rectsToUnionPolygonMm(rects){
  rects=(rects||[]).map(rect=>({
    x1:Math.min(asNum(rect.x1),asNum(rect.x2)), y1:Math.min(asNum(rect.y1),asNum(rect.y2)),
    x2:Math.max(asNum(rect.x1),asNum(rect.x2)), y2:Math.max(asNum(rect.y1),asNum(rect.y2))
  })).filter(rect=>Number.isFinite(rect.x1)&&Number.isFinite(rect.y1)&&Number.isFinite(rect.x2)&&Number.isFinite(rect.y2)&&rect.x2>rect.x1&&rect.y2>rect.y1);
  if(!rects.length) return null;
  const xs=[...new Set(rects.flatMap(rect=>[rect.x1,rect.x2]))].sort((a,b)=>a-b);
  const ys=[...new Set(rects.flatMap(rect=>[rect.y1,rect.y2]))].sort((a,b)=>a-b);
  if(xs.length<2||ys.length<2) return null;
  const filled=new Set();
  for(let ix=0;ix<xs.length-1;ix++){
    for(let iy=0;iy<ys.length-1;iy++){
      const cx=(xs[ix]+xs[ix+1])/2, cy=(ys[iy]+ys[iy+1])/2;
      if(rects.some(rect=>cx>=rect.x1&&cx<=rect.x2&&cy>=rect.y1&&cy<=rect.y2)) filled.add(`${ix},${iy}`);
    }
  }
  const edges=[];
  const has=(ix,iy)=>filled.has(`${ix},${iy}`);
  const add=(x1,y1,x2,y2)=>edges.push({x1,y1,x2,y2});
  for(const key of filled){
    const [ix,iy]=key.split(',').map(Number);
    if(!has(ix,iy-1)) add(xs[ix],ys[iy],xs[ix+1],ys[iy]);
    if(!has(ix+1,iy)) add(xs[ix+1],ys[iy],xs[ix+1],ys[iy+1]);
    if(!has(ix,iy+1)) add(xs[ix+1],ys[iy+1],xs[ix],ys[iy+1]);
    if(!has(ix-1,iy)) add(xs[ix],ys[iy+1],xs[ix],ys[iy]);
  }
  const keyOf=(x,y)=>`${Math.round(x*1000000)/1000000},${Math.round(y*1000000)/1000000}`;
  const outgoing=new Map();
  edges.forEach(edge=>{
    const key=keyOf(edge.x1,edge.y1);
    if(!outgoing.has(key)) outgoing.set(key,[]);
    outgoing.get(key).push(edge);
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
    const candidates=(outgoing.get(keyOf(nextPt.x,nextPt.y))||[]).filter(edge=>!used.has(`${edge.x1},${edge.y1},${edge.x2},${edge.y2}`));
    cur=candidates[0]||null;
  }
  if(pts.length<4) return null;
  if(keyOf(pts[0].x,pts[0].y)===keyOf(pts[pts.length-1].x,pts[pts.length-1].y)) pts.pop();
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
  wings.forEach(wing=>{
    if(!wing || wing.enabled===false) return;
    const face=String(wing.face||'').toLowerCase();
    const off=asNum(wing.offset) ?? 0;
    const span=firstNum(wing.span, wing.width, wing.length);
    const wingDepth=firstNum(wing.depth, wing.projection, wing.extend);
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

export function collectArrayFields(root, paths){
  const out=[];
  const read=(obj,path)=>path.reduce((value,key)=>value&&value[key],obj);
  paths.forEach(path=>{
    const value=read(root,path);
    if(Array.isArray(value)) out.push(...value);
  });
  return out;
}

export function extractHakoTrimLinesMm(cfg){
  if(!cfg || typeof cfg!=='object') return [];
  const cuts=collectArrayFields(cfg,[
    ['layoutCuts'], ['trimLines'], ['cutLines'], ['shapeCuts'], ['shapeEditor','layoutCuts'],
    ['shapeEditor','cutLines'], ['geometry','layoutCuts'], ['building','layoutCuts']
  ]);
  const items=[];
  cuts.forEach(cut=>{
    if(!cut || cut.enabled===false) return;
    const type=String(cut.type||cut.kind||'line').toLowerCase();
    const x1=firstNum(cut.x1,cut.startX,cut.fromX,cut.start?.x,cut.from?.x);
    const y1=firstNum(cut.y1,cut.startY,cut.fromY,cut.start?.y,cut.from?.y);
    const x2=firstNum(cut.x2,cut.endX,cut.toX,cut.end?.x,cut.to?.x);
    const y2=firstNum(cut.y2,cut.endY,cut.toY,cut.end?.y,cut.to?.y);
    if(!Number.isFinite(x1)||!Number.isFinite(y1)||!Number.isFinite(x2)||!Number.isFinite(y2)) return;
    if(type==='arc' || Number.isFinite(Number(cut.cx ?? cut.centerX ?? cut.center?.x))){
      const cx=firstNum(cut.cx,cut.centerX,cut.center?.x);
      const cy=firstNum(cut.cy,cut.centerY,cut.center?.y);
      if(Number.isFinite(cx)&&Number.isFinite(cy)){
        items.push({type:'arc',x1,y1,x2,y2,cx,cy,bulgeSide:firstNum(cut.bulgeSide,cut.side,cut.direction) ?? 1,label:cut.name||cut.id||'trim'});
        return;
      }
    }
    items.push({type:'line',x1,y1,x2,y2,label:cut.name||cut.id||'trim'});
  });
  return items;
}

export function deriveFootprintFromHakoConfig(cfg){
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

export function sizeFromDerivedHakoFootprint(derived){
  if(!derived) return null;
  if(derived.padType==='rect'){
    const widthMm=firstNum(derived.widthMm);
    const depthMm=firstNum(derived.depthMm);
    return widthMm && depthMm ? {widthMm, depthMm, source:derived.source||'rectangle'} : null;
  }
  if(Array.isArray(derived.pointsMm) && derived.pointsMm.length>=3){
    const xs=derived.pointsMm.map(point=>Number(point.x)).filter(Number.isFinite);
    const ys=derived.pointsMm.map(point=>Number(point.y)).filter(Number.isFinite);
    if(xs.length && ys.length) return {widthMm:Math.max(...xs)-Math.min(...xs), depthMm:Math.max(...ys)-Math.min(...ys), source:derived.source||'polygon bounds'};
  }
  return null;
}
