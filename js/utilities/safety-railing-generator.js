import * as HakoMachiUtils from './shared.js';

window.addEventListener('DOMContentLoaded', function(){
'use strict';
var SVG_OP=HakoMachiUtils.SVG_FABRICATION_OPERATIONS;
var CUT=HakoMachiUtils.svgFabricationColor(SVG_OP.CUT_RETAINED), SCRAP=HakoMachiUtils.svgFabricationColor(SVG_OP.CUT_SCRAP), ENG=HakoMachiUtils.svgFabricationColor(SVG_OP.ENGRAVE), PATH='#222222', STAIR='#7c3aed';
var pathPoints=null;
var pathPointsRawSvgUnits=false;
var segmentSettings=[];
var U=HakoMachiUtils;
function el(id){return U.byId(id);}
function val(id){return U.numberValue(id);}
function fixed(n){return U.fixed(n);}
function esc(s){return U.escapeHtml(s);}
function distance(a,b){return Math.hypot(b.x-a.x,b.y-a.y);}
function unit(a,b){var d=distance(a,b)||1; return {x:(b.x-a.x)/d,y:(b.y-a.y)/d,len:d};}
function norm(u){return {x:-u.y,y:u.x};}
  function operationForClass(cls){return cls==='cut'?SVG_OP.CUT_RETAINED:(cls==='scrap'?SVG_OP.CUT_SCRAP:(cls==='engrave'?SVG_OP.ENGRAVE:null));}
  function opAttr(cls){var op=operationForClass(cls); return op?' data-operation="'+op+'"':'';}
  function line(x1,y1,x2,y2,cls){return '<line class="'+cls+'"'+opAttr(cls)+' x1="'+fixed(x1)+'" y1="'+fixed(y1)+'" x2="'+fixed(x2)+'" y2="'+fixed(y2)+'"/>';}
  function rect(x,y,w,h,cls){return '<rect class="'+cls+'"'+opAttr(cls)+' x="'+fixed(x)+'" y="'+fixed(y)+'" width="'+fixed(w)+'" height="'+fixed(h)+'"/>';}
  function poly(pts,cls){return '<polygon class="'+cls+'"'+opAttr(cls)+' points="'+pts.map(function(p){return fixed(p.x)+','+fixed(p.y);}).join(' ')+'"/>';}
function pathD(pts,closed){if(!pts.length)return ''; var d='M '+fixed(pts[0].x)+' '+fixed(pts[0].y); for(var i=1;i<pts.length;i++)d+=' L '+fixed(pts[i].x)+' '+fixed(pts[i].y); if(closed)d+=' Z'; return d;}
  function pathTag(pts,cls,extra){return '<path class="'+cls+'"'+opAttr(cls)+' d="'+pathD(pts,false)+'" '+(extra||'')+'/>';}
  function closedPath(pts,cls,extra){return '<path class="'+cls+'"'+opAttr(cls)+' d="'+pathD(pts,true)+'" '+(extra||'')+'/>';}
  function svgWrap(w,h,body){return '<svg xmlns="http://www.w3.org/2000/svg" width="'+fixed(w)+'mm" height="'+fixed(h)+'mm" viewBox="0 0 '+fixed(w)+' '+fixed(h)+'"><style>.cut{fill:none;stroke:'+CUT+';stroke-width:.12;vector-effect:non-scaling-stroke}.scrap{fill:none;stroke:'+SCRAP+';stroke-width:.12;vector-effect:non-scaling-stroke}.engrave{fill:none;stroke:'+ENG+';stroke-width:.12;vector-effect:non-scaling-stroke}.path{fill:none;stroke:'+PATH+';stroke-width:.28;vector-effect:non-scaling-stroke}.basePreview{fill:none;stroke:'+CUT+';stroke-opacity:.25;stroke-linejoin:miter;stroke-linecap:butt;vector-effect:non-scaling-stroke}.stair{fill:none;stroke:'+STAIR+';stroke-width:.55;vector-effect:non-scaling-stroke}.txt{font:2.7px system-ui,sans-serif;fill:#334155}</style>'+body+'</svg>';}
function options(){var t=Math.max(.05,val('thicknessMm')), railT=Math.max(.05,val('railPoleThicknessMm')||t), rawTab=Math.max(.05,val('tabDepthMm')); return {length:Math.max(5,val('lengthMm')),height:Math.max(2,val('heightMm')),t:t,railT:railT,maxPole:Math.max(3,val('maxPoleSpanMm')),svgScale:Math.max(0.0001,val('svgUnitScaleMm')||1),bendText:el('bendPointsMm').value,baseW:Math.max(.8,val('baseWidthMm')),tabDepth:Math.min(rawTab,t),rawTabDepth:rawTab,slotClear:Math.max(0,val('slotClearanceMm')),maxTab:Math.max(5,val('maxTabSpanMm')),margin:Math.max(0,val('edgeMarginMm')),mode:el('mode').value};}
function nums(s){var m=String(s||'').match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)||[]; return m.map(Number).filter(isFinite);}
function dedupe(pts){var out=[]; pts.forEach(function(p){if(out.length===0 || distance(out[out.length-1],p)>0.001)out.push({x:+p.x,y:+p.y});}); return out;}
function simplifyPolyline(pts){
  pts=dedupe(pts||[]);
  if(pts.length<3)return pts;
  var out=[pts[0]];
  for(var i=1;i<pts.length-1;i++){
    var a=out[out.length-1], b=pts[i], c=pts[i+1];
    var ab={x:b.x-a.x,y:b.y-a.y}, bc={x:c.x-b.x,y:c.y-b.y};
    var lab=Math.hypot(ab.x,ab.y), lbc=Math.hypot(bc.x,bc.y);
    if(lab<0.001)continue;
    var cross=Math.abs(ab.x*bc.y-ab.y*bc.x), dot=ab.x*bc.x+ab.y*bc.y;
    var almostCollinear=(lbc>0.001 && cross/(lab*lbc)<0.0008 && dot>=0);
    if(!almostCollinear)out.push(b);
  }
  out.push(pts[pts.length-1]);
  return dedupe(out);
}
function capPolyline(pts,maxPts){
  pts=simplifyPolyline(pts||[]);
  maxPts=maxPts||120;
  if(pts.length<=maxPts)return pts;
  var step=(pts.length-1)/(maxPts-1), out=[];
  for(var i=0;i<maxPts;i++)out.push(pts[Math.round(i*step)]);
  return simplifyPolyline(out);
}
function cleanupIllustratorStrokeOutline(pts, tag){
  pts=dedupe(pts||[]);
  if(pts.length<2)return pts;
  // Illustrator sometimes copies a selected stroked line as the outline of the stroke
  // (a very thin open/closed rectangle) instead of as the original centerline. If that
  // is treated as a polyline, the generator sees a fake return leg and creates a blank
  // end block. Convert those thin stroke outlines back to their centerline.
  var closed=false;
  if(pts.length>2 && distance(pts[0],pts[pts.length-1])<0.01){
    closed=true;
    pts=pts.slice(0,-1);
  }
  var xs=pts.map(function(p){return p.x;}), ys=pts.map(function(p){return p.y;});
  var minX=Math.min.apply(null,xs), maxX=Math.max.apply(null,xs), minY=Math.min.apply(null,ys), maxY=Math.max.apply(null,ys);
  var w=maxX-minX, h=maxY-minY, longDim=Math.max(w,h), shortDim=Math.min(w,h);
  // Stronger Illustrator cleanup: a copied stroked line can arrive as a long, very thin
  // filled outline with many points, not just 4. Collapse any very thin outline-like
  // geometry to its centerline. This avoids interpreting the stroke outline itself as
  // the railing centerline, which creates a large blank rectangular end cap.
  var looksLikeStrokeOutline=(pts.length>=4 && longDim>0.001 && shortDim>0 && shortDim/longDim<0.12);
  if(looksLikeStrokeOutline){
    if(w>=h){return [{x:minX,y:(minY+maxY)/2},{x:maxX,y:(minY+maxY)/2}];}
    return [{x:(minX+maxX)/2,y:minY},{x:(minX+maxX)/2,y:maxY}];
  }
  // Also catch the common open outline order: short side, long side, short side.
  // Example: M 0,0 L 0,2 L 300,2 L 300,0 for a straight horizontal line.
  if(pts.length===4){
    var d01=distance(pts[0],pts[1]), d12=distance(pts[1],pts[2]), d23=distance(pts[2],pts[3]);
    if(d12>0.001 && d01/d12<0.12 && d23/d12<0.12){
      return [{x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2},{x:(pts[2].x+pts[3].x)/2,y:(pts[2].y+pts[3].y)/2}];
    }
  }
  return pts;
}
function parseAttrs(tag){
  var attrs={};
  String(tag||'').replace(/([:\w-]+)\s*=\s*("[^"]*"|'[^']*')/g,function(_,k,v){attrs[k]=v.slice(1,-1);});
  return attrs;
}
function parseTransform(str){
  var m=[1,0,0,1,0,0];
  function mul(a,b){return [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}
  String(str||'').replace(/(matrix|translate|scale)\s*\(([^)]*)\)/gi,function(_,name,args){
    var a=nums(args), t=[1,0,0,1,0,0]; name=name.toLowerCase();
    if(name==='matrix'&&a.length>=6)t=[a[0],a[1],a[2],a[3],a[4],a[5]];
    if(name==='translate')t=[1,0,0,1,a[0]||0,a.length>1?a[1]:0];
    if(name==='scale')t=[a[0]||1,0,0,a.length>1?a[1]:(a[0]||1),0,0];
    m=mul(m,t);
  });
  return m;
}
function applyMatrix(p,m){return {x:p.x*m[0]+p.y*m[2]+m[4],y:p.x*m[1]+p.y*m[3]+m[5]};}
function parsePathPoints(d){
  d=String(d||'');
  if(d.length>30000)d=d.slice(0,30000); // safety for pasted full Illustrator documents
  var tokens=(d.match(/[MLHVCSQTAZmlhvcsqtaz]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi)||[]);
  if(tokens.length>4000)tokens=tokens.slice(0,4000);
  var i=0, cmd='M', cur={x:0,y:0}, start=null, pts=[];
  function isCmd(v){return /^[MLHVCSQTAZmlhvcsqtaz]$/.test(v);} function next(){return Number(tokens[i++]);}
  function add(x,y,rel){if(rel){x+=cur.x;y+=cur.y;} if(isFinite(x)&&isFinite(y)){cur={x:x,y:y}; if(!start)start={x:x,y:y}; pts.push({x:x,y:y});}}
  while(i<tokens.length && pts.length<1000){
    if(isCmd(tokens[i]))cmd=tokens[i++];
    var rel=(cmd===cmd.toLowerCase()), c=cmd.toUpperCase();
    if(c==='M'||c==='L'){
      while(i<tokens.length&&!isCmd(tokens[i])&&pts.length<1000){var x=next(), y=next(); add(x,y,rel); if(c==='M')cmd=rel?'l':'L';}
    } else if(c==='H'){
      while(i<tokens.length&&!isCmd(tokens[i])&&pts.length<1000){var hx=next(); if(rel)hx+=cur.x; add(hx,cur.y,false);}
    } else if(c==='V'){
      while(i<tokens.length&&!isCmd(tokens[i])&&pts.length<1000){var vy=next(); if(rel)vy+=cur.y; add(cur.x,vy,false);}
    } else if(c==='C'){
      while(i+5<tokens.length&&!isCmd(tokens[i])&&pts.length<1000){next();next();next();next(); var x3=next(),y3=next(); add(x3,y3,rel);}
    } else if(c==='S'||c==='Q'){
      while(i+3<tokens.length&&!isCmd(tokens[i])&&pts.length<1000){next();next(); var xq=next(),yq=next(); add(xq,yq,rel);}
    } else if(c==='T'){
      while(i+1<tokens.length&&!isCmd(tokens[i])&&pts.length<1000){var xt=next(),yt=next(); add(xt,yt,rel);}
    } else if(c==='A'){
      while(i+6<tokens.length&&!isCmd(tokens[i])&&pts.length<1000){next();next();next();next();next(); var xa=next(),ya=next(); add(xa,ya,rel);}
    } else if(c==='Z'){
      if(start)pts.push({x:start.x,y:start.y});
    } else i++;
  }
  return capPolyline(pts,240);
}
function tagCandidates(text){
  text=String(text||'');
  if(text.length>120000)text=text.slice(0,120000);
  var tags=[], re=/<\s*(line|polyline|polygon|path)\b[^>]*>/gi, m;
  while((m=re.exec(text)) && tags.length<20){tags.push({tag:m[1].toLowerCase(),raw:m[0],attrs:parseAttrs(m[0])});}
  return tags;
}
function pointsFromCandidate(c){
  var pts=[], a=c.attrs||{}, tag=c.tag;
  if(tag==='line')pts=[{x:parseFloat(a.x1)||0,y:parseFloat(a.y1)||0},{x:parseFloat(a.x2)||0,y:parseFloat(a.y2)||0}];
  else if(tag==='polyline'||tag==='polygon'){
    var n=nums(a.points||'');
    if(n.length>2000)n=n.slice(0,2000);
    for(var i=0;i+1<n.length;i+=2)pts.push({x:n[i],y:n[i+1]});
  } else if(tag==='path')pts=parsePathPoints(a.d||'');
  var mx=parseTransform(a.transform||'');
  pts=pts.map(function(p){return applyMatrix(p,mx);});
  pts=cleanupIllustratorStrokeOutline(pts,tag);
  return capPolyline(pts,240);
}

function extractUsablePaste(raw){
  raw=String(raw||'');
  if(!raw)return '';
  // Illustrator often puts a complete, very large SVG/HTML document on the clipboard.
  // Do not put that whole payload into the textarea. Find the first usable geometry tag and discard the rest.
  var maxSearch=250000;
  var s=raw.length>maxSearch?raw.slice(0,maxSearch):raw;
  var tagRe=/<\s*(line|polyline|polygon|path)\b[^>]*>/ig, m, best='', bestScore=-1, count=0;
  while((m=tagRe.exec(s)) && count<30){
    count++;
    var tag=m[0];
    var score=tag.length;
    if(/\bd\s*=|\bpoints\s*=|\bx1\s*=/.test(tag))score+=10000;
    if(/fill\s*=\s*['\"]none|stroke\s*=|class\s*=/.test(tag))score+=1000;
    if(score>bestScore){bestScore=score; best=tag;}
  }
  if(best)return best;
  var d=/\bd\s*=\s*(['\"])([\s\S]{0,30000}?)\1/i.exec(s);
  if(d)return '<path d="'+esc(d[2])+'" />';
  // Direct path data fallback, capped so accidental full documents cannot be re-parsed forever.
  return raw.slice(0,30000);
}
function handlePastedSvgFieldPaste(e){
  var cd=e.clipboardData || window.clipboardData;
  if(!cd)return;
  var raw='';
  try{raw=cd.getData('image/svg+xml')||cd.getData('text/plain')||cd.getData('text/html')||'';}catch(_){raw='';}
  if(!raw)return;
  // Always intercept SVG-like/large pastes so the browser never inserts megabytes into the textarea.
  if(raw.length>50000 || /<svg|<path|<polyline|<polygon|<line|adobe|illustrator/i.test(raw)){
    e.preventDefault();
    var field=el('pastedSvgLine');
    field.value='Reading pasted SVG geometry…';
    el('stats').textContent='Reading pasted SVG geometry; large Illustrator clipboard data is being simplified before preview.';
    setTimeout(function(){
      field.value=extractUsablePaste(raw);
      applyPastedLineFromText(false);
    },0);
  }
}

function parseSvgLine(text){
  text=String(text||'').trim(); if(!text)return null;
  var candidates=tagCandidates(text), best=null, bestScore=-Infinity;
  if(candidates.length){
    candidates.forEach(function(c){
      var pts=pointsFromCandidate(c); if(!pts||pts.length<2)return;
      var segs=segments(pts), len=segs.length?segs[segs.length-1].cumEnd:0;
      var style=((c.attrs.style||'')+' '+(c.attrs.class||'')+' '+(c.attrs.stroke||'')+' '+(c.attrs.fill||'')).toLowerCase();
      var score=len - pts.length*0.05;
      if(/none/.test(c.attrs.fill||''))score+=50;
      if(/path|line|stroke/.test(style))score+=10;
      if(score>bestScore){bestScore=score; best=pts;}
    });
    if(best)return best;
  }
  // Fallback: allow direct pasted path data such as "M 0 0 L 10 0".
  return parsePathPoints(text);
}
function manualPoints(o){var b=nums(o.bendText).filter(function(v){return v>0&&v<o.length;}).sort(function(a,b){return a-b;}); return [0].concat(b).concat([o.length]).map(function(x){return {x:x,y:0};});}
function sourcePoints(o){return (pathPoints&&pathPoints.length>1)?(pathPointsRawSvgUnits?scalePoints(pathPoints,o.svgScale):pathPoints):manualPoints(o);}
function scalePoints(pts,scale){scale=Math.max(0.0001,parseFloat(scale)||1); return (pts||[]).map(function(p){return {x:(+p.x||0)*scale,y:(+p.y||0)*scale};});}
function segments(pts){var out=[], cum=0; for(var i=0;i<pts.length-1;i++){var len=distance(pts[i],pts[i+1]); if(len>0.001){out.push({index:i,start:pts[i],end:pts[i+1],len:len,cumStart:cum,cumEnd:cum+len}); cum+=len;}} return out;}
function isTrueCorner(prev,cur,next){var a=unit(prev,cur), b=unit(cur,next); var cross=Math.abs(a.x*b.y-a.y*b.x); var dot=a.x*b.x+a.y*b.y; return cross>0.001 || dot<0.999;}
function trueCornerBendPositions(pts,segs){var out=[]; if(!pts||pts.length<3||!segs||!segs.length)return out; for(var i=1;i<pts.length-1;i++){ if(isTrueCorner(pts[i-1],pts[i],pts[i+1]) && segs[i-1]) out.push(segs[i-1].cumEnd); } return out;}
function isStairSection(st){return Math.abs((st&&parseFloat(st.rise))||0)>0.0001;}
function preserveSettings(n){var old=segmentSettings.slice(); segmentSettings=[]; for(var i=0;i<n;i++){var st=old[i]||{rise:0,flatStart:0}; segmentSettings.push({rise:parseFloat(st.rise)||0,flatStart:parseFloat(st.flatStart)||0});}}
function bounds(pts,pad){var xs=pts.map(function(p){return p.x;}), ys=pts.map(function(p){return p.y;}); return {minX:Math.min.apply(null,xs)-pad,minY:Math.min.apply(null,ys)-pad,maxX:Math.max.apply(null,xs)+pad,maxY:Math.max.apply(null,ys)+pad};}
function shift(p,b){return {x:p.x-b.minX,y:p.y-b.minY};}
function updateSegmentEditor(){var o=options(), segs=segments(sourcePoints(o)); preserveSettings(segs.length); if(pathPoints&&segs.length)el('lengthMm').value=fixed(segs[segs.length-1].cumEnd); var root=el('segmentEditor'); if(!segs.length){root.innerHTML='<div class="small">No sections.</div>'; return;} var html='<table class="segTable"><thead><tr><th>#</th><th>Length</th><th>Rise change</th><th>Flat before rise</th><th>Type</th><th>Angle</th></tr></thead><tbody>'; segs.forEach(function(s,i){var st=segmentSettings[i], rise=parseFloat(st.rise)||0, flatStart=Math.max(0,Math.min(s.len,parseFloat(st.flatStart)||0)), stair=isStairSection(st), run=Math.max(0.001,s.len-(stair?flatStart:0)), ang=stair?Math.atan2(rise,run)*180/Math.PI:0; html+='<tr><td>'+(i+1)+'</td><td>'+s.len.toFixed(2)+'</td><td><input type="number" class="segRise" data-i="'+i+'" step="0.1" value="'+esc(rise)+'"></td><td><input type="number" class="segFlatStart" data-i="'+i+'" step="0.1" min="0" value="'+esc(flatStart)+'"></td><td>'+(stair?'Stair':'Flat')+'</td><td>'+ang.toFixed(1)+'°</td></tr>';}); html+='</tbody></table>'; root.innerHTML=html; root.querySelectorAll('.segRise').forEach(function(x){x.addEventListener('input',function(e){
      var raw=e.target.value;
      segmentSettings[+e.target.dataset.i].rise=(raw==='-'||raw===''||raw==='.'||raw==='-.')?raw:(parseFloat(raw)||0);
      regenerate(false);
    });
    x.addEventListener('change',function(e){
      segmentSettings[+e.target.dataset.i].rise=parseFloat(e.target.value)||0;
      updateSegmentEditor();
      regenerate(false);
    });}); root.querySelectorAll('.segFlatStart').forEach(function(x){x.addEventListener('input',function(e){segmentSettings[+e.target.dataset.i].flatStart=parseFloat(e.target.value)||0; regenerate(false);}); x.addEventListener('change',function(e){segmentSettings[+e.target.dataset.i].flatStart=parseFloat(e.target.value)||0; updateSegmentEditor(); regenerate(false);});});}
function pointAt(segs,pos){var s=segs[segs.length-1]; for(var i=0;i<segs.length;i++){if(pos>=segs[i].cumStart-0.0001&&pos<=segs[i].cumEnd+0.0001){s=segs[i];break;}} var f=Math.max(0,Math.min(1,(pos-s.cumStart)/(s.len||1))); return {seg:s,p:{x:s.start.x+(s.end.x-s.start.x)*f,y:s.start.y+(s.end.y-s.start.y)*f}};}
function crossAt(segs,pos,o,b,cls,w){var info=pointAt(segs,pos), u=unit(info.seg.start,info.seg.end), n=norm(u), p=shift(info.p,b), half=(w||o.baseW)/2; return line(p.x-n.x*half,p.y-n.y*half,p.x+n.x*half,p.y+n.y*half,cls||'engrave');}
function crossAtOnSegment(seg,pos,o,b,cls,w){var f=Math.max(0,Math.min(1,(pos-seg.cumStart)/(seg.len||1))), p={x:seg.start.x+(seg.end.x-seg.start.x)*f,y:seg.start.y+(seg.end.y-seg.start.y)*f}, u=unit(seg.start,seg.end), n=norm(u), ps=shift(p,b), half=(w||o.baseW)/2; return line(ps.x-n.x*half,ps.y-n.y*half,ps.x+n.x*half,ps.y+n.y*half,cls||'engrave');}
function slotAt(segs,pos,o,b){var info=pointAt(segs,pos), u=unit(info.seg.start,info.seg.end), n=norm(u), p=shift(info.p,b), L=Math.max(2.4,o.t*5)/2, W=(o.t+o.slotClear)/2; return poly([{x:p.x-u.x*L-n.x*W,y:p.y-u.y*L-n.y*W},{x:p.x+u.x*L-n.x*W,y:p.y+u.y*L-n.y*W},{x:p.x+u.x*L+n.x*W,y:p.y+u.y*L+n.y*W},{x:p.x-u.x*L+n.x*W,y:p.y-u.y*L+n.y*W}],'scrap').replace('<polygon ','<polygon data-part="base-tab-slot" ');}
function tabPositions(total,bends,o){
  var tabW=Math.max(2.4,o.t*5), target=Math.min(18,o.maxTab), minGap=tabW+1.8, edgeInset=Math.max(2.2,tabW/2+.7);
  var narrowBase=o.baseW<5;
  // Narrow bases become unreadable and weak if every tiny stair/corner fragment gets its own slot.
  // For narrow base strips, only place tabs on substantial straight spans and do not force
  // extra end tabs into short terminal slope/transition sections.
  var minSectionLen=narrowBase?Math.max(12,tabW*4):Math.max(3.5,tabW+1.2);
  var breaks=[0].concat((bends||[]).filter(function(v){return v>0&&v<total;})).concat([total]).sort(function(a,b){return a-b;});
  var raw=[];
  function add(v){if(isFinite(v)&&v>edgeInset*.45&&v<total-edgeInset*.45)raw.push(v);}
  // Put support tabs within each true straight section. Short stair/transition fragments are skipped.
  for(var i=0;i<breaks.length-1;i++){
    var a=breaks[i], b=breaks[i+1], len=b-a;
    if(len<minSectionLen){
      // Narrow bases still need occasional support in short stair/terminal areas,
      // but not a dense cluster of slots around every tiny transition. Add at most
      // one centered slot for short-but-usable fragments, and let the global merge
      // pass remove anything too close to its neighbors.
      if(narrowBase && len>=Math.max(5,tabW*2+0.8)) add((a+b)/2);
      continue;
    }
    var usableA=a+edgeInset, usableB=b-edgeInset;
    if(usableB<=usableA){ add((a+b)/2); continue; }
    var count=Math.max(1,Math.ceil(len/target));
    if(narrowBase) count=Math.max(1,Math.floor(len/target));
    if(count===1){ add((a+b)/2); }
    else { for(var j=1;j<=count;j++) add(a+(len*j)/(count+1)); }
  }
  // End anchoring tabs are useful on long terminal spans, but should not be forced into
  // tiny slope/overhang fragments on narrow bases.
  var firstLen=(breaks.length>1)?breaks[1]-breaks[0]:total;
  var lastLen=(breaks.length>1)?breaks[breaks.length-1]-breaks[breaks.length-2]:total;
  if(!narrowBase || firstLen>=minSectionLen) add(edgeInset);
  if(!narrowBase || lastLen>=minSectionLen) add(total-edgeInset);
  raw=raw.map(function(v){return +fixed(v);}).sort(function(a,b){return a-b;});
  var out=[];
  raw.forEach(function(v){
    if(!out.length || v-out[out.length-1]>=minGap) out.push(v);
    else out[out.length-1]=+fixed((out[out.length-1]+v)/2);
  });
  return out.filter(function(v){return v>0&&v<total;});
}
function lineIntersection(p1,p2,p3,p4){
  var x1=p1.x,y1=p1.y,x2=p2.x,y2=p2.y,x3=p3.x,y3=p3.y,x4=p4.x,y4=p4.y;
  var den=(x1-x2)*(y3-y4)-(y1-y2)*(x3-x4);
  if(Math.abs(den)<1e-7)return null;
  var px=((x1*y2-y1*x2)*(x3-x4)-(x1-x2)*(x3*y4-y3*x4))/den;
  var py=((x1*y2-y1*x2)*(y3-y4)-(y1-y2)*(x3*y4-y3*x4))/den;
  return {x:px,y:py};
}
function offsetJoinPoint(prev,cur,next,side,half){
  var u1=unit(prev,cur), u2=unit(cur,next), n1=norm(u1), n2=norm(u2);
  var a1={x:prev.x+n1.x*half*side,y:prev.y+n1.y*half*side};
  var a2={x:cur.x+n1.x*half*side,y:cur.y+n1.y*half*side};
  var b1={x:cur.x+n2.x*half*side,y:cur.y+n2.y*half*side};
  var b2={x:next.x+n2.x*half*side,y:next.y+n2.y*half*side};
  var hit=lineIntersection(a1,a2,b1,b2);
  if(!hit || distance(hit,cur)>half*8) return {x:cur.x+(n1.x+n2.x)*half*side/2,y:cur.y+(n1.y+n2.y)*half*side/2};
  return hit;
}
function offsetPolylinePolygon(rawPts,width,b){
  var pts=dedupe(rawPts).map(function(p){return shift(p,b);}).filter(function(_,i,a){return i===0 || distance(a[i-1],a[i])>0.001;});
  if(pts.length<2)return [];
  var half=width/2, left=[], right=[];
  for(var i=0;i<pts.length;i++){
    if(i===0){var u0=unit(pts[0],pts[1]), n0=norm(u0); left.push({x:pts[0].x+n0.x*half,y:pts[0].y+n0.y*half}); right.push({x:pts[0].x-n0.x*half,y:pts[0].y-n0.y*half});}
    else if(i===pts.length-1){var ue=unit(pts[i-1],pts[i]), ne=norm(ue); left.push({x:pts[i].x+ne.x*half,y:pts[i].y+ne.y*half}); right.push({x:pts[i].x-ne.x*half,y:pts[i].y-ne.y*half});}
    else {left.push(offsetJoinPoint(pts[i-1],pts[i],pts[i+1],1,half)); right.push(offsetJoinPoint(pts[i-1],pts[i],pts[i+1],-1,half));}
  }
  return left.concat(right.reverse());
}
function strokeBase(pts,width,b){var outline=offsetPolylinePolygon(pts,width,b); return outline.length?closedPath(outline,'cut','data-part="enclosed-base-outline"'):'';}
function cornerSlot(corner,prev,next,o,b){function arm(to){var p=shift(corner,b), u=unit(corner,to), n=norm(u), L=Math.max(o.baseW*.42,2.2), W=(o.t+o.slotClear)/2; return poly([{x:p.x-n.x*W,y:p.y-n.y*W},{x:p.x+u.x*L-n.x*W,y:p.y+u.y*L-n.y*W},{x:p.x+u.x*L+n.x*W,y:p.y+u.y*L+n.y*W},{x:p.x+n.x*W,y:p.y+n.y*W}],'scrap');} return (arm(prev)+arm(next)).replaceAll('<polygon ','<polygon data-part="base-corner-lock-slot" ');}
function stairBaseFoldLines(segs,o,b){
  var folds=[];
  for(var i=1;i<segs.length;i++){
    var prevRise=parseFloat((segmentSettings[i-1]||{}).rise)||0;
    var nextRise=parseFloat((segmentSettings[i]||{}).rise)||0;
    if(Math.abs(prevRise)>0.0001 || Math.abs(nextRise)>0.0001 || Math.abs(prevRise-nextRise)>0.0001){
      // At the boundary where a stair/rise section begins, orient the base score
      // from the stair section, not the previous flat segment. Otherwise a corner
      // immediately before a downward slope can draw the fold in the wrong direction.
      var segForFold=Math.abs(nextRise)>0.0001 ? segs[i] : segs[i-1];
      folds.push({pos:segs[i-1].cumEnd,seg:segForFold});
    }
  }
  // When a railing starts or ends with a sloped stair section, add a base score just inboard
  // of the end so the base has a clear fold reference without putting the score on the cut edge.
  var inset=Math.max(o.t*2,0.8);
  if(segs.length && isStairSection(segmentSettings[0]) && segs[0].len>inset*2) folds.push({pos:inset,seg:segs[0]});
  if(segs.length && isStairSection(segmentSettings[segs.length-1]) && segs[segs.length-1].len>inset*2) folds.push({pos:segs[segs.length-1].cumEnd-inset,seg:segs[segs.length-1]});
  var seen={};
  return folds.filter(function(f){var k=fixed(f.pos)+'@'+f.seg.index; if(seen[k])return false; seen[k]=true; return true;})
    .map(function(f){return crossAtOnSegment(f.seg,f.pos,o,b,'engrave',o.baseW).replace('<line ','<line data-part="base-stair-fold-score" ');}).join('');
}
function buildPathPreview(){var o=options(), pts=sourcePoints(o), segs=segments(pts); preserveSettings(segs.length); var b=bounds(pts,o.baseW/2+o.margin+4), w=Math.max(50,b.maxX-b.minX), h=Math.max(28,b.maxY-b.minY); var tpts=pts.map(function(p){return shift(p,b);}); var body=pathTag(tpts,'basePreview','stroke-width="'+fixed(o.baseW)+'"')+pathTag(tpts,'path',''); segs.forEach(function(s,i){var a=shift(s.start,b), c=shift(s.end,b), mid=shift({x:(s.start.x+s.end.x)/2,y:(s.start.y+s.end.y)/2},b); if(isStairSection(segmentSettings[i]))body+=line(a.x,a.y,c.x,c.y,'stair'); body+='<text class="txt" x="'+fixed(mid.x+1.5)+'" y="'+fixed(mid.y-1.5)+'">'+(i+1)+': '+s.len.toFixed(1)+'mm</text>';}); for(var i=1;i<pts.length-1;i++){var p=shift(pts[i],b); body+=line(p.x-2,p.y,p.x+2,p.y,'engrave')+line(p.x,p.y-2,p.x,p.y+2,'engrave');} return svgWrap(w,h,body);}
function buildFlat(){var o=options(), pts=sourcePoints(o), segs=segments(pts); if(!segs.length){pts=[{x:0,y:0},{x:o.length,y:0}]; segs=segments(pts);} preserveSettings(segs.length); var total=segs[segs.length-1].cumEnd; el('lengthMm').value=fixed(total); if(pathPoints)el('bendPointsMm').value=segs.slice(0,-1).map(function(s){return fixed(s.cumEnd);}).join(', '); var bends=segs.slice(0,-1).map(function(s){return s.cumEnd;}), trueBends=trueCornerBendPositions(pts,segs); var h=o.height, t=o.railT, matT=o.t, filled=h/3, maxRise=0; segmentSettings.forEach(function(st){if(isStairSection(st))maxRise=Math.max(maxRise,Math.abs(+st.rise||0));}); var flatEndExtension=Math.max(3,Math.min(8,h*.75)); var startExt=isStairSection(segmentSettings[0])?flatEndExtension:0, endExt=isStairSection(segmentSettings[segs.length-1])?flatEndExtension:0; var x0=o.margin+4+startExt, baseY=o.margin+maxRise+h+4;
  // Build a flat-pattern coordinate map. The pasted path length is the plan/run length,
  // but any stair rise/drop must unfold to its true sloped length in the flat railing strip.
  // This prevents short steep rise sections from collapsing into blank wedges.
  var sectionMaps=[], basePts=[{x:x0,y:baseY}], cumRise=0, cumFlat=0;
  for(var i=0;i<segs.length;i++){
    var st=segmentSettings[i]||{}, rise=parseFloat(st.rise)||0, stair=Math.abs(rise)>0.0001;
    var lead=stair?Math.max(0,Math.min(segs[i].len,parseFloat(st.flatStart)||0)):0;
    var run=Math.max(0,segs[i].len-lead);
    var slopeLen=stair?Math.sqrt(run*run+rise*rise):segs[i].len;
    var m={index:i,planStart:segs[i].cumStart,planEnd:segs[i].cumEnd,flatStart:cumFlat,flatLead:lead,slopeStartPlan:segs[i].cumStart+lead,slopeStartFlat:cumFlat+lead,flatEnd:cumFlat+lead+slopeLen,riseStart:cumRise,rise:rise,run:run,slopeLen:slopeLen,stair:stair};
    sectionMaps.push(m);
    if(stair && lead>0.0001)basePts.push({x:x0+m.slopeStartFlat,y:baseY-cumRise});
    if(stair)cumRise+=rise;
    basePts.push({x:x0+m.flatEnd,y:baseY-cumRise});
    cumFlat=m.flatEnd;
  }
  var flatTotal=cumFlat;
  function mapPlanToFlat(pos){
    var m=sectionMaps[sectionMaps.length-1];
    for(var mi=0;mi<sectionMaps.length;mi++){if(pos>=sectionMaps[mi].planStart-0.001 && pos<=sectionMaps[mi].planEnd+0.001){m=sectionMaps[mi];break;}}
    if(!m.stair)return m.flatStart+(pos-m.planStart);
    if(pos<=m.slopeStartPlan+0.001)return m.flatStart+(pos-m.planStart);
    var f=m.run>0?Math.max(0,Math.min(1,(pos-m.slopeStartPlan)/m.run)):1;
    return m.slopeStartFlat+f*m.slopeLen;
  }
  function yAt(x){
    if(x<=basePts[0].x)return basePts[0].y;
    for(var bi=0;bi<basePts.length-1;bi++){
      var a=basePts[bi], b=basePts[bi+1];
      if(x>=a.x-0.001 && x<=b.x+0.001){
        var f=(x-a.x)/((b.x-a.x)||1);
        return a.y+(b.y-a.y)*f;
      }
    }
    return basePts[basePts.length-1].y;
  }
  function yAtRailX(x){if(x<x0)return basePts[0].y; if(x>x0+flatTotal)return basePts[basePts.length-1].y; return yAt(x);}
  var openingRegistry=[];
  function canAddOpening(xa,xb,upperOffset,lowerOffset){
    var minOpening=Math.max(1.6,t*3);
    if(xb<=xa+minOpening)return false;
    var a=Math.min(xa,xb), b=Math.max(xa,xb), len=b-a;
    var key=fixed(upperOffset)+'/'+fixed(lowerOffset);
    for(var ri=0;ri<openingRegistry.length;ri++){
      var r=openingRegistry[ri];
      if(r.key!==key)continue;
      var overlap=Math.min(b,r.b)-Math.max(a,r.a);
      if(overlap>0.05 && overlap>Math.min(len,r.b-r.a)*0.35){
        return false;
      }
    }
    openingRegistry.push({a:a,b:b,key:key});
    return true;
  }
  function openingPathWithPart(xa,xb,upperOffset,lowerOffset,partName){
    if(!canAddOpening(xa,xb,upperOffset,lowerOffset))return '';
    var xs=[xa,xb];
    basePts.forEach(function(bp){ if(bp.x>xa+0.001 && bp.x<xb-0.001)xs.push(bp.x); });
    xs=Array.from(new Set(xs.map(function(v){return +fixed(v);}))).sort(function(a,b){return a-b;});
    var top=xs.map(function(x){return {x:x,y:yAtRailX(x)-upperOffset};});
    var bot=xs.slice().reverse().map(function(x){return {x:x,y:yAtRailX(x)-lowerOffset};});
    return closedPath(top.concat(bot),'scrap','data-part="'+partName+'"');
  }
  function openingPathFlatBaseline(xa,xb,yBase,upperOffset,lowerOffset,partName){
    if(!canAddOpening(xa,xb,upperOffset,lowerOffset))return '';
    return closedPath([{x:xa,y:yBase-upperOffset},{x:xb,y:yBase-upperOffset},{x:xb,y:yBase-lowerOffset},{x:xa,y:yBase-lowerOffset}],'scrap','data-part="'+partName+'"');
  }
  function openingPath(xa,xb,upperOffset,lowerOffset){
    return openingPathWithPart(xa,xb,upperOffset,lowerOffset,'railing-open-cutout');
  }
  function railingOuter(tabs,tabW){
    var ptsOut=[], leftX=x0-startExt-t/2, rightX=x0+flatTotal+endExt+t/2;
    ptsOut.push({x:leftX,y:yAtRailX(leftX)-h});
    for(var i=0;i<basePts.length;i++)ptsOut.push({x:basePts[i].x,y:basePts[i].y-h});
    ptsOut.push({x:rightX,y:yAtRailX(rightX)-h});
    ptsOut.push({x:rightX,y:yAtRailX(rightX)});
    var breakXs=basePts.map(function(bp){return bp.x;}).filter(function(x){return x>leftX+0.001 && x<rightX-0.001;}).sort(function(a,b){return b-a;});
    var tabStops=[];
    tabs.forEach(function(tp){
      var fx=mapPlanToFlat(tp), lx=x0+Math.max(0,fx-tabW/2), rx=x0+Math.min(flatTotal,fx+tabW/2);
      if(rx>leftX && lx<rightX && rx-lx>0.05)tabStops.push({lx:lx,rx:rx});
    });
    tabStops.sort(function(a,b){return b.rx-a.rx;});
    var bi=0;
    function addBreaksUntil(limitX){
      while(bi<breakXs.length && breakXs[bi]>limitX+0.001){ ptsOut.push({x:breakXs[bi],y:yAtRailX(breakXs[bi])}); bi++; }
    }
    tabStops.forEach(function(ts){
      addBreaksUntil(ts.rx);
      ptsOut.push({x:ts.rx,y:yAtRailX(ts.rx)});
      ptsOut.push({x:ts.rx,y:yAtRailX(ts.rx)+o.tabDepth});
      ptsOut.push({x:ts.lx,y:yAtRailX(ts.lx)+o.tabDepth});
      ptsOut.push({x:ts.lx,y:yAtRailX(ts.lx)});
      addBreaksUntil(ts.lx);
    });
    addBreaksUntil(leftX);
    ptsOut.push({x:leftX,y:yAtRailX(leftX)});
    return closedPath(ptsOut,'cut','data-part="single-enclosed-railing-outline"');
  }
  var body='', narrow=false, baseBox=bounds(pts,o.baseW/2+o.margin+4), baseWidth=baseBox.maxX-baseBox.minX, baseHeight=baseBox.maxY-baseBox.minY, railBottom=Math.max.apply(null,basePts.map(function(p){return p.y;}))+o.tabDepth, baseYOffset=narrow?0:railBottom+10, shifted={minX:baseBox.minX,minY:baseBox.minY-baseYOffset,maxX:baseBox.maxX,maxY:baseBox.maxY-baseYOffset};
  if(narrow){body+=strokeBase(pts,o.baseW,shifted); body+=stairBaseFoldLines(segs,o,shifted); body+=pathTag(pts.map(function(p){return shift(p,shifted); }),'engrave',''); var baysN=Math.max(1,Math.ceil(total/Math.min(10,o.maxPole))); for(var ni=0;ni<=baysN;ni++)body+=crossAt(segs,total*ni/baysN,o,shifted,'engrave',o.baseW); trueBends.forEach(function(bn){body+=crossAt(segs,bn,o,shifted,'engrave',o.baseW);});}
  else {
    var poles=[];
    function spanPoles(a,b){
      var len=b-a, out=[];
      if(len<=0.001)return out;
      var target=Math.min(10,o.maxPole);
      var bays=Math.max(1,Math.ceil(len/target));
      for(var pi=0;pi<=bays;pi++)out.push(a + len*pi/bays);
      return out;
    }
    // Pattern the main railing in true-bend-to-true-bend spans. This prevents
    // a regular pole layout from landing just beside a double-width corner pole and
    // creating a tiny residual bay. Each span averages the spacing across its own
    // available length while respecting the max pole spacing.
    var trueBendFlat=Array.from(new Set(trueBends.map(function(b){return +fixed(mapPlanToFlat(b));}))).filter(function(v){return v>0&&v<flatTotal;}).sort(function(a,b){return a-b;});
    var railBreaks=[0].concat(trueBendFlat).concat([flatTotal]);
    for(var rb=0;rb<railBreaks.length-1;rb++){
      var aSpan=railBreaks[rb], bSpan=railBreaks[rb+1];
      var startClear=(rb>0)?t/2:0;
      var endClear=(rb<railBreaks.length-2)?t/2:0;
      var aa=aSpan+startClear, bb=bSpan-endClear;
      if(bb>aa+Math.max(1.6,t*3)) poles=poles.concat(spanPoles(aa,bb));
    }
    trueBendFlat.forEach(function(fb){poles.push(Math.max(0,fb-t/2)); poles.push(Math.min(flatTotal,fb+t/2));});
    poles=Array.from(new Set(poles.map(fixed))).map(Number).filter(function(v){return v>=0&&v<=flatTotal;}).sort(function(a,b){return a-b;});
    var tabs=tabPositions(total,trueBends,o), tabW=Math.max(2.4,matT*5);
    // Use one matched tab model: normal tabs are matched by normal base slots;
    // corner tabs are only added when the matching right-angle corner-lock slot
    // is actually emitted below. This prevents extra railing tabs without receivers.
    function matchedCornerTabPositions(){
      var out=[];
      for(var ci=1;ci<pts.length-1;ci++){
        if(isTrueCorner(pts[ci-1],pts[ci],pts[ci+1])){
          var prevLen=distance(pts[ci-1],pts[ci]), nextLen=distance(pts[ci],pts[ci+1]);
          var skipTightNarrowCorner=(o.baseW<5 && (prevLen<12 || nextLen<12));
          if(!skipTightNarrowCorner && segs[ci-1]) out.push(segs[ci-1].cumEnd);
        }
      }
      return out;
    }
    var cornerTabs=matchedCornerTabPositions();
    var outlineTabs=Array.from(new Set(tabs.concat(cornerTabs).map(fixed))).map(Number).sort(function(a,b){return a-b;});
    body+=railingOuter(outlineTabs,tabW);
    var topOpenUpper=h-t, topOpenLower=h*.58+t/2, lowerOpenUpper=h*.58-t/2, lowerOpenLower=filled;
    function drawPatternedSpan(poleList){
      poleList=Array.from(new Set(poleList.map(fixed))).map(Number).sort(function(a,b){return a-b;});
      for(var oi=0;oi<poleList.length-1;oi++){
        var left=x0+poleList[oi]+t/2, right=x0+poleList[oi+1]-t/2;
        body+=openingPath(left,right,topOpenUpper,topOpenLower);
        body+=openingPath(left,right,lowerOpenUpper,lowerOpenLower);
      }
      poleList.forEach(function(p){var y=yAtRailX(x0+p), xc=x0+p; body+=line(xc-t/2,y-filled,xc-t/2,y,'engrave'); body+=line(xc+t/2,y-filled,xc+t/2,y,'engrave');});
    }
    function drawFlatOverhangSpan(poleList,yBase,label){
      // Overhangs are flat handrail extensions, even when they attach to a sloped stair.
      // Draw their bay openings directly with a fixed baseline so a short/steep final
      // stair section cannot cause the overhang span to be skipped or treated as blank.
      poleList=Array.from(new Set(poleList.map(fixed))).map(Number).sort(function(a,b){return a-b;});
      for(var oi=0;oi<poleList.length-1;oi++){
        var left=x0+poleList[oi]+t/2, right=x0+poleList[oi+1]-t/2;
        if(right<=left+0.05)continue;
        body+=openingPathFlatBaseline(left,right,yBase,topOpenUpper,topOpenLower,label+'-top-open-cutout');
        body+=openingPathFlatBaseline(left,right,yBase,lowerOpenUpper,lowerOpenLower,label+'-lower-open-cutout');
      }
      poleList.forEach(function(p){var xc=x0+p; body+=line(xc-t/2,yBase-filled,xc-t/2,yBase,'engrave'); body+=line(xc+t/2,yBase-filled,xc+t/2,yBase,'engrave');});
    }
    function drawForcedStairSlopeSpans(){
      sectionMaps.forEach(function(m){
        if(!m.stair || m.slopeLen<=0.05)return;
        var slopePoles=spanPoles(m.slopeStartFlat,m.flatEnd);
        // Very short stair spans still need at least one visible bay, so force endpoints.
        if(slopePoles.length<2)slopePoles=[m.slopeStartFlat,m.flatEnd];
        slopePoles=Array.from(new Set(slopePoles.concat([m.slopeStartFlat,m.flatEnd]).map(fixed))).map(Number).sort(function(a,b){return a-b;});
        for(var si=0;si<slopePoles.length-1;si++){
          var left=x0+slopePoles[si]+t/2, right=x0+slopePoles[si+1]-t/2;
          if(right<=left+0.05)continue;
          body+=openingPathWithPart(left,right,topOpenUpper,topOpenLower,'stair-slope-top-open-cutout');
          body+=openingPathWithPart(left,right,lowerOpenUpper,lowerOpenLower,'stair-slope-lower-open-cutout');
        }
        // Do not add pole engraves here. The global pole pass already engraves
        // the pole edges; adding them again around forced slope openings creates
        // dense duplicate blue lines near transitions.
      });
    }
    function drawForcedStairLeadSpans(){
      // A stair section can have a short flat lead-in before the rise/drop starts.
      // The normal bay list can skip that tiny span because it is only a geometry
      // breakpoint, not a true corner. Force it to get the same two railing openings.
      sectionMaps.forEach(function(m){
        if(!m.stair || m.flatLead<=0.05)return;
        var leadPoles=spanPoles(m.flatStart,m.slopeStartFlat);
        if(leadPoles.length<2)leadPoles=[m.flatStart,m.slopeStartFlat];
        leadPoles=Array.from(new Set(leadPoles.concat([m.flatStart,m.slopeStartFlat]).map(fixed))).map(Number).sort(function(a,b){return a-b;});
        for(var li=0;li<leadPoles.length-1;li++){
          var left=x0+leadPoles[li]+t/2, right=x0+leadPoles[li+1]-t/2;
          if(right<=left+0.05)continue;
          body+=openingPathWithPart(left,right,topOpenUpper,topOpenLower,'stair-lead-top-open-cutout');
          body+=openingPathWithPart(left,right,lowerOpenUpper,lowerOpenLower,'stair-lead-lower-open-cutout');
        }
        // Lead-in openings reuse the global pole engraves to avoid duplicate
        // blue lines in the short flat area before a slope.
      });
    }
    function drawForcedShortFlatSectionSpans(){
      // Safety pass: every non-stair section from the interpreted path must have
      // railing openings. The global true-bend span pass can miss the final span
      // of an L-shaped open polyline when corner clearances and de-duplication
      // consume the first bay. Re-walk each flat section here; the opening
      // registry prevents duplicate holes, so this only fills missing blank areas.
      sectionMaps.forEach(function(m){
        if(m.stair)return;
        var len=m.flatEnd-m.flatStart;
        if(len<=0.05)return;
        var flatPoles=spanPoles(m.flatStart,m.flatEnd);
        if(flatPoles.length<2)flatPoles=[m.flatStart,m.flatEnd];
        flatPoles=Array.from(new Set(flatPoles.concat([m.flatStart,m.flatEnd]).map(fixed))).map(Number).sort(function(a,b){return a-b;});
        for(var fi=0;fi<flatPoles.length-1;fi++){
          var left=x0+flatPoles[fi]+t/2, right=x0+flatPoles[fi+1]-t/2;
          if(right<=left+0.05)continue;
          body+=openingPathWithPart(left,right,topOpenUpper,topOpenLower,'flat-section-top-open-cutout');
          body+=openingPathWithPart(left,right,lowerOpenUpper,lowerOpenLower,'flat-section-lower-open-cutout');
        }
        // Forced flat-section openings do not add extra engrave pairs; the normal
        // pole pass is still the only source of pole-edge engraves.
      });
    }
    if(startExt>0)drawFlatOverhangSpan(spanPoles(-startExt,0),basePts[0].y,'start-overhang');
    drawPatternedSpan(poles);
    drawForcedShortFlatSectionSpans();
    drawForcedStairLeadSpans();
    drawForcedStairSlopeSpans();
    if(endExt>0)drawFlatOverhangSpan(spanPoles(flatTotal,flatTotal+endExt),basePts[basePts.length-1].y,'end-overhang');
    trueBends.forEach(function(b){var fb=mapPlanToFlat(b), yb=yAt(x0+fb); body+=line(x0+fb,yb-h,x0+fb,yb+o.tabDepth,'engrave');});
    body+=strokeBase(pts,o.baseW,shifted);
    body+=stairBaseFoldLines(segs,o,shifted);
    tabs.forEach(function(p){body+=slotAt(segs,p,o,shifted);});
    for(var ci=1;ci<pts.length-1;ci++){
      if(isTrueCorner(pts[ci-1],pts[ci],pts[ci+1])){
        var prevLen=distance(pts[ci-1],pts[ci]), nextLen=distance(pts[ci],pts[ci+1]);
        var skipTightNarrowCorner=(o.baseW<5 && (prevLen<12 || nextLen<12));
        if(!skipTightNarrowCorner) body+=cornerSlot(pts[ci],pts[ci-1],pts[ci+1],o,shifted);
      }
    }
    if(o.mode==='outline'){body+=closedPath([{x:x0-startExt,y:Math.min.apply(null,basePts.map(function(p){return p.y;}))-h},{x:x0+flatTotal+endExt,y:Math.min.apply(null,basePts.map(function(p){return p.y;}))-h},{x:x0+flatTotal+endExt,y:railBottom},{x:x0-startExt,y:railBottom}],'engrave','data-part="helper-outline"');}
  }
  var metaObj=currentSettingsObject(); metaObj.pathLengthMm=fixed(total); metaObj.startFlatHandrailExtensionMm=startExt; metaObj.endFlatHandrailExtensionMm=endExt; metaObj.narrowSolidEtchMode=narrow; metaObj.bendPointsMm=trueBends; metaObj.sectionBreaksMm=bends; metaObj.stairSections=segmentSettings; metaObj.cornerTabPositionsMm=cornerTabs; metaObj.normalTabPositionsMm=tabs; metaObj.allRailingTabPositionsMm=outlineTabs; var meta='<metadata>'+esc(JSON.stringify(metaObj,null,2))+'</metadata>'; var width=Math.max(flatTotal+startExt+endExt+o.margin*2+10,baseWidth+o.margin*2+10,80), height=narrow?baseHeight+o.margin*2+8:Math.max(railBottom+o.margin+4,baseYOffset+baseHeight+o.margin+4); return {svg:svgWrap(width,height,meta+body),segs:segs,total:total,flatTotal:flatTotal,bends:trueBends,sectionBreaks:bends,narrow:narrow,filled:filled,startExt:startExt,endExt:endExt};}
function regenerate(updateEditor){if(updateEditor)updateSegmentEditor(); var flat=buildFlat(); el('pathMount').innerHTML=buildPathPreview(); el('svgMount').innerHTML=flat.svg; var o=options(); var stairs=[]; flat.segs.forEach(function(s,i){var st=segmentSettings[i]; if(isStairSection(st))stairs.push('Section '+(i+1)+': rise '+(+st.rise||0).toFixed(2)+' mm over '+s.len.toFixed(2)+' mm = '+(Math.atan2(+st.rise||0,Math.max(0.001,s.len-(parseFloat(st.flatStart)||0)))*180/Math.PI).toFixed(1)+'°');}); el('stats').textContent=['Preview status: rendered '+el('pathMount').querySelectorAll('svg').length+' path SVG and '+el('svgMount').querySelectorAll('svg').length+' flat SVG','Mode: separate railing strip plus slotted base','Path length: '+flat.total.toFixed(2)+' mm',
    'Pasted SVG unit scale applied: '+o.svgScale+' mm/unit'+(pathPointsRawSvgUnits?' (raw SVG coordinates are being scaled live)':''),'Railing height: '+o.height+' mm','Bottom filled panel: '+flat.filled.toFixed(2)+' mm','Material thickness: '+o.t+' mm','Rail / pole visual thickness: '+o.railT+' mm','Tab depth: '+o.tabDepth+' mm'+(o.rawTabDepth>o.t?' (capped from '+o.rawTabDepth+' mm)':''),'Base width: '+o.baseW+' mm','Pole rule: target about 10 mm, never more than '+o.maxPole+' mm','Bend points: '+(flat.bends.length?flat.bends.map(function(v){return v.toFixed(2);}).join(', ')+' mm':'none'),'Illustrator import cleanup: thin closed/stroked outlines are collapsed to centerlines; open L-shaped polylines are preserved','Opening check: straight cutouts '+((flat.svg.match(/data-part=\"railing-open-cutout\"/g)||[]).length)+', flat section cutouts '+(((flat.svg.match(/data-part=\"short-flat-/g)||[]).length)+((flat.svg.match(/data-part=\"flat-section-/g)||[]).length))+', stair lead cutouts '+((flat.svg.match(/data-part=\"stair-lead-/g)||[]).length)+', slope cutouts '+((flat.svg.match(/data-part=\"stair-slope-/g)||[]).length)+', overhang cutouts '+((flat.svg.match(/data-part=\"(?:start|end)-overhang-/g)||[]).length),'Stair sections: '+stairs.length,'Flat handrail end extensions: start '+flat.startExt.toFixed(2)+' mm, end '+flat.endExt.toFixed(2)+' mm','Base stair fold scores: '+(stairs.length?'added at slope transitions':'none')].concat(stairs.length?stairs:['No stair sections; all rise values are 0.']).join('\n'); return flat.svg;}
function currentSettingsObject(){
  var o=options();
  return {
    generator:'SVG Safety Railing Generator',
    settingsVersion:3,
    lengthMm:o.length,
    heightMm:o.height,
    materialThicknessMm:o.t,
    railPoleThicknessMm:o.railT,
    maxPoleSpanMm:o.maxPole,
    pastedSvgUnitScaleMm:o.svgScale,
    manualBendPointsText:el('bendPointsMm').value,
    baseWidthMm:o.baseW,
    tabDepthMm:o.rawTabDepth,
    slotClearanceMm:o.slotClear,
    maxTabSpanMm:o.maxTab,
    edgeMarginMm:o.margin,
    outputMode:o.mode,
    pastedSvgLine:el('pastedSvgLine').value,
    sourcePathPointsMm:(pathPoints&&pathPoints.length>1)?sourcePoints(o).map(function(p){return {x:fixed(p.x),y:fixed(p.y)};}):null,
    sourcePathPointsRawSvgUnits:(pathPoints&&pathPoints.length>1&&pathPointsRawSvgUnits)?pathPoints.map(function(p){return {x:fixed(p.x),y:fixed(p.y)};}):null,
    sectionSettings:segmentSettings.map(function(st){return {rise:parseFloat(st.rise)||0,flatStart:parseFloat(st.flatStart)||0};})
  };
}
function extractSettingsObject(text){
  return HakoMachiUtils.extractJsonOrSvgMetadata(text);
}
function setIfPresent(id,value){if(value!==undefined && value!==null && el(id))el(id).value=value;}
function applySettingsObject(obj){
  if(!obj || typeof obj!=='object')throw new Error('No settings object found.');
  setIfPresent('heightMm',obj.heightMm);
  setIfPresent('thicknessMm',obj.materialThicknessMm||obj.thicknessMm);
  setIfPresent('railPoleThicknessMm',obj.railPoleThicknessMm||obj.railingThicknessMm||obj.poleThicknessMm||obj.materialThicknessMm||obj.thicknessMm);
  setIfPresent('maxPoleSpanMm',obj.maxPoleSpanMm);
  if(obj.pastedSvgUnitScaleMm!==undefined)setIfPresent('svgUnitScaleMm',obj.pastedSvgUnitScaleMm);
  setIfPresent('baseWidthMm',obj.baseWidthMm);
  setIfPresent('tabDepthMm',obj.tabDepthMm);
  setIfPresent('slotClearanceMm',obj.slotClearanceMm);
  setIfPresent('maxTabSpanMm',obj.maxTabSpanMm);
  setIfPresent('edgeMarginMm',obj.edgeMarginMm);
  if(obj.outputMode!==undefined)setIfPresent('mode',obj.outputMode);
  var rawPts=obj.sourcePathPointsRawSvgUnits;
  var pts=obj.sourcePathPointsMm||obj.pathPointsMm||obj.sourcePointsMm;
  if(Array.isArray(rawPts) && rawPts.length>1){
    pathPoints=cleanupIllustratorStrokeOutline(rawPts.map(function(p){return {x:+p.x||0,y:+p.y||0};}),'polyline');
    pathPointsRawSvgUnits=true;
    el('pastedSvgLine').value=obj.pastedSvgLine||('<polyline points="'+pathPoints.map(function(p){return fixed(p.x)+','+fixed(p.y);}).join(' ')+'" />');
  } else if(obj.pastedSvgLine){
    el('pastedSvgLine').value=obj.pastedSvgLine;
    pathPoints=parseSvgLine(obj.pastedSvgLine);
    pathPointsRawSvgUnits=true;
  } else if(Array.isArray(pts) && pts.length>1){
    pathPoints=pts.map(function(p){return {x:+p.x||0,y:+p.y||0};});
    pathPointsRawSvgUnits=false;
    el('pastedSvgLine').value='<polyline points="'+pathPoints.map(function(p){return fixed(p.x)+','+fixed(p.y);}).join(' ')+'" />';
  } else {
    pathPoints=null; pathPointsRawSvgUnits=false;
    if(obj.pathLengthMm!==undefined)setIfPresent('lengthMm',obj.pathLengthMm);
    else setIfPresent('lengthMm',obj.lengthMm);
    if(Array.isArray(obj.sectionBreaksMm))setIfPresent('bendPointsMm',obj.sectionBreaksMm.join(', '));
    else if(Array.isArray(obj.bendPointsMm))setIfPresent('bendPointsMm',obj.bendPointsMm.join(', '));
    else if(obj.manualBendPointsText!==undefined)setIfPresent('bendPointsMm',obj.manualBendPointsText);
  }
  var importedSettings=obj.sectionSettings||obj.stairSections;
  segmentSettings=[];
  if(Array.isArray(importedSettings)){
    segmentSettings=importedSettings.map(function(st){return {rise:parseFloat(st.rise)||0,flatStart:parseFloat(st.flatStart)||0};});
  }
  updateSegmentEditor();
  safeRegenerate(false);
}
function importSettings(){
  try{
    var obj=extractSettingsObject(el('settingsPaste').value);
    applySettingsObject(obj);
    el('stats').textContent='Imported settings. '+el('stats').textContent;
  }catch(err){
    el('stats').textContent='Settings import failed: '+err.message+'\nPaste either the settings JSON or a previously exported SVG with <metadata>.';
  }
}
function copySettings(){
  var text=JSON.stringify(currentSettingsObject(),null,2);
  el('settingsPaste').value=text;
  HakoMachiUtils.copyText(text,{button:el('copySettingsBtn'),successText:'Settings copied',resetText:'Copy current settings',fallbackText:'Settings in box'});
}
function download(){var svg=regenerate(false); HakoMachiUtils.downloadText('<?xml version="1.0" encoding="UTF-8"?>\n'+svg,'safety_railing_flat_cutout_'+el('lengthMm').value+'mm.svg','image/svg+xml');}
function copySvg(){var text='<?xml version="1.0" encoding="UTF-8"?>\n'+regenerate(false); HakoMachiUtils.copyText(text,{button:el('copyBtn'),successText:'Copied',resetText:'Copy flat SVG'}).then(function(ok){if(!ok)alert('Copy failed; use download instead.');});}
function safeRegenerate(updateEditor){try{regenerate(updateEditor);}catch(err){el('stats').textContent='Render error: '+err.message; console.error(err);}}
function applyPastedLineFromText(showAlert){
  var text=el('pastedSvgLine').value.trim();
  if(!text){pathPoints=null; pathPointsRawSvgUnits=false; segmentSettings=[]; updateSegmentEditor(); safeRegenerate(false); return true;}
  var pts=parseSvgLine(text);
  if(!pts||pts.length<2){
    if(showAlert)alert('Could not read a usable SVG line/polyline/path.');
    el('stats').textContent='Waiting for a valid pasted SVG line/path...';
    return false;
  }
  var changed=!pathPoints || pts.length!==pathPoints.length || pts.some(function(p,i){return Math.abs(p.x-pathPoints[i].x)>0.0001 || Math.abs(p.y-pathPoints[i].y)>0.0001;});
  pathPoints=pts;
  pathPointsRawSvgUnits=true;
  if(changed)segmentSettings=[];
  updateSegmentEditor();
  safeRegenerate(false);
  return true;
}
function debounce(fn,ms){var timer=null; return function(){clearTimeout(timer); timer=setTimeout(fn,ms);};}
var autoApplyPasted=debounce(function(){applyPastedLineFromText(false);},500);
el('usePastedLineBtn').addEventListener('click',function(){applyPastedLineFromText(true);});
el('sampleLineBtn').addEventListener('click',function(){el('pastedSvgLine').value='<polyline points="0,0 35,0 35,25 80,25 105,40" />'; applyPastedLineFromText(false);});
el('clearPathBtn').addEventListener('click',function(){el('pastedSvgLine').value=''; pathPoints=null; pathPointsRawSvgUnits=false; segmentSettings=[]; updateSegmentEditor(); safeRegenerate(false);});
el('downloadBtn').addEventListener('click',download); el('copyBtn').addEventListener('click',copySvg); el('importSettingsBtn').addEventListener('click',importSettings); el('copySettingsBtn').addEventListener('click',copySettings);
el('unitPreset').addEventListener('change',function(){el('svgUnitScaleMm').value=this.value; if(pathPointsRawSvgUnits)safeRegenerate(true); else if(el('pastedSvgLine').value.trim())applyPastedLineFromText(false); else safeRegenerate(true);});
document.querySelectorAll('input,textarea,select').forEach(function(input){
  if(input.id==='pastedSvgLine'){ input.addEventListener('paste',handlePastedSvgFieldPaste); input.addEventListener('input',autoApplyPasted); }
  else if(input.id==='svgUnitScaleMm') input.addEventListener('input',function(){if(pathPointsRawSvgUnits)safeRegenerate(true); else if(el('pastedSvgLine').value.trim())applyPastedLineFromText(false); else safeRegenerate(true);});
  else input.addEventListener('input',function(){safeRegenerate(true);});
});
try{updateSegmentEditor(); regenerate(false);}catch(err){el('stats').textContent='Render error: '+err.message; console.error(err);}
});
